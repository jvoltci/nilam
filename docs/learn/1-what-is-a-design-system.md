# 1 · Why a design system, and why not just write CSS

A design system is a short list of named decisions, plus something that stops anyone adding
to the list by accident.

That is the whole idea. The rest of this chapter is about why the second half matters more
than the first.

## The problem, concretely

Here are eight greys taken from one real application's stylesheet. All eight were used as a
surface colour. Which one is the card?

<div class="nd-demo">
  <p class="nd-label">eight surface greys from one app</p>
  <div class="nd-chips">
    <i style="background:#f4f4f5;color:#333;border:1px solid #d4d4d8">f4f4f5</i>
    <i style="background:#f5f5f5;color:#333;border:1px solid #d4d4d8">f5f5f5</i>
    <i style="background:#f6f6f7;color:#333;border:1px solid #d4d4d8">f6f6f7</i>
    <i style="background:#f7f7f8;color:#333;border:1px solid #d4d4d8">f7f7f8</i>
    <i style="background:#f8f8f8;color:#333;border:1px solid #d4d4d8">f8f8f8</i>
    <i style="background:#f9f9fa;color:#333;border:1px solid #d4d4d8">f9f9fa</i>
    <i style="background:#fafafa;color:#333;border:1px solid #d4d4d8">fafafa</i>
    <i style="background:#fbfbfc;color:#333;border:1px solid #d4d4d8">fbfbfc</i>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The widest gap between any two of those is under 2% of the way from black to white. On a phone in sunlight they are one colour.</p>
</div>

Nobody chose eight. They arrived one at a time, and every arrival was reasonable:

- A designer picked `#f5f5f5` in one mock-up and `#f4f4f5` in another, three weeks apart.
- A developer typed `#f6f6f7` from memory.
- A component library was installed and it shipped `#fafafa`.
- A Figma plugin exported `#f7f7f8` because it rounded differently.
- Somebody fixed a bug by nudging one value and left the other four alone.

None of that is carelessness. It is the predictable result of a system where **there is no
definition of correct**, so there is nothing for anyone to be wrong about.

## What "token" means

A **design token** is a named decision. In CSS it looks like a custom property — a variable
you declare once and reference everywhere:

```css
:root {
  --neutral-3: #eaeaef;   /* the declaration */
}

.card {
  background: var(--neutral-3);   /* the reference */
}
```

The important part is not the syntax. It is that the name carries the *role*, not the
appearance. `--neutral-3` does not mean "that light grey". It means **the surface a
component rests on**. Anything that is a component surface uses it, and the moment the value
changes, everything that is a component surface changes with it.

Compare the two names you could have chosen:

| Name | What a reader learns | What happens when it changes |
|---|---|---|
| `--grey-100` | it is grey, and lighter than `--grey-200` | you must find every use and decide, one by one |
| `--neutral-3` | it is the resting surface of a component | every resting surface follows, correctly, at once |

`--grey-100` is a value with a label on it. `--neutral-3` is a decision. Only the second one
can be checked, because only the second one makes a claim.

## Why not just write CSS

You can, and for one page by one person you should. A design system is overhead and the
overhead only pays back at a certain size.

Three things break as you cross that size, and they break in this order.

**1. No name means no agreement.** Two people cannot pick the same grey. They are not
looking at the same screen, in the same light, on the same day.

**2. No definition means no test.** Suppose you do agree on `#f5f5f5`. Six months later
someone asks whether the grey text on it is legible. There is no answer, because nobody
wrote down what "legible" was supposed to mean. So the question gets settled by whoever
squints hardest.

**3. No test means drift is invisible.** This is the one that actually produces the eight
greys. A hand-tuned scale is *unverifiable by construction*: nothing fails when a step
moves. The system does not degrade with a bang. It degrades one plausible commit at a time,
and every one of those commits looks fine in review.

## What breaks first: dark mode

The clearest demonstration that a hard-coded value is not a decision is to look at it in a
second context. Below, the same five values on a light panel and on a dark one.

