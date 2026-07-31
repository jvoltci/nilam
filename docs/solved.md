# Why solved colour

achroma, the predecessor, removed colour because colour is risky. This inverts the
premise: colour is the strongest tool an interface has, people misuse it because nobody
can verify it, so **verify it and then use it freely.**

## What "solved" means

Every lightness in the palette is found by inverting a contrast requirement.

Step 11 is the body-text role. It is not a grey that looked about right — it is the
lightness at which text reaches 4.5:1 against step 3, found by bisection. Step 7 is the
control border, and it is the lightness that reaches 3:1 against step 3. Step 9 is the
filled button, and it is the *lightest* colour that still clears 3:1 against the page
while carrying a legible label.

The contract is the construction. A step cannot exist at a lightness that breaks it,
because the lightness *is* the answer to the contract.

That is the whole difference from a hand-tuned scale. Radix hand-tuned thirty scales over
years and the result is genuinely beautiful; it is also unverifiable, because nothing
fails when a step drifts. Here something fails.

## The role model

Twelve steps, and the model is Radix's — it is good design and there was no reason to
reinvent it. What is new is that the roles are **contracts a solver satisfies** rather
than labels on hand-chosen swatches.

| Step | Role | Solved against | Floor |
|---|---|---|---|
| 1 | page | — | chosen: the anchor |
| 2 | subtle page | step 1 | 1.055:1 light, 1.075:1 dark |
| 3 | component, rest | step 1 | 1.13:1 light, 1.17:1 dark |
| 4 | component, hover | step 1 | 1.20:1 light, 1.27:1 dark |
| 5 | component, active | step 1 | 1.28:1 light, 1.38:1 dark |
| 6 | border, subtle | step 1 | 1.55:1 — decorative, 1.4.11 does not govern it |
| 7 | border, normal | **step 3** | 3:1 — WCAG 1.4.11 |
| 8 | border, hover | **step 3** | 4.2:1 |
| 9 | solid | step 1 + its own ink | 3:1 (1.4.11) **and** 4.5:1 (1.4.3) |
| 10 | solid, hover | step 9 | 1.18× step 9's ratio |
| 11 | text, low | **step 3** | 4.5:1 — WCAG 1.4.3 |
| 12 | text, high | **step 3** | 7:1 |

