import test from 'node:test';
import assert from 'node:assert/strict';
import { textPayload, normaliseUrl, urlPayload, escapeWifi, wifiPayload, escapeVcard, foldLine, vcardPayload, buildPayload } from '../src/payloads.mjs';

test('text: empty is the empty state, anything else passes through unchanged', () => {
  assert.equal(textPayload({ text: '' }).empty, true);
  assert.equal(textPayload({ text: '  hi\nthere ' }).value, '  hi\nthere ');
  assert.equal(textPayload({ text: 'a' }).ok, true);
});

test('url: adds https, keeps explicit schemes, rejects junk', () => {
  assert.equal(normaliseUrl('example.com').value, 'https://example.com');
  assert.equal(normaliseUrl('  www.example.com/a?b=1 ').value, 'https://www.example.com/a?b=1');
  assert.equal(normaliseUrl('http://example.com').value, 'http://example.com');
  assert.equal(normaliseUrl('HTTPS://Example.com').value, 'HTTPS://Example.com');
  assert.equal(normaliseUrl('example.com:8080/x').value, 'https://example.com:8080/x');
  assert.equal(normaliseUrl('localhost:3000').ok, true);
  assert.equal(normaliseUrl('mailto:a@b.com').ok, true);
  assert.equal(normaliseUrl('').empty, true);
  assert.equal(normaliseUrl('not a url').ok, false);
  assert.equal(normaliseUrl('justoneword').ok, false);
  assert.equal(normaliseUrl('javascript://x').ok, false);
  assert.equal(normaliseUrl('ftp://example.com').ok, false);
  assert.equal(normaliseUrl('mailto:').ok, false);
  const r = urlPayload({ url: 'oops' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.url);
});

test('wifi: escapes backslash, semicolon, comma, colon and double quote', () => {
  assert.equal(escapeWifi('a\\b;c,d:e"f'), 'a\\\\b\\;c\\,d\\:e\\"f');
  assert.equal(escapeWifi('plain'), 'plain');
});

test('wifi: exact format', () => {
  assert.equal(wifiPayload({ ssid: 'Home', password: 'secret123', security: 'WPA' }).value, 'WIFI:T:WPA;S:Home;P:secret123;;');
  assert.equal(wifiPayload({ ssid: 'Home', password: 'secret123', security: 'WEP', hidden: true }).value, 'WIFI:T:WEP;S:Home;P:secret123;H:true;;');
  assert.equal(wifiPayload({ ssid: 'Cafe', security: 'nopass' }).value, 'WIFI:T:nopass;S:Cafe;;');
  assert.equal(wifiPayload({ ssid: 'Cafe', password: 'ignored', security: 'nopass' }).value, 'WIFI:T:nopass;S:Cafe;;');
  assert.equal(wifiPayload({ ssid: 'a;b', password: 'c:d"e', security: 'WPA' }).value, 'WIFI:T:WPA;S:a\\;b;P:c\\:d\\"e;;');
});

test('wifi: validation and empty state', () => {
  assert.equal(wifiPayload({}).empty, true);
  assert.ok(wifiPayload({ password: 'x' }).errors.ssid);
  assert.ok(wifiPayload({ ssid: 'x', security: 'WPA' }).errors.password);
  assert.ok(wifiPayload({ ssid: 'x'.repeat(33) }).errors.ssid);
  assert.equal(wifiPayload({ ssid: 'x', security: 'nopass' }).ok, true);
});

test('vcard: escaping', () => {
  assert.equal(escapeVcard('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});

test('vcard: 3.0 structure with CRLF line endings', () => {
  const r = vcardPayload({ first: 'Alex', last: 'Taylor', phone: '+61 400 000 000', email: 'alex@example.com', org: 'Acme, Pty; Ltd', website: 'example.com', street: '1 Example St', city: 'Brisbane', region: 'QLD', postcode: '4000', country: 'Australia' });
  assert.equal(r.ok, true);
  assert.equal(r.value, [
    'BEGIN:VCARD', 'VERSION:3.0', 'N:Taylor;Alex;;;', 'FN:Alex Taylor', 'ORG:Acme\\, Pty\\; Ltd', 'TEL;TYPE=CELL:+61 400 000 000',
    'EMAIL;TYPE=INTERNET:alex@example.com', 'URL:https://example.com', 'ADR;TYPE=WORK:;;1 Example St;Brisbane;QLD;4000;Australia', 'END:VCARD', '',
  ].join('\r\n'));
});

test('vcard: minimal card, validation and empty state', () => {
  assert.equal(vcardPayload({ first: 'Sam' }).value, 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:;Sam;;;\r\nFN:Sam\r\nEND:VCARD\r\n');
  assert.equal(vcardPayload({}).empty, true);
  assert.ok(vcardPayload({ email: 'a@b.com' }).errors.first);
  assert.ok(vcardPayload({ first: 'A', email: 'nope' }).errors.email);
  assert.ok(vcardPayload({ first: 'A', phone: 'abc' }).errors.phone);
  assert.ok(vcardPayload({ first: 'A', website: 'not a url' }).errors.website);
});

test('vcard: long lines fold at 75 octets without splitting a character', () => {
  const folded = foldLine('NOTE:' + 'é'.repeat(100));
  const lines = folded.split('\r\n');
  assert.ok(lines.length > 1);
  lines.forEach((l, i) => { assert.ok(new TextEncoder().encode(l).length <= 75); if (i) assert.ok(l.startsWith(' ')); });
  assert.equal(lines.map((l, i) => (i ? l.slice(1) : l)).join(''), 'NOTE:' + 'é'.repeat(100));
  assert.equal(foldLine('short'), 'short');
});

test('buildPayload dispatches by type', () => {
  assert.equal(buildPayload('text', { text: 'x' }).value, 'x');
  assert.equal(buildPayload('url', { url: 'a.com' }).value, 'https://a.com');
  assert.ok(buildPayload('wifi', { ssid: 'n', password: 'p' }).value.startsWith('WIFI:'));
  assert.ok(buildPayload('vcard', { first: 'n' }).value.startsWith('BEGIN:VCARD'));
});
