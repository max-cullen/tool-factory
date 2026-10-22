// Username Generator: makes usernames and gamer tags in several styles, in the browser.
// Pilot layout for the text-tool pattern: see DESIGN-NOTES.md. Copy marked TODO(copy) is placeholder text.
import { ICON, esc, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'name-generator',
  name: 'Username Generator',
  url: `${config.domain}/name-generator`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  // An "@" mark for the logo and favicon.
  mark: '<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.6a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.4 6.9"/>',
  tagline: 'Usernames and gamer tags in seconds. Everything runs in your browser.', // TODO(copy)
  privacySummary: 'The names you make are created inside your web browser. What you type and the names you save are not sent to us or anyone else, and they are gone when you close the page. The site shows ads and uses privacy-friendly visitor statistics, explained below.', // TODO(copy)
  // Ads and analytics stay OFF until the owner fills these in. No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Built to make things simpler.',
  footnote2: 'Names are made on your device. Nothing is stored.',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'home', label: 'Styles', hash: '#styles' }, { id: 'home', label: 'Questions', hash: '#faq' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

/* ---------- styles (categories). `eg` is the small example on the chooser; `samples` show in the Styles section ---------- */
const CATEGORIES = [
  { id: 'fantasy', label: 'Fantasy', eg: 'Thornwyn', samples: ['Elvaris', 'Duskmere', 'Wyrmgard'], blurb: 'TODO(copy): old-world sounds, made-up places and a touch of myth. Suits RPGs and guild names.' },
  { id: 'scifi', label: 'Sci-fi', eg: 'NovaKade', samples: ['Voidrunner', 'Zentrix', 'Kepler9'], blurb: 'TODO(copy): sharp consonants, star systems and ship-style call signs.' },
  { id: 'cute', label: 'Cute', eg: 'HoneyFern', samples: ['Mochibean', 'Dewdrop', 'Pebblewick'], blurb: 'TODO(copy): soft, friendly words that read well on social profiles and cosy games.' },
  { id: 'edgy', label: 'Edgy', eg: 'Grimshard', samples: ['Hexfall', 'Nightrend', 'Ravenbyte'], blurb: 'TODO(copy): darker words with a hard edge, for when you want to sound a little dangerous.' },
  { id: 'gamer', label: 'Gamer tag', eg: 'Kr4kenRx', samples: ['xFrostbite', 'SnipeVolt', 'Ph4ntomRx'], blurb: 'TODO(copy): short, punchy tags with the number and letter swaps people expect in lobbies.' },
  { id: 'mix', label: 'Mix', eg: 'Any style', samples: ['AshNova', 'Vexwyn', 'LunaHex'], blurb: 'TODO(copy): a bit of everything, when you are not sure what you want yet.' },
];

// Static sample results so the layout can be judged. The logic replaces them (they carry data-sample).
const SAMPLE_RESULTS = ['Thornwyn', 'Elvaris', 'Mirelock', 'Ashveil', 'Duskmere', 'Sylvaran', 'Oakhollow', 'Wyrmgard', 'Faelith', 'Ravenmoor', 'Lunebrook', 'Emberlyn'];
const SAMPLE_FAVS = ['Mirelock', 'Duskmere'];

const TRUST = ['Free, no sign-up', 'Runs in your browser', 'Nothing is saved']; // TODO(copy)

/* ---------- icons ---------- */
const svg = (d, size = 18, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  copy: svg('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>', 16, ' class="i-copy"'),
  done: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 16, ' class="i-done"'),
  star: svg('<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>', 20),
  x: svg('<path d="M7 7l10 10M17 7L7 17"/>', 14),
  spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>', 20),
  shuffle: svg('<path d="M4 7h3.5c2 0 3.2 1 4.3 2.6l1.4 2.1c1.1 1.6 2.3 2.6 4.3 2.6H20M20 14.3l-2.6-2.6M20 14.3l-2.6 2.6M4 17h3.5c1.2 0 2.1-.4 2.9-1M14.5 8c.7-.6 1.6-1 2.6-1H20M20 7l-2.6-2.6M20 7l-2.6 2.6"/>', 18),
  big: svg('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>', 26),
};

/* ---------- tool markup ---------- */
const seg = (hook, name, label, opts, checked, cls = '') => {
  const i = Math.max(0, opts.findIndex(([v]) => v === checked));
  return `<div class="seg ${cls}" data-seg ${hook} style="--n:${opts.length};--i:${i}" role="radiogroup" aria-label="${label}">${opts.map(([v, t, aria]) => `<label><input type="radio" name="${name}" value="${esc(v)}"${v === checked ? ' checked' : ''}${aria ? ` aria-label="${aria}"` : ''}><span>${t}</span></label>`).join('')}</div>`;
};

