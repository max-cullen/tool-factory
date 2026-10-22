// QR Code Generator: make Text, URL, Wi-Fi and contact (vCard) QR codes in the browser, download as PNG or SVG.
// This file holds the pages, copy and tool markup. Layout, header, footer, SEO and styles come from /framework.
// Design notes and the list of data- hooks: DESIGN-NOTES.md.
import { ICON, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'qr-code',
  name: 'QR Code Generator',
  url: `${config.domain}/qr-code`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  tagline: 'Make QR codes for text, links, Wi-Fi and contacts, right in your browser.',
  privacySummary: 'What you type into the QR Code Generator stays on your device. The code is made inside your web browser and nothing you enter is sent to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  // Ads and analytics stay OFF until the owner fills these in (see README). No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Codes are made on your device and never expire.',
  footnote2: 'QR Code is a registered trademark of Denso Wave Incorporated. This site is independent and not affiliated with Denso Wave.',
  mark: '<rect x="3.5" y="3.5" width="6" height="6" rx="1.2"/><rect x="14.5" y="3.5" width="6" height="6" rx="1.2"/><rect x="3.5" y="14.5" width="6" height="6" rx="1.2"/><path d="M14.5 14.5h2.5v2.5M20.5 14.5v.01M14.5 20.5h.01M18 20.5h2.5V18"/>',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'about', label: 'About' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

/* ---------- page copy ---------- */
const COPY = {
  h1: 'Free QR code generator',
  lead: 'Make a QR code for text, a web link, your Wi-Fi network or a contact card. Choose the colours, then download a PNG or SVG. It is made in your browser, so nothing you type leaves your device.',
  trust: ['Codes never expire', 'Made in your browser', 'Free, no sign-up'],
  how: [
    ['Choose what it holds', 'Pick Text, URL, Wi-Fi or Contact and fill in the form. The code redraws as you type, and the form tells you if something is missing or too long.'],
    ['Style it', 'Set the dot and background colours, the image size, the blank margin and the error-correction level. A contrast check warns you if the colours might not scan.'],
    ['Download', 'Save a PNG for screens and documents, or an SVG that stays sharp at any size for print. Then scan it with a phone before you share it.'],
  ],
  kinds: [
    ['text', 'Text', 'A note, a serial number or a short message that shows on the scanner screen.'],
    ['url', 'URL', 'Send people to a website, menu, booking form or map. A missing https:// is added for you.'],
    ['wifi', 'Wi-Fi', 'Let guests join your network without typing the password.'],
    ['vcard', 'Contact', 'Share a name, phone, email, organisation and address that can be saved as a contact.'],
  ],
  kindsTitle: 'Four kinds of code',
  aboutTitle: 'Making a QR code that scans first time',
  aboutParas: [
    'A QR code is a square pattern of dots that stores a small amount of data, usually text. A phone camera reads the pattern and decides what to do with it: open a web page, offer to join a Wi-Fi network or add a contact. This tool makes static codes. What you enter is written straight into the pattern, so the code does not depend on any website or account to keep working. It never expires, and it keeps scanning for as long as the image stays readable.',
    'That is different from the dynamic codes some paid services sell. A dynamic code holds a short link to the provider&rsquo;s server, which forwards people to your real page. That lets you change the destination later and count scans, but the code stops working if you stop paying or the service closes. If you need a code that points to a fixed address, static is simpler and permanent. If the destination might change, point the code at a page on your own site that you can update.',
    'The more you put in, the more dots the code needs, and denser codes are harder to scan when printed small. Keep the content short where you can: a short link is much easier to scan than a long one. The Data used bar under the preview shows how close you are to the largest code this tool can make.',
    'For screens, download the PNG. For anything printed, choose the SVG, a vector file that scales without blur. As a rough guide, print a code no smaller than about 2 centimetres square for close-up scanning, and make it larger the further away it will be read. Always test the printed result with two different phones before you print a batch.',
  ],
  tipsTitle: 'Tips for reliable scanning',
  tips: [
    'Use dark dots on a light background. Light dots on a dark background fail on some scanners.',
    'Keep the margin at 4 modules or more. Cropping the blank border can stop a code from scanning.',
    'Choose a higher error-correction level for print that may be scuffed, dirty or partly covered.',
    'Scan the finished code with two phones before you print or publish it.',
  ],
  faq: [
    ['Do these QR codes expire?', 'No. These are static codes: the data sits in the pattern itself, with no tracking link and no account behind it. A code made here keeps working for as long as the printed or displayed image stays readable. The only thing that can break it is a destination you do not control going away, such as a website that is taken offline.'],
    ['Is what I type uploaded anywhere?', 'No. The code is generated by JavaScript running in your browser. Nothing you type, including Wi-Fi passwords and contact details, is sent to us or to any other server, and nothing is kept after you close the page. The page itself shows ads and counts visits separately; the Privacy page explains how.'],
    ['What is the difference between static and dynamic codes?', 'A static code stores your data directly. A dynamic code stores a link to a service, which redirects to your destination so it can be edited and tracked. This tool makes static codes only. That means no scan statistics and no editing after printing, but also no subscription and no risk of the code being switched off.'],
    ['Which error-correction level should I choose?', 'Error correction lets a scanner rebuild the code when part of it is damaged or covered. L recovers about 7%, M about 15%, Q about 25% and H about 30%. Higher levels add dots, so the code gets denser and harder to scan at a small size. M suits most uses. Choose Q or H for stickers, outdoor signs or anything likely to be scuffed, and L for long content on a clean screen. If your content is too long, a lower level fits more.'],
    ['Should I download PNG or SVG?', 'PNG is a pixel image, suited to websites, slides, messages and documents. SVG is a vector file that stays sharp at any size, so it is the better choice for posters, signs and print shops. If you use a PNG, set the size so each dot is several pixels wide.'],
    ['How big should I print it?', 'About 2 cm by 2 cm is a practical minimum for a code held close, such as on a business card. For posters, a common rule of thumb is a code about one tenth as wide as the scanning distance. Dense codes (long content, higher error correction) need more room than simple ones. Print a test and scan it from the real distance.'],
    ['Is it safe to put my Wi-Fi password in a QR code?', 'The code holds your network name and password as plain text, so anyone who can scan or photograph it can join your network and read the password out of it. Treat the printed code like the password itself. For guests or customers, share a guest network instead, and change the password if the code has gone further than you meant.'],
    ['Why will my printed code not scan?', 'Check contrast first. Dark dots on a light background work best. Low contrast, light dots on a dark background or a busy picture behind the code can stop it scanning even when it looks fine on screen. Also check that the margin has not been trimmed, the code is not stretched, and it is not printed too small or covered in glare. The message under the colour pickers warns you about weak combinations.'],
    ['Does the Contact code work on every phone?', 'It uses the vCard 3.0 format, which current iPhone and Android cameras recognise. How each phone offers to save the contact varies, and some older scanner apps only show the raw text. Keep the details short for the most reliable result.'],
  ],
};

/* ---------- icons ---------- */
const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  text: svg('<path d="M5 6h14M5 12h14M5 18h9"/>'),
  url: svg('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'),
  wifi: svg('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.2" r=".9" fill="currentColor"/>'),
  vcard: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h3.5M14.5 13.5h2.5"/>'),
  eye: svg('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>', 18),
  swap: svg('<path d="M7 4L4 7l3 3M4 7h12M17 20l3-3-3-3M20 17H8"/>', 16),
  down: svg('<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>', 18),
  shield: svg('<path d="M12 3l7 3v5.5c0 4.3-3 7.9-7 9.5-4-1.6-7-5.2-7-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>', 18),
};

