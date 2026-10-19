// Validates src/watches/tangente-update-147/spec.js:
//   1. every meshing pair: centre distance vs m(z1+z2)/2, one module per multi-mesh
//      wheel, module ranges, positions
//   2. kinematics: createKinematics(SPEC) periods (centre 3600 s, fourth 60 s, hour wheel
//      43200 s, escape 6 beats/s), extra arbors, winding/automatic ratios, date markers
//   3. vertical stack: every pair of solids whose outlines overlap in plan must have
//      disjoint z ranges unless they are meant to touch (meshes, contrate, detents)
//   4. explode: sweeping the explode animation (registry easing + SPEC.explodeDelay), no
//      two solids that are apart when assembled may intersect at any stage; every
//      assembled contact must have separated at full explosion
//   5. explode table covers every planned part id; delays in range
//   6. misc geometry (balance inside the plate cut-out, wheels inside plates, rotor
//      centroid on local −Y, heights and clearances)
// Run from the project root: node research/tangente-update-147/check.mjs  (exit 1 on error)
import { SPEC } from '../../src/watches/tangente-update-147/spec.js';
import { createKinematics } from '../../src/core/kinematics.js';

const S = SPEC, L = S.layout, Z = S.z, MD = S.modules, TR = S.train, WT = S.windingTrain, AT = S.autoTrain, DT = S.dateTrain;
const DEG = Math.PI / 180, TAU = Math.PI * 2;
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const f3 = (v) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3);
let errors = 0, warnings = 0;
const err = (m) => { errors++; console.log(`  ERROR  ${m}`); };
const warn = (m) => { warnings++; console.log(`  warn   ${m}`); };
const ok = (m) => console.log(`  ok     ${m}`);
const head = (m) => console.log(`\n=== ${m}`);
const quick = process.argv.includes('--quick'); // skip the explode sweep

const wheelTip = (z, m) => m * (z / 2 + 1.3);
const pinionTip = (z, m) => m * (z / 2 + 0.9);
const wheelRoot = (z, m) => m * (z / 2 - 1.6);

// ------------------------------------------------------------------ 1. meshes
head('1. Meshing pairs: placed centre distance vs m(z1+z2)/2');
const meshes = [
  ['barrel 126 → centre pinion 18', L.barrel, L.center, TR.barrel.teeth, TR.center.pinion, MD.barrel],
  ['centre 120 → third pinion 16', L.center, L.third, TR.center.teeth, TR.third.pinion, MD.center],
  ['third 112 → fourth pinion 14', L.third, L.fourth, TR.third.teeth, TR.fourth.pinion, MD.third],
  ['fourth 120 → escape pinion 10', L.fourth, L.escape, TR.fourth.teeth, TR.escape.pinion, MD.fourth],
  ['cannon 12 → minute wheel 40', L.center, L.minuteWheel, TR.cannon.teeth, TR.minuteWheel.teeth, MD.motionA],
  ['minute pinion 10 → hour wheel 36', L.minuteWheel, L.center, TR.minuteWheel.pinion, TR.hourWheel.teeth, MD.motionB],
  ['hour wheel 36 → date-drive star 18', L.center, L.dateDrive, TR.hourWheel.teeth, DT.driveStar.teeth, MD.dateStar],
  ['date drive 24 → date idler 14', L.dateDrive, L.dateIdler1, DT.driveWheel.teeth, DT.idler1.teeth, MD.dateWheel],
  ['date idler 14 → date idler 16', L.dateIdler1, L.dateIdler2, DT.idler1.teeth, DT.idler2.teeth, MD.dateWheel],
  ['date idler pinion 8 → carrier 48', L.dateIdler2, L.dateSwitch, DT.idler2.pinion, DT.carrier.teeth, MD.dateCarrier],
  ['quick-set wheel 24 → idler 14 (static)', L.quickSetStar, L.quickSetIdler, DT.quickSetWheel.teeth, DT.quickSetIdler.teeth, MD.quickSet],
  ['minute wheel 40 → setting wheel 20', L.minuteWheel, L.settingWheel, TR.minuteWheel.teeth, WT.settingWheel.teeth, MD.setting],
  ['setting wheel 20 → setting idler 20', L.settingWheel, L.settingIdler, WT.settingWheel.teeth, WT.settingIdler.teeth, MD.setting],
  ['crown wheel 42 → idler 1 (20)', L.crownWheel, L.windIdler1, WT.crownWheel.teeth, WT.idler1.teeth, MD.windA],
  ['idler 1 (20) → idler 2 upper 16', L.windIdler1, L.windIdler2, WT.idler1.teeth, WT.idler2.teeth, MD.windB],
  ['idler 2 lower 21 → ratchet 63', L.windIdler2, L.barrel, WT.idler2.lowerTeeth, WT.ratchet.teeth, MD.windC],
  ['rotor wheel 60 → reverser 20', L.center, L.reverser, AT.rotorWheel.teeth, AT.reverser.teeth, MD.rotorWheel],
  ['reverser pinion 8 → A 26', L.reverser, L.autoA, AT.reverser.pinion, AT.A.teeth, MD.autoRA],
  ['A pinion 16 → B 48', L.autoA, L.autoB, AT.A.pinion, AT.B.teeth, MD.autoAB],
  ['B pinion 18 → C 34', L.autoB, L.autoC, AT.B.pinion, AT.C.teeth, MD.autoBC],
  ['C pinion 8 → D 24', L.autoC, L.autoD, AT.C.pinion, AT.D.teeth, MD.autoCD],
  ['D pinion 10 → T 22', L.autoD, L.autoT, AT.D.pinion, AT.T.teeth, MD.autoT],
  ['T 22 → ratchet 63', L.autoT, L.barrel, AT.T.teeth, WT.ratchet.teeth, MD.autoT],
];
for (const [name, a, b, z1, z2, m] of meshes) {
  const d = hyp(a, b), want = (m * (z1 + z2)) / 2, e = d - want;
  const line = `${name.padEnd(40)} d ${f3(d)}  m(z1+z2)/2 ${f3(want)}  Δ ${f3(e)}  m ${m.toFixed(4)}`;
  if (Math.abs(e) > 0.002) err(line); else ok(line);
}
head('1b. One wheel meshing two partners uses one module');
for (const [n, a, b] of [
  ['idler 1 (crown wheel + idler 2)', MD.windA, MD.windB],
  ['ratchet (idler 2 lower + T)', MD.windC, MD.autoT],
  ['minute wheel (cannon + setting wheel)', MD.motionA, MD.setting],
  ['hour wheel (minute pinion + date star)', MD.motionB, MD.dateStar],
]) (Math.abs(a - b) > 1e-9 ? err : ok)(`${n}: ${a.toFixed(5)} vs ${b.toFixed(5)}`);
head('1c. Module ranges (0.04 … 0.20 mm)');
for (const [k, v] of Object.entries(MD)) (v > 0.04 && v < 0.2 ? ok : err)(`${k.padEnd(13)} ${v.toFixed(4)}`);
head('1d. Positions (dial frame)');
for (const [k, v] of Object.entries(L)) console.log(`  ${k.padEnd(14)} [${f3(v[0])}, ${f3(v[1])}]  r ${f3(Math.hypot(...v))}`);
console.log(`  transmission wheel T lands ${f3(hyp(L.autoT, [-2.10, 9.15]))} mm from the measured pivot hole (2.10, 9.15 back view)`);
console.log(`  idler 2 snapped ${f3(hyp(L.windIdler2, [7.59, 6.31]))} mm from its measured centre; date drive ${f3(hyp(L.dateDrive, [-3.41, -0.65]))} mm`);
console.log(`  tip Ø: barrel ${f3(2 * wheelTip(126, MD.barrel))}, centre ${f3(2 * wheelTip(120, MD.center))}, third ${f3(2 * wheelTip(112, MD.third))}, fourth ${f3(2 * wheelTip(120, MD.fourth))}, ratchet ${f3(2 * wheelTip(63, MD.windC))}, crown wheel ${f3(2 * wheelTip(42, MD.windA))}, winding pinion ${f3(2 * wheelTip(17, MD.windA))}`);

