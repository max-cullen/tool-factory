import test from 'node:test';
import assert from 'node:assert/strict';
import { mmToPx, mmToPxExact, pxToMm, mmToPt, ptToMm, cardPixels, screenPixels, sheetMm, CARD } from '../src/units.mjs';

test('card is 90 x 55 mm', () => assert.deepEqual(CARD, { width: 90, height: 55 }));
test('300 dpi print size is 1063 x 650 px', () => assert.deepEqual(cardPixels(300), { width: 1063, height: 650 }));
test('with 3 mm bleed the print size is 96 x 61 mm = 1134 x 720 px', () => {
  assert.deepEqual(sheetMm(3), { width: 96, height: 61 });
  assert.deepEqual(cardPixels(300, 3), { width: 1134, height: 720 });
});
test('mm to px and back', () => {
  assert.equal(mmToPx(25.4, 300), 300);
  assert.equal(mmToPx(25.4, 96), 96);
  assert.ok(Math.abs(pxToMm(mmToPxExact(37.5, 300), 300) - 37.5) < 1e-9);
});
test('mm to points: 25.4 mm is 72 pt, card is 255.118 x 155.906 pt', () => {
  assert.equal(mmToPt(25.4), 72);
  assert.equal(mmToPt(90).toFixed(3), '255.118');
  assert.equal(mmToPt(55).toFixed(3), '155.906');
  assert.ok(Math.abs(ptToMm(mmToPt(12.3)) - 12.3) < 1e-9);
});
test('screen size keeps the card proportions', () => {
  const s = screenPixels(0);
  assert.deepEqual(s, { width: 900, height: 550 });
  assert.deepEqual(screenPixels(3, 960), { width: 960, height: 610 });
});
