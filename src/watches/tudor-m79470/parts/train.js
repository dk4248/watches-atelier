// GOING TRAIN of the Tudor MT5652 (builder C): mainspring barrel (drum, cover, arbor, spring),
// centre, third and fourth wheels (DIRECT centre seconds: the fourth wheel's long arbor runs
// through the hollow centre arbor and carries the seconds hand), and the keyless wheels on the
// barrel bridge (ratchet, crown wheel, winding intermediate, click + spring).
//
// Everything comes from SPEC (layout, tooth counts, modules, z levels, explode). Meshing pairs
// interleave through gear.meshPhase with the pairs of SPEC.meshes; speeds and senses come from
// the kinematics (state.rot). The click follows a contact table solved once against the real
// ratchet outline. Module-local cosmetics (fillets, bevels, segment counts) are named constants.
//
// The geometry helpers below are also used by dialworks.js (same watch, same builder).
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const V2 = (x, y) => new THREE.Vector2(x, y);
// bevelled extrusions: the first bevel facet is 22.5° off the face, keep the crease below it
export const BEVEL_CREASE = 15 * DEG;

// ------------------------------------------------------------------ geometry utilities
function nonIndexed(g) { return g.index ? g.toNonIndexed() : g.clone(); }
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
// smooth normals across faces meeting at less than `angle` (scaled up: toCreasedNormals hashes
// positions at 0.01 units, too coarse for 0.05 mm teeth)
export function crease(g, angle = 40 * DEG) {
  g.scale(100, 100, 100);
  const r = toCreasedNormals(g, angle);
  r.scale(0.01, 0.01, 0.01);
  return r;
}
// one merged mesh per material (a material array on add() splits the geometry's groups)
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
  build(parent, { shadow = true } = {}) {
    const meshes = [];
    for (const [mat, geos] of this.map) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.map.clear();
    return meshes;
  }
}
export const mtx = (x = 0, y = 0, z = 0, rz = 0) => new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z);
// extruded (u, v, w) → along +X: (u, v, w) ↦ (w, u, v)
export const AX = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
export const ANX = new THREE.Matrix4().set(0, 0, -1, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1);
export const onX = (x, y = 0, z = 0, phase = 0, base = AX) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationX(phase)).multiply(base);

export function discUV(g, R) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getX(i) / (2 * R) + 0.5; uv[2 * i + 1] = p.getY(i) / (2 * R) + 0.5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
// Surface of revolution about Z; profile [[r, z], …] runs counter-clockwise round the
// section (outer walls upwards, top faces inwards) so normals face out. Split at sharp
// corners so shoulders stay crisp.
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
// about +X: profile [[r, x], …] ascending x along the outer surface
export function latheX(profile, segs = 32) {
  return mergeGeometries(lathePieces(profile, segs).map((p) => p.rotateZ(-Math.PI / 2)), false);
}

// ------------------------------------------------------------------ 2-D signed distances
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
// annular band round (cx, cy) between radii r0..r1 and angles a0..a1 (rad, CCW), round ends
export function sdArcBand(cx, cy, r0, r1, a0, a1) {
  const rm = (r0 + r1) / 2, hw = (r1 - r0) / 2;
  const e0 = [cx + rm * Math.cos(a0), cy + rm * Math.sin(a0)], e1 = [cx + rm * Math.cos(a1), cy + rm * Math.sin(a1)];
  return (x, y) => {
    let a = Math.atan2(y - cy, x - cx);
    while (a < a0) a += TAU;
    if (a <= a1) return Math.abs(Math.hypot(x - cx, y - cy) - rm) - hw;
    return Math.min(Math.hypot(x - e0[0], y - e0[1]), Math.hypot(x - e1[0], y - e1[1])) - hw;
  };
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const sUnion = (k, ...fs) => (x, y) => { let d = fs[0](x, y); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y), k); return d; };
export const sSub = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
// quadratic Bézier blade with a tapering half-width (springs, wires)
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
// a polyline wire of constant half-width
export function sdWire(pts, w) {
  const caps = [];
  for (let i = 1; i < pts.length; i++) caps.push(sdCapsule(pts[i - 1], pts[i], w));
  return (x, y) => { let d = Infinity; for (const f of caps) { const v = f(x, y); if (v < d) d = v; } return d; };
}

// marching squares on the zero level set → closed loops
function contours(sdf, x0, y0, x1, y1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1;
  const f = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = sdf(x0 + i * h, y0 + j * h);
  const H = nx * ny;
  const ptOf = new Map(), adj = new Map();
  const point = (id) => {
    if (ptOf.has(id)) return;
    let p;
    if (id < H) { const i = id % nx, j = (id - i) / nx, a = f[id], b = f[id + 1]; p = V2(x0 + (i + a / (a - b)) * h, y0 + j * h); } else { const k = id - H, i = k % nx, j = (k - i) / nx, a = f[k], b = f[k + nx]; p = V2(x0 + i * h, y0 + (j + a / (a - b)) * h); }
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
  const seen = new Set(), loops = [];
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
function simplifyLoop(pts, tol) {
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
const loopArea = (pts) => { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) a += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y); return a / 2; };
// SDF outline → bevelled extrusion from z0 to z0 + T (coordinates local to `origin`).
// Groups: 0 = faces, 1 = sides incl. the polished bevel.
export function sdfExtrude(sdf, box, origin, z0, T, { h = 0.012, bevel = 0.03, uvAngle = 0, uvScale = 0.25, planarUV, tol = 0.0012, segs = 2 } = {}) {
  const loops = contours(sdf, box[0], box[1], box[2], box[3], h).map((l) => simplifyLoop(l, tol));
  loops.sort((a, b) => Math.abs(loopArea(b)) - Math.abs(loopArea(a)));
  const toLocal = (l) => l.map((p) => V2(p.x - origin[0], p.y - origin[1]));
  // outer loops = those not inside a bigger loop (several islands are allowed)
  const shapes = [];
  const inLoop = (pt, loop) => { let s = false; for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) { const a = loop[i], b = loop[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) s = !s; } return s; };
  for (const l of loops) {
    const host = shapes.find((s) => inLoop(l[0], s.loop) && !s.holes.some((hh) => inLoop(l[0], hh)));
    if (host) host.holes.push(l); else shapes.push({ loop: l, holes: [] });
  }
  const bt = Math.min(bevel, T * 0.25);
  const shs = shapes.map((s) => {
    const shape = new THREE.Shape(toLocal(s.loop));
    for (const hl of s.holes) shape.holes.push(new THREE.Path(toLocal(hl)));
    return shape;
  });
  const g = new THREE.ExtrudeGeometry(shs.length === 1 ? shs[0] : shs, { depth: T - 2 * bt, bevelEnabled: bevel > 0, bevelThickness: bt, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: segs, curveSegments: 4 });
  g.translate(0, 0, z0 + bt);
  if (planarUV) planarUV(g, uvScale, [0, 0], uvAngle);
  return g;
}

