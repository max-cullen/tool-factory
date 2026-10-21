# Tool Factory

A set of small, free, ad-funded web tools that share one framework: the same design, layout, SEO setup and legal pages.
Every tool is plain static files (HTML, CSS, JavaScript). There are no servers, databases or accounts, and nothing depends on Claude.

## Layout
```
framework/            shared by every tool
  styles.css          design system: colours, type, buttons, cards, tool shell, FAQ, footer
  lib.mjs             page parts: header, footer, hero, FAQ, tiles, SEO tags, structured data
  pages.mjs           privacy, terms, about and contact page templates
  build.mjs           builds one tool into tools/<id>/dist
  new-tool.mjs        creates a new tool from the starter
  site.js             small shared script (header, mobile menu)
tools/
  _starter/           template copied for every new tool
  fitpic/             photo sizing tool (site.mjs, src/tool.js, tool.css, engine/, test/)
network.json          list of all tools; "live": true ones appear under "More tools" in every footer
```

## Requirements
Node.js 20+ (includes npm). Python with Playwright is only needed for the tests.

## Commands (run from this folder)
```
npm install                          # once
npm run preview -- fitpic            # private preview build (noindex) -> tools/fitpic/dist
npm run build -- fitpic              # production build -> tools/fitpic/dist
npx serve tools/fitpic/dist          # view it locally, then open the printed link
npm run new -- namegen "Name Gen"    # start a new tool from the starter
```
Do not open the HTML files directly by double-clicking; use a local server as above.

## Making a new tool
1. `npm run new -- <id> "<Name>"`. This copies `tools/_starter` and adds the tool to `network.json` (not live yet).
2. Fill in the `TODO`s in `tools/<id>/site.mjs`: name, domain, copy, FAQ, the tool's HTML.
3. Write the tool's code in `tools/<id>/src/tool.js`, and any extra styles in `tool.css`.
4. `npm run preview -- <id>` and check it. When it launches, set `"live": true` and its real URL in `network.json`, then rebuild the other tools so their footers link to it.

## Before launching a tool
- In its `site.mjs`: set `url` (the real domain), `contact`, and the `UPDATED` date on legal pages.
- Have the privacy and terms text reviewed. The drafts assume Google AdSense for ads and Cloudflare Web Analytics for statistics.
- Run `npm run build -- <id>` (not preview).

## Turning on ads and analytics (per tool, in its `site.mjs`)
Both are OFF until configured, so a production build has no ad or analytics code at all. In preview builds the ad spaces show as labelled placeholders so you can review placement.
1. **Ads (Google AdSense).** After the site is live on its real domain, apply at adsense.google.com. Once approved, create two display ad units (one for "below-tool", one for "mid") and set in `site.mjs`:
   `ads: { client: 'ca-pub-XXXXXXXXXXXXXXXX', slots: { 'below-tool': '<unit id>', mid: '<unit id>', 'rail-left': '<unit id>', 'rail-right': '<unit id>' } }`
   Setting `client` alone already adds the AdSense script to every page and writes `ads.txt` (needed for approval). The ad spaces stay empty until their unit ids are filled in. `rail-left`/`rail-right` are 160x600 side ads shown only on screens 1560px and wider.
2. **Consent (EEA, UK, Switzerland).** In AdSense go to Privacy & messaging, create a GDPR message and publish it. Google's script then shows its own certified consent banner. The footer "Privacy settings" link re-opens it. Do not add a custom banner.
3. **Analytics (Cloudflare Web Analytics).** Add the site in Cloudflare, copy its token, and set `analytics: { cloudflareToken: '...' }`. Confirm cookie-free mode is on.
4. **Re-test.** Ads are third-party code, so re-run the privacy check with ads on and read the Privacy policy again before launch.
Ad spaces sit only below the tool or between sections (never inside the tool or above the Download button), have fixed heights so the page does not jump, and do not use AdSense "auto ads" (which can place ads anywhere). Leave auto ads off in the AdSense account.

## Icons
`favicon.svg` is generated from the logo at build time. The PNG/ICO versions (browser tab, iPhone home screen) are made once per tool and kept in `tools/<tool>/icons/`:
`npm run build -- <tool>` then `python3 framework/make_icons.py <tool>` (needs Python with Playwright and Pillow), then build again.

## Deploy (any static host)
Publish the tool's `dist` folder. On Cloudflare Pages: connect the GitHub repo, build command `npm run build -- <id>`, output directory `tools/<id>/dist`. One Pages project per tool, each with its own domain.

## Fitpic
- Engine: `tools/fitpic/engine/engine.js` (plain ES module). HEIC decoder in `engine/vendor/` (heic2any, MIT, built on libheif, LGPL; keep the credit on the About page).
- KB convention: maximum = KB x 1000, minimum = KB x 1024.
- Tests (from `tools/fitpic`):
  ```
  pip install playwright pillow numpy pillow-heif && playwright install chromium
  python3 -I test/make_fixtures.py test/fixtures
  python3 -I test/run_tests.py . /tmp/engine_out                 # engine, 43 cases
  python3 -I test/site_test.py dist test/fixtures /tmp/site_out   # built site (run a preview build first)
  ```
- Known gaps: tested in Chromium only; Safari cannot encode WebP (falls back to JPEG with a warning); HEIC with rotation metadata untested; inputs over 100 megapixels are refused.

## Third-party pieces
- Plus Jakarta Sans font (SIL Open Font License), embedded at build time from npm.
- Tailwind CSS (build tool only, MIT).
- heic2any / libheif (Fitpic only).
