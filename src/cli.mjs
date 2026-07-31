#!/usr/bin/env node
/* nilam CLI: solve a palette from one hue, prove it, emit CSS.
 *
 *   npx nilam                          solve hue 285, prove, print the report
 *   npx nilam 262                      any hue
 *   npx nilam 262 --css=tokens.css     write the stylesheet
 *   npx nilam 262 -v                   show the hex of every step
 *   npx nilam 262 --no-p3              skip the wide-gamut block
 *   npx nilam 262 --brand-locked       the hue is a brand asset and cannot move
 *
 * Most hues FAIL by default, and that is a finding rather than a bug. Sweeping all 360
 * degrees, only about 285-315 clear the floor: tritanopia removes blue-yellow
 * discrimination, so a blue brand drifts into the green that "ok" has to be, while a violet
 * brand keeps a red component and stays clear of it. If your statuses are red/amber/green,
 * your brand hue cannot be blue — not for a tritanope.
 *
 * Blue is the commonest brand colour in software, so --brand-locked exists for the case
 * where the hue predates the palette. It converts brand-vs-status from an assertion into a
 * measured collapse plus a REQUIREMENT that those components carry a glyph — the same
 * treatment red-vs-green already gets, because the collapse is now equally unavoidable.
 * Nothing is weakened; the burden moves to the component, where it can be discharged.
 *
 * The prover runs on YOUR hue, not on the signature. If no green exists that separates from
 * it under tritanopia, this exits non-zero and says so rather than emitting a palette that
 * quietly does not hold.
 *
 * ── this file used to carry its own copy of the emitter ──
 *
 * It had a local toCss() that predated src/css.mjs, and the two drifted exactly as far as
 * you would expect. The build emitted one light-dark() block, P3 behind a media query, and
 * the nilam.* cascade layers. The CLI still emitted separate :root and .dark blocks, no
 * wide gamut, and no layers at all. So the `npx nilam --css=` documented in the README
 * produced a materially worse file than the build, and nothing failed — because no test
 * ever ran the CLI.
 *
 * src/css.mjs's own header warns about precisely this in the abstract. It was true here in
 * the concrete for several commits. One emitter now, imported.
 */

import { writeFileSync } from 'node:fs';

import { solvePalette, solveSemanticHues, NILAM_HUE } from './solve.mjs';
import { report, prove } from './prove.mjs';
import { toCss } from './css.mjs';

const args = process.argv.slice(2);
const hue = Number(args.find((a) => /^\d+(\.\d+)?$/.test(a)) ?? NILAM_HUE);
const verbose = args.includes('-v') || args.includes('--verbose');
const wantP3 = !args.includes('--no-p3');
const brandLocked = args.includes('--brand-locked');
const emit = args.find((a) => a.startsWith('--css='))?.slice(6);

if (!Number.isFinite(hue) || hue < 0 || hue >= 360) {
  console.error(`nilam: hue must be a number in [0, 360), got "${hue}"`);
  process.exit(2);
}

const t0 = Date.now();
const chosen = solveSemanticHues(hue);
const palette = solvePalette(hue, { semanticHues: chosen.hues });
const ms = Date.now() - t0;

console.log(`nilam — solved hue ${hue} in ${ms}ms`);
console.log(`  smallest hard-constraint separation, normal vision + 3 dichromacies: ${chosen.worst.toFixed(4)}`);

const failed = report(palette, { verbose, brandLocked });

/* The wide-gamut palette is solved and proven separately, against the P3 boundary and P3
 * luminance. Both must pass before anything is written: a P3 block that fails its own
 * contracts is worse than no P3 block, because it only misbehaves on the better screens,
 * which is where nobody thinks to look. */
let p3 = null;
if (wantP3) {
  p3 = solvePalette(hue, { semanticHues: chosen.hues, gamut: 'display-p3' });
  const proof = prove(p3, { brandLocked });
  const verdict = proof.failures.length ? `${proof.failures.length} FAILED` : 'all passed';
  console.log(`\n  display-p3: ${proof.count} assertions, ${verdict}`);
  for (const f of proof.failures) console.error(`    - ${f}`);
  if (proof.failures.length) process.exit(1);
}

if (failed) process.exit(1);

if (emit) {
  writeFileSync(emit, toCss(palette, { p3 }));
  console.log(`\n  wrote ${emit}${p3 ? ' — including the @media (color-gamut: p3) block' : ''}`);
}
