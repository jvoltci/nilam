/* nilam — the DTCG design-token emitter.
 *
 * This closes the one gap the README names out loud: Material 3 has cross-platform
 * tokens and nilam had a stylesheet. The colour was already solved; it just could not
 * leave CSS.
 *
 * ── which spec, exactly ──────────────────────────────────────────────────────
 *
 * The Design Tokens Community Group published its FIRST STABLE version on
 * 28 October 2025, tagged 2025.10. Before that everything was an editors' draft and
 * every tool shipped its own dialect, which is why so much writing about "design
 * tokens JSON" is now wrong. Three modules matter here:
 *
 *   Format 2025.10    $value / $type / $description / $extensions, groups, aliases,
 *                     composite types. Says NOTHING about modes or themes.
 *   Color 2025.10     the colour $value is now an OBJECT — colorSpace, components,
 *                     alpha, and an optional 6-digit hex FALLBACK. The old
 *                     hex-string-only form is gone, and that is the change that
 *                     makes this package expressible at all: `oklch` is one of the
 *                     fourteen legal colour spaces, so the solved OKLCH triplet
 *                     survives the trip instead of being flattened to 8-bit sRGB.
 *   Resolver 2025.10  the answer to theming. A separate document with `sets` and
 *                     `modifiers`, each modifier holding named `contexts`.
 *
 * ── the theming question, and it is a real one ────────────────────────────────
 *
 * The Format module does not have modes. For four years tools invented their own:
 * Tokens Studio had theme groups, Cobalt/Terrazzo had `$extensions.mode`, Figma had
 * variable modes, and a `$modes` proposal sat open in the DTCG repo. In October 2025
 * the group chose RESOLVERS over `$modes`, so the spec-sanctioned way to say
 * "light and dark" is two token sets plus a resolver that selects between them.
 *
 * That is what this emits — but note what it costs, because it is not free. A resolver
 * document is not a token document, so a tool that reads only the Format module sees
 * nothing. Style Dictionary v5 and every Figma importer I could find still want a FLAT,
 * single-mode token file. So:
 *
 *   toDtcg(palette)                    -> the resolver document, all of it, one object
 *   toDtcg(palette, { mode: 'light' }) -> a flat token document for that mode
 *
 * The resolver's `sources` arrays hold the tokens INLINE rather than by $ref, which the
 * spec explicitly permits ("tokens declared directly, or a reference object pointing to a
 * JSON file, or any combination of the two"). That keeps the whole system in one
 * serialisable object, which is what the CSS emitter does too.
 *
 * ── what is NOT claimed ──────────────────────────────────────────────────────
 *
 * There is no published JSON Schema for plain token documents, only for resolvers, so
 * the flat documents carry no `$schema`. The spec reserves exactly eight $-properties
 * ($value, $type, $description, $extensions, $deprecated, $extends, $ref, $root) and
 * `$schema` is not among them — putting it on a token group would be inventing syntax.
 *
 * Structural conformance is asserted in test/dtcg.test.mjs against the rules in the
 * spec text. It is NOT validated against an official schema, because for token
 * documents there is not one to validate against. That is a limit of the ecosystem in
 * July 2026, not a shortcut taken here.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contrast, toHex } from './colour.mjs';
import { inkFor, GLOW_L } from './solve.mjs';

export const DTCG_VERSION = '2025.10';

/* $extensions keys MUST be vendor-specific and the spec asks for reverse domain
 * notation. nilam owns no domain; the repo lives at github.com/jvoltci/nilam, whose
 * Pages host is jvoltci.github.io, so the reverse of a name that is actually ours is
 * io.github.jvoltci.nilam. Same convention Maven and Flatpak use for the same reason. */
export const VENDOR = 'io.github.jvoltci.nilam';

/* Duplicated from css.mjs, which does not export it. Copying a constant is exactly how
 * two files that must agree quietly stop agreeing — so the parity assertion in
 * test/dtcg.test.mjs derives the family list from the EMITTED CSS and requires the two
 * token sets to be equal in both directions. If someone adds a seventh family to
 * css.mjs and not here, that test fails rather than this list being silently short. */
const FAMILIES = ['neutral', 'brand', 'danger', 'warn', 'ok', 'info'];

const MODES = ['light', 'dark'];

const round = (x, n) => Number(x.toFixed(n));

/* ── the role model, as prose ─────────────────────────────────────────────────
 *
 * The 12-step role model is Radix's and the solver already treats each step as a
 * contract rather than a label. This is that contract written out, because the role
 * model is the part of nilam worth exporting — a hex code tells a downstream tool
 * nothing about whether it may be used as body text.
 *
 * Every $description below names the ROLE and, where WCAG governs it, the clause. */
