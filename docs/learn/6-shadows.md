# 6 · Shadows, and why every dark theme looks flat

"Our dark mode shadows look flat" is a universal complaint. It is not a taste problem and it is
not a rendering bug. It is arithmetic, and once you see it you cannot unsee it.

## What a shadow is

A shadow is a translucent black rectangle, blurred and offset:

```css
box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
/*          ↑ ↑    ↑   ↑                  */
/*          x y  blur  the alpha — 5% opaque */
```

**Alpha** is the fraction of the shadow's colour that ends up in the result. Compositing a
black shadow at alpha `a` over a ground is one multiplication:

```
result = ground × (1 − a)
```

Straightforward. The catch is the units.

## Browsers composite alpha in gamma-encoded sRGB

That multiplication happens on the **stored bytes**, not on light. This is the CSS default and
has been since the beginning.

So "5% black" does not remove 5% of the light. It removes 5% of the *code*. And chapter 2
already told us the codes are not evenly spread: the encoding curve spent most of them at the
light end.

Now count the room available.

| | byte value | codes between it and black |
|---|---|---|
| nilam's light page `#f8f8fd` | 248 | **248** |
| nilam's dark page `#101014` | 16 | **16** |

(Red channel, which is the same as green in both; nothing in the argument turns on the third.)

The light page has 248 codes of darkening available. The dark page has 16.

That is the whole phenomenon in one table, and everything below is a consequence of it.

## Measured

The same black shadow at the same alpha, over the two pages:

| | the byte moves | perceptual change (ΔL) |
|---|---|---|
| black 5% over `#f8f8fd` | 248 → 236, so **12** | 0.036 |
| black 5% over `#101014` | 16 → 15, so **1** | 0.005 |
| black 8% over `#f8f8fd` | 248 → 228, so **20** | 0.060 |
| black 8% over `#101014` | 16 → 15, so **1** | 0.005 |

Twenty steps versus one. Same colour, same alpha, same blur.

And now the part that is genuinely startling:

> Black at **55%** over the dark page moves the byte by 9 and the lightness by 0.045.
> Black at **8%** over the light page moves it by 0.060.

**Eleven times the alpha, and it still does less.** Push it all the way to 100% — a fully
opaque black shadow, which is not a shadow any more — and the dark page moves by 0.175, which
is the absolute ceiling. There are only sixteen codes there. You cannot spend what is not in
the account.

<div class="nd-demo">
  <p class="nd-label">black at 5, 10, 20, 40, 55, 80% — over the light page</p>
  <div class="nd-moment light" style="color:var(--neutral-12)">
    <div class="nd-chips">
      <i style="background:rgb(0 0 0 / 0.05)">5</i>
      <i style="background:rgb(0 0 0 / 0.10)">10</i>
      <i style="background:rgb(0 0 0 / 0.20)">20</i>
      <i style="background:rgb(0 0 0 / 0.40)">40</i>
      <i style="background:rgb(0 0 0 / 0.55)">55</i>
      <i style="background:rgb(0 0 0 / 0.80)">80</i>
    </div>
  </div>
  <p class="nd-label">the identical six, over the dark page</p>
  <div class="nd-moment dark" style="color:var(--neutral-12)">
    <div class="nd-chips">
      <i style="background:rgb(0 0 0 / 0.05)">5</i>
      <i style="background:rgb(0 0 0 / 0.10)">10</i>
      <i style="background:rgb(0 0 0 / 0.20)">20</i>
      <i style="background:rgb(0 0 0 / 0.40)">40</i>
      <i style="background:rgb(0 0 0 / 0.55)">55</i>
      <i style="background:rgb(0 0 0 / 0.80)">80</i>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The top row separates by the second chip. In the bottom row the first four are indistinguishable. <b>This is a single design system's shadow scale, rendered over its own two page colours.</b></p>
</div>

### Why the encoding does this

It is the same fact as chapter 2, viewed from the other end. The sRGB curve deliberately packs
codes into the dark region because that is where the eye is sensitive to small differences. A
*multiplicative* operation like alpha compositing takes a fixed **proportion** of whatever is
there — so where there is almost nothing, it removes almost nothing.

The light end has the opposite problem and it is invisible because nobody needs it: there are
only **7** codes between the light page and pure white, which is why a white glow on a light
page does nothing either.

Worth noting: if browsers composited in linear light instead, the gap at the same alpha would
be about 5.6× rather than 10×. Still uneven — the eye's response is nonlinear regardless — but
much smaller. The gamma encoding roughly doubles the problem.

## So a dark theme needs two different tools

**Tool one: raise the alpha.** Necessary, and not sufficient. nilam's `--shadow-1` runs 0.05 in
light and 0.55 in dark — an **11× step** — and `nilam.scale.css` records the gap needed to look
equal as about 23×.

**Tool two: a rim.** Stop trying to darken the thing underneath and start lightening the top
edge of the thing on top. This is where the encoding finally works in your favour, because on
the dark side the *upward* headroom is 239 codes instead of 16:

| over the dark card `#202020` | byte moves | ΔL |
|---|---|---|
| black at 6% — a shadow | 32 → 30, so **2** | −0.009 |
| white at 6% — a rim | 32 → 45, so **13** | **+0.054** |

Same surface, same alpha, opposite direction: **six times the effect**. That is why every dark
theme that reads as layered has a hairline along the top of its raised surfaces, and why the
ones that only have shadows read as painted-on rectangles.

```css
--rim: inset 0 1px 0 light-dark(transparent, oklch(1 0 0 / 0.06));
```

`inset` puts it inside the box. `0 1px 0` puts it one pixel down with no blur, which is a line
along the top edge. And it is **transparent in light mode**, where it would read as a scratch
rather than as light catching an edge.

## All three, side by side

<div class="nd-demo">
  <p class="nd-label">one fixed alpha · mode-aware alpha · mode-aware alpha plus the rim</p>
  <div class="nd-grid">
    <div class="nd-moment light" style="color:var(--neutral-12)">
      <p class="nd-label">forced light</p>
      <div class="nd-stack">
        <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-4);padding:var(--space-3);font-size:var(--text-0);box-shadow:0 1px 2px rgb(0 0 0 / 0.08)">a fixed 8% black</div>
        <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-4);padding:var(--space-3);font-size:var(--text-0);box-shadow:var(--shadow-1)">--shadow-1</div>
        <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-4);padding:var(--space-3);font-size:var(--text-0);box-shadow:var(--shadow-1),var(--rim)">--shadow-1, --rim</div>
      </div>
    </div>
    <div class="nd-moment dark" style="color:var(--neutral-12)">
      <p class="nd-label">forced dark — the identical three declarations</p>
      <div class="nd-stack">
        <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-4);padding:var(--space-3);font-size:var(--text-0);box-shadow:0 1px 2px rgb(0 0 0 / 0.08)">a fixed 8% black</div>
        <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-4);padding:var(--space-3);font-size:var(--text-0);box-shadow:var(--shadow-1)">--shadow-1</div>
        <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-4);padding:var(--space-3);font-size:var(--text-0);box-shadow:var(--shadow-1),var(--rim)">--shadow-1, --rim</div>
      </div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">In the light column all three look about the same, because a fixed 8% is roughly right there. In the dark column the first has no shadow at all — and the third is the only one that reads as raised.</p>
</div>

## And the three levels

<div class="nd-demo">
  <p class="nd-label">shadow-1, shadow-2, shadow-3 — each with --rim</p>
  <div class="nd-grid">
    <div class="n-card n-card-pad">shadow-1, the default card</div>
    <div class="n-card n-card-pad n-card-float">shadow-2, floating</div>
    <div class="n-card n-card-pad" style="box-shadow:var(--shadow-3),var(--rim)">shadow-3, the dialog</div>
  </div>
</div>

Each level is two shadows stacked: a tight one for the contact edge and a wide, offset one for
the cast. Both alphas are mode-aware.

## The scrim runs the same way

A **scrim** is the dimming layer behind a modal dialog. Measured over the pages it actually
covers:

| | ΔL of the page behind it |
|---|---|
| `--scrim` in light mode — a near-black violet at 40% | −0.283 |
| `--scrim` in dark mode — pure black at 60% | −0.052 |

More alpha in dark mode, a fifth of the effect. Same encoding, same reason.

## How nilam handles it

Three shadow tokens, one rim, one scrim, all mode-aware through `light-dark()`:

```css
--shadow-1:
  0 1px 2px light-dark(oklch(0 0 0 / 0.05), oklch(0 0 0 / 0.55)),
  0 1px 1px light-dark(oklch(0 0 0 / 0.03), oklch(0 0 0 / 0.4));

--rim: inset 0 1px 0 light-dark(transparent, oklch(1 0 0 / 0.06));
```

`nilam.scale.css` calls the alpha gap "the single least obvious thing in the file", and it is
the reason `--rim` exists as a token at all rather than being folded into each shadow: the rim
is a *different* answer to the same question, needed only in one mode.

Two honest notes.

**The 23× figure is nilam's own measurement, not a published constant.** The shipped step at
level one is 11×, and the numbers in this chapter — byte moves, ΔL, the 6× rim advantage — are
what you get from the compositing arithmetic directly. The exact multiplier you want depends on
which perceptual metric you are matching, and there is no standard to cite.

**A shadow is not an accessibility feature.** WCAG 1.4.11 wants 3:1 for the boundary of a
component, and a shadow does not reliably deliver that on either ground. That is what step 6
and step 7 are for. The shadow tells you an object is *raised*; the border is what tells you it
is *there*.

**Next:** [colour blindness](7-colour-blindness.md) — where the measuring gets much harder and
much more interesting.

**Reference:** [Elevation, and the 23× rule](../palette.md#elevation-and-the-23-rule) has the
shipped values and the reasoning as the source records it.