/* ---------- static placeholder QR (design only; replaced by the real encoder output) ---------- */
function placeholderQr({ n = 25, margin = 4, fg = '#0e1124', bg = '#ffffff', label = 'Example QR code preview' } = {}) {
  const on = Array.from({ length: n }, () => Array(n).fill(false));
  const fixed = Array.from({ length: n }, () => Array(n).fill(false));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < n && y < n) { on[y][x] = v; fixed[y][x] = true; } };
  const finder = (ox, oy) => { for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) { const r = Math.max(Math.abs(x - 3), Math.abs(y - 3)); set(ox + x, oy + y, r !== 2 && r !== 4); } };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) set(n - 7 + x, n - 7 + y, Math.max(Math.abs(x), Math.abs(y)) !== 1);
  for (let i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fixed[y][x]) on[y][x] = rnd() < 0.47;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (on[y][x]) d += `M${x} ${y}h1v1h-1z`;
  const s = n + margin * 2;
  return `<svg class="qr-svg" viewBox="${-margin} ${-margin} ${s} ${s}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect x="${-margin}" y="${-margin}" width="${s}" height="${s}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}

/* ---------- tool markup ---------- */
const TYPES = [['text', 'Text'], ['url', 'URL'], ['wifi', 'Wi-Fi'], ['vcard', 'Contact']];

// One labelled input. `attrs` goes on the <input>; `opt` shows "Optional".
const f = ({ id, label, opt = false, attrs = '', area = false, extra = '', hint = '' }) => `<div class="qr-f">
  <div class="lbl-row"><label class="lbl" for="${id}">${label}</label>${opt ? '<span class="qr-opt">Optional</span>' : ''}</div>
  <div class="field${area ? ' qr-area' : ''}">${area ? `<textarea id="${id}" ${attrs}></textarea>` : `<input id="${id}" ${attrs}>`}${extra}</div>
  ${hint ? `<p class="hint">${hint}</p>` : ''}
  <p class="qr-err" data-error-for="${id}" hidden></p>
