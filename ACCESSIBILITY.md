# Accessibility of the Olympia color tokens

Every color token in `tokens/` is measured, not chosen by eye. This file states
what is measured, what the palette conforms to, and — the part that matters most
— **where color stops being able to carry meaning, so a consumer knows where a
label is mandatory rather than decorative.**

Run the assessment yourself:

```bash
node scripts/check-contrast.mjs            # assess; exits non-zero on any AA failure
node scripts/check-contrast.mjs --verbose  # every row, including the passing ones
node scripts/check-contrast.mjs --solve    # propose a value for anything failing
node scripts/check-contrast.mjs --aaa      # treat AAA as the gate instead of AA
```

It reads the values out of `tokens/colors.css` on disk and carries no palette of
its own. A checker holding its own copy of the palette measures the copy.

## Conformance

**WCAG 2.1 Level AA, on every measured token, against the worst surface it can
be painted on, in both themes.** Verified by the command above.

| Success criterion | Requirement | Status |
|---|---|---|
| 1.4.3 Contrast (Minimum) | 4.5:1 for text | conformant |
| 1.4.11 Non-text Contrast | 3:1 for borders, focus rings, icons, chart strokes | conformant |
| 1.4.6 Contrast (Enhanced), AAA | 7:1 for text | **not** conformant — 30 tokens fall short |
| 1.4.1 Use of Color | color is never the only carrier | conformant **only if consumers honor the label requirement below** |

AAA is reported but is not the gate. Reaching 7:1 across two themes would
require darkening the light-mode brand green well past the point where it still
reads as the Olympia green, and would flatten the accent hues into near-black.
The gap is stated rather than hidden: run `--aaa` to see exactly which tokens
fall short and by how much.

## What is measured, and how

- **Against the actual composited background, never against white.** `--bg-card`
  is an `rgba()` over the surface beneath it, so the effective color is the
  composite. Measuring a card token against the page base flatters it.
- **The worst surface with real consumers governs.** Each theme has four opaque
  surfaces plus the card wash over each. A token's reported ratio is its lowest
  across all of them — `--bg-elevated` in dark, `--bg-deep` in light.
- **4.5:1 for text, not 3:1.** The 3:1 threshold applies to large text (≥24px,
  or ≥18.66px bold) and to graphical objects. This repo cannot guarantee a type
  size for a consumer it does not control, so nothing is measured at 3:1 on the
  grounds that it might be rendered large.
- **A badge is measured on its own tinted background.** A badge paints its accent
  as text over that same accent at 10% opacity, so the accent is read against a
  pale wash of itself — a harder background than the page. The accents were
  solved against that, which is why the light-mode values are darker than a
  page-only solve would produce.
- **Both themes must declare every themed token.** A token present in one theme
  block and absent from the other silently inherits the other theme's value. The
  assessment reports that as a failure in its own right; it is how
  `--color-success` was once `#00ffae` in light mode, measuring 1.05:1.

The instrument carries eight controls, and refuses to report if any fails. Five
fix the contrast math against published WCAG reference pairs and the compositing
path; three calibrate the color-blindness detector, including one pair that
**must** be flagged and two that must not. A checker that cannot report a
failure proves nothing when it reports none.

## Where color stops working — read this before shipping a badge

Roughly **1 in 12 men** has a red-green color vision deficiency. The assessment
simulates protanopia, deuteranopia and tritanopia, and reports how much of each
meaningful pair's separation survives, on two axes: hue and lightness. A pair is
**at risk** only when both collapse.

**The finding: eight of thirteen meaningful pairs are at risk in light mode, four
in dark.** The worst is `--color-error` against `--color-warning` in light mode,
which retains 6% of its hue difference and almost no lightness difference under
deuteranopia.

**This is not fixable by choosing better colors, and that was measured rather than
assumed.** A constrained optimizer was run over every accent's lightness, holding
hue and chroma, maximizing the worst pairwise separation. It could not clear the
threshold in either theme without either driving the light-mode accents to
near-black — separation maximal, hue identity gone — or collapsing two
differently-meaning accents onto the same value. With the brand green and the
treasury amber pinned where they are, red sits between them on the confusion line
and no third color escapes it.

That is the situation SC 1.4.1 exists for, and it has a remedy:

> **Every badge, pill and chip renders its status as text. The color is redundant
> reinforcement and is never the carrier.**

`tokens/component.json` states this as `badge.requires-label`, a hard
requirement rather than a style note. Concretely, in any consuming site:

- **A bare colored dot is a conformance failure.** Give it a label, or a shape
  that differs, or an accessible name.
- **A color-only legend is a conformance failure.** Chart series need direct
  labels, distinct dash patterns, or markers — not a swatch key alone.
- **An icon carrying status by fill color alone is a conformance failure.** Its
  shape or its accessible name must carry the same meaning.
- **Do not pair two at-risk accents as the only distinction between two things.**
  The assessment names every such pair; read its output rather than guessing.

Two pairs are worth singling out because they are the ones a governance interface
leans on hardest:

| Pair | Light | Dark |
|---|---|---|
| success vs error | at risk under protanopia — 90% of hue lost | separable by lightness (0.41), hue 93% lost |
| error vs warning | at risk under deuteranopia — 93% of hue lost | separable by lightness (0.13), hue 63% lost |

In both themes the hue signal is largely gone for a red-green dichromat. Dark
mode survives on lightness alone; light mode does not. **A pass/fail indicator
must say "passed" or "failed".**

## Focus is non-negotiable

Every interactive element on every surface gets a visible keyboard focus
indicator: 2px solid `--focus-ring` at 2px offset, per `component.json`'s
`focus` block, which `tokens/tailwind.css` emits as a `:focus-visible` rule.
It is a non-text element and clears 3:1 under SC 1.4.11 in both themes. Removing
it without replacing it with something at least as perceivable is a regression,
not a style change.

## What this file does not cover

Color is one axis. A consuming site is still responsible for semantic HTML,
keyboard operability, focus order, motion preferences, target sizes, and text
resize behavior. Those are properties of an interface, and this repository ships
no interface — only the values one is built from. A palette that measures clean
here can still be built into a page nobody can use.

## When you change a token

1. Edit `tokens/primitive.json` or `tokens/semantic.{dark,light}.json`. Never
   edit `tokens/colors.css`, `tokens/colors.json` or `tokens/tailwind.css` —
   they are generated.
2. `node scripts/build-tokens.mjs` to regenerate.
3. `node scripts/check-contrast.mjs` — it must exit 0.
4. `node scripts/build-tokens.mjs --check` — it must exit 0, proving the
   generated files match the JSON.
5. State the measured ratio and the surface for every value you touched. A
   palette table with no ratios beside it is what produced the divergence this
   tooling exists to prevent.
