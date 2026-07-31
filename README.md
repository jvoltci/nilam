<p align="center">
  <picture>
    <!-- jsDelivr, not a relative path. npm rewrites relative image paths to
         raw.githubusercontent.com, which serves .svg as text/plain to prevent XSS — so the
         image silently fails to render on the npm page. jsDelivr sends image/svg+xml. -->
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/jvoltci/nilam@master/assets/hero-dark.svg">
    <img src="https://cdn.jsdelivr.net/gh/jvoltci/nilam@master/assets/hero-light.svg" alt="nilam — colour, proven. A twelve-step scale solved from contrast requirements, and four status colours shown as a deuteranope sees them." width="100%">
  </picture>
</p>

<p align="center">
  <a href="https://jvoltci.github.io/nilam/"><img src="https://img.shields.io/badge/docs-jvoltci.github.io%2Fnilam-755cf5" alt="documentation"></a>
  <a href="https://www.npmjs.com/package/nilam"><img src="https://img.shields.io/npm/v/nilam.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/nilam"><img src="https://img.shields.io/npm/dm/nilam.svg" alt="downloads"></a>
  <a href="https://bundlephobia.com/package/nilam"><img src="https://img.shields.io/bundlephobia/minzip/nilam" alt="bundle size"></a>
  <a href="https://github.com/jvoltci/nilam/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/nilam.svg" alt="licence"></a>
  <a href="https://github.com/jvoltci/nilam/stargazers"><img src="https://img.shields.io/github/stars/jvoltci/nilam.svg?style=social" alt="stars"></a>
</p>

<h3 align="center">Colour solved from contrast requirements, and proven for colourblind readers.</h3>

---

# nilam

**Proven colour.** A design system whose palette is *solved* from contrast
requirements rather than picked, and verified under three kinds of colour blindness
before it ships.

नीलम — *sapphire*. The signature is a violet-blue at hue 285.

