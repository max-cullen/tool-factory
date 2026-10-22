import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render, adjust, normalise, DEFAULTS, ADJUST_ORDER, isNeutral, blurRadius, checkSize, previewSize, exportSpec, exportName, prepareForExport, MAX_PIXELS } from '../src/pipeline.mjs';
import { brightness, contrast, greyscale, sepia, blur } from '../src/filters.mjs';
import { rotate90, flipHorizontal } from '../src/transform.mjs';
import { sniffSize } from '../src/sniff.mjs';

const gradient = (w, h) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([60 + Math.round((x / w) * 120), 70 + Math.round((y / h) * 100), 100 + Math.round(((x + y) / (w + h)) * 60), 255], (y * w + x) * 4);
  return { data: d, width: w, height: h };
};
const eq = (a, b) => a.width === b.width && a.height === b.height && Array.from(a.data).join() === Array.from(b.data).join();

test('neutral settings leave the pixels untouched (and copy them)', () => {
  const o = gradient(8, 6);
  const out = render(o, DEFAULTS);
  assert.ok(eq(out, o));
  assert.ok(isNeutral(DEFAULTS));
  const withAdj = render(o, { brightness: 10 });
  assert.notEqual(withAdj.data, o.data);
  assert.ok(eq(o, gradient(8, 6)), 'input not modified');
});

test('adjustments run in the documented order: brightness, contrast, greyscale, sepia, blur', () => {
  assert.deepEqual(ADJUST_ORDER, ['brightness', 'contrast', 'greyscale', 'sepia', 'blur']);
  const o = gradient(30, 20);
  const s = { brightness: 30, contrast: 40, greyscale: 25, sepia: 60, blur: 5 };
  const manual = { data: o.data.slice(), width: 30, height: 20 };
  brightness(manual.data, 30); contrast(manual.data, 40); greyscale(manual.data, 25); sepia(manual.data, 60); blur(manual, blurRadius(5, 30, 20));
  assert.ok(eq(render(o, s), manual));
});

test('order matters: brightness before contrast differs from the reverse', () => {
  const a = Uint8ClampedArray.from([100, 150, 200, 255]);
  const b = a.slice();
  brightness(a, 40); contrast(a, 60);
  contrast(b, 60); brightness(b, 40);
  assert.notDeepEqual(Array.from(a), Array.from(b));
  assert.deepEqual(Array.from(render({ data: Uint8ClampedArray.from([100, 150, 200, 255]), width: 1, height: 1 }, { brightness: 40, contrast: 60 }).data), Array.from(a));
});

test('geometry runs before adjustments, and rotation swaps the output size', () => {
  const o = gradient(10, 6);
  const out = render(o, { rotation: 90, brightness: 20 });
  assert.equal(out.width, 6); assert.equal(out.height, 10);
  const expect = rotate90(o, 1);
  brightness(expect.data, 20);
  assert.ok(eq(out, expect));
  const both = render(o, { rotation: 90, flipH: true });
  assert.ok(eq(both, flipHorizontal(rotate90(o, 1))));
});

test('geometry is lossless: rotate four times and flip twice through render give the original', () => {
  const o = gradient(13, 7);
  let cur = o;
  for (let i = 0; i < 4; i++) cur = render(cur, { rotation: 90 });
  assert.ok(eq(cur, o));
  assert.ok(eq(render(render(o, { flipH: true }), { flipH: true }), o));
  assert.ok(eq(render(render(o, { flipV: true }), { flipV: true }), o));
});

test('preview and export give the same pixels from the same input', () => {
  const o = gradient(24, 18);
  const s = { rotation: 270, flipV: true, brightness: -15, contrast: 20, greyscale: 30, sepia: 40, blur: 80 };
  const preview = render(o, s);
  const exported = render({ data: o.data.slice(), width: 24, height: 18 }, s, { inPlace: true });
  assert.ok(eq(preview, exported));
});

test('a half-size preview matches the full-size export closely', () => {
  const w = 400, h = 300;
  const full = gradient(w, h);
  // Half-size copy made by averaging 2 x 2 blocks.
  const half = { data: new Uint8ClampedArray((w / 2) * (h / 2) * 4), width: w / 2, height: h / 2 };
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w / 2; x++) for (let c = 0; c < 4; c++) {
    let t = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) t += full.data[((2 * y + dy) * w + 2 * x + dx) * 4 + c];
    half.data[(y * (w / 2) + x) * 4 + c] = Math.round(t / 4);
  }
  const s = { rotation: 90, brightness: 10, contrast: 25, sepia: 30, blur: 10 };
  const a = render(full, s), b = render(half, s);
  assert.equal(a.width, b.width * 2); assert.equal(a.height, b.height * 2);
  let diff = 0, n = 0;
  for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) for (let c = 0; c < 3; c++) {
    let t = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) t += a.data[((2 * y + dy) * a.width + 2 * x + dx) * 4 + c];
    diff += Math.abs(t / 4 - b.data[(y * b.width + x) * 4 + c]); n++;
  }
  assert.ok(diff / n < 3, `mean difference ${diff / n}`);
});

