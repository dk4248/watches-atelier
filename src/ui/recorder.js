/* global __ARTIFACT__ */
import { $, h, setText, clamp } from './util.js';
import { LOOP } from './cinematic.js';

// Video recorder (offline file only).
//
// The WebGL canvas is rendered at the exact output size (stage.setFixedSize) and,
// right after each render, composited into a 2D canvas together with the part
// labels and the spotlight caption, so the video shows the same callouts as the
// page. That 2D canvas is captured with captureStream(fps) + MediaRecorder.
// The cinematic clock restarts at 0, so "one full loop" is a seamless clip.

// Compile-time constant from esbuild's `define`: true in the claude.ai Artifact
// build (sandboxed iframe, downloads blocked), false in the offline file.
const ARTIFACT = __ARTIFACT__;

const RESOLUTIONS = [
  { key: '1080', label: '1920×1080', w: 1920, h: 1080, bps: 16e6 },
  { key: '1440', label: '2560×1440', w: 2560, h: 1440, bps: 28e6 },
  { key: '2160', label: '3840×2160', w: 3840, h: 2160, bps: 50e6 },
  { key: 'phone', label: 'Phone 1080×1920', w: 1080, h: 1920, bps: 16e6 },
];
const FPS = [30, 60];
const CONTENTS = [
  { key: 'cinematic', label: 'Cinematic loop' },
  { key: 'dial', label: 'Dial' },
  { key: 'movement', label: 'Movement' },
  { key: 'exploded', label: 'Exploded' },
];
const DURATIONS = [15, 30, 60];
const MIMES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of MIMES) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* ignore */ }
  }
  return '';
}

