#!/usr/bin/env node
/**
 * Generate the Open Graph card SVGs in social/ from one design system.
 *
 *   node scripts/build-og.mjs                write every card
 *   node scripts/build-og.mjs olympia-dao    write one
 *   node scripts/build-og.mjs --check        verify they are current, write nothing
 *   node scripts/build-og.mjs --force        overwrite even when on-disk copy differs
 *
 * The cards were previously five hand-authored SVGs. They drifted into being a
 * near-copy of another project's card layout, and a colour changed upstream had
 * to be hand-applied to each. Here the layout is one function and each card is a
 * row of data, so a card is a paragraph of copy rather than 66 lines of markup.
 *
 * COLOURS COME FROM tokens/colors.json. Nothing in this file hardcodes a brand
 * hex; a card that forked the palette would never be re-checked against it.
 *
 * After running this, rasterize with scripts/render-og.sh.
 *
 * Node only, no dependencies.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(readFileSync(join(root, 'tokens/colors.json'), 'utf8'));
const D = T.dark; // the cards are dark-theme surfaces

// The torch, inlined as TRUE VECTOR from logo/olympia-torch.svg. That file is
// the isolated mark — no plate, no padding — so it needs no cropping here, and
// inlining its paths keeps each card self-contained, resolution-independent and
// smaller than the base64 raster this replaced.
const torchSrc = readFileSync(join(root, 'logo/olympia-torch.svg'), 'utf8');
const TORCH_VB = /viewBox="([^"]+)"/.exec(torchSrc)[1];
const TORCH_BODY = /<g transform="[^"]*">[\s\S]*?<\/g>/.exec(torchSrc)[0];
const [, , TVW, TVH] = TORCH_VB.split(/\s+/).map(Number);
// Sized by height; the mark is tall and narrow (aspect ~0.39).
const TORCH_H = 258;
const TORCH_W = (TORCH_H * TVW) / TVH;

// ── the cards ───────────────────────────────────────────────────────────────
// `accent` names a token in tokens/colors.json.
//
// Every card in the suite uses the SAME brand green. These are one product
// family and the shared accent is what makes them read that way; per-product
// accents were tried (amber for treasury, violet for futarchy, teal for ecdao)
// and rejected on 2026-08-08 for breaking that unity. The field stays because a
// future card may genuinely need to differ — but differing is the exception and
// needs a reason, not a default.
//
// This does NOT relax the amber reservation in tokens/component.json: amber
// remains reserved for treasury and financial data INSIDE a product. That is a
// data-colour rule; this is suite identity, and they are different questions.

const CARDS = [
  {
    file: 'og-olympia-dao',
    eyebrow: 'OLYMPIA DAO',
    title: 'Olympia DAO',
    subtitle: 'Sovereign Fund for Ethereum Classic',
    chips: ['Treasury', 'Governance', 'Proposals', 'Compliance'],
    note: 'Sustainable support for Core Development, Critical Infrastructure, and Network Security.',
    url: 'olympiadao.org',
    accent: 'brand-green',
  },
  // Repurposed 2026-08-08 from a duplicate "Core DAO" card — that subject is
  // already covered by og-olympia-dao — and renamed from og-olympia-dao-core on
  // the operator's instruction, via `git mv` so history follows. Renaming a
  // published asset path is a breaking change for any site referencing the old
  // URL, and nothing in this repo can detect who that is; it was made
  // deliberately, because the old name named the wrong subject.
  {
    file: 'og-olympia-corenft',
    eyebrow: 'OLYMPIA DAO · CORENFT',
    title: 'CoreNFT',
    subtitle: 'Core Contributor Token for Olympia DAO.',
    chips: ['Soulbound', 'One Vote Per Contributor', 'Non-Delegable', 'Earned'],
    note: 'Earned. One vote per Core Contributor. Never sold, delegated, or weighted by balance.',
    url: 'core.olympiadao.org',
    accent: 'brand-green',
  },
  {
    file: 'og-olympia-treasury',
    eyebrow: 'OLYMPIA TREASURY',
    title: 'Olympia Treasury',
    subtitle: 'Sovereignty Vault for Ethereum Classic',
    chips: ['Balance', 'Transactions', 'Governance', 'Live Data'],
    note: 'Live monitoring of the core development vault. Base fee revenue funds the treasury.',
    url: 'olympiatreasury.org',
    accent: 'brand-green',
  },
  {
    file: 'og-olympia-futarchy',
    eyebrow: 'OLYMPIA DAO · FUTARCHY',
    title: 'Futarchy Markets',
    subtitle: 'Prediction Markets for Ethereum Classic',
    chips: ['Markets', 'Proposals', 'Oracle Resolution', 'Settlement'],
    note: 'Wisdom of the crowd. Vote on values, but bet on beliefs.',
    url: 'futarchy.olympiadao.org',
    accent: 'brand-green',
  },
  // Ethereum Classic DAO is a distinct organisation with its own repository, and
  // it will likely grow its own /brand aligned to its institutional positioning.
  // Its card lives here anyway because it is part of this product suite —
  // ECIP-1114, Wyoming DAO LLC — so an Olympia-aligned asset EXISTS for it to
  // reach for. Assume it will not use this one; the point is that the option is
  // there rather than absent.
  {
    file: 'og-ethereumclassicdao',
    eyebrow: 'ETHEREUM CLASSIC DAO LLC',
    title: 'Ethereum Classic DAO',
    subtitle: 'Building Software & Infrastructure for Global Finance',
    chips: ['Core Clients', 'Infrastructure', 'Security', 'Compliance'],
    note: 'The bridge between decentralized code and traditional legal systems.',
    url: 'ethereumclassicdao.org',
    accent: 'brand-green',
  },
];

// ── drawing helpers ─────────────────────────────────────────────────────────

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Approximate advance width. Inter and JetBrains Mono at the weights used. */
const textWidth = (s, size, mono = false, weight = 400) =>
  s.length * size * (mono ? 0.6 : weight >= 600 ? 0.55 : 0.52);

