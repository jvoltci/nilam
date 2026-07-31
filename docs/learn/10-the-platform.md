# 10 · What the browser now does for free

In 2020, a modal dialog needed a focus-trap library, a tooltip needed a positioning library,
and an accordion needed a state machine. All three are now CSS and HTML.

This chapter is a list of things you can delete.

## The scoreboard

| Behaviour | 2020 | 2026 |
|---|---|---|
| Modal focus trap, `Esc`, background made inert | `focus-trap`, `aria-hidden` juggling | `<dialog>` + `showModal()` |
| Stacking above everything | `z-index: 9999` and hope | the **top layer** |
| Position a menu against its button | Popper, then Floating UI | CSS anchor positioning |
| Light dismiss — click outside to close | a document click listener | the Popover API |
| Exclusive accordion — open one, close the others | React state | `<details name>` |
| Textarea that grows as you type | a `scrollHeight` listener | `field-sizing: content` |
| Style a wrapper from its input's state | a class toggled by JS | `:has()` |
| Two colour modes | a theme provider and two token sets | `light-dark()` |
| Blend two colours at build time | Sass | `color-mix()` |
| Publish overridable CSS | `!important` and prayer | `@layer` |

## `<dialog>` and the top layer

```html
<dialog class="n-dialog" id="d">…</dialog>

<script>
  document.getElementById('d').showModal();
</script>
```

That one call buys four things: a **focus trap** (Tab cannot leave the dialog), **Esc to
close**, the background made **`inert`** so nothing behind it is clickable or reachable by a
screen reader, and a **`::backdrop`** pseudo-element you can style.

<div class="nd-demo">
  <p class="nd-label">a real modal — press Esc to close it</p>
  <div class="nd-row">
    <button class="n-btn n-btn-fill" type="button" data-nd-dialog="l-dialog">Open dialog</button>
  </div>
  <dialog class="n-dialog" id="l-dialog">
    <form method="dialog">
      <div class="n-dialog-head"><h3 class="n-dialog-title">Delete workspace</h3></div>
      <div class="n-dialog-body">
        <p style="color:var(--neutral-11);font-size:var(--text-0)">Tab around. Focus cannot leave this dialog, and the page behind it is inert. No library is doing that.</p>
      </div>
      <div class="n-dialog-foot">
        <button class="n-btn" value="cancel">Cancel</button>
        <button class="n-btn n-btn-danger" value="delete">Delete for ever</button>
      </div>
    </form>
  </dialog>
  <p class="nd-note" style="margin-block-start:var(--space-4)"><code>&lt;dialog open&gt;</code> in markup is <b>not</b> modal: no focus trap, no Esc, no inert background. <code>showModal()</code> is what buys all three, and it is the only difference.</p>
</div>

The **top layer** is a rendering layer above the entire document, and nothing in normal flow can
reach it. Dialogs and popovers live there, which is why `.n-dialog` has **no `z-index` at all**
— there is nothing to compete with. nilam ships only four z-index tokens and notes that three of
them are legacy.

### Animating something that is `display: none`

An entry and exit animation for a dialog needs three separate features, and **missing any one
silently kills the exit**:

```css
transition:
  opacity var(--dur-2) var(--ease-out),
  /* 1. animate display at all */
  display var(--dur-2) allow-discrete,
  /* 3. stay in the top layer while leaving */
  overlay var(--dur-2) allow-discrete;

/* 2. the values to enter FROM */
@starting-style {
  .n-dialog[open] { opacity: 0 }
}
```

Nothing errors if you omit one. The element simply vanishes instead of fading, which is a
difficult bug to find because the entry animation still works.

## The Popover API and anchor positioning

```html
<button class="n-btn" popovertarget="m">Actions ▾</button>
<div class="n-pop n-menu" popover id="m">
  <button class="n-menu-item">Duplicate</button>
  <div class="n-menu-sep"></div>
  <button class="n-menu-item n-menu-item-danger">Delete</button>
</div>
```

No JavaScript at all. The attribute pair gives you the top layer, **light dismiss** (click
outside and it closes), and `Esc`.

Then the part that removes the positioning library. A popover opened by `popovertarget` gets an
**implicit anchor reference** to the button that opened it — so no `anchor-name` is needed on the
trigger, and CSS can position one against the other:

```css
.n-pop {
  /* below the trigger, aligned to its start edge */
  position-area: block-end span-inline-start;
  /* and flip if it runs out of viewport */
  position-try-fallbacks: flip-block, flip-inline;
}
```

`position-try-fallbacks` is the whole reason Floating UI existed: keeping a menu on screen near
the bottom of the window. It is now two words of CSS.

