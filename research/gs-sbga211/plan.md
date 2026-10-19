# Grand Seiko SBGA211G "Snowflake" (caliber 9R65 Spring Drive): build plan

Watch id `gs-sbga211`. This is the lead's plan for the four builder agents. The bar is the NOMOS
Tangente 139 replica (`src/watches/tangente-139/`): the user loves it for its accuracy and
detail, so read its `spec.js` and `parts/*.js` for technique before you start.

**Single source of truth: `src/watches/gs-sbga211/spec.js`** (`SPEC`). Every position, radius,
level, tooth count, module, colour and explode offset comes from there. Never hard-code a value
that SPEC defines. If you need a purely cosmetic number SPEC lacks (a fillet radius, a screw
slot width), make it a named local constant in your own module. Anything another module
depends on (a level, a position, a radius) must come from SPEC; if you need one added or
changed, ask the lead/integrator.

Research (read the sections named for your module):
- `research/gs-sbga211/movement.md` covers the 9R65, from teardown photos.
- `research/gs-sbga211/exterior.md` covers the case, dial and hands, from rectified photos.
- Where they disagree, SPEC follows the decisions in section 6 below.

Reference images live in `<scratchpad>/img/gs-sbga211/`.
Rectified 12-up dial images (mm-scaled) are in `…/scratchpad/py-gs/H_*.png`. The lead's
enlarged crops named below are in `…/scratchpad/lead/`: `n32_wheels.png`, `n32_glide.png`,
`f12_pr.png`, `f12_date.png`, `n23_right.png`, `n25_pr.png`, `n27_keyless.png`,
`n43_keyless.png`, `r07_pr.png`. Look at the images with the Read tool, and crop or zoom with PIL
(`python -I`) when you need detail.

---

## 0. Validate, build, look

```bash
node research/gs-sbga211/check.mjs        # must stay green: meshes, kinematics, z-stack, explode, conventions
node build.mjs --solo gs-sbga211          # all builders  → dist/solo-gs-sbga211.html
node build.mjs --solo gs-sbga211:case,dial,hands   # your subset
```

- Dev server: `http://localhost:5173/solo-gs-sbga211.html#back`. Use your own browser tab and
  close it when you are done.
- Hash views: `#front #back #side #iso #isoBack #top`, modifiers `.explode .xray .slow`,
  `#focus-<partId>.<view>`. Add `?lite` for the watch-box build.
- Console: `window.__solo.view('back')`, `.explode(1)`, `.focus('glide-wheel','back')`,
  `.xray(true)`, `.timeScale(0.05)`, `.parts()`.

`check.mjs` models every part's plan footprint and z range from SPEC. It proves that nothing
collides when assembled, and that nothing passes through anything during the explode animation
(registry easing + `SPEC.explodeDelay`). It also proves that the case never hides the mechanism
in the UI's oblique exploded view.
- Build inside the footprints it assumes. The radii are in `SPEC.radii`, the levels in `SPEC.z`.
- If your geometry needs to be bigger, tell the lead so SPEC and the check can be updated together.

---

## 1. Module split and owners

| Builder | Files | Scope | Parts |
|---|---|---|---|
| **B1 Exterior** | `parts/case.js` | Case middle with lugs, bezel, crystal, rehaut, casing ring, screw-down case back and glass, crown, spring bars, titanium bracelet and clasp | 11 |
| **B2 Dial side** | `parts/dial.js`, `parts/hands.js` | Snowflake dial, applied markers and logo, prints, power-reserve fan, date frame, date ring, dial feet; hour, minute, seconds and power-reserve hands | 7 + 4 |
| **B3 Going train and regulator** | `parts/train.js`, `parts/springdrive.js` | Barrel group, wheels 2–6, motion works, date works, power-reserve works; glide wheel, coils, IC, quartz, circuit, stop lever | 19 + 6 |
| **B4 Back and winding** | `parts/frame.js`, `parts/automatic.js` | Plate, bridges, jewels, Diashocks, screws, clamps, engravings; rotor, bearing, Magic Lever, pawl wheel, ratchet, click, the whole keyless chain (crown wheel → stem → setting train → levers) | 9 + 19 |

Notes on the split:
- Unlike the 139's suggested split, the keyless works live in `automatic.js`. All the winding
  (rotor → pawl wheel → ratchet ← keyless intermediate ← crown transmission ← crown wheel ←
  winding pinion ← stem) is one interlocking chain, so it belongs to one builder.
- B3 keeps every wheel driven by the going train, so the meshes 6th → glide, hour wheel → date
  driver and differential → display wheel all stay inside one builder.
- Builder function names: `buildCase`, `buildDial`, `buildHands`, `buildTrain`,
  `buildSpringDrive`, `buildAutomatic`, `buildFrame`. They are already wired in `index.js`.
  `lite = ['case', 'dial', 'hands']`.

---

## 2. Conventions for this watch (on top of CONTRACT.md)

### Frame and levels
- Frame: mm. +Z points out of the dial; 12 o'clock is +Y; the crown (3 o'clock) is +X.
- z = 0 is the main plate's dial-side face.
- Exterior heights in exterior.md use the dial top as zero; SPEC has already converted them
  (`zd()`, z_mov = z_dial + 1.20).
- Reference levels: dial top +1.20, crystal apex +5.10, case-back plane −7.40, rotor top −5.05.
  The movement is 5.80 mm (dial seat +0.75 … −5.05).
- Movement side, from the plate outwards (all in `SPEC.z`):

| z range | What sits there |
|---|---|
| −1.20 … 0 | plate |
| −1.20 … −1.80 | centre wheel, PCB/IC, crown wheel |
| −1.42 … −2.88 | barrel |
| −1.98 … −2.73 | stator, 5th/6th/glide pinions |
| −2.84 … −2.92 | glide disc, stop lever |
| −2.96 … −3.19 | 3rd and 4th wheels, PR wheels |
| −3.20 … −3.62 | bridges |
| −3.64 … −3.80 | ratchet level |
| −3.83 … −3.96 | pawl wheel, Magic Lever |
| −3.98 … −4.38 | automatic bridge |
| −4.27 … −5.05 | rotor |

- Dial side:

| z range | What sits there |
|---|---|
| −0.20 … −0.08 | level 1 (pockets in the plate face) |
| +0.04 … +0.16 | level 2 |
| 0 … +0.14 | keyless levers |
| +0.36 … +0.50 | date ring |
| +0.52 … +0.72 | calendar plate |
| +0.75 … +1.20 | dial |
| +1.13 … +2.55 | hands |

