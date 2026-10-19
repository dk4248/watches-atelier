// DIAL of the NOMOS Tangente neomatik 38 Update ref. 147 and the UPDATE DATE RING under it.
//
// The dial is a galvanised, white silver-plated brass disc. 31 stadium slots are cut right
// through it between the printed date numerals 1–31 (9–22 upside down so they read from
// 6 o'clock); through them the white date ring shows, and two red markers on the ring
// frame today's date. Black pad print: Tangente numerals and batons, the minute track
// (moved inward for the date track), NOMOS / GLASHÜTTE, MADE IN GERMANY, the small-seconds
// ticks; "neomatik" is a separate gold decal with glitter. The small seconds sit in a
// recess with a soft stamped step and a concentrically turned ("snailed") floor.
//
// Print: ONE canvas (4096², ~115 px/mm; 2048 in lite mode) mapped with planar UVs over the
// whole dial. The Tangente numerals and the NOMOS logo come from the shared NOMOS glyph
// module (the same family as the Tangente 139), fitted to this dial's measured widths.
// The date numerals, GLASHÜTTE and MADE IN GERMANY use the small DIN-like monoline stroke
// font below, laid into the letter boxes measured on the official render (front.jpg,
// 23.50 px/mm, research/tangente-update-147/exterior.md §3).
//
// The date ring (`date-ring`, drive: date) carries 31 internal castellated teeth (worked by
// the switching wheel and the jumper in date.js) and the two red markers. Its face material
// darkens itself under the slot walls (a small shader patch that knows where the slots are),
// so the ring reads light grey in the slots, darker along their walls, like the photos.
//
// Registers: dial, small-seconds, dial-feet, date-ring. Built in lite mode too (the watch
// box shows the dial from above, so the markers must show through the slots there).
import * as THREE from 'three';
import { numeralOps, nomosOps, runOps, arcPts, cubicPts } from '../../../geom/nomos-glyphs.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ module-local constants
// Silver-plated dial under the studio light (same finish and tuning as the Tangente 139):
// slightly warm albedo with the environment bound explicitly at 0.6, so the plating reads
// as light silver (#e9e9e9 in the photos) and its frosted grain still shows.
const DIAL_FINISH = { albedo: 0xebe9e4, envMapIntensity: 0.6, grainTileMM: 5.33 };
// Turned subdial floor (#e3e3e3, a shade darker than the dial): frosted like the dial in
// every photo, with a faint circular sheen from the turning.
const SUBDIAL_FINISH = { albedo: 0xe6e4df, roughness: 0.44, anisotropy: 0.22, envMapIntensity: 0.62 };
// Turned grooves, in fractions of one pitch: flat land [0, land), shallow V-groove [land, 1).
// The 147's grooves are far finer than the 139's: no rings and no broken ticks show even
// in close-up photos (mono_4, d3_sub), only a soft circular sheen, so they are shallow and
// the ticks are printed whole. slope = peak flank slope; grain = frosting on top.
const GROOVE = { land: 0.5, slope: 0.12, occlusion: 0.06, aoIntensity: 1.0, grain: 0.16 };
// Soft stamped step of the subdial recess: a smoothstep profile, half-width = STEP_SOFT ×
// depth, steepest (37°) in the middle — matches the shading across the step in front.jpg
// (a mild dark band on the upper side, a bright one below).
const STEP_SOFT = 1.0;
// MADE IN GERMANY, letter by letter (clock degrees, exterior.md §3.4; the spec keeps only
// the word spans): reading left → right from 6 o'clock = decreasing clock angle.
const MADE_IN_LETTERS = [
  ['M', 193.4, 194.9], ['A', 191.4, 192.6], ['D', 189.4, 190.6], ['E', 187.5, 188.5], ['I', 184.1, 184.5],
  ['N', 182.0, 183.2], ['G', 177.0, 178.3], ['E', 175.1, 176.1], ['R', 173.2, 174.4], ['M', 171.0, 172.4],
  ['A', 169.0, 170.2], ['N', 166.9, 168.2], ['Y', 165.0, 166.3],
];
// Date numerals: proportional DIN-condensed digits. Ink widths and spacing re-measured on
// front.jpg (all 31 numbers; my scratch script datenum.py): most digits 0.42–0.48 wide, the
// "1" only 0.23 (stem + flag); 0.10 between digits, 0.19 next to a "1". The spec's
// digitWidth/digitAdvance (0.33/0.45) are centreline values of the same measurement.
const DATE_DIGIT_INK = { 0: 0.45, 1: 0.23, 2: 0.45, 3: 0.45, 4: 0.48, 5: 0.43, 6: 0.44, 7: 0.44, 8: 0.47, 9: 0.45 };
const DATE_DIGIT_GAP = 0.10, DATE_DIGIT_GAP_ONE = 0.19;
// Tangente numerals: spec gives the overall widths; the gap after the "1" of 12 / 10 is
// measured from its stem (exterior.md §3.2), so subtract the flare overhang.
const NUMERAL_GAP_AFTER_ONE = { 12: 0.26, 10: 0.25 };
// "neomatik": stroke and ascender of the t (estimates from the macro detail1.jpg; the
// spec gives x-height 0.53 and the k's ascender 0.69); i-dot top at +0.78 (exterior.md).
const NEO = { stroke: 0.062, tAscender: 0.64, iDotTop: 0.78, dotR: 0.04, relief: 0.004 };
// Date ring look: matte white face; its inner toothed band is bare (rhodium-plated) brass,
// as in the SJX macro of the DUW 6101 date ring.
const RING_FINISH = { albedo: 0xeeeeec, roughness: 0.72, envMapIntensity: 0.6, markerRoughness: 0.5, markerLift: 0.002 };
// Slot occlusion on the ring (the walls are 0.40 deep over a 0.58 wide slot): brightness
// factor at the wall foot and in the middle of a slot, and what remains under the dial.
const SLOT_AO = { wall: 0.55, mid: 0.97, under: 0.25, directShare: 0.5 };

// ------------------------------------------------------------------ DIN-like stroke font
// Glyph centrelines in an ink box [0, W] × [0, H] (y up, baseline 0) for a monoline stroke
// sw. Stems that end on the baseline or the cap line overshoot it and are cut flat by a clip
// to the band [0, H] (DIN's square terminals); bowls stay inside the box.
const ell = (cx, cy, rx, ry, a0, a1, n) => arcPts(cx, cy, rx, ry, a0 * DEG, a1 * DEG, n);
const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

