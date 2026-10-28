// Image Cropper: crop a picture to a box or a fixed ratio in the browser, export PNG, JPG or WebP at original resolution.
// This file holds the pages, copy and tool markup. Layout, header, footer, SEO and styles come from /framework.
import { ICON, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'image-cropper',
  inputNoun: 'images',
  name: 'Image Cropper',
  url: `${config.domain}/image-cropper`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  tagline: 'Crop an image to a box or a ratio, right in your browser.',
  privacySummary: 'The images you crop with Image Cropper stay on your device. They are opened and cut inside your web browser and are not sent to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  // Ads and analytics stay OFF until the owner fills these in (see README). No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Your images stay on your device.',
  footnote2: 'Cropping is done in your browser. Nothing is uploaded.',
  mark: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h14a2 2 0 0 1 2 2v14"/>',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'about', label: 'About' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

/* ---------- page copy ---------- */
const COPY = {
  h1: 'Free online image cropper',
  lead: 'Choose a picture, drag the crop box over the part you want, then save it as a PNG, JPG or WebP. Pick a ratio such as 1:1 or 16:9 if you need one. The picture is cut in your browser at its full original resolution, so nothing is uploaded.',
  trust: ['Nothing is uploaded', 'Original resolution kept', 'Free, no sign-up'],
  how: [
    ['Choose your image', 'Drop a picture onto the box, choose a file or paste one. JPG, PNG, WebP, GIF and BMP work. Phone photos open the right way up, even when they were taken sideways.'],
    ['Set the crop', 'Drag the box to move it and pull a handle to resize it. Pick Free, 1:1, 4:3, 3:2 or 16:9 to lock the shape, and swap between landscape and portrait. Arrow keys nudge the box one pixel at a time.'],
    ['Save the result', 'Check the size shown in pixels, choose PNG, JPG or WebP, and download. The file has exactly the pixels inside the box, taken from your original, not from the smaller preview.'],
  ],
  aboutTitle: 'Cropping without losing quality',
  aboutParas: [
    'Cropping removes the edges of a picture and keeps the rest. Nothing inside the box is resampled or squashed, so a crop is the one edit that does not make the pixels you keep any softer. What changes is the size: a 4000 by 3000 pixel photo cropped to a box 1200 pixels wide gives you a 1200 pixel wide picture, cut straight from the original.',
    'That is why the readout shows the crop in pixels of the original image, not of the smaller preview on your screen. The preview is scaled to fit the page, and every movement of the box is converted back to the full-size picture before the file is made. If you need a certain width or height afterwards, crop first and resize second, so you decide what is in the frame before you change the pixel count.',
    'A ratio is the relationship between width and height. A square is 1:1, a typical camera picture is 4:3 or 3:2, and screens and video use 16:9. Locking a ratio keeps the box in that shape while you resize it, from a corner or from a side, and it stops at the edge of the image rather than distorting. Portrait versions, such as 3:4 and 9:16, are one tap away with the orientation button.',
    'Choose the file type for where the picture is going. PNG keeps every pixel exactly and suits screenshots, logos and anything with sharp edges or transparency. JPG makes much smaller files for photographs. WebP is usually smaller again at similar quality, though a few older programs and upload forms do not accept it yet.',
  ],
  tipsTitle: 'Tips for a clean crop',
  tips: [
    'Start from the original file, not a screenshot or a copy that has already been compressed.',
    'Leave a little room around a face or subject. A crop that is too tight is hard to fix later.',
    'For a profile picture, choose 1:1 and keep the face near the middle, because many sites round the corners or crop to a circle.',
    'Zoom your browser in if you need to place an edge precisely. The arrow keys move the box one screen pixel at a time.',
    'Keep the original. A cropped file cannot get its edges back.',
  ],
  faq: [
    ['Is my image uploaded anywhere?', 'No. The picture is opened and cropped by JavaScript running in your browser, using a drawing surface on your own device. It is not sent to us or to any other server, and it is gone when you close or reload the page. The page itself shows ads and counts visits separately; the Privacy page explains how.'],
    ['What resolution is the cropped image?', 'The cropped file has exactly the pixels inside the box, taken from your original image, so a crop that reads 1200 by 800 px is saved as a 1200 by 800 px picture. The preview on screen may be smaller, but it is only a guide. Nothing is scaled up or down on export.'],
    ['Should I save as PNG, JPG or WebP?', 'PNG is lossless, so it keeps every pixel and any transparency, but photographs make large files. JPG is the safe choice for photos and is accepted almost everywhere; it has no transparency, so any transparent area becomes white. WebP is usually smaller than JPG at similar quality and supports transparency, but some older software and forms reject it. For JPG and WebP, a higher quality setting gives a larger file.'],
    ['How do I crop a profile picture?', 'Choose 1:1 to get a square, then move the box so the face sits near the middle with some space around the head and shoulders. Many sites round the corners or crop to a circle, and a little spare room stops the top of the head or the chin being clipped. Check the size the site asks for. If it wants an exact number of pixels, crop here first and then resize the square.'],
    ['Which ratio should I use for other jobs?', 'Use 16:9 for widescreen slides and video thumbnails, 4:3 for older screens and many presentations, and 3:2 for most camera photos and standard prints. Tap the orientation button for portrait, such as 9:16 for tall phone-screen pictures. Sites change their size rules from time to time, so check the current guidance from the site or print shop you are using.'],
    ['Can I crop on my phone or tablet?', 'Yes. The crop box and its handles respond to touch, and the page does not scroll while you are dragging the box. Drag inside the box to move it, or drag a handle to resize it. Pick the image from your camera roll or files with the Choose button. If you need to scroll, touch the page outside the box.'],
    ['Why is my photo rotated, or the wrong way up?', 'Phones often save a picture in its sensor orientation and add a note telling programs to turn it. This tool reads that note, so the preview and the cropped file match how the photo looked on your phone. If a picture still looks sideways, the file itself may have been saved that way by another program, and it needs rotating in a photo editor first.'],
    ['Can I use the keyboard?', 'Yes. Tab to the crop box and press the arrow keys to move it by one screen pixel, or hold Shift to move ten times as far. Hold Alt and press an arrow key to resize the box from its bottom-right corner. The size and position update in the readout beside the image.'],
    ['What images and sizes can it open?', 'It opens whatever your browser can display, normally JPG, PNG, WebP, GIF and BMP. Some browsers also open AVIF. HEIC photos from some iPhones are not supported by most browsers, so share or export them as JPG first. Images above 100 megapixels are refused, because most devices cannot hold them in memory safely.'],
    ['Can I crop to an exact number of pixels?', 'The box snaps to whole pixels and the readout shows its size, but this tool does not take typed dimensions. A locked ratio gives the shape, and the size comes from how large you make the box. If a form needs exact dimensions, crop to the right shape here and then resize the result to the exact width and height.'],
  ],
};

/* ---------- icons ---------- */
const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  upload: svg('<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>', 24),
  swap: svg('<path d="M7 4L4 7l3 3M4 7h12M17 20l3-3-3-3M20 17H8"/>', 16),
  down: svg('<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>', 18),
  shield: svg('<path d="M12 3l7 3v5.5c0 4.3-3 7.9-7 9.5-4-1.6-7-5.2-7-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>', 18),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5M4 4v4.5h4.5"/>', 16),
  warn: svg('<path d="M12 3.5l9 15.5H3z"/><path d="M12 10v4M12 16.6v.1"/>', 18),
};

