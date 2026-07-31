# Colour blindness

Roughly 8% of men are dichromatic. Every design system answers this with the advice
*"don't rely on colour alone"* and then ships a red/green semantic pair without ever
checking it.

nilam checks it, and the check is a build failure.

## The claim, stated narrowly

No prior art was found for a **machine-checked dichromat-separation assertion in a design
system**. That is the claim. It is not a claim that the palette is legible to everyone, or
that the simulation is reality, or that colour blindness is solved.

Every status pair is simulated under **protanopia, deuteranopia and tritanopia** using the
[Machado, Oliveira & Fernandes (2009)](https://doi.org/10.1109/TVCG.2009.113) severity-1.0
matrices, applied in linear sRGB, and the separation is measured in OKLab. Then three
things happen, and they are different in kind.

| | Rule | If it fails |
|---|---|---|
| **Hard** | the brand must never be confusable with a status, under any vision | build fails. This is always avoidable — the brand hue is the one free variable. |
| **Hard** | every status pair separates under normal vision | build fails |
| **Measured** | which status pairs collapse under each dichromacy | reported, not hidden — and it becomes a requirement on components |

The floor is a separation in OKLab, not a contrast ratio. Two colours can have identical
luminance and be perfectly distinct, and two with different luminance can collapse to the
same hue under simulation. Contrast is the wrong instrument for "are these the same
colour".

## See it

The four status solids, plus the brand, as four different readers see them. Each chip is
painted with `--<family>-9` on `--<family>-ink` and nothing else.

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
        <i style="background:var(--info-9);color:var(--info-ink)">i</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)">All five separate cleanly.</p>
    </div>
    <div class="n-card n-card-pad">
      <p class="nd-label">protanopia</p>
      <div class="nd-chips nd-prot">
        <i style="background:var(--brand-9);color:var(--brand-ink)">◆</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">×</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">!</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">✓</i>
        <i style="background:var(--info-9);color:var(--info-ink)">i</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)"><b>warn and ok collapse.</b> The glyphs are carrying it.</p>
    </div>
    <div class="n-card n-card-pad">
      <p class="nd-label">deuteranopia</p>
      <div class="nd-chips nd-deut">
        <i style="background:var(--brand-9);color:var(--brand-ink)">◆</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">×</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">!</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">✓</i>
        <i style="background:var(--info-9);color:var(--info-ink)">i</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)"><b>all three status pairs collapse.</b> Red and green are one colour here. No hue assignment fixes it.</p>
    </div>
    <div class="n-card n-card-pad">
      <p class="nd-label">tritanopia</p>
      <div class="nd-chips nd-trit">
        <i style="background:var(--brand-9);color:var(--brand-ink)">◆</i>
        <i style="background:var(--danger-9);color:var(--danger-ink)">×</i>
        <i style="background:var(--warn-9);color:var(--warn-ink)">!</i>
        <i style="background:var(--ok-9);color:var(--ok-ink)">✓</i>
        <i style="background:var(--info-9);color:var(--info-ink)">i</i>
      </div>
      <p class="nd-note" style="margin-block-start:var(--space-3)">Every status pair holds. This is the vision that binds the brand hue.</p>
    </div>
  </div>
</div>

Those are SVG `feColorMatrix` filters with `color-interpolation-filters="linearRGB"`,
carrying the same Machado matrices `src/colour.mjs` uses. The browser and the prover are
running the same arithmetic on the same numbers, so the simulation above is not an
illustration of the assertion — it *is* the assertion, rendered.

Use the toggle in the header to check dark mode. The collapses are not the same there.

## The hard assertion: the brand is never a status

A "save" button that reads as an error is a defect for everyone downstream of it, and
unlike red-versus-green it is always avoidable, because the brand hue is free to move.

Worst separation between the brand solid and any status solid, floor 0.09:

| | normal | protanopia | deuteranopia | tritanopia |
|---|---|---|---|---|
| light | 0.3284 | 0.2865 | 0.3095 | **0.1055** |
| dark | 0.2875 | 0.2438 | 0.2664 | **0.0924** |

The binding constraint on the whole palette is a single cell: **brand against `ok` under
tritanopia in dark mode, at 0.0924 against a floor of 0.09.** That is the number the hue
search is maximising, and it is why `ok` sits at 142 rather than anywhere else in its
window.

It is also why the palette is a function rather than a list. Pass a different brand hue and
this cell may not clear, in which case the build fails and says which pair, under which
vision, in which mode.

## The measured collapses

This is where the honesty is. Danger is red, ok is green — that is what those words mean,
and red and green *are* the same colour to a deuteranope. Lowering the floor to make it
pass would be a lie.

OKLab separation between status solids, floor 0.09, **bold** where the pair collapses:

| light mode | danger / warn | danger / ok | warn / ok |
|---|---|---|---|
| normal | 0.1720 | 0.3614 | 0.2054 |
| protanopia | 0.1589 | 0.2098 | **0.0518** |
| deuteranopia | **0.0641** | **0.0255** | **0.0386** |
| tritanopia | 0.1257 | 0.3588 | 0.2447 |

| dark mode | danger / warn | danger / ok | warn / ok |
|---|---|---|---|
| normal | 0.1506 | 0.3578 | 0.2110 |
| protanopia | 0.1005 | 0.1730 | **0.0817** |
| deuteranopia | **0.0333** | **0.0244** | **0.0140** |
| tritanopia | 0.1219 | 0.3676 | 0.2484 |