function dinGlyph(ch, W, H, sw, opt = {}) {
  const s = sw / 2, w = W - sw, h = H - sw;
  const L = s, R = W - s, B = s, T = H - s, X = W / 2;
  const paths = [], dots = [];
  const line = (pts, join = 'round', closed = false) => paths.push({ pts, join, closed });
  switch (ch) {
    case '0': {
      const a = w / 2;
      line([...ell(L + a, T - a, a, a, 0, 180, 22), ...ell(L + a, B + a, a, a, 180, 360, 22)], 'round', true);
      break;
    }
    case '1':
      line([[L, T - 0.27 * h], [R, T + 0.4 * s]]);
      line([[R, H + sw], [R, -sw]]);
      break;
    case '2': {
      const a = w / 2, cx = L + a, cy = T - a;
      const dx = L - cx, dy = B - cy, d = Math.hypot(dx, dy);
      const at = (Math.atan2(dy, dx) + Math.acos(Math.min(1, a / d))) / DEG; // tangent from the foot corner
      line([...ell(cx, cy, a, a, 160, at, 30), [L, B], [W, B]]);
      break;
    }
    case '3': {
      const rxU = 0.45 * w, ryU = 0.235 * h, cxU = L + 0.47 * w, cyU = T - ryU, yM = cyU - ryU;
      line(ell(cxU, cyU, rxU, ryU, 150, -90, 24));
      const rxL = w / 2, ryL = (yM - B) / 2;
      line([[L + 0.22 * w, yM], ...ell(L + w / 2, B + ryL, rxL, ryL, 90, -148, 28)]);
      break;
    }
    case '4': {
      const xs = L + 0.68 * w, yc = B + 0.26 * h;
      line([[xs, H + sw], [xs, -sw]]);
      line([[xs, T], [L, yc], [W, yc]]);
      break;
    }
    case '5': {
      const rx = w / 2, ry = 0.31 * h, cx = L + w / 2, cy = B + ry, ja = 145;
      const jx = cx + rx * Math.cos(ja * DEG), jy = cy + ry * Math.sin(ja * DEG);
      line([[W, T], [jx, T], [jx, jy - 0.5 * s]], 'miter');
      line(ell(cx, cy, rx, ry, ja + 2, -146, 30));
      break;
    }
    case '6': case '9': {
      const rx = w / 2, ry = 0.29 * h, cx = L + w / 2, cy = B + ry;
      const bowl = ell(cx, cy, rx, ry, 0, 360, 40);
      const stem = [[L, cy], ...cubicPts([L, cy], [L, cy + 0.62 * (T - cy)], [L + 0.3 * w, T], [L + 0.86 * w, T - 0.02 * h], 16)];
      const flip = (pts) => (ch === '9' ? pts.map(([x, y]) => [W - x, H - y]) : pts);
      line(flip(bowl), 'round', true);
      line(flip(stem));
      break;
    }
    case '7':
      line([[0, T], [R, T], [L + 0.28 * w, -sw]], 'miter');
      break;
    case '8': {
      const cx = L + w / 2, ryU = 0.225 * h, rxU = 0.43 * w, ryL = 0.5 * h - ryU, rxL = w / 2;
      line(ell(cx, T - ryU, rxU, ryU, 0, 360, 36), 'round', true);
      line(ell(cx, B + ryL, rxL, ryL, 0, 360, 40), 'round', true);
      break;
    }
    case 'A': {
      const ya = T + 0.2 * s, xb = 1.15 * s;
      const kx = (X - xb) / ya; // leg run per unit rise
      line([[xb - kx * sw, -sw], [X, ya], [W - xb + kx * sw, -sw]], 'miter');
      const yb = 0.3 * H;
      line([[xb + kx * yb, yb], [W - xb - kx * yb, yb]]);
      break;
    }
    case 'D': {
      const rd = Math.min(0.55 * w, 0.5 * h);
      line([[L, -sw], [L, H + sw]]);
      line([[L, T], ...ell(R - rd, T - rd, rd, rd, 90, 0, 12), ...ell(R - rd, B + rd, rd, rd, 0, -90, 12), [L, B]]);
      break;
    }
    case 'E':
      line([[W, T], [L, T], [L, B], [W, B]], 'miter');
      line([[L, 0.5 * H], [W - 0.08 * w, 0.5 * H]]);
      break;
    case 'G': {
      const a = w / 2, cx = L + a, yb = 0.45 * H;
      line([...ell(cx, T - a, a, a, 35, 180, 16), ...ell(cx, B + a, a, a, 180, 360, 20), [R, yb], [L + 0.5 * w, yb]]);
      break;
    }
    case 'H':
      line([[L, -sw], [L, H + sw]]);
      line([[R, -sw], [R, H + sw]]);
      line([[L, 0.5 * H], [R, 0.5 * H]]);
      break;
    case 'I':
      line([[X, -sw], [X, H + sw]]);
      break;
    case 'L':
      line([[L, H + sw], [L, B], [W, B]], 'miter');
      break;
    case 'M':
      line([[L, -sw], [L, T], [X, B + 0.3 * h], [R, T], [R, -sw]], 'miter');
      break;
    case 'N':
      line([[L, -sw], [L, T], [R, B], [R, H + sw]], 'miter');
      break;
    case 'R': {
      const ym = B + 0.46 * h, rb = Math.min(0.5 * w, 0.5 * (T - ym));
      line([[L, -sw], [L, H + sw]]);
      line([[L, T], ...ell(R - rb, T - rb, rb, rb, 90, 0, 10), ...ell(R - rb, ym + rb, rb, rb, 0, -90, 10), [L, ym]]);
      line([[L + 0.4 * w, ym], [R + 0.15 * s, -sw]]);
      break;
    }
    case 'S': {
      const rxU = 0.44 * w, ryU = 0.245 * h, cxU = L + 0.5 * w, cyU = T - ryU;
      const rxL = w / 2, ryL = 0.255 * h, cxL = L + w / 2, cyL = B + ryL;
      const a0 = 200 * DEG, a1 = 20 * DEG;
      const p0 = [cxU + rxU * Math.cos(a0), cyU + ryU * Math.sin(a0)];
      const p3 = [cxL + rxL * Math.cos(a1), cyL + ryL * Math.sin(a1)];
      const t0 = unit(-rxU * Math.sin(a0), ryU * Math.cos(a0));
      const t1 = unit(rxL * Math.sin(a1), -ryL * Math.cos(a1));
      const k = 0.38 * Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
      line([
        ...ell(cxU, cyU, rxU, ryU, 28, 200, 22),
        ...cubicPts(p0, [p0[0] + t0[0] * k, p0[1] + t0[1] * k], [p3[0] - t1[0] * k, p3[1] - t1[1] * k], p3, 10),
        ...ell(cxL, cyL, rxL, ryL, 20, -152, 26).slice(1),
      ]);
      break;
    }
    case 'T':
      line([[0, T], [W, T]]);
      line([[X, T], [X, -sw]]);
      break;
    case 'U': case 'Ü': {
      const a = w / 2;
      line([[L, H + sw], ...ell(L + a, B + a, a, a, 180, 360, 20), [R, H + sw]]);
      if (ch === 'Ü') {
        const r = opt.dotR ?? 0.6 * sw, top = opt.umlautTop ?? H + 2.2 * sw;
        dots.push([X - 0.28 * w, top - r, r], [X + 0.28 * w, top - r, r]);
      }
      break;
    }
    case 'Y': {
      const yj = 0.45 * H;
      line([[L - 0.1 * s, H + sw], [X, yj], [R + 0.1 * s, H + sw]], 'miter');
      line([[X, yj], [X, -sw]]);
      break;
    }
    default: break;
  }
  return { paths, dots, top: H };
}

// Lowercase light geometric sans for the gold "neomatik" (double-storey a, round arches),
// in the same ink-box convention: x-height xh, ascender asc.
function neoGlyph(ch, W, xh, asc, sw) {
  const s = sw / 2, w = W - sw, L = s, R = W - s, X = W / 2, B = s, xT = xh - s;
  const paths = [], dots = [];
  const line = (pts, join = 'round', closed = false) => paths.push({ pts, join, closed });
  let top = xh;
  switch (ch) {
    case 'n': {
      const a = w / 2, cy = xT - a;
      line([[L, -sw], [L, xh + sw]]);
      line([[R, -sw], [R, cy], ...ell(L + a, cy, a, a, 0, 180, 22).slice(1)]);
      break;
    }
    case 'm': {
      const a = w / 4, cy = xT - a;
      line([[L, -sw], [L, xh + sw]]);
      line([[X, -sw], [X, cy], ...ell(L + a, cy, a, a, 0, 180, 18).slice(1)]);
      line([[R, -sw], [R, cy], ...ell(X + a, cy, a, a, 0, 180, 18).slice(1)]);
      break;
    }
    case 'o':
      line(ell(X, xh / 2, w / 2, (xh - sw) / 2, 0, 360, 48), 'round', true);
      break;
    case 'e': {
      const rx = w / 2, ry = (xh - sw) / 2, cy = xh / 2;
      line([[L, cy], [R, cy], ...ell(X, cy, rx, ry, 0, 318, 44).slice(1)]);
      break;
    }
    case 'a': {
      const ra = 0.5 * w, ryb = 0.3 * (xh - sw), rxb = 0.47 * w, yb2 = B + 2 * ryb;
      line([[R, -sw], [R, xT - ra], ...ell(R - ra, xT - ra, ra, ra, 0, 150, 16).slice(1)]);
      line([[R, yb2], [L + rxb, yb2], ...ell(L + rxb, B + ryb, rxb, ryb, 90, 270, 20).slice(1), [R, B + 0.1 * ryb]]);
      break;
    }
    case 't': {
      top = NEO.tAscender;
      const xt = L + 0.34 * w, rt = Math.min(0.55 * (R - xt), 0.1);
      line([[xt, top + sw], [xt, B + rt], ...ell(xt + rt, B + rt, rt, rt, 180, 270, 8).slice(1), [R, B]]);
      line([[0, xT], [W, xT]]);
      break;
    }
    case 'i':
      line([[X, -sw], [X, xh + sw]]);
      dots.push([X, NEO.iDotTop - NEO.dotR, NEO.dotR]);
      break;
    case 'k': {
      top = asc;
      const yj = 0.32 * xh;
      line([[L, -sw], [L, top + sw]]);
      line([[R, xT], [L + 0.02, yj]]);
      const ax = L + 0.4 * w, ay = yj + (xT - yj) * ((ax - L - 0.02) / (R - L - 0.02));
      line([[ax, ay], [R + 0.1 * s, -sw]]);
      break;
    }
    default: break;
  }
  return { paths, dots, top };
}

