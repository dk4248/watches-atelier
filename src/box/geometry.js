import * as THREE from 'three';
import { DEG, TAU, clamp, smoothstep } from './util.js';
import { LEATHER_TILE_MM, SUEDE_TILE_MM } from './textures.js';

// Procedural geometry of the leather watch box. Units: millimetres.
// Box frame: X to the right, Y up, Z towards the front (the viewer). The box stands on
// its feet at y = 0; the base body starts at y = feet, the parting line is at y = rim.
// The lid pivots about the hinge axis (parallel to X) at the back of the rim.

// ---------------------------------------------------------------- layout

export function boxLayout(n = 4) {
  n = Math.max(1, n | 0);
  const T = 8; // wall thickness
  const cw = 65; // compartment width (X)
  const td = 8; // padded divider thickness
  const W = 2 * T + n * cw + (n - 1) * td; // 300 for four watches
  const D = 125;
  const Rc = 11; // plan corner radius
  const feet = 4, Hb = 56, Hl = 29;
  const rim = feet + Hb;
  // wrist-sized pillow (≈150 mm round), so a strap wraps it as it would a wrist
  const cushion = { len: 63, A: 26.5, B: 20.5, n: 2.15, p: 4.2, squeeze: 1.5 };
  const yTop = rim + 2.5; // top of an unsqueezed cushion (the pillows stand a little proud)
  const floorY = yTop - 2 * cushion.B;
  const zc = 3; // cushion centre, a little forward of the middle
  const slots = [];
  for (let i = 0; i < n; i++) slots.push({ x: -W / 2 + T + cw / 2 + i * (cw + td), z: zc });
  const dividers = [];
  for (let i = 0; i < n - 1; i++) dividers.push(-W / 2 + T + (i + 1) * cw + i * td + td / 2);
  const hingeR = 2.6;
  return {
    n, T, cw, td, W, D, Rc, feet, Hb, Hl, rim, top: rim + Hl,
    rb: 4, rt: 2.0, ri: 1.2, rTop: 9, topBulge: 2.0,
    lidTop: 6, ceilBulge: 3.4,
    cushion, yTop, floorY, divTop: rim - 5, slots, dividers,
    hinge: { r: hingeR, len: 34, y: rim, z: -D / 2 - hingeR, xs: [-(W / 2 - 62), W / 2 - 62] },
    clasp: { pinY: rim + 7, pinZ: D / 2 + 1.75, haspLen: 20 },
    openAngle: 103 * DEG,
  };
}

// ---------------------------------------------------------------- helpers

// Plan path: rounded rectangle in XZ starting at the middle of the front edge and
// running round towards +X. Each sample carries its outward normal, its arc length s
// (at offset 0) and the turning angle so far (the arc length at offset d is s + d·ang).
export function rrPath(hx, hz, R, segs = 10) {
  const pts = [];
  const ax = hx - R, az = hz - R;
  const corners = [[ax, az, 90, 0], [ax, -az, 0, -90], [-ax, -az, -90, -180], [-ax, az, 180, 90]];
  let s = 0, ang = 0, px = 0, pz = hz;
  pts.push({ x: 0, z: hz, nx: 0, nz: 1, s: 0, ang: 0 });
  for (const [cx, cz, a0, a1] of corners) {
    const c0 = Math.cos(a0 * DEG), s0 = Math.sin(a0 * DEG);
    const sx = cx + R * c0, sz = cz + R * s0;
    const len = Math.hypot(sx - px, sz - pz);
    if (len > 1e-9) { s += len; pts.push({ x: sx, z: sz, nx: c0, nz: s0, s, ang }); }
    const da = (Math.abs(a1 - a0) * DEG) / segs;
    for (let k = 1; k <= segs; k++) {
      const a = (a0 + ((a1 - a0) * k) / segs) * DEG;
      s += R * da;
      ang += da;
      pts.push({ x: cx + R * Math.cos(a), z: cz + R * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a), s, ang });
    }
    px = pts[pts.length - 1].x;
    pz = pts[pts.length - 1].z;
  }
  s += Math.hypot(px, hz - pz);
  pts.push({ x: 0, z: hz, nx: 0, nz: 1, s, ang });
  return pts;
}

