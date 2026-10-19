// AUTOMATIC WINDING of the Tudor MT5652 (COSC): the openworked half-disc rotor on its ball
// bearing, and the bidirectional winding train — rotor gear 60 → reversing wheels A/B (30/30,
// one-way clicks) → B's pinion 8 → gilt reduction wheel 64 → its pinion 20 → ratchet 55
// (builder C's ratchet). SPEC.rotor / SPEC.autoTrain / SPEC.z (research/tudor-m79470/movement.md
// §4, §6.5; plan §3B). The material of this calibre's rotor and bearing is unpublished, so no
// material is claimed.
//
// Frames: the rotor is built in the dial frame at rot 0 (heavy sector = local −Y, hanging to
// 6 o'clock); the windows in SPEC are already in that frame. Its raised "TUDOR" is laid out
// in back-view coordinates (it reads from the back) and turned into the dial frame by a
// half-turn about Y (x → −x, z → −z: a rotation, so nothing is mirrored inside out).
// Drives: rotor + bearing outer race + rotor gear = rot.rotor; wheel A = −2·rot.rotor, wheel B
// = +2·rot.rotor (they follow every swing); B's pinion = +22·rot.ratchet and the reduction
// wheel = −2.75·rot.ratchet (one-way; they also turn when the crown winds). Every pair is
// phased with gear.meshPhase from the ratchet / rotor gear at local phase 0.

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tudorLetterRegions, regionsToShapes, polygonArea } from './glyphs.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ---- module-local cosmetics
const WEB_BEVEL = 0.04; // polished chamfer round the web's openings and edges
const TEXT_RELIEF = 0.05; // raised lettering on the web
const BAND_ROUND = 0.12; // outer top edge of the heavy band
const CAGE_RATIO = 0.42; // ball-cage speed / outer-race speed (inner race fixed)
// SPEC-REQUEST rotor.bearing races: SPEC raceRadii 1.3/2.4/3.0/3.4 cannot hold balls Ø0.45 on r 1.9 as two
// solid races; read here as inner race 1.0–1.62 (on the post), balls on 1.9, outer race 2.18–3.4 with the
// bayonet ring's edge at 3.0.
const RACE = { inner: [1.0, 1.62], outer: [2.18, 3.4], bayonet: 3.0 };
const SCREW = { head: 0.85, slot: 0.16 };
const CLICK = { r: 0.72, width: 0.09, sweepDeg: 120, thick: 0.04 }; // click springs on the reversing wheels' faces

const ccw = (pts) => (polygonArea(pts) > 0 ? pts : pts.slice().reverse());

// closed centripetal-ish Catmull-Rom through a traced polygon → smooth outline
function smoothClosed(pts, sub) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

