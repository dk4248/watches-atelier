// Validation of src/watches/gs-sbga211/spec.js — run:  node research/gs-sbga211/check.mjs
//  A  meshing pairs: centre distance vs m·(z1 + z2)/2
//  B  kinematics (src/core/kinematics.js): periods, senses, hands, derived rotations
//  C  assembled stack: parts whose outlines overlap in plan never share a z range
//  D  explode animation (registry easing + SPEC.explodeDelay): nothing passes through anything
//  E  odds and ends: heights, clearances, power-reserve and date conventions
// Exit code 1 on any failure. Footprints below are built from SPEC values only.
import { SPEC } from '../../src/watches/gs-sbga211/spec.js';
import { createKinematics } from '../../src/core/kinematics.js';

const DEG = Math.PI / 180, TAU = Math.PI * 2;
const L = SPEC.layout, Z = SPEC.z, R = SPEC.radii, F = SPEC.frame;
let fails = 0, warns = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log(`  FAIL ${msg}`); } return cond; };
const warn = (msg) => { warns++; console.log(`  warn ${msg}`); };
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const f3 = (v) => (Math.abs(v) < 5e-4 ? '0.000' : v.toFixed(3));

// =============================================================================== A meshes
console.log('\nA  meshing pairs  (d = centre distance, m(z1+z2)/2 = pitch-circle sum)');
for (const [a, b, za, zb, mk] of SPEC.meshes) {
  const d = hyp(L[a], L[b]);
  const m = SPEC.modules[mk];
  const need = (m * (za + zb)) / 2;
  const line = `${(a + '↔' + b).padEnd(42)} z ${String(za).padStart(3)}/${String(zb).padEnd(3)} m ${m.toFixed(4)}  d ${d.toFixed(4)}  m(z1+z2)/2 ${need.toFixed(4)}  Δ ${(d - need).toExponential(1)}`;
  console.log('  ' + line);
  ok(Math.abs(d - need) < 1e-6, `mesh ${a}↔${b} off by ${(d - need).toFixed(5)} mm`);
  ok(m > 0.04 && m < 0.2, `module ${mk} = ${m} outside 0.04…0.2`);
}

// =============================================================================== B kinematics
console.log('\nB  kinematics');
const kin = createKinematics(SPEC);
const s = kin.update();
const Bh = s.B;
ok(Bh === 8 && !s.lever && s.springDrive, 'Spring Drive timing: B = 8, no lever escapement');
const expectPeriod = {
  center: 3600, third: 600, fourth: 60, fifth: 7.5, sixth: 1, glide: 0.125, barrel: (3600 * 146) / 14,
  cannon: 3600, minuteWheel: 10800, hourWheel: 43200, dateDriver: 86400,
  settingIntermediate: (10800 * 30) / 42, settingWheel: (10800 * 19) / 42,
};
const expectDir = { center: -1, third: 1, fourth: -1, fifth: 1, sixth: -1, glide: 1, barrel: 1, cannon: -1, minuteWheel: 1, hourWheel: -1, dateDriver: 1, settingIntermediate: -1, settingWheel: 1 };
for (const [k, T] of Object.entries(expectPeriod)) {
  const per = kin.bpr[k] / Bh;
  const human = per >= 3600 ? `${(per / 3600).toFixed(3)} h` : per >= 60 ? `${(per / 60).toFixed(3)} min` : `${per} s`;
  console.log(`  ${k.padEnd(20)} period ${String(+per.toFixed(6)).padStart(12)} s (${human.padStart(11)})  dir ${kin.dir[k] > 0 ? '+1 CCW' : '−1 CW '}`);
  ok(Math.abs(per - T) < 1e-9 * T, `${k} period ${per} ≠ ${T}`);
  ok(kin.dir[k] === expectDir[k], `${k} sense ${kin.dir[k]} ≠ ${expectDir[k]}`);
}
console.log(`  glide wheel: ${1 / (kin.bpr.glide / Bh)} rev/s; centre → glide ratio ${kin.bpr.center / kin.bpr.glide}`);
ok(kin.bpr.center / kin.bpr.glide === 28800, 'centre → glide must be 28,800 (OFFICIAL "28,800 per hour")');
// hands: smooth, consistent with their wheels
const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-6;
for (let i = 0; i < 4; i++) {
  kin.setTimeScale(1000); // jump time forward between samples
  const st = kin.update();
  ok(near(st.rot.secondHand, st.rot.fourth), 'seconds hand = 4th wheel');
  ok(near(st.rot.minuteHand, st.rot.cannon) && near(st.rot.minuteHand, st.rot.center), 'minute hand = cannon pinion = centre wheel');
  ok(near(st.rot.hourHand, st.rot.hourWheel), 'hour hand = hour wheel');
  ok(near(st.rot.secondHand, -TAU * ((st.P / Bh / 60) % 1)), 'seconds hand glides (−2π·t/60)');
}
kin.goLive();
// kinematic meshes: per_B / per_A = zB / zA and opposite senses
const KEY = { barrel: 'barrel', center: 'center', third: 'third', fourth: 'fourth', fifth: 'fifth', sixth: 'sixth', glide: 'glide', cannon: 'cannon', minuteWheel: 'minuteWheel', hourWheel: 'hourWheel', dateDriver: 'dateDriver', settingIntermediate: 'settingIntermediate', settingWheel: 'settingWheel' };
for (const [, , za, zb, , ra, rb] of SPEC.meshes) {
  if (!KEY[ra] || !KEY[rb]) continue;
  const pa = kin.bpr[ra], pb = kin.bpr[rb];
  ok(Math.abs(pb / pa - zb / za) < 1e-12, `mesh ${ra}/${rb}: period ratio ${pb / pa} ≠ ${zb}/${za}`);
  ok(kin.dir[ra] === -kin.dir[rb], `mesh ${ra}/${rb}: senses must be opposite`);
}
// derived rotations (SPEC.rotations): every mesh keeps zA·θA + zB·θB constant
const RO = SPEC.rotations;
const fake = (wind, reserve, rotor) => {
  const st = kin.update();
  return { ...st, reserve, rot: { ...st.rot, ratchet: wind, crownWheel: -wind * (74 / 30), stem: -wind * (74 / 14), rotor } };
};
const S0 = fake(0, 0, 0), S1 = fake(3.7, 0.63, 1.2), S2 = fake(11.2, 0.91, -4);
for (const [, , za, zb, , ra, rb] of SPEC.meshes) {
  if (KEY[ra] && KEY[rb]) continue;
  const c0 = za * RO[ra](S0) + zb * RO[rb](S0), c1 = za * RO[ra](S1) + zb * RO[rb](S1), c2 = za * RO[ra](S2) + zb * RO[rb](S2);
  ok(Math.abs(c1 - c0) < 1e-9 && Math.abs(c2 - c0) < 1e-9, `derived mesh ${ra}/${rb} slips (zAθA + zBθB not constant)`);
}
console.log('  derived meshes (keyless, pawl wheel, PR train) keep zA·θA + zB·θB constant');
// winding ratios
const KW = SPEC.keyless;
const ratchetPerCrownTurn = KW.windingPinion.teeth / KW.ratchet.teeth;
const hoursPer5 = 5 * ratchetPerCrownTurn * (SPEC.periods.barrel / 3600);
console.log(`  manual winding: ${ratchetPerCrownTurn.toFixed(4)} barrel turns per crown turn → 5 turns = ${hoursPer5.toFixed(2)} h (official ≈10 h); full wind ${(SPEC.barrelTurns / ratchetPerCrownTurn).toFixed(1)} crown turns`);
ok(Math.abs(hoursPer5 - 10) < 0.6, '5 crown turns ≈ 10 h');
const A = SPEC.automatic;
const rotorTurnsFull = 1 / A.windPerRad / TAU;
console.log(`  automatic: ratchet ${(A.ratchetPerRotorRad * 360).toFixed(2)}° per rotor turn, empty → full ≈ ${rotorTurnsFull.toFixed(0)} rotor turns; barrel ${SPEC.barrelTurns.toFixed(3)} turns / ${SPEC.powerReserveHours} h`);
ok(rotorTurnsFull > 300 && rotorTurnsFull < 800, 'rotor turns for a full wind in a plausible range');
ok(Math.abs(A.windPerRad - A.ratchetPerRotorRad / (TAU * SPEC.barrelTurns)) < 1e-12, 'windPerRad consistent with ratchetPerRotorRad and barrelTurns');
// rotor pendulum: settles hanging at 6 o'clock (local −Y down)
{
  const k2 = createKinematics(SPEC);
  k2.addRotorImpulse(6);
  let t0 = performance.now(); while (performance.now() - t0 < 30) { /* let a frame pass */ }
  const st = k2.update();
  ok(Number.isFinite(st.rot.rotor), 'rotor angle finite after an impulse');
}

