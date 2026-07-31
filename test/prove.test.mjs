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

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { solvePalette, solveSemanticHues, inkFor, NILAM_HUE, GLOW_L } from '../src/solve.mjs';
import { prove, proveStatusChannels, proveDichromacy } from '../src/prove.mjs';
import { contrast, hexToOklch, toHex, fmt } from '../src/colour.mjs';
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
  const layerDecls = [...bundle.matchAll(/@layer nilam\.tokens, nilam\.base/g)].length;
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
