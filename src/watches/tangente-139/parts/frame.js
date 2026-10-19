// FRAME — pillar (main) plate, Glashütte three-quarter plate, pallet bridge, the hole
// jewels set in them, the plate screws and the plate engravings of the NOMOS DUW 4001.
//
// Every outline is defined as a 2-D signed distance field (negative inside) in the
// dial-side movement frame (mm), so plates can be built with real boolean shapes
// (disc minus cut-outs, notches, recesses …). Outlines are extracted with marching
// squares, simplified, and extruded by our own slab builder, which puts polished
// anglage (a 45° chamfer) only on the edges that really have it.
//
// Measurements not in SPEC were taken from the official NOMOS back render
// (duw4001_back.jpg, 54.41 px/mm) in back-view coordinates and converted with Bk().

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ribbedMaterial, bluedScrewMaterial, rubyMaterial, cockFlank, cockOutline } from './finish.js';

const DEG = Math.PI / 180;
const Bk = (x, y) => [-x, y]; // back-view measurement → dial-side frame

// ============================================================================ SDFs
// Every SDF carries a bounding box `bb` of its inside (null = unbounded) so unions can
// skip far-away terms exactly (a term is ≥ the distance to its box).
const mk = (fn, bb) => { fn.bb = bb; return fn; };
const boxUnion = (bbs) => (bbs.length && bbs.every(Boolean)
  ? [Math.min(...bbs.map((b) => b[0])), Math.min(...bbs.map((b) => b[1])), Math.max(...bbs.map((b) => b[2])), Math.max(...bbs.map((b) => b[3]))] : null);
const SD = {
  circle: (c, r) => mk((x, y) => Math.sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2) - r, [c[0] - r, c[1] - r, c[0] + r, c[1] + r]),
  capsule: (a, b, r) => {
    const bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by || 1e-12;
    return mk((x, y) => {
      const px = x - a[0], py = y - a[1];
      const h = Math.min(1, Math.max(0, (px * bx + py * by) / l2));
      const qx = px - bx * h, qy = py - by * h;
      return Math.sqrt(qx * qx + qy * qy) - r;
    }, [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r]);
  },
  box: (cx, cy, hx, hy) => mk((x, y) => {
    const dx = Math.abs(x - cx) - hx, dy = Math.abs(y - cy) - hy;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  }, [cx - hx, cy - hy, cx + hx, cy + hy]),
  poly: (v) => mk((px, py) => {
    let d = (px - v[0][0]) ** 2 + (py - v[0][1]) ** 2;
    let s = 1;
    for (let i = 0, j = v.length - 1; i < v.length; j = i, i++) {
      const ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1];
      const wx = px - v[i][0], wy = py - v[i][1];
      const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      const bx = wx - ex * t, by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= v[i][1], c2 = py < v[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  }, [Math.min(...v.map((p) => p[0])), Math.min(...v.map((p) => p[1])), Math.max(...v.map((p) => p[0])), Math.max(...v.map((p) => p[1]))]),
  union: (...f) => {
    const n = f.length, bbs = f.map((g) => g.bb || null);
    // ev(x, y, cap) = min(cap, union) — exact; terms whose box is farther than the
    // running minimum are skipped
    const ev = (x, y, cap = Infinity) => {
      let d = cap;
      for (let i = 0; i < n; i++) {
        const b = bbs[i];
        if (b) {
          const dx = Math.max(b[0] - x, x - b[2], 0), dy = Math.max(b[1] - y, y - b[3], 0);
          if (dx >= d || dy >= d || dx * dx + dy * dy >= d * d) continue;
        }
        const e = f[i](x, y);
        if (e < d) d = e;
      }
      return d;
    };
    const fn = mk((x, y) => ev(x, y), boxUnion(bbs));
    fn.ev = ev;
    return fn;
  },
  inter: (...f) => {
    const bbs = f.map((g) => g.bb).filter(Boolean);
    const bb = bbs.length ? [Math.max(...bbs.map((b) => b[0])), Math.max(...bbs.map((b) => b[1])), Math.min(...bbs.map((b) => b[2])), Math.min(...bbs.map((b) => b[3]))] : null;
    return mk((x, y) => {
      let d = -Infinity;
      for (let i = 0; i < f.length; i++) { const e = f[i](x, y); if (e > d) d = e; }
      return d;
    }, bb);
  },
  // a minus the union of b (exact: the union is only resolved below −a)
  sub: (a, ...b) => {
    const u = b.length === 1 && b[0].ev ? b[0] : SD.union(...b);
    return mk((x, y) => { const av = a(x, y); return Math.max(av, -u.ev(x, y, -av)); }, a.bb);
  },
  grow: (f, d) => mk((x, y) => f(x, y) - d, f.bb ? [f.bb[0] - d, f.bb[1] - d, f.bb[2] + d, f.bb[3] + d] : null),
  not: (f) => mk((x, y) => -f(x, y), null),
  // Angular sector around c between two back-view angles (CCW in back view).
  sectorBack: (c, a1, a2) => {
    const d1 = [-Math.cos(a1 * DEG), Math.sin(a1 * DEG)], d2 = [-Math.cos(a2 * DEG), Math.sin(a2 * DEG)];
    return mk((x, y) => {
      const vx = x - c[0], vy = y - c[1];
      return Math.max(-(d2[0] * vy - d2[1] * vx), -(vx * d1[1] - vy * d1[0]));
    }, null);
  },
};

function circumcircle(p1, p2, p3) {
  const ax = p1[0], ay = p1[1], bx = p2[0], by = p2[1], cx = p3[0], cy = p3[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  return { c: [ux, uy], r: Math.hypot(ax - ux, ay - uy) };
}

// ============================================================ region → contours
// Sample an SDF on a grid; blocks far from the zero set are filled with the centre
// value (only the sign matters there — the SDFs are 1-Lipschitz).
function sampleGrid(f, x0, y0, nx, ny, h) {
  const v = new Float32Array(nx * ny);
  const BS = 8;
  for (let bj = 0; bj < ny; bj += BS) {
    for (let bi = 0; bi < nx; bi += BS) {
      const ie = Math.min(nx, bi + BS), je = Math.min(ny, bj + BS);
      const cx = x0 + ((bi + ie - 1) / 2) * h, cy = y0 + ((bj + je - 1) / 2) * h;
      const dc = f(cx, cy);
      const half = (Math.hypot(ie - 1 - bi, je - 1 - bj) * h) / 2;
      if (Math.abs(dc) > half + 2 * h) {
        for (let j = bj; j < je; j++) for (let i = bi; i < ie; i++) v[j * nx + i] = dc;
      } else {
        for (let j = bj; j < je; j++) {
          for (let i = bi; i < ie; i++) {
            let d = f(x0 + i * h, y0 + j * h);
            if (Math.abs(d) < 1e-6) d = 1e-6; // no crossings exactly on a grid node
            v[j * nx + i] = d;
          }
        }
      }
    }
  }
  return v;
}

// Marching squares → closed loops with the inside on the left (outer CCW, holes CW).
function marching(v, nx, ny, x0, y0, h) {
  const N = nx * ny;
  const next = new Int32Array(2 * N).fill(-1);
  const has = new Uint8Array(2 * N);
  const px = new Float64Array(2 * N), py = new Float64Array(2 * N);
  const cross = (e) => {
    if (has[e]) return;
    has[e] = 1;
    if (e < N) {
      const j = (e / nx) | 0, i = e - j * nx;
      const a = v[e], b = v[e + 1];
      px[e] = x0 + (i + a / (a - b)) * h; py[e] = y0 + j * h;
    } else {
      const k = e - N, j = (k / nx) | 0, i = k - j * nx;
      const a = v[k], b = v[k + nx];
      px[e] = x0 + i * h; py[e] = y0 + (j + a / (a - b)) * h;
    }
  };
  const seg = (p, q, a, b, c, d, i, j) => {
    cross(p); cross(q);
    const u = ((px[p] + px[q]) / 2 - x0) / h - i, w = ((py[p] + py[q]) / 2 - y0) / h - j;
    const gx = (b - a) * (1 - w) + (c - d) * w, gy = (d - a) * (1 - u) + (c - b) * u;
    const ex = px[q] - px[p], ey = py[q] - py[p];
    if (-ey * gx + ex * gy > 0) next[q] = p; else next[p] = q;
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const ia = j * nx + i;
      const a = v[ia], b = v[ia + 1], c = v[ia + nx + 1], d = v[ia + nx];
      const k = (a < 0 ? 1 : 0) | (b < 0 ? 2 : 0) | (c < 0 ? 4 : 0) | (d < 0 ? 8 : 0);
      if (k === 0 || k === 15) continue;
      const e0 = ia, e1 = N + ia + 1, e2 = ia + nx, e3 = N + ia;
      if (k === 5 || k === 10) {
        const inC = a + b + c + d < 0;
        if ((k === 5) === inC) { seg(e0, e1, a, b, c, d, i, j); seg(e2, e3, a, b, c, d, i, j); } else { seg(e0, e3, a, b, c, d, i, j); seg(e1, e2, a, b, c, d, i, j); }
      } else {
        const es = [];
        if ((k & 1) !== ((k >> 1) & 1)) es.push(e0);
        if (((k >> 1) & 1) !== ((k >> 2) & 1)) es.push(e1);
        if (((k >> 2) & 1) !== ((k >> 3) & 1)) es.push(e2);
        if (((k >> 3) & 1) !== (k & 1)) es.push(e3);
        seg(es[0], es[1], a, b, c, d, i, j);
      }
    }
  }
  const loops = [];
  let broken = 0;
  const seen = new Uint8Array(2 * N);
  for (let e = 0; e < 2 * N; e++) {
    if (next[e] < 0 || seen[e]) continue;
    const loop = [];
    let k = e;
    while (k >= 0 && !seen[k]) {
      seen[k] = 1;
      const p = [px[k], py[k]];
      const l = loop[loop.length - 1];
      if (!l || Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) > 1e-6) loop.push(p);
      k = next[k];
    }
    if (k !== e) { broken++; continue; } // open chain: should never happen
    if (loop.length > 2) loops.push(loop);
  }
  if (broken) console.warn(`[frame] marching squares: ${broken} open contour(s) dropped`);
  return loops;
}

