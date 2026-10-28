// Colour helpers and the contrast hint shown under the colour pickers (WCAG relative luminance).
export function parseHex(input) {
  let s = String(input ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return '#' + s.toLowerCase();
}
const rgb = (hex) => { const n = parseInt(parseHex(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function luminance(hex) {
  const ch = rgb(hex).map((c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrastRatio(a, b) {
  const la = luminance(a); const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Blend `a` towards `b` by t (0 = a, 1 = b). */
export function mix(a, b, t) {
  const x = rgb(a); const y = rgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}
/** White or near-black, whichever reads better on `bg`. */
export function onColour(bg) {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#14161c', bg) ? '#ffffff' : '#14161c';
}
const r1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
/** Hint for the three card colours: text on background matters most, accent is used for the title and shapes. */
export function contrastHint(text, bg, accent) {
  const t = contrastRatio(text, bg);
  const a = contrastRatio(accent, bg);
  if (t < 3) return { level: 'bad', text: `Text on background is ${r1(t)} : 1. Too low to read comfortably, especially in small print. Pick a darker text or lighter background.` };
  if (t < 4.5) return { level: 'warn', text: `Text on background is ${r1(t)} : 1. Readable on large type but weak for the small contact lines. Aim for 4.5 : 1 or more.` };
  if (a < 3) return { level: 'warn', text: `Text is clear (${r1(t)} : 1), but the accent is only ${r1(a)} : 1 against the background, so the job title may be faint.` };
  return { level: 'good', text: `Text on background ${r1(t)} : 1, accent ${r1(a)} : 1. Good for print.` };
}
