/* The docs site runs the shipped keyboard layer.
 *
 * The tabs, menu, combobox and slider on these pages are wired by src/behaviours/, the
 * same module `import { enhance } from 'nilam/behaviours'` resolves to. Nothing is
 * reimplemented for the docs — a demo that is a copy of the component proves nothing
 * about the component.
 *
 * ── finding the module ────────────────────────────────────────────────────────
 *
 * The site is published under /nilam/, so an import of '/src/behaviours/index.mjs'
 * would resolve to the wrong origin root, and a relative specifier would resolve
 * against THIS file's URL (…/javascripts/) rather than the site root. The stylesheet
 * link gives the site root for free: it is emitted by mkdocs as an absolute URL to
 * nilam.tokens.css, which sits at the root of the site.
 *
 * ── why document$ ────────────────────────────────────────────────────────────
 *
 * navigation.instant is on, so material swaps the page content without a reload and a
 * one-shot DOMContentLoaded listener would wire the first page visited and no other.
 * document$ is material's own observable and it emits on every navigation.
 */

const stylesheet = document.querySelector('link[href$="nilam.tokens.css"]');
const moduleUrl = stylesheet && new URL('src/behaviours/index.mjs', stylesheet.href).href;

let enhance = null;

// eslint-disable-next-line no-undef
document$.subscribe(async () => {
  const demos = document.querySelectorAll('.nd-demo');
  if (!demos.length || !moduleUrl) return;

  if (!enhance) {
    try {
      ({ enhance } = await import(moduleUrl));
    } catch (error) {
      /* Loud, not silent. If GitHub Pages ever serves .mjs as the wrong MIME type the
       * widgets fall back to their static rendering, which LOOKS finished — the exact
       * failure mode nilam's own test suite exists to prevent. */
      console.error('nilam docs: could not load the behaviours module from', moduleUrl, error);
      return;
    }
  }

  /* Scoped to the demo blocks rather than called on document.
   *
   * enhance() claims '[role="tablist"], .n-tabs' and '.n-slider', and mkdocs-material
   * has its own content tabs and its own controls. Wiring nilam's arrow-key handling
   * onto the theme's furniture is not a thing this page should be testing. */
  for (const demo of demos) enhance(demo);

  /* indeterminate is a property with no attribute, so it cannot be expressed in markup
   * — and it is a real tri-state that most component libraries forget, which is why the
   * checkbox example shows it. */
  for (const box of document.querySelectorAll('[data-nd-indeterminate]')) {
    box.indeterminate = true;
  }

  /* The modal. <dialog open> in markup is a non-modal dialog: no focus trap, no Esc, no
   * inert background. showModal() is what buys all three, and it is the whole reason
   * .n-dialog needs no focus-trap library. */
  for (const trigger of document.querySelectorAll('[data-nd-dialog]')) {
    trigger.addEventListener('click', () => {
      document.getElementById(trigger.dataset.ndDialog)?.showModal();
    });
  }
});
