// Formatting helpers. Pure functions.
const pad = (n, w = 2) => String(n).padStart(w, '0');

// Split a millisecond count into parts. mode 'ceil' rounds partial seconds up (right for a countdown, so
// it reads 00:00:01 until it is really over); 'floor' rounds down (right for a stopwatch).
export function splitMs(ms, mode = 'floor') {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const total = mode === 'ceil' ? Math.ceil(safe / 1000) : Math.floor(safe / 1000);
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60, cs: Math.floor((safe % 1000) / 10) };
}

// hh:mm:ss, always three parts.
export function formatHMS(ms, mode = 'floor') {
  const { h, m, s } = splitMs(ms, mode);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// mm:ss under an hour, h:mm:ss from an hour up.
export function formatShort(ms, mode = 'floor') {
  const { h, m, s } = splitMs(ms, mode);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Stopwatch reading with hundredths: mm:ss.cc, or h:mm:ss.cc from an hour up.
export function formatStopwatch(ms) {
  const { h, m, s, cs } = splitMs(ms, 'floor');
  return `${h > 0 ? `${h}:${pad(m)}` : pad(m)}:${pad(s)}.${pad(cs)}`;
}

// Hours, minutes and seconds from the three inputs. Blank or invalid fields count as zero.
export function toMs(h, m, s) {
  const n = (v, max) => { const x = Math.floor(Number(v)); return Number.isFinite(x) ? Math.min(max, Math.max(0, x)) : 0; };
  return (n(h, 99) * 3600 + n(m, 59) * 60 + n(s, 59)) * 1000;
}

// Document title while something is running, e.g. "24:59 · Focus".
export function tabTitle(time, label) {
  return label ? `${time} · ${label}` : time;
}

// Plain words for screen readers and summaries: "1 hour 5 minutes", "45 seconds".
export function spoken(ms) {
  const { h, m, s } = splitMs(ms, 'floor');
  const bits = [];
  if (h) bits.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
  if (m) bits.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  if (s || !bits.length) bits.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
  return bits.join(' ');
}
