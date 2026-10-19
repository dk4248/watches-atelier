// Tudor Black Bay Pro ref. M79470-0004 ("Opaline") — automatic GMT caliber MT5652.
// Single source of truth for every dimension, position, level and ratio.
//
// Sources (see research/tudor-m79470/):
//  - exterior.md: case, bezel, crystal, crown, case back, bracelet, dial and hands, measured on
//    the official 4000 px press image (38.41 px/mm, outlines re-drawn onto the photo within
//    ≈0.05 mm); heights from five side photos normalised to the official 14.6 mm.
//  - movement.md: MT5652 layout, tooth counts, levels, finishing, rotor, bridges.
//  - plan.md: the lead's decisions (module split, part ids, seams, explode choreography).
//  Tags: [OFF] official, MEAS measured, ESTIMATE engineering value (self-consistent, not published).
//
// FRAME: mm. +Z out of the dial; 12 o'clock = +Y; 3 o'clock (crown) = +X. Movement parts use
// the SAME frame; back-view measurements (crown on the left) are converted with B(x, y).
// z = 0 is the dial-side face of the main plate. Exterior heights are Z_case (0 = lowest
// point of the case back, 14.60 = crystal apex) and are converted with zc().

const B = (x, y) => [-x, y]; // back-view measurement → dial-side frame
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const DEG = Math.PI / 180;
const polar = (r, degCW) => [r * Math.sin(degCW * DEG), r * Math.cos(degCW * DEG)]; // clock angle, CW from 12
const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const r3 = (v) => Math.round(v * 1000) / 1000;
const pts3 = (pts) => pts.map(([x, y]) => [r3(x), r3(y)]);
const backPoly = (pts) => pts3(pts.map(([x, y]) => B(x, y))); // back-view polygon → dial frame

// ================================================================ vertical datum
// The dial (0.40 thick, top edge at Z_case 9.75) rests on the movement's dial seat at Z_case
// 9.35. The MT5652 is 7.52 mm tall [OFF]: dial-side works hD + back side hB. Z_PLATE is the
// Z_case of z = 0; it also puts the crown axis (exterior estimate Z_case 6.45) on the stem,
// which runs inside the main plate.
const Z_PLATE = 7.43; // dial seat Z_case 9.35 − 1.92 of dial-side works
const zc = (Z) => +(Z - Z_PLATE).toFixed(3);

// ================================================================ arbor layout
// research/tudor-m79470/movement.md §3 (back view, measured on the registered 2018 render and
// the teardown photos, ±0.15 for jewels) — converted with B(). DIRECT centre seconds: the centre
// wheel turns at the centre under its own steel strap bridge; the fourth wheel sits
// concentrically above it and its long arbor runs through the hollow centre arbor to the
// seconds hand; the third wheel (3:24 back view) lies above the fourth wheel. The escapement
// line is bent ≈18.6° (escape → pallet → balance).
const P = {
  center: [0, 0],
  fourth: [0, 0],
  third: B(4.67, -0.99), // [H]
  escape: B(-3.19, -3.11), // [M-H]
  pallet: B(-2.25, -6.20), // [M-H] render value (the photo jewel reads 0.8 low: parallax)
  balance: B(-2.34, -9.28), // [H] three sources ±0.05
  barrel: B(-1.0, 7.6), // [M] ±0.4 = ratchet wheel / barrel arbor
  crownWheel: B(-6.4, 5.6), // [M] ±0.5
  click: B(-3.2, 10.9), // ESTIMATE: click pawl pivot on the barrel bridge
  // automatic train: jewel positions MEAS (in the automatic bridge), roles ESTIMATE
  reverserA: B(-3.18, 4.97),
  autoAux: B(6.48, 7.74), // fourth automatic-bridge jewel, unassigned (a jewel only)
  // dial side (dial frame directly) — schematic ESTIMATE (movement.md §6), lead corrections:
  // the minute wheel and the date driver are mirrored to x > 0 / x < 0 (sign slips in the report:
  // the setting wheel at 4 o'clock must mesh the minute wheel, and the dial-side teardown photos
  // b04–b07 show the date driver with its lever and long wire spring at the upper LEFT).
  minuteWheel: [2.70, -1.56],
  dateDriver: [-5.50, 2.00],
  hourSettingWheel: [8.99, -2.97], // crown position C train (meshes only while setting) b07 ±1
  settingIntermediate: [7.56, -5.88], // b07 ±1
};

// ================================================================ tooth counts
// movement.md §5: escape 20 MEAS; centre ≈90, third ≈96, barrel ≈105, ratchet ≈55, crown wheel
// 38–40 photo counts; pinions and the fourth wheel ESTIMATE. Lead change: third pinion 9 and fourth
// 120/16 with a 10-leaf escape pinion (report 12 / 96 / 12 / 8). Same periods (centre 1 h, fourth
// 1 min, escape 5 s), but the third pinion now CLEARS the fourth wheel's tips: the third arbor
// straddles the fourth wheel's level (pinion below it, wheel above it), so with the report's counts
// the pinion would overlap the fourth wheel by 0.10 and could neither be assembled nor exploded.
const train = {
  barrel: { teeth: 105 }, // teeth on the TOP (back) rim of the drum
  center: { teeth: 90, pinion: 14 },
  third: { teeth: 96, pinion: 9 },
  fourth: { teeth: 120, pinion: 16 },
  escape: { teeth: 20, pinion: 10 },
  cannon: { teeth: 12 },
  minuteWheel: { teeth: 40, pinion: 10 },
  hourWheel: { teeth: 36 }, // the hour-wheel DRIVER (reference 12 h); the local hour wheel rides on it via the jumper
};
// Keyless (movement.md §6.6, ESTIMATE except the ratchet / crown-wheel counts): winding pinion 16
// on the stem → winding intermediate 18 → crown wheel 40 → ratchet 55 (≈16 clicks per crown turn,
// ≈32 crown turns from empty). The intermediate does not change the crown-wheel : stem ratio.
const keyless = {
  windingPinion: { teeth: 16 }, windingIntermediate: { teeth: 18 }, crownWheel: { teeth: 40 }, ratchet: { teeth: 55 },
  slidingPinion: { teeth: 12 }, settingWheel: { teeth: 15 },
  stemY: 0, // stem / crown axis y (measured crown centre y −0.06 ± 0.05)
  windingPinionX: [7.45, 9.0], slidingPinionX: [5.6, 7.4], stemInnerX: 3.8, // along the stem (dial frame x)
};
// GMT works (movement.md §6.2–6.3, "Rolex 3185-like", counts ESTIMATE): the hour-wheel DRIVER
// (reference 12 h; 36 for the minute pinion + a second toothing of 30) → GMT idler wheel 30 / its
// pinion 15 → 24-hour wheel 30 (1 turn / 24 h, CW from the dial; hand24). The LOCAL hour wheel (36,
// hour hand) rides on the driver: its 12-point star is held by the hour jumper, a spring screwed
// to the driver's top face — in normal running both turn together (rot.hourWheel); in crown
// position C the local wheel is stepped hour by hour (the jumper clicks) while the train, the
// minute and the 24-hour hands run on. Lead stack order (coherent coupling): cannon / minute wheel
// → 24-hour wheel → driver → jumper + star → local hour wheel → date driver (SPEC.z).
const gmt = {
  driverUpper: { teeth: 30 }, // the driver's second toothing (below its 36)
  idler: { teeth: 30, pinion: 15 },
  wheel24: { teeth: 30 },
  localHourWheel: { teeth: 36 },
  // 12-point star on the local hour wheel's underside: at rot.hourWheel = 0 a star GAP faces the
  // jumper beak, which sits at clock angle jumperDeg (driver frame = world frame at rot 0)
  star: { teeth: 12, tipRadius: 1.60, rootRadius: 1.25, jumperDeg: 236.3, jumperBeakRadius: 1.48, jumperScrewRadius: 2.0, jumperSweep: [1.45, 2.40] },
};
// The GMT idler is closer to the centre than the report's schematic r 3.60 so that the minute
// pinion, which climbs past the 24-hour wheel to the driver's 36, clears that wheel's tips.
P.gmtIdler = (() => { const d = Math.hypot(-1.23, 3.38), s = 2.95 / d; return [r3(-1.23 * s), r3(3.38 * s)]; })();
// Instantaneous date (§6.4): the date-driving wheel (72) meshes the LOCAL hour wheel (36), so the
// date follows the jumping hour forwards and backwards; its cam charges the instant-date lever over
// the evening and the lever snaps the disc on by one tooth at local midnight (kinematics: rot.date,
// a 1.2 s jump); the date jumper indexes the disc. Lever/jumper/guards live on the calendar plate
// inside the disc (r < 9.2) at the disc's level; the cam's pin reaches the lever through a slot.
const dateTrain = {
  driver: { teeth: 72 },
  cam: { radius: 2.5 }, // on the driver, above its teeth (SPEC.z.dateDriverCam)
  lever: { pivot: [-6.6, 4.4], fingerDeg: 286, fingerRadius: 9.35 }, // instant-date lever ESTIMATE (upper left, long curled wire spring)
};
// Automatic winding (§6.5, jewel positions MEAS, counts ESTIMATE): rotor gear 60 (on the bearing's
// outer race) → reversing wheel A 30 ↔ reversing wheel B 30 (internal clicks: either rotor
// direction drives B's pinion the same way) → B pinion 8 → reduction wheel 64 (gilt; it peeks out
// past the automatic bridge at 11–12 o'clock dial side) → its pinion 20 → ratchet 55. The
// kinematics use this exact ratio so every drawn mesh agrees: (60/30)(8/64)(20/55) = 1/11.
const autoTrain = {
  rotorGear: { teeth: 60 }, reverserA: { teeth: 30 }, reverserB: { teeth: 30, pinion: 8 }, reductionWheel: { teeth: 64, pinion: 20 },
};
const RATCHET_PER_ROTOR = (autoTrain.rotorGear.teeth / autoTrain.reverserA.teeth) * (autoTrain.reverserB.pinion / autoTrain.reductionWheel.teeth) * (autoTrain.reductionWheel.pinion / keyless.ratchet.teeth);

