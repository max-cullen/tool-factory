import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HANDLES, RATIOS, MAX_PIXELS, clamp, ratioValue, fitScale, toSource, toDisplay, checkImageSize, initialRect, moveRect,
  resizeRect, applyRatio, swapRect, roundRect, nudgeStep, nudgeRect, rectToDisplay, rectToSource, exportName, ratioLabel,
} from '../src/crop-math.mjs';

const B = { w: 1000, h: 800 };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const inside = (r, b = B) => {
  assert.ok(r.x >= -1e-9 && r.y >= -1e-9, 'origin inside');
  assert.ok(r.x + r.w <= b.w + 1e-9 && r.y + r.h <= b.h + 1e-9, 'far edge inside');
};

test('clamp', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
});

test('ratioValue: presets, portrait and free', () => {
  near(ratioValue('4:3'), 4 / 3);
  near(ratioValue('4:3', 'portrait'), 3 / 4);
  near(ratioValue('16:9', 'portrait'), 9 / 16);
  assert.equal(ratioValue('1:1', 'portrait'), 1);
  assert.equal(ratioValue('free'), null);
});

test('display to source mapping and back', () => {
  const s = fitScale(4000, 3000, 800, 600);
  near(s, 0.2);
  near(toSource(100, s), 500);
  near(toDisplay(500, s), 100);
  const r = { x: 400, y: 300, w: 2000, h: 1500 };
  assert.deepEqual(rectToSource(rectToDisplay(r, s), s), r);
  assert.equal(fitScale(100, 100, 800, 600), 4); // small images are enlarged on screen, up to 4x
  assert.equal(fitScale(0, 0, 10, 10), 1);
});

test('fitScale is limited by the tighter of width and height', () => {
  near(fitScale(4000, 1000, 800, 600), 0.2);
  near(fitScale(1000, 4000, 800, 600), 0.15);
});

test('image size check: 100 megapixel limit', () => {
  assert.equal(checkImageSize(10000, 10000).ok, true);
  assert.equal(MAX_PIXELS, 100_000_000);
  assert.deepEqual(checkImageSize(10001, 10000), { ok: false, reason: 'too-large' });
  assert.equal(checkImageSize(0, 10).ok, false);
});

test('initialRect is centred and honours the ratio', () => {
  const free = initialRect(B, null);
  near(free.w, 900); near(free.h, 720); near(free.x, 50); near(free.y, 40);
  const sq = initialRect(B, 1);
  near(sq.w, sq.h); inside(sq); near(sq.x + sq.w / 2, 500);
  const wide = initialRect(B, 16 / 9);
  near(wide.w / wide.h, 16 / 9); inside(wide);
});

test('moveRect clamps to the image on every side', () => {
  const r = { x: 100, y: 100, w: 300, h: 200 };
  assert.deepEqual(moveRect(r, 50, 20, B), { x: 150, y: 120, w: 300, h: 200 });
  assert.deepEqual(moveRect(r, -500, -500, B), { x: 0, y: 0, w: 300, h: 200 });
  assert.deepEqual(moveRect(r, 5000, 5000, B), { x: 700, y: 600, w: 300, h: 200 });
});

test('free resize from every handle moves only the expected edges', () => {
  const r = { x: 200, y: 200, w: 400, h: 300 };
  assert.deepEqual(resizeRect(r, 'e', 50, 99, B), { x: 200, y: 200, w: 450, h: 300 });
  assert.deepEqual(resizeRect(r, 'w', 50, 99, B), { x: 250, y: 200, w: 350, h: 300 });
  assert.deepEqual(resizeRect(r, 's', 99, 50, B), { x: 200, y: 200, w: 400, h: 350 });
  assert.deepEqual(resizeRect(r, 'n', 99, 50, B), { x: 200, y: 250, w: 400, h: 250 });
  assert.deepEqual(resizeRect(r, 'se', 10, 20, B), { x: 200, y: 200, w: 410, h: 320 });
  assert.deepEqual(resizeRect(r, 'nw', 10, 20, B), { x: 210, y: 220, w: 390, h: 280 });
  assert.deepEqual(resizeRect(r, 'ne', 10, 20, B), { x: 200, y: 220, w: 410, h: 280 });
  assert.deepEqual(resizeRect(r, 'sw', 10, 20, B), { x: 210, y: 200, w: 390, h: 320 });
});

test('free resize clamps to the image bounds', () => {
  const r = { x: 200, y: 200, w: 400, h: 300 };
  assert.deepEqual(resizeRect(r, 'se', 9999, 9999, B), { x: 200, y: 200, w: 800, h: 600 });
  assert.deepEqual(resizeRect(r, 'nw', -9999, -9999, B), { x: 0, y: 0, w: 600, h: 500 });
});

