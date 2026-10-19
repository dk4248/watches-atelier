# Tangente neomatik 38 Update ref. 147 (DUW 6101): build plan

Watch id `tangente-update-147`. Lead: spec + plan. Four builders then build eight part
modules in parallel to the Tangente 139's standard. The user loves the 139 for its
accuracy. Match that bar: real proportions from SPEC, smooth silhouettes, bevels where the
real part is bevelled, honest descriptions, and no shortcuts on the visible faces.

- **Single source of truth:** `src/watches/tangente-update-147/spec.js`. Never hard-code a
  number that lives there. If you need a value it does not have, put it in a module-local
  constant with a comment, or ask the lead/coordinator to add it.
- **Validator:** `node research/tangente-update-147/check.mjs` (about 60 s; `--quick` skips
  the explode sweep). It checks meshes, kinematics, the z stack (plan overlap ⇒ disjoint z)
  and the whole explode animation. It must still say `PASSED` after any spec change. The
  two expected warnings are listed in §8.
- **Descriptor:** `src/watches/tangente-update-147/index.js` (done). The integrator registers it in
  `src/watches/index.js`.
- **Solo build:** `node build.mjs --solo tangente-update-147[:case,dial,…]` →
  `dist/solo-tangente-update-147*.html` (http://localhost:5173/…). Hash views `#front #back
  #side #iso #isoBack #top`, combined with dots (`#back.explode.xray`, `.slow`),
  `#focus-<id>.back`; console `window.__solo` (`view`, `explode`, `focus`, `xray`, `parts`).
  Lite: `?lite`.

---------------------------------------------------------------------------------------------

## 0. Key decisions (the lead's, with reasons)

| Decision | Value | Why |
|---|---|---|
| Power reserve | **50 h**, `barrelTurns` 50/7 = 7.14 | NOMOS's own ref. 147 page and the DUW 6101 "34/42" caliber pages (EN "up to 50 h", DE "ca. 50 Stunden") are about this exact variant. The 42 h in reviews and on other DUW 6101 pages belongs to the Ø 35.2 versions. |
| Frequency | 21,600 A/h, amplitude 285°, lift 50°, fork ±6.75° | NOMOS quoted by Caliber Corner ("six times per second"), Monochrome and Fratello. The 4 Hz and 28,800 claims are errors. Same lift and fork angles as the 139 (DUW 4001). |
| Date change | `dateChange: { type: 'drag', durationSec: 1800 }` | NOMOS says the Update ring takes ≈ 30 min. The ring creeps from 23:45 to 00:15. |
| ZB0 | 4.45 | Movement-report reconciliation. It puts the stem axis at z −1.09, matching the measured crown axis (zb 3.36). |
| Going train | 126 / 120:18 / 112:16 / 120:14 / 15:10; motion 12/40:10/36 | ETA 7001-derived set, as on the 139 (rates exact). NOMOS's own train photo shows gilt 5-spoke wheels with pinions of ~14–16 leaves. |
| Third wheel at (0.40, −3.98), not (0.42, −4.22) | circle fit | On both renders only the lower half of that jewel is visible (cut by the rotor bar / a dial-side bridge). The research took the blob centroid, about 0.2 mm too low. At −4.22 the fourth wheel's tip circle (r 3.03) would run through the third arbor. |
| Hand-winding chain | winding pinion 17 → crown wheel 42 → idler 1 (20) → idler 2 upper (16) ‖ idler 2 lower **gilt 21** → **steel ratchet 63** under the 3/4 plate | Zooming into the render's winding window shows a gilt wheel under idler 2 meshing steel ratchet teeth (lead crop `idlers_zoom.png`). The research's direct 16 → 62 mesh was impossible across the plate. The engine sees an **equivalent ratchet of 48** (`SPEC.keyless`): same crown-wheel ratio 48/42. |
| Winding pinion 17 teeth (Ø 2.72) | measured Ø ≈ 2.7 | With the stem at z −1.09, its lowest teeth reach the crown wheel's level (−2.43…−2.27) through the plate slot, as on the 139. |
| Automatic train | rotor wheel 60 → reverser 20 (+ star 16, pinion 8) → A 26\|16 → B 48\|18 → C 34\|8 → D 24\|10 → **T 22** → ratchet 63 | Uses every measured pivot (R, A, B, C, D). T sits on the measured plain pivot hole at back (2.10, 9.15): solved from both meshes, it lands 0.06 mm away. One-way pinion = 3 × rotor; ratchet = rotor/116. |
| Rotor physics | naturalPeriod 1.1 s, damping 0.18 | Engine default (reads better on screen). The physical estimate is 0.29 s. |
| Explode | dial side to +62, movement side to −61, crown to +25 x | Removal order with explicit delays for the stem assembly and the case body / dial / date ring (§7). Validated by sweeping the real registry easing. |
| Theme | light: bg `#f6f5f2 → #dcdad5`, accent `#c80e16` (marker red); dark: `#121314 → #25272a`, accent `#ff5a60` | Based on the white silver-plated dial, black hands and the red date markers. |

---------------------------------------------------------------------------------------------

## 1. Module split, owners and suggested agent grouping

| File | Builder (suggested) | Registers (part ids) |
|---|---|---|
| `parts/case.js` | **A** | `case-body` `bezel` `crystal` `casing-ring` `case-clamps` `lugs` `spring-bars` `crown` `caseback-ring` `caseback-glass` `strap-top` `strap-bottom` `buckle` |
| `parts/hands.js` | **A** | `hour-hand` `minute-hand` `seconds-hand` |
| `parts/dial.js` | **B** | `dial` `small-seconds` `dial-feet` `date-ring` |
| `parts/date.js` | **B** | `date-wheels` `date-drive-wheel` `date-idlers` `date-jumper` `date-corrector` `date-bridge` `motion-bridge` `keyless-bridge` `dial-side-bridge` |
| `parts/train.js` | **C** | `barrel` `mainspring` `barrel-cover` `barrel-arbor` `center-wheel` `third-wheel` `fourth-wheel` `cannon-pinion` `minute-wheel` `hour-wheel` `winding-stem` `winding-pinion` `sliding-pinion` `setting-wheel` `setting-idler` `setting-lever` `yoke` `keyless-springs` `stop-seconds-lever` `crown-wheel` `crown-wheel-cover` `winding-idlers` `transmission-wheel` `ratchet-wheel` `click` `click-spring` |
| `parts/automatic.js` | **C** | `rotor` `rotor-bearing` `reversing-wheels` `winding-train` |
| `parts/escapement.js` | **D** | `escape-wheel` `pallet-fork` `balance-wheel` `roller` `hairspring` `balance-bridge` `regulator` `shock-absorber` `shock-absorber-lower` |
| `parts/frame.js` | **D** | `main-plate` `three-quarter-plate` `pallet-bridge` `plate-screws` `plate-engravings` `jewels` |
| `parts/finish.js` | **D owns**, others import | shared ribbing / perlage / blued / ruby materials, `ribbingUV()`, `manualStemAngle()` (implemented) |

Why a separate `date.js`: the date works plus four steel dial-side bridges are a distinct,
sizable mechanism under the dial. Splitting them from `train.js` balances the load. The
date ring itself is in `dial.js` because it must exist in lite mode, where its red markers
show through the slots. Builder B owns both sides of the ring/works seam.

Every id has an entry in `SPEC.explode`, checked by the validator. Builders must not
register ids outside their list without telling the lead; ids must stay unique.

---------------------------------------------------------------------------------------------

## 2. Shared conventions for all builders

- Frame: mm; +Z out of the dial; 12 o'clock = +Y; crown = +X; z = 0 is the pillar plate's
  dial face. Back-view measurements convert with x_dial = −x_back (`B()` in spec.js).
  Everything on the movement side reads correctly **from the back** (engravings, rotor letters).
- Animated part: `object` at the arbor, child `rotor`, arbor on the rotor's local Z.
  `drive: { key }` for engine keys. For anything else, set `rotor.rotation.z` in `update(state)`
  with no allocations.
- **Engine keys available** (`state.rot.*`): `hourHand minuteHand secondHand hand24
  barrel center third fourth escape cannon minuteWheel hourWheel balance fork ratchet
  crownWheel stem rotor date dateDrive dateIdler1 dateIdler2 dateSwitch settingWheel
  settingIdler`. Also `state.datePos` (0..31, 0 = "1"; drag), `state.day`, `state.reserve`,
  `state.windAngle` (= rot.ratchet), `state.rotorVel`, `state.clickLift` (uses the
  equivalent 48 teeth, so do not use it for the 63-tooth ratchet).
- **Hidden-wheel angles** are exact multiples of `state.rot.ratchet` or `state.rot.rotor`:
  `SPEC.windingTrain.ratios` and `SPEC.autoTrain.ratios` (signed, CCW+ from the dial):

  | wheel | angle | | wheel | angle |
  |---|---|---|---|---|
  | idler 2 (both wheels) | −3 × rot.ratchet | | T | −2.8636 × rot.ratchet |
  | idler 1 | +2.4 × rot.ratchet | | D | +6.3 × rot.ratchet |
  | crown wheel | = rot.crownWheel (−48/42 × ratchet) | | C | −18.9 × rot.ratchet |
  | winding pinion (about +X) | = rot.stem | | B | +35.7 × rot.ratchet |
  | crown, stem, sliding pinion | `manualStemAngle(state, SPEC)` | | A | −107.1 × rot.ratchet |
  | reverser gilt wheel | −3 × rot.rotor | | reverser star + pinion | +348.075 × rot.ratchet |
  | rotor wheel | with the rotor (`drive: rotor`) | | ratchet, barrel arbor | `drive: ratchet` |

  The crown must not turn when the rotor winds. The engine's `rot.stem` also follows rotor
  winding, so the crown, stem and sliding pinion use `manualStemAngle()` from
  `parts/finish.js`. It integrates only the manual part of `windAngle`, once per frame, and
  every caller in a frame gets the same value.
- **Mesh-phase chain**: `gear.meshPhase(phi, zA, zB, phaseA)`, phi = angle from A's centre
  to B's. Modules that share a mesh must compute it identically:
  - going train: wheels phase 0; centre pinion `meshPhase(ang(barrel,center),126,18,0)`;
    third pinion `(ang(center,third),120,16,0)`; fourth pinion `(ang(third,fourth),112,14,0)`;
    escape pinion `(ang(fourth,escape),120,10,0)` (escapement module).
  - motion: cannon 0; minute wheel `phMW = (ang(center,minuteWheel),12,40,0)`; minute
    pinion 0; hour wheel `phHW = (ang(minuteWheel,center),10,36,0)`; setting wheel
    `(ang(minuteWheel,settingWheel),40,20,phMW)`; setting idler `(ang(settingWheel,settingIdler),20,20,phSW)`.
  - date (date.js): star `(ang(center,dateDrive),36,18,phHW)`; gilt drive wheel 0; idler 1
    `(ang(dateDrive,dateIdler1),24,14,0)`; idler 2 `(ang(dateIdler1,dateIdler2),14,16,phI1)`;
    idler-2 pinion 0; carrier `(ang(dateIdler2,dateSwitch),8,48,0)`; program wheel 0.
  - winding: **ratchet phase 0**; idler 2 lower `(ang(barrel,windIdler2),63,21,0)`; idler 2
    upper 0; idler 1 `(ang(windIdler2,windIdler1),16,20,0)`; crown wheel
    `(ang(windIdler1,crownWheel),20,42,phI1)`; winding pinion: rack formula of the 139
    (`(zCW·phCW − π − zWP·π/2)/zWP`).
  - automatic: T `(ang(barrel,autoT),63,22,0)`; D pinion `(ang(autoT,autoD),22,10,phT)`; D
    wheel 0; C pinion `(ang(autoD,autoC),24,8,0)`; B pinion `(ang(autoC,autoB),34,18,0)`; A
    pinion `(ang(autoB,autoA),48,16,0)`; reverser pinion `(ang(autoA,reverser),26,8,0)`; rotor
    wheel 0 (inside the rotor's group); reverser gilt `(ang(center,reverser),60,20,0)`.
- Tooth form: `gear.toothedOutline` (wheels, tip = m(z/2+1.3)) and `pinionOutline` (tip =
  m(z/2+0.9)). Modules are in `SPEC.modules`. A wheel that meshes two partners shares one
  module (validated).
- Wheel thickness: 0.12 on the going-train levels (L0/L1/L2), 0.10 for most others, 0.16 for
  the crown wheel and idlers. Always take the z range from SPEC.z.
- Materials: clone `M.*`, never mutate. Use one material per mesh (X-ray/highlight clone
  `mesh.material`). Plates/bridges/rotor take `ribbedMaterial(M)` + `ribbingUV(geo, SPEC[, 71.8])`
  from `finish.js`. Perlage uses `perlageMaterial(M, 'back' | 'dial')` + `planarUV(geo, SPEC.movement.perlage.uvScale*)`.
  Blued screws use `bluedScrewMaterial(M)` and jewels `rubyMaterial(M)`.
- Quality: ≥ 96 segments for discs, ≥ 32 for screws/jewels, merge static same-material
  geometry, whole watch < 1.5 M triangles, no per-frame allocations, castShadow false on glass.
- Glyphs: the Tangente numerals and the NOMOS logo use the same glyph family as the 139
  (`numeralOps` / `nomosOps` in `tangente-139/parts/dial.js`). Do not import or copy that
  module. Ask the integrator to hoist the glyph path builders into a shared `src/geom`
  helper, or re-derive them, studying the 139 for technique.
- Descriptions: plain English, 1–3 sentences, what the part does and why; facts from SPEC;
  mark estimated values as such in facts where it matters (e.g. "≈ 830 rotor turns").

### Reference images and coordinate mapping
`IMG` = `<scratchpad>/img/tangente-update-147/`
`LEAD` = same scratchpad, `lead147/` (lead's crops, overlays and tools); `OUT` = `out147/` (researchers' crops).

| image | view | px/mm | centre px | use |
|---|---|---|---|---|
| `IMG/front.jpg` | dial, ref. 147 | 23.50 | (918.5, 901.6) | dial print, slots, markers, hands, lugs (plan) |
| `IMG/back.jpg` | case back, ref. 147 (mirror x) | 23.49 | (918.67, 900.72) | case back, "TANGENTE 1", movement through the window |
| `IMG/detail5.jpg` | side from 3 o'clock (perspective, see exterior.md §2.4) | 28.21 at the axis | x 1278 | case profile, lugs, crown |
| `IMG/detail1.jpg`, `detail3.jpg` | dial macros | – | – | slot walls, red markers, gold "neomatik" glitter, hub, subdial snailing |
| `IMG/mov_duw6101_boden_bajonett42_2560.jpg` | movement back (mirror x) | 56.34 | (1277.5, 1238.2) | **everything on the back**; the rotor at rot.z = 71.8° |
| `IMG/mov_duw6101_front_2560.jpg` | movement dial side (Ø 35.2 ring with numerals; ours has none) | 55.70 | (1282.9, 1320.1) | dial-side works, bridges, keyless, lower jewels |
| `IMG/mov_0147_detail4_2560.jpg`, `OUT/d4_rect.png` | back photo, rotor turned (rectified) | – | – | parts under the rotor, "REGULIERT IN 6 LAGEN" |
| `IMG/mov_werk_duw6101_03_bajonett42_2560.jpg` | low side view | – | – | levels, rotor profile, bridge, date-ring disc |
| `IMG/mov_duw6101_3dfront_2560.jpg` | oblique back | – | – | rotor shape and thickness |
| `IMG/mov_modal_technik_6101_raederwerk_2560.jpg`, `OUT/rw_wheels.png` | going-train photo | – | – | gilt 5-spoke wheels, 4-arm steel escape wheel, gilt barrel with a raised lid boss |
| `IMG/mov_sjx_duw6101_date.jpg`, `mov_sjx_duw6101_program_disk.jpg`, `mov_duw6101_datumschaltrad_2560.jpg` | dial-side macros | – | – | keyless levers, corrector star, minute wheel, switching wheel + cam + hook click, date drive |
| `IMG/buckle_winged_square.jpg`, `strap_cordovan.jpg`, `hb_top.jpg` | strap & buckle | – | – | – |
| `LEAD/ov_back.png`, `LEAD/ov_front.png` | **spec overlays** on the two movement renders | – | – | check your part against the spec |

Tools (in `LEAD/`; run Python with `-I`, pass image paths as arguments):
- `python -I crop.py IMG OUT cx cy halfmm pxpermm x0 y0 [scale] [x,y,r,color …]`: a gridded mm crop in image-view
  coordinates (back renders: x is back-view).
- `node mkoverlay.mjs <spec.js> <outdir>` + `python -I overlay.py IMG OUT JSON [scale] [x,y,half]`: draws spec geometry
  (dial frame) on a render (mirrors x for back views).

---------------------------------------------------------------------------------------------

## 3. The vertical stack (z, mm): one table, all modules

| level | z | contents (owner) |
|---|---|---|
| crystal | 1.95 … 2.95 | flat sapphire, 0.12 proud of the bezel top 2.83 (case) |
| centre cap / minute hand / hour hand | 1.75 / 1.52–1.70 / 1.20–1.38 | hands |
| seconds hand | 0.80–0.92 | hands (over the subdial floor 0.65) |
| dial | 0.50 … 0.80 | dial; subdial floor 0.65; slots through |
| date bridge | 0.36 … 0.46 | date |
| date ring | 0.20 … 0.40 | dial (r 11.67–17.0) |
| click hook / jumper / corrector star | 0.25–0.33 / 0.22–0.34 / 0.20–0.34 | date (hook and jumper engage the ring's teeth; the star stays clear) |
| program wheel / cam / carrier | 0.12–0.22 / 0.12–0.25 / 0.00–0.10 | date |
| motion bridge | 0.18 … 0.30 | date |
| hour wheel & date-drive star | 0.04 … 0.14 | train / date (mesh) |
| keyless bridge / lower bridge | 0 … 0.14 / 0 … 0.16 | date |
| date-drive gilt wheel, date idlers | −0.12 … −0.02 (recess floor −0.20) | date |
| minute pinion / minute wheel / cannon leaves | −0.20…0.16 / −0.30…−0.20 / −0.30…−0.16 (recess −0.35) | train |
| keyless levers & springs | −0.33 … −0.19 (recess −0.35) | train |
| setting wheel + idler | −0.42 … −0.20 (pocket −0.56) | train |
| **pillar plate** | −0.95 … 0; raised ring r 13.63–15.54 up to −2.10 | frame |
| stem axis | −1.09 (stem r 0.45; channel in the plate back to −0.60) | train/case |
| L0 | −1.10 … −0.98 | centre wheel, escape wheel, pallet fork (−1.055), roller (−1.08); third pinion −1.12…−0.96 |
| L1 | −1.30 … −1.18 | fourth wheel; barrel teeth band; centre & escape pinions −1.32…−1.16 |
| L2 | −1.50 … −1.38 | third wheel; fourth pinion −1.52…−1.36 |
| pallet bridge | −1.45 … −1.18 | frame |
| barrel | −1.95 … −1.14 (lid −1.95…−1.90) | train |
| balance rim / hairspring | −1.94 … −1.50 / −2.06 … −1.98 | escapement |
| W2 / W1 / W0 | −1.80…−1.70 / −1.94…−1.84 / −2.08…−1.98 | automatic C wheel / B, D wheels / ratchet, idler-2 gilt, T, A wheel, D pinion, click |
| **3/4 plate** | −2.45 … −2.10 (pocket floor −2.25, reverser window floor −2.22) | frame |
| balance bridge | −2.45 … −2.10 (pads on pillar seats) | escapement |
| crown wheel, idlers | −2.43 … −2.27 (in the pocket) | train |
| reverser gilt / star / cover / pinion | −2.36…−2.26 / −2.44…−2.37 / −2.52…−2.44 / −2.24…−1.98 | automatic |
| rotor wheel teeth | −2.36 … −2.26 (in the plate groove r 3.20–3.82) | automatic |
| screw heads, regulator, cover, caps | −2.58 … −2.45 | frame / escapement / train |
| bearing disc (fixed) / screws / balls / bayonet | −2.75…−2.47 / to −2.80 / −2.62 / −2.72…−2.47 | automatic |
| rotor | collar −2.95…−2.62; bar −2.95…−2.65; rim under −2.65, flat −3.15, letters −3.20; skirt (r ≥ 13.90) under −2.30 | automatic |
| back glass | −4.25 … −3.35 | case (letters clear it by 0.15) |
| case back face | −4.45 | case |

Every pair of parts that overlap in plan has disjoint z unless they mesh (validated). If you
must change a level, change SPEC.z and re-run the validator.

---------------------------------------------------------------------------------------------

## 4. Module briefs

### 4.1 `case.js` (builder A)
Reads `SPEC.case`, `SPEC.z`, `SPEC.frame.casingScrew`, `SPEC.explode`/`explodeDelay`,
`finish.manualStemAngle`. References: `front.jpg`, `back.jpg`, `detail5.jpg`, `detail4.jpg`,
`detail1.jpg` (flange), `buckle_winged_square.jpg`, `strap_cordovan.jpg`, `OUT/side_overlay.png`.
- **Case profile:** lathe `SPEC.case.profile` (r, z), all **mirror-polished**. Hairline seams
  (tiny V-grooves) at z 1.46 (bezel/middle) and −3.00 (middle/back). Bezel flat top r
  18.10–19.08 at 2.83, rounded edge (r 0.17) down to the flank r 19.25. The middle case is
  a straight drum; the back steps in to r 19.18.
- **Crystal:** flat sapphire, top 2.95 with a 0.08 edge chamfer (18.02 → 18.10). Its seated
  flange (r 18.10–18.43, z 1.95–2.40, as validated) sits under the bezel lip (r 18.10–18.45,
  from z 2.42 up; seat radius `crystal.seatRadius` 18.45). AR coating on the INSIDE only, so
  the top face reflects like plain sapphire (stronger than the 139's AR crystal). Use the
  139's additive specular-only glass technique.
- **Under the crystal** (`SPEC.case.innerProfile`): a grey ground ledge r 17.75–18.10 at
  1.95, a satin flange #cfcfcf r 17.52–17.75 with its top at 1.80, and the flange wall down
  to the dial at r 17.52 (the visible dial edge). It is **light**, not the 139's dark flange.
- **Case back** (snap-on, no screws): vertical band, a small roll at (18.96, −3.60), a 34°
  chamfer to (17.65, −4.45), a flat polished face r 15.60–17.65, and a window lip chamfer to
  r 15.00 (clear Ø 30.0). Glass r 15.42 at z [−4.25, −3.35]; the ring bore above the glass
  is ≥ 15.42.
- **Case-back engraving:** "TANGENTE {caseSerial}" in grey #8a8a8a (unfilled). Light
  DIN-like caps with wide tracking, cap 0.92, centre r 16.65. Letter tops point to the
  centre, so it reads upright at 6 o'clock when you look at the back. It spans dial-frame
  clock 163.8°–195.3°, reading from the larger to the smaller back-view angle.
- **Lugs:** 1.23 mm plates at x ±[9.60, 10.83], profile in `case.lug.profile`: a horizontal
  arm 3.17 thick, parallel 38–39° slants, a vertical flat-cut tip 2.93 tall ending 0.17 below
  the back plane, and a 0.98 flat underside. Corner radii 0.3. Run the root into the
  flank, as the 139 does. Holes Ø 1.12 at (y 21.49, z −1.99), drilled through x.
- **Crown:** Ø 5.75, 22 faceted flutes (V grooves, depth 0.25). A darker bevelled serrated
  skirt runs from x 19.35 to 19.90 along the stem axis (0.1 gap to the case flank at
  19.25); the crown ends at x 21.72. The end face is Ø 4.9 and slightly domed
  with "NOMOS" (#4a4a4a, 4.6 wide, cap 0.54), axis z −1.09. **Turn it with
  `manualStemAngle(state, SPEC)`**, not `rot.stem`, so it stays still while the rotor winds.
- **Casing ring** (sandblasted): lip r 15.62–16.60 from −2.10 to 0.15, body r 16.60–17.93
  from −2.95, dial seat r 17.05–17.93 up to 0.50, stem slot ±0.6.
- **Casing screw** (`case-clamps`): plain slotted steel, head Ø 2.1 at (0.15, 14.53), z
  [−2.25, −2.10], with a clamp tab (half width 0.6) out to r 15.9 on the lip. It sits in a
  notch of the 3/4 plate (frame) and shows half under the back ring.
- **Strap:** Horween shell cordovan, black #121316, semi-gloss (roughness ≈ 0.4 + clear
  coat), no grain; **rembordé** (turned, rounded edges, no cut edge). Black stitching (inset
  1.5, pitch 1.3, full length). 19 → 17 mm, 2.5 → 2.0 thick. Tail ≈ 115 with 6 holes and a
  rounded tip; buckle side ≈ 75 with a fixed + floating keeper. Leaves the spring bar
  horizontally (exit z −3.92 … −1.42).
- **Buckle:** square winged pin buckle ("Flügelschließe eckig"), polished. Square frame with
  slightly flared corners and concave side bars; outer width 20.5, length 16.5; wide flat
  front bar 3.4 deep with "NOMOS" engraved along it; side bars 1.15; tongue Ø 1.2 with a
  bend; thickness 1.6.
- **Lite:** skip the straps, buckle, spring bars, casing ring, clamps, back glass and
  back-ring engraving. Keep the case body, bezel, lugs, crown, crystal and back ring. 96
  segments.
- Explode: SPEC (bezel +62 above the crystal +55, because the lip holds the crystal; case
  body delay 0.7 so the stem is out first; crown +25 x).

### 4.2 `hands.js` (builder A)
Reads `SPEC.hands`, `SPEC.z`, `SPEC.dial.subdial.center`. References: `detail1.jpg` (hub),
`front.jpg`, `detail3.jpg`.
- **Black OXIDISED steel**, satin: base #1c1c1e, metalness ≈ 0.7, roughness ≈ 0.35, edges
  catching a soft grey (#4c4c4c). **No blue, no lume.**
- Hour: tip r 10.00, width 0.28 constant, pointed over the last 0.42. Minute: tip 15.00,
  width 0.26, point over 0.45. Blades 0.10 thick.
- Collets: hour = a **flat** black disc Ø 2.15 (z 1.20–1.38) on the hour pipe (bore
  r 0.655; pipe r 0.65). Minute = a black disc Ø 1.50 (1.52–1.70) on the cannon (bore
  r 0.405; pipe r 0.40). Centre cap =
  polished domed steel Ø 0.82 to 1.75, which reads almost white.
- Seconds at (0, −7.22): tip 4.70, tail 1.72, width 0.24, **square tip and square tail**. Hub
  black Ø 1.0 with a polished steel ring Ø 0.40 and a dark centre Ø 0.16. Blade 0.80–0.88,
  hub to 0.92.
- Drives: `hourHand`, `minuteHand`, `secondHand` (6 steps/s).

### 4.3 `dial.js` (builder B): dial + date ring
Reads `SPEC.dial`, `SPEC.date.ring`/`markers`, `SPEC.z`. References: `front.jpg`,
`OUT/front_overlay.png` (exterior researcher's overlay: ticks, slots, numerals, text boxes),
`detail1.jpg` (slots, markers, gold print), `detail3.jpg` (subdial, MADE IN GERMANY),
`OUT/num_*.png`, `OUT/logo.png`.
- One high-resolution print canvas over the dial (the 139's approach; ≤ 2048 in lite).
  White silver-plated #e9e9e9 with a fine frosted grain; print #111111.
- **Numerals** 12, 2, 4, 8, 10 at r 10.55–13.97, height 3.41, stroke **0.24** (thinner than
  the 139's). 12, 2 and 10 have tops outward; 4 and 8 have tops inward. Per-numeral widths
  are in SPEC.
- **Batons** 0.19 wide: 1, 3, 9, 11 at r 10.53–14.06; 5 and 7 from r 10.93 (clear of the
  subdial); none at 6.
- **Minute track:** 60 ticks r 14.79–15.62 (0.07 / 0.205 at the fives). Minutes 28, 29, 31
  and 32 are shortened to 15.24 and minute 30 to 15.50. It is moved inward to make room for
  the date track.
- **MADE IN GERMANY:** r 15.40–15.82, cap 0.42, tops inward, upright at 6. "MADE IN" spans
  182.0–194.9°, "GERMANY" 165.0–178.3°, and the 30-minute tick sits between the words.
- **NOMOS** (pointed M, baseline 6.54, cap 0.99, width 8.26, letter boxes in SPEC);
  **GLASHÜTTE** (baseline 5.39, cap 0.68, width 6.13, letter boxes).
- **"neomatik"** in metallic gold #c8a35e **with glitter**: lowercase geometric light sans,
  very wide tracking, x-height 0.53, ascenders 0.69, baseline 3.97, width 6.56, letter boxes
  in SPEC. Build it as its own decal mesh (metalness ≈ 0.8, roughness ≈ 0.45 + a sparkle
  noise in normal/roughness, #987439 → #f0d9a9) so it glints when the light moves.
- **Date track (the Update):** numerals 1–31 printed on the dial at clock `(d % 31)·11.613°`
  ("31" at 12, "1" at 11.6°), r 16.12–16.99, cap 0.87, stroke 0.075, light DIN-condensed.
  **Dates 9–22 are inverted** (tops toward the centre, read upright from 6; 8 and 23 stay
  upright). Between the numerals there are **31 stadium slots cut through the dial**: r
  16.25–16.83 (0.58 wide), 6.0° long, semicircular ends r 0.29 following the arc, centred at
  `(k+½)·11.613°`. Make them real holes in the geometry with white-plated walls 0.30 high.
  Through them the ring shows matte white, about #d5d5d5 lit and darker (#adadad) in the
  wall's shadow, plus the two red slots.
- **Subdial** at (0, −7.22): recess r 5.45 with a soft 45° step 0.15 deep. The floor
  #e3e3e3 is concentrically turned ("snailed", pitch 0.12, anisotropic rings). **12 equal
  ticks** r 4.15–5.19, 0.07 wide, with no heavier quarters (unlike the 139). The ink breaks
  over the grooves, as on the 139.
- **Dial feet:** brass Ø 0.56 at clock 10° and 230°, r 10.9, from the underside 0.50 to
  −0.75. Centre hole r 1.0.
- **Date ring** (`date-ring`, `drive: { key: 'date' }`, no phase): matte white #e4e4e4 face
  r 12.27–17.0 and **31 internal castellated teeth** (tips r 11.67, roots 12.27, tooth j
  centred at local clock j·11.613°, half a pitch wide), 0.20 thick at z [0.20, 0.40]. Two
  **red #c80e16 markers** printed on its top face at **local clock ½·Δ and 1½·Δ** (math
  angles 84.19° and 72.58°), each 7.0° long × r 16.15–16.93. With `rot.date = −2π·datePos/31`
  they sit at clock (D−½)Δ and (D+½)Δ, i.e. in the slots either side of today's numeral, and
  creep to the next pair between 23:45 and 00:15. Validated for D = 1, 3, 15, 16, 29, 30, 31.
  `live`: "16th · next change 23:45–00:15". In lite: face + markers only (no teeth).
- Explode: dial +27 (delay 0.75), ring +22 (delay 0.8): it waits for the case body, then rises in order.

### 4.4 `date.js` (builder B): date works + dial-side bridges
Reads `SPEC.dateTrain`, `SPEC.date` (switching, jumper, corrector, bridges), `SPEC.modules`,
`SPEC.layout`, `SPEC.z`; engine keys `dateDrive dateIdler1 dateIdler2 dateSwitch`;
`state.datePos`. References: `mov_duw6101_front_2560.jpg`, `LEAD/front_left.png`,
`LEAD/datebridge.png`, `LEAD/keyless_plate.png`, `LEAD/lower_bridge.png`,
`LEAD/centre_dial.png`, `LEAD/fq_*.png`, `LEAD/ov_front.png`, `mov_sjx_duw6101_program_disk.jpg`,
`mov_duw6101_datumschaltrad_2560.jpg`.
- **Date-drive wheel** at (−3.466, −0.661): gilt 24 t (tip Ø 3.65, z −0.12…−0.02) under a
  **steel star 18 t** with pointed teeth (0.04…0.14) that meshes the **hour wheel**, held by
  a **blued screw** Ø 1.0 (0.14…0.22). `drive: dateDrive` (1 turn / 6 h).
- **Date idlers:** steel 14 t at (−6.062, −0.892) and 16 t at (−7.947, −0.066), z
  −0.12…−0.02. Idler 2 carries an 8-leaf pinion (−0.02…0.10). Drives `dateIdler1`, `dateIdler2`.
- **Switching wheel** ("Datumschaltrad", program disk) on the square bush at (−9.05, 2.20),
  one turn per 24 h CW (`drive: dateSwitch`; rot = 0 at local midnight). It has a carrier
  48 t (0.00–0.10), a **gilt program wheel 30 t** (0.12–0.22; its teeth show through the date
  bridge's round window at (−7.2, 1.55) r 0.75), a steel **triangular/teardrop cam** r 0.75,
  and the **hook-shaped pivoting click** (0.25–0.33).

  At midnight the hook points straight out (local math angle 166.34°) and reaches r 11.89,
  in the ring's tooth band (tips 11.67). Animate the click's own pivot in `update()`: it
  rests against the cam with its tip inside r 11.55. While `frac(state.datePos)` is
  between 0 and 1 (23:45–00:15), place it so its hook tip pushes the flank of the tooth
  being moved. The tooth's world clock angle is (j + datePos)·Δ, and the ring turns
  clockwise. Never let the hook cut through a tooth.
- **Ring jumper:** steel spring blade from the screw at `SPEC.date.jumper.anchor`
  (−7.95, 7.16) to the beak at clock 319.35° (= 27.5·Δ, always a tooth gap on a whole date),
  r 11.80, z 0.22–0.34. During the drag the beak rides up and over one tooth:
  lift = tooth profile at `frac(datePos)`.
- **Date corrector** (static, crown position 2 only): 5-arm steel star (tips r 2.25, reach r
  11.44, clear of the teeth) over a 24 t wheel at (8.05, −4.43), and a 14 t idler at (8.85,
  −2.21). Both at z 0.02–0.14, the star at 0.20–0.34.
- **Dial-side bridges** (steel, polished bevels, screws as listed; outlines ±0.4, refine
  from the render if you like):
  - `date-bridge` [0.36, 0.46] over the switching stack (window r 0.75);
  - `motion-bridge` [0.18, 0.30] over the hour wheel's lower half, with a hole r 0.75 for
    the hour pipe. In the render the gilt upper half of the hour wheel shows as a lens above
    its edge;
  - `keyless-bridge` [0, 0.14] at 1–2 o'clock;
  - `dial-side-bridge` [0, 0.16] at 6 o'clock, carrying the **escape and fourth lower
    jewels** (pink in polished sinks).

  All stay inside r 11.55 (validated).
- Explode: date bridge +18.5 (delay 0.76), motion bridge +17, jumper +16, switching wheel
  +13, drive +11.5, corrector +10.5, lower bridge +10, idlers +9.5, keyless bridge +12.

### 4.5 `train.js` (builder C)
Reads `SPEC.train`, `SPEC.windingTrain` (**real** counts), `SPEC.modules`, `SPEC.layout`, `SPEC.z`,
`SPEC.case.stem`/`slidingPinionX`, `finish.manualStemAngle`. References: `rw_wheels.png`,
`LEAD/idlers.png`, `LEAD/idlers_zoom.png`, `OUT/boden_ul.png`, `mov_sjx_duw6101_date.jpg`,
`LEAD/front_right.png`, `LEAD/centre_dial.png`, `LEAD/ov_back.png`.
- **Barrel** (gilt): 126 t, m 0.0842, tip Ø 10.82, drum [−1.95, −1.14] with its floor on
  the dial side and a lid with a raised boss at −1.95. Teeth band [−1.30, −1.18] at the
  dial-side end. `drive: barrel`. Mainspring as on the 139 (rebuild on `state.reserve`;
  facts: 50 h, 7.14 turns). Barrel arbor `drive: ratchet`, square up to the ratchet on W0.
- **Going train** (gilt, 5 straight spokes, as in NOMOS's photo): centre 120 t m 0.0588 (Ø
  7.21) on L0 with pinion 18; third 112 t m 0.0518 (Ø 5.94) on L2 with pinion 16 on L0;
  fourth 120 t m 0.0494 (Ø 6.06) on L1 with pinion 14 on L2. The fourth arbor runs through
  the pillar plate, the dial-side lower bridge and the dial to the seconds hand (tip 0.88).
  The centre arbor's upper pivot is in the rotor-bearing disc's jewel (automatic) and its
  dial end carries the cannon pinion.
  The fourth wheel's tip circle passes 0.24 mm from the third arbor's axis, so keep the
  third arbor thin (r ≤ 0.12) between its wheel and its pinion (validated). The fourth
  wheel's rim lies between the third pinion (L0) and the third wheel (L2): a real interlock,
  accepted in the explode (§7).
- **Motion works:** cannon pinion 12 leaves m 0.1156 (−0.30…−0.16) with its pipe to 1.69
  (r 0.45; r 0.40 above 1.40). Minute wheel 40 t gilt, **skeletonised with three round
  holes** (render), with a steel 10-leaf pinion m 0.1307 that looks star-like on top
  (−0.20…0.16). Hour wheel 36 t gilt (0.04…0.14), bore 0.47, pipe r 0.47–0.65 to 1.39. It
  also drives the date-drive star (date module, phase chain §2).
- **Keyless** (dial side, in the recesses): stem stations `SPEC.case.stem` (y 0, z −1.09).
  - Sliding pinion x 8.30–9.55 (square bore; Breguet teeth toward the winding pinion; 12
    contrate teeth toward the setting idler) turns by `manualStemAngle`.
  - Winding pinion 17 t at m 0.1386, teeth x 9.77–10.32, Ø 2.72, Breguet teeth on its inner
    face, angle = `rot.stem`. Its lowest teeth pass through the 3/4-plate slot to mesh the
    crown wheel's rim, rack-type as on the 139. It also pokes through the pillar plate's
    key slot to +0.27 on the dial side; it is visible there in the render.
  - Setting wheel 20 t at (4.833, 0.052) and setting idler 20 t at (7.144, 0.10), z
    −0.42…−0.20, drives `settingWheel` / `settingIdler`. The idler's rim reaches the sliding
    pinion's contrate face at x 8.30.
  - Setting lever pivot (8.55, 3.05) with its pin in the stem groove x 11.05–11.50; yoke
    pivot (6.60, −2.60) with fork fingers in the sliding pinion's groove (x ≈ 8.9); yoke
    spring and setting-lever jumper.
  - All levers at −0.33…−0.19 inside `SPEC.frame.dialSideRecesses.keyless`, SDF outlines as
    on the 139, routed around the setting wheels.
  - Stop-seconds lever: static, a short steel lever inside the keyless recess (same level as
    the other levers). Its real path to the balance (at 8 o'clock, far from the keyless
    works) is hidden and unknown, so do not route it across the movement. Say so honestly
    in its description.
- **Hand winding on the 3/4 plate** (visible through the rotor window):
  - Crown wheel 42 t steel (tip Ø 6.18) in the plate pocket [−2.43, −2.27], with a
    Glashütte sunburst ring between the teeth and the **fixed polished cover disc** r 2.03
    held by 2 slotted screws Ø 1.11 at (7.04, 1.03) and (7.04, −1.13).
  - Idler 1, 20 t steel (tip Ø 3.13), with a slotted screw and polished collar.
  - Idler 2 upper, 16 t steel (tip Ø 2.58), under a polished **half-moon cap**.
  - Under the plate on W0: idler 2's lower **gilt 21 t wheel** and the **steel ratchet 63 t**
    (tip Ø 8.50) on the barrel arbor's square. The gilt wheel (tip Ø 3.06) is registered as
    `transmission-wheel`. That id is idler 2's lower wheel, **not** the automatic train's
    wheel T, which belongs to `winding-train`. It is a separate part from idler 2's upper
    wheel because the 3/4 plate lies between them, and in the explode they leave on
    opposite sides of the plate. Only
    their meshing teeth show through the winding window (frame), over the gilt barrel lid.
  - Click + click spring on W0 at `SPEC.windingTrain.click`. The beak follows the 63-tooth
    phase (`windAngle/2π·63`), as in the 139's contact-exact click; it is hidden but shows
    in X-ray and exploded views.
- Explode per SPEC. The stem leaves sideways first (delay 0, +22 x); the winding and sliding
  pinions rise later (+6.5 / +5.5 z, delays 0.95 / 0.93); the setting idler goes +3.

### 4.6 `automatic.js` (builder C)
Reads `SPEC.rotor`, `SPEC.autoTrain`, `SPEC.automatic`, `SPEC.modules`, `SPEC.layout`, `SPEC.z`,
`finish.*`. References: `mov_duw6101_boden_bajonett42_2560.jpg` (rotor at rot.z 71.8°),
`LEAD/ov_back.png` (outline overlay), `OUT/boden_ul.png`, `OUT/boden_hub.png`,
`LEAD/reverser.png`, `mov_werk_duw6101_03_bajonett42_2560.jpg`, `mov_duw6101_3dfront_2560.jpg`,
`OUT/d4_rect.png`.
- **Rotor** (`drive: { key: 'rotor' }`). The local frame has the heavy rim at local −Y.
  - Outline + window polygons are in `SPEC.rotor`: a half-moon **rim** (r 10.20–15.56,
    straight parallel end cuts), a slightly **S-curved bar** along the diameter, and the
    **collar** r 3.47–4.02 round the bearing, with a big **window** between bar and rim.
    Validated: centroid on −Y, overlay matches the render at 71.8°.
  - Zones: bar, collar and the rim's inner step (r 10.20–11.55) from −2.95 to −2.65; the
    lettered **flat** r 11.55–13.67 at −3.15; an outer **bevel** to r 15.56 at −2.85 that is
    radially brushed (as is the outer wall); a heavier **skirt** r 13.90–15.56 down to −2.30.
  - **Finish:** rhodium with Glashütte ribbing on the bar, collar and inner step, using
    `ribbingUV(geo, SPEC, SPEC.automatic.refRotDeg)` so the bands continue the plate's bands
    at the reference pose, as in every NOMOS image. The flat is satin.
  - **Raised gold letters** "NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE" (+0.05 relief to −3.20,
    gold #e3ac5a, DIN-like caps, cap 1.06, centres r 12.62). Seen from the back they read
    counter-clockwise with tops toward the axis. The first N is at local −8.6° and the last
    E at −173.1°, so "NOMOS" reads "SOWON" upside-down at the top in the reference pose. Ü
    has dots.
  - Under the collar is the **rotor wheel 60 t** (m 0.1171, tip r 3.66, root 3.32), teeth at
    [−2.36, −2.26] sunk in the plate's groove, body r 3.47–3.66 down from −2.62. It turns
    with the rotor.
  - `live` comes from the panel (rotorVel).
- **Rotor bearing** (fixed, `rotor-bearing`, the "Bajonett" bearing): polished disc r 2.43
  [−2.75, −2.47] with **3 slotted screws** Ø 1.31 at r 1.38 (`SPEC.frame.steelScrews.bearing`,
  they do NOT turn) and the **centre jewel** Ø 0.6 (the centre wheel's upper pivot). There
  are 9 balls Ø 0.25 on r 2.57 at z −2.62, visible between the disc and the ring, and a
  **notched bayonet ring** r 2.72–3.28 with 6 notches, ≤ 3.28 so the rotor wheel lifts clear.
- **Reverser** (`reversing-wheels`, NOMOS "Doppelklinkenrad") at (−3.38, 3.24), in the
  plate's round window r 1.46. A gilt 20 t wheel (tip r 1.32) follows the rotor:
  `−3 × rot.rotor` + phase. On it sits a steel **click star** with 16 fine ratchet teeth and
  the 8-leaf pinion below, which turn one way only: `+348.075 × rot.ratchet`. A steel half
  cover with a central pin sits on top (fixed). Describe it plainly: it turns the rotor's
  swings in both directions into one-way winding.
- **Winding train** (`winding-train`, hidden under the 3/4 plate, gilt wheels on steel
  pinions):
  - A 26|16 at (−4.51, 1.72)
  - B 48|18 at (−5.91, 5.14)
  - C 34|8 at (−6.08, 8.90)
  - D 24|10 at (−4.03, 9.88)
  - T 22 at (−2.111, 9.092)

  Levels are in `SPEC.z.autoLevels`; angles = ratios × `rot.ratchet` (§2). Jewels/pivots are
  frame's.
- Explode: rotor −49 (the last movement part), bearing −43, reverser −28.5, winding train −17.

### 4.7 `escapement.js` (builder D)
Reads `SPEC.escapement`, `SPEC.timing`, `SPEC.layout`, `SPEC.modules.fourth`, `SPEC.train.escape`,
`SPEC.frame.balanceBridge`, `SPEC.z`, `finish.*`. References: `LEAD/ov_back.png`,
`OUT/e_bal.png`, `OUT/z_bal.png`, `OUT/bg_*.png`, `mov_werk_duw6101_03_bajonett42_2560.jpg`,
`mov_duw6101_3dfront_2560.jpg`, `LEAD/fq_ll.png` (lower Incabloc on the dial side).
- Reuse the 139's **solved** escapement technique (contact simulation) with this geometry:
  escape (−3.21, −7.38), pallet (−5.81, −6.08), balance (−8.81, −4.34). Escape tip r
  2.517 (pallets embrace 2½ teeth), pallet–balance 3.468, roller jewel r 0.738, near
  straight-line lever (153.4° vs 149.9°).
  - Escape wheel: 15 club teeth, **4 straight arms**, polished steel, on L0 (−1.04). Pinion
    10 at m 0.0494 (−1.32…−1.16), phase `meshPhase(ang(fourth,escape),120,10,0)`. It shows
    partly in the 3/4-plate cut-out: exposed.
  - Pallet fork on L0 (−1.055) with two ruby stones. Upper pivot in the pallet bridge (frame).
- **Balance:** gold #d9ad6f, Ø 9.40, rim 0.32 × 0.44 at [−1.94, −1.50], 3 tapered arms flush
  with the back face, poising holes. **Hairspring** blue #2c5da6, 13 coils, r 0.45–2.2,
  terminal r 2.9, [−2.06, −1.98]; the outer coil runs through the spring key's pins to the stud.
- **NOMOS balance bridge** (`balance-bridge`): screwed at BOTH ends with blued S3 (−12.14,
  1.05) and S4 (−6.75, −10.16), Ø 1.46, slotted. It uses the 23-point outline, a ribbed top
  (`ribbingUV`), polished bevels, boss r 2.06 round the staff, z [−2.45, −2.10] (top flush
  with the plate top). The pads rest on pillar-plate seats (frame). The bridge is bent: the
  upper arm is 31.7° from vertical, the lower 19.5°.
- **DUW regulation** (`regulator`): key ring r 1.51–1.95 and stud ring r 1.63–2.03 on the
  boss [−2.53, −2.45]. The gold spring-key block at (−7.95, −1.43) has two pins straddling
  the outer coil; the stud carrier is at (−5.86, −4.20). No regulator screw. Technique as
  on the 139.
- **Shock** (`shock-absorber`): upper Incabloc in the boss (gold lyre, cap jewel at
  (−8.82, −4.28)), setting band r ≤ 1.46, top −2.58. **Lower Incabloc**
  (`shock-absorber-lower`): set into the pillar plate's dial face at the staff, r 0.80, z
  [−0.30, 0.02], gold lyre visible on the dial side. Its explode is +4 (toward the dial).
- Explode: escape −5.5, fork −6.5, balance/roller −26, hairspring −29, bridge −34,
  regulator −36, shock −38, lower shock +4.

### 4.8 `frame.js` (builder D, also owns `finish.js`)
Reads `SPEC.frame`, `SPEC.movement`, `SPEC.layout`, `SPEC.z`, `SPEC.dial.feet`. References:
`mov_duw6101_boden_bajonett42_2560.jpg`, `LEAD/ov_back.png`, `LEAD/ur_quadrant.png`,
`LEAD/ur_edge.png`, `LEAD/madein.png`, `LEAD/idlers_zoom.png`, `LEAD/rib_check.png`,
`mov_duw6101_front_2560.jpg` (dial-side perlage, jewels), `OUT/d4_rect.png` ("REGULIERT IN 6 LAGEN").
- **Ribbing** (Glashütte stripes, measured by the lead): bands run along math angle
  **+25.5°** in the dial frame. Seen from the back they **descend to the right** at 25.5°,
  the opposite slant to the 139. Pitch **2.00 mm**; boundaries where
  v = −x·sin25.5° + y·cos25.5° ≡ 0.10 (mod 2). `ribbingUV()` + `ribbedMaterial()` already
  encode this, including the saw-tooth shading (each band darkest on its low-v edge,
  brightest on its high-v edge, sharp step).
- **Pillar plate** (`main-plate`), r 15.54, core [−0.95, 0]:
  - Dial face: NOMOS perlage "fish scales" Ø ≈ 2.0, with recesses (`dialSideRecesses`:
    motion −0.35, date −0.20, keyless −0.35, setting pocket −0.56).
  - Key slot through for the sliding and winding pinions (`frame.windingPinionKeySlot`:
    x 8.20–10.55, y ±1.45).
  - Stem channel in the back face (x 5.0–15.6, y ±0.55, to −0.60) and the **stem passage**
    through the raised ring (`frame.stemPassage`).
  - Dial-feet blind holes; the lower Incabloc pocket at the balance; a through hole Ø 1.4.
  - **5 ring-support rubies** Ø 0.8 at r 12.9 (clock 36 + 72k), tops at 0.195.
  - Lower jewels: centre, third, pallet, barrel, A, B, C.
  - **Raised perlaged ring** r 13.63–15.54 up to −2.10 (perlage Ø ≈ 1.6), except inside the
    balance cut polygon, where the floor stays low and perlaged round the balance.
  - Raised **balance-bridge seats** under the two pads (`balanceBridge.seats`).
  - A cosmetic **pocket** in the ring at back clock 23°–46°, r 13.63–14.45, floor −1.95.
  - Gold-filled engravings on the ring, tops inward, reading counter-clockwise from the back
    (cap 0.50, r 14.40): **"MADE IN GERMANY"** at back clock 174° → 148.3° and
    **"REGULIERT IN 6 LAGEN"** at 214° → 186° (under the rotor in the reference pose).
- **Three-quarter plate** (`three-quarter-plate`), r 13.63, [−2.45, −2.10], ribbed, polished
  anglage ≈ 0.1. Minus:
  - `threeQuarterCut` (balance side; it contains the whole balance and bridge, validated);
  - the **winding pocket** (convex hull of the crown-wheel r 3.27 and idler r 1.76 / 1.56
    circles, floor −2.25, dark polished walls) with the through **winding window** polygon,
    where the idler-2 gilt wheel, ratchet teeth and gilt barrel lid show;
  - the **reverser window** r 1.46 plus the **rotor-wheel groove** r 3.20–3.82, floor −2.22,
    with a hole r 0.62 for the reverser pinion;
  - the **winding-pinion slot** (x 9.72–10.37, y −1.45…1.80);
  - the **casing-screw notch** r 1.15 at (0.15, 14.53);
  - jewel sinks: pink rubies in polished cones for third, fourth (large Ø 1.16), escape,
    barrel (under the rotor bar), A Ø 0.70, B Ø 1.16, C Ø 1.06, D Ø 0.55. T's pivot is a
    plain polished bush Ø 0.4 at (−2.111, 9.092);
  - countersinks for the blued S1 (0.11, 12.13), S2 (−11.44, 4.19), S5 (−4.11, −11.53), S6
    (11.70, 3.56) and S7 (10.78, −5.41). S6 and S7 are under the rotor rim in the reference
    pose; S3 and S4 are the bridge's.

  The bearing disc sits on the flat plate top at the centre.
- **Plate engravings** (`plate-engravings`, gold-filled, DIN-like caps, reading from the
  back): **"DUW 6101" / "N° {movementSerial}"** (30264), cap 0.83, left-aligned at back x
  −6.73, line centres y −5.36 / −6.56 (seen through the rotor window). **"42 RUBINE"**: arc
  r 12.60, back clock 23.1° → 49.8°, reads clockwise, **tops outward**, cap 0.85.
- **Pallet bridge:** small perlaged bridge (EST outline) [−1.45, −1.18] with the pallet jewel
  Ø 0.65 and a polished screw.
- **Plate screws:** blued S1, S2, S5, S6, S7, heads Ø 1.46 at [−2.58, −2.45], slotted (#1b437e).
- `jewels` part: the upper jewel group (child of the 3/4 plate), the lower + ring-support
  jewels (children of the pillar plate) and the pallet jewel; explode 0 (they ride with
  their plates).

---------------------------------------------------------------------------------------------

## 5. What shows through the display back (reference pose, rot.z 71.8°)
Left half: the rotor (rim from 11 to 5 o'clock with raised gold letters, S-bar through the
hub). Through its window you see the 3/4 plate ribbing, **"DUW 6101 / N° 30264"**, the
**crown wheel with its cover disc and 2 screws, idler 1 (screw + collar), idler 2 (half-moon
cap)**, the gilt idler-2 wheel and ratchet teeth in the window, and the winding pinion's
dark teeth in its slot.

Centre: the fixed bearing (3 screws + jewel, balls, notched bayonet ring) inside the collar.

Right half: ribbing, **"42 RUBINE"**, five blued screws, jewels B/C/D/A, the **gilt reverser
in its window**, the **gold balance under the two-sided bridge**, the DUW rings with the gold
spring-key block, the blue hairspring, perlage round the balance, and **"MADE IN GERMANY"** in
gold at 5 o'clock.

At the 12 o'clock edge, the plain slotted **casing screw** half under the back ring.

In the UI the rotor hangs to the camera's "down", so it will often cover the lower half.
That is physically right.

---------------------------------------------------------------------------------------------

## 6. Cross-module interfaces (seams)

| seam | rule |
|---|---|
| hour wheel (train) ↔ date-drive star (date) | z [0.04, 0.14] both; phase chain §2 (phHW computed identically) |
| ratchet (train) ↔ T (automatic) ↔ idler 2 lower (train) | the ratchet keeps local phase 0 at `rot.ratchet`; others per §2 |
| crown (case) / stem + sliding pinion (train) | `manualStemAngle()`; the winding pinion uses `rot.stem` |
| dial slots (dial) ↔ ring markers (dial) ↔ click & jumper (date) | ring tooth j at local clock j·Δ; jumper/click act in gaps at world (n+½)·Δ |
| balance bridge (escapement) ↔ plate cut + seats (frame) | same `SPEC.frame.balanceBridge.outline`; the frame cuts `threeQuarterCut` and raises `seats` to −2.10 |
| blue screws | S3/S4 by escapement (bridge); S1, S2, S5–S7 by frame |
| rotor bearing disc (automatic) ↔ plate top (frame) | the disc sits on the flat plate top; the centre jewel belongs to the bearing |
| rotor wheel / reverser (automatic) ↔ groove / window / pinion hole (frame) | radii and floors in `SPEC.frame` |
| winding window (frame) ↔ idler-2 gilt wheel + ratchet (train) | window polygon in `SPEC.frame.windingWindow` |
| casing screw (case) ↔ notch (frame) ↔ casing-ring lip (case) | `SPEC.frame.casingScrew` |
| dial feet (dial) ↔ blind holes (frame) | `SPEC.dial.feet` |
| escape/fourth lower jewels | in the dial-side lower bridge (date); the pillar plate only has clearance holes there |
| dial-side recesses (frame) ↔ dial-side parts (train/date) | recess outlines in `SPEC.frame.dialSideRecesses` contain the parts (validated) |
| lower Incabloc (escapement) ↔ pocket (frame) | r 0.85, z [−0.30, 0.02] |

---------------------------------------------------------------------------------------------

## 7. Explode choreography (all in SPEC; validated by sweeping the registry easing)
- Movement side, removal order: going train L0 → L1 → L2 → barrel (−5 … −15.5) → winding
  wheels under the plate (−17 … −19) → **3/4 plate −23** → balance −26 (through the cut-out)
  → on-plate wheels (−27.5 … −29.5) → screws −31 → bridge / regulator / shock (−34 … −38)
  → casing ring −35 / clamp −39 → bearing −43 → **rotor −49** → back glass −57 → back ring −61.
- Dial side, outward: keyless (+3 … +6.5) → minute wheel +8 → date works and bridges
  (+9.5 … +18.5) → **date ring +22** → **dial +27** → hands (+32 / +35 / +38) → case body
  +48 → crystal +55 → **bezel +62**.
- Explicit delays (`SPEC.explodeDelay`):
  - stem and crown first (0);
  - case body, lugs, straps and casing ring 0.7 (after the stem has left the case wall and
    casing ring);
  - dial 0.75, then date ring 0.8 and date bridge 0.76 (nothing rises before the part above it);
  - winding / sliding pinions, yoke and setting idler late (0.93–0.95, after the stem has
    left their bores).

  Everything else: delay = 1 − |offset|/70.
- One accepted crossing: the third pinion passes the fourth wheel's rim (a real interlock;
  the validator warns).

---------------------------------------------------------------------------------------------

## 8. Validation status and open risks
`check.mjs`: **PASSED**, with 2 expected warnings: the third/fourth interlock, and 4
balance-bridge vertices lying on the cut boundary (shared points).

Open risks:
1. **Tooth counts are estimates** except the crown wheel (42) and escape wheel (15). The
   automatic train topology (R → A → B → C → D → T → ratchet) and the date train (6 h drive,
   24 h switching wheel) are the lead's designs. They fit every measured pivot and exact
   centre distances, but the real 42-jewel DUW 6101 layout is unpublished.
2. **Third wheel moved 0.24 mm** from the research by circle fit (confidence M). It is the
   only position that keeps the fourth wheel clear of the third arbor with these counts.
3. **Equivalent ratchet:** `SPEC.keyless.ratchet.teeth = 48` exists only for the engine.
   Build from `windingTrain.ratchet` (63). The engine's `state.clickLift` uses 48, so the
   train module computes its own click phase.
4. **Crown vs rotor winding:** the engine turns `rot.stem` with rotor winding as well;
   `manualStemAngle()` fixes it in the parts. The integrator may prefer an engine-side
   `rot.stemManual`.
5. Power reserve 50 h follows NOMOS's variant page; every review says 42 h.
6. Dial-side bridges, date-works positions and the click engagement are hidden parts with
   coarse outlines (±0.4) or estimated behaviour.
7. **Bayonet ring** reduced to r 3.28 (render ≈ 3.46) so the rotor wheel lifts clear in the
   explode. The **rotor skirt** starts at r 13.90 (research 13.70) to clear the bridge's
   lower pad.
8. Hand heights, dial and crystal thickness, back-glass thickness (0.9) and the whole
   movement-side stack are estimates that fit the official 7.4 / 3.6 mm totals. Clearances
   are tight: rotor letters to back glass 0.15, cap to crystal 0.20.
9. Serial numbers are from the press renders ("TANGENTE 1", "N° 30264"). Put the owner's in
   `SPEC.caseSerial` / `movementSerial` if known.
10. Shared glyphs with the 139 need an integrator decision (hoist to `src/geom`, or re-derive).
11. The engine's date drag shows one extra step at midnight after a 30-day month. The real
    watch needs a manual correction there; this is acceptable.
