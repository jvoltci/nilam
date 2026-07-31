/* nilam — screenshot capture.
 *
 * ── what this is for ─────────────────────────────────────────────────────────
 *
 * The README's Limitations section names one class of defect the 7,064 assertions
 * structurally cannot see:
 *
 *   "A prover measures separation, not appropriateness. An earlier revision optimised
 *    separation until `danger` resolved to magenta, with every assertion passing. […]
 *    This class of error is only visible by rendering."
 *
 * So render. Every bug in that family this project has actually shipped was found by a
 * human looking at a screenshot: a warning colour that read as a fashion brand, a spinner
 * that was white-on-transparent and therefore invisible on a ghost button, a <summary>
 * laid out with flexbox that spread one sentence across a whole card. A human catches
 * each of those once. A screenshot diff catches the RECURRENCE for ever, which is the
 * only part a machine can have.
 *
 * ── determinism, which is the whole job ──────────────────────────────────────
 *
 * A flaky harness is worse than none: it trains people to re-run until green, and then it
 * catches nothing. Five things had to be neutralised.
 *
 * 1. ANIMATION. nilam has five infinite animations — n-spin, n-slide, n-pulse, n-shimmer
 *    and n-breathe. The obvious move is Chrome's `--force-prefers-reduced-motion`, and it
 *    does not work: nilam.base.css sets `animation-duration: 0.01ms !important` on
 *    everything, and then nilam.components.css DELIBERATELY exempts the loaders with
 *    `animation-duration: 1.4s !important; animation-iteration-count: infinite
 *    !important`, because a frozen spinner reads as a hung app rather than as reduced
 *    motion. Under reduced motion the loaders animate MORE, not less.
 *
 *    Two mechanisms instead, and both are needed:
 *
 *      a. `animation-play-state: paused !important` injected into @layer nilam.tokens.
 *         The layer name matters. For IMPORTANT declarations the cascade reverses layer
 *         order, so an `!important` in the FIRST layer beats an `!important` in a later
 *         one — nilam.tokens outranks nilam.components. Injecting this unlayered would
 *         lose to the loader exemption. Re-opening an existing layer name appends to that
 *         layer in its original position, so this genuinely lands in nilam.tokens.
 *
 *      b. Web Animations API: `getAnimations()`, then `pause()` and a fixed `currentTime`
 *         on every animation including the ones on ::before pseudo-elements. This is
 *         immune to the cascade entirely, and it is what PINS the frame rather than
 *         merely stopping motion.
 *
 *    FREEZE_MS = 600 is chosen, not arbitrary. n-spin is 600ms, so the spinners land on
 *    a whole iteration — axis-aligned, minimum anti-aliasing. n-slide is 1400ms, so the
 *    indeterminate bar lands mid-travel and is actually VISIBLE; pinning at 0 would park
 *    it off-screen and the crop could not see the bar's colour at all. The three .n-dots
 *    have 0/150/300ms delays, so at 600ms they are at three different points and the
 *    stagger is captured too.
 *
 * 2. TRANSITIONS. `transition: none` on everything, unlayered — for NORMAL declarations
 *    unlayered beats every layer, so no `!important` is needed. This also disposes of
 *    @starting-style: with no transition there is no entry animation for the dialog and
 *    the popovers to be caught halfway through.
 *
 * 3. CARET. `caret-color: transparent`, because the dialog's showModal() autofocuses its
 *    first field and a blinking caret is a 1×14px coin flip.
 *
 * 4. FONTS. There are no @font-face rules anywhere in nilam — the stacks in
 *    nilam.scale.css are system fonts — so there is no web-font load to race. That is
 *    luck rather than design, so the assertion suite checks it stays true.
 *
 * 5. SCROLLBARS. `--hide-scrollbars`. .n-table-scroll and .n-listbox both scroll, and an
 *    overlay scrollbar fades on a timer.
 *
 * Verified by capturing every page three times and requiring a zero-pixel diff; that is
 * an assertion in test/visual.test.mjs, not a claim in a comment.
 *
 * ── why the pages are generated ───────────────────────────────────────────────
 *
 * A single 1280×5400 diff of the whole showcase tells you "something changed somewhere",
 * which is nearly useless. So most captures are one component group, rendered on its own
 * page at its own viewport. The markup is EXTRACTED from demo/index.html rather than
 * copied, so the showcase stays the single source of truth and a crop cannot silently
 * drift from what the demo actually shows.
 *
 * Served over HTTP from a throwaway server rather than opened as file://, because the
 * demo's init is `<script type="module">` and module scripts from a file:// origin hit
 * CORS. It also keeps `/nilam.css` resolving the same way it does for a real consumer.
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..', '..');
export const OUT = join(here, 'out');

const FREEZE_MS = 600;

/* ── the browser ──────────────────────────────────────────────────────────────
 *
 * macOS locally, `google-chrome` on the GitHub ubuntu-latest runner. NILAM_CHROME
 * overrides both, which is how you point the suite at a pinned build. */
