// Time → the angle of every moving part.
//
// Everything is derived from ONE quantity: the train position P, counted in the
// regulator's own steps since 1970 local time. For a lever escapement P is the number
// of beats released (6 per second at 21,600 A/h, 8 at 28,800) and advances in
// discrete steps, exactly like the real escape wheel. For Spring Drive P counts glide-
// wheel turns and advances continuously. Hands, train, escapement, balance, date and
// GMT hand are all functions of P, so they can never drift apart and the hands always
// show the real local time.
//
// Rotation convention: values in `rot` are three.js rotation.z angles in the WORLD
// frame where +Z points out of the dial towards the viewer (positive = counter-
// clockwise as seen from the dial side). Hands turn clockwise, so their angles are
// negative and grow more negative.
//
// One kinematics object lives for the whole session; configure(spec) re-targets it
// at another watch so code holding a reference (the UI) keeps working.
//
// Spec inputs (all optional except timing):
//   timing   { type: 'lever' | 'springdrive', beatsPerHour, amplitudeDeg, liftDeg,
//              forkHalfDeg }  |  { type: 'springdrive', glideHz }
//   train    Tangente-style tooth counts { barrel, center, third, fourth, escape,
//            cannon, minuteWheel, hourWheel } → arbors computed from the teeth
//   arbors   { key: { period: seconds per turn, dir: ±1 } } extra driven arbors
//   keyless  { ratchet, crownWheel, windingPinion } tooth counts → manual winding
//   automatic { naturalPeriod, damping, windPerRad, ratchetPerRotorRad } → rotor
//   gmtOffsetHours  offset of the 24-hour hand from local time (default 0)
//   powerReserveHours, barrelTurns, id (storage key)

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const frac = (x) => x - Math.floor(x);

// Escape-wheel motion inside one impulse window (r: 0 → 1).
// ~80% of the half-pitch advance happens while the tooth slides over the pallet
// impulse face, the rest is the "drop" onto the other pallet.
function stepEase(r) {
  if (r <= 0) return 0;
  if (r >= 1) return 1;
  if (r < 0.82) {
    const s = r / 0.82;
    return 0.8 * (s * s * (3 - 2 * s) * 0.35 + s * 0.65);
  }
  const s = (r - 0.82) / 0.18;
  return 0.8 + 0.2 * (1 - (1 - s) * (1 - s));
}

