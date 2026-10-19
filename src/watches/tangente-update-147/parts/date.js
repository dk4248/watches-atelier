// DATE WORKS and DIAL-SIDE BRIDGES of the DUW 6101 (all under the dial).
//
// Drive: the hour wheel (train module) turns a steel star 18 on the date-drive wheel (gilt
// 24, blued screw, 4 turns a day) → steel idler 14 → steel idler 16 with its 8-leaf pinion
// → carrier 48 of the switching wheel ("Datumschaltrad", 1 turn a day, clockwise). The
// switching wheel carries the gilt program wheel 30 and a hooked click that pivots on it
// and rides on a fixed teardrop cam (on the square stud). Around midnight the click swings
// out, catches the trailing flank of one of the date ring's 31 internal teeth and drags the
// ring on by one date between 23:45 and 00:15 (the engine's drag window), then folds back;
// during the day it is re-cocked while it points inward. The ring jumper's V-beak sits in a
// tooth gap and is lifted over one tooth during the change. The date corrector (5-arm star
// over a 24-tooth wheel, plus its 14-tooth idler) only works in crown position 2: static.
//
// The click and jumper are contact-exact: at build time their poses are solved against the
// ring's real tooth geometry (spec.date.ring) and stored in small lookup tables, indexed at
// run time by frac(state.datePos) (the ring's own drag fraction) and by the switching
// wheel's angle (time of day) — never cutting a tooth, no allocations per frame.
//
// Bridges (steel, frosted tops, polished bevels): the date bridge over the switching stack
// (window onto the program wheel), the motion bridge over the hour wheel, the keyless cover
// at 1–2 o'clock and the long lower bridge at 6 o'clock with the escape and fourth lower
// jewels. Outlines from spec.date.bridges (traced on the DUW 6101 dial-side render, ±0.4).
//
// Registers: date-wheels, date-drive-wheel, date-idlers, date-jumper, date-corrector,
//   date-bridge, motion-bridge, keyless-bridge, dial-side-bridge.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bluedScrewMaterial, rubyMaterial } from './finish.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const V2 = (x, y) => new THREE.Vector2(x, y);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// ------------------------------------------------------------------ module-local constants
// Hooked click of the switching wheel (EST — NOMOS publishes only "a triangular cam
// surrounded by a pivoting click"). Its pivot pin stands on the program wheel 0.95 from the
// arbor, clear of the fixed cam (r ≤ spec camRadius); its hook tip is placed so that it
// enters the tooth band exactly at the dragged tooth's flank corner at 23:45 and leaves it
// at the corner one date later at 00:15 (solved below). Before the push it swings out over
// 10 minutes, afterwards it folds back over 10 minutes, and it is re-cocked slowly between
// 06:00 and 18:00 while it points away from the ring.
const CLICK = {
  pivotDist: 0.95, armWidth: 0.24, bossR: 0.2, tailLen: 0.5, foldMaxFromArbor: 2.0, foldMargin: 10 * DEG,
  approachSec: 600, exitSec: 600, recock: [6 * 3600, 18 * 3600], lutN: 160,
};
// Ring jumper: a V beak (120° included) whose flanks rest on the two tooth corners of a gap;
// it pivots about its screw (anchor) and lifts over one tooth during the change.
const JUMPER = { beakHalfDeg: 60, flankLen: 0.74, bladeHalfW: 0.11, bossR: 0.34, lutN: 400 };
// Corrector star: five tapered arms (SJX macro); arm 0 at this angle (EST).
const STAR = { arm0Deg: 18, hubR: 0.62, armRootHalfW: 0.3, tipHalfW: 0.04 };
const BRIDGE = { bevel: 0.03, smooth: 2 };

// ------------------------------------------------------------------ 2-D geometry
const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const clockOf = (x, y) => Math.atan2(x, y); // radians, clockwise from 12

function pointInPoly(pts, x, y) {
  let s = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s;
  }
  return s;
}

// Chaikin corner cutting on a closed polygon (rounds the traced bridge outlines).
function chaikin(pts, n) {
  let p = pts;
  for (let k = 0; k < n; k++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    p = q;
  }
  return p;
}

// Signed distances for organic lever outlines, contoured by marching squares.
const sdCircle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
function sdCapsule(a, b, ra, rb = ra) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12;
  return (x, y) => {
    let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) - (ra + (rb - ra) * t);
  };
}
function sdPolygon(pts) {
  return (x, y) => {
    let d = Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const ax = pts[j][0], ay = pts[j][1], ex = pts[i][0] - ax, ey = pts[i][1] - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
      d = Math.min(d, Math.hypot(x - ax - t * ex, y - ay - t * ey));
    }
    return pointInPoly(pts, x, y) ? -d : d;
  };
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const sUnion = (k, ...fs) => (x, y) => { let d = fs[0](x, y); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y), k); return d; };

