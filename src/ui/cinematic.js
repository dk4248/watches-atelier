import * as THREE from 'three';
import { makePose, copyPose, lerpPose, nearestAz } from './camera.js';
import { DEG, TAU, clamp, lerp, smoothstep, easeInOut, firstSentence, isPhone } from './util.js';

// "Shows" drive the camera on their own: the cinematic wallpaper loop and the
// three ambient compositions (dial / movement / exploded with a slow drift).
//
// Cinematic loop (LOOP s, seamless):
//    0– 8  front hero, slow orbit across the dial, seconds hand ticking
//    8–14  swing round to the back: the movement through the case back
//   14–20  push in on the regulating organ (descriptor show.closeup); the winding
//          moment (17–19 s, show.winding): the crown winds a hand-wound watch, the
//          rotor of an automatic swings
//   20–27  pull back to an oblique view while the watch explodes
//   27–46  exploded hold, slow orbit, spotlight on one key part every 2.4 s
//          (show.spotlight)
//   46–54  reassemble
//   54–64  return to the exact starting pose
// Every camera channel (target xyz, azimuth, elevation, log distance) and the
// explode amount is a periodic monotone cubic spline through key poses, so motion
// is smooth, never overshoots, and position and velocity match across the loop seam.
//
// The part ids come from the watch descriptor (ctx.watch.show); the lists below are
// the fallbacks for a descriptor that doesn't name them.

export const LOOP = 64;
const KEY_T = [0, 8, 14, 17, 19.8, 27, 46, 54];
const DEFAULT_SPOTS = [
  'barrel', 'center-wheel', 'third-wheel', 'fourth-wheel', 'escape-wheel', 'pallet-fork',
  'balance-wheel', 'hairspring', 'ratchet-wheel', 'crown-wheel', 'three-quarter-plate', 'dial', 'hour-hand',
];
const DEFAULT_CLOSE = ['balance-wheel', 'escape-wheel'];
const DEFAULT_WIND = ['ratchet-wheel', 'crown-wheel'];
// labelled during the close-up besides the close-up and winding parts (if they exist)
const CLOSE_LABELS = ['balance-wheel', 'hairspring', 'escape-wheel', 'pallet-fork', 'ratchet-wheel', 'crown-wheel', 'balance-cock', 'regulator'];
const SPOT_T0 = 27.0;
const SPOT_DT = 2.4;
const SPOT_N = 8; // 27.0 → 46.2 s; successive loops continue through the list
const WIND_T0 = 17.0;
const WIND_T1 = 19.2;
const CLOSE_T0 = 15.0;
const CLOSE_T1 = 20.4;

// Periodic PCHIP (Fritsch–Butland): keys at `times` (times[0] = 0) with `values`.
function makeChannel(times, values, period) {
  const n = times.length;
  const hAt = (i) => (i === n - 1 ? times[0] + period : times[i + 1]) - times[i];
  const dAt = (i) => (values[(i + 1) % n] - values[i]) / hAt(i);
  const m = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const ip = (i - 1 + n) % n;
    const d0 = dAt(ip);
    const d1 = dAt(i);
    const h0 = hAt(ip);
    const h1 = hAt(i);
    m[i] = d0 * d1 <= 0 ? 0 : (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
  }
  return (t) => {
    t = ((t % period) + period) % period;
    let i = n - 1;
    while (i > 0 && t < times[i]) i--;
    const hh = hAt(i);
    const u = (t - times[i]) / hh;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * values[i] + (u3 - 2 * u2 + u) * hh * m[i]
      + (-2 * u3 + 3 * u2) * values[(i + 1) % n] + (u3 - u2) * hh * m[(i + 1) % n];
  };
}

// Show targets of a watch descriptor, with the Tangente-era lists as fallbacks.
function showConfig(watch) {
  const s = (watch && watch.show) || {};
  const list = (v, d) => (Array.isArray(v) && v.length ? v : d);
  const wind = s.winding || {};
  const auto = !!(watch && watch.spec && watch.spec.automatic);
  return {
    spots: list(s.spotlight, DEFAULT_SPOTS),
    close: list(s.closeup, DEFAULT_CLOSE),
    windIds: list(wind.ids, DEFAULT_WIND),
    windType: wind.type === 'automatic' || wind.type === 'manual' ? wind.type : auto ? 'automatic' : 'manual',
  };
}

