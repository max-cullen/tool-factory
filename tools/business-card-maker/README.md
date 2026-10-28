# Business Card Maker

Designs a business card (front, with an optional simple back) at the standard Australian size of 90 x 55 mm. Six original layouts, colour and font choices, optional logo from the visitor's own device, PNG export at 300 dpi (1063 x 650 px) or screen size, and PDF export at exactly 90 x 55 mm (255.118 x 155.906 pt). Optional 3 mm bleed. Everything runs client-side: no network calls, no upload, no cookies or storage.

## Dependencies and licences

**None.** No npm packages, no vendored files, no CDN scripts, no font files.

| File | What it does |
| --- | --- |
| `src/layouts.mjs` | The six layouts and the back, as pure functions returning draw commands in millimetres; text blocks fitted into regions |
| `src/textfit.mjs` | Wrap, shrink then truncate text to a box, with an injected measure function |
| `src/colour.mjs` | Hex parsing, WCAG-style contrast hint, colour mixing, readable text colour |
| `src/units.mjs` | mm, px and PDF point conversions; card, bleed and safe-area constants |
| `src/pdf.mjs` | Minimal PDF writer (image XObject per page, MediaBox in points, TrimBox for bleed, exact xref offsets) |
| `src/tool.js` | Browser wiring: canvas drawing, form, logo upload, downloads |

Fonts: **system font stacks only** (system sans, Georgia/Times serif, Gill Sans/Calibri/Trebuchet humanist, Courier typewriter). Nothing is fetched and no font files are shipped, so there is no font licence to carry. The framework's own page font comes from the shared framework, not this tool.

PDF image data is compressed in the browser with the built-in `CompressionStream` (zlib/deflate); if the browser lacks it the PDF stores raw RGB (larger but valid).

## Tests

`npm test` from the repo root runs `tests/*.test.mjs` (node:test): unit conversions (1063 x 650, 255.118 x 155.906), text fitting with a fake measure, layout commands for all six layouts and the back with full, sparse, empty and extreme data (everything inside the card and the 4 mm safe margin, bleed variant), colour helpers, and PDF structure (header, xref offsets, stream lengths, MediaBox, TrimBox, two pages).

## Independent PDF check

During development the exported PDFs were opened with `pdfinfo` and `pdftoppm` (poppler) and pypdf, which confirmed page size 90 x 55 mm and that the image renders.

## Ads and analytics

`site.mjs` keeps `ads.client`, every slot and `analytics.cloudflareToken` empty. The owner fills them in at launch.

## Build

`npm run preview -- business-card-maker` (private preview) or `npm run build -- business-card-maker`. Output: `tools/business-card-maker/dist`. Every browser file is listed in `copy` in `site.mjs`.
