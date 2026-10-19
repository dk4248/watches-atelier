// HANDS of the ref. 147: black OXIDISED steel thread hands ("Fadenzeiger", schwarz oxidiert —
// not blued: that is the gold ref. 195), satin, with no lume. Flat black hour collet
// Ø 2.15 on the hour-wheel pipe, black minute collet Ø 1.50 on the cannon pinion, a polished
// domed steel centre cap Ø 0.82 that reads almost white; small seconds with a square tip
// and a square tail on a black hub with a polished steel ring and a dark centre.
// Registers: hour-hand, minute-hand, seconds-hand.
// Reads: SPEC.hands, SPEC.z (hourHand, minuteHand, secondsHand, …), SPEC.dial.subdial.center,
//   SPEC.explode / explodeDelay. See research/tangente-update-147/plan.md §4.2.
//
// Each hand is a Group at its arbor (object) with a rotor child; the hand points to 12 (+Y)
// at rotation 0 and the registry drives rotor.rotation.z (hourHand / minuteHand /
// secondHand: clockwise = negative). Heights from SPEC.z:
//   seconds  blade 0.80–0.88, hub disc to 0.90, polished pipe ring to 0.92
//   hour     blade 1.20–1.30, flat collet to 1.38 (hour-wheel pipe top 1.39)
//   minute   blade 1.52–1.62, collet to 1.70 (cannon top 1.69), centre cap to 1.75
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// Thread-hand outline (CCW): a blade of constant width from inside the collet (y0) to the
// start of the point, then a slightly convex lancet point to the tip.
function threadOutline({ tip, width, taper, y0, tipSegs = 14 }) {
  const h = width / 2, yT = tip - taper;
  const right = [[h, y0], [h, yT]];
  for (let i = 1; i <= tipSegs; i++) {
    const t = i / tipSegs;
    right.push([Math.max(0.005, h * (1 - Math.pow(t, 1.22))), yT + (taper - 0.002) * t]);
  }
  const left = right.map(([x, y]) => [-x, y]).reverse();
  return [...right, ...left];
}

// Small-seconds outline (CCW): straight blade, square tip and square tail, corners eased.
function secondsOutline({ tip, tail, width, ease = 0.018 }) {
  const h = width / 2, pts = [];
  const corner = (cx, cy, a0) => { for (let k = 0; k <= 4; k++) { const a = (a0 + (90 * k) / 4) * DEG; pts.push([cx + ease * Math.cos(a), cy + ease * Math.sin(a)]); } };
  corner(h - ease, -tail + ease, -90);
  corner(h - ease, tip - ease, 0);
  corner(-h + ease, tip - ease, 90);
  corner(-h + ease, -tail + ease, 180);
  return pts;
}

// Surface of revolution about +Z with explicit normals. strip: [[r, z], …] with the solid on
// the LEFT of the direction of travel (normals point to its right, out of the solid).
function lathe(strips, segs) {
  const pos = [], nor = [], idx = [];
  for (const s of strips) {
    const n = s.length, base = pos.length / 3, nr = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      if (i > 0) { const dr = s[i][0] - s[i - 1][0], dz = s[i][1] - s[i - 1][1], l = Math.hypot(dr, dz) || 1; x += dz / l; y -= dr / l; }
      if (i < n - 1) { const dr = s[i + 1][0] - s[i][0], dz = s[i + 1][1] - s[i][1], l = Math.hypot(dr, dz) || 1; x += dz / l; y -= dr / l; }
      const l = Math.hypot(x, y) || 1;
      nr.push([x / l, y / l]);
    }
    for (let k = 0; k <= segs; k++) {
      const a = (k / segs) * TAU, c = Math.cos(a), sn = Math.sin(a);
      for (let i = 0; i < n; i++) {
        pos.push(s[i][0] * c, s[i][0] * sn, s[i][1]);
        nor.push(nr[i][0] * c, nr[i][0] * sn, nr[i][1]);
      }
    }
    for (let k = 0; k < segs; k++) {
      for (let i = 0; i < n - 1; i++) {
        const a = base + k * n + i, b = base + (k + 1) * n + i;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  // wind every triangle to agree with its vertex normals
  const ix = g.index.array, P = pos, N = nor;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * (N[a] + N[b] + N[c]) + fy * (N[a + 1] + N[b + 1] + N[c + 1]) + fz * (N[a + 2] + N[b + 2] + N[c + 2]) < 0) {
      const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp;
    }
  }
  return g;
}

