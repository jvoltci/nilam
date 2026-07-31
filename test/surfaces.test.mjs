/* nilam — the surface audit.
 *
 * WHY THIS FILE EXISTS, AND WHY THE PROVER COULD NOT DO IT.
 *
 * The prover checks the palette: step 7 clears 3:1 on step 3, body text clears 4.5:1 on a
 * card, and so on. Every one of those was green while the SHIPPED CSS painted surfaces the
 * palette never promised anything about. Eight of them:
 *
 *   .n-menu-item:focus-visible  cancelled the global --brand-9 ring (4.9408:1 on a card in
 *                               dark) and replaced it with a --neutral-3 tint at 1.0009:1.
 *                               Keyboard focus in a menu was invisible in dark. WCAG 2.4.7.
 *   .n-slider-thumb:focus-vis.  same cancellation, --brand-6 halo at 1.3235:1 in dark, and
 *                               nothing else about the thumb changed on focus.
 *   .n-slider-track             no boundary at all, while .n-progress, .n-bar and .n-meter
 *                               all carry --neutral-7. 1.0844:1 on a card in dark, so the
 *                               UNFILLED extent of a slider could not be seen.
 *   .n-table tr:hover td        --neutral-2 at 1.0550:1 against the page in LIGHT.
 *   .n-summary:hover            the same, 1.0550:1 in light.
 *   .n-menu-item:hover          --neutral-3 at 1.0009:1, and .n-pop is --surface by
 *                               definition so it is never not on a card.
 *   .n-option:hover             the same, inside .n-listbox.
 *   .n-avatar                   --brand-3 at 1.0013:1, no edge, so the disc vanished.
 *
 * The palette was never wrong. The CSS was reaching for adjacent ramp steps as if a card
 * were the page, and in dark mode --surface IS step 3's lightness with the tint removed —
 * so "one step up from the page" lands exactly on top of the card.
 *
 * THE PREMISE HERE IS DELIBERATELY NOT THE CSS'S OWN.
 *
 * Every painted surface must be CLASSIFIED in the table below, and an unclassified surface
 * is a FAILURE, not a pass. That is the whole design. A test that only checked the pairs it
 * already knew about would be a mirror of the stylesheet: it would have gone green on all
 * eight of the defects above, because each one looked locally reasonable. Forcing a new
 * component to declare what it sits on is what makes this an audit.
 *
 * An assertion that shares its premise with the thing it audits is not an audit.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { solveScale } from '../src/solve.mjs';
import { contrast } from '../src/colour.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let count = 0;
const failures = [];
const ok = (cond, msg) => { count++; if (!cond) failures.push(msg); };

/* ── the classification ──────────────────────────────────────────────────
 *
 * container: where the surface actually sits.
 *   'page'    only ever directly on --neutral-1
 *   'card'    only ever on --surface (.n-pop and .n-listbox ARE --surface, so their
 *             children are always in this case, not conditionally)
 *   'both'    an author may put it on either, so it must satisfy the worse one
 *   'nested'  it sits on another component's fill, so page/card is the wrong question;
 *             `on` names the token underneath it
 *
 * role: what the surface has to achieve.
 *   'ident'   identification or state, governed by WCAG 1.4.11 -> 3:1. If `via` names a
 *             token, THAT is what has to reach 3:1 and the fill is free: an inset
 *             --brand-9 bar at 4.9408:1 satisfies the clause whatever the fill does.
 *   'state'   pointer affordance, which 1.4.11 does not govern -> must beat the 1.1072:1
 *             ceiling that any fill hits in dark, so it needs `via`
 *   'bounded' the fill is decorative because a >=3:1 boundary carries the extent; `via`
 *             names it
 *   'solid'   a brand or status solid, 3:1 as an object
 *   'decor'   decoration, which 1.4.11 exempts in as many words. A hairline rule between
 *             two things is not a component and has no state to read; asserting 3:1 on it
 *             would force every divider in the system to look like a control border.
 *             --neutral-6 is already floored at 1.4:1 against the page by the prover.
 *   'scrim'   a translucent overlay. Its job is to suppress what is behind it, so a
 *             contrast floor against that thing is the wrong instrument entirely.
 *   'self'    it IS the page or the card
 */
