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

For `!important` declarations, **layer order runs backwards**. An `!important` in the *first*
layer beats an `!important` in a later one. And an `!important` in any layer beats **unlayered**
author CSS.

The reason is consistency: `!important` exists to let a lower-priority origin overrule a
higher-priority one — that is why a user stylesheet's `!important` beats an author's. Layers
inherit the same inversion so the mechanism behaves the same way at every level.

Two consequences, both of which nilam has actually run into.

### The one `!important` in the package

```css
/* nilam.base.css */
[hidden] { display: none !important }
```

It is there because without it, an author writing `.flex { display: flex }` on an element that
also has the `hidden` attribute **silently un-hides it**. `[hidden]`'s UA default is
`display: none`, and any author `display` beats a UA default. This was measured in a real
application, and it is the only `!important` in the package.

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

nilam's visual-regression suite has to freeze five infinite animations to take a deterministic
screenshot. `nilam.components.css` deliberately *exempts* the loaders from the reduced-motion
rule with `animation-iteration-count: infinite !important`, because a frozen spinner reads as a
hung application rather than as reduced motion.

So the harness injects:

```css
@layer nilam.tokens {                          /* the FIRST layer */
  * { animation-play-state: paused !important }
}
```

The layer name is the whole trick. For `!important` declarations the order reverses, so an
`!important` in `nilam.tokens` beats one in `nilam.components`. **Unlayered would have lost.**

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
@layer nilam.tokens, nilam.base, nilam.components, nilam.utilities;
```

Declaring the order up front is what fixes it for every file loaded afterwards, which is why the
import order in your own stylesheet matters — loading `components.css` first would create
`nilam.components` earlier than `nilam.tokens` and invert the cascade.

Everything nilam ships is inside one of those four layers. **Anything you write unlayered beats
all of it.** No `!important` needed, no `:where()` gymnastics, no `#id` escalation. And exactly
one `!important` in the whole package, for `[hidden]`, with its cost documented rather than
hidden.

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