Eight collapses, printed by `npm test` every time it runs. Deuteranopia takes all three
pairs in both modes; protanopia takes warn/ok; tritanopia takes none.

## The consequence: a status may not be hue-only

The output of that table is not a warning, it is a **requirement on components**:

> Any status that collapses here must carry a second, non-hue channel — an icon, a label,
> or a shape.

WCAG 1.4.1 has said so for years. `proveStatusChannels()` is what makes it enforceable:
pass it the set of channels each status carries in your components, and it fails the build
if a collapsing pair has nothing but colour.

```js
import { solvePalette, proveDichromacy, proveStatusChannels } from 'nilam';

const palette = solvePalette(285);

// proveDichromacy returns the collapse list for one mode.
const collapses = [
  ...proveDichromacy('light', palette),
  ...proveDichromacy('dark', palette),
];

// Declare what each status carries in YOUR components. Colour alone fails.
proveStatusChannels(collapses, {
  danger: ['colour', 'icon'],
  warn:   ['colour', 'icon'],
  ok:     ['colour', 'icon'],
});
```

That is why every status component in nilam carries a glyph, and why the glyph is not
decorative:

<div class="nd-demo">
  <p class="nd-label">the glyph is the second channel</p>
  <div class="nd-row">
    <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
    <span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span>
    <span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span>
    <span class="n-badge n-badge-info"><i class="n-badge-glyph">i</i>Trial</span>
  </div>
  <p class="nd-label">and the same three as a deuteranope sees them</p>
  <div class="nd-row nd-deut">
    <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
    <span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span>
    <span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span>
    <span class="n-badge n-badge-info"><i class="n-badge-glyph">i</i>Trial</span>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Three of those four are now the same colour. The words and the glyphs are the entire difference, and that is the point.</p>
</div>

The same rule reaches further than badges. `.n-option[data-current]` in the combobox gets
an inset bar as well as a background, because the difference between `--neutral-3` and
`--neutral-4` is one contrast step *by construction* — the ramp is solved, so the step is
deliberately small — and one small step cannot carry "this is the cursor" alone.

## Not every brand hue can carry these statuses

The strongest thing the sweep found, and it only became visible because the hues are chosen
by search rather than by taste.

Run the solver at every one of the 360 degrees. **Only roughly 285–315 clears the separation
floor** against a red/amber/green status set. Every blue fails.

The reason is structural, not a threshold artefact. Tritanopia removes blue–yellow
discrimination, so a blue brand at 240–270 loses its blue component and drifts into the
grey-green that `ok` has to occupy. A violet brand at 285 or above keeps a red component and
stays clear of it.

> If your statuses are red, amber and green, your brand hue cannot be blue — not for a
> tritanope.

**Blue is the commonest brand colour in software.** So this is a real constraint that
essentially nothing accounts for.

285 is also the *lowest* hue that passes, which is an independent argument for the signature
that had nothing to do with how it was chosen.

### When the hue cannot move

"Move the brand hue" is correct advice and useless when the hue is a brand asset that
predates the palette. Refusing to emit anything for a blue brand would make the tool unusable
for most real projects, and quietly lowering the floor to let it pass would be a lie.

```bash
npx nilam 262 --brand-locked --css=tokens.css
```

`--brand-locked` moves brand-versus-status from **asserted** to **measured** — exactly the
treatment danger-versus-ok already gets, and for exactly the same reason: with the hue pinned
the collapse is now equally unavoidable. The affected pairs are reported, and
`proveStatusChannels()` still fails the build if one of those components is hue-only.

Nothing is weakened. The burden moves from the palette to the component, which is where it
can actually be discharged.

## Why info is achromatic

`info` is the fourth status and it has no hue at all. That is a result, not a taste.

The first run of the solver put info's window at 215–275 with a violet brand at 285. The
best assignment it could find left brand and info **0.052 apart under deuteranopia** — the
same colour, to that reader. There was no blue available that cleared the floor, because
the brand had already taken that region of hue space.

> The brand hue constrains which semantic hues remain available.

That is a real constraint no palette tool accounts for, and this is where it first showed
up. So `info` is built from the neutral scale: it is the state that means "nothing is
wrong", it does not need to shout, and spending a hue on it buys a collision with the
brand.

It keeps the identical twelve-step shape and the identical floors, so `--info-11` is still
4.5:1 text and `--info-7` is still a 3:1 border. Only the chroma is gone.

## The limits of all of this

Stated here as well as on [Limitations](limitations.md), because this is the page that
would otherwise overclaim.

- **The matrices are a model.** Machado, Oliveira & Fernandes 2009 is a good model and it
  is what the literature uses. It is not an eye.
- **Only severity 1.0 is simulated.** Real colour vision varies continuously, and most
  people with a colour vision deficiency are anomalous trichromats rather than dichromats.
  Severity 1.0 is the hardest case, not the common one.
- **0.09 is a chosen threshold, not a published one.** It was picked because it separates
  the pairs that visibly separate from the pairs that visibly do not. There is no standard
  to cite for it.
- **A prover measures separation, not appropriateness.** An earlier revision optimised
  separation until `danger` resolved to magenta with every assertion passing. See
  [meaning is the objective](solved.md#meaning-is-the-objective-separation-is-a-constraint).
