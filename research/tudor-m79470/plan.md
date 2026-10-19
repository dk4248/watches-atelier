# Tudor Black Bay Pro M79470-0004 (MT5652) — build plan

Lead-engineer plan for the four builder agents. The single source of truth is
`src/watches/tudor-m79470/spec.js` (SPEC). This file says who builds what, from which SPEC
blocks and reference images, what makes each part right, and where the modules meet.
`node research/tudor-m79470/check.mjs` validates SPEC (gearing, kinematics, the collision-checked
z stack, the explode sweep, the part-id list) and must stay PASSED.

## 0. Read first

- **Sources**: `research/tudor-m79470/exterior.md` (case, dial, hands) and `research/tudor-m79470/movement.md`
  (MT5652: layout, counts, levels, bridges, rotor, finishes; §9 has a plain-English label for every part) —
  both are folded into SPEC. Reference images live in the session scratchpad
  (`<scratchpad>/`):
  `img/tudor-m79470/` (press/official photos, `mov_*` movement images; `mov_derived_*` are back views in
  SPEC's frame at 60 px/mm), `blog/bNN.jpg` (= "blog bNN": the MT5652 teardown), `reg/`, `reg2/` (registered
  back views, 60 px/mm).

- **The bar is the Tangente 139** (`src/watches/tangente-139/`): every dimension from SPEC, measured
  outlines, bevels where the real part is bevelled, real finishes (one material per mesh), meshing gears
  interleaved with `gear.meshPhase`, contact-exact mechanisms (its escapement is SOLVED by a 2-D contact
  simulation, its click follows a contact table). The owner loves that replica for its accuracy and
  detail — this watch must feel the same. Read its `parts/*.js` for technique (Batch merging, lathe pieces
  with crisp shoulders, SDF outlines + marching squares, sdfExtrude with anglage, planar-UV finishes,
  followBlade label anchors); never copy a whole module (CONTRACT).
