// GOING TRAIN, BARREL, MOTION WORKS, KEYLESS WORKS and HAND-WINDING CHAIN of the DUW 6101:
// barrel (126) + mainspring + cover + arbor; centre (120/18), third (112/16) and fourth
// (120/14) wheels on L0 / L2 / L1; cannon pinion, minute wheel, hour wheel; winding stem,
// winding pinion (17, Ø 2.72, its teeth through the 3/4-plate slot), sliding pinion,
// setting wheel + setting idler, setting lever, yoke, keyless springs, stop-seconds lever;
// crown wheel (42) with its fixed cover, idler 1 (20) and idler 2 (16) on the plate, idler
// 2's lower gilt wheel (21) and the steel ratchet (63) under the plate, click + click spring.
// Registers: barrel, mainspring, barrel-cover, barrel-arbor, center-wheel, third-wheel,
//   fourth-wheel, cannon-pinion, minute-wheel, hour-wheel, winding-stem, winding-pinion,
//   sliding-pinion, setting-wheel, setting-idler, setting-lever, yoke, keyless-springs,
//   stop-seconds-lever, crown-wheel, crown-wheel-cover, winding-idlers, transmission-wheel,
//   ratchet-wheel, click, click-spring.
// Reads: SPEC.train, SPEC.windingTrain (real teeth + ratios — never build a wheel from
//   SPEC.keyless, which is the engine's equivalent), SPEC.modules, SPEC.layout, SPEC.z,
//   SPEC.case.stem / slidingPinionX, SPEC.explode / explodeDelay, and parts/finish.js
//   manualStemAngle(). See research/tangente-update-147/plan.md §4.5.
//
// Every arbor sits on SPEC.layout; every meshing pair interleaves through gear.meshPhase
// (wheels at local phase 0, the mate carries the constant offset) with the phase chain of
// plan §2, computed once in trainPhases() so the test harness and the build agree. The
// hidden winding wheels turn by exact tooth ratios of state.rot.ratchet; the crown, stem
// and sliding pinion turn only when the crown is turned by hand (finish.manualStemAngle),
// while the winding pinion follows the crown wheel — when the rotor winds, its Breguet teeth
// ride over the sliding pinion's and push it back (animated, contact-exact).
//
// The geometry helpers below are also used by parts/automatic.js (same watch, same owner).
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { manualStemAngle } from './finish.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const V2 = (x, y) => new THREE.Vector2(x, y);
// Bevelled extrusions: the first bevel facet is 45° here (bevelSegments 1–2), creasing at
// 30° keeps flat faces flat and bevels crisp.
export const BEVEL_CREASE = 30 * DEG;

// ===================================================================== geometry helpers

export function nonIndexed(g) { return g.index ? g.toNonIndexed() : g.clone(); }

export function stdAttrs(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
}

function sliceGroup(g, start, count) {
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const a = g.attributes[k];
    if (a) out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
  }
  return stdAttrs(out);
}

// Smooth normals across faces meeting at less than `angle`, hard edges elsewhere.
// toCreasedNormals hashes positions at 0.01 units — far too coarse for 0.05 mm teeth — so
// the geometry is scaled up while it runs.
export function crease(g, angle = 40 * DEG) {
  g.scale(100, 100, 100);
  const r = toCreasedNormals(g, angle);
  r.scale(0.01, 0.01, 0.01);
  return r;
}

// Collects geometries per material and merges them into one mesh per material (one
// material per mesh, as the X-ray / highlight code requires).
export class Batch {
  constructor() { this.map = new Map(); }
  add(geo, mat, matrix, creaseAngle = 0) {
    let g = nonIndexed(geo);
    if (matrix) g.applyMatrix4(matrix);
    if (creaseAngle) g = crease(g, creaseAngle);
    if (Array.isArray(mat)) {
      const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) this.push(mat[gr.materialIndex] ?? mat[0], sliceGroup(g, gr.start, gr.count));
    } else this.push(mat, stdAttrs(g));
    return this;
  }
  push(mat, g) { if (!this.map.has(mat)) this.map.set(mat, []); this.map.get(mat).push(g); }
  build(parent, opts = {}) {
    const meshes = [];
    for (const [mat, geos] of this.map) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      if (opts.castShadow === false) mesh.castShadow = false;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.map.clear();
    return meshes;
  }
}

export const mtx = (x = 0, y = 0, z = 0, rz = 0) => new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z);
// Extruded geometry lies in (u, v) and runs along w. AX maps it onto the +X axis:
// (u, v, w) → (y, z, x); ANX onto −X: (u, v, w) → (y, −z, −x). Both are proper rotations.
export const AX = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
export const ANX = new THREE.Matrix4().set(0, 0, -1, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1);
export const onX = (x, phase = 0, base = AX) => new THREE.Matrix4().makeTranslation(x, 0, 0).multiply(new THREE.Matrix4().makeRotationX(phase)).multiply(base);
// Half turn about Y: (x, y, z) → (−x, y, −z). Geometry modelled in BACK-VIEW coordinates
// (x_back = −x) and extruded towards +z ends up in the dial frame facing the case back.
export const BACK = new THREE.Matrix4().makeRotationY(Math.PI);

export function discUV(g, R, cx = 0, cy = 0) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) - cx) / (2 * R) + 0.5; uv[2 * i + 1] = (p.getY(i) - cy) / (2 * R) + 0.5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Surface of revolution about Z. `profile` = [[r, z], …] traversed counter-clockwise in the
// (r, z) plane (outer walls upwards, +z faces inwards, −z faces outwards) so normals point
// out of the solid. Split at sharp corners so shoulders stay crisp.
function lathePieces(profile, segs) {
  const pieces = [];
  let cur = [profile[0]];
  for (let i = 1; i < profile.length; i++) {
    cur.push(profile[i]);
    if (i < profile.length - 1) {
      const a = profile[i - 1], b = profile[i], c = profile[i + 1];
      const d1x = b[0] - a[0], d1y = b[1] - a[1], d2x = c[0] - b[0], d2y = c[1] - b[1];
      const cos = (d1x * d2x + d1y * d2y) / (Math.hypot(d1x, d1y) * Math.hypot(d2x, d2y) || 1);
      if (cos < Math.cos(32 * DEG)) { pieces.push(cur); cur = [profile[i]]; }
    }
  }
  pieces.push(cur);
  return pieces.filter((p) => p.length >= 2).map((p) => stdAttrs(new THREE.LatheGeometry(p.map(([r, z]) => V2(Math.max(0, r), z)), segs).toNonIndexed()));
}
export function latheZ(profile, segs = 48, uvR = 0) {
  const g = mergeGeometries(lathePieces(profile, segs).map((p) => p.rotateX(Math.PI / 2)), false);
  return discUV(g, uvR || Math.max(...profile.map((p) => p[0])) || 1);
}
// The same about +X: profile = [[r, x], …] ascending x along the outer surface.
export function latheX(profile, segs = 32) {
  return mergeGeometries(lathePieces(profile, segs).map((p) => p.rotateZ(-Math.PI / 2)), false);
}

// ---------------------------------------------------------------- 2-D signed distances
// Organic lever / spring outlines: unions of capsules, circles and polygons with smooth
// blends (real levers have generous inner radii), contoured by marching squares.
export const sdCircle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
export function sdCapsule(a, b, ra, rb = ra) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
  return (x, y) => {
    let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) - (ra + (rb - ra) * t);
  };
}
export function sdPolygon(pts) {
  return (x, y) => {
    let d = (x - pts[0][0]) ** 2 + (y - pts[0][1]) ** 2;
    let s = 1;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) {
      const ex = pts[j][0] - pts[i][0], ey = pts[j][1] - pts[i][1];
      const wx = x - pts[i][0], wy = y - pts[i][1];
      const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      const bx = wx - ex * t, by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = y >= pts[i][1], c2 = y < pts[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  };
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const sUnion = (k, ...fs) => (x, y) => { let d = fs[0](x, y); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y), k); return d; };
export const sMinus = (a, ...bs) => (x, y) => { let d = a(x, y); for (const b of bs) d = Math.max(d, -b(x, y)); return d; };
// A quadratic Bézier "spring blade" with tapering half-width.
export function sdBlade(p0, c, p2, w0, w1, n = 24) {
  const caps = [];
  let prev = p0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const p = [u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]];
    caps.push(sdCapsule(prev, p, w0 + (w1 - w0) * ((i - 1) / n), w0 + (w1 - w0) * t));
    prev = p;
  }
  return (x, y) => { let d = Infinity; for (const f of caps) { const v = f(x, y); if (v < d) d = v; } return d; };
}

// Marching squares on the zero level set → closed loops of Vector2.
export function contours(sdf, x0, y0, x1, y1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1;
  const f = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = sdf(x0 + i * h, y0 + j * h);
  const H = nx * ny;
  const ptOf = new Map();
  const adj = new Map();
  const point = (id) => {
    if (ptOf.has(id)) return;
    let p;
    if (id < H) {
      const i = id % nx, j = (id - i) / nx, a = f[id], b = f[id + 1];
      const t = a / (a - b);
      p = V2(x0 + (i + t) * h, y0 + j * h);
    } else {
      const k = id - H, i = k % nx, j = (k - i) / nx, a = f[k], b = f[k + nx];
      const t = a / (a - b);
      p = V2(x0 + i * h, y0 + (j + t) * h);
    }
    ptOf.set(id, p);
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
  const loops = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1, cur = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(ptOf.get(cur));
      const nb = adj.get(cur);
      const next = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur;
      cur = next;
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

// Ramer–Douglas–Peucker on a closed loop.
export function simplifyLoop(pts, tol) {
  const n = pts.length;
  let far = 0, best = 0;
  for (let i = 1; i < n; i++) { const d = pts[i].distanceToSquared(pts[0]); if (d > best) { best = d; far = i; } }
  const keep = new Uint8Array(n);
  keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const A = pts[a], Bp = pts[b % n];
    const dx = Bp.x - A.x, dy = Bp.y - A.y, l = Math.hypot(dx, dy) || 1e-9;
    let idx = -1, dmax = 0;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i].x - A.x) * dy - (pts[i].y - A.y) * dx) / l;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export const loopArea = (pts) => { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) a += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y); return a / 2; };

// SDF outline → shape (largest loop = outline, the others holes), in coordinates relative
// to `origin`.
export function sdfShape(sdf, box, origin = [0, 0], h = 0.012, tol = 0.0012) {
  const loops = contours(sdf, box[0], box[1], box[2], box[3], h).map((l) => simplifyLoop(l, tol));
  loops.sort((a, b) => Math.abs(loopArea(b)) - Math.abs(loopArea(a)));
  const toLocal = (l) => l.map((p) => V2(p.x - origin[0], p.y - origin[1]));
  const shape = new THREE.Shape(toLocal(loops[0]));
  for (let i = 1; i < loops.length; i++) shape.holes.push(new THREE.Path(toLocal(loops[i])));
  return shape;
}

// SDF outline → bevelled extrusion between z0 and z0 + T (local to `origin`).
// Material groups: 0 = faces, 1 = sides incl. the polished bevel.
export function sdfExtrude(sdf, box, origin, z0, T, { h = 0.012, bevel = 0.03, uvAngle = 0, uvScale = 0.25, planarUV } = {}) {
  const shape = sdfShape(sdf, box, origin, h);
  const bt = Math.min(bevel, T * 0.25);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: T - 2 * bt, bevelEnabled: bevel > 0, bevelThickness: bt, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: 4,
  });
  geo.translate(0, 0, z0 + bt);
  if (planarUV) planarUV(geo, uvScale, [0, 0], uvAngle);
  return geo;
}

// ---------------------------------------------------------------- gearing helpers

