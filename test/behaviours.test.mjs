/* nilam — the behaviours test suite.
 *
 * Same shape as prove.test.mjs: a check(ok, msg) helper where the message says what
 * BREAKS IN THE PRODUCT, not what the assertion was. "arrow keys move two tabs at once"
 * is a bug report; "expected 1, got 2" is a puzzle.
 *
 * ── why there is a DOM in this file ───────────────────────────────────────────
 *
 * The package has zero dependencies, and adding jsdom to test five keyboard handlers
 * would make the test tree heavier than everything it tests. So the bottom half of this
 * file is a DOM: elements, attributes, a selector engine, event dispatch with bubbling,
 * and a focus model. About 250 lines, and it only implements what src/behaviours actually
 * touches.
 *
 * That is a real limit and it is worth stating: this proves the STATE MACHINES. It cannot
 * prove layout, it cannot prove the CSS, and it deliberately does not implement the
 * Popover API's native focus restoration — which is what lets the menu's fallback path be
 * the thing under test. What no test here can prove at all is what a screen reader says.
 *
 * The other half of the suite reads nilam.widgets.css back out and asserts things about
 * it, which is job 2 of prove.test.mjs applied to a new stylesheet: every var() it
 * mentions must exist, and it must not introduce a colour.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
const fails = [];
const check = (ok, msg) => { if (ok) pass++; else fails.push(msg); return ok; };

/* ══ the DOM ═══════════════════════════════════════════════════════════════════ */

class Ev {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = false;
    this.cancelable = true;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.relatedTarget = null;
    Object.assign(this, init);
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this._stopped = true; }
}
class Custom extends Ev {
  constructor(type, init = {}) { super(type, init); this.detail = init.detail ?? null; }
}

/* Selector engine. Grammar: comma-separated selectors, each a whitespace-separated
 * sequence of compounds, each compound a run of tag / #id / .class / [attr] / [attr=val].
 * That is exactly what src/behaviours uses and nothing more — no :is(), no child
 * combinator, no pseudo-classes. If a module grows a selector this cannot parse, the
 * parse silently matches nothing and a dozen assertions fail loudly, which is the
 * failure mode you want. */
const parseCompound = (text) => {
  const c = { tag: null, id: null, classes: [], attrs: [] };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '.' || ch === '#') {
      let j = i + 1;
      while (j < text.length && /[\w-]/.test(text[j])) j++;
      if (ch === '.') c.classes.push(text.slice(i + 1, j)); else c.id = text.slice(i + 1, j);
      i = j;
    } else if (ch === '[') {
      const end = text.indexOf(']', i);
      const body = text.slice(i + 1, end);
      const eq = body.indexOf('=');
      if (eq < 0) c.attrs.push([body, null]);
      else c.attrs.push([body.slice(0, eq), body.slice(eq + 1).replace(/^["']|["']$/g, '')]);
      i = end + 1;
    } else {
      let j = i;
      while (j < text.length && /[\w-]/.test(text[j])) j++;
      if (j === i) { i++; continue; }
      c.tag = text.slice(i, j).toUpperCase();
      i = j;
    }
  }
  return c;
};
const parseSelector = (sel) =>
  sel.split(',').map((s) => s.trim().split(/\s+/).filter(Boolean).map(parseCompound));

const matchCompound = (el, c) =>
  el.nodeType === 1 &&
  (c.tag == null || el.tagName === c.tag) &&
  (c.id == null || el.id === c.id) &&
  c.classes.every((k) => el.classList.contains(k)) &&
  c.attrs.every(([k, v]) => el.hasAttribute(k) && (v == null || el.getAttribute(k) === v));

const matchSeq = (el, seq) => {
  let i = seq.length - 1;
  if (!matchCompound(el, seq[i])) return false;
  i--;
  let node = el.parentNode;
  while (i >= 0 && node) {
    if (node.nodeType === 1 && matchCompound(node, seq[i])) i--;
    node = node.parentNode;
  }
  return i < 0;
};

class Text {
  constructor(data) { this.nodeType = 3; this.data = String(data); this.parentNode = null; }
  get textContent() { return this.data; }
}

class El {
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = String(tag).toUpperCase();
    this.attrs = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.style = {
      props: new Map(),
      setProperty(k, v) { this.props.set(k, v); },
      getPropertyValue(k) { return this.props.get(k) ?? ''; },
    };
    this._popover = false;
    if (this.tagName === 'INPUT') this.value = '';
  }

  /* attributes */
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  setAttribute(n, v) { this.attrs.set(n, String(v)); }
  removeAttribute(n) { this.attrs.delete(n); }
  hasAttribute(n) { return this.attrs.has(n); }
  toggleAttribute(n, force) {
    const on = force === undefined ? !this.attrs.has(n) : !!force;
    if (on) this.attrs.set(n, ''); else this.attrs.delete(n);
    return on;
  }
  get id() { return this.getAttribute('id') ?? ''; }
  set id(v) { this.setAttribute('id', v); }
  get classList() {
    const self = this;
    const list = () => (self.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    return {
      contains: (k) => list().includes(k),
      add: (k) => { const l = list(); if (!l.includes(k)) { l.push(k); self.setAttribute('class', l.join(' ')); } },
      remove: (k) => self.setAttribute('class', list().filter((x) => x !== k).join(' ')),
      toggle: (k, f) => { const on = f === undefined ? !list().includes(k) : !!f; on ? self.classList.add(k) : self.classList.remove(k); },
    };
  }

  /* tree */
  append(...kids) {
    for (const k of kids) {
      const node = typeof k === 'string' ? new Text(k) : k;
      node.parentNode = this;
      this.childNodes.push(node);
    }
    return this;
  }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  set textContent(v) { this.childNodes = []; this.append(String(v)); }
  contains(node) { for (let n = node; n; n = n.parentNode) if (n === this) return true; return false; }
  getRootNode() { return DOC; }
  descendants() {
    const out = [];
    const walk = (n) => { for (const k of n.children) { out.push(k); walk(k); } };
    walk(this);
    return out;
  }
  matches(sel) { return parseSelector(sel).some((seq) => matchSeq(this, seq)); }
  closest(sel) { for (let n = this; n && n.nodeType === 1; n = n.parentNode) if (n.matches(sel)) return n; return null; }
  querySelectorAll(sel) {
    const seqs = parseSelector(sel);
    return this.descendants().filter((el) => seqs.some((seq) => matchSeq(el, seq)));
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }

  /* events */
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatchEvent(ev) {
    ev.target = ev.target ?? this;
    const path = [this];
    if (ev.bubbles) for (let n = this.parentNode; n && n.nodeType === 1; n = n.parentNode) path.push(n);
    for (const node of path) {
      ev.currentTarget = node;
      for (const fn of [...(node.listeners.get(ev.type) ?? [])]) fn.call(node, ev);
      if (ev._stopped) break;
    }
    return !ev.defaultPrevented;
  }

  /* focus. focusout on the way out, focusin on the way in, both bubbling — which is what
     roving() and combobox() listen for. */
  focus() {
    const prev = DOC.activeElement;
    if (prev === this) return;
    DOC.activeElement = this;
    if (prev) prev.dispatchEvent(new Ev('focusout', { bubbles: true, relatedTarget: this }));
    this.dispatchEvent(new Ev('focusin', { bubbles: true, relatedTarget: prev }));
  }
  click() { this.dispatchEvent(new Ev('click', { bubbles: true })); }
  scrollIntoView() { this._scrolled = true; }
  getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }; }

  /* Popover, minus the native focus restoration. Real browsers return focus to the
     invoker when a popover containing focus is hidden; leaving that out here is what
     makes menu.mjs's fallback the thing under test rather than dead code. Real toggle
     events are also async — sync is fine for a state machine. */
  showPopover() {
    if (this._popover) return;
    this._popover = true;
    this.removeAttribute('hidden');
    this.dispatchEvent(new Ev('toggle', { oldState: 'closed', newState: 'open' }));
  }
  hidePopover() {
    if (!this._popover) return;
    this._popover = false;
    this.dispatchEvent(new Ev('toggle', { oldState: 'open', newState: 'closed' }));
  }
}

