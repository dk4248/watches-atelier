# Build contract — real-time watch replicas (multi-watch)

Single-page Three.js (r170) app, bundled by esbuild into one self-contained HTML file
(`node build.mjs` → `dist/nomos-tangente.html`, plus `dist/lively/` for Lively Wallpaper).
No network at runtime. No external assets. Four watches share one app; the user picks the
"watch of the day" in a leather watch box.

## Layout

```
src/core/       stage.js materials.js kinematics.js registry.js   (shared — owner: integrator)
src/geom/       gear.js                                            (shared)
src/ui/         the interface (labels, controls, cinematic/wallpaper, recorder)
src/box/        the leather watch box (watch-of-the-day picker)
src/watches/index.js                 the collection (order = order in the box)
src/watches/<id>/index.js            the watch descriptor (see below)
src/watches/<id>/spec.js             ALL dimensions/positions/levels/ratios for that watch
src/watches/<id>/parts/*.js          its part builders
```

Watch ids: `tangente-139` (reference implementation — study it), `gs-sbga211`,
`tangente-update-147`, `tudor-m79470`. A watch's files never import another watch's files.
Shared helpers belong in `src/core` / `src/geom` (ask the integrator) — never copy-paste a
whole module from another watch; reading it for technique is encouraged.

## Conventions (non-negotiable)

- **Units: millimetres.** 1 three.js unit = 1 mm.
- **Axes:** watch axis = Z. **+Z points out of the dial towards the viewer.** 12 o'clock = +Y,
  3 o'clock = +X, all in the dial-side frame. Parts on the movement side use the SAME frame
  (seen from the back, 3 o'clock appears on the left — never mirror the coordinates; convert
  back-view measurements with x_dial = −x_back).
- **z = 0 is the dial-side face of the main plate (pillar plate).** Dial side z > 0, movement
  side z < 0. Exact levels come from the watch's `SPEC.z` — never hard-code a level SPEC defines.
- **Positions of every arbor** come from `SPEC.layout`; modules for meshing pairs follow from the
  centre distances (`m = 2d/(z1+z2)`), so meshing wheels are exactly at the right distance.
- **Rotation:** an animated part is a Group (`object`) at its arbor position with a child
  `rotor` Group; the registry sets `rotor.rotation.z` from the kinematics via `drive: { key }`.
  Model the part so its arbor lies on the rotor's local Z axis. Other axes → `update(state)`.
- Meshing gears must interleave: `gear.meshPhase(phi, zA, zB, phaseA)`; wheels keep local
  phase 0, the mating pinion/wheel gets the computed constant local rotation inside its rotor.

## Kinematics (`src/core/kinematics.js`) — what `state` gives you

One object per session; `kin.configure(spec)` re-targets it at the selected watch.
`state.rot[key]` = world rotation.z angles (CCW-positive seen from the dial; hands are negative):
- Hands: `hourHand minuteHand secondHand` (stepped per beat for lever escapements, smooth for
  Spring Drive), `hand24` (24-hour / GMT hand; `spec.gmtOffsetHours`, default local time).
- Train from `spec.train` tooth counts (Tangente style): `barrel center third fourth escape cannon
  minuteWheel hourWheel`; any extra arbor via `spec.arbors = { key: { period: seconds/turn, dir: ±1 } }`
  (dir +1 = CCW seen from the dial).
- Lever escapement (`spec.timing = { beatsPerHour, amplitudeDeg, liftDeg, forkHalfDeg }`):
  `balance fork` (+ `state.balance`, `state.fork`, `state.amplitude`, `state.impulse`).
  Spring Drive (`spec.timing = { type: 'springdrive', glideHz: 8, glideDir }`): `glide`, no balance.
- Winding (`spec.keyless = { ratchet, crownWheel, windingPinion }` teeth): `ratchet` turns for crown
  AND rotor winding; `crownWheel` and `stem` (rotation about +X) only for hand winding with the
  crown (`state.manualWindAngle`); `state.clickLift` (0..1 saw-tooth while a ratchet tooth passes).
- Automatic (`spec.automatic = { naturalPeriod, damping, windPerRad, ratchetPerRotorRad }`):
  `rotor` — a physical pendulum: the rotor's heavy sector is its LOCAL −Y; at rot 0 it hangs to
  6 o'clock. It swings when the user turns the watch. `state.rotorVel` (rad/s). Reversing /
  winding wheels: derive from `state.rot.rotor` × ratio in your own `update()`.
- Date: `state.day` (1–31), `state.datePos` (0..31 continuous, 0 = "1"), `rot.date` = −2π·datePos/31.
  Default: an instantaneous jump (1.2 s ease) at local midnight. `spec.dateChange = { type: 'drag',
  durationSec: 1800 }` makes it creep over that window centred on midnight (NOMOS ring date).
- Power: `state.reserve` (0..1; `spec.powerReserveHours`), `state.P`, `state.B`, `state.date` (Date).
- `kin.bpr[key]` = P-units per turn (period seconds = bpr / state.B) — used by labels ("1 turn / 8 min").

## The `ctx` object every builder receives

```js
export function buildX(ctx) { … }   // add meshes, register parts; may return nothing
ctx = {
  THREE, spec, watch,  // spec = the watch's SPEC; watch = its descriptor
  M,                   // shared material library (clone to change; never mutate)
  reg,                 // registry — reg.add(def), reg.onUpdate(fn)
  root,                // THREE.Group — add your part objects here
  gear, textTexture, planarUV, stage, kin,
  lite,                // true inside the watch box: build only the dial side, cheaply
}
```

