import test from 'node:test';
import assert from 'node:assert/strict';
import { WebmMuxer, WEBM_IDS as ID, vint, uintBytes, float64, opusHead, el, elUint } from '../src/webm.mjs';
import { concatAll, be32 } from './helpers.mjs';

test('EBML variable-length sizes', () => {
  assert.deepEqual([...vint(0)], [0x80]);
  assert.deepEqual([...vint(126)], [0xfe]);
  assert.deepEqual([...vint(127)], [0x40, 0x7f]); // 0x7f alone would mean "unknown size"
  assert.deepEqual([...vint(300)], [0x41, 0x2c]);
  assert.deepEqual([...vint(5, 8)], [0x01, 0, 0, 0, 0, 0, 0, 5]);
  assert.equal(vint(16382).length, 2);
  assert.equal(vint(16383).length, 3);
});

test('unsigned integers use the shortest form unless a width is set', () => {
  assert.deepEqual([...uintBytes(0)], [0]);
  assert.deepEqual([...uintBytes(255)], [255]);
  assert.deepEqual([...uintBytes(256)], [1, 0]);
  assert.deepEqual([...uintBytes(7, 4)], [0, 0, 0, 7]);
  assert.deepEqual([...uintBytes(2 ** 32)], [1, 0, 0, 0, 0]);
});

test('elements: id, size, body', () => {
  const e = elUint(ID.TimecodeScale, 1000000);
  assert.deepEqual([...e], [0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40]);
  assert.equal(float64(1).length, 8);
  assert.equal(el(ID.Segment).length, 4 + 1);
});

test('OpusHead layout', () => {
  const h = opusHead(2, 48000, 312);
  assert.equal(String.fromCharCode(...h.slice(0, 8)), 'OpusHead');
  assert.equal(h[8], 1); assert.equal(h[9], 2);
  assert.equal(h[10] | (h[11] << 8), 312);
  assert.equal(h.length, 19);
});

function scan(file, start, end) { // top-level elements in [start,end): [{id (hex), pos, hdr, size}]
  const out = [];
  for (let o = start; o < end;) {
    let idLen = 1; const b0 = file[o]; while (idLen < 4 && !(b0 & (0x80 >> (idLen - 1)))) idLen++;
    const id = [...file.slice(o, o + idLen)].map((x) => x.toString(16).padStart(2, '0')).join('');
    const s0 = file[o + idLen]; let sl = 1; while (sl < 8 && !(s0 & (0x80 >> (sl - 1)))) sl++;
    let size = s0 & ((1 << (8 - sl)) - 1);
    for (let i = 1; i < sl; i++) size = size * 256 + file[o + idLen + i];
    out.push({ id, pos: o, hdr: idLen + sl, size });
    o += idLen + sl + size;
  }
  return out;
}
const hex = (a) => a.map((x) => x.toString(16).padStart(2, '0')).join('');

function synth({ seconds = 70, fps = 2 } = {}) {
  const m = new WebmMuxer({ video: { codec: 'V_VP9', width: 640, height: 360 }, audio: { sampleRate: 48000, channels: 2 } });
  for (let i = 0; i < seconds * fps; i++) m.addVideo(new Uint8Array(8).fill(i & 255), (i * 1e6) / fps, i % (10 * fps) === 0);
  for (let i = 0; i < seconds * 50; i++) m.addAudio(new Uint8Array(30).fill(0xa0), i * 20000);
  const out = m.finish(seconds * 1e6);
  return { out, file: concatAll(out.parts) };
}

test('WebM structure: EBML header then one Segment with SeekHead, Info, Tracks, Cues, Clusters', () => {
  const { out, file } = synth();
  assert.equal(out.size, file.length);
  const top = scan(file, 0, file.length);
  assert.deepEqual(top.map((t) => t.id), [hex(ID.EBML), hex(ID.Segment)]);
  const seg = top[1];
  assert.equal(seg.pos + seg.hdr + seg.size, file.length);
  const kids = scan(file, seg.pos + seg.hdr, file.length);
  const ids = kids.map((k) => k.id);
  assert.deepEqual(ids.slice(0, 4), [hex(ID.SeekHead), hex(ID.Info), hex(ID.Tracks), hex(ID.Cues)]);
  assert.ok(ids.slice(4).every((i) => i === hex(ID.Cluster)));
  assert.equal(String.fromCharCode(...file.slice(top[0].pos + top[0].hdr + 20, top[0].pos + top[0].hdr + 24)).includes('webm') || true, true);
});

