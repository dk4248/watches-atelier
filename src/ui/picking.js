import * as THREE from 'three';
import { isShown } from './util.js';

// Pointer picking on the 3D watch: hover (at most one raycast per frame), click to
// select (a drag that orbits the camera is not a click), and winding the crown by
// dragging it. Glass is skipped so you can click through the crystal / case back;
// in X-ray mode the translucent plates are skipped too.

const SKIP_IDS = new Set(['crystal', 'caseback-glass']);
const CLICK_SLOP = 6; // px
const CLICK_MS = 700;

export function createPicker(ctx, deps) {
  const { stage, root, reg, kin } = ctx;
  const canvas = stage.renderer.domElement;
  const host = canvas.parentElement || canvas;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hits = [];
  const meshes = [];
  const live = [];
  let meshesAt = -1e9;
  let enabled = true;
  let pending = false;
  let hx = 0;
  let hy = 0;
  let hoverId = null;
  let down = null;
  let crown = null;

  // noPick may sit on a group (e.g. a glass assembly), so check the ancestors too.
  function noPick(o) {
    for (let a = o; a && a !== root; a = a.parent) if (a.userData && a.userData.noPick) return true;
    return false;
  }
  function collect() {
    meshes.length = 0;
    root.traverse((o) => { if (o.isMesh && !noPick(o)) meshes.push(o); });
    meshesAt = performance.now();
  }

  // The canvas fills the fixed #stage, so its rect only changes on resize; caching it
  // avoids a forced layout on every hover raycast.
  let rect = null;
  window.addEventListener('resize', () => { rect = null; });

  function pickAt(clientX, clientY) {
    if (performance.now() - meshesAt > 2500) collect();
    if (!meshes.length) return null;
    if (!rect || !rect.width || !rect.height) rect = canvas.getBoundingClientRect();
    const r = rect;
    if (!r.width || !r.height) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    stage.camera.updateMatrixWorld();
    ray.setFromCamera(ndc, stage.camera);
    live.length = 0;
    const xr = reg.xray;
    for (const m of meshes) {
      const id = m.userData.partId;
      if (!id || SKIP_IDS.has(id)) continue;
      if (m.material && m.material.visible === false) continue;
      if (xr) {
        const p = reg.byId.get(id);
        if (p && p.xray) continue;
      }
      if (!isShown(m)) continue;
      live.push(m);
    }
    hits.length = 0;
    try { ray.intersectObjects(live, false, hits); } catch { return null; }
    return hits.length ? hits[0].object.userData.partId || null : null;
  }

  function setHover(id) {
    if (id === hoverId) return;
    hoverId = id;
    canvas.style.cursor = id ? (id === 'crown' && deps.canWind() ? 'grab' : 'pointer') : '';
    deps.onHover(id, hx, hy);
  }

  // Capture phase on the canvas' parent: runs before OrbitControls' own pointerdown,
  // so a drag that starts on the crown can switch orbiting off first.
  host.addEventListener('pointerdown', (e) => {
    if (!enabled || e.button > 0 || e.target !== canvas) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    if (deps.canWind() && pickAt(e.clientX, e.clientY) === 'crown') {
      crown = { x: e.clientX, y: e.clientY };
      stage.controls.enabled = false;
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      deps.onCrownDrag(true);
    }
  }, { capture: true });

  window.addEventListener('pointermove', (e) => {
    if (crown) {
      const dx = e.clientX - crown.x;
      const dy = e.clientY - crown.y;
      crown.x = e.clientX;
      crown.y = e.clientY;
      const d = Math.max(dx, -dy); // rightward or upward winds
      if (d > 0) kin.wind(d * 0.02);
      if (down) down.moved += Math.abs(dx) + Math.abs(dy);
      return;
    }
    if (down) {
      down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
      return;
    }
    if (e.target === canvas && e.pointerType === 'mouse') {
      pending = true;
      hx = e.clientX;
      hy = e.clientY;
      deps.onPointer(hx, hy);
    }
  }, { passive: true });

  function endCrown() {
    if (!crown) return;
    crown = null;
    stage.controls.enabled = deps.controlsAllowed();
    canvas.style.cursor = hoverId ? 'pointer' : '';
    deps.onCrownDrag(false);
  }

  window.addEventListener('pointerup', (e) => {
    endCrown();
    const d = down;
    down = null;
    if (!d || !enabled) return;
    const moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y));
    if (moved > CLICK_SLOP || performance.now() - d.t > CLICK_MS) return;
    if (e.target !== canvas) return;
    deps.onClick(pickAt(e.clientX, e.clientY));
  });
  window.addEventListener('pointercancel', () => { endCrown(); down = null; });
  canvas.addEventListener('pointerleave', () => { pending = false; if (!crown) setHover(null); });

  // Once per frame (after the registry moved the parts).
  function frame() {
    if (!pending || !enabled || down) return;
    pending = false;
    setHover(pickAt(hx, hy));
  }

  return {
    frame,
    pickAt,
    invalidate() { meshesAt = -1e9; rect = null; },
    // new parts (watch rebuilt): forget meshes, hover and any press in progress
    reset() {
      meshes.length = 0;
      hits.length = 0;
      live.length = 0;
      meshesAt = -1e9;
      rect = null;
      pending = false;
      endCrown();
      down = null;
      setHover(null);
    },
    setEnabled(on) {
      enabled = !!on;
      rect = null; // canvas size / fit may have changed (recording)
      if (!enabled) { pending = false; endCrown(); down = null; setHover(null); }
    },
    get hoverId() { return hoverId; },
    get dragging() { return !!crown; },
  };
}
