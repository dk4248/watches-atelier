// Small shared helpers for the UI layer. No three.js in here.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export const $ = (id) => document.getElementById(id);

// Tiny element factory: h('div', { class: 'x', onclick: fn }, 'text', child)
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Write text only when it changed (DOM writes are the expensive part of a HUD).
export function setText(el, text) {
  if (el && el.__t !== text) {
    el.__t = text;
    el.textContent = text;
  }
}

const mqlReduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
export const reducedMotion = () => !!(mqlReduced && mqlReduced.matches);

// same breakpoint as the CSS (@media (max-width: 640px) is inclusive)
export const isPhone = () => Math.min(window.innerWidth, document.documentElement.clientWidth || 1e9) <= 640;

// Is an Object3D actually rendered (itself and every ancestor visible)?
export function isShown(obj) {
  for (let o = obj; o; o = o.parent) if (!o.visible) return false;
  return true;
}

const sig = (x) => String(Number(x.toPrecision(3)));
// 37.5 → "37.5 s", 450 → "7.5 min", 43200 → "12 h", 400000 → "4.63 days"
export function humanDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '–';
  if (sec < 1) return `${sig(sec * 1000)} ms`;
  if (sec < 120) return `${sig(sec)} s`;
  if (sec < 7200) return `${sig(sec / 60)} min`;
  if (sec < 172800) return `${sig(sec / 3600)} h`;
  return `${sig(sec / 86400)} days`;
}

export function firstSentence(text) {
  if (!text) return '';
  const m = String(text).match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : String(text)).trim();
}

const CATEGORY_NAMES = {
  case: 'Case', dial: 'Dial', hands: 'Hands', motion: 'Motion works', keyless: 'Keyless works',
  power: 'Power', train: 'Gear train', escapement: 'Escapement', regulating: 'Regulating organ',
  frame: 'Frame', jewels: 'Jewels', screws: 'Screws',
};
export function categoryName(c) {
  if (!c) return '';
  return CATEGORY_NAMES[c] || c.charAt(0).toUpperCase() + c.slice(1);
}

// First static fact as a short "Key value" line, for label sub-lines.
export function firstFact(part) {
  const f = part.facts;
  if (!f) return '';
  for (const k in f) return `${k} ${f[k]}`;
  return '';
}

export const pad2 = (n) => (n < 10 ? '0' : '') + n;
const nf = typeof Intl !== 'undefined' ? new Intl.NumberFormat('en-US') : null;
export const fmtInt = (n) => (nf ? nf.format(n) : String(n));
