/* nilam — the platform adapters.
 *
 * DTCG is the interchange format; these are the four destinations that will not read it
 * as-is in July 2026. Each one is deliberately small. A half-finished exporter that
 * covers colour correctly is worth more than an exhaustive one that guesses at
 * typography, and every guess here would be a lie about a number the solver never made.
 *
 * ── what each target can actually hold ────────────────────────────────────────
 *
 * Style Dictionary v5  DTCG 2025.10 IS its base format, including the colour object with
 *                      colorSpace/components/hex and new oklch/oklab/lch/p3 transforms.
 *                      So this adapter is close to identity. Its only real job is
 *                      splitting the resolver's two contexts into the two flat files
 *                      SD's `source` globs expect — I could not find resolver support in
 *                      the v5 docs, and that is unverified rather than confirmed absent.
 *
 * Figma Variables      8-bit sRGB, and nothing else. Variables are BOOLEAN, FLOAT, STRING
 *                      or COLOR; colour values are {r,g,b,a} floats in 0..1 which are the
 *                      gamma-encoded sRGB numbers a hex code carries. There is no OKLCH,
 *                      no cubic-bezier and no effect variable, so the solved triplet is
 *                      quantised on the way in and the easings and shadows do not go.
 *                      Figma announced native DTCG import/export at Schema 2025 and it
 *                      has been rolling out since; the REST bulk endpoint below works
 *                      today and does not wait for it.
 *
 * Swift / Compose      no dynamic colour primitive in either. SwiftUI needs
 *                      UIColor(dynamicProvider:) or NSColor(name:dynamicProvider:) under
 *                      it; Compose expects the Material pattern of two factory functions.
 *                      Both are emitted that way rather than as one flat namespace,
 *                      because a flat namespace is an invitation to hard-code the light
 *                      value and lose the polarity inversion that step 9 exists for.
 */

import { toDtcg, walkTokens, cssVarOf, VENDOR } from './dtcg.mjs';
import { inkFor } from './solve.mjs';
import { toHex } from './colour.mjs';

const FAMILIES = ['neutral', 'brand', 'danger', 'warn', 'ok', 'info'];
const MODES = ['light', 'dark'];

/* ── Style Dictionary ────────────────────────────────────────────────────────── */

/**
 * The two files Style Dictionary v5 wants, keyed by the filename to write them to.
 * `.tokens.json` because v5 changed the DTCG extension from `.json` to that.
 *
 *   const out = toStyleDictionary(palette);
 *   for (const [name, doc] of Object.entries(out))
 *     writeFileSync(name, JSON.stringify(doc, null, 2));
 */
export function toStyleDictionary(palette, opts = {}) {
  return Object.fromEntries(MODES.map((mode) => [
    `nilam.${mode}.tokens.json`, toDtcg(palette, { ...opts, mode }),
  ]));
}

/* ── Figma Variables ─────────────────────────────────────────────────────────── */

/** Figma takes gamma-encoded sRGB in 0..1. Going through the hex rather than straight
 *  from linear light is deliberate: it guarantees Figma and the browser land on the same
 *  8-bit triplet, so a swatch in the file matches a rendered button exactly. */
function figmaColour(colour) {
  const hex = toHex(colour);
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Number((((n >> shift) & 255) / 255).toFixed(6));
  return { r: ch(16), g: ch(8), b: ch(0), a: 1 };
}

/* rem -> px. Figma FLOATs are unitless and every Figma consumer reads them as px, so the
 * root font size has to be assumed. 16 is the browser default and the only defensible
 * guess; it is recorded on each variable's description so nobody has to guess twice. */
const ROOT_PX = 16;

/**
 * A request body for `POST /v1/files/:file_key/variables` — Figma's bulk write.
 *
 * Temporary ids are plain strings that other entries in the same request refer to; Figma
 * maps them to real ids and returns the mapping. The one non-obvious step is the modes:
 * creating a collection with `initialModeId` implicitly creates that mode, so the light
 * mode is UPDATEd to name it and only the dark mode is CREATEd. Figma's own example does
 * the same and it is easy to miss.
 *
 * Groups: Figma nests variables in its UI by forward slash in the name. That behaviour is
 * not in the REST reference — it is UI behaviour I am relying on — so `color/brand/9`
 * rather than a documented field. Names may not contain `.`, `{` or `}`, which rules out
 * the DTCG dotted path directly.
 */