// ------------------------------------------------------------------ 2. kinematics
head('2. Kinematics (src/core/kinematics.js)');
const kin = createKinematics(SPEC);
const B6 = kin.state.B;
const period = (k) => kin.bpr[k] / B6;
(B6 === 6 ? ok : err)(`beats per second ${B6} (21,600 A/h)`);
for (const [k, p] of Object.entries({ center: 3600, fourth: 60, hourWheel: 43200, cannon: 3600, third: 480, barrel: 25200, minuteWheel: 12000, escape: 5 })) {
  (Math.abs(period(k) - p) < 1e-9 ? ok : err)(`${k.padEnd(12)} ${period(k)} s/turn (expect ${p}), dir ${kin.dir[k]}`);
}
for (const [k, p] of Object.entries({ dateDrive: 21600, dateIdler1: 12600, dateIdler2: 14400, dateSwitch: 86400, settingWheel: 6000, settingIdler: 6000 })) {
  (Math.abs(period(k) - p) < 1e-9 ? ok : err)(`arbor ${k.padEnd(12)} ${period(k)} s/turn, dir ${kin.dir[k]}`);
}
const tDrive = (43200 * DT.driveStar.teeth) / TR.hourWheel.teeth;
const tI1 = tDrive * (DT.idler1.teeth / DT.driveWheel.teeth), tI2 = tI1 * (DT.idler2.teeth / DT.idler1.teeth), tSw = tI2 * (DT.carrier.teeth / DT.idler2.pinion);
(Math.abs(tSw - 86400) < 1e-6 && Math.abs(tI1 - period('dateIdler1')) < 1e-6 && Math.abs(tI2 - period('dateIdler2')) < 1e-6 ? ok : err)(`date train from teeth: drive ${tDrive} s → idler ${tI1} → idler ${tI2} → switching wheel ${tSw} s`);
(Math.abs(period('settingWheel') - (period('minuteWheel') * WT.settingWheel.teeth) / TR.minuteWheel.teeth) < 1e-9 ? ok : err)('setting wheel period matches the minute-wheel mesh');
const chain = (WT.ratchet.teeth / WT.idler2.lowerTeeth) * (WT.idler2.teeth / WT.idler1.teeth) * (WT.idler1.teeth / WT.crownWheel.teeth);
(Math.abs(chain - S.keyless.ratchet.teeth / S.keyless.crownWheel.teeth) < 1e-12 ? ok : err)(`crown-wheel turns per ratchet turn: real chain ${chain.toFixed(6)} = engine ${(S.keyless.ratchet.teeth / S.keyless.crownWheel.teeth).toFixed(6)}`);
console.log(`  full wind from empty: ${(S.barrelTurns * S.keyless.ratchet.teeth / S.keyless.windingPinion.teeth).toFixed(1)} crown turns; ${(S.keyless.windingPinion.teeth / S.keyless.ratchet.teeth * 360).toFixed(1)}° of ratchet per crown turn`);
const R = AT.ratios;
const star = R.reverserStar * S.automatic.ratchetPerRotorRad;
(Math.abs(star - 3) < 1e-9 ? ok : err)(`one-way reverser pinion turns ${star.toFixed(6)} × the rotor (= rotor wheel 60 / reverser 20)`);
console.log(`  ratchet per rotor radian 1/${(1 / S.automatic.ratchetPerRotorRad).toFixed(1)}; windPerRad ${S.automatic.windPerRad.toExponential(3)}; full wind ≈ ${(1 / S.automatic.windPerRad / TAU).toFixed(0)} rotor turns`);
console.log(`  auto ratios × rot.ratchet: ${Object.entries(R).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(', ')}`);
console.log(`  hand-winding ratios × rot.ratchet: ${Object.entries(WT.ratios).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(', ')}`);
const st = kin.update();
(Number.isFinite(st.rot.rotor) && Number.isFinite(st.rot.date) ? ok : err)(`update() runs: ${Object.keys(st.rot).length} rot keys, datePos ${st.datePos.toFixed(3)}, day ${st.day}`);
for (const k of ['ratchet', 'crownWheel', 'stem', 'rotor', 'date', 'dateSwitch', 'dateDrive', 'settingWheel', 'balance', 'fork', 'hourHand', 'minuteHand', 'secondHand']) if (!(k in st.rot)) err(`state.rot.${k} missing`);
(Math.abs(st.rot.crownWheel - WT.ratios.crownWheel * st.rot.ratchet) < 1e-9 ? ok : err)('engine rot.crownWheel = windingTrain.ratios.crownWheel × rot.ratchet');
(Math.abs(st.rot.stem - WT.ratios.windingPinion * st.rot.ratchet) < 1e-9 ? ok : err)('engine rot.stem = windingTrain.ratios.windingPinion × rot.ratchet (winding pinion; the crown uses the manual part only)');
head('2b. Date ring ↔ dial mapping (ring driven by rot.date = −2π·datePos/31)');
const step = S.date.stepDeg;
for (const D of [1, 3, 15, 16, 29, 30, 31]) {
  const rotDeg = (-360 * (D - 1)) / 31;
  const marks = S.date.markers.localClockDeg.map((c) => (((c - rotDeg) % 360) + 360) % 360); // rotation.z < 0 = clockwise = clock angle grows
  const numeral = S.dial.dateNumerals.clockDegOf(D);
  const near = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180) < 1e-6;
  (near(marks[0], numeral - step / 2) && near(marks[1], numeral + step / 2) ? ok : err)(`date ${String(D).padStart(2)}: numeral at ${numeral.toFixed(2)}°, markers at ${marks.map((m) => m.toFixed(2)).join('° / ')}° = slots ${marks.map((m) => (m / step - 0.5).toFixed(0)).join(' & ')}`);
}
const inv = S.dial.dateNumerals.inverted;
const invOK = inv.length === 14 && inv.every((d, i) => d === 9 + i) && inv.every((d) => inv.includes(31 - d));
(invOK ? ok : err)(`inverted numerals ${inv[0]}–${inv[inv.length - 1]} (${S.dial.dateNumerals.clockDegOf(inv[0]).toFixed(1)}°–${S.dial.dateNumerals.clockDegOf(inv[inv.length - 1]).toFixed(1)}°), symmetric about 6 o'clock; 8 and 23 stay upright`);
(S.dateChange && S.dateChange.type === 'drag' && S.dateChange.durationSec === 1800 ? ok : err)('dateChange: drag over 1800 s (23:45 → 00:15)');
console.log(`  switching hook: local math angle ${S.date.switching.hookAngleAtMidnightDeg.toFixed(2)}° at midnight, reach ${(Math.hypot(...L.dateSwitch) + S.date.switching.hookReach).toFixed(2)} mm (ring tooth tips ${S.date.ring.toothTipRadius})`);
(Math.abs(((S.date.jumper.beakClockDeg / step) % 1) - 0.5) < 1e-9 ? ok : err)(`jumper beak at clock ${S.date.jumper.beakClockDeg.toFixed(2)}° = a tooth gap for every whole date`);

