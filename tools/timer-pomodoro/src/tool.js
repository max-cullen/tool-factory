// Timer and Pomodoro browser entry point. Wires the data- hooks listed in ../DESIGN-NOTES.md.
// Everything runs on this device. Nothing is sent anywhere and nothing is stored (no cookies, no web storage).
import { createCountdown, createStopwatch, lapStats } from './clock.mjs';
import { createPomodoro, PHASE_LABEL } from './pomodoro.mjs';
import { formatHMS, formatShort, formatStopwatch, toMs, tabTitle, spoken } from './format.mjs';

const root = document.querySelector('[data-tool]');
if (root) init(root);

function init(root) {
  const $ = (sel, el = root) => el.querySelector(sel);
  const $$ = (sel, el = root) => [...el.querySelectorAll(sel)];
  const now = () => Date.now();
  const reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  const cd = createCountdown({ now });
  const sw = createStopwatch({ now });
  const pomo = createPomodoro({ now });
  const baseTitle = document.title;
  const MODES = ['countdown', 'stopwatch', 'pomodoro'];
  const MODE_LABEL = { countdown: 'Countdown', stopwatch: 'Stopwatch', pomodoro: 'Pomodoro' };
  let mode = 'countdown';

  const el = {
    view: $('[data-view]'), phase: $('[data-phase]'), sub: $('[data-sub]'), dial: $('[data-dial]'), ring: $('[data-ring]'),
    time: $('[data-time]'), cs: $('[data-cs]'), wrap: $('[data-time-wrap]'), pips: $('[data-pips]'), state: $('[data-state]'),
    primary: $('[data-primary]'), primaryLabel: $('[data-primary-label]'), secondary: $('[data-secondary]'),
    secondaryIcon: $('[data-secondary-icon]'), secondaryLabel: $('[data-secondary-label]'), reset: $('[data-reset]'),
    lapsWrap: $('[data-laps-wrap]'), laps: $('[data-laps]'), lapsTable: $('[data-laps-table]'), lapsEmpty: $('[data-laps-empty]'),
    lapCount: $('[data-lap-count]'), totals: $('[data-totals]'), announce: $('[data-announce]'),
    h: $('[data-h]'), m: $('[data-m]'), s: $('[data-s]'), presets: $$('[data-preset]'),
    focus: $('[data-focus]'), short: $('[data-short]'), long: $('[data-long]'), sessions: $('[data-sessions]'), auto: $('[data-auto]'),
    notify: $('[data-notify]'), notifyHint: $('[data-notify-hint]'), sound: $('[data-sound]'), volume: $('[data-volume]'),
    testTone: $('[data-test-tone]'), wake: $('[data-wake]'), wakeRow: $('[data-wake-row]'),
  };
  const SVG_SKIP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l9 7-9 7zM18 5v14"/></svg>';
  const SVG_LAP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';

  /* ---------- helpers ---------- */
  const countdownMs = () => toMs(el.h.value, el.m.value, el.s.value);
  const status = () => (mode === 'countdown' ? cd.status : mode === 'stopwatch' ? sw.status : pomo.status);
  const running = (m) => (m === 'countdown' ? cd.status === 'running' : m === 'stopwatch' ? sw.status === 'running' : pomo.status === 'running');
  const anyRunning = () => MODES.some(running);
  const announce = (text) => { el.announce.textContent = ''; setTimeout(() => { el.announce.textContent = text; }, 30); };
  const minutesToMs = (input) => {
    const v = input.value.trim();
    const n = Number(v);
    const ok = v !== '' && Number.isFinite(n) && n > 0;
    input.closest('.field').classList.toggle('is-bad', !ok);
    return ok ? n * 60000 : null;
  };

  /* ---------- audio (optional, off by default) ---------- */
  let audio = null;
  const audioCtx = () => {
    if (audio) return audio;
    try { const C = window.AudioContext || window.webkitAudioContext; if (C) audio = new C(); } catch { audio = null; }
    return audio;
  };
  const unlockAudio = () => { const c = audioCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
  function playTone() {
    const c = audioCtx();
    const vol = Number(el.volume.value) / 100;
    if (!c || vol <= 0) return;
    try {
      if (c.state === 'suspended') c.resume().catch(() => {});
      const t0 = c.currentTime + 0.02;
      for (let i = 0; i < 3; i++) {
        const t = t0 + i * 0.32;
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine'; osc.frequency.value = i === 2 ? 1046.5 : 880;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.4 * vol * vol), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        osc.connect(g); g.connect(c.destination);
        osc.start(t); osc.stop(t + 0.26);
      }
    } catch { /* sound is optional */ }
  }

  /* ---------- notifications (optional, off by default) ---------- */
  const setNotifyHint = (text) => { el.notifyHint.hidden = !text; el.notifyHint.textContent = text || ''; };
  el.notify.addEventListener('change', () => {
    setNotifyHint('');
    if (!el.notify.checked) return;
    if (!('Notification' in window)) { el.notify.checked = false; setNotifyHint('This browser does not support notifications.'); return; }
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') { el.notify.checked = false; setNotifyHint('Notifications are blocked for this site in your browser settings.'); return; }
    // The permission request runs only here, from the visitor's own click on this box.
    try {
      const p = Notification.requestPermission((r) => { if (r !== 'granted') { el.notify.checked = false; setNotifyHint('Permission was not given, so notifications stay off.'); } });
      if (p && p.then) p.then((r) => { if (r !== 'granted') { el.notify.checked = false; setNotifyHint('Permission was not given, so notifications stay off.'); } }).catch(() => { el.notify.checked = false; });
    } catch { el.notify.checked = false; setNotifyHint('Notifications could not be turned on.'); }
  });
  el.sound.addEventListener('change', () => { if (el.sound.checked) unlockAudio(); });
  el.testTone.addEventListener('click', () => { unlockAudio(); playTone(); });

  function alertDone(title, body) {
    announce(`${title}. ${body}`);
    root.classList.add('is-alert');
    setTimeout(() => root.classList.remove('is-alert'), 2400);
    if (el.sound.checked) playTone();
    if (el.notify.checked && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch { /* notifications are optional */ }
    }
  }

  /* ---------- screen wake lock (optional) ---------- */
  let lock = null; let lockBusy = false;
  if ('wakeLock' in navigator) el.wakeRow.hidden = false;
  async function syncWake() {
    if (!('wakeLock' in navigator) || lockBusy) return;
    const want = el.wake.checked && anyRunning() && document.visibilityState === 'visible';
    if (want && !lock) {
      lockBusy = true;
      try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch { lock = null; }
      lockBusy = false;
    } else if (!want && lock) {
      const l = lock; lock = null;
      try { await l.release(); } catch { /* already released */ }
    }
  }
  el.wake.addEventListener('change', syncWake);

  /* ---------- rendering ---------- */
  const C = 2 * Math.PI * 92;
  el.ring.style.strokeDasharray = String(C);
  const setRing = (frac) => { el.ring.style.strokeDashoffset = String(C * (1 - Math.max(0, Math.min(1, frac)))); };
  let lastLapsKey = '';

  function renderLaps() {
    const laps = sw.laps;
    const key = laps.length + ':' + (laps.length ? laps[laps.length - 1].total : 0);
    if (key === lastLapsKey) return;
    lastLapsKey = key;
    const { fastest, slowest } = lapStats(laps);
    el.laps.textContent = '';
    for (const l of laps.slice().reverse()) {
      const tr = document.createElement('tr');
      if (l.n === fastest) tr.className = 'is-fast'; else if (l.n === slowest) tr.className = 'is-slow';
      const tag = l.n === fastest ? ' (fastest)' : l.n === slowest ? ' (slowest)' : '';
      for (const [txt, cls] of [[String(l.n) + tag, ''], [formatStopwatch(l.split), 'num'], [formatStopwatch(l.total), 'num']]) {
        const td = document.createElement('td'); td.textContent = txt; if (cls) td.className = cls; tr.appendChild(td);
      }
      el.laps.appendChild(tr);
    }
    el.lapCount.textContent = String(laps.length);
    el.lapsTable.hidden = !laps.length;
    el.lapsEmpty.hidden = laps.length > 0;
  }

  function renderPips() {
    const n = pomo.settings.sessions;
    const done = (pomo.position - 1) + (pomo.phase === 'focus' ? 0 : 1);
    if (el.pips.children.length !== n) {
      el.pips.textContent = '';
      for (let i = 0; i < n; i++) { const li = document.createElement('li'); li.setAttribute('aria-hidden', 'true'); el.pips.appendChild(li); }
    }
    [...el.pips.children].forEach((li, i) => { li.className = i < done ? 'is-done' : i === done && pomo.phase === 'focus' ? 'is-now' : ''; });
    el.pips.setAttribute('aria-label', `${Math.min(done, n)} of ${n} focus sessions done in this round`);
  }

  function render() {
    const st = status();
    root.dataset.mode = mode;
    root.classList.toggle('is-running', st === 'running');
    let time; let cs = ''; let frac = 1; let label = MODE_LABEL[mode]; let sub = ''; let state = '';

    if (mode === 'countdown') {
      const ms = cd.remaining();
      time = formatHMS(ms, 'ceil'); frac = cd.duration > 0 ? ms / cd.duration : 0;
      state = { idle: 'Ready', running: 'Running', paused: 'Paused', done: "Time's up" }[st];
      sub = st === 'running' ? 'Ends at ' + new Date(cd.endAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : st === 'done' ? 'Press Start to run it again.' : st === 'paused' ? spoken(ms) + ' left' : 'Set a time, then press Start.';
      root.dataset.tone = 'countdown';
    } else if (mode === 'stopwatch') {
      const ms = sw.elapsed();
      const [main, hundredths] = formatStopwatch(ms).split('.');
      time = main; cs = '.' + hundredths; frac = (ms % 60000) / 60000;
      state = { idle: 'Ready', running: 'Running', paused: 'Stopped' }[st];
      sub = sw.laps.length ? `${sw.laps.length} ${sw.laps.length === 1 ? 'lap' : 'laps'} recorded` : 'Counts up. Press Lap to record a split.';
      root.dataset.tone = 'stopwatch';
    } else {
      const ms = pomo.remaining();
      time = formatShort(ms, 'ceil'); frac = pomo.duration() > 0 ? ms / pomo.duration() : 0;
      label = PHASE_LABEL[pomo.phase];
      const n = pomo.settings.sessions;
      sub = pomo.phase === 'focus' ? `Session ${pomo.position} of ${n} · Round ${pomo.cycle}` : `After session ${pomo.position} of ${n} · Round ${pomo.cycle}`;
      const next = PHASE_LABEL[pomo.next().phase].toLowerCase();
      state = st === 'running' ? `Running. Next: ${next}` : st === 'paused' ? 'Paused' : pomo.awaitingStart ? `Ready for the ${pomo.phase === 'focus' ? 'focus session' : label.toLowerCase()}. Press Start.` : 'Ready';
      root.dataset.tone = pomo.phase;
      renderPips();
      const sessions = pomo.completedSessions;
      el.totals.hidden = false;
      el.totals.textContent = sessions || pomo.totalFocusMs() >= 1000
        ? `This visit: ${spoken(pomo.totalFocusMs())} of focus, ${sessions} ${sessions === 1 ? 'session' : 'sessions'} completed.`
        : 'Nothing completed yet this visit.';
    }

    if (mode !== 'pomodoro') el.totals.hidden = true;
    el.pips.hidden = mode !== 'pomodoro';
    el.lapsWrap.hidden = mode !== 'stopwatch';
    const showCs = mode === 'stopwatch' && !(reducedQuery.matches && st === 'running');
    el.cs.hidden = !showCs;
    if (el.time.textContent !== time) el.time.textContent = time;
    if (showCs) el.cs.textContent = cs;
    el.wrap.dataset.size = time.length > 5 ? 'long' : 'short';
    el.wrap.classList.toggle('has-cs', showCs);
    el.phase.textContent = label;
    el.sub.textContent = sub;
    el.state.textContent = state;
    el.dial.classList.toggle('is-done', mode === 'countdown' && st === 'done');
    setRing(frac);
    el.wrap.setAttribute('aria-label', mode === 'pomodoro' ? `${label} time` : 'Time');

    // Buttons
    const pLabel = st === 'running' ? (mode === 'stopwatch' ? 'Stop' : 'Pause') : st === 'paused' ? 'Resume' : st === 'done' ? 'Start again' : mode === 'stopwatch' && sw.elapsed() > 0 ? 'Resume' : 'Start';
    el.primaryLabel.textContent = pLabel; el.primary.setAttribute('aria-label', pLabel);
    el.primary.disabled = false;
    el.secondary.hidden = mode === 'countdown';
    if (mode === 'stopwatch') { el.secondaryLabel.textContent = 'Lap'; el.secondaryIcon.innerHTML = SVG_LAP; el.secondary.disabled = st !== 'running'; renderLaps(); }
    if (mode === 'pomodoro') { el.secondaryLabel.textContent = 'Skip'; el.secondaryIcon.innerHTML = SVG_SKIP; el.secondary.disabled = false; }
    el.reset.disabled = (mode === 'countdown' && st === 'idle') || (mode === 'stopwatch' && st === 'idle') || (mode === 'pomodoro' && st === 'idle' && !pomo.awaitingStart && pomo.phase === 'focus' && pomo.position === 1 && pomo.cycle === 1 && pomo.completedSessions === 0);

    // Inputs
    const lockCd = cd.status === 'running' || cd.status === 'paused';
    for (const i of [el.h, el.m, el.s]) i.disabled = lockCd;
    for (const p of el.presets) p.disabled = lockCd;

    // Tabs
    for (const t of $$('[data-mode-tab]')) t.querySelector('.tp-run').hidden = !running(t.dataset.modeTab);
    updateTitle();
  }

  let lastTitle = null;
  function updateTitle() {
    const m = running(mode) ? mode : MODES.find(running);
    let title = baseTitle;
    if (m === 'countdown') title = tabTitle(formatShort(cd.remaining(), 'ceil'), 'Countdown');
    else if (m === 'stopwatch') title = tabTitle(formatShort(sw.elapsed()), 'Stopwatch');
    else if (m === 'pomodoro') title = tabTitle(formatShort(pomo.remaining(), 'ceil'), PHASE_LABEL[pomo.phase]);
    if (title !== lastTitle) { document.title = title; lastTitle = title; }
  }

  /* ---------- the loop: timestamps, not tick counting ---------- */
  let handle = null;
  function tick() {
    if (cd.sync()) alertDone("Time's up", `Your ${spoken(cd.duration)} countdown has finished.`);
    const events = pomo.sync();
    if (events.length) {
      const last = events[events.length - 1];
      const nextLabel = PHASE_LABEL[last.next.phase].toLowerCase();
      const what = last.ended === 'focus' ? 'Focus session complete' : last.ended === 'short' ? 'Short break over' : 'Long break over';
      alertDone(what, last.auto ? `Now in ${last.next.phase === 'focus' ? `focus session ${last.next.position}` : nextLabel}.` : `Press Start for the ${last.next.phase === 'focus' ? 'next focus session' : nextLabel}.`);
    }
    render();
    syncWake();
  }
  function schedule() {
    if (handle || !anyRunning()) return;
    const fast = sw.status === 'running' && document.visibilityState === 'visible' && !reducedQuery.matches;
    const run = () => { handle = null; tick(); schedule(); };
    handle = fast ? { raf: requestAnimationFrame(run) } : { to: setTimeout(run, 200) };
  }
  function cancelLoop() { if (!handle) return; if (handle.raf) cancelAnimationFrame(handle.raf); else clearTimeout(handle.to); handle = null; }
  const refresh = () => { cancelLoop(); tick(); schedule(); };
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', refresh);

  /* ---------- actions ---------- */
  function primary() {
    if (el.sound.checked) unlockAudio();
    if (mode === 'countdown') {
      if (cd.status === 'running') cd.pause();
      else if (cd.status === 'paused') cd.resume();
      else {
        const ms = countdownMs();
        if (ms <= 0) { el.state.textContent = 'Set a time above zero first.'; el.h.focus(); return; }
        cd.start(ms);
      }
    } else if (mode === 'stopwatch') {
      if (sw.status === 'running') sw.stop(); else sw.start();
    } else {
      pomo.toggle();
    }
    refresh();
  }
  function secondary() {
    if (mode === 'stopwatch') { sw.lap(); } else if (mode === 'pomodoro') { pomo.skip(); announce(`Skipped. Now ${PHASE_LABEL[pomo.phase].toLowerCase()}.`); }
    refresh();
  }
  function reset() {
    if (mode === 'countdown') { cd.load(countdownMs()); }
    else if (mode === 'stopwatch') { sw.reset(); lastLapsKey = ''; }
    else { pomo.reset(); }
    root.classList.remove('is-alert');
    refresh();
  }
  el.primary.addEventListener('click', primary);
  el.secondary.addEventListener('click', secondary);
  el.reset.addEventListener('click', reset);

  // Space starts or pauses, unless the visitor is in a control that uses the space bar itself.
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.code !== 'Space') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('input, select, textarea, button, a, summary, [role="tab"], [contenteditable]')) return;
    e.preventDefault();
    primary();
  });

  /* ---------- modes ---------- */
  const tabs = $$('[data-mode-tab]');
  function setMode(next, focus = false) {
    mode = next;
    tabs.forEach((t) => { const on = t.dataset.modeTab === next; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$('[data-mode-panel]').forEach((p) => { p.hidden = p.dataset.modePanel !== next; });
    el.view.setAttribute('aria-labelledby', `tp-tab-${next}`);
    render();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setMode(t.dataset.modeTab));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); setMode(MODES[(i + k + MODES.length) % MODES.length], true); }
      else if (e.key === 'Home') { e.preventDefault(); setMode(MODES[0], true); }
      else if (e.key === 'End') { e.preventDefault(); setMode(MODES[MODES.length - 1], true); }
    });
  });

  /* ---------- countdown inputs ---------- */
  const setHMS = (sec) => { el.h.value = Math.floor(sec / 3600); el.m.value = Math.floor((sec % 3600) / 60); el.s.value = sec % 60; };
  const onHms = () => { if (cd.status === 'idle' || cd.status === 'done') { cd.load(countdownMs()); render(); } };
  for (const i of [el.h, el.m, el.s]) {
    i.addEventListener('input', onHms);
    i.addEventListener('change', () => { setHMS(countdownMs() / 1000); onHms(); });
  }
  for (const p of el.presets) p.addEventListener('click', () => { setHMS(Number(p.dataset.preset)); cd.load(countdownMs()); render(); });

  /* ---------- pomodoro inputs ---------- */
  function readPomo() {
    const patch = { autoAdvance: el.auto.checked };
    const f = minutesToMs(el.focus), s = minutesToMs(el.short), l = minutesToMs(el.long);
    if (f) patch.focusMs = f; if (s) patch.shortMs = s; if (l) patch.longMs = l;
    const n = Number(el.sessions.value);
    const okN = Number.isInteger(n) && n >= 1 && n <= 12;
    el.sessions.closest('.field').classList.toggle('is-bad', !okN);
    if (okN) patch.sessions = n;
    pomo.configure(patch);
    render();
  }
  for (const i of [el.focus, el.short, el.long, el.sessions]) i.addEventListener('input', readPomo);
  el.auto.addEventListener('change', readPomo);

  setMode('countdown');
}
