# Timer and Pomodoro

A countdown timer, stopwatch with laps and Pomodoro focus timer. Runs entirely in the browser; nothing is stored or sent anywhere.

## Dependencies and licences
None. No third-party code, libraries, fonts, audio files or images are used by the tool. The alert tone is synthesised with the Web Audio API. (The page shell comes from the shared framework in `framework/`.)

## Files
- `site.mjs`: pages, copy, FAQ and the tool's HTML.
- `src/clock.mjs`: timestamp-based countdown and stopwatch state machines (injectable clock).
- `src/pomodoro.mjs`: phase sequencing, long-break rule, skip, auto-advance, totals.
- `src/format.mjs`: hh:mm:ss, stopwatch and tab-title formatting.
- `src/tool.js`: DOM, Web Audio, Notification and Screen Wake Lock wiring.
- `tool.css`: styles for this tool (prefix `tp-`). `DESIGN-NOTES.md`: layout and data hooks.
- `tests/*.test.mjs`: node:test tests using a fake clock (`npm test`).

## Design decisions
- Time is `Date.now()` against a stored end timestamp, never tick counting, so background tabs and device sleep do not cause drift. The state is re-read on `visibilitychange`.
- No localStorage or cookies; settings reset on reload.
- Notifications are requested only when the visitor ticks the notification box. Sound is off by default.

Build: `npm run preview -- timer-pomodoro` or `npm run build -- timer-pomodoro`.
