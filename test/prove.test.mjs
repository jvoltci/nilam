/* nilam — the test suite.
 *
 * Two jobs, and the second one is the one that actually catches releases.
 *
 *   1. Re-run the prover against a freshly solved palette. Catches a regression in the
 *      solver.
 *   2. Assert things about the SHIPPED ARTEFACTS — the emitted CSS, the bundle, and
 *      package.json. Catches everything the prover structurally cannot see: a token that
 *      never made it into the file, a stylesheet missing from "files", a bundle that
 *      drifted from its parts.
 *
 * Job 2 exists because achroma shipped 0.2.0 with its entire component layer absent from
 * package.json "files". Every colour assertion was green. The package was broken.
 */

import { readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { solvePalette, solveSemanticHues, inkFor, NILAM_HUE, GLOW_L } from '../src/solve.mjs';
import { prove, proveStatusChannels, proveDichromacy } from '../src/prove.mjs';
import { contrast, contrastIn, hexToOklch, toHex, fmt, fmtIn, gammaDecode, maxChroma, maxChromaIn } from '../src/colour.mjs';
import { toCss } from '../src/css.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
const fails = [];
const check = (ok, msg) => { if (ok) pass++; else fails.push(msg); return ok; };

/* ── 1. the solver still keeps its promises ──────────────────────────────── */

const chosen = solveSemanticHues(NILAM_HUE);
const palette = solvePalette(NILAM_HUE, { semanticHues: chosen.hues });
const proof = prove(palette);
pass += proof.count - proof.failures.length;
fails.push(...proof.failures);

/* ── 2. the signature is what we said it is ──────────────────────────────── */

check(palette.brandHue === 285, `brand hue is ${palette.brandHue}, not 285`);

/* The glow. Its whole justification is that it sits at the lightness Zima Blue and the
 * Telepathy accent share, so assert the DISTANCE to them rather than a hex — a hex would
 * pin the value without recording why it is that value. */
const glow = palette.dark.brand[9];
check(
  Math.abs(glow.L - GLOW_L) < 0.001,
  `the dark solid is at L ${glow.L.toFixed(3)}, not the glow band ${GLOW_L} — solveSolid stopped using it`,
);
for (const [name, hex, maxDelta] of [
  ['the Telepathy accent', '#8b7cf6', 0.02],
  ['Zima Blue’s lightness', '#009fe3', 0.02],
]) {
  const ref = hexToOklch(hex);
  check(
    Math.abs(glow.L - ref.L) <= maxDelta,
    `the glow is at L ${glow.L.toFixed(3)} but ${name} (${hex}) is at L ${ref.L.toFixed(3)} — ` +
      `the reference this number was measured from no longer agrees with it`,
  );
}

/* Two brand moments, and they must be genuinely different. If a refactor ever collapses
 * them back to one lightness, this is the assertion that says so. */
const solid = palette.light.brand[9];
check(
  glow.L - solid.L > 0.05,
  `light and dark solids are only ${(glow.L - solid.L).toFixed(3)} apart in lightness — ` +
    `the two-moment design has collapsed back to one value`,
);

/* Polarity. The whole reason step 9 is mode-dependent. */
check(
  inkFor(solid).L > 0.5,
  `the LIGHT-mode solid ${toHex(solid)} takes dark ink — a light button on a light page is not an object`,
);
check(
  inkFor(glow).L < 0.5,
  `the DARK-mode solid ${toHex(glow)} takes white ink — it is not the glow, it is a pigment stain`,
);

/* warn must still be amber. This is the assertion I did not have when the solver shipped
 * #8c731a, a dark olive-gold, with every other test green. Chroma alone does not catch
 * it; the lightness is what makes an amber read as amber. */
for (const mode of ['light', 'dark']) {
  const w = palette[mode].warn[9];
  check(
    w.L > 0.6,
    `${mode}: warn-9 is at L ${w.L.toFixed(3)} (${toHex(w)}) — below 0.6 an amber reads as olive-brown, not as a warning`,
  );
}

/* ── 3. every collapsing status carries a non-hue channel ────────────────── */

/* The consequence of the collapse list, asserted. These are the channels the component
 * layer actually provides — .n-badge-glyph and .n-note-glyph on every status variant,
 * plus .n-error's ⚠ pseudo-element. If someone strips a glyph from the CSS, this stays
 * green and lies, so assertion 4 below greps the stylesheet for them too. */
const CHANNELS = {
  danger: ['colour', 'glyph'],
  warn: ['colour', 'glyph'],
  ok: ['colour', 'glyph'],
  info: ['colour', 'glyph'],
};
for (const mode of ['light', 'dark']) {
  proveStatusChannels(proveDichromacy(mode, palette), CHANNELS);
}

/* ── 4. the emitted CSS actually contains what we solved ─────────────────── */

const css = toCss(palette, { assertions: proof.count });

/* Parse light-dark() back out and re-verify the contrast in BOTH modes from the file, not
 * from the objects. This is the step that would have caught a formatter bug silently
 * swapping the two arguments — in which case every colour object is right and every
 * shipped byte is wrong. */
const parsed = { light: new Map(), dark: new Map() };
for (const m of css.matchAll(/--([a-z0-9-]+):\s*light-dark\(\s*(oklch\([^)]*\))\s*,\s*(oklch\([^)]*\))\s*\)/g)) {
  parsed.light.set(m[1], m[2]);
  parsed.dark.set(m[1], m[3]);
}
check(parsed.light.size > 70, `only ${parsed.light.size} tokens parsed out of the emitted CSS — the emitter changed shape`);