test('free resize keeps the minimum size and does not flip past the opposite edge', () => {
  const r = { x: 200, y: 200, w: 400, h: 300 };
  const a = resizeRect(r, 'e', -9999, 0, B, { min: 20 });
  assert.deepEqual(a, { x: 200, y: 200, w: 20, h: 300 });
  const b = resizeRect(r, 'w', 9999, 0, B, { min: 20 });
  assert.deepEqual(b, { x: 580, y: 200, w: 20, h: 300 });
  const c = resizeRect(r, 'nw', 9999, 9999, B);
  assert.equal(c.w, 16); assert.equal(c.h, 16);
  assert.equal(c.x + c.w, 600); assert.equal(c.y + c.h, 500);
});

for (const [name, ratio] of [['1:1', 1], ['4:3', 4 / 3], ['16:9', 16 / 9], ['3:4', 3 / 4], ['9:16', 9 / 16]]) {
  test(`ratio ${name} stays locked from every handle, inside the image, above the minimum`, () => {
    const start = applyRatio({ x: 300, y: 250, w: 400, h: 300 }, ratio, B);
    for (const handle of HANDLES) {
      for (const [dx, dy] of [[40, 30], [-40, -30], [120, -80], [-200, 200], [5000, 5000], [-5000, -5000], [5000, -5000], [-5000, 5000], [0, 0], [1, 0], [0, 1]]) {
        const out = resizeRect(start, handle, dx, dy, B, { ratio });
        near(out.w / out.h, ratio, 1e-9);
        inside(out);
        assert.ok(out.w >= 16 - 1e-9 && out.h >= 16 - 1e-9, `min ${handle} ${dx},${dy}: ${out.w}x${out.h}`);
      }
    }
  });
}

test('ratio resize keeps the opposite corner or edge fixed', () => {
  const r = { x: 200, y: 200, w: 400, h: 300 }; // 4:3
  const ratio = 4 / 3;
  const se = resizeRect(r, 'se', 80, 0, B, { ratio });
  near(se.x, 200); near(se.y, 200); near(se.w, 480); near(se.h, 360);
  const nw = resizeRect(r, 'nw', -40, -30, B, { ratio });
  near(nw.x + nw.w, 600); near(nw.y + nh(nw), 500);
  const ne = resizeRect(r, 'ne', 40, 0, B, { ratio });
  near(ne.x, 200); near(ne.y + ne.h, 500);
  const sw = resizeRect(r, 'sw', -40, 0, B, { ratio });
  near(sw.x + sw.w, 600); near(sw.y, 200);
  // edge handles stay centred on the other axis
  const e = resizeRect(r, 'e', 80, 0, B, { ratio });
  near(e.x, 200); near(e.y + e.h / 2, 350); near(e.w, 480);
  const n = resizeRect(r, 'n', 0, -30, B, { ratio });
  near(n.y + n.h, 500); near(n.x + n.w / 2, 400); near(n.h, 330);
  function nh(q) { return q.h; }
});

test('ratio resize against the image edge shrinks the other side rather than overflowing', () => {
  const r = { x: 600, y: 100, w: 400, h: 300 };
  const out = resizeRect(r, 'e', 500, 0, B, { ratio: 4 / 3 });
  assert.ok(out.x + out.w <= 1000 + 1e-9);
  near(out.w / out.h, 4 / 3);
  // edge handle near a corner: height is limited by the shorter distance to top/bottom
  const t = { x: 100, y: 0, w: 400, h: 300 };
  const e = resizeRect(t, 'e', 500, 0, B, { ratio: 4 / 3 });
  inside(e); near(e.w / e.h, 4 / 3);
  assert.ok(e.w <= 400 + 1e-9, 'cannot grow when the box already touches the top');
});

test('minimum size applies to both edges for tall and wide ratios', () => {
  const wide = resizeRect({ x: 100, y: 100, w: 320, h: 180 }, 'se', -9999, -9999, B, { ratio: 16 / 9, min: 20 });
  near(wide.h, 20); near(wide.w, 20 * 16 / 9);
  const tall = resizeRect({ x: 100, y: 100, w: 180, h: 320 }, 'se', -9999, -9999, B, { ratio: 9 / 16, min: 20 });
  near(tall.w, 20); near(tall.h, 20 * 16 / 9);
});

test('image smaller than the minimum size still yields a valid box', () => {
  const tiny = { w: 10, h: 8 };
  const out = resizeRect({ x: 0, y: 0, w: 10, h: 8 }, 'se', -50, -50, tiny);
  assert.ok(out.w >= 1 && out.h >= 1);
  inside(out, tiny);
});

test('applyRatio reshapes without growing and stays inside', () => {
  const full = { x: 0, y: 0, w: 1000, h: 800 };
  const sq = applyRatio(full, 1, B);
  near(sq.w, 800); near(sq.h, 800); near(sq.x, 100); near(sq.y, 0);
  const wide = applyRatio(full, 16 / 9, B);
  near(wide.w, 1000); near(wide.h, 562.5); near(wide.y + wide.h / 2, 400);
  assert.deepEqual(applyRatio(full, null, B), full);
  const corner = applyRatio({ x: 0, y: 0, w: 300, h: 200 }, 1, B);
  inside(corner); near(corner.w, corner.h);
});

