/* nilam — the solver.
 *
 * achroma removed colour because colour is risky. This inverts the premise:
 * colour is the strongest tool available, people misuse it because nobody can
 * verify it, so verify it and then use it freely.
 *
 * Two things here are not in any system I know of:
 *
 *   1. SCALES ARE SOLVED, NOT PICKED. Every step's lightness is found by
 *      inverting a contrast requirement. Radix hand-tuned 30 scales over years
 *      and the result is beautiful; it is also unverifiable — nothing fails if
 *      step 11 drifts. Here the contract IS the construction, so a step cannot
 *      exist at a lightness that breaks it.
 *
 *   2. SEMANTIC HUES ARE CHOSEN UNDER DICHROMACY. The real argument against
 *      colour-coding is that ~8% of men cannot separate the hues you picked.
 *      Every system answers "don't rely on colour alone" and then ships red/green
 *      anyway. This searches hue space for the danger/warn/ok/info set with the
 *      largest MINIMUM pairwise separation across protanopia, deuteranopia and
 *      tritanopia — so the palette is legible to dichromats by construction.
 *
 * The 12-step role model is Radix's and it is genuinely good design; there was
 * no reason to reinvent it. What is new is that the roles are contracts a solver
 * satisfies rather than labels on hand-chosen swatches.
 */

import {
  contrast, contrastIn, distance, inGamut, inGamutOf, maxChroma, maxChromaIn,
  simulate, solveLightness, GAMUTS, CVD_TYPES,
} from './colour.mjs';

/* ── the role model ──────────────────────────────────────────────────────
 *
 *   1  app background            7  border, normal        (WCAG 1.4.11: 3:1)
 *   2  subtle background         8  border, hover
 *   3  component, rest           9  solid                 (the brand moment)
 *   4  component, hover         10  solid, hover
 *   5  component, active        11  text, low contrast     (WCAG 1.4.3: 4.5:1)
 *   6  border, subtle           12  text, high contrast    (7:1)
 */

/* Chroma envelope per step. Low at the page ends so surfaces read as surfaces,
 * maximal at 9 where the hue is the point, dropping again at 11-12 because high
 * contrast and high chroma cannot coexist at the sRGB boundary. `k` is a
 * fraction of the in-gamut maximum, so the envelope adapts to hue: yellow has
 * far more chroma available at high L than blue does, and this follows it. */
const ENVELOPE = {
  1: 0.10, 2: 0.16, 3: 0.26, 4: 0.34, 5: 0.42,
  6: 0.46, 7: 0.55, 8: 0.66, 9: 0.92, 10: 0.92,
  11: 0.62, 12: 0.40,
};

/* The neutral scale gets a CONSTANT whisper rather than a capped envelope.
 *
 * The first version capped it at 0.022, and the cap only bound from step 6 up —
 * so neutral steps 1-5 came out byte-identical to the brand's, and a
 * brand-tinted callout background was impossible to express. In a system whose
 * entire premise is that colour does work, that is the defect that matters most.
 *
 * 0.007 is not arbitrary: it is measured off a shipped interface I trust. The
 * Telepathy day theme runs its greys at chroma 0.007-0.020 around hue 285, and
 * that faint cool cast is what reads as expensive. */
const NEUTRAL_CHROMA = 0.007;

/* The lightness of the solid in DARK mode, and the one number here that is chosen
 * rather than solved. It deserves the explanation.
 *
 * The first version of solveSolid kept "the most chromatic legal colour". In the
 * blue half of the wheel maximum chroma lives at low lightness, so it returned
 * #6223f1 (L 0.500, C 0.269) for a violet brand — a colour that reads as pigment,
 * or as highlighter ink. Set beside the two references I actually trust:
 *
 *   Zima Blue         #009fe3   L 0.667  C 0.147  h 238
 *   Telepathy accent  #8b7cf6   L 0.657  C 0.176  h 286
 *   what I solved     #6223f1   L 0.500  C 0.269  h 285
 *
 * The first two are 48 degrees apart in hue and read as the same KIND of colour.
 * The third is one degree from the second and reads as nothing like it. Lightness
 * is doing the work, not hue, and the objective was walking away from it.
 *
 * I tried three ways to derive 0.66 and none of them produce it. "Darkest colour
 * that still carries dark ink at 4.6:1" gives 0.603. "Mirror the light solid's
 * contrast against its own page" gives 0.595. Mirroring the light solid's distance
 * from the page, or from its own ink, gives 0.570 and 0.575. The honest position is
 * that in light mode the constraints BIND and choose the value for you, and in dark
 * mode they do not — dark ink still has 1.3:1 of headroom at 0.66 — so something
 * has to fill the gap and it is taste, measured off two colours that work.
 *
 * Same standing as NEUTRAL_CHROMA above: declared, sourced, and everything
 * downstream of it is asserted. What is NOT claimed is that it was derived. */
