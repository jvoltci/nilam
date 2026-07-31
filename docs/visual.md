# Visual regression

The other three suites measure numbers. This one looks at pixels.

It exists because of one line in the [limitations](limitations.md): a prover measures
separation, not appropriateness. An earlier revision optimised separation until `danger`
came out magenta, and **every assertion passed**. That class of mistake is only visible by
rendering, so this renders.

## Run it

```bash
node test/visual.test.mjs              # capture, compare, fail on any change
node test/visual.test.mjs --update     # re-bless the baselines for this platform
node test/visual.test.mjs --only=forms # just the captures whose name contains "forms"
node test/visual.test.mjs --determinism  # capture 3x, require a zero diff
```

You need Google Chrome. It is found automatically on macOS and on Linux; set
`NILAM_CHROME` to override. Nothing is installed — no dependency, no `npx` download. The
PNG decoder, the encoder and the pixel comparison are written against Node's built-in
`zlib`.

A full run is 31 captures and takes about 75 seconds.

## Bless a change

When you change a colour or a component on purpose, the suite fails. That is correct. To
accept it:

1. Run `node test/visual.test.mjs`. It writes a diff image per failure and prints the path.
2. **Open the diff images.** Red is a pixel that moved. Magenta is a region only one of the
   two images covers, which means the frame size changed.
3. Confirm every red mark is a change you meant.
4. Run `node test/visual.test.mjs --update`.
5. **Look at every re-blessed PNG** before committing it.

Step 5 is the one that matters. A wrong baseline is worse than no baseline: it locks the
bug in, and every run afterwards certifies it.

## What it captures

31 images — 15 pages in light and dark, plus one reduced-motion capture.

| Capture | What it is for |
|---|---|
| `showcase` | The whole demo page at 1280px. Catches a section moving relative to another. |
| `showcase-narrow` | The same at 520px, where every `auto-fit` grid collapses to one column. |
| `signature` | The two brand moments — a forced-light and a forced-dark card side by side. |
| `cvd` | The four status solids under protanopia, deuteranopia and tritanopia. |
| `scales` | All six families, twelve steps. This is where a magenta `danger` shows. |
| `buttons` | All nine variants including disabled and busy. |
| `forms` | Input, select, textarea, error, checkbox, indeterminate, radio, switch. |
| `status` | Four notes and six badges, with their glyphs. |
| `disclosure` | The accordion and the tabs. |
| `table` | Header, key column, badges, numeric column. |
| `loaders` | Spinner, dots, progress, indeterminate bar, skeleton, and all five busy buttons. |
| `loaders-reduced-motion` | The same under `prefers-reduced-motion`, where the loaders must keep going. |
| `overlay-menu` / `-tip` / `-dialog` | Each overlay open, one per image — two `popover="auto"` elements cannot be open at once. |
| `widgets` | Combobox and slider, wired by the real `enhance()`. |

Most captures are **one component group on its own page**, not a crop of the showcase. A
single 1280×5200 diff tells you "something changed somewhere", which is nearly useless. The
markup is extracted from `demo/index.html` at capture time, so the showcase stays the
single source of truth and a crop cannot drift from it.

## How the screenshots are made deterministic

If the same page can produce two different images, the suite is worthless — it teaches
people to re-run until green. Six things had to be neutralised.

**Animations.** nilam has five infinite ones. The obvious move — Chrome's
`--force-prefers-reduced-motion` — makes it *worse*: `nilam.base.css` stops all animation
under that query, and then `nilam.components.css` deliberately exempts the loaders with
`animation-iteration-count: infinite !important`, because a frozen spinner reads as a hung
app. So instead:

- `animation-play-state: paused !important`, injected into `@layer nilam.tokens`. The layer
  name is the whole trick. For `!important` declarations the cascade **reverses** layer
  order, so an `!important` in the first layer beats one in a later layer. Unlayered would
  lose to the loader exemption.
- Then the Web Animations API: `getAnimations()`, `pause()`, and a fixed `currentTime` of
  600ms on every animation, including the ones on `::before`. This is what pins the frame,
  and no stylesheet can argue with it.

600ms is chosen. `n-spin` is 600ms, so spinners land axis-aligned with the least
anti-aliasing. `n-slide` is 1400ms, so the indeterminate bar lands mid-travel and is
actually visible — pinned at 0 it sits off-screen and the crop could not see its colour.
The three dots have 0/150/300ms delays, so at 600ms they are at three different points and
the stagger is captured too.

