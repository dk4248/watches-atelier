import { $, TAU, clamp, lerp, easeInOut, easeOut, isPhone, isShown, reducedMotion, setText } from './util.js';
import { createTheme } from './theme.js';
import { createCameraRig, makePose, copyPose } from './camera.js';
import { createLabels } from './labels.js';
import { createPicker } from './picking.js';
import { createPanel } from './panel.js';
import { createHUD } from './hud.js';
import { createControls } from './controls.js';
import { createShow } from './cinematic.js';
import { parseWallpaperURL, installWallpaperHooks, createCursorHider } from './wallpaper.js';
import { createRecorder } from './recorder.js';
import { createPartRules } from './visibility.js';

// The interface around the 3D watch.
//
// Modes:
//   'ui'    interactive page: HUD, bottom bar, labels, picking, info panel
//   'wall'  wallpaper: a show plays (cinematic loop or an ambient composition), no
//           chrome, the cursor hides. The first click / tap / wheel / key stops it
//           smoothly and brings the interface back ('ui'); inside a wallpaper session
//           it returns to 'wall' after app.idleMs without input. A session starts with
//           the URL (#wallpaper…, ?wallpaper=…), a Lively / Wallpaper Engine property,
//           the Wallpaper button or Space.
//   'rec'   video recording (offline file): fixed render size, labels painted into the video
// While the watch box (ctx.box) is open the interface hides and ignores input.
//
// main.js calls, every frame: frameInterval → (the box, or) beforeRender → reg.apply →
// afterApply → render → afterRender; and onWatchChanged(watch) after every (re)build.

const WALL_BUDGET_MP = 4; // render-size cap while the wallpaper plays (one WebView per screen)
const FULL_BUDGET_MP = 8.3;
const AUTO30_MS = 20000; // wallpaper without input this long → 30 fps (unless fps60)
const WAKE_GUARD_MS = 450; // wheel ticks right after waking only finish the wake
const DEFAULT_IDLE_MS = 120000;
const TASKBAR_PX = 48; // Lively draws under the Windows taskbar (CSS px on the owner's laptop)
const PAUSE_WATCHDOG_FRAMES = 300; // frames while "paused" = the resume event was lost
const LIVELY_LAST_KEY = 'watch.livelyLast';
const CURRENT_KEY = 'watch.current'; // the watch of the day, written by main.js
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'NumLock', 'ScrollLock', 'Fn', 'OS', 'Hyper', 'Super']);

