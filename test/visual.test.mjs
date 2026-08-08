/* nilam — the visual suite.
 *
 * The other three suites measure numbers. This one looks at pixels, because the README's
 * Limitations section admits a whole class of defect the numbers cannot reach:
 *
 *   "A prover measures separation, not appropriateness. An earlier revision optimised
 *    separation until `danger` resolved to magenta, with every assertion passing. The hue
 *    windows in solve.mjs exist because of it. This class of error is only visible by
 *    rendering."
 *
 * Three real bugs from this project's history are the specification for what this has to
 * catch. None of them moved a number:
 *
 *   * `warn` solved to #8c731a, a dark olive-gold. Every contrast floor passed. It read as
 *     a fashion brand rather than as a warning.
 *   * `.n-btn[aria-busy]::before` took its ring from `color`, which is --brand-ink. On a
 *     ghost or outline button that is near-white on transparent, so the spinner was
 *     invisible — a button that looked like it had simply stopped working.
 *   * `.n-summary` was laid out with `justify-content: space-between`, which spread one
 *     sentence of question text across the full width of a card.
 *
 * A human found each of those, once. What a human cannot do is notice the RECURRENCE of
 * one on a Tuesday eight months later, and that is the entire job of this file.
 *
 * ── how it works ─────────────────────────────────────────────────────────────
 *
 *   node test/visual.test.mjs                 capture, compare, exit non-zero on change
 *   node test/visual.test.mjs --update        re-bless the baselines for this platform
 *   node test/visual.test.mjs --only=buttons  just the captures whose name contains that
 *   node test/visual.test.mjs --determinism   capture three times, require a zero diff
 *
 * Baselines are keyed by platform — baselines/darwin, baselines/linux — because they are
 * not portable and pretending otherwise is the fastest way to a suite everyone ignores.
 * The reason is font rasterisation: macOS and Ubuntu do not have the same fonts, and where
 * they do they do not hint them the same way, so every glyph edge differs and text wraps
 * at different words. That is not a tolerance you can widen your way out of; a threshold
 * loose enough to pass it is loose enough to pass a colour regression. See docs/visual.md.
 */