<div class="nd-demo">
  <p class="nd-label">hand-picked values, in two contexts</p>
  <div class="nd-grid">
    <div class="nd-moment light" style="color:var(--neutral-12)">
      <p class="nd-label">forced light</p>
      <div style="background:#ffffff;border:1px solid #eeeeee;border-radius:0.625rem;padding:var(--space-4)">
        <p style="font-weight:600;color:#111111;margin:0">Storage</p>
        <p style="color:#999999;font-size:0.8125rem;margin:0.25rem 0 0">41.2 GB of 50 GB used</p>
      </div>
    </div>
    <div class="nd-moment dark" style="color:var(--neutral-12)">
      <p class="nd-label">forced dark — the identical five values</p>
      <div style="background:#ffffff;border:1px solid #eeeeee;border-radius:0.625rem;padding:var(--space-4)">
        <p style="font-weight:600;color:#111111;margin:0">Storage</p>
        <p style="color:#999999;font-size:0.8125rem;margin:0.25rem 0 0">41.2 GB of 50 GB used</p>
      </div>
    </div>
  </div>
  <p class="nd-label">the same card, built from tokens</p>
  <div class="nd-grid">
    <div class="nd-moment light" style="color:var(--neutral-12)">
      <p class="nd-label">forced light</p>
      <div class="n-card n-card-pad">
        <p style="font-weight:var(--weight-semibold)">Storage</p>
        <p style="color:var(--neutral-11);font-size:var(--text-0);margin-block-start:var(--space-1)">41.2 GB of 50 GB used</p>
      </div>
    </div>
    <div class="nd-moment dark" style="color:var(--neutral-12)">
      <p class="nd-label">forced dark — the identical two token names</p>
      <div class="n-card n-card-pad">
        <p style="font-weight:var(--weight-semibold)">Storage</p>
        <p style="color:var(--neutral-11);font-size:var(--text-0);margin-block-start:var(--space-1)">41.2 GB of 50 GB used</p>
      </div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Both dark panels are on this page at the same time as the light ones, and <b>no token is redeclared anywhere</b>. The lower pair says <code>--surface</code> and <code>--neutral-11</code>; the upper pair says <code>#ffffff</code> and <code>#999999</code>.</p>
</div>

The top-right card is not a styling mistake. It is the correct rendering of the instruction
it was given. `#ffffff` means "white" and it will keep meaning white for ever, including on
a page where white is wrong.

Also worth noting: that `#999999` body text is **2.85:1** against white. Chapter 3 explains
why that number matters and what the legal floor is.

## What a design system is not

- **Not a component library.** A library of buttons is one way to *deliver* the decisions.
  It is not the decisions.
- **Not a Figma file.** A Figma file is one place the decisions are used. If it is the only
  place they exist, the code has its own set.
- **Not a brand guideline.** A guideline says what to do. A system makes the wrong thing
  harder to type than the right thing.

The test is simple: if two people can each do a reasonable thing and get different pixels,
the system is not doing its job yet.

## The four parts

Almost every design system, whatever it is called, is these four things:

| Part | What it is | Where nilam keeps it |
|---|---|---|
| **Tokens** | the named decisions, mostly colour | `nilam.tokens.css` |
| **Scales** | the non-colour numbers — type, space, radius, motion | `nilam.scale.css` |
| **Components** | the decisions assembled into buttons, cards, dialogs | `nilam.components.css` |
| **Proof** | the thing that fails when a decision drifts | `src/prove.mjs` and the test suites |

The fourth one is the part most systems skip, and it is the reason the other three rot.

## How nilam handles it

nilam ships **79 colour tokens**: six families — `neutral`, `brand`, `danger`, `warn`, `ok`,
`info` — of twelve steps each, plus an ink token per family and one card surface. Every step
is a role, not a shade.

The difference from a hand-tuned system is that each role is a **contract**, and the value is
computed from it. `--neutral-11` is not a grey somebody liked. It is the lightness at which
text reaches 4.5:1 against `--neutral-3`, found by arithmetic. So the value cannot exist at a
number that breaks the promise, because the promise is what produced the number.

That gives you the thing the eight greys were missing: something fails. **7,430 assertions**
run on every push, plus 31 rendered screenshots compared pixel by pixel. When a step drifts,
the build stops.

What nilam does not claim: that using it makes an interface accessible. It makes the colour
decisions checkable. Layout, wording, focus order and screen-reader behaviour are still
yours, and [Honest limits](../limitations.md) lists exactly where the guarantees end.

**Next:** [why a hex code is a trap](2-hex-is-a-trap.md) — and why `#808080` is not half as
bright as white.

**Reference:** [Tokens](../palette.md) has every value and every swatch.
[Why solved colour](../solved.md) is the full argument, including the four times the solver
was wrong.
