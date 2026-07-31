/* Sweep the blue→indigo→violet range through the solver and render each one as a
 * small piece of real UI. Swatch strips lie: a hue that looks great as a bar can
 * look cheap as a button. So every candidate gets a button, an active nav pill,
 * a link and a tinted note — the four places a brand hue actually lands.
 *
 *   node demo/blues.mjs > demo/blues.html
 */

import { solveScale } from '../src/solve.mjs';
import { inkFor } from '../src/solve.mjs';
import { toHex, contrast } from '../src/colour.mjs';

/* The candidates. Every 7° from cyan-leaning blue to the violet edge — past 292
 * it stops reading as blue at all, and below 226 it turns teal. Named by what
 * they actually look like, not by their angle. */
const HUES = [
  [228, 'cerulean', 'cyan-leaning, coldest'],
  [235, 'azure', 'sky, open'],
  [242, 'cobalt', 'the classic web blue'],
  [249, 'sapphire', 'deep, saturated'],
  [256, 'ultramarine', 'Tailwind blue-600 sits here'],
  [263, 'royal', 'the safest "corporate" blue'],
  [270, 'iris', 'the tipping point into violet'],
  [277, 'indigo', 'Tailwind indigo, Stripe-ish'],
  [285, 'violet', 'your music app — the current pick'],
  [292, 'amethyst', 'warmest, edges toward purple'],
];

const rows = HUES.map(([h, name, blurb]) => {
  const light = solveScale(h, 'light');
  const dark = solveScale(h, 'dark');
  const nl = solveScale(h, 'light', { neutral: true });
  const nd = solveScale(h, 'dark', { neutral: true });
  return { h, name, blurb, light, dark, nl, nd };
});

const vars = (r, s, n, surface) => [
  ...Array.from({ length: 12 }, (_, i) => `--b${i + 1}:${toHex(s[i + 1])}`),
  ...Array.from({ length: 12 }, (_, i) => `--n${i + 1}:${toHex(n[i + 1])}`),
  `--ink:${toHex(inkFor(s[9]))}`,
  `--surface:${toHex(surface)}`,
].join(';');

const ramp = (s) => Array.from({ length: 12 }, (_, i) =>
  `<i style="background:${toHex(s[i + 1])}"></i>`).join('');

const card = (r) => `
<article class="cand" style="${vars(r, r.light, r.nl, r.light.surface)}"
         data-dark="${vars(r, r.dark, r.nd, r.dark.surface)}">
  <header>
    <h2>${r.name}</h2>
    <code>hue ${r.h}</code>
    <p>${r.blurb}</p>
  </header>

  <div class="ramp">${ramp(r.light)}</div>
  <div class="ramp ramp-n">${ramp(r.nl)}</div>

  <div class="ui">
    <nav>
      <a class="on"><b></b>Overview</a>
      <a><b></b>Traffic</a>
    </nav>
    <div class="acts">
      <button class="primary">Save changes</button>
      <button>Cancel</button>
    </div>
    <p class="body">Body text on the card, with <a href="#">a link that carries the hue</a> inside it.</p>
    <div class="note"><span>i</span>A tinted callout at step 3, bordered at 6, text at 11.</div>
  </div>

  <footer>
    <span>solid <code>${toHex(r.light[9])}</code></span>
    <span>${contrast(r.light[9], r.light[1]).toFixed(2)}:1 on page</span>
    <span>chroma ${r.light[9].C.toFixed(3)}</span>
  </footer>
</article>`;

