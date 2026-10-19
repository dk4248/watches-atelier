// GOING TRAIN, MOTION WORKS, DATE WORKS and POWER-RESERVE WORKS of the 9R65 (builder B3,
// plan.md §B3): barrel (+ mainspring, arbor, cover), centre/3rd/4th/5th/6th wheels, cannon
// pinion, minute wheel, hour wheel, date driving wheel, date jumper, calendar plate, PR
// differential and the dial-side PR train (output pinion, intermediate, display wheel).
// Positions SPEC.layout, teeth SPEC.train, modules SPEC.modules, levels SPEC.z, motion
// state.rot / SPEC.rotations. The keyless chain is B4's (automatic.js).
//
// Looks (teardown photos mov_naked_32/33/35/43): the going-train wheels are gilt with a fine
// STRAIGHT brushing (not circular graining); the centre, 3rd and 4th wheels are solid discs
// with 4 round lightening holes, the 5th and 6th have 3 curved spokes; pinions polished steel;
// the barrel is a steel drum with a circular-grained, stepped lid; motion works, date works and
// the PR differential are nickel-plated steel.
//
// Meshing: every pair interleaves through gear.meshPhase (gsPhases below). Cross-builder
// line SPEC.meshes ['minuteWheel', 'settingIntermediate', …]: the cannon pinion keeps phase 0
// and the minute wheel's 42 teeth take meshPhase(centre → minute wheel, 14, 42, 0) — B4's
// setting intermediate is phased from that same value (plan §4).
//
// The geometry/material helpers are exported for parts/springdrive.js (same owner).
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const V2 = (x, y) => new THREE.Vector2(x, y);
// Bevelled extrusions: the first bevel facet is 22.5° off the face, so creasing must stay
// below that or the flat faces get shaded like domes.
export const BEVEL_CREASE = 12 * DEG;

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

// Smooth normals across faces meeting at less than `angle`, hard edges elsewhere
// (toCreasedNormals hashes positions at 0.01 units — too coarse for 0.05 mm teeth — so the
// geometry is scaled up while it runs).
export function crease(g, angle = 40 * DEG) {
  g.scale(100, 100, 100);
  const r = toCreasedNormals(g, angle);
  r.scale(0.01, 0.01, 0.01);
  return r;
}

// Collects geometries per material and merges them into one mesh per material.
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

export const mtx = (x = 0, y = 0, z = 0, rz = 0) => new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z);

export function discUV(g, R, cx = 0, cy = 0) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) - cx) / (2 * R) + 0.5; uv[2 * i + 1] = (p.getY(i) - cy) / (2 * R) + 0.5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Planar UVs in mm: U runs along (cos a, sin a); `scale` tiles per mm.
export function uvPlanar(g, scale, a = 0, ox = 0, oy = 0) {
  const p = g.attributes.position;
  const c = Math.cos(a), s = Math.sin(a);
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox, y = p.getY(i) + oy;
    uv[2 * i] = (x * c + y * s) * scale; uv[2 * i + 1] = (-x * s + y * c) * scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Surface of revolution about Z. `profile` = [[r, z], …] traversed with the solid on the
// left (outer walls upwards). Split at sharp corners so shoulders stay crisp.
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
// hollow cylinder (tube) r0..r1 from z0 to z1, with small chamfers on the outer edges
export function tubeZ(r0, r1, z0, z1, segs = 40, ch = 0.015) {
  const c = Math.min(ch, (r1 - r0) / 3, (z1 - z0) / 3);
  return latheZ([[r0, z0], [r1 - c, z0], [r1, z0 + c], [r1, z1 - c], [r1 - c, z1], [r0, z1], [r0, z0]], segs);
}

// ---------------------------------------------------------------- 2-D signed distances
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
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const sUnion = (k, ...fs) => (x, y) => { let d = fs[0](x, y); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y), k); return d; };
// quadratic Bézier blade with tapering half-width
export function sdBlade(p0, c, p2, w0, w1, n = 20) {
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

// Marching squares on the zero level set → closed loops of Vector2 (inside = negative).
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
      p = V2(x0 + (i + a / (a - b)) * h, y0 + j * h);
    } else {
      const k = id - H, i = k % nx, j = (k - i) / nx, a = f[k], b = f[k + nx];
      p = V2(x0 + i * h, y0 + (j + a / (a - b)) * h);
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

// SDF outline → THREE.Shape (largest loop outer, the others holes), local to `origin`.
export function sdfShape(sdf, box, origin = [0, 0], h = 0.012, tol = 0.0012) {
  const loops = contours(sdf, box[0], box[1], box[2], box[3], h).map((l) => simplifyLoop(l, tol));
  loops.sort((a, b) => Math.abs(loopArea(b)) - Math.abs(loopArea(a)));
  const toLocal = (l) => l.map((p) => V2(p.x - origin[0], p.y - origin[1]));
  const shape = new THREE.Shape(toLocal(loops[0]));
  for (let i = 1; i < loops.length; i++) shape.holes.push(new THREE.Path(toLocal(loops[i])));
  return shape;
}
// Shape → bevelled extrusion between z0 and z0 + T. Groups: 0 faces, 1 sides + bevel.
export function extrudeShape(shape, z0, T, bevel = 0.025, curveSegments = 4) {
  const bt = Math.min(bevel, T * 0.25);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: T - 2 * bt, bevelEnabled: bevel > 0, bevelThickness: bt, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments,
  });
  geo.translate(0, 0, z0 + bt);
  return geo;
}
export function sdfExtrude(sdf, box, origin, z0, T, { h = 0.012, bevel = 0.025 } = {}) {
  return extrudeShape(sdfShape(sdf, box, origin, h), z0, T, bevel);
}

// Windows between (optionally curved) spokes of a wheel, as hole loops: the metal is the rim
// (r > rimIn), the hub (r < hubR) and n spokes whose centre lines bend by `curve` rad from hub
// to rim, smoothly blended (fillet radius ≈ `fillet`).
const windowCache = new Map();
export function spokeWindows({ rimIn, hubR, n = 3, w0 = 0.3, w1 = 0.22, curve = 0, fillet = 0.12, phase = 0, h = 0.012 }) {
  const key = [rimIn, hubR, n, w0, w1, curve, fillet, phase, h].join('|');
  if (windowCache.has(key)) return windowCache.get(key);
  const segs = [];
  const N = curve ? 12 : 1;
  for (let j = 0; j < n; j++) {
    const a0 = phase + (j * TAU) / n;
    const pt = (s) => {
      const r = hubR * 0.6 + (rimIn + 0.12 - hubR * 0.6) * s;
      const a = a0 + curve * (s - 0.5); // a gentle sweep from hub to rim
      return [r * Math.cos(a), r * Math.sin(a)];
    };
    let prev = pt(0);
    for (let i = 1; i <= N; i++) {
      const p = pt(i / N);
      const s0 = (i - 1) / N, s1 = i / N;
      segs.push(sdCapsule(prev, p, (w0 + (w1 - w0) * s0) / 2, (w0 + (w1 - w0) * s1) / 2));
      prev = p;
    }
  }
  const sdf = (x, y) => {
    const r = Math.hypot(x, y);
    const dRimHub = Math.min(rimIn - r, r - hubR);
    let ds = Infinity;
    for (const f of segs) { const v = f(x, y); if (v < ds) ds = v; }
    return smin(dRimHub, ds, fillet);
  };
  const B = rimIn + 0.08;
  const loops = contours(sdf, -B, -B, B, B, h).map((l) => simplifyLoop(l, 0.0012)).filter((l) => Math.abs(loopArea(l)) > 0.01);
  windowCache.set(key, loops);
  return loops;
}