/* ---------- tool markup ---------- */
const RATIOS = [['free', 'Free'], ['1:1', '1:1'], ['4:3', '4:3'], ['3:2', '3:2'], ['16:9', '16:9']];
const FORMATS = [['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WebP']];

function toolHtml() {
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => `<span class="cr-h cr-h-${h}" data-h="${h}"></span>`).join('');
  return `<section id="tool" class="tool cr-tool" data-tool data-state="empty" aria-label="Image cropper">

  <div class="stage cr-stage" data-stage>
    <div class="busy" data-busy hidden><span class="spin"></span>Working&hellip;</div>
    <div class="note note-bad cr-err" data-err role="alert" hidden>${I.warn}<span data-err-text></span></div>
    <button type="button" class="drop" data-drop>
      <span class="drop-icon">${I.upload}</span>
      <span class="drop-title">Drop an image here</span>
      <span class="drop-sub">or click to choose one. You can also paste.</span>
      <span class="drop-types">JPG, PNG, WebP, GIF or BMP</span>
    </button>
    <input type="file" accept="image/*" hidden data-file aria-label="Choose an image">
    <div class="cr-work" data-work hidden>
      <div class="cr-top">
        <div class="cr-file"><span class="cr-file-name" data-name></span><span class="cr-file-dim num" data-orig-dim></span></div>
        <button type="button" class="chip" data-choose>Choose another</button>
      </div>
      <div class="cr-frame" data-frame>
        <div class="cr-view" data-view>
          <div class="cr-clip"><canvas class="cr-canvas" data-canvas aria-hidden="true"></canvas><div class="cr-dim" data-dim></div></div>
          <div class="cr-box" data-box tabindex="0" role="group" aria-label="Crop area" aria-describedby="cr-keys"><span class="cr-grid" aria-hidden="true"></span>${handles}</div>
        </div>
      </div>
      <p class="hint cr-keys" id="cr-keys">Drag the box to move it and a handle to resize it. With the box selected, arrow keys move it (Shift for larger steps) and Alt plus arrow keys resize it.</p>
    </div>
  </div>

  <form class="panel cr-panel" data-panel autocomplete="off" novalidate onsubmit="return false">
    <div class="cr-step"><span class="cr-num" aria-hidden="true">1</span><h2 class="cr-step-title">Shape</h2></div>
    <div class="cr-f">
      <div class="lbl-row"><span class="lbl" id="cr-ratio-lbl">Ratio</span><button type="button" class="chip cr-swap" data-swap aria-label="Swap orientation between landscape and portrait">${I.swap}Swap</button></div>
      <div class="cr-ratios" role="group" aria-labelledby="cr-ratio-lbl">${RATIOS.map(([v, t]) => `<button type="button" class="chip cr-ratio" data-ratio="${v}" aria-pressed="${v === 'free'}">${t}</button>`).join('')}</div>
    </div>
    <dl class="cr-facts" data-facts>
      <div class="cr-fact-main"><dt>Crop size</dt><dd class="num" data-out-size>&ndash;</dd></div>
      <div><dt>From left, top</dt><dd class="num" data-out-pos>&ndash;</dd></div>
      <div><dt>Original</dt><dd class="num" data-out-orig>&ndash;</dd></div>
    </dl>
    <p class="cr-sr" role="status" aria-live="polite" data-sr></p>

    <div class="cr-step"><span class="cr-num" aria-hidden="true">2</span><h2 class="cr-step-title">Save</h2></div>
    <div class="cr-f">
      <span class="lbl" id="cr-fmt-lbl">Format</span>
      <div class="seg" data-seg style="--n:3;--i:0" role="radiogroup" aria-labelledby="cr-fmt-lbl" data-formats>
        ${FORMATS.map(([v, t], i) => `<label><input type="radio" name="format" value="${v}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}
      </div>
      <p class="hint" data-fmt-hint>PNG keeps every pixel and any transparency.</p>
    </div>
    <div class="cr-f" data-quality-wrap hidden>
      <div class="lbl-row"><label class="lbl" for="cr-quality">Quality</label><output class="cr-val num" for="cr-quality" data-quality-out>92</output></div>
      <input type="range" class="range" id="cr-quality" min="40" max="100" step="1" value="92" data-quality>
    </div>
    <div class="panel-actions">
      <button type="button" class="btn btn-primary" data-download disabled>${I.down}Download cropped image</button>
      <button type="button" class="btn btn-ghost" data-reset disabled>${I.reset}Reset crop</button>
    </div>
    <p class="cr-result" data-result aria-live="polite"></p>
    <p class="note note-good cr-priv">${I.shield}<span><strong>Nothing leaves your device.</strong> The image is opened and cropped in this tab, and the file is saved straight from your browser.</span></p>
  </form>
