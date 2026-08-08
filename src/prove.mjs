/* nilam — the prover.
 *
 * A palette is a claim. This is what turns it into a fact.
 *
 * Every assertion here corresponds to a promise the role model makes, and the
 * failure message says what breaks in the product rather than which number moved.
 * If a scale cannot satisfy a contract, that is a finding about the hue — not
 * something to widen the threshold for.
 */

import {
  contrast, contrastIn, distance, inGamut, inGamutOf, simulate, fmt, toHex, CVD_TYPES,
} from './colour.mjs';
import { inkFor, solveLoaderRamp } from './solve.mjs';

const failures = [];
const notes = [];
let count = 0;
const check = (ok, msg) => { count++; if (!ok) failures.push(msg); return ok; };

/* ── 1. the role contracts ───────────────────────────────────────────────
 *
 * Grounded in WCAG 2.2, which is the operative standard (and now ISO/IEC
 * 40500:2025). 1.4.3 gives 4.5:1 for body text and 1.4.11 gives 3:1 for
 * non-text UI components — which is what makes step 7 a border you can find and
 * step 9 an object you can see, not just colours that look about right.
 */
const CONTRACTS = [
  ['12 on 1', 12, 1, 7.0, 'high-contrast text is unreadable on the page'],
  ['12 on 3', 12, 3, 7.0, 'high-contrast text is unreadable on a component surface'],
  ['11 on 1', 11, 1, 4.5, 'body text fails AA on the page'],
  ['11 on 3', 11, 3, 4.5, 'body text fails AA on a component surface — the ratio was true in the docs and false on a card'],
  ['9 vs 1', 9, 1, 3.0, 'the filled button does not read as an object against the page (WCAG 1.4.11)'],
  ['7 vs 1', 7, 1, 3.0, 'control borders are invisible on the page (WCAG 1.4.11)'],
  /* The assertion that was missing, and its absence let a real defect ship.
   *
   * Every border was solved against step 1 and asserted against step 1, so step 7 measured
   * exactly 3.05:1 and was declared compliant. On a card — step 3, where controls actually
   * live — it was 2.70:1 in light and 2.61:1 in dark. A closed loop: the thing that chose
   * the value and the thing that checked it made the same wrong assumption, so nothing
   * disagreed. Only migrating a real app surfaced it.
   *
   * An assertion that shares its premise with the code it audits is not an audit. */
  ['7 vs 3', 7, 3, 3.0, 'control borders fail 3:1 on a component surface — compliant on the page and invisible on a card (WCAG 1.4.11)'],
  ['8 vs 3', 8, 3, 3.0, 'the border hover state is not perceptible on a component surface'],
  ['6 vs 1', 6, 1, 1.4, 'the subtle border cannot be seen at all'],
  /* And the same omission again, one step down, found the same way.
   *
   * Step 6 was asserted against the page and never against a card — which is precisely what
   * had just been fixed for step 7 directly above. It matters now because step 6 is the ring
   * that carries hover and the avatar's edge, after a sweep proved no FILL can do it: in dark
   * the best any fill achieves against both the page and a card, while keeping body text at
   * 4.5:1, is 1.1072:1, and the optimum is pure black. Near the page WCAG's +0.05 flare term
   * swamps the lightness difference. So the ring is load-bearing and needs a floor of its own.
   *
   * 1.25, not 1.4: on a card in dark this measures 1.3235:1 and cannot be improved without
   * moving --surface, which sits at step 3's lightness by construction. The floor is set
   * below the measurement on purpose — it is a regression guard on a value the ramp already
   * achieves, not a target that was solved for. */
  ['6 vs surface', 6, 'surface', 1.25, 'the hover and avatar ring is imperceptible on a card, and no fill can replace it (ceiling 1.1072:1 in dark)'],
  /* --surface itself is not a numbered step, and text has to survive on it. Dark --surface is
   * step 3's lightness with the tint removed, so this is near-identical to '11 on 3' in dark
   * and a genuinely different check in light, where the card is L 1.0 and no step is. */
  ['11 on surface', 11, 'surface', 4.5, 'body text fails AA on a card'],
  ['12 on surface', 12, 'surface', 7.0, 'high-contrast text fails on a card'],
  ['7 vs surface', 7, 'surface', 3.0, 'control borders fail 3:1 on a card (WCAG 1.4.11)'],
];

