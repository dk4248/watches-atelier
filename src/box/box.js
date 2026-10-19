// The leather watch box — "watch of the day" picker.
//
// createWatchBox(ctx, { watches, current, onPick }) → { active, open(), close(), update(dt), render() }
//
// While active, main.js only calls update(dt) and render(); render() draws the whole
// frame: the wallpaper (snapshot → blurred, darkened veil), the box scene on top, then
// optional cover / fly / fade passes. Watches are built in lite mode while the closed box
// sits on screen, shown when the lid opens, and disposed when the box closes.
import * as THREE from 'three';
import { createKinematics } from '../core/kinematics.js';
import { createRegistry, collectResources, disposeResources } from '../core/registry.js';
import {
  DEG, clamp, clamp01, lerp, smoothstep, easeOutCubic, easeInCubic, easeInOutCubic, easeInOutSine,
  lidOpenCurve, lidCloseCurve, Spring,
} from './util.js';
import {
  leatherCanvases, suedeCanvases, wovenCanvases, brushedCanvases, contactShadowCanvas, foilCanvas, canvasTexture,
} from './textures.js';
import {
  boxLayout, buildBox, cushionGeometry, cushionOutline, cushionTopY, lidCorners, disposeCushions, foilSize,
} from './geometry.js';
import { bandPath, strapGeometry, strapStitches, braceletGeometry } from './bands.js';
import { createBackdrop } from './backdrop.js';
import { createOverlay } from './overlay.js';

const STRAP_PART = /^(strap|bracelet|clasp|buckle|keeper|deployant|end-?links?)\b/i;
const UP = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ module cache
// Materials are kept for the page's lifetime so their shader programs stay compiled
// (re-opening is instant); textures / geometries are only kept CPU-side — their GPU
// copies are released every time the box closes.
const CACHE = { mats: null, boxes: new Map() };

function getMaterials() {
  if (CACHE.mats) return CACHE.mats;
  const L = leatherCanvases(1024);
  const S = suedeCanvases(512);
  const W = wovenCanvases(256);
  const B = brushedCanvases(256);
  const tex = {
    lColor: canvasTexture(L.color, { srgb: true }),
    lNormal: canvasTexture(L.normal),
    lRough: canvasTexture(L.rough),
    sColor: canvasTexture(S.color, { srgb: true }),
    sNormal: canvasTexture(S.normal),
    sRough: canvasTexture(S.rough),
    wNormal: canvasTexture(W.normal),
    wRough: canvasTexture(W.rough),
    bNormal: canvasTexture(B.normal),
    bRough: canvasTexture(B.rough),
  };
  // The box surfaces take less of the bright studio environment than the watches do
  // (envMapIntensity on an explicit envMap, set in open()), so the warm key light and
  // its shadows model the leather and the plush interior.
  const leather = new THREE.MeshPhysicalMaterial({
    name: 'box-leather', map: tex.lColor, normalMap: tex.lNormal, normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: tex.lRough, roughness: 1, metalness: 0, clearcoat: 0.32, clearcoatRoughness: 0.38, specularIntensity: 0.5,
    envMapIntensity: 0.55,
  });
  const paint = new THREE.MeshPhysicalMaterial({
    name: 'box-edge-paint', color: 0x1e0f08, roughness: 0.4, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.28,
    envMapIntensity: 0.4,
  });
  const suede = new THREE.MeshPhysicalMaterial({
    name: 'box-suede', color: 0xf1e4cd, map: tex.sColor, normalMap: tex.sNormal, normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: tex.sRough, roughness: 1, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0xfff6e8), sheenRoughness: 0.38,
    specularIntensity: 0.18, envMapIntensity: 0.38,
  });
  const thread = new THREE.MeshStandardMaterial({ name: 'box-thread', color: 0xf2e9d8, roughness: 0.5, metalness: 0, envMapIntensity: 0.5 });
  const brass = new THREE.MeshStandardMaterial({ name: 'box-brass', color: 0xe6c47e, metalness: 1, roughness: 0.16, envMapIntensity: 1.0 });
  const ground = new THREE.ShadowMaterial({ name: 'box-ground', color: 0x0a0604, opacity: 0.5, depthWrite: false });
  // prototypes for the bands (cloned per watch; kept so their programs stay warm)
  const strapLeather = new THREE.MeshPhysicalMaterial({
    name: 'band-leather', vertexColors: true, normalMap: tex.lNormal, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: tex.lRough,
    roughness: 0.95, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3,
  });
  const metalBrushed = new THREE.MeshStandardMaterial({
    name: 'band-brushed', color: 0xd2d5d8, metalness: 1, roughness: 0.46, roughnessMap: tex.bRough, normalMap: tex.bNormal, normalScale: new THREE.Vector2(0.07, 0.07),
  });
  const metalPolished = new THREE.MeshStandardMaterial({ name: 'band-polished', color: 0xd6d9dc, metalness: 1, roughness: 0.09 });
  const fabric = new THREE.MeshPhysicalMaterial({
    name: 'band-fabric', normalMap: tex.wNormal, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: tex.wRough, roughness: 1,
    sheen: 0.7, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff), metalness: 0,
  });
  // cushions: the same suede with baked occlusion in the vertex colours
  const suedeVC = suede.clone();
  suedeVC.name = 'box-suede-cushion';
  suedeVC.vertexColors = true;
  CACHE.mats = { leather, paint, suede, suedeVC, thread, brass, ground, strapLeather, metalBrushed, metalPolished, fabric, tex: Object.values(tex) };
  CACHE.envUsers = [leather, paint, suede, suedeVC, thread, brass];
  return CACHE.mats;
}

function getBox(n) {
  if (CACHE.boxes.has(n)) return CACHE.boxes.get(n);
  const mats = getMaterials();
  const L = boxLayout(n);
  // gold-foil stamp in the lid lining (its own alpha map per box size)
  const [fw, fh] = foilSize(L);
  const foilTex = canvasTexture(foilCanvas(fw, fh), { repeat: false, anisotropy: 8 });
  const foil = new THREE.MeshStandardMaterial({
    name: 'box-foil', color: 0xd9b46b, metalness: 1, roughness: 0.3, alphaMap: foilTex, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, envMapIntensity: 0.9,
  });
  CACHE.envUsers.push(foil);
  const parts = buildBox(L, { ...mats, foil });
  // floor: soft contact shadow + a shadow-catcher for the key light
  const pad = 46;
  const blobTex = canvasTexture(contactShadowCanvas(L.W + 6, L.D + 6, pad, 26), { repeat: false });
  const blobMat = new THREE.MeshBasicMaterial({ name: 'box-contact', color: 0x000000, transparent: true, opacity: 0.72, alphaMap: blobTex, depthWrite: false });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(L.W + 6 + 2 * pad, L.D + 6 + 2 * pad).rotateX(-Math.PI / 2), blobMat);
  blob.position.y = 0.05;
  blob.renderOrder = -2;
  const groundMat = mats.ground.clone();
  const fade = new THREE.Vector2(L.W * 0.95, L.D * 2.1);
  groundMat.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = { value: fade };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;\nuniform vec2 uFade;')
      .replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
        'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) * ( 1.0 - smoothstep( 0.45, 1.0, length( vGroundXZ / uFade ) ) ) );');
  };
  groundMat.customProgramCacheKey = () => 'box-ground-fade';
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L.W * 2.4, L.D * 4.6).rotateX(-Math.PI / 2), groundMat);
  ground.receiveShadow = true;
  ground.renderOrder = -1;
  parts.group.add(blob, ground);
  const entry = { L, parts, blob, ground, blobTex, blobMat, groundMat, foil, foilTex };
  CACHE.boxes.set(n, entry);
  return entry;
}

