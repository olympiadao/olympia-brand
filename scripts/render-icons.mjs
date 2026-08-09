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
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
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
    // NO XML COMMENT IN THIS FILE, and that is not a style choice.
    //
    // `--` is illegal inside <!-- --> per the XML spec, and a CSS custom property
    // name begins with exactly that. An earlier version wrote "--brand-green" into
    // an explanatory comment here, which made both flat marks malformed XML. They
    // served 200 with the right content-type and rendered as a broken image in
    // every browser -- and these two are precisely the files consumers are told to
    // use for <img>/next/image, so the sites that followed the brief got a broken
    // nav logo while the favicons, which parse, looked fine.
    //
    // The provenance belongs in this generator, where it cannot break the artwork.
    // If a note is ever genuinely needed inside the payload, use <desc>, which is
    // real SVG content rather than a comment and has no such restriction.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mark.w} ${mark.h}"
     width="${mark.w}" height="${mark.h}" fill="${color}" role="img"
     aria-label="Olympia torch">
  <title>Olympia torch</title>
  <desc>Generated from logo/olympia-torch.svg. ${note}. Do not hand-edit.</desc>
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

// ── logo/png raster set ─────────────────────────────────────────────────────
//
// SVG is right for a page logo and is what the sites use: browser support for
// SVG in <img> is universal, and next/image serves .svg untouched (it sets
// `unoptimized` itself rather than proxying through the Image Optimization API,
// which would reject SVG without dangerouslyAllowSVG).
//
// A raster set still earns its place. Some consumers genuinely cannot take SVG:
// an og:image, because scrapers do not render SVG; an email client; a README on
// a surface that strips it; a chat unfurl. These are those files.
//
// They were previously the ONLY stale assets in the repo -- untouched since the
// mark was corrected, so every one still showed the stepped handle, and the
// plated variants carried the same off-token #17311f plate the favicons were
// rebuilt to remove. Regenerated in place: same paths, same variants, corrected
// artwork. The paths are a public interface, so nothing is renamed.
if (!only) {
  const mark = readMark('logo/olympia-torch.svg');
  console.log('\n  logo/png raster set  (for consumers that cannot take SVG)');
  const RASTERS = [
    // Plated, matching the icon tiles: brand green on the brand ground.
    ...[64, 128, 256, 512].map((s) => [`logo/png/olympia-logo-${s}.png`, s, { plated: true }]),
    // Bare silhouettes on transparency, for a surface supplying its own ground.
    ...[256, 512].flatMap((s) => [
      [`logo/png/olympia-logo-black-${s}.png`, s, { flat: '#000000' }],
      [`logo/png/olympia-logo-white-${s}.png`, s, { flat: '#ffffff' }],
    ]),
  ];
  for (const [file, size, opt] of RASTERS) {
    const svg = opt.plated
      ? tile(mark, size, { fill: MARK })
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round((size * mark.w) / mark.h)}" height="${size}" viewBox="0 0 ${mark.w} ${mark.h}" fill="${opt.flat}">${mark.body}</svg>`;
    const out = join(root, file);
    const tmpOut = join(tmp, file.split('/').pop());
    const f = join(tmp, 'raster.svg');
    writeFileSync(f, svg);
    execFileSync('inkscape', [f, '--export-type=png', `--export-filename=${tmpOut}`, `--export-height=${size}`], { stdio: 'pipe' });
    const fresh = readFileSync(tmpOut);
    if (CHECK) {
      const same = existsSync(out) && Buffer.compare(fresh, readFileSync(out)) === 0;
      if (!same) differs++;
      console.log(`    ${same ? 'ok      ' : 'DIFFERS '}${file}`);
    } else {
      writeFileSync(out, fresh);
      wrote++;
      console.log(`    wrote  ${file.padEnd(40)} ${String(fresh.length).padStart(7)}B`);
    }
  }
}

