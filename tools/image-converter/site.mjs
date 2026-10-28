// Image Converter: convert JPG, PNG and WebP images in the browser, one or many at a time, and download them singly or as a ZIP.
// This file holds the pages, copy and tool markup. Layout, header, footer, SEO and styles come from /framework.
// Follows the layout order of the pilot tools (see ../qr-code/DESIGN-NOTES.md).
import { ICON, esc, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'image-converter',
  inputNoun: 'images',
  name: 'Image Converter',
  url: `${config.domain}/image-converter`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  tagline: 'Convert JPG, PNG and WebP images in your browser. Nothing is uploaded.',
  privacySummary: 'The images you choose are opened and converted inside your web browser. They are not uploaded to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  // Ads and analytics stay OFF until the owner fills these in. No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Images are converted on your device.',
  footnote2: '',
  mark: '<path d="M4 9a6 6 0 0 1 10.2-4.2L16 6.5"/><path d="M16 3v3.5h-3.5"/><path d="M20 15a6 6 0 0 1-10.2 4.2L8 17.5"/><path d="M8 21v-3.5h3.5"/>',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'home', label: 'Formats', hash: '#formats' }, { id: 'about', label: 'About' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

/* ---------- page copy ---------- */
const COPY = {
  h1: 'Free image converter',
  lead: 'Change JPG, PNG and WebP images from one format to another, one file or a whole batch. Choose the format and quality, then save each file or all of them in a ZIP. The work happens in your browser, so your images never leave your device.',
  trust: ['Nothing is uploaded', 'Several files at once', 'Free, no sign-up'],
  how: [
    ['Add your images', 'Drop files onto the box, choose them from your device, or paste an image. You can add as many as you like, and add more later.'],
    ['Pick a format', 'Choose JPG, PNG or WebP. For JPG and WebP, set the quality. For JPG, pick the colour that replaces any transparent areas.'],
    ['Save the results', 'Each file shows its size before and after. Save them one at a time, or download everything in a single ZIP file.'],
  ],
  formatsTitle: 'Three formats, three jobs',
  formats: [
    ['jpg', 'JPG', 'Small files for photos. It is lossy, so each save trades a little detail for size, and it cannot hold transparency.'],
    ['png', 'PNG', 'Exact pixels with transparency. Ideal for logos, screenshots and graphics, but photos make large files.'],
    ['webp', 'WebP', 'Usually smaller than JPG or PNG at similar quality, with transparency too. Supported by current browsers and most apps.'],
  ],
  aboutTitle: 'Choosing a format and keeping control of quality',
  aboutParas: [
    'Every image format is a different way of writing the same grid of pixels to a file. Converting reads the pixels from the original and writes them out again in the format you choose. This tool does that with the drawing features built into your web browser, so the conversion happens on your own device, using your own processor, and the files are never sent anywhere.',
    'Some conversions lose nothing and some do not. PNG is lossless: the pixels you put in are the pixels you get out. JPG and WebP can be lossy, which means they discard detail the eye is less likely to notice so the file can be smaller. The quality slider sets how much is discarded. A higher number keeps more detail and makes a larger file, and a lower number does the opposite. Between 75 and 90 suits most photos. Converting an image that is already lossy, such as a JPG saved a few times, adds a little more loss each time, so keep your original.',
    'Transparency needs a decision when you save to JPG, because JPG has no way to store it. The tool paints the image onto a solid colour first, white by default, and you can change that to match the page or print the image will sit on. PNG and WebP keep transparent areas as they are.',
    'Animated images, such as animated GIF or WebP files, are flattened to a single still frame, and the result is not animated. Metadata stored in the original, such as camera details and location, is not copied into the converted file.',
  ],
  tipsTitle: 'A few practical tips',
  tips: [
    'Use JPG for photographs you want to email or upload, and PNG for logos, text and screenshots.',
    'Start at about 85 quality and lower it until you can just see a difference, then go one step back up.',
    'Keep the original files. Converting from a converted copy can only lose detail, never restore it.',
    'For a transparent logo going to JPG, pick a background that matches where it will be used.',
  ],
  faq: [
    ['Are my images uploaded anywhere?', 'No. Your images are opened and converted by your web browser, on your device. They are not sent to us or to any other server, and they are gone when you close or reload the page. The page itself shows ads and counts visits separately, and the Privacy page explains how.'],
    ['What happens to transparent areas?', 'PNG and WebP keep transparency, so a transparent PNG converted to WebP stays transparent. JPG cannot store transparency, so the transparent areas are filled with a solid colour. It is white unless you choose another colour in the settings. Partly transparent edges blend into that colour.'],
    ['What happens to animated images?', 'They are flattened. If you add an animated GIF or WebP, the tool converts a single still frame and the result does not move. Browsers draw only that one frame to the canvas used for conversion, and this tool does not rebuild animations.'],
    ['How does quality affect file size?', 'For JPG and WebP, a lower quality setting removes more detail and gives a smaller file. A higher setting keeps more detail and gives a larger one. The relationship is not a straight line: dropping from 100 to 90 usually saves a lot, while going from 60 to 50 saves less and is more visible. PNG has no quality setting because it is lossless.'],
    ['Which format should I choose?', 'Choose JPG for photos when compatibility matters most, because almost every device and app opens it. Choose PNG for logos, screenshots, diagrams and anything that needs sharp edges or transparency. Choose WebP when you want smaller files for a website and the places you will use it support it. If you are unsure, JPG for photos and PNG for graphics is a safe default.'],
    ['Which browsers can make WebP files?', 'Opening a WebP file is widely supported, but creating one is up to the browser. Chrome, Edge and Firefox can do it. At the time of writing, Safari can open WebP files but cannot create them from a canvas, so if the WebP option is unavailable in your browser, the tool tells you and you can choose JPG or PNG instead.'],
    ['Is there a limit on file size or how many files I can add?', 'There is no set limit on the number of files, and they are converted one at a time so the page stays responsive. Images larger than 100 megapixels are refused with a message, because very large images can crash a browser tab. Phones and older computers may manage fewer large images at once than a desktop does.'],
    ['Does converting remove metadata like location?', 'Yes. The converted file is a fresh image drawn from the pixels, so details such as camera model and GPS location in the original are not copied across. Photos taken in a rotated orientation are turned the right way up before saving.'],
    ['Can I convert HEIC photos from an iPhone?', 'Not here. This tool handles JPG, PNG and WebP. If your phone saves HEIC, change its camera format to Most Compatible or share the photo as a JPG, then add it.'],
  ],
};

/* ---------- icons ---------- */
const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  upload: svg('<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14"/>', 26),
  down: svg('<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>', 18),
  zip: svg('<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M12 3.5v4M12 10.5v1.5M12 14.5v1.5"/>', 18),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>', 18),
  jpg: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3L16 12l4 4"/>'),
  png: svg('<path d="M12 3.5l7.5 4.3v8.4L12 20.5l-7.5-4.3V7.8z"/><path d="M12 12l7.5-4.2M12 12v8.5M12 12L4.5 7.8"/>'),
  webp: svg('<path d="M3.5 8l3.2 9 3.3-6.5 3.3 6.5 3.2-9"/><path d="M19.5 8v9"/>'),
  x: svg('<path d="M7 7l10 10M17 7L7 17"/>', 16),
};

