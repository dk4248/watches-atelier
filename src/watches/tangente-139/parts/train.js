// GOING TRAIN, BARREL, MOTION WORKS and KEYLESS WORKS of the NOMOS DUW 4001.
//
// Everything is positioned from SPEC (layout, tooth counts, modules, z-levels). Meshing
// pairs interleave through gear.meshPhase; directions and speeds come from the
// kinematics (state.rot). Parts measured on the back render are written in back-view
// coordinates and mirrored with BV() into the dial-side frame used by the model.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const V2 = (x, y) => new THREE.Vector2(x, y);
const BV = (x, y) => [-x, y]; // back-view measurement → dial-side frame
// Bevelled extrusions: the first bevel facet is only 22.5° off the face, so creasing must
// stay below that or the flat faces get shaded like tubes.
const BEVEL_CREASE = 15 * DEG;

// ------------------------------------------------------------------ geometry utils

function nonIndexed(g) { return g.index ? g.toNonIndexed() : g.clone(); }

function stdAttrs(g) {
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

// Smooth normals across faces that meet at less than `angle`, keep hard edges elsewhere.
// (toCreasedNormals hashes positions at 0.01 units — far too coarse for 0.05 mm teeth,
// so the geometry is scaled up while it runs.)
function crease(g, angle = 40 * DEG) {
  g.scale(100, 100, 100);
  const r = toCreasedNormals(g, angle);
  r.scale(0.01, 0.01, 0.01);
  return r;
}

// Collects geometries per material and merges them into one mesh per material.
class Batch {
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
  build(parent) {
    const meshes = [];
    for (const [mat, geos] of this.map) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.map.clear();
    return meshes;
  }
}

const mtx = (x = 0, y = 0, z = 0, rz = 0) => new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z);
// Extruded geometry lies in (u, v) and runs along w. AX maps it onto the X axis:
// (u, v, w) → (y, z, x); ANX onto −X: (u, v, w) → (y, −z, −x). Both are proper rotations.
const AX = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
const ANX = new THREE.Matrix4().set(0, 0, -1, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1);
const onX = (x, phase = 0, base = AX) => new THREE.Matrix4().makeTranslation(x, 0, 0).multiply(new THREE.Matrix4().makeRotationX(phase)).multiply(base);

function discUV(g, R) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getX(i) / (2 * R) + 0.5; uv[2 * i + 1] = p.getY(i) / (2 * R) + 0.5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Surface of revolution about Z. `profile` = [[r, z], …] traversed with the solid on the
// left (i.e. outer walls upwards, +z faces inwards, −z faces outwards). Split at sharp
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
function latheZ(profile, segs = 48, uvR = 0) {
  const g = mergeGeometries(lathePieces(profile, segs).map((p) => p.rotateX(Math.PI / 2)), false);
  return discUV(g, uvR || Math.max(...profile.map((p) => p[0])) || 1);
}
// Same about +X: profile = [[r, x], …] ascending x along the outer surface.
function latheX(profile, segs = 32) {
  return mergeGeometries(lathePieces(profile, segs).map((p) => p.rotateZ(-Math.PI / 2)), false);
}

