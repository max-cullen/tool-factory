// Username Generator: makes usernames and gamer tags in several styles, in the browser.
// Pilot layout for the text-tool pattern: see DESIGN-NOTES.md.
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
  tagline: 'Usernames and gamer tags in seconds. Everything runs in your browser.',
  privacySummary: 'The names you make are created inside your web browser. The word you type and the names you save are not sent to us or anyone else, and they are gone when you close the page. The site may show ads and may count visits without cookies, as explained below.',
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
  { id: 'fantasy', label: 'Fantasy', eg: 'Thornwyn', samples: ['Elvaris', 'Duskmere', 'Wyrmgard'], blurb: 'Old-world sounds built from woodland, weather and river words. Suits role-playing games, guild names and storytelling characters.' },
  { id: 'scifi', label: 'Sci-fi', eg: 'NovaKade', samples: ['Voidrunner', 'Zentrix', 'Kepler9'], blurb: 'Sharp consonants, star names and ship-style call signs. A good fit for space games, shooters and anything with a bit of chrome.' },
  { id: 'cute', label: 'Cute', eg: 'HoneyFern', samples: ['Mochibean', 'Dewdrop', 'Pebblewick'], blurb: 'Soft, friendly words from the kitchen, garden and meadow. Easy to read on social profiles and in relaxed, cosy games.' },
  { id: 'edgy', label: 'Edgy', eg: 'Grimshard', samples: ['Hexfall', 'Nightrend', 'Ravenbyte'], blurb: 'Darker words with a hard edge, such as ash, thorn and hex, for a name that sounds a little mysterious. Nothing graphic or hateful.' },
  { id: 'gamer', label: 'Gamer tag', eg: 'Kr4kenRx', samples: ['xFrostbite', 'SnipeVolt', 'Ph4ntomRx'], blurb: 'Short, punchy tags that borrow from lobby chat, with the odd number-for-letter swap like 3 for E. Quick to type on a controller.' },
  { id: 'mix', label: 'Mix', eg: 'Any style', samples: ['AshNova', 'Vexwyn', 'LunaHex'], blurb: 'A bit of everything. Each name pulls its parts from different styles, which is handy when you are not sure what you want yet.' },
];

// Static sample results so the layout can be judged. The logic replaces them (they carry data-sample).
const SAMPLE_RESULTS = ['Thornwyn', 'Elvaris', 'Mirelock', 'Ashveil', 'Duskmere', 'Sylvaran', 'Oakhollow', 'Wyrmgard', 'Faelith', 'Ravenmoor', 'Lunebrook', 'Emberlyn'];
const SAMPLE_FAVS = ['Mirelock', 'Duskmere'];

const TRUST = ['Free, no sign-up', 'Runs in your browser', 'Nothing is saved'];

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

/* ---------- copy ---------- */
const HOW = [
  ['Pick a style', 'Choose fantasy, sci-fi, cute, edgy, gamer tag or a mix. Each style has its own word lists, so the names sound different, not just the same names in new clothes.'],
  ['Tune it', 'Set a length from short to long, choose how capitals work, put an underscore, dot or dash between words, add numbers, or type a word of your own to build the name around.'],
  ['Copy or save', 'Tap Copy on any name, or tap its star to keep it in your favourites. Press Generate or More for a fresh batch whenever you like, and copy the keepers before you leave.'],
];

const FAQ = [
  ['Is the username generator free?', 'Yes. There is nothing to sign up for, no limit on how many names you make, and no download. The site is paid for by ads, which sit beside the tool and never get in the way of it.'],
  ['Are the names checked to see if they are already taken?', 'No. The generator does not look anything up, so it cannot tell you whether a name is free on any game, app or social network. Many combinations will be unused, but some will not be. Treat every name as a suggestion until you have checked it yourself.'],
  ['How do I check whether a name is available?', 'Open the sign-up page of the game or service you want and type the name in; most will say straight away if it is taken. For a quick look elsewhere, search the name in quotation marks in a search engine, and check it on the other platforms you use, so you can keep one name everywhere.'],
  ['How long can a username be?', 'It depends on the service. Some games allow only 12 or 16 characters, some allow letters and numbers but no symbols, and some do not allow spaces, dots or dashes. Use the Length setting to stay inside the limit, and check the rules on the sign-up page. Length counts every character, including separators and numbers.'],
  ['Does the site store or send the names I make?', 'No. Names are made by code running in your browser. The word you type, the names shown and your favourites are not sent to us or anyone else, and nothing is saved in cookies or in the browser\'s storage. The page does not make a network request to produce a name.'],
  ['What happens to my favourites?', 'They are kept in the page\'s memory only. If you close the tab, reload the page or go to another site, they are gone. Use Copy all to paste the list somewhere safe, such as a note, before you leave.'],
  ['How do I pick a name that is safe to share?', 'Leave out your real name, birthday, school, suburb and anything else that points to you. Avoid the same name and number you use for passwords or secret answers. A name made of two unrelated words, like the ones made here, tells strangers nothing about you.'],
  ['Where do the names come from?', 'The word lists were written by hand for this site. The generator joins parts from a list for the style you chose, applies your options and removes repeats. Random choices come from your browser\'s built-in random number generator.'],
  ['Can I use a name I make here?', 'Yes, you are free to use any name the tool suggests. We do not claim names, and we are not connected to any game or service. Because we cannot check, a name may look like a trademark or a name someone else already uses, so choose with care.'],
];

