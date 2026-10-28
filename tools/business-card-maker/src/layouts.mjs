// Card layouts as pure functions. Each returns draw commands in millimetres on a 90 x 55 mm card (origin top left).
// Commands: { op:'rect', x,y,w,h, fill } | { op:'circle', cx,cy,r, fill } | { op:'text', text,x,y,size,weight,fill,align,font }
//         | { op:'logo', x,y,w,h, shape }   (a box the browser fills with the visitor's logo, scaled to fit).
// `measure(text, sizeMm, weight, fontKey)` is injected, so these functions run in Node without a canvas.
// Shapes that touch a card edge are extended by `bleed` mm so a bleed export has no white slivers.
import { CARD, SAFE_MM } from './units.mjs';
import { fitText, clean } from './textfit.mjs';
import { mix, onColour } from './colour.mjs';

export const W = CARD.width;
export const H = CARD.height;
const S = SAFE_MM;
const LH = 1.22; // line height as a multiple of font size

export const LAYOUTS = [
  { id: 'classic', name: 'Classic', blurb: 'Left-aligned, accent strip along the bottom.' },
  { id: 'centred', name: 'Centred', blurb: 'Everything on the middle line, with a short rule.' },
  { id: 'band', name: 'Colour band', blurb: 'Name on a solid band across the top.' },
  { id: 'sidebar', name: 'Side bar', blurb: 'A bold bar on the left holds your initials or logo.' },
  { id: 'minimal', name: 'Minimal', blurb: 'Quiet and spare, with a short hairline.' },
  { id: 'monogram', name: 'Monogram', blurb: 'A round badge with your initials or logo.' },
];

export const FONTS = [
  { id: 'sans', name: 'Clean sans', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: 'serif', name: 'Classic serif', stack: 'Georgia, "Times New Roman", Times, serif' },
  { id: 'humanist', name: 'Humanist', stack: '"Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'mono', name: 'Typewriter', stack: '"Courier New", Courier, Menlo, Consolas, monospace' },
];

export const displayUrl = (u) => clean(u).replace(/^https?:\/\//i, '').replace(/\/$/, '');

/** Up to two initials: first letters of the first and last word of the name, else the first letter of the company. */
export function initials(name, company) {
  const words = clean(name).split(' ').filter(Boolean);
  const src = words.length ? (words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]]) : clean(company).split(' ').filter(Boolean).slice(0, 1);
  return src.map((w) => Array.from(w)[0] || '').join('').toLocaleUpperCase('en-AU');
}

function normaliseData(d = {}) {
  return {
    name: clean(d.name), title: clean(d.title), company: clean(d.company), phone: clean(d.phone),
    email: clean(d.email), website: displayUrl(d.website), address: clean(d.address),
  };
}

function makeCtx({ data, colors, font = 'sans', measure, hasLogo = false, bleed = 0 }) {
  const c = { bg: colors.bg, text: colors.text, accent: colors.accent };
  return {
    d: normaliseData(data), c, font, measure, hasLogo, bleed, commands: [], logoBox: null,
    muted: mix(c.text, c.bg, 0.3), onAccent: onColour(c.accent),
  };
}

// Rectangle from edge to edge: coordinates on the card edge grow outwards by the bleed.
function rect(ctx, x1, y1, x2, y2, fill, edges = true) {
  const b = edges ? ctx.bleed : 0;
  const nx1 = x1 <= 0 ? x1 - b : x1; const ny1 = y1 <= 0 ? y1 - b : y1;
  const nx2 = x2 >= W ? x2 + b : x2; const ny2 = y2 >= H ? y2 + b : y2;
  ctx.commands.push({ op: 'rect', x: nx1, y: ny1, w: nx2 - nx1, h: ny2 - ny1, fill });
}
const circle = (ctx, cx, cy, r, fill) => ctx.commands.push({ op: 'circle', cx, cy, r, fill });
function logo(ctx, box, shape = 'box') {
  if (!ctx.hasLogo) return;
  ctx.logoBox = { ...box, shape };
  ctx.commands.push({ op: 'logo', ...box, shape });
}

/**
 * Place a stack of text entries inside a region. Entries: { text, size, min, weight, fill, maxLines, gap }.
 * Text is wrapped or shrunk to the region width; if the stack is too tall every size is scaled down together.
 */
