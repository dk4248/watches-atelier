import * as THREE from 'three';

// Procedural horological gearing. All dimensions in millimetres, all geometry lies in
// the XY plane and is extruded along +Z, centred on z = 0.
//
// Meshing rule: two gears of the same module m mesh when their centre distance is
// m * (z1 + z2) / 2. Use centreDistance() when laying parts out.

const TAU = Math.PI * 2;
const P = (r, a) => new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));

export const pitchRadius = (m, z) => (m * z) / 2;

// Tooth phase so two meshing gears interleave instead of intersecting.
// Convention: every outline from this file has tooth 0 centred on local angle 0 and
// gaps centred on half-pitch. A = driver (or the gear you fix first), B = its mate.
//   phi        world angle of the line from A's centre to B's centre (rad)
//   zA, zB     tooth / leaf counts
//   phaseA     A's constant local rotation inside its rotor (rad), usually 0
// Returns phaseB: the constant local rotation to give B's mesh inside B's rotor.
// Valid whenever the kinematics turn B at exactly −zA/zB times A (true for every
// pair driven from state.rot, whose angles all come from one beat counter).
export function meshPhase(phi, zA, zB, phaseA = 0) {
  return phi + Math.PI - Math.PI / zB + (zA / zB) * (phi - phaseA);
}
export const centreDistance = (m, z1, z2) => (m * (z1 + z2)) / 2;

// Ogival ("cycloidal") wheel teeth, or rounded pinion leaves.
// Returns a closed CCW point list.
export function toothedOutline({
  teeth, module: m, addendum = 1.3, dedendum = 1.6, toothFrac = 0.46,
  tipSteps = 7, rootSteps = 3, tipPower = 0.8,
}) {
  const rp = (m * teeth) / 2;
  const ro = rp + addendum * m;
  const rr = Math.max(0.05, rp - dedendum * m);
  const pitchA = TAU / teeth;
  const half = (pitchA * toothFrac) / 2;
  const hw = half * rp; // tangential half width at the pitch circle
  const ha = ro - rp;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * pitchA;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push(P(rr, a - half * 0.92));
    pts.push(P(rp, a - half));
    for (let k = 1; k < tipSteps; k++) {
      const phi = (Math.PI * k) / tipSteps;
      const cx = -Math.cos(phi);
      const tx = Math.sign(cx) * Math.pow(Math.abs(cx), tipPower) * hw;
      const ty = Math.sin(phi) * ha;
      const r = rp + ty;
      pts.push(new THREE.Vector2(r * c - tx * s, r * s + tx * c));
    }
    pts.push(P(rp, a + half));
    pts.push(P(rr, a + half * 0.92));
    const a0 = a + half * 0.92, a1 = a + pitchA - half * 0.92;
    for (let k = 1; k < rootSteps; k++) pts.push(P(rr, a0 + ((a1 - a0) * k) / rootSteps));
  }
  return pts;
}

// Pinion leaves: deeper, rounder, about half the pitch thick.
export function pinionOutline({ leaves, module: m }) {
  return toothedOutline({
    teeth: leaves, module: m, addendum: 0.9, dedendum: 1.9, toothFrac: 0.52,
    tipSteps: 8, rootSteps: 3, tipPower: 1,
  });
}

// Saw-tooth ratchet wheel (click engages the radial face). dir = +1: wheel is held
// against CW rotation (seen from +Z), i.e. it may only turn CCW... flip with dir = -1.
export function ratchetOutline({ teeth, outerR, depth, dir = 1 }) {
  const rr = outerR - depth;
  const pitchA = TAU / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * pitchA;
    if (dir > 0) {
      pts.push(P(rr, a));
      pts.push(P(outerR, a + pitchA * 0.82));
      pts.push(P(outerR * 0.997, a + pitchA * 0.9));
      pts.push(P(rr, a + pitchA * 0.93));
    } else {
      pts.push(P(rr, a + pitchA * 0.07));
      pts.push(P(outerR * 0.997, a + pitchA * 0.1));
      pts.push(P(outerR, a + pitchA * 0.18));
      pts.push(P(rr, a + pitchA));
    }
  }
  return pts;
}

