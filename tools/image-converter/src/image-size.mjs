// Read an image's pixel size from its file header without decoding it (PNG, JPEG, WebP, GIF, BMP).
// Used to refuse oversized images before the browser tries to decode them. Returns { width, height } or null.

const u16be = (b, i) => (b[i] << 8) | b[i + 1];
const u16le = (b, i) => b[i] | (b[i + 1] << 8);
const u24le = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32be = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u32le = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const ascii = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));

export function readImageSize(b) {
  if (!b || b.length < 12) return null;
  // PNG: signature, then the IHDR chunk holds width and height.
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b.length >= 24) return { width: u32be(b, 16), height: u32be(b, 20) };
  // GIF
  if (ascii(b, 0, 3) === 'GIF') return { width: u16le(b, 6), height: u16le(b, 8) };
  // BMP
  if (b[0] === 0x42 && b[1] === 0x4d && b.length >= 26) return { width: u32le(b, 18), height: Math.abs(u32le(b, 22) | 0) };
  // JPEG: walk the segments until a start-of-frame marker.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = u16be(b, i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: u16be(b, i + 7), height: u16be(b, i + 5) };
      i += 2 + len;
    }
    return null;
  }
  // WebP: RIFF container with a lossy (VP8), lossless (VP8L) or extended (VP8X) chunk first.
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP' && b.length >= 30) {
    const kind = ascii(b, 12, 4);
    if (kind === 'VP8X') return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    if (kind === 'VP8L' && b[20] === 0x2f) { const v = u32le(b, 21); return { width: (v & 0x3fff) + 1, height: ((v >>> 14) & 0x3fff) + 1 }; }
    if (kind === 'VP8 ' && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  return null;
}
