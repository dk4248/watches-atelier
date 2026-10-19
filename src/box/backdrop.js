import * as THREE from 'three';

// The frozen, blurred and darkened wallpaper behind the open box.
//
// The main scene is rendered to the canvas as usual (tone-mapped, sRGB) and copied into
// a texture, so the backdrop is pixel-identical to the live frame at blur = dim = 0 —
// the transition in and out is seamless. A dual-Kawase pyramid gives a soft and a
// strong blur once per snapshot. The composite is an affine "veil" of the snapshot
// (c·k + V, per pixel), which can also be blended over a live frame of the main scene
// (mode 'live') with exactly the same result.

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOWN = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uHalf;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(tSrc, vUv) * 4.0;
  s += texture2D(tSrc, vUv - uHalf);
  s += texture2D(tSrc, vUv + uHalf);
  s += texture2D(tSrc, vUv + vec2(uHalf.x, -uHalf.y));
  s += texture2D(tSrc, vUv - vec2(uHalf.x, -uHalf.y));
  gl_FragColor = vec4(s.rgb / 8.0, 1.0);
}`;

const UP = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uHalf;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(tSrc, vUv + vec2(-uHalf.x * 2.0, 0.0));
  s += texture2D(tSrc, vUv + vec2(-uHalf.x, uHalf.y)) * 2.0;
  s += texture2D(tSrc, vUv + vec2(0.0, uHalf.y * 2.0));
  s += texture2D(tSrc, vUv + vec2(uHalf.x, uHalf.y)) * 2.0;
  s += texture2D(tSrc, vUv + vec2(uHalf.x * 2.0, 0.0));
  s += texture2D(tSrc, vUv + vec2(uHalf.x, -uHalf.y)) * 2.0;
  s += texture2D(tSrc, vUv + vec2(0.0, -uHalf.y * 2.0));
  s += texture2D(tSrc, vUv + vec2(-uHalf.x, -uHalf.y)) * 2.0;
  gl_FragColor = vec4(s.rgb / 12.0, 1.0);
}`;

const COMP = /* glsl */`
uniform sampler2D tSharp; uniform sampler2D tMid; uniform sampler2D tStrong;
uniform float uBlur; uniform float uDim; uniform float uMode; uniform float uAlpha;
uniform vec3 uVeil; uniform vec3 uGlowColor; uniform vec2 uGlowCenter; uniform vec2 uGlowRadius;
uniform float uSeed;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
void main() {
  vec3 sharp = texture2D(tSharp, vUv).rgb;
  vec3 blurred = mix(texture2D(tMid, vUv).rgb, texture2D(tStrong, vUv).rgb, smoothstep(0.2, 1.0, uBlur));
  float w = smoothstep(0.0, 0.6, uBlur);
  vec2 q = (vUv - 0.5) * 2.0;
  float vig = 1.0 - 0.45 * smoothstep(0.3, 1.45, length(q));
  float vd = mix(1.0, vig, uDim);
  vec2 g = (vUv - uGlowCenter) / uGlowRadius;
  float glow = exp(-dot(g, g));
  vec3 k = (1.0 - 0.8 * uDim) * vd * mix(vec3(1.0), vec3(1.0, 0.9, 0.78), uDim);
  vec3 V = uDim * (uVeil + uGlowColor * glow) * vd;
  vec3 dither = vec3((hash(gl_FragCoord.xy) - 0.5) / 255.0);
  if (uMode < 0.5) {
    gl_FragColor = vec4(mix(sharp, blurred, w) * k + V + dither, uAlpha);
  } else {
    float kk = dot(k, vec3(0.3333));
    float a = 1.0 - (1.0 - w) * kk;
    gl_FragColor = vec4((blurred * w * k + V) / max(a, 1e-3) + dither, a * uAlpha);
  }
}`;

const FADE = /* glsl */`
uniform vec3 uColor; uniform float uAlpha;
void main() { gl_FragColor = vec4(uColor, uAlpha); }`;

