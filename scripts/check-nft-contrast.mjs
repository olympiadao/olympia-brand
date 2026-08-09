#!/usr/bin/env node
/**
 * Accessibility assessment for the CoreNFT artwork.
 *
 *   node scripts/check-nft-contrast.mjs            assess; non-zero on any AA failure
 *   node scripts/check-nft-contrast.mjs --verbose  show passing rows too
 *   node scripts/check-nft-contrast.mjs --solve    propose a fix for each failure
 *
 * The NFT is generated on-chain, in Solidity, in a different repository — so
 * unlike the rest of this repo's assets it cannot be measured by reading a CSS
 * file. What is measured instead is nft/spec.json: the design this repository
 * publishes and the contract implements. Colors there name tokens from
 * tokens/colors.json rather than carrying hexes, so a token change is caught
 * here rather than silently diverging on-chain.
 *
 * Every text role is measured on EVERY per-token card background, because the
 * background is chosen by a hash of the tokenId — a role that passes on four of
 * five backgrounds fails for a fifth of holders.
 *
 * Node only, no dependencies.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseColor, hex, composite, ratio } from './lib/color.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const SOLVE = argv.includes('--solve');

const TOKENS = JSON.parse(readFileSync(join(root, 'tokens/colors.json'), 'utf8')).dark;
const SPEC = JSON.parse(readFileSync(join(root, 'nft/spec.json'), 'utf8'));

/** Resolve a spec color reference to an opaque color over `base`. */
function resolve({ token, alpha, over }, base) {
  if (token == null) return null;
  const raw = TOKENS[token];
  if (!raw) throw new Error(`nft/spec.json names "${token}", which is not a token in tokens/colors.json`);
  const c = parseColor(raw);
  if (!c) throw new Error(`token "${token}" has an unparseable value: ${raw}`);
  const painted = alpha === undefined ? c : { ...c, a: alpha };
  return base ? composite(painted, base) : painted;
}

/**
 * WCAG 2.1: large text is >=24px, or >=18.66px when bold. Everything else is
 * small text and needs 4.5:1. Non-text needs 3:1.
 */
const threshold = (size, weight) => {
  const bold = weight === 'bold' || Number(weight) >= 700;
  return size >= 24 || (bold && size >= 18.66) ? 3.0 : 4.5;
};

// ── the surfaces a token can draw ───────────────────────────────────────────

const cards = SPEC.surfaces.card.variants.map((v) => {
  const base = parseColor(TOKENS[v.token]);
  if (!base) throw new Error(`card variant names unknown token "${v.token}"`);
  const c = v.over ? composite(parseColor(TOKENS[v.over]), base) : base;
  return { label: v.over ? `${v.token}+${v.over}` : v.token, color: c };
});

const badgeOn = (card) =>
  composite({ ...parseColor(TOKENS[SPEC.surfaces.badge.token]), a: SPEC.surfaces.badge.alpha }, card);

// ── controls ────────────────────────────────────────────────────────────────
// Published WCAG reference pairs plus one that must FAIL, so a clean run means
// the instrument is discriminating rather than silent.

