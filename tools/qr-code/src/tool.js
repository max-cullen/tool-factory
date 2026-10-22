// QR Code Generator: browser entry point. Everything runs on this device; nothing is sent anywhere.
// Pure logic lives in qr.mjs, payloads.mjs, render.mjs and contrast.mjs (tested in ../tests). Hooks: ../DESIGN-NOTES.md.
import { encode, QrCapacityError, maxBytes, dataCodewords } from './qr.mjs';
import { buildPayload } from './payloads.mjs';
import { toSvg, drawToCanvas, effectiveSize } from './render.mjs';
import { parseHex, checkContrast } from './contrast.mjs';

const root = document.querySelector('[data-tool]');
if (root) {
  const $$ = (sel, el = root) => [...el.querySelectorAll(sel)];
  const tabs = $$('[data-type-tab]');

  // Content type tabs (WAI-ARIA tabs pattern: arrow keys, Home, End). Fires `qr:type` on the tool root.
  const select = (tab, focus = false) => {
    const type = tab.dataset.typeTab;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    $$('[data-form]').forEach((f) => { f.hidden = f.dataset.form !== type; });
    root.dataset.type = type;
    if (focus) tab.focus();
    root.dispatchEvent(new CustomEvent('qr:type', { detail: { type } }));
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (to == null) return;
      e.preventDefault();
      select(tabs[to], true);
    });
  });

  // Segmented controls: move the white pill to the checked option.
  $$('[data-seg]').forEach((seg) => {
    const inputs = $$('input', seg);
    const sync = () => seg.style.setProperty('--i', Math.max(0, inputs.findIndex((x) => x.checked)));
    inputs.forEach((x) => x.addEventListener('change', sync));
    sync();
  });

  // Show or hide the Wi-Fi password.
  const eye = root.querySelector('[data-pw-toggle]');
  const pw = root.querySelector('[data-field="password"]');
  if (eye && pw) eye.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', String(show));
    eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  /* ---------- live preview ---------- */
  const q1 = (sel) => root.querySelector(sel);
  const el = {
    preview: q1('[data-preview]'), empty: q1('[data-empty]'), invalid: q1('[data-invalid]'), invalidMsg: q1('[data-invalid-msg]'),
    status: q1('[data-status]'), badge: q1('[data-live-badge]'), metaType: q1('[data-meta-type]'), metaSize: q1('[data-meta-size]'), metaData: q1('[data-meta-data]'),
    meter: q1('[data-meter] > i'), meterBox: q1('[data-meter]'), png: q1('[data-download-png]'), svg: q1('[data-download-svg]'),
    fg: q1('[data-fg]'), bg: q1('[data-bg]'), fgHex: q1('[data-fg-hex]'), bgHex: q1('[data-bg-hex]'), swap: q1('[data-swap]'),
    contrast: q1('[data-contrast]'), contrastText: q1('[data-contrast-text]'), size: q1('[data-size]'), sizeOut: q1('[data-size-out]'),
    margin: q1('[data-margin]'), marginOut: q1('[data-margin-out]'), ecHint: q1('[data-ec-hint]'), count: q1('[data-count]'),
    wifiHint: q1('[data-wifi-hint]'),
  };
  const TYPE_NAMES = { text: 'Text', url: 'URL', wifi: 'Wi-Fi', vcard: 'Contact' };
  const MODE_NAMES = { numeric: 'numbers', alnum: 'letters and numbers', byte: 'bytes' };
  const EC_HINTS = {
    L: 'L recovers about 7% damage. The smallest, simplest code. Best for clean screens.',
    M: 'M recovers about 15% damage. A good default for most uses.',
    Q: 'Q recovers about 25% damage. Worth it for print that may get scuffed.',
    H: 'H recovers about 30% damage. Most forgiving, but the code gets bigger and denser.',
  };
  const touched = new Set();
  let current = null; // { q, opts, type, payload } for the code on show, or null
  let queued = false;

  const formOf = (type) => root.querySelector(`[data-form="${type}"]`);
  function readValues(type) {
    const form = formOf(type);
    const v = {};
    form.querySelectorAll('[data-field]').forEach((i) => { v[i.dataset.field] = i.type === 'checkbox' ? i.checked : i.value; });
    if (type === 'wifi') v.security = (form.querySelector('input[name="security"]:checked') || {}).value || 'WPA';
    return v;
  }
  const readOptions = () => ({
    ecl: (q1('input[name="ec"]:checked') || {}).value || 'M',
    margin: Number(el.margin.value),
    size: Number(el.size.value),
    fg: parseHex(el.fgHex.value) || parseHex(el.fg.value) || '#000000',
    bg: parseHex(el.bgHex.value) || parseHex(el.bg.value) || '#ffffff',
  });

  function showFieldErrors(type, errors) {
    formOf(type).querySelectorAll('[data-field]').forEach((input) => {
      const msg = errors[input.dataset.field];
      const box = root.querySelector(`[data-error-for="${input.id}"]`);
      const show = Boolean(msg) && touched.has(input.id);
      if (box) { box.textContent = show ? msg : ''; box.hidden = !show; }
      const field = input.closest('.field');
      if (field) field.classList.toggle('is-bad', show);
      input.setAttribute('aria-invalid', String(show));
    });
  }

  function setState(state, message = '') {
    root.classList.toggle('is-empty', state === 'empty');
    root.classList.toggle('is-invalid', state === 'invalid');
    el.empty.hidden = state !== 'empty';
    el.invalid.hidden = state !== 'invalid';
    el.invalidMsg.textContent = state === 'invalid' ? message : '';
    el.png.disabled = el.svg.disabled = state !== 'ok';
    el.badge.hidden = state === 'empty';
  }

  function capacityMessage(e, ecl) {
    const more = ecl === 'L' ? 'Shorten it to continue.' : 'Shorten it or choose a lower error-correction level (L holds the most).';
    return `That is ${e.bytes.toLocaleString('en-AU')} bytes, and level ${ecl} holds up to ${e.maxBytes.toLocaleString('en-AU')}. ${more}`;
  }

  function update() {
    queued = false;
    const type = root.dataset.type;
    const opts = readOptions();
    el.metaType.textContent = TYPE_NAMES[type];
    if (el.count) {
      const t = readValues('text').text || '';
      el.count.textContent = `${t.length} / 2000`;
      el.count.classList.toggle('is-near', t.length >= 1800);
    }
    const payload = buildPayload(type, readValues(type));
    showFieldErrors(type, payload.errors);
    current = null;
    if (payload.empty) {
      setState('empty');
      el.status.textContent = 'Nothing to show yet. Your code appears as you type.';
      el.metaSize.textContent = `${opts.size} px`; el.metaData.textContent = '0%';
      el.meter.style.width = '0%'; el.meterBox.classList.remove('is-high');
      el.preview.innerHTML = toSvg(encode('https://example.com', { ecl: 'M' }).modules, { margin: 4, fg: '#0e1124', bg: '#ffffff', label: 'Example QR code', className: 'qr-svg' });
      return;
    }
    if (!payload.ok) {
      const first = Object.values(payload.errors)[0];
      setState('invalid', first);
      el.status.textContent = first;
      return;
    }
    let q;
    try {
      q = encode(payload.value, { ecl: opts.ecl });
    } catch (e) {
      if (!(e instanceof QrCapacityError)) throw e;
      const msg = capacityMessage(e, opts.ecl);
      setState('invalid', msg);
      el.status.textContent = msg;
      el.metaData.textContent = '100%+'; el.meter.style.width = '100%'; el.meterBox.classList.add('is-high');
      return;
    }
    const finalSize = effectiveSize(opts.size, q.size, opts.margin);
    current = { q, opts: { ...opts, size: finalSize }, type, payload: payload.value };
    setState('ok');
    el.preview.innerHTML = toSvg(q.modules, { margin: opts.margin, fg: opts.fg, bg: opts.bg, label: `QR code holding your ${TYPE_NAMES[type].toLowerCase()} details`, className: 'qr-svg' });
    const used = Math.max(1, Math.round((q.dataBits / (dataCodewords(40, opts.ecl) * 8)) * 100));
    el.metaSize.textContent = `${finalSize} px`;
    el.metaData.textContent = `${used}%`;
    el.meter.style.width = `${used}%`;
    el.meterBox.classList.toggle('is-high', used >= 85);
    el.status.textContent = `Version ${q.version} code, ${q.size} by ${q.size} dots, error correction ${opts.ecl}, using ${MODE_NAMES[q.mode]} mode.` + (finalSize > opts.size ? ` Image enlarged to ${finalSize} px so every dot is at least 2 pixels wide.` : '');
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  /* ---------- inputs ---------- */
  $$('[data-field]').forEach((i) => {
    i.addEventListener('input', () => { if (i.value || i.type === 'checkbox') touched.add(i.id); schedule(); });
    i.addEventListener('change', schedule);
    i.addEventListener('blur', () => { touched.add(i.id); schedule(); });
  });
  root.addEventListener('qr:type', schedule);

  // Wi-Fi: an open network has no password.
  const pwBox = pw && pw.closest('.qr-f');
  const syncSecurity = () => {
    const open = readValues('wifi').security === 'nopass';
    if (pw) pw.disabled = open;
    if (pwBox) pwBox.style.display = open ? 'none' : '';
    if (el.wifiHint) el.wifiHint.textContent = open ? 'Open networks have no password, so anyone who scans this code can join.' : 'WPA covers WPA2 and WPA3, used by almost every home and office network. WEP is old and weak: pick it only if your network needs it.';
    schedule();
  };
  $$('input[name="security"]').forEach((r) => r.addEventListener('change', syncSecurity));
  syncSecurity();

  /* ---------- style controls ---------- */
  const looks = q1('[data-appearance]');
  const syncSeg = () => $$('[data-seg]').forEach((seg) => seg.style.setProperty('--i', Math.max(0, $$('input', seg).findIndex((x) => x.checked))));
  function syncLabels() {
    el.sizeOut.textContent = `${el.size.value} px`;
    const m = Number(el.margin.value);
    el.marginOut.textContent = `${m} ${m === 1 ? 'module' : 'modules'}`;
    el.ecHint.textContent = EC_HINTS[(q1('input[name="ec"]:checked') || {}).value || 'M'];
    const c = checkContrast(readOptions().fg, readOptions().bg);
    el.contrast.classList.remove('is-good', 'is-warn', 'is-bad');
    el.contrast.classList.add('is-' + c.level);
    el.contrastText.textContent = c.text;
    syncSeg();
  }
  const bindColour = (picker, hexInput) => {
    picker.addEventListener('input', () => { hexInput.value = picker.value.toUpperCase(); hexInput.classList.remove('is-bad'); syncLabels(); schedule(); });
    hexInput.addEventListener('input', () => {
      const ok = parseHex(hexInput.value);
      hexInput.classList.toggle('is-bad', !ok);
      if (ok) picker.value = ok;
      syncLabels(); schedule();
    });
    hexInput.addEventListener('blur', () => { const ok = parseHex(hexInput.value); hexInput.value = (ok || picker.value).toUpperCase(); hexInput.classList.remove('is-bad'); });
  };
  bindColour(el.fg, el.fgHex);
  bindColour(el.bg, el.bgHex);
  el.swap.addEventListener('click', () => {
    const o = readOptions();
    el.fg.value = o.bg; el.bg.value = o.fg;
    el.fgHex.value = o.bg.toUpperCase(); el.bgHex.value = o.fg.toUpperCase();
    el.fgHex.classList.remove('is-bad'); el.bgHex.classList.remove('is-bad');
    syncLabels(); schedule();
  });
  [el.size, el.margin, ...$$('input[name="ec"]')].forEach((i) => i.addEventListener('input', () => { syncLabels(); schedule(); }));
  $$('input[name="ec"]').forEach((i) => i.addEventListener('change', () => { syncLabels(); schedule(); }));
  looks.addEventListener('submit', (e) => e.preventDefault());

  /* ---------- downloads ---------- */
  const slug = (t) => String(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  function fileBase() {
    const v = readValues(current.type);
    let tag = '';
    if (current.type === 'url') tag = slug(current.payload.replace(/^[a-z]+:\/\/(www\.)?/i, '').split(/[/?#]/)[0]);
    else if (current.type === 'wifi') tag = slug(v.ssid);
    else if (current.type === 'vcard') tag = slug([v.first, v.last].filter(Boolean).join(' '));
    return ['qr-code', current.type, tag].filter(Boolean).join('-');
  }
  function save(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  el.png.addEventListener('click', () => {
    if (!current) return;
    const c = drawToCanvas(document.createElement('canvas'), current.q.modules, current.opts);
    const name = `${fileBase()}.png`;
    c.toBlob((b) => { if (b) save(b, name); }, 'image/png');
  });
  el.svg.addEventListener('click', () => {
    if (!current) return;
    const o = current.opts;
    save(new Blob([toSvg(current.q.modules, { margin: o.margin, fg: o.fg, bg: o.bg, size: o.size, label: `QR code (${TYPE_NAMES[current.type]})` })], { type: 'image/svg+xml' }), `${fileBase()}.svg`);
  });

  syncLabels();
  update();
}