function dpSimplify(pts, tol) {
  const n = pts.length;
  if (n < 8) return pts;
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > fd) { fd = d; far = i; }
  }
  const keep = new Uint8Array(n);
  keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const A = pts[a], C = pts[b % n];
    const dx = C[0] - A[0], dy = C[1] - A[1], L = Math.hypot(dx, dy) || 1e-12;
    let md = -1, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - A[0]) * dy - (pts[i][1] - A[1]) * dx) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const loopArea = (l) => {
  let a = 0;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += (l[j][0] - l[i][0]) * (l[j][1] + l[i][1]);
  return a / 2;
};
const inPoly = (p, l) => {
  let c = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    if ((l[i][1] > p[1]) !== (l[j][1] > p[1]) && p[0] < ((l[j][0] - l[i][0]) * (p[1] - l[i][1])) / (l[j][1] - l[i][1]) + l[i][0]) c = !c;
  }
  return c;
};

// SDF region → [{ outer, holes }] (outer CCW, holes CW, points as [x, y]).
function regionShapes(f, box, h = 0.03, tol = 0.0025) {
  const x0 = box[0] - 3 * h, y0 = box[1] - 3 * h;
  const nx = Math.ceil((box[2] - box[0]) / h) + 7, ny = Math.ceil((box[3] - box[1]) / h) + 7;
  const v = sampleGrid(f, x0, y0, nx, ny, h);
  for (let i = 0; i < nx; i++) { v[i] = Math.max(v[i], h); v[(ny - 1) * nx + i] = Math.max(v[(ny - 1) * nx + i], h); }
  for (let j = 0; j < ny; j++) { v[j * nx] = Math.max(v[j * nx], h); v[j * nx + nx - 1] = Math.max(v[j * nx + nx - 1], h); }
  const loops = marching(v, nx, ny, x0, y0, h).map((l) => dpSimplify(l, tol)).filter((l) => l.length >= 3 && Math.abs(loopArea(l)) > 2e-4);
  const outers = loops.filter((l) => loopArea(l) > 0).map((l) => ({ outer: l, holes: [], a: loopArea(l) }));
  outers.sort((p, q) => p.a - q.a);
  for (const l of loops) {
    if (loopArea(l) >= 0) continue;
    const o = outers.find((s) => inPoly(l[0], s.outer));
    if (o) o.holes.push(l);
  }
  return outers.map((o) => ({ outer: o.outer, holes: o.holes }));
}

// ============================================================ geometry builders
function creasedNormals(pos, angleDeg = 38) {
  const n = pos.length / 3;
  const fN = new Float32Array(n); // one normal per triangle, stored at its 3 slots
  for (let t = 0; t < n / 3; t++) {
    const o = t * 9;
    const ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2];
    const bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const l = Math.hypot(cx, cy, cz);
    if (l > 1e-12) { cx /= l; cy /= l; cz /= l; } else { cx = cy = cz = 0; }
    fN[t * 3] = cx; fN[t * 3 + 1] = cy; fN[t * 3 + 2] = cz;
  }
  // exact numeric key (0.1 µm grid; |x|,|y| < 13 mm, |z| < 3.2 mm → 52 bits)
  const key = (i) => ((Math.round(pos[i * 3] * 1e4) + 131072) * 262144 + (Math.round(pos[i * 3 + 1] * 1e4) + 131072)) * 65536 + (Math.round(pos[i * 3 + 2] * 1e4) + 32768);
  const map = new Map();
  for (let i = 0; i < n; i++) {
    const k = key(i);
    let a = map.get(k);
    if (!a) { a = []; map.set(k, a); }
    a.push((i / 3) | 0);
  }
  const cosA = Math.cos(angleDeg * DEG);
  const out = new Float32Array(pos.length);
  for (let i = 0; i < n; i++) {
    const f = (i / 3) | 0;
    const fx = fN[f * 3], fy = fN[f * 3 + 1], fz = fN[f * 3 + 2];
    let sx = 0, sy = 0, sz = 0;
    for (const g of map.get(key(i))) {
      const gx = fN[g * 3], gy = fN[g * 3 + 1], gz = fN[g * 3 + 2];
      if (fx * gx + fy * gy + fz * gz >= cosA) { sx += gx; sy += gy; sz += gz; }
    }
    const l = Math.hypot(sx, sy, sz) || 1;
    out[i * 3] = sx / l; out[i * 3 + 1] = sy / l; out[i * 3 + 2] = sz / l;
    if (!(l > 0) || (sx === 0 && sy === 0 && sz === 0)) { out[i * 3] = fx; out[i * 3 + 1] = fy; out[i * 3 + 2] = fz || 1; }
  }
  return out;
}

function makeGeo(pos, nrm) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(pos);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm instanceof Float32Array ? nrm : new Float32Array(nrm), 3));
  const uv = new Float32Array((p.length / 3) * 2);
  for (let i = 0, k = 0; i < p.length; i += 3, k += 2) { uv[k] = p[i]; uv[k + 1] = p[i + 1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Inset every contour of a shape by the per-vertex chamfer sizes of sizeFn and make sure
// the inset contours cross neither themselves nor each other (narrow necks, sharp corners
// and holes close to the edge would otherwise break the cap triangulation): wherever two
// inset edges cross, the chamfer is reduced locally (halved, then removed) and the
// contours recomputed.
function insetShape(cs, sizeFn) {
  const S = cs.map((c) => Float64Array.from(c, (p) => sizeFn(p[0], p[1])));
  let P = cs.map((c, k) => insetPts(c, S[k]));
  for (let pass = 0; pass < 10; pass++) {
    const bad = insetCrossings(P);
    if (!bad.length) break;
    const f = pass < 4 ? 0.5 : 0;
    for (const [k, i] of bad) {
      const n = cs[k].length;
      for (let d = -2; d <= 2; d++) S[k][(i + d + n) % n] *= f;
    }
    P = cs.map((c, k) => insetPts(c, S[k]));
  }
  return cs.map((c, k) => ({ pts: P[k], s: S[k] }));
}

// Vertices ([contour, index]) of edges that properly cross another edge (sweep over x).
function insetCrossings(P) {
  const seg = [];
  P.forEach((l, k) => {
    for (let i = 0; i < l.length; i++) {
      const a = l[i], b = l[(i + 1) % l.length];
      seg.push({ k, i, n: l.length, a, b, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) });
    }
  });
  seg.sort((p, q) => p.x0 - q.x0);
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const bad = [];
  for (let u = 0; u < seg.length; u++) {
    const s1 = seg[u];
    for (let v = u + 1; v < seg.length && seg[v].x0 <= s1.x1; v++) {
      const s2 = seg[v];
      if (s2.y0 > s1.y1 || s2.y1 < s1.y0) continue;
      if (s1.k === s2.k && (Math.abs(s1.i - s2.i) <= 1 || Math.abs(s1.i - s2.i) === s1.n - 1)) continue;
      if (o(s1.a, s1.b, s2.a) * o(s1.a, s1.b, s2.b) < 0 && o(s2.a, s2.b, s1.a) * o(s2.a, s2.b, s1.b) < 0) {
        bad.push([s1.k, s1.i], [s1.k, (s1.i + 1) % s1.n], [s2.k, s2.i], [s2.k, (s2.i + 1) % s2.n]);
      }
    }
  }
  return bad;
}

function insetPts(loop, s) {
  const n = loop.length, pts = new Array(n);
  for (let i = 0; i < n; i++) {
    const p0 = loop[(i - 1 + n) % n], p = loop[i], p1 = loop[(i + 1) % n];
    let ax = p[0] - p0[0], ay = p[1] - p0[1];
    const la = Math.hypot(ax, ay) || 1e-9; ax /= la; ay /= la;
    let bx = p1[0] - p[0], by = p1[1] - p[1];
    const lb = Math.hypot(bx, by) || 1e-9; bx /= lb; by /= lb;
    const n1x = -ay, n1y = ax, n2x = -by, n2y = bx;
    let mx = n1x + n2x, my = n1y + n2y;
    const lm = Math.hypot(mx, my);
    if (lm < 1e-6) { mx = n1x; my = n1y; } else { mx /= lm; my /= lm; }
    const d = s[i] / Math.max(0.4, mx * n1x + my * n1y);
    pts[i] = [p[0] + mx * d, p[1] + my * d];
  }
  // Marching squares leaves short edges at corners; an inset larger than such an edge
  // turns it inside out and the cap triangulation then silently fails. Collapse every
  // inverted inset edge to its midpoint (duplicate points are dropped by earcut) until
  // none is left.
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ox = loop[j][0] - loop[i][0], oy = loop[j][1] - loop[i][1];
      const nx = pts[j][0] - pts[i][0], ny = pts[j][1] - pts[i][1];
      if (ox * nx + oy * ny < 0) {
        const m = [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
        pts[i] = m; pts[j] = [m[0], m[1]];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return pts;
}

// Extrude shapes between z0 (the −Z face, towards the case back) and z1 (the +Z face).
// top/bottom: chamfer size (number or (x, y) => size) on the z0 / z1 edges.
// Returns { caps, walls } geometries (caps with flat normals, walls with creased normals).
function slab(shapes, z0, z1, opt = {}) {
  const fT = typeof opt.top === 'function' ? opt.top : () => opt.top || 0;
  const fB = typeof opt.bottom === 'function' ? opt.bottom : () => opt.bottom || 0;
  const capP = [], capN = [], wallP = [];
  const cap = (contours, z, facing) => {
    const vs = contours.map((c) => c.map((p) => new THREE.Vector2(p[0], p[1])));
    const faces = THREE.ShapeUtils.triangulateShape(vs[0], vs.slice(1)); // may drop duplicate end points in place
    const all = vs.flat();
    // one-time build check: the triangles must cover the contour's area, otherwise earcut
    // gave up on a self-intersecting contour and the cap has a hole
    const area = (l) => { let a = 0; for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += (l[j].x - l[i].x) * (l[j].y + l[i].y); return a / 2; };
    const want = Math.abs(area(vs[0])) - vs.slice(1).reduce((s, h) => s + Math.abs(area(h)), 0);
    let got = 0;
    for (const [a, b, c] of faces) got += Math.abs((all[b].x - all[a].x) * (all[c].y - all[a].y) - (all[b].y - all[a].y) * (all[c].x - all[a].x)) / 2;
    if (Math.abs(got - want) > 1e-3 + want * 1e-3) console.warn(`[frame] cap triangulation incomplete: ${got.toFixed(3)} of ${want.toFixed(3)} mm² (z ${z}, near ${vs[0][0].x.toFixed(2)}, ${vs[0][0].y.toFixed(2)})`);
    for (const [a, b, c] of faces) {
      const A = all[a], Bv = all[b], C = all[c];
      const ar = (Bv.x - A.x) * (C.y - A.y) - (Bv.y - A.y) * (C.x - A.x);
      const tri = (facing > 0 ? ar < 0 : ar > 0) ? [A, C, Bv] : [A, Bv, C];
      for (const P of tri) {
        capP.push(P.x, P.y, z);
        if (opt.capNormal && facing < 0) capN.push(...opt.capNormal(P.x, P.y));
        else capN.push(0, 0, facing);
      }
    }
  };
  const quad = (A, Bq, C, D) => {
    wallP.push(A[0][0], A[0][1], A[1], Bq[0][0], Bq[0][1], Bq[1], C[0][0], C[0][1], C[1]);
    wallP.push(A[0][0], A[0][1], A[1], C[0][0], C[0][1], C[1], D[0][0], D[0][1], D[1]);
  };
  for (const sh of shapes) {
    const cs = [sh.outer, ...sh.holes];
    const iT = insetShape(cs, fT);
    const iB = insetShape(cs, fB);
    if (opt.capTop !== false) cap(iT.map((o) => o.pts), z0, -1);
    if (opt.capBottom !== false) cap(iB.map((o) => o.pts), z1, 1);
    cs.forEach((c, k) => {
      const t = iT[k], b = iB[k], n = c.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const p = c[i], q = c[j];
        if (t.s[i] > 0 || t.s[j] > 0) quad([t.pts[i], z0], [t.pts[j], z0], [q, z0 + t.s[j]], [p, z0 + t.s[i]]);
        quad([p, z0 + t.s[i]], [q, z0 + t.s[j]], [q, z1 - b.s[j]], [p, z1 - b.s[i]]);
        if (b.s[i] > 0 || b.s[j] > 0) quad([p, z1 - b.s[i]], [q, z1 - b.s[j]], [b.pts[j], z1], [b.pts[i], z1]);
      }
    });
  }
  return {
    caps: capP.length ? makeGeo(capP, capN) : null,
    walls: wallP.length ? makeGeo(wallP, creasedNormals(wallP)) : null,
  };
}

// Surface of revolution about Z at (cx, cy). parts: polylines [[r, z], …]; normals are
// smooth inside a polyline and creased between polylines. Normal = (dz, −dr) along the
// profile, so walk outward/upward accordingly.
function lathe(parts, segs, cx = 0, cy = 0) {
  const geos = parts.map((p) => {
    const g = new THREE.LatheGeometry(p.map(([r, z]) => new THREE.Vector2(Math.max(r, 0), z)), segs);
    g.rotateX(Math.PI / 2);
    return g.toNonIndexed();
  });
  const g = geos.length === 1 ? geos[0] : mergeGeometries(geos);
  g.translate(cx, cy, 0);
  return g;
}

function radialUV(g, c, R) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - c[0]) / (2 * R) + 0.5, (p.getY(i) - c[1]) / (2 * R) + 0.5);
  uv.needsUpdate = true;
  return g;
}

