# Olympia Brand

> Everything relevant is restated in this file. A reader here has no access to
> this machine's local tooling or its private configuration, so any rule that
> matters (paths, absent tooling, boundaries) has to appear in-file.

Canonical brand-asset repository for the Olympia ecosystem on Ethereum
Classic: design tokens, logos, favicons, and OG (social-card) images. There is
no application code here. This repo is a source of static assets and token
values consumed by other repositories, not a thing that runs or builds on its
own.

**Repo:** `olympiadao/olympia-brand` (GitHub, public)
**License:** Apache License 2.0. Never change, remove, or recommend changing
`LICENSE`. That decision belongs to the operator, not to an agent working in
this repo. See Licensing below.

## What consumes this repo

Four sites: olympiadao.org, olympiatreasury.org, ethereumclassicdao.org, and
app.olympiadao.org. Their repositories are `olympiadao-org`,
`olympiatreasury-org`, `ethereumclassicdao-org` and `olympia-app`.

No consumer references this repo through a git submodule or a package-manager
dependency. Consumption is by direct file reference — a raw GitHub URL, or a
manual copy of the token values into the consumer's own `globals.css`.

**Two consequences, and both are load-bearing:**

1. **Every currently-tracked path is a public interface.** Renaming or moving
   one is a breaking change for whatever references the old path, and this repo
   has no mechanism to detect who that is. Add a new path; leave the old one.
2. **Nothing propagates automatically.** A token value corrected here reaches a
   consumer only when someone edits that consumer. Changing a value is the start
   of the work, not the end of it.

## Structure

```
tokens/
  primitive.json          SOURCE — raw palette, DTCG 2025.10 format
  semantic.dark.json      SOURCE — role tokens, dark (the default theme)
  semantic.light.json     SOURCE — role tokens, light
  component.json          SOURCE — which token each part of a badge, pill, chip,
                           button, card or focus ring reads, per variant and state
  colors.css              GENERATED — do not hand-edit
  colors.json             GENERATED — do not hand-edit; resolved literals, for a
                           consumer with no CSS cascade (charts, renderers)
  tailwind.css            GENERATED — do not hand-edit; Tailwind 4 @theme block
scripts/
  lib/color.mjs           shared color math: sRGB, WCAG, OKLab/OKLCh, CVD simulation
  build-tokens.mjs        generates the three files above from the JSON
  check-contrast.mjs      the accessibility assessment
  render-og.sh            renders social/*.svg to 1200x630 PNG, reproducibly
  render-icons.mjs        generates both favicon/app-icon packages from the
                           vector marks; --check verifies they reproduce
fonts/                    vendored Inter + JetBrains Mono (OFL-1.1) and a scoped
                           fontconfig, so a render does not depend on what is
                           installed on the machine doing it
logo/                     olympia-torch.svg is the VECTOR MASTER (currentColor).
                           olympia-mark-{light,dark}.svg are GENERATED flat marks
                           for <img> consumers, which cannot inherit currentColor.
                           ETC-logo.svg is the network mark and keeps its own
                           #33FF99. Also olympia-logo.{png,svg} (legacy raster),
                           wordmark-*, lockup-horizontal-*, png/ raster set
favicon/olympia/          Full favicon package for the Olympia mark
favicon/etc/              Full favicon package for the ETC diamond mark
social/                   OG images, SVG source + PNG render, one pair per product.
                           Includes a card for ethereumclassicdao.org: a distinct
                           organisation, but part of this product suite per
                           ECIP-1114 (Wyoming DAO LLC). It will likely grow its
                           own institutional /brand; the Olympia-aligned asset
                           exists here so the option is available, not assumed
nft/
  README.md               CoreNFT design guidance — constraints that are
                           requirements, not preferences
  spec.json               SOURCE — the CoreNFT design the on-chain renderer
                           implements. Names brand tokens, never hexes, so the
                           NFT cannot drift from the product suite. A first
                           draft; later work will revise it
ACCESSIBILITY.md          what the palette conforms to, and where color stops working
.claude/agents/           repo-local agents: palette (tokens), engraver (assets)
```

