# CONTEXT (read this first, one page)

Brand name lives only in `framework/config.mjs` (working name FitPic, to be renamed). Never type the brand into a tool's copy or code; import from there. Australian spelling and law by default. Owner: MacuTech, Brisbane.

## How this repo works (adapted from the handover)
Every tool is a small static site built by the shared framework (`framework/`), not a loose HTML page. A tool folder `tools/<slug>/` is:

```
manifest.json     name, slug (= folder name), description (<=200 chars), keywords[], category   (required)
site.mjs          pages, copy, FAQ and the tool's HTML; this generates index.html at build time
styles.css        copy of tools/_starter/styles.css (imports tailwind + framework styles + tool.css)
tool.css          styles only this tool needs
src/tool.js       browser entry point (UI wiring). Pure logic goes in src/<name>.mjs so it can be tested
tests/*.test.mjs  node:test tests for the pure logic (run: npm test)
vendor/           any third-party file, minified, with its LICENSE file beside it (only if truly needed)
README.md         every dependency and its licence (MIT, BSD or Apache-2.0 only; "none" is ideal)
```
Create one with `npm run new -- <slug> "<Name>" --no-network` (the flag matters: without it the script edits `network.json`, which would conflict between branches). Every browser file must be listed in `site.mjs` `copy` (e.g. `['src/tool.js','assets/tool.js']`, `['src/logic.mjs','assets/logic.mjs']`) so it lands in `dist/assets/`. Reuse framework helpers (`hero`, `faqHtml`, `adSlot`, `sectionHead`, `privacyPage`...) and the existing look: see `tools/fitpic/site.mjs` and `tools/_starter/site.mjs`. Do not restyle the framework.

## Who may edit what
- A build agent edits ONLY its own `tools/<slug>/` folder (plus its own branch `tool/<slug>`). Never touch: `framework/`, `network.json`, `package.json`, `package-lock.json`, `README.md`, `CONTEXT.md`, `REPORT.md`, `tools/hub/`, `tools/_starter/`, any other tool. No new npm dependencies (vendor a file instead).
- Only the review agent edits shared files, and only to fix an integration problem it records in `REPORT.md`.
- Nobody pushes to or merges into `main`. The owner does that.

## Acceptance checklist (every tool)
1. Fully client-side. No uploads, no network calls with user data, no analytics calls.
2. Ads: placeholders only. In `site.mjs` keep `ads: { client: '', slots: {...all ''} }` and `analytics: { cloudflareToken: '' }`. No ad ids, keys, tokens or passwords anywhere.
3. Visible page text of at least 300 words of original content, a "How it works" section, and an FAQ of 5 or more questions. Include `contact`, About, Privacy, Terms pages (from `framework/pages.mjs`), linked in the footer.
4. Text and code written fresh. Nothing copied from other sites. No logos or artwork copied.
5. Works at 375px and 1280px wide (no horizontal scroll, controls usable). Check with Python Playwright Chromium (`python3 -I script.py`; it launches here) on a preview build.
6. Tests for the core logic (`tests/*.test.mjs`) pass with `npm test`.
7. `manifest.json` valid (`npm test` checks it). README lists every dependency and licence; GPL, AGPL and non-commercial are rejected; MPL or LGPL must be flagged in the README and reported, not silently shipped.
8. `npm run build -- <slug>` succeeds, and `npm run preview -- <slug>` for visual checks.

## Commands (from the repo root)
```
npm install                       # once
npm test                          # all *.test.mjs, including the manifest check
npm run check                     # manifest check + build of the tool index (tools/hub)
npm run preview -- <slug>         # private preview (noindex, ad placeholders shown) -> tools/<slug>/dist
npm run build -- <slug>           # production build -> tools/<slug>/dist
npm run build -- hub              # tool index + sitemap, generated from tools/*/manifest.json
```
Git: one clone, worktrees only. Before pushing run `git fetch origin main`. If a push or fetch returns HTTP 429, wait 10 seconds and retry once.

## What setup/shared added (the audit)
Already existed and left untouched: Fitpic site and its About, Contact, Privacy and Terms pages (`framework/pages.mjs`), per-site `sitemap.xml` and `robots.txt` (production allows Google, previews block it), ad placeholder (`adSlot`, `adRails`), the image compressor (`tools/fitpic`) and FitReel (`tools/fitreel`).
Added: `framework/config.mjs`, `framework/manifests.mjs` (+ test), `tools/hub/` (tool index and sitemap generated from `tools/*/manifest.json`, served at `/tools/`), `manifest.json` for fitpic and fitreel and the starter, `--no-network` flag on `new-tool.mjs`, `sitemapUrls` hook and sitemap de-duplication in `framework/build.mjs`, `npm test` and `npm run check`.

## Decisions taken while unattended (the review agent copies these into REPORT.md)
- The handover assumed a loose `tools/<slug>/index.html` layout. The repo has a framework with `site.mjs`, so tools follow the framework and add `manifest.json` on top. Each tool builds as its own small site.
- The tool index is a framework site at `tools/hub`, intended for `https://<domain>/tools/`. The hub and all ten new tools are wired into the main site build by `include` entries in `tools/fitpic/site.mjs` (like FitReel), so one deploy of `tools/fitpic/dist` serves everything. That wiring is its own commit on `setup/shared` ("Serve the new tools and the tool index from the main site build"); revert it to keep the new tools out of the live site. A new tool needs its own `include` line there.
- A real AdSense publisher id (`ca-pub-...`) is already committed on `main` in `tools/fitpic/site.mjs` and `tools/fitreel/site.mjs`. Left as is. All new code uses empty ids.
- Existing third-party code on `main`: heic2any/libheif (LGPL, Fitpic), Mediabunny (MPL-2.0) and an optional FFmpeg AAC encoder (LGPL, FitReel). These sit outside the "MIT, BSD or Apache-2.0" list in the briefs; flagged for the owner, not changed.
- `image-compressor` is the existing `tools/fitpic`; its tidy-up adds README, tests and content checks only, with no change to working logic.
