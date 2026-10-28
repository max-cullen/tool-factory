import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatHMS, formatShort, formatStopwatch, splitMs, toMs, tabTitle, spoken } from '../src/format.mjs';

test('hh:mm:ss with floor and ceil', () => {
  assert.equal(formatHMS(0), '00:00:00');
  assert.equal(formatHMS(61_000), '00:01:01');
  assert.equal(formatHMS(3_599_999), '00:59:59');
  assert.equal(formatHMS(3_599_999, 'ceil'), '01:00:00');
  assert.equal(formatHMS(1, 'ceil'), '00:00:01');
  assert.equal(formatHMS((99 * 3600 + 59 * 60 + 59) * 1000), '99:59:59');
  assert.equal(formatHMS(100 * 3600 * 1000), '100:00:00');
});

test('bad numbers format as zero', () => {
  for (const v of [NaN, -5, undefined, Infinity * 0]) assert.equal(formatHMS(v), '00:00:00');
});

test('short format drops hours under an hour', () => {
  assert.equal(formatShort(25 * 60000), '25:00');
  assert.equal(formatShort(25 * 60000 - 1, 'ceil'), '25:00');
  assert.equal(formatShort(3_725_000), '1:02:05');
});

test('stopwatch format with hundredths', () => {
  assert.equal(formatStopwatch(0), '00:00.00');
  assert.equal(formatStopwatch(12_345), '00:12.34');
  assert.equal(formatStopwatch(59_999), '00:59.99');
  assert.equal(formatStopwatch(3_600_000 + 5_010), '1:00:05.01');
});

test('splitMs', () => {
  assert.deepEqual(splitMs(3_661_230), { h: 1, m: 1, s: 1, cs: 23 });
});

test('toMs clamps and tolerates junk', () => {
  assert.equal(toMs(0, 25, 0), 1_500_000);
  assert.equal(toMs(1, 30, 15), 5_415_000);
  assert.equal(toMs('', '', ''), 0);
  assert.equal(toMs(500, 500, 500), (99 * 3600 + 59 * 60 + 59) * 1000);
  assert.equal(toMs(-1, 'x', 2.9), 2000);
});

test('tab title and spoken time', () => {
  assert.equal(tabTitle('24:59', 'Focus'), '24:59 · Focus');
  assert.equal(tabTitle('00:10'), '00:10');
  assert.equal(spoken(0), '0 seconds');
  assert.equal(spoken(3_900_000), '1 hour 5 minutes');
  assert.equal(spoken(61_000), '1 minute 1 second');
});
