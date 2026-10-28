// Image Resizer: resize one or many images by pixels or percent in the browser, then save PNG, JPG or WebP.
// This file holds the pages, copy and tool markup. Layout, header, footer, SEO and styles come from /framework.
import { ICON, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';
import { PRESETS } from './src/resize-math.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'image-resizer',
  inputNoun: 'images',
  name: 'Image Resizer',
  url: `${config.domain}/image-resizer`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  tagline: 'Resize images by pixels or percent, right in your browser.',
  privacySummary: 'The images you choose in the Image Resizer stay on your device. They are resized inside your web browser and are not sent to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  // Ads and analytics stay OFF until the owner fills these in (see README). No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Your images are resized on your device and never uploaded.',
  footnote2: 'Platform names mentioned on this site belong to their owners. This site is independent and not affiliated with any of them.',
  mark: '<path d="M4 9V4h5M20 15v5h-5"/><path d="M4 4l6.5 6.5M20 20l-6.5-6.5"/><rect x="9" y="9" width="6" height="6" rx="1.2"/>',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'about', label: 'About' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

/* ---------- page copy ---------- */
const COPY = {
  h1: 'Free image resizer',
  lead: 'Change the size of one image or a whole batch. Type exact pixels or choose a percentage, keep the shape or crop to fit, then save a PNG, JPG or WebP. Your pictures are resized in your browser and never uploaded.',
  trust: ['Nothing is uploaded', 'Free, no sign-up', 'PNG, JPG and WebP'],
  how: [
    ['Add your images', 'Drop one or several images onto the page, choose them from your files or paste one. Each shows its current size in pixels and as a file.'],
    ['Set the new size', 'Type a width and height, pick a common size, or switch to percent. With the lock on, changing one side updates the other so nothing looks squashed.'],
    ['Check and save', 'Each image shows its new dimensions and file size beside the original. Choose a format, then download the results one by one.'],
  ],
  featuresTitle: 'What you can control',
  features: [
    ['pixels', 'Pixels or percent', 'Ask for an exact width and height, or scale everything to a percentage of its current size.'],
    ['lock', 'Aspect ratio lock', 'Keep the original proportions, or switch the lock off to force both sides.'],
    ['crop', 'Stretch, fit or fill', 'When the new shape differs, stretch the picture, fit it inside a background colour, or fill the frame and crop the edges.'],
    ['format', 'PNG, JPG or WebP', 'Choose the format and, for JPG and WebP, a quality level that trades detail for file size.'],
  ],
  aboutTitle: 'Resizing without ruining the picture',
  aboutParas: [
    'Resizing means changing how many pixels wide and tall an image is. A phone photo might be 4,000 pixels across, which is far more than a website, an email or a profile picture needs. Making it smaller means a lighter file that loads and sends faster, and a picture that fits the space it is going into.',
    'Making an image smaller is safe, because the tool is only throwing away detail you can not see at the new size. Making it larger is different. The extra pixels are guesses blended from their neighbours, so the picture gets bigger but not sharper. If you must enlarge, do it in small steps and expect softness.',
    'Most trouble comes from the shape. If the new width and height do not match the original proportions, something has to give. Stretch squashes the picture, fit keeps all of it and fills the spare space with a colour, and fill keeps the shape but trims the edges to cover the frame. Leave the lock on if you only care about one side, such as a width of 1,200 pixels, and the height follows by itself.',
    'For big reductions the tool shrinks the image in several stages, roughly halving it each time, and uses the browser&rsquo;s high-quality smoothing at each stage. This keeps fine detail such as text and hair cleaner than one huge jump would. The common sizes listed in the tool are plain pixel dimensions, such as a 1080 by 1080 square or a 1200 by 630 link preview. Sites change their requirements from time to time, so check the size your destination asks for.',
  ],
  tipsTitle: 'Tips for a clean result',
  tips: [
    'Keep your original file. Resize a copy, because shrinking and re-saving a JPG loses detail each time.',
    'Resize once, straight from the largest version you have, rather than resizing a resized picture.',
    'Use PNG for screenshots, logos and anything with sharp edges or transparency. Use JPG or WebP for photos.',
    'Check the limits of where the picture is going. Many forms cap both pixels and file size.',
  ],
  faq: [
    ['Are my images uploaded anywhere?', 'No. The resizing is done by your browser using the canvas feature built into it. The images are read from your device, drawn at the new size and saved back to your device. Nothing is sent to our servers or anyone else’s, and nothing is kept after you close or reload the page. The page itself shows ads and counts visits separately, which the Privacy page explains.'],
    ['What is the difference between resizing and compressing?', 'Resizing changes the pixel dimensions, so the picture has fewer or more dots. Compressing keeps the dimensions but stores the same dots in a smaller file, usually by discarding detail you are unlikely to notice. This tool resizes, and the quality slider for JPG and WebP also affects file size. A smaller picture usually gives a smaller file, but it is not guaranteed, so check the “After” size shown for each image.'],
    ['Can I make a small image bigger and keep it sharp?', 'No. Enlarging can only spread the existing pixels over a larger area and blend them, so the picture gets bigger but not more detailed. Small enlargements often look acceptable. Large ones look soft or blocky. If you need a bigger picture, go back to a higher-resolution original if there is one.'],
    ['What does the lock aspect ratio switch do?', 'Aspect ratio is the proportion of width to height. With the lock on, you set one side and the other is worked out from each image’s own shape, rounded to whole pixels, so the picture is not stretched. Turn the lock off to type both sides yourself. If the new shape differs from the original, the Stretch, Fit and Fill options decide what happens.'],
    ['Which format should I choose, PNG, JPG or WebP?', 'JPG suits photographs and is accepted almost everywhere, but it has no transparency and loses a little detail each time it is saved. PNG keeps every pixel exactly and supports transparency, which suits screenshots, logos and diagrams, though photo files can be large. WebP is usually smaller than JPG at similar quality and supports transparency, but a few older programs and upload forms do not accept it. If you are unsure, pick JPG for photos and PNG for graphics.'],
    ['What is the difference between dpi and pixels?', 'Pixels are the actual dots in the image, and they decide how much detail it holds and how big it looks on a screen. Dpi, or dots per inch, only says how large those pixels should print on paper. A 413 by 531 pixel image prints at about 35 by 45 millimetres at 300 dpi, or much larger at a lower dpi. This tool sets pixels. It does not write a dpi value into the saved file, so work out the pixels you need from the print size and resolution you want.'],
    ['Why is there a limit on how large the result can be?', 'Browsers keep a resized image in memory, and very large ones can crash the tab. The tool refuses source images above 100 megapixels, and results with a side longer than 16,384 pixels or more than 100 megapixels in total. If you reach a limit, the message beside the image says so, and a smaller size will work.'],
    ['Why does a resized file sometimes come out larger?', 'This usually happens when a JPG is saved as PNG, or when a small image is enlarged. PNG stores every pixel without discarding detail, so photos saved as PNG are large. Choose JPG or WebP and lower the quality slider for a lighter file.'],
    ['Why does an image I choose not open?', 'The tool can open the image types your browser can show, which normally means JPG, PNG, WebP, GIF, BMP and in recent browsers AVIF. Some formats, such as HEIC from iPhones, are not supported by most browsers. Export the photo as JPG first, or use your phone’s share option to send it as a JPG.'],
  ],
};

/* ---------- icons ---------- */
const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  pixels: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 18),
  unlock: svg('<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-1.9"/>', 18),
  crop: svg('<path d="M7 3v13a1 1 0 0 0 1 1h13M3 7h13a1 1 0 0 1 1 1v13"/>'),
  format: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>'),
  up: svg('<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>', 24),
  down: svg('<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>', 18),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 18),
  shield: svg('<path d="M12 3l7 3v5.5c0 4.3-3 7.9-7 9.5-4-1.6-7-5.2-7-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>', 18),
};

