// A small WebM (Matroska subset) muxer: one VP8/VP9 video track and one Opus audio track.
// Layout: EBML header, Segment { SeekHead, Info, Tracks, Cues, Clusters }. Cues come before the clusters
// so players can seek straight away. Feed it encoded chunks, then call finish().
import { concat, u8 } from './boxes.mjs';

const enc = new TextEncoder();
const ID = {
  EBML: [0x1a, 0x45, 0xdf, 0xa3], EBMLVersion: [0x42, 0x86], EBMLReadVersion: [0x42, 0xf7], EBMLMaxIDLength: [0x42, 0xf2], EBMLMaxSizeLength: [0x42, 0xf3],
  DocType: [0x42, 0x82], DocTypeVersion: [0x42, 0x87], DocTypeReadVersion: [0x42, 0x85],
  Segment: [0x18, 0x53, 0x80, 0x67], SeekHead: [0x11, 0x4d, 0x9b, 0x74], Seek: [0x4d, 0xbb], SeekID: [0x53, 0xab], SeekPosition: [0x53, 0xac],
  Info: [0x15, 0x49, 0xa9, 0x66], TimecodeScale: [0x2a, 0xd7, 0xb1], Duration: [0x44, 0x89], MuxingApp: [0x4d, 0x80], WritingApp: [0x57, 0x41],
  Tracks: [0x16, 0x54, 0xae, 0x6b], TrackEntry: [0xae], TrackNumber: [0xd7], TrackUID: [0x73, 0xc5], TrackType: [0x83], FlagLacing: [0x9c],
  CodecID: [0x86], CodecPrivate: [0x63, 0xa2], CodecDelay: [0x56, 0xaa], SeekPreRoll: [0x56, 0xbb],
  Video: [0xe0], PixelWidth: [0xb0], PixelHeight: [0xba], Audio: [0xe1], SamplingFrequency: [0xb5], Channels: [0x9f],
  Cues: [0x1c, 0x53, 0xbb, 0x6b], CuePoint: [0xbb], CueTime: [0xb3], CueTrackPositions: [0xb7], CueTrack: [0xf7], CueClusterPosition: [0xf1],
  Cluster: [0x1f, 0x43, 0xb6, 0x75], Timecode: [0xe7], SimpleBlock: [0xa3],
};
export const WEBM_IDS = ID;

/** EBML variable-length size. `width` forces a fixed byte count (1 to 8). */
export function vint(n, width) {
  let w = width;
  if (!w) { w = 1; while (n >= 2 ** (7 * w) - 1 && w < 8) w++; }
  const out = new Uint8Array(w);
  let v = n;
  for (let i = w - 1; i >= 0; i--) { out[i] = v % 256; v = Math.floor(v / 256); }
  out[0] |= 1 << (8 - w);
  return out;
}
/** Unsigned integer element body, shortest form (or `width` bytes). */
export function uintBytes(n, width) {
  let w = width;
  if (!w) { w = 1; while (n >= 2 ** (8 * w)) w++; }
  const out = new Uint8Array(w);
  let v = n;
  for (let i = w - 1; i >= 0; i--) { out[i] = v % 256; v = Math.floor(v / 256); }
  return out;
}
export const float64 = (x) => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return b; };
export const float32 = (x) => { const b = new Uint8Array(4); new DataView(b.buffer).setFloat32(0, x); return b; };

export const el = (id, ...body) => { const b = concat(body.flat()); return concat([u8(...id), vint(b.length), b]); };
export const elUint = (id, n, width) => el(id, uintBytes(n, width));
export const elStr = (id, s) => el(id, enc.encode(s));

/** OpusHead for CodecPrivate (used when the encoder gives no description). */
export function opusHead(channels, inputRate = 48000, preSkip = 312) {
  const b = new Uint8Array(19);
  b.set(enc.encode('OpusHead'));
  b[8] = 1; b[9] = channels;
  b[10] = preSkip & 255; b[11] = preSkip >> 8;
  new DataView(b.buffer).setUint32(12, inputRate, true);
  b[16] = 0; b[17] = 0; b[18] = 0; // output gain 0, mapping family 0
  return b;
}

const MAX_CLUSTER_MS = 30000; // the block timecode is a signed 16 bit offset, so stay well under 32767 ms
const SEEK_ENTRY = (id, pos) => el(ID.Seek, el(ID.SeekID, u8(...id)), elUint(ID.SeekPosition, pos, 4));

export class WebmMuxer {
  /**
   * @param {object} o
   * @param {{codec:'V_VP8'|'V_VP9',width:number,height:number}} o.video
   * @param {{sampleRate:number,channels:number,description?:Uint8Array}} [o.audio]  Opus
   */
  constructor({ video, audio } = {}) {
    this.video = video;
    this.audio = audio || null;
    this.blocks = []; // {track, tsMs, data, key}
  }
  addVideo(data, timestampUs, isKey) { this.blocks.push({ track: 1, tsMs: Math.round(timestampUs / 1000), data, key: !!isKey }); }
  addAudio(data, timestampUs) { this.blocks.push({ track: 2, tsMs: Math.round(timestampUs / 1000), data, key: true }); }

