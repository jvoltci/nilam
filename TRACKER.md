# Tracker

State of nilam and everything on it. Last verified 1 August 2026 against the real
repositories and the registry, not from memory.

---

## Shipped

| | |
|---|---|
| npm | `nilam@0.6.0` — zero dependencies |
| Docs | <https://jvoltci.github.io/nilam/> — 11 reference pages + 13 Learn pages |
| Assertions | 7,879 numeric (1,342 prove · 6,063 dtcg · 282 behaviours · 192 surfaces) + 31 visual baselines |
| CI | 5 jobs: prove on Node 18/24, generated-files-are-current, tarball-installs, css-parses, visual |
| Predecessor | achroma unpublished from npm, repo archived and pointing here |

**In the package:** solver · prover · dichromacy simulation · CLI · 12-step scales for 6
families · Display-P3 as a second proven palette · type/space/radius/motion/elevation scales ·
base layer · ~30 components · combobox, slider and two-thumb range widgets · 4 loaders · ARIA
APG keyboard behaviours · Tailwind v4 / shadcn bridge · DTCG export with Figma, Style
Dictionary, Swift and Kotlin adapters.

---

## 0.6.0 — the surface audit

Someone building a lossless-cut tool on 0.5.0 reported five gaps. Four were real, one was a
wall already documented, and **chasing the third one found nine defects nobody had reported.**

### What was asked for, and what the measurement said

| Asked | Answer |
|---|---|
| A range / timeline primitive | **Built** as `.n-range`, two thumbs, APG Multi-Thumb Slider. Not the waveform or the playhead — those are application components, not system ones |
| `.n-kbd`, because `kbd` had type and no box | **Built.** nilam's own Behaviours page had been writing `<kbd>→</kbd>` beside inline `<code>` for five releases with nothing to tell them apart |
| `.n-num` for figures outside a table | **Built.** The argument closed itself: declining a local helper because it would be a third name puts the gap upstream |
| A `--wash` / page-lift token, one step off the page | **Declined, and proved impossible.** See below |
| A categorical palette | **Declined.** Unchanged wall, already documented, exhaustive search tops out at 1.49:1 |

### The token that cannot exist

The request was a fill that reads as a distinct plane from both the page and a card. Sweeping
**all 2001 lightnesses** in dark mode, the best any fill achieves against both — while keeping
body text at 4.5:1 — is **1.1072:1**, and the optimum is pure black.

It is the metric, not the ramp. `Y = L³`, so at `L 0.10` luminance is 0.001 against the dark
page's 0.00536, and WCAG's `+0.05` flare term swamps the difference. Pure black is only
1.1072:1 from nilam's dark page; pure white is only 1.0593:1 from its light page. That is also
why the ramp's low steps sit 1.05–1.17 apart — there is no more room to be had.

So the answer is a channel that is not a fill. A `--neutral-6` ring measures 1.3235:1 on a
card in dark, above the ceiling any fill can reach, and `--neutral-7` reaches 3.0469:1 where
1.4.11 applies. **No new colour token, so no palette shift for six apps.**

### The nine defects, none of them reported

The root cause is one line — `solve.mjs` defines dark `--surface` as step 3's lightness with
the tint removed, so `--neutral-3` on a card is **1.0009:1 by construction**. The comment
above it says the pairing "separates on two channels instead of one", which is true in light
and false in dark, where the lightness step is zero. That is the third comment in this project
found describing the opposite of what its code does.

| Component | Was | Why it mattered |
|---|---|---|
| `.n-menu-item:focus-visible` | cancelled the global `--brand-9` ring (4.9408:1) for a **1.0009:1** tint | **Keyboard focus in a menu was invisible in dark mode.** WCAG 2.4.7. Hover and focus shared one rule; they are split now |
| `.n-slider-thumb:focus-visible` | same cancellation, `--brand-6` halo at **1.3235:1** | Nothing else changed on focus, so there was no focus state at all in dark |
| `.n-switch` | `border: none` | `.n-check` and `.n-radio` both carry `--neutral-7`; the third toggle did not. An unchecked switch was a **1.5500:1** pill |
| `.n-slider-track` | no border | `.n-progress`, `.n-bar` and `.n-meter` all got `--neutral-7` in the aire meter fix and the slider was missed. The *unfilled* extent was invisible |
| `.n-table tr:hover td` | `--neutral-2` | **1.0550:1 against the page in light** — the one that failed in the primary mode |
| `.n-summary:hover` | `--neutral-2` | the same, 1.0550:1 |
| `.n-menu-item:hover` | `--neutral-3` | `.n-pop` **is** `--surface`, so this was never conditional on a card |
| `.n-option:hover` | `--neutral-3` | the same, inside `.n-listbox` |
| `.n-avatar` | no edge | `--brand-3` at **1.0013:1**, so the disc vanished and the initials floated |