// Largest closed loop of the zero level set (marching squares), counter-clockwise.
function contour(sdf, x0, y0, x1, y1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1;
  const f = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = sdf(x0 + i * h, y0 + j * h);
  const H = nx * ny, pt = new Map(), adj = new Map();
  const point = (id) => {
    if (pt.has(id)) return;
    if (id < H) { const i = id % nx, j = (id - i) / nx, a = f[id], b = f[id + 1]; pt.set(id, [x0 + (i + a / (a - b)) * h, y0 + j * h]); } else {
      const k = id - H, i = k % nx, j = (k - i) / nx, a = f[k], b = f[k + nx];
      pt.set(id, [x0 + i * h, y0 + (j + a / (a - b)) * h]);
    }
  };
  const link = (a, b) => {
    point(a); point(b);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b); adj.get(b).push(a);
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const v0 = f[j * nx + i], v1 = f[j * nx + i + 1], v2 = f[(j + 1) * nx + i + 1], v3 = f[(j + 1) * nx + i];
      const c = (v0 < 0 ? 1 : 0) | (v1 < 0 ? 2 : 0) | (v2 < 0 ? 4 : 0) | (v3 < 0 ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const eB = j * nx + i, eT = (j + 1) * nx + i, eL = H + j * nx + i, eR = H + j * nx + i + 1;
      const centre = (v0 + v1 + v2 + v3) / 4 < 0;
      switch (c) {
        case 1: case 14: link(eL, eB); break;
        case 2: case 13: link(eB, eR); break;
        case 3: case 12: link(eL, eR); break;
        case 4: case 11: link(eR, eT); break;
        case 6: case 9: link(eB, eT); break;
        case 7: case 8: link(eL, eT); break;
        case 5: if (centre) { link(eB, eR); link(eT, eL); } else { link(eL, eB); link(eR, eT); } break;
        case 10: if (centre) { link(eL, eB); link(eR, eT); } else { link(eB, eR); link(eT, eL); } break;
        default: break;
      }
    }
  }
  const seen = new Set();
  let best = null, bestA = 0;
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1, cur = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(pt.get(cur));
      const nb = adj.get(cur);
      const next = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur;
      cur = next;
    }
    let a = 0;
    for (let i = 0, k = loop.length - 1; i < loop.length; k = i++) a += (loop[k][0] - loop[i][0]) * (loop[k][1] + loop[i][1]);
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = a < 0 ? loop.reverse() : loop; }
  }
  return simplify(best || [], h * 0.08);
}
function simplify(pts, tol) { // Ramer–Douglas–Peucker on a closed loop
  const n = pts.length;
  if (n < 8) return pts;
  const keep = new Uint8Array(n);
  let far = 0, bd = 0;
  for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > bd) { bd = d; far = i; } }
  keep[0] = keep[far] = 1;
  const st = [[0, far], [far, n]];
  while (st.length) {
    const [a, b] = st.pop();
    if (b - a < 2) continue;
    const A = pts[a], Bp = pts[b % n], dx = Bp[0] - A[0], dy = Bp[1] - A[1], l = Math.hypot(dx, dy) || 1e-9;
    let idx = -1, dm = 0;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - A[0]) * dy - (pts[i][1] - A[1]) * dx) / l; if (d > dm) { dm = d; idx = i; } }
    if (dm > tol) { keep[idx] = 1; st.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// Dense samples along a closed outline (for collision tests).
function densify(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

// ------------------------------------------------------------------ the date-ring teeth
// Ring material in the dial frame when the ring stands at datePos ≡ f (mod 1): everything
// beyond the tooth roots, and the teeth (centred at clock (j + f)·Δ, half a pitch wide)
// between tip and root radius. eps > 0 shrinks the material (lets parts touch).
function ringModel(spec) {
  const R = spec.date.ring, step = TAU / R.teeth, half = R.toothWidthFrac / 2;
  const rt = R.toothTipRadius, rr = R.faceInnerRadius;
  const inside = (x, y, f, eps = 0.002) => {
    const r = Math.hypot(x, y);
    if (r < rt + eps) return false;
    if (r > rr + eps) return true;
    const u = clockOf(x, y) / step - f;
    return Math.abs(u - Math.round(u)) < half - eps / (r * step);
  };
  // inner tooth corners near a clock angle (radians)
  const corners = (f, nearClock, span = 3) => {
    const out = [];
    const k0 = Math.round(nearClock / step - f);
    for (let k = k0 - span; k <= k0 + span; k++) {
      for (const s of [-half, half]) { const c = (k + f + s) * step; out.push([rt * Math.sin(c), rt * Math.cos(c)]); }
    }
    return out;
  };
  return { step, half, rt, rr, inside, corners };
}
// Does an outline (dense samples) placed in the dial frame hit the ring at f?
function hitsRing(ring, samples, poly, f, nearClock, eps = 0.002) {
  for (const p of samples) if (ring.inside(p[0], p[1], f, eps)) return true;
  for (const c of ring.corners(f, nearClock)) if (pointInPoly(poly, c[0], c[1])) return true;
  return false;
}

// ------------------------------------------------------------------ click mechanics
// Solved once per build. Frames: dial frame (x, y); wheel frame = dial frame turned by the
// switching wheel's angle θ (θ = state.rot.dateSwitch = 0 at local midnight, clockwise =
// negative). The click's pose is its tip direction α in the wheel frame about its pivot.
export function solveClick(spec, outline) {
  const L = spec.layout, W = L.dateSwitch;
  const ring = ringModel(spec);
  const dur = spec.dateChange?.durationSec || 1800;
  const thetaAt = (t) => (-TAU * t) / 86400; // t = seconds from local midnight (negative before)
  // the dragged tooth: its trailing flank sits nearest the hook's midnight direction halfway
  const hookClock = Math.PI / 2 - spec.date.switching.hookAngleAtMidnightDeg * DEG;
  const k = Math.round(hookClock / ring.step - ring.half);
  const flankAt = (f) => (k - ring.half + f) * ring.step; // clock angle (rad) of the trailing flank
  const corner = (f) => { const c = flankAt(f); return [ring.rt * Math.sin(c), ring.rt * Math.cos(c)]; };
  const C0 = corner(0), C1 = corner(1);
  const th0 = thetaAt(-dur / 2), th1 = thetaAt(dur / 2);
  const Qat = (phi, th) => { const v = rot2([CLICK.pivotDist * Math.cos(phi), CLICK.pivotDist * Math.sin(phi)], th); return [W[0] + v[0], W[1] + v[1]]; };
  // pivot angle φ (wheel frame): the tip circle passes through C0 at 23:45 and C1 at 00:15
  const g = (phi) => Math.hypot(...[0, 1].map((i) => Qat(phi, th0)[i] - C0[i])) - Math.hypot(...[0, 1].map((i) => Qat(phi, th1)[i] - C1[i]));
  const out = Math.atan2(W[1], W[0]); // outward through the arbor
  let phi = null, bestD = Infinity;
  const N = 720;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, b = ((i + 1) / N) * TAU;
    if (g(a) * g(b) > 0) continue;
    let lo = a, hi = b;
    for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (g(lo) * g(m) <= 0) hi = m; else lo = m; }
    const r = (lo + hi) / 2;
    // the solution on the ring side (the hook bulges out through the tooth band)
    const d = Math.abs(Math.atan2(Math.sin(r - out), Math.cos(r - out)));
    if (d < bestD) { bestD = d; phi = r; }
  }
  const rho = Math.hypot(Qat(phi, th0)[0] - C0[0], Qat(phi, th0)[1] - C0[1]);
  const Ql = [CLICK.pivotDist * Math.cos(phi), CLICK.pivotDist * Math.sin(phi)];
  const shape = outline(rho);
  const dense = densify(shape, 0.01);
  const place = (alphaL, th) => { // click outline → dial frame
    const Q = Qat(phi, th);
    const a = alphaL + th;
    const ca = Math.cos(a), sa = Math.sin(a);
    const tr = (p) => [Q[0] + p[0] * ca - p[1] * sa, Q[1] + p[0] * sa + p[1] * ca];
    return { poly: shape.map(tr), samples: dense.map(tr), tip: tr([rho, 0]) };
  };
  // push: tip on the flank line (its clock angle = the flank's), contact radius free
  const lutN = CLICK.lutN, push = new Float32Array(lutN + 1);
  let prev = null;
  for (let i = 0; i <= lutN; i++) {
    const fr = i / lutN, th = thetaAt(-dur / 2 + fr * dur), Q = Qat(phi, th), c = flankAt(fr);
    // tip clock angle as a function of the absolute arm angle A; decreasing A moves it clockwise
    const tipClock = (A) => clockOf(Q[0] + rho * Math.cos(A), Q[1] + rho * Math.sin(A));
    const centre = prev ?? Math.atan2(C0[1] - Q[1], C0[0] - Q[0]);
    let lo = centre - 1.2, hi = centre + 0.6; // lo: further clockwise
    const d = (A) => Math.atan2(Math.sin(tipClock(A) - c), Math.cos(tipClock(A) - c));
    for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (d(m) > 0) lo = m; else hi = m; }
    let A = (lo + hi) / 2;
    // the hook's point leads; if any other part of it would touch the tooth first, back off
    // (counter-clockwise) to the first pose that is free: that is where it pushes
    const free = (a) => { const p = place(a - th, th); return !hitsRing(ring, p.samples, p.poly, fr, c); };
    if (!free(A)) {
      let lo2 = A, hi2 = A + 0.5;
      for (let it = 0; it < 40; it++) { const m = (lo2 + hi2) / 2; if (free(m)) hi2 = m; else lo2 = m; }
      A = hi2;
    }
    prev = A;
    push[i] = A - th; // wheel frame
  }
  // rest poses: fold the hook back over the wheel before and after the change
  const tipFromArbor = (alphaL) => { const v = [Ql[0] + rho * Math.cos(alphaL), Ql[1] + rho * Math.sin(alphaL)]; return Math.hypot(v[0], v[1]); };
  const foldFrom = (a0, dir) => { let a = a0; for (let i = 0; i < 720 && tipFromArbor(a) > CLICK.foldMaxFromArbor; i++) a += dir * 0.5 * DEG; return a + dir * CLICK.foldMargin; };
  const restBefore = foldFrom(push[0], +1); // counter-clockwise of the first contact
  const restAfter = foldFrom(push[lutN], -1); // clockwise past the last contact
  return { W, Ql, phi, rho, shape, place, push, restBefore, restAfter, dur, thetaAt, ring, k, flankAt, C0, C1, hookClock };
}

