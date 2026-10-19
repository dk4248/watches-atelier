// CASE of the Tudor Black Bay Pro ref. M79470-0004 ("Opaline"): the 39 mm 316L middle case
// with its four lugs (one swept outline: mirror-polished flanks, a polished bevel running
// from lug tip to lug tip, satin lug tops brushed along 12–6), the fixed 24-hour bezel
// (radially brushed top, engraved and black-filled numerals drawn as vector strokes), the
// box-domed sapphire crystal, the plain grey rehaut, the screw-down crown with the Tudor
// rose in relief, the solid screw-down case back (coin-edge knurl, engraved ring), the
// riveted three-row bracelet with its stepped outer links, the T-fit clasp and the
// spring bars.
//
// Every position, level and outline comes from SPEC.case / SPEC.bracelet / SPEC.z; the
// module-local constants below are cosmetic (fillets, sampling, finish parameters).
// Frame: mm, +Z out of the dial, 12 o'clock = +Y, crown (3 o'clock) = +X.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { roseRegions, ROSE, regionsToShapes, shieldRegions, drawRegions } from './glyphs.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------------ cosmetics (module-local)
const BRUSH_TILE = 4.0; // mm covered by one tile of the brushed-steel maps
const SATIN_TONE = 0.7; // satin reflects a blurred studio: darker F0 than polished (press image: mid grey)
const DEPARTURE_FILLET = 4.0; // concave plan fillet where a lug's outer edge leaves the round flank
const INNER_FILLET = 0.6; // concave plan fillet: lug inner face → flank between the lugs
const INNER_TIP_ROUND = 0.25; // plan round on the inner corner of a lug tip
const LUG_BOTTOM_BREAK = 0.3; // polished chamfer along the lower outer edge of a lug
const BEZEL_FOOT_CHAMFER = 0.06; // bezel's lower outer edge (reads as a dark parting line)
const SEAT_BLEND = [19.35, 20.4]; // r range where the lug-top profile blends into the bezel seat
const CRYSTAL_GAP = 0.01;
const FLANGE_BACK_R = 16.0; // SPEC-REQUEST case.flange.backRadius: outer wall of the rehaut ring, inside the case bore
const CASE_LOWER_BORE = 16.4; // SPEC-REQUEST case.middle.lowerBore: case-back thread seat at the bottom of the middle case
const CASE_LEDGE_Z = -3.9; // SPEC-REQUEST case.middle.lowerBoreTopZ: top of that seat (r 16.05–16.4, outside the Ø31.8 plates)
const CASEBACK_WALL_R = 15.95; // SPEC-REQUEST case.caseback.inner.wallRadius: inside wall of the solid back (rotor r 15.3 clears)
const LIFT = 0.004; // engraving fills / decals above their surface
const GLYPH_CORNER = 0.25; // centreline corner radius of the squarish bezel digits
const CROWN_BASE_CHAMFER = 0.25; // conical chamfer at the case end of the flutes (x)
const CROWN_TOP_FRACTION = 0.44; // flat flute top, fraction of the flute pitch
const BRACELET_JOINT_GAP = 0.12; // gap between consecutive links along the bracelet
const BRACELET_ROW_GAP = 0.08; // gap between centre and outer rows (reads as a dark line)
const RIVET_PANEL_DEPTH = 0.06; // recess of the panel inside the polished side rim

// ================================================================== geometry helpers

function makeGeo(pos, uv, idx, nor) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (idx) g.setIndex(idx);
  if (!nor) g.computeVertexNormals();
  return g;
}

function flipIndex(geo) {
  if (!geo.index) {
    const p = geo.attributes.position;
    const attrs = Object.values(geo.attributes);
    for (let t = 0; t < p.count; t += 3) {
      for (const a of attrs) {
        for (let k = 0; k < a.itemSize; k++) {
          const v1 = a.array[(t + 1) * a.itemSize + k];
          a.array[(t + 1) * a.itemSize + k] = a.array[(t + 2) * a.itemSize + k];
          a.array[(t + 2) * a.itemSize + k] = v1;
        }
      }
    }
    for (const a of attrs) a.needsUpdate = true;
    return geo;
  }
  const ix = geo.index.array;
  for (let t = 0; t < ix.length; t += 3) {
    const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp;
  }
  geo.index.needsUpdate = true;
  return geo;
}

// Make the faces of an indexed geometry point along expect(x, y, z) on average.
function orient(geo, expect, recompute = true) {
  const p = geo.attributes.position.array, ix = geo.index.array;
  let s = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const e = expect((p[a] + p[b] + p[c]) / 3, (p[a + 1] + p[b + 1] + p[c + 1]) / 3, (p[a + 2] + p[b + 2] + p[c + 2]) / 3);
    s += nx * e[0] + ny * e[1] + nz * e[2];
  }
  if (s < 0) flipIndex(geo);
  if (recompute) geo.computeVertexNormals();
  return geo;
}

