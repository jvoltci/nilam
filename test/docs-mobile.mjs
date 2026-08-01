/* nilam — does the docs site fit on a phone?
 *
 * WHY THIS IS A SEPARATE FILE AND NOT PART OF THE VISUAL SUITE.
 *
 * test/visual.test.mjs cannot answer this question, for two independent reasons:
 *
 *   1. Its narrowest capture is 500px, because below that headless Chrome screenshots a
 *      CROP of a 500px layout rather than laying out narrow. Its own header says so
 *      (test/visual.test.mjs:98). A phone is 390px.
 *   2. It captures the DEMO pages. The docs site is built by mkdocs from docs/**, styled by
 *      docs/stylesheets/extra.css, and nothing in this repository had ever looked at it.
 *
 * So the docs site shipped a page that scrolled sideways on a phone —
 * /learn/1-what-is-a-design-system/ measured a document scrollWidth of 532 against a 390px
 * viewport — and every suite was green. A reader found it.
 *
 * WHAT IT ASSERTS, AND WHAT IT DELIBERATELY DOES NOT.
 *
 * The single question is whether the DOCUMENT is wider than the viewport, because that is
 * the thing a reader actually feels: the whole article slides under the thumb and the text
 * column no longer lines up with the screen. It is a binary, it needs no baseline image,
 * and it cannot drift.
 *
 * It does NOT complain about an element that is wider than the screen INSIDE something that
 * scrolls. A long code line in a <pre>, or a wide table in mkdocs-material's own
 * .md-typeset__scrollwrap, is the framework working correctly — the block scrolls and the
 * page does not. Asserting on those would produce a list of 60 findings on a healthy site,
 * which is how a check gets switched off.
 *
 * Requires Playwright, which nilam does NOT depend on: CI asserts this package has zero
 * dependencies, runtime and dev. The workflow installs it with npx for this step alone.
 *
 *   python3 -m http.server 8199 --directory site &
 *   node test/docs-mobile.mjs
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(root, 'site');
const BASE = process.env.DOCS_URL ?? 'http://127.0.0.1:8199';

/* iPhone SE is 375 and is the narrowest phone still in real use; 390 is an iPhone 14/15 and
 * the modal width. Both, because a layout can be fine at one and not the other — a wrap
 * point sitting between them is exactly the bug this looks for. */
const WIDTHS = [375, 390];

if (!existsSync(SITE)) {
  console.error(`no site/ at ${SITE} — run \`mkdocs build\` first`);
  process.exit(1);
}

let chromium;
/* Either package: `playwright` is what CI installs, `@playwright/test` is what a repo that
 * already runs browser tests will have. @playwright/test is CommonJS, so a named import
 * throws rather than returning undefined — hence the default-then-destructure. */
for (const spec of ['playwright', '@playwright/test']) {
  try {
    const mod = await import(spec);
    chromium = mod.chromium ?? mod.default?.chromium;
    if (chromium) break;
  } catch {
    /* try the next one */
  }
}
if (!chromium) {
  // Loud, and a failure. A skip here would be indistinguishable from a pass, which is the
  // failure mode this whole repository is written against.
  console.error(
    'playwright is not resolvable. This check is not optional and is not skipped:\n' +
      '  npx --yes playwright@1 install --with-deps chromium\n' +
      'nilam does not depend on it — CI asserts zero dependencies — so it is installed ' +
      'for this step only.',
  );
  process.exit(1);
}

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry === 'index.html') pages.push('/' + relative(SITE, p).replace(/index\.html$/, ''));
  }
})(SITE);
pages.sort();

const browser = await chromium.launch();
const failures = [];
let count = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  for (const path of pages) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const r = await page.evaluate((w) => {
      const doc = document.documentElement.scrollWidth;
      if (doc <= w + 1) return { doc, blame: [] };
      /* Name the culprit. The outermost element past the edge that is NOT inside something
       * scrollable is the one that made the page wide; anything else is its child. */
      const scrollable = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ov = getComputedStyle(p).overflowX;
          if ((ov === 'auto' || ov === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
        }
        return false;
      };
      const blame = [];
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.right <= w + 1 || scrollable(el)) continue;
        if (el.parentElement && el.parentElement.getBoundingClientRect().right > w + 1) continue;
        blame.push(
          `${el.tagName.toLowerCase()}` +
            `${el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''}` +
            ` extends ${Math.round(b.right - w)}px past the edge`,
        );
      }
      return { doc, blame: [...new Set(blame)].slice(0, 4) };
    }, width);

    count++;
    if (r.doc > width + 1) {
      failures.push(
        `${path} at ${width}px: the document is ${r.doc}px wide, so the whole page scrolls ` +
          `sideways.\n      ${r.blame.join('\n      ') || '(no single element identified)'}`,
      );
    }
  }
  await page.close();
}
await browser.close();

if (failures.length) {
  console.error(`\ndocs-mobile: ${failures.length} of ${count} page loads scroll sideways\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  console.error(
    '  A page wider than the phone is not a styling nit: the article slides under the ' +
      "thumb and the text column stops lining up with the screen.\n  The last one was a " +
      'flex row with no flex-wrap whose items could not shrink below their min-content.\n',
  );
  process.exit(1);
}
console.log(
  `docs-mobile: ${pages.length} pages × ${WIDTHS.join('/')}px = ${count} loads, ` +
    `none scrolls sideways`,
);
