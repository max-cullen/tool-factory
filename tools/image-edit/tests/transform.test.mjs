import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotate90, rotate180, flipHorizontal, flipVertical, applyTransform, outputSize, rotateBy, flipBy, isIdentityTransform, normaliseRotation } from '../src/transform.mjs';

// A 3 x 2 image whose pixels are numbered 1..6 in the red channel, row by row:
//   1 2 3
//   4 5 6
const sample = () => {
  const d = new Uint8ClampedArray(3 * 2 * 4);
  for (let i = 0; i < 6; i++) d.set([i + 1, i * 10, 200 - i, 255], i * 4);
  return { data: d, width: 3, height: 2 };
};
const reds = (img) => Array.from({ length: img.width * img.height }, (_, i) => img.data[i * 4]);
const same = (a, b) => a.width === b.width && a.height === b.height && Array.from(a.data).join() === Array.from(b.data).join();

test('rotate clockwise: size swaps and pixels land where expected', () => {
  const r = rotate90(sample(), 1);
  assert.equal(r.width, 2); assert.equal(r.height, 3);
  assert.deepEqual(reds(r), [4, 1, 5, 2, 6, 3]);
});

test('rotate anticlockwise', () => {
  const r = rotate90(sample(), -1);
  assert.equal(r.width, 2); assert.equal(r.height, 3);
  assert.deepEqual(reds(r), [3, 6, 2, 5, 1, 4]);
});

test('whole pixels move together (all four channels)', () => {
  const r = rotate90(sample(), 1);
  assert.deepEqual(Array.from(r.data.slice(0, 4)), [4, 30, 197, 255]);
});

test('rotate 180', () => {
  assert.deepEqual(reds(rotate180(sample())), [6, 5, 4, 3, 2, 1]);
});

test('flips', () => {
  assert.deepEqual(reds(flipHorizontal(sample())), [3, 2, 1, 6, 5, 4]);
  assert.deepEqual(reds(flipVertical(sample())), [4, 5, 6, 1, 2, 3]);
});

test('rotating four times gives back the original, both directions', () => {
  const o = sample();
  let a = o, b = o;
  for (let i = 0; i < 4; i++) { a = rotate90(a, 1); b = rotate90(b, -1); }
  assert.ok(same(a, o)); assert.ok(same(b, o));
});

test('a right turn then a left turn is the identity; two right turns equal a half turn', () => {
  const o = sample();
  assert.ok(same(rotate90(rotate90(o, 1), -1), o));
  assert.ok(same(rotate90(rotate90(o, 1), 1), rotate180(o)));
});

test('flipping twice gives back the original', () => {
  const o = sample();
  assert.ok(same(flipHorizontal(flipHorizontal(o)), o));
  assert.ok(same(flipVertical(flipVertical(o)), o));
});

test('flip horizontal plus flip vertical equals a half turn', () => {
  const o = sample();
  assert.ok(same(flipVertical(flipHorizontal(o)), rotate180(o)));
});

test('applyTransform with nothing to do returns the same object', () => {
  const o = sample();
  assert.equal(applyTransform(o, { rotation: 0, flipH: false, flipV: false }), o);
  assert.equal(applyTransform(o, { rotation: 360 }), o);
});

test('applyTransform: rotate first, then flip', () => {
  const o = sample();
  assert.ok(same(applyTransform(o, { rotation: 90, flipH: true }), flipHorizontal(rotate90(o, 1))));
  assert.ok(same(applyTransform(o, { rotation: 270 }), rotate90(o, -1)));
  assert.ok(same(applyTransform(o, { rotation: 180, flipV: true }), flipVertical(rotate180(o))));
});

test('outputSize swaps for quarter turns only', () => {
  assert.deepEqual(outputSize(300, 200, 0), { width: 300, height: 200 });
  assert.deepEqual(outputSize(300, 200, 90), { width: 200, height: 300 });
  assert.deepEqual(outputSize(300, 200, 180), { width: 300, height: 200 });
  assert.deepEqual(outputSize(300, 200, 270), { width: 200, height: 300 });
  assert.deepEqual(outputSize(300, 200, -90), { width: 200, height: 300 });
});

test('normaliseRotation wraps into 0..270', () => {
  assert.equal(normaliseRotation(-90), 270);
  assert.equal(normaliseRotation(450), 90);
  assert.equal(normaliseRotation(0), 0);
});

test('button logic: four right turns return to the start state', () => {
  let t = { rotation: 0, flipH: false, flipV: false };
  for (let i = 0; i < 4; i++) t = rotateBy(t, 90);
  assert.ok(isIdentityTransform(t));
  t = rotateBy(rotateBy(t, 90), -90);
  assert.ok(isIdentityTransform(t));
});

test('button logic: turning a flipped picture still turns what is on screen', () => {
  const o = sample();
  const view = (t) => applyTransform(o, t);
  // On-screen picture after a flip, then turned right by the button, must equal that picture turned right.
  let t = flipBy({ rotation: 0, flipH: false, flipV: false }, 'h');
  const before = view(t);
  t = rotateBy(t, 90);
  assert.ok(same(view(t), rotate90(before, 1)));
  const before2 = view(t);
  t = rotateBy(t, -90);
  assert.ok(same(view(t), rotate90(before2, -1)));
  // Flip pressed after a turn mirrors the picture on screen.
  t = rotateBy({ rotation: 0, flipH: false, flipV: false }, 90);
  const before3 = view(t);
  assert.ok(same(view(flipBy(t, 'v')), flipVertical(before3)));
  assert.ok(same(view(flipBy(t, 'h')), flipHorizontal(before3)));
});
