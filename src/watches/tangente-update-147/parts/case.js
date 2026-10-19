// CASE of the NOMOS Tangente neomatik 38 Update ref. 147: polished three-part case
// (bezel / middle case with the four angular drilled lugs / snap-on display back with
// "TANGENTE {caseSerial}"), flat sapphire crystal (AR inside only), the light satin flange
// round the dial, casing ring + casing screw holding the Ø 34 movement, the signed
// 22-flute crown, spring bars, the black Horween shell-cordovan rembordé strap and the
// square winged pin buckle.
// Registers: case-body, bezel, crystal, casing-ring, case-clamps, lugs, spring-bars, crown,
//   caseback-ring, caseback-glass, strap-top, strap-bottom, buckle.
// Reads: SPEC.case, SPEC.z, SPEC.frame.casingScrew, SPEC.explode / explodeDelay, and
//   parts/finish.js manualStemAngle() for the crown. See research/tangente-update-147/plan.md
//   §4.1 and exterior.md §2 / §5.
//
// Frame: mm, +Z out of the dial, 12 o'clock = +Y, crown (3 o'clock) = +X, z = 0 the pillar
// plate's dial face. Every dimension comes from SPEC; the few values SPEC does not hold are
// module-local constants below, each with its reason.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { manualStemAngle } from './finish.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------------ local constants
// (values SPEC does not define; each derived from the official renders or from a
// clearance rule)
const HC = 0.05; // hairline seam: each side of the V groove is a 0.05 × 45° chamfer
const LIP_Z = 2.42; // underside of the bezel lip over the crystal's seated flange (validated by check.mjs)
const CRYSTAL_FLANGE_TOP = 2.40; // top of the crystal's seated flange (validated)
const BEZEL_BORE = 18.115; // bezel lip bore round the crystal's upper part (crystal r 18.10)
const BEZEL_WALL = 18.47; // bezel inner wall round the crystal flange (seat r 18.45 + 0.02)
const COLLAR_R = 18.46; // middle-case collar inside the bezel, carrying the crystal seat ledge
const STEM_HOLE_R = 0.52; // crown-tube bore through the middle case (stem r 0.45; check.mjs cut ±0.53)
const TUBE = { rIn: STEM_HOLE_R, rOut: 0.85, x0: 19.05, x1: 19.32 }; // pressed-in crown tube, its end visible in the 0.1 gap
const CROWN_SKIRT_R0 = 2.40; // radius of the skirt cone at the case side (front render: the dark skirt spans ±2.4 at x 19.35)
const CROWN_END = { x0: 21.42, x1: 21.50, r1: 2.58, faceR: 2.42, round: 0.16, dome: 0.06 }; // facet ends, then the domed button
const CROWN_FLAT = 0.2; // half-width of each flute's flat land, in pitches (front render: wide lands, narrow V grooves)
const STRAP = {
  noseR: 1.75, // the padded strap end wraps the spring bar (side photo: top ≈ −0.3, bottom ≈ −3.8 at the bar)
  holeR: 0.75, // punched holes Ø 1.5 (strap photo, 15.5 px/mm)
  holeFromTip: 22.6, holePitch: 6.35, // first hole 22.6 from the tip, then every 6.35 (strap photo)
  dome: 0.13, // padded, slightly crowned top
  groove: 0.04, grooveW: 0.34, // the stitch line pulls the top leather down a little
  curl: -32 * DEG, // the open strap halves bend gently away from the case back (as on the 139)
  flat: 9.0, // leaves the spring bar horizontally for 9 mm, past the lug tips
  foldLen: 14, foldExtra: 1.0, // buckle end folded under itself round the buckle pin
  keepers: [9.6, 21.5], // fixed and floating keeper, distance from the buckle-side end
};
const BUCKLE = {
  pinR: 0.5, back: 6.6, // the frame reaches 6.6 behind the pin (pin ≈ 40 % of the length from the back bar)
  cornerR: 0.75, innerCornerR: 0.45, concave: 0.28, // concave side bars, flared corners (product photo)
  bevel: 0.16,
  tongueR: 0.36, tongueFlat: 1.65, // flattened wire, ≈ 1.2 wide
  textWidth: 11.0, textCap: 1.0, // "NOMOS" on the front bar: 54 % of the frame width, cap ≈ 1.0 (strap photo, foreshortening corrected)
};

// ------------------------------------------------------------------ mesh builder
// Collects vertices with explicit normals; every triangle is wound so that its face
// normal agrees with the given direction (or with its vertex normals), so surfaces can
// be assembled without bookkeeping of winding order.
class MeshBuilder {
  constructor() { this.p = []; this.n = []; this.t = []; this.i = []; }
  get count() { return this.p.length / 3; }
  vert(x, y, z, nx = 0, ny = 0, nz = 1, u = 0, v = 0) {
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.t.push(u, v);
    return this.p.length / 3 - 1;
  }
  tri(a, b, c, ex, ey, ez) {
    const P = this.p;
    const ax = P[3 * a], ay = P[3 * a + 1], az = P[3 * a + 2];
    const ux = P[3 * b] - ax, uy = P[3 * b + 1] - ay, uz = P[3 * b + 2] - az;
    const vx = P[3 * c] - ax, vy = P[3 * c + 1] - ay, vz = P[3 * c + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (ex === undefined) {
      const N = this.n;
      ex = N[3 * a] + N[3 * b] + N[3 * c];
      ey = N[3 * a + 1] + N[3 * b + 1] + N[3 * c + 1];
      ez = N[3 * a + 2] + N[3 * b + 2] + N[3 * c + 2];
    }
    if (nx * ex + ny * ey + nz * ez < 0) this.i.push(a, c, b);
    else this.i.push(a, b, c);
  }
  quad(a, b, c, d, ex, ey, ez) {
    this.tri(a, b, c, ex, ey, ez);
    this.tri(a, c, d, ex, ey, ez);
  }
  geometry(computeNormals = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    g.setIndex(this.i);
    if (computeNormals) g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

// Angles k·(a1 − a0)/segs + a0, k = 0 … segs.
function angles(segs, a0 = 0, a1 = TAU) {
  const out = [];
  for (let k = 0; k <= segs; k++) out.push(a0 + ((a1 - a0) * k) / segs);
  return out;
}

// Surface of revolution about +Z. `strip` is a polyline of [r, z] points ordered so the
// solid lies on the LEFT of the direction of travel (r to the right, z up); normals then
// point out of the solid and are smooth along the strip (strips meet at crisp edges).
// thetas: the angle list (the caller closes the ring by ending at a0 + 2π).
// gap(r): optional slot — each point then sweeps from gap(r) to 2π − gap(r), so a slot
// of constant width (y = ±w) is cut when gap(r) = asin(w / r).
function lathe(mb, strip, thetas, { gap = null, uvR = 0, uvS = 0.1 } = {}) {
  const n = strip.length;
  const nr = [];
  const len = [0];
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    if (i > 0) {
      const dr = strip[i][0] - strip[i - 1][0], dz = strip[i][1] - strip[i - 1][1];
      const l = Math.hypot(dr, dz) || 1;
      x += dz / l; y -= dr / l;
      len.push(len[i - 1] + l);
    }
    if (i < n - 1) {
      const dr = strip[i + 1][0] - strip[i][0], dz = strip[i + 1][1] - strip[i][1];
      const l = Math.hypot(dr, dz) || 1;
      x += dz / l; y -= dr / l;
    }
    const l = Math.hypot(x, y) || 1;
    nr.push([x / l, y / l]);
  }
  const base = mb.count;
  const K = thetas.length;
  const t0 = thetas[0], tSpan = thetas[K - 1] - thetas[0];
  for (let k = 0; k < K; k++) {
    for (let i = 0; i < n; i++) {
      let a = thetas[k];
      if (gap) {
        const g = gap(strip[i][0]);
        a = g + (TAU - 2 * g) * ((thetas[k] - t0) / tSpan);
      }
      const c = Math.cos(a), s = Math.sin(a), r = strip[i][0];
      mb.vert(r * c, r * s, strip[i][1], nr[i][0] * c, nr[i][0] * s, nr[i][1], a * (uvR || r) * uvS, len[i] * uvS);
    }
  }
  for (let k = 0; k < K - 1; k++) {
    for (let i = 0; i < n - 1; i++) {
      const a = base + k * n + i, b = base + (k + 1) * n + i;
      mb.quad(a, b, b + 1, a + 1);
    }
  }
  return base;
}

// [r, z] points on a circular arc (degrees, CCW), centre (cr, cz).
function arc(cr, cz, rad, a0, a1, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps) * DEG;
    pts.push([cr + rad * Math.cos(a), cz + rad * Math.sin(a)]);
  }
  return pts;
}

// Fillet the corners of a closed polygon; radii[i] = 0 keeps vertex i sharp. Works for
// convex and concave corners alike.
function filletPolygon(pts, radii, steps = 8) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], r = radii[i] || 0;
    if (r <= 0) { out.push(p); continue; }
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    let u1x = a[0] - p[0], u1y = a[1] - p[1], u2x = b[0] - p[0], u2y = b[1] - p[1];
    const l1 = Math.hypot(u1x, u1y), l2 = Math.hypot(u2x, u2y);
    u1x /= l1; u1y /= l1; u2x /= l2; u2y /= l2;
    const th = Math.acos(clamp(u1x * u2x + u1y * u2y, -1, 1));
    const d = Math.min(r / Math.tan(th / 2), 0.45 * l1, 0.45 * l2);
    const rr = d * Math.tan(th / 2);
    let bx = u1x + u2x, by = u1y + u2y;
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl; by /= bl;
    const cd = rr / Math.sin(th / 2);
    const cx = p[0] + bx * cd, cy = p[1] + by * cd;
    const t1 = [p[0] + u1x * d, p[1] + u1y * d], t2 = [p[0] + u2x * d, p[1] + u2y * d];
    const a0 = Math.atan2(t1[1] - cy, t1[0] - cx);
    let da = Math.atan2(t2[1] - cy, t2[0] - cx) - a0;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    for (let k = 0; k <= steps; k++) {
      const ang = a0 + (da * k) / steps;
      out.push([cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)]);
    }
  }
  return out;
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
  const m = mergeGeometries(gs, false);
  m.computeBoundingSphere();
  return m;
}

