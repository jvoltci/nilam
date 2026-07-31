/* nilam — roving tabindex, and the one keyboard core every other behaviour shares.
 *
 * The component layer is native-first on purpose: <dialog> for modals, the Popover API
 * plus CSS anchor positioning for menus and tooltips, <details name> for accordions.
 * Those hand over the OVERLAY mechanics for free — top layer, light dismiss, Esc, focus
 * trap, positioning. None of them hand over the KEYBOARD STATE MACHINE inside a
 * composite widget: which one of five buttons Tab reaches, what Home does, and what
 * should happen when someone types "bil" quickly. That is the real gap versus Radix and
 * it is what this directory closes.
 *
 * It closes that and nothing else. Writing the ARIA the APG specifies is not the same
 * thing as knowing what NVDA, JAWS, VoiceOver or TalkBack actually say — those diverge
 * from spec constantly and only real-AT testing finds it. None of this has been run
 * against a screen reader. docs/behaviours.md says so at the top.
 *
 * ── the two focus models, and the APG is blunter about the trade than I expected ──
 *
 * A composite widget puts ONE stop in the page Tab sequence and then moves an internal
 * cursor with the arrow keys. There are two ways to move that cursor:
 *
 *   ROVING TABINDEX          the active item has tabindex="0", every other item has
 *                            tabindex="-1", and you call .focus() on the new one. Real
 *                            DOM focus moves.
 *   aria-activedescendant    DOM focus never leaves the container; the container's
 *                            aria-activedescendant points at the item that LOOKS focused.
 *
 * From memory I would have called this a stylistic choice. It is not. The APG names one
 * concrete consequence: "One benefit of using roving tabindex rather than
 * aria-activedescendant to manage focus is that the user agent will scroll the newly
 * focused element into view." With aria-activedescendant nothing scrolls, so a long
 * listbox silently keeps its highlight off-screen — and the APG's own select-only
 * combobox lists the manual scrollIntoView as an accessibility feature it needed for
 * browser zoom. Hence `scrollIntoView({ block: 'nearest' })` in focus() below, which is
 * dead code in the tabindex path and load-bearing in the other.
 *
 * The reason the combobox cannot use roving tabindex anyway: its text input must keep
 * DOM focus so that typing, the caret and IME composition keep working. Moving focus
 * onto an option would take the caret out of the input. So the two models are not
 * interchangeable — each widget's requirements pick one.
 */

/* The typeahead buffer window. Not a number I chose: it is what every APG example
 * uses (window.setTimeout(..., 500) in select-only.js), and native <select> on macOS
 * and Windows feels the same. Shorter and multi-letter matching stops working for
 * anyone who does not type fast; longer and a deliberate second search gets appended
 * to the first. */
export const TYPEAHEAD_MS = 500;

/* PageUp/PageDown distance. The APG says "an author-determined number of items" and
 * then picks 10 in every example, so 10 it is. */
export const PAGE_SIZE = 10;

let uid = 0;

/** Give an element an id if it has none. aria-activedescendant and aria-controls are
 *  IDREFs, so any widget that uses them has to be able to invent ids for markup the
 *  author wrote without them. */
export function ensureId(el, prefix = 'n') {
  if (!el.id) el.id = `${prefix}-${++uid}`;
  return el.id;
}

/** The string typeahead matches against. aria-label wins over text because an icon-only
 *  item has no useful textContent, and lowercasing here means the matcher never has to. */
