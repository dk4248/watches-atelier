// DOM layer of the watch box: caption, close button, "Today" chip and the fade used to
// hide the main-scene rebuild after a pick. One <style> scoped to .wbx-* classes; both
// are removed when the box closes. While the box is open, body gets .wbx-open, which
// fades the app's own overlay (.ui) out so frozen labels / buttons never sit on top.

const STYLE_ID = 'wbx-style';
const CSS = `
.wbx{position:fixed;inset:0;z-index:40;pointer-events:none;font-family:var(--font-sans,'Jost','Futura','Avenir Next','Segoe UI',system-ui,sans-serif);color:#f4ede2;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.wbx *{box-sizing:border-box}
.wbx-close{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));width:42px;height:42px;padding:0;border-radius:50%;border:1px solid rgba(244,237,226,.28);background:rgba(18,12,9,.38);color:inherit;cursor:pointer;pointer-events:auto;display:grid;place-items:center;opacity:0;transform:scale(.92);transition:opacity .35s ease,transform .35s ease,border-color .2s ease,background-color .2s ease;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.wbx-close svg{width:14px;height:14px;display:block}
.wbx.show .wbx-close{opacity:1;transform:none}
.wbx-close:hover{border-color:rgba(244,237,226,.62);background:rgba(44,30,21,.55)}
.wbx-close:focus-visible{outline:2px solid var(--accent,#d1b47c);outline-offset:3px}
.wbx-cap{position:absolute;left:50%;bottom:calc(var(--wbx-cap-bottom,24px) + env(safe-area-inset-bottom,0px));width:max-content;max-width:min(680px,calc(100% - 32px));text-align:center;opacity:0;transform:translate(-50%,10px);transition:opacity .45s ease,transform .45s ease;text-shadow:0 1px 14px rgba(0,0,0,.45)}
.wbx.show .wbx-cap{opacity:1;transform:translate(-50%,0)}
.wbx.side .wbx-cap{left:auto;right:var(--wbx-side-r,48px);top:50%;bottom:auto;text-align:right;max-width:var(--wbx-side-w,360px);transform:translate(10px,-50%)}
.wbx.side.show .wbx-cap{transform:translate(0,-50%)}
.wbx.side .wbx-model,.wbx.side .wbx-meta,.wbx.side .wbx-hint{white-space:normal}
.wbx-in{animation:wbx-in .32s ease both}
@keyframes wbx-in{from{opacity:.25;transform:translateY(3px)}to{opacity:1;transform:none}}
.wbx-brand{font-weight:500;font-size:clamp(10px,1.05vh,13px);letter-spacing:.26em;text-transform:uppercase;color:#d5b77d;white-space:nowrap}
.wbx-model{margin-top:.38em;font-weight:300;font-size:clamp(24px,3.3vh,44px);line-height:1.04;letter-spacing:.005em;white-space:nowrap}
.wbx-meta{margin-top:.75em;font-family:var(--font-mono,'JetBrains Mono',ui-monospace,Consolas,monospace);font-size:clamp(10.5px,1.12vh,13.5px);letter-spacing:.02em;color:rgba(244,237,226,.68);white-space:nowrap}
.wbx-hint{margin-top:1.15em;font-weight:500;font-size:clamp(9.5px,.98vh,12px);letter-spacing:.17em;text-transform:uppercase;color:rgba(244,237,226,.44);white-space:nowrap}
.wbx-pill{display:inline-flex;align-items:center;gap:.5em;height:1.9em;padding:0 .75em;margin-left:.9em;vertical-align:.32em;border:1px solid rgba(213,183,125,.62);border-radius:2px;color:#e6c98c;font-weight:500;font-size:clamp(9px,.95vh,11.5px);letter-spacing:.18em;text-transform:uppercase;line-height:1}
.wbx-pill::before,.wbx-chip::before{content:"";width:.5em;height:.5em;border-radius:50%;background:#e2c27e;box-shadow:0 0 8px rgba(226,194,126,.8)}
.wbx-pill[hidden]{display:none}
.wbx-chip{position:absolute;left:0;top:0;display:inline-flex;align-items:center;gap:.55em;height:22px;padding:0 9px;border:1px solid rgba(213,183,125,.5);border-radius:2px;background:rgba(18,12,9,.45);color:#e6c98c;font-weight:500;font-size:10px;letter-spacing:.2em;text-transform:uppercase;line-height:1;white-space:nowrap;opacity:0;transition:opacity .4s ease;will-change:transform;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.wbx-chip.on{opacity:1}
.wbx-fade{position:absolute;inset:0;background:rgb(11,8,7);opacity:0;pointer-events:none}
body.wbx-open .ui{opacity:0;visibility:hidden;transition:opacity .35s ease,visibility 0s linear .35s}
body.wbx-open .ui,body.wbx-open .ui *{pointer-events:none!important}
@media (max-width:520px){.wbx-hint{letter-spacing:.12em}.wbx-model{white-space:normal}.wbx-meta{white-space:normal}}
@media (prefers-reduced-motion:reduce){.wbx *,.wbx{transition-duration:.12s!important;animation:none!important}}
`;