**Two things I claimed and had to retract.** `.n-option[data-current]` is *not* a defect — it
already carries a `--brand-9` inset bar at 4.9408:1, so 1.4.11 is satisfied. And I reported it
failing 1.4.3 at 4.19:1 by measuring `--neutral-11`; `.n-listbox` sets `--neutral-12`, which is
6.5409:1. There are **no 1.4.3 failures anywhere** in the set. The `--neutral-11`-on-step-4
pairing at 4.19:1 is a latent trap no component creates.

### The assertion that would have caught all nine

`test/surfaces.test.mjs`, 192 assertions. It reads the shipped CSS, resolves every
`background: var(…)` to a token, and measures it against what it actually sits on.

**An unclassified surface is a failure, not a pass.** That is the whole design — a test that
only checked pairs it already knew about would be a mirror of the stylesheet and would have
gone green on all nine, because each one looked locally reasonable. It also asserts that no
rule may cancel the focus ring without naming a ≥3:1 replacement, and it re-derives the
1.1072:1 ceiling every run so the number in the comments cannot rot.

It found the switch on its first run. Three of its early failures were **my** classification
errors, not the CSS's, and one was a regex that matched prose inside a comment — a check whose
result depended on the wording of a comment. Fixed before it was believed.

Also added to the prover: `6 vs surface`, `7 vs surface`, `11 on surface`, `12 on surface`.
Step 6 had been asserted against the page and never against a card — the identical omission
that let the step-7 bug ship, one step down, found the same way.

---

## Applications

All six on nilam, all committed, all deploys green.

| App | What it is | Notable |
|---|---|---|
| naina | On-device OCR | Rebuilt a lost text-hierarchy level on size and tracking, because nilam has two text steps by construction and achroma had three |
| tools | PDF + calculator suite | Dark mode had been **unreachable** — `enableSystem` means "selectable", not "follow the OS", and there was no theme control in the UI at all |
| flai | Magnet streaming | 223 unlayered CSS lines with 14 colour literals → 88 lines with zero |
| teleport | P2P file transfer | QR code decoded end to end at 8.54:1, ISO 18004 symbol contrast 92.7% |
| aire | Realtime polls | Kept **its own hue, 219.5** — `npx nilam 219.5` re-solves and re-proves the whole system. Not a rebrand |
| studio | DAW | Velocity had been encoded in alpha alone; now carries height as a second channel |

**music is deliberately not on nilam.** It was migrated, reviewed and rejected — the solved
palette read calmer than the hand-picked original it was derived from, which is a downgrade
whatever the numbers say. Reverted; `web/` is byte-clean at HEAD.

It did surface three real failures in music's day theme, which remain **unfixed there** and are
worth three lines whenever you feel like it:

- accent used as text on the page: **4.35:1** (fails 1.4.3)
- the filled button's own label: **3.98:1** (fails 1.4.3)
- `color-scheme: dark` set unconditionally, so the day theme rendered with dark scrollbars,
  caret and native controls on a near-white page

---

## Open — closeable

### ~~1. The Tailwind bridge omits everything that is not a colour~~ — closed in 0.5.0

Sizes, weights, leading, tracking and the measure are all mapped now, so `text-display`,
`font-thin`, `tracking-micro`, `leading-tight`, `max-w-measure` and `text-000` exist as
utilities. Verified generating in a real build.

The apparent blocker was imaginary: nilam names its sizes `--text-1` and Tailwind's font-size
namespace is also `--text-*`, so the mapping reads as circular. `@theme inline` does not emit a
theme variable — it inlines the value at the use site — so the `var()` resolves against
`nilam.scale.css`. The same pattern had been working for `--font-sans` all along; the fear was
never tested.

