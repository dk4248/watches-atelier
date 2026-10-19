// Validates src/watches/tudor-m79470/spec.js (Tudor Black Bay Pro M79470-0004, MT5652):
//   1. gearing: every meshing pair's centre distance vs m(z1+z2)/2, module range, one
//      module per wheel with two partners, the mating teeth share a plane (z overlap)
//   2. kinematics: createKinematics(SPEC) in node with a controllable clock — periods
//      (centre 3600 s, fourth/seconds 60 s, hour wheel 43200 s, 24-h hand 86400 s,
//      escape 2·teeth/8 s), 8 rest positions per second of the seconds hand, extra
//      arbors vs their tooth counts, date direction/jump, rotor + winding ratios
//   3. vertical stack: every pair of solids whose plan outlines overlap must have
//      disjoint z ranges unless they are meant to touch (meshes, jumpers, pipes…)
//   4. explode: sweeping the registry's explode animation (its easing + explodeDelay),
//      no two solids that are apart when assembled may intersect at any stage
//   5. explode table and planned part ids (plan.md) agree
//   6. misc: hands under the crystal, markers under the hands, rotor inside the case back,
//      crown on the stem axis, rotor centre of mass on its local −Y
// Run: node research/tudor-m79470/check.mjs        (exit code 1 on any error)
import fs from 'node:fs';
import { SPEC } from '../../src/watches/tudor-m79470/spec.js';
import { createKinematics } from '../../src/core/kinematics.js';

const S = SPEC, L = S.layout, Z = S.z, MD = S.modules, TR = S.train;
// the descriptor is read as text (importing it would pull in the part builders)
const idx = fs.readFileSync(new URL('../../src/watches/tudor-m79470/index.js', import.meta.url), 'utf8');
const listIn = (re) => ((idx.match(re) || [])[1] || '').split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
const DESCRIPTOR = {
  explodeHide: listIn(/explodeHide:\s*\[([^\]]*)\]/),
  solidCaseback: (idx.match(/solidCaseback:\s*'([^']+)'/) || [])[1] || null,
};
const DESCRIPTOR_IDS = {
  spotlight: listIn(/spotlight:\s*\[([^\]]*)\]/),
  closeup: listIn(/closeup:\s*\[([^\]]*)\]/),
  winding: listIn(/winding:\s*\{[^}]*ids:\s*\[([^\]]*)\]/),
};
// ---------------------------------------------------------------- reporting
let errors = 0, warnings = 0;
const err = (m) => { errors++; console.log(`  ERROR  ${m}`); };
const warn = (m) => { warnings++; console.log(`  warn   ${m}`); };
const ok = (m) => console.log(`  ok     ${m}`);
const head = (m) => console.log(`\n=== ${m}`);
const f3 = (v) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3);
const DEG = Math.PI / 180, TAU = Math.PI * 2;
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const B = (x, y) => [-x, y]; // back view → dial frame
const wheelTip = (z, m) => m * (z / 2 + 1.3); // gear.toothedOutline addendum
const pinionTip = (z, m) => m * (z / 2 + 0.9); // gear.pinionOutline addendum
const wheelRoot = (z, m) => m * (z / 2 - 1.6);

