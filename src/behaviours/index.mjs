/* nilam — behaviours: the barrel, and one call that wires a plain HTML page.
 *
 *   <script type="module">
 *     import { enhance } from 'nilam/behaviours';
 *     enhance();
 *   </script>
 *
 * That is the whole integration story for a page with no build step, which is the kind of
 * page this system is for. Every widget below still works if you wire it by hand; enhance
 * only finds the markup and calls the same functions.
 *
 * ── what is NOT here, and why ─────────────────────────────────────────────────
 *
 * DISCLOSURE. The APG pattern is: a button with aria-expanded that shows and hides a
 * region, Enter and Space toggle it. <details>/<summary> already is that element — it
 * carries the expanded state, both keys work, and the component layer's .n-accordion gets
 * exclusivity from <details name> with no script at all. A JS disclosure here would be a
 * worse copy of something already in the page.
 *
 * MENUBAR, SUBMENUS, MULTI-SELECT LISTBOX, TREE, GRID, DATE PICKER. Real patterns with
 * real keyboard contracts that are not written yet. The README's claim is narrowed by
 * this directory, not withdrawn: React Aria still covers far more, and every word of it
 * has been tested against assistive technology in a way that none of this has.
 */

export {
  roving, findByTypeahead, labelOf, ensureId, TYPEAHEAD_MS, PAGE_SIZE,
} from './roving.mjs';

export { tabs } from './tabs.mjs';
export { menu } from './menu.mjs';
export { combobox } from './combobox.mjs';
export { slider } from './slider.mjs';
export { range } from './range.mjs';

import { tabs } from './tabs.mjs';
import { menu } from './menu.mjs';
import { combobox } from './combobox.mjs';
import { slider } from './slider.mjs';
import { range } from './range.mjs';

/* One attribute, so enhance() is idempotent. Calling it again after inserting markup — or
 * twice because two scripts on the page both wanted it — must not attach a second
 * keydown listener to the same element. Two listeners on a tablist means every arrow
 * press moves two tabs. */
const MARK = 'data-n-wired';

const find = (root, selector) =>
  [...root.querySelectorAll(selector)].filter((el) => !el.hasAttribute(MARK));

/**
 * Wire every widget under `root` that has the right classes or roles.
 *
 * @param root  a DocumentFragment, Element or Document (default: document)
 * @param opts  per-widget option objects: { tabs, menu, combobox, slider, range }
 * @returns the controllers, plus a destroy() that unwires all of them
 */
export function enhance(root = typeof document !== 'undefined' ? document : null, opts = {}) {
  if (!root) throw new Error('enhance(): no document — pass a root element');

  const out = { tabs: [], menus: [], comboboxes: [], sliders: [], ranges: [] };

  for (const el of find(root, '[role="tablist"], .n-tabs')) {
    el.setAttribute(MARK, 'tabs');
    /* data-activation on the markup, not just an option, so a page with no build step can
     * still choose manual activation for the one tablist whose panel fetches something. */
    const activation = el.getAttribute('data-activation') === 'manual' ? 'manual' : 'automatic';
    out.tabs.push(tabs(el, { activation, ...opts.tabs }));
  }

  for (const el of find(root, '.n-menu[popover], [role="menu"][popover]')) {
    el.setAttribute(MARK, 'menu');
    out.menus.push(menu(el, { ...opts.menu }));
  }

  for (const el of find(root, '.n-combobox')) {
    el.setAttribute(MARK, 'combobox');
    out.comboboxes.push(combobox(el, { ...opts.combobox }));
  }

  /* Ranges before sliders, and this pass marks the two THUMBS as well as the wrapper. Both
   * of a range's thumbs are [role="slider"], so without the marks the orphan slider pass
   * below would wire each of them a second time as a single-value slider — and then every
   * arrow press would move the thumb one step and also clamp it against a bound the other
   * handler does not know about. find() skips anything already marked, so marking the
   * thumbs is what makes the two passes disjoint. */
  for (const el of find(root, '.n-range')) {
    el.setAttribute(MARK, 'range');
    const controller = range(el, { ...opts.range });
    for (const thumb of controller.thumbs) thumb.setAttribute(MARK, 'range-thumb');
    out.ranges.push(controller);
  }

  /* .n-slider first, then any orphan [role="slider"], so a thumb inside a wrapper is not
   * wired twice — the wrapper pass marks the wrapper, and this pass skips a thumb whose
   * wrapper is already marked. */
  for (const el of find(root, '.n-slider')) {
    el.setAttribute(MARK, 'slider');
    out.sliders.push(slider(el, { ...opts.slider }));
  }
  for (const el of find(root, '[role="slider"]')) {
    if (el.closest?.(`[${MARK}="slider"]`)) continue;
    el.setAttribute(MARK, 'slider');
    out.sliders.push(slider(el, { ...opts.slider }));
  }

  out.all = [...out.tabs, ...out.menus, ...out.comboboxes, ...out.sliders, ...out.ranges];

  /* WARN WHEN widgets.css IS MISSING, because nothing else does.
   *
   * The component layer is two files — nilam/components.css for single elements and
   * nilam/widgets.css for the three that need this module. Importing only the first is an
   * easy mistake and was a completely silent one: .n-combobox, .n-listbox, .n-slider and
   * .n-range are ordinary class names, so no selector fails, no import throws, and the
   * markup renders as unstyled native controls that still respond to the keyboard. It looks
   * like it works. A real app shipped a range slider that had been a bare browser input the
   * whole time and found out from a screenshot.
   *
   * The sentinel is :root { --n-widgets-loaded: 1 } at the top of widgets.css — a custom
   * property is the only way a stylesheet can tell JavaScript it is present.
   *
   * Only fires when a widget was actually wired, so a page with just tabs and menus is never
   * nagged. Warn rather than throw: the page works, and breaking it over a missing
   * stylesheet would be worse than the bug it reports. */
  const widgetCount = out.comboboxes.length + out.sliders.length + out.ranges.length;
  const docEl = root.documentElement ?? root.ownerDocument?.documentElement;
  if (widgetCount && docEl && typeof globalThis.getComputedStyle === 'function') {
    const loaded = globalThis
      .getComputedStyle(docEl)
      .getPropertyValue('--n-widgets-loaded')
      .trim();
    if (!loaded) {
      console.warn(
        `nilam: enhance() wired ${widgetCount} widget(s), but nilam/widgets.css is not ` +
          `loaded — they are unstyled. The component layer is two files:\n` +
          `    @import 'nilam/components.css';\n` +
          `    @import 'nilam/widgets.css';   /* combobox, slider, range */\n` +
          `Nothing else reports this: the classes still match and the controls still work.`,
      );
    }
  }

  out.destroy = () => {
    for (const c of out.all) c.destroy();
    for (const el of root.querySelectorAll(`[${MARK}]`)) el.removeAttribute(MARK);
  };
  return out;
}
