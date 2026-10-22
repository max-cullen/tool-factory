// Username generator: pure logic, no DOM. Pass your own random source (a function returning a number
// from 0 up to but not including 1) to get repeatable results in tests.
import { WORDS, CATEGORY_IDS, CATEGORY_LABELS } from './words.mjs';

export { CATEGORY_IDS, CATEGORY_LABELS };

/** Length ranges count every character in the finished name, including separators and numbers. */
export const LENGTHS = {
  short: { min: 4, max: 7 },
  medium: { min: 6, max: 10 },
  long: { min: 9, max: 14 },
};
export const CASES = ['title', 'lower', 'upper', 'mixed'];
export const SEPARATORS = ['', '_', '.', '-'];
export const WORD_MAX = 12;

const LEET = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' };

/** Default random source: crypto.getRandomValues, as a number in [0, 1). */
export function cryptoRandom() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

/** Small seeded generator (mulberry32) for tests and repeatable runs. */
export function seededRandom(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Keep letters and digits only, at most WORD_MAX characters. */
export function cleanWord(input) {
  return String(input ?? '').normalize('NFKD').replace(/[^A-Za-z0-9]/g, '').slice(0, WORD_MAX);
}

function applyCase(parts, mode) {
  if (mode === 'lower') return parts.map((p) => p.toLowerCase());
  if (mode === 'upper') return parts.map((p) => p.toUpperCase());
  if (mode === 'mixed') {
    let n = 0;
    return parts.map((p) => [...p].map((ch) => (/[a-z]/i.test(ch) ? (n++ % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()) : ch)).join(''));
  }
  return parts.map((p) => cap(p.toLowerCase()));
}

/** Swap letters for look-alike digits (at most budget.left in the whole name), never a part's first letter. */
function leetify(part, rng, budget) {
  const chars = [...part];
  for (let i = 1; i < chars.length && budget.left > 0; i++) {
    const sub = LEET[chars[i].toLowerCase()];
    if (sub && rng() < 0.4) { chars[i] = sub; budget.left--; }
  }
  return chars.join('');
}

function numberSuffix(rng) {
  const r = rng();
  const len = r < 0.2 ? 1 : r < 0.8 ? 2 : 3;
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(rng() * 10);
  return s;
}

/** The three lists for a category. "mix" pulls from every other category, per name. */
function listsFor(category, rng) {
  if (category === 'mix') {
    const ids = CATEGORY_IDS.filter((c) => c !== 'mix');
    return { first: WORDS[pick(ids, rng)].first, second: WORDS[pick(ids, rng)].second, solo: WORDS[pick(ids, rng)].solo };
  }
  return WORDS[category];
}

function buildCandidate(opts, range, rng) {
  const lists = listsFor(opts.category, rng);
  const sep = opts.separator;
  const gamer = opts.category === 'gamer' || (opts.category === 'mix' && rng() < 0.2);
  let parts;
  let generated; // parts that may be look-alike-swapped
  if (opts.word) {
    const extra = pick([lists.solo, lists.second, lists.first], rng);
    const piece = pick(extra, rng);
    if (piece === opts.word.toLowerCase()) return null;
    parts = rng() < 0.5 ? [opts.word, piece] : [piece, opts.word];
    generated = parts.map((p) => p !== opts.word);
  } else {
    const r = rng();
    const count = sep ? (r < 0.7 ? 2 : 3) : r < 0.2 ? 1 : r < 0.85 ? 2 : 3;
    if (count === 1) parts = [pick(lists.solo, rng)];
    else if (count === 2) parts = [pick(lists.first, rng), pick(lists.second, rng)];
    else parts = [pick(lists.first, rng), pick(rng() < 0.5 ? lists.first : lists.second, rng), pick(lists.second, rng)];
    generated = parts.map(() => true);
  }
  parts = applyCase(parts, opts.case);
  if (gamer && rng() < 0.6) { const budget = { left: 2 }; parts = parts.map((p, i) => (generated[i] ? leetify(p, rng, budget) : p)); }
  if (opts.numbers) parts.push(numberSuffix(rng));
  const name = parts.join(sep);
  return name.length >= range.min && name.length <= range.max ? name : null;
}

/**
 * Make names.
 * options: { category, length, case, separator, word, numbers, count, exclude }
 * Returns { names, category, range, notice }. names never contains an empty or over-length string, and may be
 * shorter than `count` (or empty, with a notice) when the settings leave too little room.
 */
export function generate(options = {}, rng = cryptoRandom) {
  const category = CATEGORY_IDS.includes(options.category) ? options.category : 'fantasy';
  const range = LENGTHS[options.length] || LENGTHS.medium;
  const opts = {
    category,
    case: CASES.includes(options.case) ? options.case : 'title',
    separator: SEPARATORS.includes(options.separator) ? options.separator : '',
    word: cleanWord(options.word),
    numbers: Boolean(options.numbers),
  };
  const count = Math.max(1, Math.min(60, Math.floor(options.count ?? 12)));
  const seen = new Set([...(options.exclude || [])].map((n) => String(n).toLowerCase()));
  const names = [];
  let attempts = 0;
  const limit = 400 + count * 400;
  while (names.length < count && attempts++ < limit) {
    const name = buildCandidate(opts, range, rng);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  let notice = '';
  if (!names.length && opts.word) {
    // The word alone (with numbers if they fit) is better than nothing, if it is within the limit.
    const alone = applyCase([opts.word], opts.case)[0];
    for (const cand of opts.numbers ? [alone + numberSuffix(rng), alone] : [alone]) {
      if (cand.length >= range.min && cand.length <= range.max && !seen.has(cand.toLowerCase())) { names.push(cand); break; }
    }
    if (names.length) notice = 'Only your own word fits these settings.';
  }
  if (!names.length) {
    notice = opts.word && opts.word.length >= range.max - 1
      ? 'Your word is too long for this length. Try Long, or a shorter word.'
      : 'No names fit those settings. Try a longer length, or turn off numbers or the separator.';
  } else if (names.length < count && !notice) {
    notice = 'Only a few names fit those settings.';
  }
  return { names, category, range, notice };
}
