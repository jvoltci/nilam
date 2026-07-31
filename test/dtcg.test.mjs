/* nilam — the DTCG export test suite.
 *
 * Same shape as test/prove.test.mjs, and the same reason for existing: a token export is
 * a SECOND artefact carrying the same promises, and the failure mode of a second artefact
 * is that it drifts from the first while every assertion about the first stays green.
 *
 * Five jobs:
 *
 *   1. TOKEN PARITY, both directions. The emitted CSS and the emitted DTCG must contain
 *      exactly the same set of colour tokens. Not "the DTCG has at least everything" —
 *      equal, because a token that exists only in the JSON is a promise the stylesheet
 *      does not keep, and a token that exists only in the CSS is one the JSON does not.
 *   2. ROUND-TRIP. The hex fallback must decode back to the OKLCH the solver produced,
 *      and the components must be the exact numbers the CSS carries.
 *   3. THE CONTRACTS, re-measured from the DTCG values. Same as the prover, but reading
 *      the shipped JSON rather than the solver's objects — so a formatter bug that swapped
 *      two components fails here even though every colour object was right.
 *   4. STRUCTURAL CONFORMANCE to DTCG 2025.10. Checked against the spec's rules by hand,
 *      because there is no published JSON Schema for token documents to validate against —
 *      only for resolvers. That is a gap in the ecosystem, not a shortcut here.
 *   5. THE ADAPTERS. Figma names legal and in range, Swift and Kotlin complete.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { solvePalette, solveSemanticHues, inkFor, NILAM_HUE } from '../src/solve.mjs';
import { prove } from '../src/prove.mjs';
import { contrast, distance, hexToOklch, fmt } from '../src/colour.mjs';
import { toCss } from '../src/css.mjs';
import {
  toDtcg, walkTokens, cssVarOf, parseCustomProps, SCALE_OMITTED, DTCG_VERSION, VENDOR,
} from '../src/dtcg.mjs';
import {
  toStyleDictionary, toFigmaVariables, toSwift, toKotlin,
} from '../src/export.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
const fails = [];
const check = (ok, msg) => { if (ok) pass++; else fails.push(msg); return ok; };

const MODES = ['light', 'dark'];
const FAMILIES = ['neutral', 'brand', 'danger', 'warn', 'ok', 'info'];

const chosen = solveSemanticHues(NILAM_HUE);
const palette = solvePalette(NILAM_HUE, { semanticHues: chosen.hues });
const proof = prove(palette);

const css = toCss(palette, { assertions: proof.count });
const doc = { light: toDtcg(palette, { mode: 'light' }), dark: toDtcg(palette, { mode: 'dark' }) };
const resolver = toDtcg(palette, { assertions: proof.count });

const tokensOf = (d) => new Map([...walkTokens(d)].map((t) => [t.name, t]));
const all = { light: tokensOf(doc.light), dark: tokensOf(doc.dark) };

/* ── 1. token parity with the stylesheet, both directions ───────────────────────
 *
 * The CSS is the artefact that has been shipping, so it is the reference. Its family
 * list is parsed out of the file rather than hard-coded here, which is what makes this
 * catch the case dtcg.mjs is most exposed to: it keeps its own copy of the FAMILIES
 * constant, so a seventh family added to css.mjs and not to dtcg.mjs has to fail
 * somewhere, and this is that somewhere.
 */
