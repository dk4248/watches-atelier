// DIAL of the Grand Seiko SBGA211 "Snowflake" (builder B2, plan.md §B2).
//
//  - The Snowflake dial: a die-stamped brass blank, silver-plated (no paint). Its relief is a
//    procedural height field (wind-swept snow: wavy drift ridges along 12–6 at three scales
//    plus a fine isotropic grain, spec.dial.texture), baked on the GPU into a dial-sized normal
//    map and an AO/roughness map (4096² / 2048², lite 2048² / 1024²): 128 px/mm, no repeat.
//  - Printing as real vector geometry (crisp at any zoom): the 49 minute-track ticks, the
//    "Grand Seiko" blackletter and the navy "SPRING DRIVE" (both traced from the photos, see
//    glyphs.js); the tiny "JAPAN 9R65-0BL0 T 2" arc is a small canvas decal.
//  - Applied, mirror-polished pieces: 11 faceted markers (wedges at 12/6/9, bars elsewhere),
//    the faceted GS monogram, the date-window frame (flat band + 45° inner bevel).
//  - The recessed power-reserve fan: 19 fluted ribs on the outer band, a concentrically
//    turned inner field, two applied end marks (part 'power-reserve').
//  - The date ring under the dial (white, black grotesque numerals, 31 internal teeth),
//    seen through the window; it turns counter-clockwise and jumps at midnight.
//  - Two brass dial feet.
// Part ids: dial indices gs-logo power-reserve date-window date-ring dial-feet.
// Every position, radius and level comes from SPEC (spec.dial, spec.date.ring, spec.z).

import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gsMonogramOps, grandSeikoOps, springDriveOps, opsToShapes, DIAL_MEASURED } from './glyphs.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ local constants
// Snowflake relief (heights in mm; ≈ 40 µm peak to valley in all). Tuned side by side, at the
// same mm scale, with ltF_12 (flat light), btq_dial1 / off_dial (studio light) and mov_naked_20.
const SNOW = {
  drift: 0.02, // (a) broad soft drifts, 0.9 × 3.0 mm cells (1.7–3.3 mm wavelength across)
  crest: 0.012, // (b) crisp braided crests and scoops, 0.35 × 1.2 mm
  fleck: 0.0025, // wind lines: braided creases along 12–6 …
  creaseWidth: 0.12, creaseLength: 0.6, creaseSharp: 3, // … their cell size (mm) and sharpness
  grain: 0.001, // (c) fine isotropic grain, 0.05 mm
  clump: 0.005, clumpSize: [0.15, 0.3], // frost clumps (billows)
  terrace: 0.012, terraceFreq: 0.5, terraceEdge: 0.75, // crusted layer edges (patches 1–3 mm)
  warp: 0.2, // domain warp amplitude (mm) → local direction wanders ±20–30°
  roughness: 0.42, // base roughness of the silver plating (spec.dial.material)
  crestGloss: 0.12, // crests a little smoother (faint sparkle) …
  pitRough: 0.1, // … pits a little rougher
  cavityAO: 0.35, // ambient occlusion in the pits
};
// Look of the silver plating under the studio light (albedo tuned against the photos'
// #E7E7E7 render / #D5D7D8 daylight with the explicitly bound environment).
const DIAL_FINISH = { albedo: 0xe9eaeb, envMapIntensity: 0.85, sheen: 0.35, sheenRoughness: 0.5 };
const POLISHED = { color: 0xe3e4e6, roughness: 0.045, envMapIntensity: 1.1 }; // markers, logo, frame
const BAR_END_BEVEL = 0.25;
// "JAPAN 9R65-0BL0 T 2": angles re-measured on the traced macro (spec has 9R65-0BL0 from 184°,
// which leaves no word space after JAPAN; the photos show one): deg clockwise from 12
const BOTTOM_TEXT_DEG = { JAPAN: [193.8, 184.6], '9R65-0BL0': [182.8, 171.4] }; // bars: small end bevels (spec gives none; photos ltF_12 / btq_dial1)
const PRINT_LIFT = 0.004; // vector print sits this far above the dial face (plus polygon offset)
const PR = {
  ribTiltDeg: 10, // fluted outer band: facet tilt of the zig-zag ribs
  grooveLand: 0.55, // inner field: flat land fraction of each 0.13 mm groove pitch
  grooveSlope: 0.6,
  markHeight: 0.06, // applied end marks
};
const FRAME_CHAMFER = 0.03; // date frame: tiny polished chamfer on the outer top edge

// ------------------------------------------------------------------ snowflake generator
// GLSL: gradient noise with an integer hash (identical on every GPU), anisotropic fbm,
// ridged noise, domain warp; mode 0 writes the tangent-space normal map, mode 1 the
// AO (R) / roughness (G) map. One tile per draw (≤ 1024², so no long GPU stalls).
const SNOW_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform vec2 uOrigin;
uniform float uMmPerPx;
uniform int uMode;
uniform vec4 uAmpA;   // drift, crest, fleck, grain (mm)
uniform vec4 uAmpB;   // clump, terrace (mm), warp (mm), -
uniform vec4 uShape;  // terrace frequency, terrace edge start, crease sharpness, crease width (mm)
uniform vec4 uShape2; // crease length (mm), clump width, clump length, -
uniform vec4 uRgh;    // base roughness, crest gloss, pit roughness, cavity AO