- **Conventions** (CONTRACT.md): mm; +Z out of the dial; 12 = +Y; 3 o'clock (crown) = +X for EVERY part,
  movement side included. Back-view measurements are converted with x_dial = −x_back (SPEC's `B()`); text
  and decoration seen from the back (bridge engravings, rotor lettering, case-back ring) are laid out in
  back-view coordinates and mirrored the same way so they read correctly from behind. z = 0 is the
  dial-side face of the main plate; exterior heights went through `zc()`. Never hard-code a level SPEC
  defines.
- **Animated parts**: a Group at the arbor + a child `rotor`; `drive: { key }` from the kinematics (§4);
  winding-train parts use `update()` with `state.rot.rotor` or `state.rot.ratchet` × ratio; no allocation
  per frame.
- **SPEC is shared and read-only for builders.** Module-local cosmetics (fillets, bevel sizes, segment
  counts, texture sizes, arm shapes) live in your module as named constants. Anything that is a position,
  level, ratio, tooth count or outline comes from SPEC. If SPEC lacks something, add a clearly named
  constant in your module marked `// SPEC-REQUEST` and list it in your report; the lead moves it into
  SPEC and re-runs the check.
- **Lite** (`ctx.lite`, the watch box): only `case`, `dial`, `hands` run — no bracelet/clasp, ≤2048²
  textures, half the segments; the date disc (built by `dial`) is the only thing under the dial.
- **Quality**: ≥96 segments for large discs, ≥32 for screws/jewels; merge static same-material geometry;
  whole watch < 1.5 M triangles (budgets in §1); one material per mesh.
- **Try your module** with `node build.mjs --solo tudor-m79470:<builder>[,<builder>]` (`?lite` for the box
  build) and the hash views `#front #back #side #iso #isoBack #top`, modifiers `.explode .xray .slow`,
  `#focus-<id>.<view>`; console `window.__solo`. Use your own browser tab and close it when done.
## 1. Module split — four builders, eight files

| Builder | Files (builder name) | Registers | Triangles |
|---|---|---|---|
| **A — case** | `case.js` (`case`) | case-body, lugs, bezel, crystal, flange, crown, caseback, bracelet, clasp, spring-bars | ≤ 450 k (bracelet ≤ 250 k) |
| **B — dial side + rotor** | `dial.js` (`dial`), `hands.js` (`hands`), `automatic.js` (`automatic`) | dial, indices, date-window, dial-feet, date-disc · hour-hand, gmt-hand, minute-hand, seconds-hand · rotor, rotor-bearing, reversing-wheels, winding-train | ≤ 300 k |
| **C — wheels** | `train.js` (`train`), `dialworks.js` (`dialworks`) | barrel, mainspring, barrel-arbor, barrel-cover, center-wheel, third-wheel, fourth-wheel, ratchet-wheel, crown-wheel, winding-intermediate, click, click-spring · cannon-pinion, minute-wheel, hour-wheel-driver, hour-wheel, hour-jumper, gmt-wheel, gmt-wheels, date-wheels, instant-date-lever, date-jumper, calendar-plate, date-disc-guards, winding-stem, sliding-pinion, winding-pinion, setting-lever, yoke, setting-wheel, keyless-springs, stop-seconds-lever | ≤ 350 k |
| **D — regulating organ + frame** | `escapement.js` (`escapement`), `frame.js` (`frame`) | escape-wheel, pallet-fork, balance-wheel, roller, hairspring, balance-bridge, shock-absorber · main-plate, automatic-bridge, barrel-bridge, train-bridge, center-wheel-bridge, pallet-bridge, jewels, plate-screws, plate-engravings | ≤ 350 k |

Changes after movement.md (C and D had not started): `bridges` is split into `automatic-bridge`,
`barrel-bridge` (with the flange ring) and `train-bridge` — the automatic train and the keyless wheels sit
BETWEEN them, so they must explode separately; C gains `winding-intermediate`, `instant-date-lever` and
`stop-seconds-lever`. B's and A's ids are unchanged. The report's other ids map onto the plan: reverser-wheels
→ `reversing-wheels`, reduction-wheel → `winding-train`, rotor-post → part of `rotor-bearing`, gmt-idler →
`gmt-wheels`, date-driving-wheel → `date-wheels`, date-ring → `date-disc`, centre-wheel-bridge →
`center-wheel-bridge`, inertia-screws → part of `balance-wheel`, stud-holder → part of `balance-bridge`.
Plain-English labels for the panel: movement.md §9.

The descriptor (`index.js`) already lists the builders in this order and `lite: ['case', 'dial', 'hands']`;
its `show.spotlight`, `closeup`, `winding`, `solidCaseback: 'caseback'` and `explodeHide` name ids from this
table — keep the ids exactly (the check verifies the table, the explode list and the descriptor agree).
Categories (the panel shows them by name; unknown ones are capitalised): case parts → `case`; dial,
indices, date window, dial feet, date disc → `dial`; hands → `hands`; cannon pinion, minute wheel, hour-wheel
driver, hour wheel, hour jumper, 24-hour wheel, GMT idler → `motion`; date driver, instant-date lever, date
jumper, calendar plate, disc guards → `calendar`; keyless (stem, pinions, levers, springs, setting wheel,
stop-seconds lever, winding intermediate, crown wheel, click) → `keyless`; barrel, mainspring, arbor, cover,
ratchet → `power`; centre, third, fourth wheels → `train`; escape wheel, pallet fork → `escapement`; balance,
roller, hairspring, balance bridge, shock absorber → `regulating`; rotor, bearing, reversing wheels, winding
train → `automatic`; plate and bridges → `frame`; jewels → `jewels`; screws → `screws`. Plate and bridges
`xray: true`.

## 2. Seams between modules

Every seam is a SPEC value; the check tests the whole stack, so parts meet if both sides use SPEC.

| Seam | Inside / below | Outside / above | Rule |
|---|---|---|---|
| Hands on pipes | C: hour pipe, 24-hour pipe, cannon pipe (`dialworks`), fourth arbor (`train`) | B: hands | pipe radii `SPEC.pipes`, pipe tops `z.hourPipeTop / gmtPipeTop / cannonPipeTop / secondsArborTop`; bores `hands.*.bore` (pipe + 0.01); checked |
| Under the dial | C (`dialworks`), B (date disc) | B: dial | nothing above dial top(r) − 0.40; the dial seat is `z.dialSeat` on the calendar-plate rim |
| Date disc | C: calendar plate (top = `z.calendarPlate[1]`), date jumper, instant-date lever, guards | B: `date-disc` | B builds the disc (also in lite); C builds what moves/holds it, phased by `date.disc.jumperDeg` / `toothDeg0`; both use `rot.date` |
| GMT hand ↔ 24-hour wheel | C: `gmt-wheel` | B: `gmt-hand` | both `drive: { key: 'hand24' }` |
| Jumping hour | C: `hour-wheel-driver`, `hour-jumper`, `hour-wheel` | B: `hour-hand` | all `hourWheel` / `hourHand` (equal in normal running) |
| Stem ↔ crown | C: `winding-stem` | A: `crown` | axis y `keyless.stemY`, z `z.stemAxis`; the stem ends inside the crown at `case.crown.stemEnd`; both `rotation.x = rot.stem` |
| Keyless ↔ automatic | C: ratchet, crown wheel, winding intermediate (`z.ratchetWheel`) | B: reduction pinion (`z.reductionPinion`) | ratchet 55 meshes the crown wheel AND the reduction pinion with one module (`sameModule`); B drives its train from `rot.ratchet` × `autoTrain.ratios` |
| Wheels ↔ plates | C, B (automatic train) | D: plate and bridges | wheels live in the gaps `z` defines (plate pocket/recesses, bridge undersides, the automatic bridge's sinks); D puts a jewel at every pivot of `layout` |
| Balance bridge | D (`escapement`) builds it with the balance | D (`frame`) | outline `frame.balanceBridge.outline`; arch `z.balanceBridge`, feet `z.balanceBridgeFeet`; the flange and the train bridge are cut round it |
| Centre-wheel bridge | D (`frame`) | C: centre wheel under it, fourth wheel over it | strap `frame.centerWheelBridge` at `z.centerWheelBridge`, hole r 0.45 for the arbors |
| Rotor ↔ movement | B: rotor, bearing (`z.rotor*`) | D: train bridge (post foot), automatic bridge, flange, balance bridge | the band hangs only over the flange (r ≥ `rotor.skirtInner`): 0.18–0.23 clear (checked) |
| Rotor ↔ case back | B: rotor (`z.rotor`) | A: case back (inner face `z.casebackInner`) | 0.38 clearance (checked) |
| Movement ↔ case | D: plates r 15.9 | A: case bore `case.middle.boreRadius` | coaxial; the flange (case) rests on the dial edge |
| Bracelet ↔ lugs | A | — | spring bar `case.lug.springBar` (the watch box uses the same values) |
## 3A. case.js — builder A (`case`, lite)

Registers: `case-body` (middle case), `lugs`, `bezel`, `crystal`, `flange` (rehaut), `crown`, `caseback`
(= descriptor `solidCaseback`), `bracelet` (all links incl. the end links, both halves), `clasp`,
`spring-bars` (hidden, `exposed: false`). In lite: return before `bracelet`/`clasp`/`spring-bars`
(the box draws its own band from `SPEC.case.lug.springBar` and the descriptor's `strap`). Keep the
bracelet ids exactly `bracelet`/`clasp`/`spring-bars`: the camera excludes those ids from the hero framing.

SPEC: `case` (profile, middle, lug, bezel, crystal, flange, crown, caseback), `bracelet`, `z` (caseBottom,
casebackFace, casebackInner, caseTop, bezelTop, stemAxis), `colours`, `explode`.

Images (img/tudor-m79470/): press_M79470-0004_FF_RGB.png (4000², 38.41 px/mm — bezel engraving, lug plan,
crown end; work-tudor/overlay_check.png has the outlines drawn back on it), press_M79470-0004_DET_RGB.png
(3/4: crown flutes + rose, lug bevel, crystal wall, bracelet rivets), mono_polar_6.jpg (9 o'clock side:
tall flank, lug drop, knurled back), mono_polar_8.jpg (case back, knurl, serial 5K98671, end-link codes),
mono_polar_9.jpg (clasp), off_feat_bezel.png (crystal dome and wall), fr_TudorBlackBayPro-3.jpg (crown
side), off_upright_ob.png and off_bracelet_c/o.png (bracelet straight / clasp), press_tudor-2021-s38-10648.png
(end link).

What makes it right:
1. Finish map (one material per mesh): MIRROR-polished flanks; a continuous polished bevel along the top
   outer edge from lug tip to lug tip (`case.middle.topBevel`, `case.lug.outerBevel` 0.45 in plan);
   satin lug tops brushed along 12–6; satin case-back face (straight brushing); bezel top satin with
   RADIAL brushing (anisotropy direction radial), bezel side and inner chamfer polished.
2. The tall straight polished flank (Z_case 3.2–9.7) is the watch's signature silhouette — keep it crisp;
   the lugs fall away convexly (`lug.profile`) to a square-cut tip with a 0.8 rounded outer corner, inner
   faces at x = ±10.0, no spring-bar holes.
3. Bezel scale is ENGRAVED and black-filled (0.10 deep): 12 even numerals + 12 odd-hour bars, no triangle,
   no minute marks; numerals 8–16 tops INWARD, 18–6 tops OUTWARD; place glyphs by the measured spans
   (`bezel.engraving.numerals.spans`), cap height 2.34, stroke 0.24, condensed squarish monoline digits
   (flag-topped 1 without a foot, flat-based 2, closed 4, square-bowled 6/0, 8 with a smaller upper bowl).
   Draw them as vector strokes (crisp at macro zoom) or a ≥4096² mask — not a system font.
4. Crystal: box-dome sapphire — vertical wall r 15.95 (Z_case 12.20–13.05), then the dome to the 14.60 apex;
   domed underside (2.55 thick at the centre). Clone M.sapphire (IOR 1.77), faint blue AR tint, no shadows.
5. Flange: plain light-grey satin cone, no print, from the dial edge (r 14.30) to the crystal edge.
6. Crown Ø7.4: dark seal ring at the flank (no tube visible), 20 flat-topped satin flutes, polished conical
   end, the TUDOR ROSE in relief on the polished end face (five petals, sepal points between them, a round
   boss, inside a thin raised ring). Axis = `z.stemAxis`; it turns with the stem: `rotation.x = rot.stem`.
7. Case back (solid, screw-down): coin-edge knurl (≈120 teeth) on the r 16.2 cylinder; flat ring with the
   engraved serif text "TUDOR GENEVE ⛉ CALIBRE MANUFACTURE ⛉" twice (tops outward, clockwise seen from the
   back, "TUDOR GENEVE" centred at 12 and 6 in back view → mirror x); engraved circle r 11.05; straight-
   brushed centre disc; inner face at `z.casebackInner` (rotor clearance is checked).
8. Case-back face between the lugs: "79470" at 12, the serial at 6 (sans caps 0.8, radial).
9. Bracelet: three rows, solid links; centre link 8.7 wide throughout; outer links STEPPED (brushed flat →
   0.35 polished step down 0.25 → 0.55 rounded polished rail); side faces = polished stadium rim round a
   recessed panel with TWO domed polished faux-rivet heads per outer-link side (1.5 from each end, Ø1.4,
   0.3 proud); centre-link joints lead the outer joints by 3.5; widths 20 (end link) → 19.2 → 17.3 → 15.7;
   solid end links hugging the case (r 19.5), "72540"/"RP11" inside. Two halves hang from the spring bars
   and curve down (−10° → −38°, like the 139's strap): 6 links at 12, 4 links + clasp at 6. Instance or
   merge (≤250 k triangles, one mesh per material).
10. Clasp: T-fit folding clasp 17.6 × 35.9 × 4.2, brushed cover with polished bevels, the polished raised
    Tudor shield lift tab at the opening end.

## 3B. dial.js, hands.js, automatic.js — builder B

### dial.js (`dial`, lite)
Registers: `dial` (domed opaline dial + all prints), `indices` (8 circles, 2 bars, 12 o'clock triangle),
`date-window` (the bevelled cut-out frame), `dial-feet`, `date-disc` (`drive: { key: 'date' }`).

SPEC: `dial`, `date.disc`, `z` (dialTopEdge, dialSeat, dateDisc), `colours`, `explode`.

Images: off_feat_dial.png (5259² official macro — THE dial reference; leadtudor/feat_dial_small.jpg is a
1600² copy), press_M79470-0004_FF_RGB.png, work-tudor/ff_markers.png, ff_date.png, ff_logo.png,
ff_text_low.png, ff_swiss.png, overlay_zoom.png, ethos-multiple-9.jpg (lume glow), blog b03.jpg/b22.jpg
(the real date disc: sequence, orientation, internal teeth).

What makes it right:
1. DOMED dial: top(r) = dialTopEdge + 0.30·(1 − (r/14.3)²), a 0.40 shell; prints and marker bases follow
   the dome (≥192 segments; prints on the dial texture or a conformal overlay — never a flat decal).
2. Opaline #E8E9E8, faint metallic, fine grain (clone M.dialBase; `dial.material`).
3. Applied monobloc-ceramic markers: BLACK rim (0.185–0.19) round a slightly domed white LUME cap, 0.55 tall.
   Circles Ø2.05 (lume Ø1.68) at r 10.90; bars 3.70 × 1.28 at 6 and 9; triangle at 12 (0.24 apex fillet,
   0.15 top fillets). Two merged meshes (rim, lume). Lume #ECEDEA; at most a faint #00C27E emissive.
4. Minute track (#111): circle r 13.62 (0.12), minute ticks 0.11 (r 12.59–13.62), 5-minute bars 0.50,
   SHORTENED to r 13.28–13.62 at 12/3/6/9 and for the ticks beside the triangle (6°, 354°) and the date
   window (84°, 96°); no inner rail.
5. Texts centred on x = 0 in their measured boxes: shield logo (outlined, crenellated top with two square
   windows, pointed base), TUDOR serif wordmark (letter boxes given), GENEVE (condensed grotesque, no
   accent), "200m:660ft" (bold digits, italic lowercase m/ft), CHRONOMETER / OFFICIALLY CERTIFIED (0.55 caps),
   SWISS · MADE on the arc at 6 (tops toward the centre, split by the 6 o'clock tick). Nothing else.
6. Date window at 3: 2.76 × 2.10 opening at (11.13, −0.02), 0.08 corners, a WHITE 45° bevel 0.40 wide cut
   into the dial (outer 3.55 × 2.90), top/left faces lit, bottom/right shaded — geometry, not texture.
7. Date disc: white ring (#F0F0EE, `date.disc` radii, 0.15 thick at `z.dateDisc`) with 31 black grotesque
   numerals (height 1.64) centred on r 11.13; numerals increase COUNTER-clockwise round the disc, each
   upright along the CCW tangent; numeral k at local clock angle `windowDeg − (k−1)·stepDeg`; 31 internal
   V-teeth at `toothDeg0 + j·stepDeg` (shared with C's jumper). `drive: { key: 'date' }` (sign +1): the disc
   turns CLOCKWISE and the next date enters the window from ABOVE — today's date must show.
8. Dial feet: two (EST positions 60°/240°, r 13.3 — away from the date window), into the calendar plate.

### hands.js (`hands`, lite)
Registers: `hour-hand` (drive `hourHand`), `gmt-hand` (`hand24`), `minute-hand` (`minuteHand`),
`seconds-hand` (`secondHand`). SPEC: `hands`, `z` (hand levels, pipe tops), `pipes`.
Images: off_feat_dial.png (hub stack, frames, matte texture), work-tudor/hand_*.png, macro_hub.png,
hubcrop.png, overlay_zoom.png.
1. Matte, finely textured BLACK bodies (the "black outline" is the hand) with white lume inlaid flush and
   slightly domed; the GMT hand is YELLOW lacquer #DDA800 (semi-gloss) with a white lume square. Body and lume
   are separate meshes; the collets are black lathes.
2. Outlines are measured — use `hands.*.outline` / `lumeOutline` as given: Snowflake hour hand (45° diamond
   on a 1.13 stem continuing to a SQUARE end at 9.16), minute baton with a 25° pointed tip at 13.60, GMT
   needle with the yellow diamond frame round the lume square, ending blunt at 14.12 just past the minute
   circle, seconds needle with the lume diamond lollipop and a plain black counterweight bar to −4.45.
3. Stack from the dial: hour (collet Ø3.0) → GMT (Ø2.6) → minute (Ø2.3) → seconds boss (Ø1.9) + polished
   pin Ø0.22. Blade bottoms `z.*Hand`; bores `hands.*.bore` sit on C's pipes (`pipes`, `z.*PipeTop`).
4. 0.02 bevels on the blade edges; label anchors follow the blade (139 `followBlade`).
5. Live: hour "local h:mm", GMT "home hh:mm (24 h)", minute, seconds (8 steps/s). Facts mention the jumping
   local hour (1-hour steps without stopping the watch; the date follows it).

### automatic.js (`automatic`) — movement.md §4, §6.5 (folded in)
Registers: `rotor` (drive `rotor`), `rotor-bearing` (gilt rotor post + inner race fixed; balls, outer race and
the 60-tooth rotor gear turn with `rot.rotor`), `reversing-wheels` (wheels A and B + B's 8-leaf pinion),
`winding-train` (the gilt reduction wheel 64 + its 20-leaf pinion). SPEC: `rotor`, `automatic`, `autoTrain`
(counts + `autoTrain.ratios`), `modules.autoA/autoB/keyless`, `layout` (center, reverserA, reverserB,
reductionWheel, barrel), `z` (rotor, rotorWeb, rotorHub, rotorSkirt, rotorBearing, autoWheels, reverserBPinion,
reductionWheel, reductionPinion, trainBridge for the post's foot), `meshes` (the four automatic pairs).
Images: mov_derived_rotor_local_60pxmm.png + mov_derived_rotor_local_overlay.png (rotor geometry, heavy axis
+x), mov_derived_backview_render_60pxmm.png (render pose: heavy axis to back-view 22° = `rotor.renderPoseRotDeg`
248), mov_pw2018_mt5652.jpg, mov_vf_t*.jpg (video frames, rotor in several positions), blog b01/b21 (rotor and
automatic bridge), mov_derived_backview_static_rotorless_60pxmm.png (what the windows show).
1. COSC MT5652 rotor, NOT the MT5652-U (no three straight slots, no "MASTER CHRONOMETER"): an openworked
   HALF-DISC r 15.8 with a straight edge through the centre and a full hub boss r 4.4. Satin, radially brushed
   web r 4.4–12.6, a thin dark groove at 12.6 (w 0.12), satin inner rim ring 12.6–13.8, then the DARK
   sand-blasted heavy band 13.8–15.8 (`rotor.finish`). The band's back face is 0.07 proud of the web; over the
   flange (r ≥ `rotor.skirtInner` 14.2) it hangs toward the movement to `z.rotorSkirt[1]` (1.07 thick).
   Material is unpublished for this calibre: no "tungsten"/"ceramic" in labels or facts.
2. Four kidney openings `rotor.windows` (R1/R2/L1/L2, mirror pairs about the heavy axis) are already in your
   frame: heavy side = LOCAL −Y (kinematics: at rot 0 it hangs to 6 o'clock). The check computes the
   centroid (0.10, −7.69).
3. Raised, polished serif "TUDOR" (cap 1.1) on the web at r 11.05, centred on the heavy axis (local clock
   180°, span 44°), letter tops toward the hub, reading correctly FROM THE BACK (`rotor.text`).
4. Ball bearing (`rotor.bearing`): races r 1.3/2.4/3.0/3.4, ten balls Ø0.45 on r 1.9, central screw; the gilt
   post r 1.0 stands on the train bridge (top `z.trainBridge[0]`). The rotor gear (60, tip
   `rotor.gearTipRadius`) sits under the hub at `z.autoWheels`, just above the train bridge.
5. Drives (`autoTrain.ratios`, no allocation per frame): rotor gear = `rot.rotor`; wheel A =
   −2·`rot.rotor`, wheel B = +2·`rot.rotor` (they swing both ways); B's pinion = +22·`rot.ratchet`, reduction
   wheel = −2.75·`rot.ratchet` (one-way, they also turn when the crown winds, as on the real watch). The
   kinematics' `ratchetPerRotorRad` is exactly 1/11 = this train, so the meshes stay consistent.
6. Wheels A/B lie under the automatic bridge in its underside sinks (`frame.automaticBridge.sinks`); B's
   pinion and the reduction wheel one level lower (`z.reverserBPinion`, `z.reductionWheel`); the reduction
   pinion reaches down to the ratchet (`z.reductionPinion`). Gilt reduction wheel, steel reversers (5 spokes,
   visible click springs on their faces).
## 3C. train.js, dialworks.js — builder C (movement.md folded in)

### train.js (`train`)
Registers: `barrel` (drum + 105 teeth on its back rim, drive `barrel`), `mainspring` (geometry from
`state.reserve`, drive `barrel`), `barrel-arbor` (drive `ratchet`), `barrel-cover` (drive `barrel`), `center-wheel`
(90 + 14-leaf pinion, drive `center`), `third-wheel` (96 / 9), `fourth-wheel` (120 / 16, the centre-seconds wheel
with its long arbor), `ratchet-wheel` (55, + screw, drive `ratchet`), `crown-wheel` (40, + left-hand screw, drive
`crownWheel`), `winding-intermediate` (18, `rot.crownWheel × autoTrain.ratios.windingIntermediatePerCrownWheel`),
`click`, `click-spring`.

SPEC: `layout` (barrel, center, third, fourth, crownWheel, windingIntermediate, click), `train`, `keyless`,
`modules`, `meshes`, `sameModule`, `z` (mainPlate, barrelPocketFloor, barrel, barrelTeeth, barrelLid, pinionOf.*,
centerWheel, fourthWheel, thirdWheel, ratchetWheel, crownWheel, windingIntermediate, click, secondsArborTop),
`pipes.secondsArbor`, `explode`.

Images: blog b13/b14/b15/b16 (train and centre wheel in place), b33/b34/b36 (loose wheels: escape, third, barrel,
centre), b29 (ratchet gilt, square hole; crown wheel steel), b11 (keyless on the barrel bridge),
mov_derived_rotoroff_photo_backview_60pxmm.png (rotor off, registered to SPEC's frame: 60 px/mm, centre
(990, 990)), movement.md §5.

What makes it right:
1. DIRECT centre seconds (Rolex-3135-like): the centre wheel (gilt, 6 spokes, hollow pipe) turns at the centre
   lowest of the central wheels, its 14-leaf pinion meshing the barrel's teeth just above the plate; the
   steel strap bridge (D) holds it; the fourth wheel sits concentrically above that bridge, its 16-leaf pinion
   above it meshing the third wheel, and its long thin arbor (r `pipes.secondsArbor`) runs down through the
   hollow centre arbor and the cannon pinion to `z.secondsArborTop` (the seconds hand's seat).
2. The third wheel (5 spokes) is ABOVE the fourth wheel, its 9-leaf pinion down at the centre wheel's level:
   the pinion clears the fourth wheel's tips by 0.05 (checked) — that is why the counts differ from the
   report's 12/96/12/8 (same periods).
3. The barrel (Ø13.9, steel-grey drum) sinks into a deep pocket of the 2.0 mm main plate; teeth and cover at its
   back end (`z.barrelTeeth`, `z.barrelLid`), 1 turn / 7.5 h, 9.33 turns of reserve.
4. Keyless on the barrel bridge: gilt ratchet (55) with a polished screw, steel crown wheel (40) with its
   screw, the small steel winding intermediate (18) and the click (pawl + spring at `layout.click`), all at
   `z.ratchetWheel`; the gilt reduction pinion (B) also meshes the ratchet. The intermediate's drive from the
   winding pinion (contrate, on the stem in the plate) is schematic: run its arbor down to the plate.
5. Every pair interleaves with `gear.meshPhase` (`SPEC.meshes`). Mainspring: let-down vs. wound coils follow
   `state.reserve` like the 139 (rebuild only when the reserve changes by >0.3 %). Click and spring:
   contact-exact like the 139 (LUT of the click angle against the ratchet phase).

### dialworks.js (`dialworks`)
Registers: `cannon-pinion` (drive `cannon`), `minute-wheel` (`minuteWheel`), `gmt-wheel` (24-hour wheel + pipe,
`hand24`), `gmt-wheels` (GMT idler, `gmtIdler`), `hour-wheel-driver` (36 + 30, `hourWheel`), `hour-jumper` (spring
screwed on the driver, `hourWheel`), `hour-wheel` (LOCAL hour wheel 36 with its 12-point star, its hub down inside
the driver and the hour pipe, `hourWheel`), `date-wheels` (date driver 72 + cam, `dateDriver`),
`instant-date-lever` (+ its long curled wire spring), `date-jumper`, `calendar-plate`, `date-disc-guards`,
`winding-stem`, `sliding-pinion`, `winding-pinion` (all three `rotation.x = rot.stem` in update), `setting-lever`,
`yoke`, `setting-wheel` (+ the position-C pair at `layout.hourSettingWheel` / `settingIntermediate`,
schematic), `keyless-springs`, `stop-seconds-lever` (hacking lever; its finger reaches the balance rim through
the plate, at rest).

SPEC: `layout` (center, minuteWheel, settingWheel, gmtIdler, dateDriver, hourSettingWheel,
settingIntermediate), `train` (cannon, minuteWheel, hourWheel), `gmt` (incl. `star`), `dateTrain` (driver, cam,
lever), `date.disc` (jumperDeg 300, toothDeg0 — frozen), `keyless` (stemY, stemInnerX, slidingPinionX,
windingPinionX), `modules`, `meshes`, `sameModule`, `arbors`, `pipes`, `z` (motionRecess … dateGuards, hourHub,
stemAxis), `case.crown.stemEnd`, `explode`.

Images: blog b03–b09 (dial side, step by step), b17–b20 (keyless), b22 (date disc + guards: 31 internal V-teeth,
numerals increasing CCW), b24 (calendar plate), b25/b26 (GMT and date wheels; a steel wheel with a lever = the
driver with its jumper), dial_sheet.jpg, reg/b06_px.png, movement.md §6.

What makes it right:
1. The stack from the plate up (SPEC.z), re-ordered by the lead so the GMT coupling is mechanically coherent:
   cannon leaves and minute wheel 40 (+ setting wheel 15) in the plate's dial-side recesses → 24-hour wheel 30
   (pipe to `z.gmtPipeTop`) ← GMT idler pinion 15; idler wheel 30 ← the driver's 30 → the driver's 36 ← minute
   pinion 10 (it climbs past the 24-hour wheel's tips, 0.18 clear) → hour jumper on the driver's face + the
   12-point star under the local hour wheel → local hour wheel 36 (hub down inside the driver's bore, pipe up to
   `z.hourPipeTop`) → date driver 72 (meshes the LOCAL hour wheel: the date follows the jumping hour) with its
   cam → full-diameter calendar plate → on it, inside the disc (r < 9.2) at the disc's level: date jumper (beak
   at `date.disc.jumperDeg` 300°, in a gap of the disc's teeth at rot.date = 0) and the instant-date lever
   (`dateTrain.lever`, finger at 286°) with its long curled wire spring (upper left, as in b04–b07) → date disc
   (built by B) → three keyhole guards on the disc's inner edge.
2. Normal running: driver, jumper and local hour wheel turn together (`rot.hourWheel`), a star GAP facing the
   jumper beak at `gmt.star.jumperDeg` when rot = 0. Model the spring arm and beak faithfully.
3. Instantaneous date: the driver turns once a day (`rot.dateDriver` = 0 at local midnight); its cam loads the
   lever over the evening and the lever snaps the disc at midnight, when the kinematics jump `rot.date` (1.2 s).
4. Pipes nest exactly (SPEC.pipes): seconds arbor < cannon < 24-hour < hour; the hands' bores are 0.01 over.
5. Keyless at 3 o'clock: stem on y = `keyless.stemY`, z = `z.stemAxis`, from `keyless.stemInnerX` to its thread
   inside the crown at x = `case.crown.stemEnd`; sliding and winding pinions in the plate's stem channel; the
   setting wheel meshes the minute wheel (pos. D); setting lever, yoke and springs in the plate's dial-side
   recess at `z.keylessLevers`.
6. All of this is hidden under the dial: keep it light (≤ 60 k triangles for dialworks).

## 3D. escapement.js, frame.js — builder D (movement.md folded in)

### escapement.js (`escapement`)
Registers: `escape-wheel` (drive `escape` + solved impulse profile), `pallet-fork` (`fork`), `balance-wheel`
(`balance`; incl. the four inertia screws), `roller` (`balance`), `hairspring`, `balance-bridge` (the TRAVERSING
bridge with its two screws and the hairspring stud carrier), `shock-absorber`.

SPEC: `escapement` (palletToEscape 3.230, palletToBalance 3.081, escapeTipRadius 2.75, stoneHalfAngleDeg 26,
entryContact, exitContact, rollerJewelRadius, rollerRadius, balance, hairspring, escapeWheel, palletFork, shock),
`timing` (amplitude 285, lift 52, fork ±7), `layout` (escape, pallet, balance), `frame.balanceBridge` (outline,
footRadius, capRadius, screws), `z` (escapeWheel, pinionOf.escape, palletFork, roller, balanceRim, balanceArms,
inertiaScrews, hairspring, balanceBridge, balanceBridgeFeet, shockTop), `explode`.

Images: blog b28 (balance with inertia screws, bridge, hairspring), b33 (escape wheel: 20 club teeth, 4 spokes;
pallet fork), mov_derived_backview_render_60pxmm.png + _static_rotorless (balance under its bridge),
mov_derived_rotoroff_photo_backview_60pxmm.png, mov_pw2018_mt5652.jpg, movement.md §5.4.

What makes it right:
1. SOLVE the lever escapement exactly like the 139 (tooth/stone outlines → wheel progress table per beat; stones
   never pass through teeth at `.slow`): 20 club teeth (tip r 2.75), the line of centres bent 18.6° (escape →
   pallet → balance), stones touching the tip circle at ±26° (`entryContact` is the stone the teeth reach first;
   the wheel turns CCW seen from the dial), lift 52°, bankings ±7°, impulse pin at `rollerJewelRadius` 0.654.
2. Gold-coloured variable-inertia balance r 4.87 (rim 0.30 × 0.50), FOUR arms in an X on the case-back side of
   the rim, four slotted inertia screws on the OUTSIDE of the rim at the arm ends (protrude 0.30); FREE-SPRUNG —
   no regulator index.
3. Flat SILICON hairspring (dark blue-grey, ≈14 coils, r 0.5–2.6, no overcoil), outer end in a stud carrier
   under the balance bridge; it breathes with `state.balance`.
4. TRAVERSING balance bridge (two-point fixation): sand-blasted arch at `z.balanceBridge` over the balance, its
   two feet (r ≥ `frame.balanceBridge.footRadius` 13.4) step down to the flange level and stand on the plate
   (`z.balanceBridgeFeet`), one polished screw each (head 0.05 proud); the Incabloc-type shock setting (pink cap
   jewel under a lyre spring) in the middle, top `z.shockTop`.
5. Steel escape wheel (4 spokes, wheel BELOW its pinion); steel pallet fork with two pink stones and a guard dart.

### frame.js (`frame`)
Registers: `main-plate`, `automatic-bridge`, `barrel-bridge` (with its laser-striped rim = the outer flange),
`train-bridge`, `center-wheel-bridge`, `pallet-bridge`, `jewels` (the jewels set in the main plate; jewels set
in a bridge are drawn by that bridge's part so they leave with it — 28 in all), `plate-screws` (every bridge
screw except the balance bridge's two), `plate-engravings` (the plate's own marks, if any; bridge engravings
belong to their bridge).

SPEC: `movement` (finishes, variant), `frame` (plateRadius, balanceOpening, automaticBridge {outline, textBand,
sinks}, trainBridge {outline, lobes, windows, textBand}, barrelBridge {outline, plus, minus}, flange {rInner,
rOuter, undercut}, palletBridge, centerWheelBridge, screws (+ which part holds each), screwHeadRadius,
jewelsVisible, engravings), `layout`, `z` (mainPlate, barrelPocketFloor, motionRecess, barrelBridge, flange,
trainBridge, automaticBridge, automaticBridgeSink, centerWheelBridge, palletBridge, screwHeadTop), `explode`.

Images: mov_derived_rotoroff_photo_backview_60pxmm.png (+ _grid; bridges, jewels, screws — trace on it),
mov_derived_backview_static_rotorless_60pxmm.png, mov_derived_backview_render_60pxmm.png, blog b02, b10–b16
(bridges on/off), b30–b32 (bridges loose), b14 (main plate: barrel pocket, centre-wheel strap), movement.md §3.

What makes it right:
1. Outlines from SPEC (measured ±0.5): the AUTOMATIC bridge covers 8 → 1 o'clock seen from the back with the
   raised text band r 11.2–14.1 (groove at 11.2) engraved serif "TUDOR" (arc r 12.6) and "GENEVA" /
   "SWITZERLAND" (two small lines at 9 o'clock, back view); the TRAIN bridge covers 1 → 5 o'clock from the back,
   crosses the centre (the gilt rotor post sits on it) and reaches the escape jewel, engraved "MT5652
   TWENTY-EIGHT 28 JEWELS" along r 12.9 — its two windows show the gilt third-wheel rim and central-wheel
   teeth; the BARREL bridge is hidden under the automatic bridge; its rim is the outer FLANGE r 14.1–15.9 (laser
   radial "sun" stripes, undercut over the barrel's teeth) round the whole movement except the balance opening and
   the balance-bridge feet. Use the COSC texts, never the MT5652-U "MASTER CHRONOMETER" text.
2. Sand-blasted grey bridges (`movement.finishes.bridges`) with polished bevels, laser stripes only on the flange
   and the text bands, grooved separations; slotted polished steel screws (not blued), countersunk flush except
   the balance bridge's; PURPLE jewels.
3. Main plate 2.0 thick (`z.mainPlate`): deep barrel pocket, dial-side recesses (cannon, minute and setting
   wheels, keyless levers), stem channel; sand-blasted grey on both faces.
4. The centre-wheel bridge is a steel strap across the centre (`frame.centerWheelBridge`) with a jewel in the
   middle and a screw at each end; the pallet bridge is small and polished.
5. Bridges stand on the plate: the flange and the balance-bridge feet go down to it; any other foot or pillar
   only where SPEC.z leaves room (outside every wheel's swept circle) — the check does not see those.
## 4. Kinematics — what drives what

`createKinematics(SPEC)` reads `timing` (28,800 A/h lever: amplitude 285°, lift 52°, fork ±7°, all ESTIMATE), `train`
(barrel/centre/third/fourth/escape + cannon/minute wheel/hour wheel), `arbors` (extra time-driven arbors),
`keyless` (hand winding), `automatic` (rotor pendulum + winding rates), `gmtOffsetHours` (0: the 24-hour
hand shows local time — "home" is where the wallpaper runs; jumping the local hour is a crown function the
replica does not need), `powerReserveHours` 70, `barrelTurns`, `centralSecondsKey` ('fourth': the seconds
hand is computed from time, stepped 8×/s — identical to the fourth wheel, which carries it directly), `id`.
Date: the default instantaneous jump (1.2 s) at local midnight — the MT5652's date is instantaneous and
follows the local hour hand.

| state.rot key | Turns | Parts |
|---|---|---|
| `barrel` (+1, CCW seen from the dial) | 1 / barrel period | barrel drum, barrel cover, mainspring (coils from `state.reserve`) |
| `ratchet` | only while winding (crown or rotor) | barrel arbor, ratchet wheel (+ screw); × `autoTrain.ratios` for the reduction wheel (−2.75) and B's pinion (+22) |
| `crownWheel` | while hand-winding | crown wheel; winding intermediate × `autoTrain.ratios.windingIntermediatePerCrownWheel` (−40/18) |
| `stem` (rotation.x) | while hand-winding | winding stem, sliding pinion, winding pinion, crown |
| `center` (−1) | 1 / h | centre wheel (+ centre pinion) |
| `third` (+1) | | third wheel |
| `fourth` (−1) | 1 / min | fourth wheel = centre-seconds wheel (≡ `secondHand`) |
| `escape` (+1) | 2·20 beats = 5 s | escape wheel (teeth follow a solved impulse profile in the impulse window, as in the 139) |
| `fork` | ±forkHalf | pallet fork |
| `balance` | ±amplitude at 4 Hz | balance wheel, roller; hairspring breathes with `state.balance` |
| `cannon` (−1) | 1 / h | cannon pinion |
| `minuteWheel` (+1) | | minute wheel |
| `hourWheel` (−1) | 1 / 12 h | hour-wheel driver, hour jumper (on the driver), local hour wheel (normal running: they turn together) |
| `hourHand`, `minuteHand`, `secondHand`, `hand24` | | the four hands |
| `hand24` (−1) | 1 / 24 h | 24-hour wheel (`gmt-wheel`) and the GMT hand — nothing else drives them |
| `date` (CW, −2π·datePos/31) | jump at local midnight | date disc |
| `arbors.*` (period, dir from SPEC) | | GMT idler (`gmtIdler`, 12 h, CCW), date driver (`dateDriver`, 24 h, CCW; its cam releases the instant-date lever at local midnight) |
| `rotor` | pendulum, heavy sector local −Y | rotor, rotor-bearing outer race + rotor gear |
| update(): `rot.rotor × ratio` | reverses with the rotor | reversing wheels A (−2) and B (+2) |
| update(): `rot.ratchet × ratio` | one-way | B's pinion, reduction wheel (`ratchetPerRotorRad` = 1/11 = the drawn train) |
| update(): `state.windAngle` | contact table | click, click spring |

Mesh phases: wheels keep local phase 0, mates get `gear.meshPhase(φ, zA, zB, phaseA)`; every pair in
`SPEC.meshes` lists positions, counts, module and the z band of each toothing. All arbors are at angle 0 at
local midnight (P counts beats from 1970-01-01 local), which is what makes a constant mesh phase valid; with
`gmtOffsetHours` ≠ 0 the 24-hour wheel's phase must include the offset.

## 5. Explode choreography

`SPEC.explode` (mm) and `SPEC.explodeDelay(id)`. Dial side +Z, movement side −Z, in assembly order; any part
that overlaps another in plan moves further than the parts under it; ≥2.5 mm between neighbours (≥4 round
plates). The case lifts high (crystal 62 > bezel 56 > flange 50 > middle case 44) so the Ø39 middle case
never hides the dial stack from the oblique exploded camera (azimuth 64°, elevation 16°). The crown (23.5)
and stem (20) leave first along +X — the stem's inner end is out of the case wall before the case lifts
(delay 0.82). Hands 0.84–0.855, dial 0.87, date disc 0.88, then the dial-side works top-down (0.875–0.95):
guards 26.5, jumper and instant-date lever 20.5, calendar plate 18, date driver 15, local hour wheel 13.5,
jumper 12, driver 10.5, idler 9, 24-hour wheel 7.5, minute wheel 6, cannon 4.5 (keyless 1.6–7.5).
Movement side, farthest first (default delay 1 − |offset|/90): rotor −66, rotor bearing −62, plate screws
−60, automatic bridge −57, reversing wheels −54, winding train −51, shock absorber −50, balance bridge −48,
train bridge −45, hairspring −44, balance + roller −41, ratchet / crown wheel / intermediate / click −39,
third −36, fourth −33 (its long arbor slides out through the hollow centre), pallet bridge −30, escape wheel
−27, pallet fork −25, barrel bridge (with its flange ring) −22, centre-wheel bridge −19, centre wheel −16,
barrel cover −13, arbor −11, mainspring −9, barrel −6.5; plate and its jewels stay. The solid case back (−86)
and the bracelet/clasp are faded out by the UI. `check.mjs` sweeps the animation (48 steps): no part passes
through another and every contact separates.

## 6. Open risks

1. Heights inside the movement are engineering estimates within the official 7.52 mm (dial-side works 1.92
   above the plate, back side 5.60). The report's own stack (dial seat 2.00, plate 1.2, stem −0.60) was refitted
   to the frozen exterior (dial seat 1.92, stem −0.98 → plate 2.0 thick, rotor −5.60); back-side levels below the
   automatic bridge are the report's. Report any visible conflict (SPEC-REQUEST); don't move levels.
2. Only the escape wheel (20) is a confident count; centre/third/barrel/ratchet/crown wheel are photo counts
   (±); the fourth wheel, all pinions and every dial-side / automatic count are ESTIMATE, chosen to fit the
   measured centre distances (m = 2d/(z1+z2)) and the periods. Lead changes: third pinion 9 and fourth 120/16
   with a 10-leaf escape pinion (assembly clearance); minute wheel, date driver mirrored and the GMT idler at
   r 2.95 (dial-side coherence); the GMT coupling re-stacked (driver above the 24-hour wheel, jumper on it).
3. The automatic ratio 1/11 is the drawn train's (≈103 rotor turns to full); the real reduction is probably
   1:50–1:100 through hidden stages (the 4th automatic jewel is unassigned). Only the winding speed differs.
4. Bridge outlines ±0.5 (balance-bridge feet ±0.7); the barrel bridge, the dial-side layout, the keyless
   intermediate's contrate drive, the instant-date lever and the stop-seconds lever are schematic.
5. Hidden dial-side parts are only seen exploded — keep them light.
6. Fonts: only Jost and JetBrains Mono are embedded. Bezel numerals, shield, rose and TUDOR wordmarks are vector
   outlines; small prints may use canvas text (Arial/Helvetica → Jost fallback) fitted to the measured boxes.
7. Lite: four watches share the box — case+dial+hands ≤ ~250 k triangles in lite.
8. Variant pitfall: the 2025 press kit pictures the MT5652-U (three-slot tungsten rotor, "MASTER CHRONOMETER").
   Build the COSC MT5652: four-kidney rotor, "TUDOR" / "GENEVA SWITZERLAND" on the automatic bridge, "MT5652
   TWENTY-EIGHT 28 JEWELS" on the train bridge. Rotor material and bearing type are unpublished — don't claim
   tungsten or ceramic in labels or facts.

## 7. Done means

- `node build.mjs --solo tudor-m79470:<your builders>` builds with no console errors (and `?lite` for case,
  dial, hands); the solo overlay lists every id of your module (§1) with sensible category/side/exposed.
- `node research/tudor-m79470/check.mjs` still PASSES.
- Compare against the references in your own tab (close it when done):
  A `#front` over press_M79470-0004_FF_RGB.png, `#side` against mono_polar_6.jpg, `#back` against
  mono_polar_8.jpg; B `#front` against off_feat_dial.png (today's date in the window), rotor at `#back` over
  mov_derived_backview_render_60pxmm.png with `rot.z = rotor.renderPoseRotDeg`, swinging with
  `__solo.ctx.kin.setGravity(1, 0)`; C `#back.xray.slow` (every pair interleaves, GMT hand = 24-hour wheel,
  date jumps at midnight with `__solo.timeScale(3600)`); D `#focus-balance-wheel.back.slow` (stones never pass
  through teeth, the fork banks, the hairspring breathes) and `#back` with the rotor hidden over
  mov_derived_rotoroff_photo_backview_60pxmm.png (bridges, screws, jewels, engravings).
- Triangle budget from §1 (the solo overlay prints the count).