// ---------------------------------------------------------------- 2-D plan shapes
const circle = (c, r) => ({ t: 'c', c, r });
const ring = (c, r0, r1) => ({ t: 'a', c, r0, r1 });
const poly = (pts) => ({ t: 'p', pts });
const rect = (x0, x1, y0, y1) => ({ t: 'r', x0, x1, y0, y1 });
const minus = (a, ...b) => ({ t: '-', a, b });
const union = (...a) => ({ t: 'u', a });
const capsule = (p, q, r) => ({ t: 'k', p, q, r });
function inPoly(pts, x, y) {
  let s = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s;
  }
  return s;
}
function inside(s, x, y) {
  switch (s.t) {
    case 'c': return (x - s.c[0]) ** 2 + (y - s.c[1]) ** 2 < s.r * s.r;
    case 'a': { const d2 = (x - s.c[0]) ** 2 + (y - s.c[1]) ** 2; return d2 < s.r1 * s.r1 && d2 > s.r0 * s.r0; }
    case 'p': return inPoly(s.pts, x, y);
    case 'r': return x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1;
    case '-': return inside(s.a, x, y) && !s.b.some((b) => inside(b, x, y));
    case 'u': return s.a.some((a) => inside(a, x, y));
    case 'k': {
      const [px, py] = s.p, [qx, qy] = s.q, dx = qx - px, dy = qy - py, l2 = dx * dx + dy * dy || 1e-12;
      const t = Math.max(0, Math.min(1, ((x - px) * dx + (y - py) * dy) / l2));
      return (x - px - dx * t) ** 2 + (y - py - dy * t) ** 2 < s.r * s.r;
    }
    default: throw new Error(`shape ${s.t}`);
  }
}
function bbox(s) {
  switch (s.t) {
    case 'c': return [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r];
    case 'a': return [s.c[0] - s.r1, s.c[1] - s.r1, s.c[0] + s.r1, s.c[1] + s.r1];
    case 'p': return [Math.min(...s.pts.map((p) => p[0])), Math.min(...s.pts.map((p) => p[1])), Math.max(...s.pts.map((p) => p[0])), Math.max(...s.pts.map((p) => p[1]))];
    case 'r': return [s.x0, s.y0, s.x1, s.y1];
    case '-': return bbox(s.a);
    case 'u': { const b = s.a.map(bbox); return [Math.min(...b.map((v) => v[0])), Math.min(...b.map((v) => v[1])), Math.max(...b.map((v) => v[2])), Math.max(...b.map((v) => v[3]))]; }
    case 'k': return [Math.min(s.p[0], s.q[0]) - s.r, Math.min(s.p[1], s.q[1]) - s.r, Math.max(s.p[0], s.q[0]) + s.r, Math.max(s.p[1], s.q[1]) + s.r];
    default: throw new Error(`shape ${s.t}`);
  }
}
// ------------------------------------------------------------------ 3. solids & overlap
// solid = { id, part, shape (plan), z: [z0, z1] | (x, y) => [z0, z1], zr: overall z range, bb }
const solids = [];
const add = (id, part, shape, zz, extra = {}) => {
  const zr = extra.zr || (typeof zz === 'function' ? null : zz);
  if (!zr) throw new Error(`solid ${id}: a z function needs extra.zr`);
  solids.push({ id, part, shape, z: zz, zr, bb: bbox(shape), ...extra });
};
const STEP = 0.06;
function zAt(s, x, y, dz = 0) {
  const r = typeof s.z === 'function' ? s.z(x, y) : s.z;
  return [r[0] + dz, r[1] + dz];
}
// number of grid samples where both solids contain the point and their z ranges overlap by > eps
function overlap(A, Bs, oA = [0, 0, 0], oB = [0, 0, 0], eps = 1e-3) {
  if (!(A.zr[0] + oA[2] < Bs.zr[1] + oB[2] - eps && Bs.zr[0] + oB[2] < A.zr[1] + oA[2] - eps)) return 0;
  const x0 = Math.max(A.bb[0] + oA[0], Bs.bb[0] + oB[0]), x1 = Math.min(A.bb[2] + oA[0], Bs.bb[2] + oB[0]);
  const y0 = Math.max(A.bb[1] + oA[1], Bs.bb[1] + oB[1]), y1 = Math.min(A.bb[3] + oA[1], Bs.bb[3] + oB[1]);
  if (x0 >= x1 || y0 >= y1) return 0;
  let n = 0;
  for (let x = x0 + STEP / 2; x < x1; x += STEP) {
    for (let y = y0 + STEP / 2; y < y1; y += STEP) {
      const xa = x - oA[0], ya = y - oA[1], xb = x - oB[0], yb = y - oB[1];
      if (!inside(A.shape, xa, ya) || !inside(Bs.shape, xb, yb)) continue;
      const a = zAt(A, xa, ya, oA[2]), b = zAt(Bs, xb, yb, oB[2]);
      if (a[0] < b[1] - eps && b[0] < a[1] - eps) n++;
    }
  }
  return n;
}
// ---- intended contacts at assembly (meshes, pipes through bores, stem in its parts)
const MEANT = [
  ['barrel teeth', 'centre pinion'], ['centre wheel', 'third pinion'], ['third wheel', 'fourth pinion'], ['fourth wheel', 'escape pinion'],
  ['cannon leaves', 'minute wheel'], ['minute wheel', 'setting wheel'], ['minute pinion', 'hour-wheel driver'], ['driver 30 toothing', 'GMT idler wheel'],
  ['GMT idler pinion', '24-hour wheel'], ['local hour wheel', 'date driver'], ['jumping-hour star', 'hour jumper'],
  ['ratchet wheel', 'crown wheel'], ['crown wheel', 'winding intermediate'], ['reduction pinion', 'ratchet wheel'],
  ['rotor gear', 'reversing wheel A'], ['reversing wheel A', 'reversing wheel B'], ['reversing wheel B pinion', 'reduction wheel'],
  ['escape wheel', 'pallet fork'], ['pallet fork', 'roller'],
  ['seconds pin', 'fourth arbor (through the centre)'],
  ['winding stem', 'sliding pinion'], ['winding stem', 'winding pinion'], ['winding stem', 'crown'], ['winding stem', 'middle case'],
];
// ---- every part id the modules will register (plan.md §1)
const PLAN = {
  case: ['case-body', 'lugs', 'bezel', 'crystal', 'flange', 'crown', 'caseback', 'bracelet', 'clasp', 'spring-bars'],
  dial: ['dial', 'indices', 'date-window', 'dial-feet', 'date-disc'],
  hands: ['hour-hand', 'gmt-hand', 'minute-hand', 'seconds-hand'],
  train: ['barrel', 'mainspring', 'barrel-arbor', 'barrel-cover', 'center-wheel', 'third-wheel', 'fourth-wheel', 'ratchet-wheel', 'crown-wheel', 'winding-intermediate', 'click', 'click-spring'],
  dialworks: ['cannon-pinion', 'minute-wheel', 'hour-wheel-driver', 'hour-wheel', 'hour-jumper', 'gmt-wheel', 'gmt-wheels', 'date-wheels', 'instant-date-lever', 'date-jumper', 'calendar-plate', 'date-disc-guards',
    'winding-stem', 'sliding-pinion', 'winding-pinion', 'setting-lever', 'yoke', 'setting-wheel', 'keyless-springs', 'stop-seconds-lever'],
  escapement: ['escape-wheel', 'pallet-fork', 'balance-wheel', 'roller', 'hairspring', 'balance-bridge', 'shock-absorber'],
  automatic: ['rotor', 'rotor-bearing', 'reversing-wheels', 'winding-train'],
  frame: ['main-plate', 'automatic-bridge', 'barrel-bridge', 'train-bridge', 'center-wheel-bridge', 'pallet-bridge', 'jewels', 'plate-screws', 'plate-engravings'],
};
// ------------------------------------------------------------------ 1. gearing
head('1. Meshing pairs: centre distance vs m(z1+z2)/2, module, shared plane');
for (const g of S.meshes) {
  const d = hyp(g.pa, g.pb), wantD = (g.m * (g.za + g.zb)) / 2, e = d - wantD;
  const zo = Math.min(g.zA[1], g.zB[1]) - Math.max(g.zA[0], g.zB[0]); // face overlap of the two toothings
  const line = `${g.name.padEnd(44)} d ${f3(d)}  m(z1+z2)/2 ${f3(wantD)}  Δ ${f3(e)}  m ${g.m.toFixed(4)}  face ${f3(zo)}`;
  if (Math.abs(e) > 0.002 || !(g.m > 0.04 && g.m < 0.2) || zo < 0.06) err(line); else ok(line);
}
head('1b. A wheel with two partners uses one module for both');
for (const [n, a, b] of S.sameModule || []) (Math.abs(a - b) > 1e-9 ? err : ok)(`${n}: ${a.toFixed(5)} vs ${b.toFixed(5)}`);
head('1c. Positions (dial frame)');
for (const [k, v] of Object.entries(L)) console.log(`  ${k.padEnd(16)} [${f3(v[0])}, ${f3(v[1])}]  r ${f3(Math.hypot(...v))}  clock ${f3(((Math.atan2(v[0], v[1]) / DEG) + 360) % 360)}°`);

