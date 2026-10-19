// Finishes and helpers SHARED by the DUW 6101 modules, so the 3/4 plate, the balance
// bridge and the rotor wear exactly the same Glashütte ribbing, every module uses the same
// tempered-blue and ruby, and the crown/stem (case + train modules) turn by the same
// "manual winding only" angle. Materials are built once per library (memoised on M) from
// clones of the shared materials, which are never mutated.
// Owner: frame module. Other modules import from here and never edit it; ask the frame
// builder (or the lead) for changes.
//
// Contents
//   materials   ribbedMaterial, perlageMaterial, bluedScrewMaterial, rubyMaterial (+ the
//               escapement/frame extras below: polish, dark polish, frosted, turned, gold
//               engraving fill, jewel-hole dark)
//   UVs         ribbingUV (Glashütte bands), radialUV (turned / grained parts)
//   kinematics  manualStemAngle (crown, stem, sliding pinion)
//   geometry    SDF outlines → regionShapes → slab (polished anglage where wanted), lathe,
//               jewel and slotted-screw builders, mergeAll
//   engraving   a monoline DIN-like engraving font, engraving textures and decal grids
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { planarUV } from '../../../core/materials.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const cache = new WeakMap();
const entryOf = (M) => {
  let e = cache.get(M);
  if (!e) { e = {}; cache.set(M, e); }
  return e;
};

// Saw-tooth band shading measured on the DUW 6101 back render (research/tangente-update-
// 147/plan.md §ribbing): across every band the rhodium darkens towards the band's low-v
// edge and is brightest along its high-v edge, then a sharp step down into the next band
// (seen through the case back: dark lower-left edge, bright upper-right edge). The core
// ribbing maps hold four bands per tile along v, so this albedo map uses the same tiling.
function bandAlbedo(lo = 0.8) {
  const H = 1024, W = 4;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let r = 0; r < H; r++) {
    const v = 1 - (r + 0.5) / H; // canvas rows run down, texture v runs up (flipY)
    const f = (v * 4) % 1; // 0 at a band's low-v edge … 1 at its high-v edge
    let b = lo + (1 - lo) * f;
    if (f < 0.06) b -= 0.04 * (1 - f / 0.06); // the shadowed foot of the step
    if (f > 0.988) b *= 0.93 + 0.07 * ((1 - f) / 0.012); // a hairline at the step itself
    const val = Math.round(255 * Math.max(0, Math.min(1, b)));
    for (let x = 0; x < W; x++) {
      const i = (r * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Rhodium-plated brass with Glashütte ribbing (3/4 plate, balance bridge, rotor bar/collar).
// Put ribbingUV() on the geometry.
export function ribbedMaterial(M) {
  const e = entryOf(M);
  if (!e.ribbed) {
    const m = M.plateRibbed.clone();
    m.map = bandAlbedo(0.9);
    m.color.set(0xd3d2cf); // neutral rhodium (render #C9CACB–#D4D4D4)
    // The core map's band-by-band roughness swing, under the studio's ring lights and black
    // flags, turned every band into a hard light/dark corrugation; NOMOS's photos show a soft
    // sheen. Uniform roughness + the gentle saw-tooth albedo + a light normal map match them.
    m.roughnessMap = null;
    m.roughness = 0.4;
    m.normalScale = new THREE.Vector2(0.2, 0.2);
    m.name = 'duw6101Ribbed';
    e.ribbed = m;
  }
  return e.ribbed;
}

// Planar ribbing UVs from spec.movement.ribbing. Geometry must be built in the dial frame
// (or pass the frame's rotation): a part that is modelled in its own rotating frame — the
// rotor — passes frameRotDeg = SPEC.automatic.refRotDeg so its bands continue the plate's
// bands exactly when it stands at the reference angle (as in every NOMOS image).
export function ribbingUV(geo, spec, frameRotDeg = 0) {
  const rib = spec.movement.ribbing;
  return planarUV(geo, rib.uvScale, rib.uvOffset, rib.uvAngle - frameRotDeg * DEG);
}

// Soft NOMOS perlage (spots ≈ 1.6 mm on the back, ≈ 2.0 mm "fish scales" on the dial
// side). Use planarUV(geo, spec.movement.perlage.uvScaleBack | uvScaleDial).
export function perlageMaterial(M, side = 'back') {
  const e = entryOf(M);
  const k = `perlage_${side}`;
  if (!e[k]) {
    const m = M.platePerlage.clone();
    m.color.set(side === 'back' ? 0xcfd0d4 : 0xd2d3d6);
    m.normalScale = new THREE.Vector2(0.34, 0.34);
    m.roughnessMap = null; // the ring-by-ring roughness contrast reads as hard scales
    m.roughness = 0.32;
    m.name = `duw6101Perlage_${side}`;
    e[k] = m;
  }
  return e[k];
}

// Tempered blue screw heads: deep royal blue (median #1b437e on the back render).
export function bluedScrewMaterial(M) {
  const e = entryOf(M);
  if (!e.blued) {
    const m = M.blued.clone();
    m.color.set(0x1b437e);
    m.roughness = 0.3;
    m.iridescence = 0.15;
    m.envMapIntensity = 0.85;
    m.name = 'duw6101BluedScrew';
    e.blued = m;
  }
  return e.blued;
}

// Synthetic ruby in the plates: deep pink-magenta (render #A95483 in the sinks).
export function rubyMaterial(M) {
  const e = entryOf(M);
  if (!e.ruby) {
    const m = M.ruby.clone();
    m.color.set(0x9a2c5c);
    m.attenuationColor = new THREE.Color(0x5c0e3a);
    m.attenuationDistance = 0.28;
    m.transmission = 0.18;
    m.emissive = new THREE.Color(0x16020a);
    m.clearcoat = 0.3;
    m.specularIntensity = 0.5;
    m.name = 'duw6101Ruby';
    e.ruby = m;
  }
  return e.ruby;
}

// Angle (radians, about +X, engine rot.stem sign: negative while winding) of everything
// that turns ONLY when the crown is turned by hand: crown, winding stem, sliding pinion.
// The engine's rot.stem also advances while the rotor winds (windAngle counts both); in
// the real watch the winding pinion's Breguet teeth then slip, so the crown stays still.
// Rotor winding adds |Δrot.rotor| × ratchetPerRotorRad to windAngle; the rest is manual.
// The winding pinion itself always follows the crown wheel: use state.rot.stem for it.
// Advances once per kinematics update (keyed on state.ms), so every caller in the same
// frame gets the same value. No allocations after the first call.
const stemCache = new WeakMap();
export function manualStemAngle(state, spec) {
  let c = stemCache.get(state);
  if (!c) {
    c = { key: NaN, wind: state.windAngle || 0, rotor: (state.rot && state.rot.rotor) || 0, angle: 0 };
    stemCache.set(state, c);
  }
  if (c.key === state.ms) return c.angle;
  c.key = state.ms;
  const w = state.windAngle || 0, r = (state.rot && state.rot.rotor) || 0;
  const dW = w - c.wind, dR = Math.abs(r - c.rotor);
  c.wind = w;
  c.rotor = r;
  const manual = dW - dR * (spec.automatic ? spec.automatic.ratchetPerRotorRad : 0);
  if (manual > 1e-9) c.angle += manual * spec.windingTrain.ratios.windingPinion;
  return c.angle;
}

// =====================================================================================
// MORE SHARED MATERIALS (escapement + frame; memoised on M like the ones above)
// =====================================================================================

// Polished anglage, countersinks and jewel sinks: the library's mirror rhodium.
export const polishMaterial = (M) => M.rhodiumBevel;

// Polished walls that mostly mirror the dark inside of the movement in the NOMOS renders:
// the conical chamfer round the balance cut-out and the walls of the winding pocket.
export function darkPolishMaterial(M) {
  const e = entryOf(M);
  if (!e.darkPolish) {
    const m = M.rhodiumBevel.clone();
    m.color.set(0x8e9196);
    m.roughness = 0.13;
    m.envMapIntensity = 0.75;
    m.name = 'duw6101DarkPolish';
    e.darkPolish = m;
  }
  return e.darkPolish;
}

// Matte (sand-blasted) rhodium for pocket floors, pillar tops and screw seats.
export function frostedMaterial(M) {
  const e = entryOf(M);
  if (!e.frosted) {
    const m = M.rhodium.clone();
    m.color.set(0xcdd0d4);
    m.roughness = 0.52;
    m.name = 'duw6101Frosted';
    e.frosted = m;
  }
  return e.frosted;
}

// Turned (concentric, lathe-grained) rhodium: the pallet-bridge boss, jewel settings.
// Needs radialUV() round the part's own centre.
export function turnedMaterial(M) {
  const e = entryOf(M);
  if (!e.turned) {
    const m = M.wheelRhodium.clone();
    m.color.set(0xd6d8dc);
    m.roughness = 0.26;
    m.normalScale = new THREE.Vector2(0.22, 0.22);
    m.name = 'duw6101Turned';
    e.turned = m;
  }
  return e.turned;
}

// The dark inside of a jewel's pivot hole.
export function jewelHoleMaterial(M) {
  const e = entryOf(M);
  if (!e.jewelHole) {
    const m = new THREE.MeshStandardMaterial({ color: 0x241018, roughness: 0.45, metalness: 0.1 });
    m.name = 'duw6101JewelHole';
    e.jewelHole = m;
  }
  return e.jewelHole;
}

// Gold-filled engraving (#e3ac5a on the renders): one material per engraving texture set.
export function engravingMaterial(M, tex, colour = 0xe3ac5a) {
  const m = M.goldText.clone();
  m.color.set(colour);
  Object.assign(m, {
    map: tex.map, alphaMap: tex.alphaMap, normalMap: tex.normalMap, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, roughness: 0.3, metalness: 1,
  });
  m.normalScale = new THREE.Vector2(0.9, 0.9);
  m.name = 'duw6101Engraving';
  return m;
}

// UVs normalised to a part's radius round its own centre c (turned / sunburst finishes).
export function radialUV(geo, c, R) {
  const p = geo.attributes.position;
  let uv = geo.attributes.uv;
  if (!uv) { uv = new THREE.BufferAttribute(new Float32Array(p.count * 2), 2); geo.setAttribute('uv', uv); }
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - c[0]) / (2 * R) + 0.5, (p.getY(i) - c[1]) / (2 * R) + 0.5);
  uv.needsUpdate = true;
  return geo;
}

// =====================================================================================
// GEOMETRY TOOLKIT (escapement + frame; other modules may use it)
// Outlines are 2-D signed-distance fields in the dial frame (mm, negative inside), so
// plates and bridges are built with real booleans (disc minus cut-outs, pockets …). The
// zero set is traced by marching squares, simplified and extruded by slab(), which puts
// polished anglage (a 45° chamfer) only on the edges that really carry it.
// Every SDF carries a bounding box `bb` of its inside (null = unbounded); its value is
// never below the distance to that box, so unions can skip far-away terms exactly.
// =====================================================================================

const mk = (fn, bb) => { fn.bb = bb; return fn; };
const bbPts = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
const bbJoin = (bbs) => (bbs.length && bbs.every(Boolean)
  ? [Math.min(...bbs.map((b) => b[0])), Math.min(...bbs.map((b) => b[1])), Math.max(...bbs.map((b) => b[2])), Math.max(...bbs.map((b) => b[3]))] : null);
const bbGrow = (b, d) => (b ? [b[0] - d, b[1] - d, b[2] + d, b[3] + d] : null);
const bbArea = (b) => (b ? (b[2] - b[0]) * (b[3] - b[1]) : Infinity);
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);

