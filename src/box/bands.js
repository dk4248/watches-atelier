import * as THREE from 'three';
import { DEG, clamp, smoothstep, lerp } from './util.js';
import { stitchGeometry } from './geometry.js';

// Straps and bracelets wrapped round a cushion. Everything lives in the slot frame:
// the cushion's long axis is X, its section lies in the (z, y) plane with the centre at
// the origin, 12 o'clock towards −Z. The band runs from the 12 o'clock spring bar down
// the back of the cushion, underneath, and up the front to the 6 o'clock spring bar.

const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;

// Offset a closed CCW polygon [[z, y], …] outwards by d.
function offsetPoly(poly, d) {
  const n = poly.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
    let e1z = b[0] - a[0], e1y = b[1] - a[1];
    let e2z = c[0] - b[0], e2y = c[1] - b[1];
    const l1 = Math.hypot(e1z, e1y) || 1, l2 = Math.hypot(e2z, e2y) || 1;
    e1z /= l1; e1y /= l1; e2z /= l2; e2y /= l2;
    // outward normal of a CCW edge (dz, dy) is (dy, −dz)
    let nz = e1y + e2y, ny = -e1z - e2z;
    const l = Math.hypot(nz, ny) || 1;
    nz /= l; ny /= l;
    out.push([b[0] + nz * d, b[1] + ny * d]);
  }
  return out;
}

// Tangent vertices of a convex CCW polygon seen from an outside point S.
// side = +1: the line S→T continues in the polygon's CCW direction (band arriving),
// side = −1: the polygon's CCW direction continues into T→S (band leaving).
function tangentIndex(poly, S, side) {
  const n = poly.length;
  let best = -1, bestScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const p = poly[i], a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    const vz = p[0] - S[0], vy = p[1] - S[1];
    const ca = cross2(vz, vy, a[0] - S[0], a[1] - S[1]);
    const cb = cross2(vz, vy, b[0] - S[0], b[1] - S[1]);
    if (ca * cb < 0) continue; // the neighbours straddle the line: not a tangent
    const dz = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(vz, vy) * Math.hypot(dz, dy) || 1;
    const align = (side > 0 ? vz * dz + vy * dy : -(vz * dz + vy * dy)) / l;
    if (align > bestScore) { bestScore = align; best = i; }
  }
  return best;
}

// Tangent point on a circle (centre C, radius r) seen from P, chosen so that travelling
// CCW round the circle and then along the tangent (dir = +1, leaving towards P) or along
// the tangent and then CCW round the circle (dir = −1, arriving from P) is smooth.
function circleTangent(C, r, P, dir) {
  const dz = P[0] - C[0], dy = P[1] - C[1];
  const d = Math.max(r * 1.0001, Math.hypot(dz, dy));
  const phi = Math.atan2(dy, dz), alpha = Math.acos(r / d);
  for (const th of [phi + alpha, phi - alpha]) {
    const tz = -Math.sin(th), ty = Math.cos(th); // CCW tangent at th
    const az = C[0] + r * Math.cos(th), ay = C[1] + r * Math.sin(th);
    const s = (P[0] - az) * tz + (P[1] - ay) * ty;
    if ((dir > 0 && s > 0) || (dir < 0 && s < 0)) return th;
  }
  return phi;
}

