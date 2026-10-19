// NOMOS Glashütte Tangente neomatik 38 Update, ref. 147 — caliber DUW 6101 "34/42"
// (Ø 34.0 mm incl. the date ring, 3.6 mm high, 42 jewels, automatic, Update ring date).
// Single source of truth for every dimension, position, level, ratio and colour of this
// watch. Builders read it; they never hard-code a number that lives here.
//
// Sources (research/tangente-update-147/*.md; images listed in plan.md):
//  - Case, dial, date track, hands, strap: NOMOS official renders of the ref. 147, measured
//    at 23.50 px/mm (lug-to-lug 47.3, Ø 38.5 agree to 0.2 %); side profile from the
//    perspective-corrected detail-5 photo. Heights were measured from the case-back face
//    (zb) and are converted with zb() below.
//  - Movement: official DUW 6101 back render "Boden_01_Bajonett_42Rubine" at 56.34 px/mm,
//    hand axis (1277.5, 1238.2) px, tied to the ref. 147 case-back render (12 features,
//    residual ≤ 0.1 mm, rotation 0). Dial-side render "duw-6101-front" at 55.70 px/mm,
//    centre (1282.9, 1320.1) px. Jewel / screw centres ±0.05–0.1 mm, outlines ±0.3 mm.
//  - Re-measured by the lead for this spec: ribbing angle 25.5° / pitch 2.00 mm and phase,
//    the ratchet ↔ idler-2 mesh seen through the winding window, the reverser, the pivot
//    of the transmission wheel (plain hole, back view (2.10, 9.15)), the switching-wheel
//    arbor (square bush, dial side (−9.05, 2.20)), the dial-side bridges.
//  - NOMOS publishes no tooth counts. The going train is the ETA/Peseux 7001-derived set
//    of the Tangente 139 (rates exact). Hand-winding, automatic and date trains are
//    engineering estimates (EST) chosen so that every pair meshes at its measured centre
//    distance; see the comments at each block.
//
// FRAME: units mm. +Z out of the dial, 12 o'clock = +Y, 3 o'clock (crown) = +X.
// z = 0 is the dial-side face of the pillar plate. Back-view measurements (case back up,
// crown on the LEFT) are converted with B(x, y) = [−x, y].
// Angles: "clock" angles are degrees clockwise from 12 o'clock; "math" angles are
// degrees counter-clockwise from +X (three.js rotation.z sense seen from the dial).

const B = (x, y) => [-x, y]; // back-view measurement → dial-side frame
const DEG = Math.PI / 180;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const pt = (p) => [r4(p[0]), r4(p[1])];
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const at = (c, d, a) => [c[0] + d * Math.cos(a), c[1] + d * Math.sin(a)];
// point exactly `d` from `from`, in the direction of `aim` (snaps a measured position
// onto the exact meshing distance)
const toward = (from, aim, d) => pt(at(from, d, ang(from, aim)));
// circle–circle intersection: the point at dA from A and dC from C that lies nearer `near`
function meet(A, dA, C, dC, near) {
  const d = hyp(A, C);
  const a = (dA * dA - dC * dC + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, dA * dA - a * a));
  const ux = (C[0] - A[0]) / d, uy = (C[1] - A[1]) / d;
  const p1 = [A[0] + a * ux - h * uy, A[1] + a * uy + h * ux];
  const p2 = [A[0] + a * ux + h * uy, A[1] + a * uy - h * ux];
  return pt(hyp(p1, near) <= hyp(p2, near) ? p1 : p2);
}
const mod = (d, z1, z2) => (2 * d) / (z1 + z2); // module of a pair meshing at centre distance d
const clockDial = (deg, r) => [r * Math.sin(deg * DEG), r * Math.cos(deg * DEG)];
const clockBack = (deg, r) => B(r * Math.sin(deg * DEG), r * Math.cos(deg * DEG));

// Exterior heights were measured from the outer face of the case back (zb = 0). The
// pillar-plate dial face sits at zb 4.45 (movement report §6; puts the stem axis at
// z −1.09, matching the measured crown axis zb 3.36).
const ZB0 = 4.45;
const zb = (v) => Math.round((v - ZB0) * 1000) / 1000;

const DATE_STEP_DEG = 360 / 31; // 11.6129°: one day on the Update date track

// ================================================================== ARBOR LAYOUT
// Every arbor in the DIAL frame. MEAS = measured jewel/pivot centre; EST = estimate.
const P = {
  // ---- going train (MEAS, back render)
  center: [0, 0],
  // Third wheel: on BOTH renders only the lower half of its jewel shows (cut by the rotor
  // bar's edge on the back, by a dial-side bridge on the front); a circle fit to the
  // visible arcs puts the centre at (0.35, −4.01) / (0.45, −3.96) — 0.2 mm above the
  // research's blob centroid (−4.22). With −4.22 the fourth wheel's tip circle (r 3.03)
  // would run through the third arbor; at −3.98 it clears it by 0.24.
  third: [0.40, -3.98],
  // small seconds: movement jewel −7.20, dial tick-ring fit −7.255, seconds pin −7.19 →
  // reconciled at −7.22 (hand, subdial print and fourth arbor are one centre)
  fourth: [0, -7.22],
  escape: B(3.21, -7.38),
  pallet: B(5.81, -6.08),
  balance: B(8.81, -4.34), // rim-fit centre & cap jewel averaged
  barrel: B(-2.19, 5.65), // jewelled barrel arbor (dial-side render + rotated-rotor photo)
  // ---- hand winding, on top of the 3/4 plate (MEAS; visible through the rotor window)
  crownWheel: B(-7.04, -0.07),
  windIdler1: B(-8.50, 3.97), // steel wheel, slotted screw + polished collar
  windIdler2: B(-7.59, 6.31), // steel wheel under a polished half-moon cap (+ gilt lower wheel)
  // ---- automatic winding (MEAS positions, identities EST)
  reverser: B(3.38, 3.24), // gilt wheel + steel click star in a window of the 3/4 plate
  autoA: B(4.51, 1.72), // jewel Ø0.70 next to the reverser
  autoB: B(5.91, 5.14), // large jewel Ø1.16
  autoC: B(6.08, 8.90), // jewel Ø1.06
  autoD: B(4.03, 9.88), // small jewel Ø0.55
  // ---- dial side (MEAS on the dial-side render, already dial frame)
  minuteWheel: [2.13, -2.12],
  dateSwitch: [-9.05, 2.20], // square bush under the date bridge (switching-wheel arbor, EST identity)
  quickSetStar: [8.05, -4.43], // 5-arm date corrector (static)
  quickSetIdler: [8.85, -2.21], // its idler (static)
  settingLever: [8.55, 3.05], // setting-lever pivot stud (MEAS ±0.2, identity EST)
  yoke: [6.60, -2.60], // yoke pivot (EST; clear of the setting wheels)
};

// ================================================================== TOOTH COUNTS
// Going train + motion works: ETA 7001-derived set (as the Tangente 139). Barrel 1 turn /
// 7 h, centre 1/h, third 1/8 min, fourth 1/min, escape 1/5 s → 21,600 A/h.
const train = {
  barrel: { teeth: 126 },
  center: { teeth: 120, pinion: 18 },
  third: { teeth: 112, pinion: 16 },
  fourth: { teeth: 120, pinion: 14 },
  escape: { teeth: 15, pinion: 10 },
  cannon: { teeth: 12 },
  minuteWheel: { teeth: 40, pinion: 10 },
  hourWheel: { teeth: 36 },
};

// Hand-winding chain as built (crown wheel 42 MEAS by FFT; others EST from the measured
// centre distances): winding pinion 17 → crown wheel 42 → idler 1 (20) → idler 2 upper
// steel wheel (16) | idler 2 lower GILT wheel (21, under the 3/4 plate, seen through the
// winding window) → ratchet 63 (steel, under the 3/4 plate, on the barrel arbor).
// Winding pinion Ø 2.72 (MEAS Ø ≈ 2.7) at the crown-wheel module, rack-type mesh as in
// the 139 (the pinion's lowest teeth pass through the 3/4-plate slot).
const windingTrain = {
  windingPinion: { teeth: 17 },
  crownWheel: { teeth: 42 },
  idler1: { teeth: 20 },
  idler2: { teeth: 16, lowerTeeth: 21 },
  ratchet: { teeth: 63 },
  slidingPinion: { teeth: 12 }, // contrate teeth towards the setting idler
  settingWheel: { teeth: 20 }, // meshes the minute wheel (always)
  settingIdler: { teeth: 20 }, // meshes the setting wheel; the sliding pinion engages it in crown position 3
  // ratchet click + spring, hidden under the 3/4 plate on level W0 (EST position, free of
  // the idler-2 gilt wheel and the barrel drum): pivot screw, beak on the ratchet's tip
  // circle (the beak rests in a gap whenever windAngle is a whole number of teeth of 63)
  click: { pivot: [6.40, 2.00], beak: [5.83, 3.55], springAnchor: [7.30, 3.20] },
};
// What the ENGINE sees (src/core/kinematics.js reads keyless.{ratchet,crownWheel,
// windingPinion}.teeth): crown-wheel turns per ratchet turn = (63/21)(16/20)(20/42) = 48/42,
// i.e. an EQUIVALENT direct-mesh ratchet of 48 teeth. Never build a wheel from
// keyless.ratchet — build the real 63-tooth ratchet from windingTrain.ratchet.
const RATCHET_EQUIV = (windingTrain.ratchet.teeth / windingTrain.idler2.lowerTeeth) * windingTrain.idler2.teeth; // 48
const keyless = {
  windingPinion: { teeth: windingTrain.windingPinion.teeth },
  crownWheel: { teeth: windingTrain.crownWheel.teeth },
  ratchet: { teeth: RATCHET_EQUIV, equivalent: true },
  slidingPinion: windingTrain.slidingPinion,
  settingWheel: windingTrain.settingWheel,
};

