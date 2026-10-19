// Escapement and regulating organ of the DUW 4001: NOMOS swing system (escape wheel,
// pallet fork, balance with blued hairspring) and the DUW regulation system on the
// balance cock (regulator ring with spring key, stud-carrier ring, Incabloc-type shock
// setting).
//
// The lever escapement is not just drawn — it is SOLVED. At start-up the stone and
// tooth outlines below are run through a 2-D contact simulation (wheel always pushing
// forward against whichever stone it touches while the fork moves between its
// bankings). That gives, for every position of the fork during a beat, the exact
// angle at which the escape wheel is held by a pallet stone: unlocking (with a hint
// of recoil from the draw), impulse on the pallet face, impulse on the tooth's club,
// drop, lock. The kinematics' escape-wheel angle is exact at every rest position (12°
// per beat); during the ~9 ms impulse window the wheel follows the solved profile
// instead, so in slow motion teeth never pass through stones.
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ribbedMaterial, bluedScrewMaterial, cockFlank, cockOutline } from './finish.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// ===================================================================== 2-D helpers
const rot2 = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const loopArea = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const ccw = (P) => (loopArea(P) < 0 ? P.slice().reverse() : P);

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Signed-distance primitives (negative inside) for organic, filleted outlines.
const sd = {
  circle: (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r,
  capsule(x, y, ax, ay, bx, by, ra, rb = ra) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t) - (ra + (rb - ra) * t);
  },
  box(x, y, cx, cy, hx, hy, ang = 0, rc = 0) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const px = (x - cx) * c + (y - cy) * s, py = -(x - cx) * s + (y - cy) * c;
    const qx = Math.abs(px) - hx + rc, qy = Math.abs(py) - hy + rc;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
  },
  poly(x, y, P) {
    let d = Infinity, sgn = 1;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const ax = P[j][0], ay = P[j][1], bx = P[i][0], by = P[i][1];
      const ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
      const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      const qx = wx - ex * t, qy = wy - ey * t;
      d = Math.min(d, qx * qx + qy * qy);
      const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sgn = -sgn;
    }
    return sgn * Math.sqrt(d);
  },
  // annular sector band: ring radius r, half width hw, from angle a0 to a1 (CCW)
  arc(x, y, cx, cy, r, a0, a1) {
    const a = Math.atan2(y - cy, x - cx);
    const t = (((a - a0) % TAU) + TAU) % TAU;
    if (t <= a1 - a0) return Math.abs(Math.hypot(x - cx, y - cy) - r);
    return Math.min(Math.hypot(x - cx - r * Math.cos(a0), y - cy - r * Math.sin(a0)), Math.hypot(x - cx - r * Math.cos(a1), y - cy - r * Math.sin(a1)));
  },
};
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

// Marching squares: closed outline loops of {f < 0} over a box, cell size h.
function contours(f, x0, y0, x1, y1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1;
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let val = f(x0 + i * h, y0 + j * h);
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) val = Math.max(val, 1e-6);
      v[j * nx + i] = val === 0 ? 1e-9 : val;
    }
  }
  const pts = new Map();
  const edgePoint = (id) => {
    let p = pts.get(id);
    if (p) return p;
    const k = id >> 1, i = k % nx, j = (k / nx) | 0;
    if ((id & 1) === 0) { const a = v[k], b = v[k + 1]; p = [x0 + (i + a / (a - b)) * h, y0 + j * h]; } else { const a = v[k], b = v[k + nx]; p = [x0 + i * h, y0 + (j + a / (a - b)) * h]; }
    pts.set(id, p);
    return p;
  };
  const next = new Map();
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const k = j * nx + i;
      const idx = (v[k] < 0 ? 1 : 0) | (v[k + 1] < 0 ? 2 : 0) | (v[k + nx + 1] < 0 ? 4 : 0) | (v[k + nx] < 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const eB = 2 * k, eR = 2 * (k + 1) + 1, eT = 2 * (k + nx), eL = 2 * k + 1;
      const cen = () => v[k] + v[k + 1] + v[k + nx + 1] + v[k + nx] < 0;
      switch (idx) {
        case 1: next.set(eL, eB); break;
        case 2: next.set(eB, eR); break;
        case 3: next.set(eL, eR); break;
        case 4: next.set(eR, eT); break;
        case 5: if (cen()) { next.set(eL, eT); next.set(eR, eB); } else { next.set(eL, eB); next.set(eR, eT); } break;
        case 6: next.set(eB, eT); break;
        case 7: next.set(eL, eT); break;
        case 8: next.set(eT, eL); break;
        case 9: next.set(eT, eB); break;
        case 10: if (cen()) { next.set(eB, eL); next.set(eT, eR); } else { next.set(eB, eR); next.set(eT, eL); } break;
        case 11: next.set(eT, eR); break;
        case 12: next.set(eR, eL); break;
        case 13: next.set(eR, eB); break;
        case 14: next.set(eB, eL); break;
        default: break;
      }
    }
  }
  const loops = [];
  const used = new Set();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const loop = [];
    let e = start;
    while (e !== undefined && !used.has(e)) { used.add(e); loop.push(edgePoint(e)); e = next.get(e); }
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

// Ramer–Douglas–Peucker for a closed loop.
function simplify(loop, eps) {
  const n = loop.length;
  if (n < 8) return loop;
  let i0 = 0, i1 = 0, best = -1;
  const st = Math.max(1, (n / 48) | 0);
  for (let i = 0; i < n; i += st) {
    for (let j = 0; j < n; j += st) {
      const dd = (loop[i][0] - loop[j][0]) ** 2 + (loop[i][1] - loop[j][1]) ** 2;
      if (dd > best) { best = dd; i0 = i; i1 = j; }
    }
  }
  if (i0 > i1) [i0, i1] = [i1, i0];
  const rdp = (P) => {
    const keep = new Uint8Array(P.length);
    keep[0] = keep[P.length - 1] = 1;
    const stack = [[0, P.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const ax = P[a][0], ay = P[a][1], ex = P[b][0] - ax, ey = P[b][1] - ay, L = Math.hypot(ex, ey) || 1e-12;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const dd = Math.abs((P[i][0] - ax) * ey - (P[i][1] - ay) * ex) / L; if (dd > md) { md = dd; mi = i; } }
      if (md > eps) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    return P.filter((_, i) => keep[i]);
  };
  const A = rdp(loop.slice(i0, i1 + 1));
  const B = rdp(loop.slice(i1).concat(loop.slice(0, i0 + 1)));
  return A.slice(0, -1).concat(B.slice(0, -1));
}

// Loops → THREE.Shapes (even nesting depth = solid, odd = hole).
function loopsToShapes(THREE, loops) {
  const items = loops.map((l) => ({ l, a: Math.abs(loopArea(l)), depth: 0, parent: null })).sort((p, q) => q.a - p.a);
  for (let i = 0; i < items.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      const p = items[i].l[0];
      if (pointInPoly(p[0], p[1], items[j].l)) { items[i].depth = items[j].depth + 1; items[i].parent = items[j]; break; }
    }
  }
  const shapes = new Map();
  const V = (l) => l.map((p) => new THREE.Vector2(p[0], p[1]));
  for (const it of items) if (it.depth % 2 === 0) shapes.set(it, new THREE.Shape(V(it.l)));
  for (const it of items) if (it.depth % 2 === 1 && shapes.has(it.parent)) shapes.get(it.parent).holes.push(new THREE.Path(V(it.l)));
  return [...shapes.values()];
}

function sdfShapes(THREE, f, box, h, eps) {
  const loops = contours(f, box[0], box[1], box[2], box[3], h).map((l) => simplify(l, eps));
  return loopsToShapes(THREE, loops);
}