const mod = (d, z1, z2) => (2 * d) / (z1 + z2);
const along = (from, to, d) => { const L = hyp(from, to); return [from[0] + ((to[0] - from[0]) * d) / L, from[1] + ((to[1] - from[1]) * d) / L]; }; // exact (no rounding: shared modules stay equal)
// One toothing with two partners needs one module: the ratchet (crown wheel + reduction pinion),
// the crown wheel (ratchet + winding intermediate), reversing wheel A (rotor gear + wheel B) and
// the minute wheel (cannon + setting wheel). The second partner is placed at the exact distance
// along its measured direction (moves of 0.02–0.09 mm, inside the ±0.15–0.5 measuring error).
const M_KEYLESS = mod(hyp(P.barrel, P.crownWheel), keyless.ratchet.teeth, keyless.crownWheel.teeth);
const M_AUTO = mod(hyp(P.center, P.reverserA), autoTrain.rotorGear.teeth, autoTrain.reverserA.teeth);
const M_MOTION_A = mod(hyp(P.center, P.minuteWheel), train.cannon.teeth, train.minuteWheel.teeth);
P.reductionWheel = along(P.barrel, B(3.02, 9.69), (M_KEYLESS * (autoTrain.reductionWheel.pinion + keyless.ratchet.teeth)) / 2); // MEAS B(3.02, 9.69)
P.windingIntermediate = along(P.crownWheel, B(-8.8, 3.1), (M_KEYLESS * (keyless.windingIntermediate.teeth + keyless.crownWheel.teeth)) / 2); // MEAS B(-8.8, 3.1)
P.reverserB = along(P.reverserA, B(0.22, 6.77), (M_AUTO * (autoTrain.reverserA.teeth + autoTrain.reverserB.teeth)) / 2); // MEAS B(0.22, 6.77)
P.settingWheel = along(P.minuteWheel, [5.9, -2.6], (M_MOTION_A * (train.minuteWheel.teeth + keyless.settingWheel.teeth)) / 2); // report (5.9, −2.6)

const modules = {
  barrel: mod(hyp(P.barrel, P.center), train.barrel.teeth, train.center.pinion), // barrel ↔ centre pinion
  center: mod(hyp(P.center, P.third), train.center.teeth, train.third.pinion), // centre wheel ↔ third pinion
  third: mod(hyp(P.third, P.fourth), train.third.teeth, train.fourth.pinion), // third wheel ↔ fourth pinion
  fourth: mod(hyp(P.fourth, P.escape), train.fourth.teeth, train.escape.pinion), // fourth wheel ↔ escape pinion
  motionA: M_MOTION_A, // cannon ↔ minute wheel ↔ setting wheel
  motionB: mod(hyp(P.center, P.minuteWheel), train.minuteWheel.pinion, train.hourWheel.teeth), // minute pinion ↔ driver 36
  gmtA: mod(hyp(P.center, P.gmtIdler), gmt.driverUpper.teeth, gmt.idler.teeth), // driver 30 ↔ idler wheel
  gmtB: mod(hyp(P.center, P.gmtIdler), gmt.idler.pinion, gmt.wheel24.teeth), // idler pinion ↔ 24-hour wheel
  date: mod(hyp(P.center, P.dateDriver), gmt.localHourWheel.teeth, dateTrain.driver.teeth), // local hour ↔ date driver
  keyless: M_KEYLESS, // ratchet ↔ crown wheel ↔ winding intermediate; ratchet ↔ reduction pinion
  autoA: M_AUTO, // rotor gear ↔ reverser A ↔ reverser B
  autoB: mod(hyp(P.reverserB, P.reductionWheel), autoTrain.reverserB.pinion, autoTrain.reductionWheel.teeth), // B pinion ↔ reduction wheel
};

// Extra time-driven arbors (kinematics: period in seconds per turn, dir +1 = CCW from the dial)
const arbors = {
  gmtIdler: { period: (43200 * gmt.idler.teeth) / gmt.driverUpper.teeth, dir: 1, from: 'hour-wheel driver (CW) → GMT idler, CCW' },
  dateDriver: { period: (43200 * dateTrain.driver.teeth) / gmt.localHourWheel.teeth, dir: 1, from: 'local hour wheel (CW) → date driver, CCW, 1 turn a day' },
};

// ================================================================ vertical stack
// z = 0 is the dial-side face of the main plate; dial side +z, back side −z. Pairs are
// [z0, z1] ranges, scalars are faces/levels. Collision-checked by research/tudor-m79470/check.mjs.
// Movement total 7.52 [OFF]: dial seat z.dialSeat (+1.92) … rotor back face z.rotor[0] (−5.60).
const z = {
  // ---- case and crystal (exterior.md, Z_case through zc())
  caseBottom: zc(0.00), // lowest point of the case back (the watch box rests the watch on it)
  casebackFace: zc(2.70), // case-back face of the middle case (between the lugs)
  casebackInner: zc(1.45), // EST: inner face of the solid back (≈1.45 thick at the centre)
  caseTop: zc(10.30), bezelTop: zc(12.40), crystalApex: zc(14.60),
  crystalUnder: [zc(11.65), zc(12.05)], // underside at r 15.3 … at the centre
  // ---- dial: domed shell 0.40 thick; top(r) = dialTopEdge + 0.30·(1 − (r/14.3)²)
  dialTopEdge: zc(9.75), dialSeat: zc(9.35), dialTopCentre: zc(10.05),
  // ---- hands: blade bottoms (collet tops = blade + collet height, SPEC.hands)
  hourHand: zc(10.55), gmtHand: zc(10.85), minuteHand: zc(11.15), secondsHand: zc(11.45), pinTop: zc(11.75),
  // ---- hand seats: pipe tops, each 0.02 under its collet top
  hourPipeTop: zc(10.78), gmtPipeTop: zc(11.08), cannonPipeTop: zc(11.38), secondsArborTop: zc(11.70),

  // ---- dial-side works (movement.md §6–7 ESTIMATE, re-stacked by the lead so the coupling is
  // coherent and everything fits under the frozen dial seat +1.92). From the plate up:
  motionRecess: -0.40, // floor of the plate's dial-side recesses (cannon, minute wheel, setting wheel)
  cannonLeaves: [-0.38, -0.22],
  minuteWheel: [-0.32, -0.20], minutePinion: [-0.20, 0.52], // the pinion climbs past the 24-h wheel to the driver's 36
  settingWheel: [-0.32, -0.20], keylessLevers: [-0.38, -0.20],
  wheel24: [0.04, 0.16], // 24-hour wheel (GMT hand), pipe up to gmtPipeTop
  gmtIdlerPinion: [0.02, 0.18], gmtIdlerWheel: [0.22, 0.34],
  hourDriverUpper: [0.22, 0.34], // the driver's 30 (meshes the idler wheel)
  hourDriver: [0.40, 0.52], // the driver's 36 (meshes the minute pinion); bore rides on the local hour wheel's hub
  hourStar: [0.58, 0.72], hourJumper: [0.58, 0.72], // star under the local hour wheel, jumper on the driver
  localHourWheel: [0.78, 0.90], hourHub: [0.22, 0.78], // hub (r = pipes.hour) runs down inside the driver
  dateDriver: [0.78, 0.90], dateDriverCam: [0.96, 1.10],
  calendarPlate: [1.16, 1.70],
  dateDisc: [zc(9.168), zc(9.318)], // numerals 0.55 under the dial top at the window
  dateJumper: [1.74, 1.89], instantDateLever: [1.74, 1.89], dateGuards: [1.90, 2.00],
  stemAxis: -0.98, // = crown axis (exterior estimate Z_case 6.45)

  // ---- back side (movement.md §7 levels, kept where they fit; the plate is 2.0 thick so the
  // stem at −0.98 runs inside it). The barrel sinks into a deep pocket with its teeth and cover
  // at its back end; the going train runs above it.
  mainPlate: [-2.00, 0],
  barrelPocketFloor: -0.40,
  barrel: [-2.40, -0.45], barrelTeeth: [-2.40, -2.15], barrelLid: [-2.40, -2.30],
  pinionOf: {
    center: [-2.45, -2.10], // meshes the barrel teeth
    third: [-2.70, -2.45], // meshes the centre wheel
    fourth: [-3.62, -3.25], // meshes the third wheel (above the fourth wheel)
    escape: [-3.30, -3.05], // meshes the fourth wheel (above the escape wheel)
  },
  centerWheel: [-2.62, -2.50],
  escapeWheel: [-2.82, -2.70], palletFork: [-2.86, -2.66], roller: [-2.95, -2.60],
  centerWheelBridge: [-3.00, -2.70],
  palletBridge: [-3.30, -2.95],
  fourthWheel: [-3.22, -3.10],
  thirdWheel: [-3.57, -3.45],
  barrelBridge: [-3.40, -2.50], // hidden under the automatic bridge
  flange: [-4.30, -2.00], // laser-striped outer ring r 14.1–15.9 (the barrel bridge's rim), on the plate
  ratchetWheel: [-3.66, -3.46], crownWheel: [-3.66, -3.46], windingIntermediate: [-3.66, -3.46], click: [-3.66, -3.46],
  balanceRim: [-3.90, -3.40], balanceArms: [-3.90, -3.74], inertiaScrews: [-3.85, -3.45],
  hairspring: [-4.15, -4.00],
  trainBridge: [-4.40, -3.70],
  balanceBridge: [-4.80, -4.30], balanceBridgeFeet: [-4.30, -2.00], // feet (r ≥ frame.balanceBridge.footRadius) stand on the plate
  shockTop: -4.95,
  reductionWheel: [-4.30, -4.12], reductionPinion: [-4.12, -3.46], reverserBPinion: [-4.30, -4.12],
  autoWheels: [-4.62, -4.46], // reversing wheels A, B and the rotor gear (one plane, above the train bridge)
  automaticBridge: [-4.95, -4.40], automaticBridgeSink: -4.70, // underside sinks over the reversing wheels
  screwHeadTop: { automaticBridge: -4.95, trainBridge: -4.40, flange: -4.30, balanceBridge: -4.85 },
  rotorBearing: [-5.58, -4.42], // inner race on the gilt rotor post (on the train bridge), balls, outer race
  rotor: [-5.60, -5.13], // body: heavy band back face … web underside
  rotorWeb: [-5.53, -5.13], rotorHub: [-5.60, -5.03], rotorSkirt: [-5.60, -4.53], // the heavy band hangs over the flange (r ≥ rotor.skirtInner)
};

