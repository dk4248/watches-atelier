// NOMOS Glashütte Tangente ref. 139 — caliber DUW 4001.
// Single source of truth for every dimension, position, level and ratio.
//
// Sources (see research/*.md):
//  - Case, dial, hands: NOMOS official product photos measured at 23.5 px/mm, NOMOS
//    spec pages (35.0 × 6.6 mm, 45.0 lug-to-lug, 18 mm lugs).
//  - Movement layout: NOMOS official DUW 4001 back render measured at 54.4 px/mm
//    (±0.15 mm on jewels). Cross-checked against ETA's to-scale 7001 drawings (the
//    Peseux 7001 → Alpha → DUW 4001 lineage); positions agree within ±0.3 mm.
//  - Tooth counts: ETA 7001 CAD drawings (barrel 126, centre 120/16, third 112/14,
//    fourth 120/10, escape 15; motion works 12/40, 10/36; keyless 15/42/56).
//    The centre pinion (18) and all heights are engineering estimates.
//
// FRAME: units mm. +Z out of the dial. 12 o'clock = +Y, 3 o'clock (crown) = +X.
// Measurements taken from the BACK (crown on the left) are converted with B().

const B = (x, y) => [-x, y]; // back-view measurement → dial-side frame
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- arbor layout
// Jewel centres re-measured on the official render (hole-filled jewel blobs); they
// match ETA's 7001 drawing within ±0.05 mm. Fourth wheel: the photo-measured subdial
// centre (−6.50) and the jewel (−6.34) are reconciled at −6.40.
const P = {
  center: [0, 0],
  third: B(-1.67, -3.51),
  fourth: [0, -6.4], // small seconds — the dial's subdial centre is exactly here
  escape: B(3.05, -6.40),
  pallet: B(4.53, -3.77),
  balance: B(6.26, -0.86),
  barrel: B(-2.25, 5.61), // barrel arbor = ratchet wheel centre
  crownWheel: B(-5.91, 0.05),
  minuteWheel: [2.32, -2.10], // dial side, from the ETA 7001 drawing
};
// Straight-line lever (escape, pallet and balance collinear within ~1.3°).
// The pallet embraces 2.5 teeth: the stones touch the tip circle ±30° off the line
// of centres, so escape tip radius = escape–pallet distance × cos 30° (≈ 2.61).
const EP = hyp(P.escape, P.pallet);

// ---------------------------------------------------------------- tooth counts
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
const keyless = {
  windingPinion: { teeth: 15 },
  crownWheel: { teeth: 42 },
  ratchet: { teeth: 56 },
  settingWheel: { teeth: 15 },
  slidingPinion: { teeth: 12 },
};

// Modules follow from the measured centre distances: m = 2 d / (z1 + z2).
// This guarantees every meshing pair sits at exactly the right distance.
const mod = (d, z1, z2) => (2 * d) / (z1 + z2);
const modules = {
  barrel: mod(hyp(P.barrel, P.center), train.barrel.teeth, train.center.pinion), // barrel ↔ centre pinion
  center: mod(hyp(P.center, P.third), train.center.teeth, train.third.pinion), // centre wheel ↔ third pinion
  third: mod(hyp(P.third, P.fourth), train.third.teeth, train.fourth.pinion), // third wheel ↔ fourth pinion
  fourth: mod(hyp(P.fourth, P.escape), train.fourth.teeth, train.escape.pinion), // fourth wheel ↔ escape pinion
  motionA: mod(hyp(P.center, P.minuteWheel), train.cannon.teeth, train.minuteWheel.teeth), // cannon ↔ minute wheel
  motionB: mod(hyp(P.center, P.minuteWheel), train.minuteWheel.pinion, train.hourWheel.teeth), // minute pinion ↔ hour wheel
  keyless: mod(hyp(P.barrel, P.crownWheel), keyless.ratchet.teeth, keyless.crownWheel.teeth), // ratchet ↔ crown wheel
};