const TIPS = [
  'Keep it short enough to type quickly, including on a controller or phone.',
  'Leave out your real name, birthday, school, suburb and other personal details.',
  'Say it out loud. If it is hard to say, teammates will find it hard to call.',
  'Check the name on the sign-up page, and on each platform you use, before you rely on it.',
  'Stay inside the length and character rules of the game, which differ from one to the next.',
];

function home(ctx) {
  const body = `<main id="main">
${hero({ h1: 'Username generator', lead: 'Make usernames and gamer tags in six styles, tune the length and format, then copy the one you like. Everything runs in your browser.', trustItems: TRUST, h1Class: 'max-w-[14ch] text-[44px] sm:text-6xl md:text-[80px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  <ol class="ng-steps m-0 grid list-none gap-4 p-0 md:grid-cols-3">${HOW.map(([t, d], n) => `<li class="card p-7"><span class="ng-step num" aria-hidden="true">${n + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>
</section>

<section id="styles" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('Six styles to start from', 'Each style has its own word lists and sound patterns, written for this site.')}
  <div class="ng-style-grid">${CATEGORIES.map((c) => `<article class="card ng-style"><h3 class="text-2xl">${c.label}</h3><div class="fmt-list ng-samples" translate="no">${c.samples.map((s) => `<span>${s}</span>`).join('')}</div><p>${c.blurb}</p></article>`).join('')}</div>
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">What makes a good username</h2>
    <p class="mt-5 text-lg text-ink-2">A good username is short, easy to say and easy to spell. People will type it into search boxes, read it out in voice chat and squint at it in a lobby list, so a name with two clear words usually beats a long string of symbols. Using the same name on each service you use also makes you easier to find and easier to remember.</p>
    <p class="mt-5 text-lg text-ink-2">The generator joins word parts from lists written for each style, applies the options you choose and drops repeats. It does not check any game or social network, so a name you like may already belong to someone else. Make a batch, save a few favourites, and test them on the sign-up page before you decide.</p></div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">Tips before you claim one</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${TIPS.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section id="faq" class="wrap wrap-narrow mt-32 scroll-mt-20">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(FAQ)}
</section>
</main>`;
  return {
    title: 'Username Generator: Fantasy, Sci-fi and Gamer Tag Names',
    desc: 'Free username generator. Make fantasy, sci-fi, cute, edgy and gamer tag names, set the length, capitals and separators, and copy in one tap. Runs in your browser; nothing is stored.',
    body, faq: FAQ, tool: { category: 'UtilitiesApplication' }, scripts: ['assets/tool.js'],
  };
}

/* ---------- text pages (framework templates) ---------- */
const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${esc(site.name)} makes usernames and gamer tags for people who want a name and do not want to stare at an empty box. Pick a style, set a length and a few formatting options, and the page suggests twelve names at a time.</p>
<p>Everything happens in your browser. The word lists were written by hand for this site and live in the page's own code; no names are fetched from a server, and nothing you type or save leaves your device. Random choices use the browser's built-in random number generator.</p>
<p>The tool does not check whether a name is taken on any game or service, and it has no connection to any game, platform or brand. It uses no third-party code or libraries.</p>
<p>It is free to use and is paid for by advertising. It is run by ${esc(site.operator)}, in Brisbane, Australia. Questions or ideas for a new style can go to ${esc(site.contact)}.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you type and the names you make', dataHtml: '<p>Names are made in your browser by code that is already on the page. The optional word you type, the options you choose, the names you see and the favourites you save are held in the page\'s memory only. They are never sent to us or to anyone else, and they are not written to cookies, local storage or any other storage. They are gone when you close or reload the page.</p><p>The tool does not need an account and does not ask for personal information. Please do not type personal details into the word box; there is no reason to.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool that suggests usernames and gamer tags in your browser.`, ownershipHtml: '<p>You may use any name the tool suggests, for any lawful purpose. We do not claim names you generate, and we do not keep them.</p>', processingHtml: '<p>Names are made on your device and are not sent to us. Favourites are kept in the page\'s memory and disappear when you close the page.</p>', responsibilityHtml: '<p>The tool does not check whether a name is available, allowed by a game or service, or already used or trademarked by someone else. Before you rely on a name, check it on the platform and make sure it does not infringe anyone else\'s rights or break that service\'s rules. Do not use a name to impersonate, harass or mislead anyone. Do not put personal details into a name you plan to share.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea for a style? Email us.' }) },
];

export default { site, pages, copy: [['src/tool.js', 'assets/tool.js'], ['src/generate.mjs', 'assets/generate.mjs'], ['src/words.mjs', 'assets/words.mjs']] };
