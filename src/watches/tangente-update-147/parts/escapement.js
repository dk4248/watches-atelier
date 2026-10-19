// ESCAPEMENT and REGULATING ORGAN of the DUW 6101 (NOMOS swing system): 15-tooth steel
// escape wheel (4 arms), pallet fork with two ruby pallets, gold three-arm balance (Ø 9.40),
// double roller + impulse jewel, blue hairspring, the two-sided NOMOS balance bridge (blued
// screw at each end, ribbed), the DUW regulation system (spring-key ring + stud-carrier
// ring, no screw), Incabloc shock settings top (on the bridge) and bottom (in the pillar
// plate, seen from the dial side).
// Registers: escape-wheel, pallet-fork, balance-wheel, roller, hairspring, balance-bridge,
//   regulator, shock-absorber, shock-absorber-lower.
// Reads: SPEC.escapement, SPEC.timing, SPEC.layout, SPEC.modules.fourth, SPEC.train.escape,
//   SPEC.frame.balanceBridge, SPEC.z, SPEC.explode / explodeDelay, parts/finish.js.
//   See research/tangente-update-147/plan.md.
//
// The lever escapement is SOLVED, not drawn. At start-up the club-tooth and pallet-stone
// outlines below go through a 2-D contact simulation: the train always pushes the escape
// wheel forward against whichever stone it touches while the fork travels between its
// bankings. That gives, for every fork position during a beat, the exact angle at which
// the wheel is held: unlocking (with a hair of recoil from the draw), impulse on the
// stone's face, impulse on the tooth's club, drop, lock. At rest a tooth's locking corner
// sits ON the locking face of a stone — the entry stone after every even beat, the exit
// stone after every odd one — and during the ~9 ms impulse window the wheel's teeth follow
// the solved profile instead of the kinematic ease, so in slow motion no tooth ever
// passes through a stone.
import * as THREE from 'three';
import {
  ribbedMaterial, ribbingUV, bluedScrewMaterial, polishMaterial,
  SDF, smin, smax, regionShapes, slab, lathe, mergeAll, screwGeometry, inPoly, loopArea, smoothClosed,
} from './finish.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// ===================================================================== 2-D helpers
const rot2 = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const ccw = (P) => (loopArea(P) < 0 ? P.slice().reverse() : P);
const inside = (x, y, P) => inPoly([x, y], P);
function segCross(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function polysOverlap(A, B) {
  for (const p of A) if (inside(p[0], p[1], B)) return true;
  for (const p of B) if (inside(p[0], p[1], A)) return true;
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) if (segCross(a, b, B[j], B[(j + 1) % B.length])) return true;
  }
  return false;
}

// ===================================================================== escapement design
// Proportions of a Swiss club-tooth lever escapement for 15 teeth and a 2½-tooth embrace,
// as fractions of the escape wheel's tip radius R (the same angular design as the
// Tangente 139's solved escapement; every length scales with this wheel's R = 2.517).
const DESIGN = {
  hc: 0.0344, // club height: the locking corner sits on the locking circle R − hc
  gcDeg: 6, // club length (degrees) from the locking corner back to the heel
  rootR: 0.72, // root circle of the teeth
  w: 0.0804, wX: 0.0574, // entry / exit stone width
  lock: 0.0153, lockX: 0.0210, // lock (how far the locking face reaches past the corner)
  hImp: 0.0727, hImpX: 0.0804, // impulse-face lift on the entry / exit stone
  drawDeg: 2, drawXDeg: 0, // locking-face draw angles
  stoneLen: 0.287, // stone length along the locking face
};

// One Swiss club tooth (CCW polygon): locking corner at angle 0 on the locking circle;
// the heel of the club on the tip circle R, so after the tooth has slid off the stone's
// impulse face the club's own inclined face lifts the stone further. Teeth lean towards
// +angle (the wheel turns CCW seen from the dial).
function clubTooth(R) {
  const D = DESIGN, Rl = R * (1 - D.hc), rootR = D.rootR * R, gc = D.gcDeg;
  const P = (r, a) => pol(r, a * DEG);
  const k = (f) => f * R;
  const pts = [
    // back of the stem: a concave fillet into the rim, kept below the deepest point any
    // stone reaches (≈ 0.865 R)
    P(rootR, -16.5), P(rootR + k(0.0191), -13.8), P(rootR + k(0.0459), -11.4), P(rootR + k(0.0804), -9.3),
    P(rootR + k(0.1263), -7.2), P(R - k(0.0727), -5.4),
    // the heel of the club, rounded up to the tip circle
    P(R - k(0.0517), -6.75), P(R - k(0.0230), -6.9), P(R - k(0.0046), -6.4), P(R, -gc),
  ];
  // the club's impulse face, very slightly convex, down to the locking corner
  for (const s of [0.25, 0.5, 0.75]) pts.push(P(R + (Rl - R) * s + k(0.0023) * Math.sin(Math.PI * s), -gc * (1 - s)));
  pts.push(P(Rl, 0));
  // the locking face down to the root, then the root fillet
  const C = P(Rl, 0), F = P(rootR, -6.2);
  for (const t of [0.33, 0.66, 0.9]) pts.push([C[0] + (F[0] - C[0]) * t, C[1] + (F[1] - C[1]) * t]);
  pts.push(P(rootR + k(0.0077), -5.5), P(rootR - k(0.0015), -4.0));
  return { pts, Rl, rootR };
}

// The two pallet stones, each drawn at its own "in" banking around the resting tooth
// corner, in the E frame (escape centre at the origin, pallet arbor at (d, 0)); returned in
// fork-local coordinates of that frame, CCW: [LC locking corner, LO let-off corner, OB, OF].
function designStones(d, phi0, Rl, R) {
  const D = DESIGN;
  const w = D.w * R, wX = D.wX * R, lock = D.lock * R, lockX = D.lockX * R;
  const hImp = D.hImp * R, hImpX = D.hImpX * R, len = D.stoneLen * R;
  const betaE = -30 * DEG - w / 2 / Rl; // tooth corner angle at an even rest (entry locks)
  const betaX = betaE + 60 * DEG; // odd rest (exit locks): 2½ teeth further on
  function stoneAt(beta, sw, lk, hi, drawDeg) {
    const u = pol(1, beta), t = pol(1, beta + Math.PI / 2);
    const f = rot2(u, drawDeg * DEG); // locking face, its outer end leaning downstream (draw)
    const LC = [u[0] * Rl - f[0] * lk, u[1] * Rl - f[1] * lk];
    const LO = [LC[0] + sw * t[0] - hi * u[0], LC[1] + sw * t[1] - hi * u[1]];
    const OF = [LC[0] + len * f[0], LC[1] + len * f[1]];
    const OB = [OF[0] + sw * t[0], OF[1] + sw * t[1]];
    return [LC, LO, OB, OF];
  }
  const toLocal = (poly, phi) => poly.map((p) => rot2([p[0] - d, p[1]], -phi));
  return {
    betaE, betaX,
    entry: toLocal(stoneAt(betaE, w, lock, hImp, D.drawDeg), -phi0),
    exit: toLocal(stoneAt(betaX, wX, lockX, hImpX, D.drawXDeg), +phi0),
  };
}