// A watch wheel: toothed rim with round lightening holes, spoke windows or neither.
// Centred on z = 0; groups 0 = faces, 1 = sides. UVs: 'disc' (normalised, circular grain
// centred) or 'brushed' (planar mm, straight grain along uvAngle).
const wheelCache = new Map();
export function wheelGeo(gear, o) {
  const key = JSON.stringify(o);
  if (wheelCache.has(key)) return wheelCache.get(key);
  const { teeth, module: m, thickness: T, holes = null, spokes = null, bore = 0, uv = 'disc', uvAngle = 0, uvScale = 1 / 3.2 } = o;
  const outline = gear.toothedOutline({ teeth, module: m });
  const rr = (m * teeth) / 2 - 1.6 * m;
  const paths = [];
  if (holes) for (let i = 0; i < holes.n; i++) { const a = (holes.phase || 0) + (i * TAU) / holes.n; paths.push(gear.circlePath(holes.rad, 44, holes.r * Math.cos(a), holes.r * Math.sin(a))); }
  if (spokes) for (const l of spokeWindows({ ...spokes, rimIn: rr - spokes.rimW })) paths.push(new THREE.Path(l));
  if (bore) paths.push(gear.circlePath(bore, 36));
  const g = gear.extrudeOutline(outline, paths, T);
  if (uv === 'brushed') uvPlanar(g, uvScale, uvAngle);
  wheelCache.set(key, g);
  return g;
}
// pinion leaves with an optional bore, centred on z = 0
const pinionCache = new Map();
export function pinionGeo(gear, leaves, m, length, bore = 0) {
  const key = `${leaves}|${m}|${length}|${bore}`;
  if (!pinionCache.has(key)) pinionCache.set(key, gear.extrudeOutline(gear.pinionOutline({ leaves, module: m }), bore ? [gear.circlePath(bore, 32)] : null, length));
  return pinionCache.get(key);
}

// Slotted (or cross-slotted) cheese-head screw, head base at z = 0, top at +h.
const screwCache = new Map();
export function screwGeo(r, h, slotW, slotD, cross = false) {
  const key = `${r}|${h}|${slotW}|${slotD}|${cross}`;
  if (screwCache.has(key)) return screwCache.get(key);
  const dome = Math.min(0.02, h * 0.2);
  const base = latheZ([[0, 0], [r, 0], [r, h - slotD - 0.004], [r - 0.02, h - slotD], [0, h - slotD]], 40, r);
  const parts = [stdAttrs(base)];
  const n = cross ? 4 : 2;
  const a0 = Math.asin(Math.min(0.99, slotW / 2 / r));
  for (let q = 0; q < n; q++) {
    const span = TAU / n;
    const s0 = q * span + a0 + (cross ? Math.PI / 4 : 0) - (cross ? 0 : 0), s1 = (q + 1) * span - a0 + (cross ? Math.PI / 4 : 0);
    const pts = [];
    if (cross) {
      // quadrant between two slots: corner near the centre at the slot edges
      const c = (s0 + s1) / 2;
      pts.push(V2((slotW / 2) * Math.SQRT2 * Math.cos(c), (slotW / 2) * Math.SQRT2 * Math.sin(c)));
    }
    for (let k = 0; k <= 16; k++) { const a = s0 + ((s1 - s0) * k) / 16; pts.push(V2((r - 0.01) * Math.cos(a), (r - 0.01) * Math.sin(a))); }
    const bt = Math.min(0.012, slotD / 3);
    const piece = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
      depth: slotD - 2 * bt - dome * 0.5, bevelEnabled: true, bevelThickness: bt, bevelSize: 0.015, bevelOffset: -0.015, bevelSegments: 2, curveSegments: 4,
    });
    piece.translate(0, 0, h - slotD + bt);
    parts.push(stdAttrs(nonIndexed(piece)));
  }
  const g = mergeGeometries(parts, false);
  discUV(g, r);
  screwCache.set(key, g);
  return g;
}
// facing +z (front) or −z (back), slot at slotDeg (dial frame)
export function screwMtx(x, y, zBase, slotDeg, facing) {
  if (facing > 0) return mtx(x, y, zBase, slotDeg * DEG);
  return new THREE.Matrix4().makeTranslation(x, y, zBase).multiply(new THREE.Matrix4().makeRotationX(Math.PI)).multiply(new THREE.Matrix4().makeRotationZ(-slotDeg * DEG));
}

// Fine straight brushing: a tileable normal map whose height varies across v only, so the
// grain runs along u.
export function brushedNormalMap(seed0 = 917, rows = 256) {
  const W = 64, H = rows;
  let seed = seed0;
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

// ===================================================================== materials
// One set per material library (shared by train.js and springdrive.js); clones only — the
// shared library instances are never mutated.
const matCache = new WeakMap();
export function gsMaterials(M, spec) {
  if (matCache.has(M)) return matCache.get(M);
  const C = spec.frame.colours, RC = spec.regulator.colours;
  const brushed = brushedNormalMap(917);
  const strip = (m) => { m.normalMap = null; m.roughnessMap = null; m.anisotropyMap = null; m.anisotropy = 0; return m; };
  const x = {};
  // gilt train wheels: straight brushing (photos n32/n43), polished gilt flanks
  x.gilt = M.wheelGilt.clone();
  x.gilt.color.set(C.gilt); x.gilt.roughness = 0.3; x.gilt.roughnessMap = null; x.gilt.anisotropyMap = null;
  x.gilt.normalMap = brushed; x.gilt.normalScale = new THREE.Vector2(0.2, 0.2); x.gilt.anisotropy = 0.55; x.gilt.anisotropyRotation = 0;
  x.gilt.name = 'gsGiltBrushed';
  x.giltEdge = strip(M.wheelGilt.clone()); x.giltEdge.color.set(0xe4c78f); x.giltEdge.roughness = 0.17; x.giltEdge.name = 'gsGiltEdge';
  // glide disc: circular grain (rotationally symmetric, so it never strobes at 8 rev/s)
  x.giltRound = M.wheelGilt.clone(); x.giltRound.color.set(C.gilt); x.giltRound.roughness = 0.28; x.giltRound.name = 'gsGiltRound';
  x.steel = M.steelPinion; // pinions, arbors
  x.steelPol = M.steelPolished;
  // nickel-plated steel wheels (dial side, PR differential): fine circular grain
  x.nickel = M.wheelRhodium.clone(); x.nickel.color.set(0xc4c8cd); x.nickel.roughness = 0.3; x.nickel.name = 'gsNickelWheel';
  x.nickelEdge = strip(M.wheelRhodium.clone()); x.nickelEdge.color.set(0xd6d9dd); x.nickelEdge.roughness = 0.14; x.nickelEdge.name = 'gsNickelEdge';
  // barrel: steel drum, circular-grained lid (n35)
  x.barrel = M.wheelRhodium.clone(); x.barrel.color.set(0xa9aeb5); x.barrel.roughness = 0.42; x.barrel.anisotropy = 0.35;
  x.barrel.normalScale = new THREE.Vector2(0.2, 0.2); x.barrel.name = 'gsBarrel';
  x.barrelEdge = strip(M.wheelRhodium.clone()); x.barrelEdge.color.set(0xb9bec4); x.barrelEdge.roughness = 0.18; x.barrelEdge.name = 'gsBarrelEdge';
  x.spring = M.steelDark.clone(); x.spring.color.set(0x9ca2aa); x.spring.roughness = 0.22; x.spring.name = 'gsMainspring';
  // calendar plate and levers: straight-brushed nickel
  x.plate = M.steelSatin.clone(); x.plate.color.set(0xd2d5d8); x.plate.roughness = 0.34; x.plate.anisotropy = 0.45;
  x.plate.normalMap = brushed; x.plate.normalScale = new THREE.Vector2(0.3, 0.3); x.plate.name = 'gsCalendarPlate';
  // Spring Drive parts
  x.copper = new THREE.MeshPhysicalMaterial({ color: C.copper, metalness: 1, roughness: 0.34, anisotropy: 0.85, anisotropyRotation: 0, name: 'gsCopper' });
  x.core = new THREE.MeshPhysicalMaterial({ color: RC.core, metalness: 0.85, roughness: 0.42, name: 'gsCore' });
  x.magnet = new THREE.MeshPhysicalMaterial({ color: RC.magnet, metalness: 0.35, roughness: 0.62, name: 'gsMagnet' });
  x.gold = new THREE.MeshPhysicalMaterial({ color: C.pcbTrace, metalness: 1, roughness: 0.26, name: 'gsGoldPad' });
  x.flex = new THREE.MeshPhysicalMaterial({ color: RC.flex, metalness: 0.1, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, name: 'gsFlexLead' });
  x.stiffener = new THREE.MeshPhysicalMaterial({ color: C.stiffener, metalness: 1, roughness: 0.38, name: 'gsStiffener' });
  x.die = new THREE.MeshPhysicalMaterial({ color: 0xb4bbc4, metalness: 1, roughness: 0.05, name: 'gsDie' });
  x.dieSide = new THREE.MeshPhysicalMaterial({ color: 0x3d4148, metalness: 0.5, roughness: 0.4, name: 'gsDieSide' });
  x.ceramic = new THREE.MeshPhysicalMaterial({ color: 0x62666c, metalness: 0, roughness: 0.55, name: 'gsCeramic' });
  x.tin = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.3, name: 'gsTin' });
  x.insulation = new THREE.MeshPhysicalMaterial({ color: 0xe8e5dc, metalness: 0, roughness: 0.55, name: 'gsBobbin' });
  matCache.set(M, x);
  return x;
}

