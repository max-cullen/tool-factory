# Fitpic (image compressor)

Fits a photo to an exact file size in KB or to exact pixels. Fully client-side: the photo is read, resized and re-encoded in the visitor's browser with the Canvas API and is never uploaded. Live at `https://usefitpic.com`. Built by the shared framework (`/framework`) into a small static site; it also builds FitReel into `/instagram/` (`include` in `site.mjs`).

## Folder layout
```
manifest.json       name, slug (fitpic), description, keywords, url (read by the tool index)
site.mjs            pages, copy, FAQ, tool markup, footer; generates all HTML at build time
styles.css, tool.css  Tailwind entry and this tool's styles
src/tool.js         browser UI wiring (copied to dist/assets/tool.js)
engine/engine.js    the fitting engine, a plain ES module (copied to dist/assets/engine/)
engine/vendor/      heic2any.min.js and its licence file (loaded only for HEIC photos)
icons/              favicon and app icons
tests/              node:test tests, run by `npm test` (no browser needed)
test/               older Python + Playwright suite (real Chromium, real encoders)
```

## Build and test (from the repo root)
```
npm test                       # all node tests, including tools/fitpic/tests/*.test.mjs
npm run preview -- fitpic      # private preview (noindex) -> tools/fitpic/dist
npm run build -- fitpic        # production build -> tools/fitpic/dist
```
Browser suite (needs `pip install playwright pillow numpy pillow-heif && playwright install chromium`), from `tools/fitpic`:
```
python3 -I test/make_fixtures.py test/fixtures
python3 -I test/run_tests.py . /tmp/engine_out
python3 -I test/site_test.py dist test/fixtures /tmp/site_out   # after a preview build
```
`tests/engine.test.mjs` imports the real `engine/engine.js` in node with a stubbed `OffscreenCanvas` (encoded size modelled from pixels and quality). It covers the KB convention (maximum = KB x 1000, minimum = KB x 1024), format sniffing, file names, byte formatting, option validation, the "already fits" path, quality and scale search, pixel handling, padding to a minimum, and abort. It cannot cover real JPEG/WebP/PNG encoders, EXIF rotation, `createImageBitmap` or HEIC decoding; the Playwright suite covers those. `tests/site.test.mjs` renders every page in memory and checks title, description, canonical, one h1, 300+ words, How it works, FAQ and its JSON-LD, footer links, internal links, robots/noindex, no analytics token, no ad id other than the one already in `site.mjs`, and no third-party loads.

## Dependencies and licences
Nothing is installed at runtime. Everything shipped is committed in this folder or embedded at build time.

| Item | Where | Licence | Used |
| --- | --- | --- | --- |
| heic2any (Alex Corvi, 2020) | `engine/vendor/heic2any.min.js` (1.3 MB) | MIT (`engine/vendor/heic2any.LICENSE.md`) | Browser, only for HEIC/HEIF photos |
| libheif (bundled inside heic2any.min.js) | same file | LGPL (see below) | Browser, only for HEIC/HEIF photos |
| Plus Jakarta Sans via `@fontsource-variable/plus-jakarta-sans` 5.3.0 | npm devDependency; latin subset embedded in the CSS at build time | SIL Open Font License 1.1 | Build time; ships inside the page CSS |
| Tailwind CSS 4.3.3 and `@tailwindcss/cli` 4.3.3 | npm devDependencies | MIT | Build tool only, nothing shipped |
| Google AdSense script | `pagead2.googlesyndication.com`, added by the framework when an ad client id is set | Third-party service, not a dependency | Browser, production pages only |

### Needs the owner's decision: libheif is LGPL
The vendored heic2any file bundles libheif (the `HeifDecoder` code is visible in the minified file). libheif is LGPL, which is outside the "MIT, BSD or Apache-2.0 only" rule. Facts checked:
- `engine/vendor/heic2any.LICENSE.md` is only the MIT text for heic2any itself. No libheif or LGPL licence text is shipped, and the minified file contains no LGPL notice. The About page credits libheif as LGPL and links to its source.
- It is loaded only for HEIC: `loadHeicLib()` in `engine.js` is called only from `heicToPngBlob()`, which `loadImage()` calls only when the file signature is HEIC. `src/tool.js` never references it, and no page includes it as a script. JPG, PNG and WebP visitors never download it.
- It is a separate, unmodified file served as-is, so it can be replaced.
Options: keep it with the LGPL text and libheif source link added beside it; swap for a permissive decoder; or drop HEIC (iPhones can export JPEG). Nothing has been changed.

## Other facts
- Network use in this folder's code: one same-origin `fetch` in `src/tool.js` for an optional example photo, which is switched off (`data-sample="off"`) and not in the build. No XHR, beacon, WebSocket, cookies, localStorage, sessionStorage or IndexedDB. The framework's `site.js` has none either.
- Ads: `site.mjs` holds a real AdSense publisher id committed before the placeholder rule; all slot ids and the analytics token are empty.
