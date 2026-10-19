// AUTOMATIC WINDING of the DUW 6101 (neomatik): the rotor (rhodium half-moon rim + S-bar +
// collar, Glashütte ribbing continuing the plate's, raised gold "NOMOS GLASHÜTTE DEUTSCHE
// UHRENWERKE") with its 60-tooth rotor wheel; the fixed ball bearing (disc + 3 screws +
// centre jewel, 9 balls, notched bayonet ring); the reverser "Doppelklinkenrad" (gilt 20
// following the rotor both ways + steel click star 16 + one-way pinion 8) in its window of
// the 3/4 plate; the hidden reduction wheels A 26|16, B 48|18, C 34|8, D 24|10 and the
// transmission wheel T 22 that turns the ratchet.
// Registers: rotor, rotor-bearing, reversing-wheels, winding-train.
// Reads: SPEC.rotor, SPEC.autoTrain (teeth + ratios), SPEC.automatic, SPEC.modules,
//   SPEC.layout, SPEC.z, SPEC.frame.steelScrews.bearing, SPEC.explode / explodeDelay,
//   parts/finish.js ribbedMaterial / ribbingUV / rubyMaterial. See research/tangente-update-147/plan.md §4.6.
//
// The rotor is modelled in its LOCAL frame (dial-frame orientation, heavy rim at local −Y,
// engine rot 0 = hanging to 6 o'clock) from the measured outline and window polygons:
//  - an inner slab (collar, S-bar, the rim's inner step) with a polished chamfer round
//    every edge and Glashütte ribbing on top (ribbingUV at the reference angle 71.8°, so
//    the bands continue the plate's bands in every NOMOS pose);
//  - the rim swept in polar coordinates between its two end cuts: the satin lettered flat,
//    the radially brushed outer bevel, the polished inner step, the brushed outer wall and
//    the heavier skirt underneath;
//  - 32 raised gold letters (a bold rounded DIN cap, measured letter by letter on the
//    render) reading counter-clockwise from the back with their tops to the axis.
// The hidden winding wheels turn by exact tooth ratios of state.rot.ratchet; the reverser's
// gilt wheel follows the rotor, its star and pinion turn one way with the ratchet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ribbedMaterial, ribbingUV, rubyMaterial } from './finish.js';
import {
  Batch, mtx, latheZ, discUV, makeWheelGeo, screwGeo, screwMtx, leafGeometry, BACK, nonIndexed, stdAttrs,
  brushedNormalMap, contours, simplifyLoop, loopArea,
} from './train.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const V2 = (x, y) => new THREE.Vector2(x, y);

// ===================================================================== mesh phases (plan §2)
export function autoPhases(spec, gear) {
  const L = spec.layout, AT = spec.autoTrain, WT = spec.windingTrain;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const P = {};
  P.T = gear.meshPhase(ang(L.barrel, L.autoT), WT.ratchet.teeth, AT.T.teeth, 0); // ratchet at phase 0
  P.Dpinion = gear.meshPhase(ang(L.autoT, L.autoD), AT.T.teeth, AT.D.pinion, P.T);
  P.Dwheel = 0;
  P.Cpinion = gear.meshPhase(ang(L.autoD, L.autoC), AT.D.teeth, AT.C.pinion, 0);
  P.Cwheel = 0;
  P.Bpinion = gear.meshPhase(ang(L.autoC, L.autoB), AT.C.teeth, AT.B.pinion, 0);
  P.Bwheel = 0;
  P.Apinion = gear.meshPhase(ang(L.autoB, L.autoA), AT.B.teeth, AT.A.pinion, 0);
  P.Awheel = 0;
  P.reverserPinion = gear.meshPhase(ang(L.autoA, L.reverser), AT.A.teeth, AT.reverser.pinion, 0);
  P.rotorWheel = 0; // inside the rotor's group
  P.reverserWheel = gear.meshPhase(ang(L.center, L.reverser), AT.rotorWheel.teeth, AT.reverser.teeth, 0);
  return P;
}

// ===================================================================== rotor-letter font
// A bold, rounded DIN capital (stroke ≈ 0.23 of the cap height, round terminals), drawn as
// stroke centrelines in a box [0, w] × [0, 1]. Widths are the letters' outer widths
// measured on the official render (unwrapped round the rotor, true aspect).
const FS = 0.23, h = FS / 2;
function arc(cx, cy, rx, ry, a0, a1, n = 20) {
  const o = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * DEG; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return o;
}
const poly = (...items) => { const p = []; for (const it of items) { if (typeof it[0] === 'number') p.push(it); else p.push(...it); } return p; };
const GLYPHS = (() => {
  const G = {};
  const add = (ch, w, ...strokes) => { G[ch] = { w, s: strokes }; };
  const T = 1 - h, Bt = h;
  let w, R;
  w = 0.77; add('N', w, poly([h, Bt], [h, T], [w - h, Bt], [w - h, T]));
  w = 0.76; R = w / 2 - h; add('O', w, poly(arc(w / 2, T - R, R, R, 0, 180), arc(w / 2, Bt + R, R, R, 180, 360), [w - h, T - R]));
  w = 0.93; add('M', w, poly([h, Bt], [h, T], [w / 2, 0.36], [w - h, T], [w - h, Bt]));
  {
    w = 0.71; const rx = w / 2 - h, rt = 0.185, rb = (1 - 2 * h) / 2 - rt;
    add('S', w, poly(arc(w / 2, T - rt, rx, rt, 28, 270, 24), arc(w / 2, Bt + rb, rx, rb, 90, -152, 26)));
  }
  w = 0.74; R = w / 2 - h; add('G', w, poly(arc(w / 2, T - R, R, R, 32, 180, 14), arc(w / 2, Bt + R, R, R, 180, 360, 16), [w - h, 0.47], [w / 2 + 0.02, 0.47]));
  w = 0.65; add('L', w, poly([h, T], [h, Bt], [w - h, Bt]));
  w = 0.77; add('A', w, poly([h, Bt], [w / 2, T], [w - h, Bt]), poly([w * 0.27, 0.33], [w * 0.73, 0.33]));
  w = 0.74; add('H', w, poly([h, Bt], [h, T]), poly([w - h, Bt], [w - h, T]), poly([h, 0.5], [w - h, 0.5]));
  w = 0.74; R = w / 2 - h; add('U', w, poly([h, T], arc(w / 2, Bt + R, R, R, 180, 360), [w - h, T]));
  add('Ü', w, ...G.U.s);
  G['Ü'].dots = [[h + 0.03, 1.16, 0.075], [w - h - 0.03, 1.16, 0.075]]; // small round dots above the cap line (render)
  w = 0.74; add('T', w, poly([h, T], [w - h, T]), poly([w / 2, T], [w / 2, Bt]));
  w = 0.69; add('E', w, poly([w - h, T], [h, T], [h, Bt], [w - h, Bt]), poly([h, 0.5], [w - h - 0.05, 0.5]));
  w = 0.74; R = 0.3; add('D', w, poly([h, Bt], [h, T], [w - h - R, T], arc(w - h - R, T - R, R, R, 90, 0, 10), arc(w - h - R, Bt + R, R, R, 0, -90, 10), [h, Bt]));
  w = 0.72; R = w / 2 - h; add('C', w, poly(arc(w / 2, T - R, R, R, 36, 180, 14), arc(w / 2, Bt + R, R, R, 180, 324, 14)));
  {
    w = 0.74; const rb = 0.21, yb = T - 2 * rb;
    add('R', w, poly([h, Bt], [h, T], [w - h - rb, T], arc(w - h - rb, T - rb, rb, rb, 90, -90, 14), [h, yb]), poly([w - h - rb - 0.04, yb], [w - h, Bt]));
  }
  w = 1.15; add('W', w, poly([h, T], [w * 0.28, Bt], [w / 2, T], [w * 0.72, Bt], [w - h, T]));
  w = 0.73; add('K', w, poly([h, Bt], [h, T]), poly([w - h, T], [h + 0.02, 0.4]), poly([h + 0.2, 0.55], [w - h, Bt]));
  return G;
})();
function glyphSdf(g) {
  const segs = [];
  for (const s of g.s) for (let i = 0; i + 1 < s.length; i++) segs.push([s[i], s[i + 1]]);
  const dots = g.dots || [];
  return (x, y) => {
    let d = Infinity;
    for (const [a, b] of segs) {
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12;
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const q = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
      if (q < d) d = q;
    }
    d -= FS / 2;
    for (const [cx, cy, r] of dots) d = Math.min(d, Math.hypot(x - cx, y - cy) - r);
    return d;
  };
}
// Letter centres (local math angle, deg) MEASURED on the official back render (gold-pixel
// runs along r 12.62, rotor at 71.8°) — a local constant: SPEC gives only the first and
// last letter (−8.6° / −173.1°); the measured run is mapped linearly onto those two.
const LETTER_CENTRES_MEAS = [-8.70, -13.92, -19.32, -24.85, -29.80, -37.25, -42.10, -46.22, -50.95, -55.90, -61.22, -66.00,
  -70.60, -75.37, -83.05, -87.92, -92.75, -97.55, -102.17, -107.10, -112.30, -117.50, -125.52, -130.87, -136.10, -141.07,
  -146.10, -152.25, -158.05, -163.05, -168.32, -173.37];