### Positions, meshes and motion
- Positions come from `SPEC.layout` (dial frame). Back-view numbers in the research are already
  converted (x_dial = −x_back).
- Meshes are listed in `SPEC.meshes` as `[arborA, arborB, zA, zB, moduleKey, rotA, rotB]`.
  - Centre distances are exact (check.mjs A).
  - Phase rule: wheel A keeps local phase 0, and B's mesh gets
    `gear.meshPhase(atan2(B−A), zA, zB, 0)` inside its rotor.
  - A pair split across builders is computed from the same SPEC line on both sides, so both get
    the same phase.
- Motion: `SPEC.rotations[key](state)` gives every turning part's rotation.z (CCW-positive seen
  from the dial).
  - Kinematics keys can go straight into `drive: { key }`: barrel, center, third, fourth, fifth,
    sixth, glide, cannon, minuteWheel, hourWheel, dateDriver, settingIntermediate, settingWheel,
    ratchet, crownWheel, rotor.
  - Derived parts use `update()`: pawlWheel, keylessIntermediate, crownTransmission, dateRing,
    prDisplay, prIntermediate, prA, prB, prC.
  - `stemX` (= `state.rot.stem`) is a rotation about +X.
  - These functions allocate nothing. Keep your `update()` callbacks allocation-free too.
- Spring Drive: every arbor turns smoothly and the seconds hand glides at 6°/s.
  - The kinematics count glide-wheel turns: `state.B = 8`, glide period 0.125 s, centre → glide
    = 28,800.
  - Nothing ticks. There is no balance, no escapement and no fork.

### Explode
- Use `explode: SPEC.explode[id]` and `explodeDelay: SPEC.explodeDelay(id)` for every part.
- check.mjs simulates the full animation with the registry's easing. 0 crossings today; keep it
  that way.
- The case middle and bezel slide off backwards as one unit. Only the crystal goes forward, and
  the rehaut rides on the dial (see decision D14).

### Materials and quality
- Shared materials come from `ctx.M`. Clone them to change anything; never mutate.
- One material per mesh. Merge static same-material sub-meshes (`mergeGeometries`).
- At least 96 segments for large discs and at least 32 for screws and jewels. Bevel the edges
  that are bevelled on the real part.
- Whole watch under about 1.5 M triangles.
- Colours: use `SPEC.frame.colours`, `SPEC.case.colours`, `SPEC.dial` / `SPEC.hands` colours and
  `SPEC.regulator.colours`.
- Lite mode (`ctx.lite`, the watch box):
  - Only case, dial and hands run.
  - No bracelet, clasp or spring bars.
  - Textures ≤ 2048 px, fewer segments, no shadow-only detail.
- Register every distinct physical part with:
  - `description`: 1–3 plain sentences on what it does and why, no marketing.
  - `facts` and `live` where useful, `anchor`, and `exposed` / `side` / `priority`.
  - `xray: true` on plates and bridges.
- Categories:

| Category | UI label | Parts |
|---|---|---|
| `case` | Case | everything in case.js, plus `case-clamps` |
| `dial` | Dial | dial parts, including `date-ring` |
| `hands` | Hands | the four hands |
| `power` | Power | barrel group and PR works |
| `train` | Gear train | wheels 2–6 |
| `motion` | Motion works | cannon pinion, minute wheel, hour wheel |
| `date` | Date | date driving wheel, jumper, calendar plate |
| `regulating` | Regulating organ | Tri-synchro Regulator parts |
| `automatic` | Automatic | rotor, bearing, Magic Lever, pawl wheel |
| `keyless` | Keyless works | ratchet, click, crown wheels, stem, setting train, levers |
| `frame` | Frame | plate and bridges |
| `jewels` | Jewels | jewels, Diashocks |
| `screws` | Screws | screws |

---

## 3. Parts, per builder

Columns: id · name · category · side · exposed (visible from its side when assembled) · motion.
Description seeds are given so all builders write in one voice; refine them freely, but keep
them factual (sources: movement.md §2, §11; exterior.md).

### B1: `case.js` (SPEC.case, SPEC.z, SPEC.dial.rehautColour)

| id | name | cat | side | exp | motion |
|---|---|---|---|---|---|
| `case-body` | Middle case and lugs | case | both | yes | — |
| `bezel` | Bezel | case | front | yes | — |
| `crystal` | Sapphire crystal | case | front | yes | — |
| `rehaut` | Rehaut (dial flange) | case | front | yes | — |
| `casing-ring` | Casing ring | case | back | no | — |
| `caseback-ring` | Screw-down case back | case | back | yes | — |
| `caseback-glass` | Sapphire display back | case | back | yes | — |
| `crown` | Screw-down crown | case | both | yes | rotation about X = `state.rot.stem` (as the 139 crown) |
| `spring-bars` | Spring bars | case | both | no | — |
| `bracelet` | Titanium bracelet | case | both | yes | — |
| `clasp` | Three-fold clasp | case | both | yes | — |

The case is THE signature of a Grand Seiko. Get the light right:

- **Zaratsu.** Mirror faces must be distortion-free flat or smoothly convex planes. Use roughness
  `SPEC.case.colours.mirrorRoughness` 0.06 on titanium `#C7C4BE`. Brushed faces use 0.30 with
  anisotropy along 12–6 (+Y).
- **Razor edges.** The border between a hairline face and a mirror face is a crisp line. Split the
  geometry into separate faces with creased normals; never shade one smooth surface across the
  edge.
- **Finishing map** (exterior.md §2.1, `SPEC.case.finish`):
  - Bezel: mirror, convex, r 16.80 → 19.00.
  - Lug tops: hairline-brushed along Y. A broad band runs from the bezel seam out along each lug.
  - Zaratsu bevel between the lug top and the flank: mirror, about 1.2 wide along the lugs, fading
    to zero at 2:30 / 3:30 / 8:30 / 9:30 where it runs into the seam under the bezel.
  - Flank between the lugs, the shoulder at 3 and 9, and the lugs' outer faces: mirror.
  - The case tapers towards the back (`SPEC.case.profile`).
- **Profile.** `SPEC.case.profile` is the revolved outer section, already in movement z: bezel,
  seam groove (r 19.05, 0.08 wide, 0.10 deep), shoulder to the sharp widest edge (r 20.50 at
  z +1.08), convex flank, lower bevel, case-back seam, case-back flank and back face.
  - Lugs: plan outline `lug.planOuter` (mirror it ×4); side profile `lug.profileTop` /
    `profileBottom` / `tipFace`.
  - Lug tips drop 0.3 below the case-back plane.
  - Drilled spring-bar holes at (y ±22.9, z −6.00), visible on the polished outer face.
  - Inner face of the lugs at x ±10.0.
  - The box reads `SPEC.case.lug.springBar` and `SPEC.z.caseBottom`.
