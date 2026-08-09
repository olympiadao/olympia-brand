#!/usr/bin/env bash
# Render the Open Graph share cards in social/ from their SVG sources.
#
#   ./scripts/render-og.sh              render every social/*.svg
#   ./scripts/render-og.sh olympia-dao  render only social/og-olympia-dao.svg
#   ./scripts/render-og.sh --check      render to a temp dir and diff against the
#                                       committed PNGs; writes nothing, non-zero
#                                       exit if any differ
#
# Renders with the vendored fonts in fonts/ via a scoped fontconfig: no system
# font installation is required, and a system-installed lookalike cannot win the
# font match. That fixes the font half of reproducibility.
#
# The other half is the rasterizer, which this script cannot pin: output depends
# on the Inkscape version. The committed PNGs came from Inkscape 1.4.4. A
# different major version will produce byte-different files that look identical,
# so `--check` failing after an Inkscape upgrade is expected and is not a defect
# in the SVG.
#
# Needs Inkscape 1.x and ImageMagick.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOCIAL="$REPO/social"
WIDTH=1200
HEIGHT=630   # the Open Graph card size, and the viewBox every source uses

command -v inkscape >/dev/null || { echo "ERROR: inkscape not found" >&2; exit 1; }
command -v convert  >/dev/null || { echo "ERROR: ImageMagick 'convert' not found" >&2; exit 1; }

export FONTCONFIG_FILE="$REPO/fonts/fonts.conf"

CHECK=0
FILTER=""
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    -*) echo "ERROR: unknown option $arg" >&2; exit 2 ;;
    *)  FILTER="$arg" ;;
  esac
done

if command -v fc-list >/dev/null; then
  echo "Fonts visible to this render (vendored only):"
  fc-list : file | sed 's|.*/||; s|: *$||' | sort -u | sed 's/^/  - /'
  echo
fi
echo "Renderer: $(inkscape --version 2>/dev/null | head -1)"
echo

# ── preflight: does every card's FIRST font actually resolve to a vendored file?
#
# This exists because the failure it catches is silent. fontconfig always
# returns a best match, so a card naming a font we did not vendor renders in
# whatever else is available and looks fine. The share cards committed to this
# repository were rendered that way — their stacks name Inter, `Inter` matched
# nothing, and every one of them shipped in Noto Sans.
#
# Only the first family in each stack is checked. The generic fallbacks after it
# (`system-ui`, `sans-serif`) cannot be reliably mapped in a hermetic config —
# see fonts/fonts.conf — so they are a browser concern, not a render concern.
if command -v fc-match >/dev/null; then
  echo "Preflight — first font in each card's stack must resolve to a vendored file:"
  preflight_fail=0
  for svg in "$SOCIAL"/*.svg; do
    fam="$(grep -o 'font-family="[^"]*"' "$svg" | head -1 |
           sed 's/font-family="//; s/"//; s/,.*//; s/^ *//; s/ *$//')"
    [ -n "$fam" ] || continue
    # Compare the RESOLVED FAMILY against the requested one, not the file path.
    # Checking "did it land inside fonts/" is vacuous: with a hermetic config
    # every miss lands inside fonts/, because nothing else exists. That check was
    # written first and passed a card asking for Helvetica Neue.
    #
    # A prefix match is what "resolved correctly" means here, because the file
    # registers as "Inter Variable" while cards ask for "Inter".
    got="$(fc-match "$fam" family 2>/dev/null)"
    lc() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
    if [ -n "$got" ] && case "$(lc "$got")" in "$(lc "$fam")"*) true ;; *) false ;; esac; then
      echo "  ok    $(basename "$svg" .svg): \"$fam\" -> $got"
    else
      echo "  FAIL  $(basename "$svg" .svg): \"$fam\" -> \"$got\" — WRONG TYPEFACE" >&2
      preflight_fail=$((preflight_fail + 1))
    fi
  done
  if [ "$preflight_fail" -gt 0 ]; then
    echo >&2
    echo "ERROR: $preflight_fail card(s) name a font that is not vendored. Vendor it in" >&2
    echo "       fonts/ and alias it in fonts/fonts.conf, or change the card. Rendering" >&2
    echo "       now would silently substitute a different typeface." >&2
    exit 1
  fi
  echo
