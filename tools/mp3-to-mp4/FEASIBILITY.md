# Feasibility: MP3 (audio) + still image to a video file, in the browser

Written before the build. Verdict: **viable, with no third-party dependency.**

## Approaches considered

| Approach | Licence | Verdict |
|---|---|---|
| ffmpeg.wasm (common builds) | GPL (libx264) / LGPL core, about 32 MB download, slow | Rejected: GPL, and outside the approved licence list. |
| Mediabunny (used by `tools/fitreel`) | MPL-2.0 | Rejected for this tool: MPL is not on the approved list (MIT, BSD, Apache-2.0). Not copied or vendored. |
| mp4-wasm and similar | MIT, but the audio muxing is unfinished | Rejected: no audio. |
| MediaRecorder on a canvas stream + audio destination | Browser API | Works, but runs in real time (a 30 minute song takes 30 minutes), output container is chosen by the browser and the WebM has no duration or seek index. Kept only as a thought, not built. |
| **WebCodecs encoders + a self-written muxer** | Our own code, no dependency | **Chosen.** Faster than real time, small output, we control the container. |

## Design

1. Decode the audio with `AudioContext.decodeAudioData` (an `OfflineAudioContext` at 48 kHz, so no sound is played).
2. Draw the image once onto a canvas at the chosen size (fit with background colour, or fill).
3. Encode that canvas as a low frame rate video (2 frames per second, a forced key frame every 5 to 30 seconds depending on length) with `VideoEncoder`. A still image costs almost nothing in repeat frames; the size is dominated by the audio.
4. Encode the audio with `AudioEncoder`.
5. Feed the encoded chunks to our own muxer:
   - **MP4 path** (`src/mp4.mjs`): H.264 (`avc1.*`, avcC taken from the encoder's decoder config) + AAC-LC (`mp4a.40.2`, esds built from the encoder's AudioSpecificConfig). Boxes: ftyp, moov (mvhd, trak: tkhd, mdhd, hdlr, vmhd/smhd, dinf, stbl with stsd, stts, stss, stsc, stsz, stco or co64), then mdat. moov comes first (fast start); video and audio are interleaved in chunks of about one second.
   - **WebM path** (`src/webm.mjs`): VP9 (or VP8) + Opus in Matroska/WebM (EBML header, SeekHead, Info with Duration, Tracks, Cues, Clusters of SimpleBlocks). Used automatically when the browser has no H.264 or no AAC encoder. The page says so plainly.

## Audio: pass-through or re-encode?

MP3 inside MP4 (`mp4a` with object type 0x6B) is legal, but support in phones, Photos and some editors is patchy, which defeats the point of choosing MP4. So the audio is **always re-encoded** (AAC-LC 192 kbps stereo in MP4, Opus 160 kbps stereo in WebM; mono sources stay mono at lower rates). The page says this. No pass-through is attempted.

## Browser support (as understood; to be confirmed on real devices)

- WebCodecs `VideoEncoder` / `AudioEncoder`: Chrome and Edge 94+ (AudioEncoder 94+), Firefox desktop 130+, Safari 16.4+ for video and Safari 26 for audio. Where they are missing, the page explains that the browser cannot make video files (no MediaRecorder fallback is built).
- H.264 and AAC encoders: present in Chrome/Edge on most desktops and phones, and Safari; commonly absent in Chromium builds without proprietary codecs (the test Chromium here), and variable in Firefox and Linux.
- VP8/VP9/Opus encoders: present in Chrome, Edge and Firefox; the test Chromium has them.
- `decodeAudioData`: universal. MP3, AAC/M4A, WAV, OGG depend on the browser's decoders.

## Limits

Decoded audio is held in memory as 32-bit floats: about 23 MB per minute of stereo at 48 kHz. The tool refuses audio over **60 minutes** (roughly 1.4 GB decoded) and warns from 15 minutes. Files above 500 MB are refused before reading. Output size is dominated by audio: about 1.4 MB per minute (AAC) plus the key frames.

## What can and cannot be verified in this sandbox

- The test Chromium (141) reports **no H.264 and no AAC encoder**, but VP8, VP9, AV1 and Opus encoders work. So the **WebM path can be tested end to end in a real browser**; the **MP4 encoder path cannot**.
- The MP4 **muxer** is verified in node with real encoded data made by ffmpeg (`libx264` to raw Annex B, `aac` to ADTS, both converted in the test to avcC and raw AAC frames), checked with `ffprobe` and a full decode with `ffmpeg -v error ... -f null -`. The WebM muxer gets the same treatment with `libvpx` (IVF) and `libopus` (Ogg).
- Not verifiable here: that Chrome, Safari or Edge's own H.264/AAC encoders produce chunks and decoder configs exactly as assumed (raw AAC, avcC `description`, no B-frames), and playback in QuickTime, iOS Photos, Windows players and social apps. These need a hand check by the owner.

## Decision

Build both paths with self-written muxers. MP4 first choice, WebM automatic fallback, clear on-page message in each case. No dependencies; licence note in README is "none".
