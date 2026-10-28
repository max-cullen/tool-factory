// Tool index: one page listing every tool, generated at build time from tools/*/manifest.json.
// Nothing to edit when a tool is added: add its manifest.json and rebuild. Brand and domain: framework/config.mjs.
import { esc, hero, sectionHead, faqHtml, adSlot, ICON } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import { loadManifests } from '../../framework/manifests.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';
const tools = loadManifests().sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

const site = {
  id: 'hub',
  name: config.brand,
  url: `${config.domain}/tools`, // the index is served at /tools/ (same pattern as FitReel at /instagram/)
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  tagline: 'Small, free tools that run in your browser.',
  privacySummary: 'The tools on this site run inside your web browser. What you type or upload is not sent to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  // Ads and analytics stay OFF until the owner fills these in (see README). No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Built to make things simpler.',
  footnote2: 'Your files and text stay on your device.',
  nav: [{ id: 'about', label: 'About' }],
  cta: () => false,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

const FAQ = [
  ['Do these tools upload my files?', 'No. Every tool runs inside your web browser, so the files and text you use stay on your device. Nothing is sent to our servers.'],
  ['Are the tools free?', 'Yes. They are free to use with no sign-up. The site is paid for by ads, which load separately from the tools.'],
  ['Do the tools work on a phone?', 'Yes. Each tool is built to work on a phone and on a computer. A recent version of Chrome, Edge, Safari or Firefox is recommended.'],
  ['Can I use the results for work?', 'Yes. What you make is yours. Check any rules of the place you are submitting it to, because we cannot promise a result will be accepted by a particular form or service.'],
  ['How do I report a problem or suggest a tool?', 'Email us using the address on the Contact page. Please say which tool and which browser you were using.'],
];

function home(ctx, page) {
  const cats = [...new Set(tools.map((t) => t.category))];
  const groups = cats.map((c) => `<h2 class="cat-title">${esc(c)}</h2><div class="tile-grid">${tools.filter((t) => t.category === c).map((t) => `<a class="tile tool-tile" href="${esc(t.href)}"><span class="big">${esc(t.name)}</span><span class="what">${esc(t.description)}</span>${ICON.arrow}</a>`).join('')}</div>`).join('');
  const body = `<main id="main">
${hero({ h1: 'Small tools that just work', lead: `Free tools for everyday jobs: images, text, timers and more. Each one runs in your browser, so your files stay on your device.`, trustItems: ['Nothing is uploaded', 'Free, no sign-up', 'Works on phone and desktop'], h1Class: 'max-w-[16ch] text-[44px] sm:text-6xl md:text-[72px]' })}
<section class="wrap mt-20" id="tools">${groups}</section>
${adSlot(ctx, 'below-tool')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions')}
  ${faqHtml(FAQ)}
</section>
</main>`;
  return { title: `${config.brand}: free browser tools for images, text and more`, desc: 'Free tools that run in your browser: nothing is uploaded and there is nothing to sign up for.', body, faq: FAQ };
}

const pages = [
  { id: 'home', slug: '', render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${config.brand} is a small collection of free tools that run entirely in your web browser. We built them for quick everyday jobs where you do not want to install anything or hand a file to a stranger's server.</p><p>Each tool is a separate page with its own instructions and questions answered. The list on the home page is generated from the tools themselves, so it always matches what is available.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you type or upload', dataHtml: '<p>The tools process what you give them inside your browser. It is not uploaded to us or to anyone else, and it is gone when you close or reload the page.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${config.brand} is a collection of free online tools.`, ownershipHtml: '<p>What you enter or upload belongs to you. We do not claim any rights over it.</p>', processingHtml: '<p>Tools process your content in your own browser. We do not receive or keep a copy of it.</p>', responsibilityHtml: '<p>Check that a result is right for your purpose before you use it. We cannot promise that any form or service will accept it.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea for a tool? Email us.' }) },
];

// Every tool's own address also goes in this site's sitemap (build.mjs adds these and removes duplicates).
export default { site, pages, copy: [], sitemapUrls: () => tools.map((t) => t.href) };
