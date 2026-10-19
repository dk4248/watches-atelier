// AUTOMATIC + KEYLESS of the 9R65 (builder B4, plan.md §B4): rotor with the blue "GS Grand
// Seiko", ball bearing, Magic Lever (eccentric, pull and push pawls), pawl (transmission)
// wheel, ratchet + screw, click + spring, keyless intermediate, crown transmission wheel,
// crown wheel, winding stem, winding pinion, sliding pinion, setting wheel, setting
// intermediate wheel, setting lever, yoke, keyless springs. Data: SPEC.automatic,
// SPEC.rotor, SPEC.keyless, SPEC.keylessLevers, SPEC.rotations, SPEC.layout, SPEC.z.
//
// Motion: the rotor is the kinematics' gravity pendulum (drive 'rotor', heavy sector local −Y).
// The Magic Lever is a rigid link: ring on the eccentric E(θ) = e·(cos θ, sin θ) fixed to the
// rotor shaft, fork end F = F0 + (E·u)·u sliding along u = unit(pawl wheel); its pull and push
// pawls click over the pawl wheel's teeth. Pawl wheel, keyless intermediate and crown
// transmission follow SPEC.rotations from rot.ratchet. DEVIATION (reported): the crown wheel
// and the winding pinion are driven from rot.ratchet (−74/30, −74/14) rather than
// rot.crownWheel, because they are permanently geared to the ratchet through the keyless
// intermediate and the crown transmission — when the rotor winds they turn too, and the
// winding pinion's Breguet teeth slip under the sliding pinion (the stem and crown stay
// still, as in the real watch). With rot.crownWheel they would stand still while the
// transmission wheel turns and the teeth would pass through each other.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  SD, regionShapes, slab, lathe, latheProfile, setUV, dirUV, radialUV, screwHead, Bucket, finishes,
  smoothOutline, makeGeo, ROTOR_STRIPES, TAU, DEG,
} from './frame.js';
import { gsMonogramOps, grandSeikoOps, mirrorOps, transformOps, opsToShapes, opsBounds } from './glyphs.js';

// Measured on the case-back photos (ltF_6 at 61.6 px/mm, Worn & Wound mov_ww_25): the rotor's
// hub cap is Ø3.5 (edge at r 1.76), larger than SPEC.rotor.hub.bossRadius 1.4 — LOCAL.
const HUB_CAP_R = 1.72;
const HUB_SCREW_HEAD_R = 0.25; // three screws at SPEC.rotor.hub.screwRadius (dots Ø≈0.5 on ltF_6)

