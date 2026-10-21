"""Run the engine in headless Chromium against real files and verify outputs with Pillow.

Usage: python3 -I run_tests.py <site_root> <out_dir>
"""
import sys, os, io, json, base64, math, threading, functools, http.server, time
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FIX = os.path.join(ROOT, "test", "fixtures")

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


handler = functools.partial(Quiet, directory=ROOT)
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORT}"


def psnr(a, b):
    a = np.asarray(a.convert("RGB"), dtype=np.float64)
    b = np.asarray(b.convert("RGB"), dtype=np.float64)
    mse = ((a - b) ** 2).mean()
    return 99.0 if mse == 0 else 10 * math.log10(255 * 255 / mse)


# (label, fixture, options, expectations)
# expectations: status, code (for errors), maxB, minB, dims, format, minQ, check (callable(img, res, outbytes) -> str|None)
def aspect_portrait(img, res, data):
    return None if img.size[0] < img.size[1] else f"expected portrait, got {img.size}"


def centre_white(img, res, data):
    px = img.convert("RGB").getpixel((img.size[0] // 2, img.size[1] // 2))
    return None if min(px) > 235 else f"centre pixel not white: {px}"


def centre_transparent(img, res, data):
    if img.mode != "RGBA":
        return f"expected RGBA, got {img.mode}"
    a = img.getpixel((img.size[0] // 2, img.size[1] // 2))[3]
    return None if a == 0 else f"centre alpha {a}"


def exact_bytes(n):
    return lambda img, res, data: None if len(data) == n else f"expected exactly {n} bytes, got {len(data)}"


def same_as_source(name):
    def f(img, res, data):
        src = open(os.path.join(FIX, name), "rb").read()
        return None if src == data else "output differs from source"
    return f


def jpeg_has_com(img, res, data):
    p = 2
    while p + 4 <= len(data) and data[p] == 0xFF:
        m = data[p + 1]
        if m == 0xFE:
            return None
        if m == 0xDA:
            break
        p += 2 + ((data[p + 2] << 8) | data[p + 3])
    return "no COM segment in the header area"


CASES = [
    ("12MP -> max 100KB", "photo_12mp.jpg", dict(maxKB=100), dict(status="ok", maxB=100_000, minQ=0.5)),
    ("12MP -> max 50KB", "photo_12mp.jpg", dict(maxKB=50), dict(status="ok", maxB=50_000)),
    ("12MP -> max 20KB (signature size)", "photo_12mp.jpg", dict(maxKB=20), dict(status="ok", maxB=20_000)),
    ("12MP -> max 200KB", "photo_12mp.jpg", dict(maxKB=200), dict(status="ok", maxB=200_000)),
    ("12MP -> max 1MB", "photo_12mp.jpg", dict(maxKB=1000), dict(status="ok", maxB=1_000_000)),
    ("12MP -> range 20-50KB", "photo_12mp.jpg", dict(minKB=20, maxKB=50), dict(maxB=50_000, minB=20_480)),
    ("12MP -> tight range 90-100KB", "photo_12mp.jpg", dict(minKB=90, maxKB=100), dict(maxB=100_000, minB=92_160)),
    ("smooth -> min 200 max 300KB (pad JPEG)", "smooth_2k.jpg", dict(minKB=200, maxKB=300), dict(status="padded", maxB=300_000, minB=204_800, check=jpeg_has_com)),
    ("png signature -> min 30 max 60KB (pad PNG)", "signature.png", dict(format="png", minKB=30, maxKB=60), dict(status="padded", maxB=60_000, minB=30_720, format="PNG")),
    ("tiny 40px -> min 10 max 20KB", "tiny_40.jpg", dict(minKB=10, maxKB=20), dict(status="padded", maxB=20_000, minB=10_240)),
    ("cover 413x531, 20-50KB", "photo_12mp.jpg", dict(width=413, height=531, fit="cover", minKB=20, maxKB=50), dict(dims=(413, 531), maxB=50_000, minB=20_480)),
    ("contain 600x600, max 60KB", "photo_12mp.jpg", dict(width=600, height=600, fit="contain", maxKB=60), dict(dims=(600, 600), maxB=60_000)),
    ("stretch 300x300, no KB", "photo_2mp.jpg", dict(width=300, height=300, fit="stretch"), dict(dims=(300, 300))),
    ("width only 800 keeps aspect", "photo_2mp.jpg", dict(width=800), dict(dims=(800, 600))),
    ("upscale 40px -> 400x400", "tiny_40.jpg", dict(width=400, height=400, fit="stretch"), dict(dims=(400, 400))),
    ("EXIF rotation respected", "exif_rot6.jpg", dict(maxKB=100), dict(maxB=100_000, check=aspect_portrait)),
    ("alpha PNG -> JPEG gets white background", "alpha.png", dict(maxKB=100), dict(maxB=100_000, check=centre_white)),
    ("alpha PNG -> PNG keeps transparency (scale search)", "alpha.png", dict(format="png", maxKB=300), dict(maxB=300_000, format="PNG", check=centre_transparent)),
    ("PNG source -> JPEG max 80KB", "photo.png", dict(maxKB=80), dict(maxB=80_000)),
    ("WebP source -> JPEG max 50KB", "photo.webp", dict(maxKB=50), dict(maxB=50_000, format="JPEG")),
    ("WebP output max 50KB", "photo.webp", dict(format="webp", maxKB=50), dict(maxB=50_000, format="WEBP")),
    ("HEIC source max 100KB", "photo.heic", dict(maxKB=100), dict(maxB=100_000)),
    ("already fits -> untouched", "small_80kb.jpg", dict(maxKB=100), dict(status="unchanged", check=same_as_source("small_80kb.jpg"))),
    ("impossible: 12MP -> 1KB", "photo_12mp.jpg", dict(maxKB=1), dict(status="over-limit")),
    ("impossible: locked 413x531 -> 2KB", "photo_12mp.jpg", dict(width=413, height=531, maxKB=2), dict(status="over-limit", dims=(413, 531))),
    ("impossible: PNG locked 800x600 -> 100KB", "photo.png", dict(format="png", width=800, height=600, maxKB=100), dict(status="over-limit")),
    ("degenerate range 100-100KB hits exactly", "photo_2mp.jpg", dict(minKB=100, maxKB=100), dict(check=exact_bytes(100_000))),
    ("bad options: min > max", "photo_2mp.jpg", dict(minKB=60, maxKB=50), dict(code="bad-options")),
    ("bad options: min without max", "photo_2mp.jpg", dict(minKB=60), dict(code="bad-options")),
    ("error: empty file", "empty.jpg", dict(maxKB=50), dict(code="empty")),
    ("error: truncated JPEG", "truncated.jpg", dict(maxKB=50), dict(code_any=("decode-failed", None))),
    ("error: text renamed .jpg", "text_as.jpg", dict(maxKB=50), dict(code="unsupported")),
    ("error: random bytes .png", "garbage.png", dict(maxKB=50), dict(code="unsupported")),
    ("error: GIF", "anim.gif", dict(maxKB=50), dict(code="unsupported")),
    ("progressive JPEG -> 50KB", "progressive.jpg", dict(maxKB=50), dict(maxB=50_000)),
    ("CMYK JPEG -> 50KB", "cmyk.jpg", dict(maxKB=50), dict(maxB=50_000)),
    ("grayscale PNG -> JPEG 40KB", "gray.png", dict(maxKB=40), dict(maxB=40_000)),
    ("palette PNG w/ transparency -> JPEG 40KB", "palette_transp.png", dict(maxKB=40), dict(maxB=40_000)),
    ("panorama 10000x500 -> 50KB", "pano_10000x500.jpg", dict(maxKB=50), dict(maxB=50_000)),
    ("1x1 pixel PNG -> max 5KB", "one_px.png", dict(maxKB=5), dict(maxB=5_000, dims=(1, 1))),
    ("HUGE 48MP -> max 100KB", "huge_48mp.jpg", dict(maxKB=100), dict(status="ok", maxB=100_000, maxMs=40_000)),
]

rows = []
fails = 0
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_default_timeout(300_000)
    msgs = []
    page.on("console", lambda m: msgs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: msgs.append(f"[pageerror] {e}"))
    page.goto(f"{BASE}/test/harness.html")
    page.wait_for_function("window.harnessReady === true")

    for i, (label, fx, opts, exp) in enumerate(CASES):
        t = time.time()
        res = page.evaluate("([u,o]) => run(u,o)", [f"{BASE}/test/fixtures/{fx}", opts])
        wall = time.time() - t
        problems = []
        info = ""

        if not res["ok"]:
            info = f"ERR {res['code']}: {res['message'][:60]}"
            want = exp.get("code")
            any_ = exp.get("code_any")
            if want is not None and res["code"] != want:
                problems.append(f"expected error {want}, got {res['code']}")
            elif any_ is not None and res["code"] not in any_:
                problems.append(f"expected error in {any_}, got {res['code']}")
            elif want is None and any_ is None:
                problems.append("unexpected error")
        else:
            data = base64.b64decode(res["b64"])
            if "code" in exp:
                problems.append(f"expected error {exp['code']} but succeeded")
            try:
                img = Image.open(io.BytesIO(data))
                fmt = img.format
                img.load()
            except Exception as e:
                problems.append(f"output not decodable by Pillow: {e}")
                img = None
            if img is not None:
                if img.size != (res["width"], res["height"]):
                    problems.append(f"dims mismatch: Pillow {img.size} vs engine {(res['width'], res['height'])}")
                if len(data) != res["bytes"]:
                    problems.append(f"byte count mismatch: {len(data)} vs {res['bytes']}")
                if "dims" in exp and img.size != exp["dims"]:
                    problems.append(f"dims {img.size} != {exp['dims']}")
                if "format" in exp and fmt != exp["format"]:
                    problems.append(f"format {fmt} != {exp['format']}")
                if "status" in exp and res["status"] != exp["status"]:
                    problems.append(f"status {res['status']} != {exp['status']}")
                if "maxB" in exp and len(data) > exp["maxB"]:
                    problems.append(f"{len(data):,} bytes > max {exp['maxB']:,}")
                if "minB" in exp and len(data) < exp["minB"]:
                    problems.append(f"{len(data):,} bytes < min {exp['minB']:,}")
                if "minQ" in exp and (res["quality"] or 0) < exp["minQ"]:
                    problems.append(f"quality {res['quality']} < {exp['minQ']}")
                if "maxMs" in exp and res["ms"] > exp["maxMs"]:
                    problems.append(f"{res['ms']}ms > {exp['maxMs']}ms")
                if "check" in exp:
                    msg = exp["check"](img, res, data)
                    if msg:
                        problems.append(msg)
                # quality sanity: compare with original resized to output size (unlocked, non-rotated, no alpha/HEIC)
                q = ""
                if not opts.get("width") and not opts.get("height") and fx.endswith((".jpg", ".png", ".webp")) and "exif" not in fx and "alpha" not in fx:
                    try:
                        src = Image.open(os.path.join(FIX, fx)).convert("RGB")
                        ref = src.resize(img.size, Image.LANCZOS)
                        q = f"  PSNR {psnr(ref, img):.1f}dB"
                    except Exception:
                        pass
                safe = "".join(c if c.isalnum() else "_" for c in label)[:50]
                with open(os.path.join(OUT, f"{i:02d}_{safe}.{ {'JPEG':'jpg','PNG':'png','WEBP':'webp'}.get(fmt,'bin') }"), "wb") as f:
                    f.write(data)
                qs = "-" if res["quality"] is None else f"q{res['quality']:.2f}"
                info = f"{len(data):>9,}B {img.size[0]}x{img.size[1]} {qs} s{res['scale']:.2f} {res['status']} enc={res['encodes']} {res['ms']}ms{q}"
                if res["warnings"]:
                    info += f"  warn: {res['warnings'][0][:50]}"
        ok = not problems
        fails += 0 if ok else 1
        print(f"{'PASS' if ok else 'FAIL'}  {label:52s} {info}")
        for pr in problems:
            print(f"        -> {pr}")

    # Reuse one decoded image for several fits, then abort mid-way
    extra = page.evaluate("([u]) => runReuse(u)", [f"{BASE}/test/fixtures/photo_12mp.jpg"])
    print("REUSE ", json.dumps(extra["reuse"]))
    ok_reuse = all(r["bytes"] <= r["limit"] for r in extra["reuse"])
    print("PASS " if ok_reuse else "FAIL ", "reuse one decoded image for 100/50/20KB")
    fails += 0 if ok_reuse else 1
    ok_abort = extra["abort"] == "aborted"
    print("PASS " if ok_abort else "FAIL ", "abort signal stops work ->", extra["abort"])
    fails += 0 if ok_abort else 1
    CASES.extend([None, None])

    browser.close()

print()
print("console errors/warnings:", msgs if msgs else "none")
print(f"\n{len(CASES) - fails}/{len(CASES)} passed")
sys.exit(1 if fails else 0)