const SURFACES = [
  // buttons — .n-btn owns a --neutral-7 border, so extent is never the fill's job
  ['.n-btn:hover',                   'neutral-3',  'both',   'state',   'neutral-8 border'],
  ['.n-btn:active',                  'neutral-4',  'both',   'state',   'neutral-8 border'],
  ['.n-btn[aria-disabled]',          'neutral-2',  'both',   'bounded', 'neutral-6 border'],
  ['.n-btn-fill',                    'brand-9',    'both',   'solid',   null],
  ['.n-btn-fill:hover',              'brand-10',   'both',   'solid',   null],
  ['.n-btn-ink',                     'neutral-12', 'both',   'solid',   null],
  ['.n-btn-ink:hover',               'neutral-11', 'both',   'solid',   null],
  ['.n-btn-ghost:hover',             'neutral-3',  'both',   'state',   'neutral-6 ring'],
  ['.n-btn-danger',                  'danger-9',   'both',   'solid',   null],
  ['.n-btn-danger:hover',            'danger-10',  'both',   'solid',   null],
  ['.n-btn-ok',                      'ok-9',       'both',   'solid',   null],
  ['.n-btn-ok:hover',                'ok-10',      'both',   'solid',   null],
  ['.n-btn-warn',                    'warn-9',     'both',   'solid',   null],
  ['.n-btn-warn:hover',              'warn-10',    'both',   'solid',   null],

  // tracks. ALL FOUR carry --neutral-7 now; .n-slider-track was the one that did not.
  ['.n-progress',                    'neutral-4',  'both',   'bounded', 'neutral-7 border'],
  ['.n-progress-bar',                'neutral-4',  'both',   'bounded', 'neutral-7 border'],
  ['.n-progress-value',              'brand-9',    'nested', 'solid',   'neutral-4'],
  ['.n-bar',                         'neutral-4',  'both',   'bounded', 'neutral-7 border'],
  ['.n-bar::after',                  'brand-9',    'nested', 'solid',   'neutral-4'],
  ['.n-meter',                       'neutral-4',  'both',   'bounded', 'neutral-7 border'],
  ['.n-meter-fill',                  'brand-9',    'nested', 'solid',   'neutral-4'],
  ['.n-meter-ok-fill',               'ok-10',      'nested', 'solid',   'neutral-4'],
  ['.n-meter-warn-fill',             'warn-10',    'nested', 'solid',   'neutral-4'],
  ['.n-meter-danger-fill',           'danger-9',   'nested', 'solid',   'neutral-4'],
  ['.n-slider-track',                'void',       'both',   'bounded', 'neutral-7 border'],
  ['.n-slider-fill',                 'brand-9',    'nested', 'solid',   'void'],
  ['.n-slider-disabled-fill',        'neutral-7',  'nested', 'bounded', 'void'],
  ['.n-dots-i',                      'neutral-11', 'both',   'solid',   null],

  // form controls
  ['.n-select',                      'neutral-1',  'both',   'bounded', 'neutral-7 border'],
  ['.n-check',                       'neutral-1',  'both',   'bounded', 'neutral-7 border'],
  ['.n-check-mark',                  'brand-ink',  'nested', 'ident',   'brand-9'],
  ['.n-radio-mark',                  'brand-ink',  'nested', 'ident',   'brand-9'],
  ['.n-check-checked',               'brand-9',    'both',   'solid',   null],
  ['.n-check-indeterminate',         'brand-9',    'both',   'solid',   null],
  ['.n-switch',                      'neutral-6',  'both',   'ident',   'neutral-7 border'],
  /* The knob is a THIRD channel, not the state. Off vs on is carried by the track colour
     (--neutral-6 to --brand-9, 1.5500:1 to 4.3107:1 against the page) and by the knob's
     position; the knob's own 1.5500:1 against its unchecked track is redundancy. */
  ['.n-switch-knob',                 'neutral-1',  'nested', 'decor',   'track colour + position'],
  ['.n-switch-checked',              'brand-9',    'both',   'solid',   null],

  // containers and chips — each has a --neutral-6 edge, so the fill is decorative
  ['.n-card',                        'surface',    'page',   'self',    null],
  ['.n-dialog',                      'surface',    'page',   'self',    null],
  ['.n-pop',                         'surface',    'page',   'self',    null],
  ['.n-listbox',                     'surface',    'page',   'self',    null],
  ['.n-badge',                       'neutral-3',  'both',   'bounded', 'neutral-6 border'],
  ['.n-badge-brand',                 'brand-3',    'both',   'bounded', 'neutral-6 border'],
  ['.n-badge-ok',                    'ok-3',       'both',   'bounded', 'neutral-6 border'],
  ['.n-badge-warn',                  'warn-3',     'both',   'bounded', 'neutral-6 border'],
  ['.n-badge-danger',                'danger-3',   'both',   'bounded', 'neutral-6 border'],
  ['.n-badge-info',                  'info-3',     'both',   'bounded', 'neutral-6 border'],
  ['.n-badge-glyph-brand',           'brand-9',    'nested', 'solid',   'brand-3'],
  ['.n-badge-glyph-ok',              'ok-9',       'nested', 'solid',   'ok-3'],
  ['.n-badge-glyph-warn',            'warn-9',     'nested', 'solid',   'warn-3'],
  ['.n-badge-glyph-danger',          'danger-9',   'nested', 'solid',   'danger-3'],
  ['.n-badge-glyph-info',            'info-9',     'nested', 'solid',   'info-3'],
  ['.n-note',                        'neutral-2',  'both',   'bounded', 'neutral-6 border'],
  ['.n-note-ok',                     'ok-2',       'both',   'bounded', 'neutral-6 border'],
  ['.n-note-warn',                   'warn-2',     'both',   'bounded', 'neutral-6 border'],
  ['.n-note-danger',                 'danger-2',   'both',   'bounded', 'neutral-6 border'],
  ['.n-note-info',                   'info-2',     'both',   'bounded', 'neutral-6 border'],
  ['.n-note-glyph-ok',               'ok-9',       'nested', 'solid',   'ok-2'],
  ['.n-note-glyph-warn',             'warn-9',     'nested', 'solid',   'warn-2'],
  ['.n-note-glyph-danger',           'danger-9',   'nested', 'solid',   'danger-2'],
  ['.n-note-glyph-info',             'info-9',     'nested', 'solid',   'info-2'],
  ['.n-avatar',                      'brand-3',    'both',   'state',   'brand-6 border'],
  ['.n-divider',                     'neutral-6',  'both',   'decor',   null],
  ['.n-menu-sep',                    'neutral-6',  'card',   'decor',   null],
  ['.n-tip',                         'neutral-12', 'both',   'solid',   null],
  ['.n-skip',                        'brand-9',    'both',   'solid',   null],
  ['.n-dialog::backdrop',            'scrim',      'page',   'scrim',   null],

  // the eight that were wrong. Every one of these rows carries a `via`, because the sweep
  // proved a fill alone cannot clear the dark-mode ceiling.
  ['.n-table-row-hover',             'neutral-3',  'both',   'state',   'neutral-6 top rule'],
  ['.n-summary:hover',               'neutral-3',  'both',   'state',   'neutral-6 accordion rules'],
  ['.n-menu-item:hover',             'neutral-3',  'card',   'state',   'neutral-6 ring'],
  ['.n-menu-item-danger:hover',      'danger-3',   'card',   'state',   'danger-6 ring'],
  ['.n-option:hover',                'neutral-3',  'card',   'state',   'neutral-6 ring'],
  ['.n-option-current',              'neutral-4',  'card',   'ident',   'brand-9 inset bar'],
  /* 'bounded', not 'ident'. The fill is --surface on a --void track, which is 1.3492:1 in
     light and 1.2708:1 in dark — nowhere near 3:1. What makes the thumb findable is its
     --line-2 --brand-9 border: 3.3876:1 on the track in light, 6.2785:1 in dark. The fill
     is deliberately the card's own colour so the thumb does not read as a hole. */
  ['.n-slider-thumb',                'surface',    'nested', 'bounded', 'brand-9 border'],
  ['.n-slider-thumb-disabled',       'neutral-3',  'nested', 'bounded', 'neutral-7 border'],

  // prose, kbd
  ['.n-prose-code',                  'neutral-3',  'both',   'bounded', 'neutral-6 border'],
  ['.n-prose-pre',                   'neutral-2',  'both',   'bounded', 'neutral-6 border'],
  ['.n-kbd',                         'neutral-3',  'both',   'bounded', 'neutral-7 border'],
];

