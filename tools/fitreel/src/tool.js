// FitReel tool UI. Wires the page controls to the video engine. Everything runs in the browser.
import {
  browserSupport, openVideo, closeVideo, drawPreview, pickCover, renderCover, renderReel,
  formatBytes, formatTime, suggestName, CODEC_NAME, REEL_MAX_SECONDS,
} from './engine/engine.js';

const $ = (el, sel) => el.querySelector(sel);
const $$ = (el, sel) => [...el.querySelectorAll(sel)];
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.cancel = () => clearTimeout(t); return d; };

const ICONS = {
  good: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M5.2 8.2l2 2 3.6-4"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v3.6M8 5.2v.1"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.2l6 10.6H2z"/><path d="M8 6.6v2.8M8 11.2v.1"/></svg>',
  bad: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4"/></svg>',
};
const FRAMING_HINTS = {
  blur: 'Keeps the whole video over a soft blurred copy. Nothing is cut off.',
  crop: 'Fills the screen and trims the edges. Move the slider to keep the subject in.',
  bars: 'Keeps the whole video with black above and below.',
};
const RENDER_DELAY_MS = 650;

async function saveFile(blob, name) {
  try {
    const d = window.claude?.use ? await window.claude.use('downloads') : null;
    if (d) { await d.save({ filename: name, data: blob }); return; }
  } catch (e) { if (e && e.code === 'declined') return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
}

class ReelTool {
  constructor(root) {
    this.root = root;
    this.s = {
      layout: root.dataset.layout === 'split' ? 'split' : 'single', framing: root.dataset.framing || 'blur',
      pos: 0.5, pos2: 0.5, swap: false, sound: 'main', quality: 'best', strip: true, safe: false,
      trimA: 0, trimB: 1000, cover: null, view: 'frame',
    };
    this.main = null; this.second = null; this.result = null; this.resultUrl = null;
    this.renderId = 0; this.abort = null; this.drawQueued = null; this.drawing = false;
    this.el = Object.fromEntries(Object.entries({
      stage: '[data-stage]', drop: '[data-drop]', file: '[data-file]', file2: '[data-file2]', err: '[data-err]', top: '[data-stage-top]', name: '[data-name]',
      viewSwitch: '[data-view-switch]', view: '[data-view]', canvas: '[data-canvas]', video: '[data-video]', safe: '[data-safe]', veil: '[data-veil]', pct: '[data-pct]',
      pbar: '[data-pbar]', veilWhat: '.render-what', cancel: '[data-cancel]', readout: '[data-readout]', from: '[data-from]', to: '[data-to]', delta: '[data-delta]',
      len: '[data-len]', fmt: '[data-fmt]', notes: '[data-notes]', msg: '[data-msg]', dl: '[data-download]', coverDl: '[data-cover-dl]', choose: '[data-choose]',
      framingHint: '[data-framing-hint]', posWrap: '[data-pos-wrap]', pos: '[data-pos]', posLabel: '[data-pos-label]', posMain: '[data-pos-main]', pos2: '[data-pos2]',
      clip2Empty: '[data-clip2-empty]', clip2: '[data-clip2]', name2: '[data-name2]', swap: '[data-swap]', swapLabel: '[data-swap-label]',
      trimA: '[data-trim-a]', trimB: '[data-trim-b]', trimLabel: '[data-trim-label]', dualFill: '[data-dual-fill]', cover: '[data-cover]', coverLabel: '[data-cover-label]',
      strip: '[data-strip]', safeOn: '[data-safe-on]', dlUnder: '[data-download-under]', add2: '[data-add2]',
    }).map(([k, sel]) => [k, $(root, sel)]));
    this.scheduleRender = debounce(() => this.render(), RENDER_DELAY_MS);
    const support = browserSupport();
    this.bind();
    this.syncUI();
    if (!support.ok) { this.showError(support.reason); this.el.drop.disabled = true; }
  }

  bind() {
    const { el, root } = this;
    el.drop.addEventListener('click', () => el.file.click());
    el.choose.addEventListener('click', () => el.file.click());
    $$(root, '[data-choose2]').forEach((b) => b.addEventListener('click', () => el.file2.click()));
    el.file.addEventListener('change', () => { const f = el.file.files?.[0]; if (f) this.loadMain(f); el.file.value = ''; });
    el.file2.addEventListener('change', () => { const f = el.file2.files?.[0]; if (f) this.loadSecond(f); el.file2.value = ''; });

    const stage = el.stage;
    ['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add('is-over'); el.drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && stage.contains(e.relatedTarget)) return;
      stage.classList.remove('is-over'); el.drop.classList.remove('is-over');
    }));
    stage.addEventListener('drop', (e) => {
      const files = [...(e.dataTransfer?.files || [])];
      if (!files.length) return;
      // Dropping a second file while in split mode with a main video loaded adds it as the second clip.
      if (this.main && this.s.layout === 'split' && !this.second && files.length === 1) return this.loadSecond(files[0]);
      this.loadMain(files[0]);
      if (files[1]) { this.s.layout = 'split'; this.loadSecond(files[1]); }
    });

    $(root, '[data-panel]').addEventListener('submit', (e) => e.preventDefault());
    const radio = (name, fn) => $$(root, `input[name="${name}"]`).forEach((i) => i.addEventListener('change', () => fn(i.value)));
    radio('layout', (v) => { this.s.layout = v; this.changed(); });
    radio('framing', (v) => { this.s.framing = v; this.changed(); });
    radio('sound', (v) => { this.s.sound = v; this.changed({ redraw: false }); });
    radio('quality', (v) => { this.s.quality = v; this.changed({ redraw: false }); });
    radio('view', (v) => this.setView(v));
    el.pos.addEventListener('input', () => { this.s.pos = el.pos.value / 100; this.changed(); });
    el.posMain.addEventListener('input', () => { this.s.pos = el.posMain.value / 100; this.changed(); });
    el.pos2.addEventListener('input', () => { this.s.pos2 = el.pos2.value / 100; this.changed(); });
    el.swap.addEventListener('click', () => { this.s.swap = !this.s.swap; this.changed(); });
    el.strip.addEventListener('change', () => { this.s.strip = el.strip.checked; this.changed({ redraw: false }); });
    el.safeOn.addEventListener('change', () => { this.s.safe = el.safeOn.checked; this.syncUI(); if (this.s.safe) this.setView('frame'); });

    const trim = (which) => {
      let a = Number(el.trimA.value), b = Number(el.trimB.value);
      const gap = this.minTrimGap();
      if (b - a < gap) { if (which === 'a') a = Math.max(0, b - gap); else b = Math.min(1000, a + gap); }
      this.s.trimA = a; this.s.trimB = b;
      // Keep the cover inside the kept part.
      const len = this.trimLen();
      if (this.s.cover != null) this.s.cover = Math.min(this.s.cover, len);
      this.changed({ at: which === 'a' ? 0 : Math.max(0, len - 0.05) });
    };
    el.trimA.addEventListener('input', () => trim('a'));
    el.trimB.addEventListener('input', () => trim('b'));
    el.cover.addEventListener('input', () => {
      this.s.cover = (Number(el.cover.value) / 1000) * this.trimLen();
      this.coverBlob = null;
      this.syncUI();
      this.setView('frame');
      this.queueDraw(this.s.cover);
    });

    el.cancel.addEventListener('click', () => { this.abort?.abort(); this.scheduleRender.cancel(); this.el.msg.textContent = 'Stopped. Change any setting, or tap Download Reel to make it again.'; this.el.dl.disabled = false; this.el.dl.textContent = 'Make Reel'; this.waitingForClick = true; });
    el.dl.addEventListener('click', () => {
      if (this.waitingForClick || !this.result) { this.waitingForClick = false; this.render(); return; }
      saveFile(this.result.blob, suggestName(this.main.file.name, 'mp4', 'reel'));
    });
    el.dlUnder.addEventListener('click', () => el.dl.click());
    el.add2.addEventListener('click', () => el.file2.click());
    el.coverDl.addEventListener('click', async () => {
      if (!this.main) return;
      el.coverDl.disabled = true;
      try {
        this.coverBlob ||= await renderCover(this.main, this.splitOn() ? this.second : null, this.opts(), this.coverTime());
        await saveFile(this.coverBlob, suggestName(this.main.file.name, 'jpg', 'cover'));
      } catch (e) { this.el.msg.textContent = 'The cover could not be made. Try another frame.'; }
      el.coverDl.disabled = false;
    });

    const more = $(root, '[data-more-toggle]');
    more?.addEventListener('click', () => {
      const open = !root.classList.contains('show-more');
      root.classList.toggle('show-more', open);
      more.setAttribute('aria-expanded', String(open));
      $(more, '[data-more-label]').textContent = open ? 'Fewer options' : 'More options';
    });
  }

  /* ----- state helpers ----- */
  splitOn() { return this.s.layout === 'split'; }
  opts() {
    const s = this.s, len = this.main ? this.main.duration - this.main.start : 0;
    return {
      framing: s.framing, pos: s.pos, pos2: s.pos2, split: this.splitOn(), swap: s.swap, sound: s.sound, quality: s.quality, strip: s.strip,
      trimStart: (s.trimA / 1000) * len, trimEnd: (s.trimB / 1000) * len,
    };
  }
  trimLen() { const o = this.opts(); return Math.max(0, o.trimEnd - o.trimStart); }
  minTrimGap() { const len = this.main ? this.main.duration - this.main.start : 1; return Math.min(1000, Math.ceil((0.5 / Math.max(0.5, len)) * 1000)); }
  coverTime() { return Math.min(this.trimLen(), Math.max(0, this.s.cover ?? this.trimLen() * 0.3)); }

  /** Something that affects the output changed: update the preview now and make the video again shortly. */
  changed({ redraw = true, at } = {}) {
    this.syncUI();
    this.invalidate();
    if (!this.main) return;
    if (redraw) { this.setView('frame'); this.queueDraw(at ?? this.coverTime()); }
    this.coverBlob = null;
    this.scheduleRender();
  }

  invalidate() {
    this.renderId++;
    this.abort?.abort();
    this.result = null;
    this.waitingForClick = false;
    this.el.dl.disabled = true;
    this.el.dl.textContent = 'Download Reel';
    this.el.dl.classList.remove('btn-success'); this.el.dl.classList.add('btn-ghost');
    this.el.viewSwitch.hidden = true;
    this.el.dlUnder.hidden = true;
  }

  syncUI() {
    const { s, el, root } = this;
    $$(root, '[data-seg]').forEach((seg) => {
      const name = $(seg, 'input').name;
      const val = { layout: s.layout, framing: s.framing, sound: s.sound, quality: s.quality, view: s.view }[name];
      const inputs = $$(seg, 'input');
      inputs.forEach((i) => { i.checked = i.value === val; });
      seg.style.setProperty('--i', Math.max(0, inputs.findIndex((i) => i.checked)));
    });
    const split = this.splitOn();
    $$(root, '[data-sec]').forEach((sec) => { sec.hidden = sec.dataset.sec !== s.layout; });
    el.framingHint.textContent = FRAMING_HINTS[s.framing];
    el.posWrap.hidden = s.framing !== 'crop';
    el.pos.value = String(Math.round(s.pos * 100));
    el.posMain.value = String(Math.round(s.pos * 100));
    el.pos2.value = String(Math.round(s.pos2 * 100));
    el.posLabel.textContent = s.pos < 0.34 ? (this.main && this.main.height > this.main.width ? 'Top' : 'Left') : s.pos > 0.66 ? (this.main && this.main.height > this.main.width ? 'Bottom' : 'Right') : 'Centre';
    el.clip2Empty.hidden = !!this.second; el.clip2.hidden = !this.second;
    el.swap.hidden = !this.second;
    el.swapLabel.textContent = s.swap ? 'Second clip on top' : 'Main video on top';
    el.strip.checked = s.strip;
    el.safeOn.checked = s.safe;
    el.safe.hidden = !s.safe || s.view === 'result';
    el.trimA.value = String(s.trimA); el.trimB.value = String(s.trimB);
    el.dualFill.style.left = `${s.trimA / 10}%`; el.dualFill.style.right = `${100 - s.trimB / 10}%`;
    const disabled = !this.main;
    [el.trimA, el.trimB, el.cover].forEach((i) => { i.disabled = disabled; });
    if (this.main) {
      const o = this.opts(), len = o.trimEnd - o.trimStart;
      el.trimLabel.textContent = s.trimA === 0 && s.trimB === 1000 ? `Full ${formatTime(len)}` : `${formatTime(o.trimStart)} to ${formatTime(o.trimEnd)} (${formatTime(len)})`;
      el.trimLabel.classList.toggle('text-warn', len > REEL_MAX_SECONDS + 0.5);
      el.cover.value = String(Math.round((this.coverTime() / Math.max(0.001, len)) * 1000));
      el.coverLabel.textContent = `${s.cover == null ? 'Auto, ' : ''}${formatTime(this.coverTime())}`;
    } else { el.trimLabel.textContent = ''; el.coverLabel.textContent = 'Auto'; }
    el.coverDl.disabled = !this.main || (split && !this.second);
    el.add2.hidden = !(this.main && split && !this.second);
    el.add2.classList.toggle('is-top', !!s.swap);
    el.choose.textContent = this.main ? 'Choose another video' : 'Choose a video';
  }

  setView(v) {
    if (v === 'result' && !this.resultUrl) v = 'frame';
    this.s.view = v;
    const showVideo = v === 'result' && !!this.result;
    this.el.video.hidden = !showVideo;
    this.el.canvas.hidden = showVideo;
    if (showVideo) { this.el.video.play().catch(() => {}); } else { this.el.video.pause(); }
    this.syncUI();
  }

  showError(msg) {
    this.el.err.hidden = !msg;
    this.el.err.innerHTML = msg ? `<div class="note note-bad" role="alert">${ICONS.bad}<span></span></div>` : '';
    if (msg) $(this.el.err, 'span').textContent = msg;
  }

  veil(on, what = 'Making your Reel', p = null) {
    this.el.veil.hidden = !on;
    if (!on) return;
    this.el.veilWhat.textContent = what;
    this.el.pct.hidden = p == null;
    this.el.cancel.hidden = p == null;
    if (p != null) { this.el.pct.textContent = `${Math.round(p * 100)}%`; this.el.pbar.style.width = `${Math.max(2, p * 100)}%`; }
    else this.el.pbar.style.width = '0%';
    this.el.veil.classList.toggle('is-indeterminate', p == null);
  }

  /* ----- loading ----- */
  async loadMain(file) {
    this.showError('');
    this.invalidate();
    this.el.drop.hidden = true; this.el.view.hidden = false; this.el.top.hidden = false;
    this.el.name.textContent = file.name || 'video';
    this.veil(true, 'Reading video');
    try {
      const clip = await openVideo(file);
      if (this.main) closeVideo(this.main);
      this.main = clip;
      Object.assign(this.s, { trimA: 0, trimB: 1000, cover: null, pos: 0.5 });
      this.el.name.textContent = `${file.name || 'video'}  ${clip.width} × ${clip.height}, ${formatTime(clip.duration - clip.start)}`;
      this.el.readout.hidden = true;
      this.syncUI();
      await this.drawNow(this.coverTime());
      // Choose a good-looking cover in the background; it does not hold up the video.
      pickCover(clip, this.opts()).then((t) => { if (this.main === clip && this.s.cover == null) { this.s.cover = t; this.autoCover = true; this.syncUI(); if (this.s.view === 'frame') this.queueDraw(t); } }).catch(() => {});
      this.render();
    } catch (e) {
      this.veil(false);
      if (!this.main) { this.el.drop.hidden = false; this.el.view.hidden = true; this.el.top.hidden = true; }
      this.showError(e?.message || 'That video could not be read.');
    }
  }

  async loadSecond(file) {
    this.el.msg.textContent = 'Reading second clip…'; this.el.msg.className = 'hint';
    try {
      const clip = await openVideo(file);
      if (this.second) closeVideo(this.second);
      this.second = clip;
      this.s.layout = 'split';
      this.el.name2.textContent = `${file.name || 'clip'}, ${formatTime(clip.duration - clip.start)}`;
      if (!clip.audio && this.s.sound === 'second') this.s.sound = 'main';
      this.el.msg.textContent = '';
      this.changed();
    } catch (e) {
      this.el.msg.textContent = e?.message || 'That clip could not be read.'; this.el.msg.className = 'hint text-bad';
    }
  }

  /* ----- preview drawing: only the latest request is drawn ----- */
  queueDraw(t) {
    this.drawQueued = t;
    if (!this.drawing) this.pumpDraw();
  }
  async pumpDraw() {
    this.drawing = true;
    while (this.drawQueued != null) {
      const t = this.drawQueued; this.drawQueued = null;
      try { await this.drawNow(t); } catch (e) { /* skip frame */ }
    }
    this.drawing = false;
  }
  async drawNow(t) {
    if (!this.main) return;
    const c = this.el.canvas;
    const split = this.splitOn();
    await drawPreview(c, this.main, split ? this.second : null, this.opts(), t);
    if (split && !this.second) {
      const g = c.getContext('2d');
      const y = this.s.swap ? 0 : c.height / 2;
      g.fillStyle = '#120d1f'; g.fillRect(0, y, c.width, c.height / 2);
    }
  }

  /* ----- making the video ----- */
  async render() {
    if (!this.main) return;
    this.scheduleRender.cancel();
    if (this.splitOn() && !this.second) {
      this.veil(false);
      this.el.msg.textContent = 'Add a second clip to make the split screen.'; this.el.msg.className = 'hint';
      return;
    }
    const id = ++this.renderId;
    this.abort?.abort();
    const ac = (this.abort = new AbortController());
    this.el.msg.textContent = ''; this.el.msg.className = 'hint';
    this.root.classList.add('is-rendering');
    this.veil(true, 'Making your Reel', 0);
    try {
      const r = await renderReel({
        main: this.main, second: this.splitOn() ? this.second : null, opts: this.opts(), signal: ac.signal,
        onProgress: (p) => { if (id === this.renderId) this.veil(true, 'Making your Reel', p); },
      });
      if (id !== this.renderId) return;
      this.showResult(r);
    } catch (e) {
      if (e?.code === 'aborted' || id !== this.renderId) return;
      this.el.msg.textContent = e?.message || 'Something went wrong while making the video.';
      this.el.msg.className = 'hint text-bad';
    } finally {
      if (id === this.renderId) { this.veil(false); this.root.classList.remove('is-rendering'); }
    }
  }

  showResult(r) {
    const { el, main } = this;
    this.result = r;
    if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
    this.resultUrl = URL.createObjectURL(r.blob);
    el.video.src = this.resultUrl;
    el.viewSwitch.hidden = false;
    el.readout.hidden = false;
    el.from.textContent = formatBytes(main.file.size);
    el.to.textContent = formatBytes(r.bytes);
    const pct = (1 - r.bytes / main.file.size) * 100;
    el.delta.textContent = pct >= 1 ? `−${Math.round(pct)}%` : pct <= -1 ? `+${Math.round(-pct)}%` : 'Same size';
    el.delta.classList.toggle('is-up', pct <= -1);
    el.len.textContent = formatTime(r.duration);
    el.fmt.textContent = `MP4 · ${CODEC_NAME[r.videoCodec] || r.videoCodec}${r.audioCodec ? ' · ' + (CODEC_NAME[r.audioCodec] || r.audioCodec) : ''}`;

    const notes = [];
    const m = main.meta;
    if (this.s.strip) {
      if (m.location) notes.push(['good', 'Location data found and removed.']);
      else notes.push(['good', m.tags ? 'Hidden metadata removed. No location was found.' : 'Clean file. No location or hidden tags were found.']);
      if (m.device) notes.push(['info', `Also removed: the device name (${m.device}).`]);
    } else if (m.location) notes.push(['warn', 'This video still contains the location it was filmed at. Tick "Remove location and hidden metadata" to take it out.']);
    if (!main.hadAudioTrack && !this.splitOn()) notes.push(['info', 'The original video has no sound.']);
    else if (main.hadAudioTrack && !main.audio && this.s.sound === 'main') notes.push(['warn', 'The sound in this video could not be read in this browser, so the Reel is silent.']);
    if (pct <= -1) notes.push(['info', 'The new file is bigger than the original. That is normal for small, low-resolution videos: Reels are 1080 × 1920. Choose "Smaller file" under Quality if you need it lighter.']);
    r.warnings.forEach((w) => notes.push(['warn', w]));
    el.notes.innerHTML = notes.map(([k]) => `<div class="note note-${k}">${ICONS[k]}<span></span></div>`).join('');
    $$(el.notes, 'span').forEach((sp, i) => { sp.textContent = notes[i][1]; });

    el.dl.disabled = false;
    el.dl.textContent = `Download Reel · ${formatBytes(r.bytes)}`;
    el.dlUnder.textContent = el.dl.textContent; el.dlUnder.hidden = false;
    el.dl.classList.add('btn-success'); el.dl.classList.remove('btn-ghost');
    this.setView('result');
  }
}

document.querySelectorAll('[data-tool]').forEach((root) => { window.__tool = new ReelTool(root); });