// ===================================================================== geometry helpers
// Sutherland–Hodgman: clip a polygon ([x, y][]) against a convex CCW polygon.
function clipConvex(subject, clip) {
  let out = subject;
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const inside = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
    const inter = (p, q) => {
      const x1 = p[0], y1 = p[1], x2 = q[0], y2 = q[1], x3 = a[0], y3 = a[1], x4 = b[0], y4 = b[1];
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    };
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length];
      const pi = inside(p), qi = inside(q);
      if (pi) { out.push(p); if (!qi) out.push(inter(p, q)); } else if (qi) out.push(inter(p, q));
    }
    if (!out.length) break;
  }
  return out;
}
const circlePoly = (r, n = 720) => [...Array(n)].map((_, i) => [r * Math.cos((i / n) * TAU), r * Math.sin((i / n) * TAU)]);
// densify a closed polygon so straight edges keep enough vertices for smooth chamfers
function densify(pts, step) {
  const o = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) o.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return o;
}
// A traced polygon → a smooth outline: centripetal Catmull–Rom through the measured points,
// run by run between real corners (turn > `cornerDeg`), which stay sharp.
function smoothPolygon(pts, cornerDeg = 30, step = 0.06) {
  const n = pts.length;
  const turn = (i) => {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    let d = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return Math.abs(d);
  };
  const corners = [];
  for (let i = 0; i < n; i++) if (turn(i) > cornerDeg * DEG) corners.push(i);
  const V3 = (p) => new THREE.Vector3(p[0], p[1], 0);
  const sample = (curve, len) => { const m = Math.max(2, Math.ceil(len / step)); return curve.getSpacedPoints(m).map((v) => [v.x, v.y]); };
  if (!corners.length) {
    const c = new THREE.CatmullRomCurve3(pts.map(V3), true, 'centripetal');
    return sample(c, c.getLength()).slice(0, -1);
  }
  const out = [];
  for (let k = 0; k < corners.length; k++) {
    const i0 = corners[k], i1 = corners[(k + 1) % corners.length];
    const run = [];
    for (let i = i0; ; i = (i + 1) % n) { run.push(pts[i]); if (i === i1 && run.length > 1) break; if (run.length > n + 1) break; }
    if (run.length === 2) { out.push(run[0]); continue; } // a straight edge between two corners
    const c = new THREE.CatmullRomCurve3(run.map(V3), false, 'centripetal');
    out.push(...sample(c, c.getLength()).slice(0, -1));
  }
  return out;
}
// Extrusion of `shape` from 0 to H along +z with a 45° chamfer (width c) on the TOP edges
// only. Returns a non-indexed geometry with a per-vertex tag: 0 bottom cap, 1 walls, 2 top
// chamfer, 3 top cap (classified by the faces' normals / heights).
function chamferTopExtrude(shape, H, c, curveSegments = 24) {
  const low = nonIndexed(new THREE.ExtrudeGeometry(shape, { depth: H - c, bevelEnabled: false, curveSegments }));
  const d = 0.0005;
  const top = nonIndexed(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelOffset: -c, bevelSegments: 1, curveSegments }));
  const pos = [], tag = [];
  const P = low.attributes.position;
  const v = new THREE.Vector3(), w = new THREE.Vector3(), u = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let i = 0; i < P.count; i += 3) {
    v.fromBufferAttribute(P, i); w.fromBufferAttribute(P, i + 1); u.fromBufferAttribute(P, i + 2);
    nrm.subVectors(w, v).cross(u.clone().sub(v)).normalize();
    const zMin = Math.min(v.z, w.z, u.z);
    if (nrm.z > 0.99 && zMin > H - c - 1e-6) continue; // the plain part's top cap: covered
    const t = nrm.z < -0.99 ? 0 : 1;
    pos.push(v.x, v.y, v.z, w.x, w.y, w.z, u.x, u.y, u.z);
    tag.push(t, t, t);
  }
  const Q = top.attributes.position;
  for (let i = 0; i < Q.count; i += 3) {
    v.fromBufferAttribute(Q, i); w.fromBufferAttribute(Q, i + 1); u.fromBufferAttribute(Q, i + 2);
    if (Math.min(v.z, w.z, u.z) < d * 0.5) continue; // keep the upper half: top chamfer + cap
    nrm.subVectors(w, v).cross(u.clone().sub(v)).normalize();
    const t = nrm.z > 0.999 ? 3 : 2;
    const dz = H - c - d;
    pos.push(v.x, v.y, v.z + dz, w.x, w.y, w.z + dz, u.x, u.y, u.z + dz);
    tag.push(t, t, t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.userData.tag = Int8Array.from(tag);
  return g;
}
// Split a tagged geometry into one geometry per tag.
function splitTags(g, n = 4) {
  const tag = g.userData.tag, P = g.attributes.position, N = g.attributes.normal;
  const outs = [];
  for (let t = 0; t < n; t++) {
    const pos = [], nor = [];
    for (let i = 0; i < P.count; i++) if (tag[i] === t) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); }
    const o = new THREE.BufferGeometry();
    o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    o.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    outs.push(o);
  }
  return outs;
}
// Grid surface → indexed geometry; `vert(i, j)` gives [x, y, z]; orientation fixed so the
// first triangle's normal points along `want` (a function of the first vertex).
function gridSurface(ni, nj, vert, wantDir) {
  const pos = new Float32Array((ni + 1) * (nj + 1) * 3);
  for (let i = 0; i <= ni; i++) for (let j = 0; j <= nj; j++) { const p = vert(i, j), k = (i * (nj + 1) + j) * 3; pos[k] = p[0]; pos[k + 1] = p[1]; pos[k + 2] = p[2]; }
  const idx = [];
  const id = (i, j) => i * (nj + 1) + j;
  for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) idx.push(id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // orientation check on the first non-degenerate triangle
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    a.fromArray(pos, idx[t] * 3); b.fromArray(pos, idx[t + 1] * 3); c.fromArray(pos, idx[t + 2] * 3);
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    if (n.lengthSq() < 1e-14) continue;
    if (n.dot(wantDir(a)) < 0) for (let s = 0; s < idx.length; s += 3) { const tmp = idx[s + 1]; idx[s + 1] = idx[s + 2]; idx[s + 2] = tmp; }
    break;
  }
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ===================================================================== the builder
export function buildAutomatic(ctx) {
  const { spec, M, reg, root, gear, planarUV } = ctx;
  if (ctx.lite) return;
  const Z = spec.z, L = spec.layout, AT = spec.autoTrain, WT = spec.windingTrain, MD = spec.modules, RO = spec.rotor;
  const AUTO = spec.automatic, RAT = AT.ratios;
  const fmt = (v, d = 1) => v.toFixed(d);
  const degOf = (v) => ((((v * 180) / Math.PI) % 360) + 360) % 360;
  const tipR = (z, m) => m * (z / 2 + 1.3);
  const rootR = (z, m) => m * (z / 2 - 1.6);
  const PH = autoPhases(spec, gear);

  function add(def) {
    const e = spec.explode[def.id] ?? [0, 0, 0];
    return reg.add({ ...def, explode: e, explodeDelay: spec.explodeDelay(def.id) });
  }

  // ---------- materials (clones only)
  const rib = ribbedMaterial(M);
  const satin = M.rhodium.clone(); // the lettered flat: plain satin rhodium with a fine grain (a touch darker than the ribbing, as rendered)
  satin.color.set(0xc4c6c9); satin.roughness = 0.48;
  if (M.textures && M.textures.dialGrain) { satin.normalMap = M.textures.dialGrain.normalMap; satin.normalScale = new THREE.Vector2(0.12, 0.12); }
  satin.name = 'duw6101RotorSatin';
  const bevelMat = M.sunburst.clone(); // radially brushed outer bevel
  bevelMat.color.set(0xd6d8db); bevelMat.roughness = 0.5; bevelMat.name = 'duw6101RotorBevel';
  const wallMat = M.steelSatin.clone(); // vertically brushed outer wall and end faces
  wallMat.color.set(0xcbcdd0); wallMat.roughness = 0.34; wallMat.anisotropy = 0.5;
  wallMat.normalMap = brushedNormalMap(431, 0.8); wallMat.normalScale = new THREE.Vector2(0.3, 0.3);
  wallMat.name = 'duw6101RotorWall';
  const polish = M.rhodiumBevel; // polished chamfers
  const plain = M.rhodium; // undersides
  const gold = M.goldText.clone(); // raised gold-plated letters
  gold.transparent = false; gold.opacity = 1;
  gold.color.set(RO.text.colour); gold.metalness = 1; gold.roughness = 0.3;
  gold.normalMap = brushedNormalMap(77, 1.2); gold.normalScale = new THREE.Vector2(0.35, 0.35);
  gold.name = 'duw6101RotorGold';
  const steel = M.steelPinion, steelPol = M.steelPolished;
  // large polished flats (bearing disc): polished, but not a perfect mirror — the renders
  // show them light grey with soft gradients, never black
  const softPol = M.steelPolished.clone(); softPol.roughness = 0.34; softPol.color.set(0xdfe1e4); softPol.name = 'duw6101SoftPolish';
  const gilt = M.wheelGilt.clone(); gilt.color.set(0xdcba7c); gilt.name = 'duw6101GiltAuto';
  const giltEdge = M.wheelGilt.clone();
  giltEdge.normalMap = null; giltEdge.roughnessMap = null; giltEdge.anisotropyMap = null; giltEdge.anisotropy = 0;
  giltEdge.roughness = 0.16; giltEdge.color.set(0xe8c98d); giltEdge.name = 'duw6101GiltEdgeAuto';
  const giltPair = [gilt, giltEdge], pinPair = [steel, steelPol];
  const ruby = rubyMaterial(M);

  // ===================================================================== ROTOR
  const rotorObj = new THREE.Group();
  root.add(rotorObj);
  const rotorRot = new THREE.Group();
  rotorObj.add(rotorRot);
  const RR = RO.radii;
  const zTopLow = Z.rotorBar[0], zUnder = Z.rotorRimUnder, zFlat = Z.rotorRimTop, zBevelOut = Z.rotorBevelOuterTop, zSkirt = Z.rotorSkirtUnder;
  const refRot = AUTO.refRotDeg;
  const R_SLAB = RR.rimFlatInner + 0.07; // the inner slab runs 0.07 under the rim's step (its chamfer stays hidden)
  {
    // ---- inner slab: outline − window − bore, clipped to r ≤ R_SLAB; chamfered top edges
    const outline = smoothPolygon(RO.outline);
    const clipped = clipConvex(outline, circlePoly(R_SLAB));
    const toBackV = (pts) => pts.map(([x, y]) => V2(-x, y)); // back-view coordinates (x mirrored)
    const shape = new THREE.Shape(toBackV(clipped));
    shape.holes.push(new THREE.Path(toBackV(smoothPolygon(RO.window))));
    shape.holes.push(new THREE.Path(toBackV(circlePoly(RR.collarInner, 160))));
    const H = zUnder - zTopLow; // 0.30
    const g = chamferTopExtrude(shape, H, 0.07, 24);
    // back-view extrusion (towards the viewer of the back) → dial frame, top at zTopLow
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, zUnder).multiply(BACK));
    const [gBottom, gWall, gChamfer, gTop] = splitTags(g);
    ribbingUV(gTop, spec, refRot);
    const b = new Batch();
    b.add(gTop, rib); b.add(gChamfer, polish); b.add(gWall, polish); b.add(gBottom, plain);
    // the collar reaches 0.03 lower than the bar (spec rotorCollar)
    const zc = Z.rotorCollar[1];
    b.add(latheZ([[RR.collarInner, zUnder], [RR.collar, zUnder], [RR.collar, zc - 0.015], [RR.collar - 0.015, zc], [RR.collarInner, zc], [RR.collarInner, zUnder]], 160), plain);
    b.build(rotorRot);
  }
  {
    // ---- the rim, swept in polar coordinates between its two end cuts
    // end boundaries (local frame) = the outline's end portions, monotonic in r
    const O = RO.outline;
    const n = O.length;
    // right end: the last outline points up to the first (outer) point; left end: from the
    // last outer-arc point inwards along the cut and the bar's top edge
    const rOf = (p) => Math.hypot(p[0], p[1]);
    const iOuterR = 0; // (15.56, −0.10)
    let iOuterL = 0; for (let i = 1; i < n; i++) if (O[i][0] < 0 && rOf(O[i]) > 15.0 && (i + 1 < n && rOf(O[i + 1]) < 15.0)) iOuterL = i;
    const rightEnd = []; // from small r to the outer corner
    for (let i = n - 1; i > 0; i--) { rightEnd.unshift(O[i]); if (rOf(O[i]) < RR.rimFlatInner - 0.5) break; }
    rightEnd.push(O[iOuterR]);
    const leftEnd = []; // from the outer corner inwards
    for (let i = iOuterL; i < n; i++) { leftEnd.push(O[i]); if (rOf(O[i]) < RR.rimFlatInner - 0.5) break; }
    leftEnd.reverse(); // small r → outer corner
    const crossing = (chain, r) => {
      for (let i = 0; i + 1 < chain.length; i++) {
        const a = chain[i], c = chain[i + 1], ra = rOf(a), rc = rOf(c);
        if ((r - ra) * (r - rc) <= 0 && ra !== rc) {
          // solve |a + t(c − a)| = r on the segment
          const dx = c[0] - a[0], dy = c[1] - a[1];
          const A = dx * dx + dy * dy, Bq = 2 * (a[0] * dx + a[1] * dy), C = a[0] * a[0] + a[1] * a[1] - r * r;
          const disc = Math.max(0, Bq * Bq - 4 * A * C);
          let t = (-Bq + Math.sqrt(disc)) / (2 * A);
          if (t < -1e-9 || t > 1 + 1e-9) t = (-Bq - Math.sqrt(disc)) / (2 * A);
          t = Math.min(1, Math.max(0, t));
          return [a[0] + t * dx, a[1] + t * dy];
        }
      }
      const last = chain[chain.length - 1];
      const a = Math.atan2(last[1], last[0]);
      return [r * Math.cos(a), r * Math.sin(a)];
    };
    const thR = (r) => { const p = crossing(rightEnd, Math.min(r, rOf(rightEnd[rightEnd.length - 1]))); return Math.atan2(p[1], p[0]); };
    const thL = (r) => { const p = crossing(leftEnd, Math.min(r, rOf(leftEnd[leftEnd.length - 1]))); let a = Math.atan2(p[1], p[0]); if (a > 0) a -= TAU; return a; };
    // ring radii: zone boundaries, end-polyline vertices, uniform fill
    const rIn = RR.rimFlatInner, rOut = RR.outer, rFlat = RR.rimFlatOuter, rSkirt = RR.skirt;
    const set = new Set([rIn, R_SLAB, rFlat, rSkirt, rOut]);
    for (const p of [...rightEnd, ...leftEnd]) { const r = rOf(p); if (r > rIn && r < rOut) set.add(+r.toFixed(4)); }
    for (let r = rIn; r < rOut; r += 0.2) set.add(+r.toFixed(4));
    const rings = [...set].filter((r) => r >= rIn - 1e-9 && r <= rOut + 1e-9).sort((a, b) => a - b);
    const NA = 300; // angular samples between the end cuts (≈ 0.6°)
    const zTop = (r) => (r <= rFlat ? zFlat : zFlat + ((zBevelOut - zFlat) * (r - rFlat)) / (rOut - rFlat));
    const zBot = (r) => (r >= rSkirt - 1e-9 ? zSkirt : zUnder);
    const P = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
    const angAt = (r, j) => { const a0 = thR(r), a1 = thL(r); return a0 + ((a1 - a0) * j) / NA; };
    const ringsIn = (r0, r1) => rings.filter((r) => r >= r0 - 1e-9 && r <= r1 + 1e-9);
    const surface = (rs, zf, dir) => gridSurface(rs.length - 1, NA, (i, j) => P(rs[i], angAt(rs[i], j), zf(rs[i])), () => dir);
    const up = new THREE.Vector3(0, 0, -1), down = new THREE.Vector3(0, 0, 1);
    const flatG = surface(ringsIn(rIn, rFlat), zTop, up);
    const bevelG = surface(ringsIn(rFlat, rOut), zTop, up);
    // satin flat: fine planar grain; bevel: radially brushed (disc UVs about the axis)
    planarUV(flatG, 0.35, [0, 0], 0);
    discUV(bevelG, rOut);
    // the undersides (r ≥ R_SLAB: the slab covers the rest)
    const bot1 = surface(ringsIn(R_SLAB, rSkirt), () => zUnder, down);
    const bot2 = surface(ringsIn(rSkirt, rOut), () => zSkirt, down);
    // inner step wall (r rIn, from the slab's top to the flat), skirt step (r rSkirt), outer wall
    const wall = (r, z0, z1, outward) => gridSurface(1, NA, (i, j) => P(r, angAt(r, j), i ? z1 : z0), (a) => new THREE.Vector3(a.x, a.y, 0).multiplyScalar(outward ? 1 : -1));
    const stepW = wall(rIn, zTopLow, zFlat, false);
    const skirtW = wall(rSkirt, zUnder, zSkirt, false);
    const outerW = wall(rOut, zSkirt, zBevelOut, true);
    // outer-wall UVs: u along the height (vertical brushing), v along the arc
    {
      const p = outerW.attributes.position, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getZ(i) * 2.5; uv[2 * i + 1] = Math.atan2(p.getY(i), p.getX(i)) * rOut * 0.5; }
      outerW.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    // end walls: planar polygons along each end chain, from the underside to the top
    const endWall = (side) => {
      const pts = [];
      const rs = rings;
      const bot = (r) => (r < R_SLAB - 1e-9 ? zTopLow : zBot(r)); // over the slab only the step shows
      // walk outward along the top, back inward along the bottom (with the skirt step)
      const pAt = (r) => { const a = side > 0 ? thR(r) : thL(r); return [r * Math.cos(a), r * Math.sin(a)]; };
      const top = rs.map((r) => [...pAt(r), zTop(r)]);
      const bottom = [];
      for (let i = rs.length - 1; i >= 0; i--) {
        const r = rs[i];
        if (Math.abs(r - rSkirt) < 1e-9) { bottom.push([...pAt(r), zSkirt], [...pAt(r), zUnder]); continue; }
        if (Math.abs(r - R_SLAB) < 1e-9) { bottom.push([...pAt(r), zUnder], [...pAt(r), zTopLow]); continue; }
        bottom.push([...pAt(r), bot(r)]);
      }
      pts.push(...top, ...bottom);
      // triangulate in the wall's own (s, z) coordinates (s = arc length along the chain)
      const s2 = [];
      let s = 0;
      for (let i = 0; i < top.length; i++) { if (i) s += Math.hypot(top[i][0] - top[i - 1][0], top[i][1] - top[i - 1][1]); s2.push(s); }
      const sOf = new Map();
      rs.forEach((r, i) => sOf.set(r, s2[i]));
      const flat2 = [];
      for (let i = 0; i < top.length; i++) flat2.push(V2(s2[i], top[i][2]));
      let k = rs.length - 1;
      for (const q of bottom) {
        // find the ring for this bottom point (walk backwards along the rings)
        while (k > 0 && Math.hypot(q[0], q[1]) < rs[k] - 1e-6) k--;
        flat2.push(V2(s2[k], q[2]));
      }
      const tris = THREE.ShapeUtils.triangulateShape(flat2, []);
      const pos = [];
      for (const t of tris) for (const ix of t) pos.push(...pts[ix]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      // orient outward: the right end faces +θ, the left end −θ (the material's outside)
      geo.computeVertexNormals();
      const pa = geo.attributes.position, na = geo.attributes.normal;
      const mid = top[Math.floor(top.length / 2)], am = Math.atan2(mid[1], mid[0]);
      const want = side > 0 ? [-Math.sin(am), Math.cos(am)] : [Math.sin(am), -Math.cos(am)];
      if (na.getX(0) * want[0] + na.getY(0) * want[1] < 0) {
        for (let i = 0; i < pa.count; i += 3) {
          for (const A of [pa, na]) { const x = A.getX(i + 1), y = A.getY(i + 1), zz = A.getZ(i + 1); A.setXYZ(i + 1, A.getX(i + 2), A.getY(i + 2), A.getZ(i + 2)); A.setXYZ(i + 2, x, y, zz); }
        }
        geo.computeVertexNormals();
      }
      planarUV(geo, 0.4, [0, 0], 0);
      return geo;
    };
    const b = new Batch();
    b.add(flatG, satin);
    b.add(bevelG, bevelMat);
    b.add(stepW, polish);
    b.add(outerW, wallMat);
    b.add(skirtW, plain);
    b.add(bot1, plain);
    b.add(bot2, plain);
    b.add(endWall(1), satin);
    b.add(endWall(-1), satin);
    b.build(rotorRot);
  }
  {
    // ---- raised gold letters on the flat (+relief), reading counter-clockwise from the back
    const T = RO.text, cap = T.capHeight, relief = T.relief;
    const chars = Array.from(T.text).filter((ch) => ch !== ' ');
    const m0 = LETTER_CENTRES_MEAS[0], m1 = LETTER_CENTRES_MEAS[LETTER_CENTRES_MEAS.length - 1];
    const centreDeg = (i) => {
      const meas = LETTER_CENTRES_MEAS[i] ?? m0 + ((m1 - m0) * i) / (chars.length - 1);
      return T.firstLetterDeg + ((meas - m0) * (T.lastLetterDeg - T.firstLetterDeg)) / (m1 - m0);
    };
    const geos = [];
    const bury = 0.02, bev = 0.012;
    chars.forEach((ch, i) => {
      const gl = GLYPHS[ch];
      if (!gl) return;
      const sdf = glyphSdf(gl);
      const top = gl.dots ? 1.3 : 1.06;
      const loops = contours(sdf, -0.08, -0.08, gl.w + 0.08, top + 0.08, 0.006).map((l) => simplifyLoop(l, 0.0008));
      if (!loops.length) return;
      // letter box centred: u = (x − w/2)·cap, v = (y − 0.5)·cap
      const toL = (l) => l.map((p) => V2((p.x - gl.w / 2) * cap, (p.y - 0.5) * cap));
      // outer loops (letters like Ü have several islands): sort by area, nest holes by containment
      const ls = loops.map(toL).map((pts) => ({ pts, area: loopArea(pts) }));
      ls.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
      const shapes = [];
      const inside = (p, poly2) => {
        let s = false;
        for (let a = 0, c = poly2.length - 1; a < poly2.length; c = a++) {
          const xi = poly2[a].x, yi = poly2[a].y, xj = poly2[c].x, yj = poly2[c].y;
          if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) s = !s;
        }
        return s;
      };
      for (const L2 of ls) {
        const host = shapes.find((sh) => inside(L2.pts[0], sh.getPoints()));
        if (host && !host.holes.some((hp) => inside(L2.pts[0], hp.getPoints()))) host.holes.push(new THREE.Path(L2.pts));
        else shapes.push(new THREE.Shape(L2.pts));
      }
      const g = new THREE.ExtrudeGeometry(shapes, { depth: relief + bury - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 2, curveSegments: 4 });
      g.translate(0, 0, -bury + bev);
      // brushed-gold UVs in the letter frame (lines at ~35° to the letters' vertical, as rendered)
      planarUV(g, 1 / 12, [i * 0.137, 0], 55 * DEG);
      // place: letter frame (u along the reading direction, v towards the axis) in BACK view
      const th = centreDeg(i) * DEG; // local dial-frame angle of the letter centre
      const phiB = Math.PI - th; // the same direction seen from the back
      const cB = [T.radius * Math.cos(phiB), T.radius * Math.sin(phiB)];
      const place = new THREE.Matrix4().makeTranslation(0, 0, zFlat).multiply(BACK)
        .multiply(new THREE.Matrix4().makeTranslation(cB[0], cB[1], 0)).multiply(new THREE.Matrix4().makeRotationZ(phiB + Math.PI / 2));
      g.applyMatrix4(place);
      geos.push(stdAttrs(nonIndexed(g)));
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), gold);
    rotorRot.add(mesh);
  }
  {
    // ---- rotor wheel 60 t under the collar (turns with the rotor), sunk in the plate groove
    const m = MD.rotorWheel, zt = Z.rotorWheelTeeth;
    const b = new Batch();
    const hole = rootR(AT.rotorWheel.teeth, m) - 0.02; // 3.30 > the bayonet ring (3.28): the rotor lifts off the bearing
    b.add(makeWheelGeo(gear, { teeth: AT.rotorWheel.teeth, module: m, thickness: zt[1] - zt[0], bore: hole }), pinPair, mtx(0, 0, (zt[0] + zt[1]) / 2, PH.rotorWheel), 35 * DEG);
    const tip = tipR(AT.rotorWheel.teeth, m);
    b.add(latheZ([[RR.collarInner, Z.rotorCollar[1]], [tip - 0.02, Z.rotorCollar[1]], [tip, Z.rotorCollar[1] + 0.02], [tip, zt[0] + 0.005], [RR.collarInner, zt[0] + 0.005], [RR.collarInner, Z.rotorCollar[1]]], 160), steelPol);
    b.build(rotorRot);
  }
  const rotorMass = RO.massG;
  add({
    id: 'rotor', name: 'Rotor', category: 'automatic', side: 'back', exposed: true, priority: 1,
    object: rotorObj, rotor: rotorRot, drive: { key: 'rotor' }, anchor: [0, -12.6, Z.rotorLettersTop],
    description: 'The winding rotor: a rhodium-plated half-moon weight on a ball bearing. Gravity swings it with every movement of the wrist, and through the reversing wheel and the reduction train it winds the mainspring in both directions. Its rim carries the raised gold letters "NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE".',
    facts: {
      Shape: 'half-moon rim, S-bar, collar', 'Ø': `${fmt(2 * RR.outer, 2)} mm`, Mass: `≈${rotorMass} g (EST)`,
      Finish: 'Glashütte ribbing, satin flat, brushed bevel, gold-plated letters', 'Rotor wheel': `${AT.rotorWheel.teeth} teeth`,
      Winding: `≈${fmt(1 / AUTO.windPerRad / TAU, 0)} rotor turns from empty to full (EST)`, 'Ratchet per rotor turn': `${fmt(360 * AUTO.ratchetPerRotorRad, 2)}°`,
    },
    live: (s) => {
      const v = s.rotorVel || 0, rpm = (Math.abs(v) * 60) / TAU;
      return Math.abs(v) < 0.05 ? `hanging still · ${fmt(degOf(s.rot.rotor), 0)}°` : `${v > 0 ? '↺' : '↻'} ${fmt(rpm, rpm < 10 ? 1 : 0)} rpm · winding`;
    },
  });

  // ===================================================================== ROTOR BEARING (fixed)
  {
    const object = new THREE.Group();
    root.add(object);
    const BR = RO.bearing, zd = Z.bearingDisc; // disc [−2.75, −2.47]
    const b = new Batch();
    const rD = BR.fixedDiscRadius;
    const rj = spec.frame.upperJewels.center.d / 2; // centre jewel (the centre wheel's upper pivot)
    // polished disc: chamfered edge, a polished countersink round the jewel
    b.add(latheZ([[rj + 0.14, zd[0]], [rD - 0.04, zd[0]], [rD, zd[0] + 0.04], [rD, zd[1]], [rj, zd[1]], [rj, zd[0] + 0.07], [rj + 0.14, zd[0]]], 160, rD), softPol);
    const jb = new Batch();
    jb.add(latheZ([[0, zd[0] + 0.05], [rj * 0.55, zd[0] + 0.05], [rj * 0.9, zd[0] + 0.065], [rj, zd[0] + 0.08], [rj, zd[0] + 0.2], [0, zd[0] + 0.2]], 48), ruby);
    jb.build(object);
    // three slotted screws, fixed to the plate (they do not turn with the rotor); a dark
    // hairline round each head reads as its counterbore
    const SS = spec.frame.steelScrews, rS = SS.bearingHeadDiameter / 2;
    const slots = [12, 96, 55];
    const gap = new THREE.RingGeometry(rS, rS + 0.035, 48).rotateX(Math.PI);
    SS.bearing.forEach((p, i) => {
      b.add(screwGeo(rS, zd[0] - Z.bearingScrewTop, 0.13, 0.04, 0.012), steelPol, screwMtx(p[0], p[1], zd[0], slots[i], -1));
      b.add(gap, M.steelDark, mtx(p[0], p[1], zd[0] - 0.0015));
    });
    // ball race floor + 9 balls between the disc and the bayonet ring
    const rB = BR.ballPathRadius, dB = BR.ballDiameter;
    b.add(latheZ([[rD, Z.bearingBalls + dB / 2 + 0.005], [BR.bayonetRing[0], Z.bearingBalls + dB / 2 + 0.005]], 160), M.steelDark);
    const ball = new THREE.SphereGeometry(dB / 2, 20, 14);
    for (let k = 0; k < BR.balls; k++) {
      const a = (k / BR.balls) * TAU + 0.21;
      b.add(ball, steelPol, mtx(rB * Math.cos(a), rB * Math.sin(a), Z.bearingBalls));
    }
    // notched bayonet ring: an inner race step and an outer lock ring with notches
    const zr = Z.bayonetRing, [r0, r1] = BR.bayonetRing;
    const notchHalf = 0.2, notchDepth = 0.16;
    const ringOutline = [];
    const NN = BR.bayonetNotches, NS = 360;
    for (let k = 0; k < NS; k++) {
      const a = (k / NS) * TAU;
      let r = r1;
      for (let q = 0; q < NN; q++) {
        let d = a - ((q + 0.5) / NN) * TAU - 0.1;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d * r1) < notchHalf) r = r1 - notchDepth;
      }
      ringOutline.push(V2(r * Math.cos(a), r * Math.sin(a)));
    }
    const ringG = gear.extrudeOutline(ringOutline, [gear.circlePath(r0 + 0.2, 160)], zr[1] - zr[0] - 0.02);
    b.add(ringG, [steelPol, steelPol], mtx(0, 0, (zr[0] + 0.02 + zr[1]) / 2), 30 * DEG);
    // inner race step, 0.02 proud of the lock ring
    b.add(latheZ([[r0, zr[1]], [r0, zr[0] + 0.02], [r0 + 0.02, zr[0]], [r0 + 0.2, zr[0]], [r0 + 0.2, zr[0] + 0.02]], 160), steelPol);
    b.build(object);
    add({
      id: 'rotor-bearing', name: 'Rotor bearing', category: 'automatic', side: 'back', exposed: true, priority: 2,
      object, anchor: [rD * 0.7, rD * 0.7, zd[0]],
      description: 'The rotor\'s ball bearing, locked in with a notched bayonet ring. Its centre disc is fixed to the movement by three screws — they stay still while the rotor turns round them on a ring of nine steel balls — and it carries the jewel for the centre wheel\'s upper pivot.',
      facts: { 'Disc Ø': `${fmt(2 * rD, 2)} mm`, Balls: `${BR.balls} × Ø ${fmt(BR.ballDiameter, 2)} mm`, Screws: `3, slotted, fixed`, Lock: `bayonet ring, ${BR.bayonetNotches} notches`, Jewel: 'centre-wheel upper pivot' },
    });
  }

  // ===================================================================== REVERSER (Doppelklinkenrad)
  {
    const object = new THREE.Group();
    object.position.set(L.reverser[0], L.reverser[1], 0);
    root.add(object);
    const gRot = new THREE.Group(), sRot = new THREE.Group();
    object.add(gRot, sRot);
    const m = MD.rotorWheel;
    const zG = Z.reverserWheel, zS = Z.reverserStar, zP = Z.reverserPinion, zC = Z.reverserCover;
    // gilt wheel (follows the rotor both ways): toothed ring with fine internal click teeth
    const inner = [];
    const NI = AT.reverser.starTeeth * 2;
    for (let k = 0; k < NI * 4; k++) {
      const a = (k / (NI * 4)) * TAU, f = ((k % 4) / 4);
      inner.push(V2((0.6 + 0.06 * f) * Math.cos(a), (0.6 + 0.06 * f) * Math.sin(a)));
    }
    const gb = new Batch();
    const gg = gear.extrudeOutline(gear.toothedOutline({ teeth: AT.reverser.teeth, module: m }), [new THREE.Path(inner)], zG[1] - zG[0]);
    gb.add(gg, giltPair, mtx(0, 0, (zG[0] + zG[1]) / 2), 38 * DEG);
    gb.add(latheZ([[0.93, zG[0] - 0.0004], [0.975, zG[0] - 0.0004]], 96), giltEdge); // turned edge of the ring at the tooth roots
    gb.build(gRot);
    // steel click star (16 rounded teeth) + hub + the one-way pinion (8), with the polished pin
    const sb = new Batch();
    const starO = [];
    const NSt = AT.reverser.starTeeth;
    for (let k = 0; k < NSt * 12; k++) {
      const a = (k / (NSt * 12)) * TAU, f = (k % 12) / 12;
      const r = 0.575 + 0.065 * Math.sin(Math.PI * f) ** 0.6; // rounded ratchet-like scallops
      starO.push(V2(r * Math.cos(a), r * Math.sin(a)));
    }
    sb.add(gear.extrudeOutline(starO, null, zS[1] - zS[0]), [steelPol, steelPol], mtx(0, 0, (zS[0] + zS[1]) / 2), 30 * DEG);
    // the polished pin on top (the arbor's end), a dark ring round it, the hub through the
    // gilt wheel's bore down to the pinion
    const zPin = zS[0] - 0.06;
    sb.add(latheZ([[0, zPin], [0.19, zPin], [0.24, zPin + 0.03], [0.24, zS[0] + 0.002]], 40), steelPol);
    sb.add(new THREE.RingGeometry(0.24, 0.3, 40).rotateX(Math.PI), M.steelDark, mtx(0, 0, zS[0] - 0.0015));
    sb.add(latheZ([[0.2, zS[1]], [0.56, zS[1]], [0.56, zP[0] + 0.02], [0.2, zP[0] + 0.02]], 48), steel);
    const pl = zP[1] - zP[0] - 0.02;
    sb.add(leafGeometry(gear, AT.reverser.pinion, MD.autoRA, pl), pinPair, mtx(0, 0, zP[0] + 0.02 + pl / 2, PH.reverserPinion), 35 * DEG);
    sb.add(latheZ([[0, zP[1]], [0.1, zP[1]], [0.1, zP[1] + 0.02], [0, zP[1] + 0.02]], 24), steelPol);
    sb.build(sRot);
    // fixed cover: a segment of a disc over the lower-left quarter (back view), level with
    // the plate and wearing its ribbing (as in the render), held by the plate
    const cb = new Batch();
    const nB = [0.587, -0.81]; // dial frame: towards the covered side (back view lower-left)
    const chord = 0.48, rCov = 1.4;
    const segPts = [];
    const a0 = Math.atan2(nB[1], nB[0]), half = Math.acos(chord / rCov);
    for (let k = 0; k <= 48; k++) { const a = a0 - half + (2 * half * k) / 48; segPts.push(V2(rCov * Math.cos(a), rCov * Math.sin(a))); }
    // modelled in back-view coordinates and extruded towards the case back (BACK): from just
    // above the star (−2.445) to −2.475, 0.025 proud of the plate's top
    const segShape = new THREE.Shape(segPts.map((p) => V2(-p.x, p.y)));
    const bt = 0.008, segT = 0.03;
    const segG = new THREE.ExtrudeGeometry(segShape, { depth: segT - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: 0.012, bevelOffset: -0.012, bevelSegments: 1, curveSegments: 12 });
    segG.translate(0, 0, bt);
    segG.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, Z.reverserStar[0] - 0.005).multiply(BACK));
    // ribbing in the DIAL frame (the cover sits at the reverser's position)
    planarUV(segG, spec.movement.ribbing.uvScale, spec.movement.ribbing.uvOffset, spec.movement.ribbing.uvAngle, L.reverser);
    cb.add(segG, rib);
    cb.build(object);
    const rG = RAT.reverserWheelPerRotor, rS = RAT.reverserStar;
    add({
      id: 'reversing-wheels', name: 'Reversing wheel (Doppelklinkenrad)', category: 'automatic', side: 'back', exposed: true, priority: 1,
      object, anchor: [0.9, 0.9, zS[0]],
      description: 'Turns the rotor\'s swings in both directions into one-way winding. Its gilt wheel follows the rotor wheel whichever way the rotor swings; the steel click star inside it is carried along in one direction and slips in the other, and the pinion under it drives the reduction wheels towards the ratchet.',
      facts: { 'Gilt wheel': `${AT.reverser.teeth} teeth, ${fmt(Math.abs(rG), 0)} × the rotor`, 'Click star': `${AT.reverser.starTeeth} teeth`, Pinion: `${AT.reverser.pinion} leaves (one way)`, Meshes: `rotor wheel (${AT.rotorWheel.teeth}) / wheel A (${AT.A.teeth})` },
      live: (s) => {
        const v = s.rotorVel || 0;
        return Math.abs(v) < 0.05 ? 'at rest' : v < 0 ? 'clicks engaged — winding' : 'clicks slipping (the other way winds)';
      },
      update: (s) => {
        gRot.rotation.z = rG * s.rot.rotor + PH.reverserWheel;
        sRot.rotation.z = rS * s.rot.ratchet; // the pinion's mesh phase is in its geometry
      },
    });
  }

  // ===================================================================== WINDING TRAIN (under the 3/4 plate)
  {
    const object = new THREE.Group();
    root.add(object);
    const AL = Z.autoLevels;
    const zPlateIn = Z.threeQuarterPlate[1]; // −2.10: the plate's underside
    const upPiv = zPlateIn - 0.2; // pivots end inside the plate's jewels
    const loPiv = Z.mainPlate[0] + 0.25; // … and the pillar plate's
    const groups = {};
    const mobile = (key, pos, def) => {
      const g = new THREE.Group(); g.position.set(pos[0], pos[1], 0); object.add(g);
      const r = new THREE.Group(); g.add(r);
      const b = new Batch();
      if (def.wheel) {
        const [z0, z1] = def.wheel.z;
        b.add(makeWheelGeo(gear, { teeth: def.wheel.teeth, module: def.wheel.m, thickness: z1 - z0, spokes: def.wheel.spokes || 0, rimW: def.wheel.rimW || 0.2, hubR: def.wheel.hubR || 0.4, spokeW: def.wheel.spokeW || 0.16, fillet: 0.08, phase: def.wheel.spokePhase || 0, bore: def.wheel.stud ? 0.13 : 0 }), giltPair, mtx(0, 0, (z0 + z1) / 2, def.wheel.phase), 38 * DEG);
      }
      if (def.pinion) {
        const [z0, z1] = def.pinion.z;
        b.add(leafGeometry(gear, def.pinion.leaves, def.pinion.m, z1 - z0), pinPair, mtx(0, 0, (z0 + z1) / 2, def.pinion.phase), 35 * DEG);
      }
      if (def.arbor) b.add(latheZ(def.arbor, 24), steelPol);
      b.build(r);
      if (def.stud) { const s = new Batch(); s.add(latheZ(def.stud, 24), steelPol); s.build(g); }
      groups[key] = { r, ratio: def.ratio, phase: def.phase0 ?? 0 };
    };
    const R = RAT;
    // A 26 | 16: wheel on W0 (meshes the reverser pinion), pinion on W1 (meshes B)
    mobile('A', L.autoA, {
      wheel: { teeth: AT.A.teeth, m: MD.autoRA, z: AL.A.wheel, phase: PH.Awheel, hubR: 0.35 },
      pinion: { leaves: AT.A.pinion, m: MD.autoAB, z: AL.A.pinion, phase: PH.Apinion },
      arbor: [[0, upPiv], [0.07, upPiv], [0.085, upPiv + 0.03], [0.085, AL.A.wheel[0]], [0.16, AL.A.wheel[0] + 0.01], [0.16, AL.A.pinion[1]], [0.1, AL.A.pinion[1] + 0.03], [0.085, AL.A.pinion[1] + 0.06], [0.085, loPiv], [0.07, loPiv + 0.03], [0, loPiv + 0.03]],
      ratio: R.A,
    });
    // B 48 | 18: wheel on W1, pinion on W2 (meshes C)
    mobile('B', L.autoB, {
      wheel: { teeth: AT.B.teeth, m: MD.autoAB, z: AL.B.wheel, phase: PH.Bwheel, spokes: 5, rimW: 0.2, hubR: 0.45, spokeW: 0.16, spokePhase: 0.3 },
      pinion: { leaves: AT.B.pinion, m: MD.autoBC, z: AL.B.pinion, phase: PH.Bpinion },
      arbor: [[0, upPiv], [0.08, upPiv], [0.1, upPiv + 0.03], [0.1, AL.B.wheel[0]], [0.2, AL.B.wheel[0] + 0.01], [0.2, AL.B.pinion[1]], [0.12, AL.B.pinion[1] + 0.03], [0.1, AL.B.pinion[1] + 0.06], [0.1, loPiv], [0.08, loPiv + 0.03], [0, loPiv + 0.03]],
      ratio: R.B,
    });
    // C 34 | 8: pinion on W1 (meshes D), wheel on W2 (meshes B's pinion)
    mobile('C', L.autoC, {
      wheel: { teeth: AT.C.teeth, m: MD.autoBC, z: AL.C.wheel, phase: PH.Cwheel, spokes: 5, rimW: 0.2, hubR: 0.42, spokeW: 0.15, spokePhase: 0.1 },
      pinion: { leaves: AT.C.pinion, m: MD.autoCD, z: AL.C.pinion, phase: PH.Cpinion },
      arbor: [[0, upPiv], [0.08, upPiv], [0.1, upPiv + 0.03], [0.1, AL.C.pinion[0]], [0.2, AL.C.pinion[0] + 0.005], [0.2, AL.C.wheel[1]], [0.12, AL.C.wheel[1] + 0.03], [0.1, AL.C.wheel[1] + 0.06], [0.1, loPiv], [0.08, loPiv + 0.03], [0, loPiv + 0.03]],
      ratio: R.C,
    });
    // D 24 | 10: pinion on W0 (meshes T), wheel on W1 (meshes C's pinion); its lower end
    // stops above C's wheel (W2), which overlaps its axis
    mobile('D', L.autoD, {
      wheel: { teeth: AT.D.teeth, m: MD.autoCD, z: AL.D.wheel, phase: PH.Dwheel, spokes: 4, rimW: 0.18, hubR: 0.36, spokeW: 0.15, spokePhase: 0.5 },
      pinion: { leaves: AT.D.pinion, m: MD.autoT, z: AL.D.pinion, phase: PH.Dpinion },
      arbor: [[0, upPiv], [0.07, upPiv], [0.085, upPiv + 0.03], [0.085, AL.D.pinion[0]], [0.16, AL.D.pinion[0] + 0.005], [0.16, AL.D.wheel[1]], [0.085, AL.D.wheel[1] + 0.02], [0.06, Z.W2[0] - 0.02], [0, Z.W2[0] - 0.02]],
      ratio: R.D,
    });
    // T 22 (meshes the ratchet and D's pinion) on a fixed stud: its plain polished bush in
    // the 3/4 plate is the stud's head (the barrel's teeth lie under its axis, so no lower pivot)
    mobile('T', L.autoT, {
      wheel: { teeth: AT.T.teeth, m: MD.autoT, z: AL.T.wheel, phase: PH.T, stud: true, hubR: 0.3 },
      stud: [[0, zPlateIn - 0.12], [0.1, zPlateIn - 0.12], [0.1, AL.T.wheel[1] + 0.01], [0.16, AL.T.wheel[1] + 0.01], [0.16, AL.T.wheel[1] + 0.035], [0, AL.T.wheel[1] + 0.035]],
      ratio: R.T,
    });
    const keys = Object.keys(groups);
    add({
      id: 'winding-train', name: 'Automatic winding train', category: 'automatic', side: 'back', exposed: false, priority: 2,
      object, anchor: [L.autoB[0], L.autoB[1], AL.B.wheel[0]],
      description: 'The hidden reduction wheels between the reversing wheel and the ratchet, under the three-quarter plate: four gilt wheels on steel pinions (A, B, C, D) and the transmission wheel T that meshes the ratchet. Together they slow the rotor down 116 times so that it has the force to wind the mainspring.',
      facts: {
        Wheels: `A ${AT.A.teeth}|${AT.A.pinion}, B ${AT.B.teeth}|${AT.B.pinion}, C ${AT.C.teeth}|${AT.C.pinion}, D ${AT.D.teeth}|${AT.D.pinion}, T ${AT.T.teeth}`,
        Reduction: `1 : ${fmt(1 / AUTO.ratchetPerRotorRad, 0)} (rotor → ratchet)`, Jewels: 'A, B, C, D (T in a plain bush)', 'Tooth counts': 'EST (NOMOS publishes none)',
      },
      live: (s) => `ratchet ${fmt(degOf(s.rot.ratchet), 1)}° · wheel A ${fmt(degOf(R.A * s.rot.ratchet), 0)}°`,
      update: (s) => {
        const w = s.rot.ratchet;
        for (let i = 0; i < keys.length; i++) { const g = groups[keys[i]]; g.r.rotation.z = g.ratio * w + g.phase; }
      },
    });
  }
}
