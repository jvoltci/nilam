# 4 · Why twelve steps

Because twelve is how many distinct jobs a single colour family has to do, and every one of
those jobs has a different requirement.

The number is not a style. It is a count of roles.

## Start with three and see what breaks

"Light, medium, dark" sounds like enough. Give yourself exactly three greys and build one
ordinary thing — a settings card with a text field on it:

<div class="nd-demo">
  <p class="nd-label">three greys: #f5f5f5, #cccccc, #333333</p>
  <div style="background:#f5f5f5;padding:var(--space-4);border-radius:var(--r-4)">
    <div style="background:#f5f5f5;border:1px solid #cccccc;border-radius:var(--r-4);padding:var(--space-4)">
      <p style="color:#333333;font-weight:600;margin:0">Notifications</p>
      <p style="color:#cccccc;font-size:0.8125rem;margin:0.25rem 0 var(--space-3)">We will only email you about billing.</p>
      <input value="you@example.com" style="background:#f5f5f5;border:1px solid #cccccc;border-radius:0.5rem;padding:0.5rem 0.75rem;color:#333333;inline-size:100%;font:inherit">
      <div style="margin-block-start:var(--space-3)">
        <button type="button" style="background:#333333;color:#f5f5f5;border:1px solid #333333;border-radius:0.5rem;padding:0.5rem 0.875rem;font:inherit;font-weight:500;cursor:pointer">Save</button>
        <button type="button" style="background:#f5f5f5;color:#333333;border:1px solid #cccccc;border-radius:0.5rem;padding:0.5rem 0.875rem;font:inherit;font-weight:500;cursor:pointer;margin-inline-start:0.5rem">Cancel</button>
      </div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Four collisions in one card. <b>The card is the same colour as the page.</b> The field is the same colour as the card. The hint text is 1.61:1 and unreadable. The field border and the hint text are the same grey, so "you can edit this" and "you can ignore this" look identical. And there is no fourth grey left for a hover state, so nothing responds to the pointer.</p>
</div>

Now the same card with a twelve-step ramp:

<div class="nd-demo">
  <p class="nd-label">the same markup, on tokens</p>
  <div style="background:var(--neutral-1);padding:var(--space-4);border-radius:var(--r-4)">
    <div class="n-card n-card-pad">
      <p style="font-weight:var(--weight-semibold)">Notifications</p>
      <p style="color:var(--neutral-11);font-size:var(--text-0);margin-block:var(--space-1) var(--space-3)">We will only email you about billing.</p>
      <input class="n-input" value="you@example.com">
      <div class="nd-row" style="margin-block-start:var(--space-3)">
        <button class="n-btn n-btn-fill" type="button">Save</button>
        <button class="n-btn" type="button">Cancel</button>
      </div>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Page is step 1, card is <code>--surface</code>, card edge is step 6, field border is step 7 at 3.05:1, hint text is step 11 at 4.55:1, the filled button is step 9 with its own solved ink. Hover any of the three controls — each has its own step.</p>
</div>

## The twelve roles

The model is Radix's — a hand-tuned system whose grouping this is. It is good design and there
was no reason to reinvent it.

| Step | Role | Reads as |
|---|---|---|
| 1 | page background | the app |
| 2 | subtle page background | a striped row, a sunken well |
| 3 | component surface, **rest** | the body of a card, a chip, a listbox |
| 4 | component surface, **hover** | the same thing under the pointer |
| 5 | component surface, **active** | the same thing being pressed |
| 6 | border, subtle | a card edge — decoration |
| 7 | border, normal | the edge of a **control** — WCAG 1.4.11, 3:1 |
| 8 | border, hover | the same edge under the pointer |
| 9 | **solid** | a filled button, a badge — the brand moment |
| 10 | solid, hover | the same button under the pointer |
| 11 | text, low contrast | secondary copy, hints, placeholders — 4.5:1 |
| 12 | text, high contrast | headings and body — 7:1 |

Read down it and the structure appears. **Four groups of two or three**, each group being one
job at its three interaction states:

- **1–2** backgrounds
- **3–5** component surfaces: rest, hover, active
- **6–8** borders: decorative, normal, hover
- **9–10** solids: rest, hover
- **11–12** text: quiet, loud

Twelve is what you get when you enumerate that honestly. Not a round number — a total.

