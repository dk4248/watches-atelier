// HANDS of the Grand Seiko SBGA211 (builder B2, plan.md §B2):
//  - hour and minute: dauphine / "razor" hands. Each half of the blade is one flat,
//    mirror-polished facet rising from a thin edge wall to a sharp centre ridge, so the hand
//    shows the classic half-bright / half-dark split; polished collets on the pipes.
//  - seconds: a flat heat-blued needle (#23409A) with a square-ended counterweight tail,
//    blue hub and polished centre cap. It GLIDES: Spring Drive has no escapement, the
//    kinematics give a perfectly smooth rot.secondHand (6°/s), so nothing is stepped here.
//  - power reserve: a slim polished faceted spear on a domed hub inside the dial's recess,
//    turned by SPEC.rotations.prDisplay (FULL → towards 9, EMPTY → 12).
// Hands point to 12 (+Y) at rotation 0; the registry drives rotor.rotation.z.
// Part ids: hour-hand minute-hand seconds-hand power-reserve-hand.

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const ni = (g) => (g.index ? g.toNonIndexed() : g);

// cosmetic constants (not in SPEC)
const EDGE_WALL = 0.03; // dauphine blades: vertical edge wall below the facets (razor edge)
const PR_EDGE_WALL = 0.025;
const BLUED = { roughness: 0.22, iridescence: 0.18, envMapIntensity: 0.75 };
// A true mirror (roughness ≈0.04) picked up the studio's black flags and turned whole facets
// black in the dial view; GS's photos show bright silver hands with one facet a little darker.
const POLISHED = { roughness: 0.16, envMapIntensity: 1.5 };

// Faceted blade: stations [[y, halfWidth], …] from the tail tip to the tip; two flat facets
// meet at the centre ridge (up to z0 + top) above edge walls (z0 + wall); flat bottom at z0.
// The ridge height grows with the local width (it runs down to the edge height at the point
// and the tail), which keeps every facet exactly planar — no folds along the blade.
function ridgeBlade(stations, z0, wall, top) {
  const tris = [];
  const P = (x, y, z) => [x, y, z];
  const wMax = Math.max(...stations.map(([, w]) => w));
  const zr = (w) => z0 + wall + (top - wall) * (w / wMax);
  for (let i = 0; i < stations.length - 1; i++) {
    const [ya, wa] = stations[i], [yb, wb] = stations[i + 1];
    const Ra = P(0, ya, zr(wa)), Rb = P(0, yb, zr(wb));
    const La = P(-wa, ya, z0 + wall), Lb = P(-wb, yb, z0 + wall);
    const Ea = P(wa, ya, z0 + wall), Eb = P(wb, yb, z0 + wall);
    const Lab = P(-wa, ya, z0), Lbb = P(-wb, yb, z0), Eab = P(wa, ya, z0), Ebb = P(wb, yb, z0);
    tris.push([La, Ra, Rb], [La, Rb, Lb]); // left facet
    tris.push([Ra, Ea, Eb], [Ra, Eb, Rb]); // right facet
    if (wall > 0) {
      tris.push([Lab, La, Lb], [Lab, Lb, Lbb]); // left edge wall
      tris.push([Eab, Ebb, Eb], [Eab, Eb, Ea]); // right edge wall
    }
    tris.push([Lab, Lbb, Ebb], [Lab, Ebb, Eab]); // bottom
  }
  return tris;
}

function soup(THREE, tris) {
  const pos = new Float32Array(tris.length * 9);
  let o = 0;
  for (const t of tris) for (const p of t) { pos[o++] = p[0]; pos[o++] = p[1]; pos[o++] = p[2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Flat plate from an outline (CCW) with optional round bore, z0 → z0 + thick, eased edges.
function plateGeo(THREE, outline, boreR, z0, thick, bevel = 0.015) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  if (boreR) {
    const hole = [];
    for (let i = 0; i < 40; i++) hole.push(new THREE.Vector2(boreR * Math.cos((i / 40) * TAU), boreR * Math.sin((i / 40) * TAU)));
    shape.holes.push(new THREE.Path(hole));
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thick - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: 6,
  });
  g.deleteAttribute('uv');
  g.translate(0, 0, z0 + bevel);
  return g;
}

// Lathe about the hand axis from [[r, z], …] (outer bottom → over the top → down the bore).
function lathe(THREE, profile, segs) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segs);
  g.rotateX(Math.PI / 2);
  g.deleteAttribute('uv');
  return g;
}