export const GLOW_L = 0.66;

/* The envelope is a FRACTION of the in-gamut maximum, which is what makes one solver serve
 * both gamuts: on a P3 display the same 0.92 at step 9 simply reaches further, because the
 * boundary it is a fraction of is further out. Nothing about the role model changes. */
const chromaFor = (step, neutral, gamut) => (L, h) =>
  neutral
    ? Math.min(maxChromaIn(L, h, gamut) * 0.9, NEUTRAL_CHROMA)
    : maxChromaIn(L, h, gamut) * ENVELOPE[step];

/* ── one scale, solved ───────────────────────────────────────────────── */

/**
 * @param hue      the hue angle to build the scale around
 * @param mode     'light' | 'dark'
 * @param opts.neutral  true for the grey scale: chroma is throttled hard so it
 *                      reads as a tint of the brand rather than as a colour
 */
/* The signature. Sapphire, नीलम — a violet-blue at 285, which is where the
 * Telepathy day theme's accent already sat before any of this was solved. Every
 * other value in the system is derived from it, and passing a different number
 * re-derives all of them. */
export const NILAM_HUE = 285;

export function solveScale(hue, mode, opts = {}) {
  const light = mode === 'light';
  const gamut = opts.gamut ?? 'srgb';
  const chroma = (step) => chromaFor(step, opts.neutral === true, gamut);

  // Step 1 is the anchor and the only value not solved from a contrast target:
  // it is the page, so it is chosen, and everything else is solved against it.
  // Not pure white — a page at L=1.000 has no headroom for a raised surface,
  // which is exactly the defect that made achroma's light-mode cards invisible.
  const L1 = light ? 0.9800 : 0.1750;
  const s = {};
  s[1] = { L: L1, C: chroma(1)(L1, hue), h: hue };

  // 2-5 walk away from the page in perceptible steps. Solved as contrast against
  // step 1 rather than fixed L deltas, because a fixed delta is a different
  // perceptual step in light than in dark — the mistake that left achroma's
  // raised surface at 1.044:1 in light and 1.104:1 in dark from "one step" each.
  const surfaceTargets = light
    ? { 2: 1.055, 3: 1.13, 4: 1.20, 5: 1.28 }
    : { 2: 1.075, 3: 1.17, 4: 1.27, 5: 1.38 };
  for (const step of [2, 3, 4, 5]) {
    s[step] = solveLightness({
      target: surfaceTargets[step], against: s[1], hue,
      direction: light ? 'darker' : 'lighter',
      chromaAt: chroma(step),
      gamut,
      ...(light ? { hi: L1 } : { lo: L1 }),
    });
  }

  /* 6-8 are borders. Step 7 is the one WCAG 1.4.11 governs at 3:1 — it is the border of a
   * control, which is a non-text UI component. 6 is decorative, 8 is the hover.
   *
   * 7 AND 8 SOLVE AGAINST STEP 3, NOT STEP 1. That is a bug fix, not a preference.
   *
   * The first version solved all three against the page, which made step 7 exactly 3.05:1
   * there and 2.70:1 on a card — because step 3 is the component surface, and a control
   * sits on a card far more often than directly on the page. The token measured compliant
   * in the docs and failed in the product. Every family, both modes.
   *
   * It is the SAME mistake already fixed for steps 11 and 12 thirty lines below, which
   * solve against step 3 for exactly this reason. I wrote that comment and then did not
   * carry the lesson up here. Found by migrating a real app: a dashed 1.37:1 border on its
   * drop zone — the entire product — and a 3px warning stripe meant to be the non-hue
   * channel a deuteranope depends on. At 1.37:1 that channel does not exist.
   *
   * Step 6 stays against the page. It is the decorative hairline — a card edge, not a
   * control boundary — and 1.4.11 does not govern it. Making it clear 3:1 as well would
   * just be step 7 twice. */
  s[6] = solveLightness({
    target: 1.55, against: s[1], hue,
    direction: light ? 'darker' : 'lighter',
    chromaAt: chroma(6),
      gamut,
    ...(light ? { hi: L1 } : { lo: L1 }),
  });
  for (const [step, target] of [[7, 3.05], [8, 4.2]]) {
    s[step] = solveLightness({
      target, against: s[3], hue,
      direction: light ? 'darker' : 'lighter',
      chromaAt: chroma(step),
      gamut,
    });
  }

  // 9 is the solid: the filled button, the brand. Two contracts at once —
  // it must be a visible object against the page (3:1, 1.4.11) AND carry its own
  // label (4.5:1, 1.4.3). Which ink wins is hue-dependent: white sits on a blue
  // solid, black on a yellow one. And the answer differs by MODE, which is the
  // thing the first version got wrong — see solveSolid.
  s[9] = solveSolid(hue, s[1], chroma(9), light, gamut);
  s[10] = solveLightness({
    target: contrastIn(s[9], s[1], gamut) * 1.18, against: s[1], hue,
    direction: light ? 'darker' : 'lighter',
    chromaAt: chroma(10),
      gamut,
    ...(light ? { hi: s[9].L } : { lo: s[9].L }),
  });

  // 11 and 12 are text, and they are solved against the WORST background they
  // are allowed to sit on — step 3, the component surface — not against the page.
  // Solving against the page and then using the token on a card is how a system
  // ships a ratio that was true in the docs and false on screen.
  for (const [step, target] of [[11, 4.55], [12, 7.1]]) {
    s[step] = solveLightness({
      target, against: s[3], hue,
      direction: light ? 'darker' : 'lighter',
      chromaAt: chroma(step),
      gamut,
    });
  }

  /* The card, and it is the one surface with NO tint.
   *
   * Copied from an observation rather than invented: in the Telepathy day theme
   * the page is #f2f2f7 (chroma 0.007) and the card is #ffffff (chroma 0.000).
   * The tint reads not because it is strong but because the card beside it has
   * none — the eye is comparing, not measuring. That inversion is why a white
   * card on a cool grey ground looks lit, and it is what achroma's flat
   * chroma-zero ramp could never produce.
   *
   * It also fixes a measured defect: achroma's raised surface managed 1.044:1
   * against its page, which I proved invisible. This pairing gets a chroma step
   * as well as a lightness step, so it separates on two channels instead of one. */
  s.surface = light
    ? { L: 1.0, C: 0, h: hue }
    : { L: s[3].L, C: 0, h: hue };

  return s;
}

