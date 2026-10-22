# Image Resizer

Resizes one or many images by pixels or percent in the browser. Aspect-ratio lock, common pixel sizes, stretch / fit / fill, PNG, JPG or WebP export with a quality slider, before and after sizes, per-file download. Everything runs client-side: no uploads, no network calls, no cookies or storage.

## Dependencies and licences

**None.** No npm packages, no vendored files, no CDN scripts. Build tooling (Tailwind, fonts) comes from the shared framework.

| File | What it does |
| --- | --- |
| `src/resize-math.mjs` | Pure maths: ratio locking, percent, rounding, fit/fill/stretch placement, step-down plan, limits (100 MP source, 16,384 px side, 100 MP result), naming |
| `src/tool.js` | Browser wiring: file handling, canvas drawing (high-quality smoothing, step-down halving), downloads |

## Tests

`npm test` runs `tests/resize-math.test.mjs` (node:test).

## Notes

Presets are plain pixel sizes with neutral labels. The saved files carry no dpi metadata; the page says so. Ads and analytics ids in `site.mjs` are empty for the owner to fill at launch.
