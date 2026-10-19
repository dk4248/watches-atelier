import * as THREE from 'three';
import { reducedMotion } from './util.js';

// Colour tokens live in CSS custom properties (page.html: light values on :root, dark
// values in the two dark blocks). The watch on show picks the theme:
//
//   choice 'watch'  (default, "Match the watch") → watch.theme.mode, i.e. data-theme on
//                   <html>, so every CSS token switches
//   choice 'light' / 'dark'  → forced (Lively property 'theme', URL .light / .dark)
//
// The descriptor's palette for that mode — theme[mode] = { bg: [top, bottom], accent } —
// goes in as inline custom properties on <html> (--bg-top, --bg-bottom, --paper,
// --accent …); a watch without a theme simply uses the page's own tokens.
//
// The 3D background is a vertical gradient between --bg-top and --bg-bottom. It is
// drawn into one small canvas texture owned by this module (the same picture as
// stage.setBackground) so a watch change can cross-fade it frame by frame without
// allocating anything.
//
// If something else (the page host) changes data-theme later, that mode is adopted and
// the watch's palette for it applied. The resolved theme is cached in localStorage so
// page.html can paint the right colours before the app has loaded (no flash of the
// default theme when the wallpaper restarts).

const TOKENS = {
  paper: '--paper', bgTop: '--bg-top', bgBottom: '--bg-bottom', ink: '--ink', ink2: '--ink-2',
  ink3: '--ink-3', rule: '--rule', accent: '--accent', leader: '--leader', veil: '--veil',
};
const VARS = ['--bg-top', '--bg-bottom', '--paper', '--accent', '--accent-soft', '--on-accent', '--veil', '--sheet'];
const BOOT_KEY = 'watch.themeBoot';
const GRAD_W = 2;
const GRAD_H = 512;

