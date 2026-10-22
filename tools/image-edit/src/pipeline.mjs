// Ties the transform and the filters together and holds the settings rules. Pure logic, no page access.
// The live preview and the full-size export both call render(), so they cannot drift apart.
import { brightness, contrast, greyscale, sepia, blur, flattenOnWhite } from './filters.mjs';
import { applyTransform, isIdentityTransform, normaliseRotation } from './transform.mjs';

export const MAX_PIXELS = 100_000_000; // refuse anything above 100 megapixels
export const PREVIEW_EDGE = 1100; // longest side of the preview copy, in pixels

/** Order the adjustments run in. Geometry (rotate, then flip) always runs before all of these. */
export const ADJUST_ORDER = ['brightness', 'contrast', 'greyscale', 'sepia', 'blur'];

export const RANGES = {
  brightness: [-100, 100],
  contrast: [-100, 100],
  greyscale: [0, 100],
  sepia: [0, 100],
  blur: [0, 20],
};

export const DEFAULTS = Object.freeze({ rotation: 0, flipH: false, flipV: false, brightness: 0, contrast: 0, greyscale: 0, sepia: 0, blur: 0 });

/** Clean up any settings object: numbers only, inside their ranges, rotation a multiple of 90. */
export function normalise(s = {}) {
  const out = { ...DEFAULTS, rotation: normaliseRotation(Number(s.rotation) || 0), flipH: !!s.flipH, flipV: !!s.flipV };
  for (const k of ADJUST_ORDER) {
    const [lo, hi] = RANGES[k];
    const n = Number(s[k]);
    out[k] = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0;
  }
  return out;
}

export const hasAdjustments = (s) => ADJUST_ORDER.some((k) => normalise(s)[k] !== 0);
export const isNeutral = (s) => isIdentityTransform(s) && !hasAdjustments(s);

/**
 * Blur radius in pixels for a slider amount. It is proportional to the picture size, so the small preview
 * copy and the full-size export show the same amount of blur (amount 10 is 1% of the longest side).
 */
export function blurRadius(amount, width, height) {
  return Math.round((amount * Math.max(width, height)) / 1000);
}

/** Run the adjustments, in ADJUST_ORDER, on an image in place. */
export function adjust(img, settings) {
  const s = normalise(settings);
  brightness(img.data, s.brightness);
  contrast(img.data, s.contrast);
  greyscale(img.data, s.greyscale);
  sepia(img.data, s.sepia);
  blur(img, blurRadius(s.blur, img.width, img.height));
  return img;
}

/**
 * The whole job: rotate and flip, then adjust. Returns a new image object. The input pixels are left alone
 * unless `inPlace` is true (the export uses that to avoid a second copy of a very large picture).
 */
export function render(img, settings, { inPlace = false } = {}) {
  const s = normalise(settings);
  let out = applyTransform(img, s);
  if (out === img && hasAdjustments(s) && !inPlace) out = { data: img.data.slice(), width: img.width, height: img.height };
  if (hasAdjustments(s)) adjust(out, s);
  return out;
}

/** null if the size is fine, otherwise a message to show. */
export function checkSize(width, height) {
  if (!(width > 0) || !(height > 0)) return 'That image has no size, so it cannot be edited.';
  const mp = (width * height) / 1e6;
  if (width * height > MAX_PIXELS) return `That image is ${mp.toFixed(0)} megapixels. The limit is ${MAX_PIXELS / 1e6} megapixels, because larger pictures can run a browser out of memory. Make it smaller first and try again.`;
  return null;
}

/** Size of the preview copy: scaled down so the longest side is at most `edge`, never scaled up. */
export function previewSize(width, height, edge = PREVIEW_EDGE) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
}

export const FORMATS = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG', lossy: false },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG', lossy: true },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', lossy: true },
};

/** Arguments for canvas.toBlob: mime type and, for lossy formats only, a quality from 0.01 to 1. */
export function exportSpec(format, qualityPercent = 90) {
  const f = FORMATS[format] || FORMATS.png;
  const q = Math.min(100, Math.max(1, Number(qualityPercent) || 90)) / 100;
  return { mime: f.mime, ext: f.ext, quality: f.lossy ? q : undefined, lossy: f.lossy };
}

/** Pixel prep before encoding: JPEG cannot hold transparency, so it is flattened onto white. */
export function prepareForExport(img, format) {
  if (format === 'jpeg') flattenOnWhite(img.data);
  return img;
}

/** "holiday photo.heic" -> "holiday photo-edited.png" */
export function exportName(original, format) {
  const base = String(original || 'image').replace(/\.[^.\\/]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
  return `${base}-edited.${(FORMATS[format] || FORMATS.png).ext}`;
}
