// Business Card Maker: browser entry point. Everything runs on this device; nothing is sent anywhere.
// Pure logic lives in layouts.mjs, textfit.mjs, colour.mjs, units.mjs and pdf.mjs (tested in ../tests). Hooks: ../DESIGN-NOTES.md.
import { FONTS, buildFront, buildBack, W, H } from './layouts.mjs';
import { parseHex, contrastHint } from './colour.mjs';
import { BLEED_MM, SAFE_MM, PRINT_DPI, cardPixels, screenPixels, sheetMm } from './units.mjs';
import { buildPdf, rgbaToRgb } from './pdf.mjs';

const root = document.querySelector('[data-tool]');
if (root) {
  const q1 = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const el = {
    canvas: q1('[data-canvas]'), status: q1('[data-status]'), metaSize: q1('[data-meta-size]'), metaPx: q1('[data-meta-px]'), metaSide: q1('[data-meta-side]'),
    guide: q1('[data-guide]'), bleed: q1('[data-bleed]'), png: q1('[data-download-png]'), pdf: q1('[data-download-pdf]'), screen: q1('[data-download-screen]'),
    contrast: q1('[data-contrast]'), contrastText: q1('[data-contrast-text]'), side: q1('[data-side]'), backExtra: q1('[data-back-extra]'), backText: q1('[data-back-text]'),
    logo: q1('[data-logo]'), logoLabel: q1('[data-logo-label]'), logoClear: q1('[data-logo-clear]'), logoErr: q1('[data-logo-error]'), logoHint: q1('[data-logo-hint]'),
  };
  const fontStack = Object.fromEntries(FONTS.map((f) => [f.id, f.stack]));
  const picker = (k) => q1(`[data-c="${k}"]`);
  const hexIn = (k) => q1(`[data-c-hex="${k}"]`);
  let logoImg = null; let logoUrl = null; let queued = false;

  /* ---------- reading the form ---------- */
  const readData = () => Object.fromEntries($$('[data-field]').map((i) => [i.dataset.field, i.value]));
  const readColors = () => Object.fromEntries(['bg', 'text', 'accent'].map((k) => [k, parseHex(hexIn(k).value) || picker(k).value]));
  const radio = (name) => (q1(`input[name="${name}"]:checked`) || {}).value;

  /* ---------- measuring and drawing ---------- */
  const scratch = document.createElement('canvas').getContext('2d');
  // Width in mm of `text` at `sizeMm`, measured with the real browser font at 100 px for accuracy.
  const measure = (text, sizeMm, weight, fontKey) => {
    scratch.font = `${weight} 100px ${fontStack[fontKey] || fontStack.sans}`;
    return (scratch.measureText(text).width * sizeMm) / 100;
  };

  function drawCommands(ctx, built, sx, sy, offset) {
    ctx.save();
    ctx.scale(sx, sy);
    ctx.translate(offset, offset);
    ctx.textBaseline = 'alphabetic';
    for (const c of built.commands) {
      if (c.op === 'rect') { ctx.fillStyle = c.fill; ctx.fillRect(c.x, c.y, c.w, c.h); }
      else if (c.op === 'circle') { ctx.fillStyle = c.fill; ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); ctx.fill(); }
      else if (c.op === 'text') {
        ctx.fillStyle = c.fill; ctx.textAlign = c.align;
        ctx.font = `${c.weight} ${c.size}px ${fontStack[c.font] || fontStack.sans}`;
        ctx.fillText(c.text, c.x, c.y);
      } else if (c.op === 'logo' && logoImg) {
        const iw = logoImg.naturalWidth || logoImg.width || 1; const ih = logoImg.naturalHeight || logoImg.height || 1;
        const k = Math.min(c.w / iw, c.h / ih);
        const w = iw * k; const h = ih * k;
        ctx.save();
        if (c.shape === 'circle') { ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2, Math.min(c.w, c.h) / 2, 0, Math.PI * 2); ctx.clip(); }
        ctx.drawImage(logoImg, c.x + (c.w - w) / 2, c.y + (c.h - h) / 2, w, h);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  const side = () => (radio('side') === 'back' && radio('back') !== 'off' ? 'back' : 'front');
  function build(which, bleed) {
    const data = readData(); const colors = readColors(); const font = radio('font') || 'sans';
    const hasLogo = Boolean(logoImg);
    if (which === 'back') return buildBack({ mode: radio('back'), data, colors, font, measure, hasLogo, bleed, text: el.backText.value });
    return buildFront({ layout: radio('layout') || 'classic', data, colors, font, measure, hasLogo, bleed });
  }
  // Paint one side onto a canvas sized for the sheet (card plus bleed).
  function paint(canvas, which, bleed, px) {
    const sheet = sheetMm(bleed);
    canvas.width = px.width; canvas.height = px.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, px.width, px.height);
    drawCommands(ctx, build(which, bleed), px.width / sheet.width, px.height / sheet.height, bleed);
    return ctx;
  }

  /* ---------- preview ---------- */
  function drawGuide(ctx, sx, sy) {
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 160, 110, 0.95)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
    ctx.strokeRect(SAFE_MM * sx, SAFE_MM * sy, (W - 2 * SAFE_MM) * sx, (H - 2 * SAFE_MM) * sy);
    ctx.restore();
  }
  function update() {
    queued = false;
    const which = side();
    const px = { width: 900, height: 550 };
    const ctx = paint(el.canvas, which, 0, px);
    if (el.guide.checked) drawGuide(ctx, px.width / W, px.height / H);
    // facts and status
    const bleed = el.bleed.checked ? BLEED_MM : 0;
    const print = cardPixels(PRINT_DPI, bleed); const sheet = sheetMm(bleed);
    el.metaSize.textContent = `${sheet.width} x ${sheet.height} mm`;
    el.metaPx.textContent = `${print.width} x ${print.height}`;
    el.metaSide.textContent = which === 'back' ? 'Back' : 'Front';
    const d = readData();
    const any = Object.values(d).some((v) => v.trim()) || logoImg;
    el.status.textContent = which === 'back' ? 'Live preview of the back of your card.' : any ? 'Live preview of the front of your card.' : 'Add your details on the left and they appear here.';
    // contrast hint
    const c = readColors(); const h = contrastHint(c.text, c.bg, c.accent);
    el.contrast.classList.remove('is-good', 'is-warn', 'is-bad'); el.contrast.classList.add('is-' + h.level);
    el.contrastText.textContent = h.text;
    drawThumbs();
    syncSeg();
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  function drawThumbs() {
    const data = readData(); const colors = readColors(); const font = radio('font') || 'sans';
    $$('[data-thumb]').forEach((cv) => {
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
      drawCommands(ctx, buildFront({ layout: cv.dataset.thumb, data, colors, font, measure, hasLogo: Boolean(logoImg), bleed: 0 }), cv.width / W, cv.height / H, 0);
    });
  }
  const syncSeg = () => $$('[data-seg]').forEach((seg) => seg.style.setProperty('--i', Math.max(0, [...seg.querySelectorAll('input')].findIndex((x) => x.checked))));

  /* ---------- inputs ---------- */
  $$('[data-field], [data-back-text], [data-guide], [data-bleed], input[name="layout"], input[name="font"], input[name="side"]').forEach((i) => {
    i.addEventListener('input', schedule); i.addEventListener('change', schedule);
  });
  $$('input[name="back"]').forEach((r) => r.addEventListener('change', () => {
    const on = radio('back') !== 'off';
    el.side.hidden = !on; el.backExtra.hidden = !on;
    if (!on) { const f = q1('input[name="side"][value="front"]'); f.checked = true; }
    schedule();
  }));
  const bindColour = (k) => {
    const p = picker(k); const t = hexIn(k);
    p.addEventListener('input', () => { t.value = p.value.toUpperCase(); t.classList.remove('is-bad'); schedule(); });
    t.addEventListener('input', () => { const ok = parseHex(t.value); t.classList.toggle('is-bad', !ok); if (ok) p.value = ok; schedule(); });
    t.addEventListener('blur', () => { const ok = parseHex(t.value); t.value = (ok || p.value).toUpperCase(); t.classList.remove('is-bad'); });
  };
  ['bg', 'text', 'accent'].forEach(bindColour);
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const cs = [b.style.getPropertyValue('--a'), b.style.getPropertyValue('--b'), b.style.getPropertyValue('--c')];
    ['bg', 'text', 'accent'].forEach((k, i) => { picker(k).value = cs[i]; hexIn(k).value = cs[i].toUpperCase(); hexIn(k).classList.remove('is-bad'); });
    schedule();
  }));
  q1('[data-look]').addEventListener('submit', (e) => e.preventDefault());

  /* ---------- logo (stays on this device) ---------- */
  const logoError = (msg) => { el.logoErr.textContent = msg; el.logoErr.hidden = !msg; };
  function clearLogo() {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUrl = null; logoImg = null; el.logo.value = '';
    el.logoLabel.textContent = 'Choose a logo'; el.logoClear.hidden = true; logoError('');
    schedule();
  }
  el.logo.addEventListener('change', () => {
    const file = el.logo.files && el.logo.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { el.logo.value = ''; return logoError('That file type is not supported. Choose a PNG, JPEG, WebP or SVG image.'); }
    if (file.size > 8 * 1024 * 1024) { el.logo.value = ''; return logoError('That image is over 8 MB. Choose a smaller file.'); }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
      logoUrl = url; logoImg = img;
      el.logoLabel.textContent = file.name.length > 26 ? file.name.slice(0, 24) + '…' : file.name;
      el.logoClear.hidden = false; logoError('');
      schedule();
    };
    img.onerror = () => { URL.revokeObjectURL(url); el.logo.value = ''; logoError('That image could not be read. Try a different file.'); };
    img.src = url;
  });
  el.logoClear.addEventListener('click', clearLogo);

  /* ---------- downloads ---------- */
  const slug = (t) => String(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  const baseName = () => ['business-card', slug(readData().name)].filter(Boolean).join('-');
  function save(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const toBlob = (canvas, type) => new Promise((res) => canvas.toBlob(res, type));
  const bleedNow = () => (el.bleed.checked ? BLEED_MM : 0);
  const sides = () => (radio('back') !== 'off' ? ['front', 'back'] : ['front']);

  async function downloadPng(px, label) {
    const bleed = bleedNow();
    for (const which of sides()) {
      const c = document.createElement('canvas');
      paint(c, which, bleed, px(bleed));
      const b = await toBlob(c, 'image/png');
      if (b) save(b, `${baseName()}-${which}-${label}.png`);
      if (which === 'front' && sides().length > 1) await new Promise((r) => setTimeout(r, 250));
    }
  }
  el.png.addEventListener('click', () => downloadPng((bleed) => cardPixels(PRINT_DPI, bleed), '300dpi'));
  el.screen.addEventListener('click', () => downloadPng((bleed) => screenPixels(bleed), 'screen'));

  async function deflate(bytes) {
    if (typeof CompressionStream !== 'function') return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  el.pdf.addEventListener('click', async () => {
    const bleed = bleedNow(); const px = cardPixels(PRINT_DPI, bleed); const sheet = sheetMm(bleed);
    const pages = [];
    for (const which of sides()) {
      const c = document.createElement('canvas');
      const ctx = paint(c, which, bleed, px);
      const rgb = rgbaToRgb(ctx.getImageData(0, 0, px.width, px.height).data);
      const packed = await deflate(rgb);
      pages.push({ widthMm: sheet.width, heightMm: sheet.height, trimInsetMm: bleed, image: { width: px.width, height: px.height, data: packed || rgb, filter: packed ? 'FlateDecode' : null } });
    }
    const name = readData().name.trim();
    save(new Blob([buildPdf({ pages, title: name ? `Business card: ${name}` : 'Business card' })], { type: 'application/pdf' }), `${baseName()}.pdf`);
  });

  syncSeg();
  update();
  // System fonts can arrive a moment after first paint; redraw once they settle.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
}
