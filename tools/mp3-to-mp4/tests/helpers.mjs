// Test helpers: a box parser, and raw H.264 / AAC / VP8 / Opus streams made by ffmpeg (so the muxers get real encoded data).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const have = (cmd) => { try { return spawnSync(cmd, ['-version'], { stdio: 'ignore' }).status === 0; } catch (e) { return false; } };
export const haveFfmpeg = have('ffmpeg') && have('ffprobe');
export const tmpDir = () => mkdtempSync(path.join(tmpdir(), 'mp3mp4-'));
export const rm = (d) => rmSync(d, { recursive: true, force: true });

export const concatAll = (parts) => {
  let n = 0; for (const p of parts) n += p.length;
  const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
export const be32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
export const be64 = (b, o) => be32(b, o) * 4294967296 + be32(b, o + 4);
export const tag = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

/** Parse MP4 boxes in [start, end). Containers listed in `into` get children. */
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts']);
export function parseBoxes(b, start = 0, end = b.length) {
  const out = [];
  let o = start;
  while (o + 8 <= end) {
    let size = be32(b, o), hdr = 8;
    const type = tag(b, o + 4);
    if (size === 1) { size = be64(b, o + 8); hdr = 16; }
    if (size === 0) size = end - o;
    const box = { type, start: o, size, hdr, body: o + hdr, end: o + size };
    if (CONTAINERS.has(type)) box.children = parseBoxes(b, box.body, box.end);
    out.push(box);
    o += size;
  }
  return out;
}
export const find = (boxes, type) => boxes.find((x) => x.type === type);

// ---------- ffmpeg-made raw streams ----------
const run = (args, dir) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { cwd: dir }); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

/** H.264 Annex B -> {description (avcC), samples:[{data (length-prefixed), key}], width, height, fps} */
export function makeH264(dir, { w = 320, h = 180, fps = 2, seconds = 6, gop = 10 } = {}) {
  run(['-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=${fps}`, '-t', String(seconds), '-c:v', 'libx264', '-bf', '0', '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-f', 'h264', 'v.h264'], dir);
  const raw = readFileSync(path.join(dir, 'v.h264'));
  const nals = [];
  for (let i = 0; i + 3 < raw.length;) {
    if (raw[i] === 0 && raw[i + 1] === 0 && (raw[i + 2] === 1 || (raw[i + 2] === 0 && raw[i + 3] === 1))) {
      const sc = raw[i + 2] === 1 ? 3 : 4;
      if (nals.length) nals[nals.length - 1].end = i;
      nals.push({ start: i + sc, end: raw.length });
      i += sc;
    } else i++;
  }
  let sps = null, pps = null; const samples = []; let cur = null;
  for (const n of nals) {
    let end = n.end; while (end > n.start && raw[end - 1] === 0 && n !== nals[nals.length - 1]) end--; // trailing zero bytes belong to the next start code
    const data = raw.subarray(n.start, end);
    const type = data[0] & 31;
    if (type === 7) sps = data; else if (type === 8) pps = data;
    else if (type === 1 || type === 5) { cur = { parts: [], key: type === 5 }; cur.parts.push(data); samples.push(cur); }
    else if (type === 6 && !cur) { /* SEI before the first frame: drop */ } else if (type === 6) { /* drop SEI */ }
  }
  const lp = (d) => { const o = new Uint8Array(4 + d.length); new DataView(o.buffer).setUint32(0, d.length); o.set(d, 4); return o; };
  const samplesOut = samples.map((s) => ({ data: concatAll(s.parts.map(lp)), key: s.key }));
  const description = concatAll([Uint8Array.of(1, sps[1], sps[2], sps[3], 0xff, 0xe1, sps.length >> 8, sps.length & 255), sps, Uint8Array.of(1, pps.length >> 8, pps.length & 255), pps]);
  return { description, samples: samplesOut, width: w, height: h, fps };
}

/** AAC ADTS -> {description (AudioSpecificConfig), frames:[Uint8Array], sampleRate, channels} */
export function makeAac(dir, { seconds = 6, rate = 48000, channels = 2 } = {}) {
  run(['-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}:sample_rate=${rate}`, '-ac', String(channels), '-c:a', 'aac', '-b:a', '128k', '-f', 'adts', 'a.aac'], dir);
  const raw = readFileSync(path.join(dir, 'a.aac'));
  const frames = []; let asc = null;
  for (let o = 0; o + 7 <= raw.length;) {
    if (raw[o] !== 0xff || (raw[o + 1] & 0xf0) !== 0xf0) throw new Error('bad ADTS sync');
    const protectionAbsent = raw[o + 1] & 1;
    const aot = ((raw[o + 2] >> 6) & 3) + 1, idx = (raw[o + 2] >> 2) & 15, ch = ((raw[o + 2] & 1) << 2) | (raw[o + 3] >> 6);
    const len = ((raw[o + 3] & 3) << 11) | (raw[o + 4] << 3) | (raw[o + 5] >> 5);
    const hdr = protectionAbsent ? 7 : 9;
    if (!asc) { const v = (aot << 11) | (idx << 7) | (ch << 3); asc = Uint8Array.of(v >> 8, v & 255); }
    frames.push(raw.subarray(o + hdr, o + len));
    o += len;
  }
  return { description: asc, frames, sampleRate: rate, channels };
}

/** VP8 IVF -> {samples:[{data,key}], width, height, fps} */
export function makeVp8(dir, { w = 320, h = 180, fps = 2, seconds = 6, gop = 10 } = {}) {
  run(['-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=${fps}`, '-t', String(seconds), '-c:v', 'libvpx', '-g', String(gop), '-pix_fmt', 'yuv420p', '-f', 'ivf', 'v.ivf'], dir);
  const raw = readFileSync(path.join(dir, 'v.ivf'));
  const samples = [];
  for (let o = 32; o + 12 <= raw.length;) {
    const size = raw[o] | (raw[o + 1] << 8) | (raw[o + 2] << 16) | (raw[o + 3] << 24);
    const data = raw.subarray(o + 12, o + 12 + size);
    samples.push({ data, key: (data[0] & 1) === 0 });
    o += 12 + size;
  }
  return { samples, width: w, height: h, fps };
}

/** Opus in Ogg -> {description (OpusHead), packets, channels} (20 ms packets) */
export function makeOpus(dir, { seconds = 6, channels = 2 } = {}) {
  run(['-f', 'lavfi', '-i', `sine=frequency=330:duration=${seconds}:sample_rate=48000`, '-ac', String(channels), '-c:a', 'libopus', '-b:a', '96k', '-frame_duration', '20', '-f', 'ogg', 'a.ogg'], dir);
  const raw = readFileSync(path.join(dir, 'a.ogg'));
  const packets = []; let partial = [];
  for (let o = 0; o + 27 <= raw.length;) {
    const nseg = raw[o + 26];
    let p = o + 27 + nseg;
    for (let i = 0; i < nseg; i++) {
      const l = raw[o + 27 + i];
      partial.push(raw.subarray(p, p + l)); p += l;
      if (l < 255) { packets.push(concatAll(partial)); partial = []; }
    }
    o = p;
  }
  return { description: packets[0], packets: packets.slice(2), channels };
}

export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_packets', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}
export function fullDecode(file) {
  return spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-'], { encoding: 'utf8' });
}
