# Image Converter

Converts JPG, PNG and WebP images in the browser using Canvas. Several files at once (drop, picker or paste), output format choice, a quality slider for lossy formats, a background colour for flattening transparency onto JPG, per-file before/after sizes with thumbnails, download singly or all as a ZIP. Everything runs client-side: no uploads, no network calls, no cookies or storage.

## Dependencies and licences

**None.** No npm packages, no vendored files, no CDN scripts. The ZIP writer is written from scratch for this repo.

| File | What it does |
| --- | --- |
| `src/convert-plan.mjs` | Formats and mime/extension mapping, input checks, the 100 megapixel limit, quality and colour handling, output file naming with de-duplication, size text |
| `src/zip.mjs` | CRC-32 and a store-only (no compression) ZIP writer with UTF-8 names and name de-duplication. No Zip64: at most 65,535 files and under 4 GiB |
| `src/tool.js` | Browser wiring: file intake, sequential canvas conversion with progress, WebP support detection, rendering, downloads |

Build tooling (Tailwind, a font package) comes from the shared framework, not this tool.

## Behaviour notes

- Animated GIF or WebP inputs are flattened to one frame. HEIC is not supported and gets a clear message.
- Images above 100 megapixels are refused with a message. Files are converted one at a time, yielding to the page between files.
- WebP output is tested for real at start-up (Safari returns PNG for WebP requests); if unavailable the WebP option is disabled and a note shown.
- Changing a setting re-converts only the files not already converted with the current settings.

## Tests

`npm test` from the repo root runs `tests/*.test.mjs` (node:test): CRC-32 against known values, ZIP structure, name de-duplication, format and extension mapping, input and dimension checks, quality and colour handling, output naming and size text. The ZIP tests also verify the archive with Python's `zipfile` and with `unzip -t`; those two tests are skipped if the tools are missing. They are not runtime dependencies.

## Ads and analytics

`site.mjs` keeps `ads.client`, every slot and `analytics.cloudflareToken` empty. The owner fills them in at launch.

## Build

`npm run preview -- image-converter` (private preview) or `npm run build -- image-converter`. Output: `tools/image-converter/dist`. Every browser file is listed in `copy` in `site.mjs`.
