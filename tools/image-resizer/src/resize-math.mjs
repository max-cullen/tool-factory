// Pure maths for the Image Resizer. No DOM, no canvas: everything here is testable in Node.

export const MAX_INPUT_PIXELS = 100_000_000; // refuse source images above 100 megapixels
export const MAX_OUTPUT_SIDE = 16384; // longest allowed side of a result
export const MAX_OUTPUT_PIXELS = 100_000_000; // width x height of a result
export const MIN_PERCENT = 1;
export const MAX_PERCENT = 1000;

export const FORMATS = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG', lossy: false },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG', lossy: true },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', lossy: true },
};

/** Whole pixels, never below 1. */
export const roundDim = (n) => (Number.isFinite(n) ? Math.max(1, Math.round(n)) : NaN);

/** Height that keeps the source shape for a chosen width. */
export const heightForWidth = (width, srcW, srcH) => roundDim((width * srcH) / srcW);
/** Width that keeps the source shape for a chosen height. */
export const widthForHeight = (height, srcW, srcH) => roundDim((height * srcW) / srcH);

/** Percent of the original size, each side rounded and kept at 1px or more. */
export function percentToSize(srcW, srcH, percent) {
  return { width: roundDim((srcW * percent) / 100), height: roundDim((srcH * percent) / 100) };
}

/** Turn a typed value into a whole number of pixels, or NaN if it is not a usable number. */
export function parsePixels(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (t === '') return NaN;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? roundDim(n) : NaN;
}

/** Turn a typed percentage into a number between MIN_PERCENT and MAX_PERCENT, or NaN. */
export function parsePercent(text) {
  const t = String(text ?? '').trim().replace(',', '.').replace(/%$/, '');
  if (t === '') return NaN;
  const n = Number(t);
  if (!Number.isFinite(n) || n < MIN_PERCENT || n > MAX_PERCENT) return NaN;
  return n;
}

/**
 * Output size for one image.
 * settings: { mode: 'pixels' | 'percent', width, height (numbers or NaN), percent, lock, driver: 'width' | 'height' }
 * With lock on, the driver side is used and the other follows this image's shape.
 * With lock off, both sides are used as typed.
 * Returns { width, height } or null when the settings are incomplete.
 */
export function targetSize(srcW, srcH, s) {
  if (!(srcW > 0 && srcH > 0)) return null;
  if (s.mode === 'percent') {
    if (!Number.isFinite(s.percent)) return null;
    return percentToSize(srcW, srcH, s.percent);
  }
  const w = Number.isFinite(s.width) ? s.width : NaN;
  const h = Number.isFinite(s.height) ? s.height : NaN;
  if (s.lock) {
    if (s.driver === 'height') return Number.isFinite(h) ? { width: widthForHeight(h, srcW, srcH), height: roundDim(h) } : null;
    return Number.isFinite(w) ? { width: roundDim(w), height: heightForWidth(w, srcW, srcH) } : null;
  }
  return Number.isFinite(w) && Number.isFinite(h) ? { width: roundDim(w), height: roundDim(h) } : null;
}

/**
 * Where to draw the source on the output canvas.
 * Returns the source rectangle (sx, sy, sw, sh) and the destination rectangle (dx, dy, dw, dh).
 *  stretch: whole source onto the whole output, ignoring shape.
 *  fit:     whole source, shape kept, centred inside the output; the rest is background.
 *  fill:    output fully covered, shape kept; the source is cropped around its centre.
 */
export function placement(srcW, srcH, outW, outH, fit) {
  if (fit === 'fit') {
    const k = Math.min(outW / srcW, outH / srcH);
    const dw = Math.min(outW, Math.max(1, Math.round(srcW * k)));
    const dh = Math.min(outH, Math.max(1, Math.round(srcH * k)));
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: Math.round((outW - dw) / 2), dy: Math.round((outH - dh) / 2), dw, dh };
  }
  if (fit === 'fill') {
    const k = Math.max(outW / srcW, outH / srcH);
    const sw = Math.min(srcW, outW / k);
    const sh = Math.min(srcH, outH / k);
    return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh, dx: 0, dy: 0, dw: outW, dh: outH };
  }
  return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: outW, dh: outH };
}

