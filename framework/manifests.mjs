// Reads and checks tools/*/manifest.json. Used by the hub build and by `npm test`.
// A tool without a manifest.json (for example _starter and hub) is not listed anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REQUIRED = ['name', 'slug', 'description', 'keywords', 'category'];

export function validateManifest(m, folder) {
  const errors = [];
  for (const k of REQUIRED) if (m[k] == null || m[k] === '') errors.push(`missing "${k}"`);
  if (m.slug && m.slug !== folder) errors.push(`slug "${m.slug}" must equal its folder name "${folder}"`);
  if (m.slug && !/^[a-z0-9-]+$/.test(m.slug)) errors.push('slug must be lowercase letters, numbers and dashes');
  if (m.keywords && (!Array.isArray(m.keywords) || m.keywords.length < 1 || m.keywords.some((k) => typeof k !== 'string'))) errors.push('keywords must be a non-empty array of strings');
  if (m.description && m.description.length > 200) errors.push('description should be 200 characters or fewer');
  if (m.url && !/^https:\/\//.test(m.url)) errors.push('url, if given, must start with https://');
  return errors;
}

/** Every tool folder that has a manifest.json, validated. Throws one error listing all problems. */
export function loadManifests(root = ROOT) {
  const toolsDir = path.join(root, 'tools');
  const out = [];
  const problems = [];
  for (const folder of fs.readdirSync(toolsDir).sort()) {
    if (folder.startsWith('_')) continue;
    const file = path.join(toolsDir, folder, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    let m;
    try { m = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { problems.push(`tools/${folder}/manifest.json: not valid JSON (${e.message})`); continue; }
    const errs = validateManifest(m, folder);
    if (errs.length) problems.push(`tools/${folder}/manifest.json: ${errs.join('; ')}`);
    out.push({ ...m, folder, href: (m.url || `${config.domain}/${m.slug}`).replace(/\/?$/, '/') }); // trailing slash, to match each site's canonical URLs
  }
  if (problems.length) throw new Error('Manifest problems:\n  ' + problems.join('\n  '));
  return out;
}
