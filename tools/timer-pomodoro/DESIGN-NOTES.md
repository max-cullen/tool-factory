# Timer and Pomodoro: design notes

## Section order (site.mjs `home`)
hero (tool as `after`), below-tool ad, `#how` three step cards, `#modes` three mode cards, two-column prose + tips card, mid ad, `#faq`.

## Tool shell
`section#tool.tp-tool[data-tool][data-mode][data-tone]`: `.stage.tp-stage` (tabs, heading, progress ring with `role=timer` readout, pips, state line, controls, laps, totals, visually hidden `data-announce` live region) and `form.panel.tp-panel` (settings per mode, alerts, screen). Classes prefixed `tp-`; framework `.field`, `.check`, `.chip`, `.btn-*`, `.card` reused; `.range` copied from the qr-code pilot.

## Logic
`src/clock.mjs` (countdown, stopwatch, lapStats), `src/pomodoro.mjs`, `src/format.mjs` are pure and take an injectable `now`. Time is always an end timestamp compared with the clock; `tick()` in `src/tool.js` re-syncs on every tick and on `visibilitychange`/`pageshow`. Nothing is stored.
