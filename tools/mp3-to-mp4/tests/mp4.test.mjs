import test from 'node:test';
import assert from 'node:assert/strict';
import { Mp4Muxer, runs, sampleTables, chunkSampleCounts, usToTicks, VIDEO_TIMESCALE } from '../src/mp4.mjs';
import { parseBoxes, find, concatAll, be32, be64, tag } from './helpers.mjs';

test('run-length encoding for stts', () => {
  assert.deepEqual(runs([1024, 1024, 1024, 1000]), [[3, 1024], [1, 1000]]);
  assert.deepEqual(runs([]), []);
});

test('sample tables: stts, stss, stsc, stsz', () => {
  const samples = [
    { size: 10, duration: 5, key: true }, { size: 20, duration: 5, key: false }, { size: 30, duration: 5, key: false },
    { size: 40, duration: 4, key: true }, { size: 50, duration: 5, key: false },
  ];
  const t = sampleTables(samples, [2, 2, 1]);
  assert.deepEqual(t.stts, [[3, 5], [1, 4], [1, 5]]);
  assert.deepEqual(t.stss, [1, 4]);
  assert.deepEqual(t.stsc, [[1, 2, 1], [3, 1, 1]]);
  assert.deepEqual(t.sizes, [10, 20, 30, 40, 50]);
});

test('chunks hold about a second of media each and are never empty', () => {
  const s = (d) => ({ size: 1, duration: d });
  assert.deepEqual(chunkSampleCounts([s(500), s(500), s(500), s(500), s(500)], 1000), [2, 2, 1]);
  assert.deepEqual(chunkSampleCounts([s(5000)], 1000), [1]);
  assert.deepEqual(chunkSampleCounts([], 1000), []);
});

test('microseconds convert to ticks with rounding', () => {
  assert.equal(usToTicks(500000, 90000), 45000);
  assert.equal(usToTicks(21333, 48000), 1024);
  assert.equal(usToTicks(1, 48000), 0);
});

// ---- a synthetic file: 3 s video at 2 fps (key every 4 frames), 3 s of 1024-sample audio frames ----
function synth({ wide = false, seconds = 3, fps = 2 } = {}) {
  const avcC = Uint8Array.of(1, 100, 0, 40, 0xff, 0xe1, 0, 4, 0x67, 1, 2, 3, 1, 0, 2, 0x68, 9);
  const mux = new Mp4Muxer({ video: { width: 320, height: 180, description: avcC }, audio: { sampleRate: 48000, channels: 2, bitrate: 128000 } });
  const vFrames = seconds * fps;
  for (let i = 0; i < vFrames; i++) mux.addVideo(new Uint8Array(10 + i).fill(0x40 + i), Math.round((i * 1e6) / fps), i % 4 === 0);
  const aFrames = Math.ceil((seconds * 48000) / 1024);
  for (let i = 0; i < aFrames; i++) mux.addAudio(new Uint8Array(20 + (i % 7)).fill(0xa0 + (i % 16)), Math.round((i * 1024 * 1e6) / 48000), (1024 * 1e6) / 48000);
  const out = mux.finish(seconds * 1e6, { wide });
  return { out, file: concatAll(out.parts), vFrames, aFrames };
}

test('file layout: ftyp, then moov (fast start), then mdat', () => {
  const { out, file } = synth();
  const top = parseBoxes(file);
  assert.deepEqual(top.map((b) => b.type), ['ftyp', 'moov', 'mdat']);
  assert.equal(out.size, file.length);
  assert.equal(top[2].end, file.length);
  assert.equal(tag(file, 8), 'isom');
});

function tables(file, kind) {
  const moov = find(parseBoxes(file), 'moov');
  const traks = moov.children.filter((c) => c.type === 'trak');
  const trak = traks[kind === 'video' ? 0 : 1];
  const stbl = find(find(find(trak.children, 'mdia').children, 'minf').children, 'stbl');
  const get = (t) => find(stbl.children, t);
  return { moov, trak, stbl, get };
}

test('video stts, stss and stsz match what was added', () => {
  const { file, vFrames } = synth();
  const { get } = tables(file, 'video');
  const stts = get('stts');
  assert.equal(be32(file, stts.body + 4), 1); // one run: constant 0.5 s frames
  assert.equal(be32(file, stts.body + 8), vFrames);
  assert.equal(be32(file, stts.body + 12), VIDEO_TIMESCALE / 2);
  const stss = get('stss');
  const n = be32(file, stss.body + 4);
  const keys = Array.from({ length: n }, (_, i) => be32(file, stss.body + 8 + i * 4));
  assert.deepEqual(keys, [1, 5]); // frames 0 and 4
  const stsz = get('stsz');
  assert.equal(be32(file, stsz.body + 8), vFrames);
  assert.equal(be32(file, stsz.body + 12), 10);
  assert.equal(be32(file, stsz.body + 16), 11);
});

test('audio stts run-length and stsd entry', () => {
  const { file, aFrames } = synth();
  const { get, stbl } = tables(file, 'audio');
  const stts = get('stts');
  assert.equal(be32(file, stts.body + 4), 1);
  assert.equal(be32(file, stts.body + 8), aFrames);
  assert.equal(be32(file, stts.body + 12), 1024);
  const stsd = get('stsd');
  assert.equal(tag(file, stsd.body + 12), 'mp4a');
  assert.equal(get('stss'), undefined); // audio has no sync sample table: every sample is a sync sample
  assert.ok(stbl.children.length >= 5);
});