// Window between two crossings (spokes) with small filleted inner radii.
function windowPts(a0, a1, R, r, hwR, hwr, fillet) {
  const h = (s) => hwr + (hwR - hwr) * Math.min(1, Math.max(0, (s - r) / (R - r)));
  const sAt = (rho) => { let s = rho; for (let k = 0; k < 4; k++) s = Math.sqrt(Math.max(1e-6, rho * rho - h(s) ** 2)); return s; };
  const E = (a, s, side) => { const c = Math.cos(a), sn = Math.sin(a), hh = side * h(s); return V2(s * c - hh * sn, s * sn + hh * c); };
  const rel = (p) => { let d = Math.atan2(p.y, p.x) - a0; while (d < -Math.PI) d += TAU; while (d > Math.PI) d -= TAU; return a0 + d; };
  const sr = sAt(r), sR = sAt(R);
  const A = E(a0, sr, 1), Bp = E(a0, sR, 1), C = E(a1, sR, -1), D = E(a1, sr, -1);
  const angA = rel(A), angB = rel(Bp);
  let angC = rel(C), angD = rel(D);
  if (angC < angB) angC += TAU;
  if (angD < angA) angD += TAU;
  const fR = Math.min(fillet, 0.3 * (angC - angB) * R), fr = Math.min(fillet, 0.3 * (angD - angA) * r);
  const eAB = Bp.clone().sub(A).normalize(), eCD = D.clone().sub(C).normalize();
  const arc = (rad, a) => V2(rad * Math.cos(a), rad * Math.sin(a));
  const pts = [];
  const bez = (p0, p, p1, n = 5) => {
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = 1 - t;
      pts.push(V2(u * u * p0.x + 2 * u * t * p.x + t * t * p1.x, u * u * p0.y + 2 * u * t * p.y + t * t * p1.y));
    }
  };
  bez(arc(r, angA + fr / r), A, A.clone().addScaledVector(eAB, fr));
  bez(Bp.clone().addScaledVector(eAB, -fR), Bp, arc(R, angB + fR / R));
  const a0R = angB + fR / R, a1R = angC - fR / R, nR = Math.max(4, Math.ceil(((a1R - a0R) * R) / 0.05));
  for (let k = 1; k < nR; k++) pts.push(arc(R, a0R + ((a1R - a0R) * k) / nR));
  bez(arc(R, angC - fR / R), C, C.clone().addScaledVector(eCD, fR));
  bez(D.clone().addScaledVector(eCD, -fr), D, arc(r, angD - fr / r));
  const a0r = angD - fr / r, a1r = angA + fr / r, nr = Math.max(3, Math.ceil(((a0r - a1r) * r) / 0.05));
  for (let k = 1; k < nr; k++) pts.push(arc(r, a0r + ((a1r - a0r) * k) / nr));
  return pts;
}

// A watch wheel: teeth (gear.toothedOutline), optional straight spokes with filleted
// windows, optional round lightening holes, optional bore / square hole.
export function makeWheelGeo(gear, { teeth, module: m, thickness, spokes = 0, rimW = 0.25, hubR = 0.5, spokeW = 0.2, fillet = 0.1, phase = 0, bore = 0, square = 0, roundHoles = null, outline = null }) {
  const out = outline || gear.toothedOutline({ teeth, module: m });
  const rr = (m * teeth) / 2 - 1.6 * m;
  const holes = [];
  for (let j = 0; j < spokes; j++) {
    const a0 = phase + (j * TAU) / spokes;
    holes.push(new THREE.Path(windowPts(a0, a0 + TAU / spokes, rr - rimW, hubR, spokeW * 0.5, spokeW * 0.6, fillet)));
  }
  if (roundHoles) for (const [hx, hy, hr] of roundHoles) holes.push(gear.circlePath(hr, 40, hx, hy));
  if (bore) holes.push(gear.circlePath(bore, 40));
  if (square) {
    const s = square / 2;
    holes.push(new THREE.Path([V2(-s, -s), V2(-s, s), V2(s, s), V2(s, -s)]));
  }
  return gear.extrudeOutline(out, holes, thickness);
}

// Face (axial) teeth on an annulus, rising along +w from 0 to H.
// mode 'saw' = Breguet ratchet teeth (ramp rises with the angle, then a vertical drop),
// 'tri' = symmetric contrate teeth. Normals: flat per face (use a double-sided material).
export function faceTeethGeo({ teeth, rIn, rOut, H, mode = 'saw', steps = 4, reverse = false }) {
  const pos = [];
  const pitch = TAU / teeth;
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const P = (r, a, w) => [r * Math.cos(reverse ? -a : a), r * Math.sin(reverse ? -a : a), w];
  const prof = (s) => (mode === 'saw' ? s : s < 0.5 ? 2 * s : 2 - 2 * s);
  for (let i = 0; i < teeth; i++) {
    for (let k = 0; k < steps; k++) {
      const s0 = k / steps, s1 = (k + 1) / steps;
      const a0 = (i + s0) * pitch, a1 = (i + s1) * pitch;
      const w0 = H * prof(s0), w1 = H * prof(s1);
      quad(P(rIn, a0, w0), P(rOut, a0, w0), P(rOut, a1, w1), P(rIn, a1, w1));
      quad(P(rOut, a0, 0), P(rOut, a1, 0), P(rOut, a1, w1), P(rOut, a0, w0));
      quad(P(rIn, a1, 0), P(rIn, a0, 0), P(rIn, a0, w0), P(rIn, a1, w1));
    }
    if (mode === 'saw') {
      const a = (i + 1) * pitch;
      quad(P(rIn, a, H), P(rOut, a, H), P(rOut, a, 0), P(rIn, a, 0));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return stdAttrs(g);
}

// Slotted screw, head base at z = 0, top at +h (rotate for back-facing screws): a
// cylinder with a small chamfer, cut by a slot; a gently domed top.
const screwCache = new Map();
export function screwGeo(r, h, slotW, slotD, dome = 0.02) {
  const key = `${r}|${h}|${slotW}|${slotD}|${dome}`;
  if (screwCache.has(key)) return screwCache.get(key);
  const c = Math.min(0.03, r * 0.08);
  const base = latheZ([[0, 0], [r, 0], [r, h - slotD], [0, h - slotD]], 40, r);
  const a0 = Math.asin(slotW / 2 / r);
  const pts = [];
  for (let k = 0; k <= 28; k++) { const a = a0 + ((Math.PI - 2 * a0) * k) / 28; pts.push(V2(r * Math.cos(a), r * Math.sin(a))); }
  const bt = Math.min(c, slotD / 3);
  const half = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: slotD - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: c, bevelOffset: -c, bevelSegments: 2, curveSegments: 4,
  });
  half.translate(0, 0, h - slotD + bt);
  // dome the top a little (heads are lightly rounded)
  const p = half.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const zt = p.getZ(i);
    if (zt > h - 1e-4) p.setZ(i, zt + dome * (1 - (p.getX(i) ** 2 + p.getY(i) ** 2) / (r * r)));
  }
  half.computeVertexNormals();
  const other = half.clone().rotateZ(Math.PI);
  const g = mergeGeometries([stdAttrs(base), stdAttrs(nonIndexed(half)), stdAttrs(nonIndexed(other))], false);
  discUV(g, r);
  screwCache.set(key, g);
  return g;
}
// Matrix placing a screw: facing +z (dial side) or −z (case back), slot at `slotDeg` (dial frame).
export function screwMtx(x, y, zBase, slotDeg, facing) {
  if (facing > 0) return mtx(x, y, zBase, slotDeg * DEG);
  return new THREE.Matrix4().makeTranslation(x, y, zBase).multiply(new THREE.Matrix4().makeRotationX(Math.PI)).multiply(new THREE.Matrix4().makeRotationZ(-slotDeg * DEG));
}

// Fine straight brushing: a tileable normal map whose height varies across v only, so
// the grain runs along u (planarUV's angle sets the direction on each part).
export function brushedNormalMap(seed0 = 917, strength = 0.9) {
  const W = 64, H = 256;
  let seed = seed0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const raw = new Float32Array(H), h = new Float32Array(H), ph = new Float32Array(H);
  for (let y = 0; y < H; y++) { raw[y] = rnd() * 2 - 1; ph[y] = rnd() * TAU; }
  for (let y = 0; y < H; y++) h[y] = (raw[(y + H - 1) % H] + 2 * raw[y] + raw[(y + 1) % H]) / 4;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const d = (h[(y + 1) % H] - h[(y + H - 1) % H]) * 0.5;
    for (let x = 0; x < W; x++) {
      const k = d * (0.7 + 0.3 * Math.sin((x / W) * TAU + ph[y])) * strength;
      const l = Math.hypot(k, 1), i = 4 * (y * W + x);
      data[i] = 128; data[i + 1] = Math.round((-k / l) * 127 + 128); data[i + 2] = Math.round((1 / l) * 127 + 128); data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true;
  return tex;
}

// Contact-exact pawl motion. For each fraction f of a tooth pitch that the wheel has
// turned (positive = the free direction), the smallest pawl rotation about its pivot
// (sign `liftSign`) that keeps the pawl clear of the teeth: a slow ride up the flank, then
// a snap back into the next gap. Found once by bisection against the wheel's outline.
//   outline  wheel outline (Vector2[], wheel frame)   C  wheel centre (dial frame)
//   body     pawl polygon (dial frame, at rest)       P  pivot      tip  beak tip
export function pawlLUT({ outline, teeth, C, body, P, tip, liftSign = -1, n = 48, maxLift = 0.25, clr = 0.004 }) {
  const pitch = TAU / teeth;
  const NB = 720, prof = new Float32Array(NB);
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], c = outline[(i + 1) % outline.length];
    for (let k = 0; k <= 32; k++) {
      const x = a.x + ((c.x - a.x) * k) / 32, y = a.y + ((c.y - a.y) * k) / 32;
      let u = Math.atan2(y, x) / pitch; u -= Math.floor(u);
      const bin = Math.min(NB - 1, Math.floor(u * NB));
      prof[bin] = Math.max(prof[bin], Math.hypot(x, y));
    }
  }
  const inWheel = (x, y, w) => {
    const dx = x - C[0], dy = y - C[1];
    let u = (Math.atan2(dy, dx) - w) / pitch; u -= Math.floor(u);
    return Math.hypot(dx, dy) < prof[Math.min(NB - 1, Math.floor(u * NB))] + clr;
  };
  const dens = (poly, h) => {
    const o = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], c = poly[(i + 1) % poly.length], m = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / h));
      for (let k = 0; k < m; k++) o.push([a[0] + ((c[0] - a[0]) * k) / m, a[1] + ((c[1] - a[1]) * k) / m]);
    }
    return o;
  };
  const near = 1.2;
  const beakPts = dens(body, 0.005).filter((q) => Math.hypot(q[0] - tip[0], q[1] - tip[1]) < near);
  const outD = dens(outline.map((v) => [v.x, v.y]), 0.005);
  const inPoly = (x, y, poly) => {
    let s = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s;
    }
    return s;
  };
  const lut = new Float32Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const w = ((k % n) / n) * pitch, cw = Math.cos(w), sw = Math.sin(w);
    const nearT = [];
    for (const [x, y] of outD) {
      const X = C[0] + x * cw - y * sw, Y = C[1] + x * sw + y * cw;
      if (Math.hypot(X - tip[0], Y - tip[1]) < near) nearT.push([X, Y]);
    }
    const hits = (a) => {
      const ca = Math.cos(a), sa = Math.sin(a);
      for (const [x, y] of beakPts) {
        const dx = x - P[0], dy = y - P[1];
        if (inWheel(P[0] + dx * ca - dy * sa, P[1] + dx * sa + dy * ca, w)) return true;
      }
      for (const [x, y] of nearT) { // teeth points in the pawl's (rotated back) frame
        const dx = x - P[0], dy = y - P[1];
        if (inPoly(P[0] + dx * ca + dy * sa, P[1] - dx * sa + dy * ca, body)) return true;
      }
      return false;
    };
    if (!hits(0)) { lut[k] = 0; continue; }
    let lo = 0, hi = maxLift;
    for (let it = 0; it < 20; it++) { const m = (lo + hi) / 2; if (hits(liftSign * m)) lo = m; else hi = m; }
    lut[k] = liftSign * hi;
  }
  return lut;
}

// ---------------------------------------------------------------- tooth outlines
// Pinion leaves as horologists cut them: rounded, deeper than wheel teeth and thinner
// than half the pitch (0.44 here, gear.pinionOutline's 0.52 leaves no backlash: the
// leaves rubbed the wheel teeth by up to 0.01 mm in the numeric mesh test). Tooth 0 stays
// centred on local angle 0, so gear.meshPhase holds unchanged.
const outlineCache = new Map();
export function leafOutline(gear, leaves, m, toothFrac = leaves <= 8 ? 0.36 : leaves <= 10 ? 0.4 : 0.44) {
  // (low-numbered pinions need slimmer leaves: an 8-leaf pinion on 0.44 leaves touched its
  // 24/26-tooth wheels by ≈0.02 mm in the numeric test)
  const key = `leaf|${leaves}|${m}|${toothFrac}`;
  if (!outlineCache.has(key)) outlineCache.set(key, gear.toothedOutline({ teeth: leaves, module: m, addendum: 0.9, dedendum: 1.9, toothFrac, tipSteps: 8, rootSteps: 3, tipPower: 1 }));
  return outlineCache.get(key);
}
export function leafGeometry(gear, leaves, m, length, bore = 0) {
  return gear.extrudeOutline(leafOutline(gear, leaves, m), bore ? [gear.circlePath(bore, 32)] : null, length);
}
// the minute pinion: pointed, wheel-like leaves ("star-like" in the dial-side render)
export const minutePinionOutline = (gear, spec) => gear.toothedOutline({ teeth: spec.train.minuteWheel.pinion, module: spec.modules.motionB, addendum: 1.0, dedendum: 1.75, toothFrac: 0.42, tipPower: 0.9 });
// the winding pinion meshes the crown wheel's rim like a pinion on a rack whose teeth
// have straight flanks (the crown wheel's thickness); slim pointed teeth (0.30 of the
// pitch) clear them for every angle (numeric scan), full wheel addendum keeps its Ø 2.72
export const windingPinionOutline = (gear, spec) => gear.toothedOutline({ teeth: spec.windingTrain.windingPinion.teeth, module: spec.modules.windA, toothFrac: 0.3 });

