# nilam

![nilam — colour, proven.](assets/hero-light.svg#only-light){ .nd-hero }
![nilam — colour, proven.](assets/hero-dark.svg#only-dark){ .nd-hero }

**Proven colour.** A design system whose palette is *solved* from contrast requirements
rather than picked, and verified under three kinds of colour blindness before it ships.

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

That is the whole example. One class, no `dark:` variant:

<div class="nd-demo">
  <div class="nd-grid">
    <div class="nd-moment light">
      <p class="nd-label">forced light</p>
      <div class="nd-stack">
        <button class="n-btn n-btn-fill" type="button">Save changes</button>
        <button class="n-btn" type="button">Cancel</button>
        <p style="font-size:var(--text-0);color:var(--neutral-11)">Body text, and <a class="n-link" href="https://github.com/jvoltci/nilam">a link</a>.</p>
      </div>
    </div>
    <div class="nd-moment dark">
      <p class="nd-label">forced dark</p>
      <div class="nd-stack">
        <button class="n-btn n-btn-fill" type="button">Save changes</button>
        <button class="n-btn" type="button">Cancel</button>
        <p style="font-size:var(--text-0);color:var(--neutral-11)">Body text, and <a class="n-link" href="https://github.com/jvoltci/nilam">a link</a>.</p>
      </div>
    </div>
  </div>
</div>

Those two panels are on this page at the same time, one forced light and one forced dark,
with **no token redeclared**. That is [`light-dark()`](palette.md#one-token-block-not-three)
doing the work.

The button is a dark violet with white text on the light panel and a glowing light violet
with dark text on the dark one, because step 9 differs by mode and `--brand-ink` follows
it. See [the two brand moments](palette.md#the-two-brand-moments).

---

## What is new

Two things, stated narrowly.

### 1. Scales are solved, not picked

Every lightness in the palette is found by **inverting a contrast requirement**. Step 11
is not "a grey that looks about right for body text" — it is the lightness at which text
hits 4.5:1 against step 3, computed. The contract *is* the construction, so a step cannot
exist at a value that breaks it.

Hand-tuned scales are unverifiable by construction: nothing fails when a step drifts.
Here, something fails. [Why solved colour](solved.md) is the argument, including the four
times the solver was wrong and what caught it.

### 2. It proves itself for colourblind readers

Roughly 8% of men are dichromatic. Every design system answers this with the advice
*"don't rely on colour alone"* and then ships a red/green semantic pair without ever
checking it.

nilam simulates every status pair under protanopia, deuteranopia and tritanopia and
measures the separation. Where a pair collapses it says so and requires the component to
carry a second, non-hue channel — and that requirement is a build failure, not a
suggestion.

[Colour blindness](colour-blindness.md) has the live simulation and the measured numbers.

!!! warning "The keyboard layer has not been tested with a screen reader"

    Not NVDA, not JAWS, not VoiceOver, not TalkBack. The ARIA contracts are implemented
    from the APG; real assistive technology diverges from specification. Where certified
    AT behaviour is a requirement, pair nilam with
    [React Aria](https://react-spectrum.adobe.com/react-aria/). The full list of
    boundaries is on [Limitations](limitations.md) and it is worth reading before you
    depend on any of this.

---

## Install

Everything:

```css
@import 'nilam/nilam.css';   /* tokens + scale + base + components */
```

Or just the parts you want:

```css
@import 'nilam/tokens.css';      /* solved colour, light-dark() */
@import 'nilam/scale.css';       /* type, space, radius, motion, elevation */
@import 'nilam/base.css';        /* element defaults, hue leaks closed */
@import 'nilam/components.css';  /* the .n-* layer */
@import 'nilam/widgets.css';     /* combobox + slider, needs nilam/behaviours */
@import 'nilam/tailwind.css';    /* Tailwind v4 / shadcn bridge */
```

Zero dependencies, no build step, no runtime. React, Next, Vite, Astro and a bare `.html`
file consume the identical file.

| I want | Go to |
|---|---|
| The argument, and the failures behind it | [Why solved colour](solved.md) |
| The dichromacy assertion, simulated live | [Colour blindness](colour-blindness.md) |
| Every token, every swatch, theming | [Tokens](palette.md) |
| Buttons, dialogs, tables, the lot | [Components](components.md) |
| Arrow keys, typeahead, roving focus | [Behaviours](behaviours.md) |
| Figma, Swift, Kotlin, Style Dictionary | [Platform export](tokens.md) |
| `bg-primary` painting a proven colour | [Tailwind and shadcn](tailwind.md) |
| What this does not do | [Limitations](limitations.md) |

## Your own hue

The palette is not a set of values, it is a function. Pass a different hue and everything
is re-derived:

```bash
npx nilam 262 --css=tokens.css   # solve, prove, emit — or fail and tell you why
```

```js
import { solvePalette, prove } from 'nilam';

const palette = solvePalette(262);
const { failures } = prove(palette);
if (failures.length) throw new Error(failures.join('\n'));
```

The prover runs on *your* hue. If a green that separates from it under tritanopia does not
exist, the build fails and says so. That is not hypothetical — the brand hue constrains
which semantic hues remain available, and it is
[why `info` carries no hue at all](colour-blindness.md#why-info-is-achromatic).

## The showcase

[The demo page](demo/index.html) is the single-page version: every ramp, both modes, the
dichromacy simulation, and every component, with `nilam.css` imported whole and nothing
else on the page.

It is worth knowing what it is *not*. These docs load tokens, scale, components and
widgets but **not** `nilam.base.css`, because base carries the package's one `!important`
— `[hidden]` — and mkdocs-material ships its own theme toggle as a `hidden` label that it
un-hides with CSS. A layered `!important` beats unlayered author CSS, so under base the
toggle in the header above would never appear. The demo page has no such constraint and
loads the lot.

## Tests

```bash
npm test
```

Three suites, and they cover different things:

| Suite | Assertions | What it checks |
|---|---|---|
| `prove.test.mjs` | 1,277 | the solver's contracts, and the emitted CSS parsed back out of the file and re-measured |
| `dtcg.test.mjs` | 5,955 | the token export, both directions against the stylesheet |
| `behaviours.test.mjs` | 198 | the APG keyboard contracts |

500 of those live in `prove()` itself, which is the set the header of `nilam.tokens.css`
claims hold over its exact values.

Reading the emitted CSS back is not belt-and-braces. A formatter bug that swapped the two
`light-dark()` arguments would leave every colour object correct and every shipped mode
inverted. The package manifest and the packed tarball are asserted for the same reason:
both have shipped broken before, with every colour assertion green.

> An assertion that shares its premise with the thing it audits is not an audit.

## Licence

MIT.
