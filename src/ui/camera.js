import * as THREE from 'three';
import { DEG, TAU, clamp, lerp, smoothstep, easeInOut, reducedMotion } from './util.js';

// Camera rig.
//
// A pose is described in the watch frame (root-local): a target point plus a
// direction given as azimuth/elevation around the watch and a distance.
//   az = 0   → camera on +Z (looking at the dial)      az = 180° → camera on −Z (movement)
//   az > 0   → camera swings towards +X (the crown)     el > 0    → camera above (12 o'clock side)
// Interpolating az/el/log(dist) gives smooth spherical moves around the target
// instead of straight-line cuts through the watch.

const UP = new THREE.Vector3(0, 1, 0);
// Never part of the hero framing (the band would make the head a small object).
const STRAP_IDS = new Set(['strap-top', 'strap-bottom', 'buckle', 'spring-bars', 'bracelet', 'clasp']);
const MIN_HEAD = new THREE.Box3(new THREE.Vector3(-16, -16, -3), new THREE.Vector3(16, 16, 4));
const DEFAULT_EXPLODED = new THREE.Box3(new THREE.Vector3(-18, -18, -60), new THREE.Vector3(18, 18, 50));
const LIMIT = new THREE.Box3(new THREE.Vector3(-150, -150, -150), new THREE.Vector3(150, 150, 150));

export function makePose() {
  return { target: new THREE.Vector3(), az: 0, el: 0, dist: 120 };
}
export function copyPose(d, s) {
  d.target.copy(s.target); d.az = s.az; d.el = s.el; d.dist = s.dist;
  return d;
}
export function lerpPose(out, a, b, k) {
  out.target.lerpVectors(a.target, b.target, k);
  out.az = lerp(a.az, b.az, k);
  out.el = lerp(a.el, b.el, k);
  out.dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), k));
  return out;
}
export function dirFromAzEl(az, el, out) {
  const ce = Math.cos(el);
  return out.set(Math.sin(az) * ce, Math.sin(el), Math.cos(az) * ce);
}
// `to` shifted by whole turns so that it lies within ±180° of `from`.
export function nearestAz(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return from + d;
}