const num = (s) => {
  const [L, C, h] = s.replace(/oklch\(|\)/g, '').trim().split(/\s+/).map(Number);
  return { L, C, h: h || 0 };
};

for (const mode of ['light', 'dark']) {
  for (const family of ['neutral', 'brand', 'danger', 'warn', 'ok', 'info']) {
    // The file must agree with the solver, token by token.
    for (let n = 1; n <= 12; n++) {
      const key = `${family}-${n}`;
      const inFile = parsed[mode].get(key);
      check(inFile != null, `${mode}: --${key} is missing from the emitted CSS`);
      if (inFile) {
        check(
          inFile === fmt(palette[mode][family][n]),
          `${mode}: --${key} is ${inFile} in the CSS but ${fmt(palette[mode][family][n])} in the solver`,
        );
      }
    }

    // And the contracts must hold when measured from the FILE.
    const at = (n) => num(parsed[mode].get(`${family}-${n}`));
    const ink = num(parsed[mode].get(`${family}-ink`));
    check(contrast(at(11), at(3)) >= 4.5,
      `${mode}/${family}: body text on a component surface is ${contrast(at(11), at(3)).toFixed(2)}:1 as emitted`);
    check(contrast(at(12), at(1)) >= 7,
      `${mode}/${family}: strong text on the page is ${contrast(at(12), at(1)).toFixed(2)}:1 as emitted`);
    check(contrast(at(9), at(1)) >= 3,
      `${mode}/${family}: the solid is ${contrast(at(9), at(1)).toFixed(2)}:1 on the page as emitted (WCAG 1.4.11)`);
    check(contrast(ink, at(9)) >= 4.5,
      `${mode}/${family}: --${family}-ink is ${contrast(ink, at(9)).toFixed(2)}:1 on the solid as emitted — the button cannot be labelled`);
  }
}

/* light-dark() has no fallback, so if it ever stops being emitted the whole palette
 * silently becomes colourless. Assert the mechanism, not just the values. */
