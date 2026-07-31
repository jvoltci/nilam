# 8 · Type and space

None of this can be solved.

There is no contrast requirement to invert for "how big is a heading". No standard says a card
must have 16px of padding. So the honest thing a design system can do here is different: state
**where each number came from**, so the next person can argue with the reasoning instead of
guessing at the intent.

That is a lower bar than the colour chapters and it is still higher than most systems clear.

## Modular scales

A **modular scale** is a base size and a ratio. Multiply repeatedly and you have your sizes.

Ratios come from musical intervals, which is a nice piece of history and no argument at all for
using any particular one:

| Ratio | Name | 16px base, going up |
|---|---|---|
| 1.2 | minor third | 16, 19.2, 23.0, 27.6, 33.2 |
| 1.25 | major third | 16, 20, 25, 31.3, 39.1 |
| 1.333 | perfect fourth | 16, 21.3, 28.4, 37.9, 50.5 |
| 1.5 | perfect fifth | 16, 24, 36, 54, 81 |
| 1.618 | golden | 16, 25.9, 41.9, 67.8, 109.7 |

Every type tutorial recommends 1.333 or 1.5, and every one of those tutorials is demonstrating
on a page with one heading and one paragraph.

## Why 1.2 and not 1.5

Count the sizes a real interface needs **inside one card**: a title, a section label, body text,
a caption, and a micro label for legal or metadata. That is five, and they all have to be
distinguishable from each other and readable.

<div class="nd-demo">
  <p class="nd-label">five sizes at a 1.5 ratio</p>
  <div class="n-card n-card-pad">
    <p style="font-size:54px;line-height:1.1;font-weight:600;margin:0">Billing</p>
    <p style="font-size:36px;line-height:1.15;font-weight:600;margin:0.5rem 0 0">Current plan</p>
    <p style="font-size:24px;line-height:1.3;margin:0.5rem 0 0">Pro, £29 a month</p>
    <p style="font-size:16px;line-height:1.6;margin:0.5rem 0 0">Renews on 4 August. You can change or cancel at any time.</p>
    <p style="font-size:10.7px;line-height:1.5;margin:0.5rem 0 0;color:var(--neutral-11)">VAT included where applicable · 7.1px would be the next step down</p>
  </div>
  <p class="nd-label">the same five at a 1.2 ratio</p>
  <div class="n-card n-card-pad">
    <p style="font-size:27.6px;line-height:1.15;font-weight:600;margin:0">Billing</p>
    <p style="font-size:23px;line-height:1.2;font-weight:600;margin:0.5rem 0 0">Current plan</p>
    <p style="font-size:19.2px;line-height:1.35;margin:0.5rem 0 0">Pro, £29 a month</p>
    <p style="font-size:16px;line-height:1.6;margin:0.5rem 0 0">Renews on 4 August. You can change or cancel at any time.</p>
    <p style="font-size:13.3px;line-height:1.5;margin:0.5rem 0 0;color:var(--neutral-11)">VAT included where applicable · 11.1px would be the next step down</p>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Five steps of 1.5 span 10.7px to 54px — a <b>5× range inside one card</b>, and the next step down is 7px, which is not text. Five steps of 1.2 span 13.3px to 27.6px, and every one of them is usable.</p>
</div>

A big ratio runs out of room by the third size. It looks better in a specimen and falls apart
in a dense interface. That is the entire argument for 1.2, and it is a judgement, not a
measurement — but it is a judgement you can now check against your own densest screen.

## Fluid, so nothing jumps

A fixed scale needs breakpoints, and at every breakpoint the type visibly snaps. `clamp()`
removes them:

```css
--text-4: clamp(1.375rem, 1.26rem + 0.57vw, 1.75rem);
/*              ↑ floor   ↑ grows with the viewport  ↑ ceiling */
```

`vw` is 1% of the viewport width, so the middle term rises smoothly as the window widens and
the two ends stop it going anywhere silly. nilam's steps are fluid between a **360px and a
1280px** viewport — the narrowest phone worth supporting and a comfortable laptop.

<div class="nd-demo">
  <p class="nd-label">the shipped scale — resize the window and watch it move</p>
  <div class="nd-stack" style="gap:var(--space-2)">
    <p style="font-size:var(--text-6);line-height:var(--leading-tight);margin:0">--text-6 &nbsp;<span style="font-size:var(--text-000);color:var(--neutral-11)">page title</span></p>
    <p style="font-size:var(--text-5);line-height:var(--leading-tight);margin:0">--text-5</p>
    <p style="font-size:var(--text-4);line-height:var(--leading-snug);margin:0">--text-4</p>
    <p style="font-size:var(--text-3);line-height:var(--leading-snug);margin:0">--text-3 &nbsp;<span style="font-size:var(--text-000);color:var(--neutral-11)">section heading</span></p>
    <p style="font-size:var(--text-2);margin:0">--text-2</p>
    <p style="font-size:var(--text-1);margin:0">--text-1 &nbsp;<span style="font-size:var(--text-000);color:var(--neutral-11)">body, the default</span></p>
    <p style="font-size:var(--text-0);margin:0">--text-0 &nbsp;<span style="font-size:var(--text-000);color:var(--neutral-11)">secondary body</span></p>
    <p style="font-size:var(--text-00);margin:0">--text-00 &nbsp;captions, meta</p>
    <p style="font-size:var(--text-000);letter-spacing:var(--tracking-micro);text-transform:uppercase;margin:0">--text-000 &nbsp;micro</p>
  </div>