export function buildAutomatic(ctx) {
  const { THREE, spec, M, reg, root, gear, stage } = ctx;
  const R = spec.rotor, Z = spec.z, L = spec.layout, AT = spec.autoTrain, MD = spec.modules;
  const env = stage?.scene?.environment || null;
  const ratios = AT.ratios;

  // ---- materials (one per mesh)
  const sb = M.textures?.sunburst;
  const webMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(R.finish.colourBody), metalness: 1, roughness: 0.3,
    normalMap: sb?.normalMap || null, normalScale: new THREE.Vector2(0.22, 0.22),
    anisotropy: 0.8, anisotropyMap: sb?.anisotropyMap || null, envMap: env, envMapIntensity: 1,
  });
  webMat.name = 'rotorSatin';
  const bandMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x45474b), metalness: 0.85, roughness: 0.5,
    normalMap: sb?.normalMap || null, normalScale: new THREE.Vector2(0.35, 0.35),
    anisotropy: 0.6, anisotropyMap: sb?.anisotropyMap || null, envMap: env, envMapIntensity: 0.8,
  });
  bandMat.name = 'rotorBandDark';
  const polished = M.steelPolished;
  const grooveMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.6, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  grooveMat.name = 'rotorGroove';
  const postMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(R.bearing.post.colour), metalness: 1, roughness: 0.28, envMap: env });
  postMat.name = 'rotorPostGilt';
  const ballMat = new THREE.MeshPhysicalMaterial({ color: 0x6d7177, metalness: 0.9, roughness: 0.12, envMap: env });
  ballMat.name = 'bearingBalls';
  const steelWheelMat = M.wheelRhodium;
  const giltMat = M.wheelGilt;
  const pinionMat = M.steelPinion;

  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const planarRotorUV = (geo) => ctx.planarUV(geo, 1 / (2 * R.radius), [0.5, 0.5]);

  // ExtrudeGeometry groups: 0 = lids, 1 = walls and bevels → two single-material meshes
  function splitByGroup(geo, matLids, matSides, name, parent) {
    const out = [];
    [[0, matLids, 'face'], [1, matSides, 'edge']].forEach(([gi, mat, suffix]) => {
      const groups = geo.groups.filter((g) => g.materialIndex === gi);
      if (!groups.length) return;
      const part = new THREE.BufferGeometry();
      for (const [nm, attr] of Object.entries(geo.attributes)) {
        const k = attr.itemSize;
        const n = groups.reduce((s, g) => s + g.count, 0);
        const arr = new attr.array.constructor(n * k);
        let o = 0;
        for (const g of groups) { arr.set(attr.array.subarray(g.start * k, (g.start + g.count) * k), o); o += g.count * k; }
        part.setAttribute(nm, new THREE.BufferAttribute(arr, k));
      }
      part.computeBoundingSphere();
      const mesh = shadowed(new THREE.Mesh(part, mat));
      mesh.name = `${name}-${suffix}`;
      parent.add(mesh);
      out.push(mesh);
    });
    return out;
  }

  // ================================================================ rotor
  const rotorObj = new THREE.Group();
  rotorObj.name = 'rotor';
  const rotorRot = new THREE.Group();
  rotorRot.name = 'rotor-rotor';
  rotorObj.add(rotorRot);
  root.add(rotorObj);
  const [zBack, zWebUnder] = Z.rotorWeb; // web: back face (−5.53) … underside (−5.13)
  {
    // --- web: half-annulus (heavy side y ≤ 0) from the hub to the band, minus the four kidneys
    const rIn = R.hubRadius - 0.05, rOut = R.bandInner;
    const n = 160;
    const outline = [];
    for (let i = 0; i <= n; i++) { const a = -(i / n) * Math.PI; outline.push([rOut * Math.cos(a), rOut * Math.sin(a)]); } // 0 → −180° along the outside
    for (let i = 0; i <= n / 2; i++) { const a = -Math.PI + (i / (n / 2)) * Math.PI; outline.push([rIn * Math.cos(a), rIn * Math.sin(a)]); } // back along the hub
    const shape = new THREE.Shape(ccw(outline).map(([x, y]) => new THREE.Vector2(x, y)));
    for (const w of Object.values(R.windows)) {
      const sm = smoothClosed(ccw(w), 4);
      shape.holes.push(new THREE.Path(sm.reverse().map(([x, y]) => new THREE.Vector2(x, y))));
    }
    const t = zWebUnder - zBack;
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: t - 2 * WEB_BEVEL, bevelEnabled: true, bevelThickness: WEB_BEVEL, bevelSize: WEB_BEVEL,
      bevelOffset: -WEB_BEVEL, bevelSegments: 2, curveSegments: 1,
    });
    geo.translate(0, 0, WEB_BEVEL + zBack);
    planarRotorUV(geo);
    splitByGroup(geo, webMat, polished, 'rotor-web', rotorRot);

    // --- thin dark groove at r 12.6 on the back face
    const g = new THREE.RingGeometry(R.grooveRadius - R.grooveWidth / 2, R.grooveRadius + R.grooveWidth / 2, 160, 1, Math.PI, Math.PI);
    g.rotateY(Math.PI); // face −Z (towards the back); x → −x keeps it on the heavy half
    g.translate(0, 0, zBack - 0.001);
    const groove = new THREE.Mesh(g, grooveMat);
    groove.name = 'rotor-groove';
    groove.receiveShadow = true;
    rotorRot.add(groove);

    // --- heavy band 13.8–15.8: back face 0.07 proud of the web; over the flange (r ≥ skirtInner)
    // it hangs towards the movement (z.rotorSkirt). Swept over the half-disc, closed at both ends.
    const [zb0] = Z.rotor; // −5.60 back face
    const zSkirt = Z.rotorSkirt[1];
    const prof = [
      [R.bandInner, zWebUnder], [R.bandInner, zb0 + 0.02], [R.bandInner + 0.02, zb0],
      [R.radius - BAND_ROUND, zb0],
    ];
    for (let i = 1; i <= 5; i++) { const a = -Math.PI / 2 + (i / 5) * (Math.PI / 2); prof.push([R.radius - BAND_ROUND + BAND_ROUND * Math.cos(a), zb0 + BAND_ROUND + BAND_ROUND * Math.sin(a)]); }
    prof.push([R.radius, zSkirt - 0.03], [R.radius - 0.03, zSkirt], [R.skirtInner, zSkirt], [R.skirtInner, zWebUnder], [R.bandInner, zWebUnder]);
    // LatheGeometry revolves (r, h) about Y; after rotateX(π/2) a vertex lands at angle φ − 90°:
    // φ 270°…450° covers the heavy half (y ≤ 0)
    const lathe = new THREE.LatheGeometry(prof.map(([r, zz]) => new THREE.Vector2(r, zz)), 160, 1.5 * Math.PI, Math.PI);
    lathe.rotateX(Math.PI / 2);
    // end caps in the plane y = 0 at x > 0 and x < 0 (facing +Y, the straight edge)
    const capShape = new THREE.Shape(ccw(prof.slice(0, -1)).map(([r, zz]) => new THREE.Vector2(r, zz)));
    const caps = [1, -1].map((sx) => {
      const c = new THREE.ShapeGeometry(capShape);
      const p = c.attributes.position;
      for (let i = 0; i < p.count; i++) { const r = p.getX(i), zz = p.getY(i); p.setXYZ(i, sx * r, 0, zz); }
      if (sx > 0) { const idx = c.index.array; for (let i = 0; i < idx.length; i += 3) { const tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp; } }
      c.computeVertexNormals();
      return c;
    });
    const bandGeo = mergeGeometries([lathe.toNonIndexed(), ...caps.map((c) => c.toNonIndexed())].map((gg) => { gg.deleteAttribute('uv'); return gg; }));
    bandGeo.computeVertexNormals();
    planarRotorUV(bandGeo);
    const band = shadowed(new THREE.Mesh(bandGeo, bandMat));
    band.name = 'rotor-band';
    rotorRot.add(band);

    // --- hub boss: full ring round the bearing, its back face with the bayonet step
    const [zh0, zh1] = Z.rotorHub;
    const hp = [[R.hubRadius, zh1], [R.hubRadius, zh0 + 0.05], [R.hubRadius - 0.05, zh0], [RACE.outer[1] + 0.05, zh0],
      [RACE.outer[1] + 0.005, zh0 + 0.04], [RACE.outer[1] + 0.005, zh1], [R.hubRadius, zh1]];
    const hub = new THREE.LatheGeometry(hp.map(([r, zz]) => new THREE.Vector2(r, zz)), 96);
    hub.rotateX(Math.PI / 2);
    hub.deleteAttribute('uv');
    planarRotorUV(hub);
    const hubM = shadowed(new THREE.Mesh(hub, webMat));
    hubM.name = 'rotor-hub';
    rotorRot.add(hubM);

    // --- raised, polished "TUDOR" on the web, centred on the heavy axis, tops towards the hub,
    // reading from the back. Laid out in back-view coordinates, then turned about Y.
    const T = R.text;
    const cap = T.capHeight;
    const letters = tudorLetterRegions(cap);
    const span = (T.spanDeg ?? 44) * DEG * T.radius; // arc length at the text's centre line
    const first = letters[0], last = letters[letters.length - 1];
    const w0 = first.x1 - first.x0, w1 = last.x1 - last.x0;
    const k = (span - (w0 + w1) / 2) / (last.xc - first.xc); // letter spacing on the rotor (wider than the dial's)
    const rBase = T.radius + cap / 2; // baselines on the outside, tops towards the hub
    const geos = [];
    for (const L1 of letters) {
      const phi = -Math.PI / 2 + (L1.xc * k) / T.radius; // back-view angle (heavy axis down)
      const cx = rBase * Math.cos(phi), cy = rBase * Math.sin(phi);
      const ux = -Math.cos(phi), uy = -Math.sin(phi); // glyph up = towards the hub
      const tx = -Math.sin(phi), ty = Math.cos(phi); // reading direction (CCW tangent)
      const regs = L1.regions.map((r) => ({
        outer: r.outer.map(([x, y]) => [cx + x * tx + y * ux, cy + x * ty + y * uy]),
        holes: r.holes.map((h) => h.map(([x, y]) => [cx + x * tx + y * ux, cy + x * ty + y * uy])),
      }));
      for (const s of regionsToShapes(THREE, regs)) {
        const gg = new THREE.ExtrudeGeometry(s, { depth: TEXT_RELIEF, bevelEnabled: false, curveSegments: 1 });
        gg.deleteAttribute('uv');
        geos.push(gg);
      }
    }
    const textGeo = mergeGeometries(geos);
    textGeo.rotateY(Math.PI); // back view → dial frame (x → −x), relief towards the back (z → −z)
    textGeo.translate(0, 0, zBack + 0.002);
    const text = shadowed(new THREE.Mesh(textGeo, polished));
    text.name = 'rotor-text';
    rotorRot.add(text);
  }

  // ================================================================ rotor bearing (+ post, rotor gear)
  const bearingObj = new THREE.Group();
  bearingObj.name = 'rotor-bearing';
  const bearingRot = new THREE.Group(); // outer race + rotor gear: turn with the rotor
  bearingRot.name = 'rotor-bearing-outer';
  const cage = new THREE.Group(); // balls: about 0.42 of the rotor's angle
  cage.name = 'rotor-bearing-balls';
  bearingObj.add(bearingRot, cage);
  root.add(bearingObj);
  const [zbr0, zbr1] = Z.rotorBearing; // −5.58 … −4.42
  const [zw0, zw1] = Z.autoWheels; // rotor gear plane −4.62 … −4.46
  const lathe = (prof, segs) => {
    const g = new THREE.LatheGeometry(prof.map(([r, zz]) => new THREE.Vector2(r, zz)), segs);
    g.rotateX(Math.PI / 2);
    return g;
  };
  {
    // fixed: gilt post on the train bridge, inner race, central screw
    const zPostFoot = Z.trainBridge[0];
    const post = shadowed(new THREE.Mesh(lathe([[0.0001, zPostFoot], [R.bearing.post.radius, zPostFoot], [R.bearing.post.radius, zbr0 + 0.12], [0.0001, zbr0 + 0.12]], 48), postMat));
    post.name = 'rotor-post';
    const [ri0, ri1] = RACE.inner;
    const innerRace = lathe([[ri1, zw0 - 0.04], [ri1, zbr0 + 0.05], [ri1 - 0.04, zbr0 + 0.01], [ri0 + 0.03, zbr0 + 0.01], [ri0, zbr0 + 0.04], [ri0, zw0 - 0.04], [ri1, zw0 - 0.04]], 64);
    const screw = lathe([[0.0001, zbr0 + 0.12], [SCREW.head, zbr0 + 0.12], [SCREW.head, zbr0 + 0.04], [SCREW.head - 0.06, zbr0], [0.0001, zbr0]], 48);
    // slot across the head
    const slot = new THREE.BoxGeometry(SCREW.head * 2.02, SCREW.slot, 0.05);
    slot.translate(0, 0, zbr0 + 0.02);
    const fixedSteel = shadowed(new THREE.Mesh(mergeGeometries([innerRace.toNonIndexed(), screw.toNonIndexed()].map((g) => { g.deleteAttribute('uv'); return g; })), polished));
    fixedSteel.name = 'rotor-bearing-inner';
    const slotM = new THREE.Mesh(slot, grooveMat);
    slotM.name = 'rotor-screw-slot';
    slotM.rotation.z = 0.6;
    bearingObj.add(post, fixedSteel, slotM);

    // turning: outer race (with the bayonet ring edge at 3.0) and the 60-tooth rotor gear under the hub
    const [ro0, ro1] = RACE.outer;
    const b = RACE.bayonet; // the bayonet ring's edge shows as a fine groove in the race's face
    const outerRace = lathe([[ro1, zw0], [ro1, zbr0 + 0.03], [ro1 - 0.03, zbr0], [b + 0.04, zbr0], [b, zbr0 + 0.025], [b - 0.04, zbr0],
      [ro0 + 0.03, zbr0], [ro0, zbr0 + 0.03], [ro0, zw0], [ro1, zw0]], 72);
    const om = shadowed(new THREE.Mesh(outerRace, polished));
    om.name = 'rotor-bearing-outer-race';
    const gearGeo = gear.wheelGeometry({ teeth: AT.rotorGear.teeth, module: MD.autoA, thickness: zw1 - zw0, spokes: 0, bore: ro0 });
    const gm = shadowed(new THREE.Mesh(gearGeo, pinionMat));
    gm.name = 'rotor-gear';
    gm.position.z = (zw0 + zw1) / 2;
    bearingRot.add(om, gm);

    // balls in their cage
    const n = R.bearing.balls;
    const sph = new THREE.SphereGeometry(R.bearing.ballRadius, 16, 12);
    const balls = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const b = sph.clone();
      b.translate(R.bearing.ballCircle * Math.cos(a), R.bearing.ballCircle * Math.sin(a), (zbr0 + zw0) / 2 - 0.25);
      balls.push(b);
    }
    const bm = shadowed(new THREE.Mesh(mergeGeometries(balls), ballMat));
    bm.name = 'rotor-bearing-ball';
    cage.add(bm);
  }

  // ================================================================ reversing wheels A, B (+ B's pinion)
  const revObj = new THREE.Group();
  revObj.name = 'reversing-wheels';
  root.add(revObj);
  const mk = (pos) => { const g = new THREE.Group(); g.position.set(pos[0], pos[1], 0); revObj.add(g); return g; };
  const wheelA = mk(L.reverserA), wheelB = mk(L.reverserB), pinB = mk(L.reverserB);
  const phiA = Math.atan2(L.reverserA[1], L.reverserA[0]); // rotor gear (centre) → A
  const phaseA = gear.meshPhase(phiA, AT.rotorGear.teeth, AT.reverserA.teeth, 0);
  const phiAB = Math.atan2(L.reverserB[1] - L.reverserA[1], L.reverserB[0] - L.reverserA[0]);
  const phaseB = gear.meshPhase(phiAB, AT.reverserA.teeth, AT.reverserB.teeth, phaseA);
  // ratchet (builder C, at the barrel arbor, phase 0) → reduction pinion → reduction wheel → B's pinion
  const phiRR = Math.atan2(L.reductionWheel[1] - L.barrel[1], L.reductionWheel[0] - L.barrel[0]);
  const phaseRed = gear.meshPhase(phiRR, spec.keyless.ratchet.teeth, AT.reductionWheel.pinion, 0);
  const phiRB = Math.atan2(L.reverserB[1] - L.reductionWheel[1], L.reverserB[0] - L.reductionWheel[0]);
  const phaseBp = gear.meshPhase(phiRB, AT.reductionWheel.teeth, AT.reverserB.pinion, phaseRed);
  {
    const t = zw1 - zw0, zc = (zw0 + zw1) / 2;
    const wheelGeo = gear.wheelGeometry({ teeth: AT.reverserA.teeth, module: MD.autoA, thickness: t, spokes: 5, bore: 0.1 });
    // click springs on the back face of each reversing wheel (the one-way clutch made visible)
    const clickGeo = (() => {
      const pts = [];
      const a0 = 0, a1 = CLICK.sweepDeg * DEG, nS = 16;
      for (let i = 0; i <= nS; i++) { const a = a0 + ((a1 - a0) * i) / nS; pts.push(new THREE.Vector2((CLICK.r + CLICK.width / 2) * Math.cos(a), (CLICK.r + CLICK.width / 2) * Math.sin(a))); }
      pts.push(new THREE.Vector2((CLICK.r + 0.12) * Math.cos(a1 + 0.12), (CLICK.r + 0.12) * Math.sin(a1 + 0.12))); // pawl tip
      for (let i = nS; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / nS; pts.push(new THREE.Vector2((CLICK.r - CLICK.width / 2) * Math.cos(a), (CLICK.r - CLICK.width / 2) * Math.sin(a))); }
      const one = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: CLICK.thick, bevelEnabled: false });
      one.deleteAttribute('uv');
      const two = one.clone();
      two.rotateZ(Math.PI);
      const g = mergeGeometries([one, two]);
      g.translate(0, 0, zw0 - CLICK.thick);
      return g;
    })();
    for (const [grp, name] of [[wheelA, 'reversing-wheel-a'], [wheelB, 'reversing-wheel-b']]) {
      const w = shadowed(new THREE.Mesh(wheelGeo, steelWheelMat));
      w.name = name;
      w.position.z = zc;
      const c = shadowed(new THREE.Mesh(clickGeo, polished));
      c.name = `${name}-clicks`;
      const arb = shadowed(new THREE.Mesh(gear.arborGeometry({ r: 0.12, z0: Z.automaticBridgeSink, z1: grp === wheelB ? Z.reverserBPinion[1] + 0.05 : zw1 + 0.04, pivotLen: 0.06 }), pinionMat));
      arb.name = `${name}-arbor`;
      grp.add(w, c, arb);
    }
    const pg = gear.pinionGeometry({ leaves: AT.reverserB.pinion, module: MD.autoB, length: Z.reverserBPinion[1] - Z.reverserBPinion[0] });
    const pm = shadowed(new THREE.Mesh(pg, pinionMat));
    pm.name = 'reversing-wheel-b-pinion';
    pm.position.z = (Z.reverserBPinion[0] + Z.reverserBPinion[1]) / 2;
    pinB.add(pm);
  }

  // ================================================================ winding train: reduction wheel 64 + pinion 20
  const redObj = new THREE.Group();
  redObj.name = 'winding-train';
  redObj.position.set(L.reductionWheel[0], L.reductionWheel[1], 0);
  const redRot = new THREE.Group();
  redRot.name = 'winding-train-rotor';
  redObj.add(redRot);
  root.add(redObj);
  {
    const [z0, z1] = Z.reductionWheel;
    const wg = gear.wheelGeometry({ teeth: AT.reductionWheel.teeth, module: MD.autoB, thickness: z1 - z0, spokes: 5, bore: 0.1 });
    const wm = shadowed(new THREE.Mesh(wg, giltMat));
    wm.name = 'reduction-wheel';
    wm.position.z = (z0 + z1) / 2;
    const [p0, p1] = Z.reductionPinion;
    const pg = gear.pinionGeometry({ leaves: AT.reductionWheel.pinion, module: MD.keyless, length: p1 - p0 });
    const pm = shadowed(new THREE.Mesh(pg, pinionMat));
    pm.name = 'reduction-pinion';
    pm.position.z = (p0 + p1) / 2;
    const arb = shadowed(new THREE.Mesh(gear.arborGeometry({ r: 0.13, z0: z0 - 0.12, z1: p1 + 0.08, pivotLen: 0.07 }), pinionMat));
    arb.name = 'reduction-arbor';
    redRot.add(wm, pm, arb);
  }

  // ================================================================ registry
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const turnsPerRatchet = 1 / spec.automatic.ratchetPerRotorRad;
  reg.add({
    id: 'rotor', name: 'Rotor (oscillating weight)', category: 'automatic', side: 'back', object: rotorObj, rotor: rotorRot,
    drive: { key: 'rotor' }, exposed: true, priority: 1,
    explode: ex('rotor'), explodeDelay: spec.explodeDelay('rotor'),
    anchor: [0, -(R.bandInner + R.radius) / 2, Z.rotor[0]],
    description: 'An openworked half-disc that swings freely about the centre whenever the watch moves. Most of its mass sits in the dark outer band, so even small wrist movements turn it; through the reversing wheels both directions of swing wind the mainspring.',
    facts: {
      Type: 'Bidirectional, openworked half-disc',
      Diameter: `${(2 * R.radius).toFixed(1)} mm`,
      Finish: 'Satin-brushed web, sand-blasted heavy band',
      Engraving: '"TUDOR", raised and polished',
      Bearing: 'Ball bearing',
      Winding: `${turnsPerRatchet.toFixed(0)} rotor turns per ratchet turn`,
    },
    live: (s) => `${(((s.rot.rotor / TAU) % 1 + 1) % 1 * 360).toFixed(0)}° · ${((s.rotorVel || 0) * 60 / TAU).toFixed(0)} rpm`,
  });
  reg.add({
    id: 'rotor-bearing', name: 'Rotor bearing', category: 'automatic', side: 'back', object: bearingObj, rotor: bearingRot,
    drive: { key: 'rotor' }, exposed: true, priority: 2,
    explode: ex('rotor-bearing'), explodeDelay: spec.explodeDelay('rotor-bearing'),
    anchor: [RACE.outer[1] * 0.7, RACE.outer[1] * 0.7, zbr0],
    description: 'A ball bearing at the centre of the movement carries the rotor so it spins almost without friction. Its inner race is screwed to a gilt post on the train bridge; the outer race turns with the rotor and carries the 60-tooth rotor gear that drives the winding train.',
    facts: {
      Type: 'Ball bearing',
      Balls: String(R.bearing.balls),
      'Rotor gear': `${AT.rotorGear.teeth} teeth`,
      Post: 'Gilt, on the train bridge',
      Fixing: 'Central screw',
    },
    update: (s) => { cage.rotation.z = s.rot.rotor * CAGE_RATIO; },
  });
  reg.add({
    id: 'reversing-wheels', name: 'Reversing wheels', category: 'automatic', side: 'back', object: revObj,
    exposed: false, priority: 2,
    explode: ex('reversing-wheels'), explodeDelay: spec.explodeDelay('reversing-wheels'),
    anchor: [L.reverserB[0], L.reverserB[1], zw0],
    description: 'Two wheels with built-in clicks under the automatic bridge. The rotor gear turns them back and forth with every swing, but their clicks pass on only one direction, so the pinion of wheel B always turns the same way and both swings wind the watch.',
    facts: {
      Teeth: `${AT.reverserA.teeth} + ${AT.reverserB.teeth}`,
      'B pinion': `${AT.reverserB.pinion} leaves`,
      Clutch: 'Internal clicks (one-way)',
      Speed: `${Math.abs(ratios.reverserAPerRotor).toFixed(0)}× the rotor`,
    },
    update: (s) => {
      wheelA.rotation.z = ratios.reverserAPerRotor * s.rot.rotor + phaseA;
      wheelB.rotation.z = ratios.reverserBPerRotor * s.rot.rotor + phaseB;
      pinB.rotation.z = ratios.reverserBPinionPerRatchet * s.rot.ratchet + phaseBp;
    },
  });
  reg.add({
    id: 'winding-train', name: 'Reduction wheel', category: 'automatic', side: 'back', object: redObj, rotor: redRot,
    drive: { key: 'ratchet', sign: ratios.reductionPerRatchet, phase: phaseRed }, exposed: false, priority: 2,
    explode: ex('winding-train'), explodeDelay: spec.explodeDelay('winding-train'),
    anchor: [0, 0, Z.reductionWheel[0]],
    description: 'A gilt wheel that slows the reversing wheels\' motion right down and, through its pinion, turns the ratchet wheel on the barrel arbor — this is where the rotor\'s swinging becomes mainspring tension.',
    facts: {
      Teeth: `${AT.reductionWheel.teeth}, pinion ${AT.reductionWheel.pinion}`,
      Drives: `Ratchet wheel (${spec.keyless.ratchet.teeth})`,
      Ratio: `1 ratchet turn per ${turnsPerRatchet.toFixed(0)} rotor turns`,
    },
  });
}
