# Image Cropper

Crops one image in the browser: draggable and resizable crop box (mouse, touch and keyboard), ratio presets Free, 1:1, 4:3, 3:2 and 16:9 with a landscape/portrait swap, a live readout in pixels of the original image, and export to PNG, JPG or WebP (quality slider for JPG and WebP). Everything runs client-side: no uploads, no network calls, no cookies or storage.

## Dependencies and licences

**None.** No npm packages, no vendored files, no CDN scripts. Build tooling (Tailwind, a font package) comes from the shared framework, not this tool.

| File | What it does |
| --- | --- |
| `src/crop-math.mjs` | Pure maths: clamping, ratio-locked resize from each handle, minimum size, display-to-source mapping, rounding, keyboard nudging, file naming, 100 megapixel check |
| `src/tool.js` | Browser wiring: file choose/drop/paste, EXIF-aware decode (`createImageBitmap` with `imageOrientation: 'from-image'`, `<img>` fallback), pointer events, canvas export, download |

## Tests

`npm test` from the repo root runs `tests/crop-math.test.mjs` (node:test): ratio locks from all eight handles at five ratios, clamping, minimum size, mapping to source pixels, rounding of odd sizes, orientation swap, keyboard nudging.

## Notes

- Images above 100 megapixels are refused. Very large crops can still fail on browsers with small canvas limits (notably some iPhones); the tool shows a message.
- If a browser cannot encode WebP it returns PNG; the file is named and reported as PNG.
- Ads and analytics: `site.mjs` keeps `ads.client`, every slot and `analytics.cloudflareToken` empty.

## Build

`npm run preview -- image-cropper` (private preview) or `npm run build -- image-cropper`. Output: `tools/image-cropper/dist`. Every browser file is listed in `copy` in `site.mjs`.