/* Every ratio in here is measured in the palette's OWN gamut.
 *
 * A P3 palette checked with sRGB luminance would be the step-7 border bug all over again in
 * a new place: the code that picked the value and the code that checks it disagreeing about
 * which display the value is for. The gamut travels with the palette so they cannot. */
export function proveScale(name, mode, s, gamut = 'srgb') {
  for (const [label, fg, bg, min, consequence] of CONTRACTS) {
    const r = contrastIn(s[fg], s[bg], gamut);
    check(r >= min, `${gamut} ${mode}/${name}: ${label} is ${r.toFixed(2)}:1, needs ${min} — ${consequence}`);
  }

  // The solid must carry its own label. Which ink wins is hue-dependent, and
  // that is the point: a blue solid takes white, a yellow one takes black.
  const ink = inkFor(s[9]);
  const r = contrastIn(ink, s[9], gamut);
  check(r >= 4.5, `${gamut} ${mode}/${name}: no ink is legible on the solid (best ${r.toFixed(2)}:1) — the button cannot be labelled`);

  // Interaction states have to be felt. A hover that nobody can see is a hover
  // that does not exist, and this is where hand-tuned scales quietly collapse.
  for (const [a, b, what] of [[3, 4, 'rest -> hover'], [4, 5, 'hover -> active'], [9, 10, 'solid -> solid hover']]) {
    const d = distance(s[a], s[b]);
    check(d >= 0.012, `${gamut} ${mode}/${name}: ${what} (${a}->${b}) differ by only ${d.toFixed(4)} in OKLab — the state change is imperceptible`);
  }

  // Nothing may sit outside sRGB. A clipped colour reports a BETTER ratio than it
  // paints, which is the one failure that makes every other number here a lie.
  for (const step of Object.keys(s)) {
    check(inGamutOf(s[step], gamut), `${gamut} ${mode}/${name}: step ${step} ${fmt(s[step])} is outside ${gamut} — its measured ratio is not what a browser will paint`);
    check(!s[step].unsatisfiable, `${gamut} ${mode}/${name}: step ${step} is UNSATISFIABLE — no lightness at this hue satisfies both 3:1 against the page and 4.5:1 for its own ink`);
  }
}

/* ── 2. the assertion nobody else ships ──────────────────────────────────
 *
 * Roughly 8% of men have some red-green deficiency; about 2% are full dichromats, which is
 * the severity simulated here. Every design system answers this with the
 * advice "do not rely on colour alone" and then ships a red/green semantic pair
 * without ever checking it.
 *
 * This checks it. Each pair of solids is simulated under protanopia,
 * deuteranopia and tritanopia and required to stay apart. When it fails, the
 * message says which two states become the same colour and for whom — because
 * "danger and ok are indistinguishable to a deuteranope" is a product bug, not a
 * palette preference.
 *
 * The floor is a separation in OKLab, not a contrast ratio: two colours can have
 * identical luminance and still be perfectly distinct, and two with different
 * luminance can collapse to the same hue under simulation. Contrast is the wrong
 * instrument for "are these the same colour".
 */
const SEPARATION_FLOOR = 0.09;

