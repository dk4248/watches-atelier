// Grand Seiko SBGA211G "Snowflake" — caliber 9R65 Spring Drive (automatic, Magic Lever,
// Tri-synchro Regulator, glide wheel 8 rev/s, gliding seconds, 72 h power reserve,
// power-reserve indicator at 7–8, date at 3). High-intensity titanium, Ø41 × 12.5 mm.
// Single source of truth for every dimension, position, level, ratio and finish.
//
// Sources (read them before building — research/gs-sbga211/):
//  - movement.md  teardown photos (The Naked Watchmaker, Worn & Wound, Loupe This), master
//                 frame mov_naked_25 (≈22.6 px/mm, ±0.2–0.3 mm on jewels, ±0.5 on bridge edges).
//  - exterior.md  case/dial/hands measured on rectified loupe/official images (±0.3 %).
//  - plan.md      the build plan and every decision the lead took where the research left a
//                 choice (all marked LEAD below).
// Conflicts resolved in favour of exterior.md (measured + hands-on review + official render):
//  - power-reserve hand: FULL points towards 9 (263° clockwise from 12), EMPTY points to 12;
//  - PR pivot (−3.17, −5.80) and date numeral radius 12.0 (movement.md used a 7 % small
//    scale on ltF_12); crown/stem axis z = −0.90 (side photo) instead of −0.60.
//
// FRAME (CONTRACT): units mm; +Z out of the dial; 12 o'clock = +Y; 3 o'clock (crown) = +X.
// z = 0 is the dial-side face of the main plate. Back-view measurements → B(); exterior
// heights (z = 0 at the dial top) → zd(). Dial top is z +1.20, case-back plane z −7.40.

