// Word Counter: counts words, characters, sentences, paragraphs and keywords in text pasted into the page, in the browser.
// Pilot layout for the text-tool pattern: see ../qr-code/DESIGN-NOTES.md. Hooks used by src/tool.js are the data- attributes below.
import { ICON, esc, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'word-counter',
  inputNoun: 'text',
  name: 'Word Counter',
  url: `${config.domain}/word-counter`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  mark: '<path d="M4 7h16M4 12h10M4 17h13"/>',
  tagline: 'Words, characters, sentences and reading time for any text, counted in your browser.',
  privacySummary: 'The text you type or paste into the Word Counter is counted inside your web browser. It is not sent to us or anyone else, and it is gone when you close or reload the page. The site shows ads and may count visits without cookies, as explained below.',
  // Ads and analytics stay OFF until the owner fills these in. No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Counted on your device. Nothing is stored.',
  footnote2: '',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'home', label: 'What is counted', hash: '#counted' }, { id: 'home', label: 'Questions', hash: '#faq' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

const TRUST = ['Free, no sign-up', 'Runs in your browser', 'Nothing is uploaded or saved'];

/* ---------- icons ---------- */
const svg = (d, size = 18, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  copy: svg('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>', 16, ' class="i-copy"'),
  done: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 16, ' class="i-done"'),
  clear: svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>', 16),
};

/* ---------- tool markup ---------- */
const stat = (key, label, hint = '') => `<div class="wc-stat" data-stat-box="${key}"><dt>${label}</dt><dd class="num" data-stat="${key}">0</dd>${hint ? `<span class="wc-stat-hint">${hint}</span>` : ''}</div>`;

