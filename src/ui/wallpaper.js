// Desktop-wallpaper integration.
//
// URL forms (artifact links keep only a bare #token of letters, digits, . _ ~ -):
//   #wallpaper                 cinematic loop
//   #wallpaper.dial | .movement | .exploded   ambient drift around one composition
//   modifiers: .fps30 .fps60 .nolabels .labels .dark .light
//              .idle30 .idle60 .idle120 .idle300 .idle600 .idlenever (or .idle<seconds>)
//              .taskbar0 (no bottom inset) / .taskbar<px> (taskbar height, default 48)
// Query-string equivalents for the local file:
//   ?wallpaper=cinematic|dial|movement|exploded&fps=30|60&labels=0&theme=dark|light|watch
//   &idle=<seconds>|never&taskbar=<px>
// (main.js also reads #…w-<watchId> / ?watch=<id> to pick the first watch.)
//
// In wallpaper mode the screen is clean; the first click / tap / wheel / key brings the
// interface back, and it returns to the wallpaper after `idle` without input.
//
// Lively 2.2 input (research/lively/lively.md): only the LEFT button and mouse moves are
// forwarded (no wheel, right / middle button, touch); clicks only while the desktop is
// the foreground window; moves arrive with buttons = 0 (even mid-drag, and also while
// another app has the focus) and with spurious pointerleave / out; the page extends
// under the Windows taskbar. So: zoom buttons, drags tracked from pointerdown / up,
// never ended on leave, idle measured from clicks (moves count only mid-press), and a
// bottom inset for the clickable chrome.
//
// Live wallpaper apps change options through their property hooks:
//   Lively Wallpaper:  window.livelyPropertyListener(name, value)
//                      window.livelyWallpaperPlaybackChanged(data)  (--pause-event true)
//   Wallpaper Engine:  window.wallpaperPropertyListener.applyUserProperties(props)
// Properties:
//   watch   dropdown index into the collection (ctx.watches order), or a watch id
//   view    0 cinematic, 1 dial, 2 movement, 3 exploded (or the names)
//   idle    0: 30 s, 1: 1 min, 2: 2 min, 3: 5 min, 4: 10 min, 5: never (values > 5 = seconds)
//   labels  bool        fps30  bool (always 30 fps)      fps60  bool (never drop to 30 fps)
//   theme   0 match the watch, 1 light, 2 dark (or the names)

const VIEWS = ['cinematic', 'dial', 'movement', 'exploded'];
const THEMES = ['watch', 'light', 'dark'];
const IDLE_STEPS_S = [30, 60, 120, 300, 600, Infinity];

export function asBool(v) {
  if (typeof v === 'string') return !/^(0|false|no|off|)$/i.test(v.trim());
  return !!v;
}
const isIndex = (v) => typeof v === 'number' || /^\s*\d+\s*$/.test(String(v));
function asView(v) {
  if (isIndex(v)) return VIEWS[Number(v)] || 'cinematic';
  const s = String(v || '').toLowerCase().trim();
  return VIEWS.includes(s) ? s : s === 'loop' || s === 'cinematic loop' ? 'cinematic' : null;
}
function asTheme(v) {
  if (isIndex(v)) return THEMES[Number(v)] || 'watch';
  const s = String(v || '').toLowerCase().trim();
  if (s === 'light' || s === 'dark' || s === 'system') return s;
  return 'watch';
}
// seconds (number or string) → ms; 0 / never / off → Infinity
function idleSeconds(v) {
  const s = String(v ?? '').toLowerCase().trim();
  if (s === 'never' || s === 'off' || s === 'none' || s === 'inf' || s === 'infinity') return Infinity;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n === 0 ? Infinity : Math.max(2, n) * 1000;
}
// Lively dropdown index (0–5) → ms; larger numbers are taken as seconds
function idleIndex(v) {
  if (!isIndex(v)) return idleSeconds(v);
  const n = Number(v);
  if (n < IDLE_STEPS_S.length) return IDLE_STEPS_S[n] * 1000;
  return idleSeconds(n);
}

