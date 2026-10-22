// Fitpic tool UI. Wires the page controls to the image-fit engine. Everything runs in the browser.
import { loadImage, fitImage, makePreview, suggestName, formatBytes } from './engine/engine.js';

const $ = (el, sel) => el.querySelector(sel);
const $$ = (el, sel) => [...el.querySelectorAll(sel)];
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const num = (v) => Number(String(v ?? '').replace(',', '.').trim());

const ICONS = {
  good: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M5.2 8.2l2 2 3.6-4"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v3.6M8 5.2v.1"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.2l6 10.6H2z"/><path d="M8 6.6v2.8M8 11.2v.1"/></svg>',
  bad: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4"/></svg>',
};
const HANDLE_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0b0c10" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 4L2.5 8l3 4M10.5 4l3 4-3 4"/></svg>';
const EXT = { jpeg: 'JPG', webp: 'WebP', png: 'PNG' };
// The example opens at a small size so the before/after difference is easy to see.
const DEMO_KB = '25';
const WIGGLE_EVERY_MS = 5000;
const FORMAT_HINTS = {
  jpeg: 'JPEG is accepted by almost every upload form.',
  webp: 'WebP is smaller at the same quality, but some forms do not accept it.',
  png: 'PNG is lossless, so reaching a small size means making the picture smaller. JPEG is usually the better choice.',
};

/** The example photo the tool opens with (public domain, see tools/fitpic/assets-src/README.md). */
const SAMPLE_URL = new URL('example-photo.jpg', import.meta.url);
async function makeSampleFile() {
  const res = await fetch(SAMPLE_URL);
  if (!res.ok) throw new Error('example photo missing');
  return new File([await res.blob()], 'example-photo.jpg', { type: 'image/jpeg' });
}

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function saveFile(blob, name) {
  try {
    const d = window.claude?.use ? await window.claude.use('downloads') : null;
    if (d) { await d.save({ filename: name, data: blob }); return; }
  } catch (e) { if (e && e.code === 'declined') return; }
  // iPhone/iPad: the share sheet offers "Save Image" (to Photos) and "Save to Files", which is what people expect there.
  if (IS_IOS && navigator.canShare) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
  // Keep the file available for a while: phones often ask "Download?" first, and the link must still work when tapped.
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 120000);
}

