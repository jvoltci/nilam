/* nilam — combobox.
 *
 * The one widget the component layer genuinely could not express. README lists it under
 * "deliberately absent", and that was honest: a combobox is a text input, a listbox, a
 * filter, a selection model and a focus model that deliberately does not move focus, all
 * agreeing with each other. There is no native element and no CSS trick.
 *
 * Two shapes, from one function:
 *
 *   EDITABLE     an <input>. The user types, the list filters. aria-autocomplete="list".
 *   SELECT-ONLY  a <div role="combobox" tabindex="0">. Behaves like <select size="1">
 *                but stylable. aria-autocomplete="none", typeahead instead of typing.
 *
 * Detected from the element, not configured: an <input> is editable, anything else is not.
 *
 * ── the thing about focus, which is the whole design ──────────────────────────
 *
 * DOM focus NEVER leaves the combobox element. The cursor inside the listbox is moved by
 * rewriting aria-activedescendant on the combobox. This is not a style preference — for
 * the editable shape it is forced, because moving real focus onto an option takes the
 * caret out of the input and breaks typing, selection and IME composition. The APG says
 * it for every popup type: "DOM Focus is maintained on the combobox and the assistive
 * technology focus is moved within the listbox using aria-activedescendant."
 *
 * The bill for that arrives as scrolling: see the note in roving.mjs. Nothing scrolls an
 * aria-activedescendant into view, so this asks roving() to do it.
 *
 * ── three things the APG corrected ────────────────────────────────────────────
 *
 * 1. aria-selected marks the COMMITTED value, not the highlighted option. I would have
 *    put it on whatever the arrow keys were pointing at. The APG's select-only example
 *    only ever writes it in selectOption(); visual focus is a class plus
 *    aria-activedescendant. Getting this wrong means every arrow keypress claims a
 *    selection has been made when it has not.
 * 2. No aria-haspopup. role="combobox" carries an implicit aria-haspopup="listbox"; you
 *    add the attribute only when the popup is a grid, tree or dialog. I would have
 *    written it out redundantly.
 * 3. aria-controls, not aria-owns. ARIA 1.0 used aria-owns here and the APG now says
 *    "it is strongly recommended that authors use aria-controls".
 */

import { roving, ensureId, labelOf, PAGE_SIZE } from './roving.mjs';

const OPTIONS = '[role="option"], .n-option';

/** Prefix match, which is what the APG examples do (indexOf(filter) === 0). Substring
 *  matching feels more generous and makes the first result unpredictable, so it is opt-in
 *  by passing your own function. */
const prefixMatch = (label, query) => label.startsWith(query);

/**
 * @param root                the .n-combobox wrapper, or the combobox element itself
 * @param opts.filter         true (default for editable) | false | (label, query) => bool
 * @param opts.clearOnEscape  a second Escape empties an editable combobox (default false)
 * @param opts.onSelect       (option, value) after a value is committed
 */