const DEG = Math.PI / 180;
const B = (x, y) => [-x, y]; // back-view measurement → dial-side frame
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const pt = (p) => [r4(p[0]), r4(p[1])]; // for fixed outlines only — derived arbors keep full precision
// θ clockwise from 12 in the BACK view (crown on the left) → dial frame
const polar = (r, thBackDeg) => B(r * Math.sin(thBackDeg * DEG), r * Math.cos(thBackDeg * DEG));
// θ clockwise from 12 as seen from the DIAL → dial frame
const clock = (r, cwDeg) => [r * Math.sin(cwDeg * DEG), r * Math.cos(cwDeg * DEG)];
// maths angle (CCW from +X) → dial frame
const atAngle = (r, deg) => [r * Math.cos(deg * DEG), r * Math.sin(deg * DEG)];
const along = (from, toward, d) => {
  const L = hyp(from, toward);
  return [from[0] + ((toward[0] - from[0]) * d) / L, from[1] + ((toward[1] - from[1]) * d) / L];
};
// intersection of circle (c1, r1) and circle (c2, r2), the solution nearest `near`
function circleX(c1, r1, c2, r2, near) {
  const D = hyp(c1, c2);
  const a = (r1 * r1 - r2 * r2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = (c2[0] - c1[0]) / D, uy = (c2[1] - c1[1]) / D;
  const bx = c1[0] + a * ux, by = c1[1] + a * uy;
  const p1 = [bx - h * uy, by + h * ux], p2 = [bx + h * uy, by - h * ux];
  return hyp(p1, near) <= hyp(p2, near) ? p1 : p2;
}
const mod = (d, z1, z2) => (2 * d) / (z1 + z2); // module from a centre distance
// Tip radii as drawn by src/geom/gear.js: wheels addendum 1.3 m, pinions 0.9 m.
const tipR = (m, z) => (m * (z + 2.6)) / 2;
const pinionTipR = (m, z) => (m * (z + 1.8)) / 2;
const zd = (zDial) => r4(zDial + 1.2); // exterior height (dial top = 0) → movement frame

// ======================================================================== tooth counts
// None are published. Image counts (movement.md §7): barrel ≈146, centre ≈84–85, centre
// pinion 14 (FFT), a spoked wheel 80.0, another ≈75–76, ratchet ≈74. The rest are chosen so
// the official rates come out EXACTLY: centre 1 rph, seconds 1 rpm, glide 8 rev/s
// (centre → glide = 6 · 10 · 8 · 7.5 · 8 = 28,800, the official "28,800 per hour").
const train = {
  barrel: { teeth: 146 }, // MEAS M
  center: { teeth: 84, pinion: 14 }, // MEAS M / MEAS M
  third: { teeth: 80, pinion: 14 }, // wheel MEAS M, pinion ESTIMATE
  fourth: { teeth: 80, pinion: 8 }, // ESTIMATE (central seconds wheel)
  fifth: { teeth: 75, pinion: 10 }, // wheel MEAS L
  sixth: { teeth: 64, pinion: 10 }, // ESTIMATE
  glide: { pinion: 8 }, // 8 leaves (n36)
  // motion works (the kinematics reads cannon/minuteWheel/hourWheel tooth counts)
  cannon: { teeth: 14 },
  minuteWheel: { teeth: 42, pinion: 10 }, // (42/14)·(40/10) = 12
  hourWheel: { teeth: 40 },
  // date works (dial side)
  dateDriver: { teeth: 80 }, // 24-hour wheel driven by the hour wheel (40 → 80)
  dateRing: { teeth: 31 }, // internal teeth
};

// Keyless (manual winding) and setting train. The kinematics reads ratchet / crownWheel /
// windingPinion; with two intermediates between crown wheel and ratchet its ratios are the
// physical ones: crown turn → 14/74 ratchet turn (official "5 crown turns ≈ 10 h": 9.9 h).
// LEAD: winding pinion → crown wheel (on the stem line, behind the stem) → crown transmission
// wheel (tall arbor: lower wheel at the crown-wheel level, upper wheel at the ratchet level)
// → keyless intermediate (jewelled, MEAS H position) → ratchet. Directions while winding
// (seen from the dial): crown wheel CW, transmission CCW, intermediate CW, ratchet CCW — so
// state.rot.crownWheel has the right sign as it is (no flip).
const keyless = {
  ratchet: { teeth: 74 }, // MEAS M
  crownWheel: { teeth: 30 },
  windingPinion: { teeth: 14 }, // radial teeth: its back-facing (−Z) side meshes the crown wheel's +X edge; 9 Breguet teeth inside
  crownTransmission: { lower: 24, upper: 24 },
  keylessIntermediate: { teeth: 38 },
  slidingPinion: { breguet: 9, contrate: 12 },
  settingWheel: { teeth: 19 },
  settingIntermediate: { teeth: 30 },
  crownTurnsFor10h: 5, // OFFICIAL (manual)
};

// ======================================================================== arbor layout
// Measured positions (dial frame). Derived positions are computed so that every meshing pair
// sits at exactly m·(z1 + z2)/2 with the pair's module.
const P = {
  center: [0, 0], // centre (2nd) wheel, cannon pinion, 4th/seconds arbor, rotor pivot
  fourth: [0, 0], // central seconds — coaxial, its arbor runs through the hollow centre arbor
  rotor: [0, 0],
  // 3rd wheel: measured B(3.34, −0.57) (±0.3). LEAD: moved 0.40 mm round the centre (same
  // 3.388 mm centre distance) so its pinion clears the barrel's tip circle by 0.05 — with the
  // measured point the 3rd pinion would overlap the barrel teeth by 0.34 mm and the train
  // could not be assembled (3rd wheel above the barrel, pinion below it).
  third: atAngle(Math.hypot(3.34, 0.57), 182.94),
  fifth: B(-1.57, 2.97), // MEAS M
  sixth: B(-2.73, 6.19), // MEAS H (gold Diashock)
  glide: B(-2.12, 9.32), // MEAS H (gold Diashock) — generator rotor, 8 rev/s
  barrel: B(1.2, -7.65), // MEAS H — barrel arbor = ratchet
  keylessIntermediate: B(-4.09, -3.91), // MEAS H (pink jewel in the automatic bridge)
  clickScrew: B(-5.15, -8.7), // MEAS H
  clickTip: B(-3.35, -8.37), // MEAS H
  prA: B(9.65, -2.25), // PR differential jewels, MEAS H
  prB: B(10.37, -4.85),
  prIntermediate: [-6.75, -3.8], // dial side, ESTIMATE
  prDisplay: [-3.17, -5.8], // = PR hand pivot, exterior.md §5.5 MEAS M (±0.10)
  stem: [0, 0], // stem axis: y = 0, along +X (crown at x 19.8 → 23.2)
};
const MR = mod(hyp(P.barrel, P.keylessIntermediate), keyless.ratchet.teeth, keyless.keylessIntermediate.teeth); // 0.1157
const M_CROWN = 0.12; // LEAD: crown wheel ↔ winding pinion (crossed axes) and ↔ transmission lower wheel
const MA = mod(2.5, train.cannon.teeth, train.minuteWheel.teeth); // motion works A: 0.0893
const MB = mod(2.5, train.minuteWheel.pinion, train.hourWheel.teeth); // motion works B: 0.100
// Magic Lever transmission (pawl) wheel: measured B(5.35, −5.10) (M); its 10-leaf pinion
// meshes the ratchet, so it is placed on the ratchet module along the measured direction (Δ 0.012).
P.pawlWheel = along(P.barrel, B(5.35, -5.1), (MR * (keyless.ratchet.teeth + 10)) / 2);
// Crown wheel on the stem line, behind the stem; the winding pinion meshes its +X edge.
P.crownWheel = [8.3, 0]; // LEAD (research: round recess near B(−8.0, −1.8); a crossed-axis mesh needs y = stem y)
P.windingPinion = [P.crownWheel[0] + (M_CROWN * keyless.crownWheel.teeth) / 2, 0]; // 10.10
P.crownTransmission = circleX(
  P.keylessIntermediate, (MR * (keyless.keylessIntermediate.teeth + keyless.crownTransmission.upper)) / 2,
  P.crownWheel, (M_CROWN * (keyless.crownWheel.teeth + keyless.crownTransmission.lower)) / 2, [7.6, -3.2],
); // ≈ (7.60, −3.16): its teeth show in the automatic bridge's keyless window
// dial side: sliding pinion on the stem (contrate face at x 8.55, Breguet face at x 9.70)
P.slidingPinion = [9.12, 0];
P.settingWheel = [8.55 - (MA * keyless.settingWheel.teeth) / 2, 0]; // pitch circle reaches the contrate face
P.minuteWheel = atAngle(2.5, 10); // LEAD (d = 2.5 sets the motion-works modules)
P.settingIntermediate = circleX(
  P.minuteWheel, (MA * (train.minuteWheel.teeth + keyless.settingIntermediate.teeth)) / 2,
  P.settingWheel, (MA * (keyless.settingIntermediate.teeth + keyless.settingWheel.teeth)) / 2, [5.6, 0.9],
);
P.dateDriver = atAngle((MB * (train.hourWheel.teeth + train.dateDriver.teeth)) / 2, -42); // d 6.00
// PR differential: three jewelled arbors under the PR bridge (MEAS H). c is moved ≤ 0.02 along
// the measured direction so the b ↔ c mesh shares b's module.
const M_PRD = mod(hyp(P.prA, P.prB), 8, 64);
P.prC = along(P.prB, B(9.75, -7.67), (M_PRD * (64 + 13)) / 2);
// Hacking (stop) lever: finger tip 0.1 clear of the glide disc's rim (touches it at
// B(−5.1, 9.3) when the crown is at the 2nd click) — ESTIMATE
P.stopLever = { pivot: [9.3, 4.3], finger: [5.5, 9.3] };

// ======================================================================== modules
const modules = {
  barrel: mod(hyp(P.barrel, P.center), train.barrel.teeth, train.center.pinion), // barrel ↔ centre pinion 0.0968
  center: mod(hyp(P.center, P.third), train.center.teeth, train.third.pinion), // centre ↔ 3rd pinion 0.0691
  third: mod(hyp(P.third, P.fourth), train.third.teeth, train.fourth.pinion), // 3rd ↔ 4th pinion 0.0770
  fourth: mod(hyp(P.fourth, P.fifth), train.fourth.teeth, train.fifth.pinion), // 4th ↔ 5th pinion 0.0747
  fifth: mod(hyp(P.fifth, P.sixth), train.fifth.teeth, train.sixth.pinion), // 5th ↔ 6th pinion 0.0805
  sixth: mod(hyp(P.sixth, P.glide), train.sixth.teeth, train.glide.pinion), // 6th ↔ glide pinion 0.0886
  motionA: MA, // cannon ↔ minute wheel, minute wheel ↔ setting intermediate ↔ setting wheel
  motionB: MB, // minute pinion ↔ hour wheel ↔ date driver
  ratchet: MR, // ratchet ↔ pawl pinion, ratchet ↔ keyless intermediate ↔ transmission upper
  crown: M_CROWN, // winding pinion ↔ crown wheel ↔ transmission lower
  prDiff: M_PRD, // prA pinion ↔ prB wheel ↔ prC pinion
  prDial1: mod(hyp(P.prB, P.prIntermediate), 12, 36), // output pinion ↔ intermediate wheel
  prDial2: mod(hyp(P.prIntermediate, P.prDisplay), 10, 40), // intermediate pinion ↔ display wheel
};

// Every meshing pair: [arbor A, arbor B, teeth A, teeth B, module key, rotation A, rotation B].
// Arbors are SPEC.layout keys; rotations are SPEC.rotations keys (the angle each mesh turns
// with). A is the "driver" whose mesh keeps local phase 0 (gear.meshPhase convention); B gets
// phaseB = meshPhase(atan2(B − A), zA, zB, phaseA). A pair split across two builders: both
// compute the same constant from this line (all inputs are here), the A side with phase 0.
const meshes = [
  ['barrel', 'center', 146, 14, 'barrel', 'barrel', 'center'],
  ['center', 'third', 84, 14, 'center', 'center', 'third'],
  ['third', 'fourth', 80, 8, 'third', 'third', 'fourth'],
  ['fourth', 'fifth', 80, 10, 'fourth', 'fourth', 'fifth'],
  ['fifth', 'sixth', 75, 10, 'fifth', 'fifth', 'sixth'],
  ['sixth', 'glide', 64, 8, 'sixth', 'sixth', 'glide'],
  ['center', 'minuteWheel', 14, 42, 'motionA', 'cannon', 'minuteWheel'], // cannon pinion ↔ minute wheel
  ['minuteWheel', 'center', 10, 40, 'motionB', 'minuteWheel', 'hourWheel'], // minute pinion ↔ hour wheel
  ['center', 'dateDriver', 40, 80, 'motionB', 'hourWheel', 'dateDriver'], // hour wheel ↔ date driving wheel
  ['minuteWheel', 'settingIntermediate', 42, 30, 'motionA', 'minuteWheel', 'settingIntermediate'],
  ['settingIntermediate', 'settingWheel', 30, 19, 'motionA', 'settingIntermediate', 'settingWheel'],
  ['barrel', 'pawlWheel', 74, 10, 'ratchet', 'ratchet', 'pawlWheel'], // ratchet ↔ pawl-wheel pinion
  ['barrel', 'keylessIntermediate', 74, 38, 'ratchet', 'ratchet', 'keylessIntermediate'],
  ['keylessIntermediate', 'crownTransmission', 38, 24, 'ratchet', 'keylessIntermediate', 'crownTransmission'], // ↔ upper wheel
  ['crownWheel', 'crownTransmission', 30, 24, 'crown', 'crownWheel', 'crownTransmission'], // ↔ lower wheel
  ['prB', 'prA', 64, 8, 'prDiff', 'prB', 'prA'],
  ['prB', 'prC', 64, 13, 'prDiff', 'prB', 'prC'],
  ['prB', 'prIntermediate', 12, 36, 'prDial1', 'prB', 'prIntermediate'], // dial side: output pinion on prB's arbor
  ['prIntermediate', 'prDisplay', 10, 40, 'prDial2', 'prIntermediate', 'prDisplay'],
];

// ======================================================================== rates (kinematics)
// Spring Drive: the kinematics counts glide-wheel turns (B = glideHz) and turns every arbor
// smoothly. Periods are derived from the tooth counts, so the ratios are exact.
const GLIDE_DIR = +1; // CCW seen from the dial (CW through the case back)
const per = {};
per.center = 3600;
per.third = (per.center * train.third.pinion) / train.center.teeth; // 600 s
per.fourth = (per.third * train.fourth.pinion) / train.third.teeth; // 60 s — the seconds hand
per.fifth = (per.fourth * train.fifth.pinion) / train.fourth.teeth; // 7.5 s
per.sixth = (per.fifth * train.sixth.pinion) / train.fifth.teeth; // 1 s
per.glide = (per.sixth * train.glide.pinion) / train.sixth.teeth; // 0.125 s = 8 rev/s
per.barrel = (per.center * train.barrel.teeth) / train.center.pinion; // 37,543 s = 10.43 h
per.minuteWheel = (3600 * train.minuteWheel.teeth) / train.cannon.teeth; // 3 h
per.hourWheel = (per.minuteWheel * train.hourWheel.teeth) / train.minuteWheel.pinion; // 12 h
per.dateDriver = (per.hourWheel * train.dateDriver.teeth) / train.hourWheel.teeth; // 24 h
per.settingIntermediate = (per.minuteWheel * keyless.settingIntermediate.teeth) / train.minuteWheel.teeth;
per.settingWheel = (per.settingIntermediate * keyless.settingWheel.teeth) / keyless.settingIntermediate.teeth;
// state.rot[key] for each (CCW-positive seen from the dial). cannon / minuteWheel / hourWheel
// come from train.cannon/minuteWheel/hourWheel; hands, ratchet, crownWheel, stem, rotor and
// date are provided by the kinematics too.
const arbors = {
  barrel: { period: per.barrel, dir: +1 },
  center: { period: per.center, dir: -1 },
  third: { period: per.third, dir: +1 },
  fourth: { period: per.fourth, dir: -1 },
  fifth: { period: per.fifth, dir: +1 },
  sixth: { period: per.sixth, dir: -1 },
  glide: { period: per.glide, dir: GLIDE_DIR },
  dateDriver: { period: per.dateDriver, dir: +1 },
  settingIntermediate: { period: per.settingIntermediate, dir: -1 },
  settingWheel: { period: per.settingWheel, dir: +1 },
};

// ======================================================================== power / winding
const POWER_H = 72; // OFFICIAL
const BARREL_TURNS = POWER_H / (per.barrel / 3600); // 6.90 turns of the barrel for 72 h
// Magic Lever: an eccentric (throw e) on the rotor shaft drives the lever; its two pawls
// ("pull" and "push", on opposite flanks of the pawl wheel) advance the wheel on BOTH strokes,
// so one rotor turn advances the pawl wheel's tooth circle by 4e, whichever way it turns.
const ECC = 0.5; // ESTIMATE (movement.md §8.3)
const PAWL_TIP_R = 3.2, PAWL_DEPTH = 0.13, PAWL_CONTACT_R = PAWL_TIP_R - PAWL_DEPTH / 2;
const RATCHET_PER_ROTOR_RAD = ((4 * ECC) / PAWL_CONTACT_R / (2 * Math.PI)) * (10 / keyless.ratchet.teeth); // 0.0137
const automatic = {
  // rotor as a physical pendulum (kinematics): heavy sector = local −Y, hangs at 6 at rot 0
  naturalPeriod: 0.9, // s (LEAD: a little slower than the real ≈0.3 s so the swing reads on screen)
  damping: 0.12, // ball-bearing rotor: light damping, several swings before it settles
  ratchetPerRotorRad: RATCHET_PER_ROTOR_RAD, // ratchet radians per radian of rotor travel (either way)
  windPerRad: RATCHET_PER_ROTOR_RAD / (2 * Math.PI * BARREL_TURNS), // ≈ 500 rotor turns empty → full
  // builder data (automatic.js)
  eccentric: { throw: ECC, radius: 0.75, z: [-3.96, -3.9] }, // fixed to the rotor shaft (turns with rot.rotor)
  pawlWheel: { teeth: 110, pinion: 10, tipRadius: PAWL_TIP_R, depth: PAWL_DEPTH, contactRadius: PAWL_CONTACT_R },
  // pawl wheel angle = −(74/10)·rot.ratchet (its pinion meshes the ratchet; it is back-driven
  // when the crown winds, the spring pawls then click over its teeth).
  lever: {
    // Lever = rigid link. Ring centre E(θ) = ECC·(cos(θ + φ0), sin(θ + φ0)), θ = rot.rotor,
    // φ0 = phaseDeg. The fork end slides along u = unit(pawlWheel − centre):
    // F(θ) = F0 + (E·u)·u, F0 = pawlWheel − forkSetback·u. Lever angle = atan2(F − E).
    phaseDeg: 0, ringInner: 0.77, ringOuter: 1.3, armWidth: 1.1, forkSetback: 0.0,
    // pawl tips sit on the pawl wheel's teeth at ±90° from u (pull pawl on the left flank seen
    // from the dial, push pawl on the right); each spring finger 0.18 wide, tip hooked 0.15.
    pawlAnglesDeg: [90, -90],
  },
};

// ======================================================================== vertical stack
// z = 0 is the dial-side face of the main plate. Pairs are [z0, z1] with z0 < z1 (toward the
// dial); scalars are planes. Collision-checked by research/gs-sbga211/check.mjs: parts whose
// outlines overlap in plan never share a z range (meshing pairs excepted). Total 5.80 OFFICIAL
// (dial seat +0.75 … rotor −5.05).
const z = {
  // ---- dial side (movement) -------------------------------------------------------
  plateDialFace: 0,
  motionRecessFloor: -0.26, // pockets in the plate's dial face for level 1
  level1: [-0.2, -0.08], // cannon leaves, minute wheel, setting intermediate, setting wheel, PR display wheel, PR intermediate pinion
  level2: [0.04, 0.16], // minute pinion, hour wheel, date driving wheel, PR intermediate wheel, PR output pinion
  cannonLeaves: [-0.2, -0.08],
  minuteWheel: [-0.2, -0.08], minutePinion: [0.04, 0.16],
  hourWheel: [0.04, 0.16], hourPipeTop: 1.72, // hour-hand collet sits on the pipe
  cannonPipeTop: 2.07, // minute-hand collet
  secondsArborTop: 2.52, // seconds hub
  centreTubeTop: 0.9, // hollow centre arbor (carries the cannon pinion by friction)
  settingWheel: [-0.2, -0.08], settingIntermediate: [-0.2, -0.08],
  keylessLevers: [0.0, 0.14], // setting lever, yoke, springs: just above the stem pinions (sliding pinion top −0.15)
  dateDriver: [0.04, 0.16], dateFinger: [0.36, 0.5], // the finger rises to the date-ring level
  dateRing: [0.36, 0.5], dateJumper: [0.36, 0.5],
  dateRingSeat: 0.34, // plate shoulder r 13.2–14.2 the ring rides on
  calendarPlate: [0.52, 0.72], // date-ring guard (r ≤ 8.3)
  prDisplayWheel: [-0.2, -0.08], prDisplayArborTop: 1.2,
  prIntermediateWheel: [0.04, 0.16], prIntermediatePinion: [-0.2, -0.08],
  prOutputPinion: [0.04, 0.16],
  dialSeat: 0.75, // plate rim r 14.2–15.0 and the casing ring carry the dial
  // ---- stem -------------------------------------------------------------------------
  stemAxis: zd(-2.1), // −0.90: crown axis, exterior.md §2.6 (MEAS M)
  windingPinion: [-1.86, 0.06], // radial teeth tip radius 0.96 about the stem axis
  slidingPinion: [-1.65, -0.15],
  // ---- movement side ----------------------------------------------------------------
  mainPlate: [-1.2, 0], // flat on the back; the barrel teeth reach r 14.93 at 6 o'clock, so no raised rim
  pillars: [-3.98, -1.2], // posts under the automatic-bridge screws
  caseClamps: [-1.34, -1.2], // clamp screws/tongues on the plate's back face at the edge
  pcb: [-1.35, -1.2], ic: [-1.7, -1.35], capacitors: [-1.8, -1.35],
  quartzAxis: -1.95, quartzRadius: 0.6,
  centerWheel: [-1.34, -1.24], centerPinion: [-1.62, -1.4],
  thirdPinion: [-1.37, -1.21], thirdWheel: [-3.04, -2.96],
  barrel: [-2.88, -1.42], barrelTeeth: [-1.6, -1.42], barrelLid: [-2.88, -2.83],
  mainspring: [-2.78, -1.52],
  fourthPinion: [-3.07, -2.93], fourthWheel: [-3.16, -3.08],
  fifthWheel: [-2.54, -2.46], fifthPinion: [-3.19, -3.05],
  sixthPinion: [-2.57, -2.43], sixthWheel: [-2.7, -2.62],
  glideMagnet: [-2.4, -2.0], glidePinion: [-2.73, -2.59], glideDisc: [-2.92, -2.84],
  coilAxis: -2.2, coilRadius: 0.95, coilCore: [-2.42, -1.98], // core plates = stator pole pieces
  stopLever: [-2.92, -2.84],
  crownWheel: [-1.8, -1.68], // meshes the winding pinion's back-facing (−Z) side: z −0.90 − 0.84 pitch radius
  crownTransmissionLower: [-1.8, -1.68], crownTransmissionUpper: [-3.8, -3.64],
  prWheels: [-3.12, -3.02], // PR differential, under the PR bridge
  bridges: [-3.62, -3.2], // train, barrel and PR bridges
  diashockTop: -3.72,
  ratchet: [-3.8, -3.64], ratchetScrewTop: -3.9,
  click: [-3.78, -3.64],
  keylessIntermediate: [-3.8, -3.64],
  pawlPinion: [-3.8, -3.64], pawlWheel: [-3.89, -3.83],
  magicLever: [-3.96, -3.9], // pawl tips reach down to −3.83
  automaticBridge: [-4.38, -3.98], automaticBridgeBandTop: -4.22, // rim band r ≥ 11.4 is thinner
  bearingBossTop: -4.5,
  rotorBearing: [-4.75, -4.1],
  rotorPlate: [-5.02, -4.72], rotorRim: [-5.05, -4.27], rotorTop: -5.05,
  // ---- dial, hands, case (exterior.md, converted with zd) ---------------------------
  dial: [0.75, 1.2], dialTop: 1.2, // 0.45 thick
  prRecessFloor: zd(-0.15),
  markersTop: zd(0.35), logoTop: zd(0.3), dateFrameTop: zd(0.25),
  prHand: [zd(-0.07), zd(0.03)],
  hourHand: [zd(0.4), zd(0.55)], hourCollet: [1.52, zd(0.55)],
  minuteHand: [zd(0.75), zd(0.9)], minuteCollet: [1.88, zd(0.9)],
  secondsHand: [zd(1.1), zd(1.18)], secondsHub: [2.25, zd(1.35)],
  crystal: [zd(2.23), zd(3.9)], crystalUndersideCentre: zd(2.4), crystalRimTop: zd(3.73),
  caseTop: zd(3.9), // crystal apex +5.10
  caseBottom: zd(-8.6), // case-back plane −7.40 (lug tips drop to −7.70)
  caseBackSeam: zd(-6.8), // −5.60
  caseBackGlass: [zd(-8.3), zd(-7.3)], // −7.10 … −6.10 (outer face 0.3 inside the back plane)
};

// ======================================================================== explode offsets
// Offsets (mm) at full explosion: dial side +Z, movement side −Z, in assembly order so every
// part clears the ones it sits on (collision-checked over the whole animation by check.mjs,
// using the registry's easing and explodeDelay). The crown and stem pull straight out along
// +X first. LEAD: the UI's exploded camera looks at the stack very obliquely from the dial side
// (az 64°, el 16°): an 8.5 mm-tall case ring anywhere in front of the hands would hide them
// (check.mjs measures it), so the case middle and the bezel slide off BACKWARDS as one unit (the
// movement and the casing ring pass through the bore) and end up beyond the rotor, followed by
// the case back; only the transparent crystal goes forward; the rehaut rides on the dial.
// Bracelet and clasp ride with the case and are faded out by the UI (explodeHide).
const explode = {
  // case & dial-side exterior (crown pulled far enough that it does not sit in the line of
  // sight of the barrel in the oblique exploded view; the stem stays 1.2 mm inside the crown)
  crown: [24, 0, 0], 'winding-stem': [23, 0, 0],
  'case-body': [0, 0, -66], bezel: [0, 0, -66], 'spring-bars': [0, 0, -66], bracelet: [0, 0, -66], clasp: [0, 0, -66],
  crystal: [0, 0, 27], rehaut: [0, 0, 12.9],
  'seconds-hand': [0, 0, 19.5], 'minute-hand': [0, 0, 18], 'hour-hand': [0, 0, 16.5], 'power-reserve-hand': [0, 0, 15],
  dial: [0, 0, 12.5], 'dial-feet': [0, 0, 12.5], 'power-reserve': [0, 0, 12.5],
  indices: [0, 0, 13.3], 'gs-logo': [0, 0, 13.3], 'date-window': [0, 0, 13.3],
  // dial-side works, under the dial
  'calendar-plate': [0, 0, 10], 'date-ring': [0, 0, 8], 'date-jumper': [0, 0, 7.4],
  'date-driving-wheel': [0, 0, 6.2], 'hour-wheel': [0, 0, 5.4], 'pr-intermediate-wheel': [0, 0, 5.2], 'pr-output-pinion': [0, 0, 5.2],
  'keyless-springs': [0, 0, 4.6], yoke: [0, 0, 4.2], 'setting-lever': [0, 0, 3.8],
  'minute-wheel': [0, 0, 3.2], 'setting-intermediate-wheel': [0, 0, 3.2], 'setting-wheel': [0, 0, 3.2], 'pr-display-wheel': [0, 0, 3.2],
  'sliding-pinion': [0, 0, 2.6], 'winding-pinion': [0, 0, 2.6], 'cannon-pinion': [0, 0, 2.0],
  'main-plate': [0, 0, 0],
  // movement side, from the plate outwards
  'tri-synchro-regulator': [0, 0, -3.5], ic: [0, 0, -4.6], 'quartz-oscillator': [0, 0, -4.6],
  'center-wheel': [0, 0, -5.6], 'crown-wheel': [0, 0, -6.6], 'fifth-wheel': [0, 0, -7.8], coil: [0, 0, -8.8],
  barrel: [0, 0, -10], mainspring: [0, 0, -12.5], 'barrel-arbor': [0, 0, -15], 'barrel-cover': [0, 0, -17],
  'sixth-wheel': [0, 0, -12], 'glide-wheel': [0, 0, -15.5], 'stop-lever': [0, 0, -18.5],
  'third-wheel': [0, 0, -19.5], 'pr-differential': [0, 0, -19.5], 'fourth-wheel': [0, 0, -22],
  'crown-transmission-wheel': [0, 0, -24],
  'train-bridge': [0, 0, -28], 'barrel-bridge': [0, 0, -28], 'pr-bridge': [0, 0, -28], diashock: [0, 0, -29],
  'ratchet-wheel': [0, 0, -33], 'ratchet-screw': [0, 0, -35.5], click: [0, 0, -33.5], 'click-spring': [0, 0, -34.5],
  'keyless-intermediate': [0, 0, -34], 'pawl-wheel': [0, 0, -37], 'magic-lever': [0, 0, -39.5],
  'automatic-bridge': [0, 0, -43], jewels: [0, 0, -43], 'plate-screws': [0, 0, -45.5], 'case-clamps': [0, 0, -46],
  'rotor-bearing': [0, 0, -48.5], rotor: [0, 0, -52],
  'casing-ring': [0, 0, -58], 'caseback-glass': [0, 0, -73], 'caseback-ring': [0, 0, -77],
};
// When each part starts to move (0…1; the registry starts a part at 0.45 × delay and moves it
// over 0.55 of the slider). Default: the farthest parts go first, so the watch opens from the
// outside in. Overrides (as on the Tangente 139): crown and stem leave first; the case (middle
// + bezel) slides off once the stem is out of its wall; then crystal, hands, dial and the
// dial-side works follow.
const EXPLODE_REF = 80;
const explodeDelays = {
  crown: 0, 'winding-stem': 0,
  'casing-ring': 0.75, // only once the stem has left its hole
  'case-body': 0.8, bezel: 0.8, 'spring-bars': 0.8, bracelet: 0.8, clasp: 0.8, crystal: 0.79,
  'seconds-hand': 0.83, 'minute-hand': 0.84, 'hour-hand': 0.85, 'power-reserve-hand': 0.86,
  dial: 0.87, rehaut: 0.87, 'dial-feet': 0.87, 'power-reserve': 0.87, indices: 0.865, 'gs-logo': 0.865, 'date-window': 0.865,
  'calendar-plate': 0.88, 'date-ring': 0.89, 'date-jumper': 0.895,
};
const explodeDelay = (id) => {
  if (explodeDelays[id] !== undefined) return explodeDelays[id];
  const e = explode[id];
  if (!e) return 0.5;
  const d = Math.hypot(...e);
  if (e[2] > 0) return Math.min(0.97, 0.9 + 0.07 * (1 - d / 10)); // remaining dial-side works: after the dial
  return Math.min(0.95, Math.max(0, 1 - d / EXPLODE_REF));
};

// ======================================================================== frame
// Polygons are in the dial frame (counter-clockwise), z from SPEC.z. Bridges carry the wave
// stripes (finish.stripes). Outlines from movement.md SPEC DATA; LEAD edits are commented.
const trainBridge = [
  [-8.14, -0.54], [-5.24, -2.32], [-3.09, -3.46], [-0.76, -3.64], [1.13, -3.19], [3.79, -2.83],
  // LEAD: the lower-right edge drops 0.3–0.9 so the crown-wheel arbor (8.3, 0) has its upper
  // pivot in the bridge, clear of the crown transmission wheel at (7.6, −3.2)
  [6.55, -1.85], [9.2, -1.0], [10.6, 0.9],
  [12.17, 5.63],
  // LEAD: clipped inside the plate rim (r ≤ 13.6) — research points (11.96, 7.96), (7.28, 11.61)
  [11.3, 7.5], [7.15, 11.4],
  [5.12, 10.74], [4.15, 11.14], [2.19, 11.94], [0.59, 10.3], [-0.2, 8.66], [-1.8, 7.02], [-4.02, 4.72], [-6.32, 1.92],
];
const barrelBridge = [
  [-9.27, -3.75], [-8.99, -5.62], [-8.17, -7.36], [-6.7, -9.41], [-4.69, -10.78], [-1.95, -12.28], [1.05, -12.7],
  [3.3, -12.33], [5.22, -9.83], [5.72, -6.34], [5.85, -4.79], [3.55, -3.22], [1.13, -3.19], [-0.76, -3.64],
  [-3.09, -3.46], [-5.24, -2.32], [-8.14, -0.54], [-9.25, -0.97],
];
// PR bridge: research outline with its inner edge snapped to the barrel bridge's edge (they
// abut) and the outer edge clipped at r 13.7 (plate rim from 13.75)
const prBridge = [
  [-9.25, -0.97],
  ...[94, 107, 120, 133, 146].map((t) => pt(polar(13.7, t))),
  [-6.7, -9.41], [-8.17, -7.36], [-8.99, -5.62], [-9.27, -3.75],
].map(pt);
const automaticBridgeOutline = [
  [-0.43, 9.26], [-1.07, 12.25], [-1.44, 13.52], [-2.7, 13.33], [-3.97, 13.01], [-5.24, 12.55], [-6.49, 11.95],
  [-7.71, 11.2], [-8.88, 10.3], [-9.97, 9.25], [-10.96, 8.05], [-11.82, 6.72], [-12.53, 5.28], [-13.07, 3.75],
  [-13.43, 2.17], [-13.59, 0.56], [-13.6, -0.24], [-12.58, -0.41], [-10.98, -0.48], [-9.8, -1.13], [-8.89, -2.04],
  [-8.45, -2.98], [-8.09, -3.93], [-8.47, -4.76], [-8.58, -5.48], [-8.42, -6.79], [-8.05, -7.49], [-4.57, -4.21],
  [-4.09, -4.34], [-3.52, -4.65], [-3.06, -5.1], [-2.66, -5.76], [-2.39, -7.0], [-2.42, -7.49], [-1.85, -6.11],
  [-1.03, -6.04], [-0.05, -5.95], [0.92, -6.01], [1.98, -6.12], [2.76, -6.18], [3.7, -6.37], [4.67, -6.63],
  [4.93, -6.76], [8.07, -10.95], [8.88, -10.3], [10.0, -9.21], [11.01, -7.99], [11.87, -6.63], [12.57, -5.18],
  [13.1, -3.66], [13.44, -2.1], [13.59, -0.53], [13.56, 1.01], [13.37, 2.52], [13.02, 3.94], [12.53, 5.29],
  [11.93, 6.54], [11.22, 7.68], [10.43, 8.73], [9.57, 9.66], [8.65, 10.49], [7.68, 11.23], [6.65, 11.86],
  [5.72, 10.56], [4.38, 9.71], [3.25, 9.22], [2.35, 9.01], [1.54, 8.95], [0.77, 8.98], [0.02, 9.14],
];
// PCB (flexible circuit with a grey stiffener) round the IC — ESTIMATE, hidden under the train
// bridge. Inside r 13.5; clear of the 5th/6th/glide arbors, the centre wheel (r < 3.1), the
// crown-wheel arbor (8.3, 0) and the automatic-bridge pillar (10.15, 6.85).
const pcbOutline = [
  [3.9, 2.2], [6.4, 2.1], [9.2, 2.9], [11.3, 4.4], [12.1, 5.5], [11.4, 5.9], [10.6, 5.6], [9.1, 6.1],
  [9.0, 7.9], [10.2, 8.4], [9.2, 9.8], [8.0, 10.4], [7.0, 11.4], [5.6, 11.0], [4.7, 9.9], [4.5, 8.4], [4.1, 6.6], [3.7, 5.0],
];

const frame = {
  plateRadius: 15.0, // Ø30.0 OFFICIAL
  // Main plate: 1.20 thick, flat on the back (only r < 12.9 is visible through the case back
  // anyway); its exposed outer edge r 13.75–15 carries fine straight graining. Dial side: the
  // dial-seat rim r 14.2–15.0 rises to +0.75; pockets for level 1 (floor −0.26); a channel for
  // the stem (y ±0.5) and a through-slot for the winding pinion (x 9.7–10.5, y ±1.05).
  plateRim: { dialSeat: { inner: 14.2, outer: 15.0, top: z.dialSeat } },
  stemChannel: { y: [-0.5, 0.5], x: [8.3, 15.0], z: [-1.4, -0.35] },
  windingPinionSlot: { x: [9.7, 10.5], y: [-1.05, 1.05] },
  // posts under the three automatic-bridge screws: two rise from the plate's back face, the one
  // at 1–2 o'clock stands on the train bridge (it lies inside the train bridge's outline)
  pillars: [
    { at: B(-10.15, 6.85), radius: 0.8, z: [z.pillars[0], z.bridges[0]], on: 'train-bridge' },
    { at: B(-7.5, -9.65), radius: 0.8, z: z.pillars, on: 'main-plate' },
    { at: B(12.2, 1.25), radius: 0.8, z: z.pillars, on: 'main-plate' },
  ],
  // dial feet holes in the dial-seat rim: SPEC.dial.feet
  trainBridge: { outline: trainBridge, z: z.bridges },
  barrelBridge: { outline: barrelBridge, z: z.bridges },
  prBridge: { outline: prBridge, z: z.bridges, screw: { at: B(8.73, -10.21), headDiameter: 1.4 } },
  automaticBridge: {
    outline: automaticBridgeOutline, z: z.automaticBridge, outerRadius: 13.6,
    band: { innerRadius: 11.4, top: z.automaticBridgeBandTop }, // concentric graining, rim texts
    // cut-outs in the outline (dial frame, clockwise-from-12 seen from the dial): glide notch
    // 355°–29° (glide Diashock + a sector of the gilt disc), PR cut-out 228°–268°, ratchet
    // cut-out 144°–227° (ratchet, click, barrel bridge).
    windows: [
      { center: B(-2.98, 5.94), size: [3.0, 2.8], note: 'shows the 6th-wheel Diashock' },
      { center: B(-7.33, -4.13), size: [3.6, 2.0], note: 'teeth of the crown transmission and keyless intermediate wheels' },
    ],
    bearing: { center: [0, 0], bossRadius: 3.0, bossTop: z.bearingBossTop },
    screws: [B(-10.15, 6.85), B(-7.5, -9.65), B(12.2, 1.25)], // polished steel, slotted, head Ø1.55
    pinHole: { at: B(-11.92, 1.75), diameter: 0.6 }, // between "SEIKO" and "TIME"
  },
  pcb: { outline: pcbOutline, z: z.pcb },
  screws: {
    finish: 'polished steel, slotted — NO blued screws (research §3)',
    automaticBridge: { at: [B(-10.15, 6.85), B(-7.5, -9.65), B(12.2, 1.25)], headDiameter: 1.55 },
    ratchet: { at: B(1.25, -7.7), headDiameter: 2.4 },
    click: { at: B(-5.15, -8.7), headDiameter: 1.6 },
    prBridge: { at: B(8.73, -10.21), headDiameter: 1.4 },
    // casing clamps (part 'case-clamps'): screws on the plate's back face at the edge, angles of
    // the four plate-edge screws in movement.md (MEAS L), pushed out to r 14.35 so the heads
    // clear the automatic bridge (r ≤ 13.6); short tongues reach to r 14.9, z = SPEC.z.caseClamps
    caseClamps: { at: [B(-14.26, 2.05), B(-1.54, 13.82), B(-9.28, -10.39), B(-14.21, -3.7)].map((p) => along([0, 0], p, 14.35)), headDiameter: 1.2, tongue: { reachRadius: 14.9, width: 1.0 } },
  },
  jewels: {
    // gold Diashock settings on the train bridge (visible through the glide notch and the big window)
    diashock: [{ at: P.glide, settingDiameter: 1.6 }, { at: P.sixth, settingDiameter: 1.3 }],
    // visible through the case back: in the automatic bridge (part 'jewels') and the PR bridge
    automaticBridge: [{ at: P.pawlWheel, diameter: 0.9, colour: 'dark purple' }, { at: P.keylessIntermediate, diameter: 0.9, colour: 'pink' }],
    prBridge: [P.prA, P.prB, P.prC].map((p) => ({ at: p, diameter: 0.7 })),
    // hidden upper jewels in the train bridge (X-ray): centre/4th, 3rd, 5th
    trainBridge: [P.center, P.third, P.fifth],
    glideLower: { at: P.glide, settingRadius: 0.65, z: [-1.3, -1.2], note: 'gold-coloured setting in the main plate (n37)' },
    // 30 jewels (ESTIMATE): centre 2, 3rd 2, 4th 2, 5th 2, 6th 2, glide 2; barrel 2, pawl wheel 2,
    // keyless intermediate 2; PR differential 6 + dial-side 2; 2 others
    count: 30,
  },
  engravings: {
    // every arc text reads COUNTER-CLOCKWISE in the BACK view with letter tops toward the centre
    // (θ in BACK-view degrees clockwise from 12; point = polar(r, θ)). Upright sans capitals.
    gilt: [
      { text: 'THIRTY JEWELS', arc: { r: 12.25, fromBackDeg: 73, toBackDeg: 18 }, capHeight: 0.7 },
      { text: '9R65A', arc: { r: 9.9, fromBackDeg: 78, toBackDeg: 51 }, capHeight: 0.75 },
      { text: 'JAPAN', arc: { r: 9.9, fromBackDeg: 42, toBackDeg: 18 }, capHeight: 0.75 },
    ],
    plain: [
      { text: 'SEIKO', arc: { r: 12.25, fromBackDeg: 294, toBackDeg: 281 }, capHeight: 0.7 },
      { text: 'TIME CORP.', arc: { r: 12.25, fromBackDeg: 275, toBackDeg: 244 }, capHeight: 0.7 },
      { text: '2', arc: { r: 12.25, fromBackDeg: 237, toBackDeg: 235 }, capHeight: 0.7 },
    ],
    giltColour: '#C9A055', plainColour: '#7d8184',
  },
  colours: { bridge: '#CDD0D2', bridgeShade: '#8E9295', gilt: '#D8B47A', copper: '#B8643A', copperHighlight: '#E39A6A', diashock: '#C8A15A', ruby: '#A0507E', pcb: '#3a2416', pcbTrace: '#c99a45', stiffener: '#8f979e', logoBlue: '#1E2A55' },
};

// ======================================================================== finishes
const finish = {
  // "Wave" stripes (波目模様) on every bridge and the rotor: broad crowned bands, each cut with a
  // diamond tool in a circular motion, so every band has a fine circular grain. Bands descend
  // to the right in the BACK view (= ascend to the right in the dial frame). Polished bevels on
  // all bridge edges. Rhodium-grey (#CDD0D2 lit → #8E9295 in shade).
  stripes: { pitch: 2.2, angleDialDeg: 34, uvAngle: 34 * DEG, uvScale: 1 / (4 * 2.2) },
  rotorStripes: { pitch: 2.0, angleDialDeg: 25 }, // rotor-local, dial frame (−25° in the back view)
  bandGraining: 'concentric (automatic-bridge rim band r 11.4–13.6)',
  plateRim: 'fine straight graining (diagonal hatching) on the exposed rim r 13.75–15.0',
  ratchet: 'radial sunburst, polished screw',
  wheels: 'gilt (gold-plated), fine circular grain',
};

// ======================================================================== Spring Drive regulator
// Tri-synchro Regulator: the glide wheel (generator rotor) spins at exactly 8 rev/s; its
// 2-pole magnet induces current in two series-connected coils; the IC compares each turn with
// the 32,768 Hz quartz divided down to 8 Hz and short-circuits the coils (a magnetic brake,
// chopped 256 times a second) whenever the wheel runs fast. Nothing ticks.
const regulator = {
  glide: {
    // gilt inertia disc: flat ring + 3 straight spokes (n36), fine circular grain on the rim
    discRadius: 3.0, rimWidth: 0.33, spokes: 3, spokeWidth: 0.22, hubRadius: 0.55, discThickness: 0.08,
    // LEAD: magnet per n36 (Ø≈0.9–1.1, dark grey sintered cylinder), not the research's Ø2.6
    magnet: { radius: 0.5, z: z.glideMagnet, poles: 2, colour: '#3b3d40' },
    pinion: { leaves: 8, z: z.glidePinion },
    disc: { z: z.glideDisc },
    lowerJewel: { z: [-1.3, -1.2], settingRadius: 0.65 },
  },
  // Two coil blocks (n40): copper winding (25,000 turns of 15 µm wire) on an amorphous-alloy core
  // (dark grey, satin) whose plates stick out at both ends: at the glide end a pole piece that
  // wraps the magnet with a semicircular hook (the two hooks face each other = the stator), at
  // the far end a tab with a screw hole. Axes from movement.md (±0.8), both aimed past the magnet.
  coils: [
    { name: 'A', axis: [B(1.26, 9.67), B(8.54, 7.87)], footScrew: pt(along(B(1.26, 9.67), B(8.54, 7.87), 8.3)) },
    { name: 'B', axis: [B(0.7, 7.43), B(7.98, 5.63)], footScrew: pt(along(B(0.7, 7.43), B(7.98, 5.63), 8.3)) },
  ],
  coilWindingRadius: z.coilRadius, coilAxisZ: z.coilAxis, coreThickness: 0.44, coreWidth: 1.5,
  statorHookInnerRadius: 0.62, statorHookOuterRadius: 1.25, // around the glide magnet
  // keep-outs for the stator/core plates at z.coilCore (arbors passing that level)
  statorKeepOut: [{ at: P.sixth, radius: 0.65 }, { at: P.fifth, radius: 3.3 }],
  ic: { center: B(-6.6, 7.0), size: 2.8, dieSize: 1.9, rotationDeg: -41, z: z.ic }, // C-MOS IC: oscillator, divider, brake control
  quartz: { from: [2.9, 13.8], to: [7.6, 10.3], radius: 0.6, axisZ: z.quartzAxis, pinsAt: 'to' }, // 32,768 Hz tuning fork in a can
  capacitors: [{ at: [8.7, 4.6], size: [1.0, 0.5] }, { at: [11.0, 4.9], size: [1.0, 0.5] }, { at: [9.2, 8.6], size: [1.0, 0.5] }],
  stopLever: { pivot: P.stopLever.pivot, finger: P.stopLever.finger, width: 0.55, z: z.stopLever, released: true },
  quartzHz: 32768, referenceHz: 8, divider: 4096, brakeChopHz: 256, powerNanoWatt: 25,
  colours: { magnet: '#3b3d40', core: '#55595e', copper: '#B8643A', flex: '#c8892f' },
};

// ======================================================================== rotor (oscillating weight)
// movement.md §10 rotor-local, converted to the dial frame with B(): pivot at the origin, heavy
// sector toward local −Y (hangs at 6 at rot 0). Text and logo are mirrored in this frame so
// they read correctly from the back (upright when the weight hangs at 6).
const RB = (p) => pt(B(p[0], p[1]));
const rotor = {
  pivot: [0, 0], outerRadius: 14.0, rimInnerRadius: 12.8,
  topEdge: [[14.0, -0.82], [13.3, -0.55], [12.12, -0.49], [10.3, -0.85], [8.34, -1.26], [6.74, -0.53], [5.12, 0.22],
    [3.44, 0.96], [1.58, 1.64], [0, 2.02], [-1.62, 1.6], [-3.48, 0.93], [-5.17, 0.22], [-6.76, -0.54],
    [-8.38, -1.26], [-10.3, -0.85], [-12.08, -0.52], [-13.3, -0.55], [-14.0, -0.82]].map(RB),
  arc: { r: 14.0, fromDeg: 183.35, toDeg: 356.65 }, // through 270° (bottom), symmetric
  windows: [
    [[-1.55, -3.51], [-2.53, -3.94], [-3.2, -4.49], [-3.61, -5.12], [-4.31, -5.43], [-5.08, -5.37], [-5.91, -5.14],
      [-6.97, -4.65], [-7.62, -4.2], [-8.09, -3.51], [-6.97, -2.97], [-5.8, -2.53], [-4.9, -2.25], [-4.02, -1.97],
      [-2.97, -1.74], [-1.99, -1.62], [-1.5, -2.12], [-1.47, -2.83]].map(RB),
    [[1.55, -3.51], [2.53, -3.94], [3.2, -4.49], [3.61, -5.12], [4.31, -5.43], [5.08, -5.37], [5.91, -5.14],
      [6.97, -4.65], [7.62, -4.2], [8.09, -3.51], [6.97, -2.97], [5.8, -2.53], [4.9, -2.25], [4.02, -1.97],
      [2.97, -1.74], [1.99, -1.62], [1.5, -2.12], [1.47, -2.83]].map(RB),
  ],
  pivotHole: [[0.84, 0.0], [0.08, -0.71], [-0.81, -0.38], [-0.67, 0.15], [0.09, 0.81], [0.92, 0.21]].map(RB), // small diamond
  rivets: [[11.05, -1.63], [-11.05, -1.63], [-0.23, -10.39]].map(RB),
  hub: { bossRadius: 1.4, screws: 3, screwRadius: 1.1, screwHead: 0.45 },
  z: { plate: z.rotorPlate, rim: z.rotorRim },
  logo: {
    // dark navy (#1E2A55) blackletter "GS" monogram above the "Grand Seiko" blackletter wordmark
    gs: { center: RB([-0.2, -6.0]), width: 3.3, height: 2.3 },
    wordmark: { text: 'Grand Seiko', center: RB([-0.35, -8.46]), width: 11.1, capHeight: 1.1 },
    colour: '#1E2A55', mirroredInDialFrame: true,
  },
  finish: 'satin silver with the wave stripes (pitch 2.0, 25°), heavy rim polished on its edge',
};

// ======================================================================== power reserve
// Display: the hand at dial (−3.17, −5.80) sweeps 97° — FULL at 263° clockwise from 12 (toward
// 9, just below horizontal), EMPTY at 12. As the reserve falls the hand turns clockwise.
// rotation.z of the hand (local +Y = its pointer at rot 0) = +sweep · state.reserve.
const PR_SWEEP = 97;
const powerReserve = {
  hours: POWER_H, sweepDeg: PR_SWEEP, fullDeg: 263, emptyDeg: 360,
  handRotationZ: (reserve) => PR_SWEEP * DEG * Math.max(0, Math.min(1, reserve)), // CCW-positive, rad
  // gearing (LEAD, ESTIMATE): back-side differential (prA 8-leaf winding-input pinion, prB
  // 64-tooth fine differential wheel = the toothed rim seen in the gap beside the PR bridge,
  // prC 13-leaf running-input pinion). Its output arbor (prB) carries a 12-leaf pinion on the
  // dial side → intermediate 36/10 → display wheel 40 under the PR hand. Display = hand angle;
  // intermediate = −hand·40/10; prB = +hand·(40/10)(36/12) = 12·hand (3.2 turns over 72 h);
  // prA = −prB·64/8; prC = −prB·64/13. All driven from state.reserve in update().
  differential: { a: { leaves: 8 }, b: { teeth: 64 }, c: { leaves: 13 }, outputPinion: 12, z: z.prWheels },
  intermediate: { teeth: 36, pinion: 10 }, display: { teeth: 40 },
  ratioHandToPrB: (40 / 10) * (36 / 12),
};

// ======================================================================== rotations
// rotation.z (CCW-positive seen from the dial) of every turning part as a function of the
// kinematics state. Kinematics keys can be used directly with drive: { key } (listed here for
// completeness); the derived ones go in update(). Meshes split across builders stay in step
// because both sides call the same function. No allocations in here (called every frame).
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const prDisplayAngle = (s) => PR_SWEEP * DEG * clamp01(s.reserve);
const rotations = {
  // straight from the kinematics (drive: { key })
  barrel: (s) => s.rot.barrel, center: (s) => s.rot.center, third: (s) => s.rot.third, fourth: (s) => s.rot.fourth,
  fifth: (s) => s.rot.fifth, sixth: (s) => s.rot.sixth, glide: (s) => s.rot.glide,
  cannon: (s) => s.rot.cannon, minuteWheel: (s) => s.rot.minuteWheel, hourWheel: (s) => s.rot.hourWheel,
  dateDriver: (s) => s.rot.dateDriver, settingIntermediate: (s) => s.rot.settingIntermediate, settingWheel: (s) => s.rot.settingWheel,
  ratchet: (s) => s.rot.ratchet, // barrel arbor + ratchet + ratchet screw (turn only while winding)
  crownWheel: (s) => s.rot.crownWheel, // = −(74/30)·ratchet: CW while winding — correct as it is
  rotor: (s) => s.rot.rotor, // also the Magic Lever's eccentric
  // derived (update())
  pawlWheel: (s) => -(74 / 10) * s.rot.ratchet,
  keylessIntermediate: (s) => -(74 / 38) * s.rot.ratchet,
  crownTransmission: (s) => (74 / 24) * s.rot.ratchet, // both of its wheels
  dateRing: (s) => -s.rot.date, // CCW: drive { key: 'date', sign: -1 }
  prDisplay: prDisplayAngle, // = the power-reserve hand (+97° at full)
  prIntermediate: (s) => -(40 / 10) * prDisplayAngle(s),
  prB: (s) => 12 * prDisplayAngle(s), // differential wheel + output pinion (one arbor)
  prA: (s) => -96 * prDisplayAngle(s), // −(64/8)·prB
  prC: (s) => -((64 * 12) / 13) * prDisplayAngle(s), // −(64/13)·prB
  // about +X (the stem axis), not Z: stem, sliding pinion and winding pinion turn together
  stemX: (s) => s.rot.stem,
};

// ======================================================================== keyless levers (dial side, ESTIMATE)
// Key points for the setting lever, yoke and their springs (z.keylessLevers, 0 … +0.14), placed
// clear of the setting wheel (x ≤ 8.67), the date driving wheel and the dial-seat rim (r ≥ 14.2).
// Crown positions: 0 wind, 1 date (turn CCW), 2 time + hack (the stop lever touches the glide
// disc). The model always stays at position 0.
// The levers lie at z.keylessLevers, just above the stem pinions, and keep out of the winding
// pinion's footprint (x 9.75–10.45, |y| ≤ 0.96); only the setting-lever pin (into the stem
// groove) and the yoke's fork fingers (into the sliding-pinion groove) reach down.
const keylessLevers = {
  stemGrooveX: 11.05, // groove in the stem for the setting-lever pin
  settingLever: { pivot: [12.4, 2.6], pin: [11.05, 0.0], beak: [11.4, -1.5], tail: [13.0, 3.3], width: 0.55 },
  yoke: { pivot: [12.6, -2.9], arm: [9.75, -1.35], fork: [P.slidingPinion[0], 0], forkFingersY: [-0.66, 0.66], tail: [13.0, -1.6], width: 0.5 },
  yokeSpring: { anchor: [13.3, -3.9], nose: [13.05, -1.95], width: 0.18 },
  settingLeverJumper: { anchor: [13.2, 3.6], nose: [12.85, 3.05], width: 0.18 },
  screws: [[12.4, 2.6], [12.6, -2.9], [13.3, -3.9], [13.2, 3.6]],
  stem: { innerEnd: 8.35, journal: [8.35, 8.55], square: [8.55, 9.75], groove: [10.9, 11.2], radius: 0.45, crownThreadEnd: 22.0 },
};

// ======================================================================== date
// Instantaneous-type change: the 24-hour wheel's finger loads the ring from ≈22:30 and the
// jumper snaps it over at midnight ("changes … at around midnight"; "do not set 21:00–01:00").
// The kinematics' default jump at local midnight matches. The ring turns COUNTER-CLOCKWISE
// seen from the dial (numerals increase clockwise; the next date comes up from below into the
// 3 o'clock window) — so drive it with { key: 'date', sign: −1 }.
const date = {
  change: 'jump at midnight (kinematics default)',
  ring: {
    teeth: train.dateRing.teeth, tipRadius: 8.0, rootRadius: 8.45, outerRadius: 14.0, z: z.dateRing,
    numeralRadius: 12.0, // centre of the numeral group (= window centre x 11.97)
    // numeral d sits at local maths angle θw − (d − 1)·360/31 (θw = window angle); its "up"
    // points along the CCW tangent, digits read radially outward (upright in the window)
    windowAngleDeg: Math.atan2(-0.02, 11.97) / DEG,
    digitHeight: 1.55, digitWidth: 1.25, groupWidth: 2.7, stroke: 0.22, colour: '#E6E7E8', digitColour: '#121212',
    font: 'plain grotesque (Helvetica-like), regular weight',
  },
  driver: { teeth: train.dateDriver.teeth, center: P.dateDriver, z: z.dateDriver,
    finger: { reach: 2.55, width: 0.35, z: z.dateFinger, angleAtMidnightDeg: -36 } }, // local angle at rot 0 (= local midnight)
  jumper: { pivot: [2.6, 7.2], beak: pt(atAngle(7.95, 22)), width: 0.3, z: z.dateJumper },
  calendarPlate: { radius: 8.3, z: z.calendarPlate, centreHole: 0.95, screws: [[-0.4, 7.4], [-6.9, 2.2], [6.0, 2.6]],
    holes: [{ at: P.prDisplay, radius: 0.35 }] },
};

// ======================================================================== case (exterior.md §2–4, movement frame)
const C_PROFILE = [
  [16.8, 3.7], [17.2, 3.62], [17.7, 3.35], [18.2, 2.9], [18.6, 2.4], [19.0, 1.82], // bezel (mirror, Zaratsu)
  [19.05, 1.72], // seam groove 0.08 wide, 0.1 deep
  [19.1, 1.7], [20.5, -0.12], // shoulder → widest edge (sharp), mirror at 3/9
  [20.48, -0.8], [20.4, -1.6], [20.25, -2.6], [20.05, -3.6], [19.85, -4.6], [19.6, -5.75], // flank, mirror
  [19.1, -6.3], [18.65, -6.8], // lower bevel → case/case-back seam
  [18.6, -6.83], [18.55, -7.3], [18.4, -7.9], [18.0, -8.6], // case-back flank
  [13.8, -8.6], [13.4, -8.45], [12.9, -8.35], // back face → window bevel
].map(([r, zz]) => [r, zd(zz)]);
const LUG_PROFILE_TOP = [[16.0, 1.7], [18.0, 0.8], [20.0, -0.7], [22.0, -2.6], [23.5, -4.0], [24.2, -4.8], [24.5, -5.6]].map(([y, zz]) => [y, zd(zz)]);
const LUG_PROFILE_BOTTOM = [[24.5, -8.9], [23.0, -8.4], [21.0, -7.8], [19.0, -7.2], [17.0, -6.8]].map(([y, zz]) => [y, zd(zz)]);
const caseSpec = {
  radius: 20.5, height: 12.5, lugToLug: 49.0, lugWidth: 20.0, material: 'High-Intensity Titanium',
  // Revolved OUTER profile [r, z] at 3/9 o'clock (LatheGeometry x = r, y = z), from the bezel's
  // inner lip outward and down to the case-back window. MEAS M.
  profile: C_PROFILE,
  bezel: { r: [16.8, 19.0], z: [zd(1.82), zd(3.7)], finish: 'mirror (Zaratsu)', separatePart: true },
  seam: { r: 19.05, z: zd(1.72), width: 0.08, depth: 0.1 },
  middle: { top: zd(1.72), bottom: zd(-6.8), innerRadius: 16.85 }, // bore: casing ring + movement inside
  widestEdge: { r: 20.5, z: zd(-0.12) },
  // Finishing map (exterior.md §2.1) — THE signature of this case:
  //  bezel: mirror (Zaratsu, distortion-free); lug tops: hairline brushed, grain along 12–6;
  //  Zaratsu bevel (mirror) between lug top and flank, 1.0–1.4 wide on the lugs, fading to 0 at
  //  2:30/3:30/8:30/9:30 where it runs into the seam; flank + shoulder at 3/9 + lug outer faces:
  //  mirror; case back polished. Edges between brushed and mirror faces are razor-sharp lines.
  finish: { bezel: 'mirror', lugTop: 'brushedY', zaratsuBevel: 'mirror', flank: 'mirror', shoulder3and9: 'mirror', caseBack: 'mirror' },
  lug: {
    xInner: 10.0, tipY: 24.5,
    // plan outline of the +X,+Y lug's outer edge [x, y]; mirror for the other three. MEAS M
    planOuter: [[19.05, 7.6], [18.0, 10.2], [17.0, 12.7], [16.0, 15.1], [15.0, 17.5], [14.5, 18.9], [14.0, 20.1],
      [13.5, 21.5], [13.0, 22.5], [12.6, 23.3], [11.8, 24.1], [11.0, 24.45], [10.0, 24.5]],
    profileTop: LUG_PROFILE_TOP, // [y, z] at mid-lug width (outer brushed edge), MEAS L-M ±0.8
    tipFace: { y: 24.5, z: [zd(-8.9), zd(-5.6)] },
    profileBottom: LUG_PROFILE_BOTTOM,
    zaratsuBevel: { slantWidth: 1.2, dropBelowTop: 1.1, fadesToZeroAtDeg: [75, 105, 255, 285] },
    // read by the watch box for the band: { y, z }
    springBar: { y: 22.9, z: zd(-7.2), holeRadius: 0.5, barRadius: 0.9, drilledThroughOuterFace: true },
  },
  crown: {
    axisZ: z.stemAxis, radius: 2.95, rootRadius: 2.7, flutes: 24, fluteDepth: 0.25, from: 19.8, to: 23.2,
    recess: { radius: 3.4, depth: 0.6 }, tube: { radius: 1.25, from: 16.85, to: 19.8 },
    // end face: polished outer chamfer r 2.45→2.95, matte field r < 2.35 (0.08 recessed),
    // RAISED polished "GS" (2.4 high × 2.6 wide, relief 0.12), upright with 12 up
    endFace: { chamferOuter: 2.95, chamferInner: 2.45, fieldRadius: 2.35, fieldRecess: 0.08, logo: 'GS', logoHeight: 2.4, logoWidth: 2.6, logoRelief: 0.12 },
    screwDown: true,
  },
  crystal: {
    radius: 17.1, visibleRadius: 16.8, thickness: 1.5, ior: 1.77, arCoating: 'inner', dualCurved: true,
    apexZ: zd(3.9), rimTopZ: zd(3.73), undersideCentreZ: zd(2.4), undersideRimZ: zd(2.23),
    topRadius: 860, // spherical cap through apex and rim top (sag 0.17)
    arTint: '#9BB0D8',
  },
  rehaut: { r: [15.7, 16.45], z: [zd(0), zd(2.2)], colour: '#B5B7B9', roughness: 0.5, printed: false },
  casingRing: { r: [15.05, 16.8], z: [z.mainPlate[0], z.dialSeat], stemHole: 0.55 }, // movement spacer round the plate; the dial's rim rests on it
  caseback: {
    outerRadius: 18.6, bottomRadius: 18.0, z: [zd(-8.6), zd(-6.83)], screwDown: true,
    innerFaceZ: zd(-7.05), // cavity above the glass, 0.8 clear of the rotor
    notches: { count: 6, anglesDeg: [43, 103, 163, 223, 283, 343], width: 2.1, r: [16.95, 18.0], depth: 0.5 }, // dial-frame clockwise-from-12
    // engraved band (flat back face): dark-grey sans capitals, letter tops OUTWARD, reading
    // clockwise in the BACK view (from > to in these dial-frame angles)
    textBand: {
      r: [15.7, 17.4], capHeight: 0.85, colour: '#55585A',
      items: [
        { text: 'WATER RESIST.10BAR', fromDeg: 95, toDeg: 42 },
        { text: '9R65-0AE0', fromDeg: 128, toDeg: 105 },
        { text: '[A4] U', fromDeg: 150, toDeg: 135, note: 'boxed "A4" mark then a U-like glyph' },
        { text: '{serial}', fromDeg: 197, toDeg: 180 },
        { text: 'MADE IN JAPAN', fromDeg: 260, toDeg: 233 },
        { text: 'TITANIUM', fromDeg: 317, toDeg: 298 },
      ],
    },
    decoRing: { r: [14.6, 15.5], teeth: 78, toothDuty: 0.5, height: 0.15 }, // polished serrated ring
    windowBevel: { r: [12.9, 14.6] }, // polished stepped bevel
    glass: { apertureRadius: 12.9, radius: 13.4, z: z.caseBackGlass },
  },
  bracelet: {
    width: 20.0, widthAtClasp: 16.0, thickness: 3.4, pitch: 6.8, perimeter: 193,
    // five pieces across (scale |x| with the taper): brushed outer, thin polished, brushed centre
    rows: [{ name: 'outer', x: [5.2, 10.0], finish: 'brushedY' }, { name: 'middle', x: [4.2, 5.2], finish: 'mirror' }, { name: 'centre', x: [0.0, 4.2], finish: 'brushedY' }],
    edgeBevel: { width: 0.4, finish: 'mirror' },
    endLink: { y: [17.6, 25.5], solid: true }, pins: true,
    clasp: { type: 'three-fold, push-button release (two side pushers)', cover: { length: 18, width: 16.5, finish: 'brushed' },
      logo: { text: 'GS', panelWidthFrac: 0.48, raised: true }, bladeEngraving: ['SEIKO', 'TITANIUM-TITANIUM ALLOY', 'JAPAN-B'] },
  },
  colours: { titanium: '#C7C4BE', mirrorRoughness: 0.06, brushedRoughness: 0.3, engraving: '#55585A' },
};

// ======================================================================== dial (exterior.md §5)
const dial = {
  radius: 15.9, visibleRadius: 15.7, thickness: 0.45, z: z.dial, colour: '#E8E9EA',
  material: { metalness: 0.4, roughness: 0.42 }, // die-stamped brass, silver-plated (no paint)
  centreHole: 0.9,
  // Snowflake relief — generate procedurally (dial.js). Wind-swept snow: elongated, wavy,
  // overlapping drift ridges running mostly along 12–6 (Y), local direction wandering ±20–30°,
  // braiding and splitting. Three scales:
  //  (a) broad soft drifts, wavelength 1.7–3.3 mm across (X), 2–6 mm long (Y);
  //  (b) crisp ridge crests and crescent-shaped scoop pits ("footprints"), 0.4–0.8 across, 1–2 long;
  //  (c) isotropic fine grain 0.05–0.15 mm (dominant in flat light).
  // Recipe (sample in mm): h = 0.55·fbm(warp(p)·(1/0.9, 1/3.0)) + 0.30·ridged(warp(p)·(1/0.35, 1/1.2))
  //   + 0.15·grain(p/0.06); warp(p) = p + 0.4·(noise(p/1.5), noise(p/1.5 + 7)).
  // Relief 20–40 µm; normal strength so flat light gives ±3 % and raking light ±15 % brightness;
  // soft silvery sheen with a faint sparkle on the crests. The texture runs to the rehaut; the
  // PR fan and the date frame interrupt it. Tile ≥ 32 mm (no visible repeat on the dial).
  texture: {
    ridgeAxis: 'Y', drift: { wavelengthX: [1.7, 3.3], lengthY: [2, 6], weight: 0.55 },
    crests: { spacingX: [0.4, 0.8], lengthY: [1, 2], weight: 0.3, pits: 'crescent scoops' },
    grain: { size: [0.05, 0.15], weight: 0.15 }, warp: { amplitude: 0.4, scale: 1.5 },
    reliefMicrons: [20, 40], contrast: { flatLight: 0.025, raking: 0.15 }, sizePx: 4096, litePx: 2048,
  },
  markers: { // applied, mirror polished ("almost like glass"), height 0.35, facets ≈35°
    height: 0.35, bevelAngleDeg: 35,
    wedge12: { hours: [12], r: [10.45, 14.95], width: [1.45, 2.2], topFacet: { r: [10.75, 14.75], width: [0.87, 1.55] }, sideBevel: 0.3, endBevel: 0.2 },
    wedge69: { hours: [6, 9], r: [10.35, 14.9], width: [0.95, 1.8], sideBevel: 0.3, endBevel: 0.2 },
    bars: { hours: [1, 2, 4, 5, 7, 8, 10, 11], r: [10.45, 14.95], width: 1.0, topFacet: 0.36, sideBevel: 0.32 },
  },
  minuteTrack: { r: [14.43, 14.96], width: 0.23, skipHours: true, at3: { r: [14.41, 15.16], width: 0.45 }, colour: '#141414' },
  logo: { text: 'GS', applied: true, center: [0.05, 8.08], width: 2.9, height: 2.1, relief: 0.3, finish: 'mirror, faceted' },
  wordmark: { text: 'Grand Seiko', style: 'blackletter', baselineY: 5.42, capTopY: 6.63, xHeight: 0.7, x: [-4.15, 4.42], colour: '#141414' },
  springDrive: { text: 'SPRING DRIVE', style: 'sans capitals, wide tracking, light-medium', baselineY: -8.49, capHeight: 0.63, x: [-2.77, 2.78], colour: '#1E2560' },
  bottomText: { text: 'JAPAN 9R65-0BL0 T 2', r: [15.15, 15.52], capHeight: 0.37, tops: 'toward centre', colour: '#141414',
    pieces: [{ t: 'JAPAN', deg: [194, 184.5] }, { t: '9R65-0BL0', deg: [184, 171] }, { t: 'T', deg: 169.3 }, { t: '2', deg: 166.6 }] },
  powerReserve: {
    pivot: P.prDisplay, recessDepth: 0.15,
    // fan outline about the pivot: arc R 4.95 from (+0.53, +4.92) CCW through (−3.5, +3.5) to
    // (−4.88, −0.84); straight bottom edge dy = −0.84 back to the hub; rounded corner R 0.6 round
    // the hub; straight edge dx = +0.53 up to the start
    fan: { radius: 4.95, rightEdgeDx: 0.53, bottomEdgeDy: -0.84, cornerRadius: 0.6 },
    ribs: { r: [3.4, 4.95], count: 19, fromDeg: 265, stepDeg: 5 }, // alternating bright/dark radial ribs
    innerField: { r: [0, 3.4], concentricPitch: 0.13 }, // fine concentric grooves
    endMarks: { degs: [0, 263], r: [3.65, 4.6], width: 0.43, colour: '#7E8184' }, // applied, rounded
  },
  dateWindow: {
    aperture: { center: [11.97, -0.02], width: 3.4, height: 2.4 },
    frame: { x: [9.8, 14.15], y: [-1.7, 1.65], faceBand: 0.25, height: 0.25, finish: 'mirror, faceted (45° inner bevel)', corners: 'square' },
  },
  feet: { angles: [30, 210], r: 14.55, radius: 0.3, bottom: -0.25 }, // into the plate's dial-seat rim
  rehautColour: '#B5B7B9',
};

const hands = {
  // dauphine/razor: two-facet roof ridge along the centre line + razor-sharp edge bevels, mirror silver
  hour: { tip: 10.2, tail: 3.0, maxWidth: 1.65, maxWidthAt: 1.8, z: z.hourHand, collet: { radius: 1.1, z: z.hourCollet }, thickness: 0.15, finish: 'mirror' },
  minute: { tip: 14.1, tail: 3.3, maxWidth: 1.45, maxWidthAt: 2.2, z: z.minuteHand, collet: { radius: 0.8, z: z.minuteCollet }, thickness: 0.15, finish: 'mirror',
    widthAt: [[3.5, 1.14], [6.0, 0.85], [8.0, 0.61], [10.0, 0.38], [12.0, 0.2], [14.0, 0.1]] },
  // heat-blued steel, flat needle with a wider square-ended counterweight; glides 6°/s
  seconds: { tip: 14.5, tail: 5.2, z: z.secondsHand, hub: { radius: 0.55, capRadius: 0.275, z: z.secondsHub }, thickness: 0.08,
    widthAt: [[1, 0.3], [3, 0.26], [5, 0.24], [7, 0.2], [9, 0.18], [11, 0.12], [13, 0.11], [14.5, 0.0]],
    tailWidthAt: [[0.5, 0.5], [2, 0.54], [4, 0.68], [5.2, 0.72]], tailEnd: 'square', colour: '#23409A', highlight: '#4A78C8' },
  // hub Ø1.0 (render 0.9, photo 1.4): it must stay inside the fan recess (right edge dx +0.53)
  powerReserve: { pivot: P.prDisplay, length: 4.65, widthHub: 0.34, widthTip: 0.15, hubRadius: 0.5, z: z.prHand, finish: 'mirror, faceted spear, no tail' },
  colours: { polished: '#E3E4E6', blued: '#23409A' },
  // arbor stack at the centre (radii): seconds arbor 0.10; centre tube 0.13–0.22; cannon pipe
  // 0.22–0.38; hour pipe 0.40–0.60 (hands' collets sit on them, tops in SPEC.z)
  centreStack: { secondsArbor: 0.1, centreTube: [0.13, 0.22], cannonPipe: [0.22, 0.38], hourPipe: [0.4, 0.6] },
};

export const SPEC = {
  id: 'gs-sbga211',
  name: 'Snowflake',
  reference: 'SBGA211',
  caliber: '9R65',
  engravedCaliber: '9R65A',
  caseSerial: '8N2117', // engraved on the case back — the owner can put their own here
  caseCode: '9R65-0AE0',

  powerReserveHours: POWER_H,
  barrelTurns: BARREL_TURNS,
  timing: { type: 'springdrive', glideHz: 8, glideDir: GLIDE_DIR },
  dateChange: { type: 'jump' }, // instantaneous at local midnight (kinematics default)
  train, arbors, keyless, automatic, modules, meshes, periods: per,
  layout: P,
  z, explode, explodeDelay,

  movement: {
    radius: 15.0, height: 5.8, jewels: 30, caliber: '9R65', type: 'Spring Drive, automatic (Magic Lever) with hand winding',
    accuracy: '±15 s/month (±1 s/day)', glideRps: 8, partsCount: 276, // 276 = 5R65 figure
    mainspring: { alloy: 'Spron 510', height: 1.25, thickness: 0.1, coilsLetDown: 15, coilsWound: 24 },
    barrel: { drumOuter: 6.95, drumInner: 6.7, arborCore: 2.2, teethTip: tipR(modules.barrel, 146) },
  },
  frame, finish, regulator, rotor, powerReserve, date, rotations, keylessLevers,
  case: caseSpec, dial, hands,
  // derived radii, for builders and the check
  radii: {
    centerWheel: tipR(modules.center, 84), thirdWheel: tipR(modules.third, 80), fourthWheel: tipR(modules.fourth, 80),
    fifthWheel: tipR(modules.fifth, 75), sixthWheel: tipR(modules.sixth, 64), barrel: tipR(modules.barrel, 146),
    centerPinion: pinionTipR(modules.barrel, 14), thirdPinion: pinionTipR(modules.center, 14), fourthPinion: pinionTipR(modules.third, 8),
    fifthPinion: pinionTipR(modules.fourth, 10), sixthPinion: pinionTipR(modules.fifth, 10), glidePinion: pinionTipR(modules.sixth, 8),
    cannonLeaves: pinionTipR(MA, 14), minuteWheel: tipR(MA, 42), minutePinion: pinionTipR(MB, 10), hourWheel: tipR(MB, 40),
    dateDriver: tipR(MB, 80), settingWheel: tipR(MA, 19), settingIntermediate: tipR(MA, 30),
    ratchet: tipR(MR, 74), keylessIntermediate: tipR(MR, 38), pawlPinion: pinionTipR(MR, 10),
    crownWheel: tipR(M_CROWN, 30), crownTransmissionLower: tipR(M_CROWN, 24), crownTransmissionUpper: tipR(MR, 24),
    windingPinion: (M_CROWN * 14) / 2 + 0.12, pawlWheel: PAWL_TIP_R,
    prB: tipR(M_PRD, 64), prA: pinionTipR(M_PRD, 8), prC: pinionTipR(M_PRD, 13),
    prOutputPinion: pinionTipR(modules.prDial1, 12), prIntermediateWheel: tipR(modules.prDial1, 36),
    prIntermediatePinion: pinionTipR(modules.prDial2, 10), prDisplayWheel: tipR(modules.prDial2, 40),
  },
  helpers: { B, polar, clock, atAngle },
};

if (typeof window !== 'undefined') {
  // Sanity check: every derived module in a plausible horological range.
  for (const [k, v] of Object.entries(modules)) {
    if (!(v > 0.03 && v < 0.25)) console.warn(`[spec gs-sbga211] module ${k} = ${v.toFixed(4)} looks wrong`);
  }
}
