// Engine tests that run in node. engine.js is a browser module but has no DOM access at import time, and the
// fitting logic only touches the canvas through OffscreenCanvas, so a small stub with a size model is enough.
// What this covers: KB maths, format sniffing, names, byte formatting, option checks, the "already fits" path,
// the quality/scale search, padding to a minimum and abort.
// What it cannot cover (see README): real JPEG/WebP/PNG encoding, EXIF rotation, createImageBitmap, HEIC decoding.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sniffFormat, suggestName, formatBytes, fitImage, loadImage, ImageFitError } from '../engine/engine.js';

/* ---- canvas stub: encoded size = pixels x bytes-per-pixel(quality). Output starts with a valid JPEG/PNG head. ---- */
class FakeCanvas {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return { drawImage() {}, fillRect() {}, set fillStyle(_) {} }; }
  async convertToBlob({ type, quality }) {
    const q = quality ?? 1;
    const size = Math.max(64, Math.round(this.width * this.height * (0.02 + 0.5 * q * q)));
    const bytes = new Uint8Array(size);
    if (type === 'image/png') {
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      bytes.set([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], size - 12); // IEND chunk
    } else {
      bytes[0] = 0xff; bytes[1] = 0xd8; // SOI, then no APPn segments
    }
    return new Blob([bytes], { type });
  }
}
globalThis.OffscreenCanvas = FakeCanvas;

function fakeImage(width, height, { originalBytes = width * height, sourceFormat = 'jpeg' } = {}) {
  return {
    file: new Blob([new Uint8Array(originalBytes)], { type: 'image/' + sourceFormat }),
    name: 'photo.jpg', sourceFormat, originalBytes, width, height,
    _levels: [{ width, height, close() {} }], dispose() {},
  };
}

