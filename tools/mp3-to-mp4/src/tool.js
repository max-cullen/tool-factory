// MP3 to MP4 Converter: page wiring. Runs in the browser; nothing is uploaded and nothing is stored.
// The encoding lives in encode.mjs, the file writers in mp4.mjs and webm.mjs, the sums in plan.mjs.
import { sizeById, checkAudio, estimateSize, formatEstimate, formatBytes, formatDuration, outputName, cardTitle, parseHex, MAX_IMAGE_FILE_BYTES } from './plan.mjs';
import { detect, decodeAudio, makeVideo } from './encode.mjs';
import { drawFrame } from './frame.mjs';

const root = document.querySelector('[data-tool]');
if (root) {
  const $ = (s) => root.querySelector(s);
  const el = {
    audioInput: $('[data-audio-input]'), imageInput: $('[data-image-input]'),
    audioTitle: $('[data-audio-title]'), audioSub: $('[data-audio-sub]'), imageTitle: $('[data-image-title]'), imageSub: $('[data-image-sub]'),
    audioErr: $('[data-audio-error]'), imageErr: $('[data-image-error]'), imageClear: $('[data-image-clear]'),
    preview: $('[data-preview]'), fLength: $('[data-f-length]'), fFormat: $('[data-f-format]'), fSize: $('[data-f-size]'),
    formatNote: $('[data-format-note]'), formatNoteText: $('[data-format-note-text]'), warning: $('[data-warning]'), warningText: $('[data-warning-text]'),
    error: $('[data-error]'), errorText: $('[data-error-text]'),
    progress: $('[data-progress]'), bar: $('[data-bar]'), stageText: $('[data-stage-text]'),
    convert: $('[data-convert]'), cancel: $('[data-cancel]'), result: $('[data-result]'), resultText: $('[data-result-text]'), download: $('[data-download]'), status: $('[data-status]'),
    bg: $('[data-bg]'), bgHex: $('[data-bg-hex]'), look: $('[data-look]'),
  };
  const dropAudio = $('[data-drop="audio"]'), dropImage = $('[data-drop="image"]');

  const state = {
    audioFile: null, audioDuration: NaN, audioOk: false, audioWarning: '',
    imageFile: null, bitmap: null,
    size: sizeById('1280x720'), mode: 'fit', bg: '#0e1124',
    support: null, busy: false, abort: null, resultUrl: null,
  };

  const show = (node, on) => { node.hidden = !on; };
  const setStatus = (t) => { el.status.textContent = t; };
  const channelsGuess = 2;

  /* ---------- the picture (preview and, later, the real frames) ---------- */
  function drawPreview() {
    const scale = Math.min(1, 640 / state.size.w);
    const w = Math.round(state.size.w * scale), h = Math.round(state.size.h * scale);
    if (el.preview.width !== w) el.preview.width = w;
    if (el.preview.height !== h) el.preview.height = h;
    drawFrame(el.preview.getContext('2d'), w, h, { bitmap: state.bitmap, mode: state.mode, bg: state.bg, title: state.audioFile ? cardTitle(state.audioFile.name) : 'Your audio title' });
  }

  /* ---------- facts, notes and button state ---------- */
  function formatLabel() {
    const f = state.support?.format;
    if (!state.support) return 'Checking…';
    if (f === 'mp4') return 'MP4';
    if (f === 'webm') return 'WebM';
    return 'Not available';
  }
  function refresh() {
    const sup = state.support;
    el.fFormat.textContent = formatLabel();
    el.fLength.textContent = state.audioFile ? (Number.isFinite(state.audioDuration) ? formatDuration(state.audioDuration) : 'Unknown') : '–';
    if (state.audioFile && Number.isFinite(state.audioDuration) && sup?.format) {
      el.fSize.textContent = formatEstimate(estimateSize({ format: sup.format, durationSec: state.audioDuration, width: state.size.w, height: state.size.h, channels: channelsGuess }));
    } else el.fSize.textContent = '–';

    // Which path, and what it means.
    let note = '';
    if (sup && sup.format === 'webm') note = "Your browser can't make MP4, so this file is WebM; it plays in Chrome, Firefox, Edge and most players, but some apps (and iPhones' Photos) need MP4.";
    else if (sup && !sup.format && sup.api) note = "Your browser can't make MP4 or WebM video files here. Try the latest Chrome or Edge on a computer.";
    else if (sup && !sup.api) note = "This browser has no video encoders (WebCodecs), so it can't make video files. Try the latest Chrome or Edge on a computer.";
    el.formatNoteText.textContent = note;
    show(el.formatNote, !!note);
    if (sup?.format === 'mp4') el.fFormat.title = 'H.264 video with AAC audio'; else if (sup?.format === 'webm') el.fFormat.title = 'VP9 or VP8 video with Opus audio';

    el.warningText.textContent = state.audioWarning;
    show(el.warning, !!state.audioWarning && !state.busy);
    root.classList.toggle('is-empty', !state.audioFile);
    root.classList.toggle('is-busy', state.busy);
    el.convert.disabled = state.busy || !state.audioOk || !sup?.format;
    show(el.convert, !state.busy);
    show(el.cancel, state.busy);
    if (!state.busy && !state.resultUrl) {
      setStatus(!state.audioFile ? 'Choose an audio file to begin.' : !state.audioOk ? 'Fix the problem above to continue.' : !sup?.format ? 'This browser cannot make video files.' : 'Ready. Press Convert to video.');
    }
  }

  function showError(msg) { el.errorText.textContent = msg || ''; show(el.error, !!msg); }
  function clearResult() {
    if (state.resultUrl) { URL.revokeObjectURL(state.resultUrl); state.resultUrl = null; }
    el.download.removeAttribute('href');
    show(el.result, false);
  }

  async function redetect() {
    state.support = await detect(state.size.w, state.size.h, channelsGuess);
    refresh();
  }

  /* ---------- choosing the audio ---------- */
  function setAudioError(msg) { el.audioErr.textContent = msg || ''; show(el.audioErr, !!msg); }

  function readDuration(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('audio');
      let done = false;
      const finish = (fn, v) => { if (done) return; done = true; clearTimeout(t); URL.revokeObjectURL(url); a.removeAttribute('src'); a.load(); fn(v); };
      const t = setTimeout(() => finish(resolve, NaN), 8000);
      a.preload = 'metadata';
      a.onloadedmetadata = () => finish(resolve, a.duration);
      a.onerror = () => finish(reject, new Error('unreadable'));
      a.src = url;
    });
  }

  async function chooseAudio(file) {
    if (state.busy) return;
    clearResult(); showError('');
    state.audioFile = file; state.audioDuration = NaN; state.audioOk = false; state.audioWarning = '';
    setAudioError('');
    if (!file) { el.audioTitle.textContent = 'Choose an audio file'; el.audioSub.textContent = 'MP3, M4A, WAV or OGG. Drop it here or tap to browse.'; dropAudio.classList.remove('has-file'); refresh(); drawPreview(); return; }
    dropAudio.classList.add('has-file');
    el.audioTitle.textContent = file.name;
    el.audioSub.textContent = `${formatBytes(file.size)}. Reading…`;
    drawPreview(); refresh();
    const first = checkAudio({ durationSec: NaN, fileBytes: file.size });
    if (!first.ok) { setAudioError(first.error); el.audioSub.textContent = formatBytes(file.size); refresh(); return; }
    try {
      state.audioDuration = await readDuration(file);
    } catch (e) {
      if (state.audioFile !== file) return;
      setAudioError("This browser can't read that file as audio. Try an MP3, M4A, WAV or OGG file.");
      el.audioSub.textContent = formatBytes(file.size);
      refresh(); return;
    }
    if (state.audioFile !== file) return; // a newer choice replaced this one
    if (!Number.isFinite(state.audioDuration)) state.audioDuration = NaN;
    const c = checkAudio({ durationSec: state.audioDuration, fileBytes: file.size, channels: channelsGuess });
    state.audioOk = c.ok;
    state.audioWarning = c.warning || '';
    if (!c.ok) setAudioError(c.error);
    el.audioSub.textContent = `${formatBytes(file.size)}${Number.isFinite(state.audioDuration) ? `, ${formatDuration(state.audioDuration)}` : ''}`;
    refresh();
  }

  /* ---------- choosing the picture ---------- */
  async function chooseImage(file) {
    if (state.busy) return;
    clearResult(); showError('');
    el.imageErr.hidden = true;
    if (!file) {
      if (state.bitmap && state.bitmap.close) state.bitmap.close();
      state.imageFile = null; state.bitmap = null;
      el.imageTitle.textContent = 'Add a picture'; el.imageSub.textContent = 'JPG, PNG or WebP. Without one you get a plain colour card.';
      dropImage.classList.remove('has-file'); show(el.imageClear, false); el.imageInput.value = '';
      drawPreview(); refresh(); return;
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) { el.imageErr.textContent = 'That picture file is very large. Choose one under 60 MB.'; el.imageErr.hidden = false; return; }
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      if (state.bitmap && state.bitmap.close) state.bitmap.close();
      state.imageFile = file; state.bitmap = bmp;
      dropImage.classList.add('has-file');
      el.imageTitle.textContent = file.name;
      el.imageSub.textContent = `${bmp.width} × ${bmp.height} px`;
      show(el.imageClear, true);
    } catch (e) {
      el.imageErr.textContent = "This browser can't read that picture. Try a JPG, PNG or WebP file.";
      el.imageErr.hidden = false;
      return;
    }
    drawPreview(); refresh();
  }

  /* ---------- convert ---------- */
  function setProgress(frac, stage) {
    const pct = Math.max(0, Math.min(100, Math.round(frac * 100)));
    el.bar.setAttribute('aria-valuenow', String(pct));
    el.bar.firstElementChild.style.width = `${pct}%`;
    el.stageText.textContent = `${stage} (${pct}%)`;
  }

  async function convert() {
    if (state.busy || !state.audioOk || !state.support?.format) return;
    clearResult(); showError('');
    state.busy = true; state.abort = new AbortController();
    show(el.progress, true); setProgress(0, 'Reading the audio');
    refresh(); setStatus('Working. Keep this tab open.');
    const signal = state.abort.signal;
    try {
      const support = await detect(state.size.w, state.size.h, channelsGuess); // re-check, in case the browser changed its mind
      state.support = support;
      if (!support.format) throw new Error("This browser can't make video files.");
      const audio = await decodeAudio(state.audioFile);
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      state.audioDuration = audio.length / audio.sampleRate;
      const c = checkAudio({ durationSec: state.audioDuration, fileBytes: 0, channels: audio.numberOfChannels });
      if (!c.ok) throw new Error(c.error);
      setProgress(0.08, 'Preparing');
      const out = await makeVideo({
        audio, bitmap: state.bitmap, title: cardTitle(state.audioFile.name), size: state.size, mode: state.mode, bg: state.bg,
        support: await detect(state.size.w, state.size.h, Math.min(2, audio.numberOfChannels)), onProgress: setProgress, signal,
      });
      state.resultUrl = URL.createObjectURL(out.blob);
      const name = outputName(state.audioFile.name, out.format);
      el.download.href = state.resultUrl; el.download.download = name;
      el.resultText.textContent = `Done. ${name} is ready: ${out.format === 'mp4' ? 'MP4' : 'WebM'}, ${formatBytes(out.bytes)}, ${formatDuration(out.durationSec)} long.`;
      show(el.result, true);
      setStatus('The file stays on your device until you save it.');
      el.download.focus({ preventScroll: true });
    } catch (e) {
      if (e && e.name === 'AbortError') { setStatus('Cancelled. Nothing was saved.'); showError(''); }
      else { showError(e && e.message ? e.message : 'Something went wrong while making the video.'); setStatus('The conversion did not finish.'); }
    } finally {
      state.busy = false; state.abort = null;
      show(el.progress, false);
      refresh();
    }
  }

  /* ---------- events ---------- */
  el.audioInput.addEventListener('change', () => chooseAudio(el.audioInput.files[0] || null));
  el.imageInput.addEventListener('change', () => chooseImage(el.imageInput.files[0] || null));
  el.imageClear.addEventListener('click', () => chooseImage(null));
  el.convert.addEventListener('click', convert);
  el.cancel.addEventListener('click', () => { if (state.abort) { state.abort.abort(); setStatus('Cancelling…'); } });

  for (const [zone, kind] of [[dropAudio, 'audio'], [dropImage, 'image']]) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('is-over');
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      if (kind === 'audio') chooseAudio(f); else chooseImage(f);
    });
  }

  const setSeg = (seg) => {
    const radios = [...seg.querySelectorAll('input[type="radio"]')];
    seg.style.setProperty('--i', String(Math.max(0, radios.findIndex((r) => r.checked))));
  };
  el.look.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'size') { state.size = sizeById(t.value); clearResult(); drawPreview(); redetect(); }
    if (t.name === 'fit') { state.mode = t.value; setSeg(t.closest('[data-seg]')); clearResult(); drawPreview(); }
  });
  const setBg = (hex) => {
    const rgb = parseHex(hex);
    if (!rgb) { el.bgHex.classList.add('is-bad'); return; }
    el.bgHex.classList.remove('is-bad');
    state.bg = `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    el.bg.value = state.bg;
    clearResult(); drawPreview();
  };
  el.bg.addEventListener('input', () => { el.bgHex.value = el.bg.value.toUpperCase(); setBg(el.bg.value); });
  el.bgHex.addEventListener('input', () => { setBg(el.bgHex.value); });
  el.bgHex.addEventListener('blur', () => { el.bgHex.value = state.bg.toUpperCase(); el.bgHex.classList.remove('is-bad'); });

  // Closing a busy tab loses the work, so ask first.
  window.addEventListener('beforeunload', (e) => { if (state.busy) { e.preventDefault(); e.returnValue = ''; } });

  drawPreview();
  refresh();
  redetect();
}
