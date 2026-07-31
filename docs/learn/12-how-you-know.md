# 12 · How you know you are right

An **assertion** is a sentence about the system that a machine can check, and which fails the
build when it stops being true.

The values in a design system are not what makes it a system. The assertions over them are. And
the most useful thing this chapter can teach you is what an assertion **cannot** see.

## Five kinds of thing you can assert

| Kind | Example | Catches |
|---|---|---|
| **A contract** | step 11 is at least 4.5:1 against step 3 | a value that drifted |
| **A separation** | `danger` and `ok` are more than 0.09 apart under normal vision | two states that became one colour |
| **A structural invariant** | every token in the stylesheet is in the export, and vice versa | something going missing on one side |
| **A packaging fact** | every file `exports` points at exists in the published tarball | a broken install |
| **A pixel** | the rendered page matches the blessed image | anything at all, without knowing what to look for |

Each kind catches a class the others cannot. A palette with perfect contract assertions and no
packaging assertion ships a broken package with everything green — which is not a hypothetical,
and there are two of them below.

## The rule

> An assertion that shares its premise with the thing it audits is not an audit.

That is the single most useful sentence in this project. Four real failures, all of them the
same shape.

### 1. The border that was compliant on the page and invisible on a card

Steps 6, 7 and 8 are borders. All three were **solved against step 1**, the page, and
**asserted against step 1**. So step 7 measured exactly 3.05:1 and was declared compliant.

On a **card** — step 3, where controls actually live — it was **2.70:1** in light and 2.61:1 in
dark. Every family, both modes.

The code that chose the value and the code that checked it made the same wrong assumption, so
nothing disagreed. It reached a product, and the damage was a dashed **1.37:1** border on a file
drop zone that was the entire product, plus a 3px warning stripe that was meant to be the
redundant channel a colourblind reader depends on.

### 2. The package that shipped with its components missing

achroma, nilam's predecessor, was published with its **entire component layer absent from
`package.json`'s `files` array**. Every colour assertion was green. The package was broken on
install.

Nothing in the colour suite was wrong. It simply had nothing to say about whether the file was
in the box.

### 3. And then it happened again, differently

nilam **0.1.0** was published. *Then* `nilam.tailwind.css` was added to `files` and `exports`.

So the published tarball had no bridge file while `exports["./tailwind.css"]` pointed at it — and
every on-disk assertion stayed green, because the file *was* there, on disk, and it *was*
listed. A consumer got a resolve error.

The fix is job 4 of the test suite: ask the **packer** what it would publish, rather than asking
the filesystem what exists. Same lesson, one level further out.

### 4. The formatter that could have inverted every mode

nilam's tokens are emitted as `light-dark(lightValue, darkValue)`. A formatting bug that swapped
those two arguments would leave **every colour object correct** and every shipped mode inverted.

So the emitted CSS is parsed back out of the file and re-measured. Not belt-and-braces: it is
the only check that can see a defect introduced *after* the objects were correct.

## Three ways an assertion can be wrong on its own terms

### The objective that averaged the fixable with the unfixable

nilam's semantic-hue search maximises the smallest separation across normal vision and all three
dichromacies. The first version took the minimum over **every** pair under **every** vision,
which sounds strictly better and is worse.

`danger` and `ok` are red and green. They collapse under deuteranopia no matter what — the first
run searched 15,360 combinations and the best it managed was 0.065 against a 0.09 floor. The
prover already accepts that and demands a redundant channel instead. But the **optimiser** was
still being scored on it, so:

- the global minimum was pinned at **0.0333** by a pair nothing could move;
- moving `ok` around changed the score not at all;
- so it shipped an `ok` hue that left brand against ok at **0.0882** under tritanopia — a
  failure that *was* fixable, because fixing it did not move the number being maximised.

> An objective that averages over the fixable and the unfixable optimises neither.

The score is now exactly the hard set: brand against each status under every vision, and status
against status under normal vision.

### The assertion that was itself wrong

The prover checks that the primary action is the most prominent thing on the page. The first
version asserted that the **brand solid must out-contrast the neutral solid**, and it failed at
6.53 versus 12.92.

