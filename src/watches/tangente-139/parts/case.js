// Case of the NOMOS Tangente ref. 139: polished 316L steel bezel + middle case with the
// four angular lugs, flat sapphire crystal, dark inner flange around the dial, the
// casing ring and casing clamps that hold the movement, the press-fit display back
// (steel ring + sapphire), the fluted crown, spring bars, and the black Horween shell
// cordovan strap with its polished tang buckle.
//
// Every dimension comes from SPEC.case / SPEC.z / SPEC.frame. Frame: +Z out of the
// dial, 12 o'clock = +Y, crown (3 o'clock) = +X.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ============================================================== geometry helpers

function makeGeo(pos, uv, idx, nor) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  if (!nor) g.computeVertexNormals();
  return g;
}

// Surface of revolution about +Z. Each strip is a polyline of [r, z] points, ordered
// so the solid lies on the LEFT of the direction of travel (counter-clockwise around
// the cross-section with r to the right and z up) — normals then point out of the
// solid. Points inside one strip are shaded smoothly; strips meet at crisp edges.
// [a0, a1] limits the sweep (radians, CCW from +X) for parts with a radial slot.
function latheZ(strips, segs, a0 = 0, a1 = TAU) {
  const pos = [], nor = [], uv = [], idx = [];
  let base = 0;
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
    for (let k = 0; k <= segs; k++) {
      const a = a0 + (k / segs) * (a1 - a0), c = Math.cos(a), sn = Math.sin(a);
      for (let i = 0; i < n; i++) {
        pos.push(s[i][0] * c, s[i][0] * sn, s[i][1]);
        nor.push(nr[i][0] * c, nr[i][0] * sn, nr[i][1]);
        uv.push(k / segs, len[i]);
      }
    }
    for (let k = 0; k < segs; k++) {
      for (let i = 0; i < n - 1; i++) {
        const a = base + k * n + i, b = base + (k + 1) * n + i;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    base += (segs + 1) * n;
  }
  return makeGeo(pos, uv, idx, nor);
}

// Quarter/partial arc as a list of [r, z] points (degrees, counter-clockwise).
function arc(cx, cy, r, a0, a1, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps) * DEG;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function flipIndex(geo) {
  const ix = geo.index.array;
  for (let t = 0; t < ix.length; t += 3) {
    const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp;
  }
  geo.index.needsUpdate = true;
}

// Make the faces of an (indexed) geometry point along expect(cx, cy, cz) on average.
function orient(geo, expect) {
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
  geo.computeVertexNormals();
  return geo;
}

// Closed meshes: make them face outwards (positive signed volume).
function orientClosed(geo) {
  const p = geo.attributes.position.array, ix = geo.index.array;
  let vol = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    vol += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1])
      - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c])
      + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  if (vol < 0) flipIndex(geo);
  return geo;
}

// Merge geometries that may mix indexed / non-indexed (ExtrudeGeometry) sources.
function mergeAll(list) {
  const anyFlat = list.some((g) => !g.index);
  const gs = list.map((g0) => {
    const g = anyFlat && g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    return g;
  });
  return mergeGeometries(gs, false);
}

// Grid indices for a (nu × nv) vertex grid, optionally closed in either direction.
function gridIndex(nu, nv, closeU, closeV, base = 0) {
  const idx = [];
  const cu = closeU ? nu : nu - 1, cv = closeV ? nv : nv - 1;
  for (let i = 0; i < cu; i++) {
    for (let j = 0; j < cv; j++) {
      const i1 = (i + 1) % nu, j1 = (j + 1) % nv;
      const a = base + i * nv + j, b = base + i1 * nv + j, c = base + i * nv + j1, d = base + i1 * nv + j1;
      idx.push(a, b, c, b, d, c);
    }
  }
  return idx;
}

// ============================================================== text decals

// Render text with the shared textTexture helper and return what is needed to size a
// decal: mm per canvas pixel from the cap height (Jost caps ≈ 0.74 em; with the
// 'middle' baseline the caps sit ≈ 0.11 em above the canvas centre → `rise`).
// align 'left': the helper sizes the canvas from the unspaced width plus the spacing,
// so left-aligned drawing fills it exactly (centring would re-measure with
// ctx.letterSpacing applied and shift the first letters off the canvas).
function makeText(ctx, text, { weight = 400, size = 96, spacingEm = 0, capHeight }) {
  const font = `${weight} ${size}px Jost, "Futura", "Century Gothic", sans-serif`;
  const r = ctx.textTexture(text, { font, color: '#ffffff', letterSpacing: spacingEm * size, pad: 6, align: 'left' });
  const mmPerPx = capHeight / (0.74 * size);
  return { texture: r.texture, w: r.canvas.width * mmPerPx, h: r.canvas.height * mmPerPx, rise: 0.11 * size * mmPerPx, font };
}

// Same, with the letter spacing solved so the inked text is `width` mm long.
function makeTextFit(ctx, text, { weight = 400, size = 96, capHeight, width }) {
  const mmPerPx = capHeight / (0.74 * size);
  const probe = makeText(ctx, text, { weight, size, spacingEm: 0, capHeight });
  probe.texture.dispose();
  const ink = probe.w / mmPerPx - 12; // canvas minus the 2 × 6 px padding
  const n = [...text].length;
  const sp = n > 1 ? Math.max(0, (width / mmPerPx - ink) / (n - 1)) : 0;
  return makeText(ctx, text, { weight, size, spacingEm: sp / size, capHeight });
}

// If the webfont was not ready when the texture was drawn, redraw once it is.
function refreshWhenFontReady(font, redraw) {
  try {
    if (typeof document === 'undefined' || !document.fonts || document.fonts.check(font)) return;
    document.fonts.load(font).then(() => redraw()).catch(() => {});
  } catch { /* ignore */ }
}

