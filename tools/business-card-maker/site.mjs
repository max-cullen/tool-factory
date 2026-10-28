// Business Card Maker: design a 90 x 55 mm business card in the browser, download PNG or PDF.
// This file holds the pages, copy and tool markup. Layout, header, footer, SEO and styles come from /framework.
// Design notes and the list of data- hooks: DESIGN-NOTES.md.
import { ICON, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';
import { LAYOUTS, FONTS, buildFront } from './src/layouts.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'business-card-maker',
  inputNoun: 'text',
  name: 'Business Card Maker',
  url: `${config.domain}/business-card-maker`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  tagline: 'Design a business card and download it as a print-ready PNG or PDF, right in your browser.',
  privacySummary: 'What you type into the Business Card Maker, and any logo you choose, stays on your device. The card is drawn inside your web browser and nothing you enter is sent to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  // Ads and analytics stay OFF until the owner fills these in (see README). No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Cards are made on your device. Nothing is uploaded.',
  footnote2: 'Designs are original layouts drawn for this tool. No logos or artwork are included.',
  mark: '<rect x="2.5" y="6" width="19" height="12" rx="2.2"/><path d="M6 10.5h6M6 13.5h3.5M15.5 10v4"/>',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'about', label: 'About' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

/* ---------- page copy ---------- */
const COPY = {
  h1: 'Free business card maker',
  lead: 'Type your details, pick one of six layouts, choose your colours and a font, then download a print-ready PNG or a PDF at the standard 90 x 55 mm size. It is all drawn in your browser, so your details and logo never leave your device.',
  trust: ['Standard 90 x 55 mm', 'Made in your browser', 'Free, no sign-up'],
  how: [
    ['Add your details', 'Fill in as many or as few fields as you like: name, title, company, phone, email, website and address. Anything you leave empty is dropped and the rest closes up neatly.'],
    ['Choose the look', 'Pick a layout, set the background, text and accent colours, choose a font and add your own logo if you have one. A contrast check warns you when small print would be hard to read.'],
    ['Download and print', 'Save a 300 dpi PNG or a PDF sized to the millimetre, with an optional 3 mm bleed. Take it to a print shop, or print it at home on card stock and trim along the edge.'],
  ],
  layoutsTitle: 'Six layouts, drawn from scratch',
  layoutsLead: 'Every layout is built from plain shapes and text, so nothing is borrowed from a template library. Each one adapts when you leave fields empty or add a logo.',
  aboutTitle: 'Making a card that prints well',
  aboutParas: [
    'In Australia the common business card is 90 x 55 mm, which is what this tool makes. Cards in the United States are 3.5 x 2 inches, and much of Europe uses 85 x 55 mm, so check the size your printer expects if you are ordering from overseas.',
    'Print shops usually ask for artwork at 300 dpi. At that resolution a 90 x 55 mm card is 1063 x 650 pixels, which is the size of the print PNG here. Many shops also want bleed: an extra 3 mm of background on every side, which gets trimmed off. If a design runs to the edge, bleed stops a thin white line showing where the blade was a fraction off. Tick the bleed option and the download grows to 96 x 61 mm, with the PDF marking the trim size inside it.',
    'Keep important text and logos inside the safe area, about 4 mm from the trim edge. The dashed guide on the preview shows it, and the guide is never part of the download. Text smaller than about 6 point gets hard to read once it is printed, so the layouts shrink long lines only down to a sensible limit and then shorten them with an ellipsis.',
    'Fonts come from your own device. The font choices here are everyday system families, with fallbacks, so the card is drawn the same way you see it. The finished PNG and PDF carry the picture of the text, so the person printing it does not need the font installed.',
  ],
  tipsTitle: 'Before you print',
  tips: [
    'Read every line out loud, then check the phone number and email one digit at a time.',
    'Print one copy at home at 100% scale first and hold it up against a real card.',
    'Dark text on a light background is the easiest to read in small print.',
    'Leave some empty space. A crowded card is harder to remember than a plain one.',
  ],
  faq: [
    ['Is anything I type or upload sent anywhere?', 'No. The card is drawn by JavaScript running in your browser. Your details and any logo you choose stay on your device, and nothing is kept after you close the page. Downloads are created on your device too. The page itself shows ads and counts visits separately, and the Privacy page explains how.'],
    ['What size is a standard business card?', 'In Australia the usual size is 90 x 55 mm, which is what this tool uses. The United States and Canada use 3.5 x 2 inches (89 x 51 mm), and much of Europe uses 85 x 55 mm. If your cards will be printed in another country, ask the printer for their size before you finish the design.'],
    ['What are bleed and safe margins, and what resolution should I use?', 'Bleed is extra background that runs past the trim line, usually 3 mm on each side, so a small cutting error does not leave a white edge. The safe margin is the space inside the trim, about 4 mm here, where text and logos should stay. For resolution, 300 dpi is the usual print standard: 1063 x 650 pixels for a 90 x 55 mm card. The screen PNG is smaller and meant for email or social profiles.'],
    ['How do I print my card at home or at a print shop?', 'At a print shop, send the PDF (or the 300 dpi PNG) and ask for 90 x 55 mm cards. Tick the bleed option first if they ask for bleed. At home, print the PDF at 100% or actual size, with page scaling off, on thick matte paper or card stock, then cut along the card edge with a ruler and a sharp blade. Home printers rarely print to the very edge, so a bleed version gives you room to trim.'],
    ['Which fonts can I use?', 'Four families: a clean sans, a classic serif, a humanist sans and a typewriter style. They are the fonts already installed on your device, with fallbacks, so nothing is downloaded. The exact letter shapes depend on your device, but the PNG and PDF you download contain exactly what you see in the preview.'],
    ['Can I add a logo?', 'Yes. Choose a PNG, JPEG, WebP or SVG file from your device. It is scaled to fit its space without stretching and never uploaded. A logo with a transparent background works best on coloured areas. You can remove it at any time, and the layout goes back to showing your initials where it has room.'],
    ['Can I make a back for the card?', 'Yes. Turn on the back side to get either a solid accent colour with a thin frame, or a light back that shows your logo. The text defaults to your company name and website, or you can write your own line. When the back is on, the PDF has two pages, front then back.'],
    ['Do I need to credit this site or pay for the cards I make?', 'No. The tool is free, and the cards you make are yours to use for any purpose. We claim no rights over them. You are responsible for having the right to use any logo or text you put on a card.'],
  ],
};

/* ---------- icons ---------- */
const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  down: svg('<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>', 18),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/>', 18),
  file: svg('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>', 18),
  shield: svg('<path d="M12 3l7 3v5.5c0 4.3-3 7.9-7 9.5-4-1.6-7-5.2-7-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>', 18),
  upload: svg('<path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19.5h14"/>', 18),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 16),
};