/* ── the floors ──────────────────────────────────────────────────────────
 *
 * 'ident' 3:1 is WCAG 1.4.11 and not negotiable.
 * 'solid' 3:1, same clause: it is an object you must be able to find.
 * 'state' has NO fill floor, because there is none to have — see the ceiling below. What
 *         it must have is a named second channel, and that is asserted structurally.
 * 'bounded' likewise: the boundary is the contract, not the fill.
 */
const FLOOR = { ident: 3.0, solid: 3.0 };

/* The measured ceiling, recorded so that nobody solves for a fill again.
 *
 * Sweeping all 2001 lightnesses in dark: the best min(vs page, vs card) achievable by any
 * fill that still keeps body text at 4.5:1 is 1.1072:1, and the optimum is pure black.
 * Near the page Y = L^3 is tiny and WCAG's +0.05 flare term dominates, so the room is not
 * there at any hue. In light the mirror figure is 1.0593:1 for pure white on the page. */
const DARK_FILL_CEILING = 1.1072;

const scales = {
  light: solveScale(285, 'light', { neutral: true }),
  dark: solveScale(285, 'dark', { neutral: true }),
};
const families = ['neutral', 'brand', 'danger', 'warn', 'ok', 'info'];
const byFamily = {};
for (const mode of ['light', 'dark']) {
  byFamily[mode] = {};
  for (const f of families) byFamily[mode][f] = solveScale(285, mode, { neutral: f === 'neutral' });
}

