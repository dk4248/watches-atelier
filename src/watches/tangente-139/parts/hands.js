// Hands of the NOMOS Tangente ref. 139: three flat, thermally blued steel hands
// ("cornflower blue", tempered at ~290 °C) with domed blued collets.
//
// Each hand is a flat blade with slightly rounded, polished edges plus a domed collet.
// Hands point to 12 (+Y) at rotation 0; the registry drives rotor.rotation.z from the
// kinematics (hourHand / minuteHand / secondHand: clockwise = negative).
//
// Heights (spec.z, research/synthesis.md §2 from ETA 7001 hand-fitting data):
//   seconds blade 0.30–0.38, hub to 0.42 (fourth arbor tip 0.38)
//   hour    blade 0.70–0.80, collet to 0.90 (hour-wheel pipe top 0.89)
//   minute  blade 1.02–1.12, collet to 1.20 (cannon-pinion top 1.19), centre cap 1.25
// Hand holes [ETA]: hour Ø1.30 (hour-wheel pipe), minute Ø0.80 (cannon pinion),
// seconds Ø0.17 (fourth arbor).

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

// Stick hand outline (CCW): hub disc of radius hubR merged with a blade from the hub to
// length L, width w0 at the hub tapering to w1, then a lance point over `taper`.
function stickOutline({ L, w0, w1, taper, hubR, hubSegs = 72, tipSegs = 10 }) {
  const yc = Math.sqrt(hubR * hubR - (w0 / 2) * (w0 / 2));
  const yT = L - taper;
  const right = [[w0 / 2, yc], [w1 / 2, yT]];
  for (let i = 1; i <= tipSegs; i++) {
    const t = i / tipSegs;
    const x = Math.max(0.011, (w1 / 2) * (1 - Math.pow(t, 1.3))); // lancet, barely convex
    right.push([x, yT + (taper - 0.004) * t]);
  }
  const left = right.map(([x, y]) => [-x, y]).reverse();
  const pts = [...right, ...left];
  // hub arc from the left blade edge round the bottom to the right blade edge
  const a0 = Math.atan2(yc, -w0 / 2), a1 = Math.atan2(yc, w0 / 2) + TAU;
  const n = Math.max(8, Math.round((hubSegs * (a1 - a0)) / TAU));
  for (let i = 1; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([hubR * Math.cos(a), hubR * Math.sin(a)]);
  }
  return pts;
}

