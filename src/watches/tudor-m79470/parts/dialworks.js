// DIAL-SIDE WORKS of the Tudor MT5652 (builder C) — everything between the main plate and the
// dial except the date disc: motion works (cannon pinion, minute wheel), GMT works (24-hour
// wheel, GMT idler, hour-wheel driver, hour jumper, local hour wheel with its 12-point star),
// date works (date driver + snail cam, instant-date lever with its curled wire spring, date
// jumper, disc guards), the calendar plate, and the keyless / setting works (stem, sliding and
// winding pinions, setting lever, yoke, springs, setting wheels, stop-seconds lever).
//
// Stack from the plate up (SPEC.z): cannon leaves + minute wheel 40 (+ setting wheel 15) in the
// plate's recesses → 24-hour wheel 30 ← GMT idler pinion 15; idler wheel 30 ← driver 30; driver
// 36 ← minute pinion 10 → hour jumper on the driver + 12-point star under the local hour wheel →
// local hour wheel 36 → date driver 72 (meshes the LOCAL hour wheel: the date follows the
// jumping hour) with its snail cam → calendar plate → lever, jumper (disc level) → guards.
// All hidden under the dial (≤ 60 k triangles).
import * as THREE from 'three';
import {
  TAU, DEG, V2, BEVEL_CREASE, Batch, mtx, onX, AX, ANX, latheZ, latheX, sdCircle, sdCapsule, sdPolygon, sdArcBand, sUnion,
  sdBlade, sdfExtrude, wheelGeo, pinionGeo, faceTeethGeo, screwGeo, screwMtx, contactLUT, densify, movementMaterials,
} from './train.js';