export function createCameraRig(ctx) {
  const { stage, reg, root } = ctx;
  const { camera, controls } = stage;

  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _r = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _q = new THREE.Vector3();
  const _bmin = new THREE.Vector3();
  const _bmax = new THREE.Vector3();
  const _box = new THREE.Box3();
  const _box2 = new THREE.Box3();
  const _sphere = new THREE.Sphere();

  // ---------------------------------------------------------------- content boxes
  // head     = the assembled watch without the strap (what the hero shots frame)
  // exploded = everything at full explosion
  const head = new THREE.Box3();
  const exploded = new THREE.Box3();
  // Per part: assembled box, explode offset and delay (the registry's explode easing),
  // for framing the exploded stack and placing the label columns tightly. Pooled.
  const items = [];
  let nItems = 0;
  let boxesReady = false;

  // Recomputed after every watch build (sizes range 35–41 mm, some on bracelets).
  // Parts the UI hides when the watch explodes (descriptor `explodeHide`, a solid case
  // back) don't count towards the exploded framing.
  function computeBoxes() {
    head.makeEmpty();
    exploded.makeEmpty();
    nItems = 0;
    root.updateMatrixWorld(true);
    const w = ctx.watch || {};
    const hideEx = new Set(Array.isArray(w.explodeHide) ? w.explodeHide : []);
    if (w.solidCaseback) hideEx.add(w.solidCaseback);
    for (const p of reg.parts) {
      try { _box.setFromObject(p.object); } catch { continue; }
      if (_box.isEmpty() || !Number.isFinite(_box.min.x + _box.max.x + _box.min.y + _box.max.y + _box.min.z + _box.max.z)) continue;
      // undo any explode offset currently applied (zero at start-up)
      _v.copy(p.base || p.object.position).sub(p.object.position);
      _box.translate(_v).intersect(LIMIT);
      if (_box.isEmpty() || STRAP_IDS.has(p.id)) continue;
      head.union(_box);
      const it = items[nItems] || (items[nItems] = { asm: new THREE.Box3(), vec: new THREE.Vector3(), delay: 0, hideEx: false });
      nItems++;
      it.asm.copy(_box);
      if (p.explodeVec) it.vec.copy(p.explodeVec); else it.vec.set(0, 0, 0);
      it.delay = p.explodeDelay || 0;
      it.hideEx = hideEx.has(p.id);
      if (it.hideEx) continue;
      _box2.copy(_box).translate(it.vec);
      exploded.union(_box2);
    }
    head.union(MIN_HEAD);
    // keep the hero framing sane even if a part registers a stray huge mesh
    head.intersect(new THREE.Box3(new THREE.Vector3(-30, -30, -16), new THREE.Vector3(30, 30, 16)));
    if (exploded.isEmpty()) exploded.copy(DEFAULT_EXPLODED);
    exploded.union(head);
    boxesReady = true;
  }
  const ensureBoxes = () => { if (!boxesReady) computeBoxes(); };

  // ---------------------------------------------------------------- fitting
  // Smallest camera distance at which every corner of `box` lies inside the
  // viewport, shrunk by margins mH / mV (fractions of the half-width / half-height).
  const safeAspect = (a) => (Number.isFinite(a) && a > 0.05 && a < 20 ? a : 16 / 9);

  // camera basis for a viewing direction: _d (towards the camera), _r (right), _u (up)
  function basis(az, el) {
    dirFromAzEl(az, el, _d);
    _r.crossVectors(UP, _d).normalize();
    _u.crossVectors(_d, _r);
  }
  function fitCorners(box, center, tanH, tanV, mH, mV, D) {
    for (let i = 0; i < 8; i++) {
      _q.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
      const x = Math.abs(_q.dot(_r));
      const y = Math.abs(_q.dot(_u));
      const z = _q.dot(_d); // towards the camera
      D = Math.max(D, x / (tanH * mH) + z, y / (tanV * mV) + z);
    }
    return D;
  }

  function fitDistance(box, center, az, el, aspect, mH = 0.8, mV = 0.8) {
    aspect = safeAspect(aspect);
    basis(az, el);
    const tanV = Math.tan((camera.fov * DEG) / 2);
    const D = fitCorners(box, center, tanV * aspect, tanV, mH, mV, 0);
    return Number.isFinite(D) && D > 0 ? D : 140;
  }

  // The exploded stack framed part by part: the corners of the overall box lie far
  // outside the actual stack of discs, which made it small on wide screens.
  function fitExploded(center, az, el, aspect, mH = 0.8, mV = 0.8) {
    ensureBoxes();
    aspect = safeAspect(aspect);
    basis(az, el);
    const tanV = Math.tan((camera.fov * DEG) / 2);
    let D = 0;
    for (let i = 0; i < nItems; i++) {
      const it = items[i];
      if (it.hideEx) continue;
      _box2.copy(it.asm).translate(it.vec);
      D = fitCorners(_box2, center, tanV * aspect, tanV, mH, mV, D);
    }
    if (!(D > 0)) return fitDistance(exploded, center, az, el, aspect, mH, mV);
    return Number.isFinite(D) ? D : 140;
  }

  // Exploded composition depends on the screen shape: landscape looks at the
  // stack from the side (it runs across the screen); portrait looks down on it
  // from above so the stack runs up the screen; super-wide screens (21:9 … 32:9)
  // look a little flatter so the stack spreads across the width.
  function explodedDir(aspect) {
    const a = safeAspect(aspect);
    const k = smoothstep(0.8, 1.25, a);
    const w = smoothstep(1.9, 3.2, a);
    return { az: (lerp(24, 64, k) + 4 * w) * DEG, el: (lerp(54, 16, k) - 7 * w) * DEG };
  }

  function viewPose(name, out, mH = 0.8, mV = 0.8, aspect = camera.aspect) {
    ensureBoxes();
    if (name === 'exploded') {
      const d = explodedDir(aspect);
      out.az = d.az;
      out.el = d.el;
      exploded.getCenter(out.target);
      out.dist = clamp(fitExploded(out.target, out.az, out.el, aspect, mH, mV), 24, 1200);
      return out;
    }
    if (name === 'movement') { out.az = 168 * DEG; out.el = 9 * DEG; }
    else { out.az = -13 * DEG; out.el = -8 * DEG; } // dial: a little from below-left
    head.getCenter(out.target);
    out.dist = clamp(fitDistance(head, out.target, out.az, out.el, aspect, mH, mV), 24, 1200);
    return out;
  }

  // Frame a single part: target its label anchor, distance from its bounding sphere.
  function focusPose(part, out) {
    readPose(out);
    reg.anchorWorld(part, _v);
    root.worldToLocal(out.target.copy(_v));
    let r = 4;
    _box.setFromObject(part.object);
    if (!_box.isEmpty()) {
      _box.getBoundingSphere(_sphere);
      r = clamp(_sphere.radius, 0.8, 45);
    }
    if (reg.explode < 0.35) {
      if (part.side === 'front') { out.az = -10 * DEG; out.el = 10 * DEG; }
      else if (part.side === 'back') { out.az = 170 * DEG; out.el = 12 * DEG; }
    }
    const half = Math.atan(Math.tan((camera.fov * DEG) / 2) * Math.min(1, safeAspect(camera.aspect)));
    out.dist = clamp((r / Math.sin(half)) * 1.5, controls.minDistance || 20, 400);
    return out;
  }

  // ---------------------------------------------------------------- pose <-> camera
  const finitePose = (p) => Number.isFinite(p.az + p.el + p.dist + p.target.x + p.target.y + p.target.z) && p.dist > 0;

  function readPose(out) {
    root.worldToLocal(out.target.copy(controls.target));
    root.worldToLocal(_w.copy(camera.position)).sub(out.target);
    out.dist = Math.max(1e-3, _w.length());
    out.az = Math.atan2(_w.x, _w.z);
    out.el = Math.asin(clamp(_w.y / out.dist, -1, 1));
    if (!finitePose(out)) { out.target.set(0, 0, 0); out.az = 0; out.el = 0; out.dist = 140; }
    return out;
  }

  function applyPose(p) {
    if (!finitePose(p)) return;
    dirFromAzEl(p.az, p.el, _d);
    _w.copy(p.target).addScaledVector(_d, p.dist);
    root.localToWorld(_w);
    camera.position.copy(_w);
    root.localToWorld(_v.copy(p.target));
    controls.target.copy(_v);
    camera.lookAt(_v);
  }

  // Clear OrbitControls' damping momentum so it doesn't fight a scripted move.
  function settleControls() {
    controls._sphericalDelta?.set(0, 0, 0);
    controls._panOffset?.set(0, 0, 0);
    if ('_scale' in controls) controls._scale = 1;
  }

  // ---------------------------------------------------------------- tweens
  const tw = { active: false, t: 0, dur: 1.2, ease: easeInOut, from: makePose(), to: makePose(), cur: makePose(), done: null };
  let userControl = true;

  // Any user input on the canvas interrupts a running tween. OrbitControls also fires
  // 'start' for a plain click (e.g. picking a part mid-flight); if the click ends
  // without having rotated, panned or zoomed anything, the flight resumes instead of
  // leaving the camera stranded half-way (say, edge-on between Dial and Movement).
  const resume = { on: false, to: makePose(), left: 0, pos: new THREE.Vector3() };
  controls.addEventListener('start', () => {
    resume.on = false;
    if (!tw.active || !userControl) return;
    resume.on = true;
    copyPose(resume.to, tw.to);
    resume.left = Math.max(0.25, tw.dur - tw.t);
    resume.pos.copy(camera.position);
    tw.active = false;
    tw.done = null;
  });
  controls.addEventListener('end', () => {
    if (!resume.on) return;
    resume.on = false;
    const sd = controls._sphericalDelta;
    const po = controls._panOffset;
    const idle = (!sd || (Math.abs(sd.theta) < 1e-6 && Math.abs(sd.phi) < 1e-6))
      && (!po || po.lengthSq() < 1e-10)
      && (controls._scale === undefined || Math.abs(controls._scale - 1) < 1e-6)
      && camera.position.distanceToSquared(resume.pos) < 1e-6;
    if (idle) tweenTo(resume.to, resume.left);
  });

  function tweenFrom(from, to, dur = 1.2, ease = easeInOut, done = null) {
    copyPose(tw.from, from);
    copyPose(tw.to, to);
    tw.to.az = nearestAz(tw.from.az, tw.to.az);
    tw.t = 0;
    tw.dur = Math.max(0.01, reducedMotion() ? Math.min(dur, 0.45) : dur);
    tw.ease = ease;
    tw.done = done;
    tw.active = true;
    if (to.dist * 1.6 > controls.maxDistance) controls.maxDistance = to.dist * 1.6;
    settleControls();
  }
  function tweenTo(to, dur, ease, done) {
    readPose(tw.cur);
    tweenFrom(tw.cur, to, dur, ease, done);
  }
  function cancel() { tw.active = false; tw.done = null; resume.on = false; }

  // Where the camera is heading: the running flight's destination, else where it is.
  function destination(out) {
    if (tw.active) return copyPose(out, tw.to);
    return readPose(out);
  }
  const remaining = () => (tw.active ? Math.max(0, tw.dur - tw.t) : 0);

  // Called once per frame while the UI (not a show) owns the camera.
  function update(dt) {
    if (tw.active) {
      tw.t += dt;
      const k = tw.ease(clamp(tw.t / tw.dur, 0, 1));
      lerpPose(tw.cur, tw.from, tw.to, k);
      applyPose(tw.cur);
      if (tw.t >= tw.dur) {
        tw.active = false;
        settleControls();
        const fn = tw.done;
        tw.done = null;
        if (fn) fn();
      }
      return;
    }
    if (userControl && controls.enabled) controls.update();
  }

  function setUserControl(on) {
    userControl = on;
    controls.enabled = on;
    if (on) settleControls();
  }

  // Screen-space bounding rect of the watch at explode amount `ex`: every part's box
  // where the registry puts it (same easing), parts hidden when exploded left out.
  const _mv = new THREE.Matrix4();
  const easeEx = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function projectBox(vw, vh, out) {
    for (let i = 0; i < 8; i++) {
      _q.set(i & 1 ? _bmax.x : _bmin.x, i & 2 ? _bmax.y : _bmin.y, i & 4 ? _bmax.z : _bmin.z).applyMatrix4(_mv);
      if (_q.z > -camera.near) continue;
      _q.applyMatrix4(camera.projectionMatrix);
      const x = ((_q.x + 1) / 2) * vw;
      const y = ((1 - _q.y) / 2) * vh;
      if (x < out.minX) out.minX = x;
      if (x > out.maxX) out.maxX = x;
      if (y < out.minY) out.minY = y;
      if (y > out.maxY) out.maxY = y;
    }
  }
  function projectContentRect(ex, vw, vh, out) {
    ensureBoxes();
    _mv.multiplyMatrices(camera.matrixWorldInverse, root.matrixWorld);
    out.minX = out.minY = Infinity;
    out.maxX = out.maxY = -Infinity;
    if (nItems) {
      for (let i = 0; i < nItems; i++) {
        const it = items[i];
        if (it.hideEx && ex > 0.15) continue;
        const k = easeEx(clamp((ex - it.delay * 0.45) / 0.55, 0, 1));
        _bmin.copy(it.asm.min).addScaledVector(it.vec, k);
        _bmax.copy(it.asm.max).addScaledVector(it.vec, k);
        projectBox(vw, vh, out);
      }
    } else {
      _bmin.lerpVectors(head.min, exploded.min, ex);
      _bmax.lerpVectors(head.max, exploded.max, ex);
      projectBox(vw, vh, out);
    }
    if (!Number.isFinite(out.minX)) { out.minX = vw * 0.3; out.maxX = vw * 0.7; out.minY = vh * 0.2; out.maxY = vh * 0.8; }
    return out;
  }

  return {
    head, exploded, computeBoxes, ensureBoxes, fitDistance, fitExploded, explodedDir, viewPose, focusPose,
    readPose, applyPose, tweenTo, tweenFrom, cancel, update, setUserControl, settleControls,
    projectContentRect, destination,
    get tweening() { return tw.active; },
    get remaining() { return remaining(); },
    get userControl() { return userControl; },
  };
}
