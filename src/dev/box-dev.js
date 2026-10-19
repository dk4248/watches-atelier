// Development harness for the leather watch box.
//   node build.mjs --dev src/dev/box-dev.js  →  dist/dev-box-dev.html
// Boots a stage like main.js, builds the current watch as the wallpaper backdrop, opens
// the box straight away and re-opens it 2 s after it closes. With fewer than four
// watches in the collection the available ones are repeated so the layout can be judged.
// URL options: ?n=<slots filled>  ?dark (dark wallpaper)  ?reduced / ?motion (force
//              reduced motion on / off)  ?noreopen  ?stats (phase / draw calls / triangles)
//              ?manual (no rAF loop: drive it with __box.step(seconds, fps))
// Console: window.__box = { box, ctx, debug(), open(), close(), step(), hover(), click() }
import * as THREE from 'three';
import { createStage } from '../core/stage.js';
import { createMaterials, textTexture, planarUV } from '../core/materials.js';
import { createKinematics } from '../core/kinematics.js';
import { createRegistry, collectResources, disposeResources } from '../core/registry.js';
import * as gear from '../geom/gear.js';
import { WATCHES, getWatch, DEFAULT_WATCH } from '../watches/index.js';
import { createWatchBox } from '../box/box.js';

const params = new URLSearchParams(location.search);

// manual stepping draws outside rAF; keep the drawing buffer so screenshots see it (dev only)
if (params.has('manual')) {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, attrs) {
    if (type === 'webgl2' || type === 'webgl') attrs = { ...(attrs || {}), preserveDrawingBuffer: true };
    return orig.call(this, type, attrs);
  };
}

if (params.has('reduced') || params.has('motion')) {
  const want = params.has('reduced');
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/prefers-reduced-motion/.test(q)
    ? { matches: want, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
    : mm(q));
}

