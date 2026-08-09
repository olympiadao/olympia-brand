#!/usr/bin/env node
/**
 * Generate the favicon / touch-icon / PWA icon packages from the vector marks.
 *
 *   node scripts/render-icons.mjs           regenerate both packages
 *   node scripts/render-icons.mjs olympia   just the Olympia torch package
 *   node scripts/render-icons.mjs etc       just the ETC diamond package
 *   node scripts/render-icons.mjs --check   verify the committed PNGs reproduce
 *
 * Needs Inkscape 1.x and ImageMagick, the same tools scripts/render-og.sh uses.
 * No npm dependencies: this repo has no package.json and does not acquire one.
 *
 * WHY A FILLED TILE rather than the bare mark on transparency:
 *
 *   A browser tab strip is painted in the USER's chrome theme, not the site's, so
 *   a transparent icon has to survive both a near-white and a near-black backing.
 *   The torch in --brand-green is legible on the first and close to invisible on
 *   the second. A filled tile carries its own contrast and is the only version
 *   that reads on both.
 *
 * WHY THIS REPLACES WHAT WAS THERE:
 *
 *   The previous package was hand-made and unreproducible, and favicon.svg was
 *   not a vector at all -- a 128x128 PNG base64'd inside an SVG wrapper, showing
 *   the torch BEFORE its handle was corrected. All three consuming sites ship
 *   that same file as their /logo.svg. Its plate was #16301e, a green in no
 *   token, measuring 1.50:1 against the dark page background it sits on.
 *
 * COLOURS COME FROM tokens/colors.json. Nothing here hardcodes a brand hex.
 *
 * SIZES, and the two that are usually wrong:
 *
 *   apple-touch-icon is 180x180 -- Apple has specified that since iOS 8, and 192
 *   is the ANDROID size. iOS rescales, so the mistake renders fine and survives.
 *   Apple also composites its own background and applies its own squircle, so
 *   that one tile is emitted square and opaque.
 *
 *   maskable icons take a much larger inset: Android may crop to any shape inside
 *   the 512 square and only the centre 80% circle is guaranteed, so the mark sits
 *   at 45% rather than 62%. Without one, a launcher can clip the flame.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const only = argv.find((a) => !a.startsWith('--'));

const T = JSON.parse(readFileSync(join(root, 'tokens/colors.json'), 'utf8')).dark;
const PLATE = T['bg-primary']; // #0a0f10 — the brand's page ground
const MARK = T['brand-green']; // #00ffae — 13.46:1 on that plate

const tmp = join(tmpdir(), 'olympia-icons');
mkdirSync(tmp, { recursive: true });

/** Pull the viewBox and the drawing body out of a mark SVG. */
function readMark(file) {
  const src = readFileSync(join(root, file), 'utf8');
  const vb = /viewBox="([^"]+)"/.exec(src)[1].split(/\s+/).map(Number);
  const body = /<g[^>]*transform="[^"]*"[^>]*>[\s\S]*<\/g>/.exec(src)?.[0] ?? /<path[\s\S]*<\/svg>/.exec(src)[0].replace('</svg>', '');
  return { w: vb[2], h: vb[3], body };
}

/**
 * One tile as SVG. `inset` is the mark's height as a fraction of the tile;
 * `radius` is the corner radius as a fraction. Both are tuned per size —
 * a 16px tile needs proportionally more mark and less corner than a 512px one,
 * or the mark turns to mush and the corner eats it.
 */