uint hsh(uint x) {
  x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16;
  return x;
}
vec2 grd(ivec2 p, uint seed) {
  uint h = hsh(uint(p.x) * 0x9E3779B1U ^ hsh(uint(p.y) + seed * 0x85EBCA77U));
  float a = float(h & 0xFFFFU) * (6.28318530718 / 65536.0);
  return vec2(cos(a), sin(a));
}
float gn(vec2 x, uint seed) {
  vec2 i = floor(x);
  vec2 f = x - i;
  ivec2 c = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grd(c, seed), f);
  float b = dot(grd(c + ivec2(1, 0), seed), f - vec2(1.0, 0.0));
  float d = dot(grd(c + ivec2(0, 1), seed), f - vec2(0.0, 1.0));
  float e = dot(grd(c + ivec2(1, 1), seed), f - vec2(1.0, 1.0));
  return 1.41421 * mix(mix(a, b, u.x), mix(d, e, u.x), u.y);
}
// anisotropic fbm: no domain rotation between octaves, so the stretch survives
float fbmA(vec2 p, uint seed, int oct) {
  float s = 0.0, amp = 0.5, nrm = 0.0;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    s += amp * gn(p, seed + uint(i) * 101U);
    nrm += amp;
    p = p * 2.03 + vec2(17.13, 31.71);
    amp *= 0.5;
  }
  return s / nrm;
}
float ridgedA(vec2 p, uint seed, int oct) {
  float s = 0.0, amp = 0.5, nrm = 0.0, prev = 1.0;
  for (int i = 0; i < 4; i++) {
    if (i >= oct) break;
    float n = 1.0 - abs(gn(p, seed + uint(i) * 131U));
    n *= n;
    s += amp * n * (0.5 + 0.5 * prev);
    prev = n;
    nrm += amp;
    p = p * 2.07 + vec2(5.31, 12.77);
    amp *= 0.5;
  }
  return s / nrm;
}
float snowH(vec2 p) {
  // the drift direction wanders ±20–30° (low-frequency domain warp)
  vec2 w = vec2(fbmA(p * (1.0 / 1.5), 11U, 2), fbmA(p * (1.0 / 1.5) + 7.0, 23U, 2));
  vec2 q = p + uAmpB.z * w;
  // (a) broad soft drifts, elongated along 12–6
  float a = fbmA(q * vec2(1.0 / 0.9, 1.0 / 3.0), 31U, 3);
  // (b) crisp braided crests and scoop pits
  float b = ridgedA(q * vec2(1.0 / 0.35, 1.0 / 1.2), 47U, 3) - 0.45;
  // wind lines: braided creases along 12–6 (zero lines of strongly stretched noise)
  float n1 = gn(q * vec2(1.0 / uShape.w, 1.0 / uShape2.x), 59U);
  float n2 = gn(q * vec2(0.6 / uShape.w, 0.6 / uShape2.x) + 3.7, 61U);
  float s = pow(1.0 - abs(n1), uShape.z) + 0.7 * pow(1.0 - abs(n2), uShape.z);
  // frost clumps (billows: soft lumps with creases between them)
  float k = 0.5 - abs(fbmA(q * vec2(1.0 / uShape2.y, 1.0 / uShape2.z), 63U, 2));
  // crusted layer edges: soft steps on a rough version of the drift field (patches 1–3 mm)
  float t = (a + 0.3 * fbmA(q * vec2(1.0 / 0.3, 1.0 / 0.6), 67U, 2)) * uShape.x;
  float terr = floor(t) + smoothstep(uShape.y, 1.0, fract(t));
  // (c) fine isotropic grain
  float c = fbmA(p * (1.0 / 0.05), 71U, 2);
  return uAmpA.x * a + uAmpA.y * b - uAmpA.z * s + uAmpA.w * c + uAmpB.x * k + uAmpB.y * terr;
}
void main() {
  vec2 p = uOrigin + gl_FragCoord.xy * uMmPerPx;
  if (uMode == 0) {
    float e = uMmPerPx;
    float hx = snowH(p + vec2(e, 0.0)) - snowH(p - vec2(e, 0.0));
    float hy = snowH(p + vec2(0.0, e)) - snowH(p - vec2(0.0, e));
    vec3 n = normalize(vec3(-hx / (2.0 * e), -hy / (2.0 * e), 1.0));
    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
  } else {
    float h = snowH(p);
    float r = 0.05, m = 0.0;
    for (int i = 0; i < 6; i++) {
      float a = float(i) * 1.0471976 + 0.3;
      m += snowH(p + r * vec2(cos(a), sin(a)));
    }
    float cav = (h - m / 6.0) / 0.004;
    float crest = clamp(cav, 0.0, 1.0), pit = clamp(-cav, 0.0, 1.0);
    float rough = clamp(uRgh.x - uRgh.y * crest + uRgh.z * pit, 0.05, 1.0);
    float ao = 1.0 - uRgh.w * pit;
    gl_FragColor = vec4(ao, rough, 1.0, 1.0);
  }
}`;

// Renders the snowflake maps into two render targets (normal N², AO/roughness (N/2)²) and
// re-renders them if the WebGL context is lost and restored. Returns null without a renderer.
function makeSnowMaps(THREE, renderer, R, N, maxAniso) {
  if (!renderer || !renderer.getContext) return null;
  const mkRT = (size) => new THREE.WebGLRenderTarget(size, size, {
    depthBuffer: false, stencilBuffer: false, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
    colorSpace: THREE.NoColorSpace, anisotropy: maxAniso, type: THREE.UnsignedByteType,
  });
  const normalRT = mkRT(N), ormRT = mkRT(Math.max(256, N / 2));
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: SNOW_FRAG,
    uniforms: {
      uOrigin: { value: new THREE.Vector2(-R, -R) }, uMmPerPx: { value: 0 }, uMode: { value: 0 },
      uAmpA: { value: new THREE.Vector4() }, uAmpB: { value: new THREE.Vector4() }, uRgh: { value: new THREE.Vector4() },
      uShape: { value: new THREE.Vector4() }, uShape2: { value: new THREE.Vector4() },
    },
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const params = { ...SNOW };

  function renderInto(rt, mode) {
    const size = rt.width, T = Math.min(size, 1024);
    const u = mat.uniforms;
    u.uMode.value = mode;
    u.uMmPerPx.value = (2 * R) / size;
    u.uAmpA.value.set(params.drift, params.crest, params.fleck, params.grain);
    u.uAmpB.value.set(params.clump, params.terrace, params.warp, 0);
    u.uShape.value.set(params.terraceFreq, params.terraceEdge, params.creaseSharp, params.creaseWidth);
    u.uShape2.value.set(params.creaseLength, params.clumpSize[0], params.clumpSize[1], 0);
    u.uRgh.value.set(params.roughness, params.crestGloss, params.pitRough, params.cavityAO);
    rt.scissorTest = true;
    for (let ty = 0; ty < size; ty += T) {
      for (let tx = 0; tx < size; tx += T) {
        rt.viewport.set(tx, ty, T, T);
        rt.scissor.set(tx, ty, T, T);
        renderer.setRenderTarget(rt);
        renderer.render(scene, cam);
      }
    }
    rt.scissorTest = false;
    rt.viewport.set(0, 0, size, size);
    rt.scissor.set(0, 0, size, size);
  }
  function generate(overrides) {
    if (overrides) Object.assign(params, overrides);
    const prevRT = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    const prevXR = renderer.xr ? renderer.xr.enabled : false;
    renderer.autoClear = false;
    if (renderer.xr) renderer.xr.enabled = false;
    try {
      renderInto(normalRT, 0);
      renderInto(ormRT, 1);
    } finally {
      renderer.setRenderTarget(prevRT);
      renderer.autoClear = prevAuto;
      if (renderer.xr) renderer.xr.enabled = prevXR;
    }
    return params;
  }
  generate();

  // Context restored (GPU reset, sleep/resume): render targets come back empty → redo them.
  const canvas = renderer.domElement;
  const onRestore = () => { try { generate(); } catch (e) { console.error('[gs dial] snow maps', e); } };
  canvas?.addEventListener?.('webglcontextrestored', onRestore);
  // When the dial is torn down (registry.clear disposes its textures) free everything.
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    canvas?.removeEventListener?.('webglcontextrestored', onRestore);
    normalRT.dispose();
    ormRT.dispose();
    mat.dispose();
    quad.geometry.dispose();
  };
  normalRT.texture.addEventListener('dispose', dispose);
  ormRT.texture.addEventListener('dispose', dispose);
  return { normalMap: normalRT.texture, ormMap: ormRT.texture, normalRT, ormRT, generate, params, size: N };
}

// ------------------------------------------------------------------ small helpers
function ringPts(THREE, r, n, cx = 0, cy = 0, a0 = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU;
    pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts;
}
function rectPts(THREE, cx, cy, w, h) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => new THREE.Vector2(cx + (sx * w) / 2, cy + (sy * h) / 2));
}
// ExtrudeGeometry: group 0 = both lids (bottom first, then top), group 1 = walls.
// Re-group as 0 = top lid, 1 = walls, 2 = bottom lid.
function splitLids(geo) {
  const [lids, sides] = geo.groups;
  const half = lids.count / 2;
  geo.clearGroups();
  geo.addGroup(lids.start + half, half, 0);
  geo.addGroup(sides.start, sides.count, 1);
  geo.addGroup(lids.start, half, 2);
  return geo;
}
// One single-material mesh per geometry group (null = drop that group): the registry's
// X-ray / highlight code clones mesh.material, which fails on material arrays.
function meshesFromGroups(THREE, geo, mats) {
  const out = [];
  mats.forEach((mat, mi) => {
    if (!mat) return;
    const groups = geo.groups.filter((g) => g.materialIndex === mi);
    if (!groups.length) return;
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const k = attr.itemSize;
      const n = groups.reduce((s, g) => s + g.count, 0);
      const arr = new attr.array.constructor(n * k);
      let o = 0;
      for (const g of groups) {
        arr.set(attr.array.subarray(g.start * k, (g.start + g.count) * k), o);
        o += g.count * k;
      }
      part.setAttribute(name, new THREE.BufferAttribute(arr, k, attr.normalized));
    }
    part.computeBoundingSphere();
    out.push(new THREE.Mesh(part, mat));
  });
  return out;
}
// Flat-shaded triangle soup → BufferGeometry with face normals.
function soup(THREE, tris) {
  const pos = new Float32Array(tris.length * 9);
  let o = 0;
  for (const t of tris) for (const p of t) { pos[o++] = p[0]; pos[o++] = p[1]; pos[o++] = p[2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
const quadTris = (a, b, c, d) => [[a, b, c], [a, c, d]];

// Faceted applied piece over a convex footprint: vertical wall to wallH, bevels up to the
// inset top facet at zTop. base / top: [[x, y], …] CCW, same count.
function facetedPiece(base, top, z0, zWall, zTop) {
  const tris = [];
  const n = base.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const B0 = [base[i][0], base[i][1], z0], B1 = [base[j][0], base[j][1], z0];
    const W0 = [base[i][0], base[i][1], zWall], W1 = [base[j][0], base[j][1], zWall];
    const T0 = [top[i][0], top[i][1], zTop], T1 = [top[j][0], top[j][1], zTop];
    if (zWall > z0 + 1e-6) tris.push(...quadTris(B0, B1, W1, W0));
    tris.push(...quadTris(W0, W1, T1, T0));
  }
  for (let i = 1; i < n - 1; i++) tris.push([[top[0][0], top[0][1], zTop], [top[i][0], top[i][1], zTop], [top[i + 1][0], top[i + 1][1], zTop]]);
  return tris;
}

// Clip a polygon [[x, y, z], …] against the half-plane a·x + b·y <= c (Sutherland–Hodgman).
function clipPoly(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const dp = a * P[0] + b * P[1] - c, dq = a * Q[0] + b * Q[1] - c;
    if (dp <= 0) out.push(P);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, P[2] + (Q[2] - P[2]) * t]);
    }
  }
  return out;
}

// Concentric turned grooves round (0, 0) over a square of half-size `half` mm: tangent-space
// normal map (land + V-groove profile) and a tangential anisotropy map.
function grooveTextures(THREE, half, pitch, size) {
  const data = new Uint8Array(size * size * 4);
  const LUT = 1024, lut = new Float32Array(LUT);
  for (let i = 0; i < LUT; i++) {
    const f = i / LUT;
    lut[i] = f < PR.grooveLand ? 0 : -Math.sin(TAU * ((f - PR.grooveLand) / (1 - PR.grooveLand)));
  }
  const mmPerPx = (2 * half) / size;
  for (let j = 0; j < size; j++) {
    const y = -half + (j + 0.5) * mmPerPx; // row 0 = bottom (DataTexture, flipY false)
    for (let i = 0; i < size; i++) {
      const x = -half + (i + 0.5) * mmPerPx;
      const r = Math.hypot(x, y) + 1e-6;
      const f = r / pitch;
      const d = lut[Math.floor((f - Math.floor(f)) * LUT)] * PR.grooveSlope * Math.min(1, r / 0.3);
      const nx = -d * (x / r), ny = -d * (y / r), l = Math.hypot(nx, ny, 1);
      const o = (j * size + i) * 4;
      data[o] = ((nx / l) * 0.5 + 0.5) * 255;
      data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  }
  const normalMap = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  const as = 128, adata = new Uint8Array(as * as * 4);
  for (let j = 0; j < as; j++) {
    for (let i = 0; i < as; i++) {
      const x = (i + 0.5) / as - 0.5, y = (j + 0.5) / as - 0.5;
      const a = Math.atan2(y, x) + Math.PI / 2;
      const o = (j * as + i) * 4;
      adata[o] = (Math.cos(a) * 0.5 + 0.5) * 255;
      adata[o + 1] = (Math.sin(a) * 0.5 + 0.5) * 255;
      adata[o + 2] = 255;
      adata[o + 3] = 255;
    }
  }
  const anisotropyMap = new THREE.DataTexture(adata, as, as, THREE.RGBAFormat);
  for (const t of [normalMap, anisotropyMap]) {
    t.colorSpace = THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 8;
    t.needsUpdate = true;
  }
  return { normalMap, anisotropyMap };
}

// The power-reserve fan outline about the pivot (pivot-relative, CCW): right edge dx = +0.53,
// big arc R 4.95 through 9 o'clock, bottom edge dy = −0.84, R 0.6 fillet round the hub.
function fanOutline(fan, rClip = null, n = 64) {
  const R = rClip ?? fan.radius;
  const dx = fan.rightEdgeDx, dy = fan.bottomEdgeDy, fr = fan.cornerRadius;
  const fc = [dx - fr, dy + fr]; // fillet centre
  const a0 = Math.acos(dx / R); // arc start (on the right edge), maths angle
  const a1 = Math.PI + Math.asin(-dy / R); // arc end (on the bottom edge)
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  pts.push([fc[0], dy]);
  for (let i = 1; i < 8; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 8);
    pts.push([fc[0] + fr * Math.cos(a), fc[1] + fr * Math.sin(a)]);
  }
  pts.push([dx, fc[1]]);
  return pts;
}

// ------------------------------------------------------------------ builder
export function buildDial(ctx) {
  const { THREE, spec, M, reg, root, stage } = ctx;
  const D = spec.dial, Z = spec.z;
  const lite = !!ctx.lite;
  const renderer = stage?.renderer || null;
  const caps = renderer?.capabilities;
  const maxTex = caps?.maxTextureSize || 4096;
  const maxAniso = Math.min(16, caps?.getMaxAnisotropy?.() || 8);
  const SEG = lite ? 0.5 : 1;
  const R = D.radius;
  const [zb, zt] = Z.dial;
  const zFloor = Z.prRecessFloor;
  const env = stage?.scene?.environment || null;
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  const dly = (id) => spec.explodeDelay(id);
  const PRS = D.powerReserve;
  const [pcx, pcy] = PRS.pivot;
  const ap = D.dateWindow.aperture;

  // ---------------------------------------------------------------- materials
  const snow = makeSnowMaps(THREE, renderer, R, Math.min(lite ? 2048 : 4096, maxTex), maxAniso);
  const faceMat = new THREE.MeshPhysicalMaterial({
    name: 'snowflake', color: DIAL_FINISH.albedo, metalness: D.material.metalness, roughness: snow ? 1 : D.material.roughness,
    normalMap: snow?.normalMap || null, roughnessMap: snow?.ormMap || null, aoMap: snow?.ormMap || null, aoMapIntensity: 1,
    sheen: DIAL_FINISH.sheen, sheenColor: new THREE.Color(0xffffff), sheenRoughness: DIAL_FINISH.sheenRoughness,
    envMap: env, envMapIntensity: DIAL_FINISH.envMapIntensity,
  });
  const wallMat = new THREE.MeshPhysicalMaterial({
    name: 'dialWall', color: DIAL_FINISH.albedo, metalness: 0.6, roughness: 0.3, envMap: env, envMapIntensity: DIAL_FINISH.envMapIntensity,
  });
  const backMat = M.brass.clone();
  backMat.name = 'dialBack';
  backMat.color.set(0xb89a62);
  backMat.roughness = 0.55;
  backMat.envMap = env;
  backMat.envMapIntensity = 0.8;
  const polished = M.steelPolished.clone();
  polished.name = 'appliedPolished';
  polished.color.set(POLISHED.color);
  polished.roughness = POLISHED.roughness;
  polished.envMap = env;
  polished.envMapIntensity = POLISHED.envMapIntensity;
  const inkMat = new THREE.MeshPhysicalMaterial({
    name: 'ink', color: D.wordmark.colour, roughness: 0.42, metalness: 0, sheen: 0.2, sheenRoughness: 0.6,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, envMap: env, envMapIntensity: 0.8,
  });
  const navyMat = inkMat.clone();
  navyMat.name = 'inkNavy';
  navyMat.color.set(D.springDrive.colour);

  // ---------------------------------------------------------------- dial plate
  // Upper layer (fan level → dial top) with the fan recess, lower layer (dial bottom → fan
  // level) closed under the fan; both with the centre hole, the date aperture and (lower
  // only) the hole for the power-reserve display arbor.
  const fanPts = fanOutline(PRS.fan, null, Math.round(72 * SEG)).map(([x, y]) => new THREE.Vector2(pcx + x, pcy + y));
  const outer = ringPts(THREE, R, Math.round(384 * SEG));
  const centreHole = () => new THREE.Path(ringPts(THREE, D.centreHole, 48));
  const apertureHole = () => new THREE.Path(rectPts(THREE, ap.center[0], ap.center[1], ap.width, ap.height));
  const upper = new THREE.Shape(outer);
  upper.holes.push(centreHole(), apertureHole(), new THREE.Path(fanPts));
  const lower = new THREE.Shape(outer);
  lower.holes.push(centreHole(), apertureHole(), new THREE.Path(ringPts(THREE, 0.3, 32, pcx, pcy)));
  const upGeo = splitLids(new THREE.ExtrudeGeometry(upper, { depth: zt - zFloor, bevelEnabled: false, curveSegments: 1 }));
  upGeo.translate(0, 0, zFloor);
  ctx.planarUV(upGeo, 1 / (2 * R), [0.5, 0.5]);
  const loGeo = splitLids(new THREE.ExtrudeGeometry(lower, { depth: zFloor - zb, bevelEnabled: false, curveSegments: 1 }));
  loGeo.translate(0, 0, zb);
  const dialObj = new THREE.Group();
  dialObj.name = 'dial';
  for (const m of meshesFromGroups(THREE, upGeo, [faceMat, wallMat, null])) dialObj.add(m);
  for (const m of meshesFromGroups(THREE, loGeo, [null, wallMat, backMat])) dialObj.add(m);
  // ---------------------------------------------------------------- printing (vector)
  const zp = zt + PRINT_LIFT;
  const blackGeos = [];
  {
    // minute track: 48 ticks (none at the hour markers), one enlarged tick at 3
    const mt = D.minuteTrack;
    const tick = (deg, r0, r1, w) => {
      const a = deg * DEG, ux = Math.sin(a), uy = Math.cos(a), nx = uy, ny = -ux;
      const s = new THREE.Shape([
        new THREE.Vector2(ux * r0 - (nx * w) / 2, uy * r0 - (ny * w) / 2), new THREE.Vector2(ux * r0 + (nx * w) / 2, uy * r0 + (ny * w) / 2),
        new THREE.Vector2(ux * r1 + (nx * w) / 2, uy * r1 + (ny * w) / 2), new THREE.Vector2(ux * r1 - (nx * w) / 2, uy * r1 - (ny * w) / 2),
      ]);
      return new THREE.ShapeGeometry(s);
    };
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) {
        if (i === 15) blackGeos.push(tick(90, mt.at3.r[0], mt.at3.r[1], mt.at3.width));
        continue;
      }
      blackGeos.push(tick(i * 6, mt.r[0], mt.r[1], mt.width));
    }
    // "Grand Seiko" blackletter
    const wm = D.wordmark;
    const cap = wm.capTopY - wm.baselineY, width = wm.x[1] - wm.x[0];
    const g = new THREE.ShapeGeometry(opsToShapes(THREE, grandSeikoOps(cap, width)));
    g.translate((wm.x[0] + wm.x[1]) / 2, wm.baselineY, 0);
    blackGeos.push(g);
  }
  const strip = (geos) => {
    const g = mergeGeometries(geos.map((q) => { q.deleteAttribute('uv'); q.deleteAttribute('normal'); return q.index ? q.toNonIndexed() : q; }), false);
    g.computeVertexNormals();
    g.translate(0, 0, zp);
    return g;
  };
  const inkMesh = new THREE.Mesh(strip(blackGeos), inkMat);
  inkMesh.name = 'dial-print';
  inkMesh.castShadow = false;
  dialObj.add(inkMesh);
  {
    const sd = D.springDrive;
    const g = new THREE.ShapeGeometry(opsToShapes(THREE, springDriveOps(sd.capHeight, sd.x[1] - sd.x[0])));
    g.translate((sd.x[0] + sd.x[1]) / 2, sd.baselineY, 0);
    const m = new THREE.Mesh(strip([g]), navyMat);
    m.name = 'dial-print-navy';
    m.castShadow = false;
    dialObj.add(m);
  }
  // "JAPAN 9R65-0BL0 T 2": tiny capitals on the arc outside the minute track at 6, tops toward
  // the centre (a small canvas decal bent onto the arc).
  dialObj.add(bottomTextDecal(THREE, D.bottomText, zp, lite, env));

  dialObj.traverse((o) => {
    if (!o.isMesh) return;
    o.receiveShadow = true;
    o.castShadow = !o.name.startsWith('dial-print'); // the ink casts nothing
  });
  root.add(dialObj);

  // ---------------------------------------------------------------- applied markers
  const MK = D.markers;
  const tanB = Math.tan(MK.bevelAngleDeg * DEG);
  const markerTris = [];
  const addMarker = (hour, r, w, top, sideBevel) => {
    const a = hour * 30 * DEG, ux = Math.sin(a), uy = Math.cos(a), vx = -uy, vy = ux; // v: 90° CCW of outward
    const P = (u, v) => [ux * u + vx * v, uy * u + vy * v];
    const [w0, w1] = Array.isArray(w) ? w : [w, w];
    const base = [P(r[0], -w0 / 2), P(r[1], -w1 / 2), P(r[1], w1 / 2), P(r[0], w0 / 2)];
    const [tr, tw] = top;
    const tp = [P(tr[0], -tw[0] / 2), P(tr[1], -tw[1] / 2), P(tr[1], tw[1] / 2), P(tr[0], tw[0] / 2)];
    const zTop = Z.markersTop;
    const zWall = Math.max(zt, zTop - sideBevel * tanB);
    markerTris.push(...facetedPiece(base, tp, zt, zWall, zTop));
  };
  {
    const w12 = MK.wedge12;
    for (const h of w12.hours) addMarker(h % 12, w12.r, w12.width, [w12.topFacet.r, w12.topFacet.width], w12.sideBevel);
    const w69 = MK.wedge69;
    for (const h of w69.hours) {
      const sb = w69.sideBevel, eb = w69.endBevel;
      addMarker(h, w69.r, w69.width, [[w69.r[0] + eb, w69.r[1] - eb], [w69.width[0] - 2 * sb, w69.width[1] - 2 * sb]], sb);
    }
    const bars = MK.bars;
    for (const h of bars.hours) {
      addMarker(h, bars.r, bars.width, [[bars.r[0] + BAR_END_BEVEL, bars.r[1] - BAR_END_BEVEL], [bars.topFacet, bars.topFacet]], bars.sideBevel);
    }
  }
  const indicesObj = new THREE.Group();
  indicesObj.name = 'indices';
  const markerMesh = new THREE.Mesh(soup(THREE, markerTris), polished);
  markerMesh.name = 'indices-mesh';
  markerMesh.castShadow = true;
  markerMesh.receiveShadow = true;
  indicesObj.add(markerMesh);
  root.add(indicesObj);

  // ---------------------------------------------------------------- applied GS monogram
  const logoObj = new THREE.Group();
  logoObj.name = 'gs-logo';
  {
    const L = D.logo;
    const bev = 0.045, bt = 0.05, zBottom = zt - 0.1;
    const geo = new THREE.ExtrudeGeometry(opsToShapes(THREE, gsMonogramOps(DIAL_MEASURED.monogram.height)), {
      depth: Z.logoTop - zBottom - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bev, bevelOffset: -bev, bevelSegments: 1, curveSegments: 1,
    });
    geo.deleteAttribute('uv');
    geo.translate(L.center[0], L.center[1], zBottom + bt);
    // smooth along the curved outline, crisp between the flat top, the chamfer and the walls
    const m = new THREE.Mesh(toCreasedNormals(geo, 38 * DEG), polished);
    m.name = 'gs-logo-mesh';
    m.castShadow = true;
    m.receiveShadow = true;
    logoObj.add(m);
  }
  root.add(logoObj);

  // ---------------------------------------------------------------- date-window frame
  const frameObj = new THREE.Group();
  frameObj.name = 'date-window';
  {
    const F = D.dateWindow.frame;
    const [x0, x1] = F.x, [y0, y1] = F.y;
    const zTop = Z.dateFrameTop, band = F.faceBand, ch = FRAME_CHAMFER;
    const ax0 = ap.center[0] - ap.width / 2, ax1 = ap.center[0] + ap.width / 2;
    const ay0 = ap.center[1] - ap.height / 2, ay1 = ap.center[1] + ap.height / 2;
    const inset = (Math.min(ax0 - x0, x1 - ax1, ay0 - y0, y1 - ay1)) - band; // plan width of the 45° bevel
    const zBev = zTop - inset; // bevel foot
    const rect = (a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
    const O = rect(x0, x1, y0, y1), C = rect(x0 + ch, x1 - ch, y0 + ch, y1 - ch);
    const Bd = rect(x0 + band, x1 - band, y0 + band, y1 - band), A = rect(ax0, ax1, ay0, ay1);
    const tris = [];
    const ring = (outerR, innerR, zo, zi) => { // band between two CCW rects (faces up/inward)
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        tris.push(...quadTris([outerR[i][0], outerR[i][1], zo], [outerR[j][0], outerR[j][1], zo], [innerR[j][0], innerR[j][1], zi], [innerR[i][0], innerR[i][1], zi]));
      }
    };
    // outer wall
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      tris.push(...quadTris([O[i][0], O[i][1], zt], [O[j][0], O[j][1], zt], [O[j][0], O[j][1], zTop - ch], [O[i][0], O[i][1], zTop - ch]));
    }
    ring(O, C, zTop - ch, zTop); // outer chamfer
    ring(C, Bd, zTop, zTop); // flat top band
    ring(Bd, A, zTop, zBev); // 45° inner bevel
    ring(A, A, zBev, zt - 0.002); // short inner wall down to the dial
    const m = new THREE.Mesh(soup(THREE, tris), polished);
    m.name = 'date-window-frame';
    m.castShadow = true;
    m.receiveShadow = true;
    frameObj.add(m);
  }
  root.add(frameObj);

  // ---------------------------------------------------------------- power-reserve fan
  const prObj = new THREE.Group();
  prObj.name = 'power-reserve';
  prObj.position.set(pcx, pcy, 0);
  {
    const ribs = PRS.ribs, rIn = ribs.r[0], rOut = PRS.fan.radius;
    // inner field: concentrically turned, r < 3.40 (fan ∩ disc), hole for the display arbor
    const field = new THREE.Shape(fanOutline(PRS.fan, rIn, Math.round(48 * SEG)).map(([x, y]) => new THREE.Vector2(x, y)));
    field.holes.push(new THREE.Path(ringPts(THREE, 0.3, 32)));
    const fGeo = new THREE.ShapeGeometry(field);
    fGeo.translate(0, 0, zFloor);
    const half = 5;
    const pa = fGeo.attributes.position, uv = fGeo.attributes.uv;
    for (let i = 0; i < pa.count; i++) uv.setXY(i, (pa.getX(i) + half) / (2 * half), (pa.getY(i) + half) / (2 * half));
    const groove = grooveTextures(THREE, half, PRS.innerField.concentricPitch, lite ? 512 : 1024);
    const fieldMat = new THREE.MeshPhysicalMaterial({
      name: 'prField', color: DIAL_FINISH.albedo, metalness: 0.7, roughness: 0.3, normalMap: groove.normalMap,
      anisotropy: 0.4, anisotropyMap: groove.anisotropyMap, envMap: env, envMapIntensity: DIAL_FINISH.envMapIntensity,
    });
    const fm = new THREE.Mesh(fGeo, fieldMat);
    fm.name = 'power-reserve-field';
    prObj.add(fm);
    // outer band: fluted ribs, a zig-zag whose depth grows with r (planar facets, crests on
    // the rib centres every 5°), clipped by the fan's straight edges
    const k = Math.tan(PR.ribTiltDeg * DEG) * ((ribs.stepDeg / 2) * DEG); // crest height per mm of r
    const tris = [];
    const m0 = 90 - ribs.fromDeg; // rib-centre maths angle (cw-from-12 → maths)
    const aStart = Math.acos(PRS.fan.rightEdgeDx / rOut) / DEG - ribs.stepDeg;
    const aEnd = 180 + Math.asin(-PRS.fan.bottomEdgeDy / rIn) / DEG + ribs.stepDeg;
    const kMin = Math.floor((aStart - m0) / ribs.stepDeg) - 1, kMax = Math.ceil((aEnd - m0) / ribs.stepDeg) + 1;
    const P = (r, aDeg, crest) => [r * Math.cos(aDeg * DEG), r * Math.sin(aDeg * DEG), zFloor + (crest ? k * r : 0)];
    for (let q = kMin; q <= kMax; q++) {
      const c = m0 + q * ribs.stepDeg, h = ribs.stepDeg / 2;
      for (const [a0, a1, cr0, cr1] of [[c - h, c, false, true], [c, c + h, true, false]]) {
        if (a1 < aStart || a0 > aEnd) continue;
        let poly = [P(rIn, a0, cr0), P(rOut, a0, cr0), P(rOut, a1, cr1), P(rIn, a1, cr1)];
        poly = clipPoly(poly, 1, 0, PRS.fan.rightEdgeDx); // x <= dx
        poly = clipPoly(poly, 0, -1, -PRS.fan.bottomEdgeDy); // y >= dy
        if (poly.length < 3) continue;
        for (let i = 1; i < poly.length - 1; i++) tris.push([poly[0], poly[i], poly[i + 1]]);
        // skirt down to the turned field where the band steps up at r 3.40
        for (let i = 0; i < poly.length; i++) {
          const A = poly[i], B = poly[(i + 1) % poly.length];
          if (Math.abs(Math.hypot(A[0], A[1]) - rIn) > 1e-5 || Math.abs(Math.hypot(B[0], B[1]) - rIn) > 1e-5) continue;
          if (A[2] - zFloor < 1e-6 && B[2] - zFloor < 1e-6) continue;
          tris.push(...quadTris(A, [A[0], A[1], zFloor], [B[0], B[1], zFloor], B));
        }
      }
    }
    // the arcs at r 3.40 (step into the field) and r 4.95 are covered by the walls
    const bandMat = new THREE.MeshPhysicalMaterial({
      name: 'prBand', color: DIAL_FINISH.albedo, metalness: 0.75, roughness: 0.22, envMap: env, envMapIntensity: DIAL_FINISH.envMapIntensity,
    });
    const bm = new THREE.Mesh(soup(THREE, tris), bandMat);
    bm.name = 'power-reserve-ribs';
    prObj.add(bm);
    // applied end marks at EMPTY (12) and FULL (263°): small rounded bars
    const em = PRS.endMarks;
    const markMat = new THREE.MeshPhysicalMaterial({
      name: 'prMarks', color: em.colour, metalness: 1, roughness: 0.18, envMap: env, envMapIntensity: 1,
    });
    const mg = [];
    for (const deg of em.degs) {
      const w = em.width, rr = w / 2;
      const s = new THREE.Shape();
      s.moveTo(-w / 2, em.r[0] + rr);
      s.absarc(0, em.r[0] + rr, rr, Math.PI, TAU, false);
      s.lineTo(w / 2, em.r[1] - rr);
      s.absarc(0, em.r[1] - rr, rr, 0, Math.PI, false);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: PR.markHeight - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.03, bevelOffset: -0.03, bevelSegments: 2, curveSegments: 10 });
      g.deleteAttribute('uv');
      g.rotateZ(-deg * DEG);
      g.translate(0, 0, zFloor + 0.01); // base on the floor (the ribs end inside the mark)
      mg.push(g);
    }
    const mm = new THREE.Mesh(mergeGeometries(mg), markMat);
    mm.name = 'power-reserve-marks';
    prObj.add(mm);
    prObj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  root.add(prObj);

  // ---------------------------------------------------------------- date ring
  const DR = spec.date.ring;
  const ringObj = new THREE.Group();
  ringObj.name = 'date-ring';
  const ringRotor = new THREE.Group();
  ringObj.add(ringRotor);
  {
    const pitch = 360 / DR.teeth;
    const gap0 = Math.atan2(spec.date.jumper.beak[1], spec.date.jumper.beak[0]) / DEG; // a tooth gap under the jumper's beak at rest
    const inner = [];
    for (let t = 0; t < DR.teeth; t++) {
      const g = gap0 + t * pitch; // gap centre
      const tc = g + pitch / 2; // tooth centre
      // gap: root arc; tooth: flanks to a flat tip
      for (let s = -2; s <= 2; s++) {
        const a = (g + (s / 2) * 0.16 * pitch) * DEG;
        inner.push(new THREE.Vector2(DR.rootRadius * Math.cos(a), DR.rootRadius * Math.sin(a)));
      }
      for (const [f, r] of [[-0.3, DR.rootRadius - 0.05], [-0.12, DR.tipRadius], [0.12, DR.tipRadius], [0.3, DR.rootRadius - 0.05]]) {
        const a = (tc + f * pitch) * DEG;
        inner.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
      }
    }
    const shape = new THREE.Shape(ringPts(THREE, DR.outerRadius, Math.round(256 * SEG)));
    shape.holes.push(new THREE.Path(inner));
    const geo = splitLids(new THREE.ExtrudeGeometry(shape, { depth: DR.z[1] - DR.z[0], bevelEnabled: false, curveSegments: 1 }));
    geo.translate(0, 0, DR.z[0]);
    ctx.planarUV(geo, 1 / (2 * DR.outerRadius), [0.5, 0.5]);
    const tex = dateRingTexture(THREE, DR, lite ? 1024 : 2048);
    tex.anisotropy = maxAniso;
    const topMat = new THREE.MeshPhysicalMaterial({ name: 'dateRingTop', color: 0xffffff, map: tex, roughness: 0.48, metalness: 0, envMap: env, envMapIntensity: 0.7 });
    const sideMat = new THREE.MeshPhysicalMaterial({ name: 'dateRingSide', color: DR.colour, roughness: 0.5, metalness: 0, envMap: env, envMapIntensity: 0.7 });
    for (const m of meshesFromGroups(THREE, geo, [topMat, sideMat, sideMat])) {
      m.castShadow = true;
      m.receiveShadow = true;
      ringRotor.add(m);
    }
  }
  root.add(ringObj);

  // ---------------------------------------------------------------- dial feet
  let feetObj = null;
  const DF = D.feet;
  const feetPos = DF.angles.map((deg) => [DF.r * Math.sin(deg * DEG), DF.r * Math.cos(deg * DEG)]);
  if (!lite) {
    feetObj = new THREE.Group();
    feetObj.name = 'dial-feet';
    const fr = DF.radius;
    const geos = feetPos.map(([x, y]) => {
      const prof = [[0.0001, DF.bottom], [fr - 0.05, DF.bottom], [fr, DF.bottom + 0.05], [fr, zb - 0.06], [fr + 0.08, zb - 0.02], [fr + 0.08, zb]].map(([r, z]) => new THREE.Vector2(r, z));
      const g = new THREE.LatheGeometry(prof, 24);
      g.rotateX(Math.PI / 2);
      g.translate(x, y, 0);
      return g;
    });
    const fm = new THREE.Mesh(mergeGeometries(geos), M.brass);
    fm.name = 'dial-feet-mesh';
    feetObj.add(fm);
    root.add(feetObj);
  }

  // ---------------------------------------------------------------- registry
  const t = D.texture;
  reg.add({
    id: 'dial', name: 'Snowflake dial', category: 'dial', side: 'front', object: dialObj,
    exposed: true, xray: true, priority: 1, explode: ex('dial'), explodeDelay: dly('dial'),
    anchor: [6.8, -6.2, zt],
    description: 'A brass blank stamped with a hand-carved die, then silver-plated, with no paint: the white comes from light scattered by its relief, which recalls wind-swept snow. The drifts run from 12 to 6 o\'clock and catch the light differently as the watch turns.',
    facts: {
      Finish: 'Die-stamped "Snowflake" relief, silver-plated',
      Relief: `≈ ${t.reliefMicrons[0]}–${t.reliefMicrons[1]} µm, drifts along 12–6`,
      Diameter: `${(2 * D.visibleRadius).toFixed(1)} mm visible`,
      Printing: 'Grand Seiko (black), SPRING DRIVE (navy), 48 + 1 minute ticks',
      Steps: 'Over 80 production steps',
    },
    ...(snow ? { snow } : {}),
  });
  reg.add({
    id: 'indices', name: 'Applied hour markers (11)', category: 'dial', side: 'front', object: indicesObj,
    exposed: true, priority: 2, explode: ex('indices'), explodeDelay: dly('indices'),
    anchor: [14.0 * Math.sin(60 * DEG), 12.5 * Math.cos(60 * DEG), Z.markersTop],
    description: 'Eleven separately made markers, diamond-cut and mirror-polished, set into the dial on tiny feet. Wedges mark 12, 6 and 9; slim faceted bars mark the other hours, and the date window takes the place of 3.',
    facts: { Count: '11 (none at 3)', Height: `${MK.height.toFixed(2)} mm`, Finish: 'Mirror-polished facets', '12 o\'clock': `Wedge ${MK.wedge12.width[0]} → ${MK.wedge12.width[1]} mm` },
  });
  reg.add({
    id: 'gs-logo', name: 'Applied GS emblem', category: 'dial', side: 'front', object: logoObj,
    exposed: true, priority: 2, explode: ex('gs-logo'), explodeDelay: dly('gs-logo'),
    anchor: [D.logo.center[0] + 1.0, D.logo.center[1] + 0.4, Z.logoTop],
    description: 'The blackletter "GS" monogram is a separate, faceted and polished metal piece set onto the dial above the printed name.',
    facts: { Size: `${DIAL_MEASURED.monogram.width.toFixed(2)} × ${DIAL_MEASURED.monogram.height.toFixed(2)} mm`, Relief: `${(Z.logoTop - zt).toFixed(2)} mm`, Finish: 'Polished, faceted' },
  });
  reg.add({
    id: 'power-reserve', name: 'Power-reserve indicator', category: 'dial', side: 'front', object: prObj,
    exposed: true, priority: 2, explode: ex('power-reserve'), explodeDelay: dly('power-reserve'),
    anchor: [-2.6, 2.2, zFloor],
    description: 'A fan-shaped recess between 7 and 8 o\'clock shows how much energy is left in the mainspring. Its outer band is fluted and its centre turned with fine circles; the hand points to 9 when the watch is fully wound and creeps up to 12 over three days.',
    facts: { Range: `${spec.powerReserve.hours} h over ${spec.powerReserve.sweepDeg}°`, Recess: `${PRS.recessDepth.toFixed(2)} mm deep`, Scale: '19 fluted ribs, 5° apart', 'Full / empty': 'Towards 9 / 12' },
    live: (s) => `${Math.round(s.reserve * spec.powerReserve.hours)} h left`,
  });
  reg.add({
    id: 'date-window', name: 'Date window frame', category: 'dial', side: 'front', object: frameObj,
    exposed: true, priority: 3, explode: ex('date-window'), explodeDelay: dly('date-window'),
    anchor: [D.dateWindow.frame.x[1], D.dateWindow.frame.y[1], Z.dateFrameTop],
    description: 'A polished applied frame around the date aperture at 3 o\'clock, with a flat top and a bevel that leads the eye down to the date ring.',
    facts: { Size: `${(D.dateWindow.frame.x[1] - D.dateWindow.frame.x[0]).toFixed(2)} × ${(D.dateWindow.frame.y[1] - D.dateWindow.frame.y[0]).toFixed(2)} mm`, Aperture: `${ap.width.toFixed(2)} × ${ap.height.toFixed(2)} mm`, Finish: 'Mirror-polished, 45° inner bevel' },
  });
  reg.add({
    id: 'date-ring', name: 'Date ring', category: 'dial', side: 'front', object: ringObj, rotor: ringRotor,
    drive: { key: 'date', sign: -1 }, exposed: true, priority: 2, explode: ex('date-ring'), explodeDelay: dly('date-ring'),
    anchor: [ap.center[0], ap.center[1] - 1.1, DR.z[1]],
    description: 'A thin white ring under the dial carrying the numbers 1 to 31. Near midnight a finger on the 24-hour wheel tensions the date jumper, which then snaps the ring on by one tooth so the new date jumps into the window.',
    facts: { Teeth: `${DR.teeth} internal`, Diameter: `${(2 * DR.outerRadius).toFixed(1)} mm`, Change: 'Instantaneous, at midnight', Turns: 'Counter-clockwise, one turn a month' },
    live: (s) => `Day ${s.day}`,
  });
  if (feetObj) {
    reg.add({
      id: 'dial-feet', name: 'Dial feet', category: 'dial', side: 'front', object: feetObj,
      exposed: false, priority: 3, explode: ex('dial-feet'), explodeDelay: dly('dial-feet'),
      anchor: [feetPos[0][0], feetPos[0][1], 0.2],
      description: 'Two brass pins on the back of the dial locate it in holes in the main plate, so it can neither turn nor shift.',
      facts: { Count: '2', Diameter: `${(2 * DF.radius).toFixed(2)} mm`, Material: 'Brass' },
    });
  }
}

// ------------------------------------------------------------------ date-ring numerals
// White ring, black plain grotesque numerals (Helvetica-like; Arial on Windows). Numeral d
// sits at local maths angle θw − (d − 1)·360/31, its "up" along the counter-clockwise tangent
// and its digits reading radially outward, so it is upright in the window at 3 o'clock.
function dateRingTexture(THREE, DR, N) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const Rr = DR.outerRadius, s = N / (2 * Rr);
  g.fillStyle = DR.colour;
  g.fillRect(0, 0, N, N);
  g.fillStyle = DR.digitColour;
  const font = (px) => `500 ${px}px Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif`;
  g.font = font(100);
  const m0 = g.measureText('0');
  const capPx = (m0.actualBoundingBoxAscent || 72) + (m0.actualBoundingBoxDescent || 0);
  const F = (DR.digitHeight * s * 100) / capPx;
  g.font = font(F);
  const inkW = (ch) => { const m = g.measureText(ch); return (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width); };
  const zeroW = inkW('0');
  const sx = Math.min(1.35, Math.max(0.8, (DR.digitWidth * s) / zeroW)); // digit width as on the dial
  for (let d = 1; d <= 31; d++) {
    const a = (DR.windowAngleDeg - ((d - 1) * 360) / DR.teeth) * DEG;
    const cx = (Rr + DR.numeralRadius * Math.cos(a)) * s, cy = (Rr - DR.numeralRadius * Math.sin(a)) * s;
    const txt = String(d);
    g.save();
    g.translate(cx, cy);
    g.rotate(-a);
    g.scale(sx, 1);
    const m = g.measureText(txt);
    const left = m.actualBoundingBoxLeft || 0, right = m.actualBoundingBoxRight || m.width;
    g.fillText(txt, -(right - left) / 2, (DR.digitHeight * s) / 2);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// "JAPAN 9R65-0BL0 T 2" — tiny upright capitals on the arc r 15.15–15.52 at 6 o'clock, tops
// toward the centre; each piece at its measured angles (spec.dial.bottomText.pieces).
function bottomTextDecal(THREE, BT, z, lite, env) {
  const [rTop, rBase] = BT.r; // letter tops toward the centre, bases outside
  const cap = BT.capHeight;
  const th0 = 196, th1 = 164; // strip extent (deg clockwise from 12), left → right at 6
  const rIn = rTop - 0.12, rOut = rBase + 0.1;
  const rMid = (rIn + rOut) / 2;
  const PPM = lite ? 160 : 320;
  const L = (th0 - th1) * DEG * rBase;
  const W = Math.ceil(L * PPM), H = Math.ceil((rOut - rIn) * PPM);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.fillStyle = BT.colour;
  const font = (px) => `500 ${px}px Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif`;
  g.font = font(100);
  const mH = g.measureText('H');
  const F = (cap * PPM * 100) / (mH.actualBoundingBoxAscent || 72);
  g.font = font(F);
  const yBase = (rBase - rIn) * PPM; // canvas row of the baseline (top row = r_in)
  const xOf = (deg) => (th0 - deg) * DEG * rBase * PPM;
  for (const p of BT.pieces) {
    const [a, b] = BOTTOM_TEXT_DEG[p.t] || (Array.isArray(p.deg) ? p.deg : [p.deg, p.deg]);
    const x0 = xOf(a), x1 = xOf(b);
    const m = g.measureText(p.t);
    const inkW = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width);
    if (a === b) { g.fillText(p.t, x0 - inkW / 2, yBase); continue; }
    // spread the letters over the measured span (wide tracking, as printed)
    const chars = [...p.t];
    const adv = chars.map((ch) => g.measureText(ch).width);
    const total = adv.reduce((s, v) => s + v, 0);
    const track = chars.length > 1 ? (x1 - x0 - total) / (chars.length - 1) : 0;
    let x = x0;
    for (let i = 0; i < chars.length; i++) {
      g.fillText(chars[i], x, yBase);
      x += adv[i] + Math.max(0, track);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // the strip bent onto the arc: u along the arc (left → right = θ decreasing), v from r_in (top)
  const segs = 48, pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const th = (th0 - ((th0 - th1) * i) / segs) * DEG;
    for (const [r, v] of [[rIn, 1], [rOut, 0]]) {
      pos.push(r * Math.sin(th), r * Math.cos(th), z);
      uv.push(i / segs, v);
    }
    if (i < segs) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); // facing +Z
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    name: 'inkArc', map: tex, transparent: true, depthWrite: false, roughness: 0.45, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, envMap: env, envMapIntensity: 0.8,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'dial-print-japan';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  void rMid;
  return mesh;
}
