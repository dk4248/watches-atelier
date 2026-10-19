NOMOS TANGENTE NEOMATIK 38 UPDATE, REF. 147: MOVEMENT REPORT — CALIBER DUW 6101 ("34/42" variant)
(movement research for the real-time Three.js replica; companion of exterior.md in this folder)

Conventions
- "Back view" = looking through the sapphire case back, 12 o'clock up; the crown is then on the LEFT (9 o'clock).
- All coordinates are mm from the hand axis (= centre-wheel arbor = rotor axis). Back view: x+ right, y+ toward 12.
  Dial frame (CONTRACT.md, used in SPEC DATA): x_dial = −x_back, y unchanged.
- "Clock" = clock position in the back view unless stated otherwise.
- z: CONTRACT convention, z = 0 at the dial-side face of the pillar plate, dial side +, movement side −.
- Tags: [OFF] official NOMOS page/image, [REV] review/reference site, [MEAS] my pixel measurement,
  [EST] engineering estimate (self-consistent, not sourced). Confidence H / M / L.
- Scale: every measured length uses the exterior report's case scale (ref.147 renders 23.50 px/mm,
  lug-to-lug 47.3). See §2 for why and for the ±0.7 % alternative.

=====================================================================
0. VERDICT: WHICH CALIBER
=====================================================================
- Ref. 147 = Tangente neomatik 38 Update, 2026 release (CDN timestamps Apr 2026; Monochrome article 10 Aug 2026). [OFF] H
  https://nomos-glashuette.com/en-us/tangente/tangente-neomatik-38-update-147
- Caliber: DUW 6101, the neomatik date caliber with the peripheral "ring date". The ref.147 page links to the caliber
  page "DUW 6101 34/42": https://nomos-glashuette.com/en-us/caliber/duw-6101-duw-6101-34-42 [OFF] H
- This is a NEW SIZE VARIANT of the 2018 DUW 6101:
  | Variant | Ø | Jewels | Power reserve | Where used | Source |
  |---|---|---|---|---|---|
  | DUW 6101 (2018) | 35.2 mm (15½''') | 27 | 42 h | Tangente neomatik 41 Update ref.180 (2018), Club Sport, Autobahn, Metro… | https://nomos-glashuette.com/en/manufacture/caliber/duw-6101 [OFF] |
  | DUW 6101 "new version" (2024 →) | 35.2 mm | 42 | 42 h | Ahoi neomatik 38 date Atlantic first (Jul 2024), then the 41 Update (ref.180 page now: 35.2 mm, 42 jewels, 42 h) | https://www.fratellowatches.com/hands-on-with-the-new-nomos-ahoi-neomatik-38-date-in-classic-atlantic-blue/ [REV], https://nomos-glashuette.com/en-us/tangente/tangente-neomatik-41-update-180 [OFF] |
  | DUW 6101 "with bajonet fitting 33 42" | 33.0 mm (14½''') | 42 | 42 h | — (page lists no model) | https://nomos-glashuette.com/en/watchmaking/nomos-movements/miracle-movements/duw-6101-with-bajonet-fitting-33-42 [OFF] |
  | **DUW 6101 34/42 (ref.147)** | **34.0 mm** ("16 lines" — a typo, 34.0 mm ≈ 15 lignes) | **42** | **up to 50 h** (EN) / "ca. 50 Stunden" (DE) | Tangente neomatik 38 Update 147/148 (and presumably the 2026 gold 195/196) | caliber page above + https://nomos-glashuette.com/de/caliber/duw-6101-duw-6101-34-42 [OFF] |
- What changed for the 38 mm Update (Monochrome): "the outer date ring was rescaled to fit the smaller case, reducing
  the movement diameter from 35.2 mm to 34 mm", height 3.6 and architecture retained. [REV] H
  https://monochrome-watches.com/introducing-nomos-glashuette-tangente-neomatik-38-update-147-148-silver-forest-green-price-spec-review/
- My measurements confirm it: the ref.147 case-back render and the generic "DUW_6101_Boden_01_Bajonett_42Rubine" render
  (used on the 34/42, 33/42 and ref.180 pages) and the 2018 27-jewel render have IDENTICAL core layouts (12 screws/jewels
  agree to ≤0.1 mm after a pure scale fit, zero rotation; radial profiles of old/new renders coincide pixel for pixel).
  Only the date ring (Ø35.2 → Ø34.0) and the engraved jewel count differ. [MEAS] H
- 42 jewels = original 27 + 5 rubies that support the date ring + 10 rubies for the "double ratchet wheel"
  (Fratello quoting NOMOS). [REV] M
- "Bajonett"/"bajonet fitting": NOMOS names, not explained in text. The 2023+ renders show a notched bayonet ring around
  the rotor bearing that the 2018 render lacks → interpreted as a bayonet-locked rotor bearing. [MEAS + EST] L-M
- Power-reserve conflict: NOMOS's ref.147 page and the 34/42 caliber page (EN and DE) say 50 h; Monochrome (147) and every
  other DUW 6101 page say 42 h. The spec uses 50 h (what NOMOS states for this exact variant). M

=====================================================================
1. SPECIFICATIONS
=====================================================================
| Item | Value | Source / confidence |
|---|---|---|
| Type | In-house automatic "neomatik" caliber with integrated ring date; bidirectional winding; hand-windable | [OFF] H |
| Functions | Central hours & minutes; small seconds at 6 (fourth wheel 7.20 below centre); date ring (31 positions) shown at the dial edge; stop-seconds; quick date correction in BOTH directions | [OFF] H |
| Crown positions | 1 = hand winding; 2 = quick date set (turn one way = forward, the other way = back); 3 = time set + stop seconds | [OFF] H; https://reference.grail-watch.com/movement/duw-6101/ [REV] |
| Diameter | 34.0 mm including the date ring (core plates Ø31.1, see §3) | [OFF] H (34.0) / [MEAS] M (core) |
| Height | 3.6 mm | [OFF] H |
| Jewels | 42 | [OFF] H |
| Frequency | 21,600 A/h = 3 Hz ("the balance … six times per second – 21,600 motions per hour", NOMOS via Caliber Corner; Monochrome 21,600 vph). Grail's 28,800 is wrong. | https://calibercorner.com/nomos-caliber-duw-6101/ [REV] H |
| Power reserve | Up to 50 h (ref.147 / 34-42 pages); 42 h on all other DUW 6101 pages | [OFF] M (conflict) |
| Parts | 188 for the original 27-jewel DUW 6101 (Caliber Corner table; Revolution quotes Theodor Prenzel "each of the 188 parts"). 42-jewel variant: unknown (≥ +15 jewels). | https://revolutionwatch.com/high-end-mechanics-from-nomos-glashu%CC%88tte/ [REV] M |
| Escapement | NOMOS swing system (in-house Swiss lever, blue balance spring, 15-tooth steel escape wheel, ruby pallets) | [OFF] H; 15 teeth visible in NOMOS's own DUW 6101 train photo [MEAS] H |
| Balance support | "NOMOS balance bridge, fixed by screws on both sides" (a bridge, not a cock) | [OFF] H |
| Regulation | DUW regulation system (no regulator screw: spring-key ring + stud-carrier ring on the bridge, set with pliers), adjusted in 6 positions; plate engraved "REGULIERT IN 6 LAGEN" | [OFF] H; engraving [MEAS photo] M |
| Shock protection | Incabloc (gold lyre spring visible on the balance cap) | Caliber Corner, Watch-Wiki [REV] M-H |
| Rotor | Bidirectional, ball bearing (balls visible in the hub), rhodium-plated with Glashütte ribbing, RAISED gold-plated lettering "NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE" on the rim ("gold-plated embossing") | [OFF] H; ball bearing [MEAS]+Caliber Corner H; relief lettering SJX [REV] H |
| Winding mechanism | Rotor → NOMOS "Doppelklinkenrad" (double-click / double-pawl wheel, NOMOS R&D team of Theodor Prenzel, first in DUW 3001) → reduction wheels → ratchet. 10 rubies added to the "double ratchet wheel" in the 42-jewel version. "When the power reserve is full, the rotor no longer winds the mainspring." No source uses the term "NOMOS switch". | https://quillandpad.com/2015/10/08/nomos-glashutte-neomatik-a-sensibly-priced-efficient-fashionable-and-mechanically-sound-tribute-to-the-past-and-future-of-glashutte/ [REV] M |
| Date mechanism | Patented. "The date wheel with the triangular cam, which is surrounded by a pivoting click" is the centrepiece; "the carrier wheel is driven by a second wheel underneath"; date mechanism "fully integrated", not mounted on top; "a special sliding gear … took eleven trials". Date change takes ~30 min; do not set the date 23:15–00:45 (90 min) — it does not damage the mechanism if you do. | https://nomos-glashuette.com/en-us/watchmaking/research-and-development [OFF] H; caliber pages [OFF] H |
| Finishing | Glashütte three-quarter plate; rhodium-plated surfaces with Glashütte ribbing and NOMOS perlage; tempered blue screws; golden engravings; ratchet/"duplex" wheel with Glashütte sunburst (the crown wheel shows a sunburst ring) | [OFF] H; Watch-Wiki https://www.watch-wiki.net/doku.php?id=duw_6101 [REV] M |
| Lineage | "Essentially a larger version of" the DUW 3001 (SJX) but "very different in construction" (Prenzel). Introduced Baselworld 2018 (35.2 mm). | https://watchesbysjx.com/2018/08/hands-on-with-the-nomos-neomatik-update.html [REV] M |