// Merge geometries that may mix indexed / non-indexed sources (position, normal, uv only).
function mergeAll(list) {
  const src = list.filter(Boolean);
  if (!src.length) return null;
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

function gridIndex(nu, nv, closeU, closeV) {
  const idx = [];
  const cu = closeU ? nu : nu - 1, cv = closeV ? nv : nv - 1;
  for (let i = 0; i < cu; i++) {
    for (let j = 0; j < cv; j++) {
      const i1 = (i + 1) % nu, j1 = (j + 1) % nv;
      const a = i * nv + j, b = i1 * nv + j, c = i * nv + j1, d = i1 * nv + j1;
      idx.push(a, b, c, b, d, c);
    }
  }
  return idx;
}

// Surface of revolution about +Z (139 convention): each strip is a polyline of [r, z]
// points ordered so the solid lies on the LEFT of the direction of travel; strips meet
// at crisp edges. `angles` (closed list, radians) replaces the uniform sweep when given.
// UV: u = sweep fraction × uScale, v = length along the strip × vScale (swapUV swaps them).
function latheZ(strips, segs, { a0 = 0, a1 = TAU, angles = null, uScale = 1, vScale = 1, swapUV = false, uvFn = null } = {}) {
  const pos = [], nor = [], uv = [], idx = [];
  let base = 0;
  const ang = angles ? [...angles, angles[0] + TAU] : Array.from({ length: segs + 1 }, (_, k) => a0 + (k / segs) * (a1 - a0));
  const K = ang.length - 1;
  for (const s of strips) {
    const n = s.length;
    const nr = [];
    const len = [0];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      if (i > 0) {
        const dr = s[i][0] - s[i - 1][0], dz = s[i][1] - s[i - 1][1];
        const l = Math.hypot(dr, dz) || 1;
        x += dz / l; y -= dr / l;
        len.push(len[i - 1] + l);
      }
      if (i < n - 1) {
        const dr = s[i + 1][0] - s[i][0], dz = s[i + 1][1] - s[i][1];
        const l = Math.hypot(dr, dz) || 1;
        x += dz / l; y -= dr / l;
      }
      const l = Math.hypot(x, y) || 1;
      nr.push([x / l, y / l]);
    }
    for (let k = 0; k <= K; k++) {
      const a = ang[k], c = Math.cos(a), sn = Math.sin(a);
      for (let i = 0; i < n; i++) {
        const X = s[i][0] * c, Y = s[i][0] * sn, Zz = s[i][1];
        pos.push(X, Y, Zz);
        nor.push(nr[i][0] * c, nr[i][0] * sn, nr[i][1]);
        if (uvFn) uv.push(...uvFn(X, Y, Zz, k / K, len[i]));
        else if (swapUV) uv.push(len[i] * vScale, (k / K) * uScale);
        else uv.push((k / K) * uScale, len[i] * vScale);
      }
    }
    for (let k = 0; k < K; k++) {
      for (let i = 0; i < n - 1; i++) {
        const a = base + k * n + i, b = base + (k + 1) * n + i;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    base += (K + 1) * n;
  }
  return makeGeo(pos, uv, idx, nor);
}

// lathe about +X (crown, rivets, spring bars): built about Z, then Z → X
function latheX(strips, segs, opts) {
  const g = latheZ(strips, segs, opts);
  g.rotateY(Math.PI / 2); // (x, y, z) → (z, y, −x): the lathe axis becomes +X
  return g;
}

// Re-centred centripetal Catmull–Rom through 2-D points with imposed end tangents,
// densely sampled and resampled to `count` points evenly spaced by arc length.
function smoothCurve(pts, count, startTan = null, endTan = null) {
  const P = pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
  const d0 = P[1].distanceTo(P[0]), d1 = P[P.length - 1].distanceTo(P[P.length - 2]);
  const pre = startTan ? P[0].clone().sub(new THREE.Vector3(startTan[0], startTan[1], 0).normalize().multiplyScalar(d0)) : P[0].clone().multiplyScalar(2).sub(P[1]);
  const post = endTan ? P[P.length - 1].clone().add(new THREE.Vector3(endTan[0], endTan[1], 0).normalize().multiplyScalar(d1)) : P[P.length - 1].clone().multiplyScalar(2).sub(P[P.length - 2]);
  const curve = new THREE.CatmullRomCurve3([pre, ...P, post], false, 'centripetal');
  const nSeg = P.length + 1;
  const t0 = 1 / nSeg, t1 = (nSeg - 1) / nSeg;
  const dense = [];
  const N = 400;
  for (let i = 0; i <= N; i++) {
    const v = curve.getPoint(t0 + ((t1 - t0) * i) / N);
    dense.push([v.x, v.y]);
  }
  return resample(dense, count);
}

function resample(dense, count) {
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = cum[cum.length - 1];
  const out = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const s = (total * k) / (count - 1);
    while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push([lerp(dense[j][0], dense[j + 1][0], f), lerp(dense[j][1], dense[j + 1][1], f)]);
  }
  return out;
}

// Monotone cubic (Fritsch–Carlson) through [x, y] pairs sorted by x; clamped outside.
function monotone(pts) {
  const n = pts.length;
  const x = pts.map((p) => p[0]), y = pts.map((p) => p[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (v) => {
    if (v <= x[0]) return y[0];
    if (v >= x[n - 1]) return y[n - 1];
    let i = 0;
    while (v > x[i + 1]) i++;
    const h = x[i + 1] - x[i], t = (v - x[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// A collector for indexed geometry with optional vertex sharing by key.
class Builder {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; this.keys = new Map(); }
  vert(p, n, u, key) {
    if (key !== undefined && this.keys.has(key)) return this.keys.get(key);
    const i = this.pos.length / 3;
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.uv.push(u[0], u[1]);
    if (key !== undefined) this.keys.set(key, i);
    return i;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  // triangle wound so its face normal agrees with the vertex normals
  triOriented(a, b, c) {
    const P = this.pos, N = this.nor;
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
    const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const nx = N[a * 3] + N[b * 3] + N[c * 3], ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
    if (fx * nx + fy * ny + fz * nz >= 0) this.idx.push(a, b, c); else this.idx.push(a, c, b);
  }
  get empty() { return this.idx.length === 0; }
  geometry() { return this.empty ? null : makeGeo(this.pos, this.uv, this.idx, this.nor); }
}

// Fillet the corners of a polyline: radius per vertex (0 = sharp), nArc segments per arc.
function filletPath(P, rad, closed, nArc = 6) {
  const n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const isEnd = !closed && (i === 0 || i === n - 1);
    let r = isEnd ? 0 : Array.isArray(rad) ? rad[i] : rad;
    const p = P[i];
    if (!r) { out.push(p); continue; }
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
    let u1x = p[0] - a[0], u1y = p[1] - a[1];
    let u2x = b[0] - p[0], u2y = b[1] - p[1];
    const l1 = Math.hypot(u1x, u1y), l2 = Math.hypot(u2x, u2y);
    u1x /= l1; u1y /= l1; u2x /= l2; u2y /= l2;
    const turn = Math.acos(clamp(u1x * u2x + u1y * u2y, -1, 1));
    if (turn < 1e-3) { out.push(p); continue; }
    let tl = r * Math.tan(turn / 2);
    const maxT = 0.5 * Math.min(l1, l2);
    if (tl > maxT) { tl = maxT; r = tl / Math.tan(turn / 2); }
    const s = [p[0] - u1x * tl, p[1] - u1y * tl], e = [p[0] + u2x * tl, p[1] + u2y * tl];
    const left = u1x * u2y - u1y * u2x > 0;
    const nx = left ? -u1y : u1y, ny = left ? u1x : -u1x;
    const c = [s[0] + nx * r, s[1] + ny * r];
    const A0 = Math.atan2(s[1] - c[1], s[0] - c[0]);
    let dA = Math.atan2(e[1] - c[1], e[0] - c[0]) - A0;
    while (dA > Math.PI) dA -= TAU;
    while (dA < -Math.PI) dA += TAU;
    for (let k = 0; k <= nArc; k++) out.push([c[0] + r * Math.cos(A0 + (dA * k) / nArc), c[1] + r * Math.sin(A0 + (dA * k) / nArc)]);
  }
  return out;
}

// Stroke a centreline (monoline engraving swept by a cutter of radius hw): one quad per
// segment, a round join at every interior vertex, butt ends. Pushes CCW 2-D triangles.
function strokeTris(pts, closed, hw, out, joinSegs = 12) {
  const n = pts.length;
  const push = (a, b, c) => {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (Math.abs(area) < 1e-12) return;
    if (area > 0) out.push(a, b, c); else out.push(a, c, b);
  };
  const segN = closed ? n : n - 1;
  for (let i = 0; i < segN; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
    if (l < 1e-9) continue;
    const nx = (-dy / l) * hw, ny = (dx / l) * hw;
    const a = [p[0] + nx, p[1] + ny], b = [p[0] - nx, p[1] - ny], c = [q[0] - nx, q[1] - ny], d = [q[0] + nx, q[1] + ny];
    push(a, b, c); push(a, c, d);
  }
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) continue;
    const c = pts[i];
    for (let k = 0; k < joinSegs; k++) {
      const a0 = (k / joinSegs) * TAU, a1 = ((k + 1) / joinSegs) * TAU;
      push(c, [c[0] + hw * Math.cos(a0), c[1] + hw * Math.sin(a0)], [c[0] + hw * Math.cos(a1), c[1] + hw * Math.sin(a1)]);
    }
  }
}

// Bezel digits: condensed squarish monoline glyphs (DIN/Eurostile-like) as centrelines in a
// w × H box centred on the origin (x = reading direction, y = up). Traced from the 4000 px
// press image (flag-topped 1 without a foot, flat-based 2 with a straight diagonal, closed
// 4, square-bowled 6 and 0, 8 with the smaller upper bowl).
function digitPaths(ch, w, H, hw, nArc) {
  const a = w / 2 - hw, b = H / 2 - hw, rc = GLYPH_CORNER;
  const P = (pts, rad, closed) => ({ pts: filletPath(pts, rad, closed, nArc), closed });
  switch (ch) {
    case '0': return [P([[-a, -b], [a, -b], [a, b], [-a, b]], rc, true)];
    case '1': {
      const xs = w / 2 - hw;
      return [P([[xs - 0.30, b - 0.30], [xs, b], [xs, -H / 2]], [0, 0.03, 0], false)];
    }
    case '2': return [P([[-a, 0.6], [-a, b], [a, b], [a, 0.12], [-a, -0.52], [-a, -b], [w / 2, -b]], [0, rc, rc, 0.26, 0.15, 0.05, 0], false)];
    case '4': {
      const xs = a - 0.3, yb = -0.36;
      return [P([[w / 2, yb], [-a, yb], [xs, b], [xs, -H / 2]], [0, 0.03, 0.03, 0], false)];
    }
    case '6': {
      const ym = 0.1;
      return [P([[a, b - 0.3], [a, b], [-a, b], [-a, -b], [a, -b], [a, ym], [-a, ym]], [0, 0.18, rc, rc, rc, rc, 0], false)];
    }
    case '8': {
      const ym = 0.04, k = 0.08;
      return [
        P([[-a, -b], [a, -b], [a, ym], [-a, ym]], rc, true),
        P([[-a + k, ym], [a - k, ym], [a - k, b], [-a + k, b]], rc - 0.02, true),
      ];
    }
    default: return [];
  }
}

// ------------------------------------------------------------------ brushed-steel maps
// Fine straight brushing: lines run along texture V (vary along U), tiling. The surfaces
// that use them lay out their UVs so U runs ACROSS the brush lines — the tangent frame
// three.js derives from those UVs then also gives the anisotropy direction (highlights
// stretch across the lines, as on real brushed steel).
const _brushCache = new Map();
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function noise1D(period, seed) {
  const r = rng(seed);
  const v = Array.from({ length: period }, () => r());
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const a = v[((i % period) + period) % period], b = v[(((i + 1) % period) + period) % period];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}
function brushedMaps(size) {
  if (_brushCache.has(size)) return _brushCache.get(size);
  // fine scratches (per texel), brushing marks (~0.05 mm) and broad streaks (~0.3 mm) that
  // fade in and out along their length, so the brushing still reads at normal viewing scale
  const nA = noise1D(size, 3), nB = noise1D(size >> 4, 5), nC = noise1D(13, 7), nV = noise1D(6, 9), nW = noise1D(5, 11);
  const h = new Float32Array(size * size);
  for (let x = 0; x < size; x++) {
    const line = nA(x) * 0.3 + nB(x / 16) * 0.35;
    const streak = nC((x * 13) / size);
    for (let y = 0; y < size; y++) {
      const fade = nV((y * 6) / size + (x * 18) / size), fade2 = nW((y * 5) / size + (x * 35) / size);
      h[y * size + x] = line * (0.7 + 0.3 * fade) + streak * 0.35 * (0.5 + 0.5 * fade2);
    }
  }
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cN = mk(), cR = mk();
  const gN = cN.getContext('2d'), gR = cR.getContext('2d');
  const iN = gN.createImageData(size, size), iR = gR.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 1.6, dy = (at(x, y + 1) - at(x, y - 1)) * 1.6;
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * size + x) * 4;
      iN.data[i] = (nx * 0.5 + 0.5) * 255; iN.data[i + 1] = (ny * 0.5 + 0.5) * 255; iN.data[i + 2] = (nz * 0.5 + 0.5) * 255; iN.data[i + 3] = 255;
      const r = clamp(0.84 + (h[y * size + x] - 0.5) * 0.7, 0, 1) * 255;
      iR.data[i] = iR.data[i + 1] = iR.data[i + 2] = r; iR.data[i + 3] = 255;
    }
  }
  gN.putImageData(iN, 0, 0);
  gR.putImageData(iR, 0, 0);
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  const maps = { normalMap: tex(cN), roughnessMap: tex(cR) };
  _brushCache.set(size, maps);
  return maps;
}

// ------------------------------------------------------------------ decals
function decalMaterial(base, texture, color, roughness, metalness) {
  const m = base.clone();
  m.map = texture;
  m.normalMap = null;
  m.roughnessMap = null;
  m.color = new THREE.Color(color);
  m.roughness = roughness;
  m.metalness = metalness;
  if ('anisotropy' in m) m.anisotropy = 0;
  m.transparent = true;
  m.depthWrite = false;
  m.polygonOffset = true;
  m.polygonOffsetFactor = -4;
  m.polygonOffsetUnits = -4;
  m.alphaTest = 0.02;
  return m;
}

// Small straight engraving text (white on transparent) → { texture, w, h } in mm.
function engravingText(text, capH, { font = 'Arial, "Helvetica Neue", Helvetica, Jost, sans-serif', weight = 500, spacing = 0.06 } = {}) {
  const size = 96, pad = 8;
  const c = document.createElement('canvas');
  let g = c.getContext('2d');
  const f = `${weight} ${size}px ${font}`;
  g.font = f;
  const chars = Array.from(text);
  const sp = spacing * size;
  const wPx = chars.reduce((a, ch) => a + g.measureText(ch).width, 0) + sp * (chars.length - 1);
  c.width = Math.ceil(wPx + pad * 2);
  c.height = Math.ceil(size * 1.0 + pad * 2);
  g = c.getContext('2d');
  g.font = f;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  const base = pad + size * 0.86; // caps ≈ 0.72 em above the baseline, centred in the canvas
  let x = pad;
  for (const ch of chars) { g.fillText(ch, x, base); x += g.measureText(ch).width + sp; }
  const mmPerPx = capH / (0.72 * size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // caps centre sits (base − 0.36 em) from the top → offset of the caps centre from the canvas centre
  const capsCentrePx = base - 0.36 * size;
  return { texture: t, w: c.width * mmPerPx, h: c.height * mmPerPx, rise: (c.height / 2 - capsCentrePx) * mmPerPx };
}

// A flat decal quad grid on a surface: centre c, reading direction D and up U (plan
// unit vectors), surface height zFn(x, y) (+ offset), w × h mm, facing ±Z.
function surfaceDecal({ c, D, U, w, h, rise = 0, zFn, face = -1, nu = 12, nv = 3 }) {
  const pos = [], uv = [];
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const s = (i / nu - 0.5) * w, t = (j / nv - 0.5) * h - rise;
      const x = c[0] + D[0] * s + U[0] * t, y = c[1] + D[1] * s + U[1] * t;
      pos.push(x, y, zFn(x, y) + face * LIFT);
      uv.push(i / nu, j / nv);
    }
  }
  return orient(makeGeo(pos, uv, gridIndex(nu + 1, nv + 1, false, false)), () => [0, 0, face]);
}

