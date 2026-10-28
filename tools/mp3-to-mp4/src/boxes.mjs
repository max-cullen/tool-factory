// Byte helpers for ISO base media (MP4) boxes. Pure functions, no DOM. All numbers are big-endian.

export const u8 = (...n) => Uint8Array.from(n);
export const u16 = (v) => u8((v >>> 8) & 255, v & 255);
export const u24 = (v) => u8((v >>> 16) & 255, (v >>> 8) & 255, v & 255);
export const u32 = (v) => u8((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
export function u64(v) {
  const hi = Math.floor(v / 4294967296);
  const lo = v - hi * 4294967296;
  return concat([u32(hi), u32(lo)]);
}
/** Pack many 32-bit values at once (sample tables can hold hundreds of thousands of entries). */
export function u32Array(values) {
  const out = new Uint8Array(values.length * 4);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < values.length; i++) dv.setUint32(i * 4, values[i]);
  return out;
}
export function u64Array(values) {
  const out = new Uint8Array(values.length * 8);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < values.length; i++) { dv.setUint32(i * 8, Math.floor(values[i] / 4294967296)); dv.setUint32(i * 8 + 4, values[i] % 4294967296); }
  return out;
}
export const i32 = (v) => u32(v < 0 ? v + 4294967296 : v);
/** Four-character code as bytes. */
export function fourcc(s) {
  if (s.length !== 4) throw new Error(`fourcc needs 4 characters: "${s}"`);
  return u8(s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3));
}
export const zeros = (n) => new Uint8Array(n);
export const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);
/** Fixed point 16.16. */
export const fixed1616 = (v) => u32(Math.round(v * 65536) >>> 0);

export function concat(parts) {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** A box: size (4), type (4), payload. Switches to the 64-bit size form when it must. */
export function box(type, ...payload) {
  const body = concat(payload.flat());
  const total = 8 + body.length;
  if (total > 0xFFFFFFFF) return concat([u32(1), fourcc(type), u64(total + 8), body]);
  return concat([u32(total), fourcc(type), body]);
}
/** A "full box": box with a version byte and 24 bit flags in front of the payload. */
export const fullBox = (type, version, flags, ...payload) => box(type, u8(version), u24(flags), ...payload);

/** Header only, for a box whose body is written separately (the mdat). Returns the header bytes. */
export function boxHeader(type, bodyLength) {
  const total = 8 + bodyLength;
  if (total > 0xFFFFFFFF) return concat([u32(1), fourcc(type), u64(bodyLength + 16)]);
  return concat([u32(total), fourcc(type)]);
}

/** Read helpers, used by tests and by the AudioSpecificConfig fallback. */
export const readU32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
export const readU16 = (b, o) => (b[o] << 8) | b[o + 1];

/** MPEG-4 descriptor length: one to four bytes, 7 bits each, high bit = more follows. We use the shortest form. */
export function descLength(n) {
  if (n < 0x80) return u8(n);
  if (n < 0x4000) return u8(0x80 | (n >> 7), n & 0x7f);
  if (n < 0x200000) return u8(0x80 | (n >> 14), 0x80 | ((n >> 7) & 0x7f), n & 0x7f);
  return u8(0x80 | (n >> 21), 0x80 | ((n >> 14) & 0x7f), 0x80 | ((n >> 7) & 0x7f), n & 0x7f);
}
export const descriptor = (tag, body) => concat([u8(tag), descLength(body.length), body]);

const AAC_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
/** AudioSpecificConfig for AAC-LC (2 bytes): used only when the encoder gives no description. */
export function aacAudioSpecificConfig(sampleRate, channels) {
  const idx = AAC_RATES.indexOf(sampleRate);
  if (idx < 0) throw new Error(`No AAC sample rate index for ${sampleRate} Hz`);
  const objectType = 2; // AAC-LC
  const v = (objectType << 11) | (idx << 7) | (channels << 3);
  return u16(v);
}

/** The esds box for AAC in MP4 (ISO 14496-1 descriptors). */
export function esdsBox(asc, { avgBitrate = 0, maxBitrate = 0, bufferSize = 0 } = {}) {
  const decSpecific = descriptor(0x05, asc);
  const decConfig = descriptor(0x04, concat([
    u8(0x40), // object type: MPEG-4 audio
    u8(0x15), // stream type audio (5) << 2 | reserved 1
    u24(bufferSize), u32(maxBitrate), u32(avgBitrate), decSpecific,
  ]));
  const slConfig = descriptor(0x06, u8(0x02));
  const es = descriptor(0x03, concat([u16(1), u8(0), decConfig, slConfig])); // ES_ID 1, no flags
  return fullBox('esds', 0, 0, es);
}
