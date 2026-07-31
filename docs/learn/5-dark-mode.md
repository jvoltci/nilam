# 5 · Dark mode is not inverting the colours

Dark mode is not the light palette upside down. Some values have to flip, some must not move
at all, and one has to flip *the other way* from everything else.

## What inverting actually does

`filter: invert(1)` is the shortcut, and it is instructive to look at:

<div class="nd-demo">
  <p class="nd-label">four status badges</p>
  <div class="nd-row">
    <span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span>
    <span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span>
    <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
    <span class="n-badge n-badge-brand"><i class="n-badge-glyph">◆</i>Pro</span>
  </div>
  <p class="nd-label">the same four, inverted</p>
  <div class="nd-row" style="filter:invert(1)">
    <span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span>
    <span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span>
    <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
    <span class="n-badge n-badge-brand"><i class="n-badge-glyph">◆</i>Pro</span>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Inversion maps every hue to its opposite. <b>Red "failed" becomes cyan and green "active" becomes magenta.</b> The contrast ratios all survive perfectly — and every colour now means the wrong thing.</p>
</div>

Photographs go negative too, which is why every naive dark mode has one page with a
photographic X-ray on it.

But the deeper problem is not the hues. It is that **inverting the ramp maps step 1 onto step
12, step 3 onto step 10, step 7 onto step 6** — and those pairs are not the same job. Step 1 is
a background in both modes. Step 12 is text in both modes. Roles do not invert; they stay
exactly where they are and take new values.

## Polarity

Here is the idea the whole chapter turns on.

**Polarity** is the direction "forward" points. On a light page, a foreground object is
*darker* than the surface behind it. On a dark page, a foreground object is *lighter*.

That means each token has to be asked afresh in each mode:

| Token | Light mode | Dark mode | Which way? |
|---|---|---|---|
| page (step 1) | very light | very dark | flips |
| text (step 12) | very dark | very light | flips |
| control border (step 7) | darker than the card | lighter than the card | flips |
| a raised card | lighter than the page | lighter than the page | **does not flip** |
| a filled button (step 9) | dark object, light text | light object, dark text | **flips its own contents too** |

The last two rows are where systems go wrong.

## The filled button has to invert its page

A filled button is a raised object. To read as raised on a light page it must be darker than
the page and carry light text. To read as raised on a dark page it must be **lighter** than the
page and carry **dark** text.

So step 9 is the one step in the ramp whose lightness is genuinely different in the two modes:

| | step 9 | ink | on its page | ink ratio |
|---|---|---|---|---|
| light | `#755cf5` · L 0.585 | white | 4.31:1 | 4.57:1 |
| dark | `#8a7ef7` · L 0.660 | dark | 5.79:1 | 5.92:1 |

Material 3 has specified this for years — dark-theme `primary` is tone 80 with a tone-20
`onPrimary`. Most systems still solve one value and use it in both modes.

<div class="nd-demo">
  <p class="nd-label">one class, both modes, no dark: variant anywhere</p>
  <div class="nd-grid">
    <div class="nd-moment light" style="color:var(--neutral-12)">
      <p class="nd-label">forced light</p>
      <div class="nd-row">
        <button class="n-btn n-btn-fill" type="button">Save changes</button>
        <button class="n-btn" type="button">Cancel</button>
      </div>
    </div>
    <div class="nd-moment dark" style="color:var(--neutral-12)">
      <p class="nd-label">forced dark</p>
      <div class="nd-row">
        <button class="n-btn n-btn-fill" type="button">Save changes</button>
        <button class="n-btn" type="button">Cancel</button>
      </div>
    </div>
  </div>
  <p class="nd-label">and the same button with color: white hard-coded</p>
  <div class="nd-grid">
    <div class="nd-moment light" style="color:var(--neutral-12)">
      <p class="nd-label">forced light — fine</p>
      <div class="nd-row">
        <button class="n-btn n-btn-fill" type="button" style="color:#ffffff">Save changes</button>
      </div>
    </div>
    <div class="nd-moment dark" style="color:var(--neutral-12)">
      <p class="nd-label">forced dark — white on the glow</p>
      <div class="nd-row">
        <button class="n-btn n-btn-fill" type="button" style="color:#ffffff">Save changes</button>
      </div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The bottom-right label is white on the light violet glow. It measures <b>3.28:1</b> where 4.5:1 is required; the solved <code>--brand-ink</code> gets 5.92:1 on the same button. A hard-coded <code>color: white</code> on a filled button is the most common contrast defect in comparable systems, and it is invisible to whoever wrote it, because they were looking at the mode where it works.</p>