- **Crown** (SPEC.case.crown): Ø5.9, 24 deep polished flutes, from x 19.8 to 23.2, axis z −0.90.
  - It sits in a 0.6 counterbore in the flank.
  - End face: polished chamfer ring, matte field, and a raised polished blackletter "GS"
    (2.4 high), upright with 12 up.
  - Tube r 1.25 from the case bore to the crown. The stem (B4) runs through it.
  - Rotate the crown with `state.rot.stem` about +X.
  - Crown winding interaction is in `src/ui`; the 139's crown shows how.
- **Crystal:** dual-curved sapphire.
  - Spherical cap R 860 through apex +5.10 and rim top +4.93, 1.5 thick; underside +3.60 at the
    centre and +3.43 at the rim.
  - Radius 17.10, visible to 16.80 under the bezel lip.
  - IOR 1.77, very faint blue-violet AR at grazing angles (`arTint`).
  - No shadows.
- **Rehaut:** a plain light-grey matte sloped ring, r 15.70 → 16.45, rising from the dial top
  (+1.20) to the crystal underside (+3.40), about 70° steep. No print.
- **Casing ring:** r 15.05–16.80, z −1.20 … +0.75. The dial's rim rests on it; there is a hole for
  the stem.
- **Case back** (`SPEC.case.caseback`, read exterior.md §3):
  - Polished.
  - Six wrench notches at dial-frame angles 43/103/163/223/283/343°.
  - Flat engraved text band r 15.7–17.4: capitals in #55585A, letter tops OUTWARD, reading
    clockwise in the BACK view (so mirrored in the dial frame). Texts: "WATER RESIST.10BAR",
    "9R65-0AE0", boxed "A4" + "U" mark, `SPEC.caseSerial`, "MADE IN JAPAN", "TITANIUM" at the
    given angles.
  - Polished serrated deco ring r 14.6–15.5 with 78 square teeth (raised polished / sunk dark).
  - Stepped polished window bevel r 12.9–14.6. Clear aperture r 12.9.
  - Glass R 13.4 at z −7.10 … −6.10. The inner face is at −5.85, which keeps the rotor 0.8 clear.
- **Bracelet** (`SPEC.case.bracelet`): 20 → 16 mm, five pieces across.
  - Rows: brushed outer links |x| 5.2–10.0, thin MIRROR links |x| 4.2–5.2, brushed centre
    |x| < 4.2. Scale |x| with the taper.
  - Polished edge bevels 0.4; pitch 6.8; thickness 3.4; solid end links from y 17.6 to 25.5.
  - Three-fold clasp with two side pushers. The brushed cover carries a raised polished "GS" in a
    recessed rounded panel 48% of its width. Blade engraving: "SEIKO / TITANIUM-TITANIUM ALLOY /
    JAPAN-B".
  - Use the ids `bracelet` and `clasp` (the camera and box know them).
  - Skip all of it when `ctx.lite`.
- **Images.**
  - Side profile: `ltF_7.jpg` (56.8 px/mm; see exterior.md §8).
  - Finishing map: `ltF_9.jpg` and `ltF_10.jpg`.
  - Official renders: `off_caseside.jpg`, `off_main.png`, `off_dial.jpg`, `btq_caseside.jpg`.
  - Case back square-on: `ltF_6.jpg` (60.95 px/mm).
  - Bracelet and clasp: `ltF_11.jpg`, `ltF_13.jpg`.
  - Worn & Wound `ww_*.jpg` (ww_8 bevel, ww_20 profile); Monochrome `mc_*.jpg`.

### B2: `dial.js` (SPEC.dial, SPEC.date.ring, SPEC.z) and `hands.js` (SPEC.hands, SPEC.rotations)

| id | name | cat | side | exp | motion |
|---|---|---|---|---|---|
| `dial` | Snowflake dial | dial | front | yes | — |
| `indices` | Applied hour markers (11) | dial | front | yes | — |
| `gs-logo` | Applied GS emblem | dial | front | yes | — |
| `power-reserve` | Power-reserve indicator (scale) | dial | front | yes | — |
| `date-window` | Date window frame | dial | front | yes | — |
| `date-ring` | Date ring | dial | front | yes | `drive: { key: 'date', sign: -1 }` (CCW) |
| `dial-feet` | Dial feet | dial | front | no | — |
| `hour-hand` | Hour hand | hands | front | yes | `drive: { key: 'hourHand' }` |
| `minute-hand` | Minute hand | hands | front | yes | `drive: { key: 'minuteHand' }` |
| `seconds-hand` | Gliding seconds hand | hands | front | yes | `drive: { key: 'secondHand' }` |
| `power-reserve-hand` | Power-reserve hand | hands | front | yes | `update: rotor.rotation.z = SPEC.rotations.prDisplay(s)` |

**Snowflake texture** (`SPEC.dial.texture`; exterior.md §5.1). This is what the whole watch is
named after, and the hardest thing to get right.

- Character: freshly fallen, wind-swept snow. Elongated, wavy, braided drift ridges run mostly
  12↔6, wander ±20–30°, split and rejoin. Small crescent-shaped scoop pits look like footprints.
  Over that lies a very fine isotropic grain.
- It is silver plating on stamped brass, so it is not paint and not glossy. It has a soft silvery
  sheen with a faint sparkle on the crests.
  - Flat light: almost white, ±3% brightness.
  - Raking light: strong relief, ±15%.
- Recipe (in mm), on a ≥ 32 mm tile (no visible repeat), 4096 px (2048 in lite):
  `h = 0.55·fbm(warp(p)·(1/0.9, 1/3.0)) + 0.30·ridged(warp(p)·(1/0.35, 1/1.2)) + 0.15·grain(p/0.06)`,
  with domain warp `p + 0.4·(n(p/1.5), n(p/1.5+7))`.
- Bake the normal map and a roughness map. Base colour #E8E9EA, metalness ≈ 0.4, roughness ≈ 0.42.
- Compare side by side, at the same scale, with:
  - `ltF_12.jpg` (macro, 90.3 px/mm, centre (1900.5, 1840.6)) and `H_f12.png`;
  - `mov_naked_20.jpg` (the loose dial under raking light: the best view of the ridge structure);
  - the official `off_dial.jpg` / `btq_dial1.jpg`.