// Centre line of the band. outline = cushion section (CCW), bar12 / bar6 = spring bar
// centres [z, y]; t = band thickness. Returns uniformly resampled stations
// { p:[z,y], t:[z,y], n:[z,y], s } and the total length.
export function bandPath(outline, bar12, bar6, t, { barR = 0.85, inboard = 2.6, step = 0.6, gap = 0.12 } = {}) {
  const off = offsetPoly(outline, t / 2 + gap);
  const rho = barR + t / 2;
  // belt tangent between the bar circle and the cushion, refined a few times
  const belt = (bar, isTwelve) => {
    let th = isTwelve ? Math.PI : 0;
    let ti = 0;
    for (let k = 0; k < 4; k++) {
      const A = [bar[0] + rho * Math.cos(th), bar[1] + rho * Math.sin(th)];
      ti = tangentIndex(off, A, isTwelve ? 1 : -1);
      if (ti < 0) ti = isTwelve ? Math.floor(off.length * 0.5) : 0;
      th = circleTangent(bar, rho, off[ti], isTwelve ? 1 : -1);
    }
    return { th, ti };
  };
  const b12 = belt(bar12, true);
  const b6 = belt(bar6, false);
  // angles: 12 side runs CCW from the top of the bar (90°) to the departure angle
  let th12 = b12.th;
  while (th12 < Math.PI / 2) th12 += 2 * Math.PI;
  while (th12 > Math.PI / 2 + 2 * Math.PI) th12 -= 2 * Math.PI;
  // 6 side runs CCW from the arrival angle up to 90°
  let th6 = b6.th;
  while (th6 > Math.PI / 2) th6 -= 2 * Math.PI;
  while (th6 < Math.PI / 2 - 2 * Math.PI) th6 += 2 * Math.PI;

  const raw = [];
  raw.push([bar12[0] + inboard, bar12[1] + rho]);
  const arcN = 10;
  for (let k = 0; k <= arcN; k++) {
    const a = Math.PI / 2 + ((th12 - Math.PI / 2) * k) / arcN;
    raw.push([bar12[0] + rho * Math.cos(a), bar12[1] + rho * Math.sin(a)]);
  }
  const n = off.length;
  let i = b12.ti;
  raw.push(off[i]);
  for (let guard = 0; guard < n && i !== b6.ti; guard++) {
    i = (i + 1) % n;
    raw.push(off[i]);
  }
  for (let k = 0; k <= arcN; k++) {
    const a = th6 + ((Math.PI / 2 - th6) * k) / arcN;
    raw.push([bar6[0] + rho * Math.cos(a), bar6[1] + rho * Math.sin(a)]);
  }
  raw.push([bar6[0] - inboard, bar6[1] + rho]);

  // drop near-duplicates, then resample at a constant step
  const pts = [raw[0]];
  for (let k = 1; k < raw.length; k++) {
    const p = pts[pts.length - 1];
    if (Math.hypot(raw[k][0] - p[0], raw[k][1] - p[1]) > 0.05) pts.push(raw[k]);
  }
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const total = cum[cum.length - 1];
  const N = Math.max(8, Math.round(total / step));
  const st = [];
  let j = 0;
  for (let k = 0; k <= N; k++) {
    const s = (k / N) * total;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    st.push({ p: [lerp(pts[j][0], pts[j + 1][0], f), lerp(pts[j][1], pts[j + 1][1], f)], s });
  }
  for (let k = 0; k < st.length; k++) {
    const a = st[Math.max(0, k - 1)].p, b = st[Math.min(st.length - 1, k + 1)].p;
    let tz = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tz, ty) || 1;
    tz /= l; ty /= l;
    st[k].t = [tz, ty];
    st[k].n = [ty, -tz]; // outward for a CCW path
  }
  // light smoothing of the frames (the polygon is finely sampled already)
  return { st, total };
}

// Station frame at arc length s (interpolated): writes p (Vector3), T, N.
function frameAt(path, s, p, T, N) {
  const st = path.st;
  const f = clamp(s / path.total, 0, 1) * (st.length - 1);
  const k = Math.min(st.length - 2, Math.floor(f));
  const u = f - k;
  const a = st[k], b = st[k + 1];
  p.set(0, lerp(a.p[1], b.p[1], u), lerp(a.p[0], b.p[0], u));
  T.set(0, lerp(a.t[1], b.t[1], u), lerp(a.t[0], b.t[0], u)).normalize();
  N.set(0, -T.z, T.y);
}

