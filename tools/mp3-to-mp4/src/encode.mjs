// The browser side: checks what the browser can encode, then turns audio + picture into an MP4 or WebM Blob.
// Uses WebCodecs (VideoEncoder, AudioEncoder) and our own muxers. Nothing leaves the device.
import { Mp4Muxer } from './mp4.mjs';
import { WebmMuxer } from './webm.mjs';
import { drawFrame } from './frame.mjs';
import { FPS, AUDIO_RATE, MP4_VIDEO_CODECS, WEBM_VIDEO_CODECS, audioBitrate, videoBitrate, keyFrameSeconds, frameCount, checkAudio, chooseFormat } from './plan.mjs';

const hasApi = () => typeof VideoEncoder === 'function' && typeof AudioEncoder === 'function' && typeof VideoFrame === 'function' && typeof AudioData === 'function';
const okCfg = async (Ctor, cfg) => { try { const r = await Ctor.isConfigSupported(cfg); return r && r.supported ? r.config || cfg : null; } catch (e) { return null; } };
const videoCfg = (codec, w, h) => ({ codec, width: w, height: h, bitrate: videoBitrate(w, h), framerate: FPS, latencyMode: 'quality' });

/** What can this browser encode at this size? {api, mp4: {...}|null, webm: {...}|null, format} */
export async function detect(w, h, channels = 2) {
  const out = { api: hasApi(), mp4: null, webm: null, format: null };
  if (!out.api) return out;
  const ch = Math.min(2, Math.max(1, channels));
  const aacCfg = { codec: 'mp4a.40.2', sampleRate: AUDIO_RATE, numberOfChannels: ch, bitrate: audioBitrate('mp4', ch), aac: { format: 'aac' } };
  if (await okCfg(AudioEncoder, aacCfg)) {
    for (const codec of MP4_VIDEO_CODECS) {
      const v = { ...videoCfg(codec, w, h), avc: { format: 'avc' } };
      if (await okCfg(VideoEncoder, v)) { out.mp4 = { video: v, audio: aacCfg }; break; }
    }
  }
  const opusCfg = { codec: 'opus', sampleRate: AUDIO_RATE, numberOfChannels: ch, bitrate: audioBitrate('webm', ch) };
  if (await okCfg(AudioEncoder, opusCfg)) {
    for (const [codec, id] of WEBM_VIDEO_CODECS) {
      const v = videoCfg(codec, w, h);
      if (await okCfg(VideoEncoder, v)) { out.webm = { video: v, audio: opusCfg, codecId: id }; break; }
    }
  }
  out.format = chooseFormat({ mp4: !!out.mp4, webm: !!out.webm });
  return out;
}

const toBytes = (d) => (d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)));
const abortError = () => new DOMException('Cancelled', 'AbortError');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Decode an audio file to 48 kHz float samples. Throws an Error with a plain-English message. */
export async function decodeAudio(file) {
  if (typeof OfflineAudioContext === 'undefined' && typeof webkitOfflineAudioContext === 'undefined') throw new Error('This browser cannot decode audio.');
  const Ctx = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : webkitOfflineAudioContext; // eslint-disable-line no-undef
  let data;
  try { data = await file.arrayBuffer(); } catch (e) { throw new Error('The audio file could not be read. It may have been moved or is too large for this browser.'); }
  try {
    const ctx = new Ctx(2, 1, AUDIO_RATE);
    return await ctx.decodeAudioData(data);
  } catch (e) {
    throw new Error('This browser could not decode that audio file. Try an MP3, M4A, WAV or OGG file, or convert it to MP3 first.');
  }
}

/**
 * Make the video.
 * @param {object} o
 * @param {AudioBuffer} o.audio  decoded audio (48 kHz)
 * @param {ImageBitmap|null} o.bitmap  the picture, or null for a colour card
 * @param {string} o.title  text for the colour card
 * @param {{w:number,h:number}} o.size
 * @param {'fit'|'fill'} o.mode
 * @param {string} o.bg  background colour
 * @param {object} o.support  result of detect()
 * @param {(fraction:number, stage:string)=>void} o.onProgress
 * @param {AbortSignal} o.signal
 */
