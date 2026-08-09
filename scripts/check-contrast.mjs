#!/usr/bin/env node
/**
 * Olympia brand — accessibility assessment for the color tokens.
 *
 *   node scripts/check-contrast.mjs            assess; exit non-zero on any AA failure
 *   node scripts/check-contrast.mjs --verbose  show passing rows too
 *   node scripts/check-contrast.mjs --solve    propose a compliant value for each
 *                                              failure, by binary search in OKLCh
 *                                              holding hue and chroma
 *   node scripts/check-contrast.mjs --aaa      treat AAA as the gate, not just a report
 *
 * Four assessments, because contrast alone does not make a palette usable by a
 * vision-impaired reader:
 *
 *   1. Text contrast          WCAG 2.1 SC 1.4.3 (AA 4.5:1) and 1.4.6 (AAA 7:1)
 *   2. Non-text contrast      WCAG 2.1 SC 1.4.11 (3:1) — borders, focus rings,
 *                             icons, chart strokes, and any boundary a reader
 *                             needs to perceive a control by
 *   3. Theme pairing          a token declared in one theme block only silently
 *                             inherits the other theme's value
 *   4. Color-vision deficiency  whether two colors that carry DIFFERENT meanings
 *                             stay distinguishable under protanopia, deuteranopia
 *                             and tritanopia
 *
 * THE VALUES ARE PARSED FROM tokens/colors.css ON DISK. This script carries no
 * palette table of its own, deliberately: a checker holding a copy of the
 * palette measures the copy, passes, and tells you nothing about the repo. The
 * only colors written into this file are the controls, whose whole job is to be
 * fixed and known.
 *
 * Node only, no dependencies. A committed command you run by hand.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const SOLVE = argv.includes('--solve');
const AAA_GATE = argv.includes('--aaa');

import {
  parseColor,
  hex,
  composite,
  ratio,
  separation,
  solve,
  CVD,
  simulate,
  CHROMA_FLOOR,
  LIGHT_RESCUE,
  atRisk,
} from './lib/color.mjs';

// ── parse tokens/colors.css ─────────────────────────────────────────────────

/**
 * Return { dark, light } maps of custom-property name -> raw value string.
 *
 * Comments are stripped FIRST. Without that, a leading file comment is swallowed
 * into the first selector, and this file's own header mentions "light" — which
 * classified the `:root` dark block as the light theme and reported almost every
 * token as declared in one theme only. Silent, and it looked like a real finding.
 *
 * The at-rule wrapper is dropped rather than parsed: the OS-preference block
 * must stay identical to the explicit [data-theme="light"] block, so folding it
 * onto the same map is correct, and a divergence between them would show up as
 * a value mismatch rather than being hidden.
 */
function parseTokens(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const dark = new Map();
  const light = new Map();
  // Innermost blocks only: a selector followed by declarations and no nested `{`.
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // Take only the final segment: m[1] cannot contain a brace, so anything
    // before the first block — @import, @plugin, a stray statement — is
    // captured into the selector and would make it read as an at-rule.
    const sel = m[1].split(/[;\n]/).pop().trim();
    if (/^@/.test(sel)) continue;
    const isLight = /\[data-theme=["']?light/.test(sel) || /:root:not\(\[data-theme\]\)/.test(sel);
    const isDark = !isLight && /(^|,)\s*:root\b/.test(sel);
    const target = isLight ? light : isDark ? dark : null;
    if (!target) continue;
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) target.set(d[1], d[2].trim());
  }
  return { dark, light };
}

