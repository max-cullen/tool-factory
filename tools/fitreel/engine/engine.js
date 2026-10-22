// FitReel engine: turns a video into a 1080x1920 (9:16) MP4 for Reels, entirely in the browser.
// Built on Mediabunny (MPL-2.0) and the browser's WebCodecs encoders. Nothing is uploaded.
// Plain ES module with no UI code, so it can be tested on its own (see ../test).
import * as MB from './vendor/mediabunny.min.mjs';

export const OUT_W = 1080;
export const OUT_H = 1920;
export const REEL_MAX_SECONDS = 180; // Instagram's Reel length limit at the time of writing
export const MAX_INPUT_SECONDS = 15 * 60;
const MAX_FPS = 60;
const BITRATE = { best: 8_000_000, small: 3_500_000 };
const AUDIO_BITRATE = 128_000;

export class EngineError extends Error {
  constructor(message, code = 'error') { super(message); this.code = code; }
}
const aborted = () => new EngineError('Cancelled', 'aborted');

/* ---------- support ---------- */

/** Can this browser run the tool at all? Checked before anything else. */
export function browserSupport() {
  const ok = typeof window !== 'undefined' && typeof window.VideoEncoder === 'function' && typeof window.VideoDecoder === 'function';
  return ok ? { ok: true } : { ok: false, reason: 'This browser cannot process video on your device. Please use a recent version of Chrome, Edge, Safari or Firefox.' };
}

let audioCodecPromise = null;
/** AAC if the browser has it, otherwise a small built-in AAC encoder (loaded only when needed), otherwise Opus. */
export function pickAudioCodec() {
  audioCodecPromise ||= (async () => {
    if (await MB.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48000, bitrate: AUDIO_BITRATE })) return 'aac';
    try {
      const { registerAacEncoder } = await import('./vendor/mediabunny-aac-encoder.min.mjs');
      registerAacEncoder();
      if (await MB.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48000 })) return 'aac';
    } catch (e) { /* fall through */ }
    if (await MB.canEncodeAudio('opus')) return 'opus';
    return null;
  })();
  return audioCodecPromise;
}

let videoCodecPromise = null;
/** H.264 is what Instagram expects. Other codecs are only a fallback for browsers without an H.264 encoder. */
export function pickVideoCodec() {
  videoCodecPromise ||= (async () => {
    for (const codec of ['avc', 'hevc', 'vp9', 'av1']) {
      try { if (await MB.canEncodeVideo(codec, { width: OUT_W, height: OUT_H, bitrate: BITRATE.best })) return codec; } catch (e) { /* next */ }
    }
    return null;
  })();
  return videoCodecPromise;
}

export const CODEC_NAME = { avc: 'H.264', hevc: 'HEVC', vp9: 'VP9', av1: 'AV1', vp8: 'VP8', aac: 'AAC', opus: 'Opus', mp3: 'MP3' };

/* ---------- opening a video ---------- */

/**
 * Open a video file. Reads only what it needs; the file stays on the device.
 * @returns {Promise<Clip>}
 */
export async function openVideo(file) {
  if (!file || !file.size) throw new EngineError('That file is empty.');
  const input = new MB.Input({ source: new MB.BlobSource(file), formats: MB.ALL_FORMATS });
  let video;
  try { video = await input.getPrimaryVideoTrack(); } catch (e) { console.warn(e); throw new EngineError('That file could not be read as a video. Try an MP4, MOV or WebM file.'); }
  if (!video) throw new EngineError('No video was found in that file.');
  const codec = await safe(() => video.getCodec(), null);
  if (!(await video.canDecode())) {
    const name = CODEC_NAME[codec] || codec || 'this format';
    throw new EngineError(`This browser cannot read ${name} video. Try Chrome or Safari, or save the video as an MP4 (H.264) first.`);
  }
  let audio = null, hadAudioTrack = false, audioInfo = null;
  try {
    const a = await input.getPrimaryAudioTrack();
    hadAudioTrack = !!a;
    if (a && (await a.canDecode())) {
      audio = a;
      audioInfo = { codec: await a.getCodec(), sampleRate: await a.getSampleRate(), channels: await a.getNumberOfChannels() };
    }
  } catch (e) { audio = null; }
  const duration = await input.computeDuration();
  if (!(duration > 0)) throw new EngineError('That video has no length.');
  if (duration > MAX_INPUT_SECONDS) throw new EngineError('That video is longer than 15 minutes. Trim it first, then try again.');
  const width = await video.getDisplayWidth();
  const height = await video.getDisplayHeight();
  const stats = await safe(() => video.computePacketStats(120), null);
  const fps = stats?.averagePacketRate > 0 ? stats.averagePacketRate : 30;
  const start = await safe(() => video.getFirstTimestamp(), 0);
  const meta = await readMetadata(file, input);
  return {
    file, input, video, audio, duration, width, height, fps, start: Math.max(0, start || 0), meta,
    hadAudioTrack, audioInfo, codec, bitrate: stats?.averageBitrate || 0,
    previewSink: null, previewScale: 0,
  };
}