export function proveDichromacy(mode, palette, { strictBrandHue = false } = {}) {
  const families = ['brand', 'danger', 'warn', 'ok'];
  const solids = families.map((f) => [f, palette[mode][f][9]]);

  /* The brand must never be confusable with a status. A "save" button that reads as an error
   * is a defect for everyone downstream of it, and it is normally AVOIDABLE, because the
   * brand hue is the one free variable in the system. That is the assertion that made info
   * achromatic.
   *
   * ── the finding this produced, which is the most interesting output of the whole tool ──
   *
   * Sweeping all 360 degrees, only hues around 285-315 pass. Every blue fails. The reason is
   * not a bug and not a threshold artefact:
   *
   *   Tritanopia removes blue-yellow discrimination. A blue brand at 240-270 loses its blue
   *   component and drifts toward grey-green — into the green that "ok" has to be. A violet
   *   brand at 285+ keeps a red component, so under the same simulation it moves toward pink
   *   and stays clear of green.
   *
   * So: IF YOUR STATUS SET IS RED / AMBER / GREEN, YOUR BRAND HUE CANNOT BE BLUE — not for a
   * tritanope. Blue is the single most common brand colour in software, so this is a real
   * constraint that essentially nobody accounts for, and it is only visible because the hues
   * are chosen by search rather than by taste.
   *
   * ── why a dichromatic collapse REPORTS rather than fails ──
   *
   * It used to fail, and that was backwards. The prevalences say why:
   *
   *   red vs green   danger/ok, deuteranopia   ~1 in 12 men    reported, glyph required
   *   blue vs green  brand/ok,  tritanopia     ~1 in 10,000    used to REFUSE TO BUILD
   *
   * So the prover was strict about the rare collapse and pragmatic about the one roughly 800
   * times more common. And the strictness bought nothing for anybody: `npx nilam 250`, an
   * unremarkable blue, emitted no palette at all — true for 22 of the 24 hues in a full sweep
   * — so the realistic outcome was not a better brand hue, it was the tool being written off.
   *
   * "Move the brand hue" is also advice most projects cannot take. A brand colour usually
   * predates the palette by years and is not the palette author's to change.
   *
   * The remedy that actually reaches a tritanope is the one red/green already gets: a second,
   * non-hue channel on the affected component. A colour they cannot distinguish was never
   * going to help them; a tick on the badge does. So the collapse is measured, reported, and
   * handed to proveStatusChannels(), which still fails the build when a component is hue-only.
   * Nothing is weakened — the obligation moves from the palette, where it could not be
   * discharged, to the component, where it can.
   *
   * NORMAL VISION IS STILL A HARD FAILURE. If a save button and an error state are the same
   * colour to everyone, no glyph makes that acceptable and the hue simply has to move.
   *
   * strictBrandHue restores the refusal, for when the hue genuinely is still free and you
   * would rather be told to move it than take on a glyph obligation. */
  const brandCollapses = [];
  for (const vision of [null, ...CVD_TYPES]) {
    const label = vision ?? 'normal vision';
    const brand = vision ? simulate(palette[mode].brand[9], vision) : palette[mode].brand[9];
    for (const f of ['danger', 'warn', 'ok']) {
      const other = vision ? simulate(palette[mode][f][9], vision) : palette[mode][f][9];
      const d = distance(brand, other);
      if (d >= SEPARATION_FLOOR) { check(true, ''); continue; }

      // `vision` is null for normal vision, so that case always falls through to the check.
      if (!strictBrandHue && vision) {
        brandCollapses.push({ vision, a: 'brand', b: f, d });
        notes.push(
          `${mode}: BRAND/${f} collapse under ${vision} (${d.toFixed(4)}) ` +
            `-> those components REQUIRE a non-hue channel`,
        );
        continue;
      }
      check(
        false,
        `${mode}: under ${label}, the BRAND is ${d.toFixed(4)} from "${f}" (floor ${SEPARATION_FLOOR}) — ` +
          `a primary action and a ${f} state are the same colour to that reader. ` +
          `${vision ? 'Move the brand hue (strictBrandHue asked to be told rather than handed a glyph obligation).' : 'This is normal vision, so no glyph makes it acceptable — the hue has to move.'}`,
      );
    }
  }

  /* HARD: every status pair separates under normal vision. */
  for (let i = 1; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const d = distance(solids[i][1], solids[j][1]);
      check(d >= SEPARATION_FLOOR,
        `${mode}: "${solids[i][0]}" and "${solids[j][0]}" are only ${d.toFixed(4)} apart in normal vision`);
    }
  }

  /* MEASURED, NOT ASSERTED: which status pairs collapse under each dichromacy.
   *
   * This is where I stop pretending. Danger is red, ok is green — that is what
   * those words mean, and red and green ARE the same colour to a deuteranope. No
   * hue assignment fixes it; the first run of this solver searched 15,360
   * combinations and the best it managed was 0.065 against a 0.09 floor.
   *
   * Lowering the floor to make it pass would be a lie. The honest output is a
   * REQUIREMENT ON COMPONENTS: any status that collapses here must carry a second,
   * non-hue channel — icon, text, or position. WCAG 1.4.1 has said so for years and
   * no system enforces it. This is the list that makes it enforceable, and
   * proveStatusChannels() below turns it into a build failure. */
  const collapses = [];
  for (const vision of CVD_TYPES) {
    for (let i = 1; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const d = distance(simulate(solids[i][1], vision), simulate(solids[j][1], vision));
        if (d < SEPARATION_FLOOR) collapses.push({ vision, a: solids[i][0], b: solids[j][0], d });
      }
    }
  }
  for (const c of collapses) {
    notes.push(`${mode}: ${c.a}/${c.b} collapse under ${c.vision} (${c.d.toFixed(4)}) -> those components REQUIRE a non-hue channel`);
  }
  return [...brandCollapses, ...collapses];
}