// ===================================================================== mesh phases
// Local rotations (rad) that make every meshing pair interleave (gear.meshPhase: A keeps
// phase 0, B gets the offset; a gear that is B of one line and A of the next passes its own
// phase on — hour wheel → date driver).
export function gsPhases(spec, gear) {
  const L = spec.layout, T = spec.train, PR = spec.powerReserve;
  const ang = (a, b) => Math.atan2(L[b][1] - L[a][1], L[b][0] - L[a][0]);
  const mp = (a, b, za, zb, pa = 0) => gear.meshPhase(ang(a, b), za, zb, pa);
  // phase of A that makes B's mesh phase come out as pb
  const inv = (a, b, za, zb, pb = 0) => { const phi = ang(a, b); return phi - (zb / za) * (pb - phi - Math.PI + Math.PI / zb); };
  const P = {};
  P.centerPinion = mp('barrel', 'center', T.barrel.teeth, T.center.pinion);
  P.thirdPinion = mp('center', 'third', T.center.teeth, T.third.pinion);
  P.fourthPinion = mp('third', 'fourth', T.third.teeth, T.fourth.pinion);
  P.fifthPinion = mp('fourth', 'fifth', T.fourth.teeth, T.fifth.pinion);
  P.sixthPinion = mp('fifth', 'sixth', T.fifth.teeth, T.sixth.pinion);
  P.glidePinion = mp('sixth', 'glide', T.sixth.teeth, T.glide.pinion);
  // plan §4 seam: the minute wheel takes its phase from the cannon mesh (cannon at 0); B4's
  // setting intermediate uses phaseA = this value (automatic.js phMW)
  P.cannon = 0;
  P.minuteWheel = mp('center', 'minuteWheel', T.cannon.teeth, T.minuteWheel.teeth, 0);
  P.minutePinion = 0;
  void inv;
  P.hourWheel = mp('minuteWheel', 'center', T.minuteWheel.pinion, T.hourWheel.teeth, 0);
  P.dateDriver = mp('center', 'dateDriver', T.hourWheel.teeth, T.dateDriver.teeth, P.hourWheel);
  const D = PR.differential;
  P.prA = mp('prB', 'prA', D.b.teeth, D.a.leaves);
  P.prC = mp('prB', 'prC', D.b.teeth, D.c.leaves);
  P.prIntermediate = mp('prB', 'prIntermediate', D.outputPinion, PR.intermediate.teeth);
  P.prDisplay = mp('prIntermediate', 'prDisplay', PR.intermediate.pinion, PR.display.teeth);
  return P;
}

// ===================================================================== the builder