// Release GPU copies (geometries / textures) under an object without touching materials.
function releaseGeometries(obj) {
  obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

// Count the main scene's lights, so the box scene can use the same light layout and the
// watches' shader programs (compiled for the main scene) are reused instead of rebuilt.
function lightSignature(scene) {
  const s = { dir: 0, dirShadow: 0, hemi: 0, point: 0, pointShadow: 0, spot: 0, spotShadow: 0 };
  scene.traverseVisible((o) => {
    if (!o.isLight) return;
    if (o.isDirectionalLight) { s.dir++; if (o.castShadow) s.dirShadow++; }
    else if (o.isHemisphereLight) s.hemi++;
    else if (o.isPointLight) { s.point++; if (o.castShadow) s.pointShadow++; }
    else if (o.isSpotLight) { s.spot++; if (o.castShadow) s.spotShadow++; }
  });
  return s;
}

class Track {
  constructor(v = 0) { this.set(v); }
  set(v) { this.v = this.from = this.to = v; this.t = 1; this.dur = 0; return this; }
  go(to, dur, ease = easeInOutCubic) {
    this.from = this.v; this.to = to; this.t = 0; this.dur = Math.max(1e-4, dur); this.ease = ease;
    return this;
  }
  step(dt) {
    if (this.t >= 1) return false;
    this.t = Math.min(1, this.t + dt / this.dur);
    this.v = this.from + (this.to - this.from) * this.ease(this.t);
    return true;
  }
  get done() { return this.t >= 1; }
}

// ------------------------------------------------------------------ factory

export function createWatchBox(ctx, opts = {}) {
  const stage = ctx.stage;
  const renderer = stage.renderer;
  const canvas = renderer.domElement;
  const getWatches = () => (Array.isArray(opts.watches) ? opts.watches : []).filter(Boolean);
  const keepMats = ctx.sharedMaterials instanceof Set
    ? ctx.sharedMaterials
    : new Set(Object.values(ctx.M || {}).filter((m) => m && m.isMaterial));

  const S = {
    active: false, phase: 'idle', pt: 0, time: 0, reduced: false,
    closing: false, picking: false, shown: false, compiled: false, compileStarted: 0,
    hover: -1, focus: -1, touchFocus: -1, keyboard: false, pointerIn: false, hoverDirty: false,
    pointer: new THREE.Vector2(), down: null, today: -1, picked: -1,
    lastRender: 0, lastShadow: 0, needSnap: false, live: true, dirty: true,
    layoutKey: '', errors: 0,
  };
  const T = {
    veil: new Track(0), cover: new Track(1), rise: new Track(0), hasp: new Track(0), lid: new Track(0),
    fade: new Track(0), recede: new Track(0), fly: new Track(0),
  };
  const TRACKS = Object.values(T);

  let scene = null, cam = null, rig = null, boxEntry = null, backdrop = null, overlay = null, flyGroup = null;
  let slots = [];
  let prevControls = true, prevCursor = '';
  let bandGeoCache = new Map();
  const fits = { closed: null, open: null, mode: 'bottom' };
  const raycaster = new THREE.Raycaster();
  const _ray = new THREE.Ray(), _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _hit = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _size = new THREE.Vector2();
  const lidPts = [];

  // ---------------------------------------------------------------- scene setup
  function setupScene(watches) {
    const n = Math.max(4, Math.min(8, watches.length));
    boxEntry = getBox(n);
    const { L, parts } = boxEntry;
    scene = new THREE.Scene();
    scene.name = 'watch-box-scene';
    scene.environment = stage.scene.environment || null;
    scene.environmentIntensity = 1.0; // the watches look exactly as on the wallpaper
    for (const m of CACHE.envUsers || []) {
      if (m.envMap !== scene.environment) { m.envMap = scene.environment; m.needsUpdate = true; }
    }
    cam = new THREE.PerspectiveCamera(23, 1, 20, 6000);

    // lights: warm key with soft shadows, a cool rim, a warm hemisphere — matching the
    // main scene's light layout (counts / shadow casters) so programs are shared.
    rig = new THREE.Group();
    const sig = lightSignature(stage.scene);
    const key = new THREE.DirectionalLight(0xffead4, 3.1);
    key.position.set(-210, 440, 330);
    key.target.position.set(0, 40, -10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -235, right: 235, top: 215, bottom: -215, near: 220, far: 1000 });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.55;
    key.shadow.autoUpdate = false;
    key.shadow.needsUpdate = true;
    rig.add(key, key.target);
    const dirs = [key];
    const wantDir = Math.max(2, sig.dir), wantDirShadow = Math.max(1, sig.dirShadow);
    const rim = new THREE.DirectionalLight(0xdbe4ff, 0.55);
    rim.position.set(300, 280, -280);
    rig.add(rim, rim.target);
    dirs.push(rim);
    while (dirs.length < wantDir) {
      const d = new THREE.DirectionalLight(0xffffff, 0);
      rig.add(d);
      dirs.push(d);
    }
    // shadow casters beyond the key: present (so the light layout matches) but silent
    for (let i = 1; i < dirs.length; i++) {
      const d = dirs[i];
      d.castShadow = i < wantDirShadow;
      if (d.castShadow) {
        d.shadow.intensity = 0;
        d.shadow.mapSize.set(16, 16);
        d.shadow.autoUpdate = false;
        d.shadow.needsUpdate = false;
      }
    }
    const hemi = new THREE.HemisphereLight(0xfff3e6, 0x2a1b10, 0.3);
    rig.add(hemi);
    for (let i = 1; i < sig.hemi; i++) rig.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0));
    for (let i = 0; i < sig.point; i++) {
      const p = new THREE.PointLight(0xffffff, 0);
      if (i < sig.pointShadow) { p.castShadow = true; p.shadow.intensity = 0; p.shadow.autoUpdate = false; p.shadow.mapSize.set(16, 16); }
      rig.add(p);
    }
    for (let i = 0; i < sig.spot; i++) {
      const p = new THREE.SpotLight(0xffffff, 0);
      if (i < sig.spotShadow) { p.castShadow = true; p.shadow.intensity = 0; p.shadow.autoUpdate = false; p.shadow.mapSize.set(16, 16); }
      rig.add(p, p.target);
    }
    rig.userData.key = key;
    rig.userData.dirs = dirs;
    scene.add(rig);

    // the box (cached geometry; reset its moving parts)
    parts.lid.rotation.set(0, 0, 0);
    parts.hasp.rotation.set(0, 0, 0);
    parts.group.position.set(0, 0, 0);
    parts.group.rotation.set(0, 0, 0);
    scene.add(parts.group);
    flyGroup = new THREE.Group();
    flyGroup.name = 'fly';
    scene.add(flyGroup);

    // prototype meshes so compileAsync warms the band programs too
    const mats = getMaterials();
    const warm = new THREE.Group();
    warm.visible = false;
    const tiny = new THREE.BufferGeometry();
    tiny.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    tiny.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    tiny.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
    tiny.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3));
    for (const m of [mats.strapLeather, mats.metalBrushed, mats.metalPolished, mats.fabric, mats.suedeVC]) warm.add(new THREE.Mesh(tiny, m));
    warm.userData.tiny = tiny;
    scene.add(warm);
    scene.userData.warm = warm;

    // slots
    slots = L.slots.map((p, i) => {
      const group = new THREE.Group();
      group.name = `slot-${i}`;
      group.position.set(p.x, L.floorY + L.cushion.B, p.z);
      parts.group.add(group);
      const cushionMat = mats.suedeVC.clone();
      cushionMat.emissive = new THREE.Color(0xffe2b8);
      cushionMat.emissiveIntensity = 0;
      const w = watches[i] || null;
      return {
        i, x: p.x, z: p.z, watch: w, group, cushionMat, baseColor: cushionMat.color.clone(), cushion: null, home: group.position.clone(),
        lift: new Spring(0), glow: new Spring(0), appear: new Track(1),
        built: null, ready: false, failed: false, queued: !!w, compiling: false,
        hitBox: new THREE.Box3(), beat: -1, bandMats: [],
      };
    });
    for (const s of slots) {
      const lugW = s.watch ? lugWidthOf(s.watch) : 0;
      s.cushion = new THREE.Mesh(cushionGeometry(L.cushion, s.watch ? lugW + 0.6 : 0), s.cushionMat);
      s.cushion.castShadow = true;
      s.cushion.receiveShadow = true;
      s.group.add(s.cushion);
      const c = L.cushion;
      s.hitBox.set(new THREE.Vector3(-L.cw / 2 + 2, -c.B, -c.A - 6), new THREE.Vector3(L.cw / 2 - 2, c.B + 18, c.A + 6));
    }
  }

  // ---------------------------------------------------------------- watches
  function lugWidthOf(w) {
    const st = w.strap || {};
    const v = st.lugWidth ?? st.width ?? w.spec?.case?.lugWidth ?? w.spec?.case?.strap?.width ?? 20;
    return clamp(Number(v) || 20, 12, 26);
  }

  function springBarOf(w, bb) {
    const C = w.spec?.case || {};
    const sb = C.lug?.springBar || C.springBar || C.lugs?.springBar;
    if (sb && Number.isFinite(sb.y) && Number.isFinite(sb.z)) return { y: Math.abs(sb.y), z: sb.z };
    const ext = Math.max(bb.max.y, -bb.min.y);
    return { y: Math.max(8, ext - 2.4), z: bb.min.z + 0.36 * (bb.max.z - bb.min.z) };
  }

  function caseBackZ(w, bb) {
    const z = w.spec?.z?.caseBottom ?? w.spec?.case?.caseback?.bottom ?? w.spec?.case?.bottom;
    return Number.isFinite(z) && z >= bb.min.z - 0.5 && z < bb.max.z ? z : bb.min.z;
  }

  function buildSlot(s) {
    const w = s.watch;
    s.queued = false;
    const t0 = performance.now();
    const root = new THREE.Group();
    root.name = `watch-${w.id}`;
    const reg = createRegistry();
    let kin = null;
    try { kin = createKinematics(w.spec); } catch (e) { console.error(`[box] kinematics for ${w.id}`, e); }
    const mctx = {
      THREE: ctx.THREE || THREE, spec: w.spec, watch: w, M: ctx.M, reg, root, gear: ctx.gear,
      textTexture: ctx.textTexture, planarUV: ctx.planarUV, stage, kin, lite: true,
    };
    const names = new Set(Array.isArray(w.lite) && w.lite.length ? w.lite : ['case', 'dial', 'hands']);
    for (const pair of w.builders || []) {
      const [name, fn] = pair || [];
      if (!names.has(name) || typeof fn !== 'function') continue;
      try { fn(mctx); } catch (e) { console.error(`[box:${w.id}:${name}]`, e); }
    }
    // a lite build has no strap — if a builder made one anyway, drop it (the box draws its own)
    for (let i = reg.parts.length - 1; i >= 0; i--) {
      const p = reg.parts[i];
      if (!STRAP_PART.test(p.id)) continue;
      p.object.parent?.remove(p.object);
      const g = new Set(), m = new Set(), t = new Set();
      collectResources(p.object, g, m, t);
      disposeResources(g, m, t, keepMats);
      reg.parts.splice(i, 1);
      reg.byId.delete(p.id);
    }
    try { if (kin) reg.apply(kin.update()); } catch (e) { console.error(`[box] apply ${w.id}`, e); }
    root.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(root);
    if (bb.isEmpty() || !Number.isFinite(bb.min.x + bb.max.x)) {
      console.warn(`[box] ${w.id}: lite build produced nothing`);
      s.failed = true;
      const g = new Set(), m = new Set(), t = new Set();
      collectResources(root, g, m, t);
      disposeResources(g, m, t, keepMats);
      return;
    }
    root.traverse((o) => {
      if (o.isMesh) {
        // keep the box cheap: glass and tiny parts need no shadow
        if (o.material && (o.material.transparent || o.material.blending === THREE.AdditiveBlending)) o.castShadow = false;
      }
    });
    const L = boxEntry.L;
    const c = L.cushion;
    const back = caseBackZ(w, bb);
    const sink = 0.8;
    const yW = cushionTopY(c) - sink - back;
    const holder = new THREE.Group();
    holder.name = 'watch-holder';
    holder.rotation.x = -Math.PI / 2;
    holder.position.y = yW;
    holder.add(root);
    s.group.add(holder);

    // band
    const sb = springBarOf(w, bb);
    const lugW = lugWidthOf(w);
    const bar12 = [-sb.y, yW + sb.z], bar6 = [sb.y, yW + sb.z];
    try { buildBand(s, w, bar12, bar6, lugW); } catch (e) { console.error(`[box] band for ${w.id}`, e); }

    const half = Math.max(bb.max.y, -bb.min.y);
    s.hitBox.set(
      new THREE.Vector3(-L.cw / 2 + 1.5, -c.B, -Math.max(c.A, half) - 3),
      new THREE.Vector3(L.cw / 2 - 1.5, yW + bb.max.z + 3, Math.max(c.A, half) + 3),
    );
    s.built = { root, reg, kin, holder, bounds: bb, yW, head: yW + (bb.max.z + back) / 2, lug: half * 2, ms: performance.now() - t0 };
    // upload textures now (while the closed box sits still) rather than mid-animation
    const texs = new Set();
    root.traverse((o) => {
      const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of list) for (const v of Object.values(m)) if (v && v.isTexture) texs.add(v);
    });
    for (const t of texs) { try { renderer.initTexture(t); } catch { /* ignore */ } }
    s.compiling = true;
    const done = () => { s.compiling = false; s.ready = true; };
    try {
      renderer.compileAsync(s.group, cam, scene).then(done, done);
    } catch { done(); }
  }

  function buildBand(s, w, bar12, bar6, lugW) {
    const L = boxEntry.L;
    const st = w.strap || {};
    const kind = st.kind === 'bracelet' || st.kind === 'fabric' ? st.kind : 'leather';
    const outline = cushionOutline(L.cushion, true);
    const mats = getMaterials();
    const key = `${kind}|${lugW.toFixed(1)}|${bar12.map((v) => v.toFixed(2))}|${bar6.map((v) => v.toFixed(2))}|${st.thickness ?? ''}|${st.widthAtBuckle ?? ''}`;
    let geos = bandGeoCache.get(key);
    if (!geos) {
      geos = {};
      if (kind === 'leather') {
        const t0 = clamp(Number(st.thickness) || 3.0, 1.6, 4.5);
        const t1 = t0 - 0.7;
        const path = bandPath(outline, bar12, bar6, t0, { barR: 0.85 });
        const endW = clamp(Number(st.widthAtBuckle) || lugW - 2, lugW - 6, lugW);
        const taper = (s2) => Math.sin(Math.PI * clamp01(s2 / path.total)) ** 0.85;
        const width = (s2) => lugW - 0.2 - (lugW - 0.2 - endW) * taper(s2);
        const thick = (s2) => t0 - (t0 - t1) * taper(s2);
        geos.main = strapGeometry(path, { width, thick, tile: 15, edge: 0.4 });
        if (st.stitch !== false) geos.stitch = strapStitches(path, { width, thick, inset: 1.35, from: 2.5 });
      } else if (kind === 'fabric') {
        const t0 = clamp(Number(st.thickness) || 1.4, 0.8, 2.5);
        const path = bandPath(outline, bar12, bar6, t0, { barR: 0.85 });
        geos.main = strapGeometry(path, { width: () => lugW - 0.3, thick: () => t0, dome: 0.05, rTop: 0.45, rBot: 0.35, edge: 0.75, under: 0.9, tile: 4 });
      } else {
        const t0 = clamp(Number(st.thickness) || 3.4, 2.5, 5);
        const path = bandPath(outline, bar12, bar6, t0, { barR: 0.85, inboard: 1.2 });
        const endW = clamp(Number(st.widthAtClasp ?? st.widthAtBuckle) || lugW - 2, lugW - 6, lugW);
        const taper = (s2) => Math.sin(Math.PI * clamp01(s2 / path.total)) ** 0.8;
        const width = (s2) => lugW - 0.2 - (lugW - 0.2 - endW) * taper(s2);
        const g = braceletGeometry(path, { width, thick: t0, pitch: clamp(Number(st.pitch) || 5.0, 3, 9), centreFrac: clamp(Number(st.centreFrac) || 0.4, 0.2, 0.6) });
        geos.outer = g.outer;
        geos.centre = g.centre;
      }
      bandGeoCache.set(key, geos);
    }
    const add = (geo, mat, cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = true;
      s.group.add(m);
      s.bandMats.push(mat);
      return m;
    };
    if (kind === 'leather') {
      const m = mats.strapLeather.clone();
      m.color = new THREE.Color(st.color || '#3b2618');
      const lum = m.color.r * 0.3 + m.color.g * 0.59 + m.color.b * 0.11;
      m.clearcoat = lum < 0.05 ? 0.55 : 0.32;
      m.clearcoatRoughness = lum < 0.05 ? 0.22 : 0.34;
      add(geos.main, m);
      if (geos.stitch) {
        const sm = mats.thread.clone();
        sm.color = new THREE.Color(st.stitch || (lum < 0.05 ? '#2b2620' : '#efe4cf'));
        add(geos.stitch, sm, false);
      }
    } else if (kind === 'fabric') {
      const m = mats.fabric.clone();
      m.color = new THREE.Color(st.color || '#2f3a44');
      m.sheenColor = m.color.clone().lerp(new THREE.Color(0xffffff), 0.5);
      add(geos.main, m);
    } else {
      // titanium reads a touch warmer and darker than steel; a strap colour only tints the
      // metal when it is a plausible metal tone (a dark leather colour left in a bracelet
      // descriptor must not turn it black)
      const ti = /titan/i.test(st.material || '');
      let tint = null;
      if (st.metalColor || st.color) {
        const c = new THREE.Color(st.metalColor || st.color);
        if (st.metalColor || c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.3) tint = c;
      }
      const brushed = mats.metalBrushed.clone();
      brushed.color = tint ? tint.clone() : new THREE.Color(ti ? '#bdb8ae' : '#d4d7db');
      const centrePolished = st.centre ? st.centre === 'polished' : true;
      const centre = centrePolished ? mats.metalPolished.clone() : brushed.clone();
      if (centrePolished) centre.color = tint ? tint.clone() : new THREE.Color(ti ? '#cbc6bd' : '#dcdfe2');
      add(geos.outer, brushed);
      add(geos.centre, centre);
    }
  }

  // ---------------------------------------------------------------- framing
  function viewParams(aspect) {
    if (aspect < 0.82) return { el: 49 * DEG, yaw: 0 };
    if (aspect > 2.2) return { el: 35 * DEG, yaw: -7 * DEG };
    return { el: 38 * DEG, yaw: -8 * DEG };
  }

  const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _c = new THREE.Vector3(), _p = new THREE.Vector3();
  function fit(points, yaw, el, aspect, win) {
    _f.set(-Math.sin(yaw) * Math.cos(el), -Math.sin(el), -Math.cos(yaw) * Math.cos(el));
    _r.crossVectors(_f, UP).normalize();
    _u.crossVectors(_r, _f).normalize();
    const ty = Math.tan((cam.fov * DEG) / 2), tx = ty * aspect;
    const target = new THREE.Vector3();
    for (const p of points) target.add(p);
    target.divideScalar(points.length);
    let Ld = 900;
    for (let it = 0; it < 12; it++) {
      _c.copy(target).addScaledVector(_f, -Ld);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of points) {
        _p.subVectors(p, _c);
        const z = Math.max(1, _p.dot(_f));
        const x = _p.dot(_r) / (z * tx), y = _p.dot(_u) / (z * ty);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      const s = Math.max((x1 - x0) / (win.r - win.l), (y1 - y0) / (win.t - win.b));
      const Ln = Ld * s;
      target.addScaledVector(_r, ((x0 + x1) / 2 / s - (win.l + win.r) / 2) * Ln * tx);
      target.addScaledVector(_u, ((y0 + y1) / 2 / s - (win.b + win.t) / 2) * Ln * ty);
      Ld = Ln;
    }
    return { target, pos: target.clone().addScaledVector(_f, -Ld), dist: Ld };
  }

  // Open box: fills the window. Closed box: about 12 % wider on screen than the open one
  // (not filling the frame), so opening the lid is only a gentle pull-back.
  function fitBoth(win, yaw, el, aspect) {
    const openPts = framePoints(true);
    fits.open = fit(openPts, yaw, el, aspect, win);
    cam.position.copy(fits.open.pos);
    cam.lookAt(fits.open.target);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    let x0 = Infinity, x1 = -Infinity;
    for (const p of openPts) { _v.copy(p).project(cam); x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); }
    const q = clamp((1.12 * (x1 - x0)) / (win.r - win.l), 0.3, 1);
    const cx = (win.l + win.r) / 2, cy = (win.t + win.b) / 2;
    const wc = { l: cx + (win.l - cx) * q, r: cx + (win.r - cx) * q, t: cy + (win.t - cy) * q, b: cy + (win.b - cy) * q };
    fits.closed = fit(framePoints(false), yaw, el, aspect, wc);
  }

  function framePoints(open, floor = true) {
    const L = boxEntry.L;
    const hx = L.W / 2, hz = L.D / 2;
    const pts = [];
    for (const x of [-hx, hx]) for (const z of [-hz, hz + 4]) {
      pts.push(new THREE.Vector3(x, floor ? -14 : 0, z)); // room for the shadow / chip below
      pts.push(new THREE.Vector3(x, L.rim, z));
    }
    lidCorners(L, open ? L.openAngle : 0, lidPts);
    for (const p of lidPts) pts.push(p.clone());
    return pts;
  }

  // Screen rectangle (CSS px) of a set of points seen from a fitted camera.
  function projectedRect(f, pts, wPx, hPx) {
    cam.position.copy(f.pos);
    cam.lookAt(f.target);
    cam.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      _v.copy(p).project(cam);
      x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y);
    }
    return { l: ((x0 + 1) / 2) * wPx, r: ((x1 + 1) / 2) * wPx, t: ((1 - y1) / 2) * hPx, b: ((1 - y0) / 2) * hPx };
  }

  // Frame the box for the current canvas size: big and centred; the caption sits beside
  // the box on very wide screens (32:9) and below it otherwise, the two centred together
  // when the box is limited by the width (portrait, phones).
  function updateLayout(force = false) {
    renderer.getSize(_size);
    const wPx = Math.max(1, _size.x), hPx = Math.max(1, _size.y);
    const key = `${wPx}x${hPx}`;
    if (!force && key === S.layoutKey) return;
    S.layoutKey = key;
    const aspect = wPx / hPx;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    const { el, yaw } = viewParams(aspect);
    const toNdcX = (px) => (px / wPx) * 2 - 1;
    const toNdcY = (py) => 1 - (py / hPx) * 2;
    const capH = overlay ? Math.max(90, overlay.captionHeight()) : 120;
    S.dirty = true;

    if (aspect > 2.05) {
      const mx = Math.max(16, wPx * 0.03), tb = Math.max(18, hPx * 0.04);
      fitBoth({ l: toNdcX(mx), r: toNdcX(wPx - mx), t: toNdcY(tb), b: toNdcY(hPx - tb) }, yaw, el, aspect);
      const rect = projectedRect(fits.open, framePoints(true, false), wPx, hPx);
      const gap = Math.max(36, wPx * 0.022);
      const sideW = Math.min(460, rect.l - gap - Math.max(28, wPx * 0.025));
      if (sideW >= 240) {
        fits.mode = 'side';
        overlay?.setLayout('side', { right: wPx - rect.l + gap, sideW });
        placeGlow();
        return;
      }
    }
    fits.mode = 'bottom';
    const mx = Math.max(16, wPx * 0.04);
    const top = Math.max(50, hPx * 0.05), bm = Math.max(18, hPx * 0.035), gap = Math.max(10, hPx * 0.012);
    fitBoth({ l: toNdcX(mx), r: toNdcX(wPx - mx), t: toNdcY(top), b: toNdcY(hPx - bm - capH - gap) }, yaw, el, aspect);
    const rect = projectedRect(fits.open, framePoints(true), wPx, hPx);
    const boxH = rect.b - rect.t;
    const slack = hPx - top - bm - (boxH + gap + capH);
    let capBottom = bm;
    if (slack > 8) {
      // width-limited: centre box + caption as one group
      const t2 = top + slack / 2;
      fitBoth({ l: toNdcX(mx), r: toNdcX(wPx - mx), t: toNdcY(t2), b: toNdcY(t2 + boxH) }, yaw, el, aspect);
      capBottom = hPx - (t2 + boxH + gap + capH);
    }
    overlay?.setLayout('bottom', { bottom: capBottom });
    placeGlow();
  }

  // warm "stage light" pool in the veil, centred behind the open box
  function placeGlow() {
    if (!backdrop || !fits.open) return;
    cam.position.copy(fits.open.pos);
    cam.lookAt(fits.open.target);
    cam.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of framePoints(true)) {
      _v.copy(p).project(cam);
      x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y);
    }
    const cx = (x0 + x1) / 4 + 0.5, cy = (y0 + y1) / 4 + 0.5;
    backdrop.setGlow(cx, cy, (x1 - x0) / 4 * 1.35, (y1 - y0) / 4 * 1.5);
  }

  function placeCamera() {
    if (S.camOverride) {
      cam.position.fromArray(S.camOverride.pos);
      cam.lookAt(_v.fromArray(S.camOverride.target));
      cam.updateMatrixWorld(true);
      return;
    }
    const k = smoothstep(0.0, 1.0, clamp01(T.lid.v));
    const a = fits.closed, b = fits.open;
    cam.position.lerpVectors(a.pos, b.pos, k);
    _v.lerpVectors(a.target, b.target, k);
    cam.lookAt(_v);
    cam.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- input
  function ndcFrom(e, out) {
    const r = canvas.getBoundingClientRect();
    out.set(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -((e.clientY - r.top) / Math.max(1, r.height)) * 2 + 1);
    return out;
  }
  function stop(e) { e.stopImmediatePropagation(); e.stopPropagation(); }
  function onPointerMove(e) {
    stop(e);
    ndcFrom(e, S.pointer);
    S.pointerIn = true;
    S.pointerType = e.pointerType;
    S.hoverDirty = true;
  }
  function onPointerDown(e) {
    stop(e);
    e.preventDefault();
    ndcFrom(e, S.pointer);
    S.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  }
  function onPointerUp(e) {
    stop(e);
    const d = S.down;
    S.down = null;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 1200) return;
    ndcFrom(e, S.pointer);
    onTap(e.pointerType || 'mouse');
  }
  function onPointerLeave(e) { stop(e); S.pointerIn = false; S.hoverDirty = true; }
  function onSwallow(e) { stop(e); if (e.cancelable) e.preventDefault(); }
  function onKey(e) {
    if (!S.active) return;
    if (e.ctrlKey || e.metaKey || e.altKey || /^F\d{1,2}$/.test(e.key)) return;
    stop(e);
    if (e.type !== 'keydown') return;
    const k = e.key;
    if (k === 'Escape' || k === 'Esc') { e.preventDefault(); close(); return; }
    if (k === 'Tab') return; // let focus reach the close button
    if (overlay && document.activeElement === overlay.close && (k === 'Enter' || k === ' ')) return;
    if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); moveFocus(-1); }
    else if (k === 'Home') { e.preventDefault(); moveFocus(-99); }
    else if (k === 'End') { e.preventDefault(); moveFocus(99); }
    else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (S.phase === 'open' && S.focus >= 0) pick(S.focus);
    }
  }
  const listeners = [
    [canvas, 'pointermove', onPointerMove], [canvas, 'pointerdown', onPointerDown], [canvas, 'pointerup', onPointerUp],
    [canvas, 'pointerleave', onPointerLeave], [canvas, 'pointercancel', onPointerLeave], [canvas, 'wheel', onSwallow],
    [canvas, 'contextmenu', onSwallow], [canvas, 'dblclick', onSwallow], [canvas, 'click', onSwallow],
    [canvas, 'touchstart', onSwallow], [canvas, 'touchmove', onSwallow],
    [window, 'keydown', onKey], [window, 'keyup', onKey],
  ];
  function listen(on) {
    for (const [t, type, fn] of listeners) {
      if (on) t.addEventListener(type, fn, { capture: true, passive: false });
      else t.removeEventListener(type, fn, { capture: true });
    }
  }

  function pickable(i) { const s = slots[i]; return !!(s && s.watch && s.ready && !s.failed); }
  function moveFocus(d) {
    if (S.phase !== 'open') return;
    S.keyboard = true;
    const idx = slots.map((s, i) => i).filter(pickable);
    if (!idx.length) return;
    let cur = idx.indexOf(S.focus);
    if (cur < 0) {
      cur = Math.max(0, idx.indexOf(S.today));
      if (S.focus < 0 && Math.abs(d) === 1) { S.focus = idx[cur]; S.dirty = true; return; }
    }
    if (d === -99) cur = 0;
    else if (d === 99) cur = idx.length - 1;
    else cur = (cur + d + idx.length) % idx.length;
    S.focus = idx[cur];
    S.dirty = true;
  }

  function raycast() {
    raycaster.setFromCamera(S.pointer, cam);
    let best = -1, bestD = Infinity;
    for (const s of slots) {
      if (!pickable(s.i)) continue;
      _m.copy(s.group.matrixWorld).invert();
      _ray.copy(raycaster.ray).applyMatrix4(_m);
      if (_ray.intersectBox(s.hitBox, _hit)) {
        _hit.applyMatrix4(s.group.matrixWorld);
        const d = _hit.distanceTo(raycaster.ray.origin);
        if (d < bestD) { bestD = d; best = s.i; }
      }
    }
    let inside = best >= 0;
    if (!inside && boxEntry) {
      const { parts } = boxEntry;
      _m.copy(parts.group.matrixWorld).invert();
      _ray.copy(raycaster.ray).applyMatrix4(_m);
      if (_ray.intersectBox(parts.baseBox, _hit)) inside = true;
      if (!inside) {
        _m.copy(parts.lid.matrixWorld).invert();
        _ray.copy(raycaster.ray).applyMatrix4(_m);
        _v.copy(parts.lidBox.min).sub(parts.pivot);
        _v2.copy(parts.lidBox.max).sub(parts.pivot);
        if (_ray.intersectBox(new THREE.Box3(_v, _v2), _hit)) inside = true;
      }
    }
    return { slot: best, inside };
  }

  function onTap(type) {
    if (!S.active || S.picking || S.closing) return;
    const { slot, inside } = raycast();
    if (S.phase === 'open' && slot >= 0) {
      if (type === 'touch' && S.touchFocus !== slot) {
        S.touchFocus = slot;
        S.focus = slot;
        S.dirty = true;
        return;
      }
      pick(slot);
      return;
    }
    if (!inside) close();
  }

  // ---------------------------------------------------------------- open / close / pick
  function open() {
    if (S.active) return;
    try {
      const watches = getWatches();
      S.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      S.touchFirst = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
      Object.assign(S, {
        active: true, phase: 'idle', pt: 0, time: 0, closing: false, picking: false, shown: false, compiled: false,
        hover: -1, focus: -1, touchFocus: -1, keyboard: false, pointerIn: false, pointerType: null, down: null, picked: -1,
        lastRender: 0, lastShadow: 0, needSnap: true, live: true, dirty: true, layoutKey: '', errors: 0,
      });
      for (const t of TRACKS) t.set(0);
      T.cover.set(1);
      bandGeoCache = new Map();
      setupScene(watches);
      backdrop = createBackdrop(renderer);
      overlay = createOverlay({ onClose: () => close() });
      prevControls = stage.controls ? stage.controls.enabled : true;
      if (stage.controls) stage.controls.enabled = false;
      prevCursor = canvas.style.cursor;
      listen(true);
      const cur = safeCurrent();
      S.today = slots.findIndex((s) => s.watch && s.watch.id === cur);
      setCaptionIdle();
      updateLayout(true);
      placeCamera();
      // compile the box's own materials in the background (parallel shader compile)
      S.compileStarted = performance.now();
      try {
        renderer.compileAsync(scene, cam).then(() => { S.compiled = true; }, () => { S.compiled = true; });
      } catch { S.compiled = true; }
      setPhase('enter');
      try { window.dispatchEvent(new CustomEvent('watchbox:open')); } catch { /* ignore */ }
    } catch (e) {
      console.error('[box] open failed', e);
      hardReset();
    }
  }

  function close() {
    if (!S.active || S.closing || S.picking) return;
    S.closing = true;
    S.hover = S.focus = -1;
    overlay?.show(false);
    overlay?.setChip(0, 0, false);
    canvas.style.cursor = prevCursor;
    if (S.phase === 'enter' || S.phase === 'rise' || T.lid.v < 0.02) setPhase('sink');
    else setPhase('closeLid');
    try { window.dispatchEvent(new CustomEvent('watchbox:closing')); } catch { /* ignore */ }
  }

  function pick(i) {
    if (!S.active || S.picking || S.closing || S.phase !== 'open' || !pickable(i)) return;
    const s = slots[i];
    S.picking = true;
    S.picked = i;
    S.hover = S.focus = -1;
    overlay?.show(false);
    overlay?.setChip(0, 0, false);
    canvas.style.cursor = prevCursor;
    // lift the slot (cushion + watch + band) out of the box into the fly group
    scene.updateMatrixWorld(true);
    flyGroup.attach(s.group);
    s.flyFrom = { pos: s.group.position.clone(), quat: s.group.quaternion.clone() };
    // hero pose: the watch keeps its natural pose on the pillow (dial up, 12 o'clock away)
    // but turns to face the viewer and tips towards them, so the dial reads almost
    // face-on and the pillow still reads as a pillow; it fills about half the screen
    cam.updateMatrixWorld(true);
    const f = new THREE.Vector3();
    cam.getWorldDirection(f);
    const r = new THREE.Vector3().crossVectors(f, cam.up).normalize();
    const u = new THREE.Vector3().crossVectors(r, f).normalize();
    const az = Math.atan2(-f.x, -f.z);
    // turned a quarter towards the crown so the pillow shows its rounded end
    const quat = new THREE.Quaternion().setFromAxisAngle(UP, az - 24 * DEG);
    quat.premultiply(new THREE.Quaternion().setFromAxisAngle(r, 19 * DEG));
    const lug = s.built ? s.built.lug : 45;
    const ty = Math.tan((cam.fov * DEG) / 2), tx = ty * cam.aspect;
    const d = Math.max(lug / (0.46 * 2 * ty), lug / (0.7 * 2 * tx));
    const headLocal = new THREE.Vector3(0, s.built ? s.built.head : 20, 0);
    const heroHead = cam.position.clone().addScaledVector(f, d).addScaledVector(u, lug * 0.2);
    const pos = heroHead.clone().sub(headLocal.clone().applyQuaternion(quat));
    const ctrl = s.flyFrom.pos.clone().add(new THREE.Vector3(0, 70, 0)).lerp(pos, 0.2);
    ctrl.y = Math.max(ctrl.y, s.flyFrom.pos.y + 55);
    s.flyTo = { pos, quat, ctrl, f: f.clone() };
    setPhase('pick');
    try { window.dispatchEvent(new CustomEvent('watchbox:pick', { detail: { id: s.watch.id } })); } catch { /* ignore */ }
  }

  function safeCurrent() {
    try { return typeof opts.current === 'function' ? opts.current() : null; } catch { return null; }
  }

  // ---------------------------------------------------------------- phases
  function setPhase(p) {
    S.phase = p;
    S.pt = 0;
    S.dirty = true;
    const R = S.reduced;
    switch (p) {
      case 'enter':
        S.live = true;
        T.veil.go(1, R ? 0.25 : 0.5, easeInOutSine);
        T.rise.set(R ? 1 : 0);
        T.cover.set(1);
        break;
      case 'rise':
        T.rise.go(1, R ? 0.01 : 0.78, easeOutCubic);
        T.cover.go(0, R ? 0.3 : 0.5, easeInOutSine);
        break;
      case 'prep':
        break;
      case 'clasp':
        T.hasp.go(1, R ? 0.12 : 0.28, easeOutCubic);
        break;
      case 'lid':
        T.lid.go(1, R ? 0.45 : 1.22, R ? easeOutCubic : lidOpenCurve);
        break;
      case 'open':
        break;
      case 'closeLid': {
        const l0 = T.lid.v;
        T.lid.go(0, R ? 0.3 : 0.28 + 0.42 * l0, R ? easeInOutCubic : (q) => 1 - lidCloseCurve(q));
        break;
      }
      case 'closeHasp':
        T.hasp.go(0, R ? 0.1 : 0.22, easeInOutCubic);
        break;
      case 'sink':
        // the box leaves first, then the light comes back up
        S.live = true;
        S.veilOut = false;
        if (T.hasp.v > 0.001) T.hasp.go(0, 0.2, easeInOutCubic);
        if (!R) T.rise.go(0, 0.55, easeInCubic);
        T.cover.go(1, R ? 0.25 : 0.42, easeInOutSine);
        break;
      case 'pick':
        T.fly.go(1, R ? 0.3 : 1.05, easeInOutCubic);
        T.recede.go(1, R ? 0.3 : 0.95, easeInOutCubic);
        T.cover.go(R ? 0.92 : 0.8, R ? 0.3 : 0.9, easeInOutSine);
        break;
      case 'fade':
        T.fade.go(1, R ? 0.22 : 0.36, easeInCubic);
        break;
      case 'switch':
        break;
      default:
    }
  }

  function stepPhase(dt) {
    const R = S.reduced;
    switch (S.phase) {
      case 'enter': {
        const waited = performance.now() - S.compileStarted;
        if ((S.compiled || waited > 2500) && S.pt >= (R ? 0.05 : 0.26)) setPhase('rise');
        break;
      }
      case 'rise':
        if (T.rise.done && T.cover.done) setPhase('prep');
        break;
      case 'prep': {
        const pending = slots.some((s) => s.watch && !s.failed && !s.ready);
        if (!pending || S.pt > 2.6) setPhase('clasp');
        break;
      }
      case 'clasp':
        if (T.hasp.done) setPhase('lid');
        break;
      case 'lid':
        if (!S.shown && T.lid.v > 0.55) { S.shown = true; overlay?.show(true); }
        if (T.lid.done) setPhase('open');
        break;
      case 'closeLid':
        if (T.lid.done) setPhase('closeHasp');
        break;
      case 'closeHasp':
        if (T.hasp.done) setPhase('sink');
        break;
      case 'sink':
        if (!S.veilOut && T.cover.v > (R ? 0.3 : 0.62)) {
          S.veilOut = true;
          T.veil.go(0, R ? 0.3 : 0.5, easeInOutSine);
        }
        if (S.veilOut && T.veil.done && T.cover.done && (R || T.rise.done)) finish(false);
        break;
      case 'pick':
        if (T.fly.t >= (R ? 0.4 : 0.8)) setPhase('fade');
        break;
      case 'fade':
        if (T.fade.done) setPhase('switch');
        break;
      case 'switch':
        // the fully dark frame has been shown: swap the wallpaper behind the DOM fade
        if (S.pt > 0) doSwitch();
        break;
      default:
    }
    void dt;
  }

  function doSwitch() {
    const s = slots[S.picked];
    const id = s && s.watch ? s.watch.id : null;
    overlay?.fadeTo(1, 0);
    let err = null;
    if (id && typeof opts.onPick === 'function') {
      try { opts.onPick(id); } catch (e) { err = e; console.error('[box] onPick failed', e); }
    }
    finish(true);
    void err;
  }

  // ---------------------------------------------------------------- per-frame
  function step(dtIn) {
    const dt = clamp(Number.isFinite(dtIn) ? dtIn : 0.016, 0, 0.05);
    S.time += dt;
    S.pt += dt;
    let moving = false;
    for (const t of TRACKS) moving = t.step(dt) || moving;
    stepPhase(dt);
    if (!S.active) return;

    // builds: one watch per frame while the closed box stands still (late ones, on a
    // slow machine, once the lid is open)
    if (S.phase === 'prep' || S.phase === 'open') {
      const next = slots.find((s) => s.queued);
      if (next) { buildSlot(next); moving = true; }
    }

    // watches: live time
    let smooth = false;
    for (const s of slots) {
      if (!s.built) continue;
      if (s.ready && !s.revealed) {
        s.revealed = true;
        if (S.phase === 'lid' || S.phase === 'open') s.appear.set(0).go(1, 0.45, easeOutCubic);
        else s.appear.set(1);
      }
      s.built.holder.visible = s.ready;
      if (!s.ready) continue;
      if (s.built.kin?.state?.springDrive) smooth = true;
      try {
        const st = s.built.kin ? s.built.kin.update() : null;
        if (st) {
          s.built.reg.apply(st);
          if (st.beat !== s.beat) { s.beat = st.beat; S.beatChanged = true; }
        }
      } catch (e) { if (S.errors++ < 3) console.error('[box] watch update', e); }
      if (s.appear.step(dt)) moving = true;
      const ap = s.appear.v;
      s.built.holder.position.y = s.built.yW + (1 - ap) * 9;
      s.built.holder.scale.setScalar(0.97 + 0.03 * ap);
    }
    S.smooth = smooth;

    // hover / focus
    if (S.phase === 'open' && !S.picking && !S.closing) {
      if (S.hoverDirty || moving) {
        S.hoverDirty = false;
        const h = S.pointerIn && S.pointerType !== 'touch' ? raycast().slot : -1;
        if (h !== S.hover) { S.hover = h; if (h >= 0) S.keyboard = false; S.dirty = true; }
        canvas.style.cursor = S.hover >= 0 ? 'pointer' : prevCursor;
      }
    }
    const act = S.phase === 'open' && !S.picking && !S.closing ? (S.hover >= 0 ? S.hover : S.focus) : -1;
    for (const s of slots) {
      const on = s.i === act;
      s.lift.step(on ? 3 : 0, S.reduced ? 30 : 15, dt);
      s.glow.step(on ? 1 : act >= 0 ? -1 : 0, 12, dt);
      if (!s.lift.settled || !s.glow.settled) moving = true;
    }

    // box transforms
    const { parts, L } = boxEntry;
    const e = T.rise.v;
    const R = S.reduced;
    const rec = T.recede.v;
    parts.group.position.set(0, R ? 0 : -110 * (1 - e) - 26 * rec, R ? 0 : 30 * (1 - e) - 70 * rec);
    parts.group.rotation.set(0, R ? 0 : 0.2 * (1 - e) * (1 - e), 0);
    parts.lid.rotation.x = -T.lid.v * L.openAngle;
    // the hasp swings out to clear the knob, then folds back against the lid as it rises
    parts.hasp.rotation.x = -T.hasp.v * 72 * DEG * (1 - smoothstep(0.12, 0.55, T.lid.v));
    for (const s of slots) {
      const g = s.glow.x;
      s.cushionMat.emissiveIntensity = 0.2 * Math.max(0, g);
      // the lifted pillow settles into shadow so the watch on it carries the shot
      const flyDim = s.i === S.picked && S.picking ? 0.28 * T.fly.v : 0;
      s.cushionMat.color.copy(s.baseColor).multiplyScalar((1 - 0.12 * Math.max(0, -g)) * (1 - flyDim));
      if (s.i === S.picked && S.picking) continue;
      s.group.position.set(s.home.x, s.home.y + s.lift.x, s.home.z);
      // hovered: lifted, tipped a few degrees towards the viewer, its cushion aglow;
      // the others settle back a shade
      const h = clamp01(s.lift.x / 3);
      s.group.rotation.set((S.reduced ? 0 : 5 * DEG) * h, 0, 0);
      s.group.scale.setScalar(1 + 0.018 * h);
    }
    // the picked watch flies to the camera
    if (S.picking && S.picked >= 0) {
      const s = slots[S.picked];
      const k = T.fly.v;
      const a = s.flyFrom.pos, c = s.flyTo.ctrl, b = s.flyTo.pos;
      const u = 1 - k;
      s.group.position.set(
        u * u * a.x + 2 * u * k * c.x + k * k * b.x,
        u * u * a.y + 2 * u * k * c.y + k * k * b.y,
        u * u * a.z + 2 * u * k * c.z + k * k * b.z,
      );
      // drift on towards the camera while the screen fades
      if (S.phase === 'fade' || S.phase === 'switch') s.group.position.addScaledVector(s.flyTo.f, -14 * T.fade.v);
      _q.copy(s.flyFrom.quat).slerp(s.flyTo.quat, easeInOutSine(clamp01((k - 0.08) / 0.92)));
      s.group.quaternion.copy(_q);
      s.group.scale.setScalar(1);
      if (R) {
        s.group.position.copy(a).add(_v.set(0, 8 * k, 0));
        s.group.quaternion.copy(s.flyFrom.quat);
      }
    }

    updateLayout();
    placeCamera();
    updateDom();
    if (moving) S.dirty = true;
    S.animating = moving || S.phase !== 'open';
  }

  function updateDom() {
    if (!overlay) return;
    // caption
    if (S.phase === 'open' || S.phase === 'lid') {
      const act = S.hover >= 0 ? S.hover : S.focus;
      if (act >= 0 && slots[act]?.watch) setCaptionWatch(slots[act]);
      else setCaptionIdle();
    }
    // the "Today" chip under the current watch
    const showChip = S.shown && !S.closing && !S.picking && S.today >= 0 && slots[S.today]?.ready;
    if (showChip) {
      const s = slots[S.today];
      const L = boxEntry.L;
      _v.set(s.x, -7, L.D / 2 + 9).applyMatrix4(boxEntry.parts.group.matrixWorld).project(cam);
      renderer.getSize(_size);
      overlay.setChip((_v.x + 1) / 2 * _size.x, (1 - _v.y) / 2 * _size.y, true);
    } else overlay.setChip(0, 0, false);
  }

  function hintFor(isToday) {
    const touch = S.pointerType ? S.pointerType === 'touch' : S.touchFirst;
    if (S.keyboard) return isToday ? 'Today’s watch · Enter keeps it · Esc closes' : 'Enter to wear it today · ← → to browse';
    if (touch) return isToday ? 'Today’s watch · tap again to keep it' : 'Tap again to wear it today';
    return isToday ? 'Today’s watch · click to keep wearing it' : 'Click to wear it today';
  }
  function setCaptionWatch(s) {
    const w = s.watch;
    const isToday = s.i === S.today;
    const bits = [];
    if (w.ref) bits.push(`Ref. ${w.ref}`);
    if (w.caliber) bits.push(w.caliber);
    const note = w.boxNote || w.movementType;
    if (note) bits.push(note);
    overlay.setCaption({ brand: w.brand || '', model: w.model || w.title || w.id, meta: bits.join(' · '), hint: hintFor(isToday), today: isToday });
  }
  function setCaptionIdle() {
    if (!overlay) return;
    const ws = slots.filter((s) => s.watch);
    const touch = S.pointerType ? S.pointerType === 'touch' : S.touchFirst;
    const cur = S.today >= 0 ? slots[S.today].watch : null;
    const meta = ws.length
      ? `${ws.length} ${ws.length === 1 ? 'watch' : 'watches'}${cur ? ` · today: ${cur.boxLabel || cur.model || cur.id}` : ''}`
      : 'No watches in the collection yet';
    const hint = !ws.length ? 'Esc to close'
      : touch ? 'Tap a watch to see it'
        : S.keyboard ? '← → to browse · Enter to wear · Esc to close' : 'Point at a watch · click to wear it today';
    overlay.setCaption({ brand: 'The watch box', model: 'Choose today’s watch', meta, hint, today: false });
  }

  // ---------------------------------------------------------------- rendering
  function renderMainLive() {
    try {
      const st = ctx.kin ? ctx.kin.update() : null;
      if (st && ctx.reg) ctx.reg.apply(st);
      stage.root.updateMatrixWorld(true);
    } catch (e) { if (S.errors++ < 3) console.error('[box] main update', e); }
    const ac = renderer.autoClear;
    renderer.autoClear = true;
    renderer.setRenderTarget(null);
    stage.render();
    renderer.autoClear = ac;
  }

  function renderFrame() {
    const now = performance.now();
    // idle: draw only when a hand steps (a Spring Drive glides: 30 fps), or something moves —
    // the wallpaper may run on two displays at once
    const idleGap = S.smooth ? 31 : 250;
    if (!S.dirty && !S.animating && !S.beatChanged && now - S.lastRender < idleGap) return;
    renderer.getDrawingBufferSize(_size);
    if (backdrop.width !== (_size.x | 0) || backdrop.height !== (_size.y | 0)) S.needSnap = true;

    const prevAuto = renderer.autoClear;
    const prevInfo = renderer.info.autoReset;
    renderer.info.autoReset = false;
    renderer.info.reset();
    const veilLive = S.live && (T.veil.v < 0.999 || S.needSnap);
    let mainDrawn = false;
    if (S.needSnap || veilLive) {
      renderMainLive();
      mainDrawn = true;
      backdrop.capture();
      if (S.needSnap) { backdrop.blur(); S.needSnap = false; }
    }
    if (S.live && T.veil.v >= 0.999 && S.phase !== 'sink' && S.phase !== 'enter') S.live = false;
    renderer.autoClear = false;
    const dim = T.veil.v;
    if (mainDrawn && veilLive) backdrop.draw({ blur: dim, dim, live: true, alpha: 1 });
    else backdrop.draw({ blur: dim, dim, live: false, alpha: 1 });

    // shadows: when something moves, or the hands step
    const key = rig.userData.key;
    const shadowDue = S.animating || S.beatChanged || now - S.lastShadow > 400;
    key.shadow.needsUpdate = shadowDue;
    if (shadowDue) S.lastShadow = now;

    renderer.clearDepth();
    flyGroup.visible = false;
    if (T.cover.v < 0.999) renderer.render(scene, cam);
    key.shadow.needsUpdate = false;
    if (T.cover.v > 0.001) backdrop.draw({ blur: dim, dim, live: false, alpha: T.cover.v });
    if (S.picking) {
      renderer.clearDepth();
      const g = boxEntry.parts.group;
      g.visible = false;
      flyGroup.visible = true;
      renderer.render(scene, cam);
      g.visible = true;
      flyGroup.visible = false;
    }
    if (T.fade.v > 0) backdrop.drawFade(T.fade.v);
    renderer.autoClear = prevAuto;
    S.stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    renderer.info.autoReset = prevInfo;
    S.lastRender = now;
    S.dirty = false;
    S.beatChanged = false;
  }

  // ---------------------------------------------------------------- teardown
  function finish(picked) {
    S.active = false;
    S.phase = 'idle';
    listen(false);
    if (stage.controls) stage.controls.enabled = prevControls;
    canvas.style.cursor = prevCursor;
    try { disposeAll(); } catch (e) { console.error('[box] dispose', e); }
    if (overlay) {
      const ov = overlay;
      overlay = null;
      if (picked) {
        // reveal the new wallpaper once the main loop has drawn it (double rAF), with a
        // timer as a fallback for throttled / hidden pages
        ov.releaseUI();
        const dur = S.reduced ? 0.25 : 0.7;
        let started = false;
        const reveal = () => {
          if (started) return;
          started = true;
          ov.fadeTo(0, dur);
          setTimeout(() => ov.remove(), dur * 1000 + 150);
        };
        requestAnimationFrame(() => requestAnimationFrame(reveal));
        setTimeout(reveal, 400);
      } else ov.remove();
    }
    try { window.dispatchEvent(new CustomEvent('watchbox:close', { detail: { picked: !!picked } })); } catch { /* ignore */ }
  }

  function disposeAll() {
    for (const s of slots) {
      if (s.built) {
        const g = new Set(), m = new Set(), t = new Set();
        collectResources(s.built.root, g, m, t);
        disposeResources(g, m, t, keepMats);
        s.built.reg.clear?.(keepMats);
      }
      for (const m of s.bandMats) m.dispose();
      s.cushionMat.dispose();
      s.group.parent?.remove(s.group);
    }
    slots = [];
    for (const geos of bandGeoCache.values()) for (const g of Object.values(geos)) g?.dispose?.();
    bandGeoCache = new Map();
    disposeCushions();
    if (boxEntry) {
      releaseGeometries(boxEntry.parts.group);
      boxEntry.blobTex.dispose();
      boxEntry.foilTex.dispose();
      boxEntry.parts.group.parent?.remove(boxEntry.parts.group);
    }
    const mats = CACHE.mats;
    if (mats) for (const t of mats.tex) t.dispose();
    if (scene) {
      const warm = scene.userData.warm;
      warm?.userData.tiny?.dispose();
      rig?.traverse((o) => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.dispose(); });
      scene.clear();
    }
    backdrop?.dispose();
    backdrop = null;
    scene = null;
    rig = null;
    flyGroup = null;
  }

  function hardReset() {
    try { listen(false); } catch { /* ignore */ }
    S.active = false;
    S.phase = 'idle';
    if (stage.controls) stage.controls.enabled = prevControls;
    try { canvas.style.cursor = prevCursor; } catch { /* ignore */ }
    try { disposeAll(); } catch { /* ignore */ }
    try { overlay?.remove(); } catch { /* ignore */ }
    overlay = null;
  }

  function fail(e) {
    console.error('[box] error — closing the watch box', e);
    hardReset();
  }

  return {
    get active() { return S.active; },
    open,
    close,
    update(dt) {
      if (!S.active) return;
      try { step(dt); } catch (e) { fail(e); }
    },
    render() {
      if (!S.active) return;
      try { renderFrame(); } catch (e) { fail(e); }
    },
    // development / debugging aid (not part of the contract)
    get _debug() {
      return {
        S, T, slots, cam, scene, fits, box: boxEntry, setPhase,
        stats: () => S.stats,
        builds: () => slots.filter((s) => s.built).map((s) => ({ id: s.watch.id, ms: Math.round(s.built.ms) })),
      };
    },
  };
}

export { lerp };
