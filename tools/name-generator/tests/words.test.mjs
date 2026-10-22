import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, CATEGORY_IDS } from '../src/words.mjs';

// Fragments that must never appear in any word or in any joined pair of words.
const BLOCK = ['nigg', 'nigr', 'fag', 'cunt', 'rape', 'rapist', 'porn', 'sexy', 'nazi', 'kkk', 'slut', 'whore', 'dick', 'cock', 'piss', 'shit',
  'fuck', 'twat', 'retard', 'spic', 'chink', 'kike', 'tranny', 'penis', 'vagin', 'boob', 'bitch', 'bastard', 'jihad', 'hitler', 'molest',
  'pedo', 'nude', 'naked', 'jizz', 'kill', 'murder', 'suicide', 'terror', 'cum', 'anus', 'anal', 'coon', 'homo', 'dyke', 'paki', 'gook', 'wop', 'rapey'];
// Real brands, games, characters and platforms we do not want to imply a link to.
const BRANDS = ['nike', 'adidas', 'apple', 'tesla', 'google', 'xbox', 'playstation', 'nintendo', 'pokemon', 'mario', 'zelda', 'sonic', 'fortnite',
  'minecraft', 'roblox', 'twitch', 'steam', 'discord', 'razer', 'corsair', 'valorant', 'halo', 'jedi', 'vader', 'skywalker', 'gandalf', 'hobbit',
  'potter', 'batman', 'marvel', 'disney', 'matrix', 'overwatch', 'reaper', 'starbucks', 'oreo', 'lego'];

const lists = Object.entries(WORDS).flatMap(([cat, ls]) => Object.entries(ls).map(([name, words]) => ({ cat, name, words })));

test('every non-mix category has first, second and solo lists of 40 to 130 entries', () => {
  for (const c of CATEGORY_IDS.filter((x) => x !== 'mix')) {
    for (const n of ['first', 'second', 'solo']) {
      const l = WORDS[c][n];
      assert.ok(Array.isArray(l) && l.length >= 40 && l.length <= 130, `${c}.${n} has ${l?.length}`);
    }
  }
});

test('no duplicates inside a list', () => {
  for (const { cat, name, words } of lists) {
    const dup = words.filter((w, i) => words.indexOf(w) !== i);
    assert.deepEqual(dup, [], `${cat}.${name}`);
  }
});

test('entries are lowercase letters only, 2 to 14 long, no spaces or odd characters', () => {
  for (const { cat, name, words } of lists) for (const w of words) assert.match(w, /^[a-z]{2,14}$/, `${cat}.${name}: "${w}"`);
});

test('no word contains a blocked fragment or a brand', () => {
  for (const { cat, name, words } of lists) for (const w of words) {
    for (const b of BLOCK) assert.ok(!w.includes(b), `${cat}.${name}: "${w}" has "${b}"`);
    for (const b of BRANDS) assert.ok(!w.includes(b), `${cat}.${name}: "${w}" has brand "${b}"`);
  }
});

test('no joined combination the generator can make forms a blocked fragment', () => {
  const bad = new RegExp(BLOCK.join('|'));
  const ids = CATEGORY_IDS.filter((x) => x !== 'mix');
  // The generator joins first + second, or first + (first or second) + second. Mix pairs lists across categories.
  for (const x of ids) for (const y of ids) {
    const F = WORDS[x].first, S = WORDS[y].second;
    for (const a of F) for (const b of S) {
      assert.ok(!bad.test(a + b), `"${a}"+"${b}"`);
      for (const m of [...F, ...S]) assert.ok(!bad.test(a + m + b), `"${a}"+"${m}"+"${b}"`);
    }
  }
});