</div>`;

function toolHtml() {
  const tabs = TYPES.map(([v, t], i) => `<button type="button" role="tab" class="qr-tab" id="qr-tab-${v}" aria-controls="qr-form-${v}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-type-tab="${v}">${I[v]}<span>${t}</span></button>`).join('');
  const formAttrs = (v, i) => `id="qr-form-${v}" class="qr-form" role="tabpanel" aria-labelledby="qr-tab-${v}" data-form="${v}" autocomplete="off" novalidate onsubmit="return false"${i ? ' hidden' : ''}`;
  const ec = [['L', '7%'], ['M', '15%'], ['Q', '25%'], ['H', '30%']];
  return `<section id="tool" class="tool qr-tool" data-tool data-type="text" aria-label="QR code generator">

  <div class="panel qr-input">
    <div class="qr-step"><span class="qr-num" aria-hidden="true">1</span><h2 class="qr-step-title">Content</h2></div>
    <div class="qr-tabs" role="tablist" aria-label="What the QR code holds" data-type-tabs>${tabs}</div>

    <form ${formAttrs('text', 0)}>
      ${f({ id: 'qr-text', label: 'Your text', area: true, attrs: 'name="text" rows="4" maxlength="2000" data-field="text" placeholder="Type a message, a code or a note&hellip;"', extra: '<span class="qr-count num" data-count aria-live="off">0 / 2000</span>' })}
    </form>

    <form ${formAttrs('url', 1)}>
      ${f({ id: 'qr-url', label: 'Website address', attrs: 'name="url" type="url" inputmode="url" spellcheck="false" autocapitalize="off" data-field="url" placeholder="https://example.com"', hint: 'If you leave out https://, it is added for you.' })}
    </form>

    <form ${formAttrs('wifi', 2)}>
      ${f({ id: 'qr-ssid', label: 'Network name', attrs: 'name="ssid" spellcheck="false" autocapitalize="off" data-field="ssid" placeholder="Home Wi-Fi"' })}
      <div class="qr-f"><span class="lbl" id="qr-sec-lbl">Security</span>
        <div class="seg seg-sm" data-seg style="--n:3;--i:0" role="radiogroup" aria-labelledby="qr-sec-lbl" data-wifi-security>
          <label><input type="radio" name="security" value="WPA" checked><span>WPA</span></label>
          <label><input type="radio" name="security" value="WEP"><span>WEP</span></label>
          <label><input type="radio" name="security" value="nopass"><span>None</span></label>
        </div>
        <p class="hint" data-wifi-hint>WPA covers WPA2 and WPA3, used by almost every home and office network.</p>
      </div>
      ${f({ id: 'qr-pass', label: 'Password', hint: 'Anyone who scans this code can read the password. Share it only where you would share the password.', attrs: 'name="password" type="password" spellcheck="false" autocapitalize="off" autocomplete="off" data-field="password" placeholder="Network password"', extra: `<button type="button" class="qr-eye" data-pw-toggle aria-pressed="false" aria-label="Show password" aria-controls="qr-pass">${I.eye}</button>` })}
      <label class="check"><input type="checkbox" name="hidden" data-field="hidden"><span>Hidden network (it does not broadcast its name)</span></label>
    </form>

    <form ${formAttrs('vcard', 3)}>
      <div class="qr-row">
        ${f({ id: 'qr-first', label: 'First name', attrs: 'name="first" autocomplete="off" data-field="first" placeholder="Alex"' })}
        ${f({ id: 'qr-last', label: 'Last name', opt: true, attrs: 'name="last" autocomplete="off" data-field="last" placeholder="Taylor"' })}
      </div>
      <div class="qr-row">
        ${f({ id: 'qr-phone', label: 'Phone', opt: true, attrs: 'name="phone" type="tel" inputmode="tel" autocomplete="off" data-field="phone" placeholder="+61 400 000 000"' })}
        ${f({ id: 'qr-email', label: 'Email', opt: true, attrs: 'name="email" type="email" inputmode="email" spellcheck="false" autocapitalize="off" autocomplete="off" data-field="email" placeholder="alex@example.com"' })}
      </div>
      <div class="qr-row">
        ${f({ id: 'qr-org', label: 'Organisation', opt: true, attrs: 'name="org" autocomplete="off" data-field="org" placeholder="Company or club"' })}
        ${f({ id: 'qr-web', label: 'Website', opt: true, attrs: 'name="website" type="url" inputmode="url" spellcheck="false" autocapitalize="off" autocomplete="off" data-field="website" placeholder="https://example.com"' })}
      </div>
      <fieldset class="qr-group">
        <legend class="lbl-row"><span class="lbl">Address</span><span class="qr-opt">Optional</span></legend>
        ${f({ id: 'qr-street', label: 'Street', attrs: 'name="street" autocomplete="off" data-field="street" placeholder="1 Example Street"' })}
        <div class="qr-row">
          ${f({ id: 'qr-city', label: 'Suburb or city', attrs: 'name="city" autocomplete="off" data-field="city" placeholder="Brisbane"' })}
          ${f({ id: 'qr-region', label: 'State', attrs: 'name="region" autocomplete="off" data-field="region" placeholder="QLD"' })}
        </div>
        <div class="qr-row">
          ${f({ id: 'qr-postcode', label: 'Postcode', attrs: 'name="postcode" inputmode="numeric" autocomplete="off" data-field="postcode" placeholder="4000"' })}
          ${f({ id: 'qr-country', label: 'Country', attrs: 'name="country" autocomplete="off" data-field="country" placeholder="Australia"' })}
        </div>
      </fieldset>
    </form>
  </div>

  <div class="stage qr-stage" data-stage>
    <div class="qr-stage-in">
      <div class="qr-step qr-step-stage"><h2 class="qr-step-title">Your QR code</h2><span class="qr-live" data-live-badge><i aria-hidden="true"></i>Live preview</span></div>
      <div class="qr-frame" data-frame>
        <div class="qr-preview" data-preview>${placeholderQr()}</div>
        <div class="qr-veil qr-empty" data-empty hidden><span class="qr-veil-icon">${I.text}</span><span class="qr-veil-title">Your code appears here</span><span class="qr-veil-sub">Start typing on the left.</span></div>
        <div class="qr-veil qr-invalid" data-invalid hidden role="alert"><span class="qr-veil-title">Can not make this code yet</span><span class="qr-veil-sub" data-invalid-msg></span></div>
      </div>
      <p class="qr-status" data-status aria-live="polite">Example preview. Your code updates as you type.</p>
      <dl class="qr-facts">
        <div><dt>Content</dt><dd data-meta-type>Text</dd></div>
        <div><dt>Image</dt><dd class="num" data-meta-size>1024 px</dd></div>
        <div><dt>Data used</dt><dd class="num" data-meta-data>0%</dd></div>
      </dl>
      <div class="qr-meter" data-meter role="presentation"><i style="width:0%"></i></div>
      <div class="qr-dl">
        <button type="button" class="btn btn-primary" data-download-png>${I.down}Download PNG</button>
        <button type="button" class="btn btn-ghost" data-download-svg>${I.down}Download SVG</button>
      </div>
      <p class="note note-good qr-forever">${I.shield}<span><strong>Codes never expire.</strong> This is a static code made in your browser. Nothing you type is uploaded, and there is no link through our servers that could stop working.</span></p>
    </div>
  </div>

  <form class="panel qr-look" data-appearance autocomplete="off" novalidate onsubmit="return false">
    <div class="qr-step"><span class="qr-num" aria-hidden="true">2</span><h2 class="qr-step-title">Style</h2></div>
    <div class="qr-f">
      <div class="lbl-row"><span class="lbl">Colours</span><button type="button" class="chip qr-swap" data-swap aria-label="Swap dot and background colours">${I.swap}Swap</button></div>
      <div class="qr-colors">
        <div class="qr-color"><input type="color" id="qr-fg" value="#0e1124" data-fg aria-label="Pick dot colour"><div class="qr-color-txt"><label for="qr-fg-hex">Dots</label><input id="qr-fg-hex" value="#0E1124" maxlength="7" spellcheck="false" autocapitalize="off" data-fg-hex></div></div>
        <div class="qr-color"><input type="color" id="qr-bg" value="#ffffff" data-bg aria-label="Pick background colour"><div class="qr-color-txt"><label for="qr-bg-hex">Background</label><input id="qr-bg-hex" value="#FFFFFF" maxlength="7" spellcheck="false" autocapitalize="off" data-bg-hex></div></div>
      </div>
      <p class="qr-contrast is-good" data-contrast aria-live="polite"><i aria-hidden="true"></i><span data-contrast-text>Contrast 18.4 : 1. Scans well.</span></p>
    </div>
    <div class="qr-row">
      <div class="qr-f">
        <div class="lbl-row"><label class="lbl" for="qr-size">Size</label><output class="qr-val num" for="qr-size" data-size-out>1024 px</output></div>
        <input type="range" class="range" id="qr-size" min="128" max="2048" step="32" value="1024" data-size>
      </div>
      <div class="qr-f">
        <div class="lbl-row"><label class="lbl" for="qr-margin">Margin</label><output class="qr-val num" for="qr-margin" data-margin-out>4 modules</output></div>
        <input type="range" class="range" id="qr-margin" min="0" max="10" step="1" value="4" data-margin>
      </div>
    </div>
    <div class="qr-f">
      <span class="lbl" id="qr-ec-lbl">Error correction</span>
      <div class="seg qr-ec" data-seg style="--n:4;--i:1" role="radiogroup" aria-labelledby="qr-ec-lbl" aria-describedby="qr-ec-hint" data-ec>
        ${ec.map(([v, p]) => `<label><input type="radio" name="ec" value="${v}"${v === 'M' ? ' checked' : ''}><span><b>${v}</b><small>${p}</small></span></label>`).join('')}
      </div>
      <p class="hint" id="qr-ec-hint" data-ec-hint>M recovers about 15% damage. A good default for most uses.</p>
    </div>
  </form>
</section>`;
}

