# FitReel engine tests: runs the engine in headless Chromium and checks every output file with ffprobe.
# Usage (from tools/fitreel):  python3 -I test/run_tests.py . /tmp/fitreel_out
# Needs: pip install playwright (Chromium), ffmpeg/ffprobe, and fixtures from test/make_fixtures.py.
import base64, json, os, subprocess, sys, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/fitreel_out'
os.makedirs(OUT, exist_ok=True)
LOC = b'+27.4698+153.0251'

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
PORT = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()

def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], capture_output=True, text=True)
    return json.loads(r.stdout or '{}')

def frame_rgb(path, t, x, y):
    # Average colour of a 8x8 patch at (x,y) of the frame at time t.
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', path, '-frames:v', '1', '-vf', f'crop=8:8:{x}:{y},scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    return tuple(r.stdout[:3]) if len(r.stdout) >= 3 else None

F = '/test/fixtures/'
CASES = [
    # name, args, checks
    ('landscape-blur', dict(file=F + 'landscape.mp4', opts={}, cover=True), dict(dur=8, audio=True, strip=True)),
    ('landscape-crop-left', dict(file=F + 'landscape.mp4', opts={'framing': 'crop', 'pos': 0}), dict(dur=8, audio=True)),
    ('landscape-bars-small', dict(file=F + 'landscape.mp4', opts={'framing': 'bars', 'quality': 'small'}), dict(dur=8, audio=True, bars=True)),
    ('landscape-keep-meta', dict(file=F + 'landscape.mp4', opts={'strip': False}), dict(dur=8, audio=True, keep=True)),
    ('trim-2-to-5', dict(file=F + 'landscape.mp4', opts={'trimStart': 2, 'trimEnd': 5}), dict(dur=3, audio=True)),
    ('rotated-phone', dict(file=F + 'rotated.mp4', opts={}), dict(dur=5, audio=True, strip=True)),
    ('portrait-60fps-silent', dict(file=F + 'portrait60_silent.webm', opts={}), dict(dur=3, audio=False)),
    ('split-sound-main', dict(file=F + 'landscape.mp4', second=F + 'second.webm', opts={'split': True}, cover=True), dict(dur=8, audio=True)),
    ('split-swap-sound-second', dict(file=F + 'landscape.mp4', second=F + 'second.webm', opts={'split': True, 'swap': True, 'sound': 'second'}), dict(dur=8, audio=True)),
    ('split-mute', dict(file=F + 'landscape.mp4', second=F + 'second.webm', opts={'split': True, 'sound': 'none'}), dict(dur=8, audio=False)),
]
ERROR_CASES = [
    ('not-a-video', dict(file=F + 'not-a-video.mp4', opts={})),
    ('split-without-second', dict(file=F + 'landscape.mp4', opts={'split': True})),
    ('cancel', dict(file=F + 'landscape.mp4', opts={}, abortAfterMs=300)),
]

fails = []
def check(name, cond, msg):
    if not cond: fails.append(f'{name}: {msg}')
    print(('  ok   ' if cond else '  FAIL ') + msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.on('pageerror', lambda e: print('pageerror', e))
    pg.goto(f'http://127.0.0.1:{PORT}/test/harness.html')
    pg.wait_for_function('window.READY')
    for name, args, exp in CASES:
        print(name)
        r = pg.evaluate('(a) => window.runCase(a)', args)
        if not r.get('ok'):
            check(name, False, f"render failed: {r.get('error')}"); continue
        path = f'{OUT}/{name}.mp4'
        data = base64.b64decode(r['data'])
        open(path, 'wb').write(data)
        info = probe(path)
        v = [s for s in info.get('streams', []) if s['codec_type'] == 'video']
        a = [s for s in info.get('streams', []) if s['codec_type'] == 'audio']
        check(name, len(v) == 1 and v[0]['width'] == 1080 and v[0]['height'] == 1920, f"video 1080x1920 ({v[0]['width'] if v else '-'}x{v[0]['height'] if v else '-'}, {v[0]['codec_name'] if v else ''})")
        rot = [sd.get('rotation') for s in v for sd in s.get('side_data_list', []) if 'rotation' in sd]
        check(name, not any(rot), f'no rotation flag on output ({rot})')
        dur = float(info['format']['duration'])
        check(name, abs(dur - exp['dur']) < 0.2, f"duration {dur:.2f}s ~ {exp['dur']}s")
        check(name, bool(a) == exp['audio'], f"audio track {'present' if a else 'absent'} (expected {'yes' if exp['audio'] else 'no'})")
        if a:
            ad = float(a[0].get('duration', dur))
            check(name, abs(ad - exp['dur']) < 0.25, f'audio length {ad:.2f}s matches video')
        if exp.get('strip'):
            check(name, LOC not in data and b'secret title' not in data and b'\xa9xyz' not in data and b'loci' not in data, 'no location or title in output bytes')
            check(name, r['clip']['meta']['location'], 'location detected in the original')
        if exp.get('keep'):
            check(name, b'secret title' in data, 'tags kept when strip is off')
        if exp.get('bars'):
            top = frame_rgb(path, 1, 500, 40)
            check(name, top is not None and max(top) < 24, f'black bars at top {top}')
        check(name, r['progress']['monotonic'] and r['progress']['last'] == 1, f"progress rises to 1 ({r['progress']['n']} updates)")
        print(f"  {r['ms']} ms, {len(data)//1024} KB, codec {r['result']['videoCodec']}/{r['result']['audioCodec']}, warnings {r['result']['warnings']}")
        if 'cover' in r:
            cp = f'{OUT}/{name}-cover.jpg'
            open(cp, 'wb').write(base64.b64decode(r['cover']['data']))
            ci = probe(cp)['streams'][0]
            check(name, ci['width'] == 1080 and ci['height'] == 1920, f"cover jpg 1080x1920 at {r['cover']['t']:.2f}s")
    for name, args in ERROR_CASES:
        print(name)
        r = pg.evaluate('(a) => window.runCase(a)', args)
        err = r.get('error') or {}
        check(name, not r.get('ok') and err.get('message'), f"fails cleanly: {err.get('code')} / {err.get('message')}")
    b.close()
httpd.shutdown()
print('\n' + ('ALL PASSED' if not fails else f'{len(fails)} FAILED:\n' + '\n'.join(fails)))
sys.exit(1 if fails else 0)