// ------------------------------------------------------------------ 3. solids
const circle = (c, r) => ({ t: 'c', c, r });
const ring = (c, r0, r1) => ({ t: 'a', c, r0, r1 });
const poly = (pts) => ({ t: 'p', pts });
const rect = (x0, x1, y0, y1) => ({ t: 'r', x0, x1, y0, y1 });
const minus = (a, ...b) => ({ t: '-', a, b });
const union = (...a) => ({ t: 'u', a });
const capsule = (p, q, r) => ({ t: 'k', p, q, r });
function pinPoly(pts, x, y) {
  let s = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s;
  }
  return s;
}
function inside(s, x, y) {
  switch (s.t) {
    case 'c': return (x - s.c[0]) ** 2 + (y - s.c[1]) ** 2 < s.r * s.r;
    case 'a': { const d2 = (x - s.c[0]) ** 2 + (y - s.c[1]) ** 2; return d2 < s.r1 * s.r1 && d2 > s.r0 * s.r0; }
    case 'p': return pinPoly(s.pts, x, y);
    case 'r': return x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1;
    case '-': return inside(s.a, x, y) && !s.b.some((b) => inside(b, x, y));
    case 'u': return s.a.some((a) => inside(a, x, y));
    case 'k': {
      const [px, py] = s.p, [qx, qy] = s.q, dx = qx - px, dy = qy - py, l2 = dx * dx + dy * dy || 1e-12;
      const t = Math.max(0, Math.min(1, ((x - px) * dx + (y - py) * dy) / l2));
      return (x - px - dx * t) ** 2 + (y - py - dy * t) ** 2 < s.r * s.r;
    }
    default: throw new Error(s.t);
  }
}
function bbox(s) {
  switch (s.t) {
    case 'c': return [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r];
    case 'a': return [s.c[0] - s.r1, s.c[1] - s.r1, s.c[0] + s.r1, s.c[1] + s.r1];
    case 'p': return [Math.min(...s.pts.map((p) => p[0])), Math.min(...s.pts.map((p) => p[1])), Math.max(...s.pts.map((p) => p[0])), Math.max(...s.pts.map((p) => p[1]))];
    case 'r': return [s.x0, s.y0, s.x1, s.y1];
    case '-': return bbox(s.a);
    case 'u': { const b = s.a.map(bbox); return [Math.min(...b.map((v) => v[0])), Math.min(...b.map((v) => v[1])), Math.max(...b.map((v) => v[2])), Math.max(...b.map((v) => v[3]))]; }
    case 'k': return [Math.min(s.p[0], s.q[0]) - s.r, Math.min(s.p[1], s.q[1]) - s.r, Math.max(s.p[0], s.q[0]) + s.r, Math.max(s.p[1], s.q[1]) + s.r];
    default: throw new Error(s.t);
  }
}
function hull(points) { // monotone chain
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const circlePts = (c, r, n = 48) => [...Array(n)].map((_, i) => [c[0] + r * Math.cos((i / n) * TAU), c[1] + r * Math.sin((i / n) * TAU)]);

const solids = [];
const add = (id, part, shape, z, extra = {}) => solids.push({ id, part, shape, z, bb: bbox(shape), ...extra });
// cylinder about +X (stem, its pinions, the crown): plan rectangle, z depends on y
const cylX = (x0, x1, r, axisY = S.stemY, axisZ = Z.stemAxis) => ({
  shape: rect(x0, x1, axisY - r, axisY + r),
  z: (x, y) => { const h = Math.sqrt(Math.max(0, r * r - (y - axisY) ** 2)); return [axisZ - h, axisZ + h]; },
  zr: [axisZ - r, axisZ + r],
});

const F = S.frame, C = S.case, E = S.escapement;
const R34 = F.threeQuarterPlateRadius, RP = F.pillarPlateRadius;
const cut = poly(F.threeQuarterCut);
const pocketHull = poly(hull(F.windingPocket.flatMap((c) => circlePts(c.c, c.r))));
const slot34 = rect(F.windingPinionSlot.x[0], F.windingPinionSlot.x[1], F.windingPinionSlot.y[0], F.windingPinionSlot.y[1]);
const keySlot = rect(F.windingPinionKeySlot.x[0], F.windingPinionKeySlot.x[1], F.windingPinionKeySlot.y[0], F.windingPinionKeySlot.y[1]);
const stemChannel = rect(5.0, 15.6, -0.55, 0.55);
const stemPassage = rect(F.stemPassage.x[0], F.stemPassage.x[1], F.stemPassage.y[0], F.stemPassage.y[1]);
const csNotch = circle(F.casingScrew.at, F.casingScrew.notchRadius);
const feet = S.dial.feet.clockDeg.map((d) => [S.dial.feet.r * Math.sin(d * DEG), S.dial.feet.r * Math.cos(d * DEG)]);
const footHoles = feet.map((p) => circle(p, S.dial.feet.radius + 0.03));
const ringJewelHoles = F.ringSupportJewels.map((p) => circle(p, F.ringSupportJewelDiameter / 2 + 0.02));
const shockHole = circle(L.balance, E.shockLower.radius + 0.05);
const dialRec = F.dialSideRecesses;
const motionRec = union(...dialRec.motion.map((c) => circle(c.c, c.r)));
const dateRec = union(...dialRec.date.map((c) => circle(c.c, c.r)));
const setRec = union(...dialRec.setting.map((c) => circle(c.c, c.r)));
const keyRec = poly(dialRec.keyless);
const winWindow = poly(F.windingWindow);
const revWin = circle(F.reverserWindow.c, F.reverserWindow.r);
const groove = ring([0, 0], F.rotorWheelGroove.rIn, F.rotorWheelGroove.rOut);
const wz = (zc) => [zc - Z.wheelThickness / 2, zc + Z.wheelThickness / 2];

// ---- pillar plate (layers)
add('plate core top', 'main-plate', minus(circle([0, 0], RP), keySlot, motionRec, dateRec, setRec, keyRec, shockHole, ...footHoles, ...ringJewelHoles), [-0.35, 0]);
add('plate core recess layer', 'main-plate', minus(circle([0, 0], RP), keySlot, setRec, shockHole, ...footHoles), [-0.56, -0.35]);
add('plate core over stem', 'main-plate', minus(circle([0, 0], RP), keySlot, ...footHoles), [-0.60, -0.56]);
add('plate core low', 'main-plate', minus(circle([0, 0], RP), keySlot, stemChannel, ...footHoles), [-0.95, -0.60]);
add('pillar ring', 'main-plate', minus(ring([0, 0], R34, RP), cut, keySlot, stemPassage), [Z.pillarRimTop, -0.95]);
for (const [i, s] of F.balanceBridge.seats.entries()) add(`bridge seat ${i}`, 'main-plate', poly(s), [Z.pillarRimTop, -0.95]);
// ---- 3/4 plate
add('3/4 plate upper', 'three-quarter-plate', minus(circle([0, 0], R34), cut, pocketHull, revWin, groove, slot34, csNotch), [-2.45, -2.26]);
add('3/4 plate lower', 'three-quarter-plate', minus(circle([0, 0], R34), cut, winWindow, slot34, circle(L.reverser, 0.62), csNotch), [-2.21, -2.10]);
// ---- going train & barrel
add('centre wheel', 'center-wheel', circle(L.center, wheelTip(TR.center.teeth, MD.center)), wz(Z.centerWheel));
add('centre pinion', 'center-wheel', circle(L.center, pinionTip(TR.center.pinion, MD.barrel)), Z.pinionOf.center);
add('third wheel', 'third-wheel', circle(L.third, wheelTip(TR.third.teeth, MD.third)), wz(Z.thirdWheel));
add('third pinion', 'third-wheel', circle(L.third, pinionTip(TR.third.pinion, MD.center)), Z.pinionOf.third);
add('third arbor', 'third-wheel', circle(L.third, 0.12), [Z.thirdWheel, Z.pinionOf.third[0]]);
add('fourth wheel', 'fourth-wheel', circle(L.fourth, wheelTip(TR.fourth.teeth, MD.fourth)), wz(Z.fourthWheel));
add('fourth pinion', 'fourth-wheel', circle(L.fourth, pinionTip(TR.fourth.pinion, MD.third)), Z.pinionOf.fourth);
add('escape wheel', 'escape-wheel', circle(L.escape, E.escapeTipRadius), wz(Z.escapeWheel));
add('escape pinion', 'escape-wheel', circle(L.escape, pinionTip(TR.escape.pinion, MD.fourth)), Z.pinionOf.escape);
add('barrel drum', 'barrel', circle(L.barrel, 5.10), Z.barrel);
add('barrel teeth', 'barrel', ring(L.barrel, 5.10, wheelTip(TR.barrel.teeth, MD.barrel)), Z.barrelTeeth);
// ---- escapement
const toBal = Math.atan2(L.balance[1] - L.pallet[1], L.balance[0] - L.pallet[0]);
const forkHead = [L.pallet[0] + (E.palletToBalance - 0.42) * Math.cos(toBal), L.pallet[1] + (E.palletToBalance - 0.42) * Math.sin(toBal)];
add('pallet fork', 'pallet-fork', union(circle(L.pallet, 1.45), capsule(L.pallet, forkHead, 0.36)), [Z.palletFork - 0.06, Z.palletFork + 0.09]);
add('roller', 'roller', circle(L.balance, 0.95), [Z.roller - 0.10, Z.roller + 0.12]);
add('balance rim', 'balance-wheel', ring(L.balance, E.balanceRadius - E.balanceRimWidth, E.balanceRadius), Z.balanceRimRange);
add('balance arms', 'balance-wheel', circle(L.balance, E.balanceRadius - E.balanceRimWidth), [Z.balanceRimRange[0], Z.balanceRimRange[0] + 0.15]);
add('hairspring', 'hairspring', circle(L.balance, E.hairspring.terminalRadius + 0.06), Z.hairspringRange);
add('pallet bridge', 'pallet-bridge', poly(F.palletBridge.outline), Z.palletBridge);
add('balance bridge', 'balance-bridge', poly(F.balanceBridge.outline), Z.balanceBridge);
add('regulator', 'regulator', ring(L.balance, E.regulatorRings.key[0], 3.20), Z.regulatorRings);
add('shock top', 'shock-absorber', circle(L.balance, E.shockSettingRadius), [Z.shockTop, -2.45]);
add('shock lower', 'shock-absorber-lower', circle(L.balance, E.shockLower.radius), E.shockLower.z);
// ---- hand winding
add('ratchet', 'ratchet-wheel', circle(L.barrel, wheelTip(WT.ratchet.teeth, MD.windC)), Z.ratchetWheel);
add('click', 'click', capsule(WT.click.pivot, WT.click.beak, 0.35), Z.ratchetClick);
add('click spring', 'click-spring', capsule(WT.click.springAnchor, [WT.click.pivot[0] + 0.3, WT.click.pivot[1] + 0.6], 0.15), Z.ratchetClick);
add('idler 2 lower (gilt)', 'transmission-wheel', circle(L.windIdler2, wheelTip(WT.idler2.lowerTeeth, MD.windC)), Z.W0);
add('crown wheel', 'crown-wheel', circle(L.crownWheel, wheelTip(WT.crownWheel.teeth, MD.windA)), Z.crownWheel);
add('crown-wheel cover', 'crown-wheel-cover', circle(L.crownWheel, F.crownWheelCoverDisc.r), [Z.crownWheelCover[0] - 0.05, Z.crownWheelCover[1]]);
add('idler 1', 'winding-idlers', circle(L.windIdler1, wheelTip(WT.idler1.teeth, MD.windA)), Z.windIdlers);
add('idler 2 upper', 'winding-idlers', circle(L.windIdler2, wheelTip(WT.idler2.teeth, MD.windB)), Z.windIdlers);
add('idler caps', 'winding-idlers', union(circle(L.windIdler1, 0.80), circle(L.windIdler2, 1.0)), [Z.windIdlerCaps[0] - 0.02, Z.windIdlerCaps[1]]);
// ---- automatic
const AL = Z.autoLevels;
add('A wheel', 'winding-train', circle(L.autoA, wheelTip(AT.A.teeth, MD.autoRA)), AL.A.wheel);
add('A pinion', 'winding-train', circle(L.autoA, pinionTip(AT.A.pinion, MD.autoAB)), AL.A.pinion);
add('B wheel', 'winding-train', circle(L.autoB, wheelTip(AT.B.teeth, MD.autoAB)), AL.B.wheel);
add('B pinion', 'winding-train', circle(L.autoB, pinionTip(AT.B.pinion, MD.autoBC)), AL.B.pinion);
add('C wheel', 'winding-train', circle(L.autoC, wheelTip(AT.C.teeth, MD.autoBC)), AL.C.wheel);
add('C pinion', 'winding-train', circle(L.autoC, pinionTip(AT.C.pinion, MD.autoCD)), AL.C.pinion);
add('D wheel', 'winding-train', circle(L.autoD, wheelTip(AT.D.teeth, MD.autoCD)), AL.D.wheel);
add('D pinion', 'winding-train', circle(L.autoD, pinionTip(AT.D.pinion, MD.autoT)), AL.D.pinion);
add('T wheel', 'winding-train', circle(L.autoT, wheelTip(AT.T.teeth, MD.autoT)), AL.T.wheel);
add('reverser wheel', 'reversing-wheels', circle(L.reverser, wheelTip(AT.reverser.teeth, MD.rotorWheel)), Z.reverserWheel);
add('reverser star', 'reversing-wheels', circle(L.reverser, 1.0), Z.reverserStar);
add('reverser cover', 'reversing-wheels', circle(L.reverser, 0.95), Z.reverserCover);
add('reverser pinion', 'reversing-wheels', circle(L.reverser, pinionTip(AT.reverser.pinion, MD.autoRA)), Z.reverserPinion);
const RR = S.rotor.radii;
const rwRoot = wheelRoot(AT.rotorWheel.teeth, MD.rotorWheel), rwTip = wheelTip(AT.rotorWheel.teeth, MD.rotorWheel);
add('rotor wheel teeth', 'rotor', ring([0, 0], rwRoot, rwTip), Z.rotorWheelTeeth);
add('rotor wheel body', 'rotor', ring([0, 0], RR.collarInner, rwTip), [Z.rotorCollar[1], Z.rotorWheelTeeth[0]]);
add('rotor collar', 'rotor', ring([0, 0], RR.collarInner, RR.collar), Z.rotorCollar);
{ // the rotor turns: its swept volume, zone by zone (bar/step, lettered flat, bevel, skirt)
  const zr = (x, y) => {
    const r = Math.hypot(x, y);
    const under = r >= RR.skirt ? Z.rotorSkirtUnder : Z.rotorRimUnder;
    if (r < RR.rimFlatInner) return [Z.rotorRimInnerTop, Z.rotorRimUnder];
    if (r < RR.rimFlatOuter) return [Z.rotorLettersTop, Z.rotorRimUnder];
    return [Z.rotorRimTop + ((Z.rotorBevelOuterTop - Z.rotorRimTop) * (r - RR.rimFlatOuter)) / (RR.outer - RR.rimFlatOuter), under];
  };
  add('rotor sweep', 'rotor', ring([0, 0], RR.collar, RR.outer), zr, { zr: [Z.rotorLettersTop, Z.rotorSkirtUnder] });
}
add('bearing disc', 'rotor-bearing', circle([0, 0], S.rotor.bearing.fixedDiscRadius), [Z.bearingScrewTop, Z.bearingDisc[1]]);
add('bearing balls', 'rotor-bearing', ring([0, 0], S.rotor.bearing.ballPathRadius - 0.125, S.rotor.bearing.ballPathRadius + 0.125), [Z.bearingBalls - 0.125, Z.bearingBalls + 0.125]);
add('bayonet ring', 'rotor-bearing', ring([0, 0], S.rotor.bearing.bayonetRing[0], S.rotor.bearing.bayonetRing[1]), Z.bayonetRing);
// ---- screws
F.blueScrews.forEach((p, i) => add(`blue screw S${i + 1}`, i === 2 || i === 3 ? 'balance-bridge' : 'plate-screws', circle(p, F.blueScrewHeadDiameter / 2), Z.screwHeads));
F.steelScrews.crownWheelCover.forEach((p, i) => add(`cover screw ${i}`, 'crown-wheel-cover', circle(p, F.steelScrews.crownWheelCoverHeadDiameter / 2), [-2.58, -2.53]));
const cs = F.casingScrew.at, csU = [cs[0] / Math.hypot(...cs), cs[1] / Math.hypot(...cs)];
add('casing screw', 'case-clamps', union(circle(cs, F.casingScrew.headDiameter / 2), capsule(cs, [csU[0] * F.casingScrew.clampReach, csU[1] * F.casingScrew.clampReach], F.casingScrew.clampHalfWidth)), Z.casingScrewHead);
// ---- case
const CR = C.casingRing, stemSlotCR = rect(14.5, 19, -CR.stemSlotHalfWidth, CR.stemSlotHalfWidth);
add('casing ring lip', 'casing-ring', minus(ring([0, 0], CR.inner, CR.lipOuter), stemSlotCR), [CR.lipBack, CR.z[1]]);
add('casing ring body', 'casing-ring', minus(ring([0, 0], CR.lipOuter, CR.outer), stemSlotCR), CR.z);
add('casing ring dial seat', 'casing-ring', ring([0, 0], CR.dialSeat.inner, CR.outer), [CR.z[1], CR.dialSeat.z]);
add('middle case low', 'case-body', ring([0, 0], C.middle.boreBelowDial, C.radius), [C.middle.bottom, -1.62]);
add('middle case at stem', 'case-body', minus(ring([0, 0], C.middle.boreBelowDial, C.radius), rect(17, 20, -0.62, 0.62)), [-1.62, -0.56]);
add('middle case high', 'case-body', ring([0, 0], C.middle.boreBelowDial, C.radius), [-0.56, 0.80]);
add('middle case flange', 'case-body', ring([0, 0], C.flange.inner, C.radius), [0.80, C.middle.top]);
add('bezel', 'bezel', ring([0, 0], C.crystal.seatRadius, C.radius), [C.bezel.bottom, C.bezel.top]);
add('bezel lip', 'bezel', ring([0, 0], C.crystal.radius, C.crystal.seatRadius), [2.42, C.bezel.top]);
add('crystal', 'crystal', circle([0, 0], C.crystal.radius), C.crystal.z);
add('crystal seat', 'crystal', ring([0, 0], C.crystal.radius, C.crystal.seatRadius - 0.02), [C.crystal.z[0], 2.40]);
add('case back ring', 'caseback-ring', ring([0, 0], C.caseback.glassSeatRadius, C.caseback.outerRadius), [Z.backGlass[0], C.caseback.top]);
add('case back lip', 'caseback-ring', ring([0, 0], C.caseback.aperture, C.caseback.outerRadius), [C.caseback.bottom, Z.backGlass[0]]);
add('back glass', 'caseback-glass', circle([0, 0], C.backGlass.radius - 0.01), Z.backGlass);
const crown = cylX(C.crown.from, C.crown.to, C.crown.radius);
add('crown', 'crown', crown.shape, crown.z, { zr: crown.zr });
const stx = C.stem;
const stem = cylX(stx.pilot, stx.end, 0.45);
add('winding stem', 'winding-stem', stem.shape, stem.z, { zr: stem.zr });
const sp = cylX(C.slidingPinionX[0], C.slidingPinionX[1], 0.85);
add('sliding pinion', 'sliding-pinion', sp.shape, sp.z, { zr: sp.zr });
const wp = cylX(stx.wpTeeth[0], stx.wpTeeth[1], wheelTip(WT.windingPinion.teeth, MD.windA));
add('winding pinion', 'winding-pinion', wp.shape, wp.z, { zr: wp.zr });
const wph = cylX(stx.wpIn, stx.wpOut, 0.80);
add('winding pinion hub', 'winding-pinion', wph.shape, wph.z, { zr: wph.zr });
// ---- dial side
add('cannon leaves', 'cannon-pinion', circle(L.center, pinionTip(TR.cannon.teeth, MD.motionA)), Z.cannonLeaves);
add('cannon pipe', 'cannon-pinion', circle(L.center, 0.45), [Z.cannonLeaves[1], Z.hourPipeTop + 0.01]);
add('cannon pipe top', 'cannon-pinion', circle(L.center, 0.40), [Z.hourPipeTop + 0.01, Z.cannonTop]);
add('minute wheel', 'minute-wheel', circle(L.minuteWheel, wheelTip(TR.minuteWheel.teeth, MD.motionA)), Z.minuteWheel);
add('minute pinion', 'minute-wheel', circle(L.minuteWheel, pinionTip(TR.minuteWheel.pinion, MD.motionB)), Z.minutePinion);
add('hour wheel', 'hour-wheel', ring(L.center, 0.47, wheelTip(TR.hourWheel.teeth, MD.motionB)), Z.hourWheel);
add('hour pipe', 'hour-wheel', ring(L.center, 0.47, 0.65), [Z.hourWheel[1], Z.hourPipeTop]);
add('date drive star', 'date-drive-wheel', circle(L.dateDrive, wheelTip(DT.driveStar.teeth, MD.dateStar)), Z.dateDriveStar);
add('date drive wheel', 'date-drive-wheel', circle(L.dateDrive, wheelTip(DT.driveWheel.teeth, MD.dateWheel)), Z.dateDriveWheel);
add('date drive screw', 'date-drive-wheel', circle(L.dateDrive, 0.50), Z.dateDriveScrew);
add('date idler 1', 'date-idlers', circle(L.dateIdler1, wheelTip(DT.idler1.teeth, MD.dateWheel)), Z.dateIdlers);
add('date idler 2', 'date-idlers', circle(L.dateIdler2, wheelTip(DT.idler2.teeth, MD.dateWheel)), Z.dateIdlers);
add('date idler 2 pinion', 'date-idlers', circle(L.dateIdler2, pinionTip(DT.idler2.pinion, MD.dateCarrier)), Z.dateIdler2Pinion);
add('date carrier', 'date-wheels', circle(L.dateSwitch, wheelTip(DT.carrier.teeth, MD.dateCarrier)), Z.dateCarrier);
add('program wheel', 'date-wheels', circle(L.dateSwitch, wheelTip(DT.programWheel.teeth, MD.programWheel)), Z.programWheel);
add('date cam', 'date-wheels', circle(L.dateSwitch, S.date.switching.camRadius), Z.dateCam);
add('date click sweep', 'date-wheels', circle(L.dateSwitch, S.date.switching.hookReach), Z.dateClick);
const jb = [S.date.jumper.beakRadius * Math.sin(S.date.jumper.beakClockDeg * DEG), S.date.jumper.beakRadius * Math.cos(S.date.jumper.beakClockDeg * DEG)];
add('date jumper', 'date-jumper', capsule(S.date.jumper.anchor, jb, 0.3), Z.dateJumper);
add('quick-set wheel', 'date-corrector', circle(L.quickSetStar, wheelTip(DT.quickSetWheel.teeth, MD.quickSet)), Z.quickSetWheel);
add('quick-set idler', 'date-corrector', circle(L.quickSetIdler, wheelTip(DT.quickSetIdler.teeth, MD.quickSet)), Z.quickSetIdler);
add('quick-set star', 'date-corrector', circle(L.quickSetStar, S.date.corrector.armTipRadius), Z.quickSetStar);
add('setting wheel', 'setting-wheel', circle(L.settingWheel, wheelTip(WT.settingWheel.teeth, MD.setting)), Z.settingWheels);
add('setting idler', 'setting-idler', circle(L.settingIdler, wheelTip(WT.settingIdler.teeth, MD.setting)), Z.settingWheels);
const DB = S.date.bridges;
add('date bridge', 'date-bridge', poly(DB.date), Z.dateBridge);
add('motion bridge', 'motion-bridge', minus(poly(DB.motion), circle(L.center, 0.75)), Z.motionBridge);
add('keyless bridge', 'keyless-bridge', poly(DB.keyless), Z.keylessBridge);
add('dial-side lower bridge', 'dial-side-bridge', poly(DB.lower), Z.lowerBridge);
add('ring support jewels', 'jewels', union(...F.ringSupportJewels.map((p) => circle(p, F.ringSupportJewelDiameter / 2))), [-0.30, Z.ringJewelTop]);
add('date ring', 'date-ring', ring([0, 0], S.date.ring.toothTipRadius, S.date.ring.outerRadius), Z.dateRing);
add('dial', 'dial', minus(ring([0, 0], S.dial.centreHoleRadius, S.dial.radius), circle(S.dial.subdial.center, S.dial.subdial.recessRadius)), Z.dial);
add('subdial floor', 'small-seconds', minus(circle(S.dial.subdial.center, S.dial.subdial.recessRadius), circle(S.dial.subdial.center, 0.3)), [Z.dial[0], Z.subdialFloor]);
feet.forEach((p, i) => add(`dial foot ${i}`, 'dial-feet', circle(p, S.dial.feet.radius), Z.dialFeet));
const H = S.hands;
add('seconds hand', 'seconds-hand', ring(S.dial.subdial.center, H.bores.seconds, H.seconds.tip), [Z.secondsHand, Z.secondsHubTop]);
add('hour hand', 'hour-hand', ring(L.center, H.bores.hour, H.hour.tip), [Z.hourHand, Z.hourColletTop]);
add('minute hand', 'minute-hand', ring(L.center, H.bores.minute, H.minute.tip), [Z.minuteHand, Z.minuteColletTop]);
add('centre cap', 'minute-hand', circle(L.center, H.capRadius), [Z.minuteColletTop, Z.centerCapTop]);

// intended contacts at assembly (meshes, contrate, detents, coaxial passages)
const meant = new Set([
  'centre pinion|barrel teeth', 'centre wheel|third pinion', 'third wheel|fourth pinion', 'fourth wheel|escape pinion',
  'cannon leaves|minute wheel', 'minute pinion|hour wheel', 'hour wheel|date drive star', 'minute wheel|setting wheel',
  'setting wheel|setting idler', 'setting idler|sliding pinion', 'date drive wheel|date idler 1', 'date idler 1|date idler 2',
  'date idler 2 pinion|date carrier', 'quick-set wheel|quick-set idler', 'date click sweep|date ring', 'date jumper|date ring',
  'winding pinion|crown wheel', 'crown wheel|idler 1', 'idler 1|idler 2 upper', 'idler 2 lower (gilt)|ratchet', 'T wheel|ratchet',
  'D pinion|T wheel', 'reverser pinion|A wheel', 'A pinion|B wheel', 'B pinion|C wheel', 'C pinion|D wheel',
  'rotor wheel teeth|reverser wheel', 'escape wheel|pallet fork', 'pallet fork|roller',
  'winding stem|sliding pinion', 'winding stem|winding pinion', 'winding stem|winding pinion hub', 'winding stem|crown',
  'click|ratchet', 'click|click spring',
]);
const isMeant = (a, b) => meant.has(`${a}|${b}`) || meant.has(`${b}|${a}`);
// Real interlock: the fourth wheel's rim runs between the third mobile's pinion (L0) and
// wheel (L2), 0.24 mm from the third arbor — no straight pull separates them (in the
// workshop they go in tilted together). The thin pinion passes the fourth wheel's rim
// for a moment while exploding; accepted.
const interlocks = new Set(['third pinion|fourth wheel']);
const isInterlock = (a, b) => interlocks.has(`${a}|${b}`) || interlocks.has(`${b}|${a}`);

const STEP = 0.05;
let lastAt = [0, 0];
const zAt = (s, x, y, dz = 0) => { const r = typeof s.z === 'function' ? s.z(x, y) : s.z; return [r[0] + dz, r[1] + dz]; };
const zBox = (s) => s.zr || s.z;
function overlap(A, B, oA = [0, 0, 0], oB = [0, 0, 0], eps = 1e-3) {
  const za = zBox(A), zbx = zBox(B);
  if (!(za[0] + oA[2] < zbx[1] + oB[2] - eps && zbx[0] + oB[2] < za[1] + oA[2] - eps)) return 0;
  const x0 = Math.max(A.bb[0] + oA[0], B.bb[0] + oB[0]), x1 = Math.min(A.bb[2] + oA[0], B.bb[2] + oB[0]);
  const y0 = Math.max(A.bb[1] + oA[1], B.bb[1] + oB[1]), y1 = Math.min(A.bb[3] + oA[1], B.bb[3] + oB[1]);
  if (x0 >= x1 || y0 >= y1) return 0;
  let n = 0, sx = 0, sy = 0;
  for (let x = x0 + STEP / 2; x < x1; x += STEP) {
    for (let y = y0 + STEP / 2; y < y1; y += STEP) {
      const xa = x - oA[0], ya = y - oA[1], xb = x - oB[0], yb = y - oB[1];
      if (!inside(A.shape, xa, ya) || !inside(B.shape, xb, yb)) continue;
      const a = zAt(A, xa, ya, oA[2]), b = zAt(B, xb, yb, oB[2]);
      if (a[0] < b[1] - eps && b[0] < a[1] - eps) { n++; sx += x; sy += y; }
    }
  }
  if (n) lastAt = [sx / n, sy / n];
  return n;
}

head(`3. Vertical stack: ${solids.length} solids — plan overlap ⇒ disjoint z (grid ${STEP} mm)`);
{
  const bad = solids.filter((s) => { const r = zBox(s); return !(r[0] < r[1]); });
  (bad.length ? err : ok)(`every solid has z0 < z1${bad.length ? `: ${bad.map((s) => `${s.id} [${zBox(s).join(', ')}]`).join('; ')}` : ''}`);
}
const assembledContacts = new Set();
let collisions = 0;
for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const A = solids[i], Bs = solids[j];
    if (A.part === Bs.part && !isMeant(A.id, Bs.id)) continue; // a part's own solids
    const n = overlap(A, Bs);
    if (!n) continue;
    assembledContacts.add(`${A.id}|${Bs.id}`);
    if (isMeant(A.id, Bs.id)) continue;
    collisions++;
    err(`${A.id} [${A.part}] ∩ ${Bs.id} [${Bs.part}]: ${(n * STEP * STEP).toFixed(3)} mm² around (${f3(lastAt[0])}, ${f3(lastAt[1])})`);
  }
}
if (!collisions) ok('no unintended overlaps at assembly');
for (const m of meant) {
  const [a, b] = m.split('|');
  if (!assembledContacts.has(`${a}|${b}`) && !assembledContacts.has(`${b}|${a}`)) warn(`intended contact ${a} ↔ ${b} does not overlap (check the engagement)`);
}

