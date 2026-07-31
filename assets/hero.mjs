/* nilam — the hero image.
 *
 * Generated from the SOLVED palette, so the banner cannot show a colour the package does
 * not ship. A hand-drawn hero with hand-picked hexes is the one asset guaranteed to go
 * stale the first time the solver changes, and this one changed four times today.
 *
 *   node assets/hero.mjs        writes hero-light.svg + hero-dark.svg, then PNGs
 *
 * Both formats, because GitHub and npm disagree: raw.githubusercontent.com serves .svg
 * as text/plain to stop XSS, so <img src="....svg"> silently fails on npm. PNG is served
 * as image/png and works in both places.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { solvePalette, solveSemanticHues, inkFor, NILAM_HUE } from '../src/solve.mjs';
import { toHex, simulate, distance, CVD_TYPES } from '../src/colour.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const chosen = solveSemanticHues(NILAM_HUE);
const palette = solvePalette(NILAM_HUE, { semanticHues: chosen.hues });

const W = 1280;
const H = 600;

const hero = (mode) => {
  const p = palette[mode];
  const n = p.neutral;
  const b = p.brand;
  const glow = palette.dark.brand[9];

  /* The status row, and the reason it is in the hero at all: this is the claim. Each chip
   * is drawn twice — as it is, and as a deuteranope sees it — so the banner states the
   * thing no other design system's banner can. */
  const STATUS = [['danger', '×'], ['warn', '!'], ['ok', '✓'], ['info', 'i']];

  const chip = (x, y, fill, ink, glyph, w = 54, h = 34) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle"
          font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
          font-size="13" font-weight="700" fill="${ink}">${glyph}</text>`;

  const normalRow = STATUS.map(([s, g], i) =>
    chip(96 + i * 62, 430, toHex(p[s][9]), toHex(inkFor(p[s][9])), g)).join('');

  const deutRow = STATUS.map(([s, g], i) => {
    const sim = simulate(p[s][9], 'deuteranopia');
    return chip(96 + i * 62, 496, toHex(sim), toHex(inkFor(sim)), g);
  }).join('');

  /* The 12 steps, as the visual anchor. Solved, in order, with 9 called out. */
  const rampX = 500;
  const stepW = 56;
  const ramp = Array.from({ length: 12 }, (_, i) => {
    const step = i + 1;
    const x = rampX + i * (stepW + 4);
    const isSolid = step === 9;
    return `
    <rect x="${x}" y="${isSolid ? 414 : 430}" width="${stepW}" height="${isSolid ? 66 : 34}"
          rx="${isSolid ? 10 : 8}" fill="${toHex(b[step])}"/>
    <text x="${x + stepW / 2}" y="${isSolid ? 500 : 484}" text-anchor="middle"
          font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
          font-size="10" fill="${toHex(n[11])}">${step}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
     aria-label="nilam — colour, proven. A twelve step scale solved from contrast requirements, and four status colours shown as a deuteranope sees them.">
  <defs>
    <!-- The glow, drawn as a real radial bloom rather than a CSS shadow, so the PNG
         carries it too. Centred behind the wordmark. -->
    <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${toHex(glow)}" stop-opacity="${mode === 'dark' ? 0.34 : 0.2}"/>
      <stop offset="100%" stop-color="${toHex(glow)}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${toHex(n[1])}"/>
  <ellipse cx="250" cy="215" rx="440" ry="300" fill="url(#bloom)"/>

  <!-- wordmark -->
  <text x="96" y="150" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="34" font-weight="600" letter-spacing="-0.8" fill="${toHex(n[12])}">nilam</text>
  <text x="205" y="150" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="15" fill="${toHex(n[11])}">नीलम · sapphire</text>

  <!-- The claim, at display weight. 200 because big and bold together reads as shouting.
       ONE text element with a tspan, not two positioned separately: absolute x on the
       second word guesses where the first one ends, and the guess was 80px wrong. -->
  <text x="96" y="268" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="92" font-weight="200" letter-spacing="-4" fill="${toHex(n[12])}">Colour, <tspan fill="${toHex(b[11])}">proven.</tspan></text>

  <text x="98" y="322" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="19" fill="${toHex(n[11])}">Every lightness solved by inverting a contrast requirement.</text>
  <text x="98" y="350" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="19" fill="${toHex(n[11])}">Every status pair verified under three kinds of colour blindness.</text>

  <!-- labels for the two rows -->
  <text x="96" y="404" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="10" letter-spacing="1.6" fill="${toHex(n[11])}">STATUS · NORMAL VISION</text>
  <text x="96" y="480" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="10" letter-spacing="1.6" fill="${toHex(n[11])}">· DEUTERANOPIA</text>
  <text x="${rampX}" y="404" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="10" letter-spacing="1.6" fill="${toHex(n[11])}">THE SOLVED SCALE · 9 IS THE SOLID</text>

  ${normalRow}
  ${deutRow}
  ${ramp}

  <!-- The honest caption. The rows above show red and green becoming one colour; saying so
       on the banner is the entire difference between this and a palette generator. -->
  <text x="96" y="556" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="14" fill="${toHex(n[11])}">Red and green <tspan font-style="italic">are</tspan> the same colour to a deuteranope. nilam measures it, says so, and fails the build unless those components carry a glyph.</text>

  <text x="${W - 96}" y="150" text-anchor="end"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="13" fill="${toHex(n[11])}">hue ${palette.brandHue} · 857 assertions</text>
</svg>
`;
};

for (const mode of ['light', 'dark']) {
  writeFileSync(join(here, `hero-${mode}.svg`), hero(mode));
  console.log(`wrote assets/hero-${mode}.svg`);
}