// ---------------------------------------------------------------- 2-D signed distances
// Organic lever / spring outlines: union of capsules, circles and polygons with smooth
// blends (real levers have generous inner radii), contoured by marching squares.
const sdCircle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
function sdCapsule(a, b, ra, rb = ra) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
  return (x, y) => {
    let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) - (ra + (rb - ra) * t);
  };
}
function sdPolygon(pts) {
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
const sUnion = (k, ...fs) => (x, y) => { let d = fs[0](x, y); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y), k); return d; };
// A quadratic Bézier "spring blade" with tapering half-width.
function sdBlade(p0, c, p2, w0, w1, n = 24) {
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
function contours(sdf, x0, y0, x1, y1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1;
  const f = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = sdf(x0 + i * h, y0 + j * h);
  const H = nx * ny;
  const ptOf = new Map();
  const adj = new Map();
  const point = (id) => {
    if (ptOf.has(id)) return;
    let p;
    if (id < H) { // horizontal edge (i,j)-(i+1,j)
      const i = id % nx, j = (id - i) / nx, a = f[id], b = f[id + 1];
      const t = a / (a - b);
      p = V2(x0 + (i + t) * h, y0 + j * h);
    } else { // vertical edge (i,j)-(i,j+1)
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

// SDF outline → bevelled extrusion between z0 and z0 + T (local to `origin`).
// Material groups: 0 = faces, 1 = sides incl. the polished bevel.
function sdfExtrude(sdf, box, origin, z0, T, { h = 0.012, bevel = 0.03, uvAngle = 0, uvScale = 0.25, planarUV } = {}) {
  const loops = contours(sdf, box[0], box[1], box[2], box[3], h).map((l) => simplifyLoop(l, 0.0012));
  loops.sort((a, b) => Math.abs(loopArea(b)) - Math.abs(loopArea(a)));
  const toLocal = (l) => l.map((p) => V2(p.x - origin[0], p.y - origin[1]));
  const shape = new THREE.Shape(toLocal(loops[0]));
  for (let i = 1; i < loops.length; i++) shape.holes.push(new THREE.Path(toLocal(loops[i])));
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
  const arc = (rad, ang) => V2(rad * Math.cos(ang), rad * Math.sin(ang));
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

function makeWheelGeo(gear, { teeth, module: m, thickness, spokes = 0, rimW = 0.25, hubR = 0.5, spokeW = 0.2, fillet = 0.1, phase = 0, bore = 0 }) {
  const outline = gear.toothedOutline({ teeth, module: m });
  const rr = (m * teeth) / 2 - 1.6 * m;
  const holes = [];
  for (let j = 0; j < spokes; j++) {
    const a0 = phase + (j * TAU) / spokes;
    holes.push(new THREE.Path(windowPts(a0, a0 + TAU / spokes, rr - rimW, hubR, spokeW * 0.5, spokeW * 0.62, fillet)));
  }
  if (bore) holes.push(gear.circlePath(bore, 32));
  return gear.extrudeOutline(outline, holes, thickness);
}

// Face (axial) teeth on an annulus, rising along +w from 0 to H.
// mode 'saw' = Breguet ratchet teeth, 'tri' = symmetric contrate teeth.
function faceTeethGeo({ teeth, rIn, rOut, H, mode = 'saw', steps = 4 }) {
  const pos = [];
  const pitch = TAU / teeth;
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const P = (r, a, w) => [r * Math.cos(a), r * Math.sin(a), w];
  const prof = (s) => (mode === 'saw' ? s : s < 0.5 ? 2 * s : 2 - 2 * s);
  for (let i = 0; i < teeth; i++) {
    for (let k = 0; k < steps; k++) {
      const s0 = k / steps, s1 = (k + 1) / steps;
      const a0 = (i + s0) * pitch, a1 = (i + s1) * pitch;
      const w0 = H * prof(s0), w1 = H * prof(s1 === 1 && mode === 'saw' ? 1 : s1);
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

// Slotted screw, head base at z = 0, top at +h (rotate for back-facing screws).
const screwCache = new Map();
function screwGeo(r, h, slotW, slotD) {
  const key = `${r}|${h}|${slotW}|${slotD}`;
  if (screwCache.has(key)) return screwCache.get(key);
  const base = latheZ([[0, 0], [r, 0], [r, h - slotD], [0, h - slotD]], 40, r);
  const a0 = Math.asin(slotW / 2 / r);
  const pts = [];
  for (let k = 0; k <= 24; k++) { const a = a0 + ((Math.PI - 2 * a0) * k) / 24; pts.push(V2(r * Math.cos(a), r * Math.sin(a))); }
  const bt = Math.min(0.02, slotD / 3);
  const half = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: slotD - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: 0.025, bevelOffset: -0.025, bevelSegments: 2, curveSegments: 4,
  });
  half.translate(0, 0, h - slotD + bt);
  const other = half.clone().rotateZ(Math.PI);
  const g = mergeGeometries([stdAttrs(base), stdAttrs(nonIndexed(half)), stdAttrs(nonIndexed(other))], false);
  discUV(g, r);
  screwCache.set(key, g);
  return g;
}
// Matrix placing a screw: facing +z (front) or −z (back), slot at `slotDeg` (dial frame).
function screwMtx(x, y, zBase, slotDeg, facing) {
  if (facing > 0) return mtx(x, y, zBase, slotDeg * DEG);
  return new THREE.Matrix4().makeTranslation(x, y, zBase).multiply(new THREE.Matrix4().makeRotationX(Math.PI)).multiply(new THREE.Matrix4().makeRotationZ(-slotDeg * DEG));
}

// Fine straight brushing for the click, its spring and the keyless levers: a tileable
// normal map whose height varies across the texture's v axis only, so the grain runs
// along u (planarUV's angle sets the direction on each part).
function brushedNormalMap() {
  const W = 64, H = 256;
  let seed = 917;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const raw = new Float32Array(H), h = new Float32Array(H), ph = new Float32Array(H);
  for (let y = 0; y < H; y++) { raw[y] = rnd() * 2 - 1; ph[y] = rnd() * TAU; }
  for (let y = 0; y < H; y++) h[y] = (raw[(y + H - 1) % H] + 2 * raw[y] + raw[(y + 1) % H]) / 4;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const d = (h[(y + 1) % H] - h[(y + H - 1) % H]) * 0.5;
    for (let x = 0; x < W; x++) {
      const k = d * (0.7 + 0.3 * Math.sin((x / W) * TAU + ph[y])) * 0.9;
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

// ------------------------------------------------------------------- the builder

export function buildTrain(ctx) {
  const { spec, M, reg, root, gear, planarUV } = ctx;
  const Z = spec.z, L = spec.layout, TR = spec.train, KW = spec.keyless, MD = spec.modules;
  const EX = (id, fallback) => spec.explode[id] ?? fallback ?? [0, 0, 0];
  const ED = (id, e) => (spec.explode[id] ? spec.explodeDelay(id) : Math.min(0.95, Math.max(0, 1 - Math.hypot(...e) / 55)));
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const fmt = (v, d = 1) => v.toFixed(d);
  const degOf = (v) => ((Math.abs(v) * 180) / Math.PI) % 360;

  // ---------- materials (shared ones are only cloned, never mutated)
  const gilt = M.wheelGilt;
  const giltEdge = M.wheelGilt.clone();
  giltEdge.normalMap = null; giltEdge.roughnessMap = null; giltEdge.anisotropyMap = null;
  giltEdge.anisotropy = 0; giltEdge.roughness = 0.15; giltEdge.color.set(0xeac987);
  const steel = M.steelPinion;
  const steelPol = M.steelPolished;
  const steelDS = M.steelPinion.clone(); steelDS.side = THREE.DoubleSide;
  const brass = M.brass;
  const brassEdge = M.brass.clone(); brassEdge.roughness = 0.18; brassEdge.color.set(0xd8b977);
  // Glashütte sunburst on the ratchet and crown wheel: the library finish renders
  // near-white face-on under the studio light (≈250); the official render shows these
  // wheels a mid steel grey (≈185 on the disc and annulus), so this module darkens it.
  const sun = M.sunburst.clone();
  sun.color.set(0xc3c5c9);
  sun.roughness = 0.34;
  const springSteel = M.steelDark.clone(); springSteel.color.set(0x9ca2aa); springSteel.roughness = 0.22;
  const giltPair = [gilt, giltEdge];
  const sunPair = [sun, steelPol];
  // brushed (not mirror) steel for the click, its spring and the keyless levers; a flat
  // satin surface without grain reads as dull grey next to the ribbed plate
  const brushed = M.steelSatin.clone();
  brushed.color.set(0xdadcdf); brushed.roughness = 0.36; brushed.anisotropy = 0.4;
  brushed.normalMap = brushedNormalMap(); brushed.normalScale.set(0.35, 0.35);
  const satPair = [brushed, steelPol];
  const pinPair = [steel, steelPol];
  const brassPair = [brass, brassEdge];

  // ---------- mesh phases (gear.meshPhase: wheels at local phase 0, mates get the offset)
  const phCentrePinion = gear.meshPhase(ang(L.barrel, L.center), TR.barrel.teeth, TR.center.pinion, 0);
  const phThirdPinion = gear.meshPhase(ang(L.center, L.third), TR.center.teeth, TR.third.pinion, 0);
  const phFourthPinion = gear.meshPhase(ang(L.third, L.fourth), TR.third.teeth, TR.fourth.pinion, 0);
  const phMinuteWheel = gear.meshPhase(ang(L.center, L.minuteWheel), TR.cannon.teeth, TR.minuteWheel.teeth, 0);
  const phHourWheel = gear.meshPhase(ang(L.minuteWheel, L.center), TR.minuteWheel.pinion, TR.hourWheel.teeth, 0);
  const phCrownWheel = gear.meshPhase(ang(L.barrel, L.crownWheel), KW.ratchet.teeth, KW.crownWheel.teeth, 0);
  // Winding pinion (axis X, under the crown wheel's +x edge) works like a pinion on a
  // rack: crown-wheel tooth y = r_cw·(φ_cw + ψ), pinion gap y = r_p·(θ + π/2) at θ = −π/2.
  // Equal pitch and stem angle α = ψ·z_cw/z_wp keep a gap under a tooth for all ψ.
  const zCW = KW.crownWheel.teeth, zWP = KW.windingPinion.teeth;
  const phWindingPinion = (zCW * phCrownWheel - Math.PI - (zWP * Math.PI) / 2) / zWP;
  const stemRatio = zCW / zWP; // stem angle = rot.crownWheel × 42/15 (sign from the mesh geometry)

  // Ratchet wheel levels (spec), 0.005 clear of its seat floor in the plate.
  const RZ = [Z.ratchetWheel[0], Z.ratchetWheel[1] - 0.005];

  function assembly(pos, z = 0) {
    const object = new THREE.Group();
    object.position.set(pos[0], pos[1], z);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    return { object, rotor };
  }
  function add(def) {
    const e = def.explode ?? EX(def.id);
    return reg.add({ ...def, explode: e, explodeDelay: def.explodeDelay ?? ED(def.id, e) });
  }

  // ===================================================================== BARREL
  const mB = MD.barrel;
  const barrelRp = (mB * TR.barrel.teeth) / 2;
  // Drum spec.z.barrel: open back end (lid) at −2.0, closed floor at the dial-side end
  // (−1.08, just above the centre wheel at L0); the toothed band spec.z.barrelTeeth sits
  // round the dial-side end, level with the centre pinion.
  const barrelZ = {
    drum: Z.barrel, lid: Z.barrelLid, ring: Z.barrelTeeth, wallIn: 4.85, wallOut: 5.1,
    floor: [Z.barrel[1] - 0.08, Z.barrel[1]],
  };
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    // toothed band (its bore lies inside the drum wall, so no coincident faces)
    const ring = gear.extrudeOutline(gear.toothedOutline({ teeth: TR.barrel.teeth, module: mB }), [gear.circlePath(barrelZ.wallIn + 0.1, 160)], barrelZ.ring[1] - barrelZ.ring[0]);
    b.add(ring, giltPair, mtx(0, 0, (barrelZ.ring[0] + barrelZ.ring[1]) / 2), 35 * DEG);
    const [d0, d1] = barrelZ.drum, zf = barrelZ.floor, wi = barrelZ.wallIn, wo = barrelZ.wallOut;
    // drum: rim at the back end → outer wall → floor (dial side) → arbor hole → inside
    b.add(latheZ([
      [wi, d0], [wo - 0.04, d0], [wo, d0 + 0.04], [wo, d1 - 0.03], [wo - 0.03, d1],
      [0.8, d1], [0.74, d1 - 0.03], [0.74, zf[0]], [wi - 0.03, zf[0]], [wi, zf[0] - 0.03], [wi, d0],
    ], 128, wo), gilt);
    b.build(rotor);
    add({
      id: 'barrel', name: 'Mainspring barrel', category: 'power', side: 'back', exposed: false, priority: 1,
      object, rotor, drive: { key: 'barrel' }, anchor: [4.4, 2.6, -1.6],
      description: 'The power store of the watch: a toothed drum that the uncoiling mainspring turns once every 7 hours. Its 126 teeth drive the 18-leaf centre pinion and so power the whole going train.',
      facts: { Teeth: String(TR.barrel.teeth), 'Tip Ø': `${fmt(2 * (barrelRp + 1.3 * mB), 1)} mm`, Module: `${fmt(mB, 3)} mm`, Speed: '1 turn / 7 h', 'Power reserve': '53 h ≈ 7.6 turns', Drives: 'centre pinion, 7 : 1' },
      live: (s) => `${fmt(degOf(s.rot.barrel), 2)}° · 1 turn / 7 h · ${fmt(s.reserve * spec.powerReserveHours, 1)} h left`,
    });
  }
  // ---------- barrel cover
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const [z0, z1] = barrelZ.lid;
    b.add(latheZ([[0.7, z1], [0.7, z0 + 0.02], [0.74, z0], [1.25, z0], [1.29, z0 - 0.01], [1.41, z0 - 0.01], [1.45, z0],
      [barrelZ.wallIn - 0.07, z0], [barrelZ.wallIn - 0.02, z0 + 0.03], [barrelZ.wallIn - 0.02, z1], [0.7, z1]], 128, barrelZ.wallIn), gilt);
    b.build(rotor);
    add({
      id: 'barrel-cover', name: 'Barrel cover', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'barrel' }, anchor: [-2.4, 2.4, z0],
      description: 'The lid that snaps into the back of the barrel drum and closes the mainspring in. It turns with the drum.',
      facts: { 'Ø': `${fmt(2 * (barrelZ.wallIn - 0.02), 1)} mm`, Turns: 'with the barrel drum' },
    });
  }
  // ---------- barrel arbor
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    // square end in the ratchet → shank through the 3/4 plate → core inside the drum
    // (between lid and floor, the mainspring eye hooks on it) → lower pivot in the main plate
    const zl = barrelZ.lid[1], zf0 = barrelZ.floor[0];
    const core = [zl + 0.03, zf0 - 0.05];
    b.add(latheZ([
      [0, RZ[1]], [0.58, RZ[1]], [0.58, zl + 0.02], [1.5, core[0]], [1.6, core[0] + 0.04], [1.6, core[1] - 0.04],
      [1.5, core[1]], [0.56, core[1] + 0.01], [0.56, -0.68], [0.5, -0.62], [0, -0.62],
    ], 48), steelPol);
    const sq = new THREE.BoxGeometry(0.9, 0.9, RZ[1] - RZ[0] - 0.02);
    b.add(sq, steel, mtx(0, 0, (RZ[0] + RZ[1]) / 2 + 0.01));
    const hook = new THREE.BoxGeometry(0.22, 0.14, 0.36);
    b.add(hook, steel, mtx(1.66, 0.0, (core[0] + core[1]) / 2));
    b.build(rotor);
    add({
      id: 'barrel-arbor', name: 'Barrel arbor', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'ratchet' }, anchor: [1.6, 0, -1.55],
      description: 'The steel axle at the centre of the barrel. The inner end of the mainspring hooks onto its core, and its square end carries the ratchet wheel, so turning the crown turns the arbor and winds the spring.',
      facts: { 'Core Ø': '3.2 mm', Hook: 'for the mainspring eye', Top: 'square for the ratchet wheel', Turns: 'only while winding' },
    });
  }
  // ---------- mainspring (geometry follows state.reserve)
  {
    const { object, rotor } = assembly(L.barrel);
    const ms = makeMainspring();
    const mesh = new THREE.Mesh(ms.geometry, springSteel);
    rotor.add(mesh);
    let last = -1, lastT = 0;
    ms.rebuild(0.92);
    add({
      id: 'mainspring', name: 'Mainspring', category: 'power', side: 'back', exposed: false, priority: 2,
      object, rotor, drive: { key: 'barrel' }, anchor: [0, 3.6, -1.55],
      description: 'A long spiral strip of alloy spring steel coiled inside the barrel. Winding wraps it tightly round the arbor (about 21 coils); as it lets down over 53 hours the coils migrate out to the drum wall (about 13 coils), turning the barrel.',
      facts: { Coils: '≈13 (let down) – 21 (wound)', Length: '≈34 cm', Thickness: '≈0.1 mm', 'Usable turns': '≈7.6', Reserve: '53 h' },
      live: (s) => `${fmt(s.reserve * 100, 0)} % wound · ${fmt(13 + 8 * s.reserve, 1)} coils`,
      update: (s) => {
        const now = performance.now();
        if (Math.abs(s.reserve - last) > 0.003 && now - lastT > 60) { ms.rebuild(s.reserve); last = s.reserve; lastT = now; }
      },
    });
  }

  function makeMainspring() {
    const SEG = 64, MAXT = 21.6, MAXP = Math.ceil(SEG * MAXT) + 2;
    const t = 0.1, pitch = 0.112, r0 = 1.6 + t / 2 + 0.02, R1 = barrelZ.wallIn - t / 2 - 0.03;
    const zb = barrelZ.lid[1] + 0.03, zt = barrelZ.floor[0] - 0.03;
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
        const a = i > 0 ? i - 1 : i, b = i < n - 1 ? i + 1 : i;
        let tx = cx[b] - cx[a], ty = cy[b] - cy[a];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let nx = ty, ny = -tx;
        if (nx * cx[i] + ny * cy[i] < 0) { nx = -nx; ny = -ny; }
        const ix = cx[i] - nx * t / 2, iy = cy[i] - ny * t / 2, ox = cx[i] + nx * t / 2, oy = cy[i] + ny * t / 2;
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
    // Index buffer: winding chosen per face from a sample spiral so it agrees with the normals.
    centreline(0.5); write();
    const tri = (a, b, c) => {
      const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2];
      const ux = pos[3 * b] - ax, uy = pos[3 * b + 1] - ay, uz = pos[3 * b + 2] - az;
      const vx = pos[3 * c] - ax, vy = pos[3 * c + 1] - ay, vz = pos[3 * c + 2] - az;
      return (uy * vz - uz * vy) * nor[3 * a] + (uz * vx - ux * vz) * nor[3 * a + 1] + (ux * vy - uy * vx) * nor[3 * a + 2];
    };
    const k0 = 40; // a segment in the middle of the spring
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
  // Generic train arbor assembly: wheel + collet + pinion + arbor.
  function trainWheel({ id, pos, teeth, module: m, zW, spokes, rimW, hubR, spokeW, spokePhase, pinion, pinionModule, pinionZ, pinionPhase, arbor, collet, cTall, drive, anchor, def }) {
    const { object, rotor } = assembly(pos);
    const b = new Batch();
    const thick = 0.12; // spec: L0/L1/L2 wheel levels are 0.12 thick
    b.add(makeWheelGeo(gear, { teeth, module: m, thickness: thick, spokes, rimW, hubR, spokeW, fillet: 0.11, phase: spokePhase }), giltPair, mtx(0, 0, zW), 38 * DEG);
    // collet riveting the wheel onto the pinion staff (polished steel, on the back face)
    const cz = zW - thick / 2;
    b.add(latheZ([[collet[0], cz - 0.1], [collet[1] - 0.04, cz - 0.1], [collet[1], cz - 0.06], [collet[1], cz + 0.01], [collet[0], cz + 0.01]], 40), steelPol);
    const cz2 = zW + thick / 2, ch = cTall ?? 0.06;
    b.add(latheZ([[collet[0], cz2 - 0.01], [collet[1], cz2 - 0.01], [collet[1], cz2 + ch - 0.03], [collet[1] - 0.03, cz2 + ch], [collet[0], cz2 + ch]], 40), steelPol);
    const pl = pinionZ[1] - pinionZ[0];
    b.add(gear.pinionGeometry({ leaves: pinion, module: pinionModule, length: pl }), pinPair, mtx(0, 0, (pinionZ[0] + pinionZ[1]) / 2, pinionPhase), 35 * DEG);
    b.add(latheZ(arbor, 24), steelPol);
    b.build(rotor);
    return add({ id, object, rotor, drive: { key: drive }, anchor, ...def });
  }

  const pivotTop = Z.threeQuarterPlate[0] + 0.07; // pivot ends sit just inside the upper jewels
  trainWheel({
    id: 'center-wheel', pos: L.center, teeth: TR.center.teeth, module: MD.center, zW: Z.centerWheel,
    spokes: 5, rimW: 0.26, hubR: 0.62, spokeW: 0.25, spokePhase: 0.31,
    pinion: TR.center.pinion, pinionModule: MD.barrel, pinionZ: Z.pinionOf.center, pinionPhase: phCentrePinion,
    collet: [0.25, 0.44], cTall: 0.03,
    arbor: [[0, pivotTop], [0.1, pivotTop], [0.12, pivotTop + 0.03], [0.12, -2.08], [0.24, -2.02], [0.27, -1.98], [0.3, -1.6],
      [0.3, -0.98], [0.27, -0.94], [0.25, -0.9], [0.25, Z.cannonPinion[0] - 0.08], [0.2, Z.cannonPinion[0] - 0.04],
      [0.2, Z.cannonPinion[1] - 0.06], [0.16, Z.cannonPinion[1] - 0.03], [0, Z.cannonPinion[1] - 0.03]],
    drive: 'center', anchor: [-3.0, -0.7, Z.centerWheel],
    def: {
      name: 'Centre wheel', category: 'train', side: 'back', exposed: true, priority: 1,
      description: 'The second wheel of the going train, driven by the barrel through its 18-leaf pinion. It turns exactly once an hour, and its arbor runs through the main plate to the dial side, where the cannon pinion on it carries the minute hand.',
      facts: { Teeth: String(TR.center.teeth), Pinion: `${TR.center.pinion} leaves`, Module: `${fmt(MD.center, 3)} mm`, 'Tip Ø': `${fmt(2 * ((MD.center * TR.center.teeth) / 2 + 1.3 * MD.center), 2)} mm`, Speed: '1 turn / hour', Carries: 'minute hand (via the cannon pinion)' },
      live: (s) => `${fmt(degOf(s.rot.center), 2)}° · 1 rev / 60 min (0.0167 rpm)`,
    },
  });
  trainWheel({
    id: 'third-wheel', pos: L.third, teeth: TR.third.teeth, module: MD.third, zW: Z.thirdWheel,
    spokes: 4, rimW: 0.25, hubR: 0.52, spokeW: 0.24, spokePhase: 0.2,
    pinion: TR.third.pinion, pinionModule: MD.center, pinionZ: Z.pinionOf.third, pinionPhase: phThirdPinion,
    collet: [0.16, 0.34],
    arbor: [[0, pivotTop], [0.07, pivotTop], [0.08, pivotTop + 0.03], [0.08, -2.1], [0.16, -2.04], [0.16, -0.95], [0.08, -0.9], [0.08, -0.62], [0.05, -0.6], [0, -0.6]],
    drive: 'third', anchor: [2.7, -1.2, Z.thirdWheel],
    def: {
      name: 'Third wheel', category: 'train', side: 'back', exposed: false, priority: 2,
      description: 'An intermediate wheel that steps up the speed: driven by the centre wheel through its 16-leaf pinion, it turns once every 8 minutes and drives the fourth (seconds) wheel.',
      facts: { Teeth: String(TR.third.teeth), Pinion: `${TR.third.pinion} leaves`, Module: `${fmt(MD.third, 3)} mm`, Speed: '1 turn / 8 min', Ratio: '7.5 : 1 from the centre wheel' },
      live: (s) => `${fmt(degOf(s.rot.third), 1)}° · 1 rev / 8 min (0.125 rpm)`,
    },
  });
  trainWheel({
    id: 'fourth-wheel', pos: L.fourth, teeth: TR.fourth.teeth, module: MD.fourth, zW: Z.fourthWheel,
    spokes: 4, rimW: 0.23, hubR: 0.46, spokeW: 0.22, spokePhase: 0.45,
    pinion: TR.fourth.pinion, pinionModule: MD.third, pinionZ: Z.pinionOf.fourth, pinionPhase: phFourthPinion,
    collet: [0.14, 0.3],
    arbor: [[0, pivotTop], [0.06, pivotTop], [0.07, pivotTop + 0.03], [0.07, -2.1], [0.15, -2.04], [0.15, -0.98], [0.12, -0.92],
      [0.12, Z.mainPlate[1] + 0.02], [0.085, Z.mainPlate[1] + 0.08], [0.085, Z.secondsHand + 0.05], [0.06, Z.secondsHand + 0.08], [0, Z.secondsHand + 0.08]],
    drive: 'fourth', anchor: [2.4, 1.2, Z.fourthWheel],
    def: {
      name: 'Fourth wheel (seconds wheel)', category: 'train', side: 'back', exposed: false, priority: 2,
      description: 'The seconds wheel. It turns once a minute; its long arbor passes through the main plate and the dial to carry the small seconds hand at 6 o\'clock, while its 120 teeth drive the escape pinion.',
      facts: { Teeth: String(TR.fourth.teeth), Pinion: `${TR.fourth.pinion} leaves`, Module: `${fmt(MD.fourth, 3)} mm`, Speed: '1 turn / minute', Carries: 'small seconds hand', Drives: 'escape pinion, 12 : 1' },
      live: (s) => `${fmt(degOf(s.rot.fourth), 1)}° · 1 rpm`,
    },
  });

  // ===================================================================== MOTION WORKS
  {
    // cannon pinion
    const { object, rotor } = assembly(L.center);
    const b = new Batch();
    const [c0] = Z.cannonPinion, cTop = Z.cannonPinion[1];
    const leafZ = Z.cannonLeaves;
    b.add(gear.pinionGeometry({ leaves: TR.cannon.teeth, module: MD.motionA, length: leafZ[1] - leafZ[0] }), pinPair, mtx(0, 0, (leafZ[0] + leafZ[1]) / 2), 35 * DEG);
    // shoulder above the leaves stays below the hour wheel's bore (hour wheel from z.hourWheel − 0.05)
    const sh = Z.hourWheel - 0.05 - 0.012;
    b.add(latheZ([[0.21, c0], [0.5, c0], [0.5, leafZ[1]], [0.6, leafZ[1]], [0.6, sh - 0.02], [0.45, sh],
      [0.45, Z.hourPipeTop + 0.02], [0.4, Z.hourPipeTop + 0.05], [0.4, cTop - 0.04], [0.36, cTop], [0.21, cTop], [0.21, c0]], 40), steelPol);
    b.build(rotor);
    add({
      id: 'cannon-pinion', name: 'Cannon pinion', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'cannon' }, anchor: [0.6, 0, leafZ[1]],
      description: 'A hollow pinion with a friction fit on the centre-wheel arbor; its pipe carries the minute hand. The friction lets the hands be set without stopping the train, and its 12 leaves drive the minute wheel.',
      facts: { Leaves: String(TR.cannon.teeth), Module: `${fmt(MD.motionA, 3)} mm`, Speed: '1 turn / hour', 'Minute-hand pipe': 'Ø0.80 mm' },
      live: (s) => `${fmt(degOf(s.rot.cannon), 2)}° · 1 rev / 60 min`,
    });
  }
  {
    // minute wheel + pinion on a fixed stud
    const { object, rotor } = assembly(L.minuteWheel);
    const b = new Batch();
    const zw = Z.minuteWheel, tw = 0.10;
    b.add(makeWheelGeo(gear, { teeth: TR.minuteWheel.teeth, module: MD.motionA, thickness: tw, spokes: 4, rimW: 0.24, hubR: 0.95, spokeW: 0.3, fillet: 0.1, phase: 0.4 }), brassPair, mtx(0, 0, zw, phMinuteWheel), 38 * DEG);
    const pz = Z.minutePinion;
    b.add(gear.pinionGeometry({ leaves: TR.minuteWheel.pinion, module: MD.motionB, length: pz[1] - pz[0] }), pinPair, mtx(0, 0, (pz[0] + pz[1]) / 2), 35 * DEG);
    b.add(latheZ([[0.26, zw - tw / 2 - 0.04], [0.55, zw - tw / 2 - 0.04], [0.58, zw - tw / 2], [0.58, pz[0]], [0.26, pz[0]]], 32), steelPol);
    b.build(rotor);
    const s = new Batch();
    // fixed stud; its head stays below the dial (z < 0)
    s.add(latheZ([[0, Z.motionRecess], [0.25, Z.motionRecess], [0.25, pz[1] + 0.003], [0.34, pz[1] + 0.003], [0.34, -0.012], [0.31, -0.004], [0, -0.004]], 32), steelPol);
    s.build(object);
    add({
      id: 'minute-wheel', name: 'Minute wheel', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'minuteWheel' }, anchor: [-1.2, -1.6, zw],
      description: 'Part of the 12 : 1 motion works under the dial. Driven by the cannon pinion, it turns once every 3 h 20 min; its 10-leaf pinion turns the hour wheel. The setting wheel stays in mesh with it for hand-setting.',
      facts: { Teeth: String(TR.minuteWheel.teeth), Pinion: `${TR.minuteWheel.pinion} leaves`, Speed: '1 turn / 3 h 20 min', Ratio: '(40/12) × (36/10) = 12' },
      live: (st) => `${fmt(degOf(st.rot.minuteWheel), 2)}° · 1 rev / 200 min`,
    });
  }
  {
    // hour wheel
    const { object, rotor } = assembly(L.center);
    const b = new Batch();
    const zh = Z.hourWheel, th = 0.10;
    b.add(makeWheelGeo(gear, { teeth: TR.hourWheel.teeth, module: MD.motionB, thickness: th, spokes: 0, bore: 0.47 }), brassPair, mtx(0, 0, zh, phHourWheel), 38 * DEG);
    // boss under the dial (z < 0: the dial's centre hole is only Ø1.5), then the pipe for the hour hand
    b.add(latheZ([[0.47, zh + th / 2 - 0.01], [0.95, zh + th / 2 - 0.01], [0.95, -0.02], [0.86, -0.004],
      [0.65, -0.004], [0.65, Z.hourPipeTop - 0.03], [0.61, Z.hourPipeTop], [0.47, Z.hourPipeTop], [0.47, zh + th / 2 - 0.01]], 40), brass);
    b.build(rotor);
    add({
      id: 'hour-wheel', name: 'Hour wheel', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'hourWheel' }, anchor: [1.6, 1.6, zh],
      description: 'Rides loosely on the cannon pinion and carries the hour hand on its pipe. Driven by the minute pinion, it turns once every 12 hours.',
      facts: { Teeth: String(TR.hourWheel.teeth), Module: `${fmt(MD.motionB, 3)} mm`, Speed: '1 turn / 12 h', 'Hour-hand pipe': 'Ø1.30 mm' },
      live: (s) => `${fmt(degOf(s.rot.hourWheel), 3)}° · 1 rev / 12 h`,
    });
  }

  // ===================================================================== KEYLESS — BACK
  const mK = MD.keyless;
  const ratchetRp = (mK * KW.ratchet.teeth) / 2;
  {
    // Double sunburst as on the reference render: toothed rim (lowest), a brushed annulus
    // 0.02 higher behind a fine step at r 3.4, and the raised inner disc (Ø 4.7, top at
    // spec ratchetWheel[0]) behind a polished bevel; the screw sits in a polished sink.
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const zD = RZ[0], zA = RZ[0] + 0.03, zR = RZ[0] + 0.05; // disc, annulus, toothed rim (back faces)
    const ringIn = 3.38, rA0 = 2.44, rD1 = 2.34, rHole = 1.08;
    const R = ratchetRp + 1.3 * mK;
    const ring = gear.extrudeOutline(gear.toothedOutline({ teeth: KW.ratchet.teeth, module: mK }), [gear.circlePath(ringIn, 160)], RZ[1] - zR, { uvRadius: R });
    b.add(ring, sunPair, mtx(0, 0, (zR + RZ[1]) / 2), 35 * DEG);
    b.add(latheZ([[rHole, RZ[1]], [rHole, zD + 0.035], [rHole + 0.07, zD]], 128, R), steelPol); // screw sink
    b.add(latheZ([[rHole + 0.07, zD], [rD1, zD]], 128, R), sun); // raised inner disc
    b.add(latheZ([[rD1, zD], [rD1 + 0.03, zD + 0.006], [rA0, zA]], 128, R), steelPol); // polished bevel
    b.add(latheZ([[rA0, zA], [ringIn - 0.02, zA]], 128, R), sun); // annulus
    b.add(latheZ([[ringIn - 0.02, zA], [ringIn + 0.015, zR]], 128, R), steelPol); // fine step to the rim
    b.add(latheZ([[ringIn, RZ[1]], [rHole, RZ[1]]], 96, R), sun); // underside
    b.build(rotor);
    add({
      id: 'ratchet-wheel', name: 'Ratchet wheel', category: 'keyless', side: 'back', exposed: true, priority: 1,
      object, rotor, drive: { key: 'ratchet' }, anchor: [-2.0, 2.0, zA],
      description: 'Screwed to the square of the barrel arbor: winding turns it and the arbor, tensioning the mainspring, and the click stops it running back. NOMOS gives it the Glashütte double sunburst – a toothed outer ring and a slightly raised inner disc, each brushed radially.',
      facts: { Teeth: String(KW.ratchet.teeth), 'Tip Ø': `${fmt(2 * R, 2)} mm`, Module: `${fmt(mK, 3)} mm`, Finish: 'Glashütte double sunburst', 'Per crown turn': `${fmt(360 * KW.windingPinion.teeth / KW.ratchet.teeth, 1)}° (15 teeth)`, 'Full wind': '≈28 crown turns' },
      live: (s) => `${fmt(degOf(s.rot.ratchet), 1)}° · ${fmt(s.reserve * 100, 0)} % wound`,
    });
    // ratchet screw
    const scr = assembly(L.barrel);
    const sb = new Batch();
    sb.add(screwGeo(1.0, Z.ratchetWheel[0] - Z.ratchetScrewTop + 0.03, 0.2, 0.075), steelPol, screwMtx(0, 0, RZ[0] + 0.03, 59, -1));
    sb.build(scr.rotor);
    add({
      id: 'ratchet-screw', name: 'Ratchet screw', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object: scr.object, rotor: scr.rotor, drive: { key: 'ratchet' }, anchor: [0.7, 0, Z.ratchetScrewTop],
      description: 'The large slotted screw that clamps the ratchet wheel onto the square of the barrel arbor. It turns with the ratchet while the watch is wound.',
      facts: { 'Head Ø': '2.0 mm', Finish: 'polished, slotted' },
    });
  }
  {
    // crown wheel
    const { object, rotor } = assembly(L.crownWheel);
    const b = new Batch();
    // 0.005 clear of the recess floor (spec crownWheel[1]); toothed rim 0.02 below a
    // brushed annulus that shows round the cover disc (reference: step at r ≈ 2.3).
    const CZ = [Z.crownWheel[0], Z.crownWheel[1] - 0.005];
    const Rc = (mK * KW.crownWheel.teeth) / 2 + 1.3 * mK;
    const cIn = 2.28, cHole = 1.32, zRim = CZ[0] + 0.02;
    const g = gear.extrudeOutline(gear.toothedOutline({ teeth: KW.crownWheel.teeth, module: mK }), [gear.circlePath(cIn, 128)], CZ[1] - zRim, { uvRadius: Rc });
    b.add(g, sunPair, mtx(0, 0, (zRim + CZ[1]) / 2, phCrownWheel), 35 * DEG);
    b.add(latheZ([[cHole, CZ[1]], [cHole, CZ[0]]], 96, Rc), steelPol); // bore
    b.add(latheZ([[cHole, CZ[0]], [cIn - 0.03, CZ[0]]], 128, Rc), sun); // annulus
    b.add(latheZ([[cIn - 0.03, CZ[0]], [cIn + 0.012, zRim]], 128, Rc), steelPol); // step to the rim
    b.add(latheZ([[cIn, CZ[1]], [cHole, CZ[1]]], 96, Rc), sun); // underside
    b.build(rotor);
    add({
      id: 'crown-wheel', name: 'Crown wheel', category: 'keyless', side: 'back', exposed: true, priority: 1,
      object, rotor, drive: { key: 'crownWheel' }, anchor: [-1.75, -1.55, CZ[0]],
      description: 'Carries the winding from the stem to the ratchet wheel: the winding pinion on the stem turns it, and it meshes with the 56-tooth ratchet. It turns on a fixed core in a recess of the three-quarter plate and, like the ratchet, wears the Glashütte sunburst.',
      facts: { Teeth: String(KW.crownWheel.teeth), 'Tip Ø': `${fmt(2 * Rc, 2)} mm`, Module: `${fmt(mK, 3)} mm`, Driven: 'by the 15-tooth winding pinion', Drives: 'ratchet wheel (56)', Finish: 'Glashütte sunburst' },
      live: (s) => `${fmt(degOf(s.rot.crownWheel), 1)}° · ${fmt(360 * KW.windingPinion.teeth / KW.crownWheel.teeth, 1)}° per crown turn`,
    });
    // cover disc + its two screws (fixed)
    const cov = assembly(L.crownWheel);
    const cb = new Batch();
    // disc spec.z.crownWheelCover (0.005 clear of the wheel) on a fixed core down to the recess floor
    const VZ = [Z.crownWheelCover[0], Z.crownWheelCover[1] - 0.005];
    cb.add(latheZ([[0, VZ[0]], [1.95, VZ[0]], [2.0, VZ[0] + 0.025], [2.0, VZ[1]], [1.3, VZ[1]], [1.3, Z.crownWheel[1]], [0, Z.crownWheel[1]]], 128), steelPol);
    // screws: heads sunk 0.015 into the disc, tops at spec ratchetScrewTop (−2.60)
    const sz = VZ[0] + 0.015, sh = sz - Z.ratchetScrewTop;
    cb.add(screwGeo(0.47, sh, 0.1, 0.03), steelPol, screwMtx(0, 1.04 - L.crownWheel[1], sz, 10, -1));
    cb.add(screwGeo(0.47, sh, 0.1, 0.03), steelPol, screwMtx(0, -0.99 - L.crownWheel[1], sz, 90, -1));
    cb.build(cov.object);
    add({
      id: 'crown-wheel-cover', name: 'Crown-wheel cover', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object: cov.object, anchor: [1.3, 0, VZ[0]],
      description: 'A plain polished steel disc held by two small screws. It caps the fixed crown-wheel core and keeps the crown wheel in its recess; it does not turn.',
      facts: { 'Ø': '4.0 mm', Screws: '2, slotted', Finish: 'polished' },
    });
  }

  // ---------- click (Glashütte click) and its long spring — measured in back view
  {
    const bRc = [-L.barrel[0], L.barrel[1]]; // ratchet centre, back view
    const pitchR = TAU / KW.ratchet.teeth;
    // click beak rests in a gap 5½ pitches from the line of local angle 0 (dial frame),
    // i.e. a gap whenever windAngle is a whole number of teeth (clickLift = 0).
    const gapDial = 5.5 * pitchR;
    const gapBack = Math.PI - gapDial;
    const rTip = 3.7;
    const T = [bRc[0] + rTip * Math.cos(gapBack), bRc[1] + rTip * Math.sin(gapBack)];
    const KZc = Z.click;
    const uR = [Math.cos(gapBack), Math.sin(gapBack)]; // outward radial at the beak tip
    const P = [-8.2, 6.0]; // pivot screw = spec.frame.clickRecess.center
    // Outline traced on the reference render (back view, mm): a broad lever whose
    // upper-left edge is concentric with the movement (the click spring lies along it),
    // a straight top edge at y ≈ 8.25, the locking face running radially into the tooth
    // gap, the sliding face ~29° off it, and a concave lower edge that follows the
    // ratchet's tip circle back to the pivot boss. The rounded tail lies in the plate's
    // click recess under the screw.
    const arcR = 10.56;
    const upper = [];
    for (let a = 146; a >= 129.5; a -= 1.5) upper.push([arcR * Math.cos(a * DEG), arcR * Math.sin(a * DEG)]);
    const body = [
      ...upper, [-6.55, 8.24], [-5.78, 8.25], T,
      [-5.72, 7.8], [-6.05, 7.68], [-6.38, 7.42], [-6.68, 7.02], [-6.95, 6.55], [-7.11, 6.39], [-7.45, 5.99], [-7.76, 5.63],
    ];
    const clickSdfBack = sUnion(0.12,
      sdCircle(P[0], P[1], 0.6),
      sdCapsule(P, [-8.62, 5.62], 0.45, 0.45),
      sdPolygon(body),
    );
    const clickSdf = (x, y) => clickSdfBack(-x, y);
    const pD = BV(...P), tD = BV(...T);
    const leverAng = Math.atan2(tD[1] - pD[1], tD[0] - pD[0]);
    const { object, rotor } = assembly(pD);
    const b = new Batch();
    const cg = sdfExtrude(clickSdf, [4.9, 4.8, 9.6, 8.6], pD, KZc[0], KZc[1] - KZc[0], { bevel: 0.035, planarUV, uvAngle: leverAng });
    b.add(cg, satPair, null, BEVEL_CREASE);
    b.build(rotor);
    const sb = new Batch();
    sb.add(screwGeo(0.55, KZc[0] + 0.01 - Z.ratchetScrewTop, 0.13, 0.05), steelPol, screwMtx(0, 0, KZc[0] + 0.01, 58, -1)); // top at −2.60
    sb.build(object);

    // ---- click motion, contact-exact: for each ratchet phase f (fraction of a tooth
    // wound since the beak last dropped into a gap) the smallest rotation about the pivot
    // that keeps the beak clear of the teeth. Found once by bisection against a polar
    // profile of the ratchet; the table gives the real motion – a slow ride up the flank
    // of each tooth, then a snap back into the next gap.
    const arm = [tD[0] - pD[0], tD[1] - pD[1]];
    const uRd = [-uR[0], uR[1]];
    const radialPerRad = -arm[1] * uRd[0] + arm[0] * uRd[1]; // tip's outward motion per +1 rad (negative)
    const LUT_N = 48;
    const lut = new Float32Array(LUT_N + 1);
    {
      const NB = 360, prof = new Float32Array(NB);
      const outl = gear.toothedOutline({ teeth: KW.ratchet.teeth, module: mK });
      for (let i = 0; i < outl.length; i++) {
        const a = outl[i], c = outl[(i + 1) % outl.length];
        for (let k = 0; k <= 32; k++) {
          const x = a.x + ((c.x - a.x) * k) / 32, y = a.y + ((c.y - a.y) * k) / 32;
          let u = Math.atan2(y, x) / pitchR; u -= Math.floor(u);
          const bin = Math.min(NB - 1, Math.floor(u * NB));
          prof[bin] = Math.max(prof[bin], Math.hypot(x, y));
        }
      }
      const cR = L.barrel, clr = 0.006;
      const inRatchet = (x, y, w) => {
        const dx = x - cR[0], dy = y - cR[1];
        let u = (Math.atan2(dy, dx) - w) / pitchR; u -= Math.floor(u);
        return Math.hypot(dx, dy) < prof[Math.min(NB - 1, Math.floor(u * NB))] + clr;
      };
      const dens = (poly, h) => {
        const o = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i], c = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / h));
          for (let k = 0; k < n; k++) o.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
        }
        return o;
      };
      const bodyD = body.map(([x, y]) => [-x, y]);
      const beakPts = dens(bodyD, 0.006).filter((q) => Math.hypot(q[0] - tD[0], q[1] - tD[1]) < 0.9);
      const outD = dens(outl.map((v) => [v.x, v.y]), 0.006);
      const inPoly = (x, y, poly) => {
        let sIn = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) sIn = !sIn;
        }
        return sIn;
      };
      for (let k = 0; k <= LUT_N; k++) {
        const w = ((k % LUT_N) / LUT_N) * pitchR, cw = Math.cos(w), swn = Math.sin(w);
        const near = [];
        for (const [x, y] of outD) {
          const X = cR[0] + x * cw - y * swn, Y = cR[1] + x * swn + y * cw;
          if (Math.hypot(X - tD[0], Y - tD[1]) < 0.9) near.push([X, Y]);
        }
        const hits = (a) => {
          const ca = Math.cos(a), sa = Math.sin(a);
          for (const [x, y] of beakPts) {
            const dx = x - pD[0], dy = y - pD[1];
            if (inRatchet(pD[0] + dx * ca - dy * sa, pD[1] + dx * sa + dy * ca, w)) return true;
          }
          for (const [x, y] of near) { // teeth points brought into the click's frame
            const dx = x - pD[0], dy = y - pD[1];
            if (inPoly(pD[0] + dx * ca + dy * sa, pD[1] - dx * sa + dy * ca, bodyD)) return true;
          }
          return false;
        };
        let lo = 0, hi = 0.16; // lifting is a negative rotation.z (CCW seen from the back)
        if (!hits(0)) { lut[k] = 0; continue; }
        for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; if (hits(-m)) lo = m; else hi = m; }
        lut[k] = -hi;
      }
    }
    let clickAngle = 0;
    const clickAt = (f) => { const x = f * LUT_N, i = Math.min(LUT_N - 1, Math.floor(x)), t = x - i; return lut[i] + (lut[i + 1] - lut[i]) * t; };
    add({
      id: 'click', name: 'Click (Glashütte click)', category: 'keyless', side: 'back', exposed: true, priority: 1,
      object, rotor, anchor: [arm[0] * 0.55, arm[1] * 0.55 + 0.3, KZc[0]],
      description: 'The Glashütte click (Glashütter Gesperr): a steel pawl whose beak rests between the ratchet teeth. While you wind it rides up each tooth and drops back – the clicking you hear – and when you stop it holds the ratchet so the mainspring cannot unwind.',
      facts: { Type: 'Glashütte click', Engages: `ratchet wheel (${KW.ratchet.teeth} teeth)`, 'Clicks per crown turn': String(KW.windingPinion.teeth), Finish: 'brushed, polished bevels' },
      live: () => (clickAngle < -1e-4 ? `riding a tooth · lifted ${fmt(clickAngle * radialPerRad, 2)} mm` : 'locked in a tooth gap'),
      update: (s) => {
        // the beak's position follows the ratchet geometry (state.clickLift is this same
        // tooth phase while winding); a part-tooth wind leaves it resting on the flank.
        const tp = (s.windAngle / TAU) * KW.ratchet.teeth;
        clickAngle = clickAt(tp - Math.floor(tp));
        rotor.rotation.z = clickAngle;
      },
    });

    // click spring: long curved blade along the plate edge (r ≈ 11), fixed near 11 o'clock
    // (back view); it widens into a foot that runs along the click's upper edge and its
    // nose presses the click near the pivot, keeping the beak in the ratchet.
    const polar = (r, a) => [r * Math.cos(a * DEG), r * Math.sin(a * DEG)];
    const aC = 141.5; // contact on the click's upper edge
    const nB = [Math.cos(aC * DEG), Math.sin(aC * DEG)]; // its outward normal (radial)
    const contactB = polar(arcR, aC);
    const noseC = [contactB[0] + 0.16 * nB[0], contactB[1] + 0.16 * nB[1]];
    const foot = polar(11.06, 119);
    const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const rcOf = (a) => 11.06 - 0.06 * sm(128, 135, a);
    const wOf = (a) => 0.17 + 0.1 * sm(128, 135, a);
    // blade along the arc: analytic band distance (radius and half-width vary slowly)
    const a0 = 119, a1 = 141.6, e0 = polar(rcOf(a0), a0), e1 = polar(rcOf(a1), a1);
    const blade = (x, y) => {
      let a = (Math.atan2(y, x) * 180) / Math.PI;
      if (a < 0) a += 360;
      if (a >= a0 && a <= a1) return Math.abs(Math.hypot(x, y) - rcOf(a)) - wOf(a);
      return Math.min(Math.hypot(x - e0[0], y - e0[1]) - wOf(a0), Math.hypot(x - e1[0], y - e1[1]) - wOf(a1));
    };
    const springBack = sUnion(0.14, blade, sdCircle(noseC[0], noseC[1], 0.16), sdCircle(foot[0], foot[1], 0.26));
    const springSdf = (x, y) => springBack(-x, y);
    const fD = BV(...foot);
    const sp = assembly(fD);
    const spb = new Batch();
    const sg = sdfExtrude(springSdf, [4.9, 6.2, 9.1, 10.2], fD, KZc[0] + 0.015, KZc[1] - KZc[0] - 0.015, { bevel: 0.03, planarUV, uvAngle: -40 * DEG });
    spb.add(sg, satPair, null, BEVEL_CREASE);
    spb.build(sp.rotor);
    // spring deflection follows the click (rigid rotation about the foot ≈ cantilever bend)
    const cD = BV(...contactB), nD = [-nB[0], nB[1]], noseD = BV(...noseC);
    const m1 = -(cD[1] - pD[1]) * nD[0] + (cD[0] - pD[0]) * nD[1];
    const m2 = -(noseD[1] - fD[1]) * nD[0] + (noseD[0] - fD[0]) * nD[1];
    const springRatio = m1 / m2;
    add({
      id: 'click-spring', name: 'Click spring', category: 'keyless', side: 'back', exposed: true, priority: 2,
      object: sp.object, rotor: sp.rotor, anchor: (() => { const p = BV(...polar(11.03, 131)); return [p[0] - fD[0], p[1] - fD[1], KZc[0]]; })(),
      description: 'The long, curved Glashütte click spring. It runs along the edge of the movement and presses the click into the ratchet teeth; its length gives the soft, even winding feel NOMOS describes as an "elongated ratchet spring".',
      facts: { Type: 'Glashütte click spring', Length: '≈4.6 mm along the edge', Finish: 'brushed, polished bevels' },
      update: () => { sp.rotor.rotation.z = clickAngle * springRatio; },
    });
  }

  // ===================================================================== KEYLESS — STEM SIDE
  // Stem axis y = 0.05, z = spec stemAxis. The sliding and winding pinions (r ≤ 0.82) run in
  // the plates' key slot / pocket; the winding pinion's teeth reach the crown wheel through
  // the winding-pinion window of the three-quarter plate.
  const SY = 0.05, SZ = Z.stemAxis;
  let stemAngle = 0;
  const stemUpdate = (s) => { stemAngle = s.rot.crownWheel * stemRatio; };
  const xs = { pilot: 4.1, journal: 4.6, sq0: 5.95, sq1: 7.84, wpIn: 7.92, wpTeeth: [8.55, 9.15], wpOut: 9.15, shoulder: 9.4, groove: [9.88, 10.32], neck: 16.9, thread: 17.95, end: 18.4 };
  {
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    b.add(latheX([[0, xs.pilot], [0.16, xs.pilot], [0.22, xs.pilot + 0.06], [0.22, xs.journal], [0.32, xs.journal + 0.07], [0.32, xs.sq0], [0, xs.sq0]], 28), steelPol);
    const sq = new THREE.BoxGeometry(xs.sq1 - xs.sq0, 0.6, 0.6);
    b.add(sq, steelPol, mtx((xs.sq0 + xs.sq1) / 2, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 4)));
    const prof = [[0, xs.sq1], [0.3, xs.sq1], [0.3, xs.shoulder], [0.45, xs.shoulder + 0.07], [0.45, xs.groove[0]], [0.31, xs.groove[0] + 0.08],
      [0.31, xs.groove[1] - 0.08], [0.45, xs.groove[1]], [0.45, xs.neck], [0.36, xs.neck + 0.08], [0.36, xs.thread]];
    // the thread is screwed into the crown (inside it); Ø0.72 where it crosses the case tube
    for (let x = xs.thread + 0.05, k = 0; x < xs.end - 0.08; x += 0.07, k++) prof.push([k % 2 ? 0.36 : 0.29, x]);
    prof.push([0.26, xs.end - 0.03], [0, xs.end]);
    b.add(latheX(prof, 28), steelPol);
    b.build(rotor);
    add({
      id: 'winding-stem', name: 'Winding stem', category: 'keyless', side: 'both', exposed: false, priority: 2,
      object, rotor, anchor: [12.5, 0, 0.45],
      description: 'The steel shaft from the crown into the movement. Its square middle section turns the sliding pinion, and the setting-lever pin rides in its groove to hold it in the winding or the setting position.',
      facts: { 'Ø': '0.90 mm', Positions: '2 – wind / set (stop seconds)', Drives: 'sliding pinion via a square' },
      live: () => `${fmt(((((stemAngle * 180) / Math.PI) % 360) + 360) % 360, 0)}°`,
      update: (s) => { stemUpdate(s); rotor.rotation.x = stemAngle; },
    });
  }
  {
    // winding pinion: 15 spur teeth under the crown wheel + Breguet teeth on its inner face
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    const tl = xs.wpTeeth[1] - xs.wpTeeth[0];
    const teeth = gear.extrudeOutline(gear.toothedOutline({ teeth: zWP, module: mK }), [gear.circlePath(0.31, 32)], tl);
    b.add(teeth, pinPair, onX((xs.wpTeeth[0] + xs.wpTeeth[1]) / 2, phWindingPinion), 35 * DEG);
    b.add(latheX([[0.31, xs.wpIn], [0.76, xs.wpIn], [0.78, xs.wpIn + 0.02], [0.78, xs.wpTeeth[0] - 0.06], [0.8, xs.wpTeeth[0] + 0.01], [0.31, xs.wpTeeth[0] + 0.01]], 32), steelPol);
    b.add(faceTeethGeo({ teeth: 9, rIn: 0.36, rOut: 0.76, H: 0.2, mode: 'saw' }), steelDS, onX(xs.wpIn, 0, ANX));
    b.build(rotor);
    add({
      id: 'winding-pinion', name: 'Winding pinion', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object, rotor, anchor: [(xs.wpTeeth[0] + xs.wpTeeth[1]) / 2, 0, -1.15],
      description: 'Turns freely on the stem and is driven through its Breguet (ratchet) teeth by the sliding pinion. Its 15 teeth turn the crown wheel; the top of the pinion shows through the slot in the three-quarter plate next to the crown wheel.',
      facts: { Teeth: String(zWP), Module: `${fmt(mK, 3)} mm`, Drives: `crown wheel (${zCW})`, 'Coupling': 'Breguet teeth (one-way)' },
      update: (s) => { stemUpdate(s); rotor.rotation.x = stemAngle; },
    });
  }
  {
    // sliding (clutch) pinion on the square
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    const x0 = 6.12, g0 = 6.72, g1 = 6.98, x1 = xs.wpIn - 0.2;
    b.add(latheX([[0.43, x0], [0.8, x0], [0.82, x0 + 0.02], [0.82, 6.6], [0.62, 6.68], [0.5, g0], [0.5, g1], [0.62, 7.02], [0.8, 7.08], [0.8, x1], [0.43, x1]], 40), steelPol);
    b.add(faceTeethGeo({ teeth: 9, rIn: 0.36, rOut: 0.76, H: 0.2, mode: 'saw' }), steelDS, onX(x1, 0, AX));
    b.add(faceTeethGeo({ teeth: KW.slidingPinion.teeth, rIn: 0.45, rOut: 0.8, H: 0.12, mode: 'tri' }), steelDS, onX(x0, 0, ANX));
    b.build(rotor);
    add({
      id: 'sliding-pinion', name: 'Sliding pinion', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [6.85, 0, 0.75],
      description: 'Slides on the square of the stem. Pressed against the winding pinion it winds the watch; shifted by the yoke towards the setting wheel it turns the motion works to set the hands instead.',
      facts: { 'Outer teeth': 'Breguet ratchet teeth (to the winding pinion)', 'Inner teeth': `${KW.slidingPinion.teeth} contrate teeth (to the setting wheel)` },
      update: (s) => { stemUpdate(s); rotor.rotation.x = stemAngle; },
    });
  }

  // ---------- setting wheel: always in mesh with the minute wheel
  const dSW = (MD.motionA * (TR.minuteWheel.teeth + KW.settingWheel.teeth)) / 2;
  const swPos = [L.minuteWheel[0] + Math.sqrt(dSW * dSW - (SY - L.minuteWheel[1]) ** 2), SY];
  {
    const { object, rotor } = assembly(swPos);
    const phSW = gear.meshPhase(ang(L.minuteWheel, swPos), TR.minuteWheel.teeth, KW.settingWheel.teeth, phMinuteWheel);
    const b = new Batch();
    // top 0.10 in the minute wheel's plane (spec settingWheel); the body reaches down into
    // the plate's setting-wheel pocket (floor −0.56) towards the sliding pinion's teeth
    const sz = [-0.52, Z.settingWheel + 0.05];
    b.add(gear.extrudeOutline(gear.toothedOutline({ teeth: KW.settingWheel.teeth, module: MD.motionA }), [gear.circlePath(0.22, 24)], sz[1] - sz[0]), pinPair, mtx(0, 0, (sz[0] + sz[1]) / 2, phSW), 35 * DEG);
    b.build(rotor);
    const p = new Batch();
    p.add(latheZ([[0, -0.56], [0.21, -0.56], [0.21, sz[1] + 0.005], [0.3, sz[1] + 0.005], [0.3, sz[1] + 0.04], [0.27, sz[1] + 0.055], [0, sz[1] + 0.055]], 24), steelPol);
    p.build(object);
    const ratio = TR.minuteWheel.teeth / KW.settingWheel.teeth;
    add({
      id: 'setting-wheel', name: 'Setting wheel', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [0.9, 0.5, sz[1]],
      description: 'The link between the keyless works and the motion works. It is always in mesh with the minute wheel; when the crown is pulled out the sliding pinion engages it, and turning the crown then sets the hands.',
      facts: { Teeth: String(KW.settingWheel.teeth), Meshes: `minute wheel (${TR.minuteWheel.teeth})`, Speed: '1 turn / 75 min while running' },
      update: (s) => { rotor.rotation.z = -ratio * s.rot.minuteWheel; },
    });
  }

  // ---------- setting lever, yoke, springs (dial side, in the keyless recess)
  const KZ = [-0.33, -0.19];
  const S = [9.0, 2.7], Q = [10.1, SY], Bk = [9.75, -0.95], TL = [8.15, 3.3];
  const Y = [8.0, -2.7], Fk = [6.85, -1.0], Ft = [6.85, 1.0], Ty = [9.45, -1.25];
  const frontScrew = (bt, p, slot) => bt.add(screwGeo(0.36, 0.13, 0.09, 0.045), steelPol, screwMtx(p[0], p[1], KZ[1], slot, 1));
  {
    const sdf = sUnion(0.22, sdCircle(S[0], S[1], 0.55), sdCapsule(S, Q, 0.3, 0.27), sdCapsule(Q, Bk, 0.25, 0.2), sdCapsule(S, TL, 0.28, 0.22), sdCircle(Q[0], Q[1], 0.33));
    const object = new THREE.Group(); object.position.set(S[0], S[1], 0); root.add(object);
    const b = new Batch();
    b.add(sdfExtrude(sdf, [7.5, -1.6, 10.8, 3.9], S, KZ[0], KZ[1] - KZ[0], { h: 0.02, bevel: 0.03, planarUV, uvAngle: Math.atan2(Q[1] - S[1], Q[0] - S[0]) }), satPair, null, BEVEL_CREASE);
    // pin down into the stem groove (groove floor r 0.31, stem r 0.45)
    const pz0 = SZ + 0.35;
    b.add(latheZ([[0, pz0], [0.09, pz0], [0.12, pz0 + 0.04], [0.12, KZ[0] + 0.01], [0, KZ[0] + 0.01]], 20), steelPol, mtx(Q[0] - S[0], Q[1] - S[1], 0));
    frontScrew(b, [0, 0], 35);
    b.build(object);
    add({
      id: 'setting-lever', name: 'Setting lever', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [(Q[0] - S[0]) * 0.5, (Q[1] - S[1]) * 0.5, KZ[1]],
      description: 'A pivoting lever whose pin sits in the groove of the winding stem. Pulling the crown swings it, and its beak pushes the yoke over, switching the keyless works from winding to hand-setting (and stopping the seconds).',
      facts: { Pivot: 'setting-lever screw', Positions: '2 (held by the jumper)' },
    });
  }
  {
    const sdf = sUnion(0.22, sdCircle(Y[0], Y[1], 0.5), sdCapsule(Y, Fk, 0.32, 0.24), sdCapsule(Fk, Ft, 0.16, 0.16), sdCapsule(Y, Ty, 0.25, 0.2));
    const object = new THREE.Group(); object.position.set(Y[0], Y[1], 0); root.add(object);
    const b = new Batch();
    b.add(sdfExtrude(sdf, [6.3, -3.4, 10.0, 1.4], Y, KZ[0], KZ[1] - KZ[0], { h: 0.02, bevel: 0.03, planarUV, uvAngle: Math.atan2(Fk[1] - Y[1], Fk[0] - Y[0]) }), satPair, null, BEVEL_CREASE);
    // fork fingers hanging down into the sliding-pinion groove
    const fz0 = SZ - 0.3, fz1 = KZ[0] + 0.02;
    for (const dy of [-0.61, 0.61]) { // in the groove (r 0.5 … 0.62) on both sides of the pinion
      const finger = new THREE.BoxGeometry(0.2, 0.17, fz1 - fz0);
      b.add(finger, steelPol, mtx(Fk[0] - Y[0], SY + dy - Y[1], (fz0 + fz1) / 2));
    }
    frontScrew(b, [0, 0], 120);
    b.build(object);
    add({
      id: 'yoke', name: 'Yoke', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [(Fk[0] - Y[0]) * 0.5, (Fk[1] - Y[1]) * 0.5, KZ[1]],
      description: 'A forked lever whose fingers sit in the groove of the sliding pinion. It shifts the sliding pinion between the winding pinion (winding) and the setting wheel (hand-setting).',
      facts: { Pivot: 'yoke screw', Spring: 'yoke spring' },
    });
  }
  {
    // yoke spring (presses the yoke's tail) + setting-lever jumper
    const tailDir = [(Ty[0] - Y[0]) / Math.hypot(Ty[0] - Y[0], Ty[1] - Y[1]), (Ty[1] - Y[1]) / Math.hypot(Ty[0] - Y[0], Ty[1] - Y[1])];
    const cTail = [Y[0] + 1.2 * tailDir[0] + 0.23 * tailDir[1], Y[1] + 1.2 * tailDir[1] - 0.23 * tailDir[0]];
    const nose1 = [cTail[0] + 0.15 * tailDir[1], cTail[1] - 0.15 * tailDir[0]];
    const f1 = [9.85, -4.25];
    const yokeSpring = sUnion(0.15, sdBlade(f1, [10.25, -2.75], nose1, 0.16, 0.12), sdCircle(nose1[0], nose1[1], 0.15), sdCircle(f1[0], f1[1], 0.4));
    // jumper: fixed at the edge above the setting lever, its nose on the lever's tail
    const f2 = [9.95, 3.5], nose2 = [TL[0] + 0.02, TL[1] + 0.22 + 0.15];
    const jumper = sUnion(0.15, sdBlade(f2, [9.0, 4.02], nose2, 0.15, 0.11), sdCircle(nose2[0], nose2[1], 0.16), sdCircle(f2[0], f2[1], 0.4));
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const zS = [KZ[0], KZ[0] + 0.12];
    b.add(sdfExtrude(yokeSpring, [8.4, -5.0, 10.8, -1.4], [0, 0], zS[0], zS[1] - zS[0], { h: 0.018, bevel: 0.025, planarUV, uvAngle: 1.2 }), [steelPol, steelPol], null, BEVEL_CREASE);
    b.add(sdfExtrude(jumper, [7.4, 2.9, 10.6, 4.6], [0, 0], zS[0], zS[1] - zS[0], { h: 0.018, bevel: 0.025, planarUV, uvAngle: 0.2 }), [steelPol, steelPol], null, BEVEL_CREASE);
    b.add(screwGeo(0.33, 0.12, 0.085, 0.045), steelPol, screwMtx(f1[0], f1[1], zS[1], 70, 1));
    b.add(screwGeo(0.33, 0.12, 0.085, 0.045), steelPol, screwMtx(f2[0], f2[1], zS[1], 20, 1));
    b.build(object);
    add({
      id: 'keyless-springs', name: 'Keyless springs', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [nose1[0], nose1[1] - 0.6, zS[1]],
      description: 'Two flat steel springs: the yoke spring keeps the sliding pinion engaged with the winding pinion, and the setting-lever jumper holds the setting lever – and so the crown – firmly in the winding or the setting position.',
      facts: { Parts: 'yoke spring, setting-lever jumper', Material: 'hardened spring steel' },
    });
  }
}
