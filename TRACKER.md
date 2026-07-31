# Tracker

State of nilam and everything on it. Last verified 31 July 2026 against the real
repositories and the registry, not from memory.

---

## Shipped

| | |
|---|---|
| npm | `nilam@0.5.0` — zero dependencies |
| Docs | <https://jvoltci.github.io/nilam/> — 11 reference pages + 13 Learn pages |
| Assertions | 7,555 numeric (1,294 prove · 6,063 dtcg · 198 behaviours) + 31 visual baselines |
| CI | 5 jobs: prove on Node 18/24, generated-files-are-current, tarball-installs, css-parses, visual |
| Predecessor | achroma unpublished from npm, repo archived and pointing here |

**In the package:** solver · prover · dichromacy simulation · CLI · 12-step scales for 6
families · Display-P3 as a second proven palette · type/space/radius/motion/elevation scales ·
base layer · ~30 components · combobox and slider widgets · 4 loaders · ARIA APG keyboard
behaviours · Tailwind v4 / shadcn bridge · DTCG export with Figma, Style Dictionary, Swift and
Kotlin adapters.

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

Sixteen, across five releases. **None was found by the 7,555 assertions.** Every one came from
putting the package in front of a real application, or from someone trying to reproduce a number
that had been written down.

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

Each was a closed loop: the code that chose a value and the code that checked it made the same
wrong assumption, so nothing disagreed. Two comments confidently described the opposite of what
their code did.

That is now the load-bearing sentence in the source, and it is worth more than the palette:

> **An assertion that shares its premise with the thing it audits is not an audit.**