The assertion was wrong, not the palette. The neutral solid is near-black, so an all-ink button
legitimately has more contrast than any hue can — which is exactly why an ink button works.
**Contrast is the wrong instrument for prominence.**

What makes the primary action pop is that it is the only *chromatic* solid on the page: it wins
on a channel nothing else is using.

| light mode | on the page | chroma |
|---|---|---|
| brand solid | 4.31:1 | **0.219** |
| neutral solid | 4.30:1 | 0.007 |

Nearly identical contrast, **thirty times the chroma**. So the assertion is about chroma now.

<div class="nd-demo">
  <p class="nd-label">the two buttons the failed assertion was comparing</p>
  <div class="nd-row">
    <button class="n-btn n-btn-fill" type="button">Primary</button>
    <button class="n-btn n-btn-ink" type="button">Ink</button>
    <button class="n-btn" type="button">Secondary</button>
  </div>
</div>

### The decision scored on one mode and used in both

The same hue search originally scored **light mode only** and used the result in both. Once step
9 became mode-dependent, dark mode never got a vote — and it shipped a dark-mode tritanopia
failure at 0.0896.

What makes this one instructive is where it surfaced: **the assertion that caught it fired
nowhere near the code that caused it.** A hue chosen in the optimiser produced a failure reported
by the prover, two files away.

## The limit: an assertion cannot see meaning

Here is the one that no amount of arithmetic fixes.

nilam's semantic hues are searched inside **windows** — the range where each word still means
itself. The windows were originally wider: 8–44 for `danger`, 52–104 for `warn`, 132–176 for
`ok`.

The optimiser did exactly what it was told. It pushed every hue to the window **edge** to buy
separation. `danger` landed on **10**. `warn` landed on **52**.

<div class="nd-demo">
  <p class="nd-label">danger at hue 10 and at hue 22 — both pass every assertion</p>
  <div class="nd-row">
    <button class="n-btn" type="button" style="background:#e02560;border-color:transparent;color:#ffffff">Delete account</button>
    <button class="n-btn" type="button" style="background:#e3263d;border-color:transparent;color:#ffffff">Delete account</button>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Left is <code>#e02560</code>, hue 10. It is <b>4.31:1</b> against the page and its white label is <b>4.57:1</b> — better than the shipped <code>#e3263d</code> on both counts. And "Delete account" looks like a fashion brand rather than a warning.</p>
  <p class="nd-label">warn at hue 52 and at hue 68</p>
  <div class="nd-row">
    <button class="n-btn" type="button" style="background:#db7222;border-color:transparent;color:#0d0d0d">Expiring soon</button>
    <button class="n-btn" type="button" style="background:#c68022;border-color:transparent;color:#0d0d0d">Expiring soon</button>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Left is hue 52, pushed to the window edge: 3.06:1 on the page, 5.98:1 for its ink. Burnt, rather than amber. All four values here are the light-mode solves, written as literals so the pairs compare like with like in either mode.</p>
</div>

A perfectly separated palette in which `danger` is pink has failed at the only job it had, and
**no assertion could see it.** Every number was green.

> Separation is a constraint. **Meaning is the objective.**

The windows were narrowed to 22–38, 68–92 and 140–168 — the range where each word still means
itself — and that fix is a **judgement**, not a measurement. It was found by rendering the
palette and looking at it.

## So: render it, and compare the pixels

This is where the visual-regression suite comes from. It exists because of exactly one line in
the limitations: a prover measures separation, not appropriateness.

**31 captures** — 15 pages in light and dark, plus one under reduced motion. Most captures are
**one component group on its own page**, not a crop of a long showcase, because a single
1280×5200 diff that says "something changed somewhere" is nearly useless.

Two things about it are worth learning from even if you never write one.

**Determinism first, tolerance second.** If the same page can produce two different images, the
suite is worthless — it teaches people to re-run until green. Six sources of nondeterminism had
to be neutralised: infinite animations, transitions, the text caret, web fonts, overlay
scrollbars, and a deferred script whose timing changed the page height by 390px between runs.
Measured on macOS, the result is **0 pixels of difference across all 31 captures**, run three
times.

