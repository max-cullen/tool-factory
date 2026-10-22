// Timestamp-based countdown and stopwatch state machines.
// Time is always measured against a clock function (default Date.now), never by counting ticks, so a
// background tab, a throttled timer or a sleeping device cannot make the result drift. Pass your own
// `now` function in tests.
export const systemClock = () => Date.now();

const num = (v) => (Number.isFinite(v) ? v : 0);
export const MAX_MS = (99 * 3600 + 59 * 60 + 59) * 1000;

/* ---------- countdown ---------- */
// status: 'idle' | 'running' | 'paused' | 'done'
export function createCountdown({ now = systemClock, durationMs = 0 } = {}) {
  let duration = Math.max(0, Math.min(MAX_MS * 4, Math.round(num(durationMs))));
  let status = 'idle';
  let endAt = 0; // timestamp when running
  let left = 0; // ms left when paused

  const sync = () => {
    if (status === 'running' && now() >= endAt) { status = 'done'; left = 0; return true; }
    return false;
  };
  const api = {
    get status() { return status; },
    get duration() { return duration; },
    get endAt() { return endAt; },
    // Put the countdown in the idle state with a new length.
    load(ms) { duration = Math.max(0, Math.round(num(ms))); status = 'idle'; left = 0; },
    // Start from the full duration. `at` lets a caller chain a start onto an earlier end timestamp.
    start(ms, at = now()) {
      if (ms !== undefined) duration = Math.max(0, Math.round(num(ms)));
      if (duration <= 0) return false;
      status = 'running'; endAt = at + duration; left = duration;
      return true;
    },
    pause() {
      if (sync() || status !== 'running') return false;
      left = Math.max(0, Math.min(duration, endAt - now()));
      status = 'paused';
      return true;
    },
    resume(at = now()) {
      if (status !== 'paused') return false;
      endAt = at + left; status = 'running';
      return true;
    },
    reset() { status = 'idle'; left = 0; },
    // Marks a due countdown as done. Returns true once, at the moment it is found to have finished.
    sync,
    // Reading never changes state: a due countdown reads 0 until sync() marks it done.
    remaining() {
      if (status === 'running') return Math.max(0, Math.min(duration, endAt - now()));
      if (status === 'paused') return left;
      if (status === 'done') return 0;
      return duration;
    },
    elapsed() { return duration - api.remaining(); },
    progress() { return duration > 0 ? api.elapsed() / duration : 0; },
  };
  return api;
}

/* ---------- stopwatch ---------- */
// status: 'idle' | 'running' | 'paused'
export function createStopwatch({ now = systemClock } = {}) {
  let status = 'idle';
  let base = 0; // ms accumulated before the current run
  let startedAt = 0;
  let laps = [];

  const elapsed = () => base + (status === 'running' ? Math.max(0, now() - startedAt) : 0);
  return {
    get status() { return status; },
    get laps() { return laps.slice(); },
    elapsed,
    start() {
      if (status === 'running') return false;
      startedAt = now(); status = 'running';
      return true;
    },
    // Stop (pause). Elapsed time is kept, so start() resumes from here.
    stop() {
      if (status !== 'running') return false;
      base = elapsed(); status = 'paused';
      return true;
    },
    lap() {
      if (status !== 'running') return null;
      const total = elapsed();
      const prev = laps.length ? laps[laps.length - 1].total : 0;
      const lap = { n: laps.length + 1, split: total - prev, total };
      laps.push(lap);
      return lap;
    },
    reset() { status = 'idle'; base = 0; startedAt = 0; laps = []; },
  };
}

// Fastest and slowest lap numbers, only meaningful with two or more laps.
export function lapStats(laps) {
  if (!laps || laps.length < 2) return { fastest: null, slowest: null };
  let f = laps[0], s = laps[0];
  for (const l of laps) { if (l.split < f.split) f = l; if (l.split > s.split) s = l; }
  return f.split === s.split ? { fastest: null, slowest: null } : { fastest: f.n, slowest: s.n };
}