const toolHtml = () => `<section id="tool" class="tool wc-tool" data-tool aria-label="${esc(site.name)}">
  <div class="stage wc-stage">
    <div class="wc-head">
      <label class="lbl" for="wc-text">Your text</label>
      <span class="wc-busy" data-busy hidden><span class="spin"></span>Calculating&hellip;</span>
    </div>
    <textarea id="wc-text" class="wc-text" data-input spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Type or paste your text here. It is counted on this device and never uploaded."></textarea>
    <div class="wc-bar">
      <p class="wc-status num" data-status role="status" aria-live="polite">0 words, 0 characters</p>
      <div class="wc-acts">
        <button type="button" class="btn btn-ghost wc-act" data-copy-stats>${I.copy}${I.done}<span data-copy-label>Copy stats</span></button>
        <button type="button" class="btn btn-ghost wc-act" data-clear>${I.clear}<span>Clear</span></button>
      </div>
    </div>
    <p class="hint wc-note" data-approx hidden>This browser cannot split text into words and characters the usual way, so counts for emoji, accents and some scripts are approximate.</p>
    <p class="hint wc-note" data-script-note hidden>This text includes a script that is written without spaces between words (such as Chinese, Japanese or Thai). Words are found with the browser&rsquo;s dictionary-based splitter, so the word count and the times are estimates.</p>
  </div>

  <div class="panel wc-panel">
    <dl class="wc-stats m-0" data-stats aria-label="Statistics">
      ${stat('words', 'Words')}
      ${stat('characters', 'Characters', 'with spaces')}
      ${stat('charactersNoSpaces', 'Characters', 'no spaces')}
      ${stat('sentences', 'Sentences')}
      ${stat('paragraphs', 'Paragraphs')}
      ${stat('lines', 'Lines')}
      ${stat('unique', 'Unique words')}
      ${stat('avg', 'Average word', 'letters per word')}
    </dl>
    <p class="hint wc-chars-note">Characters are what you see on screen: an emoji or a letter with an accent counts as one, even when it is stored as several code units.</p>

    <div class="wc-times">
      <div class="wc-time">
        <span class="lbl" id="wc-read-lbl">Reading time</span>
        <strong class="wc-time-out num" data-read-out>0 sec</strong>
        <label class="wc-wpm"><span>at</span><span class="field"><input id="wc-read-wpm" data-read-wpm inputmode="numeric" autocomplete="off" value="238" aria-label="Reading speed in words per minute" aria-describedby="wc-read-lbl"></span><span>wpm</span></label>
      </div>
      <div class="wc-time">
        <span class="lbl" id="wc-speak-lbl">Speaking time</span>
        <strong class="wc-time-out num" data-speak-out>0 sec</strong>
        <label class="wc-wpm"><span>at</span><span class="field"><input id="wc-speak-wpm" data-speak-wpm inputmode="numeric" autocomplete="off" value="150" aria-label="Speaking speed in words per minute" aria-describedby="wc-speak-lbl"></span><span>wpm</span></label>
      </div>
    </div>
    <p class="wc-err" data-wpm-error role="alert" hidden>Enter a speed from 20 to 1000 words per minute. The default is used until then.</p>

    <div class="block wc-para">
      <span class="lbl" id="wc-para-lbl">A new paragraph starts at</span>
      <div class="seg seg-sm" data-seg data-paragraph-mode style="--n:2;--i:0" role="radiogroup" aria-labelledby="wc-para-lbl">
        <label><input type="radio" name="paragraphs" value="blank" checked><span>A blank line</span></label>
        <label><input type="radio" name="paragraphs" value="line"><span>Every line break</span></label>
      </div>
    </div>

    <div class="block wc-limit" data-limit-box>
      <div class="lbl-row"><label class="lbl" for="wc-limit">Character limit <span class="wc-opt">(optional)</span></label><span class="wc-limit-out num" data-limit-out>No limit set</span></div>
      <div class="chips" data-limit-presets role="group" aria-label="Common limits">
        <button type="button" class="chip" data-limit-preset="160" aria-pressed="false">160 SMS</button>
        <button type="button" class="chip" data-limit-preset="280" aria-pressed="false">280</button>
        <button type="button" class="chip" data-limit-preset="500" aria-pressed="false">500</button>
      </div>
      <div class="field"><input id="wc-limit" data-limit inputmode="numeric" autocomplete="off" placeholder="Type your own, e.g. 2200"></div>
      <div class="wc-meter" data-limit-meter aria-hidden="true"><i></i></div>
      <p class="wc-err" data-limit-error role="alert" hidden>Use a whole number from 1 upwards.</p>
      <p class="hint">Counts characters with spaces. Each service counts in its own way, so check its rules.</p>
    </div>

    <div class="block wc-kw">
      <div class="lbl-row"><h2 class="wc-kw-title">Top keywords</h2><span class="hint num" data-kw-meta></span></div>
      <div class="wc-kw-opts">
        <label class="check"><input type="checkbox" data-stop checked><span>Ignore common words</span></label>
        <label class="check"><input type="checkbox" data-case><span>Match capitals</span></label>
        <label class="wc-minlen"><span>Shortest word</span><span class="field"><input data-minlen inputmode="numeric" autocomplete="off" value="1" aria-label="Shortest word length to count as a keyword"></span><span>letters</span></label>
      </div>
      <table class="wc-table" data-kw-table>
        <caption class="sr-only">The ten most frequent words</caption>
        <thead><tr><th scope="col">Word</th><th scope="col" class="num">Count</th><th scope="col" class="num">Density</th></tr></thead>
        <tbody data-kw-body></tbody>
      </table>
      <p class="hint wc-kw-empty" data-kw-empty>Type or paste some text to see the words used most.</p>
      <p class="hint">Density is the word&rsquo;s count as a share of all words in the text. It is a rough guide to repetition, nothing more.</p>
    </div>
  </div>
</section>`;

/* ---------- copy ---------- */
const HOW = [
  ['Type or paste', 'Put your text in the box. Counts update as you type, and a long paste is handled in the background so the page keeps responding. Nothing is uploaded.'],
  ['Read the numbers', 'Words, characters with and without spaces, sentences, paragraphs, lines and unique words sit beside the box, with reading and speaking time worked out from the speeds you set.'],
  ['Check the details', 'See which words you use most, set a character limit for a post or message, then copy a plain-text summary of the figures or clear the box and start again.'],
];

const COUNTED = [
  ['Words', 'A word is a run of letters or digits. Apostrophes and hyphens inside it stay in, so don’t and well-known are one word each. Dashes with spaces around them, and emoji, are not words.'],
  ['Characters', 'Counted as you see them, so an emoji or a letter with an accent is one character. The with-spaces figure includes spaces, tabs and line breaks; the no-spaces figure leaves all of them out.'],
  ['Sentences', 'A sentence ends at a full stop, question mark, exclamation mark or ellipsis followed by a space, or at a blank line. Common abbreviations and initials such as Dr. and J. are skipped, but it is a rule of thumb, not grammar.'],
  ['Paragraphs and lines', 'Lines are counted the way a text editor counts them. Paragraphs are blocks of text separated by a blank line, or, if you choose, every line break, which suits text copied from some word processors.'],
  ['Reading and speaking time', 'Word count divided by a speed in words per minute. The defaults are 238 for silent reading and 150 for speaking aloud. Change either to suit you or your audience.'],
  ['Keywords', 'The ten most used words, with how many times each appears and its share of all the words. You can leave out common words such as the and of, set a shortest length, and match capitals or not.'],
];

