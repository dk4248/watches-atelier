// FRAME of the DUW 6101: pillar plate (perlage on both sides, raised outer ring with the
// gold "MADE IN GERMANY" and "REGULIERT IN 6 LAGEN", dial-side recesses, key slot, stem
// channel and passage, balance-bridge seats, ring-support jewels), Glashütte three-quarter
// plate (ribbed; balance cut-out, winding pocket + window, reverser window, rotor-wheel
// groove, winding-pinion slot, casing-screw notch; gold "DUW 6101 / N° …" and
// "42 RUBINE"), pallet bridge, hole jewels, tempered-blue plate screws.
// Registers: main-plate, three-quarter-plate, pallet-bridge, plate-screws, plate-engravings, jewels.
// Reads: SPEC.frame, SPEC.movement (ribbing, perlage, colours), SPEC.layout, SPEC.z,
//   SPEC.dial.feet, SPEC.explode / explodeDelay; owns parts/finish.js.
//   See research/tangente-update-147/plan.md.
//
// Every outline is a 2-D signed-distance field in the dial frame (finish.js), so the plates
// are built with real booleans; slab() puts polished anglage only where the real plate has
// it. The pillar plate is built as a stack of layers between its recess floors, so every
// pocket on either face has a true floor and true walls and nothing is double-skinned.
import * as THREE from 'three';
import {
  ribbedMaterial, ribbingUV, perlageMaterial, bluedScrewMaterial, rubyMaterial, polishMaterial,
  darkPolishMaterial, frostedMaterial, turnedMaterial, jewelHoleMaterial, engravingMaterial, radialUV,
  SDF, regionShapes, slab, flatCap, lathe, mergeAll, jewelGeometry, screwGeometry,
  convexHull, smoothOpen, arcEngraving, engravingTextures, engravingDrawText, engravingTextWidth, decalGeometry,
} from './finish.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const B = (x, y) => [-x, y]; // back-view measurement → dial frame

// ---------------------------------------------------------------- module-local measurements
// (not in SPEC; measured by builder D on the official renders — listed in the report)
// The pillar plate's low "balance well". Inside the 3/4-plate cut its floor stays at the
// plate's back face, except right of the bridge's upper pad (above back y −0.05) and in the
// corner under "GERMANY" (below the line from the lower pad's corner (8.84, −10.63) to the
// plate edge at (9.73, −12.40)), where the raised perlaged ring carries on (enhanced crops
// of the back render). Back-view polygon, intersected with the cut.
const WELL_BACK = [[13.28, -0.05], [18, -0.05], [18, -18], [10.63, -14.19], [8.84, -10.63], [2, -10.0], [2, 4.0], [13.28, 4.0]];
// Two through-windows in the pillar plate under the balance (dial-side render: the pallet
// stones and the fork show through them), r 0.88.
const WINDOWS = [{ c: [-4.75, -4.65], r: 0.88 }, { c: [-6.45, -7.25], r: 0.88 }];
// A tempered-blue screw sunk into the well floor and a small pin hole (back render, under
// the balance).
const WELL_SCREW = { c: B(5.9, -2.0), sink: 0.55, head: 0.42, depth: 0.15 };
const WELL_PIN = { c: B(4.3, -2.9), r: 0.28 };
// Pallet bridge: the render shows only its round turned boss (r 0.8) round the pallet
// jewel; the EST outline's upper-left tip would hide escape teeth that are visible there.
// Built as the boss plus an arm (hidden under the balance) to a foot with a polished
// screw, routed clear of the fork, the escape wheel, the roller and both windows.
const PALLET_BRIDGE = { bossR: 0.8, footDir: 110, footDist: 1.2, footR: 0.42, armR: 0.34 };
// Plate-screw slot angles seen from the back (render), S1, S2, S5, S6, S7.
const SLOTS_BACK = { 0: -12, 1: 18, 4: 64, 5: 35, 6: -40 };
// Gold "DUW 6101" line width on the render (outer letter extents, back x −6.74 … −1.46).
const BLOCK_LINE1_WIDTH = 5.28;