const h = (tag, attrs = {}, ...kids) => {
  const el = new El(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.append(String(v));
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids);
  if (el.tagName === 'INPUT') el.value = attrs.value ?? '';
  return el;
};

const html = new El('html');
const body = new El('body');
html.append(body);
const DOC = {
  nodeType: 9,
  activeElement: null,
  documentElement: html,
  body,
  querySelector: (s) => html.querySelector(s),
  querySelectorAll: (s) => html.querySelectorAll(s),
  getElementById: (id) => html.descendants().find((el) => el.id === id) ?? null,
  createElement: (t) => new El(t),
  contains: (n) => html.contains(n),
};

/* The modules read `document` and construct CustomEvent lazily, inside functions — so the
 * globals must exist before the module bodies run. Static imports are hoisted above this
 * assignment, hence dynamic import below. */
globalThis.document = DOC;
globalThis.Event = Ev;
globalThis.CustomEvent = Custom;

const press = (el, key, mods = {}) => {
  const ev = new Ev('keydown', {
    bubbles: true, key, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...mods,
  });
  el.dispatchEvent(ev);
  return ev;
};
const type = (el, chars) => { for (const c of chars) press(el, c); };
const active = () => DOC.activeElement;
const labels = (els) => els.map((e) => e.textContent);

const { roving, findByTypeahead } = await import('../src/behaviours/roving.mjs');
const { tabs } = await import('../src/behaviours/tabs.mjs');
const { menu } = await import('../src/behaviours/menu.mjs');
const { combobox } = await import('../src/behaviours/combobox.mjs');
const { slider } = await import('../src/behaviours/slider.mjs');
const { enhance } = await import('../src/behaviours/index.mjs');

const list = (...names) => {
  const box = h('div', { role: 'listbox' });
  body.append(box);
  for (const n of names) box.append(h('div', { role: 'option' }, n));
  return box;
};

/* ══ 1. roving tabindex ════════════════════════════════════════════════════════ */

{
  const box = list('Overview', 'Usage', 'Billing', 'Backups');
  const items = box.children;
  const r = roving(box);

  check(
    items.map((i) => i.getAttribute('tabindex')).join(',') === '0,-1,-1,-1',
    `an unvisited composite has tabindex ${items.map((i) => i.getAttribute('tabindex')).join(',')} — ` +
      `exactly one item must be 0 or Tab either skips the widget or lands inside it twice`,
  );

  items[0].focus();
  press(box, 'ArrowDown');
  check(active() === items[1], `ArrowDown from the first item focused "${active()?.textContent}", not "Usage"`);
  check(
    items[1].getAttribute('tabindex') === '0' && items[0].getAttribute('tabindex') === '-1',
    'tabindex did not follow the arrow keys — Tab would leave the widget from the wrong item',
  );

  press(box, 'ArrowUp');
  press(box, 'ArrowUp');
  check(active() === items[0], `ArrowUp past the first item wrapped to "${active()?.textContent}" — wrap defaults to off`);

  press(box, 'End');
  check(active() === items[3], `End focused "${active()?.textContent}", not the last item`);
  press(box, 'Home');
  check(active() === items[0], `Home focused "${active()?.textContent}", not the first item`);

  const consumed = press(box, 'ArrowDown');
  check(consumed.defaultPrevented, 'ArrowDown was not preventDefault-ed, so the page scrolls while the user navigates the list');
  const ignored = press(box, 'F2');
  check(!ignored.defaultPrevented, 'an unhandled key was preventDefault-ed — the widget is swallowing keystrokes it does not use');
  r.destroy();
}

