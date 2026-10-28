// Draws the picture for the video: the chosen image fitted or filled onto a background, or a plain colour card
// with the file name when no image was chosen. Used for both the preview and the real frames.
import { fitRect, readableOn, wrapText } from './plan.mjs';

export function drawFrame(ctx, W, H, { bitmap = null, mode = 'fit', bg = '#000000', title = '' } = {}) {
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (bitmap) {
    const r = fitRect(bitmap.width, bitmap.height, W, H, mode);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, r.dx, r.dy, r.dw, r.dh);
  } else {
    const fs = Math.round(Math.min(W, H) * 0.075);
    const lines = wrapText(title, Math.max(8, Math.floor((W * 0.8) / (fs * 0.56))), 4);
    ctx.fillStyle = readableOn(bg);
    ctx.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = fs * 1.25;
    const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh, W * 0.9));
  }
  ctx.restore();
}