export function createKinematics(initialSpec) {
  // ----- clock (persists across watches) -----
  let virtualMs = Date.now();
  let lastPerf = performance.now();
  let scale = 1;
  let live = true;
  let catchUp = false;
  let tzOffsetMs = new Date().getTimezoneOffset() * 60000;
  let tzCheckedAt = 0;

  // ----- per-watch configuration -----
  const bpr = {}; // beats (P units) per revolution, per arbor key
  const dir = {}; // rotation sense seen from the dial (+1 CCW, −1 CW)
  const state = { rot: {}, bpr, dir };
  let spec, T, lever, B, f, liftHalf, forkHalf, kw, crownWheelPerRatchet, stemPerCrownWheel;
  let RESERVE_H, storageKey, auto, gmtOffset;

  // ----- winding / power / rotor (reset per watch) -----
  let windAngle = 0; // accumulated ratchet rotation (rad), crown + rotor
  let manualAngle = 0; // ratchet rotation from the crown only (drives crown wheel / stem)
  let reserve = 0.92; // 0..1 state of wind
  let windVel = 0; // crown speed while being turned, for the click animation
  let rotor = 0, rotorVel = 0; // automatic rotor angle (rad) and angular velocity
  const gravity = { x: 0, y: -1 }; // apparent gravity projected on the movement plane
  let rotorImpulse = 0;
  let lastDay = -1, dayFrom = 0, dayTo = 0, dayChangeAt = -1e9;

  function configure(next) {
    spec = next;
    T = spec.timing;
    lever = (T.type || 'lever') === 'lever';
    for (const k of Object.keys(bpr)) delete bpr[k];
    for (const k of Object.keys(dir)) delete dir[k];
    for (const k of Object.keys(state.rot)) delete state.rot[k];

    if (lever) {
      B = T.beatsPerHour / 3600; // beats per second
      f = B / 2; // balance frequency, Hz
      liftHalf = ((T.liftDeg ?? 50) * Math.PI) / 360;
      forkHalf = ((T.forkHalfDeg ?? 6.75) * Math.PI) / 180;
    } else {
      B = T.glideHz || 8; // P counts glide-wheel turns
      f = 0;
      bpr.glide = 1;
      dir.glide = T.glideDir ?? -1;
    }

    // Arbors from tooth counts (lever trains described like the Tangente's).
    const tr = spec.train;
    if (tr && tr.escape && tr.fourth && tr.third && tr.center) {
      bpr.escape = 2 * tr.escape.teeth;
      bpr.fourth = (bpr.escape * tr.fourth.teeth) / tr.escape.pinion;
      bpr.third = (bpr.fourth * tr.third.teeth) / tr.fourth.pinion;
      bpr.center = (bpr.third * tr.center.teeth) / tr.third.pinion;
      if (tr.barrel) bpr.barrel = (bpr.center * tr.barrel.teeth) / tr.center.pinion;
      Object.assign(dir, { barrel: 1, center: -1, third: 1, fourth: -1, escape: 1 });
    }
    if (tr && tr.cannon && tr.minuteWheel && tr.hourWheel) {
      bpr.cannon = bpr.center ?? 3600 * B;
      bpr.minuteWheel = (bpr.cannon * tr.minuteWheel.teeth) / tr.cannon.teeth;
      bpr.hourWheel = (bpr.minuteWheel * tr.hourWheel.teeth) / tr.minuteWheel.pinion;
      Object.assign(dir, { cannon: -1, minuteWheel: 1, hourWheel: -1 });
    }
    // Extra arbors given directly as periods.
    for (const [key, a] of Object.entries(spec.arbors || {})) {
      bpr[key] = a.bpr ?? a.period * B;
      dir[key] = a.dir ?? 1;
    }
    const expect = { fourth: 60 * B, center: 3600 * B, hourWheel: 43200 * B };
    if (lever) {
      for (const k of Object.keys(expect)) {
        if (bpr[k] !== undefined && Math.abs(bpr[k] - expect[k]) > 1e-6) {
          console.warn(`[kinematics] ${k}: ${bpr[k]} beats/rev, expected ${expect[k]} — check tooth counts`);
        }
      }
    }

    kw = spec.keyless || null;
    crownWheelPerRatchet = kw ? kw.ratchet.teeth / kw.crownWheel.teeth : 1;
    stemPerCrownWheel = kw ? kw.crownWheel.teeth / kw.windingPinion.teeth : 1;

    auto = spec.automatic || null;
    gmtOffset = spec.gmtOffsetHours || 0;
    RESERVE_H = spec.powerReserveHours || 48;
    storageKey = spec.id ? `watch.${spec.id}.lastWound` : 'tangente.lastWound';

    windAngle = 0;
    manualAngle = 0;
    windVel = 0;
    rotor = 0;
    rotorVel = 0;
    rotorImpulse = 0;
    reserve = 0.92;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) reserve = clamp(1 - (Date.now() - Number(raw)) / 3.6e6 / RESERVE_H, 0.12, 1);
    } catch { /* storage unavailable: keep default */ }
    lastDay = -1;

    Object.assign(state, {
      B, f, lever, springDrive: !lever, reserve, windAngle: 0, clickLift: 0,
      balance: 0, fork: 0, amplitude: 0, impulse: 0, rotorVel: 0,
    });
    return state;
  }

  function saveWind() {
    try { localStorage.setItem(storageKey, String(Date.now() - (1 - reserve) * RESERVE_H * 3.6e6)); } catch { /* ignore */ }
  }

  function setTimeScale(s) {
    if (s === 1) { goLive(); return; }
    live = false;
    scale = s;
  }
  // Returning from slow motion / time-lapse spins the train back to real time
  // (a visible "catch up"); otherwise live mode is locked to the system clock.
  function goLive() {
    if (!live) catchUp = true;
    live = true;
    scale = 1;
  }

  // Turn the crown: dθ in radians of crown rotation (positive = winding direction).
  function wind(dCrown) {
    if (dCrown <= 0 || !kw) return;
    const dRatchet = dCrown / stemPerCrownWheel / crownWheelPerRatchet;
    windAngle += dRatchet;
    manualAngle += dRatchet;
    // ~ (barrel turns for full reserve) of ratchet rotation fills the spring.
    reserve = clamp(reserve + dRatchet / (TAU * (spec.barrelTurns || 7)), 0, 1);
    windVel = dCrown;
    saveWind();
  }

  // Apparent gravity in the movement plane (watch frame, unit-ish vector; its length
  // is how much of gravity lies in the plane — 0 when the watch lies flat).
  function setGravity(x, y) { gravity.x = x; gravity.y = y; }
  // Kick the rotor (rad/s), e.g. when the user swings the watch around.
  function addRotorImpulse(w) { if (auto) rotorImpulse += w; }

  function updateRotor(dt) {
    if (!auto) return;
    const w0 = TAU / (auto.naturalPeriod || 1.1);
    const zeta = auto.damping ?? 0.18;
    const g = Math.hypot(gravity.x, gravity.y);
    // Mass sits at the rotor's local −Y: angle of the mass direction = rotor − π/2.
    const gAng = Math.atan2(gravity.y, gravity.x);
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    const before = rotor;
    rotorVel += rotorImpulse;
    rotorImpulse = 0;
    for (let i = 0; i < steps; i++) {
      const torque = w0 * w0 * g * Math.sin(gAng - (rotor - Math.PI / 2));
      const fric = Math.sign(rotorVel) * Math.min(Math.abs(rotorVel), 0.6 * h * 60) * 0.02; // bearing drag
      rotorVel += (torque - 2 * zeta * w0 * rotorVel) * h - fric;
      rotor += rotorVel * h;
    }
    const moved = Math.abs(rotor - before);
    if (moved > 0) {
      // Bidirectional winding: every swing tightens the mainspring a little.
      reserve = clamp(reserve + moved * (auto.windPerRad ?? 0.00004), 0, 1);
      windAngle += moved * (auto.ratchetPerRotorRad ?? 1 / 120);
    }
  }

  function update() {
    const perf = performance.now();
    const dt = Math.min(0.25, (perf - lastPerf) / 1000);
    lastPerf = perf;
    const realMs = Date.now();

    if (!live) {
      virtualMs += dt * 1000 * scale;
    } else if (catchUp) {
      // Ease towards real time; frame-rate independent and guaranteed to finish
      // (at most ~1.5 s), however slowly frames arrive.
      const gap = realMs - virtualMs;
      const k = 1 - Math.exp(-dt / 0.3);
      virtualMs += gap * k + Math.sign(gap) * Math.min(Math.abs(gap), dt * 1000 * 0.5);
      if (Math.abs(realMs - virtualMs) < 40 || Math.abs(gap) > 6 * 3600 * 1000) {
        virtualMs = realMs;
        catchUp = false;
      }
    } else {
      virtualMs = realMs; // live: exactly the system clock
    }

    if (perf - tzCheckedAt > 1000) {
      tzOffsetMs = new Date(virtualMs).getTimezoneOffset() * 60000;
      tzCheckedAt = perf;
    }

    const localSec = (virtualMs - tzOffsetMs) / 1000;
    const Pc = localSec * B; // continuous count
    const rot = state.rot;

    if (live) reserve = clamp(reserve - (dt * scale) / (RESERVE_H * 3600), 0.1, 1);
    updateRotor(dt * Math.min(scale, 4));

    let P;
    if (lever) {
      const phase = frac(Pc / 2); // balance phase 0..1
      // Amplitude falls a little as the mainspring lets down.
      const A = ((T.amplitudeDeg * (0.82 + 0.18 * reserve)) * Math.PI) / 180;
      const w = Math.asin(Math.min(1, liftHalf / A)) / (TAU * f); // half impulse window, s
      const k = Math.round(Pc);
      const d = (Pc - k) / B;
      if (d >= w) P = k;
      else if (d <= -w) P = k - 1;
      else P = k - 1 + stepEase((d + w) / (2 * w));
      const balance = A * Math.sin(TAU * phase);
      rot.balance = balance;
      rot.fork = -clamp(balance / liftHalf, -1, 1) * forkHalf;
      state.phase = phase;
      state.balance = balance;
      state.fork = rot.fork;
      state.amplitude = A;
      state.impulse = Math.abs(d) < w ? 1 - Math.abs(d) / w : 0;
      state.beat = k;
    } else {
      P = Pc; // Spring Drive: the glide wheel turns smoothly
      state.beat = Math.floor(Pc);
      state.phase = frac(Pc);
    }

    for (const key of Object.keys(bpr)) {
      const per = bpr[key];
      rot[key] = dir[key] * TAU * ((P % per + per) % per) / per;
    }

    // Keyless works (ratchet = barrel arbor; turns only when winding).
    windVel *= Math.exp(-dt / 0.08);
    // Winding turns the barrel arbor in the drum's running sense: CCW seen from the
    // dial (CW seen through the case back). The crown wheel turns the other way.
    rot.ratchet = windAngle;
    // The crown wheel, stem and crown only move when the watch is wound by hand; on an
    // automatic the rotor winds the ratchet through its own train (crown stays still).
    rot.crownWheel = -manualAngle * crownWheelPerRatchet;
    // Crown and stem turn clockwise seen end-on from the crown when winding: a
    // negative rotation about +X (right-hand rule). Equals rot.crownWheel × crown/winding teeth.
    rot.stem = -manualAngle * crownWheelPerRatchet * stemPerCrownWheel;
    if (kw) {
      const teethPassed = (windAngle / TAU) * kw.ratchet.teeth;
      state.clickLift = windVel > 0.01 || Math.abs(rotorVel) > 0.3 ? teethPassed - Math.floor(teethPassed) : 0;
    }
    rot.rotor = rotor;
    state.rotorVel = rotorVel;

    // Hands (CW from 12 o'clock, so negative rotation.z). Time T in seconds as the
    // train sees it: stepped for a lever escapement, smooth for Spring Drive.
    const Tt = P / B;
    rot.hourHand = bpr.hourWheel ? rot.hourWheel : -TAU * frac(Tt / 43200);
    rot.minuteHand = bpr.cannon ? rot.cannon : -TAU * frac(Tt / 3600);
    rot.secondHand = bpr.fourth && lever && !spec.centralSecondsKey ? rot.fourth : -TAU * frac(Tt / 60);
    rot.hand24 = -TAU * frac((Tt + gmtOffset * 3600) / 86400);

    // Date: day of month, with a quick (1.2 s) mechanical jump at local midnight.
    const date = new Date(virtualMs);
    const day = date.getDate();
    if (lastDay < 0) { lastDay = day; dayFrom = day - 1; dayTo = day - 1; }
    if (day !== lastDay) {
      dayFrom = state.datePos ?? lastDay - 1;
      dayTo = day - 1;
      if (dayTo < dayFrom) dayTo += 31; // always move forward
      dayChangeAt = perf;
      lastDay = day;
    }
    const dc = spec.dateChange;
    if (dc && dc.type === 'drag') {
      // Dragging date works (e.g. NOMOS's ring date): the indication creeps over
      // `durationSec`, centred on local midnight, instead of jumping.
      const sod = ((localSec % 86400) + 86400) % 86400;
      const half = (dc.durationSec || 1800) / 2;
      let pos = day - 1;
      if (sod >= 86400 - half) pos += (sod - (86400 - half)) / (2 * half); // 0 → ½ before midnight
      else if (sod < half) pos -= 1 - (sod + half) / (2 * half); // −½ → 0 after midnight
      state.datePos = ((pos % 31) + 31) % 31;
    } else {
      const u = clamp((perf - dayChangeAt) / 1200, 0, 1);
      const e = u * u * (3 - 2 * u);
      state.datePos = (dayFrom + (dayTo - dayFrom) * e) % 31; // 0 = "1", continuous
    }
    state.day = day;
    rot.date = -TAU * (state.datePos / 31);

    state.live = live && !catchUp;
    state.catchingUp = live && catchUp;
    state.scale = live ? 1 : scale;
    state.ms = virtualMs;
    state.date = date;
    state.localSec = localSec;
    state.P = P;
    // beats released since local midnight (for display; P itself counts from 1970)
    state.beatToday = Math.floor(((P % (B * 86400)) + B * 86400) % (B * 86400));
    state.reserve = reserve;
    state.windAngle = windAngle;
    state.manualWindAngle = manualAngle;
    state.dt = dt;
    return state;
  }

  configure(initialSpec);
  return {
    update, configure, setTimeScale, goLive, wind, setGravity, addRotorImpulse, state, bpr, dir,
    get spec() { return spec; },
  };
}