check(css.includes('light-dark('), 'the emitted CSS no longer uses light-dark() — every token would need two blocks again');
check(/color-scheme:\s*light dark/.test(css), 'the root does not set `color-scheme: light dark`, so light-dark() cannot resolve and no colour will paint');
check(/\.dark[^{]*\{\s*color-scheme:\s*dark/.test(css), '.dark no longer sets color-scheme, so forcing dark mode does nothing');

/* ── 4b. the wide-gamut block, audited where it SHIPS ─────────────────────
 *
 * build.mjs already proves the P3 palette — 500 assertions against P3 luminance. That is
 * not enough, and the reason is the rule this file keeps relearning: an assertion that
 * shares its premise with the thing it audits is not an audit. Those 500 measure the
 * solver's OBJECTS. What a P3 display paints is the `color(display-p3 r g b)` string in the
 * emitted file, after a matrix multiply, a gamma encode, a clamp and a round to 5 places.
 *
 * So this parses those strings back out of the CSS and re-derives the ratios from the
 * shipped digits. It would catch a transposed matrix row, a missing gamma encode, or a
 * rounding step that quietly pushed a border under 3:1 — none of which the object-level
 * assertions can see, because every one of them happens after the objects are done.
 */

const p3Palette = solvePalette(NILAM_HUE, { semanticHues: chosen.hues, gamut: 'display-p3' });
const cssP3 = toCss(palette, { assertions: proof.count, p3: p3Palette });

check(/@media \(color-gamut: p3\)/.test(cssP3), 'the emitted CSS has no @media (color-gamut: p3) block — wide-gamut support silently vanished');
check(
  cssP3.includes('color(display-p3'),
  'the P3 block emits no color(display-p3 …) values. oklch() there would be re-mapped by the browser, so the painted colour would not be the colour that was proven',
);

/* Parse the P3 block only, so sRGB tokens above cannot be mistaken for it. */
const p3Section = cssP3.slice(cssP3.indexOf('@media (color-gamut: p3)'));
const p3Tokens = { light: new Map(), dark: new Map() };
const P3_RE = /--([a-z0-9-]+):\s*light-dark\(\s*color\(display-p3([^)]*)\)\s*,\s*color\(display-p3([^)]*)\)\s*\)/g;
for (const m of p3Section.matchAll(P3_RE)) {
  p3Tokens.light.set(m[1], m[2].trim().split(/\s+/).map(Number));
  p3Tokens.dark.set(m[1], m[3].trim().split(/\s+/).map(Number));
}
check(p3Tokens.light.size > 70, `only ${p3Tokens.light.size} P3 tokens parsed out of the emitted block`);

/* Relative luminance from the SHIPPED digits: gamma-decode, then the Display-P3 luminance
 * coefficients. Not the sRGB triple — P3 has different primaries, so 0.2126/0.7152/0.0722
 * would silently misreport every ratio here. */
const p3Y = ([r, g, b]) =>
  0.2289745641 * gammaDecode(r) + 0.6917385218 * gammaDecode(g) + 0.0792869141 * gammaDecode(b);
const p3Ratio = (a, b) => {
  const [hi, lo] = p3Y(a) >= p3Y(b) ? [p3Y(a), p3Y(b)] : [p3Y(b), p3Y(a)];
  return (hi + 0.05) / (lo + 0.05);
};

for (const mode of ['light', 'dark']) {
  for (const fam of ['neutral', 'brand', 'danger', 'warn', 'ok', 'info']) {
    const at = (n) => p3Tokens[mode].get(`${fam}-${n}`);
    const ink = p3Tokens[mode].get(`${fam}-ink`);
    for (let n = 1; n <= 12; n++) {
      check(at(n) != null, `P3 ${mode}: --${fam}-${n} is missing from the wide-gamut block`);
      if (at(n)) {
        check(
          at(n).length === 3 && at(n).every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
          `P3 ${mode}: --${fam}-${n} is ${JSON.stringify(at(n))} — a channel outside [0,1] means the gamut clamp did not run`,
        );
      }
    }
    if (!at(1) || !ink) continue;

    /* The same four contracts the sRGB block is held to, re-derived from P3 digits. */
    check(p3Ratio(at(11), at(3)) >= 4.5,
      `P3 ${mode}/${fam}: body text on a component surface is ${p3Ratio(at(11), at(3)).toFixed(2)}:1 as emitted (WCAG 1.4.3)`);
    check(p3Ratio(at(12), at(1)) >= 7,
      `P3 ${mode}/${fam}: strong text on the page is ${p3Ratio(at(12), at(1)).toFixed(2)}:1 as emitted`);
    check(p3Ratio(at(9), at(1)) >= 3,
      `P3 ${mode}/${fam}: the solid is ${p3Ratio(at(9), at(1)).toFixed(2)}:1 on the page as emitted (WCAG 1.4.11)`);
    check(p3Ratio(at(7), at(3)) >= 3,
      `P3 ${mode}/${fam}: the control border is ${p3Ratio(at(7), at(3)).toFixed(2)}:1 on a component surface as emitted (WCAG 1.4.11)`);
    check(p3Ratio(ink, at(9)) >= 4.5,
      `P3 ${mode}/${fam}: --${fam}-ink is ${p3Ratio(ink, at(9)).toFixed(2)}:1 on the solid as emitted — the button cannot be labelled`);
  }
}

