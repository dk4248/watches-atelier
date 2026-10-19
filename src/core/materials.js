import * as THREE from 'three';

// Shared materials and procedurally generated finishes (Glashütte ribbing, perlage,
// sunburst, circular graining, dial grain). Generated once at start-up so the page
// stays a single self-contained file.

const TAU = Math.PI * 2;

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Small deterministic PRNG so finishes look the same on every load.
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1-D value noise, periodic with `period` samples.
function noise1D(period, seed) {
  const r = rng(seed);
  const v = Array.from({ length: period }, () => r());
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const a = v[((i % period) + period) % period], b = v[(((i + 1) % period) + period) % period];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
}

// Height field (Float32Array, wrap-around) → tangent-space normal map texture.
function heightToNormalTexture(h, size, strength, { wrap = true, repeat = [1, 1] } = {}) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const at = (x, y) => {
    if (wrap) { x = (x + size) % size; y = (y + size) % size; } else { x = Math.min(size - 1, Math.max(0, x)); y = Math.min(size - 1, Math.max(0, y)); }
    return h[y * size + x];
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx, ny = dy, nz = 1; // canvas y runs down; texture v runs up
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 8;
  return t;
}

// Height field → greyscale roughness texture (brighter = rougher).
function heightToRoughness(h, size, base, amount, { wrap = true } = {}) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.min(1, Math.max(0, base + (h[i] - 0.5) * amount)) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Anisotropy direction map: fn(u, v) → [angleRad, strength0..1]. RG = direction in
// tangent space (−1..1 mapped to 0..1), B = strength — the three.js convention.
function directionTexture(size, fn, { wrap = true } = {}) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [a, s] = fn((x + 0.5) / size, 1 - (y + 0.5) / size);
      const i = (y * size + x) * 4;
      img.data[i] = (Math.cos(a) * 0.5 + 0.5) * 255;
      img.data[i + 1] = (Math.sin(a) * 0.5 + 0.5) * 255;
      img.data[i + 2] = s * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// ---- Finishes -------------------------------------------------------------------

// Glashütte ribbing (Glashütter Streifenschliff): parallel bands, each brushed with
// long, gently curved strokes. Bands run along texture U. One tile = 4 bands.
export function ribbingTextures(size = 1024) {
  const h = new Float32Array(size * size);
  const bands = 4;
  const bandPx = size / bands;
  const n1 = noise1D(512, 7), n2 = noise1D(97, 11);
  for (let y = 0; y < size; y++) {
    const b = Math.floor(y / bandPx);
    const v = (y - b * bandPx) / bandPx; // 0..1 across a band
    const across = v - 0.5;
    for (let x = 0; x < size; x++) {
      // curved stroke lines: phase along u, bent by a parabola across the band
      const u = x / size;
      const bend = across * across * 0.9 + b * 0.37;
      const line = n1((u * 512 + bend * 140) % 512) * 0.55 + n2(((u * 97 * 3 + bend * 60) % 97 + 97) % 97) * 0.25;
      // each band is very slightly crowned so neighbouring bands catch light differently
      const crown = (1 - 4 * across * across) * 0.6;
      h[y * size + x] = crown + line * 0.35 + (b % 2) * 0.05;
    }
  }
  // Brushing direction follows the arcs cut by the rotating wheel: it swings from
  // about −28° to +28° across every band, which is what makes the stripes "wave".
  const anisotropyMap = directionTexture(512, (u, v) => {
    const vb = (v * bands) % 1;
    return [Math.atan((vb - 0.5) * 1.05), 1];
  });
  return {
    normalMap: heightToNormalTexture(h, size, 1.6),
    roughnessMap: heightToRoughness(h, size, 0.5, 0.35),
    anisotropyMap,
  };
}

