# 9 · The cascade

The **cascade** is how a browser decides which of several conflicting declarations wins. For
about twenty years the practical answer was "whichever selector is most specific", and that one
fact is responsible for more `!important` in the world than everything else combined.

`@layer` replaced it with something you can decide on purpose.

## Specificity, in one table

A selector's specificity is three numbers, compared left to right:

| Selector | Specificity | Reads as |
|---|---|---|
| `#save` | **1**, 0, 0 | one id |
| `.btn.btn-primary` | 0, **2**, 0 | two classes |
| `.btn:hover` | 0, **2**, 0 | a class and a pseudo-class — classes and pseudo-classes count the same |
| `.btn` | 0, **1**, 0 | one class |
| `button[type]` | 0, **1**, 1 | one attribute and one element |
| `button` | 0, 0, **1** | one element |
| `:where(button)` | **0, 0, 0** | zero, always — `:where()` erases it |

Then, outranking all of that:

| | Beats |
|---|---|
| `style="…"` attribute | every selector |
| `!important` | every normal declaration in the same origin, including inline styles |

Two useful details. **A higher first number wins outright** — a single id beats a hundred
classes. And **`:where()` has zero specificity**, which is why `nilam.base.css` writes its
element defaults as `:where(img, svg, video, canvas)` rather than as a bare element list: a
default that is trivially overridable is a default that does not have to be fought.

## What went wrong for twenty years

Here is the whole problem, in four steps that every team has lived through.

**1.** A design system publishes a button.

```css
.btn { background: #4a5568 }        /* 0,1,0 */
```

**2.** A consumer needs a green one in one place.

```css
.checkout .btn { background: green }  /* 0,2,0 — wins, by accident */
```

**3.** The system's next release needs a hover state, so it writes two classes.

```css
/* 0,2,0 — now it is a tie, and source order decides */
.btn.btn-primary { background: #4a5568 }
```

**4.** The tie is unpredictable across bundlers, so the consumer reaches for the hammer.

```css
.checkout .btn { background: green !important }
```

And now the system cannot ever change that property again without escalating too. Both sides
are stuck writing more specific selectors and more `!important`, and the specificity of a rule
has stopped meaning anything about intent — it is just ammunition.

The result is a rule of thumb worth stating flatly:

> A design system that needs `!important` to override is a design system people fork.

## What `@layer` changed

A **cascade layer** is a named bucket. You declare the order once, and then:

**Every declaration in an earlier layer loses to every declaration in a later layer,
regardless of specificity.**

That sentence is the whole feature. Specificity still decides *inside* a layer; it stops
deciding *between* layers.

```css
@layer reset, framework, components, utilities;
```

And the piece that makes it usable as a publishing strategy: **unlayered styles form an
implicit last layer that beats every named one.** So a stylesheet that puts all of itself in a
layer has made itself overridable by anybody writing ordinary CSS, at any specificity, with no
`!important` anywhere.

The full cascade order, most important criterion first:

1. **Origin and importance** — browser default, user stylesheet, author stylesheet, and
   `!important` inverts the order of all three
2. **Cascade layers**, within an origin
3. **Specificity**
4. **Order of appearance**

Layers sit *above* specificity. That is the change.

### See it

nilam paints the glyph on a danger note with two classes, inside a layer:

```css
/* @layer nilam.components — two classes, so 0,2,0 */
.n-note-danger .n-note-glyph {
  background: var(--danger-9);
  color: var(--danger-ink);
}
```

Below, the second note's glyph carries one extra class, `.nd-swap`, declared **unlayered** at a
specificity of **0,1,0** — lower than the rule it is beating:

```css
/* unlayered, one class */
.nd-swap { background: var(--ok-9); color: var(--ok-ink) }
```

<div class="nd-demo">
  <p class="nd-label">the same component, twice</p>
  <div class="nd-stack">
    <div class="n-note n-note-danger">
      <i class="n-note-glyph">×</i>
      <div><span class="n-note-title">Payment failed</span> — nilam's layered rule paints this glyph.</div>
    </div>
    <div class="n-note n-note-danger">
      <i class="n-note-glyph nd-swap">×</i>
      <div><span class="n-note-title">Payment failed</span> — and one unlayered class repaints it.</div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">A <b>0,1,0</b> selector beat a <b>0,2,0</b> selector, with no <code>!important</code> and no id. Before cascade layers that was simply not expressible — the only way to win was to be more specific than whatever the library happened to write, which meant reading its source and then racing it.</p>
</div>

<style>
  /* Unlayered on purpose — that is the point being made. */
  .nd-swap { background: var(--ok-9); color: var(--ok-ink) }
</style>

## `!important` inside layers reverses the order

This is the part that catches people, and it is logical once you see why.

Two things run the other way for `!important`, and they are the opposite of what almost
everybody assumes.

**Layer order runs backwards.** An `!important` in the *first* layer beats an `!important` in a
later one.

**An unlayered `!important` is the weakest author priority, not the strongest.** It loses to an
`!important` in any named layer.

The reason both hold is consistency: `!important` exists to let a lower-priority origin overrule
a higher-priority one — that is why a user stylesheet's `!important` beats an author's. Layers
inherit the same inversion, so the mechanism behaves the same way at every level.

Three consequences, all of which nilam has actually run into. One of them shipped broken for
three releases.

### The `!important` that lost for three releases

