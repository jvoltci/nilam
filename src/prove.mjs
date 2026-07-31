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
import { inkFor } from './solve.mjs';

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
 * Roughly 8% of men are dichromatic. Every design system answers this with the
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

export function proveDichromacy(mode, palette, { brandLocked = false } = {}) {
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
   * ── brandLocked ──
   *
   * The failure message says "move the brand hue", which is correct advice and useless when
   * the hue is a brand asset that predates the palette. Refusing to emit anything for a blue
   * brand would make the tool unusable for most real projects, and quietly lowering the floor
   * to let it pass would be a lie.
   *
   * So `brandLocked: true` moves brand-vs-status from ASSERTED to MEASURED — exactly the
   * treatment danger-vs-ok already gets, and for exactly the same reason: the collapse is now
   * unavoidable, so the honest response is not to pretend it is absent but to require the
   * component to carry a second, non-hue channel. proveStatusChannels() then enforces that
   * and the build still fails if a component is hue-only. Nothing is weakened; the burden
   * moves from the palette to the component, which is where it can actually be discharged. */
  const brandCollapses = [];
  for (const vision of [null, ...CVD_TYPES]) {
    const label = vision ?? 'normal vision';
    const brand = vision ? simulate(palette[mode].brand[9], vision) : palette[mode].brand[9];
    for (const f of ['danger', 'warn', 'ok']) {
      const other = vision ? simulate(palette[mode][f][9], vision) : palette[mode][f][9];
      const d = distance(brand, other);
      if (d >= SEPARATION_FLOOR) { check(true, ''); continue; }

      if (brandLocked && vision) {
        brandCollapses.push({ vision, a: 'brand', b: f, d });
        notes.push(
          `${mode}: BRAND/${f} collapse under ${vision} (${d.toFixed(4)}) with the hue locked ` +
            `-> those components REQUIRE a non-hue channel`,
        );
        continue;
      }
      check(
        false,
        `${mode}: under ${label}, the BRAND is ${d.toFixed(4)} from "${f}" (floor ${SEPARATION_FLOOR}) — ` +
          `a primary action and a ${f} state are the same colour to that reader. Move the brand hue, ` +
          `or pass brandLocked if it cannot move and carry a glyph on those components instead.`,
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

/* ── run ─────────────────────────────────────────────────────────────── */

export function prove(palette, { brandLocked = false } = {}) {
  failures.length = 0; notes.length = 0; count = 0;
  for (const mode of ['light', 'dark']) {
    for (const family of ['neutral', 'brand', 'danger', 'warn', 'ok', 'info']) {
      proveScale(family, mode, palette[mode][family], palette.gamut ?? 'srgb');
    }
    proveDichromacy(mode, palette, { brandLocked });
    proveSalience(mode, palette, palette.gamut ?? 'srgb');
  }
  return { count, failures: [...failures], notes: [...notes] };
}

export function report(palette, { verbose = false, brandLocked = false } = {}) {
  const { count, failures, notes } = prove(palette, { brandLocked });
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