// Swiss club-tooth escape wheel. Teeth lean towards +angle (wheel turns CCW seen
// from +Z); mirror the mesh (scale.x = -1) for the other hand.
// The LOCKING CORNER of tooth i sits exactly at angle i * 2π/teeth, radius outerR.
export function escapeOutline({ teeth = 15, outerR, rootR = outerR * 0.66 }) {
  const p = TAU / teeth;
  const pts = [];
  const heelR = outerR * 0.955;
  for (let i = 0; i < teeth; i++) {
    const a = i * p;
    // back of the tooth: concave curve from the root up to the heel of the club
    const back0 = a - 0.34 * p, heelA = a - 0.2 * p;
    for (let k = 0; k <= 6; k++) {
      const s = k / 6;
      const r = rootR + (heelR - rootR) * s;
      const ang = back0 + (heelA - back0) * Math.pow(s, 2.1);
      pts.push(P(r, ang));
    }
    // impulse face (club) up to the locking corner
    pts.push(P(outerR * 0.985, a - 0.06 * p));
    pts.push(P(outerR, a));
    // locking face, slightly undercut (draw), down to the root
    pts.push(P(outerR * 0.9, a - 0.035 * p));
    for (let k = 0; k <= 4; k++) {
      const s = k / 4;
      const r = outerR * 0.9 + (rootR - outerR * 0.9) * s;
      pts.push(P(r, a - 0.035 * p - 0.1 * p * s * s));
    }
    // root arc forward to the next tooth
    const r0 = a - 0.135 * p, r1 = a + p - 0.34 * p;
    for (let k = 1; k < 4; k++) pts.push(P(rootR, r0 + ((r1 - r0) * k) / 4));
  }
  return pts;
}

// Windows between the spokes ("crossings"). Returns THREE.Path holes.
export function spokeHoles({ count = 5, rimInner, hubOuter, spokeWidth, twist = 0, phase = 0, steps = 10 }) {
  const holes = [];
  if (rimInner - hubOuter < spokeWidth * 0.8) return holes;
  const halfA = (r) => Math.asin(Math.min(0.99, spokeWidth / 2 / r));
  const tw = (r) => (twist * (r - hubOuter)) / (rimInner - hubOuter);
  for (let j = 0; j < count; j++) {
    const s0 = phase + (j * TAU) / count;
    const s1 = phase + ((j + 1) * TAU) / count;
    const pts = [];
    // outer arc
    const oa0 = s0 + tw(rimInner) + halfA(rimInner), oa1 = s1 + tw(rimInner) - halfA(rimInner);
    for (let k = 0; k <= steps; k++) pts.push(P(rimInner, oa0 + ((oa1 - oa0) * k) / steps));
    // spoke j+1 edge, outer → inner
    for (let k = 1; k < steps; k++) {
      const r = rimInner - ((rimInner - hubOuter) * k) / steps;
      pts.push(P(r, s1 + tw(r) - halfA(r)));
    }
    // inner arc
    const ia1 = s1 + halfA(hubOuter), ia0 = s0 + halfA(hubOuter);
    for (let k = 0; k <= steps; k++) pts.push(P(hubOuter, s1 - halfA(hubOuter) - ((s1 - s0 - 2 * halfA(hubOuter)) * k) / steps));
    void ia1; void ia0;
    // spoke j edge, inner → outer
    for (let k = 1; k < steps; k++) {
      const r = hubOuter + ((rimInner - hubOuter) * k) / steps;
      pts.push(P(r, s0 + tw(r) + halfA(r)));
    }
    holes.push(new THREE.Path(pts));
  }
  return holes;
}

export function circlePath(r, segs = 48, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i < segs; i++) pts.push(new THREE.Vector2(cx + r * Math.cos((i / segs) * TAU), cy + r * Math.sin((i / segs) * TAU)));
  return new THREE.Path(pts);
}

// Extrude an outline (+ holes) into a solid of the given thickness centred on z = 0,
// with planar UVs normalised to the part radius so circular-grain / sunburst
// textures map around the arbor.
export function extrudeOutline(outline, holes, thickness, { uvRadius } = {}) {
  const shape = new THREE.Shape(outline);
  if (holes) shape.holes.push(...holes);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 12 });
  geo.translate(0, 0, -thickness / 2);
  let R = uvRadius;
  if (!R) {
    R = 0;
    for (const v of outline) R = Math.max(R, v.length());
  }
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * R) + 0.5, pos.getY(i) / (2 * R) + 0.5);
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const cache = new Map();
const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

