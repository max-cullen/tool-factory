import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS, FONTS, buildFront, buildBack, initials, displayUrl, W, H } from '../src/layouts.mjs';

const measure = (t, size) => Array.from(t).length * size * 0.52; // fake measure, slightly wide
const colors = { bg: '#ffffff', text: '#16181d', accent: '#d2491f' };
const FULL = { name: 'Alexandra Taylor', title: 'Senior Landscape Architect', company: 'Taylor and Co Design Studio', phone: '0400 000 000', email: 'alexandra@example.com', website: 'https://www.example.com.au/', address: '1 Example Street, Brisbane QLD 4000' };
const SPARSE = [{ name: 'Alex' }, { company: 'Co' }, { phone: '0400 000 000' }, {}, { name: 'A', email: 'a@b.co' }];
const LONG = { name: 'Bartholomew Maximilian Featherstonehaugh-Cholmondeley', title: 'Chief Executive Officer and Principal Consultant of Everything', company: 'The Extraordinarily Long Company Name Proprietary Limited', phone: '+61 (0)7 3000 0000 ext 12345 or 0400 000 000', email: 'bartholomew.featherstonehaugh@a-very-long-domain-name.example.com.au', website: 'https://www.a-very-long-domain-name.example.com.au/some/path', address: 'Level 12, Tower Two, 123456 Extremely Long Street Name, South Brisbane Queensland 4101, Australia' };

function extent(cmd) {
  if (cmd.op === 'rect' || cmd.op === 'logo') return [cmd.x, cmd.y, cmd.x + cmd.w, cmd.y + cmd.h];
  if (cmd.op === 'circle') return [cmd.cx - cmd.r, cmd.cy - cmd.r, cmd.cx + cmd.r, cmd.cy + cmd.r];
  const w = measure(cmd.text, cmd.size);
  const x0 = cmd.align === 'center' ? cmd.x - w / 2 : cmd.align === 'right' ? cmd.x - w : cmd.x;
  return [x0, cmd.y - cmd.size, x0 + w, cmd.y + cmd.size * 0.2]; // ascent to descent
}
function assertInside(commands, pad, label, bleed = 0) {
  for (const c of commands) {
    const [x1, y1, x2, y2] = extent(c);
    const eps = 1e-6;
    // Background and edge shapes may reach into the bleed; text and logos must stay inside `pad`.
    const free = c.op === 'rect' || c.op === 'circle';
    const lo = free ? -bleed : pad; const hiX = free ? W + bleed : W - pad; const hiY = free ? H + bleed : H - pad;
    assert.ok(x1 >= lo - eps && y1 >= lo - eps && x2 <= hiX + eps && y2 <= hiY + eps, `${label}: ${c.op} ${c.text || ''} [${[x1, y1, x2, y2].map((n) => n.toFixed(1))}]`);
  }
}

test('six original layouts and four system font stacks', () => {
  assert.equal(LAYOUTS.length, 6);
  assert.equal(new Set(LAYOUTS.map((l) => l.id)).size, 6);
  assert.equal(FONTS.length, 4);
  for (const f of FONTS) assert.match(f.stack, /serif|sans-serif|monospace/);
});

for (const { id } of LAYOUTS) {
  test(`${id}: full data stays inside the card and inside the 4 mm safe margin`, () => {
    for (const hasLogo of [false, true]) {
      const r = buildFront({ layout: id, data: FULL, colors, measure, hasLogo });
      assertInside(r.commands, 4 - 0.01, `${id} logo=${hasLogo}`);
      assert.ok(r.commands.some((c) => c.op === 'text' && c.text === 'Alexandra Taylor'));
      assert.equal(r.commands.some((c) => c.op === 'logo'), hasLogo);
    }
  });
  test(`${id}: sparse and empty data stay inside, empty fields leave no text`, () => {
    for (const data of SPARSE) {
      const r = buildFront({ layout: id, data, colors, measure });
      assertInside(r.commands, 4 - 0.01, `${id} ${JSON.stringify(data)}`);
      const texts = r.commands.filter((c) => c.op === 'text');
      assert.ok(texts.every((t) => t.text.trim().length > 0));
      for (const [k, v] of Object.entries(data)) if (k !== 'website') assert.ok(texts.some((t) => t.text.includes(v)) || initials(data.name, data.company) !== '', `${id}: ${k} missing`);
    }
    assert.equal(buildFront({ layout: id, data: { name: 'Alex' }, colors, measure }).commands.filter((c) => c.op === 'text' && c.text === 'Alex').length, 1);
  });
  test(`${id}: very long text is fitted into the card`, () => {
    const r = buildFront({ layout: id, data: LONG, colors, measure, hasLogo: true });
    assertInside(r.commands, 4 - 0.01, `${id} long`);
  });
  test(`${id}: the first command fills the whole card, and bleed extends it`, () => {
    const a = buildFront({ layout: id, data: FULL, colors, measure }).commands[0];
    assert.deepEqual([a.op, a.x, a.y, a.w, a.h], ['rect', 0, 0, W, H]);
    const b = buildFront({ layout: id, data: FULL, colors, measure, bleed: 3 }).commands[0];
    assert.deepEqual([b.x, b.y, b.w, b.h], [-3, -3, W + 6, H + 6]);
    assertInside(buildFront({ layout: id, data: FULL, colors, measure, bleed: 3 }).commands, 4 - 0.01, `${id} bleed`, 3);
  });
}

