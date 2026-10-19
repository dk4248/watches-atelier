// FRAME of the Tudor MT5652 (builder D): main plate, automatic bridge, barrel bridge (with the
// laser-striped outer flange), train bridge, centre-wheel bridge, pallet bridge, the jewels,
// plate screws and the engravings.
//
// Every outline is a 2-D signed distance field (negative inside) in the dial-side frame (mm),
// built from SPEC.frame / SPEC.layout, so the plates are real boolean shapes (outline minus the
// balance opening, the windows, screw holes, jewel seats …). Contours come from marching
// squares; `slab` extrudes them between two SPEC levels and puts a polished 45° bevel only on the
// edges that have one on the real movement (bridge tops, flange edges, plate rim).
// Finishes (SPEC.movement.finishes): sand-blasted grey bridges and plate, polished bevels, laser
// "sun" stripes on the outer flange, polished slotted steel screws (not blued), purple jewels.
// Back-view decoration (engravings) is laid out in back-view coordinates and mirrored with
// x_dial = −x_back so it reads correctly from the case-back side.
//
// The SDF / slab / lathe / material helpers are exported for escapement.js (balance bridge).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tudorLetterRegions, mapRegions, drawRegions } from './glyphs.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const Bk = (x, y) => [-x, y]; // back-view → dial frame
// measured on the registered rotor-off photo (back view): line lengths of the 9 o'clock engraving
const TEXT_LEN = { geneva: 2.75, switzerland: 5.0 };

// ============================================================================ SDFs
const mk = (fn, bb) => { fn.bb = bb; return fn; };
const bbUnion = (bbs) => (bbs.length && bbs.every(Boolean)
  ? [Math.min(...bbs.map((b) => b[0])), Math.min(...bbs.map((b) => b[1])), Math.max(...bbs.map((b) => b[2])), Math.max(...bbs.map((b) => b[3]))] : null);