import { mkdirSync, readdirSync, existsSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { captureAll, SPECS, MIRRORED, MIN_LAYOUT_WIDTH, OUT, ROOT, findChrome } from './visual/capture.mjs';
import { readPng, compare, writePng, isRegression } from './visual/compare.mjs';

const here = dirname(fileURLToPath(import.meta.url));

let pass = 0;
const fails = [];
const check = (ok, msg) => { if (ok) pass++; else fails.push(msg); return ok; };

const flag = (name) => process.argv.includes(`--${name}`);
const opt = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

/* ── which baselines ─────────────────────────────────────────────────────────
 *
 * process.platform, not a hostname or a Chrome version. Those change too often to key a
 * committed directory on, and the thing that actually moves the pixels is the font stack
 * the OS provides. NILAM_VISUAL_PLATFORM exists for the case of generating one platform's
 * set from another's machine. */
const platform = opt('platform') ?? process.env.NILAM_VISUAL_PLATFORM ?? process.platform;
const baseDir = join(here, 'visual', 'baselines', platform);
const currentDir = join(OUT, 'current');
const diffDir = join(OUT, 'diff');

/* ── 1. the harness can still find what it captures ──────────────────────────
 *
 * Cheap greps, and they run first because every one of them is a way for the suite to
 * keep passing while measuring the wrong thing. A crop whose section was renamed, or a
 * mirror that has fallen behind the demo, produces a plausible screenshot of something
 * other than the showcase. */

const demo = readFileSync(join(ROOT, 'demo', 'index.html'), 'utf8');

for (const family of MIRRORED.families) {
  check(
    demo.includes(`'${family}'`),
    `capture.mjs paints a "${family}" scale strip but demo/index.html no longer mentions it — ` +
      `the crop and the showcase have diverged, so the baseline is of a page nobody sees`,
  );
}
for (const id of MIRRORED.ids) {
  check(
    demo.includes(`id="${id}"`) || demo.includes(`getElementById('${id}')`),
    `capture.mjs drives #${id} but demo/index.html has no such element — that capture is now empty`,
  );
}
for (const vision of MIRRORED.vision) {
  check(
    demo.includes(vision),
    `capture.mjs labels a colour-blindness card "${vision}" and demo/index.html does not — ` +
      `the simulation crop no longer matches the showcase`,
  );
}

/* The narrow capture is the only one whose whole point is the viewport width, and it is the
 * one Chrome will lie about: below 500px the screenshot is a CROP of a 500px layout, not a
 * narrower layout, and the result looks plausible while hiding the right-hand edge of every
 * card. Nothing in the image says so, hence an assertion. */
for (const spec of SPECS) {
  check(
    spec.w >= MIN_LAYOUT_WIDTH,
    `the "${spec.name}" capture asks for a ${spec.w}px viewport, and headless Chrome will not ` +
      `lay out below ${MIN_LAYOUT_WIDTH}px — you would get a ${spec.w}px crop of a ` +
      `${MIN_LAYOUT_WIDTH}px page with the right-hand side cut off, and it would look fine`,
  );
}

/* No @font-face anywhere is what makes the capture free of a web-font race. It is true by
 * accident rather than by policy, so assert it: the day someone adds one, this suite needs
 * a font-ready wait and the failure should say so rather than going quietly flaky. */
for (const sheet of readdirSync(ROOT).filter((f) => /^nilam.*\.css$/.test(f))) {
  check(
    !readFileSync(join(ROOT, sheet), 'utf8').includes('@font-face'),
    `${sheet} declares @font-face. The visual harness assumes system fonts only and has no ` +
      `document.fonts.ready wait, so captures will race the font load and diff at random`,
  );
}

/* The determinism story rests on beating an !important declaration inside
 * nilam.motion, and it beats it by injecting into that SAME layer — which only works while
 * nilam.motion is declared FIRST. If the layer order is ever rewritten,
 * the loaders start animating again and every loader baseline becomes a coin flip. */
const bundle = readFileSync(join(ROOT, 'nilam.css'), 'utf8');
check(
  /@layer nilam\.motion,\s*nilam\.tokens,\s*nilam\.base/.test(bundle),
  'nilam.css no longer declares nilam.motion as the FIRST cascade layer. The harness pauses ' +
    'the loaders with an !important in nilam.motion, and important declarations invert layer ' +
    'order — reorder the layers and the spinners animate through the screenshot again',
);
/* Longhand-only regex missed the SHORTHAND form the exemption now uses. `.n-spinner`
 * carries two simultaneous animations (the ring's breathe swap and the elapsed-time
 * wake/persist pair), so a longhand `animation-duration: X !important` would clobber both
 * instead of swapping just the one that's meant to change — hence
 * `.n-spinner::before { animation: n-breathe 1.4s ease-in-out infinite !important }`. This
 * check kept testing only the longhand pattern, so it reported the exemption gone even
 * though it was present (in shorthand). Accept either form. */
const motionCssText = readFileSync(join(ROOT, 'nilam.motion.css'), 'utf8');
check(
  /animation-iteration-count:\s*infinite\s*!important/.test(motionCssText) ||
    /animation:\s*[^;]*\binfinite\b[^;]*!important/.test(motionCssText),
  'the loader exemption from prefers-reduced-motion is gone from nilam.motion.css. That is ' +
    'a deliberate feature — a frozen spinner reads as a hung app — so either it regressed or ' +
    'this harness is now fighting a battle it no longer needs to',
);

/* ── 2. capture ───────────────────────────────────────────────────────────────── */

const filter = opt('only');
if (flag('update')) mkdirSync(baseDir, { recursive: true });
rmSync(currentDir, { recursive: true, force: true });
rmSync(diffDir, { recursive: true, force: true });

console.log(`\nnilam — visual, ${platform} baselines, Chrome at ${findChrome()}`);
const shots = await captureAll({ dir: currentDir, filter });
console.log(`  captured ${shots.length} of ${SPECS.length}`);

/* ── 3. determinism, on demand ───────────────────────────────────────────────
 *
 * Not part of every run: it triples the capture cost for a property that only changes when
 * the harness itself changes. CI runs it on its own platform, which is also how the Linux
 * side gets its determinism proved without any committed Linux baseline. */
if (flag('determinism')) {
  const runs = [currentDir];
  for (const n of [2, 3]) {
    const dir = join(OUT, `determinism-${n}`);
    rmSync(dir, { recursive: true, force: true });
    await captureAll({ dir, filter });
    runs.push(dir);
  }
  let worst = 0;
  for (const { name } of shots) {
    for (const n of [1, 2]) {
      const r = compare(readPng(join(runs[0], `${name}.png`)), readPng(join(runs[n], `${name}.png`)));
      worst = Math.max(worst, r.changed);
      check(
        r.changed === 0,
        `${name} is not deterministic: run 1 and run ${n + 1} of the SAME page differ by ` +
          `${r.changed} pixels. Every baseline is a coin flip until this is zero — find the ` +
          `animation, transition, caret or font load that is still moving`,
      );
    }
  }
  console.log(`  determinism: 3 captures of each page, worst diff ${worst} pixels`);
}

/* ── 4. every capture still fits inside its frame ────────────────────────────
 *
 * A screenshot is the whole page clipped to --window-size, so a page that has grown past
 * its frame loses the bottom silently: the pixels above the cut still match, the diff is
 * clean, and nobody is looking at the part that changed. This runs before the comparison
 * and before blessing, because a truncated capture must never become a baseline.
 *
 * "Flat" rather than "identical", and the tolerance is measured not guessed. The modal's
 * ::backdrop paints the whole frame with a 2px blur behind it, and the blur leaves the
 * final column one unit darker than the other 979 pixels — 157,157,161 against
 * 157,157,162. Demanding an exact match failed on that one pixel. Real content on the last
 * row (a glyph, a card edge, a border) is tens of units away, not one. */
for (const { name, file } of shots) {
  const png = readPng(file);
  const o = (png.height - 1) * png.width * 4;
  let off = 0;
  for (let x = 1; x < png.width; x++) {
    const q = o + x * 4;
    const d = Math.max(
      Math.abs(png.data[q] - png.data[o]),
      Math.abs(png.data[q + 1] - png.data[o + 1]),
      Math.abs(png.data[q + 2] - png.data[o + 2]),
    );
    if (d > 3) off++;
  }
  check(off <= png.width * 0.01,
    `${name} has content on its very last row (${off} of ${png.width} pixels are not the ` +
    `page colour), so its frame is too short and anything below the cut is invisible to ` +
    `this suite. Raise h for that spec in test/visual/capture.mjs`);
}

/* ── 5. compare, or bless ───────────────────────────────────────────────────── */

/* An EMPTY baseline directory is a different situation from a MISSING image in a populated
 * one, and conflating them is how a visual suite ends up permanently red or permanently
 * useless. Nothing is committed for a platform until somebody has looked at the images on
 * it, and no machine can do the looking — so on a platform with no blessed set at all this
 * captures, says so as a GitHub annotation, and exits 0. The determinism assertions above
 * still gate, so the job is not decorative.
 *
 * The moment one image exists in the directory, that stops: a missing image is then a spec
 * somebody added without blessing, and it fails. No workflow edit is needed for the switch
 * from bootstrapping to gating; committing the PNGs is the switch. */
const blessed = existsSync(baseDir) ? readdirSync(baseDir).filter((f) => f.endsWith('.png')) : [];

if (flag('update')) {
  for (const { name, file } of shots) copyFileSync(file, join(baseDir, `${name}.png`));
  console.log(`\n  blessed ${shots.length} baseline(s) into ${baseDir}`);
  console.log('  LOOK AT THEM. A wrong baseline is worse than no baseline: it locks the bug in.');
} else if (blessed.length === 0) {
  console.log(
    `::warning title=No ${platform} visual baselines::` +
    `${shots.length} captures were taken and none could be compared, because ` +
    `test/visual/baselines/${platform}/ is empty. Download the "visual-captures-${platform}" ` +
    `artefact from this run, look at every image, and commit them to that directory. Until ` +
    `then this job proves determinism only — it cannot catch a regression.`,
  );
  console.log(`\n  no ${platform} baselines yet: ${shots.length} captures written to ${currentDir}`);
  console.log(`  nothing was compared. Bless them with \`node test/visual.test.mjs --update\` on a`);
  console.log(`  ${platform} machine, or from this run's artefact, after looking at each one.`);
} else {
  mkdirSync(diffDir, { recursive: true });
  const worst = [];

  for (const { name, file } of shots) {
    const baseline = join(baseDir, `${name}.png`);
    if (!existsSync(baseline)) {
      check(false,
        `no baseline for ${name} on ${platform}. Run \`node test/visual.test.mjs --update\`, ` +
        `then LOOK at test/visual/baselines/${platform}/${name}.png before committing it`);
      continue;
    }

    const result = compare(readPng(baseline), readPng(file));
    const bad = isRegression(result);
    worst.push({ name, ...result, bad });

    if (bad) {
      const diffFile = join(diffDir, `${name}.png`);
      writePng(diffFile, result.diff);
      check(false,
        `${name} changed: ${result.changed} pixels (${(result.ratio * 100).toFixed(3)}%)` +
        (result.sizeChanged ? `, and the frame size moved — the page grew or shrank` : '') +
        `\n        baseline ${baseline}` +
        `\n        now      ${file}` +
        `\n        diff     ${diffFile}  (red = moved, magenta = only one image covers it)`);
    } else {
      pass++;
    }
  }

  const moved = worst.filter((w) => w.changed > 0).sort((a, b) => b.changed - a.changed);
  if (moved.length) {
    console.log('\n  pixels moved:');
    for (const w of moved) {
      console.log(`    ${w.name.padEnd(30)} ${String(w.changed).padStart(9)}  ${(w.ratio * 100).toFixed(3)}%  ${w.bad ? 'FAIL' : 'within tolerance'}`);
    }
  }
}

/* ── report ──────────────────────────────────────────────────────────────────── */

console.log(`\n  ${pass + fails.length} assertions`);
if (fails.length) {
  console.log(`  ${fails.length} FAILED:`);
  for (const f of fails) console.log(`    - ${f}`);
  if (!flag('update')) {
    console.log(`\n  If the change is intended, re-bless with:  node test/visual.test.mjs --update`);
    console.log(`  Then look at every image it wrote before committing it.`);
  }
  process.exit(1);
}
console.log('  all passed');
