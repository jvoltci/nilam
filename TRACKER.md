# Tracker

State of nilam and everything on it. Last verified 31 July 2026 against the real
repositories and the registry, not from memory.

---

## Shipped

| | |
|---|---|
| npm | `nilam@0.4.4` — 29 files, zero dependencies |
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

### 1. The Tailwind bridge omits everything that is not a colour

Priority: **highest of the open items.** Found by aire.

The bridge maps colour, radius, shadow, easing and font-family. It does **not** map the type
scale, weights, spacing, leading or tracking. So in a Tailwind app `text-display` and
`font-thin` do not exist as classes, and the app runs two type scales at once: nilam's inside
`.n-*` components, Tailwind's on everything else.

This is the difference between "nilam styles your components" and "nilam is your design
system" in a Tailwind app. Bounded, mechanical work.

### 2. Per-app items, honestly flagged rather than hidden

| App | Item |
|---|---|
| studio | XY pads have no keyboard equivalent (WCAG 2.1.1). Pre-existing; `role` and `aria-label` added, but a keyboard user still cannot sweep the filter |
| studio | `ArrangerDrawer` is not a `<dialog>` and has no focus trap. It renders a modal as a sibling, so `showModal()` would make that inert and paint it underneath |
| studio | Canvas text over the procedural gradient has no contrast guarantee — only the two data readouts got plates |
| teleport | Video, screen-share and the call bar were never rendered; they need two peers with media tracks, and only data channels were exercised |
| teleport | Content clips at a 900px viewport and cannot be scrolled to. `overflow-hidden` on `body` and the page root is pre-existing |
| aire | Never tested against the live API — all driving used a mock written from reading `aire-api` |
| aire | No CI workflow exists at all |
| naina | `rust` CI job has failed since 29 July on `unable to find library -lonnxruntime`. Unrelated to any of this |
| naina | `bindings/wasm/src/index.d.ts` declares `quad: number[]` where the runtime emits `number[][]` — the root cause of an overlay that had never painted |

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