const ROLE = {
  1: 'the page — the app background. The one lightness in the family that is chosen '
    + 'rather than solved, because everything else is solved against it. Not pure white: '
    + 'a page at L 1.000 leaves no headroom for a raised surface above it.',
  2: 'a subtle background — a striped row, a well, a hovered list item. Solved as a '
    + 'contrast step off the page rather than a fixed lightness delta, because a fixed '
    + 'delta is a different perceptual step in light than in dark.',
  3: 'a component at rest — the surface an input, card or quiet button sits on. Steps 11 '
    + 'and 12 are solved against THIS, not against the page, because it is the worst '
    + 'background they are allowed to sit on.',
  4: 'a component on hover.',
  5: 'a component while active or pressed.',
  6: 'a subtle, decorative border — a divider or a table rule. No WCAG floor applies to '
    + 'it; it only has to be visible at all, which is why it is solved at 1.55:1.',
  7: 'border of a control — WCAG 1.4.11 governs this at 3:1, because the border of an '
    + 'input or a checkbox is a non-text UI component and has to be findable.',
  8: 'border of a control on hover.',
  9: 'the solid — the filled button, the brand moment. Two contracts at once: 3:1 against '
    + 'the page (WCAG 1.4.11, so it reads as an object) and 4.5:1 for its own label '
    + '(WCAG 1.4.3, so it can be labelled). ITS LIGHTNESS DIFFERS BY MODE deliberately — '
    + 'a filled button inverts the polarity of the page it sits on. Always pair it with '
    + 'the family ink token and never with a literal white.',
  10: 'the solid on hover.',
  11: 'body text — WCAG 1.4.3 at 4.5:1, measured against step 3. Solving text against the '
    + 'page and then using it on a card is how a system ships a ratio that was true in '
    + 'the docs and false on screen.',
  12: 'high-contrast text — 7:1 against step 3 and against the page. Headings, and '
    + 'anything that must survive a low-contrast display or a colour filter.',
  ink: 'the ink for step 9 — whichever of near-white or near-black is legible on the '
    + 'solid, decided per hue AND per mode. White on a violet solid, black on an amber '
    + 'one, black on the dark-mode glow. Hard-coding `color: white` on a filled button is '
    + 'the most common contrast bug in the systems I read. WCAG 1.4.3 governs it at 4.5:1.',
  'ink-max': 'MAXIMUM ink for this mode, not step 12. Step 12 answers a 7:1 contract and '
    + 'lands on a dark slate; this is 19.41:1. For things that want every bit of contrast '
    + 'available rather than enough for text: a QR code, a barcode, a data matrix.',
  void: 'BELOW the page, which no numbered step is — the dark ramp starts at step 1 and only '
    + 'lightens. For a surface that must read as absence rather than as one more panel: a '
    + 'video matte, an image-viewer letterbox, an editor gutter.',
  surface: 'a raised surface — a card, a popover, a dialog. The one surface carrying NO '
    + 'tint at all: in light mode the page is faintly cool and the card is pure white, and '
    + 'the tint reads as light precisely because the thing beside it has none. The eye is '
    + 'comparing, not measuring.',
};

/* The reference each step's ratio is measured against, and the floor prove.mjs holds it
 * to. Mirrors the CONTRACTS table in prove.mjs; the ratios below are MEASURED here rather
 * than copied, so a solver change moves the numbers in the export too. Step 1 has no
 * contract — it is the anchor — so it is absent and gets `anchor: true` instead. */
const CONTRACT = {
  2: { against: 1 },
  3: { against: 1 },
  4: { against: 1 },
  5: { against: 1 },
  6: { against: 1, floor: 1.4 },
  7: { against: 1, floor: 3.0, wcag: '1.4.11' },
  8: { against: 1 },
  9: { against: 1, floor: 3.0, wcag: '1.4.11' },
  10: { against: 1 },
  11: { against: 3, floor: 4.5, wcag: '1.4.3' },
  12: { against: 3, floor: 7.0 },
};

/* ── the colour value ────────────────────────────────────────────────────────
 *
 * The components are the SAME numbers fmt() writes into the CSS — L to 4 places, C to 4,
 * h to 1 — not a re-rounding of the full-precision object. That makes the DTCG document
 * and the stylesheet byte-comparable, so a rounding change in either one shows up as a
 * test failure rather than as two artefacts that quietly disagree in the fourth decimal.
 *
 * The full-precision triplet still ships, in $extensions. Nothing is lost, and the
 * lossy-but-portable value is the one downstream tools read.
 *
 * `hex` is the spec's optional fallback and it is worth including: Figma, Swift and
 * Compose have no OKLCH, so the hex is what they actually consume. It is generated by
 * the same toHex() the prover and the hero image use.
 */
function colourValue(c) {
  /* The spec puts hue in [0, 360) — 360 is not a legal value. Rounding 359.97 to one
   * decimal place gives 360.0, so fold it. Cannot happen at nilam's own hues; it can at
   * someone else's. */
  const h = round(c.h, 1) % 360;
  return {
    colorSpace: 'oklch',
    components: [round(c.L, 4), round(c.C, 4), h],
    alpha: 1,
    hex: toHex(c),
  };
}

const ext = (payload) => ({ [VENDOR]: payload });

