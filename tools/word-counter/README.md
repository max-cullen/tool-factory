# Word Counter

Counts words, characters (with and without spaces), sentences, paragraphs, lines and unique words in text, estimates reading and speaking time, checks a character limit and lists the ten most used words. It runs entirely in the browser.

## Dependencies and licences

None. No npm packages, no vendored files, no network calls. It uses the browser's built-in `Intl.Segmenter` (with a regex fallback), `Worker` and Clipboard API. The page font (Plus Jakarta Sans, SIL OFL 1.1) comes from the shared framework, not from this tool.

## Files

- `site.mjs`: pages, copy, FAQ and the tool's HTML (generates `index.html`).
- `src/count.mjs`: statistics (graphemes, whitespace, lines, paragraphs, words, sentences). Pure; the segmenters are injectable.
- `src/keywords.mjs`: keyword counter and ranking, stop-word list (written for this tool).
- `src/format.mjs`: numbers, durations, limits, copy-stats text.
- `src/worker-core.mjs`: the session used on the page and in the Web Worker (pure, tested in node). `src/worker.js`: the worker entry.
- `src/tool.js`: DOM wiring. `tool.css`: styles only this tool needs.
- `tests/`: `node:test` tests (`npm test` from the repo root).

## Behaviour notes

- Nothing is stored or sent. No cookies, localStorage or sessionStorage; no network requests.
- Text up to 30,000 characters is counted on the main thread; longer text goes to a module Web Worker (`assets/worker.js`) after a debounce, with a "Calculating" state. If a worker cannot start, it is counted on the main thread after showing that state. A newer edit cancels an older job.
- Counting is linear: one scan for characters, whitespace, lines and paragraphs; one for words (shared with the keyword counter); one for sentences. Text is never split into large arrays.
- Words: `Intl.Segmenter` word boundaries, hyphen-joined words merged into one; apostrophes stay in. Regex fallback when `Intl.Segmenter` is missing. Unspaced scripts (CJK, Thai and so on) are estimates.
- Characters: grapheme clusters, so emoji sequences and accented letters count once. Approximate fallback when `Intl.Segmenter` is missing (the page says so).
- Sentences: punctuation rule with a small abbreviation list, initials and list numbers skipped; blank lines also end a sentence. Known to miscount unlisted abbreviations.
- Keyword percentages are of all words, even those hidden by the filters. Ties are broken alphabetically by code unit, so results are deterministic.
- Default speeds: 238 wpm reading, 150 wpm speaking (adjustable, 20 to 1000).
- Ads: `ads.client` is empty and no analytics token is set (placeholders only).

Build: `npm run build -- word-counter`. Preview: `npm run preview -- word-counter`.
