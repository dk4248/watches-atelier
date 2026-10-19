// ESCAPEMENT and REGULATING ORGAN of the Tudor MT5652 (builder D): 20-tooth club-tooth escape
// wheel, pallet fork, gold-coloured variable-inertia balance (four arms, four inertia screws on
// the outside of the rim, free-sprung), flat silicon hairspring, double roller, Incabloc-type
// shock setting and the traversing balance bridge (two feet, stud carrier).
//
// The Swiss lever escapement is SOLVED, not drawn: at start-up the tooth and pallet-stone
// outlines below run through a 2-D contact simulation (the wheel always pushes forward against
// whichever stone it touches while the fork travels between its bankings). That gives, for every
// fork position during a beat, the exact angle at which a stone holds the wheel — lock (with a
// hint of recoil from the draw), unlocking, impulse on the stone's face and on the tooth's club,
// drop, lock on the other stone. The kinematics' escape angle is exact at every rest (9° per
// beat = half a pitch of 20 teeth); inside the impulse window the teeth follow the solved profile
// instead, so in slow motion a stone never passes through a tooth.
//
// Geometry from SPEC.escapement / SPEC.timing / SPEC.layout / SPEC.z / SPEC.frame.balanceBridge.
// The stones embrace 3½ pitches (63°): with the escape tip radius 2.75 and the pallet 3.23 away,
// that puts both stones on the tangents from the pallet arbor to the tip circle (cos⁻¹(2.75/3.23)
// = 31.6°) — a Swiss lever can only lock both stones at (n + ½) pitches; SPEC's ±26° contact
// points (2.9 pitches) are the photo estimate of the stone bodies.
import * as THREE from 'three';
import { SD, slab, lathe, merge, mmUV, frameMaterials, screwGeometry } from './frame.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const rot2 = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const loopArea = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const ccw = (P) => (loopArea(P) < 0 ? P.slice().reverse() : P);
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ===================================================================== escapement design
// module-local design values (solved / searched for this geometry; see the report)
const EMBRACE = 3.5; // pitches between the two locking faces
const ESC = { hc: 0.10, gc: 3.0, ho: 0.03, rootF: 0.72, w: 0.22, wX: 0.16, lock: 0.07, lockX: 0.07, hImp: 0.18, hImpX: 0.22, draw: 2, drawX: 0, stoneLen: 0.75 };
const TABLE_N = 241;

// One Swiss club tooth: locking corner at angle 0 on the locking circle Rl = R − hc, the club's
// heel on the tip circle R (gc° behind); teeth lean towards +angle (the wheel turns CCW seen from
// the dial). Stem angles are scaled from a 24°-pitch design to this wheel's pitch.
function toothProfile(R, N, { hc, gc, ho, rootF }) {
  const k = 360 / N / 24;
  const Rl = R - hc, rootR = rootF * R;
  const P = (r, a) => pol(r, a * k * DEG), Pa = (r, a) => pol(r, a * DEG), hd = (mm, r) => mm / r / DEG;
  const pts = [
    P(rootR, -16.5), P(rootR + 0.05, -13.8), P(rootR + 0.12, -11.4), P(rootR + 0.21, -9.3), P(rootR + 0.33, -7.2),
    Pa(R - 0.19, -gc + hd(0.02, R)), Pa(R - 0.135, -gc - hd(ho * 0.8, R)), Pa(R - 0.06, -gc - hd(ho, R)), Pa(R - 0.012, -gc - hd(ho * 0.45, R)), Pa(R, -gc),
  ];
  for (const s of [0.25, 0.5, 0.75]) pts.push(Pa(R + (Rl - R) * s + 0.006 * Math.sin(Math.PI * s), -gc * (1 - s)));
  pts.push(Pa(Rl, 0));
  const C = Pa(Rl, 0), F = P(rootR, -6.2);
  for (const t of [0.33, 0.66, 0.9]) pts.push([C[0] + (F[0] - C[0]) * t, C[1] + (F[1] - C[1]) * t]);
  pts.push(P(rootR + 0.02, -5.5), P(rootR - 0.004, -4.0));
  return { pts, rootR, Rl, k };
}
// Pallet stones, each drawn at its own "in" banking round the resting tooth corner (E frame:
// escape centre at the origin, pallet arbor at (d, 0)); returned in pallet-local coordinates
// (E orientation) as [LC locking corner, LO let-off corner, OB, OF].
function designStones({ d, phi0, Rl, N, P }) {
  const span = EMBRACE * (TAU / N);
  const betaE = -span / 2 - P.w / 2 / Rl; // tooth corner at an even rest (entry locks)
  const betaX = betaE + span; // odd rest (exit locks)
  function stoneAt(beta, w, lock, hImp, draw) {
    const u = pol(1, beta), t = pol(1, beta + Math.PI / 2);
    const f = rot2(u, draw * DEG);
    const LC = [u[0] * Rl - f[0] * lock, u[1] * Rl - f[1] * lock];
    const LO = [LC[0] + w * t[0] - hImp * u[0], LC[1] + w * t[1] - hImp * u[1]];
    const OF = [LC[0] + P.stoneLen * f[0], LC[1] + P.stoneLen * f[1]];
    const OB = [OF[0] + w * t[0], OF[1] + w * t[1]];
    return [LC, LO, OB, OF];
  }
  const toLocal = (poly, phi) => poly.map((p) => rot2([p[0] - d, p[1]], -phi));
  return {
    betaE, betaX,
    entry: toLocal(stoneAt(betaE, P.w, P.lock, P.hImp, P.draw), -phi0),
    exit: toLocal(stoneAt(betaX, P.wX, P.lockX, P.hImpX, P.drawX), +phi0),
  };
}
// smallest CCW wheel rotation (≤ maxD) that brings a tooth into contact with a stone
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
      if (-Y * sign * dy + X * sign * -dx >= 0) continue;
      let D = (((sign * (Math.atan2(Y, X) - a0)) % TAU) + TAU) % TAU;
      if (D > TAU - 1e-7) D = 0;
      if (D < best) best = D;
    }
  };
  for (const P of tooth) for (let i = 0; i < stone.length; i++) test(P, stone[i], stone[(i + 1) % stone.length], 1);
  for (const P of stone) for (let i = 0; i < tooth.length; i++) test(P, tooth[i], tooth[(i + 1) % tooth.length], -1);
  return best;
}
// Wheel progress e(q) (0..1 of the 9° step) against fork travel q (0..1) for both kinds of beat.
// odd: fork −φ0 → +φ0 (entry unlocks and gives impulse, drop onto exit); even: +φ0 → −φ0.
function solveEscapement({ d, phi0, stones, tooth, N }) {
  const T0 = ccw(tooth);
  const S0 = [ccw(stones.entry), ccw(stones.exit)];
  const pitch = TAU / N, step = pitch / 2;
  const posed = (omega, i) => { const a = stones.betaE + omega + i * pitch; const c = Math.cos(a), s = Math.sin(a); return T0.map((p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]); };
  const near = (omega) => {
    const out = [];
    for (let i = 0; i < N; i++) {
      let a = stones.betaE + omega + i * pitch;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if ((a > -70 * DEG && a < -2 * DEG) || (a > 2 * DEG && a < 70 * DEG)) out.push(i);
    }
    return out;
  };
  const stonesAt = (phi) => S0.map((S) => S.map((p) => { const q = rot2(p, phi); return [q[0] + d, q[1]]; }));
  const overlap = (omega, S) => {
    for (const i of near(omega)) {
      const T = posed(omega, i);
      for (const s of S) {
        for (const p of T) if (pointInPoly(p[0], p[1], s)) return true;
        for (const p of s) if (pointInPoly(p[0], p[1], T)) return true;
      }
    }
    return false;
  };
  let stuck = 0;
  const table = (odd) => {
    const out = new Float32Array(TABLE_N);
    const base = odd ? 0 : step;
    let omega = base;
    for (let k = 0; k < TABLE_N; k++) {
      const q = k / (TABLE_N - 1);
      const S = stonesAt(odd ? -phi0 + 2 * phi0 * q : phi0 - 2 * phi0 * q);
      if (overlap(omega, S)) { // the stone pushes the wheel back a hair (draw / recoil)
        let lo = omega - 2 * DEG, hi = omega;
        for (let j = 0; j < 22; j++) { const m = (lo + hi) / 2; if (overlap(m, S)) hi = m; else lo = m; }
        if (overlap(lo, S)) stuck++;
        omega = lo;
      }
      let adv = base + step - omega;
      for (const i of near(omega)) { const T = posed(omega, i); for (const s of S) adv = Math.min(adv, firstContact(T, s, adv)); }
      omega += adv;
      out[k] = (omega - base) / step;
    }
    out[0] = 0;
    out[TABLE_N - 1] = 1;
    return out;
  };
  const res = { odd: table(true), even: table(false) };
  res.stuck = stuck;
  return res;
}