// ===================================================================== mesh phases
// The phase chain of plan §2, in one place (parts/automatic.js and the test harness use
// the same numbers). Wheels keep local phase 0; the mate gets the offset.
export function trainPhases(spec, gear) {
  const L = spec.layout, TR = spec.train, WT = spec.windingTrain, MD = spec.modules;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const P = {};
  P.centrePinion = gear.meshPhase(ang(L.barrel, L.center), TR.barrel.teeth, TR.center.pinion, 0);
  P.thirdPinion = gear.meshPhase(ang(L.center, L.third), TR.center.teeth, TR.third.pinion, 0);
  P.fourthPinion = gear.meshPhase(ang(L.third, L.fourth), TR.third.teeth, TR.fourth.pinion, 0);
  P.minuteWheel = gear.meshPhase(ang(L.center, L.minuteWheel), TR.cannon.teeth, TR.minuteWheel.teeth, 0);
  P.hourWheel = gear.meshPhase(ang(L.minuteWheel, L.center), TR.minuteWheel.pinion, TR.hourWheel.teeth, 0);
  P.settingWheel = gear.meshPhase(ang(L.minuteWheel, L.settingWheel), TR.minuteWheel.teeth, WT.settingWheel.teeth, P.minuteWheel);
  P.settingIdler = gear.meshPhase(ang(L.settingWheel, L.settingIdler), WT.settingWheel.teeth, WT.settingIdler.teeth, P.settingWheel);
  // hand winding: ratchet at phase 0 (it meshes idler 2's gilt wheel AND the transmission wheel T)
  P.ratchet = 0;
  P.idler2Lower = gear.meshPhase(ang(L.barrel, L.windIdler2), WT.ratchet.teeth, WT.idler2.lowerTeeth, 0);
  P.idler2Upper = 0;
  P.idler1 = gear.meshPhase(ang(L.windIdler2, L.windIdler1), WT.idler2.teeth, WT.idler1.teeth, 0);
  P.crownWheel = gear.meshPhase(ang(L.windIdler1, L.crownWheel), WT.idler1.teeth, WT.crownWheel.teeth, P.idler1);
  // Winding pinion (axis +X, y = stemY, z = stemAxis) on the crown wheel's +x rim, a
  // pinion on a rack: crown-wheel tooth k passes the plane y = stemY at arc length
  // s = r_cw·(ψ + 2πk/z_cw − β0) (β0 = angle of that crossing seen from the crown-wheel
  // centre), the pinion's lowest gaps sit at s = r_wp·(α + 2π(j+½)/z_wp + π/2). Equal pitch
  // (same module) and α = ψ·z_cw/z_wp (= the engine's rot.stem vs rot.crownWheel) keep a
  // gap under a tooth for every ψ when the constant phases satisfy this:
  const zCW = WT.crownWheel.teeth, zWP = WT.windingPinion.teeth;
  const rCW = (MD.windA * zCW) / 2;
  const dy = (spec.stemY ?? 0) - L.crownWheel[1];
  const beta0 = Math.asin(dy / rCW);
  P.windingPinion = (zCW * (P.crownWheel - beta0) - Math.PI - (zWP * Math.PI) / 2) / zWP;
  return P;
}

