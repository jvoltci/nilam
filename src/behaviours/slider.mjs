/* nilam — slider, single thumb.
 *
 * ── use <input type="range"> unless you cannot ────────────────────────────────
 *
 * Native range inputs already have every key below, work with touch assistive
 * technology, submit with a form and need no JavaScript at all. This module exists for
 * the cases the native element still cannot do:
 *
 *   - a value that must be SPOKEN differently from how it is stored — "£1,200 per month",
 *     "4 of 5 stars", "2 minutes 14 seconds". That is aria-valuetext, and <input
 *     type="range"> has no equivalent.
 *   - a track you need to decorate — ticks, a filled range in a specific token, a thumb
 *     that is not a circle — beyond what ::-webkit-slider-thumb will let you reach.
 *
 * If neither applies, reach for the native element. The component layer's own philosophy
 * is that the platform grew the hard parts; this file is the exception, not the pattern.
 *
 * ── what the APG corrected ────────────────────────────────────────────────────
 *
 * UP ARROW INCREASES, ALWAYS. On a vertical slider I would have made Up move the thumb
 * up the track and therefore, in a bottom-anchored fill, increase — but I would have
 * reasoned about it visually and reasoned wrong on any track drawn top-down. The APG has
 * no orientation clause at all: "Right Arrow / Up Arrow: Increase the value of the slider
 * by one step." Direction of increase is a property of the KEY, not of the layout.
 *
 * aria-valuenow IS A DECIMAL NUMBER. Not "60%", not "£1,200". The units, the currency and
 * the formatting all belong in aria-valuetext; putting them in valuenow makes the value
 * unparseable to anything that wants to compute with it.
 *
 * HOME AND END ARE "the first / last allowed value in its range", not literally min and
 * max. For a normal ascending range those are the same thing, which is why this code
 * writes min and max — but the wording is what tells you a descending range would swap
 * them.
 *
 * And the standing warning the APG attaches to every slider example, which is not a
 * theoretical one: "Some users of touch-based assistive technologies may experience
 * difficulty utilizing widgets that implement this slider pattern because the gestures
 * their assistive technology provides for operating sliders may not yet generate the
 * necessary output." Nothing here fixes that. It is the strongest single argument for the
 * native element.
 */

/** How many decimal places a step implies, so 0.1 + 0.2 never surfaces as 0.30000000000000004. */
const decimalsOf = (step) => {
  const s = String(step);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
};