{
  const box = list('one', 'two', 'three');
  const items = box.children;
  const r = roving(box, { wrap: true });
  items[0].focus();
  press(box, 'ArrowUp');
  check(active() === items[2], `with wrap on, ArrowUp from the first item went to "${active()?.textContent}", not the last`);
  press(box, 'ArrowDown');
  check(active() === items[0], 'with wrap on, ArrowDown from the last item did not return to the first');
  r.destroy();
}

{
  const box = list('a', 'b', 'c');
  const items = box.children;
  const r = roving(box, { orientation: 'horizontal' });
  items[0].focus();
  const down = press(box, 'ArrowDown');
  check(
    active() === items[0] && !down.defaultPrevented,
    'a horizontal composite moved on ArrowDown — it must leave the vertical axis to the page',
  );
  press(box, 'ArrowRight');
  check(active() === items[1], 'ArrowRight did not move in a horizontal composite');
  r.destroy();
}

{
  // RTL: ArrowRight has to move towards the END of the reading order, which is leftwards.
  const wrap = h('div', { dir: 'rtl' });
  body.append(wrap);
  const box = h('div', { role: 'listbox' });
  wrap.append(box);
  for (const n of ['a', 'b', 'c']) box.append(h('div', { role: 'option' }, n));
  const items = box.children;
  const r = roving(box, { orientation: 'horizontal' });
  items[1].focus();
  press(box, 'ArrowRight');
  check(active() === items[0], 'under dir="rtl" ArrowRight moved rightwards — the arrow keys point the wrong way in Arabic and Hebrew');
  r.destroy();
}

{
  const box = list('Overview', 'Usage', 'Billing', 'Backups');
  const items = box.children;
  const r = roving(box);
  items[0].focus();
  press(box, 'b');
  check(active() === items[2], `typing "b" focused "${active()?.textContent}", not "Billing"`);
  press(box, 'b');
  check(
    active() === items[3],
    `typing "b" twice focused "${active()?.textContent}" — a repeated letter must cycle through first-letter matches the way a native <select> does, not search for "bb"`,
  );
  r.destroy();

  const r2 = roving(list('Overview', 'Usage', 'Billing', 'Backups'));
  r2.items()[0].focus();
  type(r2.container, 'ba');
  check(active() === r2.items()[3], `typing "ba" focused "${active()?.textContent}", not "Backups" — multi-letter typeahead is broken`);
  r2.destroy();
}

check(findByTypeahead(['apple', 'apricot', 'banana'], 'ap', 0) === 0, 'findByTypeahead cannot match a plain prefix');
check(findByTypeahead(['apple', 'apricot', 'banana'], 'ap', 1) === 1, 'findByTypeahead ignores its start index, so repeated searches stick on the first hit');
check(findByTypeahead(['apple', 'apricot', 'banana'], 'ap', 2) === 0, 'findByTypeahead does not wrap past the end of the list');
check(findByTypeahead(['apple', 'apricot', 'banana'], 'zz', 0) === -1, 'findByTypeahead invented a match for a string nothing starts with');
check(findByTypeahead(['apple', 'apricot', 'banana'], 'aa', 1) === 1, 'a repeated letter did not fall back to cycling first-letter matches');

{
  // Disabled items stay reachable — the APG's rule — but must not activate.
  const box = list('one', 'two', 'three');
  box.children[1].setAttribute('aria-disabled', 'true');
  let fired = 0;
  const r = roving(box, { onActivate: () => { fired++; } });
  box.children[0].focus();
  press(box, 'ArrowDown');
  check(active() === box.children[1], 'an aria-disabled item was skipped — a keyboard user can no longer tell that the option exists');
  press(box, 'Enter');
  check(fired === 0, 'Enter activated an aria-disabled item');
  press(box, 'ArrowDown');
  press(box, 'Enter');
  check(fired === 1, 'Enter did not activate an enabled item');
  r.destroy();
}

{
  const many = list(...Array.from({ length: 25 }, (_, i) => `row ${i}`));
  const r = roving(many, { page: true });
  many.children[0].focus();
  press(many, 'PageDown');
  check(active() === many.children[10], `PageDown moved to "${active()?.textContent}" instead of ten items on`);
  press(many, 'PageUp');
  check(active() === many.children[0], 'PageUp did not move back ten items');
  const noPage = list('a', 'b', 'c');
  const r2 = roving(noPage);
  noPage.children[0].focus();
  const ev = press(noPage, 'PageDown');
  check(!ev.defaultPrevented, 'PageDown was swallowed by a widget that does not implement it, so the page cannot scroll');
  r.destroy(); r2.destroy();
}

/* ══ 2. tabs ═══════════════════════════════════════════════════════════════════ */

const makeTabs = ({ vertical = false, panels = true, focusableFirstPanel = true } = {}) => {
  const wrap = h('div');
  body.append(wrap);
  const tl = h('div', { class: 'n-tabs', role: 'tablist', ...(vertical ? { 'aria-orientation': 'vertical' } : {}) });
  wrap.append(tl);
  for (const n of ['Overview', 'Usage', 'Billing']) tl.append(h('button', { class: 'n-tab' }, n));
  if (panels) {
    for (let i = 0; i < 3; i++) {
      const p = h('div', { role: 'tabpanel' });
      if (i === 0 && focusableFirstPanel) p.append(h('a', { href: '#x' }, 'more'));
      else p.append(`panel ${i}`);
      wrap.append(p);
    }
  }
  return { wrap, tl, tabsEls: tl.children };
};