// Point at arc length s on the rounded rectangle offset outwards by d (corner radius
// R + d ≥ 0). Same start / direction as rrPath. Writes into `o`.
function rrAt(hx, hz, R, d, s, o) {
  const ax = hx - R, az = hz - R, r = R + d;
  const q = (Math.PI / 2) * r;
  const segs = [
    ['l', 0, hz + d, ax, hz + d, 0, 1, ax],
    ['a', ax, az, 90, 0, q],
    ['l', hx + d, az, hx + d, -az, 1, 0, 2 * az],
    ['a', ax, -az, 0, -90, q],
    ['l', ax, -hz - d, -ax, -hz - d, 0, -1, 2 * ax],
    ['a', -ax, -az, -90, -180, q],
    ['l', -hx - d, -az, -hx - d, az, -1, 0, 2 * az],
    ['a', -ax, az, 180, 90, q],
    ['l', -ax, hz + d, 0, hz + d, 0, 1, ax],
  ];
  let total = 0;
  for (const sg of segs) total += sg[0] === 'l' ? sg[7] : sg[5];
  s = ((s % total) + total) % total;
  for (const sg of segs) {
    const L = sg[0] === 'l' ? sg[7] : sg[5];
    if (s <= L || sg === segs[segs.length - 1]) {
      const t = L > 0 ? s / L : 0;
      if (sg[0] === 'l') {
        o.x = sg[1] + (sg[3] - sg[1]) * t;
        o.z = sg[2] + (sg[4] - sg[2]) * t;
        o.nx = sg[5]; o.nz = sg[6];
      } else {
        const a = (sg[3] + (sg[4] - sg[3]) * t) * DEG;
        o.nx = Math.cos(a); o.nz = Math.sin(a);
        o.x = sg[1] + r * o.nx;
        o.z = sg[2] + r * o.nz;
      }
      // tangent: direction of travel (the outward normal turned −90° in XZ)
      o.tx = o.nz; o.tz = -o.nx;
      return o;
    }
    s -= L;
  }
  return o;
}
function rrLength(hx, hz, R, d) {
  return 4 * (hx - R) + 4 * (hz - R) + TAU * (R + d);
}

// Signed distance to a rounded rectangle (XZ).
function sdRR(x, z, hx, hz, R) {
  const qx = Math.abs(x) - (hx - R), qz = Math.abs(z) - (hz - R);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - R;
}

// Profile in the (d, y) plane: d = outward offset from the plan path. Each segment is
// a polyline with explicit normals; segments meet at crisp edges.
class Profile {
  constructor() { this.segs = []; this.v = 0; this.last = null; }
  add(pts) {
    const seg = [];
    for (const p of pts) {
      if (this.last) this.v += Math.hypot(p[0] - this.last[0], p[1] - this.last[1]);
      this.last = p;
      const l = Math.hypot(p[2], p[3]) || 1;
      seg.push({ d: p[0], y: p[1], nd: p[2] / l, ny: p[3] / l, v: this.v });
    }
    this.segs.push(seg);
    return this;
  }
  arc(cd, cy, r, a0, a1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + ((a1 - a0) * i) / n) * DEG;
      pts.push([cd + r * Math.cos(a), cy + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
    return this.add(pts);
  }
  line(d0, y0, d1, y1, nd, ny, n = 1) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([d0 + ((d1 - d0) * i) / n, y0 + ((y1 - y0) * i) / n, nd, ny]);
    return this.add(pts);
  }
}

// Make every triangle wind counter-clockwise around its vertex normals.
function ensureWinding(geo) {
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, idx = geo.index.array;
  let score = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    score += fx * (n[a] + n[b] + n[c]) + fy * (n[a + 1] + n[b + 1] + n[c + 1]) + fz * (n[a + 2] + n[b + 2] + n[c + 2]);
  }
  if (score < 0) flipIndex(geo);
  return geo;
}
function flipIndex(geo) {
  const idx = geo.index.array;
  for (let t = 0; t < idx.length; t += 3) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  geo.index.needsUpdate = true;
}

function makeGeo(pos, nor, uv, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (nor) g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx.length > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
  if (!nor) g.computeVertexNormals();
  return g;
}

// Average the normals of vertices that share a position (closes UV seams and poles).
export function weldNormals(geo, eps = 1e-3) {
  const p = geo.attributes.position.array, n = geo.attributes.normal.array;
  const map = new Map();
  const cnt = p.length / 3;
  const key = (i) => `${Math.round(p[i * 3] / eps)},${Math.round(p[i * 3 + 1] / eps)},${Math.round(p[i * 3 + 2] / eps)}`;
  for (let i = 0; i < cnt; i++) {
    const k = key(i);
    let e = map.get(k);
    if (!e) { e = [0, 0, 0, []]; map.set(k, e); }
    e[0] += n[i * 3]; e[1] += n[i * 3 + 1]; e[2] += n[i * 3 + 2];
    e[3].push(i);
  }
  for (const e of map.values()) {
    if (e[3].length < 2) continue;
    const l = Math.hypot(e[0], e[1], e[2]) || 1;
    for (const i of e[3]) { n[i * 3] = e[0] / l; n[i * 3 + 1] = e[1] / l; n[i * 3 + 2] = e[2] / l; }
  }
  geo.attributes.normal.needsUpdate = true;
  return geo;
}

// Merge geometries (indexed or not) with position / normal / uv into one indexed geometry.
export function mergeAll(list) {
  list = list.filter(Boolean);
  let nv = 0, ni = 0;
  for (const g of list) {
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array.subarray(0, c * 3), vo * 3);
    nor.set(g.attributes.normal.array.subarray(0, c * 3), vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, c * 2), vo * 2);
    if (g.index) {
      const a = g.index.array;
      for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo;
      io += a.length;
    } else {
      for (let i = 0; i < c; i++) idx[io + i] = vo + i;
      io += c;
    }
    vo += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  for (const g of list) g.dispose();
  return out;
}

