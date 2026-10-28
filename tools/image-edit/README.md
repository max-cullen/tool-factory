# Image Editor

Rotate and flip a picture, adjust brightness, contrast, greyscale, sepia and blur with a live preview, and save as PNG, JPG or WebP. Everything runs client-side: no uploads, no network calls, no cookies or storage.

## Dependencies and licences

**None.** No npm packages, no vendored files, no CDN scripts. Build tooling (Tailwind, a font package) comes from the shared framework.

| File | What it does |
| --- | --- |
| `src/filters.mjs` | Pixel maths on RGBA arrays: brightness, contrast, greyscale, sepia, separable box blur (two passes, alpha-weighted), flatten on white |
| `src/transform.mjs` | Rotate and flip on pixel arrays, size maths, button state logic |
| `src/pipeline.mjs` | Settings rules, order of operations (rotate, flip, brightness, contrast, greyscale, sepia, blur), 100 MP limit, preview size, export options |
| `src/sniff.mjs` | Reads PNG, JPEG and WebP size from the header so a huge file is refused before decoding |
| `src/tool.js` | Browser wiring: file drop, preview, download |

The preview (downscaled copy) and the full-size export call the same `render()` function. The CSS/canvas `filter` property is not used.

## Tests

`npm test` runs `tests/*.test.mjs` (node:test): known pixel values per filter, neutral identity, clamping, rotate x4 and flip x2 identity, blur on flat areas and brightness conservation, pipeline order, preview vs export equivalence, size limit, export options, header sniffing.

Browser check (Python Playwright, not in the repo): export of PNG, JPG and WebP, swapped dimensions after rotation, pixel values per control, reset, EXIF orientation, 100 MP refusal, no network requests, no console errors, 375 and 1280 px. It also confirmed that a JPEG containing GPS, camera and date metadata came out as PNG, JPG and WebP with none of it.

## Ads and analytics

`site.mjs` keeps `ads.client`, every slot and `analytics.cloudflareToken` empty.

## Build

`npm run preview -- image-edit` or `npm run build -- image-edit`. Output: `tools/image-edit/dist`.