// Draw a glyph (ink box at local x0, baseline y0) in the current canvas transform (mm).
function drawGlyph(g, gl, x0, y0, W, sw) {
  g.save();
  g.beginPath();
  g.rect(x0 - 1, y0, W + 2, gl.top);
  g.clip();
  g.lineWidth = sw;
  for (const p of gl.paths) {
    g.beginPath();
    g.moveTo(x0 + p.pts[0][0], y0 + p.pts[0][1]);
    for (let i = 1; i < p.pts.length; i++) g.lineTo(x0 + p.pts[i][0], y0 + p.pts[i][1]);
    if (p.closed) g.closePath();
    g.lineJoin = p.join;
    g.stroke();
  }
  g.restore();
  for (const [x, y, r] of gl.dots) {
    g.beginPath();
    g.arc(x0 + x, y0 + y, r, 0, TAU);
    g.fill();
  }
}

// ------------------------------------------------------------------ Tangente numerals
// The shared glyphs carry the Tangente 139's proportions; this dial's numerals are measured
// separately (spec.dial.numerals.widths). Split the ops into characters by their ink
// extents and map each character into its measured box; stroke widths stay untouched.
function opInkExtent(op) {
  let lo = Infinity, hi = -Infinity;
  const pts = op.fill || op.stroke;
  const hw = op.stroke ? op.width / 2 : 0;
  for (const [x] of pts) { lo = Math.min(lo, x - hw); hi = Math.max(hi, x + hw); }
  if (op.stroke && op.join === 'miter') { // sharp corners poke out past the stroke edge
    const n = pts.length;
    for (let i = op.closed ? 0 : 1; i < n - (op.closed ? 0 : 1); i++) {
      const a = pts[(i - 1 + n) % n], p = pts[i], b = pts[(i + 1) % n];
      const d1 = unit(p[0] - a[0], p[1] - a[1]), d2 = unit(b[0] - p[0], b[1] - p[1]);
      for (const sgn of [1, -1]) {
        const m = [sgn * (-d1[1] - d2[1]), sgn * (d1[0] + d2[0])];
        const m2 = m[0] * m[0] + m[1] * m[1];
        if (m2 < 1e-6 || 2 / Math.sqrt(m2) > 10) continue; // canvas miterLimit 10
        const x = p[0] + (m[0] * 2 * hw) / m2;
        lo = Math.min(lo, x); hi = Math.max(hi, x);
      }
    }
  }
  return [lo, hi];
}
function fitNumeral(ops, text, D) {
  const chars = [...String(text)];
  const SW = D.numerals.stroke;
  const ext = ops.map(opInkExtent);
  const order = ops.map((_, i) => i).sort((a, b) => ext[a][0] - ext[b][0]);
  const clusters = [];
  for (const i of order) {
    const c = clusters[clusters.length - 1];
    if (c && ext[i][0] <= c.hi + 0.02) { c.ops.push(i); c.hi = Math.max(c.hi, ext[i][1]); c.lo = Math.min(c.lo, ext[i][0]); } else clusters.push({ ops: [i], lo: ext[i][0], hi: ext[i][1] });
  }
  if (clusters.length !== chars.length) return ops; // unexpected layout: keep as drawn
  const total = D.numerals.widths[text];
  if (!total) return ops;
  const targets = [];
  if (chars.length === 1) targets.push([-total / 2, total / 2]);
  else {
    const w1 = clusters[0].hi - clusters[0].lo;
    const gapInk = (NUMERAL_GAP_AFTER_ONE[text] ?? 0.25) - (w1 - SW) / 2;
    targets.push([-total / 2, -total / 2 + w1], [-total / 2 + w1 + gapInk, total / 2]);
  }
  const map = new Map();
  clusters.forEach((c, k) => {
    const [A, Bt] = targets[k];
    let f;
    if (chars[k] === '1') f = (x) => x + (A - c.lo);
    else {
      const kx = (Bt - A - SW) / (c.hi - c.lo - SW);
      f = (x) => A + SW / 2 + (x - (c.lo + SW / 2)) * kx;
    }
    for (const i of c.ops) map.set(i, f);
  });
  return ops.map((op, i) => {
    const f = map.get(i);
    const pts = (op.fill || op.stroke).map(([x, y]) => [f(x), y]);
    return op.fill ? { fill: pts } : { ...op, stroke: pts };
  });
}

// ------------------------------------------------------------------ the print canvas
function paintDial(canvas, N, spec) {
  const D = spec.dial;
  const R = D.radius;
  const s = N / (2 * R); // px per mm
  if (canvas.width !== N) { canvas.width = N; canvas.height = N; }
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, N, N);
  g.fillStyle = D.print;
  g.strokeStyle = D.print;
  g.lineCap = 'butt';
  g.miterLimit = 10;
  // Local frame at dial point (cx, cy) [mm, y up] whose "up" is unit (ux, uy); local x is
  // the reading direction (up turned 90° clockwise).
  const frame = (cx, cy, ux, uy) => g.setTransform(s * uy, s * ux, s * ux, -s * uy, s * (cx + R), s * (R - cy));
  const radialRect = (cx, cy, clockDeg, r0, r1, w) => {
    const a = clockDeg * DEG;
    frame(cx, cy, Math.sin(a), Math.cos(a));
    g.fillRect(-w / 2, r0, w, r1 - r0);
  };

  // 1. Minute track: 60 ticks, the fives as wide as the batons; 28–32 shortened round
  //    MADE IN GERMANY.
  const mt = D.minuteTrack;
  for (let i = 0; i < 60; i++) {
    const [r0, r1] = mt.shortened?.[i] || mt.r;
    radialRect(0, 0, i * 6, r0, r1, i % 5 === 0 ? mt.majorWidth : mt.minorWidth);
  }

  // 2. Hour batons (5 and 7 start further out, clear of the subdial).
  for (const h of D.batons.hours) {
    const [r0, r1] = D.batons.rShort?.[h] || D.batons.r;
    radialRect(0, 0, h * 30, r0, r1, D.batons.width);
  }

  // 3. Tangente numerals lying along their radius: tops out at 12, 2, 10; in at 4, 8.
  const nm = D.numerals;
  const rc = (nm.r[0] + nm.r[1]) / 2;
  for (const h of nm.hours) {
    const a = h * 30 * DEG;
    const out = [Math.sin(a), Math.cos(a)];
    const up = nm.inwardTops.includes(h) ? [-out[0], -out[1]] : out;
    frame(out[0] * rc, out[1] * rc, up[0], up[1]);
    runOps(g, fitNumeral(numeralOps(String(h), nm.height, nm.stroke), h, D));
  }

  // 4. NOMOS logo (pointed M), centred on its measured letter boxes.
  {
    const lg = D.logo;
    const xc = lg.letters ? (lg.letters[0][0] + lg.letters[lg.letters.length - 1][1]) / 2 : 0;
    frame(xc, lg.baselineY, 0, 1);
    g.lineCap = 'butt';
    runOps(g, nomosOps(lg.capHeight, lg.width));
  }

  // 5. GLASHÜTTE: condensed DIN-like capitals in their measured letter boxes.
  {
    const c = D.city;
    const chars = [...c.text];
    frame(0, c.baselineY, 0, 1);
    chars.forEach((ch, i) => {
      const [l, r] = c.letters?.[i] || [-c.width / 2 + (i * c.width) / chars.length, -c.width / 2 + ((i + 0.8) * c.width) / chars.length];
      drawGlyph(g, dinGlyph(ch, r - l, c.capHeight, c.stroke, { umlautTop: c.umlautTop - c.baselineY, dotR: 0.045 }), l, 0, r - l, c.stroke);
    });
  }

  // 6. MADE IN GERMANY on its arc, tops toward the centre (upright seen from 6 o'clock).
  {
    const md = D.madeIn;
    const rBase = md.r[1], rMid = (md.r[0] + md.r[1]) / 2;
    for (const [ch, c0, c1] of MADE_IN_LETTERS) {
      const c = ((c0 + c1) / 2) * DEG;
      const W = (c1 - c0) * DEG * rMid;
      frame(rBase * Math.sin(c), rBase * Math.cos(c), -Math.sin(c), -Math.cos(c));
      drawGlyph(g, dinGlyph(ch, W, md.capHeight, md.stroke), -W / 2, 0, W, md.stroke);
    }
  }

  // 7. The Update's date track: 1–31, "31" at 12 o'clock; 9–22 upside down.
  {
    const dn = D.dateNumerals;
    const H = dn.r[1] - dn.r[0], rMid = (dn.r[0] + dn.r[1]) / 2;
    for (let d = 1; d <= 31; d++) {
      const c = dn.clockDegOf(d) * DEG;
      const out = [Math.sin(c), Math.cos(c)];
      const up = dn.inverted.includes(d) ? [-out[0], -out[1]] : out;
      frame(out[0] * rMid, out[1] * rMid, up[0], up[1]);
      const digits = [...String(d)];
      const widths = digits.map((ch) => DATE_DIGIT_INK[ch]);
      const gaps = digits.slice(1).map((ch, i) => (ch === '1' || digits[i] === '1' ? DATE_DIGIT_GAP_ONE : DATE_DIGIT_GAP));
      const total = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
      let x = -total / 2;
      digits.forEach((ch, i) => {
        drawGlyph(g, dinGlyph(ch, widths[i], H, dn.stroke), x, -H / 2, widths[i], dn.stroke);
        x += widths[i] + (gaps[i] || 0);
      });
    }
  }

  // 8. Small-seconds ticks: twelve equal strokes (the grooves are too fine to break them).
  {
    const sub = D.subdial;
    const [r0, r1] = sub.ticks.r;
    for (let i = 0; i < sub.ticks.count; i++) radialRect(sub.center[0], sub.center[1], (i * 360) / sub.ticks.count, r0, r1, sub.ticks.width);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}

