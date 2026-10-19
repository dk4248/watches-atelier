// Finishes shared by the DUW 4001 modules (three-quarter plate and balance cock must
// wear exactly the same Glashütte ribbing so the bands run on from one to the other).
// Built once per material library (memoised on M) and cloned from the shared
// materials, which are never mutated.
import * as THREE from 'three';

const cache = new WeakMap();

// Saw-tooth band shading measured on the official back render: across every band the
// plate is brightest along the band's lower edge and falls off by ≈20 % towards its
// upper edge, where a sharp step leads into the next band. The core ribbing maps hold
// four bands per texture tile along v, so this albedo map uses the same tiling.
function bandAlbedo(lo = 0.78) {
  const H = 1024, W = 4;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let r = 0; r < H; r++) {
    const v = 1 - (r + 0.5) / H; // canvas rows run down, texture v up (flipY)
    const f = (v * 4) % 1; // 0 at a band's lower edge … 1 at its upper edge
    let b = 1 - (1 - lo) * f;
    if (f > 0.92) b -= 0.05 * ((f - 0.92) / 0.08); // the shadowed foot of the next step
    if (f < 0.012) b *= 0.93 + 0.07 * (f / 0.012); // a hairline at the step itself
    const val = Math.round(255 * b);
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

function entryOf(M) {
  let entry = cache.get(M);
  if (!entry) { entry = {}; cache.set(M, entry); }
  return entry;
}

// The ribbed rhodium of the 3/4 plate and the balance cock. Use the planar UVs of
// spec.movement.ribbing on the geometry.
export function ribbedMaterial(M) {
  const entry = entryOf(M);
  if (!entry.ribbed) {
    const m = M.plateRibbed.clone();
    m.map = bandAlbedo(0.78);
    // neutral, very slightly warm rhodium: the studio light is a touch blue, the
    // plates in the photos are a neutral grey
    m.color.set(0xd2cfcb);
    m.roughness = 0.46;
    m.normalScale = new THREE.Vector2(0.4, 0.4);
    m.name = 'duwRibbed';
    entry.ribbed = m;
  }
  return entry.ribbed;
}

// Tempered blue screw heads: a deep royal blue (median #1b437e on the official back
// render; the library's blue is brighter and more violet).
export function bluedScrewMaterial(M) {
  const entry = entryOf(M);
  if (!entry.bluedScrew) {
    const m = M.blued.clone();
    m.color.set(0x19427f);
    m.roughness = 0.3;
    m.iridescence = 0.15;
    m.envMapIntensity = 0.85;
    m.name = 'duwBluedScrew';
    entry.bluedScrew = m;
  }
  return entry.bluedScrew;
}

// Synthetic ruby as it shows in the plates: a deep pink-magenta (render medians
// #a85483 … #824161), with only a faint clear-coat glint so it does not wash out to
// pastel pink under the bright studio light.
export function rubyMaterial(M) {
  const entry = entryOf(M);
  if (!entry.ruby) {
    const m = M.ruby.clone();
    m.color.set(0x962a58);
    m.attenuationColor = new THREE.Color(0x5c0e3a);
    m.attenuationDistance = 0.28;
    m.transmission = 0.18;
    m.emissive = new THREE.Color(0x16020a);
    m.clearcoat = 0.3;
    m.specularIntensity = 0.5;
    m.name = 'duwRuby';
    entry.ruby = m;
  }
  return entry.ruby;
}

// The cock's top-face outline as a smooth closed curve through the traced points of
// spec.frame.balanceCock.outline (a centripetal Catmull-Rom spline: the traced kinks
// become the small radii a machined part has). Dial-side frame, memoised per spec.
const outlineCache = new WeakMap();
export function cockOutline(bc, perSeg = 4) {
  let pts = outlineCache.get(bc);
  if (!pts) {
    const curve = new THREE.CatmullRomCurve3(bc.outline.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
    pts = curve.getPoints(bc.outline.length * perSeg).slice(0, -1).map((p) => [p.x, p.y]);
    outlineCache.set(bc, pts);
  }
  return pts;
}

// Balance-cock geometry shared by the escapement module (which builds the cock) and
// the frame module (which cuts the plate along it). Returns the densified left flank
// with outward normals and the chamfer width at every point (full width up to the
// screw recess, fading out where the flank runs into the ring housing), and the
// chamfer band as a closed polygon. All in the dial-side frame.
export function cockFlank(bc, n = 72) {
  const curve = new THREE.CatmullRomCurve3(bc.flank.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  const pts = curve.getPoints(n).map((p) => [p.x, p.y]);
  const W = bc.chamferWidth ?? 0.45;
  const nor = [], wid = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    // the flank runs from the ring (bottom) up to the recess; the cock lies on its
    // left in the dial frame, so the outward normal is the right-hand normal
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    nor.push([ty / l, -tx / l]);
    const s = i / (pts.length - 1);
    const fade = s < 0.16 ? Math.max(0.03, (s / 0.16) ** 2 * (3 - 2 * (s / 0.16))) : 1;
    wid.push(W * fade);
  }
  const outer = pts.map((p, i) => [p[0] + nor[i][0] * wid[i], p[1] + nor[i][1] * wid[i]]);
  const band = [...pts, ...outer.reverse()];
  return { pts, nor, wid, band };
}