const CHROME_CANDIDATES = [
  process.env.NILAM_CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

export function findChrome() {
  for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
  throw new Error(
    `no Chrome found. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}\n` +
    `Set NILAM_CHROME to the binary.`,
  );
}

/* ── the injected stylesheet ──────────────────────────────────────────────────
 * See note 1 and 2 at the top of this file for why each half is where it is. */
const FREEZE_CSS = `<style id="n-visual-freeze">
/* Injected by test/visual/capture.mjs. IMPORTANT declarations invert layer order, so
   re-opening nilam.tokens — the FIRST layer — outranks the loader exemption that
   nilam.components declares with !important. Unlayered would lose. */
@layer nilam.tokens {
  *, *::before, *::after, ::backdrop, ::marker {
    animation-play-state: paused !important;
  }
}
/* Unlayered and NORMAL: for non-important declarations unlayered beats every layer, so
   this needs no !important and cannot be argued with. */
*, *::before, *::after, ::backdrop {
  transition: none;
  caret-color: transparent;
  scroll-behavior: auto;
}
</style>`;

/* ── the injected script ──────────────────────────────────────────────────────
 *
 * Classic, not a module, so it runs during parse and pins the very first frame.
 *
 * The `data-visual-fragment` branch mirrors demo/index.html's own init for the generated
 * one-section pages, which do not carry the demo's module script. It is a hand-kept copy
 * of three statements — if the demo grows a fourth, this needs it too, and the assertion
 * suite greps the demo for the ids to make that loud rather than silent. */
const INIT_JS = `<script id="n-visual-init">
(function () {
  var FREEZE_MS = ${FREEZE_MS};
  var root = document.documentElement;

  if (document.body.hasAttribute('data-visual-fragment')) {
    var FAMILIES = ['neutral', 'brand', 'danger', 'warn', 'ok', 'info'];
    var scales = document.getElementById('scales');
    if (scales) {
      scales.innerHTML = FAMILIES.map(function (f) {
        var cells = '';
        for (var i = 1; i <= 12; i++) cells += '<i style="background:var(--' + f + '-' + i + ')"></i>';
        return '<div class="scale"><span>' + f + '</span>' + cells + '</div>';
      }).join('');
    }
    var cvd = document.getElementById('cvd');
    if (cvd) {
      var STATUS = [['danger', '\\u00d7'], ['warn', '!'], ['ok', '\\u2713'], ['info', 'i']];
      var chips = STATUS.map(function (s) {
        return '<i style="background:var(--' + s[0] + '-9);color:var(--' + s[0] + '-ink)">' + s[1] + '</i>';
      }).join('');
      cvd.innerHTML = [
        ['normal vision', '', 'All four separate cleanly.'],
        ['protanopia', 'f-prot', '<b>warn/ok collapse.</b> The glyphs are carrying it.'],
        ['deuteranopia', 'f-deut', '<b>all three status pairs collapse.</b> Red and green are one colour here. No hue assignment fixes this.'],
        ['tritanopia', 'f-trit', 'Holds. Every pair stays above the floor.']
      ].map(function (r) {
        return '<div class="n-card n-card-pad"><p class="lbl">' + r[0] + '</p>' +
               '<div class="chips ' + r[1] + '">' + chips + '</div>' +
               '<p class="verdict">' + r[2] + '</p></div>';
      }).join('');
    }
    var ind = document.getElementById('ind');
    if (ind) ind.indeterminate = true;
  }

  /* The demo only rewrites this label on click, and we set the mode by class rather than
     by clicking, so it would otherwise read "Dark" on a dark page. */
  var mode = document.getElementById('mode');
  if (mode) mode.textContent = root.classList.contains('dark') ? 'Light' : 'Dark';

  /* Overlays. showPopover() would NOT do: .n-pop positions itself with
     \`position-area\` against its IMPLICIT anchor, and the implicit anchor only exists
     when the popover was opened by its popovertarget invoker. Opened by script it has no
     anchor and drops to the viewport centre — a screenshot of the wrong thing. */
  var open = document.body.getAttribute('data-visual-open');
  if (open === 'dialog') document.getElementById('dialog').showModal();
  if (open) {
    var invoker = document.querySelector('[popovertarget="' + open + '"]');
    if (invoker) invoker.click();
  }

  function pin() {
    var list = root.ownerDocument.getAnimations ? document.getAnimations() : [];
    for (var i = 0; i < list.length; i++) {
      try { list[i].pause(); list[i].currentTime = FREEZE_MS; } catch (e) { /* finished */ }
    }
  }
  window.__nilamPin = pin;

  pin();
  /* Twice more across frames: the first pass cannot see an animation on an element that
     is still display:none (a popover before it is shown), and module scripts — the demo's
     own, and the widgets page's enhance() — run after this one. */
  requestAnimationFrame(function () {
    pin();
    requestAnimationFrame(function () {
      pin();
      /* The html element's own box, NOT scrollHeight. scrollHeight is clamped up to the
         layout viewport, and the layout viewport is 87px SHORTER than --window-size
         because the window includes browser chrome — so every page shorter than the frame
         measured as exactly the same number. */
      root.setAttribute('data-visual-height', String(Math.ceil(root.getBoundingClientRect().height)));
      root.setAttribute('data-visual-ready', '');
    });
  });
})();
</script>`;

/* ── demo/index.html, taken apart ─────────────────────────────────────────────
 *
 * Every extraction below asserts it found something. A silent miss would produce a
 * plausible-looking screenshot with the page's layout CSS absent, and blessing that as a
 * baseline is the one outcome worse than having no baseline at all. */
function readDemo() {
  const file = join(ROOT, 'demo', 'index.html');
  const raw = readFileSync(file, 'utf8');

  const style = raw.match(/<style>([\s\S]*?)<\/style>/);
  if (!style) throw new Error('demo/index.html: no <style> block — the crops would have no layout CSS');

  const svg = raw.match(/<svg width="0"[\s\S]*?<\/svg>/);
  if (!svg) throw new Error('demo/index.html: the colour-blindness <filter> svg is gone — the cvd crop would be unfiltered');

  const sections = new Map();
  for (const m of raw.matchAll(/<section>([\s\S]*?)<\/section>/g)) {
    const h2 = m[1].match(/<h2>([\s\S]*?)<\/h2>/);
    if (h2) sections.set(h2[1].replace(/<[^>]+>/g, '').trim(), m[0]);
  }
  if (sections.size < 8) throw new Error(`demo/index.html: only ${sections.size} <section>s found, expected at least 8`);

  return { raw, style: style[1], svg: svg[0], sections };
}

/* ── hand-written fragments ───────────────────────────────────────────────────
 *
 * nilam.widgets.css is the one part of the system the showcase does not exercise, because
 * a combobox and a slider need src/behaviours to exist at all and demo/index.html is a
 * stylesheet demo. So this page is written here and wired by the REAL enhance(), rather
 * than by faking the attributes the CSS selects on — an invented `aria-expanded="true"`
 * would keep passing after the module stopped setting it. */
const WIDGETS_FRAGMENT = `
<section>
  <div class="sec-head"><h2>Widgets</h2>
    <p>The two components that need <code>nilam/behaviours</code>. Wired by the real
       <code>enhance()</code>, then opened with a click on the control.</p></div>
  <div class="grid-2">
    <div class="n-card n-card-pad n-stack">
      <div class="n-field">
        <label class="n-label" for="cb">Region</label>
        <div class="n-combobox" id="cbw">
          <div class="n-input n-combobox-value" id="cb">Europe</div>
          <div class="n-listbox" hidden>
            <div class="n-option">Africa</div>
            <div class="n-option" aria-selected="true">Europe</div>
            <div class="n-option">North America</div>
            <div class="n-option" aria-disabled="true">Antarctica</div>
          </div>
        </div>
      </div>
    </div>
    <div class="n-card n-card-pad n-stack">
      <p class="lbl">slider</p>
      <div class="row" style="gap:var(--space-4)">
        <div class="n-slider"><div class="n-slider-track"><div class="n-slider-fill"></div></div>
          <div class="n-slider-thumb" aria-valuenow="64" aria-label="Volume"></div></div>
        <span class="n-slider-value">64</span>
      </div>
      <p class="lbl" style="margin-block-start:var(--space-3)">disabled</p>
      <div class="row" style="gap:var(--space-4)">
        <div class="n-slider"><div class="n-slider-track"><div class="n-slider-fill"></div></div>
          <div class="n-slider-thumb" aria-valuenow="30" aria-disabled="true" aria-label="Locked"></div></div>
        <span class="n-slider-value">30</span>
      </div>
    </div>
  </div>
</section>
<script type="module">
  import { enhance } from '/src/behaviours/index.mjs';
  enhance(document);
  /* Open the listbox the way a user does. combobox.mjs listens for click on the control,
     so this exercises the module rather than setting aria-expanded by hand. */
  document.getElementById('cb').click();
  window.__nilamPin();
</script>`;

/* ── the specs ────────────────────────────────────────────────────────────────
 *
 * `h` is a FIXED frame height, not the measured page height, so that a content change
 * shows up as moved pixels rather than as "the images are different sizes" — a diff you
 * can look at beats a number that only says the total changed. Every frame is sized with
 * slack below the content, and test/visual.test.mjs asserts the bottom rows are still
 * uniform page background, which is what catches a page that has outgrown its frame.
 *
 * `node test/visual/capture.mjs --measure` prints the measured heights when adding one. */
const SECTION_SPECS = [
  // name          section heading in demo/index.html   w     h    notes
  ['signature',    'The signature',                    980,  520],
  ['cvd',          'The assertion nobody else ships',  980,  520],
  ['scales',       'The solved scales',                980,  520],
  ['buttons',      'Buttons',                          980,  260],
  ['forms',        'Forms',                            980,  620],
  ['status',       'Status',                           980,  520],
  ['disclosure',   'Disclosure and tabs',              980,  520],
  ['table',        'Table',                            980,  460],
  ['loaders',      'Loading',                          980,  620],
];

export const SPECS = [];
for (const mode of ['light', 'dark']) {
  // The whole page, both modes. Catches anything that moves a section relative to another.
  SPECS.push({ name: `showcase-${mode}`, page: 'showcase', mode, w: 1280, h: 5000 });
  // 390 is an iPhone 15 viewport. Every grid here is auto-fit, so this is where a
  // one-column collapse either happens or does not.
  SPECS.push({ name: `showcase-mobile-${mode}`, page: 'showcase', mode, w: 390, h: 8200 });

  for (const [name, heading, w, h] of SECTION_SPECS) {
    SPECS.push({ name: `${name}-${mode}`, page: `section:${heading}`, mode, w, h });
  }

  // Overlays, one capture each: two popover="auto" elements cannot be open at once, and
  // the dialog's ::backdrop covers the page.
  for (const open of ['menu', 'tip', 'dialog']) {
    SPECS.push({ name: `overlay-${open}-${mode}`, page: 'section:Overlays', mode, w: 980, h: 560, open });
  }

  SPECS.push({ name: `widgets-${mode}`, page: 'widgets', mode, w: 980, h: 420 });
}

/* The loader exemption itself, asserted visually. Under reduced motion the spinner must
 * close its ring (border-block-start-color goes to --brand-9) and the travelling bar must
 * become a full-width pulse. If someone ever "fixes" the exemption by deleting it, every
 * numeric assertion stays green and this capture changes. */
SPECS.push({ name: 'loaders-reduced-motion-light', page: 'section:Loading', mode: 'light', w: 980, h: 620, reducedMotion: true });

/* ── page assembly ───────────────────────────────────────────────────────────── */

function buildPage(spec, demo) {
  if (spec.page === 'showcase') {
    /* Transform the real demo page rather than reproducing it. Each replacement is
     * asserted: if a future edit to demo/index.html moves the stylesheet link or the
     * <html> tag, the harness must stop rather than quietly capture an unfrozen page. */
    let html = demo.raw;
    const swap = (from, to, why) => {
      if (!html.includes(from)) throw new Error(`demo/index.html no longer contains \`${from}\` — ${why}`);
      html = html.replace(from, to);
    };
    swap('href="../nilam.css"', 'href="/nilam.css"', 'the capture server serves the repo root');
    swap('<html lang="en">', `<html lang="en" class="${spec.mode}">`, 'the harness forces the mode by class');
    swap('</head>', `${FREEZE_CSS}\n</head>`, 'the freeze stylesheet has nowhere to go');
    swap('</body>', `${INIT_JS}\n</body>`, 'the animation pin has nowhere to go');
    return html;
  }

  const body = spec.page === 'widgets'
    ? WIDGETS_FRAGMENT
    : (() => {
        const heading = spec.page.slice('section:'.length);
        const found = demo.sections.get(heading);
        if (!found) {
          throw new Error(
            `demo/index.html has no <section> headed "${heading}" — either it was renamed, ` +
            `in which case update SECTION_SPECS, or it was deleted and this crop is testing nothing`,
          );
        }
        return found;
      })();

  const widgetsCss = spec.page === 'widgets' ? '<link rel="stylesheet" href="/nilam.widgets.css" />' : '';

  return `<!doctype html>
<html lang="en" class="${spec.mode}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>nilam visual — ${spec.name}</title>
<link rel="stylesheet" href="/nilam.css" />
${widgetsCss}
<style>${demo.style}</style>
<style>
  /* Crop framing only. Unlayered, so it beats the demo's own @layer nilam.utilities
     block without !important. No colour appears here; if one ever does it is a bug in
     the harness, not a finding. */
  body { padding-block: var(--space-5); }
  section { margin-block-start: 0; }
</style>
${FREEZE_CSS}
</head>
<body data-visual-fragment${spec.open ? ` data-visual-open="${spec.open}"` : ''}>
${demo.svg}
<main class="n-container">
${body}
</main>
${INIT_JS}
</body>
</html>`;
}

/* ── the server ───────────────────────────────────────────────────────────────
 *
 * Serves the repo so /nilam.css and /src/behaviours/*.mjs resolve exactly as they do for
 * a consumer, plus the generated pages under /__visual/. Bound to 127.0.0.1 on an
 * ephemeral port; nothing is written outside test/visual/out. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function serve(pagesDir) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const [base, path] = rel.startsWith('__visual/')
      ? [pagesDir, rel.slice('__visual/'.length)]
      : [ROOT, rel];
    const file = join(base, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/* ── Chrome ───────────────────────────────────────────────────────────────────
 *
 * One process per capture. Slower than driving one browser over the DevTools protocol,
 * and worth it: a fresh process cannot carry state — a stuck compositor, a cached layout,
 * a leftover popover — from the previous shot into this one. Twenty minutes of debugging a
 * "flaky" harness costs more than the whole run does. */
function shoot(binary, url, out, { w, h, reducedMotion }) {
  const profile = mkdtempSync(join(tmpdir(), 'nilam-visual-'));
  const args = [
    '--headless=new',
    '--disable-gpu',                       // software rasterisation: identical every run
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    '--virtual-time-budget=2000',          // run every timer to completion, instantly
    `--user-data-dir=${profile}`,          // no profile state, ever
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--force-color-profile=srgb',           // nilam is sRGB-only; do not let the display decide
    '--disable-lcd-text',                   // greyscale AA, so subpixel order cannot vary
    '--font-render-hinting=none',           // hinting differs by fontconfig; this removes it
    '--no-sandbox',                          // required in most CI containers, harmless locally
    '--disable-dev-shm-usage',
  ];
  if (reducedMotion) args.push('--force-prefers-reduced-motion');
  args.push(url);

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      rmSync(profile, { recursive: true, force: true });
      if (!existsSync(out)) reject(new Error(`Chrome wrote no screenshot for ${url} (exit ${code})\n${stderr}`));
      else resolve();
    });
  });
}