// First contact (smallest CCW wheel rotation ≤ maxD) between a tooth and a stone, both CCW
// polygons in the E frame: every vertex of one against every edge of the other.
function firstContact(tooth, stone, maxD) {
  let best = maxD;
  const test = (P, A, B, sign) => {
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const a = dx * dx + dy * dy, b = 2 * (A[0] * dx + A[1] * dy), c = A[0] * A[0] + A[1] * A[1] - (P[0] * P[0] + P[1] * P[1]);
    const disc = b * b - 4 * a * c;
    if (disc < 0) return;
    const sq = Math.sqrt(disc), a0 = Math.atan2(P[1], P[0]);
    for (let r = 0; r < 2; r++) {
      const t = (-b + (r ? sq : -sq)) / (2 * a);
      if (t < -1e-9 || t > 1 + 1e-9) continue;
      const X = A[0] + dx * t, Y = A[1] + dy * t;
      if (sign * (-Y * dy - X * dx) >= 0) continue; // moving out of the polygon, not in
      let D = (((sign * (Math.atan2(Y, X) - a0)) % TAU) + TAU) % TAU;
      if (D > TAU - 1e-7) D = 0;
      if (D < best) best = D;
    }
  };
  for (const P of tooth) for (let i = 0; i < stone.length; i++) test(P, stone[i], stone[(i + 1) % stone.length], 1);
  for (const P of stone) for (let i = 0; i < tooth.length; i++) test(P, tooth[i], tooth[(i + 1) % tooth.length], -1);
  return best;
}

// Wheel progress e(q) (0..1 of the 12° step) against fork travel q (0..1) for the two kinds
// of beat. odd: fork −φ0 → +φ0 (the entry stone unlocks and gives impulse); even: +φ0 → −φ0
// (the exit stone).
function solveEscapement(d, phi0, stones, toothPts, N = 161) {
  const T0 = ccw(toothPts);
  const S0 = [ccw(stones.entry), ccw(stones.exit)];
  const pitch = TAU / 15;
  const posed = (omega, i) => {
    const a = stones.betaE + omega + i * pitch, c = Math.cos(a), s = Math.sin(a);
    return T0.map((p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]);
  };
  const near = (omega) => { // teeth that can reach a stone
    const out = [];
    for (let i = 0; i < 15; i++) {
      let a = stones.betaE + omega + i * pitch;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if ((a > -58 * DEG && a < -2 * DEG) || (a > 2 * DEG && a < 58 * DEG)) out.push(i);
    }
    return out;
  };
  const stonesAt = (phi) => S0.map((S) => S.map((p) => { const q = rot2(p, phi); return [q[0] + d, q[1]]; }));
  const overlap = (omega, S) => {
    for (const i of near(omega)) { const T = posed(omega, i); for (const s of S) if (polysOverlap(T, s)) return true; }
    return false;
  };
  const table = (odd) => {
    const out = new Float32Array(N), raw = new Float32Array(N);
    const base = odd ? 0 : 12 * DEG;
    let omega = base;
    for (let k = 0; k < N; k++) {
      const q = k / (N - 1);
      const S = stonesAt(odd ? -phi0 + 2 * phi0 * q : phi0 - 2 * phi0 * q);
      if (overlap(omega, S)) { // the stone pushes the wheel back a hair (draw, recoil)
        let lo = omega - 2 * DEG, hi = omega;
        for (let j = 0; j < 24; j++) { const m = (lo + hi) / 2; if (overlap(m, S)) hi = m; else lo = m; }
        omega = lo;
      }
      let adv = base + 12 * DEG - omega;
      for (const i of near(omega)) { const T = posed(omega, i); for (const s of S) adv = Math.min(adv, firstContact(T, s, adv)); }
      omega += adv;
      raw[k] = out[k] = (omega - base) / (12 * DEG);
    }
    out[0] = 0;
    out[N - 1] = 1;
    return { e: out, raw };
  };
  const odd = table(true), even = table(false);
  return { odd: odd.e, even: even.e, rawOdd: odd.raw, rawEven: even.raw, posed, stonesAt, overlap, near };
}

// Everything about this watch's escapement that both the builder and the offline checks
// need (pure; no THREE).
export function designEscapement(spec) {
  const L = spec.layout, E = spec.escapement;
  const pEsc = L.escape, pPal = L.pallet, pBal = L.balance;
  const d = E.palletToEscape, R = E.escapeTipRadius;
  const phi0 = spec.timing.forkHalfDeg * DEG;
  const gamma = Math.atan2(pPal[1] - pEsc[1], pPal[0] - pEsc[0]); // escape → pallet (E frame +X)
  const gammaPB = Math.atan2(pBal[1] - pPal[1], pBal[0] - pPal[0]); // pallet → balance (fork 0)
  const delta = gamma - gammaPB;
  const tooth = clubTooth(R);
  const stones = designStones(d, phi0, tooth.Rl, R);
  const solved = solveEscapement(d, phi0, stones, tooth.pts);
  // stones in fork coordinates (+X towards the balance staff)
  const stonesF = { entry: stones.entry.map((p) => rot2(p, delta)), exit: stones.exit.map((p) => rot2(p, delta)) };
  return { d, R, phi0, gamma, gammaPB, delta, psi: gamma + stones.betaE, tooth, stones, stonesF, solved };
}

// Rounded-rectangle cross-section (r0 … r1, z0 … z1) for a lathe.
function roundedSection(r0, r1, z0, z1, rc, n = 4) {
  const pts = [];
  const corner = (cx, cy, a0) => { for (let k = 0; k <= n; k++) { const a = a0 + (Math.PI / 2) * (k / n); pts.push([cx + rc * Math.cos(a), cy + rc * Math.sin(a)]); } };
  corner(r1 - rc, z0 + rc, -Math.PI / 2);
  corner(r1 - rc, z1 - rc, 0);
  corner(r0 + rc, z1 - rc, Math.PI / 2);
  corner(r0 + rc, z0 + rc, Math.PI);
  pts.push(pts[0]);
  return pts;
}

