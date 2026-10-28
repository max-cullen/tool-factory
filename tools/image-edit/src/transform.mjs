// Rotate and flip on RGBA pixel arrays, plus the small piece of state logic behind the four buttons.
// Pure functions: nothing here touches the page. An "image" is { data, width, height } with data holding
// width * height * 4 values (red, green, blue, alpha).

const same = (img, data, width, height) => ({ data, width, height });
const fresh = (img) => new img.data.constructor(img.data.length);

/** Quarter turn clockwise (dir = 1) or anticlockwise (dir = -1). Returns a new image with width and height swapped. */
export function rotate90(img, dir = 1) {
  const { data, width: w, height: h } = img;
  const out = fresh(img);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      // clockwise: (x, y) -> (h - 1 - y, x); anticlockwise: (x, y) -> (y, w - 1 - x). The new width is h.
      const d = dir >= 0 ? (x * h + (h - 1 - y)) * 4 : ((w - 1 - x) * h + y) * 4;
      out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
    }
  }
  return same(img, out, h, w);
}

/** Half turn. Returns a new image of the same size. */
export function rotate180(img) {
  const { data, width: w, height: h } = img;
  const out = fresh(img);
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const s = i * 4, d = (n - 1 - i) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
  }
  return same(img, out, w, h);
}

/** Mirror left to right. Returns a new image. */
export function flipHorizontal(img) {
  const { data, width: w, height: h } = img;
  const out = fresh(img);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = (y * w + (w - 1 - x)) * 4;
      out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
    }
  }
  return same(img, out, w, h);
}

/** Mirror top to bottom. Returns a new image. */
export function flipVertical(img) {
  const { data, width: w, height: h } = img;
  const out = fresh(img);
  const row = w * 4;
  for (let y = 0; y < h; y++) {
    const s = y * row, d = (h - 1 - y) * row;
    for (let i = 0; i < row; i++) out[d + i] = data[s + i];
  }
  return same(img, out, w, h);
}

export const normaliseRotation = (deg) => ((Math.round(deg / 90) * 90) % 360 + 360) % 360;

/** Size after rotating by `rotation` degrees (a multiple of 90). */
export function outputSize(width, height, rotation) {
  return normaliseRotation(rotation) % 180 === 0 ? { width, height } : { width: height, height: width };
}

/**
 * Apply { rotation (clockwise degrees), flipH, flipV } to an image: rotate first, then flip the rotated picture.
 * With nothing to do it returns the SAME image object, not a copy.
 */
export function applyTransform(img, t) {
  const rot = normaliseRotation(t.rotation || 0);
  let out = img;
  if (rot === 90) out = rotate90(out, 1);
  else if (rot === 180) out = rotate180(out);
  else if (rot === 270) out = rotate90(out, -1);
  if (t.flipH) out = flipHorizontal(out);
  if (t.flipV) out = flipVertical(out);
  return out;
}

export const isIdentityTransform = (t) => normaliseRotation(t.rotation || 0) === 0 && !t.flipH && !t.flipV;

/**
 * State after the user turns the picture they SEE by `delta` degrees (90 = right, -90 = left).
 * Because the transform is "rotate, then flip", a picture that is flipped once has to be turned the other way
 * in the stored rotation so that the button still turns what is on screen in the direction shown.
 */
export function rotateBy(t, delta) {
  const flipped = !!t.flipH !== !!t.flipV;
  return { ...t, rotation: normaliseRotation((t.rotation || 0) + (flipped ? -delta : delta)) };
}

/** State after pressing "flip horizontal" or "flip vertical": a mirror of what is on screen. */
export function flipBy(t, axis) {
  return axis === 'h' ? { ...t, flipH: !t.flipH } : { ...t, flipV: !t.flipV };
}