// ================================================================ meshing pairs
// Every pair the builders interleave with gear.meshPhase: positions, tooth counts, module and
// the z band of each toothing (the check verifies distance = m(z1+z2)/2 and a shared plane).
const meshes = [
  { name: 'barrel → centre pinion', a: 'barrel', b: 'center', za: train.barrel.teeth, zb: train.center.pinion, m: modules.barrel, zA: z.barrelTeeth, zB: z.pinionOf.center },
  { name: 'centre wheel → third pinion', a: 'center', b: 'third', za: train.center.teeth, zb: train.third.pinion, m: modules.center, zA: z.centerWheel, zB: z.pinionOf.third },
  { name: 'third wheel → fourth pinion', a: 'third', b: 'fourth', za: train.third.teeth, zb: train.fourth.pinion, m: modules.third, zA: z.thirdWheel, zB: z.pinionOf.fourth },
  { name: 'fourth wheel → escape pinion', a: 'fourth', b: 'escape', za: train.fourth.teeth, zb: train.escape.pinion, m: modules.fourth, zA: z.fourthWheel, zB: z.pinionOf.escape },
  { name: 'cannon pinion → minute wheel', a: 'center', b: 'minuteWheel', za: train.cannon.teeth, zb: train.minuteWheel.teeth, m: modules.motionA, zA: z.cannonLeaves, zB: z.minuteWheel },
  { name: 'minute wheel → setting wheel', a: 'minuteWheel', b: 'settingWheel', za: train.minuteWheel.teeth, zb: keyless.settingWheel.teeth, m: modules.motionA, zA: z.minuteWheel, zB: z.settingWheel },
  { name: 'minute pinion → hour-wheel driver', a: 'minuteWheel', b: 'center', za: train.minuteWheel.pinion, zb: train.hourWheel.teeth, m: modules.motionB, zA: z.minutePinion, zB: z.hourDriver },
  { name: 'driver 30 → GMT idler wheel', a: 'center', b: 'gmtIdler', za: gmt.driverUpper.teeth, zb: gmt.idler.teeth, m: modules.gmtA, zA: z.hourDriverUpper, zB: z.gmtIdlerWheel },
  { name: 'GMT idler pinion → 24-hour wheel', a: 'gmtIdler', b: 'center', za: gmt.idler.pinion, zb: gmt.wheel24.teeth, m: modules.gmtB, zA: z.gmtIdlerPinion, zB: z.wheel24 },
  { name: 'local hour wheel → date driver', a: 'center', b: 'dateDriver', za: gmt.localHourWheel.teeth, zb: dateTrain.driver.teeth, m: modules.date, zA: z.localHourWheel, zB: z.dateDriver },
  { name: 'ratchet → crown wheel', a: 'barrel', b: 'crownWheel', za: keyless.ratchet.teeth, zb: keyless.crownWheel.teeth, m: modules.keyless, zA: z.ratchetWheel, zB: z.crownWheel },
  { name: 'crown wheel → winding intermediate', a: 'crownWheel', b: 'windingIntermediate', za: keyless.crownWheel.teeth, zb: keyless.windingIntermediate.teeth, m: modules.keyless, zA: z.crownWheel, zB: z.windingIntermediate },
  { name: 'rotor gear → reversing wheel A', a: 'center', b: 'reverserA', za: autoTrain.rotorGear.teeth, zb: autoTrain.reverserA.teeth, m: modules.autoA, zA: z.autoWheels, zB: z.autoWheels },
  { name: 'reversing wheel A → B', a: 'reverserA', b: 'reverserB', za: autoTrain.reverserA.teeth, zb: autoTrain.reverserB.teeth, m: modules.autoA, zA: z.autoWheels, zB: z.autoWheels },
  { name: 'B pinion → reduction wheel', a: 'reverserB', b: 'reductionWheel', za: autoTrain.reverserB.pinion, zb: autoTrain.reductionWheel.teeth, m: modules.autoB, zA: z.reverserBPinion, zB: z.reductionWheel },
  { name: 'reduction pinion → ratchet', a: 'reductionWheel', b: 'barrel', za: autoTrain.reductionWheel.pinion, zb: keyless.ratchet.teeth, m: modules.keyless, zA: z.reductionPinion, zB: z.ratchetWheel },
].map((g) => ({ ...g, pa: P[g.a], pb: P[g.b] }));
// one toothing, two partners → one module (the check compares these)
const sameModule = [
  ['ratchet: crown wheel vs reduction pinion', mod(hyp(P.barrel, P.crownWheel), keyless.ratchet.teeth, keyless.crownWheel.teeth), mod(hyp(P.barrel, P.reductionWheel), keyless.ratchet.teeth, autoTrain.reductionWheel.pinion)],
  ['crown wheel: ratchet vs winding intermediate', mod(hyp(P.barrel, P.crownWheel), keyless.ratchet.teeth, keyless.crownWheel.teeth), mod(hyp(P.crownWheel, P.windingIntermediate), keyless.crownWheel.teeth, keyless.windingIntermediate.teeth)],
  ['reversing wheel A: rotor gear vs wheel B', mod(hyp(P.center, P.reverserA), autoTrain.rotorGear.teeth, autoTrain.reverserA.teeth), mod(hyp(P.reverserA, P.reverserB), autoTrain.reverserA.teeth, autoTrain.reverserB.teeth)],
  ['minute wheel: cannon vs setting wheel', mod(hyp(P.center, P.minuteWheel), train.cannon.teeth, train.minuteWheel.teeth), mod(hyp(P.minuteWheel, P.settingWheel), train.minuteWheel.teeth, keyless.settingWheel.teeth)],
];

// ================================================================ escapement / regulating organ
// movement.md §5.4: club-tooth Swiss lever, 20-tooth steel escape wheel (4 spokes); the line of
// centres escape → pallet → balance is bent ≈18.6° (back view −73.1° then −91.7°). The stones
// touch the escape tip circle ±26° off the escape–pallet line (≈2.9 pitches embraced); the escape
// wheel turns CCW seen from the dial, so its teeth meet the entry stone first. Lift 52°, fork ±7°
// (ESTIMATE) → impulse-pin radius from the lift ratio. Builder D solves the tooth/stone contact
// exactly like the Tangente 139 (escape-wheel progress table per beat, stones never in a tooth).
const EP = hyp(P.escape, P.pallet); // 3.230
const PB = hyp(P.pallet, P.balance); // 3.081
const LIFT = 52, FORK_HALF = 7; // degrees (timing below)
const lineEP = Math.atan2(P.pallet[1] - P.escape[1], P.pallet[0] - P.escape[0]);
const escapement = {
  palletToEscape: EP,
  palletToBalance: PB,
  escapeTipRadius: 2.75, // ±0.15 (movement.md §5.4)
  stoneHalfAngleDeg: 26, // contact points on the tip circle, ± off the escape→pallet line
  // contact points (dial frame): the stone the teeth reach first is the ENTRY stone
  entryContact: pts3([[P.escape[0] + 2.75 * Math.cos(lineEP - 26 * DEG), P.escape[1] + 2.75 * Math.sin(lineEP - 26 * DEG)]])[0], // ≈ B(−1.32, −5.12)
  exitContact: pts3([[P.escape[0] + 2.75 * Math.cos(lineEP + 26 * DEG), P.escape[1] + 2.75 * Math.sin(lineEP + 26 * DEG)]])[0], // ≈ B(−3.62, −5.83)
  // impulse-pin radius from the lift ratio: (lift/2)/forkHalf = L/r with L + r = pallet–balance
  rollerJewelRadius: PB / (1 + LIFT / 2 / FORK_HALF), // 0.654 (report 0.65)
  rollerRadius: 0.95, // safety roller (swept), SPEC.z.roller
  balance: {
    radius: 4.87, rimWidth: 0.30, rimHeight: 0.50, arms: 4, armWidth: 0.36, armsAt: 'top (case-back side) of the rim',
    material: 'gold-coloured (gilt glucydur-type), polished rim',
    // variable inertia: four slotted screws on the OUTSIDE of the rim at the arm ends (blog b28)
    inertiaScrews: { count: 4, atArmEnds: true, diameter: 0.5, protrusion: 0.30, colour: '#d1b06b' },
    freeSprung: true, // no regulator index
  },
  hairspring: { material: 'silicon', colour: '#4f5868', innerRadius: 0.5, outerRadius: 2.6, coils: 14, height: 0.12, thickness: 0.04, overcoil: false, stud: 'on a stud carrier under the balance bridge' },
  escapeWheel: { teeth: train.escape.teeth, spokes: 4, material: 'steel', thickness: 0.12, tooth: 'club' },
  palletFork: { stones: 'pink synthetic ruby', material: 'steel', guardDart: true },
  shock: { type: 'Incabloc-type lyre spring over a pink cap jewel', settingRadius: 0.95, top: 'balance bridge', bottom: 'main plate' },
};