function flipIndex(geo) {
  const ix = geo.index.array;
  for (let t = 0; t < ix.length; t += 3) {
    const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp;
  }
  geo.index.needsUpdate = true;
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

// Grid indices for an (nu × nv) vertex grid, optionally closed in either direction.
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

// Stitch two closed vertex loops (inner A, outer B) that wind round a common centre with
// known polar angles into a band of triangles (the classic contour zipper).
function zipLoops(mb, A, angA, B, angB) {
  const unwrap = (ids, ang) => {
    let s = 0;
    for (let k = 1; k < ang.length; k++) if (ang[k] < ang[s]) s = k;
    const outI = [], outA = [];
    for (let k = 0; k < ids.length; k++) {
      const q = (s + k) % ids.length;
      let a = ang[q];
      while (outA.length && a < outA[outA.length - 1]) a += TAU;
      outI.push(ids[q]);
      outA.push(a);
    }
    return [outI, outA];
  };
  const [ia, aa] = unwrap(A, angA);
  const [ib, ab] = unwrap(B, angB);
  const nA = ia.length, nB = ib.length;
  const nextA = (k) => (k + 1 < nA ? aa[k + 1] : aa[0] + TAU);
  const nextB = (k) => (k + 1 < nB ? ab[k + 1] : ab[0] + TAU);
  let i = 0, j = 0;
  while (i < nA || j < nB) {
    if (j >= nB || (i < nA && nextA(i) <= nextB(j))) {
      mb.tri(ia[i], ia[(i + 1) % nA], ib[j % nB]);
      i++;
    } else {
      mb.tri(ia[i % nA], ib[(j + 1) % nB], ib[j]);
      j++;
    }
  }
}

// Cylinder r = R, z0 … z1, all the way round, with the round stem hole (radius hr, centre
// z = hz) through it at θ = 0 (3 o'clock). A lathe covers the angles outside a narrow
// patch; inside the patch, rings spread from the hole and are zipped to the patch border,
// whose vertices coincide with the lathe's edge columns and with the neighbouring
// full-circle strips (no T-junctions). side = +1: normals outward, −1: inward (a bore).
// Returns the hole loop's vertex ids (nh points at φ_k = 2πk/nh round the stem axis).
function cylinderWithHole(mb, R, z0, z1, segs, hz, hr, nh, side) {
  const dA = TAU / segs;
  const m = Math.max(1, Math.round(1.25 / (R * dA)));
  const S = R * m * dA;
  const nV = 6;
  const zs = [];
  for (let k = 1; k <= nV; k++) zs.push(z0 + ((z1 - z0) * k) / (nV + 1));
  // lathe outside the patch
  {
    const strip = side > 0 ? [[R, z0], ...zs.map((z) => [R, z]), [R, z1]] : [[R, z1], ...zs.slice().reverse().map((z) => [R, z]), [R, z0]];
    lathe(mb, strip, angles(segs - 2 * m, m * dA, (segs - m) * dA));
  }
  const onCyl = (s, z) => {
    const th = s / R, c = Math.cos(th), sn = Math.sin(th);
    return mb.vert(R * c, R * sn, z, side * c, side * sn, 0, s * 0.1, z * 0.1);
  };
  // patch border, counter-clockwise in (s, z)
  const border = [];
  for (let k = -m; k <= m; k++) border.push([R * k * dA, z0]);
  for (const z of zs) border.push([S, z]);
  for (let k = m; k >= -m; k--) border.push([R * k * dA, z1]);
  for (let q = zs.length - 1; q >= 0; q--) border.push([-S, zs[q]]);
  const B = border.map(([s, z]) => onCyl(s, z));
  const angB = border.map(([s, z]) => Math.atan2(z - hz, s));
  // rings round the hole (circles round the stem axis, projected onto the cylinder)
  const radii = [hr, hr + 0.2, hr + 0.45];
  const rings = radii.map((rr) => {
    const ids = [], ang = [];
    for (let k = 0; k < nh; k++) {
      const ph = (k / nh) * TAU;
      const y = rr * Math.cos(ph), z = hz + rr * Math.sin(ph);
      const s = R * Math.asin(y / R);
      ids.push(onCyl(s, z));
      ang.push(Math.atan2(z - hz, s));
    }
    return { ids, ang };
  });
  for (let q = 0; q < rings.length - 1; q++) {
    const A = rings[q].ids, C = rings[q + 1].ids;
    for (let k = 0; k < nh; k++) mb.quad(A[k], A[(k + 1) % nh], C[(k + 1) % nh], C[k]);
  }
  zipLoops(mb, rings[rings.length - 1].ids, rings[rings.length - 1].ang, B, angB);
  return rings[0].ids;
}

// ------------------------------------------------------------------ engraving glyphs
// Monoline stroke glyphs in a unit box (cap height 1, baseline 0): a light DIN-like set
// for the case-back engraving ("TANGENTE" + any serial number) and the geometric NOMOS
// wordmark (pointed M) used on the crown and the buckle. Re-derived for this watch from
// the official renders (back.jpg, detail5.jpg, buckle photo).
function arcPts(cx, cy, rx, ry, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}
function dinGlyph(ch) {
  switch (ch) {
    case 'A': return { w: 0.66, p: [[[0, 0], [0.33, 1], [0.66, 0]], [[0.099, 0.3], [0.561, 0.3]]] };
    case 'E': return { w: 0.52, p: [[[0.52, 1], [0, 1], [0, 0], [0.52, 0]], [[0, 0.52], [0.46, 0.52]]] };
    case 'G': return {
      w: 0.64,
      p: [[...arcPts(0.32, 0.68, 0.32, 0.32, 28, 180, 18), ...arcPts(0.32, 0.32, 0.32, 0.32, 180, 360, 20), [0.64, 0.46], [0.36, 0.46]]],
    };
    case 'N': return { w: 0.62, p: [[[0, 0], [0, 1], [0.62, 0], [0.62, 1]]] };
    case 'T': return { w: 0.6, p: [[[0, 1], [0.6, 1]], [[0.3, 1], [0.3, 0]]] };
    case '0': return { w: 0.56, p: [[...arcPts(0.28, 0.72, 0.28, 0.28, 0, 180, 16), ...arcPts(0.28, 0.28, 0.28, 0.28, 180, 360, 16), [0.56, 0.72]]] };
    case '1': return { w: 0.34, p: [[[0.02, 0.8], [0.27, 1], [0.27, 0]]] };
    case '2': return { w: 0.56, p: [[...arcPts(0.28, 0.72, 0.28, 0.28, 160, -38, 20), [0, 0], [0.56, 0]]] };
    case '3': return { w: 0.56, p: [[...arcPts(0.28, 0.77, 0.23, 0.23, 155, -90, 18), ...arcPts(0.28, 0.27, 0.27, 0.27, 90, -152, 20)]] };
    case '4': return { w: 0.58, p: [[[0.42, 0], [0.42, 1], [0, 0.32], [0.58, 0.32]]] };
    case '5': return { w: 0.56, p: [[[0.5, 1], [0.08, 1], [0.08, 0.547], ...arcPts(0.28, 0.31, 0.31, 0.31, 130.2, -148, 22)]] };
    case '6': return { w: 0.56, p: [[...arcPts(0.28, 0.31, 0.29, 0.31, 0, 360, 28)], [[0.45, 1], [0.05, 0.43]]] };
    case '7': return { w: 0.54, p: [[[0, 1], [0.54, 1], [0.16, 0]]] };
    case '8': return { w: 0.56, p: [[...arcPts(0.28, 0.765, 0.22, 0.235, 0, 360, 24)], [...arcPts(0.28, 0.27, 0.27, 0.27, 0, 360, 28)]] };
    case '9': {
      const g = dinGlyph('6');
      return { w: g.w, p: g.p.map((path) => path.map(([x, y]) => [g.w - x, 1 - y])) };
    }
    case ' ': return { w: 0.3, p: [] };
    default: return { w: 0.5, p: [] };
  }
}
function nomosGlyph(ch) {
  switch (ch) {
    case 'N': return { w: 0.86, p: [[[0, 0], [0, 1], [0.86, 0], [0.86, 1]]] };
    case 'O': return { w: 1.0, p: [[...arcPts(0.5, 0.5, 0.5, 0.515, 0, 360, 48)]] };
    case 'M': return { w: 1.0, p: [[[0, 0], [0, 1], [0.5, 0.02], [1.0, 1], [1.0, 0]]] };
    case 'S': return { w: 0.74, p: [[...arcPts(0.37, 0.75, 0.35, 0.25, 22, 270, 22), ...arcPts(0.37, 0.25, 0.37, 0.25, 90, -158, 24)]] };
    default: return dinGlyph(ch);
  }
}

// Draws `text` into a canvas (white strokes on transparent) with the letter spacing solved
// so the inked text is `width` cap heights long. Returns the canvas and the layout in
// cap-height units (the decal is sized as canvas width/height × cap height in mm).
function glyphCanvas(text, { style = 'din', stroke = 0.1, width = null, gap = 0.25, ppe = 160 }) {
  const glyph = style === 'nomos' ? nomosGlyph : dinGlyph;
  const gs = [...text].map(glyph);
  const sum = gs.reduce((s, g) => s + g.w, 0);
  const n = gs.length;
  const g0 = width && n > 1 ? Math.max(0.05, (width - stroke - sum) / (n - 1)) : gap;
  const ink = sum + g0 * (n - 1) + stroke;
  const pad = 0.35;
  const W = ink + 2 * pad, H = 1 + 2 * pad;
  const k = Math.min(ppe, 2048 / W); // px per cap height (≤ 2048 px wide)
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * k);
  c.height = Math.ceil(H * k);
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.strokeStyle = '#ffffff';
  g.lineWidth = stroke * k;
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
  g.miterLimit = 2.2;
  let x = pad + stroke / 2;
  for (const gl of gs) {
    for (const path of gl.p) {
      g.beginPath();
      path.forEach(([px, py], i) => {
        const X = (x + px) * k, Y = (pad + 1 - py) * k;
        if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
      });
      const f = path[0], l = path[path.length - 1];
      if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-3) g.closePath();
      g.stroke();
    }
    x += gl.w + g0;
  }
  return { canvas: c, W, H, ink };
}

function glyphTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Engraved / printed decal: the glyph alpha over a matte, darker steel.
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

