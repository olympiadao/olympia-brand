# Fonts

The typefaces the Olympia identity is built on, vendored so brand assets render
from these exact files rather than from whatever happens to be installed on the
machine doing the render.

| Family | File | Axes | License |
|---|---|---|---|
| **Inter** | `inter/InterVariable.ttf` | `wght` 100–900, `opsz` | [OFL-1.1](inter/OFL.txt) |
| **JetBrains Mono** | `jetbrains-mono/JetBrainsMono[wght].ttf` | `wght` 100–800 | [OFL-1.1](jetbrains-mono/OFL.txt) |

Both are variable fonts — one file covers the full weight range.

**Upright only.** The italic cuts are not vendored because no asset in this repo
uses one, and Inter's italic is another ~910 KB. Add it if an asset needs it.

Inter is used for headings and body; JetBrains Mono for anything technical —
addresses, hashes, block numbers, chain IDs.

## Rendering (no installation needed)

`fonts.conf` is a scoped fontconfig exposing **only** these files. Point
`FONTCONFIG_FILE` at it:

```bash
FONTCONFIG_FILE="$PWD/fonts/fonts.conf" inkscape ...
```

`scripts/render-og.sh` does this for the share cards.

System fonts are deliberately **not** included: a system-installed copy of a
brand font can otherwise win the match over the vendored file, and renders would
differ per machine while looking correct on each one.

## The failure this exists to prevent, and the one it cannot

**Prevented, and it was real.** The share cards committed to this repository
before 2026-08-08 were not rendered in Inter. Their SVGs name
`font-family="Inter, …"`, the system had Inter installed as family
**"Inter Variable"** rather than "Inter", so `Inter` matched nothing — and
fontconfig, which always returns a best match, silently substituted **Noto
Sans**. Every card shipped in the wrong typeface and nothing reported an error.
`fonts.conf` now aliases `Inter` to `Inter Variable`, and `render-og.sh` refuses
to render when a card's first font does not resolve to the family it asked for.

**Not prevented: the rasterizer.** Output still depends on the renderer version.
The committed PNGs came from Inkscape 1.4.4. A different major version produces
byte-different files that look identical, so `render-og.sh --check` failing right
after an Inkscape upgrade is expected and is not a defect in the SVG.

**Also not prevented: generic font families.** In a hermetic config,
`sans-serif`, `system-ui` and `monospace` cannot be reliably remapped — five
fontconfig syntaxes were tried and all failed. So a card must name a real
vendored family **first** in its stack; the generic fallbacks after it are for
browsers, not for this render. `render-og.sh` checks the first entry for exactly
this reason.