export function createBackdrop(renderer) {
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(geo);
  quad.frustumCulled = false;
  scene.add(quad);
  const common = { vertexShader: VERT, depthTest: false, depthWrite: false };
  const down = new THREE.ShaderMaterial({ ...common, fragmentShader: DOWN, uniforms: { tSrc: { value: null }, uHalf: { value: new THREE.Vector2() } } });
  const up = new THREE.ShaderMaterial({ ...common, fragmentShader: UP, uniforms: { tSrc: { value: null }, uHalf: { value: new THREE.Vector2() } } });
  const comp = new THREE.ShaderMaterial({
    ...common, fragmentShader: COMP, transparent: true,
    uniforms: {
      tSharp: { value: null }, tMid: { value: null }, tStrong: { value: null },
      uBlur: { value: 0 }, uDim: { value: 0 }, uMode: { value: 0 }, uAlpha: { value: 1 },
      uVeil: { value: new THREE.Vector3(0.035, 0.027, 0.022) },
      uGlowColor: { value: new THREE.Vector3(0.16, 0.105, 0.066) },
      uGlowCenter: { value: new THREE.Vector2(0.5, 0.52) }, uGlowRadius: { value: new THREE.Vector2(0.45, 0.6) },
      uSeed: { value: 0.37 },
    },
  });
  const fade = new THREE.ShaderMaterial({
    ...common, fragmentShader: FADE, transparent: true,
    uniforms: { uColor: { value: new THREE.Vector3(0.043, 0.032, 0.027) }, uAlpha: { value: 0 } },
  });

  let snap = null, mid = null, strong = null;
  let snapW = 0, snapH = 0;
  const size = new THREE.Vector2();

  const makeRT = (w, h) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
  });

  function pass(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(scene, cam);
  }

  // Copy the current canvas contents (the main scene, just rendered) into the snapshot.
  function capture() {
    renderer.getDrawingBufferSize(size);
    const w = size.x | 0, h = size.y | 0;
    if (!snap || snapW !== w || snapH !== h) {
      if (snap) snap.dispose();
      snap = new THREE.FramebufferTexture(w, h);
      snap.format = THREE.RGBFormat;
      snap.internalFormat = 'RGB8';
      snap.minFilter = snap.magFilter = THREE.LinearFilter;
      snapW = w; snapH = h;
    }
    renderer.setRenderTarget(null);
    renderer.copyFramebufferToTexture(snap);
  }

  // Build the blur pyramid from the snapshot (once per snapshot / resize).
  function blur() {
    if (!snap) return;
    const prevTarget = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    renderer.autoClear = false;
    if (mid) mid.dispose();
    if (strong) strong.dispose();
    const levels = Math.min(7, Math.max(4, Math.round(Math.log2(Math.max(64, snapH)) - 5)));
    const downs = [];
    let src = snap, sw = snapW, sh = snapH;
    for (let i = 0; i < levels; i++) {
      const t = makeRT(sw >> 1, sh >> 1);
      down.uniforms.tSrc.value = src;
      down.uniforms.uHalf.value.set(0.5 / sw, 0.5 / sh);
      pass(down, t);
      downs.push(t);
      src = t.texture; sw = t.width; sh = t.height;
    }
    // strong: back up to 1/8 resolution
    let cur = downs[levels - 1];
    const temps = [];
    for (let i = levels - 2; i >= 2; i--) {
      const t = makeRT(downs[i].width, downs[i].height);
      up.uniforms.tSrc.value = cur.texture;
      up.uniforms.uHalf.value.set(0.5 / cur.width, 0.5 / cur.height);
      pass(up, t);
      temps.push(t);
      cur = t;
    }
    strong = cur;
    // mid: 1/8 level up to 1/4
    mid = makeRT(downs[1].width, downs[1].height);
    up.uniforms.tSrc.value = downs[2].texture;
    up.uniforms.uHalf.value.set(0.5 / downs[2].width, 0.5 / downs[2].height);
    pass(up, mid);
    for (const t of downs) t.dispose();
    for (const t of temps) if (t !== strong) t.dispose();
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAuto;
  }

  // Draw the veiled backdrop. mode 'opaque' (from the snapshot) or 'live' (blended over a
  // live frame already in the canvas). alpha < 1 draws it as a cover over the box.
  function draw({ blur: b = 1, dim = 1, live = false, alpha = 1 }) {
    if (!snap || !mid || !strong) return;
    const u = comp.uniforms;
    u.tSharp.value = snap;
    u.tMid.value = mid.texture;
    u.tStrong.value = strong.texture;
    u.uBlur.value = b;
    u.uDim.value = dim;
    u.uMode.value = live ? 1 : 0;
    u.uAlpha.value = alpha;
    quad.material = comp;
    renderer.setRenderTarget(null);
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, cam);
    renderer.autoClear = ac;
  }

  function drawFade(alpha, color) {
    if (alpha <= 0) return;
    if (color) fade.uniforms.uColor.value.copy(color);
    fade.uniforms.uAlpha.value = Math.min(1, alpha);
    quad.material = fade;
    renderer.setRenderTarget(null);
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, cam);
    renderer.autoClear = ac;
  }

  function setGlow(cx, cy, rx, ry) {
    comp.uniforms.uGlowCenter.value.set(cx, cy);
    comp.uniforms.uGlowRadius.value.set(Math.max(0.05, rx), Math.max(0.05, ry));
  }

  function disposeTargets() {
    if (snap) snap.dispose();
    if (mid) mid.dispose();
    if (strong) strong.dispose();
    snap = mid = strong = null;
    snapW = snapH = 0;
  }

  function dispose() {
    disposeTargets();
    geo.dispose();
    down.dispose(); up.dispose(); comp.dispose(); fade.dispose();
  }

  return {
    capture, blur, draw, drawFade, setGlow, dispose, disposeTargets,
    get ready() { return !!(snap && mid && strong); },
    get width() { return snapW; },
    get height() { return snapH; },
    fadeColor: fade.uniforms.uColor.value,
    comp,
  };
}
