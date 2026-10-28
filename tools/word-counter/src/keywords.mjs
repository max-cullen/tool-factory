// Word Counter: keyword counting. Pure; no DOM. Used on the page and inside the Web Worker.
import { codePointLength } from './count.mjs';

// A small English stop-word list written for this tool: very common function words, plus common contractions.
export const STOP_WORDS = new Set(`a about above after again against all also am an and any are aren't as at be because been before being below between
both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have
haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself
just let's me more most my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's
should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this
those through to too under until up us very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who
who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves`.split(/\s+/));

export const DEFAULT_RANK = { top: 10, ignoreStopWords: true, minLength: 1, matchCase: false };

const HAS_LETTER = /\p{L}/u;
const EDGE = /^['’‘\-‐‑_]+|['’‘\-‐‑_]+$/g;

/** Make a word comparable: curly apostrophes become straight, stray edge punctuation is trimmed. */
export function normaliseWord(w) {
  return w.replace(/[’‘]/g, "'").replace(EDGE, '');
}

/** Deterministic order: higher count first, then the word itself in code unit order (not locale dependent). */
export function better(aCount, aWord, bCount, bWord) {
  return aCount !== bCount ? aCount > bCount : aWord < bWord;
}

/** Split text into normalised tokens (helper for tests and simple callers; the page feeds words through add()). */
export function tokenise(words) {
  const out = [];
  for (const w of words) { const k = normaliseWord(w); if (k) out.push(k); }
  return out;
}

export function createCounter() {
  const map = new Map();
  let total = 0;
  return {
    add(word) {
      total++;
      const k = normaliseWord(word);
      if (!k) return;
      map.set(k, (map.get(k) || 0) + 1);
    },
    get total() { return total; },
    /** Distinct words, ignoring case. */
    unique() {
      const s = new Set();
      for (const k of map.keys()) s.add(k.toLowerCase());
      return s.size;
    },
    /** Top words. Percentages are of ALL words in the text, whatever the filters. */
    rank(options = {}) {
      const { top, ignoreStopWords, minLength, matchCase } = { ...DEFAULT_RANK, ...options };
      const folded = new Map();
      for (const [w, c] of map) {
        if (!HAS_LETTER.test(w)) continue;
        const key = matchCase ? w : w.toLowerCase();
        if (minLength > 1 && codePointLength(key) < minLength) continue;
        if (ignoreStopWords && STOP_WORDS.has(key.toLowerCase())) continue;
        folded.set(key, (folded.get(key) || 0) + c);
      }
      const best = [];
      for (const [w, c] of folded) {
        if (best.length === top && !better(c, w, best[top - 1][1], best[top - 1][0])) continue;
        let k = best.length;
        while (k > 0 && better(c, w, best[k - 1][1], best[k - 1][0])) k--;
        best.splice(k, 0, [w, c]);
        if (best.length > top) best.pop();
      }
      return {
        rows: best.map(([word, count]) => ({ word, count, percent: total ? (count / total) * 100 : 0 })),
        totalWords: total,
        distinct: folded.size,
      };
    },
  };
}
