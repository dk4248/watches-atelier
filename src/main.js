import * as THREE from 'three';
import { createStage } from './core/stage.js';
import { createMaterials, textTexture, planarUV } from './core/materials.js';
import { createKinematics } from './core/kinematics.js';
import { createRegistry, collectResources, disposeResources } from './core/registry.js';
import * as gear from './geom/gear.js';
import { WATCHES, getWatch, DEFAULT_WATCH } from './watches/index.js';
import { createUI } from './ui/ui.js';
import { createWatchBox } from './box/box.js';

const STORE_KEY = 'watch.current';

async function loadFonts() {
  const faces = ['300 40px Jost', '400 40px Jost', '500 40px Jost', '600 40px Jost', '400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"'];
  try {
    await Promise.race([
      Promise.all(faces.map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fall back to system fonts */ }
}

// Which watch to show first: URL token (#…w-<id> / ?watch=<id>), then the watch
// chosen last time (the "watch of the day"), then the default.
function initialWatchId() {
  try {
    const q = new URLSearchParams(location.search).get('watch');
    if (q && WATCHES.some((w) => w.id === q)) return q;
    const tok = location.hash.replace('#', '').split('.').find((t) => t.startsWith('w-'));
    if (tok && WATCHES.some((w) => w.id === tok.slice(2))) return tok.slice(2);
  } catch { /* ignore */ }
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && WATCHES.some((w) => w.id === saved)) return saved;
  } catch { /* storage unavailable */ }
  return DEFAULT_WATCH;
}

async function start() {
  await loadFonts();
  const stage = createStage(document.getElementById('stage'));
  const M = createMaterials();
  const shared = new Set(Object.values(M).filter((m) => m && m.isMaterial));
  const first = getWatch(initialWatchId());
  const kin = createKinematics(first.spec);
  const reg = createRegistry();
  const ctx = {
    THREE, spec: first.spec, watch: first, watches: WATCHES, M, reg, root: stage.root,
    gear, textTexture, planarUV, stage, kin, lite: false, sharedMaterials: shared,
  };

  // Build a watch into the main scene (the registry and kinematics objects stay the
  // same, so everything holding them keeps working).
  function buildWatch(w) {
    reg.clear(shared);
    // anything a builder added outside a registered part
    const geos = new Set(), mats = new Set(), texs = new Set();
    for (const child of [...stage.root.children]) {
      stage.root.remove(child);
      collectResources(child, geos, mats, texs);
    }
    disposeResources(geos, mats, texs, shared);
    ctx.watch = w;
    ctx.spec = w.spec;
    kin.configure(w.spec);
    reg.setExplode(0);
    for (const [name, build] of w.builders) {
      try { build(ctx); } catch (e) { console.error(`[build:${w.id}:${name}]`, e); }
    }
    stage.root.updateMatrixWorld(true);
  }

  function selectWatch(id, { persist = true } = {}) {
    const w = getWatch(id);
    if (persist) { try { localStorage.setItem(STORE_KEY, w.id); } catch { /* ignore */ } }
    if (w === ctx.watch && reg.parts.length) return w;
    buildWatch(w);
    ui.onWatchChanged?.(w);
    return w;
  }
  ctx.selectWatch = selectWatch;

  buildWatch(first);
  const ui = createUI(ctx);
  ctx.ui = ui;
  ui.onWatchChanged?.(first);

  // The watch box ("watch of the day" picker). It renders over the main scene while open.
  const box = createWatchBox(ctx, {
    watches: WATCHES,
    current: () => ctx.watch.id,
    onPick: (id) => selectWatch(id),
  });
  ctx.box = box;
  window.__watch = { ctx, ui, box, selectWatch }; // handy for debugging in the console

  // Apparent gravity for the automatic rotor: the camera's "down" seen in the watch's
  // own frame, plus a swing impulse whenever the watch is turned quickly.
  const _down = new THREE.Vector3();
  const _inv = new THREE.Quaternion();
  let lastAz = null;
  function feedRotor(dt) {
    _inv.copy(stage.root.quaternion).invert();
    _down.set(0, -1, 0).applyQuaternion(stage.camera.quaternion).applyQuaternion(_inv);
    kin.setGravity(_down.x, _down.y);
    const p = stage.camera.position, t = stage.controls.target;
    const az = Math.atan2(p.x - t.x, p.z - t.z);
    if (lastAz !== null && dt > 0) {
      let d = az - lastAz;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      kin.addRotorImpulse(-d * 0.9);
    }
    lastAz = az;
  }

  let last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    // Lively pauses wallpapers behind fullscreen/maximised apps (pause events set
    // ui.paused); a hidden page needs no frames either. The clocks are absolute, so
    // everything is exactly right again on the next frame.
    if (document.hidden || ui.paused) { last = 0; return; }
    const minDt = ui.frameInterval ? ui.frameInterval() : 0;
    if (minDt && t - last < minDt - 1) return;
    const dt = last ? (t - last) / 1000 : 0;
    last = t;
    tick(dt);
  }
  // Debug/testing: render frames by hand (the Browser pane throttles rAF while it is
  // hidden). __watch.step(n, dtSeconds) runs n full frames, ignoring the fps cap.
  window.__watch.step = (n = 1, dt = 1 / 60) => {
    for (let i = 0; i < n; i++) tick(dt);
    return n;
  };
  function tick(dt) {
    if (box.active) {
      box.update(dt);
      box.render();
      return;
    }
    feedRotor(dt);
    const state = kin.update();
    ui.beforeRender(state);
    reg.apply(state);
    stage.root.updateMatrixWorld(true);
    ui.afterApply(state);
    stage.render();
    ui.afterRender(state);
  }
  requestAnimationFrame(frame);
}

start();