export function toFigmaVariables(palette, opts = {}) {
  const collection = opts.collection ?? 'nilam';
  const COL = 'nilam_collection';
  const modeId = { light: 'nilam_mode_light', dark: 'nilam_mode_dark' };

  const variables = [];
  const variableModeValues = [];

  const add = (name, resolvedType, description, values) => {
    const id = `nilam_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    variables.push({
      action: 'CREATE',
      id,
      name,
      variableCollectionId: COL,
      resolvedType,
      description,
      /* codeSyntax ties the variable back to the stylesheet, so a designer inspecting a
       * layer in Figma is told the CSS custom property to use rather than a hex. */
      ...(values.cssVar ? { codeSyntax: { WEB: `var(${values.cssVar})` } } : {}),
    });
    for (const mode of MODES) {
      variableModeValues.push({ variableId: id, modeId: modeId[mode], value: values[mode] });
    }
  };

  /* Colour. Everything the CSS emits, both modes, nothing dropped. */
  for (const family of FAMILIES) {
    for (let step = 1; step <= 12; step++) {
      add(`color/${family}/${step}`, 'COLOR', `--${family}-${step}`, {
        cssVar: `--${family}-${step}`,
        light: figmaColour(palette.light[family][step]),
        dark: figmaColour(palette.dark[family][step]),
      });
    }
    add(`color/${family}/ink`, 'COLOR',
      `--${family}-ink — the ink for step 9. Never substitute white; the polarity flips `
      + 'between modes.', {
        cssVar: `--${family}-ink`,
        light: figmaColour(inkFor(palette.light[family][9])),
        dark: figmaColour(inkFor(palette.dark[family][9])),
      });
  }
  add('color/surface', 'COLOR', '--surface — a raised surface. The only one with no tint.', {
    cssVar: '--surface',
    light: figmaColour(palette.light.neutral.surface),
    dark: figmaColour(palette.dark.neutral.surface),
  });

  /* The numeric scales, taken from the DTCG document so there is one parser and not two.
   * dimension and duration only: Figma has no variable type for a cubic-bezier, a font
   * stack is a STRING it cannot apply, and the fluid type steps would arrive as a single
   * number that is only true at one viewport width. Those four groups are left out on
   * purpose rather than approximated. */
  const doc = toDtcg(palette, { ...opts, mode: 'light' });
  for (const { name, token, type } of walkTokens(doc)) {
    if (type !== 'dimension' && type !== 'duration') continue;
    if (name.startsWith('type.')) continue;
    const { value, unit } = token.$value;
    const px = unit === 'rem' ? value * ROOT_PX : value;
    const note = unit === 'rem' ? ` (${value}rem at a ${ROOT_PX}px root)` : '';
    add(name.replace(/\./g, '/'), 'FLOAT', `${cssVarOf(token)}${note}`, {
      cssVar: cssVarOf(token),
      light: px,
      dark: px,
    });
  }

  return {
    variableCollections: [{
      action: 'CREATE',
      id: COL,
      name: collection,
      initialModeId: modeId.light,
    }],
    variableModes: [
      { action: 'UPDATE', id: modeId.light, name: 'Light', variableCollectionId: COL },
      { action: 'CREATE', id: modeId.dark, name: 'Dark', variableCollectionId: COL },
    ],
    variables,
    variableModeValues,
  };
}

/* ── Swift ───────────────────────────────────────────────────────────────────── */

const swiftName = (family, step) =>
  `${family}${step === 'ink' ? 'Ink' : step}`;

const rgbTriplet = (colour) => {
  const { r, g, b } = figmaColour(colour);
  return `${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}`;
};

/**
 * A SwiftUI source file. Colour only — the fluid type scale does not survive the trip to
 * a platform with no viewport, and space and radius are four lines anyone can write. The
 * colour is the part that was solved, so the colour is the part worth generating.
 */
export function toSwift(palette, opts = {}) {
  const lines = [];
  for (const family of FAMILIES) {
    lines.push(`\n    // MARK: ${family}`);
    for (const step of [...Array.from({ length: 12 }, (_, i) => i + 1), 'ink']) {
      const l = step === 'ink' ? inkFor(palette.light[family][9]) : palette.light[family][step];
      const d = step === 'ink' ? inkFor(palette.dark[family][9]) : palette.dark[family][step];
      const doc = step === 9
        ? 'the solid. Light and dark are DIFFERENT lightnesses on purpose — a filled '
          + 'button inverts the polarity of its page.'
        : step === 'ink'
          ? 'the ink for step 9. Do not substitute .white; the polarity flips by mode.'
          : `--${family}-${step}`;
      lines.push(`    /// ${doc}`);
      lines.push(
        `    public static let ${swiftName(family, step)} = `
        + `dynamic(RGB(${rgbTriplet(l)}), RGB(${rgbTriplet(d)}))`,
      );
    }
  }
  lines.push('\n    // MARK: surface');
  lines.push('    /// a raised surface — a card. The only surface with no tint at all.');
  lines.push(
    `    public static let surface = dynamic(RGB(${rgbTriplet(palette.light.neutral.surface)}), `
    + `RGB(${rgbTriplet(palette.dark.neutral.surface)}))`,
  );

  return `// nilam — GENERATED by src/export.mjs. Do not hand-edit; change the hue and re-solve.
//
// brand hue ${palette.brandHue} · semantics ${JSON.stringify(palette.semanticHues)}
//
// Colour only, and sRGB only. Every value was solved by inverting a WCAG contrast
// requirement, so the ratios hold on Apple platforms for the same reason they hold in a
// browser${opts.assertions ? ` (${opts.assertions} assertions)` : ''}.
//
// SwiftUI has no dynamic-colour primitive, so each token is a Color backed by
// UIColor(dynamicProvider:) or NSColor(name:dynamicProvider:). That matters more here than
// in most systems: step 9 is a different lightness in each mode, and a flat light-only
// namespace would quietly lose the inversion the design depends on.

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif
import SwiftUI

public enum Nilam {
    /// Gamma-encoded sRGB, 0...1 — the same numbers a hex code carries.
    public struct RGB: Sendable {
        public let r: Double
        public let g: Double
        public let b: Double
        public init(_ r: Double, _ g: Double, _ b: Double) {
            self.r = r
            self.g = g
            self.b = b
        }
    }

    static func dynamic(_ light: RGB, _ dark: RGB) -> Color {
        #if canImport(UIKit)
        return Color(uiColor: UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat(c.r), green: CGFloat(c.g), blue: CGFloat(c.b), alpha: 1)
        })
        #elseif canImport(AppKit)
        return Color(nsColor: NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
            let c = isDark ? dark : light
            return NSColor(srgbRed: CGFloat(c.r), green: CGFloat(c.g), blue: CGFloat(c.b), alpha: 1)
        })
        #else
        return Color(.sRGB, red: light.r, green: light.g, blue: light.b)
        #endif
    }
${lines.join('\n')}
}
`;
}