function controls() {
  const rows = [
    ['black on white', '#000000', '#ffffff', 21.0, true],
    ['#767676 on white', '#767676', '#ffffff', 4.54, true],
    ['#777777 on white', '#777777', '#ffffff', 4.48, false],
  ];
  let bad = 0;
  console.log('── CONTROLS ─────────────────────────────────────────────────────');
  for (const [label, fg, bg, expect, mustPass] of rows) {
    const r = ratio(parseColor(fg), parseColor(bg));
    const ok = Math.abs(r - expect) < 0.02 && r >= 4.5 === mustPass;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${label.padEnd(20)} ${r.toFixed(2).padStart(6)}  expect ~${expect}, must ${mustPass ? 'pass' : 'fail'}`);
  }
  // The spec must actually resolve against the tokens — a spec naming a token
  // that no longer exists would otherwise throw only when a role happened to use it.
  let unresolved = 0;
  for (const v of [...SPEC.surfaces.card.variants, ...SPEC.glow.variants]) {
    if (v.token != null && !TOKENS[v.token]) {
      console.log(`  BAD  spec names unknown token "${v.token}"`);
      unresolved++;
    }
  }
  if (!unresolved) console.log('  ok   every token named in nft/spec.json resolves');
  bad += unresolved;
  console.log(bad === 0 ? '  -> instrument reproduces known values and can report a failure.\n' : `  -> ${bad} CONTROL FAILED.\n`);
  return bad;
}

/** Lowest alpha at which `token` clears `need` on every card. */
function minAlpha(token, need) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const worst = Math.min(
      ...cards.map(({ color }) => ratio(composite({ ...parseColor(TOKENS[token]), a: mid }, color), color)),
    );
    worst >= need ? (hi = mid) : (lo = mid);
  }
  return hi;
}

// ── assess ──────────────────────────────────────────────────────────────────

function run() {
  const bad = controls();
  let fail = 0;

  console.log('── TEXT ROLES — measured on every per-token card background ──────');
  console.log(`  ${'role'.padEnd(16)} ${'size'.padStart(5)}  need   worst   on`);
  for (const [name, r] of Object.entries(SPEC.type.roles)) {
    const need = threshold(r.size, r.weight);
    let worst = null;
    for (const card of cards) {
      const bg = r.on === 'badge' ? badgeOn(card.color) : card.color;
      const fg = resolve({ token: r.color, alpha: r.alpha }, bg);
      const v = ratio(fg, bg);
      if (!worst || v < worst.v) worst = { v, on: card.label };
    }
    const ok = worst.v >= need;
    if (!ok) fail++;
    const tight = ok && worst.v < need + 0.5;
    if (!ok || VERBOSE || tight) {
      console.log(
        `  ${(ok ? (tight ? 'tight' : 'ok') : 'FAIL').padEnd(5)} ${name.padEnd(16)}` +
          ` ${(r.size + 'px').padStart(5)}  ${need.toFixed(1)}  ${worst.v.toFixed(2).padStart(6)}   ${worst.on}`,
      );
      if (SOLVE && !ok) {
        const a = minAlpha(r.color, need);
        console.log(
          a <= 1
            ? `        solve -> alpha ${Math.ceil(a * 100) / 100} (minimum ${a.toFixed(3)}), or use an opaque token`
            : '        solve -> unreachable at this token; choose a lighter one',
        );
      }
    }
    if (r.size < SPEC.type.minSize) {
      console.log(`  FAIL  ${name} is ${r.size}px, below the spec's ${SPEC.type.minSize}px floor`);
      fail++;
    }
  }

  console.log('\n── GLOW — non-text, 3:1 (SC 1.4.11) ─────────────────────────────');
  for (const v of SPEC.glow.variants) {
    if (v.token == null) {
      console.log('  n/a   (no-glow variant)');
      continue;
    }
    let worst = null;
    for (const card of cards) {
      const value = ratio(resolve({ token: v.token }, null), card.color);
      if (!worst || value < worst.v) worst = { v: value, on: card.label };
    }
    const ok = worst.v >= 3.0;
    if (!ok) fail++;
    if (!ok || VERBOSE) {
      console.log(`  ${(ok ? 'ok' : 'FAIL').padEnd(5)} ${v.token.padEnd(20)} ${worst.v.toFixed(2).padStart(6)}   ${worst.on}`);
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────
  // Pure decoration, so WCAG's 3:1 non-text bar does NOT apply — SC 1.4.11
  // exempts decoration, and an NFT has no controls to perceive. The floor
  // enforced here is this brand's own, and it exists for a different reason:
  // an explorer inventory grid renders the 500-unit canvas at roughly 0.30x,
  // where a very low opacity stroke disappears entirely.
  if (SPEC.hud) {
    const H = SPEC.hud;
    console.log('\n── HUD / CIRCUITRY — brand floor, NOT a WCAG bar ────────────────');
    console.log(`  Decoration is exempt from SC 1.4.11. Floor is thumbnail legibility:`);
    console.log(`  min ${H.minOpacity} for anything, ${H.structuralOpacity} for structure.\n`);

    const opacities = (el) =>
      Object.entries(el).filter(([k]) => /opacity/i.test(k)).map(([k, v]) => [k, v]);

    let paths = 0;
    for (const [name, el] of Object.entries(H.elements)) {
      paths += el.count ?? 0;
      for (const [key, alpha] of opacities(el)) {
        let worst = null;
        for (const card of cards) {
          const v = ratio(composite({ ...parseColor(TOKENS[H.color]), a: alpha }, card.color), card.color);
          if (!worst || v < worst.v) worst = { v, on: card.label };
        }
        const below = alpha < H.minOpacity;
        if (below) fail++;
        if (below || VERBOSE) {
          console.log(
            `  ${(below ? 'FAIL' : 'ok').padEnd(5)} ${(name + '.' + key).padEnd(28)}` +
              ` ${alpha.toFixed(2)}  ${worst.v.toFixed(2).padStart(5)}:1  ${worst.on}` +
              (below ? `   <- below the ${H.minOpacity} floor` : ''),
          );
        }
      }
    }
    const over = paths > H.maxPaths;
    if (over) fail++;
    console.log(
      `  ${(over ? 'FAIL' : 'ok').padEnd(5)} path budget                  ${paths} of ${H.maxPaths}` +
        (over ? '   <- over budget; every path costs gas on-chain' : ''),
    );
  }

  console.log('\n── CARD BACKGROUNDS ─────────────────────────────────────────────');
  for (const c of cards) console.log(`  ${c.label.padEnd(28)} ${hex(c.color)}`);

  console.log('');
  if (bad) {
    console.log('RESULT: CONTROLS FAILED — this run measured nothing.');
    process.exit(2);
  }
  console.log(
    fail === 0
      ? 'RESULT: CoreNFT spec is AA-conformant on every per-token background.'
      : `RESULT: ${fail} failure(s). Re-run with --solve for proposed values.`,
  );
  process.exit(fail === 0 ? 0 : 1);
}

run();