// "neomatik" alpha mask (white glyphs on black) over the rectangle box = [x0, y0, x1, y1].
function paintNeomatik(canvas, ppm, D, box) {
  const m = D.model;
  const [x0, y0, x1, y1] = box;
  canvas.width = Math.ceil((x1 - x0) * ppm);
  canvas.height = Math.ceil((y1 - y0) * ppm);
  const g = canvas.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.setTransform(ppm, 0, 0, -ppm, -x0 * ppm, y1 * ppm);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineCap = 'butt';
  g.miterLimit = 10;
  [...m.text].forEach((ch, i) => {
    const [l, r] = m.letters[i];
    drawGlyph(g, neoGlyph(ch, r - l, m.xHeight, m.ascender, NEO.stroke), l, m.baselineY, r - l, NEO.stroke);
  });
}

// ------------------------------------------------------------------ textures
// Concentric turned grooves as a tangent-space normal map + occlusion + anisotropy
// direction, over the subdial's own centred UVs (radius = texture half-size in mm).
function grooveTextures(radius, pitch, size) {
  const LUT = 2048, slope = new Float32Array(LUT), occ = new Uint8Array(LUT);
  for (let i = 0; i < LUT; i++) {
    const f = i / LUT;
    const t = f < GROOVE.land ? 0 : (f - GROOVE.land) / (1 - GROOVE.land);
    slope[i] = f < GROOVE.land ? 0 : -Math.sin(TAU * t); // dh/dr: down the inner flank, up the outer
    occ[i] = Math.round(255 * (1 - (GROOVE.occlusion * (1 - Math.cos(TAU * t))) / 2));
  }
  const cn = document.createElement('canvas'), co = document.createElement('canvas');
  cn.width = cn.height = co.width = co.height = size;
  const gn = cn.getContext('2d'), go = co.getContext('2d');
  const imn = gn.createImageData(size, size), imo = go.createImageData(size, size);
  const mmPerPx = (2 * radius) / size;
  // frosting: smoothed white noise (period = the texture), added as random slopes
  const gs = size, grain = new Float32Array(gs * gs);
  let seed = 977;
  for (let i = 0; i < grain.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; grain[i] = seed / 0x7fffffff - 0.5; }
  const gAt = (i, j) => grain[((j + gs) % gs) * gs + ((i + gs) % gs)];
  for (let j = 0; j < size; j++) {
    const y = radius - (j + 0.5) * mmPerPx;
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) * mmPerPx - radius;
      const r = Math.hypot(x, y) + 1e-6;
      const f = r / pitch;
      const k = Math.floor((f - Math.floor(f)) * LUT);
      const d = slope[k] * GROOVE.slope * Math.min(1, r / 0.25);
      const gx = (gAt(i + 1, j) - gAt(i - 1, j) + gAt(i + 1, j + 1) - gAt(i - 1, j + 1)) * GROOVE.grain;
      const gy = (gAt(i, j - 1) - gAt(i, j + 1) + gAt(i + 1, j - 1) - gAt(i + 1, j + 1)) * GROOVE.grain;
      const nx = (-d * x) / r + gx, ny = (-d * y) / r + gy, l = Math.hypot(nx, ny, 1);
      const o = (j * size + i) * 4;
      imn.data[o] = ((nx / l) * 0.5 + 0.5) * 255;
      imn.data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      imn.data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      imn.data[o + 3] = 255;
      imo.data[o] = imo.data[o + 1] = imo.data[o + 2] = occ[k];
      imo.data[o + 3] = 255;
    }
  }
  gn.putImageData(imn, 0, 0);
  go.putImageData(imo, 0, 0);
  const normalMap = new THREE.CanvasTexture(cn);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.anisotropy = 8;
  const aoMap = new THREE.CanvasTexture(co);
  aoMap.colorSpace = THREE.NoColorSpace;
  aoMap.anisotropy = 8;
  // anisotropy direction: tangential (along the grooves)
  const as = 128, ca = document.createElement('canvas');
  ca.width = ca.height = as;
  const ga = ca.getContext('2d'), ia = ga.createImageData(as, as);
  for (let j = 0; j < as; j++) {
    for (let i = 0; i < as; i++) {
      const a = Math.atan2(0.5 - (j + 0.5) / as, (i + 0.5) / as - 0.5) + Math.PI / 2;
      const o = (j * as + i) * 4;
      ia.data[o] = (Math.cos(a) * 0.5 + 0.5) * 255;
      ia.data[o + 1] = (Math.sin(a) * 0.5 + 0.5) * 255;
      ia.data[o + 2] = 255;
      ia.data[o + 3] = 255;
    }
  }
  ga.putImageData(ia, 0, 0);
  const anisotropyMap = new THREE.CanvasTexture(ca);
  anisotropyMap.colorSpace = THREE.NoColorSpace;
  return { normalMap, aoMap, anisotropyMap };
}