test('sniffFormat recognises the supported file signatures', () => {
  const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
  assert.equal(sniffFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
  assert.equal(sniffFormat(new Uint8Array([0x89, ...ascii('PNG'), 13, 10, 26, 10])), 'png');
  assert.equal(sniffFormat(new Uint8Array([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')])), 'webp');
  assert.equal(sniffFormat(new Uint8Array([...ascii('GIF89a')])), 'gif');
  assert.equal(sniffFormat(new Uint8Array([0, 0, 0, 24, ...ascii('ftypheic')])), 'heic');
  assert.equal(sniffFormat(new Uint8Array([0, 0, 0, 24, ...ascii('ftypmif1')])), 'heic');
  assert.equal(sniffFormat(new Uint8Array([0, 0, 0, 24, ...ascii('ftypavif')])), 'avif');
  assert.equal(sniffFormat(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])), null);
  assert.equal(sniffFormat(new Uint8Array([])), null);
});

test('suggestName swaps the extension and adds the pixel size', () => {
  assert.equal(suggestName('photo.heic', { width: 413, height: 531, format: 'jpeg' }), 'photo-413x531.jpg');
  assert.equal(suggestName('my.holiday.PNG', { width: 10, height: 20, format: 'webp' }), 'my.holiday-10x20.webp');
  assert.equal(suggestName('noext', { width: 1, height: 2, format: 'png' }), 'noext-1x2.png');
  assert.equal(suggestName('', { width: 1, height: 2, format: 'jpeg' }), 'image-1x2.jpg');
});

test('formatBytes uses decimal units', () => {
  assert.equal(formatBytes(999), '999 B');
  assert.equal(formatBytes(1500), '1.5 KB');
  assert.equal(formatBytes(99_999), '100 KB');
  assert.equal(formatBytes(2_500_000), '2.50 MB');
});

test('KB convention: maximum = KB x 1000', async () => {
  const img = fakeImage(2000, 1500, { originalBytes: 3_000_000 });
  for (const kb of [20, 100, 500]) {
    const r = await fitImage(img, { maxKB: kb });
    assert.ok(r.bytes <= kb * 1000, `${kb}KB: got ${r.bytes}`);
    assert.ok(r.bytes > kb * 1000 * 0.8, `${kb}KB: should land close to the limit, got ${r.bytes}`);
    assert.equal(r.status, 'ok');
  }
});

test('KB convention: minimum = KB x 1024, padded up with harmless filler', async () => {
  const img = fakeImage(300, 300, { originalBytes: 500_000 });
  const r = await fitImage(img, { maxKB: 100, minKB: 50, width: 300, height: 300 });
  assert.ok(r.bytes >= 50 * 1024, `got ${r.bytes}`);
  assert.ok(r.bytes <= 100 * 1000);
  const head = new Uint8Array(await r.blob.slice(0, 4).arrayBuffer());
  assert.deepEqual([...head.slice(0, 2)], [0xff, 0xd8]);
  assert.equal(head[2], 0xff);
  assert.equal(head[3], 0xfe); // comment segment inserted
  assert.ok(['ok', 'padded'].includes(r.status));
});

test('minimum larger than maximum in 1024 terms falls back to 1000, equal values are allowed', async () => {
  const img = fakeImage(300, 300, { originalBytes: 500_000 });
  const r = await fitImage(img, { maxKB: 100, minKB: 100, width: 300, height: 300 });
  assert.ok(r.bytes >= 100_000 && r.bytes <= 100_000, `got ${r.bytes}`);
});

test('option checks reject nonsense with a bad-options error', async () => {
  const img = fakeImage(100, 100);
  const bad = [{ format: 'gif' }, { width: 0 }, { width: 30000 }, { maxKB: 0 }, { minKB: 10 }, { maxKB: 10, minKB: 20 }];
  for (const o of bad) {
    await assert.rejects(() => fitImage(img, o), (e) => e instanceof ImageFitError && e.code === 'bad-options', JSON.stringify(o));
  }
});

test('a photo that already fits is returned untouched', async () => {
  const img = fakeImage(800, 600, { originalBytes: 40_000 });
  const r = await fitImage(img, { maxKB: 100 });
  assert.equal(r.status, 'unchanged');
  assert.equal(r.blob, img.file);
  assert.equal(r.encodes, 0);
  // Not untouched when another format or pixel size is requested.
  assert.notEqual((await fitImage(img, { maxKB: 100, format: 'webp' })).status, 'unchanged');
  assert.notEqual((await fitImage(img, { maxKB: 100, width: 400 })).status, 'unchanged');
});

test('exact pixels: both set gives exactly that size; one set keeps the aspect ratio', async () => {
  const img = fakeImage(4000, 3000);
  const both = await fitImage(img, { width: 413, height: 531 });
  assert.equal(both.width, 413);
  assert.equal(both.height, 531);
  const onlyW = await fitImage(img, { width: 800 });
  assert.equal(onlyW.width, 800);
  assert.equal(onlyW.height, 600);
  const onlyH = await fitImage(img, { height: 300 });
  assert.equal(onlyH.width, 400);
  assert.equal(onlyH.height, 300);
});

test('pixels and size together: pixels stay exact, only quality moves', async () => {
  const img = fakeImage(4000, 3000, { originalBytes: 5_000_000 });
  const r = await fitImage(img, { width: 413, height: 531, maxKB: 50 });
  assert.equal(r.width, 413);
  assert.equal(r.height, 531);
  assert.equal(r.scale, 1);
  assert.ok(r.bytes <= 50_000, `got ${r.bytes}`);
});

test('size only: pixels are reduced when quality alone cannot reach the limit', async () => {
  const img = fakeImage(4000, 3000, { originalBytes: 5_000_000 });
  const r = await fitImage(img, { maxKB: 20 });
  assert.ok(r.bytes <= 20_000, `got ${r.bytes}`);
  assert.ok(r.scale < 1);
  assert.ok(r.width < 4000);
});

test('an impossible limit reports over-limit with the smallest version', async () => {
  const img = fakeImage(4000, 3000, { originalBytes: 5_000_000 });
  const r = await fitImage(img, { width: 4000, height: 3000, maxKB: 1 });
  assert.equal(r.status, 'over-limit');
  assert.ok(r.warnings.length > 0);
});

test('PNG: fixed pixels cannot shrink and warns; free pixels shrink', async () => {
  const img = fakeImage(2000, 2000, { originalBytes: 4_000_000, sourceFormat: 'png' });
  const locked = await fitImage(img, { format: 'png', width: 2000, height: 2000, maxKB: 100 });
  assert.equal(locked.status, 'over-limit');
  const free = await fitImage(img, { format: 'png', maxKB: 100 });
  assert.ok(free.bytes <= 100_000, `got ${free.bytes}`);
  assert.ok(free.scale < 1);
});

test('PNG minimum size is reached by padding a text chunk', async () => {
  const img = fakeImage(100, 100, { originalBytes: 90_000, sourceFormat: 'png' });
  const r = await fitImage(img, { format: 'png', width: 100, height: 100, maxKB: 50, minKB: 20 });
  assert.ok(r.bytes >= 20 * 1024 && r.bytes <= 50_000, `got ${r.bytes}`);
});

test('abort signal stops the search', async () => {
  const img = fakeImage(4000, 3000, { originalBytes: 5_000_000 });
  const ac = new AbortController();
  ac.abort();
  await assert.rejects(() => fitImage(img, { maxKB: 50, signal: ac.signal }), (e) => e.code === 'aborted');
});

test('search is bounded: a normal fit needs only a handful of encodes', async () => {
  const img = fakeImage(4000, 3000, { originalBytes: 5_000_000 });
  const r = await fitImage(img, { maxKB: 100 });
  assert.ok(r.encodes <= 25, `used ${r.encodes} encodes`);
});

test('loadImage rejects empty, GIF and oversized files before decoding', async () => {
  await assert.rejects(() => loadImage(new Blob([])), (e) => e.code === 'empty');
  const gif = new Blob([new TextEncoder().encode('GIF89a......')]);
  await assert.rejects(() => loadImage(gif), (e) => e.code === 'unsupported');
  // PNG header claiming 20000 x 20000 pixels (400 megapixels, over the 100 megapixel cap).
  const png = new Uint8Array(40);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(png.buffer).setUint32(16, 20000);
  new DataView(png.buffer).setUint32(20, 20000);
  await assert.rejects(() => loadImage(new Blob([png])), (e) => e.code === 'too-large');
});
