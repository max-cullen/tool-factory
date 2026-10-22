import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readImageSize } from '../src/image-size.mjs';

const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

test('PNG header', () => {
  const b = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...be32(10100), ...be32(7), 8, 6, 0, 0, 0]);
  assert.deepEqual(readImageSize(b), { width: 10100, height: 7 });
});

test('JPEG: skips other segments to the frame header', () => {
  const b = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 6, 1, 2, 3, 4, 0xff, 0xc4, 0, 4, 9, 9, 0xff, 0xc0, 0, 11, 8, 0x0b, 0xb8, 0x0f, 0xa0, 1, 0, 0, 0]);
  assert.deepEqual(readImageSize(b), { width: 4000, height: 3000 });
});

test('GIF header', () => {
  const b = new Uint8Array([...'GIF89a'].map((c) => c.charCodeAt(0)).concat([100, 0, 50, 0, 0, 0, 0, 0]));
  assert.deepEqual(readImageSize(b), { width: 100, height: 50 });
});

test('junk and short input give null', () => {
  assert.equal(readImageSize(new Uint8Array(0)), null);
  assert.equal(readImageSize(new Uint8Array(40).fill(7)), null);
  assert.equal(readImageSize(null), null);
});

test('agrees with PIL for real PNG, JPEG, WebP and GIF files', (t) => {
  const code = `
import sys,io
from PIL import Image
out=[]
for fmt,kw in (('PNG',{}),('JPEG',{'quality':80}),('WEBP',{}),('WEBP',{'lossless':True}),('GIF',{})):
    im=Image.new('RGB',(321,123),(200,30,60)); b=io.BytesIO(); im.save(b,fmt,**kw); open(sys.argv[1]+'/'+fmt+str(len(out)),'wb').write(b.getvalue()); out.append(fmt+str(len(out)))
print(' '.join(out))`;
  const dir = mkdtempSync(join(tmpdir(), 'sz-'));
  try {
    const r = spawnSync('python3', ['-I', '-c', code, dir], { encoding: 'utf8' });
    if (r.status !== 0) return t.skip('python3 with Pillow not available');
    for (const name of r.stdout.trim().split(' ')) {
      assert.deepEqual(readImageSize(new Uint8Array(readFileSync(join(dir, name)))), { width: 321, height: 123 }, name);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