test('orientation swap: ratio inverted and free box swapped', () => {
  const landscape = applyRatio({ x: 100, y: 100, w: 600, h: 400 }, ratioValue('3:2'), B);
  const portrait = applyRatio(landscape, ratioValue('3:2', 'portrait'), B);
  near(portrait.w / portrait.h, 2 / 3); inside(portrait);
  near(portrait.x + portrait.w / 2, landscape.x + landscape.w / 2);

  const free = swapRect({ x: 100, y: 100, w: 600, h: 200 }, B);
  near(free.w, 200); near(free.h, 600); near(free.x + free.w / 2, 400); inside(free);
  // does not fit when swapped: shrinks to fit
  const big = swapRect({ x: 0, y: 300, w: 1000, h: 200 }, B);
  inside(big); near(big.h, 800); near(big.w, 160);
});

test('roundRect: whole pixels, odd sizes, inside the image', () => {
  assert.deepEqual(roundRect({ x: 10.4, y: 20.6, w: 300.5, h: 200.4 }, B), { x: 10, y: 21, w: 301, h: 200 });
  assert.deepEqual(roundRect({ x: 0.2, y: 0.2, w: 0.2, h: 0.2 }, B), { x: 0, y: 0, w: 1, h: 1 });
  const edge = roundRect({ x: 699.7, y: 599.7, w: 300.3, h: 200.3 }, B);
  assert.equal(edge.x + edge.w, 1000); assert.equal(edge.y + edge.h, 800);
  const over = roundRect({ x: 900, y: 700, w: 400, h: 400 }, B);
  inside(over);
});

test('roundRect with a ratio derives the height from the rounded width', () => {
  const r = roundRect({ x: 10, y: 10, w: 333.3, h: 333.3 / (16 / 9) }, B, 16 / 9);
  assert.equal(r.w, 333); assert.equal(r.h, Math.round(333 / (16 / 9)));
  const sq = roundRect({ x: 0, y: 0, w: 801.4, h: 801.4 }, B, 1);
  assert.equal(sq.w, sq.h);
  inside(sq);
  const odd = roundRect({ x: 0.5, y: 0, w: 667, h: 667 / (3 / 4) }, { w: 1000, h: 1000 }, 3 / 4);
  assert.equal(odd.w, 667); assert.equal(odd.h, 889); // 889.33 rounds down
});

test('keyboard nudging: step size, move, resize, clamping', () => {
  assert.equal(nudgeStep(1), 1);
  assert.equal(nudgeStep(0.25), 4);
  assert.equal(nudgeStep(0.25, true), 40);
  assert.equal(nudgeStep(2), 1);
  const r = { x: 100, y: 100, w: 300, h: 200 };
  assert.deepEqual(nudgeRect(r, 'ArrowRight', 5, B), { x: 105, y: 100, w: 300, h: 200 });
  assert.deepEqual(nudgeRect(r, 'ArrowUp', 5, B), { x: 100, y: 95, w: 300, h: 200 });
  assert.deepEqual(nudgeRect({ ...r, x: 0 }, 'ArrowLeft', 5, B).x, 0);
  assert.deepEqual(nudgeRect(r, 'ArrowRight', 5, B, { resize: true }), { x: 100, y: 100, w: 305, h: 200 });
  const locked = nudgeRect(r, 'ArrowDown', 6, B, { resize: true, ratio: 1.5 });
  near(locked.w / locked.h, 1.5);
  const shrunk = nudgeRect({ x: 100, y: 100, w: 300, h: 200 }, 'ArrowLeft', 6, B, { resize: true, ratio: 1.5 });
  near(shrunk.w, 294); near(shrunk.w / shrunk.h, 1.5); near(shrunk.x, 100); near(shrunk.y, 100);
  const grown = nudgeRect({ x: 100, y: 100, w: 300, h: 200 }, 'ArrowUp', -6, B, { resize: true, ratio: 1.5 });
  assert.ok(grown.w > 300 || grown.w === 300);
  const shrunkUp = nudgeRect({ x: 100, y: 100, w: 300, h: 200 }, 'ArrowUp', 6, B, { resize: true, ratio: 1.5 });
  near(shrunkUp.h, 194); near(shrunkUp.w / shrunkUp.h, 1.5);
  assert.equal(nudgeRect(r, 'a', 5, B), r);
});

test('exportName and ratioLabel', () => {
  assert.equal(exportName('holiday photo.JPEG', 800, 600, 'png'), 'holiday photo-cropped-800x600.png');
  assert.equal(exportName('', 1, 2, 'jpg'), 'image-cropped-1x2.jpg');
  assert.equal(exportName('a/b<c>.webp', 5, 5, 'webp'), 'a_b_c_-cropped-5x5.webp');
  assert.equal(ratioLabel(null), 'Free');
  assert.equal(ratioLabel(RATIOS['16:9']), '16:9');
  assert.equal(ratioLabel(9 / 16), '9:16');
  assert.equal(ratioLabel(1), '1:1');
  assert.equal(ratioLabel(1.234), 'Custom');
});