// ---------------------------------------------------------------- vertical stack
// z = 0 is the dial-side face of the main plate. Back side is negative.
// Collision-checked stack (research/synthesis.md §5.5). The going train uses three
// levels so overlapping wheels never share a plane: L0 −0.90…−1.02 (centre wheel,
// escape wheel, pallet fork, roller), L1 −1.10…−1.22 (fourth wheel), L2 −1.30…−1.42
// (third wheel). Scalars are mid-planes, pairs are [z0, z1] ranges.
const z = {
  // dial side — motion works sit in a 0.35 mm recess in the plate's dial face
  plateDialFace: 0,
  motionRecess: -0.35,
  cannonPinion: [-0.32, 1.19], // leaves [-0.32, -0.18] mesh the minute wheel; pipe up to the minute hand
  cannonLeaves: [-0.32, -0.18],
  minuteWheel: -0.25, // wheel mid-plane (0.10 thick)
  minutePinion: [-0.18, -0.03],
  hourWheel: -0.08, // wheel mid-plane (0.10 thick); its pipe rises to hourPipeTop
  hourPipeTop: 0.89,
  settingWheel: -0.25,
  dial: [0.0, 0.30], // dial plate bottom/top (0.30 thick)
  subdialFloor: 0.18, // recessed small-seconds disc surface (0.12 deep)
  secondsHand: 0.30, // blade bottom (hub up to 0.42)
  hourHand: 0.70, // blade bottom (domed collet 0.70–0.90)
  minuteHand: 1.02, // blade bottom (domed collet 1.02–1.20)
  handThickness: 0.10,
  secondsHandThickness: 0.08,
  centerCapTop: 1.25,
  crystal: [1.45, 2.5],
  // movement
  mainPlate: [-0.85, 0],
  centerWheel: -0.96, // L0, 0.12 thick
  thirdWheel: -1.36, // L2
  fourthWheel: -1.16, // L1
  escapeWheel: -0.96, // L0, steel 0.12
  pinionOf: {
    center: [-1.26, -1.08], // meshes the barrel teeth
    third: [-1.04, -0.88], // meshes the centre wheel (L0)
    fourth: [-1.44, -1.28], // meshes the third wheel (L2)
    escape: [-1.24, -1.08], // meshes the fourth wheel (L1)
  },
  barrel: [-2.0, -1.08], // drum
  barrelTeeth: [-1.24, -1.10], // toothed band at the dial-side end of the drum
  barrelLid: [-2.0, -1.95], // lid at the back end
  palletFork: -0.975, // L0 (0.90–1.05), same plane as the escape wheel
  roller: -1.0, // double roller (0.90–1.10)
  balanceRim: -1.70, // rim mid-plane (−1.92…−1.48); arms flush with the rim's back face
  hairspring: -2.02, // (−2.06…−1.98)
  threeQuarterPlate: [-2.42, -2.02],
  ratchetWheel: [-2.52, -2.32], // in a 0.10 recess in the plate top
  ratchetScrewTop: -2.60,
  crownWheel: [-2.50, -2.32],
  crownWheelCover: [-2.56, -2.50],
  click: [-2.52, -2.36],
  balanceCock: [-2.42, -2.12], // top flush with the plate top
  regulatorRings: [-2.50, -2.42],
  shockTop: -2.56,
  screwHeads: [-2.56, -2.42],
  palletBridge: [-1.38, -1.10],
  stemAxis: -1.30, // winding stem / crown axis; the winding pinion's tip reaches −2.43
  // case
  caseTop: 2.5,
  caseBottom: -4.1,
};

