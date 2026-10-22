import { $ } from './util.js';

// The wallpaper's power switch. Off: the last frame stays on screen as a still image and
// nothing renders (no GPU or CPU load from the replica) until it's switched on again, with
// the small button in the corner or P. The choice is remembered, so after a restart the
// wallpaper comes back off (it draws a moment of frames once, for the still).
//
// States: 'on' → requestOff() → 'pending' (frames still render until the still is taken,
// in afterRender, right after a frame was drawn) → 'off'. refresh() retakes the still while
// off (another watch, a monitor that changed size) without uncovering the screen.

const KEY = 'watch.power';
const now = () => performance.now();

export function createPower(ctx, deps = {}) {
  const docEl = document.documentElement;
  const cover = $('off');
  const onBtn = $('on-btn');
  let state = 'on';
  let due = 0;
  let framesLeft = 0;
  let persist = true;
  let still = null;

  let remembered = false;
  try { remembered = localStorage.getItem(KEY) === 'off'; } catch { /* storage unavailable */ }
  function remember(off) {
    try {
      if (off) localStorage.setItem(KEY, 'off');
      else localStorage.removeItem(KEY);
    } catch { /* storage unavailable */ }
  }

  // Off once a frame drawn after delayMs is on screen.
  function requestOff({ delayMs = 0, persist: keep = true } = {}) {
    if (state === 'pending') return;
    state = 'pending';
    due = now() + delayMs;
    framesLeft = 2; // at least two fresh frames (a render-size change applies on the next one)
    persist = keep;
  }

  function refresh(delayMs = 800) {
    if (state !== 'off') return;
    requestOff({ delayMs, persist: false });
  }

  // main.js → ui.afterRender: the drawing buffer still holds the frame just rendered.
  function afterRender() {
    if (state !== 'pending') return;
    if (--framesLeft > 0 || now() < due) return;
    const src = ctx.stage.renderer.domElement;
    let copy = null;
    try {
      copy = document.createElement('canvas');
      copy.width = src.width;
      copy.height = src.height;
      copy.className = 'off-still';
      copy.getContext('2d').drawImage(src, 0, 0);
    } catch { copy = null; } // no still: the cover shows the watch's background colours
    if (still) still.remove();
    still = copy;
    if (still && cover) cover.insertBefore(still, cover.firstChild);
    if (cover) cover.hidden = false;
    docEl.classList.add('power-off');
    state = 'off';
    if (persist) remember(true);
    deps.onOff?.();
  }

  function turnOn() {
    if (state === 'on') return;
    state = 'on';
    remember(false);
    if (cover) cover.hidden = true;
    if (still) { still.remove(); still = null; }
    docEl.classList.remove('power-off');
    deps.onOn?.();
  }

  onBtn?.addEventListener('click', (e) => { e.stopPropagation(); turnOn(); });

  return {
    get state() { return state; },
    get isOff() { return state === 'off'; },
    get remembered() { return remembered; },
    requestOff,
    refresh,
    afterRender,
    turnOn,
  };
}
