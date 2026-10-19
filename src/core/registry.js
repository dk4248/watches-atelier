import * as THREE from 'three';

// Every labelled, explodable, animated piece of the watch is registered here.
//
// Part definition:
//   id           unique string, e.g. 'escape-wheel'
//   name         display name, e.g. 'Escape wheel'
//   category     'case' | 'dial' | 'hands' | 'motion' | 'train' | 'power' | 'escapement'
//                | 'regulating' | 'keyless' | 'frame' | 'jewels' | 'screws'
//   side         'front' | 'back' | 'both' — which face of the watch it is seen from
//   object       THREE.Object3D placed at its assembled position (its parent is a
//                group from ctx.groups). Explode moves this object.
//   rotor        optional child Object3D that the kinematics rotate (rotation.z)
//   drive        optional { key, sign = 1, phase = 0 } — rotor.rotation.z =
//                sign * state.rot[key] + phase
//   explode      [dx, dy, dz] offset in mm at full explosion (default [0,0,0])
//   explodeDelay 0..1, when this part starts moving in the explode animation
//   anchor       [x, y, z] in `object` local space where the label leader points
//   description  1–3 plain-English sentences about what the part does
//   facts        { 'Teeth': '75', ... } static specs shown in the info panel
//   live         optional (state) => string, live readout (e.g. rpm, angle)
//   label        false to never show a label (default true)
//   priority     1 (always label) .. 3 (only when zoomed / exploded); default 2
//   xray         true for parts that turn translucent in X-ray mode (plates, bridges)
//   exposed      false if the part cannot be seen from its `side` when the watch is
//                assembled (e.g. train wheels under the 3/4 plate, motion works under
//                the dial). Labels for unexposed parts appear only in X-ray / exploded.
//   update       optional (state, part) => void, custom per-frame animation
// Gather every geometry / material / texture used under `root`.
export function collectResources(root, geos, mats, texs) {
  root.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of list) {
      mats.add(m);
      for (const v of Object.values(m)) if (v && v.isTexture) texs.add(v);
    }
  });
}

// Dispose collected resources, skipping anything in `keep` (shared materials and
// their textures). Disposed resources are re-uploaded automatically if reused.
export function disposeResources(geos, mats, texs, keep = new Set()) {
  const keepTex = new Set();
  for (const m of keep) for (const v of Object.values(m)) if (v && v.isTexture) keepTex.add(v);
  for (const g of geos) g.dispose();
  for (const m of mats) if (!keep.has(m)) m.dispose();
  for (const t of texs) if (!keepTex.has(t)) t.dispose();
}

// Material helpers that also accept material arrays (multi-material meshes).
const cloneMat = (m) => (Array.isArray(m) ? m.map((x) => x.clone()) : m.clone());
const disposeMat = (m) => { if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m.dispose(); };
const eachMat = (m, fn) => { if (Array.isArray(m)) m.forEach(fn); else fn(m); };

