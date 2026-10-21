// Tool Factory: shared page building blocks for every tool site.
// A tool's site.mjs describes its pages and content; framework/build.mjs turns that into a static site.
// Nothing here is specific to one tool.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- icons ---------- */
export const ICON = {
  check: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  arrow: '<svg class="go" width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9h11M10 4.5L14.5 9 10 13.5"/></svg>',
  external: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7 9"/></svg>',
  menu: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 6h12M3 12h12"/></svg>',
};

/**
 * Build the shared context for one tool site.
 * @param {object} cfg  { site, pages, network, preview }
 *   site:  { id, name, url, contact, tagline, mark (svg inner, optional), nav: [{id,label,hash?}], cta: (page)=>bool,
 *            parent: umbrella brand shown in the footer ('A <parent> project.'), optional
 *            footerCols: [{title, links:[{id,label,hash?}]}], themeColor }
 *   pages: [{ id, slug, render(ctx, page) => {title, desc, body, faq?, tool?, noindex?} }]
 *   network: [{ id, name, url, blurb, live }]  (from /network.json, for links between tool sites)
 */
export function createContext({ site, pages, network = [], preview = false }) {
  const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
  const depth = (slug) => slug.split('/').filter(Boolean).length;
  const relRoot = (slug) => (depth(slug) ? '../'.repeat(depth(slug)) : './');
  const link = (from, toId, hash = '') => {
    const to = byId[toId];
    if (!to) throw new Error(`Unknown page id "${toId}"`);
    const rel = relRoot(from.slug);
    const href = to.slug ? `${rel}${to.slug}/${preview ? 'index.html' : ''}` : preview ? `${rel}index.html` : rel;
    return href + hash;
  };
  const otherTools = network.filter((t) => t.id !== site.id && t.live);
  return { site, pages, byId, network, otherTools, preview, link, relRoot };
}

/* ---------- shared pieces ---------- */
export function logo(ctx) {
  const mark = ctx.site.mark || '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="currentColor" stroke="none"/>';
  return `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">${mark}</svg></span>`;
}

