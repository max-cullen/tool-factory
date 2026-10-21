/**
 * image-fit engine
 * ----------------
 * Browser-only image sizing. Nothing is uploaded; everything runs on the
 * visitor's device using the Canvas API. No dependencies, except an optional
 * lazy-loaded HEIC decoder (vendor/heic2any.min.js) that is fetched only when
 * a HEIC/HEIF photo is chosen.
 *
 * Main entry points
 *   processFile(file, options)  load + fit + clean up, one call
 *   loadImage(file)             decode once, reuse for several fits
 *   fitImage(image, options)    resize / compress an already-loaded image
 *
 * Options (all optional)
 *   width, height     exact output pixels. If both are set, `fit` decides how
 *                     the photo is placed: 'cover' (crop to fill, default),
 *                     'contain' (letterbox) or 'stretch'. If only one is set
 *                     the aspect ratio is kept.
 *   maxKB             output must be at or under this size
 *   minKB             output must be at or over this size (needs maxKB too)
 *   format            'jpeg' (default) | 'webp' | 'png'
 *   background        fill colour for transparent areas / letterbox bars
 *                     (default white for JPEG)
 *   minQuality        quality floor before the photo is shrunk instead (0-1)
 *   focusX, focusY    0-1, where 'cover' crops from (default 0.5 = centre)
 *   signal            AbortSignal
 *   onProgress        callback({ encodes })
 *
 * KB convention: a form that says "100KB" might mean 100,000 or 102,400 bytes.
 * To be safe under both, the maximum is treated as kb * 1000 and the minimum
 * as kb * 1024.
 */

const DEFAULTS = {
  qualityMax: 0.92,
  qualityFloor: 0.55, // below this we shrink pixels rather than quality
  qualityFloorLocked: 0.05, // when exact pixels are demanded, quality is all we have
  minSide: 32, // never shrink the longest side below this
  maxPixels: 100_000_000, // refuse absurd inputs instead of crashing the tab
  probePixels: 1_500_000,
  maxScaleIterations: 10,
  maxQualityIterations: 7,
  padMargin: 16, // bytes above the minimum when padding
};

const MIME = { jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png' };
const EXT = { jpeg: 'jpg', webp: 'webp', png: 'png' };

export class ImageFitError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageFitError';
    this.code = code; // empty | unsupported | decode-failed | too-large | bad-options | aborted
  }
}

/* ------------------------------------------------------------------ */
/* Format sniffing and header reading                                  */
/* ------------------------------------------------------------------ */

export function sniffFormat(u8) {
  const at = (i) => u8[i];
  const str = (i, n) => String.fromCharCode(...u8.slice(i, i + n));
  if (u8.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  if (u8.length >= 8 && at(0) === 0x89 && str(1, 3) === 'PNG') return 'png';
  if (u8.length >= 12 && str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP') return 'webp';
  if (u8.length >= 6 && str(0, 4) === 'GIF8') return 'gif';
  if (u8.length >= 12 && str(4, 4) === 'ftyp') {
    const brand = str(8, 4);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'heic';
    if (brand === 'avif' || brand === 'avis') return 'avif';
  }
  return null;
}

/** Read width/height from the file header without decoding. Returns null if unknown. */
function readDimensions(u8, fmt) {
  try {
    if (fmt === 'png' && u8.length >= 24) {
      const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      return { w: dv.getUint32(16), h: dv.getUint32(20) };
    }
    if (fmt === 'jpeg') {
      let p = 2;
      while (p + 9 < u8.length) {
        if (u8[p] !== 0xff) { p++; continue; }
        const m = u8[p + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { p += 2; continue; }
        const len = (u8[p + 2] << 8) | u8[p + 3];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { h: (u8[p + 5] << 8) | u8[p + 6], w: (u8[p + 7] << 8) | u8[p + 8] };
        }
        p += 2 + len;
      }
    }
    if (fmt === 'webp' && u8.length >= 30) {
      const tag = String.fromCharCode(...u8.slice(12, 16));
      if (tag === 'VP8X') {
        return { w: 1 + (u8[24] | (u8[25] << 8) | (u8[26] << 16)), h: 1 + (u8[27] | (u8[28] << 8) | (u8[29] << 16)) };
      }
      if (tag === 'VP8 ') return { w: (u8[26] | (u8[27] << 8)) & 0x3fff, h: (u8[28] | (u8[29] << 8)) & 0x3fff };
      if (tag === 'VP8L') {
        const b = u8[21] | (u8[22] << 8) | (u8[23] << 16) | (u8[24] << 24);
        return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
      }
    }
  } catch (_) { /* fall through */ }
  return null;
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function canvasToBlob(canvas, mime, quality) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: mime, quality });
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), mime, quality);
  });
}