Two mark families coexist deliberately: an ETC diamond (three-facet vector
shape, `#33FF99`, real SVG path data in `logo/ETC-logo.svg` and
`favicon/etc/favicon.svg`) and an Olympia mark (`logo/olympia-logo.*`,
`favicon/olympia/*`).

## Commands

There is no `package.json`, no lockfile, and nothing to install. The scripts are
dependency-free Node and are run by hand:

```bash
node scripts/build-tokens.mjs           # regenerate colors.css, colors.json, tailwind.css
node scripts/build-tokens.mjs --check    # verify they match the JSON; writes nothing
node scripts/check-contrast.mjs          # the accessibility assessment; exits non-zero on failure
node scripts/check-contrast.mjs --solve  # propose a compliant value for anything failing
node scripts/check-nft-contrast.mjs      # AA gate for the CoreNFT design in nft/spec.json
./scripts/render-og.sh                   # re-render every share card from its SVG
./scripts/render-og.sh --check           # verify the committed PNGs reproduce; writes nothing
node scripts/render-icons.mjs            # regenerate the favicon/app-icon packages
node scripts/render-icons.mjs --check    # verify the committed icons reproduce
```

`render-og.sh` needs Inkscape 1.x and ImageMagick. It renders through the
vendored fonts and refuses to run if a card names a typeface that is not
vendored — a card asking for a missing font does not fail, it silently renders
in whatever else is available, which is how every committed card shipped in Noto
Sans instead of Inter until 2026-08-08.

`--check` and the contrast assessment are the two gates. Both must exit 0 before
token work is reported complete.

There is still **no lint, test, or build command**, and no CI. Do not assume one
exists or invent a call to one. ImageMagick's `convert` and Inkscape are
available in the authoring environment for regenerating a raster by hand.

## Design tokens

**`tokens/*.json` is source. The CSS and `colors.json` are OUTPUT.** Never
hand-edit a generated file; change the JSON and run `build-tokens.mjs`. Three
hand-maintained files describing one palette is how they drift, and they had
already drifted — `colors.json` carried no light-mode brand values at all while
`colors.css` did, so a consumer reading the JSON silently got dark values in
both themes.

Dark is the default theme. Light is selected with `[data-theme="light"]` or
inherited from the OS preference when no theme is set.

| Role | Dark | Light |
|---|---|---|
| Brand green | `#00ffae` | `#007a53` |
| Page background | `#0a0f10` | `#f8faf9` |
| Surface / elevated / deep | `#111111` / `#181818` / `#080b0c` | `#ffffff` / `#f1f5f3` / `#edf2f0` |
| Treasury amber | `#f59e0b` | `#92400e` |

The light-mode green is a real design decision, not an implementation detail:
`#00ffae` measures 1.3:1 on a pale surface and cannot carry text there.

Font: Inter (headings and body), JetBrains Mono (code, hashes and addresses).

## Accessibility

**The palette is WCAG 2.1 AA conformant on every measured token, against the
worst surface in each theme, verified by `scripts/check-contrast.mjs`.** The
full assessment, the method, and the AAA gap are in `ACCESSIBILITY.md`.

The part an agent must not skip: **color is not sufficient on its own.** Eight of
thirteen meaningful color pairs lose most of their separation under a red-green
deficiency in light mode, and that is not fixable by choosing different colors
while the brand green and treasury amber stay where they are. So every badge,
pill and chip renders its status as **text**; a bare colored dot or a color-only
chart legend is a conformance failure. `tokens/component.json` states this as
`badge.requires-label`.

## Branching

Inferred from history, not confirmed with the operator; treat as a proposal to
confirm. All commits to date are by one author, while `README.md` credits two
named Ethereum Classic Core Developers. Four live sites reference this repo's
`main` directly, which is a shared-remote others-pull condition. Recommendation:
topic branches for anything that renames, moves, or removes a tracked asset path
or changes a published token value; direct-to-`main` is reasonable for an
in-place replacement of an existing file.

## Boundaries

### Always
- **Edit the token JSON, never the generated CSS or `colors.json`.**
- **Run both gates** — `build-tokens.mjs --check` and `check-contrast.mjs` —
  before reporting token work complete.