export function buildDialWorks(ctx) {
  if (ctx.lite) return; // the watch box builds only case, dial and hands
  const { spec, M, reg, root, gear, planarUV } = ctx;
  const Z = spec.z, L = spec.layout, TR = spec.train, KW = spec.keyless, MD = spec.modules, PI = spec.pipes;
  const G = spec.gmt, DT = spec.dateTrain, DD = spec.date.disc;
  const mm = movementMaterials(M, spec);
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const fmt = (v, d = 1) => v.toFixed(d);
  const degOf = (v) => ((((v * 180) / Math.PI) % 360) + 360) % 360;
  const tipW = (z, m) => m * (z / 2 + 1.3);
  const clock = (r, deg) => [r * Math.sin(deg * DEG), r * Math.cos(deg * DEG)]; // clock angle, CW from 12
  const mathOfClock = (deg) => (90 - deg) * DEG;
  const rot2 = (p, c, a) => { const dx = p[0] - c[0], dy = p[1] - c[1], co = Math.cos(a), si = Math.sin(a); return [c[0] + dx * co - dy * si, c[1] + dx * si + dy * co]; };
  const hm = (h) => { const H = Math.floor(h), m = Math.floor((h - H) * 60); return `${String(H).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };

  function assembly(pos, z = 0) {
    const object = new THREE.Group();
    object.position.set(pos[0], pos[1], z);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    return { object, rotor };
  }
  const add = (def) => reg.add({ explode: spec.explode[def.id] ?? [0, 0, 0], explodeDelay: spec.explodeDelay(def.id), ...def });
  const mid = (z) => (z[0] + z[1]) / 2;
  // hidden under the dial: tooth tips with fewer facets (same pitch geometry)
  const coarse = (teeth, m) => gear.toothedOutline({ teeth, module: m, tipSteps: 4, rootSteps: 2 });

  // ---------- mesh phases (SPEC.meshes): the A toothing keeps local phase 0, its mate the offset
  const C0 = L.center;
  const phMinuteWheel = gear.meshPhase(ang(C0, L.minuteWheel), TR.cannon.teeth, TR.minuteWheel.teeth, 0);
  const phSettingWheel = gear.meshPhase(ang(L.minuteWheel, L.settingWheel), TR.minuteWheel.teeth, KW.settingWheel.teeth, phMinuteWheel);
  const phDriver36 = gear.meshPhase(ang(L.minuteWheel, C0), TR.minuteWheel.pinion, TR.hourWheel.teeth, 0);
  const phIdlerWheel = gear.meshPhase(ang(C0, L.gmtIdler), G.driverUpper.teeth, G.idler.teeth, 0);
  // hand24 includes gmtOffsetHours; the idler turns with the hour-wheel driver (no offset)
  const ph24 = gear.meshPhase(ang(L.gmtIdler, C0), G.idler.pinion, G.wheel24.teeth, 0) + (TAU * (spec.gmtOffsetHours || 0)) / 24;
  const phDateDriver = gear.meshPhase(ang(C0, L.dateDriver), G.localHourWheel.teeth, DT.driver.teeth, 0);

  // ===================================================================== MOTION WORKS
  // ---------- cannon pinion (12 leaves in the plate recess, pipe to the minute hand)
  {
    const { object, rotor } = assembly(C0);
    const b = new Batch();
    const lz = Z.cannonLeaves, [pr0, pr1] = PI.cannon;
    b.add(pinionGeo(gear, { leaves: TR.cannon.teeth, module: MD.motionA, length: lz[1] - lz[0], bore: pr0 }), mm.pinPair, mtx(0, 0, mid(lz)), 35 * DEG);
    b.add(latheZ([[pr0, lz[1] - 0.01], [0.5, lz[1] - 0.01], [0.5, lz[1] + 0.04], [pr1, lz[1] + 0.1], [pr1, Z.cannonPipeTop - 0.03], [pr1 - 0.03, Z.cannonPipeTop], [pr0, Z.cannonPipeTop], [pr0, lz[1] - 0.01]], 40), mm.polished);
    b.build(rotor);
    add({
      id: 'cannon-pinion', name: 'Cannon pinion', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'cannon' }, anchor: [0.75, 0, mid(lz)],
      description: 'A hollow pinion with a friction fit on the hollow centre-wheel arbor. It turns once an hour and its pipe carries the minute hand; the friction lets the hands be set without stopping the train. Its 12 leaves drive the minute wheel.',
      facts: { Leaves: String(TR.cannon.teeth), Module: `${fmt(MD.motionA, 3)} mm`, Speed: '1 turn / hour', 'Pipe Ø': `${fmt(2 * pr1, 2)} mm` },
      live: (s) => `${fmt(degOf(s.rot.cannon), 2)}° · 1 turn / 60 min`,
    });
  }
  // ---------- minute wheel 40 + pinion 10 on a fixed stud
  {
    const { object, rotor } = assembly(L.minuteWheel);
    const b = new Batch();
    const wz = Z.minuteWheel, pz = Z.minutePinion;
    b.add(wheelGeo(gear, { teeth: TR.minuteWheel.teeth, module: MD.motionA, thickness: wz[1] - wz[0], spokes: 4, rimW: 0.22, hubR: 0.62, spokeW: 0.24, phase: 0.3, bore: 0.2 , outline: coarse(TR.minuteWheel.teeth, MD.motionA) }), mm.giltPair, mtx(0, 0, mid(wz), phMinuteWheel), 38 * DEG);
    b.add(pinionGeo(gear, { leaves: TR.minuteWheel.pinion, module: MD.motionB, length: pz[1] - pz[0], bore: 0.2 }), mm.pinPair, mtx(0, 0, mid(pz)), 35 * DEG);
    b.build(rotor);
    const s = new Batch();
    s.add(latheZ([[0, Z.motionRecess - 0.2], [0.19, Z.motionRecess - 0.2], [0.19, pz[1] + 0.01], [0.3, pz[1] + 0.01], [0.3, pz[1] + 0.05], [0.27, pz[1] + 0.07], [0, pz[1] + 0.07]], 28), mm.polished);
    s.build(object);
    add({
      id: 'minute-wheel', name: 'Minute wheel', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'minuteWheel' }, anchor: [-1.5, -1.4, wz[1]],
      description: 'Part of the 12 : 1 motion works under the dial. The cannon pinion drives its 40 teeth; its tall 10-leaf pinion climbs past the 24-hour wheel to drive the hour-wheel driver. The setting wheel stays in mesh with it for hand-setting.',
      facts: { Teeth: String(TR.minuteWheel.teeth), Pinion: `${TR.minuteWheel.pinion} leaves`, Speed: '1 turn / 3 h 20 min', Ratio: '(40/12) × (36/10) = 12' },
      live: (st) => `${fmt(degOf(st.rot.minuteWheel), 2)}° · 1 turn / 200 min`,
    });
  }

  // ===================================================================== GMT WORKS
  // ---------- 24-hour wheel (GMT hand) + pipe
  {
    const { object, rotor } = assembly(C0);
    const b = new Batch();
    const wz = Z.wheel24, [p0, p1] = PI.gmt;
    b.add(wheelGeo(gear, { teeth: G.wheel24.teeth, module: MD.gmtB, thickness: wz[1] - wz[0], bore: p0 , outline: coarse(G.wheel24.teeth, MD.gmtB) }), mm.giltPair, mtx(0, 0, mid(wz), ph24), 38 * DEG);
    // collar under the local hour wheel's hub (hub bottom z.hourHub[0]), then the pipe
    b.add(latheZ([[p0, wz[1] - 0.01], [0.95, wz[1] - 0.01], [0.95, wz[1] + 0.02], [p1 + 0.04, Z.hourHub[0] - 0.012], [p1, Z.hourHub[0] - 0.005], [p1, Z.gmtPipeTop - 0.03], [p1 - 0.03, Z.gmtPipeTop], [p0, Z.gmtPipeTop], [p0, wz[1] - 0.01]], 40), mm.brass);
    b.build(rotor);
    add({
      id: 'gmt-wheel', name: '24-hour wheel', category: 'motion', side: 'front', exposed: false, priority: 1,
      object, rotor, drive: { key: 'hand24' }, anchor: [1.6, 1.2, wz[1]],
      description: 'Carries the yellow 24-hour (GMT) hand on its pipe and turns once a day. The GMT idler drives it from the hour-wheel driver, so it always follows the reference time; jumping the local hour hand never moves it.',
      facts: { Teeth: String(G.wheel24.teeth), Module: `${fmt(MD.gmtB, 3)} mm`, Speed: '1 turn / 24 h', Driven: `GMT idler pinion (${G.idler.pinion})`, 'Pipe Ø': `${fmt(2 * p1, 2)} mm` },
      live: (s) => { const h = ((-s.rot.hand24 / TAU) * 24 + 24) % 24; return `home ${hm(h)} (24 h)`; },
    });
  }
  // ---------- GMT idler: wheel 30 (from the driver's 30) + pinion 15 (to the 24-hour wheel)
  {
    const { object, rotor } = assembly(L.gmtIdler);
    const b = new Batch();
    const pz = Z.gmtIdlerPinion, wz = Z.gmtIdlerWheel;
    b.add(wheelGeo(gear, { teeth: G.idler.teeth, module: MD.gmtA, thickness: wz[1] - wz[0], bore: 0.16 , outline: coarse(G.idler.teeth, MD.gmtA) }), mm.giltPair, mtx(0, 0, mid(wz), phIdlerWheel), 38 * DEG);
    b.add(pinionGeo(gear, { leaves: G.idler.pinion, module: MD.gmtB, length: pz[1] - pz[0], bore: 0.16 }), mm.pinPair, mtx(0, 0, mid(pz)), 35 * DEG);
    b.add(latheZ([[0.16, pz[1] - 0.01], [0.45, pz[1] - 0.01], [0.45, wz[0] + 0.01], [0.16, wz[0] + 0.01]], 32), mm.polished);
    b.build(rotor);
    const s = new Batch();
    s.add(latheZ([[0, -0.3], [0.15, -0.3], [0.15, wz[1] + 0.01], [0.25, wz[1] + 0.01], [0.25, wz[1] + 0.06], [0.22, wz[1] + 0.08], [0, wz[1] + 0.08]], 24), mm.polished);
    s.build(object);
    add({
      id: 'gmt-wheels', name: 'GMT idler', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'gmtIdler' }, anchor: [0, 1.3, wz[1]],
      description: 'Links the hour-wheel driver to the 24-hour wheel: its 30-tooth wheel is driven by the driver\'s upper toothing and its 15-leaf pinion turns the 24-hour wheel, halving the speed to one turn a day.',
      facts: { Wheel: `${G.idler.teeth} teeth`, Pinion: `${G.idler.pinion} leaves`, Speed: '1 turn / 12 h (anticlockwise)', Ratio: '(30/30) × (30/15) = 2' },
      live: (s) => `${fmt(degOf(s.rot.gmtIdler), 2)}° · 1 turn / 12 h`,
    });
  }
  // ---------- hour-wheel driver (steel, 36 + 30), rides on the local hour wheel's hub
  const hubR = PI.hour[1];
  {
    const { object, rotor } = assembly(C0);
    const b = new Batch();
    const z36 = Z.hourDriver, z30 = Z.hourDriverUpper, bore = hubR + 0.01;
    b.add(wheelGeo(gear, { teeth: TR.hourWheel.teeth, module: MD.motionB, thickness: z36[1] - z36[0], bore , outline: coarse(TR.hourWheel.teeth, MD.motionB) }), mm.steelPair, mtx(0, 0, mid(z36), phDriver36), 35 * DEG);
    b.add(wheelGeo(gear, { teeth: G.driverUpper.teeth, module: MD.gmtA, thickness: z30[1] - z30[0], bore , outline: coarse(G.driverUpper.teeth, MD.gmtA) }), mm.steelPair, mtx(0, 0, mid(z30)), 35 * DEG);
    b.add(latheZ([[bore, z30[1] - 0.01], [1.2, z30[1] - 0.01], [1.2, z36[0] + 0.01], [bore, z36[0] + 0.01]], 48), mm.polished);
    b.build(rotor);
    add({
      id: 'hour-wheel-driver', name: 'Hour-wheel driver', category: 'motion', side: 'front', exposed: false, priority: 2,
      object, rotor, drive: { key: 'hourWheel' }, anchor: [2.0, -1.0, z36[1]],
      description: 'The reference hour wheel: the minute pinion turns its 36 teeth once in 12 hours, and its second toothing (30) drives the GMT idler. The hour jumper is screwed to its face and holds the local hour wheel\'s star, so normally both turn together.',
      facts: { Teeth: `${TR.hourWheel.teeth} + ${G.driverUpper.teeth}`, Speed: '1 turn / 12 h', Material: 'steel', Carries: 'the hour jumper' },
      live: (s) => `${fmt(degOf(s.rot.hourWheel), 3)}° · 1 turn / 12 h`,
    });
  }
  // ---------- local hour wheel (36, gilt) with its 12-point star (steel), hub and pipe
  const aGap = mathOfClock(G.star.jumperDeg); // a star gap faces the jumper beak at rot 0
  {
    const { object, rotor } = assembly(C0);
    const b = new Batch();
    const wz = Z.localHourWheel, sz = Z.hourStar, st = G.star, [h0, h1] = PI.hour;
    b.add(wheelGeo(gear, { teeth: G.localHourWheel.teeth, module: MD.date, thickness: wz[1] - wz[0], spokes: 5, rimW: 0.2, hubR: 1.0, spokeW: 0.22, phase: 0.5, bore: h0 , outline: coarse(G.localHourWheel.teeth, MD.date) }), mm.giltPair, mtx(0, 0, mid(wz)), 38 * DEG);
    // 12-point star: V gaps, a gap centred on aGap
    const star = [];
    for (let k = 0; k < st.teeth; k++) {
      const aT = aGap + Math.PI / st.teeth + (k * TAU) / st.teeth;
      const hp = Math.PI / st.teeth;
      star.push(V2(st.rootRadius * Math.cos(aT - hp), st.rootRadius * Math.sin(aT - hp)));
      star.push(V2(st.tipRadius * Math.cos(aT - 0.035), st.tipRadius * Math.sin(aT - 0.035)));
      star.push(V2(st.tipRadius * Math.cos(aT + 0.035), st.tipRadius * Math.sin(aT + 0.035)));
    }
    b.add(gear.extrudeOutline(star, [gear.circlePath(h1, 40)], sz[1] - sz[0]), mm.steelPair, mtx(0, 0, mid(sz)), 30 * DEG);
    // collar star → wheel, then hub (down inside the driver) and pipe (up to the hour hand): one tube
    b.add(latheZ([[h1, sz[1] - 0.01], [1.15, sz[1] - 0.01], [1.15, wz[0] + 0.01], [h1, wz[0] + 0.01]], 48), mm.brass);
    b.add(latheZ([[h0, Z.hourHub[0]], [h1, Z.hourHub[0]], [h1, Z.hourPipeTop - 0.03], [h1 - 0.03, Z.hourPipeTop], [h0, Z.hourPipeTop], [h0, Z.hourHub[0]]], 48), mm.brass);
    b.build(rotor);
    add({
      id: 'hour-wheel', name: 'Local hour wheel', category: 'motion', side: 'front', exposed: false, priority: 1,
      object, rotor, drive: { key: 'hourWheel' }, anchor: [-1.7, 0.9, wz[1]],
      description: 'Carries the local hour hand. Its hub runs down inside the driver, and the 12-point star under it is held by the hour jumper, so it normally turns with the driver; with the crown in the first position it is stepped round an hour at a time while the watch keeps running. It also drives the date.',
      facts: { Teeth: String(G.localHourWheel.teeth), Star: `${st.teeth} points`, Speed: '1 turn / 12 h', 'Jumping hour': '1-hour steps, either way', 'Pipe Ø': `${fmt(2 * h1, 2)} mm` },
      live: (s) => { const h = (((-s.rot.hourHand / TAU) * 12) % 12 + 12) % 12; return `local ${hm(h === 0 ? 12 : h)}`; },
    });
  }
  // ---------- hour jumper: spring screwed to the driver, its beak in a star gap
  {
    const { object, rotor } = assembly(C0);
    const st = G.star, jz = Z.hourJumper, aS = aGap - (100 * DEG);
    const S = [st.jumperScrewRadius * Math.cos(aS), st.jumperScrewRadius * Math.sin(aS)];
    // beak in the gap frame (u radial along aGap, v tangential): seats on both star flanks
    const ca = Math.cos(aGap), sa = Math.sin(aGap);
    const uv = (u, v) => [u * ca - v * sa, u * sa + v * ca];
    const bk = st.jumperBeakRadius;
    const beak = [uv(bk, -0.16), uv(bk, 0.16), uv(bk + 0.06, 0.29), uv(2.25, 0.42), uv(2.25, -0.42), uv(bk + 0.06, -0.29)];
    const r0 = 2.0, r1 = 2.26;
    const sdf = sUnion(0.1, sdCircle(S[0], S[1], 0.3), sdArcBand(0, 0, r0, r1, aS, aGap - 0.12), sdPolygon(beak));
    const sdfH = (x, y) => Math.max(sdf(x, y), -(Math.hypot(x - S[0], y - S[1]) - 0.11));
    const b = new Batch();
    b.add(sdfExtrude(sdfH, [-2.5, -2.5, 2.5, 2.5], [0, 0], jz[0], jz[1] - jz[0], { h: 0.01, bevel: 0.02, planarUV, tol: 0.004, segs: 1, uvAngle: aS }), mm.satPair, null, BEVEL_CREASE);
    b.add(latheZ([[0, Z.hourDriver[1] - 0.005], [0.26, Z.hourDriver[1] - 0.005], [0.26, jz[0] + 0.005], [0, jz[0] + 0.005]], 24), mm.polished, mtx(S[0], S[1], 0));
    b.add(screwGeo(0.22, 0.07, 0.06, 0.03, { countersunk: true }), mm.screw, screwMtx(S[0], S[1], jz[1] - 0.06, 40, 1));
    b.build(rotor);
    add({
      id: 'hour-jumper', name: 'Hour jumper', category: 'motion', side: 'front', exposed: false, priority: 1,
      object, rotor, drive: { key: 'hourWheel' }, anchor: [S[0] * 0.6 + Math.cos(aGap) * 0.9, S[1] * 0.6 + Math.sin(aGap) * 0.9, jz[1]],
      description: 'A steel spring screwed to the hour-wheel driver. Its beak sits between two points of the local hour wheel\'s 12-point star, coupling the local hour wheel to the driver; when the local hour is set, the star is pushed past the beak and it clicks into the next gap — exactly one hour.',
      facts: { Holds: `${st.teeth}-point star (30° = 1 h)`, Beak: `r ${fmt(bk, 2)} mm`, Turns: 'with the driver (1 turn / 12 h)' },
    });
  }

  // ===================================================================== DATE WORKS
  const V = DT.lever.pivot, F = clock(DT.lever.fingerRadius, DT.lever.fingerDeg), D0 = L.dateDriver;
  // SPEC-REQUEST dateTrain.lever.{armRad 0.35, loadFromHour 18, follower: 0.85 mm at −20° from the pivot, roller r 0.10}
  const LZ = Z.instantDateLever, CZ = Z.dateDriverCam, ARM = 0.35, EVENING = 18, RP = 0.1;
  const FP0 = [V[0] + 0.85 * Math.cos(-20 * DEG), V[1] + 0.85 * Math.sin(-20 * DEG)]; // ruby follower (rest)
  const armedAt = (h) => Math.min(1, Math.max(0, (h - EVENING) / (24 - EVENING)));
  // lever offset from its rest angle (CCW = armed): cam over the evening, snap with the disc
  function leverAngle(s) {
    const h = ((s.rot.dateDriver / TAU) * 24 + 24) % 24;
    const f = s.datePos - Math.floor(s.datePos);
    if (f > 1e-6 && f < 1 - 1e-6) { const u = Math.min(1, f / 0.55); return ARM * (1 - u * u * (3 - 2 * u)); }
    return ARM * armedAt(h);
  }
  // ---------- date driver 72 (gilt) + snail cam (steel) on a fixed stud
  {
    const { object, rotor } = assembly(D0);
    const b = new Batch();
    const wz = Z.dateDriver;
    b.add(wheelGeo(gear, { teeth: DT.driver.teeth, module: MD.date, thickness: wz[1] - wz[0], spokes: 5, rimW: 0.26, hubR: 1.05, spokeW: 0.26, phase: 0.2, bore: 0.36 , outline: coarse(DT.driver.teeth, MD.date) }), mm.giltPair, mtx(0, 0, mid(wz), phDateDriver), 38 * DEG);
    // snail: the locus of the follower in the driver's frame over one day (inset by the roller radius)
    const pts = [];
    const N = 120;
    for (let i = 0; i < N; i++) {
      const h = (24 * i) / N + (i === N - 1 ? 0.0 : 0);
      const fp = rot2(FP0, V, ARM * armedAt(h === 0 ? 0 : h));
      const q = [fp[0] - D0[0], fp[1] - D0[1]];
      const a = -(TAU * h) / 24, c = Math.cos(a), s = Math.sin(a);
      const lx = q[0] * c - q[1] * s, ly = q[0] * s + q[1] * c, r = Math.hypot(lx, ly);
      pts.push(V2(lx * (1 - (RP + 0.005) / r), ly * (1 - (RP + 0.005) / r)));
    }
    { // the last instant before midnight (fully armed) closes the snail with its step
      const fp = rot2(FP0, V, ARM);
      const q = [fp[0] - D0[0], fp[1] - D0[1]], r = Math.hypot(...q);
      pts.push(V2(q[0] * (1 - (RP + 0.005) / r), q[1] * (1 - (RP + 0.005) / r)));
    }
    pts.reverse(); // counter-clockwise
    b.add(gear.extrudeOutline(pts, [gear.circlePath(0.36, 32)], CZ[1] - CZ[0], { uvRadius: 2.5 }), mm.steelPair, mtx(0, 0, mid(CZ)), 30 * DEG);
    b.add(latheZ([[0.36, wz[1] - 0.01], [0.75, wz[1] - 0.01], [0.75, CZ[0] + 0.01], [0.36, CZ[0] + 0.01]], 40), mm.polished);
    b.build(rotor);
    const s = new Batch();
    s.add(latheZ([[0, -0.25], [0.35, -0.25], [0.35, CZ[1] + 0.005], [0, CZ[1] + 0.005]], 32), mm.polished);
    s.add(screwGeo(0.55, 0.035, 0.12, 0.02), mm.screw, screwMtx(0, 0, CZ[1] + 0.005, 75, 1));
    s.build(object);
    add({
      id: 'date-wheels', name: 'Date driver', category: 'calendar', side: 'front', exposed: false, priority: 1,
      object, rotor, drive: { key: 'dateDriver' }, anchor: [-1.6, -2.6, wz[1]],
      description: 'Driven by the LOCAL hour wheel, it turns once a day, so the date follows the jumping hour hand forwards or backwards. Its steel snail cam slowly loads the instant-date lever through the evening and lets it go at local midnight.',
      facts: { Teeth: String(DT.driver.teeth), Speed: '1 turn / day (anticlockwise)', Driven: `local hour wheel (${G.localHourWheel.teeth})`, Cam: `snail, loads from ${EVENING}:00 to midnight` },
      live: (st) => { const h = ((st.rot.dateDriver / TAU) * 24 + 24) % 24; return `${fmt(degOf(st.rot.dateDriver), 1)}° · local ${hm(h)}`; },
    });
  }
  // ---------- instant-date lever + its long curled wire spring
  {
    const { object, rotor } = assembly(V);
    const T = LZ[1] - LZ[0];
    const sdf = sUnion(0.14,
      sdCircle(V[0], V[1], 0.42),
      sdCapsule(V, F, 0.24, 0.15),
      sdCircle(F[0], F[1], 0.12),
      sdCapsule(V, FP0, 0.3, 0.26),
    );
    const sdfH = (x, y) => Math.max(sdf(x, y), -(Math.hypot(x - V[0], y - V[1]) - 0.15));
    const b = new Batch();
    const ua = Math.atan2(F[1] - V[1], F[0] - V[0]);
    b.add(sdfExtrude(sdfH, [F[0] - 0.4, F[1] - 0.6, FP0[0] + 0.5, V[1] + 0.6], V, LZ[0] + 0.005, T - 0.01, { h: 0.012, bevel: 0.03, planarUV, tol: 0.004, segs: 1, uvAngle: ua }), mm.darkPair, null, BEVEL_CREASE);
    // ruby roller under the lever, down through the calendar-plate slot onto the snail
    const rz0 = CZ[0] + 0.02;
    b.add(latheZ([[0, rz0], [RP, rz0], [RP, LZ[0] + 0.01], [0, LZ[0] + 0.01]], 24), mm.jewel, mtx(FP0[0] - V[0], FP0[1] - V[1], 0));
    b.build(rotor);
    const sb = new Batch();
    sb.add(latheZ([[0, Z.calendarPlate[1] - 0.2], [0.14, Z.calendarPlate[1] - 0.2], [0.14, LZ[1] + 0.02], [0, LZ[1] + 0.02]], 24), mm.polished);
    sb.add(screwGeo(0.3, 0.08, 0.07, 0.035), mm.screw, screwMtx(0, 0, LZ[1] - 0.01, 15, 1));
    sb.build(object);
    // ---- wire spring: anchored on a stud (eye), its free end presses the lever's underside;
    // a cubic through fixed controls whose end follows the lever (rebuilt in place, no allocation)
    const A = [-5.0, 0.55], C1 = [-7.0, -0.9], C2 = [-9.6, 0.4];
    const nrm = [-Math.sin(ua), Math.cos(ua)]; // underside normal of the finger arm (down-right)
    const E0 = [V[0] + 0.75 * (F[0] - V[0]) + 0.26 * nrm[0], V[1] + 0.75 * (F[1] - V[1]) + 0.26 * nrm[1]];
    const NP = 64, NR = 8, WR = 0.06, zW = mid(LZ);
    const wpos = new Float32Array(NP * NR * 3), wnor = new Float32Array(NP * NR * 3);
    const wgeo = new THREE.BufferGeometry();
    const wpA = new THREE.BufferAttribute(wpos, 3), wnA = new THREE.BufferAttribute(wnor, 3);
    wpA.setUsage(THREE.DynamicDrawUsage); wnA.setUsage(THREE.DynamicDrawUsage);
    wgeo.setAttribute('position', wpA); wgeo.setAttribute('normal', wnA);
    wgeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(NP * NR * 2), 2));
    const widx = [];
    for (let i = 0; i < NP - 1; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, bq = i * NR + ((j + 1) % NR), c = a + NR, d = bq + NR; widx.push(a, c, bq, bq, c, d); }
    wgeo.setIndex(widx);
    const E = [0, 0];
    function wire(alpha) {
      const p = rot2(E0, V, alpha); E[0] = p[0]; E[1] = p[1];
      for (let i = 0; i < NP; i++) {
        const t = i / (NP - 1), u = 1 - t;
        const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
        const x = b0 * A[0] + b1 * C1[0] + b2 * C2[0] + b3 * E[0] - object.position.x, y = b0 * A[1] + b1 * C1[1] + b2 * C2[1] + b3 * E[1] - object.position.y;
        const d0 = 3 * u * u, d1 = 6 * u * t, d2 = 3 * t * t;
        let tx = d0 * (C1[0] - A[0]) + d1 * (C2[0] - C1[0]) + d2 * (E[0] - C2[0]), ty = d0 * (C1[1] - A[1]) + d1 * (C2[1] - C1[1]) + d2 * (E[1] - C2[1]);
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        for (let j = 0; j < NR; j++) {
          const ph = (j / NR) * TAU, co = Math.cos(ph), si = Math.sin(ph);
          const nx = -ty * co, ny = tx * co, nz = si, k = 3 * (i * NR + j);
          wpos[k] = x + WR * nx; wpos[k + 1] = y + WR * ny; wpos[k + 2] = zW + WR * nz;
          wnor[k] = nx; wnor[k + 1] = ny; wnor[k + 2] = nz;
        }
      }
      wpA.needsUpdate = true; wnA.needsUpdate = true;
      wgeo.computeBoundingSphere();
    }
    wire(0);
    const wmesh = new THREE.Mesh(wgeo, mm.spring);
    wmesh.castShadow = true; wmesh.receiveShadow = true;
    object.add(wmesh);
    const eb = new Batch();
    const eye = new THREE.TorusGeometry(0.2, WR, 8, 28);
    eb.add(eye, mm.spring, mtx(A[0] - V[0], A[1] - V[1], zW));
    eb.add(latheZ([[0, Z.calendarPlate[1] - 0.1], [0.13, Z.calendarPlate[1] - 0.1], [0.13, LZ[1] - 0.02], [0.2, LZ[1] - 0.02], [0.2, LZ[1] + 0.02], [0, LZ[1] + 0.02]], 20), mm.polished, mtx(A[0] - V[0], A[1] - V[1], 0));
    eb.build(object);
    let alpha = 0, lastA = 0;
    add({
      id: 'instant-date-lever', name: 'Instant-date lever', category: 'calendar', side: 'front', exposed: false, priority: 1,
      object, rotor, anchor: [(F[0] - V[0]) * 0.55, (F[1] - V[1]) * 0.55, LZ[1]],
      description: 'A lever whose ruby roller rides on the date driver\'s snail cam. Through the evening the cam swings it back, tensioning its long curled wire spring; at local midnight the roller drops off the snail\'s step and the lever snaps forward, kicking the date disc on by one tooth in an instant.',
      facts: { Pivot: 'on the calendar plate', Spring: 'long curled steel wire', Loads: `${EVENING}:00 → 24:00`, Releases: 'at local midnight' },
      live: () => (alpha > 1e-3 ? `armed ${fmt((alpha / ARM) * 100, 0)} %` : 'released · waiting for the evening'),
      update: (s) => {
        alpha = leverAngle(s);
        rotor.rotation.z = alpha;
        if (Math.abs(alpha - lastA) > 2e-4) { wire(alpha); lastA = alpha; }
      },
    });
  }
  // ---------- date jumper: screwed spring jumper, its beak in a gap of the disc's 31 V-teeth
  {
    const JF = [-4.1, 7.1]; // SPEC-REQUEST date.disc.jumperPivot: foot screw (inside the disc, clear of the 339° guard)
    const JZ = Z.dateJumper, T = JZ[1] - JZ[0];
    const aJ = mathOfClock(DD.jumperDeg), cj = Math.cos(aJ), sj = Math.sin(aJ);
    const uv = (u, v) => [u * cj - v * sj, u * sj + v * cj];
    const beak = [uv(9.62, -0.15), uv(9.62, 0.15), uv(9.25, 0.8), uv(8.75, 0.75), uv(8.75, -0.75), uv(9.25, -0.8)];
    const base = uv(8.85, 0);
    const sdf = sUnion(0.16, sdCircle(JF[0], JF[1], 0.45), sdCapsule(JF, base, 0.3, 0.26), sdPolygon(beak));
    const sdfH = (x, y) => Math.max(sdf(x, y), -(Math.hypot(x - JF[0], y - JF[1]) - 0.15));
    const { object, rotor } = assembly(JF);
    const b = new Batch();
    b.add(sdfExtrude(sdfH, [-10.1, 3.2, -3.2, 7.95], JF, JZ[0] + 0.005, T - 0.01, { h: 0.012, bevel: 0.03, planarUV, tol: 0.004, segs: 1, uvAngle: Math.atan2(base[1] - JF[1], base[0] - JF[0]) }), mm.darkPair, null, BEVEL_CREASE);
    b.build(rotor);
    const sb = new Batch();
    sb.add(latheZ([[0, Z.calendarPlate[1] - 0.2], [0.18, Z.calendarPlate[1] - 0.2], [0.18, JZ[0] + 0.005], [0, JZ[0] + 0.005]], 24), mm.polished);
    sb.add(screwGeo(0.32, 0.08, 0.07, 0.035), mm.screw, screwMtx(0, 0, JZ[1] - 0.01, 105, 1));
    sb.build(object);
    // contact table against the disc's internal V-teeth (tip r toothTip at the tooth centre,
    // straight flanks to the root r at the gap centre — SPEC.date.disc, shared with the disc)
    const step = (TAU / DD.teeth), t0 = DD.toothDeg0 * DEG;
    const profile = (thClock) => { let u = (thClock - t0) / step; u -= Math.round(u); return DD.toothTipRadius + (DD.toothRootRadius - DD.toothTipRadius) * Math.min(1, Math.abs(u) * 2); };
    const nose = densify(beak, 0.006);
    const jumpAt = contactLUT({
      N: 64, pitch: step, pivot: JF, nose, sign: 1, maxA: 0.3,
      inside: (x, y, ph) => { const r = Math.hypot(x, y); if (r > DD.rOuter) return false; const thc = Math.atan2(x, y) - ph; return r > profile(thc) - 0.004; },
    });
    let lift = 0;
    add({
      id: 'date-jumper', name: 'Date jumper', category: 'calendar', side: 'front', exposed: false, priority: 2,
      object, rotor, anchor: [(base[0] - JF[0]) * 0.6, (base[1] - JF[1]) * 0.6, JZ[1]],
      description: 'A screwed steel spring whose beak sits between two of the date disc\'s 31 internal teeth, so the date always stands square in the window. At midnight the disc\'s tooth lifts it, and it then pulls the disc home into the next position.',
      facts: { Holds: `date disc (${DD.teeth} internal teeth)`, Beak: `${fmt(DD.jumperDeg, 0)}° (≈10 o'clock)` },
      live: (s) => (lift > 1e-4 ? 'riding over a tooth' : `holding the ${s.day}${[, 'st', 'nd', 'rd'][s.day % 10 > 3 || Math.floor(s.day / 10) === 1 ? 0 : s.day % 10] || 'th'}`),
      update: (s) => {
        const f = s.datePos - Math.floor(s.datePos);
        lift = jumpAt(f);
        rotor.rotation.z = lift;
      },
    });
  }
  // ---------- calendar plate (full diameter, raised rim = dial seat) on three pillars
  {
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const pz = Z.calendarPlate, R = spec.frame.plateRadius - 0.05;
    const rimIn = spec.dial.feet.r + spec.dial.feet.radius + 0.12; // dial seat outside the dial feet (disc edge + 0.6)
    const holes = [gear.circlePath(PI.hour[1] + 0.1, 48)];
    const feet = spec.dial.feet.anglesDeg.map((a) => clock(spec.dial.feet.r, a));
    for (const f of feet) holes.push(gear.circlePath(spec.dial.feet.radius + 0.05, 24, f[0], f[1]));
    // slot for the lever's ruby roller (arc round the lever pivot)
    const slot = [];
    { const r = 0.85, w = 0.17, a0 = -27 * DEG, a1 = (-20 * DEG) + ARM + 7 * DEG, n = 16;
      for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; slot.push(V2(V[0] + (r + w) * Math.cos(a), V[1] + (r + w) * Math.sin(a))); }
      for (let k = 0; k <= 6; k++) { const a = a1 + (Math.PI * k) / 6; slot.push(V2(V[0] + r * Math.cos(a1) + w * Math.cos(a), V[1] + r * Math.sin(a1) + w * Math.sin(a))); }
      for (let k = n; k >= 0; k--) { const a = a0 + ((a1 - a0) * k) / n; slot.push(V2(V[0] + (r - w) * Math.cos(a), V[1] + (r - w) * Math.sin(a))); }
      for (let k = 0; k <= 6; k++) { const a = a0 + Math.PI + (Math.PI * k) / 6; slot.push(V2(V[0] + r * Math.cos(a0) + w * Math.cos(a), V[1] + r * Math.sin(a0) + w * Math.sin(a))); }
    }
    holes.push(new THREE.Path(slot.reverse()));
    // windows: an arc over the minute wheel, a round one over the GMT idler
    { const w = [], r0 = 3.55, r1 = 4.55, c0 = mathOfClock(140), c1 = mathOfClock(102), n = 20;
      for (let k = 0; k <= n; k++) { const a = c0 + ((c1 - c0) * k) / n; w.push(V2(r1 * Math.cos(a), r1 * Math.sin(a))); }
      for (let k = 0; k <= 8; k++) { const a = c1 + (Math.PI * k) / 8; const m = (r0 + r1) / 2; w.push(V2(m * Math.cos(c1) + ((r1 - r0) / 2) * Math.cos(a), m * Math.sin(c1) + ((r1 - r0) / 2) * Math.sin(a))); }
      for (let k = n; k >= 0; k--) { const a = c0 + ((c1 - c0) * k) / n; w.push(V2(r0 * Math.cos(a), r0 * Math.sin(a))); }
      for (let k = 0; k <= 8; k++) { const a = c0 + Math.PI + (Math.PI * k) / 8; const m = (r0 + r1) / 2; w.push(V2(m * Math.cos(c0) + ((r1 - r0) / 2) * Math.cos(a), m * Math.sin(c0) + ((r1 - r0) / 2) * Math.sin(a))); }
      holes.push(new THREE.Path(w.reverse()));
    }
    holes.push(gear.circlePath(0.95, 32, L.gmtIdler[0], L.gmtIdler[1]));
    const disc = [];
    for (let i = 0; i < 192; i++) disc.push(V2(R * Math.cos((i / 192) * TAU), R * Math.sin((i / 192) * TAU)));
    b.add(gear.extrudeOutline(disc, holes, pz[1] - pz[0], { uvRadius: R }), mm.platePair, mtx(0, 0, mid(pz)), 30 * DEG);
    // raised rim the dial rests on (z.dialSeat)
    const rimH = [gear.circlePath(rimIn, 192)];
    b.add(gear.extrudeOutline(disc, rimH, Z.dialSeat - pz[1] + 0.01, { uvRadius: R }), mm.platePair, mtx(0, 0, (pz[1] - 0.01 + Z.dialSeat) / 2), 30 * DEG);
    // pillars down to the main plate (outside every wheel)
    for (const a of [30, 150, 270]) { const p = clock(14.6, a); b.add(latheZ([[0, 0.0], [0.38, 0.0], [0.38, pz[0] + 0.01], [0, pz[0] + 0.01]], 24), mm.plateEdge, mtx(p[0], p[1], 0)); }
    // two flush screws
    for (const [a, sl] of [[32, 20], [168, 70]]) { const p = clock(7.0, a); b.add(screwGeo(0.4, 0.1, 0.08, 0.04, { countersunk: true }), mm.screw, screwMtx(p[0], p[1], pz[1] - 0.09, sl, 1)); }
    b.build(object);
    add({
      id: 'calendar-plate', name: 'Calendar plate', category: 'calendar', side: 'front', exposed: false, priority: 2, xray: true,
      object, anchor: [-2.0, -10.6, pz[1]],
      description: 'The full-diameter plate over the dial-side works. The date disc turns on it, the jumper, the instant-date lever and the disc guards are mounted on it, and its raised rim is the seat the dial rests on.',
      facts: { 'Ø': `${fmt(2 * R, 1)} mm`, Thickness: `${fmt(pz[1] - pz[0], 2)} mm`, 'Dial seat': 'raised outer rim', Finish: 'sand-blasted grey' },
    });
  }
  // ---------- three keyhole guards over the disc's inner edge
  {
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const gz = Z.dateGuards, T = gz[1] - gz[0];
    for (const [deg, reach] of [[339, 9.95], [105, 9.7], [215, 9.95]]) {
      const P0 = clock(7.95, deg), P1 = clock(reach - 0.35, deg);
      const a = mathOfClock(deg), ca = Math.cos(a), sa = Math.sin(a);
      const tab = [[P1[0] - 0.55 * sa - 0.0 * ca, P1[1] + 0.55 * ca], [P1[0] + 0.55 * sa, P1[1] - 0.55 * ca], [P1[0] + 0.55 * sa + 0.35 * ca, P1[1] - 0.55 * ca + 0.35 * sa], [P1[0] - 0.55 * sa + 0.35 * ca, P1[1] + 0.55 * ca + 0.35 * sa]];
      const sdf = sUnion(0.12, sdCircle(P0[0], P0[1], 0.46), sdCapsule(P0, P1, 0.28), (x, y) => sdPolygon(tab)(x, y) - 0.08);
      const sdfH = (x, y) => Math.max(sdf(x, y), -(Math.hypot(x - P0[0], y - P0[1]) - 0.16));
      const bx = [Math.min(P0[0], P1[0]) - 1.2, Math.min(P0[1], P1[1]) - 1.2, Math.max(P0[0], P1[0]) + 1.2, Math.max(P0[1], P1[1]) + 1.2];
      b.add(sdfExtrude(sdfH, bx, [0, 0], gz[0], T, { h: 0.012, bevel: 0.02, planarUV, tol: 0.004, segs: 1, uvAngle: a }), mm.satPair, null, BEVEL_CREASE);
      b.add(latheZ([[0.16, Z.calendarPlate[1] - 0.005], [0.4, Z.calendarPlate[1] - 0.005], [0.4, gz[0] + 0.005], [0.16, gz[0] + 0.005]], 24), mm.polished, mtx(P0[0], P0[1], 0));
      b.add(screwGeo(0.3, 0.09, 0.07, 0.035, { countersunk: true }), mm.screw, screwMtx(P0[0], P0[1], gz[1] - 0.075, deg + 30, 1));
    }
    b.build(object);
    add({
      id: 'date-disc-guards', name: 'Date-disc guards', category: 'calendar', side: 'front', exposed: false, priority: 3,
      object, anchor: [...clock(9.0, 339), gz[1]],
      description: 'Three small keyhole-shaped steel plates screwed to the calendar plate. Their tongues lie over the inner edge of the date disc and keep it flat while it turns.',
      facts: { Count: '3', Positions: '11, 3 and 7 o\'clock (inside the disc)', Finish: 'satin steel' },
    });
  }

  // ===================================================================== KEYLESS / SETTING WORKS
  const SY = KW.stemY, SZ = Z.stemAxis;
  const crownPerRatchet = -KW.ratchet.teeth / KW.crownWheel.teeth;
  const pinionPerRatchet = crownPerRatchet * (KW.crownWheel.teeth / KW.windingPinion.teeth); // = rot.stem / rot.crownWheel
  const xs = { pilot: KW.stemInnerX, sq0: KW.slidingPinionX[0] - 0.05, sq1: KW.slidingPinionX[1] + 0.05, wp: KW.windingPinionX, groove: [9.85, 10.25], tube: 15.9, thread: 19.6, end: spec.case.crown.stemEnd };
  // ---------- winding stem
  {
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    const prof = [[0, xs.pilot], [0.16, xs.pilot], [0.2, xs.pilot + 0.05], [0.2, 4.35], [0.3, 4.42], [0.3, xs.sq0], [0, xs.sq0]];
    b.add(latheX(prof, 24), mm.polished);
    b.add(new THREE.BoxGeometry(xs.sq1 - xs.sq0, 0.6, 0.6), mm.polished, mtx((xs.sq0 + xs.sq1) / 2, 0, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 4)));
    const p2 = [[0, xs.sq1], [0.33, xs.sq1], [0.33, xs.wp[1] + 0.05], [0.45, xs.wp[1] + 0.12], [0.45, xs.groove[0]], [0.3, xs.groove[0] + 0.08], [0.3, xs.groove[1] - 0.08], [0.45, xs.groove[1]],
      [0.45, xs.thread - 0.1], [0.36, xs.thread]];
    for (let x = xs.thread + 0.06, k = 0; x < xs.end - 0.08; x += 0.08, k++) p2.push([k % 2 ? 0.36 : 0.3, x]);
    p2.push([0.28, xs.end - 0.03], [0, xs.end]);
    b.add(latheX(p2, 24), mm.polished);
    b.build(rotor);
    add({
      id: 'winding-stem', name: 'Winding stem', category: 'keyless', side: 'both', exposed: false, priority: 2,
      object, rotor, anchor: [12.5, 0, 0.45],
      description: 'The steel shaft from the screw-down crown into the movement. Its square turns the sliding pinion; the setting-lever pin in its groove holds it in the winding, hour-setting or time-setting position.',
      facts: { 'Ø': '0.90 mm', Positions: 'screwed down · winding · local hour · time (hacking)', Drives: 'sliding pinion via a square' },
      live: (s) => `${fmt(degOf(s.rot.stem), 0)}°`,
      update: (s) => { rotor.rotation.x = s.rot.stem; },
    });
  }
  // ---------- sliding pinion (contrate teeth inward, Breguet teeth outward)
  {
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    const [x0, x1] = KW.slidingPinionX, g0 = 6.35, g1 = 6.65;
    b.add(latheX([[0.43, x0 + 0.12], [0.85, x0 + 0.12], [0.85, g0], [0.6, g0 + 0.04], [0.6, g1 - 0.04], [0.85, g1], [0.85, x1 - 0.14], [0.43, x1 - 0.14], [0.43, x0 + 0.12]], 32), mm.polished);
    b.add(faceTeethGeo({ teeth: KW.slidingPinion.teeth, rIn: 0.45, rOut: 0.84, H: 0.12, mode: 'tri' }), mm.pinion, onX(x0 + 0.12, 0, 0, 0, ANX));
    b.add(faceTeethGeo({ teeth: 9, rIn: 0.45, rOut: 0.84, H: 0.14, mode: 'saw' }), mm.pinion, onX(x1 - 0.14, 0, 0, 0, AX));
    b.build(rotor);
    add({
      id: 'sliding-pinion', name: 'Sliding pinion', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [6.5, 0, 0.85],
      description: 'Slides on the square of the stem. Pushed against the winding pinion its ratchet teeth wind the watch; shifted inwards by the yoke, its inner teeth turn the setting wheels to set the hands.',
      facts: { 'Outer teeth': 'Breguet (ratchet) teeth', 'Inner teeth': `${KW.slidingPinion.teeth} contrate teeth`, Turns: 'with the stem' },
      update: (s) => { rotor.rotation.x = s.rot.stem; },
    });
  }
  // ---------- winding pinion (16, turns freely on the stem)
  {
    const { object, rotor } = assembly([0, SY], SZ);
    const b = new Batch();
    const [x0, x1] = KW.windingPinionX, tx0 = x0 + 0.62;
    b.add(gear.extrudeOutline(gear.toothedOutline({ teeth: KW.windingPinion.teeth, module: 0.095 }), [gear.circlePath(0.34, 24)], x1 - tx0), mm.pinPair, onX((tx0 + x1) / 2), 35 * DEG);
    b.add(latheX([[0.34, x0], [0.84, x0], [0.84, tx0 - 0.04], [0.7, tx0 + 0.01], [0.34, tx0 + 0.01], [0.34, x0]], 32), mm.polished);
    b.add(faceTeethGeo({ teeth: 9, rIn: 0.45, rOut: 0.84, H: 0.14, mode: 'saw' }), mm.pinion, onX(x0, 0, 0, 0, ANX));
    b.build(rotor);
    let ang0 = 0;
    add({
      id: 'winding-pinion', name: 'Winding pinion', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, anchor: [(x0 + x1) / 2, 0, 0.95],
      description: 'Turns freely on the stem, driven through its ratchet teeth by the sliding pinion when the crown winds. Its 16 teeth drive the winding intermediate and crown wheel; when the rotor winds, it turns backwards and simply slips over the sliding pinion\'s teeth.',
      facts: { Teeth: String(KW.windingPinion.teeth), Drives: `winding intermediate (${KW.windingIntermediate.teeth}) → crown wheel (${KW.crownWheel.teeth})`, Coupling: 'Breguet teeth (one-way)' },
      update: (s) => { ang0 = pinionPerRatchet * s.rot.ratchet; rotor.rotation.x = ang0; },
    });
  }
  // ---------- setting wheel (15, in mesh with the minute wheel) + the position-C pair (schematic)
  // SPEC-REQUEST: tooth counts and level of the crown position-C pair (hourSettingWheel,
  // settingIntermediate) are not in SPEC; local: 16 teeth each, module motionA, z = z.settingWheel.
  const C_PAIR_TEETH = 16;
  {
    const { object, rotor } = assembly(L.settingWheel);
    const b = new Batch();
    const sz = Z.settingWheel;
    b.add(wheelGeo(gear, { teeth: KW.settingWheel.teeth, module: MD.motionA, thickness: sz[1] - sz[0], bore: 0.17 , outline: coarse(KW.settingWheel.teeth, MD.motionA) }), mm.steelPair, mtx(0, 0, mid(sz), phSettingWheel), 35 * DEG);
    b.build(rotor);
    const s = new Batch();
    const stud = [[0, Z.motionRecess - 0.15], [0.16, Z.motionRecess - 0.15], [0.16, sz[1] + 0.005], [0.27, sz[1] + 0.005], [0.27, sz[1] + 0.05], [0, sz[1] + 0.05]];
    s.add(latheZ(stud, 24), mm.polished);
    for (const p of [L.hourSettingWheel, L.settingIntermediate]) {
      s.add(wheelGeo(gear, { teeth: C_PAIR_TEETH, module: MD.motionA, thickness: sz[1] - sz[0], bore: 0.17 , outline: coarse(C_PAIR_TEETH, MD.motionA) }), mm.steelPair, mtx(p[0] - L.settingWheel[0], p[1] - L.settingWheel[1], mid(sz)), 35 * DEG);
      s.add(latheZ(stud, 24), mm.polished, mtx(p[0] - L.settingWheel[0], p[1] - L.settingWheel[1], 0));
    }
    s.build(object);
    add({
      id: 'setting-wheel', name: 'Setting wheels', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, rotor, drive: { key: 'minuteWheel', sign: -TR.minuteWheel.teeth / KW.settingWheel.teeth }, anchor: [0.9, 0.6, sz[1]],
      description: 'The setting wheel is always in mesh with the minute wheel: with the crown in the time-setting position the sliding pinion turns it and so the hands. The two small wheels beside it form the hour-setting train that steps the local hour wheel in the first crown position.',
      facts: { Teeth: `${KW.settingWheel.teeth} (+ 2 × ${C_PAIR_TEETH}, hour setting)`, Meshes: `minute wheel (${TR.minuteWheel.teeth})`, Speed: '1 turn / 75 min while running' },
    });
  }
  // ---------- setting lever, yoke and their springs (dial-side recess, z.keylessLevers)
  const KZ = Z.keylessLevers, KT = KZ[1] - KZ[0];
  // SPEC-REQUEST keyless.levers: setting-lever pivot S / pin Q (stem groove x 9.85–10.25) / beak Bk / tail TL, yoke pivot Yp /
  // fork Fk (sliding-pinion groove x 6.35–6.65) / tail Ty — schematic, chosen clear of the setting wheels and pinions
  const S = [11.3, 2.3], Q = [10.05, SY], Bk = [9.6, -1.35], TL = [12.45, 3.35];
  const Yp = [12.1, -1.75], Fk = [6.5, -1.05], Ty = [12.95, -3.2];
  {
    const sdf = sUnion(0.2, sdCircle(S[0], S[1], 0.5), sdCapsule(S, Q, 0.32, 0.26), sdCapsule(Q, Bk, 0.24, 0.2), sdCapsule(S, TL, 0.28, 0.2), sdCircle(Q[0], Q[1], 0.3));
    const sdfH = (x, y) => Math.max(sdf(x, y), -(Math.hypot(x - S[0], y - S[1]) - 0.15));
    const object = new THREE.Group(); object.position.set(S[0], S[1], 0); root.add(object);
    const b = new Batch();
    b.add(sdfExtrude(sdfH, [8.9, -2.0, 13.1, 3.9], S, KZ[0], KT, { h: 0.015, bevel: 0.03, planarUV, tol: 0.004, segs: 1, uvAngle: ang(S, Q) }), mm.satPair, null, BEVEL_CREASE);
    b.add(latheZ([[0, SZ + 0.32], [0.09, SZ + 0.32], [0.12, SZ + 0.36], [0.12, KZ[0] + 0.01], [0, KZ[0] + 0.01]], 20), mm.polished, mtx(Q[0] - S[0], Q[1] - S[1], 0));
    b.add(screwGeo(0.36, 0.1, 0.08, 0.04), mm.screw, screwMtx(0, 0, KZ[1] - 0.01, 35, 1));
    b.build(object);
    add({
      id: 'setting-lever', name: 'Setting lever', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [(Q[0] - S[0]) * 0.5, (Q[1] - S[1]) * 0.5, KZ[1]],
      description: 'A pivoting lever whose pin rides in the groove of the winding stem. Pulling the crown swings it, and its beak moves the yoke, switching the keyless works between winding, hour-setting and time-setting (which also stops the balance).',
      facts: { Pivot: 'setting-lever screw', Positions: '3 (held by the jumper spring)' },
    });
  }
  {
    const sdf = sUnion(0.2, sdCircle(Yp[0], Yp[1], 0.48), sdCapsule(Yp, Fk, 0.3, 0.22), sdCapsule(Yp, Ty, 0.25, 0.2), sdCapsule([Fk[0], Fk[1]], [Fk[0], SY + 0.9], 0.09, 0.09));
    const sdfH = (x, y) => Math.max(sdf(x, y), -(Math.hypot(x - Yp[0], y - Yp[1]) - 0.15));
    const object = new THREE.Group(); object.position.set(Yp[0], Yp[1], 0); root.add(object);
    const b = new Batch();
    b.add(sdfExtrude(sdfH, [6.0, -3.8, 13.6, 1.2], Yp, KZ[0] + 0.02, KT - 0.02, { h: 0.015, bevel: 0.03, planarUV, tol: 0.004, segs: 1, uvAngle: ang(Yp, Fk) }), mm.satPair, null, BEVEL_CREASE);
    for (const dy of [-0.68, 0.68]) b.add(new THREE.BoxGeometry(0.13, 0.14, KZ[0] + 0.03 - (SZ + 0.05)), mm.polished, mtx(Fk[0] - Yp[0], SY + dy - Yp[1], (KZ[0] + 0.03 + SZ + 0.05) / 2));
    b.add(screwGeo(0.34, 0.1, 0.08, 0.04), mm.screw, screwMtx(0, 0, KZ[1] - 0.01, 120, 1));
    b.build(object);
    add({
      id: 'yoke', name: 'Yoke', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [(Fk[0] - Yp[0]) * 0.5, (Fk[1] - Yp[1]) * 0.5, KZ[1]],
      description: 'A forked lever whose fingers sit in the groove of the sliding pinion. Moved by the setting lever, it shifts the sliding pinion between the winding pinion and the setting wheels.',
      facts: { Pivot: 'yoke screw', Spring: 'yoke spring' },
    });
  }
  {
    // yoke spring (on the yoke's tail) + setting-lever jumper spring (on the lever's tail)
    const f1 = [11.4, -4.75], tn = [Ty[0] - 0.05, Ty[1] - 0.3], f2 = [13.0, 4.85], ln = [TL[0] - 0.1, TL[1] + 0.32];
    const s1 = sUnion(0.14, sdBlade(f1, [12.9, -4.6], tn, 0.15, 0.1), sdCircle(f1[0], f1[1], 0.38), sdCircle(tn[0], tn[1], 0.13));
    const s2 = sUnion(0.14, sdBlade(f2, [11.9, 4.4], ln, 0.15, 0.1), sdCircle(f2[0], f2[1], 0.38), sdCircle(ln[0], ln[1], 0.13));
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const zs = [KZ[0], KZ[0] + 0.12];
    b.add(sdfExtrude((x, y) => Math.max(s1(x, y), -(Math.hypot(x - f1[0], y - f1[1]) - 0.14)), [10.6, -5.5, 13.6, -2.6], [0, 0], zs[0], zs[1] - zs[0], { h: 0.015, bevel: 0.025, planarUV, tol: 0.004, segs: 1, uvAngle: 1.3 }), mm.satPair, null, BEVEL_CREASE);
    b.add(sdfExtrude((x, y) => Math.max(s2(x, y), -(Math.hypot(x - f2[0], y - f2[1]) - 0.14)), [11.3, 3.2, 13.8, 5.6], [0, 0], zs[0], zs[1] - zs[0], { h: 0.015, bevel: 0.025, planarUV, tol: 0.004, segs: 1, uvAngle: 0.3 }), mm.satPair, null, BEVEL_CREASE);
    b.add(screwGeo(0.32, 0.1, 0.08, 0.04), mm.screw, screwMtx(f1[0], f1[1], zs[1] - 0.005, 60, 1));
    b.add(screwGeo(0.32, 0.1, 0.08, 0.04), mm.screw, screwMtx(f2[0], f2[1], zs[1] - 0.005, 10, 1));
    b.build(object);
    add({
      id: 'keyless-springs', name: 'Keyless springs', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [tn[0] - 0.2, tn[1] - 0.6, zs[1]],
      description: 'Two flat steel springs: the yoke spring keeps the sliding pinion pressed against the winding pinion, and the setting-lever jumper holds the lever — and so the crown — firmly in each position.',
      facts: { Parts: 'yoke spring, setting-lever jumper', Material: 'hardened spring steel' },
    });
  }
  // ---------- stop-seconds (hacking) lever: its finger reaches the balance rim through the plate
  {
    const EB = spec.escapement.balance, bal = L.balance;
    const rF = EB.radius + EB.inertiaScrews.protrusion + 0.18; // at rest, clear of the inertia screws
    const Hf = [bal[0] + rF * Math.cos(45 * DEG), bal[1] + rF * Math.sin(45 * DEG)];
    const Hp = [4.6, -7.4], Ht = [3.65, -6.35]; // SPEC-REQUEST keyless.stopLever pivot / tail (finger from SPEC: balance r + screws + 0.18 at 45°)
    const sdf = sUnion(0.18, sdCircle(Hp[0], Hp[1], 0.42), sdCapsule(Hp, Hf, 0.24, 0.2), sdCapsule(Hp, Ht, 0.22, 0.17), sdCircle(Hf[0], Hf[1], 0.22));
    const sdfH = (x, y) => Math.max(sdf(x, y), -(Math.hypot(x - Hp[0], y - Hp[1]) - 0.14));
    const object = new THREE.Group(); object.position.set(Hp[0], Hp[1], 0); root.add(object);
    const b = new Batch();
    b.add(sdfExtrude(sdfH, [3.0, -8.2, 6.8, -4.9], Hp, KZ[0], KT, { h: 0.015, bevel: 0.03, planarUV, tol: 0.004, segs: 1, uvAngle: ang(Hp, Hf) }), mm.satPair, null, BEVEL_CREASE);
    const fz = Z.balanceRim[1] - 0.15;
    b.add(latheZ([[0, fz], [0.09, fz], [0.12, fz + 0.04], [0.12, KZ[0] + 0.01], [0, KZ[0] + 0.01]], 20), mm.polished, mtx(Hf[0] - Hp[0], Hf[1] - Hp[1], 0));
    b.add(screwGeo(0.34, 0.1, 0.08, 0.04), mm.screw, screwMtx(0, 0, KZ[1] - 0.01, 80, 1));
    b.build(object);
    add({
      id: 'stop-seconds-lever', name: 'Stop-seconds lever', category: 'keyless', side: 'front', exposed: false, priority: 3,
      object, anchor: [(Hf[0] - Hp[0]) * 0.5, (Hf[1] - Hp[1]) * 0.5, KZ[1]],
      description: 'The hacking lever. Its finger reaches through the main plate to the rim of the balance; when the crown is pulled to the time-setting position it touches the rim and stops the balance, so the seconds hand can be set exactly. At rest it stands clear.',
      facts: { Acts: 'on the balance rim (crown position D)', 'At rest': `${fmt(rF - EB.radius - EB.inertiaScrews.protrusion, 2)} mm clear of the inertia screws` },
    });
  }
}
