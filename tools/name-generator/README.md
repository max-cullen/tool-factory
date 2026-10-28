# Username Generator

Makes usernames and gamer tags in six styles (fantasy, sci-fi, cute, edgy, gamer tag, mix) entirely in the browser.

## Dependencies and licences

None. No npm packages, no vendored files, no network calls. The page font (Plus Jakarta Sans, SIL OFL 1.1) comes from the shared framework, not from this tool.

## Files

- `site.mjs`: pages, copy, FAQ and the tool's HTML (generates `index.html`).
- `src/words.mjs`: the word lists. `src/generate.mjs`: the generator (pure, no DOM, injectable random source). `src/tool.js`: the browser wiring.
- `tests/`: `node:test` tests for the generator and the word lists (`npm test` from the repo root).
- `tool.css`: styles only this tool needs.

## How the word lists were made

Written by hand for this tool (by Claude, in this repository). They were not copied from any other site, generator, dictionary or dataset. Each style has three lists: starts (`first`), endings (`second`) and complete short names (`solo`), 50 to 85 entries each, lowercase letters only.
Rules applied: nothing sexual, hateful, extremist or graphic; no real brands, games or characters; nothing aimed at children. `tests/words.test.mjs` enforces the list shape (no duplicates, no spaces or odd characters), a blocklist of unwanted fragments and brand names, and scans every first+second and first+middle+second combination (including cross-style Mix pairs) for blocked fragments. Several words were removed during that scan because they formed unwanted strings when joined.

## Behaviour notes

- Nothing is stored or sent. Favourites live in page memory only (no cookies, localStorage or sessionStorage).
- The random source defaults to `crypto.getRandomValues`.
- Name length counts every character, including separators and numbers.
- Names are not checked against any platform.
- Ads: `ads.client` is empty and no analytics token is set (placeholders only).

Build: `npm run build -- name-generator`. Preview: `npm run preview -- name-generator`.