**Transitions.** `transition: none`, unlayered and without `!important`, because for normal
declarations unlayered beats every layer. This also disposes of `@starting-style`: with no
transition there is no entry animation for the dialog or the popovers to be caught halfway
through.

**Caret.** `caret-color: transparent`. The dialog's `showModal()` focuses its first field
and a blinking caret is a coin flip.

**Fonts.** There are no `@font-face` rules in nilam, so there is no web font to race. That
is luck rather than policy, so the suite asserts it stays true.

**Scrollbars.** `--hide-scrollbars`. An overlay scrollbar fades on a timer.

**A deferred script.** `demo/index.html` builds the scale strips and the colour-blindness
cards in a `<script type="module">`, which is deferred. Asking Chrome for the page height
eight times returned 4157 five times and 4547 three times — a 390px spread, exactly the
height of that content. Sometimes the module had run and sometimes it had not. So the
harness builds the same three things in a classic script that runs during parse. Capturing
the showcase with the demo's module deleted and the harness's copy in its place produces a
byte-identical PNG, so whichever wins the race the screenshot is the same.

Proven, not asserted: `--determinism` captures all 31 pages three times and requires a zero
diff. On macOS it is **0 pixels across all 31**.

## Why baselines are per platform

`test/visual/baselines/darwin/`, `test/visual/baselines/linux/`. Each machine compares
against its own set.

macOS and Ubuntu do not have the same fonts, so text wraps at different words and every
block lands at a different height. That is not anti-aliasing jitter a tolerance could
absorb — a threshold loose enough to pass it would also pass a filled button turning red.

CI runs on Linux. While `baselines/linux/` is empty it captures, uploads the images as an
artefact, annotates the run, and passes on the determinism assertions alone. Download the
artefact, look at all 31, commit them, and from then on it gates. No workflow edit is
needed; the presence of the PNGs is the switch.

## The tolerance

Colour distance is compared in YIQ, weighted the way pixelmatch does it (Yee 2004), with a
threshold of 0.06 — 6% of the largest possible difference. A capture fails if **more than 40
pixels** moved. Flat, regardless of image size.

The first version used `max(40 pixels, 0.01% of the image)`, which sounds more careful and
is worse. It was caught in the act: while this harness was being built somebody edited one
line of hero text in `demo/index.html`, moving 655 pixels. On the 1280×5200 showcase the
proportional gate was 666, so it **passed**; on the 520px showcase the gate was 322, so it
failed. Same edit, invisible in the tall image, caught in the short one — because a
percentage of a big image is a lot of pixels. A percentage is the wrong shape for finding a
small local change in a large page.

Since the same machine produces a zero diff, the tolerance is headroom against a future
Chrome nudging a glyph edge, not slack the suite needs today.

Measured sensitivity, from three regressions deliberately introduced and then reverted:

| Regression | Images that caught it | Pixels, smallest → largest |
|---|---|---|
| `.n-btn-fill` painted with `--danger-9` | 17 of 31 | 2,684 → 51,477 |
| `justify-content: space-between` on `.n-summary` | 6 of 31 | 1,103 → 32,179 |
| `--space-4` moved 16px → 18px | **31 of 31** | 7,015 → 485,800 |
| *(unplanned)* one line of hero text edited | 4 of 31 | 551 → 655 |

The gate is 40. The smallest deliberate regression was 1,103 and the smallest accidental one
551 — between one and two orders of magnitude of margin, with run-to-run noise at zero.

## What it does not catch

- **Anything outside the 31 captures.** Hover, focus-visible, active and invalid states are
  mostly not captured; nor is RTL, nor the vertical slider, nor forced-colours mode.
- **A wrong baseline.** If the bug was on screen when you blessed it, this certifies the bug
  for ever. Only a human looking at the image prevents that.
- **Non-Chrome rendering.** Firefox and Safari are not captured. `field-sizing`,
  `position-area` and `popover="hint"` all have Chrome-first histories.
- **Meaning.** It catches that `warn` *changed*. It cannot tell you that the new colour
  reads as a fashion brand. Somebody still has to look.
- **A different Chrome.** A Chrome that changes its text rasteriser will move every glyph
  edge and fail everything at once. That is a re-bless, not a regression, and the workflow
  logs the version so you can tell which it was.
