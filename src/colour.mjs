/* Colour maths for nilam. Hand-written, zero dependencies.
 *
 * Everything here is reversible and testable, because the solver in solve.mjs
 * does not pick colours and then check them — it INVERTS the requirement to find
 * the colour. That only works if the forward and backward transforms agree, so
 * this file exists to be pinned by tests rather than trusted.
 *
 * Three coordinate systems, and it matters which one you are in:
 *
 *   sRGB gamma     what a hex code is, what a browser composites in
 *   linear sRGB    what WCAG luminance is computed from
 *   OKLab / OKLCH  where lightness is perceptually even, so a ramp can be reasoned about
 *
 * Matrices are Bjorn Ottosson's: https://bottosson.github.io/posts/oklab/
 */

/* ── sRGB transfer function ──────────────────────────────────────────── */

export const gammaEncode = (v) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

export const gammaDecode = (v) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

/* ── OKLCH -> linear sRGB ────────────────────────────────────────────── */

/** Deliberately unclamped: a channel outside [0,1] means out of gamut, and the
 *  caller needs to know rather than be silently handed a clipped colour. */
export function oklchToLinear({ L, C, h }) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/* ── linear sRGB -> OKLCH, the inverse ───────────────────────────────── */

export function linearToOklch({ r, g, b }) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

export const oklchToOklab = ({ L, C, h }) => {
  const hr = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(hr), b: C * Math.sin(hr) };
};

/* ── gamut ───────────────────────────────────────────────────────────── */

const EPS = 1e-4;

export const inGamut = (c) => {
  const { r, g, b } = oklchToLinear(c);
  return Math.min(r, g, b) >= -EPS && Math.max(r, g, b) <= 1 + EPS;
};

/** The largest chroma that still fits in sRGB at this lightness and hue.
 *  Bisection, because the gamut boundary has no closed form. */
export function maxChroma(L, h) {
  let lo = 0;
  let hi = 0.5;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ L, C: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

/* ── WCAG 2.x luminance and contrast ─────────────────────────────────────
 *
 * WCAG 2.2 AA is the operative standard and is now ISO/IEC 40500:2025. APCA was
 * removed from the normative WCAG 3.0 draft in 2023 and the algorithm there is
 * still marked "to be determined", with Recommendation not expected before the
 * end of the decade. So this is WCAG 2.x on purpose, not by omission.
 *
 * Its known weakness is real and worth stating: the 2.x formula under-penalises
 * some dark-on-dark pairs. The answer here is margin — every floor in solve.mjs
 * is met with headroom rather than exactly.
 */

export function luminance(c) {
  const { r, g, b } = oklchToLinear(c);
  const k = (v) => Math.min(1, Math.max(0, v));
  return 0.2126 * k(r) + 0.7152 * k(g) + 0.0722 * k(b);
}

export function contrast(a, b) {
  const ya = luminance(a);
  const yb = luminance(b);
  const [hi, lo] = ya >= yb ? [ya, yb] : [yb, ya];
  return (hi + 0.05) / (lo + 0.05);
}

/* ── colour vision deficiency ────────────────────────────────────────────
 *
 * THIS IS THE FILE'S REASON TO EXIST.
 *
 * The honest case against colour-coding anything is that ~8% of men cannot
 * separate the hues you chose. Every design system answers that with advice —
 * "don't rely on colour alone" — and then ships a red/green semantic pair
 * anyway, unverified.
 *
 * These are the Machado, Oliveira & Fernandes (2009) severity-1.0 matrices,
 * applied in LINEAR sRGB. They let prove.mjs assert that the semantic set stays
 * mutually distinguishable under all three dichromacies, which turns "use colour
 * carefully" from guidance into a test that fails.
 */

const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const CVD_TYPES = Object.keys(CVD);

/** Simulate a dichromacy and return the result back in OKLCH. */
export function simulate(colour, type) {
  const M = CVD[type];
  if (!M) throw new Error(`unknown CVD type: ${type}`);
  const { r, g, b } = oklchToLinear(colour);
  const k = (v) => Math.min(1, Math.max(0, v));
  const lin = {
    r: k(M[0][0] * r + M[0][1] * g + M[0][2] * b),
    g: k(M[1][0] * r + M[1][1] * g + M[1][2] * b),
    b: k(M[2][0] * r + M[2][1] * g + M[2][2] * b),
  };
  return linearToOklch(lin);
}

/** Perceptual distance in OKLab. Used for "can these two be told apart".
 *  OKLab is roughly uniform, so plain Euclidean distance is defensible here —
 *  no CIEDE2000 weighting needed, and none of its discontinuities either. */
export function distance(a, b) {
  const p = oklchToOklab(a);
  const q = oklchToOklab(b);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

/* ── formatting ──────────────────────────────────────────────────────── */

export const fmt = ({ L, C, h }) =>
  `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${h.toFixed(1)})`;

export function toHex(colour) {
  const { r, g, b } = oklchToLinear(colour);
  const k = (v) => Math.round(Math.min(1, Math.max(0, gammaEncode(Math.min(1, Math.max(0, v))))) * 255);
  return '#' + [k(r), k(g), k(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ── the inversion the solver is built on ────────────────────────────────
 *
 * Every other system picks a colour and then measures it. This finds the
 * lightness that HITS a contrast target, so the contract holds by construction
 * rather than by luck.
 *
 * Bisection on L, because contrast is monotonic in L on either side of the
 * reference once the direction is fixed. `chromaAt` decides how much colour to
 * carry at each candidate lightness — passing a function lets the caller ask for
 * "as saturated as sRGB allows" or "a whisper of the hue" without changing this.
 */
export function solveLightness({ target, against, hue, direction, chromaAt, lo = 0, hi = 1 }) {
  const at = (L) => ({ L, C: chromaAt(L, hue), h: hue });
  const ratio = (L) => contrast(at(L), against);

  // Widen toward the achievable end first, so an impossible target reports the
  // best it could do rather than silently returning a midpoint.
  let a = lo;
  let b = hi;
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2;
    const r = ratio(mid);
    const brighter = direction === 'lighter';
    if (r >= target) {
      // Enough contrast — move back toward the reference to keep the colour rich.
      if (brighter) b = mid;
      else a = mid;
    } else if (brighter) a = mid;
    else b = mid;
  }
  const L = direction === 'lighter' ? b : a;
  return at(L);
}

/* sRGB hex in, OKLCH out. Needed to MEASURE a colour you already have — which is how
 * GLOW_L was found, and how you check whether a palette you inherited is legal. */
export function hexToOklch(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => gammaDecode(v / 255));
  return linearToOklch({ r: ch[0], g: ch[1], b: ch[2] });
}