// ------------------------------------------------------------------ 4. explode sweep
if (!quick) {
  head('4. Explode sweep (registry easing + SPEC.explodeDelay): nothing passes through anything');
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const offAt = (part, e) => {
    const v = S.explode[part] || [0, 0, 0];
    const local = Math.min(1, Math.max(0, (e - S.explodeDelay(part) * 0.45) / 0.55));
    const k = ease(local);
    return [v[0] * k, v[1] * k, v[2] * k];
  };
  let crossings = 0;
  const seen = new Set();
  for (let s = 1; s <= 50; s++) {
    const e = s / 50;
    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const A = solids[i], Bs = solids[j];
        if (A.part === Bs.part) continue;
        const key = `${A.id}|${Bs.id}`;
        if (assembledContacts.has(key) || seen.has(key)) continue;
        const n = overlap(A, Bs, offAt(A.part, e), offAt(Bs.part, e));
        if (!n) continue;
        seen.add(key);
        if (isInterlock(A.id, Bs.id)) { warn(`explode ${e.toFixed(2)}: ${A.id} passes ${Bs.id} — known interlock`); continue; }
        crossings++;
        err(`explode ${e.toFixed(2)}: ${A.id} [${A.part}] passes through ${Bs.id} [${Bs.part}] around (${f3(lastAt[0])}, ${f3(lastAt[1])})`);
      }
    }
  }
  for (const key of assembledContacts) {
    const [a, b] = key.split('|');
    const A = solids.find((s) => s.id === a), Bs = solids.find((s) => s.id === b);
    if (A.part === Bs.part) continue;
    if (overlap(A, Bs, offAt(A.part, 1), offAt(Bs.part, 1))) { crossings++; err(`full explode: ${a} [${A.part}] still intersects ${b} [${Bs.part}]`); }
  }
  if (!crossings) ok('no part passes through another while exploding; every contact separates');
}