// ── XML well-formedness ─────────────────────────────────────────────────────
//
// Every SVG this repo publishes must PARSE. That sounds too obvious to check,
// which is exactly why it went unchecked: two generated marks shipped as
// malformed XML, served 200 with the correct content-type, and rendered as a
// broken image in every browser. Nothing that stats a file, diffs bytes, or looks
// at a rendered PNG can see it — the raster pipeline goes through Inkscape, which
// was reading the SVG BEFORE the bad comment was written into the output.
//
// The tell in a browser is `naturalWidth === 0` with `complete === true`. The tell
// here is one parse per file.
if (CHECK) {
  console.log('\n  XML well-formedness — a published SVG that does not parse is a broken image');
  const svgs = [];
  const collect = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (e.isDirectory()) collect(join(dir, e.name));
      else if (e.name.endsWith('.svg')) svgs.push(join(dir, e.name));
    }
  };
  for (const d of ['logo', 'favicon', 'social']) collect(d);

  let bad = 0;
  for (const rel of svgs.sort()) {
    try {
      execFileSync('xmllint', ['--noout', join(root, rel)], { stdio: 'pipe' });
    } catch (e) {
      bad++;
      differs++;
      const msg = String(e.stderr ?? '').split('\n')[0].replace(join(root, ''), '');
      console.log(`    FAIL    ${rel}\n            ${msg}`);
    }
  }
  console.log(`    ${bad === 0 ? 'ok      ' : 'FAIL    '}${svgs.length} SVG(s) parsed, ${bad} malformed`);

  // Control. A checker that has silently stopped examining anything reports
  // all-clear, which is indistinguishable from success. Feed it a file that MUST
  // fail — the exact defect that shipped, a double hyphen inside a comment.
  const probe = join(tmp, 'malformed-probe.svg');
  writeFileSync(probe, '<svg xmlns="http://www.w3.org/2000/svg"><!-- --brand-green --></svg>\n');
  let probeFailed = false;
  try {
    execFileSync('xmllint', ['--noout', probe], { stdio: 'pipe' });
  } catch {
    probeFailed = true;
  }
  if (!probeFailed) differs++;
  console.log(
    `    ${probeFailed ? 'ok      ' : 'FAIL    '}control: a comment containing "--" is still rejected`,
  );
}

// ── maskable safe zone ──────────────────────────────────────────────────────
//
// Android may crop a maskable icon to any shape inside the square, and only the
// centre 80% circle is guaranteed — so the MARK must sit inside a radius of 40%
// of the width.
//
// MEASURE THE MARK, NOT THE TILE. That distinction is the whole check, and
// getting it wrong is what produced a false "this will clip" report against a
// tile whose mark was comfortably inside the circle: measuring every non-plate
// pixel counts the plate's own antialiased edge and reaches ~62% of the width on
// any full-bleed tile, which says nothing about the mark. Isolating the mark
// first — make the plate transparent, then trim — is what makes the number mean
// something. The bbox corner is an upper bound on the true radius, which errs
// toward reporting a clip that is not there rather than missing one that is.
function markRadius(file) {
  const geo = execFileSync(
    'convert',
    [file, '-background', PLATE, '-flatten', '-fuzz', '2%', '-transparent', PLATE, '-trim', '-format', '%wx%h%O', 'info:'],
    { encoding: 'utf8' },
  ).trim();
  const m = /^(\d+)x(\d+)([+-]\d+)([+-]\d+)/.exec(geo);
  if (!m) return null;
  const [w, h, x, y] = [+m[1], +m[2], +m[3], +m[4]];
  const size = Number(execFileSync('identify', ['-format', '%w', file], { encoding: 'utf8' }));
  const c = (size - 1) / 2;
  const corners = [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]];
  return { r: Math.max(...corners.map(([a, b]) => Math.hypot(a - c, b - c))), safe: size * 0.4, geo };
}

if (CHECK) {
  console.log('\n  maskable safe zone — the MARK must fit the centre 80% circle');
  for (const [key, pkg] of Object.entries(PACKAGES)) {
    if (only && only !== key) continue;
    const f = join(root, pkg.dir, 'icon-maskable-512.png');
    const m = markRadius(f);
    const ok = m && m.r <= m.safe;
    if (!ok) differs++;
    console.log(`    ${ok ? 'ok      ' : 'FAIL    '}${pkg.dir}/icon-maskable-512.png  mark r<=${m.r.toFixed(0)}px, safe ${m.safe.toFixed(0)}px`);
  }
  // Control: the ordinary tile is drawn at a LARGER inset, so its mark must
  // measure larger than the maskable one. If the two ever match, the maskable
  // file is not actually being inset and this check is measuring nothing.
  for (const [key, pkg] of Object.entries(PACKAGES)) {
    if (only && only !== key) continue;
    const any = markRadius(join(root, pkg.dir, 'android-chrome-512x512.png'));
    const msk = markRadius(join(root, pkg.dir, 'icon-maskable-512.png'));
    const discriminates = any && msk && any.r > msk.r;
    if (!discriminates) differs++;
    console.log(
      `    ${discriminates ? 'ok      ' : 'FAIL    '}control: ${pkg.dir} any-tile mark r<=${any.r.toFixed(0)}px > maskable r<=${msk.r.toFixed(0)}px`,
    );
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