/* One hue, two brand moments.
 *
 * A filled button keeps the polarity of the page it sits on. On a light page it is
 * a dark object with light text; on a dark page it is a light object with dark text.
 * Material 3 has said this for years — dark-theme `primary` is tone 80 with a tone-20
 * `onPrimary` — and my first version ignored it, solving one lightness and using it
 * in both modes. That is why the dark theme got a pigment stain where it wanted a glow.
 *
 * So the objective is no longer "most chromatic". It is:
 *
 *   LIGHT MODE   the LIGHTEST colour that still clears 3:1 on the page and carries
 *                a legible ink. Derived — the constraints pick the value.
 *   DARK MODE    the glow band, at whatever chroma the envelope allows there.
 *                Chosen — see GLOW_L for why nothing derives it.
 *
 * "Lightest that stays legal" is what makes this general rather than a blue rule.
 * For a violet the ink bound binds, at L 0.585, because white stops being legible
 * above it. For an amber, black ink stays legible all the way up, so the PAGE bound
 * binds instead. Neither hue needs a special case and neither gets one.
 */
export function solveSolid(hue, page, chromaAt, light, gamut = 'srgb') {
  const white = { L: 1, C: 0, h: hue };
  const black = { L: 0.16, C: 0, h: hue };
  const onPage = (c) => contrastIn(c, page, gamut) >= 3.05;         // an object on the page
  const carries = (c, ink) => contrastIn(ink, c, gamut) >= 4.55;    // carries its own label

  /* The ink the mode WANTS, and this is the part the first rewrite left out.
   *
   * "Some legible ink" is too weak a constraint. On a white page a light violet at
   * L 0.66 passes it — black text on it is 5.9:1 — and the solver duly returned that,
   * at 3.06:1 against the page. Legal, and wrong: a pale button on a pale page is not
   * an object, it is a smudge. A filled button has to INVERT its page's polarity to
   * read as raised, so light mode wants white ink and dark mode wants dark ink.
   *
   * The fallback is not a hedge, it is amber. No lightness exists where an amber is
   * both still amber and able to carry white text — I measured that earlier and it is
   * why the old code produced #b08922, a dark olive nobody would call a warning. Such
   * a hue is allowed the other ink, and then the PAGE bound becomes the binding one. */
  const preferred = light ? white : black;
  const fallback = light ? black : white;

  const scan = (ink, from, to, step) => {
    for (let L = from; step < 0 ? L >= to : L <= to; L += step) {
      const c = { L, C: chromaAt(L, hue), h: hue };
      if (inGamutOf(c, gamut) && onPage(c) && carries(c, ink)) return c;
    }
    return null;
  };

  /* Step 0.0025 rather than 0.005: the coarser walk overshot the ink boundary by up
   * to 1.5% of lightness, which is a visible amount of chroma at these hues. */
  if (light) {
    /* Solve the lightest legal solid for EACH ink, then keep the more chromatic one.
     *
     * Preferring white outright still produced #8c731a for warn — a dark olive-gold
     * nobody would read as a warning — because amber can just barely carry white text
     * down at L 0.53, so the white-ink branch always won and never fell through.
     *
     * Comparing the two candidates fixes it without naming a single hue. Each candidate
     * is already pinned to the lightest lightness legal for its ink, so this is not the
     * old maximise-chroma-anywhere bug returning: the choice is between two constrained
     * points, not a free search. It lands where each hue's chroma actually lives —
     * violet is most saturated dark, so it takes white ink at L 0.585; amber is most
     * saturated light, so it takes black ink and stays amber. */
    const a = scan(white, 0.9, 0.28, -0.0025);
    const b = scan(black, 0.9, 0.28, -0.0025);
    if (a && b) return b.C > a.C ? b : a;
    return a ?? b ?? unsatisfiable(hue, chromaAt, 0.55);
  }

  // Dark mode: the glow band first, since that is the whole point of it.
  const glow = { L: GLOW_L, C: chromaAt(GLOW_L, hue), h: hue };
  if (inGamutOf(glow, gamut) && onPage(glow) && carries(glow, preferred)) return glow;
  // Off the band, prefer DARKEST legal — on a dark page the solid still has to be
  // the lighter object, so walking up from the floor keeps it as close to the band
  // as the constraints allow rather than flying to near-white.
  return scan(preferred, 0.42, 0.95, 0.0025)
    ?? scan(fallback, 0.42, 0.95, 0.0025)
    ?? unsatisfiable(hue, chromaAt, GLOW_L);
}