process.stdout.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>nilam — the blue sweep</title>
<style>
  * { box-sizing: border-box; }
  :root { --page:#f4f4f6; --pane:#fff; --edge:#e2e2e7; --text:#111114; --dim:#6e6e78; }
  html.dark { --page:#131316; --pane:#1c1c20; --edge:#2e2e34; --text:#f2f2f5; --dim:#9a9aa4; }
  body {
    margin:0; padding:40px 28px 90px; background:var(--page); color:var(--text);
    font:400 14px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .wrap { max-width:1360px; margin:0 auto; }
  .eyebrow { font:500 11px/1 ui-monospace,monospace; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); margin:0 0 12px; }
  h1 { font-size:38px; font-weight:300; letter-spacing:-.03em; margin:0 0 10px; }
  .lede { color:var(--dim); max-width:46rem; margin:0 0 34px; }
  .toggle { position:fixed; top:16px; right:16px; z-index:9; font:inherit; font-size:13px;
    padding:9px 15px; border-radius:9px; border:1px solid var(--edge); background:var(--pane); color:var(--text); cursor:pointer; }

  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(390px,1fr)); gap:18px; }

  /* Each candidate paints itself entirely from its own solved tokens. The
     surrounding page chrome is neutral so nothing borrows from a neighbour. */
  .cand {
    border:1px solid var(--edge); border-radius:15px; overflow:hidden;
    background:var(--n1); color:var(--n12);
  }
  .cand header { padding:16px 18px 12px; }
  .cand h2 { font-size:17px; font-weight:600; letter-spacing:-.01em; margin:0; display:inline; }
  .cand header code { font:11px/1 ui-monospace,monospace; color:var(--n11); margin-left:8px; }
  .cand header p { font-size:12.5px; color:var(--n11); margin:5px 0 0; }

  .ramp { display:flex; gap:2px; padding:0 18px; }
  .ramp i { flex:1; height:26px; border-radius:3px; display:block; }
  .ramp-n { padding-top:3px; padding-bottom:14px; }
  .ramp-n i { height:11px; }

  .ui { margin:0 18px 16px; background:var(--surface); border:1px solid var(--n6); border-radius:12px; padding:14px;
        box-shadow:0 1px 2px rgb(0 0 0 / .04), 0 10px 24px -12px rgb(0 0 0 / .10); }

  nav { display:flex; gap:4px; margin-bottom:13px; }
  nav a { display:flex; align-items:center; gap:7px; padding:6px 10px; border-radius:8px;
          font-size:13px; color:var(--n11); text-decoration:none; }
  nav a b { width:5px; height:5px; border-radius:50%; background:var(--n7); }
  nav a.on { background:var(--b3); color:var(--b11); font-weight:500; }
  nav a.on b { background:var(--b9); }

  .acts { display:flex; gap:8px; margin-bottom:13px; }
  button { font:inherit; font-size:13px; line-height:1; padding:10px 14px; border-radius:9px;
           border:1px solid var(--n7); background:transparent; color:var(--n12); cursor:pointer; }
  .primary { background:var(--b9); border-color:var(--b9); color:var(--ink); font-weight:500;
             box-shadow:0 1px 2px rgb(0 0 0 / .12); }
  .primary:hover { background:var(--b10); border-color:var(--b10); }

  .body { font-size:13px; color:var(--n11); margin:0 0 12px; }
  .body a { color:var(--b11); text-decoration-color:var(--b8); text-underline-offset:.15em; }

  .note { display:flex; gap:9px; align-items:flex-start; font-size:12.5px;
          background:var(--b3); border:1px solid var(--b6); color:var(--b11);
          border-radius:9px; padding:10px 12px; }
  .note span { flex:none; width:17px; height:17px; border-radius:50%; background:var(--b9); color:var(--ink);
               display:grid; place-items:center; font:700 10px/1 ui-monospace,monospace; }

  .cand footer { display:flex; gap:14px; flex-wrap:wrap; padding:0 18px 15px;
                 font:11px/1.4 ui-monospace,monospace; color:var(--n11); }
  .cand footer code { color:var(--n12); }
</style>
</head>
<body>
<button class="toggle" id="mode" type="button">Dark</button>
<div class="wrap">
  <p class="eyebrow">nilam · 10 candidates · every value solved</p>
  <h1>The blue sweep.</h1>
  <p class="lede">
    Ten hues from cyan-leaning blue to the violet edge, each run through the same
    solver. Not one lightness was picked — every step inverts a contrast
    requirement, so all ten are equally legal. What differs is only the hue, which
    means this is a pure taste comparison with the accessibility argument already settled.
  </p>
  <div class="grid">
${rows.map(card).join('\n')}
  </div>
</div>
<script>
  const btn = document.getElementById('mode');
  const cands = [...document.querySelectorAll('.cand')];
  // Stash the light values so the toggle can swap both ways.
  cands.forEach((c) => { c.dataset.light = c.getAttribute('style'); });
  btn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    btn.textContent = dark ? 'Light' : 'Dark';
    cands.forEach((c) => c.setAttribute('style', dark ? c.dataset.dark : c.dataset.light));
  });
</script>
</body>
</html>
`);