// Seconds hand outline (CCW): straight blade of `width`, tip at +tip with a slightly
// pointed end (tapering over the last `tipTaper` to a small rounded point, per
// research/synthesis.md §4), square tail end (corners eased by `ease`) at −tail, hub
// disc hubR.
function secondsOutline({ tip, tail, width, hubR, tipTaper = 0.2, tipR = 0.035, ease = 0.025, hubSegs = 64 }) {
  const h = width / 2;
  const yc = Math.sqrt(hubR * hubR - h * h);
  const pts = [];
  const arc = (cx, cy, r, a0, a1, n) => { for (let i = 1; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  // right edge up to the start of the point, a gently convex taper to the rounded tip
  const y0 = tip - tipTaper;
  const yR = tip - tipR; // centre of the tip rounding
  pts.push([h, yc], [h, y0]);
  const K = 6;
  for (let i = 1; i <= K; i++) {
    const t = i / K;
    pts.push([tipR + (h - tipR) * (1 - t * t), y0 + (yR - y0) * t]);
  }
  arc(0, yR, tipR, 0, Math.PI, 10);
  for (let i = K; i >= 1; i--) {
    const t = i / K;
    pts.push([-(tipR + (h - tipR) * (1 - t * t)), y0 + (yR - y0) * t]);
  }
  pts.push([-h, y0], [-h, yc]);
  const aL0 = Math.atan2(yc, -h), aL1 = Math.atan2(-yc, -h) + TAU;
  arc(0, 0, hubR, aL0, aL1, Math.round((hubSegs * (aL1 - aL0)) / TAU));
  // square tail with eased corners
  pts.push([-h, -yc], [-h, -tail + ease]);
  arc(-h + ease, -tail + ease, ease, Math.PI, 1.5 * Math.PI, 4);
  pts.push([-h + ease, -tail], [h - ease, -tail]);
  arc(h - ease, -tail + ease, ease, 1.5 * Math.PI, TAU, 4);
  pts.push([h, -tail + ease], [h, -yc]);
  const aR0 = Math.atan2(-yc, h), aR1 = Math.atan2(yc, h);
  arc(0, 0, hubR, aR0, aR1, Math.round((hubSegs * (aR1 - aR0)) / TAU));
  return pts;
}

export function buildHands(ctx) {
  const { THREE, spec, M, reg, root } = ctx;
  const Z = spec.z, HS = spec.hands;
  const T = Z.handThickness; // hour and minute blades
  const TS = Z.secondsHandThickness ?? T; // seconds blade
  const [scx, scy] = spec.dial.subdial.center;

  // Blued steel (clone of M.blued). The NOMOS photos show a deep cornflower blue, hue
  // 204–213° (medians of all blue pixels: front.jpg #0b436d, detail1.jpg #1f6fa4,
  // detail2.jpg #386193). The earlier, brighter setting rendered #3273d3 face-on and
  // washed out to pale sky blue (#76b6ff) where the blades mirror the studio's soft
  // boxes. This base colour, with an explicitly bound environment at reduced strength
  // (so envMapIntensity counts), renders ≈ #1866ab in the UI's dial view and stays
  // saturated at every angle; only the key light's own glint, at a narrow angle,
  // still lightens it. Bevels and collets are polished.
  const env = ctx.stage?.scene?.environment || null;
  const faceMat = M.blued.clone();
  faceMat.color.set(0x1c5f9c);
  faceMat.roughness = 0.32;
  faceMat.iridescence = 0.15;
  faceMat.envMap = env;
  faceMat.envMapIntensity = 0.62;
  faceMat.name = 'bluedHand';
  const edgeMat = faceMat.clone();
  edgeMat.roughness = 0.18;
  edgeMat.name = 'bluedHandPolished';
  const pinMat = M.steelPolished;

  const BEVEL = 0.022;
  // Flat blade with polished, slightly rounded edges; z from 0 to `thick`. The bevel is
  // inset (bevelOffset) so the side walls lie exactly on the outline.
  function plate(outline, boreR, thick) {
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    if (boreR) {
      const hole = [];
      for (let i = 0; i < 40; i++) hole.push(new THREE.Vector2(boreR * Math.cos((i / 40) * TAU), boreR * Math.sin((i / 40) * TAU)));
      shape.holes.push(new THREE.Path(hole));
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thick - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL,
      bevelOffset: -BEVEL, bevelSegments: 3, curveSegments: 4,
    });
    geo.translate(0, 0, BEVEL);
    return geo;
  }
  // Lathe about the hand's axis from a profile [[r, z], …] (outer bottom → over the top
  // → down the bore, so the normals face outwards).
  function lathe(profile, segs) {
    const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segs);
    g.rotateX(Math.PI / 2);
    return g;
  }
  // Two single-material meshes per hand: the flat blade faces, and the polished edges
  // merged with the collet. (Single materials, not a material array: the registry's
  // X-ray / highlight code clones mesh.material and fails on arrays.)
  function subGeo(geo, group) {
    const g = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const k = attr.itemSize;
      g.setAttribute(name, new THREE.BufferAttribute(attr.array.slice(group.start * k, (group.start + group.count) * k), k));
    }
    return g;
  }
  function handMeshes(rotor, name, plateGeo, colletGeo) {
    const p = plateGeo; // non-indexed, groups: 0 lids, 1 sides
    p.deleteAttribute('uv');
    const c = colletGeo.toNonIndexed();
    c.deleteAttribute('uv');
    const faces = subGeo(p, p.groups[0]);
    const edges = mergeGeometries([subGeo(p, p.groups[1]), c], false);
    for (const [geo, mat, suffix] of [[faces, faceMat, 'blade'], [edges, edgeMat, 'collet']]) {
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `${name}-${suffix}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rotor.add(mesh);
    }
  }
  function pinMesh(name, profile, segs) {
    const mesh = new THREE.Mesh(lathe(profile, segs), pinMat);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const frac = (v) => ((v % 1) + 1) % 1;

  // Hands are stored as a Group at the arbor (object) with a rotor child.
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
  // The label anchor follows the blade (registry anchors live in object space).
  const followBlade = (L, z) => (state, p) => {
    const a = p.rotor.rotation.z;
    p.anchorVec.set(-Math.sin(a) * L, Math.cos(a) * L, z);
  };

  // ---------------------------------------------------------------- hour hand
  {
    const h = HS.hour;
    const { object, rotor } = mount('hour-hand', 0, 0, Z.hourHand);
    const Rc = HS.hourCollet;
    const outline = stickOutline({ L: h.tip, w0: h.widthHub, w1: h.widthTip, taper: h.taper, hubR: Rc });
    // Collet: a dome rising 0.10 above the blade (top 0.90) with a narrow flat ring
    // round the bore; the bore (Ø1.31) takes the hour-wheel pipe (Ø1.30, top 0.89).
    const top = 0.2;
    const bore = 0.655;
    const collet = lathe([
      [Rc - 0.012, T - 0.012], [Rc - 0.014, T + 0.012], [Rc - 0.04, T + 0.042], [Rc - 0.1, T + 0.07],
      [Rc - 0.19, T + 0.088], [0.8, top - 0.004], [0.74, top], [0.69, top], [0.665, top - 0.01],
      [bore, top - 0.025], [bore, T - 0.02],
    ], 72);
    handMeshes(rotor, 'hour-hand', plate(outline, bore, T), collet);
    const L = h.tip;
    reg.add({
      id: 'hour-hand', name: 'Hour hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'hourHand' }, exposed: true, priority: 1,
      explode: ex('hour-hand'), explodeDelay: spec.explodeDelay('hour-hand'),
      anchor: [0, L * 0.62, T], update: followBlade(L * 0.62, T),
      description: 'Shows the hours. It is pressed onto the hour-wheel pipe, which the motion works turn once every 12 hours. The blue is not paint: heating the polished steel to about 290 °C grows a thin oxide film whose interference colour is this cornflower blue.',
      facts: {
        Material: 'Steel, thermally blued',
        Length: `${L.toFixed(2)} mm`,
        Width: `${h.widthHub.toFixed(2)} → ${h.widthTip.toFixed(2)} mm`,
        Thickness: `${T.toFixed(2)} mm`,
        Collet: `Ø ${(2 * Rc).toFixed(2)} mm, domed`,
        Seat: 'Hour-wheel pipe, Ø 1.30 mm',
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
    const c = HS.minuteCollet;
    const outline = stickOutline({ L: m.tip, w0: m.widthHub, w1: m.widthTip, taper: m.taper, hubR: c });
    // Collet: dome to 0.18 above the blade bottom (top 1.20); the open bore (Ø0.81)
    // sits on the cannon-pinion pipe (Ø0.80, top 1.19), whose end shows round the cap.
    const top = 0.18;
    const bore = 0.405;
    const collet = lathe([
      [c - 0.012, T - 0.012], [c - 0.014, T + 0.012], [c - 0.035, T + 0.036], [c - 0.08, T + 0.06],
      [c - 0.15, T + 0.075], [0.47, top - 0.002], [0.44, top], [0.418, top - 0.008], [bore, top - 0.02],
      [bore, T - 0.02],
    ], 56);
    handMeshes(rotor, 'minute-hand', plate(outline, bore, T), collet);
    // Polished steel centre cap (Ø0.55) seated on the cannon-pinion top, top at
    // spec.z.centerCapTop.
    const seat = Z.cannonPinion[1] - Z.minuteHand;
    const capTop = Z.centerCapTop - Z.minuteHand;
    const pr = HS.pinRadius;
    rotor.add(pinMesh('centre-cap', [
      [0.0001, seat], [pr - 0.01, seat], [pr, seat + 0.01], [pr, capTop - 0.025], [pr - 0.025, capTop - 0.008],
      [pr - 0.08, capTop - 0.001], [pr - 0.16, capTop], [0.0001, capTop],
    ], 40));
    const L = m.tip;
    reg.add({
      id: 'minute-hand', name: 'Minute hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'minuteHand' }, exposed: true, priority: 1,
      explode: ex('minute-hand'), explodeDelay: spec.explodeDelay('minute-hand'),
      anchor: [0, L * 0.7, T], update: followBlade(L * 0.7, T),
      description: 'Shows the minutes, reaching two-thirds of the way into the minute track. It sits on the cannon pinion, which grips the centre-wheel arbor by friction and turns once an hour; that friction lets you set the hands without stopping the gear train.',
      facts: {
        Material: 'Steel, thermally blued',
        Length: `${L.toFixed(2)} mm`,
        Width: `${m.widthHub.toFixed(2)} → ${m.widthTip.toFixed(2)} mm`,
        Thickness: `${T.toFixed(2)} mm`,
        Collet: `Ø ${(2 * c).toFixed(2)} mm, domed, polished steel centre cap Ø ${(2 * pr).toFixed(2)} mm`,
        Seat: 'Cannon pinion, Ø 0.80 mm',
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
    const outline = secondsOutline({ tip: sc.tip, tail: sc.tail, width: sc.width, hubR: sc.hubRadius });
    const r = sc.hubRadius;
    const pr = sc.pinRadius ?? 0.15;
    // Hub top 0.42 (spec.z comment): the blued collet domes 0.04 above the blade and
    // hugs the light steel pin that caps the fourth-wheel arbor (Ø0.17, tip at 0.38).
    const top = 0.12;
    const collet = lathe([
      [r - 0.012, TS - 0.012], [r - 0.014, TS + 0.008], [r - 0.04, TS + 0.022], [r - 0.12, TS + 0.034],
      [0.3, top - 0.003], [0.2, top], [pr + 0.004, top - 0.004], [pr + 0.002, TS - 0.02],
    ], 48);
    handMeshes(rotor, 'seconds-hand', plate(outline, 0.09, TS), collet);
    rotor.add(pinMesh('seconds-pin', [
      [0.0001, TS + 0.001], [pr, TS + 0.001], [pr, top - 0.006], [pr - 0.02, top + 0.002],
      [pr - 0.07, top + 0.006], [0.0001, top + 0.007],
    ], 32));
    reg.add({
      id: 'seconds-hand', name: 'Seconds hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'secondHand' }, exposed: true, priority: 1,
      explode: ex('seconds-hand'), explodeDelay: spec.explodeDelay('seconds-hand'),
      anchor: [0, sc.tip * 0.7, TS], update: followBlade(sc.tip * 0.7, TS),
      description: 'The small seconds hand sits directly on the fourth-wheel arbor, which turns once a minute. It moves in six tiny jumps every second, one for each beat of the balance, because the escapement releases the gear train beat by beat.',
      facts: {
        Material: 'Steel, thermally blued',
        Length: `${sc.tip.toFixed(2)} mm + ${sc.tail.toFixed(2)} mm tail`,
        Width: `${sc.width.toFixed(2)} mm`,
        Thickness: `${TS.toFixed(2)} mm`,
        Seat: 'Fourth-wheel arbor, Ø 0.17 mm',
        Motion: '6 steps per second (21,600 A/h)',
        Speed: '1 turn per minute',
      },
      live: (s) => `${(frac(-s.rot.secondHand / TAU) * 60).toFixed(1)} s`,
    });
  }
}
