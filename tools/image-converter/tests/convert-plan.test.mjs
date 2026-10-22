import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATS, MAX_MEGAPIXELS, extensionOf, baseName, formatOfFile, checkInput, checkDimensions, clampQuality, qualityArg, normaliseHex, needsBackground, showsQuality, outputName, formatBytes, changeSummary } from '../src/convert-plan.mjs';

test('format table maps ids, mime types and extensions', () => {
  assert.deepEqual(Object.keys(FORMATS), ['jpg', 'png', 'webp']);
  assert.equal(FORMATS.jpg.mime, 'image/jpeg');
  assert.equal(FORMATS.jpg.ext, 'jpg');
  assert.equal(FORMATS.png.mime, 'image/png');
  assert.equal(FORMATS.webp.mime, 'image/webp');
});

test('formatOfFile prefers mime type, falls back to extension', () => {
  assert.equal(formatOfFile({ type: 'image/jpeg', name: 'x.png' }), 'jpg');
  assert.equal(formatOfFile({ type: '', name: 'PHOTO.JPEG' }), 'jpg');
  assert.equal(formatOfFile({ type: '', name: 'a.webp' }), 'webp');
  assert.equal(formatOfFile({ type: 'image/png' }), 'png');
  assert.equal(formatOfFile({ type: 'text/plain', name: 'a.txt' }), '');
});

test('extension and base names', () => {
  assert.equal(extensionOf('a.b.PNG'), 'png');
  assert.equal(extensionOf('noext'), '');
  assert.equal(baseName('holiday.photo.jpeg'), 'holiday.photo');
  assert.equal(baseName('C:\\pics\\a:b?.png'), 'a_b_');
  assert.equal(baseName('...'), 'image');
  assert.equal(baseName(''), 'image');
  assert.equal(baseName('x'.repeat(300) + '.png').length, 120);
});

test('checkInput accepts images, rejects the rest with a reason', () => {
  assert.equal(checkInput({ type: 'image/png', name: 'a.png', size: 5 }).ok, true);
  assert.equal(checkInput({ type: '', name: 'a.webp', size: 5 }).ok, true);
  assert.equal(checkInput({ type: 'image/gif', name: 'a.gif', size: 5 }).ok, true);
  assert.equal(checkInput({ type: 'application/pdf', name: 'a.pdf', size: 5 }).ok, false);
  assert.match(checkInput({ type: 'image/heic', name: 'a.heic', size: 5 }).reason, /HEIC/);
  assert.match(checkInput({ type: '', name: 'IMG.HEIC', size: 5 }).reason, /HEIC/);
  assert.match(checkInput({ type: 'image/png', name: 'a.png', size: 0 }).reason, /empty/);
});

test('dimension limit is 100 megapixels', () => {
  assert.equal(MAX_MEGAPIXELS, 100);
  assert.equal(checkDimensions(10000, 10000).ok, true);
  const r = checkDimensions(10001, 10000);
  assert.equal(r.ok, false);
  assert.match(r.reason, /100 megapixels/);
  assert.equal(checkDimensions(0, 10).ok, false);
  assert.equal(checkDimensions(NaN, 10).ok, false);
  assert.equal(checkDimensions(4000, 3000).mp, 12);
});

test('quality is clamped and only used for lossy formats', () => {
  assert.equal(clampQuality(0), 1);
  assert.equal(clampQuality(500), 100);
  assert.equal(clampQuality('72.4'), 72);
  assert.equal(clampQuality('abc'), 85);
  assert.equal(qualityArg('jpg', 90), 0.9);
  assert.equal(qualityArg('webp', 50), 0.5);
  assert.equal(qualityArg('png', 50), undefined);
  assert.equal(showsQuality('png'), false);
  assert.equal(showsQuality('jpg'), true);
  assert.equal(showsQuality('webp'), true);
});

test('only JPG needs a flattening background', () => {
  assert.equal(needsBackground('jpg'), true);
  assert.equal(needsBackground('png'), false);
  assert.equal(needsBackground('webp'), false);
});

test('normaliseHex', () => {
  assert.equal(normaliseHex('#FFF'), '#ffffff');
  assert.equal(normaliseHex('1a2B3c'), '#1a2b3c');
  assert.equal(normaliseHex('#12345'), '');
  assert.equal(normaliseHex('red'), '');
  assert.equal(normaliseHex(null), '');
});

test('outputName swaps the extension and de-duplicates in a batch', () => {
  const used = new Set();
  assert.equal(outputName('photo.png', 'jpg', used), 'photo.jpg');
  assert.equal(outputName('photo.PNG', 'jpg', used), 'photo (2).jpg');
  assert.equal(outputName('Photo.webp', 'jpg', used), 'Photo (3).jpg');
  assert.equal(outputName('other.jpeg', 'webp', used), 'other.webp');
  assert.equal(outputName('my.holiday.photo.jpg', 'png', new Set()), 'my.holiday.photo.png');
  assert.equal(outputName('', 'png', new Set()), 'image.png');
  assert.throws(() => outputName('a.png', 'gif'));
});

test('formatBytes and changeSummary', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(999), '999 B');
  assert.equal(formatBytes(1500), '1.5 KB');
  assert.equal(formatBytes(48000), '48 KB');
  assert.equal(formatBytes(2_500_000), '2.50 MB');
  assert.equal(formatBytes(25_000_000), '25.0 MB');
  assert.equal(formatBytes(-1), '');
  assert.deepEqual(changeSummary(1000, 250), { text: '75% smaller', kind: 'smaller' });
  assert.deepEqual(changeSummary(1000, 1500), { text: '50% larger', kind: 'larger' });
  assert.deepEqual(changeSummary(1000, 1000), { text: 'Same size', kind: 'same' });
});
