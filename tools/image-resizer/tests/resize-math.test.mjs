import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roundDim, heightForWidth, widthForHeight, percentToSize, parsePixels, parsePercent, targetSize, placement,
  stepDownPlan, checkSource, checkOutput, validateLimits, stemOf, outputName, uniqueName, formatBytes,
  normaliseHex, clampQuality, describeChange, PRESETS, MAX_OUTPUT_SIDE,
} from '../src/resize-math.mjs';

test('locked ratio: width drives height, odd sizes round to whole pixels', () => {
  assert.equal(heightForWidth(100, 333, 221), 66); // 66.37
  assert.equal(heightForWidth(1000, 4000, 3001), 750); // 750.25
  assert.equal(heightForWidth(3, 1000, 1), 1); // never below 1
  assert.equal(heightForWidth(1080, 1920, 1080), 608); // 607.5 rounds up
});

test('locked ratio: height drives width, odd sizes round to whole pixels', () => {
  assert.equal(widthForHeight(100, 333, 221), 151); // 150.68
  assert.equal(widthForHeight(500, 3001, 4000), 375); // 375.125
  assert.equal(widthForHeight(2, 1, 1000), 1);
});

test('percent rounds each side and keeps a minimum of 1px', () => {
  assert.deepEqual(percentToSize(333, 221, 50), { width: 167, height: 111 });
  assert.deepEqual(percentToSize(10, 10, 1), { width: 1, height: 1 });
  assert.deepEqual(percentToSize(1000, 500, 200), { width: 2000, height: 1000 });
  assert.deepEqual(percentToSize(1, 1, 50), { width: 1, height: 1 });
  assert.equal(roundDim(0.2), 1);
  assert.ok(Number.isNaN(roundDim(NaN)));
});

test('typed values are parsed safely', () => {
  assert.equal(parsePixels(' 1080 '), 1080);
  assert.equal(parsePixels('99.6'), 100);
  assert.equal(parsePixels('0'), NaN);
  assert.ok(Number.isNaN(parsePixels('')));
  assert.ok(Number.isNaN(parsePixels('abc')));
  assert.ok(Number.isNaN(parsePixels('-5')));
  assert.equal(parsePercent('33,3%'), 33.3);
  assert.ok(Number.isNaN(parsePercent('0.5')));
  assert.ok(Number.isNaN(parsePercent('1001')));
});

test('targetSize: pixels with lock, in both directions, and without lock', () => {
  const base = { mode: 'pixels', width: 100, height: 100, percent: NaN, lock: true, driver: 'width' };
  assert.deepEqual(targetSize(333, 221, base), { width: 100, height: 66 });
  assert.deepEqual(targetSize(333, 221, { ...base, driver: 'height' }), { width: 151, height: 100 });
  assert.deepEqual(targetSize(333, 221, { ...base, lock: false, width: 200, height: 50 }), { width: 200, height: 50 });
  assert.equal(targetSize(333, 221, { ...base, lock: false, height: NaN }), null);
  assert.equal(targetSize(333, 221, { ...base, width: NaN }), null);
  assert.deepEqual(targetSize(333, 221, { ...base, mode: 'percent', percent: 50 }), { width: 167, height: 111 });
  assert.equal(targetSize(333, 221, { ...base, mode: 'percent', percent: NaN }), null);
  assert.equal(targetSize(0, 10, base), null);
});

test('placement: stretch uses the whole source and the whole output', () => {
  assert.deepEqual(placement(400, 300, 100, 100, 'stretch'), { sx: 0, sy: 0, sw: 400, sh: 300, dx: 0, dy: 0, dw: 100, dh: 100 });
});

test('placement: fit centres the whole picture with background left over', () => {
  assert.deepEqual(placement(400, 200, 100, 100, 'fit'), { sx: 0, sy: 0, sw: 400, sh: 200, dx: 0, dy: 25, dw: 100, dh: 50 });
  assert.deepEqual(placement(200, 400, 100, 100, 'fit'), { sx: 0, sy: 0, sw: 200, sh: 400, dx: 25, dy: 0, dw: 50, dh: 100 });
  const p = placement(300, 100, 101, 100, 'fit'); // odd leftover
  assert.ok(p.dx >= 0 && p.dx + p.dw <= 101 && p.dy >= 0 && p.dy + p.dh <= 100);
});