/* One family — 12 steps plus its ink. */
function familyTokens(family, scale, mode) {
  const out = {
    $description: family === 'neutral'
      ? 'the neutral scale — a constant whisper of the brand hue (chroma 0.007) rather '
        + 'than a true grey, so a brand-tinted surface is expressible. `info` is an alias '
        + 'of this scale: it is the state that means nothing is wrong, and spending a hue '
        + 'on it buys a collision with the brand under deuteranopia.'
      : `the ${family} scale, hue ${round(scale[9].h, 1)}`,
  };

  for (let step = 1; step <= 12; step++) {
    const c = scale[step];
    const facts = {
      role: `step ${step}`,
      family,
      step,
      mode,
      cssVar: `--${family}-${step}`,
      /* Full precision, which the rounded $value cannot carry. This is also the witness
       * the round-trip assertion checks the hex against. */
      oklch: { L: c.L, C: c.C, h: c.h },
      solved: step !== 1,
    };

    if (step === 1) facts.anchor = true;
    else {
      const k = CONTRACT[step];
      const ratio = contrast(c, scale[k.against]);
      facts.contrast = {
        against: `color.${family}.${k.against}`,
        ratio: round(ratio, 2),
        ...(k.floor == null ? {} : { floor: k.floor, holds: ratio >= k.floor }),
        ...(k.wcag == null ? {} : { wcag: k.wcag }),
      };
    }

    if (step === 9) {
      /* The ink polarity is the fact that makes step 9 legible to a tool that cannot
       * see. `light` means near-white ink sits on this solid, `dark` means near-black.
       * It flips between modes and that flip is the whole two-brand-moments design. */
      const ink = inkFor(c);
      facts.ink = {
        token: `color.${family}.ink`,
        polarity: ink.L > 0.5 ? 'light' : 'dark',
        ratio: round(contrast(ink, c), 2),
        floor: 4.5,
        wcag: '1.4.3',
      };
      /* Dark mode only, and flagged as NOT derived. GLOW_L is the one number in the
       * system that was measured off two colours that work rather than solved, and an
       * export that hid that would be overclaiming. */
      if (mode === 'dark') facts.glow = { L: GLOW_L, derived: false };
    }

    out[String(step)] = {
      $value: colourValue(c),
      $description: ROLE[step],
      $extensions: ext(facts),
    };
  }

  const ink = inkFor(scale[9]);
  out.ink = {
    $value: colourValue(ink),
    $description: ROLE.ink,
    $extensions: ext({
      role: 'ink for step 9',
      family,
      mode,
      cssVar: `--${family}-ink`,
      oklch: { L: ink.L, C: ink.C, h: ink.h },
      polarity: ink.L > 0.5 ? 'light' : 'dark',
      contrast: {
        against: `color.${family}.9`,
        ratio: round(contrast(ink, scale[9]), 2),
        floor: 4.5,
        holds: contrast(ink, scale[9]) >= 4.5,
        wcag: '1.4.3',
      },
      solved: true,
    }),
  };

  return out;
}

/* The colour group for one mode. `surface` sits at the top of the group rather than
 * inside `neutral`, because that is where css.mjs puts it: one --surface, emitted under
 * the neutral family but not namespaced to it. Every family's scale object carries a
 * .surface, and only the neutral one is ever emitted — matching that exactly is what
 * keeps token parity with the stylesheet true. */
function colourGroup(palette, mode) {
  const group = {
    $type: 'color',
    $description: 'the solved palette. Every lightness here was found by inverting a '
      + 'contrast requirement, not chosen, so a step cannot exist at a value that breaks '
      + 'its contract.',
  };
  for (const f of FAMILIES) group[f] = familyTokens(f, palette[mode][f], mode);

  const s = palette[mode].neutral.surface;
  group.surface = {
    $value: colourValue(s),
    $description: ROLE.surface,
    $extensions: ext({
      role: 'raised surface',
      mode,
      cssVar: '--surface',
      oklch: { L: s.L, C: s.C, h: s.h },
      contrast: {
        against: 'color.neutral.1',
        ratio: round(contrast(s, palette[mode].neutral[1]), 3),
        note: 'achroma managed 1.044:1 here and I proved it invisible. This pairing '
          + 'separates on chroma as well as lightness, so it moves on two channels.',
      },
      solved: false,
    }),
  };
  /* --ink-max and --void, which sit beside surface for the same reason: css.mjs emits all
   * three under neutral but names them without a family prefix, and this export exists to
   * match the stylesheet exactly rather than to tidy it. `solved: false` on all three —
   * they are anchors the contracts are measured against, not values a contract produced. */
  for (const [name, c] of [
    ['ink-max', mode === 'light'
      ? { L: 0.16, C: 0, h: palette[mode].neutral[1].h }
      : { L: 1, C: 0, h: palette[mode].neutral[1].h }],
    ['void', mode === 'light'
      ? { L: 0.90, C: 0.007, h: palette[mode].neutral[1].h }
      : { L: 0.10, C: 0.007, h: palette[mode].neutral[1].h }],
  ]) {
    group[name] = {
      $value: colourValue(c),
      $description: ROLE[name],
      $extensions: ext({
        role: name === 'ink-max' ? 'maximum ink' : 'below the page',
        mode,
        cssVar: `--${name}`,
        oklch: { L: c.L, C: c.C, h: c.h },
        contrast: {
          against: name === 'ink-max' ? 'color.surface' : 'color.neutral.1',
          ratio: round(contrast(c, name === 'ink-max'
            ? palette[mode].neutral.surface
            : palette[mode].neutral[1]), 3),
        },
        solved: false,
      }),
    };
  }
  return group;
}

