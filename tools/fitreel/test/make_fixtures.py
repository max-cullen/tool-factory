# Test videos for FitReel, made with ffmpeg.  Usage: python3 -I test/make_fixtures.py test/fixtures
# VP9/Opus are used because the open-source Chromium used for tests has no H.264 decoder (Chrome, Edge and Safari do).
import os, subprocess, sys
out = sys.argv[1] if len(sys.argv) > 1 else 'test/fixtures'
os.makedirs(out, exist_ok=True)
LOC = '+27.4698+153.0251/'
def ff(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)
vp9 = ['-c:v', 'libvpx-vp9', '-b:v', '2M', '-deadline', 'realtime', '-cpu-used', '8']
# Landscape 16:9 with sound and a GPS location tag.
ff('-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30:duration=8', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8:sample_rate=48000',
   *vp9, '-c:a', 'libopus', '-metadata', f'location={LOC}', '-metadata', 'title=secret title', '-movflags', '+use_metadata_tags', f'{out}/landscape.mp4')
# Phone-style: stored landscape with a 90 degree rotation flag (so it plays portrait), 44.1 kHz audio, location.
ff('-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30:duration=5', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=5:sample_rate=44100',
   *vp9, '-c:a', 'libopus', f'{out}/_tmp.mp4')
ff('-display_rotation', '90', '-i', f'{out}/_tmp.mp4', '-c', 'copy', '-metadata', f'location={LOC}', f'{out}/rotated.mp4')
os.remove(f'{out}/_tmp.mp4')
# Already 9:16, no audio track, 60 fps.
ff('-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=60:duration=3', *vp9, f'{out}/portrait60_silent.webm')
# Short second clip (3 s) with its own sound, for split screen looping.
ff('-f', 'lavfi', '-i', 'mandelbrot=size=640x480:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=3', '-t', '3', *vp9, '-c:a', 'libopus', f'{out}/second.webm')
# Not a video.
open(f'{out}/not-a-video.mp4', 'wb').write(b'hello, this is not a video file' * 100)
print('fixtures in', out)