// ------------------------------------------------------------------ strap generator
// A strap half is generated in its own parameter space — u along the centre line (u = 0
// at the spring bar, u = L at the end), v across, n through the thickness — and bent onto
// a centre line that leaves the spring bar horizontally and then curls gently away from
// the case back. (u, v, n) maps to the right-handed frame (A across, T along, N up).
// The cross-section is rembordé: the top leather is turned round the edges onto the
// lining, so the edges are rounded (no cut edge), the top is slightly crowned and the
// stitch line sits in a shallow groove 1.5 from the edge. The end over the spring bar is
// padded and wraps the bar; punched holes are real holes with walls.
function makeStrap(o) {
  const { sgn, L } = o;
  const ncBar = o.zBar - o.zMid; // the spring bar's axis, above the strap's mid-plane
  const R0 = o.noseR;
  const tAt = (u) => lerp(o.t0, o.t1, smooth(8, L, u));
  const foldAdd = (u) => (o.end === 'fold' ? o.foldExtra * smooth(L - o.foldLen - 1.6, L - o.foldLen, u) : 0);
  const topB = (u) => (u <= 0 ? ncBar + Math.sqrt(Math.max(0, R0 * R0 - u * u)) : lerp(ncBar + R0, tAt(u) / 2, smooth(0, 7.5, u)));
  const botB = (u) => (u <= 0 ? ncBar - Math.sqrt(Math.max(0, R0 * R0 - u * u)) : lerp(ncBar - R0, -tAt(u) / 2, smooth(0, 3.5, u)) - foldAdd(u));
  // buckle end: the leather is folded round the buckle pin (a nose round the pin)
  let ub = L, Rb = 0, ncE = 0;
  if (o.end === 'fold') {
    Rb = (topB(L) - botB(L)) / 2;
    for (let k = 0; k < 4; k++) { ub = L - Rb; Rb = (topB(ub) - botB(ub)) / 2; }
    ub = L - Rb;
    ncE = (topB(ub) + botB(ub)) / 2;
  }
  const top = (u) => (o.end === 'fold' && u > ub ? ncE + Math.sqrt(Math.max(0, Rb * Rb - (u - ub) ** 2)) : topB(u));
  const bot = (u) => (o.end === 'fold' && u > ub ? ncE - Math.sqrt(Math.max(0, Rb * Rb - (u - ub) ** 2)) : botB(u));
  const wAt = (u) => lerp(o.w0, o.w1, clamp(u / o.uTaper, 0, 1));
  const Rend = wAt(L) / 2;
  const uE = L - Rend;
  const halfW = (u) => {
    if (o.end === 'round' && u > uE) return Rend * Math.sqrt(Math.max(0, 1 - ((u - uE) / Rend) ** 2));
    return wAt(Math.max(0, u)) / 2;
  };

  // centre line: horizontal over the bar and past the lug tips, then a gentle curl
  const theta = (u) => (u <= o.uFlat ? 0 : o.curl * Math.pow((u - o.uFlat) / (L - o.uFlat), 1.6));
  const step = 0.05;
  const uMin = -R0 - 0.5;
  const cnt = Math.ceil((L + 0.6 - uMin) / step) + 1;
  const PY = new Float64Array(cnt), PZ = new Float64Array(cnt);
  const i0 = Math.round(-uMin / step);
  PY[i0] = o.yBar; PZ[i0] = o.zMid;
  for (let i = i0 + 1; i < cnt; i++) {
    const t = theta(uMin + (i - 0.5) * step);
    PY[i] = PY[i - 1] + sgn * Math.cos(t) * step;
    PZ[i] = PZ[i - 1] + Math.sin(t) * step;
  }
  for (let i = i0 - 1; i >= 0; i--) { PY[i] = PY[i + 1] - sgn * step; PZ[i] = PZ[i + 1]; }
  function map(u, v, n, out = [0, 0, 0]) {
    const f = (u - uMin) / step;
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

  // ---- the stitch line (groove centre), |v| as a function of u
  const inset = o.inset;
  const vStitch = (u) => {
    if (o.end === 'round' && u > uE) return Math.sqrt(Math.max(0, (Rend - inset) ** 2 - (u - uE) ** 2));
    return halfW(u) - inset;
  };

  // ---- cross-section
  const W2 = STRAP.grooveW;
  const MM = 7, MO = 2, Q = 6; // main columns, bead columns, corner points
  const J = 1 + 2 * (2 + MM + 5 + MO);
  const P = 2 * J + 4 * Q;
  const jc = (J - 1) / 2;
  function sect(u) {
    const a = halfW(u), t = top(u), b = bot(u);
    const h = Math.max(0, t - b);
    const rT = Math.min(0.46 * h, 0.95, 0.62 * a), rB = Math.min(0.3 * h, 0.5, 0.36 * a);
    const vT = Math.max(0, a - rT), vB = Math.max(0, a - rB);
    let vs = Math.min(vStitch(u), vT - W2 - 0.08);
    const gd = STRAP.groove * smooth(0.6, 2.2, vs) * smooth(0.3, 0.9, h);
    vs = Math.max(0, vs);
    const c2 = Math.min(1.4, Math.max(0, (vs - W2) * 0.55)), c1 = c2 / 2;
    // top-face columns, centre outwards (one side)
    const side = [c1, c2];
    const m0 = c2, m1 = Math.max(c2, vs - W2);
    for (let q = 1; q <= MM; q++) side.push(m0 + ((m1 - m0) * q) / (MM + 1));
    side.push(vs - W2, vs - W2 / 2, vs, vs + W2 / 2, vs + W2);
    for (let q = 1; q <= MO; q++) side.push(lerp(vs + W2, vT, q / MO));
    for (let q = 1; q < side.length; q++) side[q] = Math.max(side[q], side[q - 1]);
    for (let q = 0; q < side.length; q++) side[q] = Math.min(Math.max(0, side[q]), vT);
    const dome = STRAP.dome * Math.min(1, h / 2);
    return { a, t, b, h, rT, rB, vT, vB, vs, gd, dome, side, c2 };
  }
  const hTop = (s, v) => {
    const av = Math.abs(v);
    const x = s.vT > 1e-6 ? av / s.vT : 0;
    const g = s.gd > 0 ? s.gd * Math.max(0, 1 - ((av - s.vs) / W2) ** 2) ** 2 : 0;
    return s.t + s.dome * (1 - x * x) - g;
  };
  // the bottom columns follow the top ones, stretched to the wider bottom face
  const vBotOf = (s, av) => (s.vT - s.c2 > 1e-6 && av > s.c2 ? s.c2 + ((av - s.c2) * (s.vB - s.c2)) / (s.vT - s.c2) : av);

  // ---- stations along u
  let st = [];
  const Kn = 12;
  for (let k = 0; k < Kn; k++) st.push(-R0 * Math.cos((k / Kn) * (Math.PI / 2)));
  const uMainEnd = o.end === 'round' ? uE : ub;
  for (let u = 0; u < uMainEnd - 1e-6; u += u < 9 ? 0.45 : 0.85) st.push(u);
  if (o.end === 'fold') for (let u = L - o.foldLen - 2.0; u < L - o.foldLen + 0.4; u += 0.3) st.push(u);
  const Ke = o.end === 'round' ? 16 : 12;
  const Rr = o.end === 'round' ? Rend : Rb;
  for (let k = 0; k <= Ke; k++) st.push(uMainEnd + Rr * Math.sin((k / Ke) * (Math.PI / 2)));
  const C5 = [-1.4, -0.7, 0, 0.7, 1.4];
  for (const uh of o.holes) {
    st = st.filter((u) => Math.abs(u - uh) > 1.4 + 0.3);
    for (const d of C5) st.push(uh + d);
  }
  st.sort((x, y) => x - y);
  st = st.filter((u, i) => i === 0 || u - st[i - 1] > 1e-4);
  const S = st.length;

  // ---- vertices
  const mb = new MeshBuilder();
  const tmp = [0, 0, 0];
  const UVS = 0.12;
  const V = (u, v, n) => {
    map(u, v, n, tmp);
    return mb.vert(tmp[0], tmp[1], tmp[2], 0, 0, 1, v * UVS, u * UVS);
  };
  const secs = st.map(sect);
  const topCols = (s) => {
    const cols = [];
    for (let q = s.side.length - 1; q >= 0; q--) cols.push(-s.side[q]);
    cols.push(0);
    for (let q = 0; q < s.side.length; q++) cols.push(s.side[q]);
    return cols;
  };
  for (let i = 0; i < S; i++) {
    const u = st[i], s = secs[i];
    const cols = topCols(s);
    for (let j = 0; j < J; j++) V(u, cols[j], hTop(s, cols[j]));
    for (let q = 1; q <= Q; q++) { const a = (90 - (90 * q) / Q) * DEG; V(u, s.vT + s.rT * Math.cos(a), s.t - s.rT + s.rT * Math.sin(a)); }
    for (let q = 0; q < Q; q++) { const a = ((-90 * q) / Q) * DEG; V(u, s.vB + s.rB * Math.cos(a), s.b + s.rB + s.rB * Math.sin(a)); }
    for (let j = J - 1; j >= 0; j--) { const v = cols[j]; V(u, Math.sign(v) * vBotOf(s, Math.abs(v)), s.b); }
    for (let q = 1; q <= Q; q++) { const a = (-90 - (90 * q) / Q) * DEG; V(u, -s.vB + s.rB * Math.cos(a), s.b + s.rB + s.rB * Math.sin(a)); }
    for (let q = 0; q < Q; q++) { const a = (180 - (90 * q) / Q) * DEG; V(u, -s.vT + s.rT * Math.cos(a), s.t - s.rT + s.rT * Math.sin(a)); }
  }
  const vid = (i, l) => i * P + l;
  const botL = (j) => J + 2 * Q + (J - 1 - j);

  // expected outward direction of a triangle: away from the strap's core at that u
  const uLo = 0, uHi = o.end === 'round' ? uE : ub;
  const core = [0, 0, 0];
  const expectAt = (a, b, c) => {
    const p = mb.p;
    const cx = (p[3 * a] + p[3 * b] + p[3 * c]) / 3, cy = (p[3 * a + 1] + p[3 * b + 1] + p[3 * c + 1]) / 3, cz = (p[3 * a + 2] + p[3 * b + 2] + p[3 * c + 2]) / 3;
    return [cx, cy, cz];
  };
  const triOut = (a, b, c, u) => {
    const uc = clamp(u, uLo, uHi);
    map(uc, 0, (top(uc) + bot(uc)) / 2, core);
    const [cx, cy, cz] = expectAt(a, b, c);
    mb.tri(a, b, c, cx - core[0], cy - core[1], cz - core[2]);
  };
  const lining = [];
  const isBot = (l) => l >= J + 2 * Q && l < J + 2 * Q + J - 1;

  // hole cells
  const cells = [];
  for (const uh of o.holes) {
    const i0h = st.findIndex((u) => Math.abs(u - (uh - 1.4)) < 1e-6);
    if (i0h >= 0) cells.push({ uh, i0: i0h, i1: i0h + 4 });
  }
  const inCell = (i) => cells.some((c) => i >= c.i0 && i < c.i1);
  const topSkip = (l) => l >= jc - 2 && l < jc + 2;
  const botSkip = (l) => l >= botL(jc + 2) && l < botL(jc - 2);

  for (let i = 0; i < S - 1; i++) {
    const cell = inCell(i);
    const um = (st[i] + st[i + 1]) / 2;
    for (let l = 0; l < P; l++) {
      if (cell && (topSkip(l) || botSkip(l))) continue;
      const l2 = (l + 1) % P;
      const a = vid(i, l), b = vid(i, l2), c = vid(i + 1, l), d = vid(i + 1, l2);
      const n0 = mb.i.length;
      triOut(a, b, d, um);
      triOut(a, d, c, um);
      if (isBot(l)) lining.push([n0, mb.i.length]);
    }
  }

  // ring triangulation round every punched hole, and the hole wall
  const RH = o.holeR;
  for (const cell of cells) {
    for (const face of ['top', 'bot']) {
      const B = [];
      const jOf = (j) => (face === 'top' ? j : botL(j));
      const add = (i, j) => B.push([vid(i, jOf(j)), C5[j - jc + 2], st[i]]);
      for (let j = jc - 2; j <= jc + 2; j++) add(cell.i0, j);
      for (let i = cell.i0 + 1; i <= cell.i1; i++) add(i, jc + 2);
      for (let j = jc + 1; j >= jc - 2; j--) add(cell.i1, j);
      for (let i = cell.i1 - 1; i > cell.i0; i--) add(i, jc - 2);
      const K = B.length;
      const ang = B.map(([, v, u]) => Math.atan2(u - cell.uh, v));
      const circ = [];
      for (let k = 0; k < K; k++) {
        const a0 = ang[k];
        let d = ang[(k + 1) % K] - a0;
        while (d < 0) d += TAU;
        while (d >= TAU) d -= TAU;
        for (const a of [a0, a0 + d / 2]) circ.push([RH * Math.cos(a), cell.uh + RH * Math.sin(a)]);
      }
      const N2 = circ.length;
      const sAt = (u) => sect(u);
      const cid = circ.map(([v, u]) => V(u, v, face === 'top' ? hTop(sAt(u), v) : bot(u)));
      const n0 = mb.i.length;
      for (let k = 0; k < K; k++) {
        const bk = B[k][0], bn = B[(k + 1) % K][0];
        const c0 = cid[2 * k], c1 = cid[2 * k + 1], c2 = cid[(2 * k + 2) % N2];
        triOut(bk, bn, c1, cell.uh);
        triOut(bk, c1, c0, cell.uh);
        triOut(bn, c2, c1, cell.uh);
      }
      if (face === 'bot') lining.push([n0, mb.i.length]);
      if (face === 'top') {
        // wall (own vertices → crisp rims), normals towards the hole's axis
        const T = circ.map(([v, u]) => V(u, v, hTop(sAt(u), v)));
        const Wv = circ.map(([v, u]) => V(u, v, bot(u)));
        const ax = [0, 0, 0];
        for (let k = 0; k < N2; k++) {
          const k1 = (k + 1) % N2;
          const [cx, cy, cz] = expectAt(T[k], T[k1], Wv[k]);
          map(cell.uh, 0, (top(cell.uh) + bot(cell.uh)) / 2, ax);
          mb.tri(T[k], T[k1], Wv[k], ax[0] - cx, ax[1] - cy, ax[2] - cz);
          mb.tri(T[k1], Wv[k1], Wv[k], ax[0] - cx, ax[1] - cy, ax[2] - cz);
        }
      }
    }
  }

  // one shared vertex buffer, two index sets (cordovan top + turned edges, lining)
  const all = mb.geometry(false);
  all.computeVertexNormals();
  const ia = all.index.array;
  const isLining = new Uint8Array(ia.length / 3);
  for (const [s0, s1] of lining) for (let t = s0 / 3; t < s1 / 3; t++) isLining[t] = 1;
  const idxL = [], idxB = [];
  for (let t = 0; t < ia.length / 3; t++) (isLining[t] ? idxB : idxL).push(ia[3 * t], ia[3 * t + 1], ia[3 * t + 2]);
  const geoL = new THREE.BufferGeometry(), geoB = new THREE.BufferGeometry();
  for (const g of [geoL, geoB]) {
    g.setAttribute('position', all.attributes.position);
    g.setAttribute('normal', all.attributes.normal);
    g.setAttribute('uv', all.attributes.uv);
  }
  geoL.setIndex(idxL);
  geoB.setIndex(idxB);
  geoL.computeBoundingSphere();
  geoB.computeBoundingSphere();

  return { geoL, geoB, map, frame, sect, hTop, top, bot, halfW, vStitch, L, ub, Rb, ncE, uE, Rend, sgn, end: o.end };
}

// Saddle stitches along the stitch line, on the top and on the lining. The path follows
// the groove (and round the rounded tip of the long half).
function stitchGeometry(S, u0, u1, pitch, lite) {
  const tpl = new THREE.SphereGeometry(1, lite ? 4 : 6, lite ? 2 : 3);
  tpl.deleteAttribute('uv');
  const pts = []; // [u, v] samples of the path, right side out and back along the left
  const du = 0.05;
  const right = [], left = [];
  for (let u = u0; u <= u1 + 1e-9; u += du) {
    const vs = S.vStitch(u);
    if (vs <= 0) break;
    right.push([u, vs]);
    left.push([u, -vs]);
  }
  pts.push(...right);
  if (S.end === 'round') pts.push(...left.reverse()); // joined round the tip
  const paths = S.end === 'round' ? [pts] : [right, left];
  const list = [];
  const mtx = new THREE.Matrix4();
  const p = [0, 0, 0], q = [0, 0, 0];
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Zv = new THREE.Vector3(), Tg = new THREE.Vector3();
  const slant = 21 * DEG;
  const scale = new THREE.Vector3(0.15, 0.48, 0.085);
  for (const path of paths) {
    // arc length along the path (u and v are both millimetres on the surface)
    const s = [0];
    for (let k = 1; k < path.length; k++) s.push(s[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]));
    const total = s[s.length - 1];
    let k = 0;
    for (let d = pitch * 0.5; d < total; d += pitch) {
      while (k < s.length - 2 && s[k + 1] < d) k++;
      const f = (d - s[k]) / Math.max(1e-9, s[k + 1] - s[k]);
      const u = lerp(path[k][0], path[k + 1][0], f), v = lerp(path[k][1], path[k + 1][1], f);
      const du2 = path[k + 1][0] - path[k][0], dv2 = path[k + 1][1] - path[k][1];
      const sc = S.sect(u);
      const { A, T, N } = S.frame(u);
      Tg.copy(T).multiplyScalar(du2).addScaledVector(A, dv2).normalize();
      for (const face of [1, -1]) {
        const n = face > 0 ? S.hTop(sc, v) - 0.025 : sc.b + 0.02;
        S.map(u, v, n, p);
        Zv.copy(N).multiplyScalar(face);
        // slanted saddle stitch: rotate the path tangent about the surface normal
        Y.copy(Tg).multiplyScalar(Math.cos(slant)).addScaledVector(X.crossVectors(Zv, Tg), Math.sin(slant)).normalize();
        X.crossVectors(Y, Zv).normalize();
        mtx.makeBasis(X, Y, Zv);
        mtx.scale(scale);
        mtx.setPosition(p[0], p[1], p[2]);
        list.push(tpl.clone().applyMatrix4(mtx));
      }
      void q;
    }
  }
  return mergeAll(list);
}

