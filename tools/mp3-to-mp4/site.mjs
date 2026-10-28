// MP3 to MP4 Converter: turns an audio file and a still picture into a video file, in the browser.
// Pages, copy and tool markup live here; layout, header, footer, SEO and styles come from /framework.
// Layout follows the pilot pattern (tools/qr-code/DESIGN-NOTES.md). The video is made by src/encode.mjs.
import { ICON, hero, sectionHead, faqHtml, adSlot } from '../../framework/lib.mjs';
import { privacyPage, termsPage, contactPage, aboutPage } from '../../framework/pages.mjs';
import config from '../../framework/config.mjs';
import { SIZES, MAX_DURATION_SEC, WARN_DURATION_SEC } from './src/plan.mjs';

const UPDATED = '23 October 2026';
const MAX_MIN = MAX_DURATION_SEC / 60;
const WARN_MIN = WARN_DURATION_SEC / 60;

const site = {
  id: 'mp3-to-mp4',
  inputNoun: 'files',
  name: 'MP3 to MP4 Converter',
  url: `${config.domain}/mp3-to-mp4`,
  contact: config.contact,
  parent: config.parent,
  operator: config.parent,
  tagline: 'Turn an audio file and a picture into a video, right in your browser.',
  privacySummary: 'The audio and pictures you choose stay on your device. The video is made inside your web browser and nothing you choose is sent to us or anyone else. The site shows ads and uses privacy-friendly visitor statistics, explained below.',
  // Ads and analytics stay OFF until the owner fills these in (see README). No ids are kept in this file.
  ads: { client: '', slots: { 'below-tool': '', mid: '', 'rail-left': '', 'rail-right': '' } },
  analytics: { cloudflareToken: '' },
  footnote: 'Files are processed on your device and never uploaded.',
  footnote2: 'MP4 and WebM are open file formats. This site is independent.',
  mark: '<rect x="3.5" y="5" width="17" height="14" rx="3.2"/><path d="M10.2 9.4v5.2l4.4-2.6z"/>',
  nav: [{ id: 'home', label: 'How it works', hash: '#how' }, { id: 'home', label: 'MP4 or WebM', hash: '#formats' }, { id: 'about', label: 'About' }],
  cta: (page) => page.tool,
  footerCols: [
    { title: 'Site', links: [{ id: 'about', label: 'About' }, { id: 'privacy', label: 'Privacy' }, { id: 'terms', label: 'Terms' }, { id: 'contact', label: 'Contact' }] },
  ],
};