// Metallic glitter of the gold print: tiny flat flakes, each tilted a little and of its own
// brightness, as tiling colour / normal / roughness maps (64 × 64 flakes per tile).
function flakeTextures(size = 256) {
  let seed = 4711;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const cells = 64, cs = size / cells;
  const cell = [];
  for (let k = 0; k < cells * cells; k++) {
    const t = rnd() * TAU, tilt = 0.12 + 0.38 * Math.pow(rnd(), 1.5);
    cell.push({ nx: Math.cos(t) * tilt, ny: Math.sin(t) * tilt, b: rnd(), r: rnd(), jx: rnd(), jy: rnd() });
  }
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cc = mk(), cn = mk(), cr = mk();
  const gc = cc.getContext('2d'), gn = cn.getContext('2d'), gr = cr.getContext('2d');
  const ic = gc.createImageData(size, size), inn = gn.createImageData(size, size), ir = gr.createImageData(size, size);
  const dark = [0x8e, 0x71, 0x40], light = [0xe9, 0xd3, 0xa0]; // spec #987439 … #f0d9a9, a touch less yellow
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // jittered cells (Voronoi on a wrapped grid) so the flakes are not square
      const gx = Math.floor(x / cs), gy = Math.floor(y / cs);
      let best = 1e9, bc = null;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const cxi = (gx + ox + cells) % cells, cyi = (gy + oy + cells) % cells;
          const c = cell[cyi * cells + cxi];
          const px = (gx + ox + 0.15 + 0.7 * c.jx) * cs, py = (gy + oy + 0.15 + 0.7 * c.jy) * cs;
          const d = (px - x - 0.5) ** 2 + (py - y - 0.5) ** 2;
          if (d < best) { best = d; bc = c; }
        }
      }
      const o = (y * size + x) * 4;
      const b = Math.pow(bc.b, 2.2); // mostly mid gold, a few bright flakes
      for (let k = 0; k < 3; k++) ic.data[o + k] = dark[k] + (light[k] - dark[k]) * b;
      ic.data[o + 3] = 255;
      const l = Math.hypot(bc.nx, bc.ny, 1);
      inn.data[o] = (bc.nx / l * 0.5 + 0.5) * 255;
      inn.data[o + 1] = (bc.ny / l * 0.5 + 0.5) * 255;
      inn.data[o + 2] = (1 / l * 0.5 + 0.5) * 255;
      inn.data[o + 3] = 255;
      ir.data[o] = ir.data[o + 1] = ir.data[o + 2] = (0.3 + 0.5 * bc.r) * 255;
      ir.data[o + 3] = 255;
    }
  }
  gc.putImageData(ic, 0, 0); gn.putImageData(inn, 0, 0); gr.putImageData(ir, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { map: tex(cc, true), normalMap: tex(cn, false), roughnessMap: tex(cr, false) };
}

// ------------------------------------------------------------------ geometry helpers
const circleLoop = (r, n, cx = 0, cy = 0, a0 = 0) => {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
};

// Stadium slot k cut through the dial (dial frame, counter-clockwise), with the wall
// normals pointing into the slot. Arcs follow the track; the ends are semicircles.
function slotLoop(sl, k, segArc, segEnd) {
  const rIn = sl.r[0], rOut = sl.r[1], rMid = (rIn + rOut) / 2, e = sl.endRadius;
  const phiC = (90 - sl.clockDegOf(k)) * DEG;
  const as = (sl.angularDeg / 2) * DEG - e / rMid; // half-angle of the parallel part
  const pts = [], nor = [];
  const push = (x, y, nx, ny) => { pts.push([x, y]); nor.push([nx, ny]); };
  for (let i = 0; i <= segArc; i++) { const p = phiC - as + (2 * as * i) / segArc; push(rOut * Math.cos(p), rOut * Math.sin(p), -Math.cos(p), -Math.sin(p)); }
  const cap = (phi, t0) => {
    const cx = rMid * Math.cos(phi), cy = rMid * Math.sin(phi);
    for (let i = 1; i < segEnd; i++) { const t = phi + t0 + (Math.PI * i) / segEnd; push(cx + e * Math.cos(t), cy + e * Math.sin(t), -Math.cos(t), -Math.sin(t)); }
  };
  cap(phiC + as, 0);
  for (let i = 0; i <= segArc; i++) { const p = phiC + as - (2 * as * i) / segArc; push(rIn * Math.cos(p), rIn * Math.sin(p), Math.cos(p), Math.sin(p)); }
  cap(phiC - as, Math.PI);
  return { pts, nor };
}

// Vertical wall along a closed loop between z0 and z1, smooth normals given per vertex;
// triangles are wound to face their normals. Appends to the position / normal arrays.
function pushWall(pos, nrm, pts, nor, z0, z1) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [ax, ay] = pts[i], [bx, by] = pts[j];
    const [anx, any] = nor[i], [bnx, bny] = nor[j];
    // geometric normal of (a0, b0, b1) is to the right of a → b; flip if the wall faces left
    const right = (by - ay) * (anx + bnx) - (bx - ax) * (any + bny) >= 0;
    const A0 = [ax, ay, z0], B0 = [bx, by, z0], B1 = [bx, by, z1], A1 = [ax, ay, z1];
    const NA = [anx, any, 0], NB = [bnx, bny, 0];
    const tri = right ? [[A0, NA], [B0, NB], [B1, NB], [A0, NA], [B1, NB], [A1, NA]] : [[A0, NA], [B1, NB], [B0, NB], [A0, NA], [A1, NA], [B1, NB]];
    for (const [p, q] of tri) { pos.push(...p); nrm.push(...q); }
  }
}

// Flat face from a ShapeGeometry at height z, facing up (+1) or down (−1).
function flatFace(shape, z, facing) {
  const g = new THREE.ShapeGeometry(shape, 1);
  if (facing < 0) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setZ(i, -1);
  }
  g.translate(0, 0, z);
  return g;
}

function bufferGeo(pos, nrm, uvFn) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  if (uvFn) {
    const uv = new Float32Array((pos.length / 3) * 2);
    for (let i = 0; i < pos.length / 3; i++) { const [u, v] = uvFn(pos[3 * i], pos[3 * i + 1]); uv[2 * i] = u; uv[2 * i + 1] = v; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  g.computeBoundingSphere();
  return g;
}

function setUV(g, fn, name = 'uv') {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const [u, v] = fn(p.getX(i), p.getY(i)); uv[2 * i] = u; uv[2 * i + 1] = v; }
  g.setAttribute(name, new THREE.BufferAttribute(uv, 2));
  return g;
}

const ordinal = (n) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
};

