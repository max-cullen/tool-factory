// Read the pixel size of a PNG, JPEG or WebP from its first bytes, so a huge file can be refused before the
// browser tries to decode it. Returns { width, height } or null when the format is not recognised.
// (EXIF rotation swaps width and height but not their product, which is all the size limit uses.)

export function sniffSize(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const n = u8.length;
  const be32 = (i) => ((u8[i] << 24) | (u8[i + 1] << 16) | (u8[i + 2] << 8) | u8[i + 3]) >>> 0;
  const le24 = (i) => u8[i] | (u8[i + 1] << 8) | (u8[i + 2] << 16);
  const ascii = (i, s) => [...s].every((c, k) => u8[i + k] === c.charCodeAt(0));

  // PNG: 8-byte signature, then the IHDR chunk with width and height as big-endian 32-bit numbers.
  if (n >= 24 && u8[0] === 0x89 && ascii(1, 'PNG')) return { width: be32(16), height: be32(20) };

  // JPEG: walk the segments until a start-of-frame marker.
  if (n >= 4 && u8[0] === 0xff && u8[1] === 0xd8) {
    let i = 2;
    while (i + 9 < n) {
      if (u8[i] !== 0xff) { i++; continue; }
      const m = u8[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = (u8[i + 2] << 8) | u8[i + 3];
      const sof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
      if (sof) return { height: (u8[i + 5] << 8) | u8[i + 6], width: (u8[i + 7] << 8) | u8[i + 8] };
      if (len < 2) return null;
      i += 2 + len;
    }
    return null;
  }

  // WebP: RIFF container with a VP8X (extended), VP8 (lossy) or VP8L (lossless) chunk first.
  if (n >= 30 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    if (ascii(12, 'VP8X')) return { width: le24(24) + 1, height: le24(27) + 1 };
    if (ascii(12, 'VP8 ')) return { width: (u8[26] | (u8[27] << 8)) & 0x3fff, height: (u8[28] | (u8[29] << 8)) & 0x3fff };
    if (ascii(12, 'VP8L') && u8[20] === 0x2f) {
      const b = u8[21] | (u8[22] << 8) | (u8[23] << 16) | (u8[24] << 24);
      return { width: (b & 0x3fff) + 1, height: ((b >>> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}