/** HUD corner bracket. `sx`/`sy` are -1 or 1 for which corner it hugs. */
const bracket = (x, y, sx, sy, len, a) =>
  `<path d="M${x} ${y + sy * len} L${x} ${y} L${x + sx * len} ${y}" fill="none" ` +
  `stroke="${a}" stroke-width="2" stroke-opacity="0.45" stroke-linecap="square"/>`;

/** A small crosshair: the HUD's punctuation. */
const cross = (x, y, r, a, o = 0.3) =>
  `<path d="M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r}" stroke="${a}" ` +
  `stroke-width="1" stroke-opacity="${o}"/>`;

/**
 * A PCB trace: right angles and 45-degree diagonals only, ending in a node.
 * `pts` is a list of [x,y]; the path is emitted verbatim, so author the turns.
 */
const trace = (pts, a, o, w = 1) => {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [ex, ey] = pts[pts.length - 1];
  return (
    `<path d="${d}" fill="none" stroke="${a}" stroke-width="${w}" stroke-opacity="${o}" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${ex}" cy="${ey}" r="2.5" fill="${a}" fill-opacity="${Math.min(1, o * 2.2)}"/>`
  );
};

/** The measurement rule along an edge — instrumentation, not decoration. */
function tickRule(x, y, width, count, a) {
  let out = `<path d="M${x} ${y} H${x + width}" stroke="${a}" stroke-width="1" stroke-opacity="0.16"/>`;
  const step = width / count;
  for (let i = 0; i <= count; i++) {
    const tx = x + i * step;
    const major = i % 5 === 0;
    out +=
      `<path d="M${tx.toFixed(1)} ${y} V${y + (major ? 9 : 4)}" stroke="${a}" ` +
      `stroke-width="1" stroke-opacity="${major ? 0.3 : 0.16}"/>`;
  }
  return out;
}

/**
 * The torch reticle. Concentric rings plus four cardinal arc caps and a
 * crosshair — an instrument framing the mark, rather than a container holding
 * it. The traces below run INTO the torch base: the circuitry feeds the flame,
 * which is the one idea in this card that is Olympia's own.
 */
function reticle(cx, cy, a) {
  const arc = (r, start, sweep, o, w) => {
    const p = (deg) => {
      const t = ((deg - 90) * Math.PI) / 180;
      return [(cx + r * Math.cos(t)).toFixed(1), (cy + r * Math.sin(t)).toFixed(1)];
    };
    const [x1, y1] = p(start);
    const [x2, y2] = p(start + sweep);
    return (
      `<path d="M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}" fill="none" stroke="${a}" ` +
      `stroke-width="${w}" stroke-opacity="${o}" stroke-linecap="round"/>`
    );
  };
  return (
    `<circle cx="${cx}" cy="${cy}" r="188" fill="none" stroke="${a}" stroke-width="1" ` +
    `stroke-opacity="0.10" stroke-dasharray="2 8"/>` +
    `<circle cx="${cx}" cy="${cy}" r="152" fill="none" stroke="${a}" stroke-width="1" stroke-opacity="0.13"/>` +
    // four cardinal caps, the bright part of the instrument
    [0, 90, 180, 270].map((d) => arc(152, d - 16, 32, 0.5, 2)).join('') +
    // outer registration marks
    [45, 135, 225, 315].map((d) => arc(188, d - 4, 8, 0.35, 2)).join('') +
    cross(cx, cy - 210, 6, a, 0.4) +
    cross(cx + 214, cy, 6, a, 0.28)
  );
}

