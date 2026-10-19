// FRAME of the 9R65 (builder B4, plan.md §B4): main plate, train bridge, barrel bridge, PR
// bridge, automatic bridge (wave stripes, gilt "9R65A JAPAN" / "THIRTY JEWELS", plain
// "SEIKO ○ TIME CORP. 2"), jewels, gold Diashock settings, polished steel screws, casing
// clamps. Data: SPEC.frame, SPEC.finish, SPEC.z, SPEC.layout, SPEC.radii.
// Part ids: main-plate train-bridge barrel-bridge pr-bridge automatic-bridge jewels diashock
// plate-screws case-clamps.
//
// Technique (as the Tangente 139's frame): every outline is a 2-D signed distance field in the
// dial frame (mm, negative inside), so plates are real booleans (bridge minus windows, jewel
// sinks, screw countersinks …). Outlines are contoured by marching squares, simplified, and
// extruded by our own slab builder, which puts a polished chamfer only on the edges that have
// one. The helpers are exported for automatic.js (same builder, same watch).
//
// Finishes MEASURED on the photos (they contradict SPEC.finish — reported to the lead):
//  - wave stripes of the automatic bridge: straight-on case back ltF_6 (61.6 px/mm), band
//    boundaries traced along five transects: pitch 2.53, bands ASCEND to the right at 22.5° in
//    the BACK view (= −22.5° in the dial frame); confirmed on mov_naked_25/28 and the official
//    render. SPEC.finish.stripes says 2.2 / +34° (dial) — the sign is flipped there.
//  - rotor stripes: mov_naked_26 (rotor alone, 39.3 px/mm, R 14.0 checked): pitch 2.22, +26°
//    in the rotor's back view (= −26° dial frame); SPEC.finish.rotorStripes says 2.0 / +25°.
//  - train, barrel and PR bridges carry FINE STRAIGHT graining (≈0.1 mm lines, mov_naked_27 /
//    25 / 30 / 33), not the broad wave bands; the ratchet sits on a turned (circular-grained)
//    seat of the barrel bridge (mov_naked_30).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// Measured finishes (see the header) — LOCAL constants, SPEC values differ.
export const BRIDGE_STRIPES = { pitch: 2.53, angleDialDeg: -22.5, boundaryOffset: 3.63 };
export const ROTOR_STRIPES = { pitch: 2.22, angleDialDeg: -26, boundaryOffset: -5.83 };
const LOWER_GRAIN_DEG = 66; // fine straight graining of the lower bridges, dial frame (back view −66°)
const PLATE_RIM_GRAIN_DEG = -43; // straight graining of the exposed plate rim (mov_naked_25)

// ============================================================================ SDFs
const mk = (fn, bb) => { fn.bb = bb; return fn; };
const bbUnion = (bbs) => (bbs.length && bbs.every(Boolean)
  ? [Math.min(...bbs.map((b) => b[0])), Math.min(...bbs.map((b) => b[1])), Math.max(...bbs.map((b) => b[2])), Math.max(...bbs.map((b) => b[3]))] : null);
export const SD = {
  circle: (c, r) => mk((x, y) => Math.sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2) - r, [c[0] - r, c[1] - r, c[0] + r, c[1] + r]),
  capsule: (a, b, r, rb = r) => {
    const bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by || 1e-12;
    return mk((x, y) => {
      const px = x - a[0], py = y - a[1];
      const h = Math.min(1, Math.max(0, (px * bx + py * by) / l2));
      return Math.hypot(px - bx * h, py - by * h) - (r + (rb - r) * h);
    }, [Math.min(a[0], b[0]) - Math.max(r, rb), Math.min(a[1], b[1]) - Math.max(r, rb), Math.max(a[0], b[0]) + Math.max(r, rb), Math.max(a[1], b[1]) + Math.max(r, rb)]);
  },
  box: (cx, cy, hx, hy, rad = 0) => mk((x, y) => {
    const dx = Math.abs(x - cx) - hx + rad, dy = Math.abs(y - cy) - hy + rad;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - rad;
  }, [cx - hx, cy - hy, cx + hx, cy + hy]),
  poly: (v) => mk((px, py) => {
    let d = (px - v[0][0]) ** 2 + (py - v[0][1]) ** 2, s = 1;
    for (let i = 0, j = v.length - 1; i < v.length; j = i, i++) {
      const ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1];
      const wx = px - v[i][0], wy = py - v[i][1];
      const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-12)));
      const bx = wx - ex * t, by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= v[i][1], c2 = py < v[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  }, [Math.min(...v.map((p) => p[0])), Math.min(...v.map((p) => p[1])), Math.max(...v.map((p) => p[0])), Math.max(...v.map((p) => p[1]))]),
  union: (...f) => {
    const n = f.length, bbs = f.map((g) => g.bb || null);
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
    const fn = mk((x, y) => ev(x, y), bbUnion(bbs));
    fn.ev = ev;
    return fn;
  },
  inter: (...f) => {
    const bbs = f.map((g) => g.bb).filter(Boolean);
    const bb = bbs.length ? [Math.max(...bbs.map((b) => b[0])), Math.max(...bbs.map((b) => b[1])), Math.min(...bbs.map((b) => b[2])), Math.min(...bbs.map((b) => b[3]))] : null;
    return mk((x, y) => { let d = -Infinity; for (let i = 0; i < f.length; i++) { const e = f[i](x, y); if (e > d) d = e; } return d; }, bb);
  },
  sub: (a, ...b) => {
    if (!b.length) return a;
    const u = b.length === 1 && b[0].ev ? b[0] : SD.union(...b);
    return mk((x, y) => { const av = a(x, y); return Math.max(av, -u.ev(x, y, -av)); }, a.bb);
  },
  grow: (f, d) => mk((x, y) => f(x, y) - d, f.bb ? [f.bb[0] - d, f.bb[1] - d, f.bb[2] + d, f.bb[3] + d] : null),
  not: (f) => mk((x, y) => -f(x, y), null),
  // smooth union (polynomial smin, radius k): machined inner radii
  smooth: (k, ...f) => {
    const bb = bbUnion(f.map((g) => g.bb || null));
    return mk((x, y) => {
      let d = f[0](x, y);
      for (let i = 1; i < f.length; i++) {
        const e = f[i](x, y), h = Math.max(k - Math.abs(d - e), 0) / k;
        d = Math.min(d, e) - h * h * k * 0.25;
      }
      return d;
    }, bb && [bb[0] - k, bb[1] - k, bb[2] + k, bb[3] + k]);
  },
  annulus: (c, r0, r1) => SD.sub(SD.circle(c, r1), SD.circle(c, r0)),
};

// A traced polygon smoothed into the outline of a machined part (centripetal Catmull-Rom).
export function smoothOutline(pts, perSeg = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  return curve.getPoints(pts.length * perSeg).slice(0, -1).map((p) => [p.x, p.y]);
}

// ============================================================ region → contours
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
            if (Math.abs(d) < 1e-7) d = 1e-7;
            v[j * nx + i] = d;
          }
        }
      }
    }
  }
  return v;
}

function marchLoops(v, nx, ny, x0, y0, h) {
  const N = nx * ny;
  const A = new Int32Array(2 * N).fill(-1), Bq = new Int32Array(2 * N).fill(-1);
  const px = new Float64Array(2 * N), py = new Float64Array(2 * N);
  const has = new Uint8Array(2 * N);
  const pt = (e) => {
    if (has[e]) return;
    has[e] = 1;
    if (e < N) {
      const j = (e / nx) | 0, i = e - j * nx, a = v[e], b = v[e + 1];
      px[e] = x0 + (i + a / (a - b)) * h; py[e] = y0 + j * h;
    } else {
      const k = e - N, j = (k / nx) | 0, i = k - j * nx, a = v[k], b = v[k + nx];
      px[e] = x0 + i * h; py[e] = y0 + (j + a / (a - b)) * h;
    }
  };
  const link = (p, q) => {
    pt(p); pt(q);
    if (A[p] < 0) A[p] = q; else Bq[p] = q;
    if (A[q] < 0) A[q] = p; else Bq[q] = p;
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const ia = j * nx + i;
      const v0 = v[ia], v1 = v[ia + 1], v2 = v[ia + nx + 1], v3 = v[ia + nx];
      const c = (v0 < 0 ? 1 : 0) | (v1 < 0 ? 2 : 0) | (v2 < 0 ? 4 : 0) | (v3 < 0 ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const eB = ia, eR = N + ia + 1, eT = ia + nx, eL = N + ia;
      const ctr = v0 + v1 + v2 + v3 < 0;
      switch (c) {
        case 1: case 14: link(eL, eB); break;
        case 2: case 13: link(eB, eR); break;
        case 3: case 12: link(eL, eR); break;
        case 4: case 11: link(eR, eT); break;
        case 6: case 9: link(eB, eT); break;
        case 7: case 8: link(eL, eT); break;
        case 5: if (ctr) { link(eL, eT); link(eB, eR); } else { link(eL, eB); link(eR, eT); } break;
        case 10: if (ctr) { link(eL, eB); link(eR, eT); } else { link(eB, eR); link(eT, eL); } break;
        default: break;
      }
    }
  }
  const loops = [];
  const seen = new Uint8Array(2 * N);
  for (let e = 0; e < 2 * N; e++) {
    if (A[e] < 0 || seen[e]) continue;
    const loop = [];
    let prev = -1, cur = e, guard = 0;
    while (cur >= 0 && !seen[cur] && guard++ < 2 * N) {
      seen[cur] = 1;
      loop.push([px[cur], py[cur]]);
      const nxt = A[cur] !== prev ? A[cur] : Bq[cur];
      prev = cur;
      cur = nxt;
    }
    if (loop.length > 3) loops.push(loop);
  }
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
    if (b - a < 2) continue;
    const P = pts[a], Q = pts[b % n];
    const dx = Q[0] - P[0], dy = Q[1] - P[1], L = Math.hypot(dx, dy) || 1e-12;
    let md = -1, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - P[0]) * dy - (pts[i][1] - P[1]) * dx) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export const loopArea = (l) => {
  let a = 0;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += (l[j][0] - l[i][0]) * (l[j][1] + l[i][1]);
  return a / 2;
};
export const inPoly = (p, l) => {
  let c = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    if ((l[i][1] > p[1]) !== (l[j][1] > p[1]) && p[0] < ((l[j][0] - l[i][0]) * (p[1] - l[i][1])) / (l[j][1] - l[i][1]) + l[i][0]) c = !c;
  }
  return c;
};