// Automatic winding train (EST — NOMOS publishes nothing; topology chosen so that every
// measured pivot is used and every centre distance is exact):
//   rotor wheel 60 (on the rotor collar, sunk in a groove of the 3/4 plate)
//   → reverser R "Doppelklinkenrad": gilt 20 (follows the rotor both ways) with the steel
//     click star 16 and the pinion 8 on the one-way side
//   → A 26 | pinion 16 → B 48 | pinion 18 → C 34 | pinion 8 → D 24 | pinion 10
//   → transmission wheel T 22 (plain pivot hole, back view (2.10, 9.15)) → ratchet 63.
// One-way pinion turns 3 × the rotor; ratchet per rotor radian = 1 : 116.
const autoTrain = {
  rotorWheel: { teeth: 60 },
  reverser: { teeth: 20, starTeeth: 16, pinion: 8 },
  A: { teeth: 26, pinion: 16 },
  B: { teeth: 48, pinion: 18 },
  C: { teeth: 34, pinion: 8 },
  D: { teeth: 24, pinion: 10 },
  T: { teeth: 22 },
};

// Date works on the dial side (EST counts; positions MEAS where stated):
//   hour wheel 36 → date-drive star 18 (6 h/turn, "four times a day") + gilt drive wheel 24
//   (Ø 3.65 MEAS, blue screw) → steel idler 14 → steel idler 16 | pinion 8 → carrier 48
//   (24 h) under the gilt program wheel 30 with the steel triangular cam and the
//   hook-shaped pivoting click that drags the date ring one tooth around midnight.
const dateTrain = {
  driveStar: { teeth: 18 },
  driveWheel: { teeth: 24 },
  idler1: { teeth: 14 },
  idler2: { teeth: 16, pinion: 8 },
  carrier: { teeth: 48 },
  programWheel: { teeth: 30 },
  quickSetWheel: { teeth: 24 },
  quickSetIdler: { teeth: 14 },
};

// ================================================================== MODULES + COMPUTED ARBORS
const modules = {};
// going train: m = 2d/(z1+z2) from the measured centre distances
modules.barrel = mod(hyp(P.barrel, P.center), train.barrel.teeth, train.center.pinion); // barrel ↔ centre pinion
modules.center = mod(hyp(P.center, P.third), train.center.teeth, train.third.pinion); // centre ↔ third pinion
modules.third = mod(hyp(P.third, P.fourth), train.third.teeth, train.fourth.pinion); // third ↔ fourth pinion
modules.fourth = mod(hyp(P.fourth, P.escape), train.fourth.teeth, train.escape.pinion); // fourth ↔ escape pinion
// motion works
modules.motionA = mod(hyp(P.center, P.minuteWheel), train.cannon.teeth, train.minuteWheel.teeth); // cannon ↔ minute wheel
modules.motionB = mod(hyp(P.center, P.minuteWheel), train.minuteWheel.pinion, train.hourWheel.teeth); // minute pinion ↔ hour wheel
// hand winding: idler 1 is ONE wheel meshing two partners, so both meshes share one
// module; idler 2 is snapped 0.017 mm onto the exact distance (within the ±0.05 measure)
modules.windA = mod(hyp(P.crownWheel, P.windIdler1), windingTrain.crownWheel.teeth, windingTrain.idler1.teeth); // crown wheel ↔ idler 1 (and the winding pinion, rack-type)
modules.windB = modules.windA; // idler 1 ↔ idler 2 upper
P.windIdler2 = toward(P.windIdler1, P.windIdler2, (modules.windB * (windingTrain.idler1.teeth + windingTrain.idler2.teeth)) / 2);
modules.windC = mod(hyp(P.windIdler2, P.barrel), windingTrain.idler2.lowerTeeth, windingTrain.ratchet.teeth); // idler 2 lower ↔ ratchet
// automatic
modules.rotorWheel = mod(hyp(P.center, P.reverser), autoTrain.rotorWheel.teeth, autoTrain.reverser.teeth); // rotor wheel ↔ reverser
modules.autoRA = mod(hyp(P.reverser, P.autoA), autoTrain.reverser.pinion, autoTrain.A.teeth); // reverser pinion ↔ A
modules.autoAB = mod(hyp(P.autoA, P.autoB), autoTrain.A.pinion, autoTrain.B.teeth); // A pinion ↔ B
modules.autoBC = mod(hyp(P.autoB, P.autoC), autoTrain.B.pinion, autoTrain.C.teeth); // B pinion ↔ C
modules.autoCD = mod(hyp(P.autoC, P.autoD), autoTrain.C.pinion, autoTrain.D.teeth); // C pinion ↔ D
modules.autoT = modules.windC; // T meshes the ratchet AND D's pinion → the ratchet's module
// T: exactly on both meshing circles (lands 0.07 mm from the measured pivot hole)
P.autoT = meet(P.barrel, (modules.autoT * (windingTrain.ratchet.teeth + autoTrain.T.teeth)) / 2,
  P.autoD, (modules.autoT * (autoTrain.D.pinion + autoTrain.T.teeth)) / 2, B(2.10, 9.15));
// date works: the star meshes the hour wheel → snap the measured drive position (−3.41,
// −0.65) onto the exact distance
modules.dateStar = modules.motionB;
P.dateDrive = toward(P.center, [-3.41, -0.65], (modules.dateStar * (train.hourWheel.teeth + dateTrain.driveStar.teeth)) / 2);
modules.dateWheel = 3.65 / (dateTrain.driveWheel.teeth + 2.6); // gilt drive wheel tip Ø 3.65 (MEAS)
P.dateIdler1 = pt(at(P.dateDrive, (modules.dateWheel * (dateTrain.driveWheel.teeth + dateTrain.idler1.teeth)) / 2, 185.1 * DEG));
modules.dateCarrier = 0.09;
P.dateIdler2 = meet(P.dateIdler1, (modules.dateWheel * (dateTrain.idler1.teeth + dateTrain.idler2.teeth)) / 2,
  P.dateSwitch, (modules.dateCarrier * (dateTrain.idler2.pinion + dateTrain.carrier.teeth)) / 2, [-8.0, 0.0]);
modules.programWheel = 0.12; // gilt program wheel, tip r 1.96 (its teeth show in the date-bridge window)
modules.quickSet = mod(hyp(P.quickSetStar, P.quickSetIdler), dateTrain.quickSetWheel.teeth, dateTrain.quickSetIdler.teeth);
// keyless, dial side: the setting idler sits beside the stem with its rim at the sliding
// pinion's contrate face (x 8.30); the setting wheel joins it to the minute wheel
const STEM_Y = 0;
modules.setting = modules.motionA;
P.settingIdler = [r4(8.30 - (modules.setting * windingTrain.settingIdler.teeth) / 2), 0.10];
P.settingWheel = meet(P.minuteWheel, (modules.setting * (train.minuteWheel.teeth + windingTrain.settingWheel.teeth)) / 2,
  P.settingIdler, (modules.setting * (windingTrain.settingWheel.teeth + windingTrain.settingIdler.teeth)) / 2, [4.8, 0.2]);

// ================================================================== KINEMATICS (engine inputs)
const powerReserveHours = 50; // NOMOS ref. 147 + DUW 6101 34/42 pages (EN "up to 50 h", DE "ca. 50 Stunden")
const barrelHours = 7; // 126/18 → barrel 1 turn per 7 h
const barrelTurns = powerReserveHours / barrelHours; // 7.143

// Ratios of the hidden winding wheels to state.rot.ratchet (signed, CCW+ seen from the
// dial; the ratchet turns + while winding). Exact tooth ratios, so gear.meshPhase holds.
const wR = windingTrain, aR = autoTrain;
const windingRatios = {
  idler2: -wR.ratchet.teeth / wR.idler2.lowerTeeth, // −3
  idler1: (wR.ratchet.teeth / wR.idler2.lowerTeeth) * (wR.idler2.teeth / wR.idler1.teeth), // +2.4
  crownWheel: -RATCHET_EQUIV / wR.crownWheel.teeth, // −48/42 = state.rot.crownWheel
  windingPinion: -RATCHET_EQUIV / wR.windingPinion.teeth, // −48/17 (about +X) = state.rot.stem
};
const autoRatios = {};
autoRatios.T = -wR.ratchet.teeth / aR.T.teeth; // −2.864
autoRatios.D = -(aR.T.teeth / aR.D.pinion) * autoRatios.T; // +6.3
autoRatios.C = -(aR.D.teeth / aR.C.pinion) * autoRatios.D; // −18.9
autoRatios.B = -(aR.C.teeth / aR.B.pinion) * autoRatios.C; // +35.7
autoRatios.A = -(aR.B.teeth / aR.A.pinion) * autoRatios.B; // −107.1
autoRatios.reverserStar = -(aR.A.teeth / aR.reverser.pinion) * autoRatios.A; // +348.075 (star + pinion, one way)
autoRatios.reverserWheelPerRotor = -aR.rotorWheel.teeth / aR.reverser.teeth; // −3 × state.rot.rotor (gilt wheel)
// ratchet radians per rotor radian: the one-way pinion turns 3 × the rotor
const ratchetPerRotorRad = Math.abs(autoRatios.reverserWheelPerRotor) / autoRatios.reverserStar; // 0.008619 = 1/116
const windPerRad = ratchetPerRotorRad / (2 * Math.PI * barrelTurns); // reserve fraction per rotor radian