/* ---------- page copy ---------- */
const COPY = {
  h1: 'MP3 to MP4 converter',
  lead: 'Turn an audio file and a picture into a video you can upload, share or keep. Choose the sound, add an image, press Convert and download the result. The video is made in your browser, so your files never leave your device.',
  trust: ['Files never uploaded', 'Made in your browser', 'Free, no sign-up'],
  how: [
    ['Choose your audio', `Drop in an MP3, M4A, WAV or OGG file, up to ${MAX_MIN} minutes long. Add a JPG, PNG or WebP picture if you like. Without one, the video shows a plain colour card with the file name.`],
    ['Set up the picture', 'Pick a video size, then choose whether the whole picture is shown on a background colour (Fit) or whether it fills the frame and gets cropped (Fill). The preview shows what the video will look like.'],
    ['Convert and download', 'Press Convert. A progress bar shows how far along it is and you can cancel at any time. When it finishes, download the file. If your browser can not make MP4, you get a WebM file instead, and the page tells you.'],
  ],
  formatsTitle: 'MP4 or WebM: which one do you get?',
  formats: [
    ['MP4', 'H.264 video with AAC audio. This is the combination most phones, editors, players and upload forms expect. You get it when your browser has built-in H.264 and AAC encoders, which is common in Chrome and Edge on many computers and in Safari.'],
    ['WebM', 'VP9 (or VP8) video with Opus audio. If your browser can not make MP4, the tool switches to WebM by itself. It plays in Chrome, Firefox, Edge and most desktop players, but some apps, and the Photos app on iPhones, need MP4.'],
  ],
  aboutTitle: 'A still picture with sound, made on your device',
  aboutParas: [
    'A video file is a container holding two streams: pictures and sound. The simplest kind of video is a single picture shown for as long as the sound plays. People make these for podcasts, songs, voice recordings, lectures and music demos, because many places accept a video upload but not a bare audio file.',
    'This tool does the whole job inside your browser. It decodes your audio, draws your picture once at the size you chose, and hands both to the video and audio encoders that your browser already contains. The result is packed into a standard MP4 or WebM file by code on this page. There is no server, no upload and no large download to wait for, and the conversion does not have to run in real time, so a long file does not take as long as it plays.',
    'The picture never changes, so the video track is stored as two frames a second with a complete new frame every few seconds. That keeps the file small: nearly all of its size is the audio. It also means there is no animation, waveform or captions. It is one picture and your sound.',
    `Your audio is re-encoded, not copied. An MP3 becomes AAC in an MP4 file, or Opus in a WebM file, at a generous bitrate so that little extra quality is lost. If you need the original audio bytes left untouched, use a desktop tool instead. Length is limited to ${MAX_MIN} minutes, because the browser has to hold the whole decoded sound in memory while it works. Above ${WARN_MIN} minutes the page warns you.`,
  ],
  tipsTitle: 'Tips for a good result',
  tips: [
    'Use a picture at least as large as the video size so it stays sharp.',
    'Choose Fit to keep the whole picture visible, or Fill to cover the frame and crop the edges.',
    'Use 1080 × 1920 for tall, phone-shaped video, 1080 × 1080 for square, and 1280 × 720 or 1920 × 1080 for landscape.',
    'Keep this tab open and in front while it converts. Long files need a computer more than a phone.',
  ],
  faq: [
    ['Are my files uploaded anywhere?', 'No. The audio and picture are read and converted by your browser, on your device. Nothing is sent to us or any other server, and nothing is kept after you close the page. The page itself shows ads and counts visits separately; the Privacy page explains how.'],
    ['Will I get an MP4 or a WebM file?', 'It depends on your browser. If it has built-in H.264 and AAC encoders you get an MP4. If not, the tool automatically makes a WebM file (VP9 or VP8 video with Opus audio) and tells you on the page. WebM plays in Chrome, Firefox, Edge and most desktop players, but some apps, and the Photos app on iPhones, need MP4. If you need MP4, try Chrome or Edge on a computer, or Safari on a recent Apple device.'],
    ['Why is the video just a still image?', 'The tool is made for sound with a picture, such as a song, podcast or voice message. Because the picture never changes, the file stores it as a few frames a second and stays small. The size is almost all audio. There are no waveforms, animations or captions.'],
    ['Does the audio lose quality?', 'The audio is decoded and encoded again, which is a second round of lossy compression for MP3 and similar files. The tool uses a generous bitrate (192 kbps AAC for MP4 and 160 kbps Opus for WebM, lower for mono) so the extra loss is small, but it is not a bit-for-bit copy. If you need the original audio untouched, use a desktop tool that can copy the audio stream.'],
    ['How long can the audio be?', `Up to ${MAX_MIN} minutes. The browser has to keep the fully decoded sound in memory while it works, about 23 MB per minute for stereo, so very long files can run out of memory, especially on phones. The page warns you above ${WARN_MIN} minutes and refuses anything longer than ${MAX_MIN} minutes. Files over 500 MB are also refused. For a longer recording, split it into parts.`],
    ['Why do some phones and apps want MP4?', 'MP4 with H.264 video and AAC audio has been supported in phone hardware, editing apps and upload forms for many years, so it is the safe choice. WebM is a newer, open format that many apps and phone gallery apps do not open. That is why the tool prefers MP4 whenever your browser can make it.'],
    ['Can I post the video to social apps?', 'Each app sets its own rules about file type, length, size and shape, and they change over time, so no converter can promise that a file will be accepted. As a general guide, MP4 with H.264 and AAC is the most widely accepted combination, and the size options cover the common landscape, square and portrait shapes. Check the current requirements in the app you are posting to. If an app rejects a WebM file, make the video in a browser that can produce MP4.'],
    ['Which audio files can I use?', 'Anything your browser can play: MP3, M4A and AAC, WAV and OGG are the usual ones. Support depends on the browser, so a rare format may fail with a message saying so. If that happens, convert the file to MP3 or WAV first.'],
    ['What if the conversion fails or the tab runs out of memory?', 'Close other tabs and try again, use a shorter file, or choose a smaller video size. If your browser has no video encoders at all, the page says so. You can cancel at any time, and nothing is saved until you press Download.'],
  ],
};