// ===================================================================== the builder
export function buildTrain(ctx) {
  const { spec, M, reg, root, gear, planarUV } = ctx;
  if (ctx.lite) return; // the watch box shows the dial side only
  const Z = spec.z, L = spec.layout, TR = spec.train, WT = spec.windingTrain, MD = spec.modules;
  const ST = spec.case.stem, SY = spec.stemY ?? 0, SZ = Z.stemAxis;
  const RAT = WT.ratios;
  const fmt = (v, d = 1) => v.toFixed(d);
  const degOf = (v) => ((((v * 180) / Math.PI) % 360) + 360) % 360;
  const tipR = (z, m) => m * (z / 2 + 1.3);
  const pinTipR = (z, m) => m * (z / 2 + 0.9);
  const rootR = (z, m) => m * (z / 2 - 1.6);
  const PH = trainPhases(spec, gear);

  // ---------- materials (shared ones are only cloned, never mutated)
  const gilt = M.wheelGilt.clone();
  gilt.color.set(0xdcba7c); // NOMOS gilt wheels (#d7b67c in the renders)
  gilt.name = 'duw6101Gilt';
  const giltEdge = M.wheelGilt.clone();
  giltEdge.normalMap = null; giltEdge.roughnessMap = null; giltEdge.anisotropyMap = null;
  giltEdge.anisotropy = 0; giltEdge.roughness = 0.16; giltEdge.color.set(0xe8c98d);
  giltEdge.name = 'duw6101GiltEdge';
  const giltSatin = M.wheelGilt.clone(); // barrel drum: satin gilt
  giltSatin.color.set(0xd9b779); giltSatin.roughness = 0.4; giltSatin.normalScale = new THREE.Vector2(0.18, 0.18);
  giltSatin.name = 'duw6101GiltSatin';
  const steel = M.steelPinion;
  const steelPol = M.steelPolished;
  // large polished flats (cover disc, idler caps): polished but not a perfect mirror, light grey as rendered
  const softPol = M.steelPolished.clone(); softPol.roughness = 0.34; softPol.color.set(0xdfe1e4); softPol.name = 'duw6101SoftPolishT';
  const steelDS = M.steelPinion.clone(); steelDS.side = THREE.DoubleSide; steelDS.name = 'duw6101SteelDS';
  // Glashütte sunburst on the crown wheel and the ratchet (a mid steel grey in the render)
  const sun = M.sunburst.clone();
  sun.color.set(0xc4c6ca); sun.roughness = 0.34; sun.name = 'duw6101Sunburst';
  const springSteel = M.steelDark.clone(); springSteel.color.set(0x9ca2aa); springSteel.roughness = 0.22;
  // brushed (not mirror) steel for the click, its spring, the keyless levers and idlers
  const brushed = M.steelSatin.clone();
  brushed.color.set(0xd8dadd); brushed.roughness = 0.34; brushed.anisotropy = 0.4;
  brushed.normalMap = brushedNormalMap(); brushed.normalScale = new THREE.Vector2(0.35, 0.35);
  brushed.name = 'duw6101Brushed';
  const giltPair = [gilt, giltEdge];
  const sunPair = [sun, steelPol];
  const satPair = [brushed, steelPol];
  const pinPair = [steel, steelPol];

  function assembly(pos, z = 0) {
    const object = new THREE.Group();
    object.position.set(pos[0], pos[1], z);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    return { object, rotor };
  }
  function add(def) {
    const e = spec.explode[def.id] ?? [0, 0, 0];
    return reg.add({ ...def, explode: e, explodeDelay: spec.explodeDelay(def.id) });
  }

  // ===================================================================== BARREL
  const mB = MD.barrel;
  // Drum spec.z.barrel: lid end at −1.95 (back), closed floor at the dial-side end (−1.14,
  // just under the centre wheel on L0); the toothed band (spec.z.barrelTeeth) round the
  // dial-side end, level with the centre pinion.
  const bz = { drum: Z.barrel, lid: Z.barrelLid, ring: Z.barrelTeeth, wallIn: 4.85, wallOut: 5.10, floor: [Z.barrel[1] - 0.08, Z.barrel[1]] };
  const CORE_R = 1.62; // barrel-arbor core (the mainspring's inner end hooks on it)
  const LID_HOLE = 1.70; // the core shows through the lid: the arbor leaves the barrel through it in the explode
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const ring = gear.extrudeOutline(gear.toothedOutline({ teeth: TR.barrel.teeth, module: mB }), [gear.circlePath(bz.wallIn + 0.1, 180)], bz.ring[1] - bz.ring[0]);
    b.add(ring, giltPair, mtx(0, 0, (bz.ring[0] + bz.ring[1]) / 2), 35 * DEG);
    const [d0, d1] = bz.drum, zf = bz.floor, wi = bz.wallIn, wo = bz.wallOut;
    // drum: rim at the back end → outer wall → floor (dial side) → arbor hole → inside
    b.add(latheZ([
      [wi, d0], [wo - 0.04, d0], [wo, d0 + 0.04], [wo, d1 - 0.03], [wo - 0.03, d1],
      [0.8, d1], [0.74, d1 - 0.03], [0.74, zf[0]], [wi - 0.03, zf[0]], [wi, zf[0] - 0.03], [wi, d0],
    ], 160, wo), giltSatin);
    b.build(rotor);
    const reserveTurns = spec.barrelTurns;
    add({
      id: 'barrel', name: 'Mainspring barrel', category: 'power', side: 'back', exposed: false, priority: 1,
      object, rotor, drive: { key: 'barrel' }, anchor: [4.0, 2.6, d0],
      description: 'The power store of the watch: a toothed gilt drum that the uncoiling mainspring turns once every 7 hours. Its 126 teeth drive the 18-leaf centre pinion and so power the whole going train.',
      facts: {
        Teeth: String(TR.barrel.teeth), 'Tip Ø': `${fmt(2 * tipR(TR.barrel.teeth, mB), 2)} mm`, Module: `${fmt(mB, 4)} mm`,
        Speed: '1 turn / 7 h', 'Power reserve': `${spec.powerReserveHours} h ≈ ${fmt(reserveTurns, 2)} turns`, Drives: 'centre pinion, 7 : 1',
      },
      live: (s) => `${fmt(degOf(s.rot.barrel), 2)}° · 1 turn / 7 h · ${fmt(s.reserve * spec.powerReserveHours, 1)} h left`,
    });
  }
  // ---------- barrel cover (lid) — snapped into the drum, a raised boss round the arbor
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const zo = bz.lid[0], zi = bz.lid[1], zl = zo + 0.02; // boss face −1.95, lid face −1.93, inside −1.90
    const wi = bz.wallIn;
    const g = latheZ([[LID_HOLE, zi], [LID_HOLE, zo + 0.012], [LID_HOLE + 0.012, zo], [2.16, zo], [2.2, zl],
      [wi - 0.05, zl], [wi - 0.02, zl + 0.012], [wi - 0.02, zi], [LID_HOLE, zi]], 160, wi);
    b.add(g, gilt);
    b.build(rotor);
    add({
      id: 'barrel-cover', name: 'Barrel cover', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'barrel' }, anchor: [-3.2, 1.8, zl],
      description: 'The gilt lid that snaps into the back of the barrel drum and closes the mainspring in, with a raised boss round the arbor. It turns with the drum; its rim shows through the winding window of the three-quarter plate.',
      facts: { 'Ø': `${fmt(2 * (wi - 0.02), 1)} mm`, Turns: 'with the barrel drum' },
    });
  }
  // ---------- barrel arbor (turns with the ratchet)
  const RZ = Z.ratchetWheel; // W0
  const SQ = 0.80; // square for the ratchet
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const zCore0 = bz.lid[0], zCore1 = bz.floor[0] - 0.04;
    const zUpPivot = Z.threeQuarterPlate[0] + 0.1; // upper pivot ends in the 3/4-plate jewel
    // upper pivot → square (W0) → shank → core (through the lid's hole, its face flush with
    // the boss) → shank through the drum floor → lower pivot in the pillar-plate jewel
    b.add(latheZ([
      [0, zUpPivot], [0.11, zUpPivot], [0.14, zUpPivot + 0.03], [0.14, RZ[0] - 0.03], [0.3, RZ[0] - 0.005], [0.3, RZ[1] + 0.005],
      [0.55, RZ[1] + 0.02], [0.55, zCore0 - 0.004], [CORE_R - 0.03, zCore0 - 0.004], [CORE_R, zCore0 + 0.026], [CORE_R, zCore1 - 0.03],
      [CORE_R - 0.04, zCore1], [0.55, zCore1], [0.55, Z.L0[0]], [0.4, Z.L0[0] + 0.05], [0.15, Z.L0[1] + 0.01], [0.15, Z.mainPlate[0] + 0.2],
      [0.11, Z.mainPlate[0] + 0.23], [0, Z.mainPlate[0] + 0.23],
    ], 64), steelPol);
    // the square (rotated 45° to the ratchet's square hole, which is aligned with it)
    b.add(new THREE.BoxGeometry(SQ, SQ, RZ[1] - RZ[0] + 0.01), steel, mtx(0, 0, (RZ[0] + RZ[1]) / 2));
    // the hook for the mainspring's eye (inside the core's footprint, so the arbor can be
    // drawn out of the spring)
    b.add(new THREE.BoxGeometry(0.16, 0.12, 0.3), steel, mtx(CORE_R - 0.02, 0, (zCore0 + zCore1) / 2));
    b.build(rotor);
    add({
      id: 'barrel-arbor', name: 'Barrel arbor', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'ratchet' }, anchor: [CORE_R, 0, zCore0],
      description: 'The steel axle at the centre of the barrel. The inner end of the mainspring hooks onto its core, and its square carries the ratchet wheel, so winding turns the arbor and coils the spring tighter round it.',
      facts: { 'Core Ø': `${fmt(2 * CORE_R, 2)} mm`, Top: `${fmt(SQ, 2)} mm square for the ratchet`, Turns: 'only while winding (with the ratchet)', Pivots: 'jewelled, pillar plate + 3/4 plate' },
      live: (s) => `${fmt(degOf(s.rot.ratchet), 1)}° wound in`,
    });
  }
  // ---------- mainspring (its coils follow state.reserve)
  {
    const { object, rotor } = assembly(L.barrel);
    const ms = makeMainspring();
    const mesh = new THREE.Mesh(ms.geometry, springSteel);
    rotor.add(mesh);
    let last = -1, lastT = 0;
    ms.rebuild(0.92);
    add({
      id: 'mainspring', name: 'Mainspring', category: 'power', side: 'back', exposed: false, priority: 2,
      object, rotor, drive: { key: 'barrel' }, anchor: [0, 3.4, -1.55],
      description: `A long ribbon of alloy spring steel coiled inside the barrel. Winding wraps it tightly round the arbor; as it lets down over about ${spec.powerReserveHours} hours its coils migrate out to the drum wall, turning the barrel. When it is full it slips in the barrel, so the rotor can never overwind it.`,
      facts: { Coils: '≈13 (let down) – 21 (wound)', 'Usable turns': `≈${fmt(spec.barrelTurns, 2)}`, Reserve: `${spec.powerReserveHours} h (NOMOS)`, Thickness: '≈0.1 mm (EST)' },
      live: (s) => `${fmt(s.reserve * 100, 0)} % wound · ${fmt(13 + 8 * s.reserve, 1)} coils`,
      update: (s) => {
        const now = performance.now();
        if (Math.abs(s.reserve - last) > 0.003 && now - lastT > 60) { ms.rebuild(s.reserve); last = s.reserve; lastT = now; }
      },
    });
  }

  function makeMainspring() {
    const SEG = 64, MAXT = 21.6, MAXP = Math.ceil(SEG * MAXT) + 2;
    const t = 0.1, pitch = 0.112, r0 = CORE_R + t / 2 + 0.02, R1 = bz.wallIn - t / 2 - 0.03;
    const zb = bz.lid[1] + 0.03, zt = bz.floor[0] - 0.03;
    const NV = MAXP * 8 + 8;
    const pos = new Float32Array(NV * 3), nor = new Float32Array(NV * 3);
    const cx = new Float32Array(MAXP), cy = new Float32Array(MAXP);
    const geometry = new THREE.BufferGeometry();
    const posA = new THREE.BufferAttribute(pos, 3), norA = new THREE.BufferAttribute(nor, 3);
    posA.setUsage(THREE.DynamicDrawUsage); norA.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posA);
    geometry.setAttribute('normal', norA);
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(NV * 2), 2));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, (zb + zt) / 2), 5.2);
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-5, -5, zb), new THREE.Vector3(5, 5, zt));
    const V0 = MAXP * 8;
    const setV = (i, x, y, z, nx, ny, nz) => { pos[3 * i] = x; pos[3 * i + 1] = y; pos[3 * i + 2] = z; nor[3 * i] = nx; nor[3 * i + 1] = ny; nor[3 * i + 2] = nz; };
    let n = 0;
    function centreline(rho) {
      const Nin = 20 * rho, Nout = 12 * (1 - rho), NT = Nin + 1 + Nout;
      const ra = r0 + pitch * Nin, rb = R1 - pitch * Nout;
      n = Math.min(MAXP, Math.floor(NT * SEG) + 1);
      for (let i = 0; i < n; i++) {
        const tau = i === n - 1 ? NT : i / SEG;
        let r;
        if (tau <= Nin) r = r0 + pitch * tau;
        else if (tau <= Nin + 1) { const s = tau - Nin; r = ra + (rb - ra) * s * s * (3 - 2 * s); } else r = rb + pitch * (tau - Nin - 1);
        const th = 1.1 - TAU * tau; // coils run clockwise outwards (dial view)
        cx[i] = r * Math.cos(th); cy[i] = r * Math.sin(th);
      }
    }
    function write() {
      for (let i = 0; i < n; i++) {
        const a = i > 0 ? i - 1 : i, c = i < n - 1 ? i + 1 : i;
        let tx = cx[c] - cx[a], ty = cy[c] - cy[a];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let nx = ty, ny = -tx;
        if (nx * cx[i] + ny * cy[i] < 0) { nx = -nx; ny = -ny; }
        const ix = cx[i] - (nx * t) / 2, iy = cy[i] - (ny * t) / 2, ox = cx[i] + (nx * t) / 2, oy = cy[i] + (ny * t) / 2;
        const v = 8 * i;
        setV(v, ix, iy, zb, -nx, -ny, 0); setV(v + 1, ix, iy, zt, -nx, -ny, 0);
        setV(v + 2, ox, oy, zb, nx, ny, 0); setV(v + 3, ox, oy, zt, nx, ny, 0);
        setV(v + 4, ix, iy, zt, 0, 0, 1); setV(v + 5, ox, oy, zt, 0, 0, 1);
        setV(v + 6, ix, iy, zb, 0, 0, -1); setV(v + 7, ox, oy, zb, 0, 0, -1);
        if (i === 0 || i === n - 1) {
          const cc = i === 0 ? V0 : V0 + 4, sg = i === 0 ? -1 : 1;
          setV(cc, ix, iy, zb, sg * tx, sg * ty, 0); setV(cc + 1, ox, oy, zb, sg * tx, sg * ty, 0);
          setV(cc + 2, ox, oy, zt, sg * tx, sg * ty, 0); setV(cc + 3, ix, iy, zt, sg * tx, sg * ty, 0);
        }
      }
    }
    centreline(0.5); write();
    const tri = (a, b, c) => {
      const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2];
      const ux = pos[3 * b] - ax, uy = pos[3 * b + 1] - ay, uz = pos[3 * b + 2] - az;
      const vx = pos[3 * c] - ax, vy = pos[3 * c + 1] - ay, vz = pos[3 * c + 2] - az;
      return (uy * vz - uz * vy) * nor[3 * a] + (uz * vx - ux * vz) * nor[3 * a + 1] + (ux * vy - uy * vx) * nor[3 * a + 2];
    };
    const k0 = 40;
    const flip = [0, 1, 2, 3].map((f) => tri(8 * k0 + 2 * f, 8 * (k0 + 1) + 2 * f, 8 * (k0 + 1) + 2 * f + 1) < 0);
    const capFlip = [tri(V0, V0 + 1, V0 + 2) < 0, tri(V0 + 4, V0 + 5, V0 + 6) < 0];
    const idx = new Uint32Array(12 + (MAXP - 1) * 24);
    let w = 0;
    for (let c = 0; c < 2; c++) {
      const o = V0 + 4 * c;
      if (!capFlip[c]) idx.set([o, o + 1, o + 2, o, o + 2, o + 3], w); else idx.set([o, o + 2, o + 1, o, o + 3, o + 2], w);
      w += 6;
    }
    for (let i = 0; i < MAXP - 1; i++) {
      for (let f = 0; f < 4; f++) {
        const a = 8 * i + 2 * f, bq = a + 1, d = 8 * (i + 1) + 2 * f, c = d + 1;
        if (!flip[f]) idx.set([a, d, c, a, c, bq], w); else idx.set([a, c, d, a, bq, c], w);
        w += 6;
      }
    }
    geometry.setIndex(new THREE.BufferAttribute(idx, 1));
    function rebuild(rho) {
      centreline(Math.min(1, Math.max(0, rho)));
      write();
      geometry.setDrawRange(0, 12 + (n - 1) * 24);
      posA.needsUpdate = true; norA.needsUpdate = true;
    }
    return { geometry, rebuild };
  }

  // ===================================================================== GOING TRAIN
  // Generic train mobile: gilt 5-spoke wheel + steel collet(s) + pinion + arbor.
  function trainWheel({ id, pos, teeth, module: m, zW, spokes, rimW, hubR, spokeW, spokePhase, pinion, pinionModule, pinionZ, pinionPhase, arbor, collets, drive, anchor, def }) {
    const { object, rotor } = assembly(pos);
    const b = new Batch();
    const thick = Z.wheelThickness;
    b.add(makeWheelGeo(gear, { teeth, module: m, thickness: thick, spokes, rimW, hubR, spokeW, fillet: 0.1, phase: spokePhase }), giltPair, mtx(0, 0, zW), 38 * DEG);
    for (const c of collets) b.add(latheZ(c, 40), steelPol);
    const pl = pinionZ[1] - pinionZ[0];
    b.add(leafGeometry(gear, pinion, pinionModule, pl), pinPair, mtx(0, 0, (pinionZ[0] + pinionZ[1]) / 2, pinionPhase), 35 * DEG);
    b.add(latheZ(arbor, 28), steelPol);
    b.build(rotor);
    return add({ id, object, rotor, drive: { key: drive }, anchor, ...def });
  }

  const upperPivot = Z.threeQuarterPlate[1] - 0.2; // pivot ends inside the 3/4-plate jewels
  const lowerPivot = Z.mainPlate[0] + 0.25; // … and inside the pillar-plate jewels
  {
    // CENTRE WHEEL (L0) — pinion on L1 (meshes the barrel teeth); the arbor's upper pivot
    // runs in the jewel of the fixed rotor-bearing disc, its dial end carries the cannon pinion.
    const zW = Z.centerWheel, t2 = Z.wheelThickness / 2, pz = Z.pinionOf.center;
    const piv = Z.bearingDisc[0] + 0.12; // pivot end inside the bearing jewel
    trainWheel({
      id: 'center-wheel', pos: L.center, teeth: TR.center.teeth, module: MD.center, zW,
      spokes: 5, rimW: 0.24, hubR: 0.62, spokeW: 0.21, spokePhase: 0.31,
      pinion: TR.center.pinion, pinionModule: MD.barrel, pinionZ: pz, pinionPhase: PH.centrePinion,
      collets: [[[0.25, pz[1] + 0.003], [0.42, pz[1] + 0.003], [0.46, pz[1] + 0.025], [0.46, zW - t2 + 0.005], [0.25, zW - t2 + 0.005]]],
      // pivot in the bearing jewel → through the 3/4 plate → pinion → wheel → through the
      // pillar plate's jewel (r 0.26) → r 0.20 under the cannon pinion (bore 0.21) to its top
      arbor: [[0, piv], [0.08, piv], [0.1, piv + 0.03], [0.1, Z.threeQuarterPlate[1] - 0.05], [0.2, Z.threeQuarterPlate[1]], [0.22, pz[0] - 0.02],
        [0.24, pz[0]], [0.24, zW + t2 + 0.02], [0.26, zW + t2 + 0.04], [0.26, Z.cannonPinion[0] - 0.12], [0.2, Z.cannonPinion[0] - 0.09],
        [0.2, Z.cannonPinion[1] - 0.06], [0.16, Z.cannonPinion[1] - 0.035], [0, Z.cannonPinion[1] - 0.035]],
      drive: 'center', anchor: [-2.6, -1.2, zW - t2],
      def: {
        name: 'Centre wheel', category: 'train', side: 'back', exposed: false, priority: 1,
        description: 'The second wheel of the going train, driven by the barrel through its 18-leaf pinion. It turns exactly once an hour; its arbor runs through the pillar plate to the dial side, where the cannon pinion on it carries the minute hand. Its upper pivot runs in the jewel at the centre of the rotor bearing.',
        facts: { Teeth: String(TR.center.teeth), Pinion: `${TR.center.pinion} leaves`, Module: `${fmt(MD.center, 4)} mm`, 'Tip Ø': `${fmt(2 * tipR(TR.center.teeth, MD.center), 2)} mm`, Speed: '1 turn / hour', Carries: 'minute hand (via the cannon pinion)' },
        live: (s) => `${fmt(degOf(s.rot.center), 2)}° · 1 turn / 60 min`,
      },
    });
  }
  {
    // THIRD WHEEL (L2) — pinion on L0 (meshes the centre wheel). Between wheel and pinion
    // the arbor passes the fourth wheel's rim (0.23 mm from this axis): thin there.
    const zW = Z.thirdWheel, t2 = Z.wheelThickness / 2, pz = Z.pinionOf.third;
    trainWheel({
      id: 'third-wheel', pos: L.third, teeth: TR.third.teeth, module: MD.third, zW,
      spokes: 5, rimW: 0.22, hubR: 0.5, spokeW: 0.19, spokePhase: 0.2,
      pinion: TR.third.pinion, pinionModule: MD.center, pinionZ: pz, pinionPhase: PH.thirdPinion,
      collets: [[[0.1, zW - t2 - 0.07], [0.27, zW - t2 - 0.07], [0.3, zW - t2 - 0.04], [0.3, zW - t2 + 0.005], [0.1, zW - t2 + 0.005]]],
      arbor: [[0, upperPivot], [0.06, upperPivot], [0.075, upperPivot + 0.03], [0.075, zW - t2 - 0.07], [0.1, zW - t2 - 0.05], [0.1, pz[0]],
        [0.14, pz[1]], [0.1, pz[1] + 0.02], [0.075, pz[1] + 0.05], [0.075, lowerPivot], [0.06, lowerPivot + 0.03], [0, lowerPivot + 0.03]],
      drive: 'third', anchor: [2.4, -1.2, zW - t2],
      def: {
        name: 'Third wheel', category: 'train', side: 'back', exposed: false, priority: 2,
        description: 'An intermediate wheel that steps the speed up: driven by the centre wheel through its 16-leaf pinion, it turns once every 8 minutes and drives the fourth (seconds) wheel. The seconds wheel\'s rim runs between this wheel and its own pinion.',
        facts: { Teeth: String(TR.third.teeth), Pinion: `${TR.third.pinion} leaves`, Module: `${fmt(MD.third, 4)} mm`, 'Tip Ø': `${fmt(2 * tipR(TR.third.teeth, MD.third), 2)} mm`, Speed: '1 turn / 8 min', Ratio: '7.5 : 1 from the centre wheel' },
        live: (s) => `${fmt(degOf(s.rot.third), 1)}° · 1 turn / 8 min`,
      },
    });
  }
  {
    // FOURTH (SECONDS) WHEEL (L1) — pinion on L2 (meshes the third wheel); its long arbor
    // runs through the pillar plate, the dial-side lower bridge and the dial to the seconds hand.
    const zW = Z.fourthWheel, t2 = Z.wheelThickness / 2, pz = Z.pinionOf.fourth;
    const tip = Z.fourthArborTip;
    trainWheel({
      id: 'fourth-wheel', pos: L.fourth, teeth: TR.fourth.teeth, module: MD.fourth, zW,
      spokes: 5, rimW: 0.22, hubR: 0.48, spokeW: 0.19, spokePhase: 0.45,
      pinion: TR.fourth.pinion, pinionModule: MD.third, pinionZ: pz, pinionPhase: PH.fourthPinion,
      collets: [[[0.12, pz[1] + 0.003], [0.27, pz[1] + 0.003], [0.3, pz[1] + 0.02], [0.3, zW - t2 + 0.005], [0.12, zW - t2 + 0.005]]],
      arbor: [[0, upperPivot], [0.06, upperPivot], [0.07, upperPivot + 0.03], [0.07, pz[0] - 0.03], [0.12, pz[0]], [0.12, zW + t2 + 0.02],
        [0.13, zW + t2 + 0.05], [0.13, Z.mainPlate[1] - 0.03], [0.1, Z.mainPlate[1]], [0.085, Z.lowerBridge[1] + 0.03], [0.085, tip - 0.025], [0.06, tip], [0, tip]],
      drive: 'fourth', anchor: [2.4, 1.2, zW - t2],
      def: {
        name: 'Fourth wheel (seconds wheel)', category: 'train', side: 'back', exposed: false, priority: 2,
        description: 'The seconds wheel. It turns once a minute; its long arbor passes through the pillar plate and the dial to carry the small seconds hand at 6 o\'clock, while its 120 teeth drive the escape pinion.',
        facts: { Teeth: String(TR.fourth.teeth), Pinion: `${TR.fourth.pinion} leaves`, Module: `${fmt(MD.fourth, 4)} mm`, 'Tip Ø': `${fmt(2 * tipR(TR.fourth.teeth, MD.fourth), 2)} mm`, Speed: '1 turn / minute', Carries: 'small seconds hand', Drives: 'escape pinion, 12 : 1' },
        live: (s) => `${fmt(degOf(s.rot.fourth), 1)}° · 1 turn / min`,
      },
    });
  }

  // ===================================================================== MOTION WORKS (dial side)
  {
    // cannon pinion: friction-fit on the centre arbor, its pipe carries the minute hand
    const { object, rotor } = assembly(L.center);
    const b = new Batch();
    const lz = Z.cannonLeaves, top = Z.cannonTop, hp = Z.hourPipeTop;
    b.add(leafGeometry(gear, TR.cannon.teeth, MD.motionA, lz[1] - lz[0]), pinPair, mtx(0, 0, (lz[0] + lz[1]) / 2), 35 * DEG);
    // shoulder above the leaves stays under the hour wheel's bore (hour wheel from z.hourWheel[0])
    const sh = Z.hourWheel[0] - 0.02;
    b.add(latheZ([[0.21, lz[0]], [0.42, lz[0]], [0.42, lz[1]], [0.56, lz[1]], [0.56, sh - 0.03], [0.45, sh],
      [0.45, hp + 0.01], [0.4, hp + 0.04], [0.4, top - 0.035], [0.36, top], [0.21, top], [0.21, lz[0]]], 48), steelPol);
    b.build(rotor);
    add({
      id: 'cannon-pinion', name: 'Cannon pinion', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'cannon' }, anchor: [0.56, 0, lz[1]],
      description: 'A hollow pinion with a friction fit on the centre-wheel arbor; its pipe carries the minute hand. The friction lets the hands be set without stopping the train, and its 12 leaves drive the minute wheel.',
      facts: { Leaves: String(TR.cannon.teeth), Module: `${fmt(MD.motionA, 4)} mm`, Speed: '1 turn / hour', 'Minute-hand pipe': 'Ø 0.80 mm' },
      live: (s) => `${fmt(degOf(s.rot.cannon), 2)}° · 1 turn / 60 min`,
    });
  }
  {
    // minute wheel (gilt, three round holes) + steel 10-leaf pinion on a fixed stud
    const { object, rotor } = assembly(L.minuteWheel);
    const b = new Batch();
    const zw = Z.minuteWheel, tw = zw[1] - zw[0];
    const holes = [0, 1, 2].map((k) => { const a = 0.52 + (k * TAU) / 3; return [1.36 * Math.cos(a), 1.36 * Math.sin(a), 0.37]; });
    b.add(makeWheelGeo(gear, { teeth: TR.minuteWheel.teeth, module: MD.motionA, thickness: tw, roundHoles: holes, bore: 0.27 }), giltPair, mtx(0, 0, (zw[0] + zw[1]) / 2, PH.minuteWheel), 38 * DEG);
    const pz = Z.minutePinion;
    // pinion leaves with wheel-like pointed tips ("star-like" in the render)
    const starOutline = minutePinionOutline(gear, spec);
    b.add(gear.extrudeOutline(starOutline, [gear.circlePath(0.27, 32)], pz[1] - pz[0]), pinPair, mtx(0, 0, (pz[0] + pz[1]) / 2), 35 * DEG);
    b.build(rotor);
    const s = new Batch();
    // fixed stud from the recess floor, a small head over the pinion
    s.add(latheZ([[0, Z.motionRecess], [0.25, Z.motionRecess], [0.25, pz[1] + 0.005], [0.36, pz[1] + 0.005], [0.36, pz[1] + 0.04], [0.33, pz[1] + 0.055], [0, pz[1] + 0.055]], 32), steelPol);
    s.build(object);
    add({
      id: 'minute-wheel', name: 'Minute wheel', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'minuteWheel' }, anchor: [-1.2, -1.4, zw[1]],
      description: 'Part of the 12 : 1 motion works under the dial. Driven by the cannon pinion, it turns once every 3 h 20 min; its 10-leaf steel pinion turns the hour wheel. The setting wheel stays in mesh with it for hand-setting.',
      facts: { Teeth: String(TR.minuteWheel.teeth), Pinion: `${TR.minuteWheel.pinion} leaves`, Speed: '1 turn / 3 h 20 min', Ratio: '(40/12) × (36/10) = 12', Finish: 'gilt, three lightening holes' },
      live: (st) => `${fmt(degOf(st.rot.minuteWheel), 2)}° · 1 turn / 200 min`,
    });
  }
  {
    // hour wheel: rides loosely on the cannon pinion, carries the hour hand; it also
    // drives the date-drive star (date module)
    const { object, rotor } = assembly(L.center);
    const b = new Batch();
    const hz = Z.hourWheel, th = hz[1] - hz[0];
    b.add(makeWheelGeo(gear, { teeth: TR.hourWheel.teeth, module: MD.motionB, thickness: th, bore: 0.47 }), giltPair, mtx(0, 0, (hz[0] + hz[1]) / 2, PH.hourWheel), 38 * DEG);
    b.add(latheZ([[0.47, hz[1] - 0.005], [0.78, hz[1] - 0.005], [0.78, hz[1] + 0.025], [0.65, hz[1] + 0.06],
      [0.65, Z.hourPipeTop - 0.03], [0.61, Z.hourPipeTop], [0.47, Z.hourPipeTop], [0.47, hz[1] - 0.005]], 48), gilt);
    b.build(rotor);
    add({
      id: 'hour-wheel', name: 'Hour wheel', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'hourWheel' }, anchor: [1.6, 1.6, hz[1]],
      description: 'Rides loosely on the cannon pinion and carries the hour hand on its pipe. Driven by the minute pinion, it turns once every 12 hours, and it also drives the date mechanism\'s star wheel.',
      facts: { Teeth: String(TR.hourWheel.teeth), Module: `${fmt(MD.motionB, 4)} mm`, Speed: '1 turn / 12 h', 'Hour-hand pipe': 'Ø 1.30 mm', Drives: 'date-drive star (18)' },
      live: (s) => `${fmt(degOf(s.rot.hourWheel), 3)}° · 1 turn / 12 h`,
    });
  }

  // ===================================================================== HAND WINDING (back)
  const mR = MD.windC; // ratchet ↔ idler-2 gilt wheel ↔ transmission wheel T
  const ratchetOutline = gear.toothedOutline({ teeth: WT.ratchet.teeth, module: mR });
  {
    // RATCHET (W0, under the 3/4 plate, on the barrel arbor's square): steel, sunburst
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const R = tipR(WT.ratchet.teeth, mR);
    const zm = (RZ[0] + RZ[1]) / 2, T = RZ[1] - RZ[0];
    const g = gear.extrudeOutline(ratchetOutline, [new THREE.Path([V2(-SQ / 2 - 0.005, -SQ / 2 - 0.005), V2(-SQ / 2 - 0.005, SQ / 2 + 0.005), V2(SQ / 2 + 0.005, SQ / 2 + 0.005), V2(SQ / 2 + 0.005, -SQ / 2 - 0.005)])], T, { uvRadius: R });
    b.add(g, sunPair, mtx(0, 0, zm), 35 * DEG);
    b.build(rotor);
    add({
      id: 'ratchet-wheel', name: 'Ratchet wheel', category: 'keyless', side: 'back', exposed: true, priority: 2,
      object, rotor, drive: { key: 'ratchet' }, anchor: [3.4, -2.0, RZ[0]],
      description: 'Sits on the square of the barrel arbor, hidden under the three-quarter plate: every winding turns it and the arbor, coiling the mainspring, and the click stops it running back. Both the crown (through the idlers) and the rotor (through the automatic train) drive it; its teeth show in the winding window next to the gilt idler.',
      facts: { Teeth: String(WT.ratchet.teeth), 'Tip Ø': `${fmt(2 * R, 2)} mm`, Module: `${fmt(mR, 4)} mm`, Finish: 'steel, sunburst', 'Driven by': 'idler 2 (21) and the automatic train\'s wheel T (22)', 'Full wind': `≈${fmt(spec.barrelTurns, 1)} turns` },
      live: (s) => `${fmt(degOf(s.rot.ratchet), 1)}° · ${fmt(s.reserve * 100, 0)} % wound`,
    });
  }

  // ---------- CLICK + CLICK SPRING (W0) — contact-exact on the real 63-tooth ratchet
  {
    const C = L.barrel, pitch = TAU / WT.ratchet.teeth;
    const P = WT.click.pivot, beakSpec = WT.click.beak;
    // The beak rests in a tooth gap whenever windAngle is a whole number of teeth: put it
    // in the gap (k+½)·pitch nearest the spec's beak point.
    const aSpec = Math.atan2(beakSpec[1] - C[1], beakSpec[0] - C[0]);
    const gapA = (Math.round(aSpec / pitch - 0.5) + 0.5) * pitch;
    const pol = (r, a) => [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)];
    const rRoot = rootR(WT.ratchet.teeth, mR), rTip = tipR(WT.ratchet.teeth, mR);
    const tip = pol(rRoot + 0.14, gapA); // the nose sits deep in the gap
    // Pawl outline (dial frame): a radial locking face on the counter-clockwise side of the
    // gap (the ratchet may only turn counter-clockwise, seen from the dial), a sliding ramp
    // on the other side, then the arm back to the pivot boss.
    const nose = [
      pol(rRoot + 0.14, gapA + 0.16 * pitch), // tip, front corner
      pol(rTip + 0.16, gapA + 0.2 * pitch), // locking face (≈ radial) up past the tip circle
      pol(rTip + 0.42, gapA + 0.05 * pitch),
      pol(rTip + 0.36, gapA - 0.95 * pitch), // back of the nose
      pol(rTip + 0.06, gapA - 0.62 * pitch), // sliding ramp, down to the tip
      pol(rRoot + 0.14, gapA - 0.14 * pitch),
    ];
    // the arm stays outside the tip circle (its edge 0.08 clear of the teeth at rest)
    const armR0 = 0.3, armR1 = 0.22;
    const armEnd = pol(rTip + armR1 + 0.08, gapA - 0.3 * pitch);
    const clickSdf = sUnion(0.08, sdCircle(P[0], P[1], 0.4), sdCapsule(P, armEnd, armR0, armR1), sdPolygon(nose));
    // the polygon used by the contact search: a traced outline of the same shape
    const KZ = Z.ratchetClick;
    const shape = sdfShape(clickSdf, [P[0] - 1.2, P[1] - 0.9, P[0] + 0.9, P[1] + 2.3], [0, 0], 0.01);
    const body = shape.getPoints().map((v) => [v.x, v.y]);
    const lut = pawlLUT({ outline: ratchetOutline, teeth: WT.ratchet.teeth, C, body, P, tip, liftSign: -1, maxLift: 0.3 });
    const { object, rotor } = assembly(P);
    const b = new Batch();
    const leverAng = Math.atan2(tip[1] - P[1], tip[0] - P[0]);
    const cg = sdfExtrude(clickSdf, [P[0] - 1.2, P[1] - 0.9, P[0] + 0.9, P[1] + 2.3], P, KZ[0], KZ[1] - KZ[0], { bevel: 0.025, planarUV, uvAngle: leverAng });
    b.add(cg, satPair, null, BEVEL_CREASE);
    b.build(rotor);
    // pivot: a shouldered screw from the 3/4 plate, its small head under the click
    const sb = new Batch();
    sb.add(latheZ([[0, Z.threeQuarterPlate[1] + 0.05], [0.18, Z.threeQuarterPlate[1] + 0.05], [0.18, KZ[1] + 0.005], [0.34, KZ[1] + 0.005], [0.34, KZ[1] + 0.025], [0.31, KZ[1] + 0.035], [0, KZ[1] + 0.035]], 32), steelPol);
    sb.build(object);
    // radial lift of the beak per radian of pawl rotation (for the readout)
    const arm = [tip[0] - P[0], tip[1] - P[1]], uR = [Math.cos(gapA), Math.sin(gapA)];
    const radialPerRad = -arm[1] * uR[0] + arm[0] * uR[1];
    let clickAngle = 0;
    const clickAt = (f) => { const x = f * 48, i = Math.min(47, Math.floor(x)), t = x - i; return lut[i] + (lut[i + 1] - lut[i]) * t; };
    add({
      id: 'click', name: 'Click', category: 'keyless', side: 'back', exposed: false, priority: 2,
      object, rotor, anchor: [arm[0] * 0.55, arm[1] * 0.55, KZ[0]],
      description: 'A small steel pawl under the three-quarter plate whose beak rests between the ratchet teeth. Whenever the watch is wound — by the crown or by the rotor — it rides up each tooth and drops back; when winding stops it holds the ratchet, so the mainspring cannot unwind.',
      facts: { Engages: `ratchet wheel (${WT.ratchet.teeth} teeth)`, 'Clicks per ratchet turn': String(WT.ratchet.teeth), Finish: 'brushed, polished bevels', Position: 'EST (hidden)' },
      live: () => (clickAngle < -1e-4 ? `riding a tooth · lifted ${fmt(Math.abs(clickAngle * radialPerRad), 3)} mm` : 'resting in a tooth gap'),
      update: (s) => {
        const tp = (s.windAngle / TAU) * WT.ratchet.teeth; // the REAL 63-tooth phase (state.clickLift uses the engine's equivalent 48)
        clickAngle = clickAt(tp - Math.floor(tp));
        rotor.rotation.z = clickAngle;
      },
    });

    // click spring: a short curved blade from its foot, its nose pressing the pawl's arm
    // on the side away from the ratchet (a counter-clockwise torque about the pivot, which
    // pushes the beak into the teeth)
    const foot = WT.click.springAnchor;
    const armLen = Math.hypot(armEnd[0] - P[0], armEnd[1] - P[1]);
    const uA = [(armEnd[0] - P[0]) / armLen, (armEnd[1] - P[1]) / armLen];
    const right = [uA[1], -uA[0]]; // the arm's right-hand side = away from the ratchet
    const sC = 0.66, rAt = armR0 + ((armR1 - armR0) * sC) / armLen;
    const contact = [P[0] + sC * uA[0] + rAt * right[0], P[1] + sC * uA[1] + rAt * right[1]];
    const noseR = 0.085;
    const noseC = [contact[0] + (noseR + 0.004) * right[0], contact[1] + (noseR + 0.004) * right[1]];
    const ctrl = [(foot[0] + noseC[0]) / 2 + 0.14, (foot[1] + noseC[1]) / 2 - 0.2];
    const springSdf = sUnion(0.08, sdBlade(foot, ctrl, noseC, 0.11, 0.07), sdCircle(noseC[0], noseC[1], noseR), sdCircle(foot[0], foot[1], 0.24));
    const sp = assembly(foot);
    const spb = new Batch();
    const zs = [KZ[0] + 0.01, KZ[1] - 0.01];
    spb.add(sdfExtrude(springSdf, [foot[0] - 1.5, foot[1] - 1.2, foot[0] + 0.5, foot[1] + 0.5], foot, zs[0], zs[1] - zs[0], { bevel: 0.02, planarUV, uvAngle: Math.atan2(noseC[1] - foot[1], noseC[0] - foot[0]) }), satPair, null, BEVEL_CREASE);
    spb.build(sp.rotor);
    const stud = new Batch(); // the spring's fixed foot stud (from the 3/4 plate)
    stud.add(latheZ([[0, Z.threeQuarterPlate[1] + 0.05], [0.13, Z.threeQuarterPlate[1] + 0.05], [0.13, zs[1] + 0.005], [0.22, zs[1] + 0.005], [0.22, zs[1] + 0.02], [0, zs[1] + 0.02]], 28), steelPol);
    stud.build(sp.object);
    // the spring's nose follows the pawl (rigid rotation about the foot ≈ cantilever bend)
    const nD = [-right[0], -right[1]]; // contact normal into the pawl
    const m1 = -(contact[1] - P[1]) * nD[0] + (contact[0] - P[0]) * nD[1];
    const m2 = -(noseC[1] - foot[1]) * nD[0] + (noseC[0] - foot[0]) * nD[1];
    const springRatio = m1 / m2;
    add({
      id: 'click-spring', name: 'Click spring', category: 'keyless', side: 'back', exposed: false, priority: 3,
      object: sp.object, rotor: sp.rotor, anchor: [(noseC[0] - foot[0]) * 0.5, (noseC[1] - foot[1]) * 0.5, KZ[0]],
      description: 'A short curved steel spring that presses the click into the ratchet teeth and flexes a little every time the click rides over a tooth.',
      facts: { Material: 'hardened spring steel', Position: 'EST (hidden under the 3/4 plate)' },
      update: () => { sp.rotor.rotation.z = clickAngle * springRatio; },
    });
  }

  // ---------- TRANSMISSION WHEEL: idler 2's lower GILT wheel (W0), meshing the ratchet
  const idlerTube = { rOut: 0.40, rBore: 0.17 };
  {
    const { object, rotor } = assembly(L.windIdler2);
    const b = new Batch();
    const zw = Z.W0, T = zw[1] - zw[0];
    b.add(makeWheelGeo(gear, { teeth: WT.idler2.lowerTeeth, module: mR, thickness: T, bore: idlerTube.rBore }), giltPair, mtx(0, 0, (zw[0] + zw[1]) / 2), 38 * DEG);
    // its tube up through the plate's winding window to the steel idler on top
    b.add(latheZ([[idlerTube.rBore, zw[0] + 0.01], [idlerTube.rOut, zw[0] + 0.01], [idlerTube.rOut, Z.windIdlers[1] + 0.005], [idlerTube.rBore, Z.windIdlers[1] + 0.005], [idlerTube.rBore, zw[0] + 0.01]].reverse(), 40), steelPol);
    b.build(rotor);
    const ratio = RAT.idler2;
    add({
      id: 'transmission-wheel', name: 'Idler 2 lower wheel (gilt)', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object, rotor, anchor: [1.0, -0.9, zw[0]],
      description: 'The gilt lower wheel of the second winding idler, under the three-quarter plate; it meshes with the ratchet wheel and the two show together in the winding window. When you wind by hand the steel idler above drives it; when the rotor winds, it turns with the ratchet and runs on alone through a one-way coupling, so the crown wheel and the crown stay still.',
      facts: { Teeth: String(WT.idler2.lowerTeeth), 'Tip Ø': `${fmt(2 * tipR(WT.idler2.lowerTeeth, mR), 2)} mm`, Module: `${fmt(mR, 4)} mm`, Meshes: `ratchet (${WT.ratchet.teeth})`, Speed: `${fmt(Math.abs(ratio), 2)} × the ratchet`, Coupling: 'one-way to the steel idler (EST)' },
      live: (s) => `${fmt(degOf(ratio * s.rot.ratchet + PH.idler2Lower), 1)}°`,
      update: (s) => { rotor.rotation.z = ratio * s.rot.ratchet + PH.idler2Lower; },
    });
  }

  // ---------- CROWN WHEEL (on the 3/4 plate, in its pocket) + fixed cover
  const mW = MD.windA;
  {
    const { object, rotor } = assembly(L.crownWheel);
    const b = new Batch();
    const CZ = Z.crownWheel; // [−2.43, −2.27]; the visible face is CZ[0]
    const Rc = tipR(WT.crownWheel.teeth, mW);
    const cIn = 2.40, cHole = 1.32, zRim = CZ[0] + 0.02;
    const g = gear.extrudeOutline(gear.toothedOutline({ teeth: WT.crownWheel.teeth, module: mW }), [gear.circlePath(cIn, 160)], CZ[1] - zRim, { uvRadius: Rc });
    b.add(g, sunPair, mtx(0, 0, (zRim + CZ[1]) / 2), 35 * DEG);
    b.add(latheZ([[cHole, CZ[1]], [cHole, CZ[0]]], 96, Rc), steelPol); // bore
    b.add(latheZ([[cHole, CZ[0]], [cIn - 0.04, CZ[0]]], 160, Rc), sun); // sunburst annulus (visible face)
    b.add(latheZ([[cIn - 0.04, CZ[0]], [cIn + 0.012, zRim]], 160, Rc), steelPol); // fine polished step to the toothed rim
    b.add(latheZ([[cIn, CZ[1]], [cHole, CZ[1]]], 96, Rc), sun); // underside
    b.build(rotor);
    add({
      id: 'crown-wheel', name: 'Crown wheel', category: 'keyless', side: 'back', exposed: true, priority: 1,
      object, rotor, anchor: [-2.0, -1.5, CZ[0]],
      update: (s) => { manualUpdate(s); rotor.rotation.z = RAT.crownWheel * manualR + PH.crownWheel; },
      description: 'The large steel wheel in the rotor window. The winding pinion on the stem turns it when you wind by hand, and two idlers carry its motion on to the ratchet; when the rotor winds it stays still. It wears the Glashütte sunburst and turns round a fixed core under a polished cover.',
      facts: { Teeth: String(WT.crownWheel.teeth), 'Tip Ø': `${fmt(2 * Rc, 2)} mm`, Module: `${fmt(mW, 4)} mm`, 'Driven by': `winding pinion (${WT.windingPinion.teeth})`, Drives: `idler 1 (${WT.idler1.teeth})`, Finish: 'Glashütte sunburst' },
      live: () => `${fmt(degOf(RAT.crownWheel * manualR + PH.crownWheel), 1)}° · ${fmt((360 * WT.windingPinion.teeth) / WT.crownWheel.teeth, 1)}° per crown turn`,
    });
    // fixed polished cover disc on a core through the wheel's bore + 2 slotted screws
    const cov = assembly(L.crownWheel);
    const cb = new Batch();
    const VZ = Z.crownWheelCover; // [−2.53, −2.45]
    const rC = spec.frame.crownWheelCoverDisc.r;
    cb.add(latheZ([[0, VZ[0]], [rC - 0.05, VZ[0]], [rC, VZ[0] + 0.03], [rC, VZ[1]], [cHole - 0.02, VZ[1]], [cHole - 0.02, Z.windingPocketFloor], [0, Z.windingPocketFloor]], 160), softPol);
    const SS = spec.frame.steelScrews, rS = SS.crownWheelCoverHeadDiameter / 2;
    const slotDeg = [22, 58]; // as in the render (dial frame)
    SS.crownWheelCover.forEach((p, i) => {
      const zb = VZ[0] + 0.012;
      cb.add(screwGeo(rS, zb - Z.screwHeads[0], 0.11, 0.035), steelPol, screwMtx(p[0] - L.crownWheel[0], p[1] - L.crownWheel[1], zb, slotDeg[i], -1));
    });
    cb.build(cov.object);
    add({
      id: 'crown-wheel-cover', name: 'Crown-wheel cover', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object: cov.object, anchor: [1.2, 0.4, VZ[0]],
      description: 'A plain polished steel disc held by two small slotted screws. It caps the fixed core the crown wheel turns on and keeps the wheel in its pocket of the three-quarter plate; it does not turn.',
      facts: { 'Ø': `${fmt(2 * rC, 2)} mm`, Screws: `2, slotted, Ø ${fmt(2 * rS, 2)} mm`, Finish: 'polished' },
    });
  }

  // ---------- WINDING IDLERS (on the plate): idler 1 (screw + collar), idler 2 (cap)
  {
    const object = new THREE.Group();
    root.add(object);
    const i1 = new THREE.Group(), i2 = new THREE.Group();
    i1.position.set(L.windIdler1[0], L.windIdler1[1], 0);
    i2.position.set(L.windIdler2[0], L.windIdler2[1], 0);
    object.add(i1, i2);
    const r1 = new THREE.Group(), r2 = new THREE.Group();
    i1.add(r1); i2.add(r2);
    const IZ = Z.windIdlers, T = IZ[1] - IZ[0], zm = (IZ[0] + IZ[1]) / 2;
    // idler 1: steel wheel turning on a fixed bush; the polished collar over it is held by
    // the slotted screw
    const b1 = new Batch();
    const bore1 = 0.62;
    b1.add(makeWheelGeo(gear, { teeth: WT.idler1.teeth, module: MD.windB, thickness: T, bore: bore1 }), satPair, mtx(0, 0, zm, PH.idler1), 35 * DEG);
    b1.build(r1);
    const f1 = new Batch();
    const CZ = Z.windIdlerCaps; // [−2.53, −2.45]
    f1.add(latheZ([[0, CZ[0]], [0.76, CZ[0]], [0.8, CZ[0] + 0.03], [0.8, CZ[1]], [bore1 - 0.02, CZ[1]], [bore1 - 0.02, Z.windingPocketFloor], [0, Z.windingPocketFloor]], 64), softPol);
    const rs1 = spec.frame.steelScrews.windIdler1HeadDiameter / 2;
    f1.add(screwGeo(Math.min(rs1, 0.55), CZ[0] + 0.012 - Z.screwHeads[0], 0.11, 0.035), steelPol, screwMtx(0, 0, CZ[0] + 0.012, 2, -1));
    f1.build(i1);
    // idler 2 upper: steel wheel on its tube (shared with the gilt lower wheel) round a
    // fixed stud whose polished cap holds the pair
    const b2 = new Batch();
    b2.add(makeWheelGeo(gear, { teeth: WT.idler2.teeth, module: MD.windB, thickness: T, bore: idlerTube.rBore }), satPair, mtx(0, 0, zm, PH.idler2Upper), 35 * DEG);
    b2.build(r2);
    const f2 = new Batch();
    f2.add(latheZ([[0, CZ[0]], [0.74, CZ[0]], [0.8, CZ[0] + 0.035], [0.8, CZ[1]], [idlerTube.rBore - 0.02, CZ[1]], [idlerTube.rBore - 0.02, Z.W0[1] + 0.03], [0, Z.W0[1] + 0.03]], 64), softPol);
    f2.build(i2);
    const ra1 = RAT.idler1, ra2 = RAT.idler2;
    add({
      id: 'winding-idlers', name: 'Winding idlers', category: 'keyless', side: 'back', exposed: true, priority: 2,
      object, anchor: [L.windIdler1[0] - 1.2, L.windIdler1[1] - 0.6, IZ[0]],
      description: 'Two small steel wheels in the pocket of the three-quarter plate. They carry the crown wheel\'s motion over to the ratchet: idler 1 (with its screw and polished collar) turns idler 2, whose gilt lower wheel under the plate meshes the ratchet.',
      facts: {
        'Idler 1': `${WT.idler1.teeth} teeth, tip Ø ${fmt(2 * tipR(WT.idler1.teeth, MD.windB), 2)} mm`,
        'Idler 2': `${WT.idler2.teeth} teeth, tip Ø ${fmt(2 * tipR(WT.idler2.teeth, MD.windB), 2)} mm (+ gilt ${WT.idler2.lowerTeeth} below)`,
        Module: `${fmt(MD.windB, 4)} mm`, Speeds: `${fmt(ra1, 1)} / ${fmt(Math.abs(ra2), 0)} × the ratchet`,
      },
      live: () => `idler 1 ${fmt(degOf(ra1 * manualR), 0)}° · idler 2 ${fmt(degOf(ra2 * manualR), 0)}°`,
      update: (s) => {
        manualUpdate(s);
        r1.rotation.z = ra1 * manualR;
        r2.rotation.z = ra2 * manualR;
      },
    });
  }

  // ===================================================================== KEYLESS — STEM SIDE
  // Stem axis y = stemY, z = stemAxis. The whole hand-winding chain — crown, stem, sliding
  // and winding pinions, crown wheel, idler 1 and idler 2's steel wheel — turns only when the
  // crown is turned (the engine's manual wind angle, as rot.crownWheel / rot.stem now are).
  // The rotor winds the ratchet through its own train; idler 2's gilt lower wheel, which
  // meshes the ratchet, then runs on alone through a one-way coupling to its steel wheel, so
  // the crown wheel and the crown stay still (every visible mesh stays consistent).
  const zWP = WT.windingPinion.teeth;
  const NB = 9, HB = 0.12, pB = TAU / NB; // Breguet coupling: 9 saw teeth, 0.12 high
  const xB = ST.wpIn; // the coupling plane (winding pinion's inner face)
  // sliding pinion (position 1 = winding): body + groove for the yoke, Breguet teeth whose
  // tips reach the coupling plane; its contrate teeth face the setting idler with a gap
  // larger than the Breguet height, so the back-off never reaches the idler's teeth.
  const SPX = { contrate: [8.62, 8.72], body: [8.72, xB - HB], groove: [8.98, 9.22], grooveR: 0.6, r: 0.8 };
  let manualR = 0; // the manually wound part of the ratchet angle (rad)
  let stemAngle = 0; // crown / stem angle (rotation about +X, = the engine's manual rot.stem)
  let lastKey = NaN;
  const manualUpdate = (s) => {
    if (s.ms === lastKey) return;
    lastKey = s.ms;
    // engine ≥ 03:21 exposes state.manualWindAngle; otherwise finish.manualStemAngle()
    // recovers the same manual part from windAngle and the rotor's motion
    manualR = s.manualWindAngle !== undefined ? s.manualWindAngle : manualStemAngle(s, spec) / RAT.windingPinion;
    stemAngle = RAT.windingPinion * manualR;
  };

  {
    // WINDING STEM
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    b.add(latheX([[0, ST.pilot], [0.16, ST.pilot], [0.22, ST.pilot + 0.06], [0.22, ST.journal], [0.32, ST.journal + 0.07], [0.32, ST.sq0], [0, ST.sq0]], 28), steelPol);
    const sq = new THREE.BoxGeometry(ST.sq1 - ST.sq0, 0.6, 0.6);
    b.add(sq, steelPol, mtx((ST.sq0 + ST.sq1) / 2, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 4)));
    const prof = [[0, ST.sq1], [0.3, ST.sq1], [0.3, ST.shoulder], [0.45, ST.shoulder + 0.07], [0.45, ST.groove[0]], [0.31, ST.groove[0] + 0.08],
      [0.31, ST.groove[1] - 0.08], [0.45, ST.groove[1]], [0.45, ST.neck], [0.36, ST.neck + 0.08], [0.36, ST.thread]];
    for (let x = ST.thread + 0.05, k = 0; x < ST.end - 0.08; x += 0.07, k++) prof.push([k % 2 ? 0.36 : 0.29, x]);
    prof.push([0.26, ST.end - 0.03], [0, ST.end]);
    b.add(latheX(prof, 28), steelPol);
    b.build(rotor);
    add({
      id: 'winding-stem', name: 'Winding stem', category: 'keyless', side: 'both', exposed: false, priority: 2,
      object, rotor, anchor: [12.6, 0, 0.45],
      description: 'The steel shaft from the crown into the movement. Its square turns the sliding pinion, and the setting-lever pin rides in its groove to hold it in one of the three crown positions (wind, quick-set date, set time). It turns only when you turn the crown — never when the rotor winds.',
      facts: { 'Ø': '0.90 mm', Positions: '3 — wind / date / time + stop seconds', Drives: 'sliding pinion via its square' },
      live: () => `${fmt(degOf(stemAngle), 0)}° (crown)`,
      update: (s) => { manualUpdate(s); rotor.rotation.x = stemAngle; },
    });
  }
  {
    // WINDING PINION: 17 teeth under the crown wheel's rim + Breguet teeth on its inner face
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    const tl = ST.wpTeeth[1] - ST.wpTeeth[0];
    const teeth = gear.extrudeOutline(windingPinionOutline(gear, spec), [gear.circlePath(0.31, 32)], tl);
    b.add(teeth, pinPair, onX((ST.wpTeeth[0] + ST.wpTeeth[1]) / 2, PH.windingPinion), 35 * DEG);
    b.add(latheX([[0.31, xB], [0.76, xB], [0.78, xB + 0.02], [0.78, ST.wpTeeth[0] - 0.02], [0.8, ST.wpTeeth[0] + 0.01], [0.31, ST.wpTeeth[0] + 0.01]], 36), steelPol);
    b.add(latheX([[0.31, ST.wpTeeth[1] - 0.01], [0.78, ST.wpTeeth[1] - 0.01], [0.78, ST.wpOut - 0.03], [0.74, ST.wpOut], [0.31, ST.wpOut]], 36), steelPol);
    // Breguet saw teeth facing −x (towards the sliding pinion), complementary to its teeth
    b.add(faceTeethGeo({ teeth: NB, rIn: 0.36, rOut: 0.74, H: HB, mode: 'saw', reverse: true }), steelDS, onX(xB, PH.windingPinion, ANX));
    b.build(rotor);
    add({
      id: 'winding-pinion', name: 'Winding pinion', category: 'keyless', side: 'back', exposed: true, priority: 2,
      object, rotor, anchor: [(ST.wpTeeth[0] + ST.wpTeeth[1]) / 2, 0, -1.3],
      description: 'Turns freely on the stem and is driven by the sliding pinion through Breguet (saw) teeth. Its 17 teeth reach through a slot in the three-quarter plate to turn the crown wheel — its dark teeth show at the edge of the crown wheel. It turns only when you wind by hand.',
      facts: { Teeth: String(zWP), 'Tip Ø': `${fmt(2 * tipR(zWP, mW), 2)} mm`, Module: `${fmt(mW, 4)} mm`, Drives: `crown wheel (${WT.crownWheel.teeth})`, Coupling: `Breguet teeth (${NB}, one-way)` },
      live: () => `${fmt(degOf(stemAngle), 0)}° · turns with the crown`,
      update: (s) => { manualUpdate(s); rotor.rotation.x = stemAngle; }, // its mesh phase is in the geometry
    });
  }
  {
    // SLIDING PINION on the square of the stem
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    const [g0, g1] = SPX.groove, r = SPX.r, gr = SPX.grooveR;
    b.add(latheX([[0.43, SPX.body[0]], [r - 0.03, SPX.body[0]], [r, SPX.body[0] + 0.03], [r, g0 - 0.04], [r - 0.04, g0], [gr, g0],
      [gr, g1], [r - 0.04, g1], [r, g1 + 0.04], [r, SPX.body[1] - 0.03], [r - 0.03, SPX.body[1]], [0.43, SPX.body[1]]], 40), steelPol);
    b.add(faceTeethGeo({ teeth: NB, rIn: 0.36, rOut: 0.74, H: HB, mode: 'saw', reverse: true }), steelDS, onX(SPX.body[1], PH.windingPinion, AX));
    b.add(faceTeethGeo({ teeth: WT.slidingPinion.teeth, rIn: 0.45, rOut: 0.78, H: SPX.contrate[1] - SPX.contrate[0], mode: 'tri' }), steelDS, onX(SPX.contrate[1], 0, ANX));
    b.build(rotor);
    add({
      id: 'sliding-pinion', name: 'Sliding pinion', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [(SPX.body[0] + SPX.body[1]) / 2, 0, 0.75],
      description: 'Slides on the square of the stem. In the winding position the yoke presses it against the winding pinion (Breguet teeth); pulled out to set the time, it shifts the other way and its contrate teeth turn the setting idler and so the hands.',
      facts: { 'Outer teeth': `${NB} Breguet teeth (to the winding pinion)`, 'Inner teeth': `${WT.slidingPinion.teeth} contrate teeth (to the setting idler)`, Position: '1 — winding' },
      live: () => 'winding position — engaged with the winding pinion',
      update: (s) => {
        manualUpdate(s);
        rotor.rotation.x = stemAngle; // Breguet teeth phased with the winding pinion's in the geometry
      },
    });
  }

  // ---------- setting wheel + setting idler: always turning with the motion works
  const KZ = Z.keylessLevers; // [−0.33, −0.19]
  {
    const sz = Z.settingWheels; // [−0.42, −0.20]
    const mk = (id, pos, teeth, key, phase, name, desc, facts) => {
      const { object, rotor } = assembly(pos);
      const b = new Batch();
      b.add(makeWheelGeo(gear, { teeth, module: MD.setting, thickness: sz[1] - sz[0], bore: 0.24 }), pinPair, mtx(0, 0, (sz[0] + sz[1]) / 2, phase), 35 * DEG);
      b.build(rotor);
      const p = new Batch();
      p.add(latheZ([[0, Z.settingPocket], [0.22, Z.settingPocket], [0.22, sz[1] + 0.005], [0.33, sz[1] + 0.005], [0.33, sz[1] + 0.035], [0.3, sz[1] + 0.05], [0, sz[1] + 0.05]], 28), steelPol);
      p.build(object);
      const period = (spec.arbors[key].period / 60).toFixed(0);
      add({
        id, name, category: 'keyless', side: 'front', exposed: false, priority: 3,
        object, rotor, drive: { key }, anchor: [0.9, 0.5, sz[1]],
        description: desc, facts: { Teeth: String(teeth), Module: `${fmt(MD.setting, 4)} mm`, ...facts, Speed: `1 turn / ${period} min` },
        live: (s) => `${fmt(degOf(s.rot[key] + phase), 1)}° · 1 turn / ${period} min`,
      });
    };
    mk('setting-wheel', L.settingWheel, WT.settingWheel.teeth, 'settingWheel', PH.settingWheel, 'Setting wheel',
      'The link between the keyless works and the motion works. It is always in mesh with the minute wheel, so it turns all the time; when the crown is pulled out, the setting idler and the sliding pinion turn it to set the hands.',
      { Meshes: `minute wheel (${TR.minuteWheel.teeth}) and the setting idler` });
    mk('setting-idler', L.settingIdler, WT.settingIdler.teeth, 'settingIdler', PH.settingIdler, 'Setting idler',
      'The intermediate setting wheel next to the stem. In the time-setting position the sliding pinion\'s contrate teeth engage it; in the winding position shown, they stand clear of it.',
      { Meshes: 'setting wheel; sliding pinion in crown position 3' });
  }

  // ---------- setting lever, yoke, springs, stop-seconds lever (dial side, keyless recess)
  const frontScrew = (bt, p, slot, zTop = KZ[1]) => bt.add(screwGeo(0.3, 0.11, 0.08, 0.04), steelPol, screwMtx(p[0], p[1], zTop, slot, 1));
  const S = spec.layout.settingLever, Y = spec.layout.yoke;
  const pinX = (ST.groove[0] + ST.groove[1]) / 2 - 0.16; // setting-lever pin in the stem groove, inside the recess (x ≤ 11.2)
  const SL = { a1: [10.45, 2.2], a2: [10.95, 0.62], fin: [11.1, 0.0], tail: [7.35, 3.72] };
  {
    const sdf = sUnion(0.22,
      sdCircle(S[0], S[1], 0.46), sdCapsule(S, SL.a1, 0.26, 0.24), sdCapsule(SL.a1, SL.a2, 0.24, 0.19),
      sdCapsule(SL.a2, SL.fin, 0.17, 0.085), sdCapsule(S, SL.tail, 0.22, 0.15));
    const object = new THREE.Group(); object.position.set(S[0], S[1], 0); root.add(object);
    const b = new Batch();
    b.add(sdfExtrude(sdf, [6.8, -0.3, 11.3, 4.1], S, KZ[0], KZ[1] - KZ[0], { h: 0.016, bevel: 0.025, planarUV, uvAngle: Math.atan2(SL.a1[1] - S[1], SL.a1[0] - S[0]) }), satPair, null, BEVEL_CREASE);
    // pin down through the plate into the stem groove (groove floor r 0.31)
    const pz0 = SZ + 0.33;
    b.add(latheZ([[0, pz0], [0.05, pz0], [0.065, pz0 + 0.03], [0.065, KZ[0] + 0.01], [0, KZ[0] + 0.01]], 20), steelPol, mtx(pinX - S[0], SY - S[1], 0));
    frontScrew(b, [0, 0], 35);
    b.build(object);
    add({
      id: 'setting-lever', name: 'Setting lever', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [(SL.a1[0] - S[0]) * 0.6, (SL.a1[1] - S[1]) * 0.6, KZ[1]],
      description: 'A pivoting lever whose pin sits in the groove of the winding stem. Pulling the crown swings it, and it moves the yoke to switch the keyless works from winding to date-setting and hand-setting.',
      facts: { Pivot: 'setting-lever screw', Positions: '3 (held by the jumper)', Outline: 'EST (hidden under the dial)' },
    });
  }
  // yoke: arm from its pivot to a fork that straddles the sliding pinion's groove
  const forkX = (SPX.groove[0] + SPX.groove[1]) / 2 - 0.04; // fingers against the groove's −x wall
  const YK = { k1: [8.35, -1.98], k2: [forkX, -0.98] };
  {
    const sdf = sUnion(0.2, sdCircle(Y[0], Y[1], 0.36), sdCapsule(Y, YK.k1, 0.26, 0.23), sdCapsule(YK.k1, YK.k2, 0.23, 0.12),
      sdCapsule(YK.k2, [forkX, 0.83], 0.055, 0.055));
    const object = new THREE.Group(); object.position.set(Y[0], Y[1], 0); root.add(object);
    const rot = new THREE.Group(); object.add(rot);
    const b = new Batch();
    b.add(sdfExtrude(sdf, [6.0, -3.1, 9.5, 1.1], Y, KZ[0], KZ[1] - KZ[0], { h: 0.012, bevel: 0.02, planarUV, uvAngle: Math.atan2(YK.k1[1] - Y[1], YK.k1[0] - Y[0]) }), satPair, null, BEVEL_CREASE);
    // fingers hanging into the groove on both sides of the pinion (above the axis level)
    const fz0 = SZ + 0.17, fz1 = KZ[0] + 0.01;
    for (const fy of [-0.77, 0.77]) b.add(new THREE.BoxGeometry(0.1, 0.12, fz1 - fz0), steelPol, mtx(forkX - Y[0], SY + fy - Y[1], (fz0 + fz1) / 2));
    b.build(rot);
    const sb = new Batch();
    frontScrew(sb, [0, 0], 120);
    sb.build(object);
    add({
      id: 'yoke', name: 'Yoke', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [(YK.k1[0] - Y[0]) * 0.5, (YK.k1[1] - Y[1]) * 0.5, KZ[1]],
      description: 'A forked lever whose fingers sit in the groove of the sliding pinion. Its spring keeps the sliding pinion against the winding pinion; the setting lever swings it over for date- and time-setting.',
      facts: { Pivot: 'yoke screw', Spring: 'yoke spring', Outline: 'EST (hidden under the dial)' },
    });
  }
  {
    // yoke spring (presses the yoke's arm, keeping the sliding pinion engaged) and the
    // setting-lever jumper (holds the setting lever, and so the crown, in its positions)
    const f1 = [6.02, -1.3], n1 = [7.6, -1.88];
    const yokeSpring = sUnion(0.12, sdBlade(f1, [6.85, -1.45], n1, 0.12, 0.08), sdCircle(n1[0], n1[1], 0.1), sdCircle(f1[0], f1[1], 0.27));
    const f2 = [10.3, 3.62], n2 = [SL.tail[0] + 0.05, SL.tail[1] + 0.28];
    const jumper = sUnion(0.12, sdBlade(f2, [8.9, 4.05], n2, 0.12, 0.08), sdCircle(n2[0], n2[1], 0.12), sdCircle(f2[0], f2[1], 0.28));
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const zS = Z.keylessSprings;
    b.add(sdfExtrude(yokeSpring, [5.5, -2.2, 8.0, -0.8], [0, 0], zS[0], zS[1] - zS[0], { h: 0.012, bevel: 0.02, planarUV, uvAngle: -0.3 }), [steelPol, steelPol], null, BEVEL_CREASE);
    b.add(sdfExtrude(jumper, [6.9, 3.0, 10.8, 4.2], [0, 0], zS[0], zS[1] - zS[0], { h: 0.012, bevel: 0.02, planarUV, uvAngle: 0.2 }), [steelPol, steelPol], null, BEVEL_CREASE);
    frontScrew(b, f1, 70, zS[1]);
    frontScrew(b, f2, 20, zS[1]);
    b.build(object);
    add({
      id: 'keyless-springs', name: 'Keyless springs', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [n1[0] - 0.3, n1[1] + 0.3, zS[1]],
      description: 'Two flat steel springs: the yoke spring keeps the sliding pinion engaged with the winding pinion, and the setting-lever jumper holds the setting lever — and so the crown — firmly in each of its positions.',
      facts: { Parts: 'yoke spring, setting-lever jumper', Material: 'hardened spring steel', Outline: 'EST (hidden under the dial)' },
    });
  }
  {
    // stop-seconds lever: a short static lever in the keyless recess
    const p0 = [6.15, 3.4], p1 = [6.55, 2.1];
    const sdf = sUnion(0.15, sdCircle(p0[0], p0[1], 0.3), sdCapsule(p0, p1, 0.2, 0.12));
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    b.add(sdfExtrude(sdf, [5.6, 1.7, 6.9, 3.9], [0, 0], KZ[0], KZ[1] - KZ[0], { h: 0.012, bevel: 0.02, planarUV, uvAngle: -1.2 }), satPair, null, BEVEL_CREASE);
    frontScrew(b, p0, 160);
    b.build(object);
    add({
      id: 'stop-seconds-lever', name: 'Stop-seconds lever', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [p1[0], p1[1] + 0.3, KZ[1]],
      description: 'In crown position 3 the keyless works move this lever, which stops the balance so the time can be set to the second. Only its pivot end in the keyless works is shown: how it reaches the balance at 8 o\'clock is hidden and not documented.',
      facts: { Acts: 'on the balance rim (crown position 3)', Shape: 'EST — only the keyless end is modelled' },
    });
  }
}