/* ---------- tool markup ---------- */
const seg = (name, n, opts, checked, extra = '') => `<div class="seg ${extra}" data-seg style="--n:${n};--i:${opts.findIndex(([v]) => v === checked)}" role="radiogroup" aria-label="${name}">${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}"${v === checked ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>`;
const num = (id, label, attrs, suffix) => `<div class="rs-f"><label class="lbl" for="${id}">${label}</label><div class="field"><input id="${id}" inputmode="numeric" autocomplete="off" spellcheck="false" ${attrs}><span class="suffix">${suffix}</span></div></div>`;

function toolHtml() {
  const presets = PRESETS.map((p) => `<button type="button" class="chip rs-chip" data-preset data-w="${p.w}" data-h="${p.h}" aria-pressed="false"${p.title ? ` title="${p.title}"` : ''}><b>${p.label}</b><span class="num">${p.w}&times;${p.h}</span></button>`).join('');
  const pct = [25, 50, 75, 150, 200].map((v) => `<button type="button" class="chip" data-pct-chip="${v}" aria-pressed="false">${v}%</button>`).join('');
  return `<section id="tool" class="tool rs-tool" data-tool aria-label="Image resizer">

  <div class="stage rs-stage" data-stage>
    <div class="err" data-err hidden></div>
    <button type="button" class="drop" data-drop>
      <span class="drop-icon">${I.up}</span>
      <span class="drop-title">Drop images here</span>
      <span class="drop-sub">or click to choose one or several. You can also paste.</span>
      <span class="drop-types">JPG, PNG, WebP, GIF, BMP or AVIF</span>
    </button>
    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif" multiple hidden data-file aria-label="Choose images">
    <div class="rs-files" data-files hidden>
      <div class="rs-bar">
        <p class="rs-status" data-status aria-live="polite"></p>
        <div class="rs-bar-btns">
          <button type="button" class="chip" data-add>${I.plus}<span>Add more</span></button>
          <button type="button" class="chip" data-clear>Clear all</button>
        </div>
      </div>
      <ul class="rs-list m-0 list-none p-0" data-list></ul>
    </div>
    <p class="note note-good rs-private">${I.shield}<span><strong>Nothing leaves your device.</strong> Images are resized by your browser and saved straight back to your downloads.</span></p>
  </div>

  <form class="panel rs-panel" data-panel autocomplete="off" novalidate onsubmit="return false">
    <div class="block"><span class="lbl">Resize by</span>${seg('mode', 2, [['pixels', 'Pixels'], ['percent', 'Percent']], 'pixels')}</div>

    <div class="block" data-sec="pixels">
      <div class="rs-dims">
        ${num('rs-w', 'Width', 'data-w maxlength="5" placeholder="1080"', 'px')}
        <button type="button" class="rs-lock" data-lock aria-pressed="true" aria-label="Keep aspect ratio" title="Keep aspect ratio"><span class="rs-lock-on">${I.lock}</span><span class="rs-lock-off">${I.unlock}</span></button>
        ${num('rs-h', 'Height', 'data-h maxlength="5" placeholder="1080"', 'px')}
      </div>
      <p class="hint" data-lock-hint>Aspect ratio is locked: change one side and the other follows.</p>
      <div class="rs-presets-wrap">
        <span class="lbl" id="rs-presets-lbl">Common sizes</span>
        <div class="rs-presets" role="group" aria-labelledby="rs-presets-lbl">${presets}</div>
        <p class="hint">Plain pixel sizes often used for social posts, link previews and photo uploads. Platforms change their rules, so check yours.</p>
      </div>
    </div>

    <div class="block" data-sec="percent" hidden>
      <div class="rs-f"><label class="lbl" for="rs-pct">Scale to</label><div class="field"><input id="rs-pct" inputmode="decimal" autocomplete="off" spellcheck="false" data-pct maxlength="6" value="50" placeholder="50"><span class="suffix">% of original</span></div></div>
      <div class="chips rs-chips">${pct}</div>
      <p class="hint">Each image is scaled by the same percentage, so every picture keeps its own shape.</p>
    </div>

    <div class="block" data-sec="fit" hidden>
      <span class="lbl" id="rs-fit-lbl">When the shape differs</span>
      ${seg('fit', 3, [['stretch', 'Stretch'], ['fit', 'Fit'], ['fill', 'Fill']], 'fill', 'rs-fit')}
      <p class="hint" data-fit-hint></p>
    </div>

    <div class="block" data-sec="bg" hidden>
      <div class="lbl-row"><label class="lbl" for="rs-bg-hex">Background colour</label></div>
      <div class="rs-bg">
        <input type="color" id="rs-bg" value="#ffffff" data-bg aria-label="Pick background colour">
        <div class="field"><input id="rs-bg-hex" value="#FFFFFF" maxlength="7" spellcheck="false" autocapitalize="off" data-bg-hex aria-label="Background colour as hex"></div>
      </div>
      <label class="check" data-transparent-row hidden><input type="checkbox" data-transparent><span>Transparent background</span></label>
    </div>

    <div class="block">
      <span class="lbl">Save as</span>
      ${seg('format', 3, [['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WebP']], 'jpeg')}
      <div class="rs-q" data-q-wrap>
        <div class="lbl-row"><label class="lbl" for="rs-q">Quality</label><output class="rs-val num" for="rs-q" data-q-out>90</output></div>
        <input type="range" class="range" id="rs-q" min="40" max="100" step="1" value="90" data-q>
      </div>
      <p class="hint" data-format-hint></p>
    </div>
    <p class="note note-warn" data-setting-msg hidden role="status"></p>
  </form>
</section>`;
}