/** Measure a page's real height, for choosing a frame size. Uses --dump-dom, which is the
 *  only way to get a value out of the CLI without a protocol client. */
async function measure(binary, url, w, h) {
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, '--virtual-time-budget=2000', '--dump-dom',
    '--no-sandbox', '--disable-dev-shm-usage', url,
  ];
  const dom = await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', () => resolve(out));
  });
  return Number(dom.match(/data-visual-height="(\d+)"/)?.[1] ?? 0);
}

/* ── the entry point ─────────────────────────────────────────────────────────── */

/**
 * Capture every spec (or the subset matching `filter`) into `dir`.
 * @returns [{ name, file, spec }]
 */
export async function captureAll({ dir, filter, onShot } = {}) {
  const binary = findChrome();
  const demo = readDemo();
  const outDir = dir ?? join(OUT, 'current');
  const pagesDir = join(OUT, 'pages');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(pagesDir, { recursive: true });

  const specs = filter ? SPECS.filter((s) => s.name.includes(filter)) : SPECS;
  if (!specs.length) throw new Error(`no capture matches "${filter}". Names: ${SPECS.map((s) => s.name).join(', ')}`);

  const { server, port } = await serve(pagesDir);
  const shots = [];
  try {
    for (const spec of specs) {
      writeFileSync(join(pagesDir, `${spec.name}.html`), buildPage(spec, demo));
      const file = join(outDir, `${spec.name}.png`);
      await shoot(binary, `http://127.0.0.1:${port}/__visual/${spec.name}.html`, file, spec);
      shots.push({ name: spec.name, file, spec });
      onShot?.(spec);
    }
  } finally {
    server.close();
  }
  return shots;
}

