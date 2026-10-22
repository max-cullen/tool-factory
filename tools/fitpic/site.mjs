// Fitpic: fit a photo to an exact file size and/or exact pixels, in the browser.
// This file holds everything specific to Fitpic: its pages, copy and tool markup.
// Shared layout, header, footer, SEO and styles come from /framework.
import { ICON, hero, sectionHead, faqHtml, tiles, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';

const UPDATED = '21 October 2026';

const site = {
  id: 'fitpic',
  name: 'Fitpic',
  url: 'https://usefitpic.com', // set to the real domain before launch
  contact: 'info@usefitpic.com', // set before launch
  parent: 'MacuTech', // umbrella brand for all the owner's projects (a brand name only, not a company)
  operator: 'MacuTech', // shown on the Terms page. Replace with the owner's name if the site should say who is behind it.
  tagline: 'Fit photos to the exact size a form asks for. Everything runs in your browser.',
  privacySummary: 'Your photos never leave your device. Fitpic processes them inside your web browser, and they are not uploaded to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  footnote: 'Built to make things simpler.',
  footnote2: 'Your images stay on your device. Never uploaded, never stored.',
  // Ads and analytics are off until these are filled in (see README, "Turning on ads").
  ads: { client: 'ca-pub-8622882132846694', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  nav: [{ id: 'kb', label: 'File size' }, { id: 'px', label: 'Pixels' }, { id: 'home', label: 'Popular sizes', hash: '#sizes' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Tools', links: [{ id: 'kb', label: 'Reduce size in KB' }, { id: 'px', label: 'Resize to exact pixels' }, { path: 'instagram/', label: 'Video for Reels' }] },
    { title: 'Popular sizes', links: [{ id: 'kb20', label: 'Under 20KB' }, { id: 'kb50', label: 'Under 50KB' }, { id: 'kb100', label: 'Under 100KB' }, { id: 'kb200', label: 'Under 200KB' }] },
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

const TRUST = ['Nothing is uploaded', 'Free, no sign-up', 'JPG, PNG, WebP and HEIC'];

/* ---------- preset sizes: each page gets its own copy ---------- */
const SIZES = [
  {
    kb: 20, slug: 'compress-image-to-20kb', label: '20KB', blurb: 'Signatures and small uploads',
    lead: 'Shrink a photo or scanned signature to 20KB or less. Fitpic lowers the quality and, when it has to, the pixel size, then keeps the clearest version that fits.',
    about: [
      '20KB is one of the tightest limits you will meet. It usually turns up for scanned signatures, thumbnails and small ID images on older application portals.',
      'A photo straight from a phone is often a hundred times bigger than this, so quality alone is not enough. Fitpic also reduces the number of pixels until the file fits, and stops as soon as it does so the picture stays as large as the limit allows.',
    ],
    tips: ['Crop tightly first. Every pixel you remove leaves more room for the part that matters.', 'For a signature, use dark ink on plain white paper and good light. Clean backgrounds compress far better.', 'Keep JPEG selected. It reaches small sizes with the least visible loss.'],
    note: 'A 20KB limit is tight, so Fitpic shrinks the pixels as well as the quality when it has to. That usually keeps a small photo or a signature readable.',
  },
  {
    kb: 50, slug: 'compress-image-to-50kb', label: '50KB', blurb: 'ID and passport-style photos',
    lead: 'Get a photo under 50KB without guesswork. Fitpic finds the sharpest version that fits, right in your browser.',
    about: [
      '50KB is a common limit for ID-style photos on online applications. It is enough for a clear head-and-shoulders photo once the pixel size is sensible.',
      'If the form also gives exact pixel dimensions, switch to "Both" and enter them. Fitpic sets the exact size first, then fits the file under 50KB.',
    ],
    tips: ['Crop to head and shoulders before fitting. A tighter crop looks sharper at the same file size.', 'Even, soft light on a plain background gives a cleaner result than a busy scene.', 'Check the form for exact pixels or a minimum file size, and set those too.'],
    note: 'At 50KB there is room for a clear face or document photo once the pixels are brought down to a sensible size.',
  },
  {
    kb: 100, slug: 'compress-image-to-100kb', label: '100KB', blurb: 'Application and profile photos',
    lead: 'Compress any photo to 100KB or less in seconds. Free, private, and nothing is uploaded.',
    about: [
      '100KB is the limit many application forms and profile uploads use. It leaves enough room for a photo that looks good on screen.',
      'Fitpic first tries lowering the quality while keeping every pixel. If that is not enough, it reduces the pixel size just as far as needed, then uses any room left to raise the quality again.',
    ],
    tips: ['Start from the original photo, not a screenshot or an already-compressed copy.', 'If the result looks soft, crop away background you do not need and fit it again.', 'Need a range, such as 50 to 100KB? Tick "Also set a minimum size".'],
    note: 'A phone photo is often several megabytes. Fitpic brings it down to 100KB or less and keeps the sharpest version that fits.',
  },
  {
    kb: 200, slug: 'compress-image-to-200kb', label: '200KB', blurb: 'Documents and larger photos',
    lead: 'Reduce a photo or scanned document to 200KB or less while keeping text readable.',
    about: [
      'At 200KB there is room for real detail, which matters for scanned documents, certificates and photos where small text has to stay readable.',
      'Fitpic holds on to resolution as long as it can and only lowers quality as much as the limit needs. Use the compare slider to check that the text is still crisp before you download.',
    ],
    tips: ['Straighten and crop the page edges before fitting, so the space goes to the document itself.', 'Photograph documents in daylight without flash to avoid glare and noise.', 'JPEG works well for scans. PNG keeps text sharper but is much harder to make small.'],
    note: 'Around 200KB you can keep far more detail, so Fitpic holds on to resolution and only lowers quality as much as needed.',
  },
  {
    kb: 500, slug: 'compress-image-to-500kb', label: '500KB', blurb: 'Web uploads and attachments',
    lead: 'Bring a photo down to 500KB or less with almost no visible change.',
    about: [
      'Half a megabyte is generous. Most photos look close to the original on screen at this size, which makes it a good fit for websites, listings and upload forms with a relaxed limit.',
      'Often Fitpic only needs to lower the quality a little and keep the full pixel size. If the photo already fits, it is returned untouched.',
    ],
    tips: ['Use the compare slider to see the difference. At this size it is usually hard to spot.', 'Choose WebP for websites you run yourself. It is smaller at the same quality, but some forms do not accept it.', 'Keep a copy of your original. Compressed files should not be compressed again and again.'],
    note: 'Half a megabyte keeps most photos looking close to the original on screen.',
  },
  {
    kb: 1000, slug: 'compress-image-to-1mb', label: '1MB', blurb: 'Email and form attachments',
    lead: 'Trim a large photo to 1MB or less for email and form attachments, privately in your browser.',
    about: [
      'Photos from modern phones are often several megabytes. 1MB is a common cap for attachments and uploads, and it is plenty for a sharp photo.',
      'Fitpic keeps the full resolution where it can and makes only the changes needed to get under the limit.',
    ],
    tips: ['iPhone HEIC photos work too. They are converted to JPEG in your browser.', 'If a form says "1MB", Fitpic counts it as 1,000,000 bytes to be safe either way.', 'Sending several photos? Fit each one, then attach them together.'],
    note: 'Many photos from modern phones are several times this size. Fitpic trims them to 1MB with very little visible change.',
  },
];

/* ---------- tool markup ---------- */
const UPLOAD = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';

function toolHtml({ mode, kb, w, h }) {
  const seg = (name, n, opts, cls = '') => `<div class="seg ${cls}" data-seg style="--n:${n}" role="radiogroup" aria-label="${name}">${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}"><span>${t}</span></label>`).join('')}</div>`;
  const kbChips = SIZES.filter((s) => s.kb >= 100 || s.kb === Number(kb)).map((s) => `<button type="button" class="chip" data-kb-chip="${s.kb}" aria-pressed="false">${s.kb >= 1000 ? '1 MB' : s.kb + ' KB'}</button>`).join('');
  const pxChips = [['413', '531', 'Passport 413&times;531'], ['600', '600', 'Square 600&times;600'], ['800', '600', '800&times;600'], ['1200', '1600', '1200&times;1600'], ['', '', 'Original size']]
    .map(([pw, ph, t]) => `<button type="button" class="chip" data-px-chip data-w="${pw}" data-h="${ph}" aria-pressed="false"${pw === '413' ? ' title="35 &times; 45 mm at 300 dpi"' : ''}>${t}</button>`).join('');
  return `<section id="tool" class="tool" data-tool data-sample="off" data-mode="${mode}"${kb ? ` data-kb="${kb}"` : ''}${w ? ` data-w="${w}" data-h="${h}"` : ''} aria-label="Photo fitting tool">
  <div class="stage" data-stage>
    <div class="busy" data-busy hidden><span class="spin"></span>Fitting&hellip;</div>
    <div class="err" data-err hidden></div>
    <button type="button" class="drop" data-drop>
      <span class="drop-icon">${UPLOAD}</span>
      <span class="drop-title">Drop a photo here</span>
      <span class="drop-sub">or click to choose one. You can also paste.</span>
      <span class="drop-types">JPG, PNG, WebP or HEIC</span>
    </button>
    <input type="file" accept="image/*,.heic,.heif" hidden data-file aria-label="Choose a photo">
    <div class="stage-top m-extra" data-stage-top hidden>
      <div class="file-chip"><span data-name></span><span class="tag-example" data-example hidden>Example photo</span></div>
    </div>
    <div data-view hidden></div>
    <button type="button" class="btn btn-primary choose-main choose-under" data-choose-main hidden>${UPLOAD}Choose your photo</button>
    <div class="readout" data-readout hidden aria-live="polite">
      <div class="sizes"><span class="from num" data-from></span><span class="to num" data-to></span><span class="delta" data-delta></span></div>
      <div class="bar" data-bar aria-hidden="true"><i></i></div>
      <dl class="facts m-extra">
        <div><dt>Dimensions</dt><dd class="num" data-dim></dd></div>
        <div><dt>Quality</dt><dd class="num" data-q></dd></div>
        <div><dt>Format</dt><dd data-fmt></dd></div>
      </dl>
      <div class="grid gap-2" data-notes></div>
    </div>
  </div>
  <form class="panel" data-panel autocomplete="off" novalidate>
    <button type="button" class="btn btn-primary choose-main choose-top" data-choose-main hidden>${UPLOAD}Choose your photo</button>
    <div class="block"><span class="lbl">Fit by</span>${seg('mode', 3, [['kb', 'File size'], ['px', 'Pixels'], ['both', 'Both']])}</div>

    <div class="block" data-sec="kb">
      <div class="lbl-row"><label class="lbl" for="max-input">Maximum size</label><span class="m-extra">${seg('unit', 2, [['KB', 'KB'], ['MB', 'MB']], 'seg-sm seg-inline')}</span></div>
      <div class="chips">${kbChips}</div>
      <div class="field m-extra"><input id="max-input" name="max" spellcheck="false" data-max inputmode="decimal" placeholder="100" aria-label="Maximum size"><span class="suffix" data-unit>KB</span></div>
      <label class="check m-extra"><input type="checkbox" data-min-on><span>Also set a minimum size</span></label>
      <div class="field m-extra" data-min-wrap hidden><span class="prefix">Min</span><input id="min-input" name="min" spellcheck="false" data-min inputmode="decimal" placeholder="20" aria-label="Minimum size"><span class="suffix" data-unit>KB</span></div>
    </div>

    <div class="block" data-sec="px">
      <span class="lbl">Pixels</span>
      <div class="px-row">
        <div class="field"><input id="w-input" name="width" spellcheck="false" data-w inputmode="numeric" placeholder="Width" aria-label="Width in pixels"><span class="suffix">px</span></div>
        <span class="times" aria-hidden="true">&times;</span>
        <div class="field"><input id="h-input" name="height" spellcheck="false" data-h inputmode="numeric" placeholder="Height" aria-label="Height in pixels"><span class="suffix">px</span></div>
      </div>
      <div class="chips">${pxChips}</div>
      <div class="block" data-fit-wrap hidden><span class="lbl">If the shape is different</span>${seg('fit', 3, [['cover', 'Crop'], ['contain', 'Fit inside'], ['stretch', 'Stretch']], 'seg-sm')}</div>
    </div>

    <div class="block m-extra"><span class="lbl">Format</span>${seg('format', 3, [['jpeg', 'JPEG'], ['webp', 'WebP'], ['png', 'PNG']], 'seg-sm')}<p class="hint" data-format-hint></p></div>

    <button type="button" class="more-toggle" data-more-toggle aria-expanded="false"><span data-more-label>More options</span><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></button>
    <p class="hint" data-msg role="status"></p>
    <div class="panel-actions">
      <button type="button" class="btn btn-ghost w-full" data-download disabled>Download</button>
      <button type="button" class="btn btn-ghost w-full" data-choose>Choose another photo</button>
    </div>
  </form>
</section>`;
}

/* ---------- shared copy ---------- */
const FAQ_BASE = [
  ['Is my photo uploaded anywhere?', 'No. Fitpic runs in your browser and works on the photo right on your device. The file is never sent to a server, and there is no account to create.'],
  ['Why does the result land a little under my limit?', 'Fitpic looks for the sharpest version that still fits. The result is usually just below the maximum. If a form also needs a minimum size, set one and Fitpic will land between the two.'],
  ['What does "KB" mean here?', 'Forms count a kilobyte as either 1,000 or 1,024 bytes and rarely say which. To be safe either way, Fitpic treats your maximum as 1,000 bytes per KB and your minimum as 1,024.'],
  ['Which format should I pick?', 'JPEG, unless the form asks for something else. It reaches small sizes with the least visible loss. PNG is lossless, so the only way to shrink it is to reduce the pixels.'],
  ['Can it make a photo bigger?', 'It can enlarge the pixels to a size you choose, but no tool can add detail that was never captured. Enlarged photos look softer.'],
  ['Does it work with iPhone photos?', 'Yes. HEIC photos are converted in your browser, with rotation applied, and saved as JPEG, WebP or PNG.'],
  ['Is Fitpic free?', 'Yes. There is no account, no watermark and no limit on how many photos you fit. The site is supported by ads.'],
];

const CHART = `<svg viewBox="0 0 520 220" class="h-auto w-full" role="img" aria-label="Five attempts, alternating over and under the limit, landing just under it.">
  <defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#7c6cff"/><stop offset="1" stop-color="#4f8dff"/></linearGradient></defs>
  <line x1="20" y1="122" x2="500" y2="122" stroke="#7c6cff" stroke-width="1.6" stroke-dasharray="6 6" opacity=".8"/>
  <text x="500" y="110" text-anchor="end" fill="#b6adff" font-size="13" font-weight="600">Your limit</text>
  <polyline points="60,30 160,190 260,90 360,150 460,128" fill="none" stroke="url(#lg)" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="60" cy="30" r="6" fill="#151935" stroke="#b6bbd6" stroke-width="2"/>
  <circle cx="160" cy="190" r="6" fill="#151935" stroke="#b6bbd6" stroke-width="2"/>
  <circle cx="260" cy="90" r="6" fill="#151935" stroke="#b6bbd6" stroke-width="2"/>
  <circle cx="360" cy="150" r="6" fill="#151935" stroke="#b6bbd6" stroke-width="2"/>
  <circle cx="460" cy="128" r="10" fill="#5ee3a4"/>
  <text x="76" y="35" fill="#8b91b3" font-size="13">Too big</text>
  <text x="176" y="195" fill="#8b91b3" font-size="13">Too small</text>
  <text x="460" y="158" text-anchor="middle" fill="#5ee3a4" font-size="13" font-weight="700">Best fit</text>
</svg>`;
const DEVICE = `<svg viewBox="0 0 300 150" class="h-auto w-full" role="img" aria-label="The photo is fitted inside your device. The route to a server is crossed out.">
  <rect x="10" y="10" width="200" height="130" rx="18" fill="#0b0e1f" stroke="#353c68" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="26" y="34" fill="#8b91b3" font-size="12">Your device</text>
  <rect x="28" y="56" width="70" height="56" rx="12" fill="#232950"/>
  <text x="63" y="89" text-anchor="middle" fill="#f3f4fb" font-size="12" font-weight="600">Photo</text>
  <path d="M102 84h18m-5-5l5 5-5 5" stroke="#8b91b3" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="124" y="56" width="70" height="56" rx="12" fill="#7c6cff"/>
  <text x="159" y="89" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">Fitted</text>
  <path d="M210 84h34" stroke="#353c68" stroke-width="1.7" stroke-dasharray="4 4"/>
  <circle cx="227" cy="84" r="10" fill="#151935" stroke="#ff9191" stroke-width="1.7"/>
  <path d="M223 80l8 8M231 80l-8 8" stroke="#ff9191" stroke-width="1.7" stroke-linecap="round"/>
  <rect x="246" y="64" width="48" height="40" rx="10" fill="#1c2143"/>
  <text x="270" y="88" text-anchor="middle" fill="#8b91b3" font-size="11">Server</text>
</svg>`;
const PIXELS = `<svg viewBox="0 0 300 150" class="h-auto w-full" role="img" aria-label="A wide photo with a portrait crop area marked 413 by 531 pixels.">
  <rect x="20" y="16" width="260" height="110" rx="14" fill="#232950"/>
  <rect x="110" y="16" width="86" height="110" rx="6" fill="rgb(124 108 255 / .25)" stroke="#b6adff" stroke-width="2"/>
  <text x="153" y="146" text-anchor="middle" fill="#b6adff" font-size="13" font-weight="700">413 &times; 531 px</text>
</svg>`;

const sizeTiles = (ctx, page, skipKb) => tiles(SIZES.filter((s) => s.kb !== skipKb).map((s) => ({ href: ctx.link(page, 'kb' + s.kb), big: s.label, what: s.blurb })));
const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d]) => `<li class="card p-7"><h3 class="text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;
const SCRIPTS = ['assets/tool.js'];

/* ---------- pages ---------- */
function home(ctx, page) {
  const body = `<main id="main">
${hero({ h1: 'Make any photo fit the form.', lead: 'Shrink a photo to an exact file size or resize it to exact pixels. It all happens in your browser, so your photo is never uploaded.', trustItems: TRUST, after: toolHtml({ mode: 'kb' }) })}
${adSlot(ctx, 'below-tool')}

<section class="wrap mt-32">
  ${sectionHead('Built for upload forms', `The limits are strict and the error messages are vague. ${site.name} gets the photo through on the first try.`)}
  <div class="bento">
    <article class="card span-2"><figure>${CHART}</figure><h3 class="text-2xl">Exact to the kilobyte</h3><p>${site.name} tries different settings until the file lands just under your limit, then keeps the sharpest version that fits. Need a minimum too? Set a range.</p></article>
    <article class="card"><figure>${DEVICE}</figure><h3 class="text-2xl">Never leaves your device</h3><p>Passport photos, IDs and signatures stay on your computer or phone. Nothing is sent to a server.</p></article>
    <article class="card"><figure>${PIXELS}</figure><h3 class="text-2xl">Exact pixels too</h3><p>Set the width and height the form wants. Crop, fit inside or stretch.</p></article>
    <article class="card"><div class="fmt-list"><span>JPG</span><span>PNG</span><span>WebP</span><span>HEIC</span></div><h3 class="text-2xl">iPhone photos work</h3><p>HEIC photos are converted in your browser and saved as JPEG, WebP or PNG.</p></article>
    <article class="card"><div class="fmt-list"><span>$0</span><span>No account</span></div><h3 class="text-2xl">Free, no sign-up</h3><p>No watermark and no limit on how many photos you fit.</p></article>
  </div>
</section>

<section class="wrap mt-32">
  ${sectionHead('How it works')}
  ${howCards([['Choose a photo', 'Drop it in, paste it, or pick it from your device.'], ['Set the limit', 'Type a size in KB or MB, or exact pixels. Add a minimum size if the form has one.'], ['Download', 'Compare before and after, then save the file.']])}
</section>

<section id="sizes" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('Popular sizes', 'Jump straight to the limit your form asks for.')}
  ${sizeTiles(ctx, page)}
</section>

${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions')}
  ${faqHtml(FAQ_BASE)}
</section>
</main>`;
  return { title: `${site.name}: Compress or Resize a Photo to an Exact Size`, desc: 'Compress a photo to an exact file size in KB or resize it to exact pixels. Free and private: it runs in your browser and nothing is uploaded.', body, faq: FAQ_BASE, tool: { category: 'MultimediaApplication' }, scripts: SCRIPTS };
}

function preset(ctx, page) {
  const s = page.size;
  const h1 = `Compress image to ${s.label}`;
  const faq = [
    [`How do I compress an image to ${s.label}?`, `Choose your photo above. ${site.name} lowers the quality and, if needed, the pixel size until the file is ${s.label} or smaller. Then download it.`],
    [`Will my photo still look good at ${s.label}?`, s.note],
    [`What if my photo is already under ${s.label}?`, 'Then it already fits, and Fitpic gives it back exactly as it is, without re-compressing it.'],
    [`Can I get a file of exactly ${s.label}?`, `Fitpic aims just under ${s.label} so the file is accepted. If a form also has a minimum, tick "Also set a minimum size" and the result lands between the two.`],
    ...FAQ_BASE.slice(0, 3),
  ];
  const body = `<main id="main">
${hero({ h1, lead: s.lead, trustItems: TRUST, h1Class: 'max-w-[16ch] text-[40px] sm:text-6xl md:text-[72px]', after: toolHtml({ mode: 'kb', kb: s.kb }) })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards([['Choose a photo', 'Drop it in, paste it, or pick it from your device.'], [`Keep the ${s.label} limit`, `${s.label} is already selected. Change it if your form says something different.`], ['Download', 'Compare before and after, then save the file.']])}
</section>
<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">Getting a photo under ${s.label}</h2>${s.about.map((p) => `<p class="mt-5 text-lg text-ink-2">${p}</p>`).join('')}</div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">Tips for the best result</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${s.tips.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>
${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(faq)}
</section>
<section class="wrap mt-32">
  ${sectionHead('Other sizes', '', 'text-3xl md:text-4xl')}
  ${sizeTiles(ctx, page, s.kb)}
</section>
</main>`;
  return { title: `Compress Image to ${s.label} Online (Free, No Upload)`, desc: s.lead, body, faq, tool: { category: 'MultimediaApplication' }, scripts: SCRIPTS };
}

function kbPage(ctx, page) {
  const lead = 'Type the size a form asks for, or pick a preset, and get a photo that fits. Add a minimum for forms that want a range.';
  const faq = [
    ['How do I reduce an image to a certain size in KB?', 'Choose your photo, then type the size or tap a preset such as 100 KB. The result updates as you change it, and you can download it straight away.'],
    ['Can I set a range, like 20KB to 50KB?', 'Yes. Tick "Also set a minimum size" and enter both numbers. If the photo would come out too small, Fitpic adds harmless padding data so it meets the minimum without changing the picture.'],
    ['Can I type a size in MB?', 'Yes. Switch the unit to MB next to "Maximum size".'],
    ...FAQ_BASE.slice(0, 4),
  ];
  const body = `<main id="main">
${hero({ h1: 'Reduce image size in KB', lead, trustItems: TRUST, h1Class: 'max-w-[16ch] text-[40px] sm:text-6xl md:text-[72px]', after: toolHtml({ mode: 'kb', kb: '' }) })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards([['Choose a photo', 'Drop it in, paste it, or pick it from your device.'], ['Set the limit', 'Pick a preset or type any size in KB or MB. Add a minimum if the form has one.'], ['Download', 'Compare before and after, then save the file.']])}
</section>
<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">Why exact sizes are hard</h2>
    <p class="mt-5 text-lg text-ink-2">File size depends on the picture itself, not just its dimensions. A busy, detailed photo needs more space than a plain one of the same size, so there is no single setting that always gives 100KB.</p>
    <p class="mt-5 text-lg text-ink-2">Fitpic measures instead of guessing. It encodes the photo, checks the size, adjusts and repeats until it lands just under your limit, usually in a second or two.</p></div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">What Fitpic changes, in order</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0 text-ink-2">
    <li class="flex gap-3"><span class="mt-1 text-good">${ICON.check}</span><span>Nothing, if your photo already fits.</span></li>
    <li class="flex gap-3"><span class="mt-1 text-good">${ICON.check}</span><span>The quality setting, keeping every pixel.</span></li>
    <li class="flex gap-3"><span class="mt-1 text-good">${ICON.check}</span><span>The pixel size, only if quality alone is not enough.</span></li>
  </ul></div>
</section>
${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(faq)}
</section>
<section class="wrap mt-32">
  ${sectionHead('Popular sizes', '', 'text-3xl md:text-4xl')}
  ${sizeTiles(ctx, page)}
</section>
</main>`;
  return { title: 'Reduce Image Size in KB Online (Free, No Upload)', desc: lead, body, faq, tool: { category: 'MultimediaApplication' }, scripts: SCRIPTS };
}

function pxPage(ctx, page) {
  const lead = 'Set the exact width and height a form asks for. Crop to fill, fit inside, or stretch. Add a file size limit too if you need one.';
  const faq = [
    ['How do I resize a photo to exact pixels?', 'Choose your photo, type the width and height, and pick how to handle a different shape: crop, fit inside or stretch.'],
    ['What is the difference between Crop, Fit inside and Stretch?', 'Crop fills the frame and trims the edges. Fit inside keeps the whole photo and adds white bars. Stretch fills the frame by distorting the picture.'],
    ['What if I only know the width?', 'Enter just the width and leave the height empty. Fitpic keeps the original shape and works out the height for you.'],
    ['How do I turn millimetres into pixels?', 'Multiply the size in millimetres by the dpi the form asks for, then divide by 25.4. For example, 35 mm at 300 dpi is about 413 pixels.'],
    ...FAQ_BASE.slice(0, 3),
  ];
  const body = `<main id="main">
${hero({ h1: 'Resize image to exact pixels', lead, trustItems: TRUST, h1Class: 'max-w-[16ch] text-[40px] sm:text-6xl md:text-[72px]', after: toolHtml({ mode: 'px', w: 800, h: 600 }) })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards([['Choose a photo', 'Drop it in, paste it, or pick it from your device.'], ['Enter the pixels', 'Type a width and height, or tap a preset. If you give only one, the shape is kept.'], ['Download', 'Compare before and after, then save the file.']])}
</section>
<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">When the shape does not match</h2>
    <p class="mt-5 text-lg text-ink-2">A form might want a tall portrait photo when yours is wide. You choose what happens: <strong class="text-ink">Crop</strong> fills the frame and trims the edges evenly, <strong class="text-ink">Fit inside</strong> keeps the whole photo and adds white bars, and <strong class="text-ink">Stretch</strong> fills the frame by distorting the picture.</p>
    <p class="mt-5 text-lg text-ink-2">For faces, Crop is usually right. Centre the face in your original first so it stays centred after cropping.</p></div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">Pixels from a size in millimetres</h3><p class="mt-4 text-ink-2">Pixels = millimetres &times; dpi &divide; 25.4</p>
    <ul class="m-0 mt-5 grid list-none gap-3 p-0 text-ink-2">
      <li class="flex justify-between gap-4"><span>35 &times; 45 mm at 300 dpi</span><span class="font-semibold text-ink">413 &times; 531 px</span></li>
      <li class="flex justify-between gap-4"><span>2 &times; 2 in at 300 dpi</span><span class="font-semibold text-ink">600 &times; 600 px</span></li>
    </ul>
    <p class="mt-5 text-sm text-ink-3">Always check the exact numbers your form gives. These are examples, not official requirements.</p></div>
</section>
${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(faq)}
</section>
<section class="wrap mt-32">
  ${sectionHead('File size limits too', '', 'text-3xl md:text-4xl')}
  ${sizeTiles(ctx, page)}
</section>
</main>`;
  return { title: 'Resize Image to Exact Pixels Online (Free, No Upload)', desc: lead, body, faq, tool: { category: 'MultimediaApplication' }, scripts: SCRIPTS };
}

/* ---------- text pages (framework templates + Fitpic specifics; owner has them reviewed before launch) ---------- */
const privacy = (ctx) => privacyPage(ctx, {
  updated: UPDATED,
  dataTitle: 'Your photos',
  dataHtml: '<p>When you choose, drop or paste a photo, your browser reads and changes it locally. The photo and the fitted result are never sent to a server, and we cannot see them. They disappear when you close or reload the page.</p>',
});
const terms = (ctx) => termsPage(ctx, {
  updated: UPDATED,
  whatItIs: `${site.name} is a free tool for resizing and compressing images in your browser.`,
  ownershipHtml: `<p>You keep all rights in the images you use with ${site.name}. We do not claim any ownership of, or licence to, your images. Only use images you have the right to use.</p>`,
  processingHtml: `<p>${site.name} processes images locally, inside your web browser. We do not receive, store or keep your images or the fitted results, and they are cleared from your browser's memory when you close or reload the page. See our Privacy policy for details.</p>`,
  responsibilityHtml: `<p>You are responsible for checking that a fitted image meets the rules of the form or service you upload it to, such as file size, pixel size, format and photo guidelines. ${site.name} is not affiliated with any government agency, school, employer or exam body, and a fitted image is not guaranteed to be accepted. Keep a copy of your original images.</p>`,
});
const contact = (ctx) => contactPage(ctx, {
  lead: 'Found a bug, have an idea, or a size you need that is not here? Email us and we will read it.',
  extraHtml: `<p class="mt-6">Please do not send photos. ${site.name} never needs them, and we would rather not receive them.</p>`,
});
const about = (ctx) => aboutPage(ctx, { html: `
<p>Upload forms are fussy. "Photo must be under 50KB." "Image must be 413 &times; 531 pixels." ${site.name} exists to get you past those messages quickly, without installing anything and without handing your photo to a stranger's server.</p>
<h2>How it works</h2>
<p>Everything happens in your browser. ${site.name} decodes your photo, then encodes it again at different quality and pixel settings, measuring the file each time, until it finds the sharpest version that fits your limit. If you ask for exact pixels, it sets those first.</p>
<h2>What it does not do</h2>
<p>It cannot add detail that a photo never had, and it cannot check whether a photo meets a particular agency's photo rules, such as background colour or head position. Always check the requirements of the form you are using.</p>
<h2>Credits</h2>
<p>iPhone (HEIC) photos are decoded with <a href="https://github.com/alexcorvi/heic2any">heic2any</a> (MIT licence), which is built on <a href="https://github.com/strukturag/libheif">libheif</a> (LGPL licence). Text is set in Plus Jakarta Sans (SIL Open Font License).</p>` });

/* ---------- page list ---------- */
const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'kb', slug: 'reduce-image-size-in-kb', tool: true, render: kbPage },
  { id: 'px', slug: 'resize-image-to-exact-pixels', tool: true, render: pxPage },
  ...SIZES.map((s) => ({ id: `kb${s.kb}`, slug: s.slug, size: s, tool: true, render: preset })),
  { id: 'about', slug: 'about', render: about },
  { id: 'privacy', slug: 'privacy', render: privacy },
  { id: 'terms', slug: 'terms', render: terms },
  { id: 'contact', slug: 'contact', render: contact },
];

export default {
  site,
  pages,
  // Other tools built into this site under a sub-path.
  include: [{ tool: 'fitreel', path: 'instagram' }],
  // [source in this folder, destination in dist]
  copy: [
    ['src/tool.js', 'assets/tool.js'],
    ['engine/engine.js', 'assets/engine/engine.js'],
    ['engine/vendor/heic2any.min.js', 'assets/engine/vendor/heic2any.min.js'],
    ['engine/vendor/heic2any.LICENSE.md', 'assets/engine/vendor/heic2any.LICENSE.md'],
  ],
};
