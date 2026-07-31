/* nilam CLI: solve a palette from one hue, prove it, emit CSS. */

import { solvePalette, solveSemanticHues, inkFor } from './solve.mjs';
import { report, prove } from './prove.mjs';
import { fmt, toHex, contrast } from './colour.mjs';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const hue = Number(args.find((a) => /^\d+(\.\d+)?$/.test(a)) ?? 285);
const verbose = args.includes('-v');
const emit = args.find((a) => a.startsWith('--css='))?.slice(6);

const t0 = Date.now();
const chosen = solveSemanticHues(hue);
const palette = solvePalette(hue, { semanticHues: chosen.hues });
const ms = Date.now() - t0;

console.log(`solved in ${ms}ms`);
console.log(`  minimum separation across normal vision + 3 dichromacies: ${chosen.worst.toFixed(4)}`);
const failed = report(palette, { verbose });

if (emit) {
  writeFileSync(emit, toCss(palette));
  console.log(`\n  wrote ${emit}`);
}

process.exit(failed ? 1 : 0);

function toCss(p) {
  const fam = ['neutral', 'brand', 'danger', 'warn', 'ok', 'info'];
  const block = (mode) => fam.map((f) =>
    Array.from({ length: 12 }, (_, i) => i + 1)
      .map((n) => `  --${f}-${n}: ${fmt(p[mode][f][n])};`).join('\n')
    + `\n  --${f}-ink: ${fmt(inkFor(p[mode][f][9]))};`
    + (f === 'neutral' ? `\n  --surface: ${fmt(p[mode][f].surface)};` : '')
  ).join('\n\n');

  return `/* nilam — generated. Do not hand-edit; change the hue and re-solve.
 *
 * brand hue ${p.brandHue}, semantics ${JSON.stringify(p.semanticHues)}
 *
 * Every lightness here was found by inverting a contrast requirement, not chosen.
 * The semantic hues were selected to maximise the smallest pairwise separation
 * across normal vision, protanopia, deuteranopia and tritanopia.
 *
 * Role model: 1 page · 2 subtle · 3-5 component rest/hover/active ·
 * 6-8 border subtle/normal/hover · 9-10 solid/hover · 11 text · 12 strong text
 */

:root {
${block('light')}
}

.dark,
[data-theme='dark'] {
${block('dark')}
}
`;
}