`nilam.base.css` carries the usual blanket reduced-motion rule:

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important }
}
```

Right for decoration, wrong for a loader — a frozen spinner does not read as "motion reduced",
it reads as "this app has hung", and the reader loses the only signal that anything is still
happening. So there is an exemption that keeps the loaders moving on `opacity` alone.

The exemption was written in `nilam.components.css`, **one layer after `nilam.base`**, on the
entirely reasonable assumption that a later layer wins.

It does not, for `!important`. Base beat it. **Every loader froze, in every release from 0.2.0
to 0.4.0** — and the comment sitting beside the exemption confidently described the opposite.
Measured on a built page, the spinner, the bar and the skeleton all reported
`n-breathe 1e-05s 1 iteration`.

The fix is a file: `nilam.motion.css`, declared **first**. That is the only reason it exists as a
separate stylesheet — its layer position is its entire purpose.

And there was a second bug hiding inside the first. The skeleton was not in the exemption's
selector list, so it inherited base's `animation-iteration-count: 1 !important` and breathed
exactly **once** before stopping. Which for a skeleton is worse than not animating at all,
because the reader watches it settle and concludes the content has arrived.

The package therefore contains **three** `!important` declarations, not one: `[hidden]`, and two
in `nilam.motion` keeping loaders alive.

### `[hidden]`, and what it costs

```css
/* nilam.base.css */
[hidden] { display: none !important }
```

It is there because without it, an author writing `.flex { display: flex }` on an element that
also has the `hidden` attribute **silently un-hides it**. `[hidden]`'s UA default is
`display: none`, and any author `display` beats a UA default. This was measured in a real
application.

It also has a cost, and this site pays it. mkdocs-material ships its own light/dark toggle as
a `hidden` label that it un-hides with CSS:

```css
.md-option:checked + label:not([hidden]) { display: block }
```

A layered `!important` beats unlayered author CSS. So under `nilam.base.css` that label stays
hidden for ever — no theme toggle in the header, on a site whose subject is light and dark.
Which is why these docs load `tokens`, `scale`, `components` and `widgets` but **not** `base`,
and the reasoning is written out at the top of `docs/stylesheets/extra.css` so the decision
cannot quietly become an oversight.

### The trick in the screenshot harness

The same rule, used on purpose this time. nilam's visual-regression suite has to freeze five
infinite animations to take a deterministic screenshot, and it has to beat the loader exemption
described above. So the harness injects:

```css
@layer nilam.motion {                          /* the FIRST layer */
  * { animation-play-state: paused !important }
}
```

The layer name is the whole trick. For `!important` declarations the order reverses, so an
`!important` in the first layer beats one in a later layer. **Unlayered would have lost.**

Two details that make it work. Re-opening an existing layer name **appends to that layer in its
original position**, so this genuinely lands in `nilam.motion` rather than creating a new last
layer. And the harness targeted `nilam.tokens` until 0.4.1 — it had to move when the loader
exemption did, which is a fair illustration of how much of this depends on knowing the layer
order rather than on the selectors.

Which is the point worth taking away: the same rule that caused a three-release bug is what
makes the screenshot harness work. It is not a trap, it is a mechanism — the trap is not
knowing it is there.

## `revert-layer`, and the collision that found it

`revert-layer` rolls one property back as if the current layer had not declared it, handing the
decision to the next-highest layer down.

It exists for a real problem, and this site hit it. mkdocs-material's reset contains,
**unlayered**:

```css
button { background: #0000; border: 0; margin: 0; padding: 0 }
input  { border: 0; outline: none }
```

Unlayered beats every layer regardless of specificity. So inside these pages a `.n-btn` had no
background, no border and no padding, and a `.n-input` had no border — **the demo of a solved
3:1 control border was rendering with no border at all.**

The fix:

```css
.md-typeset .nd-demo :is(button, input, select, textarea, progress) {
  background: revert-layer;
  border: revert-layer;
  padding: revert-layer;
  margin: revert-layer;
}
```

And specifically **not** a restatement of nilam's values. Writing
`background: var(--brand-9)` here would have worked identically and would have meant the demos
were painted by the documentation rather than by the package — which is the one thing they must
not be. `revert-layer` hands each property back to `@layer nilam.components`, so `.n-btn-fill`
paints `--brand-9` for exactly the reason it does in your application.

That is the general lesson about layers: they let you **step out of a fight** instead of winning
it, and stepping out is usually the answer that stays correct.

## How nilam handles it

One line, and it is the first line of `nilam.tokens.css`:

```css
@layer nilam.motion, nilam.tokens, nilam.base,
       nilam.components, nilam.utilities;
```

Declaring the order up front is what fixes it for every file loaded afterwards, which is why the
import order in your own stylesheet matters — loading `components.css` first would create
`nilam.components` earlier than `nilam.tokens` and invert the cascade.

`nilam.motion` is first for one reason and one reason only: it holds `!important` declarations
that have to outrank `nilam.base`'s, and for `!important` the earliest layer wins.

Everything nilam ships is inside one of those five layers. **Anything you write unlayered beats
all of it** — for normal declarations. No `!important` needed, no `:where()` gymnastics, no `#id`
escalation. And three `!important` declarations in the whole package, each with its cost written
down rather than hidden.

The same property is what makes the Tailwind bridge work at all. Tailwind v4 puts its own output
in layers, and nilam has to sit **between** `base` and `utilities`:

```css
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import 'nilam/tokens.css';
@import 'nilam/base.css';
@import 'nilam/tailwind.css';
@import 'nilam/components.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

Granular imports rather than the single `@import 'tailwindcss'`, because sub-layers cannot
interleave with outside layers. Put nilam after `utilities` and `nilam.base`'s heading rules beat
your `text-2xl`; put it before `base` and Tailwind's preflight beats nilam's headings. Both were
measured. Both are wrong.

**Next:** [what the browser now does for free](10-the-platform.md).

**Reference:** [Cascade layers](../palette.md#cascade-layers) ·
[Tailwind and shadcn](../tailwind.md) ·
[How the screenshots are made deterministic](../visual.md#how-the-screenshots-are-made-deterministic)