/* ---------- icons ---------- */
const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  audio: svg('<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>', 24),
  image: svg('<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.6" cy="10" r="1.7"/><path d="M4 17.5l5-4.7 3.6 3.2 2.6-2.3L20 17"/>', 24),
  video: svg('<rect x="3" y="5" width="18" height="14" rx="3.2"/><path d="M10.2 9.4v5.2l4.4-2.6z"/>', 20),
  down: svg('<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>', 18),
  shield: svg('<path d="M12 3l7 3v5.5c0 4.3-3 7.9-7 9.5-4-1.6-7-5.2-7-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>', 18),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>', 18),
  x: svg('<path d="M7 7l10 10M17 7L7 17"/>', 16),
};

/* ---------- tool markup ---------- */
const sizeOptions = SIZES.map((s, i) => `<label class="mp-size"><input type="radio" name="size" value="${s.id}"${i === 0 ? ' checked' : ''}><span><b class="num">${s.label.replace("×", "&times;")}</b><small>${s.note}</small></span></label>`).join('');

function toolHtml() {
  return `<section id="tool" class="tool mp-tool is-empty" data-tool aria-label="MP3 to MP4 converter">

  <div class="panel mp-input">
    <div class="mp-step"><span class="mp-num" aria-hidden="true">1</span><h2 class="mp-step-title">Choose your files</h2></div>

    <div class="mp-pick" data-pick="audio">
      <label class="drop mp-drop" for="mp-audio" data-drop="audio">
        <span class="mp-drop-icon">${I.audio}</span>
        <span class="mp-drop-title" data-audio-title>Choose an audio file</span>
        <span class="mp-drop-sub" data-audio-sub>MP3, M4A, WAV or OGG. Drop it here or tap to browse.</span>
      </label>
      <input class="mp-file" id="mp-audio" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac" data-audio-input>
      <p class="mp-err" data-audio-error role="alert" hidden></p>
    </div>

    <div class="mp-pick" data-pick="image">
      <div class="lbl-row"><span class="lbl" id="mp-img-lbl">Picture</span><span class="mp-opt">Optional</span></div>
      <label class="drop mp-drop mp-drop-sm" for="mp-image" data-drop="image">
        <span class="mp-drop-icon">${I.image}</span>
        <span class="mp-drop-title" data-image-title>Add a picture</span>
        <span class="mp-drop-sub" data-image-sub>JPG, PNG or WebP. Without one you get a plain colour card.</span>
      </label>
      <input class="mp-file" id="mp-image" type="file" accept="image/*,.jpg,.jpeg,.png,.webp" data-image-input aria-labelledby="mp-img-lbl">
      <button type="button" class="chip mp-clear" data-image-clear hidden>${I.x}Remove picture</button>
      <p class="mp-err" data-image-error role="alert" hidden></p>
    </div>
  </div>

  <div class="stage mp-stage" data-stage>
    <div class="mp-stage-in">
      <div class="mp-step mp-step-stage"><h2 class="mp-step-title">Your video</h2><span class="mp-live"><i aria-hidden="true"></i>Preview</span></div>
      <div class="mp-frame" data-frame><canvas class="mp-preview" data-preview width="640" height="360" role="img" aria-label="Preview of the video picture"></canvas></div>
      <dl class="mp-facts">
        <div><dt>Audio length</dt><dd class="num" data-f-length>–</dd></div>
        <div><dt>File type</dt><dd data-f-format>Checking&hellip;</dd></div>
        <div><dt>Estimated size</dt><dd class="num" data-f-size>–</dd></div>
      </dl>
      <p class="note note-info mp-note" data-format-note hidden>${I.info}<span data-format-note-text></span></p>
      <p class="note note-warn mp-note" data-warning hidden>${I.info}<span data-warning-text></span></p>
      <p class="note note-bad mp-note" data-error role="alert" hidden>${I.info}<span data-error-text></span></p>
      <div class="mp-progress" data-progress hidden>
        <div class="mp-bar" role="progressbar" aria-label="Conversion progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-bar><i style="width:0%"></i></div>
        <p class="mp-stage-text" data-stage-text aria-live="polite">Starting&hellip;</p>
      </div>
      <div class="mp-actions">
        <button type="button" class="btn btn-primary" data-convert disabled>${I.video}<span data-convert-label>Convert to video</span></button>
        <button type="button" class="btn btn-ghost" data-cancel hidden>Cancel</button>
      </div>
      <div class="mp-result" data-result hidden>
        <p class="note note-good">${I.shield}<span data-result-text></span></p>
        <a class="btn btn-success mp-download" data-download download>${I.down}<span data-download-label>Download video</span></a>
      </div>
      <p class="mp-status" data-status aria-live="polite">Choose an audio file to begin.</p>
    </div>
  </div>

  <form class="panel mp-look" data-look autocomplete="off" novalidate onsubmit="return false">
    <div class="mp-step"><span class="mp-num" aria-hidden="true">2</span><h2 class="mp-step-title">Video settings</h2></div>
    <div class="mp-f">
      <span class="lbl" id="mp-size-lbl">Size</span>
      <div class="mp-sizes" role="radiogroup" aria-labelledby="mp-size-lbl" data-sizes>${sizeOptions}</div>
    </div>
    <div class="mp-f">
      <span class="lbl" id="mp-fit-lbl">Picture fit</span>
      <div class="seg" data-seg style="--n:2;--i:0" role="radiogroup" aria-labelledby="mp-fit-lbl" aria-describedby="mp-fit-hint" data-fit>
        <label><input type="radio" name="fit" value="fit" checked><span>Fit (show all)</span></label>
        <label><input type="radio" name="fit" value="fill"><span>Fill (crop)</span></label>
      </div>
      <p class="hint" id="mp-fit-hint">Fit keeps the whole picture and fills the gaps with the background colour. Fill covers the frame and crops the edges.</p>
    </div>
    <div class="mp-f">
      <div class="lbl-row"><span class="lbl">Background colour</span></div>
      <div class="mp-color"><input type="color" id="mp-bg" value="#0e1124" data-bg aria-label="Pick background colour"><div class="mp-color-txt"><label for="mp-bg-hex">Colour</label><input id="mp-bg-hex" value="#0E1124" maxlength="7" spellcheck="false" autocapitalize="off" data-bg-hex></div></div>
      <p class="hint">Used behind a picture that does not fill the frame, and for the colour card when there is no picture.</p>
    </div>
    <p class="hint mp-audio-note">The audio is re-encoded (AAC for MP4, Opus for WebM), not copied. See the questions below.</p>
  </form>
</section>`;
}

