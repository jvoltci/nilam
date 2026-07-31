# Behaviours

Keyboard state machines for the widgets the platform does not provide.

```js
import { enhance } from 'nilam/behaviours';
enhance(document);        // wires everything with the right classes and roles
```

Or one at a time:

```js
import { tabs, menu, combobox, slider } from 'nilam/behaviours';
tabs(document.querySelector('.n-tabs'));
```

Also import the CSS for the two widgets that need it:

```css
@import 'nilam/widgets.css';
```

Every widget below is live on this page. This site loads the published module and calls
`enhance()` on each example block, so the keys described here are the keys that work here —
put focus in one and press them.

---

## Read this before you rely on it

These implement the keyboard contracts in the
[W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/). They have
**not been tested against a screen reader** — not NVDA, not JAWS, not VoiceOver, not
TalkBack.

That distinction is not a formality. Real assistive technology diverges from the spec
constantly, and the only way to find out how is to run it. Spec-correct means the
keyboard works and the ARIA attributes say the right thing. It does not mean a JAWS user
has a good time.

**Where certified AT behaviour matters, use [React Aria](https://react-spectrum.adobe.com/react-aria/).**
It is years of exactly the work this cannot contain. Pairing nilam's colour with React
Aria's behaviour is the honest recommendation, not a fallback.

What you get here is the keyboard layer for a project that would otherwise have none.

---

## What the platform already does

Half of this problem does not need JavaScript in 2026, and none of these are
reimplemented:

| Behaviour | Provided by | So nilam does |
|---|---|---|
| Modal focus trap, `Esc`, inert background | `<dialog>` + `showModal()` | nothing |
| Top layer, light dismiss, `Esc` | Popover API | nothing |
| Positioning against a trigger | CSS anchor positioning | nothing |
| Exclusive accordion | `<details name>` | nothing |

The behaviours below add only what is left: roving focus, typeahead, arrow-key
navigation, and the ARIA attributes that have to change as state changes.

---

## Widgets

### Tabs

<div class="nd-demo">
  <p class="nd-label">automatic activation — arrow keys select as they move</p>
  <div class="n-tabs" role="tablist">
    <button class="n-tab" role="tab" type="button" aria-selected="true" aria-controls="b-p1" id="b-t1">Overview</button>
    <button class="n-tab" role="tab" type="button" aria-selected="false" aria-controls="b-p2" id="b-t2">Usage</button>
    <button class="n-tab" role="tab" type="button" aria-selected="false" aria-controls="b-p3" id="b-t3">Billing</button>
  </div>
  <div id="b-p1" role="tabpanel" aria-labelledby="b-t1" style="padding-block-start:var(--space-4)"><p style="font-size:var(--text-0)">Tab into the strip, then press <kbd>→</kbd>, <kbd>Home</kbd>, <kbd>End</kbd>.</p></div>
  <div id="b-p2" role="tabpanel" aria-labelledby="b-t2" style="padding-block-start:var(--space-4)" hidden><p style="font-size:var(--text-0)">The panel changed with the focus, because showing it is cheap.</p></div>
  <div id="b-p3" role="tabpanel" aria-labelledby="b-t3" style="padding-block-start:var(--space-4)" hidden><p style="font-size:var(--text-0)">Only one <kbd>Tab</kbd> stop for the whole strip — that is roving focus.</p></div>
  <p class="nd-label">manual activation — data-activation="manual"</p>
  <div class="n-tabs" role="tablist" data-activation="manual">
    <button class="n-tab" role="tab" type="button" aria-selected="true" aria-controls="b-q1" id="b-s1">Cheap</button>
    <button class="n-tab" role="tab" type="button" aria-selected="false" aria-controls="b-q2" id="b-s2">Expensive</button>
  </div>
  <div id="b-q1" role="tabpanel" aria-labelledby="b-s1" style="padding-block-start:var(--space-4)"><p style="font-size:var(--text-0)">Arrowing only moves focus here. <kbd>Enter</kbd> or <kbd>Space</kbd> commits.</p></div>
  <div id="b-q2" role="tabpanel" aria-labelledby="b-s2" style="padding-block-start:var(--space-4)" hidden><p style="font-size:var(--text-0)">Use this when the panel fetches something.</p></div>
</div>

```html
<div class="n-tabs" role="tablist">
  <button class="n-tab" role="tab" aria-selected="true"  aria-controls="p1" id="t1">Overview</button>
  <button class="n-tab" role="tab" aria-selected="false" aria-controls="p2" id="t2">Usage</button>
</div>
<div id="p1" role="tabpanel" aria-labelledby="t1">…</div>
<div id="p2" role="tabpanel" aria-labelledby="t2" hidden>…</div>
```

Arrow keys move, `Home`/`End` jump to the ends. **Automatic activation** by default —
arrowing to a tab selects it — because the APG recommends it when showing a panel is
cheap. Pass `{ manual: true }` when a panel does real work, so arrowing only moves focus
and `Enter`/`Space` commits.

`aria-selected` is the state, and nilam's CSS selects on it. There is no active class.
If the markup is not accessible, the styling does not apply.

### Menu

<div class="nd-demo">
  <p class="nd-label">open it, then type "e" — that is typeahead</p>
  <div class="nd-row">
    <button class="n-btn" type="button" popovertarget="b-menu">Actions ▾</button>
    <div class="n-pop n-menu" popover id="b-menu">
      <button class="n-menu-item" type="button">Duplicate</button>
      <button class="n-menu-item" type="button">Move to…</button>
      <button class="n-menu-item" type="button">Export as CSV</button>
      <div class="n-menu-sep"></div>
      <button class="n-menu-item n-menu-item-danger" type="button">Delete</button>
    </div>
  </div>
</div>

```html
<button class="n-btn" popovertarget="m">Actions ▾</button>
<div class="n-pop n-menu" popover id="m">
  <button class="n-menu-item">Duplicate</button>
  <div class="n-menu-sep"></div>
  <button class="n-menu-item n-menu-item-danger">Delete</button>
</div>
```

The Popover API handles opening, light dismiss and `Esc`. This adds arrow keys,
typeahead, focus onto the first item when it opens, and focus back to the trigger when
it closes.

### Combobox

The one genuinely missing widget — nothing native does it.

<div class="nd-demo">
  <p class="nd-label">type to filter · ↓ to open · Enter commits · Esc closes</p>
  <div class="n-combobox">
    <input class="n-input" id="b-combo" role="combobox" aria-autocomplete="list" aria-label="Plan" placeholder="Starter, Pro, Business…">
    <ul class="n-listbox" role="listbox" aria-label="Plans">
      <li class="n-option" role="option">Starter</li>
      <li class="n-option" role="option" aria-selected="true">Pro</li>
      <li class="n-option" role="option">Business</li>
      <li class="n-option" role="option" aria-disabled="true">Enterprise — contact sales</li>
    </ul>
    <p class="n-combobox-status" role="status"></p>
  </div>
</div>

```html
<div class="n-combobox">
  <input class="n-input" role="combobox" aria-expanded="false"
         aria-controls="opts" aria-autocomplete="list" />
  <ul class="n-listbox" role="listbox" id="opts">
    <li class="n-option" role="option" id="o1">Starter</li>
    <li class="n-option" role="option" id="o2">Pro</li>
  </ul>
</div>
```

Editable and select-only. Filters as you type, keeps `aria-expanded` and
`aria-activedescendant` in sync. Focus stays in the input and never moves into the list —
that is the APG pattern, and it is the part people most often get wrong.

### Slider

<div class="nd-demo">
  <p class="nd-label">arrows step · PageUp/PageDown jump · Home/End go to the bounds</p>
  <div class="nd-row">
    <div class="n-slider" style="max-inline-size:20rem">
      <div class="n-slider-track"><div class="n-slider-fill"></div></div>
      <div class="n-slider-thumb" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"></div>
    </div>
  </div>
</div>

```html
<div class="n-slider" role="slider"
     tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"></div>
```

Arrows step, `PageUp`/`PageDown` jump, `Home`/`End` go to the bounds. Set
`aria-valuetext` if the number needs units — "40 per cent" beats "40".

Three things the APG corrected, and the first one would have shipped wrong:

- **Up arrow increases, always.** On a vertical slider the obvious reasoning is that Up moves
  the thumb up the track and therefore increases — which is reasoning visually, and wrong on
  any track drawn top-down. The APG has no orientation clause: direction of increase is a
  property of the **key**, not of the layout.
- **`aria-valuenow` is a decimal number.** Not "60%", not "£1,200". Units, currency and
  formatting belong in `aria-valuetext`; putting them in `valuenow` makes the value
  unparseable to anything that wants to compute with it.
- **`Home` and `End` are "the first / last allowed value in its range"**, not literally min
  and max. For an ascending range those are the same thing — the wording is what tells you a
  descending range would swap them.

See [the warning on the component page](components.md#slider) before using this instead of
`<input type="range">`.

---

## Roving focus

The shared core, usable on its own for any list of things you arrow between:

```js
import { roving } from 'nilam/behaviours';

roving(container, {
  items: () => container.querySelectorAll('[role="option"]'),
  orientation: 'vertical',   // or 'horizontal' / 'both'
  wrap: true,
  typeahead: true,
});
```

One element in the set has `tabindex="0"` and the rest have `-1`, so `Tab` enters and
leaves the whole group as one stop rather than stepping through every item. That is why
a 40-item menu does not cost a keyboard user 40 presses.

---

## `enhance()` is idempotent

One attribute, `data-n-wired`, marks what has already been wired. Calling `enhance()` again
after inserting markup — or twice because two scripts both wanted it — must not attach a
second `keydown` listener to the same element. Two listeners on a tablist means every arrow
press moves two tabs.

Everything returns a controller with a `destroy()`, and `enhance()` returns one that unwires
all of them.

## What is not here

Date picker, rich text, virtualised grid, tree, drag-and-drop reordering, menubar, submenus,
multi-select listbox. Each needs a substantial state machine and, more to the point, needs
real AT testing to be worth shipping. Use React Aria.

Disclosure is absent for a different reason: the APG pattern is a button with
`aria-expanded` that shows and hides a region, and `<details>`/`<summary>` **already is that
element**. It carries the expanded state, both keys work, and
[`.n-accordion`](components.md#accordion) gets exclusivity from `<details name>` with no
script at all. A JavaScript disclosure here would be a worse copy of something already in
the page.

## Read next

- [Components](components.md) — the markup and the styling for all four widgets.
- [Limitations](limitations.md) — the screen-reader caveat, in full.