const FAQ = [
  ['How does the word counter decide what a word is?', 'It uses the browser’s built-in text splitting, which follows the Unicode rules for word boundaries, and then joins words connected by a hyphen. So “well-known” is one word, “don’t” is one word, and “3.14” is one word. Punctuation, emoji and dashes with spaces around them are not words. If your browser cannot do this, the page falls back to a simpler rule that finds runs of letters and digits.'],
  ['Why might another tool give a different word count?', 'There is no single agreed definition. Some tools split only on spaces, so “well-known” and a lone dash both count; others split on every hyphen or slash; word processors have their own rules for dashes and numbers. Differences are usually small for ordinary prose, but if a limit matters, such as an essay or a contract, use the tool the person setting the limit uses, and leave a margin.'],
  ['How are characters counted, and what about emoji?', 'The page counts characters the way you see them: a letter with an accent, an emoji, a flag or a family emoji is one character, even though a computer may store it as several. Some services count differently, for example by the underlying code units or by giving links a fixed length, so a post can show a different number there. Treat the figure here as a guide and check the service’s own counter when the limit is strict.'],
  ['What do the reading and speaking times assume?', 'They divide the word count by a speed. The reading default is 238 words per minute, a commonly quoted average for adults reading ordinary English non-fiction silently. The speaking default is 150 words per minute, a steady, unhurried pace. Real speeds vary widely with the reader, the topic and the audience, so change the numbers to match you. For Chinese, Japanese and similar scripts the times are rough, because words are estimated.'],
  ['How are sentences detected, and where can it be wrong?', 'The page looks for a full stop, question mark, exclamation mark or ellipsis followed by a space or the end of the text, and for blank lines. It skips common abbreviations such as Mr., Dr., e.g. and i.e., and single-letter initials. It can still be wrong: an abbreviation it does not know, such as Sept., may be counted as a sentence end, a sentence that ends with an abbreviation may be merged with the next, and text without punctuation, such as a list or a poem, counts as one sentence until a blank line.'],
  ['How are Chinese, Japanese and Thai counted?', 'These scripts are written without spaces between words, so the page asks the browser’s dictionary-based splitter to find them. The result is a good estimate, not an exact figure, and it can differ between browsers. The character count is exact for what is on screen, and many people prefer to use that figure for these languages.'],
  ['What counts as a paragraph or a line?', 'A line is whatever sits between two line breaks, so a text that ends with a line break has an empty last line, as it would in a text editor. By default a paragraph is a block of text separated from the next by a blank line. If your text separates paragraphs with a single line break, as text copied from some word processors does, switch the setting to “Every line break”.'],
  ['Is keyword density a good measure?', 'It is a rough guide to repetition and nothing more. The table shows how often each word appears and its share of all the words, which can help you notice a word you lean on too much. There is no ideal percentage, and a high or low figure says nothing about how any text will be received by readers or by any search engine.'],
  ['Is my text uploaded or stored?', 'No. The counting runs on your device, in this page. The text is not sent to us or to anyone else, and the page does not save it in cookies or browser storage, so it is gone when you close or reload the tab. The page makes no network request when you type or paste. Copy stats puts a short summary on your clipboard, and only when you press it.'],
  ['Can it handle very large text?', 'Yes. Short text is counted as you type. A long paste, up to a few million characters, is counted in a background thread after a short pause, with a “Calculating” message, so typing and scrolling stay smooth. Very large pastes can still make the text box itself slow in some browsers, and the figures appear when the count is done.'],
];

const TIPS = [
  'Check whether your limit counts spaces, and whether links, emoji or line breaks count differently.',
  'If you are paid or marked by word count, ask which tool or rule is used and count with that one.',
  'Leave a small margin under a strict limit, because other tools can differ by a few words.',
  'For a talk, read a short section aloud with a timer and set the speaking speed to match.',
  'Use the keyword list to spot a word you repeat, not to chase a target percentage.',
];