{
  const { tl, tabsEls } = makeTabs();
  const t = tabs(tl);

  check(tabsEls.every((x) => x.getAttribute('role') === 'tab'), '.n-tab elements did not get role="tab" — the CSS selects on aria-selected and the tablist is not a tablist');
  check(
    tabsEls.map((x) => x.getAttribute('aria-selected')).join(',') === 'true,false,false',
    `aria-selected is ${tabsEls.map((x) => x.getAttribute('aria-selected')).join(',')} on load — nilam's CSS reads this attribute, so the underline is on the wrong tab or on none`,
  );

  tabsEls[0].focus();
  press(tl, 'ArrowRight');
  check(active() === tabsEls[1], 'ArrowRight did not move focus along the tablist');
  check(
    tabsEls[1].getAttribute('aria-selected') === 'true' && tabsEls[0].getAttribute('aria-selected') === 'false',
    'automatic activation did not follow focus — the APG default is that arrowing to a tab shows its panel',
  );
  check(
    tabsEls.map((x) => x.getAttribute('tabindex')).join(',') === '-1,0,-1',
    'tabindex did not follow the selected tab, so Tabbing back into the tablist lands on the wrong one',
  );

  press(tl, 'ArrowRight');
  press(tl, 'ArrowRight');
  check(active() === tabsEls[0], 'ArrowRight past the last tab did not wrap to the first — the APG requires wrapping for tabs');
  press(tl, 'ArrowLeft');
  check(active() === tabsEls[2], 'ArrowLeft from the first tab did not wrap to the last');
  press(tl, 'Home');
  check(t.selected === 0, 'Home did not select the first tab');
  press(tl, 'End');
  check(t.selected === 2, 'End did not select the last tab');

  const downEv = press(tl, 'ArrowDown');
  check(!downEv.defaultPrevented, 'a horizontal tablist consumed ArrowDown, so the page will not scroll while a tab has focus');
  t.destroy();
}

{
  const { tl, tabsEls } = makeTabs();
  const t = tabs(tl, { activation: 'manual' });
  tabsEls[0].focus();
  press(tl, 'ArrowRight');
  check(active() === tabsEls[1], 'manual activation stopped the arrow keys from moving focus');
  check(
    tabsEls[0].getAttribute('aria-selected') === 'true',
    'manual activation still changed the selection on focus — the panel fetch this mode exists to avoid will fire on every arrow press',
  );
  press(tl, 'Enter');
  check(tabsEls[1].getAttribute('aria-selected') === 'true', 'Enter did not commit the focused tab in manual mode');
  tabsEls[2].focus();
  press(tl, ' ');
  check(tabsEls[2].getAttribute('aria-selected') === 'true', 'Space did not commit the focused tab in manual mode');
  t.destroy();
}

{
  const { tl, tabsEls, wrap } = makeTabs();
  const t = tabs(tl);
  const panels = wrap.querySelectorAll('[role="tabpanel"]');
  check(
    tabsEls[0].getAttribute('aria-controls') === panels[0].id && panels[0].getAttribute('aria-labelledby') === tabsEls[0].id,
    'tab and panel are not cross-referenced, so nothing can tell which panel a tab controls',
  );
  check(
    panels.map((p) => p.hasAttribute('hidden')).join(',') === 'false,true,true',
    `panel visibility is ${panels.map((p) => p.hasAttribute('hidden')).join(',')} — the wrong panels are on screen`,
  );
  check(
    !panels[0].hasAttribute('tabindex') && panels[1].getAttribute('tabindex') === '0',
    'panel tabindex is wrong: a panel gets tabindex="0" only when it has nothing focusable inside, otherwise it adds a dead Tab stop in front of its own first link',
  );
  t.select(2);
  check(!panels[2].hasAttribute('hidden') && panels[0].hasAttribute('hidden'), 'select() did not move panel visibility');
  t.destroy();
}

{
  const { tl } = makeTabs({ panels: false });
  const t = tabs(tl);
  check(
    t.panels.length === 0 && !tl.children[0].hasAttribute('aria-controls'),
    'a tablist with no panels was given an aria-controls pointing at nothing — a dangling IDREF is worse than no attribute',
  );
  t.destroy();
}

{
  const { tl, tabsEls } = makeTabs({ vertical: true });
  const t = tabs(tl);
  tabsEls[0].focus();
  press(tl, 'ArrowDown');
  check(active() === tabsEls[1], 'a vertical tablist did not respond to ArrowDown');
  const right = press(tl, 'ArrowRight');
  check(!right.defaultPrevented, 'a vertical tablist consumed ArrowRight');
  t.destroy();
}

{
  const { tl, tabsEls } = makeTabs();
  const t = tabs(tl);
  let seen = null;
  tl.addEventListener('n:tabselect', (e) => { seen = e.detail.index; });
  tabsEls[2].click();
  check(t.selected === 2, 'clicking a tab did not select it');
  check(active() === tabsEls[2], 'clicking a tab did not move focus to it, so the next arrow press jumps back across the tablist');
  check(seen === 2, 'no n:tabselect event fired, so a page with no build step cannot react to a tab change');
  t.destroy();
}

/* ══ 3. menu ═══════════════════════════════════════════════════════════════════ */