**A percentage is the wrong shape for a tolerance.** The first version allowed
`max(40 pixels, 0.01% of the image)`, which sounds more careful. It was caught in the act:
somebody edited one line of hero text, moving 655 pixels. On the tall 1280×5200 capture the
proportional gate was 666, so it **passed**. On the 520px-wide capture the gate was 322, so it
failed. Same edit, invisible in the big image. The gate is now a flat **40 pixels** regardless of
image size.

Measured sensitivity, from three regressions deliberately introduced and reverted:

| Regression | Images that caught it | Pixels moved |
|---|---|---|
| the filled button painted with `--danger-9` | 17 of 31 | 2,684 → 51,477 |
| `justify-content: space-between` on a `<summary>` | 6 of 31 | 1,103 → 32,179 |
| `--space-4` moved 16px → 18px | **31 of 31** | 7,015 → 485,800 |

The gate is 40, the smallest deliberate regression was 1,103, and run-to-run noise is zero. That
is one to two orders of magnitude of margin.

### And what even pixels cannot catch

**A wrong baseline.** If the bug was on screen when you blessed the image, the suite certifies
the bug for ever, and every run afterwards agrees with it. Only a human opening the PNG prevents
that, which is why the procedure says *look at every re-blessed image* and means it.

**Meaning, still.** The suite catches that `warn` *changed*. It cannot tell you the new colour
reads as a fashion brand. Somebody has to look.

## How nilam handles it

Four suites, and they cover different things:

| Suite | Assertions | What it checks |
|---|---|---|
| `prove.test.mjs` | 1,277 | the solver's contracts, and the emitted CSS parsed back out of the file and re-measured |
| `dtcg.test.mjs` | 5,955 | the token export, both directions against the stylesheet |
| `behaviours.test.mjs` | 198 | the ARIA APG keyboard contracts |
| `visual.test.mjs` | 31 images | the rendered pixels, in both modes |

`prove()` itself is 500 of those and it runs twice — once on the sRGB palette and once on the
Display-P3 one — which is the 1,000 that `nilam.tokens.css` claims hold over its exact values.

Plus two assertions about the package rather than the code: every `nilam*.css` must appear in both
`files` and `exports`, every `exports` target must exist, and the **tarball** must contain its
parts, asked of `npm pack` rather than of the filesystem. Both of those exist because both have
shipped broken before, with every colour assertion green.

### The honest map

Everything on this site is one of three things, and it is worth being able to tell them apart:

| | How to treat it |
|---|---|
| **Solved** — 10 of the 12 steps, in six families, both modes, both gamuts | a measurement; re-run it and disagree with the number |
| **Measured** — the dichromacy separations, the P3 chroma gains, the shadow arithmetic | a measurement, with a stated method you can check |
| **Chosen** — six values | a judgement, with its reasoning written next to it |

The six chosen values, in full, because a list of them is more honest than a claim that there are
none:

| Value | What it is |
|---|---|
| `L1` = 0.9800 / 0.1750 | the page — it is the anchor, so there is nothing to solve it against |
| `GLOW_L` = 0.66 | the dark solid's lightness — four derivations were attempted and none produce it |
| `NEUTRAL_CHROMA` = 0.007 | the whisper of brand in the greys, measured off a shipped interface |
| `SEPARATION_FLOOR` = 0.09 | the dichromacy floor — a chosen threshold, not a published one |
| the hue windows | where each word still means itself — judgement, corrected by rendering |
| the chroma envelope | chroma per step as a fraction of the in-gamut maximum |

And the claim, one more time, stated as narrowly as it should be:

1. Every lightness in the palette is found by inverting a contrast requirement, so a step cannot
   exist at a value that breaks its own contract.
2. The dichromat-separation assertion is machine-checked and gates the build, and no prior art
   for that was found in a design system.

**Nothing on this site is a claim that using nilam makes an interface accessible.** That depends
on the interface. The keyboard layer has not been tested against a screen reader. The contrast
model ignores hue and chroma. The colour-vision matrices are a model, not an eye. All of which is
on one page, and it is the page to read before depending on any of this.

**Read next:** [Honest limits](../limitations.md) — every boundary, in one place ·
[Visual regression](../visual.md) — the harness in full ·
[Why solved colour](../solved.md) — the four times the solver was wrong, from the source

That is the end of the curriculum. Every other page on this site should now read as ordinary
prose.
