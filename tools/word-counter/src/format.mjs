// Word Counter: number, time and summary formatting. Pure; no DOM.

export const DEFAULTS = { readingWpm: 238, speakingWpm: 150 };

export function formatNumber(n) {
  return new Intl.NumberFormat('en-AU').format(n);
}

/** Seconds needed for `words` at `wpm`. Zero for no words or an unusable speed. */
export function secondsFor(words, wpm) {
  if (!(words > 0) || !(wpm > 0)) return 0;
  return (words / wpm) * 60;
}

/** "45 sec", "1 min", "4 min 12 sec", "1 h 5 min". Rounds to the nearest second first. */
export function formatDuration(seconds) {
  const s = Math.round(seconds);
  if (!(s > 0)) return '0 sec';
  if (s < 60) return `${s} sec`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m} min ${r} sec` : `${m} min`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (m === 60) return `${h + 1} h`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Read a words-per-minute field. Returns { value, valid }; falls back to the default when blank, zero or silly. */
export function parseWpm(raw, fallback, min = 20, max = 1000) {
  const text = String(raw ?? '').trim();
  if (text === '') return { value: fallback, valid: true };
  const v = Number(text);
  if (!Number.isFinite(v) || v < min || v > max) return { value: fallback, valid: false };
  return { value: Math.round(v), valid: true };
}

/** Read the character limit. Blank means no limit; anything else must be a whole number from 1 to 10 million. */
export function parseLimit(raw) {
  const text = String(raw ?? '').trim().replace(/,/g, '');
  if (text === '') return { value: 0, valid: true };
  if (!/^\d+$/.test(text)) return { value: 0, valid: false };
  const v = Number(text);
  return v >= 1 && v <= 10_000_000 ? { value: v, valid: true } : { value: 0, valid: false };
}

/** Where `characters` sits against `limit`. state: none | ok | near (90% or more) | at | over. */
export function limitStatus(characters, limit) {
  if (!(limit > 0)) return { state: 'none', remaining: 0, ratio: 0, text: 'No limit set' };
  const remaining = limit - characters;
  const ratio = Math.min(characters / limit, 1);
  if (remaining < 0) return { state: 'over', remaining, ratio: 1, text: `${formatNumber(-remaining)} over` };
  if (remaining === 0) return { state: 'at', remaining, ratio: 1, text: 'At the limit' };
  return { state: characters / limit >= 0.9 ? 'near' : 'ok', remaining, ratio, text: `${formatNumber(remaining)} left` };
}

export function formatPercent(p) {
  if (!(p > 0)) return '0%';
  if (p < 0.1) return '<0.1%';
  return `${p.toFixed(1)}%`;
}

export function formatAverage(a) {
  return a ? a.toFixed(1) : '0';
}

/** Plain-text summary for the Copy stats button. */
export function statsToText(stats, ctx) {
  const { readingWpm, speakingWpm, limit = 0, keywords = [], paragraphMode = 'blank' } = ctx;
  const lines = [
    `Words: ${formatNumber(stats.words)}`,
    `Characters (with spaces): ${formatNumber(stats.characters)}`,
    `Characters (no spaces): ${formatNumber(stats.charactersNoSpaces)}`,
    `Sentences: ${formatNumber(stats.sentences)}`,
    `Paragraphs: ${formatNumber(paragraphMode === 'line' ? stats.paragraphLines : stats.paragraphs)}`,
    `Lines: ${formatNumber(stats.lines)}`,
    `Unique words: ${formatNumber(stats.unique ?? 0)}`,
    `Average word length: ${formatAverage(stats.avgWordLength)}`,
    `Reading time (${readingWpm} wpm): ${formatDuration(secondsFor(stats.words, readingWpm))}`,
    `Speaking time (${speakingWpm} wpm): ${formatDuration(secondsFor(stats.words, speakingWpm))}`,
  ];
  if (limit > 0) {
    const l = limitStatus(stats.characters, limit);
    lines.push(`Character limit ${formatNumber(limit)}: ${l.text.toLowerCase()}`);
  }
  if (keywords.length) {
    lines.push('', 'Top keywords:', ...keywords.map((k) => `${k.word}: ${k.count} (${formatPercent(k.percent)})`));
  }
  return lines.join('\n');
}
