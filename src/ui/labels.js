import * as THREE from 'three';
import { $, h, TAU, clamp, isShown, setText, firstFact, reducedMotion } from './util.js';

// Technical-drawing callouts.
//
// Labels sit in a left and a right column beside the watch. Each one is joined to
// a dot on its part by a leader with one elbow. The column is chosen from the
// anchor's screen x relative to the watch centre; within a column, labels are
// ordered by the anchor's screen y and de-overlapped by 1-D cluster stacking.
//
// The solve runs at ~18 Hz; every frame the anchors are re-projected (so dots
// stick to moving wheels) and labels glide towards their solved slots.
//
// The same layout feeds two renderers: DOM (HTML labels + one SVG overlay) for the
// page, and a 2D canvas painter used by the video recorder.

const SVGNS = 'http://www.w3.org/2000/svg';
const SOLVE_DT = 1 / 18;

export function createLabels(ctx, rig, deps) {
  const { reg, stage, root } = ctx;
  const camera = stage.camera;
  const layer = $('labels');
  const svg = $('leaders');

  const items = new Map();
  const list = [];
  const cand = [];
  const colL = [];
  const colR = [];
  const clusters = [];
  const rect = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();

  // Layout viewport, in the coordinate system of whatever we draw into.
  const vp = { w: 1, h: 1, s: 1, top: 110, bottom: 90, left: 16, right: 16, phone: false, sub: true, canvas: false };

  let enabled = true;
  let filter = null; // optional (part) => bool, replaces the priority rule (shows)
  let emphasis = null; // spotlight id
  let hoverId = null;
  let solveAcc = 1;
  let textAcc = 1;
  let force = true;
  let lastState = null;

  // ------------------------------------------------------------------ items
  function getItem(p) {
    let it = items.get(p.id);
    if (it) return it;
    it = {
      part: p, want: false, alpha: 0, x: 0, y: 0, tx: 0, ty: 0, ax: 0, ay: 0,
      col: 'R', isL: null, emph: null, maxW: 0, lastMaxW: -1, lastT: '', lastD: '', lastO: -1,
      live: false, sub: '', subInit: false, upper: String(p.name || p.id).toUpperCase(), rank: 0,
    };
    if (layer && svg) {
      it.nameEl = h('span', { class: 'lbl-name' }, p.name || p.id);
      it.subEl = h('span', { class: 'lbl-sub' });
      // A real button: reachable with Tab while visible (hidden labels are
      // visibility:hidden, so they drop out of the tab order), Enter/Space select.
      it.el = h('button', { type: 'button', class: 'lbl R', 'data-part': p.id }, it.nameEl, it.subEl);
      it.el.style.opacity = '0';
      it.el.style.visibility = 'hidden';
      it.el.addEventListener('pointerenter', () => deps.onHover(p.id));
      it.el.addEventListener('pointerleave', () => deps.onHover(null));
      it.el.addEventListener('focus', () => deps.onHover(p.id));
      it.el.addEventListener('blur', () => deps.onHover(null));
      it.el.addEventListener('click', (e) => { e.stopPropagation(); deps.onSelect(p.id); });
      layer.append(it.el);
      it.g = document.createElementNS(SVGNS, 'g');
      it.g.setAttribute('class', 'ldr');
      it.g.style.opacity = '0';
      it.path = document.createElementNS(SVGNS, 'path');
      it.dot = document.createElementNS(SVGNS, 'circle');
      it.dot.setAttribute('r', '2.2');
      it.g.append(it.path, it.dot);
      svg.append(it.g);
    }
    items.set(p.id, it);
    list.push(it);
    return it;
  }

  // Project a part's anchor into viewport pixels. false = behind the camera.
  function project(p, out) {
    reg.anchorWorld(p, _v);
    _w.copy(_v).applyMatrix4(camera.matrixWorldInverse);
    if (_w.z > -camera.near) return false;
    _v.project(camera);
    out.ax = ((_v.x + 1) / 2) * vp.w;
    out.ay = ((1 - _v.y) / 2) * vp.h;
    return out.ax >= 0 && out.ax <= vp.w && out.ay >= 0 && out.ay <= vp.h;
  }

  const selectedId = () => (deps.getSelected ? deps.getSelected() : null);
  const isEmph = (id) => id === emphasis || id === hoverId || id === selectedId();

  function allowed(p, ex, zoomed) {
    if (isEmph(p.id)) return true;
    if (filter) return filter(p, ex);
    const pr = p.priority ?? 2;
    if (vp.phone) return pr <= 1;
    if (pr <= 2) return true;
    return ex > 0.35 || zoomed;
  }

  // ------------------------------------------------------------------ solve
  function bySy(a, b) { return a.ay - b.ay; }

  function stack(col, top, bottom, slot) {
    col.sort(bySy);
    const lo = top + slot / 2;
    const hi = bottom - slot / 2;
    let nc = 0;
    for (let i = 0; i < col.length; i++) {
      if (!clusters[nc]) clusters[nc] = { first: 0, n: 0, sum: 0, y0: 0 };
      const c = clusters[nc++];
      c.first = i; c.n = 1; c.sum = col[i].ay;
      c.y0 = clamp(c.sum, lo, hi);
      // merge with the previous cluster while they overlap
      while (nc > 1) {
        const a = clusters[nc - 2];
        const b = clusters[nc - 1];
        if (a.y0 + a.n * slot <= b.y0 + 1e-6) break;
        a.sum += b.sum - b.n * a.n * slot;
        a.n += b.n;
        a.y0 = clamp(a.sum / a.n, lo, Math.max(lo, hi - (a.n - 1) * slot));
        nc--;
      }
    }
    for (let c = 0; c < nc; c++) {
      const cl = clusters[c];
      for (let k = 0; k < cl.n; k++) col[cl.first + k].ty = cl.y0 + k * slot;
    }
  }

  function rankSort(a, b) { return a.rank - b.rank; }

  function trim(col, cap, cy) {
    if (col.length <= cap) return;
    for (const it of col) {
      const p = it.part;
      it.rank = (isEmph(p.id) ? -1e6 : 0) + (p.priority ?? 2) * 1e4 + Math.abs(it.ay - cy);
    }
    col.sort(rankSort);
    for (let i = cap; i < col.length; i++) col[i].want = false;
    col.length = cap;
  }

  function solve() {
    const ex = reg.explode;
    root.worldToLocal(_w.copy(camera.position));
    const camSide = _w.z >= 0 ? 'front' : 'back';
    const zoomed = camera.position.distanceTo(stage.controls.target) < 75;
    cand.length = 0;
    for (const p of reg.parts) {
      if (p.label === false) continue;
      let ok = enabled && isShown(p.object);
      if (ok) {
        const sideOk = p.side === 'both' || p.side === camSide;
        ok = ex > 0.35 || (sideOk && (reg.xray || p.exposed !== false));
      }
      if (ok) ok = allowed(p, ex, zoomed);
      let it = items.get(p.id);
      if (ok) {
        it = it || getItem(p);
        ok = project(p, it);
      }
      if (!it) continue;
      it.want = ok;
      if (ok) cand.push(it);
    }
    if (!cand.length) return;

    rig.projectContentRect(ex, vp.w, vp.h, rect);
    const cx = (rect.minX + rect.maxX) / 2;
    const cy = (rect.minY + rect.maxY) / 2;
    const s = vp.s;
    const slot = (vp.sub ? 32 : 19) * s;
    const top = vp.top;
    const bottom = vp.h - vp.bottom;
    const cap = Math.max(1, Math.floor((bottom - top) / slot));

    colL.length = 0;
    colR.length = 0;
    for (const it of cand) (it.ax < cx ? colL : colR).push(it);
    trim(colL, cap, cy);
    trim(colR, cap, cy);

    const gap = 22 * s;
    const minW = vp.phone ? Math.min(150 * s, vp.w * 0.36) : 140 * s;
    const xL = clamp(rect.minX - gap, vp.left + minW, Math.max(vp.left + minW, vp.w * 0.5 - 12 * s));
    const xR = clamp(rect.maxX + gap, Math.min(vp.w * 0.5 + 12 * s, vp.w - vp.right - minW), vp.w - vp.right - minW);
    const wL = Math.max(48, Math.floor((xL - vp.left) / 4) * 4);
    const wR = Math.max(48, Math.floor((vp.w - vp.right - xR) / 4) * 4);

    stack(colL, top, bottom, slot);
    stack(colR, top, bottom, slot);
    for (const it of colL) { it.col = 'L'; it.tx = xL; it.maxW = wL; }
    for (const it of colR) { it.col = 'R'; it.tx = xR; it.maxW = wR; }
  }

  // ------------------------------------------------------------------ per frame
  function subText(it, state) {
    const p = it.part;
    if (p.live && state) {
      try { return String(p.live(state) ?? ''); } catch { return ''; }
    }
    return firstFact(p);
  }

  function frame(dt, state) {
    lastState = state;
    camera.updateMatrixWorld();
    solveAcc += dt;
    if (force || solveAcc >= SOLVE_DT) {
      solveAcc = 0;
      force = false;
      solve();
    }
    textAcc += dt;
    const doText = textAcc >= 0.2;
    if (doText) textAcc = 0;
    const kp = 1 - Math.exp(-dt / 0.06);
    const ka = reducedMotion() ? 1 : 1 - Math.exp(-dt / 0.09);
    for (const it of list) {
      if (!it.want && it.alpha === 0) continue;
      if (it.want && !project(it.part, it)) it.want = false;
      else if (!it.want) project(it.part, it);
      const target = it.want ? 1 : 0;
      if (it.want && it.alpha < 0.01) { it.x = it.tx; it.y = it.ty; } // appear in place
      else { it.x += (it.tx - it.x) * kp; it.y += (it.ty - it.y) * kp; }
      it.alpha += (target - it.alpha) * ka;
      if (Math.abs(target - it.alpha) < 0.004) it.alpha = target;
      // sub-line text at 5 Hz (once immediately for a new label; a part whose sub-line
      // is empty must not call live() every frame)
      if ((doText || !it.subInit) && vp.sub && it.alpha > 0) {
        it.subInit = true;
        const t = subText(it, state);
        if (t !== it.sub) { it.sub = t; if (it.subEl) setText(it.subEl, t); }
      }
      if (!vp.canvas && it.el) writeDom(it);
    }
  }

  const f1 = (n) => Math.round(n * 10) / 10;

  // Leader geometry, shared by both renderers. Normal case: dot → elbow → a short
  // shoulder at the label's edge. When the anchor lies behind the label (columns
  // squeezed over the watch on narrow screens) the shoulder runs as an underline
  // beneath the text instead, so the line never crosses the lettering.
  const L = { mode: 0, ex: 0, elx: 0, uy: 0 };
  function leaderGeom(it, s) {
    const dir = it.col === 'L' ? 1 : -1;
    L.ex = it.x + dir * 5 * s;
    L.elx = L.ex + dir * 14 * s;
    if ((it.ax - L.elx) * dir > 0) L.mode = 0;
    else if ((it.ax - L.ex) * dir > 0) L.mode = 1;
    else { L.mode = 2; L.uy = it.y + (vp.sub && it.sub ? 22 : 9) * s; }
    return L;
  }

  function leaderPath(it, s) {
    const g = leaderGeom(it, s);
    const ax = f1(it.ax), ay = f1(it.ay), y = f1(it.y);
    if (g.mode === 0) return `M${ax} ${ay}L${f1(g.elx)} ${y}L${f1(g.ex)} ${y}`;
    if (g.mode === 1) return `M${ax} ${ay}L${f1(g.ex)} ${y}`;
    return `M${ax} ${ay}L${ax} ${f1(g.uy)}L${f1(g.ex)} ${f1(g.uy)}`;
  }

  function writeDom(it) {
    const s = vp.s;
    const left = it.col === 'L';
    if (left !== it.isL) {
      it.isL = left;
      it.el.classList.toggle('L', left);
      it.el.classList.toggle('R', !left);
    }
    const ty = f1(it.y - 7 * s);
    const tx = f1(it.x);
    const t = left ? `translate(calc(${tx}px - 100%),${ty}px)` : `translate(${tx}px,${ty}px)`;
    if (t !== it.lastT) { it.lastT = t; it.el.style.transform = t; }
    if (it.maxW !== it.lastMaxW) { it.lastMaxW = it.maxW; it.el.style.maxWidth = `${it.maxW}px`; }
    const o = Math.round(it.alpha * 50) / 50;
    if (o !== it.lastO) {
      it.lastO = o;
      it.el.style.opacity = String(o);
      it.g.style.opacity = String(o);
      it.el.style.visibility = o === 0 ? 'hidden' : '';
      it.g.style.visibility = o === 0 ? 'hidden' : '';
      const live = o > 0.5;
      if (live !== it.live) { it.live = live; it.el.classList.toggle('live', live); }
    }
    const emph = isEmph(it.part.id);
    if (emph !== it.emph) {
      it.emph = emph;
      it.el.classList.toggle('emph', emph);
      it.g.classList.toggle('emph', emph);
    }
    if (o > 0) {
      const d = leaderPath(it, s);
      if (d !== it.lastD) {
        it.lastD = d;
        it.path.setAttribute('d', d);
        it.dot.setAttribute('cx', String(f1(it.ax)));
        it.dot.setAttribute('cy', String(f1(it.ay)));
      }
    }
  }

  // ------------------------------------------------------------------ canvas painter
  // Draws the current layout into a 2D context (recorder). `tok` = theme tokens.
  function draw(g, tok) {
    const s = vp.s;
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const it of list) {
      if (it.alpha <= 0.01) continue;
      const emph = isEmph(it.part.id);
      const left = it.col === 'L';
      g.globalAlpha = it.alpha;
      // leader
      const lg = leaderGeom(it, s);
      g.beginPath();
      g.moveTo(it.ax, it.ay);
      if (lg.mode === 0) { g.lineTo(lg.elx, it.y); g.lineTo(lg.ex, it.y); }
      else if (lg.mode === 1) g.lineTo(lg.ex, it.y);
      else { g.lineTo(it.ax, lg.uy); g.lineTo(lg.ex, lg.uy); }
      g.strokeStyle = emph ? tok.accent : tok.leader;
      g.lineWidth = (emph ? 1.5 : 1) * s;
      g.stroke();
      g.beginPath();
      g.arc(it.ax, it.ay, 2.4 * s, 0, TAU);
      g.fillStyle = emph ? tok.accent : tok.paper;
      g.fill();
      g.lineWidth = 1.1 * s;
      g.strokeStyle = emph ? tok.accent : tok.ink;
      g.stroke();
      // text with a paper-coloured halo (no boxes, like ink on a drawing)
      g.textAlign = left ? 'right' : 'left';
      g.textBaseline = 'middle';
      g.font = `500 ${11 * s}px Jost, "Segoe UI", sans-serif`;
      if ('letterSpacing' in g) g.letterSpacing = `${(0.95 * s).toFixed(2)}px`;
      g.lineWidth = 3.2 * s;
      g.strokeStyle = tok.paper;
      g.strokeText(it.upper, it.x, it.y);
      g.fillStyle = emph ? tok.accent : tok.ink;
      g.fillText(it.upper, it.x, it.y);
      if (vp.sub && it.sub) {
        g.font = `400 ${10.5 * s}px "JetBrains Mono", Consolas, monospace`;
        if ('letterSpacing' in g) g.letterSpacing = '0px';
        g.strokeText(it.sub, it.x, it.y + 14 * s);
        g.fillStyle = tok.ink2;
        g.fillText(it.sub, it.x, it.y + 14 * s);
      }
    }
    g.restore();
  }

  // ------------------------------------------------------------------ API
  function setViewport(o) {
    const rescale = (o.canvas !== undefined && o.canvas !== vp.canvas) || (o.s !== undefined && o.s !== vp.s);
    Object.assign(vp, o);
    force = true;
    if (layer) layer.classList.toggle('nosub', !vp.sub);
    if (!rescale) return;
    // new coordinate system (recording ↔ page): drop current positions and fade in again
    for (const it of list) {
      it.alpha = 0;
      it.want = false;
      it.lastO = -1;
      it.lastT = '';
      it.lastD = '';
      if (it.el && !vp.canvas) writeDom(it);
    }
  }

  // The watch was rebuilt (or another watch selected): every item points at a part
  // object that no longer exists. Drop them all; new ones are made on demand.
  function reset() {
    for (const it of list) {
      if (it.el) it.el.remove();
      if (it.g) it.g.remove();
    }
    items.clear();
    list.length = 0;
    cand.length = 0;
    colL.length = 0;
    colR.length = 0;
    emphasis = null;
    hoverId = null;
    solveAcc = 1;
    textAcc = 1;
    force = true;
  }

  return {
    frame,
    draw,
    setViewport,
    reset,
    relayout() { force = true; },
    setEnabled(on) { enabled = !!on; force = true; },
    setFilter(fn) { filter = fn || null; force = true; },
    setEmphasis(id) { if (emphasis !== id) { emphasis = id || null; force = true; } },
    setHover(id) { if (hoverId !== id) { hoverId = id || null; force = true; } },
    get enabled() { return enabled; },
    get vp() { return vp; },
    get state() { return lastState; },
  };
}