/* ---------- tool markup ---------- */
const SAMPLE = { name: 'Alex Taylor', title: 'Landscape Designer', company: 'Taylor Garden Studio', phone: '0400 000 000', email: 'alex@example.com', website: 'example.com.au', address: '1 Example Street, Brisbane QLD 4000' };
const PRESETS = [
  ['Paper and ember', '#ffffff', '#16181d', '#c8421a'],
  ['Midnight teal', '#0f1b2d', '#f2f5f9', '#4fd1c5'],
  ['Moss', '#f5f2e8', '#1e2a22', '#2f6f4f'],
  ['Plum', '#ffffff', '#2b1b33', '#8a2f7a'],
  ['Harbour', '#eef2f7', '#18222e', '#1f56c4'],
];

const f = ({ id, label, opt = true, attrs = '', hint = '' }) => `<div class="bc-f">
  <div class="lbl-row"><label class="lbl" for="${id}">${label}</label>${opt ? '<span class="bc-opt">Optional</span>' : ''}</div>
  <div class="field"><input id="${id}" ${attrs}></div>
  ${hint ? `<p class="hint">${hint}</p>` : ''}
</div>`;
const fld = (key, label, extra = '', placeholder = '') => f({ id: `bc-${key}`, label, attrs: `name="${key}" autocomplete="off" data-field="${key}" value="${SAMPLE[key].replace(/"/g, '&quot;')}" placeholder="${placeholder}" ${extra}` });

const colorBox = (key, label, value) => `<div class="bc-color"><input type="color" id="bc-${key}" value="${value}" data-c="${key}" aria-label="Pick ${label.toLowerCase()} colour"><div class="bc-color-txt"><label for="bc-${key}-hex">${label}</label><input id="bc-${key}-hex" value="${value.toUpperCase()}" maxlength="7" spellcheck="false" autocapitalize="off" data-c-hex="${key}"></div></div>`;