// ------------------------------------------------------------------ slot occlusion patch
// The ring under the dial is lit only through the slots. A fragment of the ring (in the
// ring's own frame) is turned back into the dial frame with the ring's current angle; its
// signed distance to the nearest slot gives how deep it sits beside a wall: light grey in
// the middle of a slot, darker at the wall foot, dark under the dial. `amount` fades the
// effect out when the dial is lifted off (explode) or see-through (X-ray).
function makeSlotOcclusion(spec) {
  const sl = spec.dial.dateSlots;
  const rMid = (sl.r[0] + sl.r[1]) / 2, e = sl.endRadius;
  const half = rMid * ((sl.angularDeg / 2) * DEG) - e; // arc half-length of the parallel part
  const step = (360 / sl.count) * DEG;
  const f = (v) => v.toFixed(6);
  const uniforms = { uSlotRot: { value: 0 }, uSlotAO: { value: 1 } };
  const defs = `#define SLOT_STEP ${f(step)}\n#define SLOT_RMID ${f(rMid)}\n#define SLOT_HALF ${f(half)}\n#define SLOT_E ${f(e)}\n`
    + `#define SLOT_AO_WALL ${f(SLOT_AO.wall)}\n#define SLOT_AO_MID ${f(SLOT_AO.mid)}\n#define SLOT_AO_UNDER ${f(SLOT_AO.under)}\n#define SLOT_AO_DIRECT ${f(SLOT_AO.directShare)}\n`;
  const key = `slotAO147|${defs}`;
  const patch = (shader) => {
    shader.uniforms.uSlotRot = uniforms.uSlotRot;
    shader.uniforms.uSlotAO = uniforms.uSlotAO;
    shader.vertexShader = `varying vec2 vSlotXY;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n\tvSlotXY = transformed.xy;');
    shader.fragmentShader = `${defs}uniform float uSlotRot;\nuniform float uSlotAO;\nvarying vec2 vSlotXY;
float slotOcclusion() {
  float c = cos(uSlotRot), s = sin(uSlotRot);
  vec2 p = vec2(c * vSlotXY.x - s * vSlotXY.y, s * vSlotXY.x + c * vSlotXY.y);
  float clockA = atan(p.x, p.y);
  float k = floor(clockA / SLOT_STEP);
  float sArc = (clockA - (k + 0.5) * SLOT_STEP) * SLOT_RMID;
  float d = length(vec2(max(abs(sArc) - SLOT_HALF, 0.0), length(p) - SLOT_RMID)) - SLOT_E;
  float inside = mix(SLOT_AO_WALL, SLOT_AO_MID, smoothstep(0.0, SLOT_E * 0.9, -d));
  float under = mix(SLOT_AO_WALL, SLOT_AO_UNDER, smoothstep(0.0, 0.2, d));
  return d < 0.0 ? inside : under;
}
${shader.fragmentShader}`.replace('#include <aomap_fragment>', `#include <aomap_fragment>
	{
		float slotAO = mix(1.0, slotOcclusion(), uSlotAO);
		reflectedLight.indirectDiffuse *= slotAO;
		reflectedLight.indirectSpecular *= slotAO;
		float slotDirect = mix(1.0, slotAO, SLOT_AO_DIRECT);
		reflectedLight.directDiffuse *= slotDirect;
		reflectedLight.directSpecular *= slotDirect;
	}`);
  };
  // A material class whose clones (X-ray / highlight copies) keep the patch.
  class SlotLitMaterial extends THREE.MeshPhysicalMaterial {
    constructor(params) {
      super(params);
      this.onBeforeCompile = patch;
      this.customProgramCacheKey = () => key;
    }
  }
  return { uniforms, Material: SlotLitMaterial };
}

// ------------------------------------------------------------------ builder
export function buildDial(ctx) {
  const { spec, M, reg, root, stage } = ctx;
  const D = spec.dial, Z = spec.z;
  const R = D.radius;
  const [zb, zt] = Z.dial;
  const sub = D.subdial;
  const [scx, scy] = sub.center;
  const zf = Z.subdialFloor;
  const lite = !!ctx.lite;
  const caps = stage?.renderer?.capabilities;
  const N = Math.min(lite ? 2048 : 4096, caps?.maxTextureSize || 4096);
  const maxAniso = Math.min(16, caps?.getMaxAnisotropy?.() || 8);
  const SEG = lite ? 0.5 : 1;
  const env = stage?.scene?.environment || null;

  // ---------------------------------------------------------------- print
  const canvas = document.createElement('canvas');
  paintDial(canvas, N, spec);
  const printTex = new THREE.CanvasTexture(canvas);
  printTex.colorSpace = THREE.SRGBColorSpace;
  printTex.anisotropy = maxAniso;
  const printTexSub = printTex.clone(); // the same image read through the subdial's uv1
  printTexSub.channel = 1;

  // ---------------------------------------------------------------- materials
  const dialColour = new THREE.Color(DIAL_FINISH.albedo);
  const grainRepeat = (2 * R) / DIAL_FINISH.grainTileMM;
  const grainN = M.dialBase.normalMap?.clone();
  const grainR = M.dialBase.roughnessMap?.clone();
  if (grainN) grainN.repeat.set(grainRepeat, grainRepeat);
  if (grainR) grainR.repeat.set(grainRepeat, grainRepeat);
  const faceMat = M.dialBase.clone();
  faceMat.color.copy(dialColour);
  faceMat.map = printTex;
  // the ink must not pick up the plating's sheen or glare, or the print greys out at an angle
  faceMat.sheenColorMap = printTex;
  faceMat.specularColorMap = printTex;
  faceMat.normalMap = grainN || null;
  faceMat.roughnessMap = grainR || null;
  faceMat.roughness = 0.85; // × roughnessMap ≈ 0.48 → frosted ≈ 0.4
  faceMat.envMap = env;
  faceMat.envMapIntensity = DIAL_FINISH.envMapIntensity;
  faceMat.name = 'dialFace';

  // the cut edges of the slots are plated too (white, a little smoother than the face)
  const wallMat = M.dialBase.clone();
  wallMat.color.set(0xe3e2de);
  wallMat.normalMap = null;
  wallMat.roughnessMap = null;
  wallMat.roughness = 0.38;
  wallMat.envMap = env;
  wallMat.envMapIntensity = DIAL_FINISH.envMapIntensity;
  wallMat.name = 'dialWall';

  // bare brass blank underneath, subdued so it never glows through gaps
  const backMat = M.brass.clone();
  backMat.roughness = 0.55;
  backMat.color.set(0xb89a62);
  backMat.envMap = env;
  backMat.envMapIntensity = 0.85;
  backMat.name = 'dialBack';

  // ---------------------------------------------------------------- dial plate
  const sl = D.dateSlots;
  const slots = [];
  for (let k = 0; k < sl.count; k++) slots.push(slotLoop(sl, k, Math.round(12 * SEG + 2), Math.round(16 * SEG + 4)));
  const stepHalf = STEP_SOFT * (zt - zf);
  const rFloor = sub.recessRadius - stepHalf, rOpen = sub.recessRadius + stepHalf;
  const nRim = Math.round(256 * SEG), nSub = Math.round(192 * SEG), nHole = Math.round(48 * SEG);
  const V2 = (p) => new THREE.Vector2(p[0], p[1]);
  const makeShape = (subR) => {
    const shape = new THREE.Shape(circleLoop(R, nRim).map(V2));
    shape.holes.push(new THREE.Path(circleLoop(D.centreHoleRadius, nHole).map(V2)));
    shape.holes.push(new THREE.Path(circleLoop(subR, nSub, scx, scy).map(V2)));
    for (const s of slots) shape.holes.push(new THREE.Path(s.pts.map(V2)));
    return shape;
  };
  const dialUV = (x, y) => [x / (2 * R) + 0.5, y / (2 * R) + 0.5];
  const topGeo = setUV(flatFace(makeShape(rOpen), zt, 1), dialUV);

  // walls: the 31 slots (+ the rim and centre hole when not lite)
  const wp = [], wn = [];
  for (const s of slots) pushWall(wp, wn, s.pts, s.nor, zb, zt);
  if (!lite) {
    pushWall(wp, wn, circleLoop(R, nRim), circleLoop(1, nRim), zb, zt);
    pushWall(wp, wn, circleLoop(D.centreHoleRadius, nHole), circleLoop(1, nHole).map(([x, y]) => [-x, -y]), zb, zt);
  }
  const wallGeo = bufferGeo(wp, wn, dialUV);

  const dialObj = new THREE.Group();
  dialObj.name = 'dial';
  const addMesh = (parent, geo, mat, name, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  addMesh(dialObj, topGeo, faceMat, 'dial-face');
  addMesh(dialObj, wallGeo, wallMat, 'dial-slot-walls');
  if (!lite) addMesh(dialObj, setUV(flatFace(makeShape(rFloor), zb, -1), dialUV), backMat, 'dial-back');
  root.add(dialObj);

  // ---------------------------------------------------------------- "neomatik" in gold
  {
    const m = D.model;
    const pad = 0.12;
    const box = [m.letters[0][0] - pad, m.baselineY - pad, m.letters[m.letters.length - 1][1] + pad, m.baselineY + NEO.iDotTop + pad];
    const mask = document.createElement('canvas');
    paintNeomatik(mask, lite ? 220 : 440, D, box);
    const alphaMap = new THREE.CanvasTexture(mask);
    alphaMap.colorSpace = THREE.NoColorSpace;
    alphaMap.anisotropy = maxAniso;
    const flakes = flakeTextures(lite ? 128 : 256);
    const tileMM = lite ? 2.56 : 1.28; // 64 flakes per tile → flakes ≈ 0.02 mm (0.04 lite)
    const rx = (box[2] - box[0]) / tileMM, ry = (box[3] - box[1]) / tileMM;
    for (const t of [flakes.map, flakes.normalMap, flakes.roughnessMap]) t.repeat.set(rx, ry);
    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, // the flake map carries the gold (#987439 … #f0d9a9, mean ≈ spec colour)
      map: flakes.map, alphaMap, transparent: true, depthWrite: false,
      metalness: 0.75, roughness: 1.0, roughnessMap: flakes.roughnessMap,
      normalMap: flakes.normalMap, normalScale: new THREE.Vector2(1, 1),
      envMap: env, envMapIntensity: 0.9,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    gold.name = 'dialGoldPrint';
    const plane = new THREE.PlaneGeometry(box[2] - box[0], box[3] - box[1]);
    plane.translate((box[0] + box[2]) / 2, (box[1] + box[3]) / 2, zt + NEO.relief);
    const neo = addMesh(dialObj, plane, gold, 'dial-neomatik', false);
    neo.renderOrder = 1;
  }

  // ---------------------------------------------------------------- small seconds
  const subObj = new THREE.Group();
  subObj.name = 'small-seconds';
  subObj.position.set(scx, scy, 0);
  {
    const subR = rFloor + 0.2; // groove texture half-size
    const groove = grooveTextures(subR, sub.snailPitch, lite ? 1024 : 2048);
    const subMat = M.dialBase.clone();
    subMat.color.set(SUBDIAL_FINISH.albedo);
    subMat.map = printTexSub;
    subMat.sheenColorMap = printTexSub;
    subMat.specularColorMap = printTexSub;
    subMat.roughnessMap = null;
    subMat.roughness = SUBDIAL_FINISH.roughness;
    subMat.normalMap = groove.normalMap;
    subMat.normalScale = new THREE.Vector2(1, 1);
    subMat.anisotropy = SUBDIAL_FINISH.anisotropy;
    subMat.anisotropyMap = groove.anisotropyMap;
    subMat.aoMap = groove.aoMap;
    subMat.aoMapIntensity = GROOVE.aoIntensity;
    subMat.envMap = env;
    subMat.envMapIntensity = SUBDIAL_FINISH.envMapIntensity;
    subMat.name = 'subdialFloor';

    const hole = 0.3; // seconds-arbor hole (covered by the hand's hub)
    const floorShape = new THREE.Shape(circleLoop(rFloor, nSub).map(V2));
    floorShape.holes.push(new THREE.Path(circleLoop(hole, 32).map(V2)));
    const floorGeo = flatFace(floorShape, zf, 1);
    setUV(floorGeo, (x, y) => [x / (2 * subR) + 0.5, y / (2 * subR) + 0.5]);
    setUV(floorGeo, (x, y) => dialUV(x + scx, y + scy), 'uv1');
    addMesh(subObj, floorGeo, subMat, 'small-seconds-floor');

    // the soft stamped step: smoothstep profile from the floor (rFloor, zf) up to the
    // dial face (rOpen, zt), steepest (45°) in the middle; it wears the dial's finish
    const rows = lite ? 6 : 10, n = nSub;
    const pos = [], nrm = [], idx = [];
    for (let j = 0; j <= rows; j++) {
      const t = j / rows, r = rFloor + (rOpen - rFloor) * t;
      const zz = zf + (zt - zf) * t * t * (3 - 2 * t);
      const dz = ((zt - zf) * 6 * t * (1 - t)) / (rOpen - rFloor); // dz/dr
      const l = Math.hypot(dz, 1);
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
        pos.push(r * c, r * s, zz);
        nrm.push((-dz * c) / l, (-dz * s) / l, 1 / l);
      }
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
        idx.push(a, d, b, a, c, d); // counter-clockwise seen from above
      }
    }
    const stepGeo = new THREE.BufferGeometry();
    stepGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    stepGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    stepGeo.setIndex(idx);
    setUV(stepGeo, (x, y) => dialUV(x + scx, y + scy));
    addMesh(subObj, stepGeo, faceMat, 'small-seconds-step');

    if (!lite) {
      const bottom = new THREE.Shape(circleLoop(rFloor, nSub).map(V2));
      bottom.holes.push(new THREE.Path(circleLoop(hole, 32).map(V2)));
      addMesh(subObj, setUV(flatFace(bottom, zb, -1), (x, y) => dialUV(x + scx, y + scy)), backMat, 'small-seconds-back');
      const hp = [], hn = [];
      pushWall(hp, hn, circleLoop(hole, 32), circleLoop(1, 32).map(([x, y]) => [-x, -y]), zb, zf);
      addMesh(subObj, bufferGeo(hp, hn), wallMat, 'small-seconds-hole');
    }
  }
  root.add(subObj);

  // ---------------------------------------------------------------- dial feet
  const DF = D.feet;
  const feetPos = DF.clockDeg.map((deg) => [DF.r * Math.sin(deg * DEG), DF.r * Math.cos(deg * DEG)]);
  const feetObj = new THREE.Group();
  feetObj.name = 'dial-feet';
  {
    const fr = DF.radius, fz = Z.dialFeet[0];
    const prof = [[0.0001, fz], [fr - 0.06, fz], [fr, fz + 0.06], [fr, zb - 0.06], [fr + 0.08, zb - 0.02], [fr + 0.08, zb]].map(([r, z]) => new THREE.Vector2(r, z));
    const pos = [];
    for (const [x, y] of feetPos) {
      const gg = new THREE.LatheGeometry(prof, lite ? 12 : 32).toNonIndexed();
      gg.rotateX(Math.PI / 2);
      gg.translate(x, y, 0);
      pos.push(gg);
    }
    const merged = new THREE.BufferGeometry();
    const P = [], Nn = [];
    for (const gg of pos) { P.push(...gg.attributes.position.array); Nn.push(...gg.attributes.normal.array); }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    addMesh(feetObj, merged, M.brass, 'dial-feet');
  }
  root.add(feetObj);

  // ---------------------------------------------------------------- the date ring
  const RG = spec.date.ring, MK = spec.date.markers;
  const [zr0, zr1] = Z.dateRing;
  const occl = makeSlotOcclusion(spec);
  const ringObj = new THREE.Group();
  ringObj.name = 'date-ring';
  const ringRotor = new THREE.Group();
  ringObj.add(ringRotor);
  root.add(ringObj);
  const ringFaceMat = new occl.Material({
    color: new THREE.Color(RING_FINISH.albedo), metalness: 0, roughness: RING_FINISH.roughness,
    envMap: env, envMapIntensity: RING_FINISH.envMapIntensity, sheen: 0.25, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff),
  });
  ringFaceMat.name = 'dateRingFace';
  const markerMat = new occl.Material({
    color: new THREE.Color(MK.colour), metalness: 0, roughness: RING_FINISH.markerRoughness,
    envMap: env, envMapIntensity: RING_FINISH.envMapIntensity,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  markerMat.name = 'dateRingMarker';
  const ringMetalMat = M.rhodium.clone();
  ringMetalMat.color.set(0xd6d7d9);
  ringMetalMat.roughness = 0.32;
  ringMetalMat.name = 'dateRingTeeth';
  {
    const nR = Math.round(384 * SEG);
    // white face r faceInner…outer at the top, plus its outer edge
    const faceShape = new THREE.Shape(circleLoop(RG.outerRadius, nR).map(V2));
    faceShape.holes.push(new THREE.Path(circleLoop(RG.faceInnerRadius, nR).map(V2)));
    addMesh(ringRotor, flatFace(faceShape, zr1, 1), ringFaceMat, 'date-ring-face');
    if (!lite) {
      const op = [], on = [];
      pushWall(op, on, circleLoop(RG.outerRadius, nR), circleLoop(1, nR), zr0, zr1);
      addMesh(ringRotor, bufferGeo(op, on), ringFaceMat, 'date-ring-edge');

      // castellated inner band: tooth j centred at LOCAL clock j·Δ, half a pitch wide
      const step = 360 / RG.teeth, halfW = (step * RG.toothWidthFrac) / 2;
      const rt = RG.toothTipRadius, rr = RG.faceInnerRadius;
      const P = (r, clock) => [r * Math.sin(clock * DEG), r * Math.cos(clock * DEG)];
      const castle = []; // increasing clock angle (clockwise)
      const nTip = 6, nGap = 6;
      for (let j = 0; j < RG.teeth; j++) {
        const c = j * step;
        for (let i = 0; i <= nTip; i++) castle.push({ p: P(rt, c - halfW + (2 * halfW * i) / nTip), kind: 'tip', c: c - halfW + (2 * halfW * i) / nTip });
        for (let i = 0; i <= nGap; i++) castle.push({ p: P(rr, c + halfW + ((step - 2 * halfW) * i) / nGap), kind: 'root', c: c + halfW + ((step - 2 * halfW) * i) / nGap });
      }
      // inner wall: radial normals on the arcs, flat normals on the flanks
      const tp = [], tn = [];
      const quad = (a, b, na, nb) => {
        const A0 = [a[0], a[1], zr0], B0 = [b[0], b[1], zr0], B1 = [b[0], b[1], zr1], A1 = [a[0], a[1], zr1];
        const right = (b[1] - a[1]) * (na[0] + nb[0]) - (b[0] - a[0]) * (na[1] + nb[1]) >= 0;
        const tri = right ? [[A0, na], [B0, nb], [B1, nb], [A0, na], [B1, nb], [A1, na]] : [[A0, na], [B1, nb], [B0, nb], [A0, na], [A1, na], [B1, nb]];
        for (const [p, q] of tri) { tp.push(...p); tn.push(q[0], q[1], 0); }
      };
      const inward = (c) => [-Math.sin(c * DEG), -Math.cos(c * DEG)];
      for (let i = 0; i < castle.length; i++) {
        const a = castle[i], b = castle[(i + 1) % castle.length];
        if (a.kind === b.kind) quad(a.p, b.p, inward(a.c), inward(b.c));
        else {
          // a flank at clock a.c: tip → root is a leading flank (faces +clock), root → tip trailing
          const sgn = a.kind === 'tip' ? 1 : -1;
          const nf = [sgn * Math.cos(a.c * DEG), -sgn * Math.sin(a.c * DEG)];
          quad(a.p, b.p, nf, nf);
        }
      }
      // tooth tops (bare metal) between the castle and the face's inner edge
      for (let j = 0; j < RG.teeth; j++) {
        const c = j * step;
        for (let i = 0; i < nTip; i++) {
          const c0 = c - halfW + (2 * halfW * i) / nTip, c1 = c - halfW + (2 * halfW * (i + 1)) / nTip;
          const a0 = P(rt, c0), a1 = P(rt, c1), b0 = P(rr, c0), b1 = P(rr, c1);
          // counter-clockwise seen from above (clock angle runs clockwise)
          for (const p of [a0, a1, b1, a0, b1, b0]) { tp.push(p[0], p[1], zr1); tn.push(0, 0, 1); }
        }
      }
      addMesh(ringRotor, bufferGeo(tp, tn), ringMetalMat, 'date-ring-teeth');
      // underside: the whole toothed annulus, bare metal (it rides on five rubies)
      const under = new THREE.Shape(circleLoop(RG.outerRadius, nR).map(V2));
      under.holes.push(new THREE.Path(castle.map((q) => V2(q.p))));
      addMesh(ringRotor, flatFace(under, zr0, -1), ringMetalMat, 'date-ring-underside');
    }
    // the two red markers printed on the face (ring-local clock ½Δ and 1½Δ)
    const mp = [], mn = [];
    const nm = lite ? 10 : 20;
    for (const cc of MK.localClockDeg) {
      for (let i = 0; i < nm; i++) {
        const c0 = cc - MK.spanDeg / 2 + (MK.spanDeg * i) / nm, c1 = cc - MK.spanDeg / 2 + (MK.spanDeg * (i + 1)) / nm;
        const Pm = (r, c) => [r * Math.sin(c * DEG), r * Math.cos(c * DEG), zr1 + RING_FINISH.markerLift];
        const a0 = Pm(MK.r[0], c0), a1 = Pm(MK.r[0], c1), b0 = Pm(MK.r[1], c0), b1 = Pm(MK.r[1], c1);
        for (const p of [a0, a1, b1, a0, b1, b0]) { mp.push(...p); mn.push(0, 0, 1); }
      }
    }
    addMesh(ringRotor, bufferGeo(mp, mn), markerMat, 'date-ring-markers', false);
  }

  // ---------------------------------------------------------------- registry
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const step = spec.date.stepDeg;
  reg.add({
    id: 'dial', name: 'Dial', category: 'dial', side: 'front', object: dialObj,
    exposed: true, xray: true, priority: 1,
    explode: ex('dial'), explodeDelay: spec.explodeDelay('dial'),
    anchor: [6.0, -5.2, zt],
    description: 'The face of the watch: a thin brass disc, galvanised and silver-plated white, with every marking pad-printed in black and "neomatik" in glittering gold. Around its edge the dates 1–31 are printed with 31 slots cut between them, through which the date ring underneath shows.',
    facts: {
      Finish: 'Galvanised, white silver-plated',
      Diameter: `${(2 * R).toFixed(1)} mm (${(2 * D.visibleRadius).toFixed(1)} mm visible)`,
      Thickness: `${(zt - zb).toFixed(2)} mm (estimate)`,
      'Hour markers': 'Numerals 12, 2, 4, 8, 10 and batons',
      'Date track': '1–31 printed; 9–22 upside down',
      Slots: `${sl.count}, cut through (${(sl.r[1] - sl.r[0]).toFixed(2)} × ${((sl.angularDeg * DEG) * (sl.r[0] + sl.r[1]) / 2).toFixed(2)} mm)`,
    },
  });
  reg.add({
    id: 'small-seconds', name: 'Small seconds', category: 'dial', side: 'front', object: subObj,
    exposed: true, xray: true, priority: 2,
    explode: ex('small-seconds'), explodeDelay: spec.explodeDelay('small-seconds'),
    anchor: [-3.2, 2.3, zf],
    description: 'A shallow recess in the dial at 6 o\'clock for the running seconds, read by a hand on the fourth-wheel arbor. Its floor is turned with fine concentric grooves, so it catches the light in rings, unlike the frosted main dial.',
    facts: {
      Diameter: `${(2 * sub.recessRadius).toFixed(1)} mm`,
      Recess: `${(zt - zf).toFixed(2)} mm deep, soft stamped step`,
      Finish: `Concentric grooves, ~${sub.snailPitch.toFixed(2)} mm pitch`,
      Ticks: `${sub.ticks.count}, all equal, no numerals`,
      Centre: `${Math.abs(scy).toFixed(2)} mm below the dial centre`,
    },
  });
  reg.add({
    id: 'dial-feet', name: 'Dial feet', category: 'dial', side: 'front', object: feetObj,
    exposed: false, xray: false, priority: 3,
    explode: ex('dial-feet'), explodeDelay: spec.explodeDelay('dial-feet'),
    anchor: [feetPos[0][0], feetPos[0][1], -0.3],
    description: 'Two brass pins on the back of the dial that locate it in holes in the main plate, so the dial can neither turn nor shift; the printed date track must stay exactly over the ring.',
    facts: { Count: `${feetPos.length}`, Diameter: `${(2 * DF.radius).toFixed(2)} mm`, Material: 'Brass', Length: `${(zb - Z.dialFeet[0]).toFixed(2)} mm` },
  });
  const ringAnchorC = 4.5 * step * DEG; // a slot near 1:30 seen from the front
  reg.add({
    id: 'date-ring', name: 'Date ring', category: 'dial', side: 'front', object: ringObj, rotor: ringRotor,
    drive: { key: 'date' },
    exposed: true, xray: false, priority: 1,
    explode: ex('date-ring'), explodeDelay: spec.explodeDelay('date-ring'),
    anchor: [16.54 * Math.sin(ringAnchorC), 16.54 * Math.cos(ringAnchorC), zr1],
    description: 'The Update\'s date: a thin white ring around the movement, under the dial. Two red marks printed on it show through the slots either side of today\'s date; around midnight the switching wheel drags it on by one of its 31 inner teeth, so the marks creep to the next date over about half an hour.',
    facts: {
      Diameter: `${(2 * RG.outerRadius).toFixed(1)} mm`,
      Teeth: `${RG.teeth}, inside, castellated`,
      Step: `${step.toFixed(2)}° per day`,
      Change: 'Creeps 23:45 → 00:15',
      Markers: 'Two, red, either side of the date',
      Thickness: `${(zr1 - zr0).toFixed(2)} mm (estimate)`,
    },
    live: (s) => {
      const p = s.datePos ?? 0;
      const f = p - Math.floor(p);
      const from = (Math.floor(p) % 31) + 1;
      if (f > 1e-4) return `changing ${ordinal(from)} → ${ordinal((from % 31) + 1)} · ${Math.round(f * 100)} %`;
      return `${ordinal(from)} · next change 23:45–00:15`;
    },
    update: () => {
      // follow the ring's angle; fade the slot occlusion once the dial lifts off or goes
      // see-through
      occl.uniforms.uSlotRot.value = ringRotor.rotation.z;
      const gap = dialObj.position.z - ringObj.position.z;
      let a = gap <= 0.02 ? 1 : Math.max(0, 1 - gap / 0.6);
      if (reg.xray || !dialObj.visible) a = 0;
      occl.uniforms.uSlotAO.value = a;
    },
  });
}
