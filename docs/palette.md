# Tokens

Six families, twelve steps each, plus an ink token per family and one card surface. 79
colour tokens in total, and every one of them was solved rather than picked.

```css
@import 'nilam/tokens.css';
```

## The 12-step role model

```
1  page                7  border, normal        (WCAG 1.4.11: 3:1)
2  subtle page         8  border, hover
3  component, rest     9  solid                 (the brand moment)
4  component, hover   10  solid, hover
5  component, active  11  text, low contrast     (WCAG 1.4.3: 4.5:1)
6  border, subtle     12  text, high contrast    (7:1)
```

Every step is a **role**, not a shade. `--brand-7` is "the border of a control in the brand
family", and the reason it is that lightness is that 3:1 against step 3 is where it landed.
Use it for a border; do not use it for text. [Why solved colour](solved.md#the-role-model)
has the full contract table.

## Every family, live

The swatches below are painted with `var(--<family>-<step>)` and nothing else. If one
renders empty, that token does not exist in the stylesheet — this page cannot advertise a
token the package does not ship.

<div class="nd-demo">
  <div class="nd-scale-nums">
    <b></b><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b><b>10</b><b>11</b><b>12</b>
  </div>
  <div class="nd-scale"><span>neutral</span><i style="background:var(--neutral-1)"></i><i style="background:var(--neutral-2)"></i><i style="background:var(--neutral-3)"></i><i style="background:var(--neutral-4)"></i><i style="background:var(--neutral-5)"></i><i style="background:var(--neutral-6)"></i><i style="background:var(--neutral-7)"></i><i style="background:var(--neutral-8)"></i><i style="background:var(--neutral-9)"></i><i style="background:var(--neutral-10)"></i><i style="background:var(--neutral-11)"></i><i style="background:var(--neutral-12)"></i></div>
  <div class="nd-scale"><span>brand</span><i style="background:var(--brand-1)"></i><i style="background:var(--brand-2)"></i><i style="background:var(--brand-3)"></i><i style="background:var(--brand-4)"></i><i style="background:var(--brand-5)"></i><i style="background:var(--brand-6)"></i><i style="background:var(--brand-7)"></i><i style="background:var(--brand-8)"></i><i style="background:var(--brand-9)"></i><i style="background:var(--brand-10)"></i><i style="background:var(--brand-11)"></i><i style="background:var(--brand-12)"></i></div>
  <div class="nd-scale"><span>danger</span><i style="background:var(--danger-1)"></i><i style="background:var(--danger-2)"></i><i style="background:var(--danger-3)"></i><i style="background:var(--danger-4)"></i><i style="background:var(--danger-5)"></i><i style="background:var(--danger-6)"></i><i style="background:var(--danger-7)"></i><i style="background:var(--danger-8)"></i><i style="background:var(--danger-9)"></i><i style="background:var(--danger-10)"></i><i style="background:var(--danger-11)"></i><i style="background:var(--danger-12)"></i></div>
  <div class="nd-scale"><span>warn</span><i style="background:var(--warn-1)"></i><i style="background:var(--warn-2)"></i><i style="background:var(--warn-3)"></i><i style="background:var(--warn-4)"></i><i style="background:var(--warn-5)"></i><i style="background:var(--warn-6)"></i><i style="background:var(--warn-7)"></i><i style="background:var(--warn-8)"></i><i style="background:var(--warn-9)"></i><i style="background:var(--warn-10)"></i><i style="background:var(--warn-11)"></i><i style="background:var(--warn-12)"></i></div>
  <div class="nd-scale"><span>ok</span><i style="background:var(--ok-1)"></i><i style="background:var(--ok-2)"></i><i style="background:var(--ok-3)"></i><i style="background:var(--ok-4)"></i><i style="background:var(--ok-5)"></i><i style="background:var(--ok-6)"></i><i style="background:var(--ok-7)"></i><i style="background:var(--ok-8)"></i><i style="background:var(--ok-9)"></i><i style="background:var(--ok-10)"></i><i style="background:var(--ok-11)"></i><i style="background:var(--ok-12)"></i></div>
  <div class="nd-scale"><span>info</span><i style="background:var(--info-1)"></i><i style="background:var(--info-2)"></i><i style="background:var(--info-3)"></i><i style="background:var(--info-4)"></i><i style="background:var(--info-5)"></i><i style="background:var(--info-6)"></i><i style="background:var(--info-7)"></i><i style="background:var(--info-8)"></i><i style="background:var(--info-9)"></i><i style="background:var(--info-10)"></i><i style="background:var(--info-11)"></i><i style="background:var(--info-12)"></i></div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Press the light/dark toggle in the header. Every strip above re-resolves; nothing on this page redeclares a token.</p>
</div>

Two things to notice.

**`info` is the neutral scale.** Byte for byte. It is the state that means nothing is wrong,
and spending a hue on it collided with the brand under deuteranopia —
[the full reason](colour-blindness.md#why-info-is-achromatic).

**The greys are not grey.** They carry a constant chroma of 0.007 around the brand hue. Not
a cap, a constant: an earlier version capped chroma at 0.022 and the cap only bound from
step 6 up, so neutral steps 1–5 came out byte-identical to the brand's and a brand-tinted
callout background was inexpressible. In a system whose premise is that colour does work,
that is the defect that matters most.

??? example "The shipped hex values, hue 285"

    Light mode:

    | | 1 | 3 | 6 | 7 | 9 | 11 | 12 |
    |---|---|---|---|---|---|---|---|
    | neutral | `#f8f8fd` | `#eaeaef` | `#c9c9ce` | `#85858a` | `#75757a` | `#69696e` | `#4c4c51` |
    | brand | `#f8f8f9` | `#eaeaf0` | `#c7c8e3` | `#817dcb` | `#755cf5` | `#6759c9` | `#4a4583` |
    | danger | `#f9f8f8` | `#f0e9e8` | `#e4c2c0` | `#d16564` | `#e3263d` | `#af484a` | `#703f3e` |
    | warn | `#f9f8f7` | `#f0eae3` | `#e4c5a4` | `#a57f54` | `#c68022` | `#86633b` | `#5b4a37` |
    | ok | `#f7f9f7` | `#def0dc` | `#95db8d` | `#599453` | `#2ba421` | `#40763a` | `#3a5337` |

    Dark mode:

    | | 1 | 3 | 6 | 7 | 9 | 11 | 12 |
    |---|---|---|---|---|---|---|---|
    | neutral | `#101014` | `#202024` | `#353539` | `#6b6b6f` | `#919296` | `#87878c` | `#ababb0` |
    | brand | `#101015` | `#1f1e32` | `#332e63` | `#685ebf` | `#8a7ef7` | `#837ed4` | `#a8a8ce` |
    | danger | `#140f0f` | `#2d1c1b` | `#532928` | `#aa4f4f` | `#f84b55` | `#d96262` | `#d29f9d` |
    | warn | `#12100f` | `#251f19` | `#413323` | `#856543` | `#c78022` | `#ac7f4e` | `#c9a580` |
    | ok | `#0f110f` | `#1a2319` | `#253b22` | `#477642` | `#2faf24` | `#53974c` | `#85b97f` |

    `--surface` is `#ffffff` in light and `#202020` in dark. The stylesheet itself carries
    OKLCH, not hex — these are for reading, and the hex is what a browser paints.

## The two brand moments

A filled button **inverts the polarity of the page it sits on.** On a light page it is a
dark object with light text; on a dark page it is a light object with dark text. Material 3
has specified this for years and most systems still solve one value and use it in both
modes.

So step 9 differs by mode:

| | step 9 | ink | on its page | ink ratio |
|---|---|---|---|---|
| light | `#755cf5` L 0.585 | white | 4.31:1 | 4.57:1 |
| dark | `#8a7ef7` L 0.660 | dark | 5.79:1 | 5.92:1 |

<div class="nd-demo">
  <div class="nd-grid">
    <div class="nd-stack">
      <div class="nd-swatch-big">--brand-9</div>
      <div class="nd-facts">
        <div><b>glow</b> · dark · <code>#8a7ef7</code> · L 0.660 · dark ink</div>
        <div><b>solid</b> · light · <code>#755cf5</code> · L 0.585 · white ink</div>
        <div>Zima Blue is L 0.667 · the reference accent L 0.657</div>
      </div>
    </div>
    <div class="nd-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3)">
      <div class="nd-moment light">
        <p class="nd-label">forced light</p>
        <div class="nd-stack">
          <button class="n-btn n-btn-fill" type="button">Save</button>
          <button class="n-btn" type="button">Cancel</button>
          <span class="n-badge n-badge-brand"><i class="n-badge-glyph">◆</i>Pro</span>
        </div>
      </div>
      <div class="nd-moment dark">
        <p class="nd-label">forced dark</p>
        <div class="nd-stack">
          <button class="n-btn n-btn-fill" type="button">Save</button>
          <button class="n-btn" type="button">Cancel</button>
          <span class="n-badge n-badge-brand"><i class="n-badge-glyph">◆</i>Pro</span>
        </div>
      </div>
    </div>
  </div>
</div>

The dark value is *the glow* — L 0.66, which is where both
[Zima Blue](https://en.wikipedia.org/wiki/Zima_Blue) (`#009fe3`, L 0.667) and the accent I
had used for years (`#8b7cf6`, L 0.657) already sat. Those two are 48° apart in hue and
read as the same *kind* of colour.

!!! danger "Always pair step 9 with `--<family>-ink`"

    ```css
    /* right */
    .primary { background: var(--brand-9); color: var(--brand-ink) }

    /* wrong — and this is the most common contrast defect in comparable systems */
    .primary { background: var(--brand-9); color: white }
    ```

    Which ink is legible is decided per hue **and** per mode. White sits on the violet
    solid, dark on the amber one, dark on the dark-mode glow. `--warn-ink` is dark in
    *both* modes, because no amber exists that carries white text and is still amber.

## The untinted card surface

`--neutral-1` is the page and it carries the 0.007 tint. `--surface` is the card and it
carries **no chroma at all**: pure white in light mode, and a flat `#202020` in dark.

That inversion is the point. The page's tint reads as *light* precisely because the card
beside it has none — the eye is comparing, not measuring. It is copied from an observation
rather than invented, and it fixes a measured defect: achroma's raised surface managed
1.044:1 against its page, which was proved invisible. This pairing gets a chroma step as
well as a lightness step, so it separates on two channels instead of one.

<div class="nd-demo" style="background:var(--neutral-1)">
  <p class="nd-label">the page is --neutral-1 · the card is --surface</p>
  <div class="n-card n-card-pad">
    <p style="font-weight:var(--weight-semibold)">A card on the page</p>
    <p style="color:var(--neutral-11);font-size:var(--text-0);margin-block-start:var(--space-2)">1.060:1 in light mode, 1.171:1 in dark — plus a chroma step, plus a hairline, plus a shadow.</p>
  </div>
</div>

Use `--surface` for cards, dialogs, popovers, menus and the combobox listbox. Anything that
sits *on* the page rather than being the page.

## One token block, not three

The obvious emit is a `:root` block, a `.dark` block, and a `prefers-color-scheme` copy of
the dark block. Three copies of eighty tokens, and the third exists only because a media
query cannot join a selector list.

`light-dark()` collapses it to one:

```css
--brand-9: light-dark(oklch(0.5850 0.2186 285), oklch(0.6600 0.1739 285));
```

It has been Baseline since 2024, it keys off the inherited `color-scheme`, and it buys
something the class approach cannot do at all.

### Nested themes are free

Put `color-scheme: dark` on a single card inside a light page and every token inside that
card flips — because custom-property substitution resolves against the element that
*consumes* the value, not the one that declared it. With `.dark` blocks you would have to
redeclare all eighty tokens on the card.

```html
<div class="dark">…this subtree, tokens and all…</div>
```

<div class="nd-demo">
  <p class="nd-label">a dark island on a light page, with no token redeclared</p>
  <div class="nd-moment light">
    <p style="font-size:var(--text-0)">This panel is forced light.</p>
    <div class="nd-moment dark" style="margin-block-start:var(--space-3)">
      <p style="font-size:var(--text-0)">And this one is forced dark, inside it.</p>
      <div class="nd-row" style="margin-block-start:var(--space-3)">
        <button class="n-btn n-btn-fill" type="button">Save</button>
        <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
      </div>
    </div>
  </div>
</div>

**The cost is honest: there is no fallback.** A browser without `light-dark()` gets no
colours at all rather than degraded colours. In 2026 that is the right trade, and the test
suite asserts the function is actually used, so the decision cannot rot quietly.

## Theming

`color-scheme` drives everything, so forcing a mode is one declaration rather than a second
palette:

```html
<html>                    <!-- follows the OS -->
<html class="dark">       <!-- forced dark -->
<html class="light">      <!-- forced light -->
<div class="dark">        <!-- just this subtree, tokens and all -->
```

`[data-theme="dark"]` and `[data-theme="light"]` work identically, for frameworks that
prefer attributes.

This site is themed exactly that way. mkdocs-material's toggle writes
`data-md-color-scheme`, and one rule in `docs/stylesheets/extra.css` maps it to
`color-scheme` — after which every nilam token on every page follows, with no second block
anywhere.

### Your own hue

```bash
npx nilam 262 --css=tokens.css
```

Everything re-derives: the twelve steps of six families, both modes, the semantic hues, and
the inks. Then it is proved, and a hue whose palette cannot satisfy the contracts fails the
command rather than emitting a file.

## Cascade layers

```css
@layer nilam.tokens, nilam.base, nilam.components, nilam.utilities;
```

That statement is the first line of `nilam.tokens.css`, and it is what fixes the order for
every file loaded after it. **Anything you write unlayered beats all of it.** No
`!important` needed — a design system that needs `!important` to override is a design
system people fork.

There is exactly one `!important` in the package: `[hidden] { display: none !important }`.
Without it, a `.flex { display: flex }` in your own CSS silently un-hides a hidden element.
That was measured in a real app.

It also has a real cost, and this site pays it: mkdocs-material ships its own theme toggle
as a `hidden` element that it un-hides with CSS, and an important declaration in a layer
beats unlayered author CSS. So these docs load tokens, scale, components and widgets but
**not** `nilam.base.css`. The reasoning is written out at the top of
`docs/stylesheets/extra.css`.

## Everything that is not a colour

`nilam/scale.css` — hand-authored, because none of it is solvable the way colour is. There
is no contrast requirement to invert for "how big is a heading". What the source does
instead is state where each number came from.

| Group | Tokens | The reasoning in one line |
|---|---|---|
| type | `--text-000` … `--text-7`, `--text-display` | a 1.2 minor third, fluid between 360px and 1280px. 1.2 rather than 1.25 or 1.333 because a big ratio runs out of room by the third size inside one card. |
| weight | `--weight-thin` … `--weight-bold` | 200 exists because `--text-display` recommends weight 200 and the first version shipped nothing below 400 |
| leading | `--leading-tight` … `--leading-loose` | line height falls as size rises; 1.6 on a display heading looks like a gap |
| tracking | `--tracking-tight` … `--tracking-micro` | tracking rises as size falls, which is the same rule backwards |
| measure | `--measure` | 65ch, the one typographic number with real literature behind it |
| space | `--space-0` … `--space-9` | a 4px grid in rem, doubling from `--space-3` up |
| radius | `--r-1` … `--r-full` | small gaps at the bottom, because that is where nesting happens: an inner radius should be the outer minus the padding between them |
| lines | `--line-1`, `--line-2` | a hairline as a token, so a 3× display does not get 3 device pixels |
| motion | `--dur-0` … `--dur-3`, three easings | 150ms is where a transition stops reading as "responding" and starts reading as "loading" |
| focus | `--ring-width`, `--ring-offset` | the offset is not cosmetic: 1.4.11 wants 3:1 against *adjacent* colours, and the gap guarantees the adjacent colour is the page |
| elevation | `--shadow-1/2/3`, `--rim`, `--scrim` | see below |
| stacking | `--z-base`, `--z-sticky`, `--z-overlay`, `--z-max` | only four, and three are legacy — dialogs and popovers live in the browser's top layer, which no z-index reaches |

### Elevation, and the 23× rule

The alphas inside `--shadow-*` differ by an order of magnitude between modes, and it is the
least obvious thing in the file.

Browsers composite alpha in **gamma-encoded sRGB**, not linear. Black at 8% over a
near-white page darkens it a lot; the same black at 8% over a near-black page changes almost
nothing, because the encoding has already spent most of its precision at the dark end.
Measured, the gap needed to *look* equal is about **23×**.

Which is why "our dark mode shadows look flat" is a universal complaint, and why dark themes
that work switch to a light rim instead. Both are here:

- `--shadow-1/2/3` — mode-aware alphas, from 0.05 in light to 0.55 in dark at the first
  level.
- `--rim` — `inset 0 1px 0` in white at 6%, and **transparent in light mode**, where it
  would read as a scratch. In dark mode it is what makes a raised surface look raised.

<div class="nd-demo">
  <p class="nd-label">shadow-1, shadow-2, shadow-3 — each with --rim</p>
  <div class="nd-grid">
    <div class="n-card n-card-pad">shadow-1, the default card</div>
    <div class="n-card n-card-pad n-card-float">shadow-2, floating</div>
    <div class="n-card n-card-pad" style="box-shadow:var(--shadow-3),var(--rim)">shadow-3, the dialog</div>
  </div>
</div>

`--scrim` is heavier in light mode for the same reason in reverse: dimming a bright page
takes more than dimming a dark one for the same perceived separation.

## Getting the tokens out of CSS

Figma variables, Swift, Kotlin, Style Dictionary and DTCG 2025.10 — all from one function,
nothing hand-maintained. See [Platform export](tokens.md).
