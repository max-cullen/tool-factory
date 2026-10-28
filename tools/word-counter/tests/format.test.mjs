import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, secondsFor, formatDuration, parseWpm, parseLimit, limitStatus, formatPercent, formatAverage, statsToText, DEFAULTS } from '../src/format.mjs';
import { createSession, handleMessage } from '../src/worker-core.mjs';
import { analyse, makeSegmenters } from '../src/count.mjs';

test('defaults', () => assert.deepEqual(DEFAULTS, { readingWpm: 238, speakingWpm: 150 }));

test('numbers use thousands separators', () => {
  assert.equal(formatNumber(1234567), '1,234,567');
  assert.equal(formatNumber(0), '0');
});

test('reading time rounds to the nearest second', () => {
  assert.equal(secondsFor(238, 238), 60);
  assert.equal(formatDuration(secondsFor(238, 238)), '1 min');
  assert.equal(formatDuration(secondsFor(119, 238)), '30 sec');
  assert.equal(formatDuration(secondsFor(1, 238)), '0 sec'); // 0.25 s
  assert.equal(formatDuration(secondsFor(2, 238)), '1 sec');
  assert.equal(formatDuration(secondsFor(1000, 238)), '4 min 12 sec'); // 252.1 s
  assert.equal(formatDuration(59.6), '1 min');
  assert.equal(formatDuration(59.4), '59 sec');
  assert.equal(formatDuration(3600), '1 h');
  assert.equal(formatDuration(3600 + 5 * 60), '1 h 5 min');
  assert.equal(formatDuration(3599.9), '1 h');
  assert.equal(formatDuration(0), '0 sec');
  assert.equal(formatDuration(NaN), '0 sec');
});

test('speaking time at 150 wpm', () => {
  assert.equal(formatDuration(secondsFor(150, 150)), '1 min');
  assert.equal(formatDuration(secondsFor(375, 150)), '2 min 30 sec');
});

test('secondsFor guards against bad speeds and no words', () => {
  assert.equal(secondsFor(0, 238), 0);
  assert.equal(secondsFor(100, 0), 0);
  assert.equal(secondsFor(100, -5), 0);
});

test('parseWpm accepts sensible values, falls back otherwise', () => {
  assert.deepEqual(parseWpm('300', 238), { value: 300, valid: true });
  assert.deepEqual(parseWpm('', 238), { value: 238, valid: true });
  assert.deepEqual(parseWpm('0', 238), { value: 238, valid: false });
  assert.deepEqual(parseWpm('abc', 238), { value: 238, valid: false });
  assert.deepEqual(parseWpm('99999', 150), { value: 150, valid: false });
  assert.deepEqual(parseWpm('200.4', 150), { value: 200, valid: true });
});

test('parseLimit', () => {
  assert.deepEqual(parseLimit(''), { value: 0, valid: true });
  assert.deepEqual(parseLimit('280'), { value: 280, valid: true });
  assert.deepEqual(parseLimit('1,000'), { value: 1000, valid: true });
  assert.equal(parseLimit('0').valid, false);
  assert.equal(parseLimit('-5').valid, false);
  assert.equal(parseLimit('12.5').valid, false);
  assert.equal(parseLimit('abc').valid, false);
});

test('limit status: left, near, at and over', () => {
  assert.deepEqual(limitStatus(10, 0).state, 'none');
  assert.deepEqual(limitStatus(100, 280), { state: 'ok', remaining: 180, ratio: 100 / 280, text: '180 left' });
  assert.equal(limitStatus(260, 280).state, 'near');
  assert.equal(limitStatus(280, 280).state, 'at');
  const over = limitStatus(292, 280);
  assert.equal(over.state, 'over');
  assert.equal(over.text, '12 over');
  assert.equal(over.ratio, 1);
  assert.equal(limitStatus(0, 160).text, '160 left');
});

test('percent and average formatting', () => {
  assert.equal(formatPercent(12.345), '12.3%');
  assert.equal(formatPercent(0.04), '<0.1%');
  assert.equal(formatPercent(0), '0%');
  assert.equal(formatAverage(4.666), '4.7');
  assert.equal(formatAverage(0), '0');
});

test('statsToText lists every figure and the keywords', () => {
  const stats = { words: 238, characters: 1300, charactersNoSpaces: 1060, sentences: 12, paragraphs: 3, paragraphLines: 5, lines: 6, unique: 140, avgWordLength: 4.456 };
  const t = statsToText(stats, { readingWpm: 238, speakingWpm: 150, limit: 1000, keywords: [{ word: 'cat', count: 5, percent: 2.1 }] });
  for (const s of ['Words: 238', 'Characters (with spaces): 1,300', 'Characters (no spaces): 1,060', 'Sentences: 12', 'Paragraphs: 3', 'Lines: 6', 'Unique words: 140',
    'Average word length: 4.5', 'Reading time (238 wpm): 1 min', 'Speaking time (150 wpm): 1 min 35 sec', 'Character limit 1,000: 300 over', 'cat: 5 (2.1%)']) {
    assert.ok(t.includes(s), s + '\n' + t);
  }
  assert.ok(statsToText(stats, { readingWpm: 238, speakingWpm: 150, paragraphMode: 'line' }).includes('Paragraphs: 5'));
});

test('worker session: analyse then re-rank without recounting', () => {
  const s = createSession(makeSegmenters());
  const { stats, keywords } = s.analyse('The cat and the dog and the bird. Cat!');
  assert.equal(stats.words, 9);
  assert.equal(stats.unique, 5);
  assert.deepEqual(keywords.rows[0], { word: 'cat', count: 2, percent: (2 / 9) * 100 });
  assert.equal(s.rank({ ignoreStopWords: false }).rows[0].word, 'the');
});

test('worker session gives the same figures as a direct call', () => {
  const text = 'One fish, two fish. Red fish, blue fish!\n\nNew para.';
  const direct = analyse(text, makeSegmenters());
  const { stats } = createSession().analyse(text);
  for (const k of Object.keys(direct)) assert.deepEqual(stats[k], direct[k], k);
});

test('handleMessage: analyse, rank, unknown and errors', () => {
  const s = createSession();
  const r1 = handleMessage(s, { type: 'analyse', id: 7, text: 'apple apple pear', rank: { ignoreStopWords: true, top: 10, minLength: 1, matchCase: false } });
  assert.equal(r1.type, 'result');
  assert.equal(r1.id, 7);
  assert.equal(r1.stats.words, 3);
  const r2 = handleMessage(s, { type: 'rank', id: 8, rank: { top: 1 } });
  assert.equal(r2.type, 'ranked');
  assert.equal(r2.keywords.rows.length, 1);
  assert.equal(handleMessage(s, { type: 'nope', id: 9 }).type, 'error');
  assert.equal(handleMessage(createSession(), { type: 'rank', id: 1 }).keywords.rows.length, 0);
});

test('performance: 2 million characters through the worker session, with keywords', () => {
  const base = 'Alpha beta gamma delta, epsilon zeta eta theta. Iota kappa lambda mu nu xi omicron pi rho sigma tau.\n\n';
  const text = base.repeat(Math.ceil(2_000_000 / base.length));
  const t0 = performance.now();
  const { stats, keywords } = createSession().analyse(text);
  const ms = performance.now() - t0;
  assert.ok(stats.words > 300_000);
  assert.equal(keywords.rows.length, 10);
  assert.ok(ms < 8000, `took ${ms.toFixed(0)} ms`);
});