// Hole jewel (synthetic ruby): oil cup on the face at zFace, facing −Z if dir = 1
// (the jewel extends towards +Z), or facing +Z if dir = −1.
function jewelGeometry(c, rj, rh, zFace, t, dir = 1) {
  const cupR = rj * 0.56, cupD = Math.min(0.06, t * 0.35), ch = Math.min(0.03, rj * 0.06);
  const cup = [];
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    const r = rh + (cupR - rh) * s;
    cup.push([r, cupD * (1 - s * s)]);
  }
  const parts = [
    cup,
    [[cupR, 0], [rj - ch, 0]],
    [[rj - ch, 0], [rj, ch]],
    [[rj, ch], [rj, t]],
    [[rj, t], [rh, t]],
    [[rh, t], [rh, cupD]],
  ].map((p) => {
    const q = p.map(([r, z]) => [r, zFace + dir * z]);
    return dir > 0 ? q : q.reverse();
  });
  return lathe(parts, 40, c[0], c[1]);
}

// ============================================================ engraving font
// A single-stroke DIN-like engraving font (the plate is engraved with a cutter, so a
// monoline font with round ends is what the real lettering is). Units: cap height = 1.
const FS = 0.17, GAP = 0.25, SPACE = 0.3; // stroke ≈ 0.17 × cap height, as on the plate
const YB = FS / 2, YT = 1 - FS / 2;
function arcPts(cx, cy, rx, ry, a0, a1, n = 18) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return o;
}
const st = (closed, ...items) => {
  const p = [];
  for (const it of items) { if (typeof it[0] === 'number') p.push(it); else p.push(...it); }
  return { p, c: closed };
};
const GLYPHS = (() => {
  const G = {};
  const add = (ch, w, ...s) => { G[ch] = { w, s }; };
  const B = YB, T = YT;
  let w, r;
  w = 0.59; r = 0.3; add('D', w, st(true, [0, B], [0, T], [w - r, T], arcPts(w - r, T - r, r, r, 90, 0), arcPts(w - r, B + r, r, r, 0, -90)));
  w = 0.39; add('E', w, st(false, [w, T], [0, T], [0, B], [w, B]), st(false, [0, 0.5], [w * 0.88, 0.5]));
  w = 0.39; add('F', w, st(false, [w, T], [0, T], [0, B]), st(false, [0, 0.5], [w * 0.88, 0.5]));
  w = 0.55; r = 0.28; add('U', w, st(false, [0, T], arcPts(w / 2, B + r, w / 2, r, 180, 360), [w, T]));
  w = 0.65; add('T', w, st(false, [0, T], [w, T]), st(false, [w / 2, T], [w / 2, B]));
  w = 0.53; add('S', w, st(false, arcPts(w / 2, T - 0.205, w / 2, 0.205, 18, 245), arcPts(w / 2, B + 0.225, w / 2, 0.225, 62, -168)));
  w = 0.59; r = 0.3; add('C', w, st(false, arcPts(w / 2, T - r, w / 2, r, 32, 180), arcPts(w / 2, B + r, w / 2, r, 180, 328)));
  w = 0.61; r = 0.305; add('G', w, st(false, arcPts(w / 2, T - r, w / 2, r, 32, 180), arcPts(w / 2, B + r, w / 2, r, 180, 360), [w, 0.47], [w * 0.5, 0.47]));
  w = 0.65; r = 0.325; add('O', w, st(true, arcPts(w / 2, T - r, w / 2, r, 0, 180), arcPts(w / 2, B + r, w / 2, r, 180, 360)));
  add('Q', w, st(true, arcPts(w / 2, T - r, w / 2, r, 0, 180), arcPts(w / 2, B + r, w / 2, r, 180, 360)), st(false, [w * 0.62, 0.26], [w + 0.03, B - 0.02]));
  w = 0.59; add('H', w, st(false, [0, B], [0, T]), st(false, [w, B], [w, T]), st(false, [0, 0.5], [w, 0.5]));
  w = 0.57; add('N', w, st(false, [0, B], [0, T], [w, B], [w, T]));
  w = 0.82; add('M', w, st(false, [0, B], [0, T], [w / 2, 0.3], [w, T], [w, B]));
  w = 0.47; add('L', w, st(false, [0, T], [0, B], [w, B]));
  w = 0.73; add('A', w, st(false, [0, B], [w / 2, T], [w, B]), st(false, [w * 0.17, 0.32], [w * 0.83, 0.32]));
  w = 1.21; add('W', w, st(false, [0, T], [w * 0.23, B], [w / 2, T], [w * 0.77, B], [w, T]));
  w = 0.68; add('V', w, st(false, [0, T], [w / 2, B], [w, T]));
  w = 0.62; add('X', w, st(false, [0, T], [w, B]), st(false, [w, T], [0, B]));
  w = 0.55; add('Z', w, st(false, [0, T], [w, T], [0, B], [w, B]));
  w = 0.45; add('J', w, st(false, [w, T], arcPts(w / 2, B + 0.25, w / 2, 0.25, 0, -180)));
  w = 0.53; r = 0.215; add('R', w, st(false, [0, B], [0, T], [w - r, T], arcPts(w - r, T - r, r, r, 90, -90), [0, T - 2 * r]), st(false, [w - r - 0.04, T - 2 * r], [w, B]));
  w = 0.53; r = 0.22; add('P', w, st(false, [0, B], [0, T], [w - r, T], arcPts(w - r, T - r, r, r, 90, -90), [0, T - 2 * r]));
  {
    w = 0.53;
    const rt = (T - 0.5) / 2, rb = (0.5 - B) / 2;
    add('B', w, st(false, [0, B], [0, T], [w - 0.05 - rt, T], arcPts(w - 0.05 - rt, T - rt, rt, rt, 90, -90), [0, 0.5]),
      st(false, [0, 0.5], [w - rb, 0.5], arcPts(w - rb, B + rb, rb, rb, 90, -90), [0, B]));
  }
  w = 0.55; add('K', w, st(false, [0, B], [0, T]), st(false, [w, T], [0, 0.36]), st(false, [0.19, 0.53], [w, B]));
  w = 0.65; add('Y', w, st(false, [0, T], [w / 2, 0.47], [w, T]), st(false, [w / 2, 0.47], [w / 2, B]));
  add('I', 0, st(false, [0, B], [0, T]));
  const dots = (ww) => [st(false, [ww * 0.26, 1.1], [ww * 0.26 + 0.001, 1.1]), st(false, [ww * 0.74, 1.1], [ww * 0.74 + 0.001, 1.1])];
  add('Ü', G.U.w, ...G.U.s, ...dots(G.U.w));
  add('Ö', G.O.w, ...G.O.s, ...dots(G.O.w));
  add('Ä', G.A.w, ...G.A.s, ...dots(G.A.w));
  // digits
  w = 0.52; r = 0.26; add('0', w, st(true, arcPts(w / 2, T - r, w / 2, r, 0, 180), arcPts(w / 2, B + r, w / 2, r, 180, 360)));
  add('1', 0.15, st(false, [0, T - 0.17], [0.15, T], [0.15, B]));
  w = 0.52; add('2', w, st(false, arcPts(w / 2, T - 0.25, w / 2, 0.25, 158, -28), [0, B], [w, B]));
  w = 0.52; add('3', w, st(false, arcPts(w / 2, T - 0.2, (w / 2) * 0.94, 0.2, 150, -90), arcPts(w / 2, B + 0.225, w / 2, 0.225, 90, -155)));
  w = 0.63; add('4', w, st(false, [w * 0.72, B], [w * 0.72, T], [0, 0.33], [w, 0.33]));
  w = 0.5; add('5', w, st(false, [w * 0.92, T], [0.03, T], [0, 0.555], arcPts(w / 2, B + 0.27, w / 2, 0.27, 145, -150)));
  {
    w = 0.52;
    const cy = B + 0.27, a = 155 * DEG;
    add('6', w, st(true, arcPts(w / 2, cy, w / 2, 0.27, 0, 360)), st(false, [w / 2 + (w / 2) * Math.cos(a), cy + 0.27 * Math.sin(a)], [w * 0.72, T]));
  }
  w = 0.52; add('7', w, st(false, [0, T], [w, T], [w * 0.28, B]));
  w = 0.52; add('8', w, st(true, arcPts(w / 2, T - 0.2, w * 0.45, 0.2, 0, 360)), st(true, arcPts(w / 2, B + 0.225, w / 2, 0.225, 0, 360)));
  {
    w = 0.52;
    const cy = T - 0.27, a = -25 * DEG;
    add('9', w, st(true, arcPts(w / 2, cy, w / 2, 0.27, 0, 360)), st(false, [w / 2 + (w / 2) * Math.cos(a), cy + 0.27 * Math.sin(a)], [w * 0.28, B]));
  }
  add('°', 0.26, st(true, arcPts(0.13, 0.715, 0.13, 0.13, 0, 360)));
  add('-', 0.3, st(false, [0, 0.45], [0.3, 0.45]));
  add('.', 0, st(false, [0, B], [0.001, B]));
  return G;
})();