export const SD = {
  circle: (c, r) => mk((x, y) => Math.hypot(x - c[0], y - c[1]) - r, [c[0] - r, c[1] - r, c[0] + r, c[1] + r]),
  ring: (c, r0, r1) => mk((x, y) => { const d = Math.hypot(x - c[0], y - c[1]); return Math.max(d - r1, r0 - d); }, [c[0] - r1, c[1] - r1, c[0] + r1, c[1] + r1]),
  capsule: (a, b, r, rb = r) => {
    const bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by || 1e-12;
    const R = Math.max(r, rb);
    return mk((x, y) => {
      const px = x - a[0], py = y - a[1];
      const h = Math.min(1, Math.max(0, (px * bx + py * by) / l2));
      return Math.hypot(px - bx * h, py - by * h) - (r + (rb - r) * h);
    }, [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R]);
  },
  box: (cx, cy, hx, hy, ang = 0, rc = 0) => {
    const c = Math.cos(ang), s = Math.sin(ang), e = Math.hypot(hx, hy);
    return mk((x, y) => {
      const px = (x - cx) * c + (y - cy) * s, py = -(x - cx) * s + (y - cy) * c;
      const qx = Math.abs(px) - hx + rc, qy = Math.abs(py) - hy + rc;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
    }, [cx - e, cy - e, cx + e, cy + e]);
  },
  poly: (v) => mk((px, py) => {
    let d = Infinity, s = 1;
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
    const bbs = f.map((g) => g.bb || null);
    const ev = (x, y, cap = Infinity) => {
      let d = cap;
      for (let i = 0; i < f.length; i++) {
        const b = bbs[i];
        if (b) {
          const dx = Math.max(b[0] - x, x - b[2], 0), dy = Math.max(b[1] - y, y - b[3], 0);
          if (dx * dx + dy * dy >= d * d && (dx >= 0 && dy >= 0) && d > 0) continue;
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
    return mk((x, y) => { let d = -Infinity; for (const g of f) { const e = g(x, y); if (e > d) d = e; } return d; }, bb);
  },
  sub: (a, ...b) => {
    if (!b.length) return a;
    const u = b.length === 1 ? b[0] : SD.union(...b);
    return mk((x, y) => Math.max(a(x, y), -u(x, y)), a.bb);
  },
  grow: (f, d) => mk((x, y) => f(x, y) - d, f.bb ? [f.bb[0] - d, f.bb[1] - d, f.bb[2] + d, f.bb[3] + d] : null),
  not: (f) => mk((x, y) => -f(x, y), null),
};

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
// marching squares → closed loops, inside on the left (outer CCW, holes CW)
function marching(v, nx, ny, x0, y0, h) {
  const N = nx * ny;
  const next = new Int32Array(2 * N).fill(-1);
  const has = new Uint8Array(2 * N);
  const px = new Float64Array(2 * N), py = new Float64Array(2 * N);
  const cross = (e) => {
    if (has[e]) return;
    has[e] = 1;
    if (e < N) { const j = (e / nx) | 0, i = e - j * nx, a = v[e], b = v[e + 1]; px[e] = x0 + (i + a / (a - b)) * h; py[e] = y0 + j * h; } else { const k = e - N, j = (k / nx) | 0, i = k - j * nx, a = v[k], b = v[k + nx]; px[e] = x0 + i * h; py[e] = y0 + (j + a / (a - b)) * h; }
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
  const seen = new Uint8Array(2 * N);
  for (let e = 0; e < 2 * N; e++) {
    if (next[e] < 0 || seen[e]) continue;
    const loop = [];
    let k = e;
    while (k >= 0 && !seen[k]) {
      seen[k] = 1;
      const p = [px[k], py[k]], l = loop[loop.length - 1];
      if (!l || Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) > 1e-6) loop.push(p);
      k = next[k];
    }
    if (k === e && loop.length > 2) loops.push(loop);
  }
  return loops;
}
function dpSimplify(pts, tol) {
  const n = pts.length;
  if (n < 8) return pts;
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const keep = new Uint8Array(n);
  keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const A = pts[a], C = pts[b % n];
    const dx = C[0] - A[0], dy = C[1] - A[1], L = Math.hypot(dx, dy) || 1e-12;
    let md = -1, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - A[0]) * dy - (pts[i][1] - A[1]) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const loopArea = (l) => { let a = 0; for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += (l[j][0] - l[i][0]) * (l[j][1] + l[i][1]); return a / 2; };
const inPoly = (p, l) => {
  let c = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) if ((l[i][1] > p[1]) !== (l[j][1] > p[1]) && p[0] < ((l[j][0] - l[i][0]) * (p[1] - l[i][1])) / (l[j][1] - l[i][1]) + l[i][0]) c = !c;
  return c;
};
// SDF region → [{ outer, holes }]
export function regionShapes(f, box, h = 0.03, tol = 0.002) {
  const x0 = box[0] - 3 * h, y0 = box[1] - 3 * h;
  const nx = Math.ceil((box[2] - box[0]) / h) + 7, ny = Math.ceil((box[3] - box[1]) / h) + 7;
  const v = sampleGrid(f, x0, y0, nx, ny, h);
  for (let i = 0; i < nx; i++) { v[i] = Math.max(v[i], h); v[(ny - 1) * nx + i] = Math.max(v[(ny - 1) * nx + i], h); }
  for (let j = 0; j < ny; j++) { v[j * nx] = Math.max(v[j * nx], h); v[j * nx + nx - 1] = Math.max(v[j * nx + nx - 1], h); }
  const loops = marching(v, nx, ny, x0, y0, h).map((l) => dpSimplify(l, tol)).filter((l) => l.length >= 3 && Math.abs(loopArea(l)) > 1e-4);
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
function makeGeo(pos, nrm) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(pos);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nrm), 3));
  const uv = new Float32Array((p.length / 3) * 2);
  for (let i = 0, k = 0; i < p.length; i += 3, k += 2) { uv[k] = p[i]; uv[k + 1] = p[i + 1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}
// push a triangle with per-vertex normals, wound so its face points along `want`
function tri(P, N, a, b, c, na, nb, nc, want) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
  if (fx * want[0] + fy * want[1] + fz * want[2] < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
  P.push(...a, ...b, ...c);
  N.push(...na, ...nb, ...nc);
}

// Extrude an SDF region between z0 (the −Z face, towards the case back) and z1 (+Z face).
// opt.top / opt.bottom: bevel size (number or (x, y) => size) on the z0 / z1 edges (45°).
// Returns { caps, walls } (walls include the bevels): two geometries, usually two materials.
export function slab(f, box, z0, z1, opt = {}) {
  const shapes = opt.shapes || regionShapes(f, box, opt.h ?? 0.03, opt.tol ?? 0.002);
  const fT = typeof opt.top === 'function' ? opt.top : () => opt.top || 0;
  const fB = typeof opt.bottom === 'function' ? opt.bottom : () => opt.bottom || 0;
  const T = z1 - z0;
  const capP = [], capN = [], wallP = [], wallN = [];
  const e = 0.004;
  const grad = (x, y) => {
    const gx = f(x + e, y) - f(x - e, y), gy = f(x, y + e) - f(x, y - e), l = Math.hypot(gx, gy) || 1;
    return [gx / l, gy / l];
  };
  const inset = (c, sz) => {
    const n = c.length, S = new Float64Array(n), Q = new Array(n), Nn = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = c[i];
      const nn = grad(p[0], p[1]);
      Nn[i] = nn;
      let s = Math.min(sz(p[0], p[1]), T * 0.45);
      for (let k = 0; k < 4 && s > 0; k++) {
        const q = [p[0] - nn[0] * s, p[1] - nn[1] * s];
        if (f(q[0], q[1]) < -0.6 * s) break;
        s *= 0.5;
        if (s < 0.004) s = 0;
      }
      S[i] = s;
      Q[i] = [p[0] - nn[0] * s, p[1] - nn[1] * s];
    }
    for (let pass = 0; pass < 6; pass++) { // collapse inverted inset edges
      let changed = false;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ox = c[j][0] - c[i][0], oy = c[j][1] - c[i][1], qx = Q[j][0] - Q[i][0], qy = Q[j][1] - Q[i][1];
        if (ox * qx + oy * qy < 0) { const m = [(Q[i][0] + Q[j][0]) / 2, (Q[i][1] + Q[j][1]) / 2]; Q[i] = m; Q[j] = [m[0], m[1]]; changed = true; }
      }
      if (!changed) break;
    }
    return { S, Q, Nn };
  };
  const cap = (contours, z, facing) => {
    const vs = contours.map((c) => c.map((p) => new THREE.Vector2(p[0], p[1])));
    const faces = THREE.ShapeUtils.triangulateShape(vs[0], vs.slice(1));
    const all = vs.flat();
    const nn = [0, 0, facing], want = [0, 0, facing];
    for (const [a, b, c] of faces) tri(capP, capN, [all[a].x, all[a].y, z], [all[b].x, all[b].y, z], [all[c].x, all[c].y, z], nn, nn, nn, want);
  };
  for (const sh of shapes) {
    const cs = [sh.outer, ...sh.holes];
    const iT = cs.map((c) => inset(c, fT)), iB = cs.map((c) => inset(c, fB));
    if (opt.capTop !== false) cap(iT.map((o) => o.Q), z0, -1);
    if (opt.capBottom !== false) cap(iB.map((o) => o.Q), z1, 1);
    cs.forEach((c, k) => {
      const t = iT[k], b = iB[k], n = c.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, p = c[i], q = c[j];
        const ni = t.Nn[i], nj = t.Nn[j];
        const wi = [ni[0], ni[1], 0], wj = [nj[0], nj[1], 0];
        const wm = [(ni[0] + nj[0]) / 2, (ni[1] + nj[1]) / 2, 0];
        const ta = z0 + t.S[i], tb = z0 + t.S[j], ba = z1 - b.S[i], bb = z1 - b.S[j];
        tri(wallP, wallN, [p[0], p[1], ta], [q[0], q[1], tb], [q[0], q[1], bb], wi, wj, wj, wm);
        tri(wallP, wallN, [p[0], p[1], ta], [q[0], q[1], bb], [p[0], p[1], ba], wi, wj, wi, wm);
        if (t.S[i] > 0 || t.S[j] > 0) {
          const ci = [ni[0] * 0.7071, ni[1] * 0.7071, -0.7071], cj = [nj[0] * 0.7071, nj[1] * 0.7071, -0.7071];
          const want = [wm[0], wm[1], -0.7];
          const Ti = t.Q[i], Tj = t.Q[j];
          tri(wallP, wallN, [Ti[0], Ti[1], z0], [Tj[0], Tj[1], z0], [q[0], q[1], tb], ci, cj, cj, want);
          tri(wallP, wallN, [Ti[0], Ti[1], z0], [q[0], q[1], tb], [p[0], p[1], ta], ci, cj, ci, want);
        }
        if (b.S[i] > 0 || b.S[j] > 0) {
          const ci = [ni[0] * 0.7071, ni[1] * 0.7071, 0.7071], cj = [nj[0] * 0.7071, nj[1] * 0.7071, 0.7071];
          const want = [wm[0], wm[1], 0.7];
          const Bi = b.Q[i], Bj = b.Q[j];
          tri(wallP, wallN, [p[0], p[1], ba], [q[0], q[1], bb], [Bj[0], Bj[1], z1], ci, cj, cj, want);
          tri(wallP, wallN, [p[0], p[1], ba], [Bj[0], Bj[1], z1], [Bi[0], Bi[1], z1], ci, cj, ci, want);
        }
      }
    });
  }
  return { caps: capP.length ? makeGeo(capP, capN) : null, walls: wallP.length ? makeGeo(wallP, wallN) : null };
}

// Surface of revolution about Z at (cx, cy); parts: polylines [[r, z], …] (creased between parts).
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
export const merge = (list) => {
  const l = list.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of l) { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); }
  return l.length ? mergeGeometries(l) : null;
};
// planar UVs in mm × scale (sand-blast grain)
export function mmUV(g, s = 0.8, off = [0, 0]) {
  if (!g) return g;
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * s + off[0], p.getY(i) * s + off[1]);
  uv.needsUpdate = true;
  return g;
}