let menuSeq = 0;
const makeMenu = () => {
  const id = `m${++menuSeq}`;
  const wrap = h('div');
  body.append(wrap);
  const trigger = h('button', { popovertarget: id }, 'Actions');
  const pop = h('div', { id, class: 'n-pop n-menu', popover: '', hidden: '' });
  wrap.append(trigger, pop);
  pop.append(
    h('button', { class: 'n-menu-item' }, 'Duplicate'),
    h('button', { class: 'n-menu-item' }, 'Move to…'),
    h('div', { class: 'n-menu-sep' }),
    h('button', { class: 'n-menu-item', 'aria-disabled': 'true' }, 'Export as CSV'),
    h('button', { class: 'n-menu-item n-menu-item-danger' }, 'Delete'),
  );
  return { wrap, trigger, pop, items: pop.querySelectorAll('.n-menu-item') };
};

{
  const { trigger, pop, items } = makeMenu();
  const m = menu(pop);

  check(trigger.getAttribute('aria-haspopup') === 'menu', 'the menu trigger has no aria-haspopup, so nothing announces that it opens a menu');
  check(trigger.getAttribute('aria-controls') === pop.id, 'the menu trigger does not reference its menu');
  check(trigger.getAttribute('aria-expanded') === 'false', 'the menu trigger has no aria-expanded, so its open state is invisible');
  check(pop.getAttribute('role') === 'menu', '.n-pop.n-menu did not get role="menu"');
  check(items.every((i) => i.getAttribute('role') === 'menuitem'), '.n-menu-item did not get role="menuitem"');
  check(
    items.every((i) => i.getAttribute('tabindex') === '-1' || i.getAttribute('tabindex') === '0'),
    'menu items are still natively tabbable, so Tab walks through every item of an open menu',
  );
  check(pop.querySelector('.n-menu-sep').getAttribute('role') === 'separator', '.n-menu-sep did not get role="separator" — it is an unlabelled generic in the accessibility tree');

  trigger.focus();
  pop.showPopover();
  check(trigger.getAttribute('aria-expanded') === 'true', 'opening the menu did not update aria-expanded on the trigger');
  check(active() === items[0], `opening the menu focused "${active()?.textContent}" instead of the first item`);

  press(pop, 'ArrowDown');
  check(active() === items[1], 'ArrowDown did not move down the menu');
  press(pop, 'ArrowUp');
  press(pop, 'ArrowUp');
  check(active() === items[3], 'ArrowUp past the first menu item did not wrap to the last');

  press(pop, 'd');
  check(active() === items[0], `typeahead in the menu focused "${active()?.textContent}", not "Duplicate"`);

  const esc = press(pop, 'Escape');
  check(
    m.open && !esc.defaultPrevented,
    'the menu handled Escape itself — the Popover API already closes on Escape, and doing it twice closes two levels of nested popover for one keypress',
  );

  press(pop, 'Tab');
  check(!m.open, 'Tab did not close the menu');
  m.destroy();
}

{
  const { trigger, pop, items } = makeMenu();
  let clicked = null;
  for (const i of items) i.addEventListener('click', (e) => { clicked = e.currentTarget.textContent; });
  const m = menu(pop);

  trigger.focus();
  pop.showPopover();
  press(pop, 'ArrowDown');
  press(pop, 'ArrowDown');
  check(active() === items[2], 'an aria-disabled menu item was skipped — the APG keeps them focusable so a keyboard user knows the option exists');
  press(pop, 'Enter');
  check(clicked === null && m.open, 'Enter activated an aria-disabled menu item, or closed the menu when it should have done nothing');

  press(pop, 'ArrowDown');
  press(pop, 'Enter');
  check(clicked === 'Delete', `Enter on a menu item fired "${clicked}" instead of activating it`);
  check(!m.open, 'activating a menu item did not close the menu');
  check(active() === trigger, `focus went to "${active()?.textContent}" after the menu closed, not back to the trigger — the keyboard user is stranded`);
  m.destroy();
}

{
  const { trigger, pop, items } = makeMenu();
  const m = menu(pop);
  trigger.focus();
  const up = press(trigger, 'ArrowUp');
  check(m.open && up.defaultPrevented, 'ArrowUp on the trigger did not open the menu');
  check(active() === items[3], `ArrowUp on the trigger focused "${active()?.textContent}" — it must open onto the LAST item, which is the fast route to a Delete at the bottom of every menu`);
  m.close();
  press(trigger, 'ArrowDown');
  check(active() === items[0], 'ArrowDown on the trigger did not open the menu onto the first item');
  m.destroy();
}

/* ══ 4. combobox, select-only ══════════════════════════════════════════════════ */

const FRUIT = ['Apple', 'Apricot', 'Banana', 'Blackberry', 'Cherry', 'Damson',
  'Elderberry', 'Fig', 'Gooseberry', 'Grape', 'Kiwi', 'Lemon'];

const makeSelect = () => {
  const wrap = h('div', { class: 'n-combobox' });
  body.append(wrap);
  const combo = h('div', { class: 'n-input n-combobox-value' }, 'Choose…');
  const box = h('div', { class: 'n-listbox' });
  wrap.append(combo, box);
  for (const f of FRUIT) box.append(h('div', { class: 'n-option' }, f));
  return { wrap, combo, box, options: box.children };
};