function tween(el, to, from) {
  if (reduceMotion() || !(from > 0) || Math.abs(from - to) < 1) { el.textContent = formatBytes(to); return; }
  const t0 = performance.now(), dur = 480;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = formatBytes(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

class Tool {
  constructor(root) {
    this.root = root;
    this.s = { mode: root.dataset.mode || 'kb', unit: 'KB', max: root.dataset.kb ? String(Number(root.dataset.kb) >= 1000 ? Number(root.dataset.kb) / 1000 : root.dataset.kb) : '100', minOn: false, min: '20', w: root.dataset.w || '', h: root.dataset.h || '', fit: 'cover', format: 'jpeg' };
    if (Number(root.dataset.kb) >= 1000) this.s.unit = 'MB';
    this.image = null; this.fileName = ''; this.sample = false;
    this.runId = 0; this.abort = null; this.afterUrl = null; this.beforeUrl = null; this.lastBytes = 0; this.last = null; this.cmpP = 50;
    this.sizeTouched = false; this.cmpTouched = false; this.cmpSet = null;
    this.el = {
      stage: $(root, '[data-stage]'), drop: $(root, '[data-drop]'), file: $(root, '[data-file]'), view: $(root, '[data-view]'),
      readout: $(root, '[data-readout]'), top: $(root, '[data-stage-top]'), name: $(root, '[data-name]'), example: $(root, '[data-example]'),
      busy: $(root, '[data-busy]'), err: $(root, '[data-err]'), dl: $(root, '[data-download]'), choose: $(root, '[data-choose]'), chooseMain: $$(root, '[data-choose-main]'),
      from: $(root, '[data-from]'), to: $(root, '[data-to]'), delta: $(root, '[data-delta]'), bar: $(root, '[data-bar]'),
      dim: $(root, '[data-dim]'), q: $(root, '[data-q]'), fmt: $(root, '[data-fmt]'), notes: $(root, '[data-notes]'), msg: $(root, '[data-msg]'),
      maxIn: $(root, '[data-max]'), minIn: $(root, '[data-min]'), minWrap: $(root, '[data-min-wrap]'), minOn: $(root, '[data-min-on]'),
      w: $(root, '[data-w]'), h: $(root, '[data-h]'), fitWrap: $(root, '[data-fit-wrap]'), fmtHint: $(root, '[data-format-hint]'),
    };
    this.rerun = debounce(() => this.run(), 280);
    this.bind();
    this.syncUI();
    this.scheduleSample();
    this.startWiggle();
  }

  bind() {
    const { el, root } = this;
    el.drop.addEventListener('click', () => el.file.click());
    el.choose.addEventListener('click', () => el.file.click());
    el.chooseMain.forEach((b) => b.addEventListener('click', () => el.file.click()));
    el.file.addEventListener('change', () => { const f = el.file.files?.[0]; if (f) this.loadFile(f); el.file.value = ''; });

    const stage = el.stage;
    ['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add('is-over'); el.drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && stage.contains(e.relatedTarget)) return;
      stage.classList.remove('is-over'); el.drop.classList.remove('is-over');
    }));
    stage.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) this.loadFile(f); });
    document.addEventListener('paste', (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); this.loadFile(f); }
    });

    $(root, '[data-panel]').addEventListener('submit', (e) => e.preventDefault());
    $$(root, 'input[name="mode"]').forEach((i) => i.addEventListener('change', () => { this.s.mode = i.value; this.syncUI(); this.run(); }));
    $$(root, 'input[name="unit"]').forEach((i) => i.addEventListener('change', () => { this.sizeTouched = true; this.s.unit = i.value; this.syncUI(); this.run(); }));
    $$(root, 'input[name="fit"]').forEach((i) => i.addEventListener('change', () => { this.s.fit = i.value; this.syncUI(); this.run(); }));
    $$(root, 'input[name="format"]').forEach((i) => i.addEventListener('change', () => { this.s.format = i.value; this.syncUI(); this.run(); }));

    el.maxIn.addEventListener('input', () => { this.sizeTouched = true; this.s.max = el.maxIn.value; this.syncUI(false); this.rerun(); });
    el.minIn.addEventListener('input', () => { this.s.min = el.minIn.value; this.syncUI(false); this.rerun(); });
    el.minOn.addEventListener('change', () => { this.s.minOn = el.minOn.checked; this.syncUI(); this.run(); });
    el.w.addEventListener('input', () => { this.s.w = el.w.value; this.syncUI(false); this.rerun(); });
    el.h.addEventListener('input', () => { this.s.h = el.h.value; this.syncUI(false); this.rerun(); });

    $$(root, '[data-kb-chip]').forEach((b) => b.addEventListener('click', () => {
      const kb = Number(b.dataset.kbChip);
      this.sizeTouched = true;
      if (kb >= 1000) { this.s.unit = 'MB'; this.s.max = String(kb / 1000); } else { this.s.unit = 'KB'; this.s.max = String(kb); }
      this.syncUI(); this.run();
    }));
    $$(root, '[data-px-chip]').forEach((b) => b.addEventListener('click', () => {
      this.s.w = b.dataset.w || ''; this.s.h = b.dataset.h || '';
      this.syncUI(); this.run();
    }));
    const more = $(root, '[data-more-toggle]');
    more?.addEventListener('click', () => {
      const open = !root.classList.contains('show-more');
      root.classList.toggle('show-more', open);
      more.setAttribute('aria-expanded', String(open));
      $(more, '[data-more-label]').textContent = open ? 'Fewer options' : 'More options';
    });
    el.dl.addEventListener('click', () => { if (this.last) saveFile(this.last.blob, suggestName(this.sample ? 'example-photo' : this.fileName, this.last)); });
  }

  /** Push state into the controls. `full` false keeps the text the person is typing untouched. */
  syncUI(full = true) {
    const { s, el, root } = this;
    $$(root, '[data-seg]').forEach((seg) => {
      const name = $(seg, 'input').name;
      const val = { mode: s.mode, unit: s.unit, fit: s.fit, format: s.format }[name];
      const inputs = $$(seg, 'input');
      inputs.forEach((i) => { i.checked = i.value === val; });
      seg.style.setProperty('--i', Math.max(0, inputs.findIndex((i) => i.checked)));
    });
    $$(root, '[data-sec]').forEach((sec) => { sec.hidden = !(s.mode === 'both' || sec.dataset.sec === s.mode); });
    $$(root, '[data-unit]').forEach((u) => { u.textContent = s.unit; });
    if (full) {
      el.maxIn.value = s.max; el.minIn.value = s.min; el.minOn.checked = s.minOn; el.w.value = s.w; el.h.value = s.h;
    }
    el.minWrap.hidden = !s.minOn;
    const kbNow = num(s.max) * (s.unit === 'MB' ? 1000 : 1);
    $$(root, '[data-kb-chip]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.kbChip) === kbNow)));
    $$(root, '[data-px-chip]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.w || '') === s.w && (b.dataset.h || '') === s.h)));
    el.fitWrap.hidden = !(s.mode !== 'kb' && num(s.w) > 0 && num(s.h) > 0);
    el.fmtHint.textContent = FORMAT_HINTS[s.format];
    el.maxIn.parentElement.classList.toggle('is-bad', !(num(s.max) > 0));
  }

  options() {
    const s = this.s, o = { format: s.format };
    const useKB = s.mode !== 'px', usePx = s.mode !== 'kb';
    if (useKB) {
      const max = num(s.max);
      if (!(max > 0)) return { error: 'Enter a maximum size above zero.' };
      const toKB = (v) => (s.unit === 'MB' ? v * 1000 : v);
      o.maxKB = toKB(max);
      if (s.minOn) {
        const min = num(s.min);
        if (min > 0) {
          if (toKB(min) >= o.maxKB) return { error: 'The minimum has to be smaller than the maximum.' };
          o.minKB = toKB(min);
        }
      }
    }
    if (usePx) {
      const w = Math.round(num(s.w)), h = Math.round(num(s.h));
      if (!(w > 0) && !(h > 0)) {
        if (!useKB) return { error: 'Enter a width, a height, or both.' };
      } else {
        if (w > 20000 || h > 20000) return { error: 'Width and height can be up to 20,000 pixels.' };
        if (w > 0) o.width = w;
        if (h > 0) o.height = h;
        if (w > 0 && h > 0) o.fit = s.fit;
      }
    }
    return { opts: o };
  }

  setBusy(on) {
    clearTimeout(this.busyTimer);
    if (!on) { this.el.busy.hidden = true; this.el.stage.classList.remove('is-working'); return; }
    this.busyTimer = setTimeout(() => { this.el.busy.hidden = false; this.el.stage.classList.add('is-working'); }, 140);
  }

  showError(msg) {
    this.el.err.hidden = !msg;
    this.el.err.innerHTML = msg ? `<div class="note note-bad" role="alert">${ICONS.bad}<span></span></div>` : '';
    if (msg) $(this.el.err, 'span').textContent = msg;
  }

  /** While the example photo is showing, the big "Choose your photo" button sits under it and Download is secondary. */
  setCta() {
    const { dl, choose, chooseMain } = this.el;
    const ex = this.sample;
    chooseMain.forEach((b) => { b.hidden = !ex; });
    choose.hidden = ex;
    if (ex) { dl.disabled = true; dl.textContent = 'Download'; }
    dl.classList.toggle('btn-success', !ex); dl.classList.toggle('btn-ghost', ex);
  }

  async loadFile(file, { sample = false } = {}) {
    this.setBusy(true);
    this.runId++; this.abort?.abort();
    try {
      const img = await loadImage(file);
      const preview = await makePreview(img);
      this.image?.dispose();
      if (this.beforeUrl) URL.revokeObjectURL(this.beforeUrl);
      this.image = img; this.sample = sample; this.fileName = file.name || 'photo';
      // Example photo: open at a small target so the difference shows. The visitor's own photo goes back to 100 KB,
      // unless they changed the size themselves. Pages with their own preset (e.g. /compress-image-to-500kb/) are left alone.
      if (!this.root.dataset.kb && !this.sizeTouched) { this.s.unit = 'KB'; this.s.max = sample ? DEMO_KB : '100'; this.syncUI(); }
      this.beforeUrl = URL.createObjectURL(preview);
      this.lastBytes = 0; this.cmpP = 50; this.last = null;
      this.showError('');
      this.el.drop.hidden = true; this.el.top.hidden = false; this.el.view.hidden = true; this.el.readout.hidden = true;
      this.el.dl.disabled = true;
      this.el.name.textContent = sample ? 'example-photo.jpg' : `${this.fileName}  ${img.width} × ${img.height}`;
      this.el.example.hidden = !sample;
      this.setCta();
      this.run();
    } catch (e) {
      this.setBusy(false);
      this.showError(e?.message || 'That photo could not be read.');
    }
  }

  async run() {
    if (!this.image) return;
    const { opts, error } = this.options();
    this.el.msg.textContent = error || '';
    this.el.msg.className = error ? 'hint text-bad' : 'hint';
    if (error) { this.el.dl.disabled = true; return; }
    const id = ++this.runId;
    this.abort?.abort();
    const ac = (this.abort = new AbortController());
    this.setBusy(true);
    try {
      const r = await fitImage(this.image, { ...opts, signal: ac.signal });
      if (id !== this.runId) return;
      this.showResult(r);
    } catch (e) {
      if (e?.code === 'aborted' || id !== this.runId) return;
      this.el.msg.textContent = e?.message || 'Something went wrong while fitting the photo.';
      this.el.msg.className = 'hint text-bad';
    } finally {
      if (id === this.runId) this.setBusy(false);
    }
  }

  showResult(r) {
    const { el } = this;
    this.last = r;
    el.view.hidden = false; el.readout.hidden = false;
    if (this.afterUrl) URL.revokeObjectURL(this.afterUrl);
    this.afterUrl = URL.createObjectURL(r.blob);

    // Always the before/after slider. If the shape changed (crop, stretch or fit inside), the frame takes the new shape
    // and the original is shown the same way, so the two line up.
    const oa = r.originalWidth / r.originalHeight, na = r.width / r.height;
    const same = Math.abs(na / oa - 1) < 0.012;
    const fit = this.options().opts?.fit || 'stretch';
    const beforeFit = same ? 'cover' : { cover: 'cover', contain: 'contain', stretch: 'fill' }[fit] || 'fill';
    el.view.innerHTML = `<div class="cmp" data-cmp style="--ar:${(same ? oa : na).toFixed(4)};--p:${this.cmpP}%">
        <img class="after" alt="Fitted photo" src="${this.afterUrl}"><img class="before" alt="Original photo" src="${this.beforeUrl}" style="object-fit:${beforeFit}">
        <span class="cmp-tag" style="left:10px">Original</span><span class="cmp-tag" style="right:10px">Fitted</span>
        <div class="cmp-handle" role="slider" tabindex="0" aria-label="Compare original and fitted" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(this.cmpP)}"><i>${HANDLE_ICON}</i></div></div>`;
    this.bindCompare($(el.view, '[data-cmp]'));

    el.from.textContent = formatBytes(r.originalBytes);
    tween(el.to, r.bytes, this.lastBytes || r.originalBytes);
    this.lastBytes = r.bytes;
    const pct = (1 - r.bytes / r.originalBytes) * 100;
    el.delta.textContent = r.status === 'unchanged' ? 'Already fits' : pct >= 1 ? `−${Math.round(pct)}%` : pct <= -1 ? `+${Math.round(-pct)}%` : 'Same size';
    el.delta.style.background = pct <= -1 ? 'var(--color-warn-soft)' : '';
    el.delta.style.color = pct <= -1 ? 'var(--color-warn)' : '';
    el.bar.style.setProperty('--w', `${Math.max(2, Math.min(100, (r.bytes / r.originalBytes) * 100)).toFixed(1)}%`);
    el.dim.textContent = r.width === r.originalWidth && r.height === r.originalHeight ? `${r.width} × ${r.height}` : `${r.originalWidth}×${r.originalHeight} → ${r.width}×${r.height}`;
    el.q.textContent = r.quality == null ? 'Lossless' : `${Math.round(r.quality * 100)}%`;
    el.fmt.textContent = EXT[r.format] || r.format.toUpperCase();

    const notes = [];
    const limit = this.last && this.options().opts?.maxKB;
    if (r.status === 'ok' || r.status === 'padded') notes.push(['good', limit ? `${formatBytes(r.bytes)}, within your ${formatBytes(limit * 1000)} limit.` : 'Done.']);
    if (r.status === 'unchanged') notes.push(['info', 'This photo already fits, so it is returned exactly as it is.']);
    r.warnings.forEach((w) => notes.push([r.status === 'over-limit' ? 'bad' : r.status === 'padded' ? 'info' : 'warn', w]));
    const o = this.options().opts || {};
    if ((o.width && o.width > r.originalWidth) || (o.height && o.height > r.originalHeight)) notes.push(['info', 'Larger than the original: the pixels are enlarged, but no detail can be added.']);
    el.notes.innerHTML = notes.map(([k]) => `<div class="note note-${k}">${ICONS[k]}<span></span></div>`).join('');
    $$(el.notes, 'span').forEach((sp, i) => { sp.textContent = notes[i][1]; });

    el.dl.disabled = this.sample; // the example is only a demo: Download unlocks once the visitor's own photo is in
    el.dl.textContent = this.sample ? 'Download' : `Download ${formatBytes(r.bytes)} ${EXT[r.format]}`;
    el.msg.textContent = ''; el.msg.className = 'hint';
  }

  bindCompare(cmp) {
    const handle = $(cmp, '.cmp-handle');
    const set = (p) => {
      this.cmpP = Math.max(0, Math.min(100, p));
      cmp.style.setProperty('--p', `${this.cmpP}%`);
      handle.setAttribute('aria-valuenow', String(Math.round(this.cmpP)));
    };
    const fromEvent = (e) => { const r = cmp.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    this.cmpSet = set;
    let down = false;
    cmp.addEventListener('pointerdown', (e) => { down = true; this.cmpTouched = true; cmp.classList.remove('is-wiggling'); cmp.setPointerCapture?.(e.pointerId); fromEvent(e); });
    cmp.addEventListener('pointermove', (e) => { if (down) fromEvent(e); });
    ['pointerup', 'pointercancel'].forEach((ev) => cmp.addEventListener(ev, () => { down = false; }));
    handle.addEventListener('keydown', (e) => {
      this.cmpTouched = true;
      const step = e.shiftKey ? 20 : 5;
      if (e.key === 'ArrowLeft') { set(this.cmpP - step); e.preventDefault(); }
      if (e.key === 'ArrowRight') { set(this.cmpP + step); e.preventDefault(); }
      if (e.key === 'Home') { set(0); e.preventDefault(); }
      if (e.key === 'End') { set(100); e.preventDefault(); }
    });
  }

  /** A small left-right nudge of the slider every few seconds, until the visitor touches it. */
  startWiggle() {
    if (reduceMotion()) return;
    const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
    const tick = () => {
      if (this.cmpTouched) return clearInterval(this.wiggleTimer);
      const cmp = $(this.el.view, '[data-cmp]');
      if (!cmp || document.hidden || this.el.view.hidden || this.el.stage.classList.contains('is-working') || !this.cmpSet) return;
      const r = cmp.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const start = this.cmpP, amp = 9, dur = 1100, t0 = performance.now();
      // out right, back past centre, settle: one smooth wave
      const frame = (now) => {
        if (this.cmpTouched) return;
        const t = Math.min(1, (now - t0) / dur);
        const wave = Math.sin(t * Math.PI * 2) * (1 - ease(t) * 0.35);
        this.cmpSet(start + amp * wave * (t < 1 ? 1 : 0));
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    this.wiggleTimer = setInterval(tick, WIGGLE_EVERY_MS);
    setTimeout(tick, 1600); // first nudge soon after the example appears
  }

  scheduleSample() {
    if (this.root.dataset.sample === 'off') return;
    const go = async () => {
      if (this.image) return;
      try { const f = await makeSampleFile(); if (!this.image) await this.loadFile(f, { sample: true }); } catch (_) { /* the drop zone stays */ }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 300);
  }
}

document.querySelectorAll('[data-tool]').forEach((root) => { window.__tool = new Tool(root); });