export const SDF = {
  circle: (c, r) => mk((x, y) => Math.hypot(x - c[0], y - c[1]) - r, [c[0] - r, c[1] - r, c[0] + r, c[1] + r]),
  ring: (c, r0, r1) => {
    const rm = (r0 + r1) / 2, hw = (r1 - r0) / 2;
    return mk((x, y) => Math.abs(Math.hypot(x - c[0], y - c[1]) - rm) - hw, [c[0] - r1, c[1] - r1, c[0] + r1, c[1] + r1]);
  },
  // segment a→b with radius ra at a and rb at b (tapered capsule)
  capsule: (a, b, ra, rb = ra) => {
    const bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by || 1e-12;
    const R = Math.max(ra, rb);
    return mk((x, y) => {
      const px = x - a[0], py = y - a[1];
      const h = Math.min(1, Math.max(0, (px * bx + py * by) / l2));
      return Math.hypot(px - bx * h, py - by * h) - (ra + (rb - ra) * h);
    }, [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R]);
  },
  // oriented box: centre c, half sizes hx, hy, rotation ang, corner radius rc
  box: (c, hx, hy, ang = 0, rc = 0) => {
    const co = Math.cos(ang), si = Math.sin(ang), e = Math.hypot(hx, hy);
    return mk((x, y) => {
      const dx = x - c[0], dy = y - c[1];
      const px = Math.abs(dx * co + dy * si) - hx + rc, py = Math.abs(-dx * si + dy * co) - hy + rc;
      return Math.hypot(Math.max(px, 0), Math.max(py, 0)) + Math.min(Math.max(px, py), 0) - rc;
    }, [c[0] - e, c[1] - e, c[0] + e, c[1] + e]);
  },
  // simple polygon (either orientation)
  poly: (v) => mk((px, py) => {
    let d = Infinity, s = 1;
    for (let i = 0, j = v.length - 1; i < v.length; j = i, i++) {
      const ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1];
      const wx = px - v[i][0], wy = py - v[i][1];
      const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-18)));
      const bx = wx - ex * t, by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= v[i][1], c2 = py < v[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  }, bbPts(v)),
  // half plane: inside where (p − o)·n < 0 (n need not be unit)
  half: (o, n) => { const l = Math.hypot(n[0], n[1]); return mk((x, y) => ((x - o[0]) * n[0] + (y - o[1]) * n[1]) / l, null); },
  union: (...f) => {
    const n = f.length, bbs = f.map((g) => g.bb || null);
    // ev(x, y, cap) = min(cap, union): terms whose box is farther than the running minimum
    // cannot lower it and are skipped
    const ev = (x, y, cap = Infinity) => {
      let d = cap;
      for (let i = 0; i < n; i++) {
        const b = bbs[i];
        if (b) {
          const dx = Math.max(b[0] - x, x - b[2], 0), dy = Math.max(b[1] - y, y - b[3], 0);
          if (dx >= d || dy >= d || dx * dx + dy * dy >= d * d) continue;
        }
        const e = f[i](x, y);
        if (e < d) d = e;
      }
      return d;
    };
    const fn = mk((x, y) => ev(x, y), bbJoin(bbs));
    fn.ev = ev;
    return fn;
  },
  // intersection; its box is the smallest member box (a valid lower bound, unlike the
  // intersection of the boxes)
  inter: (...f) => {
    const bbs = f.map((g) => g.bb).filter(Boolean);
    const bb = bbs.length ? bbs.reduce((a, b) => (bbArea(b) < bbArea(a) ? b : a)) : null;
    return mk((x, y) => {
      let d = -Infinity;
      for (let i = 0; i < f.length; i++) { const e = f[i](x, y); if (e > d) d = e; }
      return d;
    }, bb);
  },
  // a minus the union of b (exact: the union is only resolved below −a)
  sub: (a, ...b) => {
    if (!b.length) return a;
    const u = b.length === 1 && b[0].ev ? b[0] : SDF.union(...b);
    return mk((x, y) => { const av = a(x, y); return Math.max(av, -u.ev(x, y, -av)); }, a.bb);
  },
  grow: (f, d) => mk((x, y) => f(x, y) - d, bbGrow(f.bb, Math.max(0, d))),
  not: (f) => mk((x, y) => -f(x, y), null),
  // smooth union / smooth subtraction (fillets of radius ≈ k)
  blend: (a, b, k) => mk((x, y) => smin(a(x, y), b(x, y), k), bbGrow(bbJoin([a.bb, b.bb]), k / 4)),
  carve: (a, b, k) => mk((x, y) => smax(a(x, y), -b(x, y), k), a.bb),
  // sector round c between two math angles a0 → a1 (CCW, radians), unbounded radially
  sector: (c, a0, a1) => {
    const d0 = [Math.cos(a0), Math.sin(a0)], d1 = [Math.cos(a1), Math.sin(a1)];
    const span = (((a1 - a0) % TAU) + TAU) % TAU;
    return mk((x, y) => {
      const vx = x - c[0], vy = y - c[1];
      const s0 = vx * d0[1] - vy * d0[0]; // > 0: clockwise of the a0 ray
      const s1 = d1[0] * vy - d1[1] * vx; // > 0: counter-clockwise of the a1 ray
      return span <= Math.PI ? Math.max(s0, s1) : Math.min(s0, s1);
    }, null);
  },
};

