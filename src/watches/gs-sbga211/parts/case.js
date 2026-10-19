// CASE of the Grand Seiko SBGA211 "Snowflake" (builder B1, research/gs-sbga211/plan.md §B1):
// the high-intensity titanium middle case with its four "Grammar of Design" lugs, the separate
// Zaratsu bezel, the dual-curved sapphire crystal, the rehaut, the casing ring, the screw-down
// display back with its sapphire, the screw-down crown with the raised GS, the spring bars, the
// five-piece titanium bracelet and the three-fold push-button clasp.
//
// The light is the point of this case. Every finish region is its own surface so the borders
// are razor-sharp creases, never one smooth surface shaded across an edge:
//  - Zaratsu (mirror, roughness SPEC 0.06): bezel; the shoulder at 3/9, which continues onto the
//    lugs as the steep polished bevel along their outer top edge (its lower edge is the case's
//    sharp widest-edge line, its upper edge the brushed lug top, and it shrinks to nothing where
//    the brushed band runs into the bezel seam at 2:30/3:30/8:30/9:30); the flank and the lugs'
//    outer faces; the lug undersides and inner faces; the case back.
//  - Hairline brushed along 12–6 (anisotropic, roughness SPEC 0.30): the lug tops — one broad
//    sloped band from the bezel seam out to each lug tip — and the bracelet's outer and centre
//    links, the clasp cover and blades.
// Frame: mm, +Z out of the dial, 12 o'clock +Y, crown (3 o'clock) +X. Every dimension comes from
// SPEC.case / SPEC.z; the purely cosmetic numbers SPEC lacks are the named constants below.
// Lite (the watch box): no bracelet, clasp, spring bars, casing ring, back glass or back
// engraving; fewer segments; 256 px brushing texture.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gsMonogramOps, opsToShapes } from './glyphs.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const smax = (a, b, k) => (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2;

// ------------------------------------------------------------------ local cosmetic constants
// (not in SPEC; estimates from the reference photos named in brackets)
const R_GROOVE_IN = 18.99; // inner wall of the bezel / middle-case seam groove (bezel edge r 19.0)
const BEZEL_IN_CH = 0.06; // bright polished chamfer on the bezel's inner lip (ltF_1 12 o'clock)
const KT = 0.33; // lug top falls ≈ 18° from its inner edge outwards (ltF_9, ww_20)
const BEVEL_W = 0.5; // plan width of the Zaratsu bevel along the lugs (slant ≈ 1.2 with SPEC drop 1.1)
const TIP_ROUND = 0.6; // lug top rounds over into the tip face (exterior.md r ≈ 0.6)
const INNER_CH = 0.12; // polished chamfer on the lug top's inner edge (the bright line in ltF_1)
const Y_DESC0 = 11.0; // the widest-edge line stays at SPEC widestEdge.z to here, then descends (ltF_7)
const HOLE_CH = 0.09; // chamfer round the drilled spring-bar holes
const CB_DECO_DEPTH = 0.25; // serrated deco ring sits in a channel this deep (ltF_6)
const NOTCH_R = 0.35; // corner radius of the case-back wrench notches (ltF_6)
const CRYSTAL_STEP_Z = 4.57; // the crystal is stepped: seated part under the bezel lip, top through its bore
const GASKET = { r: [16.47, 16.76], z: [3.02, 3.41] }; // dark crystal gasket ring seen at the bezel lip (ltF_1)
const UVS = 0.22; // brushing texture: 1 tile ≈ 4.5 mm
// Bracelet (SPEC.case.bracelet + ltF_11 / off_main): links hinge on pins; the outer links and the
// centre units (centre link + the two thin polished links) are staggered by half a pitch.
const BR = { gap: 0.25, rc: 1.0, thinRc: 0.9, th0: -8 * DEG, top: { links: 9, th1: -58 * DEG }, bottom: { links: 7, th1: -62 * DEG } };
const CLASP = { len: 18, coverT: 0.75, coverBevel: 0.22, top: 2.35, panelH: 6.2, blades: 2 };
// The case back carries one more mark than SPEC lists: a lone "J" just above 3 o'clock in the back
// view (θ_back ≈ 89°, letter tops toward the centre) — measured on ltF_6.
const EXTRA_BACK_MARKS = [{ text: 'J', fromDeg: 272.4, toDeg: 269.6 }];

// ================================================================== small helpers

function interp(table, x, extrapolate = false) {
  const n = table.length;
  if (x <= table[0][0]) {
    if (!extrapolate) return table[0][1];
    const [x0, y0] = table[0], [x1, y1] = table[1];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  if (x >= table[n - 1][0]) {
    if (!extrapolate) return table[n - 1][1];
    const [x0, y0] = table[n - 2], [x1, y1] = table[n - 1];
    return y1 + ((y1 - y0) * (x - x1)) / (x1 - x0);
  }
  for (let i = 1; i < n; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1], [x1, y1] = table[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[n - 1][1];
}

function spline2(pts, n) {
  const c = new THREE.CatmullRomCurve3(pts.map(([a, b]) => new THREE.Vector3(a, b, 0)), false, 'centripetal');
  return c.getSpacedPoints(n).map((v) => [v.x, v.y]);
}

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function periodicNoise(cells, rnd) {
  const v = Array.from({ length: cells }, () => rnd());
  return (t) => {
    const x = (((t % 1) + 1) % 1) * cells;
    const i = Math.floor(x), f = x - i;
    const a = v[i % cells], b = v[(i + 1) % cells];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}

// Hairline brushing: fine straight lines along texture U, with streaks at several scales across.
function hairlineMaps(size) {
  const rnd = prng(911);
  const oct = [[7, 0.3], [23, 0.25], [81, 0.2], [Math.round(size / 3), 0.15], [size, 0.1]].map(([c, a]) => [periodicNoise(c, rnd), a]);
  const along = periodicNoise(11, rnd);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    let row = 0;
    for (const [f, a] of oct) row += f(v) * a;
    for (let x = 0; x < size; x++) h[y * size + x] = row + 0.06 * along(x / size + v * 3.7) * oct[3][0](v + 0.31);
  }
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  };
  const cn = mk(), cr = mk();
  const gn = cn.getContext('2d'), gr = cr.getContext('2d');
  const imn = gn.createImageData(size, size), imr = gr.createImageData(size, size);
  const S = 5.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const dx = (h[y * size + ((x + 1) % size)] - h[y * size + ((x - 1 + size) % size)]) * S;
      const dy = (h[((y + 1) % size) * size + x] - h[((y - 1 + size) % size) * size + x]) * S;
      const l = Math.hypot(dx, dy, 1);
      imn.data[4 * i] = (-dx / l * 0.5 + 0.5) * 255;
      imn.data[4 * i + 1] = (dy / l * 0.5 + 0.5) * 255;
      imn.data[4 * i + 2] = (1 / l * 0.5 + 0.5) * 255;
      imn.data[4 * i + 3] = 255;
      const r = clamp(0.7 + (h[i] - 0.5) * 0.45, 0.35, 1) * 255;
      imr.data[4 * i] = imr.data[4 * i + 1] = imr.data[4 * i + 2] = r;
      imr.data[4 * i + 3] = 255;
    }
  }
  gn.putImageData(imn, 0, 0);
  gr.putImageData(imr, 0, 0);
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { normalMap: tex(cn), roughnessMap: tex(cr) };
}

// ------------------------------------------------------------------ mesh building
// Triangles are wound to agree with the supplied vertex normals, so surfaces can be generated in
// any parameter order and still face outwards.
class Builder {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.uv = [];
    this.idx = [];
  }

  v(p, n, t) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.uv.push(t ? t[0] : 0, t ? t[1] : 0);
    return this.pos.length / 3 - 1;
  }

  tri(a, b, c) {
    const P = this.pos, N = this.nor;
    const ax = P[3 * a], ay = P[3 * a + 1], az = P[3 * a + 2];
    const ux = P[3 * b] - ax, uy = P[3 * b + 1] - ay, uz = P[3 * b + 2] - az;
    const vx = P[3 * c] - ax, vy = P[3 * c + 1] - ay, vz = P[3 * c + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-16) return;
    const sx = N[3 * a] + N[3 * b] + N[3 * c], sy = N[3 * a + 1] + N[3 * b + 1] + N[3 * c + 1], sz = N[3 * a + 2] + N[3 * b + 2] + N[3 * c + 2];
    if (nx * sx + ny * sy + nz * sz < 0) this.idx.push(a, c, b);
    else this.idx.push(a, b, c);
  }

  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  // signed agreement of triangle (a, b, c)'s winding with its vertex normals
  vote(a, b, c) {
    const P = this.pos, N = this.nor;
    const ax = P[3 * a], ay = P[3 * a + 1], az = P[3 * a + 2];
    const ux = P[3 * b] - ax, uy = P[3 * b + 1] - ay, uz = P[3 * b + 2] - az;
    const vx = P[3 * c] - ax, vy = P[3 * c + 1] - ay, vz = P[3 * c + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    return nx * (N[3 * a] + N[3 * b] + N[3 * c]) + ny * (N[3 * a + 1] + N[3 * b + 1] + N[3 * c + 1]) + nz * (N[3 * a + 2] + N[3 * b + 2] + N[3 * c + 2]);
  }

  raw(a, b, c, flip) {
    if (flip) this.idx.push(a, c, b);
    else this.idx.push(a, b, c);
  }

  get empty() {
    return this.idx.length === 0;
  }

  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

// Per-vertex normals of an nu × nv grid (vertex i*nv + j) by central differences, flipped to agree
// with ref (a direction per vertex, or one function of the point).
function gridNormals(P, nu, nv, ref) {
  const N = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(nu - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nv - 1, j + 1);
      const a = P[i1 * nv + j], b = P[i0 * nv + j], c = P[i * nv + j1], d = P[i * nv + j0];
      const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2];
      const vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const r = typeof ref === 'function' ? ref(P[i * nv + j]) : ref[i * nv + j];
      let l = Math.hypot(nx, ny, nz);
      if (l < 1e-9) {
        nx = r[0]; ny = r[1]; nz = r[2];
        l = Math.hypot(nx, ny, nz) || 1;
      }
      if (nx * r[0] + ny * r[1] + nz * r[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      N.push([nx / l, ny / l, nz / l]);
    }
  }
  return N;
}