/* ---------- content pieces ---------- */
const howCards = (steps) => `<ol class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">${steps.map(([t, d], i) => `<li class="card mp-how p-7"><span class="mp-num mp-num-lg" aria-hidden="true">${i + 1}</span><h3 class="mt-5 text-xl">${t}</h3><p class="mt-2 text-ink-2">${d}</p></li>`).join('')}</ol>`;
const formatCards = (items) => `<div class="mp-formats">${items.map(([t, d]) => `<article class="card mp-format"><span class="mp-kind">${t}</span><p class="text-ink-2">${d}</p></article>`).join('')}</div>`;

/* ---------- pages ---------- */
function home(ctx) {
  const body = `<main id="main">
${hero({ h1: COPY.h1, lead: COPY.lead, trustItems: COPY.trust, h1Class: 'max-w-[18ch] text-[44px] sm:text-6xl md:text-[76px]', after: toolHtml() })}
${adSlot(ctx, 'below-tool')}

<section id="how" class="wrap mt-32 scroll-mt-20">
  ${sectionHead('How it works', '', 'text-4xl md:text-5xl')}
  ${howCards(COPY.how)}
</section>

<section id="formats" class="wrap mt-32 scroll-mt-20">
  ${sectionHead(COPY.formatsTitle, '', 'text-4xl md:text-5xl')}
  ${formatCards(COPY.formats)}
</section>

<section class="wrap mt-32 grid gap-10 md:grid-cols-2">
  <div><h2 class="text-3xl md:text-4xl">${COPY.aboutTitle}</h2>${COPY.aboutParas.map((p) => `<p class="mt-5 text-lg text-ink-2">${p}</p>`).join('')}</div>
  <div class="card self-start p-7 md:p-8"><h3 class="text-xl">${COPY.tipsTitle}</h3><ul class="m-0 mt-5 grid list-none gap-4 p-0">${COPY.tips.map((t) => `<li class="flex gap-3 text-ink-2"><span class="mt-1 text-good">${ICON.check}</span><span>${t}</span></li>`).join('')}</ul></div>
</section>

${adSlot(ctx, 'mid')}
<section id="faq" class="wrap wrap-narrow mt-32 scroll-mt-20">
  ${sectionHead('Questions', '', 'text-4xl md:text-5xl')}
  ${faqHtml(COPY.faq)}
</section>
</main>`;
  return {
    title: 'MP3 to MP4 Converter: Audio and Image to Video, Free (No Upload)',
    desc: 'Turn an MP3 and a picture into a video file. Made in your browser, nothing uploaded. Makes MP4 where your browser can, WebM where it can not.',
    body, faq: COPY.faq, tool: { category: 'MultimediaApplication' }, scripts: ['assets/tool.js'],
  };
}