function decalMaterial(base, texture, color, roughness, metalness) {
  const m = base.clone();
  m.map = texture;
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

// ============================================================== strap generator
//
// The strap is generated in a flat parameter space (v across, u along, n through the
// thickness) and bent onto a curved centre line that leaves the spring bar and arcs
// away from the case and gently down (−Z). (v, u, n) maps to the right-handed frame
// (A, T, N): A across, T along the strap, N the outer (dial-side) normal.
function makeStrap({
  sgn, L, th0, th1, y0, z0, widthAt0 = 17.85, widthAtL = 16.0, endType = 'round',
  holes = [], foldLen = 0, foldExtra = 1.4, t0 = 3.0, tEnd = 2.5,
}) {
  const m = 7; // outer samples per side on the faces
  const C5 = [-1.4, -0.7, 0, 0.7, 1.4]; // fixed central columns (hole cells)
  const J = 2 * m + 5;
  const Q = 5;
  const P = 2 * J + 4 * Q;
  const rcT0 = 0.75, rcB0 = 0.35, dome0 = 0.12;

  const thick = (u) => tEnd + (t0 - tEnd) * (1 - smoothstep(2, 24, u)); // padded lug end → thinner tail
  const extra = (u) => (foldLen ? foldExtra * smoothstep(L - foldLen - 1.4, L - foldLen, u) : 0);
  const hRaw = (u) => 0.5 * (thick(u) + extra(u));
  const ncOf = (u) => -0.5 * extra(u);
  const width = (u) => lerp(widthAt0, widthAtL, clamp(u / L, 0, 1));
  const R0 = hRaw(0); // nose round the lug spring bar
  const Rb = hRaw(L); // nose round the buckle pin
  const ub = L - Rb;
  const Rend = width(L) / 2; // plan-view rounded tip
  const uE = L - Rend;

  const noseF = (u) => {
    if (u < 0) return Math.sqrt(Math.max(0, 1 - (u / R0) ** 2));
    if (endType === 'fold' && u > ub) return Math.sqrt(Math.max(0, 1 - ((u - ub) / Rb) ** 2));
    return 1;
  };
  const widthF = (u) => (endType === 'round' && u > uE ? Math.sqrt(Math.max(0, 1 - ((u - uE) / Rend) ** 2)) : 1);
  const halfW = (u) => 0.5 * width(u) * widthF(u);
  const halfT = (u) => hRaw(u) * noseF(u);

  // ---- centre line: angle eases from th0 to th1 (curvature grows away from the case)
  const theta = (u) => (u <= 0 ? th0 : th0 + (th1 - th0) * Math.pow(Math.min(u / L, 1), 1.5));
  const step = 0.05;
  const n0 = Math.ceil((R0 + 0.2) / step), n1 = Math.ceil((L + 0.2) / step);
  const cnt = n0 + n1 + 1;
  const PY = new Float64Array(cnt), PZ = new Float64Array(cnt);
  PY[n0] = y0; PZ[n0] = z0;
  for (let i = n0 + 1; i < cnt; i++) {
    const t = theta((i - n0 - 0.5) * step);
    PY[i] = PY[i - 1] + sgn * Math.cos(t) * step;
    PZ[i] = PZ[i - 1] + Math.sin(t) * step;
  }
  for (let i = n0 - 1; i >= 0; i--) {
    PY[i] = PY[i + 1] - sgn * Math.cos(th0) * step;
    PZ[i] = PZ[i + 1] - Math.sin(th0) * step;
  }
  function map(u, v, n, out = [0, 0, 0]) {
    const f = u / step + n0;
    const i = clamp(Math.floor(f), 0, cnt - 2);
    const k = f - i;
    const cy = PY[i] + (PY[i + 1] - PY[i]) * k, cz = PZ[i] + (PZ[i + 1] - PZ[i]) * k;
    const t = theta(u);
    out[0] = sgn * v;
    out[1] = cy - sgn * Math.sin(t) * n;
    out[2] = cz + Math.cos(t) * n;
    return out;
  }
  const frame = (u) => {
    const t = theta(u);
    return {
      A: new THREE.Vector3(sgn, 0, 0),
      T: new THREE.Vector3(0, sgn * Math.cos(t), Math.sin(t)),
      N: new THREE.Vector3(0, -sgn * Math.sin(t), Math.cos(t)),
    };
  };

  // ---- cross-section at u
  function sect(u) {
    const a = halfW(u), h = halfT(u), nc = ncOf(u);
    const sR = Math.min(1, (2 * h) / (rcT0 + rcB0), a / rcT0);
    const rcT = rcT0 * sR, rcB = rcB0 * sR;
    const dome = dome0 * Math.min(1, h / 0.8, a / 3);
    return { a, h, nc, rcT, rcB, dome, af: a - rcT, ab: a - rcB, nTop: nc + h, nBot: nc - h };
  }
  const faceV = (af, j) => {
    const k = clamp(af - 1.4, 0, 1);
    const c = 1.4 * k;
    if (j < m) return -(c + ((af - c) * (m - j)) / m);
    if (j < m + 5) return C5[j - m] * k;
    return c + ((af - c) * (j - m - 4)) / m;
  };
  const topN = (u, v) => {
    const s = sect(u);
    return s.nTop + (s.af > 1e-6 ? s.dome * (1 - (v / s.af) ** 2) : 0);
  };
  const botN = (u) => sect(u).nBot;

  // ---- stations along u
  let st = [];
  const Kn = 9;
  for (let k = 0; k < Kn; k++) st.push(-R0 * Math.cos((k / Kn) * (Math.PI / 2)));
  const uMainEnd = endType === 'round' ? uE : ub;
  for (let u = 0; u < uMainEnd - 1e-6; u += 0.7) st.push(u);
  if (foldLen) for (let u = L - foldLen - 1.6; u < L - foldLen + 0.2; u += 0.25) st.push(u);
  const Ke = endType === 'round' ? 14 : 10;
  const Rr = endType === 'round' ? Rend : Rb;
  for (let k = 0; k <= Ke; k++) st.push(uMainEnd + Rr * Math.sin((k / Ke) * (Math.PI / 2)));
  for (const uh of holes) {
    st = st.filter((u) => Math.abs(u - uh) > 1.4 + 0.25);
    for (const d of [-1.4, -0.7, 0, 0.7, 1.4]) st.push(uh + d);
  }
  st.sort((a, b) => a - b);
  st = st.filter((u, i) => i === 0 || u - st[i - 1] > 1e-4);
  const S = st.length;

  const pos = [], uvs = [];
  const UVS = 0.14;
  const tmp = [0, 0, 0];
  const pushV = (u, v, n) => {
    map(u, v, n, tmp);
    pos.push(tmp[0], tmp[1], tmp[2]);
    uvs.push(v * UVS, u * UVS);
    return pos.length / 3 - 1;
  };
  for (const u of st) {
    const s = sect(u);
    for (let j = 0; j < J; j++) {
      const v = faceV(s.af, j);
      pushV(u, v, s.nTop + (s.af > 1e-6 ? s.dome * (1 - (v / s.af) ** 2) : 0));
    }
    for (let q = 1; q <= Q; q++) { const a = (90 - (90 * q) / Q) * DEG; pushV(u, s.af + s.rcT * Math.cos(a), s.nTop - s.rcT + s.rcT * Math.sin(a)); }
    for (let q = 0; q < Q; q++) { const a = ((-90 * q) / Q) * DEG; pushV(u, s.ab + s.rcB * Math.cos(a), s.nBot + s.rcB + s.rcB * Math.sin(a)); }
    for (let j = J - 1; j >= 0; j--) pushV(u, faceV(s.ab, j), s.nBot);
    for (let q = 1; q <= Q; q++) { const a = (-90 - (90 * q) / Q) * DEG; pushV(u, -s.ab + s.rcB * Math.cos(a), s.nBot + s.rcB + s.rcB * Math.sin(a)); }
    for (let q = 0; q < Q; q++) { const a = (180 - (90 * q) / Q) * DEG; pushV(u, -s.af + s.rcT * Math.cos(a), s.nTop - s.rcT + s.rcT * Math.sin(a)); }
  }
  const vid = (i, l) => i * P + l;
  const botL = (j) => J + 2 * Q + (J - 1 - j);
  const jc0 = m;

  // hole cells
  const cells = [];
  for (const uh of holes) {
    const i0 = st.findIndex((u) => Math.abs(u - (uh - 1.4)) < 1e-6);
    if (i0 >= 0) cells.push({ uh, i0, i1: i0 + 4 });
  }
  const inCell = (i) => cells.some((c) => i >= c.i0 && i < c.i1);
  const topSkip = (l) => l >= jc0 && l < jc0 + 4;
  const botSkip = (l) => l >= botL(jc0 + 4) && l < botL(jc0);
  const isBot = (l) => l >= J + 2 * Q && l < J + 2 * Q + J - 1;

  const idxL = [], idxB = [];
  for (let i = 0; i < S - 1; i++) {
    const cell = inCell(i);
    for (let l = 0; l < P; l++) {
      if (cell && (topSkip(l) || botSkip(l))) continue;
      const l2 = (l + 1) % P;
      const a = vid(i, l), b = vid(i, l2), c = vid(i + 1, l), d = vid(i + 1, l2);
      (isBot(l) ? idxB : idxL).push(a, b, c, b, d, c);
    }
  }

  // ring triangulation round every punched hole + the hole wall
  const RH = 0.8;
  for (const cell of cells) {
    for (const face of ['top', 'bot']) {
      const B = []; // [vertexId, v, u]
      const add = (i, j) => B.push([face === 'top' ? vid(i, j) : vid(i, botL(j)), C5[j - jc0], st[i]]);
      for (let j = jc0; j <= jc0 + 4; j++) add(cell.i0, j);
      for (let i = cell.i0 + 1; i <= cell.i1; i++) add(i, jc0 + 4);
      for (let j = jc0 + 3; j >= jc0; j--) add(cell.i1, j);
      for (let i = cell.i1 - 1; i > cell.i0; i--) add(i, jc0);
      const K = B.length;
      const ang = B.map(([, v, u]) => Math.atan2(u - cell.uh, v));
      const circ = [];
      for (let k = 0; k < K; k++) {
        const a0 = ang[k];
        let d = ang[(k + 1) % K] - a0;
        while (d < 0) d += TAU;
        while (d >= TAU) d -= TAU;
        for (const a of [a0, a0 + d / 2]) {
          const v = RH * Math.cos(a), u = cell.uh + RH * Math.sin(a);
          circ.push([v, u]);
        }
      }
      const N2 = circ.length;
      const cid = circ.map(([v, u]) => pushV(u, v, face === 'top' ? topN(u, v) : botN(u)));
      const tgt = face === 'top' ? idxL : idxB;
      for (let k = 0; k < K; k++) {
        const bk = B[k][0], bn = B[(k + 1) % K][0];
        const c0 = cid[2 * k], c1 = cid[2 * k + 1], c2 = cid[(2 * k + 2) % N2];
        if (face === 'top') tgt.push(bk, bn, c1, bk, c1, c0, bn, c2, c1);
        else tgt.push(bk, c1, bn, bk, c0, c1, bn, c1, c2);
      }
      if (face === 'top') {
        // wall (own vertices → crisp rim)
        const T = circ.map(([v, u]) => pushV(u, v, topN(u, v)));
        const W = circ.map(([v, u]) => pushV(u, v, botN(u)));
        for (let k = 0; k < N2; k++) {
          const k1 = (k + 1) % N2;
          idxL.push(T[k], T[k1], W[k], T[k1], W[k1], W[k]);
        }
      }
    }
  }

  // one shared vertex buffer, two index sets (leather top/edges, suede lining)
  const all = new THREE.BufferGeometry();
  all.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  all.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  all.setIndex([...idxL, ...idxB]);
  orientClosed(all);
  all.computeVertexNormals();
  const ia = all.index.array;
  const geoL = new THREE.BufferGeometry();
  const geoB = new THREE.BufferGeometry();
  for (const g of [geoL, geoB]) {
    g.setAttribute('position', all.attributes.position);
    g.setAttribute('normal', all.attributes.normal);
    g.setAttribute('uv', all.attributes.uv);
  }
  geoL.setIndex(new THREE.BufferAttribute(ia.slice(0, idxL.length), 1));
  geoB.setIndex(new THREE.BufferAttribute(ia.slice(idxL.length), 1));
  geoL.computeBoundingSphere();
  geoB.computeBoundingSphere();

  return {
    geoL, geoB, map, frame, topN, botN, halfW, halfT, ncOf, sect, L, ub, Rb, sgn,
  };
}

// Dark saddle stitches along both edges, top and underside.
function stitchGeometry(S, u0, u1, inset) {
  const tpl = new THREE.SphereGeometry(1, 6, 3);
  const list = [];
  const mtx = new THREE.Matrix4();
  const p = [0, 0, 0];
  const slant = 22 * DEG;
  const pitch = 1.25;
  for (let u = u0; u <= u1; u += pitch) {
    const { A, T, N } = S.frame(u);
    const x = A.clone().multiplyScalar(Math.cos(slant)).addScaledVector(T, Math.sin(slant));
    const y = A.clone().multiplyScalar(-Math.sin(slant)).addScaledVector(T, Math.cos(slant));
    for (const side of [-1, 1]) {
      const v = side * (S.halfW(u) - inset);
      for (const face of [1, -1]) {
        const n = face > 0 ? S.topN(u, v) - 0.02 : S.botN(u) + 0.02;
        S.map(u, v, n, p);
        mtx.makeBasis(x, y.clone().multiplyScalar(face), N.clone().multiplyScalar(face));
        mtx.scale(new THREE.Vector3(0.17, 0.5, 0.095));
        mtx.setPosition(p[0], p[1], p[2]);
        const g = tpl.clone();
        g.applyMatrix4(mtx);
        list.push(g);
      }
    }
  }
  return mergeAll(list);
}

// A leather keeper looped round the strap at u = uk.
function keeperGeometry(S, uk, band = 2.5, kt = 0.85) {
  const s = S.sect(uk);
  const top = S.topN(uk, 0), bot = s.nBot;
  const g = 0.04;
  const ah = s.a + g + kt / 2, nh = (top - bot) / 2 + g + kt / 2, nc = (top + bot) / 2;
  const rr = Math.min(kt / 2 + 0.55, nh - 0.02);
  const path = [];
  const corners = [[ah - rr, nh - rr, 0], [-(ah - rr), nh - rr, 90], [-(ah - rr), -(nh - rr), 180], [ah - rr, -(nh - rr), 270]];
  for (const [cx, cy, a0] of corners) {
    for (let q = 0; q <= 6; q++) {
      const a = (a0 + (90 * q) / 6) * DEG;
      path.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  }
  const prof = [];
  const hb = band / 2, hk = kt / 2, pr = 0.22;
  for (const [cx, cy, a0] of [[hb - pr, hk - pr, 0], [-(hb - pr), hk - pr, 90], [-(hb - pr), -(hk - pr), 180], [hb - pr, -(hk - pr), 270]]) {
    for (let q = 0; q <= 3; q++) {
      const a = (a0 + (90 * q) / 3) * DEG;
      prof.push([cx + pr * Math.cos(a), cy + pr * Math.sin(a)]);
    }
  }
  const pos = [], uv = [];
  const p = [0, 0, 0];
  for (const [pv, pn, nv, nn] of path) {
    for (const [du, dd] of prof) {
      S.map(uk + du, pv + nv * dd, nc + pn + nn * dd, p);
      pos.push(p[0], p[1], p[2]);
      uv.push((pv + pn) * 0.06, du * 0.06);
    }
  }
  const geo = makeGeo(pos, uv, gridIndex(path.length, prof.length, true, true));
  orientClosed(geo);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================== builder

export function buildCase(ctx) {
  const { spec, M, reg, root } = ctx;
  const C = spec.case;
  const Z = spec.z;
  const bz = C.bezel, md = C.middle, cb = C.caseback, cr = C.crystal, fl = C.innerFlange;
  const X = (id) => spec.explode[id] ?? [0, 0, 0];
  const D = (id) => spec.explodeDelay(id);
  // Lite (the leather watch box: every watch at once, dial up on a cushion): only what
  // shows from above — no straps, buckle or spring bars (the box draws its own band), no
  // casing ring, casing clamps, display-back glass or back engraving (all hidden in the
  // cushion) — and half the segments.
  const lite = !!ctx.lite;
  const SEG = lite ? 96 : 192;
  // Casing clamps: head + slotted halves above the clamp tab, which lies on the inner
  // lip of the casing ring (back face at CLAMP_LIP_Z, out to CLAMP_LIP_R).
  const CLAMP_TAB = [-2.2, -2.06];
  const CLAMP_LIP_Z = CLAMP_TAB[1], CLAMP_LIP_R = 12.7;

  const add = (parent, geo, mat, { cast = true, receive = true } = {}) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  };

  // ---------------------------------------------------------------- materials
  const steel = M.steelPolished;
  const darkFlange = M.black.clone();
  darkFlange.color = new THREE.Color(0x404040); // neutral dark grey, as in front.jpg
  darkFlange.roughness = 0.66;
  const blasted = M.steelSatin.clone();
  blasted.roughness = 0.58;
  blasted.anisotropy = 0;
  blasted.color = new THREE.Color(0xb7babe);
  // Sapphire: a specular-only coat, added on top of whatever lies behind it. A
  // transmission material would hide transmissive / transparent parts behind the glass
  // (jewels, printed decals), so the glass only contributes its reflections — which is
  // all a clear, flat sapphire shows anyway.
  const glass = M.sapphire.clone();
  glass.transmission = 0;
  glass.thickness = 0;
  glass.color = new THREE.Color(0x000000);
  glass.specularColor = new THREE.Color(0xe4ebff);
  glass.specularIntensity = 0.24; // anti-reflective coating: ≈ 2 % at normal incidence
  glass.roughness = 0.015;
  glass.transparent = true;
  glass.blending = THREE.AdditiveBlending;
  glass.depthWrite = false;
  // Shell cordovan has no grain at all (it is the dense membrane under the hide, not
  // the grain side), so the pebbled calf maps are dropped: a smooth, waxy, glazed
  // surface whose soft sheen comes from the clear coat.
  const cordovan = M.leather.clone();
  cordovan.normalMap = null;
  cordovan.roughnessMap = null;
  cordovan.color = new THREE.Color(C.strap.colour || 0x141210);
  cordovan.roughness = 0.42;
  cordovan.clearcoat = 0.55;
  cordovan.clearcoatRoughness = 0.18;
  const lining = M.leather.clone();
  lining.color = new THREE.Color(0x2a2b2d);
  lining.roughness = 0.88;
  lining.clearcoat = 0;
  lining.normalScale = new THREE.Vector2(0.7, 0.7);

  // Crystal seat (shared by the bezel and the crystal): the crystal is stepped — its
  // seated part (r cr.radius) sits under the bezel lip, its upper part passes through
  // the lip bore (r bz.chamferInner) and stands 0.10 proud of the bezel.
  const LIP_Z = bz.top - (bz.flatInner - bz.chamferInner) - 0.05; // underside of the bezel lip
  const SEAT_R = cr.radius + 0.02; // bezel wall round the seated part of the crystal

  // ================================================================ middle case
  {
    const object = new THREE.Group();
    root.add(object);
    const rCi = 16.0; // bore below the dial (casing-ring seat)
    const rIn = fl.outer + 0.02; // bore round the inner flange and the dial edge
    const zSeam = md.top, zLedge = Z.dial[0] - 0.03; // ledge just below the dial plate
    const rm = md.outerRadius, hc = 0.06; // hairline chamfer: half of the seam groove
    const body = latheZ([
      [[rCi, md.bottom], [rm - 0.08, md.bottom]],
      [[rm - 0.08, md.bottom], [rm, md.bottom + 0.08]],
      [[rm, md.bottom + 0.08], [rm, zSeam - hc]],
      [[rm, zSeam - hc], [rm - hc, zSeam]],
      [[rm - hc, zSeam], [rIn, zSeam]],
      [[rIn, zSeam], [rIn, zLedge]],
      [[rIn, zLedge], [rCi, zLedge]],
      [[rCi, zLedge], [rCi, md.bottom]],
    ], SEG);
    add(object, body, steel);

    // Inner flange round the dial, seen through the crystal: a matte dark top face that
    // reads as the thin dark band round the dial head-on (r 15.75–16.05 in front.jpg), an
    // outer satin-steel step (to r 16.45, under the bezel lip) that reads as the light grey
    // band between that dark line and the polished bezel, and a satin-steel inner wall:
    // seen at an angle (detail1.jpg, 8–9 o'clock) the wall is a mid-grey band, not black.
    const [fz0, fz1] = fl.z || [Z.dial[1], cr.z[0]];
    const z0 = fz0 + 0.01, z1 = fz1 - 0.01;
    const rStep = fl.darkOuter ?? fl.inner + 0.3;
    const flangeTop = latheZ([
      [[fl.inner, z0], [rStep, z0]],
      [[rStep, z0], [rStep, z1]],
      [[rStep, z1], [fl.inner + 0.06, z1]],
    ], SEG);
    add(object, flangeTop, darkFlange);
    const seatSteel = M.steelSatin.clone();
    seatSteel.roughness = 0.38;
    seatSteel.anisotropy = 0;
    seatSteel.color = new THREE.Color(0xc4c7cb);
    const step = latheZ([
      [[rStep, z0], [fl.outer, z0]],
      [[fl.outer, z0], [fl.outer, z1]],
      [[fl.outer, z1], [rStep, z1]],
    ], SEG);
    add(object, step, seatSteel);
    const flangeWall = latheZ([
      [[fl.inner + 0.06, z1], [fl.inner, z1 - 0.06]],
      [[fl.inner, z1 - 0.06], [fl.inner, z0]],
    ], SEG);
    add(object, flangeWall, seatSteel);

    reg.add({
      id: 'case-body', name: 'Middle case', category: 'case', side: 'both', exposed: true,
      object, explode: X('case-body'), explodeDelay: D('case-body'), priority: 1,
      anchor: [rm * Math.cos(-38 * DEG), rm * Math.sin(-38 * DEG), (md.top + md.bottom) / 2],
      description: 'The polished steel body of the case. Its straight vertical flank gives the Tangente its flat-cylinder look; it carries the lugs and the crown, and a dark inner ring frames the dial under the crystal.',
      facts: {
        Material: '316L stainless steel, polished',
        Diameter: `${(C.radius * 2).toFixed(1)} mm (without crown)`,
        Height: `${C.height.toFixed(1)} mm overall`,
        'Water resistance': '5 atm (splash-proof)',
        Construction: 'Three-part: bezel, middle case, display back',
      },
    });
  }

  // ================================================================ bezel
  {
    const object = new THREE.Group();
    root.add(object);
    const ro = bz.outerRadius, zb = bz.bottom, zt = bz.top, hc = 0.06, rr = 0.2;
    const zCh = zt - (bz.flatInner - bz.chamferInner); // foot of the 45° inner chamfer
    const g = latheZ([
      [[SEAT_R, zb], [ro - hc, zb]],
      [[ro - hc, zb], [ro, zb + hc]],
      [[ro, zb + hc], [ro, zt - rr], ...arc(ro - rr, zt - rr, rr, 0, 90, 6).slice(1), [bz.flatInner, zt]],
      [[bz.flatInner, zt], [bz.chamferInner, zCh]], // polished inner chamfer
      [[bz.chamferInner, zCh], [bz.chamferInner, LIP_Z]],
      [[bz.chamferInner, LIP_Z], [SEAT_R, LIP_Z]], // underside of the lip, on the crystal
      [[SEAT_R, LIP_Z], [SEAT_R, zb]],
    ], SEG);
    add(object, g, steel);
    reg.add({
      id: 'bezel', name: 'Bezel', category: 'case', side: 'front', exposed: true,
      object, explode: spec.explode.bezel ?? X('case-body'), explodeDelay: spec.explode.bezel ? D('bezel') : D('case-body'), priority: 2,
      anchor: [ro * Math.cos(128 * DEG), ro * Math.sin(128 * DEG), zt],
      description: 'The slim polished ring on top of the middle case. Its lip holds the flat sapphire crystal down on its seat; the narrow flat top and the bright inner chamfer frame the dial.',
      facts: { 'Flat top': `${(ro - bz.flatInner).toFixed(2)} mm wide`, Height: `${(zt - zb).toFixed(2)} mm`, Finish: 'Polished' },
    });
  }

  // ================================================================ casing ring
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    // L-shaped section: an inner lip at movement height (its back face carries the two
    // casing clamps, level with the pillar plate's frosted rim) and an outer body up to
    // the case back. A radial slot at 3 o'clock lets the winding stem through. The lip
    // hugs the 23.3 mm pillar plate (0.01 overlap): any visible gap there would show the
    // brass back of the dial as a gold hairline.
    const r0 = spec.movement.radius - 0.01, r1 = 15.98, rS = CLAMP_LIP_R, za = cb.top, zb = -0.2, zL = CLAMP_LIP_Z;
    const sec = [[r0, zL], [rS, zL], [rS, za], [r1, za], [r1, zb], [r0, zb]];
    const gap = 0.75 / r0; // slot half-angle: clears the stem (r 0.45) and its 0.05 offset
    const strips = sec.map((p, i) => [p, sec[(i + 1) % sec.length]]);
    const ring = latheZ(strips, SEG, gap, TAU - gap);
    const tri = THREE.ShapeUtils.triangulateShape(sec.map(([r, z]) => new THREE.Vector2(r, z)), []);
    const cap = (a, nrm) => {
      const pos = [], uv = [], idx = [];
      for (const [r, z] of sec) { pos.push(r * Math.cos(a), r * Math.sin(a), z); uv.push(0, 0); }
      for (const t of tri) idx.push(t[0], t[1], t[2]);
      return orient(makeGeo(pos, uv, idx), () => nrm);
    };
    const caps = [cap(gap, [Math.sin(gap), -Math.cos(gap), 0]), cap(-gap, [Math.sin(gap), Math.cos(gap), 0])];
    add(object, mergeAll([ring, ...caps]), blasted);
    reg.add({
      id: 'casing-ring', name: 'Casing ring', category: 'case', side: 'back', exposed: true,
      object, explode: X('casing-ring'), explodeDelay: D('casing-ring'), priority: 3,
      anchor: [-11.85 * Math.cos(20 * DEG), 11.85 * Math.sin(20 * DEG), zL],
      description: 'A steel spacer ring that centres the 23.3 mm movement in the 35 mm case. The two casing clamps press on its inner lip, and a slot at 3 o’clock lets the winding stem through to the crown.',
      facts: { 'Inner diameter': '23.3 mm', 'Outer diameter': `${(r1 * 2).toFixed(1)} mm`, Finish: 'Sandblasted steel' },
    });
  }

  // ================================================================ lugs
  {
    const object = new THREE.Group();
    root.add(object);
    const lg = C.lug;
    // The spec profile starts at the case flank (y 15.0 = the flank at the lug's inner
    // face). The flank is curved, so at the outer face (x 10.25) it lies 0.8 further in:
    // run the root on into the middle-case wall so the lug fuses with the flank there.
    const yIn = Math.sqrt(md.outerRadius ** 2 - lg.xOuter ** 2) - 0.6;
    const y0 = Math.min(...lg.profile.map(([y]) => y));
    const prof = lg.profile.map(([y, z]) => [y <= y0 + 1e-6 ? Math.min(y, yIn) : y, z]);
    const shape = new THREE.Shape();
    prof.forEach(([y, z], i) => (i ? shape.lineTo(y, z) : shape.moveTo(y, z)));
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(lg.springBar.y, lg.springBar.z, lg.springBar.holeRadius, 0, TAU, true);
    shape.holes.push(hole);
    // polished chamfers on every edge of the band (they catch the light in side.jpg)
    const bt = 0.1;
    const thick = lg.xOuter - lg.xInner;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thick - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt,
      bevelSegments: lite ? 2 : 3, curveSegments: lite ? 12 : 28,
    });
    g.translate(0, 0, bt);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
    const right = g.clone().translate(lg.xInner, 0, 0);
    const left = g.clone().translate(-lg.xOuter, 0, 0);
    const top = mergeAll([right, left]);
    const bottom = top.clone().rotateZ(Math.PI);
    add(object, mergeAll([top, bottom]), steel);
    reg.add({
      id: 'lugs', name: 'Lugs', category: 'case', side: 'both', exposed: true,
      object, explode: X('lugs'), explodeDelay: D('lugs'), priority: 2,
      anchor: [lg.xOuter, (lg.profile[1][0] + lg.profile[2][0]) / 2, (lg.profile[1][1] + lg.profile[2][1]) / 2],
      description: 'Four slender, angular steel lugs, a signature of the Tangente design: each runs straight out from the case, then bends down towards the wrist. They are drilled through, so the spring bars that hold the strap can be pressed out from the side.',
      facts: { 'Lug width': `${C.lugWidth} mm`, 'Lug to lug': `${C.lugToLug.toFixed(1)} mm`, 'Spring-bar holes': `Ø ${(lg.springBar.holeRadius * 2).toFixed(1)} mm, drilled through`, Finish: 'Polished' },
    });
  }

  // ================================================================ spring bars
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const sb = C.lug.springBar;
    const rb = sb.barRadius ?? 0.45; // tube between the lugs
    const tipR = sb.holeRadius - 0.1, xTip = C.lug.xOuter - 0.08, xBody = C.lug.xInner - 0.02;
    const bar = latheZ([
      [[0, -xTip], ...arc(tipR - 0.14, -xTip + 0.14, 0.14, -90, 0, 4), [tipR, -xBody]],
      [[tipR, -xBody], [rb - 0.08, -xBody]],
      [[rb - 0.08, -xBody], ...arc(rb - 0.08, -xBody + 0.08, 0.08, -90, 0, 3).slice(1), [rb, xBody - 0.08], ...arc(rb - 0.08, xBody - 0.08, 0.08, 0, 90, 3).slice(1)],
      [[rb - 0.08, xBody], [tipR, xBody]],
      [[tipR, xBody], ...arc(tipR - 0.14, xTip - 0.14, 0.14, 0, 90, 4), [0, xTip]],
    ], 28);
    bar.rotateY(Math.PI / 2);
    const bars = mergeAll([bar.clone().translate(0, sb.y, sb.z), bar.clone().translate(0, -sb.y, sb.z)]);
    add(object, bars, M.steelSatin);
    reg.add({
      id: 'spring-bars', name: 'Spring bars', category: 'case', side: 'both', exposed: false,
      object, explode: X('spring-bars'), explodeDelay: D('spring-bars'), priority: 3,
      anchor: [0, sb.y, sb.z],
      description: 'Spring-loaded steel bars between each pair of lugs. The strap is wrapped round them; their tips sit in the drilled lug holes, so a pin pushed in from outside releases them.',
      facts: { Diameter: `${(rb * 2).toFixed(1)} mm`, Length: `${C.lugWidth} mm between the lugs`, Material: 'Stainless steel' },
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

    // Faceted flutes, as in the official close-ups (detail1/detail2): every flute is a
    // prism with a broad flat top (≈45 % of the pitch) and two flat flanks meeting in a
    // sharp V groove; polished, so each facet catches the light as one crisp band. The
    // facets keep their own vertices (flat normals); along the crown they follow the
    // stations, which ease the radius down at both ends.
    const depth = cw.rootRadius ? cw.radius - cw.rootRadius : cw.fluteDepth;
    const pitch = TAU / cw.flutes, top = 0.22; // half the flat top, in pitches
    const R0 = cw.radius, Rr = cw.radius - depth;
    const facets = []; // [angle0, r0, angle1, r1]
    for (let i = 0; i < cw.flutes; i++) {
      const c = i * pitch;
      facets.push([c - top * pitch, R0, c + top * pitch, R0]); // flat top
      facets.push([c + top * pitch, R0, c + 0.5 * pitch, Rr]); // flank down into the groove
      facets.push([c + 0.5 * pitch, Rr, c + (1 - top) * pitch, R0]); // and up again
    }
    // fluted body from the neck to the end face; the neck (Ø 2.4) bridges the gap to
    // the case flank and starts just inside it (the flank curves away at y ≠ 0)
    const x0 = cw.neckTo ?? cw.from + 0.22, x1 = cw.to - 0.17;
    const rNeck = cw.neckRadius ?? 1.0;
    const xNeck0 = Math.sqrt(md.outerRadius ** 2 - rNeck ** 2) - 0.03;
    const stations = [[x0, 0.93], [x0 + 0.04, 0.985], [x0 + 0.1, 1], [x1 - 0.16, 1], [x1 - 0.08, 0.985], [x1, 0.95]];
    const ptOn = (x, r, a) => [x, r * Math.cos(a), r * Math.sin(a)];
    const flat = (pos) => { // non-indexed triangles → flat-shaded facets
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
      g.computeVertexNormals();
      return g;
    };
    // quad a-b-c-d, wound so that its normal points along `out`
    const quad = (pos, a, b, c, d, out) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const o = out(a);
      if (nx * o[0] + ny * o[1] + nz * o[2] >= 0) pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      else pos.push(...a, ...c, ...b, ...a, ...d, ...c);
    };
    const pieces = [];
    {
      const pos = [];
      const radial = (p) => [0, p[1], p[2]];
      for (const [a0, r0, a1, r1] of facets) {
        for (let k = 0; k < stations.length - 1; k++) {
          const [xa, sa] = stations[k], [xb, sb] = stations[k + 1];
          quad(pos, ptOn(xa, r0 * sa, a0), ptOn(xa, r1 * sa, a1), ptOn(xb, r1 * sb, a1), ptOn(xb, r0 * sb, a0), radial);
        }
      }
      pieces.push(flat(pos));
    }
    const rFace = cw.faceRadius;
    const xFace = x1 + 0.04;
    const dome = 0.13;
    const domeX = (r) => xFace + dome * (1 - (r / rFace) ** 2);
    // angles of every facet corner: the bevel's inner edge and the face rings share them
    const corner = [];
    for (let i = 0; i < cw.flutes; i++) corner.push((i - top) * pitch, (i + top) * pitch, (i + 0.5) * pitch);
    {
      // polished bevel from the flutes onto the end face: one flat facet per flute face,
      // so every flute ends in an angled facet as on the real crown
      const pos = [];
      const s = stations[stations.length - 1][1];
      for (const [a0, r0, a1, r1] of facets) {
        quad(pos, ptOn(x1, r0 * s, a0), ptOn(x1, r1 * s, a1), ptOn(xFace, rFace, a1), ptOn(xFace, rFace, a0), () => [1, 0, 0]);
      }
      pieces.push(flat(pos));
    }
    {
      // slightly domed end face
      const rings = 10, pos = [], uv = [], N = corner.length;
      for (let j = 0; j <= rings; j++) {
        const r = rFace * (1 - j / rings);
        for (const a of corner) { pos.push(...ptOn(domeX(r), r, a)); uv.push(0, 0); }
      }
      const g = makeGeo(pos, uv, gridIndex(rings + 1, N, false, true));
      pieces.push(orient(g, () => [1, 0, 0]));
    }
    {
      // back face towards the case
      const pos = [];
      const s = stations[0][1];
      for (const [a0, r0, a1, r1] of facets) {
        quad(pos, ptOn(x0, r0 * s, a0), ptOn(x0, r1 * s, a1), ptOn(x0, rNeck, a1), ptOn(x0, rNeck, a0), () => [-1, 0, 0]);
      }
      pieces.push(flat(pos));
    }
    {
      // neck between the fluted body and the case flank (stem hole r 0.45 inside)
      const g = latheZ([
        [[0.45, xNeck0], [rNeck - 0.05, xNeck0]],
        [[rNeck - 0.05, xNeck0], [rNeck, xNeck0 + 0.05], [rNeck, x0]],
      ], lite ? 24 : 48);
      g.rotateY(Math.PI / 2);
      g.rotateX(Math.PI); // keep the lathe seam out of sight
      pieces.push(g);
    }
    add(rotor, mergeAll(pieces), steel);

    // "NOMOS" engraved across the end face: light, widely spaced capitals, ≈4.0 wide with
    // 0.55 caps (side photo, perspective-corrected), cut as a thin line
    const txtOpts = { weight: 300, size: 96, capHeight: cw.textCapHeight ?? 0.55, width: cw.textWidth ?? 4.0 };
    let t = makeTextFit(ctx, cw.text || 'NOMOS', txtOpts);
    const decal = (tw, th, rise) => {
      const nu = 24, nv = 4, pos = [], uv = [];
      for (let i = 0; i <= nu; i++) {
        for (let j = 0; j <= nv; j++) {
          const y = (i / nu - 0.5) * tw, z = (j / nv - 0.5) * th - rise;
          pos.push(domeX(Math.min(rFace, Math.hypot(y, z))) + 0.006, y, z);
          uv.push(i / nu, j / nv);
        }
      }
      return orient(makeGeo(pos, uv, gridIndex(nu + 1, nv + 1, false, false)), () => [1, 0, 0]);
    };
    const textMat = decalMaterial(M.steelDark, t.texture, 0x4c5056, 0.55, 0.6);
    const textMesh = add(rotor, decal(t.w, t.h, t.rise), textMat, { cast: false, receive: false });
    refreshWhenFontReady(t.font, () => {
      const old = t;
      t = makeTextFit(ctx, cw.text || 'NOMOS', txtOpts);
      textMat.map = t.texture;
      textMat.needsUpdate = true;
      textMesh.geometry.dispose();
      textMesh.geometry = decal(t.w, t.h, t.rise);
      old.texture.dispose();
    });

    // crown turns per ratchet (barrel arbor) turn, from the keyless tooth counts
    const kw = spec.keyless;
    const stemPerRatchet = (kw.ratchet.teeth / kw.crownWheel.teeth) * (kw.crownWheel.teeth / kw.windingPinion.teeth);
    const TURNS = spec.barrelTurns * stemPerRatchet;
    const clicks = Math.round(kw.ratchet.teeth / stemPerRatchet);
    // The crown is fixed to the winding stem: rot.stem (about +X) = rot.crownWheel ×
    // crown-wheel/winding-pinion teeth, the same angle the keyless module gives the
    // stem; negative while winding = clockwise seen from the crown end.
    const RES_H = spec.powerReserveHours;
    reg.add({
      id: 'crown', name: 'Crown', category: 'case', side: 'both', exposed: true,
      object, rotor, explode: X('crown'), explodeDelay: D('crown'), priority: 1,
      anchor: [(cw.from + cw.to) / 2 + 0.3, 0, cw.radius],
      description: `Turning the crown winds the mainspring through the winding pinion, crown wheel and ratchet wheel: about ${Math.round(TURNS)} turns from empty, with ${clicks} clicks of the ratchet per turn. Pulled out, it sets the hands and stops the balance, so the seconds hand halts for exact setting (hacking).`,
      facts: {
        Diameter: `${(cw.radius * 2).toFixed(1)} mm`,
        Flutes: String(cw.flutes),
        Type: 'Push-pull, not screw-down',
        'Full wind': `≈ ${Math.round(TURNS)} turns`,
        Signed: 'NOMOS on the end face',
      },
      live: (s) => `${Math.round((s.reserve || 0) * RES_H)} h in reserve`,
      update: (s) => { rotor.rotation.x = s.rot.stem || 0; },
    });
  }

  // ================================================================ crystal
  {
    const object = new THREE.Group();
    root.add(object);
    // stepped disc: seated part under the bezel lip, upper part through the lip bore
    const R = cr.radius, z0 = cr.z[0], z1 = cr.z[1];
    const rL = SEAT_R - 0.04, rU = bz.chamferInner - 0.03, zS = LIP_Z - 0.02, b = 0.04;
    const g = latheZ([
      [[0, z0], [rL * 0.5, z0], [rL - b, z0]],
      [[rL - b, z0], [rL, z0 + b]],
      [[rL, z0 + b], [rL, zS]],
      [[rL, zS], [rU, zS]],
      [[rU, zS], [rU, z1 - b]],
      [[rU, z1 - b], [rU - b, z1]],
      [[rU - b, z1], [rU * 0.5, z1], [0, z1]],
    ], lite ? 64 : 128);
    const mesh = add(object, g, glass, { cast: false, receive: false });
    mesh.renderOrder = 2;
    reg.add({
      id: 'crystal', name: 'Sapphire crystal', category: 'case', side: 'front', exposed: true,
      object, explode: X('crystal'), explodeDelay: D('crystal'), priority: 2,
      anchor: [-7.5, 9.5, z1],
      description: 'A flat crystal of synthetic sapphire, second only to diamond in hardness, so everyday knocks do not scratch it. Being flat, it seals the dial side without distorting the slender hands or the print.',
      facts: { Material: 'Synthetic sapphire', Shape: 'Flat', Diameter: `${(R * 2).toFixed(1)} mm`, Thickness: `${(z1 - z0).toFixed(2)} mm` },
    });
  }

  // ================================================================ case back ring
  {
    const object = new THREE.Group();
    root.add(object);
    // Section: top face (against the middle case) → glass seat → thin lip under the
    // glass with the polished window chamfer → flat polished back face → broad outer
    // bevel → short vertical flank, inset from the middle case.
    const zt = cb.top, zb = cb.bottom, ro = cb.outerRadius;
    const rSeat = (C.backGlass?.radius ?? 12.3) + 0.02, zg = C.backGlass?.z?.[0] ?? (zb + 0.1);
    const rWin = cb.windowChamferOuter ?? cb.aperture + 0.45;
    const zBev = cb.bevelTopZ ?? zb + (ro - cb.chamferRadius);
    const zAp = Math.max(zb + 0.025, zg - 0.035); // inner edge of the window chamfer
    const g = latheZ([
      [[ro, zt], [rSeat, zt]],
      [[rSeat, zt], [rSeat, zg]],
      [[rSeat, zg], [cb.aperture, zg]],
      [[cb.aperture, zg], [cb.aperture, zAp]],
      [[cb.aperture, zAp], [rWin, zb]], // polished window chamfer
      [[rWin, zb], [(rWin + cb.chamferRadius) / 2, zb], [cb.chamferRadius, zb]],
      [[cb.chamferRadius, zb], [ro, zBev]], // broad polished outer bevel
      [[ro, zBev], [ro, zt]],
    ], SEG);
    add(object, g, steel);

    // "TANGENTE <serial>" engraved upright along the 6 o'clock arc, read from the back;
    // the letter spacing is solved so the text fills the measured arc. The cut letters
    // are matte, so on the mirror-polished back they read mid-dark grey (back render).
    const label = `${spec.name.toUpperCase()} ${spec.caseSerial}`;
    if (!lite) {
      const spanDeg = cb.textSpanDeg ? cb.textSpanDeg[1] - cb.textSpanDeg[0] : 50;
      const opts = { weight: 300, size: 96, capHeight: cb.textCapHeight ?? 0.8, width: (cb.textRadius * spanDeg * DEG) };
      let t = makeTextFit(ctx, label, opts);
      const arcText = (tw, th, rise) => {
        const r = cb.textRadius + rise, span = tw / cb.textRadius, segs = 64, pos = [], uv = [];
        const z = zb - 0.004;
        for (let i = 0; i <= segs; i++) {
          const a = -Math.PI / 2 + span / 2 - (span * i) / segs; // reading direction (back view)
          for (const [rr, v] of [[r - th / 2, 1], [r + th / 2, 0]]) {
            pos.push(rr * Math.cos(a), rr * Math.sin(a), z);
            uv.push(i / segs, v);
          }
        }
        return orient(makeGeo(pos, uv, gridIndex(segs + 1, 2, false, false)), () => [0, 0, -1]);
      };
      const engr = decalMaterial(M.steelSatin, t.texture, 0x666a70, 0.62, 0.6);
      const engrMesh = add(object, arcText(t.w, t.h, t.rise), engr, { cast: false, receive: false });
      refreshWhenFontReady(t.font, () => {
        const old = t;
        t = makeTextFit(ctx, label, opts);
        engr.map = t.texture;
        engr.needsUpdate = true;
        engrMesh.geometry.dispose();
        engrMesh.geometry = arcText(t.w, t.h, t.rise);
        old.texture.dispose();
      });
    }

    reg.add({
      id: 'caseback-ring', name: 'Case back', category: 'case', side: 'back', exposed: true,
      object, explode: X('caseback-ring'), explodeDelay: D('caseback-ring'), priority: 2,
      anchor: [(cb.chamferRadius + ro) / 2 * Math.cos(-150 * DEG), (cb.chamferRadius + ro) / 2 * Math.sin(-150 * DEG), (zb + zBev) / 2],
      description: 'The polished steel back ring, pressed into the middle case. It holds the sapphire display glass and carries the engraved model name and the individual case number.',
      facts: { Engraving: label, 'Clear window': `Ø ${(cb.aperture * 2).toFixed(1)} mm`, Fitting: 'Press-fit', Material: '316L stainless steel, polished' },
    });
  }

  // ================================================================ case back glass
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    // seat in the ring is 0.04 wider (no coplanar walls)
    const R = (C.backGlass?.radius ?? 12.3) - 0.02;
    const [z0, z1] = C.backGlass?.z ?? [cb.bottom + 0.1, cb.top];
    const g = latheZ([
      [[0, z0], [R * 0.5, z0], [R - 0.05, z0]],
      [[R - 0.05, z0], [R, z0 + 0.05]],
      [[R, z0 + 0.05], [R, z1 - 0.05]],
      [[R, z1 - 0.05], [R - 0.05, z1]],
      [[R - 0.05, z1], [R * 0.5, z1], [0, z1]],
    ], 128);
    const mesh = add(object, g, glass, { cast: false, receive: false });
    mesh.renderOrder = 2;
    reg.add({
      id: 'caseback-glass', name: 'Sapphire display back', category: 'case', side: 'back', exposed: true,
      object, explode: X('caseback-glass'), explodeDelay: D('caseback-glass'), priority: 2,
      anchor: [7.5, 6.5, z0],
      description: 'A sapphire window in the case back that shows the hand-wound DUW 4001 at work — the ribbed three-quarter plate, the blued screws and the balance — while keeping dust and moisture out.',
      facts: { Material: 'Synthetic sapphire', Diameter: `${((R + 0.02) * 2).toFixed(1)} mm`, Thickness: `${(z1 - z0).toFixed(1)} mm`, 'Clear window': `Ø ${(cb.aperture * 2).toFixed(1)} mm` },
    });
  }

  // ================================================================ casing clamps
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const rH = 0.78, gap = 0.16;
    const half = (side) => {
      const b = Math.acos(clamp(gap / 2 / rH, 0, 1));
      const s = new THREE.Shape();
      if (side > 0) { s.moveTo(gap / 2, -rH * Math.sin(b)); s.absarc(0, 0, rH, -b, b, false); }
      else { s.moveTo(-gap / 2, rH * Math.sin(b)); s.absarc(0, 0, rH, Math.PI - b, Math.PI + b, false); }
      s.closePath();
      return s;
    };
    const hb = 0.025;
    const halves = [1, -1].map((sd) => {
      const g = new THREE.ExtrudeGeometry(half(sd), { depth: 0.1 - 2 * hb, bevelEnabled: true, bevelThickness: hb, bevelSize: hb, bevelOffset: -hb, bevelSegments: 2, curveSegments: 20 });
      g.translate(0, 0, -2.5 + hb);
      return g;
    });
    const shank = latheZ([[[0, -2.4], [rH, -2.4]], [[rH, -2.4], [rH, -2.2]], [[rH, -2.2], [0, -2.2]]], 36);
    const tabShape = new THREE.Shape();
    {
      const x0 = -0.55, x1 = 1.5, hw = 0.6, rr = 0.25;
      tabShape.moveTo(x0 + rr, -hw);
      tabShape.lineTo(x1 - rr, -hw); tabShape.absarc(x1 - rr, -hw + rr, rr, -Math.PI / 2, 0, false);
      tabShape.lineTo(x1, hw - rr); tabShape.absarc(x1 - rr, hw - rr, rr, 0, Math.PI / 2, false);
      tabShape.lineTo(x0 + rr, hw); tabShape.absarc(x0 + rr, hw - rr, rr, Math.PI / 2, Math.PI, false);
      tabShape.lineTo(x0, -hw + rr); tabShape.absarc(x0 + rr, -hw + rr, rr, Math.PI, 1.5 * Math.PI, false);
    }
    const tab = new THREE.ExtrudeGeometry(tabShape, { depth: CLAMP_TAB[1] - CLAMP_TAB[0], bevelEnabled: false, curveSegments: 8 });
    tab.translate(0, 0, CLAMP_TAB[0]);
    // threaded shank down into the pillar plate's clamp hole (r 0.25, frame module)
    const thread = latheZ([[[0.23, CLAMP_TAB[1]], [0.23, -0.6]], [[0.23, -0.6], [0, -0.6]]], 16);
    const heads = [], tabs = [];
    const slotAngles = [62, -88];
    spec.frame.clampNotches.forEach(([x, y], i) => {
      const psi = Math.atan2(y, x);
      const slot = (slotAngles[i % 2] * DEG);
      heads.push(mergeAll([...halves.map((h) => h.clone()), shank.clone(), thread.clone()]).rotateZ(slot).translate(x, y, 0));
      tabs.push(tab.clone().rotateZ(psi).translate(x, y, 0));
    });
    add(object, mergeAll(heads), M.steelPinion);
    add(object, mergeAll(tabs), M.steelSatin);
    const [ax, ay] = spec.frame.clampNotches[1] || spec.frame.clampNotches[0];
    reg.add({
      id: 'case-clamps', name: 'Casing clamps', category: 'case', side: 'back', exposed: true,
      object, explode: X('case-clamps'), explodeDelay: D('case-clamps'), priority: 2,
      anchor: [ax, ay, -2.5],
      description: 'Two slotted steel casing screws sit in notches at the edge of the movement and thread into the pillar plate. The small clamps under their heads press on the casing ring, so the movement cannot shift in the case when the crown is pushed, pulled or turned.',
      facts: { Count: '2', Screws: 'Slotted, steel', Position: '12:30 and 6:20 seen from the back' },
    });
  }

  // ================================================================ straps
  if (lite) return; // the watch box draws its own band (straps, buckle: not built)
  const sb = C.lug.springBar;
  const strapW = C.strap.width - 0.15, strapWb = C.strap.widthAtBuckle;
  const tStrap0 = C.strap.thickness ?? 3.0, tStrap1 = C.strap.thicknessAtEnd ?? tStrap0 - 0.5;
  const top = makeStrap({
    sgn: 1, L: 60, th0: -10 * DEG, th1: -38 * DEG, y0: sb.y, z0: sb.z,
    widthAt0: strapW, widthAtL: strapWb, endType: 'round', holes: [24.5, 30.5, 36.5, 42.5, 48.5], t0: tStrap0, tEnd: tStrap1,
  });
  const bot = makeStrap({
    sgn: -1, L: 48, th0: -10 * DEG, th1: -34 * DEG, y0: -sb.y, z0: sb.z,
    widthAt0: strapW, widthAtL: strapWb, endType: 'fold', foldLen: 12.6, t0: tStrap0, tEnd: tStrap1,
  });
  const strapFacts = (extra) => ({ Leather: 'Horween Genuine Shell Cordovan', Colour: 'Black', Width: '18 mm at the lugs, 16 mm at the buckle', ...extra });

  {
    const object = new THREE.Group();
    root.add(object);
    add(object, top.geoL, cordovan);
    add(object, top.geoB, lining);
    // edge stitching from the lug end to where the rounded tip begins
    add(object, stitchGeometry(top, 3.4, top.L - C.strap.widthAtBuckle / 2 - 1.2, 1.0), M.stitch, { cast: false });
    const a = top.map(13, 0, top.topN(13, 0));
    reg.add({
      id: 'strap-top', name: 'Strap (12 o’clock)', category: 'case', side: 'both', exposed: true,
      object, explode: X('strap-top'), explodeDelay: D('strap-top'), priority: 2,
      anchor: a,
      description: 'The longer half of the strap, in black Horween shell cordovan: the dense membrane under a horse’s hide, tanned for months in Chicago. It has no grain and polishes to a deep, glassy shine; its five punched holes take the buckle tang.',
      facts: strapFacts({ Holes: '5', Lining: 'Suede-finished leather' }),
    });
  }

  {
    const object = new THREE.Group();
    root.add(object);
    add(object, bot.geoL, cordovan);
    add(object, bot.geoB, lining);
    add(object, stitchGeometry(bot, 3.4, bot.L - 12.6 - 2.6, 1.0), M.stitch, { cast: false });
    // fixed and floating keepers round the folded end
    add(object, mergeAll([keeperGeometry(bot, bot.L - 5.2), keeperGeometry(bot, bot.L - 10.6)]), cordovan);
    const a = bot.map(13, 0, bot.topN(13, 0));
    reg.add({
      id: 'strap-bottom', name: 'Strap (6 o’clock)', category: 'case', side: 'both', exposed: true,
      object, explode: X('strap-bottom'), explodeDelay: D('strap-bottom'), priority: 2,
      anchor: a,
      description: 'The buckle half of the shell cordovan strap. Its end is folded round the buckle pin and held by a fixed and a floating keeper, which also trap the tip of the other strap half.',
      facts: strapFacts({ Keepers: 'One fixed, one floating' }),
    });
  }

  // ================================================================ buckle
  {
    const object = new THREE.Group();
    const { A, T, N } = bot.frame(bot.ub);
    const p = bot.map(bot.ub, 0, bot.ncOf(bot.ub));
    object.position.set(p[0], p[1], p[2]);
    object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(A, T, N));
    root.add(object);

    const xo = 9.7, xi = 8.15, yb = -0.1, rb = (xo - xi) / 2, yf = 10.4, yfi = 8.4, rco = 2.4, rci = 0.8;
    const cxA = (xo + xi) / 2;
    const s = new THREE.Shape();
    s.moveTo(xi, yb);
    s.absarc(cxA, yb, rb, Math.PI, TAU, false);
    s.lineTo(xo, yf - rco);
    s.absarc(xo - rco, yf - rco, rco, 0, Math.PI / 2, false);
    s.lineTo(-(xo - rco), yf);
    s.absarc(-(xo - rco), yf - rco, rco, Math.PI / 2, Math.PI, false);
    s.lineTo(-xo, yb);
    s.absarc(-cxA, yb, rb, Math.PI, TAU, false);
    s.lineTo(-xi, yfi - rci);
    s.absarc(-(xi - rci), yfi - rci, rci, Math.PI, Math.PI / 2, true);
    s.lineTo(xi - rci, yfi);
    s.absarc(xi - rci, yfi - rci, rci, Math.PI / 2, 0, true);
    s.lineTo(xi, yb);
    const fz = 1.6, fb = 0.25;
    const frame = new THREE.ExtrudeGeometry(s, {
      depth: fz - 2 * fb, bevelEnabled: true, bevelThickness: fb, bevelSize: fb, bevelOffset: -fb, bevelSegments: 3, curveSegments: 18,
    });
    frame.translate(0, 0, -fz / 2 + fb);
    const pin = latheZ([
      [[0, -9.3], [0.42, -9.3]],
      [[0.42, -9.3], [0.42, 9.3]],
      [[0.42, 9.3], [0, 9.3]],
    ], 20);
    pin.rotateY(Math.PI / 2);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.9, 1.45),
      new THREE.Vector3(0, 0.2, 2.2),
      new THREE.Vector3(0, 2.4, 2.05),
      new THREE.Vector3(0, 8.6, 1.18),
      new THREE.Vector3(0, 9.6, 1.1),
      new THREE.Vector3(0, 10.25, 0.85),
      new THREE.Vector3(0, 10.62, 0.42),
    ], false, 'centripetal');
    const tang = new THREE.TubeGeometry(curve, 72, 0.3, 14, false);
    const tip = new THREE.SphereGeometry(0.3, 14, 8).translate(0, 10.62, 0.42);
    const tangAll = mergeAll([tang, tip]).scale(1.45, 1, 1);
    add(object, mergeAll([frame, pin, tangAll]), steel);

    reg.add({
      id: 'buckle', name: 'Tang buckle', category: 'case', side: 'both', exposed: true,
      object, explode: X('buckle'), explodeDelay: D('buckle'), priority: 3,
      anchor: [0, yf - 0.6, fz / 2],
      description: 'A polished steel pin buckle. The strap end is folded round its pin; the tang passes through one of the five holes of the other strap half to close the strap.',
      facts: { Type: 'Tang (pin) buckle', 'Strap width': '16 mm', Material: '316L stainless steel, polished' },
    });
  }
}