export function combobox(root, opts = {}) {
  const wrapper = root.getAttribute?.('role') === 'combobox'
    ? (root.parentElement ?? root)
    : root;

  const combo = wrapper.querySelector('[role="combobox"], .n-combobox-value, input.n-input')
    ?? root;
  const listbox = wrapper.querySelector('[role="listbox"], .n-listbox');
  if (!listbox) throw new Error('combobox(): no [role="listbox"] inside the wrapper');

  const editable = combo.tagName === 'INPUT' || combo.isContentEditable === true;
  const filtering = opts.filter === false ? false : (editable || typeof opts.filter === 'function');
  const match = typeof opts.filter === 'function' ? opts.filter : prefixMatch;

  if (combo.getAttribute('role') !== 'combobox') combo.setAttribute('role', 'combobox');
  if (!listbox.getAttribute('role')) listbox.setAttribute('role', 'listbox');
  combo.setAttribute('aria-controls', ensureId(listbox, 'n-listbox'));
  combo.setAttribute('aria-expanded', 'false');
  combo.setAttribute('aria-autocomplete', filtering ? 'list' : 'none');
  /* An <input> is focusable already; a <div role="combobox"> is not, and without this the
   * select-only shape is unreachable by keyboard — the failure that looks like the widget
   * simply not existing. */
  if (!editable && !combo.hasAttribute('tabindex')) combo.setAttribute('tabindex', '0');
  /* Inline autocomplete (aria-autocomplete="both") is NOT implemented. It means writing
   * the completion into the input and leaving it selected so the next keystroke replaces
   * it, and doing that without fighting IME composition is its own project. Saying "list"
   * when the behaviour is "list" is the honest attribute. */

  const options = () => [...listbox.querySelectorAll(OPTIONS)];
  for (const o of options()) {
    if (!o.getAttribute('role')) o.setAttribute('role', 'option');
    ensureId(o, 'n-opt');
  }

  /* Optional. If the author put a role="status" in the wrapper we keep a result count in
   * it, because a filter that silently empties the list tells a sighted user everything
   * and a non-sighted user nothing. Whether any given screen reader actually announces a
   * polite live region mid-typing is exactly the sort of thing only testing on the real
   * software settles, and none of that has been done here. The widget works without it. */
  const status = wrapper.querySelector('[role="status"]');

  let open = false;
  let selected = null;

  const r = roving(listbox, {
    items: options,
    orientation: 'vertical',
    mode: 'activedescendant',
    owner: combo,
    /* No wrap. The APG's select-only keyboard table is explicit that Down Arrow "moves
     * visual focus to the next option" and stops: "If visual focus is on the last option,
     * visual focus does not move." Tabs and menus wrap; a list that can be hundreds long
     * must not, or holding Down silently returns you to the top. */
    wrap: false,
    /* Typeahead is for the select-only shape ONLY. The APG puts a warning on the pattern
     * itself: "Ensure JavaScript does not interfere with browser-provided text editing
     * functions by capturing key events." In an editable combobox a printable character
     * is text, and intercepting it would break the caret, selection replacement and every
     * IME. So the editable shape filters on the `input` event instead. */
    typeahead: !editable,
    page: !editable,
    listen: false,
  });

  const valueOf = (option) => (option.getAttribute('data-value') ?? option.textContent ?? '').trim();

  const setStatus = (text) => { if (status) status.textContent = text; };

  /**
   * @param cursor  'keep'  land on the committed option, or the first if none — what the
   *                        APG's select-only example does, where opening "without moving
   *                        visual focus" still shows a highlight because activeIndex
   *                        starts at 0 and is remembered across opens
   *                'first' land on the first option
   *                'none'  no highlight at all — used after typing, so that Enter cannot
   *                        commit a value the user never arrowed to
   */
  const show = (cursor = 'keep') => {
    if (!open) {
      open = true;
      listbox.removeAttribute('hidden');
      combo.setAttribute('aria-expanded', 'true');
    }
    if (cursor === 'none') return;
    const list = r.items();
    if (!list.length) return;
    const at = cursor === 'keep' && selected ? list.indexOf(selected) : -1;
    r.focus(at >= 0 ? at : 0);
  };

  const hide = () => {
    if (!open) return;
    open = false;
    listbox.setAttribute('hidden', '');
    combo.setAttribute('aria-expanded', 'false');
    /* Clear the cursor with the popup. A stale aria-activedescendant on a closed combobox
     * points at an option inside a display:none subtree. */
    r.clear();
  };

  const commit = (option = r.items()[r.index]) => {
    if (!option) return null;
    selected = option;
    for (const o of options()) o.setAttribute('aria-selected', String(o === option));
    const value = valueOf(option);
    if (editable) combo.value = value;
    else combo.textContent = value;
    opts.onSelect?.(option, value);
    combo.dispatchEvent?.(new CustomEvent('n:select', {
      bubbles: true,
      detail: { option, value },
    }));
    return value;
  };

  const applyFilter = (query) => {
    const q = query.trim().toLowerCase();
    let shown = 0;
    for (const o of options()) {
      const hit = q === '' || match(labelOf(o), q);
      o.toggleAttribute('hidden', !hit);
      if (hit) shown++;
    }
    setStatus(shown === 0 ? 'No results' : `${shown} result${shown === 1 ? '' : 's'}`);
    return shown;
  };

  /* ── keys ───────────────────────────────────────────────────────────────── */

  const OPEN_KEYS = ['ArrowDown', 'ArrowUp', 'Enter', ' '];

  const onKeyDown = (event) => {
    const { key, altKey, ctrlKey, metaKey } = event;

    // Alt+Down shows the list without moving the cursor; Alt+Up commits and closes.
    // Both are optional in the pattern and both are what every native select does.
    if (altKey && key === 'ArrowDown') { event.preventDefault(); show('keep'); return; }
    if (altKey && key === 'ArrowUp') { event.preventDefault(); commit(); hide(); return; }
    if (ctrlKey || metaKey || altKey) return;

    /* Home and End belong to the CARET in an editable combobox, and this is the trap.
     * They are listed under the listbox popup, which makes them look like list keys —
     * but the pattern qualifies it: "if the combobox is editable, returns focus to the
     * combobox and places the cursor on the first character". Capturing them would make
     * it impossible to get to the start of your own typing. So the editable shape hands
     * them straight back to the browser, and only the select-only shape treats them as
     * first/last option. */
    if (editable && (key === 'Home' || key === 'End')) return;

    if (!open) {
      if (OPEN_KEYS.includes(key)) {
        // Space must not open an EDITABLE combobox: a space is a character.
        if (key === ' ' && editable) return;
        event.preventDefault();
        show(editable && key === 'ArrowDown' ? 'first' : 'keep');
        return;
      }
      /* Home, End and typeahead all work from the closed state — the APG's select-only
       * table lists them under both, and its getActionFromKey checks them before it
       * checks whether the popup is open. So open first, then let the key through. */
      if (key === 'Home' || key === 'End') show('keep');
      if (!editable && key.length === 1 && /^\S$/.test(key)) show('keep');
    } else {
      if (key === 'Escape') {
        event.preventDefault();
        hide();
        return;
      }
      if (key === 'Enter' || (key === ' ' && !editable)) {
        event.preventDefault();
        commit();
        hide();
        return;
      }
      /* Tab COMMITS, then lets focus leave. I would have made Tab merely close the popup.
       * The APG's select-only table: "Tab: Sets the value to the content of the focused
       * option in the listbox. Closes the listbox. Moves focus to the next element in the
       * tab sequence." Not preventDefault-ed, so Tab still moves on. */
      if (key === 'Tab') { commit(); hide(); return; }
    }

    if (key === 'Escape' && !open && opts.clearOnEscape) {
      // Optional in the pattern: "if the popup is hidden before Escape is pressed,
      // clears the combobox".
      if (editable) combo.value = '';
      else combo.textContent = '';
      selected = null;
      for (const o of options()) o.setAttribute('aria-selected', 'false');
      if (filtering) applyFilter('');
      return;
    }

    r.handleKey(event);
  };

  const onInput = () => {
    if (!editable) return;
    if (filtering) {
      const shown = applyFilter(combo.value);
      if (shown === 0) { hide(); return; }
    }
    /* No option is auto-highlighted. With aria-autocomplete="list" nothing has been
     * completed for the user, so pointing the cursor at the first match would let Enter
     * commit a value they never looked at. They arrow to it. */
    show('none');
    r.clear();
  };

  const onListClick = (event) => {
    const option = event.target.closest?.(OPTIONS);
    if (!option || !listbox.contains?.(option)) return;
    commit(option);
    hide();
    combo.focus?.();
  };

  const onComboClick = () => { if (open) hide(); else show('keep'); };

  /* focusout on the WRAPPER, not blur on the combobox. Clicking an option fires blur on
   * the combobox before the option's click, so a blur handler closes the popup out from
   * under the pointer and the click lands on nothing. Watching the wrapper and checking
   * where focus went means a click inside is not a departure. */
  const onFocusOut = (event) => {
    const to = event.relatedTarget;
    if (to && wrapper.contains?.(to)) return;
    /* Select-only commits on the way out; editable does not. The APG's select-only
     * example does exactly this (onComboBlur → selectOption). Doing it for the editable
     * shape too would overwrite whatever the user typed with the option their cursor
     * happened to be resting on, which is data loss. */
    if (!editable && open) commit();
    hide();
  };

  combo.addEventListener('keydown', onKeyDown);
  combo.addEventListener('click', onComboClick);
  if (editable) combo.addEventListener('input', onInput);
  listbox.addEventListener('click', onListClick);
  wrapper.addEventListener('focusout', onFocusOut);

  // Start closed and consistent, whatever the markup said.
  listbox.setAttribute('hidden', '');
  const preset = options().find((o) => o.getAttribute('aria-selected') === 'true');
  for (const o of options()) if (o !== preset) o.setAttribute('aria-selected', 'false');
  if (preset) commit(preset);

  return {
    wrapper,
    combo,
    listbox,
    editable,
    pageSize: PAGE_SIZE,
    get open() { return open; },
    get value() { return selected ? valueOf(selected) : (editable ? combo.value : ''); },
    options,
    show,
    hide,
    commit,
    filter: applyFilter,
    /** Re-read the options after the author has replaced them. */
    refresh() {
      for (const o of options()) {
        if (!o.getAttribute('role')) o.setAttribute('role', 'option');
        ensureId(o, 'n-opt');
        if (!o.hasAttribute('aria-selected')) o.setAttribute('aria-selected', 'false');
      }
      r.refresh();
    },
    destroy() {
      r.destroy();
      combo.removeEventListener('keydown', onKeyDown);
      combo.removeEventListener('click', onComboClick);
      combo.removeEventListener('input', onInput);
      listbox.removeEventListener('click', onListClick);
      wrapper.removeEventListener('focusout', onFocusOut);
    },
  };
}
