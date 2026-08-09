/**
 * Shared color math for the olympia-brand scripts.
 *
 * sRGB parsing and compositing, WCAG 2.1 relative luminance and contrast ratio,
 * OKLab/OKLCh for hue-preserving solving and perceptual separation, and
 * color-vision-deficiency simulation.
 *
 * Holds NO palette values. Every color a caller measures comes from
 * tokens/colors.css on disk; the only fixed colors in this project live in
 * check-contrast.mjs's controls, where being fixed and known is the point.
 *
 * Node only, no dependencies.
 */

// ── color ───────────────────────────────────────────────────────────────────

// The handful of CSS named colors that actually appear in this project's
// artwork. Not the full CSS list on purpose: an unrecognized name should return
// null and be caught, rather than silently resolving to something plausible.
// On-chain SVG uses `white` where our CSS would use a token.
const NAMED = {
  white: '#ffffff',
  black: '#000000',
  none: null,
  transparent: null,
};

/** #rgb / #rrggbb / rgb() / rgba() / a few named colors -> {r,g,b,a}. */
function parseColor(str) {
  let s = String(str).trim();
  if (Object.prototype.hasOwnProperty.call(NAMED, s.toLowerCase())) {
    const mapped = NAMED[s.toLowerCase()];
    if (mapped === null) return null;
    s = mapped;
  }
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) {
    const [a, b, c] = m[1];
    return { r: parseInt(a + a, 16), g: parseInt(b + b, 16), b: parseInt(c + c, 16), a: 1 };
  }
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[,/]/).map((x) => x.trim());
    return { r: +p[0], g: +p[1], b: +p[2], a: p[3] === undefined ? 1 : +p[3] };
  }
  return null;
}

const hex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Paint `fg` over opaque `bg` and return the resulting opaque color. */
function composite(fg, bg) {
  if (fg.a >= 1) return { ...fg, a: 1 };
  const k = fg.a;
  return {
    r: fg.r * k + bg.r * (1 - k),
    g: fg.g * k + bg.g * (1 - k),
    b: fg.b * k + bg.b * (1 - k),
    a: 1,
  };
}

const srgbToLinear = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const linearToSrgb = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(v * 255)));
};

/** WCAG 2.1 relative luminance. */
const luminance = ({ r, g, b }) =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

/** WCAG 2.1 contrast ratio, 1..21. Both colors must already be opaque. */
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// ── OKLab / OKLCh ───────────────────────────────────────────────────────────
// Björn Ottosson's transform. Solving in OKLCh lets lightness move while hue and
// chroma stay put, so a green stays teal instead of drifting yellow the way a
// naive per-channel darkening does. Also supplies the perceptual distance used
// by the color-vision-deficiency assessment below.

function toOklab({ r, g, b }) {
  const [R, G, B] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function fromOklab({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: 1,
  };
}

const toOklch = (c) => {
  const { L, a, b } = toOklab(c);
  return { L, C: Math.hypot(a, b), h: Math.atan2(b, a) };
};
const fromOklch = ({ L, C, h }) => fromOklab({ L, a: C * Math.cos(h), b: C * Math.sin(h) });

/**
 * Perceptual separation in OKLab, split into its two axes. Used only for the
 * CVD assessment, never for WCAG.
 *
 * The split is the whole point. Measured on this simulator: saturated red and
 * green under deuteranopia keep a lightness separation of 0.221 while their
 * chromatic separation collapses from 0.462 to 0.030 — 94% of the hue signal
 * gone. Collapsing that into a single number reports the pair as "fine" and
 * hides that its color coding has stopped working; a reader who can still tell
 * them apart is doing it by brightness alone.
 */
function separation(x, y) {
  const A = toOklab(x);
  const B = toOklab(y);
  return { chroma: Math.hypot(A.a - B.a, A.b - B.b), light: Math.abs(A.L - B.L) };
}

/**
 * Search OKLCh lightness for the value nearest `start` that clears `target`
 * against `bg`, holding hue and chroma. `up` says which direction gains
 * contrast: contrast is monotonic in L on each side of the background.
 */
function search(C, h, bg, target, up) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = ratio(fromOklch({ L: mid, C, h }), bg);
    if (up) r >= target ? (hi = mid) : (lo = mid);
    else r >= target ? (lo = mid) : (hi = mid);
  }
  const c = fromOklch({ L: up ? hi : lo, C, h });
  return ratio(c, bg) >= target ? c : null;
}

/**
 * Propose a compliant replacement for `start` on `bg`. Moves away from the
 * background's lightness — a foreground on a dark surface brightens, one on a
 * pale surface darkens — and gives up chroma only if no lightness at the
 * original hue can reach the target.
 */
function solve(start, bg, target) {
  const { C, h } = toOklch(start);
  const up = luminance(start) >= luminance(bg); // already lighter -> get lighter
  for (let cut = 1; cut >= 0; cut -= 0.05) {
    const found = search(C * cut, h, bg, target, up);
    if (found) return found;
  }
  return null;
}

// ── color-vision deficiency ─────────────────────────────────────────────────
// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in LINEAR RGB.
// Roughly 1 in 12 men and 1 in 200 women have some form of these.

const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simulate(color, kind) {
  const M = CVD[kind];
  const v = [srgbToLinear(color.r), srgbToLinear(color.g), srgbToLinear(color.b)];
  return {
    r: linearToSrgb(M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2]),
    g: linearToSrgb(M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2]),
    b: linearToSrgb(M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]),
    a: 1,
  };
}

// Thresholds are a judgment call, not a standard: WCAG sets NO numeric bar for
// telling two hues apart. SC 1.4.1 instead requires that color never be the
// only means of conveying information. So this section is ADVISORY — it says
// which pairs lean hardest on hue, i.e. where a label, icon or shape is
// load-bearing rather than decorative.
//
// A pair is at risk only when BOTH axes collapse: hue no longer separates it
// AND brightness does not rescue it. Calibrated against measured values —
// CHROMA_FLOOR sits above red-vs-green's residual 0.030 under deuteranopia and
// well above the ~0.02 OKLab just-noticeable difference; LIGHT_RESCUE sits
// below that same pair's surviving 0.221, so brightness-separated pairs are
// correctly not flagged.
const CHROMA_FLOOR = 0.05;
const LIGHT_RESCUE = 0.15;
const atRisk = (s) => s.chroma < CHROMA_FLOOR && s.light < LIGHT_RESCUE;

export {
  parseColor, hex, composite, srgbToLinear, linearToSrgb,
  luminance, ratio,
  toOklab, fromOklab, toOklch, fromOklch,
  separation, solve, search,
  CVD, simulate, CHROMA_FLOOR, LIGHT_RESCUE, atRisk,
};