// ── the card ────────────────────────────────────────────────────────────────

function card(c) {
  const A = D[c.accent];
  const g = D['brand-green'];
  const CX = 942; // torch cluster centre
  const CY = 296;
  const L = 88; // left column

  // Chips: mono labels in bordered pills, laid out left to right with wrapping
  // handled by simply measuring — four short words fit one row at this size.
  let cx = L;
  const chips = c.chips
    .map((label) => {
      const w = Math.round(textWidth(label, 15, true) + 34);
      const el =
        `<g transform="translate(${cx} 430)">` +
        `<rect x="0" y="0" width="${w}" height="38" rx="19" fill="none" stroke="${A}" stroke-opacity="0.35"/>` +
        `<circle cx="17" cy="19" r="3" fill="${A}" fill-opacity="0.9"/>` +
        `<text x="28" y="24" font-family="JetBrains Mono, monospace" font-size="14" ` +
        `letter-spacing="0.02em" fill="${D['text-secondary']}">${esc(label)}</text>` +
        `</g>`;
      cx += w + 12;
      return el;
    })
    .join('');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- GENERATED by scripts/build-og.mjs — do not hand-edit. Colours come from
       tokens/colors.json; edit the token JSON or this card's row in the script. -->
  <defs>
    <radialGradient id="glow" cx="${((CX / 1200) * 100).toFixed(1)}%" cy="${((CY / 630) * 100).toFixed(1)}%" r="46%">
      <stop offset="0%" stop-color="${A}" stop-opacity="0.16"/>
      <stop offset="60%" stop-color="${A}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${A}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="30%" cy="18%" r="95%">
      <stop offset="0%" stop-color="${D['bg-surface']}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${D['bg-primary']}" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="rule" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${A}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${A}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="${D['bg-primary']}"/>
  <rect width="1200" height="630" fill="url(#vignette)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Circuitry: traces run from the left edge and the base of the card INTO the
       torch handle. The infrastructure feeds the flame. -->
  <g>
    ${trace([[0, 214], [96, 214], [140, 258], [300, 258]], g, 0.1)}
    ${trace([[0, 470], [180, 470], [232, 522], [430, 522]], g, 0.08)}
    ${trace([[1200, 128], [1064, 128], [1020, 172], [960, 172]], g, 0.1)}
    ${trace([[1200, 560], [1040, 560], [996, 516], [CX, 516]], A, 0.22, 1.5)}
    ${trace([[640, 630], [640, 566], [700, 506], [CX - 4, 506]], A, 0.18, 1.5)}
    ${trace([[1200, 300], [1160, 300], [1136, 324], [1136, 380]], g, 0.07)}
  </g>

  <!-- HUD frame -->
  ${bracket(40, 40, 1, 1, 26, A)}
  ${bracket(1160, 40, -1, 1, 26, A)}
  ${bracket(40, 590, 1, -1, 26, A)}
  ${bracket(1160, 590, -1, -1, 26, A)}
  ${cross(600, 46, 5, g, 0.22)}
  ${cross(88, 300, 5, g, 0.18)}
  ${tickRule(88, 566, 420, 20, g)}

  <!-- Torch in its reticle.
       The source PNG is a 512x512 canvas holding only 123x312 of ink at +194+89
       The mark comes from logo/olympia-torch.svg, which is bounded to its own
       ink. The earlier raster source was a 512x512 canvas holding 123x312 of
       ink — 76% transparent padding — which made the torch render small and
       off-centre inside the reticle. Vector, bounded, no cropping needed. -->
  ${reticle(CX, CY, A)}
  <circle cx="${CX}" cy="${CY}" r="128" fill="${A}" fill-opacity="0.035"/>
  <svg x="${(CX - TORCH_W / 2).toFixed(1)}" y="${(CY - TORCH_H / 2).toFixed(1)}"
       width="${TORCH_W.toFixed(1)}" height="${TORCH_H}" viewBox="${TORCH_VB}"
       fill="${D['text-primary']}">
    ${TORCH_BODY}
  </svg>

  <!-- Eyebrow -->
  <text x="${L}" y="152" font-family="JetBrains Mono, monospace" font-size="15"
        letter-spacing="0.22em" fill="${A}" fill-opacity="0.9">${esc(c.eyebrow)}</text>

  <!-- Title -->
  <text x="${L}" y="240" font-family="Inter, sans-serif" font-size="${
    c.title.length > 18 ? 58 : 68
  }" font-weight="700"
        letter-spacing="-0.025em" fill="${D['text-primary']}">${esc(c.title)}</text>

  <!-- Accent rule -->
  <rect x="${L}" y="270" width="180" height="3" fill="url(#rule)"/>

  <!-- Subtitle -->
  <text x="${L}" y="330" font-family="Inter, sans-serif" font-size="25" font-weight="400"
        fill="${D['text-secondary']}">${esc(c.subtitle)}</text>

  <!-- Note -->
  <text x="${L}" y="380" font-family="Inter, sans-serif" font-size="17" font-weight="400"
        fill="${D['text-muted']}">${esc(c.note)}</text>

  <!-- Chips -->
  ${chips}

  <!-- Footer -->
  <text x="${L}" y="600" font-family="JetBrains Mono, monospace" font-size="14"
        letter-spacing="0.06em" fill="${D['text-subtle']}">ethereum classic</text>
  <text x="1112" y="600" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="16"
        letter-spacing="0.02em" fill="${A}">${esc(c.url)}</text>