{
  const { wrap, combo, box, options } = makeSelect();
  const c = combobox(wrap);

  check(combo.getAttribute('role') === 'combobox', 'the select-only combobox has no role="combobox"');
  check(combo.getAttribute('tabindex') === '0', 'a <div role="combobox"> was left unfocusable — the widget advertises an interaction it does not have');
  check(combo.getAttribute('aria-controls') === box.id, 'the combobox does not reference its listbox with aria-controls');
  check(combo.getAttribute('aria-expanded') === 'false', 'the combobox has no aria-expanded');
  check(combo.getAttribute('aria-autocomplete') === 'none', 'a select-only combobox claimed an autocomplete behaviour it does not have');
  check(
    !combo.hasAttribute('aria-haspopup'),
    'aria-haspopup was written on a combobox — role="combobox" already implies aria-haspopup="listbox" and repeating it is redundant',
  );
  check(!combo.hasAttribute('aria-owns'), 'the combobox used aria-owns, which ARIA 1.0 required and the APG now advises against');
  check(box.hasAttribute('hidden'), 'the listbox starts visible');

  combo.focus();
  press(combo, 'ArrowDown');
  check(c.open && combo.getAttribute('aria-expanded') === 'true', 'ArrowDown did not open the combobox');
  check(active() === combo, 'DOM focus moved off the combobox — the whole design is that it does not, or typing and the caret break');
  check(
    combo.getAttribute('aria-activedescendant') === options[0].id,
    'aria-activedescendant does not point at the highlighted option, so nothing knows where the cursor is',
  );
  check(options[0].hasAttribute('data-current'), 'the highlighted option has no data-current, so the CSS cannot draw the cursor');
  check(
    options.every((o) => o.getAttribute('aria-selected') === 'false'),
    'moving the cursor set aria-selected — that attribute marks the COMMITTED value, and writing it on every arrow press claims a choice the user has not made',
  );
  check(options[0]._scrolled === true, 'the active option was not scrolled into view; nothing scrolls an aria-activedescendant automatically, so a long list keeps its cursor off screen');

  press(combo, 'ArrowUp');
  check(combo.getAttribute('aria-activedescendant') === options[0].id, 'ArrowUp wrapped to the end of the listbox — a list this long must stop at the first option');

  press(combo, 'End');
  check(combo.getAttribute('aria-activedescendant') === options[11].id, 'End did not move to the last option');
  press(combo, 'PageUp');
  check(combo.getAttribute('aria-activedescendant') === options[1].id, 'PageUp did not move ten options back');
  press(combo, 'Home');
  check(combo.getAttribute('aria-activedescendant') === options[0].id, 'Home did not move to the first option');

  press(combo, 'Enter');
  check(!c.open && box.hasAttribute('hidden'), 'Enter did not close the listbox');
  check(combo.textContent === 'Apple', `Enter set the combobox to "${combo.textContent}" instead of the focused option`);
  check(options[0].getAttribute('aria-selected') === 'true', 'the committed option is not marked aria-selected');
  check(options.filter((o) => o.getAttribute('aria-selected') === 'true').length === 1, 'more than one option is marked selected in a single-select listbox');
  check(!combo.hasAttribute('aria-activedescendant'), 'a closed combobox still points aria-activedescendant at an option inside a display:none subtree');
  c.destroy();
}

{
  const { wrap, combo, box, options } = makeSelect();
  const c = combobox(wrap);
  combo.focus();
  press(combo, 'g');
  check(c.open, 'typing a character did not open the closed combobox');
  check(combo.getAttribute('aria-activedescendant') === options[8].id, 'typeahead from the closed state did not jump to Gooseberry');
  press(combo, 'g');
  check(combo.getAttribute('aria-activedescendant') === options[9].id, 'a repeated letter did not cycle to Grape');

  press(combo, 'Escape');
  check(!c.open, 'Escape did not close the combobox');
  check(combo.textContent === 'Choose…', 'Escape committed a value — it must dismiss without choosing');

  press(combo, 'ArrowDown');
  press(combo, 'ArrowDown');
  const tab = press(combo, 'Tab');
  check(combo.textContent === 'Apricot', `Tab left the combobox showing "${combo.textContent}" — the APG says Tab commits the focused option before it moves on`);
  check(!c.open && !tab.defaultPrevented, 'Tab was swallowed, so focus never leaves the combobox');
  c.destroy();
}

{
  const { wrap, combo, box, options } = makeSelect();
  const c = combobox(wrap);
  combo.focus();
  press(combo, 'ArrowDown');
  press(combo, 'ArrowDown');
  const outside = h('button', {}, 'elsewhere');
  body.append(outside);
  outside.focus();
  check(!c.open, 'clicking away left the listbox open');
  check(combo.textContent === 'Apricot', 'a select-only combobox did not commit its focused option on the way out, which is what a native select does');
  c.destroy();
}

{
  const { wrap, combo, box, options } = makeSelect();
  const c = combobox(wrap);
  combo.focus();
  press(combo, 'ArrowDown');
  options[4].click();
  check(combo.textContent === 'Cherry', 'clicking an option did not commit it');
  check(!c.open, 'clicking an option did not close the listbox');
  check(active() === combo, 'clicking an option left focus somewhere other than the combobox');
  c.destroy();
}

/* ══ 5. combobox, editable ═════════════════════════════════════════════════════ */

const makeEditable = () => {
  const wrap = h('div', { class: 'n-combobox' });
  body.append(wrap);
  const combo = h('input', { class: 'n-input' });
  const box = h('div', { class: 'n-listbox' });
  const status = h('p', { role: 'status', class: 'n-sr-only' });
  wrap.append(combo, box, status);
  for (const f of FRUIT) box.append(h('div', { class: 'n-option' }, f));
  return { wrap, combo, box, status, options: box.children };
};