const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { return fallback; } };

export function closeVideo(clip) {
  try { clip?.input?.dispose?.(); } catch (e) { /* ignore */ }
}

/* ---------- metadata ---------- */

const ascii = (s) => new TextEncoder().encode(s);
// Where phones and cameras store GPS in MP4/MOV files: the QuickTime ©xyz atom, Apple's keyed tag, and the 3GPP 'loci' box.
const LOCATION_MARKERS = [Uint8Array.of(0xa9, 0x78, 0x79, 0x7a), ascii('location.ISO6709'), ascii('loci')];
function indexOf(hay, needle) {
  const first = needle[0];
  outer: for (let i = hay.indexOf(first); i >= 0 && i <= hay.length - needle.length; i = hay.indexOf(first, i + 1)) {
    for (let j = 1; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * What hidden information the file carries: location, device, dates, other tags.
 * Uses Mediabunny's tag reader plus a byte scan of the file's header areas (where phones put location).
 */
export async function readMetadata(file, input) {
  const out = { location: false, device: '', date: false, software: '', tags: 0 };
  const tags = await safe(() => input.getMetadataTags(), {});
  const raw = tags?.raw || {};
  const keys = Object.keys(raw);
  out.tags = keys.length + (tags?.date ? 1 : 0);
  const str = (v) => (typeof v === 'string' ? v : '');
  for (const k of keys) {
    const kl = k.toLowerCase();
    if (kl.includes('location') || kl === '©xyz' || kl === 'loci' || kl === 'xyz') out.location = true;
    if (kl.endsWith('.model') || kl === '©mod') out.device = str(raw[k]) || out.device;
    if (!out.device && (kl.endsWith('.make') || kl === '©mak')) out.device = str(raw[k]);
    if (kl.includes('creationdate') || kl === '©day' || kl === 'date') out.date = true;
    if (kl.endsWith('.software') || kl === '©swr') out.software = str(raw[k]);
  }
  if (tags?.date) out.date = true;
  // Byte scan: the start and end of the file hold the header ("moov") on phone videos.
  const span = 4 * 1024 * 1024;
  const parts = file.size <= span * 2 ? [file] : [file.slice(0, span), file.slice(file.size - span)];
  for (const p of parts) {
    const bytes = new Uint8Array(await p.arrayBuffer());
    if (!out.location && LOCATION_MARKERS.some((m) => indexOf(bytes, m) >= 0)) out.location = true;
  }
  return out;
}

/* ---------- frames and drawing ---------- */

/** A canvas sink sized so frames are sharp enough for the target box without decoding at needless size. */
function makeSink(clip, needW, needH, poolSize = 3) {
  const scale = Math.min(1, Math.max(needW / clip.width, needH / clip.height));
  const width = Math.max(2, Math.round((clip.width * scale) / 2) * 2);
  return new MB.CanvasSink(clip.video, { width, height: Math.max(2, Math.round((clip.height * scale) / 2) * 2), fit: 'fill', poolSize });
}

let blurCanvas = null;
let tinyCanvas = null;
const newCanvas = (w, h) => (typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));

/** Draw `src` covering the box, with an even crop. `pos` 0..1 moves the crop along whichever axis overflows. */
function drawCover(ctx, src, x, y, w, h, pos = 0.5) {
  const sw = src.width, sh = src.height;
  const s = Math.max(w / sw, h / sh);
  const cw = w / s, ch = h / s;
  const sx = (sw - cw) * pos, sy = (sh - ch) * pos;
  ctx.drawImage(src, sx, sy, cw, ch, x, y, w, h);
}
function drawContain(ctx, src, x, y, w, h) {
  const s = Math.min(w / src.width, h / src.height);
  const dw = src.width * s, dh = src.height * s;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
/** Soft, blurred copy of the frame filling the box: cheap (works on small canvases) and the same in every browser. */
function drawBlurred(ctx, src, x, y, w, h) {
  const bw = 90, bh = Math.round((90 * h) / w);
  blurCanvas ||= newCanvas(bw, bh);
  if (blurCanvas.width !== bw || blurCanvas.height !== bh) { blurCanvas.width = bw; blurCanvas.height = bh; }
  tinyCanvas ||= newCanvas(18, Math.round((18 * h) / w));
  tinyCanvas.height = Math.max(2, Math.round((18 * h) / w));
  const t = tinyCanvas.getContext('2d');
  t.imageSmoothingQuality = 'high';
  drawCover(t, src, 0, 0, tinyCanvas.width, tinyCanvas.height);
  const b = blurCanvas.getContext('2d');
  b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high';
  b.drawImage(tinyCanvas, 0, 0, bw, bh);
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(blurCanvas, x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Compose one output frame.
 * @param {CanvasRenderingContext2D} ctx  target, any size with a 9:16 shape
 * @param {CanvasImageSource} a  main frame
 * @param {CanvasImageSource|null} b  second clip frame (split screen)
 * @param {object} o  options (see normalise)
 */
export function composeFrame(ctx, a, b, o) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (o.split) {
    const half = Math.round(H / 2);
    const top = o.swap ? b : a, bottom = o.swap ? a : b;
    const topPos = o.swap ? o.pos2 : o.pos, bottomPos = o.swap ? o.pos : o.pos2;
    if (top) drawCover(ctx, top, 0, 0, W, half, topPos);
    if (bottom) drawCover(ctx, bottom, 0, half, W, H - half, bottomPos);
    return;
  }
  if (!a) return;
  if (o.framing === 'crop') return drawCover(ctx, a, 0, 0, W, H, o.pos);
  if (o.framing === 'blur') drawBlurred(ctx, a, 0, 0, W, H);
  drawContain(ctx, a, 0, 0, W, H);
}

/** Fill in defaults and clamp. */
export function normalise(clip, o = {}) {
  const len = clip.duration - clip.start;
  let trimStart = Math.max(0, Math.min(len, Number(o.trimStart) || 0));
  let trimEnd = o.trimEnd == null ? len : Math.max(0, Math.min(len, Number(o.trimEnd)));
  if (trimEnd - trimStart < 0.2) trimEnd = Math.min(len, trimStart + 0.2);
  return {
    framing: ['blur', 'crop', 'bars'].includes(o.framing) ? o.framing : 'blur',
    pos: clamp01(o.pos ?? 0.5), pos2: clamp01(o.pos2 ?? 0.5),
    split: !!o.split, swap: !!o.swap,
    sound: ['main', 'second', 'none'].includes(o.sound) ? o.sound : 'main',
    quality: o.quality === 'small' ? 'small' : 'best',
    strip: o.strip !== false,
    trimStart, trimEnd,
  };
}
const clamp01 = (v) => Math.max(0, Math.min(1, Number(v)));

/** A frame of the clip at time `t` (seconds from the clip's start), for previews. */
export async function frameAt(clip, t, boxW = 540, boxH = 960) {
  const scale = Math.min(1, Math.max(boxW / clip.width, boxH / clip.height));
  if (!clip.previewSink || clip.previewScale !== scale) {
    clip.previewSink = makeSink(clip, boxW, boxH, 0);
    clip.previewScale = scale;
  }
  const w = await clip.previewSink.getCanvas(clip.start + Math.max(0, t));
  if (w) return w.canvas;
  const first = await clip.previewSink.getCanvas(clip.start + 0.001);
  return first?.canvas || null;
}

/** Draw a preview of the final frame at time `t` (seconds into the trimmed Reel) onto `canvas`. */
export async function drawPreview(canvas, main, second, opts, t) {
  const o = normalise(main, opts);
  const ta = o.trimStart + Math.max(0, t);
  const a = await frameAt(main, ta, canvas.width, canvas.width * 16 / 9);
  let b = null;
  if (o.split && second) b = await frameAt(second, (Math.max(0, t) % Math.max(0.05, second.duration - second.start)), canvas.width, canvas.width * 8 / 9);
  composeFrame(canvas.getContext('2d'), a, b, o);
}

/* ---------- cover frame ---------- */

/** Score how good a frame looks as a cover: detail (sharpness) and sensible brightness. */
function frameScore(src) {
  const w = 96, h = Math.max(2, Math.round((96 * src.height) / src.width));
  const c = newCanvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; lum[i] = v; sum += v; }
  const mean = sum / (w * h);
  let lap = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const v = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w];
    lap += v * v;
  }
  const sharp = lap / ((w - 2) * (h - 2));
  const exposure = 1 - Math.min(1, Math.abs(mean - 128) / 128); // 1 at mid-grey, 0 at black or white
  return Math.log1p(sharp) * (0.35 + 0.65 * exposure);
}

/** Pick a good cover moment (seconds into the trimmed Reel) by sampling frames and scoring them. */
export async function pickCover(main, opts, samples = 9) {
  const o = normalise(main, opts);
  const len = o.trimEnd - o.trimStart;
  const sink = makeSink(main, 240, 240, 0);
  const times = [];
  for (let i = 0; i < samples; i++) times.push(o.trimStart + len * (0.12 + (0.76 * i) / Math.max(1, samples - 1)));
  let best = { t: len * 0.3, score: -1 };
  let i = 0;
  for await (const w of sink.canvasesAtTimestamps(times.map((t) => main.start + t))) {
    const t = times[i++] - o.trimStart;
    if (!w) continue;
    const score = frameScore(w.canvas);
    if (score > best.score) best = { t, score };
  }
  return Math.max(0, Math.min(len, best.t));
}

/** The cover as a 1080x1920 JPEG, ready to add as the Reel cover in Instagram. */
export async function renderCover(main, second, opts, t) {
  const o = normalise(main, opts);
  const c = newCanvas(OUT_W, OUT_H);
  const ctx = c.getContext('2d');
  const a = await (async () => { const s = makeSink(main, OUT_W, OUT_H, 0); const w = await s.getCanvas(main.start + o.trimStart + t); return w?.canvas || (await s.getCanvas(main.start + 0.001))?.canvas; })();
  let b = null;
  if (o.split && second) {
    const s = makeSink(second, OUT_W, OUT_H / 2, 0);
    const len2 = Math.max(0.05, second.duration - second.start);
    b = (await s.getCanvas(second.start + (t % len2)))?.canvas || null;
  }
  composeFrame(ctx, a, b, o);
  return toJpeg(c, 0.92);
}
async function toJpeg(c, q) {
  if (c.convertToBlob) return c.convertToBlob({ type: 'image/jpeg', quality: q });
  return new Promise((res) => c.toBlob(res, 'image/jpeg', q));
}

/* ---------- rendering the Reel ---------- */

/**
 * Make the Reel.
 * @param {object} p  { main: Clip, second?: Clip, opts, onProgress?(0..1), signal?: AbortSignal }
 * @returns {Promise<{blob, bytes, width, height, duration, videoCodec, audioCodec, fps, hasAudio, warnings}>}
 */
export async function renderReel({ main, second = null, opts = {}, onProgress = () => {}, signal } = {}) {
  const o = normalise(main, opts);
  if (o.split && !second) throw new EngineError('Add a second clip for the split screen, or switch back to a single video.');
  const videoCodec = await pickVideoCodec();
  if (!videoCodec) throw new EngineError('This browser cannot encode video. Please use a recent version of Chrome, Edge or Safari.');
  const duration = o.trimEnd - o.trimStart;
  const warnings = [];
  if (videoCodec !== 'avc') warnings.push(`This browser has no H.264 encoder, so the video was saved as ${CODEC_NAME[videoCodec]}. Instagram may reject it. Chrome, Edge or Safari give the best result.`);

  // Which audio goes in.
  let soundClip = null;
  if (o.sound === 'main') soundClip = main;
  if (o.sound === 'second' && o.split) soundClip = second;
  if (!o.split && o.sound === 'second') soundClip = main;
  const audioTrack = soundClip?.audio || null;
  const audioCodec = audioTrack ? await pickAudioCodec() : null;
  if (audioTrack && !audioCodec) warnings.push('This browser cannot encode audio, so the Reel has no sound.');

  const canvas = newCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d', { alpha: false });
  const output = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
  const vSource = new MB.CanvasSource(canvas, { codec: videoCodec, quality: new MB.Quality({ bitrate: BITRATE[o.quality] }), keyFrameInterval: 2, latencyMode: 'quality' });
  output.addVideoTrack(vSource, { frameRate: Math.min(MAX_FPS, Math.round(main.fps) || 30) });
  let aSource = null;
  if (audioTrack && audioCodec) {
    const sr = soundClip.audioInfo.sampleRate;
    const transform = { numberOfChannels: Math.min(2, Math.max(1, soundClip.audioInfo.channels || 2)) };
    if (![44100, 48000].includes(sr)) transform.sampleRate = 48000;
    aSource = new MB.AudioBufferSource({ codec: audioCodec, quality: new MB.Quality({ bitrate: AUDIO_BITRATE }), transform });
    output.addAudioTrack(aSource);
  }
  if (o.strip) output.setMetadataTags({});
  else {
    const tags = await safe(() => main.input.getMetadataTags(), {});
    output.setMetadataTags(tags || {});
  }

  let cancelled = false;
  const checkAbort = () => { if (signal?.aborted) { cancelled = true; throw aborted(); } };
  checkAbort();
  await output.start();

  let videoDone = 0, audioDone = audioTrack && aSource ? 0 : 1;
  let shown = 0; // never let the bar go backwards
  const report = () => { const p = Math.min(0.99, 0.85 * Math.min(1, videoDone) + 0.15 * Math.min(1, audioDone)); if (p > shown) { shown = p; onProgress(p); } };

  const videoJob = async () => {
    // Decode at the size the layout needs: cover for crop and split, contain for blur and bars.
    const needH = o.split ? OUT_H / 2 : o.framing === 'crop' ? OUT_H : Math.min(OUT_H, (OUT_W * main.height) / main.width);
    const sinkA = makeSink(main, o.split || o.framing === 'crop' ? OUT_W : Math.min(OUT_W, (OUT_H * main.width) / main.height), needH, 2);
    // Second clip: iterate in step with the main one, looping when it runs out.
    let nextB = null, curB = null, itB = null;
    const lenB = second ? Math.max(0.05, second.duration - second.start) : 0;
    const sinkB = o.split ? makeSink(second, OUT_W, OUT_H / 2, 4) : null;
    const restartB = async () => { await itB?.return?.(); itB = sinkB.canvases(second.start); const n = await itB.next(); curB = n.done ? null : n.value; const m = curB ? await itB.next() : { done: true }; nextB = m.done ? null : m.value; };
    const frameB = async (tl) => {
      if (!sinkB) return null;
      const tb = second.start + (tl % lenB);
      if (!itB || (curB && tb + 1e-4 < curB.timestamp)) await restartB();
      while (nextB && nextB.timestamp <= tb + 1e-4) { curB = nextB; const n = await itB.next(); nextB = n.done ? null : n.value; }
      return curB?.canvas || null;
    };
    const from = main.start + o.trimStart, to = main.start + o.trimEnd;
    let lastTs = -Infinity, frames = 0;
    const minGap = 1 / MAX_FPS - 1e-4;
    const it = sinkA.canvases(Math.max(main.start, from - 0.001), to);
    try {
      for await (const w of it) {
        checkAbort();
        if (w.timestamp + w.duration <= from + 1e-4) continue; // ends before the trim start
        const t = Math.max(0, w.timestamp - from);
        if (t >= duration - 1e-4) break;
        if (t - lastTs < minGap) continue; // above 60 fps: drop the extra frame
        const b = await frameB(t);
        composeFrame(ctx, w.canvas, b, o);
        await vSource.add(t, Math.max(1 / MAX_FPS, Math.min(w.duration || 1 / 30, duration - t)));
        frames++; lastTs = t;
        videoDone = t / duration; report();
      }
    } finally {
      await itB?.return?.();
    }
    if (!frames) throw new EngineError('No video frames were found in the chosen part of the clip.');
    videoDone = 1; report();
  };

  const audioJob = async () => {
    if (!aSource) return;
    const clip = soundClip;
    const target = Math.round(duration * 48000) / 48000;
    let written = 0; // seconds
    const playLen = clip === main ? null : Math.max(0.05, clip.duration - clip.start);
    const segStart = clip === main ? main.start + o.trimStart : clip.start;
    const segEnd = clip === main ? main.start + o.trimEnd : clip.duration;
    const sink = new MB.AudioBufferSink(clip.audio);
    let loops = 0;
    while (written < target - 1e-3 && loops < 200) {
      let gotAny = false;
      for await (const wb of sink.buffers(Math.max(0, segStart - 0.05), segEnd)) {
        checkAbort();
        let buf = wb.buffer;
        let s0 = wb.timestamp, s1 = wb.timestamp + wb.duration;
        // Trim to [segStart, segEnd) and to what is still needed.
        const cutFront = Math.max(0, segStart - s0);
        const cutBack = Math.max(0, s1 - segEnd);
        const room = target - written;
        let keep = (s1 - s0) - cutFront - cutBack;
        if (keep <= 0) continue;
        keep = Math.min(keep, room);
        if (cutFront > 0 || keep < buf.duration - 1e-6) buf = sliceBuffer(buf, cutFront, keep);
        if (!buf) continue;
        gotAny = true;
        await aSource.add(buf);
        written += buf.duration;
        audioDone = written / target; report();
        if (written >= target - 1e-3) break;
      }
      if (!gotAny) break;
      loops++;
      if (playLen == null) break; // main clip: no looping
    }
    // Pad with silence if the sound is shorter than the video, so players do not end early.
    if (written < target - 0.02) {
      const len = target - written;
      const ch = Math.max(1, clip.audioInfo.channels || 2);
      const sr = clip.audioInfo.sampleRate || 48000;
      await aSource.add(new AudioBuffer({ length: Math.max(1, Math.round(len * sr)), numberOfChannels: ch, sampleRate: sr }));
    }
    audioDone = 1; report();
  };

  try {
    await Promise.all([videoJob(), audioJob()]);
    checkAbort();
    vSource.close();
    aSource?.close();
    await output.finalize();
  } catch (e) {
    try { await output.cancel(); } catch (_) { /* ignore */ }
    if (cancelled || e?.code === 'aborted') throw aborted();
    if (e instanceof EngineError) throw e;
    console.error(e);
    throw new EngineError('Something went wrong while making the video. Try again, or try a different browser.');
  }
  const buffer = output.target.buffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  onProgress(1);
  if (duration > REEL_MAX_SECONDS + 0.5) warnings.push('Instagram Reels can be up to 3 minutes long. Trim the video so it fits.');
  return {
    blob, bytes: blob.size, width: OUT_W, height: OUT_H, duration,
    videoCodec, audioCodec: aSource ? audioCodec : null, hasAudio: !!aSource,
    fps: Math.min(MAX_FPS, Math.round(main.fps) || 30), warnings,
  };
}

function sliceBuffer(buf, fromSec, lenSec) {
  const sr = buf.sampleRate;
  const a = Math.max(0, Math.round(fromSec * sr));
  const n = Math.min(buf.length - a, Math.round(lenSec * sr));
  if (n <= 0) return null;
  const out = new AudioBuffer({ length: n, numberOfChannels: buf.numberOfChannels, sampleRate: sr });
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(a, a + n), c);
  return out;
}

/* ---------- small helpers for the UI ---------- */

export function formatBytes(n) {
  if (!(n >= 0)) return '';
  if (n < 1000) return `${n} B`;
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e4 ? 1 : 0)} KB`;
  if (n < 1e9) return `${(n / 1e6).toFixed(n < 1e7 ? 1 : 0)} MB`;
  return `${(n / 1e9).toFixed(1)} GB`;
}
export function formatTime(s) {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(r < 60 && s < 10 ? 1 : 0).replace(/\.0$/, '')}`;
}
export function suggestName(name, ext = 'mp4', suffix = 'reel') {
  const base = String(name || 'video').replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'video';
  return `${base}-${suffix}.${ext}`;
}
