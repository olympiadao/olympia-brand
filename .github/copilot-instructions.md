<!--
  Self-contained by choice, not a thin AGENTS.md delta: this is a public repo,
  and several Copilot surfaces (github.com Chat, JetBrains/Eclipse/Xcode Chat
  and code review) never read AGENTS.md at all. On those surfaces this file is
  the only instruction the model sees. Where a surface does read both, GitHub
  and VS Code both state that neither file is dropped in favor of the other,
  so duplication with AGENTS.md is an accepted, actively maintained cost, not
  an oversight. Keep the two in sync when either changes.
-->

# Olympia Brand: Copilot instructions

Canonical brand-asset repository for the Olympia ecosystem on Ethereum
Classic: design tokens, logos, favicons, and OG images. No application code.
This repo is a source of static assets and token values consumed by other
repositories.

**License:** Apache License 2.0. Never change, remove, or suggest changing
`LICENSE`; that is an operator decision, not this file's call.

## What consumes this repo

Four sites — olympiadao.org, olympiatreasury.org, ethereumclassicdao.org and
app.olympiadao.org. None references this repo via a git submodule or a package
dependency; consumption is by direct file reference or manual copy.

So: **every currently-tracked path is a public interface** — renaming or moving
a file is a breaking change for whatever references the old path, and nothing
here can detect who that is. And **nothing propagates automatically** — a token
value corrected here reaches a consumer only when someone edits that consumer.

## Structure

```
tokens/*.json       SOURCE — primitive, semantic.{dark,light}, component (DTCG 2025.10)
tokens/colors.css   GENERATED — do not hand-edit
tokens/colors.json  GENERATED — do not hand-edit; resolved literals for non-CSS consumers
tokens/tailwind.css GENERATED — do not hand-edit; Tailwind 4 @theme block
scripts/            build-tokens.mjs, check-contrast.mjs, lib/color.mjs
logo/ favicon/ social/   brand assets; consume by path, never rename or move
ACCESSIBILITY.md    what the palette conforms to, and where color stops working
```

Two mark families coexist on purpose: an ETC diamond (three-facet vector shape,
`#33FF99`, real SVG path data) and a separate Olympia mark.

**Source-of-truth differs per mark.** For the ETC mark the SVG is genuine vector
source. For the Olympia mark it is not: `logo/olympia-logo.svg` is a 128×128
raster wrapped in an SVG container, while `logo/olympia-logo.png` is a separate
400×400 file and the more plausible source. They are not byte-identical. Do not
assume every SVG here is vector source, or you will upscale a small raster.

## Commands

No `package.json`, no lockfile, nothing to install, no CI. The scripts are
dependency-free Node, run by hand:

```bash
node scripts/build-tokens.mjs           # regenerate the CSS and colors.json
node scripts/build-tokens.mjs --check    # verify they match the JSON; writes nothing
node scripts/check-contrast.mjs          # accessibility assessment; non-zero on failure
```

Both must exit 0 before token work is complete. There is **no lint, test, or
build command** — do not invent a call to one.

## Design tokens

**The JSON is source; the CSS and `colors.json` are output.** Change the JSON
and regenerate. Dark is the default theme; light is `[data-theme="light"]` or
the OS preference.

| Role | Dark | Light |
|---|---|---|
| Brand green | `#00ffae` | `#007a53` |
| Page background | `#0a0f10` | `#f8faf9` |
| Surface / elevated / deep | `#111111` / `#181818` / `#080b0c` | `#ffffff` / `#f1f5f3` / `#edf2f0` |
| Treasury amber | `#f59e0b` | `#92400e` |

The light green is darker on purpose — `#00ffae` measures 1.3:1 on a pale
surface and cannot carry text.

Font: Inter (headings/body), JetBrains Mono (code/addresses).

## Accessibility — do not skip this

The palette is **WCAG 2.1 AA conformant on every measured token**, verified by
`scripts/check-contrast.mjs`. Details in `ACCESSIBILITY.md`.

**Color is not sufficient on its own.** Under a red-green deficiency — about 1 in
12 men — eight of thirteen meaningful color pairs lose most of their separation
in light mode, and no choice of colors fixes it while the brand green and
treasury amber stay put. Therefore:

- Every badge, pill and chip renders its status as **text**. Color is redundant
  reinforcement, never the carrier.
- A bare colored dot, a color-only chart legend, or a status icon distinguished
  only by fill color is a conformance failure.
- Never remove a focus indicator without replacing it with something at least as
  perceivable.

## Vocabulary — this affects copy you write

- **Core Contributor**, never "member", "holder" or "owner". The CoreNFT is
  **earned** through contribution to Ethereum Classic and is not for sale;
  "member" and "holder" both imply a purchase route that does not exist.
- **CoreNFT**, never "Core DAO" or "Core NFT".
- **earned**, never "minted to", "airdropped" or "granted".

The CoreNFT is soulbound, non-transferable, non-delegable, one vote per Core
Contributor, never weighted by balance. Do not write copy implying a balance,
quantity, transfer, sale or delegation — each describes a token this
deliberately is not.

## CoreNFT artwork

`nft/` holds the CoreNFT design. `nft/spec.json` is the specification the
on-chain Solidity renderer implements; it names brand tokens rather than hexes
so the NFT cannot drift from the product suite. `nft/README.md` carries the
constraints, which are requirements rather than preferences — square 1:1,
self-contained SVG, no external fonts, a 10px minimum type size. Verify with:

```bash
node scripts/check-nft-contrast.mjs      # AA gate for the NFT design
```

## Rules

- Edit `tokens/*.json`; never the generated CSS or `colors.json`.
- State the measured ratio and the surface for every color value you touch.
- Ask before: changing a published token value, modifying either mark's
  geometry, or renaming/moving/removing a tracked asset path.
- Never: commit secrets, touch `LICENSE`, or repurpose the treasury amber —
  `--brand-amber` is reserved for treasury surfaces and financial data, and is
  not a general accent or a warning color.
- Do not describe the current marks as "a torch with ETC diamond" without
  checking. No tracked SVG contains the word "torch," and the file earlier docs
  described that way was removed from this repository.

## Response style

No pleasantries. Direct answers. State explicitly what was checked against the
actual files versus what was assumed.
