# FitReel site test: drives the built page like a visitor and screenshots it.
# Usage (from tools/fitreel, after `npm run preview -- fitpic`):
#   python3 -I test/site_test.py ../fitpic/dist test/fixtures /tmp/fitreel_site
import base64, functools, http.server, json, os, socketserver, subprocess, sys, threading
from playwright.sync_api import sync_playwright

DIST, FX, OUT = (os.path.abspath(a) for a in sys.argv[1:4])
os.makedirs(OUT, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=DIST))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{httpd.server_address[1]}'
fails = []
def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond: fails.append(msg)

def wait_done(pg, timeout=180000):
    pg.wait_for_function("() => { const b = document.querySelector('[data-download]'); return b && b.classList.contains('btn-success') || /text-bad/.test(document.querySelector('[data-msg]').className); }", timeout=timeout)

with sync_playwright() as p:
    b = p.chromium.launch()
    for label, vp in [('desktop', dict(width=1440, height=1000)), ('phone', dict(width=390, height=844))]:
        print(label)
        ctx = b.new_context(viewport=vp, device_scale_factor=2 if label == 'phone' else 1, accept_downloads=True)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto(f'{BASE}/instagram/index.html')
        pg.screenshot(path=f'{OUT}/{label}-1-empty.png')
        pg.set_input_files('[data-file]', f'{FX}/landscape.mp4')
        wait_done(pg)
        pg.wait_for_timeout(600)
        check('btn-success' in (pg.get_attribute('[data-download]', 'class') or ''), 'auto-rendered after drop, Download ready')
        notes = pg.inner_text('[data-notes]')
        check('Location data found and removed' in notes, 'location found-and-removed note shown')
        pg.locator('[data-tool]').screenshot(path=f'{OUT}/{label}-2-result.png')
        with pg.expect_download() as d:
            pg.click('[data-download]')
        dl = d.value; path = f'{OUT}/{label}-download.mp4'; dl.save_as(path)
        info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', path], capture_output=True, text=True).stdout)
        v = [s for s in info['streams'] if s['codec_type'] == 'video'][0]
        check(v['width'] == 1080 and v['height'] == 1920 and dl.suggested_filename.endswith('-reel.mp4'), f'download is 1080x1920 ({dl.suggested_filename})')
        with pg.expect_download() as d:
            pg.click('[data-cover-dl]')
        check(d.value.suggested_filename.endswith('-cover.jpg'), 'cover downloads as JPG')
        if label == 'desktop':
            # Crop + safe zones, then split screen with a second clip.
            pg.click('input[name=framing][value=crop]'); pg.wait_for_timeout(300)
            pg.check('[data-safe-on]'); pg.wait_for_timeout(500)
            pg.locator('[data-tool]').screenshot(path=f'{OUT}/{label}-3-crop-safe.png')
            wait_done(pg)
            pg.uncheck('[data-safe-on]')
            pg.click('input[name=layout][value=split]'); pg.wait_for_timeout(400)
            pg.locator('[data-tool]').screenshot(path=f'{OUT}/{label}-4-split-empty.png')
            pg.set_input_files('[data-file2]', f'{FX}/second.webm')
            pg.wait_for_timeout(1500)
            wait_done(pg)
            pg.wait_for_timeout(600)
            check('btn-success' in pg.get_attribute('[data-download]', 'class'), 'split screen renders')
            pg.click('input[name=view][value=frame]'); pg.wait_for_timeout(400)
            pg.locator('[data-tool]').screenshot(path=f'{OUT}/{label}-5-split.png')
            # Trim
            pg.eval_on_selector('[data-trim-a]', "e => { e.value = 250; e.dispatchEvent(new Event('input', {bubbles:true})); }")
            pg.wait_for_timeout(300)
            check('to' in pg.inner_text('[data-trim-label]'), f"trim label updates ({pg.inner_text('[data-trim-label]')})")
            wait_done(pg)
            # Bad file
            pg.set_input_files('[data-file]', f'{FX}/not-a-video.mp4')
            pg.wait_for_selector('[data-err] .note-bad')
            check(True, 'bad file shows an error')
        check(not errs, f'no page errors {errs[:3]}')
        ctx.close()
    # Link from Fitpic to the Reels tool and back.
    pg = b.new_page(); pg.goto(f'{BASE}/index.html')
    for label, url in [('Fitpic', f'{BASE}/index.html'), ('FitReel', f'{BASE}/instagram/split-screen-video-maker/index.html')]:
        pg.goto(url)
        pg.click('[data-fam-toggle]')
        check(pg.is_visible('[data-fam-pop]'), f'{label}: Fit tools menu opens')
        names = pg.locator('[data-fam-pop] .fam-item').all_inner_texts()
        check([n.split()[0] for n in names] == ['Fitpic', 'FitReel', 'FitQR', 'FitTimer'], f'{label}: menu lists the four tools {names}')
        check(pg.locator('[data-fam-pop] a').count() == 2 and pg.locator('[data-fam-pop] .is-soon').count() == 2, f'{label}: two links, two placeholders')
        pg.keyboard.press('Escape')
        check(not pg.is_visible('[data-fam-pop]'), f'{label}: Escape closes the menu')
        foot = pg.locator('.site-footer').inner_text()
        check('FitQR' in foot and 'FitTimer' in foot and 'Soon' in foot, f'{label}: footer lists the family')
    hrefs = pg.eval_on_selector_all('[data-fam-pop] a', 'els => els.map(e => e.getAttribute("href"))')
    check(hrefs == ['https://usefitpic.com', 'https://usefitpic.com/instagram'], f'menu links go to the live addresses {hrefs}')
    b.close()
httpd.shutdown()
print('\n' + ('ALL PASSED' if not fails else f'{len(fails)} FAILED:\n' + '\n'.join(fails)))
sys.exit(1 if fails else 0)
