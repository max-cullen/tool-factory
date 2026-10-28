// Image Editor: rotate, flip and filter a picture in the browser, then save it as PNG, JPG or WebP.
// This file holds the pages, copy and tool markup. Layout, header, footer, SEO and styles come from /framework.
import { ICON, esc, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'image-edit',
  inputNoun: 'images',
  name: 'Image Editor',
  url: `${config.domain}/image-edit`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  // Two sliders for the logo mark and favicon.
  mark: '<path d="M6 4v16M12 4v16M18 4v16"/><circle cx="6" cy="14" r="2" fill="currentColor"/><circle cx="12" cy="8" r="2" fill="currentColor"/><circle cx="18" cy="15" r="2" fill="currentColor"/>',
  tagline: 'Rotate, flip and adjust a picture. Everything runs in your browser.',
  privacySummary: 'Your pictures never leave your device. The Image Editor changes them inside your web browser, and they are not uploaded to us or anyone else. The site may show ads and may count visits without cookies, as explained below.',
  // Ads and analytics stay OFF until the owner fills these in. No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Built to make things simpler.',
  footnote2: 'Your images stay on your device. Never uploaded, never stored.',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'home', label: 'Controls', hash: '#controls' }, { id: 'home', label: 'Questions', hash: '#faq' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

const TRUST = ['Nothing is uploaded', 'Free, no sign-up', 'PNG, JPG and WebP out'];

/* ---------- icons ---------- */
const svg = (d, size = 18, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  up: svg('<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>', 24),
  down: svg('<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5"/><path d="M4 19h16"/>', 18),
  left: svg('<path d="M4 10a8 8 0 1 1 2.4 8.4"/><path d="M4 4v6h6"/>', 18),
  right: svg('<path d="M20 10a8 8 0 1 0-2.4 8.4"/><path d="M20 4v6h-6"/>', 18),
  flipH: svg('<path d="M12 3v18" stroke-dasharray="2 3"/><path d="M9 7L3.5 17H9z"/><path d="M15 7l5.5 10H15z"/>', 18),
  flipV: svg('<path d="M3 12h18" stroke-dasharray="2 3"/><path d="M7 9L17 3.5V9z"/><path d="M7 15l10 5.5V15z"/>', 18),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>', 15),
  resetAll: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>', 18),
  turn: svg('<path d="M4 10a8 8 0 0 1 14-3.5"/><path d="M20 4v5h-5"/><path d="M20 14a8 8 0 0 1-14 3.5"/><path d="M4 20v-5h5"/>', 22),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>', 22),
  contrast: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>', 22),
  tone: svg('<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M3.5 12h17M9 5v14"/>', 22),
  drop: svg('<path d="M12 3.5c3.2 4 6 6.8 6 10.2a6 6 0 0 1-12 0c0-3.4 2.8-6.2 6-10.2z"/>', 22),
};

/* ---------- tool markup ---------- */
const seg = (hook, name, label, opts, checked, cls = '') => {
  const i = Math.max(0, opts.findIndex(([v]) => v === checked));
  return `<div class="seg ${cls}" data-seg ${hook} style="--n:${opts.length};--i:${i}" role="radiogroup" aria-label="${label}">${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}"${v === checked ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>`;
};

const slider = ({ key, label, min, max, value = 0, step = 1, unit = '', hint = '', id = `ie-${key}`, resetKey = key, attr = `data-adj="${key}"` }) => `<div class="ie-adj">
        <div class="lbl-row">
          <label class="lbl" for="${id}">${label}</label>
          <span class="ie-val"><output class="num ie-out" data-val="${key}" for="${id}">${value}${unit}</output><button type="button" class="ie-reset" data-reset="${resetKey}" aria-label="Reset ${label.toLowerCase()}" title="Reset ${label.toLowerCase()}" disabled>${I.reset}</button></span>
        </div>
        <input class="range" type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" ${attr}>${hint ? `\n        <p class="hint ie-hint">${hint}</p>` : ''}
      </div>`;

const toolHtml = () => `<section id="tool" class="tool ie-tool is-empty" data-tool aria-label="${esc(site.name)}">
  <div class="stage ie-stage" data-stage>
    <div class="busy" data-busy hidden><span class="spin"></span><span data-busy-text>Working&hellip;</span></div>
    <div class="note note-bad ie-err" data-err hidden role="alert"></div>
    <button type="button" class="drop" data-drop>
      <span class="drop-icon">${I.up}</span>
      <span class="drop-title">Drop an image here</span>
      <span class="drop-sub">or click to choose one. You can also paste.</span>
      <span class="drop-types">JPG, PNG, WebP or anything your browser can open. Up to 100 megapixels.</span>
    </button>
    <input type="file" accept="image/*" hidden data-file aria-label="Choose an image">
    <div class="ie-view" data-view hidden>
      <div class="ie-top">
        <span class="ie-name" data-name translate="no"></span>
        <button type="button" class="chip" data-choose>Choose another</button>
      </div>
      <div class="ie-frame"><canvas class="ie-canvas" data-canvas aria-label="Preview of your edited image" role="img"></canvas></div>
      <p class="ie-status" data-status role="status" aria-live="polite"></p>
      <dl class="ie-facts">
        <div><dt>Original</dt><dd class="num" data-from></dd></div>
        <div><dt>Saved size</dt><dd class="num" data-to></dd></div>
        <div><dt>Format</dt><dd data-fmt></dd></div>
      </dl>
    </div>
  </div>

  <form class="panel ie-panel" data-panel autocomplete="off" novalidate onsubmit="return false">
    <fieldset class="ie-fs" data-controls disabled>
      <div class="block">
        <div class="lbl-row"><span class="lbl">Turn and flip</span><button type="button" class="ie-reset ie-reset-text" data-reset="transform" disabled>${I.reset}<span>Reset</span></button></div>
        <div class="ie-tgrid">
          <button type="button" class="btn btn-ghost ie-tbtn" data-rotate="-90">${I.left}<span>Rotate left</span></button>
          <button type="button" class="btn btn-ghost ie-tbtn" data-rotate="90">${I.right}<span>Rotate right</span></button>
          <button type="button" class="btn btn-ghost ie-tbtn" data-flip="h" aria-pressed="false">${I.flipH}<span>Flip horizontal</span></button>
          <button type="button" class="btn btn-ghost ie-tbtn" data-flip="v" aria-pressed="false">${I.flipV}<span>Flip vertical</span></button>
        </div>
      </div>

      <div class="block">
        <span class="lbl ie-h">Adjust</span>
        ${slider({ key: 'brightness', label: 'Brightness', min: -100, max: 100 })}
        ${slider({ key: 'contrast', label: 'Contrast', min: -100, max: 100 })}
        ${slider({ key: 'greyscale', label: 'Greyscale', min: 0, max: 100, unit: '%' })}
        ${slider({ key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' })}
        ${slider({ key: 'blur', label: 'Blur', min: 0, max: 20 })}
      </div>

      <div class="block">
        <span class="lbl ie-h">Save as</span>
        ${seg('data-format', 'format', 'File format', [['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WebP']], 'png')}
        <p class="hint ie-hint" data-format-hint></p>
        <div data-quality-wrap hidden>
          ${slider({ key: 'quality', label: 'Quality', min: 1, max: 100, value: 90, id: 'ie-quality', resetKey: 'quality', attr: 'data-quality' })}
        </div>
      </div>

      <div class="panel-actions ie-actions">
        <button type="button" class="btn btn-primary" data-download>${I.down}Download image</button>
        <button type="button" class="btn btn-ghost" data-reset-all>${I.resetAll}Reset everything</button>
      </div>
    </fieldset>
  </form>
</section>`;

/* ---------- copy ---------- */
const HOW = [
  ['Add an image', 'Drop a picture onto the box, choose one from your device, or paste it. The editor opens it inside your browser. Nothing is sent anywhere, and a photo taken sideways on a phone opens the right way up.'],
  ['Turn, flip and adjust', 'Rotate in quarter turns, flip left to right or top to bottom, and move the sliders for brightness, contrast, greyscale, sepia and blur. The preview updates as you drag. Each slider has its own reset, and one button resets the lot.'],
  ['Pick a format and save', 'Choose PNG, JPG or WebP. For JPG and WebP, set the quality. The editor then redraws the full-size picture with your changes and gives you the file to download.'],
];

const CONTROLS = [
  { icon: I.turn, title: 'Rotate and flip', body: 'Quarter turns left or right, and mirror images left to right or top to bottom. These only move pixels around, so they lose nothing. A sideways scan or a selfie that came out the wrong way is fixed in a tap.' },
  { icon: I.sun, title: 'Brightness and contrast', body: 'Brightness lightens or darkens every pixel by the same amount. Contrast pushes light and dark values apart, or squeezes them toward grey. Small moves usually look better than big ones.' },
  { icon: I.tone, title: 'Greyscale and sepia', body: 'Greyscale takes out colour and keeps the light and dark. Sepia gives a warm brown tint, like an old print. Both run from 0 to 100 per cent, so you can mute colour without removing it.' },
  { icon: I.drop, title: 'Blur', body: 'Softens the picture by averaging each pixel with its neighbours. The amount is relative to the size of the image, so the preview and the saved file look alike. Handy for backgrounds, or to hide fine detail.' },
];

const FAQ = [
  ['Is my image uploaded anywhere?', 'No. The picture is opened and changed by code running in your browser, and the file you download is made there too. The page makes no network request with your image, and nothing is stored once you close or reload it.'],
  ['Are the edits lossless?', 'Rotating and flipping are lossless in pixel terms: every pixel is kept exactly and only its position changes, so turning a picture four times gives back the same pixels. Saving is a separate step. PNG keeps the pixels exactly as edited, but JPG and WebP at a quality below 100 discard some detail every time the file is saved, so avoid editing and re-saving the same JPG again and again. Brightness, contrast, greyscale, sepia and blur change pixel values by design.'],
  ['In what order are the adjustments applied?', 'First the picture is rotated, then flipped. Then the adjustments run in this order: brightness, contrast, greyscale, sepia and blur. The order matters, because each step works on the result of the one before. For example, raising brightness before contrast gives a different result from the reverse. The preview and the saved file always use the same order.'],
  ['Which format should I choose, PNG, JPG or WebP?', 'Use PNG when you need every pixel kept, for screenshots, logos, text or anything with transparency. Use JPG for photos that must work almost everywhere; smaller files come from a lower quality setting. Use WebP for smaller files at similar quality on websites you control, but note that some upload forms and older programs do not accept it. JPG has no transparency, so transparent areas are filled with white when you save as JPG.'],
  ['Can I edit a very large image?', 'Yes, up to 100 megapixels, which is more than most cameras make. To stay quick, the preview is drawn from a smaller copy, but the saved file is made from the full-size original with the same settings. Very large pictures take a few seconds to save and need a lot of memory, so a phone may run out first. If the editor cannot finish, it says so rather than giving you a broken file.'],
  ['Is location and other photo information kept?', 'No. The editor redraws the picture on a canvas and saves a new file, and the browser does not copy the original file\'s metadata into it. In our check, a photo containing GPS location, camera details and a date came out as PNG, JPG and WebP with none of those fields. If privacy matters, open your saved file in a metadata viewer to confirm.'],
  ['Why does a photo from my phone open the right way up?', 'Phones often store pictures sideways and add a small note saying how to turn them. The editor reads that note when it opens the file and shows the picture the right way up. The saved file has the turn built into its pixels.'],
  ['Does it keep transparency and animation?', 'Transparent areas in a PNG or WebP stay transparent when you save as PNG or WebP. They become white in JPG. Animated pictures, such as GIFs, are not supported: only the first frame is opened and the result is a still image.'],
  ['Will the saved file look like the preview?', 'It should. The preview and the saved file are made by the same code with the same settings. The preview uses a smaller copy, so very fine detail, such as sharp edges in a big photo, can look a little different at full size. Blur is scaled to the size of the picture so the amount matches.'],
];

const TIPS = [
  'Make small moves first. A little extra contrast or brightness often looks better than a lot.',
  'Keep your original. Save the edited picture as a new file instead of overwriting the first one.',
  'For a photo that will be emailed or uploaded, JPG is the safest choice. Choose a quality of 80 to 90 per cent.',
  'Pick PNG for screenshots, diagrams and anything with sharp text or transparent areas.',
  'Use Reset everything to start again, or the small reset beside a slider to undo one change.',
];

function home(ctx) {
  const body = `<main id="main">
${hero({ h1: 'Image editor', lead: 'Rotate and flip a picture, then change its brightness, contrast, colour and blur with live sliders. Save the result as PNG, JPG or WebP. Everything runs in your browser.', trustItems: TRUST, h1Class: 'max-w-[14ch] text-[44px] sm:text-6xl md:text-[80px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  <ol class="ie-steps m-0 grid list-none gap-4 p-0 md:grid-cols-3">${HOW.map(([t, d], n) => `<li class="card p-7"><span class="ie-step num" aria-hidden="true">${n + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>
</section>

<section id="controls" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('What each control does', 'Simple, predictable changes, so you can see what you are getting.')}
  <div class="ie-controls">${CONTROLS.map((c) => `<article class="card ie-control"><span class="ie-control-icon" aria-hidden="true">${c.icon}</span><h3 class="text-xl">${c.title}</h3><p class="text-ink-2">${c.body}</p></article>`).join('')}</div>
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">Quick edits without handing over your photo</h2>
    <p class="mt-5 text-lg text-ink-2">Many online editors ask you to upload a picture to a server before they will touch it. This one does not. Your picture is opened by your own browser, changed on your own device, and saved from there. That makes it a sensible choice for personal photos, scans of documents and anything you would rather not send to a stranger's computer.</p>
    <p class="mt-5 text-lg text-ink-2">The maths is written for this page and is the same for the preview and the saved file. While you work, you see a smaller copy so the sliders stay quick, even on a large photo. When you press download, the editor repeats your edits on the full-size original, so you do not lose resolution. Rotation and flipping move pixels without changing them. The other controls change pixel values in a fixed order, which is listed in the questions below.</p></div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">Tips for better results</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${TIPS.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section id="faq" class="wrap wrap-narrow mt-32 scroll-mt-20">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(FAQ)}
</section>
</main>`;
  return {
    title: 'Free Image Editor: Rotate, Flip, Brightness, Sepia and Blur',
    desc: 'Rotate, flip and adjust brightness, contrast, greyscale, sepia and blur on a picture, then save as PNG, JPG or WebP. Runs in your browser; nothing is uploaded.',
    body, faq: FAQ, tool: { category: 'MultimediaApplication' }, scripts: ['assets/tool.js'],
  };
}

/* ---------- text pages (framework templates) ---------- */
const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${esc(site.name)} is a small tool for quick picture fixes: turn a photo the right way up, mirror it, make it lighter or darker, add or take away colour, soften it, and save it in the format you need.</p>
<p>Everything happens in your browser. Your picture is opened on your device, edited there with code written for this site, and saved from there. It is not uploaded, and nothing about it is sent to us or anyone else. The pixel maths for brightness, contrast, greyscale, sepia and blur is our own, which is why the preview and the saved file match. The tool uses no third-party code or libraries.</p>
<p>It is free to use and is paid for by advertising. It is run by ${esc(site.operator)}, in Brisbane, Australia. Questions, bug reports and ideas can go to ${esc(site.contact)}.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'Your images and edits', dataHtml: '<p>Images you add are opened and edited in your browser by code that is already on the page. The image, your settings and the file you download are held in the page\'s memory only. They are never uploaded or sent to us or to anyone else, and they are not written to cookies, local storage or any other storage. They are gone when you close or reload the page.</p><p>The downloaded file is a new picture drawn by your browser. It does not carry over the original file\'s metadata, such as a GPS location. The tool does not need an account and does not ask for personal information.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool that rotates, flips and filters a picture in your browser and lets you save the result.`, ownershipHtml: '<p>Your images stay yours. We do not receive, keep or claim any right in them or in the pictures you save.</p>', processingHtml: '<p>Images are edited on your device and are not sent to us. The picture and your edits disappear when you close or reload the page.</p>', responsibilityHtml: '<p>You must have the right to edit and use any picture you open. Keep a copy of your original, because the tool saves a new file and does not change the one you opened. Saving as JPG or WebP at a lower quality reduces detail, and very large images may fail to save on devices with limited memory. Check the result before you rely on it.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea for the editor? Email us.' }) },
];

export default { site, pages, copy: [['src/tool.js', 'assets/tool.js'], ['src/filters.mjs', 'assets/filters.mjs'], ['src/transform.mjs', 'assets/transform.mjs'], ['src/pipeline.mjs', 'assets/pipeline.mjs'], ['src/sniff.mjs', 'assets/sniff.mjs']] };