// Extrude shapes to a slab spanning z ∈ [z0, z1] with polished bevelled edges.
function slab(THREE, shapes, z0, z1, bevel = 0.012, segs = 2) {
  const T = z1 - z0;
  const bt = Math.min(bevel, T * 0.3);
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: T - 2 * bt, bevelEnabled: bevel > 0, bevelThickness: bt, bevelSize: bevel, bevelOffset: -bevel,
    bevelSegments: segs, curveSegments: 24,
  });
  geo.translate(0, 0, z0 + bt);
  return geo;
}

// Lathe from an (r, z) profile, axis = Z.
function lathe(THREE, prof, segs = 48) {
  const g = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), segs);
  g.rotateX(Math.PI / 2);
  return g;
}

// Rounded-rectangle cross-section (r0..r1, z0..z1) for a lathe.
function roundedSection(r0, r1, z0, z1, rc, n = 4) {
  const pts = [];
  const corner = (cx, cy, a0) => { for (let k = 0; k <= n; k++) { const a = a0 + (Math.PI / 2) * (k / n); pts.push([cx + rc * Math.cos(a), cy + rc * Math.sin(a)]); } };
  corner(r1 - rc, z0 + rc, -Math.PI / 2);
  corner(r1 - rc, z1 - rc, 0);
  corner(r0 + rc, z1 - rc, Math.PI / 2);
  corner(r0 + rc, z0 + rc, Math.PI);
  pts.push(pts[0]);
  return pts;
}

// ===================================================================== escape-wheel tooth
// One Swiss club tooth, locking corner at angle 0 on the locking circle Rl = R − hc;
// the heel of the club lies on the tip circle R, so the club's impulse face lifts the
// pallet stone after the tooth has slid off the stone's own impulse face. Teeth lean
// towards +angle (the wheel turns CCW seen from the dial). CCW polygon.
function toothProfile(R, hc, gc) {
  const Rl = R - hc;
  const rootR = 0.72 * R;
  const P = (r, a) => pol(r, a * DEG);
  const pts = [
    // back of the stem: concave fillet into the rim (only below r ≈ 2.2, where the
    // pallet stones never reach — their deepest point is at r ≈ 2.26)
    P(rootR, -16.5), P(rootR + 0.05, -13.8), P(rootR + 0.12, -11.4), P(rootR + 0.21, -9.3), P(rootR + 0.33, -7.2), P(R - 0.19, -5.4),
    P(R - 0.135, -6.75), P(R - 0.06, -6.9), P(R - 0.012, -6.4), P(R, -gc),
  ];
  for (const s of [0.25, 0.5, 0.75]) pts.push(P(R + (Rl - R) * s + 0.006 * Math.sin(Math.PI * s), -gc * (1 - s)));
  pts.push(P(Rl, 0));
  const C = P(Rl, 0), F = P(rootR, -6.2);
  for (const t of [0.33, 0.66, 0.9]) pts.push([C[0] + (F[0] - C[0]) * t, C[1] + (F[1] - C[1]) * t]);
  pts.push(P(rootR + 0.02, -5.5), P(rootR - 0.004, -4.0));
  return { pts, rootR, Rl };
}

// Pallet stones, each drawn at its own "in" banking around the resting tooth corner
// (E frame: escape centre at origin, pallet arbor at (d, 0)), returned in fork-local
// coordinates [LC (locking corner), LO (let-off corner), OB, OF].
function designStones({ d, phi0, Rl, P }) {
  const betaE = -30 * DEG - P.w / 2 / Rl; // tooth corner angle at an even rest (entry locks)
  const betaX = betaE + 60 * DEG; // odd rest (exit locks): 2½ teeth further on
  function stoneAt(beta, w, lock, hImp, draw) {
    const u = pol(1, beta), t = pol(1, beta + Math.PI / 2);
    const f = rot2(u, draw * DEG); // locking face, outer end leaning downstream (draw)
    const LC = [u[0] * Rl - f[0] * lock, u[1] * Rl - f[1] * lock];
    const LO = [LC[0] + w * t[0] - hImp * u[0], LC[1] + w * t[1] - hImp * u[1]];
    const OF = [LC[0] + P.stoneLen * f[0], LC[1] + P.stoneLen * f[1]];
    const OB = [OF[0] + w * t[0], OF[1] + w * t[1]];
    return [LC, LO, OB, OF];
  }
  const toLocal = (poly, phi) => poly.map((p) => rot2([p[0] - d, p[1]], -phi));
  return {
    betaE, betaX,
    entry: toLocal(stoneAt(betaE, P.w, P.lock, P.hImp, P.draw), -phi0),
    exit: toLocal(stoneAt(betaX, P.wX, P.lockX, P.hImpX, P.drawX), +phi0),
  };
}

// First contact (smallest CCW wheel rotation ≤ maxD) between a tooth and a stone,
// both CCW polygons in the E frame: every vertex of one against every edge of the other.
function firstContact(tooth, stone, maxD) {
  let best = maxD;
  const test = (P, A, B, sign) => {
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const a = dx * dx + dy * dy, b = 2 * (A[0] * dx + A[1] * dy), c = A[0] * A[0] + A[1] * A[1] - (P[0] * P[0] + P[1] * P[1]);
    const disc = b * b - 4 * a * c;
    if (disc < 0) return;
    const sq = Math.sqrt(disc), a0 = Math.atan2(P[1], P[0]);
    for (let r = 0; r < 2; r++) {
      const t = (-b + (r ? sq : -sq)) / (2 * a);
      if (t < -1e-9 || t > 1 + 1e-9) continue;
      const X = A[0] + dx * t, Y = A[1] + dy * t;
      if (-Y * sign * dy + X * sign * -dx >= 0) continue; // moving out of the polygon, not in
      let D = (((sign * (Math.atan2(Y, X) - a0)) % TAU) + TAU) % TAU;
      if (D > TAU - 1e-7) D = 0;
      if (D < best) best = D;
    }
  };
  for (const P of tooth) for (let i = 0; i < stone.length; i++) test(P, stone[i], stone[(i + 1) % stone.length], 1);
  for (const P of stone) for (let i = 0; i < tooth.length; i++) test(P, tooth[i], tooth[(i + 1) % tooth.length], -1);
  return best;
}

// Wheel progress e(q) (0..1 of the 12° step) against fork travel q (0..1) for the two
// kinds of beat. odd: fork −φ0 → +φ0 (entry stone unlocks and gives impulse);
// even: +φ0 → −φ0 (exit stone).
function solveEscapement({ d, phi0, stones, tooth }) {
  const T0 = ccw(tooth);
  const S0 = [ccw(stones.entry), ccw(stones.exit)];
  const pitch = TAU / 15;
  const posed = (omega, i) => { const a = stones.betaE + omega + i * pitch; const c = Math.cos(a), s = Math.sin(a); return T0.map((p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]); };
  const near = (omega) => {
    const out = [];
    for (let i = 0; i < 15; i++) {
      let a = stones.betaE + omega + i * pitch;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if ((a > -55 * DEG && a < -5 * DEG) || (a > 5 * DEG && a < 55 * DEG)) out.push(i);
    }
    return out;
  };
  const stonesAt = (phi) => S0.map((S) => S.map((p) => { const q = rot2(p, phi); return [q[0] + d, q[1]]; }));
  const overlap = (omega, S) => {
    for (const i of near(omega)) {
      const T = posed(omega, i);
      for (const s of S) {
        for (const p of T) if (pointInPoly(p[0], p[1], s)) return true;
        for (const p of s) if (pointInPoly(p[0], p[1], T)) return true;
      }
    }
    return false;
  };
  const table = (odd, N) => {
    const out = new Float32Array(N);
    const base = odd ? 0 : 12 * DEG;
    let omega = base;
    for (let k = 0; k < N; k++) {
      const q = k / (N - 1);
      const S = stonesAt(odd ? -phi0 + 2 * phi0 * q : phi0 - 2 * phi0 * q);
      if (overlap(omega, S)) { // the stone pushes the wheel back a hair (draw)
        let lo = omega - 2 * DEG, hi = omega;
        for (let j = 0; j < 20; j++) { const m = (lo + hi) / 2; if (overlap(m, S)) hi = m; else lo = m; }
        omega = lo;
      }
      let adv = base + 12 * DEG - omega;
      for (const i of near(omega)) { const T = posed(omega, i); for (const s of S) adv = Math.min(adv, firstContact(T, s, adv)); }
      omega += adv;
      out[k] = (omega - base) / (12 * DEG);
    }
    out[0] = 0;
    out[N - 1] = 1;
    return out;
  };
  return { odd: table(true, 121), even: table(false, 121) };
}