=====================================================================
2. IMAGES AND MEASUREMENT METHOD
=====================================================================
All files in <scratchpad>\img\tangente-update-147\
(CDN serves JPEG even for sf=png URLs → saved as .jpg). Scripts: ...\scratchpad\scripts147\ ; working crops/overlays: ...\scratchpad\out147\

| File | Content | Scale / centre px |
|---|---|---|
| mov_duw6101_boden_bajonett42_2560.jpg (2560²) | MAIN SOURCE. Official back render, 42 RUBINE, N° 30130, rotor at the reference angle. https://cdn.nomos-glashuette.com/img/f=scale-down,w=2560/webshop/e2/5d/fd/1765361378/DUW_6101_Boden_01_Bajonett_42Rubine_2d-f7.jpg | **56.34 px/mm**, hand axis **(1277.5, 1238.2)**. (Its outer white ring, centre (1278.7,1264.3) r 980.7 px, is the Ø35.2 date ring drawn 0.46 mm off-axis — render artefact, ignore.) |
| mov_0147_caseback_2560.jpg (1853²) | Ref.147 case back render, N° 30264, same rotor angle. …/1e/7e/7f/1776110705/0147_Tangente_neomatik_38_Update_GB-2d-back-masked.jpg | 23.50 px/mm (exterior report); case centre (918.05, 901.40) [mine] / (918.67, 900.72) [exterior]. Boden px = 2.397 × (147 px) − (923.1, 922.5); rotation 0.0°. Window clear radius 352 px = 14.98 mm. |
| mov_0147_front_2560.jpg (1853²) | Ref.147 dial render (date slots, red markers, subdial) | 23.50 px/mm; dial centre (918.5, 901.6); red markers at r 16.5, 29.3° and 41.0° (date 3); seconds pin −7.19 |
| mov_duw6101_front_2560.jpg (2560²) | Official DIAL-SIDE render of the Ø35.2 DUW 6101 (numeral date ring, date works, keyless, motion works). …/d0/78/ee/1759939384/duw-6101-front.jpg | 55.70 px/mm, movement centre (1282.9, 1320.1) — fitted to the back-render jewels (5 lower jewels, residual ≤0.1 mm); date-ring OD then = 35.1 mm ✓ |
| mov_nomos_duw6101_back_old.jpg (2560²) | 2018 back render, 27 RUBINE, N° 301 (…/6b/f9/98/1759939384/duw-6101-back.jpg) | ≈56.1 px/mm, axis ≈(1280.4, 1241.1); geometry identical |
| mov_duw6101_2023_f7_2560.jpg | 27 RUBINE, N° 21703, with the bayonet hub (chronometer/bajonet page) | same layout, not measured |
| mov_0147_detail4_2560.jpg | PHOTO of the ref.147 back, rotor rotated −152° vs the renders | homography Boden-mm → px fitted on 9 points (≤6 px residual); used to find the 2 screws and the barrel jewel hidden under the rotor in the renders and the rotor's own outline |
| mov_duw6101_3dfront_2560.jpg, mov_sjx_duw6101_movement.jpg | 3D views of the 27-jewel movement with rotor | perspective (shape reference only) |
| mov_werk_duw6101_03_bajonett42_2560.jpg | Low side view, 42-jewel bayonet version | perspective (levels reference) |
| mov_modal_technik_6101_raederwerk_{1024,2560}.jpg | NOMOS photo of the DUW 6101 going train: gilt barrel, three gilt 5-spoke wheels, 4-spoke steel escape wheel (15 club teeth) | perspective; pinions of ~14 and ~16 leaves, wheels ~110-130 teeth |
| mov_duw6101_datumschaltrad_2560.jpg | NOMOS photo "DUW_6101_Datumschaltrad": ~32-tooth gilt wheel stack with steel triangular cam and hook-shaped pivoting click | no scale |
| mov_sjx_duw6101_date.jpg, mov_sjx_duw6101_program_disk.jpg | SJX macros of the dial side: setting lever/yoke, 5-arm star, program disk, date ring with internal castellated teeth | no scale |
| mov_0182_update41_GB_2560.jpg | Ref.182 (41 mm) case back: identical movement image at the same pixel scale | — |
| mov_180_detail1/2, mov_180_2024_detail2, mov_0180_update41_detail3, mov_tu2026_detail1..4, mov_duw3001_3dback_2560 | 41 mm / 38 mm Update dial details, DUW 3001 rotor | reference only |

Method
- Scale chain: the ref.147 case-back render (case Ø38.5 / lug-to-lug 47.3) → similarity fit of 5 blued screws + 7 jewels
  to the Boden render (scale 2.397, rotation −0.03°, residuals ≤5 Boden px = 0.09 mm) → 56.34 px/mm.
  Alternative: if the case SILHOUETTE in the render is taken as exactly 38.5, the scale is 56.67 px/mm (all lengths 0.6 % smaller).
  Supporting 56.34: the dial-side render's date ring comes out Ø35.1 (official 35.2) and the measured seconds jewel (7.20)
  matches the seconds pin on the ref.147 dial render (7.19). Supporting 56.67: the balance OD then equals the DUW 4001's 9.35.
- Jewel/screw centres: colour segmentation + bounding-box centres (±0.05 mm). Balance: circle fit to the gold rim (OD 9.40).
- Outlines: read on 0.5-mm-grid zooms and Sobel edge maps (±0.2-0.3 mm).
- Rotor outline: edges common to the Boden render and the detail-4 photo after rectifying the photo and rotating it by the
  rotor's 152° difference (only rotor edges coincide; plate edges do not) — this separated the rotor from the plate.
- Tooth counts: angular FFT of the tooth band (crown wheel 41.75 → 42; reverser gilt wheel 19-20; idler 1 ≈ 20).

=====================================================================
3. LAYOUT FROM THE BACK (measured)
=====================================================================
3.1 What is seen through the ref.147 back (window clear Ø29.96, everything within r 14.98)
- Left half: the ROTOR (reference angle, identical in all official images): heavy rim from 11 o'clock round through 9 to 5 o'clock
  with raised gold letters; an S-shaped bar through the hub; a large window between bar and rim through which the
  3/4 plate, the "DUW 6101 / N° 30264" engraving and the hand-winding wheels (crown wheel + 2 idlers) are visible.
- Centre: rotor bearing — fixed steel disc with 3 slotted screws and a central jewel, ring of ~9 balls, bayonet ring with notches,
  rotor collar.
- Right half: rhodium three-quarter plate with Glashütte ribbing (bands DESCEND to the right at ~30°, ≈2.3 pitch — the
  opposite slant to the DUW 4001), "42 RUBINE", 5 visible blued screws, jewels, a small gilt reverser wheel next to the hub.
- 3:30–5 o'clock: gold 3-arm balance under the slender two-sided balance bridge (blued screw at each end), DUW regulator rings,
  blue hairspring; perlage on the pillar plate around it; "MADE IN GERMANY" arc at 5 o'clock.
- 12 o'clock edge: a plain slotted steel casing screw (head Ø≈2.1) half under the case-back ring. 2:20: a Ø1.4 through hole.

3.2 Arbors (back view, mm; dial-frame x = −x_back)
| Mobile | x_back | y | x_dial | r | Clock | Status |
|---|---|---|---|---|---|---|
| Centre (hands, rotor axis) | 0 | 0 | 0 | 0 | — | [MEAS] H |
| Third wheel | −0.42 | −4.22 | +0.42 | 4.24 | 6:11 | jewel partly under the rotor collar + lower jewel on the dial side [MEAS] M |
| Fourth wheel (small seconds) | 0.00 | −7.20 | 0.00 | 7.20 | 6:00 | [MEAS] H (= dial seconds pin −7.19) |
| Escape wheel | 3.21 | −7.38 | −3.21 | 8.05 | 5:13 | [MEAS] H |
| Pallet arbor | 5.81 | −6.08 | −5.81 | 8.41 | 4:33 | [MEAS] H |
| Balance staff | 8.81 | −4.34 | −8.81 | 9.82 | 3:52 | [MEAS] H (rim fit + cap jewel) |
| Barrel arbor (+ hidden ratchet) | −2.19 | 5.65 | +2.19 | 6.06 | 11:18 | jewel under the rotor bar; seen in photo + dial side [MEAS] M; identity [EST] M |
| Crown wheel | −7.04 | −0.07 | +7.04 | 7.04 | 8:59 | [MEAS] H, 42 t |
| Winding idler 1 (single screw) | −8.50 | 3.97 | +8.50 | 9.38 | 9:50 | [MEAS] H, ~20 t |
| Winding idler 2 (half-moon cap) | −7.59 | 6.31 | +7.59 | 9.87 | 10:19 | [MEAS] M, ~16 t [EST] |
| Reverser (gilt, "Doppelklinkenrad") | 3.38 | 3.24 | −3.38 | 4.68 | 1:32 | [MEAS] H position; identity [EST] M |
| Jewelled pivot A | 4.51 | 1.72 | −4.51 | 4.83 | 2:18 | auto-winding train? [EST] |
| Jewelled pivot B (large jewel) | 5.91 | 5.14 | −5.91 | 7.83 | 1:38 | auto-winding train? [EST] |
| Jewelled pivot C | 6.08 | 8.90 | −6.08 | 10.78 | 1:09 | [EST] identity |
| Jewelled pivot D (small jewel) | 4.03 | 9.88 | −4.03 | 10.67 | 12:44 | [EST] identity |
- Escape → pallet → balance: centre distances 2.91 and 3.47, lines 26.6° / 30.1° → near straight-line lever (3.5° off). [MEAS] H
- Escape tip radius (pallets embrace 2.5 teeth): 2.91·cos30° = 2.52 (tip Ø 5.03). [EST] M
- Balance: rim OD 9.40, rim width 0.32, 3 tapered gold arms (as the swing-system balance of the DUW 4001). [MEAS] H
- Regulator (on rings around the shock setting): gold spring-key block at (7.95, −1.43) (≈11:20 of the balance), stud carrier at
  (5.86, −4.20) (≈9:00 of the balance). Blue hairspring visible through the arms at (6.2, −2.4). [MEAS] M
