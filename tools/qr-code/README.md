# QR Code Generator

Makes Text, URL, Wi-Fi and Contact (vCard 3.0) QR codes in the browser. PNG and SVG download, colours, size, margin, error-correction level L/M/Q/H. Everything runs client-side: no network calls, no upload, no cookies or storage.

## Dependencies and licences

**None.** No npm packages, no vendored files, no CDN scripts. The encoder is written from scratch for this repo:

| File | What it does |
| --- | --- |
| `src/qr.mjs` | QR encoder: versions 1-40, levels L/M/Q/H, numeric/alphanumeric/byte modes, Reed-Solomon over GF(256), 8 masks with penalty scoring, format and version information |
| `src/payloads.mjs` | Text, URL normalisation, Wi-Fi (`WIFI:T:...;S:...;P:...;H:...;;` with escaping), vCard 3.0 (escaping, CRLF, 75-octet folding) |
| `src/render.mjs` | SVG string, pixel grid and canvas drawing at an exact size and margin |
| `src/contrast.mjs` | Hex parsing and a WCAG-style contrast check for scan reliability |
| `src/tool.js` | Browser wiring (preview, validation, downloads) |

Build tooling (Tailwind, a font package) comes from the shared framework, not this tool.

## Tests

`npm test` from the repo root runs `tests/*.test.mjs` (node:test): Reed-Solomon against a known worked example, format and version information against known values, the full capacity table for all 160 version/level pairs, matrix size per version, alignment positions, determinism, payload escaping and formats, rendering and contrast.

## Decoding cross-check

During development the encoder was checked with two independent decoders (OpenCV's QR detector and zxing-cpp, kept outside this repo): text (including UTF-8), URL, Wi-Fi with escaped characters, vCard, numeric and alphanumeric data, all four levels, and a code at every version 1-40 at every level (160 codes filled close to capacity). Every code decoded to the original text. That check found and fixed one wrong table entry (version 27, level H).

## Trademark

"QR Code" is a registered trademark of Denso Wave Incorporated. This tool is independent and not affiliated with Denso Wave. The page footer says so.

## Ads and analytics

`site.mjs` keeps `ads.client`, every slot and `analytics.cloudflareToken` empty. The owner fills them in at launch.

## Build

`npm run preview -- qr-code` (private preview) or `npm run build -- qr-code`. Output: `tools/qr-code/dist`. Every browser file is listed in `copy` in `site.mjs`.