The bold rows are the interesting ones, and
[the fourth failure below](#4-the-border-that-was-compliant-on-the-page-and-invisible-on-a-card)
is why.

Step 1 is the only value not solved from a contrast target: it is the page, so it is
chosen, and everything else is solved against it. It is **not** pure white. A page at
L 1.000 has no headroom left for a raised surface, which is exactly the defect that made
achroma's light-mode cards invisible at 1.044:1.

Steps 2–5 are solved as *contrast* against step 1 rather than as fixed lightness deltas,
because a fixed delta is a different perceptual step in light than in dark. That was the
mistake that left achroma's raised surface at 1.044:1 in light and 1.104:1 in dark from
"one step" each.

The interaction states have to be *felt*, which is its own assertion: steps 3→4, 4→5 and
9→10 must differ by at least 0.012 in OKLab. A hover nobody can see is a hover that does
not exist, and that is where hand-tuned scales quietly collapse. The shipped brand scale
measures 0.0203 for 3→4 and 0.0410 for 9→10.

## What the numbers come out as

<div class="nd-demo">
  <p class="nd-label">step 7 — the control border, on the page and on a card</p>
  <div class="nd-grid">
    <div>
      <div class="n-field">
        <label class="n-label" for="s-page">On the page</label>
        <input class="n-input" id="s-page" placeholder="3.45:1 in light mode">
      </div>
    </div>
    <div class="n-card n-card-pad">
      <div class="n-field">
        <label class="n-label" for="s-card">On a card</label>
        <input class="n-input" id="s-card" placeholder="3.05:1 in light mode">
      </div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Both borders are <code>--neutral-7</code>. Before the fix the right-hand one was 2.70:1.</p>
</div>

| | light | dark |
|---|---|---|
| step 7 vs the page | 3.45:1 | 3.57:1 |
| step 7 vs a card (step 3) | **3.05:1** | **3.05:1** |
| step 11 vs the page | 5.14:1 | 5.32:1 |
| step 11 vs a card | **4.55:1** | **4.55:1** |
| step 12 vs a card | 7.10:1 | 7.10:1 |
| step 9 vs the page | 4.31:1 | 5.79:1 |
| step 9 vs its own ink | 4.57:1 (white) | 5.92:1 (dark) |

The steps solved against step 3 land exactly on their floors, because that is what solving
*is*. The looser numbers are what falls out for free on the easier background.

---

## Four times the solver was wrong

This is the most useful content in the project, because it is all real. Each of these
produced a palette in which every assertion passed.

### 1. The objective that maximised chroma, and produced pigment instead of glow

The first version of `solveSolid` kept "the most chromatic legal colour". In the blue half
of the wheel maximum chroma lives at low lightness, so for a violet brand it returned:

| | hex | L | C | h |
|---|---|---|---|---|
| Zima Blue | `#009fe3` | 0.667 | 0.147 | 238 |
| the accent I had used for years | `#8b7cf6` | 0.657 | 0.176 | 286 |
| what the solver produced | `#6223f1` | **0.500** | 0.269 | 285 |

The first two are 48° apart in hue and read as the same *kind* of colour. The third is one
degree from the second and reads as nothing like it — it reads as pigment, or as
highlighter ink.

**Lightness was the variable, not hue,** and the objective was walking away from it. Every
blue that solver produced looked like a highlighter.

The fix was to change what is being maximised. In light mode: the *lightest* colour that
still clears 3:1 on the page and carries a legible ink — the constraints pick the value. In
dark mode: the glow band at L 0.66, which is `#8a7ef7`, and which is where both references
already sat.

### 2. The ink rule that made warn a dark olive

"Carries some legible ink" is too weak a constraint. On a white page a light violet at
L 0.66 passes it — black text on it is 5.9:1 — so the solver returned that, at 3.06:1
against the page. Legal, and wrong: a pale button on a pale page is not an object, it is a
smudge. A filled button has to invert its page's polarity to read as raised, so light mode
wants **white** ink and dark mode wants **dark** ink.

Preferring white outright then broke the other end of the wheel. Amber can just barely
carry white text down at L 0.53, so the white-ink branch always won and never fell through,
and `warn` resolved to `#8c731a` — a dark olive-gold nobody would read as a warning. An
earlier revision produced `#b08922` the same way.

The fix names no hue: solve the lightest legal solid for *each* ink, then keep the more
chromatic of the two candidates. Both candidates are already pinned to the lightest
lightness legal for their ink, so this is not the maximise-chroma bug returning — the choice
is between two constrained points, not a free search.

It lands where each hue's chroma actually lives:

| | step 9 | ink | ink ratio | on its page |
|---|---|---|---|---|
| brand, light | `#755cf5` L 0.585 | white | 4.57:1 | 4.31:1 |
| warn, light | `#c68022` L 0.658 | dark | 6.00:1 | 3.05:1 |

Violet is most saturated dark, so it takes white ink and the **ink bound** binds. Amber is
most saturated light, so it takes dark ink and stays amber, and the **page bound** binds
instead. Neither hue needs a special case and neither gets one.

This is also why `--<family>-ink` exists as a token. A hard-coded `color: white` on a
filled button is the most common contrast defect in comparable systems.

### 3. The optimiser scored on pairs nothing could fix

The semantic hue search maximises the smallest pairwise separation across normal vision and
all three dichromacies. The first objective was the minimum over *every* pair under every
vision, which sounds strictly better and is worse.

`danger` and `ok` are red and green. They collapse under deuteranopia no matter what — the
first run searched 15,360 combinations and the best it managed was 0.065 against a 0.09
floor. The prover already accepts that and demands a non-hue channel instead. But the
optimiser was still being *scored* on it, so:

- the global minimum was pinned at **0.0333** by a pair nothing could move;
- moving `ok` around changed the score not at all;
- so it happily shipped an `ok` hue that put brand against ok at **0.0882** under
  tritanopia — a failure that *was* fixable, because fixing it did not move the number
  being maximised.

> An objective that averages over the fixable and the unfixable optimises neither.

The score is now exactly the hard set: the brand against each status under every vision,
and status against status under normal vision.

Same shape of bug, in another direction: the first version also scored **light mode only**
and used the result in both. Once step 9 became mode-dependent, dark mode never got a vote,
and the assertion that caught it fired nowhere near the code that caused it.

### 4. The border that was compliant on the page and invisible on a card

The one that reached a product.

Steps 6, 7 and 8 were all solved against step 1, the page, and asserted against step 1. So
step 7 measured exactly 3.05:1 and was declared compliant. On a **card** — step 3, where
controls actually live — it was 2.70:1 in light and 2.61:1 in dark. Every family, both
modes.

A closed loop: the thing that chose the value and the thing that checked it made the same
wrong assumption, so nothing disagreed.

It was found by migrating a real app, and the damage was not theoretical:

- a dashed **1.37:1** border on the file drop zone — which was the entire product;
- a 3px warning stripe that was meant to be the non-hue channel a deuteranope depends on.
  At 1.37:1 that channel does not exist.

Steps 7 and 8 now solve against step 3, and the prover gained a `7 vs 3` assertion. Step 6
still solves against the page, because it is the decorative hairline — a card edge, not a
control boundary — and 1.4.11 does not govern it. Making it clear 3:1 as well would just be
step 7 twice.

The lesson is the one that also made nilam assert its own tarball:

> An assertion that shares its premise with the thing it audits is not an audit.

---

## Meaning is the objective, separation is a constraint

The semantic hues are searched inside windows — the range where each word still means
itself:

| | window | shipped |
|---|---|---|
| `danger` | 22–38 | 22 |
| `warn` | 68–92 | 68 |
| `ok` | 140–168 | 142 |

The windows were wider once: 8–44, 52–104, 132–176. The optimiser did exactly what it was
told and pushed every hue to the window **edge** to buy separation. `danger` landed on 10
and rendered as hot magenta — "Delete account" looked like a fashion brand rather than a
warning. `warn` landed on 52 and came out burnt brown.

A perfectly separated palette in which danger is pink has failed at the only job it had,
and **no assertion could see it** — every number was green. This class of error is visible
only by rendering, which is the honest limit on all of it.

### And the constraint runs the other way too

Fixing the windows and letting the search do its job produced a result nobody was looking
for. Sweep all 360 degrees of brand hue and **only roughly 285–315 passes.** Every blue
fails, because tritanopia removes blue–yellow discrimination and a blue brand drifts into the
grey-green that `ok` has to occupy.

285 is the *lowest* hue that clears it — which is an independent argument for the signature
that had nothing to do with how it was chosen. [The full finding](colour-blindness.md#not-every-brand-hue-can-carry-these-statuses).

## Salience, and an assertion that was itself wrong

The prover checks that the primary action is the most prominent thing on the page. The
first version asserted that the brand solid must out-contrast the neutral solid, and it
failed at 6.53 vs 12.92.

The assertion was wrong, not the palette. The neutral solid is near-black, so an ink button
legitimately has more contrast than any hue can — which is exactly why an all-ink button
works. **Contrast is the wrong instrument for prominence.** What makes the primary action
pop is that it is the only *chromatic* solid on the page: it wins on a channel nothing else
is using.

So the assertion is about chroma instead:

| light mode | on the page | chroma |
|---|---|---|
| brand solid | 4.31:1 | **0.219** |
| neutral solid | 4.30:1 | 0.007 |

Nearly identical contrast, thirty times the chroma. That is the hierarchy.

<div class="nd-demo">
  <p class="nd-label">the same two buttons</p>
  <div class="nd-row">
    <button class="n-btn n-btn-fill" type="button">Primary</button>
    <button class="n-btn n-btn-ink" type="button">Ink</button>
    <button class="n-btn" type="button">Secondary</button>
  </div>
</div>

## What is chosen, not solved

Six things. Every one is declared in the source with its reasoning, and everything
downstream of them is asserted.

| Value | What it is | Why it is not derived |
|---|---|---|
| `L1` = 0.9800 / 0.1750 | the page | it is the anchor; there is nothing to solve it against |
| `GLOW_L` = 0.66 | the dark solid's lightness | four derivations were attempted and none produce it: 0.603, 0.595, 0.570, 0.575 |
| `NEUTRAL_CHROMA` = 0.007 | the whisper of brand in the greys | measured off a shipped interface whose greys run 0.007–0.020 around hue 285 |
| `SEPARATION_FLOOR` = 0.09 | the dichromacy floor | a chosen threshold, not a published one |
| the hue windows | where each word still means itself | judgement, corrected by rendering |
| the chroma envelope | chroma per step, as a fraction of the in-gamut maximum | the shape is judgement; the fraction adapts to hue on its own |

`GLOW_L` deserves the extra sentence, because it is the one the README calls out. In light
mode the constraints **bind** and choose the value for you. In dark mode they do not — dark
ink still has 1.3:1 of headroom at 0.66 — so something has to fill the gap, and it is
taste, measured off two colours that work. What is *not* claimed is that it was derived.

## Read next

- [Colour blindness](colour-blindness.md) — the assertion with no prior art, simulated live.
- [Tokens](palette.md) — every step, every family, and how to theme it.
- [Limitations](limitations.md) — where all of this stops being true.