export function header(ctx, page) {
  const { site, link } = ctx;
  const items = site.nav.map((n) => `<a class="navlink" href="${link(page, n.id, n.hash)}"${page.id === n.id && !n.hash ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  const cta = site.cta?.(page) ? '<a class="btn btn-light !h-10 !px-5 !text-sm" href="#tool">Try it</a>' : '';
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="wrap flex h-16 items-center justify-between gap-4">
    <a href="${link(page, 'home')}" class="brand" translate="no" aria-label="${esc(site.name)} home">${logo(ctx)}${site.name}</a>
    <nav class="hidden items-center gap-1 md:flex" aria-label="Main">${items}</nav>
    <div class="flex items-center gap-2">${cta}<button type="button" class="icon-btn md:!hidden" data-menu-toggle aria-expanded="false" aria-label="Menu">${ICON.menu}</button></div>
  </div>
  <div class="md:hidden" data-menu hidden><nav class="wrap flex flex-col pb-3" aria-label="Mobile">${items}</nav></div>
</header>`;
}

export function footer(ctx, page) {
  const { site, link, otherTools } = ctx;
  const li = (l) => `<li><a href="${link(page, l.id, l.hash)}">${l.label}</a></li>`;
  const col = (title, inner) => `<div><p class="text-sm font-semibold text-ink">${title}</p><ul class="m-0 mt-4 grid list-none gap-2.5 p-0 text-[15px]">${inner}</ul></div>`;
  const cols = site.footerCols.map((c) => col(c.title, c.links.map(li).join('')));
  if (otherTools.length) cols.push(col('More tools', otherTools.map((t) => `<li><a href="${t.url}">${esc(t.name)}</a></li>`).join('')));
  return `<footer class="site-footer">
  <div class="wrap grid gap-10 pt-16 pb-10 md:grid-cols-[1.5fr_repeat(${cols.length},1fr)]">
    <div>
      <div class="brand" translate="no">${logo(ctx)}${site.name}</div>
      <p class="mt-4 max-w-[34ch] text-[15px] text-ink-2">${site.parent ? `A ${esc(site.parent)} project.` : site.tagline}</p>
    </div>
    ${cols.join('\n    ')}
  </div>
  <div class="wrap flex flex-col gap-2 pb-12 text-[13px] text-ink-3 md:flex-row md:justify-between">
    <p>&copy; <span data-year>2026</span> ${esc(site.parent || site.name)}. ${site.footnote || ''}</p>
    <p>${site.footnote2 || ''}${adsLive(site) || ctx.preview ? ' <button type="button" class="link-btn" data-privacy-settings>Privacy settings</button>' : ''}</p>
  </div>
</footer>`;
}

/* ---------- ads ---------- */
const adsLive = (site) => !!(site.ads && site.ads.client);
/**
 * An ad space. Production: renders only when site.ads.client and that slot's id are set, otherwise nothing.
 * Preview: always renders a labelled placeholder so placement can be reviewed. Fixed height, so the page never jumps.
 * Always placed below the tool, never inside it.
 */
export function adSlot(ctx, name) {
  const { site, preview } = ctx;
  const id = site.ads?.slots?.[name];
  if (adsLive(site) && id && !preview) {
    return `<aside class="wrap ad-wrap" aria-label="Advertisement"><p class="ad-label">Advertisement</p><div class="ad-slot"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(site.ads.client)}" data-ad-slot="${esc(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div></aside>`;
  }
  if (preview) return `<aside class="wrap ad-wrap" aria-label="Ad space placeholder"><p class="ad-label">Advertisement</p><div class="ad-slot ad-ph"><span>Ad space (${esc(name)}). Shown only in this preview.</span></div></aside>`;
  return '';
}

export const trust = (items) => `<div class="trust">${items.map((t) => `<span>${ICON.check}${t}</span>`).join('')}</div>`;

export const sectionHead = (title, sub = '', size = 'text-4xl md:text-[56px]') =>
  `<div class="section-head"><h2 class="${size}">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;

export const faqHtml = (items) => `<div class="faq">${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="ans">${esc(a)}</div></details>`).join('')}</div>`;

export const tiles = (items) => `<div class="tile-grid">${items.map((t) => `<a class="tile" href="${t.href}"><span class="big">${t.big}</span><span class="what">${t.what}</span>${ICON.arrow}</a>`).join('')}</div>`;

/** Centred page hero with the soft colour wash. `after` is placed below (usually the tool). */
export const hero = ({ h1, lead, trustItems, after = '', h1Class = 'max-w-[14ch] text-[44px] sm:text-6xl md:text-[80px]' }) => `<section class="glow">
  <div class="wrap pt-14 text-center md:pt-24">
    <h1 class="rise mx-auto ${h1Class}">${h1}</h1>
    <p class="rise mx-auto mt-6 max-w-[54ch] text-lg text-ink-2 md:text-xl" style="--d:.08s">${lead}</p>
    ${trustItems ? `<div class="rise mt-7" style="--d:.14s">${trust(trustItems)}</div>` : ''}
    ${after ? `<div class="rise pt-12 md:pt-14" style="--d:.2s">${after}</div>` : ''}
  </div>
</section>`;

/** Simple text page (privacy, terms, about, contact). `html` is trusted markup written by us. */
export const textPage = ({ h1, intro = '', html, updated }) => `<main id="main" class="glow"><div class="wrap wrap-narrow pt-16 md:pt-24">
  <h1 class="text-5xl md:text-7xl">${h1}</h1>
  ${updated ? `<p class="mt-4 text-sm text-ink-3">Last updated ${updated}</p>` : ''}
  ${intro ? `<p class="mt-6 text-lg text-ink-2 md:text-xl">${intro}</p>` : ''}
  <div class="prose mt-10">${html}</div>
</div></main>`;

/* ---------- document ---------- */
export function layout(ctx, page, { title, desc, body, faq, tool, noindex, scripts = [] }) {
  const { site, preview, relRoot } = ctx;
  const fragment = preview && page.id === 'home';
  const rel = relRoot(page.slug);
  const ld = [];
  if (tool) ld.push({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: `${site.name}: ${title}`, applicationCategory: tool.category || 'UtilitiesApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
  if (faq?.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  const ldHtml = ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
  const js = ['assets/site.js', ...scripts].map((s) => `<script type="module" src="${rel}${s}"></script>`).join('');
  const adHead = !preview && adsLive(site) ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(site.ads.client)}" crossorigin="anonymous"></script>\n` : '';
  const analytics = !preview && site.analytics?.cloudflareToken ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(site.analytics.cloudflareToken)}"}'></script>` : '';
  const inner = `<div id="app">${header(ctx, page)}${body}${footer(ctx, page)}</div>${ldHtml}\n${js}${analytics}`;
  const robots = preview || noindex ? '<meta name="robots" content="noindex">' : '';
  const canonical = preview ? '' : `<link rel="canonical" href="${site.url}/${page.slug ? page.slug + '/' : ''}">`;
  if (fragment) return `<title>${esc(site.name)}</title>\n<meta name="description" content="${esc(desc)}">\n${robots}\n<link rel="stylesheet" href="${rel}assets/styles.css">\n${inner}\n`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${site.themeColor || '#0e1124'}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots}${canonical}
${adHead}<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${rel}assets/styles.css">
${preview ? '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>' : ''}
</head>
<body>
${inner}
</body>
</html>
`;
}
