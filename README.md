# Olympia Brand

Canonical brand assets for the Olympia ecosystem on Ethereum Classic — design
tokens, logos, favicons and OG images.

**Used by:** [olympiadao.org](https://olympiadao.org) ·
[olympiatreasury.org](https://olympiatreasury.org) ·
[ethereumclassicdao.org](https://ethereumclassicdao.org) ·
[app.olympiadao.org](https://app.olympiadao.org)

## Contents

| Path | What |
|---|---|
| `tokens/*.json` | **Source of truth.** Design tokens in DTCG 2025.10 format |
| `tokens/colors.css` | Generated CSS custom properties, both themes |
| `tokens/colors.json` | Generated resolved literals, for consumers with no CSS cascade |
| `tokens/tailwind.css` | Generated Tailwind CSS 4 `@theme` block |
| `logo/` | Primary marks, wordmarks and horizontal lockups |
| `favicon/olympia/`, `favicon/etc/` | Complete favicon packages for both marks |
| `social/` | Open Graph share cards, SVG source and 1200×630 PNG render |
| `fonts/` | Inter and JetBrains Mono, vendored (OFL-1.1), with a scoped fontconfig |
| `nft/` | CoreNFT token artwork, designed here before deployment |

## Using the tokens

Copy the values, or reference the files directly. There is no package to
install.

```css
/* Tailwind CSS 4 */
@import "tailwindcss";
@import "path/to/tokens/tailwind.css";
```

```css
/* Plain CSS */
@import url("path/to/tokens/colors.css");

.button { background: var(--brand-green); color: var(--bg-primary); }
```

Dark is the default theme. Light is selected with `[data-theme="light"]`, and is
inherited from the OS preference when no theme has been set.

| Role | Dark | Light |
|---|---|---|
| Brand green | `#00ffae` | `#007a53` |
| Page background | `#0a0f10` | `#f8faf9` |
| Surface | `#111111` | `#ffffff` |
| Elevated | `#181818` | `#f1f5f3` |
| Treasury amber | `#f59e0b` | `#92400e` |

The light-mode green is darker on purpose: `#00ffae` measures 1.3:1 on a pale
surface and cannot legibly carry text there.

Type is Inter for headings and body, JetBrains Mono for addresses, hashes and
other on-chain data.

## Accessibility

The palette is **WCAG 2.1 Level AA conformant on every measured token**, against
the worst surface it can be painted on, in both themes. It is measured, not
asserted:

```bash
node scripts/check-contrast.mjs
```

**[ACCESSIBILITY.md](ACCESSIBILITY.md) is required reading before you build with
these tokens.** The short version: color alone cannot carry meaning here. Under a
red-green color vision deficiency — about 1 in 12 men — most of these hues lose
their separation from one another, and no choice of palette fixes it. So every
badge, pill and chip must render its status as text; a bare colored dot or a
color-only chart legend is a conformance failure.

## Changing a token

`tokens/*.json` is source. The CSS and `colors.json` are **generated** — never
hand-edit them.

```bash
node scripts/build-tokens.mjs           # regenerate from the JSON
node scripts/build-tokens.mjs --check    # verify the output is current; writes nothing
node scripts/check-contrast.mjs          # must exit 0
```

Both scripts are dependency-free Node. There is nothing to install and no CI.

To re-render the share cards (needs Inkscape 1.x and ImageMagick):

```bash
./scripts/render-og.sh           # render every card from its SVG source
./scripts/render-og.sh --check   # verify the committed PNGs reproduce
```

Rendering goes through the vendored fonts in `fonts/`, so it does not depend on
what is installed locally.

Note that no consumer imports this repo as a package — the four sites copy these
values into their own stylesheets. A value corrected here reaches a site only
when someone edits that site.

## Guidelines

- **[ACCESSIBILITY.md](ACCESSIBILITY.md)** — what the palette conforms to, how it
  is measured, and where color stops working
- **[LOGO-STYLE.md](LOGO-STYLE.md)** — clear space, minimum sizes, which file to
  use, and what not to do
- **`tokens/component.json`** — which token each part of a badge, pill, chip,
  button, card or focus ring reads, per variant and state
- **[nft/README.md](nft/README.md)** — designing CoreNFT artwork: the on-chain
  constraints, the per-token substitution points, and the pre-deploy checklist

## Ethereum Classic Core Developers

- [Cody Burns](https://github.com/realcodywburns)
- [Chris Mercer](https://github.com/chris-mercer)

## License

[Apache 2.0](LICENSE)
