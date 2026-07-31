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

```html
<div class="n-slider" role="slider"
     tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"></div>
```

Arrows step, `PageUp`/`PageDown` jump, `Home`/`End` go to the bounds. Set
`aria-valuetext` if the number needs units — "40 per cent" beats "40".

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

## What is not here

Date picker, rich text, virtualised grid, tree, drag-and-drop reordering. Each needs a
substantial state machine and, more to the point, needs real AT testing to be worth
shipping. Use React Aria.