<div class="nd-demo">
  <p class="nd-label">the neutral ramp, all twelve</p>
  <div class="nd-scale-nums">
    <b></b><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b><b>10</b><b>11</b><b>12</b>
  </div>
  <div class="nd-scale"><span>neutral</span><i style="background:var(--neutral-1)"></i><i style="background:var(--neutral-2)"></i><i style="background:var(--neutral-3)"></i><i style="background:var(--neutral-4)"></i><i style="background:var(--neutral-5)"></i><i style="background:var(--neutral-6)"></i><i style="background:var(--neutral-7)"></i><i style="background:var(--neutral-8)"></i><i style="background:var(--neutral-9)"></i><i style="background:var(--neutral-10)"></i><i style="background:var(--neutral-11)"></i><i style="background:var(--neutral-12)"></i></div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Steps 1 to 6 look almost identical and that is correct — six of the twelve jobs are "a surface slightly different from the surface next to it". The visible jumps are at 7 and at 11, which are the two steps a legal requirement picked.</p>
</div>

## Why the top of the ramp is not evenly spaced

Look again at 7, 8, 9, 10, 11. In lightness terms they are almost on top of each other, and 9
is *lighter* than 8.

That is not a defect. Each of those five answers a different question:

- **7** is the lightest colour that still clears 3:1 against a card.
- **8** goes further, to 4.2:1, so a hover is felt.
- **9** is the lightest colour that clears 3:1 against the *page* **and** carries a legible
  label of its own.
- **11** is the lightest colour that clears 4.5:1 against a card.
- **12** goes to 7:1.

Five different constraints. There is no reason for the answers to be evenly spaced, and
forcing them to be even is how a hand-tuned ramp ends up with a step that satisfies nothing.

## The same twelve for every family

Every family — `neutral`, `brand`, `danger`, `warn`, `ok`, `info` — has the identical twelve
roles and the identical floors. So switching context is switching one word:

```css
.note        { background: var(--neutral-3); border-color: var(--neutral-7) }
.note-danger { background: var(--danger-3);  border-color: var(--danger-7)  }
```

`--danger-7` is a 3:1 border in exactly the way `--neutral-7` is. Nothing about the layout has
to change and nothing has to be re-checked, which is the practical payoff of roles over
shades.

## Interaction states have to be felt

3 → 4 → 5 is rest, hover, active. If the three look the same, the component has no hover, and
this is where hand-tuned scales quietly collapse — the difference is small by design, so it is
the easiest thing in the world to lose.

nilam asserts it. Adjacent interaction steps must differ by at least **0.012** in OKLab, a
distance that is roughly the threshold of "I can see that something changed".

| pair | required | shipped brand, light | shipped brand, dark |
|---|---|---|---|
| 3 → 4 (rest → hover) | 0.012 | **0.0203** | 0.0337 |
| 4 → 5 (hover → active) | 0.012 | 0.0219 | 0.0331 |
| 9 → 10 (solid → hover) | 0.012 | **0.0410** | 0.0464 |

<div class="nd-demo">
  <p class="nd-label">3, 4, 5 — hover and press the button beside them</p>
  <div class="nd-grid">
    <div>
      <div class="nd-chips">
        <i style="background:var(--neutral-3);color:var(--neutral-12);border:1px solid var(--neutral-6)">3</i>
        <i style="background:var(--neutral-4);color:var(--neutral-12);border:1px solid var(--neutral-6)">4</i>
        <i style="background:var(--neutral-5);color:var(--neutral-12);border:1px solid var(--neutral-6)">5</i>
      </div>
    </div>
    <div class="nd-row">
      <button class="n-btn" type="button">Hover me</button>
      <button class="n-btn n-btn-fill" type="button">And me</button>
    </div>
  </div>
  <p class="nd-note" style="margin-block-start:var(--space-4)">Barely a difference as swatches, unmistakable as a state change. A hover nobody can see is a hover that does not exist.</p>
</div>

## Why step 1 is not pure white

Step 1 is the page, and it is the one value in the whole palette that is chosen rather than
solved — there is nothing to solve it against, because everything else is solved against
*it*.

It is **not** `#ffffff`. A page at lightness 1.000 has no headroom left above it, so a raised
surface has nowhere to go. That is a measured defect, not a theory: in achroma, nilam's
predecessor, the light-mode card managed **1.044:1** against its page, which is invisible.

