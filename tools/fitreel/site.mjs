// FitReel: get a video ready for Reels (9:16, compressed, location removed, cover picked), in the browser.
// Part of Fitpic: built into Fitpic's site at /instagram/ (see `include` in tools/fitpic/site.mjs).
// Shared layout, header, footer, SEO and styles come from /framework.
import { ICON, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';

const UPDATED = '22 October 2026';
const NOT_AFFILIATED = 'FitReel is an independent tool. It is not affiliated with, endorsed by or connected to Instagram or Meta.';

const site = {
  id: 'fitreel',
  name: 'FitReel',
  url: 'https://usefitpic.com/instagram', // served under Fitpic's domain
  contact: 'info@usefitpic.com',
  parent: 'MacuTech',
  operator: 'MacuTech',
  tagline: 'Get any video Reel-ready in your browser.',
  privacySummary: 'Your videos never leave your device. FitReel processes them inside your web browser, and they are not uploaded to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  footnote: 'Part of Fitpic.',
  footnote2: 'Not affiliated with Instagram or Meta.',
  themeColor: '#150f24',
  iconGradient: ['#f77737', '#c13584'],
  // Play button inside a 9:16 frame.
  mark: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 9.2v5.6l4.4-2.8z" fill="currentColor" stroke="none"/>',
  ads: { client: 'ca-pub-8622882132846694', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  nav: [{ id: 'split', label: 'Split screen' }, { id: 'meta', label: 'Remove location' }, { path: '../', label: 'Photo tools' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Tools', links: [{ id: 'home', label: 'Reel-ready video' }, { id: 'ratio', label: 'Convert to 9:16' }, { id: 'split', label: 'Split screen' }, { id: 'meta', label: 'Remove video location' }] },
    { title: 'Fitpic', links: [{ path: '../', label: 'Photo resizer' }, { path: '../reduce-image-size-in-kb/', label: 'Reduce size in KB' }] },
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

const TRUST = ['Nothing is uploaded', 'Free, no sign-up, no watermark', 'MP4, MOV and WebM'];

/* ---------- tool markup ---------- */
const UPLOAD = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';
const PLUS = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>';
const SWAP = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5v11M2.5 5L5 2.5 7.5 5M11 13.5v-11M8.5 11l2.5 2.5 2.5-2.5"/></svg>';

const seg = (name, opts, cls = '') => `<div class="seg ${cls}" data-seg style="--n:${opts.length}" role="radiogroup" aria-label="${name}">${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}"><span>${t}</span></label>`).join('')}</div>`;
const range = (attr, label, min = 0, max = 100, step = 1, value = 50) => `<input type="range" class="range" ${attr} min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}">`;

function toolHtml({ layout = 'single', framing = 'blur' } = {}) {
  return `<section id="tool" class="tool reel-tool" data-tool data-layout="${layout}" data-framing="${framing}" aria-label="Reel video tool">
  <div class="stage" data-stage>
    <div class="err" data-err hidden></div>
    <button type="button" class="drop" data-drop>
      <span class="drop-icon">${UPLOAD}</span>
      <span class="drop-title">Drop a video here</span>
      <span class="drop-sub">or click to choose one from your device.</span>
      <span class="drop-types">MP4, MOV or WebM. Nothing is uploaded.</span>
    </button>
    <input type="file" accept="video/*,.mov,.mp4,.m4v,.webm,.mkv" hidden data-file aria-label="Choose a video">
    <input type="file" accept="video/*,.mov,.mp4,.m4v,.webm,.mkv" hidden data-file2 aria-label="Choose a second video">
    <div class="stage-top" data-stage-top hidden>
      <div class="file-chip"><span data-name></span></div>
      <div class="view-switch" data-view-switch hidden>${seg('view', [['frame', 'Frame'], ['result', 'Play']], 'seg-sm seg-inline')}</div>
    </div>
    <div class="phone-wrap" data-view hidden>
      <div class="phone" data-phone>
        <canvas width="540" height="960" data-canvas aria-label="Preview of the Reel"></canvas>
        <video data-video playsinline muted loop controls hidden aria-label="Finished Reel"></video>
        <div class="safe" data-safe hidden aria-hidden="true"><i class="safe-top"></i><i class="safe-right"></i><i class="safe-bottom"></i><span>Areas the app covers with buttons and captions (approximate)</span></div>
        <button type="button" class="add2" data-add2 hidden><span class="add2-icon">${PLUS}</span>Add a second clip<span class="add2-sub">Tap to choose, or drop it here</span></button>
        <div class="render-veil" data-veil hidden><div class="render-box"><span class="render-pct num" data-pct>0%</span><span class="render-what">Making your Reel</span><div class="bar"><i data-pbar></i></div><button type="button" class="link-btn !m-0" data-cancel>Cancel</button></div></div>
      </div>
    </div>
    <button type="button" class="btn btn-success dl-under" data-download-under hidden>Download Reel</button>
    <div class="readout" data-readout hidden aria-live="polite">
      <div class="sizes"><span class="from num" data-from></span><span class="to num" data-to></span><span class="delta" data-delta></span></div>
      <dl class="facts">
        <div><dt>Size</dt><dd class="num" data-dim>1080 &times; 1920</dd></div>
        <div><dt>Length</dt><dd class="num" data-len></dd></div>
        <div><dt>Format</dt><dd data-fmt></dd></div>
      </dl>
      <div class="grid gap-2" data-notes></div>
    </div>
  </div>
  <form class="panel" data-panel autocomplete="off" novalidate>
    <div class="block"><span class="lbl">Layout</span>${seg('layout', [['single', 'One video'], ['split', 'Split screen']])}</div>

    <div class="block" data-sec="single">
      <span class="lbl">Fill the 9:16 frame with</span>
      ${seg('framing', [['blur', 'Blur'], ['crop', 'Crop'], ['bars', 'Bars']], 'seg-sm')}
      <p class="hint" data-framing-hint></p>
      <div class="block" data-pos-wrap hidden><div class="lbl-row"><span class="lbl">Crop position</span><span class="hint" data-pos-label>Centre</span></div>${range('data-pos', 'Crop position')}</div>
    </div>

    <div class="block" data-sec="split" hidden>
      <span class="lbl">Second clip</span>
      <div class="clip2" data-clip2-empty><button type="button" class="btn btn-ghost w-full" data-choose2>${PLUS}Add second clip</button><p class="hint">Use your own footage. It loops if it is shorter than the main video.</p></div>
      <div class="clip2-row" data-clip2 hidden><span class="clip2-name" data-name2></span><button type="button" class="chip" data-choose2>Change</button></div>
      <button type="button" class="chip self-start" data-swap>${SWAP}<span data-swap-label>Main video on top</span></button>
      <div class="block"><span class="lbl">Sound from</span>${seg('sound', [['main', 'Main'], ['second', 'Second'], ['none', 'None']], 'seg-sm')}</div>
      <div class="block m-extra"><div class="lbl-row"><span class="lbl">Main video position</span></div>${range('data-pos-main', 'Main video crop position')}
        <div class="lbl-row mt-2"><span class="lbl">Second clip position</span></div>${range('data-pos2', 'Second clip crop position')}</div>
    </div>

    <div class="block" data-trim-wrap>
      <div class="lbl-row"><span class="lbl">Trim</span><span class="hint num" data-trim-label></span></div>
      <div class="dual" data-dual>
        <div class="dual-track"><i data-dual-fill></i></div>
        <input type="range" class="range" data-trim-a min="0" max="1000" step="1" value="0" aria-label="Start">
        <input type="range" class="range" data-trim-b min="0" max="1000" step="1" value="1000" aria-label="End">
      </div>
    </div>

    <div class="block" data-cover-wrap>
      <div class="lbl-row"><span class="lbl">Cover frame</span><span class="hint num" data-cover-label>Auto</span></div>
      ${range('data-cover', 'Cover frame', 0, 1000, 1, 300)}
      <p class="hint">Download it, then add it as the cover in the app.</p>
    </div>

    <div class="block m-extra"><span class="lbl">Quality</span>${seg('quality', [['best', 'Best'], ['small', 'Smaller file']], 'seg-sm')}</div>
    <label class="check m-extra"><input type="checkbox" data-strip checked><span>Remove location and hidden metadata</span></label>
    <label class="check m-extra"><input type="checkbox" data-safe-on><span>Show areas covered by the app</span></label>

    <button type="button" class="more-toggle" data-more-toggle aria-expanded="false"><span data-more-label>More options</span><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></button>
    <p class="hint" data-msg role="status"></p>
    <div class="panel-actions">
      <button type="button" class="btn btn-ghost w-full" data-download disabled>Download Reel</button>
      <button type="button" class="btn btn-ghost w-full" data-cover-dl disabled>Download cover</button>
      <button type="button" class="btn btn-ghost w-full" data-choose>Choose a video</button>
    </div>
  </form>
</section>`;
}

/* ---------- copy ---------- */
const FAQ_BASE = [
  ['Is my video uploaded anywhere?', 'No. FitReel runs in your browser and makes the new video on your own device. Your video is never sent to a server, and there is no account to create.'],
  ['What does FitReel change?', 'It makes a 1080 × 1920 (9:16) MP4 with H.264 video and AAC sound, the format Reels are shown in. It fills the frame with a blurred background, a crop or black bars, removes location and other hidden metadata, and lets you trim the clip and pick a cover frame.'],
  ['Will this boost my reach?', 'No tool can promise that, and we do not claim to. Reach depends on how people respond to your Reel. FitReel makes sure the file itself is the right shape and size, so nothing gets cut off or squashed, and keeps your location private.'],
  ['Why remove location data?', 'Phones often save the place a video was filmed inside the file. Some apps strip it when you post, but many messaging apps, email and websites pass files on untouched, so it is safer to remove it yourself. FitReel tells you if it found any.'],
  ['How do I set the cover?', 'Move the Cover frame slider to the moment you want, then tap Download cover. When you post, choose Edit cover and add the image from your camera roll.'],
  ['Which browsers work?', 'Recent versions of Chrome, Edge and Safari on phones and computers. Firefox works too, but on some systems it may not be able to save H.264 video. Very long or 4K videos can take a while on older phones.'],
  ['Is FitReel free?', 'Yes. There is no account, no watermark and no limit. The site is supported by ads.'],
];

const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d]) => `<li class="card p-7"><h3 class="text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;
const ticks = (items) => `<ul class="m-0 mt-5 grid list-none gap-4 p-0">${items.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul>`;
const SCRIPTS = ['assets/tool.js'];
const TOOL_META = { category: 'MultimediaApplication' };

const FRAMES = `<svg viewBox="0 0 300 150" class="h-auto w-full" role="img" aria-label="A wide video placed in a tall 9:16 frame three ways: blurred background, cropped, and with bars.">
  <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f77737"/><stop offset="1" stop-color="#c13584"/></linearGradient></defs>
  <g transform="translate(28 10)"><rect width="66" height="118" rx="10" fill="#3a2350"/><rect x="0" y="40" width="66" height="38" fill="url(#rg)"/><text x="33" y="138" text-anchor="middle" fill="#c9bfe0" font-size="12" font-weight="600">Blur</text></g>
  <g transform="translate(117 10)"><rect width="66" height="118" rx="10" fill="url(#rg)"/><text x="33" y="138" text-anchor="middle" fill="#c9bfe0" font-size="12" font-weight="600">Crop</text></g>
  <g transform="translate(206 10)"><rect width="66" height="118" rx="10" fill="#07060c" stroke="#3a3360"/><rect x="0" y="40" width="66" height="38" fill="url(#rg)"/><text x="33" y="138" text-anchor="middle" fill="#c9bfe0" font-size="12" font-weight="600">Bars</text></g>
</svg>`;
const PIN = `<svg viewBox="0 0 300 150" class="h-auto w-full" role="img" aria-label="A location pin crossed out.">
  <rect x="20" y="16" width="260" height="110" rx="16" fill="#1d1533"/>
  <path d="M150 38c-15 0-26 11-26 26 0 19 26 42 26 42s26-23 26-42c0-15-11-26-26-26z" fill="none" stroke="#c9bfe0" stroke-width="3"/>
  <circle cx="150" cy="64" r="8" fill="#c9bfe0"/>
  <path d="M112 112L188 30" stroke="#ff8fa3" stroke-width="4" stroke-linecap="round"/>
</svg>`;
const SPLIT = `<svg viewBox="0 0 300 150" class="h-auto w-full" role="img" aria-label="A tall frame split into a top and bottom video.">
  <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f77737"/><stop offset="1" stop-color="#c13584"/></linearGradient></defs>
  <rect x="117" y="8" width="66" height="118" rx="10" fill="#3a2350"/>
  <path d="M117 18a10 10 0 0 1 10-10h46a10 10 0 0 1 10 10v49h-66z" fill="url(#sg)"/>
  <text x="150" y="42" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">Main</text>
  <text x="150" y="101" text-anchor="middle" fill="#c9bfe0" font-size="11" font-weight="700">Second</text>
</svg>`;

/* ---------- pages ---------- */
function home(ctx, page) {
  const body = `<main id="main">
${hero({ h1: 'Get your video Reel-ready.', lead: 'Upload a video, clean its metadata, add a second clip and get it ready for Reels in seconds. It all runs in your browser, so nothing is uploaded.', trustItems: TRUST, after: toolHtml() })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32">
  ${sectionHead('One stop before you post', 'The file prep that usually takes three apps, done in one place without an account.')}
  <div class="bento">
    <article class="card span-2"><figure>${FRAMES}</figure><h3 class="text-2xl">Fits 9:16 without cutting anyone off</h3><p>Wide and square videos get a soft blurred background by default, so nothing is cropped away. Prefer a full-screen crop? Slide it to the part that matters.</p></article>
    <article class="card"><figure>${PIN}</figure><h3 class="text-2xl">Location removed</h3><p>Phones hide the place you filmed inside the file. FitReel strips it, along with device and date tags, and tells you what it found.</p></article>
    <article class="card"><figure>${SPLIT}</figure><h3 class="text-2xl">Split screen</h3><p>Stack two of your own clips, top and bottom. The shorter one loops, and you choose whose sound plays.</p></article>
    <article class="card"><div class="fmt-list"><span>1080 &times; 1920</span><span>H.264</span><span>AAC</span></div><h3 class="text-2xl">The format Reels use</h3><p>A clean MP4 at a sensible bitrate, so the app has less to squash when it processes your upload.</p></article>
    <article class="card"><div class="fmt-list"><span>$0</span><span>No watermark</span></div><h3 class="text-2xl">Free, no sign-up</h3><p>No account, no watermark, no limit on how many videos you make.</p></article>
  </div>
</section>
<section class="wrap mt-32">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards([['Drop in a video', 'Choose one from your phone or computer. It is read on your device and never uploaded.'], ['It is made Reel-ready', 'In seconds you get a 9:16 MP4 with the location removed and a cover picked. Change anything you like.'], ['Download and post', 'Save the video and the cover image, then post them as usual.']])}
</section>
${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">
  ${sectionHead('Questions')}
  ${faqHtml(FAQ_BASE)}
</section>
</main>`;
  return { title: 'Resize Video for Instagram Reels (9:16), Free and Private | FitReel', desc: 'Make any video Reel-ready: 1080 × 1920 MP4, location removed, cover picked, trim and split screen. Free, no sign-up, and nothing is uploaded.', body, faq: FAQ_BASE, tool: TOOL_META, scripts: SCRIPTS };
}

function ratioPage(ctx) {
  const lead = 'Turn a landscape or square video into a 9:16 vertical video for Reels, Shorts and TikTok. Blur, crop or bars, right in your browser.';
  const faq = [
    ['How do I change a video to 9:16?', 'Drop it in above. FitReel makes a 1080 × 1920 version straight away with a blurred background. Switch to Crop to fill the screen, or Bars for plain black above and below.'],
    ['Will my video be stretched?', 'No. FitReel never stretches. Blur and Bars keep the whole picture, and Crop trims the sides evenly, or wherever you move the slider.'],
    ['Does it work for TikTok and YouTube Shorts?', 'Yes. They use the same 9:16 shape and 1080 × 1920 size.'],
    ...FAQ_BASE.slice(0, 1), FAQ_BASE[5],
  ];
  const body = `<main id="main">
${hero({ h1: 'Convert video to 9:16', lead, trustItems: TRUST, h1Class: 'max-w-[16ch] text-[40px] sm:text-6xl md:text-[72px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">Three ways to fill a tall frame</h2>
    <p class="mt-5 text-lg text-ink-2"><strong class="text-ink">Blur</strong> places your whole video in the middle over a soft, blurred copy of itself. Nothing is lost, and it looks deliberate.</p>
    <p class="mt-5 text-lg text-ink-2"><strong class="text-ink">Crop</strong> fills the screen and trims the sides. Use the position slider to keep the subject in frame.</p>
    <p class="mt-5 text-lg text-ink-2"><strong class="text-ink">Bars</strong> keeps the whole video with plain black above and below.</p></div>
  <div class="card p-7 md:p-8"><figure class="m-0">${FRAMES}</figure><h3 class="mt-4 text-xl">Which one to pick</h3>${ticks(['Talking to camera in landscape? Crop, with the slider on your face.', 'Scenery, groups or text across the frame? Blur.', 'Want it to look like a film clip? Bars.'])}</div>
</section>
${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">${sectionHead('Questions', '', 'text-4xl md:text-5xl')}${faqHtml(faq)}</section>
</main>`;
  return { title: 'Convert Video to 9:16 Online (Free, No Upload) | FitReel', desc: lead, body, faq, tool: TOOL_META, scripts: SCRIPTS };
}

function splitPage(ctx) {
  const lead = 'Stack two of your own videos top and bottom in one 9:16 Reel. The shorter clip loops, and you pick whose sound plays.';
  const faq = [
    ['How do I make a split screen video?', 'Choose your main video, then tap Add second clip and pick another. FitReel stacks them in a 1080 × 1920 frame, each half cropped to fill.'],
    ['What if the clips are different lengths?', 'The Reel is as long as the main video. If the second clip is shorter, it loops until the end.'],
    ['Can I use clips from games, TV or YouTube?', 'Only use footage you own or have permission to use. FitReel works with files on your device and does not download videos from other sites.'],
    ['Whose sound is used?', 'You choose: the main video, the second clip, or none.'],
    ...FAQ_BASE.slice(0, 1),
  ];
  const body = `<main id="main">
${hero({ h1: 'Split screen video maker', lead, trustItems: TRUST, h1Class: 'max-w-[16ch] text-[40px] sm:text-6xl md:text-[72px]', after: toolHtml({ layout: 'split' }) })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards([['Choose the main video', 'This sets the length of the Reel and goes on top.'], ['Add a second clip', 'Your own footage: a reaction, a gameplay recording, a satisfying loop. Swap top and bottom with one tap.'], ['Pick the sound and download', 'Keep the main sound, use the second clip, or mute both.']])}
</section>
<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">Good second clips</h2><p class="mt-5 text-lg text-ink-2">The bottom half works best with something calm and continuous that keeps eyes on the screen without competing with what you are saying.</p>${ticks(['Your own gameplay recording', 'Cooking, crafts or hands-on process shots', 'Driving, walking or scenery footage you filmed', 'Free stock footage that allows commercial use'])}</div>
  <div class="card p-7 md:p-8"><figure class="m-0">${SPLIT}</figure><h3 class="mt-4 text-xl">Use footage you are allowed to use</h3><p class="mt-3 text-ink-2">Clips from TV shows, films or other creators' videos can get a Reel muted or removed. Stick to your own recordings or footage with a licence that allows it.</p></div>
</section>
${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">${sectionHead('Questions', '', 'text-4xl md:text-5xl')}${faqHtml(faq)}</section>
</main>`;
  return { title: 'Split Screen Video Maker for Reels (Free, No Upload) | FitReel', desc: lead, body, faq, tool: TOOL_META, scripts: SCRIPTS };
}

function metaPage(ctx) {
  const lead = 'Phones save where a video was filmed inside the file. Remove the location and other hidden data before you share it, without uploading it anywhere.';
  const faq = [
    ['How do I know if my video has location data?', 'Drop it in above. FitReel checks the file and tells you whether it found a location, the phone model or a recording date.'],
    ['What exactly is removed?', 'FitReel writes a brand-new video file that contains only the picture and sound. Location, device, date and other tags from the original are left out.'],
    ['Does it change the picture?', 'The video is re-encoded as a 1080 × 1920 MP4 for Reels. If you need the original shape, use the Bars option so nothing is cropped.'],
    ['Do social apps remove location anyway?', 'Some do when you post, but messaging apps, email and many websites pass files on untouched. Removing it yourself means you do not have to rely on that.'],
    ...FAQ_BASE.slice(0, 1),
  ];
  const body = `<main id="main">
${hero({ h1: 'Remove location from a video', lead, trustItems: TRUST, h1Class: 'max-w-[16ch] text-[40px] sm:text-6xl md:text-[72px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}
<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">What a video file can give away</h2>
    <p class="mt-5 text-lg text-ink-2">Most phones save GPS coordinates in every video unless location is turned off for the camera. Files can also carry the phone model, software version and the exact date and time.</p>
    <p class="mt-5 text-lg text-ink-2">Anyone who gets the original file can read these with free tools. That matters most for videos filmed at home, at school or at work.</p></div>
  <div class="card p-7 md:p-8"><figure class="m-0">${PIN}</figure><h3 class="mt-4 text-xl">Stop it at the source</h3>${ticks(['iPhone: Settings, Privacy & Security, Location Services, Camera, Never.', 'Android: open the Camera app settings and turn off location tags.', 'Already filmed? Run it through FitReel before you send it.'])}</div>
</section>
${adSlot(ctx, 'mid')}
<section class="wrap wrap-narrow mt-32">${sectionHead('Questions', '', 'text-4xl md:text-5xl')}${faqHtml(faq)}</section>
</main>`;
  return { title: 'Remove Location and Metadata From a Video (Free, No Upload) | FitReel', desc: lead, body, faq, tool: TOOL_META, scripts: SCRIPTS };
}

/* ---------- text pages ---------- */
const privacy = (ctx) => privacyPage(ctx, {
  updated: UPDATED,
  dataTitle: 'Your videos',
  dataHtml: '<p>When you choose or drop a video, your browser reads and processes it locally. The video, the finished Reel and the cover image are never sent to a server, and we cannot see them. They disappear when you close or reload the page.</p>',
});
const terms = (ctx) => termsPage(ctx, {
  updated: UPDATED,
  whatItIs: `${site.name} is a free tool for preparing videos for vertical video apps, in your browser.`,
  ownershipHtml: `<p>You keep all rights in the videos you use with ${site.name}. We do not claim any ownership of, or licence to, your videos. Only use footage you own or have permission to use, including in split screen.</p>`,
  processingHtml: `<p>${site.name} processes videos locally, inside your web browser. We do not receive, store or keep your videos or the results. See our Privacy policy for details.</p>`,
  responsibilityHtml: `<p>You are responsible for what you post and for checking that a video meets the rules of the app or site you post it to. ${NOT_AFFILIATED} We make no promise about how a video will be shown, ranked or received.</p>`,
});
const contact = (ctx) => contactPage(ctx, {
  lead: 'Found a bug or have an idea for FitReel? Email us and we will read it.',
  extraHtml: '<p class="mt-6">Please do not send videos. FitReel never needs them.</p>',
});
const about = (ctx) => aboutPage(ctx, { html: `
<p>FitReel gets a video ready for Reels in one step: the right shape and size, a clean file, the location removed and a cover picked. It is part of <a href="../../">Fitpic</a>, and like Fitpic it runs entirely in your browser.</p>
<h2>How it works</h2>
<p>Your browser decodes the video, draws each frame into a 1080 &times; 1920 frame, and encodes a new MP4 using the video encoder built into the browser (WebCodecs). The new file is written from scratch, so the original's hidden tags are not carried over unless you choose to keep them.</p>
<h2>What it does not do</h2>
<p>It does not post for you, connect to any social account, download videos from other sites, or promise more views. Reach depends on your audience, not on the file.</p>
<p>${NOT_AFFILIATED} Instagram is a trademark of Meta Platforms, Inc.</p>
<h2>Credits</h2>
<p>Video reading and writing uses <a href="https://mediabunny.dev">Mediabunny</a> (Mozilla Public License 2.0). In browsers without a built-in AAC encoder, sound is encoded with Mediabunny's AAC encoder, a WebAssembly build of FFmpeg's AAC encoder (FFmpeg is LGPL). Source code for both is available from the Mediabunny project. Text is set in Plus Jakarta Sans (SIL Open Font License).</p>` });

/* ---------- page list ---------- */
const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'ratio', slug: 'convert-video-to-9-16', tool: true, render: ratioPage },
  { id: 'split', slug: 'split-screen-video-maker', tool: true, render: splitPage },
  { id: 'meta', slug: 'remove-location-from-video', tool: true, render: metaPage },
  { id: 'about', slug: 'about', render: about },
  { id: 'privacy', slug: 'privacy', render: privacy },
  { id: 'terms', slug: 'terms', render: terms },
  { id: 'contact', slug: 'contact', render: contact },
];

export default {
  site,
  pages,
  copy: [
    ['src/tool.js', 'assets/tool.js'],
    ['engine/engine.js', 'assets/engine/engine.js'],
    ['engine/vendor/mediabunny.min.mjs', 'assets/engine/vendor/mediabunny.min.mjs'],
    ['engine/vendor/mediabunny.LICENSE.txt', 'assets/engine/vendor/mediabunny.LICENSE.txt'],
    ['engine/vendor/mediabunny-aac-encoder.min.mjs', 'assets/engine/vendor/mediabunny-aac-encoder.min.mjs'],
    ['engine/vendor/mediabunny-aac-encoder.LICENSE.txt', 'assets/engine/vendor/mediabunny-aac-encoder.LICENSE.txt'],
  ],
};