function scaleUV(geo, k) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.array.length; i++) uv.array[i] *= k;
  uv.needsUpdate = true;
  return geo;
}

// ---------------------------------------------------------------- sweeps and fills

function sweepSeg(path, seg, tile) {
  const P = path.length, Q = seg.length;
  const pos = new Float32Array(P * Q * 3), nor = new Float32Array(P * Q * 3), uv = new Float32Array(P * Q * 2);
  let k = 0;
  for (let i = 0; i < P; i++) {
    const p = path[i];
    for (let j = 0; j < Q; j++, k++) {
      const q = seg[j];
      pos[k * 3] = p.x + p.nx * q.d;
      pos[k * 3 + 1] = q.y;
      pos[k * 3 + 2] = p.z + p.nz * q.d;
      const nx = p.nx * q.nd, ny = q.ny, nz = p.nz * q.nd;
      const l = Math.hypot(nx, ny, nz) || 1;
      nor[k * 3] = nx / l; nor[k * 3 + 1] = ny / l; nor[k * 3 + 2] = nz / l;
      uv[k * 2] = (p.s + q.d * p.ang) / tile;
      uv[k * 2 + 1] = q.v / tile;
    }
  }
  const idx = [];
  for (let i = 0; i < P - 1; i++) {
    for (let j = 0; j < Q - 1; j++) {
      const a = i * Q + j, b = (i + 1) * Q + j, c = (i + 1) * Q + j + 1, d = i * Q + j + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  return ensureWinding(makeGeo(pos, nor, uv, idx));
}
function sweep(path, prof, tile) {
  return mergeAll(prof.segs.map((s) => sweepSeg(path, s, tile)));
}

// Padded panel filling the inside of a path ring (offset d0, height y0): rings shrink
// towards the centre and rise by `bulge·(1 − f^power)` along ±Y (dir).
function fillPanel(path, d0, y0, { bulge = 0, dir = 1, rings = 12, power = 4, tile, faceDir = 1 }) {
  const ring = path.slice(0, -1);
  const M = ring.length;
  const fr = [];
  for (let r = 0; r < rings; r++) fr.push(1 - (r / rings) ** 1.3);
  const nv = rings * M + 1;
  const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  let k = 0;
  for (let r = 0; r < rings; r++) {
    const f = fr[r];
    const y = y0 + dir * bulge * (1 - f ** power);
    for (let m = 0; m < M; m++, k++) {
      const x = (ring[m].x + ring[m].nx * d0) * f, z = (ring[m].z + ring[m].nz * d0) * f;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      uv[k * 2] = x / tile; uv[k * 2 + 1] = z / tile;
    }
  }
  pos[k * 3] = 0; pos[k * 3 + 1] = y0 + dir * bulge; pos[k * 3 + 2] = 0;
  uv[k * 2] = 0; uv[k * 2 + 1] = 0;
  const idx = [];
  for (let r = 0; r < rings - 1; r++) {
    for (let m = 0; m < M; m++) {
      const m1 = (m + 1) % M;
      const a = r * M + m, b = r * M + m1, c = (r + 1) * M + m1, d = (r + 1) * M + m;
      idx.push(a, b, d, b, c, d);
    }
  }
  const last = (rings - 1) * M;
  for (let m = 0; m < M; m++) idx.push(last + m, last + ((m + 1) % M), k);
  const g = makeGeo(pos, null, uv, idx);
  // orient so the panel faces faceDir (±Y)
  const n = g.attributes.normal.array;
  let sy = 0;
  for (let i = 1; i < n.length; i += 3) sy += n[i];
  if (sy * faceDir < 0) { flipIndex(g); g.computeVertexNormals(); }
  return g;
}

// Height of a fillPanel at (x, z): finds the ring scale f through the point.
function panelHeight(x, z, hxB, hzB, RB, y0, bulge, dir, power) {
  let lo = 0, hi = 1.0001;
  for (let i = 0; i < 26; i++) {
    const f = (lo + hi) / 2;
    if (sdRR(x, z, hxB * f, hzB * f, RB * f) <= 0) hi = f; else lo = f;
  }
  const f = Math.min(1, hi);
  return y0 + dir * bulge * (1 - f ** power);
}

// ---------------------------------------------------------------- stitches
// Saddle stitches: short, slanted, slightly flattened capsules half sunk into the
// leather. `frames` = [{ px,py,pz, tx,ty,tz, nx,ny,nz }] (position, seam direction,
// surface normal). Returns one merged geometry.
export function stitchGeometry(frames, { len = 2.1, r = 0.4, slant = 24 * DEG, sink = 0.35, flat = 0.72, radial = 6, cap = 1 } = {}) {
  const tpl = new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), cap, radial);
  const tp = tpl.attributes.position.array, tn = tpl.attributes.normal.array, tu = tpl.attributes.uv.array;
  const ti = tpl.index ? tpl.index.array : null;
  const V = tp.length / 3;
  const I = ti ? ti.length : V;
  const N = frames.length;
  const pos = new Float32Array(N * V * 3), nor = new Float32Array(N * V * 3), uv = new Float32Array(N * V * 2);
  const idx = N * V > 65535 ? new Uint32Array(N * I) : new Uint16Array(N * I);
  const cs = Math.cos(slant), sn = Math.sin(slant);
  for (let f = 0; f < N; f++) {
    const F = frames[f];
    // b = n × t (in the surface, across the seam)
    const bx = F.ny * F.tz - F.nz * F.ty, by = F.nz * F.tx - F.nx * F.tz, bz = F.nx * F.ty - F.ny * F.tx;
    // long axis a = t·cos + b·sin ; third axis c = a × n
    const ax = F.tx * cs + bx * sn, ay = F.ty * cs + by * sn, az = F.tz * cs + bz * sn;
    const cx = ay * F.nz - az * F.ny, cy = az * F.nx - ax * F.nz, cz = ax * F.ny - ay * F.nx;
    const ox = F.px + F.nx * (r * flat - sink * r), oy = F.py + F.ny * (r * flat - sink * r), oz = F.pz + F.nz * (r * flat - sink * r);
    const vo = f * V;
    for (let v = 0; v < V; v++) {
      // template: long axis = Y, cross axes X (→ c) and Z (→ n, flattened)
      const lx = tp[v * 3], ly = tp[v * 3 + 1], lz = tp[v * 3 + 2] * flat;
      const o = (vo + v) * 3;
      pos[o] = ox + cx * lx + ax * ly + F.nx * lz;
      pos[o + 1] = oy + cy * lx + ay * ly + F.ny * lz;
      pos[o + 2] = oz + cz * lx + az * ly + F.nz * lz;
      const mx = tn[v * 3], my = tn[v * 3 + 1], mz = tn[v * 3 + 2] / flat;
      let nx = cx * mx + ax * my + F.nx * mz, ny = cy * mx + ay * my + F.ny * mz, nz = cz * mx + az * my + F.nz * mz;
      const l = Math.hypot(nx, ny, nz) || 1;
      nor[o] = nx / l; nor[o + 1] = ny / l; nor[o + 2] = nz / l;
      uv[(vo + v) * 2] = tu[v * 2]; uv[(vo + v) * 2 + 1] = tu[v * 2 + 1];
    }
    const io = f * I;
    if (ti) for (let i = 0; i < I; i++) idx[io + i] = ti[i] + vo;
    else for (let i = 0; i < I; i++) idx[io + i] = vo + i;
  }
  tpl.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

// Stitch frames for a horizontal seam round the box wall (offset d, height y).
function wallSeamFrames(L, d, y, pitch, frames) {
  const hx = L.W / 2, hz = L.D / 2, R = L.Rc;
  const total = rrLength(hx, hz, R, d);
  const n = Math.round(total / pitch);
  const o = {};
  for (let i = 0; i < n; i++) {
    rrAt(hx, hz, R, d, (i / n) * total, o);
    frames.push({ px: o.x, py: y, pz: o.z, tx: o.tx, ty: 0, tz: o.tz, nx: o.nx, ny: 0, nz: o.nz });
  }
  return frames;
}

// ---------------------------------------------------------------- cushion
// A plump suede pillow: a superellipsoid with flattish ends (exponent p) and an oval,
// slightly squarish section (exponent n), pinched by `squeeze` mm where the strap of
// width `waist` wraps round it. Long axis = X, centred on the origin.
const cushionCache = new Map();
export function cushionGeometry(c, waist = 0) {
  const key = `${c.len}|${c.A}|${c.B}|${c.n}|${c.p}|${c.squeeze}|${waist.toFixed(1)}`;
  if (cushionCache.has(key)) return cushionCache.get(key);
  const NU = 44, NV = 64;
  const pos = new Float32Array((NU + 1) * (NV + 1) * 3), uv = new Float32Array((NU + 1) * (NV + 1) * 2);
  const sgnPow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  let k = 0;
  for (let iu = 0; iu <= NU; iu++) {
    const u = (iu / NU) * Math.PI;
    const x = (c.len / 2) * sgnPow(Math.cos(u), 2 / c.p);
    const s = Math.abs(Math.sin(u)) ** (2 / c.p);
    const w = waist > 0 ? smoothstep(waist / 2 + 4, waist / 2 - 0.5, Math.abs(x)) : 0;
    const sz = 1 - (c.squeeze * w) / c.A, sy = 1 - (c.squeeze * w) / c.B;
    // the ends are pressed flat against the dividers, the middle swells a touch
    const swell = 1 + 0.025 * Math.cos((x / (c.len / 2)) * Math.PI * 0.5);
    for (let iv = 0; iv <= NV; iv++, k++) {
      const v = -Math.PI / 2 + (iv / NV) * TAU; // seam underneath
      const z = c.A * sgnPow(Math.cos(v), 2 / c.n) * s * sz * swell;
      const y = c.B * sgnPow(Math.sin(v), 2 / c.n) * s * sy * swell;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      uv[k * 2] = ((iv / NV) * 2 * (c.A + c.B) * 1.6) / SUEDE_TILE_MM;
      uv[k * 2 + 1] = x / SUEDE_TILE_MM;
    }
  }
  // baked occlusion: the underside, the ends pressed against the dividers and the
  // waist under the strap sit in shadow — gives the soft suede its form
  const col = new Float32Array((NU + 1) * (NV + 1) * 3);
  for (let i = 0; i < (NU + 1) * (NV + 1); i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1];
    const up = clamp(y / c.B, -1, 1);
    let ao = 0.66 + 0.34 * smoothstep(-1.0, 0.75, up);
    ao *= 1 - 0.2 * smoothstep(c.len / 2 - 9, c.len / 2, Math.abs(x));
    if (waist > 0) ao *= 1 - 0.12 * smoothstep(waist / 2 + 4, waist / 2, Math.abs(x)) * smoothstep(0.2, -0.6, up);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
  }
  const idx = [];
  for (let iu = 0; iu < NU; iu++) {
    for (let iv = 0; iv < NV; iv++) {
      const a = iu * (NV + 1) + iv, b = (iu + 1) * (NV + 1) + iv, cc = b + 1, d = a + 1;
      idx.push(a, b, d, b, cc, d);
    }
  }
  const g = makeGeo(pos, null, uv, idx);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // outward: the centre is the origin
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  let sc = 0;
  for (let i = 0; i < p.length; i += 3) sc += p[i] * n[i] + p[i + 1] * n[i + 1] + p[i + 2] * n[i + 2];
  if (sc < 0) { flipIndex(g); g.computeVertexNormals(); }
  weldNormals(g);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  cushionCache.set(key, g);
  return g;
}
export function disposeCushions() {
  for (const g of cushionCache.values()) g.dispose();
}