</div>

## `--<family>-ink`

Which ink is legible on step 9 is decided **per hue and per mode**. That is not something a
component author can be expected to know, so it is a token:

```css
/* right */
.primary { background: var(--brand-9); color: var(--brand-ink) }

/* wrong */
.primary { background: var(--brand-9); color: white }
```

White sits on the violet solid. Dark sits on the amber one. Dark sits on the dark-mode glow.
And `--warn-ink` is **dark in both modes**, because no amber exists that carries white text and
is still recognisably amber — a measured fact, not a preference, and chapter 12 has the story
of the dark olive that shipped before it was understood.

<div class="nd-demo">
  <p class="nd-label">step 9 and its own solved ink, five families, both modes</p>
  <div class="nd-grid">
    <div class="nd-moment light" style="color:var(--neutral-12)">
      <p class="nd-label">forced light</p>
      <div class="nd-chips">
        <i style="background:var(--brand-9);color:var(--brand-ink)">Aa</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">Aa</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">Aa</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">Aa</i>
        <i style="background:var(--info-9);color:var(--info-ink)">Aa</i>
      </div>
    </div>
    <div class="nd-moment dark" style="color:var(--neutral-12)">
      <p class="nd-label">forced dark</p>
      <div class="nd-chips">
        <i style="background:var(--brand-9);color:var(--brand-ink)">Aa</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">Aa</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">Aa</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">Aa</i>
        <i style="background:var(--info-9);color:var(--info-ink)">Aa</i>
      </div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Look at the third chip. Amber keeps dark ink in <b>both</b> modes while the other four flip.</p>
</div>

## The glow

The dark-mode solid sits at L 0.66, and the reason is worth a paragraph because it is the
clearest evidence in the project that **lightness is the variable, not hue**.

| | hex | L | C | hue |
|---|---|---|---|---|
| Zima Blue | `#009fe3` | 0.667 | 0.147 | 238 |
| an accent used for years by eye | `#8b7cf6` | 0.657 | 0.176 | 286 |
| what an early solver produced | `#6223f1` | **0.500** | 0.269 | 285 |

The first two are **48 degrees apart in hue** and read as the same *kind* of colour — that
lit, backlit quality. The third is **one degree** from the second and reads as nothing like
it. It reads as pigment, or as highlighter ink.

Hue moved 48 degrees and the character survived. Lightness moved 0.16 and it did not.