export function buildTrain(ctx) {
  const { spec, M, reg, root, gear, lite } = ctx;
  if (lite) return; // the watch box shows the dial side only
  const Z = spec.z, L = spec.layout, TR = spec.train, MD = spec.modules, RO = spec.rotations, PRS = spec.powerReserve;
  const X = gsMaterials(M, spec);
  const PH = gsPhases(spec, gear);
  const fmt = (v, d = 1) => v.toFixed(d);
  const degOf = (v) => ((((v * 180) / Math.PI) % 360) + 360) % 360;
  const giltPair = [X.gilt, X.giltEdge];
  const pinPair = [X.steel, X.steelPol];
  const nickelPair = [X.nickel, X.nickelEdge];
  const barrelPair = [X.barrel, X.barrelEdge];
  const mid = (r) => (r[0] + r[1]) / 2;
  const len = (r) => r[1] - r[0];

  function assembly(pos, z = 0) {
    const object = new THREE.Group();
    object.position.set(pos[0], pos[1], z);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    return { object, rotor };
  }
  function add(def) {
    return reg.add({ ...def, explode: spec.explode[def.id] ?? [0, 0, 0], explodeDelay: spec.explodeDelay(def.id) });
  }
  // plain arbor with a pivot at each end (z0 < z1), radius r, pivots pr long pl
  const arbor = (z0, z1, r, pr = r * 0.5, pl = 0.12) => latheZ([
    [0, z0], [pr, z0], [pr, z0 + pl], [r, z0 + pl + 0.04], [r, z1 - pl - 0.04], [pr, z1 - pl], [pr, z1], [0, z1],
  ], 20);
  // polished collet (riveting boss) as a hollow ring from z0 to z1
  const collet = (r0, r1, z0, z1) => tubeZ(r0, r1, z0, z1, 36, 0.02);

  // ===================================================================== BARREL
  const BZ = { drum: Z.barrel, teeth: Z.barrelTeeth, lid: Z.barrelLid, spring: Z.mainspring };
  const MV = spec.movement.barrel; // drumOuter 6.95, drumInner 6.70, arborCore 2.2
  const mB = MD.barrel;
  const barrelTip = (mB * (TR.barrel.teeth + 2.6)) / 2;
  const floorZ = [BZ.spring[1], BZ.teeth[1]]; // drum floor between the spring and the dial-side face
  const HOLE = 0.7; // drum floor / lid arbor holes (check.mjs footprints)
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    // toothed band round the dial-side end; its bore lies inside the drum wall
    const band = gear.extrudeOutline(gear.toothedOutline({ teeth: TR.barrel.teeth, module: mB }), [gear.circlePath(MV.drumOuter - 0.1, 256)], len(BZ.teeth), { uvRadius: barrelTip });
    b.add(band, barrelPair, mtx(0, 0, mid(BZ.teeth)), 35 * DEG);
    const [d0] = BZ.drum, wi = MV.drumInner, wo = MV.drumOuter;
    b.add(latheZ([
      [wi, d0], [wo - 0.03, d0], [wo, d0 + 0.03], [wo, BZ.teeth[0]], [wo - 0.1, BZ.teeth[0]], [wo - 0.1, BZ.teeth[1]],
      [HOLE + 0.03, BZ.teeth[1]], [HOLE, BZ.teeth[1] - 0.03], [HOLE, floorZ[0]], [wi - 0.04, floorZ[0]], [wi, floorZ[0] - 0.04], [wi, d0],
    ], 160, wo), X.barrel);
    b.build(rotor);
    add({
      id: 'barrel', name: 'Mainspring barrel', category: 'power', side: 'back', exposed: false, priority: 1,
      object, rotor, drive: { key: 'barrel' }, anchor: [5.2, -3.4, BZ.drum[0]],
      description: 'The power store: a steel drum holding the mainspring. As the spring lets down it turns the drum once every 10 h 26 min, and the 146 teeth round its dial-side end drive the 14-leaf centre pinion and so the whole train down to the glide wheel.',
      facts: { Teeth: String(TR.barrel.teeth), 'Tip Ø': `${fmt(2 * barrelTip, 2)} mm`, Module: `${fmt(mB, 4)} mm`, Speed: '1 turn / 10 h 26 min', 'Power reserve': `${spec.powerReserveHours} h ≈ ${fmt(spec.barrelTurns, 1)} turns`, Drives: 'centre pinion (14), 10.43 : 1' },
      live: (s) => `${fmt(degOf(s.rot.barrel), 2)}° · 1 turn / 10.43 h · ${fmt(s.reserve * spec.powerReserveHours, 1)} h left`,
    });
  }
  // ---------- barrel cover (lid) with its concentric steps
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const [z0, z1] = BZ.lid, wi = MV.drumInner;
    b.add(latheZ([
      [HOLE + 0.02, z1], [HOLE + 0.02, z0 + 0.005], [HOLE + 0.06, z0], [1.62, z0], [1.65, z0 + 0.012], [4.86, z0 + 0.012], [4.89, z0],
      [wi - 0.05, z0], [wi - 0.01, z0 + 0.02], [wi - 0.01, z1], [HOLE + 0.02, z1],
    ], 160, wi), X.barrel);
    b.build(rotor);
    add({
      id: 'barrel-cover', name: 'Barrel cover', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'barrel' }, anchor: [-3.2, 2.6, z0],
      description: 'The lid snapped into the back of the barrel drum, closing the mainspring in. It turns with the drum; its circular graining shows in the teardown photos.',
      facts: { 'Ø': `${fmt(2 * (wi - 0.01), 2)} mm`, Thickness: `${fmt(len(BZ.lid), 2)} mm`, Turns: 'with the barrel drum' },
    });
  }
  // ---------- barrel arbor (turns only while winding: drive ratchet)
  {
    const { object, rotor } = assembly(L.barrel);
    const b = new Batch();
    const R0 = spec.movement.barrel.arborCore;
    const core = [BZ.spring[0] - 0.03, BZ.spring[1] - 0.02];
    const top = Z.ratchet[0] + 0.02; // square end inside B4's ratchet
    b.add(latheZ([
      [0, Z.ratchet[1] + 0.02], [0.6, Z.ratchet[1] + 0.02], [0.6, core[0] - 0.02], [R0 - 0.08, core[0]], [R0, core[0] + 0.06], [R0, core[1] - 0.06],
      [R0 - 0.08, core[1]], [0.6, core[1] + 0.02], [0.6, Z.mainPlate[0] - 0.02], [0.32, Z.mainPlate[0] + 0.02], [0.32, Z.mainPlate[0] + 0.28], [0, Z.mainPlate[0] + 0.28],
    ], 64, R0), X.steelPol);
    b.add(new THREE.BoxGeometry(0.8, 0.8, Z.ratchet[1] + 0.02 - top), X.steel, mtx(0, 0, (top + Z.ratchet[1] + 0.02) / 2, 0));
    // hook for the inner eye of the mainspring
    b.add(new THREE.BoxGeometry(0.32, 0.16, len(core) * 0.6), X.steel, mtx(R0 + 0.05, 0, mid(core), 0));
    b.build(rotor);
    add({
      id: 'barrel-arbor', name: 'Barrel arbor', category: 'power', side: 'back', exposed: false, priority: 3,
      object, rotor, drive: { key: 'ratchet' }, anchor: [0.6, 0, Z.bridges[0]],
      description: 'The steel axle through the barrel. The mainspring\'s inner end hooks onto its thick core, and its square end carries the ratchet wheel, so winding — by the rotor or the crown — turns the arbor and coils the spring tighter. It stands still while the watch just runs.',
      facts: { 'Core Ø': `${fmt(2 * R0, 1)} mm`, Top: 'square for the ratchet wheel', Turns: 'only while winding', 'Per crown turn': `${fmt((360 * spec.keyless.windingPinion.teeth) / spec.keyless.ratchet.teeth, 1)}°` },
      live: (s) => `${fmt(degOf(s.rot.ratchet), 1)}° wound in · ${fmt(s.reserve * 100, 0)} %`,
    });
  }
  // ---------- mainspring (geometry follows state.reserve)
  {
    const { object, rotor } = assembly(L.barrel);
    const ms = makeMainspring();
    const mesh = new THREE.Mesh(ms.geometry, X.spring);
    rotor.add(mesh);
    let last = -1, lastT = 0;
    ms.rebuild(0.92);
    const MS = spec.movement.mainspring;
    add({
      id: 'mainspring', name: 'Mainspring', category: 'power', side: 'back', exposed: false, priority: 2,
      object, rotor, drive: { key: 'barrel' }, anchor: [0, 4.2, mid(BZ.spring)],
      description: `A long ribbon of ${MS.alloy} alloy, the watch's only power source. Fully wound it hugs the arbor in about ${MS.coilsWound} tight coils; over 72 hours it lets down to about ${MS.coilsLetDown} coils against the drum wall, turning the barrel. When it is full a slipping bridle lets it slip inside the drum, so it cannot be over-wound.`,
      facts: { Alloy: MS.alloy, Height: `${fmt(MS.height, 2)} mm`, Thickness: `≈${fmt(MS.thickness, 2)} mm`, Coils: `≈${MS.coilsLetDown} (let down) – ${MS.coilsWound} (wound)`, Reserve: `${spec.powerReserveHours} h` },
      live: (s) => `${fmt(s.reserve * 100, 0)} % wound · ${fmt(MS.coilsLetDown + (MS.coilsWound - MS.coilsLetDown) * s.reserve, 1)} coils`,
      update: (s) => {
        const now = performance.now();
        if (Math.abs(s.reserve - last) > 0.003 && now - lastT > 60) { ms.rebuild(s.reserve); last = s.reserve; lastT = now; }
      },
    });
  }

  function makeMainspring() {
    const MS = spec.movement.mainspring;
    const NW = MS.coilsWound - 1, NL = MS.coilsLetDown - 1; // coils at the arbor (wound) / at the wall (let down)
    const SEG = 64, MAXT = Math.max(NW, NL) + 1.6, MAXP = Math.ceil(SEG * MAXT) + 2;
    const t = MS.thickness, pitch = t + 0.012;
    const r0 = spec.movement.barrel.arborCore + t / 2 + 0.03, R1 = MV.drumInner - t / 2 - 0.02;
    const zb = BZ.spring[0] + 0.005, zt = BZ.spring[1] - 0.005;
    const NV = MAXP * 8 + 8;
    const pos = new Float32Array(NV * 3), nor = new Float32Array(NV * 3);
    const cx = new Float32Array(MAXP), cy = new Float32Array(MAXP);
    const geometry = new THREE.BufferGeometry();
    const posA = new THREE.BufferAttribute(pos, 3), norA = new THREE.BufferAttribute(nor, 3);
    posA.setUsage(THREE.DynamicDrawUsage); norA.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posA);
    geometry.setAttribute('normal', norA);
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(NV * 2), 2));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, (zb + zt) / 2), MV.drumInner + 0.2);
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-MV.drumInner, -MV.drumInner, zb), new THREE.Vector3(MV.drumInner, MV.drumInner, zt));
    const V0 = MAXP * 8;
    const setV = (i, x, y, z, nx, ny, nz) => { pos[3 * i] = x; pos[3 * i + 1] = y; pos[3 * i + 2] = z; nor[3 * i] = nx; nor[3 * i + 1] = ny; nor[3 * i + 2] = nz; };
    let n = 0;
    function centreline(rho) {
      const Nin = NW * rho, Nout = NL * (1 - rho), NT = Nin + 1 + Nout;
      const ra = r0 + pitch * Nin, rb = R1 - pitch * Nout;
      n = Math.min(MAXP, Math.floor(NT * SEG) + 1);
      for (let i = 0; i < n; i++) {
        const tau = i === n - 1 ? NT : i / SEG;
        let r;
        if (tau <= Nin) r = r0 + pitch * tau;
        else if (tau <= Nin + 1) { const s = tau - Nin; r = ra + (rb - ra) * s * s * (3 - 2 * s); } else r = rb + pitch * (tau - Nin - 1);
        const th = 0.7 - TAU * tau; // coils run clockwise outwards (dial view): the drum turns CCW
        cx[i] = r * Math.cos(th); cy[i] = r * Math.sin(th);
      }
    }
    function write() {
      for (let i = 0; i < n; i++) {
        const a = i > 0 ? i - 1 : i, bb = i < n - 1 ? i + 1 : i;
        let tx = cx[bb] - cx[a], ty = cy[bb] - cy[a];
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
    // index buffer: winding per face chosen from a sample spiral so it agrees with the normals
    centreline(0.5); write();
    const tri = (a, bq, c) => {
      const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2];
      const ux = pos[3 * bq] - ax, uy = pos[3 * bq + 1] - ay, uz = pos[3 * bq + 2] - az;
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
  // Generic train arbor: wheel (gilt) + pinion (steel) + arbor + collets, one rotor.
  function trainWheel({ id, pos, wheel, pinion, arbor: arb, collets = [], drive, anchor, def }) {
    const { object, rotor } = assembly(pos);
    const b = new Batch();
    const wg = wheelGeo(gear, { ...wheel.geo, thickness: len(wheel.z), uv: 'brushed', uvAngle: wheel.uvAngle ?? 0.6 });
    b.add(wg, giltPair, mtx(0, 0, mid(wheel.z), wheel.phase ?? 0), 38 * DEG);
    b.add(pinionGeo(gear, pinion.leaves, pinion.module, len(pinion.z), pinion.bore ?? 0), pinPair, mtx(0, 0, mid(pinion.z), pinion.phase), 35 * DEG);
    b.add(arb, X.steelPol);
    for (const c of collets) b.add(c, X.steelPol);
    b.build(rotor);
    return add({ id, object, rotor, drive: { key: drive }, anchor, ...def });
  }
  const bridgeIn = Z.bridges[1]; // underside of the train bridge (upper pivots go in here)
  const plateBack = Z.mainPlate[0]; // back face of the main plate (lower pivots go in here)
  const holes4 = (r, rad, phase = Math.PI / 4) => ({ n: 4, r, rad, phase });
  const tipOf = (m, z) => (m * (z + 2.6)) / 2;

  // ---------- centre (2nd) wheel: hollow arbor, pinion on the back, wheel nearest the plate
  {
    const HS = spec.hands.centreStack;
    const tube = tubeZ(HS.centreTube[0], HS.centreTube[1], Z.centerPinion[0], Z.centreTubeTop, 32, 0.012);
    trainWheel({
      id: 'center-wheel', pos: L.center,
      wheel: { geo: { teeth: TR.center.teeth, module: MD.center, holes: holes4(1.85, 0.43), bore: HS.centreTube[0] }, z: Z.centerWheel, uvAngle: 0.7 },
      pinion: { leaves: TR.center.pinion, module: MD.barrel, z: Z.centerPinion, phase: PH.centerPinion, bore: HS.centreTube[0] },
      arbor: tube,
      collets: [collet(HS.centreTube[0], 0.45, Z.centerPinion[1], Z.centerWheel[0])],
      drive: 'center', anchor: [-2.3, -1.2, Z.centerWheel[0]],
      def: {
        name: 'Centre (2nd) wheel', category: 'train', side: 'back', exposed: false, priority: 1,
        description: 'The second wheel of the going train, driven by the barrel through its 14-leaf pinion. It turns exactly once an hour; its hollow arbor runs through the main plate to the dial side, where the cannon pinion riding on it carries the minute hand, while the seconds arbor passes straight through it.',
        facts: { Teeth: String(TR.center.teeth), Pinion: `${TR.center.pinion} leaves`, Module: `${fmt(MD.center, 4)} mm`, 'Tip Ø': `${fmt(2 * tipOf(MD.center, TR.center.teeth), 2)} mm`, Speed: '1 turn / hour', Carries: 'minute hand (via the cannon pinion)' },
        live: (s) => `${fmt(degOf(s.rot.center), 2)}° · 1 rev / 60 min`,
      },
    });
  }
  // ---------- third wheel: above the barrel, its pinion down at the centre-wheel level
  trainWheel({
    id: 'third-wheel', pos: L.third,
    wheel: { geo: { teeth: TR.third.teeth, module: MD.third, holes: holes4(1.95, 0.45, 0.2) }, z: Z.thirdWheel, uvAngle: -0.4 },
    pinion: { leaves: TR.third.pinion, module: MD.center, z: Z.thirdPinion, phase: PH.thirdPinion },
    arbor: arbor(bridgeIn - 0.16, plateBack + 0.15, 0.1, 0.055),
    collets: [collet(0.08, 0.32, Z.thirdWheel[1], Z.thirdWheel[1] + 0.05), collet(0.08, 0.27, Z.thirdWheel[0] - 0.04, Z.thirdWheel[0])],
    drive: 'third', anchor: [1.9, -1.4, Z.thirdWheel[0]],
    def: {
      name: 'Third wheel', category: 'train', side: 'back', exposed: false, priority: 2,
      description: 'Steps the speed up six times: driven by the centre wheel through its 14-leaf pinion, it turns once every 10 minutes and drives the fourth (seconds) wheel. It lies above the barrel, its pinion reaching down past the barrel teeth to the centre wheel.',
      facts: { Teeth: String(TR.third.teeth), Pinion: `${TR.third.pinion} leaves`, Module: `${fmt(MD.third, 4)} mm`, Speed: '1 turn / 10 min', Ratio: '6 : 1 from the centre wheel' },
      live: (s) => `${fmt(degOf(s.rot.third), 1)}° · 1 rev / 10 min (0.1 rpm)`,
    },
  });
  // ---------- fourth (seconds) wheel: on top at the centre, long arbor to the seconds hand
  trainWheel({
    id: 'fourth-wheel', pos: L.fourth,
    wheel: { geo: { teeth: TR.fourth.teeth, module: MD.fourth, holes: holes4(1.9, 0.44, 0.1) }, z: Z.fourthWheel, uvAngle: 1.1 },
    pinion: { leaves: TR.fourth.pinion, module: MD.third, z: Z.fourthPinion, phase: PH.fourthPinion },
    arbor: latheZ([
      [0, bridgeIn - 0.16], [0.055, bridgeIn - 0.16], [0.055, bridgeIn - 0.02], [0.1, bridgeIn + 0.02], [0.1, Z.secondsArborTop - 0.06],
      [0.085, Z.secondsArborTop - 0.03], [0.085, Z.secondsArborTop], [0, Z.secondsArborTop],
    ], 20),
    collets: [collet(0.08, 0.3, Z.fourthWheel[0] - 0.03, Z.fourthWheel[0])],
    drive: 'fourth', anchor: [2.2, 0.9, Z.fourthWheel[0]],
    def: {
      name: 'Fourth (seconds) wheel', category: 'train', side: 'back', exposed: false, priority: 1,
      description: 'Turns once a minute and carries the gliding central seconds hand: its long arbor runs through the hollow centre arbor and the cannon pinion to the dial. It lies on top of the third wheel and the barrel, and its 80 teeth drive the 10-leaf fifth pinion.',
      facts: { Teeth: String(TR.fourth.teeth), Pinion: `${TR.fourth.pinion} leaves`, Module: `${fmt(MD.fourth, 4)} mm`, Speed: '1 turn / minute (6° per second, gliding)', Carries: 'central seconds hand', Drives: 'fifth pinion, 8 : 1' },
      live: (s) => `${fmt(degOf(-s.rot.fourth), 1)}° · 1 rpm — the seconds hand`,
    },
  });
  // ---------- fifth wheel: three curved spokes, pinion up at the fourth wheel
  trainWheel({
    id: 'fifth-wheel', pos: L.fifth,
    wheel: { geo: { teeth: TR.fifth.teeth, module: MD.fifth, spokes: { n: 3, hubR: 0.45, rimW: 0.3, w0: 0.34, w1: 0.24, curve: 0.55, fillet: 0.14, phase: 0.3 } }, z: Z.fifthWheel, uvAngle: 0.2 },
    pinion: { leaves: TR.fifth.pinion, module: MD.fourth, z: Z.fifthPinion, phase: PH.fifthPinion },
    arbor: arbor(bridgeIn - 0.16, plateBack + 0.15, 0.1, 0.055),
    collets: [collet(0.08, 0.36, Z.fifthWheel[0] - 0.05, Z.fifthWheel[0]), collet(0.08, 0.3, Z.fifthWheel[1], Z.fifthWheel[1] + 0.03)],
    drive: 'fifth', anchor: [-1.6, 1.5, Z.fifthWheel[0]],
    def: {
      name: 'Fifth wheel', category: 'train', side: 'back', exposed: false, priority: 2,
      description: 'One of the two extra speed-up wheels a Spring Drive needs instead of an escape wheel: driven by the fourth wheel, it turns once every 7.5 seconds and drives the sixth wheel.',
      facts: { Teeth: String(TR.fifth.teeth), Pinion: `${TR.fifth.pinion} leaves`, Module: `${fmt(MD.fifth, 4)} mm`, Speed: '1 turn / 7.5 s (8 rpm)', Ratio: '8 : 1 from the fourth wheel' },
      live: (s) => `${fmt(degOf(s.rot.fifth), 0)}° · 8 rpm`,
    },
  });
  // ---------- sixth wheel: three curved spokes, gold Diashock on its upper pivot (B4)
  trainWheel({
    id: 'sixth-wheel', pos: L.sixth,
    wheel: { geo: { teeth: TR.sixth.teeth, module: MD.sixth, spokes: { n: 3, hubR: 0.42, rimW: 0.28, w0: 0.32, w1: 0.22, curve: 0.55, fillet: 0.13, phase: 1.1 } }, z: Z.sixthWheel, uvAngle: -0.9 },
    pinion: { leaves: TR.sixth.pinion, module: MD.fifth, z: Z.sixthPinion, phase: PH.sixthPinion },
    arbor: arbor(bridgeIn - 0.12, plateBack + 0.15, 0.08, 0.045),
    collets: [collet(0.07, 0.3, Z.sixthWheel[0] - 0.04, Z.sixthWheel[0])],
    drive: 'sixth', anchor: [1.6, -1.2, Z.sixthWheel[0]],
    def: {
      name: 'Sixth wheel', category: 'train', side: 'back', exposed: false, priority: 2,
      description: 'The last speed-up wheel: it turns exactly once a second and drives the 8-leaf pinion of the glide wheel, 8 times faster. Its fast, light arbor runs in a gold Diashock shock setting, visible through the window in the automatic bridge.',
      facts: { Teeth: String(TR.sixth.teeth), Pinion: `${TR.sixth.pinion} leaves`, Module: `${fmt(MD.sixth, 4)} mm`, Speed: '1 turn / second (60 rpm)', Drives: 'glide-wheel pinion, 8 : 1', 'Upper bearing': 'Diashock' },
      live: (s) => `${fmt(degOf(-s.rot.sixth), 0)}° · 60 rpm`,
    },
  });

  // ===================================================================== MOTION WORKS (dial side)
  const HS = spec.hands.centreStack;
  const MA = MD.motionA, MBm = MD.motionB;
  {
    // cannon pinion: 14 leaves at level 1, pipe for the minute hand
    const { object, rotor } = assembly(L.center);
    const b = new Batch();
    const lz = Z.cannonLeaves;
    b.add(pinionGeo(gear, TR.cannon.teeth, MA, len(lz), HS.cannonPipe[0]), pinPair, mtx(0, 0, mid(lz), PH.cannon), 35 * DEG);
    b.add(latheZ([[HS.cannonPipe[0], lz[1]], [HS.cannonPipe[1] + 0.06, lz[1]], [HS.cannonPipe[1] + 0.06, lz[1] + 0.06], [HS.cannonPipe[1], lz[1] + 0.09],
      [HS.cannonPipe[1], Z.cannonPipeTop - 0.03], [HS.cannonPipe[1] - 0.03, Z.cannonPipeTop], [HS.cannonPipe[0], Z.cannonPipeTop], [HS.cannonPipe[0], lz[1]]], 36), X.steelPol);
    b.build(rotor);
    add({
      id: 'cannon-pinion', name: 'Cannon pinion', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'cannon' }, anchor: [0.5, 0.2, lz[1]],
      description: 'A hollow pinion held by friction on the centre wheel\'s arbor; its pipe carries the minute hand. The friction lets the hands be set while the train stands still, and its 14 leaves drive the minute wheel.',
      facts: { Leaves: String(TR.cannon.teeth), Module: `${fmt(MA, 4)} mm`, Speed: '1 turn / hour', 'Pipe Ø': `${fmt(2 * HS.cannonPipe[1], 2)} mm` },
      live: (s) => `${fmt(degOf(-s.rot.cannon), 2)}° · 1 rev / 60 min`,
    });
  }
  {
    // minute wheel (42) + pinion (10) on a fixed stud
    const { object, rotor } = assembly(L.minuteWheel);
    const b = new Batch();
    const wz = Z.minuteWheel, pz = Z.minutePinion;
    b.add(wheelGeo(gear, { teeth: TR.minuteWheel.teeth, module: MA, thickness: len(wz), holes: holes4(1.2, 0.3, 0.3), bore: 0.27 }), nickelPair, mtx(0, 0, mid(wz), PH.minuteWheel), 38 * DEG);
    b.add(pinionGeo(gear, TR.minuteWheel.pinion, MBm, len(pz), 0.27), pinPair, mtx(0, 0, mid(pz), PH.minutePinion), 35 * DEG);
    b.add(tubeZ(0.27, 0.42, wz[1], pz[0], 32), X.steelPol);
    b.build(rotor);
    const s = new Batch();
    s.add(latheZ([[0, Z.motionRecessFloor - 0.05], [0.25, Z.motionRecessFloor - 0.05], [0.25, pz[1] + 0.01], [0.36, pz[1] + 0.01], [0.36, pz[1] + 0.07], [0.33, pz[1] + 0.09], [0, pz[1] + 0.09]], 28), X.steelPol);
    s.build(object);
    add({
      id: 'minute-wheel', name: 'Minute wheel', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'minuteWheel' }, anchor: [-1.0, 1.2, pz[1]],
      description: 'Part of the 12 : 1 reduction under the dial. Driven by the cannon pinion it turns once every 3 hours, and its 10-leaf pinion turns the hour wheel. The setting train stays in mesh with it, so turning the crown at the second click sets the hands.',
      facts: { Teeth: String(TR.minuteWheel.teeth), Pinion: `${TR.minuteWheel.pinion} leaves`, Speed: '1 turn / 3 h', Ratio: `(${TR.minuteWheel.teeth}/${TR.cannon.teeth}) × (${TR.hourWheel.teeth}/${TR.minuteWheel.pinion}) = 12` },
      live: (st) => `${fmt(degOf(st.rot.minuteWheel), 2)}° · 1 rev / 3 h`,
    });
  }
  {
    // hour wheel on the cannon pipe, pipe for the hour hand
    const { object, rotor } = assembly(L.center);
    const b = new Batch();
    const hz = Z.hourWheel;
    b.add(wheelGeo(gear, { teeth: TR.hourWheel.teeth, module: MBm, thickness: len(hz), holes: holes4(1.35, 0.32, 0.5), bore: HS.hourPipe[0] }), nickelPair, mtx(0, 0, mid(hz), PH.hourWheel), 38 * DEG);
    b.add(latheZ([[HS.hourPipe[0], hz[1] - 0.01], [0.82, hz[1] - 0.01], [0.82, hz[1] + 0.06], [HS.hourPipe[1] + 0.04, hz[1] + 0.1], [HS.hourPipe[1], hz[1] + 0.14],
      [HS.hourPipe[1], Z.hourPipeTop - 0.03], [HS.hourPipe[1] - 0.03, Z.hourPipeTop], [HS.hourPipe[0], Z.hourPipeTop], [HS.hourPipe[0], hz[1] - 0.01]], 40), X.nickelEdge);
    b.build(rotor);
    add({
      id: 'hour-wheel', name: 'Hour wheel', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'hourWheel' }, anchor: [1.6, 1.3, hz[1]],
      description: 'Rides loosely on the cannon pinion and carries the hour hand on its pipe. Driven by the minute pinion it turns once every 12 hours, and it also drives the date driving wheel, which therefore turns once a day.',
      facts: { Teeth: String(TR.hourWheel.teeth), Module: `${fmt(MBm, 3)} mm`, Speed: '1 turn / 12 h', Drives: `date driving wheel (${TR.dateDriver.teeth}), 2 : 1` },
      live: (s) => `${fmt(degOf(-s.rot.hourWheel), 2)}° · 1 rev / 12 h`,
    });
  }

  // ===================================================================== DATE WORKS (dial side)
  const DT = spec.date;
  {
    // date driving wheel (80, 24 h) with its finger up at the date-ring level
    const { object, rotor } = assembly(L.dateDriver);
    const b = new Batch();
    const dz = Z.dateDriver, F = DT.driver.finger;
    b.add(wheelGeo(gear, { teeth: TR.dateDriver.teeth, module: MBm, thickness: len(dz), spokes: { n: 5, hubR: 0.75, rimW: 0.32, w0: 0.36, w1: 0.28, curve: 0, fillet: 0.16, phase: 0.2 }, bore: 0.27 }), nickelPair, mtx(0, 0, mid(dz), PH.dateDriver), 38 * DEG);
    // spacer boss up to the finger
    b.add(tubeZ(0.27, 0.55, dz[1], F.z[0], 36), X.steelPol);
    const fa = F.angleAtMidnightDeg * DEG;
    const tip = [(F.reach - F.width / 2) * Math.cos(fa), (F.reach - F.width / 2) * Math.sin(fa)];
    const fsdf = sUnion(0.18, sdCircle(0, 0, 0.6), sdCapsule([0, 0], tip, 0.26, F.width / 2));
    const hole = sdCircle(0, 0, 0.27);
    const fg = sdfExtrude((x, y) => Math.max(fsdf(x, y), -hole(x, y)), [-1, -2.8, 2.6, 1], [0, 0], F.z[0], len(F.z), { bevel: 0.02 });
    uvPlanar(fg, 0.3, fa);
    b.add(fg, [X.plate, X.steelPol], null, BEVEL_CREASE);
    b.build(rotor);
    const s = new Batch(); // fixed stud: plate recess floor → under the calendar plate
    s.add(latheZ([[0, Z.motionRecessFloor - 0.05], [0.25, Z.motionRecessFloor - 0.05], [0.25, Z.calendarPlate[0] - 0.002], [0, Z.calendarPlate[0] - 0.002]], 24), X.steelPol);
    s.build(object);
    add({
      id: 'date-driving-wheel', name: 'Date driving wheel (24 h)', category: 'date', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'dateDriver' }, anchor: [1.6, 2.2, F.z[1]],
      description: 'Driven by the hour wheel, it turns once every 24 hours. From about half past ten in the evening its finger pushes a tooth of the date ring, and at midnight the date jumper snaps the ring over to the next date.',
      facts: { Teeth: String(TR.dateDriver.teeth), Speed: '1 turn / 24 h', Finger: `reach ${fmt(F.reach, 2)} mm`, 'Date change': 'at midnight (instantaneous jump)' },
      live: (s) => {
        const left = 86400 - ((((s.localSec % 86400) + 86400) % 86400));
        return `${fmt(degOf(s.rot.dateDriver), 1)}° · next date in ${Math.floor(left / 3600)} h ${String(Math.floor((left % 3600) / 60)).padStart(2, '0')} min`;
      },
    });
  }
  {
    // date jumper: a spring lever at the ring level; its beak sits in a gap of the ring's teeth
    const J = DT.jumper, rz = J.z;
    const P0 = J.pivot, B0 = J.beak;
    const ua = Math.atan2(B0[1], B0[0]); // radial direction at the beak
    const ur = [Math.cos(ua), Math.sin(ua)], ut = [-Math.sin(ua), Math.cos(ua)];
    const rootR = DT.ring.rootRadius, tipR = DT.ring.tipRadius;
    const noseR = tipR + 0.62 * (rootR - tipR); // into the tooth gap, short of the root
    const nose = [noseR * ur[0], noseR * ur[1]];
    const bw = 0.24;
    const beak = sdPolygon([[B0[0] - 0.18 * ur[0] + bw * ut[0], B0[1] - 0.18 * ur[1] + bw * ut[1]], nose, [B0[0] - 0.18 * ur[0] - bw * ut[0], B0[1] - 0.18 * ur[1] - bw * ut[1]]]);
    const armEnd = [B0[0] - 0.2 * ur[0], B0[1] - 0.2 * ur[1]];
    const pin = [4.05, 5.05]; // fixed pin the spring tail bears on (ESTIMATE)
    const springTail = sdBlade([P0[0] + 0.2, P0[1] - 0.32], [3.05, 5.55], [pin[0] - 0.1, pin[1] + 0.2], 0.075, 0.06);
    const sdf = sUnion(0.1, sdCircle(P0[0], P0[1], 0.4), sdCapsule(P0, armEnd, J.width / 2, J.width / 2 + 0.03), beak, springTail);
    const pivHole = sdCircle(P0[0], P0[1], 0.17);
    const object = new THREE.Group(); object.position.set(P0[0], P0[1], 0); root.add(object);
    const b = new Batch();
    const jg = sdfExtrude((x, y) => Math.max(sdf(x, y), -pivHole(x, y)), [1.9, 2.4, 8.4, 7.8], P0, rz[0], len(rz), { h: 0.01, bevel: 0.018 });
    uvPlanar(jg, 0.3, Math.atan2(B0[1] - P0[1], B0[0] - P0[0]));
    b.add(jg, [X.plate, X.steelPol], null, BEVEL_CREASE);
    // pivot stud and the spring's pin (fixed, plate → calendar plate)
    b.add(latheZ([[0, -0.1], [0.17, -0.1], [0.17, Z.calendarPlate[0] - 0.002], [0, Z.calendarPlate[0] - 0.002]], 20), X.steelPol);
    b.add(latheZ([[0, -0.1], [0.12, -0.1], [0.12, Z.calendarPlate[0] - 0.002], [0, Z.calendarPlate[0] - 0.002]], 16), X.steelPol, mtx(pin[0] - P0[0], pin[1] - P0[1], 0));
    b.build(object);
    add({
      id: 'date-jumper', name: 'Date jumper', category: 'date', side: 'front', exposed: false, priority: 3,
      object, anchor: [(B0[0] - P0[0]) * 0.55, (B0[1] - P0[1]) * 0.55, rz[1]],
      description: 'A spring lever whose beak rests between two teeth of the date ring and holds the date centred in its window. At midnight, once the driving finger has pushed a tooth past the beak\'s point, it snaps the ring on to the next date.',
      facts: { Engages: `date ring (${DT.ring.teeth} internal teeth)`, Spring: 'integral blade on a fixed pin', Material: 'hardened steel' },
    });
  }
  {
    // calendar plate (date-ring guard): disc R 8.3 with straight brushing, three cross-head screws
    const CP = DT.calendarPlate, cz = CP.z;
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const shape = new THREE.Shape();
    shape.absarc(0, 0, CP.radius, 0, TAU, false);
    const hp = new THREE.Path(); hp.absarc(0, 0, CP.centreHole, 0, TAU, true); shape.holes.push(hp);
    for (const h of CP.holes) { const p = new THREE.Path(); p.absarc(h.at[0], h.at[1], h.radius, 0, TAU, true); shape.holes.push(p); }
    const pg = extrudeShape(shape, cz[0], len(cz), 0.035, 96);
    uvPlanar(pg, 0.22, 0.12);
    b.add(pg, [X.plate, X.steelPol], null, BEVEL_CREASE);
    for (const [i, p] of CP.screws.entries()) {
      b.add(screwGeo(0.42, 0.06, 0.09, 0.035, true), X.steelPol, screwMtx(p[0], p[1], cz[1] - 0.045, 20 + 37 * i, 1));
      b.add(latheZ([[0.2, -0.05], [0.36, -0.05], [0.36, cz[0] - 0.002], [0.2, cz[0] - 0.002], [0.2, -0.05]], 24), X.steelPol, mtx(p[0], p[1], 0));
    }
    b.build(object);
    add({
      id: 'calendar-plate', name: 'Calendar plate (date-ring guard)', category: 'date', side: 'front', exposed: false, priority: 2, xray: true,
      object, anchor: [-4.2, 3.6, cz[1]],
      description: 'The thin brushed plate under the dial that holds the date ring and the calendar parts in place. The hour-wheel pipe and the power-reserve arbor pass through it; three small cross-head screws hold it to the main plate.',
      facts: { 'Ø': `${fmt(2 * CP.radius, 1)} mm`, Thickness: `${fmt(len(cz), 2)} mm`, Screws: '3, cross-head', Finish: 'straight brushing' },
    });
  }

  // ===================================================================== POWER-RESERVE WORKS
  const D = PRS.differential, mPD = MD.prDiff;
  {
    // back side, under the PR bridge: prA (8) ↔ prB (64, 3-arm carrier with planets) ↔ prC (13)
    const object = new THREE.Group(); root.add(object);
    const mkRotor = (p) => { const g = new THREE.Group(); g.position.set(p[0], p[1], 0); object.add(g); return g; };
    const rA = mkRotor(L.prA), rB = mkRotor(L.prB), rC = mkRotor(L.prC);
    const pz = D.z, wz = [pz[0], pz[1] - 0.04];
    // prB: fine 64-tooth wheel with a 3-spoke centre, its arbor through the plate to the dial side
    const b = new Batch();
    const rootB = (mPD * D.b.teeth) / 2 - 1.6 * mPD;
    b.add(wheelGeo(gear, { teeth: D.b.teeth, module: mPD, thickness: len(wz), spokes: { n: 3, hubR: 0.42, rimW: 0.3, w0: 0.3, w1: 0.24, curve: 0, fillet: 0.12, phase: Math.PI / 2 } }), nickelPair, mtx(0, 0, mid(wz)), 38 * DEG);
    b.add(latheZ([[0, bridgeIn - 0.14], [0.06, bridgeIn - 0.14], [0.06, bridgeIn - 0.02], [0.12, bridgeIn + 0.02], [0.12, Z.prOutputPinion[0]], [0, Z.prOutputPinion[0]]], 20), X.steelPol);
    b.add(collet(0.1, 0.3, wz[0] - 0.035, wz[0]), X.steelPol);
    // planets on the arms (they spin as winding and running differ) — pivots riveted in the arms
    const nP = 3, zs = 16, zp = 14, mpl = 0.062, dPl = (mpl * (zs + zp)) / 2;
    const plz = [wz[1] + 0.006, wz[1] + 0.07];
    const planets = [];
    for (let j = 0; j < nP; j++) {
      const a = Math.PI / 2 + (j * TAU) / nP;
      const g = new THREE.Group(); g.position.set(dPl * Math.cos(a), dPl * Math.sin(a), 0); rB.add(g);
      const pb = new Batch();
      pb.add(pinionGeo(gear, zp, mpl, len(plz)), pinPair, mtx(0, 0, mid(plz), 0), 35 * DEG);
      pb.build(g);
      const rv = new Batch();
      rv.add(latheZ([[0, wz[0] - 0.02], [0.07, wz[0] - 0.02], [0.08, wz[0] - 0.005], [0.08, plz[1]], [0, plz[1]]], 16), X.steelPol, mtx(dPl * Math.cos(a), dPl * Math.sin(a), 0));
      rv.build(rB);
      planets.push({ g, phase: gear.meshPhase(a, zs, zp, 0) });
    }
    b.build(rB);
    // sun pinion under the hub (winding input), a separate rotor coaxial with prB
    const rS = mkRotor(L.prB);
    const sb = new Batch();
    sb.add(pinionGeo(gear, zs, mpl, len(plz), 0.13), pinPair, mtx(0, 0, mid(plz), 0), 35 * DEG);
    sb.build(rS);
    // prA and prC: input pinions with their arbors down to the plate
    const pa = new Batch();
    pa.add(pinionGeo(gear, D.a.leaves, mPD, len(pz)), pinPair, mtx(0, 0, mid(pz), PH.prA), 35 * DEG);
    pa.add(arbor(bridgeIn - 0.14, plateBack + 0.14, 0.08, 0.05), X.steelPol);
    pa.add(collet(0.06, 0.22, pz[1], pz[1] + 0.04), X.steelPol);
    pa.build(rA);
    const pc = new Batch();
    pc.add(pinionGeo(gear, D.c.leaves, mPD, len(pz)), pinPair, mtx(0, 0, mid(pz), PH.prC), 35 * DEG);
    pc.add(arbor(bridgeIn - 0.14, plateBack + 0.14, 0.08, 0.05), X.steelPol);
    pc.add(collet(0.06, 0.26, pz[1], pz[1] + 0.04), X.steelPol);
    pc.build(rC);
    const KW_PL = 4; // planet turns per ratchet turn (display only)
    add({
      id: 'pr-differential', name: 'Power-reserve differential', category: 'power', side: 'back', exposed: true, priority: 2,
      object, anchor: [L.prB[0] + 1.2, L.prB[1] + 1.4, wz[0]],
      description: 'Compares how far the mainspring has been wound (the barrel arbor turning) with how far it has run down (the barrel drum turning). Its fine 64-tooth wheel carries the planet gears and turns with the difference — the state of wind — 3.2 turns from empty to full, and its arbor takes that through the plate to the power-reserve hand. Its toothed rim peeks out beside the small PR bridge through the case back.',
      facts: { Wheel: `${D.b.teeth} teeth, module ${fmt(mPD, 4)} mm`, 'Input pinions': `${D.a.leaves} and ${D.c.leaves} leaves`, Planets: `${nP} × ${zp} on a ${zs}-tooth sun`, 'Output': `${fmt(PRS.ratioHandToPrB, 0)} × the hand angle (3.2 turns / 72 h)`, Status: 'gearing ESTIMATE (only the jewels are measured)' },
      live: (s) => `${fmt(s.reserve * 100, 0)} % wound · wheel ${fmt(degOf(RO.prB(s)), 0)}°`,
      update: (s) => {
        const cB = RO.prB(s);
        rB.rotation.z = cB;
        rA.rotation.z = RO.prA(s);
        rC.rotation.z = RO.prC(s);
        const spin = KW_PL * s.rot.ratchet; // planets relative to the carrier
        for (let j = 0; j < nP; j++) planets[j].g.rotation.z = planets[j].phase + spin;
        rS.rotation.z = cB - (zp / zs) * spin; // sun: keeps every planet in mesh
      },
    });
  }
  {
    // dial side: output pinion (12) on prB's arbor at level 2
    const { object, rotor } = assembly(L.prB);
    const b = new Batch();
    const oz = Z.prOutputPinion, mo = MD.prDial1;
    b.add(pinionGeo(gear, D.outputPinion, mo, len(oz), 0.12), pinPair, mtx(0, 0, mid(oz), 0), 35 * DEG);
    b.add(latheZ([[0, oz[0]], [0.12, oz[0]], [0.12, oz[1] + 0.14], [0.08, oz[1] + 0.17], [0, oz[1] + 0.17]], 20), X.steelPol);
    b.build(rotor);
    add({
      id: 'pr-output-pinion', name: 'Power-reserve output pinion', category: 'power', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [0.9, 0.6, oz[1]],
      description: 'The 12-leaf pinion on the differential\'s arbor, on the dial side of the main plate. It hands the state of wind to the dial-side power-reserve train.',
      facts: { Leaves: String(D.outputPinion), Module: `${fmt(mo, 3)} mm`, Turns: '3.2 turns from empty to full' },
      update: (s) => { rotor.rotation.z = RO.prB(s); },
    });
  }
  {
    // dial side: intermediate wheel (36 at level 2) + pinion (10 at level 1)
    const { object, rotor } = assembly(L.prIntermediate);
    const b = new Batch();
    const wz = Z.prIntermediateWheel, pzz = Z.prIntermediatePinion;
    b.add(wheelGeo(gear, { teeth: PRS.intermediate.teeth, module: MD.prDial1, thickness: len(wz), spokes: { n: 4, hubR: 0.6, rimW: 0.32, w0: 0.36, w1: 0.28, curve: 0, fillet: 0.16, phase: 0.4 }, bore: 0.12 }), nickelPair, mtx(0, 0, mid(wz), PH.prIntermediate), 38 * DEG);
    b.add(pinionGeo(gear, PRS.intermediate.pinion, MD.prDial2, len(pzz), 0.12), pinPair, mtx(0, 0, mid(pzz), 0), 35 * DEG);
    b.add(tubeZ(0.1, 0.4, pzz[1], wz[0], 32), X.steelPol);
    b.add(arbor(Z.motionRecessFloor - 0.1, Z.calendarPlate[0] + 0.06, 0.12, 0.07, 0.1), X.steelPol);
    b.build(rotor);
    add({
      id: 'pr-intermediate-wheel', name: 'Power-reserve intermediate wheel', category: 'power', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [1.6, 1.8, wz[1]],
      description: 'Carries the state of wind from the output pinion across to the power-reserve display wheel under the hand at 7 o\'clock, slowing it down on the way.',
      facts: { Teeth: String(PRS.intermediate.teeth), Pinion: `${PRS.intermediate.pinion} leaves`, Ratio: `${PRS.intermediate.teeth}/${D.outputPinion} × ${PRS.display.teeth}/${PRS.intermediate.pinion} = ${fmt(PRS.ratioHandToPrB, 0)}` },
      update: (s) => { rotor.rotation.z = RO.prIntermediate(s); },
    });
  }
  {
    // dial side: display wheel (40) at level 1, arbor up through the dial to the PR hand
    const { object, rotor } = assembly(L.prDisplay);
    const b = new Batch();
    const wz = Z.prDisplayWheel;
    b.add(wheelGeo(gear, { teeth: PRS.display.teeth, module: MD.prDial2, thickness: len(wz), spokes: { n: 4, hubR: 0.62, rimW: 0.32, w0: 0.38, w1: 0.28, curve: 0, fillet: 0.16, phase: 0.1 } }), nickelPair, mtx(0, 0, mid(wz), PH.prDisplay), 38 * DEG);
    b.add(latheZ([[0, Z.motionRecessFloor - 0.12], [0.08, Z.motionRecessFloor - 0.12], [0.08, wz[0] - 0.02], [0.18, wz[0]], [0.18, Z.prDisplayArborTop - 0.05], [0.14, Z.prDisplayArborTop], [0, Z.prDisplayArborTop]], 24), X.steelPol);
    b.add(collet(0.16, 0.42, wz[1], wz[1] + 0.06), X.steelPol);
    b.build(rotor);
    add({
      id: 'pr-display-wheel', name: 'Power-reserve display wheel', category: 'power', side: 'front', exposed: false, priority: 2,
      object, rotor, anchor: [1.4, 2.4, wz[1]],
      description: `Carries the power-reserve hand at 7 o'clock. It turns ${PRS.sweepDeg}° in all: from FULL, pointing towards 9, the hand creeps clockwise to 12 as the 72 hours run down, and winding turns it back.`,
      facts: { Teeth: String(PRS.display.teeth), Module: `${fmt(MD.prDial2, 3)} mm`, Sweep: `${PRS.sweepDeg}° (FULL 263° · EMPTY 12)`, Rate: `${fmt(PRS.sweepDeg / spec.powerReserveHours, 2)}° per hour` },
      live: (s) => `${fmt(s.reserve * spec.powerReserveHours, 1)} h of ${spec.powerReserveHours} h · hand ${fmt((RO.prDisplay(s) * 180) / Math.PI, 1)}°`,
      update: (s) => { rotor.rotation.z = RO.prDisplay(s); },
    });
  }
}
