// Sizes, limits, estimates and small helpers. Pure functions, no DOM, so they can be tested in node.

export const MAX_DURATION_SEC = 60 * 60;       // refuse audio longer than 60 minutes
export const WARN_DURATION_SEC = 15 * 60;      // warn about memory above 15 minutes
export const MAX_AUDIO_FILE_BYTES = 500 * 1024 * 1024;
export const MAX_IMAGE_FILE_BYTES = 60 * 1024 * 1024;
export const FPS = 2;                          // a still image needs very few frames
export const AUDIO_RATE = 48000;

export const SIZES = [
  { id: '1280x720', w: 1280, h: 720, label: '1280 × 720', note: 'Landscape (HD)' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080', note: 'Landscape (Full HD)' },
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080', note: 'Square' },
  { id: '1080x1920', w: 1080, h: 1920, label: '1080 × 1920', note: 'Portrait' },
];
export const sizeById = (id) => SIZES.find((s) => s.id === id) || SIZES[0];

/** Bitrates (bits per second). Audio is re-encoded: AAC-LC for MP4, Opus for WebM. */
export function audioBitrate(format, channels) {
  if (format === 'mp4') return channels >= 2 ? 192000 : 128000;
  return channels >= 2 ? 160000 : 96000;
}
/** Target bitrate for the video encoder. With 2 frames a second this gives each key frame a generous budget. */
export function videoBitrate(w, h) {
  return Math.round(Math.min(6e6, Math.max(1.5e6, w * h * 1.5)));
}

/** Seconds between forced key frames: more often for short clips, less often for long ones, 5 to 30 s. */
export function keyFrameSeconds(durationSec) {
  return Math.min(30, Math.max(5, Math.round(durationSec / 30)));
}
export const frameCount = (durationSec, fps = FPS) => Math.max(1, Math.ceil(durationSec * fps));

/**
 * Size estimate in bytes: audio at its bitrate plus the video. A key frame of a photo takes about
 * 0.1 to 0.25 bytes per pixel at these settings; the in-between frames are a few dozen bytes.
 * Returns {low, high, mid}. It is an estimate: the encoder decides the real size.
 */
export function estimateSize({ format, durationSec, width, height, channels = 2 }) {
  const audio = (durationSec * audioBitrate(format, channels)) / 8;
  const keys = Math.ceil(durationSec / keyFrameSeconds(durationSec)) + 1;
  const deltas = frameCount(durationSec);
  const px = width * height;
  const low = audio * 0.95 + keys * px * 0.004 + deltas * 20 + 4096;
  const high = audio * 1.05 + keys * px * 0.08 + deltas * 120 + 8192;
  return { low: Math.round(low), high: Math.round(high), mid: Math.round((low + high) / 2) };
}

/** Rough decoded-audio memory in bytes (32-bit floats at 48 kHz). */
export function decodedBytes(durationSec, channels = 2) {
  return Math.round(durationSec * AUDIO_RATE * Math.min(2, Math.max(1, channels)) * 4);
}

/** Judge the audio: {ok, error?, warning?}. Wording is shown to the person, so it explains why. */
export function checkAudio({ durationSec, fileBytes, channels = 2 }) {
  if (fileBytes > MAX_AUDIO_FILE_BYTES) {
    return { ok: false, error: `This file is ${formatBytes(fileBytes)}. Files above ${formatBytes(MAX_AUDIO_FILE_BYTES)} are refused because the browser must hold the whole decoded sound in memory and would likely run out.` };
  }
  if (Number.isFinite(durationSec) && durationSec > MAX_DURATION_SEC) {
    return { ok: false, error: `This audio is ${formatDuration(durationSec)} long. The limit is ${formatDuration(MAX_DURATION_SEC)}, because the decoded sound (about ${formatBytes(decodedBytes(durationSec, channels))} here) has to fit in your browser's memory. Trim it and try again.` };
  }
  if (Number.isFinite(durationSec) && durationSec > WARN_DURATION_SEC) {
    return { ok: true, warning: `Long audio: converting needs roughly ${formatBytes(decodedBytes(durationSec, channels))} of free memory while it runs. Close other tabs first, and use a computer rather than a phone if you can.` };
  }
  return { ok: true };
}

export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '–';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}
export function formatBytes(n) {
  if (!Number.isFinite(n)) return '–';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}
export const formatEstimate = (e) => `about ${formatBytes(e.mid)} (${formatBytes(e.low)} to ${formatBytes(e.high)})`;

/** Choose the container from what the browser can encode. null = neither. */
export function chooseFormat({ mp4 = false, webm = false } = {}) {
  if (mp4) return 'mp4';
  if (webm) return 'webm';
  return null;
}

/** Where to draw an image of srcW x srcH inside w x h. fit = whole picture visible; fill = covers and crops. */
export function fitRect(srcW, srcH, w, h, mode) {
  const k = mode === 'fill' ? Math.max(w / srcW, h / srcH) : Math.min(w / srcW, h / srcH);
  const dw = srcW * k, dh = srcH * k;
  return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
}

/** "#rrggbb" to [r,g,b], or null. Accepts #rgb. */
export function parseHex(s) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(s).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
/** Text colour that reads on a background: dark ink or white. */
export function readableOn(hex) {
  const rgb = parseHex(hex) || [0, 0, 0];
  const lin = rgb.map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return L > 0.4 ? '#14162b' : '#ffffff';
}

/** Output file name from the audio name: strip the extension and unsafe characters. */
export function outputName(audioName, format) {
  const base = String(audioName || '').replace(/\.[^./\\]*$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).trim();
  return `${base || 'audio'}.${format === 'mp4' ? 'mp4' : 'webm'}`;
}
/** Title for the colour card, from the file name. */
export const cardTitle = (audioName) => String(audioName || '').replace(/\.[^./\\]*$/, '').replace(/[_]+/g, ' ').trim() || 'Audio';

/** Wrap text to lines of at most `maxChars`, breaking on spaces; long words are split. */
export function wrapText(text, maxChars, maxLines = 4) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  const push = (l) => lines.push(l);
  for (let w of words) {
    while (w.length > maxChars) { if (line) { push(line); line = ''; } push(w.slice(0, maxChars)); w = w.slice(maxChars); }
    if (!line) line = w;
    else if (line.length + 1 + w.length <= maxChars) line += ` ${w}`;
    else { push(line); line = w; }
  }
  if (line) push(line);
  if (lines.length > maxLines) { const cut = lines.slice(0, maxLines); cut[maxLines - 1] = `${cut[maxLines - 1].slice(0, Math.max(0, maxChars - 1))}…`; return cut; }
  return lines;
}

/** Candidate encoder settings, in order of preference. Detection tries each against the browser. */
export const MP4_VIDEO_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];
export const WEBM_VIDEO_CODECS = [['vp09.00.40.08', 'V_VP9'], ['vp8', 'V_VP8']];
