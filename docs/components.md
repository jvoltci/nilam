# Components

```css
@import 'nilam/components.css';   /* the .n-* layer */
@import 'nilam/widgets.css';      /* combobox + slider + range, needs nilam/behaviours */
```

Every example on this page is real markup, rendered by the stylesheet npm publishes. If a
demo looks wrong here it is wrong in your app.

## The scope, stated honestly

This does not compete with Radix or React Aria on breadth and it never will. React Aria is
years of screen-reader, touch and IME work by a team; a stylesheet cannot contain that.

What a stylesheet *can* do in 2026 is much more than it could in 2020, because the platform
grew the hard parts:

| Component | Built on | So nilam ships |
|---|---|---|
| `.n-dialog` | `<dialog>` + `showModal()` | no focus-trap library |
| `.n-pop`, `.n-menu` | Popover API + CSS anchor positioning | no positioning library |
| `.n-tip` | `popover="hint"` | nothing extra |
| `.n-accordion` | `<details name>` | no state at all |
| `.n-textarea` | `field-sizing: content` | no scroll-height listener |
| `.n-field` | `:has()` | no wrapper class toggled by JS |

**Deliberately absent:** date picker, rich text, virtualised table, tree, drag-and-drop.
Each needs a real state machine and, more to the point, real assistive-technology testing to
be worth shipping.

## The rule every status component follows

The prover measures which status colours collapse under each dichromacy and reports that at
hue 285, `danger`/`warn`, `danger`/`ok` and `warn`/`ok` all become indistinguishable to a
deuteranope. So **every status component here carries a glyph as well as a hue**, and
`proveStatusChannels()` fails the build if one does not.

WCAG 1.4.1 has required this for years. [Colour blindness](colour-blindness.md) has the
measurements.

---

## Buttons

<div class="nd-demo">
  <p class="nd-label">variants</p>
  <div class="nd-row">
    <button class="n-btn n-btn-fill" type="button">Primary</button>
    <button class="n-btn" type="button">Secondary</button>
    <button class="n-btn n-btn-ink" type="button">Ink</button>
    <button class="n-btn n-btn-ghost" type="button">Ghost</button>
    <button class="n-btn n-btn-danger" type="button">Delete</button>
    <button class="n-btn" type="button" disabled>Disabled</button>
  </div>
  <p class="nd-label">sizes, icon-only, and an anchor</p>
  <div class="nd-row">
    <button class="n-btn n-btn-sm" type="button">Small</button>
    <button class="n-btn" type="button">Default</button>
    <button class="n-btn n-btn-lg n-btn-fill" type="button">Large</button>
    <button class="n-btn n-btn-icon" type="button" aria-label="Add">+</button>
    <button class="n-btn n-btn-icon n-btn-sm" type="button" aria-label="Close">×</button>
    <a class="n-btn n-btn-fill" href="https://github.com/jvoltci/nilam">An anchor</a>
  </div>
  <p class="nd-label">loading — aria-busy, on every variant</p>
  <div class="nd-row">
    <button class="n-btn n-btn-fill" type="button" aria-busy="true">Saving</button>
    <button class="n-btn" type="button" aria-busy="true">Saving</button>
    <button class="n-btn n-btn-ghost" type="button" aria-busy="true">Saving</button>
    <button class="n-btn n-btn-ink" type="button" aria-busy="true">Saving</button>
    <button class="n-btn n-btn-danger" type="button" aria-busy="true">Deleting</button>
  </div>
</div>

```html
<button class="n-btn n-btn-fill">Primary</button>
<button class="n-btn">Secondary</button>
<button class="n-btn n-btn-ink">Ink</button>
<button class="n-btn n-btn-ghost">Ghost</button>
<button class="n-btn n-btn-danger">Delete</button>
<button class="n-btn n-btn-icon" aria-label="Add">+</button>
<button class="n-btn n-btn-fill" aria-busy="true">Saving</button>
```

Four things here are decisions rather than styling.

**Disabled does not use opacity.** Fading a button fades its label too and drops it below
4.5:1 — the most common accessibility bug in every component library checked. Disabled is
expressed with `--neutral-2` / `--neutral-6` / `--neutral-11`, which are all still legible.
It covers `:disabled` and `[aria-disabled="true"]`, because `:disabled` does not match an
anchor and frameworks disagree about which they set.

**The pointer target is 44px and the painted box is 36px.** WCAG 2.5.8 wants 44; a 44px-tall
button looks chunky. The shortfall is made up by a transparent `::after`, so the target is
compliant and layout is untouched.

**The busy label goes transparent rather than being removed**, so the button keeps its width
and the row does not reflow when it starts loading.

**The busy spinner names its own colour per variant.** The first version set `color` to
`--brand-ink` on the base rule, which is near-white in light mode — so a ghost button's
spinner was white on a transparent background and simply invisible.

## Loaders

Five classes, but four questions — `.n-dots` says the same thing as `.n-spinner`, just
lighter, for an inline "thinking" state where a full ring is too heavy. Substituting one
loader for another is a real usability error.

| | Says | Use when |
|---|---|---|
| `.n-spinner` | something is happening | duration unknown, inline, small |
| `.n-progress` | this much is done | you know the proportion — it is a real `<progress>` |
| `.n-bar` | something is happening | duration unknown, page or panel width |
| `.n-skeleton` | content shaped like *this* is coming | the shape is predictable |