// Extra driven arbors (engine: state.rot[key], period s/turn, dir +1 = CCW from the dial).
const arbors = {
  dateDrive: { period: (43200 * dateTrain.driveStar.teeth) / train.hourWheel.teeth, dir: 1 }, // 21600 s
  dateIdler1: { period: ((43200 * dateTrain.driveStar.teeth) / train.hourWheel.teeth) * (dateTrain.idler1.teeth / dateTrain.driveWheel.teeth), dir: -1 }, // 12600 s
  dateIdler2: { period: 14400, dir: 1 }, // 12600 × 16/14
  dateSwitch: { period: 86400, dir: -1 }, // 14400 × 48/8: rot.dateSwitch = 0 at local midnight
  settingWheel: { period: (12000 * windingTrain.settingWheel.teeth) / train.minuteWheel.teeth, dir: -1 }, // 6000 s
  settingIdler: { period: (12000 * windingTrain.settingWheel.teeth) / train.minuteWheel.teeth * (windingTrain.settingIdler.teeth / windingTrain.settingWheel.teeth), dir: 1 },
};

// ================================================================== VERTICAL STACK
// z = 0: dial-side face of the pillar plate. Ranges are [z0, z1] with z0 < z1; scalars are
// mid-planes. Collision-checked by research/tangente-update-147/check.mjs (every pair of
// parts whose outlines overlap in plan has disjoint z ranges unless they mesh).
const z = {
  // ---- case (exterior side profile; zb 0 = case-back face)
  caseTop: zb(7.40), // 2.95 crystal top
  caseBottom: zb(0), // −4.45
  crystal: [zb(6.40), zb(7.40)], // [1.95, 2.95] flat sapphire, 1.0 thick (EST thickness)
  bezel: [zb(5.91), zb(7.28)], // [1.46, 2.83]
  middleCase: [zb(1.45), zb(5.91)], // [−3.00, 1.46]
  caseback: [zb(0), zb(1.45)], // [−4.45, −3.00]
  backGlass: [zb(0.20), zb(1.10)], // [−4.25, −3.35] (0.9 thick; rotor letters clear it by 0.15)
  stemAxis: zb(3.36), // −1.09 crown / winding-stem axis
  flange: [0.80, 1.80], // satin case flange r 17.52–17.75 from the dial top; the ground crystal-edge ledge (r 17.75–18.10) is at 1.95
  casingRing: [-2.95, 0.15], // movement holder (lip r 15.62–16.6 from −2.10)
  casingRingLipBack: -2.10, // the casing screw's clamp presses here
  dialSeat: 0.50, // casing-ring lip under the dial rim (r 17.05–17.93)
  casingScrewHead: [-2.25, -2.10],

  // ---- hands (EST; same spacing above the dial as the 139)
  secondsHand: 0.80, secondsHandThickness: 0.08, secondsHubTop: 0.92, fourthArborTip: 0.88,
  hourHand: 1.20, hourColletTop: 1.38, hourPipeTop: 1.39,
  minuteHand: 1.52, minuteColletTop: 1.70, cannonTop: 1.69,
  handThickness: 0.10,
  centerCapTop: 1.75, // 0.20 under the crystal

  // ---- dial and date ring
  dial: [0.50, 0.80], // 0.30 thick; slots cut through
  subdialFloor: 0.65, // recessed 0.15
  dateRing: [0.20, 0.40], // markers printed on its top face; 0.40 below the dial top (MEAS slot depth ≈ 0.40)
  ringJewelTop: 0.195, // five support jewels under the ring
  dialFeet: [-0.75, 0.50], // blind holes 0.75 into the plate

  // ---- dial-side works (z > 0) and the plate recesses under them
  plateDialFace: 0,
  motionRecess: -0.35, // floor round the cannon pinion (r 2.85) and the minute wheel (r 2.78)
  dateRecess: -0.20, // floor under the date drive wheel and idlers
  keylessRecess: -0.35, // floor under the setting lever / yoke / springs
  settingPocket: -0.56, // floor under the setting wheel and idler
  cannonLeaves: [-0.30, -0.16],
  cannonPinion: [-0.30, 1.69],
  minuteWheel: [-0.30, -0.20],
  minutePinion: [-0.20, 0.16],
  hourWheel: [0.04, 0.14],
  dateDriveWheel: [-0.12, -0.02], // gilt 24
  dateDriveStar: [0.04, 0.14], // steel 18, meshes the hour wheel
  dateDriveScrew: [0.14, 0.22], // blued screw head
  dateIdlers: [-0.12, -0.02],
  dateIdler2Pinion: [-0.02, 0.10],
  dateCarrier: [0.0, 0.10],
  programWheel: [0.12, 0.22],
  dateCam: [0.12, 0.25],
  dateClick: [0.25, 0.33], // hook engages the ring teeth (ring band 0.20–0.40)
  dateJumper: [0.22, 0.34],
  quickSetWheel: [0.02, 0.14],
  quickSetIdler: [0.02, 0.14],
  quickSetStar: [0.20, 0.34],
  dateBridge: [0.36, 0.46], // over the switching-wheel stack (0.04 under the dial)
  motionBridge: [0.18, 0.30],
  keylessBridge: [0.0, 0.14],
  lowerBridge: [0.0, 0.16],
  keylessLevers: [-0.33, -0.19],
  keylessSprings: [-0.33, -0.21],
  settingWheels: [-0.42, -0.20],
  shockLowerTop: 0.02, // lower Incabloc setting of the balance, flush in the plate's dial face

  // ---- movement side (z < 0)
  mainPlate: [-0.95, 0],
  pillarRimTop: -2.10, // perlaged outer ring of the pillar plate (r 13.63–15.54) and the balance-bridge seats
  wheelThickness: 0.12,
  L0: [-1.10, -0.98], // centre wheel, escape wheel, pallet fork, roller
  L1: [-1.30, -1.18], // fourth wheel; barrel teeth
  L2: [-1.50, -1.38], // third wheel
  centerWheel: -1.04,
  fourthWheel: -1.24,
  thirdWheel: -1.44,
  escapeWheel: -1.04,
  pinionOf: {
    center: [-1.32, -1.16], // meshes the barrel teeth (L1)
    third: [-1.12, -0.96], // meshes the centre wheel (L0)
    fourth: [-1.52, -1.36], // meshes the third wheel (L2)
    escape: [-1.32, -1.16], // meshes the fourth wheel (L1)
  },
  barrel: [-1.95, -1.14], // drum: closed floor at −1.14 (dial side), lid end −1.95
  barrelTeeth: [-1.30, -1.18],
  barrelLid: [-1.95, -1.90],
  palletFork: -1.055, // lever body −1.115…−1.015, stones span L0
  roller: -1.08,
  palletBridge: [-1.45, -1.18],
  balanceRim: -1.72, balanceRimRange: [-1.94, -1.50], // arms flush with the rim's back face
  hairspring: -2.02, hairspringRange: [-2.06, -1.98],
  // under the 3/4 plate, above the barrel lid: winding levels
  W0: [-2.08, -1.98], // ratchet, idler-2 lower gilt wheel, transmission wheel T, auto wheel A, D's pinion
  W1: [-1.94, -1.84], // auto wheels B and D, A's pinion, C's pinion (all clear of the barrel drum in plan)
  W2: [-1.80, -1.70], // auto wheel C, B's pinion
  ratchetWheel: [-2.08, -1.98],
  ratchetClick: [-2.08, -1.98],
  autoLevels: {
    A: { wheel: [-2.08, -1.98], pinion: [-1.97, -1.84] },
    B: { wheel: [-1.94, -1.84], pinion: [-1.84, -1.70] },
    C: { wheel: [-1.80, -1.70], pinion: [-1.94, -1.80] },
    D: { wheel: [-1.94, -1.84], pinion: [-2.08, -1.95] },
    T: { wheel: [-2.08, -1.98] },
  },
  threeQuarterPlate: [-2.45, -2.10], // 0.35 thick
  windingPocketFloor: -2.25, // 0.20-deep pocket round the crown wheel and idlers
  reverserPocketFloor: -2.22, // window round the reverser + annular groove for the rotor wheel
  crownWheel: [-2.43, -2.27],
  windIdlers: [-2.43, -2.27], // idler 1 + idler 2 upper (idler 2 lower is on W0)
  crownWheelCover: [-2.53, -2.45], // polished fixed disc + 2 screws
  windIdlerCaps: [-2.53, -2.45], // idler-1 screw collar, idler-2 half-moon cap
  reverserWheel: [-2.36, -2.26], // gilt 20
  reverserStar: [-2.44, -2.37], // steel click star 16
  reverserCover: [-2.52, -2.44], // steel half cover + pin
  reverserPinion: [-2.24, -1.98], // down through the plate to W0 (meshes A)
  balanceBridge: [-2.45, -2.10], // pads rest on the pillar-plate seats (−2.10)
  regulatorRings: [-2.53, -2.45],
  shockTop: -2.58,
  screwHeads: [-2.58, -2.45], // blued heads in polished countersinks
  bearingDisc: [-2.75, -2.47], // FIXED rotor-bearing disc (3 screws, centre jewel)
  bearingScrewTop: -2.80,
  bearingBalls: -2.62, // ball centres (Ø 0.25) on r 2.57
  bayonetRing: [-2.72, -2.47], // fixed, notched, r 2.72–3.28
  // rotor (turns): collar r 3.47–4.02, bar, rim (heavy sector), letters
  rotorCollar: [-2.95, -2.62],
  rotorWheelTeeth: [-2.36, -2.26], // 60-tooth wheel under the collar, sunk in the plate groove
  rotorBar: [-2.95, -2.65],
  rotorRimUnder: -2.65, // r 10.20–13.70, over the 3/4 plate
  rotorRimInnerTop: -2.95, // inner step r 10.20–11.55
  rotorRimTop: -3.15, // flat r 11.55–13.67 carrying the letters
  rotorBevelOuterTop: -2.85, // outer bevel r 13.67 → 15.56
  rotorSkirtUnder: -2.30, // heavier skirt beyond r 13.90 (over the pillar ring at −2.10)
  rotorLettersTop: -3.20, // raised gold letters = the movement's back extreme
};

