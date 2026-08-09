# Olympia logo usage

Rules for using the marks in this repository. Every fact below was read off the
files themselves; where a file is not what its extension suggests, that is said
plainly rather than left for someone to discover by shipping a blurry logo.

## The two marks

| Mark | Files | What it is |
|---|---|---|
| **Olympia mark** | `logo/olympia-torch.svg` (vector master), `logo/olympia-logo.png`, `logo/png/*`, `favicon/olympia/*` | The primary identity — a torch with a flame, an ETC diamond set into the handle |
| **ETC diamond** | `logo/ETC-logo.svg`, `favicon/etc/*` | The Ethereum Classic diamond, `#33FF99`, genuine vector at `viewBox="0 0 512 512"` |

They coexist deliberately. Use the Olympia mark for Olympia products; use the
ETC diamond where the subject is Ethereum Classic itself.

## Use `logo/olympia-torch.svg` — it is the vector master

**`logo/olympia-torch.svg` is the file to reach for.** Genuine vector, bounded to
its own ink, `fill="currentColor"` with `color="#ffffff"` so it renders the
iconic flat white mark standalone and recolors by setting one attribute. It
scales to any size and carries no background plate.

**`logo/olympia-logo.svg` is not vector art.** It is a 128×128 raster embedded as
base64 inside an SVG wrapper — an `.svg` extension around a bitmap. Scaling it up
gives you a soft, upscaled 128px image at whatever size you asked for, with none
of the crispness the extension implies. It stays in the repository because
consuming sites reference that path; it is not the file to build with.

- **Master:** `logo/olympia-logo.png` (400×400) — the largest genuine raster.
- **Prepared sizes:** `logo/png/olympia-logo-{64,128,256,512}.png`, plus
  `-black-{256,512}` and `-white-{256,512}` single-color variants.
- **Never upscale past the master.** `olympia-logo-512.png` already exceeds the
  400×400 master; treat 400px as the honest ceiling for new renders and prefer
  the nearest prepared size below your target.

The **ETC diamond is genuine vector** and scales cleanly to any size. The
distinction matters and does not generalize — do not assume "the SVG is the
source" anywhere in this repo.

## Wordmark and lockup

| File | viewBox | Color |
|---|---|---|
| `logo/wordmark-green.svg` | `0 0 200 32` | `#00ffae` |
| `logo/wordmark-white.svg` | `0 0 200 32` | `#ffffff` |
| `logo/wordmark-black.svg` | `0 0 200 32` | `#000000` |
| `logo/lockup-horizontal-white.svg` | `0 0 400 80` | `#ffffff` |
| `logo/lockup-horizontal-black.svg` | `0 0 400 80` | `#000000` |

- **The green wordmark is for dark backgrounds only.** `#00ffae` measures 1.3:1
  on a pale surface — it is the dark-theme brand green, and on white it is
  effectively invisible. On light backgrounds use the black wordmark, or the
  light-theme green `#007a53` if the wordmark must be branded.
- **Pick the lockup by background, not by theme name.** White lockup on dark,
  black lockup on light. There is no green lockup, deliberately: at lockup sizes
  the wordmark is small text and needs full contrast.

## Clear space and minimum size

- **Clear space:** at least 25% of the mark's width on every side. Nothing —
  type, rules, other logos, the edge of a card — enters that margin.
- **Minimum size, mark alone:** 32px. Below that the facets stop resolving; use
  the favicon package instead, which is drawn for small sizes.
- **Minimum size, lockup:** 160px wide. The lockup is 5:1, so below that the
  wordmark falls under readable size.
- **Favicons are a separate package,** already rendered at every required size
  in `favicon/olympia/` and `favicon/etc/`. Do not generate a favicon by
  downscaling a logo.

## Color

- **Full color on a dark surface** is the default presentation.
- **On a light surface,** use the black or single-color variant. Do not place the
  neon green mark on white.
- **On a photo or busy background,** use the white or black single-color variant,
  whichever holds contrast — not the full-color mark.
- **Never recolor the mark to a non-brand color**, and never to the treasury
  amber: amber is reserved for olympiatreasury.org and financial data.
- Colors in any asset come from `tokens/`. A hex typed directly into an SVG is a
  fork of the palette that nothing will ever re-check.

## Do not

- Stretch, squash, or otherwise change the aspect ratio.
- Rotate the mark.
- Add a drop shadow, glow, bevel, or outline. `--brand-green-glow` exists for
  surrounding UI, not for the mark itself.
- Redraw, trace, or "clean up" either mark's geometry. That is an operator
  decision, not a design one.
- Place the mark inside a shape it was not drawn for — the Olympia mark is
  already a squircle; putting it in a circle or a rounded rectangle double-frames
  it.
- Rename or move any file listed here. Four sites reference these paths directly
  and nothing in this repo can detect what a rename breaks.

## Accessibility

A logo is exempt from contrast requirements as such — WCAG 2.1 SC 1.4.11 excludes
logotypes. That exemption covers the *mark*, not the words next to it: a
wordmark used as a heading, or a lockup used as a page title, is text and needs
4.5:1. When the logo is a link or a button, it still needs a visible focus
indicator and an accessible name.
