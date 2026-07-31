# 3 · Contrast, and what 4.5:1 actually means

4.5:1 is a ratio between the amount of light coming off two colours. If your text is at
4.5:1 against its background, the lighter of the two is emitting about four and a half times
as much light as the darker one, after a small correction for the room you are sitting in.

It is also, in a lot of the world, the legal minimum for body text.

## The formula

```js
contrast = (Y_lighter + 0.05) / (Y_darker + 0.05)
```

`Y` is **relative luminance** — the light a colour emits, on a scale where black is 0 and
white is 1. Chapter 2 introduced it; this is what it is for.

Two things to notice.

**The order is by luminance, not by which one is the text.** Light text on a dark background
and dark text on a light background at the same ratio score the same.

**The `+ 0.05` is not a fudge.** It models the ambient light reflecting off the front of the
screen — the flare that stops a black pixel from ever being truly black in a lit room.
Without it, anything against pure black would be infinity. With it, black on white comes out
at exactly:

```
(1.00 + 0.05) / (0.00 + 0.05) = 21
```

**21:1 is the ceiling.** No pair of colours on an sRGB screen can beat it. That is worth
holding onto, because it tells you 7:1 is already most of the way to the maximum, and 4.5:1
is not a generous requirement.

## Where relative luminance comes from

```js
// src/colour.mjs — on LINEARISED channels, not on the raw bytes
Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
```

The weights are the eye's own. Green carries **71%** of perceived brightness, red 21%, blue
just **7%**, because that is roughly how the three cone types in a human retina are
distributed and how sensitive each is.

That one line explains a surprising amount:

| | light emitted | on white | on black |
|---|---|---|---|
| pure yellow `#ffff00` | 0.928 | **1.07:1** | 19.56:1 |
| pure green `#00ff00` | 0.715 | 1.37:1 | 15.30:1 |
| pure red `#ff0000` | 0.213 | 4.00:1 | 5.25:1 |
| pure blue `#0000ff` | 0.072 | 8.59:1 | **2.44:1** |

Yellow on white is 1.07:1 — invisible. Blue on black is 2.44:1 — nearly invisible, in the
opposite direction. Neither is a matter of taste. Yellow is almost all green plus almost all
red, so it is nearly as bright as white; blue contributes 7% of a channel, so it is nearly as
dark as black.

**The linearising step is where people go wrong.** `r`, `g` and `b` in that formula are the
gamma-*decoded* values from chapter 2, not the bytes. Running the weights over the raw
`128, 128, 128` gives 0.502 instead of the true 0.216, and every ratio computed from it is
wrong in the direction of "looks fine". If a contrast checker disagrees with another one, this
is usually why.

## The thresholds

These come from **WCAG** — the Web Content Accessibility Guidelines, published by the W3C.
Version 2.2 is current.

| Rule | What it covers | Level AA | Level AAA |
|---|---|---|---|
| **1.4.3** Contrast (Minimum) | body text | **4.5:1** | 7:1 |
| **1.4.3** | large text — 24px, or 18.66px bold | 3:1 | 4.5:1 |
| **1.4.11** Non-text Contrast | control borders, icons, focus rings, chart marks | **3:1** | — |
| **1.4.1** Use of Colour | colour must not be the *only* way information is conveyed | — | — |

Four things people routinely get wrong about this table:

- **Placeholder text is text.** 1.4.3 applies. Most systems ship placeholders around 2.5:1.
- **A disabled control is exempt from 1.4.3** — but a disabled control nobody can read is
  still a bad control, and the usual implementation (drop the opacity) fades the label too.
- **1.4.11 covers the border of an input.** If you cannot find the edge of a text field, that
  is a failure, not minimalism.
- **1.4.1 is a rule about redundancy, not contrast**, and it is the one nearly every system
  states and nobody enforces. Chapter 7 is about it.

## Why this is a legal question

WCAG 2.2 is published as **ISO/IEC 40500:2025**. Public-sector accessibility law in a lot of
the world points at it or at a standard derived from it — the EU's EN 301 549 and the European
Accessibility Act, the UK's public-sector regulations, Section 508 in the US, Ontario's AODA.
Private-sector exposure varies by jurisdiction and is a question for a lawyer, not a
stylesheet.

The practical upshot for a designer: **4.5:1 is not a preference you can trade against
aesthetics.** For a lot of software it is a floor with a statute behind it, and the fastest way
to fail an audit is a grey that somebody liked.

## The cliff

On a pure white page, the lightest grey that clears 4.5:1 is `#767676`, at 4.542:1.

`#777777` — one byte lighter — is 4.478:1. It fails.

<div class="nd-demo">
  <p class="nd-label">the same sentence, four greys, on white</p>
  <div style="background:#ffffff;border:1px solid #d4d4d8;border-radius:var(--r-4);padding:var(--space-4)">
    <p style="color:#a4a4a4;margin:0">41.2 GB of 50 GB used &nbsp;·&nbsp; #a4a4a4 &nbsp;·&nbsp; 2.49:1 &nbsp;·&nbsp; fails</p>
    <p style="color:#999999;margin:0.5rem 0 0">41.2 GB of 50 GB used &nbsp;·&nbsp; #999999 &nbsp;·&nbsp; 2.85:1 &nbsp;·&nbsp; fails</p>
    <p style="color:#777777;margin:0.5rem 0 0">41.2 GB of 50 GB used &nbsp;·&nbsp; #777777 &nbsp;·&nbsp; 4.48:1 &nbsp;·&nbsp; fails by 0.02</p>
    <p style="color:#767676;margin:0.5rem 0 0">41.2 GB of 50 GB used &nbsp;·&nbsp; #767676 &nbsp;·&nbsp; 4.54:1 &nbsp;·&nbsp; passes</p>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The bottom two are one byte apart and you cannot see the difference. That is the point: <b>the rule is not perceptible at its own boundary</b>, which is precisely why it has to be computed rather than judged.</p>
