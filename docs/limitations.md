# Limitations

Stated plainly, because the package makes accessibility claims and those claims have
boundaries. This page mirrors the README's Limitations section and does not soften it.

!!! danger "Assistive technology: not tested"

    The keyboard layer implements the ARIA APG contracts. It **has not been tested against
    NVDA, JAWS, VoiceOver or TalkBack**, and real assistive technology diverges from
    specification.

    That distinction is not a formality. Spec-correct means the keyboard works and the ARIA
    attributes say the right thing. It does not mean a JAWS user has a good time, and the
    only way to find out how it behaves is to run it.

    Where certified AT behaviour is a requirement, pair nilam with
    [React Aria](https://react-spectrum.adobe.com/react-aria/). It is years of exactly the
    work this cannot contain. **Pairing nilam's colour with React Aria's behaviour is the
    honest recommendation, not a fallback.**

    What you get here is the keyboard layer for a project that would otherwise have none.

## Contrast model

WCAG 2.x contrast is a luminance ratio that **ignores hue and chroma**. Every floor in this
system inherits that imprecision — a 4.5:1 that the standard calls legible can still be an
uncomfortable pairing, and the standard cannot tell you so.

APCA was drafted to address exactly this and was **removed from the normative WCAG 3 draft in
July 2023**, so WCAG 2.2 — now ISO/IEC 40500:2025 — remains the operative standard. nilam
solves against the standard that is in force, not the one that might replace it.

## Colour-vision simulation

- **The Machado, Oliveira & Fernandes matrices are a model.** A good one, and the one the
  literature uses. Not an eye.
- **Only severity 1.0 is simulated.** Real colour vision varies continuously, and most people
  with a colour vision deficiency are anomalous trichromats rather than dichromats. Severity
  1.0 is the hardest case, not the common one.
- **The `0.09` separation floor is a chosen threshold, not a published one.** There is no
  standard to cite for it.

The measurements are on [Colour blindness](colour-blindness.md), including the eight status
pairs that collapse and are reported rather than hidden.

## Meaning

**A prover measures separation, not appropriateness.**

An earlier revision optimised separation until `danger` resolved to magenta, with every
assertion passing. "Delete account" looked like a fashion brand. The hue windows in
`solve.mjs` exist because of it.

This class of error is **only visible by rendering**. No assertion in this package can catch
it, and none claims to. [The full story](solved.md#meaning-is-the-objective-separation-is-a-constraint).

## Gamut

**Two, and only two.** sRGB is the base and Display-P3 is solved separately, proven
separately, and emitted behind `@media (color-gamut: p3)` as explicit `color(display-p3 …)`
values. Nothing wider — Rec.2020 is not supported.

Every value in both palettes is asserted to be inside its own gamut, because a clipped colour
reports a better ratio than it paints, which would make every other number here a lie.

What is *not* claimed: that the media query is a perfect proxy for the screen. A browser that
reports `color-gamut: p3` is telling you about its own capability, and nilam takes it at its
word. [How the two palettes work](palette.md#two-gamuts-both-proven).

## One value is chosen, not derived

`GLOW_L = 0.66`, the dark-mode solid's lightness.

Four derivations were attempted and none produce it — 0.603, 0.595, 0.570 and 0.575. It is
measured from two reference colours that work. In light mode the constraints bind and choose
the value for you; in dark mode they do not, so something has to fill the gap and it is
taste.

The source records this. Five more values are chosen rather than solved, and they are listed
in full on [Why solved colour](solved.md#what-is-chosen-not-solved).

## No fallback for `light-dark()`

The tokens are emitted as `light-dark()`, which has been Baseline since 2024. There is **no
fallback**: a browser without it gets no colours at all rather than degraded colours.

That is a deliberate trade for one token block instead of three, and for free nested themes.
It is also the one limitation here that is a hard cliff rather than a soft edge.

## What the token export does not carry

From [Platform export](tokens.md#what-is-not-verified):

- `--tracking-*` and `--measure` are **omitted**, because their units are `em` and `ch`, and
  DTCG `dimension` allows only `px` and `rem`. The omission is declared inside the document
  rather than left silent.
- `--text-*` is a fluid `clamp()` with no DTCG type, so the exported dimension is **the value
  at a 1280px viewport**. Both ends are kept in `$extensions`.
- Figma variables are 8-bit sRGB, so the OKLCH is quantised on the way in. The worst error
  across the palette is 0.002 in OKLab — invisible, but not lossless. Easings and shadows do
  not go at all, because Figma has no variable type for a cubic-bezier and no effect
  variable.
- The Swift output type-checks with `swiftc -typecheck`. **The Kotlin output has not been
  compiled.**
- **Nobody has run these tokens through Figma against a live file.** The request body matches
  the documented shape; that is all that is claimed.
- There is no published JSON Schema for DTCG token documents, only for resolvers. The flat
  documents are checked against the spec's structural rules by hand.

## Most brand hues do not pass

Sweeping all 360 degrees, only roughly **285–315** clears the dichromacy floor against a
red/amber/green status set. Every blue fails, because tritanopia removes blue–yellow
discrimination and a blue brand drifts into the grey-green that `ok` must occupy.

Blue is the commonest brand colour in software, so for most projects the default answer is
"this hue does not pass". `--brand-locked` is the route through, and it does not soften
anything — it reclassifies the collapse as measured and moves the requirement onto the
component. [The argument in full](colour-blindness.md#not-every-brand-hue-can-carry-these-statuses).

## What is deliberately not built

Combobox aside, these are absent rather than badly approximated: date picker, rich text,
virtualised grid, tree, drag-and-drop reordering, menubar, submenus, multi-select listbox.

Each needs a substantial state machine and, more to the point, needs real AT testing to be
worth shipping. Use React Aria.

## The claim, one more time

Two things, narrowly:

1. Every lightness in the palette is found by inverting a contrast requirement, so a step
   cannot exist at a value that breaks its own contract.
2. The dichromat-separation assertion is machine-checked and gates the build, and no prior art
   for that was found in a design system.

Everything else on this site is either a measurement, which is checkable, or a decision with
its reasoning written next to it, which is arguable. Nothing on this site is a claim that
using nilam makes an interface accessible. That depends on the interface.
