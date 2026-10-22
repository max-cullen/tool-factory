// Image Cropper: browser entry point. Everything runs on this device; nothing is sent anywhere.
// Pure maths lives in crop-math.mjs (tested in ../tests). All crop coordinates are in SOURCE pixels;
// the preview is scaled for the screen and pointer movement is divided by that scale.
import {
  MAX_PIXELS, FORMATS, ratioValue, fitScale, checkImageSize, initialRect, moveRect, resizeRect, applyRatio, swapRect,
  roundRect, nudgeStep, nudgeRect, exportName,
} from './crop-math.mjs';

const root = document.querySelector('[data-tool]');
if (root) {
  const q = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const el = {
    stage: q('[data-stage]'), drop: q('[data-drop]'), file: q('[data-file]'), work: q('[data-work]'), frame: q('[data-frame]'),
    view: q('[data-view]'), canvas: q('[data-canvas]'), dim: q('[data-dim]'), box: q('[data-box]'),
    name: q('[data-name]'), origDim: q('[data-orig-dim]'), choose: q('[data-choose]'), busy: q('[data-busy]'),
    err: q('[data-err]'), errText: q('[data-err-text]'), swap: q('[data-swap]'),
    outSize: q('[data-out-size]'), outPos: q('[data-out-pos]'), outOrig: q('[data-out-orig]'), sr: q('[data-sr]'),
    qualityWrap: q('[data-quality-wrap]'), quality: q('[data-quality]'), qualityOut: q('[data-quality-out]'), fmtHint: q('[data-fmt-hint]'),
    download: q('[data-download]'), reset: q('[data-reset]'), result: q('[data-result]'),
  };
  const ratioBtns = $$('[data-ratio]');
  const fmtInputs = $$('[data-formats] input');
  const FMT_HINTS = {
    png: 'PNG keeps every pixel and any transparency. Photos make large files.',
    jpeg: 'JPG makes small photo files and works almost everywhere. It has no transparency, so clear areas become white.',
    webp: 'WebP is usually smaller than JPG at similar quality. A few older programs and forms do not accept it.',
  };
  const ERR = {
    notImage: 'That file is not an image this browser can open. Try a JPG, PNG, WebP, GIF or BMP. HEIC photos need to be saved as JPG first.',
    tooLarge: `That image is larger than ${MAX_PIXELS / 1e6} megapixels, which is too big to crop safely in a browser. Try a smaller copy.`,
    decode: 'The image could not be read. The file may be damaged or in a format this browser does not support.',
    export: 'Your browser could not make a file this large. Try a smaller crop, a different format, or another browser.',
  };

  // State. `rect` is in source pixels and may hold fractions while dragging; export rounds it.
  const s = { bitmap: null, w: 0, h: 0, rect: null, scale: 1, ratioKey: 'free', orient: 'landscape', format: 'png', fileName: 'image', drag: null };
  let loadId = 0, srTimer = 0, objectUrl = '';

  const ratio = () => ratioValue(s.ratioKey, s.orient);
  const bounds = () => ({ w: s.w, h: s.h });
  const fmtNum = (n) => Math.round(n).toLocaleString('en-AU');
  const bytes = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
  const showError = (msg) => { el.errText.textContent = msg; el.err.hidden = false; };
  const clearError = () => { el.err.hidden = true; el.errText.textContent = ''; };
  const setBusy = (on) => { el.busy.hidden = !on; };

  /* ---------- segmented control pill ---------- */
  $$('[data-seg]').forEach((seg) => {
    const inputs = [...seg.querySelectorAll('input')];
    const sync = () => seg.style.setProperty('--i', Math.max(0, inputs.findIndex((x) => x.checked)));
    inputs.forEach((x) => x.addEventListener('change', sync));
    sync();
  });

  /* ---------- loading ---------- */
  function readDims(file) {
    // Dimensions come from an <img> (which applies the EXIF turn like the final bitmap does), before any big decode.
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode'));
      img.src = objectUrl;
    });
  }

  async function loadFile(file) {
    if (!file) return;
    const id = ++loadId;
    clearError();
    if (file.type && !file.type.startsWith('image/')) { showError(ERR.notImage); return; }
    setBusy(true);
    try {
      const img = await readDims(file);
      if (id !== loadId) return;
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const ok = checkImageSize(nw, nh);
      if (!ok.ok) { showError(ok.reason === 'too-large' ? ERR.tooLarge : ERR.decode); return; }
      let bitmap = null;
      if (typeof createImageBitmap === 'function') {
        try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bitmap = null; }
      }
      if (id !== loadId) return;
      const source = bitmap || img;
      const w = bitmap ? bitmap.width : nw, h = bitmap ? bitmap.height : nh;
      if (!checkImageSize(w, h).ok || w * h > MAX_PIXELS) { showError(ERR.tooLarge); return; }
      if (s.bitmap && s.bitmap.close && s.bitmap !== source) { try { s.bitmap.close(); } catch { /* ignore */ } }
      Object.assign(s, { bitmap: source, w, h, fileName: file.name || 'image' });
      // Default the export format to the input's.
      s.format = /png/.test(file.type) ? 'png' : /webp/.test(file.type) ? 'webp' : 'jpeg';
      fmtInputs.forEach((x) => { x.checked = x.value === s.format; });
      fmtInputs.find((x) => x.checked)?.dispatchEvent(new Event('change'));
      syncFormat();
      s.rect = initialRect(bounds(), ratio());
      root.dataset.state = 'ready';
      el.drop.hidden = true; el.work.hidden = false;
      el.name.textContent = s.fileName;
      el.origDim.textContent = `${fmtNum(w)} × ${fmtNum(h)} px`;
      el.outOrig.textContent = `${fmtNum(w)} × ${fmtNum(h)} px`;
      el.download.disabled = false; el.reset.disabled = false;
      el.result.textContent = '';
      layout();
      announce();
    } catch {
      if (id === loadId) showError(ERR.decode);
    } finally {
      if (id === loadId) setBusy(false);
    }
  }

  /* ---------- drawing ---------- */
  function layout() {
    if (!s.bitmap) return;
    const availW = Math.max(120, el.frame.clientWidth - 28);
    const availH = Math.max(220, Math.min(window.innerHeight * 0.68, 640));
    s.scale = fitScale(s.w, s.h, availW, availH);
    const dw = Math.max(1, Math.round(s.w * s.scale)), dh = Math.max(1, Math.round(s.h * s.scale));
    s.scale = dw / s.w;
    el.view.style.width = `${dw}px`; el.view.style.height = `${dh}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.min(s.w, Math.round(dw * dpr)), ch = Math.min(s.h, Math.round(dh * dpr));
    if (el.canvas.width !== cw || el.canvas.height !== ch) { el.canvas.width = cw; el.canvas.height = ch; }
    const ctx = el.canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(s.bitmap, 0, 0, cw, ch);
    render();
  }

  function render() {
    if (!s.rect) return;
    const r = s.rect, k = s.scale;
    for (const t of [el.box, el.dim]) {
      t.style.left = `${r.x * k}px`; t.style.top = `${r.y * k}px`;
      t.style.width = `${r.w * k}px`; t.style.height = `${r.h * k}px`;
    }
    const out = roundRect(r, bounds(), ratio());
    el.outSize.textContent = `${fmtNum(out.w)} × ${fmtNum(out.h)} px`;
    el.outPos.textContent = `${fmtNum(out.x)}, ${fmtNum(out.y)}`;
    el.swap.disabled = s.ratioKey === '1:1';
  }

  function announce() {
    clearTimeout(srTimer);
    srTimer = setTimeout(() => {
      const o = roundRect(s.rect, bounds(), ratio());
      el.sr.textContent = `Crop ${o.w} by ${o.h} pixels, ${o.x} from the left and ${o.y} from the top.`;
    }, 350);
  }

  const setRect = (r) => { s.rect = r; render(); };

  /* ---------- pointer: move and resize with mouse, pen or touch ---------- */
  el.box.addEventListener('pointerdown', (e) => {
    if (s.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const h = e.target.closest?.('[data-h]');
    s.drag = { id: e.pointerId, handle: h ? h.dataset.h : 'move', x: e.clientX, y: e.clientY, rect: { ...s.rect } };
    try { el.box.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    el.box.classList.add('is-drag');
    el.box.focus({ preventScroll: true });
    e.preventDefault();
  });
  el.box.addEventListener('pointermove', (e) => {
    const d = s.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = (e.clientX - d.x) / s.scale, dy = (e.clientY - d.y) / s.scale;
    setRect(d.handle === 'move' ? moveRect(d.rect, dx, dy, bounds()) : resizeRect(d.rect, d.handle, dx, dy, bounds(), { ratio: ratio() }));
    e.preventDefault();
  });
  const endDrag = (e) => {
    if (!s.drag || e.pointerId !== s.drag.id) return;
    s.drag = null;
    el.box.classList.remove('is-drag');
    try { el.box.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    announce();
  };
  el.box.addEventListener('pointerup', endDrag);
  el.box.addEventListener('pointercancel', endDrag);
  el.box.addEventListener('lostpointercapture', endDrag);
  el.box.addEventListener('contextmenu', (e) => { if (s.drag) e.preventDefault(); });

  /* ---------- keyboard ---------- */
  el.box.addEventListener('keydown', (e) => {
    if (!e.key.startsWith('Arrow') || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const step = nudgeStep(s.scale, e.shiftKey);
    setRect(nudgeRect(s.rect, e.key, step, bounds(), { resize: e.altKey, ratio: ratio() }));
    announce();
  });

  /* ---------- ratio, orientation, reset ---------- */
  function setRatio(key) {
    s.ratioKey = key;
    if (key === 'free') s.orient = 'landscape';
    ratioBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ratio === key)));
    if (s.rect) { setRect(applyRatio(s.rect, ratio(), bounds())); announce(); }
  }
  ratioBtns.forEach((b) => b.addEventListener('click', () => setRatio(b.dataset.ratio)));
  el.swap.addEventListener('click', () => {
    if (!s.rect) return;
    if (s.ratioKey === 'free') setRect(swapRect(s.rect, bounds()));
    else { s.orient = s.orient === 'landscape' ? 'portrait' : 'landscape'; setRect(applyRatio(s.rect, ratio(), bounds())); }
    announce();
  });
  el.reset.addEventListener('click', () => { if (s.bitmap) { setRect(initialRect(bounds(), ratio())); announce(); } });

  /* ---------- format ---------- */
  function syncFormat() {
    const f = FORMATS[s.format];
    el.qualityWrap.hidden = !f.lossy;
    el.fmtHint.textContent = FMT_HINTS[s.format];
  }
  fmtInputs.forEach((x) => x.addEventListener('change', () => { if (x.checked) { s.format = x.value; syncFormat(); } }));
  el.quality.addEventListener('input', () => { el.qualityOut.textContent = el.quality.value; });

  /* ---------- export ---------- */
  const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  async function saveFile(blob, name) {
    // iPhone and iPad: the share sheet offers "Save Image" and "Save to Files".
    if (IS_IOS && navigator.canShare) {
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (e) { if (e?.name === 'AbortError') return; }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 120000);
  }

  async function exportCrop() {
    if (!s.bitmap || !s.rect) return;
    clearError();
    const r = roundRect(s.rect, bounds(), ratio());
    const f = FORMATS[s.format];
    setBusy(true);
    try {
      const c = document.createElement('canvas');
      c.width = r.w; c.height = r.h;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('canvas');
      if (s.format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, r.w, r.h); }
      // Pixels are copied from the full-resolution source, not from the preview.
      ctx.drawImage(s.bitmap, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      const blob = await new Promise((res) => (f.lossy ? c.toBlob(res, f.mime, Number(el.quality.value) / 100) : c.toBlob(res, f.mime)));
      c.width = c.height = 0;
      if (!blob) throw new Error('blob');
      // Some browsers cannot write WebP and quietly give PNG; name the file for what it really is.
      const real = Object.values(FORMATS).find((x) => x.mime === blob.type) || f;
      await saveFile(blob, exportName(s.fileName, r.w, r.h, real.ext));
      el.result.textContent = `Saved ${fmtNum(r.w)} × ${fmtNum(r.h)} px ${real.label}, ${bytes(blob.size)}.` + (real !== f ? ` Your browser cannot make ${f.label}, so it saved ${real.label}.` : '');
    } catch {
      showError(ERR.export);
    } finally {
      setBusy(false);
    }
  }
  el.download.addEventListener('click', exportCrop);

  /* ---------- choosing a file: button, drop, paste ---------- */
  const pick = () => el.file.click();
  el.drop.addEventListener('click', pick);
  el.choose.addEventListener('click', pick);
  el.file.addEventListener('change', () => { const f = el.file.files?.[0]; el.file.value = ''; loadFile(f); });
  const imageFrom = (dt) => [...(dt?.files || [])].find((f) => f.type.startsWith('image/')) || dt?.files?.[0];
  ['dragenter', 'dragover'].forEach((t) => el.stage.addEventListener(t, (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); el.drop.classList.add('is-over'); } }));
  ['dragleave', 'drop'].forEach((t) => el.stage.addEventListener(t, (e) => { if (t === 'dragleave' && el.stage.contains(e.relatedTarget)) return; el.drop.classList.remove('is-over'); }));
  el.stage.addEventListener('drop', (e) => { e.preventDefault(); loadFile(imageFrom(e.dataTransfer)); });
  document.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); loadFile(f); }
  });

  /* ---------- resize ---------- */
  let rz = 0;
  const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); };
  if (typeof ResizeObserver === 'function') new ResizeObserver(onResize).observe(el.frame);
  window.addEventListener('resize', onResize);
}