// split a slab's caps into the back (−Z) and front (+Z) faces
function splitCaps(g) {
  if (!g) return { back: null, front: null };
  const p = g.attributes.position, n = g.attributes.normal;
  const b = [[], []], f = [[], []];
  for (let i = 0; i < p.count; i += 3) {
    const t = n.getZ(i) < 0 ? b : f;
    for (let k = 0; k < 3; k++) { t[0].push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); t[1].push(n.getX(i + k), n.getY(i + k), n.getZ(i + k)); }
  }
  return { back: b[0].length ? makeGeo(b[0], b[1]) : null, front: f[0].length ? makeGeo(f[0], f[1]) : null };
}
const v2 = (pts) => pts.map((p) => [p.x, p.y]);
// Face teeth on an annulus rising along +Z from 0 to H ('saw' = Breguet, 'tri' = contrate).
function faceTeeth(teeth, rIn, rOut, H, mode = 'saw', steps = 4) {
  const pos = [];
  const pitch = TAU / teeth;
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const P = (r, a, w) => [r * Math.cos(a), r * Math.sin(a), w];
  const prof = (s) => (mode === 'saw' ? s : s < 0.5 ? 2 * s : 2 - 2 * s);
  for (let i = 0; i < teeth; i++) {
    for (let k = 0; k < steps; k++) {
      const s0 = k / steps, s1 = (k + 1) / steps, a0 = (i + s0) * pitch, a1 = (i + s1) * pitch;
      const w0 = H * prof(s0), w1 = H * prof(s1);
      quad(P(rIn, a0, w0), P(rOut, a0, w0), P(rOut, a1, w1), P(rIn, a1, w1));
      quad(P(rOut, a0, 0), P(rOut, a1, 0), P(rOut, a1, w1), P(rOut, a0, w0));
      quad(P(rIn, a1, 0), P(rIn, a0, 0), P(rIn, a0, w0), P(rIn, a1, w1));
    }
    if (mode === 'saw') { const a = (i + 1) * pitch; quad(P(rIn, a, H), P(rOut, a, H), P(rOut, a, 0), P(rIn, a, 0)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return g;
}
// Screw facing +Z (dial side): top at zTop, body down to zTop − h.
function screwFront(c, r, zTop, h, opt) {
  const s = screwHead([0, 0], r, -zTop, h, opt);
  for (const g of [s.head, s.floor]) { g.rotateX(Math.PI); g.translate(c[0], c[1], 0); }
  return s;
}

export function buildAutomatic(ctx) {
  const { spec, M, reg, root, gear } = ctx;
  const L = spec.layout, Z = spec.z, R = spec.radii, MD = spec.modules, KW = spec.keyless, AU = spec.automatic;
  const ROT = spec.rotor, KL = spec.keylessLevers, RO = spec.rotations;
  const FN = finishes(M, spec);
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const ed = (id) => spec.explodeDelay(id);
  const fmt = (v, d = 2) => v.toFixed(d);
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const deg = (v) => (((v * 180) / Math.PI) % 360 + 360) % 360;

  // ---------------------------------------------------------------- materials
  const darkSteel = (() => { const m = FN.grain.clone(); m.color.set(0x5f6369); m.roughness = 0.42; return m; })();
  const steelWheel = (() => { const m = M.wheelRhodium.clone(); m.color.set(0xb9bdc2); m.roughness = 0.3; return m; })();
  const sun = (() => { const m = M.sunburst.clone(); m.color.set(0xc9ccd0); m.roughness = 0.24; return m; })();
  const navy = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(ROT.logo.colour).multiplyScalar(0.8), metalness: 0.05, roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.12, envMapIntensity: 0.55 });
  const mats = {
    rotor: FN.rotorWave, under: FN.plateDial, band: FN.band, bevel: FN.bevel, steel: FN.steel, slot: FN.slot, turned: FN.turned,
    dark: darkSteel, wheel: steelWheel, sun, navy, hole: FN.hole, grain: FN.grain, pinion: M.steelPinion,
  };
  const assembly = (at, z = 0) => {
    const object = new THREE.Group(); object.position.set(at[0], at[1], z); root.add(object);
    const rotor = new THREE.Group(); object.add(rotor);
    return { object, rotor };
  };
  const mid = (zz) => (zz[0] + zz[1]) / 2;
  const T = (x, y, z, rz = 0) => new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z);
  const placed = (g, m) => { g.applyMatrix4(m); return g; };
  const meshPh = (A, Bp, zA, zB, phA = 0) => gear.meshPhase(ang(A, Bp), zA, zB, phA);

  // =================================================================== ROTOR
  {
    const { object, rotor } = assembly(ROT.pivot);
    const bk = new Bucket();
    const zP = ROT.z.plate, zR = ROT.z.rim; // plate −5.02…−4.72, rim −5.05…−4.27
    // outline: the bottom arc (through 270°) + the gabled top edge, smoothed like a machined part
    const arc = [];
    for (let i = 0; i <= 160; i++) { const a = (ROT.arc.fromDeg + ((ROT.arc.toDeg - ROT.arc.fromDeg) * i) / 160) * DEG; arc.push([ROT.outerRadius * Math.cos(a), ROT.outerRadius * Math.sin(a)]); }
    const top = [...ROT.topEdge].reverse(); // from +X to −X
    const topCurve = new THREE.CatmullRomCurve3(top.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getPoints((top.length - 1) * 8).map((p) => [p.x, p.y]);
    const outline = [...arc.slice(0, -1), ...topCurve.slice(0, -1)];
    const outl = SD.inter(SD.poly(outline), SD.circle([0, 0], ROT.outerRadius));
    const wins = ROT.windows.map((w) => SD.poly(smoothOutline(w, 6)));
    const diamond = SD.poly(smoothOutline(ROT.pivotHole, 5));
    const rIn = ROT.rimInnerRadius;
    const cb = SD.circle([0, 0], HUB_CAP_R + 0.03); // counterbore for the hub cap
    const plate = SD.sub(SD.inter(outl, SD.circle([0, 0], rIn)), ...wins, cb);
    const box = [-14.2, -14.2, 14.2, 2.4];
    const sP = slab(regionShapes(plate, box, 0.025), zP[0], zP[1], { top: (x, y) => (Math.hypot(x, y) > rIn - 0.01 ? 0 : 0.07), bottom: 0.03 });
    const cP = splitCaps(sP.caps);
    const rUV = dirUV(ROTOR_STRIPES.angleDialDeg, 2 * ROTOR_STRIPES.pitch, ROTOR_STRIPES.boundaryOffset);
    if (cP.back) bk.add('rotor', setUV(cP.back, rUV));
    if (cP.front) bk.add('under', cP.front);
    bk.add('bevel', sP.walls);
    // counterbore floor (thinner plate round the diamond hole), the cap sits in it
    const zCb = zP[0] + 0.16;
    const sC = slab(regionShapes(SD.sub(SD.inter(cb, outl), diamond), [-2, -2, 2, 2], 0.012), zCb, zP[1], { top: 0.015 });
    if (sC.caps) bk.add('under', sC.caps);
    if (sC.walls) bk.add('bevel', sC.walls);
    // heavy rim r 12.8–14.0: satin concentric top, polished outer chamfer
    const rimR = SD.sub(SD.inter(outl, SD.not(SD.circle([0, 0], rIn))));
    const sR = slab(regionShapes(rimR, box, 0.025), zR[0], zR[1], { top: (x, y) => (Math.hypot(x, y) > ROT.outerRadius - 0.02 ? 0.12 : 0.03), bottom: 0.04 });
    const cR = splitCaps(sR.caps);
    if (cR.back) bk.add('band', setUV(cR.back, radialUV([0, 0], ROT.outerRadius)));
    if (cR.front) bk.add('under', cR.front);
    bk.add('bevel', sR.walls);
    // rivets: polished domed heads on top, peened tails underneath
    for (const p of ROT.rivets) {
      bk.add('steel', latheProfile([[0, zP[0] - 0.026], [0.16, zP[0] - 0.022], [0.25, zP[0] - 0.012], [0.27, zP[0] + 0.002]], 28, p[0], p[1]));
      bk.add('steel', latheProfile([[0.2, zP[1] - 0.002], [0.19, zP[1] + 0.04], [0, zP[1] + 0.05]], 20, p[0], p[1]));
    }
    // hub cap with three screws and a centre point (turned, polished chamfer)
    const zTopR = Z.rotorTop;
    bk.add('turned', setUV(latheProfile([[0.2, zTopR + 0.07], [0.32, zTopR], [HUB_CAP_R - 0.07, zTopR], [HUB_CAP_R, zTopR + 0.06], [HUB_CAP_R, zCb]], 96), radialUV([0, 0], HUB_CAP_R)));
    bk.add('bevel', latheProfile([[0, zTopR + 0.12], [0.2, zTopR + 0.07]], 32));
    const hs = ROT.hub;
    for (let k = 0; k < hs.screws; k++) {
      const a = (90 + (k * 360) / hs.screws) * DEG, c = [hs.screwRadius * Math.cos(a), hs.screwRadius * Math.sin(a)];
      bk.add('bevel', latheProfile([[HUB_SCREW_HEAD_R + 0.01, zTopR + 0.035], [HUB_SCREW_HEAD_R + 0.05, zTopR]], 24, c[0], c[1]));
      const s = screwHead(c, HUB_SCREW_HEAD_R, zTopR + 0.035, 0.12, { slotW: 0.07, slotD: 0.045, slotDeg: deg(a) + 90, bev: 0.025, dome: 0.006 });
      bk.add('steel', s.head); bk.add('slot', s.floor);
    }
    // the logo: dark-navy lacquer, raised 0.012 on the plate, mirrored so it reads from the back
    const LG = ROT.logo;
    const spread = (ops, targetW) => {
      // the rotor's lettering is wider-spaced than the dial's (n26: "Grand Seiko" 11.1 mm at
      // cap 1.1): keep every glyph's shape and move the glyph centres apart
      const cs = ops.map((o) => { const b = opsBounds([o]); return { c: (b.minX + b.maxX) / 2, w: b.maxX - b.minX }; });
      const width = (s) => Math.max(...cs.map((q) => q.c * s + q.w / 2)) - Math.min(...cs.map((q) => q.c * s - q.w / 2));
      let lo = 0.5, hi = 3;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (width(m) < targetW) lo = m; else hi = m; }
      return ops.map((o, i) => transformOps([o], ([x, y]) => [x + cs[i].c * (lo - 1), y])[0]);
    };
    const place = (ops, cx, cy) => transformOps(mirrorOps(ops), ([x, y]) => [x + cx, y + cy]);
    const gsOps = spread(gsMonogramOps(LG.gs.height), LG.gs.width);
    const gb = opsBounds(gsOps);
    const gsPlaced = place(transformOps(gsOps, ([x, y]) => [x - (gb.minX + gb.maxX) / 2, y - (gb.minY + gb.maxY) / 2]), LG.gs.center[0], LG.gs.center[1]);
    const cap = LG.wordmark.capHeight;
    const wm = spread(grandSeikoOps(cap), LG.wordmark.width);
    const wb = opsBounds(wm);
    const wmPlaced = place(transformOps(wm, ([x, y]) => [x - (wb.minX + wb.maxX) / 2, y - cap / 2]), LG.wordmark.center[0], LG.wordmark.center[1]);
    const logoShapes = opsToShapes(THREE, [...gsPlaced, ...wmPlaced]);
    const lg = new THREE.ExtrudeGeometry(logoShapes, { depth: 0.012, bevelEnabled: false, curveSegments: 4 });
    lg.translate(0, 0, zP[0] - 0.012);
    const logo = new THREE.Mesh(lg, navy);
    logo.name = 'rotor-logo';
    bk.build(rotor, mats, 'rotor');
    rotor.add(logo);
    reg.add({
      id: 'rotor', name: 'Oscillating weight (rotor)', category: 'automatic', side: 'back', exposed: true, priority: 1,
      object, rotor, drive: { key: 'rotor' }, anchor: [0, -11.6, zP[0]],
      explode: ex('rotor'), explodeDelay: ed('rotor'),
      description: 'The half-moon weight with the blue “GS Grand Seiko”. Its heavy rim swings freely on a ball bearing with every movement of the wrist; whichever way it turns, the Magic Lever on its shaft winds the mainspring.',
      facts: { Radius: `${fmt(ROT.outerRadius, 1)} mm`, 'Heavy rim': `r ${fmt(rIn, 1)}–${fmt(ROT.outerRadius, 1)} mm, ${fmt(zR[1] - zR[0])} mm thick`, Finish: `wave stripes ${fmt(ROTOR_STRIPES.pitch)} mm (matching the bridges), polished bevels`, Logo: 'GS / Grand Seiko, dark-navy lacquer', Bearing: 'ball bearing, hub cap with 3 screws' },
      live: (s) => `${fmt(deg(s.rot.rotor), 0)}° · ${fmt(Math.abs(s.rotorVel) * 9.549, 1)} rpm`,
    });
  }

  // =================================================================== ROTOR BEARING
  {
    const object = new THREE.Group(); root.add(object);
    const inner = new THREE.Group(); object.add(inner);
    const cage = new THREE.Group(); object.add(cage);
    const bk = new Bucket(), bi = new Bucket(), bc = new Bucket();
    const zb = Z.rotorBearing; // −4.75 … −4.10
    const zBoss = spec.frame.automaticBridge.bearing.bossTop; // −4.50
    // outer race (pressed into the bridge): polished top ring and inner track
    bk.add('steel', latheProfile([[2.38, zb[1]], [2.38, zBoss + 0.01], [2.3, zBoss - 0.0], [1.98, zBoss], [1.94, zBoss + 0.04], [1.94, zb[1]]].reverse(), 72));
    // balls (12) turning at ≈ 0.4 × the rotor
    const ball = new THREE.SphereGeometry(0.17, 14, 10);
    for (let k = 0; k < 12; k++) { const a = (k * TAU) / 12; bc.add('steel', placed(ball.clone(), T(1.75 * Math.cos(a), 1.75 * Math.sin(a), mid([zBoss, zb[1]]) - 0.05))); }
    // inner race + shaft + diamond key + eccentric (turn with the rotor)
    bi.add('steel', latheProfile([[0, zb[0]], [1.5, zb[0]], [1.56, zb[0] + 0.04], [1.56, zb[1]], [0.4, zb[1]]], 64));
    const zKey = ROT.z.plate[0] + 0.16; // counterbore floor of the rotor
    const keyG = new THREE.ExtrudeGeometry(new THREE.Shape(smoothOutline(ROT.pivotHole, 5).map(([x, y]) => new THREE.Vector2(x * 0.96, y * 0.96))), { depth: zb[0] - zKey, bevelEnabled: false });
    keyG.translate(0, 0, zKey);
    bi.add('steel', keyG);
    const ecc = AU.eccentric;
    bi.add('pinion', latheProfile([[0.4, zb[1]], [0.4, ecc.z[0]]], 32));
    bi.add('dark', latheProfile([[0, ecc.z[0]], [ecc.radius - 0.02, ecc.z[0]], [ecc.radius, ecc.z[0] + 0.02], [ecc.radius, ecc.z[1]], [0.4, ecc.z[1]]], 48, ecc.throw * Math.cos((AU.lever.phaseDeg ?? 0) * DEG), ecc.throw * Math.sin((AU.lever.phaseDeg ?? 0) * DEG)));
    bk.build(object, mats, 'bearing-outer');
    bi.build(inner, mats, 'bearing-inner');
    bc.build(cage, mats, 'bearing-balls');
    reg.add({
      id: 'rotor-bearing', name: 'Rotor ball bearing', category: 'automatic', side: 'back', exposed: true, priority: 3,
      object, anchor: [2.1, 0.6, zBoss],
      explode: ex('rotor-bearing'), explodeDelay: ed('rotor-bearing'),
      description: 'A ball bearing pressed into the automatic bridge carries the rotor almost without friction. Its inner race and shaft turn with the rotor and carry, under the bridge, the eccentric that drives the Magic Lever.',
      facts: { Balls: '12 steel balls', 'Outer race': `Ø${fmt(4.76, 1)} mm, fixed in the bridge`, Eccentric: `throw ${ecc.throw} mm, Ø${fmt(2 * ecc.radius, 1)} mm` },
      update: (s) => { const r = s.rot.rotor; inner.rotation.z = r; cage.rotation.z = 0.4 * r; },
    });
  }

  // =================================================================== MAGIC LEVER
  const ECC = AU.eccentric.throw, LV = AU.lever;
  const PW = L.pawlWheel;
  const uLen = Math.hypot(PW[0], PW[1]);
  const U = [PW[0] / uLen, PW[1] / uLen];
  const F0 = [PW[0] - (LV.forkSetback ?? 0) * U[0], PW[1] - (LV.forkSetback ?? 0) * U[1]];
  const L0 = Math.hypot(F0[0], F0[1]);
  const PWD = AU.pawlWheel; // teeth 110, tip 3.2, depth 0.13
  const pitchPW = TAU / PWD.teeth;
  {
    const object = new THREE.Group(); root.add(object);
    const lever = new THREE.Group(); object.add(lever);
    const pawlA = new THREE.Group(), pawlB = new THREE.Group(); lever.add(pawlA, pawlB);
    const zl = Z.magicLever; // −3.96 … −3.90
    // lever-local frame: ring centre at the origin, +x towards the fork at (L0, 0)
    const rc = PWD.contactRadius;
    const ring = SD.circle([0, 0], LV.ringOuter);
    const arm = SD.capsule([0.6, 0], [L0 - 0.9, 0], LV.armWidth / 2, LV.armWidth / 2 * 0.86);
    const fork = SD.capsule([L0 - 1.3, 0], [L0 + 0.55, 0], 0.5);
    const lug = SD.capsule([1.6, -0.4], [2.6, -1.25], 0.42); // stop lug (n29)
    const slotF = SD.capsule([L0 - 0.62, 0], [L0 + 0.62, 0], 0.15);
    const body = SD.sub(SD.smooth(0.45, ring, arm, fork, lug), SD.circle([0, 0], LV.ringInner), slotF, SD.circle([2.0, 0.05], 0.25));
    const bk = new Bucket();
    const s = slab(regionShapes(body, [-1.6, -2.0, L0 + 1.4, 1.6], 0.012), zl[0], zl[1], { top: 0.02, bottom: 0.01 });
    if (s.caps) bk.add('dark', setUV(s.caps, dirUV(0, 3.2)));
    bk.add('dark', s.walls);
    bk.build(lever, mats, 'magic-lever');
    // pull / push spring pawls: fingers from the fork round the pawl wheel's flanks; their
    // hooked tips sit on the teeth at ±90° from u (lever-local (L0, ±rc))
    const pawlGeo = (sgn) => {
      const root0 = [L0 - 1.1, sgn * 0.42], elbow = [L0 - 1.0, sgn * (rc + 0.3)], tip = [L0 + 0.05 * sgn, sgn * (rc + 0.12)];
      const f = SD.smooth(0.2, SD.capsule(root0, elbow, 0.12, 0.09), SD.capsule(elbow, tip, 0.09, 0.07));
      const b = new Bucket();
      const g = slab(regionShapes(f, [L0 - 1.5, Math.min(sgn * 0.2, sgn * (rc + 0.6)), L0 + 0.5, Math.max(sgn * 0.2, sgn * (rc + 0.6))], 0.01), zl[0], zl[1] - 0.01, { top: 0.015 });
      b.add('dark', g.caps); b.add('dark', g.walls);
      // hooked tip dropping to the teeth (z −3.90 … −3.83)
      b.add('dark', latheProfile([[0, zl[0]], [0.07, zl[0]], [0.07, Z.pawlWheel[1]], [0, Z.pawlWheel[1]]], 12, L0 + 0.05 * sgn, sgn * (rc + 0.04)));
      return b;
    };
    pawlGeo(1).build(pawlA, mats, 'pull-pawl');
    pawlGeo(-1).build(pawlB, mats, 'push-pawl');
    // pawl pivots: the fingers are spring blades; their tips lift 0…depth over each tooth
    pawlA.position.set(L0 - 1.1, 0.42, 0); pawlA.children.forEach((m) => m.position.set(-(L0 - 1.1), -0.42, 0));
    pawlB.position.set(L0 - 1.1, -0.42, 0); pawlB.children.forEach((m) => m.position.set(-(L0 - 1.1), 0.42, 0));
    const armLen = Math.hypot(1.15, rc - 0.3);
    let lastPhase = 0, stroke = 0;
    const tooth = (q) => { q -= Math.floor(q); return q < 0.82 ? q / 0.82 : (1 - q) / 0.18; }; // saw tooth profile 0…1
    reg.add({
      id: 'magic-lever', name: 'Magic Lever', category: 'automatic', side: 'back', exposed: false, priority: 1,
      object, anchor: [L0 * 0.45 * U[0], L0 * 0.45 * U[1], zl[0]],
      explode: ex('magic-lever'), explodeDelay: ed('magic-lever'),
      description: 'Seiko’s 1959 invention. The lever’s ring rides on an eccentric on the rotor shaft, so every swing of the rotor, either way, rocks it to and fro; its “pull” and “push” pawls advance the pawl wheel on both strokes, which winds the mainspring through the ratchet.',
      facts: { Eccentric: `throw ${ECC} mm`, Stroke: `${fmt(2 * ECC, 1)} mm per rotor half-turn`, 'Per rotor turn': `pawl wheel ${fmt(((4 * ECC) / rc) * 180 / Math.PI, 1)}°, ratchet ${fmt(AU.ratchetPerRotorRad * 360, 2)}°`, Pawls: '2 (pull and push)', Finish: 'blackened steel' },
      live: () => `stroke ${fmt(stroke, 2)} mm`,
      update: (st) => {
        const th = st.rot.rotor + (LV.phaseDeg ?? 0) * DEG;
        const ex0 = ECC * Math.cos(th), ey0 = ECC * Math.sin(th);
        const d = ex0 * U[0] + ey0 * U[1];
        const fx = F0[0] + d * U[0], fy = F0[1] + d * U[1];
        lever.position.set(ex0, ey0, 0);
        lever.rotation.z = Math.atan2(fy - ey0, fx - ex0);
        stroke = d;
        // the pawl tips' tooth phase relative to the wheel: the driving pawl stays in its gap,
        // the other rides over the teeth (lift up to the tooth depth, then drops)
        const wheel = RO.pawlWheel(st);
        const qA = (d / rc - wheel) / pitchPW, qB = (-d / rc - wheel) / pitchPW;
        const dir = Math.sign(d - lastPhase);
        lastPhase = d;
        const liftA = dir > 0 ? 0 : tooth(qA) * PWD.depth, liftB = dir < 0 ? 0 : tooth(qB) * PWD.depth;
        pawlA.rotation.z = liftA / armLen;
        pawlB.rotation.z = -liftB / armLen;
      },
    });
  }

  // =================================================================== PAWL WHEEL
  const MR = MD.ratchet;
  const phPawl = meshPh(L.barrel, PW, KW.ratchet.teeth, PWD.pinion);
  {
    const { object, rotor } = assembly(PW);
    const bk = new Bucket();
    const zw = Z.pawlWheel, zp = Z.pawlPinion;
    const out = gear.ratchetOutline({ teeth: PWD.teeth, outerR: PWD.tipRadius, depth: PWD.depth, dir: -1 });
    const wheelG = gear.extrudeOutline(out, [gear.circlePath(0.62, 48)], zw[1] - zw[0]);
    wheelG.translate(0, 0, mid(zw));
    bk.add('wheel', wheelG);
    bk.add('dark', latheProfile([[0.12, zw[0] - 0.02], [0.62, zw[0] - 0.02], [0.62, zp[1]], [0.12, zp[1]]], 32));
    const pin = gear.pinionGeometry({ leaves: PWD.pinion, module: MR, length: zp[1] - zp[0] }).clone();
    pin.rotateZ(phPawl); pin.translate(0, 0, mid(zp));
    bk.add('pinion', pin);
    bk.add('pinion', latheProfile([[0, Z.automaticBridge[1]], [0.07, Z.automaticBridge[1]], [0.07, zw[0] - 0.03], [0.12, zw[0] - 0.02], [0.12, zp[1] + 0.02], [0.07, zp[1] + 0.03], [0.07, Z.bridges[0]], [0, Z.bridges[0]]], 16));
    bk.build(rotor, mats, 'pawl-wheel');
    reg.add({
      id: 'pawl-wheel', name: 'Transmission (pawl) wheel', category: 'automatic', side: 'back', exposed: false, priority: 2,
      object, rotor, anchor: [-1.6, 2.6, zw[0]],
      explode: ex('pawl-wheel'), explodeDelay: ed('pawl-wheel'),
      description: 'The finely toothed wheel the Magic Lever’s pawls push round, always in the same direction. Its pinion drives the ratchet wheel and so winds the mainspring; its upper pivot runs in the dark jewel in the automatic bridge.',
      facts: { Teeth: `${PWD.teeth} (ratchet teeth)`, Pinion: `${PWD.pinion} leaves → ratchet ${KW.ratchet.teeth}`, 'Per rotor turn': `${fmt(((4 * ECC) / PWD.contactRadius) * 180 / Math.PI, 1)}°` },
      live: (s) => `${fmt(deg(-RO.pawlWheel(s)), 1)}°`,
      update: (s) => { rotor.rotation.z = RO.pawlWheel(s); },
    });
  }

  // =================================================================== RATCHET + SCREW
  {
    const { object, rotor } = assembly(L.barrel);
    const bk = new Bucket();
    const zr = Z.ratchet; // −3.80 … −3.64
    const n = KW.ratchet.teeth, rp = (MR * n) / 2, tip = R.ratchet, root0 = rp - 1.6 * MR;
    // pointed V teeth (mov_naked_30), tooth 0 centred on local angle 0 (gear.meshPhase convention)
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n, hp = Math.PI / n;
      pts.push([root0 * Math.cos(a - hp), root0 * Math.sin(a - hp)]);
      pts.push([(root0 + 0.04) * Math.cos(a - hp * 0.86), (root0 + 0.04) * Math.sin(a - hp * 0.86)]);
      pts.push([(tip - 0.015) * Math.cos(a - hp * 0.07), (tip - 0.015) * Math.sin(a - hp * 0.07)]);
      pts.push([tip * Math.cos(a), tip * Math.sin(a)]);
      pts.push([(tip - 0.015) * Math.cos(a + hp * 0.07), (tip - 0.015) * Math.sin(a + hp * 0.07)]);
      pts.push([(root0 + 0.04) * Math.cos(a + hp * 0.86), (root0 + 0.04) * Math.sin(a + hp * 0.86)]);
    }
    const rRec = 1.27, zRec = zr[0] + 0.08;
    const hole = []; for (let i = 0; i < 96; i++) { const a = -(i * TAU) / 96; hole.push([(rRec + 0.05) * Math.cos(a), (rRec + 0.05) * Math.sin(a)]); }
    const sT = slab([{ outer: pts, holes: [hole] }], zr[0], zr[1], {});
    const ruv = radialUV([0, 0], tip);
    if (sT.caps) bk.add('sun', setUV(sT.caps, ruv));
    bk.add('pinion', sT.walls);
    // screw recess (polished sink) with its floor, square bore underneath
    bk.add('bevel', latheProfile([[0.55, zRec], [rRec, zRec], [rRec, zr[0] + 0.03], [rRec + 0.05, zr[0]]], 96));
    bk.add('sun', setUV(lathe([[[rRec + 0.05, zr[1]], [0.5, zr[1]]]], 64), ruv));
    bk.build(rotor, mats, 'ratchet');
    reg.add({
      id: 'ratchet-wheel', name: 'Ratchet wheel', category: 'keyless', side: 'back', exposed: true, priority: 1,
      object, rotor, drive: { key: 'ratchet' }, anchor: [2.4, -2.2, zr[0]],
      explode: ex('ratchet-wheel'), explodeDelay: ed('ratchet-wheel'),
      description: 'Sits on the square of the barrel arbor: turning it winds the mainspring. The pawl wheel (rotor) and the keyless intermediate wheel (crown) both drive it, and the click stops it running back. Radial sunburst finish.',
      facts: { Teeth: String(n), 'Tip Ø': `${fmt(2 * tip)} mm`, Module: `${fmt(MR, 3)} mm`, 'Per crown turn': `${fmt((360 * KW.windingPinion.teeth) / n, 1)}° (14 teeth)`, 'Per rotor turn': `${fmt(AU.ratchetPerRotorRad * 360, 2)}°`, Finish: 'sunburst' },
      live: (s) => `${fmt(deg(s.rot.ratchet), 1)}° · ${fmt(s.reserve * 100, 0)} % wound`,
    });
    const scr = assembly(L.barrel);
    const sb = new Bucket();
    const SR = spec.frame.screws.ratchet;
    const sh = screwHead([0, 0], SR.headDiameter / 2 - 0.03, Z.ratchetScrewTop, zRec - Z.ratchetScrewTop, { slotW: 0.28, slotD: 0.1, slotDeg: 12, bev: 0.08, dome: 0.03, shank: { r: 0.42, z: zr[1] + 0.25 } });
    sb.add('steel', sh.head); sb.add('slot', sh.floor);
    sb.build(scr.rotor, mats, 'ratchet-screw');
    reg.add({
      id: 'ratchet-screw', name: 'Ratchet screw', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object: scr.object, rotor: scr.rotor, drive: { key: 'ratchet' }, anchor: [0.9, 0, Z.ratchetScrewTop],
      explode: ex('ratchet-screw'), explodeDelay: ed('ratchet-screw'),
      description: 'The large polished slotted screw that clamps the ratchet wheel onto the barrel arbor. It turns with the ratchet whenever the watch is wound.',
      facts: { 'Head Ø': `${SR.headDiameter} mm`, Finish: 'polished, slotted' },
    });
  }

  // =================================================================== CLICK + SPRING
  {
    // The pivot screw is measured (SPEC.layout.clickScrew); the beak engages a tooth gap where
    // the arm is ≈30° off radial, as on mov_naked_30, so turning the click lifts the beak.
    const P = L.clickScrew, RC = L.barrel;
    const n = KW.ratchet.teeth, pitchR = TAU / n, tip = R.ratchet, root0 = (MR * n) / 2 - 1.6 * MR;
    const psi = 1.6 * DEG; // beak contact angle about the ratchet centre (ESTIMATE, see above)
    // snap psi to a tooth gap at rot.ratchet = 0 (gaps at local (k + ½)·pitch)
    const psiG = (Math.round(psi / pitchR - 0.5) + 0.5) * pitchR;
    const rBeak = root0 + 0.03;
    const C = [RC[0] + rBeak * Math.cos(psiG), RC[1] + rBeak * Math.sin(psiG)];
    const zc = Z.click;
    const { object, rotor } = assembly(P);
    const toL = (p) => [p[0] - P[0], p[1] - P[1]];
    const c = toL(C);
    const ca = Math.atan2(c[1], c[0]);
    const rot2 = (r, a) => [r * Math.cos(ca + a), r * Math.sin(ca + a)];
    // three-armed polished click (beak arm, spring arm, tail)
    const radial = [Math.cos(psiG), Math.sin(psiG)];
    const cl = Math.hypot(c[0], c[1]), ah = [-c[0] / cl, -c[1] / cl], pp = [-ah[1], ah[0]];
    const beak = SD.poly([c, [c[0] + 0.36 * ah[0] + 0.17 * pp[0], c[1] + 0.36 * ah[1] + 0.17 * pp[1]], [c[0] + 0.36 * ah[0] - 0.17 * pp[0], c[1] + 0.36 * ah[1] - 0.17 * pp[1]]]);
    const springArm = toL([4.55, -7.8]);
    const tail = rot2(1.15, -2.2);
    const body = SD.smooth(0.28,
      SD.circle([0, 0], 0.68),
      SD.capsule([0, 0], [c[0] * 0.82, c[1] * 0.82], 0.36, 0.17),
      beak,
      SD.capsule([0, 0], springArm, 0.3, 0.2),
      SD.capsule([0, 0], tail, 0.3, 0.16),
    );
    const bk = new Bucket();
    const sC = slab(regionShapes(SD.sub(body, SD.circle([0, 0], 0.32)), [-2.8, -2.0, 1.6, 2.2], 0.008), zc[0], zc[1], { top: 0.035 });
    bk.add('steel', sC.caps); bk.add('bevel', sC.walls);
    bk.build(rotor, mats, 'click');
    const sb = new Bucket();
    const CS = spec.frame.screws.click;
    const sh = screwHead([0, 0], CS.headDiameter / 2, zc[0] - 0.12, 0.12, { slotW: 0.17, slotD: 0.07, slotDeg: 118, bev: 0.06, dome: 0.02, shank: { r: 0.3, z: zc[1] + 0.3 } });
    sb.add('steel', sh.head); sb.add('slot', sh.floor);
    sb.build(object, mats, 'click-screw');
    // lift: the beak rides the V teeth (radius under the beak) → rotation about the pivot
    const zx = -c[1], zy = c[0];
    const kLift = zx * radial[0] + zy * radial[1]; // outward travel of the beak per radian
    const LUT = 64, lut = new Float32Array(LUT + 1);
    for (let k = 0; k <= LUT; k++) {
      const q = k / LUT; // 0 = gap centred under the beak
      const dd = Math.min(q, 1 - q); // 0 … ½ tooth from the gap
      const rho = root0 + (tip - root0) * Math.min(1, 2 * dd);
      lut[k] = Math.max(0, rho - rBeak) / kLift;
    }
    let clickAngle = 0;
    reg.add({
      id: 'click', name: 'Click', category: 'keyless', side: 'back', exposed: true, priority: 1,
      object, rotor, anchor: [c[0] * 0.5, c[1] * 0.5 + 0.3, zc[0]],
      explode: ex('click'), explodeDelay: ed('click'),
      description: 'A polished steel pawl whose beak rests between the ratchet teeth. While the watch winds it rides up each tooth and drops back — the clicking you hear when you wind the crown — and it stops the mainspring from unwinding the ratchet backwards.',
      facts: { Engages: `ratchet wheel (${n} teeth)`, 'Clicks per crown turn': String(KW.windingPinion.teeth), Finish: 'polished, polished bevels', Screw: `Ø${CS.headDiameter} mm, slotted` },
      live: () => (Math.abs(clickAngle) > 1e-3 ? `riding a tooth (${fmt(Math.abs(clickAngle) * 180 / Math.PI, 1)}°)` : 'locked in a tooth gap'),
      update: (s) => {
        const q0 = ((psiG - s.rot.ratchet) / pitchR - 0.5);
        const q = q0 - Math.floor(q0);
        const x = q * LUT, i = Math.min(LUT - 1, Math.floor(x)), t = x - i;
        clickAngle = lut[i] + (lut[i + 1] - lut[i]) * t;
        rotor.rotation.z = clickAngle;
      },
    });
    // click spring: a fine wire anchored on a stud, pressing the click's spring arm
    const A0 = [5.42, -7.43], tipS = [4.45, -7.68]; // stud on the barrel bridge's edge
    const sp = assembly(A0);
    const sbk = new Bucket();
    const zs = mid([-3.76, -3.66]);
    const curve = new THREE.CatmullRomCurve3([[0.7, 0.2], [0.25, 0.1], [0, 0], [-0.45, -0.1], [tipS[0] - A0[0], tipS[1] - A0[1]]].map(([x, y]) => new THREE.Vector3(x, y, zs)));
    sbk.add('steel', new THREE.TubeGeometry(curve, 32, 0.05, 8, false));
    sbk.add('steel', latheProfile([[0, -3.79], [0.16, -3.79], [0.2, -3.75], [0.2, Z.bridges[0]]], 24));
    sbk.build(sp.rotor, mats, 'click-spring');
    const springLen = Math.hypot(tipS[0] - A0[0], tipS[1] - A0[1]);
    const armDist = Math.hypot(springArm[0], springArm[1]);
    reg.add({
      id: 'click-spring', name: 'Click spring', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object: sp.object, rotor: sp.rotor, anchor: [-0.9, -0.1, zs],
      explode: ex('click-spring'), explodeDelay: ed('click-spring'),
      description: 'A fine steel wire spring anchored on a stud of the barrel bridge. It presses on the click’s short arm and keeps its beak in the ratchet teeth.',
      facts: { Type: 'wire spring', Length: `${fmt(springLen, 1)} mm` },
      update: () => { sp.rotor.rotation.z = (clickAngle * armDist) / springLen; },
    });
  }

  // =================================================================== KEYLESS — back side
  const phKI = meshPh(L.barrel, L.keylessIntermediate, KW.ratchet.teeth, KW.keylessIntermediate.teeth);
  const phCTu = meshPh(L.keylessIntermediate, L.crownTransmission, KW.keylessIntermediate.teeth, KW.crownTransmission.upper, phKI);
  const phCTl = meshPh(L.crownWheel, L.crownTransmission, KW.crownWheel.teeth, KW.crownTransmission.lower, 0);
  const crownWheelAngle = (s) => -(KW.ratchet.teeth / KW.crownWheel.teeth) * s.rot.ratchet;
  {
    // keyless intermediate (38), jewelled in the automatic bridge
    const { object, rotor } = assembly(L.keylessIntermediate);
    const bk = new Bucket();
    const zk = Z.keylessIntermediate;
    const g = gear.wheelGeometry({ teeth: KW.keylessIntermediate.teeth, module: MR, thickness: zk[1] - zk[0], spokes: 4, rimWidth: 0.32, hubR: 0.5, spokeWidth: 0.3 }).clone();
    g.rotateZ(phKI); g.translate(0, 0, mid(zk));
    bk.add('wheel', g);
    bk.add('pinion', latheProfile([[0, Z.automaticBridge[1]], [0.07, Z.automaticBridge[1]], [0.07, zk[0] - 0.04], [0.16, zk[0] - 0.02], [0.16, zk[1] + 0.02], [0.07, zk[1] + 0.03], [0.07, Z.bridges[0]], [0, Z.bridges[0]]], 16));
    bk.build(rotor, mats, 'keyless-intermediate');
    reg.add({
      id: 'keyless-intermediate', name: 'Keyless intermediate wheel', category: 'keyless', side: 'back', exposed: true, priority: 2,
      object, rotor, anchor: [1.6, 1.0, zk[0]],
      explode: ex('keyless-intermediate'), explodeDelay: ed('keyless-intermediate'),
      description: 'Carries hand winding from the crown transmission wheel to the ratchet; its upper pivot runs in the pink jewel in the automatic bridge. When the rotor winds, the ratchet turns it backwards through the keyless train.',
      facts: { Teeth: String(KW.keylessIntermediate.teeth), Module: `${fmt(MR, 3)} mm`, Meshes: 'ratchet (74), crown transmission (24)' },
      update: (s) => { rotor.rotation.z = RO.keylessIntermediate(s); },
    });
  }
  {
    // crown transmission: tall arbor from the plate to the automatic bridge, wheel 24 at the
    // ratchet level (keyless intermediate) and wheel 24 at the crown-wheel level
    const { object, rotor } = assembly(L.crownTransmission);
    const bk = new Bucket();
    const zu = Z.crownTransmissionUpper, zlw = Z.crownTransmissionLower;
    const gu = gear.wheelGeometry({ teeth: KW.crownTransmission.upper, module: MR, thickness: zu[1] - zu[0], spokes: 0 }).clone();
    gu.rotateZ(phCTu); gu.translate(0, 0, mid(zu));
    bk.add('wheel', gu);
    const gl = gear.wheelGeometry({ teeth: KW.crownTransmission.lower, module: MD.crown, thickness: zlw[1] - zlw[0], spokes: 0 }).clone();
    gl.rotateZ(phCTl); gl.translate(0, 0, mid(zlw));
    bk.add('wheel', gl);
    bk.add('pinion', latheProfile([[0, Z.automaticBridge[1]], [0.07, Z.automaticBridge[1]], [0.07, zu[0] - 0.03], [0.15, zu[0] - 0.02], [0.15, zlw[1] + 0.02], [0.08, zlw[1] + 0.03], [0.08, Z.mainPlate[0]], [0, Z.mainPlate[0]]], 16));
    bk.build(rotor, mats, 'crown-transmission');
    reg.add({
      id: 'crown-transmission-wheel', name: 'Crown transmission wheel', category: 'keyless', side: 'back', exposed: true, priority: 3,
      object, rotor, anchor: [1.2, 0.6, zu[0]],
      explode: ex('crown-transmission-wheel'), explodeDelay: ed('crown-transmission-wheel'),
      description: 'A tall arbor with two wheels that carries hand winding from the crown wheel, deep near the plate, up to the keyless intermediate wheel at the ratchet level. Its teeth show through the small window in the automatic bridge.',
      facts: { 'Upper wheel': `${KW.crownTransmission.upper} teeth (to the keyless intermediate)`, 'Lower wheel': `${KW.crownTransmission.lower} teeth (to the crown wheel)`, Arbor: `${fmt(Z.mainPlate[0] - Z.automaticBridge[1])} mm long` },
      update: (s) => { rotor.rotation.z = RO.crownTransmission(s); },
    });
  }
  {
    // crown wheel (30) on a fixed core hanging from the train bridge
    const { object, rotor } = assembly(L.crownWheel);
    const bk = new Bucket(), fixed = new Bucket();
    const zcw = Z.crownWheel;
    const g = gear.wheelGeometry({ teeth: KW.crownWheel.teeth, module: MD.crown, thickness: zcw[1] - zcw[0], spokes: 0, bore: 0.2 }).clone();
    g.translate(0, 0, mid(zcw));
    bk.add('wheel', g);
    bk.build(rotor, mats, 'crown-wheel');
    fixed.add('pinion', latheProfile([[0, Z.bridges[0] + 0.1], [0.12, Z.bridges[0] + 0.1], [0.12, zcw[1] - 0.01], [0.24, zcw[1]], [0.24, zcw[1] + 0.05], [0, zcw[1] + 0.06]], 20));
    fixed.build(object, mats, 'crown-wheel-core');
    reg.add({
      id: 'crown-wheel', name: 'Crown wheel', category: 'keyless', side: 'back', exposed: false, priority: 2,
      object, rotor, anchor: [-1.4, -1.2, zcw[0]],
      explode: ex('crown-wheel'), explodeDelay: ed('crown-wheel'),
      description: 'Lies flat just behind the winding stem; the winding pinion’s teeth turn it at right angles. It passes hand winding to the crown transmission wheel — and, since the train is permanently geared, it also turns when the rotor winds (the winding pinion then slips on the sliding pinion).',
      facts: { Teeth: String(KW.crownWheel.teeth), Module: `${fmt(MD.crown, 3)} mm`, Driven: `by the ${KW.windingPinion.teeth}-tooth winding pinion`, 'Per crown turn': `${fmt((360 * KW.windingPinion.teeth) / KW.crownWheel.teeth, 0)}°` },
      live: (s) => `${fmt(deg(crownWheelAngle(s)), 1)}°`,
      update: (s) => { rotor.rotation.z = crownWheelAngle(s); },
    });
  }

  // =================================================================== KEYLESS — stem side
  const SZ = Z.stemAxis, ST = KL.stem;
  const onX = (g) => { g.rotateY(Math.PI / 2); return g; }; // geometry built along +Z → along +X
  const latheX = (profile, segs = 32) => onX(latheProfile(profile.map(([r, x]) => [r, x]), segs));
  {
    // winding stem: pilot, journal, square, round, setting-lever groove, thread into the crown
    const { object, rotor } = assembly([0, 0], SZ);
    const bk = new Bucket();
    const x0 = ST.innerEnd;
    bk.add('steel', latheX([[0, x0], [0.18, x0], [0.22, x0 + 0.04], [0.22, ST.journal[1]], [0, ST.journal[1]]], 24));
    const sq = new THREE.BoxGeometry(ST.square[1] - ST.square[0], 0.62, 0.62);
    sq.rotateX(Math.PI / 4); sq.translate((ST.square[0] + ST.square[1]) / 2, 0, 0);
    bk.add('steel', sq);
    const g0 = ST.groove[0], g1 = ST.groove[1], rr = ST.radius;
    const prof = [[0, ST.square[1]], [0.3, ST.square[1]], [0.3, 10.5], [rr, 10.56], [rr, g0], [0.31, g0 + 0.06], [0.31, g1 - 0.06], [rr, g1], [rr, 19.6], [0.38, 19.7]];
    for (let x = 19.75, k = 0; x < ST.crownThreadEnd - 0.08; x += 0.08, k++) prof.push([k % 2 ? 0.38 : 0.31, x]);
    prof.push([0.28, ST.crownThreadEnd - 0.03], [0, ST.crownThreadEnd]);
    bk.add('steel', latheX(prof, 28));
    bk.build(rotor, mats, 'winding-stem');
    reg.add({
      id: 'winding-stem', name: 'Winding stem', category: 'keyless', side: 'both', exposed: false, priority: 2,
      object, rotor, anchor: [12.5, 0, 0.45],
      explode: ex('winding-stem'), explodeDelay: ed('winding-stem'),
      description: 'The steel shaft from the screw-down crown into the movement. Its square turns the sliding pinion; the setting lever’s pin rides in its groove and holds it in the winding, date-setting or time-setting position.',
      facts: { 'Ø': `${fmt(2 * ST.radius, 1)} mm`, Positions: '0 wind · 1 date · 2 time + hack', Square: `${fmt(ST.square[1] - ST.square[0], 1)} mm` },
      live: (s) => `${fmt(deg(-s.rot.stem), 0)}°`,
      update: (s) => { rotor.rotation.x = s.rot.stem; },
    });
  }
  {
    // winding pinion: 14 teeth (its −Z side drives the crown wheel's +X edge) + 9 Breguet teeth
    const { object, rotor } = assembly([0, 0], SZ);
    const bk = new Bucket();
    const xw0 = 9.75, xw1 = 10.45;
    const zt = KW.windingPinion.teeth;
    const t = gear.extrudeOutline(gear.toothedOutline({ teeth: zt, module: MD.crown }), [gear.circlePath(0.31, 32)], xw1 - xw0);
    // a gap faces −Z when the crown wheel has a tooth at its +X edge (both at angle 0)
    t.rotateZ(Math.PI / zt);
    t.translate(0, 0, (xw0 + xw1) / 2);
    bk.add('pinion', onX(t));
    const ft = faceTeeth(9, 0.33, 0.62, 0.16, 'saw');
    ft.rotateY(Math.PI); ft.translate(0, 0, xw0); // teeth facing −X (towards the sliding pinion)
    bk.add('pinion', onX(ft));
    bk.build(rotor, mats, 'winding-pinion');
    const ratio = (KW.ratchet.teeth / KW.windingPinion.teeth);
    reg.add({
      id: 'winding-pinion', name: 'Winding pinion', category: 'keyless', side: 'back', exposed: false, priority: 3,
      object, rotor, anchor: [10.1, 0, -0.9],
      explode: ex('winding-pinion'), explodeDelay: ed('winding-pinion'),
      description: 'Turns freely on the stem. When you wind, the sliding pinion’s Breguet teeth drive it and its 14 teeth turn the crown wheel lying beneath; when the rotor winds, it turns on its own and its Breguet teeth slip, so the crown stays still.',
      facts: { Teeth: `${zt} (+ 9 Breguet teeth)`, Module: `${fmt(MD.crown, 3)} mm`, Drives: `crown wheel (${KW.crownWheel.teeth})` },
      update: (s) => { rotor.rotation.x = -ratio * s.rot.ratchet; },
    });
  }
  {
    // sliding pinion on the square: 12 contrate teeth (→ setting wheel), 9 Breguet teeth
    const { object, rotor } = assembly([0, 0], SZ);
    const bk = new Bucket();
    const xs0 = 8.55, xs1 = 9.7;
    bk.add('pinion', latheX([[0.44, xs0 + 0.1], [0.72, xs0 + 0.1], [0.75, xs0 + 0.13], [0.75, 8.98], [0.6, 9.02], [0.55, 9.06], [0.55, 9.2], [0.6, 9.24], [0.75, 9.28], [0.75, xs1 - 0.16], [0.72, xs1 - 0.13], [0.44, xs1 - 0.13]], 32));
    const ct = faceTeeth(KW.slidingPinion.contrate, 0.44, 0.74, 0.1, 'tri');
    ct.rotateY(Math.PI); ct.translate(0, 0, xs0 + 0.1);
    bk.add('pinion', onX(ct));
    const bt = faceTeeth(KW.slidingPinion.breguet, 0.33, 0.62, 0.13, 'saw');
    bt.translate(0, 0, xs1 - 0.13);
    bk.add('pinion', onX(bt));
    bk.build(rotor, mats, 'sliding-pinion');
    reg.add({
      id: 'sliding-pinion', name: 'Sliding pinion', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [9.1, 0.8, -0.9],
      explode: ex('sliding-pinion'), explodeDelay: ed('sliding-pinion'),
      description: 'Slides on the stem’s square. Pressed against the winding pinion by the yoke it winds the watch; pulled towards the setting wheel it sets the date and the hands instead.',
      facts: { 'Breguet teeth': String(KW.slidingPinion.breguet), 'Contrate teeth': String(KW.slidingPinion.contrate) },
      update: (s) => { rotor.rotation.x = s.rot.stem; },
    });
  }
  // setting train (dial side, level 1): phases chained from the cannon pinion ↔ minute wheel
  const MA = MD.motionA;
  const phMW = meshPh(L.center, L.minuteWheel, spec.train.cannon.teeth, spec.train.minuteWheel.teeth, 0);
  const phSI = meshPh(L.minuteWheel, L.settingIntermediate, spec.train.minuteWheel.teeth, KW.settingIntermediate.teeth, phMW);
  const phSW = meshPh(L.settingIntermediate, L.settingWheel, KW.settingIntermediate.teeth, KW.settingWheel.teeth, phSI);
  const settingWheel = (id, name, at, teeth, ph, key, desc, facts) => {
    const { object, rotor } = assembly(at);
    const bk = new Bucket(), fixed = new Bucket();
    const zz = Z[key];
    const g = gear.wheelGeometry({ teeth, module: MA, thickness: zz[1] - zz[0], spokes: teeth >= 30 ? 4 : 0, rimWidth: 0.22, hubR: 0.36, spokeWidth: 0.2, bore: 0.13 }).clone();
    g.rotateZ(ph); g.translate(0, 0, mid(zz));
    bk.add('wheel', g);
    bk.build(rotor, mats, id);
    fixed.add('pinion', latheProfile([[0, Z.motionRecessFloor], [0.12, Z.motionRecessFloor], [0.12, zz[1] + 0.01], [0.2, zz[1] + 0.012], [0.2, zz[1] + 0.04], [0, zz[1] + 0.05]], 16));
    fixed.build(object, mats, `${id}-stud`);
    reg.add({
      id, name, category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, drive: { key: key === 'settingWheel' ? 'settingWheel' : 'settingIntermediate' }, anchor: [0.5, 0.6, zz[1]],
      explode: ex(id), explodeDelay: ed(id), description: desc, facts,
    });
  };
  settingWheel('setting-wheel', 'Setting wheel', L.settingWheel, KW.settingWheel.teeth, phSW, 'settingWheel',
    'Sits on the stem line next to the sliding pinion. When the crown is pulled out, the sliding pinion’s contrate teeth engage it and turning the crown sets the hands through the setting intermediate wheel and the minute wheel.',
    { Teeth: String(KW.settingWheel.teeth), Module: `${fmt(MA, 3)} mm` });
  settingWheel('setting-intermediate-wheel', 'Setting intermediate wheel', L.settingIntermediate, KW.settingIntermediate.teeth, phSI, 'settingIntermediate',
    'Links the setting wheel to the minute wheel of the motion works; it turns slowly with the hands all the time.',
    { Teeth: String(KW.settingIntermediate.teeth), Meshes: 'minute wheel (42), setting wheel (19)' });

  // ---------- setting lever, yoke, springs (z.keylessLevers, on the plate's dial face)
  const zk = Z.keylessLevers; // 0 … 0.14
  const leverPart = (id, name, sdf, box, pivot, extra, desc, facts) => {
    const object = new THREE.Group(); root.add(object);
    const bk = new Bucket();
    const s = slab(regionShapes(sdf, box, 0.012), zk[0], zk[1], { bottom: 0.03 });
    const cc = splitCaps(s.caps);
    if (cc.front) bk.add('grain', setUV(cc.front, dirUV(Math.atan2(pivot[1], pivot[0]) / DEG + 90, 3.2)));
    if (cc.back) bk.add('grain', cc.back);
    bk.add('bevel', s.walls);
    if (extra) extra(bk);
    bk.build(object, mats, id);
    reg.add({ id, name, category: 'keyless', side: 'front', exposed: false, priority: 3, object, anchor: [pivot[0], pivot[1], zk[1]], explode: ex(id), explodeDelay: ed(id), description: desc, facts });
  };
  const frontScrew = (bk, p, slot) => { const s = screwFront(p, 0.36, zk[1] + 0.12, 0.12 + 0.02, { slotW: 0.09, slotD: 0.05, slotDeg: slot, bev: 0.04, dome: 0.01 }); bk.add('steel', s.head); bk.add('slot', s.floor); };
  {
    const S = KL.settingLever, w = S.width / 2;
    const sdf = SD.smooth(0.25, SD.circle(S.pivot, 0.6), SD.capsule(S.pivot, S.pin, w, w * 0.8), SD.capsule(S.pin, S.beak, w * 0.75, w * 0.6), SD.capsule(S.pivot, S.tail, w, w * 0.75));
    leverPart('setting-lever', 'Setting lever', SD.sub(sdf, SD.circle(S.pivot, 0.2)), [10.2, -2.3, 13.8, 4.2], S.pivot, (bk) => {
      bk.add('steel', latheProfile([[0, -0.43], [0.1, -0.43], [0.12, -0.4], [0.12, zk[0] + 0.01], [0, zk[0] + 0.01]], 20, S.pin[0], S.pin[1]));
      frontScrew(bk, S.pivot, 30);
    }, 'A pivoting lever whose pin sits in the groove of the winding stem. Pulling the crown swings it, and its beak moves the yoke, switching the keyless works from winding to date-setting and then to time-setting with the hack.',
    { Positions: '3 (wind, date, time)', Pin: 'in the stem groove' });
  }
  {
    const Y = KL.yoke, w = Y.width / 2;
    const fk = Y.fork;
    const sdf = SD.smooth(0.22, SD.circle(Y.pivot, 0.55), SD.capsule(Y.pivot, Y.arm, w, w * 0.8), SD.capsule(Y.arm, [fk[0], Y.forkFingersY[0]], w * 0.7), SD.capsule([fk[0], Y.forkFingersY[0]], [fk[0], Y.forkFingersY[1]], 0.16), SD.capsule(Y.pivot, Y.tail, w, w * 0.7));
    leverPart('yoke', 'Yoke', SD.sub(sdf, SD.circle(Y.pivot, 0.2)), [8.5, -3.6, 13.6, 1.2], Y.pivot, (bk) => {
      for (const fy of Y.forkFingersY) bk.add('steel', placed(new THREE.BoxGeometry(0.2, 0.16, zk[0] + 0.01 - (Z.slidingPinion[0] + 0.5)), T(fk[0], fy, (zk[0] + 0.01 + Z.slidingPinion[0] + 0.5) / 2)));
      frontScrew(bk, Y.pivot, 120);
    }, 'A forked lever whose fingers sit in the groove of the sliding pinion. It shifts the sliding pinion between the winding pinion (winding) and the setting wheel (setting).',
    { Fingers: '2, in the sliding-pinion groove', Spring: 'yoke spring' });
  }
  {
    const YS = KL.yokeSpring, SJ = KL.settingLeverJumper;
    const blade = (a, b, w) => SD.smooth(0.12, SD.capsule(a, b, w / 2, w * 0.4), SD.circle(a, 0.42), SD.circle(b, w * 0.7));
    leverPart('keyless-springs', 'Keyless springs', SD.union(blade(YS.anchor, YS.nose, YS.width), blade(SJ.anchor, SJ.nose, SJ.width)), [12.2, -4.6, 14.0, 4.3], YS.anchor, (bk) => {
      frontScrew(bk, YS.anchor, 70); frontScrew(bk, SJ.anchor, 20);
    }, 'Two flat steel springs: the yoke spring keeps the sliding pinion engaged with the winding pinion, and the setting-lever jumper holds the setting lever — and so the crown — in each position.',
    { Parts: 'yoke spring, setting-lever jumper', Material: 'hardened spring steel' });
  }
}