/** Resolve a token name like 'brand-3' / 'surface' / 'void' / 'brand-ink' to an OKLCH triple. */
function tok(name, mode) {
  if (name === 'surface') return scales[mode].surface;
  // --scrim is the only token here with alpha. It has role 'scrim' and no floor, so it is
  // never measured; returning the page keeps the resolver total rather than throwing.
  if (name === 'scrim') return scales[mode][1];
  if (name === 'void') return mode === 'light' ? { L: 0.9, C: 0.007, h: 285 } : { L: 0.1, C: 0.007, h: 285 };
  const m = name.match(/^([a-z]+)-(\d+|ink)$/);
  if (!m) throw new Error(`unclassifiable token: ${name}`);
  const [, family, step] = m;
  const s = byFamily[mode][family];
  if (!s) throw new Error(`unknown family: ${family}`);
  if (step === 'ink') return s.ink ?? s[1];
  return s[+step];
}

/* ── 1. completeness: every background in the shipped CSS is classified ──── */

const rawCss = ['nilam.components.css', 'nilam.widgets.css']
  .map((f) => readFileSync(join(root, f), 'utf8'))
  .join('\n');

/* Comments stripped FIRST, and not as tidiness. The focus-ring check below matches a rule
 * by scanning from a `.` to the next `}`, and these files carry long comments containing
 * both `.` and measured ratios like 1.3235 — so a match could start mid-sentence, take a
 * selector of prose, and shift its own boundaries when an unrelated comment was edited. It
 * did: reverting one fix made a DIFFERENT component appear to fail. A check whose result
 * depends on the wording of a comment is not measuring the stylesheet. */
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');