// ------------------------------------------------------------------ gearing helpers
// Window between two crossings (spokes), with filleted corners.
function spokeWindow(a0, a1, R, r, hw, fillet) {
  const edge = (a, side, rad) => { const s = Math.sqrt(Math.max(1e-6, rad * rad - hw * hw)), c = Math.cos(a), sn = Math.sin(a); return V2(s * c - side * hw * sn, s * sn + side * hw * c); };
  const A = edge(a0, 1, r), Bc = edge(a0, 1, R), C = edge(a1, -1, R), D = edge(a1, -1, r);
  const arc = (rad, ang) => V2(rad * Math.cos(ang), rad * Math.sin(ang));
  const angB = Math.atan2(Bc.y, Bc.x);
  let angC = Math.atan2(C.y, C.x); while (angC < angB) angC += TAU;
  const angA = Math.atan2(A.y, A.x);
  let angD = Math.atan2(D.y, D.x); while (angD < angA) angD += TAU;
  const fR = Math.min(fillet, 0.3 * (angC - angB) * R), fr = Math.min(fillet, 0.3 * (angD - angA) * r);
  const eAB = Bc.clone().sub(A).normalize(), eCD = D.clone().sub(C).normalize();
  const pts = [];
  const bez = (p0, p, p1, n = 5) => { for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; pts.push(V2(u * u * p0.x + 2 * u * t * p.x + t * t * p1.x, u * u * p0.y + 2 * u * t * p.y + t * t * p1.y)); } };
  bez(arc(r, angA + fr / r), A, A.clone().addScaledVector(eAB, fr));
  bez(Bc.clone().addScaledVector(eAB, -fR), Bc, arc(R, angB + fR / R));
  const a0R = angB + fR / R, a1R = angC - fR / R, nR = Math.max(4, Math.ceil(((a1R - a0R) * R) / 0.05));
  for (let k = 1; k < nR; k++) pts.push(arc(R, a0R + ((a1R - a0R) * k) / nR));
  bez(arc(R, angC - fR / R), C, C.clone().addScaledVector(eCD, fR));
  bez(D.clone().addScaledVector(eCD, -fr), D, arc(r, angD - fr / r));
  const a0r = angD - fr / r, a1r = angA + fr / r, nr = Math.max(3, Math.ceil(((a0r - a1r) * r) / 0.05));
  for (let k = 1; k < nr; k++) pts.push(arc(r, a0r + ((a1r - a0r) * k) / nr));
  return pts;
}
// spoked wheel: toothed rim, `spokes` crossings (0 = plain disc), optional bore and extra holes
export function wheelGeo(gear, { teeth, module: m, thickness, spokes = 0, rimW = 0.25, hubR = 0.5, spokeW = 0.2, fillet = 0.1, phase = 0, bore = 0, holes: extra = [], outline }) {
  const ol = outline || gear.toothedOutline({ teeth, module: m });
  const rr = (m * teeth) / 2 - 1.6 * m;
  const holes = [...extra];
  for (let j = 0; j < spokes; j++) {
    const a0 = phase + (j * TAU) / spokes;
    holes.push(new THREE.Path(spokeWindow(a0, a0 + TAU / spokes, rr - rimW, hubR, spokeW / 2, fillet)));
  }
  if (bore) holes.push(gear.circlePath(bore, 40));
  return gear.extrudeOutline(ol, holes, thickness);
}
export function pinionGeo(gear, { leaves, module: m, length, bore = 0 }) {
  return gear.extrudeOutline(gear.pinionOutline({ leaves, module: m }), bore ? [gear.circlePath(bore, 24)] : null, length);
}
// face (axial) teeth on an annulus rising along +w (0 → H): 'saw' = Breguet teeth, 'tri' = contrate
export function faceTeethGeo({ teeth, rIn, rOut, H, mode = 'saw', steps = 4 }) {
  const pos = [];
  const pitch = TAU / teeth;
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const P = (r, a, w) => [r * Math.cos(a), r * Math.sin(a), w];
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
    if (mode === 'saw') { const a = (i + 1) * pitch; quad(P(rIn, a, H), P(rOut, a, H), P(rOut, a, 0), P(rIn, a, 0)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return stdAttrs(g);
}
// slotted screw: head base at z = 0, top at +h; slot along local X
const screwCache = new Map();
export function screwGeo(r, h, slotW, slotD, { countersunk = false } = {}) {
  const key = `${r}|${h}|${slotW}|${slotD}|${countersunk}`;
  if (screwCache.has(key)) return screwCache.get(key);
  const zs = h - slotD, zc = Math.min(h * 0.7, zs - 0.004);
  const base = countersunk && zc > 0.004
    ? latheZ([[0, 0], [r * 0.62, 0], [r, zc], [r, zs], [0, zs]], 40, r)
    : latheZ([[0, 0], [r, 0], [r, zs], [0, zs]], 40, r);
  const a0 = Math.asin(Math.min(0.9, slotW / 2 / r));
  const pts = [];
  for (let k = 0; k <= 24; k++) { const a = a0 + ((Math.PI - 2 * a0) * k) / 24; pts.push(V2(r * Math.cos(a), r * Math.sin(a))); }
  const bt = Math.min(0.015, slotD / 3);
  const half = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: slotD - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: Math.min(0.025, r * 0.06), bevelOffset: -Math.min(0.025, r * 0.06), bevelSegments: 2, curveSegments: 4 });
  half.translate(0, 0, h - slotD + bt);
  const other = half.clone().rotateZ(Math.PI);
  const g = mergeGeometries([stdAttrs(base), stdAttrs(nonIndexed(half)), stdAttrs(nonIndexed(other))], false);
  discUV(g, r);
  screwCache.set(key, g);
  return g;
}
// a screw facing +z (front) or −z (back) with its slot at `slotDeg`
export function screwMtx(x, y, zBase, slotDeg, facing) {
  if (facing > 0) return mtx(x, y, zBase, slotDeg * DEG);
  return new THREE.Matrix4().makeTranslation(x, y, zBase).multiply(new THREE.Matrix4().makeRotationX(Math.PI)).multiply(new THREE.Matrix4().makeRotationZ(-slotDeg * DEG));
}