// Click pose (wheel frame) from the time of day t (seconds after midnight, 0…86400) and
// the ring's drag fraction f (frac(datePos); > 0 only while it creeps). Allocation-free.
function clickAngle(m, t, f) {
  const lutN = m.push.length - 1, half = m.dur / 2;
  if (f > 0 && f < 1) { const x = f * lutN, i = Math.min(lutN - 1, Math.floor(x)); return m.push[i] + (m.push[i + 1] - m.push[i]) * (x - i); }
  const ts = t > 43200 ? t - 86400 : t; // signed seconds from midnight
  const recockSpan = (m.restBefore - m.restAfter) % TAU;
  const back = recockSpan > 0 ? recockSpan : recockSpan + TAU; // counter-clockwise re-cock
  if (ts >= -half - CLICK.approachSec && ts < -half) return m.restBefore + (m.push[0] - m.restBefore) * smooth((ts + half + CLICK.approachSec) / CLICK.approachSec);
  if (ts >= half && ts < half + CLICK.exitSec) return m.push[lutN] + (m.restAfter - m.push[lutN]) * smooth((ts - half) / CLICK.exitSec);
  if (ts >= -half && ts < half) return ts < 0 ? m.push[0] : m.push[lutN]; // window edges with f = 0
  const tt = ts < 0 ? ts + 86400 : ts; // 00:25 … 23:35
  const [r0, r1] = CLICK.recock;
  if (tt <= r0) return m.restAfter;
  if (tt >= r1) return m.restAfter + back - TAU * Math.round((m.restAfter + back - m.restBefore) / TAU);
  return m.restAfter + back * smooth((tt - r0) / (r1 - r0));
}

// ------------------------------------------------------------------ jumper mechanics
// The jumper is a spring blade screwed down at its anchor: its beak moves (almost) straight
// in and out along its V axis while the blade flexes (cantilever weight w(s) = s²(3 − 2s)
// along the blade). delta > 0 retracts the beak towards the centre. The spring preloads the
// beak outward until its flanks rest on the two corners of a tooth gap.
const bendWeight = (A, d, len) => (x, y) => { const s = Math.max(0, Math.min(1, ((x - A[0]) * d[0] + (y - A[1]) * d[1]) / len)); return s * s * (3 - 2 * s); };
export function solveJumper(spec, outline) {
  const ring = ringModel(spec);
  const J = spec.date.jumper, A = J.anchor;
  const cb = J.beakClockDeg * DEG, ub = [Math.sin(cb), Math.cos(cb)];
  const hb = JUMPER.beakHalfDeg * DEG;
  // ideal V tip radius when both flanks lie on the gap's corners
  const rTip = ring.rt * Math.cos(ring.half * ring.step) + (ring.rt * Math.sin(ring.half * ring.step)) / Math.tan(hb);
  const tip = [rTip * ub[0], rTip * ub[1]];
  const shape = outline(A, tip, ub);
  const dense = densify(shape, 0.008);
  const len = Math.hypot(tip[0] - A[0], tip[1] - A[1]);
  const dir = [(tip[0] - A[0]) / len, (tip[1] - A[1]) / len];
  const weight = bendWeight(A, dir, len);
  const wS = shape.map((p) => weight(p[0], p[1])), wD = dense.map((p) => weight(p[0], p[1]));
  const place = (delta) => {
    const mv = (p, w) => [p[0] - w * delta * ub[0], p[1] - w * delta * ub[1]];
    return { poly: shape.map((p, i) => mv(p, wS[i])), samples: dense.map((p, i) => mv(p, wD[i])) };
  };
  const N = JUMPER.lutN, lut = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    // smallest retraction that is free (the spring keeps the beak against the teeth)
    let lo = -0.3, hi = 0.7; // lo: pressed into the root (hits), hi: fully retracted (free)
    const hits = (dl) => { const p = place(dl); return hitsRing(ring, p.samples, p.poly, f, cb, 0.004); };
    for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (hits(m)) lo = m; else hi = m; }
    lut[i] = hi;
  }
  return { A, tip, rTip, ub, dir, len, weight, shape, place, lut, ring };
}

// Click outline in its own frame: pivot at the origin, hook tip corner at (rho, 0); the
// forward (pushing) face runs along y = 0, the body lies on +y, a short tail behind the boss.
export function clickOutline(rho) {
  const w = CLICK.armWidth, u = 0.17; // the arm runs u behind the point; the point's face is undercut ≈ 30°
  const sdf = sUnion(0.06,
    sdCircle(0, 0, CLICK.bossR),
    sdCapsule([0.05, 0.06], [rho - 0.36, u + w / 2], w / 2 + 0.02, w / 2),
    sdPolygon([[rho - 0.46, u + 0.02], [rho - 0.3, u], [rho, 0], [rho - 0.02, u + 0.1], [rho - 0.2, u + w], [rho - 0.46, u + w]]),
    sdCapsule([0, 0], [-CLICK.tailLen, 0.14], 0.1, 0.075));
  return contour(sdf, -CLICK.tailLen - 0.3, -0.35, rho + 0.1, u + w + 0.3, 0.005);
}
// Jumper outline in the dial frame at rest: boss round the screw A, a slim spring blade,
// and the V beak whose tip sits at `tip` pointing along ub.
export function jumperOutline(A, tip, ub) {
  const hb = JUMPER.beakHalfDeg * DEG, fl = JUMPER.flankLen;
  const back = (a) => [tip[0] - fl * (ub[0] * Math.cos(a) - ub[1] * Math.sin(a)), tip[1] - fl * (ub[0] * Math.sin(a) + ub[1] * Math.cos(a))];
  const bl = back(hb), br = back(-hb);
  const baseC = [(bl[0] + br[0]) / 2, (bl[1] + br[1]) / 2];
  const inner = [baseC[0] - 0.22 * ub[0], baseC[1] - 0.22 * ub[1]];
  const sdf = sUnion(0.1,
    sdCircle(A[0], A[1], JUMPER.bossR),
    sdCapsule(A, inner, 0.17, JUMPER.bladeHalfW),
    sdPolygon([bl, tip, br, [inner[0] + (br[0] - baseC[0]) * 0.5, inner[1] + (br[1] - baseC[1]) * 0.5], [inner[0] + (bl[0] - baseC[0]) * 0.5, inner[1] + (bl[1] - baseC[1]) * 0.5]]));
  const xs = [A[0], tip[0], bl[0], br[0]], ys = [A[1], tip[1], bl[1], br[1]];
  return contour(sdf, Math.min(...xs) - 0.45, Math.min(...ys) - 0.45, Math.max(...xs) + 0.45, Math.max(...ys) + 0.45, 0.005);
}
export { clickAngle };