// =============================================================================== geometry
const circle = (c, r) => ({ t: 'circle', c, r });
const annulus = (c, r0, r1) => ({ t: 'annulus', c, r0, r1 });
const poly = (pts) => ({ t: 'poly', pts });
const capsule = (a, b, r) => ({ t: 'capsule', a, b, r });
const rect = (c, w, h, rotDeg = 0) => {
  const co = Math.cos(rotDeg * DEG), si = Math.sin(rotDeg * DEG);
  return poly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [c[0] + x * co - y * si, c[1] + x * si + y * co]));
};
const xrect = (x0, x1, y0, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const diff = (base, holes) => ({ t: 'diff', base, holes });
const sectorPoly = (c, r0, r1, a0, a1, n = 24) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * DEG; pts.push([c[0] + r1 * Math.cos(a), c[1] + r1 * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = (a0 + ((a1 - a0) * i) / n) * DEG; pts.push([c[0] + r0 * Math.cos(a), c[1] + r0 * Math.sin(a)]); }
  return poly(pts);
};
function segDist(px, py, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - a[0] - t * vx, py - a[1] - t * vy);
}
function inPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function polyEdgeDist(pts, x, y) {
  let d = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) d = Math.min(d, segDist(x, y, pts[j], pts[i]));
  return d;
}
function inside(sh, x, y, m) {
  switch (sh.t) {
    case 'circle': return Math.hypot(x - sh.c[0], y - sh.c[1]) <= sh.r - m;
    case 'annulus': { const d = Math.hypot(x - sh.c[0], y - sh.c[1]); return d >= sh.r0 + m && d <= sh.r1 - m; }
    case 'capsule': return segDist(x, y, sh.a, sh.b) <= sh.r - m;
    case 'poly': return inPoly(sh.pts, x, y) && polyEdgeDist(sh.pts, x, y) >= m;
    case 'diff': return inside(sh.base, x, y, m) && !sh.holes.some((h) => inside(h, x, y, -m));
    default: throw new Error(sh.t);
  }
}
function bbox(sh) {
  switch (sh.t) {
    case 'circle': return [sh.c[0] - sh.r, sh.c[1] - sh.r, sh.c[0] + sh.r, sh.c[1] + sh.r];
    case 'annulus': return [sh.c[0] - sh.r1, sh.c[1] - sh.r1, sh.c[0] + sh.r1, sh.c[1] + sh.r1];
    case 'capsule': return [Math.min(sh.a[0], sh.b[0]) - sh.r, Math.min(sh.a[1], sh.b[1]) - sh.r, Math.max(sh.a[0], sh.b[0]) + sh.r, Math.max(sh.a[1], sh.b[1]) + sh.r];
    case 'poly': { const xs = sh.pts.map((p) => p[0]), ys = sh.pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
    case 'diff': return bbox(sh.base);
    default: throw new Error(sh.t);
  }
}
const MARGIN = 0.012; // plan tolerance (mm): touching outlines are not a collision
function planOverlap(A, B, dxA = 0, dyA = 0, dxB = 0, dyB = 0) {
  const a = A.bb, b = B.bb;
  const x0 = Math.max(a[0] + dxA, b[0] + dxB), y0 = Math.max(a[1] + dyA, b[1] + dyB);
  const x1 = Math.min(a[2] + dxA, b[2] + dxB), y1 = Math.min(a[3] + dyA, b[3] + dyB);
  if (x0 >= x1 || y0 >= y1) return false;
  if (A.shape.t === 'circle' && B.shape.t === 'circle') return Math.hypot(A.shape.c[0] + dxA - B.shape.c[0] - dxB, A.shape.c[1] + dyA - B.shape.c[1] - dyB) < A.shape.r + B.shape.r - 2 * MARGIN;
  const span = Math.max(x1 - x0, y1 - y0);
  const h = Math.min(0.04, Math.max(0.006, span / 60));
  for (let y = y0 + h / 2; y < y1; y += h) for (let x = x0 + h / 2; x < x1; x += h) {
    if (inside(A.shape, x - dxA, y - dyA, MARGIN) && inside(B.shape, x - dxB, y - dyB, MARGIN)) return true;
  }
  return false;
}

// =============================================================================== solids
const solids = [];
const add = (part, name, shape, z, allow = []) => solids.push({ part, name, shape, z, allow: new Set(allow), bb: bbox(shape) });
const O = [0, 0];
const RG = SPEC.regulator, ROT = SPEC.rotor, DT = SPEC.date, KL = SPEC.keylessLevers, CS = SPEC.case;
const LEVEL1 = ['cannon-pinion', 'minute-wheel', 'setting-wheel', 'setting-intermediate-wheel', 'pr-display-wheel', 'pr-intermediate-wheel', 'setting-lever', 'yoke', 'keyless-springs', 'date-driving-wheel', 'hour-wheel', 'pr-output-pinion'];

// --- main plate: body below the dial-side recesses (stem channel cut out), dial-seat rim, pillars
const SC = F.stemChannel;
add('main-plate', 'body', diff(circle(O, 15.0), [xrect(SC.x[0], 15.1, SC.y[0], SC.y[1]), xrect(F.windingPinionSlot.x[0], F.windingPinionSlot.x[1], F.windingPinionSlot.y[0], F.windingPinionSlot.y[1])]), [Z.mainPlate[0], Z.motionRecessFloor], ['center-wheel', 'fourth-wheel', 'third-wheel', 'fifth-wheel', 'sixth-wheel', 'glide-wheel', 'crown-transmission-wheel', 'pr-differential', 'barrel-arbor', ...LEVEL1, 'date-jumper']);
add('main-plate', 'dial-seat rim', diff(annulus(O, F.plateRim.dialSeat.inner, 15.0), [xrect(13.5, 15.1, SC.y[0], SC.y[1])]), [Z.motionRecessFloor, Z.dialSeat], ['dial']);
for (const p of F.pillars) add(p.on === 'train-bridge' ? 'train-bridge' : 'main-plate', 'pillar', circle(p.at, p.radius), p.z, ['automatic-bridge', 'plate-screws']);
// --- electronics
add('tri-synchro-regulator', 'flex circuit', poly(F.pcb.outline), Z.pcb, ['ic']);
for (const c of RG.capacitors) add('tri-synchro-regulator', 'capacitor', rect(c.at, c.size[0], c.size[1], 20), Z.capacitors);
add('ic', 'IC', rect(RG.ic.center, RG.ic.size, RG.ic.size, RG.ic.rotationDeg), Z.ic);
add('quartz-oscillator', 'quartz can', capsule(RG.quartz.from, RG.quartz.to, RG.quartz.radius), [RG.quartz.axisZ - RG.quartz.radius, RG.quartz.axisZ + RG.quartz.radius], ['main-plate']);
// --- going train
add('center-wheel', 'wheel', annulus(L.center, 0.13, R.centerWheel), Z.centerWheel, ['third-wheel', 'fifth-wheel']);
add('center-wheel', 'pinion', annulus(L.center, 0.13, R.centerPinion), Z.centerPinion, ['barrel']);
add('center-wheel', 'tube', annulus(L.center, 0.13, 0.22), [Z.centerPinion[0], Z.centreTubeTop], ['main-plate', 'cannon-pinion']);
add('third-wheel', 'pinion', circle(L.third, R.thirdPinion), Z.thirdPinion, ['center-wheel']);
add('third-wheel', 'arbor', circle(L.third, 0.1), [Z.bridges[1] + 0.0, Z.mainPlate[0]], ['main-plate']);
add('third-wheel', 'wheel', circle(L.third, R.thirdWheel), Z.thirdWheel, ['fourth-wheel']);
add('fourth-wheel', 'pinion', circle(L.fourth, R.fourthPinion), Z.fourthPinion, ['third-wheel']);
add('fourth-wheel', 'wheel', circle(L.fourth, R.fourthWheel), Z.fourthWheel, ['fifth-wheel']);
add('fourth-wheel', 'seconds arbor', circle(L.fourth, 0.1), [Z.fourthPinion[0], Z.secondsArborTop], ['seconds-hand']);
add('fifth-wheel', 'wheel', circle(L.fifth, R.fifthWheel), Z.fifthWheel, ['sixth-wheel']);
add('fifth-wheel', 'pinion', circle(L.fifth, R.fifthPinion), Z.fifthPinion, ['fourth-wheel']);
add('fifth-wheel', 'arbor', circle(L.fifth, 0.1), [Z.bridges[1], Z.mainPlate[0]], ['main-plate']);
add('sixth-wheel', 'pinion', circle(L.sixth, R.sixthPinion), Z.sixthPinion, ['fifth-wheel']);
add('sixth-wheel', 'wheel', circle(L.sixth, R.sixthWheel), Z.sixthWheel, ['glide-wheel']);
add('sixth-wheel', 'arbor', circle(L.sixth, 0.08), [Z.bridges[1], Z.mainPlate[0]], ['main-plate']);
add('glide-wheel', 'magnet', circle(L.glide, RG.glide.magnet.radius), Z.glideMagnet);
add('glide-wheel', 'pinion', circle(L.glide, R.glidePinion), Z.glidePinion, ['sixth-wheel']);
add('glide-wheel', 'inertia disc', circle(L.glide, RG.glide.discRadius), Z.glideDisc);
add('glide-wheel', 'arbor', circle(L.glide, 0.08), [Z.bridges[1], Z.mainPlate[0]], ['main-plate']);
// --- coils + stator (core plates)
{
  const M = L.glide;
  for (const c of RG.coils) {
    const [S, E] = c.axis;
    const len = hyp(S, E), ang = Math.atan2(E[1] - S[1], E[0] - S[0]) / DEG;
    const mid = [(S[0] + E[0]) / 2, (S[1] + E[1]) / 2];
    add('coil', `winding ${c.name}`, rect(mid, len, 2 * RG.coilWindingRadius, ang), [RG.coilAxisZ - RG.coilWindingRadius, RG.coilAxisZ + RG.coilWindingRadius]);
    // pole piece from the winding end towards the magnet, stopping at the hook
    const u = [(M[0] - S[0]) / hyp(S, M), (M[1] - S[1]) / hyp(S, M)];
    const hookStart = [M[0] - u[0] * RG.statorHookOuterRadius, M[1] - u[1] * RG.statorHookOuterRadius];
    add('coil', `pole piece ${c.name}`, capsule(S, hookStart, RG.coreWidth / 2 - 0.15), Z.coilCore);
    const ue = [(E[0] - S[0]) / len, (E[1] - S[1]) / len];
    add('coil', `foot ${c.name}`, capsule(E, [E[0] + ue[0] * 1.2, E[1] + ue[1] * 1.2], 0.6), Z.coilCore);
  }
  add('coil', 'stator hooks', annulus(M, RG.statorHookInnerRadius, RG.statorHookOuterRadius), Z.coilCore);
}
add('stop-lever', 'lever', capsule(RG.stopLever.pivot, RG.stopLever.finger, RG.stopLever.width / 2), RG.stopLever.z);
// --- barrel
add('barrel', 'toothed band', circle(L.barrel, R.barrel), Z.barrelTeeth, ['center-wheel', 'barrel-arbor']);
add('barrel', 'drum', diff(circle(L.barrel, SPEC.movement.barrel.drumOuter), [circle(L.barrel, 0.7)]), [Z.barrel[0], Z.barrelTeeth[0]], ['barrel-cover', 'mainspring', 'barrel-arbor']);
add('barrel-cover', 'lid', diff(circle(L.barrel, SPEC.movement.barrel.drumInner), [circle(L.barrel, 0.72)]), Z.barrelLid, ['barrel', 'barrel-arbor']);
add('mainspring', 'spring', annulus(L.barrel, SPEC.movement.barrel.arborCore, SPEC.movement.barrel.drumInner), Z.mainspring, ['barrel']);
add('barrel-arbor', 'core', circle(L.barrel, SPEC.movement.barrel.arborCore), [Z.mainspring[0], Z.mainspring[1]], ['barrel', 'mainspring', 'barrel-cover']);
add('barrel-arbor', 'shank', circle(L.barrel, 0.6), [Z.ratchet[0] + 0.02, Z.mainPlate[0]], ['barrel', 'barrel-cover', 'barrel-bridge', 'ratchet-wheel', 'main-plate', 'ratchet-screw']);
// --- keyless (movement side)
add('crown-wheel', 'wheel', circle(L.crownWheel, R.crownWheel), Z.crownWheel, ['crown-transmission-wheel', 'winding-pinion']);
add('crown-wheel', 'core (from the train bridge)', circle(L.crownWheel, 0.12), [Z.bridges[0] + 0.1, Z.crownWheel[1] + 0.06], ['train-bridge']);
add('crown-transmission-wheel', 'lower wheel', circle(L.crownTransmission, R.crownTransmissionLower), Z.crownTransmissionLower, ['crown-wheel']);
add('crown-transmission-wheel', 'upper wheel', circle(L.crownTransmission, R.crownTransmissionUpper), Z.crownTransmissionUpper, ['keyless-intermediate']);
add('crown-transmission-wheel', 'arbor', circle(L.crownTransmission, 0.12), [Z.automaticBridge[1], Z.mainPlate[0]], ['automatic-bridge', 'main-plate']);
add('keyless-intermediate', 'wheel', circle(L.keylessIntermediate, R.keylessIntermediate), Z.keylessIntermediate, ['ratchet-wheel', 'crown-transmission-wheel']);
add('keyless-intermediate', 'arbor', circle(L.keylessIntermediate, 0.12), [Z.automaticBridge[1], Z.bridges[0]], ['automatic-bridge', 'barrel-bridge', 'jewels']);
add('ratchet-wheel', 'ratchet', circle(L.barrel, R.ratchet), Z.ratchet, ['keyless-intermediate', 'pawl-wheel', 'click', 'barrel-arbor', 'ratchet-screw']);
add('ratchet-screw', 'head', circle(L.barrel, 1.2), [Z.ratchetScrewTop, Z.ratchet[0]], ['ratchet-wheel', 'barrel-arbor']);
add('click', 'click', capsule(L.clickScrew, L.clickTip, 0.5), SPEC.z.click, ['ratchet-wheel', 'click-spring']);
add('click-spring', 'spring', capsule([6.3, -7.2], [4.4, -7.7], 0.15), [-3.76, -3.66], ['click']);
// --- automatic
add('pawl-wheel', 'pinion', circle(L.pawlWheel, R.pawlPinion), Z.pawlPinion, ['ratchet-wheel']);
add('pawl-wheel', 'wheel', circle(L.pawlWheel, R.pawlWheel), Z.pawlWheel, ['magic-lever']);
add('pawl-wheel', 'arbor', circle(L.pawlWheel, 0.12), [Z.automaticBridge[1], Z.bridges[0]], ['automatic-bridge', 'barrel-bridge', 'magic-lever', 'jewels']);
{
  const e = A.eccentric.throw;
  add('magic-lever', 'ring + eccentric', circle(O, A.lever.ringOuter + e), Z.magicLever, ['rotor-bearing']);
  add('magic-lever', 'arm', capsule(O, L.pawlWheel, A.lever.armWidth / 2 + e), Z.magicLever, ['pawl-wheel']);
}
add('automatic-bridge', 'band', diff(poly(F.automaticBridge.outline), [...F.automaticBridge.windows.map((w) => rect(w.center, w.size[0], w.size[1]))]), [Z.automaticBridge[1], Z.automaticBridgeBandTop], ['jewels', 'plate-screws', 'rotor-bearing', 'crown-transmission-wheel', 'keyless-intermediate', 'pawl-wheel']);
add('automatic-bridge', 'centre (thick part)', diff(poly(F.automaticBridge.outline), [annulus(O, 11.4, 20), ...F.automaticBridge.windows.map((w) => rect(w.center, w.size[0], w.size[1]))]), [Z.automaticBridge[0], Z.automaticBridgeBandTop], ['jewels', 'rotor-bearing']);
add('automatic-bridge', 'bearing boss', diff(circle(O, F.automaticBridge.bearing.bossRadius), [circle(O, 2.45)]), [F.automaticBridge.bearing.bossTop, Z.automaticBridge[0]], ['rotor-bearing']);
add('jewels', 'automatic-bridge jewels', circle(L.pawlWheel, 0.45), [Z.automaticBridge[0], Z.automaticBridge[1]], ['automatic-bridge', 'pawl-wheel']);
add('jewels', 'automatic-bridge jewels', circle(L.keylessIntermediate, 0.45), [Z.automaticBridge[0], Z.automaticBridge[1]], ['automatic-bridge', 'keyless-intermediate']);
for (const p of F.automaticBridge.screws) add('plate-screws', 'auto-bridge screw (sunk)', circle(p, 0.78), [Z.automaticBridgeBandTop, Z.automaticBridge[1] + 0.06], ['automatic-bridge']);
add('plate-screws', 'PR-bridge screw', circle(F.prBridge.screw.at, 0.7), [Z.bridges[0] - 0.1, Z.bridges[0]], ['pr-bridge']);
for (const p of F.screws.caseClamps.at) {
  add('case-clamps', 'clamp screw', circle(p, F.screws.caseClamps.headDiameter / 2), Z.caseClamps, ['main-plate']);
  const T = F.screws.caseClamps.tongue, k = (T.reachRadius - T.width / 2) / Math.hypot(p[0], p[1]);
  add('case-clamps', 'clamp tongue', capsule(p, [p[0] * k, p[1] * k], T.width / 2), [Z.caseClamps[0] + 0.04, Z.caseClamps[1]], ['main-plate']);
}
add('rotor-bearing', 'ball bearing', annulus(O, 0.9, 2.4), Z.rotorBearing, ['automatic-bridge', 'magic-lever', 'rotor']);
add('rotor', 'heavy rim (swept)', annulus(O, ROT.rimInnerRadius, ROT.outerRadius), Z.rotorRim);
add('rotor', 'plate (swept)', circle(O, ROT.rimInnerRadius), Z.rotorPlate, ['rotor-bearing']);
// --- bridges
add('train-bridge', 'bridge', poly(F.trainBridge.outline), Z.bridges, ['diashock', 'crown-wheel', 'third-wheel', 'fourth-wheel', 'fifth-wheel', 'sixth-wheel', 'glide-wheel']);
add('barrel-bridge', 'bridge', poly(F.barrelBridge.outline), Z.bridges, ['barrel-arbor', 'keyless-intermediate', 'pawl-wheel']);
add('pr-bridge', 'bridge', poly(F.prBridge.outline), Z.bridges, ['pr-differential', 'plate-screws']);
for (const j of F.jewels.diashock) add('diashock', 'Diashock setting', circle(j.at, j.settingDiameter / 2), [Z.diashockTop, Z.bridges[0]], ['train-bridge']);
// --- PR differential (back) + dial-side PR train
add('pr-differential', 'prB wheel', circle(L.prB, R.prB), [Z.prWheels[0], Z.prWheels[1] - 0.04], ['pr-differential']);
add('pr-differential', 'prA pinion', circle(L.prA, R.prA), Z.prWheels);
add('pr-differential', 'prC pinion', circle(L.prC, R.prC), Z.prWheels);
add('pr-differential', 'prB arbor (to the dial side)', circle(L.prB, 0.12), [Z.bridges[1], Z.prOutputPinion[0]], ['main-plate', 'pr-output-pinion']);
add('pr-output-pinion', 'pinion', circle(L.prB, R.prOutputPinion), Z.prOutputPinion, ['pr-intermediate-wheel', 'pr-differential']);
add('pr-intermediate-wheel', 'wheel', circle(L.prIntermediate, R.prIntermediateWheel), Z.prIntermediateWheel, ['pr-output-pinion']);
add('pr-intermediate-wheel', 'pinion', circle(L.prIntermediate, R.prIntermediatePinion), Z.prIntermediatePinion, ['pr-display-wheel']);
add('pr-display-wheel', 'wheel', circle(L.prDisplay, R.prDisplayWheel), Z.prDisplayWheel, ['pr-intermediate-wheel']);
add('pr-display-wheel', 'arbor', circle(L.prDisplay, 0.18), [Z.prDisplayWheel[1], Z.prDisplayArborTop], ['calendar-plate', 'dial', 'power-reserve-hand']);
// --- dial-side motion works, setting and date works
const HS = SPEC.hands.centreStack;
add('cannon-pinion', 'leaves', annulus(O, HS.cannonPipe[0], R.cannonLeaves), Z.cannonLeaves, ['minute-wheel']);
add('cannon-pinion', 'pipe', annulus(O, HS.cannonPipe[0], HS.cannonPipe[1]), [Z.cannonLeaves[1], Z.cannonPipeTop], ['hour-wheel', 'minute-hand', 'center-wheel']);
add('minute-wheel', 'wheel', circle(L.minuteWheel, R.minuteWheel), Z.minuteWheel, ['setting-intermediate-wheel']);
add('minute-wheel', 'pinion', circle(L.minuteWheel, R.minutePinion), Z.minutePinion, ['hour-wheel']);
add('hour-wheel', 'wheel', diff(circle(O, R.hourWheel), [circle(O, HS.hourPipe[0])]), Z.hourWheel, ['date-driving-wheel']);
add('hour-wheel', 'pipe', annulus(O, HS.hourPipe[0], HS.hourPipe[1]), [Z.hourWheel[1], Z.hourPipeTop], ['hour-hand']);
add('setting-intermediate-wheel', 'wheel', circle(L.settingIntermediate, R.settingIntermediate), Z.settingIntermediate, ['setting-wheel']);
add('setting-wheel', 'wheel', circle(L.settingWheel, R.settingWheel), Z.settingWheel, ['sliding-pinion']);
add('date-driving-wheel', 'wheel', circle(L.dateDriver, R.dateDriver), Z.dateDriver);
add('date-driving-wheel', 'finger (swept)', annulus(L.dateDriver, 0.0, DT.driver.finger.reach + DT.driver.finger.width / 2), DT.driver.finger.z, ['date-ring']);
add('date-driving-wheel', 'stud', circle(L.dateDriver, 0.25), [Z.motionRecessFloor, Z.calendarPlate[0]], ['main-plate']);
add('date-ring', 'ring', annulus(O, DT.ring.tipRadius, DT.ring.outerRadius), DT.ring.z, ['date-jumper', 'date-driving-wheel']);
add('date-jumper', 'jumper', capsule(DT.jumper.pivot, DT.jumper.beak, 0.25), DT.jumper.z, ['date-ring']);
add('calendar-plate', 'plate', diff(circle(O, DT.calendarPlate.radius), [circle(O, DT.calendarPlate.centreHole), ...DT.calendarPlate.holes.map((h) => circle(h.at, h.radius))]), DT.calendarPlate.z, ['date-ring']);
// keyless levers (dial side)
add('setting-lever', 'pin arm', capsule(KL.settingLever.pivot, KL.settingLever.pin, KL.settingLever.width / 2), Z.keylessLevers, ['winding-stem']);
add('setting-lever', 'beak', capsule(KL.settingLever.pin, KL.settingLever.beak, KL.settingLever.width / 2), Z.keylessLevers, ['yoke', 'winding-stem']);
add('setting-lever', 'tail', capsule(KL.settingLever.pivot, KL.settingLever.tail, KL.settingLever.width / 2), Z.keylessLevers, ['keyless-springs']);
add('yoke', 'arm', capsule(KL.yoke.pivot, KL.yoke.arm, KL.yoke.width / 2), Z.keylessLevers, ['setting-lever']);
add('yoke', 'fork', capsule(KL.yoke.arm, [KL.yoke.fork[0], KL.yoke.forkFingersY[0]], KL.yoke.width / 2), Z.keylessLevers, ['sliding-pinion']);
for (const fy of KL.yoke.forkFingersY) add('yoke', 'fork finger', circle([KL.yoke.fork[0], fy], 0.12), [Z.slidingPinion[0] + 0.5, Z.keylessLevers[1]], ['sliding-pinion', 'main-plate']);
add('yoke', 'tail', capsule(KL.yoke.pivot, KL.yoke.tail, KL.yoke.width / 2), Z.keylessLevers, ['keyless-springs']);
add('keyless-springs', 'yoke spring', capsule(KL.yokeSpring.anchor, KL.yokeSpring.nose, KL.yokeSpring.width / 2), Z.keylessLevers, ['yoke']);
add('keyless-springs', 'setting-lever jumper', capsule(KL.settingLeverJumper.anchor, KL.settingLeverJumper.nose, KL.settingLeverJumper.width / 2), Z.keylessLevers, ['setting-lever']);
// stem, pinions on the stem (axis along X): plan = their projection
const sAx = Z.stemAxis;
add('winding-stem', 'stem', xrect(KL.stem.innerEnd, KL.stem.crownThreadEnd, -0.45, 0.45), [sAx - 0.45, sAx + 0.45], ['sliding-pinion', 'winding-pinion', 'main-plate', 'case-body', 'crown', 'setting-lever', 'yoke']);
add('winding-pinion', 'pinion', xrect(9.75, 10.45, -R.windingPinion, R.windingPinion), Z.windingPinion, ['winding-stem', 'crown-wheel', 'main-plate', 'sliding-pinion']);
add('sliding-pinion', 'pinion', xrect(8.55, 9.7, -0.75, 0.75), Z.slidingPinion, ['winding-stem', 'setting-wheel', 'main-plate', 'yoke', 'winding-pinion']);
// --- dial and things on it
const DL = SPEC.dial, PRF = DL.powerReserve;
const fanPoly = (() => {
  const c = PRF.pivot, r = PRF.fan.radius;
  const pts = [[c[0] + PRF.fan.rightEdgeDx, c[1] + PRF.fan.bottomEdgeDy]];
  const a0 = Math.atan2(4.92, 0.53) / DEG, a1 = 180 + Math.atan2(0.84, 4.88) / DEG;
  for (let i = 0; i <= 30; i++) { const a = (a0 + ((a1 - a0) * i) / 30) * DEG; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
  pts.push([c[0] - 0.6, c[1] + PRF.fan.bottomEdgeDy]);
  return poly(pts);
})();
const ap = DL.dateWindow.aperture;
add('dial', 'plate', diff(circle(O, DL.radius), [circle(O, DL.centreHole), fanPoly, rect(ap.center, ap.width, ap.height), circle(L.prDisplay, 0.3)]), Z.dial, ['main-plate', 'casing-ring']);
add('dial', 'PR recess floor', diff(fanPoly, [circle(L.prDisplay, 0.3)]), [Z.dial[0], Z.prRecessFloor], []);
for (const a of DL.feet.angles) add('dial', 'foot', circle([DL.feet.r * Math.sin(a * DEG), DL.feet.r * Math.cos(a * DEG)], DL.feet.radius), [DL.feet.bottom, Z.dial[0]], ['main-plate']);
{
  const MK = DL.markers;
  const marker = (hour, r, w) => {
    const th = hour * 30 * DEG, ux = Math.sin(th), uy = Math.cos(th), nx = uy, ny = -ux;
    const [w0, w1] = Array.isArray(w) ? w : [w, w];
    return poly([[ux * r[0] + (nx * w0) / 2, uy * r[0] + (ny * w0) / 2], [ux * r[1] + (nx * w1) / 2, uy * r[1] + (ny * w1) / 2],
      [ux * r[1] - (nx * w1) / 2, uy * r[1] - (ny * w1) / 2], [ux * r[0] - (nx * w0) / 2, uy * r[0] - (ny * w0) / 2]]);
  };
  for (const h of MK.wedge12.hours) add('indices', `marker ${h}`, marker(h, MK.wedge12.r, MK.wedge12.width), [Z.dialTop, Z.markersTop]);
  for (const h of MK.wedge69.hours) add('indices', `marker ${h}`, marker(h, MK.wedge69.r, MK.wedge69.width), [Z.dialTop, Z.markersTop]);
  for (const h of MK.bars.hours) add('indices', `marker ${h}`, marker(h, MK.bars.r, MK.bars.width), [Z.dialTop, Z.markersTop]);
}
add('gs-logo', 'logo', rect(DL.logo.center, DL.logo.width, DL.logo.height), [Z.dialTop, Z.logoTop]);
add('date-window', 'frame', diff(xrect(DL.dateWindow.frame.x[0], DL.dateWindow.frame.x[1], DL.dateWindow.frame.y[0], DL.dateWindow.frame.y[1]), [rect(ap.center, ap.width, ap.height)]), [Z.dialTop, Z.dateFrameTop]);
// hands: swept areas (the PR hand sweeps the fan only)
const HD = SPEC.hands;
add('power-reserve-hand', 'hand (swept)', diff(fanPoly, [circle(L.prDisplay, 0.18)]), HD.powerReserve.z, ['pr-display-wheel']);
add('power-reserve-hand', 'hub', annulus(L.prDisplay, 0.18, HD.powerReserve.hubRadius), [HD.powerReserve.z[0], HD.powerReserve.z[1] + 0.05], ['pr-display-wheel']);
add('hour-hand', 'blade (swept)', annulus(O, HS.hourPipe[1], HD.hour.tip), HD.hour.z);
add('hour-hand', 'collet', annulus(O, HS.hourPipe[1], HD.hour.collet.radius), HD.hour.collet.z, ['hour-wheel']);
add('minute-hand', 'blade (swept)', annulus(O, HS.cannonPipe[1], HD.minute.tip), HD.minute.z);
add('minute-hand', 'collet', annulus(O, HS.cannonPipe[1], HD.minute.collet.radius), HD.minute.collet.z, ['cannon-pinion']);
add('seconds-hand', 'blade (swept)', circle(O, HD.seconds.tip), HD.seconds.z, ['fourth-wheel']);
add('seconds-hand', 'hub', circle(O, HD.seconds.hub.radius), HD.seconds.hub.z, ['fourth-wheel']);
// --- case
const caseInner = CS.middle.innerRadius;
add('casing-ring', 'ring', annulus(O, CS.casingRing.r[0], CS.casingRing.r[1]), CS.casingRing.z, ['dial', 'winding-stem']);
add('rehaut', 'ring', annulus(O, CS.rehaut.r[0], CS.rehaut.r[1]), CS.rehaut.z, ['dial', 'crystal']);
add('case-body', 'middle case', annulus(O, caseInner, CS.radius), [CS.middle.bottom, CS.middle.top], ['crown', 'winding-stem']);
add('case-body', 'crown tube', xrect(caseInner, CS.crown.from, -CS.crown.tube.radius, CS.crown.tube.radius), [CS.crown.axisZ - CS.crown.tube.radius, CS.crown.axisZ + CS.crown.tube.radius], ['winding-stem', 'crown']);
add('bezel', 'bezel', annulus(O, CS.bezel.r[0], CS.bezel.r[1]), CS.bezel.z, ['crystal', 'case-body']); // press-fitted on the case middle; they move as one
add('crystal', 'crystal', circle(O, CS.crystal.radius), [CS.crystal.undersideRimZ, CS.crystal.apexZ], ['bezel', 'rehaut']);
add('crown', 'crown', xrect(CS.crown.from, CS.crown.to, -CS.crown.radius, CS.crown.radius), [CS.crown.axisZ - CS.crown.radius, CS.crown.axisZ + CS.crown.radius], ['winding-stem', 'case-body']);
add('caseback-ring', 'case back', annulus(O, CS.caseback.glass.apertureRadius, CS.caseback.outerRadius), [CS.caseback.z[0], CS.caseback.innerFaceZ], ['caseback-glass']);
add('caseback-ring', 'thread ring', annulus(O, caseInner, CS.caseback.outerRadius), [CS.caseback.innerFaceZ, CS.caseback.z[1]], ['case-body']);
add('caseback-glass', 'glass', circle(O, CS.caseback.glass.radius), CS.caseback.glass.z, ['caseback-ring']);

const partIds = [...new Set(solids.map((x) => x.part))];
for (const id of partIds) if (!SPEC.explode[id] && id !== 'main-plate') warn(`no explode offset for part '${id}'`);

// =============================================================================== C assembled
console.log(`\nC  assembled stack — ${solids.length} solids in ${partIds.length} parts`);
const allowed = (a, b) => a.part === b.part || a.allow.has(b.part) || b.allow.has(a.part);
const zOverlap = (a0, a1, b0, b1, eps = 0.004) => Math.min(a1, b1) - Math.max(a0, b0) > eps;
const planPairs = []; // [i, j] plan-overlapping solids of different parts (static xy)
const moverXY = (id) => { const e = SPEC.explode[id]; return e && (e[0] !== 0 || e[1] !== 0); };
let clashes = 0;
for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i], b = solids[j];
    if (a.part === b.part) continue;
    const ov = planOverlap(a, b);
    if (ov) planPairs.push([i, j]);
    if (ov && zOverlap(a.z[0], a.z[1], b.z[0], b.z[1]) && !allowed(a, b)) {
      clashes++;
      ok(false, `${a.part}/${a.name} [${f3(a.z[0])}, ${f3(a.z[1])}] ⟂ ${b.part}/${b.name} [${f3(b.z[0])}, ${f3(b.z[1])}] overlap in plan and z`);
    }
  }
}
console.log(`  ${planPairs.length} plan-overlapping solid pairs, ${clashes} z clashes`);
// tight gaps worth knowing about
const tight = [];
for (const [i, j] of planPairs) {
  const a = solids[i], b = solids[j];
  if (allowed(a, b)) continue;
  const gap = Math.max(a.z[0], b.z[0]) - Math.min(a.z[1], b.z[1]);
  if (gap >= 0 && gap < 0.03) tight.push(`${a.part}/${a.name} ↔ ${b.part}/${b.name}: ${gap.toFixed(3)}`);
}
if (tight.length) console.log(`  z gaps < 0.03 mm between plan-overlapping parts (touching/stacked, fine):\n    ${tight.join('\n    ')}`);

