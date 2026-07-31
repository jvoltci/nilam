# Tailwind and shadcn

shadcn/ui is the de-facto React component layer and it hard-codes a fixed set of variable
names: `--background`, `--primary`, `--border`, `--ring` and about twenty more. Every shadcn
component reads them.

So the fastest honest way to get a proven palette into a real app is not to rewrite shadcn.
It is to **redefine what those names mean**.

```css
@import 'nilam/tailwind.css';
```

`bg-primary` then paints a colour whose contrast against its own foreground was proven, and
no shadcn component source changes.

## The import order is load-bearing

```css
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import 'nilam/tokens.css';
@import 'nilam/base.css';
@import 'nilam/tailwind.css';
@import 'nilam/components.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

Granular Tailwind imports, not the single `@import 'tailwindcss'`, because **sub-layers
cannot interleave with outside layers.** nilam has to sit *between* `base` and `utilities`,
or one of two things breaks:

- nilam after `utilities` — `nilam.base`'s heading rules beat your `text-2xl`;
- nilam before `base` — Tailwind's preflight beats nilam's headings.

Both were measured. Both are wrong.

## What the bridge maps

```css
@theme inline { … }
```

`@theme`, not `:root`, and that is not cosmetic: Tailwind v4 generates utilities *from*
`@theme`, so `--color-primary` declared there is what makes `bg-primary` and `text-primary`
exist at all. Declaring the same names in `:root` would define the variables and generate no
classes.

| shadcn name | nilam token | Why that one |
|---|---|---|
| `--color-background` | `--neutral-1` | the page |
| `--color-foreground` | `--neutral-12` | 7:1 text |
| `--color-card`, `--color-popover` | `--surface` | the one untinted surface |
| `--color-primary` | `--brand-9` | the solid; it flips polarity by mode |
| `--color-primary-foreground` | `--brand-ink` | **not** white — see below |
| `--color-secondary`, `--color-muted` | `--neutral-3` | component rest |
| `--color-muted-foreground` | `--neutral-11` | 4.5:1 text |
| `--color-accent` | `--neutral-4` | shadcn's `--accent` is a *hover surface*, not a brand colour |
| `--color-destructive` | `--danger-9` | with `--danger-ink` as its foreground |
| `--color-border` | `--neutral-6` | decorative — a card edge |
| `--color-input` | `--neutral-7` | a control border, which 1.4.11 governs at 3:1 |
| `--color-ring` | `--brand-9` | the focus ring |
| `--color-scrim` | `--scrim` | mode-aware, heavier in light |

Plus the full `neutral-1…12` and `brand-1…12` ramps, so `bg-brand-9` and `text-neutral-11`
work; the five status families as `--color-ok`, `--color-warn`, `--color-danger`,
`--color-info` and `--color-brand` with `-bg` / `-line` / `-fill` / `-ink` variants; the
sidebar namespace; radii; fonts; easings; and the shadows.

### The mapping that matters

shadcn assumes a foreground token per surface, `--primary` plus `--primary-foreground`. nilam
already solves exactly that pairing as step 9 plus `--<family>-ink`, **including the polarity
flip between modes.**

So `--primary-foreground` maps to `--brand-ink` and not to a literal white — which is what
shadcn's own default theme uses, and what breaks its dark mode.

### Two borders, not one

shadcn ships one `--border` for both card edges and control borders. nilam has two, because
only one of them is governed: WCAG 1.4.11 wants 3:1 for a control border because a control is
a non-text UI component, and a card edge is not one. So `--color-border` is step 6 and
`--color-input` is step 7.

### Charts get one scale, not five hues

```css
--color-chart-1: var(--brand-11);
--color-chart-2: var(--brand-10);
--color-chart-3: var(--brand-9);
--color-chart-4: var(--brand-8);
--color-chart-5: var(--brand-7);
```

Five steps of one solved scale rather than five arbitrary hues. A sequential series wants a
lightness ramp: every neighbouring pair is then guaranteed distinguishable, and every one of
them is legible on a card. Five unrelated hues are the usual choice and they fail both tests.

### Shadows map 7-to-3

Tailwind ships seven shadow steps; nilam solves three. They map many-to-one rather than
inventing four more, which keeps every shadow one of the measured ones — including the
mode-aware alpha, which is about 11× heavier in dark mode because browsers composite alpha in
gamma-encoded sRGB. That gap is
[why most dark themes look flat](palette.md#elevation-and-the-tenfold-rule).

## `--color-*: initial`, and it must come first

```css
@theme inline {
  --color-*: initial;   /* FIRST. It resets the namespace. */
  --color-background: var(--neutral-1);
  …
}
```

This line **removes Tailwind's default palette.** `bg-blue-500` stops existing, so an unproven
colour fails the build instead of shipping quietly. Measured in a real app: 657 hardcoded
colour utilities, every one of them a colour nobody had checked.

It has to be the first declaration, because it *resets* the namespace — everything declared
before it is wiped. Written at the bottom of the file first time round, it silently deleted
every token above it and would have shipped a stylesheet that defines no colours at all.

## Anything you write still wins

nilam's own rules are all inside `@layer`, and **unlayered author CSS beats every layer.** So
your components override nilam with no `!important` and no specificity games. Tailwind's
`utilities` layer beats `nilam.components` for the same reason the import order above puts it
last.

## One gap, named

CI parses every shipped stylesheet with a strict parser, which catches a stray brace. What it
does **not** catch is `@theme` nested inside `@layer` — valid CSS and invalid Tailwind. That
one is semantic, it bit this bridge once, and only a real Tailwind build would catch it. It is
named here so the gap is known rather than assumed covered.
