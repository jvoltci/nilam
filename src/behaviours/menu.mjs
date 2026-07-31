/* nilam — menu.
 *
 * Keyboard navigation for .n-pop.n-menu, and NOTHING ELSE. The list of what this
 * deliberately does not do is longer than what it does, because the Popover API already
 * does it:
 *
 *   top layer, stacking      native — .n-pop sets no z-index at all
 *   light dismiss            native — popover="auto" closes on an outside click
 *   Escape to close          native
 *   positioning              CSS anchor positioning, off the implicit popovertarget anchor
 *   focus restoration        native — hiding a popover that contains focus returns it
 *
 * Re-implementing any of those is how a component library ends up with two competing
 * dismiss paths that disagree about which one won. So this file adds exactly four
 * things: arrow keys, typeahead, focus-on-open, and a focus-return fallback for the
 * cases where the native restoration does not fire.
 *
 * ── what is not here ──────────────────────────────────────────────────────────
 *
 * Submenus. The APG's menubar pattern has a whole second axis for them — Right Arrow
 * opens a submenu and focuses its first item, Left Arrow closes it and returns to the
 * parent menuitem, and the submenu must be the sibling immediately after its parent
 * item inside the same menu element. That is a real state machine and half of one would
 * be worse than none, so single-level menus only. A menubar is likewise absent: it
 * needs the horizontal axis plus open-on-hover-once-open behaviour.
 */

import { roving, ensureId } from './roving.mjs';

const ITEMS = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], .n-menu-item';

/**
 * @param pop              the .n-pop.n-menu element (the [popover])
 * @param opts.trigger     the invoker; otherwise found from [popovertarget]
 * @param opts.onSelect    (item, index) after an item is activated
 */
export function menu(pop, opts = {}) {
  if (!pop.getAttribute('role')) pop.setAttribute('role', 'menu');

  const items = () => [...pop.querySelectorAll(ITEMS)];
  for (const item of items()) {
    if (!item.getAttribute('role')) item.setAttribute('role', 'menuitem');
    /* .n-menu-item is a <button>, which is tabbable by default. Left alone, Tab walks
     * through every item in an open menu — the exact failure the roving pattern exists
     * to prevent. roving() re-pins these on every move; this is the state before the
     * first keypress. */
    item.setAttribute('tabindex', '-1');
  }
  /* A bare <div> between menu items is an unlabelled generic to an accessibility tree.
   * role="separator" is what makes it a divider rather than noise, and the APG notes a
   * separator is not focusable — which is already true of a div, so nothing else to do. */
  for (const sep of pop.querySelectorAll('.n-menu-sep')) {
    if (!sep.getAttribute('role')) sep.setAttribute('role', 'separator');
  }

  const id = ensureId(pop, 'n-menu');
  const trigger = opts.trigger
    ?? (typeof document !== 'undefined' ? document.querySelector(`[popovertarget="${id}"]`) : null);

  if (trigger) {
    // The combobox gets aria-haspopup for free from its role; a plain button does not.
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', id);
    trigger.setAttribute('aria-expanded', 'false');
  }

  let open = false;
  /* Where the cursor lands when the menu opens. The APG's menu-button pattern gives
   * Up Arrow its own meaning — "opens the menu and moves focus to the LAST menu item" —
   * which is the detail I would have dropped, and it is the fastest route to a "Delete"
   * or "Sign out" item sitting at the bottom of every menu. */
  let entry = 'first';

  const r = roving(pop, {
    items,
    orientation: 'vertical',
    /* Wrap. The APG calls it optional for menus ("optionally wrapping from the last to
     * the first"), and a menu is a short circular list where holding Down should not
     * dead-end. Tabs wrap for the same reason; the combobox does not, because its list
     * can be hundreds long. */
    wrap: true,
    typeahead: true,
    mode: 'tabindex',
    listen: false,
    onActivate: (item) => activate(item),
  });

  const activate = (item) => {
    if (item.getAttribute('aria-disabled') === 'true' || item.disabled) return;

    /* Close BEFORE running the item's own action, and this ordering is load-bearing.
     *
     * The other way round looks more natural — do the thing, then tidy up — and it
     * breaks the commonest case in this system: a menu item that opens a dialog. The
     * dialog takes focus, then the menu closes, and closing a popover that "contains
     * focus" hands focus back to the trigger — yanking it straight out of the dialog
     * that just opened. Closing first means the focus return happens while the menu is
     * still the thing that owns focus, which is when it is correct. */
    close();
    /* Then synthesise a click rather than calling onSelect directly, so keyboard and
     * pointer activation go down ONE path. Two paths is how a menu ends up firing
     * onSelect twice on Enter, and it is also the only way an <a href> menu item
     * navigates at all — roving() already called preventDefault on the Enter key. */
    item.click?.();
  };

  const show = (where = 'first') => {
    entry = where;
    if (open) { focusEntry(); return; }
    pop.showPopover?.();
  };

  const close = () => { if (open) pop.hidePopover?.(); };

  const focusEntry = () => {
    const list = items();
    if (!list.length) return;
    r.focus(entry === 'last' ? list.length - 1 : 0);
  };

  const onToggle = (event) => {
    open = event?.newState ? event.newState === 'open' : !open;
    trigger?.setAttribute('aria-expanded', String(open));
    if (open) { focusEntry(); return; }

    /* Focus return, as a FALLBACK not a reimplementation. The Popover API already moves
     * focus back to the invoker when it hides a popover that contained focus, so calling
     * .focus() unconditionally would fight it. It is guarded on "focus is currently
     * nowhere useful" — inside the menu that just went display:none, or on <body>
     * because the browser had nowhere to put it. Anywhere else means either the platform
     * already did the right thing or the user has clicked into something specific, and
     * stealing focus from that would be the bug. */
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const stranded = !active || active === document.body || pop.contains?.(active);
    if (stranded) trigger?.focus?.();
    entry = 'first';
  };

  const onKeyDown = (event) => {
    /* Tab closes the menu and is NOT swallowed. The APG: "When focus is on a menuitem
     * in a menu or menubar, move focus out of the menu or menubar, and close all menus."
     * Calling hidePopover() here returns focus to the trigger synchronously enough that
     * Tab's own default action then continues from the trigger — which is where the user
     * expects to carry on from. preventDefault would strand them on the trigger. */
    if (event.key === 'Tab') { close(); return; }
    // Escape is the Popover API's. Handling it here as well would close two levels of
    // nested popover for one keypress.
    if (event.key === 'Escape') return;
    r.handleKey(event);
  };

  const onClick = (event) => {
    const item = event.target.closest?.(ITEMS);
    if (!item || !pop.contains?.(item)) return;
    if (item.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
    close();
    opts.onSelect?.(item, items().indexOf(item));
  };

  const onTriggerKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); show('first'); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); show('last'); }
    /* Enter and Space are left alone on purpose: popovertarget already toggles the
     * popover on click, and a <button> synthesises click from both keys. Handling them
     * here would open the menu twice — once for us, once for the platform — and the
     * second toggle closes it again. */
  };

  pop.addEventListener('toggle', onToggle);
  pop.addEventListener('keydown', onKeyDown);
  pop.addEventListener('click', onClick);
  trigger?.addEventListener('keydown', onTriggerKeyDown);

  return {
    pop,
    trigger,
    get open() { return open; },
    show,
    close,
    items,
    destroy() {
      r.destroy();
      pop.removeEventListener('toggle', onToggle);
      pop.removeEventListener('keydown', onKeyDown);
      pop.removeEventListener('click', onClick);
      trigger?.removeEventListener('keydown', onTriggerKeyDown);
    },
  };
}
