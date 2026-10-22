// Turns a QR matrix into an SVG string, a pixel grid, or canvas drawing. Pure apart from drawToCanvas.
import { parseHex } from './contrast.mjs';

const colour = (c, fallback) => parseHex(c) || fallback;

/** Smallest image size that keeps every module at least `min` pixels wide. */
export const minImageSize = (modules, margin, min = 2) => (modules + margin * 2) * min;
export const effectiveSize = (size, modules, margin) => Math.max(Math.round(size), minImageSize(modules, margin));

/** Pixel edge positions of each module column/row so the grid fills `size` exactly (edges rounded to whole pixels). */
export function edges(total, size) {
  const e = new Array(total + 1);
  for (let i = 0; i <= total; i++) e[i] = Math.round((i * size) / total);
  return e;
}

/** Horizontal runs of dark modules: [[x, y, length], ...]. */
export function runs(modules) {
  const out = [];
  modules.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      if (!row[x]) { x++; continue; }
      let n = 1;
      while (x + n < row.length && row[x + n]) n++;
      out.push([x, y, n]);
      x += n;
    }
  });
  return out;
}

/**
 * SVG for a QR matrix. `margin` is in modules. `size` (pixels) sets width and height; omit it for a scalable image.
 */
export function toSvg(modules, { margin = 4, fg = '#000000', bg = '#ffffff', size, label = 'QR code', className = '' } = {}) {
  const n = modules.length;
  const total = n + margin * 2;
  const f = colour(fg, '#000000'); const b = colour(bg, '#ffffff');
  const d = runs(modules).map(([x, y, l]) => `M${x + margin} ${y + margin}h${l}v1h-${l}z`).join('');
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const cls = className ? ` class="${className}"` : '';
  const esc = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<svg xmlns="http://www.w3.org/2000/svg"${cls}${dims} viewBox="0 0 ${total} ${total}" role="img" aria-label="${esc}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${b}"/><path d="${d}" fill="${f}"/></svg>\n`;
}

/** A pixel grid at exactly `size` x `size`: Uint8Array of 1 (dot) and 0 (background). Used by tests and checks. */
export function rasterise(modules, { margin = 4, size = 512 } = {}) {
  const n = modules.length; const total = n + margin * 2;
  const e = edges(total, size);
  const data = new Uint8Array(size * size);
  for (let my = 0; my < n; my++) for (let mx = 0; mx < n; mx++) {
    if (!modules[my][mx]) continue;
    for (let y = e[my + margin]; y < e[my + margin + 1]; y++) for (let x = e[mx + margin]; x < e[mx + margin + 1]; x++) data[y * size + x] = 1;
  }
  return { size, data };
}

/** Draw onto a canvas element at exactly `size` pixels square, with whole-pixel module edges. */
export function drawToCanvas(canvas, modules, { margin = 4, size = 512, fg = '#000000', bg = '#ffffff' } = {}) {
  const n = modules.length; const total = n + margin * 2;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colour(bg, '#ffffff');
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = colour(fg, '#000000');
  const e = edges(total, size);
  for (const [x, y, l] of runs(modules)) {
    const x0 = e[x + margin]; const y0 = e[y + margin];
    ctx.fillRect(x0, y0, e[x + margin + l] - x0, e[y + margin + 1] - y0);
  }
  return canvas;
}