/* P3 must actually BUY something, or the whole block is 9 kB of duplication. It must also
 * never buy less: a gamut that contains sRGB cannot have a smaller boundary anywhere, so a
 * P3 chroma below the sRGB one means a matrix is wrong rather than a trade-off being made. */
let richer = 0;
for (const mode of ['light', 'dark']) {
  for (const fam of ['brand', 'danger', 'warn', 'ok']) {
    const s = palette[mode][fam][9];
    const w = p3Palette[mode][fam][9];
    check(
      w.C >= s.C - 1e-6,
      `P3 ${mode}/${fam}: step 9 chroma is ${w.C.toFixed(4)} in P3 but ${s.C.toFixed(4)} in sRGB — ` +
        `P3 contains sRGB, so it cannot be narrower. A gamut matrix is transposed.`,
    );
    if (w.C > s.C + 1e-4) richer++;
  }
}
check(richer >= 6, `only ${richer} of 8 status/brand solids gained chroma in P3 — the block is not earning its bytes`);

/* ── 5. the package ships what it claims ─────────────────────────────────── */

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/* Every stylesheet in the repo must be in BOTH "files" and "exports". achroma 0.2.0
 * shipped without its component layer because a stray `git checkout` reverted
 * package.json and nothing noticed. Never again. */
const sheets = readdirSync(root).filter((f) => /^nilam.*\.css$/.test(f));
check(sheets.length >= 5, `only found ${sheets.length} nilam*.css files, expected at least 5`);
for (const name of sheets) {
  check((pkg.files ?? []).includes(name), `${name} exists but is missing from package.json "files" — it will not be published`);
  check(
    Object.values(pkg.exports ?? {}).includes(`./${name}`),
    `${name} exists but no package.json "exports" entry points at it — consumers cannot import it`,
  );
}
for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
  check(existsSync(join(root, target)), `exports["${subpath}"] points at ${target}, which does not exist`);
}

