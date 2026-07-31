/* nilam — tabs.
 *
 * Wires .n-tabs / .n-tab. The CSS already reads the state off the markup —
 *
 *   .n-tab[aria-selected='true'] { color: var(--brand-11); ... }
 *
 * — which is a deliberate forcing function: an inaccessible tablist does not get the
 * selected style, so the bug is visible before anyone opens a screen reader. It also
 * means this module's most important job is keeping aria-selected honest. If it ever
 * sets a class instead, the underline stops moving.
 *
 * ── automatic or manual activation ────────────────────────────────────────────
 *
 * From memory I would have defaulted to MANUAL — arrow to move, Enter to commit — on the
 * grounds that it is the cautious option. The APG says the opposite: "It is recommended
 * that tabs activate automatically when they receive focus as long as their associated
 * tab panels are displayed without noticeable latency." The reason is that with manual
 * activation a keyboard user has to press two keys per tab to browse, and a screen
 * reader user arrowing along the tablist hears nothing change.
 *
 * The condition is the whole rule though, and the APG's manual example states its
 * inverse: "manual activation of tabs is recommended unless panels can be displayed
 * instantly". So: default automatic, and switch to manual the moment a panel fetches
 * anything, because automatic activation over a network fires a request per arrow key.
 *
 *   tabs(el)                        // automatic
 *   tabs(el, { activation: 'manual' })
 */

import { roving, ensureId } from './roving.mjs';

const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';

/**
 * @param tablist            the .n-tabs element
 * @param opts.activation    'automatic' (default) | 'manual'
 * @param opts.panels        Element[] or a selector; otherwise discovered, see below
 * @param opts.selected      initial index; otherwise read from aria-selected
 * @param opts.onSelect      (tab, index, panel)
 */