// ------------------------------------------------------------------ 2. kinematics
// A controllable clock: the engine reads Date.now() and performance.now(); both are
// replaced so time can be stepped exactly (live mode: virtual time = system time).
head('2. Kinematics (src/core/kinematics.js, run in node with a stepped clock)');
const clock = { now: Date.UTC(2026, 9, 16, 21, 59, 50, 0), perf: 1000 };
const realDateNow = Date.now;
Date.now = () => clock.now;
const perfObj = globalThis.performance;
const realPerfNow = perfObj.now.bind(perfObj);
perfObj.now = () => clock.perf;
const step = (ms) => { clock.now += ms; clock.perf += ms; };
const warnings0 = [];
const realWarn = console.warn;
console.warn = (...a) => warnings0.push(a.join(' '));
const kin = createKinematics(SPEC);
console.warn = realWarn;
for (const w of warnings0) err(`engine warning: ${w}`);
const Bps = kin.state.B;
(Bps === 8 ? ok : err)(`beats per second ${Bps} (28,800 A/h)`);
const period = (k) => kin.bpr[k] / Bps;
const want = {
  center: 3600, fourth: 60, hourWheel: 43200, cannon: 3600,
  escape: (2 * TR.escape.teeth) / Bps,
  third: 3600 * TR.third.pinion / TR.center.teeth,
  minuteWheel: 3600 * TR.minuteWheel.teeth / TR.cannon.teeth,
  barrel: 3600 * TR.barrel.teeth / TR.center.pinion,
};
for (const [k, p] of Object.entries(want)) (Math.abs(period(k) - p) < 1e-9 ? ok : err)(`${k.padEnd(12)} ${f3(period(k))} s/turn (expect ${f3(p)}), dir ${kin.dir[k]}`);
console.log(`  barrel: 1 turn / ${(period('barrel') / 3600).toFixed(3)} h → ${(S.powerReserveHours * 3600 / period('barrel')).toFixed(3)} turns over ${S.powerReserveHours} h (SPEC.barrelTurns ${S.barrelTurns.toFixed(3)})`);
(Math.abs(S.barrelTurns - S.powerReserveHours * 3600 / period('barrel')) < 1e-9 ? ok : err)('barrelTurns = reserve / barrel period');
for (const [k, a] of Object.entries(S.arbors || {})) {
  const p = period(k);
  (Math.abs(p - a.period) < 1e-9 && Math.abs(kin.dir[k]) === 1 ? ok : err)(`arbor ${k.padEnd(14)} ${f3(p)} s/turn, dir ${kin.dir[k]}${a.from ? `  (${a.from})` : ''}`);
}
// stepped seconds: 8 rest positions per second; fourth wheel ≡ seconds hand (direct centre seconds)
let st = kin.update();
const secs = [];
for (let i = 0; i < 1000; i++) { step(1); st = kin.update(); secs.push(st.rot.secondHand); }
let rests = 0, run = 1;
for (let i = 1; i < secs.length; i++) { if (Math.abs(secs[i] - secs[i - 1]) < 1e-12) run++; else { if (run > 20) rests++; run = 1; } }
if (run > 20) rests++;
(rests === 8 ? ok : err)(`seconds hand: ${rests} rest positions in 1 s (8 beats/s)`);
(Math.abs(Math.sin(st.rot.fourth - st.rot.secondHand)) < 1e-6 ? ok : err)('fourth wheel and seconds hand turn together (direct centre seconds)');
// 24-hour hand: one turn per 24 h, CW, local time (+ gmtOffsetHours)
const localSec = st.localSec;
const want24 = -TAU * ((((localSec + (S.gmtOffsetHours || 0) * 3600) / 86400) % 1 + 1) % 1);
const tt = st.P / Bps;
const want24b = -TAU * ((((tt + (S.gmtOffsetHours || 0) * 3600) / 86400) % 1 + 1) % 1);
(Math.abs(Math.sin(st.rot.hand24 - want24b)) < 1e-9 ? ok : err)(`hand24 = 24-h local time (${f3((-st.rot.hand24 / TAU) * 24)} h on the dial; clock ${(((localSec / 3600) % 24) + 24) % 24 > 0 ? f3((((localSec / 3600) % 24) + 24) % 24) : 0} h)`);
void want24;
(Math.abs(Math.sin(2 * st.rot.hand24 - st.rot.hourHand)) < 1e-6 || S.gmtOffsetHours ? ok : err)('24-h hand at half the hour-hand speed, both at 12 at local midnight');
// date: instantaneous jump at local midnight, disc turning clockwise (rot.date decreasing)
const before = { datePos: st.datePos, rot: st.rot.date, day: st.day };
// step to just after local midnight (the clock starts 21:59:50 UTC; local tz of the runner)
const tz = new Date(clock.now).getTimezoneOffset() * 60000;
const toMidnight = 86400000 - (((clock.now - tz) % 86400000) + 86400000) % 86400000;
step(toMidnight + 5);
st = kin.update();
const jumpStart = st.datePos;
step(400); st = kin.update(); const mid = st.datePos;
step(1200); st = kin.update(); const after = st.datePos;
const dd = (((after - before.datePos) % 31) + 31) % 31;
(Math.abs(dd - 1) < 1e-9 ? ok : err)(`date advanced one day at local midnight (${before.day} → ${st.day}); datePos ${f3(before.datePos)} → ${f3(jumpStart)} → ${f3(mid)} → ${f3(after)} (1.2 s jump)`);
(st.rot.date < before.rot || st.day === 1 ? ok : err)(`rot.date decreases (clockwise disc): ${f3(before.rot)} → ${f3(st.rot.date)}`);
// automatic: pump the rotor, the reserve and the ratchet rise; rotor hangs to 6 at rot 0
const r0 = st.reserve, w0 = st.windAngle;
kin.setGravity(0.0, -1);
for (let i = 0; i < 400; i++) { if (i % 50 === 0) kin.addRotorImpulse(i % 100 === 0 ? 9 : -9); step(16); st = kin.update(); }
(st.windAngle > w0 && st.reserve >= r0 - 1e-6 ? ok : err)(`rotor swings wind the ratchet: windAngle +${f3(st.windAngle - w0)} rad, reserve ${f3(r0)} → ${f3(st.reserve)}`);
for (const k of ['ratchet', 'crownWheel', 'stem', 'rotor', 'date', 'balance', 'fork', 'hourHand', 'minuteHand', 'secondHand', 'hand24']) if (!(k in st.rot)) err(`state.rot.${k} missing`);
Date.now = realDateNow;
perfObj.now = realPerfNow;
// ---- exterior solids (case, crystal, bezel, flange, case back, crown, dial, markers, hands)
const C = S.case, D = S.dial, H = S.hands;
// z of a radial profile [[r, z], …] at radius r (profile sorted by r, clamped at the ends)
const atR = (prof, r) => {
  const p = prof.slice().sort((a, b) => a[0] - b[0]);
  if (r <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (r <= p[i][0]) { const t = (r - p[i - 1][0]) / ((p[i][0] - p[i - 1][0]) || 1e-9); return p[i - 1][1] + t * (p[i][1] - p[i - 1][1]); }
  return p[p.length - 1][1];
};
const dialTop = (r) => D.topZEdge + D.domeSagitta * (1 - (r / D.domeRadius) ** 2);
// crystal: underside = inner profile, then the edge chamfer up to the wall foot; top = outer profile
{
  const lower = [...C.crystal.inner, [C.crystal.radius, C.crystal.outer[0][1]]];
  const upper = C.crystal.outer.filter((p, i) => i > 0); // drop the wall foot: the wall top is the top at r 15.95
  add('crystal', 'crystal', circle([0, 0], C.crystal.radius), (x, y) => { const r = Math.hypot(x, y); return [atR(lower, r), atR(upper, r)]; },
    { zr: [Math.min(...lower.map((p) => p[1])), Math.max(...upper.map((p) => p[1]))] });
}
add('bezel', 'bezel', ring([0, 0], C.bezel.seatRadius, C.bezel.outerRadius), C.bezel.z);
add('flange', 'flange', ring([0, 0], C.flange.rInner, C.flange.rOuter),
  (x, y) => { const r = Math.hypot(x, y); const t = (r - C.flange.rInner) / (C.flange.rOuter - C.flange.rInner); return [C.flange.z[0], C.flange.z[0] + t * (C.flange.z[1] - C.flange.z[0])]; },
  { zr: [C.flange.z[0], C.flange.z[1]] });
// middle case: from the case-back face to the case top, outside the bore (lugs are outside the movement)
add('middle case', 'case-body', ring([0, 0], C.middle.boreRadius, C.radius), [C.middle.bottomZ, C.middle.topZ]);
// solid case back: centre disc up to its inner face, knurled ring up to the case-back face
add('case back', 'caseback', circle([0, 0], C.caseback.inner.radius), [Z.caseBottom, Z.casebackInner]);
add('case back ring', 'caseback', ring([0, 0], C.caseback.inner.radius, C.caseback.knurl.radius), [C.caseback.knurl.z[0], C.casebackFaceTop ?? Z.casebackFace]);
// crown (cylinder about +X at the stem axis) — a z function in plan
{
  const cr = C.crown, R = cr.flutes.radius;
  add('crown', 'crown', rect(cr.from, cr.to, -R, R), (x, y) => { const h = Math.sqrt(Math.max(0, R * R - y * y)); return [Z.stemAxis - h, Z.stemAxis + h]; }, { zr: [Z.stemAxis - R, Z.stemAxis + R] });
}
// dial: domed shell minus the date window
{
  const w = D.dateWindow;
  add('dial', 'dial', minus(ring([0, 0], D.centreHole, D.radius), rect(w.center[0] - w.opening[0] / 2, w.center[0] + w.opening[0] / 2, w.center[1] - w.opening[1] / 2, w.center[1] + w.opening[1] / 2)),
    (x, y) => { const t = dialTop(Math.hypot(x, y)); return [t - D.thickness, t]; }, { zr: [dialTop(D.radius) - D.thickness, dialTop(0)] });
}
// applied markers on the dome
const polarCW = (r, deg) => [r * Math.sin(deg * DEG), r * Math.cos(deg * DEG)];
const mk = D.markers;
const markerZ = (x, y) => { const t = dialTop(Math.hypot(x, y)); return [t, t + mk.height + mk.lumeDome]; };
const mzr = [dialTop(14), dialTop(9) + mk.height + mk.lumeDome];
add('markers (circles)', 'indices', union(...mk.circles.anglesDeg.map((a) => circle(polarCW(mk.circles.r, a), mk.circles.outerRadius))), markerZ, { zr: mzr });
add('markers (bars)', 'indices', union(...mk.bars.anglesDeg.map((a) => capsule(polarCW(mk.bars.r[0] + mk.bars.width / 2, a), polarCW(mk.bars.r[1] - mk.bars.width / 2, a), mk.bars.width / 2))), markerZ, { zr: mzr });
add('marker (triangle)', 'indices', poly(mk.triangle.verts), markerZ, { zr: mzr });
// hands: the disc swept by each blade, between its blade bottom and its collet top
const collet = (h) => (h.collet ? h.collet.height : h.boss.height);
add('hour hand', 'hour-hand', ring([0, 0], H.hour.bore, H.hour.tip), [H.hour.z, H.hour.z + collet(H.hour)]);
add('gmt hand', 'gmt-hand', ring([0, 0], H.gmt.bore, H.gmt.tip), [H.gmt.z, H.gmt.z + collet(H.gmt)]);
add('minute hand', 'minute-hand', ring([0, 0], H.minute.bore, H.minute.tip), [H.minute.z, H.minute.z + collet(H.minute)]);
add('seconds hand', 'seconds-hand', ring([0, 0], H.seconds.bore, H.seconds.tip), [H.seconds.z, H.seconds.z + collet(H.seconds)]);
add('seconds pin', 'seconds-hand', circle([0, 0], H.seconds.pin.radius + 0.01), [H.seconds.z + collet(H.seconds), H.pinTopZ]);
// ---- movement solids (every arbor from SPEC.layout, every level from SPEC.z)
const G = S.gmt, DT = S.dateTrain, KW = S.keyless, E = S.escapement, F = S.frame, R = S.rotor, PI = S.pipes, DD = S.date.disc, AT = S.autoTrain;
const tipW = (n, m) => wheelTip(n, m), tipP = (n, m) => pinionTip(n, m);
// cylinder about +X on the stem axis (sliding / winding pinions, stem)
const cylX = (x0, x1, r, axisY = 0, axisZ = Z.stemAxis) => ({
  shape: rect(x0, x1, axisY - r, axisY + r),
  z: (x, y) => { const h = Math.sqrt(Math.max(0, r * r - (y - axisY) ** 2)); return [axisZ - h, axisZ + h]; },
  zr: [axisZ - r, axisZ + r],
});
const holes = F.screws.map((s) => circle(s.at, F.screwHeadRadius));
const balOpen = circle(F.balanceOpening.center, F.balanceOpening.radius);
const balBridge = poly(F.balanceBridge.outline);

// ---- main plate: z [mainPlate] minus the barrel pocket, the dial-side recesses (motion works,
// setting wheel), the stem channel and the centre hole
const recDial = union(
  circle(L.center, tipP(TR.cannon.teeth, MD.motionA) + 0.25),
  circle(L.minuteWheel, tipW(TR.minuteWheel.teeth, MD.motionA) + 0.2),
  circle(L.settingWheel, tipW(KW.settingWheel.teeth, MD.motionA) + 0.2),
);
const stemChannel = rect(KW.stemInnerX - 0.3, 16.5, -0.95, 0.95);
const barrelPocket = circle(L.barrel, wheelTip(TR.barrel.teeth, MD.barrel) + 0.15);
add('plate (dial-side layer)', 'main-plate', minus(circle([0, 0], F.plateRadius), recDial, stemChannel, circle(L.center, 0.45)), [Z.motionRecess, 0]);
add('plate (back layer)', 'main-plate', minus(circle([0, 0], F.plateRadius), barrelPocket, stemChannel, circle(L.center, 0.45)), [Z.mainPlate[0], Z.barrelPocketFloor]);

// ---- dial-side works (plate → dial)
add('cannon leaves', 'cannon-pinion', ring(L.center, PI.cannon[0], tipP(TR.cannon.teeth, MD.motionA)), Z.cannonLeaves);
add('cannon pipe', 'cannon-pinion', ring(L.center, PI.cannon[0], PI.cannon[1]), [Z.cannonLeaves[1], Z.cannonPipeTop]);
add('minute wheel', 'minute-wheel', circle(L.minuteWheel, tipW(TR.minuteWheel.teeth, MD.motionA)), Z.minuteWheel);
add('minute pinion', 'minute-wheel', circle(L.minuteWheel, tipP(TR.minuteWheel.pinion, MD.motionB)), Z.minutePinion);
add('setting wheel', 'setting-wheel', circle(L.settingWheel, tipW(KW.settingWheel.teeth, MD.motionA)), Z.settingWheel);
add('24-hour wheel', 'gmt-wheel', ring(L.center, PI.gmt[0], tipW(G.wheel24.teeth, MD.gmtB)), Z.wheel24);
add('24-hour pipe', 'gmt-wheel', ring(L.center, PI.gmt[0], PI.gmt[1]), [Z.wheel24[1], Z.gmtPipeTop]);
add('GMT idler pinion', 'gmt-wheels', circle(L.gmtIdler, tipP(G.idler.pinion, MD.gmtB)), Z.gmtIdlerPinion);
add('GMT idler wheel', 'gmt-wheels', circle(L.gmtIdler, tipW(G.idler.teeth, MD.gmtA)), Z.gmtIdlerWheel);
add('driver 30 toothing', 'hour-wheel-driver', ring(L.center, PI.hour[1] + 0.01, tipW(G.driverUpper.teeth, MD.gmtA)), Z.hourDriverUpper);
add('hour-wheel driver', 'hour-wheel-driver', ring(L.center, PI.hour[1] + 0.01, tipW(TR.hourWheel.teeth, MD.motionB)), Z.hourDriver);
add('hour jumper', 'hour-jumper', ring(L.center, G.star.jumperSweep[0], G.star.jumperSweep[1]), Z.hourJumper);
add('jumping-hour star', 'hour-wheel', ring(L.center, PI.hour[1] + 0.01, G.star.tipRadius), Z.hourStar);
add('local hour wheel', 'hour-wheel', ring(L.center, PI.hour[0], tipW(G.localHourWheel.teeth, MD.date)), Z.localHourWheel);
add('hour hub (inside the driver)', 'hour-wheel', ring(L.center, PI.hour[0], PI.hour[1]), Z.hourHub);
add('hour pipe', 'hour-wheel', ring(L.center, PI.hour[0], PI.hour[1]), [Z.localHourWheel[1], Z.hourPipeTop]);
add('date driver', 'date-wheels', circle(L.dateDriver, tipW(DT.driver.teeth, MD.date)), Z.dateDriver);
add('date driver cam', 'date-wheels', circle(L.dateDriver, DT.cam.radius), Z.dateDriverCam);
add('calendar plate', 'calendar-plate', minus(circle([0, 0], F.plateRadius), circle([0, 0], PI.hour[1] + 0.1)), Z.calendarPlate);
add('date disc', 'date-disc', ring([0, 0], DD.toothTipRadius, DD.rOuter), Z.dateDisc);
{
  const sp = cylX(KW.slidingPinionX[0], KW.slidingPinionX[1], 0.85), wp = cylX(KW.windingPinionX[0], KW.windingPinionX[1], 0.95), st = cylX(KW.stemInnerX, C.crown.to - 0.6, 0.45);
  add('sliding pinion', 'sliding-pinion', sp.shape, sp.z, { zr: sp.zr });
  add('winding pinion', 'winding-pinion', wp.shape, wp.z, { zr: wp.zr });
  add('winding stem', 'winding-stem', st.shape, st.z, { zr: st.zr });
}

// ---- back side: barrel, going train, escapement, regulating organ
add('barrel drum', 'barrel', circle(L.barrel, wheelRoot(TR.barrel.teeth, MD.barrel)), Z.barrel);
add('barrel teeth', 'barrel', ring(L.barrel, wheelRoot(TR.barrel.teeth, MD.barrel), tipW(TR.barrel.teeth, MD.barrel)), Z.barrelTeeth);
add('centre pinion', 'center-wheel', ring(L.center, 0.16, tipP(TR.center.pinion, MD.barrel)), Z.pinionOf.center);
add('centre wheel', 'center-wheel', ring(L.center, 0.2, tipW(TR.center.teeth, MD.center)), Z.centerWheel);
add('centre-wheel bridge', 'center-wheel-bridge', minus(capsule(...F.centerWheelBridge.axis, F.centerWheelBridge.halfWidth), circle(L.center, F.centerWheelBridge.hole)), Z.centerWheelBridge);
add('fourth wheel', 'fourth-wheel', circle(L.fourth, tipW(TR.fourth.teeth, MD.fourth)), Z.fourthWheel);
add('fourth pinion', 'fourth-wheel', circle(L.fourth, tipP(TR.fourth.pinion, MD.third)), Z.pinionOf.fourth);
add('fourth arbor (through the centre)', 'fourth-wheel', circle(L.fourth, PI.secondsArbor), [Z.pinionOf.fourth[1], Z.secondsArborTop]);
add('third wheel', 'third-wheel', circle(L.third, tipW(TR.third.teeth, MD.third)), Z.thirdWheel);
add('third pinion', 'third-wheel', circle(L.third, tipP(TR.third.pinion, MD.center)), Z.pinionOf.third);
add('third arbor', 'third-wheel', circle(L.third, 0.16), [Z.thirdWheel[1], Z.pinionOf.third[0]]);
add('escape wheel', 'escape-wheel', circle(L.escape, E.escapeTipRadius), Z.escapeWheel);
add('escape pinion', 'escape-wheel', circle(L.escape, tipP(TR.escape.pinion, MD.fourth)), Z.pinionOf.escape);
add('escape arbor', 'escape-wheel', circle(L.escape, 0.14), [Z.pinionOf.escape[1], Z.escapeWheel[0]]);
add('pallet fork', 'pallet-fork', union(circle(L.pallet, 1.5), capsule(L.pallet, [L.pallet[0] + (L.balance[0] - L.pallet[0]) * 0.72, L.pallet[1] + (L.balance[1] - L.pallet[1]) * 0.72], 0.32)), Z.palletFork);
add('roller', 'roller', circle(L.balance, E.rollerRadius), Z.roller);
add('pallet bridge', 'pallet-bridge', poly(F.palletBridge.outline), Z.palletBridge);
add('balance rim', 'balance-wheel', ring(L.balance, E.balance.radius - E.balance.rimWidth, E.balance.radius), Z.balanceRim);
add('balance arms', 'balance-wheel', circle(L.balance, E.balance.radius - E.balance.rimWidth), Z.balanceArms);
add('inertia screws (swept)', 'balance-wheel', ring(L.balance, E.balance.radius, E.balance.radius + E.balance.inertiaScrews.protrusion), Z.inertiaScrews);
add('hairspring', 'hairspring', circle(L.balance, E.hairspring.outerRadius + 0.3), Z.hairspring);
add('balance bridge', 'balance-bridge', balBridge,
  (x, y) => (Math.hypot(x, y) >= F.balanceBridge.footRadius ? Z.balanceBridgeFeet : Z.balanceBridge), { zr: [Z.balanceBridge[0], Z.balanceBridgeFeet[1]] });
add('balance cap (shock setting)', 'shock-absorber', circle(L.balance, E.shock.settingRadius), [Z.shockTop, Z.balanceBridge[0]]);
// bridges (screw holes cut; the screws are their own part)
const TB = F.trainBridge, AB = F.automaticBridge, BB = F.barrelBridge;
add('train bridge', 'train-bridge', minus(union(poly(TB.outline), ...TB.lobes.map((l) => circle(l.center, l.radius))), balOpen, balBridge, ...TB.windows.map(poly), ...holes), Z.trainBridge);
add('barrel bridge', 'barrel-bridge', minus(union(poly(BB.outline), ...BB.plus.map((c) => circle(c.center, c.radius))), ...BB.minus.map((c) => circle(c.center, c.radius)), balOpen, ...holes), Z.barrelBridge);
{
  const u = F.flange.undercut, under = (x, y) => (x - u.center[0]) ** 2 + (y - u.center[1]) ** 2 < u.radius ** 2;
  add('barrel bridge ring (flange)', 'barrel-bridge', minus(ring([0, 0], F.flange.rInner, F.flange.rOuter), balOpen, balBridge, ...holes),
    (x, y) => (under(x, y) ? [Z.flange[0], Z.barrelBridge[1]] : Z.flange), { zr: Z.flange });
}
add('automatic bridge (top)', 'automatic-bridge', minus(poly(AB.outline), ...holes), [Z.automaticBridge[0], Z.automaticBridgeSink]);
add('automatic bridge (lower)', 'automatic-bridge', minus(poly(AB.outline), ...AB.sinks.map((s) => circle(s.center, s.radius)), ...holes), [Z.automaticBridgeSink, Z.automaticBridge[1]]);
for (const [i, s] of F.screws.entries()) {
  if (s.in === 'balanceBridge') continue; // built with the balance bridge
  const top = Z.screwHeadTop[s.in];
  add(`screw ${i + 1} (${s.in})`, 'plate-screws', circle(s.at, F.screwHeadRadius), [top, top + 0.25]);
}
// keyless on the barrel bridge, automatic train, rotor
add('ratchet wheel', 'ratchet-wheel', circle(L.barrel, tipW(KW.ratchet.teeth, MD.keyless)), Z.ratchetWheel);
add('crown wheel', 'crown-wheel', circle(L.crownWheel, tipW(KW.crownWheel.teeth, MD.keyless)), Z.crownWheel);
add('winding intermediate', 'winding-intermediate', circle(L.windingIntermediate, tipW(KW.windingIntermediate.teeth, MD.keyless)), Z.windingIntermediate);
add('reduction wheel', 'winding-train', circle(L.reductionWheel, tipW(AT.reductionWheel.teeth, MD.autoB)), Z.reductionWheel);
add('reduction pinion', 'winding-train', circle(L.reductionWheel, tipP(AT.reductionWheel.pinion, MD.keyless)), Z.reductionPinion);
add('reversing wheel A', 'reversing-wheels', circle(L.reverserA, tipW(AT.reverserA.teeth, MD.autoA)), Z.autoWheels);
add('reversing wheel B', 'reversing-wheels', circle(L.reverserB, tipW(AT.reverserB.teeth, MD.autoA)), Z.autoWheels);
add('reversing wheel B pinion', 'reversing-wheels', circle(L.reverserB, tipP(AT.reverserB.pinion, MD.autoB)), Z.reverserBPinion);
add('rotor gear', 'rotor-bearing', ring([0, 0], 1.3, R.gearTipRadius), Z.autoWheels);
add('rotor bearing + post', 'rotor-bearing', circle([0, 0], R.bearing.ringOuter), Z.rotorBearing);
add('rotor hub', 'rotor', ring([0, 0], R.bearing.ringOuter + 0.05, R.hubRadius), Z.rotorHub);
add('rotor web', 'rotor', ring([0, 0], R.hubRadius, R.bandInner), Z.rotorWeb);
add('rotor band', 'rotor', ring([0, 0], R.bandInner, R.skirtInner), Z.rotor);
add('rotor skirt', 'rotor', ring([0, 0], R.skirtInner, R.radius), Z.rotorSkirt);
head(`3. Vertical stack: ${solids.length} solids, plan overlap ⇒ disjoint z (grid ${STEP} mm)`);
const meantSet = new Set(MEANT.map(([a, b]) => `${a}|${b}`));
const isMeant = (a, b) => meantSet.has(`${a}|${b}`) || meantSet.has(`${b}|${a}`);
const assembledContacts = new Set();
let collisions = 0;
for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const A = solids[i], Bs = solids[j];
    if (A.part === Bs.part && !isMeant(A.id, Bs.id)) continue; // inside one part: its builder's business
    const n = overlap(A, Bs);
    if (!n) continue;
    assembledContacts.add(`${A.id}|${Bs.id}`);
    if (isMeant(A.id, Bs.id)) continue;
    collisions++;
    err(`${A.id} [${A.part}] ∩ ${Bs.id} [${Bs.part}]: ${n} samples (${(n * STEP * STEP).toFixed(3)} mm²)`);
  }
}
if (!collisions) ok('no unintended overlaps at assembly');
for (const [a, b] of MEANT) {
  if (!assembledContacts.has(`${a}|${b}`) && !assembledContacts.has(`${b}|${a}`)) warn(`intended contact ${a} ↔ ${b} does not overlap (check the engagement)`);
}
// ------------------------------------------------------------------ 4. explode sweep
head('4. Explode sweep (registry easing + SPEC.explodeDelay): nothing passes through anything');
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const offAt = (part, e) => {
  const v = S.explode[part] || [0, 0, 0];
  const d = S.explodeDelay(part);
  const local = Math.min(1, Math.max(0, (e - d * 0.45) / 0.55));
  const k = ease(local);
  return [v[0] * k, v[1] * k, v[2] * k];
};
const HIDDEN = new Set([...(DESCRIPTOR.explodeHide || []), DESCRIPTOR.solidCaseback].filter(Boolean));
let crossings = 0;
const seen = new Set();
for (let s = 1; s <= 48; s++) {
  const e = s / 48;
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const A = solids[i], Bs = solids[j];
      if (A.part === Bs.part) continue;
      const key = `${A.id}|${Bs.id}`;
      if (assembledContacts.has(key) || seen.has(key)) continue;
      const n = overlap(A, Bs, offAt(A.part, e), offAt(Bs.part, e));
      if (!n) continue;
      seen.add(key);
      // parts the UI fades out (bracelet, solid case back) only need to get out of the way
      const soft = HIDDEN.has(A.part) || HIDDEN.has(Bs.part);
      if (soft) { warn(`explode ${e.toFixed(3)}: ${A.id} [${A.part}] meets ${Bs.id} [${Bs.part}] (faded part)`); continue; }
      crossings++;
      err(`explode ${e.toFixed(3)}: ${A.id} [${A.part}] passes through ${Bs.id} [${Bs.part}] (${n} samples)`);
    }
  }
}
// assembled contacts must come apart at full explosion — except pairs that are exploded as
// one unit on purpose (same offset and delay, e.g. a meshing pair lifted together)
const sameMove = (a, b) => {
  const va = S.explode[a] || [0, 0, 0], vb = S.explode[b] || [0, 0, 0];
  return va.every((v, i) => Math.abs(v - vb[i]) < 1e-9) && Math.abs(S.explodeDelay(a) - S.explodeDelay(b)) < 1e-9;
};
for (const key of assembledContacts) {
  const [a, b] = key.split('|');
  const A = solids.find((s) => s.id === a), Bs = solids.find((s) => s.id === b);
  if (A.part === Bs.part || sameMove(A.part, Bs.part)) continue;
  const n = overlap(A, Bs, offAt(A.part, 1), offAt(Bs.part, 1));
  if (n) { crossings++; err(`full explode: ${a} [${A.part}] still touches ${b} [${Bs.part}]`); }
}
if (!crossings) ok('no part passes through another while exploding; every contact separates');
// ------------------------------------------------------------------ 5. planned part ids
head('5. Planned part ids (plan.md) ↔ explode table ↔ descriptor');
const all = Object.values(PLAN).flat();
const dup = all.filter((id, i) => all.indexOf(id) !== i);
(dup.length ? err : ok)(`${all.length} planned part ids, ${dup.length ? `duplicates: ${dup.join(', ')}` : 'all unique'}`);
const STAY = new Set(['main-plate', 'jewels', 'plate-engravings']); // ride with the plate (explode 0)
const missing = all.filter((id) => !S.explode[id] && !STAY.has(id));
(missing.length ? err : ok)(`explode entries: ${missing.length ? `missing ${missing.join(', ')}` : 'all present'}`);
const extra = Object.keys(S.explode).filter((id) => !all.includes(id));
(extra.length ? warn : ok)(`explode entries without a planned part: ${extra.join(', ') || 'none'}`);
const badDelay = all.filter((id) => { const d = S.explodeDelay(id); return !(d >= 0 && d <= 0.95); });
(badDelay.length ? err : ok)(`explodeDelay in [0, 0.95] for every part${badDelay.length ? `: ${badDelay.join(', ')}` : ''}`);
for (const id of [...DESCRIPTOR_IDS.spotlight, ...DESCRIPTOR_IDS.closeup, ...DESCRIPTOR_IDS.winding, ...DESCRIPTOR.explodeHide, DESCRIPTOR.solidCaseback].filter(Boolean)) {
  if (!all.includes(id)) err(`descriptor names "${id}", which no module plans to register`);
}
ok(`descriptor ids (spotlight ${DESCRIPTOR_IDS.spotlight.length}, closeup, winding, explodeHide, solidCaseback) are all planned`);
const zs = Object.values(S.explode).map((v) => v[2]);
console.log(`  span: dial side up to +${Math.max(...zs)} mm, movement side down to ${Math.min(...zs)} mm`);
// ------------------------------------------------------------------ 6. misc geometry
head('6. Seams and details');
// hands sit on their pipes: bore just over the pipe, pipe top just under the collet top
for (const [hand, pipe, top] of [['hour', 'hour', 'hourPipeTop'], ['gmt', 'gmt', 'gmtPipeTop'], ['minute', 'cannon', 'cannonPipeTop']]) {
  const h = S.hands[hand], p = S.pipes[pipe];
  const colletTop = h.z + h.collet.height;
  const okBore = h.bore > p[1] && h.bore - p[1] < 0.05;
  const okTop = Z[top] < colletTop && colletTop - Z[top] < 0.06 && Z[top] > h.z;
  (okBore && okTop ? ok : err)(`${hand} hand bore ${h.bore} on pipe r ${p[1]}; pipe top ${f3(Z[top])} under collet top ${f3(colletTop)}`);
}
{
  const s = S.hands.seconds, a = S.pipes.secondsArbor;
  (s.bore > a && Z.secondsArborTop > s.z && Z.secondsArborTop < s.z + s.boss.height + 0.1 ? ok : err)(`seconds hand bore ${s.bore} on the fourth-wheel arbor r ${a}, arbor top ${f3(Z.secondsArborTop)}`);
}
// nested pipes leave room for each other
const pp = S.pipes;
(pp.hour[0] > pp.gmt[1] && pp.gmt[0] > pp.cannon[1] && pp.cannon[0] > pp.secondsArbor ? ok : err)(`pipes nest: seconds ${pp.secondsArbor} < cannon ${pp.cannon} < 24 h ${pp.gmt} < hour ${pp.hour}`);
// crown on the stem axis
(Math.abs(S.case.crown.axisZ - Z.stemAxis) < 1e-9 ? ok : err)(`crown axis z ${f3(S.case.crown.axisZ)} = stem axis (Z_case ${f3(Z.stemAxis + (S.case.profile[0][1] === Z.caseBottom ? -Z.caseBottom : 0))})`);
// rotor clears the solid back; the movement fits the case bore
(Z.rotor[0] - Z.casebackInner > 0.25 ? ok : err)(`rotor back face ${f3(Z.rotor[0])} is ${f3(Z.rotor[0] - Z.casebackInner)} above the case-back inner face ${f3(Z.casebackInner)}`);
(S.movement.radius < S.case.middle.boreRadius ? ok : err)(`movement r ${S.movement.radius} inside the case bore r ${S.case.middle.boreRadius}`);
// total movement height
const hTot = Z.dialSeat - Z.rotor[0];
(Math.abs(hTot - S.movement.height) < 0.02 ? ok : err)(`movement height: dial seat ${f3(Z.dialSeat)} … rotor ${f3(Z.rotor[0])} = ${f3(hTot)} (official ${S.movement.height})`);
// date disc: the jumper beak sits in a tooth gap at every whole date
{
  const d = S.date.disc;
  const gap = ((((d.jumperDeg - d.toothDeg0) / d.stepDeg) % 1) + 1) % 1;
  (Math.abs(gap - 0.5) < 1e-9 ? ok : err)(`date jumper at ${f3(d.jumperDeg)}° sits in a gap (tooth phase ${f3(gap)})`);
  (Math.abs(d.windowDeg - 90.103) < 0.01 ? ok : err)(`numeral 1 at the window (${f3(d.windowDeg)}°) when rot.date = 0`);
}
// rotor heavy side on local −Y: centroid of the half-disc minus the windows
{
  const R = S.rotor, N = 360;
  let ax = 0, ay = 0, A = 0;
  const half = (R.sectorDeg / 2) * DEG;
  for (let i = 0; i < N; i++) { // fan of the sector about local −Y, r hub … radius
    const a0 = -Math.PI / 2 - half + (2 * half * i) / N, a1 = a0 + (2 * half) / N;
    const am = (a0 + a1) / 2, dA = (a1 - a0) * (R.radius ** 2 - R.hubRadius ** 2) / 2;
    const rc = (2 / 3) * (R.radius ** 3 - R.hubRadius ** 3) / (R.radius ** 2 - R.hubRadius ** 2);
    ax += dA * rc * Math.cos(am); ay += dA * rc * Math.sin(am); A += dA;
  }
  for (const w of Object.values(R.windows)) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < w.length; i++) { const p = w[i], q = w[(i + 1) % w.length], c = p[0] * q[1] - q[0] * p[1]; a += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }
    a /= 2; cx /= 6 * a; cy /= 6 * a;
    ax -= Math.abs(a) * cx; ay -= Math.abs(a) * cy; A -= Math.abs(a);
  }
  const gx = ax / A, gy = ay / A;
  (gy < -3 && Math.abs(gx) < 0.6 ? ok : err)(`rotor centroid (${f3(gx)}, ${f3(gy)}) — the heavy side is local −Y`);
}
// the stem passes through the case wall: it must be out of it before the middle case lifts
{
  const eStart = S.explodeDelay('case-body') * 0.45; // the registry starts a part at 0.45 × delay
  const stemX0 = S.keyless.stemInnerX; // inner end of the stem at assembly (dialworks)
  const off = (id, e) => { const d = S.explodeDelay(id), l = Math.min(1, Math.max(0, (e - d * 0.45) / 0.55)); const k = l < 0.5 ? 4 * l ** 3 : 1 - (-2 * l + 2) ** 3 / 2; return (S.explode[id] || [0, 0, 0])[0] * k; };
  const x = stemX0 + off('winding-stem', eStart);
  (x > S.case.radius + 0.2 ? ok : err)(`stem inner end at x ${f3(x)} when the middle case starts to lift (case wall r ${S.case.radius})`);
  const crownIn = S.case.crown.from + off('crown', 1), stemOut = S.case.crown.stemEnd + off('winding-stem', 1);
  (crownIn > stemOut ? ok : err)(`exploded crown (inner face x ${f3(crownIn)}) clears the stem end (x ${f3(stemOut)})`);
}
// escapement geometry (movement.md §5.4: the line of centres is bent ≈18.6°)
{
  const E = S.escapement;
  const a1 = Math.atan2(L.pallet[1] - L.escape[1], L.pallet[0] - L.escape[0]) / DEG, a2 = Math.atan2(L.balance[1] - L.pallet[1], L.balance[0] - L.pallet[0]) / DEG;
  const bend = Math.abs(((a2 - a1 + 540) % 360) - 180);
  (Math.abs(bend - 18.6) < 1 ? ok : err)(`escapement line: escape→pallet ${f3(a1)}°, pallet→balance ${f3(a2)}°, bent ${f3(bend)}° (report 18.6°)`);
  console.log(`  escape tip r ${f3(E.escapeTipRadius)}, pallet–escape ${f3(E.palletToEscape)}, pallet–balance ${f3(E.palletToBalance)}, roller jewel r ${f3(E.rollerJewelRadius)}`);
  const want = { entry: B(-1.32, -5.12), exit: B(-3.62, -5.83) };
  for (const k of ['entry', 'exit']) {
    const p = E[`${k}Contact`], d = hyp(p, want[k]);
    (d < 0.05 ? ok : err)(`${k} stone contact [${f3(p[0])}, ${f3(p[1])}] vs report [${f3(want[k][0])}, ${f3(want[k][1])}] (Δ ${f3(d)})`);
  }
  (E.escapeTipRadius < E.palletToEscape - 0.3 ? ok : err)(`escape tips clear the pallet arbor by ${f3(E.palletToEscape - E.escapeTipRadius)}`);
  const clr = hyp(L.third, L.center) - wheelTip(TR.fourth.teeth, MD.fourth) - pinionTip(TR.third.pinion, MD.center);
  (clr > 0.03 ? ok : err)(`third pinion clears the fourth wheel's tips by ${f3(clr)} (the third arbor straddles the fourth wheel's level)`);
  const bal = E.balance.radius + E.balance.inertiaScrews.protrusion;
  (S.frame.balanceOpening.radius - bal > 0.2 ? ok : err)(`balance with its inertia screws (r ${f3(bal)}) swings ${f3(S.frame.balanceOpening.radius - bal)} inside the bridges' opening`);
}
// automatic: the kinematics ratio is the drawn train's ratio
{
  const A = S.autoTrain, want = (A.rotorGear.teeth / A.reverserA.teeth) * (A.reverserB.pinion / A.reductionWheel.teeth) * (A.reductionWheel.pinion / S.keyless.ratchet.teeth);
  (Math.abs(S.automatic.ratchetPerRotorRad - want) < 1e-12 ? ok : err)(`ratchetPerRotorRad ${S.automatic.ratchetPerRotorRad.toFixed(5)} = (60/30)(8/64)(20/55) of the drawn automatic train (1/${f3(1 / want)})`);
  const turns = 1 / (S.automatic.windPerRad * TAU);
  console.log(`  ${f3(turns)} rotor turns wind the barrel from empty to full (${f3(S.barrelTurns)} barrel turns)`);
}

console.log(`
${errors ? 'FAILED' : 'PASSED'}: ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