function home(ctx) {
  const body = `<main id="main">
${hero({ h1: 'Word counter', lead: 'Count the words, characters, sentences and paragraphs in any text, see how long it takes to read or say, and find the words you use most. It runs in your browser, so your text stays on your device.', trustItems: TRUST, h1Class: 'max-w-[14ch] text-[44px] sm:text-6xl md:text-[80px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  <ol class="wc-steps m-0 grid list-none gap-4 p-0 md:grid-cols-3">${HOW.map(([t, d], n) => `<li class="card p-7"><span class="wc-step num" aria-hidden="true">${n + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>
</section>

<section id="counted" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('What each number means', 'Counting rules differ between tools, so here is exactly what this one does.')}
  <div class="wc-kinds">${COUNTED.map(([t, d]) => `<article class="card wc-kind"><h3 class="text-xl">${t}</h3><p>${d}</p></article>`).join('')}</div>
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">Counting words with care</h2>
    <p class="mt-5 text-lg text-ink-2">Most people reach for a word counter when a limit is involved: an essay, a cover letter, a social media post, an abstract, a caption or an SMS. The number only helps if you know how it was reached, which is why this page explains its rules in plain words and keeps them the same every time.</p>
    <p class="mt-5 text-lg text-ink-2">It also works with text that is not plain English. Accented letters, emoji and other scripts are counted as the symbols you see, and languages written without spaces are handled with the browser’s own word splitter. The reading and speaking times are simple sums, so treat them as a starting point and adjust the speeds to suit your own pace and your audience.</p>
    <p class="mt-5 text-lg text-ink-2">The keyword table is there to help you edit. If one word fills a tenth of your text, you may want to vary it. The percentages are only a rough guide to repetition, not a score.</p></div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">Before you rely on a count</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${TIPS.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section id="faq" class="wrap wrap-narrow mt-32 scroll-mt-20">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(FAQ)}
</section>
</main>`;
  return {
    title: 'Word Counter: Words, Characters, Sentences and Reading Time',
    desc: 'Free online word counter. Count words, characters, sentences and paragraphs, see reading and speaking time, check a character limit and find your top keywords. Runs in your browser.',
    body, faq: FAQ, tool: { category: 'UtilitiesApplication' }, scripts: ['assets/tool.js'],
  };
}

/* ---------- text pages (framework templates) ---------- */
const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${esc(site.name)} counts the words, characters, sentences, paragraphs and lines in text, estimates reading and speaking time, and lists the words used most. It was made for people who have a limit to meet or a draft to tidy and want a clear number they can trust.</p>
<p>Everything happens in your browser. The counting code is part of the page; long text is counted in a background thread of the same page. No text is sent to a server, and the tool uses no third-party code or libraries.</p>
<p>The rules are spelled out on the page, because tools disagree: a word is a run of letters or digits with apostrophes and hyphens kept inside it, characters are counted as they appear on screen, and sentences are found by punctuation, so the count can be wrong around abbreviations. Words in scripts written without spaces are estimated with the browser&rsquo;s own splitter.</p>
<p>It is free to use and is paid for by advertising. It is run by ${esc(site.operator)}, in Brisbane, Australia. Questions or ideas can go to ${esc(site.contact)}.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'What you type and paste', dataHtml: '<p>The text you type or paste is counted in your browser by code that is already on the page. It is never sent to us or to anyone else, and it is not written to cookies, local storage or any other storage. It is gone when you close or reload the page. Long text is counted in a background worker that belongs to the same page and also does not send anything anywhere.</p><p>The Copy stats button copies a short summary of the figures, and a few of your most used words, to your clipboard only when you press it. Please do not paste text you are not allowed to handle into any web page; the tool does not need an account and does not ask for personal information.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool that counts words, characters, sentences and paragraphs in text, in your browser.`, ownershipHtml: '<p>Your text stays yours. We do not claim any rights in it, and we do not receive or keep it.</p>', processingHtml: '<p>Text is counted on your device and is not sent to us. It is held in the page’s memory while the page is open and disappears when you close or reload it.</p>', responsibilityHtml: '<p>Counts depend on the rules described on the page and can differ from those of other tools, word processors and online services. Sentence detection and word counts for scripts written without spaces are estimates. Before you submit work or publish text against a limit, check the figure with the counter the recipient or service uses, and leave a margin. Reading and speaking times are estimates based on the speeds you set.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea? Email us.' }) },
];

export default {
  site,
  pages,
  copy: [
    ['src/tool.js', 'assets/tool.js'],
    ['src/worker.js', 'assets/worker.js'],
    ['src/worker-core.mjs', 'assets/worker-core.mjs'],
    ['src/count.mjs', 'assets/count.mjs'],
    ['src/keywords.mjs', 'assets/keywords.mjs'],
    ['src/format.mjs', 'assets/format.mjs'],
  ],
};
