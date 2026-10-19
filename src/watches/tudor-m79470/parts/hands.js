// HANDS of the Tudor Black Bay Pro M79470-0004: the "Snowflake" local hour hand (it can be
// jumped hour by hour), the yellow 24-hour GMT hand, the minute hand, and the lollipop
// seconds hand with its counterweight.
//
// Outlines are the measured ones (SPEC.hands, research/tudor-m79470/exterior.md §4): the
// matte, finely textured BLACK body is the "black outline" — a frame round a window filled
// with white Super-LumiNova, flush and slightly domed; the GMT hand is yellow lacquer round
// a white lume square. Each blade is extruded with 0.02 bevels on its edges; the collets are
// black lathes stacked hour (Ø3.0) → GMT (Ø2.6) → minute (Ø2.3) → seconds boss (Ø1.9) with
// a polished steel pin. Blade bottoms are SPEC.z.*Hand; the bores sit on builder C's pipes.
// Hands point to 12 (+Y) at rotation 0; the registry drives rotor.rotation.z.

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { meshStarRegion, polygonArea } from './glyphs.js';

const TAU = Math.PI * 2;

// ---- module-local cosmetics
const BEVEL = 0.02; // blade edge bevel
const COLLET_ROUND = 0.05; // radius of the collets' top outer edge
const PEBBLE_MM = 2.3; // the black coating's grain: one texture tile per 2.3 mm (≈0.04 mm grains)
const LUME_DOME = { hour: 0.03, gmt: 0.02, minute: 0.025, seconds: 0.015 };
const LUME_CENTRE = { hour: [0, 6.9], gmt: [0, 8.4], minute: [0, 7.3], seconds: [0, 8.92] }; // star centres of the windows
const LUME_MESH = { full: { step: 0.04, rings: 5 }, lite: { step: 0.1, rings: 2 } };
const LUME_EDGE = 0.12;

const ccw = (pts) => (polygonArea(pts) > 0 ? pts : pts.slice().reverse());
const flat = (g) => (g.index ? g.toNonIndexed() : g); // ExtrudeGeometry is already non-indexed