test('placement: fill covers the output and crops around the centre', () => {
  assert.deepEqual(placement(400, 200, 100, 100, 'fill'), { sx: 100, sy: 0, sw: 200, sh: 200, dx: 0, dy: 0, dw: 100, dh: 100 });
  assert.deepEqual(placement(200, 400, 100, 100, 'fill'), { sx: 0, sy: 100, sw: 200, sh: 200, dx: 0, dy: 0, dw: 100, dh: 100 });
  const p = placement(100, 100, 200, 100, 'fill'); // enlarging: crop stays inside the source
  assert.ok(p.sx >= 0 && p.sy >= 0 && p.sx + p.sw <= 100.0001 && p.sy + p.sh <= 100.0001);
  assert.equal(p.sw / p.sh, 2);
});

test('stepDownPlan halves large reductions and ends at the target', () => {
  assert.deepEqual(stepDownPlan(4000, 3000, 1000, 750), [{ width: 2000, height: 1500 }, { width: 1000, height: 750 }]);
  assert.deepEqual(stepDownPlan(4000, 3000, 3000, 2000), [{ width: 3000, height: 2000 }]);
  assert.deepEqual(stepDownPlan(100, 100, 400, 400), [{ width: 400, height: 400 }]);
  const plan = stepDownPlan(10001, 5001, 7, 3);
  let w = 10001, h = 5001;
  for (const s of plan) { assert.ok(s.width >= Math.ceil(w / 2) || s.width === 7); assert.ok(s.height >= Math.ceil(h / 2) || s.height === 3); w = s.width; h = s.height; }
  assert.deepEqual(plan.at(-1), { width: 7, height: 3 });
  assert.deepEqual(stepDownPlan(500, 500, 500, 500), [{ width: 500, height: 500 }]);
  assert.deepEqual(stepDownPlan(800, 100, 100, 100), [{ width: 400, height: 100 }, { width: 200, height: 100 }, { width: 100, height: 100 }]);
});

test('limits: source above 100 megapixels is refused', () => {
  assert.equal(checkSource(10000, 10000), null); // exactly 100 MP
  assert.match(checkSource(10001, 10000), /100 megapixels/);
  assert.match(checkSource(0, 5), /no readable size/);
});

test('limits: output side and total pixels', () => {
  assert.equal(checkOutput(MAX_OUTPUT_SIDE, 6000), null);
  assert.match(checkOutput(MAX_OUTPUT_SIDE + 1, 10), /16,384/);
  assert.match(checkOutput(10, 20000), /16,384/);
  assert.match(checkOutput(12000, 12000), /100 megapixels/);
  assert.match(checkOutput(0, 10), /at least 1/);
  assert.equal(validateLimits(4000, 3000, 2000, 1500), null);
  assert.match(validateLimits(20000, 20000, 100, 100), /megapixels/);
  assert.match(validateLimits(100, 100, 20000, 10), /16,384/);
});

test('naming', () => {
  assert.equal(outputName('Holiday photo.JPEG', 1080, 810, 'jpeg'), 'Holiday-photo-1080x810.jpg');
  assert.equal(outputName('a.b.png', 10, 5, 'webp'), 'a.b-10x5.webp');
  assert.equal(outputName('C:\\pics\\x.png', 1, 1, 'png'), 'x-1x1.png');
  assert.equal(outputName('', 5, 5, 'png'), 'image-5x5.png');
  assert.equal(stemOf('../../evil/na<>me.gif'), 'name');
  const used = new Set();
  assert.equal(uniqueName('a-1x1.png', used), 'a-1x1.png');
  assert.equal(uniqueName('a-1x1.png', used), 'a-1x1-2.png');
  assert.equal(uniqueName('a-1x1.png', used), 'a-1x1-3.png');
});

test('small helpers', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.00 MB');
  assert.equal(normaliseHex('FFF'), '#ffffff');
  assert.equal(normaliseHex('#A1b2C3'), '#a1b2c3');
  assert.equal(normaliseHex('#12'), null);
  assert.equal(clampQuality(150), 100);
  assert.equal(clampQuality(0), 1);
  assert.equal(clampQuality(NaN), 90);
  assert.equal(describeChange(1000, 250), '75% smaller');
  assert.equal(describeChange(1000, 1500), '50% larger');
  assert.equal(describeChange(1000, 1000), 'about the same size');
});

test('presets are plain pixel sizes within the limits', () => {
  for (const p of PRESETS) {
    assert.ok(Number.isInteger(p.w) && Number.isInteger(p.h));
    assert.equal(checkOutput(p.w, p.h), null);
    assert.doesNotMatch(p.label, /instagram|facebook|twitter|tiktok|youtube|linkedin|pinterest/i);
  }
  assert.ok(PRESETS.some((p) => p.w === 413 && p.h === 531));
});
