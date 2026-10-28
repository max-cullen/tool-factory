import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, createZip, dedupeNames, dosDateTime } from '../src/zip.mjs';

const enc = (s) => new TextEncoder().encode(s);

test('crc32 matches known values', () => {
  assert.equal(crc32(new Uint8Array(0)), 0);
  assert.equal(crc32(enc('123456789')), 0xcbf43926);
  assert.equal(crc32(enc('a')), 0xe8b7be43);
  assert.equal(crc32(enc('The quick brown fox jumps over the lazy dog')), 0x414fa339);
  assert.equal(crc32(new Uint8Array(32)), 0x190a55ad);
});

test('crc32 can continue from an earlier result', () => {
  const whole = crc32(enc('hello world'));
  assert.equal(crc32(enc(' world'), crc32(enc('hello'))), whole);
});

test('dedupeNames keeps extensions and ignores case', () => {
  assert.deepEqual(dedupeNames(['a.jpg', 'a.jpg', 'A.JPG', 'b.png', 'a (2).jpg']), ['a.jpg', 'a (2).jpg', 'A (3).JPG', 'b.png', 'a (2) (2).jpg']);
  assert.deepEqual(dedupeNames(['x', 'x']), ['x', 'x (2)']);
  assert.deepEqual(dedupeNames(['.hidden', '.hidden']), ['.hidden', '.hidden (2)']);
});

test('dedupeNames removes path tricks', () => {
  assert.deepEqual(dedupeNames(['../../evil.png', 'a\\b.png', '']), ['evil.png', 'a/b.png', 'file']);
});

test('dosDateTime packs a date', () => {
  const [t, d] = dosDateTime(new Date(2026, 9, 23, 14, 30, 10));
  assert.equal(d, ((2026 - 1980) << 9) | (10 << 5) | 23);
  assert.equal(t, (14 << 11) | (30 << 5) | 5);
  assert.equal(dosDateTime(new Date(1970, 0, 1))[1] >> 9, 0);
});

test('createZip layout: signatures, counts and stored sizes', () => {
  const a = enc('hello'), b = new Uint8Array([0, 1, 2, 3, 255]);
  const zip = createZip([{ name: 'a.txt', data: a }, { name: 'b.bin', data: b }]);
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  const eocd = zip.length - 22;
  assert.equal(v.getUint32(eocd, true), 0x06054b50);
  assert.equal(v.getUint16(eocd + 10, true), 2);
  assert.equal(zip.length, 22 + (30 + 5 + 5) + (30 + 5 + 5) + (46 + 5) + (46 + 5));
  assert.equal(v.getUint16(8, true), 0, 'method is store');
  assert.equal(v.getUint32(14, true), crc32(a));
});

test('createZip with no files is a valid empty archive', () => {
  const zip = createZip([]);
  assert.equal(zip.length, 22);
});

test('createZip renames duplicate and UTF-8 names', () => {
  const zip = createZip([{ name: 'café.jpg', data: enc('1') }, { name: 'café.jpg', data: enc('2') }]);
  const text = new TextDecoder().decode(zip);
  assert.ok(text.includes('café.jpg') && text.includes('café (2).jpg'));
});

function have(cmd, args) {
  try { return spawnSync(cmd, args, { encoding: 'utf8' }).status === 0; } catch { return false; }
}

const hasPython = have('python3', ['-c', 'import zipfile']);
test('independent check: Python zipfile reads our archive and the CRCs agree', { skip: !hasPython && 'python3 not available' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'zip-'));
  try {
    const big = new Uint8Array(200000).map((_, i) => (i * 31 + (i >> 8)) & 255);
    const files = [{ name: 'one.png', data: big }, { name: 'one.png', data: enc('dup') }, { name: 'ünï.jpg', data: new Uint8Array(0) }, { name: 'z.webp', data: enc('hello') }];
    const path = join(dir, 'out.zip');
    writeFileSync(path, createZip(files));
    const code = `import zipfile,sys,json
z=zipfile.ZipFile(sys.argv[1])
print(json.dumps({'bad':z.testzip(),'names':z.namelist(),'sizes':[len(z.read(n)) for n in z.namelist()],'crcs':[i.CRC for i in z.infolist()],'comp':[i.compress_type for i in z.infolist()]}))`;
    const r = spawnSync('python3', ['-I', '-c', code, path], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const info = JSON.parse(r.stdout);
    assert.equal(info.bad, null);
    assert.deepEqual(info.names, ['one.png', 'one (2).png', 'ünï.jpg', 'z.webp']);
    assert.deepEqual(info.sizes, [200000, 3, 0, 5]);
    assert.deepEqual(info.crcs, files.map((f) => crc32(f.data)));
    assert.deepEqual(info.comp, [0, 0, 0, 0]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const hasUnzip = have('unzip', ['-v']);
test('independent check: unzip -t passes and extracted bytes match', { skip: !hasUnzip && 'unzip not available' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'zip-'));
  try {
    const data = new Uint8Array(70000).map((_, i) => (i * 7) & 255);
    const path = join(dir, 'out.zip');
    writeFileSync(path, createZip([{ name: 'a.jpg', data }, { name: 'b.jpg', data: enc('x') }]));
    const t = spawnSync('unzip', ['-t', path], { encoding: 'utf8' });
    assert.equal(t.status, 0, t.stdout + t.stderr);
    assert.match(t.stdout, /No errors detected/);
    const x = spawnSync('unzip', ['-o', '-q', path, '-d', join(dir, 'x')], { encoding: 'utf8' });
    assert.equal(x.status, 0, x.stderr);
    assert.deepEqual(new Uint8Array(readFileSync(join(dir, 'x', 'a.jpg'))), data);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