- The texture runs right up to the rehaut. The PR fan and the date frame interrupt it.

**Applied markers** (SPEC.dial.markers): mirror polished, "almost like glass". 0.35 high, facets
about 35°.
- 12: a wedge, wider outward (1.45 → 2.20), with a flat top facet and four bevels.
- 6 and 9: narrower wedges.
- The other eight: parallel bars 1.00 wide with a flat top facet of 0.36 and two broad side
  bevels.
- No marker at 3 (the date window).
- Model real facets; they must catch the environment like the photos (dark/bright split along the
  ridge).

**Applied GS emblem:** polished, faceted blackletter "GS", 2.9 × 2.1, centred (0.05, 8.08),
0.3 high.

**Printing** (one texture or decals on the dial; ink colours in SPEC):
- "Grand Seiko": blackletter, baseline y 5.42, cap top 6.63, x −4.15 … 4.42, #141414.
- "SPRING DRIVE": navy #1E2560, sans capitals with wide tracking, baseline −8.49, cap 0.63.
- Minute track: 48 black ticks r 14.43–14.96, 0.23 wide, none at the 12 hour positions except an
  enlarged tick at 3 (r 14.41–15.16, 0.45 wide).
- "JAPAN 9R65-0BL0 T 2": tiny upright capitals on the arc r 15.15–15.52, tops toward the centre,
  at the given angles.

**Power-reserve fan** (`SPEC.dial.powerReserve`): a fan-shaped recess 0.15 deep about the pivot
(−3.17, −5.80).
- Outer band r 3.40–4.95 with 19 radial ribs every 5° (bright/dark alternating).
- Inner field r < 3.40 with fine concentric grooves at 0.13 pitch.
- Two applied rounded end marks in #7E8184 at 0° (EMPTY) and 263° (FULL).
- Study `f12_pr` crops of `ltF_12.jpg`, and `off_caseside.jpg` (hand at full).

**Date window and ring.**
- The applied polished frame is a 4.35 × 3.35 rectangle (x 9.80–14.15, y −1.70…1.65): a flat top
  band 0.25 wide, then a 45° inner bevel down to the aperture, 0.25 tall, square corners.
- The aperture in the dial is 3.40 × 2.40 at (11.97, −0.02).
- The date ring (`SPEC.date.ring`) is built here because it is seen through the window:
  - White #E6E7E8, black #121212 digits (plain grotesque, height 1.55, stroke 0.22).
  - 31 internal teeth (tips r 8.0, roots 8.45); outer R 14.0; z +0.36…+0.50.
  - Numerals: day d at local maths angle θw − (d−1)·360/31 (θw = `windowAngleDeg`). Each numeral's
    "up" points along the CCW tangent and its digits read radially outward, so it is upright in
    the window.
  - The ring turns CCW, so use `drive: { key: 'date', sign: -1 }`. check.mjs E proves today's
    numeral lands in the window.
  - Tooth phase: a tooth GAP must sit under the jumper's beak (`SPEC.date.jumper.beak`) when the
    ring is at rest.

**Dial feet:** two brass feet at r 14.55, θ 30° and 210°, R 0.3, down to z −0.25 into the plate's
dial-seat rim.

**Hands** (exterior.md §6, `SPEC.hands`):
- Hour and minute hands: dauphine / "razor". Each has a two-facet roof ridge along its centre line
  plus razor-sharp edge bevels, mirror polished. Facets must show the classic half-bright /
  half-dark split.
  - Hour: tip 10.2, tail 3.0, max width 1.65 at r 1.8, collet R 1.10.
  - Minute: tip 14.1, tail 3.3, width table `widthAt`, collet R 0.80.
- Seconds: heat-blued steel #23409A with highlight #4A78C8 (the shared `M.blued` is the right
  family; clone and set the colour).
  - Flat needle, width table `widthAt`; square-ended counterweight tail to 5.2.
  - Blue hub disc R 0.55 with a polished silver centre cap R 0.275.
  - It glides. The kinematics already give a smooth `secondHand`, so do not step it.
- Power-reserve hand: a polished faceted slim spear 4.65 long with a domed polished hub R 0.5
  (it must stay inside the recess; its right edge is at dx +0.53).
  - rotation.z = `SPEC.rotations.prDisplay(s)` = +97°·reserve.
  - FULL points toward 9 (263° clockwise from 12), EMPTY points to 12; it turns clockwise as the
    reserve falls.
- Z levels: `SPEC.z.hourHand`, `minuteHand`, `secondsHand`, `secondsHub`, `prHand`, and the
  collets `hourCollet` / `minuteCollet`.
- Centre stack radii are in `SPEC.hands.centreStack`; B3's pipes end at `SPEC.z.hourPipeTop`,
  `cannonPipeTop` and `secondsArborTop`.

### B3: `train.js` (SPEC.layout/train/modules/z/periods/rotations/powerReserve/date) and `springdrive.js` (SPEC.regulator)

| id | name | cat | side | exp | motion |
|---|---|---|---|---|---|
| `barrel` | Mainspring barrel | power | back | no | drive `barrel` |
| `mainspring` | Mainspring | power | back | no | drive `barrel` + geometry from `s.reserve` (as the 139) |
| `barrel-arbor` | Barrel arbor | power | back | no | drive `ratchet` |
| `barrel-cover` | Barrel cover | power | back | no | drive `barrel` |
| `center-wheel` | Centre (2nd) wheel | train | back | no | drive `center` |
| `third-wheel` | Third wheel | train | back | no | drive `third` |
| `fourth-wheel` | Fourth (seconds) wheel | train | back | no | drive `fourth` |
| `fifth-wheel` | Fifth wheel | train | back | no | drive `fifth` |
| `sixth-wheel` | Sixth wheel | train | back | no | drive `sixth` |
| `cannon-pinion` | Cannon pinion | motion | front | no | drive `cannon` |
| `minute-wheel` | Minute wheel | motion | front | no | drive `minuteWheel` |
| `hour-wheel` | Hour wheel | motion | front | no | drive `hourWheel` |
| `date-driving-wheel` | Date driving wheel (24 h) | date | front | no | drive `dateDriver` |
| `date-jumper` | Date jumper | date | front | no | — |
| `calendar-plate` | Calendar plate (date-ring guard) | date | front | no | xray |
| `pr-differential` | Power-reserve differential | power | back | partly | update (`prA`, `prB`, `prC`) |
| `pr-output-pinion` | Power-reserve output pinion | power | front | no | update `prB` |
| `pr-intermediate-wheel` | Power-reserve intermediate wheel | power | front | no | update `prIntermediate` |
| `pr-display-wheel` | Power-reserve display wheel | power | front | no | update `prDisplay` |
| `glide-wheel` | Glide wheel | regulating | back | partly | drive `glide` |
| `coil` | Generator coils (×2) | regulating | back | partly | — |
| `tri-synchro-regulator` | Tri-synchro Regulator circuit | regulating | back | no | — |
| `ic` | Integrated circuit (C-MOS IC) | regulating | back | no | — |
| `quartz-oscillator` | Quartz crystal oscillator | regulating | back | no | — |
| `stop-lever` | Hacking lever | regulating | back | no | — (released position) |

