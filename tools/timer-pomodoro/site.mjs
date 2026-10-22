// Timer and Pomodoro: a countdown timer, stopwatch and Pomodoro focus timer that run in the browser.
// Layout follows the pilot pattern (see ../qr-code/DESIGN-NOTES.md and DESIGN-NOTES.md here).
import { ICON, esc, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';

const UPDATED = '23 October 2026';

const site = {
  id: 'timer-pomodoro',
  inputNoun: 'text',
  name: 'Timer and Pomodoro',
  url: `${config.domain}/timer-pomodoro`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  // A stopwatch-style dial for the logo and favicon.
  mark: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 3h5M12 3v3"/>',
  tagline: 'A countdown timer, stopwatch and Pomodoro timer. Everything runs in your browser.',
  privacySummary: 'The times you set and the laps you record stay inside your web browser. They are not sent to us or anyone else, and they are gone when you close or reload the page. The site may show ads and may count visits without cookies, as explained below.',
  // Ads and analytics stay OFF until the owner fills these in. No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Built to make things simpler.',
  footnote2: 'Timing happens on your device. Nothing is stored.',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'home', label: 'Modes', hash: '#modes' }, { id: 'home', label: 'Questions', hash: '#faq' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

const TRUST = ['Free, no sign-up', 'Runs in your browser', 'Nothing is saved'];

/* ---------- icons ---------- */
const svg = (d, size = 18, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  play: svg('<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.5-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8z" fill="currentColor"/>', 20, ' class="i-play"'),
  pause: svg('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/>', 20, ' class="i-pause"'),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.7-6M4 4.5V8h3.5"/>', 18),
  lap: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', 18),
  skip: svg('<path d="M5 5l9 7-9 7zM18 5v14"/>', 18),
  timer: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 3h5"/>', 22),
  watch: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5l3-3M9.5 3h5M12 3v3M18.5 6.5l1.2-1.2"/>', 22),
  tomato: svg('<path d="M12 7.5c-4.4 0-7.5 2.6-7.5 6.3 0 3.6 3.1 6.2 7.5 6.2s7.5-2.6 7.5-6.2c0-3.7-3.1-6.3-7.5-6.3z"/><path d="M12 7.5V4M9 5.5c1 .2 2 .8 3 2 1-1.2 2-1.8 3-2"/>', 22),
};

/* ---------- tool markup ---------- */
const MODES = [['countdown', 'Countdown', I.timer], ['stopwatch', 'Stopwatch', I.watch], ['pomodoro', 'Pomodoro', I.tomato]];
const PRESETS = [['1 min', 60], ['5 min', 300], ['10 min', 600], ['15 min', 900], ['30 min', 1800], ['1 hour', 3600]];

const numField = (id, label, { name, max, value, attrs = '', suffix = '' }) => `<div class="tp-nf"><label class="lbl" for="${id}">${label}</label><div class="field"><input id="${id}" name="${name}" type="number" inputmode="decimal" min="0" max="${max}" value="${value}" ${attrs}>${suffix ? `<span class="suffix">${suffix}</span>` : ''}</div></div>`;

const toolHtml = () => `<section id="tool" class="tool tp-tool" data-tool data-mode="countdown" aria-label="${esc(site.name)}">
  <div class="stage tp-stage">
    <div class="tp-tabs" role="tablist" aria-label="Timer mode" data-tabs>${MODES.map(([id, label, icon], n) => `<button type="button" class="tp-tab" role="tab" id="tp-tab-${id}" data-mode-tab="${id}" aria-controls="tp-view" aria-selected="${n === 0}" tabindex="${n === 0 ? 0 : -1}">${icon}<span>${label}</span><i class="tp-run" aria-hidden="true" hidden></i></button>`).join('')}</div>

    <div id="tp-view" class="tp-view" role="tabpanel" aria-labelledby="tp-tab-countdown" data-view>
      <div class="tp-head">
        <p class="tp-phase" data-phase>Countdown</p>
        <p class="tp-sub num" data-sub>Set a time, then press Start.</p>
      </div>

      <div class="tp-dial" data-dial>
        <svg class="tp-ring" viewBox="0 0 200 200" aria-hidden="true"><circle class="tp-ring-track" cx="100" cy="100" r="92"/><circle class="tp-ring-bar" cx="100" cy="100" r="92" data-ring/></svg>
        <div class="tp-readout num" role="timer" aria-live="off" aria-label="Time" data-time-wrap><span data-time>00:05:00</span><span class="tp-cs" data-cs hidden>.00</span></div>
      </div>

      <ol class="tp-pips" data-pips aria-label="Focus sessions in this cycle" hidden></ol>
      <p class="tp-state" data-state>Ready</p>

      <div class="tp-controls" data-controls>
        <button type="button" class="btn btn-primary tp-primary" data-primary aria-label="Start"><span class="tp-ico" data-primary-icon>${I.play}${I.pause}</span><span data-primary-label>Start</span></button>
        <button type="button" class="btn btn-ghost tp-second" data-secondary hidden><span data-secondary-icon></span><span data-secondary-label>Lap</span></button>
        <button type="button" class="btn btn-ghost tp-reset" data-reset>${I.reset}<span>Reset</span></button>
      </div>
      <p class="hint tp-keys">Press the space bar to start or pause.</p>

      <section class="tp-laps" data-laps-wrap aria-labelledby="tp-laps-title" hidden>
        <h3 id="tp-laps-title" class="tp-laps-title">Laps <span class="tp-count num" data-lap-count>0</span></h3>
        <p class="hint" data-laps-empty>Press Lap while the stopwatch runs to record a split.</p>
        <div class="tp-lap-scroll"><table class="tp-lap-table" data-laps-table hidden><thead><tr><th scope="col">Lap</th><th scope="col">Split</th><th scope="col">Total</th></tr></thead><tbody data-laps></tbody></table></div>
      </section>

      <p class="tp-totals" data-totals hidden></p>
      <p class="tp-sr" role="status" aria-live="polite" data-announce></p>
    </div>
  </div>

  <form class="panel tp-panel" data-options autocomplete="off" novalidate onsubmit="return false" aria-label="Timer settings">
    <div class="tp-mode-panel" data-mode-panel="countdown">
      <div class="block">
        <span class="lbl" id="tp-set-lbl">Set the time</span>
        <div class="tp-hms" role="group" aria-labelledby="tp-set-lbl">
          ${numField('tp-h', 'Hours', { name: 'hours', max: 99, value: 0, attrs: 'data-h' })}
          ${numField('tp-m', 'Minutes', { name: 'minutes', max: 59, value: 5, attrs: 'data-m' })}
          ${numField('tp-s', 'Seconds', { name: 'seconds', max: 59, value: 0, attrs: 'data-s' })}
        </div>
      </div>
      <div class="block">
        <span class="lbl">Quick presets</span>
        <div class="chips" data-presets>${PRESETS.map(([t, s]) => `<button type="button" class="chip" data-preset="${s}">${t}</button>`).join('')}</div>
      </div>
    </div>

    <div class="tp-mode-panel" data-mode-panel="stopwatch" hidden>
      <div class="block">
        <span class="lbl">Stopwatch</span>
        <p class="tp-note">Counts up from zero to hundredths of a second. Press Lap to record a split without stopping. Stop keeps your time so you can carry on from where you left off.</p>
      </div>
    </div>

    <div class="tp-mode-panel" data-mode-panel="pomodoro" hidden>
      <div class="block">
        <span class="lbl" id="tp-pomo-lbl">Lengths and sessions</span>
        <div class="tp-grid2" role="group" aria-labelledby="tp-pomo-lbl">
          ${numField('tp-focus', 'Focus', { name: 'focus', max: 360, value: 25, attrs: 'step="any" data-focus', suffix: 'min' })}
          ${numField('tp-short', 'Short break', { name: 'short', max: 360, value: 5, attrs: 'step="any" data-short', suffix: 'min' })}
          ${numField('tp-long', 'Long break', { name: 'long', max: 360, value: 15, attrs: 'step="any" data-long', suffix: 'min' })}
          ${numField('tp-sessions', 'Focus sessions', { name: 'sessions', max: 12, value: 4, attrs: 'step="1" data-sessions', suffix: 'before long' })}
        </div>
        <p class="hint">A long break follows the last focus session of each round. Decimals work, so 0.5 is thirty seconds.</p>
      </div>
      <label class="check"><input type="checkbox" name="auto" data-auto><span>Start the next phase automatically</span></label>
    </div>

    <fieldset class="tp-fs">
      <legend class="lbl">Alerts and screen <span class="tp-opt">(all off by default)</span></legend>
      <label class="check"><input type="checkbox" name="notify" data-notify><span>Show a notification when time is up</span></label>
      <p class="hint tp-err" data-notify-hint hidden></p>
      <label class="check"><input type="checkbox" name="sound" data-sound><span>Play a short tone when time is up</span></label>
      <div class="tp-vol" data-vol-row>
        <label class="lbl" for="tp-vol">Volume</label>
        <input id="tp-vol" type="range" class="range" min="0" max="100" value="60" data-volume>
        <button type="button" class="chip" data-test-tone>Play test</button>
      </div>
      <label class="check" data-wake-row hidden><input type="checkbox" name="wake" data-wake><span>Keep the screen awake while running</span></label>
    </fieldset>

    <p class="hint tp-reload">Nothing is saved. These settings return to normal when you reload the page.</p>
  </form>
</section>`;

/* ---------- copy ---------- */
const HOW = [
  ['Pick a mode', 'Choose Countdown for a fixed time, Stopwatch to measure how long something takes, or Pomodoro for repeating blocks of focus and rest. Each mode keeps its own time, so you can switch tabs without losing your place.'],
  ['Set it up', 'Type hours, minutes and seconds or tap a preset. For Pomodoro, set the focus length, the two break lengths and how many focus sessions come before the long break. Alerts and screen settings are off until you turn them on.'],
  ['Start, pause, repeat', 'Press Start or the space bar. The page works out the time from the clock each time it looks, so it stays correct if you switch tabs. The tab title shows what is left, and the page announces the finish without reading out every second.'],
];

const MODE_CARDS = [
  [I.timer, 'Countdown timer', 'Set up to 99 hours, 59 minutes and 59 seconds, or use a preset for cooking, tea, a short rest or a meeting slot. Pause and resume without losing the time left.'],
  [I.watch, 'Stopwatch', 'Counts up with hundredths of a second. Record laps and see each split next to the running total, with the fastest and slowest laps marked once you have two or more.'],
  [I.tomato, 'Pomodoro timer', 'Alternates focus sessions with short breaks and adds a long break after the last session of a round. Skip a phase, let the next one start by itself, and see your cycle and session count.'],
];

const FAQ = [
  ['Is the time accurate if I switch to another tab?', 'Yes. The timer does not count ticks. It stores the moment it should finish, and each time the page checks, it compares that moment with the device clock. Browsers slow down background tabs, so the display may not update while you are away, but the time is worked out afresh the moment the page wakes or you return. A tone or notification may arrive a little late if the browser has put the tab to sleep.'],
  ['Are notifications and sound on by default?', 'No. Both are off. If you tick the notification box, your browser then asks for permission, and only at that moment. If you say no, the box is cleared and nothing is shown. The sound is a short tone made inside the page, with a volume slider and a test button. No audio files are loaded.'],
  ['What is the Pomodoro technique?', 'It is a time-management method in which you work in short, timed blocks, often 25 minutes, with a short break after each block and a longer break after several. People use it to break up long tasks and to take regular rests. We describe it only as a method; whether it suits you is something to try for yourself. "Pomodoro" is the name of the technique, and this site has no affiliation with its creator or any organisation that uses the name.'],
  ['Does the site store my times or laps?', 'No. Nothing is written to cookies, local storage or any other storage, and nothing is sent to a server. Your times, laps and settings live in the page\'s memory and disappear when you close or reload the tab. That also means settings reset on reload.'],
  ['Does it work offline?', 'Once the page has loaded, the timer needs no connection, because all the code is already in your browser and it never makes network requests while you use it. Loading the page in the first place needs a connection, and we do not install an offline copy, so a closed tab cannot be reopened without one unless your browser has kept the page.'],
  ['Can I leave the tab in the background?', 'Yes, but keep the tab open. Switching to another tab or window is fine. Closing the tab, or a phone discarding it to free memory, stops everything. On a phone, locking the screen may pause the page, though the time left is still right when you come back. The "keep the screen awake" option, where your browser supports it, stops the screen from dimming while a timer runs.'],
  ['What happens if my device goes to sleep?', 'The timer uses the device clock, which keeps going while the device sleeps. When it wakes, the page recalculates. A countdown that should have finished will show as finished, and a Pomodoro with automatic advance will jump to the phase it should be in now.'],
  ['Can I run more than one mode at once?', 'Yes. The countdown, stopwatch and Pomodoro each keep their own time, and a small dot on a tab shows that it is running. The tab title shows the one you are looking at first. They share the alert settings.'],
  ['Why does the stopwatch stop showing hundredths while it runs?', 'If your device is set to reduce motion, the fast-changing hundredths are hidden while the stopwatch is running to keep the display calm. They appear again when you stop it, and laps always show them.'],
];

const TIPS = [
  'Press the space bar to start or pause when no field is selected.',
  'Turn on the tone before you start a long timer, so your browser lets the page play sound.',
  'Keep this tab open. Closing it ends the timer.',
  'Do not rely on a web page for anything where timing is a safety matter, such as medication.',
  'Use Skip in Pomodoro mode to end a phase early. Time already spent still counts.',
];

function home(ctx) {
  const body = `<main id="main">
${hero({ h1: 'Timer and Pomodoro', lead: 'A countdown timer, a stopwatch with laps and a Pomodoro focus timer in one page. Big numbers, accurate even when the tab is in the background, and nothing leaves your browser.', trustItems: TRUST, h1Class: 'max-w-[14ch] text-[44px] sm:text-6xl md:text-[80px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  <ol class="tp-steps m-0 grid list-none gap-4 p-0 md:grid-cols-3">${HOW.map(([t, d], n) => `<li class="card p-7"><span class="tp-step num" aria-hidden="true">${n + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>
</section>

<section id="modes" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('Three timers, one page', 'Switch between them with the tabs above the dial.')}
  <div class="tp-modes">${MODE_CARDS.map(([icon, t, d]) => `<article class="card tp-mode"><span class="tp-mode-ico">${icon}</span><h3 class="mt-4 text-2xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></article>`).join('')}</div>
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">Timing that keeps up when you look away</h2>
    <p class="mt-5 text-lg text-ink-2">Many online timers work by adding one second every second. That goes wrong when a browser slows a background tab, because the ticks arrive late and the clock falls behind. This page does it differently. When you press Start it records the moment the timer should end, and every time it checks it simply compares that moment with the device clock. A late check gives the same answer as an on-time one.</p>
    <p class="mt-5 text-lg text-ink-2">The Pomodoro technique is a way of working in short timed blocks with breaks between them. A common pattern is four 25-minute focus sessions with five-minute breaks, then a longer break. You can change every length here, along with the number of sessions before the long break. Whether the method helps is personal, so treat the defaults as a starting point.</p></div>
  <div class="card p-7 md:p-8"><h3 class="text-xl">Handy to know</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${TIPS.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section id="faq" class="wrap wrap-narrow mt-32 scroll-mt-20">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(FAQ)}
</section>
</main>`;
  return {
    title: 'Timer and Pomodoro: Online Countdown, Stopwatch and Focus Timer',
    desc: 'Free online countdown timer, stopwatch with laps and Pomodoro timer. Accurate in background tabs, optional alerts, tab title countdown. Runs in your browser; nothing is stored.',
    body, faq: FAQ, tool: { category: 'UtilitiesApplication' }, scripts: ['assets/tool.js'],
  };
}

/* ---------- text pages (framework templates) ---------- */
const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${esc(site.name)} puts three everyday timing tools on one page: a countdown timer, a stopwatch with laps and a focus timer that alternates work and rest. It exists for people who want a clear, large display and no account, app or clutter.</p>
<p>Time is measured against your device's clock rather than by counting ticks, so the result stays right when the tab is in the background or the device sleeps. Alerts are optional: a browser notification and a short tone made inside the page, both off until you turn them on. The page does not load audio files or any third-party code, and it makes no network requests while you use it.</p>
<p>"Pomodoro" is the name of a time-management technique. This site is an independent tool and is not connected to the technique's creator or to any organisation that uses the name.</p>
<p>It is free to use and is paid for by advertising. It is run by ${esc(site.operator)}, in Brisbane, Australia. Questions or ideas can go to ${esc(site.contact)}.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'The times and laps you set', dataHtml: '<p>The times you enter, the laps you record, your Pomodoro settings and your alert choices are held in the page\'s memory only. They are never sent to us or to anyone else, and they are not written to cookies, local storage or any other storage. They are gone when you close or reload the page.</p><p>If you turn on notifications, your browser asks for permission and decides how to handle it; the notification is shown by your device and its text (for example "Time is up") is made on the page. If you keep the screen awake, the request goes to your browser, not to us. The tool does not need an account and does not ask for personal information.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool that provides a countdown timer, a stopwatch and a Pomodoro-style focus timer in your browser.`, ownershipHtml: '<p>The times, laps and settings are yours. We do not claim them and we do not keep them.</p>', processingHtml: '<p>Everything is worked out on your device and nothing is sent to us. Settings and laps are kept in the page\'s memory and disappear when you close or reload the page.</p>', responsibilityHtml: '<p>Browsers can pause, slow or close pages, devices can run out of battery, and notifications or sounds can be blocked by your settings, so an alert may be late or may not appear. Do not rely on this tool where timing matters for safety or health, such as medication, or where a missed alert would cause harm or loss. "Pomodoro" refers to a technique and this site is not affiliated with its creator.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug or have an idea for a feature? Email us.' }) },
];

export default { site, pages, copy: [['src/tool.js', 'assets/tool.js'], ['src/clock.mjs', 'assets/clock.mjs'], ['src/pomodoro.mjs', 'assets/pomodoro.mjs'], ['src/format.mjs', 'assets/format.mjs']] };