// ===================================================================== builder
export function buildEscapement(ctx) {
  const { THREE, spec, M, reg, root, gear, planarUV } = ctx;
  const L = spec.layout, Z = spec.z, E = spec.escapement, F = spec.frame;
  const V2 = (p) => new THREE.Vector2(p[0], p[1]);

  // ------------------------------------------------------------- materials
  const gold = M.brass.clone();
  gold.color.set(0xf0cd88);
  gold.roughness = 0.16;
  gold.metalness = 1;
  const goldSatin = M.brass.clone();
  goldSatin.color.set(0xdcb468);
  goldSatin.roughness = 0.32;
  const holeDark = M.black.clone();
  holeDark.color.set(0x2a1d0c);
  const pinkRuby = M.ruby.clone();
  pinkRuby.color.set(0xe0508e);
  pinkRuby.attenuationColor = new THREE.Color(0xc02870);
  pinkRuby.emissive = new THREE.Color(0x3a0820);
  const redRuby = M.ruby.clone();
  const blue = M.blued.clone();
  blue.color.set(0x2c5bc8);
  blue.roughness = 0.2;

  // One material per mesh: the registry's X-ray / highlight code clones mesh.material,
  // which fails on material arrays. A [faces, edges] pair (ExtrudeGeometry groups 0 and
  // 1) becomes one mesh per material, with the same draw-call count.
  const mesh = (geo, mat, parent) => {
    if (!Array.isArray(mat)) { const m = new THREE.Mesh(geo, mat); if (parent) parent.add(m); return m; }
    const g0 = geo.index ? geo.toNonIndexed() : geo;
    const byMat = new Map();
    const groups = g0.groups.length ? g0.groups : [{ start: 0, count: g0.attributes.position.count, materialIndex: 0 }];
    for (const gr of groups) {
      const mt = mat[gr.materialIndex] ?? mat[0];
      if (!byMat.has(mt)) byMat.set(mt, []);
      byMat.get(mt).push(gr);
    }
    let first = null;
    for (const [mt, grs] of byMat) {
      const part = new THREE.BufferGeometry();
      const n = grs.reduce((s, gr) => s + gr.count, 0);
      for (const [name, attr] of Object.entries(g0.attributes)) {
        const k = attr.itemSize, arr = new attr.array.constructor(n * k);
        let o = 0;
        for (const gr of grs) { arr.set(attr.array.subarray(gr.start * k, (gr.start + gr.count) * k), o); o += gr.count * k; }
        part.setAttribute(name, new THREE.BufferAttribute(arr, k, attr.normalized));
      }
      part.computeBoundingSphere();
      const m = new THREE.Mesh(part, mt);
      if (parent) parent.add(m);
      first = first || m;
    }
    return first;
  };
  const merge = (geos) => { const g = mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x)), false); g.computeBoundingSphere(); return g; };

  // ------------------------------------------------------------- frames
  const pEsc = L.escape, pPal = L.pallet, pBal = L.balance;
  const d = E.palletToEscape;
  const gamma = Math.atan2(pPal[1] - pEsc[1], pPal[0] - pEsc[0]); // escape → pallet line of centres
  const gammaPB = Math.atan2(pBal[1] - pPal[1], pBal[0] - pPal[0]); // pallet → balance (fork angle 0)
  const delta = gamma - gammaPB; // the two lines are collinear within ~1.4°
  const Lpb = E.palletToBalance;
  const phi0 = spec.timing.forkHalfDeg * DEG;
  const liftHalf = (spec.timing.liftDeg / 2) * DEG;
  const R = E.escapeTipRadius;
  const rj = E.rollerJewelRadius;

  // ------------------------------------------------------------- escapement design
  const P = { hc: 0.09, gc: 6, w: 0.21, wX: 0.15, lock: 0.04, lockX: 0.055, hImp: 0.19, hImpX: 0.21, draw: 2, drawX: 0, stoneLen: 0.75 };
  const tooth = toothProfile(R, P.hc, P.gc);
  const stones = designStones({ d, phi0, Rl: tooth.Rl, P });
  const esc = solveEscapement({ d, phi0, stones, tooth: tooth.pts });
  // Escape wheel's constant local rotation: at an even rest (rot.escape ≡ 0 mod 24°)
  // tooth corners sit at E-angle betaE, i.e. world angle gamma + betaE.
  const psi = gamma + stones.betaE;
  // Stones in fork coordinates (+X towards the balance staff).
  const stonesF = { entry: stones.entry.map((p) => rot2(p, delta)), exit: stones.exit.map((p) => rot2(p, delta)) };

  // ===================================================================== ESCAPE WHEEL
  {
    const object = new THREE.Group();
    object.position.set(pEsc[0], pEsc[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);

    // wheel: 15 club teeth on a thin rim, two crossing bars
    const outline = [];
    for (let i = 0; i < 15; i++) {
      const a = i * TAU / 15;
      for (const q of tooth.pts) outline.push(rot2(q, a));
      const a0 = -4.0 * DEG, a1 = TAU / 15 - 16.5 * DEG;
      for (let k = 1; k <= 5; k++) { const t = k / 6; outline.push(pol(tooth.rootR - 0.012 * Math.sin(Math.PI * t), a + a0 + (a1 - a0) * t)); }
    }
    const shape = new THREE.Shape(outline.map(V2));
    shape.holes.push(...gear.spokeHoles({ count: 4, rimInner: tooth.rootR - 0.18, hubOuter: 0.3, spokeWidth: 0.12, phase: 0.31, steps: 14 }));
    const zw = Z.escapeWheel;
    const wheelGeo = slab(THREE, [shape], zw - 0.06, zw + 0.06, 0.01, 1);
    const wheel = new THREE.Group();
    wheel.rotation.z = psi;
    rotor.add(wheel);
    mesh(wheelGeo, [M.steelSatin, M.steelPolished], wheel);
    // hub collet between wheel and pinion
    const pTop = Z.pinionOf.escape[1]; // pinion end nearest the wheel
    const hubGeo = lathe(THREE, [[0, pTop - 0.02], [0.2, pTop - 0.02], [0.24, pTop + 0.01], [0.24, zw - 0.065], [0.21, zw + 0.065], [0.18, zw + 0.09], [0, zw + 0.09]], 32);
    mesh(hubGeo, M.steelPinion, rotor);
    // pinion, phased to mesh the fourth wheel (wheels keep local phase 0)
    const [pz0, pz1] = Z.pinionOf.escape;
    const pin = mesh(gear.pinionGeometry({ leaves: spec.train.escape.pinion, module: spec.modules.fourth, length: pz1 - pz0 }), M.steelPinion, rotor);
    pin.position.z = (pz0 + pz1) / 2;
    const phiFE = Math.atan2(pEsc[1] - L.fourth[1], pEsc[0] - L.fourth[0]);
    pin.rotation.z = gear.meshPhase(phiFE, spec.train.fourth.teeth, spec.train.escape.pinion, 0);
    // arbor: lower pivot in the main plate, upper pivot in the 3/4 plate
    mesh(gear.arborGeometry({ r: 0.085, z0: -2.25, z1: -0.62, pivotR: 0.05, pivotLen: 0.22 }), M.steelPinion, rotor);

    // Wheel angle during the impulse window follows the solved contact profile.
    const tabOdd = esc.odd, tabEven = esc.even, NT = tabOdd.length - 1;
    const step = 12 * DEG;
    // Only the wheel's teeth follow the solved profile; the pinion stays on the
    // kinematic angle so its mesh with the fourth wheel (driven by the same beat
    // counter) stays exact. The two differ by at most a few degrees for ~9 ms.
    const update = (s) => {
      const Pb = s.P;
      const base = Math.floor(Pb);
      const frac = Pb - base;
      if (frac <= 0) { wheel.rotation.z = psi; return; }
      const k = base + 1; // the beat in progress
      const even = k % 2 === 0;
      let q = even ? (phi0 - s.fork) / (2 * phi0) : (s.fork + phi0) / (2 * phi0);
      q = Math.min(1, Math.max(0, q));
      const tab = even ? tabEven : tabOdd;
      const x = q * NT, i = Math.min(NT - 1, x | 0), t = x - i;
      const e = tab[i] + (tab[i + 1] - tab[i]) * t;
      wheel.rotation.z = psi + (e - frac) * step;
    };

    object.userData.escapement = { tables: esc, psi, gamma, delta, stones, stonesF, P, tooth: tooth.pts };
    reg.add({
      id: 'escape-wheel', name: 'Escape wheel', category: 'escapement', side: 'back', exposed: false,
      object, rotor, drive: { key: 'escape' }, update,
      explode: spec.explode['escape-wheel'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('escape-wheel'),
      anchor: [Math.cos(gamma + 2.4) * R * 0.85, Math.sin(gamma + 2.4) * R * 0.85, zw],
      description: 'Last wheel of the gear train. Its 15 club-shaped steel teeth are let through one half-tooth at a time by the pallet stones, and each time a tooth slides across a stone it gives the lever a small push that keeps the balance swinging.',
      facts: {
        Teeth: '15 Swiss club teeth', 'Tip diameter': `${(2 * R).toFixed(2)} mm`, Pinion: `${spec.train.escape.pinion} leaves (driven by the fourth wheel)`,
        Step: '12° per beat, 1 turn in 5 s', Material: 'Hardened, polished steel',
      },
      live: (s) => `beat ${(s.beatToday ?? Math.floor(s.P)).toLocaleString('en-US')} today · ${((((s.rot.escape / DEG) % 360) + 360) % 360).toFixed(0)}°`,
      priority: 1,
    });
  }

  // ===================================================================== PALLET FORK
  const zf = Z.palletFork;
  {
    const object = new THREE.Group();
    object.position.set(pPal[0], pPal[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const base = new THREE.Group();
    base.rotation.z = gammaPB; // local +X points at the balance staff
    rotor.add(base);

    // Pads that hold the outer part of each stone (oriented boxes in fork coordinates).
    const pad = (stone) => {
      const [LC, , OB, OF] = stone;
      const fx = OF[0] - LC[0], fy = OF[1] - LC[1], fl = Math.hypot(fx, fy);
      const f = [fx / fl, fy / fl];
      const tx = OB[0] - OF[0], ty = OB[1] - OF[1];
      const a0 = 0.2, a1 = fl + 0.06;
      return { c: [LC[0] + (f[0] * (a0 + a1)) / 2 + tx / 2, LC[1] + (f[1] * (a0 + a1)) / 2 + ty / 2], hx: (a1 - a0) / 2, hy: Math.hypot(tx, ty) / 2 + 0.075, ang: Math.atan2(f[1], f[0]), f };
    };
    const pads = [pad(stonesF.entry), pad(stonesF.exit)];
    // Clearance for the impulse jewel outside the lift (fork resting on a banking).
    const Sm = [Lpb * Math.cos(phi0), Lpb * Math.sin(phi0)], Sp = [Lpb * Math.cos(phi0), -Lpb * Math.sin(phi0)];
    const amax = 330 * DEG;
    const sweep = (x, y) => Math.min(
      sd.arc(x, y, Sm[0], Sm[1], rj, Math.PI + liftHalf + phi0, Math.PI + amax + phi0),
      sd.arc(x, y, Sp[0], Sp[1], rj, Math.PI - amax - phi0, Math.PI - liftHalf - phi0),
    ) - 0.115;
    const hx = Lpb - 0.78; // fork head centre
    const forkSDF = (x, y) => {
      let f = sd.circle(x, y, 0, 0, 0.3);
      f = smin(f, sd.capsule(x, y, 0.1, 0, hx - 0.24, 0, 0.21, 0.15), 0.1);
      f = smin(f, sd.box(x, y, hx, 0, 0.29, 0.25, 0, 0.07), 0.12);
      for (const p of pads) {
        const b = [p.c[0] - p.f[0] * p.hx * 0.3, p.c[1] - p.f[1] * p.hx * 0.3];
        f = smin(f, sd.capsule(x, y, 0, 0, b[0], b[1], 0.17, 0.12), 0.14);
        f = smin(f, sd.box(x, y, p.c[0], p.c[1], p.hx, p.hy, p.ang, 0.05), 0.1);
      }
      let hole = sd.box(x, y, 0.86, 0, 0.27, 0.055, 0, 0.05);
      hole = Math.min(hole, sd.box(x, y, 1.67, 0, 0.36, 0.05, 0, 0.045));
      for (const p of pads) {
        const m = Math.hypot(p.c[0], p.c[1]), u = [p.c[0] / m, p.c[1] / m];
        hole = Math.min(hole, sd.capsule(x, y, u[0] * 0.5, u[1] * 0.5, u[0] * (m - 0.42), u[1] * (m - 0.42), 0.045, 0.06));
      }
      hole = Math.min(hole, sd.circle(x, y, 0.42, 0.52, 0.06), sd.circle(x, y, 0, 0, 0.07));
      f = Math.max(f, -hole);
      f = Math.max(f, -sd.box(x, y, hx + 0.34, 0, 0.4, 0.098, 0, 0)); // slot
      f = smax(f, -sweep(x, y), 0.03); // horns shaped around the jewel's path
      return f;
    };
    const forkShapes = sdfShapes(THREE, forkSDF, [-1.25, -2.0, hx + 0.6, 2.0], 0.008, 0.0015);
    const zfb = [zf - 0.06, zf + 0.04]; // lever body (stones span the full L0 level)
    mesh(slab(THREE, forkShapes, zfb[0], zfb[1], 0.012, 2), [M.steelSatin, M.steelPolished], base);
    // pallet stones (taller than the lever, set in the pads)
    for (const s of [stonesF.entry, stonesF.exit]) {
      mesh(slab(THREE, [new THREE.Shape(s.map(V2))], zf - 0.075, zf + 0.075, 0.006, 1), pinkRuby, base);
    }
    // guard pin (dart) under the lever at the safety-roller level, just short of the roller
    const zs = [zfb[1], zfb[1] + 0.04];
    const tip = Lpb - 0.42 - 0.05;
    const dart = new THREE.Shape([V2([tip - 0.6, -0.045]), V2([tip - 0.08, -0.045]), V2([tip, 0]), V2([tip - 0.08, 0.045]), V2([tip - 0.6, 0.045])]);
    mesh(slab(THREE, [dart], zs[0], zs[1], 0.008, 1), M.steelPolished, base);
    // arbor + hub collet
    mesh(gear.arborGeometry({ r: 0.075, z0: -1.3, z1: -0.62, pivotR: 0.045, pivotLen: 0.2 }), M.steelPinion, base);
    mesh(lathe(THREE, [[0, zfb[0] - 0.05], [0.15, zfb[0] - 0.05], [0.18, zfb[0] - 0.025], [0.18, zfb[0]], [0, zfb[0]]], 32), M.steelPolished, base);

    reg.add({
      id: 'pallet-fork', name: 'Pallet fork', category: 'escapement', side: 'back', exposed: false,
      object, rotor, drive: { key: 'fork' },
      explode: spec.explode['pallet-fork'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('pallet-fork'),
      anchor: [Math.cos(gammaPB) * 1.3, Math.sin(gammaPB) * 1.3, zf],
      description: 'The skeletonised steel lever that links the gear train to the balance. Its two ruby pallets alternately lock and release the escape wheel, and its forked end passes the escape wheel\'s push on to the balance\'s impulse jewel.',
      facts: {
        Pallets: '2 synthetic rubies, fixed with shellac', 'Swing': `±${spec.timing.forkHalfDeg}° between the bankings`,
        Embraces: '2½ escape teeth', Layout: 'Straight-line Swiss lever', Material: 'Skeletonised steel (NOMOS swing system)',
      },
      live: (s) => `${(s.fork / DEG).toFixed(1)}°`,
      priority: 1,
    });
  }

  // ===================================================================== BALANCE WHEEL
  const gb = gammaPB + Math.PI; // balance-local +X points at the pallet arbor
  const zr = Z.balanceRim;
  const rimH = E.balanceRimHeight, rimO = E.balanceRadius, rimI = rimO - E.balanceRimWidth;
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const base = new THREE.Group();
    base.rotation.z = gb;
    rotor.add(base);

    // rim: smooth polished ring with rounded edges
    mesh(lathe(THREE, roundedSection(rimI, rimO, zr - rimH / 2, zr + rimH / 2, 0.045, 4), 200), gold, base);
    // three tapered arms flaring into the rim, flush with its back face
    const za = [zr - rimH / 2 + 0.004, zr - rimH / 2 + 0.15];
    const hub = 0.42, rEnd = rimI + 0.12;
    const hw = (r) => 0.075 + 0.13 * Math.exp(-(r - hub) / 0.16) + 0.36 * Math.pow(Math.max(0, (r - 2.7) / (rEnd - 2.7)), 2.2);
    const armA = [90 * DEG, 210 * DEG, 330 * DEG];
    const out = [];
    const rStart = hub, hubArc = Math.hypot(hub, hw(hub)), s0 = Math.atan2(hw(hub), hub);
    for (let j = 0; j < 3; j++) {
      const a = armA[j], an = armA[(j + 1) % 3] + (j === 2 ? TAU : 0);
      const n = 48;
      for (let k = 0; k <= n; k++) { const r = rStart + ((rEnd - rStart) * k) / n; out.push(rot2([r, -hw(r)], a)); }
      for (let k = n; k >= 0; k--) { const r = rStart + ((rEnd - rStart) * k) / n; out.push(rot2([r, hw(r)], a)); }
      // hub arc to the next arm
      const b0 = a + s0, b1 = an - s0;
      for (let k = 1; k < 12; k++) out.push(pol(hubArc, b0 + ((b1 - b0) * k) / 12));
    }
    const armsShape = new THREE.Shape(out.map(V2));
    armsShape.holes.push(gear.circlePath(0.1, 24));
    const goldArm = gold.clone();
    goldArm.roughness = 0.27;
    mesh(slab(THREE, [armsShape], za[0], za[1], 0.02, 2), [goldArm, gold], base);
    // poising holes drilled radially into the rim's outer face
    const holes = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + 0.11 + 0.05 * Math.sin(k * 2.7);
      const g = new THREE.CircleGeometry(0.06, 14);
      g.rotateY(Math.PI / 2);
      g.translate(rimO + 0.002, 0, zr);
      g.rotateZ(a);
      holes.push(g);
    }
    mesh(merge(holes), holeDark, base);
    // balance staff (pivots in the main-plate jewel and the cock's shock setting)
    mesh(lathe(THREE, [
      [0, -2.5], [0.04, -2.5], [0.05, -2.47], [0.05, -2.3], [0.1, -2.25], [0.1, za[0] - 0.04], [0.19, za[0] - 0.02],
      [0.19, za[1] + 0.02], [0.11, za[1] + 0.02], [0.11, -0.95], [0.05, -0.88], [0.05, -0.65], [0.045, -0.62], [0, -0.62],
    ], 28), M.steelPinion, base);

    reg.add({
      id: 'balance-wheel', name: 'Balance wheel', category: 'regulating', side: 'back', exposed: true,
      object, rotor, drive: { key: 'balance' },
      explode: spec.explode['balance-wheel'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('balance-wheel'),
      anchor: [Math.cos(-100 * DEG) * rimO, Math.sin(-100 * DEG) * rimO, zr],
      description: 'The heart of the watch: a gold-coloured wheel that swings to and fro under the pull of the hairspring, six swings a second (three full cycles). Every swing releases the gear train by one step, so its steady rhythm sets the rate of the whole watch.',
      facts: {
        Diameter: `${(2 * rimO).toFixed(1)} mm`, Frequency: '3 Hz · 21,600 vibrations/h', Amplitude: `≈${spec.timing.amplitudeDeg}° when fully wound`,
        Arms: '3, tapered', Poising: 'Small holes drilled into the rim',
      },
      live: (s) => `${(s.balance / DEG).toFixed(0)}° · amplitude ${(s.amplitude / DEG).toFixed(0)}°`,
      priority: 1,
    });
  }

  // ===================================================================== ROLLER
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const base = new THREE.Group();
    base.rotation.z = gb;
    rotor.add(base);
    const zt = [Z.roller - 0.1, Z.roller - 0.055]; // impulse roller table (back side of the L0 level)
    mesh(lathe(THREE, [[0.1, zt[0]], [0.88, zt[0]], [0.9, zt[0] + 0.02], [0.9, zt[1] - 0.02], [0.88, zt[1]], [0.1, zt[1]]], 72), M.steelPolished, base);
    // D-shaped impulse jewel at the roller-jewel radius, flat face towards the fork
    const D = [];
    for (let k = 0; k <= 24; k++) { const a = -70 * DEG - (220 * DEG * k) / 24; D.push([rj + 0.08 * Math.cos(a), 0.08 * Math.sin(a)]); }
    const jz = [zt[0] + 0.01, zf + 0.04]; // reaches through the fork slot, not up to the guard-pin level
    mesh(slab(THREE, [new THREE.Shape(ccw(D).map(V2))], jz[0], jz[1], 0.006, 1), redRuby, base);
    // safety roller with the crescent that lets the guard pin pass
    const safe = new THREE.Shape();
    {
      const pts = [];
      for (let k = 0; k <= 80; k++) {
        const a = (k / 80) * TAU;
        let r = 0.42;
        const da = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(da) < 0.33) r = 0.42 - 0.1 * Math.cos((da / 0.33) * (Math.PI / 2));
        pts.push(V2(pol(r, a)));
      }
      safe.setFromPoints(pts);
      safe.holes.push(gear.circlePath(0.1, 20));
    }
    mesh(slab(THREE, [safe], zf + 0.045, zf + 0.08, 0.006, 1), M.steelPolished, base);
    mesh(lathe(THREE, [[0, zt[0]], [0.2, zt[0]], [0.2, zf + 0.045], [0, zf + 0.045]], 24), M.steelPolished, base);

    reg.add({
      id: 'roller', name: 'Double roller', category: 'regulating', side: 'back', exposed: false,
      object, rotor, drive: { key: 'balance' },
      explode: spec.explode.roller ?? [0, 0, 0], explodeDelay: spec.explodeDelay('roller'),
      anchor: [Math.cos(gb) * rj, Math.sin(gb) * rj, Z.roller],
      description: 'Two small discs on the balance staff. The larger carries the red impulse jewel that flicks the pallet fork across and receives its push back; the smaller one, with a notch, keeps the fork from jumping over while the jewel is away.',
      facts: { 'Impulse jewel': `D-shaped ruby at r ${rj} mm`, 'Lift angle': `${spec.timing.liftDeg}° of balance swing`, 'Fork : balance': `1 : ${(spec.timing.liftDeg / 2 / spec.timing.forkHalfDeg).toFixed(1)}` },
      priority: 3,
    });
  }

  // ===================================================================== HAIRSPRING
  const HS = E.hairspring;
  const angKey = Math.atan2(E.regulatorKey[1] - pBal[1], E.regulatorKey[0] - pBal[0]);
  const angStud = Math.atan2(E.studCarrier[1] - pBal[1], E.studCarrier[0] - pBal[0]);
  const rOut = HS.terminalRadius ?? HS.outerRadius; // where the key pins and the stud hold it
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const zh = Z.hairspring;
    // Archimedean body + terminal curve rising to the concentric outer coil that runs
    // between the regulator pins to the stud. ψ: unwound angle from the inner end;
    // the spring winds outwards clockwise (seen from the dial).
    const dKS = ((((angKey - angStud) % TAU) + TAU) % TAU); // key → stud, clockwise
    const psiK = TAU * HS.coils - dKS;
    const rBodyOut = HS.terminalRadius ? HS.outerRadius : rOut - 0.5; // body diameter about 4.4
    const b = (rBodyOut - HS.innerRadius) / psiK;
    const dT = Math.PI * 1.05;
    const alphaI = angKey + psiK;
    const radius = (ps) => {
      if (ps >= psiK) return rOut;
      const rb = HS.innerRadius + b * ps;
      if (ps < psiK - dT) return rb;
      const t = (ps - (psiK - dT)) / dT;
      return rb + (rOut - rb) * t * t * (3 - 2 * t);
    };
    const perTurn = 100;
    const N = Math.ceil(((psiK + dKS) / TAU) * perTurn) + 1;
    const ps = new Float32Array(N), rr = new Float32Array(N), aa = new Float32Array(N), sfrac = new Float32Array(N);
    let len = 0, lenK = 0;
    const lens = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      ps[i] = ((psiK + dKS) * i) / (N - 1);
      rr[i] = radius(ps[i]);
      aa[i] = alphaI - ps[i];
      if (i > 0) len += Math.hypot(rr[i] * Math.cos(aa[i]) - rr[i - 1] * Math.cos(aa[i - 1]), rr[i] * Math.sin(aa[i]) - rr[i - 1] * Math.sin(aa[i - 1]));
      lens[i] = len;
      if (ps[i] <= psiK) lenK = len;
    }
    for (let i = 0; i < N; i++) sfrac[i] = ps[i] >= psiK ? 0 : 1 - lens[i] / lenK;

    const th = HS.thickness / 2, z0 = zh - HS.height / 2, z1 = zh + HS.height / 2;
    const pos = new Float32Array(N * 8 * 3), nor = new Float32Array(N * 8 * 3);
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      for (let f = 0; f < 4; f++) {
        const a = i * 8 + f * 2, c = (i + 1) * 8 + f * 2;
        idx.push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, zh), rOut + 0.3);
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(-rOut - 0.1, -rOut - 0.1, z0), new THREE.Vector3(rOut + 0.1, rOut + 0.1, z1));
    const cx = new Float32Array(N), cy = new Float32Array(N);
    let lastBal = NaN;
    for (let i = 0; i < N; i++) { // constant normals of the top / bottom edges
      const o = i * 24;
      nor[o + 8] = nor[o + 11] = 1;
      nor[o + 20] = nor[o + 23] = -1;
    }
    const fill = (bal) => {
      for (let i = 0; i < N; i++) {
        const a = aa[i] + bal * sfrac[i];
        cx[i] = rr[i] * Math.cos(a);
        cy[i] = rr[i] * Math.sin(a);
      }
      for (let i = 0; i < N; i++) {
        const i0 = i > 0 ? i - 1 : i, i1 = i < N - 1 ? i + 1 : i;
        let tx = cx[i1] - cx[i0], ty = cy[i1] - cy[i0];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl; ty /= tl;
        const nx = ty, ny = -tx; // in-plane normal
        const xo = cx[i] + nx * th, yo = cy[i] + ny * th, xi = cx[i] - nx * th, yi = cy[i] - ny * th;
        const o = i * 24;
        // faces: outer side (+n), top z1 (+z), inner side (−n), bottom z0 (−z); 2 vertices each
        pos[o] = xo; pos[o + 1] = yo; pos[o + 2] = z0; pos[o + 3] = xo; pos[o + 4] = yo; pos[o + 5] = z1;
        pos[o + 6] = xo; pos[o + 7] = yo; pos[o + 8] = z1; pos[o + 9] = xi; pos[o + 10] = yi; pos[o + 11] = z1;
        pos[o + 12] = xi; pos[o + 13] = yi; pos[o + 14] = z1; pos[o + 15] = xi; pos[o + 16] = yi; pos[o + 17] = z0;
        pos[o + 18] = xi; pos[o + 19] = yi; pos[o + 20] = z0; pos[o + 21] = xo; pos[o + 22] = yo; pos[o + 23] = z0;
        nor[o] = nor[o + 3] = nx; nor[o + 1] = nor[o + 4] = ny;
        nor[o + 12] = nor[o + 15] = -nx; nor[o + 13] = nor[o + 16] = -ny;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
    };
    fill(0);
    const spring = mesh(geo, blue, object);
    spring.frustumCulled = false;
    // collet on the staff (turns with the balance)
    const collet = new THREE.Group();
    object.add(collet);
    const cr = HS.innerRadius - 0.08;
    mesh(lathe(THREE, [[0.1, zh - 0.06], [cr - 0.03, zh - 0.06], [cr, zh - 0.035], [cr, zh + 0.035], [cr - 0.03, zh + 0.06], [0.1, zh + 0.06]], 40), M.steelPolished, collet);
    const tab = new THREE.BoxGeometry(0.12, 0.07, HS.height).translate(HS.innerRadius - 0.03, 0, zh).rotateZ(alphaI);
    mesh(tab, M.steelPolished, collet);

    const update = (s) => {
      const bal = s.rot.balance;
      collet.rotation.z = bal;
      if (bal === lastBal) return;
      lastBal = bal;
      fill(bal);
    };

    reg.add({
      id: 'hairspring', name: 'Hairspring (blued)', category: 'regulating', side: 'back', exposed: true,
      object, update,
      explode: spec.explode.hairspring ?? [0, 0, 0], explodeDelay: spec.explodeDelay('hairspring'),
      anchor: [Math.cos(angKey - 0.6) * (rOut - 0.05), Math.sin(angKey - 0.6) * (rOut - 0.05), zh],
      description: 'A flat spiral of tempered blue steel, made in-house by NOMOS. It pulls the balance back towards its rest position after every swing; its length and stiffness set the beat. The outer coil passes between the two pins of the regulator key and ends in the stud.',
      facts: { Type: 'Flat spiral with terminal curve', Coils: `${HS.coils}`, Colour: 'Thermally blued', Blade: `${HS.thickness} × ${HS.height} mm`, Made: 'In-house (NOMOS swing system)' },
      priority: 1,
    });
  }

  // ===================================================================== BALANCE COCK
  const bc = F.balanceCock;
  const [zc0, zc1] = [Z.balanceCock[0], Z.balanceCock[1]]; // top (back) face, bottom face
  const blocR = 1.5; // hole in the cock ring for the shock-absorber setting
  {
    const object = new THREE.Group();
    root.add(object);
    const [rcx, rcy] = bc.ringCenter;
    const Rp = F.threeQuarterPlateRadius;
    // Top-face outline traced on the official back render (spec.frame.balanceCock): the
    // broad foot between the steel-screw recess and the "MADE IN GERMANY" rim, out to the
    // plate's edge, and the ≈3.5 mm arm down to the ring housing round the balance staff.
    // The frame module cuts the three-quarter plate along this same outline (plus the
    // chamfer below), so the two parts meet exactly with a hairline joint.
    const outline = cockOutline(bc);
    const cockSDF = (x, y) => {
      let f = Math.max(sd.poly(x, y, outline), Math.hypot(x, y) - Rp);
      f = smin(f, sd.circle(x, y, rcx, rcy, bc.ringRadius), 0.5);
      f = Math.max(f, -sd.circle(x, y, bc.screw[0], bc.screw[1], 0.86));
      return Math.max(f, -sd.circle(x, y, rcx, rcy, blocR));
    };
    const shapes = sdfShapes(THREE, cockSDF, [-12.0, -3.2, -3.4, 8.6], 0.02, 0.003);
    // polished bevel ≈0.06 wide all round, the bright outline of the cock in the photos
    const cockGeo = slab(THREE, shapes, zc0, zc1, 0.06, 3);
    const rib = spec.movement.ribbing;
    planarUV(cockGeo, rib.uvScale, rib.uvOffset ?? [0, 0], rib.uvAngle);
    mesh(cockGeo, [ribbedMaterial(M), M.rhodiumBevel], object);
    // Wide frosted chamfer along the cock's left flank (back view), from the ring housing
    // up round the curve to the steel-screw recess: in the photos it reads as the grey
    // channel between the cock and the plate. It slopes down from the cock's top face
    // into the plate's pocket.
    {
      const fl = cockFlank(bc);
      const n = fl.pts.length, slope = 0.58;
      const pos = [];
      const P = [], O = [], H = [];
      for (let i = 0; i < n; i++) {
        const [nx, ny] = fl.nor[i], w = fl.wid[i];
        P.push([fl.pts[i][0] - 0.03 * nx, fl.pts[i][1] - 0.03 * ny]);
        O.push([fl.pts[i][0] + w * nx, fl.pts[i][1] + w * ny]);
        H.push(Math.min(zc1 - 0.002, zc0 + slope * w));
      }
      const q = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < n - 1; i++) {
        const a0 = [...P[i], zc0 - 0.0005], a1 = [...P[i + 1], zc0 - 0.0005];
        const o0 = [...O[i], H[i]], o1 = [...O[i + 1], H[i + 1]];
        const ob0 = [...O[i], zc1], ob1 = [...O[i + 1], zc1], ib0 = [...P[i], zc1], ib1 = [...P[i + 1], zc1];
        q(a0, o0, o1, a1); q(o0, ob0, ob1, o1); q(ob0, ib0, ib1, ob1);
      }
      const e = n - 1; // closed end at the screw recess
      q([...P[e], zc0 - 0.0005], [...O[e], H[e]], [...O[e], zc1], [...P[e], zc1]);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      const frost = M.rhodium.clone();
      frost.color.set(0xcdd0d4);
      frost.roughness = 0.5;
      frost.side = THREE.DoubleSide;
      mesh(g, frost, object);
    }
    // polished countersink and the blued cock screw
    const [sx, sy] = bc.screw;
    const cs = lathe(THREE, [[0.76, zc1], [0.76, zc0 + 0.07], [0.86, zc0]], 48);
    cs.translate(sx, sy, 0);
    mesh(cs, M.rhodiumBevel, object);
    const headR = F.blueScrewHeadDiameter / 2;
    const half = (sgn) => {
      const pts = [];
      for (let k = 0; k <= 24; k++) { const a = -Math.PI / 2 + (Math.PI * k) / 24; pts.push([0.065 + Math.max(0, headR * Math.cos(a) - 0.065), headR * Math.sin(a)]); }
      return new THREE.Shape(pts.map((p) => V2([p[0] * sgn, p[1]])));
    };
    const headTop = Z.screwHeads ? Z.screwHeads[0] : zc0 - 0.14, headSlot = headTop + 0.05;
    const head = merge([
      slab(THREE, [half(1), half(-1)], headTop, zc0 + 0.03, 0.03, 3),
      new THREE.CylinderGeometry(headR - 0.02, headR - 0.02, 0.1, 40).rotateX(Math.PI / 2).translate(0, 0, headSlot + 0.05),
    ]);
    head.rotateZ(20 * DEG);
    head.translate(sx, sy, 0);
    mesh(head, bluedScrewMaterial(M), object);

    reg.add({
      id: 'balance-cock', name: 'Balance cock', category: 'regulating', side: 'back', exposed: true,
      object, xray: true,
      explode: spec.explode['balance-cock'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('balance-cock'),
      anchor: [-5.9, 2.6, zc0],
      description: 'The bridge that holds the top pivot of the balance. Its broad foot sits in a pocket of the three-quarter plate, flush with the plate and fixed by a single tempered blue screw; the arm reaches over the balance to a ring that carries the shock setting and the regulator.',
      facts: { Finish: 'Glashütte ribbing, polished bevels', Screw: '1 tempered blue screw', Carries: 'Shock setting, regulator, stud carrier', Material: 'Rhodium-plated brass' },
      priority: 1,
    });
  }

  // ===================================================================== REGULATOR (DUW regulation system)
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const [zR0, zR1] = Z.regulatorRings ?? [zc0 - 0.08, zc0];
    const zrA = [(zR0 + zR1) / 2, zR1]; // regulator ring (lower, on the cock)
    const zsA = [zR0, (zR0 + zR1) / 2]; // stud-carrier ring (upper)
    const ck = [Math.cos(angKey), Math.sin(angKey)], cs = [Math.cos(angStud), Math.sin(angStud)];
    const ringGap = (x, y, ang, hw) => sd.box(x, y, Math.cos(ang) * 1.5, Math.sin(ang) * 1.5, 0.7, hw, ang, 0);
    const keyR = Math.hypot(E.regulatorKey[0] - pBal[0], E.regulatorKey[1] - pBal[1]);
    const studR = Math.hypot(E.studCarrier[0] - pBal[0], E.studCarrier[1] - pBal[1]);
    // Regulator ring (lower): a narrow ring around the shock setting, mostly hidden under
    // the stud-carrier ring; only its inner edge and the index arm show.
    const regSDF = (x, y) => {
      let f = Math.abs(Math.hypot(x, y) - 1.73) - 0.22; // r 1.51 … 1.95
      f = smin(f, sd.capsule(x, y, ck[0] * 1.8, ck[1] * 1.8, ck[0] * (keyR - 0.45), ck[1] * (keyR - 0.45), 0.24, 0.2), 0.15);
      const t = [-ck[1], ck[0]];
      for (const sgn of [-1, 1]) f = smin(f, sd.capsule(x, y, ck[0] * (keyR - 0.5) + t[0] * 0.15 * sgn, ck[1] * (keyR - 0.5) + t[1] * 0.15 * sgn, ck[0] * (keyR + 0.42) + t[0] * 0.15 * sgn, ck[1] * (keyR + 0.42) + t[1] * 0.15 * sgn, 0.075), 0.06);
      f = Math.max(f, -sd.capsule(x, y, ck[0] * (keyR - 0.75), ck[1] * (keyR - 0.75), ck[0] * (keyR - 0.2), ck[1] * (keyR - 0.2), 0.055));
      return f;
    };
    // Stud-carrier ring (upper): the C-shaped ring that dominates the view, open at about
    // 10:30 (back view), its arm ending in a squarish block with the stud's dimpled head
    // and a window onto the stud.
    const studSDF = (x, y) => {
      let f = Math.abs(Math.hypot(x, y) - 1.83) - 0.2; // r 1.63 … 2.03
      f = Math.max(f, -ringGap(x, y, 55 * DEG, 0.13));
      f = smin(f, sd.capsule(x, y, cs[0] * 1.9, cs[1] * 1.9, cs[0] * (studR - 0.3), cs[1] * (studR - 0.3), 0.26, 0.24), 0.2);
      f = smin(f, sd.box(x, y, cs[0] * (studR - 0.02), cs[1] * (studR - 0.02), 0.33, 0.31, angStud, 0.1), 0.08);
      const wc = 2.4;
      return Math.max(f, -sd.box(x, y, cs[0] * wc, cs[1] * wc, 0.13, 0.15, angStud, 0.03));
    };
    const regShapes = sdfShapes(THREE, regSDF, [-3.6, -3.6, 3.6, 2.2], 0.01, 0.002);
    const studShapes = sdfShapes(THREE, studSDF, [-3.6, -3.6, 3.6, 2.4], 0.01, 0.002);
    mesh(slab(THREE, regShapes, zrA[0], zrA[1], 0.008, 1), [M.steelSatin, M.steelPolished], object);
    mesh(slab(THREE, studShapes, zsA[0], zsA[1], 0.008, 1), [M.steelSatin, M.steelPolished], object);
    // gold "spring key" on the regulator arm, with the two pins straddling the outer coil
    const kc = [ck[0] * keyR, ck[1] * keyR];
    const keyShape = sdfShapes(THREE, (x, y) => sd.box(x, y, kc[0], kc[1], 0.42, 0.27, angKey + Math.PI / 2, 0.1), [kc[0] - 0.6, kc[1] - 0.6, kc[0] + 0.6, kc[1] + 0.6], 0.006, 0.0015);
    mesh(slab(THREE, keyShape, zsA[0] - 0.01, zrA[0], 0.01, 2), [goldSatin, gold], object);
    const zk = zsA[0] - 0.01; // back face of the key
    const dimple = lathe(THREE, [[0, zk - 0.012], [0.06, zk - 0.016], [0.1, zk - 0.015], [0.12, zk - 0.008], [0.12, zk + 0.002]], 28); // round boss, dimpled
    dimple.translate(kc[0], kc[1], 0);
    mesh(dimple, gold, object);
    const pins = [];
    for (const off of [-0.058, 0.058]) {
      const r = rOut + off;
      pins.push(new THREE.CylinderGeometry(0.026, 0.026, (Z.hairspring + HS.height / 2 + 0.005) - zrA[0], 12).rotateX(Math.PI / 2)
        .translate(ck[0] * r, ck[1] * r, (zrA[0] + Z.hairspring + HS.height / 2 + 0.005) / 2));
    }
    mesh(merge(pins), M.steelPolished, object);
    // stud: post holding the spring's outer end, its head on the stud-carrier arm
    const sp = [cs[0] * (rOut + 0.04), cs[1] * (rOut + 0.04)];
    const zBot = Z.hairspring + HS.height / 2 + 0.005;
    const stud = merge([
      new THREE.CylinderGeometry(0.11, 0.11, zBot - zsA[0], 20).rotateX(Math.PI / 2).translate(sp[0], sp[1], (zsA[0] + zBot) / 2),
      lathe(THREE, [[0, zsA[0] - 0.012], [0.05, zsA[0] - 0.006], [0.1, zsA[0] - 0.022], [0.14, zsA[0] - 0.025], [0.16, zsA[0] - 0.01], [0.16, zsA[0] + 0.01]], 32).translate(cs[0] * studR, cs[1] * studR, 0),
    ]);
    mesh(stud, M.steelPolished, object);

    reg.add({
      id: 'regulator', name: 'DUW regulation system', category: 'regulating', side: 'back', exposed: true,
      object,
      explode: spec.explode.regulator ?? [0, 0, 0], explodeDelay: spec.explodeDelay('regulator'),
      anchor: [kc[0], kc[1], zsA[0]],
      description: 'NOMOS\'s screwless fine regulation: two rings on the balance cock. Turning the regulator ring moves the gold spring key, whose two pins change the active length of the hairspring (faster / slower); the stud-carrier ring holds the spring\'s outer end and is turned to put the watch in beat.',
      facts: { System: 'DUW regulation system', 'Regulating screw': 'None', 'Spring key': '2 pins straddling the outer coil', 'Stud carrier': 'Separate ring for beat setting', Adjusted: 'In six positions' },
      priority: 2,
    });
  }

  // ===================================================================== SHOCK ABSORBER
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    // Proportions from the official back render (crop around the balance staff): cap
    // jewel Ø ≈ 1.2, lyre top bar at r ≈ 0.67 with a tab into the 12 o'clock notch, sides
    // bowed in onto the cap jewel, open bottom whose two free ends drop into the 6 o'clock
    // notch; satin setting band r ≈ 0.86–1.46 inside the regulator rings.
    const ztop = Z.shockTop;
    const zLy = [ztop, ztop + 0.035]; // lyre spring
    const zJ = zLy[1]; // cap-jewel top, the lyre rests on it
    const zBand = [zJ + 0.02, zJ + 0.055]; // raised band of the setting (back face first)
    // setting (bloc) seated in the cock's ring: body, floor around the cap jewel
    mesh(lathe(THREE, [[0.6, zBand[1] + 0.012], [0.86, zBand[1] + 0.012], [0.86, zBand[1]], [blocR - 0.015, zBand[1]], [blocR - 0.015, zc1 + 0.01], [0.6, zc1 + 0.01]], 96), M.rhodium, object);
    // raised satin band with the two notches the spring's tab and free ends sit in
    const band = sdfShapes(THREE, (x, y) => {
      let f = Math.abs(Math.hypot(x, y) - 1.16) - 0.3; // r 0.86 … 1.46
      f = Math.max(f, -sd.box(x, y, 0, 1.2, 0.3, 0.45, 0, 0.02));
      return Math.max(f, -sd.box(x, y, 0, -1.2, 0.4, 0.45, 0, 0.02));
    }, [-1.6, -1.6, 1.6, 1.6], 0.008, 0.0015);
    mesh(slab(THREE, band, zBand[0], zBand[1], 0.012, 2), [M.steelSatin, M.steelPolished], object);
    // cap jewel, slightly domed, with the hole jewel's olive and the pivot showing through
    mesh(lathe(THREE, [[0, zJ - 0.004], [0.12, zJ - 0.003], [0.2, zJ + 0.004], [0.32, zJ + 0.003], [0.5, zJ + 0.008], [0.58, zJ + 0.022], [0.6, zJ + 0.035], [0.6, zBand[1] + 0.012], [0, zBand[1] + 0.012]], 64), pinkRuby, object);
    // lyre spring (gold wire): closed top with a tab, inward-bowed sides pressing on the
    // cap jewel, open bottom with two free ends
    const half = [[0, 0.665], [0.55, 0.665], [0.64, 0.62], [0.61, 0.46], [0.53, 0.28], [0.485, 0.09], [0.5, -0.1], [0.575, -0.28], [0.68, -0.41], [0.65, -0.52], [0.5, -0.57], [0.34, -0.6], [0.29, -0.68], [0.29, -1.0]];
    const lyre = (x, y) => {
      const ax = Math.abs(x);
      let f = Infinity;
      for (let i = 0; i < half.length - 1; i++) f = Math.min(f, sd.capsule(ax, y, half[i][0], half[i][1], half[i + 1][0], half[i + 1][1], 0.053));
      return smin(f, sd.box(x, y, 0, 0.92, 0.23, 0.27, 0, 0.06), 0.05);
    };
    const lyreShapes = sdfShapes(THREE, lyre, [-0.9, -1.15, 0.9, 1.3], 0.006, 0.0012);
    mesh(slab(THREE, lyreShapes, zLy[0], zLy[1], 0.008, 2), [gold, gold], object);

    reg.add({
      id: 'shock-absorber', name: 'Shock absorber', category: 'regulating', side: 'back', exposed: true,
      object,
      explode: spec.explode['shock-absorber'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('shock-absorber'),
      anchor: [0, 0, ztop],
      description: 'Incabloc-type shock protection for the balance\'s fragile top pivot. A gold-coloured lyre spring holds the cap jewel and its jewel setting; a knock lets the setting give way and spring back instead of the pivot breaking.',
      facts: { Type: 'Incabloc-type lyre spring', Jewels: 'Hole jewel + cap jewel', Position: 'Upper balance pivot, in the cock' },
      priority: 3,
    });
  }

}
