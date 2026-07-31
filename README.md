# nilam

**Proven colour.** A design system whose palette is *solved* from contrast
requirements rather than picked, and verified under three kinds of colour blindness
before it ships.

नीलम — *sapphire*. The signature is a violet-blue at hue 285.

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

## What is actually new here

Two things, and I'd rather name them narrowly than oversell.

### 1. Scales are solved, not picked

Every lightness in the palette is found by **inverting a contrast requirement**.
Step 11 is not "a grey that looks about right for body text" — it is the lightness at
which text hits 4.5:1 against step 3, computed. The contract *is* the construction, so
a step cannot exist at a value that breaks it.

Radix hand-tuned 30 scales over years and the result is genuinely beautiful. It is also
unverifiable: nothing fails if step 11 drifts. Here, something fails.

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

I searched for prior art on a machine-checked dichromat-separation assertion in a design
system and found none. That's the claim, and it's a narrow one.

---

## What this is not

It does **not** compete on breadth, and pretending otherwise would waste your time:

| | What they have that this doesn't |
|---|---|
| **React Aria** | Years of screen-reader, touch, IME and i18n behaviour. Not reproducible in a stylesheet. |
| **Radix** | 30 hand-tuned scales, ~30 headless primitives with full keyboard semantics. |
| **Material 3** | Cross-platform tokens, Figma libraries, governance, published research. |
| **shadcn/ui** | 50+ React components and the de-facto ecosystem. |

**Use nilam for colour and the essential CSS layer. Pair it with React Aria for
stateful widgets** — combobox, date picker, virtualised grid. That pairing is the
recommendation, not a fallback.

What nilam *does* cover is the layer underneath all of them, which none of them
verify.

---

## Honest limits

- **WCAG 2.x contrast maths is imperfect.** It's a luminance ratio that ignores hue
  and chroma. That is the entire reason APCA was drafted. Every floor here inherits
  that flaw. (APCA was *removed* from the normative WCAG 3 draft in July 2023, so
  WCAG 2.2 — now ISO/IEC 40500:2025 — remains the operative standard.)
- **The dichromacy matrices are a model, not ground truth.** Real colour vision varies
  in severity; only severity 1.0 is simulated. The `0.09` separation floor is a number
  I chose.
- **A prover cannot see meaning.** An earlier version optimised separation so hard that
  `danger` came out hot magenta — 476 green assertions and "Delete account" looked like
  a fashion brand. The hue windows in `solve.mjs` exist because of it. This class of
  bug is only visible by rendering.
- **One number is not derived.** `GLOW_L = 0.66`, the dark-mode solid's lightness. I
  tried four ways to derive it and none produce it; it's measured off two colours that
  work. The file says so.
- **sRGB only.** No P3 yet. Everything is gamut-clamped.
- **n=1.** I built it and I use it. Nobody else has yet.

---

## Two brand moments

The one design idea worth stealing even if you don't use the package.

A filled button **inverts the polarity of the page it sits on**. On a light page it's a
dark object with light text; on a dark page it's a light object with dark text. Material 3
has said this for years and most systems still solve one value and use it in both modes.

So step 9 differs by mode:

| | step 9 | ink | on its page |
|---|---|---|---|
| light | `#755cf5` L 0.585 | white | 4.31:1 |
| dark | `#8a7ef7` L 0.660 | dark | 5.79:1 |

The dark value is *the glow* — L 0.66, which is where both
[Zima Blue](https://en.wikipedia.org/wiki/Zima_Blue) (`#009fe3`, L 0.667) and the accent
I'd been using for years (`#8b7cf6`, L 0.657) already sat. Those two are 48° apart in hue
and read as the same *kind* of colour. My first solver put its blues at L 0.500 and they
all looked like highlighter ink. **Lightness was the variable, not hue.**

Always pair step 9 with `--<family>-ink`. Hard-coding `color: white` on a filled button is
the most common contrast bug I found in other systems.

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

Anything you write **unlayered beats all of it**. No `!important` needed. There is exactly
one `!important` in the package — `[hidden]` — because without it any author `display`
silently un-hides a hidden element.

---

## Tests

```bash
npm test
```

857 assertions. They cover three separate things:

1. **The solver** — every role contract, gamut, interaction-state perceptibility, and the
   dichromacy separation floor.
2. **The emitted CSS** — parsed back out of the file and re-measured, so a formatter bug
   that swapped the two `light-dark()` arguments would fail even though every colour
   object was correct.
3. **The package** — every `nilam*.css` must appear in both `files` and `exports`, every
   `exports` target must exist, and the bundle must contain its parts.

Job 3 exists because achroma once shipped with its entire component layer missing from
`files`. Every colour assertion was green. The package was broken.

## Licence

MIT
