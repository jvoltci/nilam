# 7 · Colour blindness

Roughly **1 in 12 men** cannot separate red from green.

Not "finds it harder". For a deuteranope, red and green are *the same colour*. There is no
lighting, no contrast ratio and no amount of saturation that changes it, because the
information is gone before it reaches the brain.

Which means a red/green status pair — the most common convention in software — carries no
information at all for about 8% of your male users.

## Why, in three sentences

Human colour vision comes from three types of cone cell in the retina, tuned to long, medium
and short wavelengths. What you perceive as hue is the **ratio** between their three responses,
so colour is a three-dimensional signal.

Lose one cone type and it becomes two-dimensional. A whole axis of distinction disappears, and
every colour that differed only along that axis collapses onto its neighbour.

| Term | Means |
|---|---|
| **trichromat** | three working cone types — most people |
| **anomalous trichromat** | three types, but one is shifted, so the axis is compressed rather than gone |
| **dichromat** | two working types — one axis is genuinely absent |
| **protanopia** | the long-wavelength ("red") cone is missing |
| **deuteranopia** | the medium-wavelength ("green") cone is missing |
| **tritanopia** | the short-wavelength ("blue") cone is missing — much rarer, and not sex-linked |

The 1-in-12 figure covers all red–green deficiency. Most of those people are anomalous
trichromats rather than full dichromats, so severity varies continuously. Dichromacy is the
hardest case, not the common one.

**Why it is mostly men:** the genes for the long- and medium-wavelength cones sit on the X
chromosome. Men have one X, so a faulty copy has no backup; women have two, so they usually
do. That single fact is the whole explanation for the roughly 8% versus 0.5% split, and it is
why "1 in 12 men" is the number worth remembering rather than a population average.

## See it

Below are nilam's four status colours plus its brand, as four different readers see them.

<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true">
  <filter id="nd-protanopia" color-interpolation-filters="linearRGB">
    <feColorMatrix type="matrix" values="0.152286 1.052583 -0.204868 0 0
                                         0.114503 0.786281  0.099216 0 0
                                        -0.003882 -0.048116 1.051998 0 0
                                         0 0 0 1 0"/>
  </filter>
  <filter id="nd-deuteranopia" color-interpolation-filters="linearRGB">
    <feColorMatrix type="matrix" values="0.367322 0.860646 -0.227968 0 0
                                         0.280085 0.672501  0.047413 0 0
                                        -0.011820 0.042940  0.968881 0 0
                                         0 0 0 1 0"/>
  </filter>
  <filter id="nd-tritanopia" color-interpolation-filters="linearRGB">
    <feColorMatrix type="matrix" values="1.255528 -0.076749 -0.178779 0 0
                                        -0.078411  0.930809  0.147602 0 0
                                         0.004733  0.691367  0.303900 0 0
                                         0 0 0 1 0"/>
  </filter>
</svg>

<div class="nd-demo">
  <div class="nd-grid">
    <div class="n-card n-card-pad">
      <p class="nd-label">normal vision</p>
      <div class="nd-chips">
        <i style="background:var(--brand-9);color:var(--brand-ink)">◆</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">×</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">!</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">✓</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)">Four colours, four meanings.</p>
    </div>
    <div class="n-card n-card-pad">
      <p class="nd-label">deuteranopia</p>
      <div class="nd-chips nd-deut">
        <i style="background:var(--brand-9);color:var(--brand-ink)">◆</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">×</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">!</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">✓</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)"><b>The last three are one colour.</b> No hue assignment fixes it.</p>
    </div>
    <div class="n-card n-card-pad">
      <p class="nd-label">protanopia</p>
      <div class="nd-chips nd-prot">
        <i style="background:var(--brand-9);color:var(--brand-ink)">◆</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">×</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">!</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">✓</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)"><b>warn and ok collapse.</b> danger survives.</p>
    </div>
    <div class="n-card n-card-pad">
      <p class="nd-label">tritanopia</p>
      <div class="nd-chips nd-trit">
        <i style="background:var(--brand-9);color:var(--brand-ink)">◆</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">×</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">!</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">✓</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)">Every status pair holds — and this is the vision that constrains the brand hue.</p>
    </div>
  </div>
</div>

Those are SVG `feColorMatrix` filters. Each one is a 3×3 matrix multiply on the pixel's
channels, and the matrices are from **Machado, Oliveira & Fernandes (2009)** at severity 1.0 —
the model the literature uses.

Two details that matter.

**`color-interpolation-filters="linearRGB"`.** The matrices operate on *light*, so the browser
has to gamma-decode before multiplying and re-encode afterwards. Chapter 2's curve again. Run
the same matrix on raw bytes and the answer is wrong, in a way that looks plausible.

**These are the same numbers `src/colour.mjs` uses.** The browser and nilam's prover are running
identical arithmetic on identical inputs, so the panels above are not an illustration of the
assertion. They **are** the assertion, rendered.

## Measuring "are these the same colour"

Contrast is the wrong instrument, and this is worth being precise about.

- Two colours can have **identical luminance** and be perfectly distinct — a mid red and a mid
  green.
