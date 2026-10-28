import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, makeSegmenters, countSentences, fallbackGraphemes, codePointLength } from '../src/count.mjs';

const seg = makeSegmenters();
const none = { word: null, grapheme: null };
const run = (t, s = seg) => analyse(t, s);
const words = (t, s = seg) => { const out = []; analyse(t, { ...s, onWord: (w) => out.push(w) }); return out; };

test('Intl.Segmenter is available in this node', () => assert.ok(seg.word && seg.grapheme));

test('empty string gives zeros everywhere', () => {
  const r = run('');
  assert.deepEqual([r.words, r.characters, r.charactersNoSpaces, r.sentences, r.paragraphs, r.lines, r.avgWordLength], [0, 0, 0, 0, 0, 0, 0]);
});

test('whitespace only: characters but no words, sentences or paragraphs', () => {
  const r = run('   \t \n  \n');
  assert.equal(r.words, 0);
  assert.equal(r.sentences, 0);
  assert.equal(r.paragraphs, 0);
  assert.equal(r.characters, 9);
  assert.equal(r.charactersNoSpaces, 0);
  assert.equal(r.lines, 3);
});

test('single word', () => {
  const r = run('Hello');
  assert.deepEqual([r.words, r.characters, r.charactersNoSpaces, r.sentences, r.paragraphs, r.lines, r.avgWordLength], [1, 5, 5, 1, 1, 1, 5]);
});

test('punctuation is not a word and does not count as word length', () => {
  assert.equal(run('Hello, world! ... ?!').words, 2);
  assert.equal(run('--- *** ---').words, 0);
  assert.equal(run('Hello, world!').avgWordLength, 5);
});

test('apostrophes (straight and curly) stay inside words', () => {
  assert.deepEqual(words("don't can’t it's O'Brien's"), ["don't", 'can’t', "it's", "O'Brien's"]);
  assert.equal(run("'quoted' words").words, 2);
});

test('hyphenated words are one word; spaced and em dashes separate', () => {
  assert.deepEqual(words('a well-known state-of-the-art COVID-19 case'), ['a', 'well-known', 'state-of-the-art', 'COVID-19', 'case']);
  assert.equal(run('one - two').words, 2);
  assert.equal(run('one—two').words, 2);
  assert.equal(run('end- ').words, 1);
  assert.equal(run('a--b').words, 2);
});

test('numbers with separators are single words', () => {
  assert.deepEqual(words('pay $1,234.56 for 3.14 pies'), ['pay', '1,234.56', 'for', '3.14', 'pies']);
});

test('regex fallback agrees with Intl.Segmenter on ordinary English', () => {
  const t = "It's a well-known fact — isn’t it? 3.14 and 1,000 are numbers; so is COVID-19. Tea & biscuits.";
  assert.deepEqual(words(t, none), words(t, seg));
  assert.equal(run(t, none).words, run(t, seg).words);
});

test('paragraphs are blocks separated by blank lines; lines count line breaks', () => {
  const r = run('First para\nstill first\n\nSecond para\n\n\n\nThird');
  assert.equal(r.paragraphs, 3);
  assert.equal(r.paragraphLines, 4);
  assert.equal(r.lines, 8);
});

test('whitespace-only lines count as blank; CRLF and CR are single line breaks', () => {
  assert.equal(run('a\n   \nb').paragraphs, 2);
  const r = run('a\r\nb\r\n\r\nc');
  assert.equal(r.lines, 4);
  assert.equal(r.paragraphs, 2);
  assert.equal(r.characters, 6); // a, CRLF, b, CRLF, CRLF, c
});

test('lone carriage returns break lines too', () => {
  assert.equal(run('a\rb\rc').lines, 3);
});

test('trailing newline adds an (empty) last line, like a text editor', () => {
  assert.equal(run('a\n').lines, 2);
  assert.equal(run('a\n').paragraphs, 1);
});

test('characters with and without spaces', () => {
  const r = run('ab cd\tef\ngh');
  assert.equal(r.characters, 11);
  assert.equal(r.charactersNoSpaces, 8);
});

test('emoji and combining characters count as one character each', () => {
  assert.equal(run('\u{1F600}').characters, 1);
  assert.equal(run('\u{1F468}‍\u{1F469}‍\u{1F467}').characters, 1); // family
  assert.equal(run('\u{1F1E6}\u{1F1FA}').characters, 1); // flag
  assert.equal(run('é').characters, 1); // e + combining acute
  assert.equal(run('café café').characters, 9);
  assert.equal(run('\u{1F44D}\u{1F3FD}').characters, 1); // skin tone
  assert.equal(run('a \u{1F600} b').charactersNoSpaces, 3);
});

test('a combining mark after a space or at the start does not break the count', () => {
  assert.equal(run('́').characters, 1);
  assert.equal(run('a ́b').characters, 3);
  assert.equal(run('x\ńy').characters, 4);
});

test('emoji are not words, and a word next to an emoji still counts', () => {
  assert.equal(run('\u{1F600}\u{1F600}').words, 0);
  assert.equal(run('hi\u{1F600}there').words, 2);
});