**Documentation: [jvoltci.github.io/nilam](https://jvoltci.github.io/nilam/)** — with live
component demos, and a colour-blindness simulation that runs the same matrices the prover
asserts against.

```bash
npm install nilam
```

```css
@import 'nilam/nilam.css';
```

```html
<button class="n-btn n-btn-fill">Save changes</button>
```

That button is a dark violet with white text on a light page, and a glowing light
violet with dark text on a dark page. One class. No `dark:` variant.

---

## What is new

Two things, stated narrowly.

### 1. Scales are solved, not picked

Every lightness in the palette is found by **inverting a contrast requirement**.
Step 11 is not "a grey that looks about right for body text" — it is the lightness at
which text hits 4.5:1 against step 3, computed. The contract *is* the construction, so
a step cannot exist at a value that breaks it.

Hand-tuned scales are unverifiable by construction: nothing fails when a step drifts.
Here, something fails.

### 2. It proves itself for colourblind readers

Roughly 8% of men are dichromatic. Every design system answers this with the advice
*"don't rely on colour alone"* and then ships a red/green semantic pair without ever
checking it.

nilam simulates every status pair under **protanopia, deuteranopia and tritanopia**
([Machado, Oliveira & Fernandes 2009](https://doi.org/10.1109/TVCG.2009.113) severity-1.0
matrices, applied in linear sRGB) and measures the separation. Then:

- The **brand** must never be confusable with a status under any vision. Hard failure.
  This is always avoidable — the brand hue is a free variable.
- Status pairs that **do** collapse are reported, not hidden. Red and green *are* the
  same colour to a deuteranope; no hue assignment fixes it.
- That report becomes a **build failure** unless the collapsing components carry a
  non-hue channel. `proveStatusChannels()` enforces WCAG 1.4.1 instead of suggesting it.

No prior art was found for a machine-checked dichromat-separation assertion in a design
system. That is the claim, and it is a narrow one.

---

## Choosing a brand hue

Every hue emits a palette. What varies is what you are told about it.

A brand colour must not be confusable with a status colour, and that is checked under normal
vision **and** under protanopia, deuteranopia and tritanopia.

**Under normal vision, a collapse is a hard failure.** If a save button and an error state
are the same colour to everyone, no icon makes that acceptable — the hue has to move. That
rules out roughly 15–150, where the brand would sit on top of `danger` or `warn`.

**Under a dichromacy, a collapse is reported and the affected components are required to
carry a non-hue channel** — the same treatment red-versus-green already receives. This is
the case for any blue brand: tritanopia removes blue–yellow discrimination, so a blue at
240–270 drifts into the grey-green that `ok` occupies. The build succeeds, the collapse
appears in the notes, and `proveStatusChannels()` fails the build if those components have
nothing but colour.

That split is deliberate. Red–green collapse affects roughly 1 in 12 men; the tritanopia
case roughly 1 in 10,000. Refusing to emit anything for a blue brand served neither group —
the realistic outcome was not a better hue but an unusable tool — while the icon reaches
both. A colour someone cannot distinguish was never going to help them; a tick on the badge
does.

```bash
npx nilam 250                     # emits, reports the collapse, requires a glyph
npx nilam 250 --strict-brand-hue  # refuses instead, if the hue is still free to move
```

---

## Display-P3

Two palettes. The sRGB palette is the base; a second is solved against the P3 boundary,
verified against P3 luminance, and emitted behind `@media (color-gamut: p3)` as explicit
`color(display-p3 …)` values. Both pass the same contracts.

Values are pinned rather than left to browser gamut mapping, so the colour that paints is
the colour that was verified. Chroma gained:

| step 9 | sRGB | P3 | |
|---|---|---|---|
| brand solid (light) | 0.219 | 0.234 | +7% |
| brand glow (dark) | 0.174 | 0.188 | +8% |
| danger | 0.220 | 0.249 | +13% |
| warn | 0.133 | 0.152 | +15% |
| ok | 0.195 | 0.229 | +17% |

---

## Limitations

Stated plainly, because the package makes accessibility claims and those claims have
boundaries.

**Contrast model.** WCAG 2.x contrast is a luminance ratio that ignores hue and chroma.
Every floor here inherits that imprecision. APCA was drafted to address it but was removed
from the normative WCAG 3 draft in July 2023, so WCAG 2.2 — now ISO/IEC 40500:2025 —
remains the operative standard.

**Colour-vision simulation.** The Machado, Oliveira & Fernandes matrices are a model.
Only severity 1.0 is simulated; real colour vision varies. The `0.09` separation floor is
a chosen threshold, not a published one.

**Assistive technology.** The keyboard layer implements the ARIA APG contracts. It has not
been tested against NVDA, JAWS, VoiceOver or TalkBack, and real assistive technology
diverges from specification. Where certified AT behaviour is a requirement, pair nilam with
[React Aria](https://react-spectrum.adobe.com/react-aria/).

**Meaning.** A prover measures separation, not appropriateness. Optimising separation
without constraint resolves `danger` to magenta while every assertion passes, which is why
`solve.mjs` bounds each semantic hue to a window where the word still means itself. This
class of error is only visible by rendering.

**One value is chosen, not derived.** `GLOW_L = 0.66`, the dark-mode solid's lightness. No
contrast requirement produces it — in light mode the constraints bind and select the value,
in dark mode they do not. It is measured from two reference colours, and `solve.mjs` records
which and why.

---

## Two brand moments

A filled button **inverts the polarity of the page it sits on**. On a light page it's a
dark object with light text; on a dark page it's a light object with dark text. Material 3 has specified this for years; most systems still solve one value and use it in
both modes.

So step 9 differs by mode:

| | step 9 | ink | on its page |
|---|---|---|---|
| light | `#755cf5` L 0.585 | white | 4.31:1 |
| dark | `#8a7ef7` L 0.660 | dark | 5.79:1 |

The dark value is *the glow* — L 0.66, which is where both
[Zima Blue](https://en.wikipedia.org/wiki/Zima_Blue) (`#009fe3`, L 0.667) and the accent
I'd been using for years (`#8b7cf6`, L 0.657) already sat. Those two are 48° apart in hue
and read as the same *kind* of colour. The same hue at L 0.500 reads as pigment instead.
**Lightness is the variable, not hue.**

Always pair step 9 with `--<family>-ink`. A hard-coded `color: white` on a filled button is
the most common contrast defect in comparable systems.

---

## Usage

### Everything

```css
@import 'nilam/nilam.css';   /* tokens + scale + base + components */
```

### Just the parts you want

```css
@import 'nilam/tokens.css';      /* solved colour, light-dark() */
@import 'nilam/scale.css';       /* type, space, radius, motion, elevation */
@import 'nilam/base.css';        /* element defaults, hue leaks closed */
@import 'nilam/components.css';  /* the .n-* layer */
@import 'nilam/widgets.css';     /* combobox + slider, needed by nilam/behaviours */
@import 'nilam/tailwind.css';    /* Tailwind v4 / shadcn bridge — see below */
```

### Tailwind v4 and shadcn/ui

```css
/* nilam.motion must be NAMED FIRST, before anything else is imported. */
@layer nilam.motion, nilam.tokens, nilam.base, nilam.components, nilam.utilities;

@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import 'nilam/motion.css';
@import 'nilam/tokens.css';
@import 'nilam/base.css';
@import 'nilam/tailwind.css';
@import 'nilam/components.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

**Both lines about `motion.css` matter.** It carries the rule that keeps loaders animating under
`prefers-reduced-motion`, using `!important` to escape the blanket freeze in `nilam.base`. Because
important declarations resolve in **reverse** layer order, that only works from an *earlier* layer —
so importing it is not enough. A layer is created where it is first *named*, and if that happens
during the import it lands after `nilam.utilities` and loses again. Naming the order up front fixes
it. Omit either line and every spinner, bar and skeleton freezes, which reads as a hung app rather
than as reduced motion.

Also add this, until you are on a nilam that ships it:

```css
@layer components {
  /* Tailwind's preflight sets `margin: 0` on *, ::after, ::before and ::backdrop, which kills
     the UA's `margin: auto` on <dialog> — so a modal pins to the top-left corner. */
  .n-dialog { margin: auto; }
}
```

Granular Tailwind imports, not the single `@import 'tailwindcss'`, because sub-layers
cannot interleave with outside layers — nilam has to sit *between* `base` and
`utilities` or either preflight beats nilam's headings or `nilam.base` beats your
utilities. Measured both ways round; both are wrong.

The bridge redefines the ~25 variable names shadcn components read, so `bg-primary`
paints a proven colour with no component source changed. It also sets
`--color-*: initial`, which **removes Tailwind's default palette** — `bg-blue-500` stops
existing, so an unproven colour fails the build instead of shipping quietly.

### Design tokens for other platforms

```js
import { toDtcg, toFigmaVariables, toSwift, toKotlin } from 'nilam';
```

### Keyboard behaviours

```js
import { enhance } from 'nilam/behaviours';
enhance(document);
```

### Your own hue

```bash
npx nilam 262 --css=tokens.css   # solve, prove, emit — or fail and tell you why
```

```js
import { solvePalette, prove, toCss } from 'nilam';

const palette = solvePalette(262);
const { failures } = prove(palette);
if (failures.length) throw new Error(failures.join('\n'));
```

The prover runs on *your* hue. If a green that separates from it under tritanopia doesn't
exist, the build fails and says so.

### Theming

`color-scheme` drives everything, so there is one token block, not three:

```html
<html>                    <!-- follows the OS -->
<html class="dark">       <!-- forced dark -->
<html class="light">      <!-- forced light -->
<div class="dark">        <!-- just this subtree, tokens and all -->
```

That last one is free because of `light-dark()`: custom-property substitution resolves
against the element that *consumes* the value. A dark island on a light page needs no
token redeclaration.

---

## Components

Native-first. The platform grew the hard parts, so there is no focus-trap library, no
positioning library, and no accordion state:

| Component | Built on |
|---|---|
| `.n-dialog` | `<dialog>` — focus trap, Esc, `inert` background, `::backdrop` |
| `.n-pop`, `.n-menu` | Popover API + CSS anchor positioning (Baseline 2026) |
| `.n-tip` | `popover="hint"` |
| `.n-accordion` | `<details name>` — exclusive, zero JS |
| `.n-textarea` | `field-sizing: content` |

Also: `.n-btn`, `.n-input`, `.n-select`, `.n-check`, `.n-radio`, `.n-switch`, `.n-field`,
`.n-card`, `.n-badge`, `.n-note`, `.n-table`, `.n-tabs`, `.n-meter`, `.n-avatar`,
`.n-skeleton`, `.n-link`, `.n-container`, `.n-stack`, `.n-cluster`, `.n-prose`,
`.n-sr-only`, `.n-skip`.

Deliberately absent: combobox, date picker, virtualised table, rich text. Those need real
JS state machines and React Aria already does them properly.

---

## Cascade layers

```css
@layer nilam.tokens, nilam.base, nilam.components, nilam.utilities;
```

Anything you write **unlayered beats all of it** — for normal declarations. No `!important`
needed.

`!important` is the exception, and it works the other way round in two ways worth knowing.
Important declarations resolve in **reverse** layer order, so an earlier layer wins; and an
unlayered important declaration is the *weakest* author priority, not the strongest. Both bit
this package: the reduced-motion loader exemption sat in `nilam.components`, one layer after
`nilam.base`, and lost to it for three releases while its own comment described the opposite.
It now lives in `nilam.motion`, declared first, which is the only reason that file exists.

The package contains three `!important` declarations: `[hidden]`, because without it any
author `display` silently un-hides a hidden element, and two in `nilam.motion` keeping loaders
alive under `prefers-reduced-motion`.

---

## Tests

```bash
npm test
```

7,430 assertions. They cover three separate things:

1. **The solver** — every role contract, gamut, interaction-state perceptibility, and the
   dichromacy separation floor.
2. **The emitted CSS** — parsed back out of the file and re-measured, so a formatter bug
   that swapped the two `light-dark()` arguments would fail even though every colour
   object was correct.
3. **The package** — every `nilam*.css` must appear in both `files` and `exports`, every
   `exports` target must exist, and the bundle must contain its parts.
4. **The tarball** — what `npm pack` would actually publish, asked of the packer rather
   than the filesystem.

Job 3 exists because achroma once shipped with its entire component layer missing from
`files`. Every colour assertion was green. The package was broken.

Job 4 exists because nilam **0.1.0 did it again**, differently: it was published, and
*then* `nilam.tailwind.css` was added to `files` and `exports`. So the tarball had no
bridge while `exports["./tailwind.css"]` pointed at it, and every on-disk assertion
stayed green because the file was there and listed. A consumer got a resolve error.

Both are the same lesson, and so is the step-7 border bug fixed in 0.2.0: **an assertion
that shares its premise with the thing it audits is not an audit.**

## Licence

MIT
