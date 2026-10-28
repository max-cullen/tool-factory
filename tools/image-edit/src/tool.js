// Image Editor: browser wiring. All the maths lives in the .mjs modules next to this file.
// Nothing here makes a network request: the image is decoded, edited and encoded on this device.
import { render, normalise, DEFAULTS, ADJUST_ORDER, checkSize, previewSize, exportSpec, exportName, prepareForExport, FORMATS } from './pipeline.mjs';
import { rotateBy, flipBy, isIdentityTransform, outputSize } from './transform.mjs';
import { sniffSize } from './sniff.mjs';

const $ = (el, sel) => el.querySelector(sel);
const $$ = (el, sel) => [...el.querySelectorAll(sel)];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const UNITS = { greyscale: '%', sepia: '%' };
const FORMAT_HINTS = {
  png: 'PNG keeps every pixel exactly and supports transparency. Files are larger.',
  jpeg: 'JPG makes small files for photos but loses a little detail each time it is saved. Transparent areas become white.',
  webp: 'WebP is usually smaller than JPG at similar quality. Most sites accept it, but some forms and older programs do not.',
};
const fmtSize = (w, h) => `${w.toLocaleString('en-AU')} × ${h.toLocaleString('en-AU')}`;

async function saveFile(blob, name) {
  // iPhone and iPad: the share sheet offers "Save Image" and "Save to Files", which is what people expect there.
  if (IS_IOS && navigator.canShare) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 120000);
}

/** Decode a file to something drawImage accepts. EXIF orientation is applied where the browser can do it. */
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall through */ }
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // <img> applies EXIF orientation by itself in current browsers
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 60000); }
}
const dims = (b) => ({ width: b.naturalWidth || b.width, height: b.naturalHeight || b.height });