nilam's page is L 0.980 in light and L 0.175 in dark.

## The card, and the one surface with no colour in it

`--neutral-1`, the page, carries a chroma of 0.007 — a whisper of the brand hue. `--surface`,
the card, carries **none at all**: pure white in light mode, a flat `#202020` in dark.

The inversion is the point. **The page's tint reads as light precisely because the card beside
it has none.** The eye compares; it does not measure. So the pairing gets a *chroma* step as
well as a lightness step, and separates on two channels instead of one.

<div class="nd-demo" style="background:var(--neutral-1)">
  <p class="nd-label">page is --neutral-1 · card is --surface</p>
  <div class="n-card n-card-pad">
    <p style="font-weight:var(--weight-semibold)">A card on the page</p>
    <p style="color:var(--neutral-11);font-size:var(--text-0);margin-block-start:var(--space-2)">1.060:1 in light mode, 1.171:1 in dark. A lightness step that small would be invisible on its own — the chroma step, the hairline and the shadow are what carry it.</p>
  </div>
</div>

There is a trap inside that, and nilam shipped it. **In dark mode `--surface` and `--neutral-3`
have identical lightness** — 0.2455 both, differing only by the 0.007 of chroma, which is
1.0009:1. That is deliberate: the dark card is the untinted version of the component surface.

Good for cards. Fatal for anything drawn *on* a card out of step 3. The skeleton loader was
built from steps 3 and 4, so on a dark card it was **completely invisible** — the component
whose entire job is to say "content is coming" said nothing on the surface it sits on most
often, and it was true in the project's own showcase for several releases. It is now built from
steps 5 and 7, which measure 1.18:1 against a dark card.

The general form of that is worth keeping: a solved ramp tells you what each step is for
*relative to the page*. It does not tell you which pairs of steps happen to coincide in one
mode.

## Two more recorded mistakes, because they teach the rule

**Steps 2 to 5 are solved as contrast, not as fixed lightness deltas.** A fixed delta is a
different perceptual step in light mode than in dark. In achroma "one step" produced 1.044:1
in light and 1.104:1 in dark from the same instruction. The fix is to state the requirement as
a ratio and let the lightness follow.

**The greys carry a constant chroma, not a capped one.** The first version capped neutral
chroma at 0.022, and a cap only *binds* where the value would exceed it — which was from step
6 up. So neutral steps 1 to 5 came out byte-identical to the brand's, and a brand-tinted
callout background became inexpressible. In a system whose premise is that colour does work,
that is the worst possible defect. `NEUTRAL_CHROMA = 0.007` is now a constant, measured off a
shipped interface whose greys run 0.007 to 0.020 around hue 285.

## Why not twenty steps

Because every step has to be a role you can name.

If you cannot say what a step is *for*, nobody can be wrong about using it — and an unnamed
step gets used arbitrarily. That is chapter 1's forty greys, arriving through the front door
with a numbering scheme.

Twelve is the number of jobs. Adding a thirteenth means finding a thirteenth job.

## How nilam handles it

The twelve roles are **contracts a solver satisfies**, rather than labels on hand-chosen
swatches. Ten of the twelve steps are found by inverting a contrast requirement; step 1 is the
anchor, and step 9's dark-mode lightness is the one value in the system that is chosen rather
than derived.

Two rows in the contract table are worth singling out, because they were both bugs first:

| Step | Solved against | Floor |
|---|---|---|
| 7 | **step 3**, the card | 3:1 — WCAG 1.4.11 |
| 11 | **step 3**, the card | 4.5:1 — WCAG 1.4.3 |

Not against the page. Against the worst surface the token is allowed to sit on. Solving
against the page and then using the token on a card is how a system ships a ratio that was
true in the documentation and false on screen.

Six families of twelve, plus an ink token each, one shared card surface and two values the
twelve steps cannot express: **81 colour tokens**.
`info` is the neutral scale byte for byte, which chapter 7 explains, and it keeps the identical
twelve-step shape and the identical floors — only the chroma is gone.

**Next:** [dark mode is not inverting the colours](5-dark-mode.md).

**Reference:** [Tokens](../palette.md) has all six ramps live, both modes, plus the shipped hex
values. [The role model](../solved.md#the-role-model) has the full contract table with every
floor.