function tile(mark, size, { inset = 0.62, radius = 0.22, plate = PLATE, fill = null } = {}) {
  const m = size * inset;
  const scale = m / mark.h;
  const w = mark.w * scale;
  const r = size * radius;
  const body = mark.body
    .replace(/fill="currentColor"/g, '')
    .replace(/\scolor="[^"]*"/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r.toFixed(2)}" ry="${r.toFixed(2)}" fill="${plate}"/>
  <g transform="translate(${((size - w) / 2).toFixed(3)},${((size - m) / 2).toFixed(3)}) scale(${scale.toFixed(6)})"${fill ? ` fill="${fill}"` : ''}>
${body}
  </g>
</svg>`;
}

function rasterize(svg, out, size) {
  const f = join(tmp, 'tile.svg');
  writeFileSync(f, svg);
  execFileSync('inkscape', [f, '--export-type=png', `--export-filename=${out}`, `--export-width=${size}`, `--export-height=${size}`], { stdio: 'pipe' });
}

// name, size, options. Order is the order they are reported in.
const PLAN = [
  ['favicon-16x16.png', 16, { radius: 0.16, inset: 0.74 }],
  ['favicon-32x32.png', 32, { radius: 0.18, inset: 0.7 }],
  ['favicon-48x48.png', 48, { radius: 0.2, inset: 0.68 }],
  // Apple applies its own squircle and fills transparency with black: square, opaque.
  ['apple-touch-icon.png', 180, { radius: 0, inset: 0.6 }],
  ['android-chrome-192x192.png', 192, {}],
  ['android-chrome-512x512.png', 512, {}],
  // Only the centre 80% circle is guaranteed on Android; square tile, small mark.
  ['icon-maskable-512.png', 512, { radius: 0, inset: 0.45 }],
];

/** Minimal ICO container around already-encoded PNGs. */
function ico(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dirs = [];
  for (const { size, data } of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0);
    d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(data.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += data.length;
    dirs.push(d);
  }
  return Buffer.concat([head, ...dirs, ...entries.map((e) => e.data)]);
}

// TWO MARKS, AND THEY ARE NOT INTERCHANGEABLE.
//
//   The torch is OLYMPIA's identity — the DAO, the treasury, the app. It takes
//   --brand-green, because it belongs to this palette.
//
//   The diamond is the ETHEREUM CLASSIC NETWORK's identity. It keeps #33FF99,
//   ETC's own green, which is deliberately NOT a token here: it is not ours to
//   restyle, and a network mark repainted in a product's palette stops meaning
//   "this chain" and starts meaning "this product". `fill` below is null for
//   that reason, so the colour comes from the source file rather than from us.
//
// If a surface needs to say "Ethereum Classic", use the diamond. If it needs to
// say "Olympia", use the torch. Neither substitutes for the other.
const PACKAGES = {
  olympia: { mark: 'logo/olympia-torch.svg', dir: 'favicon/olympia', label: 'Olympia torch', fill: MARK },
  etc: { mark: 'logo/ETC-logo.svg', dir: 'favicon/etc', label: 'ETC diamond', fill: null },
};

let wrote = 0;
let differs = 0;

for (const [key, pkg] of Object.entries(PACKAGES)) {
  if (only && only !== key) continue;
  const mark = readMark(pkg.mark);
  const outDir = join(root, pkg.dir);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n  ${pkg.label}  (${pkg.mark} -> ${pkg.dir}/)`);

  for (const [name, size, opts] of PLAN) {
    const out = join(outDir, name);
    const tmpOut = join(tmp, name);
    rasterize(tile(mark, size, { ...opts, fill: pkg.fill }), tmpOut, size);
    const fresh = readFileSync(tmpOut);
    if (CHECK) {
      const same = existsSync(out) && Buffer.compare(fresh, readFileSync(out)) === 0;
      if (!same) differs++;
      console.log(`    ${same ? 'ok      ' : 'DIFFERS '}${name}`);
    } else {
      writeFileSync(out, fresh);
      wrote++;
      console.log(`    wrote  ${name.padEnd(28)} ${size}x${size}  ${String(fresh.length).padStart(6)}B`);
    }
  }

  // favicon.ico — browsers and crawlers request /favicon.ico directly, without
  // consulting any <link>, so this path has to exist regardless of the metadata.
  const icoOut = join(outDir, 'favicon.ico');
  const buf = ico(
    [16, 32, 48].map((s) => {
      const f = join(tmp, `ico-${s}.png`);
      rasterize(tile(mark, s, { radius: 0.16, inset: 0.72, fill: pkg.fill }), f, s);
      return { size: s, data: readFileSync(f) };
    }),
  );
  if (CHECK) {
    const same = existsSync(icoOut) && Buffer.compare(buf, readFileSync(icoOut)) === 0;
    if (!same) differs++;
    console.log(`    ${same ? 'ok      ' : 'DIFFERS '}favicon.ico`);
  } else {
    writeFileSync(icoOut, buf);
    wrote++;
    console.log(`    wrote  ${'favicon.ico'.padEnd(28)} 16+32+48  ${String(buf.length).padStart(6)}B`);
  }

  // favicon.svg — a REAL vector, which the file it replaces was not. Served to
  // browsers that prefer SVG and scales to any size.
  const svgOut = join(outDir, 'favicon.svg');
  const svg = tile(mark, 128, { radius: 0.22, inset: 0.66, fill: pkg.fill }) + '\n';
  if (CHECK) {
    const same = existsSync(svgOut) && readFileSync(svgOut, 'utf8') === svg;
    if (!same) differs++;
    console.log(`    ${same ? 'ok      ' : 'DIFFERS '}favicon.svg`);
  } else {
    writeFileSync(svgOut, svg);
    wrote++;
    console.log(`    wrote  ${'favicon.svg'.padEnd(28)} vector    ${String(svg.length).padStart(6)}B`);
  }
}

