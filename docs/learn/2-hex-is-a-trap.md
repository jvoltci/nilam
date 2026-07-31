# 2 · Why a hex code is a trap

`#808080` is not half as bright as white.

It emits about **21.6%** of white's light. It looks about **60%** of the way from black to
white. Neither of those is 50%, and the hex code tells you neither number. That single gap is
behind most colour bugs in most interfaces, so it is worth an entire chapter.

## What a hex code actually is

Six hexadecimal digits, in three pairs. Each pair is one **channel** — red, green, blue — as
a number from 0 to 255. `#808080` is 128, 128, 128.

That is all it is: three storage slots. The question that matters is what the number 128
*means*, and the answer is not "half".

## sRGB is gamma encoded

**sRGB** is the standard colour space the web assumes. A "colour space" is just a rulebook
that says which physical colour a triple of numbers refers to. sRGB's rulebook has a curve in
it.

The channel value is not proportional to light. It is roughly the light raised to the power
1/2.2. Going the other way — from the stored byte back to actual light — the exact formula in
the standard is:

```js
// src/colour.mjs
export const gammaDecode = (v) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
```

Feed it 128/255 and you get **0.2159**. The byte says "half". The light is a fifth.

This is not a mistake anyone made. It is a compression scheme, and a good one. Human vision
is far more sensitive to a small change at the dark end than at the light end, so storing
light *evenly* across 256 codes would waste most of them on bright values nobody can tell
apart while leaving visible steps in the shadows. The curve puts the codes where the eye can
use them. It also happened to match what the electron guns in a cathode-ray tube did
naturally, which is why the convention is decades old and universal.

The problem is not the curve. The problem is that everybody forgets it is there.

## The three numbers for one grey

Three different questions, three different answers, for the same pixel:

| Question | Answer for `#808080` |
|---|---|
| What is stored? | 128 of 255 — **50%** |
| How much light leaves the screen? | Y = 0.216 — **21.6%** |
| How light does it look? | OKLCH L = 0.600 — **60%** |

`Y` is **relative luminance**: the amount of light, on a scale where black is 0 and white is
1. It is the number every contrast rule in the world is built from, and chapter 3 is about
it.

`L` is **perceptual lightness**: where the colour sits on the scale your eye uses. More on it
below.

So which grey does emit half of white's light? `#bcbcbc` — byte 188.

<div class="nd-demo">
  <p class="nd-label">byte value · light emitted · how light it looks</p>
  <div class="nd-chips">
    <i style="background:#000000;color:#ffffff">0<br>0%</i>
    <i style="background:#404040;color:#ffffff">64<br>5%</i>
    <i style="background:#808080;color:#ffffff">128<br>22%</i>
    <i style="background:#bcbcbc;color:#111111">188<br>50%</i>
    <i style="background:#e0e0e0;color:#111111">224<br>75%</i>
    <i style="background:#ffffff;color:#111111;border:1px solid #d4d4d8">255<br>100%</i>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Bottom row is the light emitted, not the byte. <b>The halfway point in light is 188, not 128</b> — three quarters of the way up the byte range.</p>
</div>

## Consequence 1: averaging two hex codes gives mud

Take blue `#0000ff` and yellow `#ffff00`. Average each channel:

```
(0   + 255) / 2 = 128
(0   + 255) / 2 = 128
(255 + 0)   / 2 = 128        ->  #808080
```

Grey. Two of the most saturated colours in sRGB, and the arithmetic midpoint between them has
**no colour at all**. Nothing went wrong; the channels simply cancelled, because averaging
stored codes is not averaging anything a person perceives.

Browsers now let you name the space an interpolation happens in, so you can see both:

<div class="nd-demo">
  <p class="nd-label">blue to yellow, interpolated in sRGB</p>
  <div style="block-size:3rem;border-radius:var(--r-3);background:linear-gradient(to right in srgb, #0000ff, #ffff00)"></div>
  <p class="nd-label">the same two ends, interpolated in OKLab</p>
  <div style="block-size:3rem;border-radius:var(--r-3);background:linear-gradient(to right in oklab, #0000ff, #ffff00)"></div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The top one goes through grey and gets dark in the middle. The bottom one stays a colour the whole way. Same endpoints, different rulebook.</p>
</div>

This is why "mix the brand colour with white to get a lighter version" produces a chalky,
slightly wrong hue, and why gradients drawn in the default space have a dead grey band in the
middle.