**Gear train (movement.md §7).** All wheels are gilt with fine circular grain (`M.wheelGilt`).
Teeth, modules and positions are in SPEC; levels are in SPEC.z; tip radii are in `SPEC.radii`.

| Wheel | Teeth / pinion | Look | Turns |
|---|---|---|---|
| Barrel | 146 | big steel drum, R 7.19 — its rim runs to r 14.93 at 6 o'clock | 1 / 10.43 h |
| Centre | 84 / 14 | 5 round lightening holes; long pinion; nearest the plate; hollow arbor | 1 / h |
| 3rd | 80 / 14 | 4 round holes; above the barrel, its pinion down at the centre-wheel level | 1 / 10 min |
| 4th | 80 / 8 | 5 holes; at the back, on top of the 3rd and the barrel | 1 / min |
| 5th | 75 / 10 | 3 curved spokes; its pinion at the top meshes the 4th | 7.5 s |
| 6th | 64 / 10 | 3 curved spokes, above the 5th; gold Diashock on top | 1 rev/s |

- Look at `mov_naked_32.jpg`, the `n32_wheels` / `n32_glide` crops, `mov_naked_35.jpg` (loose
  wheels) and `mov_naked_43.jpg`.
- The 4th wheel's long arbor runs through the hollow centre arbor and the cannon pinion to the
  seconds hand (`SPEC.z.secondsArborTop`; radii in `SPEC.hands.centreStack`).
- Give each wheel arbors, collets and pivots like the 139's `trainWheel()`.

**Barrel group.**
- Drum: outer 6.95, inner 6.70, teeth band at the dial-side end, z −1.42…−2.88; lid at the back.
- Mainspring: Spron 510, 1.25 high, about 15 coils let down and 24 wound, rebuilt from
  `state.reserve` like the 139's.