const arcRZ = (cr, cz, rad, a0, a1, n) => {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * DEG; out.push([cr + rad * Math.cos(a), cz + rad * Math.sin(a)]); }
  return out;
};

// A flat collet disc: radius R, height H, bore rb, a rounded top edge (radius e) and fine
// chamfers on the other edges (closed section; separate strips keep the edges crisp, the
// extra points confine the normal blending to the rounding).
function colletStrips(R, H, rb, e) {
  return [
    [[rb + 0.012, 0], [R - 0.012, 0]],
    [[R - 0.012, 0], [R, 0.012]],
    [[R, 0.012], [R, H - e - 0.008], ...arcRZ(R - e, H - e, e, 0, 90, 6), [R - e - 0.008, H], [rb + 0.02, H]],
    [[rb + 0.02, H], [rb, H - 0.02]],
    [[rb, H - 0.02], [rb, 0.012]],
    [[rb, 0.012], [rb + 0.012, 0]],
  ];
}

export function buildHands(ctx) {
  const { spec, M, reg, root } = ctx;
  const Z = spec.z, HS = spec.hands;
  const lite = !!ctx.lite;
  const T = Z.handThickness; // hour and minute blades (0.10)
  const TS = Z.secondsHandThickness ?? T; // seconds blade (0.08)
  const [scx, scy] = spec.dial.subdial.center;
  const SEG = lite ? 40 : 72;

  // Black-oxidised steel: a thin black oxide layer grown on the steel, satin-finished.
  // Base #1c1c1e, metalness ≈ 0.7, roughness ≈ 0.35 (SPEC.hands.pbr). The environment is
  // bound explicitly so envMapIntensity counts: face-on, the official render shows the hands
  // as pure black (front.jpg: #000–#141414 along the blades), so the flat faces mirror the
  // bright studio tent only faintly; the key light and the rounded edges and collet rims
  // (a touch glossier) still give the soft grey highlights of the macro (#4c4c4c).
  const env = ctx.stage?.scene?.environment || null;
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(HS.colour || '#1c1c1e'), metalness: HS.pbr?.metalness ?? 0.7, roughness: HS.pbr?.roughness ?? 0.35,
    envMap: env, envMapIntensity: 0.32,
  });
  faceMat.name = 'blackOxideHand';
  const edgeMat = faceMat.clone();
  edgeMat.roughness = 0.24;
  edgeMat.metalness = 0.8;
  edgeMat.envMapIntensity = 0.55;
  edgeMat.color = new THREE.Color(0x202023);
  edgeMat.name = 'blackOxideHandEdge';
  // Polished steel cap and seconds ring: so small that they read as bright white dots in
  // every photo — a hair softer than mirror polish so the studio's black flags do not
  // draw dark bands across them.
  const steel = M.steelPolished.clone();
  steel.roughness = 0.2;
  steel.color = new THREE.Color(0xe6e8eb);
  steel.name = 'capSteel';
  const darkMat = M.black;

  const BEVEL = 0.02;
  // Flat blade with softly rounded edges; z from 0 to `thick`. The bevel is inset
  // (bevelOffset) so the side walls lie exactly on the outline.
  function blade(outline, thick) {
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thick - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL,
      bevelOffset: -BEVEL, bevelSegments: lite ? 2 : 3, curveSegments: 4,
    });
    geo.translate(0, 0, BEVEL);
    return geo;
  }
  // Single-material meshes (the registry's X-ray / highlight clone mesh.material): the flat
  // blade faces in satin, the blade's edges merged with the collet in the glossier finish.
  function subGeo(geo, group) {
    const g = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geo.attributes)) {
      if (name === 'uv') continue;
      const k = attr.itemSize;
      g.setAttribute(name, new THREE.BufferAttribute(attr.array.slice(group.start * k, (group.start + group.count) * k), k));
    }
    return g;
  }
  function handMeshes(rotor, name, bladeGeo, colletGeo) {
    const faces = subGeo(bladeGeo, bladeGeo.groups[0]);
    const c = colletGeo.toNonIndexed();
    const edges = mergeGeometries([subGeo(bladeGeo, bladeGeo.groups[1]), c], false);
    for (const [geo, mat, suffix] of [[faces, faceMat, 'blade'], [edges, edgeMat, 'collet']]) {
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `${name}-${suffix}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rotor.add(mesh);
    }
  }
  function part(name, geo, mat, rotor) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rotor.add(mesh);
    return mesh;
  }

  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const frac = (v) => ((v % 1) + 1) % 1;
  function mount(name, x, y, z) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, z);
    const rotor = new THREE.Group();
    rotor.name = `${name}-rotor`;
    object.add(rotor);
    root.add(object);
    return { object, rotor };
  }
  // the label anchor follows the blade (registry anchors live in object space)
  const followBlade = (L, z) => (state, p) => {
    const a = p.rotor.rotation.z;
    p.anchorVec.set(-Math.sin(a) * L, Math.cos(a) * L, z);
  };

  // ---------------------------------------------------------------- hour hand
  {
    const h = HS.hour;
    const { object, rotor } = mount('hour-hand', 0, 0, Z.hourHand);
    const Rc = HS.hourCollet, bore = HS.bores.hour;
    const Hc = Z.hourColletTop - Z.hourHand; // 0.18: a flat disc, thicker than the blade
    const outline = threadOutline({ tip: h.tip, width: h.width, taper: h.taper, y0: Rc - 0.3 });
    handMeshes(rotor, 'hour-hand', blade(outline, T), lathe(colletStrips(Rc, Hc, bore, 0.045), SEG));
    const L = h.tip;
    reg.add({
      id: 'hour-hand', name: 'Hour hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'hourHand' }, exposed: true, priority: 1,
      explode: ex('hour-hand'), explodeDelay: spec.explodeDelay('hour-hand'),
      anchor: [0, L * 0.62, T], update: followBlade(L * 0.62, T),
      description: 'Shows the hours. It is pressed onto the hour-wheel pipe, which the motion works turn once in 12 hours. All three hands are black-oxidised steel: a thin black oxide layer grown on the metal, then satin-finished — not paint, and not the heat-blued steel of other NOMOS models.',
      facts: {
        Material: 'Steel, black oxidised, satin',
        Length: `${L.toFixed(2)} mm`,
        Width: `${h.width.toFixed(2)} mm, pointed over the last ${h.taper.toFixed(2)} mm`,
        Thickness: `${T.toFixed(2)} mm`,
        Collet: `Ø ${(2 * Rc).toFixed(2)} mm, flat`,
        Seat: `Hour-wheel pipe, Ø ${(2 * bore - 0.01).toFixed(2)} mm`,
        Speed: '1 turn in 12 h',
      },
      live: (s) => {
        const tot = frac(-s.rot.hourHand / TAU) * 720; // minutes on a 12-hour dial
        const hh = Math.floor(tot / 60) || 12;
        return `${hh}:${pad(Math.floor(tot % 60))}`;
      },
    });
  }

  // ---------------------------------------------------------------- minute hand
  {
    const m = HS.minute;
    const { object, rotor } = mount('minute-hand', 0, 0, Z.minuteHand);
    const Rc = HS.minuteCollet, bore = HS.bores.minute;
    const Hc = Z.minuteColletTop - Z.minuteHand; // 0.18
    const outline = threadOutline({ tip: m.tip, width: m.width, taper: m.taper, y0: Rc - 0.25 });
    handMeshes(rotor, 'minute-hand', blade(outline, T), lathe(colletStrips(Rc, Hc, bore, 0.04), SEG));
    // Polished domed steel centre cap, seated on the cannon-pinion top and just covering
    // the collet's bore edge; it mirrors the bright studio and reads almost white.
    const seat = Z.cannonTop - Z.minuteHand, top = Z.centerCapTop - Z.minuteHand, cr = HS.capRadius;
    const dome = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, r = cr * (1 - t);
      dome.push([r, Hc + 0.01 + (top - Hc - 0.01) * Math.sqrt(1 - (r / cr) ** 2.2)]);
    }
    part('centre-cap', lathe([
      [[0.001, seat], [bore - 0.01, seat]],
      [[bore - 0.01, seat], [bore - 0.01, Hc + 0.001]],
      [[bore - 0.01, Hc + 0.001], [cr, Hc + 0.001]],
      [[cr, Hc + 0.001], ...dome],
    ], lite ? 32 : 48), steel, rotor);
    const L = m.tip;
    reg.add({
      id: 'minute-hand', name: 'Minute hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'minuteHand' }, exposed: true, priority: 1,
      explode: ex('minute-hand'), explodeDelay: spec.explodeDelay('minute-hand'),
      anchor: [0, L * 0.7, T], update: followBlade(L * 0.7, T),
      description: 'Shows the minutes; its tip just reaches into the minute track. It sits on the cannon pinion, which grips the centre-wheel arbor by friction and turns once an hour — that friction lets you set the hands without stopping the going train.',
      facts: {
        Material: 'Steel, black oxidised, satin',
        Length: `${L.toFixed(2)} mm`,
        Width: `${m.width.toFixed(2)} mm, pointed over the last ${m.taper.toFixed(2)} mm`,
        Thickness: `${T.toFixed(2)} mm`,
        Collet: `Ø ${(2 * Rc).toFixed(2)} mm black, polished steel cap Ø ${(2 * cr).toFixed(2)} mm`,
        Seat: `Cannon pinion, Ø ${(2 * bore - 0.01).toFixed(2)} mm`,
        Speed: '1 turn per hour',
      },
      live: (s) => {
        const mins = frac(-s.rot.minuteHand / TAU) * 60;
        return `${Math.floor(mins)} min ${pad(Math.floor((mins % 1) * 60))} s`;
      },
    });
  }

  // ---------------------------------------------------------------- seconds hand
  {
    const sc = HS.seconds;
    const { object, rotor } = mount('seconds-hand', scx, scy, Z.secondsHand);
    const outline = secondsOutline({ tip: sc.tip, tail: sc.tail, width: sc.width });
    const Rh = sc.hubRadius, rr = sc.ringRadius, bore = HS.bores.seconds;
    const hubTop = Z.secondsHubTop - Z.secondsHand; // 0.12: the polished pipe ring's top
    const discTop = hubTop - 0.02; // black hub disc, just under the ring
    // black hub disc round the polished pipe
    const disc = lathe([
      [[rr, 0], [Rh - 0.01, 0]],
      [[Rh - 0.01, 0], [Rh, 0.01]],
      [[Rh, 0.01], [Rh, discTop - 0.03], ...arcRZ(Rh - 0.025, discTop - 0.025, 0.025, 0, 90, 4), [Rh - 0.03, discTop], [rr, discTop]],
    ], SEG);
    handMeshes(rotor, 'seconds-hand', blade(outline, TS), disc);
    // the hand's pipe: a polished steel ring Ø 0.40 round the dark arbor hole Ø 0.16
    const ring = lathe([[[rr, 0], [rr, hubTop - 0.012], [rr - 0.012, hubTop], [bore + 0.012, hubTop], [bore, hubTop - 0.012], [bore, 0]]], lite ? 24 : 40);
    part('seconds-pipe', ring, steel, rotor);
    const holeGeo = new THREE.CircleGeometry(bore + 0.002, 20);
    holeGeo.translate(0, 0, hubTop - 0.03);
    const hole = part('seconds-hole', holeGeo, darkMat, rotor);
    hole.castShadow = false;
    reg.add({
      id: 'seconds-hand', name: 'Seconds hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'secondHand' }, exposed: true, priority: 1,
      explode: ex('seconds-hand'), explodeDelay: spec.explodeDelay('seconds-hand'),
      anchor: [0, sc.tip * 0.7, TS], update: followBlade(sc.tip * 0.7, TS),
      description: 'The small seconds hand sits directly on the fourth-wheel arbor, which turns once a minute. It moves in six small jumps every second, one for each beat of the balance, because the escapement releases the gear train beat by beat.',
      facts: {
        Material: 'Steel, black oxidised, satin',
        Length: `${sc.tip.toFixed(2)} mm + ${sc.tail.toFixed(2)} mm tail`,
        Width: `${sc.width.toFixed(2)} mm, square tip and tail`,
        Thickness: `${TS.toFixed(2)} mm`,
        Hub: `Ø ${(2 * Rh).toFixed(1)} mm black, polished ring Ø ${(2 * rr).toFixed(2)} mm`,
        Seat: 'Fourth-wheel arbor',
        Motion: '6 steps per second (21,600 A/h)',
      },
      live: (s) => `${(frac(-s.rot.secondHand / TAU) * 60).toFixed(1)} s`,
    });
  }
}
