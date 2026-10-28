import test from 'node:test';
import assert from 'node:assert/strict';
import { u8, u16, u24, u32, u64, i32, fixed1616, fourcc, concat, box, fullBox, boxHeader, u32Array, u64Array, descLength, descriptor, esdsBox, aacAudioSpecificConfig, readU32 } from '../src/boxes.mjs';
import { parseBoxes, be32, tag } from './helpers.mjs';

test('integers are written big-endian', () => {
  assert.deepEqual([...u16(0x1234)], [0x12, 0x34]);
  assert.deepEqual([...u24(0x010203)], [1, 2, 3]);
  assert.deepEqual([...u32(0xdeadbeef)], [0xde, 0xad, 0xbe, 0xef]);
  assert.deepEqual([...u64(2 ** 32 + 5)], [0, 0, 0, 1, 0, 0, 0, 5]);
  assert.deepEqual([...i32(-1)], [255, 255, 255, 255]);
  assert.deepEqual([...fixed1616(1.5)], [0, 1, 0x80, 0]);
  assert.deepEqual([...u32Array([1, 256])], [0, 0, 0, 1, 0, 0, 1, 0]);
  assert.deepEqual([...u64Array([2 ** 32 + 7])], [0, 0, 0, 1, 0, 0, 0, 7]);
});

test('fourcc needs four characters', () => {
  assert.deepEqual([...fourcc('ftyp')], [0x66, 0x74, 0x79, 0x70]);
  assert.throws(() => fourcc('abc'));
});

test('a box has size, type and payload, and boxes nest', () => {
  const inner = box('free', u8(1, 2, 3));
  assert.equal(inner.length, 11);
  assert.equal(be32(inner, 0), 11);
  assert.equal(tag(inner, 4), 'free');
  const outer = box('moov', inner, inner);
  assert.equal(be32(outer, 0), 8 + 22);
  const parsed = parseBoxes(outer);
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0].children.map((c) => c.type), ['free', 'free']);
  assert.equal(parsed[0].children[1].start, 8 + 11);
});

test('a full box carries version and flags', () => {
  const b = fullBox('tkhd', 0, 3, u32(7));
  assert.equal(b.length, 8 + 4 + 4);
  assert.deepEqual([...b.slice(8, 12)], [0, 0, 0, 3]);
  assert.equal(readU32(b, 12), 7);
});

test('large boxes switch to the 64-bit size form', () => {
  const h = boxHeader('mdat', 2 ** 32);
  assert.equal(h.length, 16);
  assert.equal(be32(h, 0), 1);
  assert.equal(tag(h, 4), 'mdat');
  assert.equal(be32(h, 8), 1);
  assert.equal(be32(h, 12), 16); // body 2^32 + header 16 = 2^32 + 16
  assert.equal(boxHeader('mdat', 100).length, 8);
});

test('descriptor lengths use 7-bit groups', () => {
  assert.deepEqual([...descLength(5)], [5]);
  assert.deepEqual([...descLength(127)], [127]);
  assert.deepEqual([...descLength(128)], [0x81, 0x00]);
  assert.deepEqual([...descLength(300)], [0x82, 0x2c]);
  assert.deepEqual([...descriptor(5, u8(0x11, 0x90))], [5, 2, 0x11, 0x90]);
});

test('AudioSpecificConfig for AAC-LC', () => {
  assert.deepEqual([...aacAudioSpecificConfig(48000, 2)], [0x11, 0x90]);
  assert.deepEqual([...aacAudioSpecificConfig(44100, 2)], [0x12, 0x10]);
  assert.deepEqual([...aacAudioSpecificConfig(48000, 1)], [0x11, 0x88]);
  assert.throws(() => aacAudioSpecificConfig(12345, 2));
});

test('esds nests ES, decoder config and decoder specific info', () => {
  const asc = u8(0x11, 0x90);
  const e = esdsBox(asc, { avgBitrate: 128000, maxBitrate: 128000 });
  assert.equal(tag(e, 4), 'esds');
  const body = e.slice(12); // after size, type, version/flags
  assert.equal(body[0], 0x03);
  assert.equal(body[1], body.length - 2);
  assert.equal(body[5], 0x04); // after ES_ID (2) and flags (1)
  assert.equal(body[6], 13 + 2 + 2); // object, stream, buffer(3), max(4), avg(4) = 13, plus 0x05 tag, length, 2 asc bytes
  assert.equal(body[7], 0x40);
  assert.equal(body[8], 0x15);
  assert.deepEqual([...body.slice(body.indexOf(0x05, 20), body.indexOf(0x05, 20) + 4)], [5, 2, 0x11, 0x90]);
  assert.equal(readU32(body, 12), 128000);
  assert.deepEqual([...body.slice(-3)], [6, 1, 2]);
  assert.equal(concat([u8(1), u8(2)]).length, 2);
});
