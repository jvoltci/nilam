/* The signature blue.
 *
 * The blue sweep taught the wrong lesson, so this is the second pass. Sweeping
 * hue at the solver's own lightness compared ten dark stains and asked which
 * stain I liked. The thing that separates a blue that GLOWS from one that looks
 * like pigment is lightness, not hue:
 *
 *   Zima Blue   #009fe3   L 0.667  C 0.147  h 238
 *   music app   #8b7cf6   L 0.657  C 0.176  h 286
 *   my solver   #6223f1   L 0.500  C 0.269  h 285
 *
 * The first two are 48° apart in hue and read as the same KIND of colour. Mine
 * is 1° from the second and reads as a completely different kind. Lightness is
 * doing the work.
 *
 * Which is a finding about the solver, not about taste. solveSolid() keeps "the
 * most chromatic legal colour", and in the blue half of the wheel maximum chroma
 * lives at low lightness — so the objective walks it away from the glow band every
 * time. Maximising chroma was the wrong objective.
 *
 *   node demo/signature.mjs > demo/signature.html
 */

import { solveScale, inkFor } from '../src/solve.mjs';
import { maxChroma, contrast, toHex, solveLightness } from '../src/colour.mjs';

/* The glow band. Held at the lightness both reference colours share, taking
 * whatever chroma sRGB allows at that lightness — so hue is the only variable
 * left and this is a fair comparison. */
const GLOW_L = 0.66;
const glowAt = (h) => ({ L: GLOW_L, C: maxChroma(GLOW_L, h) * 0.98, h });

/* The second brand moment. The glow cannot hold white text — at L 0.66 white is
 * only 3.0-3.3:1 against it — so a light-mode filled button needs a darker step of
 * the same hue. This is not a compromise, it is what the music app already does:
 * #6d5ce6 for the button, #8b7cf6 for the accent. One hue, two jobs. */
const solidAt = (h, page) => solveLightness({
  target: 4.6, against: { L: 1, C: 0, h },
  hue: h, direction: 'darker',
  chromaAt: (L, hue) => maxChroma(L, hue) * 0.95,
});

/* Ordered worst-to-best on the constraint that actually decides this, which is
 * 3:1 against a LIGHT page — WCAG 1.4.11, the floor for any non-text UI element.
 * A glow that misses it cannot be a focus ring or an active tab on a light page,
 * and that rules out the whole cyan half of the band no matter how good it looks. */
const CANDIDATES = [
  { h: 238, name: 'Zima', note: 'Zima Blue’s own hue — reference, not a candidate', ref: true },
  { h: 250, name: 'Caelo', note: 'Latin, “from the sky” — peak chroma of the blue side' },
  { h: 262, name: 'Ilma', note: 'Finnish for “air” — the last hue that still reads blue' },
  { h: 274, name: 'Viom', note: 'from व्योम vyom, “sky” — first hue that clears 3:1 on light' },
  { h: 285, name: 'Nilam', note: 'Sanskrit नीलम, “sapphire” — your music app’s hue, formalised', pick: true },
];

const rows = CANDIDATES.map((c) => {
  const glow = glowAt(c.h);
  const solid = solidAt(c.h);
  const dark = solveScale(c.h, 'dark');
  const light = solveScale(c.h, 'light');
  const nd = solveScale(c.h, 'dark', { neutral: true });
  const nl = solveScale(c.h, 'light', { neutral: true });
  return {
    ...c, glow, solid, dark, light, nd, nl,
    onDark: contrast(glow, nd[1]),
    onLight: contrast(glow, nl[1]),
    ink: toHex(inkFor(glow)),
  };
});

const strip = (s, n) => Array.from({ length: 12 }, (_, i) =>
  `<i style="background:${toHex(s[i + 1])}"></i>`).join('');

