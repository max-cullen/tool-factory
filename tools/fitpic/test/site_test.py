"""Browser test for the built site. Usage: python3 -I site_test.py <dist_dir> <fixtures_dir> <out_dir>"""
import sys, os, threading, functools, http.server, json, time
from playwright.sync_api import sync_playwright

DIST, FIX, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=DIST))
BASE = f"http://127.0.0.1:{srv.server_address[1]}"
threading.Thread(target=srv.serve_forever, daemon=True).start()

problems = []
log = []


def check(cond, msg):
    print(("PASS  " if cond else "FAIL  ") + msg)
    if not cond:
        problems.append(msg)


with sync_playwright() as p:
    b = p.chromium.launch()
    for name, vw, vh, mobile in [("desktop", 1440, 900, False), ("phone", 390, 844, True)]:
        ctx = b.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, accept_downloads=True)
        page = ctx.new_page()
        # the published preview wraps the home page in a skeleton that supplies these two tags
        page.add_init_script("""document.addEventListener('DOMContentLoaded',()=>{if(!document.querySelector('meta[name=viewport]')){const m=document.createElement('meta');m.name='viewport';m.content='width=device-width,initial-scale=1,viewport-fit=cover';document.head.appendChild(m);const st=document.createElement('style');st.textContent=':root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px/1.5 system-ui,sans-serif;color:#000;background:#fff}img{max-width:100%}[hidden]{display:none!important}';document.head.prepend(st);}});""")
        errs = []
        reqs = []
        page.on("request", lambda r: reqs.append((r.method, r.url, bool(r.post_data))))
        page.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        page.on("requestfailed", lambda r: errs.append(f"[requestfailed] {r.url}"))

        page.goto(f"{BASE}/index.html")
        page.wait_for_selector("[data-tool]")
        # no example photo: the tool opens on the big upload area
        page.wait_for_timeout(1200)
        check(page.is_visible("[data-drop]") and not page.is_visible("[data-view]"), f"{name}: opens on the upload area, no example photo")
        st = page.evaluate("(()=>{const h=getComputedStyle(document.querySelector('h1'));const b=getComputedStyle(document.querySelector('#app p'));return [h.color,b.fontFamily,getComputedStyle(document.body).backgroundColor]})()")
        check(st[0] != 'rgb(0, 0, 0)' and 'Jakarta' in st[1] and st[2] != 'rgb(255, 255, 255)', f"{name}: own colours and font win over the viewer reset {st}")
        page.screenshot(path=f"{OUT}/{name}_home_top.png")
        page.screenshot(path=f"{OUT}/{name}_home_full.png", full_page=True)

        # ad placement: placeholders sit below the tool, never inside it, and do not move the tool
        ad = page.evaluate("(()=>{const t=document.querySelector('#tool').getBoundingClientRect();const a=document.querySelector('.ad-slot');return a?{inside:!!document.querySelector('#tool .ad-slot'),below:a.getBoundingClientRect().top>=t.bottom-1,h:a.getBoundingClientRect().height}:null})()")
        check(ad is not None and not ad['inside'] and ad['below'] and ad['h'] >= 100, f"{name}: ad space is below the tool, not inside it ({ad})")

        # horizontal overflow check
        ow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(ow <= 0, f"{name}: no horizontal scroll on home (overflow {ow}px)")

        # use a real file through the file input
        page.set_input_files("[data-file]", os.path.join(FIX, "photo_12mp.jpg"))
        page.wait_for_function("document.querySelector('[data-name]').textContent.includes('photo_12mp')", timeout=60000)
        page.wait_for_function("!document.querySelector('[data-busy]').hidden === false", timeout=60000)
        page.wait_for_timeout(2500)
        txt = page.inner_text("[data-to]")
        check("KB" in txt and float(txt.split()[0]) <= 100.0, f"{name}: 12MP photo fitted under 100 KB ({txt})")
        page.screenshot(path=f"{OUT}/{name}_tool_result.png")

        tops = page.eval_on_selector_all("[data-sec='kb'] .chip", "e=>[...new Set(e.map(x=>Math.round(x.getBoundingClientRect().top)))]")
        check(len(tops) == 1, f"{name}: size chips sit on one row ({tops})")

        # change maximum to 20 KB, then check result
        if page.is_visible("[data-more-toggle]"):
            check(not page.is_visible("[data-max]"), f"{name}: custom size field tucked behind More options")
            page.click("[data-more-toggle]")
        page.fill("[data-max]", "20")
        page.wait_for_timeout(3000)
        txt = page.inner_text("[data-to]")
        check("KB" in txt and float(txt.split()[0]) <= 20.0, f"{name}: preset 20 KB applied ({txt})")

        # switch to Both with pixels
        page.click("label:has(input[name='mode'][value='both'])")
        page.fill("[data-w]", "413")
        page.fill("[data-h]", "531")
        page.wait_for_timeout(3000)
        dim = page.inner_text("[data-dim]")
        check("413" in dim and "531" in dim, f"{name}: exact pixels applied ({dim})")
        check(page.query_selector("[data-cmp]") is not None, f"{name}: crop to a new shape still shows the before/after slider")
        page.screenshot(path=f"{OUT}/{name}_tool_pixels.png")

        # min range
        # validation: minimum equal to maximum is refused politely
        page.click("[data-min-on]")
        page.wait_for_timeout(600)
        check("smaller" in page.inner_text("[data-msg]"), f"{name}: min >= max gives a clear message ({page.inner_text('[data-msg]')[:50]})")
        # a valid range, pixels cleared
        page.click("[data-px-chip][data-w='']")
        page.click("[data-kb-chip='100']")
        page.wait_for_timeout(3500)
        txt = page.inner_text("[data-to]")
        v = float(txt.split()[0]) * (1000 if "MB" in txt else 1)
        check(20.48 <= v <= 100.0, f"{name}: range 20-100 KB result in range ({txt})")
        # download
        with page.expect_download(timeout=15000) as dl:
            page.click("[data-download]")
        d = dl.value
        path = os.path.join(OUT, f"{name}_" + d.suggested_filename)
        d.save_as(path)
        check(os.path.getsize(path) > 0, f"{name}: download saved {d.suggested_filename} ({os.path.getsize(path):,} bytes)")

        # error: bad file
        page.set_input_files("[data-file]", os.path.join(FIX, "text_as.jpg"))
        page.wait_for_selector("[data-err]:not([hidden])", timeout=10000)
        check("image" in page.inner_text("[data-err]").lower(), f"{name}: friendly error for a non-image ({page.inner_text('[data-err]')[:60]})")

        # other pages load without errors and without overflow
        for path_ in ["reduce-image-size-in-kb", "resize-image-to-exact-pixels", "compress-image-to-100kb", "compress-image-to-1mb", "privacy", "terms", "about", "compress-image-to-20kb"]:
            page.goto(f"{BASE}/{path_}/index.html")
            page.wait_for_timeout(500)
            ow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check(ow <= 0, f"{name}: /{path_}/ no horizontal scroll ({ow}px)")
            if path_ in ("resize-image-to-exact-pixels", "compress-image-to-1mb"):
                page.screenshot(path=f"{OUT}/{name}_{path_}.png", full_page=name == "desktop")
        # HEIC through the UI (desktop only)
        if name == "desktop":
            page.goto(f"{BASE}/reduce-image-size-in-kb/index.html")
            page.wait_for_selector("[data-tool]")
            page.set_input_files("[data-file]", os.path.join(FIX, "photo.heic"))
            page.wait_for_function("document.querySelector('[data-name]').textContent.includes('photo.heic')", timeout=60000)
            page.wait_for_timeout(3000)
            txt = page.inner_text("[data-to]")
            check("KB" in txt, f"{name}: HEIC photo handled in the UI ({txt})")

        outside = [r for r in reqs if not r[1].startswith(BASE) and not r[1].startswith(("blob:", "data:"))]
        posts = [r for r in reqs if r[0] != "GET" or r[2]]
        check(not outside and not posts, f"{name}: privacy audit, no outside requests and no uploads in {len(reqs)} requests {outside[:2]} {posts[:2]}")
        real = [e for e in errs if "favicon" not in e]
        check(not real, f"{name}: no console errors/warnings {real[:3]}")
        ctx.close()
    b.close()

print("\n%d problem(s)" % len(problems))
sys.exit(1 if problems else 0)
