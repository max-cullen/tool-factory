"""Generate test images for the engine. Run: python3 -I make_fixtures.py <output_dir>"""
import sys, os, io
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)


def photo(w, h, noise=14.0, seed=1):
    """Photo-like: smooth colour fields + shapes + fine grain."""
    r = np.random.default_rng(seed)
    small = r.integers(0, 255, (max(2, h // 400), max(2, w // 400), 3)).astype(np.uint8)
    base = Image.fromarray(small).resize((w, h), Image.BICUBIC)
    d = ImageDraw.Draw(base)
    for _ in range(40):
        x0, y0 = int(r.integers(0, w)), int(r.integers(0, h))
        x1, y1 = x0 + int(r.integers(20, w // 3 + 21)), y0 + int(r.integers(20, h // 3 + 21))
        d.ellipse([x0, y0, x1, y1], fill=tuple(int(v) for v in r.integers(0, 255, 3)))
    base = base.filter(ImageFilter.GaussianBlur(2))
    arr = np.asarray(base).astype(np.float32)
    arr += r.normal(0, noise, arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def save(img, name, **kw):
    p = os.path.join(out, name)
    img.save(p, **kw)
    print(f"{name:22s} {img.size[0]}x{img.size[1]}  {os.path.getsize(p):>10,} bytes")


# Core photos
save(photo(4000, 3000), "photo_12mp.jpg", quality=92)
save(photo(1600, 1200, seed=2), "photo_2mp.jpg", quality=90)
save(photo(1600, 1200, seed=3), "photo.png")
save(photo(1600, 1200, seed=4), "photo.webp", quality=88)

# Huge (48 MP)
save(photo(8000, 6000, noise=10, seed=5), "huge_48mp.jpg", quality=88)

# Already small (should come back untouched under a 100KB limit)
save(photo(500, 400, noise=3, seed=6), "small_80kb.jpg", quality=60)

# EXIF-rotated: pixels are 1200x800 landscape, EXIF says rotate 90 -> 800x1200 portrait
im = photo(1200, 800, seed=8)
exif = Image.Exif()
exif[0x0112] = 6
save(im, "exif_rot6.jpg", quality=90, exif=exif)

# Alpha PNG with a transparent hole
a = photo(1000, 1000, seed=9).convert("RGBA")
ad = ImageDraw.Draw(a)
ad.ellipse([250, 250, 750, 750], fill=(0, 0, 0, 0))
save(a, "alpha.png")

# Very compressible (flat gradient) -> needs padding to reach a minimum size
g = np.linspace(0, 255, 2000, dtype=np.uint8)
grad = np.stack([np.tile(g, (2000, 1))] * 3, axis=2)
save(Image.fromarray(grad), "smooth_2k.jpg", quality=85)

# Tiny image
save(photo(40, 40, seed=10), "tiny_40.jpg", quality=90)

# Signature-like: dark strokes on white
s = Image.new("RGB", (900, 300), "white")
sd = ImageDraw.Draw(s)
pts = [(30 + i * 8, 150 + int(70 * np.sin(i / 6.0)) + int(rng.integers(-3, 4))) for i in range(100)]
sd.line(pts, fill=(10, 10, 60), width=7)
save(s, "signature.png")

# HEIC
import pillow_heif
pillow_heif.register_heif_opener()
save(photo(2000, 1500, seed=11), "photo.heic", quality=80)

# Broken inputs
open(os.path.join(out, "empty.jpg"), "wb").close()
with open(os.path.join(out, "photo_12mp.jpg"), "rb") as f:
    data = f.read()
open(os.path.join(out, "truncated.jpg"), "wb").write(data[: len(data) // 5])
open(os.path.join(out, "text_as.jpg"), "wb").write(b"this is not an image at all\n" * 100)
open(os.path.join(out, "garbage.png"), "wb").write(bytes(rng.integers(0, 255, 5000, dtype=np.uint8)))
open(os.path.join(out, "anim.gif"), "wb").write(b"GIF89a" + bytes(200))
# Format variety
base = photo(1200, 900, seed=12)
save(base, "progressive.jpg", quality=88, progressive=True)
save(base.convert("CMYK"), "cmyk.jpg", quality=88)
save(base.convert("L"), "gray.png")
pal = base.convert("P", palette=Image.ADAPTIVE, colors=64)
pal.info["transparency"] = 0
save(pal, "palette_transp.png", transparency=0)
save(photo(10000, 500, seed=13), "pano_10000x500.jpg", quality=88)
save(Image.new("RGB", (1, 1), (200, 30, 30)), "one_px.png")
print("done")