<div class="nd-demo">
  <p class="nd-label">a menu and a tooltip — no JavaScript, no positioning library</p>
  <div class="nd-row">
    <button class="n-btn" type="button" popovertarget="l-menu">Actions ▾</button>
    <div class="n-pop n-menu" popover id="l-menu">
      <button class="n-menu-item" type="button">Duplicate</button>
      <button class="n-menu-item" type="button">Move to…</button>
      <div class="n-menu-sep"></div>
      <button class="n-menu-item n-menu-item-danger" type="button">Delete</button>
    </div>
    <button class="n-btn" type="button" popovertarget="l-tip" popovertargetaction="toggle">Tooltip</button>
    <div class="n-tip" popover id="l-tip">Positioned by CSS, not by JavaScript.</div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Open the menu and click anywhere outside it. That is light dismiss, and it is a browser feature rather than a document-level click listener that has to guess what counts as "outside".</p>
</div>

There are three popover **types** and picking the right one matters:

| | Behaviour |
|---|---|
| `popover="auto"` | light dismiss, and opening one closes any other `auto` popover |
| `popover="hint"` | does **not** close other popovers and does **not** take focus — correct for a tooltip |
| `popover="manual"` | you control it entirely |

nilam's `.n-tip` uses `hint`, which is the reason a tooltip appearing does not shut the menu you
were reading it inside.

## `<details name>` — an accordion with no state

Give several `<details>` elements the same `name` and the browser makes them exclusive: opening
one closes the others. That is the entire accordion.

<div class="nd-demo">
  <p class="nd-label">exclusive accordion, zero JavaScript</p>
  <div class="n-accordion">
    <details name="l-acc" open>
      <summary class="n-summary">Why is <code>info</code> achromatic?</summary>
      <div class="n-accordion-body">Because a blue <code>info</code> collided with the violet brand under deuteranopia at 0.052, and the brand had already taken that region of hue space.</div>
    </details>
    <details name="l-acc">
      <summary class="n-summary">Why does step 9 differ by mode?</summary>
      <div class="n-accordion-body">A filled button inverts the polarity of the page it sits on, so it is a dark object with light text on a light page and a light object with dark text on a dark one.</div>
    </details>
    <details name="l-acc">
      <summary class="n-summary">Why is there one <code>!important</code>?</summary>
      <div class="n-accordion-body">Without it, an author <code>display</code> silently un-hides an element carrying the <code>hidden</code> attribute.</div>
    </details>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Open the second one and the first closes itself. There is no state, no controller and no <code>aria-expanded</code> to keep in sync — <code>&lt;details&gt;</code> already reports its own.</p>
</div>

### Native does not mean free of decisions

That first summary — "Why is `info` achromatic?" — is the example, and it is a real bug that was
fixed rather than an illustration.

Pushing the expand chevron to the end of a `<summary>` looks like a job for
`display: flex; justify-content: space-between`. It is not, because **flex layout turns every
text node and every inline element into a separate flex item**. A summary containing one inline
`<code>` element became *three* items — "Why is", "info", "achromatic?" — spread across the full
width of the card with gaps in the middle of the sentence.

The fix is `display: block` with the chevron absolutely positioned, because block layout keeps
inline content as prose, which is what it is.

And then it happened again in the same file. `.n-error` — the little `⚠` plus a message under a
form field — was also flex with a gap, so any `<code>` or `<a>` mid-sentence opened the same hole
either side of itself. **The comment on `.n-summary` warns about exactly this trap, and the
component one screenful away was still falling into it.** It is now block layout with the glyph
as an inline `::before` and a margin.

The platform gives you the behaviour. It does not give you the layout, the layout still has edge
cases, and writing the lesson down next to one component does not automatically apply it to the
next.

## `:has()` and `field-sizing`

**`:has()` is the parent selector**, and it removes an entire category of JavaScript: the class
toggled onto a wrapper because CSS could not see the state of its child.

```css
/* the label row greys itself out from its own input */
.n-choice:has(:disabled) { color: var(--neutral-11) }

/* the slider lays out vertically by reading its own thumb */
.n-slider:has([aria-orientation='vertical']) { … }
```

The second one is the better example. `aria-orientation` is the attribute assistive technology
reads, so making it drive the layout as well means there is exactly one source of truth. Before
`:has()`, a library needed a duplicate class alongside the ARIA attribute and a code path to keep
the two in step.

**`field-sizing: content`** makes a `<textarea>` grow as you type — one declaration replacing a
`scrollHeight` listener and the layout thrash that came with it.

