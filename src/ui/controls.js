import { $, setText } from './util.js';

// Bottom bar (watch box, view, display toggles, explode, time, wallpaper / record),
// the zoom buttons and the "?" help popover. Pure DOM wiring; all decisions are made
// by ui.js via `deps`.

export function createControls(deps) {
  const bar = $('bar');
  const more = $('more-btn');
  const slider = $('explode');
  const sliderVal = $('explode-val');
  const help = $('help');
  const helpBtn = $('help-btn');
  const boxBtn = $('box-btn');
  const boxName = $('box-name');
  const aboutNow = $('about-now');
  const q = (sel) => Array.from(document.querySelectorAll(sel));
  let dragging = false;

  for (const b of q('[data-view]')) b.addEventListener('click', () => deps.onView(b.dataset.view));
  for (const b of q('[data-toggle]')) b.addEventListener('click', () => deps.onToggle(b.dataset.toggle));
  for (const b of q('[data-time]')) b.addEventListener('click', () => deps.onTime(Number(b.dataset.time)));
  $('wall-btn')?.addEventListener('click', () => deps.onWallpaper());
  $('rec-btn')?.addEventListener('click', () => deps.onRecord());
  boxBtn?.addEventListener('click', () => deps.onBox());
  $('zoom-in')?.addEventListener('click', () => deps.onZoom(1));
  $('zoom-out')?.addEventListener('click', () => deps.onZoom(-1));
  $('zoom-reset')?.addEventListener('click', () => deps.onResetView());

  if (slider) {
    const changed = () => {
      setText(sliderVal, `${slider.value}%`);
      deps.onExplode(Number(slider.value) / 100);
    };
    slider.addEventListener('input', changed); // keyboard (arrows / Home / End)
    // The mouse drag is ours, not the browser's: Lively forwards moves with buttons = 0,
    // which ends a native range drag at once. Track the press from pointerdown to
    // pointerup (never on leave) and set the value from the pointer's x.
    let rect = null;
    const THUMB = 9;
    const setFromX = (x) => {
      if (!rect || !rect.width) return;
      const k = Math.min(1, Math.max(0, (x - rect.left - THUMB / 2) / Math.max(1, rect.width - THUMB)));
      const v = String(Math.round(k * 100));
      if (v !== slider.value) { slider.value = v; changed(); }
    };
    slider.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); // no native drag (it would also eat our moves)
      dragging = true;
      rect = slider.getBoundingClientRect();
      try { slider.focus({ preventScroll: true }); } catch { /* ignore */ }
      setFromX(e.clientX);
    });
    window.addEventListener('pointermove', (e) => { if (dragging) setFromX(e.clientX); }, { passive: true });
    const end = () => { dragging = false; rect = null; };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  more?.addEventListener('click', () => {
    const open = !bar.classList.contains('expanded');
    bar.classList.toggle('expanded', open);
    more.setAttribute('aria-expanded', String(open));
    setText(more, open ? 'Less' : 'More');
    deps.onLayout();
  });

  // ---------------------------------------------------------------- help popover
  function openHelp() {
    if (!help) return;
    help.hidden = false;
    helpBtn?.setAttribute('aria-expanded', 'true');
  }
  function closeHelp() {
    if (!help || help.hidden) return false;
    help.hidden = true;
    helpBtn?.setAttribute('aria-expanded', 'false');
    return true;
  }
  helpBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (help.hidden) openHelp(); else closeHelp();
  });
  $('help-close')?.addEventListener('click', () => { closeHelp(); helpBtn?.focus(); });
  document.addEventListener('pointerdown', (e) => {
    if (help && !help.hidden && !help.contains(e.target) && e.target !== helpBtn) closeHelp();
  });

  function press(sel, on) { for (const b of q(sel)) b.setAttribute('aria-pressed', on(b) ? 'true' : 'false'); }

  // The watch on show: its short name on the watch-box button, its full name in "About".
  function setWatch(w) {
    if (!w) return;
    const short = w.boxLabel || w.title || w.model || '';
    setText(boxName, short);
    boxBtn?.setAttribute('aria-label', short ? `Watch box — now showing ${short}` : 'Watch box');
    const name = [w.brand, w.model || w.title].filter(Boolean).join(' ');
    const ref = w.ref ? ` ref. ${w.ref}` : '';
    const cal = w.caliber ? ` (caliber ${w.caliber})` : '';
    setText(aboutNow, name ? `Now showing: ${name}${ref}${cal}.` : '');
  }

  return {
    setView(v) { press('[data-view]', (b) => b.dataset.view === v); },
    setToggle(name, on) { press(`[data-toggle="${name}"]`, () => on); },
    setTime(s) { press('[data-time]', (b) => Number(b.dataset.time) === s); },
    setExplode(v) {
      if (!slider || dragging) return;
      const n = String(Math.round(v * 100));
      if (slider.value !== n) slider.value = n;
      setText(sliderVal, `${n}%`);
    },
    setWatch,
    help: {
      open: openHelp,
      close: closeHelp,
      toggle() { if (help.hidden) openHelp(); else closeHelp(); },
      get isOpen() { return !!help && !help.hidden; },
    },
  };
}