// ------------------------------------------------------------------ geometry builders
function latheZ(profile, segs) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => V2(Math.max(0, r), z)), segs);
  g.rotateX(Math.PI / 2);
  return g;
}
// discUV: centred planar UVs over radius R (circular-grain / sunburst maps)
function discUV(g, R) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getX(i) / (2 * R) + 0.5; uv[2 * i + 1] = p.getY(i) / (2 * R) + 0.5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
function plain(g) { // non-indexed, position/normal/uv only, no groups (mergeable)
  let o = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(o.attributes)) if (!['position', 'normal', 'uv'].includes(k)) o.deleteAttribute(k);
  if (!o.attributes.uv) o.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(o.attributes.position.count * 2), 2));
  o.clearGroups();
  return o;
}
// Split an Extrude geometry into caps (group 0) and sides incl. bevels (group 1).
function splitExtrude(g) {
  const out = [];
  for (const mi of [0, 1]) {
    const groups = g.groups.filter((q) => q.materialIndex === mi);
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(g.attributes)) {
      const n = groups.reduce((s, q) => s + q.count, 0), k = attr.itemSize;
      const arr = new Float32Array(n * k);
      let o = 0;
      for (const q of groups) { arr.set(attr.array.subarray(q.start * k, (q.start + q.count) * k), o); o += q.count * k; }
      part.setAttribute(name, new THREE.BufferAttribute(arr, k));
    }
    out.push(part);
  }
  return out;
}
// Prism from a closed outline (+ holes) between z0 and z1 with a small bevel round the
// outline; returns { caps, sides } geometries.
function prism(outline, holes, z0, z1, bevel = 0.02, curveSegs = 6) {
  const shape = new THREE.Shape(outline.map((p) => V2(p[0], p[1])));
  for (const h of holes || []) shape.holes.push(new THREE.Path(h.map((p) => V2(p[0], p[1]))));
  const T = z1 - z0, bt = Math.min(bevel, T * 0.3);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: T - 2 * bt, bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt, bevelSegments: 2, curveSegments: curveSegs,
  });
  g.translate(0, 0, z0 + bt);
  const [caps, sides] = splitExtrude(g);
  caps.computeVertexNormals();
  return { caps, sides };
}
const circlePts = (r, n, cx = 0, cy = 0, a0 = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(a0 + (i / n) * TAU), cy + r * Math.sin(a0 + (i / n) * TAU)]);

// Toothed wheel / pinion between z0 and z1 (local origin at the arbor), with optional
// round lightening holes and bore; centred disc UVs.
function wheelGeo(gear, { teeth, module: m, z0, z1, pinion = false, bore = 0, holes = 0, holeR = 0, holeAt = 0 }) {
  const outline = (pinion ? gear.pinionOutline({ leaves: teeth, module: m }) : gear.toothedOutline({ teeth, module: m }));
  const hp = [];
  if (bore) hp.push(gear.circlePath(bore, 32));
  for (let i = 0; i < holes; i++) { const a = (i / holes) * TAU + Math.PI / holes; hp.push(gear.circlePath(holeR, 28, holeAt * Math.cos(a), holeAt * Math.sin(a))); }
  const g = gear.extrudeOutline(outline, hp, z1 - z0);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}
