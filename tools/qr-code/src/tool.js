// QR Code Generator: browser entry point. Runs in the browser; nothing is sent anywhere.
// DESIGN STUB: only presentational behaviour lives here (tabs, segmented controls, password eye).
// The logic pass adds the encoder (src/qr.mjs or similar), rendering into [data-preview] and the downloads.
// Hooks are listed in ../DESIGN-NOTES.md.
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
}