// Hole jewel set in a face at zFace; the part extends from the face towards dir (+1: +Z).
// Returns { metal (polished sink, bore, closing ring), ruby, hole (dark disc) }.
export function jewelSeat(c, { rs, rj, rh, zFace, zBack, dir = 1, depth = 0.08, t = 0.16 }) {
  const zj = zFace + dir * depth, zjb = zj + dir * t, rb = Math.max(rh + 0.06, 0.12);
  // profiles walk so that the normal (dz, −dr) faces the viewer (dir = +1 only)
  const metal = lathe([
    [[rj + 0.01, zj], [rs, zFace]], [[rj, zj], [rj + 0.01, zj]], [[rb, zBack], [rb, zjb]], [[rs, zBack], [rb, zBack]],
  ], 40, c[0], c[1]);
  // ruby olive: oil cup on its visible face
  const cupR = rj * 0.56, cupD = Math.min(0.05, t * 0.3), ch = Math.min(0.025, rj * 0.06);
  const cup = [];
  for (let i = 0; i <= 8; i++) { const s = i / 8; cup.push([rh + (cupR - rh) * s, cupD * (1 - s * s)]); }
  const parts = [cup, [[cupR, 0], [rj - ch, 0]], [[rj - ch, 0], [rj, ch]], [[rj, ch], [rj, t]], [[rj, t], [rh, t]], [[rh, t], [rh, cupD]]]
    .map((p) => { const q = p.map(([r, z]) => [r, zj + dir * z]); return dir > 0 ? q : q.reverse(); });
  const ruby = lathe(parts, 40, c[0], c[1]);
  const hole = new THREE.CircleGeometry(rh * 1.02, 20);
  if (dir > 0) hole.rotateX(Math.PI);
  hole.translate(c[0], c[1], zj + dir * (cupD + 0.004));
  return { metal, ruby, hole: hole.toNonIndexed() };
}

// Slotted screw head (polished), flush or proud: top face at zTop (facing −Z), height h.
// Returns { head, slot } geometries already placed at c.
export function screwGeometry(c, r, zTop, h, { slotDeg = 0, slotW = 0.14, slotD = 0.1, bev = 0.05, shankR = 0.3, shankTo = null } = {}) {
  const a = slotDeg * DEG;
  const slotF = SD.box(0, 0, r + 0.2, slotW / 2, a);
  const f = SD.sub(SD.circle([0, 0], r), slotF);
  const s = slab(f, [-r - 0.05, -r - 0.05, r + 0.05, r + 0.05], zTop, zTop + slotD, {
    h: Math.min(0.012, r / 30), tol: 0.0008, top: (x, y) => (Math.hypot(x, y) > r - 0.01 ? bev : 0), capBottom: false,
  });
  const list = [s.caps, s.walls, lathe([[[r, zTop + slotD], [r, zTop + h]]], 40)];
  if (shankTo != null && Math.abs(shankTo - (zTop + h)) > 0.05) {
    const zs = zTop + h, thread = [[shankR, zs]];
    for (let z = zs + 0.03, k = 0; z < shankTo - 0.03; z += 0.03, k++) thread.push([k % 2 ? shankR : shankR * 0.84, z]);
    thread.push([shankR * 0.8, shankTo]);
    list.push(lathe([[[r, zs], [shankR, zs]], thread, [[shankR * 0.8, shankTo], [0, shankTo]]], 20));
  }
  const head = merge(list);
  head.translate(c[0], c[1], 0);
  const slot = lathe([[[0, zTop + slotD], [r - 0.02, zTop + slotD]]], 40, c[0], c[1]);
  return { head, slot };
}