// Outline of the (squeezed) cushion section in the (z, y) plane, CCW, closed polygon.
export function cushionOutline(c, squeezed = true, n = 160) {
  const A = c.A - (squeezed ? c.squeeze : 0), B = c.B - (squeezed ? c.squeeze : 0);
  const sw = 1 + 0.025; // matches the swell at x = 0
  const sgnPow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = (i / n) * TAU;
    out.push([A * sw * sgnPow(Math.cos(v), 2 / c.n), B * sw * sgnPow(Math.sin(v), 2 / c.n)]);
  }
  return out;
}
export function cushionTopY(c) {
  return (c.B - c.squeeze) * 1.025;
}

// ---------------------------------------------------------------- hardware helpers

function rrShape(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function rrHole(w, h, r, cx, cy) {
  const s = new THREE.Path();
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x0 + r, y0);
  s.absarc(x0 + r, y0 + r, r, Math.PI * 1.5, Math.PI, true);
  s.lineTo(x0, y1 - r);
  s.absarc(x0 + r, y1 - r, r, Math.PI, Math.PI / 2, true);
  s.lineTo(x1 - r, y1);
  s.absarc(x1 - r, y1 - r, r, Math.PI / 2, 0, true);
  s.lineTo(x1, y0 + r);
  s.absarc(x1 - r, y0 + r, r, 0, -Math.PI / 2, true);
  return s;
}
// Bevelled plate in the XY plane, back face at z = 0, front at z = depth.
function plate(shape, depth, bevel = 0.3, curveSegments = 8) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.05, depth - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelOffset: -bevel, bevelSegments: 2, curveSegments,
  });
  g.translate(0, 0, bevel);
  return g;
}
function cylX(r, len, x, y, z, seg = 20) {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
// Domed screw head / cap: base ring radius r at y = 0, apex at y = h (outward normals).
function dome(r, h, seg = 12) {
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(1e-4, r * Math.cos(a)), h * Math.sin(a)));
  }
  return new THREE.LatheGeometry(pts, seg);
}

