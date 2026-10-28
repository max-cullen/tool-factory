import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHex, contrastRatio, mix, onColour, contrastHint } from '../src/colour.mjs';

test('parseHex accepts 3 and 6 digits and rejects junk', () => {
  assert.equal(parseHex('#ABC'), '#aabbcc');
  assert.equal(parseHex('0e1124'), '#0e1124');
  assert.equal(parseHex('#12'), null);
  assert.equal(parseHex('zzzzzz'), null);
});
test('contrast ratio: black on white is 21', () => {
  assert.equal(Math.round(contrastRatio('#000', '#fff')), 21);
  assert.equal(contrastRatio('#777', '#777'), 1);
});
test('mix blends', () => {
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mix('#102030', '#ffffff', 0), '#102030');
});
test('onColour picks white on dark and near-black on light', () => {
  assert.equal(onColour('#102030'), '#ffffff');
  assert.equal(onColour('#f0e060'), '#14161c');
});
test('contrastHint levels', () => {
  assert.equal(contrastHint('#16181d', '#ffffff', '#d2491f').level, 'good');
  assert.equal(contrastHint('#aaaaaa', '#ffffff', '#d2491f').level, 'bad');
  assert.equal(contrastHint('#767676', '#ffffff', '#d2491f').level, 'good');
  assert.equal(contrastHint('#16181d', '#ffffff', '#ffe9a0').level, 'warn');
  assert.match(contrastHint('#16181d', '#ffffff', '#d2491f').text, /: 1/);
});