const painted = new Set();
for (const m of css.matchAll(/background(?:-color)?:\s*var\(--([a-z0-9-]+)\)/g)) painted.add(m[1]);
const classified = new Set(SURFACES.map(([, t]) => t));

for (const t of painted) {
  ok(
    classified.has(t),
    `--${t} is painted as a background in the shipped CSS and is not classified in ` +
      `test/surfaces.test.mjs. Add a row saying what it sits on and what carries its ` +
      `extent. An unclassified surface is how all eight of the defects in this file's ` +
      `header shipped: each one looked locally reasonable.`,
  );
}

/* ── 2. every 'state' and 'bounded' surface names a second channel ───────── */

for (const [sel, token, container, role, via] of SURFACES) {
  if (role !== 'state' && role !== 'bounded') continue;
  ok(
    typeof via === 'string' && via.length > 0,
    `${sel} paints --${token} with role '${role}' and names no second channel. In dark no ` +
      `fill can exceed ${DARK_FILL_CEILING}:1 against both the page and a card while body ` +
      `text stays at 4.5:1, so a fill on its own cannot carry this.`,
  );
}

/* ── 3. the measured floors, in both modes ───────────────────────────────── */

for (const mode of ['light', 'dark']) {
  const page = scales[mode][1];
  const card = scales[mode].surface;

  for (const [sel, token, container, role, via] of SURFACES) {
    if (role === 'self') continue;
    const fill = tok(token, mode);

    const floor = FLOOR[role];
    // 'state', 'bounded', 'decor' and 'scrim' are checked structurally, not by ratio, so
    // resolve the ground only for the roles that actually have a floor — a 'decor' row is
    // allowed to describe its channel in prose ("track colour + position") rather than
    // name a token.
    if (floor === undefined) continue;

    // What is actually underneath it.
    const grounds =
      container === 'page' ? [['page', page]]
      : container === 'card' ? [['card', card]]
      : container === 'nested' ? [[`--${via}`, tok(String(via).split(' ')[0], mode)]]
      : [['page', page], ['card', card]];

    /* A named `via` is the channel under test, not the fill. .n-option[data-current] paints
     * --neutral-4 at 1.0844:1 on a card and carries an inset --brand-9 bar at 4.9408:1; the
     * clause is satisfied by the bar. Measuring the fill there would report a failure that
     * is not one — and it would push someone to "fix" it with a darker fill, which the
     * ceiling proves cannot work. */
    /* Only when the row is NOT nested. For a nested row `via` names what is UNDERNEATH
     * (the checkmark sits on --brand-9), so substituting it as the channel would compare
     * --brand-9 with itself and report 1.0000:1 — which is what it did on the first run. */
    const viaToken = role === 'ident' && via && container !== 'nested' ? String(via).split(' ')[0] : null;
    const measured = viaToken ? tok(viaToken, mode) : fill;
    const what = viaToken ? `--${viaToken} (the channel it names)` : `--${token}`;

    for (const [where, ground] of grounds) {
      const r = contrast(measured, ground);
      ok(
        r >= floor - 1e-9,
        `${mode}: ${sel} carries ${what} on ${where} at ${r.toFixed(4)}:1, needs ${floor} ` +
          `(role '${role}', WCAG 1.4.11)`,
      );
    }
  }
}

/* ── 4. the ceiling itself, so the claim in the comments stays true ─────── */