const resultItem = (name, { fav = false, sample = true } = {}) => `<li class="ng-item" data-result data-value="${esc(name)}"${sample ? ' data-sample' : ''}>
        <span class="ng-name" data-name translate="no">${esc(name)}</span>
        <span class="ng-len num" data-len title="Characters">${name.length}</span>
        <button type="button" class="ng-ico ng-star" data-favourite aria-pressed="${fav}" aria-label="Save ${esc(name)} to favourites">${I.star}</button>
        <button type="button" class="ng-copy" data-copy aria-label="Copy ${esc(name)}">${I.copy}${I.done}<span data-copy-label>Copy</span></button>
      </li>`;

const favItem = (name, sample = true) => `<li class="ng-fav" data-fav data-value="${esc(name)}"${sample ? ' data-sample' : ''}>
          <span class="ng-fav-name" data-name translate="no">${esc(name)}</span>
          <button type="button" class="ng-ico ng-ico-sm" data-copy aria-label="Copy ${esc(name)}">${I.copy}${I.done}</button>
          <button type="button" class="ng-ico ng-ico-sm" data-remove aria-label="Remove ${esc(name)} from favourites">${I.x}</button>
        </li>`;

const toolHtml = () => `<section id="tool" class="tool ng-tool" data-tool aria-label="${esc(site.name)}">
  <form class="panel ng-panel" data-options autocomplete="off" novalidate onsubmit="return false">
    <fieldset class="ng-fs">
      <legend class="lbl">Style</legend>
      <div class="ng-cats" data-category role="radiogroup" aria-label="Style">
        ${CATEGORIES.map((c, n) => `<label class="ng-cat"><input type="radio" name="category" value="${c.id}"${n === 0 ? ' checked' : ''}><span class="ng-cat-name">${c.label}</span><span class="ng-cat-eg" aria-hidden="true">${c.eg}</span></label>`).join('\n        ')}
      </div>
    </fieldset>

    <div class="block">
      <div class="lbl-row"><span class="lbl" id="ng-length-lbl">Length</span><span class="hint num" data-length-hint>6 to 10 letters</span></div>
      ${seg('data-length', 'length', 'Length', [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']], 'medium')}
    </div>

    <div class="block">
      <span class="lbl">Capitals</span>
      ${seg('data-case', 'case', 'Capitals', [['title', 'Title'], ['lower', 'lower'], ['upper', 'UPPER'], ['mixed', 'MiXeD']], 'title', 'seg-sm')}
    </div>

    <div class="block">
      <span class="lbl">Between words</span>
      ${seg('data-separator', 'separator', 'Between words', [['', 'None'], ['_', 'a_b', 'Underscore'], ['.', 'a.b', 'Dot'], ['-', 'a-b', 'Dash']], '', 'seg-sm')}
    </div>

    <div class="block">
      <label class="lbl" for="ng-word">Include a word <span class="ng-opt">(optional)</span></label>
      <div class="field"><input id="ng-word" name="word" data-word maxlength="12" spellcheck="false" autocapitalize="off" placeholder="e.g. Nova"></div>
      <label class="check"><input type="checkbox" name="numbers" data-numbers><span>Add numbers</span></label>
    </div>

    <div class="panel-actions">
      <button type="submit" class="btn btn-primary ng-go w-full" data-generate>${I.spark}Generate names</button>
    </div>
  </form>

  <div class="stage ng-stage" data-stage>
    <div class="ng-head">
      <div class="min-w-0">
        <h2 class="ng-title">Your names</h2>
        <p class="ng-meta" data-status role="status" aria-live="polite">12 fantasy names. Tap a star to keep one.</p>
      </div>
      <span class="ng-busy" data-busy hidden><span class="spin"></span>Generating&hellip;</span>
      <button type="button" class="btn btn-ghost ng-again" data-generate aria-label="Generate more names">${I.shuffle}<span>More</span></button>
    </div>

    <div class="ng-empty" data-empty hidden>
      <span class="drop-icon">${I.big}</span>
      <p class="drop-title">Your names will appear here</p>
      <p class="drop-sub">Pick a style, then press Generate.</p>
    </div>

    <ul class="ng-results" data-results aria-label="Generated names">
      ${SAMPLE_RESULTS.map((n) => resultItem(n, { fav: SAMPLE_FAVS.includes(n) })).join('\n      ')}
    </ul>

    <section class="ng-favs" data-favourites-panel aria-labelledby="ng-favs-title">
      <div class="ng-favs-head">
        <h3 id="ng-favs-title" class="ng-favs-title">Favourites <span class="ng-count num" data-fav-count>${SAMPLE_FAVS.length}</span></h3>
        <div class="ng-favs-acts">
          <button type="button" class="chip" data-copy-all>Copy all</button>
          <button type="button" class="chip" data-clear-favourites>Clear</button>
        </div>
      </div>
      <ul class="ng-fav-list" data-favourites aria-label="Favourite names">
        ${SAMPLE_FAVS.map((n) => favItem(n)).join('\n        ')}
      </ul>
      <p class="hint ng-fav-empty" data-fav-empty hidden>Tap the star next to a name to keep it here.</p>
      <p class="hint ng-fav-note">Kept only while this page is open. Copy the ones you like before you leave.</p>
    </section>

    <template data-result-template>${resultItem('Name', { sample: false })}</template>
    <template data-fav-template>${favItem('Name', false)}</template>
  </div>
</section>`;

