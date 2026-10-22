// Word Counter: pure counting logic. No DOM, no globals except Intl (injectable), so it runs in node and in a Web Worker.
//
// One linear pass over the text gives characters (user-perceived, i.e. grapheme clusters), whitespace, lines and
// paragraphs. Words come from a second linear pass (Intl.Segmenter, or a regex fallback) that hands each word to an
// optional callback, so the keyword counter can share it. Sentences use a third linear regex scan. Nothing is split into
// large arrays, so memory stays small for multi-million character input.

export const HYPHENS = new Set(['-', '‐', '‑']);

/** Whitespace as this tool defines it (matches JavaScript's \s, which is also what most users expect). */
export function isWhitespaceCode(c) {
  return c === 32 || (c >= 9 && c <= 13) || c === 0xa0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200a) ||
    c === 0x2028 || c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000 || c === 0xfeff;
}

/** Build the segmenters. `IntlLike` is injectable for tests; returns nulls when Intl.Segmenter is missing. */
export function makeSegmenters(IntlLike = globalThis.Intl) {
  try {
    if (!IntlLike || typeof IntlLike.Segmenter !== 'function') return { word: null, grapheme: null };
    return {
      word: new IntlLike.Segmenter(undefined, { granularity: 'word' }),
      grapheme: new IntlLike.Segmenter(undefined, { granularity: 'grapheme' }),
    };
  } catch {
    return { word: null, grapheme: null };
  }
}

/** Length in code points (so an emoji outside the BMP is 1, not 2). */
export function codePointLength(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xdc00 && c <= 0xdfff && i > 0) {
      const p = s.charCodeAt(i - 1);
      if (p >= 0xd800 && p <= 0xdbff) continue;
    }
    n++;
  }
  return n;
}

/* ---------------- graphemes ---------------- */

const JOINER = /^[\p{M}‍️︎\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]$/u;

/** Approximate grapheme splitting for engines without Intl.Segmenter. Joins marks, ZWJ sequences, flags, skin tones. */
export function fallbackGraphemes(s) {
  const out = [];
  let joinNext = false;
  let regional = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const isRegional = cp >= 0x1f1e6 && cp <= 0x1f1ff;
    if (out.length && (joinNext || JOINER.test(ch) || (isRegional && regional % 2 === 1) || (ch === '\n' && out[out.length - 1] === '\r'))) {
      out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
    joinNext = cp === 0x200d;
    regional = isRegional ? regional + 1 : 0;
  }
  return out;
}

/* ---------------- words ---------------- */

const WORD_RE = /[\p{L}\p{N}\p{M}_]+(?:(?:['’‘\-‐‑]|(?<=\d)[.,](?=\d))[\p{L}\p{N}\p{M}_]+)*/gu;

/**
 * Call `cb(word)` for every word. Hyphenated compounds ("well-known", "COVID-19") are one word; apostrophes
 * (straight or curly) stay inside the word; dashes with spaces and em/en dashes separate words.
 */
export function eachWord(text, wordSegmenter, cb) {
  if (!wordSegmenter) {
    for (const m of text.matchAll(WORD_RE)) cb(m[0]);
    return;
  }
  let pending = null;
  let hyphen = null;
  for (const { segment, isWordLike } of wordSegmenter.segment(text)) {
    if (isWordLike) {
      if (pending !== null) {
        if (hyphen !== null) { pending += hyphen + segment; hyphen = null; continue; }
        cb(pending);
      }
      pending = segment;
    } else if (pending !== null && hyphen === null && HYPHENS.has(segment)) {
      hyphen = segment;
    } else if (pending !== null) {
      cb(pending);
      pending = null;
      hyphen = null;
    }
  }
  if (pending !== null) cb(pending);
}

/* ---------------- sentences ---------------- */

// Abbreviations whose full stop does not end a sentence (compared in lower case, without the final full stop).
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'mx', 'dr', 'prof', 'sr', 'jr', 'st', 'mt', 'vs', 'no', 'nos', 'e.g', 'i.e', 'approx',
  'inc', 'ltd', 'co', 'pty', 'dept', 'fig', 'gen', 'col', 'capt', 'sgt', 'rev', 'hon', 'cf', 'ca', 'est', 'al', 'ave', 'rd', 'govt', 'cnr']);
// Ends a sentence only when followed by a capital letter or nothing ("and so on. The next...").
const WEAK_ABBREVIATIONS = new Set(['etc']);

// A boundary is a run of full stops / ! / ? (or an ellipsis) followed by optional closing marks and then whitespace or the end;
// a CJK terminator (which needs no space); or a blank line.
const BOUNDARY = /[.!?…]+[)\]}"'”’»]*(?=\s|$)|[。！？｡]+[」』）)”’]*|\n\s*\n/gu;
const HAS_CONTENT = /[\p{L}\p{N}]/u;
const TRAILING_TOKEN = /([\p{L}][\p{L}.]*|\p{N}+)$/u;