function ctx2d(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/* ------------------------------------------------------------------ */
/* HEIC (lazy)                                                         */
/* ------------------------------------------------------------------ */

let heicScriptUrl = null;
let heicPromise = null;

export function setHeicScriptUrl(url) {
  heicScriptUrl = url;
  heicPromise = null;
}

function loadHeicLib() {
  if (heicPromise) return heicPromise;
  const url = heicScriptUrl || new URL('./vendor/heic2any.min.js', import.meta.url).href;
  heicPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.heic2any) return resolve(window.heic2any);
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => (window.heic2any ? resolve(window.heic2any) : reject(new Error('heic2any missing after load')));
    s.onerror = () => reject(new Error('Could not load the HEIC decoder'));
    document.head.appendChild(s);
  });
  heicPromise.catch(() => { heicPromise = null; });
  return heicPromise;
}

async function heicToPngBlob(file) {
  const heic2any = await loadHeicLib();
  const out = await heic2any({ blob: file, toType: 'image/png' });
  return Array.isArray(out) ? out[0] : out;
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

async function bitmapFrom(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (e) {
    if (e instanceof TypeError) return await createImageBitmap(blob); // very old engines reject the options bag
    throw e;
  }
}

/**
 * Decode a File/Blob once. Applies EXIF rotation. Returns an object that can be
 * passed to fitImage() any number of times; call image.dispose() when done.
 */
export async function loadImage(file) {
  if (!file || !file.size) throw new ImageFitError('empty', 'That file is empty.');
  const head = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
  const fmt = sniffFormat(head);

  if (fmt === 'gif') {
    throw new ImageFitError('unsupported', 'GIF files are not supported yet. Please use a JPG, PNG, WebP or HEIC photo.');
  }

  const dims = fmt ? readDimensions(head, fmt) : null;
  if (dims && dims.w * dims.h > DEFAULTS.maxPixels) {
    throw new ImageFitError('too-large', `That image is ${dims.w} x ${dims.h} pixels, which is too large to process in a browser.`);
  }

  let decodeBlob = file;
  if (fmt === 'heic') {
    try {
      decodeBlob = await heicToPngBlob(file);
    } catch (e) {
      throw new ImageFitError('decode-failed', 'Could not read that HEIC photo.');
    }
  }

  let bitmap;
  try {
    bitmap = await bitmapFrom(decodeBlob);
  } catch (e) {
    throw new ImageFitError(
      fmt ? 'decode-failed' : 'unsupported',
      fmt ? 'That image looks damaged and could not be read.' : 'That does not look like an image file. Please use a JPG, PNG, WebP or HEIC photo.'
    );
  }

  if (bitmap.width * bitmap.height > DEFAULTS.maxPixels) {
    bitmap.close?.();
    throw new ImageFitError('too-large', 'That image is too large to process in a browser.');
  }

  const levels = [bitmap]; // pyramid: levels[k] is roughly 1/2^k of the source
  return {
    file,
    name: file.name || 'image',
    sourceFormat: fmt || 'unknown',
    originalBytes: file.size,
    width: bitmap.width,
    height: bitmap.height,
    _levels: levels,
    dispose() {
      for (const l of levels) l.close?.();
      levels.length = 0;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

/** Half-size copies of the source, built lazily. Halving keeps downscales sharp and alias-free. */
function getLevel(image, k) {
  const levels = image._levels;
  while (levels.length <= k) {
    const prev = levels[levels.length - 1];
    const w = Math.max(1, Math.ceil(prev.width / 2));
    const h = Math.max(1, Math.ceil(prev.height / 2));
    const c = makeCanvas(w, h);
    ctx2d(c).drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, w, h);
    levels.push(c);
  }
  return levels[k];
}

function resolveBase(image, o) {
  const W = o.width | 0;
  const H = o.height | 0;
  if (W > 0 && H > 0) return { W, H, locked: true, fit: o.fit || 'cover' };
  if (W > 0) return { W, H: Math.max(1, Math.round((image.height * W) / image.width)), locked: true, fit: 'stretch' };
  if (H > 0) return { W: Math.max(1, Math.round((image.width * H) / image.height)), H, locked: true, fit: 'stretch' };
  return { W: image.width, H: image.height, locked: false, fit: 'stretch' };
}

function renderAt(image, base, scale, background, focus) {
  const W = Math.max(1, Math.round(base.W * scale));
  const H = Math.max(1, Math.round(base.H * scale));
  const sw0 = image.width;
  const sh0 = image.height;
  let crop = { x: 0, y: 0, w: sw0, h: sh0 };
  let dest = { x: 0, y: 0, w: W, h: H };

  if (base.fit === 'cover') {
    const k = Math.max(W / sw0, H / sh0);
    crop.w = Math.min(sw0, W / k);
    crop.h = Math.min(sh0, H / k);
    crop.x = (sw0 - crop.w) * focus.x;
    crop.y = (sh0 - crop.h) * focus.y;
  } else if (base.fit === 'contain') {
    const k = Math.min(W / sw0, H / sh0);
    dest.w = Math.max(1, Math.round(sw0 * k));
    dest.h = Math.max(1, Math.round(sh0 * k));
    dest.x = Math.round((W - dest.w) / 2);
    dest.y = Math.round((H - dest.h) / 2);
  }

  // Pick the smallest pyramid level that is still at least as big as the destination.
  let k = 0;
  while (
    (crop.w / 2 ** (k + 1)) >= dest.w &&
    (crop.h / 2 ** (k + 1)) >= dest.h &&
    Math.min(sw0, sh0) / 2 ** (k + 1) >= 1
  ) k++;
  const level = getLevel(image, k);
  const fx = level.width / sw0;
  const fy = level.height / sh0;

  const canvas = makeCanvas(W, H);
  const ctx = ctx2d(canvas);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(level, crop.x * fx, crop.y * fy, crop.w * fx, crop.h * fy, dest.x, dest.y, dest.w, dest.h);
  return canvas;
}

/* ------------------------------------------------------------------ */
/* Padding (to reach a minimum size)                                   */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Add valid, ignorable comment segments to a JPEG until it reaches `target` bytes. */
async function padJpeg(blob, target) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let need = target - buf.length;
  if (need <= 0) return blob;
  if (need < 4) need = 4;
  let p = 2;
  while (p + 4 <= buf.length && buf[p] === 0xff && buf[p + 1] >= 0xe0 && buf[p + 1] <= 0xef) {
    p += 2 + ((buf[p + 2] << 8) | buf[p + 3]);
  }
  const n = Math.max(1, Math.ceil(need / 65537));
  const dataTotal = need - 4 * n;
  const out = new Uint8Array(buf.length + need);
  out.set(buf.subarray(0, p), 0);
  let w = p;
  let left = dataTotal;
  for (let i = 0; i < n; i++) {
    const d = i < n - 1 ? 65533 : left;
    left -= d;
    out[w++] = 0xff;
    out[w++] = 0xfe;
    out[w++] = (d + 2) >> 8;
    out[w++] = (d + 2) & 0xff;
    out.fill(0x20, w, w + d);
    w += d;
  }
  out.set(buf.subarray(p), w);
  return new Blob([out], { type: 'image/jpeg' });
}

/** Add a tEXt comment chunk to a PNG until it reaches `target` bytes. */
async function padPng(blob, target) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let need = target - buf.length;
  if (need <= 0) return blob;
  if (need < 20) need = 20;
  const textLen = need - 20; // 12 chunk overhead + "Comment\0" (8)
  const dataLen = 8 + textLen;
  const chunk = new Uint8Array(12 + dataLen);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, dataLen);
  chunk.set([0x74, 0x45, 0x58, 0x74], 4); // tEXt
  chunk.set([...'Comment'].map((c) => c.charCodeAt(0)), 8);
  chunk[15] = 0;
  chunk.fill(0x20, 16, 16 + textLen);
  dv.setUint32(8 + dataLen, crc32(chunk.subarray(4, 8 + dataLen)));
  const iend = buf.length - 12; // IEND is always the last 12 bytes
  const out = new Uint8Array(buf.length + chunk.length);
  out.set(buf.subarray(0, iend), 0);
  out.set(chunk, iend);
  out.set(buf.subarray(iend), iend + chunk.length);
  return new Blob([out], { type: 'image/png' });
}