{
  const { wrap, combo, box, status, options } = makeEditable();
  const c = combobox(wrap);

  check(c.editable, 'an <input role="combobox"> was not detected as editable');
  check(combo.getAttribute('aria-autocomplete') === 'list', `an editable combobox reports aria-autocomplete="${combo.getAttribute('aria-autocomplete')}" instead of "list"`);

  combo.focus();
  const space = press(combo, ' ');
  check(!c.open && !space.defaultPrevented, 'Space opened an editable combobox — a space is a character there, and swallowing it makes the field impossible to type in');
  const home = press(combo, 'Home');
  check(!home.defaultPrevented, 'Home was captured by an editable combobox, so the user cannot get the caret to the start of their own typing');
  const end = press(combo, 'End');
  check(!end.defaultPrevented, 'End was captured by an editable combobox');
  const letter = press(combo, 'b');
  check(!letter.defaultPrevented, 'a printable character was captured by an editable combobox — the APG warns explicitly that this breaks browser text editing and every IME');

  combo.value = 'ap';
  combo.dispatchEvent(new Ev('input', { bubbles: true }));
  check(c.open, 'typing did not open the listbox');
  check(
    labels(options.filter((o) => !o.hasAttribute('hidden'))).join(',') === 'Apple,Apricot',
    `filtering left ${labels(options.filter((o) => !o.hasAttribute('hidden'))).join(',')} visible for "ap"`,
  );
  check(status.textContent === '2 results', `the result count reads "${status.textContent}" instead of "2 results"`);
  check(!combo.hasAttribute('aria-activedescendant'), 'filtering auto-highlighted an option, so Enter would commit a value the user never looked at');

  press(combo, 'ArrowDown');
  check(combo.getAttribute('aria-activedescendant') === options[0].id, 'ArrowDown after filtering did not land on the first match');
  press(combo, 'ArrowDown');
  check(
    combo.getAttribute('aria-activedescendant') === options[1].id,
    'the arrow keys walked into a filtered-out option — the cursor must only visit options the user can see',
  );
  press(combo, 'Enter');
  check(combo.value === 'Apricot', `Enter set the input to "${combo.value}" instead of the focused option`);

  combo.value = 'zzz';
  combo.dispatchEvent(new Ev('input', { bubbles: true }));
  check(!c.open, 'a filter with no matches left an empty listbox on screen');
  check(status.textContent === 'No results', `an empty result set reads "${status.textContent}"`);
  c.destroy();
}

{
  const { wrap, combo } = makeEditable();
  const c = combobox(wrap);
  combo.focus();
  press(combo, 'ArrowDown');
  press(combo, 'ArrowDown');
  combo.value = 'half typed';
  const outside = h('button', {}, 'elsewhere');
  body.append(outside);
  outside.focus();
  check(!c.open, 'the listbox stayed open after focus left the editable combobox');
  check(
    combo.value === 'half typed',
    `focus leaving an editable combobox overwrote the user's text with "${combo.value}" — that is data loss, and only the select-only shape commits on blur`,
  );
  c.destroy();
}

/* ══ 6. slider ═════════════════════════════════════════════════════════════════ */

const makeSlider = (attrs = {}) => {
  const wrap = h('div', { class: 'n-slider' });
  body.append(wrap);
  const track = h('div', { class: 'n-slider-track' }, h('div', { class: 'n-slider-fill' }));
  const thumb = h('div', { class: 'n-slider-thumb', role: 'slider', ...attrs });
  wrap.append(track, thumb);
  return { wrap, thumb };
};

{
  const { wrap, thumb } = makeSlider({ 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '40' });
  const s = slider(wrap);

  check(thumb.getAttribute('tabindex') === '0', 'a role="slider" element was left unfocusable — it announces a slider that cannot be operated');
  check(thumb.getAttribute('aria-valuenow') === '40', 'aria-valuenow was not initialised from the markup');
  check(wrap.style.getPropertyValue('--n-slider-pct') === '40%', `the track fill is at "${wrap.style.getPropertyValue('--n-slider-pct')}" instead of 40% — the thumb and the value disagree`);

  const right = press(thumb, 'ArrowRight');
  check(s.value === 41, `ArrowRight moved the value to ${s.value} instead of one step up`);
  check(right.defaultPrevented, 'the arrow keys were not preventDefault-ed, so the page scrolls instead of the slider moving');
  press(thumb, 'ArrowUp');
  check(s.value === 42, 'ArrowUp did not increase the value');
  press(thumb, 'ArrowLeft');
  press(thumb, 'ArrowDown');
  check(s.value === 40, 'ArrowLeft and ArrowDown did not decrease the value');

  press(thumb, 'PageUp');
  check(s.value === 50, `PageUp moved to ${s.value} instead of a tenth of the range`);
  press(thumb, 'PageDown');
  check(s.value === 40, 'PageDown did not move back a tenth of the range');

  press(thumb, 'End');
  check(s.value === 100 && thumb.getAttribute('aria-valuenow') === '100', 'End did not go to the maximum');
  press(thumb, 'ArrowRight');
  check(s.value === 100, 'the value went past aria-valuemax');
  press(thumb, 'Home');
  check(s.value === 0, 'Home did not go to the minimum');
  press(thumb, 'ArrowLeft');
  check(s.value === 0, 'the value went below aria-valuemin');
  s.destroy();
}

{
  let heard = null;
  const { wrap, thumb } = makeSlider({ 'aria-valuemin': '0', 'aria-valuemax': '1', 'aria-valuenow': '0.2', 'data-step': '0.1' });
  wrap.addEventListener('input', (e) => { heard = e.detail.value; });
  const s = slider(wrap, { format: (v) => `${Math.round(v * 100)} per cent` });
  press(thumb, 'ArrowRight');
  check(s.value === 0.3, `a 0.1 step produced ${s.value} — float drift is showing through into aria-valuenow`);
  check(thumb.getAttribute('aria-valuetext') === '30 per cent', `aria-valuetext reads "${thumb.getAttribute('aria-valuetext')}" — the units belong here, never in aria-valuenow`);
  check(/^[\d.]+$/.test(thumb.getAttribute('aria-valuenow')), 'aria-valuenow is not a bare decimal number');
  check(heard === 0.3, 'the slider did not fire a bubbling input event, so a form cannot treat it like a native range input');
  s.destroy();
}