// Perlage (circular graining): overlapping spots, each a tiny swirl of rings.
export function perlageTextures(size = 512) {
  const h = new Float32Array(size * size).fill(0.5);
  const spot = size / 6.5; // spot radius in px
  const step = spot * 0.78;
  const rnd = rng(3);
  for (let gy = -1; gy < size / step + 1; gy++) {
    for (let gx = -1; gx < size / step + 1; gx++) {
      const cx = gx * step + (gy % 2 ? step * 0.5 : 0);
      const cy = gy * step;
      const ph = rnd() * TAU;
      for (let y = -spot; y <= spot; y++) {
        for (let x = -spot; x <= spot; x++) {
          const r = Math.hypot(x, y);
          if (r > spot) continue;
          const px = ((Math.round(cx + x) % size) + size) % size;
          const py = ((Math.round(cy + y) % size) + size) % size;
          const ang = Math.atan2(y, x);
          h[py * size + px] = 0.5 + 0.28 * Math.sin(r * 0.9 + ang * 2 + ph) * (1 - r / spot * 0.4) + 0.15 * (1 - r / spot);
        }
      }
    }
  }
  return {
    normalMap: heightToNormalTexture(h, size, 1.4),
    roughnessMap: heightToRoughness(h, size, 0.42, 0.4),
  };
}

// Sunburst (radial brushing) for ratchet / crown wheels. Mapped with the part's
// normalised planar UVs (centre = 0.5, 0.5). Not tiled.
export function sunburstTextures(size = 1024) {
  const h = new Float32Array(size * size);
  const n = noise1D(720, 5), n2 = noise1D(131, 9);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x / size - 0.5, dy = y / size - 0.5;
      const a = (Math.atan2(dy, dx) / TAU + 1) % 1;
      const r = Math.hypot(dx, dy);
      h[y * size + x] = n(a * 720) * 0.7 + n2(a * 131 * 4 % 131) * 0.3 * (0.5 + r);
    }
  }
  return {
    normalMap: heightToNormalTexture(h, size, 0.8, { wrap: false }),
    roughnessMap: heightToRoughness(h, size, 0.3, 0.25, { wrap: false }),
    anisotropyMap: directionTexture(512, (u, v) => [Math.atan2(v - 0.5, u - 0.5), 1], { wrap: false }),
  };
}

// Concentric circular graining for wheels.
export function circularGrainTextures(size = 1024) {
  const h = new Float32Array(size * size);
  const n = noise1D(600, 13);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x / size - 0.5, y / size - 0.5);
      h[y * size + x] = n(r * 1200 % 600);
    }
  }
  return {
    normalMap: heightToNormalTexture(h, size, 0.9, { wrap: false }),
    roughnessMap: heightToRoughness(h, size, 0.32, 0.25, { wrap: false }),
    anisotropyMap: directionTexture(512, (u, v) => [Math.atan2(v - 0.5, u - 0.5) + Math.PI / 2, 1], { wrap: false }),
  };
}

// Fine, isotropic grain for the galvanised silver-plated dial.
export function dialGrainTextures(size = 512) {
  const h = new Float32Array(size * size);
  const r = rng(21);
  for (let i = 0; i < h.length; i++) h[i] = r();
  // blur once so the grain is soft, not pixel noise
  const b = new Float32Array(h.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) s += h[((y + k + size) % size) * size + ((x + j + size) % size)];
      b[y * size + x] = s / 9;
    }
  }
  return { normalMap: heightToNormalTexture(b, size, 0.9), roughnessMap: heightToRoughness(b, size, 0.48, 0.25) };
}

// Pebbled leather grain.
export function leatherTextures(size = 512) {
  const h = new Float32Array(size * size).fill(0);
  const r = rng(33);
  for (let k = 0; k < 2600; k++) {
    const cx = r() * size, cy = r() * size, rad = 3 + r() * 7;
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      const d = Math.hypot(x, y) / rad;
      if (d > 1) continue;
      const px = ((Math.round(cx + x) % size) + size) % size, py = ((Math.round(cy + y) % size) + size) % size;
      h[py * size + px] = Math.max(h[py * size + px], Math.sqrt(1 - d * d));
    }
  }
  return { normalMap: heightToNormalTexture(h, size, 1.2), roughnessMap: heightToRoughness(h, size, 0.45, 0.3) };
}