// ---------------------------------------------------------------- the box

// Build every mesh of the box. `mats` = { leather, paint, suede, thread, brass }.
// Returns { group (whole box, origin on the floor under the centre), lid (pivot group),
// hasp (pivot group), interior meshes …, bounds }.
export function buildBox(L, mats) {
  const group = new THREE.Group();
  group.name = 'watch-box';
  const hx = L.W / 2, hz = L.D / 2;
  const path = rrPath(hx, hz, L.Rc, 12);
  const LT = LEATHER_TILE_MM, ST = SUEDE_TILE_MM;

  // ------------------------------------------------ base
  const baseLeather = [], basePaint = [], baseSuede = [], baseBrass = [], baseFrames = [];
  {
    const pr = new Profile();
    pr.line(-(L.Rc - 1), L.feet, -L.rb, L.feet, 0, -1, 2);
    pr.arc(-L.rb, L.feet + L.rb, L.rb, -90, 0, 6);
    pr.line(0, L.feet + L.rb, 0, L.rim - L.rt, 1, 0, 3);
    baseLeather.push(sweep(path, pr, LT));
    // bottom panel
    baseLeather.push(fillPanel(path, -(L.Rc - 1), L.feet, { tile: LT, faceDir: -1, rings: 4 }));

    const pp = new Profile();
    pp.arc(-L.rt, L.rim - L.rt, L.rt, 0, 90, 5);
    pp.line(-L.rt, L.rim, -L.T + L.ri, L.rim, 0, 1, 1);
    pp.arc(-L.T + L.ri, L.rim - L.ri, L.ri, 90, 180, 4);
    basePaint.push(sweep(path, pp, LT));

    const ps = new Profile();
    ps.line(-L.T, L.rim - L.ri, -L.T, L.floorY - 0.5, -1, 0, 2);
    baseSuede.push(sweep(path, ps, ST));

    // floor
    const fl = new THREE.ShapeGeometry(rrShape(L.W - 2 * L.T + 0.4, L.D - 2 * L.T + 0.4, Math.max(0.5, L.Rc - L.T)), 4);
    fl.rotateX(-Math.PI / 2);
    fl.translate(0, L.floorY, 0);
    baseSuede.push(scaleUV(fl, 1 / ST));

    // padded dividers, rounded on top
    for (const x of L.dividers) {
      const w = L.td / 2;
      const s = new THREE.Shape();
      const y0 = L.floorY - 0.5, y1 = L.divTop;
      s.moveTo(-w, y0);
      s.lineTo(w, y0);
      s.bezierCurveTo(w * 1.08, y0 + (y1 - y0) * 0.4, w * 1.06, y1 - w * 1.4, w, y1 - w);
      s.absarc(0, y1 - w, w, 0, Math.PI, false);
      s.bezierCurveTo(-w * 1.06, y1 - w * 1.4, -w * 1.08, y0 + (y1 - y0) * 0.4, -w, y0);
      const depth = L.D - 2 * L.T + 0.6;
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
      g.translate(x, 0, -depth / 2);
      baseSuede.push(scaleUV(g, 1 / ST));
    }

    // stitching under the rim and above the bottom edge
    wallSeamFrames(L, 0.02, L.rim - 4.2, 2.86, baseFrames);
    wallSeamFrames(L, 0.02, L.feet + L.rb + 2.6, 2.86, baseFrames);

    // feet
    const foot = new THREE.LatheGeometry([
      [0, 0], [3.0, 0.05], [4.6, 0.55], [5.5, 1.6], [5.6, 2.6], [5.0, 3.5], [3.8, L.feet + 0.3], [0, L.feet + 0.3],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 28);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const g = foot.clone();
      g.translate(sx * (hx - 20), 0, sz * (hz - 17));
      baseBrass.push(g);
    }
    foot.dispose();

    // hinge knuckles fixed to the base (1st, 3rd, 5th) + leaves + screws
    const H = L.hinge;
    const kl = (H.len - 4 * 0.35) / 5;
    for (const x0 of H.xs) {
      for (let k = 0; k < 5; k += 2) {
        const cx = x0 - H.len / 2 + kl / 2 + k * (kl + 0.35);
        baseBrass.push(cylX(H.r, kl, cx, H.y, H.z));
      }
      const leaf = plate(rrShape(H.len, 9.5, 1.2, 0, 0), 0.9, 0.25, 4);
      leaf.rotateY(Math.PI); // front face towards −Z
      leaf.translate(x0, H.y - 5.4, -hz);
      baseBrass.push(leaf);
      for (const dx of [-11, 0, 11]) {
        const sc = dome(1.0, 0.45);
        sc.rotateX(-Math.PI / 2);
        sc.translate(x0 + dx, H.y - 6.2, -hz - 0.9);
        baseBrass.push(sc);
      }
    }
    // clasp catch plate + knob on the front of the base
    const cp = plate(rrShape(24, 15, 2.2, 0, 0), 1.1, 0.3, 6);
    cp.translate(0, L.rim - 9.0, hz);
    baseBrass.push(cp);
    const knobY = L.rim - 8.6;
    baseBrass.push(new THREE.CylinderGeometry(1.35, 1.35, 2.4, 18).rotateX(Math.PI / 2).translate(0, knobY, hz + 1.1 + 1.2));
    const head = dome(2.1, 1.1, 20);
    head.rotateX(Math.PI / 2);
    head.translate(0, knobY, hz + 3.3);
    baseBrass.push(head);
    for (const dx of [-8.5, 8.5]) {
      const sc = dome(0.95, 0.4);
      sc.rotateX(Math.PI / 2);
      sc.translate(dx, L.rim - 9.0, hz + 1.1);
      baseBrass.push(sc);
    }
  }
  const base = new THREE.Group();
  base.name = 'base';
  group.add(base);
  const mk = (parent, geo, mat, cast = true, receive = true, name = '') => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = receive;
    m.name = name;
    parent.add(m);
    return m;
  };
  mk(base, mergeAll(baseLeather), mats.leather, true, true, 'base-leather');
  mk(base, mergeAll(basePaint), mats.paint, true, true, 'base-edge');
  const interior = mk(base, mergeAll(baseSuede), mats.suede, true, true, 'base-lining');
  mk(base, stitchGeometry(baseFrames), mats.thread, false, true, 'base-stitches');
  mk(base, mergeAll(baseBrass), mats.brass, true, true, 'base-brass');

  // ------------------------------------------------ lid (built closed, in box coords,
  // then moved so the hinge axis is its origin)
  const lid = new THREE.Group();
  lid.name = 'lid';
  const pivot = new THREE.Vector3(0, L.hinge.y, L.hinge.z);
  lid.position.copy(pivot);
  group.add(lid);
  const lidLeather = [], lidPaint = [], lidSuede = [], lidBrass = [], lidFrames = [];
  const y0 = L.rim;
  const ceilY = y0 + L.Hl - L.lidTop;
  {
    const ps = new Profile();
    ps.line(-L.T, ceilY + 0.3, -L.T, y0 + L.ri, -1, 0, 2);
    lidSuede.push(sweep(path, ps, ST));

    const pp = new Profile();
    pp.arc(-L.T + L.ri, y0 + L.ri, L.ri, 180, 270, 4);
    pp.line(-L.T + L.ri, y0, -L.rt, y0, 0, -1, 1);
    pp.arc(-L.rt, y0 + L.rt, L.rt, 270, 360, 5);
    lidPaint.push(sweep(path, pp, LT));

    const pl = new Profile();
    pl.line(0, y0 + L.rt, 0, y0 + L.Hl - L.rTop, 1, 0, 3);
    pl.arc(-L.rTop, y0 + L.Hl - L.rTop, L.rTop, 0, 90, 12);
    lidLeather.push(sweep(path, pl, LT));
    lidLeather.push(fillPanel(path, -L.rTop, y0 + L.Hl, { bulge: L.topBulge, dir: 1, rings: 14, power: 5, tile: LT, faceDir: 1 }));

    // padded suede ceiling with a leather piping round it
    lidSuede.push(fillPanel(path, -L.T, ceilY, { bulge: L.ceilBulge, dir: -1, rings: 12, power: 5, tile: ST, faceDir: -1 }));
    const rp = 1.3;
    const pip = new Profile();
    pip.arc(-L.T + rp * 0.9, ceilY - rp * 0.55, rp, -100, 200, 12);
    lidLeather.push(sweep(path, pip, LT));

    // stitching: round the lid just above the parting line, and round the padded top
    wallSeamFrames(L, 0.02, y0 + 4.2, 2.86, lidFrames);
    {
      const inset = 4.6;
      const hxB = hx - L.rTop, hzB = hz - L.rTop, RB = Math.max(0.01, L.Rc - L.rTop);
      const sx = hxB - inset, sz = hzB - inset, sR = Math.max(1.2, RB);
      const total = rrLength(sx, sz, sR, 0);
      const n = Math.round(total / 2.86);
      const o = {};
      const hAt = (x, z) => panelHeight(x, z, hxB, hzB, RB, y0 + L.Hl, L.topBulge, 1, 5);
      for (let i = 0; i < n; i++) {
        rrAt(sx, sz, sR, 0, (i / n) * total, o);
        const yy = hAt(o.x, o.z);
        const e = 0.4;
        const gx = (hAt(o.x + e, o.z) - hAt(o.x - e, o.z)) / (2 * e);
        const gz = (hAt(o.x, o.z + e) - hAt(o.x, o.z - e)) / (2 * e);
        const l = Math.hypot(gx, 1, gz);
        lidFrames.push({ px: o.x, py: yy, pz: o.z, tx: o.tx, ty: gx * o.tx + gz * o.tz, tz: o.tz, nx: -gx / l, ny: 1 / l, nz: -gz / l });
      }
    }

    // hinge knuckles on the lid (2nd, 4th) + leaves + screws
    const H = L.hinge;
    const kl = (H.len - 4 * 0.35) / 5;
    for (const x0 of H.xs) {
      for (let k = 1; k < 5; k += 2) {
        const cx = x0 - H.len / 2 + kl / 2 + k * (kl + 0.35);
        lidBrass.push(cylX(H.r, kl, cx, H.y, H.z));
      }
      // pin caps
      for (const sx of [-1, 1]) {
        const cap = dome(H.r * 0.7, 0.6, 16);
        cap.rotateZ(-sx * Math.PI / 2);
        cap.translate(x0 + sx * H.len / 2, H.y, H.z);
        lidBrass.push(cap);
      }
      const leaf = plate(rrShape(H.len, 9.5, 1.2, 0, 0), 0.9, 0.25, 4);
      leaf.rotateY(Math.PI);
      leaf.translate(x0, H.y + 5.4, -hz);
      lidBrass.push(leaf);
      for (const dx of [-11, 0, 11]) {
        const sc = dome(1.0, 0.45);
        sc.rotateX(-Math.PI / 2);
        sc.translate(x0 + dx, H.y + 6.2, -hz - 0.9);
        lidBrass.push(sc);
      }
    }
    // clasp mount on the lid front: plate + two knuckles either side of the hasp
    const C = L.clasp;
    const mp = plate(rrShape(26, 10, 2, 0, 0), 1.0, 0.28, 6);
    mp.translate(0, C.pinY + 1.0, hz);
    lidBrass.push(mp);
    for (const sx of [-1, 1]) lidBrass.push(cylX(1.75, 4.2, sx * 7.1, C.pinY, C.pinZ, 18));
    for (const dx of [-10, 10]) {
      const sc = dome(0.9, 0.4);
      sc.rotateX(Math.PI / 2);
      sc.translate(dx, C.pinY + 2.2, hz + 1.0);
      lidBrass.push(sc);
    }
  }
  const lidGeoShift = (g) => { g.translate(-pivot.x, -pivot.y, -pivot.z); return g; };
  mk(lid, lidGeoShift(mergeAll(lidLeather)), mats.leather, true, true, 'lid-leather');
  mk(lid, lidGeoShift(mergeAll(lidPaint)), mats.paint, true, true, 'lid-edge');
  const lining = mk(lid, lidGeoShift(mergeAll(lidSuede)), mats.suede, true, true, 'lid-lining');
  {
    const sg = stitchGeometry(lidFrames);
    sg.translate(-pivot.x, -pivot.y, -pivot.z);
    mk(lid, sg, mats.thread, false, true, 'lid-stitches');
  }
  mk(lid, lidGeoShift(mergeAll(lidBrass)), mats.brass, true, true, 'lid-brass');
  // gold-foil stamp on the padded lid lining (follows the panel's bulge)
  if (mats.foil) {
    const fg = foilGeometry(L, ceilY);
    if (fg) {
      const m = mk(lid, lidGeoShift(fg), mats.foil, false, true, 'lid-foil');
      m.renderOrder = 1;
    }
  }

  // ------------------------------------------------ hasp (swings out about the clasp pin)
  const hasp = new THREE.Group();
  hasp.name = 'hasp';
  hasp.position.set(0, L.clasp.pinY, L.clasp.pinZ).sub(pivot);
  lid.add(hasp);
  {
    const C = L.clasp;
    const len = C.haspLen;
    const s = rrShape(16, len + 1.5, 3.2, 0, -len / 2 + 0.75);
    // slot for the knob
    const knobLocalY = (L.rim - 8.6) - C.pinY;
    s.holes.push(rrHole(6.6, 4.8, 2.2, 0, knobLocalY));
    const g = plate(s, 1.25, 0.32, 10);
    // the plate sits just in front of the catch plate: its back face at z = hz + 1.25
    g.translate(0, 0, (L.D / 2 + 1.25) - C.pinZ);
    const curl = cylX(1.95, 9.6, 0, 0, 0, 20);
    mk(hasp, mergeAll([g, curl]), mats.brass, true, true, 'hasp');
  }

  group.updateMatrixWorld(true);
  return {
    group, base, lid, hasp, pivot, interior, lining,
    // rough boxes for hit-testing (box-local)
    baseBox: new THREE.Box3(new THREE.Vector3(-hx, 0, -hz - 4), new THREE.Vector3(hx, L.rim, hz + 5)),
    lidBox: new THREE.Box3(new THREE.Vector3(-hx, L.rim, -hz - 4), new THREE.Vector3(hx, L.top, hz + 5)),
  };
}

