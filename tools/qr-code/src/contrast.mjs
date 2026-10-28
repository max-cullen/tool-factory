// Colour helpers and a scan-contrast check (WCAG relative luminance).
export function parseHex(input) {
  let s = String(input ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return '#' + s.toLowerCase();
}
export function luminance(hex) {
  const n = parseInt(parseHex(hex).slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrastRatio(a, b) {
  const la = luminance(a); const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** { ratio, level: 'good'|'warn'|'bad', inverted, text } for dots `fg` on background `bg`. */
export function checkContrast(fg, bg) {
  const ratio = contrastRatio(fg, bg);
  const inverted = luminance(fg) > luminance(bg);
  const r = (Math.round(ratio * 10) / 10).toFixed(1);
  let level = ratio < 3 ? 'bad' : ratio < 5 ? 'warn' : 'good';
  let text = level === 'good' ? `Contrast ${r} : 1. Scans well.` : level === 'warn' ? `Contrast ${r} : 1. Some scanners may struggle. Darker dots or a lighter background will help.` : `Contrast ${r} : 1. Too low: many phones will not read this when printed. Use darker dots on a lighter background.`;
  if (inverted && level !== 'bad') { level = 'warn'; text = `Contrast ${r} : 1, but the dots are lighter than the background. Some scanners can not read inverted codes. Dark dots on a light background is safest.`; }
  return { ratio, level, inverted, text };
}
