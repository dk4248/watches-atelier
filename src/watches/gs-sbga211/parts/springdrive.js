// TRI-SYNCHRO REGULATOR of the 9R65 (builder B3, plan.md §B3): glide wheel (gilt 3-spoke
// inertia disc, 2-pole magnet, 8-leaf pinion, 8 rev/s), the two generator coils with their
// amorphous cores and stator hooks, the C-MOS IC, the 32,768 Hz quartz, the flexible circuit
// with capacitors, and the hacking (stop) lever. Data: SPEC.regulator, SPEC.z.
// Part ids: glide-wheel coil tri-synchro-regulator ic quartz-oscillator stop-lever.
//
// The glide wheel turns at exactly 8 rev/s (state.rot.glide). At 60 fps that is 48° a frame
// and at 30 fps 96° — more than half the 120° spoke spacing, so crisp spokes would appear to
// crawl backwards. Its rim, hub, magnet and circular grain are rotationally symmetric and are
// drawn as they are; only the three spokes (and the pinion leaves) are motion-blurred: as the
// angle swept per frame grows, the crisp spokes fade into a smear computed analytically in
// the shader (the fraction of the last frame interval during which a spoke covered each
// point), which becomes the uniform time-averaged veil once the sweep reaches the aliasing
// range. In slow motion the sweep is small and the crisp spokes show.
import * as THREE from 'three';
import {
  Batch, mtx, latheZ, tubeZ, uvPlanar, discUV, sdCircle, sdCapsule, sdPolygon, sUnion, contours, simplifyLoop, loopArea,
  sdfExtrude, extrudeShape, pinionGeo, screwGeo, screwMtx, brushedNormalMap, gsMaterials, gsPhases, stdAttrs, nonIndexed, crease,
  BEVEL_CREASE,
} from './train.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const V2 = (x, y) => new THREE.Vector2(x, y);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// SDF → several separate shapes (every loop an outer contour; holes inside are kept)
function sdfShapes(sdf, box, h = 0.01, tol = 0.001) {
  const loops = contours(sdf, box[0], box[1], box[2], box[3], h).map((l) => simplifyLoop(l, tol)).filter((l) => Math.abs(loopArea(l)) > 1e-3);
  return loops.map((l) => new THREE.Shape(l));
}