export function tabs(tablist, opts = {}) {
  const manual = opts.activation === 'manual';

  if (!tablist.getAttribute('role')) tablist.setAttribute('role', 'tablist');

  const list = [...tablist.querySelectorAll('.n-tab, [role="tab"]')];
  for (const t of list) if (!t.getAttribute('role')) t.setAttribute('role', 'tab');
  for (const t of list) ensureId(t, 'n-tab');

  /* Vertical tablists swap the axis: the APG says "Down Arrow and Up Arrow perform the
   * same function as Right Arrow and Left Arrow respectively" when aria-orientation is
   * vertical. The attribute is the source of truth so the markup and the keys cannot
   * disagree — reading it here rather than taking an option is the point. */
  const vertical = tablist.getAttribute('aria-orientation') === 'vertical';

  /* Panels are OPTIONAL, and that is not a shortcut.
   *
   * nilam's own demo has a tablist with no tabpanels at all — the tabs label a table
   * that sits below them. Writing aria-controls at a panel that does not exist would
   * produce a dangling IDREF, which is worse than no attribute: an AT following it finds
   * nothing. So panels are wired only when the count matches, and a mismatch is left
   * alone rather than half-wired. */
  const panels = resolvePanels(tablist, list, opts.panels);
  const wired = panels.length === list.length && panels.every(Boolean);

  if (wired) {
    for (let i = 0; i < list.length; i++) {
      const panel = panels[i];
      if (!panel.getAttribute('role')) panel.setAttribute('role', 'tabpanel');
      list[i].setAttribute('aria-controls', ensureId(panel, 'n-panel'));
      panel.setAttribute('aria-labelledby', list[i].id);
      /* tabindex="0" on the PANEL, but only when it has nothing focusable inside.
       *
       * I would have put it on every panel. The APG puts it on a panel only "when the
       * tabpanel does not contain any focusable elements", and its manual example notes
       * the panel is deliberately NOT in the tab sequence because the first thing in it
       * is a link. Adding it unconditionally inserts a pointless extra Tab stop in front
       * of that link on every panel in the page. */
      if (panel.querySelector(FOCUSABLE)) panel.removeAttribute('tabindex');
      else panel.setAttribute('tabindex', '0');
    }
  }

  const initial = (() => {
    if (Number.isInteger(opts.selected)) return opts.selected;
    const marked = list.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    return marked >= 0 ? marked : 0;
  })();

  let selected = -1;

  const select = (i, { focus = false } = {}) => {
    if (i < 0 || i >= list.length) return selected;
    selected = i;
    for (let k = 0; k < list.length; k++) {
      list[k].setAttribute('aria-selected', String(k === i));
      if (wired) panels[k].toggleAttribute('hidden', k !== i);
    }
    /* Tab order follows selection, not focus. The APG: "When focus moves into the tab
     * list, places focus on the active tab element" — so after the user has arrowed
     * away and Tabbed out, coming back must land on the SELECTED tab. roving() keeps
     * tabindex on whatever was last focused, which is right while the composite has
     * focus and wrong once it does not, so selection re-pins it. */
    r.index = i;
    r.refresh({ initial: i });
    if (focus) list[i].focus?.();
    opts.onSelect?.(list[i], i, wired ? panels[i] : null);
    tablist.dispatchEvent?.(new CustomEvent('n:tabselect', {
      bubbles: true,
      detail: { index: i, tab: list[i], panel: wired ? panels[i] : null },
    }));
    return i;
  };

  const r = roving(tablist, {
    items: () => list,
    orientation: vertical ? 'vertical' : 'horizontal',
    /* Tabs wrap. The APG is explicit and it is the one pattern here that is:
     * "Right Arrow: ... If focus is on the last tab element, moves focus to the first
     * tab." A tablist is short and circular, so wrapping costs nothing; a 200-row
     * listbox is why the same is not true there. */
    wrap: true,
    /* No typeahead. The tabs pattern does not list printable characters at all, and
     * swallowing letters here would break the browser's own find-as-you-type. Every
     * other widget in this directory has typeahead; this one deliberately does not. */
    typeahead: false,
    mode: 'tabindex',
    listen: false,
    initial,
    onFocus: (_tab, i) => { if (!manual) select(i); },
    // Enter and Space: "Activates the tab if it was not activated automatically on
    // focus." A no-op in automatic mode, the whole commit step in manual mode.
    onActivate: (_tab, i) => select(i),
  });

  const onKeyDown = (event) => { r.handleKey(event); };
  const onClick = (event) => {
    const tab = event.target.closest?.('[role="tab"]');
    const i = tab ? list.indexOf(tab) : -1;
    /* Pointer activation selects AND focuses. Clicking a tab and then pressing Right
     * has to move from the tab you clicked; leaving DOM focus where it was is the bug
     * that makes a mouse-then-keyboard user jump back across the tablist. */
    if (i >= 0) select(i, { focus: true });
  };

  tablist.addEventListener('keydown', onKeyDown);
  tablist.addEventListener('click', onClick);

  select(initial);

  return {
    tablist,
    tabs: list,
    panels: wired ? panels : [],
    get selected() { return selected; },
    select,
    destroy() {
      r.destroy();
      tablist.removeEventListener('keydown', onKeyDown);
      tablist.removeEventListener('click', onClick);
    },
  };
}

/* Panels, in order of how much the author told us:
 *   1. an explicit list or selector
 *   2. aria-controls on every tab — the author has already wired it
 *   3. [role="tabpanel"] siblings under the tablist's parent
 * Anything less specific than that is guessing, and a wrong guess writes a dangling
 * aria-controls, so it stops here. */
function resolvePanels(tablist, list, given) {
  if (Array.isArray(given)) return given;
  if (typeof given === 'string') return [...(tablist.getRootNode?.() ?? document).querySelectorAll(given)];

  const byControls = list.map((t) => {
    const id = t.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  });
  if (byControls.every(Boolean)) return byControls;

  const scope = tablist.parentElement ?? tablist.parentNode;
  const found = scope ? [...scope.querySelectorAll('[role="tabpanel"], .n-tabpanel')] : [];
  return found;
}