/* ---------- content pieces ---------- */
const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d], i) => `<li class="card rs-how p-7"><span class="rs-num" aria-hidden="true">${i + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;
const featureCards = (items) => `<div class="rs-features">${items.map(([k, t, d]) => `<article class="card rs-feature"><span class="rs-feature-icon">${I[k]}</span><h3 class="text-xl">${t}</h3><p class="text-ink-2">${d}</p></article>`).join('')}</div>`;

const MODES = `<svg viewBox="0 0 320 150" class="h-auto w-full" role="img" aria-label="The same wide picture placed in a square frame three ways: stretched out of shape, fitted whole with spare background, and filled with the edges cropped.">
  ${[['Stretch', 8], ['Fit', 112], ['Fill', 216]].map(([t, x]) => `<g transform="translate(${x} 10)"><rect width="96" height="96" rx="8" fill="#232850" stroke="#8b91b3" stroke-width="1.2"/>${
    t === 'Stretch' ? '<rect x="2" y="2" width="92" height="92" rx="6" fill="#6d5dfc"/><circle cx="48" cy="48" r="26" fill="#5ee3a4"/>' :
    t === 'Fit' ? '<rect x="2" y="26" width="92" height="44" rx="4" fill="#6d5dfc"/><circle cx="48" cy="48" r="17" fill="#5ee3a4"/>' :
    '<rect x="2" y="2" width="92" height="92" rx="6" fill="#6d5dfc"/><circle cx="48" cy="48" r="17" fill="#5ee3a4"/>'}<text x="48" y="124" text-anchor="middle" fill="#f3f4fb" font-size="13" font-weight="650">${t}</text></g>`).join('')}
