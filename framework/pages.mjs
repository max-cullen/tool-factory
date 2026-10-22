// Standard text pages every tool site needs. Each tool passes in only what is specific to it.
// These are drafts: the owner has them reviewed before launch. A yellow "draft" note shows in preview builds.
import { esc, textPage } from './lib.mjs';

const draftNote = (ctx) => (ctx.preview ? '<p class="note note-warn mb-8">Draft for review. Have this text checked before launch.</p>' : '');

/**
 * @param {object} o
 *   updated:  'D Month YYYY'
 *   dataTitle, dataHtml:  what happens to the visitor's own input (files, text) in this tool
 */
export function privacyPage(ctx, { updated, dataTitle, dataHtml }) {
  const { site } = ctx;
  // What the tool takes in. Optional site.inputNoun (e.g. 'text'); the default keeps the photo tools' pages unchanged.
  const noun = site.inputNoun || 'photos';
  const be = noun.endsWith('s') ? 'are' : 'is';
  const notGiven = noun === 'photos' ? 'your photos, or anything you type into the tool,' : `anything you enter into the tool, including your ${noun},`;
  const html = `${draftNote(ctx)}
<h2>The short version</h2>
<p>${site.privacySummary}</p>
<h2>${dataTitle}</h2>
${dataHtml}
<h2>Visitor statistics</h2>
<p>We use Cloudflare Web Analytics to count visits and see which pages are used. It is configured without cookies and does not track you across other sites. It records information such as the page viewed, the referring site, and your browser, device type and country, in aggregate.</p>
<h2>Advertising</h2>
<p>${site.name} is free because it shows ads served by Google AdSense. To show and measure ads, Google and its advertising partners may collect information such as your IP address, device and browser details, the pages you view and how you interact with ads, and may store or read cookies and similar identifiers on your device. If you agree, this is also used to personalise ads based on your visits to this and other sites.</p>
<p>We do not give ${notGiven} to Google or any advertiser. Ads load separately from the tool.</p>
<p>You can learn how Google uses information from sites that use its services at <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>, and manage or turn off personalised ads at <a href="https://adssettings.google.com">adssettings.google.com</a>. If you are in the European Economic Area, the United Kingdom or Switzerland, you are asked for consent before ads that use cookies or similar technologies are shown, and you can change your choice at any time using the privacy settings link on the page.</p>
<h2>How long information is kept</h2>
<ul>
<li><strong>Your ${noun} and results:</strong> held only in your browser's memory while the page is open. They are gone when you close or reload it. We never receive a copy.</li>
<li><strong>Hosting logs:</strong> our hosting provider keeps standard technical logs (such as IP address, page requested and time) for a limited period to run and secure the service.</li>
<li><strong>Visitor statistics:</strong> kept in aggregate form by Cloudflare. They are not linked to your ${noun}.</li>
<li><strong>Advertising data:</strong> controlled by Google under its own policies.</li>
<li><strong>Emails to us:</strong> kept for as long as needed to reply and keep a record, then deleted.</li>
</ul>
<h2>Where information is processed</h2>
<p>The site is delivered through Cloudflare's global network, and ads are served by Google. Their services process information in several countries, including the United States and other countries outside Australia and your own. Your ${noun} ${be} not part of this: ${noun === 'photos' ? 'they stay' : 'it stays'} on your device.</p>
<h2>Your rights, requests and complaints</h2>
<p>You can ask us what personal information we hold about you, ask us to correct or delete it, or ask a question about this policy by emailing <strong>${esc(site.contact)}</strong>. We aim to reply within 30 days. Because we do not receive your ${noun} and do not run accounts, the only personal information we are likely to hold is an email you send us.</p>
<p>If you are not happy with our response, you can complain to the privacy regulator in your country. In Australia that is the Office of the Australian Information Commissioner (<a href="https://www.oaic.gov.au">oaic.gov.au</a>); in the United Kingdom, the Information Commissioner's Office; in the EU, your local data protection authority.</p>
<h2>Children</h2>
<p>${site.name} is a general-audience tool and is not directed at children under 13. We do not knowingly collect personal information from children.</p>
<h2>Changes</h2>
<p>If this policy changes, we will update this page and the date above.</p>`;
  return { title: `Privacy Policy | ${site.name}`, desc: `How ${site.name} handles your data, analytics and ads.`, body: textPage({ h1: 'Privacy policy', updated, html }) };
}