<div class="nd-demo">
  <div class="nd-grid">
    <div class="n-card n-card-pad">
      <p class="nd-label">spinner — sm, default, lg, xl</p>
      <div class="nd-row" style="gap:var(--space-4)">
        <span class="n-spinner n-spinner-sm"></span>
        <span class="n-spinner"></span>
        <span class="n-spinner n-spinner-lg"></span>
        <span class="n-spinner n-spinner-xl"></span>
      </div>
      <p class="nd-label">with a status wrapper</p>
      <span class="n-loading" role="status"><span class="n-spinner n-spinner-sm"></span>Checking your card…</span>
      <p class="nd-label">dots</p>
      <span class="n-loading" role="status"><span class="n-dots"><i></i><i></i><i></i></span>Generating</span>
      <p class="nd-label">still running after 10s</p>
      <div class="n-loading" role="status">
        <span class="n-spinner"></span>
        <span>Loading…</span>
        <span class="n-slow">Still working — larger than usual.</span>
      </div>
    </div>
    <div class="n-card n-card-pad">
      <p class="nd-label">progress</p>
      <progress class="n-progress" value="0.62" max="1">62%</progress>
      <p class="nd-label">bar</p>
      <div class="n-bar" role="progressbar" aria-label="Loading"></div>
      <p class="nd-label">skeleton</p>
      <div class="nd-stack" style="gap:var(--space-2)">
        <div class="n-skeleton" style="block-size:1.25rem;inline-size:40%"></div>
        <div class="n-skeleton" style="block-size:0.875rem"></div>
        <div class="n-skeleton" style="block-size:0.875rem;inline-size:70%"></div>
      </div>
    </div>
  </div>
</div>

```html
<span class="n-spinner n-spinner-sm"></span>
<span class="n-spinner n-spinner-xl"></span>
<span class="n-loading" role="status">
  <span class="n-spinner n-spinner-sm"></span>Checking your card…
</span>
<span class="n-dots"><i></i><i></i><i></i></span>

<progress class="n-progress" value="0.62" max="1">62%</progress>
<div class="n-bar" role="progressbar" aria-label="Loading"></div>
<div class="n-skeleton" style="block-size:1.25rem;inline-size:40%"></div>

<!-- the optional 10s message -->
<div class="n-loading" role="status">
  <span class="n-spinner"></span>
  <span>Loading…</span>
  <span class="n-slow">Still working — larger than usual.</span>
</div>
```

Prefer the skeleton wherever the shape is predictable. A spinner tells the reader nothing
about what is arriving; a skeleton tells them where to look when it does.

`.n-loading` carries `role="status"`, which has an implicit `aria-live="polite"`, so the
text inside is announced once without interrupting. The visible loader beside it is
decorative — which is why the examples pair them.

!!! note "Loaders keep moving under `prefers-reduced-motion`"

    The base layer's blanket rule sets `animation-duration: 0.01ms` on everything, and for a
    loader that is actively harmful: a **frozen spinner does not read as reduced motion, it
    reads as a hung app.** The reader loses the only signal that anything is still
    happening.

    WCAG 2.3.3 governs *non-essential* animation, and a loading indicator is essential by
    definition, so an exemption is correct rather than a loophole. What these keep is the one
    property that carries the signal — **opacity**, which moves nothing across the screen and
    does not trigger vestibular symptoms. The travelling bar becomes a pulse in place; the
    spinner stops rotating and breathes instead.

### One clock, one ramp

All five loaders are generated from two rules rather than styled one at a time.