// ================================================================== the case outline
// The plan outline of the middle case + lugs, CCW seen from the dial, as one closed loop of
// samples. Each sample carries its outward plan normal and the section to sweep there: the
// top break (polished bevel on the outer chain, 0.2 edge break elsewhere) and the bottom
// break. Q1 (3 → 12 o'clock, the upper-right lug) is built from SPEC.case.lug and mirrored.
function buildOutline(C, lite) {
  const md = C.middle, lg = C.lug;
  const R = md.outerRadius;
  const zTop = md.topZ, zFlankTop = md.flankZ[1], zBack = md.bottomZ, zFlankBot = md.flankZ[0];
  const ROUND = { ti: R - md.topBevel[1][0], td: zTop - zFlankTop, bi: R - md.bottomChamfer[0][0], br: zFlankBot - zBack };
  const LUG = { ti: lg.outerBevel.planWidth, td: lg.outerBevel.planWidth, bi: LUG_BOTTOM_BREAK, br: LUG_BOTTOM_BREAK };
  const EB = { ti: lg.endFaceEdgeBreak, td: lg.endFaceEdgeBreak, bi: lg.endFaceEdgeBreak, br: lg.endFaceEdgeBreak };
  const mix = (a, b, t) => ({ ti: lerp(a.ti, b.ti, t), td: lerp(a.td, b.td, t), bi: lerp(a.bi, b.bi, t), br: lerp(a.br, b.br, t) });
  const dens = lite ? 0.6 : 1;
  const cnt = (n) => Math.max(3, Math.round(n * dens));

  const S = (x, y, nx, ny, kind, sec) => ({ x, y, nx, ny, kind, sec });
  const unit = (v) => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
  const P = lg.planOuter;
  const tipY = lg.tipY, xIn = lg.xInner, rc = lg.tipCornerRadius;

  // --- departure fillet (concave) between the round flank and the lug's outer edge
  const e0 = unit([P[1][0] - P[0][0], P[1][1] - P[0][1]]);
  const nOut0 = [e0[1], -e0[0]];
  const rho = DEPARTURE_FILLET;
  const A0 = [P[0][0] + rho * nOut0[0], P[0][1] + rho * nOut0[1]];
  const eA = e0[0] * A0[0] + e0[1] * A0[1];
  const tF = -eA + Math.sqrt(eA * eA - (A0[0] ** 2 + A0[1] ** 2) + (R + rho) ** 2);
  const Tl = [P[0][0] + tF * e0[0], P[0][1] + tF * e0[1]];
  const Cf = [A0[0] + tF * e0[0], A0[1] + tF * e0[1]];
  const Tc = [(Cf[0] * R) / (R + rho), (Cf[1] * R) / (R + rho)];
  const phiDep = Math.atan2(Tc[1], Tc[0]);

  // --- tip corner (r 0.8) between the outer edge's last direction and the square-cut tip
  const iLast = P.findIndex((p) => p[1] >= tipY - 1e-6) - 2; // last measured edge point before the corner
  const P4 = P[Math.max(1, iLast)];
  const d1 = unit([P[iLast + 1][0] - P4[0], P[iLast + 1][1] - P4[1]]);
  const tK = (tipY - P4[1]) / d1[1];
  const K = [P4[0] + tK * d1[0], tipY];
  const turn = Math.acos(clamp(-d1[0], -1, 1)); // between d1 and (−1, 0)
  const tl = rc * Math.tan(turn / 2);
  const Sc = [K[0] - d1[0] * tl, K[1] - d1[1] * tl];
  const Ec = [K[0] - tl, tipY];
  const Cc = [Ec[0], tipY - rc];

  // --- concave fillet between the inner face and the flank between the lugs
  const ri = INNER_FILLET;
  const Cf2 = [xIn - ri, Math.sqrt((R + ri) ** 2 - (xIn - ri) ** 2)];
  const Tc2 = [(Cf2[0] * R) / (R + ri), (Cf2[1] * R) / (R + ri)];
  const phiIn = Math.atan2(Tc2[1], Tc2[0]);
  const rIn = INNER_TIP_ROUND;

  // ---- outer side of the lug: Tc → (fillet) → Tl → spline → P4 → Sc → corner → Ec
  const outer = [];
  {
    const nFil = cnt(6);
    const a0 = Math.atan2(Tc[1] - Cf[1], Tc[0] - Cf[0]);
    let a1 = Math.atan2(Tl[1] - Cf[1], Tl[0] - Cf[0]);
    while (a1 - a0 > Math.PI) a1 -= TAU;
    while (a1 - a0 < -Math.PI) a1 += TAU;
    for (let k = 0; k < nFil; k++) {
      const t = k / (nFil - 1), a = lerp(a0, a1, t);
      const x = Cf[0] + rho * Math.cos(a), y = Cf[1] + rho * Math.sin(a);
      outer.push(S(x, y, (Cf[0] - x) / rho, (Cf[1] - y) / rho, 'outer', mix(ROUND, LUG, smoothstep(0, 1, t))));
    }
    const spl = smoothCurve([Tl, ...P.slice(1, iLast + 1)], cnt(28), e0, d1);
    for (let k = 1; k < spl.length; k++) {
      const p = spl[k], q = spl[Math.min(k + 1, spl.length - 1)], o = spl[k - 1];
      const t = unit(k < spl.length - 1 ? [q[0] - o[0], q[1] - o[1]] : [p[0] - o[0], p[1] - o[1]]);
      outer.push(S(p[0], p[1], t[1], -t[0], 'outer', LUG));
    }
    const nSt = 2;
    for (let k = 1; k <= nSt; k++) {
      const t = k / nSt;
      outer.push(S(lerp(P4[0], Sc[0], t), lerp(P4[1], Sc[1], t), d1[1], -d1[0], 'outer', LUG));
    }
    const nC = cnt(10);
    const b0 = Math.atan2(Sc[1] - Cc[1], Sc[0] - Cc[0]), b1 = Math.PI / 2;
    for (let k = 1; k <= nC; k++) {
      const t = k / nC, a = lerp(b0, b1, t);
      outer.push(S(Cc[0] + rc * Math.cos(a), Cc[1] + rc * Math.sin(a), Math.cos(a), Math.sin(a), 'outer', mix(LUG, EB, smoothstep(0, 1, t))));
    }
  }
  // ---- inner side of the lug: Tc2 → (fillet) → inner face up → inner tip corner → (xIn + rIn, tipY)
  const inner = [];
  {
    const nFil = cnt(6);
    const a0 = Math.atan2(Tc2[1] - Cf2[1], Tc2[0] - Cf2[0]), a1 = 0;
    for (let k = 0; k < nFil; k++) {
      const t = k / (nFil - 1), a = lerp(a0, a1, t);
      const x = Cf2[0] + ri * Math.cos(a), y = Cf2[1] + ri * Math.sin(a);
      inner.push(S(x, y, (Cf2[0] - x) / ri, (Cf2[1] - y) / ri, 'inner', mix(ROUND, EB, smoothstep(0, 1, t))));
    }
    const nIC = cnt(8);
    const nFace = outer.length - nFil - nIC;
    for (let k = 1; k <= nFace; k++) {
      const y = lerp(Cf2[1], tipY - rIn, k / nFace);
      inner.push(S(xIn, y, -1, 0, 'inner', EB));
    }
    const cIC = [xIn + rIn, tipY - rIn];
    for (let k = 1; k <= nIC; k++) {
      const a = lerp(Math.PI, Math.PI / 2, k / nIC);
      inner.push(S(cIC[0] + rIn * Math.cos(a), cIC[1] + rIn * Math.sin(a), Math.cos(a), Math.sin(a), 'inner', EB));
    }
  }
  // ---- tip line interior samples (Ec → (xIn + rIn, tipY)), matched to the lug grid columns
  const M = lite ? 5 : 7;
  const tip = [];
  for (let j = 1; j < M - 1; j++) tip.push(S(lerp(Ec[0], xIn + rIn, j / (M - 1)), tipY, 0, 1, 'tip', EB));
  // ---- round arcs
  const roundArc = (f0, f1, kind, incl0, incl1) => {
    const n = Math.max(2, Math.ceil(Math.abs(f1 - f0) / (TAU / (lite ? 96 : 192))));
    const out = [];
    for (let k = incl0 ? 0 : 1; k <= (incl1 ? n : n - 1); k++) {
      const f = lerp(f0, f1, k / n);
      out.push(S(R * Math.cos(f), R * Math.sin(f), Math.cos(f), Math.sin(f), kind, ROUND));
    }
    return out;
  };
  const r3 = roundArc(0, phiDep, 'round', true, false);
  const r12 = roundArc(phiIn, Math.PI / 2, 'between', false, false);

  const Q1 = [...r3, ...outer, ...tip, ...inner.slice().reverse(), ...r12];
  const outerIdx = outer.map((s) => Q1.indexOf(s));
  const innerIdx = inner.map((s) => Q1.indexOf(s));
  const xf = (fx, fy) => (s) => ({ ...s, x: fx * s.x, y: fy * s.y, nx: fx * s.nx, ny: fy * s.ny });
  const quads = [xf(1, 1), xf(-1, 1), xf(-1, -1), xf(1, -1)].map((f) => Q1.map(f));
  const p90 = S(0, R, 0, 1, 'between', ROUND), p270 = S(0, -R, 0, -1, 'between', ROUND);
  const loop = [
    ...quads[0], p90, ...quads[1].slice(1).reverse(),
    ...quads[2], p270, ...quads[3].slice(1).reverse(),
  ];
  const lugs = quads.map((q) => ({ outer: outerIdx.map((i) => q[i]), inner: innerIdx.map((i) => q[i]) }));
  return { loop, lugs, M, ROUND, LUG, EB, R };
}

// ================================================================== bracelet pieces
// Stadium side profile (the link seen from the side): a closed loop in the (y, z) plane.
function stadiumLoop(a, R, nArc, nTop, nBot) {
  const out = [];
  const push = (y, z, ny, nz) => out.push({ y, z, ny, nz });
  for (let k = 0; k < nTop; k++) push(lerp(a, -a, k / nTop), R, 0, 1); // top, +y → −y
  for (let k = 0; k < nArc; k++) { const t = Math.PI / 2 + (Math.PI * k) / nArc; push(-a + R * Math.cos(t), R * Math.sin(t), Math.cos(t), Math.sin(t)); }
  for (let k = 0; k < nBot; k++) push(lerp(-a, a, k / nBot), -R, 0, -1);
  for (let k = 0; k < nArc; k++) { const t = -Math.PI / 2 + (Math.PI * k) / nArc; push(a + R * Math.cos(t), R * Math.sin(t), Math.cos(t), Math.sin(t)); }
  let s = 0;
  out.forEach((p, i) => { if (i) s += Math.hypot(p.y - out[i - 1].y, p.z - out[i - 1].z); p.s = s; });
  return out;
}

// Sweep cross-section strips (lists of [x, d]: d = depth inside the profile, along −n) round a
// side-profile loop. secFn(sample) → array of strips. Returns one geometry per strip.
function sweepProfile(loop, secFn, uvTile) {
  const n = loop.length;
  const secs = loop.map(secFn);
  const nStrip = secs[0].length;
  const geos = [];
  for (let st = 0; st < nStrip; st++) {
    const m = secs[0][st].length;
    const pos = [], uv = [];
    for (let i = 0; i < n; i++) {
      const L = loop[i];
      for (let j = 0; j < m; j++) {
        const [x, d] = secs[i][st][j];
        pos.push(x, L.y - d * L.ny, L.z - d * L.nz);
        uv.push(x / uvTile, L.s / uvTile);
      }
    }
    geos.push(makeGeo(pos, uv, gridIndex(n, m, true, false))); // callers orient()
  }
  return geos;
}

// Triangulated flat cap at x = xc from a closed (y, z) contour (and holes), facing ±x.
function capX(contour, holes, xc, face, uvTile) {
  const v2 = (p) => new THREE.Vector2(p[0], p[1]);
  const tri = THREE.ShapeUtils.triangulateShape(contour.map(v2), holes.map((h) => h.map(v2)));
  const all = [contour, ...holes].flat();
  const pos = [], uv = [], idx = [];
  for (const [y, z] of all) { pos.push(xc, y, z); uv.push(y / uvTile, z / uvTile); }
  for (const t of tri) idx.push(t[0], t[1], t[2]);
  return orient(makeGeo(pos, uv, idx), () => [face, 0, 0]);
}

function stadiumPts(cy, cz, a, r, n) {
  const pts = [];
  for (let k = 0; k < n; k++) { const t = -Math.PI / 2 + (Math.PI * k) / (n - 1); pts.push([cy + a + r * Math.cos(t), cz + r * Math.sin(t)]); }
  for (let k = 0; k < n; k++) { const t = Math.PI / 2 + (Math.PI * k) / (n - 1); pts.push([cy - a + r * Math.cos(t), cz + r * Math.sin(t)]); }
  return pts;
}