function segmented(name, options, current, onPick) {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': name });
  for (const o of options) {
    const b = h('button', { type: 'button', 'data-k': String(o.key), 'aria-pressed': String(o.key) === String(current) ? 'true' : 'false' }, o.label);
    b.addEventListener('click', () => {
      for (const x of wrap.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      onPick(o.key);
    });
    wrap.append(b);
  }
  return wrap;
}

export function createRecorder(ctx, deps) {
  const { stage } = ctx;
  const host = $('ui') || document.body;
  const sel = { res: '1080', fps: 30, content: 'cinematic', dur: 30 };
  let modal = null;
  let lastFocus = null;
  let job = null;

  // ---------------------------------------------------------------- dialog
  function buildModal() {
    const close = () => closeModal();
    const card = h('div', { class: 'modal-card' });
    const head = h('header', { class: 'modal-head' },
      h('h2', { id: 'rec-title', class: 'modal-title' }, ARTIFACT ? 'Recording video' : 'Record video'),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: close }, '×'));
    card.append(head);

    if (ARTIFACT) {
      card.append(
        h('p', { class: 'modal-text' }, 'Video recording works in the offline copy of this page — the self-contained HTML file kept by the owner of these replicas. Open that file in Chrome, Edge or Firefox and use Record video there.'),
        h('p', { class: 'modal-text dim' }, 'This preview runs in a sandbox that cannot save files, so recording is switched off here. Wallpaper mode works in both.'),
        h('div', { class: 'modal-actions' }, h('button', { type: 'button', class: 'btn', onclick: close }, 'Close')),
      );
    } else {
      const note = h('p', { class: 'modal-note mono', id: 'rec-note' });
      const durRow = h('div', { class: 'field', id: 'rec-dur' },
        h('span', { class: 'caps field-cap' }, 'Duration'),
        segmented('Duration', DURATIONS.map((d) => ({ key: d, label: `${d} s` })), sel.dur, (k) => { sel.dur = k; refresh(); }));
      const refresh = () => {
        durRow.hidden = sel.content === 'cinematic';
        const res = RESOLUTIONS.find((r) => r.key === sel.res);
        const mime = pickMime();
        const fmt = mime === null ? 'not supported in this browser' : (mime || 'browser default').replace('video/', '').replace(';codecs=', ' / ').toUpperCase();
        const secs = sel.content === 'cinematic' ? LOOP : sel.dur;
        const mb = Math.round((res.bps * secs) / 8 / 1e6);
        note.textContent = `${secs} s · ${fmt} · ${res.bps / 1e6} Mbit/s · about ${mb} MB`;
      };
      card.append(
        h('div', { class: 'field' }, h('span', { class: 'caps field-cap' }, 'Resolution'),
          segmented('Resolution', RESOLUTIONS, sel.res, (k) => { sel.res = k; refresh(); })),
        h('div', { class: 'field' }, h('span', { class: 'caps field-cap' }, 'Frame rate'),
          segmented('Frame rate', FPS.map((f) => ({ key: f, label: `${f} fps` })), sel.fps, (k) => { sel.fps = k; refresh(); })),
        h('div', { class: 'field' }, h('span', { class: 'caps field-cap' }, 'Content'),
          segmented('Content', CONTENTS, sel.content, (k) => { sel.content = k; refresh(); })),
        durRow,
        note,
        h('p', { class: 'modal-text dim' }, 'The video records in real time with the labels and captions drawn in. Keep this tab in front until it finishes.'),
        h('div', { class: 'modal-actions' },
          h('button', { type: 'button', class: 'btn', onclick: close }, 'Cancel'),
          h('button', { type: 'button', class: 'btn primary', onclick: () => start() }, 'Start recording')),
      );
      refresh();
    }

    modal = h('div', { class: 'modal', id: 'rec-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rec-title' }, card);
    modal.hidden = true;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeModal(); }
      if (e.key === 'Tab') { // keep focus inside the dialog
        const f = [...modal.querySelectorAll('button:not([hidden])')].filter((b) => b.offsetParent);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      e.stopPropagation(); // keep the global shortcuts out of the dialog
    });
    host.append(modal);
  }

  function openModal() {
    if (job) return;
    if (!modal) buildModal();
    lastFocus = document.activeElement;
    modal.hidden = false;
    setTimeout(() => (modal.querySelector('.btn.primary') || modal.querySelector('.modal-actions .btn'))?.focus(), 0);
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---------------------------------------------------------------- progress bar
  let recbar = null;
  let recInfo = null;
  let recTime = null;
  let recFill = null;
  function buildRecbar() {
    recInfo = h('span', { class: 'mono rec-info' });
    recTime = h('span', { class: 'mono rec-time' });
    recFill = h('i');
    recbar = h('div', { class: 'recbar', role: 'status' },
      h('span', { class: 'rec-dot', 'aria-hidden': 'true' }),
      h('span', { class: 'caps' }, 'Recording'),
      recInfo,
      h('span', { class: 'rec-prog', 'aria-hidden': 'true' }, recFill),
      recTime,
      h('button', { type: 'button', class: 'btn', onclick: () => stop(true) }, 'Cancel'));
    recbar.hidden = true;
    host.append(recbar);
  }

  // ---------------------------------------------------------------- recording
  function start() {
    closeModal();
    if (ARTIFACT) return;
    const canCapture = typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
    const mime = pickMime();
    if (mime === null || !canCapture) {
      deps.toast('Video recording needs MediaRecorder and canvas capture, which this browser does not provide. Try a current Chrome, Edge or Firefox.', 7000);
      return;
    }
    const res = RESOLUTIONS.find((r) => r.key === sel.res) || RESOLUTIONS[0];
    const fps = sel.fps;
    const content = sel.content;
    const duration = content === 'cinematic' ? LOOP : sel.dur;

    const comp = h('canvas', { class: 'rec-comp', 'aria-hidden': 'true' });
    comp.width = res.w;
    comp.height = res.h;
    document.body.append(comp);
    const g = comp.getContext('2d', { alpha: false });
    let stream;
    let rec;
    try {
      stream = comp.captureStream(fps);
      const opts = { videoBitsPerSecond: res.bps };
      if (mime) opts.mimeType = mime;
      try { rec = new MediaRecorder(stream, opts); } catch { rec = new MediaRecorder(stream); }
    } catch (e) {
      comp.remove();
      deps.toast(`Could not start the recorder: ${e && e.message ? e.message : e}`, 7000);
      return;
    }
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => finish();
    rec.onerror = (e) => { console.error('[recorder]', e); stop(true, 'The recorder reported an error.'); };

    job = { res, fps, content, duration, mime: rec.mimeType || mime || 'video/webm', comp, g, stream, rec, chunks, started: false, t0: 0, acc: 1, cancelled: false, error: '' };
    deps.begin(content, { duration, w: res.w, h: res.h });
    if (!recbar) buildRecbar();
    const cname = CONTENTS.find((c) => c.key === content).label;
    setText(recInfo, `${cname} · ${res.w}×${res.h} · ${fps} fps`);
    setText(recTime, `0.0 / ${duration.toFixed(1)} s`);
    recFill.style.transform = 'scaleX(0)';
    recbar.hidden = false;
  }

  function wrapLines(g, text, maxW) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }

  const capCache = { key: '', w: 0, lines: [] }; // wrapped description, re-measured only when the spotlight changes
  function drawCaption(g, tok, W, H, s) {
    const sp = deps.spot();
    if (!sp || !sp.id || sp.alpha <= 0.01) return;
    g.save();
    g.globalAlpha = sp.alpha;
    const x = 64 * s;
    const maxW = Math.min(W * 0.42, 620 * s);
    g.font = `400 ${15 * s}px Jost, "Segoe UI", sans-serif`;
    if (capCache.key !== sp.id || capCache.w !== maxW) {
      capCache.key = sp.id;
      capCache.w = maxW;
      capCache.lines = wrapLines(g, sp.line, maxW);
    }
    const lines = capCache.lines;
    const lh = 21 * s;
    const blockH = 18 * s + 36 * s + lines.length * lh;
    const y0 = H - 64 * s - blockH;
    g.fillStyle = tok.accent;
    g.fillRect(x, y0, 2 * s, blockH);
    g.textBaseline = 'top';
    g.textAlign = 'left';
    g.font = `500 ${11 * s}px Jost, "Segoe UI", sans-serif`;
    if ('letterSpacing' in g) g.letterSpacing = `${(1.1 * s).toFixed(2)}px`;
    g.fillStyle = tok.accent;
    g.fillText('IN FOCUS', x + 16 * s, y0 + 2 * s);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.font = `300 ${30 * s}px Jost, "Segoe UI", sans-serif`;
    g.fillStyle = tok.ink;
    g.fillText(sp.name, x + 16 * s, y0 + 18 * s);
    g.font = `400 ${15 * s}px Jost, "Segoe UI", sans-serif`;
    g.fillStyle = tok.ink2;
    for (let i = 0; i < lines.length; i++) g.fillText(lines[i], x + 16 * s, y0 + 18 * s + 38 * s + i * lh);
    g.restore();
  }

  // Called right after stage.render(): the WebGL buffer is still valid here.
  function afterRender() {
    if (!job || job.stopping) return;
    const { g, res } = job;
    const tok = deps.tokens();
    const s = Math.min(res.w, res.h) / 1080;
    try {
      g.drawImage(stage.renderer.domElement, 0, 0, res.w, res.h);
      deps.drawLabels(g, tok);
      drawCaption(g, tok, res.w, res.h, s);
    } catch (e) { console.warn('[recorder] composite', e); }
    // Measure progress on the show's own clock, not the wall clock: if frames are
    // dropped (dt is clamped) the clip still covers exactly one loop / period, so
    // the recorded loop is seamless.
    const now = deps.clock ? deps.clock() : performance.now() / 1000;
    if (!job.started) {
      job.started = true;
      job.t0 = now;
      try { job.rec.start(1000); } catch (e) { stop(true, `Could not start: ${e.message || e}`); return; }
    }
    const el = now - job.t0;
    job.acc += 1;
    if (job.acc >= 6) {
      job.acc = 0;
      setText(recTime, `${Math.min(el, job.duration).toFixed(1)} / ${job.duration.toFixed(1)} s`);
      recFill.style.transform = `scaleX(${clamp(el / job.duration, 0, 1).toFixed(3)})`;
    }
    if (el >= job.duration) stop(false);
  }

  function stop(cancelled, error = '') {
    if (!job || job.stopping) return;
    job.stopping = true;
    job.cancelled = cancelled;
    job.error = error;
    try {
      if (job.rec.state !== 'inactive') job.rec.stop();
      else finish();
    } catch { finish(); }
  }

  function finish() {
    if (!job || job.finished) return;
    const j = job;
    j.finished = true;
    job = null;
    try { j.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    j.comp.remove();
    if (recbar) recbar.hidden = true;
    deps.end();
    if (j.cancelled) {
      deps.toast(j.error || 'Recording cancelled', 4000);
      return;
    }
    const type = (j.mime || 'video/webm').split(';')[0];
    const blob = new Blob(j.chunks, { type });
    if (!blob.size) { deps.toast('The recorder produced no data.', 6000); return; }
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    const name = `${(ctx.watch && ctx.watch.id) || 'watch'}-${j.content}-${j.res.w}x${j.res.h}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    const mb = (blob.size / 1e6).toFixed(1);
    deps.toast(h('span', null, 'Saved ', h('a', { href: url, download: name, class: 'toast-link' }, name), ` · ${mb} MB`), 12000);
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  }

  return {
    open: openModal,
    close: closeModal,
    afterRender,
    cancel() { stop(true); },
    get recording() { return !!job; },
    get modalOpen() { return !!modal && !modal.hidden; },
  };
}