/* ── everything that is not a colour ─────────────────────────────────────────
 *
 * Read out of nilam.scale.css rather than retyped, because retyping is drift. The
 * NUMBERS in the emitted scale tokens are therefore always the shipped ones.
 *
 * The PROSE is not. Every $description below is hand-mirrored from the comments in
 * nilam.scale.css, and nothing checks that the two still agree — if someone rewrites the
 * reasoning behind --dur-1 in the stylesheet, this file will keep repeating the old
 * reasoning with the new number. That is the residual drift risk and it is worth naming.
 * What IS checked is coverage: the test asserts every custom property in the stylesheet
 * either becomes a token here or appears in SCALE_OMITTED below, so a property cannot go
 * missing silently.
 */

/* DTCG 2025.10 has eleven types and none of them is a string. There is no `dimension`
 * unit but `px` and `rem`, so an `em` or a `ch` value is genuinely inexpressible — not
 * awkward, inexpressible. Rather than emit a bare `number` and let a consumer write
 * `letter-spacing: -0.02` (which is invalid CSS), these are left out and declared. The
 * declaration ships in the document's root $extensions so the omission is discoverable
 * from the artefact and not only from this comment. */
export const SCALE_OMITTED = {
  'tracking-tight': 'unit `em`; DTCG dimension allows only px and rem',
  'tracking-normal': 'kept with its siblings; splitting the group would be worse than omitting it',
  'tracking-wide': 'unit `em`; DTCG dimension allows only px and rem',
  'tracking-micro': 'unit `em`; DTCG dimension allows only px and rem',
  measure: 'unit `ch`; DTCG dimension allows only px and rem',
};

/** Split on a separator that is at parenthesis depth zero. */
function splitTop(str, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const wordsTop = (str) => splitTop(str.replace(/\s+/g, ' '), ' ').filter(Boolean);

/** `--name: value;` out of a stylesheet, values read to the semicolon at depth zero so a
 *  multi-line shadow with nested light-dark() survives. Comments are stripped first. */
export function parseCustomProps(src) {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  const re = /--([a-zA-Z0-9-]+)\s*:/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    let i = re.lastIndex;
    let depth = 0;
    while (i < clean.length) {
      const ch = clean[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ';' && depth === 0) break;
      i++;
    }
    out.set(m[1], clean.slice(re.lastIndex, i).replace(/\s+/g, ' ').trim());
    re.lastIndex = i;
  }
  return out;
}

const LENGTH = /^(-?[\d.]+)(px|rem)?$/;

function dimension(tok) {
  const m = LENGTH.exec(tok);
  if (!m) throw new Error(`nilam/dtcg: cannot read "${tok}" as a DTCG dimension`);
  // A bare 0 has no unit in CSS and DTCG requires one. px and rem agree at zero.
  return { value: Number(m[1]), unit: m[2] ?? 'px' };
}

function parseOklch(fn) {
  const inner = fn.slice(fn.indexOf('(') + 1, fn.lastIndexOf(')'));
  const [coords, alpha] = splitTop(inner, '/');
  const [L, C, h] = wordsTop(coords).map(Number);
  return { L, C, h, alpha: alpha == null ? 1 : Number(alpha) };
}

/** A CSS colour out of the scale stylesheet, for one mode. Only the three forms that
 *  actually appear there: light-dark(), oklch(), and the `transparent` keyword. */
function cssColour(tok, mode) {
  if (tok.startsWith('light-dark(')) {
    const [l, d] = splitTop(tok.slice(11, tok.lastIndexOf(')')), ',');
    return cssColour(mode === 'light' ? l : d, mode);
  }
  if (tok === 'transparent') {
    return { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0, hex: '#000000' };
  }
  if (tok.startsWith('oklch(')) {
    const { L, C, h, alpha } = parseOklch(tok);
    return { colorSpace: 'oklch', components: [L, C, h], alpha, hex: toHex({ L, C, h }) };
  }
  throw new Error(`nilam/dtcg: cannot read "${tok}" as a DTCG color`);
}

/** `0 8px 20px -6px <colour>` or `inset 0 1px 0 <colour>` -> a DTCG shadow object. */
function shadowLayer(layer, mode) {
  const parts = wordsTop(layer);
  const inset = parts[0] === 'inset';
  const body = inset ? parts.slice(1) : parts;
  const lengths = body.filter((p) => LENGTH.test(p)).map(dimension);
  const colour = body.find((p) => !LENGTH.test(p));
  const zero = { value: 0, unit: 'px' };
  return {
    color: cssColour(colour, mode),
    offsetX: lengths[0] ?? zero,
    offsetY: lengths[1] ?? zero,
    blur: lengths[2] ?? zero,
    spread: lengths[3] ?? zero,
    ...(inset ? { inset: true } : {}),
  };
}