const pages = [
  { id: 'home', slug: '', tool: true, render: home },
  { id: 'about', slug: 'about', render: (ctx) => aboutPage(ctx, { html: `<p>${site.name} is a small, free tool that turns a piece of audio and a still picture into a video file. It was built because most online converters ask you to upload your recording to a server, wait in a queue and often add a watermark, just to put a picture behind some sound.</p>
<p>Here, your browser does the work. The page reads your audio, draws your picture, and uses the video and audio encoders already built into your browser. The encoded data is then packed into an MP4 file (H.264 video and AAC audio) or, when the browser has no such encoders, a WebM file (VP9 or VP8 video and Opus audio). The packing code was written for this site and is checked against independent media software.</p>
<p>The video is always a still picture with your sound. There is no animation, no watermark and no sign-up. Because the files are made on your device, nothing you choose is uploaded, and the speed depends on your computer or phone.</p>
<p>${site.name} is made by ${site.operator}, in Brisbane, Australia. The site is paid for by advertising. If you find a problem or have an idea, use the Contact page.</p>` }) },
  { id: 'privacy', slug: 'privacy', render: (ctx) => privacyPage(ctx, { updated: UPDATED, dataTitle: 'The audio and pictures you choose', dataHtml: '<p>The audio and picture files you choose are read and converted inside your web browser. They are not sent to a server, not stored on one and not shared with anyone. Nothing is saved in cookies or in your browser after you leave the page.</p><p>The finished video is created in your browser&rsquo;s memory and saved to your downloads folder only when you press Download. It does not pass through us.</p>' }) },
  { id: 'terms', slug: 'terms', render: (ctx) => termsPage(ctx, { updated: UPDATED, whatItIs: `${site.name} is a free tool for turning audio and a still picture into a video file in your browser.`, ownershipHtml: '<p>You own your files and the videos you make. We claim no rights over them.</p>', processingHtml: '<p>Videos are made on your device, in your browser. We do not receive, keep or look at your audio, your pictures or the result.</p>', responsibilityHtml: '<p>You are responsible for having the right to use the audio and pictures you convert, including any copyright in them, and for what you do with the video. We can not promise that a file will play on every device or be accepted by every app or website, because each sets its own rules. Check the result before you rely on it. Conversion needs memory and processing power from your device, and very long files may fail.</p>' }) },
  { id: 'contact', slug: 'contact', render: (ctx) => contactPage(ctx, { lead: 'Found a bug, or a file that will not convert? Email us and say which browser you used.' }) },
];

export default {
  site, pages,
  copy: [['src/tool.js', 'assets/tool.js'], ['src/encode.mjs', 'assets/encode.mjs'], ['src/mp4.mjs', 'assets/mp4.mjs'], ['src/webm.mjs', 'assets/webm.mjs'], ['src/boxes.mjs', 'assets/boxes.mjs'], ['src/plan.mjs', 'assets/plan.mjs'], ['src/frame.mjs', 'assets/frame.mjs']],
};
