# QR Code Generator: design notes (pilot pattern)

## Page order (home, `site.mjs`)
1. `hero()` with h1, lead, trust items; the tool is passed as `after`.
2. `adSlot('below-tool')`
3. `#how` How it works: `howCards()` (numbered `.card.qr-how`, 3 steps). Linked from the header nav.
4. "Four kinds of code": `.qr-kinds` grid of `.card.qr-kind` (icon, title, one line).
5. Content section: `.wrap.grid.md:grid-cols-2`. Left: h2 + paragraphs (main 300+ words go here). Right: `.card` with the anatomy SVG and a tips list.
6. `adSlot('mid')`
7. FAQ: `sectionHead('Questions')` + `faqHtml(COPY.faq)` in `.wrap-narrow`.
All placeholder text sits in the `COPY` object at the top of `site.mjs`, marked `TODO(copy)`.

## Tool shell
`section#tool.tool.qr-tool[data-tool][data-type]` has three grid areas:
- `.panel.qr-input` step 1 Content: `.qr-tabs[role=tablist]` + four `form.qr-form[role=tabpanel][data-form]`.
- `.stage.qr-stage` preview: `.qr-frame` (square, max 340px) > `.qr-preview`, veils, status, facts, meter, download buttons, "never expire" note. Sticky on desktop.
- `form.panel.qr-look` step 2 Style: colours, contrast hint, size, margin, error correction.
Phone order: Content, Preview, Style. Desktop (>= 920px): Content over Style on the left, preview in a 404px right column.
Field helper `f()` renders `.qr-f` > `.lbl-row` + `.field` + optional `.hint` + `p.qr-err[data-error-for=<input id>]`.
Reused framework classes: `.seg`, `.field`, `.check`, `.chip`, `.note`, `.btn-*`, `.card`, `.hint`. New ones are all `qr-*` (plus `.range`, copied from FitReel).

## Data hooks
Root: `[data-tool]`; `data-type` mirrors the active tab. Root classes `is-empty` / `is-invalid` dim the preview.
- Tabs: `[data-type-tabs]`, `[data-type-tab="text|url|wifi|vcard"]` (aria-selected, roving tabindex). Stub fires `qr:type` on root.
- Forms: `[data-form="text|url|wifi|vcard"]`. Inputs: `[data-field=...]`:
  text: `text`; url: `url`; wifi: `ssid`, `password`, `hidden` (checkbox), security radios `name="security"` (WPA, WEP, nopass) inside `[data-wifi-security]`;
  vcard: `first`, `last`, `phone`, `email`, `org`, `website`, `street`, `city`, `region`, `postcode`, `country`.
- Text counter: `[data-count]` (add `.is-near` near the limit). Password eye: `[data-pw-toggle]` (wired in stub).
- Field errors: `[data-error-for="<input id>"]` (hidden by default); add `.is-bad` to the `.field`.
- Appearance form: `[data-appearance]`. `[data-fg]`, `[data-bg]` (type=color), `[data-fg-hex]`, `[data-bg-hex]` (text; `.is-bad` if invalid), `[data-swap]`.
- Contrast: `[data-contrast]` with class `is-good|is-warn|is-bad`, text in `[data-contrast-text]`.
- `[data-size]` (range 128-2048 px, step 32) + `[data-size-out]`; `[data-margin]` (0-10 modules) + `[data-margin-out]`.
- `[data-ec]` radio group `name="ec"` (L, M, Q, H; M checked) + `[data-ec-hint]`.
- Preview: `[data-preview]` (replace its child with a canvas or `<svg>`), `[data-frame]`, `[data-empty]`, `[data-invalid]` + `[data-invalid-msg]` (role=alert), `[data-status]` (aria-live polite), `[data-live-badge]`.
- Facts: `[data-meta-type]`, `[data-meta-size]`, `[data-meta-data]`; capacity bar `[data-meter] > i` (set width; `.is-high` when near full).
- Downloads: `[data-download-png]`, `[data-download-svg]` (disable when empty or invalid).
- Any `[data-seg]`: set `--i` to the checked index after changing radios in code (the stub does this on `change` only).

## Notes for the logic pass
- `src/tool.js` is a presentational stub (tabs, seg pill, password eye). Keep or merge it; put the encoder in `src/*.mjs` with tests and add every browser file to `copy` in `site.mjs`.
- The placeholder QR in `[data-preview]` is fake art: replace it on load. Start state: show the empty veil (`data-empty`, root `.is-empty`) until there is input, or render a real example.
- The preview image stays square; use `image-rendering: pixelated` canvas or a crispEdges SVG.
- Do not put ads, links or extra markup inside `#tool`.
