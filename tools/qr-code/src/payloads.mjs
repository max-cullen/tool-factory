// Builds the text that goes inside a QR code for each kind of content. Pure functions, no DOM.
// Every builder returns { empty, ok, value, errors } where errors is keyed by the form's data-field name.

const result = (value, errors = {}, empty = false) => ({ empty, ok: !empty && Object.keys(errors).length === 0, value: Object.keys(errors).length || empty ? '' : value, errors });

/* ---------- text ---------- */
export function textPayload({ text = '' } = {}) {
  if (text.length === 0) return result('', {}, true);
  return result(text);
}

/* ---------- URL ---------- */
const SCHEMES = ['http', 'https', 'mailto', 'tel', 'sms', 'geo'];
const HOSTLESS = /^(mailto|tel|sms|geo):/i;

/** Normalise what someone typed into a link. Adds https:// when no scheme is given. */
export function normaliseUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { empty: true, ok: false, value: '', error: '' };
  if (/\s/.test(raw)) return { ok: false, value: '', error: 'Web addresses cannot contain spaces.' };
  if (HOSTLESS.test(raw)) {
    return raw.length > raw.indexOf(':') + 1 ? { ok: true, value: raw } : { ok: false, value: '', error: 'Add something after the colon.' };
  }
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(raw);
  if (scheme && !SCHEMES.includes(scheme[1].toLowerCase())) return { ok: false, value: '', error: 'Only http and https links are supported here. Use the Text tab for anything else.' };
  const full = scheme ? raw : 'https://' + raw.replace(/^\/\//, '');
  let u;
  try { u = new URL(full); } catch { return { ok: false, value: '', error: 'That does not look like a web address.' }; }
  const host = u.hostname;
  const looksOk = host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[.*\]$/.test(host) || /\.[^.]{2,}$/.test(host);
  if (!looksOk) return { ok: false, value: '', error: 'Check the address. It needs a domain such as example.com.' };
  return { ok: true, value: full };
}
export function urlPayload({ url = '' } = {}) {
  const r = normaliseUrl(url);
  if (r.empty) return result('', {}, true);
  return r.ok ? result(r.value) : result('', { url: r.error });
}

/* ---------- Wi-Fi ---------- */
/** Escape \ ; , : and " with a backslash, as the Wi-Fi QR format requires. */
export const escapeWifi = (s) => String(s).replace(/([\\;,:"])/g, '\\$1');

export function wifiPayload({ ssid = '', password = '', security = 'WPA', hidden = false } = {}) {
  const sec = ['WPA', 'WEP', 'nopass'].includes(security) ? security : 'WPA';
  if (!ssid && !password) return result('', {}, true);
  const errors = {};
  if (!ssid) errors.ssid = 'Enter the network name.';
  else if (new TextEncoder().encode(ssid).length > 32) errors.ssid = 'Wi-Fi network names are 32 bytes or fewer.';
  if (sec !== 'nopass' && !password) errors.password = 'Enter the password, or choose None if the network is open.';
  let v = `WIFI:T:${sec};S:${escapeWifi(ssid)};`;
  if (sec !== 'nopass') v += `P:${escapeWifi(password)};`;
  if (hidden) v += 'H:true;';
  v += ';';
  return result(v, errors);
}

/* ---------- vCard 3.0 ---------- */
/** Escape a vCard 3.0 text value: backslash, comma, semicolon and line breaks. */
export const escapeVcard = (s) => String(s).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

/** Fold a content line to 75 octets, continuing with CRLF + one space. Never splits a UTF-8 character. */
export function foldLine(line) {
  const enc = new TextEncoder();
  const chars = [...line];
  const out = [];
  let cur = ''; let bytes = 0; let limit = 75;
  for (const ch of chars) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+0-9()\-.\s]{3,}$/;

export function vcardPayload(f = {}) {
  const v = (k) => String(f[k] ?? '').trim();
  const first = v('first'); const last = v('last'); const phone = v('phone'); const email = v('email'); const org = v('org');
  const web = v('website'); const street = v('street'); const city = v('city'); const region = v('region'); const postcode = v('postcode'); const country = v('country');
  if (![first, last, phone, email, org, web, street, city, region, postcode, country].some(Boolean)) return result('', {}, true);
  const errors = {};
  if (!first && !last) errors.first = 'Enter a first or last name.';
  if (phone && (!PHONE.test(phone) || !/\d{3}/.test(phone))) errors.phone = 'Use digits, spaces and + ( ) - only.';
  if (email && !EMAIL.test(email)) errors.email = 'That email address looks incomplete.';
  let webValue = '';
  if (web) { const u = normaliseUrl(web); if (u.ok) webValue = u.value; else errors.website = u.error; }
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${escapeVcard(last)};${escapeVcard(first)};;;`);
  lines.push(`FN:${escapeVcard([first, last].filter(Boolean).join(' '))}`);
  if (org) lines.push(`ORG:${escapeVcard(org)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeVcard(phone)}`);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVcard(email)}`);
  if (webValue) lines.push(`URL:${escapeVcard(webValue)}`);
  if (street || city || region || postcode || country) lines.push(`ADR;TYPE=WORK:;;${[street, city, region, postcode, country].map(escapeVcard).join(';')}`);
  lines.push('END:VCARD');
  return result(lines.map(foldLine).join('\r\n') + '\r\n', errors);
}

/** Build the payload for any type from the plain values of its form. */
export function buildPayload(type, values) {
  switch (type) {
    case 'url': return urlPayload(values);
    case 'wifi': return wifiPayload(values);
    case 'vcard': return vcardPayload(values);
    default: return textPayload(values);
  }
}