export function createUI(ctx) {
  const { stage, reg, kin } = ctx;
  const uiEl = $('ui');
  const labelsEl = $('labels');
  const zoomEl = $('zoom');
  const docEl = document.documentElement;
  const crown = () => reg.byId.get('crown');
  const now = () => performance.now();

  const app = {
    mode: 'ui',
    session: false, // wallpaper session: input wakes the interface, idle returns to the wallpaper
    appDriven: false, // a wallpaper app (Lively / Wallpaper Engine) talks to the page
    wallView: 'cinematic',
    wallT: 0, // show clock where the wallpaper was left (continued on return)
    idleMs: DEFAULT_IDLE_MS,
    fps30: false,
    fps60: false,
    paused: false, // Lively playback pause
    view: 'dial',
    labels: true,
    xray: false,
    caseOn: true,
    wallLabels: null, // wallpaper override: null = default for the composition
    selected: null,
    hover: null, // 3D pick hover
    labelHover: null, // hovering an HTML label
    highlighted: null,
    windLeft: 0, // seconds of the Wind animation still to run
    shakeLeft: 0, // seconds of rotor swinging (Wind on an automatic without keyless data)
    timeScale: 1,
    userMoved: false, // camera moved by hand since the last view change
    saved: null, // UI state stashed while a show runs
    showEnteredAt: 0,
    wokeAt: -1e9,
    lastInput: now(),
    boxed: false, // the watch box is open
    lastExplode: 0,
  };
  const interactive = () => app.mode === 'ui' && !app.boxed;

  // ------------------------------------------------------------------ modules
  const theme = createTheme(stage);
  const rig = createCameraRig(ctx);
  try { rig.computeBoxes(); } catch (e) { console.warn('[ui] boxes', e); }
  const rules = createPartRules(ctx);
  const ruleState = { dt: 0, caseOn: true, explode: 0, hideBack: false };
  const tmpPose = makePose();
  const tmpPose2 = makePose();
  const tmpPose3 = makePose();

  const show = createShow(ctx, rig, {
    labelsOn: () => labelsWantedInShow(show.kind || 'cinematic'),
  });

  const labels = createLabels(ctx, rig, {
    onHover: (id) => { if (interactive()) app.labelHover = id; },
    onSelect: (id) => { if (interactive()) select(id); },
    getSelected: () => app.selected,
  });

  const picker = createPicker(ctx, {
    canWind: () => interactive() && !!crown() && isShown(crown().object),
    controlsAllowed: () => interactive(),
    onCrownDrag: (on) => { hud.setWinding(on || app.windLeft > 0 || app.shakeLeft > 0); if (on) select('crown'); },
    onHover: (id, x, y) => { app.hover = id; showTip(id, x, y); },
    onPointer: (x, y) => moveTip(x, y),
    onClick: (id) => select(id),
  });

  const panel = createPanel(ctx, {
    onFocus: (p) => focusPart(p),
    onWind: () => startWind(),
    onClose: () => { app.selected = null; layoutChanged(); },
  });

  const hud = createHUD(ctx, { onWind: () => startWind() });

  const controls = createControls({
    onView: (v) => setView(v),
    onToggle: (name) => toggle(name),
    onExplode: (v) => { explodeSet(v); },
    onTime: (s) => setTimeScale(s),
    onWallpaper: () => goWall('button'),
    onRecord: () => recorder.open(),
    onBox: () => openBox(),
    onZoom: (dir) => zoomStep(dir),
    onResetView: () => resetView(),
    onLayout: () => layoutChanged(),
  });

  const recorder = createRecorder(ctx, {
    begin: beginRecording,
    end: endRecording,
    drawLabels: (g, tok) => labels.draw(g, tok),
    spot: () => show.spot,
    clock: () => show.time, // seconds of show time (restarted at 0 for each recording)
    tokens: () => theme.tokens,
    toast,
  });

  const cursor = createCursorHider(2000);

  // ------------------------------------------------------------------ explode animation
  const ex = { active: false, t: 0, dur: 1.4, from: 0, to: 0 };
  function explodeTo(v, dur = 1.4) {
    ex.from = reg.explode;
    ex.to = clamp(v, 0, 1);
    if (Math.abs(ex.to - ex.from) < 1e-4) { ex.active = false; return; }
    ex.t = 0;
    ex.dur = reducedMotion() ? Math.min(dur, 0.4) : dur;
    ex.active = true;
  }
  function explodeSet(v) {
    ex.active = false;
    reg.setExplode(clamp(v, 0, 1));
    labels.relayout();
  }
  function updateExplode(dt) {
    if (!ex.active) return;
    ex.t += dt;
    const k = easeInOut(clamp(ex.t / ex.dur, 0, 1));
    reg.setExplode(lerp(ex.from, ex.to, k));
    if (ex.t >= ex.dur) ex.active = false;
  }

  // ------------------------------------------------------------------ views & camera
  function uiMargins(view) {
    const aspect = stage.camera.aspect || 1.6;
    const phone = isPhone();
    const wide = aspect > 1.05;
    const lab = app.labels;
    if (view === 'exploded') return { h: wide ? (lab ? 0.6 : 0.84) : 0.92, v: phone ? 0.58 : 0.68 };
    return { h: wide ? (lab ? 0.62 : 0.86) : 0.9, v: phone ? 0.6 : 0.7 };
  }

  function setView(view, { dur = 1.2, keepExplode = false } = {}) {
    if (app.mode !== 'ui') return;
    app.view = view;
    app.userMoved = false;
    userRef.armed = false;
    controls.setView(view);
    const m = uiMargins(view);
    rig.viewPose(view, tmpPose, m.h, m.v);
    rig.tweenTo(tmpPose, dur);
    if (!keepExplode) explodeTo(view === 'exploded' ? 1 : 0, view === 'exploded' ? 1.5 : 1.2);
    labels.relayout();
  }

  // Fly in to `view` from a little further out (start-up, a new watch on show).
  function arrive(view, dur = 1.1) {
    const m = uiMargins(view);
    rig.viewPose(view, tmpPose, m.h, m.v);
    copyPose(tmpPose2, tmpPose);
    tmpPose2.dist *= 1.35;
    tmpPose2.az -= 0.12;
    rig.applyPose(tmpPose2);
    rig.tweenFrom(tmpPose2, tmpPose, reducedMotion() ? 0.01 : dur, easeOut);
    app.view = view;
    app.userMoved = false;
    userRef.armed = false;
    controls.setView(view);
    labels.relayout();
  }

  function focusPart(p) {
    if (!p || !interactive()) return;
    if (p.exposed === false && reg.explode < 0.35 && !app.xray) setXray(true);
    rig.focusPose(p, tmpPose);
    rig.tweenTo(tmpPose, 1.1);
    app.userMoved = true;
  }

  // Zoom buttons (Lively may not forward the mouse wheel): scale the distance of
  // wherever the camera is heading.
  function zoomStep(dir) {
    if (!interactive()) return;
    rig.destination(tmpPose);
    const c = stage.controls;
    tmpPose.dist = clamp(tmpPose.dist * (dir > 0 ? 0.8 : 1.25), c.minDistance || 1, c.maxDistance || 2000);
    rig.tweenTo(tmpPose, Math.max(0.35, rig.remaining), easeOut);
    app.userMoved = true;
    labels.relayout();
  }
  function resetView() {
    if (interactive()) setView(app.view, { dur: 0.9 });
  }

  // OrbitControls fires 'start' on every pointerdown, including a plain click that
  // selects a part. Only count it as a hand-placed camera (which turns off the refit
  // on resize / phone rotation) once the camera actually moves after that 'start'.
  const userRef = { armed: false, pos: stage.camera.position.clone(), tgt: stage.controls.target.clone() };
  stage.controls.addEventListener('start', () => {
    if (!interactive()) return;
    userRef.armed = true;
    userRef.pos.copy(stage.camera.position);
    userRef.tgt.copy(stage.controls.target);
  });
  function checkUserMoved() {
    if (!userRef.armed) return;
    if (rig.tweening) { userRef.armed = false; return; } // a click resumed a scripted flight

    if (stage.camera.position.distanceToSquared(userRef.pos) > 0.04 || stage.controls.target.distanceToSquared(userRef.tgt) > 0.04) {
      userRef.armed = false;
      app.userMoved = true;
    }
  }

  // ------------------------------------------------------------------ registry guards
  // reg.setXray / reg.highlight clone each mesh's material; a mesh with a material
  // ARRAY (against the build contract) makes them throw. Never let that abort a frame
  // or a toggle: report it once and carry on.
  const warned = new Set();
  function regGuard(tag, fn) {
    try { fn(); } catch (e) {
      if (warned.has(tag)) return;
      warned.add(tag);
      const bad = [];
      ctx.root.traverse((o) => { if (o.isMesh && Array.isArray(o.material) && o.userData.partId && !bad.includes(o.userData.partId)) bad.push(o.userData.partId); });
      console.warn(`[ui] ${tag} failed (${e && e.message}). Parts with material-array meshes: ${bad.join(', ') || 'none found'}; give each mesh one material (CONTRACT.md).`);
    }
  }
  const regXray = (on) => regGuard('X-ray', () => reg.setXray(on));
  const regHighlight = (id) => regGuard('highlight', () => reg.highlight(id));

  // ------------------------------------------------------------------ toggles
  function setXray(on) {
    app.xray = !!on;
    regXray(app.xray);
    controls.setToggle('xray', app.xray);
    picker.invalidate();
    labels.relayout();
  }
  function setCase(on) {
    app.caseOn = !!on;
    reg.setCategoryVisible('case', app.caseOn);
    controls.setToggle('case', app.caseOn);
    picker.invalidate();
    labels.relayout();
    if (!app.caseOn && app.selected && reg.byId.get(app.selected)?.category === 'case') select(null);
  }
  function setLabels(on) {
    app.labels = !!on;
    // a label fading out under a still pointer gets no pointerleave: drop its hover now
    if (!app.labels) app.labelHover = null;
    controls.setToggle('labels', app.labels);
    if (app.mode === 'ui') labels.setEnabled(app.labels);
  }
  function toggle(name) {
    if (!interactive()) return;
    if (name === 'labels') setLabels(!app.labels);
    else if (name === 'xray') setXray(!app.xray);
    else if (name === 'case') setCase(!app.caseOn);
  }
  function setTimeScale(s) {
    app.timeScale = s;
    if (s === 1) kin.goLive(); else kin.setTimeScale(s);
    controls.setTime(s);
  }

  // ------------------------------------------------------------------ selection, hover, tooltip
  function select(id) {
    if (!interactive()) return;
    const p = id ? reg.byId.get(id) : null;
    if (!p) {
      app.selected = null;
      panel.close(true);
    } else {
      app.selected = p.id;
      panel.open(p);
    }
    layoutChanged();
  }

  const tip = $('tip');
  let tipX = 0;
  let tipY = 0;
  let tipW = 80; // measured when the text changes, not on every pointermove (no layout thrash)
  function moveTip(x, y) {
    tipX = x;
    tipY = y;
    if (!tip || tip.hidden) return;
    const left = x + 14 + tipW > window.innerWidth - 8 ? x - 12 - tipW : x + 14;
    tip.style.transform = `translate(${Math.round(left)}px,${Math.round(y + 16)}px)`;
  }
  function showTip(id, x = tipX, y = tipY) {
    if (!tip) return;
    if (!id || !interactive()) { tip.hidden = true; return; }
    const p = reg.byId.get(id);
    setText(tip, p ? p.name || id : id);
    tip.hidden = false;
    tipW = tip.offsetWidth || 80;
    moveTip(x, y);
  }

  function syncHighlight() {
    const spot = show.active ? show.spot.id : null;
    const id = app.mode === 'ui' ? app.labelHover || app.hover || app.selected : spot;
    if (id !== app.highlighted) {
      app.highlighted = id || null;
      regHighlight(app.highlighted);
    }
    labels.setHover(app.mode === 'ui' ? app.labelHover || app.hover : null);
    labels.setEmphasis(spot);
  }

  // ------------------------------------------------------------------ winding
  // The crown winds every watch with keyless data; an automatic without it gets its
  // rotor swung instead.
  function startWind() {
    if (!interactive()) return;
    const sp = kin.spec || ctx.spec || {};
    if (sp.keyless) {
      if (app.windLeft <= 0) app.windLeft = 1.6;
    } else if (sp.automatic) {
      app.shakeLeft = 2.2;
    } else return;
    hud.setWinding(true);
  }
  function updateWind(dt) {
    if (app.windLeft > 0) {
      const k = 1 - app.windLeft / 1.6; // 0 → 1
      const rate = 4 * TAU * Math.sin(Math.PI * clamp(k, 0, 1)); // crown rad/s, eased
      if (rate > 0) kin.wind(rate * dt);
      app.windLeft -= dt;
      if (app.windLeft <= 0) { app.windLeft = 0; hud.setWinding(picker.dragging || app.shakeLeft > 0); }
    }
    if (app.shakeLeft > 0) {
      const v = kin.state.rotorVel || 0;
      if (Math.abs(v) < 9 && dt > 0) kin.addRotorImpulse((v >= 0 ? 1 : -1) * 16 * dt);
      app.shakeLeft -= dt;
      if (app.shakeLeft <= 0) { app.shakeLeft = 0; hud.setWinding(picker.dragging || app.windLeft > 0); }
    }
  }

  // ------------------------------------------------------------------ shows (wallpaper)
  function labelsWantedInShow(kind) {
    if (app.mode === 'wall') return app.wallLabels !== null ? app.wallLabels : kind === 'exploded' || kind === 'cinematic';
    return app.labels;
  }

  function enterShow(kind, { mode = 'wall', immediate = false, period = 48, at = 0, lead = 1.6 } = {}) {
    if (app.mode === 'ui') {
      app.saved = { xray: app.xray, caseOn: app.caseOn, labels: app.labels };
      if (app.xray) { regXray(false); app.xray = false; }
      if (!app.caseOn) { reg.setCategoryVisible('case', true); app.caseOn = true; }
    }
    app.mode = mode;
    app.selected = null;
    app.hover = null;
    app.labelHover = null;
    app.windLeft = 0;
    app.shakeLeft = 0;
    hud.setWinding(false);
    panel.close(true);
    controls.help.close();
    showTip(null);
    picker.setEnabled(false);
    pickerHold = false;
    rig.cancel();
    ex.active = false;
    uiEl.classList.add('bare');
    if (labelsEl) labelsEl.inert = true; // labels are buttons: keep them out of the tab order
    if (document.activeElement && uiEl.contains(document.activeElement)) document.activeElement.blur();
    show.start(kind, { immediate, period, at, lead });
    labels.setFilter(show.labelFilter);
    labels.setEnabled(labelsWantedInShow(kind));
    app.showEnteredAt = now();
    cursor.set(mode === 'wall' && !app.boxed);
    hideHint();
    layoutChanged();
  }

  function exitShow(view = app.view, { dur = 1.4 } = {}) {
    if (app.mode === 'ui') return;
    if (app.mode === 'wall') app.wallT = show.time;
    show.stop();
    app.mode = 'ui';
    uiEl.classList.remove('bare');
    if (labelsEl) labelsEl.inert = false;
    cursor.set(false);
    hideHint();
    const s = app.saved;
    app.saved = null;
    if (s) {
      setXray(s.xray);
      setCase(s.caseOn);
      app.labels = s.labels;
    }
    labels.setFilter(null);
    labels.setEnabled(app.labels);
    controls.setToggle('labels', app.labels);
    if (!pickerHold) picker.setEnabled(true);
    rig.setUserControl(true);
    setView(view, { dur });
    layoutChanged();
  }

  // (Re)start the wallpaper show while in 'wall' mode.
  function startWallShow(kind, { lead = 1.6, at = 0 } = {}) {
    show.start(kind, { immediate: !started, lead, at });
    labels.setFilter(show.labelFilter);
    labels.setEnabled(labelsWantedInShow(kind));
    layoutChanged();
  }

  // Back to the wallpaper (Wallpaper button, Space / Esc, idle). The loop continues
  // where it was left; the camera eases into it from wherever it is.
  function goWall(reason = 'button') {
    if (app.mode === 'rec' || recorder.recording) return;
    app.session = true;
    if (app.mode === 'wall' || app.boxed) return;
    recorder.close();
    // while Lively has rendering paused, be in place (no flight) when it resumes
    enterShow(app.wallView, { mode: 'wall', at: app.wallT, lead: reason === 'idle' ? 2.4 : 1.8, immediate: app.paused });
    if (reason === 'button' || reason === 'key') flashHint('Click anywhere to explore');
  }

  // The interactive view closest to what the wallpaper shows right now.
  function viewForWake() {
    const k = show.kind;
    if (k === 'dial' || k === 'movement' || k === 'exploded') return k;
    if (reg.explode > 0.5) return 'exploded';
    return Math.cos(rig.readPose(tmpPose3).az) < 0 ? 'movement' : 'dial';
  }

  function wake() {
    if (app.mode !== 'wall') return;
    app.wokeAt = now();
    exitShow(viewForWake(), { dur: 1.6 });
  }

  // ------------------------------------------------------------------ input: wake + idle
  // In wallpaper mode the first pointerdown / wheel / key wakes the interface (in
  // Lively the first click it receives: the one before may only have activated the
  // desktop). A press also reaches OrbitControls (enabled synchronously here), so a
  // drag orbits at once and a plain click lets the camera finish its flight; it
  // doesn't select a part. The waking key or wheel tick does nothing else.
  let pickerHold = false;
  // our own press state: Lively's forwarded moves always say buttons = 0
  let pressed = false;
  let pressedAt = 0;
  function noteInput() { app.lastInput = now(); }
  function onWakeInput(e) {
    noteInput();
    if (e.type === 'pointerdown') { pressed = true; pressedAt = now(); }
    if (app.boxed) return;
    if (app.mode !== 'wall') {
      if (e.type === 'wheel' && app.mode === 'ui' && now() - app.wokeAt < WAKE_GUARD_MS) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (e.type === 'keydown') {
      if (e.repeat || MODIFIER_KEYS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
    } else if (e.type === 'wheel') {
      e.preventDefault();
      e.stopPropagation();
    } else if (e.type === 'pointerdown') {
      pickerHold = true;
    }
    wake();
  }
  function releasePickerHold() {
    if (!pickerHold) return;
    pickerHold = false;
    if (interactive()) picker.setEnabled(true);
  }
  window.addEventListener('pointerdown', onWakeInput, { capture: true });
  window.addEventListener('wheel', onWakeInput, { capture: true, passive: false });
  window.addEventListener('keydown', onWakeInput, { capture: true });
  // capture phase: the watch box stops propagation of the events it handles
  window.addEventListener('pointerup', () => { pressed = false; noteInput(); releasePickerHold(); }, { capture: true });
  window.addEventListener('pointercancel', () => { pressed = false; releasePickerHold(); }, { capture: true });
  // Lively forwards mouse movement even while other windows have the focus, so there
  // only moves during a press count as activity; in a browser any movement does.
  window.addEventListener('pointermove', () => {
    if (pressed && now() - pressedAt > 15000) pressed = false; // a lost pointerup
    if (!app.appDriven || pressed) noteInput();
  }, { capture: true, passive: true });

  function checkIdle(t) {
    if (!app.session || app.mode !== 'ui' || !(app.idleMs < Infinity)) return;
    if (t - app.lastInput < app.idleMs) return;
    if (recorder.recording || picker.dragging) return;
    app.lastInput = t;
    if (app.boxed) { closeBoxToWall(); return; }
    goWall('idle');
  }
  // Also on a timer: Lively freezes rendering (and requestAnimationFrame) while paused,
  // but timers keep running — the wallpaper is back in place when the desktop shows.
  setInterval(() => checkIdle(now()), 1000);

  // ------------------------------------------------------------------ watch box
  // ctx.box is created by main.js after the UI. While it is open main.js renders only
  // the box (no beforeRender / afterApply). Its state is synced on the box's own
  // window events and, as a fallback, polled in frameInterval().
  const boxState = { pose: makePose(), wasTweening: false, arrive: false, wallAfter: false };
  const boxActive = () => !!(ctx.box && ctx.box.active);
  window.addEventListener('watchbox:open', () => syncBox());
  window.addEventListener('watchbox:close', () => syncBox());

  function openBox() {
    if (!interactive() || recorder.recording || recorder.modalOpen) return;
    const b = ctx.box;
    if (!b || typeof b.open !== 'function') { toast('The watch box is not available.'); return; }
    try { b.open(); } catch (e) { console.error('[ui] watch box', e); return; }
    syncBox();
  }
  function closeBoxToWall() {
    boxState.wallAfter = true;
    try { if (ctx.box && ctx.box.close) ctx.box.close(); } catch (e) { console.error('[ui] watch box', e); }
    syncBox();
  }
  function syncBox() {
    const on = boxActive();
    if (on === app.boxed) return;
    if (on) boxOpened(); else boxClosed();
  }
  function boxOpened() {
    app.boxed = true;
    boxState.arrive = false;
    boxState.wasTweening = rig.tweening;
    rig.readPose(boxState.pose);
    uiEl.classList.add('boxed');
    if (labelsEl) labelsEl.inert = true;
    if (app.mode === 'ui') {
      panel.close(true);
      app.selected = null;
      app.hover = null;
      app.labelHover = null;
      controls.help.close();
    }
    showTip(null);
    hideHint();
    pickerHold = false;
    picker.setEnabled(false);
    rig.cancel();
    rig.setUserControl(false);
    clearShift();
    cursor.set(false);
    if (document.activeElement && uiEl.contains(document.activeElement)) document.activeElement.blur();
  }
  function boxClosed() {
    app.boxed = false;
    uiEl.classList.remove('boxed');
    theme.reassert(); // the box may have drawn its own background
    noteInput();
    const toWall = boxState.wallAfter;
    boxState.wallAfter = false;
    if (app.mode === 'ui' && toWall) {
      boxState.arrive = false;
      goWall('idle');
      return;
    }
    if (app.mode === 'ui') {
      if (labelsEl) labelsEl.inert = false;
      picker.setEnabled(true);
      rig.setUserControl(true);
      if (boxState.arrive) arrive(app.view, 1.2);
      else if (boxState.wasTweening) setView(app.view, { dur: 0.9, keepExplode: true });
      else rig.applyPose(boxState.pose);
    } else if (app.mode === 'wall') {
      cursor.set(true);
    }
    boxState.arrive = false;
    layoutChanged();
  }

  // ------------------------------------------------------------------ wallpaper options
  function applyWallpaper(patch, { fromApp = false } = {}) {
    if (fromApp && !app.appDriven) { app.appDriven = true; applyInset(); }
    if (patch.theme !== undefined && patch.theme !== null) theme.setChoice(patch.theme, { animate: started });
    if (patch.fps30 !== undefined) app.fps30 = !!patch.fps30;
    if (patch.fps60 !== undefined) app.fps60 = !!patch.fps60;
    if (patch.labels !== undefined && patch.labels !== null) app.wallLabels = !!patch.labels;
    if (patch.idleMs !== undefined) app.idleMs = patch.idleMs;
    if (patch.watch !== undefined) requestAppWatch(patch.watch);
    const viewChanged = !!patch.view && patch.view !== app.wallView;
    if (patch.view) {
      app.wallView = patch.view;
      if (viewChanged) app.wallT = 0;
    }
    if (app.mode === 'rec') return;
    const wasSession = app.session;
    app.session = true;
    if (app.mode === 'wall') {
      if (patch.view && patch.view !== show.kind) startWallShow(patch.view, { lead: 1.6 });
      else {
        labels.setEnabled(labelsWantedInShow(show.kind));
        if (patch.labels !== undefined && patch.labels !== null) show.rebuild(); // exploded framing leaves room for labels
      }
      return;
    }
    if (app.boxed) return;
    // Interactive: start the wallpaper unless the user woke it and only an option changed.
    if (!started || !wasSession || (patch.view && (viewChanged || !fromApp))) {
      enterShow(app.wallView, { mode: 'wall', immediate: !started, at: app.wallT });
    }
  }

  // Lively's 'watch' dropdown. Lively replays its stored values on every load, which
  // would undo a watch picked in the box: only a value that differs from the last one
  // seen (persisted, then tracked per page so two screens both follow a change) picks.
  let livelyLast; // undefined until the first 'watch' value arrives
  let pendingWatch = null;
  let ready = false;
  function requestAppWatch(v) {
    const key = String(v ?? '').trim();
    if (!key) return;
    if (livelyLast === undefined) {
      try { livelyLast = localStorage.getItem(LIVELY_LAST_KEY); } catch { livelyLast = null; }
    }
    if (key === livelyLast) return;
    livelyLast = key;
    try { localStorage.setItem(LIVELY_LAST_KEY, key); } catch { /* ignore */ }
    const list = ctx.watches || [];
    const w = /^\d+$/.test(key) ? list[Number(key)] : list.find((x) => x.id === key);
    if (!w) return;
    pendingWatch = { id: w.id, persist: true };
    flushWatch();
  }
  // selectWatch may only run once main.js holds the UI (it calls ui.onWatchChanged),
  // and not in the middle of a recording.
  function flushWatch() {
    if (!pendingWatch || !ready || recorder.recording) return;
    if (!ctx.ui || typeof ctx.selectWatch !== 'function') { setTimeout(flushWatch, 30); return; }
    const { id, persist } = pendingWatch;
    pendingWatch = null;
    try { ctx.selectWatch(id, { persist }); } catch (e) { console.error('[ui] selectWatch', e); }
  }
  // The other screen's wallpaper (Lively "Duplicate") picked a watch in its box.
  window.addEventListener('storage', (e) => {
    if (e.key !== CURRENT_KEY || !e.newValue || !app.appDriven) return;
    if (!(ctx.watches || []).some((w) => w.id === e.newValue)) return;
    if (ctx.watch && ctx.watch.id === e.newValue) return;
    pendingWatch = { id: e.newValue, persist: false };
    flushWatch();
  });

  // Lively's pause event (a maximised / fullscreen window covers a screen). Lively also
  // freezes requestAnimationFrame meanwhile; frames are clamped on resume (dt ≤ 0.1 s).
  let pausedFrames = 0;
  function setPaused(on) {
    if (!app.appDriven) { app.appDriven = true; applyInset(); }
    app.paused = !!on;
    pausedFrames = 0;
  }

  // Lively draws the page under the Windows taskbar: in a wallpaper context (wallpaper
  // URL or a wallpaper app) the clickable chrome keeps clear of the bottom strip.
  // URL .taskbar<px> / ?taskbar=<px> gives the taskbar height, .taskbar0 turns it off.
  let wallContext = false;
  let taskbarURL; // px from the URL, undefined = default
  let insetPx = 0;
  function applyInset() {
    const tb = taskbarURL !== undefined ? taskbarURL : wallContext || app.appDriven ? TASKBAR_PX : 0;
    const px = tb > 0 ? tb + 4 : 0; // 12 px bar padding + this ≥ taskbar + 16
    if (px === insetPx && docEl.style.getPropertyValue('--inset-b')) return;
    insetPx = px;
    docEl.style.setProperty('--inset-b', `${px}px`);
    if (started) layoutChanged();
  }

  let hintTimer = 0;
  const hint = $('hint');
  function flashHint(text) {
    if (!hint) return;
    if (text) setText(hint, text);
    hint.classList.add('on');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 3500);
  }
  function hideHint() { clearTimeout(hintTimer); hint?.classList.remove('on'); }

  // ------------------------------------------------------------------ recording
  let recPrev = null;
  function beginRecording(content, { duration, w, h }) {
    recPrev = { mode: app.mode, kind: show.kind };
    clearShift();
    stage.setFixedSize({ w, h });
    docEl.classList.add('recording');
    uiEl.classList.add('rec');
    enterShow(content, { mode: 'rec', immediate: true, period: duration });
    const s = (Math.min(w, h) / 1080) * 1.2; // video is watched from further away than a page
    labels.setViewport({ canvas: true, w, h, s, top: 56 * s, bottom: (content === 'cinematic' ? 150 : 56) * s, left: 48 * s, right: 48 * s, phone: false, sub: true });
  }
  function endRecording() {
    stage.setFixedSize(null);
    docEl.classList.remove('recording');
    uiEl.classList.remove('rec');
    const prev = recPrev;
    recPrev = null;
    if (prev && prev.mode === 'wall') {
      app.mode = 'wall';
      startWallShow(prev.kind || app.wallView, { at: app.wallT });
    } else {
      exitShow(app.view);
    }
    updateViewport(true);
    noteInput();
    flushWatch();
  }

  // ------------------------------------------------------------------ toast
  const toastEl = $('toast');
  let toastTimer = 0;
  function toast(content, ms = 4000) {
    if (!toastEl) return;
    toastEl.textContent = '';
    toastEl.append(content && content.nodeType ? content : document.createTextNode(String(content)));
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
  }

  // ------------------------------------------------------------------ frustum shift
  // While the info panel is open the picture slides over (left on desktop, up on
  // phones) via camera.setViewOffset, so the panel doesn't cover the watch. Labels
  // and picking use the same projection, so they follow automatically.
  const shift = { x: 0, y: 0, tx: 0, ty: 0, w: 0, h: 0, on: false };
  function measureShift() {
    shift.tx = 0;
    shift.ty = 0;
    if (app.mode !== 'ui' || !panel.isOpen) return;
    const pe = $('panel');
    if (isPhone()) shift.ty = Math.min(((pe && pe.offsetHeight) || 0) * 0.5, window.innerHeight * 0.26);
    else shift.tx = (panel.width + 32) * 0.5;
  }
  function clearShift() {
    shift.x = shift.y = shift.tx = shift.ty = 0;
    if (shift.on) { shift.on = false; stage.camera.clearViewOffset(); }
  }
  function updateShift(dt) {
    if (app.mode === 'rec') return;
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt / 0.12);
    const nx = shift.x + (shift.tx - shift.x) * k;
    const ny = shift.y + (shift.ty - shift.y) * k;
    const settledZero = shift.tx === 0 && shift.ty === 0 && Math.abs(nx) < 0.3 && Math.abs(ny) < 0.3;
    if (settledZero) { if (shift.on) clearShift(); return; }
    // stage size cached by updateViewport (resize / layout changes): no per-frame layout reads
    const w = vpW;
    const h = vpH;
    if (Math.abs(nx - shift.x) < 0.05 && Math.abs(ny - shift.y) < 0.05 && shift.on && w === shift.w && h === shift.h) return;
    shift.x = nx;
    shift.y = ny;
    shift.w = w;
    shift.h = h;
    shift.on = true;
    stage.camera.setViewOffset(w, h, nx, ny, w, h);
  }

  // ------------------------------------------------------------------ viewport for labels
  const stageEl = $('stage');
  let vpW = window.innerWidth;
  let vpH = window.innerHeight;
  function updateViewport(forceDom) {
    if (app.mode === 'rec') return;
    const w = (stageEl && stageEl.clientWidth) || window.innerWidth;
    const h = (stageEl && stageEl.clientHeight) || window.innerHeight;
    vpW = w;
    vpH = h;
    const phone = isPhone();
    const bare = app.mode !== 'ui';
    let top = 28;
    let bottom = 28;
    let left = 16;
    let right = 16;
    if (!bare) {
      const topEl = $('top');
      const barEl = $('bar');
      top = topEl ? topEl.getBoundingClientRect().bottom + 12 : 120;
      bottom = barEl ? Math.max(28, h - barEl.getBoundingClientRect().top + 12) : 90;
      if (zoomEl && zoomEl.offsetParent !== null) left = Math.max(left, zoomEl.getBoundingClientRect().right + 12);
      if (panel.isOpen) {
        if (phone) bottom = Math.max(bottom, h * 0.52 + 12);
        else right = Math.max(16, panel.width + 36);
      }
    } else if (show.kind === 'cinematic' || show.kind === 'exploded') {
      bottom = (phone ? 150 : 170) + insetPx; // keep the spotlight caption clear
    } else {
      bottom = 28 + insetPx;
    }
    labels.setViewport({ canvas: false, w, h, s: 1, top, bottom, left, right, phone, sub: !phone });
    measureShift();
    if (forceDom) labels.relayout();
  }
  let layoutTimer = 0;
  function layoutChanged() {
    clearTimeout(layoutTimer);
    updateViewport();
    // panel / bar transitions settle later: measure again
    layoutTimer = setTimeout(() => updateViewport(), 560);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    updateViewport();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateViewport();
      if (interactive() && !app.userMoved && !rig.tweening) setView(app.view, { dur: 0.6, keepExplode: true });
    }, 180);
  });

  // ------------------------------------------------------------------ keyboard
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (app.boxed || boxActive()) return; // the watch box has the keyboard
    if (recorder.recording) {
      if (e.key === 'Escape') { e.preventDefault(); recorder.cancel(); }
      return;
    }
    if (recorder.modalOpen) return;
    if (app.mode !== 'ui') return; // in wallpaper mode the waking key was swallowed
    const t = e.target;
    const tag = t && t.tagName;
    if ((tag === 'INPUT' && t.type !== 'range') || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    const k = e.key;
    // Space on a focused button activates that button natively; it must not also
    // start the wallpaper (keyboard users would be thrown out of the page).
    if ((k === ' ' || k === 'Spacebar') && t && t.closest && t.closest('button, a[href], [role="button"], summary')) return;
    let handled = true;
    switch (k) {
      case 'd': case 'D': setView('dial'); break;
      case 'm': case 'M': setView('movement'); break;
      case 'e': case 'E': setView('exploded'); break;
      case 'x': case 'X': setXray(!app.xray); break;
      case 'l': case 'L': setLabels(!app.labels); break;
      case 'c': case 'C': setCase(!app.caseOn); break;
      case 'w': case 'W': startWind(); break;
      case 'b': case 'B': openBox(); break;
      case '+': case '=': zoomStep(1); break;
      case '-': case '_': case '−': zoomStep(-1); break;
      case '0': case 'r': case 'R': resetView(); break;
      case ' ': case 'Spacebar': goWall('key'); break;
      case '[': explodeTo(Math.round((reg.explode - 0.1) * 10) / 10, 0.35); break;
      case ']': explodeTo(Math.round((reg.explode + 0.1) * 10) / 10, 0.35); break;
      case '?': controls.help.toggle(); break;
      case 'Escape':
        if (controls.help.isOpen) controls.help.close();
        else if (panel.isOpen) select(null);
        else if (app.session) goWall('key');
        else handled = false;
        break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  // URL changes (e.g. the wallpaper token removed / added in the address bar).
  // A URL describes the whole wallpaper state, so options it no longer names go back
  // to their defaults (e.g. #wallpaper.nolabels → #wallpaper shows labels again).
  // The theme is only reset if a URL forced it.
  let urlTheme = false;
  function applyWallpaperURL(w) {
    app.wallLabels = null;
    if (urlTheme && (!w || !w.theme)) { theme.setChoice('watch', { animate: started }); urlTheme = false; }
    if (w && w.theme) urlTheme = true;
    wallContext = !!w;
    taskbarURL = w ? w.taskbar : undefined;
    applyInset();
    if (w) applyWallpaper(w);
  }
  window.addEventListener('hashchange', () => {
    const w = parseWallpaperURL();
    applyWallpaperURL(w);
    if (!w && !app.appDriven) {
      app.session = false;
      app.fps30 = false;
      app.fps60 = false;
      if (app.mode === 'wall') exitShow(viewForWake());
    }
  });

  // ------------------------------------------------------------------ the watch on show
  // Everything that depends on the watch descriptor or holds part objects. Returns
  // false when nothing was rebuilt since the last call (same watch, same parts).
  const applied = { watch: null, first: null, count: -1 };
  function applyWatch(w, { boot = false } = {}) {
    if (!w) return false;
    const first = reg.parts[0] || null;
    if (applied.watch === w && applied.first === first && applied.count === reg.parts.length) return false;
    applied.watch = w;
    applied.first = first;
    applied.count = reg.parts.length;
    // drop everything that pointed at the previous build's parts
    panel.close(true);
    app.selected = null;
    app.hover = null;
    app.labelHover = null;
    app.highlighted = null;
    showTip(null);
    labels.reset();
    picker.reset();
    show.invalidate();
    rules.setWatch(w);
    // the user's display toggles carry over to the new parts
    if (app.mode === 'ui') {
      if (app.xray) regXray(true);
      if (!app.caseOn) reg.setCategoryVisible('case', false);
    }
    try { rig.computeBoxes(); } catch (e) { console.warn('[ui] boxes', e); }
    hud.setWatch(w);
    controls.setWatch(w);
    theme.setWatch(w, { animate: !boot });
    try { document.title = w.title && w.ref ? `${w.title} ${w.ref}` : w.title || w.model || 'Watch Collection'; } catch { /* ignore */ }
    app.windLeft = 0;
    app.shakeLeft = 0;
    hud.setWinding(false);
    return true;
  }

  // After a rebuild: frame the new watch (main.js rebuilt it at explode 0; carry on
  // from the explode amount the previous watch had, so nothing jumps).
  function afterWatchChange() {
    const ex0 = app.lastExplode;
    if (app.mode === 'ui') {
      ex.active = false;
      const target = app.view === 'exploded' ? 1 : 0;
      if (app.boxed) {
        // the box covers the scene: be framed already, fly in when it closes
        reg.setExplode(target);
        const m = uiMargins(app.view);
        rig.viewPose(app.view, tmpPose, m.h, m.v);
        rig.applyPose(tmpPose);
        copyPose(boxState.pose, tmpPose);
        boxState.arrive = true;
      } else {
        reg.setExplode(ex0);
        arrive(app.view, 1.2);
        explodeTo(target, 1.4);
      }
    } else if (app.mode === 'wall') {
      reg.setExplode(ex0);
      startWallShow(show.kind || app.wallView, { at: show.time, lead: 1.4 });
    } else if (app.mode === 'rec') {
      reg.setExplode(ex0);
      show.rebuild();
    }
    picker.setEnabled(interactive() && !pickerHold);
    layoutChanged();
  }

  let booted = false;
  function finishBoot() {
    if (booted) return;
    booted = true;
    uiEl.classList.remove('booting');
    docEl.classList.remove('wp-boot');
    layoutChanged();
  }

  // ------------------------------------------------------------------ start-up
  let started = false;
  applyWatch(ctx.watch, { boot: true });
  const wall = parseWallpaperURL();
  if (wall) applyWallpaperURL(wall);
  // also replays properties queued during load; a theme chosen in the app wins over the URL's
  installWallpaperHooks({
    apply: (p) => { if (p.theme) urlTheme = false; applyWallpaper(p, { fromApp: true }); },
    pause: (on) => setPaused(on),
  });
  if (app.mode === 'ui') {
    // front dial view with a short dolly-in; the first frame already shows the watch
    labels.setEnabled(app.labels);
    arrive('dial', 1.1);
    reg.setExplode(0);
  }
  started = true;
  controls.setTime(1);
  updateViewport();
  setTimeout(() => updateViewport(), 600);
  try { document.fonts?.ready?.then(() => updateViewport()); } catch { /* ignore */ }
  // a 'watch' property that arrived during load is applied once main.js holds the UI
  (typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn))(() => { ready = true; flushWatch(); });
  setTimeout(finishBoot, 0); // normally done by the first onWatchChanged

  // ------------------------------------------------------------------ frame hooks
  let last = 0;
  let dt = 0;
  let syncAcc = 1;
  const capEl = $('caption');
  const capName = $('caption-n');
  const capDesc = $('caption-d');
  let capId = null;
  let capOn = false;

  function updateCaption() {
    const sp = show.active && !show.leading ? show.spot : null;
    if (sp && sp.id && sp.id !== capId) {
      capId = sp.id;
      setText(capName, sp.name);
      setText(capDesc, sp.line);
    }
    const on = !!(sp && sp.id && sp.alpha > 0.5);
    if (on !== capOn) { capOn = on; capEl?.classList.toggle('on', on); }
  }

  // Solid case back: hidden in the movement views, X-ray and when exploded.
  function hideBackNow() {
    if (reg.xray || reg.explode > 0.15) return true;
    if (app.mode === 'ui') return app.view === 'movement';
    const k = show.kind;
    if (k === 'movement' || k === 'exploded') return true;
    if (k === 'dial') return false;
    return Math.cos(rig.readPose(tmpPose3).az) < 0; // cinematic: whenever the camera is behind
  }

  return {
    beforeRender(state) {
      const t = now();
      dt = last ? clamp((t - last) / 1000, 0, 0.1) : 0;
      last = t;
      // render-size budget: lower while the wallpaper plays (stage re-applies it on resize)
      const budget = app.mode === 'wall' ? WALL_BUDGET_MP : FULL_BUDGET_MP;
      if (stage.setPixelBudget && Math.abs((stage.pixelBudget || 0) - budget) > 0.01) stage.setPixelBudget(budget);
      if (show.active) show.update(dt);
      else {
        rig.update(dt);
        checkUserMoved();
        updateExplode(dt);
      }
      updateWind(dt);
      updateShift(dt);
      theme.update(dt);
      void state;
    },

    afterApply(state) {
      app.lastExplode = reg.explode;
      ruleState.dt = dt;
      ruleState.caseOn = app.caseOn;
      ruleState.explode = reg.explode;
      ruleState.hideBack = rules.hasCaseback ? hideBackNow() : false;
      rules.update(ruleState);
      picker.frame();
      syncHighlight();
      labels.frame(dt, state);
      if (app.mode !== 'rec') {
        hud.update(state, dt);
        panel.update(state, dt);
        updateCaption();
      }
      syncAcc += dt;
      if (syncAcc >= 0.1) {
        syncAcc = 0;
        if (app.mode === 'ui') controls.setExplode(reg.explode);
      }
    },

    afterRender(state) {
      recorder.afterRender(state);
    },

    // Called by main.js on every animation frame, before anything else (also while the
    // watch box is open): minimum ms between rendered frames. Infinity = don't render
    // (Lively paused us, or the page is hidden).
    frameInterval() {
      const t = now();
      syncBox();
      checkIdle(t);
      if (app.paused) {
        // Lively stops requestAnimationFrame while paused: frames still arriving long
        // after a pause mean the resume event got lost — don't stay frozen forever
        if (++pausedFrames < PAUSE_WATCHDOG_FRAMES) return Infinity;
        app.paused = false;
      }
      if (document.hidden) return Infinity;
      if (app.mode === 'rec') return 0;
      if (app.fps30) return 33;
      if (app.mode === 'wall' && !app.fps60 && t - app.lastInput > AUTO30_MS) return 33;
      return 0;
    },

    // main.js: after every (re)build of the main watch, and once at start-up.
    onWatchChanged(w) {
      const changed = applyWatch(w || ctx.watch);
      if (changed) afterWatchChange();
      finishBoot();
    },

    get paused() { return app.paused || document.hidden; },

    // handy for debugging from the console (window.__watch.ui)
    app, rig, labels, show, theme, hud, setView, enterShow, exitShow, select, applyWallpaper,
    goWall, wake, openBox, zoomStep,
  };
}