// ---------------------------------------------------------------- SDF → closed outlines
// Sample an SDF on a grid; 8 × 8 blocks far from the zero set are filled with the centre
// value (only the sign matters there and the fields are 1-Lipschitz).
function sampleGrid(f, x0, y0, nx, ny, h) {
  const v = new Float32Array(nx * ny);
  const BS = 8;
  for (let bj = 0; bj < ny; bj += BS) {
    for (let bi = 0; bi < nx; bi += BS) {
      const ie = Math.min(nx, bi + BS), je = Math.min(ny, bj + BS);
      const cx = x0 + ((bi + ie - 1) / 2) * h, cy = y0 + ((bj + je - 1) / 2) * h;
      const dc = f(cx, cy);
      const half = (Math.hypot(ie - 1 - bi, je - 1 - bj) * h) / 2;
      if (Math.abs(dc) > half + 2 * h) {
        for (let j = bj; j < je; j++) for (let i = bi; i < ie; i++) v[j * nx + i] = dc;
      } else {
        for (let j = bj; j < je; j++) {
          for (let i = bi; i < ie; i++) {
            let d = f(x0 + i * h, y0 + j * h);
            if (Math.abs(d) < 1e-7) d = 1e-7; // no crossing exactly on a grid node
            v[j * nx + i] = d;
          }
        }
      }
    }
  }
  return v;
}

// Marching squares → closed loops with the inside on the left (outer CCW, holes CW).
function marching(v, nx, ny, x0, y0, h) {
  const N = nx * ny;
  const next = new Int32Array(2 * N).fill(-1);
  const has = new Uint8Array(2 * N);
  const px = new Float64Array(2 * N), py = new Float64Array(2 * N);
  const cross = (e) => {
    if (has[e]) return;
    has[e] = 1;
    if (e < N) {
      const j = (e / nx) | 0, i = e - j * nx, a = v[e], b = v[e + 1];
      px[e] = x0 + (i + a / (a - b)) * h; py[e] = y0 + j * h;
    } else {
      const k = e - N, j = (k / nx) | 0, i = k - j * nx, a = v[k], b = v[k + nx];
      px[e] = x0 + i * h; py[e] = y0 + (j + a / (a - b)) * h;
    }
  };
  // orient each segment with the inside (f < 0) on its left, using the bilinear gradient
  const seg = (p, q, a, b, c, d, i, j) => {
    cross(p); cross(q);
    const u = ((px[p] + px[q]) / 2 - x0) / h - i, w = ((py[p] + py[q]) / 2 - y0) / h - j;
    const gx = (b - a) * (1 - w) + (c - d) * w, gy = (d - a) * (1 - u) + (c - b) * u;
    const ex = px[q] - px[p], ey = py[q] - py[p];
    if (-ey * gx + ex * gy > 0) next[q] = p; else next[p] = q;
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const ia = j * nx + i;
      const a = v[ia], b = v[ia + 1], c = v[ia + nx + 1], d = v[ia + nx];
      const k = (a < 0 ? 1 : 0) | (b < 0 ? 2 : 0) | (c < 0 ? 4 : 0) | (d < 0 ? 8 : 0);
      if (k === 0 || k === 15) continue;
      const e0 = ia, e1 = N + ia + 1, e2 = ia + nx, e3 = N + ia;
      if (k === 5 || k === 10) {
        const inC = a + b + c + d < 0;
        if ((k === 5) === inC) { seg(e0, e1, a, b, c, d, i, j); seg(e2, e3, a, b, c, d, i, j); } else { seg(e0, e3, a, b, c, d, i, j); seg(e1, e2, a, b, c, d, i, j); }
      } else {
        const es = [];
        if ((k & 1) !== ((k >> 1) & 1)) es.push(e0);
        if (((k >> 1) & 1) !== ((k >> 2) & 1)) es.push(e1);
        if (((k >> 2) & 1) !== ((k >> 3) & 1)) es.push(e2);
        if (((k >> 3) & 1) !== (k & 1)) es.push(e3);
        seg(es[0], es[1], a, b, c, d, i, j);
      }
    }
  }
  const loops = [];
  let broken = 0;
  const seen = new Uint8Array(2 * N);
  for (let e = 0; e < 2 * N; e++) {
    if (next[e] < 0 || seen[e]) continue;
    const loop = [];
    let k = e;
    while (k >= 0 && !seen[k]) {
      seen[k] = 1;
      const p = [px[k], py[k]];
      const l = loop[loop.length - 1];
      if (!l || Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) > 1e-7) loop.push(p);
      k = next[k];
    }
    if (k !== e) { broken++; continue; }
    if (loop.length > 2) loops.push(loop);
  }
  if (broken) console.warn(`[duw6101] marching squares: ${broken} open contour(s) dropped`);
  return loops;
}