// A leather keeper looped round the strap at u = uk (band along u, thickness kt).
function keeperGeometry(S, uk, band = 3.6, kt = 0.85) {
  const s = S.sect(uk);
  const topN = s.t + s.dome, botN = s.b;
  const g = 0.05;
  const ah = s.a + g + kt / 2, nh = (topN - botN) / 2 + g + kt / 2, nc = (topN + botN) / 2;
  const rr = Math.min(kt / 2 + 0.7, nh - 0.02);
  const path = [];
  const corners = [[ah - rr, nh - rr, 0], [-(ah - rr), nh - rr, 90], [-(ah - rr), -(nh - rr), 180], [ah - rr, -(nh - rr), 270]];
  for (const [cx, cy, a0] of corners) {
    for (let q = 0; q <= 7; q++) {
      const a = (a0 + (90 * q) / 7) * DEG;
      path.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  }
  const prof = [];
  const hb = band / 2, hk = kt / 2, pr = 0.26;
  for (const [cx, cy, a0] of [[hb - pr, hk - pr, 0], [-(hb - pr), hk - pr, 90], [-(hb - pr), -(hk - pr), 180], [hb - pr, -(hk - pr), 270]]) {
    for (let q = 0; q <= 4; q++) {
      const a = (a0 + (90 * q) / 4) * DEG;
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
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(gridIndex(path.length, prof.length, true, true));
  orientClosed(geo);
  geo.computeVertexNormals();
  return geo;
}

// ------------------------------------------------------------------ builder

export function buildCase(ctx) {
  const { spec, M, reg, root } = ctx;
  const C = spec.case;
  const Z = spec.z;
  const bz = C.bezel, md = C.middle, cb = C.caseback, cr = C.crystal;
  const X = (id) => spec.explode[id] ?? [0, 0, 0];
  const D = (id) => spec.explodeDelay(id);
  // Lite (the leather watch box: every watch at once, dial up on a cushion): only what
  // shows from above — no straps, buckle or spring bars (the box draws its own band), no
  // casing ring, casing screw, display-back glass or back engraving — and 96 segments.
  const lite = !!ctx.lite;
  const SEG = lite ? 96 : 192;
  const RING = angles(SEG);
  const RC = C.radius; // 19.25

  const add = (parent, geo, mat, { cast = true, receive = true, name = '' } = {}) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };

  // ---------------------------------------------------------------- materials
  const steel = M.steelPolished;
  const grain = M.textures?.dialGrain?.normalMap || null;
  // satin flange round the dial: light, finely frosted (detail1: a grainy pale wall)
  const flangeMat = M.steelSatin.clone();
  flangeMat.color = new THREE.Color(C.flange.colour || '#cfcfcf');
  flangeMat.roughness = 0.5;
  flangeMat.anisotropy = 0;
  flangeMat.metalness = 0.9;
  if (grain) { flangeMat.normalMap = grain; flangeMat.normalScale = new THREE.Vector2(0.35, 0.35); }
  flangeMat.name = 'flange147';
  // ground crystal-seat ledge: the neutral grey band r 17.75–18.10 seen through the crystal
  const ledgeMat = flangeMat.clone();
  ledgeMat.color = new THREE.Color(0x9a9a9a);
  ledgeMat.metalness = 0.55;
  ledgeMat.roughness = 0.66;
  ledgeMat.name = 'ledge147';
  const blasted = M.steelSatin.clone();
  blasted.roughness = 0.58;
  blasted.anisotropy = 0;
  blasted.color = new THREE.Color(0xb7babe);
  if (grain) { blasted.normalMap = grain; blasted.normalScale = new THREE.Vector2(0.4, 0.4); }
  // Sapphire: a specular-only coat added on top of whatever lies behind it (the 139's
  // technique: a transmissive material would hide transparent decals behind the glass).
  // The 147's crystal is AR-coated on the INSIDE only, so its outer face reflects like
  // plain sapphire — stronger than the 139's AR crystal (≈ 1.9 %). Physically F0 =
  // ((1.77 − 1)/(1.77 + 1))² ≈ 7.7 %, but at that level the bright studio tent veils the
  // black oxidised hands slate-blue in head-on views, where NOMOS's renders show them pure
  // black; 0.4 of it (≈ 3.1 %, rising towards the edges by Fresnel) keeps both true.
  const glassOf = (specInt) => {
    const g = M.sapphire.clone();
    g.transmission = 0;
    g.thickness = 0;
    g.color = new THREE.Color(0x000000);
    g.specularColor = new THREE.Color(0xffffff);
    g.specularIntensity = specInt;
    g.ior = cr.ior || 1.77;
    g.roughness = 0.012;
    g.transparent = true;
    g.blending = THREE.AdditiveBlending;
    g.depthWrite = false;
    return g;
  };
  const crystalGlass = glassOf(0.4);
  const backGlass = glassOf(0.32); // display back: kept lighter so the movement reads clearly

  // ================================================================ middle case
  {
    const object = new THREE.Group();
    root.add(object);
    const zT = md.top, zB = md.bottom; // 1.46, −3.00
    const [, fTop] = Z.flange; // 1.80
    const ip = C.innerProfile; // [[18.10, 1.95], [17.75, 1.95], [17.75, 1.80], [17.52, 1.80], [17.52, 0.80]]
    const zSeat = ip[0][1], rStep = ip[1][0], rFl = ip[3][0], zDial = ip[4][1];
    const rBore = md.boreBelowDial; // 17.95
    const zStem = Z.stemAxis;
    const pol = new MeshBuilder();
    // polished: seams, top face under the bezel, collar wall, flange underside, bottom face
    lathe(pol, [[RC - HC, zB], [RC, zB + HC]], RING);
    lathe(pol, [[RC, zT - HC], [RC - HC, zT]], RING);
    lathe(pol, [[RC - HC, zT], [COLLAR_R, zT]], RING);
    lathe(pol, [[COLLAR_R, zT], [COLLAR_R, zSeat]], RING);
    lathe(pol, [[rFl, zDial], [rBore, zDial]], RING);
    lathe(pol, [[rBore, zB], [RC - HC, zB]], RING);
    // flank and bore with the crown-tube hole at 3 o'clock, joined by the hole's wall
    const nh = lite ? 24 : 40;
    const outer = cylinderWithHole(pol, RC, zB + HC, zT - HC, SEG, zStem, STEM_HOLE_R, nh, +1);
    const inner = cylinderWithHole(pol, rBore, zB, zDial, SEG, zStem, STEM_HOLE_R, nh, -1);
    for (let k = 0; k < nh; k++) {
      const k1 = (k + 1) % nh;
      const ph = (k / nh) * TAU, ph1 = (k1 / nh) * TAU;
      // the wall needs its own vertices (normals towards the hole's axis)
      const P = pol.p;
      const vtx = (id, ang) => pol.vert(P[3 * id], P[3 * id + 1], P[3 * id + 2], 0, -Math.cos(ang), -Math.sin(ang));
      const a = vtx(outer[k], ph), b = vtx(outer[k1], ph1), c = vtx(inner[k1], ph1), d = vtx(inner[k], ph);
      pol.quad(a, b, c, d);
    }
    // the pressed-in crown tube, its end just proud of the flank (seen in the 0.1 gap)
    {
      const tb = new MeshBuilder();
      const tr = angles(lite ? 24 : 40);
      lathe(tb, [[TUBE.rOut, TUBE.x0], [TUBE.rOut, TUBE.x1 - 0.03], [TUBE.rOut - 0.03, TUBE.x1]], tr);
      lathe(tb, [[TUBE.rOut - 0.03, TUBE.x1], [TUBE.rIn + 0.03, TUBE.x1]], tr);
      lathe(tb, [[TUBE.rIn + 0.03, TUBE.x1], [TUBE.rIn, TUBE.x1 - 0.03], [TUBE.rIn, TUBE.x0]], tr);
      const tg = tb.geometry();
      tg.rotateY(Math.PI / 2);
      tg.translate(0, 0, zStem);
      add(object, mergeAll([pol.geometry(), tg]), steel, { name: 'middle-case' });
    }
    // ground grey crystal-seat ledge and its step
    const led = new MeshBuilder();
    lathe(led, [[COLLAR_R, zSeat], [rStep, zSeat]], RING);
    lathe(led, [[rStep, zSeat], [rStep, fTop]], RING);
    add(object, led.geometry(), ledgeMat, { name: 'crystal-seat' });
    // light satin flange: top ring and the wall down to the dial (the visible dial edge)
    const fl = new MeshBuilder();
    lathe(fl, [[rStep, fTop], [rFl + 0.025, fTop], [rFl, fTop - 0.025], [rFl, zDial]], RING, { uvR: 17.6, uvS: 1 / 3.2 });
    add(object, fl.geometry(), flangeMat, { name: 'flange' });

    reg.add({
      id: 'case-body', name: 'Middle case', category: 'case', side: 'both', exposed: true,
      object, explode: X('case-body'), explodeDelay: D('case-body'), priority: 1,
      anchor: [RC * Math.cos(-38 * DEG), RC * Math.sin(-38 * DEG), (zT + zB) / 2],
      description: 'The polished steel heart of the case: a straight-walled drum 38.5 mm across that carries the four lugs and the crown. Inside, a pale satin flange rings the dial under the crystal, and the ledge above it seats the sapphire.',
      facts: {
        Material: '316L stainless steel, polished',
        Diameter: `${(RC * 2).toFixed(1)} mm (without crown)`,
        Height: `${C.height.toFixed(1)} mm overall`,
        'Lug to lug': `${C.lugToLug.toFixed(1)} mm`,
        'Water resistance': '5 atm (splash-proof)',
        Construction: 'Three-part: bezel, middle case, snap-on back',
      },
    });
  }

  // ================================================================ bezel
  {
    const object = new THREE.Group();
    root.add(object);
    const zb = bz.bottom, zt = bz.top, ro = bz.outerRadius, er = bz.edgeRadius;
    const g = new MeshBuilder();
    lathe(g, [[BEZEL_WALL, zb], [ro - HC, zb]], RING);
    lathe(g, [[ro - HC, zb], [ro, zb + HC]], RING);
    // flank → rounded outer edge → flat polished top (one smooth strip; the extra points
    // keep the normal blending confined to the rounding)
    lathe(g, [[ro, zb + HC], [ro, zt - er - 0.04], ...arc(ro - er, zt - er, er, 0, 90, lite ? 6 : 10), [bz.flatOuter - 0.04, zt], [bz.flatInner + 0.035, zt]], RING);
    lathe(g, [[bz.flatInner + 0.035, zt], [BEZEL_BORE, zt - 0.035]], RING); // the dark hairline at r 18.10
    lathe(g, [[BEZEL_BORE, zt - 0.035], [BEZEL_BORE, LIP_Z]], RING);
    lathe(g, [[BEZEL_BORE, LIP_Z], [BEZEL_WALL, LIP_Z]], RING);
    lathe(g, [[BEZEL_WALL, LIP_Z], [BEZEL_WALL, zb]], RING);
    add(object, g.geometry(), steel);
    reg.add({
      id: 'bezel', name: 'Bezel', category: 'case', side: 'front', exposed: true,
      object, explode: X('bezel'), explodeDelay: D('bezel'), priority: 2,
      anchor: [18.6 * Math.cos(128 * DEG), 18.6 * Math.sin(128 * DEG), zt],
      description: 'The slim polished ring on top of the middle case. Its lip holds the sapphire crystal down on its seat; the narrow flat top, just under a millimetre wide, rolls over into the case flank.',
      facts: { 'Flat top': `${(bz.flatOuter - bz.flatInner).toFixed(2)} mm wide`, Height: `${(zt - zb).toFixed(2)} mm`, Opening: `Ø ${(bz.flatInner * 2).toFixed(1)} mm`, Finish: 'Polished' },
    });
  }

  // ================================================================ crystal
  {
    const object = new THREE.Group();
    root.add(object);
    const R = cr.radius, Rt = cr.topRadius, z0 = cr.z[0], z1 = cr.z[1];
    const Rf = cr.seatRadius - 0.02; // seated flange 18.43
    const g = new MeshBuilder();
    const ring = angles(lite ? 96 : 160);
    lathe(g, [[0, z0], [Rf * 0.5, z0], [Rf - 0.03, z0]], ring);
    lathe(g, [[Rf - 0.03, z0], [Rf, z0 + 0.03]], ring);
    lathe(g, [[Rf, z0 + 0.03], [Rf, CRYSTAL_FLANGE_TOP]], ring);
    lathe(g, [[Rf, CRYSTAL_FLANGE_TOP], [R, CRYSTAL_FLANGE_TOP]], ring);
    lathe(g, [[R, CRYSTAL_FLANGE_TOP], [R, z1 - (R - Rt)]], ring);
    lathe(g, [[R, z1 - (R - Rt)], [Rt, z1]], ring); // 0.08 × 45° edge chamfer
    lathe(g, [[Rt, z1], [Rt * 0.5, z1], [0, z1]], ring);
    const mesh = add(object, g.geometry(), crystalGlass, { cast: false, receive: false });
    mesh.renderOrder = 2;
    reg.add({
      id: 'crystal', name: 'Sapphire crystal', category: 'case', side: 'front', exposed: true,
      object, explode: X('crystal'), explodeDelay: D('crystal'), priority: 2,
      anchor: [-8.2, 10.4, z1],
      description: 'A flat crystal of synthetic sapphire, harder than anything but diamond, standing a hair proud of the bezel. It is anti-reflection coated on the inside only, so the outer face shows honest sapphire reflections while the delicate coating stays protected.',
      facts: { Material: 'Synthetic sapphire', Shape: 'Flat', Diameter: `${(R * 2).toFixed(1)} mm (seat Ø ${(cr.seatRadius * 2).toFixed(1)})`, Thickness: `${(z1 - z0).toFixed(1)} mm (est.)`, Coating: 'Anti-reflective, inner side only' },
    });
  }

  // ================================================================ casing ring
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const R = C.casingRing;
    const zLip = R.lipBack, zTop = R.z[1], zBot = R.z[0], zSeat = R.dialSeat.z;
    // L-shaped section: the inner lip at movement height (its back face takes the casing
    // screw's clamp), the outer body down to the case back, and the dial seat on top
    const sec = [[R.inner, zLip], [R.lipOuter, zLip], [R.lipOuter, zBot], [R.outer, zBot], [R.outer, zSeat], [R.dialSeat.inner, zSeat], [R.dialSeat.inner, zTop], [R.inner, zTop]];
    const w = R.stemSlotHalfWidth;
    const gap = (r) => Math.asin(w / r);
    const g = new MeshBuilder();
    for (let i = 0; i < sec.length; i++) lathe(g, [sec[i], sec[(i + 1) % sec.length]], angles(SEG), { gap, uvR: 16.8, uvS: 1 / 3 });
    // planar caps where the slot (y = ±w) cuts the section
    const tri = THREE.ShapeUtils.triangulateShape(sec.map(([r, z]) => new THREE.Vector2(r, z)), []);
    for (const sy of [1, -1]) {
      const ids = sec.map(([r, z]) => g.vert(Math.sqrt(r * r - w * w), sy * w, z, 0, -sy, 0));
      for (const t of tri) g.tri(ids[t[0]], ids[t[1]], ids[t[2]]);
    }
    add(object, g.geometry(), blasted);
    reg.add({
      id: 'casing-ring', name: 'Casing ring', category: 'case', side: 'back', exposed: true,
      object, explode: X('casing-ring'), explodeDelay: D('casing-ring'), priority: 3,
      anchor: [-16.1 * Math.cos(20 * DEG), -16.1 * Math.sin(20 * DEG), zLip],
      description: 'A sandblasted steel ring that centres the 34 mm movement in the 38.5 mm case and carries the dial on its outer seat. The casing screw’s clamp presses on its inner lip, and a slot at 3 o’clock lets the winding stem through.',
      facts: { 'Inner diameter': `${(R.inner * 2).toFixed(1)} mm`, 'Outer diameter': `${(R.outer * 2).toFixed(1)} mm`, Finish: 'Sandblasted steel' },
    });
  }

  // ================================================================ lugs
  {
    const object = new THREE.Group();
    root.add(object);
    const lg = C.lug;
    // The profile starts inside the case; at the inner face (x 9.60) the bore (r 17.95)
    // is at y 15.17, so the root starts at y 15.5 — buried in the wall, fused with the flank.
    const yRoot = Math.max(lg.profile[0][0], Math.sqrt(md.boreBelowDial ** 2 - lg.xInner ** 2) + 0.33);
    const prof = lg.profile.map(([y, z], i) => [i === 0 || i === lg.profile.length - 1 ? yRoot : y, z]);
    const cr0 = lg.cornerRadius;
    // bend corners r 0.3 (side photo), crisp flat-cut tip
    const radii = [0, cr0, 0.5 * cr0, 0.2 * cr0, 0.2 * cr0, cr0, 0];
    const pts = filletPolygon(prof, radii, lite ? 5 : 9);
    const shape = new THREE.Shape(pts.map(([y, z]) => new THREE.Vector2(y, z)));
    const hole = new THREE.Path();
    hole.absarc(lg.springBar.y, lg.springBar.z, lg.springBar.holeRadius, 0, TAU, true);
    shape.holes.push(hole);
    const bt = 0.07; // polished chamfers on every edge of the plate
    const thick = lg.xOuter - lg.xInner;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thick - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt,
      bevelSegments: lite ? 2 : 3, curveSegments: lite ? 16 : 36,
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
      anchor: [lg.xOuter, (prof[1][0] + prof[2][0]) / 2, (prof[1][1] + prof[2][1]) / 2],
      description: 'Four slender, angular polished lugs — the Tangente signature. Each runs straight out of the flank, then bends down at about 38° to a flat-cut tip just below the case back. They are drilled right through, so the spring bars can be pushed out from the side.',
      facts: { 'Lug width': `${C.lugWidth} mm`, 'Lug to lug': `${C.lugToLug.toFixed(1)} mm`, Thickness: `${thick.toFixed(2)} mm`, 'Spring-bar holes': `Ø ${(lg.springBar.holeRadius * 2).toFixed(2)} mm, drilled through`, Finish: 'Polished' },
    });
  }

  // ================================================================ spring bars
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const lg = C.lug, sb = lg.springBar;
    const rb = sb.barRadius, rp = sb.pinRadius;
    const xB = lg.xInner - 0.04, xT = lg.xOuter - 0.07, e = 0.08;
    const g = new MeshBuilder();
    const ring = angles(32);
    // profile [r, x]: domed pin tip, shoulder, tube body, shoulder, pin tip
    lathe(g, [[0, -xT], [rp * 0.6, -xT + 0.02], [rp - 0.03, -xT + 0.07], [rp, -xT + 0.12], [rp, -xB]], ring);
    lathe(g, [[rp, -xB], [rb - e, -xB]], ring);
    lathe(g, [[rb - e, -xB], ...arc(rb - e, -xB + e, e, -90, 0, 3).slice(1), [rb, xB - e], ...arc(rb - e, xB - e, e, 0, 90, 3).slice(1)], ring);
    lathe(g, [[rb - e, xB], [rp, xB]], ring);
    lathe(g, [[rp, xB], [rp, xT - 0.12], [rp - 0.03, xT - 0.07], [rp * 0.6, xT - 0.02], [0, xT]], ring);
    const bar = g.geometry();
    bar.rotateY(Math.PI / 2);
    const bars = mergeAll([bar.clone().translate(0, sb.y, sb.z), bar.clone().translate(0, -sb.y, sb.z)]);
    add(object, bars, M.steelSatin);
    reg.add({
      id: 'spring-bars', name: 'Spring bars', category: 'case', side: 'both', exposed: false,
      object, explode: X('spring-bars'), explodeDelay: D('spring-bars'), priority: 3,
      anchor: [lg.xOuter, sb.y, sb.z],
      description: 'Spring-loaded steel bars between each pair of lugs; the padded strap ends wrap round them. Their polished tips show in the drilled lug holes, so a pin pressed into the hole releases the strap.',
      facts: { Diameter: `${(rb * 2).toFixed(1)} mm`, Tips: `Ø ${(rp * 2).toFixed(2)} mm`, Length: `${C.lugWidth} mm between the lugs`, Material: 'Stainless steel' },
    });
  }

  // ================================================================ crown
  {
    const cw = C.crown;
    const object = new THREE.Group();
    object.position.set(0, spec.stemY ?? 0, cw.axisZ);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);

    // Faceted flutes: every flute has a flat land and two flat flanks meeting in a sharp V
    // groove, each facet one crisp band of light (polished). The fluted prism is clipped by
    // a bevelled skirt cone at the case end (x 19.35–19.90) — each land and flank ends in
    // a curved point there, the serrated "chevrons" of the render — and by a steep chamfer
    // before the domed end button. The facets keep flat normals; the cone, chamfer and
    // button are smooth surfaces of revolution sharing the same angular samples.
    const R0 = cw.radius, Rr = cw.rootRadius;
    const pitch = TAU / cw.flutes;
    const nTop = lite ? 3 : 6, nFl = lite ? 2 : 4;
    const facets = [];
    for (let i = 0; i < cw.flutes; i++) {
      const c = i * pitch;
      facets.push([c - CROWN_FLAT * pitch, R0, c + CROWN_FLAT * pitch, R0, nTop]);
      facets.push([c + CROWN_FLAT * pitch, R0, c + 0.5 * pitch, Rr, nFl]);
      facets.push([c + 0.5 * pitch, Rr, c + (1 - CROWN_FLAT) * pitch, R0, nFl]);
    }
    const xA = cw.from, xS = cw.skirtTo;
    const k1 = (R0 - CROWN_SKIRT_R0) / (xS - xA);
    const k2 = (R0 - CROWN_END.r1) / (CROWN_END.x1 - CROWN_END.x0);
    const xIn = (rho) => xA + (rho - CROWN_SKIRT_R0) / k1;
    const xOut = (rho) => CROWN_END.x0 + (R0 - rho) / k2;
    const mb = new MeshBuilder();
    const ptAt = (x, rho, th) => [x, rho * Math.cos(th), rho * Math.sin(th)];
    const thetas = []; // shared angular samples (one per facet corner, so the rings stay lean)
    const rhos = [];
    facets.forEach(([a0, r0, a1, r1, n], fi) => {
      const p0 = [r0 * Math.cos(a0), r0 * Math.sin(a0)], p1 = [r1 * Math.cos(a1), r1 * Math.sin(a1)];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      let nx = dy, ny = -dx;
      const nl = Math.hypot(nx, ny);
      nx /= nl; ny /= nl;
      if (nx * p0[0] + ny * p0[1] < 0) { nx = -nx; ny = -ny; }
      const fa = [], fb = [];
      for (let s = 0; s <= n; s++) {
        const th = a0 + ((a1 - a0) * s) / n;
        const dX = Math.cos(th), dY = Math.sin(th);
        const rho = (p0[0] * dy - p0[1] * dx) / (dX * dy - dY * dx); // ray ∩ chord
        if ((s > 0 || fi === 0) && !(s === n && fi === facets.length - 1)) {
          thetas.push(th);
          rhos.push(rho);
        }
        const P0 = ptAt(xIn(rho), rho, th), P1 = ptAt(xOut(rho), rho, th);
        fa.push(mb.vert(P0[0], P0[1], P0[2], 0, nx, ny));
        fb.push(mb.vert(P1[0], P1[1], P1[2], 0, nx, ny));
      }
      for (let s = 0; s < n; s++) mb.quad(fa[s], fa[s + 1], fb[s + 1], fb[s]);
    });
    const nT = thetas.length;
    // skirt cone and end chamfer between the facet ends and the end circles
    const cone = (xRing, rRing, xOfRho, kk, sgnX) => {
      const nl = Math.hypot(kk, 1);
      const A = [], Bv = [];
      for (let q = 0; q < nT; q++) {
        const th = thetas[q], c = Math.cos(th), s = Math.sin(th);
        const nx = (sgnX * kk) / nl, nr = 1 / nl;
        const P0 = ptAt(xRing, rRing, th), P1 = ptAt(xOfRho(rhos[q]), rhos[q], th);
        A.push(mb.vert(P0[0], P0[1], P0[2], nx, nr * c, nr * s));
        Bv.push(mb.vert(P1[0], P1[1], P1[2], nx, nr * c, nr * s));
      }
      for (let q = 0; q < nT; q++) {
        const q1 = (q + 1) % nT;
        mb.quad(A[q], A[q1], Bv[q1], Bv[q]);
      }
    };
    cone(xA, CROWN_SKIRT_R0, xIn, k1, -1);
    cone(CROWN_END.x1, CROWN_END.r1, xOut, k2, +1);
    // end button: rounded edge into the slightly domed face, and the inner face at the case
    // side with the threaded stem hole (seen when the crown is pulled off in the explode)
    const thClosed = thetas.concat([thetas[0] + TAU]);
    // lathe about Z, then (x, y, z) → (z, x, y): the lathe axis becomes the crown axis X and
    // the angle θ about it matches the facets' (y, z) = ρ(cos θ, sin θ)
    const toCrown = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
    const latheXStrip = (strip) => {
      const tmpB = new MeshBuilder();
      lathe(tmpB, strip, thClosed);
      return tmpB.geometry().applyMatrix4(toCrown);
    };
    const E = CROWN_END;
    const faceX = (r) => cw.to - E.dome * (r / E.faceR) ** 2;
    const button = [[E.r1, E.x1]];
    const nb = lite ? 4 : 6;
    for (let k = 1; k <= nb; k++) {
      const a = (k / nb) * 90 * DEG;
      button.push([E.faceR + E.round * Math.cos(a), E.x1 + E.round * Math.sin(a)]);
    }
    for (let k = 1; k <= nb; k++) {
      const r = E.faceR * (1 - k / nb) ** 0.8;
      button.push([r, faceX(r)]);
    }
    const bore = 0.5, boreEnd = xA + 1.2; // threaded hole for the stem (stem end x 20.6)
    const pieces = [
      mb.geometry(),
      latheXStrip(button),
      latheXStrip([[bore, xA], [CROWN_SKIRT_R0, xA]]), // inner face towards the case
      latheXStrip([[bore, boreEnd], [bore, xA]]),
      latheXStrip([[0.001, boreEnd], [bore, boreEnd]]),
    ];
    add(rotor, mergeAll(pieces), steel, { name: 'crown' });

    // "NOMOS" on the domed end face (horizontal seen from 3 o'clock with the dial up)
    const capH = cw.textCapHeight;
    const tx = glyphCanvas(cw.text || 'NOMOS', { style: 'nomos', stroke: 0.13, width: cw.textWidth / capH, ppe: lite ? 110 : 200 });
    const tw = tx.W * capH, th = tx.H * capH;
    {
      const nu = 28, nv = 6, pos = [], uv = [];
      for (let i = 0; i <= nu; i++) {
        for (let j = 0; j <= nv; j++) {
          const y = (i / nu - 0.5) * tw, z = (j / nv - 0.5) * th;
          pos.push(faceX(Math.min(E.faceR, Math.hypot(y, z))) + 0.004, y, z);
          uv.push(i / nu, j / nv);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const idx = gridIndex(nu + 1, nv + 1, false, false);
      geo.setIndex(idx);
      // face +X
      const p = geo.attributes.position.array, ix = geo.index.array;
      const ux = p[ix[1] * 3] - p[ix[0] * 3], uy = p[ix[1] * 3 + 1] - p[ix[0] * 3 + 1], uz = p[ix[1] * 3 + 2] - p[ix[0] * 3 + 2];
      const vx = p[ix[2] * 3] - p[ix[0] * 3], vy = p[ix[2] * 3 + 1] - p[ix[0] * 3 + 1], vz = p[ix[2] * 3 + 2] - p[ix[0] * 3 + 2];
      if (uy * vz - uz * vy < 0) flipIndex(geo);
      geo.computeVertexNormals();
      const mat = decalMaterial(M.steelDark, glyphTexture(tx.canvas), cw.textColour || '#4a4a4a', 0.55, 0.55);
      add(rotor, geo, mat, { cast: false, receive: false, name: 'crown-signature' });
    }

    // crown turns per ratchet turn (engine's equivalent keyless counts)
    const kw = spec.keyless;
    const stemPerRatchet = kw.ratchet.teeth / kw.windingPinion.teeth;
    const TURNS = spec.barrelTurns * stemPerRatchet;
    const RES_H = spec.powerReserveHours;
    reg.add({
      id: 'crown', name: 'Crown', category: 'case', side: 'both', exposed: true,
      object, rotor, explode: X('crown'), explodeDelay: D('crown'), priority: 1,
      anchor: [(cw.from + cw.to) / 2 + 0.3, 0, cw.radius],
      description: `Turning the crown winds the mainspring by hand — about ${Math.round(TURNS)} turns from empty — through the winding pinion, the crown wheel and the two winding idlers; while the rotor winds, the crown stays still. Pulled out one step it sets the ring date in either direction; fully out, it sets the hands and stops the seconds.`,
      facts: {
        Diameter: `${(cw.radius * 2).toFixed(2)} mm`,
        Flutes: String(cw.flutes),
        Type: 'Push-pull, not screw-down',
        Positions: '3 (wind · date · time)',
        'Full wind': `≈ ${Math.round(TURNS)} turns`,
        Signed: 'NOMOS on the end face',
      },
      live: (s) => `${Math.round((s.reserve || 0) * RES_H)} h in reserve`,
      update: (s) => { rotor.rotation.x = manualStemAngle(s, spec); },
    });
  }

  // ================================================================ case back ring
  {
    const object = new THREE.Group();
    root.add(object);
    const zt = cb.top, zb = cb.bottom, ro = cb.outerRadius;
    const rSeat = cb.glassSeatRadius + 0.02, zLip = cb.lipZ;
    // The 34° chamfer rolls over into the vertical band: a convex, tangent-continuous roll
    // (quadratic Bézier from the chamfer, through the corner, onto the band).
    const chamferPt = (r) => [r, zb + ((r - cb.chamferRadius) * (cb.bevelTopZ - zb)) / (cb.bevelOuterRadius - cb.chamferRadius)];
    const r0 = cb.bevelOuterRadius - 0.04, p0 = chamferPt(r0), corner = chamferPt(ro);
    const p2 = [ro, corner[1] + 0.11];
    const roll = [];
    for (let k = 1; k < 6; k++) {
      const t = k / 6, s = 1 - t;
      roll.push([s * s * p0[0] + 2 * s * t * corner[0] + t * t * p2[0], s * s * p0[1] + 2 * s * t * corner[1] + t * t * p2[1]]);
    }
    const g = new MeshBuilder();
    lathe(g, [[cb.aperture, zLip], [cb.flatInner, zb]], RING); // polished window chamfer
    lathe(g, [[cb.flatInner, zb], [(cb.flatInner + cb.chamferRadius) / 2, zb], [cb.chamferRadius, zb]], RING);
    lathe(g, [[cb.chamferRadius, zb], chamferPt(r0 - 0.1), p0, ...roll, p2, [ro, p2[1] + 0.04], [ro, zt - 0.03]], RING);
    lathe(g, [[ro, zt - 0.03], [ro - 0.03, zt]], RING);
    lathe(g, [[ro - 0.03, zt], [rSeat, zt]], RING);
    lathe(g, [[rSeat, zt], [rSeat, zLip]], RING);
    lathe(g, [[rSeat, zLip], [cb.aperture, zLip]], RING);
    add(object, g.geometry(), steel);

    // "TANGENTE {serial}": light DIN-like capitals with wide tracking, cut into the flat back
    // face; tops toward the centre, so it reads upright at 6 o'clock seen from the back
    const label = (cb.text || 'TANGENTE {caseSerial}').replace('{caseSerial}', spec.caseSerial ?? '');
    if (!lite) {
      const [c0, c1] = cb.textSpanDeg;
      const capH = cb.textCapHeight, Rt = cb.textRadius;
      const spanMM = Rt * (c1 - c0) * DEG;
      const tx = glyphCanvas(label, { style: 'din', stroke: 0.1, width: spanMM / capH, ppe: 180 });
      const tw = tx.W * capH, th = tx.H * capH;
      const mid = (90 - (c0 + c1) / 2) * DEG; // math angle of the text centre (≈ 6 o'clock)
      const span = tw / Rt;
      const segs = 72, pos = [], uv = [];
      const z = zb - 0.003;
      for (let i = 0; i <= segs; i++) {
        const a = mid + span / 2 - (span * i) / segs; // reading direction seen from the back
        for (const [rr, v] of [[Rt - th / 2, 1], [Rt + th / 2, 0]]) {
          pos.push(rr * Math.cos(a), rr * Math.sin(a), z);
          uv.push(i / segs, v);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(gridIndex(segs + 1, 2, false, false));
      const p = geo.attributes.position.array, ix = geo.index.array;
      const ux = p[ix[1] * 3] - p[ix[0] * 3], uy = p[ix[1] * 3 + 1] - p[ix[0] * 3 + 1];
      const vx = p[ix[2] * 3] - p[ix[0] * 3], vy = p[ix[2] * 3 + 1] - p[ix[0] * 3 + 1];
      if (ux * vy - uy * vx > 0) flipIndex(geo); // face −Z (outwards, seen from the back)
      geo.computeVertexNormals();
      // the cut letters are matte; on the mirror-polished face they read mid-grey
      // (#8a8a8a in back.jpg against the bright face), so the decal is a darker satin steel
      const mat = decalMaterial(M.steelSatin, glyphTexture(tx.canvas), cb.textColour || '#8a8a8a', 0.72, 0.35);
      mat.color.multiplyScalar(0.62);
      add(object, geo, mat, { cast: false, receive: false, name: 'caseback-engraving' });
    }

    reg.add({
      id: 'caseback-ring', name: 'Case back', category: 'case', side: 'back', exposed: true,
      object, explode: X('caseback-ring'), explodeDelay: D('caseback-ring'), priority: 2,
      anchor: [18.3 * Math.cos(-150 * DEG), 18.3 * Math.sin(-150 * DEG), (zb + cb.bevelTopZ) / 2],
      description: 'The polished steel back, snapped into the middle case — there are no screws. It holds the sapphire display glass, and its flat face carries the engraved model name and the individual case number.',
      facts: { Engraving: label, 'Clear window': `Ø ${(cb.aperture * 2).toFixed(1)} mm`, Fitting: 'Snap-on (no screws)', Material: '316L stainless steel, polished' },
    });
  }

  // ================================================================ case back glass
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const R = C.backGlass.radius - 0.01;
    const [z0, z1] = C.backGlass.z;
    const g = new MeshBuilder();
    const ring = angles(160);
    lathe(g, [[0, z0], [R * 0.5, z0], [R - 0.04, z0]], ring);
    lathe(g, [[R - 0.04, z0], [R, z0 + 0.04]], ring);
    lathe(g, [[R, z0 + 0.04], [R, z1 - 0.04]], ring);
    lathe(g, [[R, z1 - 0.04], [R - 0.04, z1]], ring);
    lathe(g, [[R - 0.04, z1], [R * 0.5, z1], [0, z1]], ring);
    const mesh = add(object, g.geometry(), backGlass, { cast: false, receive: false });
    mesh.renderOrder = 2;
    reg.add({
      id: 'caseback-glass', name: 'Sapphire display back', category: 'case', side: 'back', exposed: true,
      object, explode: X('caseback-glass'), explodeDelay: D('caseback-glass'), priority: 2,
      anchor: [8.6, 7.4, z0],
      description: 'A sapphire window in the case back that shows the automatic DUW 6101 at work: the rotor with its gold lettering, the ribbed three-quarter plate, the tempered blue screws and the balance.',
      facts: { Material: 'Synthetic sapphire', Diameter: `${(C.backGlass.radius * 2).toFixed(1)} mm`, Thickness: `${(z1 - z0).toFixed(1)} mm (est.)`, 'Clear window': `Ø ${(cb.aperture * 2).toFixed(1)} mm` },
    });
  }

  // ================================================================ casing screw (clamp)
  if (!lite) {
    const object = new THREE.Group();
    root.add(object);
    const cs = spec.frame.casingScrew;
    const [sx, sy] = cs.at;
    const [h0, h1] = Z.casingScrewHead; // −2.25 … −2.10
    const zMid = h0 + 0.08; // the head (back side) over the clamp tab
    const rH = cs.headDiameter / 2;
    const psi = Math.atan2(sy, sx);
    const reach = cs.clampReach - Math.hypot(sx, sy);
    // clamp tab: round under the head, tongue out over the casing ring's lip
    const tab = new THREE.Shape();
    {
      const hw = cs.clampHalfWidth;
      const b = Math.asin(hw / rH);
      tab.moveTo(rH * Math.cos(b), rH * Math.sin(b));
      tab.absarc(0, 0, rH, b, TAU - b, false);
      tab.lineTo(reach, -hw);
      tab.absarc(reach, 0, hw, -Math.PI / 2, Math.PI / 2, false);
      tab.lineTo(rH * Math.cos(b), rH * Math.sin(b));
    }
    const tabGeo = new THREE.ExtrudeGeometry(tab, { depth: h1 - zMid - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelOffset: -0.015, bevelSegments: 1, curveSegments: 24 });
    tabGeo.translate(0, 0, zMid + 0.015);
    tabGeo.rotateZ(psi);
    tabGeo.translate(sx, sy, 0);
    add(object, tabGeo, M.steelSatin);
    // slotted head: two half discs either side of the slot (seen from the back) over a
    // solid disc whose face is the slot's floor, and the shank into the pillar plate
    const slotW = 0.2, slotD = 0.045, bvl = 0.015;
    const zs = h0 + slotD; // slot floor
    const halves = [1, -1].map((side) => {
      const s = new THREE.Shape();
      const rr = rH - 0.02;
      const b = Math.asin(clamp(slotW / 2 / rr, 0, 1));
      if (side > 0) { s.moveTo(rr * Math.sin(b), -rr * Math.cos(b)); s.absarc(0, 0, rr, -Math.PI / 2 + b, Math.PI / 2 - b, false); }
      else { s.moveTo(-rr * Math.sin(b), rr * Math.cos(b)); s.absarc(0, 0, rr, Math.PI / 2 + b, 1.5 * Math.PI - b, false); }
      s.closePath();
      const gg = new THREE.ExtrudeGeometry(s, { depth: slotD - 2 * bvl, bevelEnabled: true, bevelThickness: bvl, bevelSize: bvl, bevelOffset: -bvl, bevelSegments: 2, curveSegments: 20 });
      gg.translate(0, 0, h0 + bvl);
      return gg;
    });
    const hb = new MeshBuilder();
    lathe(hb, [[0.001, zs], [rH - bvl, zs]], angles(40)); // slot floor (faces the back)
    lathe(hb, [[rH - bvl, zs], [rH, zs + bvl], [rH, zMid]], angles(40));
    lathe(hb, [[0.32, h1], [0.32, -1.3]], angles(20));
    lathe(hb, [[0.32, -1.3], [0.001, -1.3]], angles(20));
    const head = mergeAll([...halves, hb.geometry()]);
    head.rotateZ(psi + 28 * DEG);
    head.translate(sx, sy, 0);
    add(object, head, M.steelPinion);
    reg.add({
      id: 'case-clamps', name: 'Casing screw', category: 'case', side: 'back', exposed: true,
      object, explode: X('case-clamps'), explodeDelay: D('case-clamps'), priority: 2,
      anchor: [sx, sy, h0],
      description: 'A plain slotted steel screw at 12 o’clock, in a notch at the edge of the three-quarter plate. The clamp under its head presses on the casing ring’s lip, so the movement cannot shift in the case when the crown is pushed, pulled or turned.',
      facts: { Head: `Ø ${cs.headDiameter.toFixed(1)} mm, slotted`, Count: '1', Finish: 'Plain steel', Position: '12 o’clock, half under the back ring' },
    });
  }

  // ================================================================ straps
  if (lite) return; // the watch box draws its own band (straps, buckle: not built)
  const ST = C.strap;
  const sb = C.lug.springBar;
  const zMid = (ST.exitZ[0] + ST.exitZ[1]) / 2; // −2.67: the strap's mid-plane where it leaves the lugs
  const wGap = 2 * C.lug.xInner - 0.3; // 18.9: between the lugs (19.2)
  const common = {
    zBar: sb.z, zMid, noseR: STRAP.noseR, w0: wGap, w1: ST.widthAtBuckle, uTaper: ST.length.buckleSide,
    t0: ST.thickness, t1: ST.thicknessAtEnd, uFlat: STRAP.flat, curl: STRAP.curl, inset: ST.stitch.inset, holeR: STRAP.holeR,
  };
  const Ltail = ST.length.tail, Lbuck = ST.length.buckleSide;
  const holes = [];
  for (let k = 0; k < ST.holes; k++) holes.push(Ltail - STRAP.holeFromTip - k * STRAP.holePitch);
  const top = makeStrap({ ...common, sgn: 1, yBar: sb.y, L: Ltail, end: 'round', holes });
  const bot = makeStrap({ ...common, sgn: -1, yBar: -sb.y, L: Lbuck, end: 'fold', foldLen: STRAP.foldLen, foldExtra: STRAP.foldExtra, holes: [] });

  // Shell cordovan has no grain at all (it is the dense membrane under the hide, not the
  // grain side): a smooth, waxy, glazed black whose soft sheen comes from the clear coat.
  const cordovan = M.leather.clone();
  cordovan.normalMap = null;
  cordovan.roughnessMap = null;
  cordovan.color = new THREE.Color(ST.colour || '#121316');
  cordovan.roughness = ST.roughness ?? 0.4;
  cordovan.clearcoat = 0.45;
  cordovan.clearcoatRoughness = 0.3;
  cordovan.name = 'shellCordovan';
  // lining: dark grey nubuck with a faint green cast (back render: #565752 under its light)
  const lining = M.leather.clone();
  lining.color = new THREE.Color(0x474a45);
  lining.roughness = 0.92;
  lining.clearcoat = 0;
  lining.normalScale = new THREE.Vector2(0.3, 0.3);
  lining.sheen = 0.55;
  lining.sheenColor = new THREE.Color(0x777a74);
  lining.sheenRoughness = 0.8;
  lining.name = 'strapLining';
  // black polyester thread: matte, it reads only as a faint relief on the black leather
  const env = ctx.stage?.scene?.environment || null;
  const thread = M.stitch.clone();
  thread.color = new THREE.Color(ST.stitch.colour || '#1a1a1a');
  thread.roughness = 0.8;
  thread.envMap = env;
  thread.envMapIntensity = 0.45;
  const strapFacts = (extra) => ({ Leather: 'Horween Genuine Shell Cordovan, black', Construction: 'Rembordé (turned edges), stitched', Width: `${C.strap.width} mm at the lugs, ${ST.widthAtBuckle} mm at the buckle`, ...extra });

  {
    const object = new THREE.Group();
    root.add(object);
    add(object, top.geoL, cordovan);
    add(object, top.geoB, lining);
    add(object, stitchGeometry(top, 1.2, top.L, ST.stitch.pitch, false), thread, { cast: false });
    const a = top.map(13, 0, top.hTop(top.sect(13), 0));
    reg.add({
      id: 'strap-top', name: 'Strap (12 o’clock)', category: 'case', side: 'both', exposed: true,
      object, explode: X('strap-top'), explodeDelay: D('strap-top'), priority: 2,
      anchor: a,
      description: 'The long half of the strap, in black Horween shell cordovan — the dense membrane under a horse’s hide, tanned for months in Chicago, with no grain and a deep, waxy shine. It is made rembordé: the top leather is turned round the edges, so no cut edge shows. Six punched holes take the buckle’s tongue.',
      facts: strapFacts({ Holes: String(ST.holes), Length: `≈ ${Ltail} mm (est.)` }),
    });
  }

  {
    const object = new THREE.Group();
    root.add(object);
    add(object, bot.geoL, cordovan);
    add(object, bot.geoB, lining);
    add(object, stitchGeometry(bot, 1.2, bot.L - STRAP.foldLen - 1.6, ST.stitch.pitch, false), thread, { cast: false });
    add(object, mergeAll(STRAP.keepers.map((d) => keeperGeometry(bot, bot.L - d))), cordovan);
    const a = bot.map(13, 0, bot.hTop(bot.sect(13), 0));
    reg.add({
      id: 'strap-bottom', name: 'Strap (6 o’clock)', category: 'case', side: 'both', exposed: true,
      object, explode: X('strap-bottom'), explodeDelay: D('strap-bottom'), priority: 2,
      anchor: a,
      description: 'The buckle half of the shell cordovan strap. Its end is folded round the buckle’s pin; a fixed and a floating keeper hold the fold and the tip of the other half.',
      facts: strapFacts({ Keepers: 'One fixed, one floating', Length: `≈ ${Lbuck} mm (est.)` }),
    });
  }

  // ================================================================ buckle
  {
    const BK = C.buckle;
    const object = new THREE.Group();
    // at the pin: local X across the strap, Y along it (towards the front bar), Z outward
    const { A, T, N } = bot.frame(bot.ub);
    const pin = bot.map(bot.ub, 0, bot.ncE);
    object.position.set(pin[0], pin[1], pin[2]);
    object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(A, T, N));
    root.add(object);
    const tilt = new THREE.Group(); // the frame rests on the strap, pivoting about its pin
    object.add(tilt);

    const W = BK.outerWidth / 2, Lb = BK.length, yB = -BUCKLE.back, yF = yB + Lb;
    const sideW = BK.sideBar, fbD = BK.frontBarDepth, bbD = BK.sideBar; // back bar as slim as the sides
    const tk = BK.thickness;
    const cc = BUCKLE.concave;
    const xOut = (y) => W - cc * Math.sin(Math.PI * clamp((y - yB) / Lb, 0, 1));
    // outer outline (concave sides, flared corners) and the window, as polylines
    const outerPts = [], innerPts = [];
    const ny = 8; // side samples ≥ 1.5 apart, so the corner fillets keep their full radius
    outerPts.push([-W, yB], [W, yB]);
    for (let k = 1; k < ny; k++) { const y = yB + (Lb * k) / ny; outerPts.push([xOut(y), y]); }
    outerPts.push([W, yF], [-W, yF]);
    for (let k = ny - 1; k >= 1; k--) { const y = yB + (Lb * k) / ny; outerPts.push([-xOut(y), y]); }
    const wy0 = yB + bbD, wy1 = yF - fbD;
    innerPts.push([-(xOut(wy0) - sideW), wy0], [xOut(wy0) - sideW, wy0]);
    for (let k = 1; k < ny; k++) { const y = wy0 + ((wy1 - wy0) * k) / ny; innerPts.push([xOut(y) - sideW, y]); }
    innerPts.push([xOut(wy1) - sideW, wy1], [-(xOut(wy1) - sideW), wy1]);
    for (let k = ny - 1; k >= 1; k--) { const y = wy0 + ((wy1 - wy0) * k) / ny; innerPts.push([-(xOut(y) - sideW), y]); }
    const cornerIdx = (pts, n) => pts.map((_, i) => (i === 0 || i === 1 || i === n + 1 || i === n + 2 ? 1 : 0));
    const oR = cornerIdx(outerPts, ny).map((f) => f * BUCKLE.cornerR);
    const iR = cornerIdx(innerPts, ny).map((f) => f * BUCKLE.innerCornerR);
    const oP = filletPolygon(outerPts, oR, 8), iP = filletPolygon(innerPts, iR, 6);
    const shape = new THREE.Shape(oP.map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes.push(new THREE.Path(iP.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y))));
    const bv = BUCKLE.bevel;
    const frame = new THREE.ExtrudeGeometry(shape, { depth: tk - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 4 });
    frame.translate(0, 0, -tk / 2 + bv);
    // pin (the strap is folded round it) between the side bars
    const pinB = new MeshBuilder();
    const xp = W - cc * Math.sin(Math.PI * (-yB / Lb)) - 0.35;
    lathe(pinB, [[0.001, -xp], [BUCKLE.pinR, -xp], [BUCKLE.pinR, xp], [0.001, xp]], angles(24));
    const pinG = pinB.geometry();
    pinG.rotateY(Math.PI / 2);
    // tongue: a flattened wire looped round the pin, running forward to rest against the
    // front bar's inner edge, its tip bent down (product photo)
    const rl = BUCKLE.pinR + BUCKLE.tongueR + 0.02;
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const a = (-0 - (270 * k) / 12) * DEG; // from the front, under the pin, up the back, over the top
      pts.push(new THREE.Vector3(0, rl * Math.cos(a), rl * Math.sin(a)));
    }
    const zRest = tk / 2 + BUCKLE.tongueR * 0.85;
    pts.push(new THREE.Vector3(0, 1.2, rl + 0.05), new THREE.Vector3(0, 3.5, (rl + zRest) / 2 + 0.05), new THREE.Vector3(0, wy1 - 1.5, zRest),
      new THREE.Vector3(0, wy1 - 0.8, zRest - 0.07), new THREE.Vector3(0, wy1 - 0.52, zRest - 0.33), new THREE.Vector3(0, wy1 - 0.44, zRest - 0.6));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.TubeGeometry(curve, 96, BUCKLE.tongueR, 14, false);
    const tipC = curve.getPoint(1);
    const tipG = new THREE.SphereGeometry(BUCKLE.tongueR, 14, 8).translate(tipC.x, tipC.y, tipC.z);
    const endC = curve.getPoint(0);
    const endG = new THREE.SphereGeometry(BUCKLE.tongueR, 14, 8).translate(endC.x, endC.y, endC.z);
    const tongue = mergeAll([tube, tipG, endG]).scale(BUCKLE.tongueFlat, 1, 1);
    add(tilt, mergeAll([frame, pinG, tongue]), steel, { name: 'buckle' });

    // "NOMOS" engraved along the wide front bar, tops towards the bar's outer edge
    {
      const capH = BUCKLE.textCap;
      const tx = glyphCanvas(BK.text || 'NOMOS', { style: 'nomos', stroke: 0.1, width: BUCKLE.textWidth / capH, ppe: 150 });
      const tw = tx.W * capH, th = tx.H * capH;
      const yc = yF - fbD / 2, z = tk / 2 + 0.004;
      const geo = new THREE.PlaneGeometry(tw, th);
      geo.translate(0, yc, z);
      const mat = decalMaterial(M.steelSatin, glyphTexture(tx.canvas), '#7d8186', 0.5, 0.65);
      add(tilt, geo, mat, { cast: false, receive: false, name: 'buckle-engraving' });
    }

    // Tilt about the pin until the back bar rests on the strap (the buckle's natural pose
    // on the open strap): sample the strap's top under the back bar.
    {
      object.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(object.matrix).invert();
      const samples = [];
      const p = [0, 0, 0];
      const v3 = new THREE.Vector3();
      for (let u = bot.ub - BUCKLE.back - 1.5; u < bot.ub - 0.5; u += 0.25) {
        const sc = bot.sect(u);
        for (const v of [-sc.a * 0.9, -sc.a * 0.5, 0, sc.a * 0.5, sc.a * 0.9]) {
          bot.map(u, v, bot.hTop(sc, v), p);
          samples.push(v3.set(p[0], p[1], p[2]).clone().applyMatrix4(inv));
        }
      }
      let beta = 0;
      for (; beta < 50 * DEG; beta += 0.25 * DEG) {
        const c = Math.cos(beta), s = Math.sin(beta);
        let ok = true;
        for (const q of samples) {
          // into the tilted frame (rotation about X by −beta, inverse applied)
          const y = q.y * c - q.z * s, zq = q.y * s + q.z * c;
          if (y > yB - 0.3 && y < wy0 + 0.3 && zq > -tk / 2 - 0.06) { ok = false; break; }
        }
        if (ok) break;
      }
      tilt.rotation.x = -beta;
    }

    reg.add({
      id: 'buckle', name: 'Pin buckle', category: 'case', side: 'both', exposed: true,
      object, explode: X('buckle'), explodeDelay: D('buckle'), priority: 3,
      anchor: [0, yF - fbD / 2, tk / 2],
      description: 'NOMOS’s square winged pin buckle in polished steel. The strap is folded round its pin; the tongue passes through one of the six holes of the other half, and NOMOS is engraved along the wide front bar.',
      facts: { Type: 'Square winged pin buckle (Flügelschließe eckig)', Width: `${BK.outerWidth} mm (est.)`, 'Strap width': `${ST.widthAtBuckle} mm`, Material: 'Stainless steel, polished' },
    });
  }
}
