---
name: olympia-design
description: Use this skill to generate well-branded interfaces and assets for the Olympia ecosystem on Ethereum Classic — the DAO, treasury, futarchy and governance surfaces — whether for production or for a throwaway prototype or mock. Contains the contrast-validated design tokens, badge/pill/chip recipes, brand guidelines, color, type, logo assets, and the accessibility rules the palette depends on.
user-invocable: true
---

Read `README.md` and `ACCESSIBILITY.md`, then `tokens/component.json`, then
explore. If the user invokes this skill without other guidance, ask what they
want to build, ask some questions, and act as an expert designer producing HTML
artifacts *or* production code as the need dictates.

## How this repo is meant to be used

**`tokens/` is data and is the source of truth. Nothing here is a component
library, and you should not build one.**

Four Olympia front ends consume these values — olympiadao.org,
olympiatreasury.org, ethereumclassicdao.org and app.olympiadao.org. None of them
imports this repo as a package; they copy the token values into their own
`globals.css`. So what is shared is token *values* and design *intent*; each
surface writes its own implementation.

| Path | What |
|---|---|
| `tokens/primitive.json` | raw palette, DTCG 2025.10. Never reference directly from a component |
| `tokens/semantic.{dark,light}.json` | role tokens — what a component actually reads |
| `tokens/component.json` | **read this before designing anything.** Which token each part of a badge, pill, chip, button, card or focus ring reads, per variant and state |
| `tokens/colors.css`, `colors.json`, `tailwind.css` | **generated** by `scripts/build-tokens.mjs`. Never hand-edit |
| `logo/ favicon/ social/` | brand assets. Consume by path; never rename or move |
| `nft/` | CoreNFT artwork. Read `nft/README.md` before designing one — it renders on-chain, so most of this repo's assumptions do not hold there |

`component.json` carries **no density** — padding, height and gap are each
product's call, because a marketing page and a dApp table need different ones.

## Quick orientation

- **Identity:** on-chain governance infrastructure for Ethereum Classic.
  Serious, technical, credible. Neon green on a near-black foundation in dark
  mode; a deep forest green on near-white in light.
- **Color:** brand green `#00ffae` dark / `#007a53` light. Surfaces
  `#111111`/`#181818` dark, `#ffffff`/`#f1f5f3` light. Dark is the default;
  light is a full parity theme, not an afterthought.
- **Light mode darkens the green,** and this is a real design decision, not an
  implementation detail: `#00ffae` measures 1.3:1 on a pale surface and cannot
  carry text. Honor it on every surface.
- **Amber is reserved.** `--brand-amber` belongs to olympiatreasury.org and to
  financial data. It is not a general accent and not a warning color —
  `--color-warning` is its own token. Do not reach for amber to make something
  look important.
- **Type:** Inter for headings and body, JetBrains Mono for anything technical —
  addresses, hashes, block numbers, chain IDs, vote counts. Mono is part of the
  brand and should carry the on-chain data.
- **Six accent hues** — violet, teal, rose, orange, sky, amber — each a
  theme-aware pair. They exist for badges, pills and chips, and they are mapped
  to meanings in `component.json`, not chosen per call site.

## Vocabulary

Brand language, not just brand color. These are decisions, and getting them
wrong misrepresents how the system works.

| Use | Not | Why |
|---|---|---|
| **Core Contributor** | member, holder, owner | The CoreNFT is **earned** through contribution to Ethereum Classic. It is not for sale. "Member" and "holder" both imply you could buy in, which is the opposite of what the token certifies |
| **CoreNFT** | Core DAO, Core NFT | The governance token's name. "Core DAO" named a product that does not exist and is already covered by Olympia DAO |
| **earned** | minted to, airdropped, granted | Same reason as the first row: the verb carries the claim |

The CoreNFT is **soulbound, non-transferable, non-delegable, one vote per Core
Contributor, never weighted by balance**. Do not write copy implying a balance,
a quantity, a transfer, a sale or a delegation — every one of those describes a
token this is deliberately not.

## The accessibility rules are not optional

The palette is WCAG 2.1 AA conformant and there is a script that proves it:

```bash
node scripts/check-contrast.mjs
```

Run it after any color change. It exits non-zero on a failure and carries eight
controls so it cannot silently pass.

**Three rules that will bite you if you improvise:**

1. **Measure against the composited background, never against white.** `--bg-card`
   is an `rgba()` over the surface beneath it. The worst surface governs.
2. **A badge is measured on its own 10% tint,** which is a harder background than
   the page. That is why the light accents are darker than they look like they
   need to be.
3. **Color is never the only carrier of meaning.** Under a red-green deficiency
   (about 1 in 12 men), eight of thirteen meaningful pairs lose most of their
   separation in light mode, and no palette fixes it. So: every badge, pill and
   chip renders its status as **text**. No bare colored dots. No color-only
   chart legends. No status icons distinguished only by fill. `component.json`
   states this as `badge.requires-label`.

**Focus is non-negotiable.** Every interactive element gets a visible keyboard
indicator: 2px `--focus-ring` at 2px offset.

## Charts and other literal-color consumers

Chart libraries take literal color values, not CSS variables, so a consumer must
switch on the resolved theme — a bare hex renders one theme's value in both.
`tokens/colors.json` exists for exactly this: it carries both themes fully
resolved, with no `var()` indirection.

Chart strokes and markers are graphical objects and need 3:1 (SC 1.4.11), not
4.5:1 — but series must still be distinguishable by something other than hue.
Direct labels, dash patterns or markers, never a swatch key alone.

## Logo

See `LOGO-STYLE.md` for clear space, minimum sizes, and what not to do.

The short version: **reach for `logo/olympia-torch.svg`.** It is the isolated
mark as genuine vector — no plate, no padding — `currentColor`-driven, so one
file gives you white on dark, near-black on light, or brand green, by setting a
single attribute. It scales to any size.

Two traps in the older files, both kept because consuming sites reference their
paths: `logo/olympia-logo.svg` is **not** vector, it is a 128×128 raster in an
SVG wrapper, so enlarging it produces a soft upscale; and its raster siblings in
`logo/png/` top out at a 400×400 master. The ETC diamond
(`logo/ETC-logo.svg`) *is* genuine vector and scales cleanly.
