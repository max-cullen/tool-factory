// Image Resizer: browser wiring. Everything runs on this device; nothing is uploaded or fetched.
import {
  FORMATS, parsePixels, parsePercent, targetSize, heightForWidth, widthForHeight, placement, stepDownPlan,
  validateLimits, checkSource, outputName, uniqueName, formatBytes, normaliseHex, clampQuality, describeChange,
} from './resize-math.mjs';

const MAX_FILES = 50;
const root = document.querySelector('[data-tool]');

if (root) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const el = {
    drop: $('[data-drop]'), file: $('[data-file]'), files: $('[data-files]'), list: $('[data-list]'), status: $('[data-status]'), err: $('[data-err]'),
    add: $('[data-add]'), clear: $('[data-clear]'),
    w: $('[data-w]'), h: $('[data-h]'), lock: $('[data-lock]'), lockHint: $('[data-lock-hint]'), pct: $('[data-pct]'),
    bg: $('[data-bg]'), bgHex: $('[data-bg-hex]'), transparent: $('[data-transparent]'), transparentRow: $('[data-transparent-row]'),
    q: $('[data-q]'), qOut: $('[data-q-out]'), qWrap: $('[data-q-wrap]'), fitHint: $('[data-fit-hint]'), formatHint: $('[data-format-hint]'), msg: $('[data-setting-msg]'),
  };
  const sec = (n) => $(`[data-sec="${n}"]`);
  const radio = (name) => ($(`input[name="${name}"]:checked`) || {}).value;

  const FIT_HINTS = {
    stretch: 'Fills the new size exactly. If the shape is different, the picture looks squashed or stretched.',
    fit: 'Keeps the whole picture and its shape. Any spare space is filled with the background colour.',
    fill: 'Keeps the shape and covers the whole frame. The edges that do not fit are cropped, around the centre.',
  };
  const FORMAT_HINTS = {
    png: 'PNG keeps every pixel and any transparency. Files can be large for photos, and there is no quality setting.',
    jpeg: 'JPG is the usual choice for photos. It has no transparency, so any see-through areas get the background colour.',
    webp: 'WebP is often smaller than JPG at similar quality and supports transparency. A few older programs can not open it.',
  };

  const state = { files: [], nextId: 1, driver: 'width', run: 0 };

  /* ---------- reading settings ---------- */
  const settings = () => ({
    mode: radio('mode'), width: parsePixels(el.w.value), height: parsePixels(el.h.value), percent: parsePercent(el.pct.value),
    lock: el.lock.getAttribute('aria-pressed') === 'true', driver: state.driver,
    fit: radio('fit'), format: radio('format'), quality: clampQuality(Number(el.q.value)),
    bg: normaliseHex(el.bgHex.value) || '#ffffff', transparent: el.transparent.checked,
  });
  const forcesBoth = (s) => s.mode === 'pixels' && !s.lock;
  const primary = () => state.files.find((f) => !f.loadError);

  /* ---------- UI sync ---------- */
  const syncSeg = () => $$('[data-seg]').forEach((seg) => seg.style.setProperty('--i', Math.max(0, [...seg.querySelectorAll('input')].findIndex((x) => x.checked))));
  function syncVisibility() {
    const s = settings();
    sec('pixels').hidden = s.mode !== 'pixels';
    sec('percent').hidden = s.mode !== 'percent';
    sec('fit').hidden = !forcesBoth(s);
    const showBg = s.format === 'jpeg' || (forcesBoth(s) && s.fit === 'fit');
    sec('bg').hidden = !showBg;
    el.transparentRow.hidden = s.format === 'jpeg';
    el.transparent.disabled = s.format === 'jpeg';
    el.qWrap.hidden = !FORMATS[s.format].lossy;
    el.fitHint.textContent = FIT_HINTS[s.fit];
    el.formatHint.textContent = FORMAT_HINTS[s.format];
    el.qOut.textContent = String(s.quality);
    el.lockHint.textContent = s.lock
      ? (state.files.length > 1 ? 'Aspect ratio is locked: every image gets this width (or height), and the other side follows its own shape.' : 'Aspect ratio is locked: change one side and the other follows.')
      : 'Aspect ratio is unlocked: both sides are used exactly as typed. Choose how to handle a different shape below.';
    syncSeg();
  }

  // With the lock on, show the other side for the first image so the fields agree.
  function syncLockedFields() {
    const s = settings(), p = primary();
    if (!s.lock || s.mode !== 'pixels' || !p) return;
    if (state.driver === 'width' && Number.isFinite(s.width)) el.h.value = String(heightForWidth(s.width, p.w, p.h));
    else if (state.driver === 'height' && Number.isFinite(s.height)) el.w.value = String(widthForHeight(s.height, p.w, p.h));
  }
  const clearPressed = () => $$('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  const markPresets = () => {
    const w = parsePixels(el.w.value), h = parsePixels(el.h.value);
    const lock = el.lock.getAttribute('aria-pressed') === 'true';
    $$('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(!lock && Number(b.dataset.w) === w && Number(b.dataset.h) === h)));
  };
  const markPct = () => { const v = parsePercent(el.pct.value); $$('[data-pct-chip]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.pctChip) === v))); };

  function settingProblem(s) {
    if (s.mode === 'percent') return Number.isFinite(s.percent) ? '' : 'Enter a percentage from 1 to 1000.';
    if (s.lock) {
      const v = state.driver === 'height' ? s.height : s.width;
      return Number.isFinite(v) ? '' : `Enter a ${state.driver} in pixels.`;
    }
    return Number.isFinite(s.width) && Number.isFinite(s.height) ? '' : 'Enter both a width and a height in pixels.';
  }

  /* ---------- files ---------- */
  function showError(text) { el.err.textContent = text; el.err.hidden = !text; }
  const dims = (w, h) => `${w.toLocaleString('en-AU')} × ${h.toLocaleString('en-AU')} px`;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('open')); };
      img.src = url;
    });
  }

  function buildCard(f) {
    const li = document.createElement('li');
    li.className = 'rs-file';
    li.innerHTML = `<div class="rs-thumb"><img alt="" decoding="async"></div>
      <div class="rs-info">
        <p class="rs-name"></p>
        <dl class="rs-sizes">
          <div class="rs-before"><dt>Before</dt><dd></dd></div>
          <div class="rs-after"><dt>After</dt><dd></dd></div>
        </dl>
        <p class="rs-msg" role="status"></p>
      </div>
      <div class="rs-actions">
        <button type="button" class="btn btn-success" data-dl disabled>Download</button>
        <button type="button" class="rs-remove" data-rm></button>
      </div>`;
    li.querySelector('.rs-name').textContent = f.file.name;
    li.querySelector('.rs-name').title = f.file.name;
    li.querySelector('[data-rm]').setAttribute('aria-label', `Remove ${f.file.name}`);
    li.querySelector('[data-rm]').textContent = '×';
    li.querySelector('.rs-before dd').textContent = f.loadError ? formatBytes(f.file.size) : `${dims(f.w, f.h)} · ${formatBytes(f.file.size)}`;
    li.querySelector('img').src = f.url || '';
    li.querySelector('[data-dl]').addEventListener('click', () => download(f));
    li.querySelector('[data-rm]').addEventListener('click', () => removeFile(f.id));
    f.card = li;
    return li;
  }

  function paintCard(f) {
    const c = f.card;
    if (!c) return;
    const msg = c.querySelector('.rs-msg'), after = c.querySelector('.rs-after dd'), dl = c.querySelector('[data-dl]');
    c.classList.toggle('is-working', !!f.working);
    msg.className = 'rs-msg';
    msg.textContent = '';
    if (f.loadError) { after.textContent = '–'; msg.classList.add('is-bad'); msg.textContent = f.loadError; dl.disabled = true; return; }
    if (f.error) { after.textContent = '–'; msg.classList.add('is-bad'); msg.textContent = f.error; dl.disabled = true; return; }
    if (f.result) {
      const r = f.result;
      after.replaceChildren(document.createTextNode(`${dims(r.width, r.height)} · ${formatBytes(r.blob.size)} `));
      const ch = document.createElement('span');
      ch.className = 'rs-change';
      ch.textContent = `(${describeChange(f.file.size, r.blob.size)})`;
      after.appendChild(ch);
      c.querySelector('img').src = r.url;
      if (r.note) { msg.classList.add('is-warn'); msg.textContent = r.note; }
      dl.disabled = false;
      dl.textContent = '';
      dl.insertAdjacentHTML('beforeend', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/></svg>');
      dl.append(` Download ${FORMATS[r.formatKey].label}`);
      return;
    }
    after.textContent = f.working ? 'Resizing…' : '–';
    dl.disabled = true;
  }

  function updateStatus() {
    const n = state.files.length;
    const ok = state.files.filter((f) => f.result).length;
    const bad = state.files.filter((f) => f.error || f.loadError).length;
    el.status.textContent = n === 0 ? '' : `${n} ${n === 1 ? 'image' : 'images'}${ok ? `, ${ok} ready` : ''}${bad ? `, ${bad} with a problem` : ''}`;
    el.files.hidden = n === 0;
    el.drop.hidden = n !== 0;
  }

  async function addFiles(list) {
    showError('');
    const incoming = [...list].filter((f) => f && (f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name)));
    if (!incoming.length) { if (list.length) showError('Those files are not images this tool can open. Choose JPG, PNG, WebP, GIF, BMP or AVIF.'); return; }
    let room = MAX_FILES - state.files.length;
    if (incoming.length > room) showError(`Up to ${MAX_FILES} images at a time. The first ${Math.max(room, 0)} were added.`);
    for (const file of incoming.slice(0, Math.max(room, 0))) {
      const f = { id: state.nextId++, file, w: 0, h: 0, img: null, url: '', result: null, error: '', loadError: '', working: true };
      try {
        const { img, url } = await loadImage(file);
        f.img = img; f.url = url; f.w = img.naturalWidth; f.h = img.naturalHeight;
        const bad = checkSource(f.w, f.h);
        if (bad) f.loadError = bad;
      } catch {
        f.loadError = /heic|heif/i.test(file.type + file.name) ? 'This browser can not open HEIC photos. Export it as a JPG first.' : 'This file could not be opened as an image.';
      }
      f.working = false;
      state.files.push(f);
      el.list.appendChild(buildCard(f));
      paintCard(f);
    }
    // First usable image fills empty size fields with its own size.
    const p = primary();
    if (p && !el.w.value && !el.h.value) { el.w.value = String(p.w); el.h.value = String(p.h); state.driver = 'width'; markPresets(); }
    syncLockedFields();
    syncVisibility();
    updateStatus();
    schedule(0);
  }

  function removeFile(id) {
    const i = state.files.findIndex((f) => f.id === id);
    if (i < 0) return;
    const [f] = state.files.splice(i, 1);
    releaseFile(f);
    f.card?.remove();
    syncLockedFields(); syncVisibility(); updateStatus(); schedule(0);
  }
  function releaseFile(f) {
    if (f.url) URL.revokeObjectURL(f.url);
    if (f.result) URL.revokeObjectURL(f.result.url);
    f.removed = true;
  }
  function clearAll() {
    state.run++;
    state.files.forEach(releaseFile);
    state.files = [];
    el.list.replaceChildren();
    showError('');
    updateStatus();
  }

  /* ---------- resizing ---------- */
  const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const smooth = (ctx) => { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; };

  function draw(img, srcW, srcH, outW, outH, fit, fill) {
    const p = placement(srcW, srcH, outW, outH, fit);
    const plan = stepDownPlan(Math.max(1, Math.round(p.sw)), Math.max(1, Math.round(p.sh)), p.dw, p.dh);
    let cur = img, rect = [p.sx, p.sy, p.sw, p.sh];
    const temps = [];
    for (const step of plan.slice(0, -1)) {
      const c = newCanvas(step.width, step.height), ctx = c.getContext('2d');
      if (!ctx) throw new Error('canvas');
      smooth(ctx);
      ctx.drawImage(cur, rect[0], rect[1], rect[2], rect[3], 0, 0, step.width, step.height);
      temps.push(c);
      cur = c; rect = [0, 0, step.width, step.height];
    }
    const out = newCanvas(outW, outH), ctx = out.getContext('2d');
    if (!ctx) throw new Error('canvas');
    smooth(ctx);
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(0, 0, outW, outH); }
    ctx.drawImage(cur, rect[0], rect[1], rect[2], rect[3], p.dx, p.dy, p.dw, p.dh);
    temps.forEach((c) => { c.width = 0; c.height = 0; });
    return out;
  }

  const toBlob = (canvas, mime, quality) => new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  const tick = () => new Promise((r) => setTimeout(r, 0));

  async function resizeOne(f, s) {
    const size = targetSize(f.w, f.h, s);
    if (!size) return { error: '' };
    const bad = validateLimits(f.w, f.h, size.width, size.height);
    if (bad) return { error: bad };
    const fit = forcesBoth(s) ? s.fit : 'stretch';
    const fmt = FORMATS[s.format];
    const fill = s.format === 'jpeg' ? s.bg : (fit === 'fit' && !s.transparent ? s.bg : null);
    let canvas;
    try { canvas = draw(f.img, f.w, f.h, size.width, size.height, fit, fill); } catch { return { error: 'Your browser could not make an image of this size. Try a smaller size.' }; }
    const blob = await toBlob(canvas, fmt.mime, fmt.lossy ? s.quality / 100 : undefined);
    canvas.width = 0; canvas.height = 0;
    if (!blob) return { error: 'Your browser could not save an image of this size. Try a smaller size.' };
    let formatKey = s.format, note = '';
    if (blob.type && blob.type !== fmt.mime) {
      formatKey = Object.keys(FORMATS).find((k) => FORMATS[k].mime === blob.type) || 'png';
      note = `This browser can not save ${fmt.label}, so the image was saved as ${FORMATS[formatKey].label} instead.`;
    }
    return { result: { blob, url: URL.createObjectURL(blob), width: size.width, height: size.height, formatKey, note } };
  }

  async function runAll() {
    const token = ++state.run;
    const s = settings();
    const problem = settingProblem(s);
    el.msg.hidden = !problem;
    el.msg.textContent = problem;
    const used = new Set();
    for (const f of [...state.files]) {
      if (token !== state.run) return;
      if (f.loadError) continue;
      if (problem) {
        if (f.result) { URL.revokeObjectURL(f.result.url); f.result = null; }
        f.error = ''; f.working = false; paintCard(f); continue;
      }
      f.working = true; paintCard(f);
      await tick();
      if (token !== state.run || f.removed) return;
      const r = await resizeOne(f, s);
      if (token !== state.run || f.removed) { if (r.result) URL.revokeObjectURL(r.result.url); return; }
      if (f.result) URL.revokeObjectURL(f.result.url);
      f.working = false;
      f.error = r.error || '';
      f.result = r.result || null;
      if (f.result) { f.result.name = uniqueName(outputName(f.file.name, f.result.width, f.result.height, f.result.formatKey), used); }
      paintCard(f);
      updateStatus();
    }
    updateStatus();
  }
  let timer = 0;
  function schedule(ms = 180) { clearTimeout(timer); timer = setTimeout(runAll, ms); }

  function download(f) {
    if (!f.result) return;
    const a = document.createElement('a');
    a.href = f.result.url; a.download = f.result.name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- events ---------- */
  el.drop.addEventListener('click', () => el.file.click());
  el.add.addEventListener('click', () => el.file.click());
  el.clear.addEventListener('click', clearAll);
  el.file.addEventListener('change', () => { const l = [...el.file.files]; el.file.value = ''; addFiles(l); });
  const stage = $('[data-stage]');
  ['dragenter', 'dragover'].forEach((t) => stage.addEventListener(t, (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); el.drop.classList.add('is-over'); } }));
  ['dragleave', 'drop'].forEach((t) => stage.addEventListener(t, (e) => { if (t === 'dragleave' && stage.contains(e.relatedTarget)) return; el.drop.classList.remove('is-over'); }));
  stage.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
  document.addEventListener('paste', (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); addFiles(fs); } });

  el.w.addEventListener('input', () => { state.driver = 'width'; syncLockedFields(); clearPressed(); markPresets(); schedule(); syncVisibility(); });
  el.h.addEventListener('input', () => { state.driver = 'height'; syncLockedFields(); clearPressed(); markPresets(); schedule(); syncVisibility(); });
  el.pct.addEventListener('input', () => { markPct(); schedule(); });
  el.lock.addEventListener('click', () => {
    el.lock.setAttribute('aria-pressed', String(el.lock.getAttribute('aria-pressed') !== 'true'));
    syncLockedFields(); markPresets(); syncVisibility(); schedule(0);
  });
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const modePx = $('input[name="mode"][value="pixels"]');
    modePx.checked = true;
    el.lock.setAttribute('aria-pressed', 'false');
    el.w.value = b.dataset.w; el.h.value = b.dataset.h;
    markPresets(); syncVisibility(); schedule(0);
  }));
  $$('[data-pct-chip]').forEach((b) => b.addEventListener('click', () => { el.pct.value = b.dataset.pctChip; markPct(); schedule(0); }));
  $$('input[name="mode"], input[name="fit"], input[name="format"]').forEach((r) => r.addEventListener('change', () => {
    if (r.name === 'mode') { syncLockedFields(); }
    syncVisibility(); schedule(0);
  }));
  el.q.addEventListener('input', () => { syncVisibility(); schedule(); });
  el.bg.addEventListener('input', () => { el.bgHex.value = el.bg.value.toUpperCase(); el.bgHex.classList.remove('is-bad'); schedule(); });
  el.bgHex.addEventListener('input', () => {
    const hex = normaliseHex(el.bgHex.value);
    if (hex) { el.bg.value = hex; schedule(); }
  });
  el.bgHex.addEventListener('blur', () => { const hex = normaliseHex(el.bgHex.value); el.bgHex.value = (hex || el.bg.value).toUpperCase(); });
  el.transparent.addEventListener('change', () => schedule(0));

  markPct(); syncVisibility(); updateStatus();
}