async function main() {
  try {
    await Promise.race([
      Promise.all(['300 40px Jost', '400 40px Jost', '500 40px Jost', '400 20px "JetBrains Mono"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* system fonts */ }
  document.documentElement.style.setProperty('--font-sans', "'Jost', 'Segoe UI', system-ui, sans-serif");
  document.documentElement.style.setProperty('--font-mono', "'JetBrains Mono', Consolas, monospace");

  const stage = createStage(document.getElementById('stage'));
  const M = createMaterials();
  const shared = new Set(Object.values(M).filter((m) => m && m.isMaterial));
  const first = getWatch(params.get('watch') || DEFAULT_WATCH);
  const kin = createKinematics(first.spec);
  const reg = createRegistry();
  const ctx = {
    THREE, spec: first.spec, watch: first, watches: WATCHES, M, reg, root: stage.root,
    gear, textTexture, planarUV, stage, kin, lite: false, sharedMaterials: shared,
  };
  const dark = params.has('dark');

  function buildWatch(w) {
    reg.clear(shared);
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
    const th = w.theme?.[dark ? 'dark' : 'light'] || { bg: dark ? ['#0e131c', '#1b2433'] : ['#f2f3f5', '#d5d9df'] };
    stage.setBackground(th.bg[0], th.bg[1]);
  }
  buildWatch(first);
  stage.camera.position.set(0, -12, 108);
  stage.controls.target.set(0, -1, 0);
  stage.controls.update();

  const n = Math.max(0, Math.min(8, Number(params.get('n') ?? 4)));
  const list = [];
  for (let i = 0; i < n; i++) if (WATCHES.length) list.push(WATCHES[i % WATCHES.length]);
  // ?straps=leather,bracelet:titanium,fabric,bracelet:steel — try other band kinds (dev only)
  const straps = (params.get('straps') || '').split(',').filter(Boolean);
  straps.forEach((spec, i) => {
    if (!list[i]) return;
    const [kind, material] = spec.split(':');
    const colours = { leather: '#5a3420', fabric: '#2d3b4f', bracelet: undefined };
    list[i] = { ...list[i], strap: { ...(list[i].strap || {}), kind, material, color: colours[kind], stitch: kind === 'leather' ? '#efe4cf' : undefined } };
  });

  const picks = [];
  const box = createWatchBox(ctx, {
    watches: list,
    current: () => ctx.watch.id,
    onPick: (id) => {
      const t0 = performance.now();
      const w = getWatch(id);
      if (w !== ctx.watch) buildWatch(w);
      picks.push({ id, ms: Math.round(performance.now() - t0) });
      console.log('[box-dev] picked', id, `(main scene rebuilt in ${Math.round(performance.now() - t0)} ms)`);
    },
  });
  ctx.box = box;

  let stats = null;
  if (params.has('stats')) {
    stats = document.createElement('pre');
    stats.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;z-index:100;font:11px/1.35 monospace;color:#fff;background:rgba(0,0,0,.55);padding:6px 8px;pointer-events:none';
    document.body.appendChild(stats);
  }

  let reopenAt = 0;
  const reopen = !params.has('noreopen');
  const manual = params.has('manual');
  let simT = 0;
  // synthetic pointer events on the canvas (CSS px)
  const fire = (type, x, y, extra = {}) => stage.renderer.domElement.dispatchEvent(new PointerEvent(type, {
    clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'mouse', pointerId: 1, isPrimary: true, ...extra,
  }));
  window.__box = {
    box, ctx, picks,
    debug: () => box._debug,
    open: () => box.open(),
    close: () => box.close(),
    // advance the loop by `sec` seconds at `fps` (manual mode or for deterministic tests)
    step(sec = 1, fps = 60) {
      const n = Math.max(1, Math.round(sec * fps));
      for (let i = 0; i < n; i++) {
        simT += 1000 / fps;
        if (i === n - 1 && box.active) box._debug.S.dirty = true; // make sure the last frame is drawn
        frame(simT, true);
      }
      return box.active ? box._debug.S.phase : 'closed';
    },
    hover(x, y) { fire('pointermove', x, y); },
    click(x, y, type = 'mouse') { fire('pointermove', x, y, { pointerType: type }); fire('pointerdown', x, y, { pointerType: type }); fire('pointerup', x, y, { pointerType: type }); },
    key(k) { window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); },
  };

  box.open();

  let last = 0, frames = 0, fpsT = 0, fps = 0;
  function frame(t, sim = false) {
    if (!sim && !manual) requestAnimationFrame(frame);
    if (!sim && manual) {
      // manual mode: keep presenting the current state (no time advance) so resizes and
      // screenshots always see a drawn canvas
      requestAnimationFrame(frame);
      if (box.active) { box._debug.S.dirty = true; box.render(); } else stage.render();
      return;
    }
    const dt = last ? Math.max(0, (t - last) / 1000) : 0;
    last = t;
    frames++;
    if (t - fpsT > 1000) { fps = (frames * 1000) / (t - fpsT); frames = 0; fpsT = t; }
    if (box.active) {
      box.update(dt);
      box.render();
      reopenAt = 0;
    } else {
      const state = kin.update();
      reg.apply(state);
      stage.root.updateMatrixWorld(true);
      stage.controls.update();
      stage.render();
      if (reopen) {
        if (!reopenAt) reopenAt = t + 2000;
        else if (t >= reopenAt) { reopenAt = 0; box.open(); }
      }
    }
    if (stats && (frames % 10 === 0)) {
      const d = box._debug;
      const st = d.stats?.() || {};
      stats.textContent = [
        `box ${box.active ? d.S.phase : 'closed'}  fps ${fps.toFixed(0)}`,
        `draw calls ${st.calls ?? '-'}  triangles ${st.triangles ?? '-'}`,
        `builds ${JSON.stringify(d.builds?.() || [])}`,
        `picks ${JSON.stringify(picks)}`,
      ].join('\n');
    }
  }
  if (manual) { simT = performance.now(); last = simT; }
  requestAnimationFrame(frame);
}

main();