// → null, or { view, fps30, fps60, labels (true|false|null = default),
//              theme (null = leave), idleMs (undefined = leave),
//              taskbar (px, undefined = default) }
export function parseWallpaperURL(loc = window.location) {
  let hash = '';
  let search = '';
  try { hash = decodeURIComponent((loc.hash || '').replace(/^#/, '')); } catch { hash = (loc.hash || '').replace(/^#/, ''); }
  try { search = loc.search || ''; } catch { search = ''; }

  const tokens = hash.toLowerCase().split(/[.~_]/).filter(Boolean);
  if (tokens.includes('wallpaper')) {
    const out = { view: 'cinematic', fps30: false, fps60: false, labels: null, theme: null, idleMs: undefined, taskbar: undefined };
    for (const tk of tokens) {
      if (VIEWS.includes(tk)) out.view = tk;
      else if (tk === 'fps30') out.fps30 = true;
      else if (tk === 'fps60') out.fps60 = true;
      else if (tk === 'nolabels') out.labels = false;
      else if (tk === 'labels') out.labels = true;
      else if (tk === 'dark' || tk === 'light') out.theme = tk;
      else if (tk === 'idlenever' || tk === 'noidle') out.idleMs = Infinity;
      else if (/^idle\d+$/.test(tk)) out.idleMs = idleSeconds(tk.slice(4));
      else if (/^taskbar\d+$/.test(tk)) out.taskbar = Math.min(400, Number(tk.slice(7)));
    }
    return out;
  }
  let q;
  try { q = new URLSearchParams(search); } catch { return null; }
  if (!q.has('wallpaper')) return null;
  const out = { view: asView(q.get('wallpaper')) || 'cinematic', fps30: false, fps60: false, labels: null, theme: null, idleMs: undefined, taskbar: undefined };
  const fps = q.get('fps');
  if (fps === '30' || q.has('fps30')) out.fps30 = true;
  if (fps === '60' || q.has('fps60')) out.fps60 = true;
  if (q.has('labels')) out.labels = asBool(q.get('labels'));
  const th = (q.get('theme') || '').toLowerCase();
  if (th === 'dark' || th === 'light' || th === 'watch') out.theme = th;
  if (q.has('idle')) out.idleMs = idleSeconds(q.get('idle'));
  const tb = Number(q.get('taskbar'));
  if (q.has('taskbar') && Number.isFinite(tb) && tb >= 0) out.taskbar = Math.min(400, tb);
  return out;
}

// Lively's pause event: data is a JSON string (or an object) with IsPaused; tolerate
// other key casings and bare booleans.
export function parsePaused(data) {
  let v = data;
  if (typeof v === 'string') {
    const s = v.trim();
    try { v = JSON.parse(s); } catch { return /^(true|1|paused)$/i.test(s); }
  }
  if (typeof v === 'boolean' || typeof v === 'number') return !!v;
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      const lk = k.toLowerCase();
      if (lk === 'ispaused' || lk === 'paused') return asBool(v[k]);
    }
  }
  return false;
}

// deps.apply(patch) receives { view?, labels?, fps30?, fps60?, theme?, idleMs?, watch? }
// from the wallpaper apps; deps.pause(bool) Lively's playback state.
export function installWallpaperHooks(deps) {
  function handle(name, value) {
    const key = String(name || '').toLowerCase().trim();
    if (key === 'view' || key === 'mode') {
      const v = asView(value);
      if (v) deps.apply({ view: v });
    } else if (key === 'labels') deps.apply({ labels: asBool(value) });
    else if (key === 'fps30') deps.apply({ fps30: asBool(value) });
    else if (key === 'fps60') deps.apply({ fps60: asBool(value) });
    else if (key === 'fps') deps.apply({ fps30: String(value) === '30', fps60: String(value) === '60' });
    else if (key === 'theme') deps.apply({ theme: asTheme(value) });
    else if (key === 'idle') {
      const ms = idleIndex(value);
      if (ms !== undefined) deps.apply({ idleMs: ms });
    } else if (key === 'watch') deps.apply({ watch: value });
  }

  function applyWE(props) {
    if (!props) return;
    for (const name of Object.keys(props)) {
      const p = props[name];
      try { handle(name, p && typeof p === 'object' && 'value' in p ? p.value : p); } catch (e) { console.warn('[wallpaper] we', e); }
    }
  }
  // Lively Wallpaper
  window.livelyPropertyListener = (name, val) => {
    try { handle(name, val); } catch (e) { console.warn('[wallpaper] lively', e); }
  };
  window.livelyWallpaperPlaybackChanged = (data) => {
    try { deps.pause(parsePaused(data)); } catch (e) { console.warn('[wallpaper] playback', e); }
  };
  // Wallpaper Engine
  window.wallpaperPropertyListener = { applyUserProperties: applyWE };

  // page.html installs stand-in listeners that queue calls made before the app
  // finished loading (both apps send their properties right after page load).
  const queued = Array.isArray(window.__wallpaperQueue) ? window.__wallpaperQueue : [];
  window.__wallpaperQueue = null;
  for (const [kind, a, b] of queued) {
    if (kind === 'lively') window.livelyPropertyListener(a, b);
    else if (kind === 'we') applyWE(a);
  }
  if ('__livelyPlayback' in window) {
    const d = window.__livelyPlayback;
    delete window.__livelyPlayback;
    window.livelyWallpaperPlaybackChanged(d);
  }
  return queued.length > 0;
}

// Hide the cursor after `ms` without movement (wallpaper mode).
export function createCursorHider(ms = 2000) {
  const docEl = document.documentElement;
  let timer = 0;
  let on = false;
  const hide = () => docEl.classList.add('nocursor');
  function poke() {
    if (!on) return;
    docEl.classList.remove('nocursor');
    clearTimeout(timer);
    timer = setTimeout(hide, ms);
  }
  window.addEventListener('pointermove', poke, { passive: true });
  window.addEventListener('pointerdown', poke, { passive: true });
  return {
    set(enabled) {
      on = !!enabled;
      clearTimeout(timer);
      if (on) timer = setTimeout(hide, ms);
      else docEl.classList.remove('nocursor');
    },
  };
}
