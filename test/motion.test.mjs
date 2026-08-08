/* nilam — the motion audit.
 *
 * WHY THIS FILE EXISTS.
 *
 * The reduced-motion exemption for loaders has been wrong twice, and both times every
 * other assertion was green.
 *
 *   1. It lived in nilam.components, one layer AFTER nilam.base. For !important
 *      declarations layer order is REVERSED, so base won and every loader froze for three
 *      releases while the comment beside the rule described the opposite.
 *   2. Moved to nilam.motion, it listed the spinner, dots, bar and busy button — and not
 *      .n-skeleton. The skeleton inherited `animation-iteration-count: 1 !important` and
 *      breathed exactly once, which is worse than not animating at all: the reader watches
 *      it settle and concludes the content has arrived.
 *
 * Both are the same failure. A hand-maintained list of selectors drifts from the
 * stylesheet, and nothing disagrees when it does.
 *
 * THE PREMISE HERE IS THE BUILT CSS, NOT THE LIST.
 *
 * Every rule declaring an INFINITE animation must be classified below. 'loader' means it
 * signals that work is happening, so freezing it is a lie about the application's state
 * and WCAG 2.3.3 does not govern it — it must appear in the exemption. 'decor' means it is
 * ornament and must NOT be exempted. An unclassified infinite animation fails, which is
 * what forces a new loader to answer the question.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let count = 0;
const failures = [];
const ok = (cond, msg) => { count++; if (!cond) failures.push(msg); };

/* Comments stripped first. They contain braces, percentages and prose selectors, and a
 * rule-matching regex that runs over them takes a selector of English. */
const css = readFileSync(join(root, 'nilam.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/* [selector, kind] — kind is 'loader' (must be exempted) or 'decor' (must not be). */
const ANIMATED = [
  ['.n-spinner',                     'loader'],
  ['.n-spinner::before',             'loader'],
  ['.n-bar',                         'loader'],
  ['.n-bar::after',                  'loader'],
  ['.n-dots i',                      'loader'],
  ['.n-skeleton',                    'loader'],
  ['.n-btn[aria-busy=\'true\']::before', 'loader'],
  ['.n-loading .n-slow',             'loader'],
  /* Ornament: it carries no signal the ring beneath it does not already carry, so under
     reduce it is removed (display: none) rather than exempted. */
  ['.n-spinner-xl::after',           'decor'],
];

/* ── 1. the reduce block exists, and in the right layer ──────────────────── */

const layerOrder = css.match(/@layer\s+([^;]+);/);
ok(layerOrder !== null, 'no @layer declaration found in the bundle');
if (layerOrder) {
  const layers = layerOrder[1].split(',').map((s) => s.trim());
  ok(
    layers[0] === 'nilam.motion',
    `nilam.motion is at position ${layers.indexOf('nilam.motion')}, not first. For ` +
      `!important declarations layer order is REVERSED, so an exemption in any later ` +
      `layer loses to nilam.base's blanket rule and every loader freezes.`,
  );
}

const reduceBlock = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
ok(reduceBlock !== null, 'found no prefers-reduced-motion block at all, so this check proved nothing');
const reduce = reduceBlock ? reduceBlock[1] : '';

/* ── 2. every infinite animation in the stylesheet is classified ─────────── */

const infinite = new Set();
for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const sel = m[1].trim().replace(/\s+/g, ' ');
  const body = m[2];
  if (sel.startsWith('@') || sel.includes('%')) continue;      // at-rules and keyframe stops
  if (!/animation[^;]*\binfinite\b/.test(body)) continue;
  for (const one of sel.split(',')) infinite.add(one.trim());
}

const classified = new Set(ANIMATED.map(([s]) => s));
for (const sel of infinite) {
  ok(
    classified.has(sel),
    `${sel} declares an infinite animation and is not classified in test/motion.test.mjs. ` +
      `Add a row saying whether it is a 'loader' (must be exempted under reduce, because a ` +
      `frozen loader reads as a hung app) or 'decor' (must not be). An unclassified ` +
      `animation is how the skeleton shipped breathing exactly once.`,
  );
}
ok(infinite.size > 0, 'found no infinite animations at all, so this check proved nothing');

/* ── 3. every loader is actually exempted, with BOTH properties ──────────── */

for (const [sel, kind] of ANIMATED) {
  if (kind !== 'loader') continue;

  const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const present = new RegExp(`(^|,)\\s*${escaped}\\s*(,|\\{)`, 'm').test(reduce);
  ok(
    present,
    `${sel} animates infinitely but does not appear in the prefers-reduced-motion block. ` +
      `Under reduce it inherits nilam.base's \`animation-duration: 0.01ms !important\` and ` +
      `freezes, which does not read as "motion reduced" — it reads as "this app has hung".`,
  );
}

/* The skeleton bug specifically: duration alone is not enough, because base also sets
 * `animation-iteration-count: 1 !important`. Exempting one and not the other produces a
 * loader that animates ONCE and stops. */
for (const decl of reduce.split('}')) {
  if (!/animation/.test(decl)) continue;
  const usesShorthand = /animation:\s*[^;]*\binfinite\b[^;]*!important/.test(decl);
  const usesLonghand = /animation-duration:[^;]*!important/.test(decl)
    && /animation-iteration-count:\s*infinite\s*!important/.test(decl);
  const isTimed = /animation:\s*n-(wake|slow-reveal)/.test(decl);
  ok(
    usesShorthand || usesLonghand || isTimed,
    `a rule in the reduce block sets an animation without making it infinite:\n` +
      decl.trim().slice(0, 200) +
      `\nSetting the duration but not the iteration count leaves base's ` +
      `\`animation-iteration-count: 1 !important\` in force, so the loader breathes once ` +
      `and stops — which reads as "the content arrived".`,
  );
}

/* ── 4. the clock is shared ──────────────────────────────────────────────── */

ok(/--dur-tick:\s*100ms/.test(css), '--dur-tick is not 100ms; the clock is Miller\'s instantaneity limit');
ok(/--dur-cycle:\s*1\.2s/.test(css), '--dur-cycle is not 1.2s; the cycle is twelve ticks');

/* ── report ─────────────────────────────────────────────────────────────── */

if (failures.length) {
  console.error(`\nmotion: ${failures.length} of ${count} assertions FAILED\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`motion: ${count} assertions pass (${infinite.size} infinite animations, all classified)`);