function toolHtml() {
  const layouts = LAYOUTS.map((l, i) => `<label class="bc-pick bc-layout" title="${l.blurb}"><input type="radio" name="layout" value="${l.id}"${i === 0 ? ' checked' : ''}><canvas width="180" height="110" data-thumb="${l.id}" aria-hidden="true"></canvas><span>${l.name}</span></label>`).join('');
  const fonts = FONTS.map((x, i) => `<label class="bc-pick bc-font"><input type="radio" name="font" value="${x.id}"${i === 0 ? ' checked' : ''}><span style="font-family:${x.stack.replace(/"/g, '&quot;')}"><b>Aa</b> ${x.name}</span></label>`).join('');
  return `<section id="tool" class="tool bc-tool" data-tool aria-label="Business card maker">

  <form class="panel bc-input" autocomplete="off" novalidate onsubmit="return false">
    <div class="bc-step"><span class="bc-num" aria-hidden="true">1</span><h2 class="bc-step-title">Your details</h2></div>
    <p class="hint bc-lead">Every field is optional. Empty fields are left off the card.</p>
    <div class="bc-row">
      ${fld('name', 'Name', 'autocapitalize="words"', 'Your name')}
      ${fld('title', 'Job title', '', 'Your role')}
    </div>
    ${fld('company', 'Company', '', 'Business name')}
    <div class="bc-row">
      ${fld('phone', 'Phone', 'type="tel" inputmode="tel"', '0400 000 000')}
      ${fld('email', 'Email', 'type="email" inputmode="email" spellcheck="false" autocapitalize="off"', 'you@example.com')}
    </div>
    ${fld('website', 'Website', 'inputmode="url" spellcheck="false" autocapitalize="off"', 'example.com.au')}
    ${fld('address', 'Address', '', 'Street, suburb, state')}
  </form>

  <div class="stage bc-stage" data-stage>
    <div class="bc-stage-in">
      <div class="bc-step bc-step-stage"><h2 class="bc-step-title">Your card</h2>
        <div class="seg seg-sm bc-side" data-seg style="--n:2;--i:0" role="radiogroup" aria-label="Which side to show" data-side hidden>
          <label><input type="radio" name="side" value="front" checked><span>Front</span></label>
          <label><input type="radio" name="side" value="back"><span>Back</span></label>
        </div>
      </div>
      <div class="bc-frame" data-frame><canvas class="bc-canvas" width="900" height="550" data-canvas role="img" aria-label="Preview of your business card"></canvas></div>
      <p class="bc-status" data-status aria-live="polite">Live preview of the front of your card.</p>
      <dl class="bc-facts">
        <div><dt>Card size</dt><dd class="num" data-meta-size>90 x 55 mm</dd></div>
        <div><dt>Print file (px)</dt><dd class="num" data-meta-px>1063 x 650</dd></div>
        <div><dt>Showing</dt><dd data-meta-side>Front</dd></div>
      </dl>
      <label class="check bc-guide"><input type="checkbox" data-guide checked><span>Show safe-area guide (not in the download)</span></label>
      <div class="bc-dl">
        <button type="button" class="btn btn-primary" data-download-png>${I.down}Print PNG <small>300 dpi</small></button>
        <button type="button" class="btn btn-ghost" data-download-pdf>${I.file}PDF <small>90 x 55 mm</small></button>
        <button type="button" class="btn btn-ghost bc-dl-wide" data-download-screen>${I.image}Screen PNG <small>900 px wide, for email and profiles</small></button>
      </div>
      <p class="note note-good bc-forever">${I.shield}<span><strong>Nothing is uploaded.</strong> Your card and logo are drawn and saved on this device. Close the tab and they are gone.</span></p>
    </div>
  </div>

  <form class="panel bc-look" data-look autocomplete="off" novalidate onsubmit="return false">
    <div class="bc-step"><span class="bc-num" aria-hidden="true">2</span><h2 class="bc-step-title">Design</h2></div>
    <div class="bc-f"><span class="lbl" id="bc-layout-lbl">Layout</span>
      <div class="bc-picks bc-layouts" role="radiogroup" aria-labelledby="bc-layout-lbl">${layouts}</div>
    </div>
    <div class="bc-f">
      <div class="lbl-row"><span class="lbl">Colours</span></div>
      <div class="bc-presets" role="group" aria-label="Colour presets">${PRESETS.map(([n, bg, tx, ac], i) => `<button type="button" class="bc-preset" data-preset="${i}" aria-label="${n}" title="${n}" style="--a:${bg};--b:${tx};--c:${ac}"><i></i><i></i><i></i></button>`).join('')}</div>
      <div class="bc-colors">
        ${colorBox('bg', 'Background', PRESETS[0][1])}
        ${colorBox('text', 'Text', PRESETS[0][2])}
        ${colorBox('accent', 'Accent', PRESETS[0][3])}
      </div>
      <p class="bc-contrast is-good" data-contrast aria-live="polite"><i aria-hidden="true"></i><span data-contrast-text>Text on background 17.9 : 1.</span></p>
    </div>
    <div class="bc-f"><span class="lbl" id="bc-font-lbl">Font</span>
      <div class="bc-picks bc-fonts" role="radiogroup" aria-labelledby="bc-font-lbl">${fonts}</div>
      <p class="hint">System fonts from your own device. Nothing is downloaded.</p>
    </div>
    <div class="bc-f">
      <div class="lbl-row"><span class="lbl">Logo</span><span class="bc-opt">Optional</span></div>
      <div class="bc-logo">
        <label class="btn btn-ghost bc-logo-btn">${I.upload}<span data-logo-label>Choose a logo</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="bc-file" data-logo aria-label="Choose a logo image from your device"></label>
        <button type="button" class="chip bc-logo-clear" data-logo-clear hidden>${I.x}Remove</button>
      </div>
      <p class="hint" data-logo-hint>PNG, JPEG, WebP or SVG. It stays on your device and is scaled to fit.</p>
      <p class="bc-err" data-logo-error role="alert" hidden></p>
    </div>
    <div class="bc-f"><span class="lbl" id="bc-back-lbl">Back of card</span>
      <div class="seg seg-sm" data-seg style="--n:3;--i:0" role="radiogroup" aria-labelledby="bc-back-lbl">
        <label><input type="radio" name="back" value="off" checked><span>None</span></label>
        <label><input type="radio" name="back" value="colour"><span>Colour</span></label>
        <label><input type="radio" name="back" value="light"><span>Light</span></label>
      </div>
      <div data-back-extra hidden>
        ${f({ id: 'bc-back-text', label: 'Line on the back', attrs: 'name="backtext" autocomplete="off" data-back-text placeholder="Defaults to your company name"' })}
      </div>
    </div>
    <label class="check"><input type="checkbox" data-bleed><span>Add 3 mm bleed to the downloads (96 x 61 mm)</span></label>
    <p class="hint bc-bleed-note">Many print shops ask for bleed: extra background past the trim line, cut off after printing. Leave it off for home printing or if you are unsure, and ask your printer.</p>
  </form>
</section>`;
}