/* ---------- content pieces ---------- */
const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d], i) => `<li class="card qr-how p-7"><span class="qr-num qr-num-lg" aria-hidden="true">${i + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;
const kindCards = (kinds) => `<div class="qr-kinds">${kinds.map(([k, t, d]) => `<article class="card qr-kind"><span class="qr-kind-icon">${I[k]}</span><h3 class="text-xl">${t}</h3><p class="text-ink-2">${d}</p></article>`).join('')}</div>`;

const ANATOMY = `<svg viewBox="0 0 320 180" class="h-auto w-full" role="img" aria-label="A QR code with its corner squares, data dots and the empty margin around it labelled.">
  <rect x="14" y="14" width="152" height="152" rx="10" fill="none" stroke="#b6adff" stroke-width="1.5" stroke-dasharray="5 5"/>
  <g transform="translate(34 34)"><rect width="112" height="112" rx="6" fill="#fff"/><g transform="translate(6 6) scale(4)">${placeholderQr({ margin: 0 }).replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/<rect[^>]*\/>/, '')}</g></g>
  <path d="M74 52h108" stroke="#8b91b3" stroke-width="1.4"/><circle cx="58" cy="52" r="15" fill="none" stroke="#5ee3a4" stroke-width="2"/>
  <text x="188" y="56" fill="#f3f4fb" font-size="13" font-weight="650">Finder squares</text>
  <path d="M120 108h62" stroke="#8b91b3" stroke-width="1.4"/><circle cx="114" cy="108" r="5" fill="#5ee3a4"/>
  <text x="188" y="112" fill="#f3f4fb" font-size="13" font-weight="650">Data dots</text>
  <path d="M166 152h16" stroke="#8b91b3" stroke-width="1.4"/>
  <text x="188" y="156" fill="#b6adff" font-size="13" font-weight="650">Quiet zone (margin)</text>
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
  ${sectionHead(COPY.kindsTitle, '', 'text-4xl md:text-5xl')}
  ${kindCards(COPY.kinds)}
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">${COPY.aboutTitle}</h2>${COPY.aboutParas.map((p) => `<p class="mt-5 text-lg text-ink-2">${p}</p>`).join('')}</div>
  <div class="card p-7 md:p-8"><figure class="m-0">${ANATOMY}</figure><h3 class="mt-6 text-xl">${COPY.tipsTitle}</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${COPY.tips.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(COPY.faq)}