// ---------------------------------------------------------------- strap (leather / fabric)
// Swept rounded-rectangle section. width(s), thick(s) in mm. Vertex colours darken the
// painted edges. UVs in mm / tile.
export function strapGeometry(path, { width, thick, dome = 0.12, rTop = 0.7, rBot = 0.4, edge = 0.45, under = 0.8, tile = 18 }) {
  const st = path.st;
  const S = st.length;
  // section template in (a, n) with normals; a ∈ [−1, 1] scaled later, built per station
  const sect = (w, t) => {
    const h = t / 2, A = w / 2;
    const rt = Math.min(rTop, h, A * 0.3), rb = Math.min(rBot, h, A * 0.3);
    const P = [];
    const top = (a) => h + dome * (1 - (a / A) ** 2);
    const topSlope = (a) => (-2 * dome * a) / (A * A);
    // top face (left → right)
    const nt = 9;
    for (let i = 0; i <= nt; i++) {
      const a = -(A - rt) + (2 * (A - rt) * i) / nt;
      const sl = topSlope(a);
      const l = Math.hypot(sl, 1);
      P.push([a, top(a), -sl / l, 1 / l, 1]);
    }
    const yTopEdge = top(A - rt);
    // right top corner (90° → 0°)
    for (let k = 1; k <= 4; k++) {
      const ang = (90 - (90 * k) / 4) * DEG;
      P.push([A - rt + rt * Math.cos(ang), yTopEdge - rt + rt * Math.sin(ang), Math.cos(ang), Math.sin(ang), lerp(1, edge, k / 4)]);
    }
    // right side down to the bottom corner
    P.push([A, -h + rb, 1, 0, edge]);
    for (let k = 1; k <= 3; k++) {
      const ang = (-(90 * k) / 3) * DEG;
      P.push([A - rb + rb * Math.cos(ang), -h + rb + rb * Math.sin(ang), Math.cos(ang), Math.sin(ang), lerp(edge, under, k / 3)]);
    }
    // bottom face (right → left)
    for (let i = 1; i < 4; i++) {
      const a = (A - rb) - (2 * (A - rb) * i) / 4;
      P.push([a, -h, 0, -1, under]);
    }
    for (let k = 0; k <= 3; k++) {
      const ang = (-90 - (90 * k) / 3) * DEG;
      P.push([-(A - rb) + rb * Math.cos(ang), -h + rb + rb * Math.sin(ang), Math.cos(ang), Math.sin(ang), lerp(under, edge, k / 3)]);
    }
    P.push([-A, yTopEdge - rt, -1, 0, edge]);
    for (let k = 1; k < 4; k++) {
      const ang = (180 - (90 * k) / 4) * DEG;
      P.push([-(A - rt) + rt * Math.cos(ang), yTopEdge - rt + rt * Math.sin(ang), Math.cos(ang), Math.sin(ang), lerp(edge, 1, k / 4)]);
    }
    return P;
  };
  const Q = sect(10, 2).length;
  const nv = S * Q + 2 * (Q + 1);
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const p = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3();
  let k = 0;
  const sections = [];
  for (let i = 0; i < S; i++) {
    const s = st[i].s;
    frameAt(path, s, p, T, N);
    const P = sect(width(s), thick(s));
    sections.push(P);
    for (let q = 0; q < Q; q++, k++) {
      const [a, nn, na, nnn, c] = P[q];
      pos[k * 3] = a; pos[k * 3 + 1] = p.y + N.y * nn; pos[k * 3 + 2] = p.z + N.z * nn;
      const nx = na, ny = N.y * nnn, nz = N.z * nnn;
      const l = Math.hypot(nx, ny, nz) || 1;
      nor[k * 3] = nx / l; nor[k * 3 + 1] = ny / l; nor[k * 3 + 2] = nz / l;
      col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = c;
      uv[k * 2] = a / tile; uv[k * 2 + 1] = s / tile;
    }
  }
  const idx = [];
  for (let i = 0; i < S - 1; i++) {
    for (let q = 0; q < Q; q++) {
      const q1 = (q + 1) % Q;
      const a = i * Q + q, b = i * Q + q1, c = (i + 1) * Q + q1, d = (i + 1) * Q + q;
      idx.push(a, b, d, b, c, d);
    }
  }
  // end caps
  for (const [i, sgn] of [[0, -1], [S - 1, 1]]) {
    frameAt(path, st[i].s, p, T, N);
    const P = sections[i];
    const c0 = k;
    pos[k * 3] = 0; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
    nor[k * 3] = 0; nor[k * 3 + 1] = T.y * sgn; nor[k * 3 + 2] = T.z * sgn;
    col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = edge;
    k++;
    for (let q = 0; q < Q; q++, k++) {
      const [a, nn] = P[q];
      pos[k * 3] = a; pos[k * 3 + 1] = p.y + N.y * nn; pos[k * 3 + 2] = p.z + N.z * nn;
      nor[k * 3] = 0; nor[k * 3 + 1] = T.y * sgn; nor[k * 3 + 2] = T.z * sgn;
      col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = edge;
      uv[k * 2] = a / tile; uv[k * 2 + 1] = nn / tile;
    }
    for (let q = 0; q < Q; q++) {
      const q1 = (q + 1) % Q;
      if (sgn > 0) idx.push(c0, c0 + 1 + q, c0 + 1 + q1);
      else idx.push(c0, c0 + 1 + q1, c0 + 1 + q);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, k * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, k * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, k * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv.subarray(0, k * 2), 2));
  g.setIndex(idx);
  fixWinding(g);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

function fixWinding(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array, idx = g.index.array;
  let score = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    score += (uy * vz - uz * vy) * (n[a] + n[b] + n[c]) + (uz * vx - ux * vz) * (n[a + 1] + n[b + 1] + n[c + 1]) + (ux * vy - uy * vx) * (n[a + 2] + n[b + 2] + n[c + 2]);
  }
  if (score < 0) {
    for (let t = 0; t < idx.length; t += 3) { const q = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = q; }
    g.index.needsUpdate = true;
  }
}

