# Username Generator: design notes (pilot pattern for text tools)

## Section order (site.mjs `home`)
1. `hero()` with h1, lead, trust items; the tool is passed as `after`.
2. `adSlot(ctx, 'below-tool')` (never inside `#tool`).
3. `#how` How it works: `ol.ng-steps` of 3 `.card` items with a numbered `.ng-step` badge.
4. `#styles` Styles: `.ng-style-grid` of `.card.ng-style`, each with `.fmt-list.ng-samples` chips (from `CATEGORIES`).
5. Content: two columns, prose left, tips `.card` right (same as Fitpic preset pages).
6. `adSlot(ctx, 'mid')`, then `#faq` (`sectionHead` + `faqHtml(FAQ)`, wrap-narrow).
Header nav links to `#how`, `#styles`, `#faq`. All placeholder text is marked `TODO(copy)`.

## Tool panel structure
`section#tool.tool.ng-tool[data-tool]` (framework shell, grid flipped so options are LEFT on desktop and FIRST on phones):
- `form.panel.ng-panel[data-options]`: style cards (`.ng-cats` of `label.ng-cat` radios, 2 per row), Length / Capitals /
  Between words (framework `.seg`), optional word `.field`, Add numbers `.check`, primary Generate button.
- `div.stage.ng-stage[data-stage]`: `.ng-head` (title, status line, busy pill, ghost "More" button), empty state,
  `ul.ng-results` (1 column, 2 from 640px), `section.ng-favs` favourites panel pinned to the bottom.
- `<template>`s hold one result row and one favourite chip; clone them instead of writing HTML in JS.
All CSS is in `tool.css` with an `ng-` prefix. Framework classes reused: tool, panel, stage, block, lbl, lbl-row, hint,
seg, seg-sm, field, check, chip, btn, btn-primary, btn-ghost, drop-icon, drop-title, drop-sub, spin, card, fmt-list.

## Data hooks
Options: `data-options` (form), `data-category` (radiogroup; radios `name=category`, values fantasy|scifi|cute|edgy|gamer|mix),
`data-length` (`name=length`: short|medium|long), `data-length-hint`, `data-case` (`name=case`: title|lower|upper|mixed),
`data-separator` (`name=separator`: ''|_|.|-), `data-word` (text, maxlength 12), `data-numbers` (checkbox).
Every `.seg` also has `data-seg`; set `--i` to the checked index on change (as Fitpic does) so the pill slides.
Actions: `data-generate` (two buttons: main submit + "More"; the form has `onsubmit="return false"`, listen for `submit`
or click). Output: `data-stage`, `data-status` (role=status, aria-live polite: announce "12 sci-fi names"),
`data-busy` (unhide while working; also add `.is-working` to `[data-tool]`), `data-empty`, `data-results` (ul).
Result row `li[data-result][data-value]`: `data-name`, `data-len`, `data-favourite` (toggle `aria-pressed`, update its
aria-label), `data-copy` (add `.is-copied` for ~1.5s and set `[data-copy-label]` to "Copied").
Favourites: `data-favourites-panel`, `data-favourites` (ul), `li[data-fav][data-value]` with `data-name`, `data-copy`,
`data-remove`; `data-fav-count`, `data-fav-empty`, `data-copy-all`, `data-clear-favourites`.
Templates: `template[data-result-template]`, `template[data-fav-template]`.

## Notes for the logic agent
- Static samples carry `data-sample`: remove them all on first generate (or replace with real names on load).
- Add `.is-new` and `style="--k:<index>"` to fresh rows for the staggered rise animation (motion-safe by framework).
- Favourites live in memory only (no localStorage). Hide `[data-favourites]` actions when empty and show `data-fav-empty`.
- Keep the 12-result count so the 2-column grid stays even. Names longer than the row are ellipsised.
- Copy uses `navigator.clipboard.writeText`; fall back to selecting `[data-name]` (it has `user-select: all`).
- Keep copy neutral, teen-and-adult; nothing child-directed (AdSense). Final copy: 300+ words, 5+ FAQ, How it works.
- List any new browser file (e.g. `src/names.mjs`) in `site.mjs` `copy`.