// Size (mm) of the foil stamp patch on the lid lining: inset evenly from the walls.
export function foilSize(L) {
  return [L.W - 2 * L.T - 18, L.D - 2 * L.T - 18];
}

// Surface patch hugging the lid's padded lining (closed-lid coordinates), UV 0..1 over
// the decal area with v running towards the lid's front edge — so the stamp reads
// upright once the lid is open.
function foilGeometry(L, ceilY) {
  const hxB = L.W / 2 - L.T, hzB = L.D / 2 - L.T, RB = Math.max(0.01, L.Rc - L.T);
  const [w, h] = foilSize(L);
  const hx = w / 2, hz = h / 2;
  const nx = 64, nz = 24;
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), nor = new Float32Array((nx + 1) * (nz + 1) * 3), uv = new Float32Array((nx + 1) * (nz + 1) * 2);
  let k = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++, k++) {
      const x = -hx + (2 * hx * i) / nx, z = -hz + (2 * hz * j) / nz;
      const y = panelHeight(x, z, hxB, hzB, RB, ceilY, L.ceilBulge, -1, 5) - 0.12;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      nor[k * 3 + 1] = -1;
      uv[k * 2] = i / nx; uv[k * 2 + 1] = j / nz;
    }
  }
  const idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 2, d = a + nx + 1;
    idx.push(a, b, d, b, c, d);
  }
  const g = ensureWinding(makeGeo(pos, nor, uv, idx));
  g.computeVertexNormals();
  ensureWinding(g);
  g.userData.size = [2 * hx, 2 * hz];
  return g;
}

// Corners of the lid (box-local) for a given opening angle — used for framing.
export function lidCorners(L, angle, out = []) {
  const hx = L.W / 2, hz = L.D / 2;
  const py = L.hinge.y, pz = L.hinge.z;
  const c = Math.cos(-angle), s = Math.sin(-angle);
  let k = 0;
  for (const x of [-hx, hx]) for (const y of [L.rim, L.top + L.topBulge]) for (const z of [-hz, hz]) {
    const ry = y - py, rz = z - pz;
    const v = out[k] || (out[k] = new THREE.Vector3());
    v.set(x, py + ry * c - rz * s, pz + ry * s + rz * c);
    k++;
  }
  out.length = k;
  return out;
}

export { clamp };