export async function makeVideo({ audio, bitmap, title, size, mode, bg, support, onProgress = () => {}, signal }) {
  const format = support.format;
  if (!format) throw new Error('This browser cannot make video files.');
  const cfg = support[format];
  const { w, h } = size;
  const channels = Math.min(2, audio.numberOfChannels);
  const durationSec = audio.length / audio.sampleRate;
  const check = checkAudio({ durationSec, fileBytes: 0, channels });
  if (!check.ok) throw new Error(check.error);
  const durationUs = Math.round(durationSec * 1e6);
  const state = { err: null };
  const guard = () => { if (signal?.aborted) throw abortError(); if (state.err) throw state.err; };
  const vChunks = [], aChunks = [];
  let vDesc = null, aDesc = null;
  const grab = (chunk) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); return d; };

  const ve = new VideoEncoder({
    output: (chunk, meta) => { if (meta?.decoderConfig?.description && !vDesc) vDesc = toBytes(meta.decoderConfig.description); vChunks.push({ data: grab(chunk), ts: chunk.timestamp, key: chunk.type === 'key' }); },
    error: (e) => { state.err = new Error(`The browser's video encoder stopped: ${e.message || e}`); },
  });
  const ae = new AudioEncoder({
    output: (chunk, meta) => { if (meta?.decoderConfig?.description && !aDesc) aDesc = toBytes(meta.decoderConfig.description); aChunks.push({ data: grab(chunk), ts: chunk.timestamp, dur: chunk.duration }); },
    error: (e) => { state.err = new Error(`The browser's audio encoder stopped: ${e.message || e}`); },
  });
  try {
    ve.configure(cfg.video);
    ae.configure({ ...cfg.audio, numberOfChannels: channels, bitrate: audioBitrate(format, channels) });

    // Video: the same picture, a few frames a second, with a key frame every few seconds.
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    drawFrame(ctx, w, h, { bitmap, mode, bg, title });
    const n = frameCount(durationSec);
    const keyEvery = keyFrameSeconds(durationSec) * FPS;
    onProgress(0.1, 'Making the video track');
    for (let i = 0; i < n; i++) {
      guard();
      while (ve.encodeQueueSize > 6) { await sleep(2); guard(); }
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      ve.encode(frame, { keyFrame: i % keyEvery === 0 });
      frame.close();
      if (i % 40 === 0) { onProgress(0.1 + 0.2 * (i / n), 'Making the video track'); await sleep(0); }
    }
    await ve.flush(); guard();

    // Audio: slices of 100 ms.
    const total = audio.length, step = Math.round(AUDIO_RATE / 10);
    const planes = [];
    for (let c = 0; c < channels; c++) planes.push(audio.getChannelData(c));
    onProgress(0.3, 'Encoding the audio');
    let sinceYield = 0;
    for (let start = 0; start < total; start += step) {
      guard();
      while (ae.encodeQueueSize > 20) { await sleep(2); guard(); }
      const count = Math.min(step, total - start);
      const buf = new Float32Array(count * channels);
      for (let c = 0; c < channels; c++) buf.set(planes[c].subarray(start, start + count), c * count);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: AUDIO_RATE, numberOfFrames: count, numberOfChannels: channels, timestamp: Math.round((start * 1e6) / AUDIO_RATE), data: buf });
      ae.encode(ad);
      ad.close();
      if (++sinceYield >= 20) { sinceYield = 0; onProgress(0.3 + 0.65 * (start / total), 'Encoding the audio'); await sleep(0); }
    }
    await ae.flush(); guard();
  } finally {
    try { if (ve.state !== 'closed') ve.close(); } catch (e) { /* already closed */ }
    try { if (ae.state !== 'closed') ae.close(); } catch (e) { /* already closed */ }
  }

  onProgress(0.97, 'Writing the file');
  if (!vChunks.length || !aChunks.length) throw new Error('The encoder produced no data. Try again, or use a different browser.');
  let result, type;
  if (format === 'mp4') {
    if (!vDesc) throw new Error('The browser did not give H.264 settings (avcC), so an MP4 cannot be written. Try again in another browser.');
    const mux = new Mp4Muxer({ video: { width: w, height: h, description: vDesc }, audio: { sampleRate: AUDIO_RATE, channels, description: aDesc || undefined, bitrate: audioBitrate('mp4', channels) } });
    for (const c of vChunks) mux.addVideo(c.data, c.ts, c.key);
    for (const c of aChunks) mux.addAudio(c.data, c.ts, c.dur || (1024 * 1e6) / AUDIO_RATE);
    result = mux.finish(durationUs); type = 'video/mp4';
  } else {
    const mux = new WebmMuxer({ video: { codec: cfg.codecId, width: w, height: h }, audio: { sampleRate: AUDIO_RATE, channels, description: aDesc || undefined } });
    for (const c of vChunks) mux.addVideo(c.data, c.ts, c.key);
    for (const c of aChunks) mux.addAudio(c.data, c.ts);
    result = mux.finish(durationUs); type = 'video/webm';
  }
  const blob = new Blob(result.parts, { type });
  onProgress(1, 'Done');
  return { blob, format, durationSec, bytes: blob.size };
}
