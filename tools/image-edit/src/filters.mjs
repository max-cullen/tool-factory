// Pixel maths for the image editor. Pure functions on RGBA arrays (Uint8ClampedArray, Uint8Array or a plain
// array), so the live preview and the full-size export run exactly the same code and the tests can check
// known values. Every function works in place and returns the same array. Alpha is never changed except by blur.
//
// The result is always rounded and clamped by us (clamp8), not left to the array type: a Uint8ClampedArray
// rounds halves to even and a Uint8Array wraps around, and the answers must not depend on which one is used.

export const clamp8 = (v) => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));

/** Brightness, amount -100..100. Adds amount * 2.55 to red, green and blue (so +100 adds 255). */
export function brightness(data, amount) {
  if (!amount) return data;
  const off = amount * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] + off);
    data[i + 1] = clamp8(data[i + 1] + off);
    data[i + 2] = clamp8(data[i + 2] + off);
  }
  return data;
}

/** Contrast factor for an amount in -100..100 (the usual 259 formula). -100 gives 0, which flattens to mid grey. */
export function contrastFactor(amount) {
  const c = amount * 2.55;
  return (259 * (c + 255)) / (255 * (259 - c));
}

/** Contrast, amount -100..100, pivoting around mid grey (128). */
export function contrast(data, amount) {
  if (!amount) return data;
  const f = contrastFactor(amount);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(f * (data[i] - 128) + 128);
    data[i + 1] = clamp8(f * (data[i + 1] - 128) + 128);
    data[i + 2] = clamp8(f * (data[i + 2] - 128) + 128);
  }
  return data;
}

/** Greyscale, amount 0..100 (percent). Luminance uses the Rec. 709 weights. */
export function greyscale(data, amount) {
  if (!amount) return data;
  const t = amount / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = clamp8(r + (l - r) * t);
    data[i + 1] = clamp8(g + (l - g) * t);
    data[i + 2] = clamp8(b + (l - b) * t);
  }
  return data;
}

/** Sepia, amount 0..100 (percent), using the common sepia matrix. */
export function sepia(data, amount) {
  if (!amount) return data;
  const t = amount / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const sr = 0.393 * r + 0.769 * g + 0.189 * b;
    const sg = 0.349 * r + 0.686 * g + 0.168 * b;
    const sb = 0.272 * r + 0.534 * g + 0.131 * b;
    data[i] = clamp8(r + (clamp8(sr) - r) * t);
    data[i + 1] = clamp8(g + (clamp8(sg) - g) * t);
    data[i + 2] = clamp8(b + (clamp8(sb) - b) * t);
  }
  return data;
}

/**
 * Blur one line in place. `line` holds `n` pixels of 4 floats: premultiplied red, green, blue, then alpha
 * (all on the 0..255 scale). `out` receives the box average over [i - r, i + r], with the edge pixel repeated
 * beyond the ends, so a flat area stays exactly flat and the picture does not darken at its borders.
 */
function boxLine(line, out, n, r) {
  const win = 2 * r + 1;
  const at = (i) => (i < 0 ? 0 : i >= n ? n - 1 : i) * 4;
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
  for (let i = -r; i <= r; i++) { const k = at(i); s0 += line[k]; s1 += line[k + 1]; s2 += line[k + 2]; s3 += line[k + 3]; }
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    out[o] = s0 / win; out[o + 1] = s1 / win; out[o + 2] = s2 / win; out[o + 3] = s3 / win;
    const add = at(i + r + 1), sub = at(i - r);
    s0 += line[add] - line[sub]; s1 += line[add + 1] - line[sub + 1]; s2 += line[add + 2] - line[sub + 2]; s3 += line[add + 3] - line[sub + 3];
  }
}

/**
 * Blur, in place, with a separable box filter run `passes` times in each direction (two passes give a
 * smooth, nearly Gaussian result). `radius` is a whole number of pixels; 0 does nothing. Colour is averaged
 * with alpha as the weight, so transparent pixels do not bleed black into their neighbours.
 * @param {{data: ArrayLike<number>, width: number, height: number}} img
 */
export function blur(img, radius, passes = 2) {
  const r = Math.max(0, Math.floor(radius));
  if (!r) return img;
  const { data, width: w, height: h } = img;
  const len = Math.max(w, h) * 4;
  const line = new Float32Array(len), out = new Float32Array(len);
  const load = (i, o) => { const a = data[i + 3]; line[o] = (data[i] * a) / 255; line[o + 1] = (data[i + 1] * a) / 255; line[o + 2] = (data[i + 2] * a) / 255; line[o + 3] = a; };
  const store = (i, o) => {
    const a = out[o + 3];
    if (a > 0) { const k = 255 / a; data[i] = clamp8(out[o] * k); data[i + 1] = clamp8(out[o + 1] * k); data[i + 2] = clamp8(out[o + 2] * k); } else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; }
    data[i + 3] = clamp8(a);
  };
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) load(row + x * 4, x * 4);
      boxLine(line, out, w, r);
      for (let x = 0; x < w; x++) store(row + x * 4, x * 4);
    }
    for (let x = 0; x < w; x++) {
      const col = x * 4, stride = w * 4;
      for (let y = 0; y < h; y++) load(col + y * stride, y * 4);
      boxLine(line, out, h, r);
      for (let y = 0; y < h; y++) store(col + y * stride, y * 4);
    }
  }
  return img;
}

/** Composite onto white, in place, so transparent areas become white (JPEG has no transparency). */
export function flattenOnWhite(data) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 255) continue;
    const k = a / 255;
    data[i] = clamp8(data[i] * k + 255 * (1 - k));
    data[i + 1] = clamp8(data[i + 1] * k + 255 * (1 - k));
    data[i + 2] = clamp8(data[i + 2] * k + 255 * (1 - k));
    data[i + 3] = 255;
  }
  return data;
}