// ================================================================== EXPLODE
// Offsets (mm) at full explosion: dial side +Z, movement side −Z, in removal order with
// generous spacing. Case pieces fly far out so they never hide the movement in the
// oblique exploded view; the rotor is the last movement part before the case back.
// Parts that must cross a plate are split so nothing passes through metal: idler 2's
// lower gilt wheel ('transmission-wheel') leaves with the under-plate group.
const explode = {
  // case & band. The bezel's lip holds the crystal's seated flange, so the bezel lifts
  // off first and goes furthest; the crystal follows.
  bezel: [0, 0, 62], crystal: [0, 0, 55],
  'case-body': [0, 0, 48], lugs: [0, 0, 48], 'spring-bars': [0, 0, 48],
  'strap-top': [0, 36, 48], 'strap-bottom': [0, -36, 48], buckle: [0, -36, 48],
  // the stem leaves sideways FIRST (delay 0, see below) — far enough to clear the case
  // wall and the casing ring before they move — then its pinions rise through the pillar
  // plate's key slot
  crown: [25, 0, 0], 'winding-stem': [22, 0, 0],
  // hands, dial, date ring
  'minute-hand': [0, 0, 38], 'hour-hand': [0, 0, 35], 'seconds-hand': [0, 0, 32],
  dial: [0, 0, 27], 'small-seconds': [0, 0, 27], 'dial-feet': [0, 0, 27],
  'date-ring': [0, 0, 22],
  // dial-side works (outermost first). The hour wheel leaves before the cannon pinion
  // (its bore is smaller than the cannon leaves below it).
  'date-bridge': [0, 0, 18.5], 'motion-bridge': [0, 0, 17], 'date-jumper': [0, 0, 16],
  'hour-wheel': [0, 0, 14], 'date-wheels': [0, 0, 13], 'cannon-pinion': [0, 0, 12.5],
  'keyless-bridge': [0, 0, 12], 'date-drive-wheel': [0, 0, 11.5], 'date-corrector': [0, 0, 10.5],
  'dial-side-bridge': [0, 0, 10], 'date-idlers': [0, 0, 9.5], 'minute-wheel': [0, 0, 8],
  'keyless-springs': [0, 0, 6.5], 'winding-pinion': [0, 0, 6.5], yoke: [0, 0, 5.5], 'sliding-pinion': [0, 0, 5.5],
  'setting-lever': [0, 0, 5], 'setting-wheel': [0, 0, 4.5], 'stop-seconds-lever': [0, 0, 3.5], 'setting-idler': [0, 0, 3],
  // frame
  'main-plate': [0, 0, 0], jewels: [0, 0, 0], 'plate-engravings': [0, 0, 0],
  // going train and barrel (under the 3/4 plate), level by level: L0 → L1 → L2 → barrel
  'center-wheel': [0, 0, -5], 'escape-wheel': [0, 0, -5.5], 'pallet-fork': [0, 0, -6.5],
  'fourth-wheel': [0, 0, -7.5], 'third-wheel': [0, 0, -9], barrel: [0, 0, -10.5],
  mainspring: [0, 0, -12.5], 'barrel-cover': [0, 0, -14], 'pallet-bridge': [0, 0, -15], 'barrel-arbor': [0, 0, -15.5],
  // winding wheels under the plate (W0–W2), then the plate
  'winding-train': [0, 0, -17], 'transmission-wheel': [0, 0, -17.5], click: [0, 0, -18],
  'ratchet-wheel': [0, 0, -18.5], 'click-spring': [0, 0, -19],
  'three-quarter-plate': [0, 0, -23],
  // balance (through the plate's cut-out) and its bridge; the lower Incabloc setting sits
  // in the pillar plate's dial face and leaves towards the dial
  'balance-wheel': [0, 0, -26], roller: [0, 0, -26], hairspring: [0, 0, -29],
  'balance-bridge': [0, 0, -34], regulator: [0, 0, -36], 'shock-absorber': [0, 0, -38],
  'shock-absorber-lower': [0, 0, 4],
  // on top of the 3/4 plate
  'crown-wheel': [0, 0, -27.5], 'winding-idlers': [0, 0, -28], 'reversing-wheels': [0, 0, -28.5],
  'crown-wheel-cover': [0, 0, -29.5], 'plate-screws': [0, 0, -31],
  // movement holder, automatic, case back (the rotor is the last movement part)
  'casing-ring': [0, 0, -35], 'case-clamps': [0, 0, -39],
  'rotor-bearing': [0, 0, -43], rotor: [0, 0, -49],
  'caseback-glass': [0, 0, -57], 'caseback-ring': [0, 0, -61],
};
// Big offsets start early, small ones late (registry: a part moves while the explode
// amount runs from 0.45·delay to 0.45·delay + 0.55). Stem assembly sequenced explicitly:
// the stem and crown slide out first (done by explode ≈ 0.31); the case body (with lugs,
// spring bars and strap) and the casing ring wait for that (delay 0.7 → start 0.315); the
// pinions rise only once the stem has left their bores, together with the yoke whose
// fingers sit in the sliding pinion's groove.
// Under the case body's flange (r 17.52) the dial (r 17.85) may only rise once the case
// body has started (dial 0.75 → 0.3375), the date ring after the dial (0.8) and the
// dial-side works after the dial (date bridge 0.76; the others' natural delays are later).
const DELAY = {
  'winding-stem': 0, crown: 0,
  'case-body': 0.7, lugs: 0.7, 'spring-bars': 0.7, 'strap-top': 0.7, 'strap-bottom': 0.7, buckle: 0.7, 'casing-ring': 0.7,
  dial: 0.75, 'small-seconds': 0.75, 'dial-feet': 0.75, 'date-ring': 0.8, 'date-bridge': 0.76,
  'winding-pinion': 0.95, 'sliding-pinion': 0.93, yoke: 0.93, 'setting-idler': 0.95,
};
const explodeDelay = (id) => {
  if (DELAY[id] !== undefined) return DELAY[id];
  const e = explode[id];
  if (!e) return 0.5;
  return Math.min(0.95, Math.max(0, 1 - Math.hypot(...e) / 70));
};