// ================================================================== builder
export function buildCase(ctx) {
  const { spec, M, reg, root } = ctx;
  const lite = !!ctx.lite;
  const C = spec.case, Z = spec.z, BR = spec.bracelet;
  const md = C.middle, lg = C.lug, bz = C.bezel, cr = C.crystal, fl = C.flange, cw = C.crown, cb = C.caseback;
  const X = (id) => spec.explode[id] ?? [0, 0, 0];
  const D = (id) => spec.explodeDelay(id);
  const SEG = lite ? 96 : 192;
  const steelCol = new THREE.Color(spec.colours.steel);

  const add = (parent, geo, mat, { cast = true, receive = true } = {}) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  };

  // ---------------------------------------------------------------- materials
  const brush = brushedMaps(lite ? 512 : 1024);
  const polished = M.steelPolished.clone();
  polished.color = steelCol.clone();
  polished.roughness = 0.08;
  const bright = polished.clone(); // knurl, rivet heads: polished but finer facets
  bright.roughness = 0.13;
  const satinOf = (rough, aniso, rot = 0, normal = 0.32) => {
    const m = M.steelSatin.clone();
    m.color = steelCol.clone().multiplyScalar(SATIN_TONE);
    m.roughness = rough;
    m.anisotropy = aniso;
    m.anisotropyRotation = rot;
    m.normalMap = brush.normalMap;
    m.normalScale = new THREE.Vector2(normal, normal);
    m.roughnessMap = brush.roughnessMap;
    return m;
  };
  const satin = satinOf(0.32, 0.72); // brushing along V of each surface's UVs
  const satinBezel = satinOf(0.3, 0.75, 0, 0.36); // radial lines; anisotropy across them
  const satinFine = satinOf(0.36, 0.35, 0, 0.18); // case-back ring: fine, nearly isotropic
  const fillMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.bezel.engraving.fill), roughness: 0.42, metalness: 0.05 });
  fillMat.polygonOffset = true;
  fillMat.polygonOffsetFactor = -2;
  fillMat.polygonOffsetUnits = -2;
  const sealMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(cw.neck.colour), roughness: 0.42, metalness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x121314, roughness: 0.6, metalness: 0.2 });
  const flangeMat = satinOf(0.45, 0.4, 0, 0.16);
  flangeMat.color = new THREE.Color(fl.colour);
  flangeMat.metalness = 0.6;
  // Sapphire: a specular-only coat added on top of whatever lies behind it (as on the 139):
  // transmission would hide the transparent dial prints and lume behind the glass.
  const glass = M.sapphire.clone();
  glass.transmission = 0;
  glass.thickness = 0;
  glass.color = new THREE.Color(0x000000);
  // The outer face keeps a sapphire reflection that rises towards grazing angles (F90 =
  // specularIntensity for a dielectric); the underside is anti-reflective coated (Tudor), so it
  // adds almost nothing: the opaline dial and the yellow GMT hand read true through the dome.
  glass.specularColor = new THREE.Color(0xf2f5ff); // nearly neutral, faint blue AR cast
  glass.specularIntensity = 0.2;
  glass.ior = cr.ior;
  glass.roughness = 0.012;
  glass.transparent = true;
  glass.blending = THREE.AdditiveBlending;
  glass.depthWrite = false;
  const glassAR = glass.clone();
  glassAR.specularIntensity = 0.035;

  // ================================================================ middle case + lugs
  const zCaseTop = md.topZ, zBackFace = md.bottomZ;
  // lug side profile: top points (y ascending) until the vertical tip face, then the underside
  const iFace = lg.profile.findIndex((p, i) => i > 0 && p[0] === lg.profile[i - 1][0]);
  const zTopLug = monotone(lg.profile.slice(0, iFace));
  const zBotLug = monotone(lg.profile.slice(iFace).reverse());
  const zTopFn = (x, y) => {
    const z = zTopLug(Math.abs(y));
    return zCaseTop + (z - zCaseTop) * smoothstep(SEAT_BLEND[0], SEAT_BLEND[1], Math.hypot(x, y));
  };
  const zBotFn = (x, y) => zBotLug(Math.abs(y));

  const OL = buildOutline(C, lite);
  for (const s of OL.loop) {
    const { ti, td, bi, br } = s.sec;
    const ax = s.x - ti * s.nx, ay = s.y - ti * s.ny, dx = s.x - bi * s.nx, dy = s.y - bi * s.ny;
    s.A = [ax, ay, zTopFn(ax, ay)];
    s.B = [s.x, s.y, zTopFn(s.x, s.y) - td];
    s.C = [s.x, s.y, zBotFn(s.x, s.y) + br];
    s.D = [dx, dy, zBotFn(dx, dy)];
  }

  const caseObj = new THREE.Group();
  const lugObj = new THREE.Group();
  root.add(caseObj, lugObj);

  {
    // ---- swept flank: top break, wall, bottom break (crisp edges between them)
    const loop = OL.loop, n = loop.length;
    const sArc = [0];
    for (let i = 1; i < n; i++) sArc.push(sArc[i - 1] + Math.hypot(loop[i].x - loop[i - 1].x, loop[i].y - loop[i - 1].y));
    const builders = {};
    const getB = (k) => (builders[k] ||= new Builder());
    const strips = [['A', 'B', 1], ['B', 'C', 0], ['C', 'D', -1]];
    const isLug = (k) => k === 'outer' || k === 'tip' || k === 'inner';
    for (const [ka, kb, up] of strips) {
      const normalAt = (i, key) => {
        const s = loop[i], sp = loop[(i - 1 + n) % n], sn = loop[(i + 1) % n];
        const T = [sn[key][0] - sp[key][0], sn[key][1] - sp[key][1], sn[key][2] - sp[key][2]];
        const Sx = s[kb][0] - s[ka][0], Sy = s[kb][1] - s[ka][1], Sz = s[kb][2] - s[ka][2];
        let nx = T[1] * Sz - T[2] * Sy, ny = T[2] * Sx - T[0] * Sz, nz = T[0] * Sy - T[1] * Sx;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
        if (nx * s.nx + ny * s.ny + nz * up < 0) { nx = -nx; ny = -ny; nz = -nz; }
        return [nx, ny, nz];
      };
      const norms = { [ka]: [], [kb]: [] };
      for (let i = 0; i < n; i++) { norms[ka].push(normalAt(i, ka)); norms[kb].push(normalAt(i, kb)); }
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n, s0 = loop[i], s1 = loop[i1];
        const part = isLug(s0.kind) || isLug(s1.kind) ? 'lug' : 'case';
        const mat = s0.kind === 'inner' || s1.kind === 'inner' ? 'sat' : 'pol';
        const B = getB(`${part}|${mat}`);
        const v = (si, key) => {
          const s = loop[si];
          return B.vert(s[key], norms[key][si], [s[key][2] / BRUSH_TILE, sArc[si] / BRUSH_TILE], `${ka}${kb}:${key}:${si}`);
        };
        const a0 = v(i, ka), b0 = v(i, kb), a1 = v(i1, ka), b1 = v(i1, kb);
        B.triOriented(a0, b0, b1);
        B.triOriented(a0, b1, a1);
      }
    }
    add(caseObj, builders['case|pol']?.geometry(), polished);
    add(caseObj, builders['case|sat']?.geometry(), satin);
    add(lugObj, builders['lug|pol']?.geometry(), polished);
    add(lugObj, builders['lug|sat']?.geometry(), satin);

    // ---- lug tops and undersides: ruled grids between the inner and outer sides, plus the
    // crescent under the bezel / against the case-back face
    const NG = OL.M; // grid columns (matches the tip samples)
    const grid = (outer, innerS, key, zFn, rArc, up) => {
      const rows = [];
      const a0 = innerS[0][key], b0 = outer[0][key];
      const t0 = Math.atan2(a0[1], a0[0]);
      let dt = Math.atan2(b0[1], b0[0]) - t0;
      while (dt > Math.PI) dt -= TAU;
      while (dt < -Math.PI) dt += TAU;
      const arc = [];
      for (let j = 0; j < NG; j++) { const t = t0 + (dt * j) / (NG - 1); const x = rArc * Math.cos(t), y = rArc * Math.sin(t); arc.push([x, y, zFn(x, y)]); }
      rows.push(arc);
      for (let k = 0; k < outer.length; k++) {
        const a = innerS[k][key], b = outer[k][key], row = [];
        for (let j = 0; j < NG; j++) {
          if (j === 0) row.push(a);
          else if (j === NG - 1) row.push(b);
          else { const w = j / (NG - 1), x = lerp(a[0], b[0], w), y = lerp(a[1], b[1], w); row.push([x, y, zFn(x, y)]); }
        }
        rows.push(row);
      }
      const pos = [], uv = [];
      for (const row of rows) for (const p of row) { pos.push(p[0], p[1], p[2]); uv.push(p[0] / BRUSH_TILE, p[1] / BRUSH_TILE); }
      return orient(makeGeo(pos, uv, gridIndex(rows.length, NG, false, false)), () => [0, 0, up]);
    };
    const tops = [], bots = [];
    for (const l of OL.lugs) {
      tops.push(grid(l.outer, l.inner, 'A', zTopFn, OL.R - OL.ROUND.ti, 1));
      bots.push(grid(l.outer, l.inner, 'D', zBotFn, OL.R - OL.ROUND.bi, -1));
    }
    add(lugObj, mergeAll(tops), satin);
    add(lugObj, mergeAll(bots), satin);

    // ---- case top (under the bezel), case-back face, inner bore (lathe)
    const rTopIn = bz.topInner; // bore under the bezel
    add(caseObj, latheZ([[[OL.R - OL.ROUND.ti, zCaseTop], [rTopIn, zCaseTop]]], SEG, { uScale: 0, vScale: 0 }), satin);
    add(caseObj, latheZ([[[CASE_LOWER_BORE, zBackFace], [OL.R - OL.ROUND.bi, zBackFace]]], SEG,
      { uvFn: (x, y) => [x / BRUSH_TILE, y / BRUSH_TILE] }), satin);
    add(caseObj, latheZ([
      [[md.boreRadius, zCaseTop], [md.boreRadius, CASE_LEDGE_Z]],
      [[md.boreRadius, CASE_LEDGE_Z], [CASE_LOWER_BORE, CASE_LEDGE_Z]],
      [[CASE_LOWER_BORE, CASE_LEDGE_Z], [CASE_LOWER_BORE, zBackFace]],
    ], SEG), satinFine);

    // ---- crown tube end on the flank (hidden by the crown's seal ring; seen when exploded)
    const tz = Z.stemAxis, ty = spec.keyless.stemY;
    const tube = latheX([
      [[0.62, OL.R + 0.012], [1.45, OL.R + 0.012]],
      [[1.45, OL.R + 0.012], [1.45, OL.R - 0.6]],
    ], 48);
    tube.translate(0, ty, tz);
    add(caseObj, tube, polished);
    const hole = latheX([[[0, OL.R + 0.008], [0.62, OL.R + 0.008]]], 32);
    hole.translate(0, ty, tz);
    add(caseObj, hole, darkMat, { cast: false });

    // ---- engraved reference and serial on the case-back face beside the 12 o'clock lugs
    // (photos: serial on the crown side, "79470" opposite; read from the back, clockwise)
    if (!lite) {
      const eg = lg.engraving;
      const engr = (text, c, Dv, Uv) => {
        const t = engravingText(text, eg.capHeight);
        const geo = surfaceDecal({ c, D: Dv, U: Uv, w: t.w, h: t.h, rise: t.rise, zFn: zBotFn, face: -1 });
        const m = decalMaterial(M.steelSatin, t.texture, 0x6a6e74, 0.62, 0.6);
        const mesh = add(lugObj, geo, m, { cast: false, receive: false });
        if (mesh) mesh.renderOrder = 1;
      };
      engr(spec.caseSerial || eg.serial, [12.15, 18.9], [0, 1], [1, 0]);
      engr(eg.ref, [-12.15, 18.9], [0, -1], [-1, 0]);
    }
  }

  const lugsAnchorY = 20.6;
  reg.add({
    id: 'case-body', name: 'Middle case', category: 'case', side: 'both', exposed: true,
    object: caseObj, explode: X('case-body'), explodeDelay: D('case-body'), priority: 1,
    anchor: [md.outerRadius * Math.cos(-150 * DEG), md.outerRadius * Math.sin(-150 * DEG), (md.flankZ[0] + md.flankZ[1]) / 2],
    description: 'The steel body of the case. Its tall, straight, mirror-polished flank gives the Black Bay its slab-sided profile; it carries the lugs, the tube of the screw-down crown and the thread for the solid case back.',
    facts: {
      Material: '316L stainless steel',
      Diameter: `${(md.outerRadius * 2).toFixed(0)} mm`,
      Thickness: `${C.height.toFixed(1)} mm overall`,
      'Water resistance': `${C.waterResistanceM} m (660 ft)`,
      Finish: 'Polished flanks and bevel, satin tops',
    },
  });
  reg.add({
    id: 'lugs', name: 'Lugs', category: 'case', side: 'both', exposed: true,
    object: lugObj, explode: X('lugs'), explodeDelay: D('lugs'), priority: 2,
    anchor: [lg.xInner + 1.9, lugsAnchorY, zTopFn(lg.xInner + 1.9, lugsAnchorY)],
    description: 'Four lugs machined in one piece with the middle case. Their tops are satin-brushed along the bracelet and their sides mirror-polished, with a narrow polished bevel running along the top edge from lug tip to lug tip; they fall away in a convex curve to square-cut tips.',
    facts: {
      'Lug width': `${C.lugWidth.toFixed(0)} mm`,
      'Lug to lug': `${C.lugToLug.toFixed(1)} mm`,
      Bevel: `${lg.outerBevel.planWidth} mm, polished`,
      'Spring-bar holes': 'Blind (none on the flanks)',
    },
  });

  // ================================================================ bezel
  {
    const object = new THREE.Group();
    root.add(object);
    const [zb, zt] = bz.z;
    const ro = bz.outerRadius, rt = bz.topOuterEdge, ri = bz.topInner, rs = bz.seatRadius;
    const zCh = bz.profile[4][1];
    const zSide = bz.profile[1][1];
    const zSeat = fl.z[1] + CRYSTAL_GAP - 0.06; // the crystal's foot sits on the rehaut inside the bezel bore
    const round = [];
    for (let k = 0; k <= 8; k++) { const t = (k / 8) * (Math.PI / 2); round.push([rt + (ro - rt) * Math.cos(t), zSide + (zt - zSide) * Math.sin(t)]); }
    const pol = latheZ([
      [[md.boreRadius, zb], [ro - BEZEL_FOOT_CHAMFER, zb]],
      [[ro - BEZEL_FOOT_CHAMFER, zb], [ro, zb + BEZEL_FOOT_CHAMFER]],
      [[ro, zb + BEZEL_FOOT_CHAMFER], [ro, zSide]],
      round,
      [[ri, zt], [rs, zCh]],
      [[rs, zCh], [rs, zSeat]],
      [[rs, zSeat], [md.boreRadius, zSeat]],
      [[md.boreRadius, zSeat], [md.boreRadius, zb]],
    ], SEG);
    add(object, pol, polished);
    // radially brushed top: U runs round the bezel (integer tiles: no seam), V radial
    const nTiles = Math.round((TAU * 17.7) / BRUSH_TILE);
    add(object, latheZ([[[rt, zt], [ri, zt]]], SEG, { uScale: nTiles, vScale: 1 / BRUSH_TILE }), satinBezel);

    // ---- engraved, black-filled 24-hour scale (vector strokes, flush with the top)
    const eng = bz.engraving, nm = eng.numerals;
    const hw = eng.stroke / 2;
    const tris = [];
    const H = nm.r[1] - nm.r[0], rcen = (nm.r[0] + nm.r[1]) / 2;
    const nArc = lite ? 3 : 6;
    for (const it of nm.items) {
      const spans = nm.spans[it.text];
      const chars = Array.from(it.text);
      chars.forEach((ch, i) => {
        let [d0, d1] = spans[it.tops === 'out' ? i : chars.length - 1 - i];
        if (d1 < d0) d1 += 360;
        const dc = ((d0 + d1) / 2) * DEG;
        const w = ((d1 - d0) * DEG) * rcen;
        const ur = [Math.sin(dc), Math.cos(dc)], tcw = [Math.cos(dc), -Math.sin(dc)];
        const up = it.tops === 'out' ? ur : [-ur[0], -ur[1]];
        const right = it.tops === 'out' ? tcw : [-tcw[0], -tcw[1]];
        const local = [];
        for (const p of digitPaths(ch, w, H, hw, nArc)) strokeTris(p.pts, p.closed, hw, local, lite ? 8 : 12);
        for (const [gx, gy] of local) tris.push([rcen * ur[0] + gx * right[0] + gy * up[0], rcen * ur[1] + gx * right[1] + gy * up[1]]);
      });
    }
    for (const deg of eng.bars.anglesDeg) {
      const a = deg * DEG, u = [Math.sin(a), Math.cos(a)];
      strokeTris([[u[0] * eng.bars.r[0], u[1] * eng.bars.r[0]], [u[0] * eng.bars.r[1], u[1] * eng.bars.r[1]]], false, eng.bars.width / 2, tris);
    }
    // the mapping (glyph frame → plan) is a rotation (+ reflection for 'in'?) — no: both
    // frames are right-handed rotations, so the CCW winding survives; re-check anyway
    const pos = [], nor = [], uv = [];
    for (let t = 0; t < tris.length; t += 3) {
      let a = tris[t], b = tris[t + 1], c = tris[t + 2];
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      if (area < 0) { const tmp = b; b = c; c = tmp; }
      for (const p of [a, b, c]) { pos.push(p[0], p[1], zt + LIFT); nor.push(0, 0, 1); uv.push(0, 0); }
    }
    const fill = makeGeo(pos, uv, null, nor);
    add(object, fill, fillMat, { cast: false, receive: true });

    reg.add({
      id: 'bezel', name: 'Bezel (24-hour scale)', category: 'case', side: 'front', exposed: true,
      object, explode: X('bezel'), explodeDelay: D('bezel'), priority: 1,
      anchor: [17.7 * Math.cos(135 * DEG), 17.7 * Math.sin(135 * DEG), zt],
      description: 'A fixed steel bezel engraved with a 24-hour scale. Read against the yellow GMT hand it gives the time at home on a 24-hour dial, while the local hour hand is jumped to the time where you are. The numerals and bars are cut into the radially brushed top and filled with black lacquer.',
      facts: {
        Type: 'Fixed, 24-hour scale',
        Scale: '12 even numerals + 12 bars, engraved and black-filled',
        Finish: 'Radially brushed top, polished side and inner chamfer',
        Diameter: `${(ro * 2).toFixed(0)} mm`,
      },
    });
  }

  // ================================================================ flange (rehaut)
  {
    const object = new THREE.Group();
    root.add(object);
    const [z0, z1] = fl.z;
    const cone = latheZ([[[fl.rOuter, z1], [fl.rInner, z0]]], SEG, { swapUV: true, uScale: Math.round((TAU * 15) / BRUSH_TILE), vScale: 1 / BRUSH_TILE });
    add(object, cone, flangeMat);
    const back = latheZ([
      [[fl.rInner, z0], [FLANGE_BACK_R, z0]],
      [[FLANGE_BACK_R, z0], [FLANGE_BACK_R, z1]],
      [[FLANGE_BACK_R, z1], [fl.rOuter, z1]],
    ], SEG);
    add(object, back, flangeMat);
    reg.add({
      id: 'flange', name: 'Flange (rehaut)', category: 'case', side: 'front', exposed: true,
      object, explode: X('flange'), explodeDelay: D('flange'), priority: 3,
      anchor: [((fl.rInner + fl.rOuter) / 2) * Math.cos(155 * DEG), ((fl.rInner + fl.rOuter) / 2) * Math.sin(155 * DEG), (z0 + z1) / 2],
      description: 'The inner bezel ring between the edge of the dial and the crystal: a plain light-grey satin cone, without print, that hides the dial\'s rim and frames the minute track.',
      facts: { Finish: 'Satin, light grey', Print: 'None', 'Inner diameter': `${(fl.rInner * 2).toFixed(1)} mm` },
    });
  }

  // ================================================================ crystal
  {
    const object = new THREE.Group();
    root.add(object);
    const out = cr.outer, inn = cr.inner;
    const zFoot = fl.z[1] + CRYSTAL_GAP;
    const dome = smoothCurve(out.slice(1), lite ? 26 : 48, [0, 1], [-1, 0]);
    const under = smoothCurve(inn, lite ? 14 : 24, [-1, 0.06], [-1, 0]).slice().reverse(); // centre → edge
    under[0] = [0, inn[inn.length - 1][1]];
    const rIn = inn[0][0], rC = cr.radius;
    const segC = lite ? 96 : 160;
    const gIn = latheZ([
      under,
      [[rIn, inn[0][1]], [rC - 0.06, zFoot]],
    ], segC);
    const gOut = latheZ([
      [[rC - 0.06, zFoot], [rC, zFoot + 0.06]],
      [[rC, zFoot + 0.06], [rC, out[0][1]], ...dome],
    ], segC);
    for (const [g, m] of [[gIn, glassAR], [gOut, glass]]) add(object, g, m, { cast: false, receive: false }).renderOrder = 2;
    const zApex = out[out.length - 1][1];
    reg.add({
      id: 'crystal', name: 'Sapphire crystal', category: 'case', side: 'front', exposed: true,
      object, explode: X('crystal'), explodeDelay: D('crystal'), priority: 2,
      anchor: [-6.0, 7.5, zApex - 0.18],
      description: 'A domed "box" sapphire crystal: a short vertical wall rises above the bezel, then the dome — the shape of the 1950s Tudor crystals. Sapphire is second only to diamond in hardness; an anti-reflective coating keeps the dial readable.',
      facts: {
        Material: 'Synthetic sapphire, anti-reflective',
        Shape: 'Box dome',
        'Above the bezel': `${(zApex - bz.z[1]).toFixed(1)} mm`,
        'Centre thickness': `${(zApex - inn[inn.length - 1][1]).toFixed(2)} mm`,
      },
    });
  }

  // ================================================================ crown
  {
    const object = new THREE.Group();
    object.position.set(0, spec.keyless.stemY, cw.axisZ);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const F = cw.flutes;
    const R0 = F.radius, Rr = F.rootRadius, nF = F.count, rNeck = cw.neck.radius;
    const xF0 = F.x[0], xF1 = F.x[1], xFace = cw.face.x, rFace = cw.endBevel.toRadius;
    const xBase = (r) => xF0 + (r - rNeck) * (CROWN_BASE_CHAMFER / (R0 - rNeck));
    const xEnd = (r) => xF1 + (R0 - r) * ((xFace - xF1) / (R0 - rFace));
    const pitch = TAU / nF, tH = (CROWN_TOP_FRACTION / 2) * pitch;
    const P3 = (x, r, a) => [x, r * Math.cos(a), r * Math.sin(a)];
    const tops = new Builder(), flanks = new Builder(), cones = new Builder();
    const quad = (B, a, b, c, d, nOut, uvs) => {
      const i0 = B.vert(a, nOut, uvs[0]), i1 = B.vert(b, nOut, uvs[1]), i2 = B.vert(c, nOut, uvs[2]), i3 = B.vert(d, nOut, uvs[3]);
      B.triOriented(i0, i1, i2);
      B.triOriented(i0, i2, i3);
    };
    const facetNormal = (r0, a0, r1, a1) => {
      // outward normal of the plane through the two flute edge lines (parallel to x)
      const y0 = r0 * Math.cos(a0), z0 = r0 * Math.sin(a0), y1 = r1 * Math.cos(a1), z1 = r1 * Math.sin(a1);
      let ny = z1 - z0, nz = -(y1 - y0);
      const l = Math.hypot(ny, nz) || 1;
      ny /= l; nz /= l;
      const am = (a0 + a1) / 2;
      if (ny * Math.cos(am) + nz * Math.sin(am) < 0) { ny = -ny; nz = -nz; }
      return [0, ny, nz];
    };
    const corners = [];
    for (let i = 0; i < nF; i++) {
      const c = i * pitch;
      const facets = [
        [c - tH, R0, c + tH, R0, 'top'],
        [c + tH, R0, c + pitch / 2, Rr, 'flank'],
        [c + pitch / 2, Rr, c + pitch - tH, R0, 'flank'],
      ];
      corners.push(c - tH, c + tH, c + pitch / 2);
      for (const [a0, r0, a1, r1, kind] of facets) {
        const n = facetNormal(r0, a0, r1, a1);
        const B = kind === 'top' ? tops : flanks;
        const u0 = (a0 * R0) / BRUSH_TILE, u1 = (a1 * R0) / BRUSH_TILE;
        quad(B, P3(xBase(r0), r0, a0), P3(xBase(r1), r1, a1), P3(xEnd(r1), r1, a1), P3(xEnd(r0), r0, a0), n,
          [[u0, xBase(r0) / BRUSH_TILE], [u1, xBase(r1) / BRUSH_TILE], [u1, xEnd(r1) / BRUSH_TILE], [u0, xEnd(r0) / BRUSH_TILE]]);
        // conical end caps of the flute (base and end chamfers), polished
        const capQuad = (xf, dir) => {
          const pa = P3(xf(r0), r0, a0), pb = P3(xf(r1), r1, a1), pc = P3(xf(Rr), Rr, a1), pd = P3(xf(Rr), Rr, a0);
          const nn = [dir, 0, 0];
          const ia = cones.vert(pa, nn, [0, 0]), ib = cones.vert(pb, nn, [0, 0]), ic = cones.vert(pc, nn, [0, 0]), id = cones.vert(pd, nn, [0, 0]);
          if (r0 > Rr + 1e-6 || r1 > Rr + 1e-6) {
            if (r0 > Rr + 1e-6 && r1 > Rr + 1e-6) { cones.triOriented(ia, ib, ic); cones.triOriented(ia, ic, id); }
            else if (r0 > Rr + 1e-6) cones.triOriented(ia, ib, id);
            else cones.triOriented(ia, ib, ic);
          }
        };
        capQuad(xBase, -1);
        capQuad(xEnd, 1);
      }
    }
    const crownPol = [flanks.geometry()];
    const coneGeo = cones.geometry();
    if (coneGeo) { coneGeo.computeVertexNormals(); crownPol.push(coneGeo); }
    // base and end cone rings (r < root), sampled at the facet corners so they meet the caps
    // (latheX puts lathe angle a at crown angle a − 90°: shift by +90° to match the facets)
    const angs = corners.map((a) => (((a + Math.PI / 2) % TAU) + TAU) % TAU).sort((p, q) => p - q);
    crownPol.push(latheX([[[rNeck, xBase(rNeck)], [Rr, xBase(Rr)]]], 0, { angles: angs }));
    crownPol.push(latheX([[[Rr, xEnd(Rr)], [rFace, xFace]], [[rFace, xFace], [0, xFace]]], 0, { angles: angs }));
    // the TUDOR ROSE in relief on the end face (shared outlines, glyphs.js)
    const rs = cw.face.rose;
    const rose = roseRegions(rs.radius, { ring: rs.ringRadius, ringWidth: 0.1, segments: lite ? 0.5 : 1 });
    const relief = rs.relief;
    const ext = (regions, h, bevel, segs) => {
      const g = new THREE.ExtrudeGeometry(regionsToShapes(THREE, regions), {
        depth: Math.max(0.005, h - bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8,
        bevelSegments: segs, curveSegments: 4,
      });
      // shape (x, y, z) → crown (xFace + z, x, y): a proper rotation
      g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
      g.translate(xFace, 0, 0);
      return g;
    };
    const roseGeos = [
      ext([...rose.rims, ...rose.barbs, ...rose.star, ...rose.disc, ...rose.ring], relief, 0.025, lite ? 1 : 2),
      ext(rose.seed, relief * (ROSE.relief.seed || 1.35), 0.05, lite ? 2 : 4),
    ];
    // neck: dark sealing ring from inside the flank to the flutes, with the stem bore
    const xN0 = Math.sqrt(md.outerRadius ** 2 - rNeck ** 2) - 0.05;
    const neck = latheX([
      [[0.62, xN0], [rNeck - 0.05, xN0]],
      [[rNeck - 0.05, xN0], [rNeck, xN0 + 0.05], [rNeck, xF0]],
    ], lite ? 32 : 64);
    const bore = latheX([[[0.62, cw.stemEnd], [0.62, xN0]], [[0, cw.stemEnd], [0.62, cw.stemEnd]]], 24);
    add(rotor, mergeAll(crownPol), polished);
    add(rotor, mergeAll(roseGeos), polished);
    add(rotor, tops.geometry(), satin);
    add(rotor, neck, sealMat);
    add(rotor, bore, darkMat, { cast: false });

    const kw = spec.keyless;
    const stemPerRatchet = (kw.ratchet.teeth / kw.crownWheel.teeth) * (kw.crownWheel.teeth / kw.windingPinion.teeth);
    const TURNS = spec.barrelTurns * stemPerRatchet;
    const RES_H = spec.powerReserveHours;
    reg.add({
      id: 'crown', name: 'Winding crown', category: 'case', side: 'both', exposed: true,
      object, rotor, explode: X('crown'), explodeDelay: D('crown'), priority: 1,
      anchor: [(xF0 + xF1) / 2, 0, R0],
      description: `The screw-down crown, signed with the Tudor rose. Unscrewed, it winds the mainspring by hand (about ${Math.round(TURNS)} turns from empty), then pulls out to jump the local hour hand and to set the time; screwed down onto its tube it seals the case to 200 m.`,
      facts: {
        Diameter: `${(R0 * 2).toFixed(1)} mm`,
        Flutes: String(nF),
        Type: 'Screw-down, no crown guards',
        'Full wind': `≈ ${Math.round(TURNS)} turns`,
        Signed: 'Tudor rose in relief',
      },
      live: (s) => `${Math.round((s.reserve || 0) * RES_H)} h in reserve`,
      update: (s) => { rotor.rotation.x = s.rot.stem || 0; },
    });
  }

  // ================================================================ case back (solid)
  {
    const object = new THREE.Group();
    root.add(object);
    const zb0 = Z.caseBottom;
    const rD = cb.centreDisc.radius, [zD, zR1] = cb.flatRing.z, rR1 = cb.flatRing.r[1];
    const K = cb.knurl, rK = K.radius, rRoot = K.radius - K.depth, [zK0, zK1] = K.z;
    const ec = cb.engravedCircle;
    const zRing = (r) => lerp(zD, zR1, (r - rD) / (rR1 - rD));
    const zCh = (r) => lerp(zR1, zK0, (r - rR1) / (rK - rR1));
    const zInner = cb.inner.faceZ;
    // centre disc, slightly domed, straight-brushed
    const disc = [];
    for (let i = 0; i <= 10; i++) { const r = (rD * i) / 10; disc.push([r, zb0 + (zD - zb0) * (r / rD) ** 2]); }
    add(object, latheZ([disc], SEG, { uvFn: (x, y) => [x / BRUSH_TILE, y / BRUSH_TILE] }), satin);
    // engraved circle: a fine V-groove
    const g0 = ec.radius - ec.width / 2, g1 = ec.radius + ec.width / 2;
    add(object, latheZ([[[rD, zD], [g0 + 0.0, zRing(g0)]], [[g0, zRing(g0)], [ec.radius, zRing(ec.radius) + 0.035], [g1, zRing(g1)]]], SEG), polished);
    // engraved ring (fine satin)
    add(object, latheZ([[[g1, zRing(g1)], [rR1, zR1]]], SEG, { swapUV: true, uScale: Math.round((TAU * 13) / BRUSH_TILE), vScale: 1 / BRUSH_TILE }), satinFine);
    // coin-edge knurl: V teeth whose ends are cut by the chamfer cone below and the top face
    const nT = K.teeth, half = Math.PI / nT;
    const angs = [];
    for (let k = 0; k < nT; k++) angs.push(k * 2 * half, k * 2 * half + half);
    const kn = new Builder();
    for (let k = 0; k < nT; k++) {
      const aR0 = k * 2 * half, aP = aR0 + half, aR1 = aR0 + 2 * half;
      for (const [a0, r0, a1, r1] of [[aR0, rRoot, aP, rK], [aP, rK, aR1, rRoot]]) {
        const p = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
        const y0 = r0 * Math.cos(a0), x0 = r0 * Math.sin(a0);
        void y0; void x0;
        const mx = (Math.cos(a0) * r0 + Math.cos(a1) * r1) / 2, my = (Math.sin(a0) * r0 + Math.sin(a1) * r1) / 2;
        const tx = r1 * Math.cos(a1) - r0 * Math.cos(a0), ty = r1 * Math.sin(a1) - r0 * Math.sin(a0);
        let nx = ty, ny = -tx;
        const l = Math.hypot(nx, ny);
        nx /= l; ny /= l;
        if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
        const nn = [nx, ny, 0];
        const i0 = kn.vert(p(r0, a0, zCh(r0)), nn, [0, 0]), i1 = kn.vert(p(r1, a1, zCh(r1)), nn, [0, 0]);
        const i2 = kn.vert(p(r1, a1, zK1), nn, [0, 0]), i3 = kn.vert(p(r0, a0, zK1), nn, [0, 0]);
        kn.triOriented(i0, i1, i2);
        kn.triOriented(i0, i2, i3);
      }
      // tooth caps on the chamfer cone and on the top face
      const pc = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
      const cn = [Math.cos(aP) * 0.5, Math.sin(aP) * 0.5, -0.85];
      const c0 = kn.vert(pc(rRoot, aR0, zCh(rRoot)), cn, [0, 0]), c1 = kn.vert(pc(rK, aP, zK0), cn, [0, 0]), c2 = kn.vert(pc(rRoot, aR1, zCh(rRoot)), cn, [0, 0]);
      kn.triOriented(c0, c1, c2);
      const tn = [0, 0, 1];
      const t0 = kn.vert(pc(rRoot, aR0, zK1), tn, [0, 0]), t1 = kn.vert(pc(rK, aP, zK1), tn, [0, 0]), t2 = kn.vert(pc(rRoot, aR1, zK1), tn, [0, 0]);
      kn.triOriented(t0, t1, t2);
    }
    add(object, kn.geometry(), bright);
    // chamfer ring below the knurl and the top / inside of the back (root-angle sampling)
    add(object, latheZ([[[rR1, zR1], [rRoot, zCh(rRoot)]]], 0, { angles: angs }), bright);
    add(object, latheZ([
      [[rRoot, zK1], [CASEBACK_WALL_R, zK1]],
      [[CASEBACK_WALL_R, zK1], [CASEBACK_WALL_R, zInner]],
      [[CASEBACK_WALL_R, zInner], [0, zInner]],
    ], 0, { angles: angs }), satinFine);

    // ---- engraved ring text, laid out in back view (mirror x) so it reads from the back:
    // "TUDOR GENEVE" centred at 12 and 6, "CALIBRE MANUFACTURE" at 3 and 9, shields between
    if (!lite) {
      const T = cb.text;
      const S = 2048, Rc = 13.4; // canvas covers r ≤ Rc (mm)
      const can = document.createElement('canvas');
      can.width = can.height = S;
      const g = can.getContext('2d');
      const px = S / (2 * Rc);
      g.setTransform(px, 0, 0, px, S / 2, S / 2); // mm, origin at the centre, y DOWN (canvas)
      g.fillStyle = '#fff';
      const capH = T.capHeight;
      const font = (sz) => `500 ${sz}px "Times New Roman", "Liberation Serif", "Nimbus Roman", Times, serif`;
      const em = capH / 0.662; // Times caps ≈ 0.662 em
      const rBase = (T.r[0] + T.r[1]) / 2 - capH / 2;
      const rMid = rBase + capH / 2;
      const groups = [
        { text: 'TUDOR GENEVE', c: 0, span: 68 }, { shield: true, c: 40 },
        { text: 'CALIBRE MANUFACTURE', c: 90, span: 88 }, { shield: true, c: 140 },
        { text: 'TUDOR GENEVE', c: 180, span: 68 }, { shield: true, c: 220 },
        { text: 'CALIBRE MANUFACTURE', c: 270, span: 88 }, { shield: true, c: 320 },
      ];
      g.font = font(100);
      const kxNeed = groups.filter((q) => q.text).map((q) => {
        const wNat = Array.from(q.text).reduce((a, ch) => a + g.measureText(ch).width, 0) * (em / 100);
        return (q.span * DEG * rMid) / wNat;
      });
      const scale = Math.min(1, Math.min(...kxNeed) / 0.8); // condense at most to 80 %, then shrink
      const emS = em * scale;
      const rB = rMid - (capH * scale) / 2;
      for (const q of groups) {
        if (q.shield) {
          const h = 1.15 * scale * capH;
          const a = q.c * DEG;
          g.save();
          g.rotate(a);
          g.translate(0, -rMid);
          g.scale(1, -1); // glyph regions are y-up
          drawRegions(g, shieldRegions(h));
          g.restore();
          continue;
        }
        g.font = font(100);
        const widths = Array.from(q.text).map((ch) => g.measureText(ch).width * (emS / 100));
        const wNat = widths.reduce((a, b) => a + b, 0);
        const kx = (q.span * DEG * rMid) / wNat;
        let acc = -wNat / 2;
        Array.from(q.text).forEach((ch, i) => {
          const sMid = (acc + widths[i] / 2) * kx; // arc length from the group centre
          acc += widths[i];
          const a = q.c * DEG + sMid / rMid;
          g.save();
          g.rotate(a); // clockwise on the canvas = clockwise seen from the back
          g.translate(0, -rB);
          g.scale(kx * (emS / 100), emS / 100);
          g.font = font(100);
          g.textAlign = 'center';
          g.textBaseline = 'alphabetic';
          g.fillText(ch, 0, 0);
          g.restore();
        });
      }
      const tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      // decal ring on the cone; UV = back-view position (x_back = −x)
      const r0 = T.r[0] - 0.3, r1 = T.r[1] + 0.3;
      const ring = latheZ([[[r0, zRing(r0) - LIFT], [r1, zRing(r1) - LIFT]]], SEG, { // outward: faces −Z
        uvFn: (x, y) => [(-x + Rc) / (2 * Rc), (y + Rc) / (2 * Rc)],
      });
      const m = decalMaterial(M.steelSatin, tex, 0x5d6167, 0.6, 0.65);
      const mesh = add(object, ring, m, { cast: false, receive: false });
      mesh.renderOrder = 1;
    }

    reg.add({
      id: 'caseback', name: 'Case back', category: 'case', side: 'back', exposed: true,
      object, explode: X('caseback'), explodeDelay: D('caseback'), priority: 1,
      anchor: [13.6 * Math.cos(-120 * DEG), 13.6 * Math.sin(-120 * DEG), zRing(13.6)],
      description: 'The solid steel case back, screwed into the middle case and sealed by a gasket. Its coin-edge knurl gives the opening tool a grip; the flat ring is engraved "TUDOR GENEVE · CALIBRE MANUFACTURE" twice round a straight-brushed centre.',
      facts: {
        Type: 'Solid, screw-down',
        Knurl: `${K.teeth} teeth, coin-edge`,
        Engraving: 'TUDOR GENEVE ⛉ CALIBRE MANUFACTURE ⛉',
        'Inside face': `${(zInner - zb0).toFixed(2)} mm above its lowest point`,
      },
    });
  }

  // The watch box draws its own band: no bracelet, clasp or spring bars in lite mode.
  if (lite) return;

  // ================================================================ spring bars
  const sb = lg.springBar;
  {
    const object = new THREE.Group();
    root.add(object);
    const rb = sb.radius, xBody = lg.xInner - 0.02, xTip = lg.xInner + 0.45, rTip = 0.45;
    const bar = latheX([
      [[0, -xTip], [rTip - 0.08, -xTip], [rTip, -xTip + 0.08], [rTip, -xBody]],
      [[rTip, -xBody], [rb - 0.1, -xBody], [rb, -xBody + 0.1], [rb, xBody - 0.1], [rb - 0.1, xBody]],
      [[rb - 0.1, xBody], [rTip, xBody]],
      [[rTip, xBody], [rTip, xTip - 0.08], [rTip - 0.08, xTip], [0, xTip]],
    ], 28);
    // latheX maps the lathe axis to +X; the strips above run from −x to +x along it
    add(object, mergeAll([bar.clone().translate(0, sb.y, sb.z), bar.clone().translate(0, -sb.y, sb.z)]), satin);
    reg.add({
      id: 'spring-bars', name: 'Spring bars', category: 'case', side: 'both', exposed: false,
      object, explode: X('spring-bars'), explodeDelay: D('spring-bars'), priority: 3,
      anchor: [0, sb.y, sb.z],
      description: 'Two thick spring-loaded steel bars hold the end links between the lugs. Their tips sit in blind holes in the lugs\' inner faces, so nothing shows on the outside of the case.',
      facts: { Diameter: `${(rb * 2).toFixed(1)} mm`, Length: `${C.lugWidth.toFixed(0)} mm between the lugs`, Holes: 'Blind, not drilled through' },
    });
  }

  // ================================================================ bracelet
  const pitch = BR.pitch, gJ = BRACELET_JOINT_GAP, gR = BRACELET_ROW_GAP;
  const cHalf = BR.centreLinkWidth / 2;
  const el = BR.endLink;
  const elTop = (y) => lerp(el.topZ[0], el.topZ[1], (y - el.y[0]) / (el.y[1] - el.y[0]));
  const T1 = BR.thickness.link1, Tn = BR.thickness.rest;
  const zMid0 = elTop(el.y[1]) - T1 / 2; // links' pin line, flush with the end link's top at its end
  const OT = BR.outerLinkTop, RV = BR.rivets;
  const nArcP = 12;

  // ---- one outer link piece (right-hand side, x0 → x1): stepped top, polished stadium rim
  // with a recessed panel on the outer side, two domed rivet heads
  const outerPiece = (W, T) => {
    const Lp = pitch - gJ, Rr = T / 2, a = Lp / 2 - Rr;
    const x0 = cHalf + gR / 2, x1 = W / 2;
    const loop = stadiumLoop(a, Rr, nArcP, 10, 6);
    const eb = 0.12, railW = OT.railWidth, stepW = OT.stepWidth;
    const tauOf = (L) => smoothstep(-0.35, 0.35, L.nz);
    const sec = (L) => {
      const h = OT.stepDepth * tauOf(L);
      const rail = [];
      for (let k = 0; k <= 6; k++) { const f = (k / 6) * (Math.PI / 2); rail.push([x1 - railW + railW * Math.sin(f), h + railW * (1 - Math.cos(f))]); }
      return [
        [[x0, eb], [x0 + eb, 0], [x1 - stepW - railW, 0]],
        [[x1 - stepW - railW, 0], [x1 - railW, h]],
        rail,
      ];
    };
    const [sTop, sStep, sRail] = sweepProfile(loop, sec, BRUSH_TILE);
    // orientation of the swept strips: outward from the link's core segment
    for (const g of [sTop, sStep, sRail]) orient(g, (x, y, z) => [0, y - clamp(y, -a, a), z]);
    const capIn = capX(loop.map((L) => [L.y - eb * L.ny, L.z - eb * L.nz]), [], x0, -1, BRUSH_TILE);
    const capContour = loop.map((L) => { const d = OT.stepDepth * tauOf(L) + railW; return [L.y - d * L.ny, L.z - d * L.nz]; });
    const zc = -OT.stepDepth / 2, Rp = Rr - railW - OT.stepDepth / 2 - 0.3, ap = a - RV.radius - 0.15 - Rp;
    const panel = stadiumPts(0, zc, Math.max(0.2, ap), Math.max(0.2, Rp), 10);
    const rim = capX(capContour, [panel.slice().reverse()], x1, 1, BRUSH_TILE);
    const panelFace = capX(panel, [], x1 - RIVET_PANEL_DEPTH, 1, BRUSH_TILE);
    const wallPos = [], wallUv = [];
    for (const [y, z] of panel) { wallPos.push(x1, y, z, x1 - RIVET_PANEL_DEPTH, y, z); wallUv.push(0, 0, 0, 0); }
    const wall = orient(makeGeo(wallPos, wallUv, gridIndex(panel.length, 2, true, false)), (x, y, z) => [0, -(y - clamp(y, -ap, ap)), -(z - zc)]);
    // rivet heads: spherical caps Ø1.4, 0.3 proud, at the pin centres
    const rho = (RV.radius ** 2 + RV.protrusion ** 2) / (2 * RV.protrusion);
    const alpha = Math.asin(RV.radius / rho);
    const domePts = []; // base edge → apex (solid on the left of travel)
    for (let k = 6; k >= 0; k--) { const f = (alpha * k) / 6; domePts.push([rho * Math.sin(f), rho * Math.cos(f) - (rho - RV.protrusion)]); }
    const dome = latheX([[[RV.radius, -0.04], [RV.radius, 0]], domePts], 20);
    const rivets = [dome.clone().translate(x1, a, 0), dome.clone().translate(x1, -a, 0)];
    return {
      sat: mergeAll([sTop]),
      pol: mergeAll([sStep, sRail, capIn, rim, panelFace, wall, ...rivets]),
    };
  };
  // ---- centre link piece: satin top with rounded long edges, stadium ends
  const centrePiece = (T) => {
    const Lp = pitch - gJ, Rr = T / 2, a = Lp / 2 - Rr, hw = cHalf - gR / 2, e = 0.25;
    const loop = stadiumLoop(a, Rr, nArcP, 10, 6);
    const prof = [];
    for (let k = 0; k <= 3; k++) { const f = (k / 3) * (Math.PI / 2); prof.push([-hw + e - e * Math.cos(f), e - e * Math.sin(f)]); }
    for (let k = 0; k <= 3; k++) { const f = (k / 3) * (Math.PI / 2); prof.push([hw - e + e * Math.sin(f), e - e * Math.cos(f)]); }
    const [s] = sweepProfile(loop, () => [prof], BRUSH_TILE);
    orient(s, (x, y, z) => [0, y - clamp(y, -a, a), z]);
    const caps = [
      capX(loop.map((L) => [L.y - e * L.ny, L.z - e * L.nz]), [], -hw, -1, BRUSH_TILE),
      capX(loop.map((L) => [L.y - e * L.ny, L.z - e * L.nz]), [], hw, 1, BRUSH_TILE),
    ];
    return { sat: s, pol: mergeAll(caps) };
  };
  const mirrorX = (g) => { const c = g.clone(); c.scale(-1, 1, 1); flipIndex(c); return c; };
  const piece = {};
  const outerOf = (k) => { const W = k === 1 ? BR.widths.link1 : k === 2 ? BR.widths.link2 : BR.widths.rest; const T = k === 1 ? T1 : Tn; const key = `o${W}`; return (piece[key] ||= outerPiece(W, T)); };
  const centreOf = (k) => { const T = k === 1 ? T1 : Tn; const key = `c${T}`; return (piece[key] ||= centrePiece(T)); };

  // ---- end link block (concave end hugging the case, rounded far end), satin / polished
  const endBlock = (x0, x1, yEnd, centre) => {
    const nx = 6, Kt = 8, nE = 10;
    const yCase = (x) => Math.sqrt((md.outerRadius + 0.06) ** 2 - x * x);
    const loops = [];
    for (let i = 0; i <= nx; i++) {
      const x = lerp(x0, x1, i / nx), yc = yCase(x);
      const Re = centre ? T1 / 2 : (elTop(yEnd) - el.bottomZ) / 2 * 0.98;
      const yE = yEnd - Re;
      const zTe = elTop(yE);
      const zBe = centre ? zTe - T1 : el.bottomZ;
      const zc = (zTe + zBe) / 2, bv = (zTe - zBe) / 2;
      const pts = [];
      pts.push({ p: [yc, el.bottomZ + 0.15], f: 'pol' }, { p: [yc, elTop(yc) - 0.15], f: 'pol' });
      for (let k = 0; k <= Kt; k++) { const y = lerp(yc + 0.15, yE, k / Kt); pts.push({ p: [y, elTop(y)], f: 'sat' }); }
      for (let k = 1; k < nE; k++) { const t = Math.PI / 2 - (Math.PI * k) / nE; pts.push({ p: [yE + Re * Math.cos(t), zc + bv * Math.sin(t)], f: 'sat' }); }
      for (let k = 0; k <= Kt; k++) { const y = lerp(yE, yc + 0.15, k / Kt); pts.push({ p: [y, lerp(zBe, el.bottomZ, k / Kt)], f: 'sat' }); }
      loops.push({ x, pts });
    }
    const m = loops[0].pts.length;
    const sat = new Builder(), pol = new Builder();
    const sArc = (pts, j) => { let s = 0; for (let q = 1; q <= j; q++) s += Math.hypot(pts[q].p[0] - pts[q - 1].p[0], pts[q].p[1] - pts[q - 1].p[1]); return s; };
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < m; j++) {
        const j1 = (j + 1) % m;
        const f = loops[i].pts[j].f === 'pol' && loops[i].pts[j1].f === 'pol' ? pol : sat;
        const P = (ii, jj) => [loops[ii].x, loops[ii].pts[jj].p[0], loops[ii].pts[jj].p[1]];
        const uv = (ii, jj) => [loops[ii].x / BRUSH_TILE, sArc(loops[ii].pts, jj) / BRUSH_TILE];
        const nn = [0, 0, 0];
        const a = f.vert(P(i, j), nn, uv(i, j)), b = f.vert(P(i + 1, j), nn, uv(i + 1, j)), c = f.vert(P(i + 1, j1), nn, uv(i + 1, j1)), d = f.vert(P(i, j1), nn, uv(i, j1));
        f.tri(a, b, c); f.tri(a, c, d);
      }
    }
    const fix = (B, ctr) => { const g = B.geometry(); return g ? orient(g, (x, y, z) => [0, y - ctr[0], z - ctr[1]]) : null; };
    const ctr = [(21 + (centre ? 24 : 21.5)) / 2 - 0.5, -1.2];
    const satG = fix(sat, ctr), polG = fix(pol, ctr);
    const cap = (i, face) => capX(loops[i].pts.map((q) => q.p), [], loops[i].x, face, BRUSH_TILE);
    return { sat: satG, pol: mergeAll([polG, cap(0, -1), cap(nx, 1)]) };
  };
  const endLink = (() => {
    const xO = lg.xInner - 0.05;
    const c = endBlock(-cHalf + gR / 2, cHalf - gR / 2, el.y[1] + BR.outerJointOffset, true);
    const r = endBlock(cHalf + gR / 2, xO, el.y[1], false);
    const l = endBlock(-xO, -cHalf - gR / 2, el.y[1], false);
    return { sat: mergeAll([c.sat, r.sat, l.sat]), pol: mergeAll([c.pol, r.pol, l.pol]) };
  })();

  // ---- the curve each half hangs on: pins on a centre line leaving the end link at −10°
  // and bending to −38° (SPEC.bracelet.curve), like the 139's strap
  const curveOf = (Lcurve, sMax) => {
    const th0 = BR.curve.startDeg * DEG, th1 = BR.curve.endDeg * DEG, step = 0.05;
    const n = Math.ceil(sMax / step) + 2;
    const Y = new Float64Array(n), Zc = new Float64Array(n);
    Y[0] = el.y[1]; Zc[0] = zMid0;
    for (let i = 1; i < n; i++) {
      const s = (i - 0.5) * step, th = th0 + (th1 - th0) * Math.pow(Math.min(s / Lcurve, 2), 1.5);
      Y[i] = Y[i - 1] + Math.cos(th) * step;
      Zc[i] = Zc[i - 1] + Math.sin(th) * step;
    }
    return (s) => {
      const f = clamp(s / step, 0, n - 1.001), i = Math.floor(f), k = f - i;
      return [Y[i] + (Y[i + 1] - Y[i]) * k, Zc[i] + (Zc[i + 1] - Zc[i]) * k];
    };
  };
  const placeOn = (cv, sgn, sA, sB, centreS = null) => {
    const A = cv(sA), B = cv(sB);
    const dy = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dy, dz);
    const d = new THREE.Vector3(0, (sgn * dy) / l, dz / l);
    const nrm = sgn > 0 ? new THREE.Vector3(0, -dz / l, dy / l) : new THREE.Vector3(0, dz / l, dy / l);
    const xa = new THREE.Vector3().crossVectors(d, nrm);
    const o = centreS === null ? [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] : A;
    return new THREE.Matrix4().makeBasis(xa, d, nrm).setPosition(0, sgn * o[0], o[1]);
  };
  const satList = [], polList = [];
  const put = (pc, m) => { satList.push(pc.sat.clone().applyMatrix4(m)); polList.push(pc.pol.clone().applyMatrix4(m)); };
  const putMirror = (pc, m) => { satList.push(mirrorX(pc.sat).applyMatrix4(m)); polList.push(mirrorX(pc.pol).applyMatrix4(m)); };
  const Lc = BR.clasp.length;
  const halves = [{ sgn: 1, n: BR.links.top }, { sgn: -1, n: BR.links.bottom, clasp: true }];
  const Lcurve = BR.links.top * pitch + BR.outerJointOffset;
  let claspMatrix = null;
  const linkAnchor = [];
  for (const h of halves) {
    const sMax = h.n * pitch + BR.outerJointOffset + (h.clasp ? Lc + 2 : 2);
    const cv = curveOf(Lcurve, sMax);
    // end link: rigid against the case (12 o'clock frame; 6 o'clock = rotated 180° about z)
    const mEnd = h.sgn > 0 ? new THREE.Matrix4() : new THREE.Matrix4().makeRotationZ(Math.PI);
    put(endLink, mEnd);
    for (let k = 1; k <= h.n; k++) {
      const T = k === 1 ? T1 : Tn, Rr = T / 2;
      const s0 = (k - 1) * pitch + gJ / 2, s1 = k * pitch - gJ / 2;
      const mo = placeOn(cv, h.sgn, s0 + Rr, s1 - Rr);
      const op = outerOf(k);
      put(op, mo);
      putMirror(op, mo);
      const c0 = BR.outerJointOffset + (k - 1) * pitch + gJ / 2, c1 = c0 + pitch - gJ;
      put(centreOf(k), placeOn(cv, h.sgn, c0 + Rr, c1 - Rr));
      if (h.sgn > 0 && k === 2) linkAnchor.push(...cv((s0 + s1) / 2));
    }
    if (h.clasp) claspMatrix = placeOn(cv, h.sgn, h.n * pitch + 0.15, h.n * pitch + 0.15 + Lc, true);
  }
  {
    const object = new THREE.Group();
    root.add(object);
    add(object, mergeAll(satList), satin);
    add(object, mergeAll(polList), polished);
    // "72540" / "RP11" engraved inside the 12 o'clock end link (read from the back)
    const engr = (text, c) => {
      const t = engravingText(text, 0.55);
      const geo = surfaceDecal({ c, D: [0, 1], U: [1, 0], w: t.w, h: t.h, rise: t.rise, zFn: () => el.bottomZ, face: -1, nu: 4, nv: 1 });
      const m = decalMaterial(M.steelSatin, t.texture, 0x6a6e74, 0.62, 0.6);
      const mesh = add(object, geo, m, { cast: false, receive: false });
      if (mesh) mesh.renderOrder = 1;
    };
    const xe = (cHalf + lg.xInner) / 2;
    engr(BR.engravings.endLink[0], [xe, 21.0]);
    engr(BR.engravings.endLink[1], [-xe, 21.0]);
    reg.add({
      id: 'bracelet', name: 'Riveted bracelet', category: 'case', side: 'both', exposed: true,
      object, explode: X('bracelet'), explodeDelay: D('bracelet'), priority: 2,
      anchor: [BR.widths.link2 / 2 - 1.2, linkAnchor[0], linkAnchor[1] + Tn / 2],
      description: 'The riveted steel bracelet: three rows of solid links, satin-brushed on top. The outer links are stepped down to a polished rail, and their polished sides carry domed rivet heads — a nod to the riveted bracelets of 1950s Tudors; the links are actually joined by hidden pins.',
      facts: {
        Reference: BR.reference,
        Width: `${BR.widths.endLink.toFixed(0)} mm at the case → ${BR.widths.rest} mm`,
        Construction: 'Three rows, solid links, faux rivet heads',
        Pitch: `${pitch} mm`,
        Finish: 'Satin tops, polished steps, rails and sides',
      },
    });
  }

  // ================================================================ T-fit clasp
  {
    const object = new THREE.Group();
    root.add(object);
    const K = BR.clasp, W2 = K.width / 2, L = K.length;
    const zt = Tn / 2 + 0.25, zbot = zt - K.thickness, zc0 = zt - 1.3;
    const yCheek = BR.outerJointOffset + 0.1;
    const sat = [], pol = [];
    // prism along y of a closed (x, z) section; each edge its own strip (crisp), caps polished
    const prismY = (sec, y0, y1, mats) => { // sec: closed (x, z) polygon, CCW (x right, z up)
      const n = sec.length;
      for (let i = 0; i < n; i++) {
        const p = sec[i], q = sec[(i + 1) % n];
        const pos = [p[0], y0, p[1], q[0], y0, q[1], q[0], y1, q[1], p[0], y1, p[1]];
        const uv = [p[0] / BRUSH_TILE, y0 / BRUSH_TILE, q[0] / BRUSH_TILE, y0 / BRUSH_TILE, q[0] / BRUSH_TILE, y1 / BRUSH_TILE, p[0] / BRUSH_TILE, y1 / BRUSH_TILE];
        const g = makeGeo(pos, uv, [0, 1, 2, 0, 2, 3]);
        const ox = q[1] - p[1], oz = -(q[0] - p[0]); // outward = right of the CCW travel
        orient(g, () => [ox, 0, oz]);
        (mats[i] === 'sat' ? sat : pol).push(g);
      }
      const capS = (y, face) => {
        const v2 = (p) => new THREE.Vector2(p[0], p[1]);
        const tri = THREE.ShapeUtils.triangulateShape(sec.map(v2), []);
        const pos = [], uv = [], idx = [];
        for (const [x, z] of sec) { pos.push(x, y, z); uv.push(0, 0); }
        for (const t of tri) idx.push(t[0], t[1], t[2]);
        pol.push(orient(makeGeo(pos, uv, idx), () => [0, face, 0]));
      };
      capS(y0, -1); capS(y1, 1);
    };
    const xs = 7.95, xb = W2;
    const coverSec = [[-xb, zc0], [xb, zc0], [xb, zt - 0.7], [xs, zt - 0.22], [cHalf, zt], [-cHalf, zt], [-xs, zt - 0.22], [-xb, zt - 0.7]];
    const coverMat = ['pol', 'pol', 'pol', 'sat', 'sat', 'sat', 'pol', 'pol'];
    prismY(coverSec, yCheek, L - 1.4, coverMat);
    // cheeks at the hinge end, either side of the last centre link
    const zAt = (x) => (x <= cHalf ? zt : lerp(zt, zt - 0.22, (x - cHalf) / (xs - cHalf)));
    const x0c = cHalf + gR;
    const cheek = [[x0c, zc0], [xb, zc0], [xb, zt - 0.7], [xs, zt - 0.22], [x0c, zAt(x0c)]];
    prismY(cheek, 0.1, yCheek, ['pol', 'pol', 'pol', 'sat', 'pol']);
    prismY(cheek.map(([x, z]) => [-x, z]).reverse(), 0.1, yCheek, ['sat', 'pol', 'pol', 'pol', 'pol']);
    // free-end bar (polished) and the T-fit body underneath (satin)
    prismY([[-xb + 0.25, zc0], [xb - 0.25, zc0], [xb - 0.25, zt - 0.45], [xb - 0.6, zt - 0.1], [-xb + 0.6, zt - 0.1], [-xb + 0.25, zt - 0.45]], L - 1.4, L, ['pol', 'pol', 'pol', 'pol', 'pol', 'pol']);
    prismY([[-xb + 0.6, zbot], [xb - 0.6, zbot], [xb - 0.6, zc0], [-xb + 0.6, zc0]], 0.4, L - 0.3, ['sat', 'pol', 'sat', 'pol']);
    // the raised polished Tudor shield lift tab at the opening end
    const tabH = 2.5;
    const tab = new THREE.ExtrudeGeometry(regionsToShapes(THREE, shieldRegions(tabH, { outlineOnly: true })), {
      depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelOffset: -0.05, bevelSegments: 2, curveSegments: 4,
    });
    const face = new THREE.ExtrudeGeometry(regionsToShapes(THREE, shieldRegions(tabH * 0.86)), {
      depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelOffset: -0.02, bevelSegments: 1, curveSegments: 4,
    });
    face.translate(0, 0, 0.3);
    for (const g of [tab, face]) {
      g.translate(0, 0, zt + 0.02);
      g.translate(0, L - 1.4 - tabH / 2 + 0.2, 0);
      pol.push(g);
    }
    const satG = mergeAll(sat), polG = mergeAll(pol);
    satG.applyMatrix4(claspMatrix);
    polG.applyMatrix4(claspMatrix);
    add(object, satG, satin);
    add(object, polG, polished);
    const an = new THREE.Vector3(0, L * 0.55, zt).applyMatrix4(claspMatrix);
    reg.add({
      id: 'clasp', name: 'T-fit clasp', category: 'case', side: 'both', exposed: true,
      object, explode: X('clasp'), explodeDelay: D('clasp'), priority: 2,
      anchor: [an.x, an.y, an.z],
      description: 'Tudor\'s T-fit folding clasp. Under the brushed cover a sliding piece lengthens or shortens the bracelet by up to 8 mm in five 2 mm steps without tools, held by a ceramic-ball detent; the polished Tudor shield is the lift tab that opens it.',
      facts: {
        Adjustment: `${K.tfit.positions} positions, ${K.tfit.travel} mm (${K.tfit.step} mm steps)`,
        Size: `${K.width} × ${K.length} mm`,
        Cover: 'Satin with polished bevels',
        Detent: 'Ceramic ball',
      },
    });
  }
}
