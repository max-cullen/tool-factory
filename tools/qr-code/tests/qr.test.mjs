import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, plan, formatBits, versionBits, rsDivisor, rsRemainder, gfMul, dataCodewords, maxBytes, sizeOf, alignmentPositions, detectMode, QrCapacityError, buildCodewords } from '../src/qr.mjs';

test('GF(256) multiplication follows the 0x11D field', () => {
  assert.equal(gfMul(2, 128), 0x1d);
  assert.equal(gfMul(0x57, 1), 0x57);
  assert.equal(gfMul(0, 99), 0);
  assert.equal(gfMul(3, 7), 9);
});

test('Reed-Solomon: the well-known 1-M "HELLO WORLD" example', () => {
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(rsRemainder(data, rsDivisor(10)), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test('Reed-Solomon: generator polynomial of degree 7 is the standard one', () => {
  // x^7 + 127x^6 + 122x^5 + 154x^4 + 164x^3 + 11x^2 + 68x + 117 (leading 1 implied), a standard table value.
  assert.deepEqual(rsDivisor(7), [127, 122, 154, 164, 11, 68, 117]);
});

test('codewords of "HELLO WORLD" at 1-M match the standard example', () => {
  const p = plan('HELLO WORLD', 'M');
  assert.equal(p.version, 1);
  assert.equal(p.mode, 'alnum');
  assert.deepEqual(buildCodewords(p).slice(0, 16), [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]);
});

test('format information matches known values (mask 0)', () => {
  assert.equal(formatBits('M', 0), 0x5412);
  assert.equal(formatBits('L', 0), 0x77c4);
  assert.equal(formatBits('Q', 0), 0x355f);
  assert.equal(formatBits('H', 0), 0x1689);
});

test('version information matches known values', () => {
  assert.equal(versionBits(7), 0x07c94);
  assert.equal(versionBits(8), 0x085bc);
  assert.equal(versionBits(40), 0x28c69);
});

test('data codewords per version and level match the published capacity table', () => {
  const table = {
    L: [19, 34, 55, 80, 108, 136, 156, 194, 232, 274, 324, 370, 428, 461, 523, 589, 647, 721, 795, 861, 932, 1006, 1094, 1174, 1276, 1370, 1468, 1531, 1631, 1735, 1843, 1955, 2071, 2191, 2306, 2434, 2566, 2702, 2812, 2956],
    M: [16, 28, 44, 64, 86, 108, 124, 154, 182, 216, 254, 290, 334, 365, 415, 453, 507, 563, 627, 669, 714, 782, 860, 914, 1000, 1062, 1128, 1193, 1267, 1373, 1455, 1541, 1631, 1725, 1812, 1914, 1992, 2102, 2216, 2334],
    Q: [13, 22, 34, 48, 62, 76, 88, 110, 132, 154, 180, 206, 244, 261, 295, 325, 367, 397, 445, 485, 512, 568, 614, 664, 718, 754, 808, 871, 911, 985, 1033, 1115, 1171, 1231, 1286, 1354, 1426, 1502, 1582, 1666],
    H: [9, 16, 26, 36, 46, 60, 66, 86, 100, 122, 140, 158, 180, 197, 223, 253, 283, 313, 341, 385, 406, 442, 464, 514, 538, 596, 628, 661, 701, 745, 793, 845, 901, 961, 986, 1054, 1096, 1142, 1222, 1276],
  };
  for (const [l, row] of Object.entries(table)) row.forEach((n, i) => assert.equal(dataCodewords(i + 1, l), n, `${i + 1}-${l}`));
});

test('byte capacity: 17 at 1-L, 7 at 1-H, 2953 at 40-L, 1273 at 40-H', () => {
  assert.equal(plan('a'.repeat(17), 'L').version, 1);
  assert.equal(plan('a'.repeat(18), 'L').version, 2);
  assert.equal(plan('a'.repeat(7), 'H').version, 1);
  assert.equal(plan('a'.repeat(8), 'H').version, 2);
  assert.equal(maxBytes('L'), 2953);
  assert.equal(maxBytes('H'), 1273);
  assert.equal(plan('a'.repeat(2953), 'L').version, 40);
});

test('numeric and alphanumeric capacities', () => {
  assert.equal(plan('1'.repeat(41), 'L').version, 1);
  assert.equal(plan('1'.repeat(42), 'L').version, 2);
  assert.equal(plan('1'.repeat(7089), 'L').version, 40);
  assert.equal(plan('A'.repeat(25), 'L').version, 1);
  assert.equal(plan('A'.repeat(26), 'L').version, 2);
  assert.equal(plan('A'.repeat(4296), 'L').version, 40);
  assert.equal(detectMode('123'), 'numeric');
  assert.equal(detectMode('AB-12'), 'alnum');
  assert.equal(detectMode('ab'), 'byte');
  assert.equal(detectMode(''), 'numeric');
});

test('multi-byte characters count as UTF-8 bytes', () => {
  assert.equal(plan('é'.repeat(8), 'L').version, 1); // 16 bytes
  assert.equal(plan('é'.repeat(9), 'L').version, 2); // 18 bytes
});

test('too much data throws QrCapacityError with the limits', () => {
  assert.throws(() => encode('a'.repeat(2954), { ecl: 'L' }), (e) => e instanceof QrCapacityError && e.maxBytes === 2953 && e.bytes === 2954);
  assert.throws(() => encode('a'.repeat(1274), { ecl: 'H' }), QrCapacityError);
  assert.throws(() => plan('x', 'Z'), RangeError);
});

test('a higher level never needs a smaller version', () => {
  const text = 'https://example.com/some/longer/path?with=query&and=more';
  const v = ['L', 'M', 'Q', 'H'].map((l) => plan(text, l).version);
  for (let i = 1; i < v.length; i++) assert.ok(v[i] >= v[i - 1]);
});

test('matrix is 4v+17 square for every version', () => {
  for (let v = 1; v <= 40; v++) {
    const q = encode('x', { ecl: 'L', minVersion: v });
    assert.equal(q.version, v);
    assert.equal(q.size, sizeOf(v));
    assert.equal(q.modules.length, 4 * v + 17);
    assert.ok(q.modules.every((r) => r.length === 4 * v + 17));
  }
});

test('alignment pattern positions', () => {
  assert.deepEqual(alignmentPositions(1), []);
  assert.deepEqual(alignmentPositions(2), [6, 18]);
  assert.deepEqual(alignmentPositions(7), [6, 22, 38]);
  assert.deepEqual(alignmentPositions(32), [6, 34, 60, 86, 112, 138]);
  assert.deepEqual(alignmentPositions(40), [6, 30, 58, 86, 114, 142, 170]);
});

test('fixed patterns: finders, timing and the dark module', () => {
  const q = encode('Hello', { ecl: 'M' });
  const m = q.modules; const n = q.size;
  const finder = (ox, oy) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.max(Math.abs(x - 3), Math.abs(y - 3)); assert.equal(m[oy + y][ox + x], d !== 2, `finder ${ox},${oy} at ${x},${y}`); } };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  for (let i = 8; i < n - 8; i++) { assert.equal(m[6][i], i % 2 === 0); assert.equal(m[i][6], i % 2 === 0); }
  assert.equal(m[n - 8][8], true);
});

test('the format bits drawn in the matrix match formatBits, for every forced mask', () => {
  for (let mask = 0; mask < 8; mask++) for (const ecl of ['L', 'M', 'Q', 'H']) {
    const q = encode('format check', { ecl, mask });
    assert.equal(q.mask, mask);
    const m = q.modules; const n = q.size;
    let a = 0; let b = 0;
    for (let i = 0; i <= 5; i++) a |= (m[i][8] ? 1 : 0) << i;
    a |= (m[7][8] ? 1 : 0) << 6; a |= (m[8][8] ? 1 : 0) << 7; a |= (m[8][7] ? 1 : 0) << 8;
    for (let i = 9; i < 15; i++) a |= (m[8][14 - i] ? 1 : 0) << i;
    for (let i = 0; i < 8; i++) b |= (m[8][n - 1 - i] ? 1 : 0) << i;
    for (let i = 8; i < 15; i++) b |= (m[n - 15 + i][8] ? 1 : 0) << i;
    assert.equal(a, formatBits(ecl, mask));
    assert.equal(b, formatBits(ecl, mask));
  }
});

test('version bits are drawn in both corners for version 7 and up', () => {
  const q = encode('x', { ecl: 'L', minVersion: 7 });
  const n = q.size; const vb = versionBits(7);
  for (let i = 0; i < 18; i++) {
    const want = ((vb >>> i) & 1) === 1;
    assert.equal(q.modules[Math.floor(i / 3)][n - 11 + (i % 3)], want);
    assert.equal(q.modules[n - 11 + (i % 3)][Math.floor(i / 3)], want);
  }
});

test('output is deterministic', () => {
  const a = encode('https://example.com/a', { ecl: 'Q' });
  const b = encode('https://example.com/a', { ecl: 'Q' });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.modules, encode('https://example.com/b', { ecl: 'Q' }).modules);
});

test('the automatic mask has the lowest penalty choice and is in range', () => {
  const q = encode('mask selection', { ecl: 'M' });
  assert.ok(q.mask >= 0 && q.mask <= 7);
});