**Lite mode (`ctx.lite`)** — the box builds every watch at once (case + dial + hands only, seen
from above on a cushion): skip straps/bracelets (the box draws its own band), use ≤2048 px
textures, fewer segments, no shadows-only detail. The descriptor's `lite` list names the
builders that run in the box.

Materials (`M.*`): `steelPolished steelSatin steelPinion steelDark plateRibbed platePerlage
rhodium rhodiumBevel sunburst wheelGilt wheelRhodium brass goldText blued ruby sapphire
dialBase leather stitch black`. Ribbed/perlaged plates need planar UVs (see the Tangente spec's
`movement.ribbing`). Clone to change a property; never mutate the shared instances.

## Watch descriptor (`src/watches/<id>/index.js`, default export)

```js
{ id, brand, model, ref, caliber, movementType, title, subtitle, boxLabel, boxNote,
  spec, builders: [['case', buildCase], …], lite: ['case', 'dial', 'hands'],
  theme: { mode: 'light'|'dark', light: { bg: [top, bottom], accent }, dark: { bg, accent } },
  show: { spotlight: [ids…], closeup: [ids…], winding: { type: 'manual'|'automatic', ids } },
  solidCaseback: null | 'caseback-id',   // hidden automatically in movement views / X-ray
  strap: { kind: 'leather'|'bracelet'|'fabric', color, … } }   // for the watch box band
```

## Registering parts — `reg.add(def)`

See the header comment in `src/core/registry.js` for all fields. Essentials:

```js
const object = new THREE.Group(); object.position.set(x, y, z); root.add(object);
const rotor = new THREE.Group(); object.add(rotor); rotor.add(mesh);
reg.add({
  id: 'third-wheel', name: 'Third wheel', category: 'train', side: 'back', exposed: false,
  object, rotor, drive: { key: 'third' },
  explode: spec.explode['third-wheel'], explodeDelay: spec.explodeDelay('third-wheel'),
  anchor: [1.2, 0.8, 0],               // label leader target, object-local
  description: 'Passes power from the centre wheel to the fourth wheel, speeding it up 7.5×.',
  facts: { Teeth: '112', Pinion: '16 leaves', Speed: '1 turn / 8 min' },
  live: (s) => `…`,                    // optional, short
  xray: false, priority: 2,
});
```

- Register EVERY distinct physical part a watch enthusiast would want named. Small repeated
  things (e.g. bracelet screws) may be one part.
- `description`: plain English, 1–3 sentences, what it does and why; no marketing.
- `explode`: offset in mm at full explosion, from the watch's `SPEC.explode`: dial side +Z,
  movement side −Z, in assembly order, generous spacing so nothing intersects or hides.
- Mesh flags: castShadow/receiveShadow sensibly (false for glass).
- A material array on a mesh breaks X-ray/highlight cloning — give each mesh one material.

## Canonical part ids (use where the part exists; add more freely)

| category | ids |
|---|---|
| case | `case-body` `bezel` `bezel-insert` `lugs` `crown` `crystal` `caseback-ring` `caseback-glass` `caseback` `strap-top` `strap-bottom` `bracelet` `clasp` `buckle` `spring-bars` `case-clamps` `casing-ring` |
| dial | `dial` `small-seconds` `date-window` `date-disc` `date-ring` `power-reserve` `dial-feet` `indices` |
| hands | `hour-hand` `minute-hand` `seconds-hand` `gmt-hand` `power-reserve-hand` |
| motion | `cannon-pinion` `minute-wheel` `hour-wheel` |
| keyless | `winding-stem` `winding-pinion` `sliding-pinion` `setting-lever` `yoke` `setting-wheel` `keyless-springs` `crown-wheel` `ratchet-wheel` `click` `click-spring` |
| automatic | `rotor` `rotor-bearing` `reversing-wheels` `winding-train` `magic-lever` |
| power | `barrel` `mainspring` `barrel-arbor` `barrel-cover` |
| train | `center-wheel` `third-wheel` `fourth-wheel` `fifth-wheel` `seconds-wheel` |
| escapement | `escape-wheel` `pallet-fork` |
| regulating | `balance-wheel` `hairspring` `roller` `balance-cock` `balance-bridge` `regulator` `shock-absorber` |
| springdrive | `glide-wheel` `tri-synchro-regulator` `quartz-oscillator` `ic` `coil` |
| frame | `main-plate` `three-quarter-plate` `bridges` `pallet-bridge` `plate-screws` `jewels` |
| date / gmt | `date-wheels` `gmt-wheel` `hour-jumper` |

## Building and checking

- `node build.mjs --solo <watchId>[:part,part]` → `dist/solo-<watchId>[-parts].html` (only that
  watch's listed builders + core; others' unfinished files can't break it). `?lite` in the URL
  runs lite mode. Hash views: `#front #back #side #iso #isoBack #top`, modifiers `.explode .xray
  .slow`, `#focus-<partId>.<view>`; console API `window.__solo` (view, explode, focus, xray,
  timeScale, parts, step). The Browser pane throttles requestAnimationFrame while it is hidden:
  call `__solo.step(n)` (javascript_tool) to render n frames before taking a screenshot.
- Dev server: http://localhost:5173/ serves `dist/`. Use your OWN browser tab (tabs_create) and
  pass its tabId on every call; close it when done.

## Quality bar

- Real proportions from SPEC. Smooth silhouettes (≥96 segments for large discs, ≥32 for
  screws/jewels). Bevel/chamfer visible edges where the real part is bevelled.
- Merge static same-material sub-meshes (`mergeGeometries`). Whole watch < ~1.5 M triangles.
- No per-frame allocations in update callbacks.
- Do not edit files you do not own.
