# Olympia Brand

> **Production** — Canonical brand assets for the Olympia ecosystem.

Canonical brand assets for the Olympia upgrade — a staged governance and funding system for Ethereum Classic.

**Used by:** [olympiadao.org](https://olympiadao.org) · [olympiatreasury.org](https://olympiatreasury.org) · [ethereumclassicdao.org](https://ethereumclassicdao.org) · [app.olympiadao.org](https://app.olympiadao.org)

---

## Brand Identity

### Colors

**Dark mode (default):**

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-green` | `#00ffae` | Primary accent, CTAs, highlights |
| `--brand-green-hover` | `#14f1b4` | Hover states |
| `--brand-green-active` | `#00cc8a` | Active/pressed states |
| `--brand-green-muted` | `#007a53` | Disabled, decorative |
| `--brand-green-subtle` | `rgba(0, 255, 174, 0.08)` | Tinted backgrounds |
| `--brand-green-glow` | `rgba(0, 255, 174, 0.4)` | Shadows, text-shadow |
| `--brand-amber` | `#F59E0B` | Treasury/financial data |
| `--bg-primary` | `#0a0f10` | Page background |
| `--bg-surface` | `#0f1614` | Card backgrounds |
| `--text-primary` | `#ffffff` | Headings, primary text |
| `--text-muted` | `#9ca3af` | Body text, descriptions |
| `--border-default` | `#1f292b` | Card borders |

Light mode tokens are defined in `tokens/colors.css`.

### Typography

| Role | Font | Weights |
|------|------|---------|
| Headings | Inter | 700 (bold), 600 (semibold) |
| Body | Inter | 400 (regular), 500 (medium) |
| Code/addresses | JetBrains Mono | 400 (regular) |

**Scale:** 1.2 ratio (Minor Third). Letter-spacing: -0.02em for headings.

### Logo

The Olympia logomark is a torch with an ETC diamond emblem on a dark circular badge. The flame uses layered opacity for depth.

| Variant | File | Usage |
|---------|------|-------|
| Green (primary) | `logo/olympia-logo.svg` | Dark backgrounds |
| White | `logo/png/olympia-logo-white-*.png` | Dark backgrounds (monochrome) |
| Black | `logo/png/olympia-logo-black-*.png` | Light backgrounds |
| ETC diamond | `logo/ETC-logo.svg` | Standalone ETC branding |

### Wordmark

**"OLYMPIA"** in Inter Bold, -0.02em letter-spacing.

| Variant | File |
|---------|------|
| Green | `logo/wordmark-green.svg` |
| White | `logo/wordmark-white.svg` |
| Black | `logo/wordmark-black.svg` |

### Lockups

Horizontal lockups combine logomark + wordmark. Available in white and black.

| Variant | File |
|---------|------|
| White | `logo/lockup-horizontal-white.svg` |
| Black | `logo/lockup-horizontal-black.svg` |

### OG / Social Images

Each product has an OG image (1200×630) with SVG source and PNG render.

| Product | File | Accent |
|---------|------|--------|
| olympiadao.org | `social/og-olympia-dao` | Green |
| olympiatreasury.org | `social/og-olympia-treasury` | Amber |
| ethereumclassicdao.org | `social/og-ethereumclassicdao` | Green |
| app.olympiadao.org | `social/og-olympia-dao-core` | Green |
| Futarchy (Stage 3) | `social/og-olympia-futarchy` | Violet |

---

## File Structure

```
olympia-brand/
├── logo/
│   ├── olympia-logo.svg              # Primary logomark (green)
│   ├── olympia-logo.png              # Primary logomark raster
│   ├── ETC-logo.svg                  # Standalone ETC diamond
│   ├── wordmark-green.svg
│   ├── wordmark-white.svg
│   ├── wordmark-black.svg
│   ├── lockup-horizontal-white.svg
│   ├── lockup-horizontal-black.svg
│   └── png/                          # Rasterized variants
│       ├── olympia-logo-{64,128,256,512}.png
│       ├── olympia-logo-white-{256,512}.png
│       └── olympia-logo-black-{256,512}.png
├── favicon/
│   ├── olympia/                      # Olympia favicon package
│   │   ├── favicon.svg
│   │   ├── favicon.ico
│   │   ├── favicon-{16,32,48}x{16,32,48}.png
│   │   ├── apple-touch-icon.png
│   │   ├── android-chrome-{192,512}x{192,512}.png
│   │   └── site.webmanifest
│   └── etc/                          # ETC favicon package
│       └── (same structure as olympia/)
├── social/
│   ├── og-olympia-dao.svg / .png
│   ├── og-olympia-treasury.svg / .png
│   ├── og-ethereumclassicdao.svg / .png
│   ├── og-olympia-dao-core.svg / .png
│   └── og-olympia-futarchy.svg / .png
└── tokens/
    ├── colors.css                    # CSS custom properties (dark + light)
    ├── colors.json                   # Machine-readable tokens
    └── tailwind.css                  # Tailwind CSS 4 @theme config
```

---

## Design Principles

1. **Dark-first.** The primary aesthetic is dark (`#0a0f10`) with neon green accents.
2. **Translucent cards.** Cards use `rgba(0, 0, 0, 0.35)` backgrounds with `#1f292b` borders and soft shadows. No glass morphism / backdrop-blur.
3. **Lift on hover.** Cards lift `translateY(-6px)` with green border highlight on hover.
4. **Pill-shaped buttons.** Primary CTA: green bg + dark text. Secondary: transparent + green text/border.
5. **Monospace for addresses.** All contract addresses and code use JetBrains Mono.
6. **Institutional tone.** This is governance, not DeFi. Authoritative and transparent, not flashy.
7. **CSS transitions only.** No GSAP, no Lenis, no R3F. `fadeIn` and `translateY` animations via CSS.

---

## Commands

```bash
# Generate PNGs from SVG (requires ImageMagick)
convert -background none logo/olympia-logo.svg -resize 512x512 logo/png/olympia-logo-512.png

# Generate favicon ICO
convert favicon/olympia/favicon-16x16.png favicon/olympia/favicon-32x32.png favicon/olympia/favicon-48x48.png favicon/olympia/favicon.ico

# Render OG images
convert -background none social/og-olympia-dao.svg -resize 1200x630 social/og-olympia-dao.png
```

---

## Legal Entity

| Field | Value |
|-------|-------|
| **Entity** | Ethereum Classic DAO LLC |
| **Type** | LLC — Domestic (Wyoming DAO) |
| **Filing ID** | 2025-001671865 |
| **Status** | Active / Current |
| **Address** | 30 N Gould St Ste R, Sheridan, WY 82801 |

**Copyright format:** `© 2026 Ethereum Classic DAO LLC. All rights reserved.`

---

## Copyright

© 2026 Ethereum Classic DAO LLC. All rights reserved.
