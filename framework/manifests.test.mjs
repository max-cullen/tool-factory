// Run with `npm test`. Checks every tools/*/manifest.json and the checker itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadManifests, validateManifest } from './manifests.mjs';

test('every manifest in tools/ is valid', () => {
  const list = loadManifests();
  assert.ok(list.length >= 1);
  const slugs = list.map((m) => m.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'slugs must be unique');
});

test('validateManifest catches the common mistakes', () => {
  const good = { name: 'X', slug: 'x', description: 'd', keywords: ['a'], category: 'c' };
  assert.deepEqual(validateManifest(good, 'x'), []);
  assert.ok(validateManifest({ ...good, slug: 'y' }, 'x').length);
  assert.ok(validateManifest({ ...good, keywords: [] }, 'x').length);
  assert.ok(validateManifest({ ...good, name: '' }, 'x').length);
  assert.ok(validateManifest({ ...good, url: 'http://x.com' }, 'x').length);
});
