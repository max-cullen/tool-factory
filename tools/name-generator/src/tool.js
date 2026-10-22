// Username Generator browser entry point. Wires the data- hooks listed in ../DESIGN-NOTES.md.
// Everything runs on this device. Nothing is sent anywhere and nothing is stored (no cookies, no web storage).
import { generate, LENGTHS, CATEGORY_LABELS } from './generate.mjs';

const root = document.querySelector('[data-tool]');
if (root) init(root);

function init(root) {
  const $ = (sel, el = root) => el.querySelector(sel);
  const $$ = (sel, el = root) => [...el.querySelectorAll(sel)];
  const form = $('[data-options]');
  const resultsEl = $('[data-results]');
  const statusEl = $('[data-status]');
  const busyEl = $('[data-busy]');
  const emptyEl = $('[data-empty]');
  const favList = $('[data-favourites]');
  const favCount = $('[data-fav-count]');
  const favEmpty = $('[data-fav-empty]');
  const favActs = $('.ng-favs-acts');
  const resultTpl = $('template[data-result-template]');
  const favTpl = $('template[data-fav-template]');
  const MAX_FAVS = 50;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const favourites = []; // memory only, in the order they were saved
  let current = [];      // names currently shown
  let timer = 0;

  const read = () => ({
    category: form.elements.category.value,
    length: form.elements.length.value,
    case: form.elements.case.value,
    separator: form.elements.separator.value,
    word: form.elements.word.value,
    numbers: form.elements.numbers.checked,
  });
  const say = (msg) => { statusEl.textContent = msg; };
  const isFav = (name) => favourites.includes(name);

  /* ---- segmented controls: slide the pill ---- */
  function syncSeg(seg) {
    const inputs = $$('input', seg);
    seg.style.setProperty('--i', Math.max(0, inputs.findIndex((i) => i.checked)));
  }
  $$('[data-seg]').forEach(syncSeg);

  function syncLengthHint() {
    const { min, max } = LENGTHS[form.elements.length.value] || LENGTHS.medium;
    $('[data-length-hint]').textContent = `${min} to ${max} characters`;
  }

  /* ---- rendering ---- */
  function renderResults(names) {
    $$('[data-sample]').forEach((el) => el.remove());
    resultsEl.textContent = '';
    names.forEach((name, k) => {
      const li = resultTpl.content.firstElementChild.cloneNode(true);
      li.dataset.value = name;
      li.classList.add('is-new');
      li.style.setProperty('--k', k);
      $('[data-name]', li).textContent = name;
      $('[data-len]', li).textContent = name.length;
      $('[data-copy]', li).setAttribute('aria-label', `Copy ${name}`);
      setStar($('[data-favourite]', li), name);
      resultsEl.append(li);
    });
    emptyEl.hidden = names.length > 0;
    resultsEl.hidden = names.length === 0;
  }

  function setStar(btn, name) {
    const on = isFav(name);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? `Remove ${name} from favourites` : `Save ${name} to favourites`);
  }

  function renderFavourites() {
    favList.textContent = '';
    for (const name of favourites) {
      const li = favTpl.content.firstElementChild.cloneNode(true);
      li.dataset.value = name;
      $('[data-name]', li).textContent = name;
      $('[data-copy]', li).setAttribute('aria-label', `Copy ${name}`);
      $('[data-remove]', li).setAttribute('aria-label', `Remove ${name} from favourites`);
      favList.append(li);
    }
    favCount.textContent = favourites.length;
    favEmpty.hidden = favourites.length > 0;
    favActs.hidden = favourites.length === 0;
    $$('[data-result]').forEach((li) => setStar($('[data-favourite]', li), li.dataset.value));
  }

  /* ---- generating ---- */
  function run(announce = true) {
    const opts = read();
    syncLengthHint();
    const cleaned = opts.word.replace(/[^A-Za-z0-9]/g, '');
    if (cleaned !== opts.word) form.elements.word.value = cleaned;
    const res = generate({ ...opts, count: 12, exclude: current });
    root.classList.add('is-working');
    busyEl.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      current = res.names;
      renderResults(res.names);
      root.classList.remove('is-working');
      busyEl.hidden = true;
      const label = CATEGORY_LABELS[res.category];
      if (!res.names.length) say(res.notice);
      else if (announce) say(`${res.names.length} ${label} names.${res.notice ? ' ' + res.notice : ' Tap a star to keep one.'}`);
    }, reduceMotion ? 0 : 160);
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  $$('[data-generate]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); run(); }));
  form.addEventListener('change', (e) => {
    const seg = e.target.closest && e.target.closest('[data-seg]');
    if (seg) syncSeg(seg);
    run();
  });

  /* ---- copying ---- */
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }

  function selectNode(node) {
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const copyTimers = new WeakMap();
  function flashCopied(btn) {
    const label = $('[data-copy-label]', btn);
    btn.classList.add('is-copied');
    if (label) label.textContent = 'Copied';
    clearTimeout(copyTimers.get(btn));
    copyTimers.set(btn, setTimeout(() => {
      btn.classList.remove('is-copied');
      if (label) label.textContent = 'Copy';
    }, 1500));
  }

  async function copyOne(btn, nameEl, name) {
    if (await copyText(name)) { flashCopied(btn); say(`Copied ${name}.`); }
    else { selectNode(nameEl); say(`Could not copy automatically. ${name} is selected, press Ctrl+C or Cmd+C.`); }
  }

  /* ---- favourites ---- */
  function addFav(name) {
    if (isFav(name)) return;
    if (favourites.length >= MAX_FAVS) { say(`Favourites are full (${MAX_FAVS}). Remove one to add another.`); return false; }
    favourites.push(name);
    renderFavourites();
    say(`Saved ${name}. ${favourites.length} in favourites.`);
    return true;
  }
  function removeFav(name) {
    const i = favourites.indexOf(name);
    if (i < 0) return;
    favourites.splice(i, 1);
    renderFavourites();
    say(`Removed ${name}. ${favourites.length} in favourites.`);
  }

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t || !root.contains(t)) return;
    const row = t.closest('[data-result], [data-fav]');
    const name = row && row.dataset.value;
    if (t.matches('[data-favourite]') && name) {
      if (isFav(name)) removeFav(name); else addFav(name);
    } else if (t.matches('[data-copy]') && name) {
      await copyOne(t, $('[data-name]', row), name);
    } else if (t.matches('[data-remove]') && name) {
      removeFav(name);
      // The list is rebuilt, so put focus somewhere sensible.
      (favList.querySelector('[data-remove]') || $('[data-generate]')).focus();
    } else if (t.matches('[data-copy-all]')) {
      if (!favourites.length) return;
      if (await copyText(favourites.join('\n'))) { flashCopied(t); say(`Copied ${favourites.length} favourite${favourites.length === 1 ? '' : 's'}, one per line.`); }
      else { selectNode(favList); say('Could not copy automatically. The favourites are selected, press Ctrl+C or Cmd+C.'); }
    } else if (t.matches('[data-clear-favourites]')) {
      const n = favourites.length;
      favourites.length = 0;
      renderFavourites();
      say(`Cleared ${n} favourite${n === 1 ? '' : 's'}.`);
      $('[data-generate]').focus();
    }
  });

  /* ---- first run: replace the layout samples with real names ---- */
  $$('[data-fav][data-sample]').forEach((el) => el.remove());
  syncLengthHint();
  renderFavourites();
  const first = generate({ ...read(), count: 12 });
  current = first.names;
  renderResults(first.names);
  say(`${first.names.length} ${CATEGORY_LABELS[first.category]} names. Tap a star to keep one.`);
  root.dataset.ready = 'true';
}
