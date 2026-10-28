// A small ZIP writer: "store" method only (no compression), CRC-32, UTF-8 names. No dependencies.
// Limits of the classic format: up to 65,535 entries, and no entry or archive of 4 GiB or more (no Zip64).

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE 802.3, as used by ZIP and PNG) of a Uint8Array. Pass a previous result as `crc` to continue. */
export function crc32(bytes, crc = 0) {
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Make names unique inside one archive (case-insensitive), keeping the extension: a.jpg, a (2).jpg, a (3).jpg. */
export function dedupeNames(names) {
  const used = new Set();
  return names.map((raw) => {
    const clean = String(raw).replace(/\\/g, '/').split('/').filter((p) => p && p !== '.' && p !== '..').join('/') || 'file';
    const dot = clean.lastIndexOf('.');
    const slash = clean.lastIndexOf('/');
    const hasExt = dot > slash + 1;
    const stem = hasExt ? clean.slice(0, dot) : clean;
    const ext = hasExt ? clean.slice(dot) : '';
    let name = clean;
    let n = 2;
    while (used.has(name.toLowerCase())) name = `${stem} (${n++})${ext}`;
    used.add(name.toLowerCase());
    return name;
  });
}

/** Date -> [dosTime, dosDate]. ZIP cannot store years before 1980 or after 2107. */
export function dosDateTime(d = new Date()) {
  const y = Math.min(2107, Math.max(1980, d.getFullYear()));
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [time & 0xffff, date & 0xffff];
}

const enc = new TextEncoder();

/**
 * @param {{name: string, data: Uint8Array}[]} files
 * @param {{date?: Date}} [opts]
 * @returns {Uint8Array} the whole archive
 */
export function createZip(files, { date = new Date() } = {}) {
  if (files.length > 0xffff) throw new RangeError('Too many files for one ZIP (limit 65,535).');
  const names = dedupeNames(files.map((f) => f.name));
  const [dtime, ddate] = dosDateTime(date);
  const entries = files.map((f, i) => {
    const nameBytes = enc.encode(names[i]);
    if (nameBytes.length > 0xffff) throw new RangeError('A file name is too long.');
    if (f.data.length >= 0xffffffff) throw new RangeError('A file is too large for a ZIP without Zip64 (limit 4 GiB).');
    return { nameBytes, data: f.data, crc: crc32(f.data), size: f.data.length };
  });

  let total = 22;
  for (const e of entries) total += 30 + e.nameBytes.length + e.size + 46 + e.nameBytes.length;
  if (total >= 0xffffffff) throw new RangeError('The ZIP would be larger than 4 GiB.');

  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  let p = 0;
  const u16 = (x) => { v.setUint16(p, x, true); p += 2; };
  const u32 = (x) => { v.setUint32(p, x >>> 0, true); p += 4; };
  const FLAGS = 0x0800; // bit 11: names are UTF-8

  for (const e of entries) {
    e.offset = p;
    u32(0x04034b50); u16(20); u16(FLAGS); u16(0); u16(dtime); u16(ddate);
    u32(e.crc); u32(e.size); u32(e.size); u16(e.nameBytes.length); u16(0);
    out.set(e.nameBytes, p); p += e.nameBytes.length;
    out.set(e.data, p); p += e.size;
  }
  const cdStart = p;
  for (const e of entries) {
    u32(0x02014b50); u16(20); u16(20); u16(FLAGS); u16(0); u16(dtime); u16(ddate);
    u32(e.crc); u32(e.size); u32(e.size); u16(e.nameBytes.length); u16(0); u16(0); u16(0); u16(0); u32(0);
    u32(e.offset);
    out.set(e.nameBytes, p); p += e.nameBytes.length;
  }
  const cdSize = p - cdStart;
  u32(0x06054b50); u16(0); u16(0); u16(entries.length); u16(entries.length); u32(cdSize); u32(cdStart); u16(0);
  return out;
}