// Douglas–Peucker for a closed loop.
function simplifyLoop(pts, tol) {
  const n = pts.length;
  if (n < 8) return pts;
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > fd) { fd = d; far = i; }
  }
  const keep = new Uint8Array(n);
  keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const A = pts[a], C = pts[b % n];
    const dx = C[0] - A[0], dy = C[1] - A[1], L = Math.hypot(dx, dy) || 1e-12;
    let md = -1, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - A[0]) * dy - (pts[i][1] - A[1]) * dx) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export const loopArea = (l) => {
  let a = 0;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += (l[j][0] - l[i][0]) * (l[j][1] + l[i][1]);
  return a / 2;
};
export const inPoly = (p, l) => {
  let c = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    if ((l[i][1] > p[1]) !== (l[j][1] > p[1]) && p[0] < ((l[j][0] - l[i][0]) * (p[1] - l[i][1])) / (l[j][1] - l[i][1]) + l[i][0]) c = !c;
  }
  return c;
};

// SDF region inside `box` [x0, y0, x1, y1] → [{ outer, holes }] (outer CCW, holes CW,
// points [x, y]); h = grid step, tol = simplification tolerance (mm).
export function regionShapes(f, box, h = 0.03, tol = 0.0025) {
  const x0 = box[0] - 3 * h, y0 = box[1] - 3 * h;
  const nx = Math.ceil((box[2] - box[0]) / h) + 7, ny = Math.ceil((box[3] - box[1]) / h) + 7;
  const v = sampleGrid(f, x0, y0, nx, ny, h);
  for (let i = 0; i < nx; i++) { v[i] = Math.max(v[i], h); v[(ny - 1) * nx + i] = Math.max(v[(ny - 1) * nx + i], h); }
  for (let j = 0; j < ny; j++) { v[j * nx] = Math.max(v[j * nx], h); v[j * nx + nx - 1] = Math.max(v[j * nx + nx - 1], h); }
  const loops = marching(v, nx, ny, x0, y0, h).map((l) => simplifyLoop(l, tol)).filter((l) => l.length >= 3 && Math.abs(loopArea(l)) > 1e-4);
  const outers = loops.filter((l) => loopArea(l) > 0).map((l) => ({ outer: l, holes: [], a: loopArea(l) }));
  outers.sort((p, q) => p.a - q.a);
  for (const l of loops) {
    if (loopArea(l) >= 0) continue;
    const o = outers.find((s) => inPoly(l[0], s.outer));
    if (o) o.holes.push(l);
  }
  return outers.map((o) => ({ outer: o.outer, holes: o.holes }));
}

// ---------------------------------------------------------------- slab extrusion
function creasedNormals(pos, angleDeg = 38) {
  const n = pos.length / 3;
  const fN = new Float32Array(n);
  for (let t = 0; t < n / 3; t++) {
    const o = t * 9;
    const ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2];
    const bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const l = Math.hypot(cx, cy, cz);
    if (l > 1e-14) { cx /= l; cy /= l; cz /= l; } else { cx = cy = cz = 0; }
    fN[t * 3] = cx; fN[t * 3 + 1] = cy; fN[t * 3 + 2] = cz;
  }
  // exact numeric vertex key on a 0.5 µm grid (|x|, |y| < 32 mm, |z| < 16 mm → 50 bits)
  const key = (i) => ((Math.round(pos[i * 3] * 2000) + 65536) * 131072 + (Math.round(pos[i * 3 + 1] * 2000) + 65536)) * 65536 + (Math.round(pos[i * 3 + 2] * 2000) + 32768);
  const map = new Map();
  for (let i = 0; i < n; i++) {
    const k = key(i);
    let a = map.get(k);
    if (!a) { a = []; map.set(k, a); }
    a.push((i / 3) | 0);
  }
  const cosA = Math.cos(angleDeg * DEG);
  const out = new Float32Array(pos.length);
  for (let i = 0; i < n; i++) {
    const f = (i / 3) | 0;
    const fx = fN[f * 3], fy = fN[f * 3 + 1], fz = fN[f * 3 + 2];
    let sx = 0, sy = 0, sz = 0;
    for (const g of map.get(key(i))) {
      const gx = fN[g * 3], gy = fN[g * 3 + 1], gz = fN[g * 3 + 2];
      if (fx * gx + fy * gy + fz * gz >= cosA) { sx += gx; sy += gy; sz += gz; }
    }
    const l = Math.hypot(sx, sy, sz);
    if (l > 1e-12) { out[i * 3] = sx / l; out[i * 3 + 1] = sy / l; out[i * 3 + 2] = sz / l; } else { out[i * 3] = fx; out[i * 3 + 1] = fy; out[i * 3 + 2] = fz || 1; }
  }
  return out;
}

