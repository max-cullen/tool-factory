"""Make PNG/ICO icons for one tool from its built favicon.svg.
Usage (after `npm run build -- <tool>`):  python3 framework/make_icons.py <tool>
Writes tools/<tool>/icons/favicon.ico, apple-touch-icon.png (180px) and icon-512.png. Needs Playwright + Pillow."""
import sys, os, io
from playwright.sync_api import sync_playwright
from PIL import Image

tool = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
svg = open(os.path.join(root, 'tools', tool, 'dist', 'favicon.svg')).read()
out = os.path.join(root, 'tools', tool, 'icons'); os.makedirs(out, exist_ok=True)

def render(size, pad=0, bg=None, src=None):
    src = src or svg
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': size, 'height': size})
        inner = size - 2 * pad
        pg.set_content(f'<html><body style="margin:0;background:{bg or "transparent"}"><div style="padding:{pad}px">'
                       f'<div style="width:{inner}px;height:{inner}px">{src.replace("<svg ", f"<svg width=\'{inner}\' height=\'{inner}\' ")}</div></div></body></html>')
        png = pg.screenshot(omit_background=bg is None, clip={'x': 0, 'y': 0, 'width': size, 'height': size})
        b.close()
    return Image.open(io.BytesIO(png)).convert('RGBA')

# Apple touch icon: iOS rounds the corners itself, so use square corners.
render(180, src=svg.replace('rx="8"', 'rx="0"')).convert('RGB').save(os.path.join(out, 'apple-touch-icon.png'))
render(512).save(os.path.join(out, 'icon-512.png'))
render(64).save(os.path.join(out, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('icons written to', out)