// ===================================================================== builder
export function buildEscapement(ctx) {
  const { spec, M, reg, root, gear } = ctx;
  const L = spec.layout, Z = spec.z, E = spec.escapement, F = spec.frame;
  const DSG = designEscapement(spec);
  const { R, phi0, gammaPB, psi, tooth, stonesF, solved } = DSG;
  const pEsc = L.escape, pPal = L.pallet, pBal = L.balance;
  const Lpb = E.palletToBalance, rj = E.rollerJewelRadius;
  const liftHalf = (spec.timing.liftDeg / 2) * DEG;
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];

  // ------------------------------------------------------------- materials
  const steelSatin = M.steelSatin, steelPolished = M.steelPolished, steelPinion = M.steelPinion;
  const polish = polishMaterial(M);
  const named = (m, n) => { m.name = n; return m; };
  // balance gold (#d9ad6f on the render): bright polished gold-plated rim, the arms softer
  const balanceGold = named(M.brass.clone(), 'duw6101BalanceGold');
  balanceGold.color.set(0xeec488); balanceGold.metalness = 1; balanceGold.roughness = 0.16;
  const balanceGoldArm = named(balanceGold.clone(), 'duw6101BalanceGoldArm');
  balanceGoldArm.roughness = 0.26;
  const goldKey = named(M.brass.clone(), 'duw6101KeyGold');
  goldKey.color.set(0xe4b66c); goldKey.metalness = 1; goldKey.roughness = 0.3;
  const lyreGold = named(M.brass.clone(), 'duw6101LyreGold');
  lyreGold.color.set(0xeec27e); lyreGold.metalness = 1; lyreGold.roughness = 0.2;
  const palletStone = named(M.ruby.clone(), 'duw6101PalletStone'); // #e06a8a
  palletStone.color.set(0xe06a8a); palletStone.attenuationColor = new THREE.Color(0xc02870); palletStone.emissive = new THREE.Color(0x3a0820);
  const impulseRuby = named(M.ruby.clone(), 'duw6101ImpulseJewel'); // #c0203a
  impulseRuby.color.set(0xc0203a);
  const capJewel = named(M.ruby.clone(), 'duw6101CapJewel');
  capJewel.color.set(0xd85a9a); capJewel.attenuationColor = new THREE.Color(0xb02a78); capJewel.emissive = new THREE.Color(0x2c0618);
  capJewel.transmission = 0.35;
  const springBlue = named(M.blued.clone(), 'duw6101Hairspring'); // #2c5da6
  springBlue.color.set(0x2c5da6); springBlue.roughness = 0.22; springBlue.iridescence = 0.25;
  const holeDark = named(M.black.clone(), 'duw6101PoisingHole');
  holeDark.color.set(0x2a1d0c);

  // ------------------------------------------------------------- mesh helpers (one material per mesh)
  const add = (geo, mat, parent, name) => { const m = new THREE.Mesh(geo, mat); if (name) m.name = name; parent.add(m); return m; };
  const slabTo = (shapes, z0, z1, opt, capMat, wallMat, parent, uv = null) => {
    const s = slab(shapes, z0, z1, opt);
    if (capMat === wallMat) { const g = mergeAll([s.caps, s.walls]); if (g) add(uv ? uv(g) : g, capMat, parent); return; }
    if (s.caps) add(uv ? uv(s.caps) : s.caps, capMat, parent);
    if (s.walls) add(uv ? uv(s.walls) : s.walls, wallMat, parent);
  };
  const cyl = (r, z0, z1, x = 0, y = 0, segs = 16) => new THREE.CylinderGeometry(r, r, z1 - z0, segs).rotateX(Math.PI / 2).translate(x, y, (z0 + z1) / 2);

  // ===================================================================== ESCAPE WHEEL
  const zw = Z.escapeWheel, hwT = Z.wheelThickness / 2;
  {
    const object = new THREE.Group();
    object.position.set(pEsc[0], pEsc[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const wheel = new THREE.Group();
    wheel.rotation.z = psi; // tooth 0's locking corner on the entry stone at every even rest
    rotor.add(wheel);

    // the solver's exact club-tooth polygon all round, joined by slightly concave root arcs
    const outline = [];
    for (let i = 0; i < 15; i++) {
      const a = (i * TAU) / 15;
      for (const q of tooth.pts) outline.push(rot2(q, a));
      const a0 = -4.0 * DEG, a1 = TAU / 15 - 16.5 * DEG;
      for (let k = 1; k <= 5; k++) { const t = k / 6; outline.push(pol(tooth.rootR - 0.01 * Math.sin(Math.PI * t), a + a0 + (a1 - a0) * t)); }
    }
    // four straight arms (NOMOS train photo): windows between rim, hub and arms, filleted
    const rimIn = tooth.rootR - 0.15, hubR = 0.36, armHW = 0.058, armA = 0.31;
    const arms = SDF.union(SDF.box([0, 0], rimIn + 0.3, armHW, armA), SDF.box([0, 0], rimIn + 0.3, armHW, armA + Math.PI / 2));
    const win = SDF.carve(SDF.ring([0, 0], hubR, rimIn), arms, 0.08);
    const windows = regionShapes(win, [-rimIn - 0.05, -rimIn - 0.05, rimIn + 0.05, rimIn + 0.05], 0.008, 0.0012).map((s) => s.outer.slice().reverse());
    slabTo([{ outer: outline, holes: windows }], zw - hwT, zw + hwT, { back: 0.005, dial: 0.005 }, steelSatin, steelPolished, wheel);

    // pinion (driven by the fourth wheel: phase from the shared mesh-phase chain), collet, arbor
    const [pz0, pz1] = Z.pinionOf.escape;
    const pin = add(gear.pinionGeometry({ leaves: spec.train.escape.pinion, module: spec.modules.fourth, length: pz1 - pz0 }), steelPinion, rotor, 'escape-pinion');
    pin.position.z = (pz0 + pz1) / 2;
    const phiFE = Math.atan2(pEsc[1] - L.fourth[1], pEsc[0] - L.fourth[0]);
    pin.rotation.z = gear.meshPhase(phiFE, spec.train.fourth.teeth, spec.train.escape.pinion, 0);
    add(lathe([[[0, pz1], [0.17, pz1], [0.21, pz1 + 0.012], [0.21, zw - hwT - 0.004], [0.27, zw - hwT], [0, zw - hwT]],
      [[0, zw + hwT], [0.24, zw + hwT], [0.2, zw + hwT + 0.03], [0.16, zw + hwT + 0.05], [0, zw + hwT + 0.05]]], 32), steelPolished, rotor);
    // lower pivot in the dial-side lower bridge's jewel, upper pivot in the 3/4 plate's jewel
    add(gear.arborGeometry({ r: 0.085, z0: -2.32, z1: 0.08, pivotR: 0.05, pivotLen: 0.2 }), steelPinion, rotor);

    // During the impulse window the teeth follow the solved contact profile; the pinion
    // stays on the kinematic angle so its mesh with the fourth wheel (driven by the same
    // beat counter) stays exact. The two differ by a few degrees for ≈ 9 ms per beat.
    const tabOdd = solved.odd, tabEven = solved.even, NT = tabOdd.length - 1, step = 12 * DEG;
    const update = (s) => {
      const Pb = s.P, base = Math.floor(Pb), frac = Pb - base;
      if (!(frac > 0)) { wheel.rotation.z = psi; return; }
      const even = (base + 1) % 2 === 0; // the beat in progress
      let q = even ? (phi0 - s.fork) / (2 * phi0) : (s.fork + phi0) / (2 * phi0);
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      const tab = even ? tabEven : tabOdd;
      const x = q * NT, i = Math.min(NT - 1, x | 0), t = x - i;
      wheel.rotation.z = psi + (tab[i] + (tab[i + 1] - tab[i]) * t - frac) * step;
    };

    object.userData.escapement = DSG;
    const aA = DSG.gamma + 2.4;
    reg.add({
      id: 'escape-wheel', name: 'Escape wheel', category: 'escapement', side: 'back', exposed: true,
      object, rotor, drive: { key: 'escape' }, update,
      explode: ex('escape-wheel'), explodeDelay: spec.explodeDelay('escape-wheel'),
      anchor: [Math.cos(aA) * R * 0.85, Math.sin(aA) * R * 0.85, zw],
      description: 'The last wheel of the gear train. Its 15 club-shaped steel teeth are let through half a tooth at a time by the pallet stones, six times a second, and as each tooth slides across a stone it gives the lever a small push that keeps the balance swinging.',
      facts: {
        Teeth: '15 Swiss club teeth', 'Tip diameter': `${(2 * R).toFixed(2)} mm`, Arms: '4, straight',
        Pinion: `${spec.train.escape.pinion} leaves (driven by the fourth wheel)`, Step: '12° per beat · 1 turn in 5 s', Material: 'Hardened, polished steel',
      },
      live: (s) => `beat ${(s.beatToday ?? Math.floor(s.P)).toLocaleString('en-US')} today · ${((((s.rot.escape / DEG) % 360) + 360) % 360).toFixed(0)}°`,
      priority: 1,
    });
  }

  // ===================================================================== PALLET FORK
  const zf = Z.palletFork;
  const zfb = [zf - 0.06, zf + 0.04]; // lever body (the stones span the whole L0 level)
  {
    const object = new THREE.Group();
    object.position.set(pPal[0], pPal[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const base = new THREE.Group();
    base.rotation.z = gammaPB; // local +X points at the balance staff
    rotor.add(base);

    // pads holding the outer part of each stone (oriented boxes in fork coordinates)
    const pad = (stone) => {
      const [LC, , OB, OF] = stone;
      const fx = OF[0] - LC[0], fy = OF[1] - LC[1], fl = Math.hypot(fx, fy);
      const f = [fx / fl, fy / fl];
      const tx = OB[0] - OF[0], ty = OB[1] - OF[1];
      const a0 = 0.2, a1 = fl + 0.06;
      return { c: [LC[0] + (f[0] * (a0 + a1)) / 2 + tx / 2, LC[1] + (f[1] * (a0 + a1)) / 2 + ty / 2], hx: (a1 - a0) / 2, hy: Math.hypot(tx, ty) / 2 + 0.075, ang: Math.atan2(f[1], f[0]), f };
    };
    const pads = [pad(stonesF.entry), pad(stonesF.exit)];
    // the impulse jewel's path outside the lift (fork resting on a banking): the horns are
    // shaped round it with a little clearance
    const Sm = [Lpb * Math.cos(phi0), Lpb * Math.sin(phi0)], Sp = [Lpb * Math.cos(phi0), -Lpb * Math.sin(phi0)];
    const amax = 330 * DEG;
    const arcDist = (x, y, cx, cy, r, a0, a1) => {
      const a = Math.atan2(y - cy, x - cx);
      const t = (((a - a0) % TAU) + TAU) % TAU;
      if (t <= a1 - a0) return Math.abs(Math.hypot(x - cx, y - cy) - r);
      return Math.min(Math.hypot(x - cx - r * Math.cos(a0), y - cy - r * Math.sin(a0)), Math.hypot(x - cx - r * Math.cos(a1), y - cy - r * Math.sin(a1)));
    };
    const sweep = (x, y) => Math.min(
      arcDist(x, y, Sm[0], Sm[1], rj, Math.PI + liftHalf + phi0, Math.PI + amax + phi0),
      arcDist(x, y, Sp[0], Sp[1], rj, Math.PI - amax - phi0, Math.PI - liftHalf - phi0),
    ) - 0.115;
    const hx = Lpb - 0.78; // fork head centre
    const hub = SDF.circle([0, 0], 0.3);
    const lever = SDF.capsule([0.1, 0], [hx - 0.24, 0], 0.2, 0.14);
    const head = SDF.box([hx, 0], 0.29, 0.25, 0, 0.07);
    const padArms = pads.map((p) => {
      const b = [p.c[0] - p.f[0] * p.hx * 0.3, p.c[1] - p.f[1] * p.hx * 0.3];
      return { arm: SDF.capsule([0, 0], b, 0.17, 0.12), box: SDF.box(p.c, p.hx, p.hy, p.ang, 0.05), p };
    });
    const holes = [SDF.box([0.92, 0], 0.3, 0.058, 0, 0.05), SDF.box([1.78, 0], 0.36, 0.05, 0, 0.045), SDF.circle([0, 0], 0.07)];
    for (const { p } of padArms) {
      const m = Math.hypot(p.c[0], p.c[1]), u = [p.c[0] / m, p.c[1] / m];
      holes.push(SDF.capsule([u[0] * 0.5, u[1] * 0.5], [u[0] * (m - 0.42), u[1] * (m - 0.42)], 0.045, 0.06));
    }
    holes.push(SDF.circle([0.42, 0.52], 0.06), SDF.circle([0.42, -0.52], 0.05));
    const holeU = SDF.union(...holes);
    const slot = SDF.box([hx + 0.34, 0], 0.4, 0.098);
    const forkF = (x, y) => {
      let f = smin(hub(x, y), lever(x, y), 0.1);
      f = smin(f, head(x, y), 0.12);
      for (const pa of padArms) { f = smin(f, pa.arm(x, y), 0.14); f = smin(f, pa.box(x, y), 0.1); }
      f = Math.max(f, -holeU(x, y));
      f = Math.max(f, -slot(x, y));
      return smax(f, -sweep(x, y), 0.03); // horns shaped round the jewel's path
    };
    const forkShapes = regionShapes(forkF, [-1.3, -2.0, hx + 0.6, 2.0], 0.008, 0.0015);
    slabTo(forkShapes, zfb[0], zfb[1], { back: 0.012, dial: 0.012 }, steelSatin, steelPolished, base);
    // pallet stones, a little taller than the lever, set in the pads
    for (const s of [stonesF.entry, stonesF.exit]) {
      slabTo([{ outer: ccw(s), holes: [] }], zf - 0.075, zf + 0.075, { back: 0.003, dial: 0.003 }, palletStone, palletStone, base);
    }
    // guard pin (dart) on the dial side of the lever, just short of the safety roller
    const tip = Lpb - 0.42 - 0.05;
    slabTo([{ outer: [[tip - 0.6, -0.045], [tip - 0.08, -0.045], [tip, 0], [tip - 0.08, 0.045], [tip - 0.6, 0.045]], holes: [] }],
      zfb[1], zfb[1] + 0.04, { back: 0.008 }, steelPolished, steelPolished, base);
    // arbor: upper pivot in the pallet bridge's jewel, lower pivot in the pillar plate's
    add(gear.arborGeometry({ r: 0.075, z0: -1.40, z1: -0.70, pivotR: 0.045, pivotLen: 0.2 }), steelPinion, base);
    add(lathe([[[0, zfb[0] - 0.05], [0.15, zfb[0] - 0.05], [0.18, zfb[0] - 0.025], [0.18, zfb[0]], [0, zfb[0]]]], 32), steelPolished, base);

    reg.add({
      id: 'pallet-fork', name: 'Pallet fork', category: 'escapement', side: 'back', exposed: false,
      object, rotor, drive: { key: 'fork' },
      explode: ex('pallet-fork'), explodeDelay: spec.explodeDelay('pallet-fork'),
      anchor: [Math.cos(gammaPB) * 1.3, Math.sin(gammaPB) * 1.3, zf],
      description: 'The rocking steel lever between the gear train and the balance. Its two ruby pallets lock and release the escape wheel in turn, and its forked end passes the wheel\'s push on to the balance\'s impulse jewel.',
      facts: {
        Pallets: '2 synthetic rubies (entry and exit)', Swing: `±${spec.timing.forkHalfDeg}° between the bankings`,
        Embraces: '2½ escape teeth', Layout: 'Straight-line Swiss lever', Material: 'Skeletonised steel (NOMOS swing system)',
      },
      live: (s) => `${(s.fork / DEG).toFixed(1)}°`,
      priority: 1,
    });
  }

  // ===================================================================== BALANCE WHEEL
  const gb = gammaPB + Math.PI; // balance-local +X points at the pallet arbor
  const [zrBack, zrDial] = Z.balanceRimRange;
  const rimO = E.balanceRadius, rimI = rimO - E.balanceRimWidth;
  const za = [zrBack + 0.004, zrBack + 0.15]; // arms flush with the rim's back face
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const base = new THREE.Group();
    base.rotation.z = gb;
    rotor.add(base);

    // rim: polished ring with softly rounded edges
    add(lathe([roundedSection(rimI, rimO, zrBack, zrDial, 0.045, 4)], 220), balanceGold, base, 'balance-rim');
    // three arms, slender at the hub and flaring like a trumpet into the rim (render)
    const hub = 0.42, rEnd = rimI + 0.12, r0 = 2.3;
    const hw = (r) => 0.13 + 0.12 * Math.exp(-(r - hub) / 0.2) + 0.55 * Math.pow(Math.max(0, (r - r0) / (rEnd - r0)), 2.3);
    const out = [];
    const s0 = Math.atan2(hw(hub), hub), hubArc = Math.hypot(hub, hw(hub));
    for (let j = 0; j < 3; j++) {
      const a = (j * TAU) / 3 + 90 * DEG, an = a + TAU / 3;
      const n = 56;
      for (let k = 0; k <= n; k++) { const r = hub + ((rEnd - hub) * k) / n; out.push(rot2([r, -hw(r)], a)); }
      for (let k = n; k >= 0; k--) { const r = hub + ((rEnd - hub) * k) / n; out.push(rot2([r, hw(r)], a)); }
      const b0 = a + s0, b1 = an - s0;
      for (let k = 1; k < 12; k++) out.push(pol(hubArc, b0 + ((b1 - b0) * k) / 12));
    }
    const bore = [];
    for (let k = 0; k < 24; k++) bore.push(pol(0.1, (-k / 24) * TAU));
    slabTo([{ outer: out, holes: [bore] }], za[0], za[1], { back: 0.02, dial: 0.01 }, balanceGoldArm, balanceGold, base);
    // poising holes drilled radially into the rim's outer face
    const holes = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + 0.11 + 0.05 * Math.sin(k * 2.7);
      const g = new THREE.CircleGeometry(0.06, 14);
      g.rotateY(Math.PI / 2);
      g.translate(rimO + 0.002, 0, (zrBack + zrDial) / 2);
      g.rotateZ(a);
      holes.push(g);
    }
    add(mergeAll(holes), holeDark, base, 'poising-holes');
    // staff: lower pivot in the lower Incabloc (dial side of the pillar plate), roller seat,
    // arm collet, hairspring collet seat, upper pivot in the bridge's Incabloc
    add(lathe([[
      [0, -2.50], [0.035, -2.50], [0.05, -2.47], [0.05, -2.31], [0.1, -2.26], [0.1, za[0] - 0.04], [0.2, za[0] - 0.02],
      [0.2, za[1] + 0.02], [0.11, za[1] + 0.02], [0.11, -0.95], [0.07, -0.90], [0.05, -0.30], [0.04, -0.13], [0, -0.11],
    ]], 28), steelPinion, base, 'balance-staff');

    reg.add({
      id: 'balance-wheel', name: 'Balance wheel', category: 'regulating', side: 'back', exposed: true,
      object, rotor, drive: { key: 'balance' },
      explode: ex('balance-wheel'), explodeDelay: spec.explodeDelay('balance-wheel'),
      anchor: [Math.cos(-100 * DEG) * rimO, Math.sin(-100 * DEG) * rimO, Z.balanceRim],
      description: 'The heart of the watch: a gold-coloured three-armed wheel that swings to and fro under the pull of the hairspring, six swings a second. Every swing releases the gear train by one step, so its steady rhythm sets the rate of the whole watch.',
      facts: {
        Diameter: `${(2 * rimO).toFixed(2)} mm`, Frequency: '3 Hz · 21,600 vibrations/h', Amplitude: `≈ ${spec.timing.amplitudeDeg}° when fully wound`,
        Arms: '3, tapered', Poising: 'Holes drilled into the rim', 'Shock protection': 'Incabloc, top and bottom',
      },
      live: (s) => `${(s.balance / DEG).toFixed(0)}° · amplitude ${(s.amplitude / DEG).toFixed(0)}°`,
      priority: 1,
    });
  }

  // ===================================================================== ROLLER
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const rotor = new THREE.Group();
    object.add(rotor);
    const base = new THREE.Group();
    base.rotation.z = gb;
    rotor.add(base);
    const zt = [Z.roller - 0.1, Z.roller - 0.055]; // impulse roller table (back side of L0)
    add(lathe([[[0.1, zt[0]], [0.88, zt[0]], [0.9, zt[0] + 0.02], [0.9, zt[1] - 0.02], [0.88, zt[1]], [0.1, zt[1]]]], 72), steelPolished, base);
    // D-shaped impulse jewel at the roller-jewel radius, flat face towards the fork
    const D = [];
    for (let k = 0; k <= 24; k++) { const a = -70 * DEG - (220 * DEG * k) / 24; D.push([rj + 0.08 * Math.cos(a), 0.08 * Math.sin(a)]); }
    slabTo([{ outer: ccw(D), holes: [] }], zt[0] + 0.01, zf + 0.04, { back: 0.006, dial: 0.006 }, impulseRuby, impulseRuby, base);
    // safety roller with the crescent that lets the guard pin pass
    const safe = [];
    for (let k = 0; k < 96; k++) {
      const a = (k / 96) * TAU;
      const da = Math.atan2(Math.sin(a), Math.cos(a));
      const r = Math.abs(da) < 0.33 ? 0.42 - 0.1 * Math.cos((da / 0.33) * (Math.PI / 2)) : 0.42;
      safe.push(pol(r, a));
    }
    const sBore = [];
    for (let k = 0; k < 24; k++) sBore.push(pol(0.1, (-k / 24) * TAU));
    slabTo([{ outer: safe, holes: [sBore] }], zf + 0.045, zf + 0.08, { back: 0.006, dial: 0.006 }, steelPolished, steelPolished, base);
    add(lathe([[[0.2, zt[0]], [0.2, zf + 0.045]]], 24), steelPolished, base);

    reg.add({
      id: 'roller', name: 'Double roller', category: 'regulating', side: 'back', exposed: false,
      object, rotor, drive: { key: 'balance' },
      explode: ex('roller'), explodeDelay: spec.explodeDelay('roller'),
      anchor: [Math.cos(gb) * rj, Math.sin(gb) * rj, Z.roller],
      description: 'Two small discs on the balance staff. The larger carries the red impulse jewel that flicks the pallet fork across and receives its push back; the smaller one, with a notch, keeps the fork from jumping over while the jewel is away.',
      facts: { 'Impulse jewel': `D-shaped ruby at r ${rj.toFixed(2)} mm`, 'Lift angle': `${spec.timing.liftDeg}° of balance swing`, 'Fork : balance': `1 : ${(spec.timing.liftDeg / 2 / spec.timing.forkHalfDeg).toFixed(1)}` },
      priority: 3,
    });
  }

  // ===================================================================== HAIRSPRING
  const HS = E.hairspring;
  const angKey = Math.atan2(E.regulatorKey[1] - pBal[1], E.regulatorKey[0] - pBal[0]);
  const angStud = Math.atan2(E.studCarrier[1] - pBal[1], E.studCarrier[0] - pBal[0]);
  const keyR = Math.hypot(E.regulatorKey[0] - pBal[0], E.regulatorKey[1] - pBal[1]);
  const studR = Math.hypot(E.studCarrier[0] - pBal[0], E.studCarrier[1] - pBal[1]);
  const rOut = HS.terminalRadius; // where the key pins and the stud hold it
  const zSpringDial = Z.hairspring + HS.height / 2;
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const zh = Z.hairspring;
    // Archimedean body + terminal curve rising to the concentric outer coil that runs
    // between the regulator pins to the stud. ψ: unwound angle from the inner end; the
    // spring winds outwards clockwise (seen from the dial).
    const dKS = (((angKey - angStud) % TAU) + TAU) % TAU; // key → stud, clockwise
    const psiK = TAU * HS.coils - dKS;
    const b = (HS.outerRadius - HS.innerRadius) / psiK;
    const dT = Math.PI * 1.05;
    const alphaI = angKey + psiK;
    const radius = (ps) => {
      if (ps >= psiK) return rOut;
      const rb = HS.innerRadius + b * ps;
      if (ps < psiK - dT) return rb;
      const t = (ps - (psiK - dT)) / dT;
      return rb + (rOut - rb) * t * t * (3 - 2 * t);
    };
    const perTurn = 110;
    const N = Math.ceil(((psiK + dKS) / TAU) * perTurn) + 1;
    const rr = new Float32Array(N), aa = new Float32Array(N), sfrac = new Float32Array(N), lens = new Float32Array(N);
    let len = 0, lenK = 0;
    for (let i = 0; i < N; i++) {
      const ps = ((psiK + dKS) * i) / (N - 1);
      rr[i] = radius(ps);
      aa[i] = alphaI - ps;
      if (i > 0) len += Math.hypot(rr[i] * Math.cos(aa[i]) - rr[i - 1] * Math.cos(aa[i - 1]), rr[i] * Math.sin(aa[i]) - rr[i - 1] * Math.sin(aa[i - 1]));
      lens[i] = len;
      if (ps <= psiK) lenK = len;
    }
    // share of the balance's rotation each point follows: 1 at the collet, 0 from the key on
    for (let i = 0; i < N; i++) sfrac[i] = lens[i] >= lenK ? 0 : 1 - lens[i] / lenK;

    const th = HS.thickness / 2, z0 = zh - HS.height / 2, z1 = zh + HS.height / 2;
    const pos = new Float32Array(N * 8 * 3), nor = new Float32Array(N * 8 * 3);
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      for (let f = 0; f < 4; f++) {
        const a = i * 8 + f * 2, c = (i + 1) * 8 + f * 2;
        idx.push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, zh), rOut + 0.3);
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(-rOut - 0.1, -rOut - 0.1, z0), new THREE.Vector3(rOut + 0.1, rOut + 0.1, z1));
    const cx = new Float32Array(N), cy = new Float32Array(N);
    for (let i = 0; i < N; i++) { // constant normals of the two flat edges
      const o = i * 24;
      nor[o + 8] = nor[o + 11] = 1;
      nor[o + 20] = nor[o + 23] = -1;
    }
    let last = NaN;
    const fill = (bal) => {
      for (let i = 0; i < N; i++) {
        const a = aa[i] + bal * sfrac[i];
        cx[i] = rr[i] * Math.cos(a);
        cy[i] = rr[i] * Math.sin(a);
      }
      for (let i = 0; i < N; i++) {
        const i0 = i > 0 ? i - 1 : i, i1 = i < N - 1 ? i + 1 : i;
        let tx = cx[i1] - cx[i0], ty = cy[i1] - cy[i0];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl; ty /= tl;
        const nx = ty, ny = -tx; // in-plane normal
        const xo = cx[i] + nx * th, yo = cy[i] + ny * th, xi = cx[i] - nx * th, yi = cy[i] - ny * th;
        const o = i * 24;
        // faces: outer side (+n), dial edge z1 (+z), inner side (−n), back edge z0 (−z)
        pos[o] = xo; pos[o + 1] = yo; pos[o + 2] = z0; pos[o + 3] = xo; pos[o + 4] = yo; pos[o + 5] = z1;
        pos[o + 6] = xo; pos[o + 7] = yo; pos[o + 8] = z1; pos[o + 9] = xi; pos[o + 10] = yi; pos[o + 11] = z1;
        pos[o + 12] = xi; pos[o + 13] = yi; pos[o + 14] = z1; pos[o + 15] = xi; pos[o + 16] = yi; pos[o + 17] = z0;
        pos[o + 18] = xi; pos[o + 19] = yi; pos[o + 20] = z0; pos[o + 21] = xo; pos[o + 22] = yo; pos[o + 23] = z0;
        nor[o] = nor[o + 3] = nx; nor[o + 1] = nor[o + 4] = ny;
        nor[o + 12] = nor[o + 15] = -nx; nor[o + 13] = nor[o + 16] = -ny;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
    };
    fill(0);
    const spring = add(geo, springBlue, object, 'hairspring-ribbon');
    spring.frustumCulled = false;
    // collet on the staff (turns with the balance), with the spring's inner end pinned in it
    const collet = new THREE.Group();
    object.add(collet);
    const cr = HS.innerRadius - 0.08;
    add(lathe([[[0.1, zh - 0.06], [cr - 0.03, zh - 0.06], [cr, zh - 0.035], [cr, zh + 0.035], [cr - 0.03, zh + 0.06], [0.1, zh + 0.06]]], 40), steelPolished, collet);
    add(new THREE.BoxGeometry(0.12, 0.07, HS.height).translate(HS.innerRadius - 0.03, 0, zh).rotateZ(alphaI), steelPolished, collet);

    const update = (s) => {
      const bal = s.rot.balance;
      collet.rotation.z = bal;
      if (bal === last) return;
      last = bal;
      fill(bal);
    };
    reg.add({
      id: 'hairspring', name: 'Hairspring (blued)', category: 'regulating', side: 'back', exposed: true,
      object, update,
      explode: ex('hairspring'), explodeDelay: spec.explodeDelay('hairspring'),
      anchor: [Math.cos(angKey - 0.6) * (rOut - 0.05), Math.sin(angKey - 0.6) * (rOut - 0.05), zh],
      description: 'A flat spiral of tempered blue steel, made in-house by NOMOS. It pulls the balance back towards its rest position after every swing; its length and stiffness set the beat. The outer coil passes between the two pins of the regulator\'s spring key and ends in the stud.',
      facts: { Type: 'Flat spiral with terminal curve', Coils: `${HS.coils}`, Colour: 'Thermally blued', Blade: `${HS.thickness} × ${HS.height} mm`, Made: 'In-house (NOMOS swing system)' },
      priority: 1,
    });
  }

  // ===================================================================== BALANCE BRIDGE
  const BB = F.balanceBridge;
  const [zbT, zbU] = Z.balanceBridge; // top (case-back side) flush with the 3/4 plate, underside on the seats
  const settingR = E.shockSettingRadius;
  const headR = F.blueScrewHeadDiameter / 2, CS_R = headR + 0.13; // polished countersink round each head
  {
    const object = new THREE.Group();
    object.name = 'balance-bridge';
    root.add(object);
    // the traced outline as a smooth machined contour, blended into the boss round the
    // staff and kept a hairline (0.035) inside the 3/4 plate's cut, which shares its pads'
    // edges
    const outline = smoothClosed(BB.outline, 6);
    const body = SDF.blend(SDF.poly(outline), SDF.circle(BB.boss.c, BB.boss.r), 0.25);
    const inCut = SDF.grow(SDF.poly(F.threeQuarterCut), -0.035);
    const bore = SDF.circle(pBal, settingR);
    const sinks = BB.screws.map((c) => SDF.circle(c, CS_R));
    const region = SDF.sub(SDF.inter(body, inCut), bore, ...sinks);
    const box = [-13.6, -12.6, -4.9, 3.3];
    const nearBore = (x, y) => Math.hypot(x - pBal[0], y - pBal[1]) < settingR + 0.02;
    const nearSink = (x, y) => BB.screws.some((c) => Math.hypot(x - c[0], y - c[1]) < CS_R + 0.02);
    const shapes = regionShapes(region, box, 0.02, 0.002);
    slabTo(shapes, zbT, zbU, { back: (x, y) => (nearBore(x, y) || nearSink(x, y) ? 0 : 0.075) }, ribbedMaterial(M), polish, object, (g) => ribbingUV(g, spec));
    // countersinks and the blued screws S3 (upper pad) and S4 (lower pad)
    const zs = zbT + 0.04, rIn = headR + 0.03, zHead = Z.screwHeads[0];
    const slotBack = [28, -14]; // slot angles seen from the back (render)
    const heads = [], floors = [], sinkGeo = [];
    BB.screws.forEach((c, i) => {
      sinkGeo.push(lathe([[[0.3, zbU], [0.3, zs]], [[0.3, zs], [rIn, zs]], [[rIn, zs], [CS_R, zbT]], [[CS_R, zbU], [0.3, zbU]]], 48, c[0], c[1]));
      const s = screwGeometry(c, headR, zHead, zs - zHead, { slotW: 0.16, slotD: 0.12, slotDeg: -slotBack[i], bev: 0.06, domeH: 0.04, shank: { r: 0.27, z: zbU + 0.25 } });
      heads.push(s.head); floors.push(s.floor);
    });
    add(mergeAll(sinkGeo), polish, object, 'bridge-countersinks');
    add(mergeAll(heads), bluedScrewMaterial(M), object, 'bridge-screws');
    const slotMat = named(M.blued.clone(), 'duw6101BluedSlot');
    slotMat.color.set(0x0a1838); slotMat.roughness = 0.5; slotMat.iridescence = 0.1;
    add(mergeAll(floors), slotMat, object, 'bridge-screw-slots');

    reg.add({
      id: 'balance-bridge', name: 'Balance bridge', category: 'regulating', side: 'back', exposed: true,
      object, xray: true,
      explode: ex('balance-bridge'), explodeDelay: spec.explodeDelay('balance-bridge'),
      anchor: [BB.screws[0][0] + 0.9, BB.screws[0][1] - 1.6, zbT],
      description: 'The NOMOS balance bridge holds the top pivot of the balance. Unlike a one-sided cock it is screwed down at both ends, which makes it stiffer and flatter; its boss carries the shock setting and the two regulator rings.',
      facts: { Type: 'Two-sided bridge (NOMOS swing system)', Screws: '2 tempered blue (one at each end)', Finish: 'Glashütte ribbing, polished bevels', Carries: 'Incabloc setting, DUW regulation rings', Material: 'Rhodium-plated brass' },
      priority: 1,
    });
  }

  // ===================================================================== REGULATOR (DUW regulation system)
  {
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    const [zR0, zR1] = Z.regulatorRings; // [−2.53, −2.45]
    const zMid = (zR0 + zR1) / 2;
    const zKey = [zMid, zR1]; // spring-key (rate) ring: lower, on the bridge boss
    const zStud = [zR0, zMid]; // stud-carrier (beat) ring: upper
    const ck = [Math.cos(angKey), Math.sin(angKey)], tk = [-ck[1], ck[0]];
    const cs = [Math.cos(angStud), Math.sin(angStud)];
    const RK = E.regulatorRings.key, RS = E.regulatorRings.stud;
    // rate ring: a narrow ring round the shock setting, mostly hidden under the stud ring;
    // its index arm runs out to a fork of two flat prongs that carry the gold key block
    const at = (r, t = 0) => [ck[0] * r + tk[0] * t, ck[1] * r + tk[1] * t];
    const keyRing = SDF.blend(SDF.ring([0, 0], RK[0], RK[1]), SDF.capsule(at(1.75), at(keyR - 0.5), 0.27, 0.21), 0.18);
    const prongs = SDF.union(SDF.capsule(at(keyR - 0.62, -0.19), at(keyR + 0.5, -0.19), 0.12, 0.13), SDF.capsule(at(keyR - 0.62, 0.19), at(keyR + 0.5, 0.19), 0.12, 0.13));
    const keyF = SDF.sub(SDF.blend(keyRing, prongs, 0.12), SDF.capsule(at(keyR - 0.42), at(keyR + 0.62), 0.07));
    // beat ring: the C-shaped ring that dominates the view (open where the bridge's upper
    // arm joins the boss), its arm ending in the squarish stud block with a window
    const gapA = 123 * DEG;
    const studRing = SDF.sub(SDF.ring([0, 0], RS[0], RS[1]), SDF.box(pol(1.83, gapA), 0.32, 0.075, gapA + Math.PI / 2, 0));
    const neck = SDF.capsule([cs[0] * 1.95, cs[1] * 1.95], [cs[0] * (studR - 0.3), cs[1] * (studR - 0.3)], 0.42, 0.36);
    const block = SDF.box([cs[0] * studR, cs[1] * studR], 0.36, 0.55, angStud, 0.13);
    const studF = SDF.sub(SDF.blend(SDF.blend(studRing, neck, 0.3), block, 0.12),
      SDF.box([cs[0] * 2.4, cs[1] * 2.4], 0.2, 0.25, angStud, 0.04));
    slabTo(regionShapes(keyF, [-3.9, -3.9, 3.9, 3.9], 0.01, 0.0015), zKey[0], zKey[1], { back: 0.008, dial: 0.004 }, steelSatin, steelPolished, object);
    slabTo(regionShapes(studF, [-3.9, -3.9, 3.9, 3.9], 0.01, 0.0015), zStud[0], zStud[1], { back: 0.01, dial: 0.004 }, steelSatin, steelPolished, object);
    // the gold spring-key block across the prongs, with its round dimpled boss
    const kc = at(keyR);
    const keyBlock = regionShapes(SDF.box(kc, 0.47, 0.29, angKey + Math.PI / 2, 0.11), [kc[0] - 0.7, kc[1] - 0.7, kc[0] + 0.7, kc[1] + 0.7], 0.006, 0.0012);
    slabTo(keyBlock, zStud[0] - 0.012, zStud[1], { back: 0.012 }, goldKey, goldKey, object);
    const zkb = zStud[0] - 0.012;
    add(lathe([[[0, zkb - 0.014], [0.06, zkb - 0.018], [0.1, zkb - 0.017], [0.125, zkb - 0.008], [0.125, zkb + 0.002]]], 32, kc[0], kc[1]), goldKey, object);
    // the two key pins straddling the outer coil, down to the hairspring
    const pinZ = [zKey[0], zSpringDial + 0.005];
    add(mergeAll([-0.058, 0.058].map((o) => cyl(0.026, pinZ[0], pinZ[1], ck[0] * (rOut + o), ck[1] * (rOut + o), 12))), steelPolished, object, 'key-pins');
    // stud: the post that clamps the spring's outer end, its head in the stud block
    const sp = [cs[0] * (rOut + 0.04), cs[1] * (rOut + 0.04)];
    const sc = [cs[0] * studR, cs[1] * studR];
    add(mergeAll([
      cyl(0.11, zStud[0], zSpringDial + 0.005, sp[0], sp[1], 20),
      lathe([[[0, zStud[0] - 0.012], [0.05, zStud[0] - 0.006], [0.1, zStud[0] - 0.022], [0.15, zStud[0] - 0.025], [0.17, zStud[0] - 0.01], [0.17, zStud[0] + 0.01]]], 32, sc[0], sc[1]),
    ]), steelPolished, object, 'stud');

    reg.add({
      id: 'regulator', name: 'DUW regulation system', category: 'regulating', side: 'back', exposed: true,
      object,
      explode: ex('regulator'), explodeDelay: spec.explodeDelay('regulator'),
      anchor: [kc[0], kc[1], zStud[0]],
      description: 'NOMOS\'s screwless fine regulation: two rings on the balance bridge. Turning the lower ring moves the gold spring key, whose two pins change the working length of the hairspring (faster or slower); the upper ring holds the spring\'s stud and is turned to put the watch in beat.',
      facts: { System: 'DUW regulation system', 'Regulating screw': 'None — set with pliers', 'Spring key': '2 pins straddling the outer coil', 'Stud carrier': 'Separate ring for the beat', Adjusted: 'In six positions (“REGULIERT IN 6 LAGEN”)' },
      priority: 2,
    });
  }

  // ===================================================================== SHOCK ABSORBERS (Incabloc)
  // The lyre spring: closed end with a tab, sides bowed in onto the cap jewel, open end
  // whose two free ends drop into the setting's notch. Local +Y = the closed end.
  const lyreHalf = [[0, 0.665], [0.55, 0.665], [0.64, 0.62], [0.61, 0.46], [0.53, 0.28], [0.485, 0.09], [0.5, -0.1], [0.575, -0.28], [0.68, -0.41], [0.65, -0.52], [0.5, -0.57], [0.34, -0.6], [0.29, -0.68], [0.29, -1.0]];
  const lyreF = (s) => (x, y) => {
    x /= s; y /= s;
    const axv = Math.abs(x);
    let f = Infinity;
    for (let i = 0; i < lyreHalf.length - 1; i++) {
      const a = lyreHalf[i], b = lyreHalf[i + 1];
      const bx = b[0] - a[0], by = b[1] - a[1], px = axv - a[0], py = y - a[1];
      const h = Math.min(1, Math.max(0, (px * bx + py * by) / (bx * bx + by * by)));
      f = Math.min(f, Math.hypot(px - bx * h, py - by * h) - 0.053);
    }
    const qx = Math.abs(x) - 0.23 + 0.06, qy = Math.abs(y - 0.92) - 0.27 + 0.06; // the tab
    const tab = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 0.06;
    return smin(f, tab, 0.05) * s;
  };
  // Incabloc setting (rhodium) with its raised satin band and two notches, the domed cap
  // jewel and the gold lyre. dir = −1: faces the case back (top setting); +1: faces the
  // dial. zFace = the outer face of the lyre wire.
  const incabloc = (parent, zFace, dir, scale, rotDeg, bandR, bodyR, zBody) => {
    const g = new THREE.Group();
    g.rotation.z = rotDeg * DEG;
    parent.add(g);
    const zIn = (d) => zFace - dir * d; // d > 0: deeper into the setting
    const zLy = [zIn(0), zIn(0.035)].sort((a, b) => a - b); // lyre wire
    const zJ = zIn(0.035); // cap-jewel face, the lyre rests on it
    const zB = [zIn(0.055), zIn(0.09)].sort((a, b) => a - b); // raised band of the setting
    const zBandIn = dir < 0 ? zB[1] : zB[0], zBandOut = dir < 0 ? zB[0] : zB[1];
    const zFloor = zIn(0.102); // floor of the setting round the cap jewel
    // body of the setting, from its floor round the cap jewel down into its seat
    const prof = [[0.6 * scale, zFloor], [0.86 * scale, zFloor], [0.86 * scale, zBandIn], [bodyR, zBandIn], [bodyR, zBody], [0.6 * scale, zBody]];
    add(lathe([dir < 0 ? prof : prof.slice().reverse()], 96), M.rhodium, g);
    const band = regionShapes((x, y) => {
      let f = Math.abs(Math.hypot(x, y) - (0.86 * scale + bandR) / 2) - (bandR - 0.86 * scale) / 2;
      f = Math.max(f, -(Math.max(Math.abs(x) - 0.3 * scale, Math.abs(y - 1.2 * scale) - 0.45 * scale)));
      return Math.max(f, -(Math.max(Math.abs(x) - 0.4 * scale, Math.abs(y + 1.2 * scale) - 0.45 * scale)));
    }, [-bandR - 0.1, -bandR - 0.1, bandR + 0.1, bandR + 0.1], 0.008, 0.0015);
    slabTo(band, zB[0], zB[1], dir < 0 ? { back: 0.012 } : { dial: 0.012 }, steelSatin, steelPolished, g);
    void zBandOut;
    // cap jewel, slightly domed, the hole jewel's olive and the pivot showing through it
    const cj = [[0, zJ + dir * 0.004], [0.12 * scale, zJ + dir * 0.003], [0.2 * scale, zJ - dir * 0.004], [0.32 * scale, zJ - dir * 0.003], [0.5 * scale, zJ - dir * 0.008], [0.58 * scale, zJ - dir * 0.022], [0.6 * scale, zJ - dir * 0.035], [0.6 * scale, zFloor], [0, zFloor]];
    add(lathe([dir < 0 ? cj : cj.slice().reverse()], 64), capJewel, g);
    const ly = regionShapes(lyreF(scale), [-0.95 * scale, -1.15 * scale, 0.95 * scale, 1.3 * scale], 0.006, 0.0012);
    slabTo(ly, zLy[0], zLy[1], dir < 0 ? { back: 0.008 } : { dial: 0.008 }, lyreGold, lyreGold, g);
    return g;
  };
  {
    // upper: in the bridge's boss. The render shows the lyre's closed end towards the
    // upper left of the staff (back view), i.e. dial-frame angle ≈ 24°.
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    incabloc(object, Z.shockTop, -1, 1, 24.5 - 90, settingR, settingR - 0.015, zbU + 0.01);
    reg.add({
      id: 'shock-absorber', name: 'Shock absorber (upper)', category: 'regulating', side: 'back', exposed: true,
      object,
      explode: ex('shock-absorber'), explodeDelay: spec.explodeDelay('shock-absorber'),
      anchor: [0, 0, Z.shockTop],
      description: 'Incabloc shock protection for the balance\'s fragile top pivot. A gold lyre spring holds the cap jewel and the jewel setting in a cone; a knock lets the setting give way and spring back instead of the pivot breaking.',
      facts: { Type: 'Incabloc (gold lyre spring)', Jewels: 'Hole jewel + cap jewel', Position: 'Upper balance pivot, in the bridge' },
      priority: 3,
    });
  }
  {
    // lower: set into the pillar plate's dial face, the lyre's open end towards 12
    // (dial-side render)
    const SL = E.shockLower;
    const object = new THREE.Group();
    object.position.set(pBal[0], pBal[1], 0);
    root.add(object);
    incabloc(object, SL.z[1], 1, SL.radius / settingR, 180, SL.radius - 0.015, SL.radius - 0.015, SL.z[0]);
    reg.add({
      id: 'shock-absorber-lower', name: 'Shock absorber (lower)', category: 'regulating', side: 'front', exposed: false,
      object,
      explode: ex('shock-absorber-lower'), explodeDelay: spec.explodeDelay('shock-absorber-lower'),
      anchor: [0, 0, SL.z[1]],
      description: 'The same Incabloc protection for the balance\'s lower pivot, set into the dial side of the pillar plate. Its gold lyre spring sits under the dial, next to the date works.',
      facts: { Type: 'Incabloc (gold lyre spring)', Jewels: 'Hole jewel + cap jewel', Position: 'Lower balance pivot, pillar plate (dial side)' },
      priority: 3,
    });
  }
}

