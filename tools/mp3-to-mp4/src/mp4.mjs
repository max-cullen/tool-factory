// A small MP4 (ISO base media) muxer: one H.264 video track and one AAC-LC audio track, written with the
// movie box first so the file starts playing before it has fully downloaded ("fast start").
// Feed it encoded chunks (as the browser's WebCodecs encoders give them), then call finish().
// Assumptions: no B-frames (decode order = presentation order), raw AAC frames (no ADTS), avcC bytes as description.
import { u32Array, u64Array, box, fullBox, boxHeader, concat, u8, u16, u32, u64, i32, zeros, ascii, fourcc, fixed1616, esdsBox, aacAudioSpecificConfig } from './boxes.mjs';

export const MOVIE_TIMESCALE = 1000;
export const VIDEO_TIMESCALE = 90000;
const CHUNK_TICKS_SECONDS = 1; // about one second of each track per chunk
const MATRIX = concat([i32(0x00010000), u32(0), u32(0), u32(0), i32(0x00010000), u32(0), u32(0), u32(0), i32(0x40000000)]);

/** Microseconds to track ticks, rounded. */
export const usToTicks = (us, timescale) => Math.round((us * timescale) / 1e6);

/** Run-length encode a list of numbers into [count, value] pairs. */
export function runs(values) {
  const out = [];
  for (const v of values) {
    const last = out[out.length - 1];
    if (last && last[1] === v) last[0]++; else out.push([1, v]);
  }
  return out;
}

/**
 * Sample table maths. `samples`: [{size, duration, key}] in decode order; `chunkEnds`: the sample count of each chunk.
 * Returns the run-length forms that become stts, stsc, stsz, stss.
 */
export function sampleTables(samples, samplesPerChunk) {
  const stts = runs(samples.map((s) => s.duration));
  const stss = [];
  samples.forEach((s, i) => { if (s.key) stss.push(i + 1); });
  const stsc = []; // [firstChunk (1-based), samplesPerChunk, descriptionIndex]
  let prev = -1;
  samplesPerChunk.forEach((n, i) => { if (n !== prev) { stsc.push([i + 1, n, 1]); prev = n; } });
  return { stts, stss, stsc, sizes: samples.map((s) => s.size) };
}

/** Split samples into chunks of about `seconds` of media (never empty). Returns the sample count per chunk. */
export function chunkSampleCounts(samples, timescale, seconds = CHUNK_TICKS_SECONDS) {
  const counts = [];
  const limit = seconds * timescale;
  let n = 0, span = 0;
  for (const s of samples) {
    n++; span += s.duration;
    if (span >= limit) { counts.push(n); n = 0; span = 0; }
  }
  if (n) counts.push(n);
  return counts;
}

export class Mp4Muxer {
  /**
   * @param {object} o
   * @param {{width:number,height:number,description:Uint8Array}} o.video  avcC bytes in description
   * @param {{sampleRate:number,channels:number,description?:Uint8Array,bitrate?:number}} [o.audio]
   */
  constructor({ video, audio } = {}) {
    if (!video || !video.description || !video.description.length) throw new Error('The video track needs the avcC description from the encoder.');
    this.video = video;
    this.audio = audio || null;
    if (this.audio && !this.audio.description) this.audio = { ...this.audio, description: aacAudioSpecificConfig(this.audio.sampleRate, this.audio.channels) };
    this.v = []; // {data, tsUs, key}
    this.a = []; // {data, tsUs, durUs}
  }

  addVideo(data, timestampUs, isKey) { this.v.push({ data, tsUs: timestampUs, key: !!isKey }); }
  addAudio(data, timestampUs, durationUs) { this.a.push({ data, tsUs: timestampUs, durUs: durationUs }); }