</div>

The first two are the ones that ship. `#999999` is one of the most common secondary-text
colours in software and it is 2.85:1.

## The honest caveat

The WCAG 2.x formula **ignores hue and chroma entirely**. It sees light and nothing else. Two
consequences:

**Equal ratios do not feel equal.** `#767676` on white is 4.54:1. nilam's `danger` solid
`#e3263d` on white is 4.55:1. The standard rates them identically.

<div class="nd-demo">
  <p class="nd-label">4.54:1 and 4.55:1 — the standard cannot tell these apart</p>
  <div style="background:#ffffff;border:1px solid #d4d4d8;border-radius:var(--r-4);padding:var(--space-4)">
    <p style="color:#767676;margin:0">Your subscription renews on 4 August and the card ending 4471 will be charged. &nbsp;·&nbsp; 4.54:1</p>
    <p style="color:#e3263d;margin:0.75rem 0 0">Your subscription renews on 4 August and the card ending 4471 will be charged. &nbsp;·&nbsp; 4.55:1</p>
  </div>
</div>

**It under-penalises some dark-on-dark pairs.** A pair that measures 4.6:1 on a near-black
background can be noticeably harder to read than the same number on a near-white one.

There was a replacement. **APCA** was drafted specifically to address this and was **removed
from the normative WCAG 3 draft in July 2023**; the algorithm there is still marked "to be
determined", and a W3C Recommendation is not expected before the end of the decade. So WCAG
2.2 is the operative standard — on purpose, not by omission.

The mitigation available today is **margin**: clear the floors by a little rather than exactly.

One more limit, which chapter 7 picks up: contrast is the wrong instrument for *"are these
two the same colour?"*. Two colours can have identical luminance and be perfectly distinct,
and two with very different luminance can be indistinguishable to a colourblind reader.
Contrast has nothing to say about either case.

## How nilam handles it

nilam does not pick colours and measure them. It **inverts the requirement** to find the
colour.

The routine that does it is a bisection — repeatedly halving a range until the answer is
pinned:

```js
// src/colour.mjs
solveLightness({ target: 4.55, against: step3, hue, direction: 'darker', … })
```

Give it a background, a contrast target and a direction, and it returns the lightness that
hits the target. So `--neutral-11` is not a grey that looked about right. It is the lightness
at which text reaches 4.5:1 against `--neutral-3`, computed. **The contract is the
construction**, and a step cannot exist at a value that breaks it.

Every floor is met with headroom rather than exactly, because of the formula's known weakness:
the internal targets are **3.05** where the rule says 3, **4.55** where it says 4.5, and
**7.1** where it says 7.

What it comes out as:

| | light | dark |
|---|---|---|
| step 11 (body text) vs the page | 5.14:1 | 5.32:1 |
| step 11 vs a card | 4.55:1 | 4.55:1 |
| step 12 vs a card | 7.10:1 | 7.10:1 |
| step 7 (control border) vs a card | 3.05:1 | 3.05:1 |
| step 9 (filled button) vs the page | 4.31:1 | 5.79:1 |

The steps solved against a card land exactly on their floors, because that is what solving
*is*. The looser numbers are what falls out for free on an easier background.

### The failure that is worth learning from

Steps 6, 7 and 8 are borders. In the first version all three were solved against **step 1**,
the page, and asserted against step 1. Step 7 measured exactly 3.05:1 and was declared
compliant.

On a **card** — step 3, where controls actually live — it was **2.70:1** in light and 2.61:1
in dark. Every family, both modes.

A closed loop: the code that chose the value and the code that checked it made the same wrong
assumption, so nothing disagreed. It was found by migrating a real application, and the
damage was not theoretical — a dashed **1.37:1** border on the file drop zone, which was the
entire product, and a 3px warning stripe that was supposed to be the redundant channel a
colourblind reader depends on. At 1.37:1 that channel does not exist.

Steps 7 and 8 now solve against step 3, and the prover gained a `7 vs 3` assertion. The
lesson is the one that runs through the whole package:

> An assertion that shares its premise with the thing it audits is not an audit.

Where nilam stops: it inherits every imprecision of the WCAG 2.x model. A 4.5:1 the standard
calls legible can still be an uncomfortable pairing, and nothing here can tell you so.

**Next:** [why twelve steps](4-twelve-steps.md) — and why "light, medium, dark" collapses the
first time you build a real component.

**Reference:** [The role model](../solved.md#the-role-model) has the full contract table.
[The border that was compliant on the page and invisible on a card](../solved.md#4-the-border-that-was-compliant-on-the-page-and-invisible-on-a-card)
is the whole story of the bug above.