/* ---------- content pieces ---------- */
const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d], i) => `<li class="card bc-how p-7"><span class="bc-num bc-num-lg" aria-hidden="true">${i + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;

// Build-time thumbnails drawn with the same layout code the tool uses (rough text widths, system font).
function thumb(id) {
  const measure = (t, s, w) => Array.from(t).length * s * (w >= 650 ? 0.56 : 0.52);
  const r = buildFront({ layout: id, data: SAMPLE, colors: { bg: '#ffffff', text: '#16181d', accent: '#c8421a' }, measure });
  const body = r.commands.map((c) => {
    if (c.op === 'rect') return `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${c.fill}"/>`;
    if (c.op === 'circle') return `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.fill}"/>`;
    const anchor = c.align === 'center' ? 'middle' : c.align === 'right' ? 'end' : 'start';
    return `<text x="${c.x.toFixed(2)}" y="${c.y.toFixed(2)}" font-size="${c.size.toFixed(2)}" font-weight="${c.weight}" fill="${c.fill}" text-anchor="${anchor}">${c.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  }).join('');
  return `<svg viewBox="0 0 90 55" class="bc-thumb" role="img" aria-label="Example of the ${LAYOUTS.find((l) => l.id === id).name} layout" font-family="system-ui, 'Segoe UI', Roboto, Arial, sans-serif"><clipPath id="bc-cp-${id}"><rect width="90" height="55" rx="1.5"/></clipPath><g clip-path="url(#bc-cp-${id})">${body}</g></svg>`;
}
const layoutCards = () => `<div class="bc-kinds">${LAYOUTS.map((l) => `<article class="card bc-kind">${thumb(l.id)}<h3 class="text-xl">${l.name}</h3><p class="text-ink-2">${l.blurb}</p></article>`).join('')}</div>`;

const BLEED_FIG = `<svg viewBox="0 0 320 200" class="h-auto w-full" role="img" aria-label="A card with its bleed area, trim line and safe area labelled.">
  <rect x="20" y="20" width="190" height="124" fill="#c8421a" opacity="0.28"/>
  <rect x="36" y="36" width="158" height="92" fill="#fff"/>
  <rect x="52" y="52" width="126" height="60" fill="none" stroke="#5ee3a4" stroke-width="1.5" stroke-dasharray="5 4"/>
  <rect x="36" y="36" width="158" height="92" fill="none" stroke="#b6adff" stroke-width="1.5"/>
  <path d="M210 60h22M194 82h38M178 104h54" stroke="#8b91b3" stroke-width="1.2"/>
  <text x="238" y="64" fill="#f3f4fb" font-size="12" font-weight="650">Bleed (cut off)</text>
  <text x="238" y="86" fill="#b6adff" font-size="12" font-weight="650">Trim line</text>
  <text x="238" y="108" fill="#5ee3a4" font-size="12" font-weight="650">Safe area</text>
  <rect x="62" y="64" width="64" height="7" rx="2" fill="#16181d"/><rect x="62" y="78" width="40" height="5" rx="2" fill="#c8421a"/>
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
  ${sectionHead(COPY.layoutsTitle, COPY.layoutsLead, 'text-4xl md:text-5xl')}
  ${layoutCards()}
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">${COPY.aboutTitle}</h2>${COPY.aboutParas.map((p) => `<p class="mt-5 text-lg text-ink-2">${p}</p>`).join('')}</div>
  <div class="card p-7 md:p-8"><figure class="m-0">${BLEED_FIG}</figure><h3 class="mt-6 text-xl">${COPY.tipsTitle}</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${COPY.tips.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(COPY.faq)}