// =============================================================================== D explode
console.log('\nD  explode animation (registry easing, 41 steps, explodeHide parts skipped)');
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const HIDE = new Set(['bracelet', 'clasp', 'spring-bars']);
const vec = (id) => SPEC.explode[id] || [0, 0, 0];
const delay = (id) => (SPEC.explode[id] ? SPEC.explodeDelay(id) : 0);
const offsetAt = (id, e) => {
  const k = ease(Math.min(1, Math.max(0, (e - delay(id) * 0.45) / 0.55)));
  const v = vec(id);
  return [v[0] * k, v[1] * k, v[2] * k];
};
let crossings = 0;
const crossed = new Set();
const movers = solids.map((x, i) => (moverXY(x.part) ? i : -1)).filter((i) => i >= 0);
const checkPair = (a, b, oa, ob, e) => {
  if (HIDE.has(a.part) || HIDE.has(b.part) || allowed(a, b)) return;
  const key = `${a.part}/${a.name}|${b.part}/${b.name}`;
  if (crossed.has(key)) return;
  if (zOverlap(a.z[0] + oa[2], a.z[1] + oa[2], b.z[0] + ob[2], b.z[1] + ob[2], 0.004)) {
    crossed.add(key); crossings++;
    ok(false, `explode e=${e.toFixed(3)}: ${a.part}/${a.name} passes through ${b.part}/${b.name}`);
  }
};
for (let step = 0; step <= 40; step++) {
  const e = step / 40;
  const off = new Map(partIds.map((id) => [id, offsetAt(id, e)]));
  for (const [i, j] of planPairs) {
    const a = solids[i], b = solids[j];
    if (moverXY(a.part) || moverXY(b.part)) continue;
    checkPair(a, b, off.get(a.part), off.get(b.part), e);
  }
  for (const i of movers) {
    const a = solids[i], oa = off.get(a.part);
    for (let j = 0; j < solids.length; j++) {
      const b = solids[j];
      if (b.part === a.part) continue;
      const ob = off.get(b.part);
      if (!planOverlap(a, b, oa[0], oa[1], ob[0], ob[1])) continue;
      checkPair(a, b, oa, ob, e);
    }
  }
}
console.log(`  ${crossings} crossings`);
// final layout: smallest z gaps between plan-overlapping parts at full explosion
{
  const gaps = [];
  for (const [i, j] of planPairs) {
    const a = solids[i], b = solids[j];
    if (HIDE.has(a.part) || HIDE.has(b.part) || a.part === b.part || allowed(a, b) || moverXY(a.part) || moverXY(b.part)) continue;
    const oa = offsetAt(a.part, 1), ob = offsetAt(b.part, 1);
    const g = Math.max(a.z[0] + oa[2], b.z[0] + ob[2]) - Math.min(a.z[1] + oa[2], b.z[1] + ob[2]);
    gaps.push([g, `${a.part} ↔ ${b.part}`]);
  }
  const byPair = new Map();
  for (const [g, k] of gaps) if (!byPair.has(k) || byPair.get(k) > g) byPair.set(k, g);
  const sorted = [...byPair.entries()].sort((p, q) => p[1] - q[1]);
  console.log('  tightest exploded gaps (mm):', sorted.slice(0, 10).map(([k, g]) => `${k} ${g.toFixed(2)}`).join('; '));
  for (const [k, g] of sorted) if (g < 0.6) ok(false, `exploded gap ${k} only ${g.toFixed(2)} mm (want ≥ 0.6)`);
  let zmin = Infinity, zmax = -Infinity;
  for (const x of solids) { if (HIDE.has(x.part)) continue; const o = offsetAt(x.part, 1); zmin = Math.min(zmin, x.z[0] + o[2]); zmax = Math.max(zmax, x.z[1] + o[2]); }
  console.log(`  exploded stack z ${zmin.toFixed(1)} … ${zmax.toFixed(1)} (${(zmax - zmin).toFixed(1)} mm)`);
}

