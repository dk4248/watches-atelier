import { $, h, pad2, setText, fmtInt } from './util.js';

// Heads-up display: watch name, live time, rate status, beat counter, power reserve
// gauge. setWatch() re-targets it at another watch; text is written at most ~10 times
// a second.

export function createHUD(ctx, deps) {
  const titleEl = $('title');
  const subEl = $('sub');
  const clockEl = $('clock');
  const pillEl = $('pill');
  const beatsEl = $('beats');
  const bphEl = $('bph');
  const beatWrap = $('beat-l');
  const beatEl = $('beat-n');
  const reserveEl = $('reserve-val');
  const fillEl = $('gauge-fill');
  const gaugeEl = $('gauge');
  const windBtn = $('wind-btn');
  let H = 48; // power reserve, hours
  let showBeats = true;
  let acc = 1;
  let lastFill = -1;

  windBtn?.addEventListener('click', () => deps.onWind());

  function setWatch(w) {
    const spec = (w && w.spec) || {};
    setText(titleEl, (w && (w.title || w.model)) || '');
    // "ref. 139 · caliber DUW 4001" → one span per item (phones stack them)
    if (subEl) {
      subEl.textContent = '';
      const items = String((w && w.subtitle) || '').split(/\s*·\s*/).filter(Boolean);
      items.forEach((s, i) => {
        if (i) subEl.append(h('span', { class: 'sep' }, ' · '));
        subEl.append(h('span', null, s));
      });
    }
    // rate line: beats per hour of a lever escapement, or the Spring Drive glide wheel
    const T = spec.timing || {};
    const springDrive = (T.type || 'lever') !== 'lever';
    showBeats = !springDrive;
    beatsEl?.classList.toggle('sd', springDrive);
    if (springDrive) setText(bphEl, `Spring Drive · glide wheel ${T.glideHz || 8} Hz`);
    else setText(bphEl, `${fmtInt(T.beatsPerHour || 21600)} A/h · `);
    if (beatWrap) beatWrap.hidden = springDrive;
    H = spec.powerReserveHours || 48;
    if (gaugeEl) {
      gaugeEl.setAttribute('aria-valuemax', String(H));
      // the tick marks one day of reserve
      gaugeEl.style.setProperty('--tick', H > 24 ? `${((24 / H) * 100).toFixed(1)}%` : '-10px');
    }
    lastFill = -1;
    acc = 1;
  }

  function status(state) {
    if (state.live) return ['Live', 'live'];
    if (state.catchingUp) return ['Catching up…', 'catch'];
    const s = state.scale;
    if (s < 1) return [`Slow motion ×${s}`, 'slow'];
    return [`Time-lapse ×${s}`, 'fast'];
  }

  function update(state, dt) {
    acc += dt;
    if (acc < 0.1) return;
    acc = 0;
    const d = state.date;
    if (d && clockEl) {
      const tenth = Math.floor(d.getMilliseconds() / 100);
      setText(clockEl, `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${tenth}`);
      if (d.getMilliseconds() < 100 || !clockEl.dateTime) clockEl.setAttribute('datetime', d.toISOString());
    }
    const [label, kind] = status(state);
    setText(pillEl, label);
    if (pillEl && pillEl.dataset.s !== kind) pillEl.dataset.s = kind;
    if (showBeats) {
      // state.P counts from 1970; kinematics exposes beatToday (since local midnight) for display.
      const beats = Number.isFinite(state.beatToday) ? state.beatToday : Math.floor(state.P || 0);
      setText(beatEl, fmtInt(Math.max(0, beats)));
    }
    const r = Math.max(0, Math.min(1, state.reserve ?? 0));
    setText(reserveEl, `${Math.round(r * H)} h of ${H} h`);
    const f = Math.round(r * 400) / 400;
    if (f !== lastFill && fillEl) {
      lastFill = f;
      fillEl.style.transform = `scaleX(${f})`;
      gaugeEl?.setAttribute('aria-valuenow', String(Math.round(r * H)));
    }
  }

  if (ctx.watch) setWatch(ctx.watch);

  return {
    update,
    setWatch,
    setWinding(on) {
      // a momentary action, not a toggle: show progress without aria-pressed
      windBtn?.classList.toggle('busy', on);
    },
  };
}
