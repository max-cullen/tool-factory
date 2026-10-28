import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPomodoro, nextStep, cyclePlan, normaliseSettings, DEFAULTS } from '../src/pomodoro.mjs';

const fake = (t = 5_000_000) => { const c = { t, now: () => c.t, tick(ms) { c.t += ms; } }; return c; };
const S = 1000, M = 60 * S;
const small = { focusMs: 10 * S, shortMs: 3 * S, longMs: 6 * S, sessions: 3 };

test('settings are normalised and clamped', () => {
  assert.deepEqual(normaliseSettings(), DEFAULTS);
  const n = normaliseSettings({ focusMs: -5, shortMs: 'x', longMs: 1e12, sessions: 99, autoAdvance: 1 });
  assert.equal(n.focusMs, 1000); assert.equal(n.shortMs, DEFAULTS.shortMs); assert.equal(n.longMs, 6 * 3600000);
  assert.equal(n.sessions, 12); assert.equal(n.autoAdvance, true);
  assert.equal(normaliseSettings({ sessions: 0 }).sessions, 1);
});

test('cycle plan for different session counts', () => {
  assert.deepEqual(cyclePlan(1), ['focus', 'long']);
  assert.deepEqual(cyclePlan(2), ['focus', 'short', 'focus', 'long']);
  assert.deepEqual(cyclePlan(4), ['focus', 'short', 'focus', 'short', 'focus', 'short', 'focus', 'long']);
});

test('nextStep follows the long-break rule and starts a new cycle', () => {
  assert.deepEqual(nextStep({ phase: 'focus', position: 1, cycle: 1 }, 2), { phase: 'short', position: 1, cycle: 1 });
  assert.deepEqual(nextStep({ phase: 'short', position: 1, cycle: 1 }, 2), { phase: 'focus', position: 2, cycle: 1 });
  assert.deepEqual(nextStep({ phase: 'focus', position: 2, cycle: 1 }, 2), { phase: 'long', position: 2, cycle: 1 });
  assert.deepEqual(nextStep({ phase: 'long', position: 2, cycle: 1 }, 2), { phase: 'focus', position: 1, cycle: 2 });
});

test('manual advance: each phase waits for Start', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: small });
  assert.equal(p.phase, 'focus'); assert.equal(p.remaining(), 10 * S);
  p.start(); c.tick(10 * S);
  const ev = p.sync();
  assert.equal(ev.length, 1); assert.equal(ev[0].ended, 'focus'); assert.equal(ev[0].next.phase, 'short');
  assert.equal(p.phase, 'short'); assert.equal(p.status, 'idle'); assert.equal(p.awaitingStart, true);
  assert.equal(p.completedSessions, 1);
  c.tick(60 * S); // sitting idle costs nothing
  assert.equal(p.remaining(), 3 * S); assert.equal(p.sync().length, 0);
  p.start(); assert.equal(p.awaitingStart, false); c.tick(3 * S); p.sync();
  assert.equal(p.phase, 'focus'); assert.equal(p.position, 2);
});

test('full cycle with 2 sessions reaches the long break, then cycle 2', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: { ...small, sessions: 2, autoAdvance: true } });
  p.start();
  const seen = [];
  for (const d of [10, 3, 10, 6, 10]) { c.tick(d * S); for (const e of p.sync()) seen.push(e.ended); }
  assert.deepEqual(seen, ['focus', 'short', 'focus', 'long', 'focus']);
  assert.equal(p.cycle, 2); assert.equal(p.position, 1); assert.equal(p.phase, 'short');
  assert.equal(p.completedSessions, 3);
});

test('background tab: a ten minute gap lands on the right phase (auto-advance)', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: { focusMs: 25 * M, shortMs: 5 * M, longMs: 15 * M, sessions: 4, autoAdvance: true } });
  p.start();
  c.tick(27 * M); // no ticks at all
  const ev = p.sync();
  assert.deepEqual(ev.map((e) => e.ended), ['focus']);
  assert.equal(p.phase, 'short'); assert.equal(p.remaining(), 3 * M);
  c.tick(100 * M + 10 * S); // a very long gap
  p.sync();
  // 27 + 100 min = 127 min in. Plan: F25 S5 F25 S5 F25 S5 F25 L15 F25 ... boundaries 25,30,55,60,85,90,115,130
  assert.equal(p.phase, 'long'); assert.equal(p.position, 4);
  assert.equal(p.remaining(), 130 * M - (127 * M + 10 * S) );
  assert.equal(p.completedSessions, 4);
});

test('background tab without auto-advance stops after one phase and does not run on', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: small });
  p.start(); c.tick(10 * M);
  const ev = p.sync();
  assert.equal(ev.length, 1); assert.equal(p.status, 'idle'); assert.equal(p.remaining(), 3 * S);
});

test('pause and resume keep the phase time', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: small });
  p.start(); c.tick(4 * S); p.pause(); c.tick(30 * M); assert.equal(p.remaining(), 6 * S);
  p.start(); c.tick(6 * S); assert.equal(p.sync().length, 1);
});

test('skip moves on, counts focus time, and does not count a session as completed', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: small });
  p.start(); c.tick(4 * S); p.skip();
  assert.equal(p.phase, 'short'); assert.equal(p.status, 'idle'); assert.equal(p.completedSessions, 0);
  assert.equal(p.totalFocusMs(), 4 * S);
  p.skip(); assert.equal(p.phase, 'focus'); assert.equal(p.position, 2);
});

test('skip with auto-advance keeps running from now', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: { ...small, autoAdvance: true } });
  p.start(); c.tick(4 * S); p.skip();
  assert.equal(p.status, 'running'); assert.equal(p.remaining(), 3 * S);
});

test('skipping the last focus goes to the long break; skipping the long break starts a new cycle', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: { ...small, sessions: 1 } });
  p.skip(); assert.equal(p.phase, 'long'); p.skip(); assert.equal(p.phase, 'focus'); assert.equal(p.cycle, 2);
});

test('one session per cycle: focus then long break every time', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: { ...small, sessions: 1, autoAdvance: true } });
  p.start(); c.tick(10 * S + 6 * S + 10 * S); const ev = p.sync();
  assert.deepEqual(ev.map((e) => e.ended), ['focus', 'long', 'focus']);
});

test('totals include the running focus phase', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: small });
  p.start(); c.tick(10 * S); p.sync(); assert.equal(p.totalFocusMs(), 10 * S);
  p.start(); c.tick(2 * S); p.sync(); assert.equal(p.totalFocusMs(), 10 * S); // in a break
});

test('configure: idle phase picks up new length; running phase keeps its own', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: small });
  p.configure({ focusMs: 20 * S }); assert.equal(p.remaining(), 20 * S);
  p.start(); c.tick(5 * S); p.configure({ focusMs: 60 * S }); assert.equal(p.remaining(), 15 * S);
  p.configure({ sessions: 1 }); assert.equal(p.settings.sessions, 1);
});

test('configure: lowering sessions clamps position', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: { ...small, sessions: 4 } });
  p.skip(); p.skip(); p.skip(); p.skip(); assert.equal(p.position, 3);
  p.configure({ sessions: 2 }); assert.equal(p.position, 2);
});

test('reset clears everything', () => {
  const c = fake(); const p = createPomodoro({ now: c.now, settings: { ...small, autoAdvance: true } });
  p.start(); c.tick(30 * S); p.sync(); p.reset();
  assert.equal(p.phase, 'focus'); assert.equal(p.position, 1); assert.equal(p.cycle, 1);
  assert.equal(p.completedSessions, 0); assert.equal(p.totalFocusMs(), 0); assert.equal(p.status, 'idle');
});