// ── flat servable marks ─────────────────────────────────────────────────────
//
// logo/olympia-torch.svg is currentColor-driven, which is right for an INLINE
// <svg> and useless through an <img> or next/image: those load the file into
// their own document, where it has no access to the page's tokens and
// currentColor resolves to black.
//
// All three consuming sites use <Image src="/logo.svg">, so they need a file
// that carries its own colour. Two, because one file cannot serve both themes:
// the dark-theme green is #00ffae, which measures 1.3:1 on a pale surface.
if (!only) {
  const mark = readMark('logo/olympia-torch.svg');
  const L = JSON.parse(readFileSync(join(root, 'tokens/colors.json'), 'utf8'));
  const flats = [
    ['logo/olympia-mark-dark.svg', L.dark['brand-green'], 'for DARK surfaces'],
    ['logo/olympia-mark-light.svg', L.light['brand-green'], 'for LIGHT surfaces'],
  ];
  console.log('\n  flat marks  (no plate, no padding — bounded to their own ink)');
  for (const [file, color, note] of flats) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mark.w} ${mark.h}"
     width="${mark.w}" height="${mark.h}" fill="${color}" role="img"
     aria-label="Olympia torch">
  <title>Olympia torch</title>
  <!-- GENERATED by scripts/render-icons.mjs from logo/olympia-torch.svg. Do not
       hand-edit; change the torch or the token and re-run.

       ${note}: this is ${color}, the ${file.includes('dark') ? 'dark' : 'light'}-theme --brand-green.
       Use this through an <img>/next/image, where currentColor cannot work. When
       you can inline the SVG, use logo/olympia-torch.svg instead and let it
       follow the theme. -->
${mark.body}
</svg>\n`;
    const out = join(root, file);
    if (CHECK) {
      const same = existsSync(out) && readFileSync(out, 'utf8') === svg;
      if (!same) differs++;
      console.log(`    ${same ? 'ok      ' : 'DIFFERS '}${file}`);
    } else {
      writeFileSync(out, svg);
      wrote++;
      console.log(`    wrote  ${file.padEnd(34)} ${color}  ${note}`);
    }
  }
}

console.log('');
if (CHECK) {
  console.log(
    differs === 0
      ? 'RESULT: every committed icon reproduces byte-for-byte.'
      : `RESULT: ${differs} icon(s) differ from what the source produces.`,
  );
  process.exit(differs === 0 ? 0 : 1);
}
console.log(`RESULT: wrote ${wrote} file(s).`);