// occlusion in the UI's exploded views (src/ui/camera.js explodedDir: landscape az 64° el 16°,
// portrait az 24° el 54°; orthographic approximation): rays from sampled points on each
// movement/dial part's exploded top face towards the camera, tested against the opaque case
// pieces. The case must not hide the mechanism.
{
  // (the rehaut is left out: it rides on the dial as its flange and only shades what the dial
  // itself already covers)
  const OCCLUDERS = new Set(['case-body', 'bezel', 'casing-ring', 'caseback-ring', 'crown', 'case-clamps']);
  const views = [['landscape', 64, 16], ['portrait', 24, 54]];
  const occ = solids.filter((x) => OCCLUDERS.has(x.part));
  const targets = new Map();
  for (const x of solids) {
    if (OCCLUDERS.has(x.part) || HIDE.has(x.part) || ['crystal', 'caseback-glass', 'winding-stem'].includes(x.part)) continue;
    if (!targets.has(x.part)) targets.set(x.part, []);
    targets.get(x.part).push(x);
  }
  for (const [vname, az, el] of views) {
    const d = [Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), Math.cos(az * DEG) * Math.cos(el * DEG)];
    const worst = [];
    for (const [id, list] of targets) {
      const o = offsetAt(id, 1);
      let n = 0, hid = 0;
      const by = new Map();
      for (const sx of list) {
        const [x0, y0, x1, y1] = sx.bb;
        const h = Math.max((x1 - x0) / 14, (y1 - y0) / 14, 0.05);
        for (let y = y0 + h / 2; y < y1; y += h) for (let x = x0 + h / 2; x < x1; x += h) {
          if (!inside(sx.shape, x, y, 0)) continue;
          n++;
          const p = [x + o[0], y + o[1], sx.z[1] + o[2]];
          let blocked = false;
          for (const c of occ) {
            const oc = offsetAt(c.part, 1);
            const zc0 = c.z[0] + oc[2], zc1 = c.z[1] + oc[2];
            if (zc1 < p[2]) continue; // behind the point (camera is on +Z)
            const t0 = Math.max(0, (zc0 - p[2]) / d[2]), t1 = (zc1 - p[2]) / d[2];
            for (let k = 0; k <= 6 && !blocked; k++) {
              const t = t0 + ((t1 - t0) * k) / 6;
              if (inside(c.shape, p[0] + t * d[0] - oc[0], p[1] + t * d[1] - oc[1], 0)) blocked = true;
            }
            if (blocked) { by.set(c.part, (by.get(c.part) || 0) + 1); break; }
          }
          if (blocked) hid++;
        }
      }
      const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
      if (n && hid / n > 0.02) worst.push([hid / n, id, top ? top[0] : '']);
    }
    worst.sort((a, b) => b[0] - a[0]);
    console.log(`  ${vname} exploded view: parts partly hidden by case pieces: ${worst.length ? worst.map(([f, id, by]) => `${id} ${(f * 100).toFixed(0)}% (${by})`).join(', ') : 'none'}`);
    for (const [f, id] of worst) if (f > 0.15) warn(`${vname}: ${id} ${(f * 100).toFixed(0)} % hidden by the case in the exploded view`);
  }
}