/**
 * The consequence of the collapse list: a status component may not be
 * hue-only. Pass the set of channels each status carries in your components and
 * this fails the build if a collapsing pair has nothing but colour.
 */
export function proveStatusChannels(collapses, channels) {
  for (const c of collapses) {
    for (const status of [c.a, c.b]) {
      const ch = channels[status] ?? [];
      const extra = ch.filter((x) => x !== 'colour');
      check(
        extra.length > 0,
        `"${status}" collapses with "${status === c.a ? c.b : c.a}" under ${c.vision} and carries ` +
          `no channel but colour — add an icon, a label, or a shape (WCAG 1.4.1)`,
      );
    }
  }
}

/* ── 3. salience: is the primary action findable ──────────────────────────
 *
 * Google's expressive research (Bentley et al., CHI 2026 — 48 participants, 10
 * apps, eye-tracking) measured 33% faster fixation and 20% faster task
 * completion when key elements were larger, better contained and more
 * prominently coloured, with larger effects for participants over 45.
 *
 * The honest limit: that study manipulated size, position and containment
 * together, so this cannot claim to reproduce their result. What it CAN do is
 * assert the colour half — that the primary solid out-contrasts every other
 * interactive surface against the page. A primary action that is not the most
 * prominent thing on it is a hierarchy bug, and nothing else checks for it.
 */
export function proveSalience(mode, palette, gamut = 'srgb') {
  const page = palette[mode].neutral[1];
  const brand = contrastIn(palette[mode].brand[9], page, gamut);
  const neutral = contrastIn(palette[mode].neutral[9], page, gamut);

  /* My first version of this asserted that the brand solid must out-contrast the
   * neutral solid, and it failed at 6.53 vs 12.92. The assertion was wrong, not
   * the palette: the neutral solid is near-black, so an ink button legitimately
   * has MORE contrast than any hue can. That is why an all-ink button works.
   *
   * Contrast is the wrong instrument for prominence. What actually makes the
   * primary action pop is that it is the only CHROMATIC solid on the page — it
   * wins on a channel nothing else is using. So assert that instead. */
  const brandChroma = palette[mode].brand[9].C;
  const neutralChroma = palette[mode].neutral[9].C;
  check(
    brandChroma > neutralChroma * 3,
    `${mode}: the brand solid carries chroma ${brandChroma.toFixed(3)} against the neutral solid's ` +
      `${neutralChroma.toFixed(3)} — the primary action is not distinguished on the colour channel, ` +
      `so it competes with secondary controls on lightness alone`,
  );
  notes.push(`${mode}: brand solid ${brand.toFixed(2)}:1 on page, chroma ${brandChroma.toFixed(3)} (neutral solid ${neutral.toFixed(2)}:1, chroma ${neutralChroma.toFixed(3)})`);
}