</section>
</main>`;
  return {
    title: 'Free QR Code Generator: Text, URL, Wi-Fi and Contact (No Sign-up)',
    desc: 'Make a QR code for text, a link, Wi-Fi or a contact card. Pick colours and size, download PNG or SVG. Made in your browser, never expires.',
    body, faq: COPY.faq, tool: { category: 'UtilitiesApplication' }, scripts: ['assets/tool.js'],
  };
}

const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${site.name} is a small, free tool for making QR codes that you can print or share. It was built because most online generators ask you to sign up, add a watermark or send your details to a server just to draw a square of dots.</p>
<p>Here, the code is drawn by a QR encoder that runs inside your web browser. It handles plain text, web links, Wi-Fi network details and contact cards, and it lets you choose colours, size, margin and error-correction level before you download a PNG or SVG. The encoder follows the published QR Code specification, and its output was cross-checked by decoding sample codes with independent scanner software.</p>
<p>The codes are static, which means they carry your content directly and never expire. We do not track scans, because there is nothing in the code that goes through our servers.</p>
<p>${site.name} is made by ${site.operator}, in Brisbane, Australia. The site is paid for by advertising. If you find a problem or have an idea, use the Contact page.</p>
<p><small>QR Code is a registered trademark of Denso Wave Incorporated. This site is independent and is not affiliated with or endorsed by Denso Wave.</small></p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you type', dataHtml: '<p>The text, links, Wi-Fi details and contact details you enter are turned into a QR code inside your web browser. They are not sent to a server, not stored on one and not shared with anyone. Nothing is saved in cookies or in your browser after you leave the page.</p><p>When you download a PNG or SVG, the file is created on your device and saved to your downloads folder. It does not pass through us.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool for making QR codes in your browser.`, ownershipHtml: '<p>You own what you enter and the codes you make. We claim no rights over them, and you may use them for personal or business purposes without attribution.</p>', processingHtml: '<p>Codes are made on your device, in your browser. We do not receive, keep or look at what you enter.</p>', responsibilityHtml: '<p>Test every code with at least one phone before you print or share it. Scanning depends on the printed quality, the colours, the size and the scanner, which we cannot control. You are responsible for what your code contains and for having the right to share it, including any Wi-Fi password, which anyone with the code can read.</p><p>QR Code is a registered trademark of Denso Wave Incorporated. This site is not affiliated with Denso Wave.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea? Email us.' }) },
];

export default {
  site, pages,
  copy: [['src/tool.js', 'assets/tool.js'], ['src/qr.mjs', 'assets/qr.mjs'], ['src/payloads.mjs', 'assets/payloads.mjs'], ['src/render.mjs', 'assets/render.mjs'], ['src/contrast.mjs', 'assets/contrast.mjs']],
};