// Flex-circuit artwork (dark-brown polyimide, gold traces and pads) in the dial frame.
function flexTexture(spec, bbox, pxPerMm = 56) {
  const RG = spec.regulator, C = spec.frame.colours;
  const [x0, y0, x1, y1] = bbox;
  const W = Math.ceil((x1 - x0) * pxPerMm), H = Math.ceil((y1 - y0) * pxPerMm);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const P = (x, y) => [(x - x0) * pxPerMm, (y1 - y) * pxPerMm];
  g.fillStyle = C.pcb; g.fillRect(0, 0, W, H);
  // faint weave of the polyimide
  g.globalAlpha = 0.08; g.strokeStyle = '#000';
  for (let i = 0; i < W + H; i += 7) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i - H, H); g.stroke(); }
  g.globalAlpha = 1;
  g.strokeStyle = C.pcbTrace; g.fillStyle = C.pcbTrace; g.lineCap = 'round'; g.lineJoin = 'round';
  const trace = (pts, w = 0.11) => { g.lineWidth = w * pxPerMm; g.beginPath(); pts.forEach((p, i) => { const [u, v] = P(p[0], p[1]); if (i) g.lineTo(u, v); else g.moveTo(u, v); }); g.stroke(); };
  const pad = (x, y, w, h, rot = 0) => { const [u, v] = P(x, y); g.save(); g.translate(u, v); g.rotate(-rot); g.fillRect((-w / 2) * pxPerMm, (-h / 2) * pxPerMm, w * pxPerMm, h * pxPerMm); g.restore(); };
  const dot = (x, y, r) => { const [u, v] = P(x, y); g.beginPath(); g.arc(u, v, r * pxPerMm, 0, TAU); g.fill(); };
  const ic = RG.ic.center;
  // capacitor pads + their traces to the IC
  for (const cap of RG.capacitors) {
    const a = 20 * DEG, ux = Math.cos(a), uy = Math.sin(a);
    for (const s of [-1, 1]) {
      const px = cap.at[0] + s * 0.4 * ux, py = cap.at[1] + s * 0.4 * uy;
      pad(px, py, 0.32, 0.6, a);
      trace([[px, py], [px + (ic[0] - px) * 0.35, py], [ic[0] + (px - ic[0]) * 0.35 + s * 0.2, ic[1] + (py - ic[1]) * 0.35]], 0.1);
    }
  }
  // quartz pin pads (at the can's 'to' end) and their traces
  const q = RG.quartz, qa = Math.atan2(q.to[1] - q.from[1], q.to[0] - q.from[0]);
  for (const s of [-1, 1]) {
    const px = q.to[0] + 0.45 * Math.cos(qa) - s * 0.25 * Math.sin(qa), py = q.to[1] + 0.45 * Math.sin(qa) + s * 0.25 * Math.cos(qa);
    dot(px, py, 0.17);
    trace([[px, py], [px + 0.4, py - 0.9], [ic[0] + 0.5 + s * 0.25, ic[1] + 1.1]], 0.1);
  }
  // coil lead pads near the left edge, traces to the IC
  for (const [px, py] of [[5.0, 9.85], [4.45, 6.85]]) {
    pad(px, py, 0.45, 0.45);
    trace([[px, py], [px + 0.8, py], [ic[0] - 1.0, ic[1] + (py - ic[1]) * 0.3]], 0.12);
  }
  // a few vias and bus traces along the board
  trace([[4.2, 3.0], [6.0, 2.6], [8.9, 3.3], [10.9, 4.6]], 0.14);
  trace([[9.4, 7.2], [10.4, 7.9], [9.6, 9.2], [8.2, 10.0]], 0.1);
  for (const [vx, vy] of [[4.6, 3.1], [6.9, 2.8], [10.2, 4.3], [9.6, 7.4], [8.6, 9.7], [5.6, 10.4], [4.9, 8.2]]) dot(vx, vy, 0.12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function buildSpringDrive(ctx) {
  const { spec, M, reg, root, gear, lite } = ctx;
  if (lite) return;
  const Z = spec.z, L = spec.layout, RG = spec.regulator, G = RG.glide, MD = spec.modules, F = spec.frame;
  const X = gsMaterials(M, spec);
  const PH = gsPhases(spec, gear);
  const fmt = (v, d = 1) => v.toFixed(d);
  const len = (r) => r[1] - r[0];
  const mid = (r) => (r[0] + r[1]) / 2;
  const add = (def) => reg.add({ ...def, explode: spec.explode[def.id] ?? [0, 0, 0], explodeDelay: spec.explodeDelay(def.id) });
  const bridgeIn = Z.bridges[1], plateBack = Z.mainPlate[0];
  const pinPair = [X.steel, X.steelPol];

  // ===================================================================== GLIDE WHEEL
  {
    const object = new THREE.Group(); object.position.set(L.glide[0], L.glide[1], 0); root.add(object);
    const rotor = new THREE.Group(); object.add(rotor);
    const dz = G.disc.z, R = G.discRadius, rimIn = R - G.rimWidth, hubR = G.hubRadius, nS = G.spokes, sw = G.spokeWidth;
    const SPOKE0 = 90 * DEG; // spoke 0 along local +Y
    const FILLET = 0.12;
    // --- rim + hub: rotationally symmetric, opaque, circular grain
    const solid = new Batch();
    solid.add(latheZ([[rimIn, dz[0]], [R - 0.02, dz[0]], [R, dz[0] + 0.02], [R, dz[1] - 0.02], [R - 0.02, dz[1]], [rimIn, dz[1]], [rimIn, dz[0]]], 192, R), X.giltRound);
    solid.add(latheZ([[0, dz[0]], [hubR, dz[0]], [hubR, dz[1]], [0, dz[1]]], 64, R), X.giltRound);
    // collet on the back of the hub, boss down to the pinion, arbor with its pivots
    solid.add(tubeZ(0.05, 0.27, dz[0] - 0.05, dz[0], 40, 0.02), X.steelPol);
    solid.add(tubeZ(0.05, 0.24, dz[1], G.pinion.z[0], 32, 0.01), X.steelPol);
    solid.add(tubeZ(0.05, 0.16, G.pinion.z[1], G.magnet.z[0], 24, 0.01), X.steelPol);
    solid.add(latheZ([[0, bridgeIn - 0.1], [0.045, bridgeIn - 0.1], [0.045, bridgeIn + 0.02], [0.08, bridgeIn + 0.06], [0.08, plateBack - 0.12], [0.045, plateBack - 0.08], [0.045, plateBack - 0.04], [0, plateBack - 0.04]], 20), X.steelPol);
    const solidMeshes = solid.build(rotor);
    // --- magnet: dark-grey sintered 2-pole cylinder (symmetric)
    const mz = G.magnet.z, mr = G.magnet.radius;
    const mag = new Batch();
    mag.add(latheZ([[0.05, mz[0]], [mr - 0.04, mz[0]], [mr, mz[0] + 0.04], [mr, mz[1] - 0.04], [mr - 0.04, mz[1]], [0.05, mz[1]], [0.05, mz[0]]], 64, mr), X.magnet);
    mag.build(rotor);
    // --- pinion: crisp leaves fade out, the root core stays, a translucent sleeve fades in
    const pz = G.pinion.z, mP = MD.sixth, zl = G.pinion.leaves;
    const rootR = (mP * zl) / 2 - 1.9 * mP, tipR = (mP * (zl + 1.8)) / 2;
    const leavesMat = M.steelPinion.clone(); leavesMat.transparent = true; leavesMat.name = 'gsGlideLeaves';
    const leafGeo = nonIndexed(pinionGeo(gear, zl, mP, len(pz))).applyMatrix4(mtx(0, 0, mid(pz), PH.glidePinion));
    const leaves = new THREE.Mesh(stdAttrs(crease(leafGeo, 35 * DEG)), leavesMat);
    leaves.castShadow = false;
    rotor.add(leaves);
    const core = new Batch();
    core.add(latheZ([[0, pz[0]], [rootR, pz[0]], [rootR, pz[1]], [0, pz[1]]], 32), X.steel);
    core.build(rotor);
    const sleeveMat = M.steelPinion.clone(); sleeveMat.transparent = true; sleeveMat.depthWrite = false; sleeveMat.opacity = 0; sleeveMat.name = 'gsGlideSleeve';
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(tipR * 0.93, tipR * 0.93, len(pz) * 0.98, 48, 1, true).rotateX(Math.PI / 2).translate(0, 0, mid(pz)), sleeveMat);
    sleeve.castShadow = false; sleeve.receiveShadow = false; sleeve.visible = false; sleeve.userData.noHighlight = true;
    rotor.add(sleeve);
    // --- spokes with their fillets, cut exactly at the hub and rim circles
    const caps = [];
    for (let j = 0; j < nS; j++) {
      const a = SPOKE0 + (j * TAU) / nS;
      caps.push(sdCapsule([0.2 * Math.cos(a), 0.2 * Math.sin(a)], [(rimIn + 0.1) * Math.cos(a), (rimIn + 0.1) * Math.sin(a)], sw / 2));
    }
    const sdS = (x, y) => { let d = Infinity; for (const f of caps) d = Math.min(d, f(x, y)); return d; };
    const metal = (x, y) => {
      const r = Math.hypot(x, y);
      const dRH = Math.min(rimIn - r, r - hubR);
      const a = sdS(x, y), k = FILLET;
      const hh = Math.max(k - Math.abs(a - dRH), 0) / k;
      return Math.min(a, dRH) - hh * hh * k * 0.25;
    };
    const spokeSdf = (x, y) => { const r = Math.hypot(x, y); return Math.max(metal(x, y), Math.max(r - rimIn, hubR - r)); };
    const spokeShapes = sdfShapes(spokeSdf, [-rimIn - 0.05, -rimIn - 0.05, rimIn + 0.05, rimIn + 0.05], 0.008, 0.0008);
    const sg = new THREE.ExtrudeGeometry(spokeShapes, { depth: len(dz), bevelEnabled: false, curveSegments: 4 });
    sg.translate(0, 0, dz[0]);
    discUV(sg, R);
    const spokesMat = X.giltRound.clone(); spokesMat.transparent = true; spokesMat.name = 'gsGlideSpokes';
    const spokes = new THREE.Mesh(sg, spokesMat);
    spokes.castShadow = false;
    rotor.add(spokes);
    // --- the smear: analytic motion-blur coverage of the spokes (see header)
    const U = {
      uSweep: { value: 1e-3 }, uUniform: { value: 0 }, uFade: { value: 0 }, uHalfW: { value: sw / 2 }, uSpoke0: { value: SPOKE0 },
      uDir: { value: spec.timing.glideDir >= 0 ? 1 : -1 }, uRange: { value: new THREE.Vector2(hubR, rimIn) },
    };
    const smearMat = X.giltRound.clone();
    smearMat.name = 'gsGlideSmear';
    smearMat.transparent = true; smearMat.depthWrite = false; smearMat.side = THREE.DoubleSide;
    const PER = (TAU / nS).toFixed(8);
    smearMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, U);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vGlideP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlideP = position.xy;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform float uSweep; uniform float uUniform; uniform float uFade; uniform float uHalfW; uniform float uSpoke0; uniform float uDir; uniform vec2 uRange;
varying vec2 vGlideP;`)
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
{
  // How much of the last frame interval a spoke spent over this point, weighted towards the
  // present (exp shutter, s = angle back in time): a ghost spoke where the spoke is now with
  // a fading trail behind it. Near the aliasing range it becomes the time-averaged veil.
  const float PER = ${PER};
  const float GAIN = 2.8;
  float r = max(length(vGlideP), 0.05);
  float phi = uDir * atan(vGlideP.y, vGlideP.x);
  float hw = asin(clamp(uHalfW / r, 0.0, 1.0)) + 0.06 * (exp(-(r - uRange.x) / 0.07) + exp(-(uRange.y - r) / 0.07)) / r;
  float base = mod(uDir * uSpoke0 - phi, PER);
  float tau = max(0.35 * uSweep, 1e-3);
  float cov = 0.0;
  for (int k = -1; k < 5; k++) {
    float c = base + float(k) * PER;
    float lo = max(c - hw, 0.0), hi = min(c + hw, uSweep);
    if (hi > lo) cov += exp(-lo / tau) - exp(-hi / tau);
  }
  cov /= max(1.0 - exp(-uSweep / tau), 1e-4);
  float veil = 2.0 * hw / PER;
  diffuseColor.a *= min(0.9, GAIN * mix(cov, veil, uUniform)) * uFade;
}`);
    };
    smearMat.customProgramCacheKey = () => 'gsGlideSmear';
    const smearGeo = new THREE.RingGeometry(hubR, rimIn, 160, 6);
    discUV(smearGeo, R);
    const smear = new THREE.Mesh(smearGeo, smearMat);
    smear.position.z = dz[0] - 0.002;
    smear.castShadow = false; smear.receiveShadow = false; smear.visible = false; smear.userData.noHighlight = true;
    smear.renderOrder = 2;
    rotor.add(smear);
    void solidMeshes;

    // motion-blur state (no allocations per frame)
    let lastP = null, sweepEma = 0;
    add({
      id: 'glide-wheel', name: 'Glide wheel', category: 'regulating', side: 'back', exposed: true, priority: 1,
      object, rotor, drive: { key: 'glide' }, anchor: [R * 0.72, R * 0.55, dz[0]],
      description: 'The heart of Spring Drive and the end of its gear train: instead of an escapement, the train spins this wheel at exactly 8 turns per second. Its tiny two-pole magnet makes it the rotor of a generator, and the coils brake it electromagnetically 256 times a second to keep it locked to the quartz — so every wheel, and the seconds hand, glides instead of ticking. The gilt three-spoke disc adds inertia to steady it against knocks.',
      facts: {
        Speed: '8 turns per second (28,800 per hour)', Pinion: `${G.pinion.leaves} leaves`, 'Inertia disc': `Ø${fmt(2 * R, 1)} mm, ${nS} spokes, gilt`,
        Magnet: `Ø${fmt(2 * mr, 1)} mm, 2 poles`, Brake: `${RG.brakeChopHz}× per second, contact-free`, 'Turns a day': (8 * 86400).toLocaleString('en-US'), Bearings: 'Diashock (top), jewel in a gold setting (bottom)',
      },
      live: (s) => `${fmt(8 * s.scale, s.scale < 1 ? 3 : 0)} rev/s · ${Math.floor(s.beatToday).toLocaleString('en-US')} turns since midnight`,
      update: (s) => {
        // angle swept since the last frame, smoothed (the shader smears over it)
        if (lastP !== null && s.dt > 1e-4) {
          const dP = s.P - lastP;
          const swept = dP >= 0 && dP < 64 ? Math.min(TAU, TAU * dP) : TAU;
          sweepEma += (swept - sweepEma) * (1 - Math.exp(-s.dt / 0.1));
        }
        lastP = s.P;
        // crisp below ~8° a frame; a forward smear up to ~50° (60 fps: 48°); the aliasing-free
        // veil from 60° (half the 120° spoke spacing — 30 fps gives 96°)
        const blur = smooth(8 * DEG, 24 * DEG, sweepEma);
        const veil = smooth(50 * DEG, 62 * DEG, sweepEma);
        spokes.material.opacity = 1 - blur;
        spokes.visible = blur < 0.995;
        leaves.material.opacity = 1 - blur;
        leaves.visible = blur < 0.995;
        sleeve.material.opacity = 0.55 * blur;
        sleeve.visible = blur > 0.005;
        smear.visible = blur > 0.005;
        U.uSweep.value = Math.max(1e-3, sweepEma);
        U.uUniform.value = veil;
        U.uFade.value = blur;
      },
    });
  }

  // ===================================================================== COILS (×2) + STATOR
  {
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const Mg = L.glide, cz = Z.coilCore, ax = RG.coilAxisZ, Rw = RG.coilWindingRadius;
    const coreW = RG.coreWidth, hookIn = RG.statorHookInnerRadius, hookOut = RG.statorHookOuterRadius;
    const copperNM = brushedNormalMap(4242, 128);
    const copper = X.copper.clone(); copper.normalMap = copperNM; copper.normalScale = new THREE.Vector2(0.45, 0.45); copper.anisotropyRotation = Math.PI / 2; copper.name = 'gsCopperWinding';
    const coreNM = brushedNormalMap(77, 64);
    const coreMat = X.core.clone(); coreMat.normalMap = coreNM; coreMat.normalScale = new THREE.Vector2(0.25, 0.25); coreMat.name = 'gsCorePlate';
    const leads = [];
    RG.coils.forEach((c, ci) => {
      const [S, E] = c.axis;
      const Lc = Math.hypot(E[0] - S[0], E[1] - S[1]);
      const ex = [(S[0] - E[0]) / Lc, (S[1] - E[1]) / Lc]; // local +x: from the winding towards the magnet end
      const ey = [-ex[1], ex[0]]; // local +y (a proper rotation of the frame)
      const mrel = [Mg[0] - S[0], Mg[1] - S[1]];
      const mx = mrel[0] * ex[0] + mrel[1] * ex[1], my0 = mrel[0] * ey[0] + mrel[1] * ey[1];
      const sgn = my0 >= 0 ? 1 : -1, my = Math.abs(my0); // the hook is drawn with the magnet on +Y, mirrored by sgn
      const toW = (x, y) => [S[0] + x * ex[0] + y * ey[0], S[1] + x * ex[1] + y * ey[1]];
      const ang = Math.atan2(ex[1], ex[0]);
      const frame = new THREE.Matrix4().makeRotationZ(ang).setPosition(S[0], S[1], 0);
      // --- core plate: strip through the winding, pointed foot with the screw hole, and the
      // pole piece whose half-round hook embraces the magnet from this coil's side
      const hw = coreW / 2, gap = 0.05;
      const foot = -(Lc + 1.2), screwX = -Math.hypot(c.footScrew[0] - S[0], c.footScrew[1] - S[1]);
      const strip = sdPolygon([[foot + 0.75, -hw], [mx - 0.25, -hw], [mx - 0.25, hw], [foot + 0.75, hw], [foot, 0.28], [foot, -0.28]]);
      const hookDisc = (x, y) => Math.max(Math.hypot(x - mx, y - my) - hookOut, y - (my - gap));
      const hole = sdCircle(mx, my, hookIn), screwHole = sdCircle(screwX, 0, 0.19);
      const body = sUnion(0.12, strip, hookDisc);
      const plate = (x, y) => { const Y = sgn * y; return Math.max(body(x, Y), -hole(x, Y), -screwHole(x, Y)); };
      const yLo = sgn > 0 ? -hw - 0.1 : -(my + 0.1), yHi = sgn > 0 ? my + 0.1 : hw + 0.1;
      const pg = sdfExtrude(plate, [foot - 0.1, yLo, mx + hookOut + 0.1, yHi], [0, 0], cz[0], len(cz), { h: 0.01, bevel: 0.02 });
      uvPlanar(pg, 0.5, 0.3);
      b.add(pg, [coreMat, X.steelPol], frame, BEVEL_CREASE);
      // --- copper winding (rounded ends), with UVs along the wire
      const wl = latheZ([[0.62, 0], [Rw - 0.05, 0], [Rw, 0.06], [Rw, Lc - 0.06], [Rw - 0.05, Lc], [0.62, Lc]], 72);
      const p = wl.attributes.position, uv = wl.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.atan2(p.getY(i), p.getX(i)) / TAU + 0.5) * 2, p.getZ(i) * 1.2);
      // lathe axis z → coil axis (−x local), centred on the axis height
      const toAxis = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
      const wm = frame.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, ax)).multiply(toAxis);
      b.add(wl, copper, wm, 40 * DEG);
      // --- white bobbin cheeks at both ends of the winding
      for (const x of [0.02, -Lc - 0.02]) {
        const ck = new THREE.BoxGeometry(0.05, 2 * Rw * 0.92, 2 * Rw * 0.92);
        b.add(ck, X.insulation, frame.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, ax)));
      }
      // --- foot: spacer post down to the plate + polished screw on top
      const fs = toW(screwX, 0);
      b.add(latheZ([[0.2, cz[1]], [0.42, cz[1]], [0.42, plateBack], [0.2, plateBack], [0.2, cz[1]]], 32), X.steelPol, mtx(fs[0], fs[1], 0));
      b.add(screwGeo(0.4, 0.13, 0.1, 0.05), X.steelPol, screwMtx(fs[0], fs[1], cz[0], 35 + 60 * ci, -1));
      // --- amber flex lead: leaves the plate's outer edge just beyond the winding
      leads.push(toW(0.55, -sgn * (hw - 0.12)));
    });
    // flex leads: flat ribbons floating just above the circuit board's level, to its pads
    const ribbon = (pts, z, w = 0.3, t = 0.03) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        b.add(new THREE.BoxGeometry(l + w * 0.6, w, t), X.flex, mtx((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, z, Math.atan2(c[1] - a[1], c[0] - a[0])));
      }
    };
    const zl = Z.pcb[0] - 0.02;
    const routes = [[leads[0], [1.0, leads[0][1] + 0.35], [3.3, 10.75], [5.0, 9.85]], [leads[1], [1.5, 7.25], [3.4, 7.55], [4.45, 6.85]]];
    for (const [k, rt] of routes.entries()) {
      ribbon(rt, zl);
      const s0 = leads[k], hgt = Math.abs(Z.coilCore[1] - zl);
      b.add(new THREE.BoxGeometry(0.3, 0.03, hgt), X.flex, mtx(s0[0], s0[1], (Z.coilCore[1] + zl) / 2, Math.atan2(rt[1][1] - s0[1], rt[1][0] - s0[0]) + Math.PI / 2));
    }
    b.build(object);
    const first = RG.coils[0].axis;
    add({
      id: 'coil', name: 'Generator coils (×2)', category: 'regulating', side: 'back', exposed: true, priority: 1,
      object, anchor: [(first[0][0] + first[1][0]) / 2, (first[0][1] + first[1][1]) / 2 + 0.6, ax - Rw],
      description: 'Two copper coils on amorphous-metal cores whose hooked pole pieces wrap round the glide wheel\'s magnet. The spinning magnet induces a tiny current in them that powers the IC and the quartz (no battery); when the wheel runs fast, the IC short-circuits the coils for a moment, which brakes it magnetically, without any contact. A sliver of copper shows through the case back at 12 o\'clock.',
      facts: { Windings: '≈25,000 turns of 15 µm copper wire each (published for the first Spring Drive automatic)', Cores: 'amorphous-alloy laminations', Connection: 'in series, left/right symmetric', Stator: `hook pole pieces, bore Ø${fmt(2 * RG.statorHookInnerRadius, 2)} mm` },
      live: (s) => `${fmt(8 * s.scale, s.scale < 1 ? 3 : 0)} Hz induced · braking ${RG.brakeChopHz}×/s`,
    });
  }

  // ===================================================================== CIRCUIT (flex + stiffener + capacitors)
  const pcb = F.pcb.outline;
  const bbox = [Math.min(...pcb.map((p) => p[0])) - 0.1, Math.min(...pcb.map((p) => p[1])) - 0.1, Math.max(...pcb.map((p) => p[0])) + 0.1, Math.max(...pcb.map((p) => p[1])) + 0.1];
  {
    const object = new THREE.Group(); root.add(object);
    const b = new Batch();
    const pz = Z.pcb, zFlex = [pz[1] - 0.07, pz[1]], zStiff = [pz[0], pz[1] - 0.07];
    const flexMat = new THREE.MeshPhysicalMaterial({ map: flexTexture(spec, bbox), metalness: 0.15, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25, name: 'gsFlexCircuit' });
    const shape = new THREE.Shape(pcb.map((p) => V2(p[0], p[1])));
    const fg = extrudeShape(shape, zFlex[0], len(zFlex), 0.012, 4);
    { const p = fg.attributes.position, uv = fg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bbox[0]) / (bbox[2] - bbox[0]), (p.getY(i) - bbox[1]) / (bbox[3] - bbox[1])); }
    b.add(fg, [flexMat, flexMat]);
    // grey stiffener round the IC, with a window for it
    const ic = RG.ic, ica = ic.rotationDeg * DEG;
    const pcbSdf = sdPolygon(pcb);
    const rot = (x, y) => [Math.cos(-ica) * (x - ic.center[0]) - Math.sin(-ica) * (y - ic.center[1]), Math.sin(-ica) * (x - ic.center[0]) + Math.cos(-ica) * (y - ic.center[1])];
    const box = (hx, hy) => (x, y) => { const [u, v] = rot(x, y); const qx = Math.abs(u) - hx, qy = Math.abs(v) - hy; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0); };
    const outer = box(2.55, 2.35), win = box(ic.size / 2 + 0.12, ic.size / 2 + 0.12);
    const stiff = (x, y) => Math.max(pcbSdf(x, y) + 0.15, outer(x, y) - 0.25, -win(x, y));
    const sgeo = sdfExtrude(stiff, bbox, [0, 0], zStiff[0], len(zStiff), { h: 0.012, bevel: 0.015 });
    uvPlanar(sgeo, 0.4, 0.5);
    b.add(sgeo, [X.stiffener, X.steelPol], null, BEVEL_CREASE);
    // three SMD capacitors on their pads
    const cz = Z.capacitors;
    for (const cap of RG.capacitors) {
      const a = 20 * DEG, [lx, ly] = cap.size, h = len(cz), tl = 0.2;
      b.add(new THREE.BoxGeometry(lx - 2 * tl + 0.02, ly * 0.96, h * 0.94), X.ceramic, mtx(cap.at[0], cap.at[1], cz[1] - (h * 0.94) / 2, a));
      for (const s of [-1, 1]) {
        const cx = cap.at[0] + s * ((lx - tl) / 2) * Math.cos(a), cy = cap.at[1] + s * ((lx - tl) / 2) * Math.sin(a);
        b.add(new THREE.BoxGeometry(tl, ly, h), X.tin, mtx(cx, cy, cz[1] - h / 2, a));
      }
    }
    b.build(object);
    add({
      id: 'tri-synchro-regulator', name: 'Tri-synchro Regulator circuit', category: 'regulating', side: 'back', exposed: false, priority: 2,
      object, anchor: [10.4, 5.2, pz[0]],
      description: 'The flexible printed circuit, with a grey stiffener, that ties the regulator together: it connects the generator coils, the IC, the quartz and the storage capacitors. There is no battery — the coils\' output is rectified into the capacitors, which is why the watch starts after only a little winding. "Tri-synchro" because it unites mechanical energy, electrical energy and the electromagnetic brake.',
      facts: { Power: `${RG.powerNanoWatt} nW for the circuit and the quartz`, Capacitors: `${RG.capacitors.length} SMD (storage, smoothing)`, Board: 'polyimide flex with gold traces, steel stiffener', Battery: 'none' },
    });
  }

  // ===================================================================== IC
  {
    const ic = RG.ic, ica = ic.rotationDeg * DEG;
    const object = new THREE.Group(); object.position.set(ic.center[0], ic.center[1], 0); object.rotation.z = ica; root.add(object);
    const b = new Batch();
    const iz = Z.ic, half = ic.size / 2, dh = ic.dieSize / 2;
    // dark substrate + gold lead frame with fine fingers
    b.add(new THREE.BoxGeometry(ic.size, ic.size, 0.03), X.dieSide, mtx(0, 0, iz[1] - 0.015));
    const ring = new THREE.Shape([V2(-half, -half), V2(half, -half), V2(half, half), V2(-half, half)]);
    const inner = new THREE.Path([V2(-half + 0.16, -half + 0.16), V2(-half + 0.16, half - 0.16), V2(half - 0.16, half - 0.16), V2(half - 0.16, -half + 0.16)]);
    ring.holes.push(inner);
    b.add(extrudeShape(ring, iz[1] - 0.05, 0.02, 0.004, 1), [X.gold, X.gold]);
    const nF = 11;
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < nF; i++) {
        const t = -half + 0.32 + ((ic.size - 0.64) * i) / (nF - 1);
        const fl = half - dh - 0.08, fc = half - 0.16 - fl / 2;
        const g = new THREE.BoxGeometry(0.07, fl, 0.015);
        const m = new THREE.Matrix4().makeRotationZ((side * Math.PI) / 2).multiply(mtx(t, -fc, iz[1] - 0.04));
        b.add(g, X.gold, m);
      }
    }
    // the bare silicon die (mirror-bright face towards the case back)
    const die = new THREE.BoxGeometry(ic.dieSize, ic.dieSize, len(iz) - 0.05);
    die.translate(0, 0, iz[0] + (len(iz) - 0.05) / 2);
    b.add(die, [X.dieSide, X.dieSide, X.dieSide, X.dieSide, X.dieSide, X.die]);
    b.build(object);
    add({
      id: 'ic', name: 'Integrated circuit (C-MOS IC)', category: 'regulating', side: 'back', exposed: false, priority: 1,
      object, anchor: [dh * 0.7, dh * 0.7, iz[0]],
      description: 'The brain of the Tri-synchro Regulator: an oscillator circuit that keeps the quartz vibrating, a divider that counts its 32,768 vibrations down to an exact 8 per second, and the brake control. Every turn of the glide wheel it compares the coil signal with that 8 Hz reference and, whenever the wheel is ahead, short-circuits the coils to brake it — chopping the brake 256 times a second.',
      facts: { Functions: 'oscillator · ÷4,096 divider · brake control', Reference: `${RG.quartzHz.toLocaleString('en-US')} Hz ÷ ${RG.divider.toLocaleString('en-US')} = ${RG.referenceHz} Hz`, 'Brake chopping': `${RG.brakeChopHz} Hz`, Die: `${fmt(ic.dieSize, 1)} mm square`, Consumption: `${RG.powerNanoWatt} nW (with the quartz)` },
      live: (s) => `locked: ${Math.floor(s.beatToday).toLocaleString('en-US')} glide turns = ${Math.floor(s.beatToday * RG.divider).toLocaleString('en-US')} quartz cycles today`,
    });
  }

  // ===================================================================== QUARTZ
  {
    const q = RG.quartz;
    const ql = Math.hypot(q.to[0] - q.from[0], q.to[1] - q.from[1]);
    const qa = Math.atan2(q.to[1] - q.from[1], q.to[0] - q.from[0]);
    const object = new THREE.Group(); object.position.set(q.from[0], q.from[1], q.axisZ); object.rotation.z = qa; root.add(object);
    const b = new Batch();
    const r = q.radius;
    // polished can along local +x (lathe about z, turned onto x), crimp ring near the base
    const can = latheZ([[0, 0], [r * 0.7, 0.005], [r * 0.93, 0.04], [r, 0.12], [r, ql - 0.42], [r - 0.04, ql - 0.38], [r - 0.04, ql - 0.3], [r, ql - 0.26], [r, ql - 0.08], [r - 0.06, ql], [0, ql]], 48, r);
    b.add(can, X.steelPol, new THREE.Matrix4().makeRotationY(Math.PI / 2), 30 * DEG);
    // two pins from the base, bent down onto their pads on the flex circuit
    const zPad = Z.pcb[0] - q.axisZ; // pad plane relative to the axis
    for (const s of [-1, 1]) {
      const y = s * 0.22;
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ql - 0.02, y, 0), new THREE.Vector3(ql + 0.22, y, 0), new THREE.Vector3(ql + 0.42, y, zPad * 0.55), new THREE.Vector3(ql + 0.45, y + s * 0.03, zPad - 0.04),
      ]);
      b.add(new THREE.TubeGeometry(path, 16, 0.045, 8, false), X.tin);
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20).rotateX(Math.PI / 2), X.tin, mtx(ql + 0.45, y + s * 0.03, zPad - 0.016));
    }
    b.build(object);
    add({
      id: 'quartz-oscillator', name: 'Quartz crystal oscillator', category: 'regulating', side: 'back', exposed: false, priority: 1,
      object, anchor: [ql * 0.45, 0, -r],
      description: 'A tiny quartz tuning fork sealed in a polished can, vibrating 32,768 times a second. The IC divides that down to an exact 8 Hz reference for the glide wheel: this is what gives the Spring Drive its quartz accuracy, ±1 second a day.',
      facts: { Frequency: `${RG.quartzHz.toLocaleString('en-US')} Hz (2¹⁵)`, Type: 'tuning fork in a vacuum can', Can: `Ø${fmt(2 * r, 1)} × ${fmt(ql, 1)} mm`, Accuracy: spec.movement.accuracy },
      live: (s) => `${Math.floor((((s.localSec % 86400) + 86400) % 86400) * RG.quartzHz).toLocaleString('en-US')} vibrations since midnight`,
    });
  }

  // ===================================================================== STOP (HACKING) LEVER
  {
    const SL = RG.stopLever, sz = SL.z;
    const P0 = SL.pivot, F1 = SL.finger;
    const dir = Math.atan2(F1[1] - P0[1], F1[0] - P0[0]);
    const tipP = [F1[0] + 0.02 * Math.cos(dir), F1[1] + 0.02 * Math.sin(dir)];
    const sdf = sUnion(0.16, sdCircle(P0[0], P0[1], 0.45), sdCapsule(P0, tipP, SL.width / 2, SL.width / 2 - 0.06));
    const pivHole = sdCircle(P0[0], P0[1], 0.17);
    const object = new THREE.Group(); object.position.set(P0[0], P0[1], 0); root.add(object);
    const b = new Batch();
    const box = [Math.min(P0[0], F1[0]) - 0.6, Math.min(P0[1], F1[1]) - 0.6, Math.max(P0[0], F1[0]) + 0.6, Math.max(P0[1], F1[1]) + 0.6];
    const lg = sdfExtrude((x, y) => Math.max(sdf(x, y), -pivHole(x, y)), box, P0, sz[0], len(sz), { h: 0.01, bevel: 0.015 });
    uvPlanar(lg, 0.3, dir);
    b.add(lg, [X.steel, X.steelPol], null, BEVEL_CREASE);
    // shoulder stud hanging from the train bridge, with a collar under the lever
    b.add(latheZ([[0, bridgeIn + 0.002], [0.17, bridgeIn + 0.002], [0.17, sz[1]], [0.3, sz[1]], [0.3, sz[1] + 0.04], [0, sz[1] + 0.04]], 24), X.steelPol);
    b.build(object);
    add({
      id: 'stop-lever', name: 'Hacking (stop) lever', category: 'regulating', side: 'back', exposed: false, priority: 3,
      object, anchor: [(F1[0] - P0[0]) * 0.6, (F1[1] - P0[1]) * 0.6, sz[0]],
      description: 'When the crown is pulled to the second click, this thin steel lever swings onto the rim of the glide wheel\'s disc and holds it, stopping the whole train so the time can be set to the second. Here it rests in its released position, 0.1 mm clear of the disc.',
      facts: { Position: 'released (crown pushed in)', Engages: 'rim of the glide-wheel disc', Clearance: '0.1 mm' },
    });
  }
}