// SDF region → [{ outer, holes }] (outer CCW, holes CW, points [x, y]).
export function regionShapes(f, box, h = 0.03, tol = 0.0025) {
  const x0 = box[0] - 3 * h, y0 = box[1] - 3 * h;
  const nx = Math.ceil((box[2] - box[0]) / h) + 7, ny = Math.ceil((box[3] - box[1]) / h) + 7;
  const v = sampleGrid(f, x0, y0, nx, ny, h);
  for (let i = 0; i < nx; i++) { v[i] = Math.max(v[i], h); v[(ny - 1) * nx + i] = Math.max(v[(ny - 1) * nx + i], h); }
  for (let j = 0; j < ny; j++) { v[j * nx] = Math.max(v[j * nx], h); v[j * nx + nx - 1] = Math.max(v[j * nx + nx - 1], h); }
  const loops = marchLoops(v, nx, ny, x0, y0, h).map((l) => dpSimplify(l, tol)).filter((l) => l.length >= 3 && Math.abs(loopArea(l)) > 2e-4);
  const depth = loops.map((l, i) => loops.reduce((n, m, k) => n + (k !== i && Math.abs(loopArea(m)) > Math.abs(loopArea(l)) && inPoly(l[0], m) ? 1 : 0), 0));
  const shapes = [];
  const outerIdx = [];
  loops.forEach((l, i) => {
    if (depth[i] % 2) return;
    if (loopArea(l) < 0) l.reverse();
    shapes.push({ outer: l, holes: [], a: Math.abs(loopArea(l)), d: depth[i] });
    outerIdx.push(i);
  });
  loops.forEach((l, i) => {
    if (!(depth[i] % 2)) return;
    if (loopArea(l) > 0) l.reverse();
    let best = null;
    for (const s of shapes) if (s.d === depth[i] - 1 && inPoly(l[0], s.outer) && (!best || s.a < best.a)) best = s;
    if (best) best.holes.push(l);
  });
  return shapes.map((s) => ({ outer: s.outer, holes: s.holes }));
}

// ============================================================ slab extrusion
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
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ox = loop[j][0] - loop[i][0], oy = loop[j][1] - loop[i][1];
      const qx = pts[j][0] - pts[i][0], qy = pts[j][1] - pts[i][1];
      if (ox * qx + oy * qy < 0) {
        const m = [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
        pts[i] = m; pts[j] = [m[0], m[1]];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return pts;
}
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
    for (let w = u + 1; w < seg.length && seg[w].x0 <= s1.x1; w++) {
      const s2 = seg[w];
      if (s2.y0 > s1.y1 || s2.y1 < s1.y0) continue;
      if (s1.k === s2.k && (Math.abs(s1.i - s2.i) <= 1 || Math.abs(s1.i - s2.i) === s1.n - 1)) continue;
      if (o(s1.a, s1.b, s2.a) * o(s1.a, s1.b, s2.b) < 0 && o(s2.a, s2.b, s1.a) * o(s2.a, s2.b, s1.b) < 0) {
        bad.push([s1.k, s1.i], [s1.k, (s1.i + 1) % s1.n], [s2.k, s2.i], [s2.k, (s2.i + 1) % s2.n]);
      }
    }
  }
  return bad;
}
function insetShape(cs, sizeFn) {
  const S = cs.map((c) => Float64Array.from(c, (p) => sizeFn(p[0], p[1])));
  if (S.every((s) => s.every((v) => v === 0))) return cs.map((c, k) => ({ pts: c, s: S[k] }));
  let P = cs.map((c, k) => insetPts(c, S[k]));
  for (let pass = 0; pass < 10; pass++) {
    const bad = insetCrossings(P);
    if (!bad.length) break;
    const f = pass < 4 ? 0.5 : 0;
    for (const [k, i] of bad) { const n = cs[k].length; for (let d = -2; d <= 2; d++) S[k][(i + d + n) % n] *= f; }
    P = cs.map((c, k) => insetPts(c, S[k]));
  }
  return cs.map((c, k) => ({ pts: P[k], s: S[k] }));
}

function creasedNormals(pos, angleDeg = 38) {
  const n = pos.length / 3;
  const fN = new Float32Array(n);
  for (let t = 0; t < n / 3; t++) {
    const o = t * 9;
    const ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2];
    const bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const l = Math.hypot(cx, cy, cz);
    if (l > 1e-14) { cx /= l; cy /= l; cz /= l; } else { cx = cy = cz = 0; }
    fN[t * 3] = cx; fN[t * 3 + 1] = cy; fN[t * 3 + 2] = cz;
  }
  const key = (i) => `${Math.round(pos[i * 3] * 2e4)},${Math.round(pos[i * 3 + 1] * 2e4)},${Math.round(pos[i * 3 + 2] * 2e4)}`;
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
    const l = Math.hypot(sx, sy, sz);
    if (l > 1e-9) { out[i * 3] = sx / l; out[i * 3 + 1] = sy / l; out[i * 3 + 2] = sz / l; } else { out[i * 3] = fx; out[i * 3 + 1] = fy; out[i * 3 + 2] = fz || 1; }
  }
  return out;
}