// ================================================================== THE SPEC
export const SPEC = {
  id: 'tangente-update-147',
  name: 'Tangente neomatik 38 Update',
  reference: '147',
  caliber: 'DUW 6101',
  // Engraved numbers (the official renders; the owner can put their own here).
  caseSerial: '1', // case back "TANGENTE 1"
  movementSerial: '30264', // "N° 30264" on the 3/4 plate

  // ---------------------------------------------------------------- engine inputs
  powerReserveHours, // 50 h: NOMOS's own figure for this variant (42 h on all other DUW 6101 pages / reviews)
  barrelTurns, // 7.14 = 50 h ÷ 7 h per barrel turn
  timing: { beatsPerHour: 21600, amplitudeDeg: 285, liftDeg: 50, forkHalfDeg: 6.75 }, // NOMOS swing system, 3 Hz
  dateChange: { type: 'drag', durationSec: 1800 }, // the ring creeps 23:45 → 00:15 (NOMOS: change takes ~30 min)
  train, keyless,
  automatic: {
    naturalPeriod: 1.1, // physical estimate 0.29 s (r_g 12.3, c.o.m. 7.2–8); the engine's 1.1 s reads better on screen
    damping: 0.18,
    ratchetPerRotorRad, // 1/116, from the automatic train below
    windPerRad, // ≈ 1.92e-4 reserve per rotor radian → ≈ 830 rotor turns from empty to full
    refRotDeg: 71.8, // rot.z of the rotor in every official render (heavy rim toward dial-frame 3:38)
  },
  arbors,
  // real tooth counts of the hidden trains + their ratios to state.rot.ratchet / rot.rotor
  windingTrain: { ...windingTrain, ratios: windingRatios },
  autoTrain: { ...autoTrain, ratios: autoRatios },
  dateTrain,
  modules,
  layout: P,
  stemY: STEM_Y,
  z, explode, explodeDelay,

  // ---------------------------------------------------------------- movement
  movement: {
    radius: 17.0, // Ø 34.0 incl. the date ring (NOMOS)
    coreRadius: 15.54, // pillar plate Ø 31.1 (unchanged from the Ø 35.2 DUW 6101)
    height: 3.6, // z −3.20 (rotor letters) … +0.40 (date ring top)
    jewels: 42, // 27 + 5 date-ring rubies + 10 for the double ratchet/click wheels
    parts: 188, // original 27-jewel DUW 6101; 42-jewel count unpublished
    // Glashütte ribbing on the 3/4 plate, the balance bridge and the rotor, measured on the
    // back render: bands run along math angle +25.5° in the dial frame (= DESCEND to the
    // right at 25.5° seen through the case back — the opposite slant to the DUW 4001),
    // pitch 2.00 mm, band boundaries where v = −x·sin25.5° + y·cos25.5° ≡ 0.10 (mod 2.00).
    // Saw-tooth shading: each band darkest along its low-v edge, ≈ 20 % brighter towards
    // its high-v edge, then a sharp step (seen from the back: dark lower-left edge,
    // bright upper-right edge). Use parts/finish.js ribbingUV() — the texture tile holds 4
    // bands, so uvScale = 1/8.00, uvOffset v = −0.10/8.00.
    ribbing: { angleDeg: 25.5, pitch: 2.0, boundaryV: 0.10, uvScale: 1 / 8.0, uvAngle: 25.5 * DEG, uvOffset: [0, -0.1 / 8.0] },
    // Perlage: soft overlapping spots, Ø ≈ 1.6 on the back (pillar ring, balance floor,
    // pallet bridge), Ø ≈ 2.0 "fish scales" on the whole dial side of the pillar plate.
    perlage: { backSpot: 1.6, dialSpot: 2.0, uvScaleBack: 1 / (1.6 * 3.25), uvScaleDial: 1 / (2.0 * 3.25) },
    colours: {
      rhodium: '#cdcecf', // plates & rotor (render #C9CACB–#D4D4D4)
      perlage: '#cccdd2',
      blued: '#1b437e', // tempered screws (core to #022758 in shadow)
      gilt: '#d7b67c', // gilt wheels
      balanceGold: '#d9ad6f',
      engravingGold: '#e3ac5a',
      ruby: '#a95483', // jewels in sinks
      palletStone: '#e06a8a',
      impulseJewel: '#c0203a',
      hairspring: '#2c5da6',
    },
  },

  // ---------------------------------------------------------------- frame (plates, bridges, screws, jewels, engravings)
  frame: {
    pillarPlateRadius: 15.54,
    threeQuarterPlateRadius: 13.63, // ribbed top ends here; the perlaged pillar ring shows outside it
    // Region cut out of the 3/4-plate disc on the balance side (back-view trace, MEAS ±0.3;
    // points outside the plate make the cut run off the edge). Inside: pillar-plate floor
    // (perlage), balance, pallet bridge, balance bridge.
    // (first/last vertex moved 0.4 mm left of the research trace so the bridge's lower pad
    // corner B(6.51, −12.17) lies inside the cut)
    threeQuarterCut: [B(6.30, -12.30), B(5.41, -10.62), B(5.36, -9.41), B(5.31, -8.62), B(4.41, -7.61),
      B(3.95, -6.02), B(3.86, -4.31), B(3.90, -2.50), B(4.41, -0.80), B(5.51, 0.60), B(7.01, 1.21),
      B(8.52, 1.30), B(9.62, 1.21), B(10.37, 0.75), B(10.57, 1.70), B(10.87, 2.55), B(13.28, 2.91),
      B(14.69, 2.91), B(14.69, -14.69), B(6.30, -14.69)],
    // Pocket (0.20 deep, floor z.windingPocketFloor) in the plate top for the crown wheel and
    // the two idlers: the union of these circles and the hull joining them (one connected
    // pocket, dark polished walls in the render).
    windingPocket: [
      { c: P.crownWheel, r: 3.27 },
      { c: P.windIdler1, r: 1.76 },
      { c: P.windIdler2, r: 1.56 },
    ],
    // Through-opening inside that pocket (traced, back view): through it the idler-2 lower
    // gilt wheel, the steel ratchet teeth and the gilt barrel lid show (render boden_ul).
    windingWindow: [B(-7.05, 7.95), B(-6.50, 7.60), B(-6.15, 7.15), B(-5.95, 6.60), B(-5.92, 6.10),
      B(-6.05, 5.60), B(-6.30, 5.15), B(-6.55, 4.50), B(-6.75, 3.90), B(-6.95, 3.25), B(-7.60, 3.60),
      B(-7.90, 5.00), B(-8.20, 6.30), B(-7.90, 7.40)],
    windingPinionSlot: { x: [9.72, 10.37], y: [-1.45, 1.80] }, // through the 3/4 plate (dial-frame x)
    // through-slot in the pillar plate for the sliding pinion (x 8.30–9.55, r 0.85) and the
    // winding pinion, whose top teeth poke out on the dial side (+0.27, visible there)
    windingPinionKeySlot: { x: [8.20, 10.55], y: [-1.45, 1.45] },
    reverserWindow: { c: B(3.32, 3.32), r: 1.46 }, // round window, floor z.reverserPocketFloor
    rotorWheelGroove: { rIn: 3.20, rOut: 3.82 }, // annular groove for the rotor wheel, merges with the window
    bearingSeat: { c: [0, 0], r: 2.43 },
    // Cosmetic recess in the pillar ring at 1 o'clock (back view), between the 3/4-plate
    // edge and r ≈ 14.45, back clock 23°–46° (traced, render ur_edge).
    pillarRingPocket: { rIn: 13.63, rOut: 14.45, backClockDeg: [23, 46], floor: -1.95 },
    pillarHoles: [{ at: B(13.47, 4.78), r: 0.70 }], // through hole at 2:20 (back view)
    // the winding stem passes through the pillar plate's raised ring at 3 o'clock
    stemPassage: { x: [13.2, 15.6], y: [-0.55, 0.55], z: [-1.60, -0.58] },
    // plain slotted steel casing screw in an edge notch of the 3/4 plate (half under the
    // case-back ring seen from the back); its clamp tab presses the casing-ring lip
    casingScrew: { at: B(-0.15, 14.53), headDiameter: 2.1, notchRadius: 1.15, clampReach: 15.9, clampHalfWidth: 0.6 },
    // NOMOS two-sided balance bridge (23-point trace, MEAS ±0.3): pads at both ends, each
    // with a blued screw; boss r 2.06 round the staff carrying the Incabloc setting and the
    // DUW regulator rings. Ribbed top, polished bevels.
    balanceBridge: {
      outline: [B(10.87, 2.55), B(13.28, 2.86), B(13.28, -0.05), B(12.37, -0.30), B(10.47, -2.96),
        B(10.87, -4.34), B(10.39, -5.66), B(9.26, -6.32), B(8.32, -8.62), B(8.82, -10.57), B(6.51, -12.17),
        B(5.41, -10.62), B(5.36, -9.41), B(5.91, -8.42), B(7.01, -6.12), B(7.02, -5.37), B(6.75, -4.34),
        B(7.02, -3.31), B(7.79, -2.54), B(8.81, -2.27), B(9.62, -2.15), B(10.37, 0.75), B(10.57, 1.70)],
      boss: { c: P.balance, r: 2.06 },
      screws: [B(12.14, 1.05), B(6.75, -10.16)], // blued S3 (upper pad) and S4 (lower pad)
      // raised seats of the pillar plate under the pads (top z.pillarRimTop), kept ≥ 4.85
      // from the balance staff so the rim swings clear
      seats: [
        [B(10.87, 2.55), B(13.28, 2.86), B(13.28, -0.05), B(12.37, -0.30), B(11.30, 0.40)],
        [B(8.82, -10.57), B(6.51, -12.17), B(5.41, -10.62), B(5.36, -9.41), B(7.60, -9.20), B(8.90, -9.30)],
      ],
    },
    // small perlaged bridge carrying the pallet arbor's upper jewel under the balance (EST outline)
    palletBridge: { outline: [B(4.43, -5.33), B(5.23, -4.93), B(6.74, -6.24), B(6.24, -7.14), B(5.23, -6.94)], jewel: P.pallet },
    // all seven tempered-blue screws sit on one circle r ≈ 12.2 (S3, S4 belong to the balance bridge)
    blueScrews: [B(-0.11, 12.13), B(11.44, 4.19), B(12.14, 1.05), B(6.75, -10.16), B(4.11, -11.53),
      B(-11.70, 3.56), B(-10.78, -5.41)],
    blueScrewHeadDiameter: 1.46,
    steelScrews: {
      crownWheelCover: [B(-7.04, 1.03), B(-7.04, -1.13)], crownWheelCoverHeadDiameter: 1.11,
      windIdler1: [P.windIdler1], windIdler1HeadDiameter: 1.10,
      // rotor bearing: three slotted screws FIXED to the plate (they do not turn with the rotor)
      bearing: [clockBack(92, 1.38), clockBack(211, 1.38), clockBack(331, 1.38)].map(pt), bearingHeadDiameter: 1.31,
    },
    crownWheelCoverDisc: { c: P.crownWheel, r: 2.03 }, // polished, fixed
    // Hole jewels seen from the back (pink rubies in polished sinks, no chatons). d = visible
    // sink diameter. The barrel jewel hides under the rotor bar in the reference pose.
    upperJewels: {
      third: { c: P.third, d: 1.0 }, fourth: { c: P.fourth, d: 1.16 }, escape: { c: P.escape, d: 1.0 },
      barrel: { c: P.barrel, d: 1.0 }, A: { c: P.autoA, d: 0.70 }, B: { c: P.autoB, d: 1.16 },
      C: { c: P.autoC, d: 1.06 }, D: { c: P.autoD, d: 0.55 },
      pallet: { c: P.pallet, d: 0.65 }, // in the pallet bridge
      center: { c: [0, 0], d: 0.60 }, // in the fixed rotor-bearing disc (automatic module)
    },
    // T's pivot in the 3/4 plate is a plain polished bush, not a jewel
    plainPivots: { T: { c: P.autoT, d: 0.40 } },
    // Lower jewels in the pillar plate's dial face; escape and fourth sit in the dial-side
    // lower bridge instead (date module); the balance's lower Incabloc is the escapement's.
    lowerJewels: { center: P.center, third: P.third, pallet: P.pallet, barrel: P.barrel, A: P.autoA, B: P.autoB, C: P.autoC },
    // Engravings: gold-filled, upright DIN-like capitals, all reading correctly from the BACK.
    engravings: {
      // left-aligned at back x −6.73 (line centres), on the 3/4 plate (seen through the rotor window)
      block: [
        { text: 'DUW 6101', at: B(-6.73, -5.36), align: 'left' },
        { text: 'N° {movementSerial}', at: B(-6.73, -6.56), align: 'left' },
      ],
      blockCapHeight: 0.83,
      // arc on the 3/4 plate, back clock 23.1° → 49.8°, reads clockwise in back view, tops OUTWARD
      rubine: { text: '42 RUBINE', radius: 12.60, backClockDeg: [23.1, 49.8], capHeight: 0.85, tops: 'outward' },
      // arcs on the pillar ring (r 13.63–15.54): read counter-clockwise in back view, tops INWARD, gold
      madeIn: { text: 'MADE IN GERMANY', radius: 14.40, backClockDeg: [174.0, 148.3], capHeight: 0.50, tops: 'inward' },
      regulated: { text: 'REGULIERT IN 6 LAGEN', radius: 14.40, backClockDeg: [214.0, 186.0], capHeight: 0.50, tops: 'inward' }, // ±3°, under the rotor in the reference pose
    },
    // ---- dial side of the pillar plate
    dialSideRecesses: {
      motion: [{ c: P.center, r: 2.85 }, { c: P.minuteWheel, r: 2.78 }], // floor z.motionRecess
      date: [{ c: P.dateDrive, r: 2.05 }, { c: P.dateIdler1, r: 1.35 }, { c: P.dateIdler2, r: 1.45 }], // floor z.dateRecess
      setting: [{ c: P.settingWheel, r: 1.50 }, { c: P.settingIdler, r: 1.50 }], // floor z.settingPocket
      keyless: [[5.6, -3.0], [11.2, -3.0], [11.2, 4.2], [5.6, 4.2]], // floor z.keylessRecess (levers + springs), clipped to r 11.5
    },
    // five rubies (Ø 0.80, domed tops at z.ringJewelTop) on which the date ring slides
    ringSupportJewels: [36, 108, 180, 252, 324].map((deg) => pt(clockDial(deg, 12.9))),
    ringSupportJewelDiameter: 0.80,
  },

  // ---------------------------------------------------------------- escapement & regulating organ
  escapement: {
    palletToEscape: hyp(P.escape, P.pallet), // 2.907
    escapeTipRadius: hyp(P.escape, P.pallet) * Math.cos(30 * DEG), // 2.517: pallets embrace 2½ teeth (stones at ±30°)
    palletToBalance: hyp(P.pallet, P.balance), // 3.468
    // impulse-pin radius: lift ratio 25°/6.75° = 3.70 = L/r with L + r = pallet–balance distance
    rollerJewelRadius: hyp(P.pallet, P.balance) / (1 + 25 / 6.75), // 0.738
    balanceRadius: 4.70, balanceRimWidth: 0.32, balanceRimHeight: 0.44, balanceArms: 3, // gold, 3 tapered arms (MEAS OD 9.40)
    hairspring: { innerRadius: 0.45, outerRadius: 2.2, terminalRadius: 2.9, coils: 13, height: 0.08, thickness: 0.035 }, // blue, in-house
    // DUW regulation system (two rings on the bridge boss, set with pliers, no screw)
    regulatorKey: B(7.95, -1.43), // gold spring-key block, ≈ 11:20 of the balance (back view)
    studCarrier: B(5.86, -4.20), // stud carrier, ≈ 9:00 of the balance (back view)
    balanceCap: B(8.82, -4.28), // cap jewel inside the gold Incabloc lyre (upper)
    shock: 'Incabloc (gold lyre) top and bottom; the lower setting shows on the dial side at the balance staff',
    shockSettingRadius: 1.46, // upper setting band (inside the regulator rings)
    regulatorRings: { key: [1.51, 1.95], stud: [1.63, 2.03] }, // radii round the staff (as on the DUW 4001)
    shockLower: { radius: 0.80, z: [-0.30, 0.02] }, // lower Incabloc, set into the pillar plate from the dial side
    escapeSpokes: 4, // steel escape wheel, 15 club teeth, 4 straight arms (NOMOS train photo)
  },

  // ---------------------------------------------------------------- rotor
  rotor: {
    // LOCAL frame = dial-frame orientation with the heavy rim at local −Y (engine rot 0 =
    // hanging to 6 o'clock). Every official image shows rot.z = +71.8°. Shape (MEAS ±0.3):
    // half-moon rim + slightly S-curved bar along the diameter + collar round the bearing,
    // with a big window between bar and rim (through which the winding wheels and the
    // "DUW 6101" engraving show).
    // skirt (heavier outer rim reaching down to z.rotorSkirtUnder) starts at r 13.90, just
    // outside the balance bridge's lower pad (r 13.80)
    radii: { collarInner: 3.47, collar: 4.02, rimInner: 10.20, rimFlatInner: 11.55, rimFlatOuter: 13.67, skirt: 13.90, outer: 15.56 },
    outline: [[15.56, -0.10], [15.50, -1.33], [15.35, -2.54], [15.10, -3.74], [14.77, -4.93], [14.32, -6.08], [13.80, -7.18], [13.20, -8.25], [12.50, -9.25], [11.74, -10.22], [10.89, -11.10], [9.99, -11.93], [9.02, -12.68], [8.00, -13.35], [6.92, -13.94], [5.79, -14.44], [4.65, -14.86], [3.46, -15.17], [2.25, -15.40], [1.04, -15.53], [-0.19, -15.56], [-1.42, -15.50], [-2.64, -15.34], [-3.83, -15.08], [-5.01, -14.74], [-6.16, -14.29], [-7.26, -13.76], [-8.32, -13.15], [-9.33, -12.45], [-10.28, -11.68], [-11.17, -10.83], [-11.99, -9.92], [-12.73, -8.94], [-13.40, -7.92], [-13.98, -6.84], [-14.47, -5.71], [-14.88, -4.56], [-15.19, -3.37], [-15.41, -2.16], [-15.53, -0.95], [-12.13, 0.17], [-11.26, 0.11], [-9.56, 0.09], [-7.74, 0.33], [-5.59, 0.92], [-3.92, 1.31], [-3.54, 1.90], [-3.17, 2.47], [-2.70, 2.99], [-2.15, 3.40], [-1.54, 3.72], [-0.89, 3.92], [-0.20, 4.02], [0.49, 3.99], [1.17, 3.85], [1.80, 3.60], [2.39, 3.24], [2.91, 2.79], [3.34, 2.24], [3.67, 1.64], [4.27, 1.09], [5.26, 0.67], [7.28, 0.29], [9.55, -0.13], [12.31, -0.40], [13.21, -0.88]],
    window: [[3.09, -2.57], [2.69, -3.00], [2.23, -3.35], [1.73, -3.63], [1.19, -3.84], [0.62, -3.97], [0.04, -4.02], [-0.53, -3.98], [-1.11, -3.87], [-1.65, -3.67], [-2.16, -3.39], [-2.63, -3.05], [-3.04, -2.64], [-3.38, -2.17], [-3.66, -1.67], [-3.86, -1.13], [-5.45, -1.06], [-7.42, -1.49], [-9.77, -2.04], [-9.84, -2.70], [-9.54, -3.61], [-9.15, -4.50], [-8.69, -5.34], [-8.15, -6.14], [-7.53, -6.88], [-6.85, -7.56], [-6.11, -8.18], [-5.30, -8.71], [-4.46, -9.17], [-3.57, -9.56], [-2.66, -9.85], [-1.71, -10.06], [-0.75, -10.17], [0.21, -10.20], [1.18, -10.13], [2.12, -9.98], [3.06, -9.73], [3.96, -9.39], [4.83, -8.98], [5.65, -8.49], [6.44, -7.92], [7.15, -7.27], [7.81, -6.57], [8.39, -5.79], [8.90, -4.98], [9.33, -4.11], [9.68, -3.22], [9.94, -2.29], [9.43, -2.06], [7.82, -1.96], [6.43, -1.90], [5.38, -1.93]],
    // Raised (+0.05) gold-plated capitals on the rim flat, letter centres r 12.62, cap 1.06,
    // DIN-like; seen from the BACK they read counter-clockwise with tops toward the axis
    // ("NOMOS" therefore reads "SOWON" upside down at the top in the reference pose).
    // Local math angles: first "N" −8.6°, last "E" −173.1° (decreasing angle = reading direction).
    text: { text: 'NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE', radius: 12.62, capHeight: 1.06, relief: 0.05, firstLetterDeg: -8.6, lastLetterDeg: -173.1, colour: '#e3ac5a' },
    // Finish: rhodium-plated; bar, collar ring and rim inner step carry Glashütte ribbing
    // that continues the plate's bands at the reference angle (ribbingUV with frame
    // rotation 71.8°); the lettered flat is plain satin; the outer side wall and the bevel
    // are radially brushed.
    finish: { ribbedParts: ['bar', 'collar', 'rimInnerStep'], flat: 'satin', bevel: 'radially brushed' },
    // Bearing (fixed centre disc with 3 screws + centre jewel, ring of 9 balls, notched
    // bayonet ring "Bajonett"; the rotor collar turns round it).
    // bayonet ring kept inside r 3.28 (render ≈ 3.46) so the rotor wheel's tooth roots
    // (r 3.32) clear it — the bearing and the rotor must come apart in the exploded view
    bearing: { fixedDiscRadius: 2.43, balls: 9, ballPathRadius: 2.57, ballDiameter: 0.25, bayonetRing: [2.72, 3.28], bayonetNotches: 6 },
    // rotor wheel (60 t, module modules.rotorWheel) under the collar drives the reverser
    wheel: { teeth: autoTrain.rotorWheel.teeth },
    massG: 1.1, // EST (rhodium-plated brass ≈ 130 mm³)
  },

  // ---------------------------------------------------------------- date (Update ring date)
  date: {
    stepDeg: DATE_STEP_DEG, // 11.6129°
    // THE RING (rotating, under the dial). White, matte; 31 internal castellated teeth; two
    // red markers on its top face. Nothing else is printed on it.
    ring: {
      outerRadius: 17.0, faceInnerRadius: 12.27, toothTipRadius: 11.67, teeth: 31, thickness: 0.20,
      // tooth j centred at LOCAL clock angle j·stepDeg (j = 0…30); castellated, half a pitch wide.
      // Gaps are then always at world clock angles (n + ½)·stepDeg for every whole date —
      // that is where the jumper's beak rests.
      toothWidthFrac: 0.5,
      colour: '#e4e4e4',
    },
    // Markers: ring-LOCAL clock angles ½·step and 1½·step (math angles 84.19° and 72.58°),
    // i.e. they bracket "1" at rot 0. Drive the ring with drive: { key: 'date' }:
    //   rotor.rotation.z = state.rot.date = −2π·state.datePos/31.
    // datePos = D − 1 on date D → markers at clock (D − ½)·step and (D + ½)·step, the two
    // slots either side of today's numeral; during the 23:45–00:15 drag they creep on.
    markers: { localClockDeg: [DATE_STEP_DEG / 2, 1.5 * DATE_STEP_DEG], spanDeg: 7.0, r: [16.15, 16.93], colour: '#c80e16' },
    // jumper: spring detent whose beak rests in a tooth gap; the drag lifts it over one tooth
    jumper: { beakClockDeg: 27.5 * DATE_STEP_DEG, beakRadius: 11.80, anchor: pt(clockDial(312, 10.7)) },
    // switching (program) wheel: hook tip reaches r 11.90 from the centre when it points
    // straight out (local math angle = ang(center, dateSwitch)) at local midnight, where
    // state.rot.dateSwitch = 0. The wheel turns CW (dial view) once a day.
    switching: { hookReach: 2.58, hookAngleAtMidnightDeg: Math.atan2(P.dateSwitch[1], P.dateSwitch[0]) / DEG, camRadius: 0.75 },
    corrector: { starArms: 5, armTipRadius: 2.25 }, // static; arms stay inside r 11.6 (clear of the teeth)
    supportJewels: 5,
    // Steel bridges on the dial side (traced on the dial-side render, ±0.4; every point
    // inside r 11.55 so they clear the ring's teeth). Built by the date module.
    bridges: {
      // large plate on the left over the switching-wheel stack and the idlers; round window
      // at (−7.2, 1.55) r 0.75 shows the program wheel's teeth; screws (−8.3, 6.1) (−8.4, −1.9)
      date: [[-8.7, 7.2], [-8.2, 7.1], [-7.4, 6.6], [-6.9, 5.9], [-6.6, 4.7], [-6.0, 4.35], [-5.3, 4.3], [-4.85, 3.75],
        [-5.05, 3.15], [-5.55, 2.85], [-5.35, 2.2], [-5.1, 1.5], [-5.05, 0.6], [-5.4, -0.1], [-5.9, -0.6], [-6.5, -0.9],
        [-7.5, -0.95], [-7.8, -1.6], [-8.0, -2.4], [-8.9, -2.6], [-9.7, -2.35], [-10.6, -1.7], [-11.25, -0.5],
        [-11.45, 1.0], [-11.1, 3.0], [-10.45, 4.7], [-9.85, 5.9], [-9.2, 6.75]],
      dateWindow: { c: [-7.2, 1.55], r: 0.75 },
      dateScrews: [[-8.3, 6.1], [-8.4, -1.9], [-5.5, 3.65]],
      // small steel bridge over the lower half of the hour wheel (the gilt upper half shows
      // as a lens in the render); hole r 0.75 for the hour-wheel pipe
      motion: [[-1.65, 1.15], [-0.6, 1.25], [0.6, 1.2], [1.6, 0.95], [2.4, 0.6], [2.75, -0.3], [2.6, -0.9], [1.2, -0.75],
        [0.4, -1.4], [-0.8, -1.85], [-1.55, -1.55], [-1.85, -0.4]],
      // keyless cover plate at 1–2 o'clock (screw (7.9, 8.0), hole (7.95, 5.9), screw (9.45, 4.3))
      keyless: [[4.5, 8.3], [4.8, 8.85], [5.4, 9.05], [5.95, 8.75], [6.4, 9.35], [7.2, 8.85], [8.4, 7.75], [9.2, 6.8],
        [10.0, 5.5], [10.5, 4.6], [9.9, 4.0], [9.0, 3.75], [7.3, 4.0], [6.85, 4.4], [6.85, 7.2], [6.0, 7.5], [5.0, 7.55]],
      keylessScrews: [[7.9, 8.0], [9.45, 4.3]],
      // long bridge at 6 o'clock carrying the escape and fourth lower jewels
      // (screws (−5.9, −8.9), (3.6, −9.15), (−0.1, −10.35))
      lower: [[-5.9, -8.3], [-4.4, -8.1], [-4.3, -6.7], [-3.7, -6.25], [-0.9, -6.25], [-0.4, -6.45], [1.9, -7.95],
        [4.4, -7.95], [5.3, -9.0], [5.4, -10.0], [3.0, -11.0], [0.0, -11.45], [-2.95, -11.0], [-5.2, -10.2], [-6.1, -9.4]],
      lowerScrews: [[-5.9, -8.9], [3.6, -9.15], [-0.1, -10.35]],
      lowerJewels: { escape: P.escape, fourth: P.fourth },
    },
  },

  // ---------------------------------------------------------------- dial
  dial: {
    radius: 17.85, visibleRadius: 17.52, // Ø 35.0 visible (MEAS); disc radius EST
    finish: 'galvanised, white silver-plated, fine frosted grain',
    colour: '#e9e9e9', print: '#111111', gold: '#c8a35e',
    // Tangente numerals (same glyph family as the 139), lying along their radius
    numerals: {
      hours: [12, 2, 4, 8, 10], r: [10.55, 13.97], height: 3.41, stroke: 0.24,
      outwardTops: [12, 2, 10], inwardTops: [4, 8], // rotation.z = −θ (outward) / −θ + π (inward)
      widths: { 12: 1.91, 2: 1.45, 4: 1.54, 8: 1.32, 10: 1.89 }, // "12": 1 0.25 + gap 0.26 + 2 1.35; "10": 1 0.25 + gap 0.25 + 0 1.33
    },
    batons: { hours: [1, 3, 5, 7, 9, 11], r: [10.53, 14.06], rShort: { 5: [10.93, 14.06], 7: [10.93, 14.06] }, width: 0.19 },
    minuteTrack: {
      r: [14.79, 15.62], minorWidth: 0.07, majorWidth: 0.205, // no rails, no dots
      shortened: { 28: [14.79, 15.24], 29: [14.79, 15.24], 30: [14.79, 15.50], 31: [14.79, 15.24], 32: [14.79, 15.24] },
    },
    logo: { text: 'NOMOS', baselineY: 6.54, capHeight: 0.99, width: 8.26, stroke: 0.15,
      letters: [[-4.15, -3.21], [-2.57, -1.51], [-0.83, 0.91], [1.60, 2.66], [3.26, 4.11]] }, // pointed M
    city: { text: 'GLASHÜTTE', baselineY: 5.39, capHeight: 0.68, width: 6.13, stroke: 0.08, umlautTop: 6.20,
      letters: [[-3.04, -2.62], [-2.23, -1.98], [-1.64, -1.21], [-0.87, -0.57], [-0.15, 0.19], [0.66, 1.04], [1.38, 1.72], [2.06, 2.40], [2.79, 3.09]] },
    model: { text: 'neomatik', colour: '#c8a35e', metallic: true, glitter: true, // gold print with glitter (#987439 … #f0d9a9)
      baselineY: 3.97, xHeight: 0.53, ascender: 0.69, width: 6.56,
      letters: [[-3.30, -2.79], [-2.40, -1.94], [-1.51, -0.96], [-0.57, 0.23], [0.70, 1.09], [1.51, 1.77], [2.32, 2.45], [2.91, 3.26]] },
    madeIn: { text: 'MADE IN GERMANY', r: [15.40, 15.82], capHeight: 0.42, stroke: 0.06, spanDeg: [165.0, 194.9], topsInward: true,
      words: { 'MADE IN': [182.0, 194.9], GERMANY: [165.0, 178.3] } },
    // Update date track: 1–31 printed on the (fixed) dial, 31 through-slots between them.
    dateNumerals: {
      r: [16.12, 16.99], capHeight: 0.87, stroke: 0.075, digitWidth: 0.33, digitAdvance: 0.45, // DIN-style condensed, light
      clockDegOf: (d) => (d % 31) * DATE_STEP_DEG, // "31" at 12 o'clock, "1" at 11.61°
      inverted: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], // tops toward the centre (read upright from 6)
    },
    dateSlots: {
      count: 31, clockDegOf: (k) => (k + 0.5) * DATE_STEP_DEG, // slot k between dates k and k+1
      r: [16.25, 16.83], width: 0.58, angularDeg: 6.0, endRadius: 0.29, // stadiums, semicircular ends following the arc
      wallColour: '#c8c8c8', // slot walls (white plating on the cut edge)
    },
    subdial: {
      center: P.fourth, recessRadius: 5.45, bevel: 0.15, depth: 0.15, // soft 45° stamped step
      floorColour: '#e3e3e3', snailPitch: 0.12, // concentric turning ("snailed")
      ticks: { count: 12, r: [4.15, 5.19], width: 0.07 }, // all equal, no numerals
    },
    // two brass dial feet into blind holes of the pillar plate, clear of every dial-side part
    feet: { clockDeg: [10, 230], r: 10.9, radius: 0.28, depth: 0.75 },
    centreHoleRadius: 1.0,
  },

  // ---------------------------------------------------------------- hands (black oxidised steel "Fadenzeiger")
  hands: {
    material: 'steel, black oxidised, satin', colour: '#1c1c1e', highlight: '#4c4c4c', // NOT blued (that is the gold ref. 195)
    pbr: { metalness: 0.7, roughness: 0.35 },
    hour: { tip: 10.00, width: 0.28, taper: 0.42 }, // constant width, pointed
    minute: { tip: 15.00, width: 0.26, taper: 0.45 },
    seconds: { tip: 4.70, tail: 1.72, width: 0.24, square: true, hubRadius: 0.50, ringRadius: 0.20, ringHoleRadius: 0.08 },
    hourCollet: 1.075, // radius, flat black disc
    minuteCollet: 0.75, // radius, black disc on top
    capRadius: 0.41, // polished domed steel centre cap (reads white)
    bores: { hour: 0.655, minute: 0.405, seconds: 0.09 },
  },

  // ---------------------------------------------------------------- case
  case: {
    radius: 19.25, height: 7.4, lugToLug: 47.3, lugWidth: 19.0, // NOMOS
    material: '316L stainless steel, fully polished',
    // three-part: bezel / middle case / snap-on case back; hairline seams at z 1.46 and −3.00
    bezel: { top: zb(7.28), bottom: zb(5.91), outerRadius: 19.25, flatOuter: 19.08, flatInner: 18.10, edgeRadius: 0.17 },
    middle: { top: zb(5.91), bottom: zb(1.45), outerRadius: 19.25, boreBelowDial: 17.95 },
    // outer lathe profile [r, z] from the crystal edge to the window lip
    profile: [[18.02, zb(7.40)], [18.10, zb(7.32)], [18.10, zb(7.28)], [19.08, zb(7.28)], [19.20, zb(7.24)], [19.25, zb(7.12)],
      [19.25, zb(5.91)], [19.25, zb(1.45)], [19.18, zb(1.45)], [19.18, zb(0.93)], [18.96, zb(0.85)],
      [17.65, zb(0.00)], [15.60, zb(0.00)], [15.00, zb(0.20)]],
    // inner profile under the crystal: grey ground crystal-edge ledge 17.75–18.10, satin
    // flange top 17.52–17.75 (light band), flange inner wall down to the dial (visible dial edge)
    innerProfile: [[18.10, 1.95], [17.75, 1.95], [17.75, 1.80], [17.52, 1.80], [17.52, 0.80]],
    flange: { inner: 17.52, outer: 17.75, colour: '#cfcfcf' },
    seamsZ: [zb(5.91), zb(1.45)],
    crystal: { radius: 18.10, topRadius: 18.02, seatRadius: 18.45, z: [zb(6.40), zb(7.40)], flat: true, arCoating: 'inner side only', ior: 1.77 },
    caseback: {
      top: zb(1.45), bottom: zb(0), outerRadius: 19.18, // vertical band zb 0.93–1.45
      bevelTopZ: zb(0.85), bevelOuterRadius: 18.96, chamferRadius: 17.65, // 34° chamfer to the flat back face
      flatInner: 15.60, lipZ: zb(0.20), aperture: 15.0, // window lip chamfer 15.60 → 15.00; clear Ø 30.0
      glassSeatRadius: 15.42,
      text: 'TANGENTE {caseSerial}', textRadius: 16.65, textCapHeight: 0.92,
      textSpanDeg: [163.8, 195.3], // dial-frame clock angles; tops toward the centre (upright at 6 seen from the back)
      textColour: '#8a8a8a', // grey, unfilled
      fastening: 'snap-on (no screws)',
    },
    backGlass: { radius: 15.42, z: [zb(0.20), zb(1.10)] },
    casingRing: { inner: 15.62, lipOuter: 16.60, outer: 17.93, z: [-2.95, 0.15], lipBack: -2.10, dialSeat: { inner: 17.05, z: 0.50 }, stemSlotHalfWidth: 0.6 },
    // Lugs: straight, parallel, polished, drilled. Profile in the (y, z) plane for the 12
    // o'clock pair (mirror y for 6 o'clock); each lug a 1.23 plate at x ∈ ±[9.60, 10.83].
    lug: {
      xInner: 9.60, xOuter: 10.83,
      profile: [[15.0, zb(5.72)], [19.82, zb(5.72)], [23.62, zb(2.76)], [23.62, zb(-0.17)], [22.64, zb(-0.17)], [19.26, zb(2.55)], [15.0, zb(2.55)]],
      cornerRadius: 0.3,
      springBar: { y: 21.49, z: zb(2.46), holeRadius: 0.56, pinRadius: 0.42, barRadius: 0.75 },
    },
    crown: {
      radius: 2.88, rootRadius: 2.63, faceRadius: 2.45, // Ø 5.75 at the flute tips
      from: 19.35, skirtTo: 19.90, to: 21.72, // protrudes 2.47; bevelled serrated skirt 19.35–19.90
      flutes: 22, fluteDepth: 0.25, edgeRadius: 0.15,
      axisZ: zb(3.36),
      text: 'NOMOS', textWidth: 4.6, textCapHeight: 0.54, textColour: '#4a4a4a',
      pushPull: true, positions: 3, // 1 wind, 2 quick date (both ways), 3 time set + stop seconds
    },
    // winding stem stations along +x (dial frame, axis y = stemY, z = z.stemAxis)
    stem: { pilot: 5.4, journal: 6.0, sq0: 7.4, sq1: 9.55, wpIn: 9.62, wpTeeth: [9.77, 10.32], wpOut: 10.45, shoulder: 10.6, groove: [11.05, 11.50], neck: 18.9, thread: 19.9, end: 20.6 },
    slidingPinionX: [8.30, 9.55],
    strap: {
      material: 'Horween Genuine Shell Cordovan, black, rembordé (turned edges)',
      width: 19, widthAtBuckle: 17, thickness: 2.5, thicknessAtEnd: 2.0,
      colour: '#121316', edgeHighlight: '#33373b', roughness: 0.4,
      stitch: { colour: '#1a1a1a', inset: 1.5, pitch: 1.3, fullLength: true },
      length: { buckleSide: 75, tail: 115 }, holes: 6, keepers: { fixed: 1, floating: 1 },
      exitZ: [zb(0.53), zb(3.03)],
    },
    buckle: {
      type: 'square winged pin buckle (Flügelschließe eckig)', material: 'polished stainless steel',
      outerWidth: 20.5, frontBarDepth: 3.4, sideBar: 1.15, length: 16.5, tongueDiameter: 1.2, thickness: 1.6,
      text: 'NOMOS', // engraved on the wide front bar
    },
  },
};

if (typeof window !== 'undefined') {
  // Sanity check: every derived module should be in a plausible horological range.
  for (const [k, v] of Object.entries(modules)) {
    if (!(v > 0.03 && v < 0.2)) console.warn(`[spec 147] module ${k} = ${v.toFixed(4)} looks wrong`);
  }
}
