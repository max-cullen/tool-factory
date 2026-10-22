// Fit a line of text into a box: wrap on spaces, then shrink, then truncate as a last resort.
// `measure(text, size)` returns the width of `text` at font size `size` (any consistent unit). It is injected so tests need no canvas.
export const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Greedy wrap. Words longer than the line are broken by character. Returns an array of lines. */
export function wrapLines(text, maxWidth, size, measure) {
  const words = clean(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  const push = () => { if (line) lines.push(line); line = ''; };
  for (const word of words) {
    const cand = line ? `${line} ${word}` : word;
    if (measure(cand, size) <= maxWidth) { line = cand; continue; }
    push();
    if (measure(word, size) <= maxWidth) { line = word; continue; }
    for (const ch of Array.from(word)) { // a single word wider than the box
      if (line && measure(line + ch, size) > maxWidth) push();
      line += ch;
    }
  }
  push();
  return lines;
}

function ellipsise(line, maxWidth, size, measure) {
  const chars = Array.from(line);
  while (chars.length > 1 && measure(chars.join('') + '…', size) > maxWidth) chars.pop();
  return chars.join('').trimEnd() + '…';
}

/**
 * Fit `text` into `maxWidth` using at most `maxLines` lines. Tries `size` first (one line, then wrapped),
 * shrinks in 4% steps down to `minSize`, and finally truncates the last line with an ellipsis.
 * Returns { lines, size, truncated }.
 */
export function fitText({ text, maxWidth, size, minSize = size, maxLines = 1, measure }) {
  const t = clean(text);
  if (!t) return { lines: [], size, truncated: false };
  let s = size;
  for (;;) {
    const lines = wrapLines(t, maxWidth, s, measure);
    if (lines.length <= maxLines) return { lines, size: s, truncated: false };
    if (s <= minSize + 1e-9) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = ellipsise(kept[maxLines - 1] + ' ' + lines.slice(maxLines).join(' '), maxWidth, s, measure);
      return { lines: kept, size: s, truncated: true };
    }
    s = Math.max(minSize, s * 0.96);
  }
}