</div>

## Why `rem` is an accessibility requirement

`rem` means "relative to the root font size". `px` means "this many pixels, whatever you asked
for".

Here is the distinction people get wrong. **Browser zoom scales `px` too** — pinch-zoom and
Ctrl+= work fine on a px layout. But the *default font size* setting in browser preferences is
a different mechanism, and it is the one a lot of people with low vision actually use, because
it enlarges text without making every layout horizontally scrollable. That setting changes the
**root font size**, and only `rem` follows it.

So `font-size: 14px` is not a neutral choice. It is a decision to override a preference the
user has explicitly stated.

**WCAG 1.4.4 Resize Text** requires content to work at 200% without loss of content or
function. And there is a trap right at the top of the stylesheet:

```css
html { font-size: 14px }   /* this breaks every rem below it */
```

Setting a pixel root size disables the user's setting for the whole document, including
everything expressed in `rem`. `nilam.base.css` notes this against the rule it does set:
`-webkit-text-size-adjust: 100%`, with a comment that reads "1.4.4 Resize Text: never set a px
root size."

The same applies to spacing. nilam's space scale is a **4px grid expressed in rem** — 0.25rem,
0.5rem, 0.75rem, 1rem — so when a reader doubles their font size, the padding grows with it and
a control does not end up with text pressed against its edges.

## The 65-character measure

```css
--measure: 65ch;
```

`ch` is the width of the `0` glyph in the current font, so `65ch` is about 65 characters — call
it ten to twelve words a line.

This is **the one typographic number with real literature behind it.** The tradition puts
comfortable prose at 45–75 characters, with 66 often quoted as the target. The reason is the
return sweep: at the end of a line your eye jumps back and down, and a very long line makes it
easy to land on the wrong one, while a very short line breaks the rhythm with too many jumps.

<div class="nd-demo">
  <p class="nd-label">no measure — as wide as its container</p>
  <p style="font-size:var(--text-1)">A prover measures separation, not appropriateness. An earlier revision of nilam optimised separation until danger resolved to magenta, with every assertion passing, and "Delete account" looked like a fashion brand rather than a warning. The hue windows in the solver exist because of it, and the class of error is only visible by rendering.</p>
  <p class="nd-label">the same paragraph at var(--measure)</p>
  <p style="font-size:var(--text-1);max-inline-size:var(--measure)">A prover measures separation, not appropriateness. An earlier revision of nilam optimised separation until danger resolved to magenta, with every assertion passing, and "Delete account" looked like a fashion brand rather than a warning. The hue windows in the solver exist because of it, and the class of error is only visible by rendering.</p>
  <p class="nd-note" style="margin-block-start:var(--space-4)">On a wide screen the first one is a genuinely tiring read and it is not obvious why. That is the effect a measure removes.</p>
</div>

## Two rules that are the same rule backwards

**Line height falls as size rises.** 1.6 is right for body text and looks like a gap on a
display heading. 1.2 is right for a heading and is unreadable as body.

**Tracking rises as size falls.** Letter-spacing at 0 looks cramped on 11px uppercase text,
which is why every well-set interface tracks its micro labels wide — and it looks loose on a
48px heading, which is why nilam's headings carry `-0.02em`.

<div class="nd-demo">
  <p class="nd-label">tracking, wrong then right</p>
  <p style="font:var(--weight-medium) var(--text-000)/1.4 var(--font-mono);text-transform:uppercase;color:var(--neutral-11);margin:0">micro label at 0 tracking</p>
  <p style="font:var(--weight-medium) var(--text-000)/1.4 var(--font-mono);letter-spacing:var(--tracking-micro);text-transform:uppercase;color:var(--neutral-11);margin:0.5rem 0 0">micro label at --tracking-micro</p>
  <p class="nd-label">leading, wrong then right</p>
  <p style="font-size:var(--text-5);line-height:var(--leading-loose);margin:0">A heading at 1.75 leading<br>opens a hole in the page</p>
  <p style="font-size:var(--text-5);line-height:var(--leading-tight);margin:var(--space-4) 0 0">A heading at 1.15 leading<br>holds together as one object</p>
</div>

## Space, radius, lines, motion

**Space is a 4px grid in `rem`, doubling from `--space-3` up.** Small increments matter inside a
control — 4px versus 8px of padding is a visible difference on a button. Past 1rem they stop
mattering: nobody can tell 20px from 24px of gap between two cards, so offering both only
invites two developers to choose differently.

