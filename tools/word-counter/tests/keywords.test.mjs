import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCounter, normaliseWord, tokenise, STOP_WORDS, better } from '../src/keywords.mjs';
import { analyse, makeSegmenters } from '../src/count.mjs';

const seg = makeSegmenters();
const counterFor = (text) => { const c = createCounter(); analyse(text, { ...seg, onWord: c.add }); return c; };
const top = (text, opts) => counterFor(text).rank(opts).rows.map((r) => [r.word, r.count]);

test('normaliseWord straightens curly apostrophes and trims edge punctuation', () => {
  assert.equal(normaliseWord('don’t'), "don't");
  assert.equal(normaliseWord("'quoted'"), 'quoted');
  assert.equal(normaliseWord('-dash-'), 'dash');
  assert.equal(normaliseWord('well-known'), 'well-known');
  assert.deepEqual(tokenise(['A', "'", 'b']), ['A', 'b']);
});

test('ranks by count, case-insensitively by default', () => {
  assert.deepEqual(top('Apple apple APPLE pear Pear fig', { ignoreStopWords: false }), [['apple', 3], ['pear', 2], ['fig', 1]]);
});

test('match case keeps different cases apart', () => {
  assert.deepEqual(top('Apple apple apple', { matchCase: true, ignoreStopWords: false }), [['apple', 2], ['Apple', 1]]);
});

test('ties break alphabetically, the same way every time', () => {
  const rows = top('delta alpha charlie bravo echo', { ignoreStopWords: false });
  assert.deepEqual(rows.map((r) => r[0]), ['alpha', 'bravo', 'charlie', 'delta', 'echo']);
  assert.deepEqual(top('zed yak xi zed yak xi', { ignoreStopWords: false }).map((r) => r[0]), ['xi', 'yak', 'zed']);
  assert.ok(better(2, 'b', 1, 'a'));
  assert.ok(better(1, 'a', 1, 'b'));
  assert.ok(!better(1, 'b', 1, 'a'));
});

test('tie-break is independent of the order words arrive in', () => {
  const a = top('one two three four five six', { ignoreStopWords: false });
  const b = top('six five four three two one', { ignoreStopWords: false });
  assert.deepEqual(a, b);
});

test('top N is limited to 10 by default and can be changed', () => {
  const text = 'a1b a2b a3b a4b a5b a6b a7b a8b a9b a10b a11b a12b';
  assert.equal(counterFor(text).rank().rows.length, 10);
  assert.equal(counterFor(text).rank({ top: 3 }).rows.length, 3);
  assert.equal(counterFor(text).rank({ top: 50 }).rows.length, 12);
});

test('stop words are ignored by default and can be switched off', () => {
  const text = 'the cat and the dog and the bird';
  assert.deepEqual(top(text), [['bird', 1], ['cat', 1], ['dog', 1]]);
  assert.deepEqual(top(text, { ignoreStopWords: false }).slice(0, 2), [['the', 3], ['and', 2]]);
});

test('stop words match contractions with curly apostrophes and any capitals', () => {
  assert.deepEqual(top("Don’t DON'T It's THE Zebra"), [['zebra', 1]]);
  assert.ok(STOP_WORDS.has('the') && STOP_WORDS.has("don't") && !STOP_WORDS.has('zebra'));
});

test('minimum word length', () => {
  const text = 'go go cat cat cat elephant';
  assert.deepEqual(top(text, { ignoreStopWords: false, minLength: 3 }), [['cat', 3], ['elephant', 1]]);
  assert.deepEqual(top(text, { ignoreStopWords: false, minLength: 4 }), [['elephant', 1]]);
});

test('minimum length counts characters, not UTF-16 units', () => {
  assert.equal(top('café', { minLength: 4 }).length, 1);
});

test('percentages are of all words, including ignored ones, and numbers are not keywords', () => {
  const r = counterFor('the the the apple 2024 2024 pear').rank();
  assert.equal(r.totalWords, 7);
  assert.deepEqual(r.rows.map((x) => x.word), ['apple', 'pear']);
  assert.ok(Math.abs(r.rows[0].percent - (1 / 7) * 100) < 1e-9);
});

test('empty text gives an empty table', () => {
  const r = counterFor('').rank();
  assert.deepEqual(r.rows, []);
  assert.equal(r.totalWords, 0);
});

test('unique words ignore case', () => {
  assert.equal(counterFor('Apple apple APPLE pear').unique(), 2);
});

test('hyphenated words and apostrophe forms are tracked as written', () => {
  assert.deepEqual(top('well-known well-known don’t don\'t', { ignoreStopWords: false }), [["don't", 2], ['well-known', 2]]);
});