**The clock.** Every loader moves on a **100ms tick** — `--dur-tick` — and completes a cycle
in **twelve ticks**, `--dur-cycle: 1.2s`. 100ms is [Miller's instantaneity
limit](https://dl.acm.org/doi/10.1145/1476589.1476628), the interval below which people stop
perceiving discrete events as separate; twelve is the scale, the same count every colour
family has. `.n-bar`, `.n-dots` and `.n-skeleton` all repeat on this cycle too, so five
different shapes read as siblings instead of five unrelated widgets.

**The ramp.** `--loader-1` through `--loader-12` are the twelve solved brand steps,
reordered — separately per mode — by their measured contrast against the page (`--neutral-1`,
never `--brand-1`: nothing is ever painted on the brand-tinted page, so measuring against it
would score a ground that does not exist), strongest first. `--loader-1` is the head of the
trail and the only step the build requires to clear 3:1, against both the page and a card.
The rest of the ring fades toward `--loader-12` because steps 1–3 of the brand scale genuinely
are that quiet against the page — the fade is not an opacity trick laid on top of one colour.
Change the hue and the whole ramp is re-solved; a hand-written order would silently go stale
for any hue but the one it was written against.

**`.n-spinner-xl` is the fourth size, and the only one where the ramp reads as steps.** At
the default 18px each sector is around 3.8px of arc — it renders and the rotation reads, but
the ring looks like one continuous fade. At 4rem it is about 6px, and the banding becomes
visible. Stated honestly: you can see that the fade is stepped, not that there are exactly
twelve of them — counting the sectors would need a size no inline loader should ever be.
`-xl` also adds a second ring behind the mask, counter-rotating over three cycles so the two
layers drift against each other rather than locking in step.

**The filled button has no ramp to draw from.** `.n-btn[aria-busy]`'s ring and
`.n-spinner-on-fill` both sit on `--brand-9`, where the whole brand family is invisible, so
there is no twelve-step sequence to order. Both are drawn from `--brand-ink` instead, fading
from full strength to roughly 8% — stop *N* at `100 − (N−1) × 100⁄12` percent. Even spacing
here is a **stated rule, not a solved value**: it is the one number in the loaders that was
picked rather than computed. Recorded plainly rather than smoothed over, because on this
project the honesty is the point.

### Elapsed time, with no JavaScript

`.n-spinner` and `.n-bar` visibly change state as a wait goes on, using nothing but a second
animation and a delay:

| Elapsed | Reads as | Mechanism |
|---|---|---|
| 0 – 1.2s | quiet | `n-wake` fades in once; a request that resolves in 300ms gets a faint indicator that never brightens, not a full-strength flash |
| 1.2s+ | present | `n-wake` has finished — one full revolution at full contrast |
| 10s+ | still running | a slower, 2.4s breath (`n-persist`), plus the optional `.n-slow` message |

```html
<div class="n-loading" role="status">
  <span class="n-spinner"></span>
  <span>Loading…</span>
  <span class="n-slow">Still working — larger than usual.</span>
</div>
```

`.n-slow` is optional — leave it out and nothing extra happens, nothing breaks. It sits at
`visibility: hidden; opacity: 0` for ten seconds, then reveals itself. `.n-dots` and
`.n-skeleton` repeat on the same clock but do not carry this quiet/present/persist arc — only
`.n-spinner` and `.n-bar` do.

`.n-progress` gets **none of this**. It is determinate — its length is already the
information a reader wants, and fading a real number in and out would only make it harder to
read.

!!! warning "The 10s message: the reveal works, the announcement is unverified"

    `.n-slow` reliably goes from invisible to visible at ten seconds in every browser; that
    part needs nothing more than CSS. Whether a screen reader **announces** it is a separate
    question, and **it has not been tested with one**. The theory is that `visibility: hidden`
    keeps the text out of the accessibility tree and restoring it inside `.n-loading`'s
    `role="status"` triggers the implicit `aria-live="polite"` announcement — but that is a
    belief about live-region behaviour, not a checked fact. Do not rely on the announcement
    until someone has run VoiceOver, NVDA or JAWS against it. The visual reveal stands on its
    own either way.

## Fields

<div class="nd-demo">
  <div class="nd-grid">
    <div class="nd-stack">
      <div class="n-field">
        <label class="n-label" data-required for="d-email">Billing email</label>
        <input class="n-input" id="d-email" type="email" placeholder="you@example.com" required aria-describedby="d-email-hint">
        <p class="n-hint" id="d-email-hint">We only use this for receipts.</p>
      </div>
      <div class="n-field">
        <label class="n-label" for="d-plan">Plan</label>
        <select class="n-select" id="d-plan">
          <option>Starter</option><option selected>Pro</option><option>Enterprise</option>
        </select>
      </div>
      <div class="n-field">
        <label class="n-label" for="d-notes">Notes</label>
        <textarea class="n-textarea" id="d-notes" placeholder="Grows as you type…"></textarea>
      </div>
      <div class="n-field">
        <label class="n-label" for="d-bad">With an error</label>
        <input class="n-input" id="d-bad" value="not-an-email" type="email" aria-describedby="d-bad-err">
        <p class="n-error" id="d-bad-err">Enter a valid email address.</p>
      </div>
    </div>
    <div class="nd-stack">
      <p class="nd-label">checkbox — including the tri-state</p>
      <label class="n-choice"><input class="n-check" type="checkbox" checked> Checked</label>
      <label class="n-choice"><input class="n-check" type="checkbox" data-nd-indeterminate> Indeterminate</label>
      <label class="n-choice"><input class="n-check" type="checkbox"> Unchecked</label>
      <label class="n-choice"><input class="n-check" type="checkbox" disabled> Disabled</label>
      <hr class="n-divider">
      <label class="n-choice"><input class="n-radio" type="radio" name="d-billing" checked> Monthly</label>
      <label class="n-choice"><input class="n-radio" type="radio" name="d-billing"> Yearly</label>
      <hr class="n-divider">
      <label class="n-choice"><input class="n-switch" type="checkbox" checked> Email notifications</label>
      <label class="n-choice"><input class="n-switch" type="checkbox"> Weekly digest</label>
    </div>
  </div>
</div>

```html
<div class="n-field">
  <label class="n-label" data-required for="email">Billing email</label>
  <input class="n-input" id="email" type="email" required aria-describedby="hint">
  <p class="n-hint" id="hint">We only use this for receipts.</p>
</div>

<p class="n-error">Enter a valid email address.</p>

<label class="n-choice"><input class="n-check" type="checkbox" checked> Checked</label>
<label class="n-choice"><input class="n-radio" type="radio" name="billing"> Yearly</label>
<label class="n-choice"><input class="n-switch" type="checkbox"> Weekly digest</label>
```

**Placeholders are step 11, not a lighter grey.** Placeholder text is text and 1.4.3 applies
to it; most systems ship placeholders around 2.5:1.

**Invalid uses `:user-invalid`, not `:invalid`.** `:invalid` paints an empty required field
red before it has been touched, which is hostile. `:user-invalid` waits until the user has
finished.

**`--danger-8` for the invalid border, and `.n-error` carries a `⚠` glyph.** Danger is one of
the colours the prover says collapses, so colour alone is not allowed to carry "this is
wrong".

**The select arrow is drawn in `currentColor`.** A hard-coded SVG fill is the usual approach
and it is invisible in dark mode.

**The required marker is a hue *and* a glyph** (` *`), and the input's own `required` is what
assistive technology reads.

`.n-check:indeterminate` is a real tri-state that most libraries forget. It has no HTML
attribute — it is a DOM property — which is why the demo above needs one line of JavaScript
to show it.

## Cards

<div class="nd-demo">
  <div class="nd-grid">
    <div class="n-card n-card-pad">
      <p style="font-weight:var(--weight-semibold)">Default</p>
      <p style="color:var(--neutral-11);font-size:var(--text-0)">--surface, a hairline, --shadow-1 and --rim.</p>
    </div>
    <div class="n-card n-card-pad n-card-float">
      <p style="font-weight:var(--weight-semibold)">Floating</p>
      <p style="color:var(--neutral-11);font-size:var(--text-0)">--shadow-2 instead.</p>
    </div>
    <a class="n-card n-card-pad n-card-link" href="https://github.com/jvoltci/nilam">
      <p style="font-weight:var(--weight-semibold)">A link card</p>
      <p style="color:var(--neutral-11);font-size:var(--text-0)">Lifts 2px and escalates to --shadow-3 on hover.</p>
    </a>
  </div>
</div>

```html
<div class="n-card n-card-pad">…</div>
<div class="n-card n-card-pad n-card-float">…</div>
<a class="n-card n-card-pad n-card-link" href="/thing">…</a>
```

The background is `--surface`, not `--neutral-1`. In light mode the page is tinted and the
card is pure white; the tint reads as light because the card beside it has none. See
[the untinted card surface](palette.md#the-untinted-card-surface).

## Badges

<div class="nd-demo">
  <div class="nd-row">
    <span class="n-badge n-badge-brand"><i class="n-badge-glyph">◆</i>Pro</span>
    <span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
    <span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span>
    <span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span>
    <span class="n-badge n-badge-info"><i class="n-badge-glyph">i</i>Trial</span>
    <span class="n-badge">Neutral</span>
  </div>
</div>

```html
<span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span>
<span class="n-badge">Neutral</span>
```

Step 3 for the fill, step 6 for the border, step 11 for the text, step 9 + ink for the
glyph. Four roles, four steps, and each one is the step whose contract matches the job.

## Notes

<div class="nd-demo">
  <div class="nd-stack" style="gap:var(--space-2)">
    <div class="n-note n-note-ok"><span class="n-note-glyph">✓</span><div><span class="n-note-title">Payment received.</span> Your next invoice is on 1 September.</div></div>
    <div class="n-note n-note-info"><span class="n-note-glyph">i</span><div><span class="n-note-title">Info carries no hue at all.</span> The state that means nothing is wrong does not need one — and spending a hue on it collided with the brand.</div></div>
    <div class="n-note n-note-warn"><span class="n-note-glyph">!</span><div><span class="n-note-title">Card expires next month.</span> Update it before 1 September.</div></div>
    <div class="n-note n-note-danger"><span class="n-note-glyph">×</span><div><span class="n-note-title">Last charge failed.</span> The bank declined the transaction.</div></div>
    <div class="n-note"><span class="n-note-glyph" style="background:var(--neutral-9);color:var(--neutral-ink)">·</span><div><span class="n-note-title">Neutral.</span> No variant class.</div></div>
  </div>
</div>

```html
<div class="n-note n-note-warn">
  <span class="n-note-glyph">!</span>
  <div><span class="n-note-title">Card expires next month.</span> Update it before 1 September.</div>
</div>
```

The glyph is `1.25rem`, round, filled with step 9 and inked with `--<family>-ink`. Its
`margin-block-start: 0.0625rem` is optical alignment with the first line of body text rather
than with the top of the box.

## Tables

<div class="nd-demo">
  <div class="n-card n-card-pad">
    <div class="n-table-scroll" tabindex="0">
      <table class="n-table">
        <thead><tr><th>Account</th><th>Owner</th><th>Status</th><th style="text-align:end">MRR</th></tr></thead>
        <tbody>
          <tr><td class="n-table-key">Northwind</td><td><span class="n-avatar n-avatar-sm">NW</span></td><td><span class="n-badge n-badge-ok"><i class="n-badge-glyph">✓</i>Active</span></td><td class="n-table-num">£4,200</td></tr>
          <tr><td class="n-table-key">Contoso</td><td><span class="n-avatar n-avatar-sm">CO</span></td><td><span class="n-badge n-badge-warn"><i class="n-badge-glyph">!</i>Expiring</span></td><td class="n-table-num">£2,750</td></tr>
          <tr><td class="n-table-key">Initech</td><td><span class="n-avatar n-avatar-sm">IN</span></td><td><span class="n-badge n-badge-danger"><i class="n-badge-glyph">×</i>Failed</span></td><td class="n-table-num">£1,980</td></tr>
          <tr><td class="n-table-key">Umbrella</td><td><span class="n-avatar n-avatar-sm">UM</span></td><td><span class="n-badge n-badge-info"><i class="n-badge-glyph">i</i>Trial</span></td><td class="n-table-num">£0</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

```html
<div class="n-table-scroll" tabindex="0">
  <table class="n-table">
    <thead><tr><th>Account</th><th class="n-table-num">MRR</th></tr></thead>
    <tbody>
      <tr><td class="n-table-key">Northwind</td><td class="n-table-num">£4,200</td></tr>
    </tbody>
  </table>
</div>
```

`th` gets the label treatment — mono, uppercase, `--tracking-micro` — and a step-7 rule
under it, while rows are divided by step 6. The head is a stronger boundary than a row
division, and using one weight for both is exactly why default tables read as a grid of
boxes.

`.n-table-num` gives `tabular-nums`. Nothing else makes a table look as unfinished as
proportional digits in a column.

`tabindex="0"` on the scroll wrapper is a real 2.1.1 requirement that people miss: a
scrollable region has to be scrollable by keyboard.

## Avatars

<div class="nd-demo">
  <div class="nd-row">
    <span class="n-avatar n-avatar-sm">SM</span>
    <span class="n-avatar">MD</span>
    <span class="n-avatar n-avatar-lg">LG</span>
  </div>
</div>

```html
<span class="n-avatar">MD</span>
<span class="n-avatar n-avatar-lg"><img src="…" alt="Ada Lovelace"></span>
```

## Meters

<div class="nd-demo">
  <p class="nd-label">brand, ok, warn, danger</p>
  <div class="nd-stack" style="gap:var(--space-3)">
    <div class="n-meter"><div class="n-meter-fill" style="inline-size:78%"></div></div>
    <div class="n-meter n-meter-ok"><div class="n-meter-fill" style="inline-size:62%"></div></div>
    <div class="n-meter n-meter-warn"><div class="n-meter-fill" style="inline-size:41%"></div></div>
    <div class="n-meter n-meter-danger"><div class="n-meter-fill" style="inline-size:18%"></div></div>
  </div>
</div>

```html
<div class="n-meter"><div class="n-meter-fill" style="inline-size:78%"></div></div>
<div class="n-meter n-meter-ok"><div class="n-meter-fill" style="inline-size:62%"></div></div>
```

A plain `div`, because a meter is often a *proportion of a whole* rather than task progress.
Add `role="progressbar"` and `aria-valuenow` yourself when it genuinely is one — or use
`.n-progress`, which is a real `<progress>` and puts the value in the accessibility tree for
free.

## Dialog

Native `<dialog>` with `showModal()`. That one call buys the focus trap, `Esc` to close, an
`inert` background and `::backdrop` — so there is no focus-trap library here.

<div class="nd-demo">
  <p class="nd-label">the real thing — modal, Esc closes it</p>
  <div class="nd-row">
    <button class="n-btn n-btn-fill" type="button" data-nd-dialog="d-dialog">Open dialog</button>
  </div>
  <dialog class="n-dialog" id="d-dialog">
    <form method="dialog">
      <div class="n-dialog-head"><h3 class="n-dialog-title">Delete workspace</h3></div>
      <div class="n-dialog-body">
        <p style="color:var(--neutral-11);font-size:var(--text-0)">This removes every project and cannot be undone. Type the workspace name to confirm.</p>
        <div class="n-field" style="margin-block-start:var(--space-4)">
          <label class="n-label" for="d-confirm">Workspace name</label>
          <input class="n-input" id="d-confirm" placeholder="acme-production">
        </div>
      </div>
      <div class="n-dialog-foot">
        <button class="n-btn" value="cancel">Cancel</button>
        <button class="n-btn n-btn-danger" value="delete">Delete for ever</button>
      </div>
    </form>
  </dialog>
  <p class="nd-label">the same markup, pinned into the page so it is visible here</p>
  <dialog class="n-dialog nd-static-dialog" open>
    <form method="dialog">
      <div class="n-dialog-head"><h3 class="n-dialog-title">Delete workspace</h3></div>
      <div class="n-dialog-body">
        <p style="color:var(--neutral-11);font-size:var(--text-0)">This removes every project and cannot be undone.</p>
      </div>
      <div class="n-dialog-foot">
        <button class="n-btn" type="button">Cancel</button>
        <button class="n-btn n-btn-danger" type="button">Delete for ever</button>
      </div>
    </form>
  </dialog>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The second one is <code>&lt;dialog open&gt;</code>, which is <b>non-modal</b>: no focus trap, no Esc, no inert background. Two CSS lines pin it into the flow. It is here for the screenshot; use <code>showModal()</code>.</p>
</div>

```html
<button class="n-btn n-btn-fill" onclick="document.getElementById('d').showModal()">
  Open dialog
</button>

<dialog class="n-dialog" id="d">
  <form method="dialog">
    <div class="n-dialog-head"><h3 class="n-dialog-title">Delete workspace</h3></div>
    <div class="n-dialog-body">…</div>
    <div class="n-dialog-foot">
      <button class="n-btn" value="cancel">Cancel</button>
      <button class="n-btn n-btn-danger" value="delete">Delete for ever</button>
    </div>
  </form>
</dialog>
```

The enter and exit animation needs three separate features and missing any one of them
silently kills the exit: `transition-behavior: allow-discrete` to animate `display` at all,
`@starting-style` for the entry values, and `overlay` so the element stays in the top layer
while it leaves.

There is no `z-index` on `.n-dialog`. The top layer already handles stacking, and no
`z-index` can reach into it.

## Popover, menu and tooltip

<div class="nd-demo">
  <p class="nd-label">real popovers — no JavaScript, no positioning library</p>
  <div class="nd-row">
    <button class="n-btn" type="button" popovertarget="d-menu">Actions ▾</button>
    <div class="n-pop n-menu" popover id="d-menu">
      <button class="n-menu-item" type="button">Duplicate</button>
      <button class="n-menu-item" type="button">Move to…</button>
      <button class="n-menu-item" type="button">Export as CSV</button>
      <div class="n-menu-sep"></div>
      <button class="n-menu-item n-menu-item-danger" type="button">Delete</button>
    </div>
    <button class="n-btn" type="button" popovertarget="d-tip" popovertargetaction="toggle">Tooltip</button>
    <div class="n-tip" popover id="d-tip">Positioned by CSS, not by JavaScript.</div>
  </div>
  <p class="nd-label">the same menu, pinned open so it is visible here</p>
  <div class="n-pop n-menu nd-static-pop" style="position:static">
    <button class="n-menu-item" type="button">Duplicate</button>
    <button class="n-menu-item" type="button">Move to…</button>
    <div class="n-menu-sep"></div>
    <button class="n-menu-item n-menu-item-danger" type="button">Delete</button>
  </div>
</div>

```html
<button class="n-btn" popovertarget="m">Actions ▾</button>
<div class="n-pop n-menu" popover id="m">
  <button class="n-menu-item">Duplicate</button>
  <div class="n-menu-sep"></div>
  <button class="n-menu-item n-menu-item-danger">Delete</button>
</div>

<button class="n-btn" popovertarget="t" popovertargetaction="toggle">Tooltip</button>
<div class="n-tip" popover id="t">Positioned by CSS, not by JavaScript.</div>
```

A popover opened by `popovertarget` gets an **implicit anchor reference** to the button that
opened it. So `position-area: block-end span-inline-start` positions it against its own
trigger with no `anchor-name` anywhere and no Floating UI, and
`position-try-fallbacks: flip-block, flip-inline` handles running out of viewport.

`.n-tip` uses `popover="hint"`, which is the right type: a hint does not close other
popovers and does not take focus. Where `hint` is unsupported it falls back to a plain
popover.

Arrow keys, typeahead and focus restoration on the menu come from
[`nilam/behaviours`](behaviours.md#menu). The opening, the light dismiss and `Esc` are the
platform's.

## Accordion

<div class="nd-demo">
  <div class="n-accordion">
    <details name="d-faq" open>
      <summary class="n-summary">Why is <code>info</code> achromatic?</summary>
      <div class="n-accordion-body">Because the brand took that region of hue space. With a violet brand at 285, the best blue available was 0.052 from it under deuteranopia — the same colour to that reader. Info means "nothing is wrong", so it does not need to shout.</div>
    </details>
    <details name="d-faq">
      <summary class="n-summary">Why is step 9 different in each mode?</summary>
      <div class="n-accordion-body">A filled button inverts the polarity of its page. Dark object with light text on a light page; light object with dark text on a dark one.</div>
    </details>
    <details name="d-faq">
      <summary class="n-summary">What is not derived?</summary>
      <div class="n-accordion-body"><code>GLOW_L = 0.66</code>. Four derivations were tried and none produce it. It is measured off Zima Blue and an accent that works.</div>
    </details>
  </div>
</div>

```html
<div class="n-accordion">
  <details name="faq" open>
    <summary class="n-summary">Why is info achromatic?</summary>
    <div class="n-accordion-body">…</div>
  </details>
  <details name="faq">…</details>
</div>
```

`<details name>` makes the group **exclusive** — opening one closes the others — with no
JavaScript and no state to manage.

`.n-summary` is `display: block` with the chevron absolutely positioned, and that is a bug
fix rather than a preference. Flex with `space-between` is the obvious way to push a marker
to the end, and flex turns every text node *and* every inline element into a separate flex
item: the summary above, which contains a `<code>`, came out as three items spread across
the full width with gaps in the middle of the sentence.

## Tabs

<div class="nd-demo">
  <div class="n-tabs" role="tablist">
    <button class="n-tab" role="tab" type="button" aria-selected="true" aria-controls="d-p1" id="d-t1">Overview</button>
    <button class="n-tab" role="tab" type="button" aria-selected="false" aria-controls="d-p2" id="d-t2">Usage</button>
    <button class="n-tab" role="tab" type="button" aria-selected="false" aria-controls="d-p3" id="d-t3">Billing</button>
  </div>
  <div id="d-p1" role="tabpanel" aria-labelledby="d-t1" style="padding-block-start:var(--space-4)">
    <p style="font-size:var(--text-0)">Arrow keys move between tabs. Home and End jump to the ends.</p>
  </div>
  <div id="d-p2" role="tabpanel" aria-labelledby="d-t2" style="padding-block-start:var(--space-4)" hidden>
    <p style="font-size:var(--text-0)">Activation is automatic by default: arrowing to a tab selects it.</p>
  </div>
  <div id="d-p3" role="tabpanel" aria-labelledby="d-t3" style="padding-block-start:var(--space-4)" hidden>
    <p style="font-size:var(--text-0)">Pass <code>{ manual: true }</code> when a panel does real work.</p>
  </div>
</div>

```html
<div class="n-tabs" role="tablist">
  <button class="n-tab" role="tab" aria-selected="true"  aria-controls="p1" id="t1">Overview</button>
  <button class="n-tab" role="tab" aria-selected="false" aria-controls="p2" id="t2">Usage</button>
</div>
<div id="p1" role="tabpanel" aria-labelledby="t1">…</div>
<div id="p2" role="tabpanel" aria-labelledby="t2" hidden>…</div>
```

`aria-selected` is the state, and the CSS selects on it. There is no active class. **If the
markup is not accessible, the styling does not apply** — a useful forcing function.

## Combobox

The one genuinely missing widget: nothing native does it. It needs
[`nilam/behaviours`](behaviours.md#combobox) and `nilam/widgets.css`.

<div class="nd-demo">
  <p class="nd-label">editable — filters as you type</p>
  <div class="n-combobox">
    <div class="n-field">
      <label class="n-label" for="d-combo">Plan</label>
      <input class="n-input" id="d-combo" role="combobox" aria-autocomplete="list" placeholder="Type to filter…">
    </div>
    <ul class="n-listbox" role="listbox" aria-label="Plans">
      <li class="n-option" role="option">Starter</li>
      <li class="n-option" role="option" aria-selected="true">Pro</li>
      <li class="n-option" role="option">Business</li>
      <li class="n-option" role="option" aria-disabled="true">Enterprise — contact sales</li>
    </ul>
    <p class="n-combobox-status" role="status"></p>
  </div>
  <p class="nd-label">select-only — a div, behaving like &lt;select size="1"&gt;</p>
  <div class="n-combobox">
    <div class="n-input n-combobox-value" role="combobox" tabindex="0">Pro</div>
    <ul class="n-listbox" role="listbox" aria-label="Plans">
      <li class="n-option" role="option">Starter</li>
      <li class="n-option" role="option" aria-selected="true">Pro</li>
      <li class="n-option" role="option">Business</li>
    </ul>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Click or press <kbd>↓</kbd> to open either one. Focus never leaves the input.</p>
</div>

```html
<div class="n-combobox">
  <input class="n-input" role="combobox" aria-autocomplete="list">
  <ul class="n-listbox" role="listbox" aria-label="Plans">
    <li class="n-option" role="option">Starter</li>
    <li class="n-option" role="option" aria-selected="true">Pro</li>
    <li class="n-option" role="option" aria-disabled="true">Enterprise</li>
  </ul>
  <p class="n-combobox-status" role="status"></p>
</div>
```

Two states that are **not** the same thing, and conflating them is the commonest combobox
bug there is:

| | Means | Moves on |
|---|---|---|
| `[data-current]` | where the arrow keys are — the visual twin of `aria-activedescendant` | every keypress |
| `[aria-selected="true"]` | the value actually committed | `Enter` |

They get different weights, because during arrowing both are on screen at once and the user
has to tell "I am looking at this" from "I chose this". `[data-current]` gets an inset bar as
well as a background, because the gap between `--neutral-3` and `--neutral-4` is one contrast
step *by construction* and one step cannot carry "this is the cursor" alone. Selection gets a
`✓`, for the same 1.4.1 reason every status carries a glyph.

The listbox is a plain absolutely-positioned element, **not** a `[popover]`, and that has a
cost worth naming: an ancestor with `overflow: hidden` will clip it. A popover would get the
top layer for free, but `popover="auto"` light-dismisses on the first outside pointer-down —
which for a combobox includes clicking back into its own input — and the whole focus design
is that DOM focus never leaves the input.

## Slider

Also needs `nilam/behaviours` and `nilam/widgets.css`.

!!! warning "Use `<input type="range">` unless you cannot"

    A native range input already has every key below, works with touch assistive technology,
    submits with a form and needs no JavaScript. This exists for the two cases it cannot
    cover: a value that must be **spoken** differently from how it is stored ("£1,200 per
    month", "2 minutes 14 seconds" — that is `aria-valuetext`, and `<input type="range">` has
    no equivalent), and a track you need to decorate beyond what
    `::-webkit-slider-thumb` will let you reach.

    The APG attaches a standing warning to every slider example, and it is not theoretical:
    some users of touch-based assistive technology cannot operate this pattern, because the
    gestures their AT provides may not generate the necessary output. Nothing here fixes
    that.

<div class="nd-demo">
  <p class="nd-label">horizontal</p>
  <div class="nd-row">
    <div class="n-slider" style="max-inline-size:20rem">
      <div class="n-slider-track"><div class="n-slider-fill"></div></div>
      <div class="n-slider-thumb" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"></div>
    </div>
    <span class="n-slider-value">40</span>
  </div>
  <p class="nd-label">disabled, and vertical</p>
  <div class="nd-row" style="gap:var(--space-6);align-items:flex-end">
    <div class="n-slider" style="max-inline-size:14rem">
      <div class="n-slider-track"><div class="n-slider-fill"></div></div>
      <div class="n-slider-thumb" role="slider" tabindex="0" aria-label="Disabled" aria-disabled="true" aria-valuemin="0" aria-valuemax="100" aria-valuenow="25"></div>
    </div>
    <div class="n-slider">
      <div class="n-slider-track"><div class="n-slider-fill"></div></div>
      <div class="n-slider-thumb" role="slider" tabindex="0" aria-label="Bass" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="65"></div>
    </div>
  </div>
</div>

```html
<div class="n-slider">
  <div class="n-slider-track"><div class="n-slider-fill"></div></div>
  <div class="n-slider-thumb" role="slider" tabindex="0" aria-label="Volume"
       aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"></div>
</div>
<span class="n-slider-value">40</span>
```

The module writes one custom property, `--n-slider-pct`, on the wrapper, and both the fill
and the thumb read it. Nothing in the JavaScript sets `inset-inline-start` or a width — which
is what lets RTL and the vertical variant stay a CSS concern. The vertical variant is
selected by `:has([aria-orientation="vertical"])`, reading the same attribute the module
reads, so the two cannot disagree.

The thumb gets the same 44px `::after` target trick as the button, and `touch-action: none`
on the wrapper — without which a drag on a touch screen scrolls the page instead of moving
the thumb.

## Range

Also needs `nilam/behaviours` and `nilam/widgets.css`. Two thumbs, so there is no native
element at all: `<input type="range">` has exactly one.

<div class="nd-demo">
  <p class="nd-label">horizontal</p>
  <div class="nd-row">
    <div class="n-range" style="max-inline-size:20rem">
      <div class="n-range-track"><div class="n-range-sel"></div></div>
      <div class="n-range-thumb" role="slider" tabindex="0" aria-label="Minimum price" aria-valuemin="0" aria-valuemax="100" aria-valuenow="20"></div>
      <div class="n-range-thumb" role="slider" tabindex="0" aria-label="Maximum price" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"></div>
    </div>
    <span class="n-slider-value">20–60</span>
  </div>
  <p class="nd-label">disabled, and vertical</p>
  <div class="nd-row" style="gap:var(--space-6);align-items:flex-end">
    <div class="n-range" style="max-inline-size:14rem">
      <div class="n-range-track"><div class="n-range-sel"></div></div>
      <div class="n-range-thumb" role="slider" tabindex="0" aria-label="From" aria-disabled="true" aria-valuemin="0" aria-valuemax="100" aria-valuenow="30"></div>
      <div class="n-range-thumb" role="slider" tabindex="0" aria-label="To" aria-disabled="true" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70"></div>
    </div>
    <div class="n-range">
      <div class="n-range-track"><div class="n-range-sel"></div></div>
      <div class="n-range-thumb" role="slider" tabindex="0" aria-label="Low" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="25"></div>
      <div class="n-range-thumb" role="slider" tabindex="0" aria-label="High" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="75"></div>
    </div>
  </div>
</div>

```html
<div class="n-range">
  <div class="n-range-track"><div class="n-range-sel"></div></div>
  <div class="n-range-thumb" role="slider" tabindex="0" aria-label="Minimum price"
       aria-valuemin="0" aria-valuemax="100" aria-valuenow="20"></div>
  <div class="n-range-thumb" role="slider" tabindex="0" aria-label="Maximum price"
       aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"></div>
</div>
```

| Class | What it is |
|---|---|
| `.n-range` | the wrapper. Carries `--n-range-from` and `--n-range-to`, and `touch-action: none` |
| `.n-range-track` | the full extent, `--void` fill inside a `--neutral-7` border |
| `.n-range-sel` | the selected span between the thumbs, `--brand-9` |
| `.n-range-thumb` | one per end. `range.mjs` stamps `data-n-range="from"` / `"to"` on them |

DOM order is the contract: the first thumb is the lower one. The module writes
`data-n-range` from that order, and the CSS positions each thumb off the attribute, so the
stylesheet cannot end up disagreeing with the module about which thumb is which. Vertical
is `:has([aria-orientation="vertical"])`, reading the same attribute the module reads.

**The track's border is not decoration.** A range's fill sits in the *middle* of its track,
so without a boundary both remainders vanish and a user can see the span they picked but
neither end it could reach. Measured on a card: `--neutral-4` is 1.0844:1 in dark mode and
`--neutral-3` is 1.0009:1, against the 3:1 WCAG 1.4.11 asks of a control's extent.
`--neutral-7` is 3.0469:1 in dark and 3.6537:1 in light. The fill is `--void`; the border is
what carries the ratio. `.n-progress`, `.n-bar` and `.n-meter` all work the same way.

The two 44px `::after` targets overlap when the range closes to nothing. That is fine:
`pointerdown` picks the nearer thumb by value, not by hit target, and on an exact tie it
picks the one the clamp still lets move — otherwise a press-and-drag on two piled-up thumbs
would do nothing at all.

See [Behaviours](behaviours.md#range) for the keys, the clamping rule and why each thumb's
`aria-valuemin`/`aria-valuemax` move as the other thumb moves.

## Links

<div class="nd-demo">
  <p>Body text with <a class="n-link" href="https://github.com/jvoltci/nilam">a link that carries the hue</a> in it.</p>
</div>

```html
<a class="n-link" href="/somewhere">a link that carries the hue</a>
```

Step 11 for the text — the 4.5:1 role, because a link *is* text — and step 8 for the
underline, so the line is present but quieter than the word. On hover the underline goes to
`currentColor`.

**The underline stays.** Colour is an addition to the affordance, never a replacement for it
(WCAG 1.4.1), and it is what keeps the link findable for anyone who cannot separate violet
from ink.

## Layout

```html
<div class="n-container">
  <div class="n-stack">…</div>
  <div class="n-cluster">…</div>
  <hr class="n-divider">
</div>
```

| Class | What it does |
|---|---|
| `.n-container` | centred, `max-inline-size: 72rem`, `--space-4` gutters |
| `.n-stack` | vertical flex column, `--space-4` gap |
| `.n-cluster` | horizontal wrap-and-gap row, `--space-2` gap |
| `.n-divider` | a step-6 hairline, no margin of its own |

<div class="nd-demo">
  <p class="nd-label">stack</p>
  <div class="n-stack">
    <div class="n-card n-card-pad">one</div>
    <div class="n-card n-card-pad">two</div>
  </div>
  <p class="nd-label">cluster</p>
  <div class="n-cluster">
    <span class="n-badge">alpha</span><span class="n-badge">beta</span><span class="n-badge">gamma</span>
    <span class="n-badge">delta</span><span class="n-badge">epsilon</span>
  </div>
</div>

## Prose

```html
<article class="n-prose">…rendered markdown…</article>
```

For CMS and markdown output where you do not control the markup and cannot add a class per
element. It is the one place headings get sized, because everywhere else the author decides.

The measure is `--measure`, which is **65ch, not a rem width**. What matters for readability
is characters per line, and `ch` tracks the font, so it stays inside the readable range at
every `--text-*` size. A fixed rem width does not.

`blockquote` gets a step-8 brand rail: the one flash of hue in a wall of text, at exactly the
place a reader's eye should be pulled.

## Keyboard hints

<div class="nd-demo">
  <p style="font-size:var(--text-0)">Press <span class="n-kbd">I</span> to set the in point, <span class="n-kbd">O</span> for out, and <span class="n-kbd">Ctrl</span><span class="n-kbd">S</span> to export.</p>
</div>

```html
Press <span class="n-kbd">I</span> to set the in point.
```

`nilam.base.css` already gives `code, kbd, samp, pre` the mono face, and that is *all* it
gives them — so `<kbd>I</kbd>` and `<code>I</code>` rendered identically for five releases,
including on this site's own [Behaviours](behaviours.md) page. "Press I" and "the value I"
are different claims and they should not look the same.

Use the class, not the bare element. Styling `kbd` directly would be nilam deciding how your
prose looks; a class is opt-in.

The border is not decoration. `--neutral-3` is **1.0009:1** on a card in dark mode, so a
background alone would have shipped the very non-distinction this exists to fix. The
`--neutral-7` edge at 3.0469:1 is what makes it read as a key, and the heavier bottom edge is
the key travel — one border-width rather than a blurred shadow, so it survives
`forced-colors` and printing.

Write a combination as separate elements; `.n-kbd + .n-kbd` handles the gap.

## Numbers

```html
<span class="n-num">1,284</span> requests · <span class="n-num">99.98%</span> uptime
```

`.n-num` is `font-variant-numeric: tabular-nums` and nothing else. **No alignment and no
colour** — which is the whole reason it exists separately from [`.n-table-num`](#tables),
which also sets `text-align: end`, `white-space: nowrap` and `--neutral-12` because inside a
table all four belong together. Reaching for `.n-table-num` on a standalone figure imported
two properties you did not ask for.

Why a class rather than Tailwind's `tabular-nums` at each call site: a house rule that every
number which updates gets tabular figures is only enforceable if it has a name. A counter
ticking 9 → 10 reflows the line without it.

## Two utilities that are load-bearing

```html
<a class="n-skip" href="#main">Skip to content</a>
<span class="n-sr-only">, opens in a new tab</span>
```

`.n-sr-only` is the only correct visually-hidden. `display: none` removes the element from
the accessibility tree entirely, and `text-indent: -9999px` breaks RTL and gets announced as
a huge empty box. This one uses `clip-path: inset(50%)` on a 1px box.

`.n-skip` is hidden by `translate: 0 -200%` until `:focus-visible`, then it is a real target
painted in step 9 with its ink. WCAG 2.4.1, and it costs one line.

## Read next

- [Behaviours](behaviours.md) — the keyboard layer for tabs, menu, combobox, slider and range.
- [Tokens](palette.md) — what every step in those class names actually promises.
- [Limitations](limitations.md) — including the fact that none of this has met a screen
  reader.
