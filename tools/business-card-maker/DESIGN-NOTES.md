# Business Card Maker: design notes (follows the QR Code pilot)

Page order: hero (tool passed as `after`), `adSlot('below-tool')`, `#how` three step cards, "Six layouts" grid of cards with build-time SVG thumbnails drawn from `src/layouts.mjs`, a two-column section (copy left; bleed diagram and tips right), `adSlot('mid')`, FAQ. All copy is in `COPY` at the top of `site.mjs`.

Tool shell `section#tool.tool.bc-tool[data-tool]`: `.panel.bc-input` (1 Your details), `.stage.bc-stage` (canvas preview, facts, guide toggle, downloads), `form.panel.bc-look` (2 Design: layout, colours, font, logo, back, bleed). Same grid areas, breakpoints and sticky stage as the QR pilot. New classes are all `bc-*`.

Hooks: `[data-field=name|title|company|phone|email|website|address]`, `input[name=layout|font|back|side]`, `[data-c=bg|text|accent]` + `[data-c-hex=...]`, `[data-preset]`, `[data-logo]`, `[data-logo-clear]`, `[data-back-text]`, `[data-bleed]`, `[data-guide]`, `[data-canvas]`, `[data-thumb=<layout id>]`, `[data-download-png|pdf|screen]`.

Draw commands (mm): `rect`, `circle`, `text`, `logo`. The same commands feed the preview, the thumbnails, the PNG and the PDF image. The safe-area guide is painted on the preview canvas only.