// ================================================================ movement & frame
const movement = {
  radius: 15.9, height: 7.52, jewels: 28, frequencyHz: 4, beatsPerHour: 28800, powerReserveHours: 70,
  chronometer: 'COSC', silicon: 'balance spring', rotorBearing: 'ball bearing (material unpublished)',
  finishes: {
    bridges: { base: 'sand-blasted grey', colour: '#c4c8ca', bevels: '#e9eaeb', border: 'laser-decorated radial ("sun") stripes on the outer flange r 14.1–15.9 and the raised text bands', stripes: '#9da1a4' },
    mainPlate: { base: 'sand-blasted grey (both faces)', colour: '#b4b7bb' },
    screws: { finish: 'steel, polished slotted heads (not blued)', colour: '#d4d6d8', headDiameter: 1.35 },
    jewels: { colour: '#7a3d6e', note: 'purple-tinted synthetic ruby' },
    wheels: { gilt: '#c9b27a', steel: '#9a9ea4', barrel: '#8e949a', note: 'train wheels gilt with polished steel pinions; escape wheel, crown wheel, keyless steel' },
    balance: '#d1b06b',
  },
  // the variant to build: COSC MT5652 (2018 render, teardown). NOT the MT5652-U (Master Chronometer:
  // three-slot tungsten rotor, "MASTER CHRONOMETER" engraving) that the 2025 press kit pictures.
  variant: 'MT5652 (COSC)',
};
// traced outlines run a hair past the plate edge: pull those points back onto r = 15.85
const clipR = (pts, R = 15.85) => pts.map(([x, y]) => { const r = Math.hypot(x, y); return r > R ? [r3((x * R) / r), r3((y * R) / r)] : [x, y]; });
// Screws (movement.md §3.4, back view MEAS ±0.3): polished slotted steel, heads Ø1.35, flush with
// their bridge (countersunk) except the balance-bridge pair. `in` = the part they hold (balance-
// bridge screws are built with the balance bridge; the rest are part plate-screws).
const SCREWS = [
  { at: B(-8.7, 12.4), in: 'flange' }, { at: B(-12.7, 3.1), in: 'automaticBridge' }, { at: B(-14.8, -2.7), in: 'flange' },
  { at: B(-13.8, -6.0), in: 'flange' }, { at: B(-11.1, -10.15), in: 'balanceBridge' }, { at: B(4.92, -13.98), in: 'balanceBridge' },
  { at: B(9.3, -11.5), in: 'flange' }, { at: B(11.7, -9.1), in: 'flange' }, { at: B(11.0, 6.2), in: 'trainBridge' },
  { at: B(11.8, 7.6), in: 'flange' }, { at: B(-5.9, 1.0), in: 'trainBridge' },
];
const AUTO_BRIDGE = clipR(backPoly([[0.49, 14.09], [-2.21, 13.93], [-4.82, 13.25], [-7.26, 12.09], [-9.43, 10.48], [-11.26, 8.49],
  [-12.67, 6.18], [-13.62, 3.65], [-14.07, 0.98], [-13.99, -1.72], [-13.41, -4.36], [-12.4, -3.4], [-10.6, -3.0], [-9.4, -2.0],
  [-8.4, -0.2], [-7.6, 2.0], [-6.6, 3.0], [-4.4, 3.4], [-3.6, 4.0], [-1.8, 4.6], [0.4, 4.7], [2.2, 4.2], [3.8, 4.7], [6.0, 4.8],
  [8.6, 4.6], [10.6, 5.0], [10.9, 6.0], [9.0, 8.2], [7.6, 9.6], [5.0, 9.9], [3.9, 10.6], [2.2, 11.2], [0.6, 11.4]]));
const frame = {
  plateRadius: 15.9,
  // the bridges and the flange are cut round the balance (it swings in this opening)
  balanceOpening: { center: P.balance, radius: 5.45 },
  // AUTOMATIC bridge (movement.md §3.2–3.3, ±0.5): the big sand-blasted bridge over the automatic
  // train, 8 → 1 o'clock seen from the back (3 → 11 o'clock in the dial frame), raised outer text
  // band r 11.2–14.1 (groove at 11.2) engraved "TUDOR" and "GENEVA / SWITZERLAND". Underside sinks
  // (to z.automaticBridgeSink) over the two reversing wheels.
  automaticBridge: { outline: AUTO_BRIDGE, textBand: [11.2, 14.1], sinks: [{ center: P.reverserA, radius: 2.3 }, { center: P.reverserB, radius: 2.3 }] },
  // TRAIN bridge: the right half seen from the back (left half in the dial frame), across the
  // centre (rotor post with the fourth-wheel jewel) and down to the escape jewel; text band with
  // "MT5652 TWENTY-EIGHT 28 JEWELS"; two windows (third-wheel rim, central-wheel teeth); a lobe round
  // screw 11 (the traced outline stops 1 mm short of it).
  trainBridge: {
    outline: clipR(backPoly([[7.47, -11.96], [9.57, -10.35], [11.33, -8.39], [12.7, -6.13], [13.62, -3.65], [14.06, -1.04], [14.01, 1.6],
      [13.47, 4.18], [12.45, 6.62], [10.6, 5.0], [8.6, 4.6], [6.0, 4.8], [3.8, 4.7], [2.2, 4.2], [0.4, 4.7], [-1.8, 4.6], [-3.6, 4.0],
      [-4.4, 3.2], [-4.9, 1.2], [-4.8, -1.4], [-4.3, -3.2], [-3.6, -4.4], [-1.6, -4.9], [0.6, -5.2], [2.6, -6.0], [4.4, -7.6],
      [6.0, -9.6], [7.0, -11.6]])),
    lobes: [{ center: B(-5.9, 1.0), radius: 1.1 }],
    windows: [
      backPoly([[7.2, -0.5], [8.5, -0.4], [9.5, -1.0], [9.85, -2.6], [9.6, -4.4], [8.8, -5.7], [7.7, -6.1], [6.8, -5.4], [6.9, -4.0], [7.3, -2.9], [6.9, -1.6]]), // third-wheel rim
      backPoly([[-3.6, 4.0], [-2.0, 4.5], [0.4, 4.6], [2.2, 4.1], [2.6, 3.6], [1.0, 3.5], [-1.5, 3.4], [-3.3, 3.3]]), // central-wheel teeth
    ],
    textBand: [11.2, 14.1],
  },
  // BARREL bridge (hidden under the automatic bridge; outline ESTIMATE): carries the barrel arbor's
  // top pivot, the ratchet, crown wheel, winding intermediate and click; its rim is the laser-
  // striped outer FLANGE r 14.1–15.9 (z.flange) all round except at the balance opening and the
  // balance-bridge feet. Cut clear of the central wheels.
  barrelBridge: { outline: AUTO_BRIDGE, plus: [{ center: P.barrel, radius: 7.3 }], minus: [{ center: [0, 0], radius: 4.75 }] },
  // over the barrel (whose teeth reach r 14.6) the ring is undercut: its underside there is z.barrelBridge[1]
  flange: { rInner: 14.1, rOuter: 15.9, finish: 'laser radial "sun" stripes', of: 'barrel-bridge', undercut: { center: P.barrel, radius: modules.barrel * (train.barrel.teeth / 2 + 1.3) + 0.15 } },
  // TRAVERSING balance bridge (two-point fixation): arch over the balance at z.balanceBridge, feet
  // (r ≥ footRadius) standing on the plate at z.balanceBridgeFeet, one screw each; balance cap
  // (shock setting) in the middle; the hairspring stud carrier under it.
  balanceBridge: {
    outline: clipR(backPoly([[-13.9, -8.2], [-12.6, -7.6], [-10.0, -8.0], [-7.5, -8.4], [-5.0, -8.6], [-3.7, -8.1], [-2.3, -7.75],
      [-0.9, -8.1], [0.6, -8.8], [2.4, -9.8], [4.3, -11.0], [6.2, -12.0], [7.6, -12.8], [7.2, -14.3], [5.6, -15.0], [4.0, -14.9],
      [2.8, -13.8], [1.2, -12.2], [-0.6, -11.0], [-2.3, -10.75], [-4.0, -10.9], [-6.0, -11.1], [-8.0, -11.4], [-9.2, -12.4],
      [-10.4, -12.7], [-12.3, -11.5], [-13.6, -9.8]])),
    footRadius: 13.4, capRadius: 1.5,
    screws: [B(-11.1, -10.15), B(4.92, -13.98)],
    traversing: true,
  },
  // small polished pallet bridge (under the balance bridge's edge)
  palletBridge: { outline: clipR(backPoly([[-4.2, -5.3], [-3, -5], [-1.2, -5.5], [0.2, -6.6], [-0.2, -7.3], [-2.2, -7], [-3.8, -6.4]])), screws: [B(-3.6, -5.6), B(-0.4, -6.6)], finish: 'polished' },
  // steel strap over the centre wheel (blog b14; ESTIMATE): a screw at each end, hole for the arbors
  centerWheelBridge: { axis: [B(-3.6, 0.4), B(3.8, 0.6)], halfWidth: 0.65, hole: 0.45, screws: [B(-3.6, 0.4), B(3.8, 0.6)] },
  screws: SCREWS,
  screwHeadRadius: 0.675,
  // 28 jewels (allocation ESTIMATE): balance 2 + 2 caps, impulse pin 1, pallet stones 2, pallet 2,
  // escape 2, fourth 2, third 2, centre 2, barrel arbor 2, reversers 4, reduction 2, aux 1. Jewels in a
  // bridge belong to that bridge's part (they leave with it); those in the main plate are `jewels`.
  jewelsVisible: [P.center, P.third, P.escape, P.pallet, P.balance, P.reverserA, P.reverserB, P.reductionWheel, P.autoAux],
  jewelCount: 28,
  engravings: {
    // read FROM THE BACK. Arc angles are back-view degrees (CCW from back-view 3 o'clock); dial-frame
    // math angle = 180° − back angle. Engraved into the sand-blasted surface (dark-filled look).
    autoBridgeTUDOR: { text: 'TUDOR', arcRadius: 12.6, startDegBack: 151, endDegBack: 116, capHeight: 1.4, font: 'serif capitals (Tudor logotype)', topsOutward: true, readsClockwiseFromBack: true },
    geneva: { text: 'GENEVA', center: B(-13.6, -0.8), rotateDegBackView: 90, capHeight: 0.75, font: 'sans capitals' },
    switzerland: { text: 'SWITZERLAND', center: B(-12.3, -0.5), rotateDegBackView: 90, capHeight: 0.75, font: 'sans capitals' },
    trainBridge: { text: 'MT5652 TWENTY-EIGHT 28 JEWELS', arcRadius: 12.9, startDegBack: 16, endDegBack: -55, capHeight: 0.9, font: 'sans capitals', topsOutward: true, readsClockwiseFromBack: true },
  },
};