export function makeGeo(pos, nrm) {
  const g = new THREE.BufferGeometry();
  const p = pos instanceof Float32Array ? pos : new Float32Array(pos);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm instanceof Float32Array ? nrm : new Float32Array(nrm), 3));
  const uv = new Float32Array((p.length / 3) * 2);
  for (let i = 0, k = 0; i < p.length; i += 3, k += 2) { uv[k] = p[i]; uv[k + 1] = p[i + 1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Extrude shapes between z0 (the −Z face, towards the case back) and z1 (the +Z face).
// opt.top / opt.bottom: chamfer on the z0 / z1 edges (number or (x, y) => size);
// opt.capTop / opt.capBottom = false omit a cap; opt.capNormal(x, y) bends the z0 cap's normals.
export function slab(shapes, z0, z1, opt = {}) {
  const fT = typeof opt.top === 'function' ? opt.top : () => opt.top || 0;
  const fB = typeof opt.bottom === 'function' ? opt.bottom : () => opt.bottom || 0;
  const capP = [], capN = [], wallP = [];
  const cap = (contours, z, facing) => {
    const vs = contours.map((c) => c.map((p) => new THREE.Vector2(p[0], p[1])));
    const faces = THREE.ShapeUtils.triangulateShape(vs[0], vs.slice(1));
    const all = vs.flat();
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
    if (opt.walls === false) continue;
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

// Surface of revolution about Z at (cx, cy). parts: polylines [[r, z], …] (normal = (dz, −dr):
// walk bottom faces outwards, outer walls upwards (+z), top faces inwards). Smooth inside a
// polyline, creased between polylines.
export function lathe(parts, segs, cx = 0, cy = 0) {
  const geos = parts.map((p) => {
    const g = new THREE.LatheGeometry(p.map(([r, z]) => new THREE.Vector2(Math.max(r, 0), z)), segs);
    g.rotateX(Math.PI / 2);
    return g.toNonIndexed();
  });
  const g = geos.length === 1 ? geos[0] : mergeGeometries(geos);
  g.translate(cx, cy, 0);
  return g;
}
// One profile, split into polylines at corners sharper than 32°.
export function latheProfile(profile, segs, cx = 0, cy = 0) {
  const parts = [];
  let cur = [profile[0]];
  for (let i = 1; i < profile.length; i++) {
    cur.push(profile[i]);
    if (i < profile.length - 1) {
      const a = profile[i - 1], b = profile[i], c = profile[i + 1];
      const d1x = b[0] - a[0], d1y = b[1] - a[1], d2x = c[0] - b[0], d2y = c[1] - b[1];
      const cos = (d1x * d2x + d1y * d2y) / (Math.hypot(d1x, d1y) * Math.hypot(d2x, d2y) || 1);
      if (cos < Math.cos(32 * DEG)) { parts.push(cur); cur = [profile[i]]; }
    }
  }
  parts.push(cur);
  return lathe(parts.filter((p) => p.length >= 2), segs, cx, cy);
}

export function setUV(g, fn) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const [u, v] = fn(p.getX(i), p.getY(i)); uv[2 * i] = u; uv[2 * i + 1] = v; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
// planar UV along a direction: u along angleDeg, v across; tile = `tile` mm; v shifted by off
export const dirUV = (angleDeg, tile, off = 0, origin = [0, 0]) => {
  const c = Math.cos(angleDeg * DEG), s = Math.sin(angleDeg * DEG);
  return (x, y) => {
    const X = x - origin[0], Y = y - origin[1];
    return [(X * c + Y * s) / tile, (-X * s + Y * c - off) / tile];
  };
};
export const radialUV = (c, R) => (x, y) => [(x - c[0]) / (2 * R) + 0.5, (y - c[1]) / (2 * R) + 0.5];

// Hole jewel (synthetic ruby) with its oil cup on the face at zFace facing −Z (dir 1: the
// jewel extends towards +Z) or facing +Z (dir −1).
export function jewelGeometry(c, rj, rh, zFace, t, dir = 1, segs = 40) {
  const cupR = rj * 0.58, cupD = Math.min(0.05, t * 0.3), ch = Math.min(0.025, rj * 0.06);
  const cup = [];
  for (let i = 0; i <= 8; i++) { const s = i / 8; cup.push([rh + (cupR - rh) * s, cupD * (1 - s * s)]); }
  const parts = [cup, [[cupR, 0], [rj - ch, 0]], [[rj - ch, 0], [rj, ch]], [[rj, ch], [rj, t]], [[rj, t], [rh, t]], [[rh, t], [rh, cupD]]]
    .map((p) => { const q = p.map(([r, z]) => [r, zFace + dir * z]); return dir > 0 ? q : q.reverse(); });
  return lathe(parts, segs, c[0], c[1]);
}

// Slotted screw head facing −Z: top (z = zTop) towards the case back, body to zTop + h.
// Returns { head, floor } (floor = the slot bottom, rendered darker). shank: { r, z } optional.
export function screwHead(c, r, zTop, h, { slotW = r * 0.32, slotD = Math.min(0.09, h * 0.55), slotDeg = 0, bev = r * 0.1, dome = r * 0.04, shank = null, segs = 40 } = {}) {
  const a = slotDeg * DEG, nx = -Math.sin(a), ny = Math.cos(a);
  const beta = Math.acos(Math.min(0.999, slotW / 2 / r));
  const halves = [1, -1].map((sg) => {
    const phi = Math.atan2(ny * sg, nx * sg);
    const pts = [];
    const N = Math.max(16, segs >> 1);
    for (let i = 0; i <= N; i++) { const t = phi - beta + (2 * beta * i) / N; pts.push([r * Math.cos(t), r * Math.sin(t)]); }
    const p1 = pts[N], p0 = pts[0];
    for (const f of [0.1, 0.5, 0.9]) pts.push([p1[0] + (p0[0] - p1[0]) * f, p1[1] + (p0[1] - p1[1]) * f]);
    return { outer: pts, holes: [] };
  });
  const k = (2 * dome) / (r * r);
  const s = slab(halves, zTop, zTop + slotD, {
    top: (x, y) => (Math.hypot(x, y) > r - 0.004 ? bev : 0),
    capBottom: false,
    capNormal: (x, y) => { const l = Math.hypot(k * x, k * y, 1); return [(k * x) / l, (k * y) / l, -1 / l]; },
  });
  const core = lathe([[[r, zTop + slotD], [r, zTop + h]]], segs);
  const floor = lathe([[[0, zTop + slotD], [r, zTop + slotD]]], segs);
  const list = [s.caps, s.walls, core];
  if (shank && shank.z > zTop + h + 0.04) {
    const zs = zTop + h, thread = [[shank.r, zs]];
    for (let z = zs + 0.03, kk = 0; z < shank.z - 0.03; z += 0.03, kk++) thread.push([kk % 2 ? shank.r : shank.r * 0.84, z]);
    thread.push([shank.r * 0.8, shank.z]);
    list.push(lathe([[[r, zs], [shank.r, zs]], thread, [[shank.r * 0.8, shank.z], [0, shank.z]]], 16));
  }
  const g = mergeGeometries(list);
  g.translate(c[0], c[1], 0);
  floor.translate(c[0], c[1], 0);
  return { head: g, floor };
}

// Geometry buckets → one merged mesh per material key.
export class Bucket {
  constructor() { this.m = new Map(); }
  add(key, g) { if (!g) return this; if (!this.m.has(key)) this.m.set(key, []); this.m.get(key).push(g); return this; }
  build(parent, mats, name = 'b4') {
    const out = [];
    for (const [key, list] of this.m) {
      const clean = list.map((g) => {
        const q = g.index ? g.toNonIndexed() : g;
        for (const a of Object.keys(q.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'uv') q.deleteAttribute(a);
        if (!q.attributes.uv) q.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2));
        q.clearGroups();
        return q;
      });
      const g = clean.length === 1 ? clean[0] : mergeGeometries(clean);
      const mesh = new THREE.Mesh(g, mats[key]);
      mesh.name = `${name}-${key}`;
      parent.add(mesh);
      out.push(mesh);
    }
    this.m.clear();
    return out;
  }
}

// ============================================================ finishes (textures)
const texCache = new WeakMap();
function dataTex(data, w, h, srgb = false) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 波目 wave stripes: one tile = 2 bands across (v) × 2 band widths along (u), in units of the
// band pitch. Each band is a slightly concave facet (its slope runs from −S0 to +S0 across the
// band, so the brightness ramps across it and jumps at the next band: the saw-tooth seen on
// ltF_6), finely ruled by the rotating diamond: gently curved tool lines inclined 5–25° to the
// band, ≈0.055 mm apart (mov_naked_26 / ltF_6 macros). Anisotropy follows the tool lines.
// The light tent is so even that the facet tilt alone left the bands barely visible (the
// photos show strong light/dark bands), so an albedo map adds the same saw-tooth ramp:
// each band darkens towards one edge, with a dark hairline where two cuts meet.
function waveTextures(size = 1024) {
  const nrm = new Uint8Array(size * size * 4), ani = new Uint8Array(size * size * 4);
  const alb = new Uint8Array(size * size * 4);
  const ALB_LO = 0.7; // albedo at a band's shaded edge (1 at its lit edge)
  const S0 = Math.tan(14 * DEG); // band facet tilt at its edges
  const a0 = 15 * DEG, beta = 20 * DEG; // tool-line angle at mid band, change across the band
  const M = 44; // tool lines per tile along u (tile u = 2 pitches)
  const f = (2 * Math.sin(a0)) / M; // line spacing (pitch units) along the normal of the a0 lines
  const A = 0.11 / (TAU / f); // ripple slope amplitude ≈ 0.11
  const r = rng(77);
  const ph = [r(), r()], tilt = [1 + 0.08 * (r() - 0.5), 1 + 0.08 * (r() - 0.5)];
  for (let j = 0; j < size; j++) {
    const w = (2 * (j + 0.5)) / size; // pitch units across
    const k = Math.min(1, Math.floor(w)), t = w - k;
    const al = a0 + beta * (t - 0.5);
    const G = Math.log(Math.sin(al)) / beta; // ∫ cot α dt
    const sMacro = S0 * (2 * t - 1) * tilt[k];
    // fine hairline at the band boundary (the ridge where two cuts meet)
    const ridge = t < 0.012 ? -0.25 * (1 - t / 0.012) : t > 0.988 ? 0.25 * (1 - (1 - t) / 0.012) : 0;
    let b = ALB_LO + (1 - ALB_LO) * Math.pow(t, 0.85);
    if (t < 0.02) b *= 0.82 + 0.18 * (t / 0.02);
    const bv = Math.round(255 * Math.min(1, b));
    for (let i = 0; i < size; i++) {
      const oa = (j * size + i) * 4;
      alb[oa] = alb[oa + 1] = alb[oa + 2] = bv; alb[oa + 3] = 255;
      const a = (2 * (i + 0.5)) / size;
      const phi = (Math.sin(a0) * (-a + G)) / f + ph[k] * 7.3;
      const sg = Math.sin(TAU * phi);
      // dφ/da = −sin a0 / f ; dφ/dt = sin a0 · cot α / f
      const dA = A * TAU * sg * (Math.sin(a0) / f);
      const dW = -A * TAU * sg * ((Math.sin(a0) * Math.cos(al)) / Math.sin(al) / f);
      const nx = -dA, ny = -(sMacro + dW + ridge), nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const o = (j * size + i) * 4;
      nrm[o] = Math.round((nx / l) * 127.5 + 127.5); nrm[o + 1] = Math.round((ny / l) * 127.5 + 127.5); nrm[o + 2] = Math.round((nz / l) * 127.5 + 127.5); nrm[o + 3] = 255;
      ani[o] = Math.round(Math.cos(al) * 127.5 + 127.5); ani[o + 1] = Math.round(Math.sin(al) * 127.5 + 127.5); ani[o + 2] = 255; ani[o + 3] = 255;
    }
  }
  return { normalMap: dataTex(nrm, size, size), anisotropyMap: dataTex(ani, size, size), map: dataTex(alb, size, size, true) };
}

// Fine straight graining (lines along u, ≈0.1 mm apart): one tile = 32 lines.
function brushedTextures(W = 64, H = 512) {
  const nrm = new Uint8Array(W * H * 4), ani = new Uint8Array(W * H * 4);
  const r = rng(913);
  const lines = 32, per = H / lines;
  const depth = Array.from({ length: lines }, () => 0.35 + 0.65 * r());
  const hgt = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    const li = Math.floor(y / per), t = (y % per) / per;
    hgt[y] = depth[li] * Math.sin(Math.PI * t) ** 1.5 + 0.15 * r();
  }
  for (let y = 0; y < H; y++) {
    const d = (hgt[(y + 1) % H] - hgt[(y + H - 1) % H]) * 0.5 * 0.45;
    for (let x = 0; x < W; x++) {
      const l = Math.hypot(d, 1), o = (y * W + x) * 4;
      nrm[o] = 128; nrm[o + 1] = Math.round((-d / l) * 127 + 128); nrm[o + 2] = Math.round((1 / l) * 127 + 128); nrm[o + 3] = 255;
      ani[o] = 255; ani[o + 1] = 128; ani[o + 2] = 255; ani[o + 3] = 255;
    }
  }
  return { normalMap: dataTex(nrm, W, H), anisotropyMap: dataTex(ani, W, H) };
}

// Shared material set (memoised per material library; library materials are only cloned).
export function finishes(M, spec) {
  let e = texCache.get(M);
  if (e) return e;
  const FC = spec.frame.colours;
  const wave = waveTextures();
  const brush = brushedTextures();
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  e = {
    wave,
    brush,
    // automatic bridge: rhodium-grey wave stripes (#CDD0D2 lit → #8E9295 in shade)
    bridgeWave: phys({ color: new THREE.Color(FC.bridge).lerp(new THREE.Color(FC.bridgeShade), 0.22), map: wave.map, metalness: 1, roughness: 0.2, normalMap: wave.normalMap, normalScale: new THREE.Vector2(1, 1), anisotropy: 0.35, anisotropyMap: wave.anisotropyMap, envMapIntensity: 0.9 }),
    rotorWave: phys({ color: new THREE.Color(FC.bridge).lerp(new THREE.Color(FC.bridgeShade), 0.15), map: wave.map, metalness: 1, roughness: 0.19, normalMap: wave.normalMap, normalScale: new THREE.Vector2(1, 1), anisotropy: 0.35, anisotropyMap: wave.anisotropyMap, envMapIntensity: 0.9 }),
    // rim band: fine concentric graining (library circular grain, mapped round the centre)
    band: (() => { const m = M.wheelRhodium.clone(); m.color.set(FC.bridge).lerp(new THREE.Color(FC.bridgeShade), 0.3); m.roughness = 0.36; m.normalScale = new THREE.Vector2(0.22, 0.22); m.envMapIntensity = 0.9; return m; })(),
    // lower bridges, plate rim, Magic Lever: fine straight graining
    grain: phys({ color: new THREE.Color(FC.bridge), metalness: 1, roughness: 0.34, normalMap: brush.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), anisotropy: 0.6, anisotropyMap: brush.anisotropyMap }),
    plate: (() => { const m = M.platePerlage.clone(); m.color.set(0xc8cbce); m.roughness = 0.36; m.normalScale = new THREE.Vector2(0.28, 0.28); m.roughnessMap = null; return m; })(),
    plateDial: (() => { const m = M.rhodium.clone(); m.color.set(0xbfc2c6); m.roughness = 0.5; return m; })(),
    turned: (() => { const m = M.wheelRhodium.clone(); m.color.set(0xd2d5d8); m.roughness = 0.26; return m; })(),
    bevel: M.rhodiumBevel,
    steel: M.steelPolished,
    slot: (() => { const m = M.steelDark.clone(); m.color.set(0x4d5157); m.roughness = 0.45; return m; })(),
    hole: new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.6, metalness: 0.3 }),
    ruby: (() => {
      const m = M.ruby.clone();
      m.color.set(FC.ruby); m.attenuationColor = new THREE.Color(0x5e1a46); m.attenuationDistance = 0.3;
      m.transmission = 0.2; m.emissive = new THREE.Color(0x14030c); m.clearcoat = 0.4; m.specularIntensity = 0.6;
      return m;
    })(),
    rubyDark: (() => {
      const m = M.ruby.clone();
      m.color.set(0x5b2a5f); m.attenuationColor = new THREE.Color(0x24082a); m.attenuationDistance = 0.2;
      m.transmission = 0.12; m.emissive = new THREE.Color(0x0b0210); m.clearcoat = 0.5; m.specularIntensity = 0.6;
      return m;
    })(),
    gold: phys({ color: new THREE.Color(FC.diashock), metalness: 1, roughness: 0.22 }),
    goldSpring: phys({ color: new THREE.Color(FC.diashock).lerp(new THREE.Color(0xffffff), 0.08), metalness: 1, roughness: 0.16 }),
  };
  texCache.set(M, e);
  return e;
}