/* No lightness at this hue satisfies both contracts. Return the failure rather than
 * a lie — prove.mjs reads the flag and turns it into a named assertion failure. */
const unsatisfiable = (hue, chromaAt, L) =>
  ({ L, C: chromaAt(L, hue), h: hue, unsatisfiable: true });

/** Whichever of near-white or near-black is legible on a solid. */
export function inkFor(solid) {
  const white = { L: 1, C: 0, h: solid.h };
  const black = { L: 0.16, C: 0, h: solid.h };
  return contrast(white, solid) >= contrast(black, solid) ? white : black;
}

/* ── choosing the semantic hues under dichromacy ─────────────────────────
 *
 * The novel part. Candidate windows are the ranges a hue can occupy and still
 * MEAN what it needs to mean — a "danger" at 150 is green however well it
 * separates — so meaning constrains the search and dichromacy picks within it.
 */
const WINDOWS = {
  /* Narrowed after looking at the first render, which is the only way this class
   * of bug shows up. The windows were 8-44 / 52-104 / 132-176 and the optimiser
   * did exactly what it was told: it pushed every hue to the window EDGE to buy
   * separation, and meaning paid for it. danger landed on 10 and rendered as hot
   * magenta — "Delete account" looked like a fashion brand, not a warning. warn
   * landed on 52 and came out burnt brown rather than amber.
   *
   * Separation is a constraint. MEANING IS THE OBJECTIVE. A perfectly separated
   * palette where danger is pink has failed at the only job it had, and no
   * assertion I had written could see it — the numbers were all green.
   *
   * These windows are the range where each word still means itself. */
  danger: [22, 38],
  warn: [68, 92],
  ok: [140, 168],
};

/* info is deliberately NOT in that list.
 *
 * The first run of this solver proved why. With a violet brand at 285 and info's
 * window at 215-275, the best assignment it could find left brand and info 0.052
 * apart under deuteranopia — the same colour, to that reader. There was no blue
 * available that cleared the floor, because the brand had already taken that
 * region of hue space.
 *
 * So info is built from the neutral scale. It is the state that means "nothing is
 * wrong", it does not need to shout, and spending a hue on it buys a collision
 * with the brand. THE BRAND HUE CONSTRAINS WHICH SEMANTIC HUES REMAIN AVAILABLE —
 * that is a real constraint no palette tool accounts for, and this is the first
 * place it showed up. */