export function createShow(ctx, rig, deps) {
  const { reg, stage, root, kin } = ctx;
  const camera = stage.camera;

  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _box = new THREE.Box3();
  const _box2 = new THREE.Box3();
  const pose = makePose();
  const base = makePose();
  const lead = { active: false, t: 0, dur: 1.6, from: makePose(), fromEx: 0, cur: makePose() };
  const bias = new THREE.Vector3();
  const prevA = new THREE.Vector3();
  const curA = new THREE.Vector3();

  let kind = null; // 'cinematic' | 'dial' | 'movement' | 'exploded' | null
  let t = 0; // seconds since the show clock started (loop time = t % LOOP)
  let period = 48; // ambient drift period
  let builtAspect = 0;
  let ch = null; // spline channels
  let cfg = showConfig(null);
  let spots = [];
  let closeSet = new Set(CLOSE_LABELS);
  const spot = { id: null, name: '', line: '', alpha: 0, slot: -1 };
  const lineCache = new Map();

  // Label anchor of a part in its ASSEMBLED position, root-local.
  function assembledAnchor(p, out) {
    out.copy(p.anchorVec || _v.set(0, 0, 0));
    _m.compose(p.base || p.object.position, p.object.quaternion, p.object.scale);
    out.applyMatrix4(_m);
    if (p.object.parent) out.applyMatrix4(p.object.parent.matrixWorld);
    return root.worldToLocal(out);
  }
  function assembledBox(p, out) {
    out.setFromObject(p.object);
    if (out.isEmpty()) return out;
    _v.copy(p.base || p.object.position).sub(p.object.position);
    return out.translate(_v);
  }

  function build() {
    rig.ensureBoxes();
    root.updateMatrixWorld(true);
    cfg = showConfig(ctx.watch);
    lineCache.clear();
    const aspect = camera.aspect || 16 / 9;
    builtAspect = aspect;
    const head = rig.head;
    const X = rig.exploded;
    const C0 = head.getCenter(new THREE.Vector3());
    const XC = X.getCenter(new THREE.Vector3());
    const fitHead = (az, el, k = 1) => rig.fitDistance(head, C0, az * DEG, el * DEG, aspect, 0.74, 0.74) * k;

    // close-up of the regulating organ: frame the descriptor's close-up parts together
    let E = C0.clone().add(new THREE.Vector3(0, 0, -4));
    let dE = fitHead(172, 15, 0.55);
    _box2.makeEmpty();
    for (const id of cfg.close) {
      const p = reg.byId.get(id);
      if (p) _box2.union(assembledBox(p, _box));
    }
    if (!_box2.isEmpty()) {
      _box2.expandByScalar(1.5);
      E = _box2.getCenter(new THREE.Vector3());
      dE = clamp(rig.fitDistance(_box2, E, 172 * DEG, 15 * DEG, aspect, 0.62, 0.62), 26, fitHead(172, 15, 0.75));
    }
    // the winding moment looks at the winding parts (ratchet + crown wheel, or the rotor)
    let R = E.clone();
    let n = 0;
    const acc = new THREE.Vector3();
    for (const id of cfg.windIds) {
      const p = reg.byId.get(id);
      if (p) { acc.add(assembledAnchor(p, new THREE.Vector3())); n++; }
    }
    if (n) R = acc.multiplyScalar(1 / n);
    const ER = E.clone().lerp(R, 0.5);

    // exploded composition (side-on in landscape, from above in portrait)
    const xd = rig.explodedDir(aspect);
    const az5 = xd.az / DEG;
    const el5 = xd.el / DEG;
    const az6 = az5 - 16;
    const el6 = el5 + 8;
    const lab = deps.labelsOn();
    const wide = aspect > 1;
    const mH = wide ? (lab ? 0.64 : 0.84) : 0.9;
    const mV = wide ? 0.84 : (lab ? 0.74 : 0.86);
    const fitX = (az, el) => rig.fitExploded(XC, az * DEG, el * DEG, aspect, mH, mV);

    const keys = [
      // [target, az°, el°, dist]
      [C0, -18, -7, fitHead(-18, -7)],
      [C0, 18, 2, fitHead(18, 2, 0.93)],
      [C0, 162, 10, fitHead(162, 10, 0.98)],
      [E, 172, 15, dE],
      [ER, 186, 20, dE * 1.12],
      [XC, az5, el5, fitX(az5, el5)],
      [XC, az6, el6, fitX(az6, el6)],
      [C0, 26, 6, fitHead(26, 6, 1.04)],
    ];
    const col = (f) => keys.map(f);
    ch = {
      tx: makeChannel(KEY_T, col((k) => k[0].x), LOOP),
      ty: makeChannel(KEY_T, col((k) => k[0].y), LOOP),
      tz: makeChannel(KEY_T, col((k) => k[0].z), LOOP),
      az: makeChannel(KEY_T, col((k) => k[1] * DEG), LOOP),
      el: makeChannel(KEY_T, col((k) => k[2] * DEG), LOOP),
      ld: makeChannel(KEY_T, col((k) => Math.log(Math.max(1, k[3]))), LOOP),
      ex: makeChannel([0, 20.6, 27, 46, 53.4], [0, 0, 1, 1, 0], LOOP),
    };
    spots = cfg.spots.filter((id) => reg.byId.has(id));
    closeSet = new Set([...cfg.close, ...cfg.windIds, ...CLOSE_LABELS]);
  }

  function cinematicPose(time, out) {
    out.target.set(ch.tx(time), ch.ty(time), ch.tz(time));
    out.az = ch.az(time);
    out.el = ch.el(time);
    out.dist = Math.exp(ch.ld(time));
    return out;
  }

  function ambientPose(time, out) {
    const w = TAU / period;
    copyPose(out, base);
    const amp = kind === 'exploded' ? 10 : 14;
    out.az = base.az + amp * DEG * Math.sin(w * time);
    out.el = base.el + 4 * DEG * Math.sin(2 * w * time);
    out.dist = base.dist * (1 - 0.035 * (1 - Math.cos(w * time)) * 0.5);
    return out;
  }

  function buildAmbient() {
    cfg = showConfig(ctx.watch);
    lineCache.clear();
    const aspect = camera.aspect || 16 / 9;
    builtAspect = aspect;
    const lab = deps.labelsOn() && kind === 'exploded';
    const wide = aspect > 1;
    const mH = kind === 'exploded' ? (wide ? (lab ? 0.62 : 0.84) : 0.9) : (wide ? 0.8 : 0.86);
    const mV = kind === 'exploded' ? (wide ? 0.84 : (lab ? 0.74 : 0.86)) : 0.74;
    rig.viewPose(kind, base, mH, mV, aspect);
    if (kind === 'dial') { base.az = -8 * DEG; base.el = -5 * DEG; }
  }

  function targetExplode(time) {
    if (kind === 'cinematic') return clamp(ch.ex(time), 0, 1);
    return kind === 'exploded' ? 1 : 0;
  }

  // Camera pose at show time `time`, including the lean towards the spotlit part.
  function evalPose(time, out) {
    if (kind === 'cinematic') {
      cinematicPose(time, out);
      updateSpot(time);
      if (spot.id) out.target.add(bias);
      return out;
    }
    return ambientPose(time, out);
  }

  // ------------------------------------------------------------------ spotlight
  function spotLine(p) {
    let s = lineCache.get(p.id);
    if (s === undefined) { s = firstSentence(p.description); lineCache.set(p.id, s); }
    return s;
  }

  // successive loops continue through the list (no per-frame closure)
  function idOf(loopIdx, k) {
    const n = spots.length;
    return spots[(((loopIdx * SPOT_N + k) % n) + n) % n];
  }

  function updateSpot(time) {
    const loopT = ((time % LOOP) + LOOP) % LOOP;
    const loopIdx = Math.floor(time / LOOP);
    const i = Math.floor((loopT - SPOT_T0) / SPOT_DT);
    bias.set(0, 0, 0);
    if (kind !== 'cinematic' || !spots.length || i < 0 || i >= SPOT_N) {
      spot.id = null; spot.alpha = 0; spot.slot = -1;
      return;
    }
    const id = idOf(loopIdx, i);
    const p = reg.byId.get(id);
    const s0 = SPOT_T0 + i * SPOT_DT;
    spot.slot = i;
    spot.id = id;
    spot.name = p ? p.name || id : id;
    spot.line = p ? spotLine(p) : '';
    spot.alpha = smoothstep(s0, s0 + 0.35, loopT) * (1 - smoothstep(s0 + SPOT_DT - 0.4, s0 + SPOT_DT, loopT));
    // gently lean the camera target towards the spotlit part
    if (p) {
      reg.anchorWorld(p, curA);
      root.worldToLocal(curA);
      const prev = i > 0 ? reg.byId.get(idOf(loopIdx, i - 1)) : null;
      if (prev) { reg.anchorWorld(prev, prevA); root.worldToLocal(prevA); }
      else prevA.set(ch.tx(loopT), ch.ty(loopT), ch.tz(loopT));
      const k = smoothstep(s0, s0 + 1.1, loopT);
      bias.lerpVectors(prevA, curA, k).sub(_v.set(ch.tx(loopT), ch.ty(loopT), ch.tz(loopT)));
      const wgt = 0.16 * smoothstep(SPOT_T0, SPOT_T0 + 1.4, loopT) * (1 - smoothstep(SPOT_T0 + SPOT_N * SPOT_DT - 1.6, SPOT_T0 + SPOT_N * SPOT_DT, loopT));
      bias.multiplyScalar(wgt);
    }
  }

  // ------------------------------------------------------------------ winding moment
  // Hand-wound: the crown turns, so the crown wheel and ratchet turn. Automatic: the
  // rotor is pumped like a wrist being swung (push along its motion, capped speed).
  function windMoment(loopT, dt) {
    if (loopT < WIND_T0 || loopT >= WIND_T1 || dt <= 0) return;
    const ramp = smoothstep(WIND_T0, WIND_T0 + 0.3, loopT) * (1 - smoothstep(WIND_T1 - 0.3, WIND_T1, loopT));
    const sp = kin.spec || ctx.spec || {};
    if (cfg.windType === 'automatic' && sp.automatic) {
      const v = kin.state.rotorVel || 0;
      if (Math.abs(v) < 9) kin.addRotorImpulse((v >= 0 ? 1 : -1) * ramp * 16 * dt);
    } else {
      kin.wind(ramp * 2.5 * TAU * dt);
    }
  }

  // ------------------------------------------------------------------ API
  // at: show clock to start from (continue a loop where it was left);
  // lead: seconds to ease from the current camera pose into the show.
  function start(k, { immediate = false, period: per = 48, at = 0, lead: leadDur = 1.6 } = {}) {
    kind = k;
    period = per;
    t = Number.isFinite(at) && at > 0 ? at : 0;
    spot.id = null;
    spot.alpha = 0;
    if (kind === 'cinematic') build();
    else buildAmbient();
    if (immediate) {
      lead.active = false;
    } else {
      rig.readPose(lead.from);
      lead.fromEx = reg.explode;
      lead.t = 0;
      lead.dur = Math.max(0.3, leadDur);
      lead.active = true;
    }
    rig.setUserControl(false);
    rig.cancel();
  }

  function stop() {
    kind = null;
    lead.active = false;
    spot.id = null;
    spot.alpha = 0;
  }

  function update(dt) {
    if (!kind) return;
    if (Math.abs((camera.aspect || 1) - builtAspect) > 0.01) {
      if (kind === 'cinematic') build(); else buildAmbient();
    }
    if (lead.active) {
      lead.t += dt;
      const k = easeInOut(clamp(lead.t / lead.dur, 0, 1));
      evalPose(t, pose);
      pose.az = nearestAz(lead.from.az, pose.az);
      lerpPose(lead.cur, lead.from, pose, k);
      rig.applyPose(lead.cur);
      reg.setExplode(lerp(lead.fromEx, targetExplode(t), k));
      if (lead.t >= lead.dur) lead.active = false;
      return;
    }
    t += dt;
    const loopT = kind === 'cinematic' ? t % LOOP : t % period;
    if (kind === 'cinematic') evalPose(t, pose); // the spotlight cycles through the list loop by loop
    else evalPose(loopT, pose);
    rig.applyPose(pose);
    reg.setExplode(targetExplode(loopT));
    if (kind === 'cinematic') windMoment(loopT, dt);
  }

  // Which labels a show wants (replaces the normal priority rule).
  function labelFilter(p, ex) {
    if (p.id === spot.id) return true;
    if (kind === 'cinematic') {
      const lt = t % LOOP;
      if (ex > 0.35) return (p.priority ?? 2) <= 1;
      if (lt >= CLOSE_T0 && lt <= CLOSE_T1) return closeSet.has(p.id);
      return false;
    }
    if (kind === 'exploded') return (p.priority ?? 2) <= (isPhone() ? 1 : 2);
    return false;
  }

  return {
    start, stop, update, labelFilter,
    rebuild() { if (kind === 'cinematic') build(); else if (kind) buildAmbient(); },
    // the watch was rebuilt: cached descriptions belong to the old parts
    invalidate() { lineCache.clear(); spot.id = null; spot.alpha = 0; },
    get kind() { return kind; },
    get active() { return !!kind; },
    get leading() { return lead.active; },
    get time() { return t; },
    get period() { return period; },
    get loopTime() { return kind === 'cinematic' ? t % LOOP : t; },
    get spot() { return spot; },
  };
}