/* ── the tarball, not the working tree ────────────────────────────────────
 *
 * Everything above this point inspects the working directory, and 0.1.0 proved that is
 * not the same question. The publish happened, and only THEN were nilam.tailwind.css and
 * assets/ added to "files" and "exports". So the shipped tarball had no tailwind bridge
 * while exports["./tailwind.css"] pointed straight at it, and every assertion here stayed
 * green because on disk the file was present and listed.
 *
 * A consumer running `@import 'nilam/tailwind.css'` got a resolve failure. Discovered by
 * migrating a real app, which is one migration too late.
 *
 * `npm pack --dry-run --json` reports exactly what WOULD be published, so this asks the
 * packer rather than the filesystem. It is the same lesson as the border bug forty lines
 * up: an assertion that shares its premise with the thing it audits is not an audit. */
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }));
  const shipped = new Set((packed[0]?.files ?? []).map((f) => f.path));
  check(shipped.size > 0, 'npm pack reported no files at all');

  for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
    const rel = target.replace(/^\.\//, '');
    check(
      shipped.has(rel),
      `exports["${subpath}"] -> ${rel} is NOT in the tarball npm would publish. ` +
        `A consumer importing it gets a resolve error, and every on-disk check passes anyway.`,
    );
  }
  check(shipped.has(pkg.bin.nilam.replace(/^\.\//, '')), `bin.nilam is not in the tarball — npx nilam would fail`);
  for (const name of sheets) {
    check(shipped.has(name), `${name} is not in the tarball npm would publish`);
  }
} catch (err) {
  // Never let a missing npm binary silently turn this into a passing suite.
  fails.push(`could not verify the tarball with \`npm pack --dry-run\`: ${err.message}`);
}
check(existsSync(join(root, pkg.bin.nilam)), `bin.nilam points at ${pkg.bin.nilam}, which does not exist`);

/* The bundle is generated by concatenation, so it must contain its parts. A hand-edited
 * bundle that has drifted from the sources is the failure this catches. */
if (existsSync(join(root, 'nilam.css'))) {
  const bundle = readFileSync(join(root, 'nilam.css'), 'utf8');
  for (const part of ['nilam.scale.css', 'nilam.base.css', 'nilam.components.css']) {
    const src = readFileSync(join(root, part), 'utf8');
    // Compare a distinctive interior line rather than the whole file, so a header
    // comment change does not fail the build.
    const probe = src.split('\n').find((l) => l.trim().startsWith('--') || l.includes('{'));
    check(bundle.includes(probe.trim()), `nilam.css does not contain ${part} — run \`npm run build\``);
  }
  const tokens = readFileSync(join(root, 'nilam.tokens.css'), 'utf8');
  check(
    bundle.includes('light-dark(') && tokens.includes('light-dark('),
    'the bundle or the tokens file lost its light-dark() values',
  );
  // Layer order must be declared exactly once in the bundle, or the cascade is undefined.
  const layerDecls = [...bundle.matchAll(/@layer nilam\.motion, nilam\.tokens/g)].length;
  check(layerDecls === 1, `the bundle declares the layer order ${layerDecls} times, expected exactly 1`);
}

/* Every status variant in the component layer must actually paint a glyph, because
 * assertion 3 promises the channel exists and only this checks that it does. */
const components = readFileSync(join(root, 'nilam.components.css'), 'utf8');
for (const status of ['ok', 'warn', 'danger', 'info']) {
  check(
    new RegExp(`\\.n-badge-${status}\\s+\\.n-badge-glyph`).test(components),
    `.n-badge-${status} has no glyph rule — the prover says ${status} collapses under dichromacy and requires a second channel (WCAG 1.4.1)`,
  );
  check(
    new RegExp(`\\.n-note-${status}\\s+\\.n-note-glyph`).test(components),
    `.n-note-${status} has no glyph rule — the prover says ${status} collapses under dichromacy and requires a second channel (WCAG 1.4.1)`,
  );
}

/* ── 6. the CLI emits the same thing the build does ──────────────────────
 *
 * src/cli.mjs carried its own copy of toCss() for several commits. The build emitted one
 * light-dark() block with cascade layers and a P3 media query; the CLI emitted separate
 * :root and .dark blocks with neither. The `npx nilam --css=` in the README therefore
 * produced a materially worse file than `npm run build`, and every assertion in this file
 * passed, because none of them ran the CLI.
 *
 * Two code paths that must agree, and nothing checking that they do. So: run it. */
{
  const out = join(tmpdir(), `nilam-cli-${process.pid}.css`);
  try {
    execFileSync(process.execPath, [join(root, 'src/cli.mjs'), '285', `--css=${out}`],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const cli = readFileSync(out, 'utf8');
    for (const [needle, why] of [
      ['light-dark(', 'the CLI is not emitting light-dark() — it has its own stale emitter again'],
      ['@layer nilam.tokens', 'the CLI output has no cascade layers, so consumers cannot override it without !important'],
      ['@media (color-gamut: p3)', 'the CLI output has no wide-gamut block'],
      ['--brand-ink', 'the CLI output has no ink token, so filled buttons cannot be labelled safely'],
      ['--surface', 'the CLI output has no --surface, so the untinted card is inexpressible'],
    ]) {
      check(cli.includes(needle), `${why} (missing "${needle}")`);
    }
    // Byte-identical to the library path, or they have started to drift again.
    check(
      cli === toCss(palette, { p3: p3Palette }),
      'the CLI output differs from toCss() — the two emitters have drifted apart again',
    );
    rmSync(out, { force: true });
  } catch (err) {
    fails.push(`the CLI failed to run: ${err.message}`);
  }
}

/* ── 7. the loader exemption is in a layer that can actually win ──────────
 *
 * !important declarations resolve in REVERSE cascade-layer order. So the reduced-motion
 * exemption that keeps loaders alive has to sit in a layer declared BEFORE nilam.base, whose
 * blanket rule is `animation-duration: 0.01ms !important` on *. It sat in nilam.components —
 * one layer AFTER base — for three releases, lost every contest, and froze every loader,
 * while the comment beside it stated the opposite. Found by an app, not by this file.
 *
 * A frozen spinner is not reduced motion. It reads as an app that has hung.
 *
 * This asserts the mechanism rather than the rendering: that the exemption lives in
 * nilam.motion, that nilam.motion is declared first, and that every animated loader is
 * covered by BOTH duration and iteration-count. The second was its own hidden bug — the
 * skeleton was absent from the iteration-count selector, so it breathed exactly once and
 * settled, which for a skeleton is worse than not animating at all. */
{
  const motion = readFileSync(join(root, 'nilam.motion.css'), 'utf8');
  const components = readFileSync(join(root, 'nilam.components.css'), 'utf8');
  const bundle = readFileSync(join(root, 'nilam.css'), 'utf8');

  const order = /@layer ([^;]+);/.exec(bundle)?.[1].split(',').map((x) => x.trim()) ?? [];
  check(order[0] === 'nilam.motion',
    `nilam.motion is at position ${order.indexOf('nilam.motion')} in the layer order, not first — ` +
      `its !important rules will lose to nilam.base and every loader will freeze under prefers-reduced-motion`);
  check(order.indexOf('nilam.motion') < order.indexOf('nilam.base'),
    'nilam.motion is declared after nilam.base, so it cannot win an !important contest against it');

  check(/@layer nilam\.motion\s*\{/.test(motion), 'nilam.motion.css does not open @layer nilam.motion');
  check(!/prefers-reduced-motion/.test(components),
    'the reduced-motion exemption is back in nilam.components, where it loses to nilam.base');

  // Every animated loader needs BOTH properties overridden, or base pins one of them.
  /* Comments stripped FIRST. The header comment quotes nilam.base's blanket rule verbatim,
   * including a `@media (prefers-reduced-motion: reduce) { * { … } }`, so the naive regex
   * matched the prose and parsed a sentence as a rule block. */
  const code = motion.replace(/\/\*[\s\S]*?\*\//g, '');
  /* And strip the @media's own opening brace, or the first [^{}]+ match is the whitespace
   * before it and every selector gets paired with the PREVIOUS rule's declarations — an
   * off-by-one that reported three real, correct rules as missing. */
  const reduce = (/@media \(prefers-reduced-motion: reduce\)([\s\S]*)$/.exec(code)?.[1] ?? '')
    .replace(/^\s*\{/, '');
  for (const sel of ['.n-spinner', '.n-skeleton', '.n-bar::after', '.n-dots i']) {
    const blocks = [...reduce.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter((m) => m[1].includes(sel)).map((m) => m[2]).join(' ');
    check(/animation-duration:[^;]*!important/.test(blocks),
      `${sel} has no !important animation-duration under reduce — nilam.base pins it to 0.01ms and it freezes`);
    check(/animation-iteration-count:\s*infinite\s*!important/.test(blocks),
      `${sel} has no !important animation-iteration-count under reduce — nilam.base pins it to 1, so it runs once and settles`);
  }
}

/* ── report ──────────────────────────────────────────────────────────────── */

console.log(`\nnilam — hue ${palette.brandHue}, semantics ${JSON.stringify(palette.semanticHues)}`);
console.log(`  glow  ${toHex(glow)}  L ${glow.L.toFixed(3)}  (Telepathy accent #8b7cf6 is L ${hexToOklch('#8b7cf6').L.toFixed(3)})`);
console.log(`  solid ${toHex(solid)}  L ${solid.L.toFixed(3)}`);
console.log(`\n  ${pass + fails.length} assertions`);
if (fails.length) {
  console.log(`  ${fails.length} FAILED:`);
  for (const f of fails) console.log(`    - ${f}`);
  process.exit(1);
}
console.log('  all passed');
