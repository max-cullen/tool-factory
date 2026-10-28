// Shared helpers for the Fitpic tests: render the site in memory (no build, no dist folder, no network).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext, layout } from '../../../framework/lib.mjs';

export const TOOL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = path.resolve(TOOL, '../..');

export async function renderSite({ preview = false } = {}) {
  const { default: def } = await import(pathToFileURL(path.join(TOOL, 'site.mjs')).href);
  const network = JSON.parse(fs.readFileSync(path.join(ROOT, 'network.json'), 'utf8'));
  const ctx = createContext({ site: def.site, pages: def.pages, network, preview });
  const pages = def.pages.map((page) => {
    const out = page.render(ctx, page);
    return { page, out, html: layout(ctx, page, out) };
  });
  return { def, ctx, pages };
}

/** Visible words inside <main> (scripts, styles and tags removed). */
export function visibleWords(html) {
  const m = html.match(/<main[\s\S]*?<\/main>/i);
  const body = (m ? m[0] : html)
    .replace(/<(script|style|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  return body.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