// ---------------------------------------------------------------- explode offsets
// Offsets (mm) at full explosion: dial side flies +Z, movement side −Z, every part
// clear of the ones it sits on. Tuned for the exploded camera (azimuth 64°, elevation
// 16°, from the dial side, 16:9): each wheel, bridge and keyless part keeps at least
// half of its outline in view, the stack is ≈100 mm long, and nothing passes through
// anything else on the way out (collision-checked at 20 steps). Parts not listed stay
// put; jewels and plate engravings ride on the three-quarter plate.
const explode = {
  // case: bezel over crystal over case body; the stem and crown pull straight out
  bezel: [0, 0, 38], crystal: [0, 0, 34.5],
  'case-body': [0, 0, 31], lugs: [0, 0, 31], 'spring-bars': [0, 0, 31],
  'strap-top': [0, 34, 31], 'strap-bottom': [0, -34, 31], buckle: [0, -34, 31],
  crown: [16.5, 0, 0], 'winding-stem': [14, 0, 0], // the stem clears the case wall (x 17.5)
  // dial side: hands, dial, then the keyless and motion works under the dial
  'minute-hand': [0, 0, 18.5], 'hour-hand': [0, 0, 17], 'seconds-hand': [0, 0, 15.5],
  dial: [0, 0, 13.5], 'small-seconds': [0, 0, 13.5], 'dial-feet': [0, 0, 13.5],
  'setting-lever': [0, 0, 9], yoke: [0, 0, 6.5], 'hour-wheel': [0, 0, 5.4],
  'keyless-springs': [0, 0, 4], 'minute-wheel': [0, 0, 3.4], 'setting-wheel': [0, 0, 2.4],
  // the two pinions rise together (their Breguet teeth interlock), slightly apart
  'sliding-pinion': [0, 0, 2.4], 'winding-pinion': [0.3, 0, 2.4],
  'cannon-pinion': [0, 0, 1.5],
  'main-plate': [0, 0, 0], jewels: [0, 0, 0],
  // going train and escapement, between the plates
  'center-wheel': [0, 0, -8.5], 'pallet-fork': [0, 0, -9.5], 'escape-wheel': [0, 0, -9.6],
  'fourth-wheel': [0, 0, -10.6], 'third-wheel': [0, 0, -12.3], 'pallet-bridge': [0, 0, -12.6],
  'balance-wheel': [0, 0, -14.6], roller: [0, 0, -14.6], hairspring: [0, 0, -18],
  barrel: [0, 0, -18], mainspring: [0, 0, -22], 'barrel-arbor': [0, 0, -25.5], 'barrel-cover': [0, 0, -28],
  'three-quarter-plate': [0, 0, -30],
  // on top of the three-quarter plate
  'balance-cock': [0, 0, -41.5], 'ratchet-wheel': [0, 0, -42], 'crown-wheel': [0, 0, -42], click: [0, 0, -42],
  'click-spring': [0, 0, -43], 'plate-screws': [0, 0, -43], regulator: [0, 0, -43.5],
  'crown-wheel-cover': [0, 0, -44.5], 'shock-absorber': [0, 0, -45.5], 'ratchet-screw': [0, 0, -47.5],
  // what holds the movement in the case, and the display back
  'casing-ring': [0, 0, -49.5], 'case-clamps': [0, 0, -50.3], 'caseback-glass': [0, 0, -52.5], 'caseback-ring': [0, 0, -55],
};
// When each part starts to move (0…1; the registry starts a part at 0.45 × delay and
// moves it over 0.55 of the slider). By default the farthest parts go first, so the
// watch opens from the outside in. Overrides: the crown and stem leave first and the
// case only lifts once the stem is out of its wall; everything under the case follows
// it (hands, then dial, then the keyless works), and the yoke lifts before the sliding
// pinion it holds.
const explodeDelays = {
  crown: 0, 'winding-stem': 0,
  'case-body': 0.82, lugs: 0.82, 'spring-bars': 0.82, 'strap-top': 0.82, 'strap-bottom': 0.82, buckle: 0.82,
  'minute-hand': 0.84, 'hour-hand': 0.85, 'seconds-hand': 0.86,
  dial: 0.87, 'small-seconds': 0.87, 'dial-feet': 0.87,
  'setting-lever': 0.89, yoke: 0.9, 'sliding-pinion': 1, 'winding-pinion': 1,
};
const explodeDelay = (id) => {
  if (explodeDelays[id] !== undefined) return explodeDelays[id];
  const e = explode[id];
  if (!e) return 0.5;
  return Math.min(0.95, Math.max(0, 1 - Math.hypot(...e) / 55));
};