/**
 * Sizes of the intermediate canvases for a big reduction. Each step at most halves a side, which
 * keeps the result smoother than one huge jump. The last entry is always the destination size.
 * Enlarging (or a small reduction) is a single step.
 */
export function stepDownPlan(fromW, fromH, toW, toH) {
  const next = (cur, target) => (cur > target ? Math.max(target, Math.ceil(cur / 2)) : target);
  const steps = [];
  let w = fromW, h = fromH;
  for (let i = 0; i < 40; i++) {
    w = next(w, toW);
    h = next(h, toH);
    steps.push({ width: w, height: h });
    if (w === toW && h === toH) break;
  }
  return steps;
}

const px = (n) => n.toLocaleString('en-AU');

/** null when allowed, otherwise a plain-English reason. */
export function checkSource(srcW, srcH) {
  if (!(srcW > 0 && srcH > 0)) return 'This image has no readable size, so it can not be resized.';
  if (srcW * srcH > MAX_INPUT_PIXELS) {
    return `This image is ${(srcW * srcH / 1e6).toFixed(0)} megapixels. The limit is 100 megapixels, because browsers run out of memory beyond that.`;
  }
  return null;
}

export function checkOutput(outW, outH) {
  if (!(outW > 0 && outH > 0)) return 'Enter a width and height of at least 1 pixel.';
  if (outW > MAX_OUTPUT_SIDE || outH > MAX_OUTPUT_SIDE) {
    return `The result would be ${px(outW)} × ${px(outH)} px. The longest side can be at most ${px(MAX_OUTPUT_SIDE)} px.`;
  }
  if (outW * outH > MAX_OUTPUT_PIXELS) {
    return `The result would be ${(outW * outH / 1e6).toFixed(0)} megapixels. The limit is 100 megapixels.`;
  }
  return null;
}

/** Combined check used before drawing. Returns null or a message. */
export function validateLimits(srcW, srcH, outW, outH) {
  return checkSource(srcW, srcH) || checkOutput(outW, outH);
}

/** Safe file name stem: no path, no extension. */
export function stemOf(name) {
  const base = String(name || 'image').split(/[\\/]/).pop();
  const stem = base.replace(/\.[^.]*$/, '').replace(/[^\p{L}\p{N}._ -]+/gu, '').trim().replace(/\s+/g, '-');
  return stem || 'image';
}

/** e.g. holiday.jpg, 1080x810, jpeg -> holiday-1080x810.jpg */
export function outputName(name, w, h, format) {
  const f = FORMATS[format] || FORMATS.png;
  return `${stemOf(name)}-${w}x${h}.${f.ext}`;
}

/** Adds -2, -3 ... before the extension if a name is already taken. Records the result in `used`. */
export function uniqueName(name, used) {
  if (!used.has(name)) { used.add(name); return name; }
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 2; ; i++) {
    const n = `${stem}-${i}${ext}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 2 : 1)} MB`;
}

/** Normalise #abc or #aabbcc (with or without #) to #aabbcc, or null. */
export function normaliseHex(text) {
  let t = String(text ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(t)) t = t.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(t) ? `#${t.toLowerCase()}` : null;
}

export const clampQuality = (q) => (Number.isFinite(q) ? Math.min(100, Math.max(1, Math.round(q))) : 90);

/** Change in size as text, e.g. "93% smaller" or "12% larger". */
export function describeChange(before, after) {
  if (!(before > 0) || !(after >= 0)) return '';
  const pct = Math.round(((after - before) / before) * 100);
  if (pct === 0) return 'about the same size';
  return pct < 0 ? `${-pct}% smaller` : `${pct}% larger`;
}

export const PRESETS = [
  { id: 'square', label: 'Square', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait', w: 1080, h: 1350 },
  { id: 'vertical', label: 'Tall vertical', w: 1080, h: 1920 },
  { id: 'landscape', label: 'Landscape', w: 1920, h: 1080 },
  { id: 'link', label: 'Link preview', w: 1200, h: 630 },
  { id: 'profile', label: 'Profile', w: 800, h: 800 },
  { id: 'banner', label: 'Wide banner', w: 1500, h: 500 },
  { id: 'hd', label: 'HD', w: 1280, h: 720 },
  { id: 'passport', label: 'Passport-style', w: 413, h: 531, title: '35 × 45 mm at 300 dpi' },
];
