// A minimal PDF writer: one image per page, nothing else. No dependencies.
// Each page is a MediaBox in points with the card image drawn edge to edge. Valid xref table with exact byte offsets.
import { mmToPt } from './units.mjs';

const enc = new TextEncoder();
const ascii = (s) => enc.encode(s);
/** Numbers in PDF content: fixed decimals, no exponent. */
export const num = (n) => String(Number(n.toFixed(3)));
/** Escape a PDF literal string; anything outside printable ASCII is dropped. */
export const pdfString = (s) => '(' + String(s).replace(/[^\x20-\x7e]/g, '').replace(/([\\()])/g, '\\$1') + ')';

/** Drop the alpha channel from RGBA pixels (as from canvas getImageData). */
export function rgbaToRgb(rgba) {
  const out = new Uint8Array((rgba.length / 4) * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4) { out[j++] = rgba[i]; out[j++] = rgba[i + 1]; out[j++] = rgba[i + 2]; }
  return out;
}

/**
 * pages: [{ widthMm, heightMm, trimInsetMm?, image: { width, height, data: Uint8Array, filter?: 'FlateDecode' | 'DCTDecode' | null } }]
 * `data` is 8-bit DeviceRGB, either raw, zlib-compressed (FlateDecode) or JPEG (DCTDecode).
 * trimInsetMm (the bleed) adds a TrimBox inside the MediaBox. Returns a Uint8Array.
 */
export function buildPdf({ pages, title = 'Business card' }) {
  if (!pages || !pages.length) throw new Error('buildPdf needs at least one page');
  const chunks = [];
  const offsets = []; // offsets[n] = byte offset of object n
  let pos = 0;
  const add = (bytes) => { chunks.push(bytes); pos += bytes.length; };
  const obj = (n, body, streamBytes) => {
    offsets[n] = pos;
    add(ascii(`${n} 0 obj\n${body}`));
    if (streamBytes) { add(ascii('\nstream\n')); add(streamBytes); add(ascii('\nendstream')); }
    add(ascii('\nendobj\n'));
  };

  add(ascii('%PDF-1.4\n'));
  add(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker comment
  const first = 4;
  const kids = pages.map((_, i) => `${first + i * 3} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  obj(3, `<< /Title ${pdfString(title)} /Producer (Business Card Maker) >>`);
  pages.forEach((p, i) => {
    const pageNo = first + i * 3; const contentNo = pageNo + 1; const imageNo = pageNo + 2;
    const w = mmToPt(p.widthMm); const h = mmToPt(p.heightMm);
    const t = p.trimInsetMm ? mmToPt(p.trimInsetMm) : 0;
    const boxes = t ? ` /TrimBox [${num(t)} ${num(t)} ${num(w - t)} ${num(h - t)}] /BleedBox [0 0 ${num(w)} ${num(h)}]` : '';
    obj(pageNo, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(w)} ${num(h)}]${boxes} /Resources << /XObject << /Im0 ${imageNo} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentNo} 0 R >>`);
    const content = ascii(`q ${num(w)} 0 0 ${num(h)} 0 0 cm /Im0 Do Q`);
    obj(contentNo, `<< /Length ${content.length} >>`, content);
    const im = p.image;
    const filter = im.filter ? ` /Filter /${im.filter}` : '';
    obj(imageNo, `<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${filter} /Length ${im.data.length} >>`, im.data);
  });

  const count = offsets.length; // objects 1..count-1
  const xrefPos = pos;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  add(ascii(xref));

  const out = new Uint8Array(pos);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
