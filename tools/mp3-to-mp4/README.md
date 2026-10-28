# MP3 to MP4 Converter (`mp3-to-mp4`)

Turns an audio file and a still picture into a video file, entirely in the browser. Nothing is uploaded; no network calls; nothing is stored.

## Dependencies and licences

**None.** No npm packages, no vendored files, no WebAssembly, no CDN.

| Piece | Where it comes from | Licence |
|---|---|---|
| H.264 / AAC, VP9 / VP8 / Opus encoding | The visitor's own browser (WebCodecs `VideoEncoder` / `AudioEncoder`) | Part of the browser, not shipped here |
| Audio decoding | The browser (`decodeAudioData`) | Part of the browser |
| MP4 writer (`src/mp4.mjs`, `src/boxes.mjs`) | Written for this repo | Same as the repo |
| WebM writer (`src/webm.mjs`) | Written for this repo | Same as the repo |

The repo's FitReel tool uses Mediabunny (MPL-2.0) and an optional FFmpeg AAC encoder (LGPL). This tool deliberately uses neither and shares no code with it. See `FEASIBILITY.md` for the decision and what was and was not verifiable.

## Files

- `src/boxes.mjs` byte and box helpers (ISO BMFF, MPEG-4 descriptors).
- `src/mp4.mjs` MP4 muxer: H.264 + AAC-LC, moov-first ("fast start"), interleaved ~1 s chunks, stts/stss/stsc/stsz/stco (co64 for files that could pass 4 GiB).
- `src/webm.mjs` WebM muxer: VP9/VP8 + Opus, SeekHead, Cues before Clusters.
- `src/plan.mjs` sizes, limits (60 minutes, warning at 15), bitrates, size estimate, fit maths, file names.
- `src/frame.mjs` draws the picture (fit/fill, or a colour card with the file name).
- `src/encode.mjs` browser pipeline: feature detection (MP4 first, WebM fallback), audio decode, encoding, muxing.
- `src/tool.js` page wiring.
- `tests/` node:test suites. The ffprobe suite skips itself when ffmpeg/ffprobe are missing.

## Behaviour worth knowing

- MP4 (H.264 + AAC-LC) when the browser has both encoders, otherwise WebM (VP9 or VP8 + Opus). The page says which it will make and why.
- Audio is always re-encoded (AAC 192 kbps stereo / 128 kbps mono for MP4; Opus 160 / 96 kbps for WebM). No pass-through, because MP3-in-MP4 is poorly supported by phones and players.
- Video is 2 frames a second of the same picture with a forced key frame every 5 to 30 seconds.
- Limits: audio up to 60 minutes (warning from 15), audio files up to 500 MB, pictures up to 60 MB. Decoded audio needs about 23 MB per minute of stereo.
- Assumes the encoders emit no B-frames, raw AAC frames (not ADTS), and an avcC decoder description. Needs checking in real Chrome, Edge and Safari (see `FEASIBILITY.md`).

## Testing

`npm test` from the repo root. `npm run preview -- mp3-to-mp4` for a private preview.
