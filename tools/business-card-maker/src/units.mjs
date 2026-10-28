// Millimetre, pixel and PDF point conversions for the card. Pure functions.
export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const CARD = { width: 90, height: 55 }; // standard Australian business card, in mm
export const BLEED_MM = 3;
export const SAFE_MM = 4; // keep text and logos at least this far inside the trim edge
export const PRINT_DPI = 300;
export const SCREEN_WIDTH_PX = 900;

export const mmToPxExact = (mm, dpi = PRINT_DPI) => (mm / MM_PER_INCH) * dpi;
export const mmToPx = (mm, dpi = PRINT_DPI) => Math.round(mmToPxExact(mm, dpi));
export const pxToMm = (px, dpi = PRINT_DPI) => (px / dpi) * MM_PER_INCH;
export const mmToPt = (mm) => (mm / MM_PER_INCH) * PT_PER_INCH;
export const ptToMm = (pt) => (pt / PT_PER_INCH) * MM_PER_INCH;

/** Size of the printed area in mm: the trim size plus bleed on every side. */
export function sheetMm(bleed = 0) {
  return { width: CARD.width + 2 * bleed, height: CARD.height + 2 * bleed };
}
/** Pixel size of an export at `dpi`, with optional bleed in mm. 300 dpi, no bleed: 1063 x 650. */
export function cardPixels(dpi = PRINT_DPI, bleed = 0) {
  const s = sheetMm(bleed);
  return { width: mmToPx(s.width, dpi), height: mmToPx(s.height, dpi) };
}
/** Screen-size export: a fixed width in px, height in proportion. */
export function screenPixels(bleed = 0, width = SCREEN_WIDTH_PX) {
  const s = sheetMm(bleed);
  return { width, height: Math.round((width * s.height) / s.width) };
}
