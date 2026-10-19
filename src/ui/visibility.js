import { smoothstep } from './util.js';

// Per-watch visibility rules from the watch descriptor:
//   explodeHide    parts that are not part of the mechanism (strap, buckle, bracelet…):
//                  they fade out as the watch explodes past ~15 % and come back when
//                  it reassembles
//   solidCaseback  a solid case back would hide the movement: it fades out in the
//                  movement views, in X-ray and when exploded, and stays on the dial side
//
// Fading needs per-mesh opacity, so each affected mesh gets a private clone of its
// material when the watch is built (shared library materials are never touched; the
// clone is attached to the mesh, so the registry disposes it with the watch). The
// highlight / X-ray code of the registry swaps materials temporarily and restores
// whatever was attached, i.e. our clone, so the two cooperate.

const FADE_IN_EX = 0.1; // explode amount where explodeHide parts start fading…
const FADE_OUT_EX = 0.28; // …and are gone
const BACK_FADE_S = 0.32; // case back fade time

export function createPartRules(ctx) {
  const { reg } = ctx;
  let fades = []; // explodeHide entries
  let back = null; // solid case back entry

  function prepare(p) {
    const meshes = [];
    p.object.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const mat = o.material.clone();
      o.material = mat;
      meshes.push({ mesh: o, mat, opacity: mat.opacity, transparent: mat.transparent, cast: o.castShadow });
    });
    return { part: p, meshes, k: 0 };
  }

  // Called after every (re)build: the previous entries point at disposed parts.
  function setWatch(w) {
    fades = [];
    back = null;
    if (!w) return;
    const seen = new Set();
    for (const id of Array.isArray(w.explodeHide) ? w.explodeHide : []) {
      const p = reg.byId.get(id);
      if (!p || seen.has(id)) continue;
      seen.add(id);
      fades.push(prepare(p));
    }
    const cb = w.solidCaseback ? reg.byId.get(w.solidCaseback) : null;
    if (cb && !seen.has(cb.id)) back = prepare(cb);
  }

  function setFade(f, k, caseOn) {
    const p = f.part;
    const visible = (p.category !== 'case' || caseOn) && k < 0.995;
    if (p.object.visible !== visible) p.object.visible = visible;
    if (k === f.k) return;
    const was = f.k > 0;
    const now = k > 0;
    f.k = k;
    for (const m of f.meshes) {
      m.mat.opacity = m.opacity * (1 - k);
      if (now !== was) {
        // switching between the opaque and the transparent pass needs a program refresh
        m.mat.transparent = now || m.transparent;
        m.mat.needsUpdate = true;
        m.mesh.castShadow = now ? false : m.cast;
      }
    }
  }

  // Once per frame, before rendering. s = { dt, caseOn, explode, hideBack }
  function update(s) {
    if (fades.length) {
      const k = smoothstep(FADE_IN_EX, FADE_OUT_EX, s.explode);
      for (const f of fades) setFade(f, k, s.caseOn);
    }
    if (back) {
      const target = s.hideBack ? 1 : 0;
      let k = back.k;
      if (k !== target) {
        const step = s.dt > 0 ? s.dt / BACK_FADE_S : 1;
        k = target > k ? Math.min(target, k + step) : Math.max(target, k - step);
      }
      setFade(back, k, s.caseOn);
    }
  }

  return {
    setWatch,
    update,
    get hasCaseback() { return !!back; },
  };
}