// ============================================================ engraving font (single stroke)
// Upright monoline capitals as cut with a graver: cap height 1, baseline 0.
const FS = 0.15, GAP = 0.2, SPACE = 0.36;
function arcPts(cx, cy, rx, ry, a0, a1, n = 18) {
  const o = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * DEG; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return o;
}
const st = (closed, ...items) => { const p = []; for (const it of items) { if (typeof it[0] === 'number') p.push(it); else p.push(...it); } return { p, c: closed }; };
const GLYPHS = (() => {
  const G = {};
  const add = (ch, w, ...s) => { G[ch] = { w, s }; };
  const B = FS / 2, T = 1 - FS / 2;
  let w;
  w = 0.68; add('A', w, st(false, [0, B], [w / 2, T], [w, B]), st(false, [w * 0.18, 0.33], [w * 0.82, 0.33]));
  w = 0.6; add('C', w, st(false, arcPts(w / 2, 0.5, w / 2, T - 0.5, 38, 322, 26)));
  w = 0.44; add('E', w, st(false, [w, T], [0, T], [0, B], [w, B]), st(false, [0, 0.5], [w * 0.88, 0.5]));
  w = 0.56; add('H', w, st(false, [0, B], [0, T]), st(false, [w, B], [w, T]), st(false, [0, 0.5], [w, 0.5]));
  add('I', 0, st(false, [0, B], [0, T]));
  w = 0.42; add('J', w, st(false, [w, T], [w, 0.3], ...arcPts(w / 2, 0.3, w / 2, 0.3 - B, 0, -165, 14)));
  w = 0.54; add('K', w, st(false, [0, B], [0, T]), st(false, [w, T], [0, 0.36]), st(false, [0.17, 0.52], [w, B]));
  w = 0.44; add('L', w, st(false, [0, T], [0, B], [w, B]));
  w = 0.76; add('M', w, st(false, [0, B], [0, T], [w / 2, 0.28], [w, T], [w, B]));
  w = 0.58; add('N', w, st(false, [0, B], [0, T], [w, B], [w, T]));
  w = 0.68; add('O', w, st(true, arcPts(w / 2, 0.5, w / 2, T - 0.5, 0, 360, 32)));
  w = 0.5; add('P', w, st(false, [0, B], [0, T], [w - 0.24, T], ...arcPts(w - 0.24, T - 0.21, 0.24, 0.21, 90, -90, 12), [0, T - 0.42]));
  w = 0.52; add('R', w, st(false, [0, B], [0, T], [w - 0.25, T], ...arcPts(w - 0.25, T - 0.21, 0.25, 0.21, 90, -90, 12), [0, T - 0.42]), st(false, [w - 0.26, T - 0.42], [w, B]));
  w = 0.52; add('S', w, st(false, arcPts(w / 2, T - 0.2, w / 2, 0.2, 20, 250, 16), arcPts(w / 2, B + 0.225, w / 2, 0.225, 70, -165, 16)));
  w = 0.6; add('T', w, st(false, [0, T], [w, T]), st(false, [w / 2, T], [w / 2, B]));
  w = 1.0; add('W', w, st(false, [0, T], [w * 0.24, B], [w / 2, T * 0.86], [w * 0.76, B], [w, T]));
  w = 0.62; add('Y', w, st(false, [0, T], [w / 2, 0.47], [w, T]), st(false, [w / 2, 0.47], [w / 2, B]));
  w = 0.5; add('2', w, st(false, arcPts(w / 2, T - 0.24, w / 2, 0.24, 160, -30, 16), [0, B], [w, B]));
  w = 0.5; add('5', w, st(false, [w * 0.94, T], [0.05, T], [0, 0.56], ...arcPts(w / 2, B + 0.27, w / 2, 0.27, 140, -150, 18)));
  { w = 0.52; const cy = B + 0.27, a = 150 * DEG; add('6', w, st(true, arcPts(w / 2, cy, w / 2, 0.27, 0, 360, 24)), st(false, [w / 2 + (w / 2) * Math.cos(a), cy + 0.27 * Math.sin(a)], [w * 0.74, T])); }
  { w = 0.52; const cy = T - 0.27, a = -30 * DEG; add('9', w, st(true, arcPts(w / 2, cy, w / 2, 0.27, 0, 360, 24)), st(false, [w / 2 + (w / 2) * Math.cos(a), cy + 0.27 * Math.sin(a)], [w * 0.26, B])); }
  add('.', 0, st(false, [0, B], [0.001, B]));
  return G;
})();
export function textWidth(str) {
  let w = 0, n = 0;
  for (const ch of str) { const g = GLYPHS[ch]; w += ch === ' ' ? SPACE : g ? g.w + FS : 0.6; n++; }
  return w + GAP * Math.max(0, n - 1);
}
// Draw `str` with its outer-left edge at x (px) and baseline at y (px); hs = horizontal scale.
export function drawText(c, str, x, y, capPx, hs = 1) {
  c.lineWidth = FS * capPx;
  let xo = 0;
  for (const ch of str) {
    if (ch === ' ') { xo += SPACE + GAP; continue; }
    const g = GLYPHS[ch];
    if (!g) { xo += 0.6 + GAP; continue; }
    for (const s of g.s) {
      c.beginPath();
      s.p.forEach(([gx, gy], i) => { const X = x + (xo + FS / 2 + gx) * capPx * hs, Y = y - gy * capPx; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
      if (s.c) c.closePath();
      c.stroke();
    }
    xo += g.w + FS + GAP;
  }
}
function boxBlur(src, w, h, r, passes = 3) {
  let a = Float32Array.from(src);
  const b = new Float32Array(src.length), k = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { b[row + x] = acc * k; acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { a[y * w + x] = acc * k; acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; }
    }
  }
  return a;
}
// Engraved lettering → shade map, alpha map, normal map (groove: strength > 0).
export function engraveTextures(wPx, hPx, draw, { blur = 2, fill = 1, edge = 0.55, strength = 3 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = wPx; cv.height = hPx;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, wPx, hPx);
  c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
  draw(c);
  const d = c.getImageData(0, 0, wPx, hPx).data, n = wPx * hPx;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = d[i * 4] / 255;
  const b = boxBlur(a, wPx, hPx, blur, 3);
  const map = new Uint8Array(n * 4), al = new Uint8Array(n * 4), nm = new Uint8Array(n * 4);
  for (let y = 0; y < hPx; y++) {
    const up = (y > 0 ? y - 1 : 0) * wPx, dn = (y < hPx - 1 ? y + 1 : y) * wPx, row = y * wPx;
    for (let x = 0; x < wPx; x++) {
      const i = row + x;
      // canvas rows run down; DataTexture rows run up → write row (hPx − 1 − y)
      const o = ((hPx - 1 - y) * wPx + x) * 4;
      const t = Math.min(1, Math.max(0, (b[i] - 0.15) / 0.7));
      const sh = (edge + (fill - edge) * t * t * (3 - 2 * t)) * 255;
      map[o] = map[o + 1] = map[o + 2] = sh; map[o + 3] = 255;
      const av = Math.min(1, Math.max(a[i] * 1.15, b[i] * 1.6)) * 255;
      al[o] = al[o + 1] = al[o + 2] = av; al[o + 3] = 255;
      const xl = x > 0 ? x - 1 : 0, xr = x < wPx - 1 ? x + 1 : x;
      const gx = (b[row + xr] - b[row + xl]) * strength, gy = -(b[dn + x] - b[up + x]) * strength;
      const l = Math.sqrt(gx * gx + gy * gy + 1);
      nm[o] = (gx / l) * 127.5 + 127.5; nm[o + 1] = (gy / l) * 127.5 + 127.5; nm[o + 2] = (1 / l) * 127.5 + 127.5; nm[o + 3] = 255;
    }
  }
  const tex = (arr, srgb) => { const t = dataTex(arr, wPx, hPx, srgb); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  return { map: tex(map, true), alphaMap: tex(al, false), normalMap: tex(nm, false) };
}
// Grid mesh facing −Z: toBack(u, v) → back-view [x, y] (u along the reading direction, v up
// the letters); stored in the dial frame (x mirrored), so it reads correctly from the back.
export function decalGeometry(toBack, nu, nv, z) {
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
  const F = spec.frame, L = spec.layout, Z = spec.z, R = spec.radii;
  const FN = finishes(M, spec);
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const ed = (id) => spec.explodeDelay(id);
  const boxAround = (c, r) => [c[0] - r, c[1] - r, c[0] + r, c[1] + r];

  const mats = {
    wave: FN.bridgeWave, band: FN.band, grain: FN.grain, plate: FN.plate, plateDial: FN.plateDial, turned: FN.turned,
    bevel: FN.bevel, steel: FN.steel, slot: FN.slot, hole: FN.hole, ruby: FN.ruby, rubyDark: FN.rubyDark, gold: FN.gold, goldSpring: FN.goldSpring,
  };

  // ---- UV mappings
  const BS = BRIDGE_STRIPES;
  const waveUV = (g) => setUV(g, dirUV(BS.angleDialDeg, 2 * BS.pitch, BS.boundaryOffset));
  const bandUV = (g) => setUV(g, radialUV([0, 0], F.automaticBridge.outerRadius));
  const grainUV = (g) => setUV(g, dirUV(LOWER_GRAIN_DEG, 3.2));
  const rimGrainUV = (g) => setUV(g, dirUV(PLATE_RIM_GRAIN_DEG, 3.2));
  const plateUV = (g) => setUV(g, (x, y) => [x / 9, y / 9]);
  const flatUV = (g) => g;
  const put = (bk, s, capKey, wallKey, uv) => { if (s.caps) bk.add(capKey, uv(s.caps)); if (s.walls) bk.add(wallKey, s.walls); };

  // ---- objects
  const group = (name) => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };
  const plateObj = group('main-plate');
  const trainObj = group('train-bridge');
  const barrelObj = group('barrel-bridge');
  const prObj = group('pr-bridge');
  const autoObj = group('automatic-bridge');
  const jewelObj = group('jewels');
  const diaObj = group('diashock');
  const screwObj = group('plate-screws');
  const clampObj = group('case-clamps');
  const tagJewels = []; // jewel meshes inside other parts (tagged 'jewels' for picking)

  // ================================================================ shared outlines
  const smoothPoly = (pts, per = 5) => SD.poly(smoothOutline(pts, per));
  const trainS = smoothPoly(F.trainBridge.outline);
  const prS = smoothPoly(F.prBridge.outline);
  const barrelS = SD.sub(smoothPoly(F.barrelBridge.outline), SD.grow(trainS, 0.025), SD.grow(prS, 0.025));
  const disc = (r) => SD.circle([0, 0], r);

  // ================================================================ MAIN PLATE
  {
    const bk = new Bucket();
    const zB = Z.mainPlate[0], zD = Z.mainPlate[1]; // back face −1.20, dial face 0
    const RP = F.plateRadius;
    const SC = F.stemChannel, WS = F.windingPinionSlot;
    const plateDisc = disc(RP);
    // keyless channel on the back: stem channel + sliding-pinion cavity (open to the back)
    const stemCh = SD.inter(SD.box((SC.x[0] + RP + 1) / 2, 0, (RP + 1 - SC.x[0]) / 2, SC.y[1]), plateDisc);
    const slideCav = SD.box(9.12, 0, 0.62, 0.84, 0.12); // sliding pinion x 8.55–9.70, r 0.75
    const windSlot = SD.box((WS.x[0] + WS.x[1]) / 2, 0, (WS.x[1] - WS.x[0]) / 2, WS.y[1], 0.2);
    const backCh = SD.union(stemCh, slideCav);
    // through openings: winding-pinion slot, and the dial-side opening over the sliding pinion
    // (yoke fingers reach in; the pinion lifts out towards the dial)
    const leverPin = SD.circle([spec.keylessLevers.stemGrooveX, 0], 0.16);
    // dial-side level-1 pockets (floor z.motionRecessFloor)
    const pk = (c, r) => SD.circle(c, r + 0.12);
    const pockets = SD.union(
      SD.smooth(0.5, pk([0, 0], R.cannonLeaves), pk(L.minuteWheel, R.minuteWheel), pk(L.settingIntermediate, R.settingIntermediate), pk(L.settingWheel, R.settingWheel)),
      SD.smooth(0.4, pk(L.prDisplay, R.prDisplayWheel), pk(L.prIntermediate, R.prIntermediatePinion)),
    );
    // through holes: centre (centre tube r 0.22), PR output arbor, jewel seats (from the back)
    const lowerJ = [
      { c: L.center, rs: 0.62, rj: 0.5, rh: 0.25 }, { c: L.third, rs: 0.5, rj: 0.38, rh: 0.07 },
      { c: L.fifth, rs: 0.48, rj: 0.36, rh: 0.06 }, { c: L.sixth, rs: 0.46, rj: 0.34, rh: 0.05 },
      { c: L.barrel, rs: 0.72, rj: 0.6, rh: 0.36 }, { c: L.prA, rs: 0.42, rj: 0.32, rh: 0.06 },
      { c: L.prB, rs: 0.45, rj: 0.34, rh: 0.13 }, { c: L.prC, rs: 0.42, rj: 0.32, rh: 0.06 },
      { c: L.crownTransmission, rs: 0.45, rj: 0.34, rh: 0.07 },
    ];
    const seats = lowerJ.map((j) => SD.circle(j.c, j.rs));
    const glideSeat = SD.circle(L.glide, F.jewels.glideLower.settingRadius + 0.02);
    const DF = spec.dial.feet;
    const feet = DF.angles.map((a) => SD.circle([DF.r * Math.sin(a * DEG), DF.r * Math.cos(a * DEG)], DF.radius + 0.03));
    const dateStud = SD.circle(L.dateDriver, 0.27);
    const through = SD.union(windSlot, SD.inter(slideCav, SD.box(9.12, 0, 0.6, 0.82)), ...seats, glideSeat);

    // (1) full-thickness body
    const body = SD.sub(plateDisc, backCh, pockets, through, leverPin, dateStud);
    const RIM_IN = 13.75; // exposed rim (straight graining) vs the inner back face
    const shapesIn = regionShapes(SD.inter(body, disc(RIM_IN)), boxAround([0, 0], RIM_IN + 0.1), 0.03);
    const shapesOut = regionShapes(SD.sub(body, disc(RIM_IN)), boxAround([0, 0], RP + 0.1), 0.03);
    const onEdge = (x, y) => Math.hypot(x, y) > RP - 0.02;
    const onSeam = (x, y) => Math.abs(Math.hypot(x, y) - RIM_IN) < 0.02;
    put(bk, slab(shapesIn, zB, zD, { top: (x, y) => (onSeam(x, y) || seats.some((s) => Math.abs(s(x, y)) < 0.01) ? 0 : 0.04) }), 'plate', 'bevel', plateUV);
    {
      const s = slab(shapesOut, zB, zD, { top: (x, y) => (onEdge(x, y) ? 0.08 : onSeam(x, y) ? 0 : 0.03), capBottom: true });
      if (s.caps) {
        // the back-face cap gets the straight rim graining, the dial-face cap the dial finish
        const p = s.caps.attributes.position, n = s.caps.attributes.normal;
        const back = [], dial = [], bn = [], dn = [];
        for (let i = 0; i < p.count; i += 3) {
          const tgt = n.getZ(i) < 0 ? [back, bn] : [dial, dn];
          for (let k = 0; k < 3; k++) { tgt[0].push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); tgt[1].push(n.getX(i + k), n.getY(i + k), n.getZ(i + k)); }
        }
        if (back.length) bk.add('grain', rimGrainUV(makeGeo(back, bn)));
        if (dial.length) bk.add('plateDial', makeGeo(dial, dn));
      }
      if (s.walls) bk.add('bevel', s.walls);
    }
    // (2) floors of the dial pockets (z back face … pocket floor)
    const zPk = Z.motionRecessFloor;
    put(bk, slab(regionShapes(SD.sub(pockets, backCh, through, leverPin), [-7.5, -10.2, 10.5, 3.5], 0.03), zB, zPk, { capTop: false }), 'plateDial', 'bevel', flatUV);
    // (3) roof over the stem channel / sliding pinion (closed towards the dial except the slots)
    const zRoof = SC.z[1]; // −0.35
    put(bk, slab(regionShapes(SD.sub(SD.inter(stemCh, SD.not(slideCav)), through, leverPin, pockets), [SC.x[0] - 0.2, -0.7, RP + 0.1, 0.7], 0.02), zRoof, zD, {}), 'plate', 'bevel', plateUV);
    put(bk, slab(regionShapes(SD.sub(SD.inter(stemCh, pockets), through, leverPin), [SC.x[0] - 0.2, -0.7, 9, 0.7], 0.02), zRoof, zPk, {}), 'plate', 'bevel', plateUV);
    // (4) dial-seat rim r 14.2–15.0 up to +0.75 (feet holes), and the date-ring shoulder
    const seat = F.plateRim.dialSeat;
    const rimR = SD.sub(SD.annulus([0, 0], seat.inner, seat.outer), ...feet);
    put(bk, slab(regionShapes(rimR, boxAround([0, 0], RP + 0.1), 0.03), zD, seat.top, { bottom: (x, y) => (Math.hypot(x, y) > RP - 0.02 ? 0.06 : 0.04), capTop: false }), 'plateDial', 'bevel', flatUV);
    const shoulder = SD.sub(SD.annulus([0, 0], 13.2, seat.inner), SD.box(13.7, 0, 1.0, 4.7)); // notch: keyless levers and springs
    put(bk, slab(regionShapes(shoulder, boxAround([0, 0], seat.inner + 0.1), 0.03), zD, Z.dateRingSeat, { bottom: 0.03, capTop: false }), 'plateDial', 'bevel', flatUV);
    // feet hole floors and the date-driver stud hole floor
    for (const h of feet) put(bk, slab(regionShapes(h, [h.bb[0] - 0.1, h.bb[1] - 0.1, h.bb[2] + 0.1, h.bb[3] + 0.1], 0.02), zB, -0.3, { capTop: false }), 'hole', 'bevel', flatUV);
    put(bk, slab(regionShapes(dateStud, boxAround(L.dateDriver, 0.4), 0.02), zB, zPk, { capTop: false }), 'hole', 'bevel', flatUV);

    // lower jewels: polished sink on the back face, ruby, bore up to the dial side
    const rub = [];
    for (const j of lowerJ) {
      const zj = zB + 0.09, zjb = zj + 0.2, rd = j.rh + 0.05;
      const zTopHole = pockets(j.c[0], j.c[1]) < 0 ? zPk : zD;
      bk.add('bevel', lathe([[[j.rs, zTopHole], [rd, zTopHole]], [[rd, zTopHole], [rd, zjb]], [[rd, zjb], [j.rj, zjb]], [[j.rj, zjb], [j.rj, zj]], [[j.rj, zj], [j.rs, zB]]], 36, j.c[0], j.c[1]));
      rub.push(jewelGeometry(j.c, j.rj, j.rh, zj, 0.2, 1, 32));
    }
    const rubyMesh = new THREE.Mesh(mergeGeometries(rub), mats.ruby);
    rubyMesh.name = 'main-plate-jewels';
    plateObj.add(rubyMesh);
    tagJewels.push(rubyMesh);
    // gold-coloured lower setting of the glide wheel (z glideLower), set into the back face
    {
      const GL = F.jewels.glideLower, c = GL.at, rS = GL.settingRadius;
      const g = latheProfile([[0.18, GL.z[1] + 0.12], [0.18, GL.z[0] + 0.03], [0.24, GL.z[0]], [rS - 0.06, GL.z[0]], [rS, GL.z[0] + 0.05], [rS, GL.z[1] + 0.2]], 40, c[0], c[1]);
      const m = new THREE.Mesh(g, mats.gold); m.name = 'glide-lower-setting'; plateObj.add(m);
      const jr = new THREE.Mesh(jewelGeometry(c, 0.2, 0.05, GL.z[0] + 0.035, 0.16, 1, 28), mats.ruby); plateObj.add(jr); tagJewels.push(jr, m);
    }

    // pillars under the automatic-bridge screws (the one on the train bridge is built there)
    for (const p of F.pillars) {
      if (p.on !== 'main-plate') continue;
      const [z0, z1] = p.z, r = p.radius;
      bk.add('turned', setUV(latheProfile([[0.24, z0 + 0.25], [0.24, z0], [r - 0.08, z0], [r, z0 + 0.06], [r, z1]], 40, p.at[0], p.at[1]), radialUV(p.at, r)));
    }
    bk.build(plateObj, mats, 'main-plate');
  }

  // ================================================================ LOWER BRIDGES (z.bridges)
  const zBt = Z.bridges[0], zBu = Z.bridges[1]; // top −3.62 (case-back side), underside −3.20
  const BEV = 0.06;
  // upper pivots / jewels in the train bridge: hidden jewels (X-ray) and the two Diashocks
  const DIA = F.jewels.diashock;
  const trainJ = F.jewels.trainBridge.map((c, i) => ({ c, rs: [0.6, 0.5, 0.48][i] ?? 0.48, rj: [0.48, 0.38, 0.36][i] ?? 0.36, rh: [0.11, 0.07, 0.06][i] ?? 0.06 }));
  {
    const bk = new Bucket();
    const pillar = F.pillars.find((p) => p.on === 'train-bridge');
    const sinks = trainJ.map((j) => SD.circle(j.c, j.rs));
    const diaSinks = DIA.map((d) => SD.circle(d.at, d.settingDiameter / 2 + 0.06));
    const cwPivot = SD.circle(L.crownWheel, 0.14);
    const region = SD.sub(trainS, ...sinks, ...diaSinks, cwPivot);
    const noBev = (x, y) => [...sinks, ...diaSinks].some((s) => Math.abs(s(x, y)) < 0.012);
    put(bk, slab(regionShapes(region, [-8.6, -4.1, 12.6, 12.4], 0.025), zBt, zBu, { top: (x, y) => (noBev(x, y) ? 0 : BEV) }), 'grain', 'bevel', grainUV);
    const rub = [];
    for (const j of trainJ) {
      const zj = zBt + 0.08, zjb = zj + 0.18, rb = j.rh + 0.06;
      bk.add('bevel', lathe([[[rb, zBu], [rb, zjb]], [[rb, zjb], [j.rj, zjb]], [[j.rj, zjb], [j.rj, zj]], [[j.rj, zj], [j.rs, zBt]], [[j.rs, zBu], [rb, zBu]]], 36, j.c[0], j.c[1]));
      rub.push(jewelGeometry(j.c, j.rj, j.rh, zj, 0.18, 1, 32));
    }
    // countersinks for the Diashock settings (polished), floor with the hole jewel's bore
    for (const d of DIA) {
      const rS = d.settingDiameter / 2 + 0.06, zf = zBt + 0.1;
      bk.add('bevel', lathe([[[0.12, zBu], [0.12, zf]], [[0.12, zf], [rS - 0.04, zf]], [[rS - 0.04, zf], [rS, zBt]], [[rS, zBu], [0.12, zBu]]], 40, d.at[0], d.at[1]));
    }
    // crown-wheel core hole (the crown wheel's fixed core hangs from the bridge)
    bk.add('bevel', lathe([[[0.14, zBu], [0.14, zBt]]], 20, L.crownWheel[0], L.crownWheel[1]));
    // pillar on the train bridge under the automatic-bridge screw at 1–2 o'clock
    if (pillar) bk.add('turned', setUV(latheProfile([[0.24, pillar.z[0] + 0.25], [0.24, pillar.z[0]], [pillar.radius - 0.08, pillar.z[0]], [pillar.radius, pillar.z[0] + 0.06], [pillar.radius, pillar.z[1]]], 40, pillar.at[0], pillar.at[1]), radialUV(pillar.at, pillar.radius)));
    bk.build(trainObj, mats, 'train-bridge');
    const rm = new THREE.Mesh(mergeGeometries(rub), mats.ruby); rm.name = 'train-bridge-jewels'; trainObj.add(rm); tagJewels.push(rm);
  }
  {
    // barrel bridge: fine straight graining, a turned seat under the ratchet, lower pivots of
    // the pawl wheel and keyless intermediate (jewels), click screw seat
    const bk = new Bucket();
    const seatR = R.ratchet + 0.35;
    const bj = [{ c: L.pawlWheel, rs: 0.44, rj: 0.34, rh: 0.08 }, { c: L.keylessIntermediate, rs: 0.44, rj: 0.34, rh: 0.08 }];
    const arborHole = SD.circle(L.barrel, 0.62);
    const sinks = bj.map((j) => SD.circle(j.c, j.rs));
    const region = SD.sub(barrelS, arborHole, ...sinks);
    const seatD = SD.circle(L.barrel, seatR);
    const noBev = (x, y) => [arborHole, ...sinks].some((s) => Math.abs(s(x, y)) < 0.012);
    const bb = [-9.8, -13.2, 6.4, -0.3];
    // grained part (outside the ratchet seat) and the turned seat (concentric graining)
    const sOut = slab(regionShapes(SD.sub(region, seatD), bb, 0.025), zBt, zBu, { top: (x, y) => (noBev(x, y) || Math.abs(seatD(x, y)) < 0.012 ? 0 : BEV) });
    put(bk, sOut, 'grain', 'bevel', grainUV);
    const sIn = slab(regionShapes(SD.inter(region, seatD), bb, 0.025), zBt, zBu, { top: (x, y) => (noBev(x, y) || Math.abs(seatD(x, y)) < 0.012 ? 0 : BEV) });
    put(bk, sIn, 'turned', 'bevel', (g) => setUV(g, radialUV(L.barrel, seatR)));
    const rub = [];
    for (const j of bj) {
      const zj = zBt + 0.08, zjb = zj + 0.18, rb = j.rh + 0.06;
      bk.add('bevel', lathe([[[rb, zBu], [rb, zjb]], [[rb, zjb], [j.rj, zjb]], [[j.rj, zjb], [j.rj, zj]], [[j.rj, zj], [j.rs, zBt]], [[j.rs, zBu], [rb, zBu]]], 36, j.c[0], j.c[1]));
      rub.push(jewelGeometry(j.c, j.rj, j.rh, zj, 0.18, 1, 32));
    }
    bk.add('bevel', lathe([[[0.62, zBu], [0.62, zBt]]], 40, L.barrel[0], L.barrel[1]));
    bk.build(barrelObj, mats, 'barrel-bridge');
    const rm = new THREE.Mesh(mergeGeometries(rub), mats.ruby); rm.name = 'barrel-bridge-jewels'; barrelObj.add(rm); tagJewels.push(rm);
  }
  {
    // PR bridge: three pink jewels (differential), two pin holes, one screw (plate-screws)
    const bk = new Bucket();
    const pj = F.jewels.prBridge.map((j) => ({ c: j.at, rs: j.diameter / 2 + 0.12, rj: j.diameter / 2, rh: 0.06 }));
    const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const outw = (p, d) => { const l = Math.hypot(p[0], p[1]); return [p[0] + (p[0] / l) * d, p[1] + (p[1] / l) * d]; };
    const pins = [outw(mid(L.prA, L.prB, 0.5), 0.75), outw(mid(L.prB, L.prC, 0.5), -0.55)].map((c) => SD.circle(c, 0.19)); // ESTIMATE (mov_naked_25)
    const sinks = pj.map((j) => SD.circle(j.c, j.rs));
    const region = SD.sub(prS, ...sinks, ...pins);
    const noBev = (x, y) => sinks.some((s) => Math.abs(s(x, y)) < 0.012);
    put(bk, slab(regionShapes(region, [-14.0, -11.8, -6.2, -0.4], 0.02), zBt, zBu, { top: (x, y) => (noBev(x, y) ? 0 : BEV * 0.8) }), 'grain', 'bevel', grainUV);
    const rub = [];
    for (const j of pj) {
      const zj = zBt + 0.07, zjb = zj + 0.16, rb = j.rh + 0.06;
      bk.add('bevel', lathe([[[rb, zBu], [rb, zjb]], [[rb, zjb], [j.rj, zjb]], [[j.rj, zjb], [j.rj, zj]], [[j.rj, zj], [j.rs, zBt]], [[j.rs, zBu], [rb, zBu]]], 36, j.c[0], j.c[1]));
      rub.push(jewelGeometry(j.c, j.rj, j.rh, zj, 0.16, 1, 32));
    }
    bk.build(prObj, mats, 'pr-bridge');
    const rm = new THREE.Mesh(mergeGeometries(rub), mats.ruby); rm.name = 'pr-bridge-jewels'; prObj.add(rm); tagJewels.push(rm);
  }

  // ================================================================ DIASHOCK settings (gold)
  {
    const bk = new Bucket();
    const zTop = Z.diashockTop, zSeat = zBt + 0.1;
    const caps = [];
    for (const d of DIA) {
      const rS = d.settingDiameter / 2, c = d.at;
      // gold setting (chaton) with a polished chamfer, seated in the bridge's countersink
      bk.add('gold', latheProfile([[rS * 0.55, zTop + 0.035], [rS * 0.7, zTop + 0.035], [rS * 0.74, zTop], [rS - 0.04, zTop], [rS, zTop + 0.04], [rS, zSeat - 0.03], [rS - 0.03, zSeat], [rS * 0.55, zSeat], [rS * 0.55, zTop + 0.035]], 48, c[0], c[1]));
      // cap jewel (pink cabochon) inside the setting
      const rc = rS * 0.5;
      caps.push(latheProfile([[0, zTop - 0.01], [rc * 0.6, zTop + 0.0], [rc, zTop + 0.035], [rc, zTop + 0.07]], 32, c[0], c[1]));
      // lyre spring: two gold wire arms closing over the cap jewel, ends hooked in the setting
      const wire = [];
      const ra = rS * 0.62, wR = 0.035;
      for (const side of [1, -1]) {
        const pts = [];
        for (let k = 0; k <= 16; k++) {
          const t = k / 16, a = (side * (35 + 110 * t) + 90) * DEG;
          const rr = ra * (0.92 + 0.12 * Math.sin(Math.PI * t));
          pts.push(new THREE.Vector3(c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a), zTop + 0.005 - 0.01 * Math.sin(Math.PI * t)));
        }
        wire.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, wR, 6, false));
      }
      for (const w of wire) bk.add('goldSpring', w);
    }
    bk.build(diaObj, mats, 'diashock');
    const cm = new THREE.Mesh(mergeGeometries(caps), mats.ruby); cm.name = 'diashock-cap-jewels'; diaObj.add(cm);
  }

  // ================================================================ AUTOMATIC BRIDGE
  const AB = F.automaticBridge;
  const zA0 = Z.automaticBridge[0], zA1 = Z.automaticBridge[1]; // top −4.38, underside −3.98
  const zBand = AB.band.top; // −4.22
  const engraving = new THREE.Group(); engraving.name = 'automatic-bridge-engravings';
  {
    const bk = new Bucket();
    // LOCAL fix: the straight-on case back (ltF_6) shows the dark pawl-wheel jewel set in a
    // rounded lobe of the bridge that reaches over the pawl wheel; the SPEC outline passes
    // ≈0.8 mm above the jewel (it would float in the cut-out), so the lobe is added here.
    const PWJ = F.jewels.automaticBridge[0].at;
    const lobe = SD.smooth(0.6, SD.circle(PWJ, 0.98), SD.capsule(PWJ, [PWJ[0] + 0.9, PWJ[1] + 1.15], 0.85));
    const outline = SD.inter(SD.smooth(0.35, SD.poly(smoothOutline(AB.outline, 4)), lobe), disc(AB.outerRadius));
    // windows: organic shapes traced on mov_naked_28 / ltF_6 round the SPEC centres
    const w0 = AB.windows[0].center, w1 = AB.windows[1].center;
    const bigWin = SD.smooth(0.55, SD.circle([w0[0] - 0.55, w0[1] + 0.35], 1.0), SD.circle([w0[0] + 0.55, w0[1] - 0.3], 0.95), SD.capsule([w0[0] - 0.6, w0[1] - 0.45], [w0[0] + 0.45, w0[1] + 0.5], 0.62));
    const kw = [w1[0] - 0.3, w1[1] - 0.3];
    const keyWin = SD.sub(SD.smooth(0.45, SD.capsule([kw[0] - 1.2, kw[1] - 0.35], [kw[0] + 1.1, kw[1] - 0.05], 0.7), SD.circle([kw[0] - 0.95, kw[1] - 0.1], 0.8)), SD.circle([kw[0] + 0.15, kw[1] + 1.05], 0.5));
    const ctSlot = SD.capsule([L.crownTransmission[0] - 0.22, L.crownTransmission[1] + 0.06], [L.crownTransmission[0] + 0.18, L.crownTransmission[1] - 0.02], 0.25);
    const bore = disc(2.4); // rotor ball bearing (outer race pressed in)
    const AJ = F.jewels.automaticBridge;
    const jSinks = AJ.map((j) => SD.circle(j.at, j.diameter / 2 + 0.3));
    const sc = AB.screws.map((p) => SD.circle(p, 0.86));
    const pin = SD.circle(AB.pinHole.at, AB.pinHole.diameter / 2);
    const oilHole = SD.circle([-4.68, 1.45], 0.16); // small hole right of the bearing (mov_naked_25/28), ESTIMATE
    const holes = [bigWin, keyWin, ctSlot, bore, ...jSinks, ...sc, pin, oilHole];
    const RB = AB.band.innerRadius;
    const centre = SD.sub(SD.inter(outline, disc(RB)), ...holes);
    const band = SD.sub(SD.inter(outline, SD.not(disc(RB))), ...holes);
    const noBevC = (x, y) => jSinks.some((s) => Math.abs(s(x, y)) < 0.012) || Math.abs(bore(x, y)) < 0.012;
    const box = [-13.8, -11.2, 13.8, 13.8];
    put(bk, slab(regionShapes(centre, box, 0.025), zA0, zA1, { top: (x, y) => (noBevC(x, y) ? 0 : 0.07) }), 'wave', 'bevel', waveUV);
    const noBevB = (x, y) => sc.some((s) => Math.abs(s(x, y)) < 0.012) || Math.abs(pin(x, y)) < 0.012;
    put(bk, slab(regionShapes(band, box, 0.025), zBand, zA1, { top: (x, y) => (noBevB(x, y) ? 0 : 0.06) }), 'band', 'bevel', bandUV);
    // bearing boss R 3.0 up to z.bearingBossTop
    const bossTop = AB.bearing.bossTop, rBoss = AB.bearing.bossRadius;
    bk.add('turned', setUV(latheProfile([[2.4, zA0 + 0.02], [2.4, bossTop + 0.03], [2.45, bossTop], [rBoss - 0.08, bossTop], [rBoss, bossTop + 0.07], [rBoss, zA0]], 96), radialUV([0, 0], rBoss)));
    // jewel sinks (polished cones) + jewels: pawl wheel (dark purple), keyless intermediate (pink)
    const rubP = [], rubD = [];
    AJ.forEach((j, i) => {
      const rj = j.diameter / 2, rs = rj + 0.3, zj = zA0 + 0.12, zjb = zj + 0.2, rb = 0.14;
      bk.add('bevel', lathe([[[rb, zA1], [rb, zjb]], [[rb, zjb], [rj, zjb]], [[rj, zjb], [rj, zj]], [[rj, zj], [rs, zA0]], [[rs, zA1], [rb, zA1]]], 48, j.at[0], j.at[1]));
      (i === 0 ? rubD : rubP).push(jewelGeometry(j.at, rj, 0.08, zj, 0.2, 1, 40));
    });
    // screw countersinks (heads sunk flush with the band top)
    for (const p of AB.screws) bk.add('bevel', lathe([[[0.86, zA1], [0.3, zA1]], [[0.3, zA1], [0.3, zBand + 0.2]], [[0.3, zBand + 0.2], [0.79, zBand + 0.2]], [[0.79, zBand + 0.2], [0.79, zBand + 0.06]], [[0.79, zBand + 0.06], [0.86, zBand]]].map((s) => s), 48, p[0], p[1]));
    // pin hole (○ between SEIKO and TIME), the small hole, the crown-transmission slot floor
    bk.add('hole', lathe([[[0, zBand + 0.18], [AB.pinHole.diameter / 2, zBand + 0.18]]], 24, AB.pinHole.at[0], AB.pinHole.at[1]));
    bk.add('hole', lathe([[[0, zA0 + 0.25], [0.16, zA0 + 0.25]]], 16, -4.68, 1.45));
    bk.build(autoObj, mats, 'automatic-bridge');
    const jm = new THREE.Mesh(mergeGeometries(rubP), mats.ruby); jm.name = 'auto-bridge-jewel-pink'; jewelObj.add(jm);
    const jd = new THREE.Mesh(mergeGeometries(rubD), mats.rubyDark); jd.name = 'auto-bridge-jewel-dark'; jewelObj.add(jd);
    // crown-transmission upper pivot bush seen in the slot
    const bush = new THREE.Mesh(latheProfile([[0.06, zA0 + 0.12], [0.16, zA0 + 0.12], [0.2, zA0 + 0.08], [0.2, zA1]], 24, L.crownTransmission[0], L.crownTransmission[1]), M.steelPolished);
    bush.name = 'ct-bush'; jewelObj.add(bush);

    // ---------------------------------------------------------- engravings
    const PX = 130; // texture px per mm
    const EN = F.engravings;
    const gilt = (t) => {
      const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(EN.giltColour), metalness: 0.75, roughness: 0.34, map: t.map, alphaMap: t.alphaMap, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, clearcoat: 0.3 });
      return m;
    };
    const plain = (t) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(EN.plainColour).lerp(new THREE.Color(F.colours.bridge), 0.35), metalness: 1, roughness: 0.16, map: t.map, alphaMap: t.alphaMap, normalMap: t.normalMap, normalScale: new THREE.Vector2(1, 1), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const arcText = (item, z, makeMat, opts) => {
      const cap = item.capHeight, r = item.arc.r;
      // back-view maths angles (CCW): the text reads counter-clockwise, tops towards the centre
      const a0 = (90 - item.arc.fromBackDeg) * DEG, a1 = (90 - item.arc.toBackDeg) * DEG;
      const pad = 0.5 / r;
      const th0 = Math.min(a0, a1) - pad, th1 = Math.max(a0, a1) + pad;
      const ra = r - cap / 2 - 0.16, rb = r + cap / 2 + 0.16;
      const wPx = Math.max(16, Math.round((th1 - th0) * r * PX)), hPx = Math.round((rb - ra) * PX);
      const span = Math.abs(a1 - a0) * r;
      const hs = span / (textWidth(item.text) * cap);
      const x0px = (Math.min(a0, a1) - th0) * r * PX;
      // canvas top = inner radius (letter tops towards the centre), baseline at r + cap/2
      const tex = engraveTextures(wPx, hPx, (c) => drawText(c, item.text, x0px, (r + cap / 2 - ra) * PX, cap * PX, hs), opts);
      const toBack = (u, v) => { const th = th0 + (th1 - th0) * u, rr = rb - (rb - ra) * v; return [rr * Math.cos(th), rr * Math.sin(th)]; };
      const mesh = new THREE.Mesh(decalGeometry(toBack, Math.max(8, Math.round((th1 - th0) * r / 0.25)), 2, z), makeMat(tex));
      mesh.name = `engraving-${item.text}`; mesh.castShadow = false; mesh.renderOrder = 2;
      engraving.add(mesh);
    };
    for (const it of EN.gilt) arcText(it, (it.arc.r > RB ? zBand : zA0) - 0.002, gilt, { blur: 2, edge: 0.55, fill: 1, strength: 2.2 });
    for (const it of EN.plain) arcText(it, zBand - 0.002, plain, { blur: 2, edge: 0.45, fill: 0.85, strength: -3 });
    autoObj.add(engraving);
  }

  // ================================================================ SCREWS (plate-screws)
  {
    const bk = new Bucket();
    const sh = F.screws;
    const slotsAuto = [28, -62, 74]; // slot angles as photographed (ltF_6 / mov_naked_25)
    AB.screws.forEach((p, i) => {
      const r = sh.automaticBridge.headDiameter / 2, zTop = zBand + 0.005, h = 0.19;
      const s = screwHead(p, r, zTop, h, { slotW: 0.17, slotD: 0.08, slotDeg: slotsAuto[i] ?? 0, bev: 0.06, dome: 0.018, shank: { r: 0.3, z: zA1 + 0.05 } });
      bk.add('steel', s.head); bk.add('slot', s.floor);
    });
    {
      const p = sh.prBridge.at, r = sh.prBridge.headDiameter / 2;
      const s = screwHead(p, r, zBt - 0.1, 0.1, { slotW: 0.16, slotD: 0.06, slotDeg: 35, bev: 0.05, dome: 0.015, shank: { r: 0.28, z: zBu + 0.6 } });
      bk.add('steel', s.head); bk.add('slot', s.floor);
    }
    bk.build(screwObj, mats, 'plate-screws');
  }

  // ================================================================ CASING CLAMPS
  {
    const bk = new Bucket();
    const CC = F.screws.caseClamps, zc = Z.caseClamps;
    for (const p of CC.at) {
      const l = Math.hypot(p[0], p[1]), u = [p[0] / l, p[1] / l];
      const tip = [u[0] * (CC.tongue.reachRadius - CC.tongue.width / 2), u[1] * (CC.tongue.reachRadius - CC.tongue.width / 2)];
      const tongue = SD.capsule([p[0] - u[0] * 0.25, p[1] - u[1] * 0.25], tip, CC.tongue.width / 2);
      put(bk, slab(regionShapes(SD.sub(tongue, SD.circle(p, 0.28)), boxAround(p, 1.2), 0.015), zc[0] + 0.05, zc[1], { top: 0.025 }), 'grain', 'bevel', rimGrainUV);
      const a = (Math.atan2(u[1], u[0]) / DEG) + 90;
      const s = screwHead(p, CC.headDiameter / 2, zc[0], 0.06, { slotW: 0.14, slotD: 0.035, slotDeg: a, bev: 0.03, dome: 0.008 });
      bk.add('steel', s.head); bk.add('slot', s.floor);
    }
    bk.build(clampObj, mats, 'case-clamps');
  }

  // ================================================================ registration
  const fmt = (v, d = 2) => v.toFixed(d);
  reg.add({
    id: 'main-plate', name: 'Main plate', category: 'frame', side: 'both', exposed: true, priority: 2, xray: true,
    object: plateObj, explode: ex('main-plate'), explodeDelay: ed('main-plate'),
    anchor: [-13.9, -4.2, Z.mainPlate[0]],
    description: 'The 30 mm base plate everything is built on. The gear train, the Spring Drive electronics and the bridges sit on its back; the calendar and motion works lie in shallow pockets on its dial side, and the dial rests on its raised rim.',
    facts: { Diameter: `${fmt(2 * F.plateRadius, 1)} mm`, Thickness: `${fmt(Z.mainPlate[1] - Z.mainPlate[0])} mm (dial seat to +${fmt(Z.dialSeat)})`, 'Lower jewels': '9 + the glide wheel’s gold setting', Finish: 'Circular graining; straight graining on the exposed rim' },
  });
  reg.add({
    id: 'train-bridge', name: 'Train bridge', category: 'frame', side: 'back', exposed: false, priority: 2, xray: true,
    object: trainObj, explode: ex('train-bridge'), explodeDelay: ed('train-bridge'),
    anchor: [4.2, 3.2, zBt],
    description: 'Holds the upper pivots of the gear train and of the glide wheel. The two fast arbors — the sixth wheel and the glide wheel — run in gold Diashock shock settings mounted in it; the coils and the circuit lie underneath.',
    facts: { Carries: 'centre/4th, 3rd, 5th, 6th and glide pivots; crown-wheel core', 'Shock settings': '2 Diashock (6th, glide)', Finish: 'Fine straight graining, polished bevels' },
  });
  reg.add({
    id: 'barrel-bridge', name: 'Barrel bridge', category: 'frame', side: 'back', exposed: true, priority: 2, xray: true,
    object: barrelObj, explode: ex('barrel-bridge'), explodeDelay: ed('barrel-bridge'),
    anchor: [3.4, -9.6, zBt],
    description: 'Holds the mainspring barrel’s upper pivot. The ratchet wheel turns on a polished, turned seat on top of it and the click is screwed to it; it also carries the lower pivots of the pawl wheel and the keyless intermediate wheel.',
    facts: { Carries: 'barrel arbor, ratchet, click, pawl-wheel and keyless-intermediate pivots', Finish: 'Fine straight graining, turned ratchet seat, polished bevels' },
  });
  reg.add({
    id: 'pr-bridge', name: 'Power-reserve bridge', category: 'frame', side: 'back', exposed: true, priority: 2, xray: true,
    object: prObj, explode: ex('pr-bridge'), explodeDelay: ed('pr-bridge'),
    anchor: [-11.6, -6.2, zBt],
    description: 'A small bridge at 3–4 o’clock (seen through the back) holding the three jewelled arbors of the power-reserve differential, which compares how far the mainspring has been wound with how far it has run down.',
    facts: { Jewels: '3 (pink)', Screw: '1, polished steel', Finish: 'Fine straight graining, polished bevels' },
  });
  reg.add({
    id: 'automatic-bridge', name: 'Automatic winding bridge', category: 'frame', side: 'back', exposed: true, priority: 1, xray: true,
    object: autoObj, explode: ex('automatic-bridge'), explodeDelay: ed('automatic-bridge'),
    anchor: [-6.2, 3.1, zA0],
    description: 'The large bridge under the rotor. It holds the rotor’s ball bearing, the Magic Lever and the pawl wheel. Its broad 波目 “wave” stripes, cut with a rotating diamond, echo the Shinshu mountains around the Shiojiri studio; the rim band is engraved with the caliber and the jewel count.',
    facts: { Engraved: '9R65A · JAPAN · THIRTY JEWELS (gilt); SEIKO ○ TIME CORP. 2', Finish: `Wave stripes ${fmt(BRIDGE_STRIPES.pitch)} mm, concentric graining on the rim band, polished bevels`, Screws: '3, polished steel (no blued screws)', 'Cut-outs': 'glide notch, PR and ratchet cut-outs, two windows' },
  });
  reg.add({
    id: 'jewels', name: 'Jewels (30)', category: 'jewels', side: 'back', exposed: true, priority: 2,
    object: jewelObj, explode: ex('jewels'), explodeDelay: ed('jewels'),
    anchor: [L.keylessIntermediate[0], L.keylessIntermediate[1], zA0],
    description: 'Synthetic rubies used as low-friction, wear-free bearings. Through the back you see a dark purple one for the Magic Lever’s pawl wheel and a pink one for the keyless intermediate wheel in the automatic bridge, three in the power-reserve bridge and the two in the gold Diashocks.',
    facts: { Total: '30 (“THIRTY JEWELS”)', 'Train and glide': '12', 'Winding (barrel, pawl wheel, keyless)': '6', 'Power-reserve works': '8', Others: '4', Material: 'Synthetic corundum' },
  });
  reg.add({
    id: 'diashock', name: 'Diashock settings', category: 'jewels', side: 'back', exposed: true, priority: 2,
    object: diaObj, explode: ex('diashock'), explodeDelay: ed('diashock'),
    anchor: [L.glide[0], L.glide[1], Z.diashockTop],
    description: 'Seiko’s gold-coloured shock-absorbing jewel settings on the glide wheel and the sixth wheel. A lyre spring holds the cap jewel, so these fast, light arbors survive knocks.',
    facts: { Glide: `Ø${DIA[0].settingDiameter} mm`, Sixth: `Ø${DIA[1].settingDiameter} mm`, Spring: 'lyre (two arms)' },
  });
  reg.add({
    id: 'plate-screws', name: 'Bridge screws', category: 'screws', side: 'back', exposed: true, priority: 2,
    object: screwObj, explode: ex('plate-screws'), explodeDelay: ed('plate-screws'),
    anchor: [AB.screws[2][0], AB.screws[2][1], zBand],
    description: 'Polished steel slotted screws hold the automatic bridge on its three pillars and the power-reserve bridge to the plate. Unlike many watches, none are blued.',
    facts: { 'Automatic bridge': `3, head Ø${F.screws.automaticBridge.headDiameter} mm, sunk in the rim band`, 'PR bridge': `1, head Ø${F.screws.prBridge.headDiameter} mm`, Finish: 'Polished steel, slotted' },
  });
  reg.add({
    id: 'case-clamps', name: 'Casing clamps', category: 'case', side: 'back', exposed: false, priority: 3,
    object: clampObj, explode: ex('case-clamps'), explodeDelay: ed('case-clamps'),
    anchor: [F.screws.caseClamps.at[0][0], F.screws.caseClamps.at[0][1], Z.caseClamps[0]],
    description: 'Four small screws at the edge of the main plate with tongues that press the movement into the casing ring, holding it firmly in the case.',
    facts: { Count: '4', 'Head Ø': `${F.screws.caseClamps.headDiameter} mm` },
  });
  for (const m of tagJewels) m.userData.partId = 'jewels';
  engraving.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
}