/** Resolve a token to an opaque color, following var() and compositing over `over`. */
function resolve(name, scope, fallbackScope, over) {
  const seen = new Set();
  let raw = scope.get(name) ?? fallbackScope.get(name);
  while (raw && /^var\(/.test(raw)) {
    const ref = /var\(\s*(--[\w-]+)/.exec(raw)?.[1];
    if (!ref || seen.has(ref)) return null;
    seen.add(ref);
    raw = scope.get(ref) ?? fallbackScope.get(ref);
  }
  const c = raw && parseColor(raw);
  if (!c) return null;
  return over ? composite(c, over) : c;
}

// ── what gets measured against what ─────────────────────────────────────────
//
// A translucent surface is composited over the opaque surface beneath it,
// because that composite is what the eye sees and what the ratio has to be
// computed against — never the base, and never white.
//
// Nothing is measured at the large-text threshold. That exemption applies to
// text the design guarantees is >=24px (or >=18.66px bold), and this repo
// cannot guarantee a type size for a consumer it does not control.

const SURFACES = [
  ['--bg-primary', null],
  ['--bg-surface', null],
  ['--bg-elevated', null],
  ['--bg-deep', null],
  ['--bg-card', '--bg-elevated'],
  ['--bg-card', '--bg-surface'],
  ['--bg-card', '--bg-deep'],
];

/** Text tokens — SC 1.4.3 (AA 4.5) / 1.4.6 (AAA 7). */
const TEXT = [
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-subtle',
  '--brand-green',
  '--brand-green-hover',
  '--brand-green-active',
  '--brand-green-muted',
  '--brand-amber',
  '--brand-amber-hover',
  '--color-success',
  '--color-error',
  '--color-warning',
  '--color-info',
  '--accent-violet',
  '--accent-sky',
  '--accent-teal',
  '--accent-rose',
  '--accent-amber',
  '--accent-orange',
];

/** Non-text tokens — SC 1.4.11 (3:1). A boundary a reader perceives a control by. */
const NONTEXT = ['--border-strong', '--border-brand', '--focus-ring'];

/**
 * A badge is measured on its OWN tinted background, not on the page surface —
 * the tint is the accent at BADGE_TINT_ALPHA over the surface, so the accent is
 * being read against a pale wash of itself. That is a harder background than
 * the page, which is why these are solved separately.
 *
 * Keep this in step with tokens/component.json's badge.tint-alpha.
 */
const BADGES = [
  '--accent-violet',
  '--accent-sky',
  '--accent-teal',
  '--accent-rose',
  '--accent-amber',
  '--accent-orange',
];
const BADGE_TINT_ALPHA = 0.1;

/**
 * Pairs that carry DIFFERENT meanings and must stay tellable apart. A
 * green-primary brand whose success state is also green is the classic
 * red/green confusion case, so these are the pairs where SC 1.4.1's
 * "never color alone" requirement actually bites.
 */
const MEANING_PAIRS = [
  ['--color-success', '--color-error'],
  ['--color-success', '--color-warning'],
  ['--color-error', '--color-warning'],
  ['--color-info', '--color-success'],
  ['--brand-green', '--color-error'],
  ['--accent-violet', '--accent-teal'],
  ['--accent-violet', '--accent-rose'],
  ['--accent-violet', '--accent-sky'],
  ['--accent-teal', '--accent-rose'],
  ['--accent-teal', '--accent-orange'],
  ['--accent-rose', '--accent-orange'],
  ['--accent-orange', '--accent-sky'],
  ['--accent-amber', '--accent-orange'],
];

/** Not measured, with the reason, so absence is a decision not an oversight. */
const EXEMPT = new Map([
  ['--text-disabled', 'SC 1.4.3 exempts text in an inactive UI component'],
  ['--border-default', 'hairline separator, not a boundary a control is perceived by'],
  ['--border-subtle', 'as above, and deliberately near-invisible'],
  ['--brand-green-subtle', 'a background tint; measured as a surface, not a foreground'],
  ['--brand-green-glow', 'a glow/shadow, conveys no information'],
  ['--brand-amber-subtle', 'a background tint'],
  ['--bg-overlay', 'a scrim; what matters is the text drawn on it'],
]);

const AA = { text: 4.5, nontext: 3.0 };
const AAA = { text: 7.0, nontext: 3.0 }; // 1.4.11 has no AAA level; 3.0 stands

// ── controls ────────────────────────────────────────────────────────────────
// The first four are published WCAG reference pairs, so they validate the
// FORMULA against values this file did not derive. #767676 and #777777 sit
// either side of the 4.5 line and are the canonical boundary example.
//
// The fifth validates the COMPOSITING path, which no published pair covers, so
// its expected value is hand-derived: rgba(0,0,0,0.35) over #162420 = (22,36,32)
// x 0.65 = (14.3, 23.4, 20.8); relative luminance 0.00778; against white,
// 1.05 / 0.05778 = 18.17. It checks that the code composites at all, not the
// formula — the four above are that.
//
// The last three calibrate the CVD assessment, and every expected value below
// was MEASURED with this simulator rather than asserted from the textbook —
// the textbook claim "red and green become indistinguishable" is, on the two
// axes, only half true, and stating it whole is what an earlier version of this
// control got wrong.
//
//   red vs green   chroma collapses 0.462 -> 0.030, but lightness survives at
//                  0.221. So the hue signal is gone AND the pair is still
//                  separable. It must NOT be flagged: that is the negative
//                  control against over-flagging.
//   #a52828 vs     found by search: normal separation 0.252, and under
//   #287328        deuteranopia chroma 0.010 / lightness 0.003. Both axes gone.
//                  It MUST be flagged — the positive control.
//   black vs white achromatic, so chroma separation is ~0 in every simulation,
//                  and only lightness (1.000) saves it. Guards the rescue axis.
const CONTROLS = [
  { kind: 'ratio', label: 'black on white', fg: '#000000', bg: '#ffffff', expect: 21.0, must: 'pass' },
  { kind: 'ratio', label: '#767676 on white', fg: '#767676', bg: '#ffffff', expect: 4.54, must: 'pass' },
  { kind: 'ratio', label: '#777777 on white', fg: '#777777', bg: '#ffffff', expect: 4.48, must: 'fail' },
  { kind: 'ratio', label: 'white on white', fg: '#ffffff', bg: '#ffffff', expect: 1.0, must: 'fail' },
  {
    kind: 'ratio',
    label: 'rgba(0,0,0,.35) composite',
    fg: '#ffffff',
    bg: composite(parseColor('rgba(0,0,0,0.35)'), parseColor('#162420')),
    expect: 18.17,
    must: 'pass',
  },
  {
    kind: 'cvd',
    label: 'red/green hue collapse',
    a: '#ff0000',
    b: '#00ff00',
    chroma: 0.03,
    light: 0.221,
    must: 'not-flagged',
  },
  {
    kind: 'cvd',
    label: 'both axes collapse',
    a: '#a52828',
    b: '#287328',
    chroma: 0.01,
    light: 0.003,
    must: 'flagged',
  },
  {
    kind: 'cvd',
    label: 'achromatic, saved by lightness',
    a: '#000000',
    b: '#ffffff',
    chroma: 0.0,
    light: 1.0,
    must: 'not-flagged',
  },
];

function runControls() {
  let bad = 0;
  console.log('── CONTROLS ─────────────────────────────────────────────────────────');
  for (const c of CONTROLS) {
    let line;
    let ok;
    if (c.kind === 'ratio') {
      const fg = parseColor(c.fg);
      const bg = typeof c.bg === 'string' ? parseColor(c.bg) : c.bg;
      const r = ratio(fg, bg);
      ok = (c.must === 'pass') === r >= 4.5 && Math.abs(r - c.expect) < 0.02;
      line = `${r.toFixed(2).padStart(6)}      expected ~${c.expect}, must ${c.must}`;
    } else {
      const s = separation(
        simulate(parseColor(c.a), 'deuteranopia'),
        simulate(parseColor(c.b), 'deuteranopia'),
      );
      const flagged = atRisk(s);
      ok =
        (c.must === 'flagged') === flagged &&
        Math.abs(s.chroma - c.chroma) < 0.005 &&
        Math.abs(s.light - c.light) < 0.005;
      line =
        `chroma ${s.chroma.toFixed(3)} light ${s.light.toFixed(3)}   ` +
        `expected ~${c.chroma}/${c.light}, must be ${c.must}`;
    }
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${c.label.padEnd(30)} ${line}`);
  }
  console.log(
    bad === 0
      ? '  -> the instrument reproduces known values AND can report a failure.\n'
      : `  -> ${bad} CONTROL FAILED. Every number below is untrustworthy.\n`,
  );
  return bad;
}

// ── assessment ──────────────────────────────────────────────────────────────

function surfaceList(scope, fallback) {
  return SURFACES.map(([name, overName]) => {
    const over = overName ? resolve(overName, scope, fallback, null) : null;
    const c = resolve(name, scope, fallback, over);
    if (!c) return null;
    return { label: overName ? `${name} on ${overName}` : name, color: c };
  }).filter(Boolean);
}

function rowsFor(scope, fallback) {
  const surfaces = surfaceList(scope, fallback);
  const rows = [];

  const push = (token, kind, color, worst) => {
    rows.push({
      token,
      kind,
      // The declared value, plus what it actually composites to when it carries
      // alpha. Printing only the base is how a border reading 1.50:1 displayed as
      // #ffffff and looked like a pass.
      value: hex(color),
      composited: color.a < 1 && worst ? hex(composite(color, worst.bg)) : null,
      inherited: !scope.has(token),
      need: AA[kind],
      needAAA: AAA[kind],
      ...worst,
    });
  };

  for (const kindList of [
    [TEXT, 'text'],
    [NONTEXT, 'nontext'],
  ]) {
    const [list, kind] = kindList;
    for (const token of list) {
      const c = resolve(token, scope, fallback, null);
      if (!c) continue;
      let worst = null;
      for (const s of surfaces) {
        // COMPOSITE FIRST. A token carrying alpha is not the colour a reader
        // sees — rgba(0,255,174,0.3) over a dark surface renders as roughly
        // #0c5840, and measuring the opaque base instead reports 13.46:1 for
        // something that is actually 2.21:1. That defect shipped: it reported
        // AAA for two border tokens that fail 3:1 in both themes, and it was
        // caught by a consuming site rather than here. The badge path below
        // always composited; this path did not, and nothing tied them together.
        const fg = composite(c, s.color);
        const r = ratio(fg, s.color);
        if (!worst || r < worst.r) worst = { r, on: s.label, bg: s.color };
      }
      push(token, kind, c, worst);
    }
  }

  for (const token of BADGES) {
    const c = resolve(token, scope, fallback, null);
    if (!c) continue;
    let worst = null;
    for (const s of surfaces) {
      const tint = composite({ ...c, a: BADGE_TINT_ALPHA }, s.color);
      const r = ratio(c, tint);
      if (!worst || r < worst.r) {
        worst = { r, on: `own ${BADGE_TINT_ALPHA * 100}% tint over ${s.label}`, bg: tint };
      }
    }
    push(token, 'text', c, worst);
  }
  return rows;
}

function assessCvd(scope, fallback) {
  const out = [];
  for (const [ta, tb] of MEANING_PAIRS) {
    const a = resolve(ta, scope, fallback, null);
    const b = resolve(tb, scope, fallback, null);
    if (!a || !b) continue;
    const normal = separation(a, b);
    // Worst case = the vision type that leaves the least chromatic separation.
    let worst = { kind: 'normal', ...normal };
    for (const kind of Object.keys(CVD)) {
      const s = separation(simulate(a, kind), simulate(b, kind));
      if (s.chroma < worst.chroma) worst = { kind, ...s };
    }
    out.push({
      pair: `${ta} vs ${tb}`,
      ...worst,
      normalChroma: normal.chroma,
      lost: normal.chroma > 0 ? 1 - worst.chroma / normal.chroma : 0,
      risk: atRisk(worst),
    });
  }
  return out.sort((x, y) => x.chroma - y.chroma);
}

function report() {
  const css = readFileSync(join(root, 'tokens/colors.css'), 'utf8');
  const { dark, light } = parseTokens(css);
  const badControls = runControls();

  const themed = new Set([...TEXT, ...NONTEXT, ...BADGES]);
  const unpaired = [...themed].filter(
    (t) => dark.has(t) !== light.has(t) && (dark.has(t) || light.has(t)),
  );

  let aaFail = 0;
  let aaaFail = 0;

  for (const [theme, scope] of [
    ['dark', dark],
    ['light', light],
  ]) {
    console.log(`── ${theme.toUpperCase()} — text 1.4.3/1.4.6, non-text 1.4.11 ${'─'.repeat(20 - theme.length)}`);
    const rows = rowsFor(scope, dark);
    const w = Math.max(...rows.map((r) => r.token.length));
    for (const r of rows) {
      const passAA = r.r >= r.need;
      const passAAA = r.r >= r.needAAA;
      if (!passAA) aaFail++;
      if (!passAAA) aaaFail++;
      const tight = passAA && r.r < r.need + 0.3;
      if (!passAA || VERBOSE || tight || r.inherited || (AAA_GATE && !passAAA)) {
        // SC 1.4.11 has no AAA level, and AAA.nontext is set equal to AA.nontext
        // so the gate behaves. Labelling a non-text token "AAA" therefore claims a
        // grade that does not exist — a 3.09:1 border is AA and nothing more.
        const level = !passAA ? 'FAIL ' : r.kind !== 'text' ? 'AA   ' : passAAA ? 'AAA  ' : 'AA   ';
        console.log(
          `  ${level} ${r.token.padEnd(w)}  ${r.composited ? `${r.value}@a->${r.composited}` : r.value}  ${r.r.toFixed(2).padStart(6)} : 1  ` +
            `(AA ${r.need}${r.kind === 'text' ? `, AAA ${r.needAAA}` : ''})  on ${r.on}` +
            (r.inherited ? '  <- INHERITED, not declared in this theme' : '') +
            (passAA && tight ? '  <- under 0.3 of headroom' : ''),
        );
        if (SOLVE && !passAA) {
          const target = AAA_GATE ? r.needAAA : r.need;
          const fixed = solve(parseColor(r.value), r.bg, target);
          console.log(
            fixed
              ? `        solve -> ${hex(fixed)}  ${ratio(fixed, r.bg).toFixed(2)} : 1  (hue and chroma held)`
              : '        solve -> unreachable at this hue; reduce chroma or change the surface',
          );
        }
      }
    }
    console.log('');
  }

  if (unpaired.length) {
    console.log('── THEME PAIRING — declared in one theme only ───────────────────────');
    console.log('  A token missing from a theme block inherits the other theme\'s value.');
    for (const t of unpaired) {
      console.log(`  FAIL  ${t.padEnd(24)} declared in ${dark.has(t) ? 'dark' : 'light'} only`);
    }
    console.log('');
    aaFail += unpaired.length;
  }

  console.log('── COLOR VISION DEFICIENCY — advisory, SC 1.4.1 ─────────────────────');
  console.log('  For each pair of tokens carrying DIFFERENT meanings: how much');
  console.log('  chromatic separation survives the worst of three dichromacies,');
  console.log('  and whether lightness still separates it when hue does not.');
  console.log('  AT-RISK = neither axis works. High hue loss with lightness intact');
  console.log('  is not a failure, but it IS where SC 1.4.1 bites: the color has');
  console.log('  stopped carrying the meaning, so a label, icon or shape must.');
  console.log('  Weight findings by prevalence, which differs by two orders of');
  console.log('  magnitude: deuteranopia and protanopia affect ~1 in 12 men,');
  console.log('  tritanopia ~1 in 10,000 and is not sex-linked.\n');
  for (const [theme, scope] of [
    ['dark', dark],
    ['light', light],
  ]) {
    const res = assessCvd(scope, dark);
    if (!res.length) continue;
    console.log(`  ${theme}:`);
    const w = Math.max(...res.map((r) => r.pair.length));
    for (const r of res) {
      const notable = r.risk || r.lost > 0.5;
      if (!notable && !VERBOSE) continue;
      const flag = r.risk ? 'AT-RISK' : r.lost > 0.5 ? 'hue-lost' : 'ok';
      console.log(
        `    ${flag.padEnd(9)} ${r.pair.padEnd(w)}  chroma ${r.chroma.toFixed(3)}` +
          ` (${(r.lost * 100).toFixed(0)}% lost)  lightness ${r.light.toFixed(3)}` +
          `  worst under ${r.kind}`,
      );
    }
    const risky = res.filter((r) => r.risk).length;
    const lost = res.filter((r) => !r.risk && r.lost > 0.5).length;
    console.log(
      `    ${risky} of ${res.length} pair(s) at risk; ` +
        `${lost} more lose most of their hue signal but stay separable by lightness.\n`,
    );
  }

  console.log('── NOT MEASURED, and why ───────────────────────────────────────────');
  for (const [t, why] of EXEMPT) console.log(`  ${t.padEnd(22)} ${why}`);
  console.log('');

  if (badControls) {
    console.log('RESULT: CONTROLS FAILED — this run measured nothing.');
    process.exit(2);
  }
  const gate = AAA_GATE ? aaaFail : aaFail;
  console.log(
    gate === 0
      ? `RESULT: conformant at ${AAA_GATE ? 'AAA' : 'AA'} on every measured token, worst surface.` +
          (AAA_GATE ? '' : `  (${aaaFail} would fail at AAA.)`)
      : `RESULT: ${gate} failure(s) at ${AAA_GATE ? 'AAA' : 'AA'}. Re-run with --solve for proposed values.`,
  );
  process.exit(gate === 0 ? 0 : 1);
}

report();