// ===================================================================== small geometry helpers
// Extrude THREE.Shapes between z0 and z1 with a rounded/chamfered edge; returns [caps, sides].
function extrude(shapes, z0, z1, bevel = 0.012, segs = 2, curveSegments = 24) {
  const T = z1 - z0, bt = Math.min(bevel, T * 0.3);
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: T - 2 * bt, bevelEnabled: bevel > 0, bevelThickness: bt, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: segs, curveSegments });
  geo.translate(0, 0, z0 + bt);
  const g0 = geo.index ? geo.toNonIndexed() : geo;
  const groups = g0.groups.length ? g0.groups : [{ start: 0, count: g0.attributes.position.count, materialIndex: 0 }];
  const out = [[], []];
  for (const gr of groups) out[Math.min(1, gr.materialIndex)].push(gr);
  return out.map((grs) => {
    if (!grs.length) return null;
    const part = new THREE.BufferGeometry();
    const n = grs.reduce((s, gr) => s + gr.count, 0);
    for (const [name, attr] of Object.entries(g0.attributes)) {
      const k = attr.itemSize, arr = new attr.array.constructor(n * k);
      let o = 0;
      for (const gr of grs) { arr.set(attr.array.subarray(gr.start * k, (gr.start + gr.count) * k), o); o += gr.count * k; }
      part.setAttribute(name, new THREE.BufferAttribute(arr, k));
    }
    return part;
  });
}
const V2 = (p) => new THREE.Vector2(p[0], p[1]);
const shapeOf = (pts, holes = []) => { const s = new THREE.Shape(ccw(pts).map(V2)); for (const h of holes) s.holes.push(new THREE.Path(ccw(h).reverse().map(V2))); return s; };
const circlePts = (r, n = 32, c = [0, 0]) => Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * TAU), c[1] + r * Math.sin((i / n) * TAU)]);
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
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const sdArc = (x, y, cx, cy, r, a0, a1) => {
  const a = Math.atan2(y - cy, x - cx);
  const t = (((a - a0) % TAU) + TAU) % TAU;
  if (t <= a1 - a0) return Math.abs(Math.hypot(x - cx, y - cy) - r);
  return Math.min(Math.hypot(x - cx - r * Math.cos(a0), y - cy - r * Math.sin(a0)), Math.hypot(x - cx - r * Math.cos(a1), y - cy - r * Math.sin(a1)));
};
const fnSDF = (fn, bb) => { fn.bb = bb; return fn; };