function block(ctx, entries, region) {
  const items = entries.filter((e) => clean(e.text));
  if (!items.length) return 0;
  const align = region.align || 'left';
  let scale = 1; let fitted; let total;
  for (;;) {
    fitted = items.map((e) => ({ e, f: fitText({ text: e.text, maxWidth: region.w, size: e.size * scale, minSize: e.min * scale, maxLines: e.maxLines || 1, measure: (t, s) => ctx.measure(t, s, e.weight || 400, ctx.font) }) }));
    total = fitted.reduce((h, { e, f }, i) => h + f.lines.length * f.size * LH + (i < fitted.length - 1 ? (e.gap || 0) * scale : 0), 0);
    if (total <= region.h || scale <= 0.35) break;
    scale = Math.max(0.35, scale - 0.05);
  }
  let y = region.anchor === 'bottom' ? region.y + region.h - total : region.anchor === 'middle' ? region.y + (region.h - total) / 2 : region.y;
  const x = align === 'center' ? region.x + region.w / 2 : align === 'right' ? region.x + region.w : region.x;
  fitted.forEach(({ e, f }) => {
    f.lines.forEach((line) => {
      ctx.commands.push({ op: 'text', text: line, x, y: y + f.size, size: f.size, weight: e.weight || 400, fill: e.fill, align, font: ctx.font });
      y += f.size * LH;
    });
    y += (e.gap || 0) * scale;
  });
  return total;
}

const identity = (ctx, o = {}) => [
  { text: ctx.d.name, size: o.name ?? 6.2, min: 3.6, weight: 700, fill: o.nameFill ?? ctx.c.text, maxLines: 2, gap: 1.1 },
  { text: ctx.d.title, size: o.title ?? 3.1, min: 2.2, weight: 500, fill: o.titleFill ?? ctx.c.accent, gap: 0.8 },
  { text: ctx.d.company, size: o.company ?? 3.3, min: 2.2, weight: 650, fill: o.companyFill ?? ctx.c.text },
];
const details = (ctx, size = 2.65, fill = ctx.muted) => [
  { text: ctx.d.phone, size, min: 2, weight: 500, fill, gap: 0.6 },
  { text: ctx.d.email, size, min: 2, weight: 500, fill, gap: 0.6 },
  { text: ctx.d.website, size, min: 2, weight: 500, fill, gap: 0.6 },
  { text: ctx.d.address, size, min: 2, weight: 500, fill, maxLines: 2 },
];

const BUILDERS = {
  classic(ctx) {
    const { c } = ctx;
    rect(ctx, 0, 0, W, H, c.bg);
    rect(ctx, 0, H - 2.6, W, H, c.accent);
    rect(ctx, S, S, S + 10, S + 0.9, c.accent, false);
    logo(ctx, { x: W - S - 20, y: S, w: 20, h: 14 });
    block(ctx, identity(ctx), { x: S, y: S + 3, w: W - 2 * S - (ctx.hasLogo ? 24 : 0), h: 24 });
    block(ctx, details(ctx), { x: S, y: 33, w: W - 2 * S, h: H - 2.6 - 3.2 - 33, anchor: 'bottom' });
  },
  centred(ctx) {
    const { c } = ctx;
    rect(ctx, 0, 0, W, H, c.bg);
    rect(ctx, W / 2 - 6, 33.5, W / 2 + 6, 34.1, c.accent, false);
    logo(ctx, { x: W / 2 - 9, y: S, w: 18, h: 11 });
    const top = ctx.hasLogo ? 16.5 : S + 2;
    block(ctx, identity(ctx, { name: 5.8 }), { x: S + 3, y: top, w: W - 2 * S - 6, h: 31 - top, align: 'center', anchor: 'middle' });
    block(ctx, details(ctx, 2.6), { x: S, y: 37, w: W - 2 * S, h: H - S - 37, align: 'center' });
  },
  band(ctx) {
    const { c } = ctx;
    rect(ctx, 0, 0, W, H, c.bg);
    rect(ctx, 0, 0, W, 21, c.accent);
    logo(ctx, { x: W - S - 16, y: S, w: 16, h: 13 });
    block(ctx, [
      { text: ctx.d.name, size: 6.2, min: 3.6, weight: 700, fill: ctx.onAccent, maxLines: 2, gap: 1 },
      { text: ctx.d.title, size: 3.1, min: 2.2, weight: 500, fill: ctx.onAccent },
    ], { x: S, y: S, w: W - 2 * S - (ctx.hasLogo ? 19 : 0), h: 14, anchor: 'middle' });
    block(ctx, [{ text: ctx.d.company, size: 3.6, min: 2.4, weight: 700, fill: c.text }], { x: S, y: 24.5, w: W - 2 * S, h: 5 });
    block(ctx, details(ctx), { x: S, y: 31, w: W - 2 * S, h: H - S - 31, anchor: 'bottom' });
  },
  sidebar(ctx) {
    const { c } = ctx;
    const bar = 22;
    rect(ctx, 0, 0, W, H, c.bg);
    rect(ctx, 0, 0, bar, H, c.accent);
    rect(ctx, bar, 0, bar + 1.4, H, mix(c.accent, c.bg, 0.5));
    logo(ctx, { x: S, y: S + 1, w: bar - 2 * S, h: 14 });
    if (!ctx.hasLogo) block(ctx, [{ text: initials(ctx.d.name, ctx.d.company), size: 9, min: 5, weight: 700, fill: ctx.onAccent }], { x: 1, y: S, w: bar - 2, h: 16, align: 'center', anchor: 'middle' });
    const x = bar + 6.5;
    block(ctx, identity(ctx), { x, y: S + 1, w: W - x - S, h: 23 });
    block(ctx, details(ctx), { x, y: 30, w: W - x - S, h: H - S - 30, anchor: 'bottom' });
  },
  minimal(ctx) {
    const { c } = ctx;
    rect(ctx, 0, 0, W, H, c.bg);
    rect(ctx, W - S - 2, S, W - S, S + 2, c.accent, false);
    rect(ctx, S, 31.2, S + 8, 31.6, c.text, false);
    logo(ctx, { x: W - S - 14, y: H - S - 10, w: 14, h: 10 });
    block(ctx, [
      { text: ctx.d.name, size: 5.2, min: 3.4, weight: 500, fill: c.text, maxLines: 2, gap: 1 },
      { text: ctx.d.title, size: 2.9, min: 2.1, weight: 400, fill: ctx.muted, gap: 0.5 },
      { text: ctx.d.company, size: 2.9, min: 2.1, weight: 600, fill: c.text },
    ], { x: S, y: S, w: W - 2 * S - 6, h: 25 });
    block(ctx, details(ctx, 2.55), { x: S, y: 34, w: W - 2 * S - (ctx.hasLogo ? 18 : 0), h: H - S - 34, anchor: 'bottom' });
  },
  monogram(ctx) {
    const { c } = ctx;
    const cx = 19; const cy = H / 2; const r = 12;
    rect(ctx, 0, 0, W, H, c.bg);
    circle(ctx, cx, cy, r, c.accent);
    if (ctx.hasLogo) {
      circle(ctx, cx, cy, r - 1.2, c.bg);
      logo(ctx, { x: cx - 7.5, y: cy - 7.5, w: 15, h: 15 }, 'circle');
    } else {
      block(ctx, [{ text: initials(ctx.d.name, ctx.d.company), size: 9, min: 5, weight: 700, fill: ctx.onAccent }], { x: cx - r + 2, y: cy - 6, w: 2 * r - 4, h: 12, align: 'center', anchor: 'middle' });
    }
    rect(ctx, 35, 12, 35.3, H - 12, c.accent, false);
    const id = identity(ctx, { name: 5.4 });
    id[id.length - 1].gap = 2.6;
    block(ctx, [...id, ...details(ctx, 2.5)], { x: 39, y: S, w: W - 39 - S, h: H - 2 * S, anchor: 'middle' });
  },
};

