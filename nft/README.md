# CoreNFT artwork

Where CoreNFT token artwork is designed, before it is deployed.

The v0.3 demo was built outside this repository, so its artwork exists only
wherever it was generated and cannot be revised, re-rendered or reviewed. That
is the gap this directory closes: the next version — demo v0.4 — is designed here first, with
the same brand tokens, fonts and checks as everything else.

```
nft/
  README.md          this file — the guidance
  spec.json          the design the on-chain renderer implements
  v0.3-demo/         the shipped demo, kept as reference. Add its SVG here
  v0.4/              artwork for the next version
```

**`spec.json` is a first draft.** It was derived from what v0.3 already did plus
this repository's brand system, not from a survey of how on-chain NFTs are built
well. Treat the current values as a working baseline that later work will revise.

**Artwork belongs here; plans and decisions do not.** In-progress change-lists,
research tasks and deployment checklists live in `.local/`, which is ignored —
this directory holds the design and the assets, not the project management around
them.

## What the CoreNFT is

Read `../SKILL.md`'s vocabulary table before writing a word of copy. The short
version, because it constrains the artwork as much as the language:

**A CoreNFT is earned through contribution to Ethereum Classic. It is not for
sale.** It is soulbound, non-transferable, non-delegable, one vote per Core
Contributor, never weighted by balance. The holder is a **Core Contributor** —
never a "member" or a "holder", both of which imply a purchase route that does
not exist.

So the artwork should read as a **credential**, not as a collectible. No rarity
tiers, no edition counts, no floor-price affordances, nothing that invites a
comparison of one token against another. A serial number identifies a person's
contribution; it does not rank it.

## How it actually renders

**The artwork is generated on-chain, in Solidity.** It is not a file anyone
uploads. Read the implementation before designing against it — everything below
was read from the contracts on 2026-08-09, in
`olympiadao/olympia-governance-contracts`:

| File | What it does |
|---|---|
| `src/nft/OlympiaSVG.sol` | builds the SVG, ~366 lines |
| `src/nft/OlympiaDAOMemberRenderer.sol` | wraps it in metadata and returns `tokenURI` |
| `src/nft/IOlympiaDAOMemberRenderer.sol` | the interface |

**Canvas is `viewBox="0 0 500 500"`** — square, and 500 units specifically.

**The tokenURI is doubly base64-encoded**: the SVG is base64'd, embedded in a
JSON blob, and the whole blob is base64'd again behind
`data:application/json;base64,`. The same SVG is supplied as both `image` and
`animation_url`, so a surface that honors `animation_url` gets motion and one
that does not still gets the artwork.

**Fonts.** The contract uses one constant:

```solidity
string private constant FONT = "'JetBrains Mono', 'Courier New', monospace";
```

That is the right shape — the brand face first, a near-universal mono second, the
generic category last. `../fonts/` cannot help a viewer here, so **assume
substitution and never position text by measured advance width.**
`../scripts/build-og.mjs` measures advances to size its chips; that technique is
correct for a PNG we render ourselves and wrong on-chain.

**Animation is SMIL `<animate>`, five of them**, which survives explorer
sanitization where scripted animation does not:

- One opacity pulse on the glow — `values=".1;.25;.1"`, `dur="3s"`.
- Four `startOffset` animations, `0%`→`100%` over `dur="30s"`, on four
  `<textPath>` elements seeded at `-100%`, `-50%`, `0%` and `50%`. **That is how
  the border text rotates seamlessly**: four copies phase-shifted around one
  path, so a copy is always entering as another leaves. Keep the technique;
  changing the count or the offsets breaks the seam.

**A static first frame must still read.** Some surfaces render one frame only.

**Size costs gas.** Favor generated geometry over embedded raster.
`../logo/olympia-torch.svg` is genuine vector and can be simplified further; the
raster PNGs cannot be used here at all.

## What changes for v0.4

- **The torch joins or replaces the ETC diamond.** v0.3 used the ETC diamond
  because the torch mark did not exist yet. It does now, as true vector at
  `../logo/olympia-torch.svg`, `currentColor`-driven so it recolors with one
  attribute. Whether both marks appear — the torch for Olympia, the diamond for
  the Ethereum Classic contribution being certified — is an open design
  question, not a settled one.
- **The rotating border text stays.** It is the strongest idea in v0.3.
- **Per-token data stays.** Contributor number, address, mint block, status.

## HUD and circuitry