/* ---------- tool markup ---------- */
const FMT = [['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']];
const seg = FMT.map(([v, t]) => `<label><input type="radio" name="format" value="${v}"${v === 'jpg' ? ' checked' : ''}><span>${t}</span></label>`).join('');

const toolHtml = () => `<section id="tool" class="tool ic-tool" data-tool aria-label="${esc(site.name)}">
  <div class="stage ic-stage" data-stage>
    <div class="ic-step"><span class="ic-num" aria-hidden="true">1</span><h2 class="ic-step-title">Your images</h2></div>
    <button type="button" class="drop ic-drop" data-drop>
      <span class="drop-icon">${I.upload}</span>
      <span class="drop-title">Drop images here</span>
      <span class="drop-sub">or click to choose files. You can also paste.</span>
      <span class="drop-types">JPG, PNG or WebP. As many as you like.</span>
    </button>
    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp" multiple hidden data-file aria-label="Choose images to convert">
    <p class="ic-status" data-status role="status" aria-live="polite" hidden></p>
    <div class="ic-bar" data-progress hidden aria-hidden="true"><i></i></div>
    <ul class="ic-results" data-results aria-label="Converted images"></ul>
    <div class="ic-actions" data-actions hidden>
      <button type="button" class="btn btn-success" data-zip>${I.zip}<span data-zip-label>Download all as ZIP</span></button>
      <button type="button" class="btn btn-ghost" data-clear>Clear all</button>
    </div>
  </div>

  <form class="panel ic-panel" data-settings autocomplete="off" novalidate onsubmit="return false">
    <div class="ic-step"><span class="ic-num" aria-hidden="true">2</span><h2 class="ic-step-title">Convert to</h2></div>
    <div class="block">
      <span class="lbl" id="ic-format-lbl">Output format</span>
      <div class="seg ic-seg" data-seg data-format-seg style="--n:3;--i:0" role="radiogroup" aria-labelledby="ic-format-lbl">${seg}</div>
      <p class="note note-warn" data-webp-note hidden>${I.info}<span>This browser cannot create WebP files. Choose JPG or PNG instead.</span></p>
    </div>

    <div class="block" data-quality-block>
      <div class="lbl-row"><label class="lbl" for="ic-quality">Quality</label><span class="ic-val num" data-quality-val>85</span></div>
      <input id="ic-quality" class="range" type="range" min="1" max="100" step="1" value="85" data-quality>
      <p class="hint">Higher keeps more detail and makes a bigger file. 75 to 90 suits most photos.</p>
    </div>

    <div class="block" data-bg-block>
      <div class="lbl-row"><label class="lbl" for="ic-bg">Background for transparent areas</label><span class="ic-val num" data-bg-val>#ffffff</span></div>
      <div class="ic-bg">
        <input id="ic-bg" class="ic-color" type="color" value="#ffffff" data-bg aria-label="Background colour">
        <div class="chips">
          <button type="button" class="chip" data-bg-chip="#ffffff" aria-pressed="true">White</button>
          <button type="button" class="chip" data-bg-chip="#000000" aria-pressed="false">Black</button>
          <button type="button" class="chip" data-bg-chip="#808080" aria-pressed="false">Grey</button>
        </div>
      </div>
      <p class="hint">JPG cannot store transparency, so clear areas are filled with this colour.</p>
    </div>

    <p class="note note-info">${I.info}<span>Animated images are flattened to a single frame. Photo details such as location are not copied across.</span></p>
  </form>
</section>`;