<div class="nd-demo">
  <p class="nd-label">--space-0 to --space-7</p>
  <div class="nd-stack" style="gap:var(--space-1)">
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-0 2px</span><span style="block-size:0.75rem;inline-size:var(--space-0);background:var(--brand-9)"></span></div>
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-1 4px</span><span style="block-size:0.75rem;inline-size:var(--space-1);background:var(--brand-9)"></span></div>
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-2 8px</span><span style="block-size:0.75rem;inline-size:var(--space-2);background:var(--brand-9)"></span></div>
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-3 12px</span><span style="block-size:0.75rem;inline-size:var(--space-3);background:var(--brand-9)"></span></div>
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-4 16px</span><span style="block-size:0.75rem;inline-size:var(--space-4);background:var(--brand-9)"></span></div>
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-5 24px</span><span style="block-size:0.75rem;inline-size:var(--space-5);background:var(--brand-9)"></span></div>
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-6 32px</span><span style="block-size:0.75rem;inline-size:var(--space-6);background:var(--brand-9)"></span></div>
    <div style="display:flex;align-items:center;gap:var(--space-3)"><span style="font:var(--text-000)/1 var(--font-mono);color:var(--neutral-11);inline-size:5rem">space-7 48px</span><span style="block-size:0.75rem;inline-size:var(--space-7);background:var(--brand-9)"></span></div>
  </div>
</div>

**Radii have to nest.** An inner radius should be the outer radius minus the padding between
them. Get it wrong and the corners look off in a way people notice and cannot name:

<div class="nd-demo">
  <p class="nd-label">left: inner radius = outer − padding. right: both the same</p>
  <div class="nd-grid">
    <div style="background:var(--neutral-3);border-radius:var(--r-5);padding:var(--space-2)">
      <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-3);padding:var(--space-3);font-size:var(--text-0)">correct</div>
    </div>
    <div style="background:var(--neutral-3);border-radius:var(--r-5);padding:var(--space-2)">
      <div style="background:var(--surface);border:1px solid var(--neutral-6);border-radius:var(--r-5);padding:var(--space-3);font-size:var(--text-0)">wrong</div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The right-hand corners run out of parallel. This is why nilam's radius scale has small gaps at the bottom — that is where nesting actually happens.</p>
</div>

**A hairline is a token.** `--line-1: 1px` exists as a name so that a future decision about
what a hairline should be on a 3× display happens in one place, rather than a 3× screen
rendering three device pixels of border everywhere.

**Motion is short.** `--dur-1` is 150ms, which is roughly where a UI transition stops reading
as "responding" and starts reading as "loading". The longer durations are only for things that
travel a distance — a drawer, a dialog.

**And the focus ring's offset is not cosmetic.** WCAG 1.4.11 wants the ring to have 3:1 against
**adjacent** colours. A ring drawn flush against a filled button of similar lightness has the
button as its adjacent colour and fails; a 2px gap guarantees the adjacent colour is the page.

<div class="nd-demo">
  <p class="nd-label">tab into these — the ring has an offset</p>
  <div class="nd-row">
    <button class="n-btn n-btn-fill" type="button">Save changes</button>
    <button class="n-btn" type="button">Cancel</button>
    <a class="n-link" href="https://github.com/jvoltci/nilam">A link</a>
  </div>
</div>

## How nilam handles it

`nilam/scale.css` is **hand-authored**, and it says so at the top. What it does instead of
solving is record the reasoning beside every number. The full table is on
[Everything that is not a colour](../palette.md#everything-that-is-not-a-colour); these are the
lines worth reading first:

| Token group | The reasoning in one line |
|---|---|
| `--text-*` | a 1.2 minor third, fluid between 360px and 1280px, because a big ratio runs out of room by the third size inside one card |
| `--measure` | 65ch, the one typographic number with real literature behind it |
| `--space-*` | a 4px grid in rem, doubling from `--space-3` up |
| `--r-*` | small gaps at the bottom, because that is where nesting happens |
| `--dur-*` | 150ms is where a transition stops reading as "responding" |
| `--ring-offset` | the gap guarantees the adjacent colour is the page, for 1.4.11 |

### The failure that shows why writing the reasoning down matters

`--text-display`'s own comment says the display size wants **weight 200** — large type gets its
presence from size, and adding weight to both is why "bold and big" reads as shouting rather
than as confidence.

The first version of the file then shipped nothing below **weight 400**.

So the one treatment the scale explicitly recommended was inexpressible using the scale's own
tokens. It was found by an application that had to declare `--weight-thin` locally in order to
follow the advice it had been given. `--weight-thin: 200` exists because of that.

The lesson generalises past type: **a token set has to be checked against its own
documentation**, because a recommendation and the means to follow it are two different
artefacts and nothing automatically keeps them together.

**Next:** [the cascade](9-the-cascade.md) — specificity, `!important`, and what `@layer`
changed.

**Reference:** [Everything that is not a colour](../palette.md#everything-that-is-not-a-colour)
· [What the token export does not carry](../limitations.md#what-the-token-export-does-not-carry),
because `--tracking-*` and `--measure` do not survive the trip to other platforms.
