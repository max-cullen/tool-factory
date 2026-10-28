// Word Counter: the work done off the page's main thread for large text. Pure (no DOM, no postMessage), so node can test it.
import { analyse, makeSegmenters } from './count.mjs';
import { createCounter, DEFAULT_RANK } from './keywords.mjs';

const EMPTY_RANK = { rows: [], totalWords: 0, distinct: 0 };

/** A session keeps the last word counts so a change of keyword options re-ranks without recounting the text. */
export function createSession(segmenters = makeSegmenters()) {
  let counter = null;
  return {
    analyse(text, rankOptions = DEFAULT_RANK) {
      counter = createCounter();
      const stats = analyse(text, { ...segmenters, onWord: counter.add });
      stats.unique = counter.unique();
      return { stats, keywords: counter.rank(rankOptions) };
    },
    rank(rankOptions = DEFAULT_RANK) {
      return counter ? counter.rank(rankOptions) : EMPTY_RANK;
    },
  };
}

/** Message protocol used by worker.js: { type: 'analyse'|'rank', id, text?, rank } -> { type: 'result'|'ranked'|'error', id, ... } */
export function handleMessage(session, msg) {
  try {
    if (msg.type === 'analyse') return { type: 'result', id: msg.id, ...session.analyse(String(msg.text ?? ''), msg.rank) };
    if (msg.type === 'rank') return { type: 'ranked', id: msg.id, keywords: session.rank(msg.rank) };
    return { type: 'error', id: msg.id, message: 'Unknown message' };
  } catch (err) {
    return { type: 'error', id: msg.id, message: String((err && err.message) || err) };
  }
}