- Arbor: core R 2.2, square for the ratchet (B4's ratchet sits on it at −3.64…−3.80).

**Motion works (dial side).**
- Cannon 14 ↔ minute wheel 42 (module A); minute pinion 10 ↔ hour wheel 40 (module B); hour
  wheel 40 ↔ date driver 80 (module B) at d = 6.00.
- Level 1: cannon leaves and minute wheel. Level 2: minute pinion, hour wheel and date driver.
- The minute wheel rides on a fixed stud.

**Date works.**
- The date driver's finger rises to the ring level (`SPEC.date.driver.finger`). At local midnight
  (`rot.dateDriver` = 0) it points at local angle −36°, 6° past the radial line. Reach 2.55.
- The jumper (pivot (2.6, 7.2) → beak (7.37, 2.98)) is a spring lever at the ring level inside the
  ring. Its beak sits in a tooth gap.
- The calendar plate is a disc R 8.3, z +0.52…+0.72, with a centre hole R 0.95, a hole for the PR
  display arbor and three screws (`SPEC.date.calendarPlate`).

**Power-reserve works** (`SPEC.powerReserve`; the gearing is an ESTIMATE, see decision D9).
- Back side under B4's PR bridge, at `SPEC.z.prWheels`:
  - prA, an 8-leaf pinion;
  - prB, a 64-tooth FINE wheel. Its rim peeks out of the PR bridge's inner edge: that is the
    "fine-toothed rim in the gap" seen through the case back;
  - prC, a 13-leaf pinion.
- prB's arbor goes through the plate to the dial-side output pinion (12, level 2), then the
  intermediate (36/10, wheel at level 2, pinion at level 1), then the display wheel (40, level 1)
  whose arbor carries the PR hand.
- All are animated from `state.reserve` through `SPEC.rotations`. prB turns 12× the hand,
  3.2 turns over the full 72 h, so winding visibly moves them.
- Descriptions must say the differential compares winding (barrel arbor) with running (barrel
  drum).

**Glide wheel** (`SPEC.regulator.glide`; images `mov_naked_36.jpg`, `n32_glide` crop,
`mov_gs_sd_img01.png`).
- Gilt flat ring R 3.0 (rim 0.33) with three straight thin spokes and fine circular grain.
- A small dark-grey 2-pole magnet R 0.5 sits in the stator hooks, with the 8-leaf pinion between
  the magnet and the disc.
- Lower pivot: in a gold-coloured setting in the main plate. Upper pivot: in B4's gold Diashock.
- Through the case back you see the Diashock and a sector of the gilt disc in the automatic
  bridge's notch. The close-up shot frames it.
- **Speed: exactly 8 rev/s, 48° per frame at 60 fps.**
  - At 30 fps (the Lively power-save option) the 3-spoke disc would strobe backwards (96° per
    frame against 120° spoke symmetry).
  - Add a velocity-dependent rotational motion blur: crossfade the crisp spokes to a blurred disc
    (a soft annular smear with ghosted spokes) as `|Δθ per frame| = 2π·8·state.scale·state.dt`
    grows past about 25°.
  - In slow motion (`#…slow`, timeScale 0.05) the crisp spokes must show.
  - This matters: the glide wheel is the poster child of Spring Drive.

**Coils** (`SPEC.regulator.coils`; `mov_naked_40.jpg`, `mov_naked_32.jpg`, `mov_naked_37.jpg`).
- Two copper coils (#B8643A, highlights #E39A6A) of very fine wire (anisotropic copper, faint
  winding lines), radius 0.95, along the given axes.
- Dark-grey satin amorphous cores stick out at both ends:
  - at the glide end a pole piece with a semicircular hook embracing the magnet (inner R 0.62,
    outer 1.25; the two hooks face each other, forming the stator);
  - at the far end a tab with a screw.
- Amber flex leads.
- A sliver of copper shows at 12:00–12:30 through the case back.

**Electronics.**
- PCB: dark-brown flex with gold traces and a grey stiffener (`SPEC.frame.pcb.outline`).
- IC: silver bare die about 1.9 square on a gold-trace frame 2.8 square, rotated −41°.
- Three grey SMD capacitors.
- Quartz: a polished silver cylinder R 0.6 with two pins at its (7.6, 10.3) end. It lies in the
  plate edge.

**Stop lever:** a thin steel lever at the disc level, finger 0.1 clear of the disc rim (it
touches it at the 2nd crown click; the model stays at position 0).

### B4: `frame.js` (SPEC.frame, SPEC.finish, SPEC.z) and `automatic.js` (SPEC.automatic, SPEC.rotor, SPEC.keyless, SPEC.keylessLevers, SPEC.rotations)

| id | name | cat | side | exp | motion |
|---|---|---|---|---|---|
| `main-plate` | Main plate | frame | both | yes | xray |
| `train-bridge` | Train bridge | frame | back | partly | xray |
| `barrel-bridge` | Barrel bridge | frame | back | partly | xray |
| `pr-bridge` | Power-reserve bridge | frame | back | yes | xray |
| `automatic-bridge` | Automatic (winding) bridge | frame | back | yes | xray |
| `jewels` | Jewels (30) | jewels | back | yes | rides with the automatic bridge |
| `diashock` | Diashock shock settings | jewels | back | yes | — |
| `plate-screws` | Bridge screws | screws | back | yes | — |
| `case-clamps` | Casing clamps | case | back | no | — |
| `rotor` | Oscillating weight (rotor) | automatic | back | yes | drive `rotor` |
| `rotor-bearing` | Rotor ball bearing | automatic | back | partly | inner race drive `rotor` |
| `magic-lever` | Magic Lever | automatic | back | no | update from `rot.rotor` (see below) |
| `pawl-wheel` | Transmission (pawl) wheel | automatic | back | no | update `pawlWheel` |
| `ratchet-wheel` | Ratchet wheel | keyless | back | yes | drive `ratchet` |
| `ratchet-screw` | Ratchet screw | keyless | back | yes | drive `ratchet` |
| `click` | Click | keyless | back | yes | lift from `state.clickLift` (as the 139) |
| `click-spring` | Click spring | keyless | back | yes | — |
| `keyless-intermediate` | Keyless intermediate wheel | keyless | back | partly | update `keylessIntermediate` |
| `crown-transmission-wheel` | Crown transmission wheel | keyless | back | partly | update `crownTransmission` |
| `crown-wheel` | Crown wheel | keyless | back | no | drive `crownWheel` |
| `winding-stem` | Winding stem | keyless | both | no | rotation.x = `rot.stem` |
| `winding-pinion` | Winding pinion | keyless | back | no | rotation.x = `rot.stem` |
| `sliding-pinion` | Sliding pinion | keyless | front | no | rotation.x = `rot.stem` |
| `setting-wheel` | Setting wheel | keyless | front | no | drive `settingWheel` |
| `setting-intermediate-wheel` | Setting intermediate wheel | keyless | front | no | drive `settingIntermediate` |
| `setting-lever` | Setting lever | keyless | front | no | — |
| `yoke` | Yoke | keyless | front | no | — |
| `keyless-springs` | Keyless springs | keyless | front | no | — |

**What the case back shows** (movement.md §3; this is what the user looks at most). Aperture
r 12.9. Most of the time:
- the rotor with the dark-navy blackletter "GS / Grand Seiko";
- under it the big striped automatic bridge;
- the glide notch at 12–1 (dial frame 355°–29°) showing the glide wheel's gold Diashock and a
  sector of its gilt disc, the train bridge's stripes, and a copper coil sliver;
- the big window showing the 6th wheel's gold Diashock;
- the PR cut-out (dial 7:35–8:55) with the small PR bridge, three pink jewels, one screw and the
  fine-toothed rim of B3's prB;
- the ratchet cut-out (dial 4:50–7:35) with the sunburst ratchet, its big slotted screw and the
  click on the striped barrel bridge;
- the keyless window showing the teeth of the crown transmission and keyless intermediate wheels;
- jewels in the automatic bridge: dark purple at the pawl wheel, pink at the keyless intermediate;
- three polished slotted screws on the bridge's rim band.

**No blued screws anywhere.** Every screw is polished steel, slotted. Study:
- `mov_naked_25.jpg` (master, rotor removed) and `mov_naked_27.jpg` (automatic bridge removed);
- `mov_naked_28.jpg` / `mov_naked_29.jpg` (the bridge alone, top and underside with the Magic
  Lever);
- `mov_naked_26.jpg` (rotor alone);
- `ltF_6.jpg` (in the case, square-on);
- the official `mov_07_SBGA211_9R65.jpg` and `off_9r65.jpg` (colours and text only).

**Wave stripes** (`SPEC.finish.stripes`; 波目模様, said to evoke the Shinshu mountains).
- Broad crowned bands, pitch 2.2 at 34° in the dial frame (they descend to the right seen from the
  back).
- Each band has a fine CIRCULAR grain, because it was cut by a rotating diamond tool. This is not
  the Glashütte ribbing of the 139. Make your own texture: a band profile plus a curved-arc
  anisotropy within each band.
- One continuous planar UV across all bridges so the bands run on.
- The rotor carries the same stripes at pitch 2.0 / 25° in its own frame, so they rotate with it.
- Polished bevels on all bridge edges and cut-outs.
- Rim band of the automatic bridge (r 11.4–13.6, thinner): concentric graining.
- Bridge colour #CDD0D2, shading toward #8E9295.

**Engravings** (`SPEC.frame.engravings`).
- Gilt (#C9A055): "THIRTY JEWELS" on the rim band; "9R65A" and "JAPAN" on the r 9.9 arc.
- Plain (unfilled, slightly darker): "SEIKO" ○ "TIME CORP." "2" on the rim band. The ○ is the pin
  hole.
- All read COUNTER-CLOCKWISE in the BACK view with letter tops toward the centre. They sit on the
  −Z face, so check they read correctly from `#back` (mirror the decal UVs).

**Bridges.**
- Polygons are in SPEC, with LEAD edits commented there.
- The train, barrel and PR bridges sit at −3.20…−3.62 and abut along shared edges; never overlap
  them.
- Pillars: two from the plate and one standing on the train bridge, under the three
  automatic-bridge screws.
- The automatic bridge's bearing boss: R 3.0 up to −4.50.
- Diashock settings are gold lyre-spring settings (#C8A15A) with a pink jewel, Ø1.6 at the glide
  and Ø1.3 at the 6th, on the train bridge.
- Main plate: flat back at −1.20, dial-seat rim r 14.2–15 up to +0.75, level-1 pockets (floor
  −0.26), a stem channel, a winding-pinion slot and holes for the dial feet. Its exposed edge has
  fine straight graining.

**Rotor** (`SPEC.rotor`, already mirrored to the dial frame).
- A half disc R 14.0 with a gabled top edge, two symmetric windows, a small diamond pivot hole
  and three rivets.
- Heavy rim r 12.8–14.0, z −4.27…−5.05, polished outer edge. Plate −4.72…−5.02. Hub boss R 1.4
  with 3 screws.
- Heavy sector toward local −Y; at rot 0 it hangs at 6.
- The logo is dark navy #1E2A55, mirrored in the dial frame so it reads upright from the back when
  the weight hangs at 6. Use real blackletter glyph shapes, not a generic font: compare
  `mov_naked_26.jpg`.

**Magic Lever** (movement.md §8.3; `SPEC.automatic.eccentric` and `.lever`; image
`mov_naked_29.jpg`).
- The eccentric (throw 0.5, R 0.75) is fixed to the rotor shaft and turns with `rot.rotor`.
- The lever's ring rides on it, with its centre at E(θ) = 0.5·(cos θ, sin θ).
- The fork end slides along u = unit(pawlWheel). Its position is F = F0 + (E·u)·u, and the lever
  angle is atan2(F − E).
- The pull and push spring pawls sit at ±90° on the pawl wheel's flanks. Draw them clicking over
  the teeth (a small tip lift every tooth pitch of relative motion).
- The pawl wheel (110 fine ratchet teeth, R 3.2) turns −(74/10)·ratchet, which the kinematics
  advance by 4.94° per rotor turn, either way.
- Dark (blackened) steel, like the photo.

**Winding train.**
- Ratchet: 74 teeth, sunburst, big slotted screw.
- Keyless intermediate: 38 teeth, jewelled.
- Crown transmission: upper wheel 24 meshing the keyless intermediate at the ratchet level, lower
  wheel 24 meshing the crown wheel near the plate, on one long arbor from the plate to the
  automatic bridge.
- Crown wheel: 30 teeth on the stem line at (8.3, 0), behind the stem, turning on a core that hangs
  from the train bridge.
- Winding pinion: 14 radial teeth; its back-facing (−Z) side meshes the crown wheel's +X edge. Plus 9 Breguet
  teeth inside.
- Sliding pinion on the stem's square.
- Directions while winding (dial view): crown wheel CW, transmission CCW, intermediate CW, ratchet
  CCW. `SPEC.rotations` encodes all of this.

**Dial-side keyless** (`SPEC.keylessLevers`).
- The setting wheel (19) sits on the stem line at x 7.70. The setting intermediate (30) links it to
  B3's minute wheel (this cross-module mesh is computed from SPEC).
- The setting lever, yoke and two springs lie at z 0…+0.14, just above the stem pinions, and keep
  out of the winding pinion's footprint.
  - The setting-lever pin drops into the stem groove at x 11.05.
  - The yoke's fork fingers drop into the sliding pinion's groove.
- Stem: inner end x 8.35, square 8.55–9.75, groove 10.9–11.2, R 0.45, threaded into the crown to
  x 22.0. Axis z −0.90.

**Casing clamps:** four screws at r 14.35 on the plate's back face (heads Ø1.2) with short tongues
to r 14.9, at z −1.34…−1.20.

---

## 4. Interfaces between builders (the seams)

| Seam | Who builds what | Shared data |
|---|---|---|
| Dial ↔ movement | B2: dial (+0.75…+1.20), feet into the plate rim. B4: dial-seat rim (r 14.2–15 to +0.75) and the feet holes. B1: casing ring (also carries the dial's rim) | `SPEC.z.dial`, `SPEC.dial.feet`, `SPEC.case.casingRing` |
| Date | B2: date ring (numerals, 31 internal teeth, `drive: date, sign −1`). B3: date driver + finger, jumper, calendar plate | `SPEC.date.*`; the jumper beak sits in a ring tooth gap |
| Power reserve | B2: fan scale on the dial + PR hand (`rotations.prDisplay`). B3: differential + output pinion + intermediate + display wheel (arbor top `z.prDisplayArborTop` +1.20 carries the hand). B4: PR bridge (3 pink jewels, screw) over B3's differential | `SPEC.powerReserve`, `SPEC.layout.prDisplay` = hand pivot |
| Centre stack | B3: hollow centre arbor (to +0.90), cannon pipe (to +2.07), hour pipe (to +1.72), 4th arbor (to +2.52). B2: collets on them | `SPEC.hands.centreStack`, `SPEC.z.*Top`, `SPEC.z.*Collet` |
| Crown ↔ stem | B1: crown (+X 24 explode) and tube in the case. B4: stem (+X 23; its outer end stays 1.2 inside the crown) | `SPEC.case.crown`, `SPEC.keylessLevers.stem`, `SPEC.z.stemAxis` |
| Setting train ↔ motion works | B3: minute wheel (phase A from the cannon mesh). B4: setting intermediate and setting wheel (phases from the same SPEC.meshes lines) | `SPEC.meshes` |
| Ratchet ↔ barrel arbor | B3: barrel arbor with the square (drive `ratchet`). B4: ratchet + screw on it | `SPEC.z.ratchet`, `SPEC.layout.barrel` |
| Glide wheel ↔ frame | B3: glide wheel (pivots). B4: gold Diashock settings on the train bridge (glide, 6th), gold lower setting in the plate | `SPEC.frame.jewels` |
| Coils / IC ↔ frame | B3: coils (screwed to the plate), PCB, IC, quartz. B4: plate with the PCB under it; nothing raised where they sit | `SPEC.frame.pcb`, `SPEC.regulator` |
| Pillars | B4: plate pillars + the train-bridge pillar under the automatic-bridge screws. Others: keep clear (the PCB already has a notch) | `SPEC.frame.pillars` |
| Rotor ↔ case back | B4: rotor (top −5.05). B1: case-back inner face −5.85, glass −6.10 | `SPEC.z.rotorTop`, `SPEC.case.caseback` |

---

## 5. The look: what makes it right (checklist for review)

1. The dial reads as **snow**: white, silvery and textured with vertical drifts, not a grey noise.
   In flat light it is nearly white; at a raking angle the relief jumps out.
2. **Zaratsu:** the case, bezel and markers show perfectly flat, distortion-free mirror planes with
   razor-sharp borders against the hairline lug tops. The hands have the half-bright /
   half-dark dauphine split.
3. The **blued seconds hand glides**: perfectly smooth, 6°/s, no ticks, ever.
4. The **power-reserve** hand sits at FULL toward 9 when wound and creeps to 12 as it runs down;
   winding by crown or rotor swings it back.
5. Through the back: rotor with the navy "GS Grand Seiko", wave stripes everywhere with fine
   circular grain, gilt texts, two gold Diashocks, the gilt glide disc sector whirring at
   8 rev/s with no stroboscopic artefacts, pink jewels, a sunburst ratchet, polished
   (never blued) screws.
6. Rotor swings (cinematic winding moment, `show.winding` automatic): the Magic Lever rocks, its
   pawls click, the pawl wheel and ratchet creep forward whichever way the rotor turns.
7. The date flips at local midnight (1.2 s jump); today's numeral is centred and upright in the
   window.
8. Exploded: nothing passes through anything; the case slides off behind the movement; the
   stack reads in assembly order.

---

## 6. Decisions taken by the lead (and why)

| # | Decision | Reason |
|---|---|---|
| D1 | `timing: { type: 'springdrive', glideHz: 8, glideDir: +1 }`. Every train arbor in `arbors` with exact periods derived from the tooth counts | Official 8 rev/s and 28,800 per hour. The glide wheel turns CW seen through the back = +1 (CCW from the dial) by the mesh chain. Derived periods make every mesh exact |
| D2 | Tooth counts 146 · 84/14 · 80/14 · 80/8 · 75/10 · 64/10 · glide 8 | Match every image count (146, 84, 14, 80, 75) and give the official rates exactly |
| D3 | 3rd wheel moved 0.40 mm round the centre (same centre distance) | With the measured point its pinion would overlap the barrel teeth by 0.34 mm and the train could not be assembled (3rd above the barrel per n32, its pinion below it). Hidden part |
| D4 | Z stack rebuilt (not the research's): centre wheel nearest the plate, barrel above it, 3rd and 4th wheels above the barrel, 5th under 6th, glide disc on top | Photos n32/n43 show the 4th on top of the 3rd and the barrel, the 6th over the 5th, the centre wheel staying on the plate when the barrel is out; the 4th pinion cannot sit inside the centre tube |
| D5 | Glide magnet R 0.5 (n36), not Ø2.6; stator = the two coils' hooked pole pieces (n40) | Direct photo measurement |
| D6 | Keyless: winding pinion → crown wheel (on the stem line) → crown transmission (tall) → keyless intermediate (MEAS) → ratchet; winding pinion 14 | A crossed-axis mesh needs the crown wheel on the stem line; the stem (z −0.90) is 2.7 mm below the ratchet level, so a tall transmission wheel carries the motion up. Two intermediates keep the classic crown-wheel direction. 14/74 per crown turn gives 9.9 h for 5 turns (official ≈ 10 h). Hidden except the window teeth |
| D7 | Crown and stem axis z −0.90 (exterior side photo), not −0.60 | Measured |
| D8 | PR display: FULL 263° (toward 9), EMPTY 12; hand rotation.z = +97°·reserve; pivot (−3.17, −5.80); date numeral radius 12.0 | exterior.md §9 (W&W hands-on + official render + correct scale) |
| D9 | PR gearing animated from `state.reserve`: prB turns 12× the hand, through a dial-side output pinion, intermediate and display wheel | Only the 3 jewels and the dial pivot are measured; this is a consistent, visibly moving train |
| D10 | Date change: instantaneous jump at midnight (kinematics default); ring CCW (sign −1) | Manual: "changes … around midnight"; jumper type. Numerals increase clockwise (n23) |
| D11 | Rotor: naturalPeriod 0.9 s, damping 0.12; Magic Lever 4e per rotor turn → ratchet 4.94° per turn, about 500 turns empty → full | Physics with a slightly slowed swing for the screen; matches movement.md's ≈ 510 turns |
| D12 | No raised plate rim on the back; casing clamps on the plate's back face at r 14.35 | The barrel teeth reach r 14.93 at 6 o'clock, so a rim would cut them; everything beyond r 12.9 is hidden by the case back's bevel anyway |
| D13 | PCB outline, coil radius 0.95 (axis −2.20), pillars, keyless lever key points, calendar plate, jumper: ESTIMATES drawn to clear every arbor | check.mjs proves clearances |
| D14 | Explode: case middle + bezel slide off backwards (beyond the rotor, before the case back), crystal forward, rehaut with the dial; crown +24 X, stem +23 X | In the UI's oblique exploded view (az 64°, el 16°) any opaque case ring in front of the hands hides them (measured by check.mjs); now nothing is hidden except 11% of the barrel cover behind the pulled-out crown |
| D15 | Keyless works moved from train.js to automatic.js; train.js keeps date works and PR works; springdrive.js goes to the same builder as train.js | Keeps each interlocking chain within one builder |

---

## 7. Open risks

1. **The snowflake dial** is make-or-break and purely procedural. Budget time for side-by-side
   comparisons at matched scale and lighting.
2. **Glide-wheel strobing** at 30 fps (Lively power-save) unless the motion blur in §3 B3 is
   built.
3. **Hidden-mechanism estimates.** Tooth counts (except 146 / 84 / 14 / 80 / 75 / 74), the keyless
   chain, the PR gearing, the PCB outline, the dial-side layout and the whole z stack are
   ESTIMATES (self-consistent and collision-checked, not measured).
   - If better data turn up, change SPEC and re-run check.mjs. Never patch geometry locally.
   - Visible positions (jewels, Diashocks, bridges, texts) are measured to ±0.2–0.5 mm.
4. **Blackletter "GS" / "Grand Seiko".**
   - The rotor text, dial wordmark, crown end and clasp need the real Grand Seiko blackletter
     forms; a generic font will look wrong.
   - The fonts available in the bundle are Jost and JetBrains Mono only.
   - Draw the glyphs as paths (trace them from `mov_naked_26.jpg` / `ltF_12.jpg`) and share them,
     ideally as a small helper in your own module. Coordinate: B1 (crown, clasp), B2 (dial),
     B4 (rotor).
5. **Mirrored text on −Z faces** (bridge engravings, rotor logo, case-back texts) is easy to get
   backwards. Check from `#back`.
6. **Triangle budget.** Bracelet links, engraved text and the fine pawl-wheel teeth add up. Merge
   meshes and keep the whole watch under about 1.5 M triangles.
