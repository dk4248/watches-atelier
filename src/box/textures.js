import * as THREE from 'three';
import { rng, clamp01, smoothstep } from './util.js';

// Procedural maps for the watch box: full-grain pebbled leather, ivory suede, woven
// strap fabric and the soft contact shadow. Everything is generated once per page
// into canvases (CPU side, cached); the THREE textures are disposed when the box
// closes and simply re-uploaded the next time it opens.

const canvases = new Map();

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Periodic 2-D value noise on a P×P lattice (seamless when sampled over [0, P)).
function valueNoise(P, seed) {
  const r = rng(seed);
  const g = new Float32Array(P * P);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P;
    const x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = g[y0 * P + x0], b = g[y0 * P + x1], c = g[y1 * P + x0], d = g[y1 * P + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// Periodic value noise with separate periods along x and y (stretched streaks).
function valueNoise2(Px, Py, seed) {
  const r = rng(seed);
  const g = new Float32Array(Px * Py);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % Px) + Px) % Px, y0 = ((yi % Py) + Py) % Py;
    const x1 = (x0 + 1) % Px, y1 = (y0 + 1) % Py;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = g[y0 * Px + x0], b = g[y0 * Px + x1], c = g[y1 * Px + x0], d = g[y1 * Px + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// Seamless Worley (cellular) layer: returns F1 and F2 distances per pixel, in cell units.
function worley(N, G, seed, jitter = 0.8) {
  const r = rng(seed);
  const jx = new Float32Array(G * G), jy = new Float32Array(G * G);
  for (let i = 0; i < G * G; i++) {
    jx[i] = 0.5 + (r() - 0.5) * jitter;
    jy[i] = 0.5 + (r() - 0.5) * jitter;
  }
  const f1 = new Float32Array(N * N), f2 = new Float32Array(N * N);
  const s = G / N;
  for (let py = 0; py < N; py++) {
    const fy = (py + 0.5) * s;
    const cy = Math.floor(fy);
    for (let px = 0; px < N; px++) {
      const fx = (px + 0.5) * s;
      const cx = Math.floor(fx);
      let d1 = 9, d2 = 9;
      for (let oy = -1; oy <= 1; oy++) {
        const gy = cy + oy;
        const wy = ((gy % G) + G) % G;
        for (let ox = -1; ox <= 1; ox++) {
          const gx = cx + ox;
          const wx = ((gx % G) + G) % G;
          const k = wy * G + wx;
          const dx = gx + jx[k] - fx, dy = gy + jy[k] - fy;
          const d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
      }
      const i = py * N + px;
      f1[i] = Math.sqrt(d1);
      f2[i] = Math.sqrt(d2);
    }
  }
  return { f1, f2 };
}

// Height field → tangent-space normal map written into a canvas (seamless).
function normalCanvas(h, N, strength) {
  const c = makeCanvas(N);
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const d = img.data;
  for (let y = 0; y < N; y++) {
    const ym = ((y - 1 + N) % N) * N, yp = ((y + 1) % N) * N, y0 = y * N;
    for (let x = 0; x < N; x++) {
      const xm = (x - 1 + N) % N, xp = (x + 1) % N;
      const dx = (h[y0 + xp] - h[y0 + xm]) * strength;
      const dy = (h[yp + x] - h[ym + x]) * strength;
      // canvas y runs down while texture v runs up
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y0 + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function greyCanvas(N, fn) {
  const c = makeCanvas(N);
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const d = img.data;
  for (let i = 0; i < N * N; i++) {
    const v = clamp01(fn(i)) * 255;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function srgbTriplet(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ------------------------------------------------------------------ leather
// Full-grain pebbled calf: soft, irregular, flat-topped pebbles (~1.2 mm) with gentle
// valleys, a finer pebble layer, the hide's slow natural relief, pores, and a mottled
// dye. One tile = LEATHER_TILE_MM. Returns { color, normal, rough } canvases.
export const LEATHER_TILE_MM = 30;
export function leatherCanvases(N = 1024) {
  const key = `leather${N}`;
  if (canvases.has(key)) return canvases.get(key);
  const A = worley(N, 24, 101, 0.9);
  const B = worley(N, 55, 202, 0.95);
  const wr = valueNoise(6, 306), wr2 = valueNoise(11, 308), mott = valueNoise(4, 303), mott2 = valueNoise(9, 304);
  const fine = valueNoise(256, 305);
  const r = rng(307);
  const h = new Float32Array(N * N);
  const valley = new Float32Array(N * N);
  const ridge = (n) => 1 - Math.abs(2 * n - 1);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const u = x / N, v = y / N;
      const eA = ((A.f2[i] - A.f1[i]) / (A.f2[i] + A.f1[i] + 1e-6)) * 2;
      const dA = Math.pow(smoothstep(0, 0.9, eA), 0.55);
      const eB = ((B.f2[i] - B.f1[i]) / (B.f2[i] + B.f1[i] + 1e-6)) * 2;
      const dB = Math.pow(smoothstep(0, 0.85, eB), 0.6);
      const rel = 0.6 * ridge(wr(u * 6, v * 6)) + 0.4 * ridge(wr2(u * 11, v * 11));
      h[i] = 0.6 * dA + 0.25 * dB + 0.15 * rel * rel + (fine(u * 256, v * 256) - 0.5) * 0.05;
      valley[i] = 1 - (0.7 * dA + 0.3 * dB);
    }
  }
  // pores: tiny pits
  for (let k = 0; k < (N * N) / 140; k++) {
    const px = Math.floor(r() * N), py = Math.floor(r() * N);
    const rad = 0.7 + r() * 0.9;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
      const dd = Math.hypot(ox, oy) / rad;
      if (dd > 1) continue;
      const j = ((py + oy + N) % N) * N + ((px + ox + N) % N);
      h[j] -= 0.08 * (1 - dd * dd);
    }
  }
  // dye: rich tobacco / cognac; the pebble tops a touch lighter, the valleys a touch
  // deeper, a slow uneven mottle like aniline-dyed full grain
  const base = srgbTriplet('#6d3a1f');
  const color = makeCanvas(N);
  {
    const g = color.getContext('2d');
    const img = g.createImageData(N, N);
    const d = img.data;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const u = x / N, v = y / N;
        const m = 0.93 + 0.09 * mott(u * 4, v * 4) + 0.05 * mott2(u * 9, v * 9);
        const shade = (0.95 + 0.12 * (h[i] - 0.55) - 0.1 * valley[i]) * m;
        const warm = 1 + 0.03 * (mott2(u * 9 + 3.5, v * 9) - 0.5);
        d[i * 4] = Math.min(255, base[0] * shade * warm);
        d[i * 4 + 1] = Math.min(255, base[1] * shade * (0.99 - 0.03 * valley[i]));
        d[i * 4 + 2] = Math.min(255, base[2] * shade * (0.98 - 0.05 * valley[i]));
        d[i * 4 + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
  const normal = normalCanvas(h, N, 2.6);
  const rough = greyCanvas(N, (i) => 0.5 + 0.2 * valley[i] + (fine((i % N) / N * 256 + 7.3, Math.floor(i / N) / N * 256) - 0.5) * 0.08);
  const out = { color, normal, rough };
  canvases.set(key, out);
  return out;
}

// ------------------------------------------------------------------ suede
// Soft brushed nap: fuzzy grain, faint streaks along the brushing direction and slow
// light/dark "finger-mark" patches. The colour map is a grey multiplier for
// material.color.
export const SUEDE_TILE_MM = 22;
export function suedeCanvases(N = 512) {
  const key = `suede${N}`;
  if (canvases.has(key)) return canvases.get(key);
  const n1 = valueNoise(64, 401), n2 = valueNoise(128, 402), n3 = valueNoise(24, 403), patch = valueNoise(3, 404);
  const streak = valueNoise2(6, 90, 405);
  const h = new Float32Array(N * N);
  const col = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const i = y * N + x;
      const st = streak(u * 6, v * 90);
      h[i] = 0.42 * n1(u * 64, v * 64) + 0.3 * n2(u * 128, v * 128) + 0.28 * st;
      col[i] = 0.94 + 0.045 * patch(u * 3, v * 3) + 0.035 * (st - 0.5) + 0.025 * (n3(u * 24, v * 24) - 0.5);
    }
  }
  const normal = normalCanvas(h, N, 1.7);
  const color = greyCanvas(N, (i) => col[i]);
  const rough = greyCanvas(N, (i) => 0.8 + 0.16 * h[i]);
  const out = { color, normal, rough };
  canvases.set(key, out);
  return out;
}

// ------------------------------------------------------------------ woven fabric
// Twill-ish weave for fabric (NATO / canvas) straps. One tile = 4 mm.
export const WOVEN_TILE_MM = 4;
export function wovenCanvases(N = 256) {
  const key = `woven${N}`;
  if (canvases.has(key)) return canvases.get(key);
  const threads = 16;
  const fuzz = valueNoise(64, 501);
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const fx = (x / N) * threads, fy = (y / N) * threads;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const over = ((ix + iy) % 4) < 2; // 2/2 twill
      const ax = fx - ix - 0.5, ay = fy - iy - 0.5;
      const warp = Math.cos(ax * Math.PI) * (0.8 + 0.2 * Math.cos(fy * Math.PI * 0.5));
      const weft = Math.cos(ay * Math.PI) * (0.8 + 0.2 * Math.cos(fx * Math.PI * 0.5));
      h[y * N + x] = (over ? 0.55 + 0.45 * warp : 0.5 * weft) + (fuzz(x / N * 64, y / N * 64) - 0.5) * 0.15;
    }
  }
  const out = { normal: normalCanvas(h, N, 2.2), rough: greyCanvas(N, (i) => 0.75 + 0.2 * (1 - h[i])) };
  canvases.set(key, out);
  return out;
}

// ------------------------------------------------------------------ brushed metal
// Fine parallel brushing for bracelet links (along U).
export function brushedCanvases(N = 256) {
  const key = `brushed${N}`;
  if (canvases.has(key)) return canvases.get(key);
  const n = valueNoise(256, 601), m = valueNoise(16, 602);
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      h[y * N + x] = 0.7 * n(x / N * 4, y / N * 256) + 0.3 * m(x / N * 2, y / N * 16);
    }
  }
  const out = { normal: normalCanvas(h, N, 0.9), rough: greyCanvas(N, (i) => 0.8 + 0.4 * (h[i] - 0.5)) };
  canvases.set(key, out);
  return out;
}

// ------------------------------------------------------------------ contact shadow
// Soft rounded-rectangle occlusion blob (alpha in the red channel → use as alphaMap).
// `w`, `h` = footprint of the box, `blur` = falloff in the same units; the texture
// covers (w + 2·pad) × (h + 2·pad).
export function contactShadowCanvas(w, h, pad, blur, N = 256) {
  const key = `shadow${w}|${h}|${pad}|${blur}|${N}`;
  if (canvases.has(key)) return canvases.get(key);
  const W = w + 2 * pad, H = h + 2 * pad;
  const NX = N, NY = Math.max(16, Math.round(N * H / W));
  const c = makeCanvas(NX, NY);
  const g = c.getContext('2d');
  const img = g.createImageData(NX, NY);
  const d = img.data;
  const hx = w / 2, hz = h / 2, R = Math.min(hx, hz) * 0.2;
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const px = ((x + 0.5) / NX - 0.5) * W, pz = ((y + 0.5) / NY - 0.5) * H;
      const qx = Math.abs(px) - (hx - R), qz = Math.abs(pz) - (hz - R);
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - R;
      // dense core under the box, long soft tail
      const core = 1 - smoothstep(-blur * 0.35, blur * 0.25, sd);
      const tail = Math.exp(-Math.max(0, sd + blur * 0.2) / (blur * 0.55));
      const a = clamp01(0.62 * core + 0.38 * tail * (1 - core * 0.3));
      const i = (y * NX + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = a * 255;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  canvases.set(key, c);
  return c;
}

// Wrap a canvas in a texture with repeat wrapping.
export function canvasTexture(canvas, { srgb = false, repeat = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}

// ------------------------------------------------------------------ foil stamp
// Gold-foil stamp for the lid lining (white on black → use as alphaMap): a fine double
// border with small corner ornaments and a centred line of spaced capitals between
// two rules. w × h in mm (the decal patch), drawn at `ppm` pixels per mm.
export function foilCanvas(w, h, text = 'WATCH OF THE DAY', ppm = 7) {
  const key = `foil${w}|${h}|${text}|${ppm}`;
  if (canvases.has(key)) return canvases.get(key);
  const W = Math.round(w * ppm), H = Math.round(h * ppm);
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  const mm = (v) => v * ppm;
  // double border, inset
  const inset = 3.2, gap = 1.3;
  g.lineWidth = mm(0.42);
  g.strokeRect(mm(inset), mm(inset), W - mm(2 * inset), H - mm(2 * inset));
  g.lineWidth = mm(0.22);
  g.strokeRect(mm(inset + gap), mm(inset + gap), W - mm(2 * (inset + gap)), H - mm(2 * (inset + gap)));
  // corner diamonds
  const dia = (x, y, r) => { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill(); };
  for (const [x, y] of [[inset, inset], [w - inset, inset], [inset, h - inset], [w - inset, h - inset]]) dia(mm(x), mm(y), mm(1.1));
  // centred legend
  const capH = 3.1;
  const size = mm(capH / 0.7);
  g.font = `400 ${size}px Jost, 'Futura', 'Century Gothic', 'Segoe UI', sans-serif`;
  g.textBaseline = 'middle';
  const track = mm(1.55);
  const chars = Array.from(text);
  const widths = chars.map((ch) => g.measureText(ch).width);
  const tw = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let x = (W - tw) / 2;
  const y = H / 2 + mm(0.15);
  chars.forEach((ch, i) => { g.fillText(ch, x, y); x += widths[i] + track; });
  // rules either side of the legend, ending in small diamonds
  g.lineWidth = mm(0.22);
  const rl = mm(16), rg = mm(5);
  for (const sgn of [-1, 1]) {
    const x0 = W / 2 + sgn * (tw / 2 + rg), x1 = x0 + sgn * rl;
    g.beginPath(); g.moveTo(x0, H / 2); g.lineTo(x1, H / 2); g.stroke();
    dia(x1 + sgn * mm(1.2), H / 2, mm(0.75));
  }
  canvases.set(key, c);
  return c;
}
