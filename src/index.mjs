/* nilam — the public API.
 *
 * Named for नीलम, sapphire. The signature colour is a violet-blue at hue 285, and
 * the point of the package is that you can throw it away: pass your own hue and the
 * whole system re-solves around it, or fails loudly and tells you which promise it
 * could not keep.
 *
 *   import { solvePalette, prove, toCss } from 'nilam';
 *
 *   const palette = solvePalette(285);
 *   const { failures } = prove(palette);
 *   if (failures.length) throw new Error(failures.join('\n'));
 *   writeFileSync('tokens.css', toCss(palette));
 */

export {
  solveScale, solveSolid, solvePalette, solveSemanticHues, inkFor,
  GLOW_L, NILAM_HUE,
} from './solve.mjs';

export {
  prove, proveScale, proveDichromacy, proveStatusChannels, proveSalience, report,
} from './prove.mjs';

export {
  contrast, distance, simulate, inGamut, maxChroma, solveLightness,
  toHex, fmt, hexToOklch, CVD_TYPES,
} from './colour.mjs';

export { toCss } from './css.mjs';
export { toDtcg } from './dtcg.mjs';
export { toStyleDictionary, toFigmaVariables, toSwift, toKotlin } from './export.mjs';
