// __NAME__: replace this line with a one-sentence description of the tool.
// Copied from tools/_starter by `npm run new`. Search for TODO to find what to fill in.
import { hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';

const UPDATED = 'TODO: D Month YYYY';

const site = {
  id: '__ID__',
  name: '__NAME__',
  url: 'https://example.com', // TODO: real domain before launch
  contact: 'hello@example.com', // TODO
  parent: 'MacuTech', // umbrella brand in the footer; remove the line to show the tool's own name
  operator: 'TODO: your name or business name (and ABN if you have one)',
  tagline: 'TODO: one short sentence on what the tool does.',
  privacySummary: 'TODO: one or two sentences. Say plainly what happens to what visitors type or upload.',
  // Ads and analytics stay OFF until filled in (see README: Turning on ads and analytics).
  ads: { client: '', slots: { 'below-tool': '', mid: '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Independent tool.',
  footnote2: '',
  nav: [{ id: 'about', label: 'About' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

const FAQ = [
  ['TODO: the question people search for?', 'TODO: a short, honest answer.'],
];

const toolHtml = () => `<section id="tool" class="tool" data-tool aria-label="${site.name} tool">
  <div class="stage"><div data-output aria-live="polite"></div></div>
  <form class="panel" autocomplete="off" novalidate onsubmit="return false">
    <div class="block"><label class="lbl" for="tool-input">Your text</label><div class="field"><input id="tool-input" name="input" data-input placeholder="Type here&hellip;"></div></div>
    <div class="panel-actions"><button type="button" class="btn btn-primary w-full">TODO: main action</button></div>
  </form>
</section>`;

function home(ctx, page) {
  const body = `<main id="main">
${hero({ h1: 'TODO: the exact phrase people search for', lead: 'TODO: one paragraph explaining what it does.', trustItems: ['Free, no sign-up', 'Runs in your browser'], after: toolHtml() })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  <ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${[['Step one', 'TODO'], ['Step two', 'TODO'], ['Step three', 'TODO']].map(([t, d]) => `<li class="card p-7"><h3 class="text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>
</section>
<section class="wrap wrap-narrow mt-32">
  ${adSlot(ctx, 'mid')}
  ${sectionHead('Questions')}
  ${faqHtml(FAQ)}
</section>
</main>`;
  return { title: `${site.name}: TODO search phrase`, desc: 'TODO: meta description, about 150 characters.', body, faq: FAQ, tool: {}, scripts: ['assets/tool.js'] };
}

const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: '<p>TODO: why this tool exists and how it works.</p>' }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you type', dataHtml: '<p>TODO: what happens to visitor input.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free online tool.`, ownershipHtml: '<p>TODO: who owns what visitors enter or upload (usually: they do).</p>', processingHtml: '<p>TODO: where their input is processed, and whether we keep it. Only say "not kept" if it is verified.</p>', responsibilityHtml: '<p>TODO: what visitors must check themselves.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea? Email us.' }) },
];

export default { site, pages, copy: [['src/tool.js', 'assets/tool.js']] };
