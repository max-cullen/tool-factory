// Pure crop maths for Image Cropper. No DOM, no canvas: everything is in source (full-resolution) pixels,
// so a drag on the scaled preview is divided by the display scale before it gets here.
// A rect is { x, y, w, h }. Bounds are { w, h } (the source image size).

export const MAX_PIXELS = 100_000_000; // refuse images above 100 megapixels
export const MIN_SIZE = 16; // smallest crop edge, in source pixels
export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Landscape ratios (width / height). Orientation turns them upright. */
export const RATIOS = { '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9 };

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** Ratio as width / height for a preset key and orientation, or null for free. */
export function ratioValue(key, orientation = 'landscape') {
  const r = RATIOS[key];
  if (!r) return null;
  return orientation === 'portrait' ? 1 / r : r;
}

/** Display scale that fits a source image into a box (never above maxScale). */
export function fitScale(srcW, srcH, boxW, boxH, maxScale = 4) {
  if (!(srcW > 0 && srcH > 0 && boxW > 0 && boxH > 0)) return 1;
  return Math.min(boxW / srcW, boxH / srcH, maxScale);
}
export const toSource = (displayPx, scale) => displayPx / scale;
export const toDisplay = (sourcePx, scale) => sourcePx * scale;

/** Check an image size before decoding it into a canvas. */
export function checkImageSize(w, h) {
  if (!(w > 0 && h > 0)) return { ok: false, reason: 'empty' };
  if (w * h > MAX_PIXELS) return { ok: false, reason: 'too-large' };
  return { ok: true };
}

function minEdge(bounds, min) {
  return Math.max(1, Math.min(min, bounds.w, bounds.h));
}

/** Largest rect of the given ratio (or 90% box if free) centred in the bounds. */
export function initialRect(bounds, ratio, frac = 0.9) {
  const maxW = bounds.w * frac, maxH = bounds.h * frac;
  let w = maxW, h = maxH;
  if (ratio) {
    w = Math.min(maxW, maxH * ratio);
    h = w / ratio;
  }
  return { x: (bounds.w - w) / 2, y: (bounds.h - h) / 2, w, h };
}

/** Move without resizing, staying inside the bounds. */
export function moveRect(rect, dx, dy, bounds) {
  return {
    x: clamp(rect.x + dx, 0, Math.max(0, bounds.w - rect.w)),
    y: clamp(rect.y + dy, 0, Math.max(0, bounds.h - rect.h)),
    w: rect.w, h: rect.h,
  };
}

/**
 * Drag one handle by (dx, dy) source pixels from the rect as it was when the drag started.
 * With a ratio (w / h) the box keeps that ratio and the opposite corner or edge stays put.
 * The result is always inside the bounds and at least the minimum size.
 */
export function resizeRect(rect, handle, dx, dy, bounds, { ratio = null, min = MIN_SIZE } = {}) {
  const W = bounds.w, H = bounds.h;
  const m = minEdge(bounds, min);
  const hasW = handle.includes('w'), hasE = handle.includes('e'), hasN = handle.includes('n'), hasS = handle.includes('s');

  if (!ratio) {
    let left = rect.x, right = rect.x + rect.w, top = rect.y, bottom = rect.y + rect.h;
    if (hasW) left = clamp(rect.x + dx, 0, right - m);
    if (hasE) right = clamp(rect.x + rect.w + dx, left + m, W);
    if (hasN) top = clamp(rect.y + dy, 0, bottom - m);
    if (hasS) bottom = clamp(rect.y + rect.h + dy, top + m, H);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  const r = ratio;
  // Smallest width that keeps both edges at or above the minimum, limited by what fits the image.
  const minW = Math.min(Math.max(m, m * r), W, H * r);
  const pick = (v, lo, hi) => clamp(v, Math.min(lo, hi), hi);
  const corner = (hasW || hasE) && (hasN || hasS);

  if (corner) {
    const sx = hasW ? -1 : 1, sy = hasN ? -1 : 1;
    const ax = hasW ? rect.x + rect.w : rect.x, ay = hasN ? rect.y + rect.h : rect.y; // fixed corner
    const px = (hasW ? rect.x : rect.x + rect.w) + dx, py = (hasN ? rect.y : rect.y + rect.h) + dy;
    const w0 = (px - ax) * sx, h0 = (py - ay) * sy;
    const maxW = Math.min(sx > 0 ? W - ax : ax, (sy > 0 ? H - ay : ay) * r);
    const w = pick(Math.max(w0, h0 * r), minW, maxW), h = w / r;
    return { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h };
  }
  if (hasW || hasE) {
    const sx = hasW ? -1 : 1;
    const ax = hasW ? rect.x + rect.w : rect.x;
    const cy = rect.y + rect.h / 2;
    const px = (hasW ? rect.x : rect.x + rect.w) + dx;
    const maxW = Math.min(sx > 0 ? W - ax : ax, 2 * Math.min(cy, H - cy) * r);
    const w = pick((px - ax) * sx, minW, maxW), h = w / r;
    return { x: sx > 0 ? ax : ax - w, y: cy - h / 2, w, h };
  }
  const sy = hasN ? -1 : 1;
  const ay = hasN ? rect.y + rect.h : rect.y;
  const cx = rect.x + rect.w / 2;
  const py = (hasN ? rect.y : rect.y + rect.h) + dy;
  const maxH = Math.min(sy > 0 ? H - ay : ay, (2 * Math.min(cx, W - cx)) / r);
  const h = pick((py - ay) * sy, minW / r, maxH), w = h * r;
  return { x: cx - w / 2, y: sy > 0 ? ay : ay - h, w, h };
}

/**
 * Reshape a box to a ratio, keeping its centre where it can. Never grows beyond the current box.
 * Used when a preset is chosen or the orientation is flipped.
 */
export function applyRatio(rect, ratio, bounds, min = MIN_SIZE) {
  if (!ratio) return { ...rect };
  const m = minEdge(bounds, min);
  const minW = Math.min(Math.max(m, m * ratio), bounds.w, bounds.h * ratio);
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  let w = Math.min(rect.w, rect.h * ratio, bounds.w, bounds.h * ratio);
  w = Math.max(w, minW);
  const h = w / ratio;
  return { x: clamp(cx - w / 2, 0, bounds.w - w), y: clamp(cy - h / 2, 0, bounds.h - h), w, h };
}

/** Free mode orientation flip: swap width and height around the centre, shrinking to fit if needed. */
export function swapRect(rect, bounds, min = MIN_SIZE) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  let w = rect.h, h = rect.w;
  const k = Math.min(1, bounds.w / w, bounds.h / h);
  w *= k; h *= k;
  const m = minEdge(bounds, min);
  w = Math.max(w, m); h = Math.max(h, m);
  return { x: clamp(cx - w / 2, 0, bounds.w - w), y: clamp(cy - h / 2, 0, bounds.h - h), w, h };
}

/** Whole source pixels for export. With a ratio, the height follows the rounded width as closely as possible. */
export function roundRect(rect, bounds, ratio = null) {
  let w = clamp(Math.round(rect.w), 1, bounds.w);
  let h = clamp(Math.round(ratio ? w / ratio : rect.h), 1, bounds.h);
  if (ratio && h === bounds.h && Math.round(w / ratio) > bounds.h) w = clamp(Math.round(h * ratio), 1, bounds.w);
  const x = clamp(Math.round(rect.x), 0, bounds.w - w);
  const y = clamp(Math.round(rect.y), 0, bounds.h - h);
  return { x, y, w, h };
}

/** Keyboard step in source pixels: about one screen pixel (at least 1), ten times that with Shift. */
export function nudgeStep(scale, big = false) {
  const base = Math.max(1, Math.round(1 / (scale || 1)));
  return big ? base * 10 : base;
}

/** Arrow keys move the box; with `resize` they move the bottom-right corner instead. */
export function nudgeRect(rect, key, step, bounds, { resize = false, ratio = null, min = MIN_SIZE } = {}) {
  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key];
  if (!d) return rect;
  if (!resize) return moveRect(rect, d[0], d[1], bounds);
  let [dx, dy] = d;
  if (ratio) { if (dx) dy = dx / ratio; else dx = dy * ratio; } // keep the corner on the ratio so shrinking works too
  return resizeRect(rect, 'se', dx, dy, bounds, { ratio, min });
}

/** Rect scaled for the screen, and back. */
export const rectToDisplay = (r, s) => ({ x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s });
export const rectToSource = (r, s) => ({ x: r.x / s, y: r.y / s, w: r.w / s, h: r.h / s });

export const FORMATS = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG', lossy: false },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG', lossy: true },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', lossy: true },
};

/** `photo.jpeg` cropped to 800 by 600 as PNG -> `photo-cropped-800x600.png`. */
export function exportName(original, w, h, ext) {
  const base = String(original || 'image').replace(/\.[^./\\]+$/, '').replace(/[^\w.\- ()]+/g, '_').trim().slice(0, 80) || 'image';
  return `${base}-cropped-${w}x${h}.${ext}`;
}

export const ratioLabel = (ratio) => {
  if (!ratio) return 'Free';
  for (const [k, v] of Object.entries(RATIOS)) {
    if (Math.abs(v - ratio) < 1e-9) return k;
    if (Math.abs(1 / v - ratio) < 1e-9) return k.split(':').reverse().join(':');
  }
  return 'Custom';
};