**Spacing is deliberately still not mapped.** It works, was mapped, measured, and taken back
out: Tailwind already defines `p-5` through `p-9` and defines them differently above step 4
(nilam doubles on purpose, Tailwind steps linearly). Mapping them silently resizes every
existing usage — **222 of them in one real app, 131 being `p-6` alone.** Steps 1–4 already agree,
because both are a 4px grid. The test for whether a mapping belongs in the bridge is whether
Tailwind had anything at that name: if it did, changing its meaning is not adoption, it is
reaching in and moving furniture.

### 2. Per-app items — all closed, with corrections

| App | Item | Outcome |
|---|---|---|
| studio | XY pads had no keyboard operation (WCAG 2.1.1) | **Closed.** `role="group"` + one `role="slider"` per axis. Verified by reading engine state, not the DOM: energy 50→100% took the lane meters from 9 audible lanes to 17 |
| studio | `ArrangerDrawer` was not a `<dialog>` | **Closed, and the objection had expired** — the synth editor was already a `<dialog>`, so the editor moved from sibling to last child and the drawer became one. 98 Tab presses wrap correctly |
| studio | Canvas text over the seeded gradient | **Closed.** Worst case 1.01:1 → 5.70:1, found by sweeping **all 648,000 gradients** the generator can emit rather than sampling seeds |
| teleport | Video, screen-share and the call bar never rendered | **Closed.** Rendered for the first time with a local relay and fake devices; **three real defects found**, all fixed |
| teleport | Content clips at 900px | **DID NOT REPRODUCE.** Measured 20 times across five states and four heights: zero unreachable pixels, including during a real 6 MB transfer. `scrollHeight == innerHeight` was content that happens to be exactly 900px tall. The `overflow-hidden` was doing nothing for its stated purpose either — `overscroll-behavior-y` computed to `auto` — so it carried the whole cost and none of the benefit. Replaced with `overscroll-none` on `<html>` |
| aire | Never tested against the live API | **Closed.** `wrangler dev` runs fully offline. All seven request/response shapes matched except one, and it found **a dropped connection silently losing the vote** |
| aire | No CI workflow | **Closed.** Two jobs, including a vendored-palette freshness check, with five negative tests proving each check can fail |
| naina | `index.d.ts` declared `quad` flat | **Closed.** It is a tuple now, mutation-tested. A **second lie** was found in the same interface: `bbox` documented a `score` the runtime does not emit |
| naina | `rust` CI failed since 29 July | **Reopened as worse: it has NEVER passed.** Added 29 July in the same commit as `build.rs`. Three missing link inputs, not one. Being fixed via CMake emitting the link line |

### Newly open, found while closing the above

| App | Item |
|---|---|
| studio | The arranger drawer is opened by long-pressing a `<canvas>`, which cannot hold focus — **there is no keyboard path to open it at all.** Needs a focusable grid over the canvas, which is a feature rather than a fix |
| teleport | A pre-existing WebRTC glare bug: `InvalidAccessError` on `setLocalDescription`, m-line order mismatch, when both peers add tracks near-simultaneously. Reproducible every run. Media still flows, so it self-recovers. Undiagnosed |
| teleport | The 1px control border over video cannot clear 3:1 against both a black and a white frame with any single opaque colour. The icon carries the identification instead. Making that border load-bearing needs a two-tone stroke |
| nilam | **No visual capture hovers or focuses anything.** Six of the nine 0.6.0 fixes are `:hover` or `:focus-visible` states, so none of them can be visually regressed — which is exactly the class of bug they were: states nobody had ever rendered. Needs `CSS.forcePseudoState` over CDP and two new captures |
| nilam | A `components.css` edit is invisible to the visual suite until `npm run build` regenerates the `nilam.css` bundle the demo pages load. Verified the hard way: a **4px red border** on `.n-switch` moved zero pixels. CI builds first so it is safe there; locally it means baselines can be blessed against a stale bundle. `test:visual` should depend on `build` |

---

## Open — not closeable, and stated as such

### Assistive technology

**Nothing here has been tested against a screen reader.** Not NVDA, JAWS, VoiceOver or
TalkBack. The keyboard layer implements the ARIA APG contracts; real assistive technology
diverges from specification constantly, and the only way to find out how is to run it.