- Two colours with **very different luminance** can collapse to the same hue under simulation.

A contrast ratio has nothing to say about either case, because it only sees light.

What you want is a **distance in a perceptual space**. nilam measures straight-line distance in
OKLab:

```js
// src/colour.mjs
distance(a, b) = √( ΔL² + Δa² + Δb² )
```

Plain Euclidean, which is defensible precisely because OKLab is roughly uniform — no CIEDE2000
weighting needed, and none of its discontinuities either.

The threshold is **0.09**. Below that, two colours read as the same. And it is worth saying
plainly: 0.09 is **a chosen number, not a published one.** It was picked because it separates
the pairs that visibly separate from the pairs that visibly do not. There is no standard to
cite for it.

## The measured collapses

nilam simulates all three dichromacies in both modes and reports the result rather than hiding
it. Bold is a collapse:

| light mode | danger / warn | danger / ok | warn / ok |
|---|---|---|---|
| normal | 0.1720 | 0.3614 | 0.2054 |
| protanopia | 0.1589 | 0.2098 | **0.0518** |
| deuteranopia | **0.0641** | **0.0255** | **0.0386** |
| tritanopia | 0.1257 | 0.3588 | 0.2447 |

Deuteranopia takes all three pairs. `danger` against `ok` — red against green — comes out at
**0.0255**, which is a quarter of the floor. The first run of the solver searched **15,360
hue combinations** and the best it managed on that pair was 0.065.

So it cannot be fixed by choosing better colours. Danger is red and ok is green; that is what
those words mean. Lowering the floor until it passed would be a lie.

## "Don't rely on colour alone"

This is **WCAG 1.4.1**, and it has said so since 2008. Every design system repeats it. Almost
none of them enforce it, and the reason is structural: there was no way to *check* it. You
cannot write a rule that says "this red means something" without knowing which colours actually
collide.

The collapse list above is what makes it checkable. Once you know that `danger`, `warn` and `ok`
are one colour to a deuteranope, "those three components must carry a second channel" stops
being advice and becomes a requirement you can fail a build on.

<div class="nd-demo">
  <p class="nd-label">colour only</p>
  <div class="nd-row">
    <i style="display:inline-block;inline-size:1.5rem;block-size:1.5rem;border-radius:var(--r-full);background:var(--danger-9)"></i>
    <i style="display:inline-block;inline-size:1.5rem;block-size:1.5rem;border-radius:var(--r-full);background:var(--warn-9)"></i>
    <i style="display:inline-block;inline-size:1.5rem;block-size:1.5rem;border-radius:var(--r-full);background:var(--ok-9)"></i>
    <span style="font-size:var(--text-00);color:var(--neutral-11);margin-inline-start:var(--space-3)">failed · expiring · active</span>
  </div>
  <p class="nd-label">colour only, as a deuteranope sees it</p>
  <div class="nd-row nd-deut">
    <i style="display:inline-block;inline-size:1.5rem;block-size:1.5rem;border-radius:var(--r-full);background:var(--danger-9)"></i>
    <i style="display:inline-block;inline-size:1.5rem;block-size:1.5rem;border-radius:var(--r-full);background:var(--warn-9)"></i>
    <i style="display:inline-block;inline-size:1.5rem;block-size:1.5rem;border-radius:var(--r-full);background:var(--ok-9)"></i>
    <span style="font-size:var(--text-00);color:var(--neutral-11);margin-inline-start:var(--space-3)">three identical dots</span>
  </div>
  <p class="nd-label">colour plus a glyph plus a word</p>
  <div class="nd-row">
    <span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span>
    <span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span>
    <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
  </div>
  <p class="nd-label">and the same three, as a deuteranope sees them</p>
  <div class="nd-row nd-deut">
    <span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span>
    <span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span>
    <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The bottom row is still three identical colours. The glyph and the word are the <b>entire</b> difference, and that is the point — the palette has not been rescued, the component has.</p>
</div>

The rule reaches further than badges. In nilam's combobox, `.n-option[data-current]` gets an
inset bar as well as a background — because the difference between `--neutral-3` and
`--neutral-4` is one contrast step *by construction*, the ramp being solved, and one small step
cannot carry "this is the cursor" on its own.

## The finding nobody was looking for

Here is what happens when you choose semantic hues by search instead of by taste, and then
sweep the brand hue across all 360 degrees against a red/amber/green status set.

**Only roughly 285–315 clears the 0.09 floor under every vision.** Every blue collapses with
`ok` for a tritanope.

The reason is structural, not a threshold artefact:

> Tritanopia removes blue–yellow discrimination. A blue brand at 240–270 loses its blue
> component and drifts into the grey-green that `ok` has to occupy. A violet brand at 285 or
> above keeps a red component, so under the same simulation it moves toward pink and stays
> clear of green.

So: **if your statuses are red, amber and green, your brand hue is not distinguishable from
`ok`** — not for a tritanope. Only violet brand hues survive that set.

**Blue is the commonest brand colour in software.** Which makes what nilam does about it the
more interesting half of the story, and it is the subject of the next section.