- **State the measured ratio and the surface** for every color value you touch.
  A palette table with no ratios beside it is what produced the divergence this
  tooling exists to prevent.
- Treat every currently-tracked asset path as a public interface.

### Ask first
- Any change to a published token value. Four sites consume these and none of
  them re-checks them.
- Modifying either mark's geometry — the ETC diamond's path data, or whatever
  produced the Olympia raster.
- Renaming, moving, or removing a currently-tracked asset path.
- Adding a `NOTICE` file or per-file license headers (see Licensing).

### Never
- Commit secrets.
- Change, remove, or recommend changing `LICENSE`.
- **Repurpose the treasury amber.** `--brand-amber` is reserved for
  olympiatreasury.org and financial data. It is not a general accent and not a
  warning color; `--color-warning` is its own token.
- **Remove a focus indicator** without replacing it with something at least as
  perceivable.
- **Call a CoreNFT holder a "member".** The canonical term is **Core
  Contributor**. The token is earned through contribution to Ethereum Classic
  and is not for sale, so "member" and "holder" both imply a purchase route that
  does not exist. It is soulbound, non-transferable, non-delegable, one vote per
  Core Contributor, never weighted by balance — do not write copy implying a
  balance, quantity, transfer, sale or delegation. `SKILL.md` carries the full
  vocabulary table.
## The Olympia mark is a torch — settled by rendering it

Earlier versions of this file recorded the "torch" terminology as unresolved,
because no tracked SVG contains the string "torch" and the file earlier docs
described that way (`logo/logomark-green.svg`) was deleted in commit `5c31540`.
That was a search over filenames and markup, and it could not answer a question
about a raster.

**Rendered and looked at, 2026-08-08:** `logo/olympia-logo.png` is a white torch
with a flame, on a dark green squircle, with a small ETC diamond set into the
torch handle. The commit message at `c13406e` calling the favicon set a "torch"
set is accurate, not informal legacy wording. A second, independent source
agrees: the superseded `.github/AGENTS.md` carried the boundary *"Never: ...
modify torch geometry"*.

So "torch" is the correct term for the current mark. The lesson worth keeping is
the method, not the conclusion: **grep cannot describe artwork.** Render the
asset and look at it before recording a fact about what a mark depicts.

**The torch geometry HAS been modified, once, on operator instruction.** The
raster's handle was not tapered but stepped, and its edges carried the pixel
stairstepping of an upscaled small original. `logo/olympia-torch.svg` is the
corrected vector, and its own file comment carries the full provenance — what
was changed, why, and what would reintroduce the faults. Read that before
regenerating anything from the raster.

## Source-of-truth note: it differs per mark

Do not generalize "the SVG is source and the PNG is derived" across this repo —
measured, it does not hold.

For the **ETC mark**, `logo/ETC-logo.svg` and `favicon/etc/favicon.svg` carry
genuine vector path data, and the PNGs are plausibly rasterized from it.

For the **Olympia mark**, `logo/olympia-logo.svg` is not vector source: it is a
128×128 raster embedded as base64 inside an SVG wrapper (it decodes to an
11,893-byte PNG). `logo/olympia-logo.png` is a separate 400×400 file and is the
more plausible source. The two are not byte-identical, and nothing in this repo
records what produced either.

## Licensing

Apache License 2.0, confirmed via `LICENSE`. This repo has no `NOTICE` file and
no per-file copyright or SPDX header. Neither is legally required by Apache-2.0
for the original work: Section 4(d)'s NOTICE-passthrough obligation is
conditional on the work already including one, and the Appendix's per-file
boilerplate is a recommendation for applying the license, not an operative term.
`README.md` already names two contributors under a License heading. Recorded
here so a later pass does not treat this as a defect and "fix" it unasked.

## Response style

No pleasantries. Direct answers. State what was verified against the actual
files versus what was assumed. **Re-read this file against the tree before
trusting it**: it has gone stale before, documenting an image-conversion command
against an SVG that had been deleted four months earlier, and nothing here
re-checks itself.