</svg>`;

/* ---------- pages ---------- */
function home(ctx, page) {
  const body = `<main id="main">
${hero({ h1: COPY.h1, lead: COPY.lead, trustItems: COPY.trust, h1Class: 'max-w-[16ch] text-[44px] sm:text-6xl md:text-[76px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards(COPY.how)}
</section>

<section class="wrap mt-32">
  ${sectionHead(COPY.featuresTitle, '', 'text-4xl md:text-5xl')}
  ${featureCards(COPY.features)}
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">${COPY.aboutTitle}</h2>${COPY.aboutParas.map((p) => `<p class="mt-5 text-lg text-ink-2">${p}</p>`).join('')}</div>
  <div class="card p-7 md:p-8"><figure class="m-0">${MODES}</figure><h3 class="mt-6 text-xl">${COPY.tipsTitle}</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${COPY.tips.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(COPY.faq)}
</section>
</main>`;
  return {
    title: 'Free Image Resizer: Change Size by Pixels or Percent (No Upload)',
    desc: 'Resize one or many images by pixels or percent. Lock the aspect ratio, pick a common size, save PNG, JPG or WebP. Runs in your browser; nothing is uploaded.',
    body, faq: COPY.faq, tool: { category: 'MultimediaApplication' }, scripts: ['assets/tool.js'],
  };
}

const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${site.name} is a small, free tool for changing the size of pictures. It was built because most online resizers make you upload your photos to a server, add a watermark or sign up before you can save a result.</p>
<p>Here, the picture never leaves your device. Your browser reads each image, redraws it at the new size using its own high-quality scaling, and hands the result back as a download. You can type exact pixels or a percentage, keep or release the aspect ratio, choose how to handle a different shape, and save as PNG, JPG or WebP.</p>
<p>The common sizes in the tool are plain pixel dimensions, offered as starting points. Websites and apps change their requirements, so always check the size your destination asks for.</p>
<p>${site.name} is made by ${site.operator}, in Brisbane, Australia. The site is paid for by advertising. If you find a problem or have an idea, use the Contact page.</p>
<p><small>Any platform or product names mentioned are the property of their owners. This site is independent and is not affiliated with or endorsed by them.</small></p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'Your images', dataHtml: '<p>The images you choose or drop are read and resized inside your web browser. They are not uploaded, not stored on a server and not shared with anyone. Nothing is saved in cookies or in your browser after you leave the page.</p><p>When you download a result, the file is created on your device and saved to your downloads folder. It does not pass through us.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool for resizing images in your browser.`, ownershipHtml: '<p>You keep all rights to your images and to the resized copies. We claim no rights over them.</p>', processingHtml: '<p>Images are processed on your device, in your browser. We do not receive, keep or look at them.</p>', responsibilityHtml: '<p>Resizing changes your picture, and saving as JPG or WebP can reduce quality. Keep your original files. You are responsible for having the right to edit and use the images you resize. Results depend on your browser and device, and very large images may fail on devices with little memory.</p><p>Platform and product names mentioned on this site belong to their owners. This site is not affiliated with them.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea? Email us.' }) },
];

export default {
  site, pages,
  copy: [['src/tool.js', 'assets/tool.js'], ['src/resize-math.mjs', 'assets/resize-math.mjs']],
};