{
  const s = scales.dark;
  const page = s[1], card = s.surface;
  let best = 0, bestL = 0;
  for (let L = 0; L <= 1.0001; L += 0.0005) {
    const c = { L, C: 0, h: 285 };
    if (contrast(s[11], c) < 4.5) continue;            // must keep 1.4.3
    const worst = Math.min(contrast(c, page), contrast(c, card));
    if (worst > best) { best = worst; bestL = L; }
  }
  ok(
    Math.abs(best - DARK_FILL_CEILING) < 0.002,
    `the dark-mode fill ceiling measured ${best.toFixed(4)}:1 at L ${bestL.toFixed(4)}, but ` +
      `this file and four CSS comments state ${DARK_FILL_CEILING}:1. One of them is now wrong.`,
  );
  ok(
    best < 1.25,
    `a fill now reaches ${best.toFixed(4)}:1 against both the page and a card in dark. If that ` +
      `is real, the rings added in 0.6.0 could be replaced by fills and this file's reasoning ` +
      `needs revisiting.`,
  );
}

/* ── 5. the four track components agree with each other ─────────────────── */

{
  // The slider track was missed when the other three got their boundary. Assert the set,
  // not each one, so a fifth track cannot be added without a boundary either.
  const tracks = ['.n-progress', '.n-bar', '.n-meter', '.n-slider-track'];
  for (const t of tracks) {
    const row = SURFACES.find(([sel]) => sel === t);
    ok(row !== undefined, `${t} is not classified`);
    if (!row) continue;
    ok(
      row[3] === 'bounded' && /neutral-7/.test(String(row[4])),
      `${t} does not carry a --neutral-7 boundary. Three of these four had one and the ` +
        `fourth did not, which is how a slider shipped with an invisible unfilled extent.`,
    );
  }
  // And the CSS really does declare it, not just this table.
  for (const cls of ['n-progress', 'n-bar', 'n-meter', 'n-slider-track']) {
    const block = css.match(new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`));
    ok(block !== null, `could not find the .${cls} rule in the shipped CSS`);
    if (block) {
      ok(
        /border:[^;]*var\(--neutral-7\)/.test(block[0]),
        `.${cls} does not declare a --neutral-7 border in the shipped CSS, though ` +
          `test/surfaces.test.mjs claims it does`,
      );
    }
  }
}

/* ── 6. no rule cancels the focus ring without replacing it at 3:1 ──────── */

{
  /* .n-menu-item:focus-visible did exactly this: `outline: none` with only a --neutral-3
   * tint left, which is 1.0009:1 on a card in dark. The global ring it discarded is
   * --brand-9 at 4.9408:1. Any rule that sets `outline: none` must therefore name a
   * replacement that reaches 3:1, and --brand-6 (1.3235:1 in dark) does not. */
  const rules = css.match(/\.[^{}]*\{[^}]*outline:\s*none[^}]*\}/g) ?? [];
  for (const rule of rules) {
    const sel = rule.slice(0, rule.indexOf('{')).trim().replace(/\s+/g, ' ');
    if (!/:focus/.test(sel)) continue;               // :focus reset in base.css is fine
    const replacement = rule.match(/var\(--(brand-9|brand-10|neutral-12|danger-9)\)/);
    ok(
      replacement !== null,
      `${sel} cancels the focus ring and does not name a >=3:1 replacement. --brand-6 is ` +
        `1.3235:1 on a card in dark and is not a focus indicator (WCAG 2.4.7).`,
    );
  }
  ok(rules.length > 0, 'found no `outline: none` rules at all, so this check proved nothing');
}

/* ── report ─────────────────────────────────────────────────────────────── */

if (failures.length) {
  console.error(`\nsurfaces: ${failures.length} of ${count} assertions FAILED\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`surfaces: ${count} assertions pass (${SURFACES.length} classified surfaces, ` +
  `${painted.size} painted tokens, dark fill ceiling ${DARK_FILL_CEILING}:1)`);
