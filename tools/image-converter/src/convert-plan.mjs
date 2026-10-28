// Pure helpers for the Image Converter: formats, file names, limits and size text. No DOM, so it can be tested in Node.

export const MAX_MEGAPIXELS = 100;
export const DEFAULT_QUALITY = 85;
export const DEFAULT_BACKGROUND = '#ffffff';

export const FORMATS = {
  jpg: { id: 'jpg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg', lossy: true, alpha: false },
  png: { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png', lossy: false, alpha: true },
  webp: { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', lossy: true, alpha: true },
};

const MIME_TO_ID = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/pjpeg': 'jpg', 'image/png': 'png', 'image/x-png': 'png', 'image/webp': 'webp' };
const EXT_TO_ID = { jpg: 'jpg', jpeg: 'jpg', jpe: 'jpg', jfif: 'jpg', png: 'png', webp: 'webp' };
// Inputs the browser can usually decode. Only JPG, PNG and WebP are promised on the page; the rest is a courtesy.
const OTHER_INPUT_EXT = ['gif', 'bmp', 'avif'];
const OTHER_INPUT_MIME = ['image/gif', 'image/bmp', 'image/x-ms-bmp', 'image/avif'];

export function extensionOf(name) {
  const m = /\.([A-Za-z0-9]+)$/.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

export function baseName(name) {
  let s = String(name || '').replace(/^.*[\\/]/, '');
  s = s.replace(/\.[A-Za-z0-9]+$/, '');
  // Strip characters that are not allowed in file names on common systems, and control characters.
  s = s.replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '');
  return s.slice(0, 120) || 'image';
}

/** 'jpg' | 'png' | 'webp' for a file's own type or extension, else '' (not one of the three). */
export function formatOfFile({ type = '', name = '' } = {}) {
  return MIME_TO_ID[String(type).toLowerCase()] || EXT_TO_ID[extensionOf(name)] || '';
}

/** Can we try to open this file? Returns { ok, reason }. The browser still has the last word when it decodes. */
export function checkInput({ type = '', name = '', size = 0 } = {}) {
  if (!size) return { ok: false, reason: 'This file is empty.' };
  const t = String(type).toLowerCase();
  const ext = extensionOf(name);
  if (formatOfFile({ type: t, name })) return { ok: true };
  if (OTHER_INPUT_MIME.includes(t) || (!t && OTHER_INPUT_EXT.includes(ext))) return { ok: true };
  if (t === 'image/heic' || t === 'image/heif' || ext === 'heic' || ext === 'heif') return { ok: false, reason: 'HEIC photos are not supported here. Export or share the photo as JPG first.' };
  return { ok: false, reason: 'This is not an image this tool can open. Use a JPG, PNG or WebP file.' };
}

export function megapixels(w, h) { return (w * h) / 1e6; }

/** Refuse images above the limit (and anything with no usable size). */
export function checkDimensions(w, h, limit = MAX_MEGAPIXELS) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return { ok: false, reason: 'The image has no readable size.' };
  const mp = megapixels(w, h);
  if (mp > limit) return { ok: false, reason: `This image is ${mp.toFixed(0)} megapixels. The limit is ${limit} megapixels, because larger images can crash a browser tab.` };
  return { ok: true, mp };
}

export function clampQuality(q) {
  const n = Math.round(Number(q));
  if (!Number.isFinite(n)) return DEFAULT_QUALITY;
  return Math.min(100, Math.max(1, n));
}

/** The 0..1 value canvas.toBlob expects, or undefined for lossless formats. */
export function qualityArg(fmtId, q) {
  return FORMATS[fmtId] && FORMATS[fmtId].lossy ? clampQuality(q) / 100 : undefined;
}

/** '#abc' or '#aabbcc' (any case, # optional) -> '#aabbcc', or '' when not a colour. */
export function normaliseHex(v) {
  let s = String(v || '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : '';
}

/** Transparent pixels only need a solid colour when the target cannot hold transparency. */
export const needsBackground = (fmtId) => !!FORMATS[fmtId] && !FORMATS[fmtId].alpha;
export const showsQuality = (fmtId) => !!FORMATS[fmtId] && FORMATS[fmtId].lossy;

/**
 * Output name for a file. `used` is a Set of lower-case names already taken in this batch; it is updated.
 * photo.png -> photo.jpg, then photo (2).jpg, photo (3).jpg for repeats.
 */
export function outputName(inputName, fmtId, used = new Set()) {
  const fmt = FORMATS[fmtId];
  if (!fmt) throw new Error(`Unknown format: ${fmtId}`);
  const base = baseName(inputName);
  let name = `${base}.${fmt.ext}`;
  let n = 2;
  while (used.has(name.toLowerCase())) name = `${base} (${n++}).${fmt.ext}`;
  used.add(name.toLowerCase());
  return name;
}

export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1000) return `${Math.round(n)} B`;
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)} KB`;
  return `${(n / 1e6).toFixed(n < 1e7 ? 2 : 1)} MB`;
}

/** { text, kind } where kind is 'smaller' | 'larger' | 'same', for the before/after line. */
export function changeSummary(before, after) {
  if (!before || !Number.isFinite(after)) return { text: '', kind: 'same' };
  const pct = Math.round(((after - before) / before) * 100);
  if (pct === 0) return { text: 'Same size', kind: 'same' };
  return pct < 0 ? { text: `${-pct}% smaller`, kind: 'smaller' } : { text: `${pct}% larger`, kind: 'larger' };
}
