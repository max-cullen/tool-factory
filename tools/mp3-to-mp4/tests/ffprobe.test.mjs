// Validates our muxers against ffprobe and a full ffmpeg decode, using real encoded data made by ffmpeg
// (libx264 -> Annex B, aac -> ADTS, libvpx -> IVF, libopus -> Ogg), converted here to what WebCodecs delivers.
// Skipped when ffmpeg or ffprobe is not installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Mp4Muxer } from '../src/mp4.mjs';
import { WebmMuxer } from '../src/webm.mjs';
import { haveFfmpeg, tmpDir, rm, makeH264, makeAac, makeVp8, makeOpus, probe, fullDecode, parseBoxes, concatAll } from './helpers.mjs';

const opts = { skip: haveFfmpeg ? false : 'ffmpeg/ffprobe not installed' };
const SECONDS = 6;

function buildMp4(dir, { wide = false, channels = 2, w = 320, h = 180 } = {}) {
  const v = makeH264(dir, { w, h, fps: 2, seconds: SECONDS, gop: 10 });
  const a = makeAac(dir, { seconds: SECONDS, channels });
  const mux = new Mp4Muxer({ video: { width: w, height: h, description: v.description }, audio: { sampleRate: 48000, channels, description: a.description, bitrate: 128000 } });
  v.samples.forEach((s, i) => mux.addVideo(s.data, (i * 1e6) / v.fps, s.key));
  a.frames.forEach((f, i) => mux.addAudio(f, (i * 1024 * 1e6) / 48000, (1024 * 1e6) / 48000));
  const out = mux.finish(SECONDS * 1e6, { wide });
  const file = path.join(dir, wide ? 'wide.mp4' : 'out.mp4');
  writeFileSync(file, concatAll(out.parts));
  return { file, v, a, out };
}

test('MP4: ffprobe sees H.264 and AAC with the right size, rate and duration', opts, () => {
  const dir = tmpDir();
  try {
    const { file, v } = buildMp4(dir);
    const info = probe(file);
    const vs = info.streams.find((s) => s.codec_type === 'video');
    const as = info.streams.find((s) => s.codec_type === 'audio');
    assert.equal(vs.codec_name, 'h264');
    assert.equal(vs.width, 320); assert.equal(vs.height, 180);
    assert.equal(Number(vs.nb_read_packets), v.samples.length);
    assert.equal(as.codec_name, 'aac');
    assert.equal(as.sample_rate, '48000');
    assert.equal(as.channels, 2);
    assert.ok(Math.abs(Number(info.format.duration) - SECONDS) < 0.05, `duration ${info.format.duration}`);
    assert.ok(Math.abs(Number(vs.duration) - SECONDS) < 0.05);
    assert.match(info.format.format_name, /mp4/);
  } finally { rm(dir); }
});

test('MP4: a full decode finishes with no errors', opts, () => {
  const dir = tmpDir();
  try {
    const { file } = buildMp4(dir);
    const r = fullDecode(file);
    assert.equal(r.status, 0);
    assert.equal(r.stderr.trim(), '');
  } finally { rm(dir); }
});

test('MP4: moov comes before mdat (fast start)', opts, () => {
  const dir = tmpDir();
  try {
    const { file } = buildMp4(dir);
    const top = parseBoxes(readFileSync(file));
    assert.deepEqual(top.map((b) => b.type), ['ftyp', 'moov', 'mdat']);
  } finally { rm(dir); }
});

test('MP4: forced 64-bit offsets (co64) also decode cleanly', opts, () => {
  const dir = tmpDir();
  try {
    const { file } = buildMp4(dir, { wide: true });
    assert.equal(fullDecode(file).stderr.trim(), '');
    assert.equal(probe(file).streams.length, 2);
  } finally { rm(dir); }
});

test('MP4: mono audio and a portrait size', opts, () => {
  const dir = tmpDir();
  try {
    const { file } = buildMp4(dir, { channels: 1, w: 180, h: 320 });
    const info = probe(file);
    assert.equal(info.streams.find((s) => s.codec_type === 'audio').channels, 1);
    assert.equal(info.streams.find((s) => s.codec_type === 'video').height, 320);
    assert.equal(fullDecode(file).stderr.trim(), '');
  } finally { rm(dir); }
});

test('MP4: ffmpeg can seek and copy streams out (the sample tables are consistent)', opts, () => {
  const dir = tmpDir();
  try {
    const { file } = buildMp4(dir);
    const copy = path.join(dir, 'copy.mkv');
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', '3', '-i', file, '-c', 'copy', copy], { encoding: 'utf8' });
    assert.equal(r.status, 0);
    assert.equal(r.stderr.trim(), '');
  } finally { rm(dir); }
});

function buildWebm(dir) {
  const v = makeVp8(dir, { fps: 2, seconds: SECONDS, gop: 10 });
  const a = makeOpus(dir, { seconds: SECONDS });
  const mux = new WebmMuxer({ video: { codec: 'V_VP8', width: 320, height: 180 }, audio: { sampleRate: 48000, channels: 2, description: a.description } });
  v.samples.forEach((s, i) => mux.addVideo(s.data, (i * 1e6) / v.fps, s.key));
  a.packets.forEach((p, i) => mux.addAudio(p, i * 20000));
  const out = mux.finish(SECONDS * 1e6);
  const file = path.join(dir, 'out.webm');
  writeFileSync(file, concatAll(out.parts));
  return { file, v, a, out };
}

test('WebM: ffprobe sees VP8 and Opus with the right duration', opts, () => {
  const dir = tmpDir();
  try {
    const { file, v } = buildWebm(dir);
    const info = probe(file);
    const vs = info.streams.find((s) => s.codec_type === 'video');
    const as = info.streams.find((s) => s.codec_type === 'audio');
    assert.equal(vs.codec_name, 'vp8');
    assert.equal(vs.width, 320);
    assert.equal(Number(vs.nb_read_packets), v.samples.length);
    assert.equal(as.codec_name, 'opus');
    assert.equal(as.channels, 2);
    assert.ok(Math.abs(Number(info.format.duration) - SECONDS) < 0.1, `duration ${info.format.duration}`);
    assert.match(info.format.format_name, /webm/);
  } finally { rm(dir); }
});

test('WebM: a full decode finishes with no errors, and seeking works', opts, () => {
  const dir = tmpDir();
  try {
    const { file } = buildWebm(dir);
    const r = fullDecode(file);
    assert.equal(r.status, 0);
    assert.equal(r.stderr.trim(), '');
    const copy = path.join(dir, 'copy.mkv');
    const s = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', '3', '-i', file, '-c', 'copy', copy], { encoding: 'utf8' });
    assert.equal(s.status, 0);
    assert.equal(s.stderr.trim(), '');
  } finally { rm(dir); }
});