// ================================================================ rotor
// movement.md §4 (MEAS on the 2018 render, ±0.2): openworked HALF-DISC r 15.8 (straight edge
// through the centre), hub boss r 4.4 on a ball bearing, satin-brushed web with a thin groove at
// r 12.6, a satin inner rim ring 12.6–13.8 and the dark sand-blasted HEAVY BAND 13.8–15.8, which
// hangs toward the movement over the flange (r ≥ skirtInner; z.rotorSkirt). Four kidney openings,
// mirror pairs about the heavy axis. Material unpublished for the COSC calibre (only the -U is
// stated tungsten): do not label it. The heavy side is LOCAL −Y (kinematics: it hangs to 6 o'clock
// at rot 0). Report frame (back view, heavy axis +x) → here: (x, y) ↦ (−y, −x).
const fromRotorLocal = (pts) => pts3(pts.map(([x, y]) => [-y, -x]));
const rotor = {
  radius: 15.8, hubRadius: 4.4, grooveRadius: 12.6, grooveWidth: 0.12, bandInner: 13.8, skirtInner: 14.2,
  rimInner: 13.8, // = bandInner (older name)
  sectorDeg: 180, // the half-disc spans ±90° about local −Y; the hub boss is a full circle
  windows: {
    R1: fromRotorLocal([[5.1, 1.3], [4.55, 1.45], [4.1, 2.05], [3.5, 2.95], [2.8, 3.8], [2.1, 4.6], [1.55, 5.4], [1.2, 6.45], [1.0, 7.7], [0.95, 9.2], [1.05, 9.95], [1.4, 10.4], [2.0, 10.45], [2.45, 10.2], [2.85, 9.05], [3.45, 7.55], [4.1, 6.05], [4.8, 4.55], [5.45, 3.45], [5.95, 2.65], [5.95, 1.85], [5.65, 1.4]]),
    R2: fromRotorLocal([[4.6, 9.35], [4.45, 8.65], [4.7, 7.55], [5.25, 6.05], [5.9, 4.55], [6.55, 3.05], [7.3, 1.85], [7.9, 1.05], [8.4, 0.75], [8.9, 1.0], [9.2, 2.1], [9.25, 4.1], [8.95, 5.6], [8.15, 7.05], [7.05, 8.35], [5.9, 9.25], [5.2, 9.55]]),
    L1: fromRotorLocal([[1.65, -10.4], [1.15, -10.05], [1.1, -8.5], [1.15, -7.2], [1.35, -6.2], [1.75, -5.5], [2.15, -5.0], [2.6, -4.6], [3.2, -4.05], [3.8, -3.35], [4.15, -2.55], [4.4, -1.75], [4.8, -1.3], [5.7, -1.35], [6.2, -1.65], [5.95, -2.45], [5.5, -3.45], [5.0, -4.45], [4.65, -5.45], [4.4, -6.45], [4.05, -7.45], [3.6, -8.45], [3.1, -9.45], [2.6, -10.2], [2.1, -10.45]]),
    L2: fromRotorLocal([[5.4, -9.5], [4.95, -9.15], [4.8, -8.45], [5.15, -6.95], [5.5, -5.95], [5.9, -4.95], [6.35, -3.95], [6.85, -2.95], [7.25, -2.15], [7.65, -1.55], [8.1, -1.2], [8.6, -1.2], [8.9, -1.6], [8.95, -2.4], [8.7, -3.9], [8.2, -5.45], [7.45, -6.95], [6.6, -8.25], [5.95, -9.15]]),
  },
  // raised, polished serif "TUDOR" on the web, centred on the heavy axis (local clock 180°), letter
  // tops toward the hub; it reads correctly from the BACK (CCW in the back view).
  text: { string: 'TUDOR', font: 'serif capitals (TUDOR logotype)', capHeight: 1.1, radius: 11.05, centredOnDeg: 180, spanDeg: 44, topsTowardHub: true, finish: 'raised, polished', readFrom: 'back' },
  thickness: { web: 0.40, band: 0.47, skirt: 1.07, hub: 0.57 }, // = the z ranges in SPEC.z
  finish: { body: 'satin, radially brushed', ring: 'satin', band: 'sand-blasted, dark', colourBody: '#c9ccd0', colourRim: '#2c2d30' },
  // ball bearing (races + ≈10 balls, ESTIMATE) on the gilt rotor post screwed to the train bridge;
  // the rotor gear (60, SPEC.autoTrain) is fixed to the outer race at z.autoWheels.
  bearing: { type: 'ball bearing (material unpublished)', raceRadii: [1.3, 2.4, 3.0, 3.4], balls: 10, ballRadius: 0.225, ballCircle: 1.9, ringInner: 1.3, ringOuter: 3.4, post: { radius: 1.0, colour: '#b8975a' }, cap: 'central screw' },
  gearTipRadius: modules.autoA * (autoTrain.rotorGear.teeth / 2 + 1.3),
  renderPoseRotDeg: 248, // rot.z of the rotor in the official 2018 render (heavy axis to back-view 2:15)
};
// automatic winding: rotor → reversing wheels (one-way clicks) → reduction wheel → ratchet
const automatic = {
  naturalPeriod: 0.95, damping: 0.10, // ball-bearing rotor: light damping (a little slower than real so the swing reads)
  ratchetPerRotorRad: RATCHET_PER_ROTOR, // 1/11: the exact ratio of the drawn train (SPEC.autoTrain)
};
automatic.windPerRad = automatic.ratchetPerRotorRad / (2 * Math.PI * ((70 * train.center.pinion) / train.barrel.teeth)); // reserve per rotor radian: ≈103 rotor turns empty → full
// what each automatic part turns with (builder B): rotor gear + bearing outer race = rot.rotor;
// wheel A = −2·rot.rotor, wheel B = +2·rot.rotor (they follow the swing both ways); B's pinion,
// the reduction wheel and the ratchet follow the one-way winding (rot.ratchet):
autoTrain.ratios = {
  reverserAPerRotor: -autoTrain.rotorGear.teeth / autoTrain.reverserA.teeth,
  reverserBPerRotor: autoTrain.rotorGear.teeth / autoTrain.reverserB.teeth,
  reductionPerRatchet: -keyless.ratchet.teeth / autoTrain.reductionWheel.pinion,
  reverserBPinionPerRatchet: (keyless.ratchet.teeth / autoTrain.reductionWheel.pinion) * (autoTrain.reductionWheel.teeth / autoTrain.reverserB.pinion),
  windingIntermediatePerCrownWheel: -keyless.crownWheel.teeth / keyless.windingIntermediate.teeth,
};