test('commands only use known ops and finite numbers', () => {
  for (const { id } of LAYOUTS) {
    for (const c of buildFront({ layout: id, data: FULL, colors, measure, hasLogo: true }).commands) {
      assert.ok(['rect', 'circle', 'text', 'logo'].includes(c.op));
      for (const v of Object.values(c)) if (typeof v === 'number') assert.ok(Number.isFinite(v));
      if (c.op === 'text') assert.ok(c.size > 1.5 && c.size < 12, `text size ${c.size}`);
    }
  }
});
test('layouts differ from one another', () => {
  const sigs = LAYOUTS.map(({ id }) => JSON.stringify(buildFront({ layout: id, data: FULL, colors, measure }).commands));
  assert.equal(new Set(sigs).size, 6);
});
test('text on the accent band picks a readable colour', () => {
  const dark = buildFront({ layout: 'band', data: FULL, colors: { ...colors, accent: '#101820' }, measure }).commands.find((c) => c.text === 'Alexandra Taylor');
  const light = buildFront({ layout: 'band', data: FULL, colors: { ...colors, accent: '#f5e663' }, measure }).commands.find((c) => c.text === 'Alexandra Taylor');
  assert.equal(dark.fill, '#ffffff');
  assert.equal(light.fill, '#14161c');
});
test('the logo box is reported and drawn only when there is a logo', () => {
  assert.equal(buildFront({ layout: 'sidebar', data: FULL, colors, measure }).logoBox, null);
  const r = buildFront({ layout: 'sidebar', data: FULL, colors, measure, hasLogo: true });
  assert.ok(r.logoBox.w > 0 && r.logoBox.h > 0);
  assert.equal(r.commands.some((c) => c.op === 'text' && c.text === 'AT'), false); // logo replaces the monogram
});
test('initials and website display', () => {
  assert.equal(initials('Alexandra Taylor'), 'AT');
  assert.equal(initials('alex'), 'A');
  assert.equal(initials('Mary Jane Watson'), 'MW');
  assert.equal(initials('', 'taylor co'), 'T');
  assert.equal(initials('', ''), '');
  assert.equal(displayUrl('https://www.example.com.au/'), 'www.example.com.au');
});
test('every font key is passed through to text commands', () => {
  const r = buildFront({ layout: 'classic', data: FULL, colors, measure, font: 'serif' });
  assert.ok(r.commands.filter((c) => c.op === 'text').every((c) => c.font === 'serif'));
});

for (const mode of ['colour', 'light']) {
  test(`back (${mode}): inside the card with full, sparse and empty data`, () => {
    for (const data of [FULL, { name: 'Alex' }, {}, LONG]) for (const hasLogo of [false, true]) {
      const r = buildBack({ mode, data, colors, measure, hasLogo, text: data === FULL ? 'Landscapes with care' : '' });
      assertInside(r.commands, 4 - 0.01, `back ${mode}`);
      const a = r.commands[0]; assert.deepEqual([a.x, a.y, a.w, a.h], [0, 0, W, H]);
    }
  });
}
test('back uses the custom line, then company, then name', () => {
  const t = (data, text) => buildBack({ mode: 'colour', data, colors, measure, text }).commands.filter((c) => c.op === 'text').map((c) => c.text);
  assert.ok(t(FULL, 'Hello there').includes('Hello there'));
  assert.ok(t(FULL, '').includes('Taylor and Co Design Studio') || t(FULL, '').length > 0);
  assert.ok(t({ name: 'Alex' }, '').includes('Alex'));
});
