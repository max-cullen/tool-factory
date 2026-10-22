// QR Code encoder, written from the ISO/IEC 18004 description. No dependencies.
// Supports versions 1-40, error-correction levels L/M/Q/H, numeric, alphanumeric and byte (UTF-8) modes,
// Reed-Solomon codes, all 8 masks with penalty scoring, and format and version information.
// "QR Code" is a registered trademark of Denso Wave Incorporated.

export const ECL = { L: 0, M: 1, Q: 2, H: 3 };
const FORMAT_BITS = [1, 0, 3, 2]; // indexed by ECL value: L=01, M=00, Q=11, H=10

// Error-correction codewords per block, and number of blocks, indexed [level][version]. Index 0 unused.
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

export const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const MODE = { numeric: 0x1, alnum: 0x2, byte: 0x4 };

export class QrCapacityError extends Error {
  constructor(message, info = {}) { super(message); this.name = 'QrCapacityError'; Object.assign(this, info); }
}

/* ---------- Galois field GF(256), polynomial 0x11D ---------- */
export function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
export function rsDivisor(degree) {
  const r = new Array(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < degree) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return r;
}
export function rsRemainder(data, divisor) {
  const r = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ r.shift();
    r.push(0);
    divisor.forEach((c, i) => { r[i] ^= gfMul(c, factor); });
  }
  return r;
}

/* ---------- sizes and capacity ---------- */
export const sizeOf = (version) => version * 4 + 17;
export function rawDataModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
export function dataCodewords(ver, ecl) {
  const e = ECL[ecl];
  return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver];
}
const countBits = (mode, ver) => {
  const t = ver < 10 ? 0 : ver < 27 ? 1 : 2;
  return { numeric: [10, 12, 14], alnum: [9, 11, 13], byte: [8, 16, 16] }[mode][t];
};

export function utf8(text) { return Array.from(new TextEncoder().encode(text)); }
export function detectMode(text) {
  if (/^[0-9]*$/.test(text)) return 'numeric';
  if ([...text].every((c) => ALNUM.includes(c))) return 'alnum';
  return 'byte';
}
function segmentBits(text, mode) {
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  if (mode === 'byte') { const b = utf8(text); b.forEach((x) => put(x, 8)); return { bits, count: b.length }; }
  if (mode === 'numeric') {
    for (let i = 0; i < text.length;) {
      const n = Math.min(3, text.length - i);
      put(parseInt(text.substr(i, n), 10), n * 3 + 1);
      i += n;
    }
    return { bits, count: text.length };
  }
  for (let i = 0; i < text.length;) {
    if (i + 1 < text.length) { put(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11); i += 2; } else { put(ALNUM.indexOf(text[i]), 6); i++; }
  }
  return { bits, count: text.length };
}

/** Largest number of UTF-8 bytes that fit at a given level (version 40). */
export const maxBytes = (ecl) => Math.floor((dataCodewords(40, ecl) * 8 - 4 - countBits('byte', 40)) / 8);

/** Work out mode, version and bit length for some text, without drawing anything. */
export function plan(text, ecl = 'M', minVersion = 1) {
  if (!(ecl in ECL)) throw new RangeError('Unknown error-correction level: ' + ecl);
  const mode = detectMode(text);
  const seg = segmentBits(text, mode);
  for (let v = Math.max(1, minVersion); v <= 40; v++) {
    const cap = dataCodewords(v, ecl) * 8;
    const used = 4 + countBits(mode, v) + seg.bits.length;
    const cc = countBits(mode, v);
    if (seg.count >= 2 ** cc) continue;
    if (used <= cap) return { mode, version: v, ecl, dataBits: used, capacityBits: cap, seg };
  }
  throw new QrCapacityError('Too much data for a QR code at level ' + ecl + '.', { ecl, bytes: utf8(text).length, maxBytes: maxBytes(ecl) });
}

/* ---------- format and version information ---------- */
export function formatBits(ecl, mask) {
  const data = (FORMAT_BITS[ECL[ecl]] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}
export function versionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}
export function alignmentPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const res = [6];
  for (let pos = sizeOf(ver) - 7; res.length < n; pos -= step) res.splice(1, 0, pos);
  return res;
}

/* ---------- drawing ---------- */
const bit = (x, i) => ((x >>> i) & 1) !== 0;
const maskFn = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function buildFunctionPatterns(ver) {
  const size = sizeOf(ver);
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, v) => { mod[y][x] = v; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const ap = alignmentPositions(ver);
  ap.forEach((ax, i) => ap.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  // Reserve format areas (real bits are drawn later) and version areas.
  for (let i = 0; i < 9; i++) { fn[8][i] = true; fn[i][8] = true; }
  for (let i = 0; i < 8; i++) { fn[8][size - 1 - i] = true; fn[size - 1 - i][8] = true; }
  if (ver >= 7) {
    const vb = versionBits(ver);
    for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3); const b = Math.floor(i / 3); set(a, b, bit(vb, i)); set(b, a, bit(vb, i)); }
  }
  set(8, size - 8, true); // the always-dark module
  return { mod, fn, size };
}

