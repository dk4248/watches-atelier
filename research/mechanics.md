RESEARCH REPORT: engineering data for animating a NOMOS hand-wound, small-seconds 3 Hz movement (Tangente ref. 139 / DUW 4001)

Confidence tags: [H] high, [M] medium, [L] low. "ESTIMATE" means the value is not sourced: it is my engineering estimate and the reasoning is given. "ETA-derived" means I measured it from ETA's own vector drawings of the ETA 7001, which is the ancestor architecture (method in section 11).

================================================================
0. IDENTITY CHECK (short; this is not my focus)
================================================================
- The official NOMOS page for Tangente ref. 139 currently lists caliber DUW 4001: 35.0 mm case, 6.6 mm high, 45.0 mm lug-to-lug, 10½''' (23.3 mm) movement, 2.6 mm movement height, 17 jewels, up to 53 h power reserve, NOMOS swing system, DUW regulation system. [H] https://nomos-glashuette.com/en/tangente/tangente-139
- Conflict: retailers (Wempe and others) still describe ref. 139 with the older Alpha caliber (43 h). So the user's "DUW 4001" is correct for current production, and older 139s carry the Alpha. [M] https://www.wempe.com/en-us/watches/nomos-glashuette/tangente/tangente-139
- DUW 4001 official features: stop seconds, "Glashütte stopwork", three-quarter plate, blued balance spring, swing system, adjusted in 6 positions, ratchet and crown wheel with sunburst finish. [H] https://nomos-glashuette.com/en/caliber/duw-4001-duw-4001
- "Glashütte stopwork" is a mistranslation. The German page says "Glashütter Gesperr", which is the Glashütte click (pawl) and ratchet system, not a Maltese-cross stopwork. Do not model a Geneva stop. [H] https://nomos-glashuette.com/de/caliber/duw-4001-duw-4001
- Frequency of DUW 4001 is 21,600 A/h (3 Hz). NOMOS's own page does not state it. [M] https://mrstateless.com/everything-you-need-to-know-about-the-new-nomos-tetra-origins-collection/ (it also says DUW 4001 is "based on the architecture of the classic Peseux 7001", and gives 43 h, which conflicts with NOMOS's 53 h).
- Lineage: the Alpha family is "based closely on the classic Peseux 7001", with different plates and bridges (three-quarter plate). In hand-wound models the balance sits "just past 3:00, viewed from the back with the winding stem at 9:00 ... the same as the Peseux movement". Swing-system DUW calibers replaced the Alpha family from 2014. [M] https://reference.grail-watch.com/family/nomos-alpha/
- NOMOS publishes no gear-train data. Everything below about the train comes either from the ETA 7001 or from generic Swiss practice, and is labelled that way.

================================================================
1. PRIMARY ANCESTOR DATA: ETA 7001 Technical Communication (ETA's own PDFs)
================================================================
Sources:
- ETA CT 7001, version dated 13.08.2026: https://portal.eta.ch/fr/technicaldocuments/index/pdf/id/2157 (redirected from https://shopb2b.eta.ch/technicaldocuments/index/pdf/id/2157)
- ETA CT 7001 "ETACHRON", dated 25.11.2011: https://www.watch-spare.com/amfile/file/download/file/98/product/12321

Stated values:
- Ø 23.30 mm. Movement height 2.50 mm. 17 jewels. 21,600 A/h (3 Hz). [H]
- Lift angle of balance: 50° (both versions; the 2026 version calls it "typical"). [H]
- Power reserve: 42 h (2011). The 2026 version gives 52 h minimum and 57 h typical; its change log reads "42 h/45 h --> 52 h/57 h". [H]
- Winding stem "S0.90", i.e. a 0.90 mm stem. Two crown positions: wind, and set without stop seconds. The 7001 does not hack; the NOMOS caliber does. [H]
- Hand fittings (2011 drawing, sheet Z0091272): hour hand Ø1.30 mm, minute hand Ø0.80 mm, centre arbor Ø0.40 mm inside the cannon pinion, seconds hand Ø0.17 mm with 3% conical seat. [H]
- Hand heights above dial seat, "normal" variant: cannon-pinion top 1.19 mm, hour-wheel top 0.89 mm, seconds pivot 0.40 mm. Part lengths: cannon pinion 1.80 mm, hour wheel 1.10 mm, seconds pinion 2.77 mm. [H]
- Parts list (useful for labelling): main plate; sliding pinion; winding pinion; winding stem; setting lever; yoke; yoke spring; setting wheel; minute wheel; setting-lever jumper; escape wheel; second wheel; third wheel; centre wheel; train-wheel bridge; barrel complete; barrel bridge; crown wheel; crown-wheel core; click; click spring; ratchet wheel; pallet fork; pallet bridge; balance with stud; balance bridge (regulator, stud support, Incabloc); driver cannon pinion; hour wheel. [H]
- Fitting torques in the CT: screws 0.6–0.7 N·cm, pallet-bridge screw 0.25 N·cm. [H]

Lift-angle conflict: some sources list the Peseux 7001 at 52°, versus ETA's 50°.
- https://watchguy.co.uk/?p=10455
- https://www.watchprosite.com/horological-meandering/i-believe-it-is-52/17.1391636.12525011/
- Caliber Corner lists the 7001 at 50°: https://calibercorner.com/eta-caliber-7001/
- No published lift angle exists for NOMOS Alpha or DUW 4001 (unknown). Recommendation: use 50°. [M]

================================================================
2. GOING TRAIN: TOOTH COUNTS, RATES, DIRECTIONS
================================================================
A) ETA 7001 counts (ETA-derived, read from ETA's CAD drawings, parts sheet p.5 of both PDFs) [M for the 7001; L for NOMOS]
- Barrel: 126 teeth (identical count in the 2011 and 2026 drawings).
- Centre (minute) wheel: 120 teeth.
- Third wheel: 112 teeth. Third pinion: 16 leaves.
- Fourth (second) wheel: 120 teeth. Fourth pinion: 14 leaves.
- Escape wheel: 15 teeth, counted visually; the club teeth confuse the automatic count.
- Escape pinion: 10 leaves. The drawing is not cleanly countable here; 10 is forced by the arithmetic below. [M]
- Centre pinion: not visible in the drawings, so unknown. ESTIMATE 18 leaves; the module and centre-distance fit gives 18 ±~4. This makes one barrel turn = 7 h, and 42 h = exactly 6 turns, a typical design target.

Arithmetic check (closes exactly):
- Centre 1 rev/h × 120/16 = third 7.5 rev/h (1 rev per 8 min).
- × 112/14 = fourth 60 rev/h (1 rev/min, small seconds).
- × 120/10 = escape 720 rev/h (12 rev/min, 1 rev per 5 s).
- × 15 teeth × 2 beats/tooth = 21,600 beats/h. Exact.

Geometric cross-check:
- Jewel centre-distances measured on ETA's to-scale assembled view give modules: centre/third 0.057, third/fourth 0.052, fourth/escape 0.047 mm.
- The diameter ratios these predict match the parts drawing: centre/third 1.185 predicted vs 1.18 measured; centre/fourth 1.228 vs 1.227.
- This strongly supports the counts being real CAD counts rather than decorative drawing.

B) Generic Swiss alternatives (use only if you want textbook numbers)
- Unitas/ETA 6497 example [M]: centre 80 → third pinion 10 → third 60 → fourth pinion 8 → fourth 120 → escape pinion 10 → escape 15 (21,600). http://horology-student.org/movements/modern-eta-and-clones/unitas-eta-6497-6498/
- Textbook 18,000 example: centre 80/10, fourth 70, escape pinion 7, escape 15. For 21,600 you need fourth/escape-pinion = 12 (84/7, 72/6, 96/8, 120/10). Formula: Vps = fw·ew·2/(ep·60). https://www.vintagewatchstraps.com/watchmovement2.php [M]
- A 15-tooth escape wheel is standard at 3 Hz. https://watchesbysjx.com/2024/08/geometric-efficiency-escapements.html and https://en.wikipedia.org/wiki/Lever_escapement [H]

C) Directions (follow from meshing; small-seconds and minute hands run clockwise) [H]
Seen from the DIAL side:
- Barrel CCW; centre wheel CW; third CCW; fourth/seconds CW; escape CCW.
- Motion works: cannon pinion CW (rides the centre arbor by friction); minute wheel and minute pinion CCW; hour wheel CW.
Seen from the CASEBACK, every direction reverses:
- Barrel CW, centre CCW, third CW, fourth CCW, escape CW.
Winding:
- The ratchet and barrel arbor turn in the barrel's running sense: CW seen from the back.
- The crown wheel turns opposite to the ratchet (CCW from the back).
- While running, the arbor and ratchet stand still, held by the click; only the barrel drum turns.
Escapement:
- The pallet fork and balance turn in opposite senses while the roller jewel is in the fork slot (gear-like contact).

D) Real-time sync (derived) [H]
- 6 beats/s; beat n = floor(6·t).
- Escape wheel: +12° per beat (half of the 24° pitch) = 72°/s average.
- Seconds hand: steps 1° per beat (6 steps/s).
- Third wheel: 0.75°/s. Centre wheel: 0.1°/s (1/60° per beat). Hour wheel: 1/120 °/s.
- Barrel: 360°/7 h ≈ 0.01429°/min (if centre pinion = 18; ESTIMATE).
- Drive every wheel from one master time t, as integer beat count plus an intra-beat profile. Do not integrate frame deltas.

================================================================
3. MOTION WORKS (12:1)
================================================================
ETA 7001 counts, ETA-derived [M]:
- Cannon pinion 12 leaves → minute wheel 40 teeth; minute pinion 10 leaves → hour wheel 36 teeth.
- (40/12)·(36/10) = 12.000. Exact.
- Fitted modules: hour/minute-pinion ≈ 0.136 mm; minute-wheel/cannon ≈ 0.120 mm. Both mesh at ≈3.13 mm centre distance.
Common textbook alternatives (ESTIMATE, generic): 10/30 with 8/32, or 12/36 with 10/40. Both give 12:1.
NOMOS counts: unknown.

================================================================
4. KEYLESS WORKS, CLICK, WINDING, SETTING, STOP SECONDS
================================================================
ETA 7001 counts, ETA-derived [M for the 7001; L for NOMOS, whose ratchet and crown wheel are NOMOS's own sunburst parts]:
- Winding pinion: 15 teeth.
- Crown wheel: 42 teeth.
- Ratchet wheel: 56 teeth.
- Setting wheel: 15 teeth.
- Sliding (clutch) pinion: unknown; its teeth are not visible face-on.

Winding ratio (derived):
- Ratchet turns per crown turn = (15/42)·(42/56) = 15/56 = 0.268 rev = 96.4°.
- That is 15 ratchet teeth, so 15 click "ticks" per crown revolution. One ratchet tooth = 6.43°.

Full wind:
- NOMOS: "This usually requires 20–40 turns, depending on the movement". Resistance rises noticeably at full wind; wind with the crown pushed in. [H] https://nomos-glashuette.com/en/topics/hand-wound-watches
- ESTIMATE for DUW 4001: about 28 crown turns from empty. Reasoning: 53 h ÷ 7 h/turn ≈ 7.6 arbor turns, × 56/15 ≈ 28 crown turns.

Click behaviour:
- During winding the click is lifted by each ratchet tooth and dropped by its spring. When winding stops it locks the ratchet against reverse rotation. [H]
- The Glashütte click spring is a massive, long, curved spring running along the movement edge (distinctive look), whereas the Swiss click spring is short and discreet. [H] https://www.watchtime.net/brands/bruno-soehnle/6-merkmale-glashuetter-uhrwerke
- Some clicks are designed to let the ratchet recoil slightly before locking, relaxing the spring after a full wind. [M] https://www.watchtime.net/brands/wissen/was-macht-die-sperrklinke-im-mechanischen-uhrwerk
- ESTIMATE for animation: about 2–4° (under one tooth) of back-rotation when the crown is released.

Setting (crown pulled to position 2):
- Setting lever and yoke slide the clutch pinion onto the setting wheel → minute wheel → cannon pinion, which slips on the centre arbor; the hour wheel follows. [H, generic; ETA parts list]
- ESTIMATE: sliding pinion with 12 contrate teeth gives 12/12 = 1 minute-hand revolution per crown turn.

Stop seconds (DUW 4001 has it; ETA 7001 does not):
- In the setting position a stop lever touches the balance rim. [H that the feature exists, https://nomos-glashuette.com/en/caliber/duw-4001-duw-4001; geometry ESTIMATE]

================================================================
5. SWISS LEVER ESCAPEMENT KINEMATICS (generic Swiss practice unless stated)
================================================================
Sourced values:
- Lift angle at the balance: 50° (ETA 7001, see section 1). [H for the 7001; M for NOMOS]
- Escape wheel: 15 teeth, 24° pitch, advance 12° per beat. Escape-wheel impulse angle 11° per pallet (Défossez model, 3 Hz). Derived: ~2° of total drop per 24° step, about 1° per beat. [M] https://watchesbysjx.com/2024/08/geometric-efficiency-escapements.html
- Draw angle: ~13–16° practical (Horopedia also quotes 9° as "ideal" for steel wheel on ruby). Wikipedia gives ~11–15° to the radial. [M] https://horopedia.org/swiss-lever-escapement/ and https://en.wikipedia.org/wiki/Lever_escapement
- Pallet "total lift angle" = unlocking + impulse + run to banking, generally 12–20°. [M] Horopedia (same URL).
- Escape-wheel recoil during unlocking: geometric ~0.15–0.25°, dynamic ~0.04°. [M] Horopedia.
- Phase order: rest → unlocking → impulse → drop/lock → run to banking. "The impulse phase begins before the Dead Point and ends after it." [H] Horopedia.
- Balance-to-lever lift ratio is typically 3.6:1 for a Swiss lever. [M] https://patents.google.com/patent/US8529122B2/en
- Draw holds the lever against the banking; the wheel must recoil slightly to unlock. [H] Wikipedia.

ESTIMATES for animation (consistent with the above):
- Lever (fork) total swing between bankings ≈ 13–14° (50°/3.6), i.e. rests at ±6.75° from the line of centres.
- Split: lock 1.5–2°, impulse ~10°, run to banking 0.5–1°.
- Escape wheel per beat: −0.2° recoil during unlocking, then +11° during impulse (track the fork), then +1° drop (free), then locked until the next beat. Net +12°.

Timing (3 Hz, amplitude A = 290°, lift 50° placed symmetrically, ±25° about the dead point):
- Balance angle θ(t) = A·sin(6π·t). Peak speed A·ω = 290 × 18.85 ≈ 5,466°/s.
- Roller jewel engaged for 2·asin(25/290)/18.85 ≈ 9.2 ms of each 166.7 ms beat.
- Unlocking (first ~7° of balance travel, = lock × 3.6): ≈1.3 ms, from θ = −25° to −18°.
- Impulse: ≈7.9 ms, from −18° through 0 to +25°. This matches "begins before, ends after the dead point".
- Drop: ESTIMATE 0.2–0.5 ms, effectively instantaneous.
- The rest of the beat (~157 ms) is the locked rest phase.
- The whole fork flip is shorter than one 60 fps frame (16.7 ms). Compute it analytically from t; never tween across frames.

Amplitude:
- No NOMOS-published value (unknown). Generic healthy modern watches run 260–310° fully wound, dial up. [M] https://calibercorner.com/school/amplitude/
- A single unverified NOMOS listing (Epsilon automatic) reportedly showed 291°. [L] marketplace.watchcharts.com, fetch blocked.
- ESTIMATE for a fully wound DUW 4001: 290° dial up, 250–270° vertical, ~240° near run-down.

================================================================
6. BALANCE AND HAIRSPRING (NOMOS swing system)
================================================================
Sourced:
- The swing system comprises escape wheel, pallet fork (synthetic ruby pallets fixed with shellac) and balance with "blue NOMOS balance spring and a perfectly formed end curve". [H] https://nomos-glashuette.com/watchmaking/production/nomos-swing-system
- Balances are poised in an air stream and corrected by laser. Balances differ in their number of milled grooves. Spring and balance are matched into 40 classes. [H] Same NOMOS page.
- Introduced 2014. Swing-system DUW calibers run at 21,600 or 28,800 A/h with Incabloc shock protection. [M] https://reference.grail-watch.com/regulator/nomos-swing-system/
- DUW regulation system: no regulating screw. Regulator and stud carrier ride on rings on the balance bridge; the regulator carries a two-pin spring key; the stud carrier holds the outer spring end; both are moved with pliers. This is an ETACHRON-like layout. [H] https://nomos-glashuette.com/en/glossary/duw-regulation-system

Not published:
- Flat vs Breguet spring: unknown. ESTIMATE flat spring, thermally blued, ~12–14 coils. Reasoning: an ETACHRON-style key and stud on rings, a 2.6 mm movement height, and the "end curve" wording are all typical of a flat spring's terminal curve. [L–M]
- Balance diameter and arm count: unknown for NOMOS.
- The ETA 7001 balance measures ≈9.3 mm OD (ETA-derived; two independent measurements, 9.25 and 9.4 mm). [M for the 7001] ESTIMATE NOMOS: 9.0–9.5 mm, rim height ~0.45 mm.

================================================================
7. LAYOUT AND DIMENSIONS (ETA 7001 measured from ETA's to-scale assembled drawing; proxy for DUW 4001)
================================================================
Frame: dial-side view, origin at movement centre, +x toward 3 o'clock (stem), +y toward 12. Units mm. Scale: plate Ø23.30 mm = 2,860 px. Position error about ±0.1 mm. [M for the 7001; L–M for NOMOS]

Arbor positions:
- Centre/hands: (0, 0)
- Third wheel: (+1.63, −3.52)
- Fourth / small seconds: (0.00, −6.32), i.e. 6.3–6.5 mm below centre at 6 o'clock
- Escape wheel: (−3.02, −6.41)
- Pallet arbor: (−4.56, −3.83)
- Balance: (−6.21, −0.95). This is just past 3:00 seen from the back, matching grail-watch's NOMOS description.
- Barrel arbor/ratchet: (+2.05, +5.58), centre distance 5.94
- Crown wheel: (+5.84, 0.0), on the stem axis
- Minute wheel (dial side): (+2.32, −2.10)

Centre distances:
- Centre–third 3.88; third–fourth 3.25; fourth–escape 3.02; escape–pallet 3.00; pallet–balance 3.32.
- The escape–pallet distance 3.00 ≈ R/cos 30°, which implies escape wheel R ≈ 2.6. This independently confirms the measured escape-wheel diameter below.

Tip diameters (ETA-derived parts sheet; scale 0.00788 mm/px at 2400 dpi, ±4%):
- Barrel ≈10.6
- Ratchet ≈8.1 (8.3 in the assembled view)
- Crown wheel ≈6.2 (6.5 in the assembled view)
- Centre wheel ≈7.0
- Third ≈5.9–6.0
- Fourth ≈5.7–5.8
- Escape ≈5.2–5.3
- Balance ≈9.3
- Pallet fork overall ≈4.0
- Hour wheel ≈5.2
- Minute wheel ≈5.1
- Cannon pinion ≈1.7
- Setting wheel ≈2.1
- Winding pinion ≈2.4

Modules (fitted): barrel/centre pinion ≈0.082; centre/third 0.057; third/fourth 0.052; fourth/escape 0.047; motion works 0.12–0.136.

Pivot/arbor sizes: sourced only at the hands (Ø0.40 centre arbor, Ø0.17 seconds, Ø0.80 / Ø1.30 hand pipes, Ø0.90 stem). ESTIMATE pivots:
- Barrel arbor 1.0–1.2 at the bearings
- Centre 0.30–0.40
- Third 0.15–0.18
- Fourth 0.12–0.15
- Escape 0.10–0.12
- Pallet 0.09–0.10
- Balance 0.07–0.09

Jewels: 17.
- Generic 17-jewel allocation (ESTIMATE): balance 2 hole + 2 cap (Incabloc), impulse jewel 1, pallet stones 2, pallet arbor 2, escape 2, fourth 2, third 2, centre 2. In the 7001 the barrel bridge is listed as "jewelled".
- ESTIMATE sizes: train hole jewels OD 0.9–1.2 mm, thickness 0.2–0.3 mm.

================================================================
8. STACKING HEIGHTS (DUW 4001, 2.6 mm total) — all ESTIMATE
================================================================
Not published by NOMOS or ETA. z = 0 at the dial face of the main plate, + toward the caseback.
- Motion works sit in a ~0.35 mm deep dial-side recess and project through the dial. Use ETA's heights above dial seat: hour pipe 0.89, cannon top 1.19, seconds pivot 0.40.
- Main plate: 0 → 0.95.
- Barrel in a plate pocket: z 0.75 → 2.05. Drum ~1.3 tall; spring height ~1.0.
- Train: centre wheel z ≈1.05; third wheel z ≈1.35, its pinion meshing the centre wheel at 1.05; fourth wheel z ≈1.05, its pinion meshing third at 1.35; escape wheel z ≈1.40, its pinion at 1.05. Wheel thickness 0.15–0.20; escape wheel 0.12–0.15 steel.
- Pallet fork z ≈1.45 (matches the escape wheel plane).
- Balance rim mid-plane z ≈1.85 in a cut-out of the three-quarter plate.
- Three-quarter plate: z 2.05 → 2.45.
- Ratchet and crown wheel on top of the three-quarter plate, recessed: top at ≈2.6. The balance cock top is also ≈2.6. The Glashütte click and spring lie on the plate top.

================================================================
9. MAINSPRING AND BARREL
================================================================
Sourced:
- 53 h power reserve. [H] NOMOS DUW 4001 page.
- ETA 7001 mainspring dimensions: not found (unknown). A Watch Repair Talk thread only reports fitting problems. https://www.watchrepairtalk.com/topic/15368-eta-7001-mainspring-problems
- Generic rule: a 7.5 h/turn barrel needs ~4 turns for a 30 h run plus ~2.5 turns margin. [M] https://www.vintagewatchstraps.com/watchmovement2.php

ESTIMATE (self-consistent):
- Barrel inner diameter ≈9.6; arbor Ø ≈3.2 (1/3 rule); spring height ≈1.0, thickness 0.095, length ≈340 mm (half-fill rule).
- This gives ≈20.8 coils wound vs ≈12.9 let down = ≈7.9 usable turns.
- 53 h ÷ 7 h/turn = 7.6 turns. This agrees.
- Animation: during winding, the arbor and ratchet rotate and the coils tighten onto the arbor. During running, the drum rotates 1 turn per ~7 h while the coils migrate outward. Winding torque rises steeply at full wind; there is no slipping bridle in a manual wind.

================================================================
10. RECOMMENDED CONSISTENT SET FOR THE THREE.JS MODEL
================================================================
Counts:
- Barrel 126 / centre pinion 18 [pinion ESTIMATE]
- Centre 120 / third pinion 16
- Third 112 / fourth pinion 14
- Fourth 120 / escape pinion 10
- Escape 15
- Motion works: cannon 12 → minute wheel 40; minute pinion 10 → hour 36
- Keyless: winding pinion 15 → crown wheel 42 → ratchet 56; setting wheel 15; sliding pinion 12 [ESTIMATE]

Rates:
- Barrel 1/7 rev/h; centre 1 rev/h; third 1 rev/8 min; fourth 1 rev/min; escape 1 rev/5 s.
- Balance 3 Hz, A = 290°, lift 50°.
- Fork ±6.75°.
- Escape step 12° per beat: −0.2 recoil / +11 impulse / +1 drop.

Labels: ETA-derived counts = [M] for the 7001 ancestor, [L] as NOMOS-exact. Pinion 18, sliding pinion and all stacking values are ESTIMATE.

================================================================
11. METHOD NOTE AND UNRESOLVED ITEMS
================================================================
Method:
- I rendered ETA's vector drawings at 1200–2400 dpi with pdftoppm and counted teeth by radial-profile threshold crossings. Counts were stable across 3 thresholds and identical between the 2011 and 2026 drawings.
- Positions come from jewel centroids on the assembled view, scaled to the 23.30 mm plate.
- Escape-wheel and escape-pinion counts were confirmed by eye and by arithmetic, not by the script.

Still unknown, for NOMOS specifically: every tooth count; balance diameter; spring type; escape-wheel size; lift angle; amplitude spec; mainspring dimensions; plate and bridge thicknesses.

Files are in <scratchpad>:
- render\a.pdf — ETA CT 7001, 2011
- render\b.pdf — ETA CT 7001, 2026
- scripts\count3.py — tooth counter
- scripts\pin2.py — pinion counter
- render\q1back-01.png, render\q1dial-01.png — assembled views used for positions