// ------------------------------------------------------------------ 5. explode table coverage
head('5. Explode table covers every planned part id');
const PLAN = {
  case: ['case-body', 'bezel', 'crystal', 'casing-ring', 'case-clamps', 'lugs', 'spring-bars', 'crown', 'caseback-ring', 'caseback-glass', 'strap-top', 'strap-bottom', 'buckle'],
  dial: ['dial', 'small-seconds', 'dial-feet', 'date-ring'],
  hands: ['hour-hand', 'minute-hand', 'seconds-hand'],
  train: ['barrel', 'mainspring', 'barrel-cover', 'barrel-arbor', 'center-wheel', 'third-wheel', 'fourth-wheel', 'cannon-pinion', 'minute-wheel', 'hour-wheel',
    'winding-stem', 'winding-pinion', 'sliding-pinion', 'setting-wheel', 'setting-idler', 'setting-lever', 'yoke', 'keyless-springs', 'stop-seconds-lever',
    'crown-wheel', 'crown-wheel-cover', 'winding-idlers', 'transmission-wheel', 'ratchet-wheel', 'click', 'click-spring'],
  date: ['date-wheels', 'date-drive-wheel', 'date-idlers', 'date-jumper', 'date-corrector', 'date-bridge', 'motion-bridge', 'keyless-bridge', 'dial-side-bridge'],
  automatic: ['rotor', 'rotor-bearing', 'reversing-wheels', 'winding-train'],
  escapement: ['escape-wheel', 'pallet-fork', 'balance-wheel', 'roller', 'hairspring', 'balance-bridge', 'regulator', 'shock-absorber', 'shock-absorber-lower'],
  frame: ['main-plate', 'three-quarter-plate', 'pallet-bridge', 'plate-screws', 'plate-engravings', 'jewels'],
};
const all = Object.values(PLAN).flat();
const dup = all.filter((id, i) => all.indexOf(id) !== i);
(dup.length ? err : ok)(`${all.length} part ids in ${Object.keys(PLAN).length} modules, ${dup.length ? `duplicates: ${dup.join(', ')}` : 'all unique'}`);
const missing = all.filter((id) => !S.explode[id]);
(missing.length ? err : ok)(`explode entries: ${missing.length ? `missing ${missing.join(', ')}` : 'all present'}`);
const extra = Object.keys(S.explode).filter((id) => !all.includes(id));
(extra.length ? warn : ok)(`explode entries without a planned part: ${extra.join(', ') || 'none'}`);
const badDelay = all.filter((id) => { const d = S.explodeDelay(id); return !(d >= 0 && d <= 0.95); });
(badDelay.length ? err : ok)(`explodeDelay in [0, 0.95] for every part${badDelay.length ? `: ${badDelay.join(', ')}` : ''}`);
const zs = Object.values(S.explode).map((v) => v[2]);
console.log(`  span: dial side up to +${Math.max(...zs)} mm, movement side down to ${Math.min(...zs)} mm; crown out to +${S.explode.crown[0]} mm in x`);