</section>`;
}

/* ---------- content pieces ---------- */
const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d], i) => `<li class="card cr-how p-7"><span class="cr-num cr-num-lg" aria-hidden="true">${i + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;

/** Small diagram: a picture, the dimmed outside and the kept box with handles. */
const DIAGRAM = `<svg viewBox="0 0 320 190" class="h-auto w-full" role="img" aria-label="A picture with a bright crop box inside it. The area outside the box is dimmed. Small handles sit on the corners and sides of the box.">
  <rect x="20" y="14" width="280" height="162" rx="10" fill="#232950"/>
  <circle cx="232" cy="52" r="15" fill="#fbc265" opacity=".85"/>
  <path d="M20 150l62-52 44 36 36-30 74 60v12a10 10 0 0 1-10 10H30a10 10 0 0 1-10-10z" fill="#4f8dff" opacity=".55"/>
  <path d="M20 24a10 10 0 0 1 10-10h270v162H20z" fill="none"/>
  <path fill-rule="evenodd" d="M30 14h260a10 10 0 0 1 10 10v142a10 10 0 0 1-10 10H30a10 10 0 0 1-10-10V24a10 10 0 0 1 10-10zM84 44h156v102H84z" fill="#0b0e1f" opacity=".62"/>
  <rect x="84" y="44" width="156" height="102" fill="none" stroke="#fff" stroke-width="2"/>
  <path d="M136 44v102M188 44v102M84 78h156M84 112h156" stroke="#fff" stroke-width="1" opacity=".35"/>
  <g fill="#fff"><circle cx="84" cy="44" r="5"/><circle cx="240" cy="44" r="5"/><circle cx="84" cy="146" r="5"/><circle cx="240" cy="146" r="5"/><circle cx="162" cy="44" r="4"/><circle cx="162" cy="146" r="4"/><circle cx="84" cy="95" r="4"/><circle cx="240" cy="95" r="4"/></g>
  <text x="162" y="100" text-anchor="middle" fill="#f3f4fb" font-size="13" font-weight="650">1200 &#215; 800 px</text>
</svg>`;

function home(ctx) {
  const body = `<main id="main">
${hero({ h1: COPY.h1, lead: COPY.lead, trustItems: COPY.trust, h1Class: 'max-w-[16ch] text-[44px] sm:text-6xl md:text-[76px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards(COPY.how)}
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">${COPY.aboutTitle}</h2>${COPY.aboutParas.map((p) => `<p class="mt-5 text-lg text-ink-2">${p}</p>`).join('')}</div>
  <div class="card p-7 md:p-8"><figure class="m-0">${DIAGRAM}</figure><h3 class="mt-6 text-xl">${COPY.tipsTitle}</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${COPY.tips.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(COPY.faq)}
</section>
</main>`;
  return {
    title: 'Free Image Cropper: Crop to 1:1, 4:3, 16:9 or Any Size Online',
    desc: 'Crop a picture online with a draggable box and ratio presets. Save PNG, JPG or WebP at the original resolution. Works on phones. Nothing is uploaded.',
    body, faq: COPY.faq, tool: { category: 'MultimediaApplication' }, scripts: ['assets/tool.js'],
  };
}

const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${site.name} is a small, free tool for cutting a picture down to the part you want. It was built because many online croppers ask for an upload, add a watermark, or hand back a smaller file than the one you put in.</p>
<p>Here, the picture is opened inside your web browser and drawn onto a canvas. You move and resize a crop box over a preview, and when you download, the browser copies exactly the pixels inside the box from the full-size original into a new file. You can lock the box to a ratio such as 1:1, 4:3, 3:2 or 16:9, nudge it with the arrow keys, and save as PNG, JPG or WebP.</p>
<p>It uses no third-party code or libraries. The page makes no requests to send your image anywhere, and nothing is stored after you close it.</p>
<p>${site.name} is made by ${site.operator}, in Brisbane, Australia. The site is paid for by advertising. If you find a problem or have an idea, use the Contact page.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you open', dataHtml: '<p>The image you choose, drop or paste is read by your web browser and drawn on a canvas on your device. It is not sent to a server, not stored on one and not shared with anyone. Nothing is saved in cookies or in your browser after you leave the page.</p><p>When you download the cropped picture, the file is created on your device and saved to your downloads folder, or offered through your phone&rsquo;s share sheet. It does not pass through us.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool for cropping images in your browser.`, ownershipHtml: '<p>You own your images and the cropped files you make. We claim no rights over them.</p>', processingHtml: '<p>Images are opened and cropped on your device, in your browser. We do not receive, keep or look at them.</p>', responsibilityHtml: '<p>You are responsible for having the right to use and edit the images you open. Cropping is permanent in the file you save, so keep your original. Check the result before you rely on it, for example before you submit it to a form that has size, shape or format rules, which we cannot control.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea? Email us.' }) },
];

export default {
  site, pages,
  copy: [['src/tool.js', 'assets/tool.js'], ['src/crop-math.mjs', 'assets/crop-math.mjs']],
};