// Contact table of a pawl (click, jumper) on a toothed part: for N phases of one pitch,
// the smallest rotation (sense `sign`) about `pivot` that keeps the densified nose outline
// out of the teeth; inside(x, y, phase) says whether a world point lies in the tooth material
// when the toothed part has advanced by `phase` (rad). Solved once by bisection.
export function contactLUT({ N = 48, pitch, pivot, nose, inside, sign, maxA = 0.35, iters = 20 }) {
  const lut = new Float32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const w = ((k % N) / N) * pitch;
    const hits = (a) => {
      const c = Math.cos(a), s = Math.sin(a);
      for (const [x, y] of nose) {
        const dx = x - pivot[0], dy = y - pivot[1];
        if (inside(pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c, w)) return true;
      }
      return false;
    };
    if (!hits(0)) { lut[k] = 0; continue; }
    let lo = 0, hi = maxA;
    for (let it = 0; it < iters; it++) { const m = (lo + hi) / 2; if (hits(sign * m)) lo = m; else hi = m; }
    lut[k] = sign * hi;
  }
  return (f) => { const x = (f - Math.floor(f)) * N, i = Math.min(N - 1, Math.floor(x)), t = x - i; return lut[i] + (lut[i + 1] - lut[i]) * t; };
}
// densify a closed polygon (edge samples every h)
export function densify(poly, h) {
  const o = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / h));
    for (let k = 0; k < n; k++) o.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  }
  return o;
}
// polar profile of a toothed outline over one pitch (max radius per angular bin)
export function polarProfile(outline, pitch, NB = 512) {
  const prof = new Float32Array(NB);
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], c = outline[(i + 1) % outline.length];
    for (let k = 0; k <= 24; k++) {
      const x = a.x + ((c.x - a.x) * k) / 24, y = a.y + ((c.y - a.y) * k) / 24;
      let u = Math.atan2(y, x) / pitch; u -= Math.floor(u);
      const bin = Math.min(NB - 1, Math.floor(u * NB));
      prof[bin] = Math.max(prof[bin], Math.hypot(x, y));
    }
  }
  return (ang) => { let u = ang / pitch; u -= Math.floor(u); return prof[Math.min(NB - 1, Math.floor(u * NB))]; };
}

// ------------------------------------------------------------------ materials of builder C
// (cached per material library, shared by train.js and dialworks.js; clones only)
const matCache = new WeakMap();
export function movementMaterials(M, spec) {
  if (matCache.has(M)) return matCache.get(M);
  const fin = spec.movement.finishes;
  const gilt = M.wheelGilt.clone(); gilt.color.set(fin.wheels.gilt); gilt.roughness = 0.32;
  const giltEdge = M.wheelGilt.clone();
  giltEdge.normalMap = null; giltEdge.roughnessMap = null; giltEdge.anisotropyMap = null; giltEdge.anisotropy = 0;
  giltEdge.roughness = 0.16; giltEdge.color.set(0xd9c08a);
  const steelWheel = M.wheelRhodium.clone(); steelWheel.color.set(fin.wheels.steel); steelWheel.roughness = 0.28;
  const steelEdge = M.steelPolished;
  const pinion = M.steelPinion;
  const barrel = M.steelSatin.clone(); barrel.color.set(fin.wheels.barrel); barrel.roughness = 0.34; barrel.anisotropy = 0.3;
  const barrelEdge = M.steelPinion.clone(); barrelEdge.color.set(0xa9aeb4);
  const spring = M.steelDark.clone(); spring.color.set(0x8a9097); spring.roughness = 0.24;
  const satin = M.steelSatin.clone(); satin.color.set(0xc8cbcf); satin.roughness = 0.34; satin.anisotropy = 0.5;
  const dark = M.steelDark.clone(); dark.color.set(0x6f757d); dark.roughness = 0.4; // sand-blasted dark steel (levers, plates)
  const plate = M.steelSatin.clone(); plate.color.set(spec.movement.finishes.mainPlate.colour); plate.roughness = 0.55; plate.anisotropy = 0; // sand-blasted calendar plate
  const plateEdge = M.rhodium.clone(); plateEdge.color.set(spec.movement.finishes.bridges.bevels); plateEdge.roughness = 0.18;
  const brassMat = M.brass.clone(); brassMat.color.set(fin.wheels.gilt); brassMat.roughness = 0.28;
  const screw = M.steelPolished.clone(); screw.color.set(fin.screws.colour);
  const jewel = M.ruby.clone(); jewel.color.set(0xd04a78); jewel.attenuationColor.set(0xa0305c);
  const out = { gilt, giltEdge, giltPair: [gilt, giltEdge], steelWheel, steelEdge, steelPair: [steelWheel, steelEdge], pinion, pinPair: [pinion, steelEdge], barrel, barrelEdge, barrelPair: [barrel, barrelEdge], spring, satin, satPair: [satin, steelEdge], dark, darkPair: [dark, steelEdge], plate, plateEdge, platePair: [plate, plateEdge], brass: brassMat, brassPair: [brassMat, giltEdge], screw, polished: M.steelPolished, jewel };
  matCache.set(M, out);
  return out;
}