export function createRegistry() {
  const parts = [];
  const byId = new Map();
  const updaters = [];
  let explodeAmount = 0;
  let xrayOn = false;
  let highlighted = null;
  const _v = new THREE.Vector3();

  function add(def) {
    if (!def.id || !def.object) throw new Error('registerPart needs id and object');
    if (byId.has(def.id)) throw new Error(`duplicate part id ${def.id}`);
    const p = {
      side: 'both', category: 'misc', label: true, priority: 2, explodeDelay: 0, exposed: true,
      facts: {}, description: '', ...def,
    };
    p.base = p.object.position.clone();
    p.explodeVec = new THREE.Vector3().fromArray(p.explode || [0, 0, 0]);
    p.anchorVec = new THREE.Vector3().fromArray(p.anchor || [0, 0, 0]);
    p.object.traverse((o) => {
      o.userData.partId = p.id;
      if (o.isMesh) {
        o.castShadow = o.castShadow !== false;
        o.receiveShadow = o.receiveShadow !== false;
      }
    });
    parts.push(p);
    byId.set(p.id, p);
    return p;
  }

  function onUpdate(fn) { updaters.push(fn); }

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function setExplode(e) { explodeAmount = e; }

  function applyExplode() {
    for (const p of parts) {
      const local = Math.min(1, Math.max(0, (explodeAmount - p.explodeDelay * 0.45) / 0.55));
      p.object.position.copy(p.base).addScaledVector(p.explodeVec, ease(local));
    }
  }

  function apply(state) {
    applyExplode();
    for (const p of parts) {
      if (p.rotor && p.drive) {
        const v = state.rot[p.drive.key];
        if (v !== undefined) p.rotor.rotation.z = (p.drive.sign ?? 1) * v + (p.drive.phase ?? 0);
      }
      if (p.update) p.update(state, p);
    }
    for (const fn of updaters) fn(state);
  }

  // World-space position of a part's label anchor.
  function anchorWorld(p, target = _v) {
    return target.copy(p.anchorVec).applyMatrix4(p.object.matrixWorld);
  }

  // --- X-ray: plates and bridges become translucent so the train shows through.
  const xrayCache = new Map();
  function setXray(on) {
    const hl = highlighted;
    highlight(null);
    xrayOn = on;
    for (const p of parts) {
      if (!p.xray) continue;
      p.object.traverse((o) => {
        if (!o.isMesh) return;
        if (!xrayCache.has(o)) xrayCache.set(o, o.material);
        if (on) {
          if (o.material !== xrayCache.get(o)) return; // already translucent
          const m = cloneMat(xrayCache.get(o));
          eachMat(m, (x) => { x.transparent = true; x.opacity = 0.18; x.depthWrite = false; });
          o.material = m;
          o.castShadow = false;
        } else {
          if (o.material !== xrayCache.get(o)) disposeMat(o.material);
          o.material = xrayCache.get(o);
          o.castShadow = true;
        }
      });
    }
    highlight(hl);
  }

  // --- Highlight: tint a part's meshes while hovered / selected.
  const hlCache = new Map();
  function highlight(id) {
    if (highlighted === id) return;
    if (highlighted) {
      const prev = byId.get(highlighted);
      prev?.object.traverse((o) => {
        if (o.isMesh && hlCache.has(o)) { disposeMat(o.material); o.material = hlCache.get(o); hlCache.delete(o); }
      });
    }
    highlighted = id;
    const p = id && byId.get(id);
    if (!p) return;
    p.object.traverse((o) => {
      if (!o.isMesh || !o.material || o.userData.noHighlight) return;
      hlCache.set(o, o.material);
      const m = cloneMat(o.material);
      eachMat(m, (x) => {
        if ('emissive' in x) {
          x.emissive = new THREE.Color(0xff7a2f);
          x.emissiveIntensity = 0.35;
        }
      });
      o.material = m;
    });
  }

  function setCategoryVisible(category, visible) {
    for (const p of parts) if (p.category === category) p.object.visible = visible;
  }

  // Remove every part (switching watches). GPU resources are released, except the
  // shared library materials/textures passed in `keep` (a Set) — they are reused by
  // the next watch. The parts array and byId map are emptied in place, so code that
  // holds references to them keeps working.
  function clear(keep = new Set()) {
    highlight(null);
    if (xrayOn) setXray(false);
    xrayOn = false;
    const geos = new Set(), mats = new Set(), texs = new Set();
    for (const p of parts) {
      p.object.parent?.remove(p.object);
      collectResources(p.object, geos, mats, texs);
    }
    disposeResources(geos, mats, texs, keep);
    parts.length = 0;
    byId.clear();
    updaters.length = 0;
    xrayCache.clear();
    hlCache.clear();
  }

  return {
    parts, byId, add, onUpdate, apply, setExplode, anchorWorld, setXray, highlight,
    setCategoryVisible, clear,
    get explode() { return explodeAmount; },
    get xray() { return xrayOn; },
    get highlighted() { return highlighted; },
  };
}