const shadowValue = (css, mode) => {
  const layers = splitTop(css, ',').map((l) => shadowLayer(l, mode));
  return layers.length === 1 ? layers[0] : layers;
};

function clampDimension(css) {
  const [min, preferred, max] = splitTop(css.slice(css.indexOf('(') + 1, css.lastIndexOf(')')), ',');
  return { min: dimension(min), max: dimension(max), preferred };
}

const cubicBezier = (css) =>
  splitTop(css.slice(css.indexOf('(') + 1, css.lastIndexOf(')')), ',').map(Number);

const fontFamily = (css) => splitTop(css, ',').map((f) => f.replace(/^['"]|['"]$/g, ''));

const SIZE_STEPS = ['000', '00', '0', '1', '2', '3', '4', '5', '6', '7', 'display'];

/* Per-token roles for the dimension groups. Every token needs one: a downstream tool that
 * is handed `radius.3 = 0.5rem` and nothing else has no way to know it is the default and
 * radius.1 is the nested inner corner. Absent from the CSS, where the group comment plus
 * ordering carries it and the names are read in context. */
const DIMENSION_ROLES = {
  '--space-0': 'the smallest gap there is — inside a badge, between an icon and its label',
  '--space-1': 'a tight gap inside a control',
  '--space-2': 'the default gap inside a control — button padding, input padding',
  '--space-3': 'the default gap between related controls',
  '--space-4': 'the default gap between blocks — the one to reach for first',
  '--space-5': 'between sections of a card',
  '--space-6': 'between cards',
  '--space-7': 'between major regions of a page',
  '--space-8': 'a page gutter',
  '--space-9': 'a hero gap; one or two per page at most',
  '--r-1': 'the innermost nested corner — a checkbox, a swatch inside a padded well',
  '--r-2': 'a small control — a badge, a tag',
  '--r-3': 'the default control radius — buttons, inputs, selects',
  '--r-4': 'a card sitting on the page',
  '--r-5': 'a raised surface — a popover, a menu',
  '--r-6': 'a dialog, or anything the page dims behind',
  '--r-full': 'a pill or a circle — switches, avatars, round icon buttons',
  '--line-1': 'a hairline — every border in the system unless it is being emphasised',
  '--line-2': 'an emphasised border — a selected tab, a focused field',
  '--ring-width': 'the focus ring itself',
  '--ring-offset': 'the gap between the ring and the thing it rings, which is what '
    + 'guarantees the colour adjacent to the ring is the page and not the control',
};

/* The same for everything else. A token whose $description is its own name is no better
 * than a bare number, and the role model is the part of this export worth having. */
const SCALE_ROLES = {
  '--weight-thin': 'the display size only. --text-display exists to be set at this weight — big AND bold reads as shouting, big alone reads as confidence',
  '--weight-light': 'body text in a design that wants a lighter voice. Check contrast first: a thin stroke measures worse than its colour predicts',
  '--weight-normal': 'body text and every control label',
  '--weight-medium': 'a label that needs to sit slightly forward — a table header, a tab',
  '--weight-semibold': 'headings, and the label on a filled button',
  '--weight-bold': 'reserved. Never on the display size, where size already carries it',
  '--leading-tight': 'the display size and large headings, where 1.6 would read as a gap',
  '--leading-snug': 'small headings and dense table rows',
  '--leading-normal': 'body text and prose — the default',
  '--leading-loose': 'long-form reading, where the eye needs help finding the next line',
  '--dur-0': 'a state change with no travel — a colour, a border, a hover',
  '--dur-1': 'the default. Roughly where a transition stops reading as "responding" and '
    + 'starts reading as "loading"',
  '--dur-2': 'something small that moves — a popover, a tooltip',
  '--dur-3': 'something that travels a distance — a drawer, a dialog',
  '--ease-out': 'anything entering. Fast then settling reads as arriving',
  '--ease-in-out': 'anything moving between two places it already occupied',
  '--ease-spring': 'anything the user directly caused, where a little overshoot reads as '
    + 'physical rather than as decoration',
  '--z-base': 'ordinary in-flow content',
  '--z-sticky': 'a pinned header or a sticky table column',
  '--z-overlay': 'a legacy overlay. Dialogs and popovers do not need this — they live in '
    + 'the browser top layer, which no z-index can reach',
  '--z-max': 'the escape hatch. If you need it, something else is wrong',
  '--font-sans': 'the UI stack. System fonts only: no webfont means no layout shift and '
    + 'no third-party request',
  '--font-mono': 'code, and any number that has to align in a column',
};

const SCALE_DESCRIPTIONS = {
  'type.size': 'a 1.2 minor-third ramp, fluid between a 360px and a 1280px viewport. 1.2 '
    + 'rather than 1.25 or 1.333 because the bigger ratios look better in a specimen and '
    + 'run out of room by the third size inside a dense card.',
  'type.family': 'system stacks. No webfont, so no layout shift and no third-party request.',
  'type.weight': 'four weights. The display size takes 200, never 700: large type gets its '
    + 'presence from size, and adding weight to both reads as shouting.',
  'type.leading': 'line height falls as size rises. One value cannot serve both — 1.6 on a '
    + 'display heading looks like a gap, 1.2 on body text is unreadable.',
  space: 'a 4px grid, in rem so it scales with the user\'s font size. Doubling from space-3 '
    + 'up: past 1rem the eye cannot tell 20px from 24px, so offering both invites '
    + 'inconsistency.',
  radius: 'radii must nest or corners look wrong in a way people notice but cannot name — '
    + 'an inner radius should be the outer minus the padding between them. Hence small gaps '
    + 'at the bottom of the scale, where nesting actually happens.',
  line: 'hairlines, as tokens, because 1px on a 3x display should not become 3 device '
    + 'pixels. Kept separate from radius so a theme can go borderless without touching '
    + 'anything else.',
  focus: 'the focus ring. The offset is not cosmetic: a ring flush against a filled button '
    + 'of similar lightness is invisible, and WCAG 1.4.11 wants 3:1 against ADJACENT '
    + 'colours — the gap guarantees the adjacent colour is the page.',
  'motion.duration': '150ms is roughly where a UI transition stops reading as "responding" '
    + 'and starts reading as "loading". The long ones are only for things that travel a '
    + 'distance — a drawer, a dialog.',
  'motion.ease': 'ease-out for anything entering, because fast-then-settling reads as '
    + 'arriving. The spring is for anything the user directly caused, where a little '
    + 'overshoot reads as physical rather than decorative.',
  z: 'four, and three are legacy. Dialogs and popovers live in the browser\'s top layer, '
    + 'which no z-index can reach, so most of the stacking bugs these solved no longer '
    + 'exist.',
  elevation: 'shadows, and the least obvious thing in the system. Browsers composite alpha '
    + 'in GAMMA-ENCODED sRGB, so black at 8% over a near-white page darkens it a lot and the '
    + 'same black over a near-black page changes almost nothing. Measured, the gap needed to '
    + 'LOOK equal is about 23x — which is why "our dark shadows look flat" is a universal '
    + 'complaint. Both answers ship: a heavier dark-mode shadow, and a top rim that only '
    + 'exists in dark mode.',
};

/** The mode-independent scales: type, space, radius, line, focus, motion, z. */
function scaleTokens(css) {
  const p = parseCustomProps(css);
  const get = (name) => {
    const v = p.get(name);
    if (v == null) throw new Error(`nilam/dtcg: nilam.scale.css has no --${name}`);
    return v;
  };

  const dimGroup = (names, path, rename = (n) => n) => {
    const g = { $type: 'dimension', $description: SCALE_DESCRIPTIONS[path] };
    for (const n of names) {
      const raw = get(n);
      const d = dimension(raw);
      const px = d.unit === 'rem' ? ` (${d.value * 16}px at a 16px root)` : '';
      g[rename(n)] = {
        $value: d,
        $description: `${DIMENSION_ROLES[`--${n}`]}. ${raw}${px}`,
        $extensions: ext({ cssVar: `--${n}`, css: raw }),
      };
    }
    return g;
  };

  const size = { $type: 'dimension', $description: SCALE_DESCRIPTIONS['type.size'] };
  for (const step of SIZE_STEPS) {
    const name = `text-${step}`;
    const raw = get(name);
    const { min, max, preferred } = clampDimension(raw);
    /* A fluid clamp() has no DTCG type. The value emitted is the WIDE end, because that
     * is the size a designer lays out against and the only one Figma, iOS or Compose can
     * hold — none of them has a viewport to interpolate against. Both ends and the fluid
     * term ship in $extensions, so nothing is lost, and the description says plainly that
     * the CSS token is not a single number. */
    size[step] = {
      $value: max,
      $description: `${step === 'display' ? 'the display size, for one thing per page' : `type step ${step}`}`
        + ' — FLUID in CSS. This is its value at a 1280px viewport; below that it '
        + 'interpolates down to the recorded minimum.',
      $extensions: ext({ cssVar: `--${name}`, css: raw, fluid: true, min, max, preferred }),
    };
  }

  const family = { $type: 'fontFamily', $description: SCALE_DESCRIPTIONS['type.family'] };
  for (const n of ['sans', 'mono']) {
    const raw = get(`font-${n}`);
    family[n] = {
      $value: fontFamily(raw),
      $description: SCALE_ROLES[`--font-${n}`],
      $extensions: ext({ cssVar: `--font-${n}`, css: raw }),
    };
  }

  const weight = { $type: 'fontWeight', $description: SCALE_DESCRIPTIONS['type.weight'] };
  for (const n of ['thin', 'light', 'normal', 'medium', 'semibold', 'bold']) {
    const raw = get(`weight-${n}`);
    weight[n] = {
      $value: Number(raw),
      $description: `${SCALE_ROLES[`--weight-${n}`]}. ${raw}`,
      $extensions: ext({ cssVar: `--weight-${n}`, css: raw }),
    };
  }

  const leading = { $type: 'number', $description: SCALE_DESCRIPTIONS['type.leading'] };
  for (const n of ['tight', 'snug', 'normal', 'loose']) {
    const raw = get(`leading-${n}`);
    leading[n] = {
      $value: Number(raw),
      $description: `${SCALE_ROLES[`--leading-${n}`]}. Line height ${raw}`,
      $extensions: ext({ cssVar: `--leading-${n}`, css: raw }),
    };
  }

  const duration = { $type: 'duration', $description: SCALE_DESCRIPTIONS['motion.duration'] };
  for (let i = 0; i <= 3; i++) {
    const raw = get(`dur-${i}`);
    duration[String(i)] = {
      $value: { value: Number(raw.replace('ms', '')), unit: 'ms' },
      $description: `${SCALE_ROLES[`--dur-${i}`]}. ${raw}`,
      $extensions: ext({ cssVar: `--dur-${i}`, css: raw }),
    };
  }

  const ease = { $type: 'cubicBezier', $description: SCALE_DESCRIPTIONS['motion.ease'] };
  for (const n of ['out', 'in-out', 'spring']) {
    const raw = get(`ease-${n}`);
    ease[n] = {
      $value: cubicBezier(raw),
      $description: SCALE_ROLES[`--ease-${n}`],
      $extensions: ext({ cssVar: `--ease-${n}`, css: raw }),
    };
  }

  const z = { $type: 'number', $description: SCALE_DESCRIPTIONS.z };
  for (const n of ['base', 'sticky', 'overlay', 'max']) {
    const raw = get(`z-${n}`);
    z[n] = {
      $value: Number(raw),
      $description: `${SCALE_ROLES[`--z-${n}`]}. z-index ${raw}`,
      $extensions: ext({ cssVar: `--z-${n}`, css: raw }),
    };
  }

  return {
    type: { size, family, weight, leading },
    space: dimGroup(
      Array.from({ length: 10 }, (_, i) => `space-${i}`), 'space',
      (n) => n.replace('space-', ''),
    ),
    radius: dimGroup(
      [...Array.from({ length: 6 }, (_, i) => `r-${i + 1}`), 'r-full'], 'radius',
      (n) => n.replace('r-', ''),
    ),
    line: dimGroup(['line-1', 'line-2'], 'line', (n) => n.replace('line-', '')),
    focus: dimGroup(['ring-width', 'ring-offset'], 'focus', (n) => n.replace('ring-', '')),
    motion: { duration, ease },
    z,
  };
}

/** The mode-dependent half of the scale: shadows, the rim, the scrim. */
function elevationTokens(css, mode) {
  const p = parseCustomProps(css);
  const g = { $description: SCALE_DESCRIPTIONS.elevation };

  for (const n of ['shadow-1', 'shadow-2', 'shadow-3']) {
    const raw = p.get(n);
    g[n] = {
      $type: 'shadow',
      $value: shadowValue(raw, mode),
      $description: `elevation ${n.slice(-1)} — ${mode === 'dark'
        ? 'an order of magnitude more alpha than light mode, because gamma-encoded '
          + 'compositing spends its precision at the dark end'
        : 'a light-mode shadow, kept faint; the page is bright so little alpha goes far'}`,
      $extensions: ext({ cssVar: `--${n}`, css: raw, mode }),
    };
  }

  const rim = p.get('rim');
  g.rim = {
    $type: 'shadow',
    $value: shadowValue(rim, mode),
    $description: 'a one-pixel inset top highlight. Transparent in light mode, where it '
      + 'would read as a scratch. In dark mode it is what makes a raised surface look '
      + 'raised, doing the job the shadow cannot.',
    $extensions: ext({ cssVar: '--rim', css: rim, mode }),
  };

  const scrim = p.get('scrim');
  g.scrim = {
    $type: 'color',
    $value: cssColour(scrim, mode),
    $description: 'the dialog backdrop. Heavier in light mode, because dimming a bright '
      + 'page needs more than dimming a dark one for the same perceived separation.',
    $extensions: ext({ cssVar: '--scrim', css: scrim, mode }),
  };

  const shadowColour = p.get('shadow-colour');
  g['shadow-colour'] = {
    $type: 'color',
    $value: cssColour(shadowColour, mode),
    $description: 'the base shadow colour. Black in both modes — it is the ALPHA that '
      + 'differs, not the hue.',
    $extensions: ext({ cssVar: '--shadow-colour', css: shadowColour, mode }),
  };

  return g;
}

/* ── the document ────────────────────────────────────────────────────────────── */

const scaleCssPath = () =>
  join(dirname(fileURLToPath(import.meta.url)), '..', 'nilam.scale.css');

/** Read nilam.scale.css, or take the source text straight from the caller. Failing loudly
 *  matters: a document with the colour half and no scales would look complete. */
function readScaleCss(opts) {
  if (typeof opts.scaleCss === 'string' && opts.scaleCss.includes('--')) return opts.scaleCss;
  try {
    return readFileSync(opts.scaleCss ?? scaleCssPath(), 'utf8');
  } catch (e) {
    throw new Error(
      `nilam/dtcg: could not read nilam.scale.css (${e.message}). The non-colour scales `
      + 'are read from it rather than retyped; pass { scaleCss } to override.',
    );
  }
}

function provenance(palette, opts, mode) {
  return {
    generator: 'nilam',
    spec: { format: DTCG_VERSION, color: DTCG_VERSION, resolver: DTCG_VERSION },
    brandHue: palette.brandHue,
    semanticHues: palette.semanticHues,
    ...(mode ? { mode } : {}),
    ...(opts.assertions == null ? {} : { assertions: opts.assertions }),
    solver: {
      method: 'every lightness was found by inverting a contrast requirement, not chosen',
      glowL: GLOW_L,
      glowDerived: false,
      gamut: 'sRGB only; no P3 yet, everything is gamut-clamped',
      contrastModel: 'WCAG 2.2 relative luminance (ISO/IEC 40500:2025). It ignores hue and '
        + 'chroma, which is why APCA was drafted; every floor here inherits that flaw.',
    },
    omittedFromScaleCss: SCALE_OMITTED,
  };
}

const DOC_DESCRIPTION = 'nilam — colour solved from contrast requirements and proven under '
  + 'protanopia, deuteranopia and tritanopia. GENERATED: change the hue and re-solve, do '
  + 'not hand-edit. Step 9 differs by mode on purpose; always pair it with the family '
  + 'ink token.';

/**
 * A DTCG 2025.10 document for a solved palette.
 *
 * @param palette          the output of solvePalette()
 * @param opts.mode        'light' | 'dark' -> a FLAT token document for that mode.
 *                         Omitted -> the RESOLVER document, which carries both modes.
 * @param opts.scaleCss    source text or path for nilam.scale.css
 * @param opts.assertions  prover assertion count, recorded as provenance
 */
export function toDtcg(palette, opts = {}) {
  const css = readScaleCss(opts);

  if (opts.mode != null) {
    if (!MODES.includes(opts.mode)) {
      throw new Error(`nilam/dtcg: mode must be 'light' or 'dark', got ${JSON.stringify(opts.mode)}`);
    }
    return {
      $description: `${DOC_DESCRIPTION} This is the ${opts.mode} context, flattened.`,
      $extensions: ext(provenance(palette, opts, opts.mode)),
      color: colourGroup(palette, opts.mode),
      elevation: elevationTokens(css, opts.mode),
      ...scaleTokens(css),
    };
  }

  /* The resolver. Theming is the one thing the Format module does not settle, and this is
   * the shape the DTCG chose in October 2025 to settle it: a `mode` modifier with two
   * named contexts, resolved after the mode-independent set. `default: 'light'` because
   * light is what an unstyled page gets; the CSS says the same thing with
   * `color-scheme: light dark`. */
  return {
    $schema: `https://www.designtokens.org/schemas/${DTCG_VERSION}/resolver.json`,
    version: DTCG_VERSION,
    name: 'nilam',
    description: DOC_DESCRIPTION,
    sets: {
      scale: {
        description: 'type, space, radius, lines, focus, motion and stacking. None of it '
          + 'depends on the mode, and none of it is solvable the way colour is — there is '
          + 'no contrast requirement to invert for "how big is a heading".',
        sources: [{
          $extensions: ext(provenance(palette, opts, null)),
          ...scaleTokens(css),
        }],
      },
    },
    modifiers: {
      mode: {
        description: 'light or dark. Step 9 and the elevation alphas genuinely differ '
          + 'between them; everything else in this modifier differs because the whole '
          + 'ramp is solved against a different page.',
        default: 'light',
        contexts: Object.fromEntries(MODES.map((mode) => [mode, [{
          color: colourGroup(palette, mode),
          elevation: elevationTokens(css, mode),
        }]])),
      },
    },
    resolutionOrder: [{ $ref: '#/sets/scale' }, { $ref: '#/modifiers/mode' }],
  };
}

/**
 * Walk a token document. Yields every token with its dotted path and the $type it
 * resolves to after group inheritance — which is the rule tools get wrong, so doing it
 * once here means the exporters and the tests cannot each get it wrong differently.
 */
export function* walkTokens(node, path = [], inherited = null) {
  const type = node.$type ?? inherited;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (child == null || typeof child !== 'object') continue;
    if ('$value' in child) {
      const p = [...path, key];
      yield { path: p, name: p.join('.'), token: child, type: child.$type ?? type };
    } else {
      yield* walkTokens(child, [...path, key], type);
    }
  }
}

/** The CSS custom property a token came from, or null. The link between the two artefacts. */
export const cssVarOf = (token) => token.$extensions?.[VENDOR]?.cssVar ?? null;