export function buildFrame(ctx) {
  const { spec, M, reg, root } = ctx;
  const planarUV = ctx.planarUV;
  const F = spec.frame, L = spec.layout, Z = spec.z, MV = spec.movement, E = spec.escapement;
  const ribUV = (g) => ribbingUV(g, spec);
  const perlBackUV = (g) => planarUV(g, MV.perlage.uvScaleBack);
  const perlDialUV = (g) => planarUV(g, MV.perlage.uvScaleDial);
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];

  const zT = Z.threeQuarterPlate[0], zU = Z.threeQuarterPlate[1]; // 3/4 plate: top (case-back side) / underside
  const zMB = Z.mainPlate[0], zMD = Z.mainPlate[1]; // pillar plate: back face / dial face
  const zRing = Z.pillarRimTop;
  const RM = F.pillarPlateRadius, R34 = F.threeQuarterPlateRadius;
  const BEV = 0.1; // polished anglage of the 3/4 plate (render ≈ 0.1)

  // ---------------------------------------------------------------- materials
  const mat = {
    ribbed: ribbedMaterial(M), bevel: polishMaterial(M), dark: darkPolishMaterial(M),
    perlBack: perlageMaterial(M, 'back'), perlDial: perlageMaterial(M, 'dial'),
    frosted: frostedMaterial(M), turned: turnedMaterial(M), ruby: rubyMaterial(M), hole: jewelHoleMaterial(M),
    blued: bluedScrewMaterial(M), steel: M.steelPolished,
    bluedSlot: (() => { const m = M.blued.clone(); m.color.set(0x0a1838); m.roughness = 0.5; m.iridescence = 0.1; m.name = 'duw6101BluedSlot'; return m; })(),
    steelSlot: (() => { const m = M.steelDark.clone(); m.color.set(0x55595f); m.roughness = 0.45; m.name = 'duw6101SteelSlot'; return m; })(),
  };

  // geometry buckets per object → one merged mesh per material
  function bucketSet() {
    const m = new Map();
    return {
      add(key, g) { if (!g) return; if (!m.has(key)) m.set(key, []); m.get(key).push(g); },
      build(parent, prefix) {
        for (const [key, list] of m) {
          const g = mergeAll(list);
          if (!g) continue;
          const mesh = new THREE.Mesh(g, mat[key]);
          mesh.name = `${prefix}-${key}`;
          parent.add(mesh);
        }
      },
    };
  }
  const put = (bk, s, capKey, wallKey, uv = (g) => g) => {
    if (s.caps) bk.add(capKey, uv(s.caps));
    if (s.walls) bk.add(wallKey, uv(s.walls));
  };
  const near = (f, tol = 0.012) => (x, y) => Math.abs(f(x, y)) < tol;
  const circlePts = (c, r, n = 72) => [...Array(n)].map((_, i) => [c[0] + r * Math.cos((i / n) * TAU), c[1] + r * Math.sin((i / n) * TAU)]);
  const boxAround = (c, r) => [c[0] - r, c[1] - r, c[0] + r, c[1] + r];
  const clockPt = (deg, r) => [r * Math.sin(deg * DEG), r * Math.cos(deg * DEG)];
  const discM = SDF.circle([0, 0], RM), disc34 = SDF.circle([0, 0], R34);
  const BOXM = [-RM - 0.05, -RM - 0.05, RM + 0.05, RM + 0.05];

  // ================================================================ objects
  const mainObj = new THREE.Group(); mainObj.name = 'main-plate'; root.add(mainObj);
  const tqpObj = new THREE.Group(); tqpObj.name = 'three-quarter-plate'; root.add(tqpObj);
  const palObj = new THREE.Group(); palObj.name = 'pallet-bridge'; root.add(palObj);
  const screwObj = new THREE.Group(); screwObj.name = 'plate-screws'; root.add(screwObj);
  const upperJewels = new THREE.Group(); upperJewels.name = 'jewels-upper'; tqpObj.add(upperJewels);
  const lowerJewels = new THREE.Group(); lowerJewels.name = 'jewels-lower'; mainObj.add(lowerJewels);
  const palJewels = new THREE.Group(); palJewels.name = 'jewels-pallet'; palObj.add(palJewels);
  const engraving = new THREE.Group(); engraving.name = 'plate-engravings'; tqpObj.add(engraving);
  const jewelBk = { upper: bucketSet(), lower: bucketSet(), pallet: bucketSet() };

  // ================================================================ shared outlines
  // The balance cut-out of the 3/4 plate: the traced polygon, its arc round the balance
  // (vertices 2 … 13) smoothed into the machined curve (the arc bulges a hair away from the
  // balance, never into the cut).
  const cutPoly = F.threeQuarterCut;
  const arcPts = smoothOpen(cutPoly.slice(2, 14), 10);
  const cutSmooth = [...cutPoly.slice(0, 2), ...arcPts, ...cutPoly.slice(14)];
  const cut = SDF.poly(cutSmooth);
  const BB = F.balanceBridge;

  // ================================================================ THREE-QUARTER PLATE
  const pocket = SDF.poly(convexHull(F.windingPocket.flatMap((q) => circlePts(q.c, q.r, 96))));
  const winWin = SDF.poly(F.windingWindow);
  const revWin = SDF.circle(F.reverserWindow.c, F.reverserWindow.r);
  const groove = SDF.ring([0, 0], F.rotorWheelGroove.rIn, F.rotorWheelGroove.rOut);
  const revPin = SDF.circle(L.reverser, 0.62);
  const S = F.windingPinionSlot;
  const slot34 = SDF.box([(S.x[0] + S.x[1]) / 2, (S.y[0] + S.y[1]) / 2], (S.x[1] - S.x[0]) / 2, (S.y[1] - S.y[0]) / 2, 0, 0.12);
  const csNotch = SDF.circle(F.casingScrew.at, F.casingScrew.notchRadius);
  const holeNotch = SDF.circle(F.pillarHoles[0].at, F.pillarHoles[0].r + 0.28); // clearance round the pillar plate's through hole (render)
  const centreHole = SDF.circle([0, 0], 0.36);
  const UJ = F.upperJewels;
  const upperJ = ['third', 'fourth', 'escape', 'barrel', 'A', 'B', 'C', 'D'].map((k) => ({ k, c: UJ[k].c, rs: UJ[k].d / 2 }));
  const sinks = upperJ.map((j) => SDF.circle(j.c, j.rs));
  const TP = F.plainPivots.T;
  const tBush = SDF.circle(TP.c, TP.d / 2 + 0.06);
  const HEAD_R = F.blueScrewHeadDiameter / 2, CS_R = HEAD_R + 0.13;
  const blue = [0, 1, 4, 5, 6].map((i) => ({ i, c: F.blueScrews[i] }));
  const csinks = blue.map((s) => SDF.circle(s.c, CS_R));
  const recess34 = SDF.union(pocket, revWin, groove);
  const plate34 = SDF.sub(disc34, cut, recess34, slot34, csNotch, holeNotch, centreHole, tBush, ...sinks, ...csinks);
  // polished anglage: full on the outer edge, the notches and the straight cut edges; the
  // arc round the balance gets the wide dark conical chamfer below instead
  const arcDist = (x, y) => {
    let d = Infinity;
    for (let i = 0; i < arcPts.length - 1; i++) {
      const a = arcPts[i], b = arcPts[i + 1], ex2 = b[0] - a[0], ey2 = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * ex2 + (y - a[1]) * ey2) / (ex2 * ex2 + ey2 * ey2)));
      d = Math.min(d, Math.hypot(x - a[0] - ex2 * t, y - a[1] - ey2 * t));
    }
    return d;
  };
  const onRecess = near(recess34), onSlot = near(slot34), onNoBevel = near(SDF.union(centreHole, tBush, ...sinks, ...csinks), 0.02);
  const bev34 = (x, y) => {
    if (onNoBevel(x, y)) return 0;
    if (onRecess(x, y)) return 0.05;
    if (onSlot(x, y)) return 0.05;
    if (Math.abs(cut(x, y)) < 0.012 && arcDist(x, y) < 0.02) return 0.02;
    return BEV;
  };
  {
    const bk = bucketSet();
    const BOX34 = [-R34 - 0.05, -R34 - 0.05, R34 + 0.05, R34 + 0.05];
    const s = slab(regionShapes(plate34, BOX34, 0.025, 0.0022), zT, zU, { back: bev34 });
    if (s.caps) bk.add('ribbed', ribUV(s.caps));
    // the walls of the winding pocket are polished but mirror the dark movement (render)
    if (s.walls) {
      const pw = near(pocket, 0.02);
      const g = s.walls, p = g.attributes.position.array;
      const dark = [], rest = [];
      for (let t = 0; t < p.length / 9; t++) {
        const o = t * 9, cx = (p[o] + p[o + 3] + p[o + 6]) / 3, cy = (p[o + 1] + p[o + 4] + p[o + 7]) / 3;
        (pw(cx, cy) ? dark : rest).push(t);
      }
      const pick = (list) => {
        if (!list.length) return null;
        const pos = new Float32Array(list.length * 9), nor = new Float32Array(list.length * 9);
        list.forEach((t, k) => { pos.set(p.subarray(t * 9, t * 9 + 9), k * 9); nor.set(g.attributes.normal.array.subarray(t * 9, t * 9 + 9), k * 9); });
        const ng = new THREE.BufferGeometry();
        ng.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        ng.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(list.length * 6), 2));
        return ng;
      };
      bk.add('dark', pick(dark));
      bk.add('bevel', pick(rest));
    }
    // recess floors: winding pocket (round the crown wheel, its window through), reverser
    // window + rotor-wheel groove (with the hole for the reverser pinion)
    const cw = F.windingPocket[0];
    const fl = slab(regionShapes(SDF.sub(pocket, winWin, slot34), [cw.c[0] - 4, cw.c[1] - 4, cw.c[0] + 4.5, cw.c[1] + 8.5], 0.02, 0.002), Z.windingPocketFloor, zU, { back: (x, y) => (near(winWin)(x, y) ? 0.03 : 0) });
    put(bk, fl, 'frosted', 'dark');
    const rv = slab(regionShapes(SDF.sub(SDF.union(revWin, groove), revPin, centreHole), [-4.2, -4.2, 4.2, 4.9], 0.015, 0.0015), Z.reverserPocketFloor, zU, { back: (x, y) => (near(revPin)(x, y) ? 0.03 : 0) });
    put(bk, rv, 'frosted', 'bevel');
    // polished jewel sinks (cone down to the jewel) and blue-screw countersinks
    const rubies = [], holes = [], tips = [];
    for (const j of upperJ) {
      const rj = j.rs * 0.74, rh = j.k === 'barrel' ? 0.1 : 0.065, zj = zT + 0.08, zjb = zj + 0.2, rb = Math.min(0.3, rj - 0.06);
      bk.add('bevel', lathe([[[rb, zU], [rb, zjb]], [[rb, zjb], [rj, zjb]], [[rj, zjb], [rj, zj]], [[rj, zj], [j.rs, zT]], [[j.rs, zU], [rb, zU]]], 48, j.c[0], j.c[1]));
      rubies.push(jewelGeometry(j.c, rj, rh, zj, 0.2, 1, 40));
      const hg = new THREE.CircleGeometry(rh * 1.02, 20); hg.rotateX(Math.PI); hg.translate(j.c[0], j.c[1], zj + 0.05); holes.push(hg);
      tips.push(lathe([[[0, zj + 0.03], [0.03, zj + 0.034], [0.042, zj + 0.05]]], 16, j.c[0], j.c[1])); // the pivot's polished end in the hole
    }
    // T's plain polished bush
    bk.add('bevel', lathe([[[0.07, zU], [0.07, zT + 0.03]], [[0.07, zT + 0.03], [TP.d / 2, zT - 0.005]], [[TP.d / 2, zT - 0.005], [TP.d / 2 + 0.06, zT]], [[TP.d / 2 + 0.06, zU], [0.07, zU]]], 32, TP.c[0], TP.c[1]));
    for (const s2 of blue) {
      const zs = zT + 0.04, rIn = HEAD_R + 0.03;
      bk.add('bevel', lathe([[[0.3, zU], [0.3, zs]], [[0.3, zs], [rIn, zs]], [[rIn, zs], [CS_R, zT]], [[CS_R, zU], [0.3, zU]]], 48, s2.c[0], s2.c[1]));
    }
    // the wide polished conical chamfer of the cut-out round the balance (dark in every
    // render): from the ribbed top edge down into the cut, never closer than 4.80 to the
    // balance staff (the balance leaves through the cut-out in the exploded view) and
    // fading out where the bridge's arms meet the plate
    {
      const n = arcPts.length, pB = L.balance;
      const cum = [0];
      for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(arcPts[i][0] - arcPts[i - 1][0], arcPts[i][1] - arcPts[i - 1][1]));
      const len = cum[n - 1];
      const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const bridgeF = SDF.poly(BB.outline);
      const top = [], bot = [];
      for (let i = 0; i < n; i++) {
        const p0 = arcPts[Math.max(0, i - 1)], p1 = arcPts[Math.min(n - 1, i + 1)];
        let nx = -(p1[1] - p0[1]), ny = p1[0] - p0[0];
        const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        if (cut(arcPts[i][0] + nx * 0.05, arcPts[i][1] + ny * 0.05) > 0) { nx = -nx; ny = -ny; } // point into the cut
        let w = Math.min(0.42, Math.hypot(arcPts[i][0] - pB[0], arcPts[i][1] - pB[1]) - 4.8);
        w *= ss(0.8, 2.0, cum[i]) * (1 - ss(len - 1.6, len - 0.6, cum[i]));
        for (let k = 0; k < 6 && w > 0.005 && bridgeF(arcPts[i][0] + nx * w, arcPts[i][1] + ny * w) < 0.05; k++) w *= 0.7;
        w = Math.max(0, w);
        top.push([arcPts[i][0], arcPts[i][1], zT]);
        bot.push([arcPts[i][0] + nx * w, arcPts[i][1] + ny * w, zU - 0.01]);
      }
      const pos = [], idx = [];
      for (let i = 0; i < n; i++) pos.push(...top[i], ...bot[i]);
      for (let i = 0; i < n - 1; i++) { const a = 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      // make sure the slope faces up (−Z) towards the case back
      const mid = 2 * (n >> 1), nz = g.attributes.normal.array[mid * 3 + 2] + g.attributes.normal.array[mid * 3 + 5];
      if (nz > 0) { idx.length = 0; for (let i = 0; i < n - 1; i++) { const a = 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); } g.setIndex(idx); g.computeVertexNormals(); }
      bk.add('dark', g);
    }
    bk.build(tqpObj, 'tqp');
    jewelBk.upper.add('ruby', mergeAll(rubies));
    jewelBk.upper.add('hole', mergeAll(holes));
    jewelBk.upper.add('steel', mergeAll(tips));
  }

  // ================================================================ PILLAR PLATE
  {
    const bk = bucketSet();
    // ---- through holes
    const KS = F.windingPinionKeySlot;
    const keySlot = SDF.box([(KS.x[0] + KS.x[1]) / 2, (KS.y[0] + KS.y[1]) / 2], (KS.x[1] - KS.x[0]) / 2, (KS.y[1] - KS.y[0]) / 2, 0, 0.15);
    const pHole = SDF.circle(F.pillarHoles[0].at, F.pillarHoles[0].r);
    const windows = WINDOWS.map((w) => SDF.circle(w.c, w.r));
    const escHole = SDF.circle(L.escape, 0.3), fourthHole = SDF.circle(L.fourth, 0.4), staffHole = SDF.circle(L.balance, 0.26);
    const pinHole = SDF.circle(WELL_PIN.c, WELL_PIN.r);
    const csThread = SDF.circle(F.casingScrew.at, 0.36);
    // lower jewels (centre, third, pallet, barrel, A, B, C): seats drilled through, filled
    // by the polished sink and the jewel
    const DR = F.dialSideRecesses;
    const rMotion = SDF.union(...DR.motion.map((q) => SDF.circle(q.c, q.r)));
    const rDate = SDF.union(...DR.date.map((q) => SDF.circle(q.c, q.r)));
    const rSet = SDF.union(...DR.setting.map((q) => SDF.circle(q.c, q.r)));
    const rKey = SDF.inter(SDF.poly(DR.keyless), SDF.circle([0, 0], 11.5));
    const lowerJ = Object.entries(F.lowerJewels).map(([k, c]) => ({ k, c, rs: k === 'center' ? 0.6 : 0.48 }));
    const seats = lowerJ.map((j) => SDF.circle(j.c, j.rs));
    const through = SDF.union(keySlot, pHole, ...windows, escHole, fourthHole, staffHole, pinHole, csThread, ...seats);
    // ---- recesses: dial side (floor z) and back side (ceiling z)
    const SL = E.shockLower;
    const fd = spec.dial.feet;
    const dialRec = [
      { f: rDate, z: Z.dateRecess },
      { f: rMotion, z: Z.motionRecess }, { f: rKey, z: Z.keylessRecess },
      { f: rSet, z: Z.settingPocket },
      { f: SDF.circle(L.balance, SL.radius + 0.05), z: SL.z[0] }, // lower Incabloc pocket
      { f: SDF.union(...fd.clockDeg.map((d) => SDF.circle(clockPt(d, fd.r), fd.radius + 0.03))), z: -fd.depth }, // dial-feet blind holes
      { f: SDF.union(...F.ringSupportJewels.map((c) => SDF.circle(c, F.ringSupportJewelDiameter / 2 + 0.02))), z: -0.30 }, // ring-support jewel seats
    ];
    const stemCh = SDF.inter(SDF.box([10.3, 0], 5.3, 0.55), discM);
    const backRec = [
      { f: stemCh, z: -0.60 },
      { f: SDF.circle(WELL_SCREW.c, WELL_SCREW.sink), z: zMB + WELL_SCREW.depth },
    ];
    const levels = [...new Set([zMB, zMD, ...dialRec.map((r) => r.z), ...backRec.map((r) => r.z)])].filter((z) => z >= zMB && z <= zMD).sort((a, b) => a - b);
    const removedAt = (za, zb) => [through, ...dialRec.filter((r) => r.z <= za + 1e-9).map((r) => r.f), ...backRec.filter((r) => r.z >= zb - 1e-9).map((r) => r.f)];
    const onOuter = near(discM, 0.012);
    const onDialFeat = near(SDF.union(keySlot, rMotion, rDate, rSet, rKey, ...windows), 0.012);
    const onShock = near(SDF.circle(L.balance, SL.radius + 0.05), 0.012);
    const onSeat = near(SDF.union(...seats), 0.02);
    const onBackFeat = near(SDF.union(stemCh, ...windows, pinHole, keySlot, SDF.circle(WELL_SCREW.c, WELL_SCREW.sink)), 0.012);
    const layers = [];
    for (let i = 0; i < levels.length - 1; i++) {
      const za = levels[i], zb = levels[i + 1];
      layers.push({ za, zb, f: SDF.sub(discM, ...removedAt(za, zb)) });
    }
    layers.forEach((Ly, i) => {
      const top = i === layers.length - 1, bottom = i === 0;
      const shapes = regionShapes(Ly.f, BOXM, 0.03, 0.0025);
      const s = slab(shapes, Ly.za, Ly.zb, {
        capBack: bottom, capDial: top,
        back: bottom ? (x, y) => (onSeat(x, y) ? 0 : onOuter(x, y) ? 0.08 : onBackFeat(x, y) ? 0.05 : 0) : 0,
        dial: top ? (x, y) => (onSeat(x, y) ? 0 : onOuter(x, y) ? 0.08 : onShock(x, y) ? 0.07 : onDialFeat(x, y) ? 0.04 : 0) : 0,
      });
      if (s.caps) bk.add(top ? 'perlDial' : 'perlBack', top ? perlDialUV(s.caps) : perlBackUV(s.caps));
      if (s.walls) bk.add('bevel', s.walls);
      // floors exposed at the top of this layer (dial recess floors) and ceilings exposed at
      // its bottom (back recesses), only round the features that start here
      if (!top) {
        const fresh = dialRec.filter((r) => Math.abs(r.z - Ly.zb) < 1e-9).map((r) => r.f);
        if (fresh.length) {
          const fr = SDF.sub(SDF.inter(SDF.union(...fresh), Ly.f), through);
          const bb = SDF.union(...fresh).bb;
          bk.add('perlDial', perlDialUV(flatCap(regionShapes(fr, [bb[0] - 0.1, bb[1] - 0.1, bb[2] + 0.1, bb[3] + 0.1], 0.02, 0.002), Ly.zb, 1)));
        }
      }
      if (!bottom) {
        const fresh = backRec.filter((r) => Math.abs(r.z - Ly.za) < 1e-9).map((r) => r.f);
        if (fresh.length) {
          const fr = SDF.sub(SDF.inter(SDF.union(...fresh), Ly.f), through);
          const bb = SDF.union(...fresh).bb;
          bk.add('frosted', flatCap(regionShapes(fr, [bb[0] - 0.1, bb[1] - 0.1, bb[2] + 0.1, bb[3] + 0.1], 0.02, 0.002), Ly.za, -1));
        }
      }
    });

    // ---- the raised ring, the bridge seats and the casing-screw pillar (top z.pillarRimTop)
    const wellF = SDF.poly(WELL_BACK.map(([x, y]) => B(x, y))); // reaches the plate edge on the balance side
    const annulus = SDF.sub(discM, disc34);
    const seatsF = SDF.union(...BB.seats.map((s2) => SDF.poly(s2)));
    const csPillar = SDF.inter(SDF.circle(F.casingScrew.at, F.casingScrew.notchRadius + 0.02), discM);
    const raised = SDF.union(SDF.sub(SDF.inter(SDF.union(annulus, SDF.poly(cutPoly)), discM), wellF), seatsF, csPillar);
    const RP = F.pillarRingPocket;
    const a0 = (90 - (360 - RP.backClockDeg[0])) * DEG, a1 = (90 - (360 - RP.backClockDeg[1])) * DEG; // back clock → dial-frame math angle
    const ringPocket = SDF.inter(SDF.ring([0, 0], RP.rIn - 0.3, RP.rOut), SDF.sector([0, 0], Math.min(a0, a1), Math.max(a0, a1)));
    const SP = F.stemPassage;
    const passage = SDF.box([(SP.x[0] + SP.x[1]) / 2, (SP.y[0] + SP.y[1]) / 2], (SP.x[1] - SP.x[0]) / 2, (SP.y[1] - SP.y[0]) / 2);
    const ringHoles = SDF.union(pHole, csThread);
    const onRingEdge = near(SDF.union(discM, wellF, ringPocket), 0.012);
    const onInner = near(disc34, 0.012);
    const ringBev = (x, y) => (onInner(x, y) ? 0 : onRingEdge(x, y) ? 0.06 : 0.04);
    put(bk, slab(regionShapes(SDF.sub(raised, ringPocket, passage, ringHoles), BOXM, 0.025, 0.0022), zRing, zMB, { back: ringBev, capDial: false }), 'perlBack', 'bevel', perlBackUV);
    put(bk, slab(regionShapes(SDF.sub(SDF.inter(raised, ringPocket), passage, ringHoles), [-15.7, 8.5, -8.5, 15.7], 0.02, 0.002), RP.floor, zMB, { back: 0.03, capDial: false }), 'perlBack', 'bevel', perlBackUV);
    put(bk, slab(regionShapes(SDF.sub(SDF.inter(raised, passage), ringHoles), [SP.x[0] - 0.2, SP.y[0] - 0.2, SP.x[1] + 0.2, SP.y[1] + 0.2], 0.015, 0.0015), zRing, SP.z[0], { back: ringBev }), 'perlBack', 'bevel', perlBackUV);

    // ---- lower jewels in the dial face (or the recess floor they sit in)
    const faceZ = (c) => {
      let z = zMD;
      for (const r of dialRec.slice(0, 4)) if (r.f(c[0], c[1]) < 0) z = Math.min(z, r.z);
      return z;
    };
    const rubies = [], holes = [];
    for (const j of lowerJ) {
      const zF = faceZ(j.c), rj = j.rs * 0.72, rh = j.k === 'center' ? 0.27 : j.k === 'barrel' ? 0.1 : 0.06;
      const zj = zF - 0.08, zjb = zj - 0.2, rb = Math.min(0.3, rj - 0.05);
      bk.add('bevel', lathe([[[j.rs, zF], [rj, zj]], [[rj, zj], [rj, zjb]], [[rj, zjb], [Math.max(rb, rh + 0.02), zjb]], [[Math.max(rb, rh + 0.02), zjb], [Math.max(rb, rh + 0.02), zMB]], [[Math.max(rb, rh + 0.02), zMB], [j.rs, zMB]]], 40, j.c[0], j.c[1]));
      rubies.push(jewelGeometry(j.c, rj, rh, zj, 0.2, -1, 36));
      const hg = new THREE.CircleGeometry(rh * 1.02, 20); hg.translate(j.c[0], j.c[1], zj - 0.05); holes.push(hg);
    }
    // ring-support rubies under the date ring (domed tops at z.ringJewelTop)
    const rr = F.ringSupportJewelDiameter / 2;
    for (const c of F.ringSupportJewels) {
      rubies.push(lathe([[[rr, -0.30], [rr, Z.ringJewelTop - 0.1]], [[rr, Z.ringJewelTop - 0.1], [rr * 0.86, Z.ringJewelTop - 0.04], [rr * 0.55, Z.ringJewelTop - 0.008], [0, Z.ringJewelTop]]], 36, c[0], c[1]));
    }
    jewelBk.lower.add('ruby', mergeAll(rubies));
    jewelBk.lower.add('hole', mergeAll(holes));
    // ---- staff hole chamfer under the lower Incabloc, the blued well screw and its sink
    const ws = screwGeometry(WELL_SCREW.c, WELL_SCREW.head, zMB + 0.03, WELL_SCREW.depth - 0.03, { slotW: 0.1, slotD: 0.07, slotDeg: 30, bev: 0.04, domeH: 0.025 });
    bk.add('blued', ws.head);
    bk.add('bluedSlot', ws.floor);
    bk.build(mainObj, 'pillar');

    // ---- gold-filled engravings on the ring, read from the back (tops inward)
    for (const key of ['madeIn', 'regulated']) {
      const G = F.engravings[key];
      const eg = arcEngraving(G.text, G.radius, G.backClockDeg[0], G.backClockDeg[1], G.tops, G.capHeight, zRing - 0.003, { px: 220, mask: (x, y) => raised(x, y) < -0.03 });
      const m = new THREE.Mesh(eg.geometry, engravingMaterial(M, eg.textures, 0xe3ac5a));
      m.name = `engraving-${key}`; m.castShadow = false; m.renderOrder = 2;
      mainObj.add(m);
    }
  }

  // ================================================================ PALLET BRIDGE
  {
    const bk = bucketSet();
    const PB = PALLET_BRIDGE, J = F.palletBridge.jewel;
    const [z0, z1] = Z.palletBridge;
    const foot = [J[0] + PB.footDist * Math.cos(PB.footDir * DEG), J[1] + PB.footDist * Math.sin(PB.footDir * DEG)];
    const boss = SDF.circle(J, PB.bossR);
    const body = SDF.blend(boss, SDF.union(SDF.capsule(J, foot, PB.armR, PB.armR + 0.03), SDF.circle(foot, PB.footR)), 0.25);
    const jHole = SDF.circle(J, 0.36), screwHole = SDF.circle(foot, 0.2);
    const box = [Math.min(J[0], foot[0]) - 1.2, Math.min(J[1], foot[1]) - 1.2, Math.max(J[0], foot[0]) + 1.2, Math.max(J[1], foot[1]) + 1.2];
    const onBossEdge = near(boss, 0.012), onOuter = near(body, 0.012);
    // the turned boss round the jewel and the perlaged arm, anglage only on the outer contour
    put(bk, slab(regionShapes(SDF.sub(body, boss, screwHole), box, 0.012, 0.0012), z0, z1, { back: (x, y) => (onOuter(x, y) && !onBossEdge(x, y) ? 0.04 : 0) }), 'perlBack', 'bevel', (g) => planarUV(g, MV.perlage.uvScaleBack));
    put(bk, slab(regionShapes(SDF.sub(boss, jHole), box, 0.012, 0.0012), z0, z1, { back: (x, y) => (Math.hypot(x - J[0], y - J[1]) > PB.bossR - 0.05 && onOuter(x, y) ? 0.04 : 0) }), 'turned', 'bevel', (g) => radialUV(g, J, PB.bossR));
    // foot post down to the pillar plate, the polished screw on top
    bk.add('bevel', lathe([[[PB.footR - 0.06, z1], [PB.footR - 0.06, zMB]], [[PB.footR - 0.06, zMB], [0.2, zMB]]], 40, foot[0], foot[1]));
    const zj = z0 + 0.06, zjb = zj + 0.16;
    bk.add('bevel', lathe([[[0.12, z1], [0.12, zjb]], [[0.12, zjb], [0.25, zjb]], [[0.25, zjb], [0.25, zj]], [[0.25, zj], [0.36, z0]], [[0.36, z1], [0.12, z1]]], 40, J[0], J[1]));
    jewelBk.pallet.add('ruby', jewelGeometry(J, 0.25, 0.045, zj, 0.16, 1, 36));
    const hg = new THREE.CircleGeometry(0.047, 16); hg.rotateX(Math.PI); hg.translate(J[0], J[1], zj + 0.04);
    jewelBk.pallet.add('hole', hg);
    const sc = screwGeometry(foot, 0.36, z0 - 0.13, 0.13, { slotW: 0.08, slotD: 0.06, slotDeg: 40, bev: 0.04, domeH: 0.02, shank: { r: 0.17, z: z1 + 0.15 } });
    bk.add('steel', sc.head);
    bk.add('steelSlot', sc.floor);
    bk.build(palObj, 'pallet-bridge');
  }

  // ================================================================ PLATE SCREWS
  {
    const bk = bucketSet();
    const zHead = Z.screwHeads[0], zs = zT + 0.04;
    for (const s2 of blue) {
      const g = screwGeometry(s2.c, HEAD_R, zHead, zs - zHead, { slotW: 0.16, slotD: 0.12, slotDeg: -(SLOTS_BACK[s2.i] ?? 0), bev: 0.06, domeH: 0.04, shank: { r: 0.27, z: zU - 0.03 } });
      bk.add('blued', g.head);
      bk.add('bluedSlot', g.floor);
    }
    bk.build(screwObj, 'plate-screws');
  }

  // ================================================================ ENGRAVINGS on the 3/4 plate
  {
    const EN = F.engravings, cap = EN.blockCapHeight, PX = 180;
    const lines = EN.block.map((l) => l.text.replace('{movementSerial}', spec.movementSerial));
    const xL = -EN.block[0].at[0]; // back-view left edge (−6.73)
    const hs = BLOCK_LINE1_WIDTH / (engravingTextWidth(lines[0]) * cap);
    const X0 = xL - 0.25, X1 = xL + 7.2, Y0 = Math.min(...EN.block.map((l) => l.at[1])) - cap / 2 - 0.3, Y1 = Math.max(...EN.block.map((l) => l.at[1])) + cap / 2 + 0.3;
    const wPx = Math.round((X1 - X0) * PX), hPx = Math.round((Y1 - Y0) * PX);
    const tex = engravingTextures(wPx, hPx, (c) => {
      lines.forEach((s2, i) => engravingDrawText(c, s2, (xL - X0) * PX, (Y1 - (EN.block[i].at[1] - cap / 2)) * PX, cap * PX, hs));
    }, { blur: 3, edge: 0.5, strength: 2.6 });
    const m1 = new THREE.Mesh(decalGeometry((u, v) => [X0 + (X1 - X0) * u, Y0 + (Y1 - Y0) * v], 1, 1, zT - 0.003), engravingMaterial(M, tex));
    m1.name = 'engraving-block'; m1.renderOrder = 2; m1.castShadow = false;
    engraving.add(m1);
    const G = EN.rubine;
    const eg = arcEngraving(G.text, G.radius, G.backClockDeg[0], G.backClockDeg[1], G.tops, G.capHeight, zT - 0.003, { px: 180 });
    const m2 = new THREE.Mesh(eg.geometry, engravingMaterial(M, eg.textures));
    m2.name = 'engraving-rubine'; m2.renderOrder = 2; m2.castShadow = false;
    engraving.add(m2);
  }

  // ================================================================ jewel meshes
  jewelBk.upper.build(upperJewels, 'jewels-upper');
  jewelBk.lower.build(lowerJewels, 'jewels-lower');
  jewelBk.pallet.build(palJewels, 'jewels-pallet');

  // ================================================================ registration
  reg.add({
    id: 'three-quarter-plate', name: 'Three-quarter plate', category: 'frame', side: 'back', exposed: true, priority: 1, xray: true,
    object: tqpObj, explode: ex('three-quarter-plate'), explodeDelay: spec.explodeDelay('three-quarter-plate'),
    anchor: [...B(-3.6, -8.6), zT],
    description: 'The Glashütte three-quarter plate: one large plate that holds the upper pivots of the barrel, the whole gear train and the automatic winding wheels, which makes the movement very rigid; only the balance has its own bridge. It is decorated with Glashütte ribbing and polished bevels and carries the gold-filled engravings.',
    facts: {
      Type: 'Glashütte ¾ plate', Finish: 'Glashütte ribbing, rhodium-plated, polished bevels', Diameter: `${(2 * R34).toFixed(2)} mm`,
      Thickness: `${(zU - zT).toFixed(2)} mm`, 'Upper jewels': '8 in polished sinks (third, fourth, escape, barrel and four automatic-train pivots)', Screws: '5 tempered blue',
    },
  });
  reg.add({
    id: 'plate-engravings', name: 'Plate engravings', category: 'frame', side: 'back', exposed: true, priority: 3,
    object: engraving, explode: ex('plate-engravings'), explodeDelay: spec.explodeDelay('plate-engravings'),
    anchor: [...B(-4.2, -5.95), zT],
    description: 'Engraved into the three-quarter plate and filled with gold: the calibre DUW 6101 (Deutsche Uhrenwerke), this movement\'s own serial number and the jewel count “42 RUBINE”. On the pillar plate\'s outer ring, also gold-filled: “MADE IN GERMANY” and “REGULIERT IN 6 LAGEN” (adjusted in six positions).',
    facts: { Caliber: 'DUW 6101', Serial: `N° ${spec.movementSerial}`, Jewels: '42 RUBINE', 'Pillar-plate ring': 'MADE IN GERMANY · REGULIERT IN 6 LAGEN', Fill: 'Gold-coloured' },
  });
  reg.add({
    id: 'main-plate', name: 'Pillar plate (main plate)', category: 'frame', side: 'both', exposed: true, priority: 2, xray: false,
    object: mainObj, explode: ex('main-plate'), explodeDelay: spec.explodeDelay('main-plate'),
    anchor: [...B(13.9, -3.0), zRing],
    description: 'The foundation of the movement. Every wheel\'s lower pivot runs in it, the date, motion and keyless works sit in recesses on its dial side, and its raised outer ring carries the balance bridge. Visible surfaces wear NOMOS perlage; the ring is engraved “MADE IN GERMANY” and “REGULIERT IN 6 LAGEN”.',
    facts: {
      Diameter: `${(2 * RM).toFixed(1)} mm (with the date ring 34.0 mm)`, Thickness: `${(zMD - zMB).toFixed(2)} mm (ring ${(zMD - zRing).toFixed(2)} mm)`,
      Finish: 'Perlage, rhodium-plated', 'Lower jewels': '7 in the plate + 5 rubies the date ring slides on', Engraving: 'MADE IN GERMANY · REGULIERT IN 6 LAGEN',
    },
  });
  reg.add({
    id: 'pallet-bridge', name: 'Pallet bridge', category: 'frame', side: 'back', exposed: true, priority: 2, xray: true,
    object: palObj, explode: ex('pallet-bridge'), explodeDelay: spec.explodeDelay('pallet-bridge'),
    anchor: [F.palletBridge.jewel[0], F.palletBridge.jewel[1] + 0.6, Z.palletBridge[0]],
    description: 'A small bridge under the balance that carries the pallet fork\'s upper pivot in its own jewel, so the escapement can be serviced without lifting the three-quarter plate. Its round boss is turned; the arm runs under the balance to a single polished screw.',
    facts: { Jewel: '1 (pallet arbor, upper)', Screw: '1 polished steel', Finish: 'Turned boss, perlaged arm, polished bevels' },
  });
  reg.add({
    id: 'plate-screws', name: 'Plate screws', category: 'screws', side: 'back', exposed: true, priority: 2,
    object: screwObj, explode: ex('plate-screws'), explodeDelay: spec.explodeDelay('plate-screws'),
    anchor: [blue[0].c[0], blue[0].c[1], Z.screwHeads[0]],
    description: 'Hold the three-quarter plate to the pillar plate. NOMOS polishes them and heats them to about 290 °C until a thin blue oxide layer forms — for colour and corrosion resistance. All seven blue screws (two of them on the balance bridge) sit on one circle.',
    facts: { 'Tempered blue': `5 on the ¾ plate + 2 on the balance bridge`, 'Head Ø': `${F.blueScrewHeadDiameter} mm`, Circle: 'r ≈ 12.2 mm', Slots: 'Single slot, polished' },
  });
  reg.add({
    id: 'jewels', name: 'Jewel bearings', category: 'jewels', side: 'back', exposed: true, priority: 2,
    object: upperJewels, explode: ex('jewels'), explodeDelay: spec.explodeDelay('jewels'),
    anchor: [UJ.B.c[0], UJ.B.c[1], zT + 0.08],
    description: 'Synthetic rubies used as nearly frictionless, wear-free bearings for the pivots; the polished cup round each hole holds a tiny drop of oil. The DUW 6101 has 42: the train and winding bearings, the balance\'s Incabloc jewels, pallet stones and impulse jewel, five rubies the date ring glides on and ten for the double-click winding wheels.',
    facts: { 'In total': '42 (“42 RUBINE”)', 'Visible from the back': '8 in the ¾ plate + 1 in the pallet bridge (+ the centre jewel in the rotor bearing)', 'Date ring': '5 support rubies', Material: 'Synthetic corundum (Al₂O₃), Mohs 9' },
  });
  for (const g of [lowerJewels, palJewels]) g.traverse((o) => { o.userData.partId = 'jewels'; });
  for (const o of [engraving, mainObj]) o.traverse((m) => { if (m.isMesh && m.name.startsWith('engraving')) m.castShadow = false; });
}