/* ── the loader ramp ──────────────────────────────────────────────────────
 *
 * Three assertions, and the third is the one that matters.
 *
 * --loader-1 is the head of the trail: the single sector that must always be findable, on
 * the page and on a card. Both grounds are measured SEPARATELY. Measuring only against the
 * page is the closed loop that let step 7 report 3.05:1 while painting 2.70:1 on a card,
 * and it is the reason this file exists in the shape it does.
 *
 * Nothing is asserted against a filled button. That ring is drawn from --brand-ink, not
 * from this ramp, and proveScale already requires ink to clear 4.5:1 on step 9. An earlier
 * draft asked for it here, which would have measured a colour never painted there.
 */
export function proveLoaderRamp(mode, palette, gamut = 'srgb') {
  const brand = palette[mode].brand;
  const neutral = palette[mode].neutral;
  const order = solveLoaderRamp(brand, neutral[1], gamut);

  // 1. a permutation — no value invented, none dropped, none repeated
  const sorted = [...order].sort((a, b) => a - b).join(',');
  check(
    sorted === '1,2,3,4,5,6,7,8,9,10,11,12',
    `${gamut} ${mode}: the loader ramp is not a permutation of the twelve brand steps (${order.join(',')}) — a loader would paint a colour the palette never solved`,
  );

  // 2. strictly ordered by the thing it claims to be ordered by
  for (let i = 1; i < order.length; i++) {
    const hi = contrastIn(brand[order[i - 1]], neutral[1], gamut);
    const lo = contrastIn(brand[order[i]], neutral[1], gamut);
    check(
      hi >= lo,
      `${gamut} ${mode}: loader ramp position ${i} breaks the ordering — step ${order[i - 1]} is ${hi.toFixed(4)}:1 against the page and step ${order[i]} is ${lo.toFixed(4)}:1`,
    );
  }

  // 3. the head is findable on BOTH grounds, measured independently
  const head = brand[order[0]];
  for (const [where, ground] of [['the page', neutral[1]], ['a card', neutral.surface]]) {
    const r = contrastIn(head, ground, gamut);
    check(
      r >= 3.0,
      `${gamut} ${mode}: --loader-1 (brand step ${order[0]}) is ${r.toFixed(4)}:1 on ${where}, needs 3.0 — the leading sector of every spinner in the system is not findable there (WCAG 1.4.11)`,
    );
  }
}

/* ── run ─────────────────────────────────────────────────────────────── */

export function prove(palette, { strictBrandHue = false } = {}) {
  failures.length = 0; notes.length = 0; count = 0;
  for (const mode of ['light', 'dark']) {
    for (const family of ['neutral', 'brand', 'danger', 'warn', 'ok', 'info']) {
      proveScale(family, mode, palette[mode][family], palette.gamut ?? 'srgb');
    }
    proveDichromacy(mode, palette, { strictBrandHue });
    proveSalience(mode, palette, palette.gamut ?? 'srgb');
    proveLoaderRamp(mode, palette, palette.gamut ?? 'srgb');
  }
  return { count, failures: [...failures], notes: [...notes] };
}

export function report(palette, { verbose = false, strictBrandHue = false } = {}) {
  const { count, failures, notes } = prove(palette, { strictBrandHue });
  console.log(`\nbrand hue ${palette.brandHue}   semantics ${JSON.stringify(palette.semanticHues)}`);
  if (verbose) {
    for (const mode of ['light', 'dark']) {
      console.log(`\n  ── ${mode} ──`);
      for (const f of ['neutral', 'brand', 'danger', 'warn', 'ok', 'info']) {
        const s = palette[mode][f];
        console.log(`  ${f.padEnd(7)} ` + [1, 3, 6, 7, 9, 11, 12].map((n) => `${n}:${toHex(s[n])}`).join(' '));
      }
    }
  }
  for (const n of notes) console.log(`  note  ${n}`);
  console.log(`\n  ${count} assertions`);
  if (failures.length) {
    console.log(`  ${failures.length} FAILED:`);
    for (const f of failures) console.log(`    - ${f}`);
  } else {
    console.log('  all passed');
  }
  return failures.length;
}