/* ---------- copy (all placeholder, TODO(copy)) ---------- */
const HOW = [
  ['Pick a style', 'TODO(copy): choose fantasy, sci-fi, cute, edgy, gamer tag or a mix.'],
  ['Tune it', 'TODO(copy): set the length, capitals and separators, add numbers or a word of your own.'],
  ['Copy or save', 'TODO(copy): copy a name in one tap, or star it to compare favourites side by side.'],
];

const FAQ = [
  ['TODO(copy): Is the username generator free?', 'TODO(copy): yes, no sign-up and no limit.'],
  ['TODO(copy): Are the names checked for availability?', 'TODO(copy): no, check on the platform before you rely on one.'],
  ['TODO(copy): Are my favourites saved?', 'TODO(copy): only while the page is open; nothing is stored or sent.'],
  ['TODO(copy): How long can a username be?', 'TODO(copy): depends on the platform; use the length setting.'],
  ['TODO(copy): Can I use a name I make here?', 'TODO(copy): yes, it is yours to use.'],
];

const TIPS = [
  'TODO(copy): keep it short enough to type on a controller.',
  'TODO(copy): avoid your real name, birthday or location.',
  'TODO(copy): say it out loud; teammates will.',
  'TODO(copy): grab the same name on every platform you use.',
];

function home(ctx) {
  const body = `<main id="main">
${hero({ h1: 'Username generator', lead: 'TODO(copy): Make usernames and gamer tags in five styles, tune the length and format, then copy the one you like. Everything runs in your browser.', trustItems: TRUST, h1Class: 'max-w-[14ch] text-[44px] sm:text-6xl md:text-[80px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  <ol class="ng-steps m-0 grid list-none gap-4 p-0 md:grid-cols-3">${HOW.map(([t, d], n) => `<li class="card p-7"><span class="ng-step num" aria-hidden="true">${n + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>
</section>

<section id="styles" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('Six styles to start from', 'TODO(copy): each style uses its own word lists and sound patterns, written for this site.')}
  <div class="ng-style-grid">${CATEGORIES.map((c) => `<article class="card ng-style"><h3 class="text-2xl">${c.label}</h3><div class="fmt-list ng-samples" translate="no">${c.samples.map((s) => `<span>${s}</span>`).join('')}</div><p>${c.blurb}</p></article>`).join('')}</div>
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">TODO(copy): What makes a good username</h2>
    <p class="mt-5 text-lg text-ink-2">TODO(copy): a paragraph on why short, pronounceable names are easier to remember, type and find, and how a consistent name across platforms helps.</p>
    <p class="mt-5 text-lg text-ink-2">TODO(copy): a paragraph on how the generator combines word parts, and why some names may already be taken.</p></div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">TODO(copy): Tips before you claim one</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${TIPS.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section id="faq" class="wrap wrap-narrow mt-32 scroll-mt-20">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(FAQ)}
</section>
</main>`;
  return {
    title: 'Username Generator: Fantasy, Sci-fi and Gamer Tag Names', // TODO(copy)
    desc: 'TODO(copy): Free username generator. Make fantasy, sci-fi, cute, edgy and gamer tag names, set the length and style, and copy in one tap.',
    body, faq: FAQ, tool: { category: 'UtilitiesApplication' }, scripts: ['assets/tool.js'],
  };
}

/* ---------- text pages (framework templates; TODO(copy) for the logic/copy agent) ---------- */
const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: '<p>TODO(copy): why this tool exists and how it works. Word lists are written fresh for this site.</p>' }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you type and the names you make', dataHtml: '<p>TODO(copy): names are generated in your browser. The optional word you type and your favourites stay in the page memory only and are gone when you close or reload it. Nothing is sent to us.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool that suggests usernames in your browser.`, ownershipHtml: '<p>TODO(copy): you may use any name you make. We do not claim names you generate.</p>', processingHtml: '<p>TODO(copy): names are made on your device and not kept by us.</p>', responsibilityHtml: '<p>TODO(copy): check a name is available, allowed on the platform, and does not infringe anyone else\'s rights before you use it.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea for a style? Email us.' }) },
];

export default { site, pages, copy: [['src/tool.js', 'assets/tool.js']] };