The honest part: `GLOW_L = 0.66` is **chosen, not derived**. Four attempts were made to
produce it from a constraint and none did — they give 0.603, 0.595, 0.570 and 0.575. In light
mode the constraints bind and pick the value for you. In dark mode they do not: dark ink still
has 1.3:1 of headroom at 0.66, so something has to fill the gap and it is taste, measured off
two colours that work. That is the one place in nilam's palette where the answer is judgement,
and [Honest limits](../limitations.md#one-value-is-chosen-not-derived) says so on its own page.

## The elevation problem

In light mode, "raised" is easy. The page is L 0.980 and the card is L 1.000 — the card is
lighter, and a shadow underneath it does the rest.

In dark mode both halves of that break.

**There is more room, and it is the wrong kind.** The dark page is L 0.175 and the card is
L 0.246, a bigger lightness step than light mode gets. But you cannot keep going: text lives
from L 0.626 upwards, and a card that bright stops being a surface and starts being a
highlight.

**And the shadow stops working.** A black shadow over a near-black page changes almost
nothing. That is not a subtle effect and it is not a rendering bug — it is chapter 6, and it is
the single most startling piece of arithmetic in this whole subject.

The short version of the fix: dark mode needs a **light rim** along the top edge as well as a
shadow beneath, because the rim is the part that still has somewhere to go.

<div class="nd-demo">
  <div class="nd-grid">
    <div class="nd-moment light" style="color:var(--neutral-12)">
      <p class="nd-label">forced light — shadow does it</p>
      <div class="n-card n-card-pad">A raised card</div>
    </div>
    <div class="nd-moment dark" style="color:var(--neutral-12)">
      <p class="nd-label">forced dark — rim does it</p>
      <div class="n-card n-card-pad">A raised card</div>
    </div>
  </div>
</div>

## `light-dark()`, and the thing it gives away free

The obvious way to ship two modes is three blocks of CSS: a `:root` block, a `.dark` block,
and a `@media (prefers-color-scheme: dark)` copy of the dark block. That third copy exists only
because a media query cannot join a selector list.

`light-dark()` collapses all three into one declaration:

```css
--brand-9: light-dark(oklch(0.5850 0.2186 285), oklch(0.6600 0.1739 285));
/*                    ^ used when the element's color-scheme is light
                                                ^ and when it is dark   */
```

It keys off the inherited `color-scheme` property, and it has been Baseline since 2024.
("Baseline" is the web platform's term for a feature supported in all current major browsers.)

`color-scheme` is itself doing real work beyond your own colours: it tells the browser which
way round to draw scrollbars, form controls, the page canvas and the caret. Setting it is how
you stop a dark page having a white scrollbar.

Now the part that is genuinely free. Put `color-scheme: dark` on **one element** in the middle
of a light page and every token inside it flips:

<div class="nd-demo">
  <p class="nd-label">a dark island on a light page, with no token redeclared</p>
  <div class="nd-moment light" style="color:var(--neutral-12)">
    <p style="font-size:var(--text-0)">This panel is forced light.</p>
    <div class="nd-moment dark" style="color:var(--neutral-12);margin-block-start:var(--space-3)">
      <p style="font-size:var(--text-0)">And this one is forced dark, inside it.</p>
      <div class="nd-row" style="margin-block-start:var(--space-3)">
        <button class="n-btn n-btn-fill" type="button">Save</button>
        <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
      </div>
    </div>
  </div>
</div>

Why that works: **custom-property substitution resolves against the element that *consumes*
the value, not the one that declared it.** The declaration on `:root` is a recipe, and it is
cooked wherever it is used. With `.dark` class blocks you would have to redeclare all eighty
tokens on that card.

The cost is stated plainly: **there is no fallback.** A browser without `light-dark()` gets no
colours at all, rather than degraded colours. That is a deliberate trade and it is the one
limitation in nilam that is a hard cliff rather than a soft edge.

## How nilam handles it

One token block. Not three.

```html
<html>                    <!-- follows the OS -->
<html class="dark">       <!-- forced dark -->
<html class="light">      <!-- forced light -->
<div class="dark">        <!-- just this subtree, tokens and all -->
```

`[data-theme="dark"]` and `[data-theme="light"]` work identically, for frameworks that prefer
attributes. All four of those do exactly one thing: set `color-scheme`. Everything else
follows.

Step 9 differs by mode and `--brand-ink` follows it, so `.n-btn-fill` is one rule with no
`dark:` variant anywhere. The shadow alphas differ by mode, the rim exists only in dark mode,
and the scrim is *heavier* in light mode — all of which chapter 6 explains.

The site you are reading is themed exactly this way. mkdocs-material's toggle writes a
`data-md-color-scheme` attribute, and one rule in `docs/stylesheets/extra.css` maps it to
`color-scheme`. After that every nilam token on every page follows, with no second block
anywhere. Press the toggle in the header and watch the demos above re-resolve.

**Next:** [shadows, and why every dark theme looks flat](6-shadows.md).

**Reference:** [The two brand moments](../palette.md#the-two-brand-moments) ·
[One token block, not three](../palette.md#one-token-block-not-three) ·
[Nested themes are free](../palette.md#nested-themes-are-free)
