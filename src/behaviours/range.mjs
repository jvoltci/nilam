/* nilam — range, two thumbs.
 *
 * ── this one has no native element to fall back to ────────────────────────────
 *
 * slider.mjs opens by telling you to use <input type="range"> instead, and it means it.
 * This file cannot say that: a range input has exactly ONE thumb, so "from 20 to 60" has
 * no native element at all. Two range inputs stacked on one track is the usual workaround
 * and it is a different widget — each input is its own tab stop with its own fixed min and
 * max, so nothing stops the pair crossing and neither one can report what the OTHER
 * currently allows. That last part is the whole accessibility problem, and it is the part
 * a stack of two inputs cannot fix.
 *
 * So this is the second genuinely missing widget after the combobox, and the APG has a
 * pattern for it: Slider (Multi-Thumb).
 *
 * ── thumb crossing: CLAMPED, not swapped ─────────────────────────────────────
 *
 * This is the entire design question, and the APG describes both shapes rather than
 * picking for you: "in many two-thumb sliders, the thumbs are not allowed to pass one
 * another … the maximum value of the thumb that sets the lower end of the range is limited
 * by the current value of the thumb that sets the upper end", and separately, "in some
 * multi-thumb sliders, each thumb sets a value that does not depend on the other thumb
 * values."
 *
 * Clamped, and the reason is not aesthetic. Swapping means the element under the user's
 * finger changes identity mid-gesture: the thumb named "Minimum" becomes the maximum, so
 * its accessible name is now wrong, and the APG's constant-tab-order rule — "The tab order
 * remains constant regardless of thumb value and visual position within the slider" — is
 * either broken or has to be repaired by moving DOM focus to the other element while a
 * pointer is captured on this one. A keyboard user holding ArrowRight would hear the thumb
 * they are operating rename itself halfway through. Clamping costs exactly one thing, that
 * a range cannot be inverted by dragging through, and keeps every name, every bound and
 * the tab order stable.
 *
 * The clamp is worth nothing without its second half. Each thumb's aria-valuemin and
 * aria-valuemax carry the LIVE constraint, rewritten on every change, because the APG
 * requires it — "When the range of another slider is dependent on the current value of a
 * slider, the values of aria-valuemin or aria-valuemax of the dependent sliders are
 * updated when the value changes" — and because a thumb that announces "0 to 400" and then
 * stops dead at 250 is a control lying about itself. The APG's own example ships those
 * numbers: its lower thumb is aria-valuemin="0" aria-valuemax="250" while the upper thumb
 * sits at 250, and its upper thumb is aria-valuemin="100" aria-valuemax="400" while the
 * lower sits at 100.
 *
 * ── what else the APG corrected ───────────────────────────────────────────────
 *
 * BOTH THUMBS ARE TAB STOPS. "Each thumb is in the page tab sequence and has the keyboard
 * interactions described in the Slider Pattern." A composite widget of two focusable parts
 * is exactly the shape roving.mjs exists for, so a roving tabindex — one stop for the pair,
 * arrows to change thumb — is the reflex. It is wrong here: it would take one of the two
 * thumbs out of Tab, and the arrow keys are already spoken for by the value.
 *
 * HOME AND END ARE THE THUMB'S OWN BOUND. The slider pattern says "the first / last allowed
 * value in its range", and under clamping the allowed bound at one end of each thumb IS the
 * other thumb. The APG example reads valueMin/valueMax straight off the thumb's own live
 * attributes to do it, so End on the lower thumb parks it against the upper one rather than
 * jumping to max.
 *
 * BOTH THUMBS NEED THEIR OWN NAME. Two role="slider" elements with no name are announced as
 * "slider, slider" and a screen-reader user cannot tell which end of the range they are
 * holding. The APG example names them "Hotel Minimum Price in US dollars" and "Hotel
 * Maximum Price in US dollars".
 *
 * Up Arrow increases regardless of orientation, and aria-valuenow stays a bare decimal:
 * both inherited from slider.mjs, both for the reasons written there.
 *
 * And the same standing warning, unchanged and unfixed by any of this: "Some users of
 * touch-based assistive technologies may experience difficulty utilizing widgets that
 * implement this slider pattern because the gestures their assistive technology provides
 * for operating sliders may not yet generate the necessary output."
 */

/* The same two helpers as slider.mjs, copied. Ten lines, and the alternatives are a third
 * module for them or an import that would imply these two state machines are built on each
 * other, which they are not. If a third numeric widget appears, extract them then. */

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

/* Fallback names, used only when the markup gives a thumb none. Generic on purpose: they
 * are the floor, not the goal — "Minimum price" tells a user what they are holding and
 * "Minimum" only tells them which end. */