/**
 * Search the semantic hue assignment that maximises the smallest pairwise
 * separation, measured on the step-9 solids, across normal vision and all three
 * dichromacies — including separation from the brand hue, since a status badge
 * that reads as the brand colour is worse than useless.
 */
export function solveSemanticHues(brandHue, { step = 2 } = {}) {
  const names = Object.keys(WINDOWS);
  const grids = names.map((n) => {
    const [a, b] = WINDOWS[n];
    const out = [];
    for (let h = a; h <= b; h += step) out.push(h);
    return out;
  });

  /* Score across BOTH modes, which the first version did not.
   *
   * It optimised on light-mode solids and the result was used in dark as well, so
   * dark mode never got a vote — and once step 9 became mode-dependent the two modes
   * stopped agreeing about which hues were safe. It chose ok=148, worth 0.1044 in
   * light and 0.0896 in dark, and shipped a dark-mode tritanopia failure. ok=144 is
   * worth 0.1061 and 0.0922: slightly worse in light, and legal in both.
   *
   * The lesson generalises past this palette — optimising a shared decision on one
   * mode's numbers will silently sacrifice the other, and the assertion that catches
   * it fires nowhere near the code that caused it. */
  const MODES = ['light', 'dark'];
  const cache = new Map();
  const solidAt = (h, mode) => {
    const key = `${mode}:${h}`;
    if (!cache.has(key)) cache.set(key, solveScale(h, mode)[9]);
    return cache.get(key);
  };

  /* Score ONLY the pairs prove.mjs asserts as hard. This is the subtlest thing in
   * the file and it cost a real failure to find.
   *
   * The first objective was the minimum over every pair under every vision, which
   * sounds strictly better and is worse. danger and ok are red and green; they collapse
   * under deuteranopia no matter what, and prove.mjs already accepts that and demands a
   * non-hue channel instead. But the OPTIMISER was still scored on it — so the global
   * minimum was pinned at 0.0333 by a pair nothing could fix, and moving ok around
   * changed the score not at all. It happily shipped ok=154 with brand/ok at 0.0882
   * under tritanopia, a failure that WAS fixable, because fixing it did not move the
   * number being maximised.
   *
   * An objective that averages over the fixable and the unfixable optimises neither.
   * So the score is now exactly the hard set: brand against each status under every
   * vision, and status pairs under normal vision. ok=144 scores 0.0922 in dark where
   * 154 scored 0.0882, and both clear the floor. */
  const hardScore = (chosen) => {
    let worst = Infinity;
    for (const mode of MODES) {
      const brand = solidAt(brandHue, mode);
      const statuses = chosen.map((h) => solidAt(h, mode));

      // Brand vs every status, under every vision. Always avoidable: the brand hue
      // is the one free variable, so a collapse here is a bug and not a fact.
      for (const vision of [null, ...CVD_TYPES]) {
        const b = vision ? simulate(brand, vision) : brand;
        for (const s of statuses) {
          worst = Math.min(worst, distance(b, vision ? simulate(s, vision) : s));
        }
      }

      // Status vs status, normal vision only — the dichromatic case is measured and
      // compensated in components, not asserted, so scoring it here would be scoring
      // something that cannot be won.
      for (let x = 0; x < statuses.length; x++) {
        for (let y = x + 1; y < statuses.length; y++) {
          worst = Math.min(worst, distance(statuses[x], statuses[y]));
        }
      }
    }
    return worst;
  };

  let best = null;
  const walk = (i, chosen) => {
    if (i === names.length) {
      const worst = hardScore(chosen);
      if (!best || worst > best.worst) {
        best = { worst, hues: Object.fromEntries(names.map((n, k) => [n, chosen[k]])) };
      }
      return;
    }
    for (const h of grids[i]) walk(i + 1, [...chosen, h]);
  };
  walk(0, []);
  return best;
}

/* ── the whole palette ───────────────────────────────────────────────── */

export function solvePalette(brandHue, { semanticHues, gamut = 'srgb' } = {}) {
  const hues = semanticHues ?? solveSemanticHues(brandHue).hues;
  const out = { brandHue, semanticHues: hues, gamut, light: {}, dark: {} };
  for (const mode of ['light', 'dark']) {
    out[mode].neutral = solveScale(brandHue, mode, { neutral: true, gamut });
    out[mode].brand = solveScale(brandHue, mode, { gamut });
    for (const [name, h] of Object.entries(hues)) {
      out[mode][name] = solveScale(h, mode, { gamut });
    }
    // info is the neutral scale. See the note on WINDOWS.
    out[mode].info = out[mode].neutral;
  }
  return out;
}