// ===================================================================== builder
export function buildEscapement(ctx) {
  const { spec, M, reg, root, gear } = ctx;
  const L = spec.layout, Z = spec.z, E = spec.escapement, F = spec.frame, TM = spec.timing;
  const FM = frameMaterials(ctx);

  // ------------------------------------------------------------- materials (one per mesh)
  const gold = M.brass.clone(); gold.color.set(E.balance.inertiaScrews.colour ?? spec.movement.finishes.balance); gold.roughness = 0.16; gold.metalness = 1;
  const goldSatin = gold.clone(); goldSatin.roughness = 0.3;
  const pink = M.ruby.clone(); pink.color.set(0xd8508c); pink.attenuationColor = new THREE.Color(0xb02a6a); pink.emissive = new THREE.Color(0x30081c);
  const redRuby = M.ruby.clone(); redRuby.color.set(0xd03a64);
  const silicon = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(E.hairspring.colour), metalness: 0.55, roughness: 0.22, iridescence: 0.55, iridescenceIOR: 1.45, iridescenceThicknessRange: [260, 420] });
  const steelS = M.steelSatin, steelP = M.steelPolished, steelPin = M.steelPinion;
  const lyreGold = gold.clone(); lyreGold.color.set(0xd9bf7a); lyreGold.roughness = 0.2;
  const add = (parent, geo, mat, name) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); if (name) m.name = name; parent.add(m); return m; };

  // ------------------------------------------------------------- frames
  const pEsc = L.escape, pPal = L.pallet, pBal = L.balance;
  const d = E.palletToEscape, Lpb = E.palletToBalance;
  const gamma = Math.atan2(pPal[1] - pEsc[1], pPal[0] - pEsc[0]); // escape → pallet (E frame +X)
  const gammaPB = Math.atan2(pBal[1] - pPal[1], pBal[0] - pPal[0]); // pallet → balance (fork +X at rot 0)
  const delta = gamma - gammaPB;
  const phi0 = TM.forkHalfDeg * DEG, liftHalf = (TM.liftDeg / 2) * DEG;
  const R = E.escapeTipRadius, rj = E.rollerJewelRadius, NT = E.escapeWheel.teeth;
  const pitch = TAU / NT, step = pitch / 2;

  // ------------------------------------------------------------- solve
  const tooth = toothProfile(R, NT, ESC);
  const stones = designStones({ d, phi0, Rl: tooth.Rl, N: NT, P: ESC });
  const esc = solveEscapement({ d, phi0, stones, tooth: tooth.pts, N: NT });
  if (esc.stuck) console.warn(`[escapement] contact solver: ${esc.stuck} unresolved steps`);
  const psi = gamma + stones.betaE; // wheel local rotation: tooth 0's corner on the entry stone at an even rest
  const stonesF = { entry: stones.entry.map((p) => rot2(p, delta)), exit: stones.exit.map((p) => rot2(p, delta)) };

  // ===================================================================== ESCAPE WHEEL
  {
    const object = new THREE.Group(); object.position.set(pEsc[0], pEsc[1], 0); root.add(object);
    const rotor = new THREE.Group(); object.add(rotor);
    const wheel = new THREE.Group(); wheel.rotation.z = psi; rotor.add(wheel);
    const outline = [];
    const a0 = -4.0 * tooth.k * DEG, a1 = pitch - 16.5 * tooth.k * DEG;
    for (let i = 0; i < NT; i++) {
      const a = i * pitch;
      for (const q of tooth.pts) outline.push(rot2(q, a));
      for (let k = 1; k <= 5; k++) { const t = k / 6; outline.push(pol(tooth.rootR - 0.012 * Math.sin(Math.PI * t), a + a0 + (a1 - a0) * t)); }
    }
    const shape = new THREE.Shape(outline.map(V2));
    shape.holes.push(...gear.spokeHoles({ count: E.escapeWheel.spokes, rimInner: tooth.rootR - 0.2, hubOuter: 0.32, spokeWidth: 0.13, phase: 0.42, steps: 16 }));
    shape.holes.push(gear.circlePath(0.085, 20));
    const [zw0, zw1] = Z.escapeWheel;
    const [caps, sides] = extrude([shape], zw0, zw1, 0.01, 1, 12);
    add(wheel, caps, steelS, 'escape-wheel-faces');
    add(wheel, sides, steelP, 'escape-wheel-edges');
    // arbor + collet (lower pivot in the main plate, upper pivot in the train bridge)
    const [pz0, pz1] = Z.pinionOf.escape;
    const zTop = Z.trainBridge[0] + 0.2, zLow = Z.mainPlate[0] + 0.15;
    add(rotor, lathe([[[0, zTop], [0.05, zTop], [0.05, zTop + 0.18], [0.085, zTop + 0.22], [0.085, pz1], [0.2, pz1], [0.24, pz1 + 0.04], [0.24, zw0 - 0.03], [0.2, zw0], [0.085, zw0],
      [0.085, zw1], [0.15, zw1], [0.15, zw1 + 0.08], [0.085, zw1 + 0.1], [0.085, zLow - 0.22], [0.05, zLow - 0.18], [0.05, zLow], [0, zLow]]], 28), steelPin, 'escape-arbor');
    // pinion, phased to mesh the fourth wheel (wheels keep local phase 0)
    const pin = add(rotor, gear.pinionGeometry({ leaves: spec.train.escape.pinion, module: spec.modules.fourth, length: pz1 - pz0 }), steelPin, 'escape-pinion');
    pin.position.z = (pz0 + pz1) / 2;
    const phiFE = Math.atan2(pEsc[1] - L.fourth[1], pEsc[0] - L.fourth[0]);
    pin.rotation.z = gear.meshPhase(phiFE, spec.train.fourth.teeth, spec.train.escape.pinion, 0);

    const tabOdd = esc.odd, tabEven = esc.even, NQ = TABLE_N - 1;
    const update = (s) => {
      const base = Math.floor(s.P), frac = s.P - base;
      if (frac <= 0) { wheel.rotation.z = psi; return; }
      const even = (base + 1) % 2 === 0; // the beat in progress
      let q = even ? (phi0 - s.fork) / (2 * phi0) : (s.fork + phi0) / (2 * phi0);
      q = Math.min(1, Math.max(0, q));
      const tab = even ? tabEven : tabOdd;
      const x = q * NQ, i = Math.min(NQ - 1, x | 0), t = x - i;
      wheel.rotation.z = psi + (tab[i] + (tab[i + 1] - tab[i]) * t - frac) * step;
    };
    object.userData.escapement = { tables: esc, psi, gamma, gammaPB, delta, stones, stonesF, tooth: tooth.pts, wheel, N: NT, design: ESC, embrace: EMBRACE };
    reg.add({
      id: 'escape-wheel', name: 'Escape wheel', category: 'escapement', side: 'back', exposed: true,
      object, rotor, drive: { key: 'escape' }, update,
      explode: spec.explode['escape-wheel'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('escape-wheel'),
      anchor: [...pol(R * 0.88, gamma + 2.6), zw0],
      description: 'Last wheel of the gear train. Its 20 club-shaped steel teeth are let through half a tooth at a time by the two pallet stones — eight times a second — and each time a tooth slides across a stone it gives the lever the small push that keeps the balance swinging.',
      facts: {
        Teeth: `${NT} Swiss club teeth`, 'Tip diameter': `${(2 * R).toFixed(2)} mm`, Spokes: `${E.escapeWheel.spokes}`,
        Pinion: `${spec.train.escape.pinion} leaves (driven by the seconds wheel)`, Step: `${(step / DEG).toFixed(0)}° per beat, 1 turn in ${(2 * NT / (TM.beatsPerHour / 3600)).toFixed(0)} s`, Material: E.escapeWheel.material,
      },
      live: (s) => `beat ${(s.beatToday ?? Math.floor(s.P)).toLocaleString('en-US')} today · ${((((s.rot.escape / DEG) % 360) + 360) % 360).toFixed(0)}°`,
      priority: 1,
    });
  }

  // ===================================================================== PALLET FORK
  const [zf0, zf1] = Z.palletFork; // −2.86 … −2.66
  const zBody = [zf0 + 0.06, zf0 + 0.16]; // lever body (−2.80 … −2.70), in the escape wheel's plane
  const zDart = [zf0, zBody[0]]; // guard dart on the case-back side, at the safety roller's level
  {
    const object = new THREE.Group(); object.position.set(pPal[0], pPal[1], 0); root.add(object);
    const rotor = new THREE.Group(); object.add(rotor);
    const base = new THREE.Group(); base.rotation.z = gammaPB; rotor.add(base);
    const pad = (st) => {
      const [LC, , OB, OF] = st;
      const fx = OF[0] - LC[0], fy = OF[1] - LC[1], fl = Math.hypot(fx, fy), f = [fx / fl, fy / fl];
      const tx = OB[0] - OF[0], ty = OB[1] - OF[1];
      const p0 = 0.3, p1 = fl + 0.05;
      return { c: [LC[0] + (f[0] * (p0 + p1)) / 2 + tx / 2, LC[1] + (f[1] * (p0 + p1)) / 2 + ty / 2], hx: (p1 - p0) / 2, hy: Math.hypot(tx, ty) / 2 + 0.07, ang: Math.atan2(f[1], f[0]), f };
    };
    const pads = [pad(stonesF.entry), pad(stonesF.exit)];
    // clearance for the impulse jewel's path outside the lift (fork on a banking)
    const Sm = [Lpb * Math.cos(phi0), Lpb * Math.sin(phi0)], Sp = [Lpb * Math.cos(phi0), -Lpb * Math.sin(phi0)];
    const amax = 330 * DEG;
    const sweep = (x, y) => Math.min(
      sdArc(x, y, Sm[0], Sm[1], rj, Math.PI + liftHalf + phi0, Math.PI + amax + phi0),
      sdArc(x, y, Sp[0], Sp[1], rj, Math.PI - amax - phi0, Math.PI - liftHalf - phi0),
    ) - 0.115;
    const hx = Lpb - 0.78; // fork head centre
    const lever = SD.capsule([0.1, 0], [hx - 0.24, 0], 0.2, 0.14), head = SD.box(hx, 0, 0.3, 0.26, 0, 0.07);
    const arms = pads.map((p) => SD.capsule([0, 0], [p.c[0] - p.f[0] * p.hx * 0.3, p.c[1] - p.f[1] * p.hx * 0.3], 0.2, 0.13));
    const padBox = pads.map((p) => SD.box(p.c[0], p.c[1], p.hx, p.hy, p.ang, 0.05));
    const lighten = SD.box(0.95, 0, 0.32, 0.055, 0, 0.05); // lightening slot in the lever
    const armSlots = pads.map((p) => { const m = Math.hypot(p.c[0], p.c[1]), u = [p.c[0] / m, p.c[1] / m]; return SD.capsule([u[0] * 0.5, u[1] * 0.5], [u[0] * (m - 0.45), u[1] * (m - 0.45)], 0.045, 0.06); });
    const forkSlot = SD.box(hx + 0.34, 0, 0.4, 0.098, 0, 0);
    const forkSDF = fnSDF((x, y) => {
      let f = Math.hypot(x, y) - 0.3;
      f = smin(f, lever(x, y), 0.1);
      f = smin(f, head(x, y), 0.12);
      for (let i = 0; i < pads.length; i++) { f = smin(f, arms[i](x, y), 0.14); f = smin(f, padBox[i](x, y), 0.1); }
      let hole = lighten(x, y);
      for (const a of armSlots) hole = Math.min(hole, a(x, y));
      hole = Math.min(hole, Math.hypot(x, y) - 0.075);
      f = Math.max(f, -hole);
      f = Math.max(f, -forkSlot(x, y)); // the fork slot
      return smax(f, -sweep(x, y), 0.03); // horns shaped round the jewel's path
    }, [-2.6, -2.6, Lpb + 0.2, 2.6]);
    const fs = slab(forkSDF, [-2.6, -2.6, hx + 0.7, 2.6], zBody[0], zBody[1], { h: 0.007, tol: 0.0012, top: 0.014, bottom: 0.014 });
    add(base, fs.caps, steelS, 'pallet-fork-faces');
    add(base, fs.walls, steelP, 'pallet-fork-edges');
    // pallet stones: taller than the lever, spanning the escape wheel's thickness
    const stoneGeos = [stonesF.entry, stonesF.exit].map((st) => extrude([shapeOf(st)], zf0 + 0.01, zf1 - 0.01, 0.006, 1, 4));
    add(base, merge(stoneGeos.flat()), pink, 'pallet-stones');
    // guard dart under the lever, just short of the safety roller
    const tip = Lpb - 0.42 - 0.05;
    const dart = new THREE.Shape([[tip - 0.6, -0.045], [tip - 0.08, -0.045], [tip, 0], [tip - 0.08, 0.045], [tip - 0.6, 0.045]].map(V2));
    add(base, merge(extrude([dart], zDart[0], zDart[1], 0.008, 1, 4)), steelP, 'guard-dart');
    // arbor: lower pivot in the main plate, upper pivot in the pallet bridge
    const zU = Z.palletBridge[0] + 0.16, zLo = Z.mainPlate[0] + 0.15;
    add(base, lathe([[[0, zU], [0.045, zU], [0.045, zU + 0.14], [0.075, zU + 0.18], [0.075, zBody[0] - 0.04], [0.17, zBody[0] - 0.02], [0.17, zBody[1] + 0.03], [0.075, zBody[1] + 0.05],
      [0.075, zLo - 0.2], [0.045, zLo - 0.16], [0.045, zLo], [0, zLo]]], 28), steelPin, 'pallet-arbor');
    reg.add({
      id: 'pallet-fork', name: 'Pallet fork', category: 'escapement', side: 'back', exposed: true,
      object, rotor, drive: { key: 'fork' },
      explode: spec.explode['pallet-fork'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('pallet-fork'),
      anchor: [...rot2([1.2, 0], gammaPB), zBody[0]],
      description: 'The steel lever that links the gear train to the balance. Its two pink ruby pallets alternately lock and release the escape wheel; its forked end passes the escape wheel\'s push on to the balance through the impulse pin, and the guard dart keeps it from flipping over while the pin is away.',
      facts: {
        Pallets: '2 synthetic rubies', Swing: `±${TM.forkHalfDeg}° between the bankings`, Embraces: `${EMBRACE} escape-wheel pitches (stones on the tangents to the tip circle)`,
        'Line of centres': `bent ${((Math.abs(delta)) / DEG).toFixed(1)}° (escape → pallet → balance)`, Material: spec.escapement.palletFork.material,
      },
      live: (s) => `${(s.fork / DEG).toFixed(1)}°`,
      priority: 1,
    });
  }

  // ===================================================================== BALANCE WHEEL
  const gb = gammaPB + Math.PI; // balance-local +X points at the pallet arbor
  const B = E.balance;
  const [zr0, zr1] = Z.balanceRim, [za0, za1] = Z.balanceArms, [zs0, zs1] = Z.inertiaScrews;
  const rimO = B.radius, rimI = B.radius - B.rimWidth;
  const ARM_ANG = [45, 135, 225, 315].map((a) => a * DEG);
  {
    const object = new THREE.Group(); object.position.set(pBal[0], pBal[1], 0); root.add(object);
    const rotor = new THREE.Group(); object.add(rotor);
    const base = new THREE.Group(); base.rotation.z = gb; rotor.add(base);
    add(base, lathe([roundedSection(rimI, rimO, zr0, zr1, 0.05, 4)], 220), gold, 'balance-rim');
    // four arms in an X on the case-back side of the rim, flaring into T-shaped junctions
    const hub = 0.42;
    const armPrims = ARM_ANG.map((a) => {
      const u = [Math.cos(a), Math.sin(a)], t = [-u[1], u[0]], c = [u[0] * (rimI + 0.06), u[1] * (rimI + 0.06)];
      return [SD.capsule([u[0] * 0.2, u[1] * 0.2], [u[0] * (rimI + 0.12), u[1] * (rimI + 0.12)], B.armWidth / 2 + 0.02, B.armWidth / 2 - 0.03),
        SD.capsule([c[0] - t[0] * 0.42, c[1] - t[1] * 0.42], [c[0] + t[0] * 0.42, c[1] + t[1] * 0.42], 0.12)];
    });
    const armsSDF = fnSDF((x, y) => {
      let f = Math.hypot(x, y) - hub;
      for (const [arm, tee] of armPrims) { f = smin(f, arm(x, y), 0.12); f = smin(f, tee(x, y), 0.18); }
      f = Math.max(f, Math.hypot(x, y) - (rimO - 0.06)); // stays inside the rim's outer face
      return Math.max(f, -(Math.hypot(x, y) - 0.1)); // staff hole
    }, [-rimO, -rimO, rimO, rimO]);
    const as = slab(armsSDF, [-rimO, -rimO, rimO, rimO], za0, za1, { h: 0.012, tol: 0.0015, top: 0.03, bottom: 0.015 });
    add(base, as.caps, goldSatin, 'balance-arms');
    add(base, as.walls, gold, 'balance-arms-edges');
    // four slotted inertia (micro-adjustment) screws on the outside of the rim at the arm ends
    const sr = (zs1 - zs0) / 2, zc = (zs0 + zs1) / 2, prot = B.inertiaScrews.protrusion;
    const heads = [], slots = [];
    for (const a of ARM_ANG) {
      const sg = screwGeometry([0, 0], sr, -prot, prot - 0.04, { slotDeg: 90, slotW: 0.06, slotD: 0.05, bev: 0.03, shankR: 0.09, shankTo: 0.12 });
      for (const g of [sg.head, sg.slot]) { g.rotateY(-Math.PI / 2); g.translate(rimO, 0, zc); g.rotateZ(a); }
      heads.push(sg.head); slots.push(sg.slot);
    }
    add(base, merge(heads), gold, 'inertia-screws');
    add(base, merge(slots), goldSatin, 'inertia-screw-slots');
    // balance staff: lower pivot in the main-plate jewel, upper pivot in the shock setting
    const zt = Z.balanceBridge[0] - 0.06, zl = Z.mainPlate[0] + 0.14;
    add(base, lathe([[[0, zt], [0.045, zt], [0.05, zt + 0.02], [0.05, Z.balanceBridge[1] - 0.25], [0.09, Z.balanceBridge[1] - 0.2], [0.09, Z.hairspring[0] - 0.03], [0.13, Z.hairspring[0] - 0.01], [0.13, za0 - 0.04],
      [0.2, za0 - 0.02], [0.2, za1 + 0.02], [0.14, za1 + 0.04], [0.14, Z.roller[0] - 0.02], [0.2, Z.roller[0]], [0.2, Z.roller[1]], [0.12, Z.roller[1] + 0.02], [0.12, zl - 0.25], [0.05, zl - 0.2], [0.05, zl], [0, zl]]], 28), steelPin, 'balance-staff');
    reg.add({
      id: 'balance-wheel', name: 'Variable-inertia balance', category: 'regulating', side: 'back', exposed: true,
      object, rotor, drive: { key: 'balance' },
      explode: spec.explode['balance-wheel'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('balance-wheel'),
      anchor: [...pol(rimO, -100 * DEG), zr0],
      description: 'The heart of the watch: a gold-coloured four-arm wheel that swings to and fro under the pull of the silicon hairspring, four full cycles a second. It is free-sprung — there is no regulator index: the rate is set by turning the four small inertia screws on the rim, which moves weight in or out.',
      facts: {
        Diameter: `${(2 * rimO).toFixed(2)} mm`, Frequency: `${TM.beatsPerHour / 7200} Hz · ${TM.beatsPerHour.toLocaleString('en-US')} vibrations/h`, Amplitude: `≈${TM.amplitudeDeg}° fully wound`,
        Arms: '4, in an X', Regulation: '4 inertia screws, free-sprung', Certification: 'COSC chronometer',
      },
      live: (s) => `${(s.balance / DEG).toFixed(0)}° · amplitude ${(s.amplitude / DEG).toFixed(0)}°`,
      priority: 1,
    });
  }

  // ===================================================================== ROLLER
  const [zro0, zro1] = Z.roller; // −2.95 … −2.60
  {
    const object = new THREE.Group(); object.position.set(pBal[0], pBal[1], 0); root.add(object);
    const rotor = new THREE.Group(); object.add(rotor);
    const base = new THREE.Group(); base.rotation.z = gb; rotor.add(base);
    const zt = [zro1 - 0.05, zro1]; // impulse roller table (dial side of the fork)
    const rT = E.rollerRadius - 0.05;
    add(base, lathe([[[0.12, zt[0]], [rT - 0.02, zt[0]], [rT, zt[0] + 0.02], [rT, zt[1] - 0.015], [rT - 0.02, zt[1]], [0.12, zt[1]]]], 72), steelP, 'impulse-roller');
    // D-shaped impulse jewel, flat face towards the fork; reaches through the fork slot
    const D = [];
    for (let k = 0; k <= 24; k++) { const a = -70 * DEG - (220 * DEG * k) / 24; D.push([rj + 0.08 * Math.cos(a), 0.08 * Math.sin(a)]); }
    add(base, merge(extrude([shapeOf(D)], zBody[0] + 0.01, zt[0], 0.006, 1, 4)), redRuby, 'impulse-pin');
    // safety roller with the crescent that lets the guard dart pass
    const sp = [];
    for (let k = 0; k <= 80; k++) {
      const a = (k / 80) * TAU, da = Math.atan2(Math.sin(a), Math.cos(a));
      let r = 0.42;
      if (Math.abs(da) < 0.33) r = 0.42 - 0.1 * Math.cos((da / 0.33) * (Math.PI / 2));
      sp.push(pol(r, a));
    }
    add(base, merge(extrude([shapeOf(sp, [circlePts(0.12, 20)])], zro0 + 0.05, zDart[1] - 0.005, 0.006, 1, 4)), steelP, 'safety-roller');
    add(base, lathe([[[0.12, zro0], [0.22, zro0], [0.22, zt[0]], [0.12, zt[0]]]], 24), steelP, 'roller-hub');
    reg.add({
      id: 'roller', name: 'Double roller', category: 'regulating', side: 'back', exposed: false,
      object, rotor, drive: { key: 'balance' },
      explode: spec.explode.roller ?? [0, 0, 0], explodeDelay: spec.explodeDelay('roller'),
      anchor: [...pol(rj, gb), zt[0]],
      description: 'Two small discs on the balance staff. The larger carries the ruby impulse pin that flicks the pallet fork across and receives its push back; the smaller one, with a notch, keeps the fork from jumping over while the pin is away.',
      facts: { 'Impulse pin': `D-shaped ruby at r ${rj.toFixed(3)} mm`, 'Lift angle': `${TM.liftDeg}° of balance swing`, 'Fork : balance': `1 : ${(TM.liftDeg / 2 / TM.forkHalfDeg).toFixed(1)}` },
      live: (s) => (s.impulse > 0 ? 'impulse' : 'free swing'),
      priority: 3,
    });
  }

  // ===================================================================== HAIRSPRING
  const HS = E.hairspring;
  const studAng = -69.5 * DEG; // stud carrier arm (measured on the 2018 render, dial frame round the balance)
  const rStud = 3.15; // where the stud holds the outer end
  {
    const object = new THREE.Group(); object.position.set(pBal[0], pBal[1], 0); root.add(object);
    const [zh0, zh1] = Z.hairspring;
    const zc = (zh0 + zh1) / 2, hh = Math.min(HS.height, zh1 - zh0) / 2;
    // flat Archimedean body (no overcoil), the last half turn opening out to the stud
    const turnsBody = HS.coils - 0.5, psiB = TAU * turnsBody, psiT = Math.PI; // body, terminal
    const b = (HS.outerRadius - HS.innerRadius) / psiB;
    const alphaI = studAng + psiB + psiT; // the spring winds outwards clockwise (seen from the dial)
    const radius = (p) => (p <= psiB ? HS.innerRadius + b * p : HS.outerRadius + (rStud - 0.05 - HS.outerRadius) * ((p - psiB) / psiT) ** 2);
    const perTurn = 110;
    const N = Math.ceil(((psiB + psiT) / TAU) * perTurn) + 1;
    const rr = new Float32Array(N), aa = new Float32Array(N), sfrac = new Float32Array(N);
    let len = 0;
    const lens = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const p = ((psiB + psiT) * i) / (N - 1);
      rr[i] = radius(p); aa[i] = alphaI - p;
      if (i > 0) len += Math.hypot(rr[i] * Math.cos(aa[i]) - rr[i - 1] * Math.cos(aa[i - 1]), rr[i] * Math.sin(aa[i]) - rr[i - 1] * Math.sin(aa[i - 1]));
      lens[i] = len;
    }
    for (let i = 0; i < N; i++) sfrac[i] = 1 - lens[i] / len; // 1 at the collet … 0 at the stud
    const th = HS.thickness / 2, z0 = zc - hh, z1 = zc + hh;
    const pos = new Float32Array(N * 8 * 3), nor = new Float32Array(N * 8 * 3);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let f = 0; f < 4; f++) { const a = i * 8 + f * 2, c = (i + 1) * 8 + f * 2; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, zc), rStud + 0.3);
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(-rStud - 0.2, -rStud - 0.2, z0), new THREE.Vector3(rStud + 0.2, rStud + 0.2, z1));
    const cx = new Float32Array(N), cy = new Float32Array(N);
    for (let i = 0; i < N; i++) { const o = i * 24; nor[o + 8] = nor[o + 11] = 1; nor[o + 20] = nor[o + 23] = -1; }
    const fill = (bal) => {
      for (let i = 0; i < N; i++) { const a = aa[i] + bal * sfrac[i]; cx[i] = rr[i] * Math.cos(a); cy[i] = rr[i] * Math.sin(a); }
      for (let i = 0; i < N; i++) {
        const i0 = i > 0 ? i - 1 : i, i1 = i < N - 1 ? i + 1 : i;
        let tx = cx[i1] - cx[i0], ty = cy[i1] - cy[i0];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const nx = ty, ny = -tx;
        const xo = cx[i] + nx * th, yo = cy[i] + ny * th, xi = cx[i] - nx * th, yi = cy[i] - ny * th;
        const o = i * 24;
        // faces: outer side (+n), z1 face (+Z), inner side (−n), z0 face (−Z); 2 vertices each
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
    const spring = add(object, geo, silicon, 'hairspring');
    spring.frustumCulled = false;
    // collet on the staff (turns with the balance)
    const collet = new THREE.Group(); object.add(collet);
    const cr = HS.innerRadius - 0.06;
    add(collet, lathe([[[0.13, zc - 0.07], [cr - 0.03, zc - 0.07], [cr, zc - 0.04], [cr, zc + 0.04], [cr - 0.03, zc + 0.07], [0.13, zc + 0.07]]], 40), steelP, 'hairspring-collet');
    let lastBal = NaN;
    const update = (s) => {
      const bal = s.rot.balance;
      collet.rotation.z = bal;
      if (bal === lastBal) return;
      lastBal = bal;
      fill(bal);
    };
    reg.add({
      id: 'hairspring', name: 'Silicon hairspring', category: 'regulating', side: 'back', exposed: true,
      object, update,
      explode: spec.explode.hairspring ?? [0, 0, 0], explodeDelay: spec.explodeDelay('hairspring'),
      anchor: [...pol(HS.outerRadius - 0.05, studAng + 1.6), zh0],
      description: 'A flat spiral of silicon that pulls the balance back towards its rest position after every swing; its stiffness sets the beat. Silicon is non-magnetic and hardly affected by temperature, so the rate stays stable. Its outer end is held by a stud under the balance bridge — there is no regulator index.',
      facts: { Material: 'Silicon (non-magnetic)', Coils: `≈${HS.coils}`, Type: 'Flat, no overcoil', Blade: `${HS.thickness} × ${HS.height} mm`, Diameter: `${(2 * HS.outerRadius).toFixed(1)} mm` },
      live: (s) => `${s.balance >= 0 ? '+' : ''}${(s.balance / DEG).toFixed(0)}° wound`,
      priority: 1,
    });
  }

  // ===================================================================== BALANCE BRIDGE
  const BB = F.balanceBridge;
  const [zb0, zb1] = Z.balanceBridge; // arch −4.80 … −4.30
  const [zfe0, zfe1] = Z.balanceBridgeFeet; // feet −4.30 … −2.00
  // SPEC-REQUEST: z.screwHeadTop.balanceBridge is −4.85, but both screws stand on the FEET
  // (r ≈ 15, under the rotor's skirt, which hangs to −4.53): heads 0.05 proud of the feet's top.
  const SCREW_TOP_BB = zfe0 - 0.05;
  {
    const object = new THREE.Group(); root.add(object);
    const bk = new Map();
    const put = (k, g) => { if (!g) return; if (!bk.has(k)) bk.set(k, []); bk.get(k).push(g); };
    const outline = SD.union(SD.poly(BB.outline), SD.circle(pBal, BB.capRadius + 0.1));
    const footC = SD.circle([0, 0], BB.footRadius);
    const holes = BB.screws.map((c) => SD.circle(c, F.screwHeadRadius + 0.03));
    const staff = SD.circle(pBal, 0.36);
    const box = [Math.min(...BB.outline.map((p) => p[0])) - 0.3, Math.min(...BB.outline.map((p) => p[1])) - 0.3, Math.max(...BB.outline.map((p) => p[0])) + 0.3, Math.max(...BB.outline.map((p) => p[1])) + 0.3];
    const onStep = (x, y) => Math.abs(Math.hypot(x, y) - BB.footRadius) < 0.02;
    const arch = slab(SD.sub(SD.inter(outline, footC), staff), box, zb0, zb1, { top: (x, y) => (onStep(x, y) || staff(x, y) < 0.03 ? 0 : 0.07), h: 0.025 });
    put('bridge', mmUV(arch.caps)); put('bevel', arch.walls);
    const feet = slab(SD.sub(outline, footC, ...holes), box, zfe0, zfe1, { top: (x, y) => (holes.some((h) => h(x, y) < 0.03) ? 0 : 0.06), h: 0.025 });
    put('bridge', mmUV(feet.caps)); put('bevel', feet.walls);
    // stud carrier on the hub (polished steel ring with its arm out to the stud)
    const su = [Math.cos(studAng), Math.sin(studAng)];
    const carrier = SD.sub(SD.union(SD.ring(pBal, 1.0, 1.42), SD.capsule([pBal[0] + su[0] * 1.2, pBal[1] + su[1] * 1.2], [pBal[0] + su[0] * rStud, pBal[1] + su[1] * rStud], 0.3, 0.24)),
      SD.circle([pBal[0] + su[0] * rStud, pBal[1] + su[1] * rStud], 0.1), SD.box(pBal[0] - su[0] * 1.2, pBal[1] - su[1] * 1.2, 0.12, 0.3, studAng));
    const cb = [pBal[0] - 3.6, pBal[1] - 3.6, pBal[0] + 3.6, pBal[1] + 3.6];
    const cs = slab(carrier, cb, zb0 - 0.06, zb0, { top: 0.018, h: 0.01, tol: 0.0012 });
    put('polished', cs.caps); put('polished', cs.walls);
    // the stud: a small post from the carrier's end down to the hairspring's outer end
    const sP = [pBal[0] + su[0] * rStud, pBal[1] + su[1] * rStud];
    put('polished', lathe([[[0, zb0 - 0.06], [0.13, zb0 - 0.06], [0.13, Z.hairspring[0] - 0.05], [0.11, Z.hairspring[0] - 0.03], [0.11, Z.hairspring[1] + 0.03], [0, Z.hairspring[1] + 0.03]]], 24, sP[0], sP[1]));
    // two polished slotted screws, one in each foot
    const sc = BB.screws.map((c, i) => screwGeometry(c, F.screwHeadRadius, SCREW_TOP_BB, 0.25, { slotDeg: i ? 35 : -15, slotW: 0.15, slotD: 0.1, bev: 0.06, shankR: 0.3, shankTo: zfe1 - 0.05 }));
    put('screw', merge(sc.map((s) => s.head))); put('slot', merge(sc.map((s) => s.slot)));
    for (const [k, list] of bk) { const m = new THREE.Mesh(merge(list), FM[k]); m.name = `balance-bridge-${k}`; object.add(m); }
    reg.add({
      id: 'balance-bridge', name: 'Traversing balance bridge', category: 'regulating', side: 'back', exposed: true, xray: true,
      object,
      explode: spec.explode['balance-bridge'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('balance-bridge'),
      anchor: [pBal[0] - 5.2, pBal[1] + 0.9, zb0],
      description: 'An arched bridge that spans the balance and is screwed down at both ends, so the balance is held from two sides — much stiffer against knocks than a one-sided cock. It carries the upper shock setting and, on its hub, the polished stud carrier that holds the hairspring\'s outer end.',
      facts: { Type: 'Traversing, two-point fixation', Screws: '2 polished steel', Finish: 'Sand-blasted, polished bevels', Carries: 'Shock setting, hairspring stud carrier' },
      priority: 1,
    });
  }

  // ===================================================================== SHOCK ABSORBER
  {
    const object = new THREE.Group(); object.position.set(pBal[0], pBal[1], 0); root.add(object);
    const ztop = Z.shockTop, zseat = zb0; // −4.95 … −4.80 above the bridge
    const rS = E.shock.settingRadius;
    // bloc: polished setting ring on the bridge with the chaton down into its hole
    const zLip = ztop + 0.035, zRec = ztop + 0.09;
    add(object, lathe([[[0.55, zLip], [rS - 0.05, zLip], [rS, zLip + 0.02], [rS, zseat], [0.34, zseat], [0.34, zb1 - 0.12], [0.12, zb1 - 0.12], [0.12, zRec], [0.55, zRec], [0.55, zLip]]], 72), steelP, 'shock-setting');
    // cap jewel, slightly domed
    const zJ = ztop + 0.03;
    add(object, lathe([[[0, zJ], [0.15, zJ + 0.004], [0.32, zJ + 0.012], [0.48, zJ + 0.026], [0.53, zJ + 0.04], [0.53, ztop + 0.09], [0, ztop + 0.09]]], 56), pink, 'cap-jewel');
    // lyre spring (gold-coloured wire): closed top with a tab, sides bowed in onto the cap jewel
    const half = [[0, 0.62], [0.5, 0.62], [0.6, 0.57], [0.57, 0.42], [0.49, 0.26], [0.45, 0.08], [0.47, -0.1], [0.54, -0.27], [0.64, -0.39], [0.6, -0.5], [0.46, -0.55], [0.31, -0.58], [0.27, -0.66], [0.27, -0.88]];
    const wires = half.slice(0, -1).map((p, i) => SD.capsule(p, half[i + 1], 0.045)), tab = SD.box(0, 0.8, 0.2, 0.22, 0, 0.05);
    const lyreF = fnSDF((x, y) => {
      const ax = Math.abs(x);
      let f = Infinity;
      for (const w of wires) f = Math.min(f, w(ax, y));
      return smin(f, tab(x, y), 0.05);
    }, [-0.8, -1.0, 0.8, 1.1]);
    const ls = slab(lyreF, [-0.85, -1.0, 0.85, 1.1], ztop, ztop + 0.03, { h: 0.006, tol: 0.001, top: 0.008 });
    const lyre = new THREE.Group(); lyre.rotation.z = studAng + Math.PI / 2; object.add(lyre);
    add(lyre, merge([ls.caps, ls.walls]), lyreGold, 'lyre-spring');
    reg.add({
      id: 'shock-absorber', name: 'Shock absorber', category: 'regulating', side: 'back', exposed: true,
      object,
      explode: spec.explode['shock-absorber'] ?? [0, 0, 0], explodeDelay: spec.explodeDelay('shock-absorber'),
      anchor: [0, 0, ztop],
      description: 'Incabloc-type shock protection for the balance\'s fine pivots. A lyre-shaped spring holds the pink cap jewel and its setting; a knock lets the setting give way and spring back instead of the pivot breaking.',
      facts: { Type: E.shock.type, Upper: 'In the balance bridge', Lower: 'In the main plate' },
      priority: 3,
    });
  }
}