export function makeGeometry(pos, nrm) {
  const g = new THREE.BufferGeometry();
  const p = pos instanceof Float32Array ? pos : new Float32Array(pos);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm instanceof Float32Array ? nrm : new Float32Array(nrm), 3));
  const uv = new Float32Array((p.length / 3) * 2);
  for (let i = 0, k = 0; i < p.length; i += 3, k += 2) { uv[k] = p[i]; uv[k + 1] = p[i + 1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

function insetPts(loop, s) {
  const n = loop.length, pts = new Array(n);
  for (let i = 0; i < n; i++) {
    const p0 = loop[(i - 1 + n) % n], p = loop[i], p1 = loop[(i + 1) % n];
    let ax = p[0] - p0[0], ay = p[1] - p0[1];
    const la = Math.hypot(ax, ay) || 1e-9; ax /= la; ay /= la;
    let bx = p1[0] - p[0], by = p1[1] - p[1];
    const lb = Math.hypot(bx, by) || 1e-9; bx /= lb; by /= lb;
    const n1x = -ay, n1y = ax, n2x = -by, n2y = bx; // left normals = into the material
    let mx = n1x + n2x, my = n1y + n2y;
    const lm = Math.hypot(mx, my);
    if (lm < 1e-6) { mx = n1x; my = n1y; } else { mx /= lm; my /= lm; }
    const d = s[i] / Math.max(0.4, mx * n1x + my * n1y);
    pts[i] = [p[0] + mx * d, p[1] + my * d];
  }
  // collapse inverted inset edges (short marching-squares edges at corners)
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ox = loop[j][0] - loop[i][0], oy = loop[j][1] - loop[i][1];
      const nx = pts[j][0] - pts[i][0], ny = pts[j][1] - pts[i][1];
      if (ox * nx + oy * ny < 0) {
        const m = [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
        pts[i] = m; pts[j] = [m[0], m[1]];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return pts;
}

function insetCrossings(P) {
  const seg = [];
  P.forEach((l, k) => {
    for (let i = 0; i < l.length; i++) {
      const a = l[i], b = l[(i + 1) % l.length];
      seg.push({ k, i, n: l.length, a, b, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) });
    }
  });
  seg.sort((p, q) => p.x0 - q.x0);
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const bad = [];
  for (let u = 0; u < seg.length; u++) {
    const s1 = seg[u];
    for (let v = u + 1; v < seg.length && seg[v].x0 <= s1.x1; v++) {
      const s2 = seg[v];
      if (s2.y0 > s1.y1 || s2.y1 < s1.y0) continue;
      if (s1.k === s2.k && (Math.abs(s1.i - s2.i) <= 1 || Math.abs(s1.i - s2.i) === s1.n - 1)) continue;
      if (o(s1.a, s1.b, s2.a) * o(s1.a, s1.b, s2.b) < 0 && o(s2.a, s2.b, s1.a) * o(s2.a, s2.b, s1.b) < 0) {
        bad.push([s1.k, s1.i], [s1.k, (s1.i + 1) % s1.n], [s2.k, s2.i], [s2.k, (s2.i + 1) % s2.n]);
      }
    }
  }
  return bad;
}

// Inset every contour by per-vertex chamfer sizes; wherever inset edges would cross (narrow
// necks, holes near the edge) the chamfer is halved, then removed, locally.
function insetShape(cs, sizeFn) {
  const S = cs.map((c) => Float64Array.from(c, (p) => sizeFn(p[0], p[1])));
  let P = cs.map((c, k) => insetPts(c, S[k]));
  for (let pass = 0; pass < 10; pass++) {
    const bad = insetCrossings(P);
    if (!bad.length) break;
    const f = pass < 4 ? 0.5 : 0;
    for (const [k, i] of bad) {
      const n = cs[k].length;
      for (let d = -2; d <= 2; d++) S[k][(i + d + n) % n] *= f;
    }
    P = cs.map((c, k) => insetPts(c, S[k]));
  }
  return cs.map((c, k) => ({ pts: P[k], s: S[k] }));
}

// Extrude shapes between z0 (the face towards the case back, −Z) and z1 (towards the dial).
// opt.back / opt.dial: chamfer size (number or (x, y) => size) on the edges of the z0 / z1
// faces; opt.capBack / opt.capDial = false leave that face open; opt.capNormal(x, y) gives
// custom normals for the z0 face (domed screw heads). Returns { caps, walls } geometries
// (caps with flat normals, walls with creased normals; uv = raw mm).
export function slab(shapes, z0, z1, opt = {}) {
  const fB = typeof opt.back === 'function' ? opt.back : () => opt.back || 0;
  const fD = typeof opt.dial === 'function' ? opt.dial : () => opt.dial || 0;
  const capP = [], capN = [], wallP = [];
  const cap = (contours, z, facing) => {
    const vs = contours.map((c) => c.map((p) => new THREE.Vector2(p[0], p[1])));
    const faces = THREE.ShapeUtils.triangulateShape(vs[0], vs.slice(1));
    const all = vs.flat();
    const area = (l) => { let a = 0; for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += (l[j].x - l[i].x) * (l[j].y + l[i].y); return a / 2; };
    const want = Math.abs(area(vs[0])) - vs.slice(1).reduce((s, h) => s + Math.abs(area(h)), 0);
    let got = 0;
    for (const [a, b, c] of faces) got += Math.abs((all[b].x - all[a].x) * (all[c].y - all[a].y) - (all[b].y - all[a].y) * (all[c].x - all[a].x)) / 2;
    if (Math.abs(got - want) > 1e-3 + want * 1e-3) console.warn(`[duw6101] cap triangulation incomplete: ${got.toFixed(3)} of ${want.toFixed(3)} mm² (z ${z}, near ${vs[0][0].x.toFixed(2)}, ${vs[0][0].y.toFixed(2)})`);
    for (const [a, b, c] of faces) {
      const A = all[a], Bv = all[b], C = all[c];
      const ar = (Bv.x - A.x) * (C.y - A.y) - (Bv.y - A.y) * (C.x - A.x);
      const tri = (facing > 0 ? ar < 0 : ar > 0) ? [A, C, Bv] : [A, Bv, C];
      for (const P of tri) {
        capP.push(P.x, P.y, z);
        if (opt.capNormal && facing < 0) capN.push(...opt.capNormal(P.x, P.y));
        else capN.push(0, 0, facing);
      }
    }
  };
  const quad = (A, Bq, C, D) => {
    wallP.push(A[0][0], A[0][1], A[1], Bq[0][0], Bq[0][1], Bq[1], C[0][0], C[0][1], C[1]);
    wallP.push(A[0][0], A[0][1], A[1], C[0][0], C[0][1], C[1], D[0][0], D[0][1], D[1]);
  };
  for (const sh of shapes) {
    const cs = [sh.outer, ...sh.holes];
    const iB = insetShape(cs, fB);
    const iD = insetShape(cs, fD);
    if (opt.capBack !== false) cap(iB.map((o) => o.pts), z0, -1);
    if (opt.capDial !== false) cap(iD.map((o) => o.pts), z1, 1);
    cs.forEach((c, k) => {
      const t = iB[k], b = iD[k], n = c.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const p = c[i], q = c[j];
        if (t.s[i] > 0 || t.s[j] > 0) quad([t.pts[i], z0], [t.pts[j], z0], [q, z0 + t.s[j]], [p, z0 + t.s[i]]);
        quad([p, z0 + t.s[i]], [q, z0 + t.s[j]], [q, z1 - b.s[j]], [p, z1 - b.s[i]]);
        if (b.s[i] > 0 || b.s[j] > 0) quad([p, z1 - b.s[i]], [q, z1 - b.s[j]], [b.pts[j], z1], [b.pts[i], z1]);
      }
    });
  }
  return {
    caps: capP.length ? makeGeometry(capP, capN) : null,
    walls: wallP.length ? makeGeometry(wallP, creasedNormals(wallP)) : null,
  };
}

// A flat cap (no walls) over shapes at z, facing −Z (facing = −1) or +Z (+1).
export function flatCap(shapes, z, facing) {
  const P = [], N = [];
  for (const sh of shapes) {
    const vs = [sh.outer, ...sh.holes].map((c) => c.map((p) => new THREE.Vector2(p[0], p[1])));
    const faces = THREE.ShapeUtils.triangulateShape(vs[0], vs.slice(1));
    const all = vs.flat();
    for (const [a, b, c] of faces) {
      const A = all[a], Bv = all[b], C = all[c];
      const ar = (Bv.x - A.x) * (C.y - A.y) - (Bv.y - A.y) * (C.x - A.x);
      const tri = (facing > 0 ? ar < 0 : ar > 0) ? [A, C, Bv] : [A, Bv, C];
      for (const Q of tri) { P.push(Q.x, Q.y, z); N.push(0, 0, facing); }
    }
  }
  return P.length ? makeGeometry(P, N) : null;
}

// Split a non-indexed geometry's triangles by pred(cx, cy, cz) on their centroids →
// [matching, rest] (either may be null).
export function splitTriangles(geo, pred) {
  if (!geo) return [null, null];
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, u = geo.attributes.uv ? geo.attributes.uv.array : null;
  const A = { p: [], n: [], u: [] }, Bt = { p: [], n: [], u: [] };
  for (let t = 0; t < p.length / 9; t++) {
    const o = t * 9;
    const cx = (p[o] + p[o + 3] + p[o + 6]) / 3, cy = (p[o + 1] + p[o + 4] + p[o + 7]) / 3, cz = (p[o + 2] + p[o + 5] + p[o + 8]) / 3;
    const dst = pred(cx, cy, cz) ? A : Bt;
    for (let k = 0; k < 9; k++) { dst.p.push(p[o + k]); dst.n.push(n[o + k]); }
    if (u) for (let k = 0; k < 6; k++) dst.u.push(u[t * 6 + k]);
  }
  const mkG = (d) => {
    if (!d.p.length) return null;
    const g = makeGeometry(d.p, d.n);
    if (u) g.attributes.uv.array.set(d.u);
    return g;
  };
  return [mkG(A), mkG(Bt)];
}

// Convex hull (monotone chain) of [x, y] points, CCW.
export function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// Closed (or open) centripetal Catmull-Rom through traced points: the traced kinks become
// the small radii a machined part has. Dial frame.
export function smoothClosed(pts, perSeg = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  return curve.getPoints(pts.length * perSeg).slice(0, -1).map((p) => [p.x, p.y]);
}
export function smoothOpen(pts, perSeg = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  return curve.getPoints((pts.length - 1) * perSeg).map((p) => [p.x, p.y]);
}

// Surface of revolution about Z at (cx, cy). parts: polylines [[r, z], …], smooth inside a
// polyline, creased between polylines. Face normal = (dz, −dr) along the profile: walk
// upwards (+z) on outer walls, outwards (+r) on faces that look towards the back (−Z).
export function lathe(parts, segs, cx = 0, cy = 0) {
  const geos = parts.map((p) => {
    const g = new THREE.LatheGeometry(p.map(([r, z]) => new THREE.Vector2(Math.max(r, 0), z)), segs);
    g.rotateX(Math.PI / 2);
    return g.toNonIndexed();
  });
  const g = geos.length === 1 ? geos[0] : mergeGeometries(geos);
  g.translate(cx, cy, 0);
  return g;
}

// Merge any geometries (indexed or not) into one non-indexed geometry with position,
// normal and uv.
export function mergeAll(list) {
  const geos = list.filter(Boolean).map((g) => {
    let x = g.index ? g.toNonIndexed() : g;
    if (!x.attributes.normal) x.computeVertexNormals();
    if (!x.attributes.uv) x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
    for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k);
    return x;
  });
  if (!geos.length) return null;
  const g = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  g.computeBoundingSphere();
  return g;
}

// Hole jewel (synthetic ruby) with its oil cup on the face at zFace; dir = +1 → the
// jewel extends towards +Z from that face (cup faces −Z, the case back), dir = −1 → it
// extends towards −Z (cup faces the dial). rj jewel radius, rh hole radius, t thickness.
export function jewelGeometry(c, rj, rh, zFace, t, dir = 1, segs = 40) {
  const cupR = rj * 0.58, cupD = Math.min(0.06, t * 0.35), ch = Math.min(0.03, rj * 0.07);
  const cup = [];
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    cup.push([rh + (cupR - rh) * s, cupD * (1 - s * s)]);
  }
  const parts = [
    cup,
    [[cupR, 0], [rj - ch, 0]],
    [[rj - ch, 0], [rj, ch]],
    [[rj, ch], [rj, t]],
    [[rj, t], [rh, t]],
    [[rh, t], [rh, cupD]],
  ].map((p) => {
    const q = p.map(([r, z]) => [r, zFace + dir * z]);
    return dir > 0 ? q : q.reverse();
  });
  return lathe(parts, segs, c[0], c[1]);
}