export function createTheme(stage) {
  const docEl = document.documentElement;
  const listeners = [];
  const tokens = {};
  let choice = 'watch'; // 'watch' | 'light' | 'dark' | 'system'
  let hostMode = null; // data-theme set by someone else after us
  let watch = null;
  let mode = 'light';
  let ownAttr = null;

  // ---------------------------------------------------------------- colours
  const probe = document.createElement('canvas').getContext('2d');
  // any CSS colour → [r, g, b] (0–255); unknown → fallback
  function rgb(str, fallback = [236, 238, 241]) {
    if (!probe || !str) return fallback.slice();
    probe.fillStyle = '#010203';
    probe.fillStyle = String(str).trim();
    const v = probe.fillStyle;
    if (v === '#010203' && String(str).trim().toLowerCase() !== '#010203') return fallback.slice();
    if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    const m = v.match(/[\d.]+/g);
    return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : fallback.slice();
  }
  const hex = (c) => `#${c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
  const rgba = (c, a) => `rgba(${c.map((x) => Math.round(x)).join(', ')}, ${a})`;
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  function luminance(c) {
    const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }

  // Inline token overrides for a watch palette in `m` mode.
  function paletteVars(pal, m) {
    const dark = m === 'dark';
    const v = {};
    const bg = Array.isArray(pal.bg) ? pal.bg : pal.bg ? [pal.bg, pal.bg] : null;
    if (bg && bg[0]) {
      const top = rgb(bg[0]);
      const bottom = rgb(bg[1] || bg[0]);
      const paper = mix(top, bottom, 0.45); // label halos sit mid-screen
      v['--bg-top'] = hex(top);
      v['--bg-bottom'] = hex(bottom);
      v['--paper'] = hex(paper);
      v['--veil'] = rgba(paper, dark ? 0.66 : 0.74);
      v['--sheet'] = rgba(dark ? mix(paper, [255, 255, 255], 0.03) : paper, 0.96);
    }
    if (pal.accent) {
      const a = rgb(pal.accent, dark ? [125, 151, 255] : [35, 71, 181]);
      v['--accent'] = hex(a);
      v['--accent-soft'] = rgba(a, dark ? 0.14 : 0.1);
      v['--on-accent'] = luminance(a) > 0.4 ? '#0f1218' : '#ffffff';
    }
    return v;
  }

  // ---------------------------------------------------------------- 3D background
  const cv = document.createElement('canvas');
  cv.width = GRAD_W;
  cv.height = GRAD_H;
  const g2 = cv.getContext('2d');
  const img = g2 ? g2.createImageData(GRAD_W, GRAD_H) : null;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const cur = new Float32Array(6); // top rgb, bottom rgb as shown
  const from = new Float32Array(6);
  const to = new Float32Array(6);
  let fadeT = 1;
  let fadeDur = 0.9;
  let painted = false;

  function paint() {
    if (!img) return;
    const d = img.data;
    for (let y = 0; y < GRAD_H; y++) {
      const k = y / (GRAD_H - 1);
      const r = cur[0] + (cur[3] - cur[0]) * k;
      const g = cur[1] + (cur[4] - cur[1]) * k;
      const b = cur[2] + (cur[5] - cur[2]) * k;
      for (let x = 0; x < GRAD_W; x++) {
        const i = (y * GRAD_W + x) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);
    tex.needsUpdate = true;
    attach();
  }
  // (re)claim scene.background — another module may have replaced it meanwhile
  function attach() {
    const scene = stage && stage.scene;
    if (!scene || scene.background === tex) return;
    const old = scene.background;
    scene.background = tex;
    if (old && old.isTexture && old !== tex) old.dispose();
  }

  function setBackgroundTarget(top, bottom, animate) {
    const a = rgb(top, [236, 238, 241]);
    const b = rgb(bottom, a);
    to[0] = a[0]; to[1] = a[1]; to[2] = a[2]; to[3] = b[0]; to[4] = b[1]; to[5] = b[2];
    if (!painted || !animate || reducedMotion()) {
      cur.set(to);
      fadeT = 1;
      painted = true;
      paint();
      return;
    }
    let same = true;
    for (let i = 0; i < 6; i++) if (Math.abs(cur[i] - to[i]) > 0.5) same = false;
    if (same) { attach(); return; }
    from.set(cur);
    fadeT = 0;
  }

  // Per frame: advance a background cross-fade (no allocation).
  function update(dt) {
    if (fadeT >= 1) return;
    fadeT = Math.min(1, fadeT + Math.max(0, dt) / fadeDur);
    const k = fadeT * fadeT * (3 - 2 * fadeT);
    for (let i = 0; i < 6; i++) cur[i] = from[i] + (to[i] - from[i]) * k;
    paint();
  }

  // ---------------------------------------------------------------- tokens
  function read() {
    const cs = getComputedStyle(docEl);
    for (const k in TOKENS) tokens[k] = cs.getPropertyValue(TOKENS[k]).trim();
    tokens.dark = mode === 'dark';
    return tokens;
  }

  const systemDark = () => { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } };
  function resolve() {
    if (choice === 'light' || choice === 'dark') return choice;
    if (hostMode) return hostMode;
    const wm = watch && watch.theme && watch.theme.mode;
    if (choice === 'watch' && (wm === 'light' || wm === 'dark')) return wm;
    return systemDark() ? 'dark' : 'light';
  }

  function saveBoot(vars) {
    try { localStorage.setItem(BOOT_KEY, JSON.stringify({ mode, vars: vars || {} })); } catch { /* ignore */ }
  }

  function applyAll(animate) {
    mode = resolve();
    ownAttr = mode;
    if (docEl.getAttribute('data-theme') !== mode) docEl.setAttribute('data-theme', mode);
    const pal = watch && watch.theme && watch.theme[mode];
    const vars = pal ? paletteVars(pal, mode) : null;
    for (const k of VARS) {
      if (vars && vars[k]) docEl.style.setProperty(k, vars[k]);
      else docEl.style.removeProperty(k);
    }
    read();
    setBackgroundTarget(tokens.bgTop, tokens.bgBottom, animate);
    saveBoot(vars);
    for (const fn of listeners) fn(tokens);
  }

  // The host (or a user stylesheet toggle) changed [data-theme]: adopt it.
  try {
    new MutationObserver(() => {
      const v = docEl.getAttribute('data-theme');
      if (v === ownAttr) return;
      hostMode = v === 'light' || v === 'dark' ? v : null;
      applyAll(true);
    }).observe(docEl, { attributes: true, attributeFilter: ['data-theme'] });
  } catch { /* no MutationObserver */ }
  // System light/dark matters only for a watch without a theme
  try {
    const mql = matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => { if (resolve() !== mode) applyAll(true); };
    if (mql.addEventListener) mql.addEventListener('change', onSystem);
    else if (mql.addListener) mql.addListener(onSystem);
  } catch { /* no matchMedia */ }

  function normChoice(c) {
    const s = String(c ?? '').toLowerCase();
    if (s === 'light' || s === 'dark' || s === 'system') return s;
    return 'watch';
  }

  return {
    tokens,
    get mode() { return mode; },
    get choice() { return choice; },
    // 'watch' (match the watch) | 'light' | 'dark' | 'system'
    setChoice(c, { animate = true } = {}) {
      const n = normChoice(c);
      if (n === choice && !hostMode) return;
      choice = n;
      hostMode = null;
      applyAll(animate);
    },
    setWatch(w, { animate = true } = {}) {
      watch = w || null;
      applyAll(animate);
    },
    update,
    // put our background back (e.g. after the watch box drew its own)
    reassert() { if (painted) attach(); },
    apply: () => applyAll(true),
    onChange: (fn) => listeners.push(fn),
  };
}
