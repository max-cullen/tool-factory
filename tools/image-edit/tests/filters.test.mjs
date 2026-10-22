import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brightness, contrast, greyscale, sepia, blur, flattenOnWhite, clamp8, contrastFactor } from '../src/filters.mjs';

const px = (...v) => Uint8ClampedArray.from(v);
const arr = (d) => Array.from(d);

test('brightness adds amount * 2.55 to each colour and leaves alpha', () => {
  assert.deepEqual(arr(brightness(px(200, 100, 50, 255), 20)), [251, 151, 101, 255]);
  assert.deepEqual(arr(brightness(px(200, 100, 50, 77), -20)), [149, 49, 0, 77]);
});

test('brightness clamps to 0 and 255', () => {
  assert.deepEqual(arr(brightness(px(10, 128, 250, 255), 100)), [255, 255, 255, 255]);
  assert.deepEqual(arr(brightness(px(10, 128, 250, 255), -100)), [0, 0, 0, 255]);
});

test('clamp8 rounds and clamps', () => {
  assert.equal(clamp8(-3), 0);
  assert.equal(clamp8(300), 255);
  assert.equal(clamp8(10.5), 11);
  assert.equal(clamp8(10.4), 10);
});

test('results do not depend on the array type (clamped, wrapping or plain)', () => {
  const src = [200, 100, 50, 255, 3, 250, 128, 90];
  for (const make of [(a) => Uint8ClampedArray.from(a), (a) => Uint8Array.from(a), (a) => a.slice()]) {
    const d = make(src);
    brightness(d, 30); contrast(d, 40); greyscale(d, 50); sepia(d, 60);
    const ref = Uint8ClampedArray.from(src);
    brightness(ref, 30); contrast(ref, 40); greyscale(ref, 50); sepia(ref, 60);
    assert.deepEqual(arr(d), arr(ref));
  }
});

test('contrast +50 pushes values away from mid grey, 128 stays put', () => {
  assert.ok(Math.abs(contrastFactor(50) - 2.9544) < 0.001);
  assert.deepEqual(arr(contrast(px(100, 128, 200, 255), 50)), [45, 128, 255, 255]);
});

test('contrast -100 flattens everything to mid grey; -50 pulls toward it', () => {
  assert.deepEqual(arr(contrast(px(0, 255, 40, 255), -100)), [128, 128, 128, 255]);
  const lo = contrast(px(0, 255, 128, 255), -50);
  assert.ok(lo[0] > 0 && lo[1] < 255 && lo[2] === 128);
});

test('greyscale 100 gives equal channels from Rec. 709 luminance', () => {
  assert.deepEqual(arr(greyscale(px(200, 100, 50, 255), 100)), [118, 118, 118, 255]);
  assert.deepEqual(arr(greyscale(px(255, 0, 0, 255), 100)), [54, 54, 54, 255]);
  assert.deepEqual(arr(greyscale(px(0, 255, 0, 255), 100)), [182, 182, 182, 255]);
});

test('greyscale 50 sits halfway between the colour and its grey', () => {
  assert.deepEqual(arr(greyscale(px(200, 100, 50, 255), 50)), [159, 109, 84, 255]);
});

test('sepia 100 uses the sepia matrix and clamps', () => {
  assert.deepEqual(arr(sepia(px(200, 100, 50, 255), 100)), [165, 147, 114, 255]);
  assert.deepEqual(arr(sepia(px(255, 255, 255, 255), 100)), [255, 255, 239, 255]);
  assert.deepEqual(arr(sepia(px(0, 0, 0, 255), 100)), [0, 0, 0, 255]);
});

test('sepia 50 is halfway to full sepia', () => {
  assert.deepEqual(arr(sepia(px(200, 100, 50, 255), 50)), [183, 124, 82, 255]);
});

test('neutral settings are the identity', () => {
  const src = [12, 200, 77, 255, 0, 255, 128, 10];
  const d = Uint8ClampedArray.from(src);
  brightness(d, 0); contrast(d, 0); greyscale(d, 0); sepia(d, 0);
  assert.deepEqual(arr(d), src);
  const img = { data: Uint8ClampedArray.from(src), width: 2, height: 1 };
  blur(img, 0);
  assert.deepEqual(arr(img.data), src);
});

const flat = (w, h, r, g, b, a = 255) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) d.set([r, g, b, a], i * 4);
  return { data: d, width: w, height: h };
};

test('blur leaves a flat area exactly flat, edges included', () => {
  const img = flat(17, 11, 90, 140, 200);
  blur(img, 3);
  for (let i = 0; i < img.data.length; i += 4) assert.deepEqual([img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]], [90, 140, 200, 255]);
});

test('blur keeps total brightness approximately and spreads a bright block', () => {
  const w = 41, h = 41;
  const img = flat(w, h, 0, 0, 0);
  for (let y = 18; y < 23; y++) for (let x = 18; x < 23; x++) img.data.set([255, 255, 255, 255], (y * w + x) * 4);
  const sum = (d) => { let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s; };
  const before = sum(img.data);
  blur(img, 3);
  const after = sum(img.data);
  assert.ok(Math.abs(after - before) / before < 0.02, `before ${before} after ${after}`);
  const centre = img.data[(20 * w + 20) * 4];
  assert.ok(centre < 255 && centre > 0);
  assert.ok(img.data[(20 * w + 26) * 4] > 0, 'brightness reached outside the block');
});

test('blur averages a two-tone row symmetrically', () => {
  const img = { data: Uint8ClampedArray.from([0,0,0,255, 0,0,0,255, 255,255,255,255, 0,0,0,255, 0,0,0,255]), width: 5, height: 1 };
  blur(img, 1, 1);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => img.data[i * 4]), [0, 85, 85, 85, 0]);
});

test('blur does not bleed black from transparent pixels', () => {
  const img = flat(9, 9, 200, 50, 50);
  for (let i = 0; i < 9 * 9; i++) if (i % 9 > 5) img.data[i * 4 + 3] = 0;
  blur(img, 2);
  for (let i = 0; i < 9 * 9; i++) if (img.data[i * 4 + 3] > 0) assert.deepEqual([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]], [200, 50, 50]);
});

test('flattenOnWhite puts transparent pixels on white and leaves opaque ones', () => {
  assert.deepEqual(arr(flattenOnWhite(px(10, 20, 30, 255, 0, 0, 0, 0, 100, 100, 100, 128))), [10, 20, 30, 255, 255, 255, 255, 255, 177, 177, 177, 255]);
});