nilam's signature is 285, and 285 is the *lowest* hue that clears the floor under every
vision. That is an independent argument for a colour that had already been chosen by eye,
years earlier, for entirely different reasons.

### The finding that changed the rule

The obvious response to the sweep is to refuse: no palette for a blue brand. nilam did that
for three releases, and **0.4.0 reversed it**, on an argument worth reading because it is
about prevalence rather than about colour.

| collapse | who it reaches | old treatment |
|---|---|---|
| red vs green — `danger`/`ok` under deuteranopia | roughly **1 in 12 men** | reported, glyph required |
| blue vs green — brand/`ok` under tritanopia | roughly **1 in 10,000** | **refused to build** |

The prover was strict about the rare collapse and pragmatic about the one roughly 800 times
more common. And the strictness bought nothing for anybody: `npx nilam 250`, an unremarkable
blue, emitted no palette at all. Refusing does not produce a better brand hue, because a brand
colour usually predates the palette by years and is not the palette author's to change. It
produces a tool nobody uses.

The remedy that actually reaches a tritanope is the one red/green already gets: **a second,
non-hue channel on the affected component.** A colour they cannot distinguish was never going
to help them; a tick on the badge does.

So under a dichromacy the collapse is now measured, reported, and handed to
`proveStatusChannels()` — which still fails the build if one of those components is hue-only.
Nothing is weakened. The obligation moves from the palette, where it could not be discharged,
to the component, where it can.

**Under normal vision it is still a hard failure.** If a save button and an error state are
the same colour to *everyone*, no glyph makes that acceptable and the hue simply has to move.
That rules out roughly 15–150, where the brand would sit on top of `danger` or `warn`.

```bash
# emits, reports the collapse, requires a glyph
npx nilam 250

# refuses instead, if the hue is still free to move
npx nilam 250 --strict-brand-hue
```

### And why `info` has no hue at all

The same constraint, found earlier and from the other direction.

`info` was originally given a window of 215–275 — blue, as every design system does. With a
violet brand at 285, the best assignment the solver could find left brand and info **0.052
apart under deuteranopia**. The same colour, to that reader. There was no blue available that
cleared the floor, because the brand had already taken that region of hue space.

> The brand hue constrains which semantic hues remain available.

So `info` is built from the neutral scale — byte for byte identical to it. It is the state that
means "nothing is wrong", it does not need to shout, and spending a hue on it buys a collision
with the brand. It keeps the identical twelve-step shape and the identical floors: `--info-11`
is still 4.5:1 text and `--info-7` is still a 3:1 border. Only the chroma is gone.

## How nilam handles it

Three rules, and they differ in kind:

| | Rule | If it fails |
|---|---|---|
| **Hard** | the brand separates from every status **under normal vision** | build fails — no glyph makes a universal collision acceptable |
| **Hard** | every status pair separates under normal vision | build fails |
| **Measured** | which pairs — status/status *and* brand/status — collapse under each dichromacy | reported, and it becomes a requirement on components |

`--strict-brand-hue` moves the brand's dichromacy row back into the hard set, for when the hue
genuinely is still free and you would rather be told to move it than take on a glyph
obligation.

The tightest cell in the whole search is brand against `ok`, under tritanopia, in dark mode, at
**0.0924** against a floor of 0.09. That is still the number the hue search maximises, and it is
why `ok` sits at 142 rather than anywhere else in its window — so the default palette clears the
floor everywhere, and the reporting path exists for the hues that do not.

The third rule is enforced, not suggested:

```js
import { solvePalette, proveDichromacy, proveStatusChannels } from 'nilam';

const palette = solvePalette(285);
const collapses = [
  ...proveDichromacy('light', palette),
  ...proveDichromacy('dark', palette),
];

// What each status carries in YOUR components.
// Colour alone fails the build.
proveStatusChannels(collapses, {
  danger: ['colour', 'icon'],
  warn:   ['colour', 'icon'],
  ok:     ['colour', 'icon'],
});
```

Note what that call does *not* care about. It takes the collapse list and the channels, and it
does not know or ask whether a given collapse came from red-versus-green or from a blue brand.
Once the answer is "that component needs a second channel", the two cases are the same problem.

### Where this stops

Stated as firmly as the claim:

- **The matrices are a model.** A good one. Not an eye.
- **Only severity 1.0 is simulated.** Real colour vision varies continuously, and most people
  with a deficiency are anomalous trichromats. Severity 1.0 is the hardest case, not the
  common one.
- **0.09 is chosen.** There is no standard behind it.
- **A prover measures separation, not appropriateness.** It will happily certify a palette in
  which `danger` is magenta, and chapter 12 is about exactly that.

The claim, stated narrowly: no prior art was found for a machine-checked dichromat-separation
assertion in a design system. That is all. It is not a claim that the palette is legible to
everyone, or that the simulation is reality, or that colour blindness is solved.

**Next:** [type and space](8-type-and-space.md) — the half of a design system that cannot be
solved, and what to do instead.

**Reference:** [Colour blindness](../colour-blindness.md) has every measured number, both modes,
and the full argument. [Honest limits](../limitations.md#colour-vision-simulation) has the
boundaries.
