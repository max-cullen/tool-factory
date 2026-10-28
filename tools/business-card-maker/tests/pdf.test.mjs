import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { buildPdf, rgbaToRgb, num, pdfString } from '../src/pdf.mjs';
import { mmToPt } from '../src/units.mjs';

const latin1 = (u8) => Buffer.from(u8).toString('latin1');
function sampleImage(w = 4, h = 3) {
  const rgb = new Uint8Array(w * h * 3).map((_, i) => (i * 7) % 256);
  return { width: w, height: h, data: new Uint8Array(zlib.deflateSync(rgb)), filter: 'FlateDecode', rgb };
}
const page = (extra = {}) => ({ widthMm: 90, heightMm: 55, image: sampleImage(), ...extra });

test('header, binary marker and trailer', () => {
  const pdf = buildPdf({ pages: [page()] });
  const s = latin1(pdf);
  assert.ok(s.startsWith('%PDF-1.4\n%'));
  assert.ok(pdf[10] > 127 && pdf[11] > 127); // binary marker bytes
  assert.ok(s.endsWith('%%EOF\n'));
  assert.match(s, /trailer\n<< \/Size 7 \/Root 1 0 R \/Info 3 0 R >>/);
});
test('MediaBox is 255.118 x 155.906 pt for 90 x 55 mm', () => {
  const s = latin1(buildPdf({ pages: [page()] }));
  assert.match(s, /\/MediaBox \[0 0 255\.118 155\.906\]/);
  assert.match(s, /q 255\.118 0 0 155\.906 0 0 cm \/Im0 Do Q/);
  assert.equal(num(mmToPt(90)), '255.118');
});
test('xref offsets point at the start of each object, and startxref at the xref table', () => {
  const pdf = buildPdf({ pages: [page()] });
  const s = latin1(pdf);
  const start = Number(/startxref\n(\d+)\n%%EOF/.exec(s)[1]);
  assert.equal(s.slice(start, start + 4), 'xref');
  const lines = s.slice(start).split('\n');
  const [, count] = lines[1].split(' ').map(Number);
  assert.equal(count, 7); // 0 + catalog, pages, info, page, content, image
  assert.equal(lines[2], '0000000000 65535 f ');
  for (let n = 1; n < count; n++) {
    const entry = lines[2 + n];
    assert.match(entry, /^\d{10} 00000 n $/);
    assert.equal(entry.length, 19); // 20 bytes with the newline
    const off = Number(entry.slice(0, 10));
    assert.ok(s.startsWith(`${n} 0 obj\n`, off), `object ${n} at ${off}`);
  }
});
test('stream /Length values match the bytes between stream and endstream; flate data round-trips', () => {
  const img = sampleImage(9, 5);
  const pdf = buildPdf({ pages: [{ widthMm: 90, heightMm: 55, image: img }] });
  const s = latin1(pdf);
  const re = /\/Length (\d+) >>\nstream\n/g;
  let m; let found = 0;
  while ((m = re.exec(s))) {
    const from = m.index + m[0].length; const len = Number(m[1]);
    assert.equal(s.slice(from + len, from + len + 10), '\nendstream');
    found++;
    if (/\/Subtype \/Image/.test(m[0]) || len === img.data.length) {
      const inflated = zlib.inflateSync(Buffer.from(pdf.slice(from, from + len)));
      assert.deepEqual(new Uint8Array(inflated), img.rgb);
    }
  }
  assert.equal(found, 2);
});
test('image dictionary declares size, RGB, 8 bits and filter', () => {
  const s = latin1(buildPdf({ pages: [page()] }));
  assert.match(s, /\/Subtype \/Image \/Width 4 \/Height 3 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/FlateDecode/);
  const raw = latin1(buildPdf({ pages: [page({ image: { width: 1, height: 1, data: new Uint8Array([1, 2, 3]) } })] }));
  assert.ok(!/\/Filter/.test(raw));
});
test('two pages: counts, kids and offsets stay correct', () => {
  const pdf = buildPdf({ pages: [page(), page()], title: 'Two (sides)' });
  const s = latin1(pdf);
  assert.match(s, /\/Kids \[4 0 R 7 0 R\] \/Count 2/);
  assert.match(s, /\/Title \(Two \\\(sides\\\)\)/);
  const start = Number(/startxref\n(\d+)/.exec(s)[1]);
  const lines = s.slice(start).split('\n');
  for (let n = 1; n < 10; n++) assert.ok(s.startsWith(`${n} 0 obj\n`, Number(lines[2 + n].slice(0, 10))));
});
test('bleed adds TrimBox inside a larger MediaBox', () => {
  const s = latin1(buildPdf({ pages: [{ widthMm: 96, heightMm: 61, trimInsetMm: 3, image: sampleImage() }] }));
  assert.match(s, /\/MediaBox \[0 0 272\.126 172\.913\] \/TrimBox \[8\.504 8\.504 263\.622 164\.409\]/);
});
test('rgbaToRgb drops alpha; pdfString escapes', () => {
  assert.deepEqual([...rgbaToRgb(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 0]))], [1, 2, 3, 4, 5, 6]);
  assert.equal(pdfString('a(b)\\cé'), '(a\\(b\\)\\\\c)');
});
test('no pages is an error', () => assert.throws(() => buildPdf({ pages: [] })));