// ================================================================ dial-side pipes (hand seats)
const pipes = {
  hour: [0.66, 0.85], // local hour wheel pipe [r inner, r outer]
  gmt: [0.45, 0.60], // 24-hour wheel pipe
  cannon: [0.21, 0.40], // cannon pinion pipe (on the hollow centre arbor)
  secondsArbor: 0.12, // fourth-wheel arbor tip carrying the seconds hand
};
// ===================================================================== CASE (exterior.md §2)
// Heights below are the research's Z_case values run through zc().
const CASE = {
  radius: 19.5, height: 14.6, lugToLug: 47.2, lugWidth: 20.0, waterResistanceM: 200, material: '316L stainless steel',
  // Radial section (r, z) of the OUTSIDE surface, bottom → top, case back included; rotate
  // about Z (the lugs and crown are added on top of this solid of revolution).
  profile: [
    [0, zc(0.00)], [11.0, zc(0.30)], [15.6, zc(0.55)], [16.2, zc(0.90)], [16.2, zc(2.60)], // case back
    [16.4, zc(2.70)], [19.0, zc(2.70)], [19.5, zc(3.20)], // case back face + bottom chamfer
    [19.5, zc(9.70)], [18.95, zc(10.30)], // polished flank + polished top bevel
  ],
  middle: {
    bottomZ: zc(2.70), flankZ: [zc(3.20), zc(9.70)], topZ: zc(10.30), outerRadius: 19.5,
    bottomChamfer: [[19.0, zc(2.70)], [19.5, zc(3.20)]],
    topBevel: [[19.5, zc(9.70)], [18.95, zc(10.30)]], // polished, continuous from lug tip to lug tip
    boreRadius: 16.05, // the movement (Ø31.8) and the case back thread sit in this bore (EST)
    finish: { flank: 'polished, mirror', topBevel: 'polished', backFace: 'satin, straight brushing' },
  },
  // Lugs: plan outline of the upper-right lug (outer edge → tip → inner face); mirror x
  // and y for the other three. Side profile in the (y, z) plane for the 12 o'clock lugs.
  lug: {
    xInner: 10.0, tipY: 23.6,
    planOuter: [[16.35, 10.62], [15.0, 15.1], [13.95, 18.2], [13.1, 20.3], [12.4, 21.9], [11.95, 23.25], [11.6, 23.6], [10.0, 23.6]],
    tipCornerRadius: 0.8, // outer tip corner; the tip itself is cut square to the 12–6 axis
    outerEdgeAngleDeg: 21, // the outer flank runs ≈21° off the 12–6 axis
    profile: [[15.0, zc(10.30)], [18.0, zc(10.15)], [20.0, zc(9.75)], [21.5, zc(9.20)], [22.8, zc(8.40)], [23.6, zc(7.60)],
      [23.6, zc(3.60)], [21.5, zc(3.05)], [19.5, zc(2.75)], [16.4, zc(2.70)]],
    endFaceEdgeBreak: 0.2,
    topFinish: 'satin, brushed along the lug (12–6)', innerFaceFinish: 'satin',
    outerBevel: { planWidth: 0.45, finish: 'polished' }, // the "lug-to-lug" bevel along the top outer edge
    drilled: false, // no spring-bar holes through the lug flanks
    // spring bar (hidden, between the inner faces) — the watch box hangs its band here
    springBar: { y: 21.7, z: zc(5.4), radius: 0.9 },
    // engraved on the case back face between the lugs (small sans capitals, radial)
    engraving: { ref: '79470', serial: '5K98671', capHeight: 0.8, refAt: 'between the 12 o’clock lugs', serialAt: 'between the 6 o’clock lugs' },
  },
  bezel: {
    fixed: true, rotating: false, outerRadius: 19.5, topOuterEdge: 19.25, topInner: 16.05, seatRadius: 15.95,
    z: [zc(10.30), zc(12.40)],
    // radial section, outside → inside
    profile: [[19.5, zc(10.30)], [19.5, zc(12.10)], [19.25, zc(12.40)], [16.05, zc(12.40)], [15.95, zc(12.20)]],
    topEdgeRound: 0.3,
    finish: { top: 'satin, RADIAL brushing (lines point at the centre)', side: 'polished', innerChamfer: 'polished' },
    engraving: {
      fill: '#0E0E0E', depth: 0.10, stroke: 0.24, // engraved, black-filled; no insert, no triangle, no minute marks
      bars: { anglesDeg: [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345], r: [16.55, 18.92], width: 0.28 },
      numerals: {
        r: [16.56, 18.90], capHeight: 2.34, font: 'condensed squarish monoline sans (DIN/Eurostile-like)',
        glyphNotes: 'flag-topped "1" without foot; flat-based "2" with a straight diagonal; closed "4"; square-bowled "6" and "0"; "8" with a smaller upper bowl',
        // tops: 'out' = glyph top away from the centre; 'in' = towards it (reads upright from 6)
        items: [
          { text: '24', deg: 0, tops: 'out' }, { text: '2', deg: 30, tops: 'out' }, { text: '4', deg: 60, tops: 'out' },
          { text: '6', deg: 90, tops: 'out' }, { text: '8', deg: 120, tops: 'in' }, { text: '10', deg: 150, tops: 'in' },
          { text: '12', deg: 180, tops: 'in' }, { text: '14', deg: 210, tops: 'in' }, { text: '16', deg: 240, tops: 'in' },
          { text: '18', deg: 270, tops: 'out' }, { text: '20', deg: 300, tops: 'out' }, { text: '22', deg: 330, tops: 'out' },
        ],
        digitWidth: { 0: 1.24, 1: 0.53, 2: 1.22, 4: 1.45, 6: 1.22, 8: 1.22 }, digitGap: 0.35, // arc widths at r 17.73
        // measured glyph spans (deg clockwise from 12) — every number is centred on its 30° slot
        spans: {
          24: [[355.35, 359.30], [0.10, 4.90]], 2: [[27.90, 31.85]], 4: [[57.75, 62.55]], 6: [[88.25, 92.20]], 8: [[118.30, 122.25]],
          10: [[146.80, 150.80], [152.05, 153.80]], 12: [[176.65, 180.55], [181.80, 183.55]], 14: [[206.25, 210.70], [211.50, 213.30]],
          16: [[236.35, 240.30], [241.55, 243.30]], 18: [[266.40, 268.05], [269.20, 273.15]], 20: [[295.50, 299.45], [300.55, 304.55]],
          22: [[325.40, 329.35], [330.90, 334.85]],
        },
      },
    },
  },
  crystal: {
    material: 'sapphire', ior: 1.77, antiReflective: true, tint: '#F4F8FF', radius: 15.95,
    // box-dome: short cylindrical wall above the bezel, then the dome
    outer: [[15.95, zc(12.20)], [15.95, zc(13.05)], [15.75, zc(13.45)], [15.30, zc(13.70)], [13.5, zc(14.00)], [10.0, zc(14.30)], [5.0, zc(14.52)], [0, zc(14.60)]],
    inner: [[15.30, zc(11.65)], [12.0, zc(11.85)], [6.0, zc(12.00)], [0, zc(12.05)]],
  },
  // flange (rehaut): plain light-grey sloped ring between the dial edge and the crystal
  flange: { rInner: 14.30, rOuter: 15.95, z: [zc(9.78), zc(11.60)], colour: '#BDBFC1', finish: 'satin', print: null },
  crown: {
    side: '+X', screwDown: true, axisZ: null, // = z.stemAxis (set below)
    from: 19.5, to: 22.5, // no crown guards; the tube is hidden (flush with the flank)
    stemEnd: 21.6, // the winding stem's thread ends inside the crown here (x)
    neck: { radius: 3.0, x: [19.5, 20.0], colour: '#2A2B2C' }, // dark sealing ring
    flutes: { count: 20, radius: 3.7, rootRadius: 3.25, x: [20.0, 21.7], flat: true, finish: 'satin' },
    endBevel: { x: [21.7, 22.4], toRadius: 2.9, finish: 'polished' },
    face: { x: 22.4, radius: 2.9, finish: 'polished', rose: { radius: 2.2, ringRadius: 2.45, relief: 0.12, petals: 5, sepals: 5, boss: 0.45 } },
  },
  caseback: {
    solid: true, screwDown: true, bottomZ: zc(0), domeSagitta: 0.30,
    centreDisc: { radius: 11.0, finish: 'straight-brushed (parallel lines)' },
    flatRing: { r: [11.0, 15.6], z: [zc(0.30), zc(0.55)] },
    engravedCircle: { radius: 11.05, width: 0.10 },
    knurl: { radius: 16.2, z: [zc(0.90), zc(2.60)], teeth: 120, depth: 0.15, finish: 'bright' },
    text: {
      string: 'TUDOR GENEVE ⛉ CALIBRE MANUFACTURE ⛉ TUDOR GENEVE ⛉ CALIBRE MANUFACTURE ⛉', // ⛉ = small Tudor shield
      r: [11.4, 12.9], capHeight: 1.5, font: 'Roman serif capitals (like the TUDOR logotype)', tops: 'out',
      direction: 'clockwise as seen from the back', startDegBackView: 0, // "TUDOR GENEVE" centred at 12 and 6 (back view)
      depth: 0.05,
    },
    // inside: the case back's inner face clears the rotor (EST — solid back, no data)
    inner: { radius: 15.95, faceZ: null }, // set below from the movement stack
  },
  colour: '#C4C6C8',
};

// ===================================================================== BRACELET (exterior.md §5)
const BRACELET = {
  kind: 'riveted three-row (Oyster-type), solid links, faux rivet heads', steel: '316L', reference: '72540',
  pitch: 9.9, centreLinkWidth: 8.7, outerJointOffset: 3.5, // centre-link joints lead the outer-link joints by 3.5
  widths: { endLink: 20.0, link1: 19.2, link2: 17.3, rest: 15.7 }, // excl. rivet heads (stepwise taper)
  thickness: { link1: 3.3, rest: 3.0 },
  outerLinkTop: { flatEndsFromEdge: 0.9, stepWidth: 0.35, stepDepth: 0.25, railWidth: 0.55 }, // "stepped construction"
  sideFace: { shape: 'stadium-shaped polished rim around a recessed polished panel', finish: 'polished' },
  rivets: { perOuterLinkSide: 2, fromLinkEnd: 1.5, radius: 0.7, protrusion: 0.3, finish: 'polished dome' },
  endLink: { y: [18.6, 23.4], topZ: [zc(8.3), zc(7.9)], bottomZ: zc(4.4), hugsCaseRadius: 19.5, solid: true, code: 'RP11' },
  links: { top: 6, bottom: 4 }, // 12 o'clock half / 6 o'clock half before the clasp (≈175 mm wrist)
  // Two halves hang from the spring bars and curve down like the 139's strap (start
  // −10°, end ≈ −38°); the clasp closes the 6 o'clock half.
  curve: { startDeg: -10, endDeg: -38 },
  finish: { tops: 'satin, brushed lengthwise', rails: 'polished', steps: 'polished', sides: 'polished' },
  engravings: { endLink: ['72540', 'RP11'] }, // inside of the end links
  clasp: {
    kind: 'TUDOR T-fit folding clasp', width: 17.6, length: 35.9, thickness: 4.2,
    cover: 'satin with polished bevels', shield: 'polished raised Tudor shield lift tab at the opening end',
    tfit: { positions: 5, travel: 8.0, step: 2.0, detent: 'ceramic ball' },
  },
};