And `:user-invalid` deserves a note of its own. `:invalid` matches an empty required field
*before it has been touched*, so validation styling with it paints a form red the moment it
loads, which is hostile. `:user-invalid` waits until the user has finished with the field.

But it is not the whole answer, and nilam had to learn that too. **`:user-invalid` only fires
for constraints the *browser* evaluates** — `required`, `type`, `pattern`. An application-level
rule ("that is not a valid magnet URI", "this username is taken") has no browser constraint to
violate, so on a plain valid text field `:user-invalid` never matches, and the border stayed
neutral while the error text below it said otherwise. The fix is to style `[aria-invalid="true"]`
alongside it — and since that is the attribute assistive technology reads anyway, it means the
visible state and the announced state cannot disagree.

<div class="nd-demo">
  <p class="nd-label">type a bad address and tab away · type in the textarea · the third row is disabled</p>
  <div class="nd-grid">
    <div class="nd-stack">
      <div class="n-field">
        <label class="n-label" data-required for="l-email">Billing email</label>
        <input class="n-input" id="l-email" type="email" required placeholder="you@example.com" aria-describedby="l-hint">
        <p class="n-hint" id="l-hint">The border turns on <code>:user-invalid</code>, not <code>:invalid</code>.</p>
      </div>
      <label class="n-choice"><input class="n-check" type="checkbox" checked> Email notifications</label>
      <label class="n-choice"><input class="n-check" type="checkbox" disabled> Weekly digest</label>
    </div>
    <div class="n-field">
      <label class="n-label" for="l-notes">Notes</label>
      <textarea class="n-textarea" id="l-notes" placeholder="Grows as you type…"></textarea>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">The third row's text is grey because <code>:has()</code> let the <b>label</b> notice that the <b>checkbox inside it</b> is disabled. No class was added to it.</p>
</div>

## What is still worth writing

The platform did not take over everything. What remains genuinely needs code:

- **Roving focus** — one Tab stop for a whole group of controls, arrow keys moving within it.
- **Typeahead** — type "b" in a menu and land on "Billing".
- **ARIA attributes that change with state** — `aria-selected`, `aria-activedescendant`.
- **Genuinely stateful widgets** — combobox, date picker, virtualised grid, tree,
  drag-and-drop reordering.

nilam ships the first three as a small module and **deliberately does not ship** most of the
fourth group, on the grounds that each needs a real state machine and, more to the point, real
assistive-technology testing to be worth shipping. Use
[React Aria](https://react-spectrum.adobe.com/react-aria/) for those. Pairing is the honest
recommendation, not a fallback.

## How nilam handles it

Native first, and the table is short because that is the point:

| Component | Built on | So nilam ships |
|---|---|---|
| `.n-dialog` | `<dialog>` + `showModal()` | no focus-trap library |
| `.n-pop`, `.n-menu` | Popover API + CSS anchor positioning | no positioning library |
| `.n-tip` | `popover="hint"` | nothing extra |
| `.n-accordion` | `<details name>` | no state at all |
| `.n-textarea` | `field-sizing: content` | no scroll-height listener |
| `.n-field` | `:has()` | no wrapper class toggled by JS |
| `.n-progress` | a real `<progress>` | no `aria-valuenow` to maintain |

The whole package is **zero dependencies, no build step and no runtime**, and a bare `.html`
file consumes the identical stylesheet that React, Next, Vite and Astro do. That is only
possible because the hard parts moved into the browser.

### The honest caveats

**Some of these have Chrome-first histories.** `field-sizing`, `position-area` and
`popover="hint"` all shipped in Chrome before the others, and nilam's visual-regression suite
captures **Chrome only** — Firefox and Safari are not captured. Check the ones you depend on
against [Baseline](https://web.dev/baseline) for your own support target rather than trusting
this table.

**Native widgets are not automatically accessible widgets.** `<dialog>` gives you a correct
focus trap; it does not give you a sensible heading, a useful accessible name, or a reason for
the dialog to exist. And nilam's keyboard layer implements the ARIA APG contracts but **has not
been tested against NVDA, JAWS, VoiceOver or TalkBack**. Real assistive technology diverges from
specification constantly, and the only way to find out how is to run it.

**Next:** [tokens beyond CSS](11-tokens-beyond-css.md) — the same decision reaching Figma, iOS
and Android.

**Reference:** [Components](../components.md) has every component with its live demo and the
reasoning behind each decision. [Behaviours](../behaviours.md) has the keyboard contracts.
[Honest limits](../limitations.md#what-is-deliberately-not-built) lists what is absent on
purpose.