export const SPEC = {
  name: 'Tangente',
  reference: '139',
  caliber: 'DUW 4001',
  // Engraved numbers — the owner can put their own here.
  caseSerial: '83427',
  movementSerial: '00535',

  powerReserveHours: 53,
  barrelTurns: 7.6, // 53 h ÷ 7 h per barrel turn
  timing: { beatsPerHour: 21600, amplitudeDeg: 290, liftDeg: 50, forkHalfDeg: 6.75 },
  train, keyless, modules,
  layout: P,
  z, explode, explodeDelay,

  // Movement outline
  movement: {
    radius: 11.65, // 23.3 mm, 10½ lignes
    height: 2.6,
    jewels: 17,
    // Glashütte ribbing on the 3/4 plate and balance cock: straight bands that rise to
    // the right when seen from the back. Re-measured on the official render by
    // averaging the plate's brightness along the bands: angle 30.5°, pitch 2.01 mm, and a
    // saw-tooth profile (each band bright along its lower edge, ≈20 % darker along its
    // upper edge, then a sharp step to the next band), boundaries at
    // v = x·sin a + y·cos a = −0.25 + 2.01·k (dial frame). The ribbing texture tile holds
    // 4 bands, so uvScale = 1 / (4 × pitch); uvOffset puts the band steps on the measured
    // lines. Use planarUV(geo, uvScale, uvOffset, uvAngle) on geometry built in movement
    // coordinates, so the bands run on continuously from the plate onto the cock.
    ribbing: { uvScale: 1 / 8.04, uvAngle: -30.5 * DEG, uvOffset: [0, 0.25 / 8.04], pitch: 2.01 },
    perlageUvScale: 1 / 4.4, // perlage tile 4.4 mm: spots ≈1.3 mm across, as on the render
  },

  // Frame details measured on the back render (converted to the dial frame).
  frame: {
    plateRadius: 11.65,
    // The ribbed top of the 3/4 plate ends ≈0.4 mm inside the movement edge (measured
    // all round on the back render); the frosted rim of the pillar plate shows outside it.
    threeQuarterPlateRadius: 11.25,
    pillarRimTop: -2.06, // that rim's top face (level with the casing-clamp pillars)
    balanceCutout: { center: P.balance, radius: 5.05 },
    crownWheelRecess: { center: P.crownWheel, radius: 3.25 },
    ratchetSeat: { center: P.barrel, radius: 4.25 },
    windingPinionWindow: { x: [8.6, 9.25], y: [-1.4, 1.5] }, // through-slot exposing the winding pinion
    clampNotches: [B(2.7, 10.6), B(-1.9, -10.66)], // casing-clamp notches at the plate edge, r ≈ 0.8
    clickRecess: { center: B(-8.2, 6.0), length: 2.2, width: 1.1, angleDeg: 60 },
    // Balance cock, traced on a 0.25 mm grid over the official back render (back-view
    // points, converted). `outline` is its ribbed top face: the broad foot fills the
    // plate from the recess of the steel screw at 1 o'clock down to y ≈ 3.8 (it stops
    // above the pillar plate's "MADE IN GERMANY" rim), out to the 3/4 plate's edge
    // (points beyond it are clipped to the plate radius); the arm, ≈3.5 mm wide, runs
    // down to a ring housing (r 1.75) round the balance staff, its right flank following
    // the balance opening. `flank` is the cock's left edge (back view), from the ring up
    // to the screw recess: it carries a wide frosted chamfer (`chamferWidth`), which
    // reads as the grey channel between the cock and the plate in the photos. The plate
    // is cut along outline + chamfer.
    balanceCock: {
      outline: [
        B(4.6, 0.0), B(4.45, 1.0), B(4.3, 2.0), B(4.15, 3.0), B(4.05, 4.0), B(4.03, 4.7), B(4.1, 5.3),
        B(4.28, 5.78), B(4.58, 6.18), B(4.98, 6.55), B(5.45, 6.9), B(5.9, 7.17), B(6.15, 7.3),
        B(6.45, 7.33), B(6.8, 7.33), B(7.15, 7.47), B(7.4, 7.72), B(7.5, 7.93), B(7.95, 7.97),
        B(9.3, 8.7), B(12.2, 6.5), B(12.4, 4.1), // outside the plate: clipped
        B(10.4, 3.82), B(9.95, 3.72), B(9.45, 3.82), B(9.0, 3.95), B(8.6, 3.86), B(8.3, 3.63),
        B(8.05, 3.28), B(7.86, 2.75), B(7.72, 2.0), B(7.65, 1.3), B(7.7, 0.6), B(7.4, 0.0),
      ],
      flank: [
        B(4.6, 0.0), B(4.45, 1.0), B(4.3, 2.0), B(4.15, 3.0), B(4.05, 4.0), B(4.03, 4.7), B(4.1, 5.3),
        B(4.28, 5.78), B(4.58, 6.18), B(4.98, 6.55), B(5.45, 6.9), B(5.9, 7.17), B(6.15, 7.3),
      ],
      chamferWidth: 0.45,
      ringCenter: P.balance, ringRadius: 1.75,
      screw: B(7.21, 5.46),
      // recess in the plate for the polished steel screw at the cock's corner
      screwRecess: { center: B(6.66, 8.03), radius: 0.74 },
    },
    palletBridge: { jewel: P.pallet, anchor: B(2.6, -5.0), width: 1.1 },
    blueScrews: [B(3.85, 8.24), B(7.21, 5.46), B(-8.72, 3.31), B(-8.13, -3.69), B(6.72, -6.81)],
    blueScrewHeadDiameter: 1.5,
    steelScrews: [B(-10.0, -1.38), B(-8.29, -6.62), B(6.6, 8.0), B(0.85, 10.85)],
    // Hole jewels visible on the 3/4 plate (upper train jewels)
    upperJewels: { center: P.center, third: P.third, fourth: P.fourth, escape: P.escape },
    engravings: {
      // gold-filled, upright uppercase sans (DIN-like), cap height ≈0.65, left-aligned
      // at x_back ≈ −5.9 (reads correctly when seen from the back!)
      block: [
        { text: 'DUW 4001', at: B(-5.9, -5.15) },
        { text: 'N° {movementSerial}', at: B(-5.9, -6.2) },
        { text: 'NOMOS GLASHÜTTE', at: B(-5.9, -7.7) },
        { text: 'DEUTSCHE UHRENWERKE', at: B(-5.9, -8.7) },
      ],
      capHeight: 0.65,
      // vertical, along the left edge in back view, reads top→bottom, gold-filled
      jewelsText: { text: '17 RUBINE', at: B(-10.3, 2.1), rotateDegBackView: -90, capHeight: 0.6 },
      // grey (unfilled), two lines, near the right edge in back view, reads bottom→top
      madeIn: { lines: ['MADE IN', 'GERMANY'], at: B(10.7, 1.9), rotateDegBackView: 90, capHeight: 0.42 },
    },
  },

  // Escapement / regulating organ
  escapement: {
    escapeTipRadius: EP * Math.cos(30 * DEG), // pallet embraces 2.5 teeth: stones at ±30°
    palletToEscape: EP,
    palletToBalance: hyp(P.pallet, P.balance),
    // impulse-pin radius from the balance axis: lift ratio θ/ψ = 25°/6.75° = 3.7 = L/r
    // with L + r = pallet–balance distance (3.43) → r ≈ 0.73
    rollerJewelRadius: 0.73,
    balanceRadius: 4.675, // rim OD 9.35, ID 8.70
    balanceRimWidth: 0.325,
    balanceRimHeight: 0.44,
    balanceArms: 3,
    // Pallet-stone contact points on the escape tip circle (derived; match the photo).
    entryStone: B(3.02, -3.79),
    exitStone: B(5.30, -5.07),
    // Body Ø ≈ 4.4 with ~13 coils; the outer terminal curve runs out to r ≈ 2.9 where
    // the regulator's key pins and the stud hold it.
    hairspring: { innerRadius: 0.45, outerRadius: 2.2, terminalRadius: 2.9, coils: 13, height: 0.08, thickness: 0.035 },
    // DUW regulation system (on rings on the cock): directions in BACK-VIEW clock
    // positions around the balance; dial-frame points below.
    regulatorKey: B(5.4, -3.6), // gold-coloured "spring key" block (two pins)
    studCarrier: B(8.4, -2.9),
  },

  // Case
  case: {
    radius: 17.5,
    height: 6.6,
    lugToLug: 45.0,
    lugWidth: 18.0,
    // Three-part case; heights from the perspective-corrected side photo
    // (research/synthesis.md §2): bezel 1.30, middle case 3.77, case back 1.43.
    bezel: { top: 2.40, bottom: 1.10, outerRadius: 17.5, flatInner: 16.65, chamferInner: 16.3 },
    middle: { top: 1.10, bottom: -2.67, outerRadius: 17.5 },
    caseback: {
      top: -2.67, bottom: -4.10,
      outerRadius: 16.95, // inset 0.55 from the middle case
      bevelTopZ: -3.50, chamferRadius: 14.95, // outer bevel from (16.95, −3.50) to (14.95, −4.10)
      aperture: 11.75, // clear window radius (Ø 23.5); window chamfer 11.75 → 12.20
      windowChamferOuter: 12.20,
      textRadius: 13.4, textCapHeight: 0.8, textSpanDeg: [152, 208],
    },
    backGlass: { radius: 12.3, z: [-4.0, -3.0] },
    crystal: { radius: 16.65, z: [1.45, 2.5] }, // 0.10 proud of the bezel
    innerFlange: { inner: 15.75, outer: 16.45, z: [0.30, 1.45] }, // dark band seen inside the crystal
    // Lug profile in the (y, z) plane for the 12 o'clock lugs (mirror y for 6 o'clock);
    // each lug is a 1.25 mm thick plate, x ∈ ±[9.0, 10.25]: a horizontal root 2.36
    // thick, a section slanting ~41° down, then a vertical flat-cut tip.
    lug: {
      xInner: 9.0, xOuter: 10.25,
      profile: [[15.0, 0.84], [18.9, 0.84], [22.5, -2.20], [22.5, -4.17], [20.55, -4.17], [17.65, -1.52], [15.0, -1.52]],
      springBar: { y: 19.85, z: -1.71, holeRadius: 0.5, barRadius: 0.75 },
    },
    crown: { radius: 2.5, rootRadius: 2.3, faceRadius: 2.1, neckRadius: 1.2, from: 17.5, neckTo: 17.9, to: 19.6, flutes: 24, fluteDepth: 0.2, axisZ: z.stemAxis, text: 'NOMOS' },
    strap: { width: 18, widthAtBuckle: 16, thickness: 3.0, thicknessAtEnd: 2.5, colour: '#141210' },
  },

  // Dial (all radii from the dial centre, angles clockwise from 12)
  dial: {
    radius: 16.0, // Ø 32.0 disc, 0.30 thick
    visibleRadius: 15.75,
    numerals: { hours: [12, 2, 4, 8, 10], r: [10.0, 13.45], height: 3.3, stroke: 0.27, outwardTops: [12, 2, 10], inwardTops: [4, 8] },
    batons: { hours: [1, 3, 5, 7, 9, 11], r: [10.0, 13.45], width: 0.2 },
    minuteTrack: { r: [14.15, 14.95], minorWidth: 0.07, majorWidth: 0.2 },
    logo: { text: 'NOMOS', baselineY: 5.87, capHeight: 0.9, width: 7.46 },
    // GLASHÜTTE: every letter's left ink edge (from the line centre) and ink width, mm,
    // measured on the official close-up (logo.png, 94.2 px/mm); stems ≈0.08 mm
    city: {
      text: 'GLASHÜTTE', baselineY: 4.8, capHeight: 0.64, width: 5.53,
      glyphs: [[-2.766, 0.361], [-2.054, 0.234], [-1.513, 0.372], [-0.823, 0.276], [-0.154, 0.318], [0.589, 0.318], [1.237, 0.318], [1.852, 0.308], [2.489, 0.276]],
    },
    madeIn: { text: 'MADE IN GERMANY', r: [15.06, 15.47], spanDeg: [164.6, 194.9] },
    subdial: { center: P.fourth, recessRadius: 4.75, depth: 0.12, ticks: { r: [3.24, 4.07], major: 0.2, minor: 0.1 }, groovePitch: 0.14 },
    // two brass dial feet (angles clockwise from 12), clear of the casing-clamp notches,
    // the keyless works at 3 o'clock and the motion works; they reach 0.75 into the
    // pillar plate, which has blind holes for them
    feet: { angles: [60, 240], r: 10.9, radius: 0.28, depth: 0.75 },
    colour: '#e8e9eb',
    print: '#141414',
  },
  hands: {
    hour: { tip: 9.38, widthHub: 0.40, widthTip: 0.37, taper: 0.45 },
    minute: { tip: 14.72, widthHub: 0.38, widthTip: 0.34, taper: 0.4 },
    seconds: { tip: 3.97, tail: 1.47, width: 0.28, hubRadius: 0.625, pinRadius: 0.15 },
    hourCollet: 1.125, // radius (Ø 2.25), domed
    minuteCollet: 0.675, // radius (Ø 1.35), domed
    pinRadius: 0.275, // polished steel centre pin
  },
};

if (typeof window !== 'undefined') {
  // Sanity check: every derived module should be in a plausible horological range.
  for (const [k, v] of Object.entries(modules)) {
    if (!(v > 0.03 && v < 0.2)) console.warn(`[spec] module ${k} = ${v.toFixed(4)} looks wrong`);
  }
}
