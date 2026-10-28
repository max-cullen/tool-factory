// Word Counter browser entry point. Wires the data- hooks in site.mjs.
// Everything runs on this device. Nothing is sent anywhere and nothing is stored (no cookies, no web storage).
import { makeSegmenters } from './count.mjs';
import { createSession } from './worker-core.mjs';
import { DEFAULTS, formatNumber, formatDuration, secondsFor, parseWpm, parseLimit, limitStatus, formatPercent, formatAverage, statsToText } from './format.mjs';

const root = document.querySelector('[data-tool]');
if (root) init(root);

function init(root) {
  const $ = (sel, el = root) => el.querySelector(sel);
  const $$ = (sel, el = root) => [...el.querySelectorAll(sel)];
  const input = $('[data-input]');
  const statusEl = $('[data-status]');
  const busyEl = $('[data-busy]');
  const kwBody = $('[data-kw-body]');
  const kwTable = $('[data-kw-table]');
  const kwEmpty = $('[data-kw-empty]');
  const kwMeta = $('[data-kw-meta]');
  const readWpmEl = $('[data-read-wpm]');
  const speakWpmEl = $('[data-speak-wpm]');
  const limitEl = $('[data-limit]');
  const presets = $$('[data-limit-preset]');
  const stopEl = $('[data-stop]');
  const caseEl = $('[data-case]');
  const minLenEl = $('[data-minlen]');
  const copyBtn = $('[data-copy-stats]');

  const LOCAL_MAX = 30000;       // up to this many characters: count on the main thread, instantly
  const DEBOUNCE_SMALL = 60;     // ms
  const DEBOUNCE_LARGE = 250;

  const segmenters = makeSegmenters();
  const local = createSession(segmenters);
  let worker = null;
  let workerFailed = false;
  let seq = 0;                   // id of the newest request; older replies are ignored
  let timer = 0;
  let source = 'local';          // which session holds the word counts: 'local' or 'worker'
  let last = null;               // last { stats, keywords } shown
  let lastText = '';

  /* ---- segmented control: slide the pill ---- */
  function syncSeg(seg) {
    const inputs = $$('input', seg);
    seg.style.setProperty('--i', Math.max(0, inputs.findIndex((i) => i.checked)));
  }
  $$('[data-seg]').forEach((seg) => { syncSeg(seg); seg.addEventListener('change', () => syncSeg(seg)); });

  /* ---- reading the options ---- */
  const paragraphMode = () => ($('input[name="paragraphs"]:checked') || { value: 'blank' }).value;
  function rankOptions() {
    const m = Number(minLenEl.value.trim());
    return { top: 10, ignoreStopWords: stopEl.checked, matchCase: caseEl.checked, minLength: Number.isFinite(m) && m >= 1 ? Math.min(Math.floor(m), 50) : 1 };
  }
  function speeds() {
    const r = parseWpm(readWpmEl.value, DEFAULTS.readingWpm);
    const s = parseWpm(speakWpmEl.value, DEFAULTS.speakingWpm);
    readWpmEl.closest('.field').classList.toggle('is-bad', !r.valid);
    speakWpmEl.closest('.field').classList.toggle('is-bad', !s.valid);
    $('[data-wpm-error]').hidden = r.valid && s.valid;
    return { readingWpm: r.value, speakingWpm: s.value };
  }
  function limit() {
    const l = parseLimit(limitEl.value);
    limitEl.closest('.field').classList.toggle('is-bad', !l.valid);
    $('[data-limit-error]').hidden = l.valid;
    presets.forEach((b) => b.setAttribute('aria-pressed', String(l.valid && l.value === Number(b.dataset.limitPreset))));
    return l.value;
  }

  /* ---- rendering ---- */
  function setBusy(on) {
    root.classList.toggle('is-working', on);
    busyEl.hidden = !on;
  }

  function renderKeywords(kw) {
    kwBody.textContent = '';
    const rows = (kw && kw.rows) || [];
    const max = rows.length ? Math.max(...rows.map((r) => r.percent)) : 0;
    for (const r of rows) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      const word = document.createElement('span');
      word.className = 'wc-word';
      word.textContent = r.word;
      word.translate = false;
      const bar = document.createElement('i');
      bar.className = 'wc-kbar';
      bar.setAttribute('aria-hidden', 'true');
      bar.style.width = `${max ? Math.max(4, (r.percent / max) * 100) : 0}%`;
      th.append(word, bar);
      const c = document.createElement('td');
      c.className = 'num';
      c.textContent = formatNumber(r.count);
      const p = document.createElement('td');
      p.className = 'num';
      p.textContent = formatPercent(r.percent);
      tr.append(th, c, p);
      kwBody.append(tr);
    }
    const none = rows.length === 0;
    kwTable.hidden = none;
    kwEmpty.hidden = !none;
    kwEmpty.textContent = kw && kw.totalWords > 0 ? 'No words match these settings. Try showing common words or a shorter minimum length.' : 'Type or paste some text to see the words used most.';
    kwMeta.textContent = kw && kw.totalWords > 0 ? `${formatNumber(kw.distinct)} distinct` : '';
  }

  function renderTimesAndLimit() {
    const stats = last ? last.stats : null;
    const sp = speeds();
    const words = stats ? stats.words : 0;
    $('[data-read-out]').textContent = formatDuration(secondsFor(words, sp.readingWpm));
    $('[data-speak-out]').textContent = formatDuration(secondsFor(words, sp.speakingWpm));
    const lim = limit();
    const l = limitStatus(stats ? stats.characters : 0, lim);
    const out = $('[data-limit-out]');
    out.textContent = l.text;
    out.dataset.state = l.state;
    const meter = $('[data-limit-meter]');
    meter.dataset.state = l.state;
    meter.firstElementChild.style.width = `${Math.round(l.ratio * 100)}%`;
    return l;
  }

  function renderStats() {
    const s = last ? last.stats : null;
    const set = (k, v) => { const el = $(`[data-stat="${k}"]`); if (el) el.textContent = v; };
    set('words', formatNumber(s ? s.words : 0));
    set('characters', formatNumber(s ? s.characters : 0));
    set('charactersNoSpaces', formatNumber(s ? s.charactersNoSpaces : 0));
    set('sentences', formatNumber(s ? s.sentences : 0));
    set('paragraphs', formatNumber(s ? (paragraphMode() === 'line' ? s.paragraphLines : s.paragraphs) : 0));
    set('lines', formatNumber(s ? s.lines : 0));
    set('unique', formatNumber(s ? s.unique : 0));
    set('avg', formatAverage(s ? s.avgWordLength : 0));
    $('[data-approx]').hidden = !(s && s.approximate);
    $('[data-script-note]').hidden = !(s && s.unspacedScript);
    const l = renderTimesAndLimit();
    renderKeywords(last ? last.keywords : null);
    let msg = `${formatNumber(s ? s.words : 0)} words, ${formatNumber(s ? s.characters : 0)} characters`;
    if (l.state === 'over') msg += `. ${l.text} the limit.`;
    else if (l.state === 'at') msg += '. At the limit.';
    else if (l.state !== 'none') msg += `. ${l.text}.`;
    statusEl.textContent = msg;
  }

  /* ---- counting: small text on this thread, large text in a worker ---- */
  function getWorker() {
    if (worker || workerFailed) return worker;
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => onReply(e.data);
      worker.onerror = () => { worker = null; workerFailed = true; if (root.classList.contains('is-working')) compute(true); };
    } catch {
      worker = null;
      workerFailed = true;
    }
    return worker;
  }
  function dropWorker() { if (worker) { worker.terminate(); worker = null; } }

  function onReply(msg) {
    if (msg.id !== seq) return; // a newer request has been made
    if (msg.type === 'result') {
      last = { stats: msg.stats, keywords: msg.keywords };
      source = 'worker';
      setBusy(false);
      renderStats();
    } else if (msg.type === 'ranked') {
      if (last) last.keywords = msg.keywords;
      renderKeywords(msg.keywords);
    } else if (msg.type === 'error') {
      setBusy(false);
      statusEl.textContent = 'Sorry, this text could not be counted.';
    }
  }

  function compute(forceLocal = false) {
    const text = input.value;
    lastText = text;
    const id = ++seq;
    if (text.length > LOCAL_MAX && !forceLocal && getWorker()) {
      setBusy(true);
      statusEl.textContent = 'Calculating…';
      worker.postMessage({ type: 'analyse', id, text, rank: rankOptions() });
      return;
    }
    if (worker) dropWorker(); // a stale large job is no longer wanted
    if (text.length > LOCAL_MAX) { // no worker available: still show a calculating state first, then block briefly
      setBusy(true);
      statusEl.textContent = 'Calculating…';
      setTimeout(() => { if (id === seq) finishLocal(text); }, 30);
      return;
    }
    finishLocal(text);
  }
  function finishLocal(text) {
    last = local.analyse(text, rankOptions());
    source = 'local';
    setBusy(false);
    renderStats();
  }

  function schedule() {
    clearTimeout(timer);
    const n = input.value.length;
    if (n <= 2000) { compute(); return; }
    timer = setTimeout(compute, n > 200000 ? DEBOUNCE_LARGE : DEBOUNCE_SMALL);
  }

  function reRank() {
    if (!last || !lastText) { renderStats(); return; }
    if (source === 'worker' && worker && !root.classList.contains('is-working')) {
      worker.postMessage({ type: 'rank', id: seq, rank: rankOptions() });
    } else if (source === 'local') {
      last.keywords = local.rank(rankOptions());
      renderKeywords(last.keywords);
    }
  }

  input.addEventListener('input', schedule);

  // Keyword options only re-rank the words already counted.
  [stopEl, caseEl].forEach((el) => el.addEventListener('change', reRank));
  minLenEl.addEventListener('input', reRank);
  // Speeds, limit and paragraph mode do not need a recount.
  [readWpmEl, speakWpmEl, limitEl].forEach((el) => el.addEventListener('input', () => {
    if (el === limitEl) presets.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    renderStats();
  }));
  $('[data-paragraph-mode]').addEventListener('change', renderStats);
  presets.forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') === 'true';
    limitEl.value = on ? '' : b.dataset.limitPreset;
    renderStats();
  }));

  /* ---- clear and copy ---- */
  $('[data-clear]').addEventListener('click', () => {
    clearTimeout(timer);
    input.value = '';
    dropWorker();
    seq++;
    setBusy(false);
    last = null;
    lastText = '';
    source = 'local';
    renderStats();
    input.focus();
  });

  async function writeClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* fall through */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
  let copyTimer = 0;
  copyBtn.addEventListener('click', async () => {
    const s = last ? last.stats : { words: 0, characters: 0, charactersNoSpaces: 0, sentences: 0, paragraphs: 0, paragraphLines: 0, lines: 0, unique: 0, avgWordLength: 0 };
    const sp = speeds();
    const text = statsToText(s, { ...sp, limit: limit(), keywords: last ? last.keywords.rows : [], paragraphMode: paragraphMode() });
    const ok = await writeClipboard(text);
    const label = $('[data-copy-label]');
    copyBtn.classList.toggle('is-copied', ok);
    label.textContent = ok ? 'Copied' : 'Copy failed';
    statusEl.textContent = ok ? 'Statistics copied to the clipboard.' : 'Could not copy. Select the figures and copy them by hand.';
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyBtn.classList.remove('is-copied'); label.textContent = 'Copy stats'; }, 1800);
  });

  renderStats();
  if (input.value) compute(); // the browser may restore text after a reload
}
