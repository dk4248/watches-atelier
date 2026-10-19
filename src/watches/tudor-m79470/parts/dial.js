// DIAL of the Tudor Black Bay Pro M79470-0004 ("Opaline"): a DOMED white opaline dial with
// black pad printing, applied monobloc-ceramic hour markers (black ceramic body, white
// Super-LumiNova cap), the bevelled date window at 3 o'clock, two dial feet — and the DATE
// DISC seen through the window (built here so it also exists in the watch box, which runs
// only case/dial/hands).
//
// Geometry from SPEC.dial / SPEC.date / SPEC.z (research/tudor-m79470/exterior.md §3):
//  - the dial is a shell of constant thickness whose top follows
//    top(r) = dialTopEdge + domeSagitta·(1 − (r/domeRadius)²); it is meshed as a polar grid
//    (so the dome is smooth) with a small patch round the date window;
//  - every print (minute track, shield, TUDOR, GENEVE, 200m:660ft, CHRONOMETER, OFFICIALLY
//    CERTIFIED, SWISS · MADE) is painted into ONE canvas mapped with planar UVs. The logo
//    and the lower lines are vector outlines TRACED from the official dial macro
//    (./glyphs.js); only the tiny SWISS MADE uses a canvas font;
//  - the markers are real 3-D pieces sitting on the dome: a black ceramic body (outline
//    extruded with a rounded top edge, its foot sunk into the dial) round a domed lume cap;
//  - the date window is a 45° bevel cut through the dial (geometry, not texture), and the
//    date disc's numerals come from a texture atlas on per-numeral quads.

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  shieldRegions, tudorRegions, genevaRegions, dialTextRegions, drawRegions, mapRegions, DIAL_PRINT,
  meshStarRegion, polygonArea,
} from './glyphs.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ---- module-local cosmetics -------------------------------------------------------------
const PRINT_PX = { full: 4096, lite: 2048 }; // dial print canvas (≈140 / 70 px per mm)
const INK = '#121212'; // multiplied by the dial colour → ≈ #111 (SPEC.dial.print)
// Opaline finish. The env map is bound explicitly so its share can be set (a material's
// envMapIntensity is ignored while it inherits scene.environment); roughness multiplies
// the grain map (≈0.48) → ≈0.55 effective (SPEC.dial.material).
const DIAL_FINISH = { albedo: 0xf4f5f2, envMapIntensity: 0.7, roughness: 1.12, grainRepeat: 7, normalScale: 0.14, sheen: 0.3 };
const RING_STEP = { full: 0.42, lite: 0.8 }; // radial spacing of the dial mesh (dome sag ≪ 1 µm per cell)
const SEGS = { full: 384, lite: 160 }; // angular segments of the dial mesh
const WINDOW_OUTER_CORNER = 0.1; // mitred outer corners of the bevel (macro: near-sharp)
const MARKER = { embed: 0.05, edge: 0.014, lumeCorner: 0.05 }; // foot sunk into the dial; top edge round
const LUME_MESH = { full: { step: 0.045, rings: 7 }, lite: { step: 0.11, rings: 3 } };
const LUME_EDGE = 0.22; // width of the lume's rounded rise at the rim (macro: flat cap, soft edge)
const DATE_ATLAS = { full: 2048, lite: 1024 };
const DATE_CELL = [2.6, 1.9]; // mm: reading direction (radial) × height (tangential)
const DATE_DIGIT_GAP = 0.23; // SPEC-REQUEST date.disc.digitGap: between the two digits ("28" measured 2.29 = 1.04 + gap + 1.02)
const DATE_FONT = '"Helvetica Neue", Helvetica, Arial, Jost, sans-serif';
const SWISS_FONT = '700 100px "Helvetica Neue", Helvetica, Arial, Jost, sans-serif';

// ------------------------------------------------------------------ small 2-D helpers

function roundedRect(cx, cy, hw, hh, r, nArc) {
  // CCW, starting at the right edge's lower end
  const pts = [];
  const corners = [[cx + hw - r, cy - hh + r, -90], [cx + hw - r, cy + hh - r, 0], [cx - hw + r, cy + hh - r, 90], [cx - hw + r, cy - hh + r, 180]];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= nArc; i++) {
      const a = (a0 + (90 * i) / nArc) * DEG;
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
    }
  }
  return pts;
}

// Polygon with per-vertex fillets (vertices CCW, radii per vertex).
function filletPolygon(verts, radii, nArc) {
  const n = verts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = verts[i], a = verts[(i + n - 1) % n], b = verts[(i + 1) % n];
    const r = radii[i];
    const u = norm2([a[0] - p[0], a[1] - p[1]]), v = norm2([b[0] - p[0], b[1] - p[1]]);
    const cosT = u[0] * v[0] + u[1] * v[1];
    const half = Math.acos(Math.max(-1, Math.min(1, cosT))) / 2; // half the interior angle
    if (r <= 0 || half < 1e-6) { out.push(p); continue; }
    const t = r / Math.tan(half); // tangent distance from the vertex
    const bis = norm2([u[0] + v[0], u[1] + v[1]]);
    const c = [p[0] + bis[0] * (r / Math.sin(half)), p[1] + bis[1] * (r / Math.sin(half))];
    const p1 = [p[0] + u[0] * t, p[1] + u[1] * t], p2 = [p[0] + v[0] * t, p[1] + v[1] * t];
    let a1 = Math.atan2(p1[1] - c[1], p1[0] - c[0]), a2 = Math.atan2(p2[1] - c[1], p2[0] - c[0]);
    let d = a2 - a1;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    for (let k = 0; k <= nArc; k++) out.push([c[0] + r * Math.cos(a1 + (d * k) / nArc), c[1] + r * Math.sin(a1 + (d * k) / nArc)]);
  }
  return out;
}