export function buildHands(ctx) {
  const { THREE, spec, M, reg, root, stage } = ctx;
  const Z = spec.z, HS = spec.hands;
  const lite = !!ctx.lite;
  const env = stage?.scene?.environment || null;
  const lm = lite ? LUME_MESH.lite : LUME_MESH.full;

  // ---- materials
  const pebbleN = M.textures?.leather?.normalMap || null; // fine pebbled grain (tiles; mm UVs)
  const blackMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(HS.finish.black.colour), metalness: 0, roughness: HS.finish.black.roughness,
    normalMap: pebbleN, normalScale: new THREE.Vector2(0.55, 0.55), specularIntensity: 0.6, envMap: env, envMapIntensity: 0.7,
  });
  blackMat.name = 'handBlack';
  const yellowMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(HS.finish.gmt.colour), metalness: 0, roughness: HS.finish.gmt.roughness,
    normalMap: pebbleN, normalScale: new THREE.Vector2(0.3, 0.3), clearcoat: 0.25, clearcoatRoughness: 0.4,
    envMap: env, envMapIntensity: 0.8,
  });
  yellowMat.name = 'handGmtYellow';
  const lumeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(HS.finish.lume.colour), metalness: 0, roughness: HS.finish.lume.roughness,
    sheen: 0.2, sheenColor: new THREE.Color(0xffffff), emissive: new THREE.Color(HS.finish.lume.emissive), emissiveIntensity: 0.02,
    envMap: env, envMapIntensity: 0.55,
  });
  lumeMat.name = 'handLume';
  const pinMat = M.steelPolished;

  // ---- geometry helpers
  const mmUV = (geo) => ctx.planarUV(geo, 1 / PEBBLE_MM);

  // Blade: outline with the lume window as a hole (and the bore, when it lies inside the
  // blade), extruded from z 0 to `thick` with bevelled edges.
  function blade(outline, holes, thick) {
    const shape = new THREE.Shape(ccw(outline).map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) shape.holes.push(new THREE.Path(ccw(h).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thick - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL,
      bevelOffset: -BEVEL, bevelSegments: lite ? 1 : 2, curveSegments: 1,
    });
    geo.translate(0, 0, BEVEL);
    geo.deleteAttribute('uv');
    mmUV(geo);
    return geo;
  }
  // Lume window: flush with the blade top at its edge, domed by `dome` in the middle, with
  // a flat underside (seen when exploded).
  function lumeCap(outline, centre, thick, dome) {
    const m = meshStarRegion(ccw(outline), centre, { rings: lm.rings, step: lm.step });
    const edgeW = Math.min(LUME_EDGE, Math.max(...m.dist)); // rounded rise at the frame, flat inside
    const pos = [];
    const n = m.xy.length;
    for (let i = 0; i < n; i++) {
      const f = Math.min(1, m.dist[i] / edgeW);
      pos.push(m.xy[i][0], m.xy[i][1], thick - 0.003 + dome * (1 - (1 - f) * (1 - f)));
    }
    for (let i = 0; i < n; i++) pos.push(m.xy[i][0], m.xy[i][1], 0.01);
    const idx = [...m.index];
    for (let t = 0; t < m.index.length; t += 3) idx.push(m.index[t] + n, m.index[t + 2] + n, m.index[t + 1] + n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  // Collet / boss: a ring from z 0 to h with a rounded top outer edge, bore `bore`; an
  // optional countersink round the bore (the seconds boss, round its pin).
  function collet(rOut, bore, h, { sink = 0 } = {}) {
    const f = Math.min(COLLET_ROUND, h * 0.4);
    const prof = [[rOut, 0], [rOut, h - f]];
    const n = lite ? 3 : 6;
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * (Math.PI / 2);
      prof.push([rOut - f + f * Math.cos(a), h - f + f * Math.sin(a)]);
    }
    if (sink > 0) prof.push([bore + sink, h], [bore + 0.01, h - sink * 0.6]);
    else prof.push([bore + 0.02, h], [bore, h - 0.02]);
    prof.push([bore, 0], [rOut - 0.001, 0]);
    const geo = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), lite ? 32 : 72);
    geo.rotateX(Math.PI / 2);
    geo.deleteAttribute('uv');
    mmUV(geo);
    return geo;
  }
  // The blade's root continues into its collet, stopping short of the bore (the collet
  // covers it): replace the measured root edge by edges running down to y0.
  function rootInto(outline, bore) {
    const pts = outline.map((p) => [p[0], p[1]]);
    const a = pts[0], b = pts[pts.length - 1]; // root corners (right, left)
    const w = Math.max(Math.abs(a[0]), Math.abs(b[0]));
    const y0 = Math.sqrt(Math.max(0, (bore + 0.08) ** 2 - w * w));
    if (Math.min(a[1], b[1]) <= y0) return pts;
    return [[a[0], y0], ...pts, [b[0], y0]];
  }
  function circle(r, n) {
    return Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * TAU), r * Math.sin((i / n) * TAU)]);
  }
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  function mount(name, z) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(0, 0, z);
    const rotor = new THREE.Group();
    rotor.name = `${name}-rotor`;
    object.add(rotor);
    root.add(object);
    return { object, rotor };
  }
  const followBlade = (L, z) => (state, p) => {
    const a = p.rotor.rotation.z;
    p.anchorVec.set(-Math.sin(a) * L, Math.cos(a) * L, z);
  };
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const frac = (v) => ((v % 1) + 1) % 1;
  const mm = (v) => `${v.toFixed(2)} mm`;

  // ================================================================ hour hand (local, jumping)
  {
    const h = HS.hour;
    const T = h.thickness;
    const { object, rotor } = mount('hour-hand', h.z);
    const body = blade(rootInto(h.outline, h.bore), [h.lumeOutline], T);
    const col = collet(h.collet.radius, h.bore, h.collet.height);
    const bm = shadowed(new THREE.Mesh(mergeGeometries([flat(body), flat(col)]), blackMat));
    bm.name = 'hour-hand-body';
    const lumeM = shadowed(new THREE.Mesh(lumeCap(h.lumeOutline, LUME_CENTRE.hour, T, LUME_DOME.hour), lumeMat));
    lumeM.name = 'hour-hand-lume';
    rotor.add(bm, lumeM);
    const L = 6.9;
    reg.add({
      id: 'hour-hand', name: 'Hour hand (local time)', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'hourHand' }, exposed: true, priority: 1,
      explode: ex('hour-hand'), explodeDelay: spec.explodeDelay('hour-hand'),
      anchor: [0, L, T], update: followBlade(L, T),
      description: 'Shows the local hour with Tudor\'s "Snowflake" diamond. It sits on the local hour wheel, which a spring jumper holds in 12 notches: when travelling you pull the crown to its middle position and jump this hand hour by hour, forwards or back, while the watch keeps running and the date follows it.',
      facts: {
        Style: 'Snowflake, black outline with Super-LumiNova',
        Length: mm(h.tip),
        Thickness: `${T.toFixed(2)} mm (estimate)`,
        Collet: `Ø ${(2 * h.collet.radius).toFixed(1)} mm`,
        Setting: 'Jumps in 1-hour steps (GMT function)',
        Speed: '1 turn in 12 h',
      },
      live: (s) => {
        const tot = frac(-s.rot.hourHand / TAU) * 720; // minutes on a 12-hour dial
        const hh = Math.floor(tot / 60) || 12;
        return `local ${hh}:${pad(Math.floor(tot % 60))}`;
      },
    });
  }

  // ================================================================ GMT (24-hour) hand
  {
    const h = HS.gmt;
    const T = h.thickness;
    const { object, rotor } = mount('gmt-hand', h.z);
    const body = shadowed(new THREE.Mesh(blade(rootInto(h.outline, h.bore), [h.lumeOutline], T), yellowMat));
    body.name = 'gmt-hand-body';
    const col = shadowed(new THREE.Mesh(collet(h.collet.radius, h.bore, h.collet.height), blackMat));
    col.name = 'gmt-hand-collet';
    const lumeM = shadowed(new THREE.Mesh(lumeCap(h.lumeOutline, LUME_CENTRE.gmt, T, LUME_DOME.gmt), lumeMat));
    lumeM.name = 'gmt-hand-lume';
    rotor.add(body, col, lumeM);
    const L = 8.4;
    reg.add({
      id: 'gmt-hand', name: 'GMT hand (24-hour)', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'hand24' }, exposed: true, priority: 1,
      explode: ex('gmt-hand'), explodeDelay: spec.explodeDelay('gmt-hand'),
      anchor: [0, L, T], update: followBlade(L, T),
      description: 'The yellow 24-hour hand goes round once a day and reads against the 24-hour bezel, so it keeps your home time — and tells day from night — while the hour hand is set to local time. It is driven by its own 24-hour wheel and is not moved when the local hour is jumped.',
      facts: {
        Colour: 'Yellow lacquer, white lume square',
        Length: `${h.tip.toFixed(2)} mm (just past the minute track)`,
        Thickness: `${T.toFixed(2)} mm (estimate)`,
        Reads: '24-hour bezel',
        Speed: '1 turn in 24 h',
      },
      live: (s) => {
        const hrs = frac(-s.rot.hand24 / TAU) * 24;
        return `home ${pad(Math.floor(hrs))}:${pad(Math.floor((hrs % 1) * 60))} (24 h)`;
      },
    });
  }

  // ================================================================ minute hand
  {
    const h = HS.minute;
    const T = h.thickness;
    const { object, rotor } = mount('minute-hand', h.z);
    const body = blade(rootInto(h.outline, h.bore), [h.lumeOutline], T);
    const col = collet(h.collet.radius, h.bore, h.collet.height);
    const bm = shadowed(new THREE.Mesh(mergeGeometries([flat(body), flat(col)]), blackMat));
    bm.name = 'minute-hand-body';
    const lumeM = shadowed(new THREE.Mesh(lumeCap(h.lumeOutline, LUME_CENTRE.minute, T, LUME_DOME.minute), lumeMat));
    lumeM.name = 'minute-hand-lume';
    rotor.add(bm, lumeM);
    const L = h.tip * 0.72;
    reg.add({
      id: 'minute-hand', name: 'Minute hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'minuteHand' }, exposed: true, priority: 1,
      explode: ex('minute-hand'), explodeDelay: spec.explodeDelay('minute-hand'),
      anchor: [0, L, T], update: followBlade(L, T),
      description: 'A straight black baton filled with lume that reaches right to the minute track. It is pressed onto the cannon pinion, which turns once an hour and slips on its arbor when you set the time.',
      facts: {
        Length: `${h.tip.toFixed(2)} mm (to the minute track)`,
        Width: `${(2 * h.outline[0][0]).toFixed(2)} mm`,
        Thickness: `${T.toFixed(2)} mm (estimate)`,
        Collet: `Ø ${(2 * h.collet.radius).toFixed(1)} mm`,
        Speed: '1 turn per hour',
      },
      live: (s) => {
        const mins = frac(-s.rot.minuteHand / TAU) * 60;
        return `${Math.floor(mins)} min ${pad(Math.floor((mins % 1) * 60))} s`;
      },
    });
  }

  // ================================================================ seconds hand
  {
    const h = HS.seconds;
    const T = h.thickness;
    const { object, rotor } = mount('seconds-hand', h.z);
    const body = blade(h.outline, [h.lumeOutline, circle(h.bore, 16)], T);
    const boss = collet(h.boss.radius, h.bore, h.boss.height, { sink: 0.09 });
    const bm = shadowed(new THREE.Mesh(mergeGeometries([flat(body), flat(boss)]), blackMat));
    bm.name = 'seconds-hand-body';
    const lumeM = shadowed(new THREE.Mesh(lumeCap(h.lumeOutline, LUME_CENTRE.seconds, T, LUME_DOME.seconds), lumeMat));
    lumeM.name = 'seconds-hand-lume';
    // polished steel pin capping the arbor, its dome at SPEC pinTopZ
    const pr = h.pin.radius, pTop = HS.pinTopZ - h.z, pBot = h.boss.height - 0.06;
    const pin = new THREE.LatheGeometry([
      [0.0001, pBot], [pr, pBot], [pr, pTop - 0.03], [pr * 0.8, pTop - 0.008], [pr * 0.45, pTop - 0.001], [0.0001, pTop],
    ].map(([r, z]) => new THREE.Vector2(r, z)), lite ? 16 : 32);
    pin.rotateX(Math.PI / 2);
    const pinM = shadowed(new THREE.Mesh(pin, pinMat));
    pinM.name = 'seconds-hand-pin';
    rotor.add(bm, lumeM, pinM);
    const L = 8.92;
    const bph = spec.timing?.beatsPerHour ?? 28800;
    reg.add({
      id: 'seconds-hand', name: 'Seconds hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'secondHand' }, exposed: true, priority: 1,
      explode: ex('seconds-hand'), explodeDelay: spec.explodeDelay('seconds-hand'),
      anchor: [0, L, T], update: followBlade(L, T),
      description: 'The central seconds hand sits on the long arbor of the fourth wheel, which turns once a minute. It advances in eight tiny steps every second, one per beat of the balance; the lume diamond lets you check the movement is running in the dark, and the plain black tail balances it.',
      facts: {
        Length: `${h.tip.toFixed(2)} mm + ${h.tail.toFixed(2)} mm counterweight`,
        Lume: 'Diamond "lollipop"',
        Thickness: `${T.toFixed(2)} mm (estimate)`,
        Motion: `${bph / 3600} steps per second (${bph.toLocaleString('en-US')} A/h)`,
        Seat: 'Fourth-wheel arbor (direct centre seconds)',
        Speed: '1 turn per minute',
      },
      live: (s) => `${(frac(-s.rot.secondHand / TAU) * 60).toFixed(1)} s`,
    });
  }
}
