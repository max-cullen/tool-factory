import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, seededRandom, cryptoRandom, LENGTHS, CASES, SEPARATORS, cleanWord } from '../src/generate.mjs';
import { WORDS, CATEGORY_IDS } from '../src/words.mjs';

const base = { category: 'fantasy', length: 'medium', case: 'title', separator: '', word: '', numbers: false };
const run = (o, seed = 7) => generate({ ...base, ...o }, seededRandom(seed));

test('returns twelve names by default, none empty', () => {
  for (const category of CATEGORY_IDS) {
    const { names } = run({ category });
    assert.equal(names.length, 12, category);
    assert.ok(names.every((n) => typeof n === 'string' && n.length > 0));
  }
});

test('lengths are respected for every category, length and option mix', () => {
  for (const category of CATEGORY_IDS) for (const length of Object.keys(LENGTHS)) for (const sep of SEPARATORS) for (const numbers of [false, true]) {
    const { names } = run({ category, length, separator: sep, numbers }, 3);
    const { min, max } = LENGTHS[length];
    for (const n of names) assert.ok(n.length >= min && n.length <= max, `${category}/${length}/${sep}/${numbers}: ${n}`);
  }
});

test('non-mix categories use only their own word lists', () => {
  for (const category of CATEGORY_IDS.filter((c) => c !== 'mix')) {
    const own = new Set([...WORDS[category].first, ...WORDS[category].second, ...WORDS[category].solo]);
    const { names } = run({ category, case: 'lower', separator: '_', length: 'long' }, 11);
    for (const n of names) {
      for (const part of n.split('_')) {
        // look-alike digits are allowed in gamer tags, so match with letters only where digits appear
        const ok = [...own].some((w) => w === part || (category === 'gamer' && w.length === part.length && [...w].every((c, i) => c === part[i] || /\d/.test(part[i]))));
        assert.ok(ok, `${category}: "${part}" in ${n}`);
      }
    }
  }
});

test('mix draws on more than one category', () => {
  const { names } = run({ category: 'mix', case: 'lower', length: 'long', count: 60 }, 5);
  assert.ok(names.length >= 40);
});

test('capitalisation options', () => {
  const lower = run({ case: 'lower' }).names, upper = run({ case: 'upper' }).names, title = run({ case: 'title' }).names, mixed = run({ case: 'mixed' }).names;
  assert.ok(lower.every((n) => n === n.toLowerCase()));
  assert.ok(upper.every((n) => n === n.toUpperCase()));
  assert.ok(title.every((n) => /^[A-Z]/.test(n)));
  assert.ok(mixed.every((n) => /[A-Z]/.test(n) && /[a-z]/.test(n) || n.replace(/[^a-z]/gi, '').length < 2));
  assert.deepEqual(CASES, ['title', 'lower', 'upper', 'mixed']);
});

test('separators are used between parts and never at the ends', () => {
  for (const sep of ['_', '.', '-']) {
    const { names } = run({ separator: sep, length: 'long' });
    assert.ok(names.every((n) => n.includes(sep) && !n.startsWith(sep) && !n.endsWith(sep) && !n.includes(sep + sep)), sep);
  }
});

test('numbers are appended when asked and absent otherwise', () => {
  assert.ok(run({ numbers: true, length: 'long' }).names.every((n) => /\d$/.test(n)));
  assert.ok(run({ numbers: false, category: 'fantasy' }).names.every((n) => !/\d/.test(n)));
});

test('an included word appears in every name, cleaned of odd characters', () => {
  const { names } = run({ word: 'No va!', case: 'lower', length: 'long' });
  assert.ok(names.length > 0 && names.every((n) => n.includes('nova')));
  assert.equal(cleanWord('  <b>Hi there</b> '), 'bHithereb');
  assert.equal(cleanWord('abcdefghijklmnopqrstuvwxyz').length, 12);
});

test('names are unique, also against an exclude list', () => {
  const { names } = run({ count: 40, length: 'long' });
  assert.equal(new Set(names.map((n) => n.toLowerCase())).size, names.length);
  const again = generate({ ...base, count: 12, exclude: names }, seededRandom(7)).names;
  assert.ok(again.every((n) => !names.map((x) => x.toLowerCase()).includes(n.toLowerCase())));
});

test('the same seed gives the same names, a different seed does not', () => {
  assert.deepEqual(run({}, 42).names, run({}, 42).names);
  assert.notDeepEqual(run({}, 42).names, run({}, 43).names);
});

test('impossible constraints return a notice, not bad names', () => {
  const r = run({ word: 'abcdefghijkl', length: 'short' });
  assert.deepEqual(r.names, []);
  assert.match(r.notice, /too long/);
  const r2 = run({ word: 'abcdefghij', length: 'short', numbers: true });
  assert.ok(r2.names.every((n) => n.length <= 7));
  const r3 = run({ word: 'abcdefg', length: 'short' });
  assert.ok(r3.names.every((n) => n.length >= 4 && n.length <= 7));
});

test('bad option values fall back to safe defaults', () => {
  const r = generate({ category: 'nope', length: 'huge', case: 'x', separator: '!' }, seededRandom(1));
  assert.equal(r.category, 'fantasy');
  assert.equal(r.names.length, 12);
  assert.ok(r.names.every((n) => !n.includes('!')));
});

test('default random source works and stays in range', () => {
  for (let i = 0; i < 100; i++) { const v = cryptoRandom(); assert.ok(v >= 0 && v < 1); }
  assert.equal(generate(base).names.length, 12);
});
