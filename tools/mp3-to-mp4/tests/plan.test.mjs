import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/plan.mjs';

test('limits: refuses over 60 minutes, warns over 15, explains why', () => {
  assert.equal(P.checkAudio({ durationSec: 30, fileBytes: 1e6 }).ok, true);
  assert.equal(P.checkAudio({ durationSec: 30, fileBytes: 1e6 }).warning, undefined);
  const warn = P.checkAudio({ durationSec: 20 * 60, fileBytes: 1e6 });
  assert.equal(warn.ok, true);
  assert.match(warn.warning, /memory/);
  const no = P.checkAudio({ durationSec: 61 * 60, fileBytes: 1e6 });
  assert.equal(no.ok, false);
  assert.match(no.error, /1:00:00/);
  assert.match(no.error, /memory/);
  assert.equal(P.checkAudio({ durationSec: 60 * 60, fileBytes: 1e6 }).ok, true);
  const big = P.checkAudio({ durationSec: 10, fileBytes: 600 * 1024 * 1024 });
  assert.equal(big.ok, false);
  assert.match(big.error, /500 MB/);
  assert.equal(P.checkAudio({ durationSec: NaN, fileBytes: 1000 }).ok, true); // unknown length: judged after decoding
});

test('decoded memory estimate', () => {
  assert.equal(P.decodedBytes(60, 2), 60 * 48000 * 2 * 4);
  assert.equal(P.decodedBytes(60, 6), P.decodedBytes(60, 2));
  assert.ok(P.decodedBytes(3600, 2) > 1.3e9);
});

test('format helpers', () => {
  assert.equal(P.formatDuration(65), '1:05');
  assert.equal(P.formatDuration(3725), '1:02:05');
  assert.equal(P.formatDuration(NaN), '–');
  assert.equal(P.formatBytes(512), '512 B');
  assert.equal(P.formatBytes(1536), '1.5 KB');
  assert.equal(P.formatBytes(5 * 1048576), '5.0 MB');
  assert.equal(P.formatBytes(150 * 1048576), '150 MB');
  assert.equal(P.formatBytes(3 * 1024 ** 3), '3.0 GB');
});

test('size estimate grows with length and stays in a sensible range', () => {
  const a = P.estimateSize({ format: 'mp4', durationSec: 180, width: 1280, height: 720 });
  const b = P.estimateSize({ format: 'mp4', durationSec: 360, width: 1280, height: 720 });
  assert.ok(a.low < a.mid && a.mid < a.high);
  assert.ok(b.mid > a.mid * 1.4);
  // 3 minutes of 192 kbps AAC = 4.32 MB of audio
  assert.ok(a.low > 4.0e6 && a.high < 12e6, JSON.stringify(a));
  const webm = P.estimateSize({ format: 'webm', durationSec: 180, width: 1280, height: 720 });
  assert.ok(webm.mid < a.mid); // 160 kbps Opus < 192 kbps AAC
  const big = P.estimateSize({ format: 'mp4', durationSec: 180, width: 1920, height: 1080 });
  assert.ok(big.high > a.high);
});

test('bitrates and key frame spacing', () => {
  assert.equal(P.audioBitrate('mp4', 2), 192000);
  assert.equal(P.audioBitrate('mp4', 1), 128000);
  assert.equal(P.audioBitrate('webm', 2), 160000);
  assert.ok(P.videoBitrate(1920, 1080) <= 6e6 && P.videoBitrate(640, 360) >= 1.5e6);
  assert.equal(P.keyFrameSeconds(20), 5);
  assert.equal(P.keyFrameSeconds(600), 20);
  assert.equal(P.keyFrameSeconds(3600), 30);
  assert.equal(P.frameCount(10), 20);
  assert.equal(P.frameCount(0.1), 1);
});

test('format choice: MP4 when possible, else WebM, else none', () => {
  assert.equal(P.chooseFormat({ mp4: true, webm: true }), 'mp4');
  assert.equal(P.chooseFormat({ mp4: false, webm: true }), 'webm');
  assert.equal(P.chooseFormat({ mp4: true, webm: false }), 'mp4');
  assert.equal(P.chooseFormat({}), null);
});

test('image placement: fit shows everything, fill covers and crops', () => {
  const fit = P.fitRect(1000, 500, 1280, 720, 'fit');
  assert.equal(fit.dw, 1280); assert.equal(fit.dh, 640); assert.equal(fit.dx, 0); assert.equal(fit.dy, 40);
  const fill = P.fitRect(1000, 500, 1280, 720, 'fill');
  assert.equal(fill.dh, 720); assert.equal(fill.dw, 1440); assert.equal(fill.dx, -80); assert.equal(fill.dy, 0);
  const tall = P.fitRect(500, 1000, 1080, 1080, 'fit');
  assert.equal(tall.dh, 1080); assert.equal(tall.dw, 540); assert.equal(tall.dx, 270);
});

test('sizes are all even, so every video codec accepts them', () => {
  for (const s of P.SIZES) { assert.equal(s.w % 2, 0); assert.equal(s.h % 2, 0); assert.equal(s.id, `${s.w}x${s.h}`); }
  assert.equal(P.sizeById('nope').id, '1280x720');
});

test('colours: hex parsing and readable text', () => {
  assert.deepEqual(P.parseHex('#ff8000'), [255, 128, 0]);
  assert.deepEqual(P.parseHex('fff'), [255, 255, 255]);
  assert.equal(P.parseHex('#12'), null);
  assert.equal(P.readableOn('#000000'), '#ffffff');
  assert.equal(P.readableOn('#ffffff'), '#14162b');
  assert.equal(P.readableOn('#zzz'), '#ffffff');
});

test('output file names', () => {
  assert.equal(P.outputName('My Song.mp3', 'mp4'), 'My Song.mp4');
  assert.equal(P.outputName('a/b:c*d.wav', 'webm'), 'a b c d.webm');
  assert.equal(P.outputName('', 'mp4'), 'audio.mp4');
  assert.equal(P.outputName('.mp3', 'mp4'), 'audio.mp4');
  assert.equal(P.outputName('x'.repeat(200) + '.mp3', 'mp4').length, 84);
  assert.equal(P.cardTitle('my_great_track.mp3'), 'my great track');
});

test('text wrapping for the colour card', () => {
  assert.deepEqual(P.wrapText('one two three four', 9), ['one two', 'three', 'four']);
  assert.deepEqual(P.wrapText('abcdefghij', 4), ['abcd', 'efgh', 'ij']);
  const lines = P.wrapText('a b c d e f g h i j k l m n o p q r s t', 3, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith('…'));
});