const numAttr = (el, name, fallback) => {
  const raw = el.getAttribute(name);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * @param root           the .n-slider wrapper, or the [role="slider"] thumb itself
 * @param opts.min       default: aria-valuemin, else 0
 * @param opts.max       default: aria-valuemax, else 100
 * @param opts.step      default: data-step, else 1
 * @param opts.bigStep   PageUp/PageDown distance; default a tenth of the range
 * @param opts.value     default: aria-valuenow, else min
 * @param opts.format    (value) => string, written to aria-valuetext
 * @param opts.onInput   (value) on every change
 */
export function slider(root, opts = {}) {
  const thumb = root.getAttribute?.('role') === 'slider'
    ? root
    : (root.querySelector('[role="slider"], .n-slider-thumb') ?? root);
  const wrapper = thumb === root ? (root.parentElement ?? root) : root;

  if (thumb.getAttribute('role') !== 'slider') thumb.setAttribute('role', 'slider');
  /* The APG's slider examples all put tabindex="0" on the slider element. Without it a
   * div with role="slider" is announced as a slider and cannot be operated — the worst of
   * both worlds, because it advertises an interaction it does not have. */
  if (!thumb.hasAttribute('tabindex')) thumb.setAttribute('tabindex', '0');

  const min = opts.min ?? numAttr(thumb, 'aria-valuemin', 0);
  const max = opts.max ?? numAttr(thumb, 'aria-valuemax', 100);
  const step = opts.step ?? numAttr(thumb, 'data-step', 1);
  const bigStep = opts.bigStep ?? Math.max(step, (max - min) / 10);
  const dp = Math.max(decimalsOf(step), decimalsOf(bigStep));
  const vertical = thumb.getAttribute('aria-orientation') === 'vertical';

  let value = opts.value ?? numAttr(thumb, 'aria-valuenow', min);

  const quantise = (v) => {
    const clamped = Math.min(max, Math.max(min, v));
    const snapped = min + Math.round((clamped - min) / step) * step;
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(dp));
  };

  const write = () => {
    thumb.setAttribute('aria-valuemin', String(min));
    thumb.setAttribute('aria-valuemax', String(max));
    thumb.setAttribute('aria-valuenow', String(value));
    if (opts.format) thumb.setAttribute('aria-valuetext', opts.format(value));
    /* The fill and the thumb offset are one custom property, set on the wrapper so both
     * the track and the thumb can read it. Doing it in CSS rather than writing inline
     * `left`/`inline-size` keeps the geometry in the stylesheet, which is where RTL,
     * vertical writing modes and the thumb's own width already live. */
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
    wrapper.style?.setProperty?.('--n-slider-pct', `${pct}%`);
  };

  const set = (v, { notify = true } = {}) => {
    const next = quantise(v);
    if (next === value) { write(); return value; }
    value = next;
    write();
    if (notify) {
      opts.onInput?.(value);
      /* A bubbling `input` event, deliberately the same name the native range input
       * fires, so a page can listen once on a form and not care which of its sliders is
       * native and which is not. */
      thumb.dispatchEvent?.(new CustomEvent('input', { bubbles: true, detail: { value } }));
    }
    return value;
  };

  const onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let next = null;
    switch (event.key) {
      case 'ArrowRight': case 'ArrowUp': next = value + step; break;
      case 'ArrowLeft': case 'ArrowDown': next = value - step; break;
      case 'PageUp': next = value + bigStep; break;
      case 'PageDown': next = value - bigStep; break;
      case 'Home': next = min; break;
      case 'End': next = max; break;
      default: return;
    }
    // preventDefault on all six: arrows and Page keys scroll the page, and Home/End jump
    // to the top and bottom of the document. Any of those makes the slider feel broken.
    event.preventDefault();
    set(next);
  };

  /* Pointer dragging. Kept because a slider that can only be operated by keyboard is not
   * a slider, but deliberately thin: one pointerdown on the track, setPointerCapture so
   * the drag survives leaving the element, and no pointer-event maths anywhere else.
   *
   * getBoundingClientRect is guarded because this module has to be importable in a bare
   * DOM with no layout — the test suite runs it there. */
  const valueFromPointer = (event) => {
    const box = wrapper.getBoundingClientRect?.();
    if (!box || !box.width) return null;
    const ratio = vertical
      ? 1 - (event.clientY - box.top) / box.height
      : (event.clientX - box.left) / box.width;
    return min + ratio * (max - min);
  };

  let dragging = false;

  const onPointerDown = (event) => {
    const v = valueFromPointer(event);
    if (v == null) return;
    dragging = true;
    thumb.setPointerCapture?.(event.pointerId);
    thumb.focus?.();
    set(v);
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (!dragging) return;
    const v = valueFromPointer(event);
    if (v != null) set(v);
  };
  const onPointerUp = () => { dragging = false; };

  thumb.addEventListener('keydown', onKeyDown);
  wrapper.addEventListener('pointerdown', onPointerDown);
  thumb.addEventListener('pointermove', onPointerMove);
  thumb.addEventListener('pointerup', onPointerUp);
  thumb.addEventListener('pointercancel', onPointerUp);

  set(value, { notify: false });

  return {
    thumb,
    wrapper,
    min, max, step, bigStep, vertical,
    get value() { return value; },
    set,
    destroy() {
      thumb.removeEventListener('keydown', onKeyDown);
      wrapper.removeEventListener('pointerdown', onPointerDown);
      thumb.removeEventListener('pointermove', onPointerMove);
      thumb.removeEventListener('pointerup', onPointerUp);
      thumb.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