function toBlob(canvas, mime, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

class Editor {
  constructor(root) {
    this.root = root;
    this.s = { ...DEFAULTS };
    this.format = 'png';
    this.quality = 90;
    this.src = null; // the decoded original (ImageBitmap or <img>)
    this.size = null; // { width, height } of the original
    this.base = null; // { data, width, height }: the downscaled copy the preview is made from
    this.name = '';
    this.raf = 0;
    this.busyCount = 0;
    const q = (sel) => $(root, sel);
    this.el = {
      stage: q('[data-stage]'), drop: q('[data-drop]'), file: q('[data-file]'), view: q('[data-view]'), canvas: q('[data-canvas]'),
      busy: q('[data-busy]'), busyText: q('[data-busy-text]'), err: q('[data-err]'), name: q('[data-name]'), status: q('[data-status]'),
      from: q('[data-from]'), to: q('[data-to]'), fmt: q('[data-fmt]'), controls: q('[data-controls]'), download: q('[data-download]'),
      qualityWrap: q('[data-quality-wrap]'), quality: q('[data-quality]'), formatHint: q('[data-format-hint]'), formatSeg: q('[data-format]'),
    };
    this.ctx = this.el.canvas.getContext('2d');
    this.bind();
    this.syncUI();
  }

  bind() {
    const { el, root } = this;
    el.drop.addEventListener('click', () => el.file.click());
    $(root, '[data-choose]').addEventListener('click', () => el.file.click());
    el.file.addEventListener('change', () => { const f = el.file.files?.[0]; if (f) this.loadFile(f); el.file.value = ''; });

    const stage = el.stage;
    ['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); el.drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && stage.contains(e.relatedTarget)) return;
      el.drop.classList.remove('is-over');
    }));
    stage.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) this.loadFile(f); });
    document.addEventListener('paste', (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); this.loadFile(f); }
    });

    $$(root, '[data-rotate]').forEach((b) => b.addEventListener('click', () => { this.s = { ...this.s, ...rotateBy(this.s, Number(b.dataset.rotate)) }; this.changed(); }));
    $$(root, '[data-flip]').forEach((b) => b.addEventListener('click', () => { this.s = { ...this.s, ...flipBy(this.s, b.dataset.flip) }; this.changed(); }));
    $$(root, '[data-adj]').forEach((r) => r.addEventListener('input', () => { this.s[r.dataset.adj] = Number(r.value); this.changed(); }));
    el.quality.addEventListener('input', () => { this.quality = Number(el.quality.value); this.syncUI(); });
    $$(root, 'input[name="format"]').forEach((i) => i.addEventListener('change', () => { this.format = i.value; this.syncUI(); }));
    $$(root, '[data-reset]').forEach((b) => b.addEventListener('click', () => this.reset(b.dataset.reset)));
    $(root, '[data-reset-all]').addEventListener('click', () => this.reset('all'));
    el.download.addEventListener('click', () => this.download());
  }

  reset(what) {
    if (what === 'all') { this.s = { ...DEFAULTS }; this.quality = 90; }
    else if (what === 'transform') this.s = { ...this.s, rotation: 0, flipH: false, flipV: false };
    else if (what === 'quality') this.quality = 90;
    else this.s[what] = DEFAULTS[what];
    this.changed();
  }

  changed() { this.syncUI(); this.schedule(); }

  /** Push the settings into the controls: slider positions, values, reset buttons, pressed states. */
  syncUI() {
    const { root, el, s } = this;
    for (const k of ADJUST_ORDER) {
      const r = $(root, `[data-adj="${k}"]`);
      if (Number(r.value) !== s[k]) r.value = s[k];
      this.showValue(k, s[k], s[k] !== DEFAULTS[k]);
    }
    el.quality.value = this.quality;
    this.showValue('quality', this.quality, this.quality !== 90);
    const flipped = (name) => $(root, `[data-flip="${name}"]`).setAttribute('aria-pressed', String(name === 'h' ? s.flipH : s.flipV));
    flipped('h'); flipped('v');
    $(root, '[data-reset="transform"]').disabled = isIdentityTransform(s);
    $(root, '[data-reset-all]').disabled = !this.src;
    const radio = $(root, `input[name="format"][value="${this.format}"]`);
    if (radio && !radio.checked) radio.checked = true;
    const idx = Object.keys(FORMATS).indexOf(this.format);
    el.formatSeg.style.setProperty('--i', String(Math.max(0, idx)));
    el.formatHint.textContent = FORMAT_HINTS[this.format];
    el.qualityWrap.hidden = !FORMATS[this.format].lossy;
    el.fmt.textContent = FORMATS[this.format].label + (FORMATS[this.format].lossy ? ` ${this.quality}%` : '');
    this.updateFacts();
  }

  showValue(key, value, changed) {
    const out = $(this.root, `[data-val="${key}"]`);
    const sign = (key === 'brightness' || key === 'contrast') && value > 0 ? '+' : '';
    out.textContent = `${sign}${value}${UNITS[key] || ''}`;
    $(this.root, `[data-reset="${key}"]`).disabled = !changed;
  }

  updateFacts() {
    if (!this.size) return;
    const o = outputSize(this.size.width, this.size.height, this.s.rotation);
    this.el.from.textContent = fmtSize(this.size.width, this.size.height);
    this.el.to.textContent = fmtSize(o.width, o.height);
    const mp = (o.width * o.height) / 1e6;
    this.el.status.textContent = `Saved size ${fmtSize(o.width, o.height)} px (${mp < 10 ? mp.toFixed(1) : Math.round(mp)} megapixels). The preview is a smaller copy.`;
  }

  setBusy(text) {
    this.busyCount += text ? 1 : -1;
    const on = this.busyCount > 0;
    this.el.busy.hidden = !on;
    if (text) this.el.busyText.textContent = text;
    this.root.classList.toggle('is-working', on);
  }

  showError(msg) {
    this.el.err.textContent = msg;
    this.el.err.hidden = !msg;
  }

  async loadFile(file) {
    this.showError('');
    if (!(file.type || '').startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp|avif|svg)$/i.test(file.name || '')) {
      this.showError('That file does not look like a picture. Try a JPG, PNG or WebP.');
      return;
    }
    this.setBusy('Opening…');
    try {
      await nextFrame();
      // Refuse huge pictures before decoding them, when the file header says how big they are.
      try {
        const head = await file.slice(0, 262144).arrayBuffer();
        const sn = sniffSize(head);
        const bad = sn && checkSize(sn.width, sn.height);
        if (bad) { this.showError(bad); return; }
      } catch { /* the check after decoding still applies */ }
      let bitmap;
      try { bitmap = await decode(file); } catch {
        this.showError('This browser could not open that file. Try a JPG, PNG or WebP.');
        return;
      }
      const size = dims(bitmap);
      const bad = checkSize(size.width, size.height);
      if (bad) { bitmap.close?.(); this.showError(bad); return; }

      // The preview is made from a smaller copy so the sliders stay fast on large pictures.
      const p = previewSize(size.width, size.height);
      const c = document.createElement('canvas');
      c.width = p.width; c.height = p.height;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.imageSmoothingQuality = 'high';
      x.drawImage(bitmap, 0, 0, p.width, p.height);
      const id = x.getImageData(0, 0, p.width, p.height);

      this.src?.close?.();
      this.src = bitmap; this.size = size;
      this.base = { data: id.data, width: p.width, height: p.height };
      this.name = file.name || 'image';
      this.s = { ...DEFAULTS };
      this.quality = 90;
      const t = (file.type || '').toLowerCase();
      this.format = t === 'image/jpeg' ? 'jpeg' : t === 'image/webp' ? 'webp' : 'png';
      this.el.name.textContent = this.name;
      this.el.drop.hidden = true;
      this.el.view.hidden = false;
      this.el.controls.disabled = false;
      this.root.classList.remove('is-empty');
      this.syncUI();
      this.draw();
    } catch (e) {
      this.showError('Something went wrong while opening that image. It may be too large for this device. Try a smaller one.');
    } finally { this.setBusy(''); }
  }

  schedule() {
    if (this.raf || !this.base) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); });
  }

  draw() {
    if (!this.base) return;
    const out = render(this.base, this.s);
    const c = this.el.canvas;
    if (c.width !== out.width || c.height !== out.height) { c.width = out.width; c.height = out.height; }
    this.ctx.putImageData(new ImageData(out.data, out.width, out.height), 0, 0);
  }

  /** Redo the edits on the full-size original, encode, and hand the file to the browser. */
  async download() {
    if (!this.src) return;
    this.showError('');
    const spec = exportSpec(this.format, this.quality);
    const s = normalise(this.s);
    this.el.download.disabled = true;
    this.setBusy('Making the full-size image…');
    let canvas = null;
    try {
      await nextFrame();
      const { width, height } = this.size;
      canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const x = canvas.getContext('2d', { willReadFrequently: true });
      x.drawImage(this.src, 0, 0);
      const id = x.getImageData(0, 0, width, height);
      let img = render({ data: id.data, width, height }, s, { inPlace: true });
      prepareForExport(img, this.format);
      canvas.width = img.width; canvas.height = img.height; // resizing clears it, so draw after
      canvas.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
      img = null;
      const blob = await toBlob(canvas, spec.mime, spec.quality);
      if (!blob) throw new Error('no blob');
      if (blob.type !== spec.mime) {
        this.showError(`This browser cannot save ${FORMATS[this.format].label}. Choose PNG or JPG instead.`);
        return;
      }
      await saveFile(blob, exportName(this.name, this.format));
    } catch (e) {
      this.showError('The full-size image could not be made. It may be too large for this device\'s memory. Try a smaller image, or another browser.');
    } finally {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      this.el.download.disabled = false;
      this.setBusy('');
    }
  }
}

const root = document.querySelector('[data-tool]');
if (root) new Editor(root);