// =============================================================================== E misc
console.log('\nE  heights, clearances, conventions');
const height = Z.dialSeat - Z.rotorTop;
console.log(`  movement height ${height.toFixed(2)} mm (dial seat ${Z.dialSeat} … rotor ${Z.rotorTop}); case ${(Z.caseTop - Z.caseBottom).toFixed(2)} mm`);
ok(Math.abs(height - 5.8) < 1e-9, 'movement height 5.80 (OFFICIAL)');
ok(Math.abs(Z.caseTop - Z.caseBottom - 12.5) < 1e-9, 'case height 12.5 (OFFICIAL)');
ok(CS.caseback.innerFaceZ < Z.rotorTop - 0.3, `rotor clears the case back by ${(Z.rotorTop - CS.caseback.innerFaceZ).toFixed(2)}`);
ok(CS.crystal.undersideCentreZ - HD.seconds.hub.z[1] > 0.5, `crystal clears the seconds hub by ${(CS.crystal.undersideCentreZ - HD.seconds.hub.z[1]).toFixed(2)}`);
ok(HD.hour.z[0] > Z.logoTop && HD.hour.z[0] > Z.dateFrameTop, 'hour hand clears the applied GS logo and the date frame');
ok(HD.minute.z[0] > Z.markersTop, 'minute hand clears the markers');
ok(HD.hour.tip < DL.markers.bars.r[0] - 0.1, 'hour hand stops short of the markers');
ok(ROT.outerRadius + 0.5 < CS.middle.innerRadius && ROT.outerRadius < F.plateRadius, 'rotor inside the movement and the case bore');
ok(SPEC.movement.radius < CS.casingRing.r[0], 'movement inside the casing ring');
// power reserve: full → 263° clockwise from 12 (toward 9), empty → 12
const prRot = (r) => SPEC.powerReserve.handRotationZ(r);
const dirOf = (rz) => [-Math.sin(rz), Math.cos(rz)]; // hand pointing +Y at rotation 0
const cwFrom12 = (v) => ((Math.atan2(v[0], v[1]) / DEG) + 360) % 360;
const full = cwFrom12(dirOf(prRot(1))), empty = cwFrom12(dirOf(prRot(0)));
console.log(`  PR hand: full ${full.toFixed(1)}° / empty ${empty.toFixed(1)}° clockwise from 12 (exterior.md: 263° / 360°)`);
ok(Math.abs(full - 263) < 0.5 && (empty < 0.5 || empty > 359.5), 'power-reserve hand convention');
ok(Math.abs(SPEC.rotations.prDisplay({ reserve: 1 }) - prRot(1)) < 1e-12, 'PR display wheel turns with the hand');
// date ring: today's numeral sits in the window with drive { key: 'date', sign: −1 }
{
  const st = kin.update();
  const ringRot = SPEC.rotations.dateRing(st);
  const d = st.day;
  const local = SPEC.date.ring.windowAngleDeg - ((d - 1) * 360) / 31;
  const world = (((local + ringRot / DEG) % 360) + 540) % 360 - 180;
  console.log(`  date ring: day ${d} numeral at ${world.toFixed(2)}° (window at ${SPEC.date.ring.windowAngleDeg.toFixed(2)}°)`);
  ok(Math.abs(world - SPEC.date.ring.windowAngleDeg) < 0.01, 'date numeral centred in the window');
  ok(Math.abs(Math.hypot(...SPEC.dial.dateWindow.aperture.center) - SPEC.date.ring.numeralRadius) < 0.05, 'numeral radius = window centre radius');
}
// stem / crown / crown wheel geometry
ok(Math.abs(L.windingPinion[0] - L.crownWheel[0] - (SPEC.modules.crown * KW.crownWheel.teeth) / 2) < 1e-9, 'winding pinion sits on the crown wheel pitch circle');
ok(Math.abs(Z.stemAxis - (SPEC.modules.crown * KW.windingPinion.teeth) / 2 - (Z.crownWheel[0] + Z.crownWheel[1]) / 2) < 0.02, 'crown wheel plane at the winding pinion underside');
ok(Math.abs(CS.crown.axisZ - Z.stemAxis) < 1e-9, 'crown on the stem axis');
// glide wheel's view through the case back: the glide notch must expose the Diashock
ok(!inPoly(F.automaticBridge.outline, L.glide[0], L.glide[1]), 'glide Diashock visible through the automatic-bridge notch');
ok(!inPoly(F.automaticBridge.outline, L.barrel[0], L.barrel[1]), 'ratchet visible through the automatic-bridge cut-out');
for (const p of [L.prA, L.prB, L.prC]) ok(!inPoly(F.automaticBridge.outline, p[0], p[1]), 'PR jewels visible through the PR cut-out');
for (const p of [L.center, L.third, L.fifth, L.sixth, L.glide]) ok(inPoly(F.trainBridge.outline, p[0], p[1]), `train bridge carries the pivot at ${p}`);
ok(inPoly(F.trainBridge.outline, L.crownWheel[0], L.crownWheel[1]), 'train bridge carries the crown-wheel pivot');
ok(!inPoly(F.trainBridge.outline, L.crownTransmission[0], L.crownTransmission[1]), 'crown transmission arbor clear of the train bridge');
ok(inPoly(F.barrelBridge.outline, L.keylessIntermediate[0], L.keylessIntermediate[1]) && inPoly(F.barrelBridge.outline, L.pawlWheel[0], L.pawlWheel[1]), 'barrel bridge carries the keyless-intermediate and pawl-wheel lower pivots');
const signedArea = (pts) => pts.reduce((acc, p, i) => { const q = pts[(i + 1) % pts.length]; return acc + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
for (const k of ['trainBridge', 'barrelBridge', 'prBridge']) ok(signedArea(F[k].outline) > 0, `${k} outline is counter-clockwise`);
ok(signedArea(F.automaticBridge.outline) > 0, 'automatic bridge outline counter-clockwise');

console.log(`\n${fails ? `✗ ${fails} failure(s)` : '✓ all checks passed'}${warns ? `, ${warns} warning(s)` : ''}`);
process.exit(fails ? 1 : 0);
