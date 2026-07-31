# 11 · Tokens beyond CSS

The moment a decision has two consumers, it has two copies. Two copies drift.

You have seen the drift: the brand colour changes in the Figma file and nobody tells the iOS
team, so the app is a version behind for eight months and nobody notices because nobody can see
both at once. The problem is not communication. It is that the decision was stored in two
places.

Which is why a design system is a **data problem** before it is a CSS problem. CSS is one
output.

## The format

**DTCG** — the Design Tokens Community Group format — is the W3C-incubated standard for writing
design decisions as JSON. It reached its **first stable version, 2025.10, on 28 October 2025**.

That date matters when you read anything about design tokens. Before it, every tool had its own
dialect, which is why older tutorials contradict each other and why so much tooling only
half-works together.

Two things in 2025.10 are load-bearing here.

**Colour is an object, not a hex string.**

```json
"$value": {
  "colorSpace": "oklch",
  "components": [0.585, 0.2186, 285],
  "alpha": 1,
  "hex": "#755cf5"
}
```

`oklch` is one of fourteen legal colour spaces, so a colour solved in OKLCH **survives the trip**
instead of being flattened to 8-bit sRGB on the way out. Chapter 2's whole argument would be
undone by a format that only carried hex.

**Theming lives in a separate document.** The format module has no concept of modes at all. For
four years every tool invented its own answer and a `$modes` proposal sat open; in October 2025
the group settled on **resolvers** — token sets, plus a document saying which set applies in
which context.

## What a token carries besides its value

This is the part that turns a colour list into a design system.

```json
"9": {
  "$value": {
    "colorSpace": "oklch",
    "components": [0.585, 0.2186, 285],
    "hex": "#755cf5"
  },
  "$description": "the solid — the filled button, the brand moment …",
  "$extensions": {
    "io.github.jvoltci.nilam": {
      "role": "step 9",
      "cssVar": "--brand-9",
      "oklch": {
        "L": 0.5850000000000067,
        "C": 0.21861984218200592,
        "h": 285
      },
      "contrast": {
        "against": "color.brand.1", "ratio": 4.31,
        "floor": 3, "holds": true, "wcag": "1.4.11"
      },
      "ink": {
        "token": "color.brand.ink", "polarity": "light",
        "ratio": 4.57, "floor": 4.5, "wcag": "1.4.3"
      }
    }
  }
}
```

Three things are doing work:

- **`$description` is the role, not a colour name.** "border of a control — WCAG 1.4.11 governs
  this at 3:1" tells a consumer what they may use it for. `#755cf5` does not.
- **`$extensions` carries the proof.** The ratio that was measured, the floor it had to clear,
  the WCAG clause, and the full-precision OKLCH the solver produced. So a designer opening the
  file can see *why* the value is what it is, without reading the source.
- **`cssVar` ties every token back to the stylesheet**, which is what lets the test suite assert
  that the two artefacts contain exactly the same tokens, in both directions.

### The one field to actually read

`$extensions[…].ink.polarity` on step 9. It says whether **near-white or near-dark** text is
legible on the solid — and it flips between modes and between hues, as chapter 5 showed. If you
export tokens and drop that field, every consumer downstream will hard-code white.

## Why each platform needs a different shape

The naive assumption is that exporting tokens is translation: same structure, different syntax.
It is not, because each platform has a different idea of what a colour *is*.

**SwiftUI has no dynamic-colour primitive.** There is no `light-dark()`. So each token has to be
a `Color` backed by `UIColor(dynamicProvider:)` on iOS or `NSColor(name:dynamicProvider:)` on
macOS. Emit a flat light-only namespace and the mode inversion is silently lost — which matters
more in nilam than in most systems, because step 9 is a *different lightness* in each mode rather
than the same colour with a different opacity.

```swift
Button("Save") { }
    .background(Nilam.brand9)
    .foregroundStyle(Nilam.brandInk)   // never .white
```

**Compose wants two factories, not one object**, for the same reason:

```kotlin
val colors = if (isSystemInDarkTheme()) nilamDarkColors()
             else nilamLightColors()
```

That is the shape Material 3 uses, and it is the shape because a single palette cannot express a
value that inverts.

**Figma variables are 8-bit sRGB.** So the OKLCH is quantised on the way in. The worst error
across nilam's palette is **0.002 in OKLab** — invisible, and not lossless. Figma also has no
variable type for a cubic-bezier and no effect variable, so the easings and shadows do not go at
all. And it has no viewport, so a fluid `clamp()` type size has no single true value to send.

## The honest part: say what you dropped

**A token export that does not say what it dropped is a lie**, because the consumer will assume
completeness and build on a value that was never there.

nilam's omissions, and the reason for each:

| Not exported | Why |
|---|---|
| `--tracking-*` | unit is `em`; DTCG `dimension` allows only `px` and `rem`, and 2025.10 has no string type to fall back on |
| `--measure` | unit is `ch`, same reason |
| easings, shadows | Figma has no variable type for either |

One value is **changed** rather than omitted: `--text-*` is a fluid `clamp()` with no DTCG type,
so the exported dimension is the value at a **1280px viewport** — the wide end. Both ends and
the fluid term are kept in `$extensions`, and the `$description` says so on every one.

The omission list ships **inside the document**, at
`$extensions["io.github.jvoltci.nilam"].omittedFromScaleCss`, so you can see what is missing
without reading a web page. And the test suite asserts that every custom property in the
stylesheet is either exported or on that list — **a token cannot go missing quietly.**

## How nilam handles it

One function per target, and nothing hand-maintained:

```js
import {
  toDtcg, toStyleDictionary, toFigmaVariables, toSwift, toKotlin,
} from 'nilam';
```

Two shapes of DTCG, for two different jobs:

| Call | You get | Use it for |
|---|---|---|
| `toDtcg(palette)` | a **resolver** document — one shared set, one `mode` modifier, two contexts | archiving the whole system in one file |
| `toDtcg(palette, { mode: 'light' })` | a **flat** token document, single mode | Style Dictionary, Figma importers, anything reading only the format module |

Prefer the flat form unless you know your tool reads resolvers. Resolver support is thin.

The non-colour scales — type, space, radius, lines, focus, motion, stacking, elevation — are
**read out of `nilam.scale.css`** rather than retyped. That is the structural point of the whole
chapter: there is one place each number lives, and the export is a view of it rather than a
second copy.

And it is asserted in both directions. `dtcg.test.mjs` is **5,955 assertions** comparing the
export against the stylesheet and the stylesheet against the export, because a token present in
one and absent from the other is exactly the failure a one-way check cannot see.

### What is not verified

Stated as plainly as the rest:

- The Swift output **type-checks** with `swiftc -typecheck`. The Kotlin output **has not been
  compiled**.
- **Nobody has run these tokens through Figma against a live file.** The request body matches the
  documented shape; that is all that is claimed.
- There is **no published JSON Schema for DTCG token documents**, only for resolvers. So the flat
  documents are checked against the spec's structural rules by hand, and they carry no `$schema`
  — `$schema` is not one of the eight `$`-properties 2025.10 reserves, and putting it on a group
  would be inventing syntax.
- Style Dictionary v5 resolver support could not be confirmed from its documentation. That is
  **unverified**, not confirmed absent.

**Next:** [how you know you are right](12-how-you-know.md) — and what a test can never catch.

**Reference:** [Platform export](../tokens.md) has every adapter with a working call.
[What the token export does not carry](../limitations.md#what-the-token-export-does-not-carry)
is the same omission list on the limitations page, where it belongs.