function textWidth(str) {
  let w = 0, n = 0;
  for (const ch of str) {
    const g = GLYPHS[ch];
    w += ch === ' ' ? SPACE : g ? g.w + FS : 0.6;
    n++;
  }
  return w + GAP * Math.max(0, n - 1);
}
// Draw `str` with its outer-left edge at x (px) and its baseline (outer bottom) at y (px).
function drawText(c, str, x, y, capPx, hs = 1) {
  c.lineWidth = FS * capPx;
  let xo = 0;
  for (const ch of str) {
    if (ch === ' ') { xo += SPACE + GAP; continue; }
    const g = GLYPHS[ch];
    if (!g) { xo += 0.6 + GAP; continue; }
    for (const s of g.s) {
      c.beginPath();
      s.p.forEach(([gx, gy], i) => {
        const X = x + (xo + FS / 2 + gx) * capPx * hs, Y = y - gy * capPx;
        if (i) c.lineTo(X, Y); else c.moveTo(X, Y);
      });
      if (s.c) c.closePath();
      c.stroke();
    }
    xo += g.w + FS + GAP;
  }
}

function boxBlur(src, w, h, r, passes = 3) {
  let a = Float32Array.from(src), b = new Float32Array(src.length);
  const k = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc * k;
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc * k;
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

// Render engraved lettering into colour (shade), alpha and normal textures.
// draw(ctx2d) strokes the letters in white. mask(px, py) → false hides a pixel.
function engraveTextures(wPx, hPx, draw, { mask, blur = 3, fill = 1, edge = 0.55, strength = 3 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = wPx; cv.height = hPx;
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, wPx, hPx);
  c.strokeStyle = '#fff';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  draw(c);
  const img = c.getImageData(0, 0, wPx, hPx), d = img.data, n = wPx * hPx;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = d[i * 4] / 255;
  if (mask) {
    for (let y = 0; y < hPx; y++) for (let x = 0; x < wPx; x++) { const i = y * wPx + x; if (a[i] > 0 && !mask(x + 0.5, y + 0.5)) a[i] = 0; }
  }
  const b = boxBlur(a, wPx, hPx, blur, 3);
  const mk = () => { const k = document.createElement('canvas'); k.width = wPx; k.height = hPx; return k; };
  const cMap = mk(), cAlpha = mk(), cNorm = mk();
  const iMap = cMap.getContext('2d').createImageData(wPx, hPx);
  const iAl = cAlpha.getContext('2d').createImageData(wPx, hPx);
  const iN = cNorm.getContext('2d').createImageData(wPx, hPx);
  const dm = iMap.data, da = iAl.data, dn = iN.data;
  for (let y = 0; y < hPx; y++) {
    const up = (y > 0 ? y - 1 : 0) * wPx, dn0 = (y < hPx - 1 ? y + 1 : y) * wPx, row = y * wPx;
    for (let x = 0; x < wPx; x++) {
      const i = row + x, o = i * 4;
      const bi = b[i];
      if (bi < 0.002 && a[i] === 0) { // empty: flat, transparent
        dm[o] = dm[o + 1] = dm[o + 2] = edge * 255; da[o] = da[o + 1] = da[o + 2] = 0;
        dn[o] = dn[o + 1] = 128; dn[o + 2] = 255;
        dm[o + 3] = da[o + 3] = dn[o + 3] = 255;
        continue;
      }
      const t = Math.min(1, Math.max(0, (bi - 0.15) / 0.7));
      const sh = (edge + (fill - edge) * t * t * (3 - 2 * t)) * 255;
      dm[o] = dm[o + 1] = dm[o + 2] = sh; dm[o + 3] = 255;
      const al = Math.min(1, a[i] * 1.15) * 255;
      da[o] = da[o + 1] = da[o + 2] = al; da[o + 3] = 255;
      // groove height h = −blurred coverage → tangent normal (−∂h/∂u, −∂h/∂v, 1)
      const xl = x > 0 ? x - 1 : 0, xr = x < wPx - 1 ? x + 1 : x;
      const nx = (b[row + xr] - b[row + xl]) * strength, ny = -(b[dn0 + x] - b[up + x]) * strength;
      const l = Math.sqrt(nx * nx + ny * ny + 1);
      dn[o] = (nx / l * 0.5 + 0.5) * 255; dn[o + 1] = (ny / l * 0.5 + 0.5) * 255; dn[o + 2] = (0.5 / l + 0.5) * 255; dn[o + 3] = 255;
    }
  }
  cMap.getContext('2d').putImageData(iMap, 0, 0);
  cAlpha.getContext('2d').putImageData(iAl, 0, 0);
  cNorm.getContext('2d').putImageData(iN, 0, 0);
  const tex = (cv2, srgb) => {
    const t = new THREE.CanvasTexture(cv2);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: tex(cMap, true), alphaMap: tex(cAlpha, false), normalMap: tex(cNorm, false) };
}

// Grid mesh facing −Z (towards the case back). toBack(u, v) → back-view [x, y]; u runs
// to the right / along the reading direction, v up the letters.
function decalGeometry(toBack, nu, nv, z) {
  const pos = [], uv = [], nrm = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      const [xb, yb] = toBack(u, v);
      pos.push(-xb, yb, z); uv.push(u, v); nrm.push(0, 0, -1);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 2, d = a + nu + 1;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ============================================================================ build
export function buildFrame(ctx) {
  const { spec, M, reg, root } = ctx;
  const planarUV = ctx.planarUV;
  const F = spec.frame, L = spec.layout, Z = spec.z, MV = spec.movement;
  const ribUV = (g) => planarUV(g, MV.ribbing.uvScale, MV.ribbing.uvOffset ?? [0, 0], MV.ribbing.uvAngle);
  const perlUV = (g) => planarUV(g, MV.perlageUvScale);

  const zT = Z.threeQuarterPlate[0], zU = Z.threeQuarterPlate[1]; // 3/4 plate: top (case-back side) / underside
  const zMB = Z.mainPlate[0], zMD = Z.mainPlate[1]; // pillar plate: back face / dial face
  const R34 = F.threeQuarterPlateRadius, RM = F.plateRadius;
  // Polished anglage: the photo shows a bright 45° bevel ≈ 0.1–0.15 mm wide along the plate
  // edge, the balance cut-out and the recesses.
  const BEV = 0.09;
  const bal = F.balanceCutout.center;

  // ---------------------------------------------------------------- materials
  const mat = {
    ribbed: ribbedMaterial(M), // saw-tooth Glashütte ribbing, shared with the balance cock
    bevel: M.rhodiumBevel,
    // the shared perlage normal map reads as hard "fish scales"; the render's perlage is a
    // soft swirl of large (≈1.2 mm) spots, so this module maps it larger
    // (spec.movement.perlageUvScale) with a gentler normal scale
    perlage: (() => {
      const m = M.platePerlage.clone();
      m.normalScale = new THREE.Vector2(0.32, 0.32);
      m.roughnessMap = null; // the ring-by-ring roughness contrast is what reads as scales
      m.roughness = 0.3;
      return m;
    })(),
    grain: M.wheelRhodium,
    frosted: (() => { const m = M.rhodium.clone(); m.roughness = 0.55; m.color.set(0xd2d5d9); return m; })(),
    // synthetic ruby: deep pink-magenta (render medians #a85483 … #824161)
    ruby: rubyMaterial(M),
    hole: new THREE.MeshStandardMaterial({ color: 0x23220f, roughness: 0.55, metalness: 0.2 }),
    blued: bluedScrewMaterial(M), // #1b437e on the render
    bluedSlot: (() => { const m = M.blued.clone(); m.color.set(0x0a1838); m.roughness = 0.5; m.iridescence = 0.1; return m; })(),
    steel: M.steelPolished,
    steelSlot: (() => { const m = M.steelDark.clone(); m.color.set(0x55595f); m.roughness = 0.45; return m; })(),
  };

  // Geometry buckets per object → one merged mesh per material.
  function bucketSet() {
    const m = new Map();
    return {
      add(key, g) { if (!g) return; if (!m.has(key)) m.set(key, []); m.get(key).push(g); },
      build(parent) {
        for (const [key, list] of m) {
          const g = list.length === 1 ? list[0] : mergeGeometries(list);
          const mesh = new THREE.Mesh(g, mat[key]);
          mesh.name = `frame-${key}`;
          parent.add(mesh);
        }
      },
    };
  }

  // ================================================================ feature SDFs
  const zFoot = Z.balanceCock ? Z.balanceCock[1] : zU - 0.1; // floor of the balance-cock pocket
  const zRatchetFloor = Z.ratchetWheel[1]; // the ratchet sits in a recess of the plate top
  const zCrownFloor = Z.crownWheel[1];
  const zClickFloor = Math.max(Z.click ? Z.click[1] : zRatchetFloor, zRatchetFloor);
  const zKeyCeil = zU - 0.18; // underside pocket over the sliding / winding pinion bodies
  const stemY = 0.05; // stem axis (dial frame y), as built by the keyless works
  const boxAround = (c, r) => [c[0] - r, c[1] - r, c[0] + r, c[1] + r];
  const outward = (c, d) => { const l = Math.hypot(c[0], c[1]); return [c[0] + (c[0] / l) * d, c[1] + (c[1] / l) * d]; };
  const nearAny = (fs, tol = 0.01) => (x, y) => { for (const f of fs) if (Math.abs(f(x, y)) < tol) return true; return false; };

  // --- three-quarter plate
  const disc34 = SD.circle([0, 0], R34);
  const cutout = SD.circle(bal, F.balanceCutout.radius);
  // Right of the balance (back view) the plate gives way to the raised rim of the pillar
  // plate (perlaged, carries "MADE IN GERMANY"): sector between these back-view angles.
  // (up to 72°, so the band runs right up to the cock's foot and the curved right flank of
  // its arm, as on the render, leaving no sliver of 3/4 plate between them)
  const bandSector = SD.sectorBack(bal, -57, 72);
  // The balance cock (escapement module) lies in a pocket of the plate with its top flush
  // with the plate top (z.balanceCock). The plate is cut along exactly the outline the
  // escapement module builds (spec outline clipped to the plate, blended into the ring
  // housing) with a 0.04 mm hairline joint, plus the cock's wide frosted flank chamfer,
  // which slopes down into the pocket along the cock's left edge (back view).
  const BC = F.balanceCock;
  const sOutline = SD.poly(cockOutline(BC)), sring = SD.circle(BC.ringCenter, BC.ringRadius);
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const cock = mk((x, y) => smin(Math.max(sOutline(x, y), Math.hypot(x, y) - R34), sring(x, y), 0.5),
    boxUnion([sOutline.bb, sring.bb]).map((v, i) => v + (i < 2 ? -0.5 : 0.5)));
  const chamferBand = SD.poly(cockFlank(BC).band);
  const cockG = SD.union(SD.grow(cock, 0.04), SD.grow(chamferBand, 0.03));
  // Casing-screw notches (measured on the photo): U-shaped, open to the plate edge, around
  // spec.frame.clampNotches (the case module's casing screws, head r 0.78, sit there).
  const notchDefs = [{ c: Bk(2.78, 10.82), r: 1.12 }, { c: Bk(-1.93, -10.68), r: 1.15 }];
  const notches = notchDefs.map((n) => SD.capsule(n.c, outward(n.c, 3), n.r));
  const W = F.windingPinionWindow;
  const wx0 = Math.min(W.x[0], 8.5); // the pinion's teeth start at x 8.55
  const wr = (W.x[1] - wx0) / 2, wx = (wx0 + W.x[1]) / 2;
  const window = SD.capsule([wx, W.y[0] + wr], [wx, W.y[1] - wr], wr);
  const keyBox = SD.box(7.6, stemY, 1.6, 0.95); // sliding + winding pinion bodies under the plate
  // Shallow step at 12 o'clock along the plate edge (casing screw sits in it).
  const cc12 = circumcircle(Bk(-1.4, 11.38), Bk(0.3, 10.45), Bk(1.7, 9.98));
  const rec12 = SD.inter(SD.circle(cc12.c, cc12.r), disc34);
  const crownRec = SD.circle(F.crownWheelRecess.center, F.crownWheelRecess.radius);
  const seat = SD.circle(F.ratchetSeat.center, F.ratchetSeat.radius);
  // Click-screw recess: measured centre (the screw sits at its upper end, at
  // spec clickRecess.center), axis 42.5° in back view.
  const CR = F.clickRecess;
  const clickC = Bk(-8.52, 5.73), clickDir = [-Math.cos(42.5 * DEG), Math.sin(42.5 * DEG)];
  const clickHalf = (CR.length - CR.width) / 2;
  const click = SD.capsule(
    [clickC[0] - clickDir[0] * clickHalf, clickC[1] - clickDir[1] * clickHalf],
    [clickC[0] + clickDir[0] * clickHalf, clickC[1] + clickDir[1] * clickHalf], CR.width / 2);
  // Pocket for the Glashütte click and its long spring along the edge (both lie 0.1 deep).
  const clickArea = SD.union(
    SD.circle(Bk(-8.2, 6.0), 0.74), SD.capsule(Bk(-8.2, 6.0), Bk(-6.55, 7.95), 0.62),
    SD.capsule(Bk(-6.55, 7.95), Bk(-5.27, 7.75), 0.5), SD.circle(Bk(-6.6, 8.1), 0.56),
    SD.inter(SD.sectorBack([0, 0], 116, 143), SD.not(SD.circle([0, 0], 10.55))),
    SD.circle(Bk(-8.43, 6.83), 0.36));
  // Through-opening where the recesses overlap the centre wheel (its gilt teeth show).
  const opening = SD.inter(SD.union(crownRec, seat), SD.circle([0, 0], 3.45));
  const barrelHole = SD.circle(L.barrel, 0.62);
  const UJ = F.upperJewels;
  // rh: jewel hole = the arbor's pivot radius where it passes (train / escapement modules)
  const upperJ = [
    { id: 'center', c: UJ.center, rs: 0.79, rj: 0.69, rh: 0.125 },
    { id: 'third', c: UJ.third, rs: 0.7, rj: 0.58, rh: 0.085 },
    { id: 'fourth', c: UJ.fourth, rs: 0.7, rj: 0.58, rh: 0.075 },
    { id: 'escape', c: UJ.escape, rs: 0.68, rj: 0.57, rh: 0.06 },
  ];
  // Blued screws (index 1 is the balance-cock screw → escapement module).
  const slotBack = [0, null, 38, -1, 13]; // slot angles measured on the photo (back view)
  const blue = F.blueScrews.map((c, i) => ({ c, slot: -(slotBack[i] ?? 0), i })).filter((s) => s.i !== 1);
  const CS_R = 0.86, HEAD_R = F.blueScrewHeadDiameter / 2;
  const zHeadTop = Z.screwHeads ? Z.screwHeads[0] : zT - 0.14;
  // Polished steel screws: pockets measured on the photo. SS[2] sits in a round recess
  // of the plate at the cock's upper corner (the cock's outline is notched round it).
  const SS = F.steelScrews;
  const SR = BC.screwRecess;
  const steel = [
    { c: SS[0], slot: 68, pocket: SD.circle(SS[0], 0.68), depth: 0.15, box: 0.8 },
    { c: SS[1], slot: 40, pocket: SD.inter(SD.capsule(SS[1], outward(SS[1], 3), 0.74), disc34), depth: 0.22, box: 2.2 },
    { c: SS[2], slot: 22, pocket: SR ? SD.circle(SR.center, SR.radius) : null, depth: SR ? 0.15 : 0, box: 0.9 },
    { c: SS[3], slot: -98, pocket: null, depth: 0.1, box: 0 }, // sits on the 12 o'clock step
  ];

  const jewelSinks = upperJ.map((j) => SD.circle(j.c, j.rs));
  const blueSinks = blue.map((s) => SD.circle(s.c, CS_R));
  const plate34 = SD.sub(disc34, cutout, bandSector, cockG, ...notches, window, rec12, crownRec, seat, click, clickArea,
    barrelHole, ...jewelSinks, ...blueSinks, ...steel.filter((s) => s.pocket).map((s) => s.pocket));
  const noBevel34 = nearAny([...jewelSinks, ...blueSinks]);

  // --- main (pillar) plate
  const discM = SD.circle([0, 0], RM);
  const stemNotch = SD.box(RM, stemY, RM - 11.45, 0.8); // crown-side edge notch for the stem
  const windSlot = SD.capsule([wx, W.y[0] + wr - 0.25], [wx, W.y[1] - wr + 0.25], wr + 0.15);
  const keySlot = SD.box(7.7, stemY, 1.78, 0.95); // sliding pinion + winding pinion (through)
  const leverSlot = SD.box(10.1, stemY, 0.55, 0.55); // setting-lever pin down into the stem groove
  const clampHoles = F.clampNotches.map((c) => SD.circle(c, 0.25));
  // dial side: motion works, setting wheel and the keyless levers sit in recesses
  const mA = spec.modules.motionA, TRn = spec.train, KWn = spec.keyless;
  const dSW = (mA * (TRn.minuteWheel.teeth + KWn.settingWheel.teeth)) / 2;
  const swPos = [L.minuteWheel[0] + Math.sqrt(Math.max(0, dSW * dSW - (stemY - L.minuteWheel[1]) ** 2)), stemY];
  const motion = SD.union(SD.circle([0, 0], 2.85), SD.circle(L.minuteWheel, 2.78));
  const keyDial = SD.inter(SD.union(SD.box(9.15, 1.15, 1.8, 2.9), SD.box(8.15, -1.0, 2.0, 2.55), SD.box(9.6, -3.2, 1.35, 1.95)), SD.circle([0, 0], 11.25));
  const dialShallow = SD.union(motion, keyDial);
  const dialDeep = SD.circle(swPos, 1.2);
  const dialAll = SD.union(dialShallow, dialDeep);
  const lowerJ = [
    { id: 'center', c: L.center, rs: 0.7, rj: 0.55, rh: 0.27 },
    { id: 'third', c: L.third, rs: 0.6, rj: 0.42, rh: 0.085 },
    { id: 'fourth', c: L.fourth, rs: 0.58, rj: 0.42, rh: 0.13 },
    { id: 'escape', c: L.escape, rs: 0.56, rj: 0.4, rh: 0.06 },
    { id: 'pallet', c: L.pallet, rs: 0.52, rj: 0.36, rh: 0.05 },
    // lower balance jewel (the staff's lower pivot runs in it; its cap jewel sits under it)
    { id: 'balance', c: L.balance, rs: 0.6, rj: 0.46, rh: 0.05 },
  ].map((j) => ({ ...j, dialZ: dialDeep(j.c[0], j.c[1]) < 0 ? -0.56 : dialShallow(j.c[0], j.c[1]) < 0 ? Z.motionRecess : zMD }));
  const seatsM = lowerJ.map((j) => SD.circle(j.c, j.rs));
  const throughM = [windSlot, keySlot, leverSlot, ...clampHoles, ...seatsM];
  const thr = SD.union(...throughM);
  const stemCh = SD.inter(SD.box(7.85, stemY, 3.95, 0.52), discM);
  const floorHoles = [Bk(9.2, -0.05), Bk(7.5, -4.3)].map((c) => SD.circle(c, 0.33));
  // blind hole for the barrel arbor's lower pivot (no jewel: it turns only when winding)
  const barrelPivot = SD.circle(L.barrel, 0.6);
  // blind holes in the dial face for the two dial feet
  const DF = spec.dial.feet;
  const feetHoles = DF ? DF.angles.map((deg) => SD.circle([DF.r * Math.sin(deg * DEG), DF.r * Math.cos(deg * DEG)], DF.radius + 0.03)) : [];
  const coreM = SD.sub(discM, stemNotch, thr, stemCh, ...floorHoles, barrelPivot, ...feetHoles, dialAll);
  const nearM = (fs) => nearAny(fs, 0.008);
  const onOuterM = nearM([discM, stemNotch]);
  const onBackFeat = nearM([stemCh, ...floorHoles, barrelPivot, windSlot, keySlot, leverSlot, ...clampHoles]);
  const onDialFeat = nearM([motion, keyDial, dialDeep, windSlot, keySlot, leverSlot, ...clampHoles, ...feetHoles]);
  const onSeat = nearM(seatsM);

  // --- raised rim of the pillar plate right of the balance (back view)
  const bandR = SD.inter(discM, bandSector, SD.not(SD.circle(bal, 4.75)));
  const bandUp = SD.sub(bandR, cockG);
  const bandVis = bandUp; // the part not covered by the cock (mask for the engraving)

  // ================================================================ objects
  const mainObj = new THREE.Group(); mainObj.name = 'main-plate'; root.add(mainObj);
  const tqpObj = new THREE.Group(); tqpObj.name = 'three-quarter-plate'; root.add(tqpObj);
  const palObj = new THREE.Group(); palObj.name = 'pallet-bridge'; root.add(palObj);
  const screwObj = new THREE.Group(); screwObj.name = 'plate-screws'; root.add(screwObj);
  const upperJewels = new THREE.Group(); upperJewels.name = 'jewels-upper'; tqpObj.add(upperJewels);
  const lowerJewels = new THREE.Group(); lowerJewels.name = 'jewels-lower'; mainObj.add(lowerJewels);
  const palJewels = new THREE.Group(); palJewels.name = 'jewels-pallet'; palObj.add(palJewels);
  const engraving = new THREE.Group(); engraving.name = 'plate-engravings'; tqpObj.add(engraving);

  const BOX = [-11.75, -11.75, 11.75, 11.75];
  const put = (bk, s, capKey, wallKey, uv) => {
    if (s.caps) bk.add(capKey, uv(s.caps));
    if (s.walls) bk.add(wallKey, uv(s.walls));
  };

  // ================================================================ three-quarter plate
  {
    const bk = bucketSet();
    const shapes = regionShapes(plate34, BOX, 0.03);
    put(bk, slab(shapes, zT, zU, { top: (x, y) => (noBevel34(x, y) ? 0 : BEV) }), 'ribbed', 'bevel', ribUV);

    // recess floors (from the floor down to the plate's underside)
    const fill = (f, box, z0, capKey, uv, z1 = zU) => {
      const s = slab(regionShapes(f, box, 0.02), z0, z1);
      if (s.caps) bk.add(capKey, uv(s.caps));
      if (s.walls) bk.add('bevel', s.walls);
    };
    const cw = F.crownWheelRecess, rs = F.ratchetSeat;
    const crownUV = (g) => radialUV(g, cw.center, cw.radius);
    const crownFill = SD.sub(crownRec, opening, window);
    fill(SD.sub(crownFill, keyBox), boxAround(cw.center, cw.radius + 0.1), zCrownFloor, 'grain', crownUV);
    fill(SD.inter(crownFill, keyBox), boxAround(cw.center, cw.radius + 0.1), zCrownFloor, 'grain', crownUV, zKeyCeil);
    fill(SD.sub(seat, crownRec, opening, barrelHole), boxAround(rs.center, rs.radius + 0.1), zRatchetFloor, 'grain', (g) => radialUV(g, rs.center, rs.radius));
    fill(click, boxAround(clickC, CR.length / 2 + 0.2), zT + 0.18, 'frosted', (g) => g); // matte floor, polished walls
    // the click / click-spring pocket floor is sand-blasted (matte) in the photo
    fill(SD.inter(SD.sub(clickArea, click, seat, crownRec), disc34), [4.4, 5.0, 10.2, 10.0], zClickFloor, 'frosted', (g) => g);
    fill(SD.sub(rec12, ...notches, cockG, SD.circle(steel[3].c, 0.24)), [-7, 8.5, 7, 11.6], zT + steel[3].depth, 'ribbed', ribUV);
    fill(SD.sub(SD.inter(cockG, disc34), cutout, bandSector, ...(SR ? [SD.circle(SR.center, SR.radius)] : [])), [-11.6, -2, -3, 11.6], zFoot, 'frosted', (g) => g);
    for (const s of steel) {
      if (!s.pocket) continue;
      fill(SD.sub(s.pocket, SD.circle(s.c, 0.24)), boxAround(s.c, s.box + 0.8), zT + s.depth, 'frosted', (g) => g);
    }

    // polished jewel sinks (cone down to the jewel) and blue-screw countersinks
    const rubies = [];
    for (const j of upperJ) {
      const zj = zT + 0.09, zjb = zj + 0.2, rb = 0.3;
      bk.add('bevel', lathe([
        [[rb, zU], [rb, zjb]], [[rb, zjb], [j.rj, zjb]], [[j.rj, zjb], [j.rj, zj]], [[j.rj, zj], [j.rs, zT]],
        [[j.rs, zU], [rb, zU]],
      ], 48, j.c[0], j.c[1]));
      rubies.push(jewelGeometry(j.c, j.rj, j.rh, zj, 0.2, 1));
    }
    for (const s of blue) {
      const zs = zT + 0.04, rIn = HEAD_R + 0.03;
      bk.add('bevel', lathe([
        [[0.3, zU], [0.3, zs]], [[0.3, zs], [rIn, zs]], [[rIn, zs], [CS_R, zT]], [[CS_R, zU], [0.3, zU]],
      ], 48, s.c[0], s.c[1]));
    }
    bk.build(tqpObj);
    upperJewels.add(new THREE.Mesh(mergeGeometries(rubies), mat.ruby));
    // dark pivot holes of the upper jewels
    const holes = upperJ.map((j) => { const g = new THREE.CircleGeometry(j.rh * 1.05, 20); g.rotateX(Math.PI); g.translate(j.c[0], j.c[1], zT + 0.09 + 0.055); return g; });
    upperJewels.add(new THREE.Mesh(mergeGeometries(holes), mat.hole));
  }

  // ================================================================ main plate
  {
    const bk = bucketSet();
    const shapes = regionShapes(coreM, BOX, 0.03);
    const s = slab(shapes, zMB, zMD, {
      top: (x, y) => (onSeat(x, y) ? 0 : onOuterM(x, y) ? 0.08 : onBackFeat(x, y) ? BEV : 0),
      bottom: (x, y) => (onSeat(x, y) ? 0 : onOuterM(x, y) ? 0.08 : onDialFeat(x, y) ? BEV : 0),
    });
    put(bk, s, 'perlage', 'bevel', perlUV);
    // Pocket floors. Back: stem channel; dial: motion works + keyless levers (shallow) and
    // the setting wheel (deeper). Where a back and a dial pocket overlap, the plate
    // between them remains.
    const fill = (f, box, z0, z1) => put(bk, slab(regionShapes(f, box, 0.025), z0, z1), 'perlage', 'bevel', perlUV);
    const zStem = -0.76, zDial = Z.motionRecess, zSet = -0.56;
    const sbox = [3.7, -0.6, 11.8, 0.7], dbox = [-3, -5.4, 11.3, 4.2], wbox = boxAround(swPos, 1.3);
    fill(SD.sub(stemCh, dialAll, thr, stemNotch), sbox, zStem, zMD);
    fill(SD.sub(SD.inter(stemCh, dialShallow), dialDeep, thr), sbox, zStem, zDial);
    fill(SD.sub(SD.inter(stemCh, dialDeep), thr), sbox, zStem, zSet);
    fill(SD.sub(dialShallow, stemCh, dialDeep, thr), dbox, zMB, zDial);
    fill(SD.sub(dialDeep, stemCh, thr), wbox, zMB, zSet);
    fill(SD.union(...floorHoles), [-9.8, -4.8, -6.8, 0.5], -0.55, zMD);
    fill(barrelPivot, boxAround(L.barrel, 0.8), -0.55, zMD);
    for (const h of feetHoles) fill(h, [h.bb[0] - 0.2, h.bb[1] - 0.2, h.bb[2] + 0.2, h.bb[3] + 0.2], zMB, -0.79);

    // Raised rim of the pillar plate right of the balance (back view), with the floor of
    // the cock pocket where the cock overlaps it. Its top is frosted, like the rim round
    // the movement (the render shows fine grain there; the perlage is on the floor inside
    // the balance opening).
    const bandBox = [-11.8, -9, -4.5, 8];
    put(bk, slab(regionShapes(bandUp, bandBox, 0.02), zT, zU, { top: BEV, capBottom: false }), 'frosted', 'bevel', (g) => g);
    put(bk, slab(regionShapes(SD.inter(bandR, cockG), bandBox, 0.02), zFoot, zU, { capBottom: false }), 'frosted', 'bevel', (g) => g);
    put(bk, slab(regionShapes(bandR, bandBox, 0.025), zU, zMB, { capTop: false, capBottom: false }), 'perlage', 'bevel', perlUV);

    // Frosted outer rim of the pillar plate round the edge of the three-quarter plate
    // (≈0.4 mm wide all round on the back render), level with the casing-clamp pillars.
    // It gives way to the raised band right of the balance and, at 3 o'clock, to the
    // winding stem.
    const zRim = F.pillarRimTop ?? -2.06;
    const rimR = SD.sub(SD.inter(discM, SD.not(SD.circle([0, 0], R34 + 0.005))), bandR, SD.box(RM, stemY, 1.0, 0.5));
    put(bk, slab(regionShapes(rimR, BOX, 0.02), zRim, zMB, { top: (x, y) => (Math.hypot(x, y) > RM - 0.012 ? 0.06 : 0), capBottom: false }), 'frosted', 'bevel', (g) => g);

    // Casing-screw pillars: the notches of the 3/4 plate expose the matte top of a pillar
    // of the pillar plate with the casing screw's through-hole (polished chamfer). Top at
    // −2.06, where the case module's clamp tab (−2.20…−2.06) lies.
    const zPil = -2.06;
    notchDefs.forEach((n, i) => {
      const hc = F.clampNotches[i] || n.c;
      const hole = SD.circle(hc, 0.25), onHole = nearM([hole]);
      // 0.02 wider than the notch so its edge tucks under the plate wall (no hairline gap)
      const pil = SD.sub(SD.inter(SD.grow(notches[i], 0.02), SD.circle([0, 0], R34)), hole);
      put(bk, slab(regionShapes(pil, boxAround(n.c, n.r + 0.5), 0.02), zPil, zMB, { top: (x, y) => (onHole(x, y) ? 0.12 : 0.03), capBottom: false }), 'frosted', 'bevel', (g) => g);
    });

    // lower jewels: seats drilled through the plate, polished sink on the back face
    const rubies = [];
    for (const j of lowerJ) {
      const zd = j.dialZ;
      const zj = zMB + 0.1, zjb = zj + 0.18, rd = j.rh + 0.08;
      bk.add('bevel', lathe([
        [[j.rs, zd], [rd, zd]], [[rd, zd], [rd, zjb]], [[rd, zjb], [j.rj, zjb]], [[j.rj, zjb], [j.rj, zj]], [[j.rj, zj], [j.rs, zMB]],
      ], 40, j.c[0], j.c[1]));
      rubies.push(jewelGeometry(j.c, j.rj, j.rh, zj + 0.18, 0.18, -1));
    }
    lowerJewels.add(new THREE.Mesh(mergeGeometries(rubies), mat.ruby));
    bk.build(mainObj);
  }

  // ================================================================ pallet bridge
  {
    const bk = bucketSet();
    const J = F.palletBridge.jewel, A = F.palletBridge.anchor, hw = F.palletBridge.width / 2;
    const dl = Math.hypot(A[0] - J[0], A[1] - J[1]);
    const dir = [(A[0] - J[0]) / dl, (A[1] - J[1]) / dl];
    const at = (t) => [J[0] + dir[0] * t, J[1] + dir[1] * t];
    // z.palletBridge for the jewel boss; the arm towards the anchor is thinner so it
    // clears the fourth wheel (level L1, top −1.22) that runs under the anchor end.
    const z0 = Z.palletBridge[0], z1 = Z.palletBridge[1], zArm = Math.min(z1, -1.25);
    const box = [Math.min(J[0], A[0]) - 1.2, Math.min(J[1], A[1]) - 1.2, Math.max(J[0], A[0]) + 1.2, Math.max(J[1], A[1]) + 1.2];
    const PBEV = 0.05; // the bridge is only 0.13–0.28 thick
    const hole = SD.circle(J, 0.36), bossC = SD.circle(J, 0.8);
    const bossR = SD.union(bossC, SD.capsule(J, at(0.55), hw));
    const armAll = SD.union(bossR, SD.capsule(at(0.3), A, hw), SD.circle(A, 0.6));
    // The round boss around the jewel is turned (concentric graining in the photo), the arm
    // perlaged; anglage only along the outer contour, not along the seam between the two.
    const onOuter = (x, y) => Math.abs(armAll(x, y)) < 0.01;
    const onSeam = (x, y) => Math.abs(bossC(x, y)) < 0.01;
    put(bk, slab(regionShapes(SD.sub(armAll, bossC), box, 0.015), z0, zArm, { top: (x, y) => (onOuter(x, y) && !onSeam(x, y) ? PBEV : 0) }), 'perlage', 'bevel', perlUV);
    put(bk, slab(regionShapes(SD.sub(bossC, hole), box, 0.015), z0, zArm, { capBottom: false, top: (x, y) => (Math.hypot(x - J[0], y - J[1]) > 0.6 && onOuter(x, y) ? PBEV : 0) }), 'grain', 'bevel', (g) => radialUV(g, J, 0.8));
    if (z1 > zArm + 1e-3) put(bk, slab(regionShapes(SD.sub(bossR, hole), box, 0.015), zArm, z1, { capTop: false, bottom: (x, y) => (Math.hypot(x - J[0], y - J[1]) < 0.4 ? 0 : 0.03) }), 'perlage', 'bevel', perlUV);
    const zj = z0 + 0.06, zjb = zj + 0.16;
    bk.add('bevel', lathe([
      [[0.12, z1], [0.12, zjb]], [[0.12, zjb], [0.28, zjb]], [[0.28, zjb], [0.28, zj]], [[0.28, zj], [0.36, z0]], [[0.36, z1], [0.12, z1]],
    ], 40, J[0], J[1]));
    palJewels.add(new THREE.Mesh(jewelGeometry(J, 0.28, 0.05, zj, 0.16, 1), mat.ruby));
    const hg = new THREE.CircleGeometry(0.052, 16); hg.rotateX(Math.PI); hg.translate(J[0], J[1], zj + 0.04);
    palJewels.add(new THREE.Mesh(hg, mat.hole));
    bk.build(palObj);
    const ps = screwHead(A, 0.42, z0 - 0.15, 0.15, 0.09, 0.07, 65, 0.05, 0.02, { r: 0.18, z: zArm - 0.02 });
    const sc = new THREE.Mesh(ps.head, mat.steel);
    sc.name = 'pallet-bridge-screw';
    palObj.add(sc, new THREE.Mesh(ps.floor, mat.steelSlot));
  }

  // ================================================================ plate screws
  {
    // blued heads: top at z.screwHeads[0], seated 0.04 deep in polished countersinks
    const zShank = zU - 0.03; // shank ends stay inside the plate
    const bl = blue.map((s) => screwHead(s.c, HEAD_R, zHeadTop, zT + 0.04 - zHeadTop, 0.16, 0.12, s.slot, 0.06, 0.04, { r: 0.27, z: zShank }));
    const stl = steel.map((s) => {
      const floor = zT + s.depth;
      const h = s.depth > 0 ? 0.18 : floor - zHeadTop;
      // SS[2] sits on the balance cock: its shank stays inside the cock (−2.42…−2.12)
      const zEnd = s.pocket || s.depth > 0 ? zShank : zFoot - 0.03;
      return screwHead(s.c, 0.5, floor - h, h, 0.11, Math.min(0.09, h * 0.6), s.slot, 0.07, 0.03, { r: 0.21, z: zEnd });
    });
    const mesh = (list, key, m, name) => { const o = new THREE.Mesh(mergeGeometries(list.map((x) => x[key])), m); o.name = name; screwObj.add(o); };
    mesh(bl, 'head', mat.blued, 'plate-screws-blued');
    mesh(bl, 'floor', mat.bluedSlot, 'plate-screws-blued-slots');
    mesh(stl, 'head', mat.steel, 'plate-screws-steel');
    mesh(stl, 'floor', mat.steelSlot, 'plate-screws-steel-slots');
  }

  // ================================================================ engravings
  const PX = 160; // texture px per mm
  const goldMat = (t) => {
    const m = M.goldText.clone();
    Object.assign(m, { map: t.map, alphaMap: t.alphaMap, normalMap: t.normalMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, roughness: 0.32 });
    m.normalScale = new THREE.Vector2(0.9, 0.9);
    return m;
  };
  const decal = (geo, m, parent, name) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.name = name; mesh.castShadow = false; mesh.renderOrder = 2;
    parent.add(mesh);
    return mesh;
  };
  const zDecal = zT - 0.003;
  {
    // Gold-filled block, left-aligned at x_back −5.87; line centres and line widths
    // measured on the photo (the widths fix the letter spacing of each line).
    const E = F.engravings, cap = 0.62;
    const lines = E.block.map((l) => l.text.replace('{movementSerial}', spec.movementSerial));
    const meas = [
      { y: -5.13, w: 4.08, ref: 'DUW 4001' },
      { y: -6.2, w: 3.68, ref: 'N° 00001' },
      { y: -7.72, w: 8.62, ref: 'NOMOS GLASHÜTTE' },
      { y: -8.77, w: 11.26, ref: 'DEUTSCHE UHRENWERKE' },
    ];
    const xL = -5.87, X0 = -6.05, X1 = 5.75, Y0 = -9.25, Y1 = -4.65;
    const wPx = Math.round((X1 - X0) * PX), hPx = Math.round((Y1 - Y0) * PX);
    const tex = engraveTextures(wPx, hPx, (c) => {
      lines.forEach((s, i) => {
        const m = meas[i] || { y: E.block[i].at[1], w: textWidth(s) * cap, ref: s };
        const hs = m.w / (textWidth(m.ref) * cap);
        drawText(c, s, (xL - X0) * PX, (Y1 - (m.y - cap / 2)) * PX, cap * PX, hs);
      });
    }, { blur: 3, edge: 0.5, strength: 2.6 });
    decal(decalGeometry((u, v) => [X0 + (X1 - X0) * u, Y0 + (Y1 - Y0) * v], 1, 1, zDecal), goldMat(tex), engraving, 'engraving-block');
  }
  {
    // "17 RUBINE": gold-filled, set on an arc concentric with the movement along the
    // crown-side edge, letter tops towards the centre, reading top → bottom (back view).
    const cap = 0.6, rc = 10.68, a0 = 156.0, a1 = 180.7, str = '17 RUBINE'; // outer letter extents (photo)
    const pad = 0.6 * DEG, ra = rc - cap / 2 - 0.15, rb = rc + cap / 2 + 0.15;
    const th0 = a0 * DEG - pad, th1 = a1 * DEG + pad;
    const wPx = Math.round((th1 - th0) * rc * PX), hPx = Math.round((rb - ra) * PX);
    const hs = ((a1 - a0) * DEG * rc) / (textWidth(str) * cap);
    // canvas top = inner radius ra (letter tops), so the baseline sits at r = rc + cap/2
    const tex = engraveTextures(wPx, hPx, (c) => drawText(c, str, pad * rc * PX, (rc + cap / 2 - ra) * PX, cap * PX, hs), { blur: 3, edge: 0.5, strength: 2.6 });
    decal(decalGeometry((u, v) => { const th = th0 + (th1 - th0) * u, r = rb - (rb - ra) * v; return [r * Math.cos(th), r * Math.sin(th)]; }, 48, 2, zDecal),
      goldMat(tex), engraving, 'engraving-rubine');
  }
  {
    // "MADE IN / GERMANY": unfilled (grey) engraving on the pillar plate's raised rim,
    // on arcs, reading bottom → top (back view). Masked to the visible rim.
    // line centre radii and outer angular extents measured on the photo (radius arcs
    // overlaid on duw4001_back.jpg)
    const cap = 0.35;
    const L1 = { s: 'MADE IN', r: 10.7, a0: 5.6, a1: 16.9 }, L2 = { s: 'GERMANY', r: 11.1, a0: 3.5, a1: 17.1 };
    const ra = 10.35, rb = 11.5, rRef = 10.9, th0 = 2.0 * DEG, th1 = 18.6 * DEG;
    const wPx = Math.round((th1 - th0) * rRef * PX), hPx = Math.round((rb - ra) * PX);
    const toBack = (u, v) => { const th = th0 + (th1 - th0) * u, r = rb - (rb - ra) * v; return [r * Math.cos(th), r * Math.sin(th)]; };
    const tex = engraveTextures(wPx, hPx, (c) => {
      for (const l of [L1, L2]) {
        const hs = (((l.a1 - l.a0) * DEG * l.r) / (textWidth(l.s) * cap)) * (rRef / l.r);
        drawText(c, l.s, (l.a0 * DEG - th0) * rRef * PX, (l.r + cap / 2 - ra) * PX, cap * PX, hs);
      }
    }, {
      blur: 2, fill: 0.62, edge: 0.4, strength: -3.2, // negative: cut groove (the gold fill bulges)
      mask: (px, py) => { const [xb, yb] = toBack(px / wPx, 1 - py / hPx); return bandVis(-xb, yb) < -0.03; },
    });
    const m = new THREE.MeshPhysicalMaterial({
      color: 0x9da1a7, metalness: 1, roughness: 0.42, map: tex.map, alphaMap: tex.alphaMap, normalMap: tex.normalMap,
      normalScale: new THREE.Vector2(1, 1), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    });
    decal(decalGeometry(toBack, 32, 2, zDecal), m, mainObj, 'engraving-made-in');
  }

  // ================================================================ registration
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  reg.add({
    id: 'main-plate', name: 'Pillar plate (main plate)', category: 'frame', side: 'both', exposed: true, priority: 2, xray: false,
    object: mainObj, explode: ex('main-plate'), explodeDelay: spec.explodeDelay('main-plate'),
    anchor: [...Bk(11.25, -2.2), zT],
    description: 'The foundation of the movement. Every wheel’s lower pivot runs in it, the motion works sit in a recess on its dial side and the winding stem runs along a channel in its back. Its visible surfaces, including the raised rim beside the balance engraved “MADE IN GERMANY”, carry NOMOS perlage.',
    facts: { Diameter: '23.3 mm (10½ lignes)', Thickness: `${(zMD - zMB).toFixed(2)} mm`, Finish: 'Perlage, rhodium-plated', 'Lower jewels': '7 – centre, third, fourth, escape and pallet pivots, plus a hole and a cap jewel for the balance', Engraving: 'MADE IN GERMANY' },
  });
  reg.add({
    id: 'three-quarter-plate', name: 'Three-quarter plate', category: 'frame', side: 'back', exposed: true, priority: 1, xray: true,
    object: tqpObj, explode: ex('three-quarter-plate'), explodeDelay: spec.explodeDelay('three-quarter-plate'),
    anchor: [...Bk(-3.5, -4.95), zT],
    description: 'The Glashütte three-quarter plate: one large bridge that holds the upper pivots of the barrel and of the whole gear train, which makes the movement very rigid. Only the balance gets its own cock. Its surface is decorated with Glashütte ribbing and polished bevels and carries the gold-filled engravings.',
    facts: { Type: 'Glashütte ¾ plate', Finish: 'Glashütte ribbing, rhodium-plated, polished bevels', Diameter: `${(2 * R34).toFixed(1)} mm`, Thickness: `${(zU - zT).toFixed(2)} mm`, 'Upper jewels': '4 (centre, third, fourth, escape wheel)', Screws: '4 tempered blue + 4 polished steel' },
  });
  reg.add({
    id: 'pallet-bridge', name: 'Pallet bridge', category: 'frame', side: 'back', exposed: true, priority: 2, xray: true,
    object: palObj, explode: ex('pallet-bridge'), explodeDelay: spec.explodeDelay('pallet-bridge'),
    anchor: [...[F.palletBridge.jewel[0], F.palletBridge.jewel[1] + 0.55], Z.palletBridge[0]],
    description: 'A small perlaged bridge under the balance that carries the upper pivot of the pallet fork in its own jewel, so the escapement can be serviced without lifting the three-quarter plate.',
    facts: { Jewel: '1 (pallet arbor, upper)', Screw: '1 polished steel', Finish: 'Perlage, polished bevels' },
  });
  reg.add({
    id: 'plate-screws', name: 'Plate screws', category: 'screws', side: 'back', exposed: true, priority: 2,
    object: screwObj, explode: ex('plate-screws'), explodeDelay: spec.explodeDelay('plate-screws'),
    anchor: [blue[0].c[0], blue[0].c[1], zHeadTop],
    description: 'Hold the three-quarter plate and its fittings to the pillar plate. The blue screws are polished and then heated to about 290 °C until a thin blue oxide layer forms — NOMOS tempers them for colour and corrosion resistance; the others are polished steel.',
    facts: { 'Tempered blue': '4 (heat-blued at ≈290 °C)', 'Polished steel': '4', 'Head Ø (blue)': `${F.blueScrewHeadDiameter} mm`, Slots: 'Single slot, polished' },
  });
  reg.add({
    id: 'plate-engravings', name: 'Plate engravings', category: 'frame', side: 'back', exposed: true, priority: 3,
    object: engraving, explode: ex('plate-engravings'), explodeDelay: spec.explodeDelay('plate-engravings'),
    anchor: [...Bk(-2.6, -6.2), zT],
    description: 'Engraved into the three-quarter plate and filled with gold-coloured lacquer: the caliber DUW 4001 (Deutsche Uhrenwerke), this movement’s own serial number, the maker and the jewel count “17 RUBINE”.',
    facts: { Caliber: 'DUW 4001', Serial: `N° ${spec.movementSerial}`, Maker: 'NOMOS Glashütte — Deutsche Uhrenwerke', Jewels: '17 RUBINE', Fill: 'Gold-coloured lacquer' },
  });
  reg.add({
    id: 'jewels', name: 'Jewel bearings', category: 'jewels', side: 'back', exposed: true, priority: 2,
    object: upperJewels, explode: ex('jewels'), explodeDelay: spec.explodeDelay('jewels'),
    anchor: [UJ.center[0], UJ.center[1], zT + 0.09],
    description: 'Synthetic rubies used as nearly frictionless, wear-free bearings for the pivots; the polished cup around each hole holds a tiny drop of oil in place. The movement has 17: the ten train and pallet bearings set in the plates, plus the four balance jewels, two pallet stones and the impulse pin.',
    facts: { 'In total': '17 (“17 RUBINE”)', 'Train and pallet bearings': '10 (4 in the three-quarter plate, 5 in the pillar plate, 1 in the pallet bridge)', Balance: '4 (a hole and a cap jewel at each pivot)', Material: 'Synthetic corundum (Al₂O₃)', Hardness: 'Mohs 9' },
  });
  for (const g of [lowerJewels, palJewels]) g.traverse((o) => { o.userData.partId = 'jewels'; });
  for (const o of [engraving, mainObj]) o.traverse((m) => { if (m.isMesh && m.name.startsWith('engraving')) m.castShadow = false; });

  // ---------------------------------------------------------------- local helpers
  // shank: optional { r, z } — threaded shank from the head's underside to z (hidden in
  // the plate when assembled, seen when the screws fly out in the exploded view)
  function screwHead(c, r, zTop, h, slotW, slotD, slotDeg, bev, domeH, shank = null) {
    const a = slotDeg * DEG, nx = -Math.sin(a), ny = Math.cos(a);
    const beta = Math.acos(Math.min(0.999, slotW / 2 / r));
    const halves = [1, -1].map((sg) => {
      const phi = Math.atan2(ny * sg, nx * sg);
      const pts = [];
      const N = 30;
      for (let i = 0; i <= N; i++) { const t = phi - beta + (2 * beta * i) / N; pts.push([r * Math.cos(t), r * Math.sin(t)]); }
      const p1 = pts[N], p0 = pts[0];
      for (const f of [0.08, 0.5, 0.92]) pts.push([p1[0] + (p0[0] - p1[0]) * f, p1[1] + (p0[1] - p1[1]) * f]);
      return { outer: pts, holes: [] };
    });
    const k = (2 * domeH) / (r * r);
    const s = slab(halves, zTop, zTop + slotD, {
      top: (x, y) => (Math.hypot(x, y) > r - 0.004 ? bev : 0),
      capBottom: false,
      capNormal: (x, y) => { const l = Math.hypot(k * x, k * y, 1); return [(k * x) / l, (k * y) / l, -1 / l]; },
    });
    const core = lathe([[[r, zTop + slotD], [r, zTop + h]]], 40);
    const floor = lathe([[[0, zTop + slotD], [r, zTop + slotD]]], 40); // slot bottom, darker
    const list = [s.caps, s.walls, core];
    if (shank && shank.z > zTop + h + 0.05) {
      const zs = zTop + h, thread = [[shank.r, zs]];
      for (let z = zs + 0.03, k = 0; z < shank.z - 0.03; z += 0.03, k++) thread.push([k % 2 ? shank.r : shank.r * 0.84, z]);
      thread.push([shank.r * 0.8, shank.z]);
      list.push(lathe([[[r, zs], [shank.r, zs]], thread, [[shank.r * 0.8, shank.z], [0, shank.z]]], 20));
    }
    const g = mergeGeometries(list);
    g.translate(c[0], c[1], 0);
    floor.translate(c[0], c[1], 0);
    return { head: g, floor };
  }
}
