// Small math / easing helpers shared by the watch-box modules.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInCubic = (t) => t * t * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutQuint = (t) => 1 - (1 - t) ** 5;

// Lid opening: gentle start (a hand lifting it), ease-out, then the faintest settle
// (≈1 % overshoot that eases back). g(0) = 0, g(1) = 1, g'(0) = g'(1) = 0.
export function lidOpenCurve(p) {
  p = clamp01(p);
  const base = 1 - (1 - p) ** 4 * (1 + 4 * p);
  const k = clamp01((p - 0.55) / 0.45);
  return base + 0.02 * Math.sin(Math.PI * k) ** 2;
}

// Lid closing: falls under its own weight, lands, and gives a tiny bounce.
export function lidCloseCurve(p) {
  p = clamp01(p);
  if (p < 0.82) {
    const q = p / 0.82;
    return 1 - q * q * (0.35 + 0.65 * q); // accelerating fall, 1 → 0
  }
  const q = (p - 0.82) / 0.18;
  return 0.012 * Math.sin(Math.PI * q) * (1 - q); // little bounce off the rim
}

// Deterministic PRNG (mulberry32) so procedural textures are identical every load.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Critically damped spring (no allocations): call s.step(target, omega, dt).
export class Spring {
  constructor(x = 0) { this.x = x; this.v = 0; }
  step(target, omega, dt) {
    const e = Math.exp(-omega * dt);
    const dx = this.x - target;
    const tmp = (this.v + omega * dx) * dt;
    this.v = (this.v - omega * tmp) * e;
    this.x = target + (dx + tmp) * e;
    if (Math.abs(this.x - target) < 1e-5 && Math.abs(this.v) < 1e-4) { this.x = target; this.v = 0; }
    return this.x;
  }
  get settled() { return this.v === 0; }
}