  _tracks() {
    const v = el(ID.TrackEntry, elUint(ID.TrackNumber, 1), elUint(ID.TrackUID, 1), elUint(ID.TrackType, 1), elUint(ID.FlagLacing, 0), elStr(ID.CodecID, this.video.codec),
      el(ID.Video, elUint(ID.PixelWidth, this.video.width), elUint(ID.PixelHeight, this.video.height)));
    const parts = [v];
    if (this.audio) {
      const priv = this.audio.description && this.audio.description.length ? this.audio.description : opusHead(this.audio.channels, this.audio.sampleRate);
      parts.push(el(ID.TrackEntry, elUint(ID.TrackNumber, 2), elUint(ID.TrackUID, 2), elUint(ID.TrackType, 2), elUint(ID.FlagLacing, 0), elStr(ID.CodecID, 'A_OPUS'),
        el(ID.CodecPrivate, priv), elUint(ID.CodecDelay, 6500000), elUint(ID.SeekPreRoll, 80000000),
        el(ID.Audio, el(ID.SamplingFrequency, float32(this.audio.sampleRate)), elUint(ID.Channels, this.audio.channels))));
    }
    return el(ID.Tracks, parts);
  }

  /** Group the blocks into clusters; a new cluster starts at each video key frame, and at most every 30 s. */
  _clusters() {
    const blocks = [...this.blocks].sort((a, b) => a.tsMs - b.tsMs || a.track - b.track);
    if (!blocks.length) throw new Error('Nothing to write.');
    const clusters = [];
    let cur = null;
    for (const b of blocks) {
      const startNew = !cur || (b.track === 1 && b.key) || b.tsMs - cur.startMs >= MAX_CLUSTER_MS;
      if (startNew) { cur = { startMs: b.tsMs, blocks: [], hasKey: false }; clusters.push(cur); }
      if (b.track === 1 && b.key) cur.hasKey = true;
      cur.blocks.push(b);
    }
    return clusters.map((c) => {
      const body = [elUint(ID.Timecode, c.startMs)];
      for (const b of c.blocks) {
        const rel = b.tsMs - c.startMs;
        const head = new Uint8Array(4);
        head[0] = 0x80 | b.track; head[1] = (rel >> 8) & 255; head[2] = rel & 255; head[3] = b.key ? 0x80 : 0;
        body.push(concat([u8(...ID.SimpleBlock), vint(head.length + b.data.length), head, b.data]));
      }
      return { startMs: c.startMs, hasKey: c.hasKey, bytes: el(ID.Cluster, body) };
    });
  }

  /** @param {number} [durationUs] total length; defaults to the last block time. */
  finish(durationUs) {
    const clusters = this._clusters();
    const lastMs = this.blocks.reduce((m, b) => Math.max(m, b.tsMs), 0);
    const durationMs = Math.max(lastMs, Math.round((durationUs || 0) / 1000));
    const ebml = el(ID.EBML, elUint(ID.EBMLVersion, 1), elUint(ID.EBMLReadVersion, 1), elUint(ID.EBMLMaxIDLength, 4), elUint(ID.EBMLMaxSizeLength, 8),
      elStr(ID.DocType, 'webm'), elUint(ID.DocTypeVersion, 4), elUint(ID.DocTypeReadVersion, 2));
    const info = el(ID.Info, elUint(ID.TimecodeScale, 1000000), elStr(ID.MuxingApp, 'mp3-to-mp4 web muxer'), elStr(ID.WritingApp, 'mp3-to-mp4 web muxer'), el(ID.Duration, float64(durationMs)));
    const tracks = this._tracks();
    // SeekHead has a fixed size (4 byte positions), so everything after it has a known offset.
    const seekHeadSize = (pos) => el(ID.SeekHead, SEEK_ENTRY(ID.Info, pos), SEEK_ENTRY(ID.Tracks, pos), SEEK_ENTRY(ID.Cues, pos)).length;
    const seekLen = seekHeadSize(0);
    const cuesFor = (firstClusterPos) => {
      let pos = firstClusterPos;
      const points = [];
      for (const c of clusters) {
        if (c.hasKey) points.push(el(ID.CuePoint, elUint(ID.CueTime, c.startMs, 4), el(ID.CueTrackPositions, elUint(ID.CueTrack, 1), elUint(ID.CueClusterPosition, pos, 4))));
        pos += c.bytes.length;
      }
      return el(ID.Cues, points);
    };
    const cuesLen = cuesFor(0).length; // fixed-width fields: the length does not depend on the positions
    const infoPos = seekLen;
    const tracksPos = infoPos + info.length;
    const cuesPos = tracksPos + tracks.length;
    const clustersPos = cuesPos + cuesLen;
    const seek = el(ID.SeekHead, SEEK_ENTRY(ID.Info, infoPos), SEEK_ENTRY(ID.Tracks, tracksPos), SEEK_ENTRY(ID.Cues, cuesPos));
    const cues = cuesFor(clustersPos);
    const clusterBytes = clusters.reduce((s, c) => s + c.bytes.length, 0);
    const segBodyLen = seek.length + info.length + tracks.length + cues.length + clusterBytes;
    const segHeader = concat([u8(...ID.Segment), vint(segBodyLen, 8)]);
    const parts = [ebml, segHeader, seek, info, tracks, cues, ...clusters.map((c) => c.bytes)];
    return { parts, size: ebml.length + segHeader.length + segBodyLen, durationSeconds: durationMs / 1000, clusters: clusters.length };
  }
}