// Slotted screw head at c facing −Z (the case back): radius r, head top at zTop, height h
// (towards +Z), slot width slotW and depth slotD at slotDeg (math angle of the slot), a
// polished bevel `bev` round the top and a dome of height domeH. shank = { r, z }: a
// threaded shank from the underside to z. Returns { head, floor } (floor = slot bottom).
export function screwGeometry(c, r, zTop, h, { slotW = r * 0.22, slotD = r * 0.16, slotDeg = 0, bev = r * 0.08, domeH = r * 0.04, shank = null, segs = 40 } = {}) {
  const a = slotDeg * DEG, nx = -Math.sin(a), ny = Math.cos(a);
  const beta = Math.acos(Math.min(0.999, slotW / 2 / r));
  const halves = [1, -1].map((sg) => {
    const phi = Math.atan2(ny * sg, nx * sg);
    const pts = [];
    const N = Math.max(16, segs >> 1);
    for (let i = 0; i <= N; i++) { const t = phi - beta + (2 * beta * i) / N; pts.push([r * Math.cos(t), r * Math.sin(t)]); }
    const p1 = pts[N], p0 = pts[0];
    for (const f of [0.08, 0.5, 0.92]) pts.push([p1[0] + (p0[0] - p1[0]) * f, p1[1] + (p0[1] - p1[1]) * f]);
    return { outer: pts, holes: [] };
  });
  const k = (2 * domeH) / (r * r);
  const s = slab(halves, zTop, zTop + slotD, {
    back: (x, y) => (Math.hypot(x, y) > r - 0.004 ? bev : 0),
    capDial: false,
    capNormal: (x, y) => { const l = Math.hypot(k * x, k * y, 1); return [(k * x) / l, (k * y) / l, -1 / l]; },
  });
  const core = lathe([[[r, zTop + slotD], [r, zTop + h]]], segs);
  const floor = lathe([[[0, zTop + slotD], [r, zTop + slotD]]], segs);
  const list = [s.caps, s.walls, core];
  if (shank && shank.z > zTop + h + 0.05) {
    const zs = zTop + h, thread = [[shank.r, zs]];
    for (let z = zs + 0.03, j = 0; z < shank.z - 0.03; z += 0.03, j++) thread.push([j % 2 ? shank.r : shank.r * 0.84, z]);
    thread.push([shank.r * 0.8, shank.z]);
    list.push(lathe([[[r, zs], [shank.r, zs]], thread, [[shank.r * 0.8, shank.z], [0, shank.z]]], 20));
  }
  const head = mergeAll(list);
  head.translate(c[0], c[1], 0);
  floor.translate(c[0], c[1], 0);
  return { head, floor: mergeAll([floor]) };
}