/** `--measure`: print what height each frame would need. */
async function reportHeights() {
  const binary = findChrome();
  const demo = readDemo();
  const pagesDir = join(OUT, 'pages');
  mkdirSync(pagesDir, { recursive: true });
  const { server, port } = await serve(pagesDir);
  try {
    for (const spec of SPECS) {
      writeFileSync(join(pagesDir, `${spec.name}.html`), buildPage(spec, demo));
      const url = `http://127.0.0.1:${port}/__visual/${spec.name}.html`;
      // Measured in the frame the capture will use, so `position: fixed` and <dialog>
      // centring land where the screenshot will put them. Retried once: --dump-dom
      // occasionally returns before the rAF chain has written the attribute.
      const h = (await measure(binary, url, spec.w, spec.h)) || (await measure(binary, url, spec.w, spec.h));
      if (!h) throw new Error(`could not measure ${spec.name} — --dump-dom never reported data-visual-height`);
      const slack = spec.h - h;
      console.log(
        `${spec.name.padEnd(32)} frame ${String(spec.w).padStart(5)}x${String(spec.h).padStart(5)}` +
        `  page ${String(h).padStart(5)}  slack ${String(slack).padStart(5)}${slack < 16 ? '  <-- TOO SHORT' : ''}`,
      );
    }
  } finally {
    server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  if (process.argv.includes('--measure')) {
    await reportHeights();
  } else {
    const dir = arg('out') ?? join(OUT, 'current');
    const shots = await captureAll({ dir, filter: arg('only'), onShot: (s) => console.log(`  ${s.name}`) });
    console.log(`\n${shots.length} captures in ${dir}`);
  }
}