// overlays alive (a new box may open while the last one's fade is still running)
let holders = 0;

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

export function createOverlay({ onClose }) {
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const root = el('div', 'wbx');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Watch box: choose the watch of the day');

  const close = el('button', 'wbx-close', root);
  close.type = 'button';
  close.title = 'Close (Esc)';
  close.setAttribute('aria-label', 'Close the watch box');
  close.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>';
  const stop = (e) => { e.stopPropagation(); };
  close.addEventListener('pointerdown', stop);
  close.addEventListener('pointerup', stop);
  close.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); onClose?.(); });

  const cap = el('div', 'wbx-cap', root);
  cap.setAttribute('aria-live', 'polite');
  const inner = el('div', '', cap);
  const brand = el('div', 'wbx-brand', inner);
  const model = el('div', 'wbx-model', inner);
  const modelText = el('span', '', model);
  const pill = el('span', 'wbx-pill', model);
  pill.textContent = 'Today';
  const meta = el('div', 'wbx-meta', inner);
  const hint = el('div', 'wbx-hint', inner);

  const chip = el('div', 'wbx-chip', root);
  chip.textContent = 'Today';
  const fade = el('div', 'wbx-fade', root);

  document.body.appendChild(root);
  holders++;
  document.body.classList.add('wbx-open');

  let lastKey = '';
  function setCaption({ brand: b = '', model: m = '', meta: t = '', hint: h = '', today = false }) {
    const key = `${b}|${m}|${t}|${h}|${today}`;
    if (key === lastKey) return;
    const contentChanged = lastKey.split('|').slice(0, 2).join('|') !== `${b}|${m}`;
    lastKey = key;
    brand.textContent = b;
    modelText.textContent = m;
    pill.hidden = !today;
    meta.textContent = t;
    hint.textContent = h;
    if (contentChanged) {
      inner.classList.remove('wbx-in');
      void inner.offsetWidth; // restart the animation
      inner.classList.add('wbx-in');
    }
  }

  let chipOn = false, chipX = NaN, chipY = NaN;
  function setChip(x, y, on) {
    if (on) {
      const rx = Math.round(x * 2) / 2, ry = Math.round(y * 2) / 2;
      if (rx !== chipX || ry !== chipY) {
        chipX = rx; chipY = ry;
        chip.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
    }
    if (on !== chipOn) { chipOn = on; chip.classList.toggle('on', on); }
  }

  function setLayout(mode, { right = 48, sideW = 360, bottom = 24 } = {}) {
    root.classList.toggle('side', mode === 'side');
    root.style.setProperty('--wbx-side-r', `${Math.round(right)}px`);
    root.style.setProperty('--wbx-side-w', `${Math.round(sideW)}px`);
    root.style.setProperty('--wbx-cap-bottom', `${Math.round(bottom)}px`);
  }

  // Height the caption needs (px) — for framing the box above it.
  function captionHeight() {
    const r = cap.getBoundingClientRect();
    return r.height || 120;
  }
  function captionWidth() {
    const r = cap.getBoundingClientRect();
    return r.width || 320;
  }

  function show(on = true) { root.classList.toggle('show', on); }

  function fadeTo(opacity, seconds) {
    fade.style.transition = seconds > 0 ? `opacity ${seconds}s ease` : 'none';
    if (seconds <= 0) void fade.offsetWidth;
    fade.style.opacity = String(opacity);
  }

  let removed = false, released = false;
  function releaseUI() {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (!holders) document.body.classList.remove('wbx-open');
  }
  function remove() {
    if (removed) return;
    removed = true;
    releaseUI();
    root.remove();
    const st = document.getElementById(STYLE_ID);
    if (st && !document.querySelector('.wbx')) st.remove();
  }

  return {
    root, close, setCaption, setChip, setLayout, show, fadeTo, remove, releaseUI, captionHeight, captionWidth,
    focusClose() { try { close.focus({ preventScroll: true }); } catch { /* ignore */ } },
  };
}