const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d], i) => `<li class="card p-7"><span class="ic-num ic-num-lg" aria-hidden="true">${i + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;
const formatCards = (items) => `<div class="ic-formats">${items.map(([k, t, d]) => `<article class="card ic-format"><span class="ic-format-icon">${I[k]}</span><h3 class="text-xl">${t}</h3><p class="text-ink-2">${d}</p></article>`).join('')}</div>`;

function home(ctx) {
  const body = `<main id="main">
${hero({ h1: COPY.h1, lead: COPY.lead, trustItems: COPY.trust, h1Class: 'max-w-[16ch] text-[44px] sm:text-6xl md:text-[76px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards(COPY.how)}
</section>

<section id="formats" class="wrap mt-32 scroll-mt-20">
  ${sectionHead(COPY.formatsTitle, '', 'text-4xl md:text-5xl')}
  ${formatCards(COPY.formats)}
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">${COPY.aboutTitle}</h2>${COPY.aboutParas.map((p) => `<p class="mt-5 text-lg text-ink-2">${p}</p>`).join('')}</div>
  <div class="card p-7 md:p-8 self-start"><h3 class="text-xl">${COPY.tipsTitle}</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${COPY.tips.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section id="faq" class="wrap wrap-narrow mt-32 scroll-mt-20">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(COPY.faq)}
</section>
</main>`;
  return {
    title: 'Free Image Converter: JPG, PNG and WebP, Batch and ZIP (No Upload)',
    desc: 'Convert JPG, PNG and WebP images in your browser. Convert many files at once, set quality, and download singly or as a ZIP. Nothing is uploaded.',
    body, faq: COPY.faq, tool: { category: 'MultimediaApplication' }, scripts: ['assets/tool.js'],
  };
}

const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${site.name} is a small, free tool for changing images between JPG, PNG and WebP. It was built because many online converters make you upload your pictures to a server, wait, and then download the result, when a modern browser can do the job on its own.</p>
<p>Here, your images are opened and re-saved by your web browser. You can add one file or many, choose the format and quality, and download the results one by one or together in a ZIP file. The ZIP is put together on your device too.</p>
<p>It does one job and does not edit, resize or compress to a target size. Animated images are flattened to a single frame, and HEIC photos are not supported.</p>
<p>${site.name} is made by ${site.operator}, in Brisbane, Australia. The site is paid for by advertising. If you find a problem or have an idea, use the Contact page.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'Your images', dataHtml: '<p>The images you add are read and converted inside your web browser. They are not sent to a server, not stored on one and not shared with anyone. Nothing is saved in cookies or in your browser after you close the page.</p><p>When you download a converted image or a ZIP, the file is created on your device and saved to your downloads folder. It does not pass through us.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool for converting images between JPG, PNG and WebP in your browser.`, ownershipHtml: '<p>You keep all rights in your images and in the converted copies. We claim no rights over them.</p>', processingHtml: '<p>Images are converted on your device, in your browser. We do not receive, keep or look at them.</p>', responsibilityHtml: '<p>Check each converted file before you use it or delete the original. Converting to a lossy format such as JPG or WebP discards some detail, animated images are flattened to one frame, and metadata is not kept. You are responsible for having the right to use and convert the images you add.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea? Email us.' }) },
];

export default {
  site, pages,
  copy: [['src/tool.js', 'assets/tool.js'], ['src/convert-plan.mjs', 'assets/convert-plan.mjs'], ['src/zip.mjs', 'assets/zip.mjs'], ['src/image-size.mjs', 'assets/image-size.mjs']],
};
