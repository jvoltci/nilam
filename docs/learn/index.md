# Learn

Twelve chapters, from no background at all to reading every other page on this site.

Nothing here assumes you know what a design token is, what OKLCH means, what 4.5:1 refers
to, or why a colour scale has twelve steps. Each chapter explains its terms as it uses
them, and each one ends with **How nilam handles it** — the real token names, the real
numbers, and a link into the reference pages.

Read them in order the first time. After that they stand alone.

## The chapters

| | Chapter | The question it answers |
|---|---|---|
| 1 | [Why a design system](1-what-is-a-design-system.md) | Why not just write CSS? |
| 2 | [Why a hex code is a trap](2-hex-is-a-trap.md) | Why is `#808080` not half as bright as white? |
| 3 | [What 4.5:1 actually means](3-contrast.md) | Where does that number come from, and who enforces it? |
| 4 | [Why twelve steps](4-twelve-steps.md) | Why is "light, medium, dark" not enough? |
| 5 | [Dark mode is not inverting the colours](5-dark-mode.md) | What actually has to change, and what must not? |
| 6 | [Shadows, and why dark themes look flat](6-shadows.md) | Why does the same shadow vanish on a dark page? |
| 7 | [Colour blindness](7-colour-blindness.md) | What does red/green collapse actually look like? |
| 8 | [Type and space](8-type-and-space.md) | Why 1.2 and not 1.5? Why `rem`? Why 65 characters? |
| 9 | [The cascade](9-the-cascade.md) | Why did every old system need `!important`, and what changed? |
| 10 | [What the browser does for free](10-the-platform.md) | How much of 2020's JavaScript is now deletable? |
| 11 | [Tokens beyond CSS](11-tokens-beyond-css.md) | How does one decision reach Figma, iOS and Android? |
| 12 | [How you know you are right](12-how-you-know.md) | What can a test catch, and what can it never catch? |

## Three ideas that run through all of it

**A token is a decision with a name.** Not a colour, a decision. `--neutral-7` means "the
border of a control", and the reason it is that particular grey is that the requirement for
a control border picked it.

**A number you cannot check will drift.** Every scale in every system starts consistent and
ends with forty near-identical greys, because nothing fails when one moves. The fix is not
discipline. It is a test.

**Say plainly where it stops.** Roughly half of what follows is a measurement, which you
can re-run and disagree with. The rest is a judgement with its reasoning written next to it,
which you can argue with. Both are better than a value with no note attached, and
[Honest limits](../limitations.md) is the list of places where the measuring stops.

## If you only read one

Chapter 2. Almost every colour bug in almost every interface comes from the same
misunderstanding about what a hex code is, and it takes one page of arithmetic to clear up.