test('blur radius scales with picture size', () => {
  assert.equal(blurRadius(0, 4000, 3000), 0);
  assert.equal(blurRadius(10, 1000, 800), 10);
  assert.equal(blurRadius(10, 4000, 3000), 40);
  assert.equal(blurRadius(20, 100, 50), 2);
});

test('normalise clamps to the slider ranges and rejects junk', () => {
  const n = normalise({ brightness: 500, contrast: -500, greyscale: 'x', sepia: 101, blur: -4, rotation: 450, flipH: 1 });
  assert.equal(n.brightness, 100); assert.equal(n.contrast, -100); assert.equal(n.greyscale, 0);
  assert.equal(n.sepia, 100); assert.equal(n.blur, 0); assert.equal(n.rotation, 90); assert.equal(n.flipH, true);
});

test('adjust clamps output to 0..255 at extremes', () => {
  const img = { data: Uint8ClampedArray.from([250, 5, 128, 255, 0, 255, 60, 255]), width: 2, height: 1 };
  adjust(img, { brightness: 100, contrast: 100, sepia: 100 });
  for (const v of img.data) assert.ok(v >= 0 && v <= 255 && Number.isInteger(v));
});

test('size limit: 100 megapixels', () => {
  assert.equal(MAX_PIXELS, 100_000_000);
  assert.equal(checkSize(10000, 10000), null);
  assert.match(checkSize(10001, 10000), /100 megapixels/);
  assert.match(checkSize(0, 10), /no size/);
});

test('previewSize scales down only', () => {
  assert.deepEqual(previewSize(8000, 4000, 1000), { width: 1000, height: 500, scale: 0.125 });
  assert.deepEqual(previewSize(500, 400, 1000), { width: 500, height: 400, scale: 1 });
});

test('export spec: quality only for lossy formats', () => {
  assert.deepEqual(exportSpec('png', 50), { mime: 'image/png', ext: 'png', quality: undefined, lossy: false });
  assert.equal(exportSpec('jpeg', 80).quality, 0.8);
  assert.equal(exportSpec('webp', 0).quality, 0.9);
  assert.equal(exportSpec('webp', 500).quality, 1);
  assert.equal(exportSpec('jpeg').mime, 'image/jpeg');
  assert.equal(exportName('holiday.photo.HEIC', 'jpeg'), 'holiday.photo-edited.jpg');
  assert.equal(exportName('', 'png'), 'image-edited.png');
});

test('JPEG export flattens transparency onto white; PNG keeps it', () => {
  const mk = () => ({ data: Uint8ClampedArray.from([0, 0, 0, 0]), width: 1, height: 1 });
  assert.deepEqual(Array.from(prepareForExport(mk(), 'jpeg').data), [255, 255, 255, 255]);
  assert.deepEqual(Array.from(prepareForExport(mk(), 'png').data), [0, 0, 0, 0]);
});

test('sniffSize reads PNG, JPEG and WebP headers', () => {
  const png = new Uint8Array(33); png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); png.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8); png.set([0, 0, 0x27, 0x10, 0, 0, 0x27, 0x10], 16);
  assert.deepEqual(sniffSize(png), { width: 10000, height: 10000 });
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x0b, 0xb8, 0x0f, 0xa0, 3, 0, 0]);
  assert.deepEqual(sniffSize(jpg), { width: 4000, height: 3000 });
  const vp8x = new Uint8Array(40); vp8x.set([...'RIFF'].map((c) => c.charCodeAt(0))); vp8x.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8); vp8x.set([0x9f, 0x0f, 0], 24); vp8x.set([0xb7, 0x0b, 0], 27);
  assert.deepEqual(sniffSize(vp8x), { width: 4000, height: 3000 });
  assert.equal(sniffSize(Uint8Array.from([1, 2, 3, 4])), null);
});

test('every browser file is listed in site.mjs copy', async () => {
  const site = (await import('../site.mjs')).default;
  const listed = site.copy.map(([from]) => from).sort();
  assert.deepEqual(listed, ['src/filters.mjs', 'src/pipeline.mjs', 'src/sniff.mjs', 'src/tool.js', 'src/transform.mjs']);
  readFileSync(new URL('../src/tool.js', import.meta.url));
});