/**
 * @param {object} o
 *   updated, whatItIs (one sentence), responsibilityHtml (what the visitor must check themselves), noAdvice (optional disclaimer paragraph)
 */
export function termsPage(ctx, { updated, whatItIs, responsibilityHtml, noAdvice = '', ownershipHtml, processingHtml }) {
  const { site } = ctx;
  const html = `${draftNote(ctx)}
<h2>Who we are</h2>
<p>${site.name} is operated by <strong>${esc(site.operator || 'TODO: operator name')}</strong>, based in Queensland, Australia. You can contact us at <strong>${esc(site.contact)}</strong>${site.address ? ` or by post at ${esc(site.address)}` : ''}.</p>
<h2>Using ${site.name}</h2>
<p>${whatItIs} By using the site you agree to these terms. If you do not agree, please do not use it.</p>
<h2>Your content</h2>
${ownershipHtml}
${processingHtml}
<h2>Your responsibility</h2>
${responsibilityHtml}
${noAdvice ? `<h2>Not advice</h2><p>${noAdvice}</p>` : ''}
<h2>Availability and changes to the service</h2>
<p>${site.name} is a free service. We may change, pause or stop any part of it, or the whole site, at any time, and we may be unable to provide it when things go wrong, for example during maintenance, outages or problems with our hosting provider. We do not promise it will always be available or error-free, so keep a copy of your original files.</p>
<h2>Warranties and your legal rights</h2>
<p>Our services come with guarantees that cannot be excluded under the Australian Consumer Law and other laws that apply to you. Nothing in these terms limits those rights. Subject to those rights, the site is provided "as is" and "as available", and we do not make other promises about its results, accuracy or suitability for a particular purpose, including that a result will be accepted by any form or service.</p>
<h2>Limits on our liability</h2>
<p>Subject to the rights above, and to the extent the law allows, we are not liable for indirect or consequential loss, or for loss such as a rejected application, a missed deadline, lost opportunity or lost or damaged files, arising from your use of, or inability to use, the site. Where a law implies a guarantee we are not allowed to exclude, our liability for breaking it is limited, where the law allows, to supplying the service again or paying the cost of having it supplied again.</p>
<h2>Acceptable use</h2>
<p>Do not use the site to break the law, to process content you are not allowed to use, to try to disrupt or gain unauthorised access to it, or to copy or republish it as your own.</p>
<h2>Our content and software</h2>
<p>The site's design, text and code belong to us or our licensors. Open-source components remain under their own licences, listed on the About page.</p>
<h2>Third-party services</h2>
<p>The site shows ads from Google AdSense and uses Cloudflare for hosting and statistics. Their own terms and privacy policies apply to their services, and we are not responsible for them.</p>
<h2>Changes to these terms and governing law</h2>
<p>We may update these terms by changing this page and its date. Using the site after a change means you accept the updated terms. These terms are governed by the laws of Queensland, Australia, and the courts of Queensland have non-exclusive jurisdiction.</p>
<h2>Contact</h2>
<p>Email <strong>${esc(site.contact)}</strong>.</p>`;
  return { title: `Terms of Use | ${site.name}`, desc: `The terms for using ${site.name}.`, body: textPage({ h1: 'Terms of use', updated, html }) };
}

export function contactPage(ctx, { lead, extraHtml = '' }) {
  const { site } = ctx;
  const html = `${draftNote(ctx)}
<p>${lead}</p>
<p class="mt-6 text-2xl font-semibold text-ink"><span class="select-all">${esc(site.contact)}</span></p>
${extraHtml}`;
  return { title: `Contact | ${site.name}`, desc: `How to contact ${site.name}.`, body: textPage({ h1: 'Contact', html }) };
}

export function aboutPage(ctx, { html }) {
  const { site } = ctx;
  return { title: `About | ${site.name}`, desc: `What ${site.name} is and how it works.`, body: textPage({ h1: `About ${site.name}`, html: draftNote(ctx) + html }) };
}