function drawFormat(mod, size, ecl, mask) {
  const bits = formatBits(ecl, mask);
  for (let i = 0; i <= 5; i++) mod[i][8] = bit(bits, i);
  mod[7][8] = bit(bits, 6); mod[8][8] = bit(bits, 7); mod[8][7] = bit(bits, 8);
  for (let i = 9; i < 15; i++) mod[8][14 - i] = bit(bits, i);
  for (let i = 0; i < 8; i++) mod[8][size - 1 - i] = bit(bits, i);
  for (let i = 8; i < 15; i++) mod[size - 15 + i][8] = bit(bits, i);
  mod[size - 8][8] = true;
}

function penalty(m, size) {
  let score = 0;
  // N1: runs of 5 or more in rows and columns
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const cur = pass ? m[b][a] : m[a][b];
        const prev = pass ? m[b - 1][a] : m[a][b - 1];
        if (cur === prev) { run++; if (run === 5) score += 3; else if (run > 5) score++; } else run = 1;
      }
    }
  }
  // N2: 2x2 blocks
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
  }
  // N3: finder-like pattern 1:1:3:1:1 with four light modules on a side
  const pats = [[1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]];
  for (let pass = 0; pass < 2; pass++) for (let a = 0; a < size; a++) for (let b = 0; b + 11 <= size; b++) {
    for (const p of pats) {
      let ok = true;
      for (let k = 0; k < 11 && ok; k++) ok = (pass ? m[b + k][a] : m[a][b + k]) === (p[k] === 1);
      if (ok) score += 40;
    }
  }
  // N4: balance of dark modules
  let dark = 0;
  for (const row of m) for (const v of row) if (v) dark++;
  const total = size * size;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return score;
}

/** Make the data + error-correction codewords for a plan, interleaved. */
export function buildCodewords(p) {
  const { version: ver, ecl, mode, seg } = p;
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(MODE[mode], 4);
  put(seg.count, countBits(mode, ver));
  for (const b of seg.bits) bits.push(b);
  const cap = dataCodewords(ver, ecl) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let k = 0; k < 8; k++) v = (v << 1) | bits[i + k]; data.push(v); }

  const e = ECL[ecl];
  const nb = NUM_BLOCKS[e][ver]; const eccLen = ECC_PER_BLOCK[e][ver];
  const raw = Math.floor(rawDataModules(ver) / 8);
  const numShort = nb - (raw % nb); const shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - eccLen + (i < numShort ? 0 : 1);
    const d = data.slice(k, k + len); k += len;
    const ecc = rsRemainder(d, div);
    if (i < numShort) d.push(0); // placeholder so all blocks line up, skipped below
    blocks.push({ d, ecc, short: i < numShort });
  }
  const out = [];
  for (let i = 0; i < shortLen - eccLen + 1; i++) blocks.forEach((b) => { if (!(b.short && i === shortLen - eccLen)) out.push(b.d[i]); });
  for (let i = 0; i < eccLen; i++) blocks.forEach((b) => out.push(b.ecc[i]));
  return out;
}

/**
 * Encode text into a QR matrix.
 * Returns { version, size, ecl, mask, mode, dataBits, capacityBits, modules } where modules[y][x] is true for a dark module.
 * Throws QrCapacityError when the text cannot fit. `mask` (0-7) forces a mask; otherwise the lowest-penalty one is used.
 */
export function encode(text, { ecl = 'M', minVersion = 1, mask = -1 } = {}) {
  const p = plan(String(text), ecl, minVersion);
  const codewords = buildCodewords(p);
  const { mod, fn, size } = buildFunctionPatterns(p.version);
  // Place codewords in the zig-zag order.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j;
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? size - 1 - vert : vert;
      if (!fn[y][x] && i < codewords.length * 8) { mod[y][x] = bit(codewords[i >>> 3], 7 - (i & 7)); i++; }
    }
  }
  const apply = (mk) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[mk](x, y)) mod[y][x] = !mod[y][x]; };
  let best = mask;
  if (best < 0) {
    let min = Infinity;
    for (let m = 0; m < 8; m++) {
      apply(m); drawFormat(mod, size, p.ecl, m);
      const s = penalty(mod, size);
      if (s < min) { min = s; best = m; }
      apply(m); // undo
    }
  }
  apply(best); drawFormat(mod, size, p.ecl, best);
  return { version: p.version, size, ecl: p.ecl, mask: best, mode: p.mode, dataBits: p.dataBits, capacityBits: p.capacityBits, modules: mod };
}