export function labelOf(el) {
  const text = el.getAttribute('aria-label') || el.textContent || '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/* The typeahead matcher, and this is the algorithm I would have got wrong.
 *
 * The obvious implementation appends each keypress to a buffer and looks for a label
 * with that prefix. Type "b", "b" in a menu of Billing / Backups and you get: "b"
 * matches Billing, then buffer "bb" matches nothing, so the second press does nothing
 * at all — when what the user meant, and what native <select> does, is "show me the
 * next thing starting with b".
 *
 * The APG's examples handle it in getIndexByLetter: try the whole buffer as a prefix
 * first; if that misses AND the buffer is the same character repeated, fall back to
 * cycling through first-letter matches. Search starts one PAST the current item and
 * wraps, so repeated presses advance instead of sticking on the first hit.
 *
 * @param labels     lower-cased labels, in DOM order
 * @param buffer     lower-cased keystrokes so far
 * @param startIndex where to begin — callers pass activeIndex + 1
 * @returns index into `labels`, or -1
 */
export function findByTypeahead(labels, buffer, startIndex = 0) {
  const n = labels.length;
  if (!n || !buffer) return -1;

  const order = [];
  for (let k = 0; k < n; k++) order.push((((startIndex % n) + n) % n + k) % n);

  const exact = order.find((i) => labels[i].startsWith(buffer));
  if (exact !== undefined) return exact;

  const repeated = [...buffer].every((c) => c === buffer[0]);
  if (repeated) {
    const cycled = order.find((i) => labels[i].startsWith(buffer[0]));
    if (cycled !== undefined) return cycled;
  }
  return -1;
}

/* Printable-character test. /^\S$/ rather than /^.$/ — the same test the APG examples
 * use — because Space is never a typeahead character. In a listbox Space selects, in a
 * menu Space activates, and a leading space could not match a trimmed label anyway. */
const isPrintable = (key) => key.length === 1 && /^\S$/.test(key);

const isDisabled = (el) =>
  el.disabled === true || el.getAttribute('aria-disabled') === 'true';

/* Hidden items must not be arrow-reachable. The combobox filters by setting [hidden] on
 * options, so without this the arrow keys walk through options the user cannot see. */
const isVisible = (el) =>
  !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true';

/**
 * Wire arrow-key navigation over a set of items.
 *
 * @param container            element that owns the items
 * @param opts.itemSelector    selector for the items, queried live (default '[role="option"]')
 * @param opts.items           () => Element[], overrides itemSelector entirely
 * @param opts.orientation     'vertical' | 'horizontal' | 'both'
 * @param opts.wrap            arrows wrap past the ends — see the note on the default
 * @param opts.typeahead       printable characters jump to a label (default true)
 * @param opts.page            PageUp/PageDown move PAGE_SIZE items (default false)
 * @param opts.mode            'tabindex' | 'activedescendant'
 * @param opts.owner           element carrying aria-activedescendant (default container)
 * @param opts.skipDisabled    step over aria-disabled items — see the note below
 * @param opts.listen          attach keydown/focusin to container (default true)
 * @param opts.onFocus         (item, index, items) after the cursor moves
 * @param opts.onActivate      (item, index) on Enter or Space
 */
export function roving(container, opts = {}) {
  const {
    itemSelector = '[role="option"]',
    /* wrap defaults to FALSE, which is the opposite of what I assumed, because the APG
     * gives a different answer per widget and there is no safe universal default:
     *   tabs     wrap — "If focus is on the last tab element, moves focus to the first tab"
     *   menu     "optionally wrapping from the last to the first"
     *   listbox  no wrap — the select-only combobox's Down Arrow explicitly stops at the last
     * A widget that wraps when its pattern says it should not is how a keyboard user ends
     * up back at the top of a 200-item list by holding Down. So each caller states it. */
    wrap = false,
    orientation = 'vertical',
    typeahead = true,
    page = false,
    mode = 'tabindex',
    owner = container,
    /* Default false, and this is the APG correcting me outright. I would have skipped
     * disabled items — that is what a focus manager "obviously" does. The menu pattern
     * says: "Disabled menu items are focusable but cannot be activated." Skipping them
     * hides the fact that the option exists at all from a keyboard user, who then cannot
     * tell "not available yet" from "not in this app". So disabled items stay reachable
     * and refuse to fire; only callers whose pattern says otherwise set this. */
    skipDisabled = false,
    listen = true,
    onFocus = null,
    onActivate = null,
  } = opts;

  let index = -1;
  let buffer = '';
  let timer = null;

  const items = opts.items
    ? () => opts.items().filter(isVisible)
    : () => [...container.querySelectorAll(itemSelector)].filter(isVisible);

  /* RTL, and an honest partial. In a horizontal composite ArrowRight must move towards
   * the END of the reading order, which in Arabic or Hebrew is leftwards — otherwise the
   * arrow keys point the wrong way for a fifth of the world. This reads an explicit
   * dir="rtl" attribute only. It does NOT see `direction: rtl` applied from a stylesheet,
   * because that needs getComputedStyle and this module has to run in a bare DOM. If your
   * page sets direction in CSS, put dir on the element too. */
  const isRtl = () =>
    container.closest?.('[dir="rtl"]') != null ||
    (typeof document !== 'undefined' && document.documentElement?.getAttribute('dir') === 'rtl');

  const clearBuffer = () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
    buffer = '';
  };

  /** Move the cursor to `i`, clamped. Returns the resolved index, or -1 if empty. */
  const focus = (i, { scroll = true } = {}) => {
    const list = items();
    if (!list.length) { index = -1; return -1; }
    index = Math.max(0, Math.min(list.length - 1, i));
    const item = list[index];

    if (mode === 'tabindex') {
      /* The whole set is rewritten, not just the two that changed. A widget whose items
       * are re-rendered can otherwise end up with two tabindex="0" items, and then Tab
       * lands inside the composite twice — which is exactly the bug the roving pattern
       * exists to prevent. */
      for (const el of list) el.setAttribute('tabindex', el === item ? '0' : '-1');
      item.focus?.();
    } else {
      for (const el of list) if (el !== item) el.removeAttribute('data-current');
      /* data-current, because CSS cannot select the target of aria-activedescendant.
       * nilam's tab CSS reads aria-selected directly and that forcing function is good,
       * but there is no equivalent here: the attribute lives on the combobox and the
       * highlight belongs on the option. So the visual cursor needs its own hook. */
      item.setAttribute('data-current', '');
      owner.setAttribute('aria-activedescendant', ensureId(item, 'n-opt'));
      if (scroll) item.scrollIntoView?.({ block: 'nearest' });
    }

    onFocus?.(item, index, list);
    return index;
  };

  const clear = () => {
    index = -1;
    if (mode !== 'tabindex') {
      owner.removeAttribute('aria-activedescendant');
      for (const el of items()) el.removeAttribute('data-current');
    }
  };

  const step = (delta) => {
    const list = items();
    if (!list.length) return -1;
    // Nothing focused yet: Down enters at the top, Up enters at the bottom.
    if (index < 0) return focus(delta > 0 ? 0 : list.length - 1);

    let i = index;
    for (let tries = 0; tries < list.length; tries++) {
      i += delta;
      if (i < 0) {
        if (!wrap) return skipDisabled ? index : focus(0);
        i = list.length - 1;
      } else if (i >= list.length) {
        if (!wrap) return skipDisabled ? index : focus(list.length - 1);
        i = 0;
      }
      if (!skipDisabled || !isDisabled(list[i])) return focus(i);
    }
    return index;
  };

  const jump = (i) => focus(i);

  const search = (char) => {
    const list = items();
    if (!list.length) return -1;
    if (timer != null) clearTimeout(timer);
    buffer += char.toLowerCase();
    timer = setTimeout(clearBuffer, TYPEAHEAD_MS);

    const hit = findByTypeahead(list.map(labelOf), buffer, index + 1);
    // A miss clears the buffer immediately rather than waiting out the 500 ms, so the
    // next keypress starts a fresh search instead of extending a dead one.
    if (hit < 0) { clearBuffer(); return -1; }
    return focus(hit);
  };

  /**
   * Handle one keydown. Returns true if the key was consumed, and calls
   * preventDefault() itself when it was — arrows, Home/End and PageUp/PageDown all
   * scroll the page otherwise, which makes a long list unusable at the moment the user
   * reaches its end.
   */
  const handleKey = (event) => {
    const key = event.key;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;

    const vertical = orientation !== 'horizontal';
    const horizontal = orientation !== 'vertical';
    const flip = horizontal && isRtl();
    const take = () => { event.preventDefault(); return true; };

    if (vertical && key === 'ArrowDown') { step(1); return take(); }
    if (vertical && key === 'ArrowUp') { step(-1); return take(); }
    if (horizontal && key === 'ArrowRight') { step(flip ? -1 : 1); return take(); }
    if (horizontal && key === 'ArrowLeft') { step(flip ? 1 : -1); return take(); }
    if (key === 'Home') { jump(0); return take(); }
    if (key === 'End') { jump(items().length - 1); return take(); }
    if (page && key === 'PageDown') { jump(index < 0 ? 0 : index + PAGE_SIZE); return take(); }
    if (page && key === 'PageUp') { jump(index < 0 ? 0 : index - PAGE_SIZE); return take(); }

    if (onActivate && (key === 'Enter' || key === ' ')) {
      const list = items();
      const item = list[index];
      // Focusable-but-not-activatable: see skipDisabled above. Swallow the key so a
      // disabled menu item does not also scroll the page with Space.
      if (item && !isDisabled(item)) onActivate(item, index);
      return take();
    }

    if (typeahead && isPrintable(key)) { search(key); return take(); }
    return false;
  };

  /* Sync when focus arrives by some route other than our arrow keys: a click, or Tab
   * from outside. Without this the cursor and the real focus disagree, and the first
   * arrow press jumps back to wherever the cursor was left. */
  const onFocusIn = (event) => {
    const list = items();
    const i = list.indexOf(event.target);
    if (i >= 0 && i !== index) {
      index = i;
      for (const el of list) el.setAttribute('tabindex', el === list[i] ? '0' : '-1');
    }
  };

  const onKeyDown = (event) => { handleKey(event); };

  if (listen) container.addEventListener('keydown', onKeyDown);
  /* focusin is attached even when `listen` is off, because `listen` is only about who owns
   * the keydown ordering — a widget that adds its own keys needs to run before this one.
   * The focus sync has no such conflict, and leaving it off is how tabs() ended up
   * activating a stale index when something focused a tab directly. */
  if (mode === 'tabindex') container.addEventListener('focusin', onFocusIn);

  /* Put the set into a legal state now rather than on first keypress. An unvisited
   * composite where every item is tabindex="-1" is unreachable by keyboard, and one
   * where every item is tabindex="0" is a Tab trap of its own kind. */
  const refresh = ({ initial = index } = {}) => {
    const list = items();
    if (!list.length) return;
    if (mode === 'tabindex') {
      const at = initial >= 0 && initial < list.length ? initial : 0;
      index = initial >= 0 ? at : index;
      const active = list[at];
      for (const el of list) el.setAttribute('tabindex', el === active ? '0' : '-1');
    }
  };
  refresh({ initial: opts.initial ?? -1 });

  return {
    container,
    items,
    get index() { return index; },
    set index(i) { index = i; },
    focus,
    clear,
    step,
    jump,
    search,
    handleKey,
    refresh,
    destroy() {
      clearBuffer();
      container.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('focusin', onFocusIn);
    },
  };
}
