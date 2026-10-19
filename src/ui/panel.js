import { $, h, DEG, setText, categoryName, humanDuration } from './util.js';

// Info panel for the selected part: right-hand column on desktop, bottom sheet on
// phones. The live line is refreshed at ~10 Hz.

// Hands are driven by their wheels; map them for the "1 turn every…" readout.
const BPR_ALIAS = { hourHand: 'hourWheel', minuteHand: 'cannon', secondHand: 'fourth' };
// Hands of a watch whose train isn't given as tooth counts (e.g. Spring Drive).
const HAND_PERIOD = { hourHand: 43200, minuteHand: 3600, secondHand: 60, hand24: 86400 };

function turnText(per, dir, rot) {
  const deg = ((((dir * rot) / DEG) % 360) + 360) % 360;
  return `1 turn every ${humanDuration(per)} · ${deg.toFixed(1)}° ${dir < 0 ? 'clockwise' : 'counter-clockwise'}`;
}

export function liveText(part, state, kin) {
  if (!part || !state) return '';
  if (typeof part.live === 'function') {
    try { return String(part.live(state) ?? ''); } catch { return ''; }
  }
  const key = part.drive && part.drive.key;
  if (!key) return '';
  const bk = kin.bpr && kin.bpr[key] ? key : BPR_ALIAS[key];
  if (bk && kin.bpr && kin.bpr[bk] && state.B) {
    const per = kin.bpr[bk] / state.B;
    const dir = (kin.dir && kin.dir[bk]) || 1;
    return turnText(per, dir, state.rot[key] ?? state.rot[bk] ?? 0);
  }
  if (HAND_PERIOD[key]) return turnText(HAND_PERIOD[key], -1, state.rot[key] ?? 0);
  if (key === 'rotor') {
    const v = state.rotorVel || 0;
    const wound = `${Math.round((state.reserve ?? 0) * 100)}% wound`;
    if (Math.abs(v) < 0.05) return `Hanging at rest · ${wound}`;
    return `Swinging ${Math.abs(v / DEG).toFixed(0)}°/s ${v < 0 ? 'clockwise' : 'counter-clockwise'} · ${wound}`;
  }
  if (key === 'balance') {
    return `Amplitude ±${(state.amplitude / DEG).toFixed(0)}° · now ${(state.balance / DEG).toFixed(0).padStart(4, ' ')}°`;
  }
  if (key === 'fork') return `Fork at ${(state.fork / DEG).toFixed(1)}° · ${state.impulse > 0 ? 'impulse' : 'locked'}`;
  if (key === 'ratchet' || key === 'crownWheel' || key === 'stem') {
    const auto = kin.spec && kin.spec.automatic;
    return `Turns only while winding${auto ? ' (crown or rotor)' : ''} · ${Math.round(state.reserve * 100)}% wound`;
  }
  return '';
}

export function createPanel(ctx, deps) {
  const { kin } = ctx;
  const el = $('panel');
  const catEl = $('panel-cat');
  const nameEl = $('panel-name');
  const descEl = $('panel-desc');
  const liveEl = $('panel-live');
  const factsEl = $('panel-facts');
  const windBtn = $('panel-wind');
  let part = null;
  let acc = 1;

  $('panel-close')?.addEventListener('click', () => close());
  $('panel-focus')?.addEventListener('click', () => { if (part) deps.onFocus(part); });
  windBtn?.addEventListener('click', () => deps.onWind());

  let returnFocus = null;

  function open(p) {
    if (!el || !p) return;
    if (!el.contains(document.activeElement)) returnFocus = document.activeElement;
    part = p;
    setText(catEl, categoryName(p.category));
    setText(nameEl, p.name || p.id);
    setText(descEl, p.description || '');
    descEl.hidden = !p.description;
    factsEl.textContent = '';
    const facts = p.facts || {};
    for (const k of Object.keys(facts)) {
      factsEl.append(h('tr', null, h('th', { scope: 'row' }, k), h('td', null, String(facts[k]))));
    }
    factsEl.hidden = !factsEl.childElementCount;
    windBtn.hidden = p.id !== 'crown';
    acc = 1;
    setText(liveEl, liveText(p, kin.state, kin));
    liveEl.hidden = !liveEl.textContent;
    el.classList.add('open');
    el.removeAttribute('inert');
    el.setAttribute('aria-hidden', 'false');
    el.scrollTop = 0;
  }

  function close(silent) {
    if (!el) return;
    const was = part;
    part = null;
    // Focus inside the panel would be stranded once it turns inert: hand it back to
    // whatever had it before (a label, a button), or drop it.
    if (el.contains(document.activeElement)) {
      const r = returnFocus;
      if (r && r !== document.body && r.isConnected && r.focus) r.focus();
      if (el.contains(document.activeElement)) document.activeElement.blur();
    }
    returnFocus = null;
    el.classList.remove('open');
    el.setAttribute('inert', '');
    el.setAttribute('aria-hidden', 'true');
    if (was && !silent) deps.onClose();
  }

  function update(state, dt) {
    if (!part) return;
    acc += dt;
    if (acc < 0.1) return;
    acc = 0;
    const t = liveText(part, state, kin);
    setText(liveEl, t);
    if (liveEl.hidden !== !t) liveEl.hidden = !t;
  }

  return {
    open, close, update,
    get part() { return part; },
    get isOpen() { return !!part; },
    get width() { return el && part ? el.offsetWidth : 0; },
  };
}
