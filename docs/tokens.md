# Tokens

nilam solves its palette from contrast requirements. This page is about getting that
palette **out of CSS** — into Figma, into an iOS app, into a build pipeline.

Everything below comes from one function. Nothing is hand-maintained, so nothing can
drift from the stylesheet.

```js
import { solvePalette, toDtcg } from 'nilam';

const palette = solvePalette(285);
const tokens = toDtcg(palette, { mode: 'light' });
```

---

## What the format is

**DTCG** — the Design Tokens Community Group format, the W3C-incubated standard for
writing design decisions as JSON. It reached its **first stable version, 2025.10, on
28 October 2025**. Before that every tool had its own dialect, which is why older
tutorials disagree with each other.

Two things in 2025.10 matter here:

- **Colour is an object, not a hex string.** It carries a `colorSpace`, a `components`
  array, an `alpha`, and an optional hex fallback. `oklch` is one of the fourteen legal
  colour spaces, so the solved triplet survives the trip instead of being flattened to
  8-bit sRGB.
- **Theming lives in a separate "resolver" document.** The main format has no concept of
  modes. See below.

---

## Light and dark

The format module says nothing about modes. For four years every tool invented its own
answer, and a `$modes` proposal sat open in the DTCG repo. In October 2025 the group
picked **resolvers** instead: token sets, plus a document that says which set applies in
which context.

So there are two shapes, and you want different ones for different jobs.

| Call | You get | Use it for |
|---|---|---|
| `toDtcg(palette)` | a **resolver** document: one shared set, one `mode` modifier, two contexts | archiving the whole system in one file; any tool that reads resolvers |
| `toDtcg(palette, { mode: 'light' })` | a **flat** token document, single mode | Style Dictionary, Figma importers, anything that reads only the format module |

Prefer the flat form unless you know your tool reads resolvers. Resolver support is thin.

---

## What is in a token

Every token carries three things beyond its value.

```json
"9": {
  "$value": {
    "colorSpace": "oklch",
    "components": [0.585, 0.2186, 285],
    "alpha": 1,
    "hex": "#755cf5"
  },
  "$description": "the solid — the filled button, the brand moment. Two contracts at once: 3:1 against the page (WCAG 1.4.11 …)",
  "$extensions": {
    "io.github.jvoltci.nilam": {
      "role": "step 9",
      "cssVar": "--brand-9",
      "oklch": { "L": 0.5850000000000067, "C": 0.21861984218200592, "h": 285 },
      "contrast": { "against": "color.brand.1", "ratio": 4.31, "floor": 3, "holds": true, "wcag": "1.4.11" },
      "ink": { "token": "color.brand.ink", "polarity": "light", "ratio": 4.57, "floor": 4.5, "wcag": "1.4.3" }
    }
  }
}
```

- **`$description` is the role**, not a colour name. "border of a control — WCAG 1.4.11
  governs this at 3:1" tells a consumer what they may use it for. `#755cf5` does not.
- **`$extensions` carries the proof**: the ratio that was measured, the floor it had to
  clear, the WCAG clause, and the full-precision OKLCH the solver produced.
- **`cssVar`** ties every token back to the stylesheet. The test suite uses it to assert
  the two artefacts contain exactly the same tokens, both directions.

### The one field to actually read

`$extensions[…].ink.polarity` on step 9. It says whether **near-white or near-dark** text
is legible on the solid — and it flips between modes, and between hues. A violet solid
takes white ink; an amber one takes dark. Hard-coding white on a filled button is the
most common contrast bug in the systems I read.

---

## The four adapters

```js
import { toStyleDictionary, toFigmaVariables, toSwift, toKotlin } from 'nilam';
```

### Style Dictionary

```js
for (const [name, doc] of Object.entries(toStyleDictionary(palette)))
  writeFileSync(name, JSON.stringify(doc, null, 2));
```

Writes `nilam.light.tokens.json` and `nilam.dark.tokens.json`. Point one platform at each:

```js
// config.mjs
export default {
  source: ['nilam.light.tokens.json'],
  platforms: { css: { transformGroup: 'css', files: [{ destination: 'light.css', format: 'css/variables' }] } },
};
```

**Style Dictionary v5 already is DTCG 2025.10** — same colour object, same `$value`, and
it ships oklch/oklab/lch/p3 transforms. So this adapter is nearly a no-op; its only job is
splitting the two contexts into the two files v5's `source` globs want.

Two caveats: v5 changed the DTCG extension from `.json` to `.tokens.json`, and I could not
find resolver support in its docs — treat that as **unverified**, not confirmed absent.

### Figma

```js
await fetch(`https://api.figma.com/v1/files/${key}/variables`, {
  method: 'POST',
  headers: { 'X-Figma-Token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify(toFigmaVariables(palette)),
});
```

Creates one collection, two modes (Light and Dark), and 104 variables. Each colour
variable also gets a `codeSyntax` of `var(--brand-9)`, so a designer inspecting a layer is
told the CSS property rather than a hex.

Needs edit access to the file. The bulk variables endpoint is Enterprise-only.

**What does not survive:** Figma variables are 8-bit sRGB, so the OKLCH is quantised on
the way in — the worst error across the palette is 0.002 in OKLab, which is invisible, but
it is not lossless. There is no variable type for a cubic-bezier and no effect variable, so
the easings and shadows do not go. The fluid type sizes do not go either: they are a
`clamp()` with no single true value, and Figma has no viewport to interpolate against.

### Swift

```js
writeFileSync('Nilam.swift', toSwift(palette));
```

Colour only. Each token is a `Color` backed by `UIColor(dynamicProvider:)` on iOS or
`NSColor(name:dynamicProvider:)` on macOS, because **SwiftUI has no dynamic-colour
primitive** and a flat light-only namespace would silently lose the mode inversion.

```swift
Button("Save") { }
    .background(Nilam.brand9)
    .foregroundStyle(Nilam.brandInk)   // never .white
```

### Kotlin / Compose

```js
writeFileSync('NilamColors.kt', toKotlin(palette));
```

A `NilamColors` data class plus `nilamLightColors()` and `nilamDarkColors()` — the same
shape Material 3 uses, and for the same reason.

```kotlin
val colors = if (isSystemInDarkTheme()) nilamDarkColors() else nilamLightColors()
```

---

## The non-colour scales

Type, space, radius, lines, focus, motion, stacking and elevation are all in the export
too. They are **read out of `nilam.scale.css`** rather than retyped, so the numbers cannot
drift from the shipped stylesheet.

Two groups do not make it, and this is a limit of the format rather than a shortcut:

| Missing | Why |
|---|---|
| `--tracking-*` | unit `em`. DTCG `dimension` allows **only** `px` and `rem`, and 2025.10 has no string type to fall back on. |
| `--measure` | unit `ch`, same reason. |

The list ships inside the document, at
`$extensions["io.github.jvoltci.nilam"].omittedFromScaleCss`, so you can see what is
missing without reading this page. The test suite asserts that every custom property in
the stylesheet is either exported or on that list — a token cannot go missing quietly.

One value is **changed** rather than omitted: `--text-*` is a fluid `clamp()`, which has no
DTCG type. The exported dimension is the value at a **1280px viewport**, the wide end. Both
ends and the fluid term are kept in `$extensions`. The `$description` says so on every one.

---

## What is not verified

- There is **no published JSON Schema for token documents**, only for resolvers. So the
  flat documents are checked against the spec's structural rules by hand, in
  `test/dtcg.test.mjs`, and carry no `$schema` — `$schema` is not one of the eight
  `$`-properties 2025.10 reserves, and putting it on a group would be inventing syntax.
- The Swift output type-checks with `swiftc -typecheck`. The Kotlin output has **not** been
  compiled.
- Nobody has run these tokens through Figma against a live file. The request body matches
  the documented shape; that is all that is claimed.