fi

OUTDIR="$SOCIAL"
if [ "$CHECK" = 1 ]; then
  OUTDIR="$(mktemp -d)"
  trap 'rm -rf "$OUTDIR"' EXIT
fi

shopt -s nullglob
sources=("$SOCIAL"/*.svg)
[ ${#sources[@]} -gt 0 ] || { echo "ERROR: no SVG sources in social/" >&2; exit 1; }

rendered=0
differs=0
for svg in "${sources[@]}"; do
  base="$(basename "$svg" .svg)"
  [ -z "$FILTER" ] || [[ "$base" == *"$FILTER"* ]] || continue

  # Every card must be exactly 1200x630. Reading it off the source rather than
  # trusting the filename: a card authored at the wrong viewBox would otherwise
  # be silently scaled to fit and ship subtly distorted.
  vb="$(grep -o 'viewBox="[^"]*"' "$svg" | head -1 | sed 's/viewBox="//; s/"//')"
  if [ "$vb" != "0 0 $WIDTH $HEIGHT" ]; then
    echo "  SKIP  $base — viewBox is \"$vb\", expected \"0 0 $WIDTH $HEIGHT\"" >&2
    differs=$((differs + 1))
    continue
  fi

  out="$OUTDIR/$base.png"
  inkscape "$svg" \
    --export-type=png \
    --export-filename="$out" \
    --export-width="$WIDTH" \
    --export-height="$HEIGHT" >/dev/null 2>&1

  # The cards are full-bleed with no transparency, so the alpha channel is dead
  # weight — every pixel is opaque. Dropping it is lossless here and takes ~10%
  # off the file.
  #
  convert "$out" -alpha off -define png:compression-level=9 "$out"

  # NOT quantised, and that is a decision rather than an oversight. Remapping the
  # cards onto a 256-colour palette takes each from ~534 KB to ~112 KB at RMSE
  # 0.005, which is not perceptible on this artwork. It was implemented, measured,
  # and reverted: ImageMagick's palette encoder is not byte-reproducible even with
  # a fixed committed palette, -dither None, -strip and the tIME chunk excluded.
  # Two runs produce PIXEL-identical, BYTE-different files, which reads as "the
  # source changed" and defeats --check.
  #
  # The size win is real but small in consequence — every platform accepts 534 KB
  # comfortably — and it is not worth trading a working reproducibility gate for.
  # Revisit only with an encoder that is deterministic by construction.

  if [ "$CHECK" = 1 ]; then
    committed="$SOCIAL/$base.png"
    if [ ! -f "$committed" ]; then
      echo "  MISSING  $base.png is not committed"
      differs=$((differs + 1))
    elif cmp -s "$out" "$committed"; then
      echo "  ok       $base.png"
    else
      # Byte-identical is the strict bar; report the visual delta too, because an
      # Inkscape version bump changes bytes without changing the picture.
      delta="$(compare -metric AE "$out" "$committed" null: 2>&1 || true)"
      echo "  DIFFERS  $base.png — $delta pixel(s) differ from the committed file"
      differs=$((differs + 1))
    fi
  else
    dims="$(identify -format '%wx%h' "$out")"
    echo "  wrote    social/$base.png  ($dims)"
    [ "$dims" = "${WIDTH}x${HEIGHT}" ] || { echo "  ERROR: wrong dimensions" >&2; exit 1; }
  fi
  rendered=$((rendered + 1))
done

echo
if [ "$rendered" -eq 0 ]; then
  echo "RESULT: nothing matched${FILTER:+ \"$FILTER\"}."
  exit 1
fi
if [ "$CHECK" = 1 ]; then
  if [ "$differs" -eq 0 ]; then
    echo "RESULT: all $rendered card(s) reproduce the committed PNGs byte-for-byte."
  else
    echo "RESULT: $differs of $rendered card(s) differ. If Inkscape was upgraded,"
    echo "        re-render and commit; if not, the SVG source changed."
    exit 1
  fi
else
  echo "RESULT: rendered $rendered card(s)."
fi