// ===================================================================== DIAL (exterior.md §3)
const DIAL_TOP_EDGE = zc(9.75); // dial top surface at r 14.3
const DIAL = {
  visibleRadius: 14.28, radius: 14.6, thickness: 0.40,
  // Domed opaline: top surface z(r) = topZEdge + domeSagitta·(1 − (r/domeRadius)²). The
  // dial is a stamped shell of constant thickness (bottom = top − 0.40).
  topZEdge: DIAL_TOP_EDGE, domeSagitta: 0.30, domeRadius: 14.3,
  colour: '#E8E9E8', print: '#111111', finish: 'opaline (fine grain, faintly metallic, matte)',
  material: { metalness: 0.1, roughness: 0.55, grain: 3 / 255 },
  centreHole: 0.95, // hour-wheel pipe passes through (hour pipe r 0.85 + clearance)
  // two dial feet into the calendar plate (EST: clear of the date window, the markers' studs and the stem)
  feet: { anglesDeg: [60, 240], r: 13.3, radius: 0.25, length: 1.2 },
  markers: {
    height: 0.55, rim: '#141516', lume: '#ECEDEA', glow: '#00C27E', lumeDome: 0.05, material: 'monobloc ceramic, Super-LumiNova cap',
    circles: { anglesDeg: [30, 60, 120, 150, 210, 240, 300, 330], r: 10.90, outerRadius: 1.025, lumeRadius: 0.84 },
    bars: { anglesDeg: [180, 270], r: [9.40, 13.10], width: 1.28, cornerRadius: 0.18, rim: 0.19 },
    triangle: { verts: [[-1.44, 13.10], [1.44, 13.10], [0, 9.44]], apexFillet: 0.24, topFillet: 0.15, rim: 0.19 },
    // 3 o'clock: the date window replaces the marker
  },
  minuteTrack: {
    circle: { r: 13.62, width: 0.12 }, // no inner rail
    minor: { r: [12.59, 13.62], width: 0.11 }, // every 6°
    major: { r: [12.58, 13.62], width: 0.50 }, // 30°, 60°, 120°, 150°, 210°, 240°, 300°, 330°
    shortened: { r: [13.28, 13.62], majorDeg: [0, 90, 180, 270], minorDeg: [6, 354, 84, 96] },
  },
  dateWindow: {
    center: [11.13, -0.02], opening: [2.76, 2.10], cornerRadius: 0.08,
    bevel: { width: 0.40, angleDeg: 45, colour: 'dial white' }, frameOuter: [3.55, 2.90], // cut into the dial, no metal frame
  },
  text: [
    { id: 'logo', kind: 'shield', box: [-0.56, 5.95, 0.64, 7.62], note: 'outlined heraldic shield, crenellated top with two square windows, pointed base' },
    { id: 'brand', text: 'TUDOR', box: [-2.72, 4.65, 2.82, 5.67], capHeight: 1.02, font: 'Tudor serif wordmark',
      letters: { T: [-2.72, -1.86], U: [-1.66, -0.61], D: [-0.41, 0.56], O: [0.69, 1.73], R: [1.83, 2.82] } },
    { id: 'city', text: 'GENEVE', box: [-1.86, 3.79, 1.94, 4.47], capHeight: 0.68, font: 'condensed grotesque, no accent' },
    { id: 'depth', text: '200m:660ft', box: [-2.67, -5.09, 2.51, -4.41], capHeight: 0.68, font: 'bold grotesque digits, "m" and "ft" italic lowercase' },
    { id: 'chrono1', text: 'CHRONOMETER', box: [-3.56, -6.00, 3.55, -5.45], capHeight: 0.55, font: 'regular grotesque caps' },
    { id: 'chrono2', text: 'OFFICIALLY CERTIFIED', box: [-4.73, -6.99, 4.75, -6.44], capHeight: 0.55, font: 'regular grotesque caps' },
    { id: 'swiss', text: 'SWISS', arc: { r: [13.85, 14.14], degSpan: [180.8, 189.1] }, tops: 'in', capHeight: 0.29 },
    { id: 'made', text: 'MADE', arc: { r: [13.85, 14.14], degSpan: [170.4, 178.9] }, tops: 'in', capHeight: 0.29 },
  ],
};

// ===================================================================== HANDS (exterior.md §4)
// Outlines in hand-local coordinates (x across, +y from the arbor towards the tip).
// Matte black-coated bodies (the "black outline" IS the hand) with white lume windows;
// the GMT hand is yellow lacquer. Stack from the dial up: hour → GMT → minute → seconds.
const HANDS = {
  order: ['hour', 'gmt', 'minute', 'seconds'],
  hour: {
    tip: 9.16, colour: '#141516', lume: '#ECEDEA', thickness: 0.18, z: zc(10.55), collet: { radius: 1.50, height: 0.25 }, bore: 0.86,
    outline: [[0.565, 1.45], [0.565, 5.58], [1.90, 6.90], [0.565, 8.22], [0.565, 9.16], [-0.565, 9.16], [-0.565, 8.22], [-1.90, 6.90], [-0.565, 5.58], [-0.565, 1.45]],
    lumeOutline: [[0.345, 2.05], [0.345, 5.675], [1.57, 6.90], [0.345, 8.125], [0.345, 8.92], [-0.345, 8.92], [-0.345, 8.125], [-1.57, 6.90], [-0.345, 5.675], [-0.345, 2.05]],
  },
  gmt: {
    tip: 14.12, colour: '#DDA800', lume: '#ECEDEA', thickness: 0.15, z: zc(10.85), collet: { radius: 1.30, height: 0.25 }, bore: 0.61,
    outline: [[0.40, 1.50], [0.265, 7.08], [1.585, 8.40], [0.38, 9.605], [0.125, 14.06], [0.07, 14.12], [-0.07, 14.12], [-0.125, 14.06], [-0.38, 9.605], [-1.585, 8.40], [-0.265, 7.08], [-0.40, 1.50]],
    lumeOutline: [[0, 7.18], [1.22, 8.40], [0, 9.62], [-1.22, 8.40]],
  },
  minute: {
    tip: 13.60, colour: '#141516', lume: '#ECEDEA', thickness: 0.18, z: zc(11.15), collet: { radius: 1.15, height: 0.25 }, bore: 0.41,
    outline: [[0.47, 1.40], [0.47, 12.70], [0, 13.60], [-0.47, 12.70], [-0.47, 1.40]],
    lumeOutline: [[0.215, 2.00], [0.215, 12.60], [0, 13.05], [-0.215, 12.60], [-0.215, 2.00]],
  },
  seconds: {
    tip: 13.50, tail: 4.45, colour: '#141516', lume: '#ECEDEA', thickness: 0.12, z: zc(11.45), bore: 0.13,
    boss: { radius: 0.95, height: 0.20 }, pin: { radius: 0.11, colour: '#C9CBCD' },
    outline: [[0.16, 0], [0.16, 8.05], [1.03, 8.92], [0.16, 9.79], [0.16, 13.50], [-0.16, 13.50], [-0.16, 9.79], [-1.03, 8.92], [-0.16, 8.05], [-0.16, 0],
      [-0.27, -0.9], [-0.27, -4.45], [0.27, -4.45], [0.27, -0.9]],
    lumeOutline: [[0, 8.19], [0.74, 8.92], [0, 9.65], [-0.74, 8.92]],
    counterweight: 'matte black, plain (no lume), square end',
  },
  pinTopZ: zc(11.75),
  finish: { black: { colour: '#141516', roughness: 0.7, texture: 'fine' }, gmt: { colour: '#DDA800', roughness: 0.35 }, lume: { colour: '#ECEDEA', roughness: 0.6, emissive: '#00C27E' } },
};
// ===================================================================== DATE (window + disc)
// The disc is built by dial.js (it is seen through the window, also in the watch box); the
// works that move and hold it are built by dialworks.js. Numerals increase COUNTER-clockwise
// round the disc and stand upright at 3 o'clock (each one's "up" is the CCW tangent); the
// disc turns CLOCKWISE seen from the dial — the kinematics' rot.date, drive sign +1 — so
// the next date enters the window from above (blog b03/b22). Numeral k sits at local clock
// angle windowDeg − (k − 1)·stepDeg, so "1" is in the window when rot.date = 0.
const DATE_STEP = 360 / 31;
const DATE = {
  disc: {
    positions: 31, stepDeg: DATE_STEP, windowDeg: Math.atan2(11.13, -0.02) / DEG, // clock angle of the window centre
    rOuter: 12.95, rInner: 9.75, // printed ring; the 31 internal V-teeth reach in to toothTipRadius
    teeth: 31, toothTipRadius: 9.30, toothRootRadius: 9.75,
    // tooth j is centred at local clock angle toothDeg0 + j·step; the jumper beak sits half a
    // step off a tooth, i.e. in a gap, at every whole date
    toothDeg0: 300 - DATE_STEP / 2, // a tooth half a step from the jumper beak at 300° → the beak sits in a gap at every whole date
    jumperDeg: 300, // date jumper beak (clock angle, ≈10 o'clock, blog b04/b05; ESTIMATE)
    thickness: 0.15, colour: '#F0F0EE', numeral: '#111111',
    numeralHeight: 1.64, numeralRadius: 11.13, font: 'grotesque (Helvetica-like); canvas Arial/Helvetica, Jost fallback',
    digitWidths: { 2: 1.04, 8: 1.02 }, // measured on "28"
  },
};