// Pointed star teeth (the date-drive star): root circle, straight flanks to sharp tips.
function starGeo({ teeth, rTip, rRoot, z0, z1, bore = 0 }) {
  const pts = [];
  const p = TAU / teeth, hb = p * 0.3;
  for (let i = 0; i < teeth; i++) {
    const a = i * p;
    pts.push(V2(rRoot * Math.cos(a - hb), rRoot * Math.sin(a - hb)));
    pts.push(V2(rTip * Math.cos(a - 0.02 * p), rTip * Math.sin(a - 0.02 * p)));
    pts.push(V2(rTip * Math.cos(a + 0.02 * p), rTip * Math.sin(a + 0.02 * p)));
    pts.push(V2(rRoot * Math.cos(a + hb), rRoot * Math.sin(a + hb)));
    for (let k = 1; k < 3; k++) { const b = a + hb + ((p - 2 * hb) * k) / 3; pts.push(V2(rRoot * Math.cos(b), rRoot * Math.sin(b))); }
  }
  const shape = new THREE.Shape(pts);
  if (bore) shape.holes.push(new THREE.Path(circlePts(bore, 32).map((q) => V2(q[0], q[1]))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, z0);
  return discUV(g, rTip);
}
// Slotted screw head (local origin on its axis): cylinder to the slot floor + two
// D-shaped halves, domed slightly; top at z1. `slotDeg` = slot direction.
function screwGeo(r, z0, z1, slotW, slotD, slotDeg = 0, segs = 40) {
  const dome = Math.min(0.03, (z1 - z0) * 0.25);
  const base = latheZ([[0, z0], [r, z0], [r, z1 - slotD], [0, z1 - slotD]], segs);
  const a0 = Math.asin(Math.min(0.95, slotW / 2 / r));
  const half = [];
  for (let k = 0; k <= 20; k++) { const a = a0 + ((Math.PI - 2 * a0) * k) / 20; half.push(V2(r * Math.cos(a), r * Math.sin(a))); }
  const g1 = new THREE.ExtrudeGeometry(new THREE.Shape(half), { depth: slotD - dome, bevelEnabled: true, bevelThickness: dome, bevelSize: Math.min(0.03, r * 0.12), bevelOffset: -Math.min(0.03, r * 0.12), bevelSegments: 3, curveSegments: 4 });
  g1.translate(0, 0, z1 - slotD);
  const g2 = g1.clone().rotateZ(Math.PI);
  const g = mergeGeometries([plain(base), plain(g1), plain(g2)], false);
  g.rotateZ(slotDeg * DEG);
  g.computeVertexNormals();
  return discUV(g, r);
}

// ------------------------------------------------------------------ builder
export function buildDate(ctx) {
  const { spec, M, reg, root, gear, planarUV } = ctx;
  if (ctx.lite) return; // the watch box shows the dial side only; these parts sit under the dial
  const Z = spec.z, L = spec.layout, MD = spec.modules, DT = spec.dateTrain, TR = spec.train, SD = spec.date;
  const env = ctx.stage?.scene?.environment || null;
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const exd = (id) => spec.explodeDelay(id);

  // ---------------------------------------------------------------- materials
  const gilt = M.wheelGilt;
  const steelWheel = M.wheelRhodium.clone();
  steelWheel.color.set(0xd2d5d9);
  steelWheel.name = 'dateSteelWheel';
  const polished = M.steelPolished;
  const blued = bluedScrewMaterial(M);
  const ruby = rubyMaterial(M);
  // frosted (bead-blasted) steel bridges, polished bevels
  const frost = M.steelSatin.clone();
  frost.anisotropy = 0;
  frost.anisotropyMap = null;
  frost.color.set(0xb9bcc0);
  frost.roughness = 0.42;
  const grain = M.textures?.dialGrain?.normalMap?.clone();
  if (grain) { grain.repeat.set(1, 1); frost.normalMap = grain; frost.normalScale = new THREE.Vector2(0.18, 0.18); }
  frost.envMap = env;
  frost.envMapIntensity = 0.9;
  frost.name = 'dateBridgeFrosted';
  const satin = M.steelSatin.clone(); // cam, click, jumper: brushed steel
  satin.color.set(0xd6d8db);
  satin.roughness = 0.26;
  satin.anisotropy = 0.35;
  satin.name = 'dateLeverSteel';

  const meshOf = (geo, mat, name, parent, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  // collect geometries per material and merge them into one mesh each
  const batch = () => {
    const map = new Map();
    return {
      add(geo, mat, matrix) {
        const g = plain(geo.clone());
        if (matrix) g.applyMatrix4(matrix);
        if (!map.has(mat)) map.set(mat, []);
        map.get(mat).push(g);
      },
      build(parent, name) {
        for (const [mat, geos] of map) meshOf(mergeGeometries(geos, false), mat, `${name}-${mat.name || 'm'}`, parent);
      },
    };
  };
  const at = (x, y, z = 0, rz = 0) => new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z);

  // ---------------------------------------------------------------- mesh phases (plan §2)
  const phHW = gear.meshPhase(ang(L.minuteWheel, L.center), TR.minuteWheel.pinion, TR.hourWheel.teeth, 0);
  const phStar = gear.meshPhase(ang(L.center, L.dateDrive), TR.hourWheel.teeth, DT.driveStar.teeth, phHW);
  const phI1 = gear.meshPhase(ang(L.dateDrive, L.dateIdler1), DT.driveWheel.teeth, DT.idler1.teeth, 0);
  const phI2 = gear.meshPhase(ang(L.dateIdler1, L.dateIdler2), DT.idler1.teeth, DT.idler2.teeth, phI1);
  const phC = gear.meshPhase(ang(L.dateIdler2, L.dateSwitch), DT.idler2.pinion, DT.carrier.teeth, 0);
  const phQI = gear.meshPhase(ang(L.quickSetStar, L.quickSetIdler), DT.quickSetWheel.teeth, DT.quickSetIdler.teeth, 0);
  const tipR = (z, m) => m * (z / 2 + 1.3);

  // ================================================================ DATE-DRIVE WHEEL
  {
    const object = new THREE.Group();
    object.position.set(L.dateDrive[0], L.dateDrive[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const [w0, w1] = Z.dateDriveWheel, [s0, s1] = Z.dateDriveStar, [c0, c1] = Z.dateDriveScrew;
    const mS = MD.dateStar, zS = DT.driveStar.teeth;
    meshOf(wheelGeo(gear, { teeth: DT.driveWheel.teeth, module: MD.dateWheel, z0: w0, z1: w1, bore: 0.3 }), gilt, 'date-drive-gilt', rotor);
    const star = meshOf(starGeo({ teeth: zS, rTip: tipR(zS, mS), rRoot: mS * (zS / 2 - 1.6), z0: s0, z1: s1, bore: 0.3 }), polished, 'date-drive-star', rotor);
    star.rotation.z = phStar;
    // polished hub joining wheel and star, its collar ring round the screw
    meshOf(discUV(latheZ([[0.3, w1], [0.62, w1], [0.62, s0], [0.3, s0]], 48), 0.62), polished, 'date-drive-hub', rotor);
    meshOf(discUV(latheZ([[0.31, s1], [0.6, s1], [0.6, s1 + 0.05], [0.56, s1 + 0.07], [0.52, s1 + 0.07], [0.52, s1 + 0.02], [0.31, s1 + 0.02]], 48), 0.6), polished, 'date-drive-collar', rotor);
    // the blued shoulder screw is the arbor: it stands still while the wheel turns on it
    meshOf(screwGeo(0.48, c0, c1, 0.1, 0.045, 35), blued, 'date-drive-screw', object);
    meshOf(latheZ([[0, Z.dateRecess], [0.28, Z.dateRecess], [0.28, c0], [0, c0]], 24), polished, 'date-drive-arbor', object);
    reg.add({
      id: 'date-drive-wheel', name: 'Date-drive wheel', category: 'date', side: 'front', object, rotor,
      drive: { key: 'dateDrive' }, exposed: false, xray: false, priority: 2,
      explode: ex('date-drive-wheel'), explodeDelay: exd('date-drive-wheel'),
      anchor: [1.2, 1.2, s1],
      description: 'Takes the drive for the date off the hour wheel: its pointed steel star meshes the hour wheel and turns four times a day, and the gilt wheel underneath passes the motion on through two idlers to the switching wheel.',
      facts: {
        Speed: '1 turn / 6 h',
        Star: `${zS} pointed teeth (meshes the hour wheel ${TR.hourWheel.teeth})`,
        Wheel: `${DT.driveWheel.teeth} teeth, gilt, Ø ${(2 * tipR(DT.driveWheel.teeth, MD.dateWheel)).toFixed(2)} mm`,
        Screw: 'Tempered blue, the arbor',
        'Tooth counts': 'Estimated',
      },
    });
  }

  // ================================================================ DATE IDLERS
  const idlers = [];
  {
    const object = new THREE.Group();
    root.add(object);
    const [i0, i1] = Z.dateIdlers, [p0, p1] = Z.dateIdler2Pinion;
    const mk = (pos, teeth, ph, withPinion) => {
      const pivot = new THREE.Group();
      pivot.position.set(pos[0], pos[1], 0);
      object.add(pivot);
      const rotor = new THREE.Group();
      pivot.add(rotor);
      const w = meshOf(wheelGeo(gear, { teeth, module: MD.dateWheel, z0: i0, z1: i1, bore: 0.13 }), steelWheel, 'date-idler-wheel', rotor);
      w.rotation.z = ph;
      if (withPinion) {
        meshOf(wheelGeo(gear, { teeth: DT.idler2.pinion, module: MD.dateCarrier, z0: i1, z1: p1, pinion: true, bore: 0.13 }), polished, 'date-idler-pinion', rotor);
      }
      // fixed stud with a small domed head
      const top = withPinion ? p1 : i1;
      meshOf(latheZ([[0, Z.dateRecess], [0.12, Z.dateRecess], [0.12, top + 0.005], [0.24, top + 0.005], [0.24, top + 0.04], [0.18, top + 0.065], [0, top + 0.07]], 32), polished, 'date-idler-stud', pivot);
      return rotor;
    };
    idlers.push(mk(L.dateIdler1, DT.idler1.teeth, phI1, false), mk(L.dateIdler2, DT.idler2.teeth, phI2, true));
    const tip1 = tipR(DT.idler1.teeth, MD.dateWheel), tip2 = tipR(DT.idler2.teeth, MD.dateWheel);
    reg.add({
      id: 'date-idlers', name: 'Date idlers', category: 'date', side: 'front', object,
      exposed: false, xray: false, priority: 3,
      explode: ex('date-idlers'), explodeDelay: exd('date-idlers'),
      anchor: [L.dateIdler1[0], L.dateIdler1[1] - tip1 * 0.6, i1],
      description: 'Two small steel wheels that carry the date drive across from the date-drive wheel to the switching wheel; the second one\'s 8-leaf pinion slows the drive to one turn a day.',
      facts: {
        Teeth: `${DT.idler1.teeth} and ${DT.idler2.teeth} + pinion ${DT.idler2.pinion}`,
        Speeds: '1 turn / 3 h 30 min and / 4 h',
        Diameters: `${(2 * tip1).toFixed(2)} and ${(2 * tip2).toFixed(2)} mm`,
        'Tooth counts': 'Estimated',
      },
      update: (s) => {
        idlers[0].rotation.z = s.rot.dateIdler1 ?? 0;
        idlers[1].rotation.z = s.rot.dateIdler2 ?? 0;
      },
    });
  }

  // ================================================================ SWITCHING WHEEL + CLICK
  const W = L.dateSwitch;
  const clickZ = [Z.dateClick[0] + 0.005, Z.dateClick[1]];
  const CM = solveClick(spec, clickOutline);
  {
    const object = new THREE.Group();
    object.position.set(W[0], W[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const [k0, k1] = Z.dateCarrier, [g0, g1] = Z.programWheel, [m0, m1] = Z.dateCam;
    const bore = SD.switching.camRadius + 0.05;
    const carrier = meshOf(wheelGeo(gear, { teeth: DT.carrier.teeth, module: MD.dateCarrier, z0: k0 + 0.005, z1: k1, bore: 0.3, holes: 4, holeR: 0.36, holeAt: 1.25 }), steelWheel, 'date-carrier', rotor); // steel, so the gilt program wheel reads against it
    carrier.rotation.z = phC;
    meshOf(wheelGeo(gear, { teeth: DT.programWheel.teeth, module: MD.programWheel, z0: g0, z1: g1, bore }), gilt, 'date-program-wheel', rotor);
    // pipe riveting the two wheels together round the stud
    meshOf(discUV(latheZ([[0.3, k1], [bore + 0.12, k1], [bore + 0.12, g0], [0.3, g0]], 48), 1), polished, 'date-switch-pipe', rotor);
    // the click on its pivot pin
    const pivot = new THREE.Group();
    pivot.position.set(CM.Ql[0], CM.Ql[1], 0);
    rotor.add(pivot);
    const shape = new THREE.Shape(CM.shape.map((p) => V2(p[0], p[1])));
    const cg = new THREE.ExtrudeGeometry(shape, { depth: clickZ[1] - clickZ[0] - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelOffset: -0.012, bevelSegments: 2, curveSegments: 4 });
    cg.translate(0, 0, clickZ[0] + 0.01);
    planarUV(cg, 4, [0, 0], 0);
    const clickMesh = meshOf(cg, satin, 'date-click', pivot);
    meshOf(latheZ([[0, g1], [0.075, g1], [0.075, clickZ[1] + 0.005], [0.12, clickZ[1] + 0.005], [0.12, clickZ[1] + 0.02], [0.08, clickZ[1] + 0.035], [0, clickZ[1] + 0.035]], 24), polished, 'date-click-pin', pivot);
    void clickMesh;
    // fixed parts: the square stud and the teardrop cam on it
    const sq = 0.19;
    const stud = mergeGeometries([
      plain(latheZ([[0, 0], [0.27, 0], [0.27, g0], [0, g0]], 32)),
      plain(new THREE.BoxGeometry(2 * sq, 2 * sq, Z.dateBridge[1] - 0.02 - g0).translate(0, 0, (g0 + Z.dateBridge[1] - 0.02) / 2)),
    ], false);
    stud.rotateZ(20 * DEG);
    meshOf(stud, polished, 'date-switch-stud', object);
    const out = Math.atan2(W[1], W[0]); // the cam's point faces the ring
    const camR = SD.switching.camRadius, base = camR * 0.58;
    const camSdf = sUnion(0.12, sdCircle(0, 0, base), sdPolygon([[base * Math.cos(out + 1.2), base * Math.sin(out + 1.2)], [(camR - 0.06) * Math.cos(out), (camR - 0.06) * Math.sin(out)], [base * Math.cos(out - 1.2), base * Math.sin(out - 1.2)]]));
    const camOut = contour(camSdf, -camR - 0.1, -camR - 0.1, camR + 0.1, camR + 0.1, 0.006);
    const camHole = [[-sq, -sq], [sq, -sq], [sq, sq], [-sq, sq]].map((p) => rot2([p[0] * 1.02, p[1] * 1.02], 20 * DEG));
    const cam = prism(camOut, [camHole], m0, m1, 0.015, 2);
    for (const gg of [cam.caps, cam.sides]) planarUV(gg, 4, [0, 0], 0);
    meshOf(cam.caps, satin, 'date-cam', object);
    meshOf(cam.sides, polished, 'date-cam-edge', object);

    const tipProg = tipR(DT.programWheel.teeth, MD.programWheel);
    const sec = (t) => { const x = (((-t) / TAU) % 1 + 1) % 1; return x * 86400; };
    reg.add({
      id: 'date-wheels', name: 'Switching wheel', category: 'date', side: 'front', object, rotor,
      drive: { key: 'dateSwitch' }, exposed: false, xray: false, priority: 1,
      explode: ex('date-wheels'), explodeDelay: exd('date-wheels'),
      anchor: [-tipProg * 0.7, tipProg * 0.7, g1],
      description: 'The Update\'s switching wheel ("Datumschaltrad"): it turns once a day and carries a hooked click that rides on a fixed teardrop cam. Around midnight the click swings out, catches a tooth inside the date ring and drags the ring on by one date in about half an hour, then folds back.',
      facts: {
        Speed: '1 turn / 24 h',
        Wheels: `Carrier ${DT.carrier.teeth} + gilt program wheel ${DT.programWheel.teeth}`,
        'Date change': `${((CM.dur / 2) / 60).toFixed(0)} min either side of midnight`,
        'Hook reach': `${(Math.hypot(...CM.Ql) + CM.rho).toFixed(2)} mm from the arbor`,
        Mechanism: 'Patented; geometry estimated',
      },
      live: (s) => {
        const t = sec(s.rot.dateSwitch ?? 0);
        const f = (s.datePos ?? 0) % 1;
        if (f > 0) return `dragging the ring · ${Math.round(f * 100)} %`;
        const until = ((86400 - CM.dur / 2 - t) % 86400 + 86400) % 86400;
        return `next change in ${Math.floor(until / 3600)} h ${String(Math.floor((until % 3600) / 60)).padStart(2, '0')} min`;
      },
      update: (s) => {
        const t = sec(s.rot.dateSwitch ?? 0);
        const p = s.datePos ?? 0;
        pivot.rotation.z = clickAngle(CM, t, p - Math.floor(p));
      },
    });
  }

  // ================================================================ RING JUMPER
  {
    const J = SD.jumper;
    const jz = Z.dateJumper;
    const JM = solveJumper(spec, jumperOutline);
    const object = new THREE.Group();
    object.position.set(JM.A[0], JM.A[1], 0);
    root.add(object);
    const shape = new THREE.Shape(JM.shape.map((p) => V2(p[0] - JM.A[0], p[1] - JM.A[1])));
    shape.holes.push(new THREE.Path(circlePts(0.14, 24).map((p) => V2(p[0], p[1]))));
    const jg = new THREE.ExtrudeGeometry(shape, { depth: jz[1] - jz[0] - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelOffset: -0.012, bevelSegments: 2, curveSegments: 4 });
    jg.translate(0, 0, jz[0] + 0.01);
    planarUV(jg, 4, [0, 0], 0);
    const blade = meshOf(jg, satin, 'date-jumper-blade', object);
    // per-vertex bend weights (blade flexes, boss stays on its screw); rest positions kept
    const posAttr = jg.attributes.position;
    const base = Float32Array.from(posAttr.array);
    const wts = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) wts[i] = JM.weight(base[3 * i] + JM.A[0], base[3 * i + 1] + JM.A[1]);
    blade.frustumCulled = false; // the bend moves vertices a fraction of a millimetre
    let lastDelta = NaN;
    const bend = (delta) => {
      if (delta === lastDelta) return;
      lastDelta = delta;
      const a = posAttr.array, ux = JM.ub[0] * delta, uy = JM.ub[1] * delta;
      for (let i = 0; i < wts.length; i++) { a[3 * i] = base[3 * i] - wts[i] * ux; a[3 * i + 1] = base[3 * i + 1] - wts[i] * uy; }
      posAttr.needsUpdate = true;
    };
    bend(JM.lut[0]);
    // shoulder screw (static) clamping the blade's boss; flat head kept under the date bridge
    meshOf(latheZ([[0, Z.dateRecess], [0.14, Z.dateRecess], [0.14, jz[1]], [0, jz[1]]], 24), polished, 'date-jumper-shoulder', object);
    meshOf(screwGeo(0.27, jz[1], Z.dateBridge[0] - 0.006, 0.07, 0.012, -20, 32), polished, 'date-jumper-screw', object);
    const lut = JM.lut, N = lut.length - 1;
    reg.add({
      id: 'date-jumper', name: 'Ring jumper', category: 'date', side: 'front', object,
      exposed: false, xray: false, priority: 2,
      explode: ex('date-jumper'), explodeDelay: exd('date-jumper'),
      anchor: [JM.tip[0] - JM.A[0] - 0.3 * JM.ub[0], JM.tip[1] - JM.A[1] - 0.3 * JM.ub[1], jz[1]],
      description: 'A sprung steel detent whose V-shaped beak sits between two of the date ring\'s teeth and holds the ring exactly on the date. During the change the passing tooth lifts it, and it drops into the next gap.',
      facts: {
        Beak: `${2 * JUMPER.beakHalfDeg}° V, rests at r ${JM.rTip.toFixed(2)} mm`,
        Lift: `${(Math.max(...lut) - lut[0]).toFixed(2)} mm over a tooth`,
        Gap: `Clock ${J.beakClockDeg.toFixed(2)}°`,
        Geometry: 'Estimated',
      },
      update: (s) => {
        const p = s.datePos ?? 0, f = p - Math.floor(p);
        const x = f * N, i = Math.min(N - 1, Math.floor(x));
        bend(lut[i] + (lut[i + 1] - lut[i]) * (x - i));
      },
    });
  }

  // ================================================================ DATE CORRECTOR (static)
  {
    const object = new THREE.Group();
    object.position.set(L.quickSetStar[0], L.quickSetStar[1], 0);
    root.add(object);
    const [w0, w1] = Z.quickSetWheel, [s0, s1] = Z.quickSetStar;
    const b = batch();
    b.add(wheelGeo(gear, { teeth: DT.quickSetWheel.teeth, module: MD.quickSet, z0: w0, z1: w1, bore: 0.25 }), steelWheel);
    // five tapered arms round a hub
    const n = SD.corrector.starArms, rT = SD.corrector.armTipRadius;
    const arms = [];
    for (let i = 0; i < n; i++) {
      const a = STAR.arm0Deg * DEG + (i * TAU) / n;
      const d = [Math.cos(a), Math.sin(a)], q = [-d[1], d[0]];
      const r0 = STAR.hubR * 0.7;
      arms.push(sdPolygon([[r0 * d[0] + STAR.armRootHalfW * q[0], r0 * d[1] + STAR.armRootHalfW * q[1]], [rT * d[0] + STAR.tipHalfW * q[0], rT * d[1] + STAR.tipHalfW * q[1]], [rT * d[0] - STAR.tipHalfW * q[0], rT * d[1] - STAR.tipHalfW * q[1]], [r0 * d[0] - STAR.armRootHalfW * q[0], r0 * d[1] - STAR.armRootHalfW * q[1]]]));
    }
    const starOut = contour(sUnion(0.12, sdCircle(0, 0, STAR.hubR), ...arms), -rT - 0.1, -rT - 0.1, rT + 0.1, rT + 0.1, 0.008);
    const st = prism(starOut, [circlePts(0.25, 32)], s0, s1, 0.02, 2);
    for (const gg of [st.caps, st.sides]) planarUV(gg, 4, [0, 0], 0);
    b.add(st.caps, satin);
    b.add(st.sides, polished);
    // hub between wheel and star, collar and the screw holding the stack
    b.add(discUV(latheZ([[0.25, w1], [0.55, w1], [0.55, s0], [0.25, s0]], 40), 0.55), polished);
    b.add(discUV(latheZ([[0.25, s1], [0.5, s1], [0.5, s1 + 0.03], [0.46, s1 + 0.045], [0.25, s1 + 0.045]], 40), 0.5), polished);
    b.add(screwGeo(0.4, s1 + 0.03, s1 + 0.1, 0.08, 0.035, 60), polished);
    b.add(latheZ([[0, Z.keylessRecess], [0.2, Z.keylessRecess], [0.2, s1 + 0.03], [0, s1 + 0.03]], 24), polished);
    // the 14-tooth idler beside it, on its own stud
    const iv = [L.quickSetIdler[0] - L.quickSetStar[0], L.quickSetIdler[1] - L.quickSetStar[1]];
    const [q0, q1] = Z.quickSetIdler;
    b.add(wheelGeo(gear, { teeth: DT.quickSetIdler.teeth, module: MD.quickSet, z0: q0, z1: q1, bore: 0.12 }), steelWheel, at(iv[0], iv[1], 0, phQI));
    b.add(latheZ([[0, Z.keylessRecess], [0.11, Z.keylessRecess], [0.11, q1 + 0.005], [0.22, q1 + 0.005], [0.22, q1 + 0.035], [0.16, q1 + 0.055], [0, q1 + 0.06]], 32), polished, at(iv[0], iv[1]));
    b.build(object, 'date-corrector');
    reg.add({
      id: 'date-corrector', name: 'Date corrector', category: 'date', side: 'front', object,
      exposed: false, xray: false, priority: 3,
      explode: ex('date-corrector'), explodeDelay: exd('date-corrector'),
      anchor: [rT * 0.7 * Math.cos(STAR.arm0Deg * DEG), rT * 0.7 * Math.sin(STAR.arm0Deg * DEG), s1],
      description: 'The quick-set for the date: with the crown pulled to its middle position, turning it spins this five-armed star, which flicks the date ring one day forwards or back. At rest its arms stay clear of the ring\'s teeth.',
      facts: {
        Arms: `${n}, reach r ${(Math.hypot(...L.quickSetStar) + rT).toFixed(2)} mm (teeth at ${SD.ring.toothTipRadius})`,
        Wheels: `${DT.quickSetWheel.teeth} + idler ${DT.quickSetIdler.teeth}`,
        Works: 'Crown position 2, both directions',
        'Tooth counts': 'Estimated',
      },
    });
  }

  // ================================================================ BRIDGES
  const BR = SD.bridges;
  const bridgeUV = (g) => planarUV(g, 0.5, [0, 0], 0);
  // countersunk slotted screw flush with a bridge top (head in a polished cone)
  const csScrew = (b, p, zTop, r, slotDeg) => {
    b.add(screwGeo(r, zTop - 0.06, zTop - 0.004, 0.075, 0.03, slotDeg, 36), polished, at(p[0], p[1]));
    b.add(latheZ([[r + 0.005, zTop - 0.06], [r + 0.075, zTop], [r + 0.075, zTop - 0.0005], [r + 0.005, zTop - 0.06]], 36), polished, at(p[0], p[1]));
  };
  const domedScrew = (b, p, zBase, r, slotDeg) => b.add(screwGeo(r, zBase, zBase + 0.09, 0.075, 0.035, slotDeg, 36), polished, at(p[0], p[1]));
  const addBridge = (id, name, outline, holes, z, extra, def) => {
    const object = new THREE.Group();
    object.name = id;
    root.add(object);
    const b = batch();
    const pr = prism(chaikin(outline, BRIDGE.smooth), holes, z[0], z[1], BRIDGE.bevel, 8);
    bridgeUV(pr.caps); bridgeUV(pr.sides);
    b.add(pr.caps, frost);
    b.add(pr.sides, polished);
    extra?.(b);
    b.build(object, id);
    reg.add({
      id, name, category: 'frame', side: 'front', object, exposed: false, xray: true, priority: 3,
      explode: ex(id), explodeDelay: exd(id), ...def,
    });
    return object;
  };
  const hole = (c, r, n = 40) => circlePts(r, n, c[0], c[1]).reverse();

  // date bridge [0.36, 0.46]: window onto the program wheel, the square stud, three screws
  {
    const z = Z.dateBridge;
    const scr = BR.dateScrews;
    const holes = [hole(BR.dateWindow.c, BR.dateWindow.r, 48), hole(W, 0.4, 32), ...scr.map((p) => hole(p, 0.52, 36)),
      hole([-6.0, 0.95], 0.26, 28), hole([-9.95, -1.05], 0.3, 28)]; // two pivot holes seen on the render
    addBridge('date-bridge', 'Date bridge', BR.date, holes, z, (b) => {
      scr.forEach((p, i) => csScrew(b, p, z[1], 0.45, 30 + 50 * i));
    }, {
      anchor: [-9.6, 4.6, z[1]],
      description: 'The large steel bridge on the left that holds the switching wheel, its click and the date idlers in place under the dial. Through its round window the gilt teeth of the program wheel can be seen turning.',
      facts: { Thickness: `${(z[1] - z[0]).toFixed(2)} mm`, Screws: `${scr.length}, countersunk`, Window: `Ø ${(2 * BR.dateWindow.r).toFixed(1)} mm`, Outline: 'Traced on the official render' },
    });
  }
  // motion bridge [0.18, 0.30] over the hour wheel (hole for its pipe)
  {
    const z = Z.motionBridge;
    addBridge('motion-bridge', 'Motion bridge', BR.motion, [hole(L.center, 0.75, 48)], z, null, {
      anchor: [1.6, 0.3, z[1]],
      description: 'A small steel bridge over the hour wheel that keeps it seated against the plate; the hour hand\'s pipe rises through its hole. Above its edge the gilt hour wheel shows as a crescent.',
      facts: { Thickness: `${(z[1] - z[0]).toFixed(2)} mm`, Hole: 'Ø 1.5 mm for the hour pipe' },
    });
  }
  // keyless bridge [0, 0.14] at 1–2 o'clock: two screws and the setting-lever post
  {
    const z = Z.keylessBridge;
    const post = [7.95, 5.9];
    addBridge('keyless-bridge', 'Keyless bridge', BR.keyless, [hole(post, 0.3, 32)], z, (b) => {
      BR.keylessScrews.forEach((p, i) => domedScrew(b, p, z[1], 0.42, 110 + 60 * i));
      b.add(latheZ([[0, Z.keylessRecess], [0.22, Z.keylessRecess], [0.22, z[1] + 0.03], [0.17, z[1] + 0.06], [0, z[1] + 0.065]], 32), polished, at(post[0], post[1]));
    }, {
      anchor: [8.6, 6.4, z[1]],
      description: 'Steel cover plate at 2 o\'clock that holds the setting lever and the yoke flat against the plate on the dial side.',
      facts: { Thickness: `${(z[1] - z[0]).toFixed(2)} mm`, Screws: `${BR.keylessScrews.length}` },
    });
  }
  // lower bridge [0, 0.16] at 6 o'clock with the escape and fourth lower jewels
  {
    const z = Z.lowerBridge;
    const J = BR.lowerJewels;
    const jewelR = 0.36, sinkR = 0.58;
    const jewelHoles = [J.escape, J.fourth].map((c) => hole(c, sinkR, 48));
    addBridge('dial-side-bridge', 'Lower bridge', BR.lower, [...jewelHoles, hole([2.5, -9.1], 0.18, 24)], z, (b) => {
      BR.lowerScrews.forEach((p, i) => domedScrew(b, p, z[1], 0.42, 20 + 70 * i));
      for (const c of [J.escape, J.fourth]) {
        // polished conical sink, ruby with an olive dome and its pivot hole
        b.add(latheZ([[sinkR, z[1]], [jewelR + 0.02, z[1] - 0.07], [jewelR + 0.02, z[0] + 0.01], [sinkR, z[0] + 0.01]], 48), polished, at(c[0], c[1]));
        const hr = c === J.fourth ? 0.08 : 0.05;
        b.add(latheZ([[hr, z[0] + 0.02], [jewelR, z[0] + 0.02], [jewelR, z[1] - 0.075], [jewelR * 0.75, z[1] - 0.055], [hr * 1.6, z[1] - 0.05], [hr, z[1] - 0.06]], 40), ruby, at(c[0], c[1]));
      }
    }, {
      anchor: [-2.0, -10.2, z[1]],
      description: 'The long steel bridge at 6 o\'clock. It carries the dial-side jewels of the escape wheel and the fourth wheel, whose arbor runs on through it and the dial to the small-seconds hand.',
      facts: { Thickness: `${(z[1] - z[0]).toFixed(2)} mm`, Jewels: '2 (escape, fourth)', Screws: `${BR.lowerScrews.length}` },
    });
  }
}