// ---- Text / print textures ----------------------------------------------------

// Render lines of text into a transparent texture (for engravings, case-back text).
// Returns { texture, aspect } — aspect = width / height of the drawn area.
export function textTexture(lines, {
  font = '500 64px Jost, "Futura", "Century Gothic", sans-serif', color = '#000', lineHeight = 1.25,
  letterSpacing = 0, pad = 8, align = 'center', scale = 1,
} = {}) {
  const arr = Array.isArray(lines) ? lines : [lines];
  const c = makeCanvas(16);
  let ctx = c.getContext('2d');
  ctx.font = font;
  const size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
  // Tracking is applied manually, glyph by glyph, so widths are identical in every
  // browser (canvas letterSpacing is not universal) and centring stays exact.
  const chars = (s) => Array.from(s);
  const widthOf = (s) => (letterSpacing
    ? chars(s).reduce((a, ch) => a + ctx.measureText(ch).width, 0) + letterSpacing * Math.max(0, chars(s).length - 1)
    : ctx.measureText(s).width);
  const widths = arr.map(widthOf);
  const w = Math.ceil(Math.max(...widths) + pad * 2);
  const hgt = Math.ceil(size * lineHeight * arr.length + pad * 2);
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(hgt * scale);
  ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  arr.forEach((s, i) => {
    const y = pad + size * lineHeight * (i + 0.5);
    const lw = widths[i];
    let x = align === 'center' ? (w - lw) / 2 : align === 'right' ? w - pad - lw : pad;
    if (!letterSpacing) { ctx.fillText(s, x, y); return; }
    for (const ch of chars(s)) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + letterSpacing;
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { texture: t, aspect: w / hgt, canvas: c };
}

// ---- Material library -----------------------------------------------------------

export function createMaterials() {
  const ribbing = ribbingTextures();
  const perlage = perlageTextures();
  const sunburst = sunburstTextures();
  const grain = circularGrainTextures();
  const dialGrain = dialGrainTextures();
  const leather = leatherTextures();

  const M = {};

  M.steelPolished = new THREE.MeshPhysicalMaterial({
    color: 0xd4d6d9, metalness: 1, roughness: 0.09, envMapIntensity: 1.15,
  });
  M.steelSatin = new THREE.MeshPhysicalMaterial({
    color: 0xc9cbce, metalness: 1, roughness: 0.3, anisotropy: 0.7, envMapIntensity: 1,
  });
  // Pinions, arbors, levers in the movement: polished, slightly darker steel.
  M.steelPinion = new THREE.MeshPhysicalMaterial({ color: 0xbfc3c8, metalness: 1, roughness: 0.16 });
  M.steelDark = new THREE.MeshPhysicalMaterial({ color: 0x8e939a, metalness: 1, roughness: 0.28 });

  // Rhodium-plated plate with Glashütte ribbing. Use planar UVs in mm / 10.
  M.plateRibbed = new THREE.MeshPhysicalMaterial({
    color: 0xdfe1e4, metalness: 1, roughness: 0.42,
    normalMap: ribbing.normalMap, normalScale: new THREE.Vector2(0.12, 0.12),
    roughnessMap: ribbing.roughnessMap, anisotropy: 0.6, anisotropyMap: ribbing.anisotropyMap,
  });
  M.platePerlage = new THREE.MeshPhysicalMaterial({
    color: 0xd9dbde, metalness: 1, roughness: 0.38,
    normalMap: perlage.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: perlage.roughnessMap,
  });
  // Plain rhodium for edges / bevels / small bridges.
  M.rhodium = new THREE.MeshPhysicalMaterial({ color: 0xe1e3e6, metalness: 1, roughness: 0.2 });
  M.rhodiumBevel = new THREE.MeshPhysicalMaterial({ color: 0xeceef0, metalness: 1, roughness: 0.06 });

  M.sunburst = new THREE.MeshPhysicalMaterial({
    color: 0xd8dade, metalness: 1, roughness: 0.3,
    normalMap: sunburst.normalMap, normalScale: new THREE.Vector2(0.25, 0.25), roughnessMap: sunburst.roughnessMap,
    anisotropy: 0.85, anisotropyMap: sunburst.anisotropyMap,
  });
  // Wheels: gilt with circular graining (switch to M.wheelRhodium if research says so).
  M.wheelGilt = new THREE.MeshPhysicalMaterial({
    color: 0xe6c47f, metalness: 1, roughness: 0.3,
    normalMap: grain.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: grain.roughnessMap,
    anisotropy: 0.7, anisotropyMap: grain.anisotropyMap,
  });
  M.wheelRhodium = new THREE.MeshPhysicalMaterial({
    color: 0xd9dbde, metalness: 1, roughness: 0.3,
    normalMap: grain.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: grain.roughnessMap,
    anisotropy: 0.7, anisotropyMap: grain.anisotropyMap,
  });
  M.brass = new THREE.MeshPhysicalMaterial({ color: 0xcfae6b, metalness: 1, roughness: 0.35 });
  M.goldText = new THREE.MeshPhysicalMaterial({ color: 0xe0b866, metalness: 1, roughness: 0.25, transparent: true });

  // Thermally blued steel: the colour comes from an oxide film, i.e. thin-film
  // interference — which is exactly what three.js iridescence models.
  M.blued = new THREE.MeshPhysicalMaterial({
    color: 0x2347b5, metalness: 1, roughness: 0.24,
    iridescence: 0.3, iridescenceIOR: 1.5, iridescenceThicknessRange: [180, 240],
  });

  M.ruby = new THREE.MeshPhysicalMaterial({
    color: 0xc01436, metalness: 0, roughness: 0.04, ior: 1.76, clearcoat: 1, clearcoatRoughness: 0.02,
    transmission: 0.55, thickness: 0.25, attenuationColor: new THREE.Color(0x9b0020), attenuationDistance: 0.4,
    specularIntensity: 1, emissive: 0x2a0008, emissiveIntensity: 1,
  });

  M.sapphire = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.0, ior: 1.77, transmission: 1, thickness: 0.6,
    specularIntensity: 0.9, attenuationColor: new THREE.Color(0xeef4ff), attenuationDistance: 30,
    transparent: true, envMapIntensity: 1.2,
  });

  // Galvanised, silver-plated white dial. The printing goes on a separate map.
  M.dialBase = new THREE.MeshPhysicalMaterial({
    color: 0xf3f3ef, metalness: 0.08, roughness: 0.5,
    normalMap: dialGrain.normalMap, normalScale: new THREE.Vector2(0.12, 0.12),
    roughnessMap: dialGrain.roughnessMap, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6,
  });

  M.leather = new THREE.MeshPhysicalMaterial({
    color: 0x17140f, metalness: 0, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4,
    normalMap: leather.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), roughnessMap: leather.roughnessMap,
  });
  M.stitch = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.8 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.5 });

  // Helpers for parts that need their own texture repeat (planar mm UVs).
  M.textures = { ribbing, perlage, sunburst, grain, dialGrain, leather };
  return M;
}

// Planar UVs in millimetres (scaled) for plates: call on a geometry lying in XY.
// `angle` (rad) rotates the pattern: texture U runs along world direction
// (cos angle, sin angle). Positions are taken in the geometry's own space, so call
// it before translating/rotating the geometry if the pattern must line up across
// parts (or pass `origin` = the part's world XY offset).
export function planarUV(geo, scale = 0.1, offset = [0, 0], angle = 0, origin = [0, 0]) {
  const pos = geo.attributes.position;
  let uv = geo.attributes.uv;
  if (!uv) { uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2); geo.setAttribute('uv', uv); }
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + origin[0], y = pos.getY(i) + origin[1];
    uv.setXY(i, (x * c + y * s) * scale + offset[0], (-x * s + y * c) * scale + offset[1]);
  }
  uv.needsUpdate = true;
  return geo;
}