  /** Build the track sample lists in track ticks. */
  _tracks(durationUs) {
    const tracks = [];
    const v = [...this.v].sort((x, y) => x.tsUs - y.tsUs);
    if (!v.length) throw new Error('No video frames were added.');
    if (!v[0].key) throw new Error('The first video frame must be a key frame.');
    const endTicks = usToTicks(Math.max(durationUs ?? 0, v[v.length - 1].tsUs + 1), VIDEO_TIMESCALE);
    const vs = v.map((f, i) => {
      const t0 = usToTicks(f.tsUs, VIDEO_TIMESCALE);
      const t1 = i + 1 < v.length ? usToTicks(v[i + 1].tsUs, VIDEO_TIMESCALE) : Math.max(endTicks, t0 + 1);
      return { data: f.data, size: f.data.length, duration: t1 - t0, key: f.key, tsUs: f.tsUs };
    });
    tracks.push({ kind: 'video', timescale: VIDEO_TIMESCALE, samples: vs });
    if (this.audio) {
      const rate = this.audio.sampleRate;
      const a = [...this.a].sort((x, y) => x.tsUs - y.tsUs);
      if (!a.length) throw new Error('No audio frames were added.');
      const as = a.map((f) => ({ data: f.data, size: f.data.length, duration: Math.max(1, usToTicks(f.durUs, rate)), key: true, tsUs: f.tsUs }));
      tracks.push({ kind: 'audio', timescale: rate, samples: as });
    }
    for (const t of tracks) {
      t.counts = chunkSampleCounts(t.samples, t.timescale);
      t.durationTicks = t.samples.reduce((s, x) => s + x.duration, 0);
    }
    return tracks;
  }

  /** Chunks of both tracks in time order: [{track, first, count, bytes}] */
  _layout(tracks) {
    const list = [];
    tracks.forEach((t, ti) => {
      let idx = 0, ticks = 0;
      for (const c of t.counts) {
        let bytes = 0, dur = 0;
        for (let i = idx; i < idx + c; i++) { bytes += t.samples[i].size; dur += t.samples[i].duration; }
        list.push({ track: ti, first: idx, count: c, bytes, startSec: ticks / t.timescale });
        idx += c; ticks += dur;
      }
    });
    // Time order; video first on ties so the key frame leads.
    list.sort((x, y) => x.startSec - y.startSec || x.track - y.track);
    return list;
  }

  /**
   * Returns {parts, size, durationSeconds}: parts are Uint8Arrays to join (for example with new Blob(parts)).
   * @param {number} [durationUs] total media length; the last video frame is stretched to reach it.
   * @param {{wide?:boolean}} [opts] wide: force 64-bit chunk offsets (co64), for tests.
   */
  finish(durationUs, { wide: forceWide = false } = {}) {
    const tracks = this._tracks(durationUs);
    const layout = this._layout(tracks);
    const ftyp = box('ftyp', fourcc('isom'), u32(512), fourcc('isom'), fourcc('iso2'), fourcc('avc1'), fourcc('mp41'));
    const mdatBytes = layout.reduce((s, c) => s + c.bytes, 0);
    const mdatHeader = boxHeader('mdat', mdatBytes);
    // Use 64-bit chunk offsets whenever the file could pass 4 GiB (decided before the offsets are known, so sizes are stable).
    const wide = forceWide || ftyp.length + mdatHeader.length + mdatBytes + 16 * 1024 * 1024 > 0xFFFFFFFF;

    const build = (mdatStart) => {
      // Absolute offset of each chunk, per track.
      const offsets = tracks.map(() => []);
      let pos = mdatStart;
      for (const c of layout) { offsets[c.track].push(pos); pos += c.bytes; }
      return this._moov(tracks, offsets, wide);
    };
    const probe = build(0);
    const moov = build(ftyp.length + probe.length + mdatHeader.length);
    if (moov.length !== probe.length) throw new Error('moov size changed between passes');

    const parts = [ftyp, moov, mdatHeader];
    for (const c of layout) for (let i = c.first; i < c.first + c.count; i++) parts.push(tracks[c.track].samples[i].data);
    const size = ftyp.length + moov.length + mdatHeader.length + mdatBytes;
    const durationSeconds = Math.max(...tracks.map((t) => t.durationTicks / t.timescale));
    return { parts, size, durationSeconds, layout, wide };
  }