// =====================================================================================
// ENGRAVING: a single-stroke DIN-like font (the plates are engraved with a cutter, so a
// monoline face with round ends is what the real lettering is), rendered into colour,
// alpha and normal maps for a decal grid. Units: cap height = 1.
// =====================================================================================
const FS = 0.17, GAP = 0.24, SPACE = 0.34; // stroke, letter gap, word space (× cap)
const YB = FS / 2, YT = 1 - FS / 2;
function arc(cx, cy, rx, ry, a0, a1, n = 18) {
  const o = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * DEG; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return o;
}
const stroke = (closed, ...items) => {
  const p = [];
  for (const it of items) { if (typeof it[0] === 'number') p.push(it); else p.push(...it); }
  return { p, closed };
};
const GLYPHS = (() => {
  const G = {};
  const add = (ch, w, ...s) => { G[ch] = { w, s }; };
  const B = YB, T = YT, M = 0.5;
  let w, r;
  w = 0.6; r = 0.31; add('D', w, stroke(true, [0, B], [0, T], [w - r, T], arc(w - r, T - r, r, r, 90, 0), arc(w - r, B + r, r, r, 0, -90)));
  w = 0.42; add('E', w, stroke(false, [w, T], [0, T], [0, B], [w, B]), stroke(false, [0, M], [w * 0.86, M]));
  w = 0.42; add('F', w, stroke(false, [w, T], [0, T], [0, B]), stroke(false, [0, M], [w * 0.86, M]));
  w = 0.56; r = w / 2; add('U', w, stroke(false, [0, T], arc(r, B + r, r, r, 180, 360), [w, T]));
  w = 0.66; add('T', w, stroke(false, [0, T], [w, T]), stroke(false, [w / 2, T], [w / 2, B]));
  w = 0.54; add('S', w, stroke(false, arc(w / 2, T - 0.215, w / 2, 0.215, 15, 250), arc(w / 2, B + 0.235, w / 2, 0.235, 65, -165)));
  w = 0.6; r = 0.3; add('C', w, stroke(false, arc(w / 2, T - r, w / 2, r, 30, 180), arc(w / 2, B + r, w / 2, r, 180, 330)));
  w = 0.62; r = 0.31; add('G', w, stroke(false, arc(w / 2, T - r, w / 2, r, 30, 180), arc(w / 2, B + r, w / 2, r, 180, 360), [w, 0.46], [w * 0.52, 0.46]));
  w = 0.64; r = 0.32; add('O', w, stroke(true, arc(w / 2, T - r, w / 2, r, 0, 180), arc(w / 2, B + r, w / 2, r, 180, 360)));
  w = 0.6; add('H', w, stroke(false, [0, B], [0, T]), stroke(false, [w, B], [w, T]), stroke(false, [0, M], [w, M]));
  w = 0.58; add('N', w, stroke(false, [0, B], [0, T], [w, B], [w, T]));
  w = 0.78; add('M', w, stroke(false, [0, B], [0, T], [w / 2, 0.32], [w, T], [w, B]));
  w = 0.46; add('L', w, stroke(false, [0, T], [0, B], [w, B]));
  w = 0.7; add('A', w, stroke(false, [0, B], [w / 2, T], [w, B]), stroke(false, [w * 0.19, 0.33], [w * 0.81, 0.33]));
  w = 1.0; add('W', w, stroke(false, [0, T], [w * 0.24, B], [w / 2, T - 0.06], [w * 0.76, B], [w, T]));
  w = 0.66; add('V', w, stroke(false, [0, T], [w / 2, B], [w, T]));
  w = 0.6; add('X', w, stroke(false, [0, T], [w, B]), stroke(false, [w, T], [0, B]));
  w = 0.54; add('Z', w, stroke(false, [0, T], [w, T], [0, B], [w, B]));
  w = 0.62; add('Y', w, stroke(false, [0, T], [w / 2, 0.46], [w, T]), stroke(false, [w / 2, 0.46], [w / 2, B]));
  w = 0.56; add('K', w, stroke(false, [0, B], [0, T]), stroke(false, [w, T], [0, 0.36]), stroke(false, [0.2, 0.52], [w, B]));
  w = 0.54; r = 0.22; add('P', w, stroke(false, [0, B], [0, T], [w - r, T], arc(w - r, T - r, r, r, 90, -90), [0, T - 2 * r]));
  w = 0.55; r = 0.215; add('R', w, stroke(false, [0, B], [0, T], [w - r, T], arc(w - r, T - r, r, r, 90, -90), [0, T - 2 * r]), stroke(false, [w - r - 0.03, T - 2 * r], [w, B]));
  {
    w = 0.55;
    const rt = (T - 0.5) / 2, rb = (0.5 - B) / 2;
    add('B', w, stroke(false, [0, B], [0, T], [w - 0.06 - rt, T], arc(w - 0.06 - rt, T - rt, rt, rt, 90, -90), [0, 0.5]),
      stroke(false, [0, 0.5], [w - rb, 0.5], arc(w - rb, B + rb, rb, rb, 90, -90), [0, B]));
  }
  w = 0.44; add('J', w, stroke(false, [w, T], arc(w / 2, B + 0.24, w / 2, 0.24, 0, -180)));
  add('I', 0, stroke(false, [0, B], [0, T]));
  const dots = (ww) => [stroke(false, [ww * 0.27, 1.12], [ww * 0.27 + 0.001, 1.12]), stroke(false, [ww * 0.73, 1.12], [ww * 0.73 + 0.001, 1.12])];
  add('Ü', G.U.w, ...G.U.s, ...dots(G.U.w));
  add('Ö', G.O.w, ...G.O.s, ...dots(G.O.w));
  add('Ä', G.A.w, ...G.A.s, ...dots(G.A.w));
  // digits (DIN 1451-like)
  w = 0.47; r = 0.26; add('0', w, stroke(true, arc(w / 2, T - r, w / 2, r, 0, 180), arc(w / 2, B + r, w / 2, r, 180, 360)));
  add('1', 0.25, stroke(false, [0, T - 0.24], [0.25, T], [0.25, B]));
  w = 0.52; add('2', w, stroke(false, arc(w / 2, T - 0.25, w / 2, 0.25, 160, -30), [0, B], [w, B]));
  w = 0.48; add('3', w, stroke(false, arc(w / 2, T - 0.2, w * 0.47, 0.2, 155, -90), arc(w / 2, B + 0.23, w / 2, 0.23, 90, -158)));
  w = 0.6; add('4', w, stroke(false, [w * 0.74, B], [w * 0.74, T], [0, 0.32], [w, 0.32]));
  w = 0.52; add('5', w, stroke(false, [w * 0.92, T], [0.04, T], [0, 0.56], arc(w / 2, B + 0.27, w / 2, 0.27, 140, -150)));
  {
    w = 0.53;
    const cy = B + 0.275, a = 158 * DEG;
    add('6', w, stroke(true, arc(w / 2, cy, w / 2, 0.275, 0, 360)), stroke(false, [w / 2 + (w / 2) * Math.cos(a), cy + 0.275 * Math.sin(a)], [w * 0.7, T]));
  }
  w = 0.52; add('7', w, stroke(false, [0, T], [w, T], [w * 0.26, B]));
  w = 0.52; add('8', w, stroke(true, arc(w / 2, T - 0.2, w * 0.45, 0.2, 0, 360)), stroke(true, arc(w / 2, B + 0.23, w / 2, 0.23, 0, 360)));
  {
    w = 0.53;
    const cy = T - 0.275, a = -22 * DEG;
    add('9', w, stroke(true, arc(w / 2, cy, w / 2, 0.275, 0, 360)), stroke(false, [w / 2 + (w / 2) * Math.cos(a), cy + 0.275 * Math.sin(a)], [w * 0.3, B]));
  }
  add('°', 0.34, stroke(true, arc(0.17, 0.7, 0.17, 0.17, 0, 360)));
  add('º', 0.34, stroke(true, arc(0.17, 0.7, 0.17, 0.17, 0, 360)));
  add('-', 0.3, stroke(false, [0, 0.45], [0.3, 0.45]));
  add('.', 0, stroke(false, [0, B], [0.001, B]));
  return G;
})();

// Width of a string in cap heights (outer letter extents).
export function engravingTextWidth(str) {
  let w = 0, n = 0;
  for (const ch of str) {
    const g = GLYPHS[ch];
    w += ch === ' ' ? SPACE : g ? g.w + FS : 0.6;
    n++;
  }
  return w + GAP * Math.max(0, n - 1);
}

