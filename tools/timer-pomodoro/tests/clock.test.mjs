import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCountdown, createStopwatch, lapStats, MAX_MS } from '../src/clock.mjs';

const fake = (t = 1_000_000) => { const c = { t, now: () => c.t, tick(ms) { c.t += ms; } }; return c; };
const S = 1000, M = 60 * S;

test('countdown: idle shows the full duration', () => {
  const c = fake(); const cd = createCountdown({ now: c.now, durationMs: 90 * S });
  assert.equal(cd.status, 'idle'); assert.equal(cd.remaining(), 90 * S); assert.equal(cd.elapsed(), 0);
});

test('countdown: runs, pauses and resumes without losing time', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  assert.ok(cd.start(60 * S));
  c.tick(10 * S); assert.equal(cd.remaining(), 50 * S);
  assert.ok(cd.pause());
  c.tick(5 * M); // paused for five minutes: nothing changes
  assert.equal(cd.remaining(), 50 * S);
  assert.ok(cd.resume());
  c.tick(20 * S); assert.equal(cd.remaining(), 30 * S);
  assert.equal(cd.elapsed(), 30 * S);
});

test('countdown: many pause/resume cycles stay exact', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  cd.start(100 * S);
  for (let i = 0; i < 20; i++) { c.tick(1 * S); cd.pause(); c.tick(7 * S); cd.resume(); }
  assert.equal(cd.remaining(), 80 * S);
});

test('countdown: finishes exactly once, even after a long gap with no ticks', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  cd.start(5 * M);
  c.tick(10 * M); // background tab: nobody called anything for ten minutes
  assert.equal(cd.remaining(), 0);
  assert.equal(cd.sync(), true);
  assert.equal(cd.status, 'done');
  assert.equal(cd.sync(), false);
  assert.equal(cd.remaining(), 0);
});

test('countdown: finishes at the boundary', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  cd.start(3 * S); c.tick(3 * S - 1); assert.equal(cd.sync(), false); assert.equal(cd.remaining(), 1);
  c.tick(1); assert.equal(cd.sync(), true);
});

test('countdown: zero duration will not start; reset returns to idle', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  assert.equal(cd.start(0), false); assert.equal(cd.status, 'idle'); assert.equal(cd.start(), false);
  cd.start(10 * S); c.tick(2 * S); cd.reset();
  assert.equal(cd.status, 'idle'); assert.equal(cd.remaining(), 10 * S);
});

test('countdown: large values and bad input', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  cd.start(MAX_MS); c.tick(24 * 3600 * S); assert.equal(cd.remaining(), MAX_MS - 24 * 3600 * S);
  const bad = createCountdown({ now: c.now, durationMs: NaN }); assert.equal(bad.duration, 0);
  assert.equal(bad.start(-5), false);
});

test('countdown: pause after due does nothing and a clock that goes backwards is clamped', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  cd.start(10 * S); c.tick(11 * S); assert.equal(cd.pause(), false); assert.equal(cd.status, 'done');
  const d = createCountdown({ now: c.now }); d.start(10 * S); c.tick(-60 * S);
  assert.equal(d.remaining(), 10 * S);
});

test('countdown: start can be chained onto an earlier timestamp', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  cd.start(10 * S, c.t - 4 * S); assert.equal(cd.remaining(), 6 * S);
});

test('countdown: resume does nothing unless paused', () => {
  const c = fake(); const cd = createCountdown({ now: c.now });
  assert.equal(cd.resume(), false); cd.start(5 * S); assert.equal(cd.resume(), false);
});

test('stopwatch: counts, stops, resumes', () => {
  const c = fake(); const sw = createStopwatch({ now: c.now });
  assert.equal(sw.elapsed(), 0); sw.start(); c.tick(1500); assert.equal(sw.elapsed(), 1500);
  sw.stop(); c.tick(60 * S); assert.equal(sw.elapsed(), 1500);
  sw.start(); c.tick(500); assert.equal(sw.elapsed(), 2000);
});

test('stopwatch: stays right after a ten minute gap', () => {
  const c = fake(); const sw = createStopwatch({ now: c.now });
  sw.start(); c.tick(10 * M); assert.equal(sw.elapsed(), 10 * M);
});

test('stopwatch: lap maths', () => {
  const c = fake(); const sw = createStopwatch({ now: c.now });
  assert.equal(sw.lap(), null, 'no lap while idle');
  sw.start();
  c.tick(12_340); const a = sw.lap();
  c.tick(9_000); const b = sw.lap();
  c.tick(15_660); const d = sw.lap();
  assert.deepEqual(a, { n: 1, split: 12_340, total: 12_340 });
  assert.deepEqual(b, { n: 2, split: 9_000, total: 21_340 });
  assert.deepEqual(d, { n: 3, split: 15_660, total: 37_000 });
  assert.equal(sw.laps.reduce((t, l) => t + l.split, 0), d.total);
  assert.deepEqual(lapStats(sw.laps), { fastest: 2, slowest: 3 });
});

test('stopwatch: laps across a stop keep totals consistent; reset clears', () => {
  const c = fake(); const sw = createStopwatch({ now: c.now });
  sw.start(); c.tick(5 * S); sw.lap(); sw.stop(); c.tick(99 * S); assert.equal(sw.lap(), null);
  sw.start(); c.tick(3 * S); const l = sw.lap();
  assert.equal(l.total, 8 * S); assert.equal(l.split, 3 * S);
  sw.reset(); assert.equal(sw.status, 'idle'); assert.equal(sw.elapsed(), 0); assert.equal(sw.laps.length, 0);
});

test('lapStats needs two different laps', () => {
  assert.deepEqual(lapStats([]), { fastest: null, slowest: null });
  assert.deepEqual(lapStats([{ n: 1, split: 5, total: 5 }]), { fastest: null, slowest: null });
  assert.deepEqual(lapStats([{ n: 1, split: 5, total: 5 }, { n: 2, split: 5, total: 10 }]), { fastest: null, slowest: null });
});