</section>
</main>`;
  return {
    title: 'Free Business Card Maker: 90 x 55 mm, PNG and PDF (No Sign-up)',
    desc: 'Design a business card with six layouts, your colours, fonts and logo. Download a 300 dpi PNG or a 90 x 55 mm PDF. Made in your browser, nothing uploaded.',
    body, faq: COPY.faq, tool: { category: 'DesignApplication' }, scripts: ['assets/tool.js'],
  };
}

const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${site.name} is a small, free tool for designing a simple business card that you can print at a shop or at home. It exists because most online card designers ask you to sign up, add a watermark, or upload your details and logo to a server before they let you download anything.</p>
<p>Here, the card is drawn by code running inside your web browser. You choose one of six layouts, set your colours and a system font, optionally add your own logo, and download a 300 dpi PNG or a PDF at exactly 90 x 55 mm, the usual Australian card size. A bleed option is there for print shops that ask for it.</p>
<p>The layouts were drawn for this tool from plain shapes and text. There is no clip-art, no stock artwork and no template library behind them.</p>
<p>${site.name} is made by ${site.operator}, in Brisbane, Australia. The site is paid for by advertising. If you find a problem or have an idea, use the Contact page.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you type and any logo', dataHtml: '<p>The names, phone numbers, emails, addresses and other text you enter, and any logo image you choose, are drawn onto a card inside your web browser. They are not sent to a server, not stored on one and not shared with anyone. Nothing is saved in cookies or in your browser after you leave the page.</p><p>When you download a PNG or PDF, the file is created on your device and saved to your downloads folder. It does not pass through us.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool for designing business cards in your browser.`, ownershipHtml: '<p>You own what you enter and the cards you make. We claim no rights over them, and you may use them for personal or business purposes without attribution.</p>', processingHtml: '<p>Cards are made on your device, in your browser. We do not receive, keep or look at what you enter or any logo you choose.</p>', responsibilityHtml: '<p>Check your card carefully before you print it, including every digit of your phone number and every letter of your email address. Print results depend on the printer, the paper and your settings, which we cannot control. You are responsible for the content of your card and for having the right to use any logo or text you add.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea? Email us.' }) },
];

export default {
  site, pages,
  copy: [['src/tool.js', 'assets/tool.js'], ['src/layouts.mjs', 'assets/layouts.mjs'], ['src/units.mjs', 'assets/units.mjs'], ['src/colour.mjs', 'assets/colour.mjs'], ['src/textfit.mjs', 'assets/textfit.mjs'], ['src/pdf.mjs', 'assets/pdf.mjs']],
};