  _moov(tracks, offsets, wide) {
    const durs = tracks.map((t) => Math.round((t.durationTicks / t.timescale) * MOVIE_TIMESCALE));
    const movieDur = Math.max(...durs);
    const mvhd = fullBox('mvhd', 0, 0, u32(0), u32(0), u32(MOVIE_TIMESCALE), u32(movieDur), fixed1616(1), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(tracks.length + 1));
    const traks = tracks.map((t, i) => this._trak(t, i + 1, durs[i], offsets[i], wide));
    return box('moov', mvhd, traks);
  }

  _trak(t, id, movieDur, chunkOffsets, wide) {
    const isVideo = t.kind === 'video';
    const tkhd = fullBox('tkhd', 0, 3, u32(0), u32(0), u32(id), u32(0), u32(movieDur), zeros(8), u16(0), u16(0), u16(isVideo ? 0 : 0x0100), u16(0), MATRIX,
      isVideo ? fixed1616(this.video.width) : u32(0), isVideo ? fixed1616(this.video.height) : u32(0));
    const mdhd = fullBox('mdhd', 0, 0, u32(0), u32(0), u32(t.timescale), u32(t.durationTicks), u16(0x55c4), u16(0)); // language "und"
    const hdlr = fullBox('hdlr', 0, 0, u32(0), fourcc(isVideo ? 'vide' : 'soun'), zeros(12), ascii(isVideo ? 'VideoHandler' : 'SoundHandler'), u8(0));
    const dinf = box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, 1)));
    const mhd = isVideo ? fullBox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)) : fullBox('smhd', 0, 0, u16(0), u16(0));
    const stbl = box('stbl', this._stsd(isVideo), this._tables(t, chunkOffsets, wide));
    return box('trak', tkhd, box('mdia', mdhd, hdlr, box('minf', mhd, dinf, stbl)));
  }

  _stsd(isVideo) {
    if (isVideo) {
      const { width, height, description } = this.video;
      const entry = box('avc1', zeros(6), u16(1), zeros(16), u16(width), u16(height), u32(0x00480000), u32(0x00480000), u32(0), u16(1), zeros(32), u16(0x0018), u16(0xffff),
        box('avcC', description));
      return fullBox('stsd', 0, 0, u32(1), entry);
    }
    const { sampleRate, channels, description, bitrate } = this.audio;
    const entry = box('mp4a', zeros(6), u16(1), zeros(8), u16(channels), u16(16), u16(0), u16(0), u32(Math.min(sampleRate, 65535) * 65536),
      esdsBox(description, { avgBitrate: bitrate || 0, maxBitrate: bitrate || 0 }));
    return fullBox('stsd', 0, 0, u32(1), entry);
  }

  _tables(t, chunkOffsets, wide) {
    const { stts, stss, stsc, sizes } = sampleTables(t.samples, t.counts);
    const out = [];
    out.push(fullBox('stts', 0, 0, u32(stts.length), u32Array(stts.flat())));
    if (t.kind === 'video') out.push(fullBox('stss', 0, 0, u32(stss.length), u32Array(stss)));
    out.push(fullBox('stsc', 0, 0, u32(stsc.length), u32Array(stsc.flat())));
    out.push(fullBox('stsz', 0, 0, u32(0), u32(sizes.length), u32Array(sizes)));
    out.push(wide ? fullBox('co64', 0, 0, u32(chunkOffsets.length), u64Array(chunkOffsets))
      : fullBox('stco', 0, 0, u32(chunkOffsets.length), u32Array(chunkOffsets)));
    return out;
  }
}