const inCss = new Set();
for (const m of css.matchAll(/--([a-z0-9-]+):\s*light-dark\(/g)) inCss.add(`--${m[1]}`);
check(inCss.size >= 79, `only ${inCss.size} tokens parsed out of the emitted CSS — the emitter changed shape and this comparison is no longer meaningful`);

const colourTokens = (mode) =>
  [...all[mode].values()].filter((t) => t.path[0] === 'color');

for (const mode of MODES) {
  const inDtcg = new Set();
  for (const t of colourTokens(mode)) {
    const v = cssVarOf(t.token);
    check(v != null, `${mode}: ${t.name} carries no cssVar in its $extensions — nothing ties it back to the stylesheet, so parity cannot be checked for it`);
    if (v) inDtcg.add(v);
  }

  for (const v of inCss) {
    check(inDtcg.has(v), `${mode}: ${v} exists in the stylesheet but NOT in the DTCG export — a consumer importing the tokens gets a palette with a hole in it`);
  }
  for (const v of inDtcg) {
    check(inCss.has(v), `${mode}: ${v} exists in the DTCG export but NOT in the stylesheet — the JSON promises a token the CSS never defines`);
  }
  check(
    inDtcg.size === inCss.size,
    `${mode}: the stylesheet has ${inCss.size} colour tokens and the DTCG export has ${inDtcg.size} — the two artefacts describe different systems`,
  );
}

/* ── 2. the values round-trip ──────────────────────────────────────────────────── */

const solverColour = (mode, path) => {
  if (path[1] === 'surface') return palette[mode].neutral.surface;

  /* ink-max and void are RESTATED here rather than imported, and the duplication is the point.
   * This block is a round-trip check: it asks whether the emitted bytes match an independent
   * statement of what they should be. Importing the same constant css.mjs uses would make both
   * sides wrong together and the assertion would pass regardless — which is the failure mode
   * this whole suite exists to catch elsewhere. If these ever disagree with css.mjs, one of
   * the two is wrong and the test is doing its job. */
  const h = palette[mode].neutral[1].h;
  if (path[1] === 'ink-max') {
    return mode === 'light' ? { L: 0.16, C: 0, h } : { L: 1, C: 0, h };
  }
  if (path[1] === 'void') {
    return mode === 'light' ? { L: 0.90, C: 0.007, h } : { L: 0.10, C: 0.007, h };
  }
  const scale = palette[mode][path[1]];
  return path[2] === 'ink' ? inkFor(scale[9]) : scale[Number(path[2])];
};

for (const mode of MODES) {
  for (const t of colourTokens(mode)) {
    const v = t.token.$value;
    const src = solverColour(mode, t.path);

    /* The components must be byte-identical to what fmt() writes into the CSS, not merely
     * close to it. Two artefacts that agree to three decimals and differ in the fourth is
     * the failure this forbids. */
    const asCss = `oklch(${v.components[0].toFixed(4)} ${v.components[1].toFixed(4)} ${v.components[2].toFixed(1)})`;
    check(
      asCss === fmt(src),
      `${mode}: ${t.name} is ${asCss} in the DTCG export but ${fmt(src)} in the stylesheet — the same colour is being shipped as two different colours`,
    );

    /* The hex is the fallback every platform without OKLCH actually consumes — Figma,
     * Swift, Compose. If it decodes to a different colour than the components, those
     * platforms silently get a palette whose contrast was never proven. 8-bit
     * quantisation is the only slack allowed.
     *
     * Measured in OKLab, not as separate L/C/h tolerances. I tried the tolerances first
     * and they were the wrong instrument, for the same reason prove.mjs measures
     * dichromatic collapse in OKLab rather than by contrast: at chroma 0.03 an 8-bit
     * rounding moves the HUE ANGLE by two degrees while moving the colour by almost
     * nothing, so a per-channel hue bound fails five legitimate tokens. Distance bounds
     * all three channels at once and degrades correctly as chroma falls.
     *
     * 0.004 is measured, not chosen: the worst round-trip in the whole palette is 0.00195
     * (dark neutral surface, #202020), so this is roughly a factor of two of headroom. A
     * failure here means real corruption, not rounding. */
    const back = hexToOklch(v.hex);
    const d = distance(back, src);
    check(
      d < 0.004,
      `${mode}: ${t.name} hex ${v.hex} decodes ${d.toFixed(5)} away in OKLab from the colour the solver produced (${fmt(src)}) — every platform reading the hex fallback gets a colour the prover never saw`,
    );
    /* Lightness separately, because contrast depends on it alone and the distance above
     * would let a pure-L error hide behind a chroma one. */
    check(
      Math.abs(back.L - src.L) < 0.003,
      `${mode}: ${t.name} hex ${v.hex} decodes to L ${back.L.toFixed(4)} against the solver's ${src.L.toFixed(4)} — the ratios were proven at the other lightness`,
    );

    /* And the full-precision triplet in $extensions has to be the solver's, unrounded.
     * It is what a downstream tool must use if it wants to re-solve rather than re-measure. */
    const ex = t.token.$extensions[VENDOR].oklch;
    check(
      ex.L === src.L && ex.C === src.C && ex.h === src.h,
      `${mode}: ${t.name} records oklch(${ex.L} ${ex.C} ${ex.h}) in $extensions, which is not what the solver produced`,
    );
  }
}

/* ── 3. the contracts, measured from the DTCG values ──────────────────────────── */

const asColour = (t) => {
  const [L, C, h] = t.token.$value.components;
  return { L, C, h };
};

/* Guarded rather than indexed straight. Section 1 already reports a missing token by
 * name; if this section then dereferenced it, the run would die on a TypeError and print
 * a stack trace instead of the sentence that says what broke. A suite that crashes tells
 * you less than one that fails. */
for (const mode of MODES) {
  for (const family of FAMILIES) {
    const missing = [...Array.from({ length: 12 }, (_, i) => i + 1), 'ink']
      .filter((s) => !all[mode].has(`color.${family}.${s}`));
    if (missing.length) {
      check(false, `${mode}/${family}: ${missing.map((s) => `step ${s}`).join(', ')} absent from the export, so its contracts cannot be measured at all`);
      continue;
    }
    const at = (step) => asColour(all[mode].get(`color.${family}.${step}`));
    const ink = at('ink');

    check(contrast(at(11), at(3)) >= 4.5,
      `${mode}/${family}: body text on a component surface is ${contrast(at(11), at(3)).toFixed(2)}:1 as exported — WCAG 1.4.3 fails for anyone consuming the tokens`);
    check(contrast(at(12), at(1)) >= 7,
      `${mode}/${family}: strong text on the page is ${contrast(at(12), at(1)).toFixed(2)}:1 as exported`);
    check(contrast(at(9), at(1)) >= 3,
      `${mode}/${family}: the solid is ${contrast(at(9), at(1)).toFixed(2)}:1 on the page as exported (WCAG 1.4.11) — the filled button does not read as an object`);
    check(contrast(at(7), at(1)) >= 3,
      `${mode}/${family}: the control border is ${contrast(at(7), at(1)).toFixed(2)}:1 as exported (WCAG 1.4.11) — inputs have no findable edge`);
    check(contrast(ink, at(9)) >= 4.5,
      `${mode}/${family}: ${family}-ink is ${contrast(ink, at(9)).toFixed(2)}:1 on the solid as exported — the button cannot be labelled`);

    /* Polarity. The one thing about step 9 a downstream tool cannot work out for itself,
     * so it is stated in $extensions — and a stated fact that is wrong is worse than one
     * that is absent.
     *
     * My first version of this asserted light mode -> light ink for EVERY family, and it
     * failed on warn and on ok. The assertion was wrong, not the export: solveSolid
     * compares both ink candidates and keeps the more chromatic solid, and for an amber
     * no lightness exists where the colour is both still amber and able to carry white
     * text — that is the whole reason the old solver produced #8c731a, a dark olive-gold.
     * Green at hue 142 behaves the same way. So the invariant is not "light mode means
     * white ink"; it is that the DECLARED polarity matches the ink actually shipped, and
     * that the BRAND — the one hue the design promises will invert — really does invert. */
    const facts = all[mode].get(`color.${family}.9`).token.$extensions[VENDOR];
    const shipped = ink.L > 0.5 ? 'light' : 'dark';
    check(
      facts.ink.polarity === shipped,
      `${mode}/${family}: step 9 declares ink polarity "${facts.ink.polarity}" but ships ${family}-ink at L ${ink.L} — a consumer trusting the declaration puts unreadable text on the button`,
    );
    if (family === 'brand') {
      check(
        shipped === (mode === 'light' ? 'light' : 'dark'),
        `${mode}: the brand solid takes ${shipped} ink — the two-brand-moments design says a filled button inverts the polarity of its page, and it no longer does`,
      );
    }
  }

  /* Every recorded ratio must be the ratio you get by measuring the exported values. A
   * stale number in $extensions is a lie that reads like a proof. */
  for (const t of colourTokens(mode)) {
    const c = t.token.$extensions[VENDOR].contrast;
    if (c?.against == null) continue;
    const other = all[mode].get(c.against);
    if (!check(other != null, `${mode}: ${t.name} records a ratio against ${c.against}, which is not a token in this document`)) continue;
    const measured = contrast(asColour(t), asColour(other));
    check(
      Math.abs(measured - c.ratio) < 0.02,
      `${mode}: ${t.name} claims ${c.ratio}:1 against ${c.against} but measures ${measured.toFixed(2)}:1 from its own exported values`,
    );
    if (c.floor != null) {
      check(measured >= c.floor, `${mode}: ${t.name} is ${measured.toFixed(2)}:1 against ${c.against}, below its declared floor of ${c.floor}`);
      check(c.holds === true, `${mode}: ${t.name} ships with holds:false — the export is telling consumers its own contract is broken`);
    }
  }
}

/* ── 4. structural conformance to DTCG 2025.10 ─────────────────────────────────── */

/* The eleven types the Format module defines. Notably absent: string and boolean — which
 * is why the em-based tracking tokens and the ch-based measure are omitted rather than
 * smuggled through as text. */
const TYPES = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'typography', 'gradient',
]);
const COLOUR_SPACES = new Set([
  'srgb', 'srgb-linear', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'display-p3',
  'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50',
]);
const RESERVED = new Set(['$value', '$type', '$description', '$extensions', '$deprecated', '$extends', '$ref', '$root']);