// Edge stitching along both sides of a leather strap.
export function strapStitches(path, { width, thick, inset = 1.4, pitch = 1.45, from = 3, to = null, dome = 0.12 }) {
  const frames = [];
  const p = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3();
  const end = to ?? path.total - 3;
  for (let s = from; s <= end; s += pitch) {
    frameAt(path, s, p, T, N);
    const A = width(s) / 2, h = thick(s) / 2;
    for (const side of [-1, 1]) {
      const a = side * (A - inset);
      const n = h + dome * (1 - (a / A) ** 2);
      frames.push({
        px: a, py: p.y + N.y * n, pz: p.z + N.z * n,
        tx: 0, ty: T.y, tz: T.z,
        nx: 0, ny: N.y, nz: N.z,
      });
    }
  }
  return stitchGeometry(frames, { len: 1.15, r: 0.21, slant: 28 * DEG, sink: 0.4, flat: 0.75, radial: 5, cap: 1 });
}

// ---------------------------------------------------------------- bracelet
// Three-row link bracelet following the path: brushed outer links, a centre link
// (polished or brushed). Returns { outer, centre } geometries.
export function braceletGeometry(path, { width, thick = 3.4, pitch = 5.0, gap = 0.32, centreFrac = 0.42, from = 0.5, to = null }) {
  const outerList = [], centreList = [];
  const tplCache = new Map();
  const block = (len, h, w) => {
    const key = `${len.toFixed(2)}|${h.toFixed(2)}|${w.toFixed(2)}`;
    if (tplCache.has(key)) return tplCache.get(key);
    const r = Math.min(h * 0.5, len * 0.32);
    const s = new THREE.Shape();
    const x0 = -len / 2, x1 = len / 2, y0 = -h / 2, y1 = h / 2;
    s.moveTo(x0 + r * 0.5, y0);
    s.lineTo(x1 - r * 0.5, y0);
    s.quadraticCurveTo(x1, y0, x1, y0 + r * 0.5);
    s.lineTo(x1, y1 - r);
    s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - r);
    s.lineTo(x0, y0 + r * 0.5);
    s.quadraticCurveTo(x0, y0, x0 + r * 0.5, y0);
    const bev = Math.min(0.32, w * 0.12);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.1, w - 2 * bev), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 2, curveSegments: 4,
    });
    g.translate(0, 0, -(w - 2 * bev) / 2);
    // UV: brushing runs along the strap (template x)
    const uvA = g.attributes.uv, pa = g.attributes.position;
    for (let i = 0; i < uvA.count; i++) uvA.setXY(i, pa.getZ(i) * 0.08, pa.getX(i) * 0.08);
    tplCache.set(key, g);
    return g;
  };
  const p = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0);
  const m = new THREE.Matrix4();
  const end = to ?? path.total - 0.5;
  const rows = Math.max(1, Math.floor((end - from) / pitch));
  const p0 = from + ((end - from) - rows * pitch) / 2;
  for (let k = 0; k <= rows; k++) {
    const s = p0 + k * pitch;
    frameAt(path, s, p, T, N);
    const W = width(s);
    const wc = W * centreFrac, wo = (W - wc) / 2 - gap;
    const len = pitch - gap;
    m.makeBasis(T, N, X);
    // centre link sits a hair proud of the outer ones
    const cen = block(len, thick * 1.02, wc);
    const gC = cen.clone().applyMatrix4(m);
    gC.translate(0, p.y + N.y * 0.08, p.z + N.z * 0.08);
    centreList.push(gC);
    const out = block(len * 0.98, thick, wo);
    for (const side of [-1, 1]) {
      const g = out.clone().applyMatrix4(m);
      g.translate(side * (wc / 2 + gap + wo / 2), p.y, p.z);
      outerList.push(g);
    }
  }
  for (const g of tplCache.values()) g.dispose();
  return { outer: mergeList(outerList), centre: mergeList(centreList) };
}

function mergeList(list) {
  let nv = 0;
  for (const g of list) nv += g.attributes.position.count;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    o += c;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

export { smoothstep };
