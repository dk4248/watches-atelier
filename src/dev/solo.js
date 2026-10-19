// Development harness: renders only the given part builders so each module can be
// inspected on its own. Built with `node build.mjs --solo case,dial` →
// dist/solo-case-dial.html. Views via the URL hash:
//   #front  #back  #side  #iso  #top (looking down at 12)  #explode  #xray  #slow
//   combine with dots: #back.explode.xray
//   #focus-<partId>  frame one registered part (e.g. #focus-balance-wheel.back)
// Console / javascript_tool API: window.__solo.view('back'), .explode(0..1),
//   .focus('escape-wheel', 'back'), .xray(true), .parts() → list of registered ids,
//   .timeScale(0.05)
import * as THREE from 'three';
import { createStage } from '../core/stage.js';
import { createMaterials, textTexture, planarUV } from '../core/materials.js';
import { createKinematics } from '../core/kinematics.js';
import { createRegistry } from '../core/registry.js';
import * as gear from '../geom/gear.js';

// watch: a descriptor from src/watches/*/index.js; builders: [name, fn] pairs to run
export async function runSolo(watch, builders) {
  const SPEC = watch.spec;
  try { await document.fonts.ready; } catch { /* ignore */ }
  const host = document.getElementById('stage');
  const stage = createStage(host);
  stage.setBackground('#eceef1', '#c9ccd1');
  const M = createMaterials();
  const kin = createKinematics(SPEC);
  const reg = createRegistry();
  const lite = new URLSearchParams(location.search).has('lite');
  const ctx = { THREE, spec: SPEC, watch, M, reg, root: stage.root, gear, textTexture, planarUV, stage, kin, lite };
  const errors = [];
  for (const [name, build] of builders) {
    try { build(ctx); } catch (e) { errors.push(`${name}: ${e.message}`); console.error(e); }
  }

  const info = document.createElement('pre');
  info.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;font:11px/1.35 monospace;color:#123;background:rgba(255,255,255,.75);padding:6px 8px;max-height:96vh;overflow:auto;z-index:5;pointer-events:none';
  document.body.appendChild(info);

  const views = {
    front: [0, -18, 95], back: [0, -18, -95], side: [110, 0, 0], iso: [60, -55, 70],
    isoBack: [60, -55, -70], top: [0, 110, 4], explode: [120, 35, -90],
  };
  let explodeTarget = 0, explode = 0;
  function view(name, dist) {
    const v = views[name] || views.front;
    const d = dist || Math.hypot(...v);
    const dir = new THREE.Vector3(...v).normalize();
    stage.controls.target.set(0, 0, 0);
    stage.camera.position.copy(dir.multiplyScalar(d));
    stage.camera.up.set(0, 1, 0);
    if (name === 'top') stage.camera.up.set(0, 0, 1);
  }
  function focus(id, side = 'back') {
    const p = reg.byId.get(id);
    if (!p) return `no part ${id}`;
    stage.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(p.object);
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(1.5, box.getSize(new THREE.Vector3()).length() / 2);
    const dir = new THREE.Vector3(...(views[side] || views.back)).normalize();
    stage.controls.target.copy(c);
    stage.camera.position.copy(c).addScaledVector(dir, r * 4.2);
    return `focused ${id} r=${r.toFixed(2)}`;
  }
  function applyHash() {
    const tokens = location.hash.replace('#', '').split('.').filter(Boolean);
    const viewName = tokens.find((t) => views[t]) || 'iso';
    view(viewName);
    explodeTarget = tokens.includes('explode') ? 1 : 0;
    reg.setXray(tokens.includes('xray'));
    if (tokens.includes('slow')) kin.setTimeScale(0.05); else kin.goLive();
    const f = tokens.find((t) => t.startsWith('focus-'));
    if (f) focus(f.slice(6), views[viewName] ? viewName : 'back');
  }
  window.addEventListener('hashchange', applyHash);
  applyHash();

  window.__solo = {
    ctx,
    view: (n, d) => { view(n, d); return n; },
    explode: (e) => { explodeTarget = e; explode = e; return e; },
    focus,
    xray: (on) => { reg.setXray(on); return on; },
    timeScale: (s) => { kin.setTimeScale(s); return s; },
    parts: () => reg.parts.map((p) => p.id),
    // Render frames by hand (the Browser pane throttles requestAnimationFrame while
    // it is hidden): __solo.step() draws one frame now, step(30) draws 30.
    step: (count = 1) => { for (let i = 0; i < count; i++) tick(); return count; },
  };

  let n = 0;
  function frame() {
    requestAnimationFrame(frame);
    tick();
  }
  function tick() {
    explode += (explodeTarget - explode) * 0.08;
    if (Math.abs(explodeTarget - explode) < 1e-3) explode = explodeTarget;
    reg.setExplode(explode);
    const s = kin.update();
    reg.apply(s);
    stage.controls.update();
    stage.render();
    if (n++ % 15 === 0) {
      const t = s.date;
      info.textContent = [
        `SOLO ${watch.id}: ${builders.map((b) => b[0]).join(', ')}${lite ? ' (lite)' : ''} — ${t.toLocaleTimeString()} — beat ${Math.floor(s.P)} — fork ${((s.fork || 0) * 57.3).toFixed(1)}° — balance ${((s.balance || 0) * 57.3).toFixed(0)}° — rotor ${((s.rot.rotor || 0) * 57.3).toFixed(0)}°`,
        `draw calls ${stage.renderer.info.render.calls}, triangles ${stage.renderer.info.render.triangles}`,
        errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no build errors',
        `${reg.parts.length} parts:`,
        ...reg.parts.map((p) => `  ${p.id} [${p.category}/${p.side}${p.exposed ? '' : ', hidden'}] ${p.name}`),
      ].join('\n');
    }
  }
  frame();
}