/* ── Kotlin / Compose ────────────────────────────────────────────────────────── */

const argb = (colour) => `0xFF${toHex(colour).slice(1).toUpperCase()}`;

/**
 * A Jetpack Compose source file. Two factory functions and a data class, which is the
 * Material 3 pattern (lightColorScheme() / darkColorScheme()) and the reason it exists:
 * Compose has no dynamic colour either, so the theme picks and the call sites never see
 * a raw hex.
 */
export function toKotlin(palette, opts = {}) {
  const names = [];
  for (const family of FAMILIES) {
    for (let step = 1; step <= 12; step++) names.push([`${family}${step}`, family, step]);
    names.push([`${family}Ink`, family, 'ink']);
  }
  names.push(['surface', 'neutral', 'surface']);

  const at = (mode, family, step) => {
    if (step === 'ink') return inkFor(palette[mode][family][9]);
    if (step === 'surface') return palette[mode][family].surface;
    return palette[mode][family][step];
  };

  const fields = names.map(([n, family, step]) => {
    const doc = step === 9
      ? '/** the solid. Light and dark are DIFFERENT lightnesses on purpose. */'
      : step === 'ink'
        ? '/** the ink for step 9. Never Color.White; the polarity flips by mode. */'
        : `/** --${family}-${step === 'surface' ? 'surface' : step} */`;
    return `    ${doc}\n    val ${n}: Color,`;
  }).join('\n');

  const factory = (mode) => `public fun nilam${mode === 'light' ? 'Light' : 'Dark'}Colors(): NilamColors = NilamColors(\n`
    + names.map(([n, family, step]) => `    ${n} = Color(${argb(at(mode, family, step))}),`).join('\n')
    + '\n)';

  return `// nilam — GENERATED by src/export.mjs. Do not hand-edit; change the hue and re-solve.
//
// brand hue ${palette.brandHue} · semantics ${JSON.stringify(palette.semanticHues)}
//
// Colour only, and sRGB only. Every value was solved by inverting a WCAG contrast
// requirement${opts.assertions ? `; ${opts.assertions} assertions hold over these exact values` : ''}.
//
// Two factories rather than one object, because step 9 is a different lightness in each
// mode and a single palette would lose the inversion. Wire them the way Material does:
//
//   val colors = if (isSystemInDarkTheme()) nilamDarkColors() else nilamLightColors()

package nilam.tokens

import androidx.compose.ui.graphics.Color

/** The solved palette, one mode's worth. */
public data class NilamColors(
${fields}
)

${factory('light')}

${factory('dark')}
`;
}
