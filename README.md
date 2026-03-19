# Olympia Brand

> **Production** — Canonical brand assets for the Olympia ecosystem.

Canonical brand assets for the Olympia upgrade — a staged governance and funding system for Ethereum Classic.

**Used by:** [olympiadao.org](https://olympiadao.org) · [olympiatreasury.org](https://olympiatreasury.org)

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
| Green (primary) | `logo/logomark-green.svg` | Dark backgrounds |
| White | `logo/logomark-white.svg` | Dark backgrounds (monochrome) |
| Black | `logo/logomark-black.svg` | Light backgrounds |

### Wordmark

**"OLYMPIA"** in Inter Bold, -0.02em letter-spacing.

### Lockups

Horizontal lockups combine logomark + wordmark. Available in white and black.

---

## File Structure

```
olympia-brand/
├── logo/
│   ├── logomark-green.svg          # Primary mark
│   ├── logomark-white.svg          # Monochrome (dark bg)
│   ├── logomark-black.svg          # Monochrome (light bg)
│   ├── wordmark-green.svg
│   ├── wordmark-white.svg
│   ├── wordmark-black.svg
│   ├── lockup-horizontal-white.svg
│   ├── lockup-horizontal-black.svg
│   └── png/                        # Rasterized at 512, 256, 128, 64px
├── favicon/
│   ├── favicon.svg                 # Source
│   ├── favicon.ico                 # 16+32+48px combined
│   ├── favicon-{16,32,48}x{16,32,48}.png
│   ├── apple-touch-icon.png        # 180px
│   ├── android-chrome-{192,512}x{192,512}.png
│   └── site.webmanifest
├── social/
│   ├── og-olympiadao.svg / .png    # 1200×630 OG image (green)
│   ├── og-olympiatreasury.svg / .png  # Treasury variant (amber)
│   ├── og-olympia-app.svg / .png   # Governance app (green + Demo badge)
│   └── og-olympia-futarchy.svg / .png # Futarchy DAO (violet)
└── tokens/
    ├── colors.css                  # CSS custom properties (dark + light)
    ├── colors.json                 # Machine-readable tokens
    └── tailwind.css                # Tailwind CSS 4 @theme config
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

## Differentiation from ETCswap

Both projects are on Ethereum Classic but have distinct visual identities:

| Aspect | ETCswap | Olympia |
|--------|---------|---------|
| Green | `#33FF99` (bright mint) | `#00ffae` (neon teal) |
| Background | `#030508` (blue-black) | `#0a0f10` (warm dark) |
| Surface | Glass morphism + blur | Translucent cards + soft shadows |
| Font | DM Sans | Inter |
| Motion | R3F 3D + GSAP + Lenis | CSS transitions only |
| Tone | DeFi / trading energy | Governance / institutional |
| Interaction | Scale + glow | Lift (translateY) + border highlight |

---

## Commands

```bash
# Generate PNGs from SVG (requires ImageMagick)
convert -background none logo/logomark-green.svg -resize 512x512 logo/png/logomark-green-512.png

# Generate favicon ICO
convert favicon/favicon-16x16.png favicon/favicon-32x32.png favicon/favicon-48x48.png favicon/favicon.ico

# Render OG images
convert -background none social/og-olympiadao.svg -resize 1200x630 social/og-olympiadao.png
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

**Copyright format:** `© 2025 Ethereum Classic DAO LLC. All rights reserved.`

---

## Copyright

© 2025 Ethereum Classic DAO LLC. All rights reserved.
