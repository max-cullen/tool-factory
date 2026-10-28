// Pomodoro phase sequencing. "Pomodoro" is the name of a time-management technique; this is an
// independent implementation of a focus/break timer. All timing is timestamp-based (see clock.mjs).
import { createCountdown, systemClock } from './clock.mjs';

export const DEFAULTS = Object.freeze({ focusMs: 25 * 60000, shortMs: 5 * 60000, longMs: 15 * 60000, sessions: 4, autoAdvance: false });
export const LIMITS = Object.freeze({ minMs: 1000, maxMs: 6 * 3600000, minSessions: 1, maxSessions: 12 });
export const PHASE_LABEL = Object.freeze({ focus: 'Focus', short: 'Short break', long: 'Long break' });

const clampNum = (v, lo, hi, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};

export function normaliseSettings(s = {}) {
  const d = DEFAULTS;
  const ms = (v, f) => Math.round(clampNum(v, LIMITS.minMs, LIMITS.maxMs, f));
  return {
    focusMs: ms(s.focusMs ?? d.focusMs, d.focusMs),
    shortMs: ms(s.shortMs ?? d.shortMs, d.shortMs),
    longMs: ms(s.longMs ?? d.longMs, d.longMs),
    sessions: Math.round(clampNum(s.sessions ?? d.sessions, LIMITS.minSessions, LIMITS.maxSessions, d.sessions)),
    autoAdvance: Boolean(s.autoAdvance),
  };
}

// What comes after `phase`. position is the 1-based focus session within the cycle.
// Focus 1..n are each followed by a short break, except focus n, which is followed by the long break.
// After the long break a new cycle begins at session 1.
export function nextStep({ phase, position, cycle }, sessions) {
  if (phase === 'focus') return { phase: position >= sessions ? 'long' : 'short', position, cycle };
  if (phase === 'short') return { phase: 'focus', position: position + 1, cycle };
  return { phase: 'focus', position: 1, cycle: cycle + 1 };
}

// The ordered phases of one full cycle, handy for display and tests.
export function cyclePlan(sessions) {
  const out = [];
  for (let i = 1; i <= sessions; i++) { out.push('focus'); out.push(i === sessions ? 'long' : 'short'); }
  return out;
}

export function createPomodoro({ now = systemClock, settings } = {}) {
  let cfg = normaliseSettings(settings);
  const timer = createCountdown({ now });
  let at = { phase: 'focus', position: 1, cycle: 1 };
  let completedSessions = 0;
  let focusMs = 0; // focus time banked from finished or skipped phases
  let awaiting = false; // a phase just ended and the next one is waiting for Start

  const durationOf = (phase) => (phase === 'focus' ? cfg.focusMs : phase === 'short' ? cfg.shortMs : cfg.longMs);
  timer.load(durationOf(at.phase));

  // Move to the next phase. If startAt is given, it begins running from that timestamp.
  const advance = (startAt) => {
    at = nextStep(at, cfg.sessions);
    if (startAt === undefined) { timer.load(durationOf(at.phase)); awaiting = true; }
    else { timer.start(durationOf(at.phase), startAt); awaiting = false; }
  };

  const api = {
    get settings() { return { ...cfg }; },
    get status() { return timer.status; },
    get phase() { return at.phase; },
    get position() { return at.position; },
    get cycle() { return at.cycle; },
    get completedSessions() { return completedSessions; },
    get awaitingStart() { return awaiting; },
    remaining: () => timer.remaining(),
    elapsed: () => timer.elapsed(),
    duration: () => timer.duration,
    progress: () => timer.progress(),
    totalFocusMs() { return focusMs + (at.phase === 'focus' && timer.status !== 'idle' ? timer.elapsed() : 0); },
    next() { return nextStep(at, cfg.sessions); },

    configure(patch) {
      cfg = normaliseSettings({ ...cfg, ...patch });
      if (at.position > cfg.sessions) at = { ...at, position: cfg.sessions };
      // Changes apply to the running phase only if nothing has started yet; otherwise from the next phase.
      if (timer.status === 'idle') timer.load(durationOf(at.phase));
    },
    start() {
      if (timer.status === 'paused') return timer.resume();
      if (timer.status === 'running') return false;
      awaiting = false;
      return timer.start(durationOf(at.phase));
    },
    pause() { return timer.pause(); },
    toggle() { return timer.status === 'running' ? api.pause() : api.start(); },
    reset() {
      at = { phase: 'focus', position: 1, cycle: 1 };
      completedSessions = 0; focusMs = 0; awaiting = false;
      timer.load(durationOf('focus'));
    },
    // End the current phase early and go to the next one. Elapsed focus time still counts as focus time.
    skip() {
      const wasActive = timer.status === 'running';
      if (at.phase === 'focus') focusMs += timer.elapsed();
      advance(cfg.autoAdvance && wasActive ? now() : undefined);
    },
    // Call often (and on visibilitychange). Finds every phase that has ended since the last call, using
    // timestamps, so a long gap with no ticks still lands on the right phase. Returns the events.
    sync() {
      const events = [];
      for (let guard = 0; guard < 20000 && timer.status === 'running' && now() >= timer.endAt; guard++) {
        const endedAt = timer.endAt;
        const ended = at.phase;
        if (ended === 'focus') { completedSessions++; focusMs += timer.duration; }
        advance(cfg.autoAdvance ? endedAt : undefined);
        events.push({ type: 'phase-complete', ended, next: { ...at }, endedAt, auto: cfg.autoAdvance });
        if (!cfg.autoAdvance) break;
      }
      return events;
    },
  };
  return api;
}