test('chunk offsets point at the right samples, and chunks interleave in time order', () => {
  const { file, out } = synth();
  const top = parseBoxes(file);
  const mdat = top[2];
  for (const [kind, markerFirst] of [['video', 0x40], ['audio', 0xa0]]) {
    const { get } = tables(file, kind);
    const stco = get('stco');
    const n = be32(file, stco.body + 4);
    const offs = Array.from({ length: n }, (_, i) => be32(file, stco.body + 8 + i * 4));
    assert.ok(offs[0] >= mdat.body && offs.every((o) => o < mdat.end));
    assert.equal(file[offs[0]], markerFirst); // first sample of first chunk
  }
  // Layout order is by start time; at 0 s the video chunk leads the audio chunk.
  assert.equal(out.layout[0].track, 0);
  assert.equal(out.layout[1].track, 1);
  const starts = out.layout.map((c) => c.startSec);
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b));
  // First chunk of each track begins where the layout says: video (0), then audio starts after the video chunk bytes.
  const vBytes = out.layout[0].bytes;
  const aOff = (() => { const { get } = tables(file, 'audio'); return be32(file, get('stco').body + 8); })();
  assert.equal(aOff, mdat.body + vBytes);
});

test('stsc describes chunk sizes and the sum of stsz equals the mdat body', () => {
  const { file } = synth();
  const mdat = parseBoxes(file)[2];
  let total = 0;
  for (const kind of ['video', 'audio']) {
    const { get } = tables(file, kind);
    const stsz = get('stsz'); const n = be32(file, stsz.body + 8);
    let samples = 0;
    for (let i = 0; i < n; i++) total += be32(file, stsz.body + 12 + i * 4);
    samples = n;
    const stsc = get('stsc'); const runsN = be32(file, stsc.body + 4);
    const stco = get('stco'); const chunks = be32(file, stco.body + 4);
    let counted = 0;
    for (let r = 0; r < runsN; r++) {
      const first = be32(file, stsc.body + 8 + r * 12), per = be32(file, stsc.body + 12 + r * 12);
      const next = r + 1 < runsN ? be32(file, stsc.body + 8 + (r + 1) * 12) : chunks + 1;
      counted += (next - first) * per;
    }
    assert.equal(counted, samples);
  }
  assert.equal(total, mdat.end - mdat.body);
});

test('durations and timescales: movie 1000, video 90000, audio 48000', () => {
  const { file } = synth();
  const { moov, get, trak } = tables(file, 'video');
  const mvhd = find(moov.children, 'mvhd');
  assert.equal(be32(file, mvhd.body + 12), 1000);
  assert.equal(be32(file, mvhd.body + 16), 3008); // the audio (141 frames of 1024) runs 8 ms past the 3 s video
  const mdhdV = find(find(trak.children, 'mdia').children, 'mdhd');
  assert.equal(be32(file, mdhdV.body + 12), 90000);
  assert.equal(be32(file, mdhdV.body + 16), 270000);
  const a = tables(file, 'audio');
  const mdhdA = find(find(a.trak.children, 'mdia').children, 'mdhd');
  assert.equal(be32(file, mdhdA.body + 12), 48000);
  assert.equal(be32(file, mdhdA.body + 16), Math.ceil((3 * 48000) / 1024) * 1024);
  assert.ok(get('stco'));
});

test('the last video frame is stretched to the stated duration', () => {
  const avcC = Uint8Array.of(1, 100, 0, 40, 0xff, 0xe1, 0, 1, 0x67, 1, 0, 1, 0x68);
  const mux = new Mp4Muxer({ video: { width: 16, height: 16, description: avcC } });
  mux.addVideo(new Uint8Array(5), 0, true);
  mux.addVideo(new Uint8Array(5), 500000, false);
  const out = mux.finish(2_000_000);
  assert.equal(out.durationSeconds, 2);
  const file = concatAll(out.parts);
  const { get } = tables(file, 'video');
  const stts = get('stts');
  assert.equal(be32(file, stts.body + 4), 2);
  assert.equal(be32(file, stts.body + 12), 45000);
  assert.equal(be32(file, stts.body + 20), 135000);
});

test('64-bit offsets (co64) when forced, with correct offsets and the same layout', () => {
  const { file, out } = synth({ wide: true });
  assert.equal(out.wide, true);
  const mdat = parseBoxes(file)[2];
  const { get } = tables(file, 'video');
  assert.equal(get('stco'), undefined);
  const co = get('co64');
  const first = be64(file, co.body + 8);
  assert.equal(first, mdat.body);
  assert.equal(file[first], 0x40);
});

test('the muxer refuses bad input', () => {
  assert.throws(() => new Mp4Muxer({ video: { width: 1, height: 1 } }));
  const avcC = Uint8Array.of(1, 2, 3);
  const m = new Mp4Muxer({ video: { width: 2, height: 2, description: avcC } });
  assert.throws(() => m.finish(1000), /No video/);
  m.addVideo(new Uint8Array(2), 0, false);
  assert.throws(() => m.finish(1000), /key frame/);
});

test('missing AAC description falls back to a computed AudioSpecificConfig', () => {
  const avcC = Uint8Array.of(1, 2, 3, 4);
  const m = new Mp4Muxer({ video: { width: 2, height: 2, description: avcC }, audio: { sampleRate: 44100, channels: 2 } });
  assert.deepEqual([...m.audio.description], [0x12, 0x10]);
});
