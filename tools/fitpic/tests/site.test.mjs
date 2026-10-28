// Content and structure checks on the rendered Fitpic site (rendered in memory, nothing is written to dist).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderSite, visibleWords, TOOL } from './helpers.mjs';

const prod = await renderSite();
const prev = await renderSite({ preview: true });
const byId = Object.fromEntries(prod.pages.map((p) => [p.page.id, p]));
const slugs = new Set(prod.pages.map((p) => p.page.slug));
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '');

test('every page has a title, a description, a canonical URL and exactly one h1', () => {
  for (const { page, html } of prod.pages) {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title && title.length > 10 && title.length <= 80, `${page.id} title: ${title}`);
    const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(desc && desc.length >= 20 && desc.length <= 300, `${page.id} description length ${desc?.length}`);
    const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canon, `${prod.def.site.url}/${page.slug ? page.slug + '/' : ''}`, `${page.id} canonical`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${page.id} h1 count`);
  }
});

test('page titles and descriptions are unique', () => {
  const titles = prod.pages.map((p) => p.html.match(/<title>([^<]+)<\/title>/)[1]);
  const descs = prod.pages.map((p) => p.html.match(/<meta name="description" content="([^"]+)"/)[1]);
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(new Set(descs).size, descs.length);
});

test('home and the size pages carry at least 300 visible words', () => {
  const must = ['home', 'kb', 'px', ...prod.pages.filter((p) => p.page.size).map((p) => p.page.id)];
  for (const id of must) assert.ok(visibleWords(byId[id].html) >= 300, `${id}: ${visibleWords(byId[id].html)} words`);
});

test('home has a How it works section and an FAQ of 5 or more questions', () => {
  const home = byId.home.html;
  assert.match(home, /<h2[^>]*>\s*How it works\s*<\/h2>/);
  assert.ok((home.match(/<details>/g) || []).length >= 5);
  assert.ok(byId.home.out.faq.length >= 5);
});

test('FAQ JSON-LD parses and matches the visible questions', () => {
  for (const { page, html, out } of prod.pages) {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1].replace(/\\u003c/g, '<')));
    if (!out.faq?.length) continue; // text pages carry no FAQ
    assert.ok(blocks.length > 0, `${page.id}: no JSON-LD`);
    const faq = blocks.find((b) => b['@type'] === 'FAQPage');
    if (out.faq?.length) {
      assert.ok(faq, `${page.id}: FAQPage missing`);
      assert.equal(faq.mainEntity.length, out.faq.length);
      for (const q of faq.mainEntity) assert.ok(q.name && q.acceptedAnswer?.text);
    }
  }
});

test('About, Privacy, Terms and Contact are linked from every footer', () => {
  for (const { page, html } of prod.pages) {
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] || '';
    for (const s of ['about', 'privacy', 'terms', 'contact']) {
      assert.ok(new RegExp(`href="[^"]*${s}/?"`).test(footer), `${page.id}: footer lacks ${s}`);
    }
  }
});

test('internal links and the canonical set resolve to built pages', () => {
  const extra = new Set((prod.def.include || []).map((i) => i.path)); // tools built into sub-folders by the includes in site.mjs (FitReel, the tool index, the other tools)
  for (const { page, html } of prod.pages) {
    const depth = page.slug ? 1 : 0;
    for (const m of strip(html).matchAll(/href="([^"#?]*)(#[^"]*)?"/g)) {
      const href = m[1];
      if (!href || /^(https?:|mailto:|tel:)/.test(href)) continue;
      const rel = href.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '').replace(/\/$/, '');
      if (/\.(css|js|svg|png|ico|txt|xml)$/.test(rel) || rel.startsWith('assets')) continue;
      assert.ok(slugs.has(rel) || extra.has(rel.split('/')[0]), `${page.id} (depth ${depth}): broken link "${href}"`);
    }
  }
});

test('production robots allows Google and is indexable; preview blocks it', () => {
  for (const { page, html } of prod.pages) assert.doesNotMatch(html, /noindex/i, `${page.id} is noindex in production`);
  for (const { page, html } of prev.pages) assert.match(html, /noindex/i, `${page.id} should be noindex in preview`);
});

test('no analytics token, and no ad id other than the one already committed', () => {
  const { site } = prod.def;
  assert.equal(site.analytics.cloudflareToken, '');
  assert.deepEqual(Object.values(site.ads.slots), ['', '', '', '']);
  assert.match(site.ads.client, /^ca-pub-\d{16}$/);
  const src = fs.readFileSync(path.join(TOOL, 'site.mjs'), 'utf8');
  assert.deepEqual([...new Set(src.match(/ca-pub-\d+/g))], [site.ads.client]);
  for (const { page, html } of prod.pages) {
    assert.doesNotMatch(html, /cloudflareinsights|google-analytics|googletagmanager|gtag\(|plausible|matomo|hotjar/i, `${page.id}: analytics`);
    for (const id of new Set(html.match(/ca-pub-\d+/g) || [])) assert.equal(id, site.ads.client);
  }
});

test('the pages load nothing from third parties (plain outbound anchors such as credits are fine)', () => {
  for (const { page, html } of prod.pages) {
    const hosts = new Set([...strip(html).matchAll(/<(?:link|img|iframe|source|video|audio)\b[^>]*?(?:src|href)="(https?:\/\/[^/"]+)/g)].map((m) => m[1]));
    for (const h of hosts) assert.ok(h === prod.def.site.url || h === 'https://pagead2.googlesyndication.com', `${page.id}: external ${h}`);
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    // The only permitted external script is Google AdSense, loaded because an ad client id is already committed.
    for (const s of scripts) assert.ok(!/^https?:/.test(s) || s.startsWith('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-'), `${page.id}: external script ${s}`);
  }
});

test('sitemap, when a build exists, lists every built page and no preview', { skip: !fs.existsSync(path.join(TOOL, 'dist/sitemap.xml')) }, () => {
  const xml = fs.readFileSync(path.join(TOOL, 'dist/sitemap.xml'), 'utf8');
  const robots = fs.readFileSync(path.join(TOOL, 'dist/robots.txt'), 'utf8');
  if (/Disallow: \//.test(robots)) return; // preview build: nothing to check
  for (const { page } of prod.pages) assert.ok(xml.includes(`<loc>${prod.def.site.url}/${page.slug ? page.slug + '/' : ''}</loc>`), page.id);
  assert.match(robots, /Allow: \//);
});

test('every file listed in copy exists', () => {
  for (const [from] of prod.def.copy) assert.ok(fs.existsSync(path.join(TOOL, from)), from);
});

test('manifest slug and url match the site', () => {
  const m = JSON.parse(fs.readFileSync(path.join(TOOL, 'manifest.json'), 'utf8'));
  assert.equal(m.slug, 'fitpic');
  assert.equal(m.url, prod.def.site.url);
});