Where certified AT behaviour is a requirement, pair nilam with
[React Aria](https://react-spectrum.adobe.com/react-aria/).

### Categorical data

nilam solves one brand hue plus three statuses. It has nothing for 12–17 *separable
identities* — a DAW's tracks, a calendar's people, a map's regions.

Not for want of trying: an exhaustive search of every 5-step subset of 1–12 tops out at 1.49:1,
and the four proven semantic hues plus a neutral are worse. Of 136 pairs among studio's 17
hand-picked lane colours, **23 collapse under deuteranopia** — so hand-picking does not solve it
either, it just fails silently. Past about three categories, use a channel that is not colour.

### The `--text-*` name collision

nilam's `--text-000` … `--text-7` are font **sizes**. Many codebases use `--text-*` for text
**colours**. The collision is silent: `font-size` receives a colour, goes invalid at
computed-value time, and the element inherits its parent's size rather than erroring. studio had
to rename 88 usages.

Not changing — six applications depend on the names. Documented in the README with a `grep` to
run before installing.

---

## Bugs found in nilam, and how

Twenty-five, across six releases. **None was found by the assertions that existed at the
time.** Every one came from putting the package in front of a real application, or from someone
trying to reproduce a number that had been written down.

The nine in 0.6.0 are the first that were found by *looking for a class* rather than by hitting
one instance. The trigger was still an application: a tool builder reported that a hand-built
timeline track was invisible, which turned out to be `--neutral-3` on a card at 1.0009:1 — the
same ratio as the flai skeleton bug two releases earlier. The same ratio appearing twice is what
prompted the sweep, and the sweep found eight more.

| Found by | Bug |
|---|---|
| naina | Step 7 borders were 3.05:1 on the page and **2.70:1 on a card** — compliant in the docs, failing in the product |
| tools | `0.1.0` shipped with `nilam.tailwind.css` missing from the tarball while `exports` pointed at it |
| flai | `.n-skeleton` invisible on a card at **1.0009:1** — including in nilam's own showcase |
| flai | `.n-error` used flex with a gap, the exact trap `.n-summary` documents one screen away |
| flai | `.n-input` had no `[aria-invalid]` hook, so application-level validation left the border neutral |
| flai | `.n-table-num` wrapped "1.4 GB" onto two lines |
| naina | Loaders **frozen** under `prefers-reduced-motion` for three releases, while the comment beside them explained why freezing is harmful |
| naina | The skeleton would have breathed once and stopped |
| tools | `--chart-*` resolved to nothing, so **every chart painted solid black** |
| tools | The bridge claimed five chart steps were "guaranteed distinguishable". All ten pairs measure 1.01–1.91:1 |
| teleport | `.n-dialog` pinned top-left under **any** margin-zeroing reset |
| teleport | The documented Tailwind recipe omitted `motion.css` |
| aire | Meters had no visible extent — track at **1.08:1** against a card |
| aire | No `.n-btn-ok` / `.n-btn-warn`, so a matched Yes/No pair was impossible |
| aire | `disabled` + `aria-busy` gave an invisible spinner at ~1.09:1 |
| docs | The **23× shadow-alpha figure was wrong.** Measured properly it is about 10× |
| tools | A hand-built timeline track at `--neutral-3` on a card measured **1.0009:1** — the same number as the flai skeleton bug. Reporting it as "nilam needs a well token" is what started the audit |
| the audit | **Keyboard focus in a menu was invisible in dark mode** for every release. One rule served `:hover` and `:focus-visible`, ended in `outline: none`, and left a 1.0009:1 tint doing the work of a 4.9408:1 ring |
| the audit | `.n-slider-thumb:focus-visible` replaced the ring with a `--brand-6` halo at **1.3235:1** and changed nothing else |
| the audit | `.n-switch` had `border: none` while `.n-check` and `.n-radio` both carried `--neutral-7` |
| the audit | `.n-slider-track` never got the `--neutral-7` boundary the other three track components were given |
| the audit | `.n-table tr:hover` and `.n-summary:hover` were **1.0550:1 in light** — the only two that failed in the primary mode |
| the audit | `.n-menu-item:hover` and `.n-option:hover` at 1.0009:1, and their containers **are** `--surface`, so it was never conditional |
| the audit | `.n-avatar` had no edge, so at 1.0013:1 the disc vanished on a card in dark |
| the audit | The visual suite reads a **generated bundle**, so a `components.css` edit was invisible to it until rebuilt. A 4px red border moved zero pixels |

Each was a closed loop: the code that chose a value and the code that checked it made the same
wrong assumption, so nothing disagreed. Two comments confidently described the opposite of what
their code did.

That is now the load-bearing sentence in the source, and it is worth more than the palette:

> **An assertion that shares its premise with the thing it audits is not an audit.**
