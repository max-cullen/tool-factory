import test from 'node:test';
import assert from 'node:assert/strict';
import { encode } from '../src/qr.mjs';
import { toSvg, rasterise, runs, edges, effectiveSize, minImageSize, drawToCanvas } from '../src/render.mjs';
import { parseHex, contrastRatio, checkContrast } from '../src/contrast.mjs';

const q = encode('render me', { ecl: 'M' });

test('SVG: viewBox includes the margin, colours are applied, path covers every dark module', () => {
  const svg = toSvg(q.modules, { margin: 3, fg: '#112233', bg: '#ffeedd', size: 300 });
  assert.match(svg, /viewBox="0 0 27 27"/); // 21 + 2*3
  assert.match(svg, /width="300" height="300"/);
  assert.match(svg, /fill="#ffeedd"/);
  assert.match(svg, /fill="#112233"/);
  const dark = q.modules.flat().filter(Boolean).length;
  const covered = runs(q.modules).reduce((s, r) => s + r[2], 0);
  assert.equal(covered, dark);
  assert.ok(!/NaN|undefined/.test(svg));
});

test('SVG: bad colours fall back, labels are escaped', () => {
  const svg = toSvg(q.modules, { fg: 'nope', bg: '', label: 'a "b" <c>' });
  assert.match(svg, /fill="#000000"/);
  assert.match(svg, /fill="#ffffff"/);
  assert.ok(svg.includes('aria-label="a &quot;b&quot; &lt;c>"'));
});

test('pixel grid fills exactly the requested size and keeps the quiet zone empty', () => {
  for (const size of [128, 333, 1024]) {
    const r = rasterise(q.modules, { margin: 4, size });
    assert.equal(r.data.length, size * size);
    const e = edges(q.size + 8, size);
    assert.equal(e[0], 0); assert.equal(e[e.length - 1], size);
    for (let i = 0; i < e[4]; i++) for (let x = 0; x < size; x++) assert.equal(r.data[i * size + x], 0);
    assert.ok(r.data.some((v) => v === 1));
  }
});

test('with a whole-number scale, the pixel grid is the matrix scaled up', () => {
  const total = q.size + 8; const s = 5;
  const r = rasterise(q.modules, { margin: 4, size: total * s });
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) assert.equal(r.data[((y + 4) * s + 2) * r.size + (x + 4) * s + 2], q.modules[y][x] ? 1 : 0);
});

test('small sizes are raised so each dot is at least 2 pixels', () => {
  assert.equal(minImageSize(21, 4), 58);
  assert.equal(effectiveSize(128, 21, 4), 128);
  assert.equal(effectiveSize(128, 177, 4), 370);
});

test('drawToCanvas sets the size and paints background then runs', () => {
  const calls = [];
  const ctx = { fillRect: (...a) => calls.push(['rect', ...a]), set fillStyle(v) { calls.push(['fill', v]); } };
  const canvas = { getContext: () => ctx };
  drawToCanvas(canvas, q.modules, { margin: 2, size: 200, fg: '#000000', bg: '#ffffff' });
  assert.equal(canvas.width, 200); assert.equal(canvas.height, 200);
  assert.deepEqual(calls[0], ['fill', '#ffffff']);
  assert.deepEqual(calls[1], ['rect', 0, 0, 200, 200]);
  assert.deepEqual(calls[2], ['fill', '#000000']);
  assert.equal(calls.length, 3 + runs(q.modules).length);
});

test('hex parsing accepts 3 and 6 digits, with or without #', () => {
  assert.equal(parseHex('#ABC'), '#aabbcc');
  assert.equal(parseHex('0e1124'), '#0e1124');
  assert.equal(parseHex('#12'), null);
  assert.equal(parseHex('zzzzzz'), null);
});

test('contrast ratio: black on white is 21, same colours is 1', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff') * 10) / 10, 21);
  assert.equal(contrastRatio('#336699', '#336699'), 1);
});

test('contrast check levels and the inverted warning', () => {
  assert.equal(checkContrast('#0e1124', '#ffffff').level, 'good');
  assert.equal(checkContrast('#777777', '#ffffff').level, 'warn');
  assert.equal(checkContrast('#aaaaaa', '#ffffff').level, 'bad');
  const inv = checkContrast('#ffffff', '#000000');
  assert.equal(inv.level, 'warn');
  assert.equal(inv.inverted, true);
  assert.match(checkContrast('#0e1124', '#ffffff').text, /Scans well/);
});