// ------------------------------------------------------------------ the builder
export function buildTrain(ctx) {
  if (ctx.lite) return; // movement parts are never built in the watch box
  const { spec, M, reg, root, gear, planarUV } = ctx;
  const Z = spec.z, L = spec.layout, TR = spec.train, KW = spec.keyless, MD = spec.modules, PI = spec.pipes;
  const mm = movementMaterials(M, spec);
  const EX = (id) => spec.explode[id] ?? [0, 0, 0];
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const fmt = (v, d = 1) => v.toFixed(d);
  const degOf = (v) => ((((v * 180) / Math.PI) % 360) + 360) % 360;
  const tipW = (z, m) => m * (z / 2 + 1.3), rootW = (z, m) => m * (z / 2 - 1.6);

  function assembly(pos, z = 0) {
    const object = new THREE.Group();
    object.position.set(pos[0], pos[1], z);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    return { object, rotor };
  }
  const add = (def) => reg.add({ explode: EX(def.id), explodeDelay: spec.explodeDelay(def.id), ...def });

  // ---------- mesh phases (SPEC.meshes): every wheel keeps local phase 0, its mate gets the offset
  const phCentrePinion = gear.meshPhase(ang(L.barrel, L.center), TR.barrel.teeth, TR.center.pinion, 0);
  const phThirdPinion = gear.meshPhase(ang(L.center, L.third), TR.center.teeth, TR.third.pinion, 0);
  const phFourthPinion = gear.meshPhase(ang(L.third, L.fourth), TR.third.teeth, TR.fourth.pinion, 0);
  // the ratchet keeps phase 0: the crown wheel and B's reduction pinion mesh it
  const phCrownWheel = gear.meshPhase(ang(L.barrel, L.crownWheel), KW.ratchet.teeth, KW.crownWheel.teeth, 0);
  const phIntermediate = gear.meshPhase(ang(L.crownWheel, L.windingIntermediate), KW.crownWheel.teeth, KW.windingIntermediate.teeth, phCrownWheel);
  // The crown wheel is always in mesh with the ratchet, so it turns whenever the ratchet does
  // (rotor or crown winding); kinematics' rot.crownWheel only counts hand winding, so the
  // keyless wheels are driven from rot.ratchet × the tooth ratios (identical while hand-winding).
  const crownPerRatchet = -KW.ratchet.teeth / KW.crownWheel.teeth;
  const interPerRatchet = crownPerRatchet * spec.autoTrain.ratios.windingIntermediatePerCrownWheel;

  // ===================================================================== BARREL
  const mB = MD.barrel;
  const BZ = {
    drum: Z.barrel, teeth: Z.barrelTeeth, lid: Z.barrelLid,
    wallOut: rootW(TR.barrel.teeth, mB) - 0.06, // 6.50: under the teeth root
    wallIn: 6.26, floor: [Z.barrel[1] - 0.11, Z.barrel[1]], arborCore: 1.2,
  };
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const [t0, t1] = BZ.teeth;
    // toothed band at the back end (its bore is the drum's inner wall: the lid snaps into it)
    const ring = gear.extrudeOutline(gear.toothedOutline({ teeth: TR.barrel.teeth, module: mB }), [gear.circlePath(BZ.wallIn, 192)], t1 - t0);
    b.add(ring, mm.barrelPair, mtx(0, 0, (t0 + t1) / 2), 35 * DEG);
    const d1 = BZ.drum[1], zf = BZ.floor[0], wi = BZ.wallIn, wo = BZ.wallOut;
    b.add(latheZ([
      [wi, t1 - 0.01], [wo, t1 - 0.01], [wo, d1 - 0.035], [wo - 0.035, d1], [1.0, d1], [0.96, d1 - 0.03], [0.96, zf], [wi - 0.03, zf], [wi, zf - 0.03], [wi, t1 - 0.01],
    ], 160, wo), mm.barrel);
    // thin polished chamfer ring on the drum's dial-side edge
    b.build(rotor);
    add({
      id: 'barrel', name: 'Mainspring barrel', category: 'power', side: 'back', exposed: false, priority: 1,
      object, rotor, drive: { key: 'barrel' }, anchor: [4.6, 2.4, t0],
      description: 'The power store: a steel drum sunk deep into the main plate, with its 105 teeth round the back rim. The uncoiling mainspring turns it once every 7½ hours, and its teeth drive the 14-leaf centre pinion and so the whole going train.',
      facts: { Teeth: String(TR.barrel.teeth), 'Tip Ø': `${fmt(2 * tipW(TR.barrel.teeth, mB), 2)} mm`, Module: `${fmt(mB, 3)} mm`, Speed: '1 turn / 7 h 30 min', Reserve: `${spec.powerReserveHours} h ≈ ${fmt(spec.barrelTurns, 2)} turns`, Drives: 'centre pinion, 7.5 : 1' },
      live: (s) => `${fmt(degOf(s.rot.barrel), 2)}° · 1 turn / 7.5 h · ${fmt(s.reserve * spec.powerReserveHours, 1)} h left`,
    });
  }
  // ---------- barrel cover (lid at the back end, inside the toothed band)
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const [z0, z1] = BZ.lid, R = BZ.wallIn - 0.02, g0 = 3.95;
    b.add(latheZ([[0.95, z0 + 0.025], [0.99, z0], [g0 - 0.06, z0], [g0, z0 + 0.03], [g0 + 0.06, z0], [R - 0.05, z0], [R, z0 + 0.04], [R, z1], [0.95, z1], [0.95, z0 + 0.025]], 160, R), mm.barrel);
    b.build(rotor);
    add({
      id: 'barrel-cover', name: 'Barrel cover', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'barrel' }, anchor: [-2.6, 2.2, z0],
      description: 'The lid snapped into the back of the barrel drum, inside the toothed band; it closes the mainspring in and turns with the drum. The barrel arbor passes through its centre.',
      facts: { 'Ø': `${fmt(2 * R, 1)} mm`, Turns: 'with the barrel drum' },
    });
  }
  // ---------- barrel arbor (core for the spring's eye; square for the ratchet)
  const RZ = Z.ratchetWheel;
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const c0 = BZ.lid[1] + 0.03, c1 = BZ.floor[0] - 0.04, ac = BZ.arborCore;
    b.add(latheZ([
      [0, RZ[1] - 0.01], [0.62, RZ[1] - 0.01], [0.62, c0 - 0.05], [ac - 0.05, c0], [ac, c0 + 0.05], [ac, c1 - 0.05], [ac - 0.05, c1],
      [0.42, c1 + 0.01], [0.42, BZ.drum[1] + 0.02], [0.32, BZ.drum[1] + 0.06], [0.32, Z.barrelPocketFloor + 0.22], [0.27, Z.barrelPocketFloor + 0.25], [0, Z.barrelPocketFloor + 0.25],
    ], 48), mm.polished);
    // square in the ratchet (side 0.94) and the hook for the spring's eye
    b.add(new THREE.BoxGeometry(0.94, 0.94, RZ[1] - RZ[0] - 0.01), mm.pinion, mtx(0, 0, (RZ[0] + RZ[1]) / 2 - 0.005));
    b.add(new THREE.BoxGeometry(0.24, 0.16, 0.5), mm.pinion, mtx(ac + 0.07, 0, (c0 + c1) / 2));
    b.build(rotor);
    add({
      id: 'barrel-arbor', name: 'Barrel arbor', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'ratchet' }, anchor: [ac, 0, (c0 + c1) / 2],
      description: 'The steel axle at the centre of the barrel. The mainspring\'s inner eye hooks onto its core; its square top carries the ratchet wheel, so winding (by rotor or crown) turns the arbor and tightens the spring.',
      facts: { 'Core Ø': `${fmt(2 * ac, 1)} mm`, Top: 'square for the ratchet wheel', Turns: 'only while winding' },
    });
  }
  // ---------- mainspring (coils follow state.reserve)
  {
    const { object, rotor } = assembly(L.barrel);
    const ms = makeMainspring();
    const mesh = new THREE.Mesh(ms.geometry, mm.spring);
    mesh.castShadow = true; mesh.receiveShadow = true;
    rotor.add(mesh);
    let last = -1, lastT = -1e9;
    ms.rebuild(0.92);
    add({
      id: 'mainspring', name: 'Mainspring', category: 'power', side: 'back', exposed: false, priority: 2,
      object, rotor, drive: { key: 'barrel' }, anchor: [0, 3.9, (BZ.lid[1] + BZ.floor[0]) / 2],
      description: 'A long strip of alloy spring steel coiled in the barrel. Winding wraps it round the arbor (about 24 coils); over 70 hours it lets down outwards against the drum wall (about 14 coils), turning the barrel 9⅓ times.',
      facts: { Coils: '≈14 (let down) – 24 (wound)', Height: `${fmt(BZ.floor[0] - BZ.lid[1] - 0.06, 2)} mm`, 'Usable turns': fmt(spec.barrelTurns, 2), Reserve: `${spec.powerReserveHours} h` },
      live: (s) => `${fmt(s.reserve * 100, 0)} % wound · ≈${fmt(14 + 10 * s.reserve, 1)} coils`,
      update: (s) => {
        const now = performance.now();
        if (Math.abs(s.reserve - last) > 0.003 && now - lastT > 60) { ms.rebuild(s.reserve); last = s.reserve; lastT = now; }
      },
    });
  }
  function makeMainspring() {
    const SEG = 48, NIN = 23, NOUT = 13, MAXT = NIN + 1 + NOUT, MAXP = Math.ceil(SEG * MAXT) + 2;
    const t = 0.1, pitch = 0.12, r0 = BZ.arborCore + t / 2 + 0.02, R1 = BZ.wallIn - t / 2 - 0.03;
    const zb = BZ.lid[1] + 0.03, zt = BZ.floor[0] - 0.03;
    const NV = MAXP * 8 + 8;
    const pos = new Float32Array(NV * 3), nor = new Float32Array(NV * 3);
    const cx = new Float32Array(MAXP), cy = new Float32Array(MAXP);
    const geometry = new THREE.BufferGeometry();
    const posA = new THREE.BufferAttribute(pos, 3), norA = new THREE.BufferAttribute(nor, 3);
    posA.setUsage(THREE.DynamicDrawUsage); norA.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posA);
    geometry.setAttribute('normal', norA);
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(NV * 2), 2));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, (zb + zt) / 2), R1 + 1);
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-R1, -R1, zb), new THREE.Vector3(R1, R1, zt));
    const V0 = MAXP * 8;
    const setV = (i, x, y, z, nx, ny, nz) => { pos[3 * i] = x; pos[3 * i + 1] = y; pos[3 * i + 2] = z; nor[3 * i] = nx; nor[3 * i + 1] = ny; nor[3 * i + 2] = nz; };
    let n = 0;
    function centreline(rho) {
      const Nin = NIN * rho, Nout = NOUT * (1 - rho), NT = Nin + 1 + Nout;
      const ra = r0 + pitch * Nin, rb = R1 - pitch * Nout;
      n = Math.min(MAXP, Math.floor(NT * SEG) + 1);
      for (let i = 0; i < n; i++) {
        const tau = i === n - 1 ? NT : i / SEG;
        let r;
        if (tau <= Nin) r = r0 + pitch * tau;
        else if (tau <= Nin + 1) { const s = tau - Nin; r = ra + (rb - ra) * s * s * (3 - 2 * s); } else r = rb + pitch * (tau - Nin - 1);
        const th = 0.6 - TAU * tau; // coils run clockwise outwards (dial view): winding the arbor CCW wraps them in
        cx[i] = r * Math.cos(th); cy[i] = r * Math.sin(th);
      }
    }
    function write() {
      for (let i = 0; i < n; i++) {
        const a = i > 0 ? i - 1 : i, b = i < n - 1 ? i + 1 : i;
        let tx = cx[b] - cx[a], ty = cy[b] - cy[a];
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
          const c = i === 0 ? V0 : V0 + 4, sg = i === 0 ? -1 : 1;
          setV(c, ix, iy, zb, sg * tx, sg * ty, 0); setV(c + 1, ox, oy, zb, sg * tx, sg * ty, 0);
          setV(c + 2, ox, oy, zt, sg * tx, sg * ty, 0); setV(c + 3, ix, iy, zt, sg * tx, sg * ty, 0);
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
  // wheel (0.12 thick, gilt), riveting collet, pinion, arbor profile (lathe)
  function trainWheel({ id, pos, teeth, m, zW, spokes, rimW, hubR, spokeW, spokePhase, bore = 0, pinion, arbor, collets = [], drive, anchor, def, extra }) {
    const { object, rotor } = assembly(pos);
    const b = new Batch();
    const th = zW[1] - zW[0];
    b.add(wheelGeo(gear, { teeth, module: m, thickness: th, spokes, rimW, hubR, spokeW, fillet: 0.1, phase: spokePhase, bore }), mm.giltPair, mtx(0, 0, (zW[0] + zW[1]) / 2), 38 * DEG);
    for (const c of collets) b.add(latheZ(c, 48), mm.polished);
    const pl = pinion.z[1] - pinion.z[0];
    b.add(pinionGeo(gear, { leaves: pinion.leaves, module: pinion.m, length: pl, bore: pinion.bore }), mm.pinPair, mtx(0, 0, (pinion.z[0] + pinion.z[1]) / 2, pinion.phase), 35 * DEG);
    b.add(latheZ(arbor, 24), mm.polished);
    if (extra) extra(b);
    b.build(rotor);
    return add({ id, object, rotor, drive: { key: drive }, anchor, ...def });
  }

  // ---- centre wheel: lowest central wheel, under its steel strap bridge; HOLLOW arbor
  {
    const zW = Z.centerWheel, pz = Z.pinionOf.center;
    const tIn = PI.secondsArbor + 0.015, tOut = PI.cannon[0] - 0.01; // 0.135 / 0.20: between the fourth arbor and the cannon pinion
    const top = Z.centerWheelBridge[0] + 0.05; // top pivot in the bridge's jewel
    const tubeTop = 0.7; // inside the cannon pinion (friction fit)
    trainWheel({
      id: 'center-wheel', pos: L.center, teeth: TR.center.teeth, m: MD.center, zW,
      spokes: 6, rimW: 0.27, hubR: 0.78, spokeW: 0.22, spokePhase: 0.26, bore: tOut,
      pinion: { leaves: TR.center.pinion, m: MD.barrel, z: pz, phase: phCentrePinion, bore: tIn },
      collets: [
        [[tOut, zW[0] - 0.05], [0.5, zW[0] - 0.05], [0.55, zW[0] - 0.01], [0.55, zW[0] + 0.005], [tOut, zW[0] + 0.005]], // back collet (≤ bridge − 0.03)
        [[tOut, zW[1] - 0.005], [0.62, zW[1] - 0.005], [0.62, pz[0] + 0.01], [tOut, pz[0] + 0.01]], // staff between wheel and pinion
      ],
      // hollow tube: from the bridge jewel through the plate into the cannon pinion
      arbor: [[tIn, top], [tOut - 0.02, top], [tOut, top + 0.02], [tOut, tubeTop - 0.02], [tOut - 0.02, tubeTop], [tIn, tubeTop], [tIn, top]],
      drive: 'center', anchor: [-3.2, -1.4, zW[0]],
      def: {
        name: 'Centre wheel', category: 'train', side: 'back', exposed: false, priority: 1,
        description: 'The second wheel of the going train. Its 14-leaf pinion is driven by the barrel and it turns exactly once an hour, held by its own steel strap bridge. Its arbor is a hollow tube: the cannon pinion (minute hand) rides on it, and the seconds wheel\'s arbor runs through it.',
        facts: { Teeth: String(TR.center.teeth), Pinion: `${TR.center.pinion} leaves`, Module: `${fmt(MD.center, 3)} mm`, 'Tip Ø': `${fmt(2 * tipW(TR.center.teeth, MD.center), 2)} mm`, Speed: '1 turn / hour', Crossings: '6', Arbor: 'hollow (direct centre seconds)' },
        live: (s) => `${fmt(degOf(s.rot.center), 2)}° · 1 turn / 60 min`,
      },
    });
  }
  // ---- third wheel: above the fourth wheel, its pinion down at the centre wheel's level
  {
    const zW = Z.thirdWheel, pz = Z.pinionOf.third;
    const topPiv = Z.trainBridge[1] - 0.25, lowPiv = Z.mainPlate[0] + 0.12;
    trainWheel({
      id: 'third-wheel', pos: L.third, teeth: TR.third.teeth, m: MD.third, zW,
      spokes: 5, rimW: 0.25, hubR: 0.55, spokeW: 0.21, spokePhase: 0.4,
      pinion: { leaves: TR.third.pinion, m: MD.center, z: pz, phase: phThirdPinion },
      collets: [[[0.1, zW[1] - 0.005], [0.36, zW[1] - 0.005], [0.36, zW[1] + 0.035], [0.32, zW[1] + 0.05], [0.1, zW[1] + 0.05]]],
      arbor: [[0, topPiv], [0.065, topPiv], [0.075, topPiv + 0.03], [0.075, zW[0] - 0.02], [0.16, zW[0]], [0.16, pz[0]], [0.12, pz[1]], [0.075, pz[1] + 0.03], [0.075, lowPiv - 0.03], [0.065, lowPiv], [0, lowPiv]],
      drive: 'third', anchor: [2.9, -1.4, zW[0]],
      def: {
        name: 'Third wheel', category: 'train', side: 'back', exposed: true, priority: 2,
        description: 'The intermediate wheel: its 9-leaf pinion is driven by the centre wheel, it turns once every 6 minutes and drives the central fourth wheel. Its gilt rim shows through the kidney window of the train bridge.',
        facts: { Teeth: String(TR.third.teeth), Pinion: `${TR.third.pinion} leaves`, Module: `${fmt(MD.third, 3)} mm`, Speed: '1 turn / 6 min', Ratio: '10 : 1 from the centre wheel', Crossings: '5' },
        live: (s) => `${fmt(degOf(s.rot.third), 1)}° · 1 turn / 6 min`,
      },
    });
  }
  // ---- fourth (centre-seconds) wheel: above the centre-wheel bridge, long arbor to the seconds hand
  {
    const zW = Z.fourthWheel, pz = Z.pinionOf.fourth, a = PI.secondsArbor;
    const topPiv = Z.trainBridge[1] - 0.28;
    trainWheel({
      id: 'fourth-wheel', pos: L.fourth, teeth: TR.fourth.teeth, m: MD.fourth, zW,
      spokes: 4, rimW: 0.23, hubR: 0.5, spokeW: 0.2, spokePhase: 0.2,
      pinion: { leaves: TR.fourth.pinion, m: MD.third, z: pz, phase: phFourthPinion },
      collets: [
        [[0.1, pz[1] - 0.005], [0.42, pz[1] - 0.005], [0.42, zW[0] + 0.005], [0.1, zW[0] + 0.005]], // collet joining pinion and wheel
        [[0.1, zW[1] - 0.005], [0.3, zW[1] - 0.005], [0.3, zW[1] + 0.03], [0.26, zW[1] + 0.045], [0.1, zW[1] + 0.045]],
      ],
      // top pivot in the train bridge (rotor post) → pinion → wheel → long thin arbor through the
      // hollow centre arbor, the cannon pinion and the 24-hour pipe to the seconds hand
      arbor: [[0, topPiv], [0.06, topPiv], [0.07, topPiv + 0.03], [0.07, pz[0] - 0.02], [0.14, pz[0]], [0.14, zW[1] + 0.04], [a, zW[1] + 0.08],
        [a, Z.secondsArborTop - 0.03], [a - 0.03, Z.secondsArborTop], [0, Z.secondsArborTop]],
      drive: 'fourth', anchor: [3.0, 1.6, zW[0]],
      def: {
        name: 'Fourth wheel (centre seconds)', category: 'train', side: 'back', exposed: true, priority: 1,
        description: 'The seconds wheel, turning once a minute in the centre of the movement. Its long, thin arbor runs down through the hollow centre wheel and the hand pipes and carries the central seconds hand directly; its 120 teeth drive the 10-leaf escape pinion.',
        facts: { Teeth: String(TR.fourth.teeth), Pinion: `${TR.fourth.pinion} leaves`, Module: `${fmt(MD.fourth, 3)} mm`, Speed: '1 turn / minute', Arbor: `Ø${fmt(2 * a, 2)} mm, ${fmt(Z.secondsArborTop - zW[1], 1)} mm long`, Drives: 'escape pinion, 12 : 1', Carries: 'central seconds hand' },
        live: (s) => `${fmt(degOf(s.rot.fourth), 1)}° · 1 rpm (8 steps / s)`,
      },
    });
  }

  // ===================================================================== KEYLESS ON THE BARREL BRIDGE
  const mK = MD.keyless;
  // ---------- ratchet wheel (gilt, square hole) + its polished screw
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const R = tipW(KW.ratchet.teeth, mK), th = RZ[1] - RZ[0];
    const sq = new THREE.Path([V2(-0.47, -0.47), V2(0.47, -0.47), V2(0.47, 0.47), V2(-0.47, 0.47)].reverse());
    b.add(gear.extrudeOutline(gear.toothedOutline({ teeth: KW.ratchet.teeth, module: mK }), [sq], th, { uvRadius: R }), mm.giltPair, mtx(0, 0, (RZ[0] + RZ[1]) / 2), 35 * DEG);
    // big slotted screw on the back face (into the arbor)
    b.add(screwGeo(1.0, 0.24, 0.2, 0.08), mm.screw, screwMtx(0, 0, RZ[0], 35, -1));
    b.build(rotor);
    add({
      id: 'ratchet-wheel', name: 'Ratchet wheel', category: 'power', side: 'back', exposed: false, priority: 1,
      object, rotor, drive: { key: 'ratchet' }, anchor: [-2.2, 1.8, RZ[0]],
      description: 'Screwed onto the square of the barrel arbor: turning it winds the mainspring. Both the self-winding train (through the gilt reduction pinion) and the crown (through the crown wheel) drive it, and the click stops it running back.',
      facts: { Teeth: String(KW.ratchet.teeth), 'Tip Ø': `${fmt(2 * R, 2)} mm`, Module: `${fmt(mK, 3)} mm`, Finish: 'gilt, polished screw', 'Per crown turn': `${fmt((360 * KW.windingPinion.teeth) / KW.ratchet.teeth, 1)}° (16 clicks)`, 'Full wind by hand': `≈${fmt((spec.barrelTurns * KW.ratchet.teeth) / KW.windingPinion.teeth, 0)} crown turns` },
      live: (s) => `${fmt(degOf(s.rot.ratchet), 1)}° · ${fmt(s.reserve * 100, 0)} % wound`,
    });
  }
  // ---------- crown wheel (steel) + left-hand screw
  {
    const { object, rotor } = assembly(L.crownWheel);
    const b = new Batch();
    const CZ = Z.crownWheel, th = CZ[1] - CZ[0], Rc = tipW(KW.crownWheel.teeth, mK);
    const g = gear.extrudeOutline(gear.toothedOutline({ teeth: KW.crownWheel.teeth, module: mK }), [gear.circlePath(0.62, 48)], th, { uvRadius: Rc });
    b.add(g, mm.steelPair, mtx(0, 0, (CZ[0] + CZ[1]) / 2, phCrownWheel), 35 * DEG);
    // raised core bush (b29) round the screw
    b.add(latheZ([[0.62, CZ[0] - 0.05], [0.95, CZ[0] - 0.05], [0.98, CZ[0] - 0.02], [0.98, CZ[0] + 0.01], [0.62, CZ[0] + 0.01]], 64), mm.polished);
    b.add(screwGeo(0.66, 0.16, 0.14, 0.06), mm.screw, screwMtx(0, 0, CZ[0] - 0.05, 120, -1));
    b.build(rotor);
    add({
      id: 'crown-wheel', name: 'Crown wheel', category: 'keyless', side: 'back', exposed: false, priority: 1,
      object, rotor, drive: { key: 'ratchet', sign: crownPerRatchet }, anchor: [1.6, 1.4, CZ[0]],
      description: 'The steel wheel that carries hand-winding to the ratchet. It is always in mesh with the ratchet, so it also turns when the rotor winds. It is held by a screw with a left-hand thread, so winding tightens rather than loosens it.',
      facts: { Teeth: String(KW.crownWheel.teeth), 'Tip Ø': `${fmt(2 * Rc, 2)} mm`, Module: `${fmt(mK, 3)} mm`, Meshes: `ratchet (${KW.ratchet.teeth}) and winding intermediate (${KW.windingIntermediate.teeth})`, Screw: 'left-hand thread' },
      live: (s) => `${fmt(degOf(s.rot.ratchet * crownPerRatchet), 1)}°`,
    });
  }
  // ---------- winding intermediate (steel, 18) — its arbor runs down to the plate (contrate drive, schematic)
  {
    const { object, rotor } = assembly(L.windingIntermediate);
    const b = new Batch();
    const WZ = Z.windingIntermediate, th = WZ[1] - WZ[0], Ri = tipW(KW.windingIntermediate.teeth, mK);
    b.add(wheelGeo(gear, { teeth: KW.windingIntermediate.teeth, module: mK, thickness: th, bore: 0.2 }), mm.steelPair, mtx(0, 0, (WZ[0] + WZ[1]) / 2, phIntermediate), 35 * DEG);
    // arbor: pivot cap on the back, shank down through the barrel bridge to the plate
    b.add(latheZ([[0, WZ[0] - 0.08], [0.32, WZ[0] - 0.08], [0.35, WZ[0] - 0.05], [0.35, WZ[0] + 0.01], [0.2, WZ[0] + 0.01], [0.2, Z.mainPlate[0] - 0.02], [0.14, Z.mainPlate[0] + 0.05], [0, Z.mainPlate[0] + 0.05]], 32), mm.polished);
    b.build(rotor);
    add({
      id: 'winding-intermediate', name: 'Winding intermediate wheel', category: 'keyless', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'ratchet', sign: interPerRatchet }, anchor: [0.9, 0.9, WZ[0]],
      description: 'A small steel wheel between the winding pinion on the stem and the crown wheel. It turns the stem\'s motion through a right angle onto the barrel bridge; it does not change the crown-to-ratchet ratio.',
      facts: { Teeth: String(KW.windingIntermediate.teeth), 'Tip Ø': `${fmt(2 * Ri, 2)} mm`, Meshes: `crown wheel (${KW.crownWheel.teeth})`, Driven: 'by the winding pinion (16)' },
    });
  }

  // ---------- click (pawl) and click spring — contact-exact on the ratchet
  {
    const C = L.barrel, P = L.click, KZ = Z.click, T = KZ[1] - KZ[0];
    const pitch = TAU / KW.ratchet.teeth;
    const rTip = tipW(KW.ratchet.teeth, mK), rRoot = rootW(KW.ratchet.teeth, mK);
    // beak in the gap 13½ pitches from the ratchet's local 0 (≈88°, at the top of the wheel):
    // a gap whenever windAngle is a whole number of teeth; the line beak → pivot is the CW
    // tangent there, so a tooth pushing back (unwinding) loads the click in compression.
    const thG = 13.5 * pitch;
    const pol = (r, a) => [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)];
    const d = 1.4 * DEG; // beak half-width (angle) at its tip
    const rBk = rRoot + 0.07, rArm0 = rTip + 0.075, rArm1 = rTip + 0.78;
    // beak: radial locking face (CCW side), sloping sliding face over the next tooth (CW side)
    // (the sliding face follows the next tooth's ogival flank ≈0.3° outside it: 3.30/3.40/3.47 mm)
    const beak = [pol(rBk, thG - d), pol(rBk, thG + d), pol(rArm0 + 0.02, thG + d), pol(rArm0 + 0.02, thG + 1.2 * d),
      pol(rArm1, thG + 3.4 * DEG), pol(rArm1, thG - 8 * DEG), pol(rArm0 + 0.01, thG - 6.5 * DEG), pol(rTip + 0.04, thG - 3.2 * DEG),
      pol(rTip - 0.02, thG - 2.15 * DEG), pol(rTip - 0.09, thG - 1.6 * DEG), pol(rTip - 0.19, thG - 1.45 * DEG)];
    const aP = Math.atan2(P[1] - C[1], P[0] - C[0]);
    const clickSdf = sUnion(0.1,
      sdCircle(P[0], P[1], 0.42),
      sdArcBand(C[0], C[1], rArm0, rArm1, aP + 0.04, thG + 2.6 * DEG),
      sdPolygon(beak),
      sdCapsule(P, [P[0] + 0.55, P[1] + 0.62], 0.3, 0.24), // tail for the spring
    );
    const holeSdf = (x, y) => Math.max(clickSdf(x, y), -(Math.hypot(x - P[0], y - P[1]) - 0.16));
    const { object, rotor } = assembly(P);
    const b = new Batch();
    b.add(sdfExtrude(holeSdf, [C[0] - 1.0, C[1] + 2.3, P[0] + 1.2, P[1] + 1.6], P, KZ[0] + 0.005, T - 0.01, { bevel: 0.03, planarUV, uvAngle: aP + Math.PI / 2 }), mm.satPair, null, BEVEL_CREASE);
    b.build(rotor);
    const sb = new Batch();
    // shouldered pivot screw (fixed)
    sb.add(latheZ([[0, KZ[0]], [0.15, KZ[0]], [0.15, KZ[1] + 0.06], [0, KZ[1] + 0.06]], 24), mm.polished);
    sb.add(screwGeo(0.36, 0.13, 0.09, 0.05), mm.screw, screwMtx(0, 0, KZ[0] - 0.005, 64, -1));
    sb.build(object);
    // ---- contact table: click angle against the ratchet phase
    const outl = gear.toothedOutline({ teeth: KW.ratchet.teeth, module: mK });
    const prof = polarProfile(outl, pitch);
    const nose = densify(beak, 0.006).filter((q) => Math.hypot(q[0] - C[0], q[1] - C[1]) < rTip + 0.1);
    const clickAt = contactLUT({
      N: 64, pitch, pivot: P, nose, sign: -1, maxA: 0.25,
      inside: (x, y, w) => { const dx = x - C[0], dy = y - C[1]; return Math.hypot(dx, dy) < prof(Math.atan2(dy, dx) - w) + 0.006; },
    });
    const arm = Math.hypot(C[0] + rBk * Math.cos(thG) - P[0], C[1] + rBk * Math.sin(thG) - P[1]);
    let clickAngle = 0;
    add({
      id: 'click', name: 'Click', category: 'keyless', side: 'back', exposed: false, priority: 2,
      object, rotor, anchor: [(C[0] + rArm1 * Math.cos(thG - 0.2)) - P[0], (C[1] + rArm1 * Math.sin(thG - 0.2)) - P[1], KZ[0]],
      description: 'The pawl whose beak rests between the ratchet teeth. While the watch winds it rides up each tooth and drops back; a tooth pushing the other way only presses it against its pivot, so the mainspring can never unwind backwards.',
      facts: { Engages: `ratchet wheel (${KW.ratchet.teeth} teeth)`, 'Clicks per crown turn': String(KW.windingPinion.teeth), Finish: 'satin steel, polished bevels' },
      live: () => (clickAngle < -1e-4 ? `riding a tooth · lifted ${fmt(-clickAngle * arm, 3)} mm` : 'locked in a tooth gap'),
      update: (s) => {
        const tp = (s.windAngle / TAU) * KW.ratchet.teeth;
        clickAngle = clickAt(tp - Math.floor(tp));
        rotor.rotation.z = clickAngle;
      },
    });
    // ---- click spring: a curved steel blade from a screwed foot, its nose on the click's tail
    const tail = [P[0] + 0.55, P[1] + 0.62];
    const nB = (() => { const v = [0.62, -0.55], l = Math.hypot(...v); return [v[0] / l, v[1] / l]; })(); // contact normal (out of the tail's side)
    const nose2 = [tail[0] + 0.355 * nB[0], tail[1] + 0.355 * nB[1]];
    // the blade runs square to the push direction, so the click's lift bends it (foot inside r 14)
    const foot = [nose2[0] + 1.7 * -nB[1], nose2[1] + 1.7 * nB[0]];
    const ctl = [(foot[0] + nose2[0]) / 2 + 0.22 * nB[0], (foot[1] + nose2[1]) / 2 + 0.22 * nB[1]];
    const springSdf = sUnion(0.12, sdBlade(foot, ctl, nose2, 0.15, 0.09), sdCircle(nose2[0], nose2[1], 0.11), sdCircle(foot[0], foot[1], 0.36));
    const springHole = (x, y) => Math.max(springSdf(x, y), -(Math.hypot(x - foot[0], y - foot[1]) - 0.14));
    const sp = assembly(foot);
    const spb = new Batch();
    spb.add(sdfExtrude(springHole, [P[0] + 0.3, P[1] - 0.2, P[0] + 3.0, P[1] + 2.4], foot, KZ[0] + 0.02, T - 0.03, { bevel: 0.025, planarUV, uvAngle: 2.2 }), mm.satPair, null, BEVEL_CREASE);
    spb.build(sp.rotor);
    const fsb = new Batch();
    fsb.add(screwGeo(0.36, 0.12, 0.09, 0.05), mm.screw, screwMtx(0, 0, KZ[0] + 0.015, 20, -1));
    fsb.build(sp.object);
    // the blade's bend follows the click: rigid rotation about the foot with the arm ratio
    const vT = [-(nose2[1] - P[1]), nose2[0] - P[0]], vS = [-(nose2[1] - foot[1]), nose2[0] - foot[0]];
    const springRatio = (vT[0] * nB[0] + vT[1] * nB[1]) / ((vS[0] * nB[0] + vS[1] * nB[1]) || 1);
    add({
      id: 'click-spring', name: 'Click spring', category: 'keyless', side: 'back', exposed: false, priority: 3,
      object: sp.object, rotor: sp.rotor, anchor: [(nose2[0] + foot[0]) / 2 - foot[0], (nose2[1] + foot[1]) / 2 + 0.5 - foot[1], KZ[0]],
      description: 'A curved steel blade screwed to the barrel bridge; its nose presses the click\'s tail so the beak always drops back between the ratchet teeth.',
      facts: { Material: 'hardened spring steel', Presses: 'the click into the ratchet' },
      update: () => { sp.rotor.rotation.z = clickAngle * springRatio; },
    });
  }
}