export function countSentences(text) {
  let count = 0;
  let last = 0;
  BOUNDARY.lastIndex = 0;
  let m;
  while ((m = BOUNDARY.exec(text)) !== null) {
    const run = m[0];
    const end = m.index + run.length;
    if (run.charCodeAt(0) === 10) { // blank line: always a boundary
      if (HAS_CONTENT.test(text.slice(last, m.index))) count++;
      last = end;
      continue;
    }
    if (run.charCodeAt(0) === 0x2e && /^\.[)\]}"'”’»]*$/.test(run)) { // a single full stop: check abbreviations, initials, list numbers
      const before = text.slice(Math.max(last, m.index - 14), m.index);
      const t = TRAILING_TOKEN.exec(before);
      if (t) {
        const tok = t[1];
        const lower = tok.toLowerCase();
        const tokStart = m.index - tok.length;
        const next = /\S/.exec(text.slice(end, end + 8));
        if (ABBREVIATIONS.has(lower)) continue;
        if (WEAK_ABBREVIATIONS.has(lower) && next && !/[\p{Lu}]/u.test(next[0])) continue;
        if (tok.length === 1 && /\p{Lu}/u.test(tok) && (tokStart === 0 || /\s/.test(text[tokStart - 1]))) continue; // initials such as "J. R. Smith"
        if (/^\p{N}+$/u.test(tok) && (tokStart <= last || /\n[^\S\n]*$/.test(text.slice(Math.max(0, tokStart - 40), tokStart)))) continue; // "1. First item"
      }
    } else if (/^[.…]{2,}|^…/.test(run)) { // ellipsis followed by lower case carries on
      const next = /\S/.exec(text.slice(end, end + 4));
      if (next && /\p{Ll}/u.test(next[0])) continue;
    }
    if (HAS_CONTENT.test(text.slice(last, m.index))) count++;
    last = end;
  }
  if (HAS_CONTENT.test(text.slice(last))) count++;
  return count;
}

/* ---------------- main entry ---------------- */

const UNSPACED_SCRIPT = /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-໿က-႟ក-៿]/;

/**
 * Analyse `text`. Options:
 *   word, grapheme: Intl.Segmenter-like objects (or null for the regex / code point fallbacks). See makeSegmenters().
 *   onWord(word): called for each word as it is found (the keyword counter hooks in here).
 */
export function analyse(text, opts = {}) {
  const { word: wordSeg = null, grapheme: graphSeg = null, onWord = null } = opts;
  const n = text.length;
  let graphemes = 0;
  let spaces = 0;
  let lines = n ? 1 : 0;
  let paragraphs = 0;
  let nonEmptyLines = 0;
  let inPara = false;
  let lineHas = false;
  let prev = 0;

  const content = () => {
    if (!lineHas) {
      lineHas = true;
      nonEmptyLines++;
      if (!inPara) { paragraphs++; inPara = true; }
    }
  };
  const breakLine = () => {
    lines++;
    if (!lineHas) inPara = false;
    lineHas = false;
  };

  for (let i = 0; i < n; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x300) {
      graphemes++;
      if (c === 32 || (c >= 9 && c <= 13) || c === 0xa0) {
        spaces++;
        if (c === 10) {
          if (prev === 13) { graphemes--; spaces--; } else breakLine(); // CRLF is one character and one line break
        } else if (c === 13) {
          breakLine();
        }
      } else {
        content();
      }
      prev = c;
      continue;
    }
    // A run of characters that may combine or sit outside the basic range (accents, emoji, CJK, Arabic...): segment it.
    let j = i + 1;
    while (j < n && text.charCodeAt(j) >= 0x300) j++;
    let start = i;
    if (i > 0 && prev < 0x300 && prev !== 10 && prev !== 13) {
      // The previous character may be the base of a combining mark: take it back and let the segmenter decide.
      start = i - 1;
      graphemes--;
      if (isWhitespaceCode(prev)) spaces--;
    }
    const chunk = text.slice(start, j);
    const parts = graphSeg ? null : fallbackGraphemes(chunk);
    if (graphSeg) {
      for (const { segment } of graphSeg.segment(chunk)) {
        graphemes++;
        if (isWhitespaceCode(segment.charCodeAt(0))) spaces++; else content();
      }
    } else {
      for (const g of parts) {
        graphemes++;
        if (isWhitespaceCode(g.charCodeAt(0))) spaces++; else content();
      }
    }
    prev = text.charCodeAt(j - 1);
    i = j - 1;
  }

  let words = 0;
  let wordChars = 0;
  eachWord(text, wordSeg, (w) => {
    words++;
    wordChars += codePointLength(w);
    if (onWord) onWord(w);
  });

  return {
    words,
    characters: graphemes,
    charactersNoSpaces: graphemes - spaces,
    sentences: countSentences(text),
    paragraphs,
    paragraphLines: nonEmptyLines,
    lines,
    avgWordLength: words ? wordChars / words : 0,
    unspacedScript: UNSPACED_SCRIPT.test(text),
    approximate: !graphSeg || !wordSeg, // true when the browser lacks Intl.Segmenter and fallbacks were used
  };
}