The token carries the same visual vocabulary as the share cards in `../social/`
— corner brackets, crosshairs, a measurement rule, PCB traces terminating in
nodes, and a reticle framing the mark. That shared grammar is what makes a
CoreNFT read as part of the Olympia suite rather than as a separate artifact.
`spec.json`'s `hud` block carries the counts, stroke widths and opacities.

**Two things differ from the share cards, and both are the point.**

**Thumbnail scale.** An explorer inventory grid renders the 500-unit canvas at
roughly 150–300px — about 0.30x. The share cards use trace opacities as low as
`0.07`, which measures **1.12:1** against the card background and disappears
entirely at that size. Every opacity here is floored at **0.15**, and anything
carrying structure sits at **0.30** or above. A card is looked at; a token is
scrolled past in a grid.

**Gas.** Every path is bytes, and bytes cost gas on a fully on-chain render. The
share cards can afford fifteen-plus traces; this cannot. `maxPaths` bounds the
total, and the checker enforces it. Prefer a few deliberate elements to a dense
field — which is also the better call at thumbnail scale, where density reads as
noise.

**The traces run into the base of the mark.** Infrastructure feeding the flame.
It is the one idea the share cards contributed that is Olympia's own, and it is
why the torch belongs at the end of the routing rather than floating above it.

**These are pure decoration, and the distinction matters.** WCAG 2.1 SC 1.4.11
explicitly exempts decoration from the 3:1 non-text threshold, and an NFT has no
controls to perceive. So the opacity floor is **this brand's requirement, not a
conformance one** — `check-nft-contrast.mjs` reports it under its own heading for
exactly that reason. Do not quote HUD ratios as WCAG results.

## It is a template, not an asset

This is the part that makes CoreNFT unlike everything else in this repository.
`logo/`, `social/` and `favicon/` are fixed files. A CoreNFT is **generated per
token**, so what gets designed here is a layout with substitution points and the
rules for how it behaves when the data varies:

| Field | Varies how | Design must survive |
|---|---|---|
| Contributor number | `#0` to `#9999`+ | one digit to four or more without reflowing the layout |
| Address | `0x` + 40 hex, usually shown truncated | a consistent truncation rule, applied in one place |
| Mint block | 8-9 digits today, more later | growth, without a hardcoded width |
| Status | a small closed set | every value in the set, not just `Active` |

**Enumerate the states and render the extremes.** A layout tuned to `#0` will
break on `#1024`, and nothing will catch it before someone mints.

## Color and accessibility

Colors come from `../tokens/`. Use `../tokens/colors.json` — it carries both
themes fully resolved as literals, which is what a renderer with no CSS cascade
needs. **Never type a brand hex directly into the artwork**: a hardcoded value
is a fork of the palette that no check will ever re-examine.

The suite is unified on the brand green `#00ffae` on near-black. Amber stays
reserved for treasury and financial data.

Contrast still applies even though this is an image, and **it is measured**:

```bash
node ../scripts/check-nft-contrast.mjs            # assess; non-zero on any AA failure
node ../scripts/check-nft-contrast.mjs --solve    # propose a value for each failure
node ../scripts/check-nft-contrast.mjs --verbose  # every row, including passes
```

It reads `spec.json` and resolves each color against `../tokens/colors.json`, so
a brand token change is caught here rather than silently diverging on-chain. It
measures **every text role on every per-token card background** — a role that
passes on four of five backgrounds fails for a fifth of holders — applies 4.5:1
to small text and 3:1 to large text and glows, and carries controls including
one pair that must fail.

`../scripts/check-contrast.mjs` does NOT cover this directory; it reads
`tokens/colors.css` and knows nothing about the NFT. The two are separate gates.

An NFT is a single image with no text layer, so **the metadata carries the
accessibility.** Write a real `description` in the token metadata that states
what the token certifies and its identifying data. For a screen-reader user that
description is the artwork.

## Reference: the v0.3 demo

Demo Contract v0.3, Mordor testnet, `0xb4D45A498994C89553A9c923c6b85F7623C0843e`.
It proved the animation and the first draft of the layout: squircle frame, ETC
diamond, wide-tracked mono wordmark, a green-on-dark metadata block, and the
rotating border text carrying "core software · critical infrastructure · network
security" and "ethereum classic core contributor · olympia dao".

**Its rendered artwork is not in this repository yet.** Pull the SVG out of a
minted token's `tokenURI` and add it to `v0.3-demo/`, so v0.4 can be diffed
against something real rather than against a memory of it.