/* ------------------------------------------------------------------ */
/* Fitting                                                             */
/* ------------------------------------------------------------------ */

function normalise(image, options) {
  const o = { ...DEFAULTS, ...options };
  const fmt = (o.format || 'jpeg').toLowerCase().replace('jpg', 'jpeg');
  if (!MIME[fmt]) throw new ImageFitError('bad-options', `Unknown format "${o.format}".`);
  o.format = fmt;

  for (const k of ['width', 'height']) {
    if (o[k] != null && (!Number.isFinite(o[k]) || o[k] < 1 || o[k] > 20000)) {
      throw new ImageFitError('bad-options', `${k} must be between 1 and 20000 pixels.`);
    }
  }
  o.maxBytes = o.maxKB != null ? Math.round(o.maxKB * 1000) : null;
  o.minBytes = o.minKB != null ? Math.round(o.minKB * 1024) : null;
  if (o.maxBytes != null && !(o.maxBytes > 0)) throw new ImageFitError('bad-options', 'maxKB must be above zero.');
  if (o.minBytes != null && o.maxBytes == null) throw new ImageFitError('bad-options', 'minKB needs maxKB as well.');
  if (o.minBytes != null && o.minBytes > o.maxBytes) o.minBytes = Math.round(o.minKB * 1000);
  if (o.minBytes != null && o.minBytes > o.maxBytes) throw new ImageFitError('bad-options', 'The minimum size is bigger than the maximum.');
  o.focus = { x: o.focusX ?? 0.5, y: o.focusY ?? 0.5 };
  return o;
}