// Stroke `str` into a 2-D canvas context with its outer-left edge at x (px) and its
// baseline (outer bottom) at y (px); capPx = cap height in px, hs = horizontal stretch.
export function engravingDrawText(c, str, x, y, capPx, hs = 1) {
  c.lineWidth = FS * capPx;
  let xo = 0;
  for (const ch of str) {
    if (ch === ' ') { xo += SPACE + GAP; continue; }
    const g = GLYPHS[ch];
    if (!g) { xo += 0.6 + GAP; continue; }
    for (const s of g.s) {
      c.beginPath();
      s.p.forEach(([gx, gy], i) => {
        const X = x + (xo + FS / 2 + gx) * capPx * hs, Y = y - gy * capPx;
        if (i) c.lineTo(X, Y); else c.moveTo(X, Y);
      });
      if (s.closed) c.closePath();
      c.stroke();
    }
    xo += g.w + FS + GAP;
  }
}

function boxBlur(src, w, h, r, passes = 3) {
  let a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  const k = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc * k;
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc * k;
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

// Engraved lettering → { map, alphaMap, normalMap }. draw(ctx2d) strokes the letters
// (white on black). mask(px, py) → false hides a pixel. strength > 0: the gold fill
// bulges slightly (filled engraving); < 0: a cut groove.
export function engravingTextures(wPx, hPx, draw, { mask, blur = 3, fill = 1, edge = 0.52, strength = 2.6 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = wPx; cv.height = hPx;
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, wPx, hPx);
  c.strokeStyle = '#fff';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  draw(c);
  const img = c.getImageData(0, 0, wPx, hPx), d = img.data, n = wPx * hPx;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = d[i * 4] / 255;
  if (mask) {
    for (let y = 0; y < hPx; y++) for (let x = 0; x < wPx; x++) { const i = y * wPx + x; if (a[i] > 0 && !mask(x + 0.5, y + 0.5)) a[i] = 0; }
  }
  const b = boxBlur(a, wPx, hPx, blur, 3);
  const mkc = () => { const k = document.createElement('canvas'); k.width = wPx; k.height = hPx; return k; };
  const cMap = mkc(), cAlpha = mkc(), cNorm = mkc();
  const iMap = cMap.getContext('2d').createImageData(wPx, hPx);
  const iAl = cAlpha.getContext('2d').createImageData(wPx, hPx);
  const iN = cNorm.getContext('2d').createImageData(wPx, hPx);
  const dm = iMap.data, da = iAl.data, dn = iN.data;
  for (let y = 0; y < hPx; y++) {
    const up = (y > 0 ? y - 1 : 0) * wPx, dn0 = (y < hPx - 1 ? y + 1 : y) * wPx, row = y * wPx;
    for (let x = 0; x < wPx; x++) {
      const i = row + x, o = i * 4;
      const bi = b[i];
      if (bi < 0.002 && a[i] === 0) {
        dm[o] = dm[o + 1] = dm[o + 2] = edge * 255; da[o] = da[o + 1] = da[o + 2] = 0;
        dn[o] = dn[o + 1] = 128; dn[o + 2] = 255;
        dm[o + 3] = da[o + 3] = dn[o + 3] = 255;
        continue;
      }
      const t = Math.min(1, Math.max(0, (bi - 0.15) / 0.7));
      const sh = (edge + (fill - edge) * t * t * (3 - 2 * t)) * 255;
      dm[o] = dm[o + 1] = dm[o + 2] = sh; dm[o + 3] = 255;
      const al = Math.min(1, a[i] * 1.15) * 255;
      da[o] = da[o + 1] = da[o + 2] = al; da[o + 3] = 255;
      const xl = x > 0 ? x - 1 : 0, xr = x < wPx - 1 ? x + 1 : x;
      const nx = (b[row + xr] - b[row + xl]) * strength, ny = -(b[dn0 + x] - b[up + x]) * strength;
      const l = Math.sqrt(nx * nx + ny * ny + 1);
      dn[o] = ((nx / l) * 0.5 + 0.5) * 255; dn[o + 1] = ((ny / l) * 0.5 + 0.5) * 255; dn[o + 2] = (0.5 / l + 0.5) * 255; dn[o + 3] = 255;
    }
  }
  cMap.getContext('2d').putImageData(iMap, 0, 0);
  cAlpha.getContext('2d').putImageData(iAl, 0, 0);
  cNorm.getContext('2d').putImageData(iN, 0, 0);
  const tex = (cv2, srgb) => {
    const t = new THREE.CanvasTexture(cv2);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: tex(cMap, true), alphaMap: tex(cAlpha, false), normalMap: tex(cNorm, false) };
}

// Decal grid facing −Z (seen through the case back). toBack(u, v) → BACK-view [x, y]
// (u along the reading direction, v up the letters); the mesh is built in the dial frame.
export function decalGeometry(toBack, nu, nv, z) {
  const pos = [], uv = [], nrm = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      const [xb, yb] = toBack(u, v);
      pos.push(-xb, yb, z); uv.push(u, v); nrm.push(0, 0, -1);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 2, d = a + nu + 1;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Text set on an arc, as seen from the BACK: radius rc (letter centre line), back-view
// clock angles a0 → a1 (degrees, clockwise from 12) of the outer letter extents, tops
// 'outward' or 'inward', cap height (mm). Reading direction follows a0 → a1. Returns
// { geometry, textures } for engravingMaterial(); px = texture px per mm.
export function arcEngraving(str, rc, a0, a1, tops, cap, z, { px = 160, mask = null, texOpt = {} } = {}) {
  const dir = a1 > a0 ? 1 : -1; // +1: clockwise (back view)
  const pad = 0.6 * DEG;
  const th0 = a0 * DEG - dir * pad, th1 = a1 * DEG + dir * pad; // back-view clock angles (rad)
  const span = Math.abs(th1 - th0);
  const ra = rc - cap / 2 - 0.16, rb = rc + cap / 2 + 0.16;
  const wPx = Math.max(8, Math.round(span * rc * px)), hPx = Math.max(8, Math.round((rb - ra) * px));
  const hs = (Math.abs(a1 - a0) * DEG * rc) / (engravingTextWidth(str) * cap);
  // canvas top row = letter tops: tops outward → r = rb at the top; inward → r = ra
  const topR = tops === 'outward' ? rb : ra, botR = tops === 'outward' ? ra : rb;
  const baseFromTop = (tops === 'outward' ? rb - (rc - cap / 2) : (rc + cap / 2) - ra) * px;
  const toBack = (u, v) => { // v up the letters: from botR (v = 0) to topR (v = 1)
    const th = th0 + (th1 - th0) * u, r = botR + (topR - botR) * v;
    return [r * Math.sin(th), r * Math.cos(th)];
  };
  const textures = engravingTextures(wPx, hPx, (c) => engravingDrawText(c, str, pad * rc * px, baseFromTop, cap * px, hs), {
    blur: 3, edge: 0.5, strength: 2.6, ...texOpt,
    mask: mask ? (x, y) => { const [xb, yb] = toBack(x / wPx, 1 - y / hPx); return mask(-xb, yb); } : undefined,
  });
  return { geometry: decalGeometry(toBack, Math.max(24, Math.round(span / (1.5 * DEG))), 2, z), textures };
}