function validateNames(node, path, where) {
  for (const key of Object.keys(node)) {
    if (key.startsWith('$')) {
      check(RESERVED.has(key), `${where}: ${[...path, key].join('.')} uses "${key}", which is not one of the eight $-properties DTCG 2025.10 reserves — a conforming tool is free to reject the file`);
      continue;
    }
    check(
      !/[{}.]/.test(key),
      `${where}: the name "${key}" at ${path.join('.') || '<root>'} contains one of { } or . — DTCG forbids all three because they are the alias syntax, so references to this token cannot be written`,
    );
    const child = node[key];
    if (child && typeof child === 'object' && !('$value' in child)) {
      validateNames(child, [...path, key], where);
    }
  }
}

function validateValue({ name, token, type }, where) {
  if (!check(type != null && TYPES.has(type), `${where}: ${name} resolves to $type "${type}" — DTCG 2025.10 does not define it, and the spec forbids guessing a type from the value`)) return;
  const v = token.$value;

  if (type === 'color') {
    check(COLOUR_SPACES.has(v.colorSpace), `${where}: ${name} declares colorSpace "${v.colorSpace}", which is not one of the fourteen DTCG allows`);
    check(Array.isArray(v.components) && v.components.length === 3, `${where}: ${name} has ${v.components?.length} colour components, not 3`);
    if (v.colorSpace === 'oklch') {
      const [L, C, h] = v.components;
      check(L >= 0 && L <= 1, `${where}: ${name} has OKLCH lightness ${L}, outside the 0..1 the spec allows`);
      check(C >= 0, `${where}: ${name} has negative chroma ${C}`);
      check(h >= 0 && h < 360, `${where}: ${name} has hue ${h}; DTCG puts hue in [0, 360) and 360 is not legal`);
    }
    check(v.alpha >= 0 && v.alpha <= 1, `${where}: ${name} has alpha ${v.alpha}, outside 0..1`);
    check(/^#[0-9a-f]{6}$/.test(v.hex), `${where}: ${name} has hex "${v.hex}" — the spec wants 6-digit CSS hex notation, which is the fallback every platform without OKLCH reads`);
  }

  if (type === 'dimension') {
    check(typeof v.value === 'number' && Number.isFinite(v.value), `${where}: ${name} has a non-numeric dimension value`);
    check(v.unit === 'px' || v.unit === 'rem', `${where}: ${name} uses unit "${v.unit}" — DTCG dimension allows only px and rem, so an em or ch value cannot be expressed at all`);
  }

  if (type === 'duration') {
    check(typeof v.value === 'number', `${where}: ${name} has a non-numeric duration value`);
    check(v.unit === 'ms' || v.unit === 's', `${where}: ${name} uses duration unit "${v.unit}", not ms or s`);
  }

  if (type === 'cubicBezier') {
    check(Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number'), `${where}: ${name} is not four numbers`);
    if (Array.isArray(v) && v.length === 4) {
      check(v[0] >= 0 && v[0] <= 1 && v[2] >= 0 && v[2] <= 1, `${where}: ${name} has an x coordinate outside 0..1, which the spec restricts (y is free, which is what lets the spring overshoot)`);
    }
  }

  if (type === 'fontWeight') {
    check(typeof v === 'number' && v >= 1 && v <= 1000, `${where}: ${name} is ${v}; a numeric fontWeight must be 1..1000`);
  }

  if (type === 'fontFamily') {
    check(Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.length > 0), `${where}: ${name} is not a non-empty list of family names`);
  }

  if (type === 'number') {
    check(typeof v === 'number' && Number.isFinite(v), `${where}: ${name} is not a finite number`);
  }

  if (type === 'shadow') {
    for (const layer of Array.isArray(v) ? v : [v]) {
      for (const k of ['color', 'offsetX', 'offsetY', 'blur', 'spread']) {
        check(layer[k] != null, `${where}: ${name} is missing "${k}" — the shadow composite type names all five sub-values and a consumer cannot default them`);
      }
    }
  }

  check(token.$description != null && token.$description.length > 10, `${where}: ${name} has no $description — the role model is the valuable part of this export, and a token without its role is just a hex code`);

  const keys = Object.keys(token.$extensions ?? {});
  check(keys.length > 0, `${where}: ${name} carries no $extensions, so the measured facts behind it are gone`);
  for (const k of keys) {
    check(
      /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(k),
      `${where}: ${name} has $extensions key "${k}" — the spec requires a vendor-specific key and asks for reverse domain notation, or two tools will collide`,
    );
  }
}

for (const mode of MODES) {
  const where = `${mode} document`;
  check(doc[mode].$value === undefined, `${where}: the root object has a $value, which makes the whole document a token instead of a group`);
  check(doc[mode].$schema === undefined, `${where}: the root carries $schema, which is not one of the reserved $-properties for token documents — there is no published token schema to point at`);
  validateNames(doc[mode], [], where);
  for (const t of walkTokens(doc[mode])) validateValue(t, where);
  check([...all[mode].values()].length > 130, `${where}: only ${all[mode].size} tokens — the non-colour scales are missing`);
}

/* The resolver. This is the part the spec DOES pin down, and the only part with a
 * published JSON Schema to name. */
check(resolver.version === DTCG_VERSION, `the resolver declares version "${resolver.version}"; the spec requires exactly "${DTCG_VERSION}"`);
check(typeof resolver.$schema === 'string' && resolver.$schema.includes(`${DTCG_VERSION}/resolver.json`), 'the resolver has no $schema pointing at the 2025.10 resolver schema, so nothing can validate it');
check(Array.isArray(resolver.resolutionOrder) && resolver.resolutionOrder.length > 0, 'the resolver has no resolutionOrder — without it no set or modifier participates and it resolves to nothing');
for (const entry of resolver.resolutionOrder ?? []) {
  const ref = entry.$ref ?? '';
  const target = ref.replace(/^#\//, '').split('/');
  check(
    target.length === 2 && resolver[target[0]]?.[target[1]] != null,
    `the resolver's resolutionOrder points at "${ref}", which does not exist in the document`,
  );
}
const mod = resolver.modifiers?.mode;
check(mod != null, 'the resolver has no "mode" modifier — theming is the whole reason a resolver exists here');
for (const m of MODES) {
  check(Array.isArray(mod?.contexts?.[m]) && mod.contexts[m].length > 0, `the resolver's mode modifier has no "${m}" context`);
}
check(mod?.contexts?.[mod?.default] != null, `the resolver defaults to mode "${mod?.default}", which is not one of its contexts`);
check(
  Array.isArray(resolver.sets?.scale?.sources) && resolver.sets.scale.sources.length > 0,
  'the resolver\'s scale set has no sources — a set MUST have them',
);

/* The resolver and the flat documents must agree token for token. Two code paths emit
 * them and only this stops one from getting ahead of the other. */
for (const mode of MODES) {
  const merged = new Map([
    ...walkTokens(resolver.sets.scale.sources[0]),
    ...walkTokens(resolver.modifiers.mode.contexts[mode][0]),
  ].map((t) => [t.name, t]));
  check(
    merged.size === all[mode].size,
    `${mode}: the resolver resolves to ${merged.size} tokens but the flat document has ${all[mode].size} — the two emit paths have drifted`,
  );
  for (const [name, t] of all[mode]) {
    const other = merged.get(name);
    if (!check(other != null, `${mode}: ${name} is in the flat document but not in the resolver`)) continue;
    check(
      JSON.stringify(other.token) === JSON.stringify(t.token),
      `${mode}: ${name} differs between the resolver and the flat document`,
    );
  }
}

/* JSON is the interchange format, so the documents have to survive being it. An undefined
 * or a NaN anywhere disappears on stringify and takes a token with it. */
for (const [label, d] of [['light', doc.light], ['dark', doc.dark], ['resolver', resolver]]) {
  const round = JSON.parse(JSON.stringify(d));
  check(
    JSON.stringify(round) === JSON.stringify(d),
    `the ${label} document does not survive a JSON round trip — something in it is undefined, NaN or otherwise not JSON`,
  );
}

/* ── 5. the non-colour scales are complete ────────────────────────────────────────
 *
 * The scale tokens are read out of nilam.scale.css rather than retyped, so the numbers
 * cannot drift. What CAN happen is a property being added to the stylesheet and never
 * reaching the export. Every custom property must therefore be accounted for: exported,
 * or explicitly declared inexpressible.
 */
const scaleCss = readFileSync(join(root, 'nilam.scale.css'), 'utf8');
const scaleProps = parseCustomProps(scaleCss);
check(scaleProps.size > 60, `only ${scaleProps.size} custom properties parsed out of nilam.scale.css — the parser has stopped matching the file`);

const exportedVars = new Set(
  [...all.light.values()].map((t) => cssVarOf(t.token)).filter(Boolean),
);
for (const name of scaleProps.keys()) {
  check(
    exportedVars.has(`--${name}`) || name in SCALE_OMITTED,
    `--${name} is in nilam.scale.css but neither exported as a token nor declared in SCALE_OMITTED — it has gone missing silently, which is the one thing this export must not do`,
  );
}
for (const name of Object.keys(SCALE_OMITTED)) {
  check(
    scaleProps.has(name),
    `SCALE_OMITTED declares --${name} inexpressible, but nilam.scale.css no longer defines it — the omission list is documenting a token that does not exist`,
  );
}
for (const t of all.light.values()) {
  const v = cssVarOf(t.token);
  if (t.path[0] === 'color') continue;
  check(
    scaleProps.has(v.slice(2)),
    `${t.name} claims to come from ${v}, which is not a custom property in nilam.scale.css`,
  );
}
/* The omission list has to be visible from the artefact, not only from the source. */
check(
  Object.keys(resolver.sets.scale.sources[0].$extensions[VENDOR].omittedFromScaleCss).length
    === Object.keys(SCALE_OMITTED).length,
  'the emitted document does not carry the list of omitted custom properties, so a consumer cannot tell what is missing',
);

/* ── 6. the adapters ──────────────────────────────────────────────────────────── */

const sd = toStyleDictionary(palette, { assertions: proof.count });
check(Object.keys(sd).length === 2, `toStyleDictionary emitted ${Object.keys(sd).length} files, expected one per mode`);
for (const [name, d] of Object.entries(sd)) {
  check(name.endsWith('.tokens.json'), `${name} does not use the .tokens.json extension Style Dictionary v5 expects for DTCG input`);
  check([...walkTokens(d)].length === all.light.size, `${name} has a different token count from the flat document it should be`);
}

const figma = toFigmaVariables(palette);
const figmaNames = figma.variables.map((v) => v.name);
check(new Set(figmaNames).size === figmaNames.length, 'toFigmaVariables emits duplicate variable names — Figma requires them unique within a collection and will reject the request');
for (const name of figmaNames) {
  check(!/[.{}]/.test(name), `the Figma variable "${name}" contains one of . { } — Figma rejects all three`);
}
const figmaColours = figma.variables.filter((v) => v.resolvedType === 'COLOR');
check(
  figmaColours.length === inCss.size,
  `Figma gets ${figmaColours.length} colour variables against the stylesheet's ${inCss.size} — the palette arrives in Figma incomplete`,
);
const byVar = new Map();
for (const v of figma.variableModeValues) {
  byVar.set(v.variableId, (byVar.get(v.variableId) ?? 0) + 1);
}
for (const v of figma.variables) {
  check(byVar.get(v.id) === 2, `the Figma variable "${v.name}" has ${byVar.get(v.id) ?? 0} mode values, not one per mode — Figma leaves the missing mode empty`);
}
for (const mv of figma.variableModeValues) {
  if (typeof mv.value !== 'object') continue;
  for (const ch of ['r', 'g', 'b']) {
    check(mv.value[ch] >= 0 && mv.value[ch] <= 1, `a Figma colour channel is ${mv.value[ch]}; Figma wants 0..1 and will reject anything else`);
  }
}
/* The polarity inversion is the design idea most likely to be flattened by an exporter
 * that solves one value and reuses it. Assert it survived the trip into Figma. */
const brand9 = figma.variables.find((v) => v.name === 'color/brand/9');
const brand9Values = figma.variableModeValues.filter((v) => v.variableId === brand9.id);
check(
  JSON.stringify(brand9Values[0].value) !== JSON.stringify(brand9Values[1].value),
  'color/brand/9 has the same value in both Figma modes — the two brand moments have collapsed into one and a dark-mode button is a pigment stain',
);
const brandInk = figma.variables.find((v) => v.name === 'color/brand/ink');
const inkValues = figma.variableModeValues.filter((v) => v.variableId === brandInk.id);
check(
  inkValues[0].value.r > 0.5 && inkValues[1].value.r < 0.5,
  'color/brand/ink is not near-white in light mode and near-dark in dark mode — the ink token no longer inverts and a filled button loses its label',
);
check(
  figma.variableModes.filter((m) => m.action === 'CREATE').length === 1
    && figma.variableModes.filter((m) => m.action === 'UPDATE').length === 1,
  'the Figma request creates both modes — creating a collection with initialModeId already creates that mode, so the first must be UPDATEd and only the second CREATEd or the request fails',
);

const swift = toSwift(palette, { assertions: proof.count });
check(
  (swift.match(/public static let /g) ?? []).length === inCss.size,
  `the Swift export declares ${(swift.match(/public static let /g) ?? []).length} colours against the stylesheet's ${inCss.size}`,
);
/* SwiftUI has no dynamic-colour primitive, so both platform branches have to be there. A
 * Swift export that emitted one flat value per token would compile, ship, and lose the
 * mode inversion silently — which is the failure worth guarding. */
check(swift.includes('UIColor { traits in'), 'the Swift export lost its UIColor(dynamicProvider:) branch, so on iOS every token would be one fixed value regardless of mode');
check(swift.includes('NSColor(name: nil)'), 'the Swift export lost its NSColor(name:dynamicProvider:) branch, so on macOS every token would be one fixed value regardless of mode');
for (const family of FAMILIES) {
  check(swift.includes(`public static let ${family}9 `), `the Swift export is missing ${family}9 — the solid is the one token nobody can do without`);
  check(swift.includes(`public static let ${family}Ink `), `the Swift export is missing ${family}Ink, so the only correct way to label a filled button is unavailable`);
}

const kotlin = toKotlin(palette, { assertions: proof.count });
check(
  (kotlin.match(/^    val /gm) ?? []).length === inCss.size,
  `the Kotlin data class has ${(kotlin.match(/^    val /gm) ?? []).length} fields against the stylesheet's ${inCss.size} colours`,
);
check(kotlin.includes('public fun nilamLightColors()') && kotlin.includes('public fun nilamDarkColors()'), 'the Kotlin export no longer emits both factories, so one mode is unreachable');
for (const family of FAMILIES) {
  check(new RegExp(`\\b${family}9 = Color\\(0xFF[0-9A-F]{6}\\)`).test(kotlin), `the Kotlin export has no ${family}9 colour literal`);
}
/* Compose colours are 8-bit ARGB, so the only thing to verify is that they are the same
 * 8 bits the browser paints. */
for (const family of FAMILIES) {
  const m = new RegExp(`\\b${family}9 = Color\\(0xFF([0-9A-F]{6})\\)`).exec(kotlin);
  const hex = `#${m[1].toLowerCase()}`;
  check(
    hex === all.light.get(`color.${family}.9`).token.$value.hex,
    `Kotlin ships ${family}9 as ${hex} but the DTCG hex is ${all.light.get(`color.${family}.9`).token.$value.hex} — Android and the web are painting different colours`,
  );
}

/* ── report ──────────────────────────────────────────────────────────────────── */

console.log(`\nnilam — DTCG ${DTCG_VERSION} export, hue ${palette.brandHue}`);
console.log(`  ${all.light.size} tokens per mode  ·  ${inCss.size} colour tokens, parity with the stylesheet both ways`);
console.log(`  ${Object.keys(SCALE_OMITTED).length} custom properties declared inexpressible: ${Object.keys(SCALE_OMITTED).join(', ')}`);
console.log(`  resolver: 1 set, 1 modifier, ${MODES.length} contexts`);
console.log(`\n  ${pass + fails.length} assertions`);
if (fails.length) {
  console.log(`  ${fails.length} FAILED:`);
  for (const f of fails) console.log(`    - ${f}`);
  process.exit(1);
}
console.log('  all passed');