// A spoked watch wheel.
export function wheelGeometry({
  teeth, module: m, thickness = 0.16, spokes = 5, rimWidth, hubR, spokeWidth, twist = 0, bore = 0,
}) {
  const key = `w|${teeth}|${m}|${thickness}|${spokes}|${rimWidth}|${hubR}|${spokeWidth}|${twist}|${bore}`;
  return memo(key, () => {
    const rp = (m * teeth) / 2;
    const rr = rp - 1.6 * m;
    const rw = rimWidth ?? Math.max(0.18, rp * 0.12);
    const hr = hubR ?? Math.max(0.28, rp * 0.16);
    const sw = spokeWidth ?? Math.max(0.12, rp * 0.07);
    const holes = spokes ? spokeHoles({ count: spokes, rimInner: rr - rw, hubOuter: hr, spokeWidth: sw, twist }) : [];
    if (bore) holes.push(circlePath(bore, 24));
    return extrudeOutline(toothedOutline({ teeth, module: m }), holes, thickness);
  });
}

export function pinionGeometry({ leaves, module: m, length = 0.5 }) {
  return memo(`p|${leaves}|${m}|${length}`, () => extrudeOutline(pinionOutline({ leaves, module: m }), null, length));
}

export function ratchetGeometry({ teeth, outerR, depth, thickness, dir = 1, bore = 0 }) {
  return memo(`r|${teeth}|${outerR}|${depth}|${thickness}|${dir}|${bore}`, () =>
    extrudeOutline(ratchetOutline({ teeth, outerR, depth, dir }), bore ? [circlePath(bore, 32)] : null, thickness));
}

export function escapeWheelGeometry({ teeth = 15, outerR, thickness = 0.12, spokes = 4, hubR, spokeWidth }) {
  return memo(`e|${teeth}|${outerR}|${thickness}|${spokes}|${hubR}|${spokeWidth}`, () => {
    const rootR = outerR * 0.66;
    const holes = spokeHoles({
      count: spokes, rimInner: rootR - Math.max(0.1, outerR * 0.08), hubOuter: hubR ?? outerR * 0.2,
      spokeWidth: spokeWidth ?? outerR * 0.08,
    });
    return extrudeOutline(escapeOutline({ teeth, outerR, rootR }), holes, thickness);
  });
}

// A plain arbor along Z from z0 to z1 (with thinner pivots `pivotLen` long at each end).
export function arborGeometry({ r = 0.1, z0, z1, pivotR = r * 0.55, pivotLen = 0.25 }) {
  return memo(`a|${r}|${z0}|${z1}|${pivotR}|${pivotLen}`, () => {
    const prof = [
      new THREE.Vector2(0, z0),
      new THREE.Vector2(pivotR, z0),
      new THREE.Vector2(pivotR, z0 + pivotLen),
      new THREE.Vector2(r, z0 + pivotLen + 0.04),
      new THREE.Vector2(r, z1 - pivotLen - 0.04),
      new THREE.Vector2(pivotR, z1 - pivotLen),
      new THREE.Vector2(pivotR, z1),
      new THREE.Vector2(0, z1),
    ];
    const g = new THREE.LatheGeometry(prof, 16);
    g.rotateX(Math.PI / 2); // lathe axis Y → Z
    // LatheGeometry maps profile.y → y; after rotateX(+90°) y → z
    return g;
  });
}

// Disc / ring helper (annulus) extruded along Z, centred on z = 0.
export function ringGeometry(outerR, innerR, thickness, segs = 64) {
  return memo(`ring|${outerR}|${innerR}|${thickness}|${segs}`, () => {
    const pts = [];
    for (let i = 0; i < segs; i++) pts.push(P(outerR, (i / segs) * TAU));
    return extrudeOutline(pts, innerR > 0 ? [circlePath(innerR, segs)] : null, thickness, { uvRadius: outerR });
  });
}
