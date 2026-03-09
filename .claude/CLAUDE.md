# Olympia Brand Repository

## Project Context

Canonical brand asset repository for the Olympia upgrade — a staged governance and funding system for Ethereum Classic. Contains logos, favicons, social cards, design tokens, and brand guidelines.

**Repo:** `olympiadao/olympia-brand` (GitHub)
**Type:** Brand assets (no build system, no dependencies)

## Structure

- `logo/` — Logomark (green/white/black), wordmark, lockup SVGs + PNGs
- `favicon/` — Complete favicon package (SVG, ICO, PNGs, manifest)
- `social/` — OG images for olympiadao.org and olympiatreasury.org (SVG sources + PNGs)
- `tokens/` — Design tokens (CSS, JSON, Tailwind CSS 4)
- `README.md` — Brand guidelines

## Brand Identity

- **Primary color:** `#00ffae` (neon teal-green)
- **Secondary color:** `#F59E0B` (amber, for treasury/financial)
- **Dark background:** `#0a0f10`
- **Font:** Inter (headings + body), JetBrains Mono (code/addresses)
- **Design philosophy:** Dark-first, translucent cards, institutional tone

## Key Rules

1. The logomark is a torch with ETC diamond — do not modify the geometry
2. All products share the same palette, fonts, and design language
3. olympiadao.org uses green accent, olympiatreasury.org uses amber accent for financial data
4. PNGs are generated from SVGs using ImageMagick (`convert`)
5. OG images follow the same dark + green grid template

## Commands

```bash
convert -background none logo/logomark-green.svg -resize 512x512 logo/png/logomark-green-512.png
convert favicon/favicon-16x16.png favicon/favicon-32x32.png favicon/favicon-48x48.png favicon/favicon.ico
```

## Boundaries

### Always Do
- Use SVG as the source of truth for all logos
- Maintain the exact `#00ffae` brand green
- Keep the logomark geometry unchanged

### Ask First
- Changing the color palette
- Modifying the logo geometry
- Adding new product brand packages

### Never Do
- Commit secrets
- Modify the torch paths
- Use colors outside the defined palette