const card = (r) => `
<article class="cand${r.ref ? ' ref' : ''}${r.pick ? ' pick' : ''}" style="
  --glow:${toHex(r.glow)}; --ink:${toHex(r.glow).length ? r.ink : '#000'};
  --solid:${toHex(r.solid)};
  --d1:${toHex(r.nd[1])}; --d2:${toHex(r.nd[2])}; --d3:${toHex(r.nd[3])};
  --d6:${toHex(r.nd[6])}; --d7:${toHex(r.nd[7])}; --d11:${toHex(r.nd[11])}; --d12:${toHex(r.nd[12])};
  --l1:${toHex(r.nl[1])}; --l6:${toHex(r.nl[6])}; --l11:${toHex(r.nl[11])}; --l12:${toHex(r.nl[12])};
  --b3:${toHex(r.dark[3])}; --b8:${toHex(r.dark[8])};
">
  <div class="head">
    <div>
      <h2>${r.name}${r.pick ? ' <em>recommended</em>' : ''}</h2>
      <p>${r.note}</p>
    </div>
    <code>hue ${r.h}</code>
  </div>

  <!-- The deciding constraint, on the face of the card rather than buried in a
       column of ratios. Everything below 274 fails it. -->
  <p class="verdict ${r.onLight >= 3 ? 'pass' : 'fail'}">
    ${r.onLight >= 3 ? '✓' : '✗'} ${r.onLight.toFixed(2)}:1 on a light page —
    ${r.onLight >= 3 ? 'legal as a focus ring, tab or chip' : 'cannot be a non-text UI element there (WCAG 1.4.11)'}
  </p>

  <!-- The glow on its native ground. This is the whole argument: at L 0.66 on a
       dark page it is a ~6:1 beacon, and that is where this colour belongs. -->
  <div class="stage">
    <span class="swatch"></span>
    <div class="meta">
      <b>${toHex(r.glow)}</b>
      <span>C ${r.glow.C.toFixed(3)}</span>
      <span>${r.onDark.toFixed(2)}:1 on dark</span>
      ${r.pick ? '<span class="match">your app: #8b7cf6</span>' : ''}
    </div>
  </div>

  <div class="ui dark">
    <div class="pill">Overview</div>
    <div class="acts">
      <button class="glowbtn">Save changes</button>
      <button class="ghost">Cancel</button>
    </div>
    <p>Body text, and <a href="#">a link that carries the hue</a> in it.</p>
    <div class="focus">Focus ring, at the glow.</div>
  </div>

  <div class="ui light">
    <div class="acts">
      <button class="solidbtn">Save changes</button>
      <button class="ghostl">Cancel</button>
    </div>
    <p>The darker step, so white ink is legal at ${contrast({ L: 1, C: 0, h: r.h }, r.solid).toFixed(1)}:1.</p>
  </div>

  <!-- The dark ramp, straight from the unfixed solver. Step 9 here is the pigment
       value, NOT the glow above — which is the bug rendered rather than described. -->
  <div class="ramp">${strip(r.dark)}</div>
  <p class="caption">ramp from the current solver — note step 9 is the pigment, not the glow</p>
</article>`;