// Inset a convex CCW polygon by d (edges moved inwards, adjacent lines intersected).
function insetConvex(verts, d) {
  const n = verts.length;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = verts[i], b = verts[(i + 1) % n];
    const e = norm2([b[0] - a[0], b[1] - a[1]]);
    const nn = [-e[1], e[0]]; // left normal = inwards for CCW
    lines.push({ p: [a[0] + nn[0] * d, a[1] + nn[1] * d], e });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const L1 = lines[(i + n - 1) % n], L2 = lines[i];
    const den = L1.e[0] * L2.e[1] - L1.e[1] * L2.e[0];
    const t = ((L2.p[0] - L1.p[0]) * L2.e[1] - (L2.p[1] - L1.p[1]) * L2.e[0]) / den;
    out.push([L1.p[0] + L1.e[0] * t, L1.p[1] + L1.e[1] * t]);
  }
  return out;
}

const norm2 = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const ccw = (pts) => (polygonArea(pts) > 0 ? pts : pts.slice().reverse());
const rot2 = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const polarCW = (r, deg) => [r * Math.sin(deg * DEG), r * Math.cos(deg * DEG)]; // clock angle

// ------------------------------------------------------------------ the print canvas

function paintDial(canvas, N, spec) {
  const D = spec.dial;
  const R = D.radius;
  const s = N / (2 * R); // px per mm
  if (canvas.width !== N) { canvas.width = N; canvas.height = N; }
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, N, N);
  g.fillStyle = INK;
  g.strokeStyle = INK;

  // local frame at dial point (cx, cy) [mm, y up] whose "up" is unit (ux, uy); local x is
  // the reading direction (up turned 90° clockwise)
  const frame = (cx, cy, ux, uy) => g.setTransform(s * uy, s * ux, s * ux, -s * uy, s * (cx + R), s * (R - cy));
  const radialRect = (deg, r0, r1, w) => {
    const a = deg * DEG;
    frame(0, 0, Math.sin(a), Math.cos(a));
    g.fillRect(-w / 2, r0, w, r1 - r0);
  };

  // 1. minute track: outer circle (its outer edge at r 13.62), 1-minute ticks, 5-minute bars;
  // shortened at 12/3/6/9 and beside the triangle (6°, 354°) and the date frame (84°, 96°)
  const mt = D.minuteTrack;
  frame(0, 0, 0, 1);
  g.beginPath();
  g.arc(0, 0, mt.circle.r - mt.circle.width / 2, 0, TAU);
  g.lineWidth = mt.circle.width;
  g.stroke();
  const rOut = mt.circle.r - 0.02; // ticks merge into the circle
  for (let i = 0; i < 60; i++) {
    const deg = i * 6;
    const major = i % 5 === 0;
    const shortMajor = major && mt.shortened.majorDeg.includes(deg);
    const shortMinor = !major && mt.shortened.minorDeg.includes(deg);
    if (major) radialRect(deg, shortMajor ? mt.shortened.r[0] : mt.major.r[0], rOut, mt.major.width);
    else radialRect(deg, shortMinor ? mt.shortened.r[0] : mt.minor.r[0], rOut, mt.minor.width);
  }

  // 2. traced vector prints (dial mm, y up)
  frame(0, 0, 0, 1);
  const P = DIAL_PRINT;
  drawRegions(g, shieldRegions(P.shield.height, { cx: P.shield.centre[0], cy: P.shield.centre[1] }));
  drawRegions(g, mapRegions(tudorRegions(P.tudor.cap), (x, y) => [x + P.tudor.base[0], y + P.tudor.base[1]]));
  drawRegions(g, mapRegions(genevaRegions(P.geneve.cap), (x, y) => [x + P.geneve.base[0], y + P.geneve.base[1]]));
  for (const id of ['depth', 'chrono1', 'chrono2']) drawRegions(g, dialTextRegions(id));

  // 3. SWISS · MADE on the arc at 6, tops towards the centre (upright seen from 6 o'clock),
  // split by the 6 o'clock bar: each word fitted to its measured angular span.
  for (const id of ['swiss', 'made']) {
    const t = D.text.find((q) => q.id === id);
    if (!t) continue;
    const [r0, r1] = t.arc.r;
    const capH = t.capHeight ?? r1 - r0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = SWISS_FONT;
    const H = g.measureText('H');
    const k = capH / (H.actualBoundingBoxAscent || 72); // mm per font px
    const rMid = (r0 + r1) / 2;
    const span = (t.arc.degSpan[1] - t.arc.degSpan[0]) * DEG * rMid; // ink length along the arc
    const chars = [...t.text];
    const m = chars.map((ch) => g.measureText(ch));
    const adv = m.map((q) => q.width * k);
    const bl = m[0].actualBoundingBoxLeft * k, br = m[m.length - 1].actualBoundingBoxRight * k;
    const natural = adv.slice(0, -1).reduce((a, b) => a + b, 0) + bl + br;
    const track = chars.length > 1 ? (span - natural) / (chars.length - 1) : 0;
    let x = bl;
    for (let i = 0; i < chars.length; i++) {
      const xc = x + adv[i] / 2; // glyph centre along the arc, from the left end
      const phi = t.arc.degSpan[1] * DEG - xc / rMid; // clock angle (decreasing to the right)
      const sn = Math.sin(phi), cs = Math.cos(phi);
      frame(sn * ((r0 + r1) / 2 + capH / 2), cs * ((r0 + r1) / 2 + capH / 2), -sn, -cs); // baseline on the outer side
      g.save();
      g.scale(k, -k);
      g.fillText(chars[i], -adv[i] / 2 / k, 0);
      g.restore();
      x += adv[i] + track;
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}

// Date-disc numerals atlas: 31 cells, white ground, black grotesque numerals 1.64 tall.
function paintDateAtlas(canvas, size, DD) {
  const cols = 6;
  const cw = Math.floor(size / cols);
  const pxmm = cw / DATE_CELL[0];
  const ch = Math.floor(DATE_CELL[1] * pxmm);
  const rows = Math.floor(size / ch);
  if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  g.fillStyle = DD.numeral;
  g.font = `500 200px ${DATE_FONT}`;
  const e = g.measureText('8');
  const inkH = (e.actualBoundingBoxAscent + e.actualBoundingBoxDescent) || 143;
  const F = (200 * DD.numeralHeight * pxmm) / inkH;
  g.font = `500 ${F.toFixed(2)}px ${DATE_FONT}`;
  g.textBaseline = 'alphabetic';
  const cells = [];
  for (let k = 1; k <= DD.positions; k++) {
    const col = (k - 1) % cols, row = Math.floor((k - 1) / cols);
    const x0 = col * cw, y0 = row * ch;
    const str = String(k);
    // measure each digit's ink and lay them out with the measured gap, centred in the cell
    const ms = [...str].map((d) => g.measureText(d));
    const widths = ms.map((q) => q.actualBoundingBoxLeft + q.actualBoundingBoxRight);
    const gap = DATE_DIGIT_GAP * pxmm;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
    let x = x0 + cw / 2 - total / 2;
    const asc = Math.max(...ms.map((q) => q.actualBoundingBoxAscent)), desc = Math.max(...ms.map((q) => q.actualBoundingBoxDescent));
    const yBase = y0 + ch / 2 + (asc - desc) / 2;
    [...str].forEach((d, i) => {
      g.fillText(d, x + ms[i].actualBoundingBoxLeft, yBase);
      x += widths[i] + gap;
    });
    cells.push({ u0: x0 / size, u1: (x0 + cw) / size, v0: 1 - (y0 + ch) / size, v1: 1 - y0 / size });
  }
  void rows;
  return cells;
}

// ------------------------------------------------------------------ builder

export function buildDial(ctx) {
  const { THREE, spec, M, reg, root, stage } = ctx;
  const D = spec.dial, Z = spec.z, DD = spec.date.disc;
  const lite = !!ctx.lite;
  const caps = stage?.renderer?.capabilities;
  const maxAniso = Math.min(16, caps?.getMaxAnisotropy?.() || 8);
  const R = D.radius;
  const RD = D.domeRadius, SAG = D.domeSagitta, Z0 = D.topZEdge, TH = D.thickness;
  const top = (x, y) => Z0 + SAG * (1 - (x * x + y * y) / (RD * RD));
  const kSlope = (-2 * SAG) / (RD * RD); // dz/dx = k·x
  const env = stage?.scene?.environment || null;

  // ---- print texture
  const N = Math.min(lite ? PRINT_PX.lite : PRINT_PX.full, caps?.maxTextureSize || 4096);
  const canvas = document.createElement('canvas');
  paintDial(canvas, N, spec);
  const printTex = new THREE.CanvasTexture(canvas);
  printTex.colorSpace = THREE.SRGBColorSpace;
  printTex.anisotropy = maxAniso;

  // ---- materials (one per mesh)
  const dialColour = new THREE.Color(DIAL_FINISH.albedo);
  const grainN = M.dialBase.normalMap?.clone();
  const grainR = M.dialBase.roughnessMap?.clone();
  for (const t of [grainN, grainR]) if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(DIAL_FINISH.grainRepeat, DIAL_FINISH.grainRepeat); t.needsUpdate = true; }
  const faceMat = M.dialBase.clone();
  faceMat.color.copy(dialColour);
  faceMat.map = printTex;
  // the ink must not pick up the lacquer's sheen or specular glare (washes out to grey)
  faceMat.sheenColorMap = printTex;
  faceMat.specularColorMap = printTex;
  faceMat.sheen = DIAL_FINISH.sheen;
  faceMat.metalness = D.material.metalness;
  faceMat.normalMap = grainN || null;
  faceMat.normalScale = new THREE.Vector2(DIAL_FINISH.normalScale, DIAL_FINISH.normalScale);
  faceMat.roughnessMap = grainR || null;
  faceMat.roughness = DIAL_FINISH.roughness;
  faceMat.envMap = env;
  faceMat.envMapIntensity = DIAL_FINISH.envMapIntensity;
  faceMat.name = 'dialOpaline';

  // bevel and edge: the same opaline without the print
  const bevelMat = faceMat.clone();
  bevelMat.map = null;
  bevelMat.sheenColorMap = null;
  bevelMat.specularColorMap = null;
  bevelMat.name = 'dialBevel';

  const backMat = M.brass.clone(); // the brass blank's underside
  backMat.color.set(0xb79c66);
  backMat.roughness = 0.55;
  backMat.envMap = env;
  backMat.envMapIntensity = 0.8;
  backMat.name = 'dialBack';

  const ceramicMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(D.markers.rim), metalness: 0, roughness: 0.42, specularIntensity: 0.6,
    clearcoat: 0.1, clearcoatRoughness: 0.4, envMap: env, envMapIntensity: 0.6,
  });
  ceramicMat.name = 'markerCeramic';
  const lumeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(D.markers.lume), metalness: 0, roughness: 0.6, sheen: 0.2, sheenColor: new THREE.Color(0xffffff),
    emissive: new THREE.Color(D.markers.glow), emissiveIntensity: 0.02, envMap: env, envMapIntensity: 0.55,
  });
  lumeMat.name = 'lume';

  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ================================================================ dial plate
  // Polar grid between the centre hole and the edge; a polar box round the date window is
  // left out of the grid and filled by a patch triangulated against the window outline
  // (frame outer outline on the top face, the opening on the back), whose vertices on the
  // box edges coincide with the grid's — no cracks.
  const W = D.dateWindow;
  const [wcx, wcy] = W.center;
  const nArcW = lite ? 3 : 6;
  const frameOuter = roundedRect(wcx, wcy, W.frameOuter[0] / 2, W.frameOuter[1] / 2, WINDOW_OUTER_CORNER, nArcW);
  const opening = roundedRect(wcx, wcy, W.opening[0] / 2, W.opening[1] / 2, W.cornerRadius, nArcW);
  // polar box round the window (+ margin), snapped to a grid of `segs` × `ringStep`
  const frameR = frameOuter.map(([x, y]) => Math.hypot(x, y));
  const frameA = frameOuter.map(([x, y]) => Math.atan2(y, x));
  const phiW = Math.atan2(wcy, wcx);
  const margin = 0.3;
  function makeGrid(segs, ringStep) {
    const dTh = TAU / segs;
    const jHalf = Math.ceil((Math.max(...frameA.map((a) => Math.abs(a - phiW))) + margin / Math.min(...frameR)) / dTh);
    const jW = Math.round(phiW / dTh);
    const rBoxA = Math.min(...frameR) - margin, rBoxB = Math.max(...frameR) + margin;
    const rings = [];
    const pushRange = (a, b) => { const n = Math.max(1, Math.round((b - a) / ringStep)); for (let i = 0; i < n; i++) rings.push(a + ((b - a) * i) / n); };
    pushRange(D.centreHole, rBoxA);
    pushRange(rBoxA, rBoxB);
    pushRange(rBoxB, R);
    rings.push(R);
    return { segs, dTh, rings, iA: rings.indexOf(rBoxA), iB: rings.indexOf(rBoxB), ja: jW - jHalf, jb: jW + jHalf };
  }
  const gridTop = makeGrid(lite ? SEGS.lite : SEGS.full, lite ? RING_STEP.lite : RING_STEP.full);
  const gridBack = makeGrid(SEGS.lite, RING_STEP.lite * 1.5); // the underside is rarely seen

  function dialSurface(grid, hole, back) {
    const { segs, dTh, rings, iA, iB, ja, jb } = grid;
    const pos = [], nor = [], uv = [], idx = [];
    const vert = (x, y) => {
      const zt = top(x, y);
      pos.push(x, y, back ? zt - TH : zt);
      const nx = -kSlope * x, ny = -kSlope * y, l = Math.hypot(nx, ny, 1);
      if (back) nor.push(-nx / l, -ny / l, -1 / l); else nor.push(nx / l, ny / l, 1 / l);
      uv.push(x / (2 * R) + 0.5, y / (2 * R) + 0.5);
      return pos.length / 3 - 1;
    };
    const tri = (a, b, c) => (back ? idx.push(a, c, b) : idx.push(a, b, c));
    // grid vertices
    const gi = [];
    for (let i = 0; i < rings.length; i++) {
      const row = [];
      for (let j = 0; j < segs; j++) {
        const a = j * dTh;
        row.push(vert(rings[i] * Math.cos(a), rings[i] * Math.sin(a)));
      }
      gi.push(row);
    }
    const inBox = (i, j) => i >= iA && i < iB && ((((j - ja) % segs) + segs) % segs) < jb - ja;
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < segs; j++) {
        if (inBox(i, j)) continue;
        const j1 = (j + 1) % segs;
        const a = gi[i][j], b = gi[i][j1], c = gi[i + 1][j], d = gi[i + 1][j1];
        tri(a, d, b); // CCW seen from +Z (radial × tangential = +Z)
        tri(a, c, d);
      }
    }
    // the window patch: box boundary (CCW) with the window outline as a hole
    const wrap = (j) => ((j % segs) + segs) % segs;
    const contour = [];
    for (let j = ja; j <= jb; j++) contour.push(gi[iA][wrap(j)]); // inner arc
    for (let i = iA + 1; i <= iB; i++) contour.push(gi[i][wrap(jb)]); // radial edge at jb
    for (let j = jb - 1; j >= ja; j--) contour.push(gi[iB][wrap(j)]); // outer arc back
    for (let i = iB - 1; i > iA; i--) contour.push(gi[i][wrap(ja)]); // radial edge at ja
    const holeIdx = hole.map(([x, y]) => vert(x, y));
    const V2 = (k) => new THREE.Vector2(pos[k * 3], pos[k * 3 + 1]);
    const faces = THREE.ShapeUtils.triangulateShape(contour.map(V2), [holeIdx.map(V2)]);
    const all = [...contour, ...holeIdx];
    for (const f of faces) {
      const [a, b, c] = [all[f[0]], all[f[1]], all[f[2]]];
      // earcut returns either winding: make every patch triangle face +Z (or −Z for the back)
      const ax = pos[a * 3], ay = pos[a * 3 + 1];
      const cr = (pos[b * 3] - ax) * (pos[c * 3 + 1] - ay) - (pos[c * 3] - ax) * (pos[b * 3 + 1] - ay);
      if (cr > 0) tri(a, b, c); else tri(a, c, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  // a vertical strip round a circle (dial edge / centre hole), normals outwards or inwards
  function wallRing(r, n, outward) {
    const pos = [], nor = [], uv = [], idx = [];
    for (let j = 0; j <= n; j++) {
      const a = (j / n) * TAU, c = Math.cos(a), s = Math.sin(a);
      const x = r * c, y = r * s, zt = top(x, y);
      pos.push(x, y, zt - TH, x, y, zt);
      const k = outward ? 1 : -1;
      nor.push(c * k, s * k, 0, c * k, s * k, 0);
      uv.push(x / (2 * R) + 0.5, y / (2 * R) + 0.5, x / (2 * R) + 0.5, y / (2 * R) + 0.5);
      if (j < n) {
        const q = j * 2;
        if (outward) idx.push(q, q + 2, q + 3, q, q + 3, q + 1); else idx.push(q, q + 3, q + 2, q, q + 1, q + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  }

  const dialObj = new THREE.Group();
  dialObj.name = 'dial';
  const faceMesh = shadowed(new THREE.Mesh(dialSurface(gridTop, frameOuter, false), faceMat));
  faceMesh.name = 'dial-face';
  faceMesh.castShadow = false; // nothing above it to shadow; it only receives
  dialObj.add(faceMesh);
  const edgeGeo = mergeGeometries([wallRing(R, lite ? 160 : 384, true), wallRing(D.centreHole, lite ? 24 : 48, false)]);
  const edgeMesh = shadowed(new THREE.Mesh(edgeGeo, bevelMat));
  edgeMesh.name = 'dial-edge';
  dialObj.add(edgeMesh);
  if (!lite) {
    const backMesh = shadowed(new THREE.Mesh(dialSurface(gridBack, opening, true), backMat));
    backMesh.name = 'dial-back';
    dialObj.add(backMesh);
  }
  root.add(dialObj);

  // ================================================================ date window bevel
  // 45° bevel 0.40 wide cut through the whole dial: a loft from the frame's outer outline on
  // the dial top to the opening on the dial back. The faces are flat (lit top/left, shaded
  // bottom/right come from the light); the corners meet along mitre lines.
  const windowObj = new THREE.Group();
  windowObj.name = 'date-window';
  {
    const pos = [];
    const n = frameOuter.length;
    for (let i = 0; i < n; i++) {
      const o0 = frameOuter[i], o1 = frameOuter[(i + 1) % n];
      const i0 = opening[i], i1 = opening[(i + 1) % n];
      const A = [o0[0], o0[1], top(o0[0], o0[1])], Bv = [o1[0], o1[1], top(o1[0], o1[1])];
      const C = [i0[0], i0[1], top(i0[0], i0[1]) - TH], Dv = [i1[0], i1[1], top(i1[0], i1[1]) - TH];
      // facing into the opening (towards the window centre, and up)
      pos.push(...A, ...C, ...Dv, ...A, ...Dv, ...Bv);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    // flip triangles whose normal points away from the opening
    const p = geo.attributes.position;
    for (let t = 0; t < p.count; t += 3) {
      const ax = p.getX(t), ay = p.getY(t), az = p.getZ(t);
      const ux = p.getX(t + 1) - ax, uy = p.getY(t + 1) - ay, uz = p.getZ(t + 1) - az;
      const vx = p.getX(t + 2) - ax, vy = p.getY(t + 2) - ay, vz = p.getZ(t + 2) - az;
      const nz = ux * vy - uy * vx;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz;
      const toC = (wcx - ax) * nx + (wcy - ay) * ny;
      if (nz < 0 || toC < -1e-9) {
        const bx = p.getX(t + 1), by = p.getY(t + 1), bz = p.getZ(t + 1);
        p.setXYZ(t + 1, p.getX(t + 2), p.getY(t + 2), p.getZ(t + 2));
        p.setXYZ(t + 2, bx, by, bz);
      }
    }
    geo.computeVertexNormals();
    ctx.planarUV(geo, 1 / (2 * R), [0.5, 0.5]);
    const bevel = shadowed(new THREE.Mesh(geo, bevelMat));
    bevel.name = 'date-window-bevel';
    windowObj.add(bevel);
  }
  root.add(windowObj);

  // ================================================================ applied markers
  // Monobloc ceramic: a black body (outline extruded, rounded top edge, foot sunk 0.05 into
  // the dial) with a white lume cap filling its top, flush at the rim and domed +0.05 in the
  // middle. Both follow the dial's dome (each vertex lifted by top(x, y)).
  const MK = D.markers;
  const H = MK.height;
  const lm = lite ? LUME_MESH.lite : LUME_MESH.full;
  const nArc = lite ? 3 : 8;
  const markers = []; // { outer, lume, centre }
  {
    const cs = MK.circles;
    const n = lite ? 36 : 72;
    for (const deg of cs.anglesDeg) {
      const [cx, cy] = polarCW(cs.r, deg);
      const circ = (r) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * TAU), cy + r * Math.sin((i / n) * TAU)]);
      markers.push({ outer: circ(cs.outerRadius), lume: circ(cs.lumeRadius), centre: [cx, cy] });
    }
    const bs = MK.bars;
    for (const deg of bs.anglesDeg) {
      const len = bs.r[1] - bs.r[0], rc = (bs.r[0] + bs.r[1]) / 2;
      // built along +y at 12, then turned to its clock angle
      const outer = roundedRect(0, rc, bs.width / 2, len / 2, bs.cornerRadius, nArc);
      const lume = roundedRect(0, rc, bs.width / 2 - bs.rim, len / 2 - bs.rim, MARKER.lumeCorner, nArc);
      const a = -deg * DEG;
      markers.push({ outer: outer.map((p) => rot2(p, a)), lume: lume.map((p) => rot2(p, a)), centre: rot2([0, rc], a) });
    }
    const tr = MK.triangle;
    const tv = ccw(tr.verts.map((p) => [p[0], p[1]]));
    const apexIdx = tv.findIndex((p) => p[1] === Math.min(...tv.map((q) => q[1])));
    const radii = tv.map((_, i) => (i === apexIdx ? tr.apexFillet : tr.topFillet));
    const inner = insetConvex(tv, tr.rim);
    const innerRadii = tv.map((_, i) => (i === apexIdx ? Math.max(0.04, tr.apexFillet - tr.rim * 0.6) : 0.04));
    const cx = (tv[0][0] + tv[1][0] + tv[2][0]) / 3, cy = (tv[0][1] + tv[1][1] + tv[2][1]) / 3;
    markers.push({ outer: filletPolygon(tv, radii, nArc), lume: filletPolygon(inner, innerRadii, nArc), centre: [cx, cy] });
  }
  const bodyGeos = [], lumeGeos = [];
  for (const mk of markers) {
    // body: outline with the lume window as a hole, bevelled top edge
    const shape = new THREE.Shape(ccw(mk.outer).map((p) => new THREE.Vector2(p[0], p[1])));
    shape.holes.push(new THREE.Path(ccw(mk.lume).reverse().map((p) => new THREE.Vector2(p[0], p[1]))));
    const e = MARKER.edge;
    const total = H + MARKER.embed;
    let geo = new THREE.ExtrudeGeometry(shape, {
      depth: total - e, bevelEnabled: true, bevelThickness: e, bevelSize: e, bevelOffset: -e,
      bevelSegments: lite ? 1 : 3, curveSegments: 1,
    });
    // ExtrudeGeometry puts the bevel on both ends; the foot is buried, so only the top shows.
    geo.translate(0, 0, -MARKER.embed);
    if (geo.index) geo = geo.toNonIndexed();
    const p = geo.attributes.position;
    // drop the buried bottom lid
    const keep = [];
    for (let t = 0; t < p.count; t += 3) {
      const zMax = Math.max(p.getZ(t), p.getZ(t + 1), p.getZ(t + 2));
      if (zMax > -MARKER.embed + 0.002) keep.push(t);
    }
    const pos = new Float32Array(keep.length * 9), nor = new Float32Array(keep.length * 9);
    const np = geo.attributes.normal;
    keep.forEach((t, k) => {
      for (let v = 0; v < 3; v++) {
        const x = p.getX(t + v), y = p.getY(t + v), z = p.getZ(t + v);
        pos.set([x, y, z + top(x, y)], (k * 3 + v) * 3);
        nor.set([np.getX(t + v), np.getY(t + v), np.getZ(t + v)], (k * 3 + v) * 3);
      }
    });
    const body = new THREE.BufferGeometry();
    body.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    body.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    bodyGeos.push(body);

    // lume cap: rings round the centre, height H at the rim → H + lumeDome in the middle
    const lumeOutline = ccw(mk.lume);
    const mesh = meshStarRegion(lumeOutline, mk.centre, { rings: lm.rings, step: lm.step });
    // a meniscus: the lume rises over LUME_EDGE from the rim and is flat (+lumeDome) inside
    const edgeW = Math.min(LUME_EDGE, Math.max(...mesh.dist));
    const lpos = [];
    for (let i = 0; i < mesh.xy.length; i++) {
      const [x, y] = mesh.xy[i];
      const f = Math.min(1, mesh.dist[i] / edgeW);
      lpos.push(x, y, top(x, y) + H - 0.004 + MK.lumeDome * (1 - (1 - f) * (1 - f)));
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
    lg.setIndex(mesh.index);
    lg.computeVertexNormals();
    lumeGeos.push(lg.toNonIndexed());
  }
  const indicesObj = new THREE.Group();
  indicesObj.name = 'indices';
  const bodyMesh = shadowed(new THREE.Mesh(mergeGeometries(bodyGeos), ceramicMat));
  bodyMesh.name = 'indices-ceramic';
  const lumeMesh = shadowed(new THREE.Mesh(mergeGeometries(lumeGeos), lumeMat));
  lumeMesh.name = 'indices-lume';
  indicesObj.add(bodyMesh, lumeMesh);
  root.add(indicesObj);

  // ================================================================ dial feet (not in the box)
  let feetObj = null;
  if (!lite) {
    const F = D.feet;
    const geos = F.anglesDeg.map((deg) => {
      const [x, y] = polarCW(F.r, deg);
      const zb = top(x, y) - TH;
      const r = F.radius;
      const prof = [[0.0001, zb - F.length], [r - 0.06, zb - F.length], [r, zb - F.length + 0.06], [r, zb - 0.04], [r + 0.08, zb - 0.01], [r + 0.08, zb + 0.01]]
        .map(([a, b]) => new THREE.Vector2(a, b));
      const gg = new THREE.LatheGeometry(prof, 24);
      gg.rotateX(Math.PI / 2);
      gg.translate(x, y, 0);
      return gg;
    });
    feetObj = new THREE.Group();
    feetObj.name = 'dial-feet';
    const fm = shadowed(new THREE.Mesh(mergeGeometries(geos), M.brass));
    fm.name = 'dial-feet';
    feetObj.add(fm);
    root.add(feetObj);
  }

  // ================================================================ date disc
  // White ring with 31 internal V-teeth (tooth j at local clock angle toothDeg0 + j·step); the
  // numerals increase COUNTER-clockwise, numeral k at windowDeg − (k − 1)·step, each upright
  // along the CCW tangent (so the one in the window reads normally). Driven by rot.date
  // (clockwise): the next date enters the window from above.
  const discObject = new THREE.Group();
  discObject.name = 'date-disc';
  const discRotor = new THREE.Group();
  discRotor.name = 'date-disc-rotor';
  discObject.add(discRotor);
  {
    const [z0, z1] = Z.dateDisc;
    const step = DD.stepDeg;
    const teethPts = [];
    const tipHalf = 0.55, rootHalf = 0.9; // degrees: tip flat and root flat half-widths
    for (let j = 0; j < DD.teeth; j++) {
      const c = DD.toothDeg0 + j * step; // clock angle (CW from 12)
      for (const [off, r] of [[-tipHalf, DD.toothTipRadius], [tipHalf, DD.toothTipRadius], [step / 2 - rootHalf, DD.toothRootRadius], [step / 2 + rootHalf, DD.toothRootRadius]]) {
        teethPts.push(polarCW(r, c + off));
      }
    }
    const nOut = lite ? 96 : 192;
    const outer = Array.from({ length: nOut }, (_, i) => [DD.rOuter * Math.cos((i / nOut) * TAU), DD.rOuter * Math.sin((i / nOut) * TAU)]);
    const shape = new THREE.Shape(outer.map((p) => new THREE.Vector2(p[0], p[1])));
    shape.holes.push(new THREE.Path(ccw(teethPts).reverse().map((p) => new THREE.Vector2(p[0], p[1]))));
    const discGeo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    discGeo.translate(0, 0, z0);
    discGeo.deleteAttribute('uv');
    const discMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(DD.colour), roughness: 0.55, metalness: 0, envMap: env, envMapIntensity: 0.7 });
    discMat.name = 'dateDisc';
    const discMesh = shadowed(new THREE.Mesh(discGeo, discMat));
    discMesh.name = 'date-disc-ring';
    discRotor.add(discMesh);

    // numerals: one quad per date, mapped to its atlas cell
    const atlasCanvas = document.createElement('canvas');
    const cells = paintDateAtlas(atlasCanvas, lite ? DATE_ATLAS.lite : DATE_ATLAS.full, DD);
    const atlas = new THREE.CanvasTexture(atlasCanvas);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = maxAniso;
    const pos = [], uv = [], idx = [];
    const [cw, chh] = DATE_CELL;
    const zq = z1 + 0.004;
    for (let k = 1; k <= DD.positions; k++) {
      const th = (DD.windowDeg - (k - 1) * step) * DEG; // clock angle
      const c = [DD.numeralRadius * Math.sin(th), DD.numeralRadius * Math.cos(th)];
      const up = [-Math.cos(th), Math.sin(th)]; // CCW tangent
      const rt = [Math.sin(th), Math.cos(th)]; // reading direction = radially outwards
      const cell = cells[k - 1];
      const base = pos.length / 3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pos.push(c[0] + (rt[0] * sx * cw) / 2 + (up[0] * sy * chh) / 2, c[1] + (rt[1] * sx * cw) / 2 + (up[1] * sy * chh) / 2, zq);
        uv.push(sx < 0 ? cell.u0 : cell.u1, sy < 0 ? cell.v0 : cell.v1);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const qGeo = new THREE.BufferGeometry();
    qGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    qGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    qGeo.setIndex(idx);
    qGeo.computeVertexNormals();
    const numMat = discMat.clone();
    numMat.map = atlas;
    numMat.polygonOffset = true;
    numMat.polygonOffsetFactor = -2;
    numMat.polygonOffsetUnits = -2;
    numMat.name = 'dateNumerals';
    const qMesh = new THREE.Mesh(qGeo, numMat);
    qMesh.name = 'date-disc-numerals';
    qMesh.castShadow = false;
    qMesh.receiveShadow = true;
    discRotor.add(qMesh);
  }
  root.add(discObject);

  // ================================================================ registry
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const mm = (v) => `${v.toFixed(2)} mm`;
  const tz = (x, y) => top(x, y);
  reg.add({
    id: 'dial', name: 'Dial', category: 'dial', side: 'front', object: dialObj,
    exposed: true, xray: true, priority: 1,
    explode: ex('dial'), explodeDelay: spec.explodeDelay('dial'),
    anchor: [-6.2, 8.3, tz(-6.2, 8.3)],
    description: 'The face of the watch: a thin brass disc stamped into a gentle dome and finished in white "opaline", a fine-grained, softly satin lacquer. The black minute track, shield, TUDOR and the chronometer lines are pad-printed onto the curved surface.',
    facts: {
      Finish: 'Opaline (white), domed',
      Diameter: `${(2 * R).toFixed(1)} mm (${(2 * D.visibleRadius).toFixed(1)} mm visible)`,
      Dome: `${D.domeSagitta.toFixed(2)} mm rise to the centre (estimate)`,
      Thickness: `${TH.toFixed(2)} mm (estimate)`,
      Printing: 'Black pad print',
      'Minute track': '60 ticks, bold 5-minute bars, outer circle',
    },
  });
  reg.add({
    id: 'indices', name: 'Hour markers', category: 'dial', side: 'front', object: indicesObj,
    exposed: true, xray: true, priority: 2,
    explode: ex('indices'), explodeDelay: spec.explodeDelay('indices'),
    anchor: [...polarCW(MK.circles.r, 60), tz(...polarCW(MK.circles.r, 60)) + H],
    description: 'Applied hour markers, each a single piece of black ceramic whose top is filled with white Super-LumiNova, so the black edge outlines the lume. An inverted triangle marks 12, bars mark 6 and 9, and the date window takes the place of 3.',
    facts: {
      Material: 'Monobloc ceramic, Super-LumiNova cap',
      Markers: '8 circles, 2 bars, triangle at 12',
      Circles: `Ø ${(2 * MK.circles.outerRadius).toFixed(2)} mm (lume Ø ${(2 * MK.circles.lumeRadius).toFixed(2)})`,
      Bars: `${(MK.bars.r[1] - MK.bars.r[0]).toFixed(2)} × ${MK.bars.width.toFixed(2)} mm`,
      Height: `${H.toFixed(2)} mm above the dial (estimate)`,
      Glow: 'Green in the dark',
    },
  });
  reg.add({
    id: 'date-window', name: 'Date window', category: 'dial', side: 'front', object: windowObj,
    exposed: true, xray: true, priority: 2,
    explode: ex('date-window'), explodeDelay: spec.explodeDelay('date-window'),
    anchor: [wcx - W.frameOuter[0] / 2 + 0.2, wcy + W.frameOuter[1] / 2 - 0.2, tz(wcx, wcy) - 0.1],
    description: 'A window cut through the dial at 3 o\'clock with a broad 45° bevel, so the date disc below shows framed in white. The bevel catches the light on its upper edges and falls into shadow on the lower ones.',
    facts: {
      Opening: `${W.opening[0].toFixed(2)} × ${W.opening[1].toFixed(2)} mm`,
      Bevel: `${W.bevel.width.toFixed(2)} mm at ${W.bevel.angleDeg}°`,
      Frame: 'Cut into the dial, no metal frame',
    },
  });
  if (feetObj) {
    const F = D.feet;
    const fp = polarCW(F.r, F.anglesDeg[0]);
    reg.add({
      id: 'dial-feet', name: 'Dial feet', category: 'dial', side: 'front', object: feetObj,
      exposed: false, xray: false, priority: 3,
      explode: ex('dial-feet'), explodeDelay: spec.explodeDelay('dial-feet'),
      anchor: [fp[0], fp[1], tz(...fp) - TH - F.length / 2],
      description: 'Two brass pins under the dial that locate it on the movement: they pass the date works and fit holes in the calendar plate, where small screws clamp them so the dial cannot turn.',
      facts: { Count: String(F.anglesDeg.length), Diameter: mm(2 * F.radius), Length: `${F.length.toFixed(1)} mm (estimate)`, Material: 'Brass' },
    });
  }
  reg.add({
    id: 'date-disc', name: 'Date disc', category: 'dial', side: 'front', object: discObject, rotor: discRotor,
    drive: { key: 'date' }, exposed: true, xray: true, priority: 2,
    explode: ex('date-disc'), explodeDelay: spec.explodeDelay('date-disc'),
    anchor: [W.center[0] - 0.9, W.center[1] - 0.75, Z.dateDisc[1]],
    description: 'A thin white ring printed with the dates 1 to 31 that turns under the dial. Its 31 internal teeth are pushed on by one at local midnight in an instant jump, and because the date follows the local hour hand, it also steps back or forward when you change time zones.',
    facts: {
      Numerals: '1–31, black grotesque',
      Teeth: `${DD.teeth} internal`,
      Diameter: `${(2 * DD.rOuter).toFixed(1)} mm`,
      Change: 'Instantaneous at midnight',
      Corrector: 'Follows the jumping local hour',
    },
    live: (s) => `Today: ${s.day ?? ''}`,
  });
}
