# Overnight build report

Branch: `setup/shared`. Nothing here has been merged into `main`; `main` is still `1670a48b3db918de347746997085a21ec317c299`.

## Summary

Ten new tools and a tool index were built, reviewed and merged into `setup/shared`. All 409 tests pass and every site builds. The new tools are wired into the main site build, so one deploy of `tools/fitpic/dist` serves the existing site, FitReel at `/instagram/`, the tool index at `/tools/` and the ten tools at `/<slug>/`. A crawl of the built site (55 new pages at phone width) found no broken links, no console errors, no outside requests and no sideways scrolling.

## Tools

| Tool | Status | Visible words (home) | FAQ | Dependencies |
|---|---|---|---|---|
| name-generator | merged | ~1,240 | 9 | none |
| qr-code | merged | ~1,490 | 9 | none (own encoder, cross-checked with two independent decoders) |
| image-converter | merged | ~1,250 | 9 | none (own ZIP writer) |
| image-cropper | merged | ~1,460 | 10 | none |
| image-resizer | merged | ~1,510 | 9 | none |
| image-edit | merged | ~1,320 | 9 | none |
| business-card-maker | merged | ~1,600 | 8 | none (own PDF writer) |
| timer-pomodoro | merged | ~1,350 | 9 | none |
| word-counter | merged | ~1,750 | 10 | none |
| mp3-to-mp4 | merged | ~1,490 | 9 | none (own MP4 and WebM writers) |
| image-compressor (existing `tools/fitpic`) | tidy-up merged | ~720 | 7 | unchanged (see licences) |
| background-remover | not built, by design | | | needs a licence decision |

Word counts include the header and footer text. The only change to the existing Fitpic home page is one added "How it works" section. A build before and after differed in `dist/index.html` only.

## What passed

- Every branch changed only its own folder (image-compressor only `tools/fitpic/`).
- Tests: 409 pass, 0 fail, 0 skipped. Every site and tool builds in production and preview.
- Client-side only: no `fetch`, storage, cookies, beacons or outside links in any new tool.
- Ads and analytics are empty in every new tool. No new ad IDs, keys or tokens anywhere.
- Each tool has About, Privacy, Terms and Contact pages linked from the footer, a How-it-works section, an FAQ, a manifest and a README listing dependencies.
- Layout at 375px and 1280px: no sideways scrolling, no console errors, no outside requests.
- Sitemap: 76 URLs, no duplicates. `robots.txt` allows Google and sits only at the site root.

## What failed or needed fixing

- **Review of the eight finished branches:** nothing failed, no fixes needed.
- **mp3-to-mp4:** its first agent stopped partway (a tool outage). A second agent finished it. Two fixes: the file-size estimate was about 3 times too high, and a "×" showed as garbled text without a charset.
- **Link-check test:** one test hard-coded `/instagram/` as the only allowed sub-folder, and failed once the other tools were included. It now reads the include list.
- **Privacy text:** the shared page template said "photos" everywhere. It now takes a `site.inputNoun` setting (default "photos", so Fitpic and FitReel output is unchanged).

## Check by hand before you go live

1. **mp3-to-mp4 in real browsers.** Only the WebM route ran end to end here. MP4 output (H.264 and AAC) was tested with generated test data and `ffprobe`, never in real Chrome, Edge or Safari. Try it, then check playback in QuickTime and Photos. If MP4 misbehaves, the page falls back to WebM and says so.
2. **Phone and desktop.** Open each tool on a real phone and a real computer. Pay attention to Safari/iOS downloads, WebP encoding (Safari can't encode WebP), the clipboard buttons, notification and sound in timer-pomodoro, and very large images (100 megapixel files may run out of memory on phones).
3. **Privacy and Terms text** on every site needs your review. It is a draft. The shared Terms text says "keep a copy of your original files", which reads oddly for word-counter and timer-pomodoro.
4. **Ads.** New tools show no ads and load no AdSense script. Once the site is approved, set `ads` per tool in each `site.mjs` (the tool index at `tools/hub/site.mjs` too). The AdSense ID already on `main` (in `tools/fitpic` and `tools/fitreel`) was left as is.
5. **Licences outside "MIT, BSD or Apache-2.0".** Existing code on `main`: heic2any bundles LGPL libheif (its licence file shows only the MIT part), Mediabunny is MPL-2.0, and FitReel's optional AAC encoder includes LGPL FFmpeg. I did not change these. Your call.
6. **Names.** "FitPic" is a working name kept in `framework/config.mjs` for the new pieces. The existing sites keep their own names in their own `site.mjs`. The "Fit tools" menu (`network.json`) still lists FitQR and FitTimer as "Soon" and does not list the new tools. I left that alone.
7. **The `fitreel` branch** on GitHub was not created by this build and was not touched.

## Decisions taken while unattended

- Tools follow the repo's framework (`site.mjs`, built into `dist`), with a `manifest.json` added on top, instead of the loose `index.html` layout the handover assumed.
- The tool index is its own small site (`tools/hub`) served at `/tools/`. It and the sitemap are generated from `tools/*/manifest.json`.
- The tool index and the ten tools are served from the same deploy through `include` entries in `tools/fitpic/site.mjs`, plus one "All tools" footer link. This is one commit ("Serve the new tools and the tool index from the main site build"). Revert it to keep them out of the live site.
- Everything is written from scratch without third-party code: the QR encoder, ZIP writer, PDF writer, MP4 and WebM writers, and the word lists. Page text was written fresh for each tool.
- mp3-to-mp4 re-encodes the audio rather than passing MP3 through unchanged.
- business-card-maker has six layouts and an optional bleed. The optional 10-up print sheet was not built.
- Page design: the two pilots were designed by Opus 5.5 and the logic, tests and all other tools by Sonnet 5.5.

## Merging into main

Take a look first: `https://github.com/max-cullen/tool-factory/compare/main...setup/shared`. Then, from a clone on your computer:

```
git fetch origin
git checkout main
git pull --ff-only origin main
git merge --no-ff origin/setup/shared
npm ci
npm test
npm run build -- fitpic
git push origin main
```

Cloudflare Pages should then deploy from `main` as it does now (build command `npm run build -- fitpic`, output `tools/fitpic/dist`). That one deploy carries the new pages. Do not use the preview build for the live site.

To go live without the new tools, merge as above, then `git revert` the commit "Serve the new tools and the tool index from the main site build" before pushing.

After deploy, open `https://usefitpic.com/tools/` and each tool once, then add the sitemap `https://usefitpic.com/sitemap.xml` in Google Search Console.