// Adds an nu × nv grid to builder B. cut(x, y, z) → true where the surface is removed (a drilled
// hole, a counterbore); the cut's boundary is found by bisection along the cell edges, so the
// hole's rim is a clean line however the grid runs. The whole grid gets ONE winding, chosen by a
// vote of all its cells against the vertex normals (robust at sharp corners of a loft).
function addGrid(B, P, N, U, nu, nv, cut = null) {
  const base = P.map((p, k) => B.v(p, N[k], U ? U[k] : null));
  const ins = cut ? P.map((p) => (cut(p[0], p[1], p[2]) ? 1 : 0)) : null;
  let vote = 0;
  for (let i = 0; i < nu - 1; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const a = base[i * nv + j], b = base[(i + 1) * nv + j], c = base[(i + 1) * nv + j + 1], d = base[i * nv + j + 1];
      vote += Math.sign(B.vote(a, b, c)) + Math.sign(B.vote(a, c, d));
    }
  }
  const flip = vote < 0;
  const quad = (a, b, c, d) => { B.raw(a, b, c, flip); B.raw(a, c, d, flip); };
  const cache = new Map();
  const tmp = [0, 0, 0];
  const edgeV = (o, i) => {
    const key = `${o}:${i}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const po = P[o], pi = P[i];
    let lo = 0, hi = 1;
    for (let it = 0; it < 26; it++) {
      const m = (lo + hi) / 2;
      tmp[0] = po[0] + (pi[0] - po[0]) * m;
      tmp[1] = po[1] + (pi[1] - po[1]) * m;
      tmp[2] = po[2] + (pi[2] - po[2]) * m;
      if (cut(tmp[0], tmp[1], tmp[2])) hi = m;
      else lo = m;
    }
    const t = lo, no = N[o], ni = N[i];
    const nn = [lerp(no[0], ni[0], t), lerp(no[1], ni[1], t), lerp(no[2], ni[2], t)];
    const l = Math.hypot(...nn) || 1;
    const r = B.v([lerp(po[0], pi[0], t), lerp(po[1], pi[1], t), lerp(po[2], pi[2], t)], [nn[0] / l, nn[1] / l, nn[2] / l],
      U ? [lerp(U[o][0], U[i][0], t), lerp(U[o][1], U[i][1], t)] : null);
    cache.set(key, r);
    return r;
  };
  for (let i = 0; i < nu - 1; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const q = [i * nv + j, (i + 1) * nv + j, (i + 1) * nv + j + 1, i * nv + j + 1];
      if (!cut) { quad(base[q[0]], base[q[1]], base[q[2]], base[q[3]]); continue; }
      const n = ins[q[0]] + ins[q[1]] + ins[q[2]] + ins[q[3]];
      if (n === 4) continue;
      if (n === 0) { quad(base[q[0]], base[q[1]], base[q[2]], base[q[3]]); continue; }
      const poly = [];
      for (let e = 0; e < 4; e++) {
        const a = q[e], b = q[(e + 1) % 4];
        if (!ins[a]) poly.push(base[a]);
        if (ins[a] !== ins[b]) poly.push(ins[a] ? edgeV(b, a) : edgeV(a, b));
      }
      for (let k = 1; k < poly.length - 1; k++) B.raw(poly[0], poly[k], poly[k + 1], flip);
    }
  }
}

// Outward normals of a section polyline [r, z] whose solid lies on its LEFT (r right, z up):
// outer walls run upwards, top faces inwards, inner walls downwards, bottom faces outwards.
function stripNormals(s) {
  const n = s.length, out = [];
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    if (i > 0) {
      const dr = s[i][0] - s[i - 1][0], dz = s[i][1] - s[i - 1][1], l = Math.hypot(dr, dz) || 1;
      x += dz / l; y -= dr / l;
    }
    if (i < n - 1) {
      const dr = s[i + 1][0] - s[i][0], dz = s[i + 1][1] - s[i][1], l = Math.hypot(dr, dz) || 1;
      x += dz / l; y -= dr / l;
    }
    const l = Math.hypot(x, y) || 1;
    out.push([x / l, y / l]);
  }
  return out;
}

// Surface of revolution about +Z over the angles `phis` (radians CCW from +X, increasing).
function addLathe(B, strip, phis, cut = null) {
  const nr = stripNormals(strip), n = strip.length;
  const P = [], N = [], U = [];
  for (const a of phis) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < n; i++) {
      P.push([strip[i][0] * c, strip[i][0] * s, strip[i][1]]);
      N.push([nr[i][0] * c, nr[i][0] * s, nr[i][1]]);
      U.push([a * strip[i][0] * UVS, i * 0.1]);
    }
  }
  addGrid(B, P, N, U, phis.length, n, cut);
}

const fullTurn = (segs) => Array.from({ length: segs + 1 }, (_, k) => (k / segs) * TAU);

// Lathe angles for a clock-angle range (degrees clockwise from 12 in the dial frame) → φ list.
function clockRange(t0, t1, step, dense = null) {
  const th = [];
  let t = t0;
  while (t < t1 - 1e-9) {
    th.push(t);
    const st = dense && t >= dense[0] && t < dense[1] ? dense[2] : step;
    t = Math.min(t1, t + st);
  }
  th.push(t1);
  return th.map((d) => (90 - d) * DEG).sort((a, b) => a - b);
}

function mergeAll(list) {
  const src = list.filter(Boolean);
  const anyFlat = src.some((g) => !g.index);
  const gs = src.map((g0) => {
    const g = anyFlat && g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    return g;
  });
  return mergeGeometries(gs, false);
}

// ExtrudeGeometry → { 0: lids, 1: walls } as separate geometries (one material per mesh).
function splitExtrude(geo) {
  const buckets = { 0: { p: [], n: [], u: [] }, 1: { p: [], n: [], u: [] } };
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, U = geo.attributes.uv.array;
  for (const gr of geo.groups) {
    const b = buckets[gr.materialIndex] || buckets[1];
    for (let v = gr.start; v < gr.start + gr.count; v++) {
      b.p.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]);
      b.n.push(N[3 * v], N[3 * v + 1], N[3 * v + 2]);
      b.u.push(U[2 * v], U[2 * v + 1]);
    }
  }
  const mk = (b) => {
    if (!b.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
    return g;
  };
  return [mk(buckets[0]), mk(buckets[1])];
}

// Mirror a geometry through x → −x and/or y → −y (winding restored so it still faces out).
function mirrored(geo, mx, my) {
  const g = geo.clone();
  g.applyMatrix4(new THREE.Matrix4().makeScale(mx ? -1 : 1, my ? -1 : 1, 1));
  if ((mx ? 1 : 0) + (my ? 1 : 0) === 1) {
    if (g.index) {
      const ix = g.index.array;
      for (let t = 0; t < ix.length; t += 3) { const s = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = s; }
      g.index.needsUpdate = true;
    } else {
      for (const k of Object.keys(g.attributes)) {
        const a = g.attributes[k], s = a.itemSize, arr = a.array;
        for (let v = 0; v < a.count; v += 3) {
          for (let c = 0; c < s; c++) { const t = arr[(v + 1) * s + c]; arr[(v + 1) * s + c] = arr[(v + 2) * s + c]; arr[(v + 2) * s + c] = t; }
        }
        a.needsUpdate = true;
      }
    }
  }
  return g;
}

// Planar polygon (points [a, b] in a plane) triangulated into builder B; place(a, b) → [x, y, z].
function addPolygon(B, pts, place, normal, uvf = null) {
  const tris = THREE.ShapeUtils.triangulateShape(pts.map(([a, b]) => new THREE.Vector2(a, b)), []);
  const ids = pts.map(([a, b]) => B.v(place(a, b), normal, uvf ? uvf(a, b) : null));
  for (const t of tris) B.tri(ids[t[0]], ids[t[1]], ids[t[2]]);
}

// Rounded rectangle polygon centred at (cx, cy), half sizes hx, hy, corner radius r (CCW).
function roundRect(cx, cy, hx, hy, r, seg = 6) {
  const pts = [];
  const c = [[hx - r, -hy + r, -90], [hx - r, hy - r, 0], [-hx + r, hy - r, 90], [-hx + r, -hy + r, 180]];
  for (const [x, y, a0] of c) {
    for (let k = 0; k <= seg; k++) {
      const a = (a0 + (90 * k) / seg) * DEG;
      pts.push([cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)]);
    }
  }
  return pts;
}

// Solid swept across X: slices [{ x, pts }] of one closed (y, z) loop each (same point count).
// groups: arrays of slices, consecutive groups sharing their boundary slice (each group is one
// smooth surface, so a bevel group gets a crisp edge). runs: [{ a, b }] loop index ranges (b may
// pass n: wraps). keyAt(groupIndex, runIndex) → builder key or null; caps take capKey.
function loftX(out, groups, runs, keyAt, capKey, uvf) {
  const first = groups[0][0], n = first.pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = first.pts[i], b = first.pts[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sg = area >= 0 ? 1 : -1;
  groups.forEach((sl, g) => {
    runs.forEach((run, r) => {
      const key = keyAt(g, r);
      if (!key) return;
      const nv = run.b - run.a + 1, nu = sl.length;
      const P = [], R = [], U = [];
      for (const s of sl) {
        for (let j = run.a; j <= run.b; j++) {
          const k = j % n, pt = s.pts[k], pa = s.pts[(k - 1 + n) % n], pb = s.pts[(k + 1) % n];
          P.push([s.x, pt[0], pt[1]]);
          R.push([0, sg * (pb[1] - pa[1]), -sg * (pb[0] - pa[0])]);
          U.push(uvf(s.x, pt[0], pt[1], false));
        }
      }
      addGrid(out[key], P, gridNormals(P, nu, nv, R), U, nu, nv);
    });
  });
  if (capKey) {
    const last = groups[groups.length - 1];
    const sl = last[last.length - 1];
    const dir = Math.sign(sl.x - first.x) || 1;
    addPolygon(out[capKey], first.pts, (a, b) => [first.x, a, b], [-dir, 0, 0], (a, b) => uvf(first.x, a, b, true));
    addPolygon(out[capKey], sl.pts, (a, b) => [sl.x, a, b], [dir, 0, 0], (a, b) => uvf(sl.x, a, b, true));
  }
}

// Rounded-rectangle loop in the (y, z) plane: y ∈ [−len/2, len/2], z ∈ [zb, zt]. Indices: BR arc
// 0..k, TR arc k+1..2k+1, TL 2k+2..3k+2, BL 3k+3..4k+3 (k = nArc).
function rrLoop(len, zt, zb, rc, nArc) {
  const pts = [], h = len / 2;
  const r = Math.max(0.05, Math.min(rc, (zt - zb) / 2 - 1e-3, h - 1e-3));
  const corner = (cy, cz, a0) => {
    for (let k = 0; k <= nArc; k++) {
      const a = (a0 + (90 * k) / nArc) * DEG;
      pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  };
  corner(h - r, zb + r, -90);
  corner(h - r, zt - r, 0);
  corner(-h + r, zt - r, 90);
  corner(-h + r, zb + r, 180);
  return pts;
}

// ------------------------------------------------------------------ text decals
function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.ceil(w));
  c.height = Math.max(4, Math.ceil(h));
  return c;
}

const FONT = (w, px) => `${w} ${px}px Jost, "Futura", "Century Gothic", sans-serif`;

// Fill `text` so its ink spans widthPx from x0 (letter spacing solved; squeezed if it must be).
function fitText(g, text, x0, yBase, widthPx, sizePx) {
  const chars = [...text];
  const ws = chars.map((ch) => g.measureText(ch).width);
  const sum = ws.reduce((a, b) => a + b, 0);
  let sp = chars.length > 1 ? (widthPx - sum) / (chars.length - 1) : 0;
  let sx = 1;
  if (sp < -0.06 * sizePx) {
    sp = -0.06 * sizePx;
    sx = widthPx / (sum + sp * (chars.length - 1));
  }
  g.save();
  g.translate(x0, yBase);
  g.scale(sx, 1);
  let x = chars.length > 1 ? 0 : (widthPx - sum) / 2;
  chars.forEach((ch, i) => {
    g.fillText(ch, x, 0);
    x += ws[i] + sp;
  });
  g.restore();
}

function decalMaterial(base, texture, color, roughness, metalness) {
  const m = base.clone();
  m.map = texture;
  m.color = new THREE.Color(color);
  m.roughness = roughness;
  m.metalness = metalness;
  if ('anisotropy' in m) m.anisotropy = 0;
  m.normalMap = null;
  m.roughnessMap = null;
  m.transparent = true;
  m.depthWrite = false;
  m.polygonOffset = true;
  m.polygonOffsetFactor = -4;
  m.polygonOffsetUnits = -4;
  m.alphaTest = 0.02;
  return m;
}

function whenFontReady(font, redraw) {
  try {
    if (typeof document === 'undefined' || !document.fonts || document.fonts.check(font)) return;
    document.fonts.load(font).then(() => redraw()).catch(() => {});
  } catch { /* ignore */ }
}

// ================================================================== builder

export function buildCase(ctx) {
  const { spec, M, reg, root } = ctx;
  const C = spec.case;
  const lite = !!ctx.lite;
  const X = (id) => spec.explode[id] ?? [0, 0, 0];
  const D = (id) => spec.explodeDelay(id);
  const SEG = lite ? 96 : 192;

  // ---------------------------------------------------------------- profile anchors (SPEC.case.profile)
  const prof = C.profile;
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const iSeam = prof.findIndex((p) => near(p[0], C.seam.r));
  const iWide = prof.findIndex((p) => near(p[0], C.widestEdge.r) && near(p[1], C.widestEdge.z));
  const iMidBot = prof.findIndex((p) => near(p[1], C.middle.bottom));
  const iBack = prof.findIndex((p) => near(p[1], C.caseback.z[0]));
  const bezelPts = prof.slice(0, iSeam);
  const [RS, ZS] = prof[iSeam + 1]; // start of the shoulder / lug top (19.1, 2.9)
  const RW = C.widestEdge.r, ZW0 = C.widestEdge.z;
  const flankPts = prof.slice(iWide, iMidBot - 1); // widest edge → flank lower edge
  const lowBevel = prof.slice(iMidBot - 2, iMidBot + 1); // flank lower edge → case/case-back seam
  const ZTOP = C.middle.top, ZMB = C.middle.bottom, RBORE = C.middle.innerRadius;
  const ZBACK = C.caseback.z[0];

  // dense flank (shared by the lathe zones, the lug flanks and the counterbore)
  const flankDense = spline2(flankPts, lite ? 22 : 56); // top → bottom
  const flankTable = flankDense.map(([r, z]) => [ZW0 - z, RW - r]); // depth below the widest edge → inward
  const LB_H = lowBevel[0][1] - lowBevel[2][1], LB_IN = lowBevel[0][0] - lowBevel[2][0];
  const zFlankLow = lowBevel[0][1];
  const coneSlope = (ZS - ZW0) / (RW - RS);
  const rByZ = [...flankDense].reverse().map(([r, z]) => [z, r]);
  const lowByZ = [...lowBevel].reverse().map(([r, z]) => [z, r]);
  const Rcase = (z) => {
    if (z >= ZW0) return RW - (z - ZW0) / coneSlope;
    if (z >= zFlankLow) return interp(rByZ, z);
    return interp(lowByZ, z);
  };

  // ---------------------------------------------------------------- materials
  const TI = new THREE.Color(C.colours.titanium);
  const hair = hairlineMaps(lite ? 256 : 512);
  const mirror = M.steelPolished.clone();
  mirror.color = TI.clone();
  mirror.metalness = 1;
  mirror.roughness = C.colours.mirrorRoughness;
  mirror.envMapIntensity = 1.12;
  const brushed = M.steelSatin.clone();
  brushed.color = TI.clone();
  brushed.metalness = 1;
  brushed.roughness = C.colours.brushedRoughness / 0.7; // × roughness map (mean ≈ 0.7)
  brushed.roughnessMap = hair.roughnessMap;
  brushed.normalMap = hair.normalMap;
  brushed.normalScale = new THREE.Vector2(0.32, 0.32);
  brushed.anisotropy = 0.78;
  brushed.anisotropyRotation = 0; // along texture U = along 12–6 / the bracelet
  brushed.envMapIntensity = 1.05;
  const frosted = M.steelSatin.clone(); // floors of notches, the deco channel, the crown's field
  frosted.color = TI.clone().multiplyScalar(0.8);
  frosted.metalness = 1;
  frosted.roughness = 0.46;
  frosted.anisotropy = 0;
  const darkFloor = frosted.clone();
  darkFloor.color = TI.clone().multiplyScalar(0.42);
  darkFloor.roughness = 0.55;
  const teethMat = mirror.clone();
  teethMat.roughness = 0.14;
  const holeMat = M.black.clone();
  holeMat.color = new THREE.Color(0x141516);
  holeMat.roughness = 0.62;
  const gasketMat = M.black.clone();
  gasketMat.color = new THREE.Color(0x0d0e10);
  gasketMat.roughness = 0.45;
  const rehautMat = M.steelSatin.clone();
  rehautMat.color = new THREE.Color(C.rehaut.colour || spec.dial.rehautColour);
  rehautMat.metalness = 0.25;
  rehautMat.roughness = C.rehaut.roughness ?? 0.5;
  rehautMat.anisotropy = 0;
  const ringMat = M.steelSatin.clone();
  ringMat.color = new THREE.Color(0xa7aaad);
  ringMat.roughness = 0.45;
  ringMat.anisotropy = 0;
  // Sapphire: reflection only (added on top of what lies behind), like the 139: a transmissive
  // material would hide the dial's decals and the jewels behind it. AR coating on the inside only,
  // so the outer face reflects (a little toned down) with a faint blue-violet cast.
  const glass = M.sapphire.clone();
  glass.transmission = 0;
  glass.thickness = 0;
  glass.color = new THREE.Color(0x000000);
  glass.ior = C.crystal.ior;
  glass.specularColor = new THREE.Color(0xffffff).lerp(new THREE.Color(C.crystal.arTint), 0.35);
  glass.specularIntensity = 0.5;
  glass.roughness = 0.012;
  glass.transparent = true;
  glass.blending = THREE.AdditiveBlending;
  glass.depthWrite = false;

  const add = (parent, geo, mat, { cast = true, receive = true } = {}) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  };
  const builders = (...keys) => Object.fromEntries(keys.map((k) => [k, new Builder()]));

  // ================================================================ lug geometry (the +X +Y lug)
  const lg = C.lug;
  const XIN = lg.xInner, TIPY = lg.tipY;
  const SB = lg.springBar;
  const th75 = lg.zaratsuBevel.fadesToZeroAtDeg[0] * DEG;
  const BEVEL_DROP = lg.zaratsuBevel.dropBelowTop;
  const yJ = Math.sqrt(RS * RS - XIN * XIN); // the lug top's inner edge leaves the seam here
  const po = lg.planOuter;
  const th68 = Math.atan2(po[0][0], po[0][1]);
  // outline = the widest-edge line in plan: round case from 2:30 to where the lug leaves it, then
  // the measured lug edge (Catmull-Rom), ending at the tip face
  const outline = [];
  for (let k = 0; k < 12; k++) {
    const a = lerp(th75, th68, k / 12);
    outline.push([RW * Math.sin(a), RW * Math.cos(a)]);
  }
  const lugPts = po.slice(0, -1);
  {
    const l1 = lugPts[lugPts.length - 1], l0 = lugPts[lugPts.length - 2];
    lugPts.push([l1[0] + ((l1[0] - l0[0]) * (TIPY - l1[1])) / (l1[1] - l0[1]), TIPY]);
  }
  outline.push(...spline2(lugPts, 500));
  const lugLine = outline.slice(12); // y increasing
  const xWat = (y) => {
    for (let k = 1; k < lugLine.length; k++) {
      if (lugLine[k][1] >= y) {
        const a = lugLine[k - 1], b = lugLine[k];
        return lerp(a[0], b[0], (y - a[1]) / Math.max(1e-9, b[1] - a[1]));
      }
    }
    return lugLine[lugLine.length - 1][0];
  };
  const secAt = (y) => {
    const ya = Math.max(lugLine[0][1], y - 0.05), yb = Math.min(TIPY, y + 0.05);
    const s = (xWat(yb) - xWat(ya)) / Math.max(1e-6, yb - ya);
    return Math.min(2.2, Math.sqrt(1 + s * s));
  };
  // band part of the outline (2:30 point → y = yJ), by arc length
  const band = [];
  for (let k = 0; k < outline.length; k++) {
    const p = outline[k];
    if (p[1] >= yJ) {
      const q = outline[k - 1];
      band.push([lerp(q[0], p[0], (yJ - q[1]) / (p[1] - q[1])), yJ]);
      break;
    }
    band.push(p);
  }
  const bandLen = [0];
  for (let k = 1; k < band.length; k++) bandLen.push(bandLen[k - 1] + Math.hypot(band[k][0] - band[k - 1][0], band[k][1] - band[k - 1][1]));
  const LBAND = bandLen[bandLen.length - 1];
  const bandAt = (s) => {
    s = clamp(s, 0, LBAND);
    let k = 1;
    while (k < band.length - 1 && bandLen[k] < s) k++;
    const t = (s - bandLen[k - 1]) / Math.max(1e-9, bandLen[k] - bandLen[k - 1]);
    return [lerp(band[k - 1][0], band[k][0], t), lerp(band[k - 1][1], band[k][1], t)];
  };
  const t68 = (RW * (th75 - th68)) / LBAND;

  // heights
  const pinTable = [[yJ, ZS], ...lg.profileTop.slice(1, -1)]; // lug top inner edge (side silhouette)
  const Pin = (y) => interp(pinTable, y, true);
  const tipDrop = (y) => {
    const d = y - (TIPY - TIP_ROUND);
    return d <= 0 ? 0 : TIP_ROUND - Math.sqrt(Math.max(0, TIP_ROUND * TIP_ROUND - d * d));
  };
  const pbTable = [...lg.profileBottom].sort((a, b) => a[0] - b[0]);
  const zBotAt = (y) => Math.min(ZMB, interp(pbTable, y));
  const lugTop = (y) => {
    const sec = secAt(y), xW = xWat(y);
    const ch = INNER_CH * smooth(yJ, yJ + 0.8, y);
    const zI = Pin(y) - tipDrop(y);
    const xE = Math.max(XIN + ch + 0.15, xW - Math.min(0.9, BEVEL_W * sec));
    const zE = zI - KT * (xE - XIN - ch);
    return { sec, xW, ch, zI, xE, zE, zW: zE - BEVEL_DROP };
  };
  const zWJ = lugTop(yJ).zW;

  // flank section below the widest edge: the case's own taper; near the case it ends in the
  // lower bevel (ba = 1), out on the lug in a plain edge to the underside (ba = 0)
  const NBV = 4;
  const fShape = (zW, zB, ba) => {
    const H = Math.max(0.6, zW - zB);
    const hb = Math.min(0.5 * H, lerp(0.45, LB_H, ba));
    const Hf = H - hb;
    const dr1 = interp(flankTable, Hf, true);
    return { H, hb, Hf, dr1, drEnd: lerp(interp(flankTable, H, true), dr1 + LB_IN, ba) };
  };
  const fProfile = (zW, zB, ba, rows) => {
    const f = fShape(zW, zB, ba), R1 = rows - NBV, out = [];
    for (let k = 0; k <= R1; k++) {
      const d = (k / R1) * f.Hf;
      out.push([interp(flankTable, d, true), zW - d]);
    }
    for (let k = 1; k <= NBV; k++) out.push([lerp(f.dr1, f.drEnd, k / NBV), zW - f.Hf - (k / NBV) * f.hb]);
    return out;
  };
  const drAt = (zW, zB, ba, depth) => {
    const f = fShape(zW, zB, ba);
    return depth <= f.Hf ? interp(flankTable, depth, true) : lerp(f.dr1, f.drEnd, clamp((depth - f.Hf) / f.hb, 0, 1));
  };
  const lugBa = (y) => 1 - smooth(yJ, yJ + 2.0, y);

  // ---- stations: the band round the case (t: 2:30 point → junction) then the lug (y: yJ → tip)
  const FROWS = lite ? 18 : 44;
  const stations = [];
  const NB = lite ? 16 : 34;
  const ts = [];
  for (let i = 0; i < NB; i++) ts.push(i / NB);
  ts.push(t68);
  ts.sort((a, b) => a - b);
  const thJ = Math.atan2(XIN, yJ);
  for (const t of ts) {
    if (t >= 1) continue;
    const s = t * LBAND;
    const W2 = bandAt(s);
    const pa = bandAt(s - 0.04), pb = bandAt(s + 0.04);
    const tl = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
    const nIn = [-(pb[1] - pa[1]) / tl, (pb[0] - pa[0]) / tl];
    const thW = Math.atan2(W2[0], W2[1]);
    const thI = lerp(thW, lerp(th75, thJ, t), t * t);
    const I = [RS * Math.sin(thI), RS * Math.cos(thI), ZS];
    const blend = smooth(0.55, 1, t);
    let d = [lerp(nIn[0], -1, blend), lerp(nIn[1], 0, blend)];
    const dl = Math.hypot(d[0], d[1]);
    d = [d[0] / dl, d[1] / dl];
    const cosd = Math.max(0.5, d[0] * nIn[0] + d[1] * nIn[1]);
    const inset = lerp(RW - RS, BEVEL_W, smooth(0, 0.35, t)) / cosd;
    const zW = lerp(ZW0, zWJ, smooth(Y_DESC0, yJ, W2[1]));
    const zE = zW + lerp(ZS - ZW0, BEVEL_DROP, smooth(0, 0.35, t));
    const st = { band: true, t, I, C0: I, E: [W2[0] + inset * d[0], W2[1] + inset * d[1], zE], W: [W2[0], W2[1], zW], F: null, U: null };
    if (t >= t68 - 1e-9) {
      st.F = fProfile(zW, ZMB, 1, FROWS).map(([dr, z]) => [W2[0] + (dr / cosd) * d[0], W2[1] + (dr / cosd) * d[1], z]);
      const sc = 18.66 / RS, ub = smooth(0.75, 1, t);
      st.U = [lerp(I[0] * sc, XIN, ub), lerp(I[1] * sc, yJ, ub), ZMB];
    }
    stations.push(st);
  }
  const ys = [];
  const range = (a, b, step) => {
    const n = Math.max(1, Math.ceil((b - a) / step));
    for (let k = 0; k < n; k++) ys.push(a + ((b - a) * k) / n);
  };
  range(yJ, 22.0, lite ? 0.6 : 0.3);
  range(22.0, 23.8, lite ? 0.3 : 0.1);
  range(23.8, TIPY, lite ? 0.15 : 0.06);
  ys.push(TIPY);
  for (const y of ys) {
    const L = lugTop(y), zB = zBotAt(y), ba = lugBa(y);
    stations.push({
      band: false, y, L, zB, ba,
      I: [XIN + L.ch, y, L.zI], C0: [XIN, y, L.zI - L.ch], E: [L.xE, y, L.zE], W: [L.xW, y, L.zW],
      F: fProfile(L.zW, zB, ba, FROWS).map(([dr, z]) => [L.xW - dr * L.sec, y, z]),
      U: [XIN, y, zB],
    });
  }
  const NS = stations.length;
  const iF0 = stations.findIndex((s) => s.F);
  const iL0 = stations.findIndex((s) => !s.band);
  const xFat = (y, z) => {
    const L = lugTop(y);
    return L.xW - drAt(L.zW, zBotAt(y), lugBa(y), L.zW - z) * L.sec;
  };

  // ---- surfaces of one lug
  function lugQuadrant() {
    const B = builders('brushed', 'mirror', 'hole');
    const uvT = (p) => [p[1] * UVS, p[0] * UVS];
    // brushed top: band T (seam → bevel) + lug T (inner chamfer → bevel)
    {
      const NT = 6, P = [], U = [];
      for (const s of stations) {
        for (let j = 0; j < NT; j++) {
          const f = j / (NT - 1);
          const p = [lerp(s.I[0], s.E[0], f), lerp(s.I[1], s.E[1], f), lerp(s.I[2], s.E[2], f)];
          P.push(p);
          U.push(uvT(p));
        }
      }
      addGrid(B.brushed, P, gridNormals(P, NS, NT, () => [0, 0, 1]), U, NS, NT);
    }
    // Zaratsu bevel (and its continuation down to the seam at 2:30)
    {
      const P = [];
      for (const s of stations) P.push(s.E, s.W);
      addGrid(B.mirror, P, gridNormals(P, NS, 2, (p) => [p[0], p[1], 0.9 * Math.hypot(p[0], p[1])]), null, NS, 2);
    }
    // flank (outer face of the lug), with the drilled spring-bar hole
    const HR = SB.holeRadius + HOLE_CH;
    const cutHole = (x, y, z) => (y - SB.y) ** 2 + (z - SB.z) ** 2 < HR * HR;
    {
      const sts = stations.slice(iF0), nu = sts.length, nv = FROWS + 1;
      const P = [];
      for (const s of sts) for (const p of s.F) P.push(p);
      addGrid(B.mirror, P, gridNormals(P, nu, nv, (p) => [p[0], p[1], 0]), null, nu, nv, cutHole);
    }
    // underside
    {
      const sts = stations.slice(iF0), P = [];
      for (const s of sts) P.push(s.F[FROWS], s.U);
      addGrid(B.mirror, P, gridNormals(P, sts.length, 2, () => [0, 0, -1]), null, sts.length, 2);
    }
    // inner face (x = XIN) and the polished chamfer on its top edge
    {
      const sts = stations.slice(iL0), nu = sts.length, NIF = 8, P = [], Pc = [];
      for (const s of sts) {
        for (let j = 0; j < NIF; j++) P.push([XIN, s.y, lerp(s.C0[2], s.zB, j / (NIF - 1))]);
        Pc.push(s.C0, s.I);
      }
      addGrid(B.mirror, P, gridNormals(P, nu, NIF, () => [-1, 0, 0]), null, nu, NIF);
      addGrid(B.mirror, Pc, gridNormals(Pc, nu, 2, () => [-1, 0, 1]), null, nu, 2);
    }
    // tip face (brushed, like the photos)
    {
      const s = stations[NS - 1];
      const loop = [[s.C0[0], s.C0[2]], [s.I[0], s.I[2]], [s.E[0], s.E[2]], ...s.F.map((p) => [p[0], p[2]]), [s.U[0], s.U[2]]];
      addPolygon(B.brushed, loop, (a, b) => [a, s.y, b], [0, 1, 0], (a, b) => [b * UVS, a * UVS]);
    }
    // the hole: polished chamfer, dark bore, bottom
    {
      const NH = lite ? 16 : 32, xc = xFat(SB.y, SB.z), depth = 1.5;
      const rim = [], inner = [];
      for (let k = 0; k <= NH; k++) {
        const a = (k / NH) * TAU, cy = Math.cos(a), cz = Math.sin(a);
        const y = SB.y + HR * cy, z = SB.z + HR * cz;
        rim.push([xFat(y, z) + 0.004, y, z]);
        inner.push([xc - HOLE_CH, SB.y + SB.holeRadius * cy, SB.z + SB.holeRadius * cz]);
      }
      const Pch = [], Pb = [];
      for (let k = 0; k <= NH; k++) {
        Pch.push(rim[k], inner[k]);
        Pb.push(inner[k], [inner[k][0] - depth, inner[k][1], inner[k][2]]);
      }
      addGrid(B.mirror, Pch, gridNormals(Pch, NH + 1, 2, (p) => [0.6, -(p[1] - SB.y), -(p[2] - SB.z)]), null, NH + 1, 2);
      addGrid(B.hole, Pb, gridNormals(Pb, NH + 1, 2, (p) => [0, -(p[1] - SB.y), -(p[2] - SB.z)]), null, NH + 1, 2);
      const disc = inner.slice(0, NH).map((p) => [p[1], p[2]]);
      addPolygon(B.hole, disc, (a, b) => [xc - HOLE_CH - depth, a, b], [1, 0, 0]);
    }
    return { brushed: B.brushed.geo(), mirror: B.mirror.geo(), hole: B.hole.geo() };
  }

  // ================================================================ middle case + lugs
  {
    const object = new THREE.Group();
    root.add(object);
    const Bm = new Builder(); // revolved middle case (mirror)
    const cw = C.crown;
    const AZ = cw.axisZ, CB_R = cw.recess.radius, CB_X = cw.from;
    // shoulder cone and flank strips (outer walls run upwards)
    const cone = [];
    const NC = lite ? 8 : 18;
    for (let k = 0; k <= NC; k++) {
      const f = k / NC;
      cone.push([lerp(RW, RS, f), lerp(ZW0, ZS, f)]);
    }
    const flankUp = [...flankDense].reverse();
    const lowUp = [...lowBevel].reverse();
    const xSurf = (y, z) => Math.sqrt(Math.max(0, Rcase(z) ** 2 - y * y));
    const cutCB = (x, y, z) => x > CB_X && y * y + (z - AZ) ** 2 < CB_R * CB_R;
    const step = lite ? 3 : 1.5;
    // 3 o'clock (crown side, with the counterbore), 9, 12 and 6 (under the end links)
    const cone3 = clockRange(th75 / DEG, 180 - th75 / DEG, lite ? 2 : 0.8, [80, 100, lite ? 0.6 : 0.3]);
    const flank3 = clockRange(th68 / DEG, 180 - th68 / DEG, lite ? 2 : 0.8, [80, 100, lite ? 0.6 : 0.3]);
    addLathe(Bm, cone, cone3, cutCB);
    addLathe(Bm, flankUp, flank3, cutCB);
    addLathe(Bm, lowUp, flank3);
    for (const [c0, c1, f0, f1] of [
      [180 + th75 / DEG, 360 - th75 / DEG, 180 + th68 / DEG, 360 - th68 / DEG],
      [-35, 35, -35, 35], [145, 215, 145, 215],
    ]) {
      addLathe(Bm, cone, clockRange(c0, c1, step));
      addLathe(Bm, flankUp, clockRange(f0, f1, step));
      addLathe(Bm, lowUp, clockRange(f0, f1, step));
    }
    // all round: seam groove, top face under the bezel, bore, bottom face
    const all = fullTurn(SEG);
    addLathe(Bm, [[RS, ZS], [(RS + R_GROOVE_IN) / 2, ZTOP - C.seam.depth]], all);
    addLathe(Bm, [[(RS + R_GROOVE_IN) / 2, ZTOP - C.seam.depth], [R_GROOVE_IN, ZTOP]], all);
    addLathe(Bm, [[R_GROOVE_IN, ZTOP], [RBORE, ZTOP]], all);
    addLathe(Bm, [[RBORE, ZTOP], [RBORE, ZMB]], all);
    addLathe(Bm, [[RBORE, ZMB], [lowBevel[2][0], ZMB]], all);
    // counterbore round the crown: wall and floor
    {
      const NW = lite ? 32 : 72, P = [], Pf = [];
      for (let k = 0; k <= NW; k++) {
        const a = (k / NW) * TAU, y = CB_R * Math.cos(a), z = AZ + CB_R * Math.sin(a);
        const xs = Math.max(CB_X, xSurf(y, z) + 0.004);
        P.push([CB_X, y, z], [xs, y, z]);
      }
      addGrid(Bm, P, gridNormals(P, NW + 1, 2, (p) => [0, -p[1], -(p[2] - AZ)]), null, NW + 1, 2);
      const NR = 6, r0 = cw.tube.radius + 0.02;
      for (let k = 0; k <= NW; k++) {
        const a = (k / NW) * TAU;
        for (let j = 0; j < NR; j++) {
          const r = lerp(r0, CB_R, j / (NR - 1));
          Pf.push([CB_X, r * Math.cos(a), AZ + r * Math.sin(a)]);
        }
      }
      addGrid(Bm, Pf, Pf.map(() => [1, 0, 0]), null, NW + 1, NR, (x, y, z) => xSurf(y, z) < CB_X - 0.01);
    }
    // crown tube (case bore → into the crown)
    {
      const tb = new Builder();
      addLathe(tb, [[cw.tube.radius, RBORE], [cw.tube.radius, cw.from + 0.15]], fullTurn(lite ? 16 : 32));
      const g = tb.geo();
      g.rotateY(Math.PI / 2);
      g.translate(0, 0, AZ);
      add(object, g, mirror);
    }
    add(object, Bm.geo(), mirror);
    // the four lugs
    const q = lugQuadrant();
    for (const key of ['brushed', 'mirror', 'hole']) {
      const list = [];
      for (const [mx, my] of [[0, 0], [0, 1], [1, 0], [1, 1]]) list.push(mx || my ? mirrored(q[key], mx, my) : q[key]);
      add(object, mergeAll(list), key === 'brushed' ? brushed : key === 'mirror' ? mirror : holeMat, { cast: key !== 'hole' });
    }
    const aY = 20.2, aL = lugTop(aY);
    reg.add({
      id: 'case-body', name: 'Middle case and lugs', category: 'case', side: 'both', exposed: true,
      object, explode: X('case-body'), explodeDelay: D('case-body'), priority: 1,
      anchor: [aL.xW - 0.25, aY, aL.zW + 0.5],
      description: 'The middle case and its four lugs, machined from one block of high-intensity titanium and finished in Grand Seiko’s “Grammar of Design”: hairline-brushed lug tops that end in a razor-sharp line against Zaratsu-polished bevels and flanks, polished flat without distortion. The case tapers towards the back so it sits low on the wrist.',
      facts: {
        Material: `${C.material}, ≈ 30 % lighter than steel`,
        Diameter: `${(C.radius * 2).toFixed(1)} mm`,
        Thickness: `${C.height.toFixed(1)} mm`,
        'Lug to lug': `${C.lugToLug.toFixed(1)} mm`,
        'Lug width': `${C.lugWidth.toFixed(0)} mm`,
        Finish: 'Zaratsu mirror polish + hairline brushing',
        'Water resistance': '10 bar',
      },
    });
  }

  // ================================================================ bezel
  {
    const object = new THREE.Group();
    root.add(object);
    const B = new Builder();
    const cr = C.crystal;
    const top = spline2([...bezelPts].reverse(), lite ? 18 : 32); // outer → inner
    const rIn = cr.visibleRadius;
    const zIn = interp([...top].reverse(), rIn + BEZEL_IN_CH);
    const topCut = top.filter(([r]) => r > rIn + BEZEL_IN_CH);
    topCut.push([rIn + BEZEL_IN_CH, zIn]);
    const zLip = CRYSTAL_STEP_Z + 0.02, rSeat = cr.radius + 0.02, zBot = ZTOP + 0.004;
    const rOut = bezelPts[bezelPts.length - 1][0], zOut = bezelPts[bezelPts.length - 1][1];
    const all = fullTurn(SEG);
    addLathe(B, [[rOut, zBot + 0.05], [rOut, zOut]], all);
    addLathe(B, topCut, all);
    addLathe(B, [[rIn + BEZEL_IN_CH, zIn], [rIn, zIn - BEZEL_IN_CH]], all);
    addLathe(B, [[rIn, zIn - BEZEL_IN_CH], [rIn, zLip]], all);
    addLathe(B, [[rIn, zLip], [rSeat, zLip]], all);
    addLathe(B, [[rSeat, zLip], [rSeat, zBot]], all);
    addLathe(B, [[rSeat, zBot], [rOut - 0.05, zBot]], all);
    addLathe(B, [[rOut - 0.05, zBot], [rOut, zBot + 0.05]], all);
    add(object, B.geo(), mirror);
    const a = 128 * DEG, rr = 17.9;
    reg.add({
      id: 'bezel', name: 'Bezel', category: 'case', side: 'front', exposed: true,
      object, explode: X('bezel'), explodeDelay: D('bezel'), priority: 2,
      anchor: [rr * Math.cos(a), rr * Math.sin(a), interp([...top].reverse(), rr)],
      description: 'A separate titanium ring pressed onto the middle case. Its broad, convex slope is Zaratsu-polished — flattened against a rotating tin disc — so it reflects like a distortion-free mirror; its lip holds the crystal in place.',
      facts: { 'Outer diameter': `${(C.bezel.r[1] * 2).toFixed(1)} mm`, Height: `${(C.bezel.z[1] - C.bezel.z[0]).toFixed(2)} mm`, Finish: 'Zaratsu mirror polish' },
    });
  }

  // ================================================================ crystal
  {
    const object = new THREE.Group();
    root.add(object);
    const cr = C.crystal, Rc = cr.topRadius;
    const zt = (r) => cr.apexZ - (Rc - Math.sqrt(Rc * Rc - r * r));
    const zb = (r) => cr.undersideCentreZ - (Rc - Math.sqrt(Rc * Rc - r * r));
    const rU = cr.visibleRadius - 0.02, rL = cr.radius - 0.02, b = 0.025, N = lite ? 16 : 32;
    const topS = [], botS = [];
    for (let k = 0; k <= N; k++) {
      const r = ((rU - b) * (N - k)) / N;
      topS.push([r, zt(r)]);
    }
    for (let k = 0; k <= N; k++) {
      const r = ((rL - b) * k) / N;
      botS.push([r, zb(r)]);
    }
    const B = new Builder();
    const all = fullTurn(lite ? 96 : 160);
    addLathe(B, botS, all);
    addLathe(B, [[rL - b, zb(rL - b)], [rL, zb(rL) + b]], all);
    addLathe(B, [[rL, zb(rL) + b], [rL, CRYSTAL_STEP_Z]], all);
    addLathe(B, [[rL, CRYSTAL_STEP_Z], [rU, CRYSTAL_STEP_Z]], all);
    addLathe(B, [[rU, CRYSTAL_STEP_Z], [rU, zt(rU) - b]], all);
    addLathe(B, [[rU, zt(rU) - b], [rU - b, zt(rU - b)]], all);
    addLathe(B, topS, all);
    const mesh = add(object, B.geo(), glass, { cast: false, receive: false });
    mesh.renderOrder = 2;
    reg.add({
      id: 'crystal', name: 'Sapphire crystal', category: 'case', side: 'front', exposed: true,
      object, explode: X('crystal'), explodeDelay: D('crystal'), priority: 2,
      anchor: [-7.5, 9.5, zt(12)],
      description: 'A dual-curved crystal of synthetic sapphire — domed on top and underneath, so it stays the same 1.5 mm thick all over and does not distort the dial. Its anti-reflective coating is on the inside only, where it cannot be scratched.',
      facts: { Material: 'Synthetic sapphire', Shape: 'Dual-curved (box) dome', Diameter: `${(cr.radius * 2).toFixed(1)} mm`, Thickness: `${cr.thickness.toFixed(1)} mm`, 'AR coating': 'Inner surface' },
    });
  }

  // ================================================================ rehaut
  {
    const object = new THREE.Group();
    root.add(object);
    const [r0, r1] = C.rehaut.r, [z0, z1] = C.rehaut.z;
    const all = fullTurn(lite ? 96 : 160);
    const B = new Builder();
    addLathe(B, [[r1 - 0.05, z1], [r0, z0]], all);
    addLathe(B, [[r0, z0], [r1, z0]], all);
    addLathe(B, [[r1, z0], [r1, z1]], all);
    addLathe(B, [[r1, z1], [r1 - 0.05, z1]], all);
    add(object, B.geo(), rehautMat);
    const G = new Builder();
    const [g0, g1] = GASKET.r, [h0, h1] = GASKET.z;
    addLathe(G, [[g0, h0], [g1, h0]], all);
    addLathe(G, [[g1, h0], [g1, h1]], all);
    addLathe(G, [[g1, h1], [g0, h1]], all);
    addLathe(G, [[g0, h1], [g0, h0]], all);
    add(object, G.geo(), gasketMat, { cast: false });
    const a = 225 * DEG, rr = (r0 + r1) / 2;
    reg.add({
      id: 'rehaut', name: 'Rehaut (dial flange)', category: 'case', side: 'front', exposed: true,
      object, explode: X('rehaut'), explodeDelay: D('rehaut'), priority: 3,
      anchor: [rr * Math.cos(a), rr * Math.sin(a), (z0 + z1) / 2],
      description: 'The plain light-grey ring that slopes steeply up from the edge of the dial to the crystal. It hides the dial’s rim and the gap to the case, and frames the snowflake texture without any print.',
      facts: { 'Inner diameter': `${(r0 * 2).toFixed(1)} mm`, Slope: '≈ 70°', Finish: 'Matte light grey' },
    });
  }

  // ================================================================ casing ring
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const cg = C.casingRing, [r0, r1] = cg.r, [z0, z1] = cg.z;
    const zh = spec.z.stemAxis + cg.stemHole;
    const B = new Builder();
    const all = fullTurn(128);
    const sec = (zl, zu) => [[[r0, zl], [r1, zl]], [[r1, zl], [r1, zu]], [[r1, zu], [r0, zu]], [[r0, zu], [r0, zl]]];
    for (const s of sec(zh, z1)) addLathe(B, s, all);
    const gap = Math.asin(cg.stemHole / r0);
    const part = Array.from({ length: 121 }, (_, k) => gap + (k / 120) * (TAU - 2 * gap));
    for (const s of sec(z0, zh)) addLathe(B, s, part);
    for (const a of [gap, TAU - gap]) {
      const c = Math.cos(a), s = Math.sin(a), n = a < Math.PI ? [s, -c, 0] : [-s, c, 0];
      addPolygon(B, [[r0, z0], [r1, z0], [r1, zh], [r0, zh]], (r, z) => [r * c, r * s, z], n);
    }
    add(object, B.geo(), ringMat);
    reg.add({
      id: 'casing-ring', name: 'Casing ring', category: 'case', side: 'back', exposed: false,
      object, explode: X('casing-ring'), explodeDelay: D('casing-ring'), priority: 3,
      anchor: [-(r0 + r1) / 2, 0, (z0 + z1) / 2],
      description: 'A spacer ring that centres the 30 mm caliber 9R65 in the case bore. The dial’s rim rests on it, and a notch at 3 o’clock lets the winding stem through to the crown.',
      facts: { 'Inner diameter': `${(r0 * 2).toFixed(1)} mm`, 'Outer diameter': `${(r1 * 2).toFixed(1)} mm` },
    });
  }

  // ================================================================ crown
  {
    const cw = C.crown;
    const object = new THREE.Group();
    object.position.set(0, 0, cw.axisZ);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const ef = cw.endFace, NFL = cw.flutes, R = cw.radius, RR = cw.rootRadius;
    const NA = NFL * (lite ? 8 : 16);
    const fluteR = (a) => {
      const u = (((a * NFL) / TAU) % 1 + 1) % 1;
      return RR + (R - RR) * Math.pow(Math.abs(Math.cos(Math.PI * u)), 0.35);
    };
    const x0 = cw.from + 0.05, x1 = cw.to, xc = x1 - 0.32;
    const sts = [[x0, 0.93], [x0 + 0.05, 0.975], [x0 + 0.14, 0.995], [x0 + 0.3, 1], [xc - 0.25, 1], [xc, 1]];
    const Bm = new Builder(), Bf = new Builder();
    const ring = (x, rf, a) => [x, rf * Math.cos(a), rf * Math.sin(a)];
    {
      const P = [];
      for (const [x, sc] of sts) for (let k = 0; k <= NA; k++) { const a = (k / NA) * TAU; P.push(ring(x, fluteR(a) * sc, a)); }
      addGrid(Bm, P, gridNormals(P, sts.length, NA + 1, (p) => [0, p[1], p[2]]), null, sts.length, NA + 1);
    }
    {
      // flute ends run out on a polished chamfer: the serrated edge round the end face
      const P = [];
      for (let k = 0; k <= NA; k++) { const a = (k / NA) * TAU; P.push(ring(xc, fluteR(a), a)); }
      for (let k = 0; k <= NA; k++) { const a = (k / NA) * TAU; P.push(ring(x1, ef.chamferInner, a)); }
      addGrid(Bm, P, gridNormals(P, 2, NA + 1, (p) => [0.7, p[1], p[2]]), null, 2, NA + 1);
    }
    {
      const P = [];
      for (let k = 0; k <= NA; k++) { const a = (k / NA) * TAU; P.push(ring(x0, fluteR(a) * sts[0][1], a)); }
      for (let k = 0; k <= NA; k++) { const a = (k / NA) * TAU; P.push(ring(x0, cw.tube.radius + 0.05, a)); }
      addGrid(Bm, P, P.map(() => [-1, 0, 0]), null, 2, NA + 1);
    }
    const NE = lite ? 48 : 96, xf = x1 - ef.fieldRecess;
    {
      const P = [], Ps = [];
      for (let k = 0; k <= NE; k++) {
        const a = (k / NE) * TAU;
        P.push(ring(x1, ef.chamferInner, a), ring(x1, ef.fieldRadius, a));
        Ps.push(ring(x1, ef.fieldRadius, a), ring(xf, ef.fieldRadius, a));
      }
      addGrid(Bm, P, P.map(() => [1, 0, 0]), null, NE + 1, 2);
      addGrid(Bm, Ps, gridNormals(Ps, NE + 1, 2, (p) => [0, -p[1], -p[2]]), null, NE + 1, 2);
      const disc = [];
      for (let k = 0; k < NE; k++) { const a = (k / NE) * TAU; disc.push([ef.fieldRadius * Math.cos(a), ef.fieldRadius * Math.sin(a)]); }
      addPolygon(Bf, disc, (y, z) => [xf, y, z], [1, 0, 0]);
    }
    add(rotor, Bm.geo(), mirror);
    add(rotor, Bf.geo(), frosted);
    // raised polished "GS" (shared traced outlines), upright with 12 up, reading towards the back
    {
      const relief = ef.logoRelief, bev = 0.03;
      const g = new THREE.ExtrudeGeometry(opsToShapes(THREE, gsMonogramOps(ef.logoHeight)), {
        depth: relief - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: 0.025, bevelSegments: 1, curveSegments: 4,
      });
      g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)));
      g.translate(xf + bev - 0.005, 0, 0);
      add(rotor, g, mirror);
    }
    const kw = spec.keyless;
    const ratchetPerTurn = kw.windingPinion.teeth / kw.ratchet.teeth;
    const TURNS = spec.barrelTurns / ratchetPerTurn;
    const hPer5 = (5 * ratchetPerTurn * spec.periods.barrel) / 3600;
    const RES_H = spec.powerReserveHours;
    reg.add({
      id: 'crown', name: 'Screw-down crown', category: 'case', side: 'both', exposed: true,
      object, rotor, explode: X('crown'), explodeDelay: D('crown'), priority: 1,
      anchor: [(cw.from + cw.to) / 2 + 0.4, 0, cw.radius],
      description: `Screwed down onto its tube it seals the case to 10 bar. Unscrewed, it winds the mainspring through the winding pinion, crown wheel and ratchet: ${5} turns give about ${Math.round(hPer5)} hours, ≈ ${Math.round(TURNS)} turns a full 72 hours. Pulled to the first click it sets the date, to the second the time — and stops the glide wheel for exact setting.`,
      facts: {
        Diameter: `${(cw.radius * 2).toFixed(1)} mm`, Flutes: String(cw.flutes), Type: 'Screw-down',
        'Full wind': `≈ ${Math.round(TURNS)} turns`, Signed: 'Raised polished GS',
      },
      live: (s) => `${Math.round((s.reserve || 0) * RES_H)} h in reserve`,
      update: (s) => { rotor.rotation.x = s.rot.stem || 0; },
    });
  }

  // ================================================================ case back (ring)
  {
    const object = new THREE.Group();
    root.add(object);
    const cb = C.caseback, gl = cb.glass;
    const Bp = new Builder(), Bd = new Builder(), Bt = new Builder(), Bn = new Builder(), Bf = new Builder();
    const all = fullTurn(SEG);
    const cbFlank = spline2(prof.slice(iBack - 3, iBack + 1).reverse(), lite ? 10 : 20); // (18.0,−7.4) → (18.6,−5.63)
    const rOut = cb.outerRadius, zTopCb = cb.z[1], zIn = cb.innerFaceZ;
    const rSeat = gl.radius + 0.02, zLip = gl.z[0] - 0.005, rAp = gl.apertureRadius;
    const back = prof.slice(iBack); // (18.0,−7.4) (13.8,−7.4) (13.4,−7.25) (12.9,−7.15)
    const rWin1 = cb.windowBevel.r[1], [rD0, rD1] = cb.decoRing.r;
    const zCh = ZBACK + CB_DECO_DEPTH;
    addLathe(Bp, cbFlank, all);
    addLathe(Bp, [[rOut, zTopCb], [RBORE, zTopCb]], all);
    addLathe(Bp, [[RBORE, zTopCb], [RBORE, zIn]], all);
    addLathe(Bp, [[RBORE, zIn], [rSeat, zIn]], all);
    addLathe(Bp, [[rSeat, zIn], [rSeat, zLip]], all);
    addLathe(Bp, [[rSeat, zLip], [rAp, zLip]], all);
    addLathe(Bp, [[rAp, zLip], [rAp, back[3][1]]], all);
    addLathe(Bp, [[rAp, back[3][1]], [back[2][0], back[2][1]], [back[1][0], back[1][1]]], all);
    addLathe(Bp, [[back[1][0], ZBACK], [rWin1, ZBACK]], all);
    addLathe(Bp, [[rD0, ZBACK], [rD0, zCh]], all);
    addLathe(Bd, [[rD0, zCh], [rD1, zCh]], all);
    addLathe(Bp, [[rD1, zCh], [rD1, ZBACK]], all);
    // flat back face with the six wrench notches
    const nt = cb.notches, notch = [];
    const rN = (nt.r[0] + nt.r[1] - 0.05) / 2, hr = (nt.r[1] - 0.05 - nt.r[0]) / 2, ht = nt.width / 2;
    for (const deg of nt.anglesDeg) {
      const a = deg * DEG, er = [Math.sin(a), Math.cos(a)], et = [Math.cos(a), -Math.sin(a)];
      notch.push(roundRect(0, 0, ht, hr, NOTCH_R, lite ? 3 : 5).map(([t, r]) => [rN * er[0] + t * et[0] + r * er[0], rN * er[1] + t * et[1] + r * er[1]]));
    }
    {
      const outerC = [], innerC = [];
      for (let k = 0; k < SEG; k++) {
        const a = (k / SEG) * TAU;
        outerC.push(new THREE.Vector2(back[0][0] * Math.cos(a), back[0][0] * Math.sin(a)));
        innerC.push(new THREE.Vector2(rD1 * Math.cos(a), rD1 * Math.sin(a)));
      }
      const holes = [innerC, ...notch.map((p) => p.map(([x, y]) => new THREE.Vector2(x, y)))];
      const tris = THREE.ShapeUtils.triangulateShape(outerC, holes);
      const ptsAll = [outerC, ...holes].flat();
      const ids = ptsAll.map((v) => Bp.v([v.x, v.y, ZBACK], [0, 0, -1], [v.x * 0.05, v.y * 0.05]));
      for (const t of tris) Bp.tri(ids[t[0]], ids[t[1]], ids[t[2]]);
      for (const p of notch) {
        const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cy = p.reduce((s, q) => s + q[1], 0) / p.length;
        for (let k = 0; k < p.length; k++) {
          const a = p[k], b = p[(k + 1) % p.length];
          const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
          const n = [-(b[1] - a[1]), b[0] - a[0], 0];
          if (n[0] * mx + n[1] * my > 0) { n[0] = -n[0]; n[1] = -n[1]; }
          const l = Math.hypot(n[0], n[1]) || 1;
          const nn = [n[0] / l, n[1] / l, 0];
          const zf = ZBACK + nt.depth;
          Bn.quad(Bn.v([a[0], a[1], ZBACK], nn), Bn.v([b[0], b[1], ZBACK], nn), Bn.v([b[0], b[1], zf], nn), Bn.v([a[0], a[1], zf], nn));
        }
        addPolygon(Bf, p, (x, y) => [x, y, ZBACK + nt.depth], [0, 0, -1]);
      }
    }
    // serrated deco ring: square teeth standing in the channel
    if (!lite) {
      const dr = cb.decoRing, n = dr.teeth, half = (dr.toothDuty * Math.PI) / n;
      const ztop = zCh - dr.height, ra = rD0 + 0.03, rb = rD1 - 0.03;
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * TAU;
        const c = (r, da) => [r * Math.cos(a + da), r * Math.sin(a + da)];
        const pts = [c(ra, -half), c(rb, -half * (ra / rb)), c(rb, half * (ra / rb)), c(ra, half)];
        const face = (p, q, nrm) => Bt.quad(Bt.v([p[0], p[1], zCh], nrm), Bt.v([q[0], q[1], zCh], nrm), Bt.v([q[0], q[1], ztop], nrm), Bt.v([p[0], p[1], ztop], nrm));
        for (let k = 0; k < 4; k++) {
          const p = pts[k], q = pts[(k + 1) % 4];
          const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
          let nx = q[1] - p[1], ny = -(q[0] - p[0]);
          const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2;
          if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
          const l = Math.hypot(nx, ny);
          face(p, q, [nx / l, ny / l, 0]);
        }
        const ids = pts.map((p) => Bt.v([p[0], p[1], ztop], [0, 0, -1]));
        Bt.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
    add(object, Bp.geo(), mirror);
    add(object, Bd.geo(), darkFloor);
    add(object, Bn.geo(), mirror);
    add(object, Bf.geo(), frosted);
    if (!Bt.empty) add(object, Bt.geo(), teethMat);

    // engraved band: capitals letter-spaced to the measured arcs. Texts in the upper half of the
    // back view read clockwise with their tops outwards; those in the lower half read
    // counter-clockwise with their tops towards the centre, so all read upright (ltF_6).
    if (!lite) {
      const tb = cb.textBand, rMid = (tb.r[0] + tb.r[1]) / 2;
      const items = [...tb.items, ...EXTRA_BACK_MARKS].map((it) => {
        const lo = Math.min(it.fromDeg, it.toDeg), hi = Math.max(it.fromDeg, it.toDeg);
        const backMid = 360 - (lo + hi) / 2;
        return { ...it, lo, hi, text: it.text.replace('{serial}', spec.caseSerial), inward: backMid > 85 && backMid < 275, len: rMid * (hi - lo) * DEG };
      });
      const pxmm = 72, cap = Math.round(tb.capHeight * pxmm), rowH = Math.round((tb.r[1] - tb.r[0]) * pxmm), pad = 10;
      const W = Math.ceil(Math.max(...items.map((it) => it.len)) * pxmm) + 2 * pad, H = rowH * items.length;
      const cv = canvasOf(W, H);
      const font = FONT(300, 100);
      const draw = () => {
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        g.fillStyle = '#fff';
        g.strokeStyle = '#fff';
        g.font = font;
        const capPx = g.measureText('H').actualBoundingBoxAscent || 70;
        const size = (100 * cap) / capPx;
        g.font = FONT(300, size);
        items.forEach((it, i) => {
          const y = i * rowH + rowH / 2 + cap / 2, w = it.len * pxmm;
          if (it.text.startsWith('[')) {
            // boxed "A4" then the inverted-U mark over a bar, as engraved
            const boxed = it.text.slice(1, it.text.indexOf(']'));
            const bw = g.measureText(boxed).width + cap * 0.6, lw = cap * 0.09;
            const mark = cap * 0.85, gapW = Math.max(cap * 0.5, w - bw - mark);
            const x0 = pad;
            g.lineWidth = lw;
            g.strokeRect(x0 + lw / 2, y - cap * 1.3, bw - lw, cap * 1.6);
            g.fillText(boxed, x0 + cap * 0.3, y);
            const mx = x0 + bw + gapW, sw = cap * 0.16;
            g.lineWidth = sw;
            g.beginPath();
            g.moveTo(mx + sw / 2, y);
            g.lineTo(mx + sw / 2, y - cap + mark / 2);
            g.arc(mx + mark / 2, y - cap + mark / 2, mark / 2 - sw / 2, Math.PI, 0);
            g.lineTo(mx + mark - sw / 2, y);
            g.stroke();
            g.fillRect(mx - cap * 0.35, y + cap * 0.22, mark + cap * 0.35, sw);
          } else {
            fitText(g, it.text, pad, y, w, size);
          }
        });
      };
      draw();
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      whenFontReady(font, () => { draw(); tex.needsUpdate = true; });
      const Bx = new Builder(), zf = ZBACK - 0.004;
      items.forEach((it, i) => {
        const nseg = Math.max(4, Math.round(it.hi - it.lo) * 2);
        const u0 = pad / W, u1 = (pad + it.len * pxmm) / W;
        const vTop = 1 - (i * rowH) / H, vBot = 1 - ((i + 1) * rowH) / H;
        const P = [], U = [];
        for (let k = 0; k <= nseg; k++) {
          const f = k / nseg;
          const th = (it.inward ? lerp(it.lo, it.hi, f) : lerp(it.hi, it.lo, f)) * DEG;
          const rTop = it.inward ? tb.r[0] : tb.r[1], rBot = it.inward ? tb.r[1] : tb.r[0];
          P.push([rBot * Math.sin(th), rBot * Math.cos(th), zf], [rTop * Math.sin(th), rTop * Math.cos(th), zf]);
          U.push([lerp(u0, u1, f), vBot], [lerp(u0, u1, f), vTop]);
        }
        addGrid(Bx, P, P.map(() => [0, 0, -1]), U, nseg + 1, 2);
      });
      add(object, Bx.geo(), decalMaterial(M.steelSatin, tex, tb.colour, 0.55, 0.5), { cast: false, receive: false });
    }
    const a = 225 * DEG, rr = 16.6;
    reg.add({
      id: 'caseback-ring', name: 'Screw-down case back', category: 'case', side: 'back', exposed: true,
      object, explode: X('caseback-ring'), explodeDelay: D('caseback-ring'), priority: 2,
      anchor: [rr * Math.sin(a), rr * Math.cos(a), ZBACK],
      description: 'The polished titanium back screws into the middle case with a gasket — the six notches take the case-maker’s wrench. Its flat band is engraved with the water resistance, case code and serial number; a serrated ring frames the sapphire window onto the 9R65.',
      facts: {
        Fitting: 'Screw-down, 6 wrench notches', 'Clear window': `Ø ${(gl.apertureRadius * 2).toFixed(1)} mm`,
        'Case code': spec.caseCode, Serial: spec.caseSerial, Material: C.material,
      },
    });
  }

  // ================================================================ case back glass
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const gl = C.caseback.glass, R = gl.radius - 0.02, [z0, z1] = gl.z, b = 0.04;
    const B = new Builder();
    const all = fullTurn(128);
    addLathe(B, [[0, z0], [R - b, z0]], all);
    addLathe(B, [[R - b, z0], [R, z0 + b]], all);
    addLathe(B, [[R, z0 + b], [R, z1 - b]], all);
    addLathe(B, [[R, z1 - b], [R - b, z1]], all);
    addLathe(B, [[R - b, z1], [0, z1]], all);
    const mesh = add(object, B.geo(), glass, { cast: false, receive: false });
    mesh.renderOrder = 2;
    reg.add({
      id: 'caseback-glass', name: 'Sapphire display back', category: 'case', side: 'back', exposed: true,
      object, explode: X('caseback-glass'), explodeDelay: D('caseback-glass'), priority: 2,
      anchor: [7, 6, z0],
      description: 'A sapphire window in the screw-down back: through it you watch the rotor with its navy GS logo, the striped bridges and the glide wheel of the Tri-synchro Regulator spinning eight times a second.',
      facts: { Material: 'Synthetic sapphire', Diameter: `${(gl.radius * 2).toFixed(1)} mm`, Thickness: `${(z1 - z0).toFixed(1)} mm`, 'Clear window': `Ø ${(gl.apertureRadius * 2).toFixed(1)} mm` },
    });
  }

  if (lite) return; // the watch box draws its own band: no spring bars, bracelet or clasp

  // ================================================================ spring bars
  {
    const object = new THREE.Group();
    root.add(object);
    const rb = SB.barRadius, tip = SB.holeRadius - 0.08, xb = XIN - 0.04, xt = XIN + 1.2;
    const B = new Builder();
    const all = fullTurn(28);
    addLathe(B, [[0.001, -xt], [tip, -xt + 0.06]], all);
    addLathe(B, [[tip, -xt + 0.06], [tip, -xb]], all);
    addLathe(B, [[tip, -xb], [rb - 0.08, -xb]], all);
    addLathe(B, [[rb - 0.08, -xb], [rb, -xb + 0.08], [rb, xb - 0.08], [rb - 0.08, xb]], all);
    addLathe(B, [[rb - 0.08, xb], [tip, xb]], all);
    addLathe(B, [[tip, xb], [tip, xt - 0.06]], all);
    addLathe(B, [[tip, xt - 0.06], [0.001, xt]], all);
    const g = B.geo();
    g.rotateY(Math.PI / 2);
    add(object, mergeAll([g.clone().translate(0, SB.y, SB.z), g.clone().translate(0, -SB.y, SB.z)]), M.steelSatin);
    reg.add({
      id: 'spring-bars', name: 'Spring bars', category: 'case', side: 'both', exposed: false,
      object, explode: X('spring-bars'), explodeDelay: D('spring-bars'), priority: 3,
      anchor: [0, SB.y, SB.z],
      description: 'Spring-loaded bars through the bracelet’s end links. Their tips sit in the holes drilled through the lugs, so a pin pushed in from the side of the lug frees the bracelet.',
      facts: { Diameter: `${(rb * 2).toFixed(1)} mm`, Length: `${C.lugWidth} mm between the lugs` },
    });
  }

  // ================================================================ bracelet
  const bc = C.bracelet;
  const T = bc.thickness, P = bc.pitch, G = BR.gap;
  const A0 = [TIPY + 0.2, SB.z - 0.15]; // first hinge, just past the lug tips
  const rowsAt = (f) => {
    const w = bc.rows; // outer, middle (polished), centre — |x| bands at the end link, scaled
    const o = w.find((r) => r.name === 'outer'), m = w.find((r) => r.name === 'middle'), c = w.find((r) => r.name === 'centre');
    return { outer: [o.x[0] * f + 0.03, o.x[1] * f - 0.05], middle: [m.x[0] * f + 0.03, m.x[1] * f - 0.03], centre: c.x[1] * f - 0.03 };
  };
  const makePath = (sgn, th1, L) => {
    const step = 0.05, n = Math.ceil(L / step) + 2, sBend = P / 2 + 0.6;
    const th = (s) => (s <= sBend ? BR.th0 : BR.th0 + (th1 - BR.th0) * Math.pow(Math.min(1, (s - sBend) / (L - sBend)), 1.35));
    const Ys = new Float64Array(n + 1), Zs = new Float64Array(n + 1);
    Ys[0] = sgn * A0[0];
    Zs[0] = A0[1];
    for (let i = 1; i <= n; i++) {
      const t = th((i - 0.5) * step);
      Ys[i] = Ys[i - 1] + sgn * Math.cos(t) * step;
      Zs[i] = Zs[i - 1] + Math.sin(t) * step;
    }
    const at = (s) => {
      const f = clamp(s / step, 0, n - 1e-6), i = Math.floor(f), k = f - i;
      return [Ys[i] + (Ys[i + 1] - Ys[i]) * k, Zs[i] + (Zs[i + 1] - Zs[i]) * k];
    };
    // rigid piece between arc lengths sa and sb: basis (A, Tg, N) and midpoint
    const frame = (sa, sb) => {
      const a = at(sa), b = at(sb), dy = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dy, dz);
      const Tg = new THREE.Vector3(0, dy / l, dz / l);
      const N = new THREE.Vector3(0, -sgn * Tg.z, sgn * Tg.y);
      const A = new THREE.Vector3(sgn, 0, 0);
      return { m: new THREE.Matrix4().makeBasis(A, Tg, N).setPosition(0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2), len: l };
    };
    return { at, frame };
  };
  const totalL = (BR.top.links + 1) * P;
  const widthF = (s) => lerp(bc.width - 0.1, bc.widthAtClasp + 0.6, clamp(s / totalL, 0, 1)) / bc.width;
  const OB = builders('brushed', 'mirror', 'dark');
  const uvLink = (x, y, z, cap) => (cap ? [y * UVS, z * UVS] : [y * UVS, x * UVS]);
  const NARC = 4;
  const k = NARC;
  // loop runs: right end (BR+TR arcs), top, left end (TL+BL arcs), bottom
  const linkRuns = [{ a: 0, b: 2 * k + 1 }, { a: 2 * k + 1, b: 2 * k + 2 }, { a: 2 * k + 2, b: 4 * k + 3 }, { a: 4 * k + 3, b: 4 * k + 4 }];
  const linkPiece = (geoOut, len, xa, xb, kind, bevelSide = 0) => {
    // kind: 'outer' (brushed, polished ends + polished edge bevel), 'centre', 'thin' (all polished)
    const zt = T / 2, zb = -T / 2, rc = kind === 'thin' ? BR.thinRc : BR.rc;
    const full = rrLoop(len, zt, zb, rc, NARC);
    const EB = bc.edgeBevel.width;
    const low = rrLoop(len, zt - EB, zb, rc, NARC);
    let groups;
    if (bevelSide > 0) groups = [[{ x: xa, pts: full }, { x: xb - EB, pts: full }], [{ x: xb - EB, pts: full }, { x: xb, pts: low }]];
    else if (bevelSide < 0) groups = [[{ x: xa, pts: low }, { x: xa + EB, pts: full }], [{ x: xa + EB, pts: full }, { x: xb, pts: full }]];
    else groups = [[{ x: xa, pts: full }, { x: xb, pts: full }]];
    const bevelGroup = bevelSide > 0 ? 1 : bevelSide < 0 ? 0 : -1;
    loftX(geoOut, groups, linkRuns, (g, r) => {
      if (kind === 'thin') return 'mirror';
      if (r === 1) return g === bevelGroup ? 'mirror' : 'brushed';
      if (r === 0 || r === 2) return 'mirror';
      return 'brushed';
    }, kind === 'thin' ? 'mirror' : 'brushed', uvLink);
  };
  // one link row placed between path arc lengths [sa, sb]
  const placeRow = (path, sa, sb, f, which) => {
    const { m, len } = path.frame(sa, sb);
    const rows = rowsAt(f);
    const tmp = builders('brushed', 'mirror', 'dark');
    const L = len - G;
    if (which === 'outer') {
      linkPiece(tmp, L, rows.outer[0], rows.outer[1], 'outer', 1);
      linkPiece(tmp, L, -rows.outer[1], -rows.outer[0], 'outer', -1);
      // pin heads on the outer faces at both hinges
      for (const sx of [-1, 1]) {
        for (const yy of [-L / 2 + 0.75, L / 2 - 0.75]) {
          const NP = 10, cx = sx * (rows.outer[1] + 0.004), ids = [];
          for (let q = 0; q < NP; q++) { const a = (q / NP) * TAU; ids.push(tmp.dark.v([cx, yy + 0.3 * Math.cos(a), -0.35 + 0.3 * Math.sin(a)], [sx, 0, 0])); }
          for (let q = 1; q < NP - 1; q++) tmp.dark.tri(ids[0], ids[q], ids[q + 1]);
        }
      }
    } else {
      linkPiece(tmp, L, rows.middle[0], rows.middle[1], 'thin');
      linkPiece(tmp, L, -rows.middle[1], -rows.middle[0], 'thin');
      linkPiece(tmp, L, -rows.centre, rows.centre, 'centre');
    }
    for (const key of Object.keys(tmp)) {
      if (tmp[key].empty) continue;
      const g = tmp[key].geo();
      g.applyMatrix4(m);
      (OB[`list_${key}`] || (OB[`list_${key}`] = [])).push(g);
    }
  };
  const paths = {};
  for (const [name, sgn, cfg] of [['top', 1, BR.top], ['bottom', -1, BR.bottom]]) {
    const L = (cfg.links + 1) * P + (name === 'bottom' ? CLASP.len + 2 : 0);
    const path = makePath(sgn, cfg.th1, L);
    paths[name] = path;
    for (let i = 0; i < cfg.links; i++) placeRow(path, i * P, (i + 1) * P, widthF((i + 0.5) * P), 'outer');
    // centre units are staggered by half a pitch; the last one runs on to end flush with the outer links
    for (let i = 0; i < cfg.links - 1; i++) {
      const sb = i === cfg.links - 2 ? cfg.links * P : (i + 1.5) * P;
      placeRow(path, (i + 0.5) * P, sb, widthF((i + 1) * P), 'centre');
    }
  }

  // ---- solid end links, shaped to the round case between the lugs
  {
    const EL_CLEAR = 0.05, XEL = XIN - 0.05, EL_ZB0 = ZMB + 0.3;
    const th0 = BR.th0, tn = Math.tan(th0);
    const yCase = (x, z) => Math.sqrt(Math.max(0, Rcase(z) ** 2 - x * x)) + EL_CLEAR;
    // end-link top: just under the lug's inner top edge (reaching up to the bezel seam at the
    // case), flattening into the bracelet's top line
    const barTop = (y) => A0[1] + (T / 2) * Math.cos(th0) + (y - (A0[0] - (T / 2) * Math.sin(th0))) * tn;
    const barBot = (y) => A0[1] - (T / 2) * Math.cos(th0) + (y - (A0[0] + (T / 2) * Math.sin(th0))) * tn;
    const zTopEdge = (y) => smax(Pin(y) - lerp(0.03, INNER_CH, smooth(yJ, yJ + 1.6, y)), barTop(y), 0.25);
    let EL_Z0 = 2.6;
    for (let it = 0; it < 3; it++) EL_Z0 = zTopEdge(yCase(XEL, EL_Z0));
    const y0e = yCase(XEL, EL_Z0);
    const NT = 22, NBt = 10, NCe = 18;
    const loopAt = (x, sEnd) => {
      const y0 = yCase(x, EL_Z0), dl = y0 - y0e, y0b = yCase(x, EL_ZB0);
      const zTop = (y) => zTopEdge(y - dl * (1 - smooth(y0, 24.4, y)));
      const zBot = (y) => (y >= 21.6 ? barBot(y) : lerp(EL_ZB0, barBot(21.6), smooth(y0b, 21.6, y)));
      const E0 = [A0[0] + sEnd * Math.cos(th0), A0[1] + sEnd * Math.sin(th0)];
      const yEnd = (z) => E0[0] - (z - E0[1]) * tn;
      let yte = E0[0];
      for (let it = 0; it < 5; it++) yte = yEnd(zTop(yte));
      const zte = zTop(yte), ch = 0.2;
      let ybe = E0[0];
      for (let it = 0; it < 5; it++) ybe = yEnd(zBot(ybe));
      const pts = [];
      for (let j = 0; j <= NT; j++) { const y = lerp(y0, yte - ch, j / NT); pts.push([y, zTop(y)]); }
      pts.push([yEnd(zte - ch), zte - ch]);
      pts.push([ybe, zBot(ybe)]);
      for (let j = 1; j <= NBt; j++) { const y = lerp(ybe, y0b, j / NBt); pts.push([y, zBot(y)]); }
      for (let j = 1; j < NCe; j++) { const z = lerp(EL_ZB0, EL_Z0, j / NCe); pts.push([yCase(x, z), z]); }
      return pts;
    };
    const n = NT + 1 + 2 + NBt + NCe - 1;
    const runs = [{ a: 0, b: NT }, { a: NT, b: NT + 1 }, { a: NT + 1, b: NT + 2 }, { a: NT + 2, b: NT + 2 + NBt }, { a: NT + 2 + NBt, b: n }];
    const r0 = rowsAt(1);
    const pieces = [
      { xa: r0.outer[0], xb: XEL, sEnd: -G / 2, kind: 'outer', ns: 20 },
      { xa: -XEL, xb: -r0.outer[0], sEnd: -G / 2, kind: 'outer', ns: 20 },
      { xa: r0.middle[0], xb: r0.middle[1], sEnd: P / 2 - G / 2, kind: 'thin', ns: 5 },
      { xa: -r0.middle[1], xb: -r0.middle[0], sEnd: P / 2 - G / 2, kind: 'thin', ns: 5 },
      { xa: -r0.centre, xb: r0.centre, sEnd: P / 2 - G / 2, kind: 'centre', ns: 30 },
    ];
    const tmp = builders('brushed', 'mirror');
    for (const pc of pieces) {
      const sl = [];
      for (let j = 0; j < pc.ns; j++) { const x = lerp(pc.xa, pc.xb, j / (pc.ns - 1)); sl.push({ x, pts: loopAt(x, pc.sEnd) }); }
      loftX(tmp, [sl], runs, (g, r) => (pc.kind === 'thin' || r === 1 ? 'mirror' : 'brushed'), pc.kind === 'thin' ? 'mirror' : 'brushed', (x, y, z, cap) => (cap ? [y * UVS, z * UVS] : [y * UVS, x * UVS]));
    }
    for (const key of ['brushed', 'mirror']) {
      const g = tmp[key].geo();
      (OB[`list_${key}`] || (OB[`list_${key}`] = [])).push(g, mirrored(g, false, true));
    }
  }
  {
    const object = new THREE.Group();
    root.add(object);
    add(object, mergeAll(OB.list_brushed), brushed);
    add(object, mergeAll(OB.list_mirror), mirror);
    if (OB.list_dark) add(object, mergeAll(OB.list_dark), holeMat, { cast: false });
    const a = paths.top.at(2.5 * P);
    reg.add({
      id: 'bracelet', name: 'Titanium bracelet', category: 'case', side: 'both', exposed: true,
      object, explode: X('bracelet'), explodeDelay: D('bracelet'), priority: 2,
      anchor: [0, a[0], a[1] + T / 2],
      description: 'A three-link bracelet in high-intensity titanium, five pieces across: hairline-brushed outer and centre links with thin Zaratsu-polished links between them, and polished bevels along the edges. It tapers from 20 mm at the lugs to 16 mm at the clasp; the links are held by pins.',
      facts: { Material: C.material, Width: `${bc.width} → ${bc.widthAtClasp} mm`, 'Link pitch': `≈ ${bc.pitch} mm`, Finish: 'Brushed, with polished intermediate links', Length: `${bc.perimeter} mm round` },
    });
  }

  // ================================================================ three-fold clasp
  {
    const path = paths.bottom;
    const s0 = BR.bottom.links * P + G / 2;
    const { m } = path.frame(s0, s0 + CLASP.len);
    const object = new THREE.Group();
    const a = path.at(s0), b = path.at(s0 + CLASP.len);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    object.position.set(0, mid[0], mid[1]);
    object.quaternion.setFromRotationMatrix(m);
    root.add(object);
    const cl = bc.clasp, Lc = CLASP.len, wc = cl.cover.width / 2;
    const ctop = CLASP.top, cbev = CLASP.coverBevel, cdep = CLASP.coverT;
    const panelW = (cl.logo.panelWidthFrac * cl.cover.width) / 2, panelH = CLASP.panelH / 2;
    // cover with the recessed panel (its polished bevelled walls frame the logo)
    const shape = new THREE.Shape(roundRect(0, 0, wc - cbev, Lc / 2 - cbev, 1.2, 6).map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes.push(new THREE.Path(roundRect(0, 0, panelW + cbev, panelH + cbev, 1.0, 5).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
    const cov = new THREE.ExtrudeGeometry(shape, { depth: cdep, bevelEnabled: true, bevelThickness: cbev, bevelSize: cbev, bevelSegments: 2, curveSegments: 6 });
    cov.translate(0, 0, ctop - cdep - cbev);
    const [lids, walls] = splitExtrude(cov);
    add(object, lids, brushed);
    add(object, walls, mirror);
    const Bf = new Builder();
    const zPanel = ctop - 0.32;
    addPolygon(Bf, roundRect(0, 0, panelW + cbev + 0.05, panelH + cbev + 0.05, 1.0, 5), (x, y) => [x, y, zPanel], [0, 0, 1], (x, y) => [y * UVS, x * UVS]);
    add(object, Bf.geo(), frosted);
    {
      const relief = 0.2, bev = 0.04;
      const g = new THREE.ExtrudeGeometry(opsToShapes(THREE, gsMonogramOps(panelH * 2 * 0.62)), { depth: relief - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: 0.04, bevelSegments: 1, curveSegments: 4 });
      g.rotateZ(Math.PI); // reads upright looking at the clasp from outside, watch head above (ltF_11)
      g.translate(0, 0, zPanel + bev - 0.01);
      add(object, g, mirror);
    }
    // folded blades under the cover, hinge knuckles, the two push buttons
    const blades = [];
    for (let i = 0; i < CLASP.blades; i++) {
      const sh = new THREE.Shape(roundRect(0, 0, wc - 0.35 - i * 0.15, Lc / 2 - 0.4, 0.9, 5).map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.62, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1, curveSegments: 5 });
      g.translate(0, 0, ctop - cdep - 2 * cbev - 0.12 - (i + 1) * 0.95);
      blades.push(g);
    }
    for (const yy of [-Lc / 2 + 0.55, Lc / 2 - 0.55]) {
      const strip = [[0.65, -wc + 0.5], [0.65, wc - 0.5]];
      const tb = new Builder();
      addLathe(tb, strip, fullTurn(20));
      const g = tb.geo();
      g.rotateY(Math.PI / 2);
      g.translate(0, yy, ctop - cdep - 2 * cbev - 1.3);
      blades.push(g);
    }
    add(object, mergeAll(blades), brushed);
    const pushers = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Shape(roundRect(0, 0, 1.5, 0.62, 0.4, 4).map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2, curveSegments: 4 });
      g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, sx, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(sx, 0, 0)).setPosition(sx * (wc - 0.25), 0, ctop - cdep - 1.0));
      pushers.push(g);
    }
    add(object, mergeAll(pushers), mirror);
    // blade engraving (inside, against the wrist), as on ltF_13
    {
      const lines = cl.bladeEngraving.map((s) => s.replace('TITANIUM-TITANIUM', 'TITANIUM+TITANIUM'));
      const cv = canvasOf(1024, 360);
      const font = FONT(400, 90);
      const draw = () => {
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = FONT(500, 110);
        g.fillText(lines[0], 512, 70);
        g.font = FONT(400, 70);
        g.fillText(lines[1], 512, 190);
        g.fillText(lines[2], 512, 290);
      };
      draw();
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      whenFontReady(font, () => { draw(); tex.needsUpdate = true; });
      const zb = ctop - cdep - 2 * cbev - 0.12 - CLASP.blades * 0.95 - 0.08 - 0.004;
      const hw = 3.2, hl = 9.1 / 2;
      const Bx = new Builder();
      const pts = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]];
      const ids = pts.map(([x, y]) => Bx.v([x, y, zb], [0, 0, -1], [(y + hl) / (2 * hl), (x + hw) / (2 * hw)]));
      Bx.quad(ids[0], ids[1], ids[2], ids[3]);
      add(object, Bx.geo(), decalMaterial(M.steelSatin, tex, C.colours.engraving, 0.6, 0.5), { cast: false, receive: false });
    }
    reg.add({
      id: 'clasp', name: 'Three-fold clasp', category: 'case', side: 'both', exposed: true,
      object, explode: X('clasp'), explodeDelay: D('clasp'), priority: 2,
      anchor: [0, 0, ctop],
      description: 'A three-fold titanium clasp: two hinged blades fold away under the brushed cover, which carries a raised, polished GS in a recessed panel. Pressing the two side buttons releases it.',
      facts: { Type: cl.type, Cover: `${cl.cover.length} × ${cl.cover.width} mm, brushed`, Engraving: cl.bladeEngraving.join(' / ') },
    });
  }
}