{
  const { wrap, thumb } = makeSlider({ 'aria-orientation': 'vertical', 'aria-valuemin': '0', 'aria-valuemax': '10', 'aria-valuenow': '5' });
  const s = slider(wrap);
  press(thumb, 'ArrowUp');
  check(s.value === 6, 'ArrowUp decreased a vertical slider — the APG has no orientation clause: Up and Right always increase');
  press(thumb, 'ArrowDown');
  press(thumb, 'ArrowDown');
  check(s.value === 4, 'ArrowDown did not decrease a vertical slider');
  s.destroy();
}

/* ══ 7. enhance() ══════════════════════════════════════════════════════════════ */

{
  const page = h('div');
  body.append(page);
  const { tl } = (() => {
    const w = h('div');
    page.append(w);
    const t = h('div', { class: 'n-tabs' });
    w.append(t);
    for (const n of ['One', 'Two']) t.append(h('button', { class: 'n-tab' }, n));
    return { tl: t };
  })();
  const cb = h('div', { class: 'n-combobox' });
  page.append(cb);
  cb.append(h('div', { class: 'n-combobox-value' }, 'pick'), (() => {
    const b = h('div', { class: 'n-listbox' });
    b.append(h('div', { class: 'n-option' }, 'x'), h('div', { class: 'n-option' }, 'y'));
    return b;
  })());
  const sl = h('div', { class: 'n-slider' });
  page.append(sl);
  sl.append(h('div', { class: 'n-slider-thumb', role: 'slider', 'aria-valuenow': '3' }));
  const pop = h('div', { class: 'n-pop n-menu', popover: '', id: 'em1' });
  page.append(h('button', { popovertarget: 'em1' }, 'x'), pop);
  pop.append(h('button', { class: 'n-menu-item' }, 'Only'));

  const wired = enhance(page);
  check(wired.tabs.length === 1, `enhance() found ${wired.tabs.length} tablists, expected 1`);
  check(wired.comboboxes.length === 1, `enhance() found ${wired.comboboxes.length} comboboxes, expected 1`);
  check(wired.sliders.length === 1, `enhance() found ${wired.sliders.length} sliders, expected 1 — a thumb inside a wired wrapper must not be wired twice`);
  check(wired.menus.length === 1, `enhance() found ${wired.menus.length} menus, expected 1`);
  check(tl.getAttribute('role') === 'tablist', 'enhance() did not give .n-tabs its role');

  const again = enhance(page);
  check(
    again.all.length === 0,
    `a second enhance() wired ${again.all.length} widgets again — every arrow press would now move two tabs, because both handlers fire`,
  );

  wired.destroy();
  check(page.querySelectorAll('[data-n-wired]').length === 0, 'destroy() left its marker attributes behind, so nothing can be re-wired');
}

/* ══ 8. the stylesheet ═════════════════════════════════════════════════════════ */

/* Job 2 of prove.test.mjs, applied to the new file: assert things about the SHIPPED
 * artefact rather than about the intent. A var() naming a token that does not exist
 * resolves to nothing and paints nothing, and no amount of JS testing sees it. */
const widgets = readFileSync(join(root, 'nilam.widgets.css'), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const declared = new Set();
for (const file of ['nilam.tokens.css', 'nilam.scale.css']) {
  for (const m of readFileSync(join(root, file), 'utf8').matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
}

check(/@layer nilam\.components\s*\{/.test(widgets), 'nilam.widgets.css is not inside @layer nilam.components, so it does not sit in the documented cascade order');

const body_ = strip(widgets);
for (const m of body_.matchAll(/var\(\s*(--[\w-]+)/g)) {
  const name = m[1];
  // --n-slider-pct is written by slider.mjs at runtime, so it is declared nowhere.
  if (name === '--n-slider-pct') continue;
  check(declared.has(name), `nilam.widgets.css uses var(${name}), which no token file declares — it will resolve to nothing and paint nothing`);
}

const hex = body_.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
check(hex.length === 0, `nilam.widgets.css hard-codes ${hex.join(', ')} — a colour outside the solved palette is a colour nothing proved`);
check(!/\boklch\(/.test(body_), 'nilam.widgets.css declares a raw oklch() colour instead of using a solved token');

/* The house rule from nilam.components.css: colour is never the only channel. Selection
 * inside a listbox is a state, so it needs a glyph the way every status badge does. */
check(
  /\.n-option\[aria-selected='true'\]::after/.test(body_),
  'a selected option is distinguished by colour alone — every other state in this system carries a second channel (WCAG 1.4.1)',
);
check(
  /\[aria-expanded='true'\]/.test(body_),
  'the combobox open state is not styled off aria-expanded — reading the attribute is what stops an inaccessible widget from looking correct',
);
check(/touch-action:\s*none/.test(body_), 'the slider does not set touch-action, so dragging it scrolls the page instead');

/* ══ report ════════════════════════════════════════════════════════════════════ */

console.log('\nnilam — behaviours: APG keyboard contracts for tabs, menu, combobox and slider');
console.log('  DOM is the stub in this file. Nothing here has been run against a screen reader.');
console.log(`\n  ${pass + fails.length} assertions`);
if (fails.length) {
  console.log(`  ${fails.length} FAILED:`);
  for (const f of fails) console.log(`    - ${f}`);
  process.exit(1);
}
console.log('  all passed');