## Consequence 2: an even ramp in hex is not even

Space eight greys evenly across the byte range and measure how light each one *looks*:

<div class="nd-demo">
  <p class="nd-label">eight even steps in hex — 255, 219, 182 …</p>
  <div class="nd-chips">
    <i style="background:#ffffff;color:#111;border:1px solid #d4d4d8">1.00</i>
    <i style="background:#dbdbdb;color:#111">0.89</i>
    <i style="background:#b6b6b6;color:#111">0.78</i>
    <i style="background:#929292;color:#fff">0.66</i>
    <i style="background:#6d6d6d;color:#fff">0.53</i>
    <i style="background:#494949;color:#fff">0.41</i>
    <i style="background:#242424;color:#fff">0.26</i>
    <i style="background:#000000;color:#fff">0.00</i>
  </div>
  <p class="nd-label">eight even steps in OKLCH lightness</p>
  <div class="nd-chips">
    <i style="background:#ffffff;color:#111;border:1px solid #d4d4d8">1.00</i>
    <i style="background:#d0d0d0;color:#111">0.86</i>
    <i style="background:#a3a3a3;color:#111">0.71</i>
    <i style="background:#787878;color:#fff">0.57</i>
    <i style="background:#4f4f4f;color:#fff">0.43</i>
    <i style="background:#2a2a2a;color:#fff">0.29</i>
    <i style="background:#0a0a0a;color:#fff">0.14</i>
    <i style="background:#000000;color:#fff">0.00</i>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Numbers are perceptual lightness. In the top row the first step is 0.11 and the last is <b>0.26</b> — the bottom of a hex-even ramp jumps more than twice as far as the top. That is why hand-tuned scales need extra fiddling at the dark end.</p>
</div>

## Consequence 3: "10% darker" means nothing

Multiply every channel of the nilam brand solid by 0.9:

```
#755cf5  ->  #6953dd
```

The bytes went down by 10%. The light went down by **20%** — 0.9<sup>2.4</sup> = 0.78, and
you can read that exponent straight off the transfer function. A "10% darker" hover state is
whatever the curve decides it is, and the amount changes depending on where on the ramp you
started.

## Why HSL does not fix it

`hsl()` looks like the answer, because it has a lightness channel. It is not, because HSL's
lightness is a cylinder coordinate, not a measurement.

| | claims | actually emits |
|---|---|---|
| `hsl(60 100% 50%)` — yellow | L 50% | Y 0.928 |
| `hsl(240 100% 50%)` — blue | L 50% | Y 0.072 |

Two colours, both declaring themselves half-light, differing by a factor of **12.9** in
actual light. Yellow at "50%" is nearly as bright as white. Blue at "50%" is nearly black.
This is exactly why a palette built by walking HSL lightness produces a yellow that glares
and a blue that disappears.

## The fix: a perceptual colour space

A **perceptual** colour space is one where equal numeric steps look like equal steps to a
person, and where the axes correspond to things people actually notice.

**OKLab** is the current best one for interface work. Björn Ottosson published it in 2020; it
was designed by fitting to how people report colour differences, and it fixed the visible
faults of the older CIELAB — notably that CIELAB's blues shift hue when you change lightness.

**OKLCH** is the same space in polar coordinates, which is the form you want to type:

| Channel | Means | Range |
|---|---|---|
| `L` | lightness | 0 = black, 1 = white |
| `C` | chroma — how much colour | 0 = grey, up to ~0.4 |
| `h` | hue — which colour | 0–360 degrees |

```css
--brand-9: oklch(0.5850 0.2186 285);
/*              L      C      h    */
```

The three are **independent**, which is the whole point. Change `L` and the hue does not
drift. Change `h` and the lightness holds. That is what makes a twelve-step ramp possible at
all: you can walk lightness and know nothing else moved.

Note "chroma", not "saturation". Saturation is relative to how light a colour is; chroma is
absolute. Two colours can have the same chroma and very different saturation, and for
building a scale you want the absolute one.

## The one that is worth stopping on

For a colour with **no chroma** — a true grey — the relationship between OKLCH lightness and
emitted light is exactly:

```
Y = L³
```

Not approximately. Exactly. It falls out of the OKLab transform: the space takes a cube root
of the cone responses, and for a grey all three are equal, so cubing undoes it and every
matrix in the chain sums to 1.

You can check it in one line:

| L | L³ | measured Y | hex |
|---|---|---|---|
| 0.25 | 0.015625 | 0.015625 | `#222222` |
| 0.50 | 0.125000 | 0.125000 | `#636363` |
| 0.66 | 0.287496 | 0.287496 | `#929292` |
| 0.98 | 0.941192 | 0.941192 | `#f8f8f8` |

So the perceptual midpoint of black and white emits **one eighth** of white's light. Your eye
reports "halfway" at an eighth of the photons. That cube is not a design convention or a
tuning parameter — it is the shape of your own visual response, written down.

It also means you can move between "how light does it look" and "how much contrast does it
have" with a cube, in your head, which is the single most useful piece of arithmetic in this
whole subject.

### And the cube has a consequence at the dark end

Because `Y = L³`, the light emitted collapses fast as `L` falls. At L 0.09 the luminance is
**0.00073** — and the whole neighbourhood of that value is served by two or three integers out
of 255.

Which means a lightness you pick down there may not survive being written as a hex code.
nilam ran into this choosing `--void`, a surface that has to read as *below* the page:

| chosen L | quantises to | error on the way back, in OKLab |
|---|---|---|
| 0.07 | `#010102` | 0.0013 — fine |
| 0.08 | `#020203` | 0.0062 — **fails** |
| 0.09 | `#020204` | 0.0041 — **fails** |
| 0.10 | `#030305` | 0.0016 — fine |
| 0.11 | `#040406` | 0.0017 — fine |
| 0.12 | `#050508` | 0.0035 — **fails** |
| 0.13 | `#07070a` | 0.0004 — fine |

**The error is not monotonic in lightness.** 0.07 works, 0.08 and 0.09 do not, 0.10 and 0.11
do, 0.12 does not, 0.13 does. That is the 8-bit lattice showing through the cube: whether a
given lightness happens to land near one of the two or three integers available is an accident.

The value shipped is 0.10 rather than the 0.09 first chosen, and it was caught by an assertion
on the exported hex fallback rather than by anyone looking. Below about L 0.15, a lightness has
to be **checked** rather than chosen.

## One more term: gamut

A **gamut** is the set of colours a screen can actually produce. OKLCH can name colours no
screen can show — `oklch(0.6 0.4 285)` is a perfectly valid triple and there is no such
violet in sRGB.

That matters because a colour outside the gamut gets clipped when it paints, and **a clipped
colour reports a better contrast ratio than it displays**. Measure the number you asked for,
show the number the hardware could manage, and every guarantee downstream is quietly false.

Most screens sold since about 2016 can do better than sRGB. **Display-P3** is the common
wider gamut — roughly 25% more area, mostly in the greens and reds.

## How nilam handles it

Everything is solved in OKLCH and emitted as `oklch()`. `src/colour.mjs` names the three
coordinate systems it moves between and why each one exists:

```
sRGB gamma     what a hex code is, what a browser composites in
linear sRGB    what WCAG luminance is computed from
OKLab / OKLCH  where lightness is perceptually even, so a ramp
               can be reasoned about
```

Every transform is written by hand, with no dependencies, and pinned by tests — because the
solver does not pick a colour and then check it, it **inverts** a requirement to find the
colour, and that only works if the forward and backward transforms agree.

Two consequences you can see in the shipped file:

**Gamut is asserted, not hoped for.** Every value in the palette is checked to be inside its
own gamut, with the failure message spelling out why: *"its measured ratio is not what a
browser will paint."*

**Display-P3 is a second solved palette, not a filter.** nilam could have emitted an
out-of-range `oklch()` and let the browser gamut-map it — one line, richer colour for free.
It does not, because gamut mapping is the *browser's* algorithm, it is allowed to move
lightness to preserve hue, and it therefore changes the contrast ratio by an amount nothing
measured. So the P3 palette is solved against the P3 boundary, proved against P3 luminance,
and emitted as explicit `color(display-p3 …)` values behind `@media (color-gamut: p3)`. What
it buys, measured: +7% chroma on the brand solid, up to +17% on `ok`, and only about +2%
below L 0.5.

The honest note: the gain is modest, and the media query is taken at its word. A browser that
reports `color-gamut: p3` is telling you about its own capability, and nilam believes it.

**Next:** [what 4.5:1 actually means](3-contrast.md) — the number the whole palette is solved
from.

**Reference:** [Two gamuts, both proven](../palette.md#two-gamuts-both-proven).