/**
 * Fit a loaded image to the requested pixels and/or file size.
 * Returns { blob, bytes, width, height, format, mime, quality, scale, status, warnings, ... }
 * status: 'ok' | 'unchanged' | 'padded' | 'over-limit' | 'below-min'
 */
export async function fitImage(image, options = {}) {
  const t0 = performance.now();
  const o = normalise(image, options);
  const base = resolveBase(image, o);
  const warnings = [];
  let fmt = o.format;
  let encodes = 0;

  const bgFor = (f) => o.background ?? (f === 'jpeg' ? '#ffffff' : null);
  const check = () => {
    if (o.signal?.aborted) throw new ImageFitError('aborted', 'Cancelled.');
  };

  // Already fits? Hand back the original untouched (no quality loss).
  const hasPixelTarget = o.width > 0 || o.height > 0;
  if (
    !hasPixelTarget &&
    o.maxBytes != null &&
    image.sourceFormat === fmt &&
    image.originalBytes <= o.maxBytes &&
    (o.minBytes == null || image.originalBytes >= o.minBytes)
  ) {
    return {
      blob: image.file, bytes: image.originalBytes, width: image.width, height: image.height,
      format: fmt, mime: MIME[fmt], quality: null, scale: 1, status: 'unchanged',
      warnings, originalBytes: image.originalBytes, originalWidth: image.width, originalHeight: image.height,
      encodes: 0, ms: Math.round(performance.now() - t0),
    };
  }

  async function enc(scale, quality) {
    check();
    encodes++;
    o.onProgress?.({ encodes });
    const canvas = renderAt(image, base, scale, bgFor(fmt), o.focus);
    let blob = await canvasToBlob(canvas, MIME[fmt], fmt === 'png' ? undefined : quality);
    check();
    if (blob.type !== MIME[fmt]) {
      // Some browsers silently fall back to PNG when they cannot encode WebP.
      if (fmt === 'webp') {
        fmt = 'jpeg';
        warnings.push('This browser cannot create WebP files, so JPEG was used instead.');
        return enc(scale, quality);
      }
      throw new ImageFitError('decode-failed', 'This browser could not create the output file.');
    }
    return { blob, scale, quality, width: canvas.width, height: canvas.height };
  }

  const minScale = Math.min(1, o.minSide / Math.max(base.W, base.H));

  /**
   * Highest quality in [lo, hi] whose file fits maxBytes at a fixed scale.
   * `knownLo` is an existing encode at (scale, lo) that already fits, to save a repeat.
   * File size changes smoothly with quality, so we interpolate in log-size rather than bisect.
   */
  async function searchQuality(scale, lo, hi, knownLo) {
    const max = o.maxBytes;
    let top = null;
    // Try the quality ceiling first, unless we already know there is almost no headroom.
    if (!(knownLo && knownLo.blob.size >= 0.9 * max)) {
      top = await enc(scale, hi);
      if (top.blob.size <= max) return { res: top, fits: true };
    }
    const bottom = knownLo || (await enc(scale, lo));
    if (bottom.blob.size > max) return { res: bottom, fits: false };
    let good = bottom;
    let qa = lo;
    let qb = hi;
    let sb = top ? top.blob.size : null; // size known to be over the limit at qb
    for (let i = 0; i < o.maxQualityIterations && qb - qa > 0.01 && good.blob.size < 0.97 * max; i++) {
      let t = 0.5;
      if (sb) {
        const la = Math.log(good.blob.size);
        t = (Math.log(max) - la) / (Math.log(sb) - la);
        t = Math.min(0.9, Math.max(0.1, t));
      }
      const q = qa + (qb - qa) * t;
      const r = await enc(scale, q);
      if (r.blob.size <= max) { good = r; qa = q; } else { qb = q; sb = r.blob.size; }
    }
    return { res: good, fits: true };
  }

  /** Largest scale (<= 1) whose file fits maxBytes at quality q. Size ~ scale^alpha, alpha learned as we go. */
  async function searchScale(q) {
    const max = o.maxBytes;
    const px = base.W * base.H;
    const pts = []; // { s, size } at quality q
    let s = 1;
    if (px > o.probePixels) {
      const sp = Math.sqrt(o.probePixels / px);
      const probe = await enc(sp, q);
      pts.push({ s: sp, size: probe.blob.size });
      const bpp = probe.blob.size / (probe.width * probe.height);
      s = Math.min(1, Math.sqrt(max / (bpp * px)) * 0.98);
    }
    let lo = 0;
    let hi = Infinity;
    let loRes = null;
    let lastFail = null;
    for (let it = 0; it < o.maxScaleIterations; it++) {
      s = Math.max(s, minScale);
      const r = await enc(s, q);
      const size = r.blob.size;
      pts.push({ s, size });
      const fitsNow = size <= max;
      if (fitsNow) { lo = s; loRes = r; } else { hi = s; lastFail = r; }
      if (fitsNow && (s >= 1 || size >= 0.93 * max)) break;
      if (!fitsNow && s <= minScale + 1e-9) break;

      let alpha = 1.8;
      if (pts.length >= 2) {
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];
        if (Math.abs(Math.log(a.s / b.s)) > 1e-3) {
          alpha = Math.min(3, Math.max(1, Math.log(a.size / b.size) / Math.log(a.s / b.s)));
        }
      }
      let next = s * Math.pow(max / size, 1 / alpha) * (fitsNow ? 0.995 : 0.985);
      next = Math.min(1, next);
      if (lo > 0 && hi < Infinity && (next <= lo || next >= hi)) next = (lo + hi) / 2;
      if (fitsNow && next - s < 0.004) break;
      s = next;
    }
    if (!loRes && !lastFail) lastFail = await enc(minScale, q);
    return loRes ? { res: loRes, fits: true } : { res: lastFail, fits: false };
  }

  let result;
  let fits = true;

  if (o.maxBytes == null) {
    result = await enc(1, fmt === 'png' ? undefined : 0.92);
  } else if (fmt === 'png') {
    if (base.locked) {
      result = await enc(1);
      fits = result.blob.size <= o.maxBytes;
      if (!fits) warnings.push('PNG files cannot be compressed to a smaller size at fixed pixels. Choose JPEG or WebP for a smaller file.');
    } else {
      const r = await searchScale();
      result = r.res;
      fits = r.fits;
      if (result.scale < 1) warnings.push('PNG is lossless, so the picture was made smaller to fit. JPEG or WebP keep more detail at small sizes.');
    }
  } else if (base.locked) {
    const r = await searchQuality(1, o.qualityFloorLocked, o.qualityMax);
    result = r.res;
    fits = r.fits;
  } else {
    const r = await searchScale(o.minQuality ?? o.qualityFloor);
    if (!r.fits) {
      result = r.res;
      fits = false;
    } else {
      const floor = o.minQuality ?? o.qualityFloor;
      const q = await searchQuality(r.res.scale, floor, o.qualityMax, r.res);
      result = q.fits ? q.res : r.res;
    }
  }

  let blob = result.blob;
  let status = 'ok';

  if (!fits) {
    status = 'over-limit';
    warnings.push(`Could not get under ${(o.maxBytes / 1000).toFixed(0)}KB. This is the smallest version possible at these settings.`);
  } else if (o.minBytes != null && blob.size < o.minBytes) {
    const target = Math.min(o.minBytes + o.padMargin, o.maxBytes);
    if (fmt === 'jpeg') blob = await padJpeg(blob, target);
    else if (fmt === 'png') blob = await padPng(blob, target);
    if (blob.size >= o.minBytes) {
      status = 'padded';
      warnings.push('The photo was naturally smaller than the minimum, so harmless filler data was added to reach it. The picture itself is unchanged.');
    } else {
      status = 'below-min';
      warnings.push('The result is smaller than the minimum size. Choose JPEG output to reach a minimum size.');
    }
  }

  return {
    blob, bytes: blob.size, width: result.width, height: result.height,
    format: fmt, mime: MIME[fmt], quality: fmt === 'png' ? null : result.quality ?? null,
    scale: result.scale, status, warnings,
    originalBytes: image.originalBytes, originalWidth: image.width, originalHeight: image.height,
    encodes, ms: Math.round(performance.now() - t0),
  };
}

/** A screen-sized JPEG of the decoded photo (EXIF rotation applied, HEIC supported) for on-page previews. */
export async function makePreview(image, maxSide = 1400) {
  const k = Math.min(1, maxSide / Math.max(image.width, image.height));
  const W = Math.max(1, Math.round(image.width * k));
  const H = Math.max(1, Math.round(image.height * k));
  const base = { W, H, locked: true, fit: 'stretch' };
  const canvas = renderAt(image, base, 1, '#ffffff', { x: 0.5, y: 0.5 });
  return canvasToBlob(canvas, 'image/jpeg', 0.85);
}

/** Convenience: load, fit, dispose. */
export async function processFile(file, options = {}) {
  const image = await loadImage(file);
  try {
    return await fitImage(image, options);
  } finally {
    image.dispose();
  }
}

/** "photo.heic" -> "photo-fit-413x531.jpg" */
export function suggestName(originalName, result) {
  const stem = (originalName || 'image').replace(/\.[^.]+$/, '');
  return `${stem}-${result.width}x${result.height}.${EXT[result.format] || 'jpg'}`;
}

export function formatBytes(n) {
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)} KB`;
  return `${(n / 1_000_000).toFixed(2)} MB`;
}