// Width tables → stations (linear between the given points).
function lerpTable(table, y) {
  if (y <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (y <= table[i][0]) {
      const [y0, w0] = table[i - 1], [y1, w1] = table[i];
      return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

export function buildHands(ctx) {
  const { THREE, spec, M, reg, root, stage } = ctx;
  const Z = spec.z, HS = spec.hands, CS = HS.centreStack;
  const lite = !!ctx.lite;
  const SEGS = lite ? 32 : 72;
  const env = stage?.scene?.environment || null;
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];

  const polished = M.steelPolished.clone();
  polished.name = 'handPolished';
  polished.color.set(HS.colours.polished);
  polished.roughness = POLISHED.roughness;
  polished.envMap = env;
  polished.envMapIntensity = POLISHED.envMapIntensity;
  const blued = M.blued.clone();
  blued.name = 'heatBlued';
  blued.color.set(HS.seconds.colour);
  blued.roughness = BLUED.roughness;
  blued.iridescence = BLUED.iridescence;
  blued.envMap = env;
  blued.envMapIntensity = BLUED.envMapIntensity;

  const pad = (n) => (n < 10 ? '0' : '') + n;
  const frac = (v) => ((v % 1) + 1) % 1;
  function mount(name, x, y) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, 0);
    const rotor = new THREE.Group();
    rotor.name = `${name}-rotor`;
    object.add(rotor);
    root.add(object);
    return { object, rotor };
  }
  function addMesh(rotor, geo, mat, name) {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    rotor.add(m);
    return m;
  }
  // label anchor follows the blade (object space)
  const followBlade = (L, z) => (state, p) => {
    const a = p.rotor.rotation.z;
    p.anchorVec.set(-Math.sin(a) * L, Math.cos(a) * L, z);
  };

  // dauphine stations: tail tip → widest point → tip (straight edges), optional width table
  function dauphineStations(h) {
    const st = [[-h.tail, 0]];
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const y = -h.tail + ((h.maxWidthAt + h.tail) * i) / n;
      st.push([y, (h.maxWidth / 2) * (i / n)]);
    }
    const tbl = h.widthAt ? [[h.maxWidthAt, h.maxWidth], ...h.widthAt.filter(([y]) => y > h.maxWidthAt), [h.tip, 0]] : [[h.maxWidthAt, h.maxWidth], [h.tip, 0]];
    const m = h.widthAt ? 24 : 1;
    for (let i = 1; i <= m; i++) {
      const y = h.maxWidthAt + ((h.tip - h.maxWidthAt) * i) / m;
      st.push([y, lerpTable(tbl, y) / 2]);
    }
    st[st.length - 1][1] = 0;
    return st;
  }

  // ---------------------------------------------------------------- hour hand
  {
    const h = HS.hour;
    const [z0, z1] = h.z;
    const { object, rotor } = mount('hour-hand', 0, 0);
    const blade = soup(THREE, ridgeBlade(dauphineStations(h), z0, EDGE_WALL, z1 - z0));
    // collet: polished boss on the hour-wheel pipe (bore = pipe outer radius)
    const Rc = h.collet.radius, [c0, c1] = h.collet.z, bore = CS.hourPipe[1];
    const collet = lathe(THREE, [
      [Rc - 0.02, c0], [Rc, c0 + 0.02], [Rc, c1 - 0.06], [Rc - 0.06, c1], [bore + 0.05, c1], [bore, c1 - 0.03], [bore, c0],
    ], SEGS);
    addMesh(rotor, mergeGeometries([blade, ni(collet)]), polished, 'hour-hand-mesh');
    const L = h.tip;
    reg.add({
      id: 'hour-hand', name: 'Hour hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'hourHand' }, exposed: true, priority: 1,
      explode: ex('hour-hand'), explodeDelay: spec.explodeDelay('hour-hand'),
      anchor: [0, L * 0.6, z1], update: followBlade(L * 0.6, z1),
      description: 'Shows the hours. A dauphine hand: each half of the blade is one flat, mirror-polished facet meeting the other at a sharp centre ridge, so one side flashes bright while the other stays dark. It is pressed onto the hour-wheel pipe, which the motion works turn once in 12 hours.',
      facts: {
        Shape: 'Dauphine, two facets + razor edges', Length: `${h.tip.toFixed(1)} mm (+ ${h.tail.toFixed(1)} mm tail)`,
        Width: `${h.maxWidth.toFixed(2)} mm max`, Finish: 'Mirror-polished', Speed: '1 turn in 12 h',
      },
      live: (s) => {
        const tot = frac(-s.rot.hourHand / TAU) * 720;
        const hh = Math.floor(tot / 60) || 12;
        return `${hh}:${pad(Math.floor(tot % 60))}`;
      },
    });
  }

  // ---------------------------------------------------------------- minute hand
  {
    const h = HS.minute;
    const [z0, z1] = h.z;
    const { object, rotor } = mount('minute-hand', 0, 0);
    const blade = soup(THREE, ridgeBlade(dauphineStations(h), z0, EDGE_WALL, z1 - z0));
    const Rc = h.collet.radius, [c0, c1] = h.collet.z, bore = CS.cannonPipe[1];
    const collet = lathe(THREE, [
      [Rc - 0.02, c0], [Rc, c0 + 0.02], [Rc, c1 - 0.05], [Rc - 0.05, c1], [bore + 0.04, c1], [bore, c1 - 0.03], [bore, c0],
    ], SEGS);
    addMesh(rotor, mergeGeometries([blade, ni(collet)]), polished, 'minute-hand-mesh');
    const L = h.tip;
    reg.add({
      id: 'minute-hand', name: 'Minute hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'minuteHand' }, exposed: true, priority: 1,
      explode: ex('minute-hand'), explodeDelay: spec.explodeDelay('minute-hand'),
      anchor: [0, L * 0.7, z1], update: followBlade(L * 0.7, z1),
      description: 'Shows the minutes, reaching into the minute track. It sits on the cannon pinion, which grips the centre-wheel arbor by friction and turns once an hour; the friction lets you set the time without stopping the movement.',
      facts: {
        Shape: 'Dauphine, two facets + razor edges', Length: `${h.tip.toFixed(1)} mm (+ ${h.tail.toFixed(1)} mm tail)`,
        Width: `${h.maxWidth.toFixed(2)} → ${h.widthAt[h.widthAt.length - 1][1].toFixed(2)} mm`, Finish: 'Mirror-polished', Speed: '1 turn per hour',
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
    const [z0, z1] = sc.z;
    const T = z1 - z0;
    const { object, rotor } = mount('seconds-hand', 0, 0);
    // outline (CCW): right edge out to the tip, left edge back, the counterweight tail with
    // its square end; the hub disc covers the junction
    const right = [], left = [];
    for (const [y, w] of sc.widthAt) {
      if (y >= sc.tip - 1e-6) continue;
      right.push([w / 2, y]);
      left.push([-w / 2, y]);
    }
    const tipW = 0.035;
    const tail = sc.tailWidthAt;
    const pts = [
      [tail[0][1] / 2, -tail[0][0]], [sc.widthAt[0][1] / 2, 0], ...right, [tipW / 2, sc.tip - 0.04], [0, sc.tip], [-tipW / 2, sc.tip - 0.04],
      ...left.reverse(), [-sc.widthAt[0][1] / 2, 0],
      ...tail.map(([y, w]) => [-w / 2, -y]), ...tail.slice().reverse().map(([y, w]) => [w / 2, -y]),
    ];
    // drop duplicates/self-overlaps at the tail start
    const outline = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6);
    const blade = plateGeo(THREE, outline.slice(1), 0, z0, T, 0.012);
    // hub: blued disc (R 0.55) from below the blade up to just under the cap, polished cap
    const hr = sc.hub.radius, cr = sc.hub.capRadius, [h0, h1] = sc.hub.z;
    const hubTop = h1 - 0.07;
    const hub = lathe(THREE, [[0.11, h0], [hr - 0.03, h0], [hr, h0 + 0.03], [hr, hubTop - 0.05], [hr - 0.06, hubTop], [cr + 0.02, hubTop], [cr, hubTop - 0.005], [0.11, hubTop - 0.01]], SEGS);
    addMesh(rotor, mergeGeometries([ni(blade), ni(hub)]), blued, 'seconds-hand-mesh');
    const cap = lathe(THREE, [[0.0001, hubTop - 0.01], [cr, hubTop - 0.01], [cr, h1 - 0.03], [cr - 0.03, h1 - 0.005], [cr - 0.1, h1], [0.0001, h1]], Math.round(SEGS * 0.7));
    addMesh(rotor, cap, polished, 'seconds-hand-cap');
    reg.add({
      id: 'seconds-hand', name: 'Gliding seconds hand', category: 'hands', side: 'front', object, rotor,
      drive: { key: 'secondHand' }, exposed: true, priority: 1,
      explode: ex('seconds-hand'), explodeDelay: spec.explodeDelay('seconds-hand'),
      anchor: [0, sc.tip * 0.72, z1], update: followBlade(sc.tip * 0.72, z1),
      description: 'Heat-blued steel, with a wider counterweight tail. It glides instead of ticking: a Spring Drive has no escapement, and its glide wheel turns continuously at 8 revolutions per second, held to a quartz reference by an electromagnetic brake, so the hand sweeps the dial in one perfectly smooth motion.',
      facts: {
        Material: 'Steel, heat-blued', Length: `${sc.tip.toFixed(1)} mm + ${sc.tail.toFixed(1)} mm tail`,
        Motion: 'Continuous glide, 6° per second', Hub: `Ø ${(2 * hr).toFixed(1)} mm, polished cap`, Accuracy: '±1 s/day (±15 s/month)',
      },
      live: (s) => `${(frac(-s.rot.secondHand / TAU) * 60).toFixed(1)} s — gliding`,
    });
  }

  // ---------------------------------------------------------------- power-reserve hand
  {
    const ph = HS.powerReserve;
    const [z0, z1] = ph.z;
    const { object, rotor } = mount('power-reserve-hand', ph.pivot[0], ph.pivot[1]);
    const L = ph.length;
    const st = [[0, ph.widthHub / 2], [ph.hubRadius, ph.widthHub / 2], [L - 0.4, ph.widthTip / 2], [L - 0.12, ph.widthTip / 3.2], [L, 0]];
    const blade = soup(THREE, ridgeBlade(st, z0, PR_EDGE_WALL, z1 - z0));
    // domed polished hub on the display-wheel arbor (top z1 + 0.05)
    const r = ph.hubRadius, top = z1 + 0.05;
    const hub = lathe(THREE, [[0.0001, z0], [r - 0.02, z0], [r, z0 + 0.02], [r, z1 - 0.03], [r - 0.06, z1 + 0.012], [r - 0.16, top - 0.012], [r - 0.3, top - 0.001], [0.0001, top]], SEGS);
    addMesh(rotor, mergeGeometries([blade, ni(hub)]), polished, 'power-reserve-hand-mesh');
    const rot = spec.rotations.prDisplay;
    reg.add({
      id: 'power-reserve-hand', name: 'Power-reserve hand', category: 'hands', side: 'front', object, rotor,
      exposed: true, priority: 2,
      explode: ex('power-reserve-hand'), explodeDelay: spec.explodeDelay('power-reserve-hand'),
      anchor: [0, L * 0.6, z1],
      update: (s, p) => {
        const a = rot(s);
        p.rotor.rotation.z = a;
        p.anchorVec.set(-Math.sin(a) * L * 0.6, Math.cos(a) * L * 0.6, z1);
      },
      description: 'Shows how much energy is left in the mainspring. It sits on the display wheel, driven by a differential that compares how far the mainspring has been wound (the barrel arbor) with how far it has run down (the barrel drum). Fully wound it points towards 9; over about three days it creeps clockwise up to 12.',
      facts: { Length: `${L.toFixed(2)} mm`, Range: `${spec.powerReserve.hours} h over ${spec.powerReserve.sweepDeg}°`, Full: 'Towards 9', Empty: 'Towards 12', Finish: 'Polished, faceted' },
      live: (s) => `${Math.round(s.reserve * spec.powerReserve.hours)} h of ${spec.powerReserve.hours} h`,
    });
  }
}