// ================================================================ explode offsets
// Offsets (mm) at full explosion: dial side +Z, movement side −Z, in assembly order. The
// exploded camera looks from the dial side at azimuth 64°, elevation 16° (16:9), so every
// disc is seen ≈65° off its axis: neighbours keep ≥2.5 mm (plates and the calendar plate ≥4)
// so each face stays readable. The case lifts HIGH so the Ø39 middle case never hides the
// hands/dial stack; the crown and stem leave first along +X. The solid case back and the
// bracelet/clasp are faded out by the UI when exploded (descriptor solidCaseback /
// explodeHide): they only have to get out of the way. The rotor is the last movement part.
// Parts not listed stay put (main plate, its jewels and engravings). Swept by the check.
const explode = {
  // case
  crystal: [0, 0, 62], bezel: [0, 0, 56], flange: [0, 0, 50],
  'case-body': [0, 0, 44], lugs: [0, 0, 44], 'spring-bars': [0, 0, 44], bracelet: [0, 0, 44], clasp: [0, 0, 44],
  crown: [23.5, 0, 0], 'winding-stem': [20, 0, 0], // the stem's inner end clears the case wall (x 19.5) before the case lifts
  caseback: [0, 0, -86],
  // hands, dial, date disc
  'seconds-hand': [0, 0, 38], 'minute-hand': [0, 0, 36], 'gmt-hand': [0, 0, 34], 'hour-hand': [0, 0, 32],
  dial: [0, 0, 28.5], indices: [0, 0, 28.5], 'date-window': [0, 0, 28.5], 'dial-feet': [0, 0, 28.5],
  'date-disc': [0, 0, 23.5],
  // dial-side works, from the main plate up (SPEC.z): every part that overlaps another in plan
  // moves further than the parts under it
  'cannon-pinion': [0, 0, 4.5], 'minute-wheel': [0, 0, 6], 'gmt-wheel': [0, 0, 7.5], 'gmt-wheels': [0, 0, 9],
  'hour-wheel-driver': [0, 0, 10.5], 'hour-jumper': [0, 0, 12], 'hour-wheel': [0, 0, 13.5], 'date-wheels': [0, 0, 15],
  'calendar-plate': [0, 0, 18], 'date-jumper': [0, 0, 20.5], 'instant-date-lever': [0, 0, 20.5], 'date-disc-guards': [0, 0, 26.5],
  'setting-wheel': [0, 0, 3], 'sliding-pinion': [0, 0, 1.6], 'winding-pinion': [0.3, 0, 1.6],
  'keyless-springs': [0, 0, 4.5], 'stop-seconds-lever': [0, 0, 4.5], yoke: [0, 0, 6], 'setting-lever': [0, 0, 7.5],
  // movement side, from the main plate outwards (levels SPEC.z): barrel deepest (in its pocket);
  // the central wheels in their order (centre < its bridge < fourth < third); the escape wheel lies
  // under the fourth wheel's rim and the pallet bridge; the keyless wheels sit on the barrel
  // bridge under the automatic train; the screws leave right after the rotor and its bearing.
  barrel: [0, 0, -6.5], mainspring: [0, 0, -9], 'barrel-arbor': [0, 0, -11], 'barrel-cover': [0, 0, -13],
  'center-wheel': [0, 0, -16], 'center-wheel-bridge': [0, 0, -19], 'barrel-bridge': [0, 0, -22],
  'pallet-fork': [0, 0, -25], 'escape-wheel': [0, 0, -27], 'pallet-bridge': [0, 0, -30],
  'fourth-wheel': [0, 0, -33], 'third-wheel': [0, 0, -36],
  'ratchet-wheel': [0, 0, -39], 'crown-wheel': [0, 0, -39], 'winding-intermediate': [0, 0, -39], click: [0, 0, -39], 'click-spring': [0, 0, -39.5],
  'balance-wheel': [0, 0, -41], roller: [0, 0, -41], hairspring: [0, 0, -44],
  'train-bridge': [0, 0, -45], 'balance-bridge': [0, 0, -48], 'shock-absorber': [0, 0, -50],
  'winding-train': [0, 0, -51], 'reversing-wheels': [0, 0, -54], 'automatic-bridge': [0, 0, -57],
  'plate-screws': [0, 0, -60], 'rotor-bearing': [0, 0, -62], rotor: [0, 0, -66],
};
// When each part starts to move (0…1; the registry starts a part at 0.45 × delay and moves
// it over 0.55 of the slider). Default: farthest parts first, so the watch opens from the
// outside in. Overrides: crown and stem leave first; the middle case lifts once the stem is
// out of its wall; everything under it follows (hands, dial, date disc, dial-side works).
const explodeDelays = {
  crown: 0, 'winding-stem': 0,
  'case-body': 0.82, lugs: 0.82, 'spring-bars': 0.82, bracelet: 0.82, clasp: 0.82,
  'seconds-hand': 0.84, 'minute-hand': 0.845, 'gmt-hand': 0.85, 'hour-hand': 0.855,
  dial: 0.87, indices: 0.87, 'date-window': 0.87, 'dial-feet': 0.87, 'date-disc': 0.88,
  'date-disc-guards': 0.875, 'date-jumper': 0.89, 'instant-date-lever': 0.89, 'calendar-plate': 0.9,
  // under the calendar plate: top-down, each after the part above it
  'date-wheels': 0.905, 'hour-wheel': 0.91, 'hour-jumper': 0.915, 'hour-wheel-driver': 0.92, 'gmt-wheels': 0.925,
  'gmt-wheel': 0.93, 'minute-wheel': 0.935, 'cannon-pinion': 0.94,
  'setting-lever': 0.9, yoke: 0.91, 'keyless-springs': 0.92, 'stop-seconds-lever': 0.92, 'setting-wheel': 0.93, 'sliding-pinion': 0.95, 'winding-pinion': 0.95,
};
const explodeDelay = (id) => {
  if (explodeDelays[id] !== undefined) return explodeDelays[id];
  const e = explode[id];
  if (!e) return 0.5;
  return Math.min(0.95, Math.max(0, 1 - Math.hypot(...e) / 90));
};

CASE.crown.axisZ = z.stemAxis;
CASE.caseback.inner.faceZ = z.casebackInner;

export const SPEC = {
  id: 'tudor-m79470',
  name: 'Black Bay Pro', reference: 'M79470-0004', caliber: 'MT5652',
  dialName: 'Opaline (white), domed', braceletName: 'riveted steel, T-fit clasp',
  // Engraved numbers — the owner can put their own here.
  caseSerial: '5K98671',
  defaultPose: { local: '10:10:38', gmt24: '07:11' }, // the official photo (not used by the kinematics)

  // ---- kinematics inputs (src/core/kinematics.js)
  powerReserveHours: 70,
  barrelTurns: 70 / (train.barrel.teeth / train.center.pinion), // reserve ÷ hours per barrel turn
  timing: { beatsPerHour: 28800, amplitudeDeg: 285, liftDeg: LIFT, forkHalfDeg: FORK_HALF }, // amplitude/lift/fork ESTIMATE (movement.md §8)
  train, keyless, arbors,
  centralSecondsKey: 'fourth', // direct centre seconds: the seconds hand sits on the fourth-wheel arbor
  gmtOffsetHours: 0, // the 24-hour hand shows local time (home = here); the hour hand jumps when travelling
  automatic, autoTrain,
  // dateChange: default instantaneous jump at local midnight (MT5652: instantaneous, synchronised with the local hour)

  modules, meshes, sameModule,
  layout: P,
  z, explode, explodeDelay,
  gmt, dateTrain, pipes, // dial-side works (dialworks.js)
  date: DATE,
  movement, frame, escapement, rotor,
  case: CASE, bracelet: BRACELET, dial: DIAL, hands: HANDS,
  colours: {
    steel: '#C4C6C8', dial: '#E8E9E8', print: '#111111', lume: '#ECEDEA', lumeGlow: '#00C27E',
    handBlack: '#141516', gmtYellow: '#DDA800', bezelFill: '#0E0E0E', flange: '#BDBFC1',
    dateDisc: '#F0F0EE', dateNumeral: '#111111', crownSeal: '#2A2B2C',
    bridges: movement.finishes.bridges.colour, plate: movement.finishes.mainPlate.colour, jewels: movement.finishes.jewels.colour,
    rotorBody: rotor.finish.colourBody, rotorRim: rotor.finish.colourRim, hairspring: escapement.hairspring.colour,
  },
};

if (typeof window !== 'undefined') {
  // Sanity check: every derived module should be in a plausible horological range.
  for (const [k, v] of Object.entries(modules)) {
    if (!(v > 0.04 && v < 0.2)) console.warn(`[spec tudor-m79470] module ${k} = ${v.toFixed(4)} looks wrong`);
  }
}