- Lever-geometry checks: fourth wheel (tip Ø6.07) reaches the escape pinion; centre wheel (Ø7.65) clears the fourth arbor. [EST] consistent.

3.3 Visible jewels (pink rubies in polished sinks, no chatons) [MEAS]
- Large Ø1.16: fourth (0.00, −7.20), pivot B (5.91, 5.14). Ø1.0: escape, pallet (Ø0.65), balance cap (8.82, −4.28) inside the gold
  Incabloc lyre, pivot C (Ø1.06×0.73, partly hidden), pivot A (Ø0.7). Small Ø0.55: pivot D. Rotor-bearing centre jewel Ø0.6 at (0,0).
- Hidden by the rotor at the reference angle: barrel arbor (−2.19, 5.65); third (only an edge shows).
- A thin ruby sliver shows at (12.1–13.0, 2.75) in a slit above the bridge's upper pad (probably one of the 5 date-ring support jewels — L).

3.4 Screws [MEAS]
| Screw | x_back | y | r | Clock | Note |
|---|---|---|---|---|---|
| Blued S1 | −0.11 | 12.13 | 12.13 | 11:59 | 3/4 plate |
| Blued S2 | 11.44 | 4.19 | 12.18 | 2:20 | 3/4 plate |
| Blued S3 | 12.14 | 1.05 | 12.19 | 2:50 | balance bridge, upper end |
| Blued S4 | 6.75 | −10.16 | 12.20 | 4:53 | balance bridge, lower end |
| Blued S5 | 4.11 | −11.53 | 12.24 | 5:21 | 3/4 plate (half under rotor end) |
| Blued S6 | −11.70 | 3.56 | 12.23 | 9:34 | 3/4 plate, under the rotor rim (photo + homography, ±0.3) |
| Blued S7 | −10.78 | −5.41 | 12.06 | 8:07 | 3/4 plate, under the rotor rim (±0.3) |
- All 7 blued screws sit on one circle r ≈ 12.2; heads Ø1.46, slotted (#1B437E-ish tempered blue).
- Steel: crown-wheel cover 2 × Ø1.11 at (−7.04, +1.03) and (−7.04, −1.13); idler-1 centre screw Ø≈1.1 with polished collar;
  rotor-bearing 3 × Ø1.31 at r 1.38, back-view clock angles 92°, 211°, 331° — FIXED to the movement (they do not turn
  with the rotor; verified on the photo); casing screw Ø≈2.1 at (−0.15, 14.53) (half under the case-back ring).

3.5 Plates and bridges [MEAS, outlines ±0.3]
- Pillar plate: Ø31.1 (r 15.54), its exposed top ring (r 13.63–15.54) perlage-finished; holes: casing-screw seat at (−0.16, 14.58)
  in a small edge notch, through hole Ø1.4 at (13.47, 4.78).
- Three-quarter plate: disc r 13.63 minus the balance-side cut-out (polygon in SPEC DATA, going (6.69,−11.82) → around the
  bridge's lower pad → arc round the balance at r≈4.95 from its staff ((3.86,−4.31) leftmost, (8.52,1.30) top) → up the bridge's
  upper pad → (13.28, 2.91) → off the plate). Additional features: 0.18-deep recess round the crown wheel and the 2 idlers;
  winding-pinion through-slot back x −10.37…−9.72, y −1.45…+1.80; window r 1.46 at (3.32, 3.32) for the reverser;
  casing-clamp pocket at 1–2 o'clock (arc from (5.3, 12.7) to (12.1, 8.9), shallow, cosmetic).
- Balance bridge ("NOMOS balance bridge, fixed by screws on both sides"): 23-point polygon in SPEC DATA. Upper pad
  (10.87…13.28, −0.05…2.86) with S3; arm ≈1.45 wide aimed at the staff; boss r 2.06 round the staff carrying the Incabloc
  setting and the two DUW regulator rings; lower arm ≈2.1 wide; lower pad (5.36…8.82, −12.17…−8.42) with S4.
  Bridge is bent: upper arm 31.7° from vertical, lower arm 19.5°.
- Pallet bridge: small perlage bridge carrying the pallet jewel under the balance (outline EST, SPEC DATA).

3.6 Rotor [MEAS shape M, details EST where stated]
- Kinematic frame: CONTRACT rotor convention (heavy rim at local −Y). In every official image the rotor stands at
  **rot.z = +71.8°** (heavy rim toward back-view 8:22 ≈ dial-frame 3:38).
- Plan shape: a half-moon RIM plus an S-shaped BAR through the hub, with a big WINDOW between them (not a solid sector):
  - Rim: inner edge r 10.20 (step), flat top r 11.55–13.67 carrying the letters, outer bevel r 13.67 → 15.56 (radially brushed).
    Span ≈175°; both end faces are straight cuts parallel to each other (at the reference angle they are vertical lines at back
    x = −4.96 and x = +3.95).
  - Bar: ≈2.2 wide, leaving the upper rim end at (−4.2, 11.6), curving through (−3.1, 9.0), (−2.0, 7.0), (−1.0, 5.2) to the collar,
    and from the collar's other side through (2.6, −5.0), (2.7, −7.2), (3.1, −9.1), (3.6, −10.7) to the lower rim end
    (reference-angle back-view coordinates).
  - Collar: r 3.47–4.02, rotates with the rotor; inside it the FIXED bearing (disc r 2.43 with 3 screws, ~9 balls Ø0.25 on r 2.57,
    bayonet ring r 2.72–3.46 with notches).
  - Plan area 255 mm²; centroid on local −Y at r 7.15 (uniform thickness) — rim heavier in reality, so ~8.
- Finish: rhodium-plated, Glashütte ribbing continuous with the plate ribbing direction; raised (embossed, +0.05) gold-plated
  capitals "NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE" on the flat, letter centres r 12.62, cap height 1.06, DIN-like, reading
  counter-clockwise seen from the back with tops toward the axis; first "N" at back-view clock 333° and last "E" at 168° at the
  reference angle (local −8.6° … −173.1°). Rim outer side wall and bevel radially brushed.
- Material: not published. EST rhodium-plated brass, ≈1.1 g (tungsten would be ≈2.3 g).
- Thickness (EST): rim 0.50 (z −3.15 … −2.65), bevel down to z −2.85 at the edge, outer skirt underside z −2.30; bar and collar
  ≈0.30. Letters to z −3.20 = the movement's back extreme.

3.7 Hand-winding wheels visible in the rotor window [MEAS]
- Crown wheel: steel, 42 teeth, tip Ø6.10, sunburst ring between the teeth and a polished FIXED cover disc Ø4.06 held by 2 screws.
- Winding pinion: blackened steel, on the stem axis, its teeth visible through the slot at back x ≈ −10.0 (left of the crown wheel).
- Idler 1: steel, ≈20 t, tip Ø3.05, fixed screw + polished collar in the centre.
- Idler 2: steel, ≈16 t, tip Ø2.5, under a polished half-moon cap; gilt wheels visible below both idlers (part of the
  winding train, not identified).
- These form a chain crown wheel → idler 1 → idler 2 → ratchet on the barrel arbor (−2.19, 5.65): the three centre distances
  give the same module 0.139 with 42/20/16/62 teeth — strong self-consistency. [EST] M

3.8 Engravings (all gold-filled, upright DIN-like capitals, read from the back) [MEAS]
| Text | Position (back view) | Size |
|---|---|---|
| "DUW 6101" | left-aligned at x −6.73, line centre y −5.36 (3/4 plate, seen through the rotor window) | cap 0.83 |
| "N° 30264" (ref.147 render; generic render "N° 30130") | left-aligned x −6.73, y −6.56 | cap 0.83 |
| "42 RUBINE" | arc r 12.60, clock 23.1° → 49.8°, reads clockwise, tops outward (3/4 plate) | cap 0.85 |
| "MADE IN GERMANY" | arc r 14.56 on the pillar-plate ring, "M" ≈174° → "Y" 148.3°, reads counter-clockwise, tops inward; "MADE IN" is under the rotor end at the reference angle | cap 0.50 |
| "REGULIERT IN 6 LAGEN" | same ring, ≈186°–214° (photo only, ±3°), under the rotor at the reference angle | cap 0.50 (EST) |
| Rotor: "NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE" | raised, see 3.6 | cap 1.06 |
- No "NOMOS" logo, no adjustment marks; "MADE IN …" on the plate ring is gold (unlike the grey "MADE IN GERMANY" of the DUW 4001).

3.9 Colours / PBR (sampled on the renders)
- Plates and rotor: rhodium #C9CACB–#D4D4D4, metalness 1, roughness ≈0.28, anisotropic along the ribbing; perlage rings #CCCDD2.
- Blued screws: #1B437E (render core down to #022758 in shadow). Balance gold #D9AD6F. Gilt wheels #D7B67C. Gold lettering #E3AC5A.
- Jewels: ruby #A95483 (sinks), pallet stones #E06A8A, impulse jewel #C0203A, hairspring #2C5DA6 (as DUW 4001 report).
- Date ring (dial side): matte white #E4E4E4, markers #C80E16 (exterior report values; my samples #A1A1A1 in the slot shadow, #BB0B15).

=====================================================================
4. DIAL SIDE (date ring, date works, motion works, keyless) — measured on the Ø35.2 dial-side render (same core)
=====================================================================
Dial frame coordinates (x toward the crown).
| Part | x_dial | y | Notes |
|---|---|---|---|
| Cannon pinion / hour wheel | 0 | 0 | cannon pinion steel, tip Ø1.6; hour wheel gilt Ø≈5.2 (half hidden under a steel bridge) [MEAS] |
| Minute wheel (gilt, skeletonised) + steel pinion | 2.13 | −2.12 | wheel tip Ø≈4.9, pinion Ø≈1.3 — same spot as the ETA 7001/DUW 4001 minute wheel (2.32, −2.10) [MEAS] H |
| Date-drive wheel: gilt Ø3.65 (~24 t) + steel star (~16 t) + blued screw | −3.41 | −0.65 | identity [EST] M |
| Date-switching wheel ("Datumschaltrad"/program disk): gilt ~32 t Ø≈4.6 stacked over a carrier wheel, steel triangular cam + hook-shaped pivoting click | ≈ −8.25 | ≈ 1.51 | under the steel date bridge; position [EST] L (±1 mm) |
| Quick-set star (5 arms, steel, screw) with a ~24-t wheel beneath | 8.05 | −4.43 | arm-tip radius ≈2.2; identity [EST] M |
| Quick-set idler (steel, ~14 t) | 8.85 | −2.21 | [MEAS] position |
| Winding pinion / sliding pinion | 10.04 / 9.00 | 0 | on the stem axis [MEAS]/[EST] |
| Setting-lever stud | 7.95 | 2.92 | setting lever + yoke span (6…10, −1.6…6.6) [MEAS] |
| Stop-seconds lever | — | — | hidden; touches the balance rim in crown position 3 [EST] |
- Date ring (35.2 render): white face r 12.27 → 17.6; 31 INTERNAL teeth (FFT 30.75) in a castellated band r 11.67 → 12.27.
  For the ref.147 the ring OD is 34.0 (r 17.0); I keep the same inner toothing (same core). Thickness ≈0.20 [EST].
- Ref.147 marker geometry (with exterior.md): dial slots r 16.25–16.83, 6.0° long, at (k+½)·11.613°; two red markers on the
  ring centred at (D−½)·Δ and (D+½)·Δ; ring-local centres at rot 0 (day 1) = 84.19° and 72.58° CCW from +X; markers
  7.0° × r 16.15–16.93. Through the other 29 slots the ring shows matte white/grey.
- Five rubies support the ring (Fratello) — EST five guide jewels on r ≈11.35 at 72° spacing.

=====================================================================
5. GEAR TRAIN AND KINEMATICS
=====================================================================
5.1 Going train (tooth counts EST; NOMOS publishes none)
| Mesh | Teeth | Centre dist. | Module | Ratio |
|---|---|---|---|---|
| Barrel → centre pinion | 126 → 18 | 6.06 | 0.0842 | 7 (barrel 1 turn / 7 h) |
| Centre wheel → third pinion | 120 → 16 | 4.24 | 0.0624 | 7.5 |
| Third wheel → fourth pinion | 112 → 14 | 2.99 | 0.0478 | 8 |
| Fourth wheel → escape pinion | 120 → 10 | 3.21 | 0.0495 | 12 |
| Escape wheel | 15 club teeth, tip Ø5.03 | escape–pallet 2.91 | — | — |
- Rates: centre 1 rev/h (CCW from back) · third 7.5 rev/h (1 per 8 min) · fourth 60 rev/h = 1 rpm (small seconds) ·
  escape 720 rev/h = 12 rpm · 15 teeth × 2 × 720 = **21,600 A/h** exactly.
- Why this set: it is the ETA/Peseux 7001-derived set already used in the Tangente 139 replica (shared code paths); NOMOS's own
  DUW 6101 train photo shows pinions of ~14 and ~16 leaves and gilt wheels with ~110–130 fine teeth, consistent with it;
  wheel tip diameters (barrel 10.8, centre 7.65, third 5.48, fourth 6.07) fit the measured centre distances with no clashes
  (third/fourth and centre/barrel overlap in plan, so use the 3-level stack of §6). Confidence L for the exact counts, H for rates.
- Pinion tip Ø: centre 1.63, third 1.09, fourth 0.74, escape 0.56. Gear form as in synthesis §6.1 (wheel tip m(z+2.7), pinion m(z+1.4)).

5.2 Directions (from meshing; seconds and hands clockwise on the dial)
| Mobile | Seen from the BACK | From the DIAL (engine sign) |
|---|---|---|
| Barrel drum (running) | CW | CCW (+) |
| Centre wheel / cannon pinion / minute hand | CCW | CW (−) |
| Third wheel | CW | CCW (+) |
| Fourth wheel / seconds | CCW | CW (−) |
| Escape wheel | CW | CCW (+) |
| Minute wheel | CW | CCW (+) |
| Hour wheel | CCW | CW (−) |
| Ratchet + barrel arbor (winding only) | CW | CCW (+) (= engine rot.ratchet) |
| Winding idler 2 / idler 1 / crown wheel (when the ratchet turns) | CCW / CW / CCW | CW / CCW / CW — crown wheel = engine rot.crownWheel (two idlers keep its sense and the 62:42 speed ratio) |
| Date ring | CCW | CW (−) = engine rot.date |
| Date-switching wheel | CCW (EST) | CW (−) (EST) |
| Rotor | free (pendulum) | — |

5.3 Escapement timing
Same NOMOS swing system as the DUW 4001 → reuse synthesis §6.5 exactly: 3 Hz, beat 166.67 ms, lift 50° (±25°), fork ±6.75°
(spec) / ±7.5° (synthesis), escape wheel −0.2° recoil / +11.2° impulse / +1° drop per beat. Amplitude EST 285° for a worn
automatic (270–300°), falling ~18 % at run-down (engine already models this).

5.4 Motion works (EST counts, MEAS position)
- Cannon pinion 12 → minute wheel 40; minute pinion 10 → hour wheel 36 → (40/12)(36/10) = 12. Centre distance 3.01 →
  modules 0.116 / 0.131; tips: cannon pinion Ø1.55, minute wheel Ø4.94, minute pinion Ø1.49, hour wheel Ø5.06 (render: 1.6 / 4.9 / 1.3 / ≈5.2) ✓.
- Minute wheel 0.3 rev/h (3 h 20 min per turn), hour wheel 1 rev/12 h.

5.5 Date mechanism (how it works, and what to animate)
- Sourced facts: ring around the movement (dial side), turned once a day by a patented switching wheel whose centrepiece is a
  triangular cam surrounded by a pivoting click, on a carrier wheel driven by a second wheel underneath [OFF]; switching takes
  ~30 min [OFF]; locking/do-not-set window 23:15–00:45 [OFF manual quote]; setting during it does not damage the mechanism, and
  if the ring hangs between two dates you pull to position 3 and set the time forward to 1 a.m. [OFF]; the quick-set works both
  ways in crown position 2 [OFF]; a hammer stops the quick-set star from engaging the ring during the switching phase, the
  program disk's hammer/cam arrangement "turns four times a day" (Altherr, German retailer) [REV] L-M.
  https://www.altherr.de/magazin/die-besonderheiten-der-manufaktur-nomos-glashutte
- Animation recipe [EST]:
  - Ring angle (dial frame) = −(day−1)·11.6129° (engine rot.date). 31 → 1 is one ordinary step (no month logic).
  - Real switching profile: hold all day; from ≈23:45 the click drags the ring through ~70 % of a step until ≈00:12, then the ring
    jumper snaps the last ~30 % in a fraction of a second; complete by 00:15. (The engine's current 1.2-s jump at 00:00 is an
    acceptable simplification.)
  - Date-switching wheel: 1 rev / 24 h, CW from the dial (arbors.dateSwitch). Optional lower wheel 1 rev / 6 h (Altherr) — LOW.
  - Quick-set (crown pos. 2): ±1 date per crown turn [EST]; the 5-arm star turns 1/5 rev per date step.
- The red markers are part of the ring; nothing else on the ring is printed (exterior.md).

5.6 Winding
Hand winding (crown position 1), counts EST except the 42-t crown wheel:
- Winding pinion 15 (contrate) → crown wheel 42 → idler 1 (20) → idler 2 (16) → ratchet 62 on the barrel arbor.
- Per crown turn: crown wheel 0.357 rev, idler 1 0.75 rev, idler 2 0.94 rev, ratchet 15/62 = 0.242 rev (87.1°) = 15 ratchet teeth.
- Full wind from empty (7.14 barrel turns for 50 h): 29.5 crown turns (NOMOS says 20–40 turns depending on movement).
- Engine keyless spec: { ratchet: 62, crownWheel: 42, windingPinion: 15 }; derive idlers from rot.ratchet: ω_idler2 = −(62/16)·ω_ratchet,
  ω_idler1 = +(62/20)·ω_ratchet.
Automatic winding [EST, structure from sources, numbers estimated]:
- Rotor (ball bearing) → rotor pinion (hidden, ≈10 t) → hidden intermediate → visible gilt reverser wheel (Doppelklinkenrad, ≈20 t,
  with a steel 16-tooth click star) → reduction wheels on jewelled pivots A–D (identities unknown) → ratchet → barrel arbor.
- Visible reverser: gilt wheel ω = +0.5·ω_rotor (follows the rotor both ways); its steel star turns ONE way only, at 0.5·|ω_rotor|.
- Overall: 120 rotor turns per barrel-arbor turn → ≈860 rotor turns from empty to 50 h. engine: ratchetPerRotorRad 1/120,
  windPerRad ≈1.86e-4.
- At full wind the mainspring slips in the barrel (NOMOS: "the rotor no longer winds the mainspring") — stop advancing the ratchet.
- When the rotor winds, the ratchet turns, so the crown wheel and both idlers turn too (generic Swiss practice; the winding
  pinion's ratchet teeth slip). The crown and stem should NOT turn then (the engine currently turns rot.stem with windAngle).
Rotor physics [EST]: physical pendulum with centre of mass ≈7.2–8 mm, radius of gyration ≈12.3 mm → natural period 0.29 s;
damping ratio ≈0.15. The engine's 1.1-s default reads better on screen; both are defensible.

5.7 Power reserve
- 50 h (NOMOS, this variant) = 7.14 barrel turns at 7 h/turn. With the 42 h figure: 6.0 turns.
- Mainspring and barrel dimensions: unpublished. EST barrel tip Ø10.8, drum inner Ø≈9.6, arbor Ø≈3.2, spring height ≈0.75.

=====================================================================
6. VERTICAL STACK (all EST; total 3.60 = dial-side works 0.40 + movement side 3.20)
=====================================================================
| Level | z range | Contents |
|---|---|---|
| Dial seat | +0.45 | dial underside (dial 0.35 → top +0.80); seconds pivot top +0.85, hour pipe +1.34, cannon pipe +1.64 |
| Date ring | +0.18 … +0.38 | ring 0.20; markers on its top face (0.07 below the dial) |
| Dial-side works | 0.00 … +0.36 | steel date bridge/keyless plates 0…0.18; program-disk stack 0.02…0.36; quick-set star 0.20…0.36; hour wheel 0.04…0.14; minute wheel −0.10…0; cannon leaves −0.12…0.02 (in a plate recess) |
| Pillar plate | −0.95 … 0 | perlage ring visible from the back at r 13.63–15.54 |
| Stem axis | −1.09 | = exterior crown axis (zb 3.36) with ZB0 4.45; winding pinion tip Ø≈2.7 reaches the crown wheel at −2.27…−2.45 |
| L0 | −1.10 … −0.98 | centre wheel, escape wheel, pallet fork, roller (impulse jewel) |
| L1 | −1.30 … −1.18 | fourth wheel; centre pinion & barrel teeth −1.32…−1.14 |
| L2 | −1.50 … −1.38 | third wheel; fourth pinion −1.52…−1.36 |
| Barrel | −1.95 … −1.05 | drum, lid −1.95…−1.90 |
| Pallet bridge | −1.60 … −1.30 | — |
| Balance | rim −1.94 … −1.50 | hairspring −2.06…−1.98 |
| Ratchet | −2.10 … −1.98 | flat ratchet between barrel and 3/4 plate (DUW 3001 practice: "half as flat") |
| 3/4 plate | −2.45 … −2.10 | 0.35 thick |
| Balance bridge | −2.45 … −2.12 | regulator rings −2.53…−2.45; Incabloc top −2.58 |
| Winding wheels (recess) | −2.45 … −2.27 | caps / crown-wheel cover to −2.55; gilt wheels below −2.27…−2.15 |
| Reverser | −2.45 … −2.20 | steel star −2.52…−2.45 |
| Screw heads | −2.58 … −2.45 | blued |
| Rotor bearing (fixed) | −2.75 … −2.45 | screws to −2.80 |
| Rotor | collar −2.95…−2.62; bar −2.95…−2.65; rim flat top −3.15, underside −2.65 (over the 3/4 plate), skirt −2.30 beyond r 13.7; letters −3.20 | movement back extreme −3.20 |
Reconciliation with exterior.md: it measured the crown axis at zb 3.36 and assumed the movement spans zb 1.25–4.85.
**Use ZB0 = 4.45** (pillar-plate dial face at zb 4.45): stem axis z −1.09 (my independent estimate was −1.05), movement zb 1.25–4.85,
dial underside zb 4.90 and dial top ≈5.25 (their estimate). The rotor letters then clear the back glass (zb 1.20) by only 0.05 —
lower the glass inner face or trim the letter relief if the model shows contact.

=====================================================================
7. LABELLED PARTS LIST (movement; ids follow CONTRACT where they exist)
=====================================================================
Framework
- main-plate — Pillar plate: the Ø31 base plate every part is built on; its exposed rim is decorated with NOMOS perlage.
- three-quarter-plate — Three-quarter plate: the large ribbed top plate holding the upper pivots of the barrel and gear train in one rigid piece, a Glashütte tradition.
- balance-bridge — NOMOS balance bridge: a slim bar screwed down at BOTH ends that holds the balance's upper pivot; more rigid and flatter than a one-sided cock.
- pallet-bridge — Pallet bridge: small bridge carrying the pallet fork's upper pivot under the balance.
- dial-side-bridges — Date bridge and keyless plates: steel plates on the dial side that hold the date and setting mechanism.
- plate-screws — Blued screws: seven heat-blued screws on one circle hold the plates and the balance bridge; one plain casing screw holds the movement in the case.
- jewels — 42 synthetic rubies used as low-friction bearings, pallet stones and the impulse pin; five of them guide the date ring.
- engravings — Gold-filled lettering: "DUW 6101", the movement number, "42 RUBINE", "MADE IN GERMANY", "REGULIERT IN 6 LAGEN".
Automatic winding
- rotor — Winding rotor: a half-moon weight on a ball bearing that swings with every wrist movement and winds the mainspring in both directions; its rim carries the raised gold "NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE".
- rotor-bearing — Rotor ball bearing: the fixed centre (three screws, jewel) on which the rotor turns on a ring of steel balls; locked in with a bayonet ring.
- reversing-wheels — Double-click wheel (Doppelklinkenrad): turns the rotor's back-and-forth swings into one-way winding; the small gilt wheel by the hub.
- winding-train — Reduction wheels: a chain of jewelled wheels that slows the rotor down about 120 times so it can wind the strong mainspring.
Power and hand winding
- barrel — Mainspring barrel: toothed drum holding the mainspring; it turns once every 7 hours and drives the gear train.
- mainspring — Mainspring: the coiled steel ribbon storing the energy; up to about 50 hours when fully wound (it slips in the barrel when full).
- ratchet-wheel — Ratchet wheel: on the barrel arbor, hidden under the plate; winding turns it to coil the spring, a click stops it running back.
- crown-wheel — Crown wheel: sunburst-finished wheel under a polished cap, turned by the winding pinion when you wind by hand.
- winding-idlers — Winding idler wheels: two small steel wheels that carry the crown wheel's motion over to the ratchet wheel.
- winding-stem / winding-pinion / sliding-pinion — Stem and clutch: the crown's rod with the pinion that winds, and the sliding clutch that switches between winding, date setting and time setting.
- setting-lever / yoke / keyless-springs — Levers and springs that move the clutch when you pull the crown to its three positions.
Gear train
- center-wheel — Centre wheel: turns once an hour and carries the minute hand (via the cannon pinion).
- third-wheel — Third wheel: speeds the motion up 7.5× between the centre and fourth wheels; one turn every 8 minutes.
- fourth-wheel — Fourth wheel: turns once a minute and carries the small-seconds hand at 6 o'clock.
Escapement and regulation
- escape-wheel — Escape wheel: 15-tooth steel wheel released half a tooth at a time, 6 times a second.
- pallet-fork — Pallet fork: rocking lever with two ruby pallets that locks/unlocks the escape wheel and gives the balance its push.
- balance-wheel — Balance: the gold three-arm wheel swinging 3 times a second — the watch's timekeeper.
- hairspring — Blue balance spring (NOMOS swing system, made in-house): sets the balance's rhythm.
- roller — Roller and impulse jewel: the ruby pin on the balance staff that trades pushes with the fork.
- regulator — DUW regulation system: two rings on the bridge (spring key for rate, stud carrier for beat), moved with pliers; no screw.
- shock-absorber — Incabloc shock protection: spring-mounted jewel setting that lets the balance pivot move aside and recentre after a knock.
- stop-seconds-lever — Stop-seconds lever (hidden): touches the balance in crown position 3 so you can set the time to the second.
Motion works
- cannon-pinion — Cannon pinion: rides on the centre arbor by friction, carries the minute hand and drives the hour gearing.
- minute-wheel — Minute wheel: reduces the minute motion 12:1 for the hour hand.
- hour-wheel — Hour wheel: carries the hour hand; one turn every 12 hours.
Date
- date-ring — Date ring: thin white ring around the movement (Ø34 here) with 31 internal teeth and two red marks that frame today's date through the slots at the dial edge.
- date-wheels — Date switching wheel: a patented two-level wheel with a triangular cam and a pivoting click that pushes the ring on one tooth around midnight (≈30 min).
- date-jumper — Ring jumper (EST): a spring detent that holds the ring exactly on each date and snaps it home at the end of a change.
- quick-set-star — Date corrector: 5-armed star driven from the crown in position 2 that moves the ring a day forwards or backwards.

=====================================================================
8. OPEN QUESTIONS / UNCERTAINTIES
=====================================================================
1. Power reserve 50 h (NOMOS, this variant) vs 42 h (all other sources). Barrel turns depend on it.
2. "16 lines" on the 34/42 page contradicts 34.0 mm (≈15 lignes); 34.0 mm is supported by Monochrome. Core plates are the
   unchanged Ø35.2-caliber plates (pillar plate Ø31.1); only the date ring shrinks.
3. Absolute scale ±0.7 % (56.34 vs 56.67 px/mm). All positions scale together; I followed the exterior report's scale.
4. ALL tooth counts except the crown wheel (42) and escape wheel (15) are estimates; the going-train set is the 7001-derived
   one; idler 2 and the ratchet are inferred from centre distances; the automatic train's topology and ratio (1:120) are guesses.
5. Identity of jewelled pivots A–D, of the barrel arbor (−2.19, 5.65) and of the third wheel (−0.42, −4.22) is inferred, not documented.
6. Rotor outline ±0.3 mm (from render + rectified photo); thickness, material, mass are estimates; the rotor angle of 71.8° is
   only the photo pose.
7. Dial-side date works: positions of the program disk, jumper and support jewels are estimates; the Altherr "turns four times
   a day" remark is unexplained; the exact switching profile is not published (only "about 30 minutes").
8. "Bajonett" meaning (bayonet rotor-bearing lock) is inferred from the renders.
9. Two blued screws (S6, S7) under the rotor are located from a rectified photo (±0.3 mm); "REGULIERT IN 6 LAGEN" angles ±3°.
10. Stack heights are estimates; with ZB0 4.45 the rotor nearly touches the back glass (0.05 mm).
11. The Hodinkee/Crown & Caliber "Technical Review" of the DUW 6101 (2020) could not be retrieved (Wayback rate-limited); it may
    describe the date program disk in more detail.

=====================================================================
SPEC DATA
=====================================================================
JS module validated with node (modules, rates 21,600 A/h, 12:1, rotor centroid on −Y). Drop into
src/watches/tangente-update-147/spec.js beside the exterior SPEC (merge `MOVEMENT_147` into `SPEC`; the kinematics keys
`timing train keyless automatic arbors powerReserveHours barrelTurns` are in the engine's format).

```js
// ===================================================================================
// NOMOS Tangente neomatik 38 Update, ref. 147 — caliber DUW 6101 ("34/42" variant:
// Ø34.0 mm incl. date ring, 3.6 mm, 42 jewels, bayonet-fitted rotor bearing).
// MOVEMENT data only (case / dial / hands: see exterior.md in the same folder).

// FRAME (CONTRACT.md): units mm; +Z out of the dial; 12 o'clock = +Y; 3 o'clock (crown) = +X.
// z = 0 is the DIAL-SIDE face of the pillar plate; dial side z > 0, movement side z < 0.
// Back-view measurements (case back up, crown on the LEFT) are converted with B().
// Scale: official render DUW_6101_Boden_01_Bajonett_42Rubine at 56.34 px/mm, hand axis at
// px (1277.5, 1238.2), tied by a similarity fit (12 features, residual ≤0.1 mm, rotation
// 0.0°) to the ref.147 case-back render at 23.50 px/mm — the SAME scale the exterior report
// uses (lug-to-lug 47.3). Absolute scale ±0.7 %; positions ±0.1 mm (jewels, screws),
// ±0.3 mm (outlines). MEAS = measured; EST = engineering estimate.
// Recommended exterior constant: ZB0 = 4.45 (pillar-plate dial face 4.45 above the case-back
// face) — see movement.md §6.
// ===================================================================================

const B = (x, y) => [-x, y]; // back-view measurement -> dial-side frame
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const DEG = Math.PI / 180;
const clockBack = (deg, r) => B(r * Math.sin(deg * DEG), r * Math.cos(deg * DEG)); // back-view clock angle

// ---------------------------------------------------------------- arbor layout
const P = {
  // going train (MEAS jewel centres; third & barrel partly hidden, see report §3)
  center: [0, 0],
  third: B(-0.42, -4.22), // jewel peeks out from under the rotor collar; lower jewel seen dial side
  fourth: [0.00, -7.20], // small seconds: jewel 7.20 below centre = seconds pin of the ref.147 dial render (7.19)
  escape: B(3.21, -7.38),
  pallet: B(5.81, -6.08),
  balance: B(8.81, -4.34), // rim-fit centre & cap jewel averaged
  barrel: B(-2.19, 5.65), // jewelled arbor (dial-side render + photo); barrel & ratchet hidden
  // keyless (MEAS; on top of the 3/4 plate, visible through the rotor window at the reference angle)
  crownWheel: B(-7.04, -0.07), // 42 t (FFT 41.75)
  windIdler1: B(-8.50, 3.97), // single-screw steel wheel, ~20 t (±2)
  windIdler2: B(-7.59, 6.31), // steel wheel under a polished half-moon cap, ~16 t (EST from geometry)
  windingPinion: [10.04, 0.00], // on the stem, seen through the slot below
  slidingPinion: [9.00, 0.00], // dial side (EST)
  settingLeverPin: [7.95, 2.92], // dial side (MEAS on dial-side render, identity EST)
  // automatic winding (MEAS positions, identities EST)
  reverser: B(3.38, 3.24), // gilt ~20 t wheel + steel ratchet star ~16 t ("Doppelklinkenrad")
  autoA: B(4.51, 1.72),
  autoB: B(5.91, 5.14),
  autoC: B(6.08, 8.90),
  autoD: B(4.03, 9.88),
  // dial side (MEAS on the official dial-side render; already dial frame)
  minuteWheel: [2.13, -2.12],
  dateDrive: [-3.41, -0.65], // gilt wheel Ø3.65 with steel star + blue screw (identity EST)
  dateSwitch: [-8.25, 1.51], // "Datumschaltrad"/program disk under the date bridge (EST ±1 mm)
  quickSetStar: [8.05, -4.43], // 5-arm steel star (date corrector, identity EST)
  quickSetIdler: [8.85, -2.21],
};

// ---------------------------------------------------------------- tooth counts (EST)
// NOMOS publishes none. Going train = the ETA/Peseux 7001-derived set already used for the
// Tangente 139 (pinions of 14-16 leaves and wheels of ~110-130 fine teeth are visible in
// NOMOS's own DUW 6101 gear-train photo). Rates are exact: centre 1/h, fourth 1/min,
// escape 12 rpm, 21,600 A/h. Barrel 7 h per turn.
const train = {
  barrel: { teeth: 126 },
  center: { teeth: 120, pinion: 18 },
  third: { teeth: 112, pinion: 16 },
  fourth: { teeth: 120, pinion: 14 },
  escape: { teeth: 15, pinion: 10 },
  cannon: { teeth: 12 },
  minuteWheel: { teeth: 40, pinion: 10 },
  hourWheel: { teeth: 36 },
};
const keyless = {
  windingPinion: { teeth: 15 }, // EST
  crownWheel: { teeth: 42 }, // MEAS
  windIdler1: { teeth: 20 }, // MEAS ±2
  windIdler2: { teeth: 16 }, // EST (same module as the other two meshes)
  ratchet: { teeth: 62 }, // EST (fits the idler2 -> barrel-arbor distance; tip Ø ≈ 8.9)
  slidingPinion: { teeth: 12 }, // EST
};

const mod = (d, z1, z2) => (2 * d) / (z1 + z2);
const modules = {
  barrel: mod(hyp(P.barrel, P.center), train.barrel.teeth, train.center.pinion),
  center: mod(hyp(P.center, P.third), train.center.teeth, train.third.pinion),
  third: mod(hyp(P.third, P.fourth), train.third.teeth, train.fourth.pinion),
  fourth: mod(hyp(P.fourth, P.escape), train.fourth.teeth, train.escape.pinion),
  motionA: mod(hyp(P.center, P.minuteWheel), train.cannon.teeth, train.minuteWheel.teeth),
  motionB: mod(hyp(P.center, P.minuteWheel), train.minuteWheel.pinion, train.hourWheel.teeth),
  keylessA: mod(hyp(P.crownWheel, P.windIdler1), keyless.crownWheel.teeth, keyless.windIdler1.teeth),
  keylessB: mod(hyp(P.windIdler1, P.windIdler2), keyless.windIdler1.teeth, keyless.windIdler2.teeth),
  keylessC: mod(hyp(P.windIdler2, P.barrel), keyless.windIdler2.teeth, keyless.ratchet.teeth),
};

// Extra driven arbors for kinematics (period s/turn, dir +1 = CCW seen from the dial). EST.
const arbors = {
  dateSwitch: { period: 86400, dir: -1 }, // carrier wheel with triangular cam + pivoting click: 1 turn/day
  dateDrive: { period: 21600, dir: +1 }, // lower stacked wheel "turns four times a day" (Altherr) — LOW
};

// ---------------------------------------------------------------- vertical stack (EST)
// Movement height 3.60 = dial-side works 0.40 + movement side 3.20.
const z = {
  // dial side (z > 0)
  plateDialFace: 0,
  dialSideBridges: [0.0, 0.18], // steel date bridge / keyless cover plates
  dateRing: [0.18, 0.38], // 0.20 thick; red markers printed on its dial face (z 0.38)
  dateWorks: [0.02, 0.36], // program-disk stack (two wheels + cam + click), date-drive wheel
  quickSetStar: [0.20, 0.36],
  hourWheel: [0.04, 0.14], hourPipeTop: 1.34,
  cannonPinion: [-0.12, 1.64], cannonLeaves: [-0.12, 0.02],
  minuteWheel: [-0.10, 0.0], minutePinion: [0.0, 0.14],
  dialSeat: 0.45, // dial underside (EST); dial 0.35 thick -> dial top 0.80
  secondsPivotTop: 0.85,
  // movement side (z < 0)
  mainPlate: [-0.95, 0],
  stemAxis: -1.09, // = exterior crown axis (zb 3.36) with ZB0 4.45
  centerWheel: -1.04, // L0 [-1.10,-0.98]: centre wheel, escape wheel, pallet fork, roller
  fourthWheel: -1.24, // L1 [-1.30,-1.18]
  thirdWheel: -1.44, // L2 [-1.50,-1.38]
  escapeWheel: -1.04,
  pinionOf: {
    center: [-1.32, -1.14], // meshes the barrel teeth
    third: [-1.12, -0.96], // meshes the centre wheel (L0)
    fourth: [-1.52, -1.36], // meshes the third wheel (L2)
    escape: [-1.32, -1.16], // meshes the fourth wheel (L1)
  },
  barrel: [-1.95, -1.05], barrelTeeth: [-1.30, -1.16], barrelLid: [-1.95, -1.90],
  palletFork: -1.04, roller: -1.05,
  balanceRim: -1.72, // rim [-1.94,-1.50]
  hairspring: -2.02, // [-2.06,-1.98]
  ratchetWheel: [-2.10, -1.98], // hidden between barrel and 3/4 plate (DUW 3001-style flat ratchet)
  threeQuarterPlate: [-2.45, -2.10],
  palletBridge: [-1.60, -1.30],
  balanceBridge: [-2.45, -2.12], regulatorRings: [-2.53, -2.45], shockTop: -2.58,
  crownWheel: [-2.45, -2.27], crownWheelCover: [-2.55, -2.45],
  windIdlers: [-2.45, -2.27], windIdlerCaps: [-2.55, -2.45], giltWindingWheels: [-2.27, -2.15],
  reverser: [-2.45, -2.20], reverserStar: [-2.52, -2.45],
  screwHeads: [-2.58, -2.45],
  bearingFixedDisc: [-2.75, -2.45], bearingScrewTop: -2.80,
  rotorCollar: [-2.95, -2.62],
  rotorBar: [-2.95, -2.65],
  rotorRimTop: -3.15, rotorRimUnder: -2.65, // over the 3/4 plate (clears screw heads at -2.58)
  rotorRimUnderOuter: -2.30, // skirt beyond r 13.7 (over the pillar-plate ring)
  rotorBevelOuterTop: -2.85, // bevel from the flat (z -3.15) down to the outer edge (z -2.85)
  rotorLettersTop: -3.20, // embossed gold letters = movement's back extreme
};

// ---------------------------------------------------------------- explode (suggested)
const explode = {
  'date-ring': [0, 0, 14], 'date-wheels': [0, 0, 11], 'dial-side-bridges': [0, 0, 9],
  'hour-wheel': [0, 0, 17], 'cannon-pinion': [0, 0, 19], 'minute-wheel': [0, 0, 15],
  'setting-lever': [0, 0, 6], yoke: [0, 0, 7], 'sliding-pinion': [3, 0, 5], 'winding-pinion': [5, 0, 5],
  'winding-stem': [7, 0, 0],
  'main-plate': [0, 0, 0],
  'center-wheel': [0, 0, -6], 'fourth-wheel': [0, 0, -7.5], 'third-wheel': [0, 0, -9], 'escape-wheel': [0, 0, -10],
  barrel: [0, 0, -8], mainspring: [0, 0, -11], 'barrel-cover': [0, 0, -13], 'ratchet-wheel': [0, 0, -15],
  'pallet-fork': [0, 0, -12], 'pallet-bridge': [0, 0, -15.5],
  'balance-wheel': [0, 0, -18], hairspring: [0, 0, -20], 'balance-bridge': [0, 0, -24], regulator: [0, 0, -26], 'shock-absorber': [0, 0, -27],
  'three-quarter-plate': [0, 0, -21], 'plate-screws': [0, 0, -28],
  'crown-wheel': [0, 0, -29], 'reversing-wheels': [0, 0, -29], 'winding-train': [0, 0, -28.5],
  'rotor-bearing': [0, 0, -33], rotor: [0, 0, -38],
};

export const MOVEMENT_147 = {
  caliber: 'DUW 6101',
  variant: '34/42 (Ø34.0 incl. date ring, 42 jewels, bayonet rotor fitting)',
  movementSerial: '30264', // ref.147 case-back render ("N° 30264"); the generic render shows 30130
  powerReserveHours: 50, // NOMOS ref.147 & DUW 6101 34/42 pages; other DUW 6101 pages and reviews say 42
  barrelTurns: 50 / 7, // 7.14 turns at 7 h/turn (126/18)
  timing: { beatsPerHour: 21600, amplitudeDeg: 285, liftDeg: 50, forkHalfDeg: 6.75 },
  train, keyless, modules, arbors,
  automatic: {
    naturalPeriod: 0.29, // physical-pendulum estimate; the engine default 1.1 reads better on screen
    damping: 0.15,
    ratchetPerRotorRad: 1 / 120, // EST overall rotor -> barrel-arbor reduction
    windPerRad: 1 / (120 * 2 * Math.PI * (50 / 7)), // ≈1.86e-4 reserve fraction per rotor radian
    rotorRefRotDeg: 71.8, // rot.z reproducing the rotor angle of every official render / the ref.147 back
    reverserRatio: 0.5, // EST: visible gilt reverser ω = +0.5·ω_rotor; its steel star turns one way at 0.5·|ω_rotor|
  },
  layout: P,
  z, explode,
  explodeDelay: (id) => { const e = explode[id]; return e ? Math.min(0.95, Math.max(0, 1 - Math.hypot(...e) / 55)) : 0.5; },

  movement: {
    radius: 17.0, // Ø34.0 = date-ring OD (core = the Ø35.2 DUW 6101 with a smaller date ring)
    height: 3.6,
    jewels: 42,
    parts: 188, // original 27-jewel DUW 6101 (Caliber Corner / Revolution); 42-jewel count unknown
    ribbing: { uvScale: 1 / 9.2, uvAngle: +30 * DEG }, // bands DESCEND to the right in back view (~30°): opposite sense to the DUW 4001
    perlageUvScale: 1 / 3.2,
  },

  frame: {
    pillarPlateRadius: 15.54, // perlage ring visible between the 3/4 plate and this radius
    pillarHoles: [
      { at: B(-0.16, 14.58), r: 0.25 }, // casing-screw thread (the ref.147 back shows a slotted steel screw here, head Ø≈2.1)
      { at: B(13.47, 4.78), r: 0.70 }, // through hole
    ],
    casingScrew: { at: B(-0.15, 14.53), headDiameter: 2.1 }, // plain steel, slotted; half under the case-back ring
    threeQuarterPlateRadius: 13.63,
    // Region removed from the 3/4-plate disc on the balance side (dial frame; the extra points
    // outside the plate radius make the cut run off the edge). Inside it: pillar plate (perlage),
    // balance, pallet bridge, balance bridge.
    threeQuarterCut: [B(6.69, -11.82), B(5.41, -10.62), B(5.36, -9.41), B(5.31, -8.62), B(4.41, -7.61),
      B(3.95, -6.02), B(3.86, -4.31), B(3.90, -2.50), B(4.41, -0.80), B(5.51, 0.60), B(7.01, 1.21),
      B(8.52, 1.30), B(9.62, 1.21), B(10.37, 0.75), B(10.57, 1.70), B(10.87, 2.55), B(13.28, 2.91),
      B(14.69, 2.91), B(14.69, -14.69), B(6.69, -14.69)],
    // 0.18-deep recess in the 3/4-plate top for the hand-winding wheels; through-slot for the winding pinion
    crownRecess: [
      { c: P.crownWheel, r: 3.27 },
      { c: P.windIdler1, r: 1.76 },
      { c: P.windIdler2, r: 1.56 },
    ],
    windingPinionSlot: { x: [9.72, 10.37], y: [-1.45, 1.80] }, // dial-frame x
    reverserWindow: { c: B(3.32, 3.32) },
    reverserWindowRadius: 1.46,
    bearingSeat: { c: [0.00, 0.00], r: 2.43 },
    balanceBridge: {
      // two-sided NOMOS balance bridge, one blued screw at each end; boss round the balance staff
      outline: [B(10.87, 2.55), B(13.28, 2.86), B(13.28, -0.05), B(12.37, -0.30), B(10.47, -2.96),
        B(10.87, -4.34), B(10.39, -5.66), B(9.26, -6.32), B(8.32, -8.62), B(8.82, -10.57), B(6.51, -12.17),
        B(5.41, -10.62), B(5.36, -9.41), B(5.91, -8.42), B(7.01, -6.12), B(7.02, -5.37), B(6.75, -4.34),
        B(7.02, -3.31), B(7.79, -2.54), B(8.81, -2.27), B(9.62, -2.15), B(10.37, 0.75), B(10.57, 1.70)],
      boss: { c: P.balance, r: 2.06 },
      screws: [B(12.14, 1.05), B(6.75, -10.16)],
    },
    palletBridge: [B(4.43, -5.33), B(5.23, -4.93), B(6.74, -6.24), B(6.24, -7.14), B(5.23, -6.94)], // EST outline
    blueScrews: [B(-0.11, 12.13), B(11.44, 4.19), B(12.14, 1.05), B(6.75, -10.16), B(4.11, -11.53),
      B(-11.70, 3.56), B(-10.78, -5.41)], // last two hidden under the rotor at the reference angle
    blueScrewHeadDiameter: 1.46, // all seven sit on r ≈ 12.2 (two hidden by the rotor at the reference angle)
    steelScrews: {
      crownWheelCover: [B(-7.04, 1.03), B(-7.04, -1.13)],
      crownWheelCoverHeadDiameter: 1.11,
      windIdler1: [B(-8.50, 3.97)],
      bearing: [clockBack(92, 1.38), clockBack(211, 1.38), clockBack(331, 1.38)], // FIXED to the plate, do not rotate
      bearingHeadDiameter: 1.31,
    },
    crownWheelCoverDisc: { c: P.crownWheel, r: 2.03 }, // polished, fixed
    upperJewels: { // visible from the back: pink rubies in polished sinks, no chatons
      third: P.third, fourth: P.fourth, escape: P.escape, pallet: P.pallet, balanceCap: B(8.82, -4.28),
      autoA: P.autoA, autoB: P.autoB, autoC: P.autoC, autoD: P.autoD, barrel: P.barrel, center: [0, 0],
    },
    jewelDiameters: { large: 1.16, medium: 1.01, small: 0.55 },
    engravings: {
      // gold-filled, DIN-like capitals; all read correctly from the BACK
      block: [{ text: 'DUW 6101', at: B(-6.73, -5.36), align: 'left' }, { text: 'N° {movementSerial}', at: B(-6.73, -6.56), align: 'left' }],
      blockCapHeight: 0.83,
      rubine: { text: '42 RUBINE', backClockDeg: [23.1, 49.8], reads: 'clockwise in back view, letter tops outward' },
      rubineGeom: { radius: 12.60, capHeight: 0.85 },
      madeIn: { text: 'MADE IN GERMANY', backClockDeg: [174, 148.3], reads: 'counter-clockwise in back view, tops toward the axis' },
      madeInGeom: { radius: 14.56, capHeight: 0.50 },
      regulated: { text: 'REGULIERT IN 6 LAGEN', backClockDeg: [214, 186], reads: 'EST same ring and style as MADE IN GERMANY' }, // under the rotor at the ref angle
      regulatedGeom: { radius: 14.56, capHeight: 0.50 },
    },
  },

  escapement: {
    palletToEscape: hyp(P.escape, P.pallet),
    escapeTipRadius: hyp(P.escape, P.pallet) * Math.cos(30 * DEG), // pallets embrace 2.5 teeth
    palletToBalance: hyp(P.pallet, P.balance),
    rollerJewelRadius: 0.73,
    balanceArms: 3, balanceRimHeight: 0.44,
    balanceGeom: { radius: 4.70, rimWidth: 0.32 }, // OD as the DUW 4001 swing-system balance
    hairspring: { innerRadius: 0.45, outerRadius: 2.2, terminalRadius: 2.9, coils: 13, height: 0.08, thickness: 0.035 },
    regulatorKey: B(7.95, -1.43), // gold spring-key block, ~11:20 of the balance (back view)
    studCarrier: B(5.86, -4.20), // ~9:00 of the balance (back view)
  },

  rotor: {
    // LOCAL frame = dial-frame orientation with the heavy rim at −Y (CONTRACT: rot 0 hangs to 6 o'clock).
    // Every official render and the ref.147 case back show the rotor at rot.z = +71.8°.
    radii: { collar: 4.02, collarInner: 3.47, rimInner: 10.20, rimFlatInner: 11.55, rimFlatOuter: 13.67, outer: 15.56 },
    outline: [[15.56, -0.10], [15.50, -1.33], [15.35, -2.54], [15.10, -3.74], [14.77, -4.93], [14.32, -6.08], [13.80, -7.18], [13.20, -8.25], [12.50, -9.25], [11.74, -10.22], [10.89, -11.10], [9.99, -11.93], [9.02, -12.68], [8.00, -13.35], [6.92, -13.94], [5.79, -14.44], [4.65, -14.86], [3.46, -15.17], [2.25, -15.40], [1.04, -15.53], [-0.19, -15.56], [-1.42, -15.50], [-2.64, -15.34], [-3.83, -15.08], [-5.01, -14.74], [-6.16, -14.29], [-7.26, -13.76], [-8.32, -13.15], [-9.33, -12.45], [-10.28, -11.68], [-11.17, -10.83], [-11.99, -9.92], [-12.73, -8.94], [-13.40, -7.92], [-13.98, -6.84], [-14.47, -5.71], [-14.88, -4.56], [-15.19, -3.37], [-15.41, -2.16], [-15.53, -0.95], [-12.13, 0.17], [-11.26, 0.11], [-9.56, 0.09], [-7.74, 0.33], [-5.59, 0.92], [-3.92, 1.31], [-3.54, 1.90], [-3.17, 2.47], [-2.70, 2.99], [-2.15, 3.40], [-1.54, 3.72], [-0.89, 3.92], [-0.20, 4.02], [0.49, 3.99], [1.17, 3.85], [1.80, 3.60], [2.39, 3.24], [2.91, 2.79], [3.34, 2.24], [3.67, 1.64], [4.27, 1.09], [5.26, 0.67], [7.28, 0.29], [9.55, -0.13], [12.31, -0.40], [13.21, -0.88]],
    window: [[3.09, -2.57], [2.69, -3.00], [2.23, -3.35], [1.73, -3.63], [1.19, -3.84], [0.62, -3.97], [0.04, -4.02], [-0.53, -3.98], [-1.11, -3.87], [-1.65, -3.67], [-2.16, -3.39], [-2.63, -3.05], [-3.04, -2.64], [-3.38, -2.17], [-3.66, -1.67], [-3.86, -1.13], [-5.45, -1.06], [-7.42, -1.49], [-9.77, -2.04], [-9.84, -2.70], [-9.54, -3.61], [-9.15, -4.50], [-8.69, -5.34], [-8.15, -6.14], [-7.53, -6.88], [-6.85, -7.56], [-6.11, -8.18], [-5.30, -8.71], [-4.46, -9.17], [-3.57, -9.56], [-2.66, -9.85], [-1.71, -10.06], [-0.75, -10.17], [0.21, -10.20], [1.18, -10.13], [2.12, -9.98], [3.06, -9.73], [3.96, -9.39], [4.83, -8.98], [5.65, -8.49], [6.44, -7.92], [7.15, -7.27], [7.81, -6.57], [8.39, -5.79], [8.90, -4.98], [9.33, -4.11], [9.68, -3.22], [9.94, -2.29], [9.43, -2.06], [7.82, -1.96], [6.43, -1.90], [5.38, -1.93]],
    text: { text: 'NOMOS GLASHÜTTE DEUTSCHE UHRENWERKE', relief: 0.05,
      // local-frame angles (CCW from +X, dial-frame orientation): first "N" at −8.6°, last "E" at −173.1°;
      // seen from the BACK it reads counter-clockwise with letter tops toward the axis.
      firstLetterDeg: -8.6, lastLetterDeg: -173.1 },
    textGeom: { radius: 12.62, capHeight: 1.06 },
    bearing: { balls: 9 },
    bearingGeom: { fixedDiscRadius: 2.43, ballPathRadius: 2.57, ballDiameter: 0.25, bayonetRing: [2.72, 3.46] },
    massG: 1.1, // EST (rhodium-plated brass, ~130 mm³); centre of mass r ≈ 7.2 mm (uniform) to 8 mm (heavier rim)
  },

  date: {
    // NOMOS ring date ("Update"): 31 printed numerals + 31 slots in the dial (exterior); the
    // movement's date ring shows two red marks through the slots either side of today's numeral.
    ringOuterRadius: 17.0, // official Ø34.0
    ringGeom: { faceInnerRadius: 12.27, toothTipRadius: 11.67 }, // measured on the Ø35.2 dial-side render (same core)
    teeth: 31, thickness: 0.20,
    stepDeg: 360 / 31, // 11.6129°; ring turns CLOCKWISE seen from the dial (kinematics rot.date = −2π·datePos/31)
    markerRadius: [16.15, 16.93], markerSpanDeg: 7.0, // = exterior.md suggestion; dial slots r 16.25-16.83, 6.0° long
    markerLocalDeg: [84.19, 72.58], // ring-local centres (CCW from +X) at rot.date = 0 (day 1): slots 31|1 and 1|2
    colours: { ring: '#E4E4E4', marker: '#C80E16' }, // as exterior.md (matte white disc, red print)
    supportJewels: { count: 5, radius: 11.35 }, // EST positions (Fratello: five rubies support the ring)
    switching: { startLocal: '23:45', endLocal: '00:15', note: 'EST: NOMOS says the switch takes ~30 min; do-not-set window 23:15-00:45' },
    quickSet: { crownPosition: 2, bothDirections: true, datesPerCrownTurn: 1 }, // per-turn value EST
  },
};
```