const LABELS = ['Minimum', 'Maximum'];

/**
 * @param root           the .n-range wrapper
 * @param opts.min       default: the LOWER thumb's aria-valuemin, else 0
 * @param opts.max       default: the UPPER thumb's aria-valuemax, else 100
 * @param opts.step      default: data-step on the wrapper or a thumb, else 1
 * @param opts.bigStep   PageUp/PageDown distance; default a tenth of the range
 * @param opts.from      default: the lower thumb's aria-valuenow, else min
 * @param opts.to        default: the upper thumb's aria-valuenow, else max
 * @param opts.labels    fallback accessible names, default ['Minimum', 'Maximum']
 * @param opts.format    (value, which) => string, written to aria-valuetext
 * @param opts.onInput   ({ from, to, which, value }) on every change
 */
export function range(root, opts = {}) {
  const thumbs = [...root.querySelectorAll('[role="slider"], .n-range-thumb')];
  /* Loud, like combobox() with no listbox. A .n-range with one thumb is not a degraded
   * range, it is a slider whose author reached for the wrong function. */
  if (thumbs.length < 2) {
    throw new Error('range(): needs two [role="slider"] thumbs inside the wrapper — one thumb is a slider()');
  }
  const [lower, upper] = thumbs;
  const wrapper = root;

  for (const [i, thumb] of [lower, upper].entries()) {
    if (thumb.getAttribute('role') !== 'slider') thumb.setAttribute('role', 'slider');
    if (!thumb.hasAttribute('tabindex')) thumb.setAttribute('tabindex', '0');
    if (!thumb.hasAttribute('aria-label') && !thumb.hasAttribute('aria-labelledby')) {
      thumb.setAttribute('aria-label', (opts.labels ?? LABELS)[i]);
    }
    /* The hook the CSS positions on. Written here rather than required in the markup for
     * the same reason the vertical variant reads aria-orientation: this module decides
     * which thumb is which, from DOM order, so the stylesheet cannot disagree with it. */
    thumb.setAttribute('data-n-range', i === 0 ? 'from' : 'to');
  }

  /* The outer bounds come from opposite thumbs — min off the lower, max off the upper —
   * because under clamping those are the two attributes that are NOT the live constraint.
   * It is also the shape of the APG example's markup, so correct markup reads correctly. */
  const min = opts.min ?? numAttr(lower, 'aria-valuemin', 0);
  const max = opts.max ?? numAttr(upper, 'aria-valuemax', 100);
  const step = opts.step ?? numAttr(wrapper, 'data-step', numAttr(lower, 'data-step', 1));
  const bigStep = opts.bigStep ?? Math.max(step, (max - min) / 10);
  const dp = Math.max(decimalsOf(step), decimalsOf(bigStep));
  const vertical = lower.getAttribute('aria-orientation') === 'vertical';

  let from = opts.from ?? numAttr(lower, 'aria-valuenow', min);
  let to = opts.to ?? numAttr(upper, 'aria-valuenow', max);
  /* Markup that starts crossed is an author error, and ordering the two numbers is the only
   * lossless repair — clamping one onto the other would collapse the range to a point. This
   * runs once; after it the clamp in set() makes crossing unreachable. */
  if (from > to) { const swap = from; from = to; to = swap; }

  const quantise = (v, lo, hi) => {
    const clamped = Math.min(hi, Math.max(lo, v));
    const snapped = min + Math.round((clamped - min) / step) * step;
    return Number(Math.min(hi, Math.max(lo, snapped)).toFixed(dp));
  };

  const write = () => {
    lower.setAttribute('aria-valuemin', String(min));
    lower.setAttribute('aria-valuemax', String(to));
    lower.setAttribute('aria-valuenow', String(from));
    upper.setAttribute('aria-valuemin', String(from));
    upper.setAttribute('aria-valuemax', String(max));
    upper.setAttribute('aria-valuenow', String(to));
    if (opts.format) {
      lower.setAttribute('aria-valuetext', opts.format(from, 'from'));
      upper.setAttribute('aria-valuetext', opts.format(to, 'to'));
    }
    /* Two custom properties, both on the wrapper, so the selected span between the thumbs
     * and the thumbs themselves all read the same numbers. Nothing here writes a `left` or
     * an `inline-size`: the geometry, and with it RTL and the vertical variant, stays in
     * the stylesheet. */
    const pct = (v) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
    wrapper.style?.setProperty?.('--n-range-from', `${pct(from)}%`);
    wrapper.style?.setProperty?.('--n-range-to', `${pct(to)}%`);
  };

  /**
   * @param which  'from' | 'to'
   */
  const set = (which, v, { notify = true } = {}) => {
    const up = which === 'to';
    // The clamp itself: the lower thumb's ceiling is the upper thumb's value, and back.
    const next = up ? quantise(v, from, max) : quantise(v, min, to);
    const current = up ? to : from;
    if (next === current) { write(); return current; }
    if (up) to = next; else from = next;
    write();
    if (notify) {
      opts.onInput?.({ from, to, which, value: next });
      /* One bubbling `input` event, the same name the native range input fires and the same
       * name slider.mjs fires, so a page can listen once on a form. detail carries both
       * ends plus which one moved — a range has no single "value" to report. */
      const thumb = up ? upper : lower;
      thumb.dispatchEvent?.(new CustomEvent('input', {
        bubbles: true,
        detail: { from, to, which, value: next },
      }));
    }
    return next;
  };

  const keyHandler = (which) => (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const up = which === 'to';
    const value = up ? to : from;
    // This thumb's ALLOWED bounds, which is what Home and End mean here.
    const lo = up ? from : min;
    const hi = up ? max : to;
    let next = null;
    switch (event.key) {
      case 'ArrowRight': case 'ArrowUp': next = value + step; break;
      case 'ArrowLeft': case 'ArrowDown': next = value - step; break;
      case 'PageUp': next = value + bigStep; break;
      case 'PageDown': next = value - bigStep; break;
      case 'Home': next = lo; break;
      case 'End': next = hi; break;
      default: return;
    }
    // All six, for the reason slider.mjs gives: arrows and the Page keys scroll the page and
    // Home/End jump to the ends of the document, any of which makes the control feel broken.
    event.preventDefault();
    set(which, next);
  };
  const onKeyFrom = keyHandler('from');
  const onKeyTo = keyHandler('to');

  /* getBoundingClientRect is guarded because this module has to be importable in a bare DOM
   * with no layout — the test suite runs it there. */
  const valueFromPointer = (event) => {
    const box = wrapper.getBoundingClientRect?.();
    const size = box ? (vertical ? box.height : box.width) : 0;
    if (!size) return null;
    const ratio = vertical
      ? 1 - (event.clientY - box.top) / size
      : (event.clientX - box.left) / size;
    return min + ratio * (max - min);
  };

  /* Which thumb a press grabs: the nearest by value. The tie is the case that matters. With
   * both thumbs piled on the same value the distances are equal, and picking the one the
   * clamp will not let move makes the control look dead — press, drag, nothing, forever. So
   * on an exact tie the side the pointer is on decides, which is always the thumb with room:
   * above the pile only the upper can rise, below it only the lower can fall. */
  const pick = (v) => {
    const dFrom = Math.abs(v - from);
    const dTo = Math.abs(v - to);
    if (dFrom !== dTo) return dFrom < dTo ? 'from' : 'to';
    return v > from ? 'to' : 'from';
  };

  let active = null;

  const onPointerDown = (event) => {
    const v = valueFromPointer(event);
    if (v == null) return;
    active = pick(v);
    const thumb = active === 'to' ? upper : lower;
    thumb.setPointerCapture?.(event.pointerId);
    thumb.focus?.();
    set(active, v);
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (!active) return;
    const v = valueFromPointer(event);
    if (v != null) set(active, v);
  };
  const onPointerUp = () => { active = null; };

  lower.addEventListener('keydown', onKeyFrom);
  upper.addEventListener('keydown', onKeyTo);
  wrapper.addEventListener('pointerdown', onPointerDown);
  /* The move and release listeners go on BOTH thumbs, because setPointerCapture retargets
   * the rest of the drag to whichever thumb was grabbed. */
  for (const thumb of [lower, upper]) {
    thumb.addEventListener('pointermove', onPointerMove);
    thumb.addEventListener('pointerup', onPointerUp);
    thumb.addEventListener('pointercancel', onPointerUp);
  }

  set('from', from, { notify: false });
  set('to', to, { notify: false });

  return {
    wrapper,
    thumbs: [lower, upper],
    lower,
    upper,
    min, max, step, bigStep, vertical,
    get from() { return from; },
    get to() { return to; },
    set,
    destroy() {
      lower.removeEventListener('keydown', onKeyFrom);
      upper.removeEventListener('keydown', onKeyTo);
      wrapper.removeEventListener('pointerdown', onPointerDown);
      for (const thumb of [lower, upper]) {
        thumb.removeEventListener('pointermove', onPointerMove);
        thumb.removeEventListener('pointerup', onPointerUp);
        thumb.removeEventListener('pointercancel', onPointerUp);
      }
    },
  };
}
