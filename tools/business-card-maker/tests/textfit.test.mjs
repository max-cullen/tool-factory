import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapLines, fitText, clean } from '../src/textfit.mjs';

const measure = (t, size) => Array.from(t).length * size * 0.5; // fake: every character is half the font size wide

test('clean collapses whitespace', () => assert.equal(clean('  a \n  b  '), 'a b'));
test('wrapLines breaks on spaces within the width', () => {
  assert.deepEqual(wrapLines('aaa bbb ccc', 6, 2, measure), ['aaa', 'bbb', 'ccc']);
  assert.deepEqual(wrapLines('aaa bbb ccc', 8, 2, measure), ['aaa bbb', 'ccc']);
});
test('wrapLines breaks a word that is wider than the box', () => {
  const lines = wrapLines('abcdefghij', 5, 2, measure);
  assert.ok(lines.length >= 2);
  assert.equal(lines.join(''), 'abcdefghij');
  assert.ok(lines.every((l) => measure(l, 2) <= 5));
});
test('fitText keeps the size when the text already fits', () => {
  const r = fitText({ text: 'Hello', maxWidth: 20, size: 4, minSize: 2, measure });
  assert.deepEqual(r, { lines: ['Hello'], size: 4, truncated: false });
});
test('fitText wraps when allowed more lines', () => {
  const r = fitText({ text: 'Alexandra Taylor-Smith', maxWidth: 25, size: 4, minSize: 3, maxLines: 2, measure });
  assert.equal(r.lines.length, 2);
  assert.ok(r.lines.every((l) => measure(l, r.size) <= 25));
  assert.equal(r.truncated, false);
});
test('fitText shrinks a one-line text down to the minimum, then truncates', () => {
  const r = fitText({ text: 'A very long company name indeed', maxWidth: 20, size: 4, minSize: 2, measure });
  assert.equal(r.lines.length, 1);
  assert.equal(r.size, 2);
  assert.equal(r.truncated, true);
  assert.ok(r.lines[0].endsWith('…'));
  assert.ok(measure(r.lines[0], r.size) <= 20);
});
test('fitText shrinks before truncating when that is enough', () => {
  const r = fitText({ text: 'abcdefghijkl', maxWidth: 5, size: 1, minSize: 0.4, measure });
  assert.equal(r.truncated, false);
  assert.ok(r.size < 1 && r.size >= 0.4);
  assert.ok(measure(r.lines[0], r.size) <= 5 + 1e-9);
});
test('empty text gives no lines', () => assert.deepEqual(fitText({ text: '   ', maxWidth: 10, size: 3, measure }).lines, []));