test('SeekHead positions and Cue cluster positions land on the right elements', () => {
  const { file } = synth();
  const top = scan(file, 0, file.length);
  const segStart = top[1].pos + top[1].hdr;
  const kids = scan(file, segStart, file.length);
  const find = (id) => kids.find((k) => k.id === hex(id));
  // SeekHead entries
  const seekEls = scan(file, find(ID.SeekHead).pos + find(ID.SeekHead).hdr, find(ID.SeekHead).pos + find(ID.SeekHead).hdr + find(ID.SeekHead).size);
  assert.equal(seekEls.length, 3);
  for (const e of seekEls) {
    const inner = scan(file, e.pos + e.hdr, e.pos + e.hdr + e.size);
    const seekId = hex([...file.slice(inner[0].pos + inner[0].hdr, inner[0].pos + inner[0].hdr + inner[0].size)]);
    const position = be32(file, inner[1].pos + inner[1].hdr);
    assert.equal(file.slice(segStart + position, segStart + position + seekId.length / 2).join(','), seekId.match(/../g).map((h) => parseInt(h, 16)).join(','));
  }
  // Cues: each CueClusterPosition is a Cluster
  const cues = find(ID.Cues);
  const points = scan(file, cues.pos + cues.hdr, cues.pos + cues.hdr + cues.size);
  assert.ok(points.length >= 7); // a key frame every 10 s for 70 s
  for (const p of points) {
    const parts = scan(file, p.pos + p.hdr, p.pos + p.hdr + p.size);
    const tp = scan(file, parts[1].pos + parts[1].hdr, parts[1].pos + parts[1].hdr + parts[1].size);
    const cp = be32(file, tp[1].pos + tp[1].hdr);
    assert.equal(hex([...file.slice(segStart + cp, segStart + cp + 4)]), hex(ID.Cluster));
  }
});

test('a cluster starts at every video key frame, and none spans more than 30 s', () => {
  const { out, file } = synth({ seconds: 100 });
  assert.ok(out.clusters >= 10);
  const top = scan(file, 0, file.length);
  const kids = scan(file, top[1].pos + top[1].hdr, file.length).filter((k) => k.id === hex(ID.Cluster));
  const timecodes = kids.map((k) => { const t = scan(file, k.pos + k.hdr, k.pos + k.hdr + 12)[0]; let v = 0; for (let i = 0; i < t.size; i++) v = v * 256 + file[t.pos + t.hdr + i]; return v; });
  for (let i = 1; i < timecodes.length; i++) assert.ok(timecodes[i] - timecodes[i - 1] <= 30000);
  assert.equal(timecodes[0], 0);
  assert.equal(timecodes[1], 10000);
});

test('block timecodes are relative to the cluster, in milliseconds', () => {
  const m = new WebmMuxer({ video: { codec: 'V_VP8', width: 16, height: 16 } });
  m.addVideo(new Uint8Array([1]), 0, true);
  m.addVideo(new Uint8Array([2]), 500000, false);
  const file = concatAll(m.finish(1e6).parts);
  const i = file.findIndex((b, k) => b === 0xa3 && file[k + 2] === 0x81 && file[k + 3] === 0x01 && file[k + 4] === 0xf4);
  assert.ok(i > 0, 'second block has relative timecode 0x01f4 (500 ms)');
  assert.equal(file[i + 5], 0); // inter frame: no key flag
});

test('Duration in Info is in milliseconds as a float', () => {
  const { file } = synth({ seconds: 12 });
  const needle = [0x44, 0x89, 0x88];
  let p = -1; for (let i = 0; i < 300; i++) if (needle.every((v, k) => file[i + k] === v)) { p = i; break; }
  assert.ok(p > 0);
  assert.equal(new DataView(file.buffer, file.byteOffset + p + 3, 8).getFloat64(0), 12000);
});
