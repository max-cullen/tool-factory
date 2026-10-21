// Small site-wide behaviours: header ground on scroll, mobile menu.
const header = document.querySelector('[data-header]');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 6);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
}
const year = document.querySelector('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());


// "Privacy settings" re-opens Google's consent message (set up in the AdSense account) so a visitor can change their choice.
document.querySelectorAll('[data-privacy-settings]').forEach((b) => b.addEventListener('click', () => {
  try { if (window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') window.googlefc.showRevocationMessage(); } catch (e) { /* no consent message on this page */ }
}));