test('fallback graphemes (no Intl.Segmenter) handle marks, ZWJ, flags and skin tones', () => {
  assert.equal(run('é', none).characters, 1);
  assert.equal(run('\u{1F468}‍\u{1F469}‍\u{1F467}', none).characters, 1);
  assert.equal(run('\u{1F1E6}\u{1F1FA}\u{1F1E6}\u{1F1FA}', none).characters, 2);
  assert.equal(run('\u{1F44D}\u{1F3FD}', none).characters, 1);
  assert.equal(run('hello world', none).charactersNoSpaces, 10);
  assert.ok(run('x', none).approximate);
  assert.ok(!run('x', seg).approximate);
  assert.deepEqual(fallbackGraphemes('a\r\nb'), ['a', '\r\n', 'b']);
});

test('CJK: words come from the dictionary segmenter, characters are counted one by one', () => {
  const r = run('今日は天気がいいですね。');
  assert.equal(r.characters, 12);
  assert.ok(r.words >= 3 && r.words <= 8, `words=${r.words}`);
  assert.ok(r.unspacedScript);
  assert.equal(r.sentences, 1);
  assert.ok(!run('plain English text').unspacedScript);
});

test('CJK without a word segmenter falls back to runs of letters (one "word" per unbroken run)', () => {
  assert.equal(run('今日は天気', none).words, 1);
});

test('non-Latin scripts with spaces count normally', () => {
  assert.equal(run('Привет мир, как дела?').words, 4);
  assert.equal(run('مرحبا بالعالم').words, 2);
});

test('sentences: terminators, closing quotes, runs and the unterminated last sentence', () => {
  assert.equal(countSentences('One. Two! Three? Four'), 4);
  assert.equal(countSentences('He said "stop." Then left.'), 2);
  assert.equal(countSentences('Really?! Yes!!'), 2);
  assert.equal(countSentences('No end'), 1);
  assert.equal(countSentences(''), 0);
  assert.equal(countSentences('... ?!'), 0);
});

test('sentences: decimals, web addresses and version numbers do not split', () => {
  assert.equal(countSentences('Pi is 3.14 and the site is www.example.com.au today. Done.'), 2);
});

test('sentences: common abbreviations and initials do not end a sentence', () => {
  assert.equal(countSentences('Dr. Smith met Mr. Jones and Mrs. Lee at St. Mary’s. They talked.'), 2);
  assert.equal(countSentences('J. R. R. Tolkien wrote it. Good.'), 2);
  assert.equal(countSentences('Bring pens, paper, etc. and a ruler. Thanks.'), 2);
  assert.equal(countSentences('Use fruit, e.g. apples. Fine.'), 2);
});

test('sentences: known limitation, an abbreviation at the end of a sentence or an unlisted one is miscounted', () => {
  // "etc." before a capital is treated as a sentence end (correct here), but "Pty. Ltd." style or unlisted abbreviations over-split.
  assert.equal(countSentences('We met on Sept. 5 at noon.'), 2);
  assert.equal(countSentences('Ask Prof. Lee.'), 1);
});

test('sentences: numbered list items and blank lines', () => {
  assert.equal(countSentences('1. Buy milk\n2. Post letter\n3. Call Sam'), 1); // one unpunctuated run of list lines
  assert.equal(countSentences('Title\n\nBody text here.'), 2);
  assert.equal(countSentences('First.\n\n\n\nSecond.'), 2);
});

test('sentences: ellipsis followed by lower case carries on, by a capital ends', () => {
  assert.equal(countSentences('Well... maybe so.'), 1);
  assert.equal(countSentences('Well... Maybe so.'), 2);
  assert.equal(countSentences('Wait… what?'), 1);
});

test('sentences: CJK terminators need no space', () => {
  assert.equal(countSentences('今日は晴れ。明日は雨！そう？'), 3);
});

test('codePointLength counts astral characters once', () => {
  assert.equal(codePointLength('a\u{1F600}b'), 3);
  assert.equal(codePointLength(''), 0);
});

test('average word length', () => {
  assert.equal(run('aa bbbb').avgWordLength, 3);
  assert.equal(run("don't").avgWordLength, 5);
});

test('performance: 2 million characters finish well inside a generous limit', () => {
  const base = "The quick brown fox, isn’t it? Well-known results — see Dr. Smith's report.\n\n3.14 is pi! Café naïve \u{1F600} \u{1F468}‍\u{1F469}‍\u{1F467} ";
  const text = base.repeat(Math.ceil(2_000_000 / base.length));
  assert.ok(text.length >= 2_000_000);
  const t0 = performance.now();
  const r = run(text);
  const ms = performance.now() - t0;
  assert.ok(r.words > 300_000 && r.sentences > 20_000 && r.paragraphs > 10_000);
  assert.ok(ms < 8000, `took ${ms.toFixed(0)} ms`);
});

test('performance: 2 million characters of CJK and of one unbroken line', () => {
  const cjk = '今日は天気がいいですね。'.repeat(190_000);
  let t0 = performance.now();
  run(cjk);
  assert.ok(performance.now() - t0 < 10000);
  const line = 'x'.repeat(2_000_000);
  t0 = performance.now();
  const r = run(line);
  assert.equal(r.words, 1);
  assert.equal(r.characters, 2_000_000);
  assert.ok(performance.now() - t0 < 5000);
});