// ------------------------------------------------------------------ 6. misc geometry
head('6. Misc geometry');
let balOut = 0;
for (let k = 0; k < 360; k++) { const a = k * DEG, r = E.balanceRadius + 0.05; if (!pinPoly(F.threeQuarterCut, L.balance[0] + r * Math.cos(a), L.balance[1] + r * Math.sin(a))) balOut++; }
(balOut ? err : ok)(`balance rim (r ${E.balanceRadius}) inside the 3/4-plate cut-out (${balOut}/360 rim points outside)`);
const bridgeOut = F.balanceBridge.outline.filter((p) => !pinPoly(F.threeQuarterCut, p[0] * 0.999, p[1] * 0.999) && Math.hypot(...p) < R34 + 0.05);
(bridgeOut.length ? warn : ok)(`balance-bridge outline inside the cut-out (${bridgeOut.length} vertices on/outside the cut boundary)`);
const gapEF = hyp(L.escape, L.fourth) - E.escapeTipRadius - pinionTip(TR.fourth.pinion, MD.third);
(gapEF > 0.1 ? ok : err)(`escape wheel clears the fourth pinion (gap ${f3(gapEF)})`);
const gapFT = hyp(L.third, L.fourth) - wheelTip(TR.fourth.teeth, MD.fourth);
(gapFT > 0.18 ? ok : err)(`fourth wheel clears the third arbor axis by ${f3(gapFT)} mm (arbor r ≤ 0.12 at L1)`);
const gapTC = hyp(L.third, L.center) - wheelTip(TR.third.teeth, MD.third);
(gapTC > 0.4 ? ok : err)(`third wheel clears the centre arbor axis by ${f3(gapTC)} mm`);
const gapCF = hyp(L.center, L.fourth) - wheelTip(TR.center.teeth, MD.center);
(gapCF > 0.3 ? ok : err)(`centre wheel clears the fourth arbor axis by ${f3(gapCF)} mm`);
console.log(`  escape tip r ${f3(E.escapeTipRadius)}, pallet–escape ${f3(E.palletToEscape)}, pallet–balance ${f3(E.palletToBalance)}, roller jewel r ${f3(E.rollerJewelRadius)}`);
console.log(`  lines: escape→pallet ${f3(Math.atan2(L.pallet[1] - L.escape[1], L.pallet[0] - L.escape[0]) / DEG)}°, pallet→balance ${f3(Math.atan2(L.balance[1] - L.pallet[1], L.balance[0] - L.pallet[0]) / DEG)}°`);
for (const [n, c, r] of [['C wheel', L.autoC, wheelTip(AT.C.teeth, MD.autoBC)], ['D wheel', L.autoD, wheelTip(AT.D.teeth, MD.autoCD)], ['T wheel', L.autoT, wheelTip(AT.T.teeth, MD.autoT)], ['B wheel', L.autoB, wheelTip(AT.B.teeth, MD.autoAB)], ['ratchet', L.barrel, wheelTip(WT.ratchet.teeth, MD.windC)]]) {
  const reach = Math.hypot(...c) + r;
  (reach < R34 - 0.1 ? ok : err)(`${n} reaches r ${f3(reach)} (under the 3/4 plate, r ${R34})`);
}
for (const n of ['date', 'motion', 'keyless', 'lower']) {
  const rmax = Math.max(...S.date.bridges[n].map((p) => Math.hypot(...p)));
  (rmax < S.date.ring.toothTipRadius - 0.1 ? ok : err)(`${n} bridge max r ${f3(rmax)} (ring teeth at ${S.date.ring.toothTipRadius})`);
}
const starReach = Math.hypot(...L.quickSetStar) + S.date.corrector.armTipRadius;
(starReach < S.date.ring.toothTipRadius - 0.05 ? ok : err)(`corrector star reaches r ${f3(starReach)} at rest (clear of the ring teeth)`);
{
  const o = S.rotor.outline, w = S.rotor.window;
  const cen = (p) => { let cx = 0, cy = 0, A = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], c = a[0] * b[1] - b[0] * a[1]; A += c; cx += (a[0] + b[0]) * c; cy += (a[1] + b[1]) * c; } return [cx / (3 * A), cy / (3 * A), Math.abs(A / 2)]; };
  const [ox, oy, oa] = cen(o), [wx, wy, wa] = cen(w);
  const A = oa - wa, cx = (ox * oa - wx * wa) / A, cy = (oy * oa - wy * wa) / A;
  (cy < -5 && Math.abs(cx) < 1 ? ok : err)(`rotor plan area ${A.toFixed(0)} mm², centroid (${f3(cx)}, ${f3(cy)}) → heavy side on local −Y`);
}
console.log(`  movement ${f3(Z.rotorLettersTop)} … ${f3(Z.dateRing[1])} = ${f3(Z.dateRing[1] - Z.rotorLettersTop)} mm (NOMOS 3.6); case ${f3(Z.caseBottom)} … ${f3(Z.caseTop)} = ${f3(Z.caseTop - Z.caseBottom)} mm (NOMOS 7.4)`);
console.log(`  clearances: rotor letters → back glass ${f3(Z.rotorLettersTop - Z.backGlass[1])}, centre cap → crystal ${f3(Z.crystal[0] - Z.centerCapTop)}, date ring → dial ${f3(Z.dial[0] - Z.dateRing[1])}, slot depth (dial top → ring) ${f3(Z.dial[1] - Z.dateRing[1])}`);

console.log(`\n${errors ? 'FAILED' : 'PASSED'}: ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