/** Front of the card. Returns { commands, logoBox, width, height, bleed }. Everything lies within the card (plus bleed). */
export function buildFront(opts) {
  const ctx = makeCtx(opts);
  (BUILDERS[opts.layout] || BUILDERS.classic)(ctx);
  return { commands: ctx.commands, logoBox: ctx.logoBox, width: W, height: H, bleed: ctx.bleed };
}

/**
 * Optional back. mode 'colour': accent background with a thin frame. mode 'light': the card background, logo on top if given.
 * `text` is the main line (falls back to company, then name); the website goes underneath.
 */
export function buildBack({ mode = 'colour', data, colors, font = 'sans', measure, hasLogo = false, bleed = 0, text = '' }) {
  const ctx = makeCtx({ data, colors, font, measure, hasLogo: hasLogo && mode === 'light', bleed });
  const { c, d } = ctx;
  const dark = mode === 'colour';
  const ground = dark ? c.accent : c.bg;
  const ink = dark ? ctx.onAccent : c.text;
  rect(ctx, 0, 0, W, H, ground);
  if (dark) {
    const f = mix(ground, ink, 0.4);
    rect(ctx, 5, 5, W - 5, 5.3, f, false); rect(ctx, 5, H - 5.3, W - 5, H - 5, f, false);
    rect(ctx, 5, 5, 5.3, H - 5, f, false); rect(ctx, W - 5.3, 5, W - 5, H - 5, f, false);
  } else {
    rect(ctx, W / 2 - 5, H - 9.4, W / 2 + 5, H - 9, c.accent, false);
  }
  logo(ctx, { x: W / 2 - 12, y: 8, w: 24, h: 18 });
  const line = clean(text) || d.company || d.name;
  const top = ctx.hasLogo ? 29 : 9;
  block(ctx, [
    { text: line, size: 5.6, min: 3, weight: 700, fill: ink, maxLines: 2, gap: 1.6 },
    { text: d.website, size: 2.8, min: 2, weight: 500, fill: dark ? ink : ctx.muted },
  ], { x: 9, y: top, w: W - 18, h: H - 9 - top - (dark ? 0 : 3), align: 'center', anchor: 'middle' });
  return { commands: ctx.commands, logoBox: ctx.logoBox, width: W, height: H, bleed };
}
