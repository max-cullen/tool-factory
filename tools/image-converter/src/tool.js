// Image Converter: browser entry point. Everything runs on this device; nothing is sent anywhere.
// Pure logic lives in convert-plan.mjs and zip.mjs (tested in ../tests). This file holds only DOM and canvas code.
import { FORMATS, DEFAULT_BACKGROUND, checkInput, checkDimensions, qualityArg, clampQuality, normaliseHex, needsBackground, showsQuality, outputName, formatBytes, changeSummary } from './convert-plan.mjs';
import { createZip } from './zip.mjs';
import { readImageSize } from './image-size.mjs';

const root = document.querySelector('[data-tool]');
if (root) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const el = {
    drop: $('[data-drop]'), file: $('[data-file]'), status: $('[data-status]'), bar: $('[data-progress]'), results: $('[data-results]'),
    actions: $('[data-actions]'), zip: $('[data-zip]'), zipLabel: $('[data-zip-label]'), clear: $('[data-clear]'), stage: $('[data-stage]'),
    seg: $('[data-format-seg]'), qBlock: $('[data-quality-block]'), q: $('[data-quality]'), qVal: $('[data-quality-val]'),
    bgBlock: $('[data-bg-block]'), bg: $('[data-bg]'), bgVal: $('[data-bg-val]'), webpNote: $('[data-webp-note]'),
  };

  const state = { items: [], seq: 0, run: 0, webp: true, timer: 0, zipping: false };
  const settings = () => {
    const format = (root.querySelector('input[name="format"]:checked') || {}).value || 'jpg';
    return { format, quality: clampQuality(el.q.value), bg: normaliseHex(el.bg.value) || DEFAULT_BACKGROUND };
  };
  const keyOf = (s) => `${s.format}|${showsQuality(s.format) ? s.quality : ''}|${needsBackground(s.format) ? s.bg : ''}`;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  /* ---------- settings UI ---------- */
  const syncSettings = () => {
    const s = settings();
    const radios = $$('input[name="format"]');
    el.seg.style.setProperty('--i', Math.max(0, radios.findIndex((x) => x.checked)));
    el.qBlock.hidden = !showsQuality(s.format);
    el.bgBlock.hidden = !needsBackground(s.format);
    el.qVal.textContent = String(s.quality);
    el.bgVal.textContent = s.bg;
    $$('[data-bg-chip]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.bgChip === s.bg)));
    // The slider fill for Chromium and Safari (Firefox draws its own).
    el.q.style.background = `linear-gradient(to right, var(--color-accent) ${s.quality}%, transparent ${s.quality}%) 0 50% / 100% 6px no-repeat`;
  };

  const markWebpUnavailable = () => {
    state.webp = false;
    const w = root.querySelector('input[name="format"][value="webp"]');
    if (w) { w.disabled = true; if (w.checked) root.querySelector('input[name="format"][value="jpg"]').checked = true; }
    el.webpNote.hidden = false;
    syncSettings();
  };
  // Safari can open WebP but silently returns PNG when asked to save one, so test it for real.
  const detectWebp = () => new Promise((resolve) => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 2;
      c.toBlob((b) => resolve(!!b && b.type === 'image/webp'), 'image/webp', 0.8);
    } catch { resolve(false); }
  });

  /* ---------- conversion ---------- */
  const fail = (message) => Object.assign(new Error(message), { friendly: true });

  async function convertOne(file, s) {
    // Read the size from the file header first, so a huge image is refused before the browser tries to decode it.
    try {
      const head = readImageSize(new Uint8Array(await file.slice(0, 1048576).arrayBuffer()));
      if (head) { const early = checkDimensions(head.width, head.height); if (!early.ok) throw fail(early.reason); }
    } catch (err) { if (err && err.friendly) throw err; }
    const url = URL.createObjectURL(file);
    let img;
    try {
      img = new Image();
      img.decoding = 'async';
      img.src = url;
      try { await img.decode(); } catch { throw fail('This file could not be opened as an image. It may be damaged or not really an image.'); }
      const w = img.naturalWidth, h = img.naturalHeight;
      const dim = checkDimensions(w, h);
      if (!dim.ok) throw fail(dim.reason);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw fail('Your browser could not prepare space for this image. Try a smaller one.');
      if (needsBackground(s.format)) { ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0);
      const fmt = FORMATS[s.format];
      const blob = await new Promise((resolve) => { try { canvas.toBlob(resolve, fmt.mime, qualityArg(s.format, s.quality)); } catch { resolve(null); } });
      if (!blob) throw fail('Your browser could not create this image. It may be too large for this device. Try a smaller one.');
      if (blob.type !== fmt.mime) {
        if (s.format === 'webp') markWebpUnavailable();
        throw fail(`This browser cannot create ${fmt.label} files. Choose another format.`);
      }
      // Small thumbnail from the finished canvas, then free the big one.
      const scale = Math.min(1, 112 / Math.max(w, h));
      const thumb = make('canvas', 'ic-thumb-cv');
      thumb.width = Math.max(1, Math.round(w * scale)); thumb.height = Math.max(1, Math.round(h * scale));
      thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
      canvas.width = canvas.height = 0;
      return { blob, w, h, thumb };
    } finally {
      URL.revokeObjectURL(url);
      if (img) img.src = '';
    }
  }

  function assignNames(format) {
    const used = new Set();
    for (const it of state.items) { if (!it.inputError) it.outName = outputName(it.file.name, format, used); }
  }

  /* ---------- rendering ---------- */
  const rows = new Map();
  function renderRow(it) {
    let li = rows.get(it.id);
    if (!li) { li = make('li', 'ic-item'); rows.set(it.id, li); el.results.appendChild(li); }
    li.className = `ic-item is-${it.status}`;
    li.replaceChildren();
    const thumb = make('div', 'ic-thumb');
    if (it.result) thumb.appendChild(it.result.thumb);
    else if (it.status === 'working') thumb.appendChild(make('span', 'spin'));
    const meta = make('div', 'ic-meta');
    const title = make('p', 'ic-name', it.status === 'done' ? it.outName : it.file.name);
    title.title = it.file.name;
    title.translate = false;
    meta.appendChild(title);
    if (it.status === 'done') {
      const c = changeSummary(it.file.size, it.result.blob.size);
      const line = make('p', 'ic-size num');
      line.append(`${formatBytes(it.file.size)} → ${formatBytes(it.result.blob.size)} `);
      line.appendChild(make('span', `ic-delta is-${c.kind}`, c.text));
      meta.appendChild(line);
      meta.appendChild(make('p', 'ic-dim num', `${it.result.w} × ${it.result.h} px`));
    } else if (it.status === 'error') {
      const e = make('p', 'ic-error', it.error);
      e.setAttribute('role', 'alert');
      meta.appendChild(e);
    } else {
      meta.appendChild(make('p', 'ic-size', it.status === 'working' ? 'Converting…' : 'Waiting…'));
    }
    const act = make('div', 'ic-act');
    if (it.status === 'done') {
      const a = make('a', 'btn btn-ghost ic-dl');
      a.href = it.url; a.download = it.outName;
      a.setAttribute('aria-label', `Download ${it.outName}`);
      a.append(...[Object.assign(make('span', 'ic-ico'), { innerHTML: DOWN }), make('span', null, 'Download')]);
      act.appendChild(a);
    }
    const rm = make('button', 'ic-x');
    rm.type = 'button';
    rm.setAttribute('aria-label', `Remove ${it.file.name}`);
    rm.innerHTML = X;
    rm.addEventListener('click', () => removeItem(it.id));
    act.appendChild(rm);
    li.append(thumb, meta, act);
  }
  const DOWN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/></svg>';
  const X = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';

  function updateSummary(running = false, doneNow = 0, total = 0) {
    const done = state.items.filter((i) => i.status === 'done').length;
    const bad = state.items.filter((i) => i.status === 'error').length;
    const has = state.items.length > 0;
    el.actions.hidden = !has;
    el.zip.hidden = done < 2;
    el.zip.disabled = running || state.zipping;
    el.zipLabel.textContent = state.zipping ? 'Making ZIP…' : `Download all as ZIP (${done})`;
    el.stage.classList.toggle('has-files', has);
    el.status.hidden = !has;
    el.bar.hidden = !running;
    if (running) {
      el.status.textContent = `Converting ${Math.min(doneNow + 1, total)} of ${total}…`;
      el.bar.firstElementChild.style.width = `${Math.round((doneNow / Math.max(1, total)) * 100)}%`;
    } else if (has) {
      const parts = [`${done} converted`];
      if (bad) parts.push(`${bad} could not be converted`);
      el.status.textContent = parts.join(', ') + '.';
    } else el.status.textContent = '';
  }

  /* ---------- queue ---------- */
  async function run() {
    const my = ++state.run;
    const s = settings();
    const key = keyOf(s);
    assignNames(s.format);
    const todo = state.items.filter((it) => !it.inputError && !(it.status === 'done' && it.key === key));
    for (const it of todo) {
      if (it.url) { URL.revokeObjectURL(it.url); it.url = ''; }
      it.result = null; it.status = 'queued'; it.error = '';
    }
    state.items.forEach(renderRow);
    let n = 0;
    updateSummary(todo.length > 0, 0, todo.length);
    for (const it of todo) {
      if (my !== state.run) return;
      it.status = 'working';
      renderRow(it);
      await tick();
      try {
        const result = await convertOne(it.file, s);
        if (my !== state.run) return;
        it.result = result; it.url = URL.createObjectURL(result.blob); it.key = key; it.status = 'done';
      } catch (err) {
        if (my !== state.run) return;
        it.status = 'error';
        it.error = err && err.friendly ? err.message : 'Something went wrong converting this image.';
        if (!(err && err.friendly)) console.warn(err);
      }
      renderRow(it);
      n++;
      updateSummary(true, n, todo.length);
      await tick();
    }
    if (my === state.run) updateSummary(false);
  }
  const schedule = (delay = 0) => { clearTimeout(state.timer); state.timer = setTimeout(run, delay); };

  function addFiles(list) {
    const files = [...list];
    if (!files.length) return;
    for (const file of files) {
      const chk = checkInput(file);
      const it = { id: ++state.seq, file, status: 'queued', error: '', inputError: !chk.ok, result: null, url: '', key: '', outName: '' };
      if (!chk.ok) { it.status = 'error'; it.error = chk.reason; }
      state.items.push(it);
    }
    schedule();
  }

  function removeItem(id) {
    const i = state.items.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [it] = state.items.splice(i, 1);
    if (it.url) URL.revokeObjectURL(it.url);
    const li = rows.get(id);
    if (li) li.remove();
    rows.delete(id);
    assignNames(settings().format);
    state.items.forEach((x) => { if (x.status === 'done') renderRow(x); });
    updateSummary(false);
    if (state.items.some((x) => x.status === 'queued' || x.status === 'working')) schedule();
  }

  function clearAll() {
    state.run++;
    clearTimeout(state.timer);
    state.items.forEach((it) => { if (it.url) URL.revokeObjectURL(it.url); });
    state.items = [];
    rows.clear();
    el.results.replaceChildren();
    updateSummary(false);
  }

  async function downloadZip() {
    const done = state.items.filter((i) => i.status === 'done');
    if (done.length < 1 || state.zipping) return;
    state.zipping = true; updateSummary(false);
    try {
      const files = [];
      for (const it of done) { files.push({ name: it.outName, data: new Uint8Array(await it.result.blob.arrayBuffer()) }); await tick(); }
      const blob = new Blob([createZip(files)], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'converted-images.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      el.status.hidden = false;
      el.status.textContent = err instanceof RangeError ? err.message : 'The ZIP could not be made. Try downloading the files one at a time.';
    } finally { state.zipping = false; el.zip.disabled = false; el.zipLabel.textContent = `Download all as ZIP (${done.length})`; }
  }

  /* ---------- events ---------- */
  el.drop.addEventListener('click', () => el.file.click());
  el.file.addEventListener('change', () => { addFiles(el.file.files); el.file.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => el.stage.addEventListener(t, (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.drop.classList.add('is-over'); } }));
  el.stage.addEventListener('dragleave', (e) => { if (!el.stage.contains(e.relatedTarget)) el.drop.classList.remove('is-over'); });
  el.stage.addEventListener('drop', (e) => { e.preventDefault(); el.drop.classList.remove('is-over'); if (e.dataTransfer) addFiles(e.dataTransfer.files); });
  document.addEventListener('paste', (e) => {
    const files = e.clipboardData ? [...e.clipboardData.files].filter((f) => f.type.startsWith('image/')) : [];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  el.zip.addEventListener('click', downloadZip);
  el.clear.addEventListener('click', clearAll);

  $$('input[name="format"]').forEach((r) => r.addEventListener('change', () => { syncSettings(); schedule(150); }));
  el.q.addEventListener('input', () => { syncSettings(); schedule(350); });
  el.bg.addEventListener('input', () => { syncSettings(); schedule(350); });
  $$('[data-bg-chip]').forEach((c) => c.addEventListener('click', () => { el.bg.value = c.dataset.bgChip; syncSettings(); schedule(150); }));

  syncSettings();
  detectWebp().then((ok) => { if (!ok) markWebpUnavailable(); });
}