process.stdout.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>the signature blue</title>
<style>
  * { box-sizing:border-box; }
  body {
    margin:0; padding:44px 28px 100px; background:#0a0a0d; color:#f1f1f5;
    font:400 14px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .wrap { max-width:1380px; margin:0 auto; }
  .eyebrow { font:500 11px/1 ui-monospace,monospace; letter-spacing:.16em; text-transform:uppercase; color:#84848f; margin:0 0 14px; }
  h1 { font-size:46px; font-weight:200; letter-spacing:-.035em; line-height:1.02; margin:0 0 14px; }
  .lede { color:#a0a0aa; max-width:48rem; margin:0 0 14px; }
  .lede b { color:#f1f1f5; font-weight:500; }

  table.why { border-collapse:collapse; font:12px/1.5 ui-monospace,monospace; margin:22px 0 40px; }
  table.why th { text-align:left; font-weight:500; color:#84848f; padding:0 22px 8px 0; border-bottom:1px solid #26262c; }
  table.why td { padding:7px 22px 7px 0; border-bottom:1px solid #1c1c22; color:#c8c8d0; }
  table.why td i { display:inline-block; width:34px; height:13px; border-radius:3px; vertical-align:-2px; margin-right:9px; }
  table.why td.hi { color:#f1f1f5; }

  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(400px,1fr)); gap:20px; }

  .cand { border:1px solid #23232a; border-radius:16px; padding:18px; background:#101014; }
  /* Dim only the labels. Putting opacity on the whole card composited the white
     light-mode panel down to grey and made the two reference colours look worse
     than they are — the comparison has to be fair to be worth anything. */
  .cand.ref { border-style:dashed; }
  .cand.ref .head, .cand.ref .meta { opacity:.6; }
  .cand.pick { border-color:var(--glow); box-shadow:0 0 0 1px var(--glow), 0 18px 48px -22px var(--glow); }

  .head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:14px; }
  .cand h2 { font-size:21px; font-weight:300; letter-spacing:-.02em; margin:0 0 3px; }
  .cand.pick h2 { color:var(--glow); }
  .head p { font-size:12.5px; color:#8b8b96; margin:0; }
  .head code { font:11px/1 ui-monospace,monospace; color:#6e6e78; flex:none; }

  .stage { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
  .swatch { width:78px; height:56px; border-radius:10px; background:var(--glow); flex:none;
            box-shadow:0 0 34px -6px var(--glow); }
  .meta { display:flex; flex-direction:column; gap:1px; font:11.5px/1.5 ui-monospace,monospace; color:#84848f; }
  .meta b { color:#f1f1f5; font-weight:500; font-size:13px; }

  .ui { border-radius:11px; padding:13px; margin-bottom:9px; }
  .ui.dark { background:var(--d1); border:1px solid var(--d6); }
  .ui.light { background:var(--l1); border:1px solid var(--l6); }
  .ui p { font-size:12.5px; margin:11px 0 0; }
  .ui.dark p { color:var(--d11); }
  .ui.light p { color:var(--l11); }
  .ui.dark a { color:var(--glow); text-decoration-color:var(--b8); text-underline-offset:.15em; }

  .pill { display:inline-block; font-size:12.5px; font-weight:500; padding:5px 11px; border-radius:7px;
          background:var(--b3); color:var(--glow); margin-bottom:11px; }

  .acts { display:flex; gap:8px; }
  button { font:inherit; font-size:13px; line-height:1; padding:10px 14px; border-radius:9px; cursor:pointer; border:1px solid transparent; }
  /* The glow as a button takes DARK ink, because white is only ~3:1 on it. */
  .glowbtn { background:var(--glow); color:var(--ink); font-weight:600; box-shadow:0 0 22px -8px var(--glow); }
  .ghost { background:transparent; border-color:var(--d7); color:var(--d12); }
  .solidbtn { background:var(--solid); color:#fff; font-weight:500; }
  .ghostl { background:transparent; border-color:var(--l6); color:var(--l12); }

  .focus { margin-top:11px; font-size:12px; color:var(--d11); padding:8px 10px; border-radius:8px;
           background:var(--d2); outline:2px solid var(--glow); outline-offset:2px; }

  .ramp { display:flex; gap:2px; margin-top:13px; }
  .ramp i { flex:1; height:15px; border-radius:3px; display:block; }
  .caption { font:10.5px/1.4 ui-monospace,monospace; color:#5e5e68; margin:6px 0 0; }

  .cand h2 em { font-style:normal; font-size:10px; font-weight:600; letter-spacing:.14em;
                text-transform:uppercase; vertical-align:3px; margin-left:9px;
                padding:3px 7px; border-radius:5px; background:var(--glow); color:var(--ink); }

  .verdict { font:11.5px/1.4 ui-monospace,monospace; margin:0 0 14px; padding:7px 10px; border-radius:7px; }
  .verdict.pass { color:#8fe0b0; background:#0f1d16; }
  .verdict.fail { color:#f0a0a0; background:#1d1013; }

  .meta .match { color:var(--glow); }
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">nilam · the signature blue · held at L 0.66</p>
  <h1>One hue. Two brand moments.</h1>
  <p class="lede">
    The first sweep compared ten hues at the solver’s own lightness and every one
    looked like pigment. <b>Lightness was the variable, not hue.</b> Zima Blue and your
    music accent are 48° apart and read as the same kind of colour, because they
    share a lightness. My solver sat 1° from your accent and read as nothing like it.
  </p>
  <table class="why">
    <tr><th>colour</th><th>L</th><th>C</th><th>hue</th><th>reads as</th></tr>
    <tr><td class="hi"><i style="background:#009fe3"></i>Zima Blue &nbsp;<code>#009fe3</code></td><td>0.667</td><td>0.147</td><td>238</td><td class="hi">light</td></tr>
    <tr><td class="hi"><i style="background:#8b7cf6"></i>your music app &nbsp;<code>#8b7cf6</code></td><td>0.657</td><td>0.176</td><td>286</td><td class="hi">light</td></tr>
    <tr><td><i style="background:#6223f1"></i>my solver &nbsp;<code>#6223f1</code></td><td>0.500</td><td>0.269</td><td>285</td><td>pigment</td></tr>
  </table>

  <p class="lede" style="margin-bottom:30px">
    So the band below holds L at 0.66 and takes whatever chroma sRGB allows, leaving
    hue as the only variable. Every one of them takes <b>dark ink, not white</b> — at this
    lightness white is only 3.0–3.3:1. That is why the light-mode button below is a
    second, darker step of the same hue. One hue, two jobs, which is exactly what your
    music app already does with #8b7cf6 and #6d5ce6.
  </p>

  <div class="grid">
${rows.map(card).join('\n')}
  </div>
</div>
</body>
</html>
`);