</svg>
`;
}

// ── write or check ──────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const FORCE = argv.includes('--force');
const filter = argv.find((a) => !a.startsWith('-'));

const targets = CARDS.filter((c) => !filter || c.file.includes(filter));
if (!targets.length) {
  console.error(`No card matches "${filter}". Known: ${CARDS.map((c) => c.file).join(', ')}`);
  process.exit(1);
}

/** The visible copy of a card, in document order, as a list of text runs. */
const copyOf = (svg) =>
  [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim())
    .filter(Boolean);

let stale = 0;
let blocked = 0;
for (const c of targets) {
  const rel = `social/${c.file}.svg`;
  const want = card(c);
  let got = '';
  try {
    got = readFileSync(join(root, rel), 'utf8');
  } catch {
    got = '';
  }

  if (CHECK) {
    if (got === want) console.log(`  ok     ${rel}`);
    else {
      console.log(`  STALE  ${rel} — regenerate with: node scripts/build-og.mjs`);
      stale++;
    }
    continue;
  }

  // Refuse to discard copy this script did not write.
  //
  // The generator is the source of truth for these files, so a regeneration
  // silently overwrites anything hand-edited in the SVG — which is exactly what
  // happened on 2026-08-08: card copy edited in social/og-olympia-dao.svg was
  // lost on the next build, with no warning and nothing in git to recover it,
  // because the file's last committed state was older still.
  //
  // Comparing the TEXT rather than the whole file matters: layout changes in
  // this script legitimately rewrite the markup on every run, so a byte compare
  // would cry wolf constantly and get ignored. Copy changing underneath us is
  // the signal worth stopping for.
  const onDisk = got ? copyOf(got) : [];
  const inSpec = copyOf(want);
  // Element-wise, not identity: copyOf returns an ARRAY, so `!==` would compare
  // references, be true every time, and block every card on every run.
  const differs =
    got && (onDisk.length !== inSpec.length || onDisk.some((t, i) => t !== inSpec[i]));

  if (differs && !FORCE) {
    console.error(`  BLOCKED  ${rel}`);
    for (let i = 0; i < Math.max(onDisk.length, inSpec.length); i++) {
      if (onDisk[i] !== inSpec[i]) {
        console.error(`             on disk: ${onDisk[i] ?? '(absent)'}`);
        console.error(`             spec:    ${inSpec[i] ?? '(absent)'}`);
      }
    }
    console.error('           Regenerating would discard the on-disk copy. Move the edit');
    console.error("           into this card's CARDS entry above, or re-run with --force.");
    blocked++;
    continue;
  }

  writeFileSync(join(root, rel), want);
  console.log(`  wrote  ${rel}`);
}


if (CHECK) {
  console.log(stale ? '\n  RESULT: card SVGs are out of date.' : '\n  RESULT: card SVGs match the spec.');
  process.exit(stale ? 1 : 0);
}
if (blocked) {
  console.error(`\n  RESULT: ${blocked} card(s) BLOCKED, nothing written for them. See above.`);
  process.exit(1);
}
console.log(`\n  RESULT: wrote ${targets.length - blocked} card(s). Rasterize with ./scripts/render-og.sh`);