// ============================================================ materials (shared with escapement.js)
const MAT_CACHE = new WeakMap();
function stripeTexture() {
  // one 30° sector of laser "sun" stripes in (angle, radius) space: fans of fine lines
  // whose tilt sweeps across the sector (the laser-decorated flange of the MT5652)
  if (typeof document === 'undefined') return null;
  const W = 1024, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const img = g.createImageData(W, H);
  const r0 = 14.1, r1 = 15.9, sect = 30 * DEG, spacing = 0.105;
  for (let y = 0; y < H; y++) {
    const r = r0 + ((y + 0.5) / H) * (r1 - r0);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W; // 0..1 across the sector
      const th = u * sect;
      const tilt = Math.tan((-38 + 76 * ((u * 2) % 1)) * DEG); // two fans per sector
      const ph = (th * 15.0 + tilt * (r - 15.0)) / spacing;
      const fr = ph - Math.floor(ph);
      const line = Math.exp(-((fr - 0.5) ** 2) / 0.02);
      const v = 0.86 - 0.3 * line + 0.04 * Math.sin(u * 40);
      const o = (y * W + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.max(0, Math.min(255, v * 255));
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  return t;
}
// polar UVs computed per fragment (no seams, no interpolation error across long cap triangles)
function polarMap(mat, sectors, r0, r1) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec2 vPolarXY;\nvoid main() {\n vPolarXY = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec2 vPolarXY;\nvoid main() {').replace('#include <map_fragment>', `
      float thP = atan(vPolarXY.y, vPolarXY.x);
      float rrP = length(vPolarXY);
      vec2 puv = vec2(thP / 6.2831853 * ${sectors.toFixed(1)}, (rrP - ${r0.toFixed(3)}) / ${(r1 - r0).toFixed(3)});
      vec2 dx = dFdx(puv), dy = dFdy(puv);
      dx.x -= ${sectors.toFixed(1)} * floor(dx.x / ${sectors.toFixed(1)} + 0.5);
      dy.x -= ${sectors.toFixed(1)} * floor(dy.x / ${sectors.toFixed(1)} + 0.5);
      vec4 sampledDiffuseColor = textureGrad(map, puv, dx, dy);
      diffuseColor *= sampledDiffuseColor;`);
  };
  mat.customProgramCacheKey = () => `polar${sectors}`;
  const base = mat.clone.bind(mat);
  mat.clone = function () { const m = base(); m.onBeforeCompile = mat.onBeforeCompile; m.customProgramCacheKey = mat.customProgramCacheKey; m.clone = mat.clone; return m; };
  return mat;
}
export function frameMaterials(ctx) {
  const { M, spec } = ctx;
  if (MAT_CACHE.has(M)) return MAT_CACHE.get(M);
  const fin = spec.movement.finishes;
  const grain = M.textures?.dialGrain;
  const blast = (hex, rough = 0.52) => {
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), metalness: 1, roughness: rough, envMapIntensity: 0.5 });
    if (grain) { m.normalMap = grain.normalMap; m.normalScale = new THREE.Vector2(0.32, 0.32); m.roughnessMap = grain.roughnessMap; }
    return m;
  };
  const mats = {
    bridge: blast(fin.bridges.colour, 0.5),
    plate: blast(fin.mainPlate.colour, 0.55),
    bevel: (() => { const m = M.rhodiumBevel.clone(); m.color.set(fin.bridges.bevels); m.roughness = 0.11; return m; })(),
    flange: (() => {
      const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(fin.bridges.colour), metalness: 1, roughness: 0.3, envMapIntensity: 0.8 });
      const t = stripeTexture();
      if (t) { m.map = t; polarMap(m, 12, 14.1, 15.9); }
      return m;
    })(),
    polished: (() => { const m = M.steelPolished.clone(); m.color.set(0xdadcdf); return m; })(),
    screw: (() => { const m = M.steelPolished.clone(); m.color.set(fin.screws.colour); m.roughness = 0.17; return m; })(),
    slot: (() => { const m = M.steelDark.clone(); m.color.set(0x4b4f55); m.roughness = 0.5; return m; })(),
    strap: (() => { const m = M.steelSatin.clone(); m.color.set(0xc8cbce); return m; })(),
    jewel: (() => {
      const m = M.ruby.clone();
      m.color.set(fin.jewels.colour);
      m.attenuationColor = new THREE.Color(0x5a1f52);
      m.emissive = new THREE.Color(0x1c0618);
      m.transmission = 0.35;
      return m;
    })(),
    hole: new THREE.MeshStandardMaterial({ color: 0x1a1216, roughness: 0.6, metalness: 0.1 }),
  };
  MAT_CACHE.set(M, mats);
  return mats;
}

// ============================================================ engraving decals
function engraveTextures(wPx, hPx, draw, { blur = 2, fillHex = '#55595f' } = {}) {
  const cv = document.createElement('canvas');
  cv.width = wPx; cv.height = hPx;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, wPx, hPx);
  c.fillStyle = '#fff'; c.strokeStyle = '#fff';
  draw(c);
  const src = c.getImageData(0, 0, wPx, hPx).data;
  const n = wPx * hPx, a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = src[i * 4] / 255;
  // blurred coverage → groove height for the normal map
  const b = Float32Array.from(a), tmp = new Float32Array(n);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < hPx; y++) for (let x = 0; x < wPx; x++) { let s = 0, k = 0; for (let d = -blur; d <= blur; d++) { const xx = x + d; if (xx >= 0 && xx < wPx) { s += b[y * wPx + xx]; k++; } } tmp[y * wPx + x] = s / k; }
    for (let y = 0; y < hPx; y++) for (let x = 0; x < wPx; x++) { let s = 0, k = 0; for (let d = -blur; d <= blur; d++) { const yy = y + d; if (yy >= 0 && yy < hPx) { s += tmp[yy * wPx + x]; k++; } } b[y * wPx + x] = s / k; }
  }
  const mkC = () => { const k = document.createElement('canvas'); k.width = wPx; k.height = hPx; return k; };
  const cm = mkC(), ca = mkC(), cn = mkC();
  const im = cm.getContext('2d').createImageData(wPx, hPx), ia = ca.getContext('2d').createImageData(wPx, hPx), inn = cn.getContext('2d').createImageData(wPx, hPx);
  const fc = new THREE.Color(fillHex);
  for (let y = 0; y < hPx; y++) {
    for (let x = 0; x < wPx; x++) {
      const i = y * wPx + x, o = i * 4;
      const edge = Math.min(1, Math.max(0, (b[i] - 0.15) / 0.7));
      const shade = 0.55 + 0.45 * edge; // lighter rim (the cut wall) → dark filled floor
      im.data[o] = fc.r * 255 / shade * 0.9 + (1 - edge) * 60; im.data[o + 1] = fc.g * 255 / shade * 0.9 + (1 - edge) * 60; im.data[o + 2] = fc.b * 255 / shade * 0.9 + (1 - edge) * 62; im.data[o + 3] = 255;
      const al = Math.min(1, a[i] * 1.2 + b[i] * 0.25) * 255;
      ia.data[o] = ia.data[o + 1] = ia.data[o + 2] = al; ia.data[o + 3] = 255;
      const xl = x > 0 ? i - 1 : i, xr = x < wPx - 1 ? i + 1 : i, yu = y > 0 ? i - wPx : i, yd = y < hPx - 1 ? i + wPx : i;
      const nx = (b[xr] - b[xl]) * 2.5, ny = -(b[yd] - b[yu]) * 2.5, l = Math.hypot(nx, ny, 1);
      inn.data[o] = (nx / l * 0.5 + 0.5) * 255; inn.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; inn.data[o + 2] = (0.5 / l + 0.5) * 255; inn.data[o + 3] = 255;
    }
  }
  cm.getContext('2d').putImageData(im, 0, 0); ca.getContext('2d').putImageData(ia, 0, 0); cn.getContext('2d').putImageData(inn, 0, 0);
  const tex = (k, srgb) => { const t = new THREE.CanvasTexture(k); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  return { map: tex(cm, true), alphaMap: tex(ca, false), normalMap: tex(cn, false) };
}
// grid mesh facing −Z; toBack(u, v) → back-view [x, y] (u along the reading direction, v up the letters)
function decalGeometry(toBack, nu, nv, z) {
  return gridGeometry((u, v) => { const [xb, yb] = toBack(u, v); return [-xb, yb]; }, nu, nv, z, -1);
}
// grid mesh in the dial frame: fn(u, v) → [x, y]; facing −1 (seen from the back) or +1 (dial side)
function gridGeometry(fn, nu, nv, z, facing) {
  const pos = [], uv = [], nrm = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu, v = j / nv, [x, y] = fn(u, v); pos.push(x, y, z); uv.push(u, v); nrm.push(0, 0, facing); }
  const P = (k) => [pos[3 * k], pos[3 * k + 1]];
  const a0 = P(0), b0 = P(1), c0 = P(nu + 2);
  const cz = (b0[0] - a0[0]) * (c0[1] - a0[1]) - (b0[1] - a0[1]) * (c0[0] - a0[0]);
  const flip = (cz > 0) !== (facing > 0);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 2, d = a + nu + 1;
    if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function engraveMaterial(tex, base) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.4, roughness: 0.62, map: tex.map, alphaMap: tex.alphaMap, normalMap: tex.normalMap,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
  m.normalScale = new THREE.Vector2(1, 1);
  void base;
  return m;
}

// ============================================================================ build
export function buildFrame(ctx) {
  const { spec, reg, root } = ctx;
  const F = spec.frame, L = spec.layout, Z = spec.z, MV = spec.movement, MD = spec.modules, TR = spec.train, KW = spec.keyless;
  const mat = frameMaterials(ctx);
  const R = F.plateRadius;
  const BOX = [-R - 0.1, -R - 0.1, R + 0.1, R + 0.1];
  const BEV = 0.07; // polished bevel on the bridge tops (≈0.1 wide in the photos)
  const wheelTip = (z, m) => m * (z / 2 + 1.3), pinionTip = (z, m) => m * (z / 2 + 0.9);
  const hasDoc = typeof document !== 'undefined';

  // bucket of geometries per material → one merged mesh per material per object
  const bucket = () => {
    const m = new Map();
    return {
      add(key, g) { if (!g) return; if (!m.has(key)) m.set(key, []); m.get(key).push(g); },
      build(parent, name) {
        for (const [key, list] of m) {
          const g = merge(list);
          if (!g) continue;
          const mesh = new THREE.Mesh(g, mat[key]);
          mesh.name = `${name}-${key}`;
          parent.add(mesh);
        }
      },
    };
  };
  const put = (bk, s, capKey, wallKey, uv = (g) => mmUV(g)) => { if (s.caps) bk.add(capKey, uv(s.caps)); if (s.walls) bk.add(wallKey, s.walls); };
  const group = (name) => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };

  // ---------------------------------------------------------------- shared features
  const screws = F.screws.map((s, i) => ({ ...s, i }));
  const screwHole = (s) => SD.circle(s.at, F.screwHeadRadius + 0.03);
  const holesIn = (part) => screws.filter((s) => s.in === part).map(screwHole);
  const allHoles = screws.map(screwHole);
  const balOpen = SD.circle(F.balanceOpening.center, F.balanceOpening.radius);
  const balBridge = SD.poly(F.balanceBridge.outline);
  const disc = SD.circle([0, 0], R);
  const groove = (band) => SD.ring([0, 0], band[0] - 0.06, band[0] + 0.06); // the line between body and text band
  const zGroove = 0.08;
  // slotted screws: one geometry list per part
  const slotDeg = [64, 18, -40, 72, 0, 0, 25, -12, 50, 80, 33];

  // ================================================================ MAIN PLATE
  const plateObj = group('main-plate');
  const jewelObj = new THREE.Group(); jewelObj.name = 'jewels'; plateObj.add(jewelObj);
  const engrObj = new THREE.Group(); engrObj.name = 'plate-engravings'; plateObj.add(engrObj);
  const mA = MD.motionA;
  const recDial = SD.union(
    SD.circle(L.center, pinionTip(TR.cannon.teeth, mA) + 0.25),
    SD.circle(L.minuteWheel, wheelTip(TR.minuteWheel.teeth, mA) + 0.2),
    SD.circle(L.settingWheel, wheelTip(KW.settingWheel.teeth, mA) + 0.2),
  );
  // dial-side recess (z.motionRecess … 0) for the keyless levers and springs, the position-C wheels
  // and the stop-seconds lever — the region builder C's dialworks occupy (x 3.4–13.4, y −7.8…5.2)
  const leverRec = SD.inter(SD.union(SD.box(8.4, -1.3, 5.0, 6.5, 0, 0.8),
    SD.circle(L.hourSettingWheel, 1.12 + 0.12), SD.circle(L.settingIntermediate, 1.12 + 0.12)), SD.circle([0, 0], 15.1));
  const stemCh = SD.box((KW.stemInnerX - 0.3 + 16.5) / 2, KW.stemY, (16.5 - (KW.stemInnerX - 0.3)) / 2, 0.95);
  const barrelPocket = SD.circle(L.barrel, wheelTip(TR.barrel.teeth, MD.barrel) + 0.15);
  const centreHole = SD.circle(L.center, 0.45);
  // through-holes: the stop-seconds finger (r 0.12, reaches the balance rim from the dial side) and
  // the winding-intermediate arbor (builder C's dialworks / train)
  const hackWin = SD.union(SD.circle([6.123, -5.497], 0.18), SD.circle(L.windingIntermediate, 0.24));
  const plateJewels = [
    { id: 'centre', c: L.center, rs: 0.78, rj: 0.66, rh: 0.46 },
    { id: 'third', c: L.third, rs: 0.6, rj: 0.46, rh: 0.08 },
    { id: 'escape', c: L.escape, rs: 0.56, rj: 0.42, rh: 0.06 },
    { id: 'pallet', c: L.pallet, rs: 0.52, rj: 0.38, rh: 0.05 },
    { id: 'balance', c: L.balance, rs: 0.72, rj: 0.5, rh: 0.05 },
  ];
  {
    const bk = bucket();
    const zB = Z.mainPlate[0], zD = Z.mainPlate[1], zF = Z.barrelPocketFloor, zR = Z.motionRecess;
    const seats = SD.union(...plateJewels.map((j) => SD.circle(j.c, j.rs)));
    const onRim = (x, y) => Math.hypot(x, y) > R - 0.02;
    // back layer: pocket, stem channel, centre hole, jewel seats, hacking window cut
    put(bk, slab(SD.sub(disc, barrelPocket, stemCh, centreHole, seats, hackWin), BOX, zB, zF, {
      top: (x, y) => (onRim(x, y) ? 0.08 : seats(x, y) > 0.02 && barrelPocket(x, y) > -0.02 && barrelPocket(x, y) < 0.03 ? 0.05 : 0),
    }), 'plate', 'bevel');
    // dial layer: motion-work and keyless recesses, stem channel
    put(bk, slab(SD.sub(disc, recDial, leverRec, stemCh, centreHole, hackWin), BOX, zF, zD, { bottom: (x, y) => (onRim(x, y) ? 0.08 : 0) }), 'plate', 'bevel');
    // recess floors on the dial side come from the back layer's bottom cap (z = zF ≥ zR):
    // deepen them to z.motionRecess with a thin floor ring where the back layer is cut
    if (zR !== zF) put(bk, slab(SD.inter(SD.union(recDial, leverRec), SD.sub(disc, barrelPocket, stemCh, centreHole)), BOX, zR, zF, { capBottom: false }), 'plate', 'bevel');
    const rubies = [], holes = [];
    for (const j of plateJewels) {
      const s = jewelSeat(j.c, { rs: j.rs, rj: j.rj, rh: j.rh, zFace: zB, zBack: zF, dir: 1, depth: 0.07, t: 0.18 });
      bk.add('bevel', s.metal); rubies.push(s.ruby); holes.push(s.hole);
    }
    // barrel-arbor jewel on the pocket floor (the arbor turns only when winding)
    {
      const s = jewelSeat(L.barrel, { rs: 0.82, rj: 0.62, rh: 0.36, zFace: zF, zBack: zD, dir: 1, depth: 0.05, t: 0.18 });
      rubies.push(s.ruby); holes.push(s.hole);
      bk.add('plate', lathe([[[0.82, zF - 0.001], [1.0, zF - 0.001]]], 48, L.barrel[0], L.barrel[1]));
      bk.add('bevel', s.metal);
    }
    bk.build(plateObj, 'main-plate');
    jewelObj.add(new THREE.Mesh(merge(rubies), mat.jewel), new THREE.Mesh(merge(holes), mat.hole));
    // the plate's own marking, dial side at 9 o'clock (calibre number; wording/position ESTIMATE)
    if (hasDoc) {
      const cap = 0.6, w = 4.0, h = 1.0, PX = 140;
      const tex = engraveTextures(Math.round(w * PX), Math.round(h * PX), (c) => {
        c.font = `500 ${Math.round(cap * PX * 1.38)}px Jost, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.save(); c.scale(0.86, 1); c.fillText('MT5652', (w * PX / 2) / 0.86, h * PX / 2 + 2); c.restore();
      }, { fillHex: '#3a3c40' });
      // dial side (faces +Z), reading from the dial side along the rim at 9 o'clock, tops outward
      const g = gridGeometry((u, v) => { const th = (180 + 8 - 16 * u) * DEG, r = 12.9 + v * 1.0; return [r * Math.cos(th), r * Math.sin(th)]; }, 24, 1, zD + 0.003, 1);
      const m = engraveMaterial(tex);
      const mesh = new THREE.Mesh(g, m); mesh.name = 'plate-engraving'; mesh.castShadow = false; mesh.renderOrder = 2;
      engrObj.add(mesh);
    }
  }

  // ================================================================ BARREL BRIDGE + FLANGE
  const barrelObj = group('barrel-bridge');
  {
    const bk = bucket();
    const BB = F.barrelBridge;
    const body = SD.sub(SD.union(SD.poly(BB.outline), ...BB.plus.map((c) => SD.circle(c.center, c.radius))),
      ...BB.minus.map((c) => SD.circle(c.center, c.radius)), balOpen, ...allHoles,
      SD.circle(L.barrel, 0.62), SD.circle(L.crownWheel, 0.32), SD.circle(L.windingIntermediate, 0.24), SD.circle(L.click, 0.2));
    const bodyR = SD.inter(body, SD.circle([0, 0], F.flange.rInner + 0.02));
    put(bk, slab(bodyR, BOX, Z.barrelBridge[0], Z.barrelBridge[1], { top: 0.05 }), 'bridge', 'bevel');
    // the flange: laser-striped rim r 14.1–15.9 round the movement except at the balance opening and
    // the balance-bridge feet; undercut over the barrel's teeth
    const FL = F.flange;
    const ringF = SD.sub(SD.ring([0, 0], FL.rInner, FL.rOuter), balOpen, balBridge, ...allHoles);
    const under = SD.circle(FL.undercut.center, FL.undercut.radius);
    const edgeBev = (x, y) => { const r = Math.hypot(x, y); return Math.abs(r - FL.rInner) < 0.02 || Math.abs(r - FL.rOuter) < 0.02 ? 0.06 : 0.03; };
    const s1 = slab(ringF, BOX, Z.flange[0], Z.barrelBridge[1], { top: edgeBev, capBottom: false, h: 0.025 });
    if (s1.caps) bk.add('flange', s1.caps);
    if (s1.walls) bk.add('bevel', s1.walls);
    put(bk, slab(SD.sub(ringF, under), BOX, Z.barrelBridge[1], Z.flange[1], { capTop: false, h: 0.025 }), 'bridge', 'bridge');
    put(bk, slab(SD.inter(ringF, under), BOX, Z.barrelBridge[1] - 0.001, Z.barrelBridge[1], { capTop: false, h: 0.025 }), 'bridge', 'bridge');
    bk.build(barrelObj, 'barrel-bridge');
  }

  // ================================================================ TRAIN BRIDGE
  const trainObj = group('train-bridge');
  const TB = F.trainBridge;
  const trainJ = [
    { id: 'fourth', c: L.fourth, rs: 0.62, rj: 0.48, rh: 0.12 },
    { id: 'third', c: L.third, rs: 0.6, rj: 0.46, rh: 0.08 },
    { id: 'escape', c: L.escape, rs: 0.56, rj: 0.42, rh: 0.06 },
  ];
  // SPEC-REQUEST: screw 9 (back view (11.0, 6.2)) lies just outside both traced outlines (the
  // "junction"); a lobe of the train bridge carries it here.
  const lobe9 = SD.circle(screws[8].at, 1.0);
  const trainF = SD.sub(SD.union(SD.poly(TB.outline), ...TB.lobes.map((l) => SD.circle(l.center, l.radius)), SD.sub(lobe9, SD.poly(F.automaticBridge.outline))),
    balOpen, balBridge, ...TB.windows.map((w) => SD.poly(w)), ...allHoles);
  {
    const bk = bucket();
    const z0 = Z.trainBridge[0], z1 = Z.trainBridge[1];
    const seats = SD.union(...trainJ.map((j) => SD.circle(j.c, j.rs)));
    const g = groove(TB.textBand);
    const isSeat = (x, y) => seats(x, y) < 0.03;
    put(bk, slab(SD.sub(trainF, seats, g), BOX, z0, z1, { top: (x, y) => (isSeat(x, y) || Math.abs(g(x, y)) < 0.02 ? 0 : BEV) }), 'bridge', 'bevel');
    put(bk, slab(SD.sub(SD.inter(trainF, g), seats), BOX, z0 + zGroove, z1, { capBottom: false, h: 0.02 }), 'bridge', 'bridge');
    const rubies = [], holes = [];
    for (const j of trainJ) { const s = jewelSeat(j.c, { rs: j.rs, rj: j.rj, rh: j.rh, zFace: z0, zBack: z1, dir: 1 }); bk.add('bevel', s.metal); rubies.push(s.ruby); holes.push(s.hole); }
    bk.build(trainObj, 'train-bridge');
    trainObj.add(new THREE.Mesh(merge(rubies), mat.jewel), new THREE.Mesh(merge(holes), mat.hole));
    // "MT5652 TWENTY-EIGHT 28 JEWELS" on the band, tops outward, reading clockwise from the back
    if (hasDoc) {
      const E = F.engravings.trainBridge, cap = E.capHeight, rc = E.arcRadius;
      const a0 = E.startDegBack * DEG, a1 = E.endDegBack * DEG; // back-view angles (CCW), a0 > a1
      const pad = 1.2 * DEG, th0 = a0 + pad, th1 = a1 - pad;
      const ra = rc - cap / 2 - 0.18, rb = rc + cap / 2 + 0.18;
      const PX = 150, wPx = Math.round((th0 - th1) * rc * PX), hPx = Math.round((rb - ra) * PX);
      const str = E.text;
      const tex = engraveTextures(wPx, hPx, (c) => {
        const fs = cap * PX * 1.38;
        c.font = `500 ${fs}px Jost, sans-serif`;
        c.textBaseline = 'alphabetic';
        const natural = c.measureText(str).width;
        const want = (a0 - a1) * rc * PX;
        c.save();
        c.translate(pad * rc * PX, (rb - (rc - cap / 2)) * PX);
        c.scale(want / natural, 1);
        c.fillText(str, 0, 0);
        c.restore();
      });
      const toBack = (u, v) => { const th = th0 + (th1 - th0) * u, r = ra + (rb - ra) * v; return [r * Math.cos(th), r * Math.sin(th)]; };
      const mesh = new THREE.Mesh(decalGeometry(toBack, 64, 2, z0 - 0.002), engraveMaterial(tex));
      mesh.name = 'train-bridge-engraving'; mesh.castShadow = false; mesh.renderOrder = 2;
      trainObj.add(mesh);
    }
  }

  // ================================================================ AUTOMATIC BRIDGE
  const autoObj = group('automatic-bridge');
  const AB = F.automaticBridge;
  const autoJ = [L.reverserA, L.reverserB, L.reductionWheel, L.autoAux].map((c) => ({ c, rs: 0.55, rj: 0.42, rh: 0.07 }));
  {
    const bk = bucket();
    const z0 = Z.automaticBridge[0], z1 = Z.automaticBridge[1], zs = Z.automaticBridgeSink;
    const outline = SD.sub(SD.poly(AB.outline), ...holesIn('automaticBridge'), ...screws.filter((s) => s.in !== 'automaticBridge').map(screwHole));
    const seats = SD.union(...autoJ.map((j) => SD.circle(j.c, j.rs)));
    const sinks = SD.union(...AB.sinks.map((s) => SD.circle(s.center, s.radius)));
    const g = groove(AB.textBand);
    const isSeat = (x, y) => seats(x, y) < 0.03;
    // upper layer (top face, groove, seats) down to the sink level; lower layer minus the sinks
    put(bk, slab(SD.sub(outline, seats, g), BOX, z0, zs, { top: (x, y) => (isSeat(x, y) || Math.abs(g(x, y)) < 0.02 ? 0 : BEV), capBottom: false }), 'bridge', 'bevel');
    put(bk, slab(SD.sub(SD.inter(outline, g), seats), BOX, z0 + zGroove, zs, { capBottom: false, h: 0.02 }), 'bridge', 'bridge');
    put(bk, slab(SD.sub(outline, sinks, seats), BOX, zs, z1, { capTop: false }), 'bridge', 'bridge');
    put(bk, slab(SD.sub(SD.inter(outline, sinks), seats), BOX, zs - 0.001, zs, { capTop: false, h: 0.02 }), 'bridge', 'bridge');
    const rubies = [], holes = [];
    for (const j of autoJ) { const s = jewelSeat(j.c, { rs: j.rs, rj: j.rj, rh: j.rh, zFace: z0, zBack: zs, dir: 1, t: 0.16 }); bk.add('bevel', s.metal); rubies.push(s.ruby); holes.push(s.hole); }
    bk.build(autoObj, 'automatic-bridge');
    autoObj.add(new THREE.Mesh(merge(rubies), mat.jewel), new THREE.Mesh(merge(holes), mat.hole));
    if (hasDoc) {
      // serif TUDOR (the logotype letters from glyphs.js) on the band, tops outward, clockwise from the back
      const E = F.engravings.autoBridgeTUDOR, cap = E.capHeight, rc = E.arcRadius;
      const a0 = E.startDegBack * DEG, a1 = E.endDegBack * DEG;
      const pad = 2 * DEG, th0 = a0 + pad, th1 = a1 - pad;
      const ra = rc - cap / 2 - 0.25, rb = rc + cap / 2 + 0.25;
      const PX = 120, wPx = Math.round((th0 - th1) * rb * PX), hPx = Math.round((rb - ra) * PX);
      const letters = tudorLetterRegions(cap);
      const span = letters[letters.length - 1].x1 - letters[0].x0, mid = (letters[0].x0 + letters[letters.length - 1].x1) / 2;
      const kx = ((a0 - a1) * rc) / span; // the letters keep their width along the arc (measured span)
      const tex = engraveTextures(wPx, hPx, (c) => {
        // canvas px: x along the arc (from th0), y down from rb; letter local (x, y up), baseline at r = rc − cap/2
        for (const L2 of letters) {
          const regs = mapRegions(L2.regions, (x, y) => {
            const s = (x + L2.xc - mid) * kx + ((a0 - a1) * rc) / 2; // arc length from a0
            const th = a0 - s / rc;
            const r = rc - cap / 2 + y;
            return [((th0 - th) * rb) * PX * (1 + 0 * r), (rb - r) * PX];
          });
          c.beginPath();
          drawRegions(c, regs);
        }
      }, { blur: 2 });
      const toBack = (u, v) => { const th = th0 + (th1 - th0) * u, r = rb - (rb - ra) * (1 - v); return [r * Math.cos(th), r * Math.sin(th)]; };
      // v = 1 at the canvas top (r = rb): map canvas y (down from rb) → v
      const geo = decalGeometry((u, v) => { const th = th0 + (th1 - th0) * u, r = ra + (rb - ra) * v; return [r * Math.cos(th), r * Math.sin(th)]; }, 48, 3, z0 - 0.002);
      void toBack;
      const mesh = new THREE.Mesh(geo, engraveMaterial(tex));
      mesh.name = 'automatic-bridge-tudor'; mesh.castShadow = false; mesh.renderOrder = 2;
      autoObj.add(mesh);
      // GENEVA / SWITZERLAND at 9 o'clock (back view), rotated 90° (read bottom → top, tops outward)
      for (const key of ['geneva', 'switzerland']) {
        const G = F.engravings[key];
        const capG = G.capHeight, cB = Bk(G.center[0], G.center[1]); // back-view centre
        const want = TEXT_LEN[key], PXg = 160, len = want + 0.4, ht = capG + 0.3;
        const tx = engraveTextures(Math.round(len * PXg), Math.round(ht * PXg), (c) => {
          c.font = `500 ${capG * PXg * 1.38}px Jost, sans-serif`; c.textBaseline = 'alphabetic';
          const k = (want * PXg) / c.measureText(G.text).width;
          c.save(); c.translate(0.2 * PXg, (ht - 0.15) * PXg); c.scale(k, 1); c.fillText(G.text, 0, 0); c.restore();
        });
        const rot = (G.rotateDegBackView ?? 90) * DEG, ca = Math.cos(rot), sa = Math.sin(rot);
        const gg = decalGeometry((u, v) => { const lx = (u - 0.5) * len, ly = (v - 0.5) * ht; return [cB[0] + lx * ca - ly * sa, cB[1] + lx * sa + ly * ca]; }, 2, 1, z0 - 0.002);
        const ms = new THREE.Mesh(gg, engraveMaterial(tx));
        ms.name = `automatic-bridge-${key}`; ms.castShadow = false; ms.renderOrder = 2;
        autoObj.add(ms);
      }
    }
  }

  // ================================================================ CENTRE-WHEEL BRIDGE
  const cwbObj = group('center-wheel-bridge');
  const CW = F.centerWheelBridge;
  {
    const bk = bucket();
    const z0 = Z.centerWheelBridge[0], z1 = Z.centerWheelBridge[1];
    const strap = SD.capsule(CW.axis[0], CW.axis[1], CW.halfWidth);
    const seat = SD.circle(L.center, 0.62);
    const sh = CW.screws.map((c) => SD.circle(c, 0.42));
    put(bk, slab(SD.sub(strap, seat, ...sh), BOX, z0, z1, { top: (x, y) => (seat(x, y) < 0.03 || sh.some((f) => f(x, y) < 0.03) ? 0 : 0.05), h: 0.02 }), 'strap', 'bevel', (g) => g);
    const s = jewelSeat(L.center, { rs: 0.62, rj: 0.55, rh: CW.hole, zFace: z0, zBack: z1, dir: 1, depth: 0.05, t: 0.16 });
    bk.add('bevel', s.metal);
    const scr = CW.screws.map((c, i) => screwGeometry(c, 0.4, z0, 0.18, { slotDeg: 30 + 50 * i, slotW: 0.09, slotD: 0.07, bev: 0.035, shankR: 0.17, shankTo: Z.centerWheelBridge[1] - 0.01 }));
    bk.add('screw', merge(scr.map((x) => x.head)));
    bk.add('slot', merge(scr.map((x) => x.slot)));
    bk.add('jewel', s.ruby); bk.add('hole', s.hole);
    bk.build(cwbObj, 'center-wheel-bridge');
  }

  // ================================================================ PALLET BRIDGE
  const palObj = group('pallet-bridge');
  const PB = F.palletBridge;
  {
    const bk = bucket();
    const z0 = Z.palletBridge[0], z1 = Z.palletBridge[1];
    const body = SD.poly(PB.outline);
    const seat = SD.circle(L.pallet, 0.5);
    const sh = PB.screws.map((c) => SD.circle(c, 0.38));
    put(bk, slab(SD.sub(body, seat, ...sh), [L.pallet[0] - 3, L.pallet[1] - 3, L.pallet[0] + 3, L.pallet[1] + 3], z0, z1, { top: (x, y) => (seat(x, y) < 0.03 || sh.some((f) => f(x, y) < 0.03) ? 0 : 0.05), h: 0.015 }), 'polished', 'bevel', (g) => g);
    const s = jewelSeat(L.pallet, { rs: 0.5, rj: 0.38, rh: 0.05, zFace: z0, zBack: z1, dir: 1, depth: 0.06, t: 0.15 });
    bk.add('bevel', s.metal); bk.add('jewel', s.ruby); bk.add('hole', s.hole);
    const scr = PB.screws.map((c, i) => screwGeometry(c, 0.36, z0, 0.16, { slotDeg: -20 + 70 * i, slotW: 0.08, slotD: 0.06, bev: 0.03, shankR: 0.15, shankTo: Z.palletBridge[1] - 0.01 }));
    bk.add('screw', merge(scr.map((x) => x.head)));
    bk.add('slot', merge(scr.map((x) => x.slot)));
    bk.build(palObj, 'pallet-bridge');
  }

  // ================================================================ PLATE SCREWS
  const screwObj = group('plate-screws');
  {
    const bk = bucket();
    const list = screws.filter((s) => s.in !== 'balanceBridge').map((s) => {
      const top = Z.screwHeadTop[s.in];
      const bottomOf = { flange: Z.flange[1], automaticBridge: Z.automaticBridge[1], trainBridge: Z.trainBridge[1] }[s.in];
      return screwGeometry(s.at, F.screwHeadRadius, top, 0.25, { slotDeg: slotDeg[s.i] ?? 0, slotW: 0.15, slotD: 0.1, bev: 0.06, shankR: 0.3, shankTo: bottomOf - 0.02 });
    });
    bk.add('screw', merge(list.map((x) => x.head)));
    bk.add('slot', merge(list.map((x) => x.slot)));
    bk.build(screwObj, 'plate-screws');
  }

  // ================================================================ registration
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const dl = (id) => spec.explodeDelay(id);
  const sc = (s) => s.toLocaleString('en-US');
  reg.add({
    id: 'main-plate', name: 'Main plate', category: 'frame', side: 'both', exposed: true, priority: 2, xray: true,
    object: plateObj, explode: ex('main-plate'), explodeDelay: dl('main-plate'),
    anchor: [...Bk(14.6, 4.2), Z.mainPlate[0]],
    description: 'The 2 mm thick base plate everything is built on. The mainspring barrel sits in a deep pocket in its back, the motion works and keyless levers in recesses on its dial side, and the winding stem runs through a channel in it. Sand-blasted grey on both faces.',
    facts: { Diameter: `${(2 * R).toFixed(1)} mm (14 lignes)`, Thickness: `${(Z.mainPlate[1] - Z.mainPlate[0]).toFixed(2)} mm`, Finish: 'Sand-blasted, polished edge', 'Barrel pocket': `${((Z.barrelPocketFloor - Z.mainPlate[0])).toFixed(2)} mm deep`, 'Lower jewels': '5 (centre, third, escape, pallet, balance) + barrel arbor' },
  });
  reg.add({
    id: 'barrel-bridge', name: 'Barrel bridge and flange', category: 'frame', side: 'back', exposed: true, priority: 2, xray: true,
    object: barrelObj, explode: ex('barrel-bridge'), explodeDelay: dl('barrel-bridge'),
    anchor: [...Bk(-15.0, 2.5), Z.flange[0]],
    description: 'Holds the top of the mainspring barrel and carries the ratchet wheel, crown wheel and click. It lies hidden under the automatic bridge; its rim is the laser-decorated outer flange that runs round the whole movement.',
    facts: { Finish: 'Sand-blasted; flange with laser "sun" stripes', Flange: `r ${F.flange.rInner}–${F.flange.rOuter} mm`, Carries: 'Barrel arbor, ratchet, crown wheel, click' },
  });
  reg.add({
    id: 'train-bridge', name: 'Train bridge', category: 'frame', side: 'back', exposed: true, priority: 1, xray: true,
    object: trainObj, explode: ex('train-bridge'), explodeDelay: dl('train-bridge'),
    anchor: [...Bk(9.5, -3.3), Z.trainBridge[0]],
    description: 'Holds the upper pivots of the fourth, third and escape wheels in jewels and carries the rotor post at the centre. Engraved with the calibre and jewel count; its two windows show the gilt third wheel and the central wheels turning underneath.',
    facts: { Engraving: 'MT5652 TWENTY-EIGHT 28 JEWELS', Jewels: '3 (fourth, third, escape wheel)', Finish: 'Sand-blasted, polished bevels', Screws: '2' },
  });
  reg.add({
    id: 'automatic-bridge', name: 'Automatic bridge', category: 'frame', side: 'back', exposed: true, priority: 1, xray: true,
    object: autoObj, explode: ex('automatic-bridge'), explodeDelay: dl('automatic-bridge'),
    anchor: [...Bk(-6.0, 8.6), Z.automaticBridge[0]],
    description: 'The large bridge under the rotor that holds the self-winding wheels (the reversing wheels and the reduction wheel) in four jewels. Its raised outer band is engraved TUDOR and GENEVA SWITZERLAND.',
    facts: { Engraving: 'TUDOR · GENEVA SWITZERLAND', Jewels: '4 (automatic train)', Finish: 'Sand-blasted, polished bevels', Screw: '1' },
  });
  reg.add({
    id: 'center-wheel-bridge', name: 'Centre-wheel bridge', category: 'frame', side: 'back', exposed: false, priority: 3, xray: true,
    object: cwbObj, explode: ex('center-wheel-bridge'), explodeDelay: dl('center-wheel-bridge'),
    anchor: [...CW.axis[1], Z.centerWheelBridge[0]],
    description: 'A small steel strap across the centre of the movement that holds the centre wheel\'s upper pivot in a jewel; the seconds wheel turns just above it.',
    facts: { Type: 'Steel strap', Jewel: '1 (centre wheel)', Screws: '2' },
  });
  reg.add({
    id: 'pallet-bridge', name: 'Pallet bridge', category: 'frame', side: 'back', exposed: true, priority: 3, xray: true,
    object: palObj, explode: ex('pallet-bridge'), explodeDelay: dl('pallet-bridge'),
    anchor: [PB.screws[1][0], PB.screws[1][1], Z.palletBridge[0]],
    description: 'A small polished bridge under the balance that carries the upper pivot of the pallet fork in its own jewel, so the escapement can be adjusted without removing the train bridge.',
    facts: { Finish: 'Polished', Jewel: '1 (pallet arbor)', Screws: '2' },
  });
  reg.add({
    id: 'jewels', name: 'Jewels', category: 'jewels', side: 'back', exposed: true, priority: 3,
    object: jewelObj, explode: ex('jewels'), explodeDelay: dl('jewels'),
    anchor: [L.balance[0] + 0.5, L.balance[1] + 0.5, Z.mainPlate[0]],
    description: 'Synthetic rubies used as nearly frictionless, wear-free bearings; the cup round each hole holds a drop of oil. The MT5652 has 28: these are the ones set in the main plate — the others sit in the bridges, the balance shock settings, the pallet fork (two stones) and the roller (impulse pin).',
    facts: { 'In total': `${F.jewelCount} ("TWENTY-EIGHT 28 JEWELS")`, 'In the main plate': `${plateJewels.length + 1}`, Colour: 'Purple-tinted synthetic ruby', Material: 'Corundum (Al₂O₃), Mohs 9' },
  });
  reg.add({
    id: 'plate-screws', name: 'Bridge screws', category: 'screws', side: 'back', exposed: true, priority: 2,
    object: screwObj, explode: ex('plate-screws'), explodeDelay: dl('plate-screws'),
    anchor: [...screws[2].at, Z.screwHeadTop.flange],
    description: 'Polished slotted steel screws that fix the bridges and the flange to the main plate; their heads sit flush in countersinks.',
    facts: { Count: `${screws.filter((s) => s.in !== 'balanceBridge').length} (+2 on the balance bridge)`, Head: `Ø${(2 * F.screwHeadRadius).toFixed(2)} mm`, Finish: MV.finishes.screws.finish },
  });
  reg.add({
    id: 'plate-engravings', name: 'Plate marking', category: 'frame', side: 'front', exposed: false, priority: 3,
    object: engrObj, explode: ex('plate-engravings'), explodeDelay: dl('plate-engravings'),
    anchor: [-13.4, 0, Z.mainPlate[1]],
    description: 'The calibre number marked on the dial side of the main plate, hidden under the dial (position and lettering estimated). The visible engravings are on the bridges: TUDOR and GENEVA SWITZERLAND on the automatic bridge, the calibre and jewel count on the train bridge.',
    facts: { Marking: 'MT5652 (estimated)', 'Bridge engravings': `${sc(2)} bridges, COSC calibre texts` },
  });
}
