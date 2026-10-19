# TUDOR BLACK BAY PRO ref. M79470-0004 — MOVEMENT RESEARCH: Manufacture Calibre MT5652 (COSC)

Researcher: movement agent (exterior covered elsewhere). Date: 2026-10-16.

Tags: [H] high, [M] medium, [L] low confidence. **ESTIMATE** = not published; engineering value chosen to be
self-consistent. **MEAS** = my pixel measurement. Units mm.

Conventions (identical to the Tangente research, so `spec.js` patterns carry over):
- **Back view**: looking at the movement from the caseback side, 12 o'clock up, so the crown/stem is on the
  **LEFT (9 o'clock)**. Back-view coordinates (x_b, y): origin = movement centre (centre-wheel / seconds /
  rotor axis), x_b to the right, y to 12.
- **Dial frame** (the build frame of `CONTRACT.md`): x_dial = −x_b, y unchanged. Use `B(x,y) => [-x, y]`.
- **z**: z = 0 at the dial-side face of the main plate; dial side positive, movement (caseback) side negative.
- "Clock" positions in tables are back-view clock positions unless stated.

---------------------------------------------------------------------------------------------------
## 0. Identification verdict

| Item | Value | Source / confidence |
|---|---|---|
| Model | **TUDOR Black Bay Pro**, ref. **M79470-0004** (opaline "Polar" dial, 39 mm steel case, 24-h graduated fixed satin-brushed steel bezel, riveted steel bracelet with T-fit clasp, 14.6 mm case, 200 m) | tudorwatch.com product page https://www.tudorwatch.com/en/watches/black-bay-pro/m79470-0004 (fetched with curl + browser headers; WebFetch got 403) [H]; 2025 press kit https://media.tudorwatch.com/image/upload/fl_attachment/v1/tudorwatch/pressroom/products/black-bay-pro/2025/pdf/T25RP_Black-Bay-Pro_en.pdf [H] |
| Calibre | **Manufacture Calibre MT5652 (COSC)** — self-winding, bidirectional rotor, "built-in architecture" GMT (no add-on module) | same [H] |
| Not | NOT the MT5652-**U** (Master Chronometer/METAS, 65 h, tungsten rotor, "MASTER CHRONOMETER" engraving) used in the Pelagos FXD GMT / Northflag. Not MT5450-U (BB58 GMT). | Tudor pages + calibercorner [H] |
| Caseback | Solid screw-down steel (movement not visible on the real watch). | user brief + kits [H] |
| Ethos page | https://www.ethoswatches.com/product-tudor-black-bay-m79470-0004.html returned 403 to every fetch method; identity confirmed from Tudor + WatchBase/retailer snippets ("M79470-0004 Black Bay Pro … Polar … Bracelet", 2025). | [H] |

**Pitfall:** the 2025 Black Bay Pro press kit illustrates the movement with the MT5652-**U** render (rotor with three
straight slots, "MT5652 MASTER CHRONOMETER / TWENTY EIGHT 28 JEWELS"). I verified it is pixel-identical (corr 0.87,
same pose) to the 2024 Pelagos FXD GMT (MT5652-U) render. The COSC MT5652 that is actually inside M79470 looks like the
2018 official render / the teardown photos: four-kidney openwork rotor, bridges engraved "TUDOR", "GENEVA
SWITZERLAND", "MT5652 TWENTY-EIGHT 28 JEWELS". **Build that version.**

---------------------------------------------------------------------------------------------------
## 1. Calibre specifications

| Item | Value | Source |
|---|---|---|
| Name | MT5652 ("MT" = Manufacture TUDOR); produced by Kenissi (Tudor's movement maker, Le Locle/Geneva) | Tudor kits; calibercorner; grail-watch [H] |
| Family | MT56 (MT5602/5612/5621/5641/5652); MT5652 = date MT5612 architecture + integrated GMT, **+1.02 mm** thicker | professionalwatches 2018 https://professionalwatches.com/baselworld-2018-tudor-black-bay-gmt/ [H] |
| Total diameter | **31.8 mm** (14 lignes) | Tudor kits 2018/2022/2025 [H] |
| Thickness | **7.52 mm** | Tudor kits [H]. (grail-watch's 6.5 mm is the MT5612 value — wrong for 5652) |
| Jewels | **28** (engraved "TWENTY-EIGHT 28 JEWELS") | Tudor kits + teardown photo [H]. (grail-watch/watchbase "26" is wrong) |
| Frequency | **28,800 vph = 4 Hz** (8 beats/s) | Tudor [H] |
| Power reserve | **≈70 h** ("weekend-proof") | Tudor M79470-0004 page + kits [H] (MT5652-U: 65 h — different calibre) |
| Certification | **COSC** chronometer (−4/+6 s/d uncased); Tudor in-house cased standard −2/+4 s/d. **No METAS.** | Tudor kits [H] |
| Functions | Central hours (**local hour hand, jumping, settable ±1 h steps**), central minutes, central seconds (direct drive), **central 24-h (GMT/reference) hand**, **instantaneous date at 3 o'clock** "without non-correction range, synchronised on the jumping hour hand" (goes back a day when the local hand is set back past midnight), **stop-seconds** | Tudor kit 2025 spec table + product page + user guide [H] |
| Oscillator | **Variable-inertia balance with micro-adjustment screws** (free-sprung, no regulator index), **non-magnetic silicon balance spring** | Tudor [H] |
| Balance bridge | **Traversing (full) balance bridge with two-point fixation** | Tudor [H] |
| Winding | Self-winding, **bidirectional** rotor; hand-windable via crown pos. B | Tudor [H] |
| Shock protection | Incabloc-type (render shows the lyre spring on the balance cap) | calibercorner [M] + render [M] |
| Lift angle | not published; **ESTIMATE 52°** (Rolex-family practice) | calibercorner "unconfirmed" [L] |
| Finishing (COSC MT5652) | "Openwork rotor **satin-brushed with sand-blasted details**; bridges and mainplate with **alternate polished / sand-blasted surfaces and laser decorations**" (laser "sun" stripes on the outer bridge flanges). Screws polished steel (not blued). Gilt train wheels & balance. | 2018 BB GMT kit https://media.tudorwatch.com/image/upload/fl_attachment/v1/tudorwatch/pressroom/products/black-bay-gmt/pdf/bw18-tudor-black-bay-gmt-en.pdf [H]; renders [H] |
| Rotor material | Not stated for the COSC MT5652 (2018 kit says only "satin-brushed"). The **tungsten monobloc** rotor is stated for the -U versions only. Treat as heavy-metal-look steel; **unknown**. | [L] |
| Rotor bearing | Hub shows concentric races + ball ring → **ball bearing** (type/material unpublished; not "ceramic" in any source) | render [M], material unknown |
| Hand-setting | Crown positions (Tudor guide): **A** screwed down; **B** manual winding; **C** (1st notch): local hour hand jumps in 1-h steps either direction, date follows, watch keeps running; **D** (2nd notch): **hacking**, set reference time — minute hand + 24-h hand (+ the local hour hand moves with them) | user guide https://media.tudorwatch.cn/image/upload/v1/tudorwatch/modelpage/userguides/tudor-userguides-en.pdf pp. 22–27 [H] |
| GMT mechanism lineage | Teardown author: "GMT wheel design similar to the Rolex 3185" | dtk時計修理 blog https://ameblo.jp/t-watch-blog/entry-12893234078.html [M] |
| Parts count, tooth counts, barrel/mainspring data | **Not published anywhere** (no Tudor/Kenissi technical doc is public). | — |

---------------------------------------------------------------------------------------------------
## 2. Images used (all saved in `…/scratchpad/img/tudor-m79470/`, names `mov_*`)

Orientation rule for official renders below: rotate the raw image **+112° CCW** about its centre pixel to get the
back view with the stem at 9 o'clock (stem direction fixed from the teardown photos, where the stem is visible).

| File | What | px/mm | Centre px | Notes |
|---|---|---|---|---|
| `mov_pw2018_mt5652.jpg` (2500²) | **Official Tudor MT5652 render** (Baselworld 2018 kit image) via https://professionalwatches.com/wp-content/uploads/2018/05/Tudor-Caliber-MT5652.jpg | **56.58** (plate Ø31.8 = 2×899.7 px; rotor appears 1 % larger = perspective) | **(1253.3, 1240.0)** | Main measurement source; rotate +112° |
| `mov_mt5652_video.mp4` (1500², 1.835 s, 29.97 fps) | Official tudorwatch.com MT5652 feature video (rotor swinging) https://media.tudorwatch.com/video/upload/v1789329420/tudorwatch/watches/model-page/features/movement/movements-mt5652-movement.mp4 | 34.42 | (746.6, 747.7) | same pose as the 2018 render |
| `mov_vf_t{0.0…1.8}.jpg` (1500²) | 23 frames of that video extracted server-side (`/video/upload/so_<t>,q_100/…jpg`) | 34.42 | (746.6, 747.7) | rotor poses −6°…+84°; used for the rotor-free static composite |
| `mov_pw_mt5602_1u.jpg` (2500×2389) | Official MT5602-1U render (sister calibre, same frame/bridges family) https://professionalwatches.com/wp-content/uploads/2021/05/Tudor-caliber-MT5602-1U-cropped.jpg | 68.04 (after y×1.0066) | (1249.8, 1202.3) after y-scale | rotate +199.6° |
| `mov_pw_bbceramic_caseback.png` | Official BB Ceramic sapphire caseback (MT5602-1U) https://professionalwatches.com/wp-content/uploads/2021/05/Tudor-Black-Bay-Ceramic-caseback.png | — | — | oblique; context only |
| `mov_presskit2025_mt5652.png` (672²) | Image from the 2025 BB Pro press kit p.7 (actually the MT5652-U render) | 16.59 | (335.6, 335.4) | do **not** use for M79470 styling |
| `mov_presskit2024_mt5652u.jpg` (1148²) | MT5652-U render, Pelagos FXD GMT kit https://media.tudorwatch.com/image/upload/fl_attachment/v1/tudorwatch/pressroom/products/pelagos-fxd/2024/pelagos-fxd-gmt/pdf/New-watches-2024-Pelagos-FXD-GMT-en.pdf | 35.9 | (574, 573) | -U styling reference |
| `mov_tw_mt5612_focus.jpg`, `mov_tw_mt5602_focus.jpg`, `mov_tw_mt5450u_focus.jpg`, `mov_tw_mt5601_land.jpg`, `mov_tw_5612_*` | Official Tudor calibre images from https://www.tudorwatch.com/en/inside-tudor/watchmaking/tudor-manufacture-movement and …/movement-5612 | — | — | family context |
| `mov_blog_b01…b41.jpg` (1080×979 / 1080²) | **Teardown photos of an MT5652** (Black Bay GMT 79830RB), dtk時計修理 blog (link above): b01–b02 rotor off, b10–b16 bridges/train removed, b04–b09 & b17–b20 dial side, b21–b36 loose parts | ≈27–29.5 | b02: centre jewel (538.4, 426.7) | b02 registered to the render by a 6-jewel affine fit, **RMS 0.12 mm** |
| `mov_gr_*` | grail-watch family images (MT5612, MT5621, MT5641, Breitling B20, Norqain NN20/2) | — | — | context |
| **Derived, back view, final frame** | | | | |
| `mov_derived_backview_render_60pxmm.png` (+ `_grid`) | 2018 render rotated to back view | **60** | **(972, 972)** | crown at 9 o'clock |
| `mov_derived_backview_static_rotorless_60pxmm.png` | Static composite of 23 video frames (pixels that stay put while the rotor moves) — shows the movement under the rotor | 60 | (972, 972) | upper-right sector unreliable |
| `mov_derived_rotoroff_photo_backview_60pxmm.png` (+ `_grid`) | Teardown photo b02 (rotor removed) warped into the same frame | 60 | (990, 990) | bridges/jewels/screws |
| `mov_derived_rotor_local_60pxmm.png`, `mov_derived_rotor_local_overlay.png` | Render rotated into the **rotor-local** frame (heavy axis → +x, back view) with my rotor model overlaid | 60 | (972, 972) | rotor geometry check |
| `mov_derived_backview_mt5602_1u_60pxmm.png` | MT5602-1U render in the same frame | 60 | (972, 972) | |

Scripts: `…/scratchpad/tudor_scripts/` (outline/fit, jewels, Hough, affine registration, static composite, tooth
counting by periodogram + analytic-phase unwrapping).

---------------------------------------------------------------------------------------------------
## 3. Layout from the back (MEAS, back-view mm; dial frame = (−x, y))

Accuracy: ±0.15 mm for jewels measured on the render or on the registered photo; ±0.4–0.7 mm for parts seen only in
the partially-registered teardown steps; bridge outlines ±0.5 mm.

### 3.1 Arbors

| Part | x_b | y | r | Clock | Basis |
|---|---|---|---|---|---|
| Centre: centre wheel, **fourth (seconds) wheel**, cannon pinion, hour/24-h wheels, **rotor** | 0 | 0 | 0 | — | [H] |
| **Third wheel** (upper jewel) | **4.67** | **−0.99** | 4.77 | 3:24 | b02 jewel + b13 pivot (4.74, −0.92) [H] |
| **Escape wheel** (upper jewel) | **−3.19** | **−3.11** | 4.46 | 7:31 | b02 jewel [M-H]; meshes the central fourth wheel |
| **Pallet arbor** (jewel in the small polished pallet bridge) | **−2.25** | **−6.20** | 6.60 | 6:40 | render [M-H] |
| **Balance staff** (Incabloc cap jewel in the traversing bridge) | **−2.34** | **−9.28** | 9.57 | 6:28 | render + photo + video (3 sources ±0.05) [H] |
| Pallet stones (visible bodies) | entry ≈ (−1.0, −5.45), exit ≈ (−3.65, −6.0) | | | | render [M]; contact points derived (§5.4) agree within 0.3. Escape wheel turns CW (back view), so teeth reach the right-hand stone first = entry |
| **Barrel arbor / ratchet wheel** | **−1.0** | **7.6** | 7.67 | 11:45 | teardown b11/b13/b14 [M] (±0.4) — constrained by the barrel↔centre-pinion mesh |
| **Crown wheel** (steel, screwed) | **−6.4** | **5.6** | 8.50 | 10:22 | b11 [M] (±0.5); 5.76 mm from the ratchet = exact mesh |
| Winding intermediate wheel (small steel) | −8.8 | 3.1 | 9.33 | 9:39 | b11 [L-M] |
| Winding pinion on stem | ≈ −10.6 | 0 | — | 9:00 | ESTIMATE |
| Stem axis | y = 0, entering from x_b ≈ −15.9 | | | 9:00 | photos [H] |
| Automatic-train jewels (in the automatic bridge) | (−3.18, 4.97), (0.22, 6.77), (3.02, 9.69), (6.48, 7.74) | | 5.90 / 6.77 / 10.15 / 10.09 | | render + photo [H positions]; wheel roles ESTIMATE (§6.5) |
| Reduction wheel (gilt, visible above the auto-bridge edge at 12–1 o'clock) | 3.02 | 9.69 | | 12:35 | centred on the jewel, tip R ≈ 3.0–3.1 [M] |

Measured jewel list (rotor removed photo, registered): (0,0), (4.67,−0.99), (−3.19,−3.11), (−2.02,−6.96)* , (−2.34,−9.28),
(−3.18,4.97), (0.22,6.77), (3.02,9.69), (6.48,7.74). *pallet jewel appears 0.8 mm low in the photo because of parallax
(it sits ~1.5 mm below the bridges used for registration); use the render value (−2.25, −6.20).

### 3.2 Visible parts by region (back view, rotor removed)
- **Upper-left half (8 → 1 o'clock): automatic bridge** — sand-blasted; on its raised outer band (r 11.2–14.1, groove at
  r 11.2): **"TUDOR"** and **"GENEVA / SWITZERLAND"**. Carries four automatic-train jewels and one slotted screw at
  (−12.7, 3.1). A gilt reduction wheel peeks out past its upper-right edge at (0…6.5, 9.9…12.6).
- **Right half (1 → 5 o'clock): train bridge** — same raised band with **"MT5652 TWENTY-EIGHT 28 JEWELS"**. It extends
  across the centre (gilt rotor-post bushing with the fourth-wheel jewel at 0,0) and down-left to the escape jewel. Two
  windows: a **kidney window** at (6.6…9.9, −6.1…−0.4) showing the gilt **third-wheel rim**, and a **slot** at
  (−3.6…2.6, 3.1…4.6) showing gilt teeth of a central wheel.
- **Bottom (5 → 8 o'clock): traversing balance bridge** over the gold-coloured 4-arm balance; screws (−11.1, −10.15) and
  (4.92, −13.98); small polished **pallet bridge** under it at (−4.2…0.2, −7.3…−5.0).
- **Outer flange r 14.1–15.9** all round (except at the balance-bridge feet): laser "sun" radial stripes (outer ends of
  barrel/train bridges), with the ring of bridge screws at r ≈ 14.85.
- Main plate visible only at the outer edge (r 15.9).

### 3.3 Bridge outlines (back view; ESTIMATE ±0.5, traced on the registered photo + render) — see SPEC DATA
`automaticBridge`, `trainBridge`, `balanceBridge`, `palletBridge`, windows. Outer flange: annulus r 14.1–15.9.

### 3.4 Screws (slotted, polished steel; heads Ø ≈ 1.3–1.4 mm; MEAS ±0.3)

| # | x_b | y | r | Clock | Holds |
|---|---|---|---|---|---|
| 1 | −8.7 | 12.4 | 15.1 | 10:50 | barrel-bridge flange |
| 2 | −12.7 | 3.1 | 13.1 | 9:29 | automatic bridge |
| 3 | −14.8 | −2.7 | 15.0 | 8:39 | flange |
| 4 | −13.8 | −6.0 | 15.0 | 8:13 | flange |
| 5 | −11.1 | −10.15 | 15.0 | 7:34 | balance bridge (foot 1) |
| 6 | 4.92 | −13.98 | 14.8 | 5:21 | balance bridge (foot 2) |
| 7 | 9.3 | −11.5 | 14.8 | 4:42 | train-bridge flange |
| 8 | 11.7 | −9.1 | 14.9 | 4:16 | train-bridge flange |
| 9 | 11.0 | 6.2 | 12.6 | 2:00 | train/auto bridge junction |
| 10 | 11.8 | 7.6 | 14.0 | 1:50 | flange |
| 11 | −5.9 | 1.0 | 6.0 | 9:20 | train bridge (inner) |
| also | ratchet screw at the barrel arbor; crown-wheel screw (left-hand thread) at the crown wheel — under the automatic bridge |

### 3.5 Engravings (back view; positions MEAS ±0.3; text [H])
- Automatic bridge band: **"TUDOR"** — serif capitals (Tudor logotype style), cap height ≈ 1.4, on the arc r ≈ 12.6,
  T at ≈151°, R at ≈116° (reads clockwise), **letter tops outward**, engraved (dark-filled look on sand-blasted).
- Automatic bridge, 9 o'clock: **"GENEVA"** (outer line, centre ≈ (−13.6, −0.8)) and **"SWITZERLAND"** (inner line,
  centre ≈ (−12.3, −0.5)), sans-serif caps ≈ 0.75 high, rotated 90° CCW (read bottom→top, tops toward the rim).
- Train bridge band: **"MT5652 TWENTY-EIGHT 28 JEWELS"** — sans caps ≈ 0.9, along the arc r ≈ 12.9 from ≈ +16° ("M")
  clockwise to ≈ −55° ("S"), tops outward (reads clockwise).
- Rotor: **"TUDOR"** (§4).
- No serial number visible in any image (probably under the rotor or on the dial side — unknown).

---------------------------------------------------------------------------------------------------
## 4. Rotor (MEAS on the 2018 render in the rotor-local frame; ±0.2)

Rotor-local frame = back view rotated so the **heavy axis is +x**; in the official render the heavy axis points to
back-view **22°** (≈2:15 back view).

| Element | Geometry |
|---|---|
| Outline | **Half-disc**: straight diametral edge along local x = 0 (from y = −15.8 to +15.8), outer radius **15.8** |
| Hub boss | full circle **r 4.4** (protrudes past the straight edge on the light side); ball bearing inside (race rings at r ≈ 1.3, 2.4, 3.0, 3.4; ≈ 10 balls Ø0.45 on r ≈ 1.9 — ESTIMATE) |
| Web | r 4.4 → 12.6, satin-brushed (radial), ±90°; thickness ≈ 0.45 (ESTIMATE) |
| Groove | thin dark circle at r 12.6 (w 0.12) |
| Inner rim ring | r 12.6 → 13.8, satin |
| **Heavy band** | r **13.8 → 15.8**, full ±90°, darker sand-blasted; thicker, hangs ≈ 1 mm lower than the web (ESTIMATE) |
| **Openings** (4 curved kidney slots, mirror-symmetric about the heavy axis) | R1 inner slot (r 4.6→10.7, centroid r 6.5 @ +59°), R2 outer slot (r 7.3→11.0, centroid r 8.7 @ +37°), L1/L2 mirror images at −59°/−37°. Polygons in SPEC DATA. |
| Engraving | **"TUDOR"** serif caps, raised/polished, cap height ≈ 1.1, centred on the heavy axis on the web at r ≈ 11.05, spanning local angles −21°…+23°, **reads CCW (bottom→top in local view), letter tops toward the hub** |
| Motion | Free pendulum about the centre; winds in **both** directions (two reversing wheels). Video shows swings of ~90° in < 0.5 s. |

---------------------------------------------------------------------------------------------------
## 5. Gear train

### 5.1 What was measured (teardown photos, loose parts; counting by FFT periodogram and analytic-phase unwrapping)

| Part | Count | Method / confidence |
|---|---|---|
| **Escape wheel** | **20 teeth**, club teeth, **4 spokes** | loose part b33; FFT and phase methods both 20 at all radii; 18° pitch visually [M-H] |
| Centre wheel (gilt, 6 spokes, large pinion, hollow pipe) | **86–91** | b36, oblique view [L-M] |
| Third wheel (gilt, 5 spokes) | **≈96** (93–100) | b33, phase-count 96 at 5 radii [M] |
| Barrel (steel drum, teeth at the **top** rim) | **≈105** (±3) | b34 [L-M]; tip Ø ≈ 13.3–13.9 from b13 |
| Ratchet wheel (gilt, square hole) | **≈55** | b29 [M] |
| Crown wheel (steel) | **38–40** | b29 [L-M] |
| Small wheel (b34, steel) | 25 | [M] (role: winding/auto intermediate) |
| Gilt wheel with long pipe (b26) | ≈71–72 | [L] (dial side; probably 24-h or hour wheel) |
| Steel wheel with gilt hub & lever (b26) | ≈48 | [L] (dial side; hour-wheel/jumper assembly?) |
| Fourth wheel, all pinions | not countable | → ESTIMATE |

### 5.2 Architecture [H from photos]
**Direct-drive central seconds (Rolex-3135-like):** barrel → **centre pinion**; **centre wheel** (central, 1 rev/h) →
**third pinion**; **third wheel** (offset, 3:24 back view) → **fourth pinion (central, above the fourth wheel)**;
**fourth wheel** (central, 1 rev/min, long arbor through the hollow centre-wheel pipe to the seconds hand) →
**escape pinion**; escape wheel ↔ pallet fork ↔ balance. Two central gilt wheels exist (centre wheel lower, fourth
wheel higher; the third wheel lies above the fourth wheel at the overlap — seen in b13/b14).

### 5.3 Recommended self-consistent counts (ESTIMATE where marked)

| Mesh | Driver → driven | Centre distance (MEAS) | Module (= 2d/Σz) | Ratio |
|---|---|---|---|---|
| Barrel → centre pinion | **105** → **14** (pinion ESTIMATE) | 7.665 | 0.1288 | 7.5 → barrel 1 rev / **7.5 h** |
| Centre wheel → third pinion | **90** → **12** (pinion ESTIMATE) | 4.774 | 0.0936 | 7.5 |
| Third wheel → fourth pinion | **96** → **12** (pinion ESTIMATE) | 4.774 | 0.0884 | 8 |
| Fourth wheel → escape pinion | **96** (ESTIMATE) → **8** (ESTIMATE) | 4.455 | 0.0857 | 12 |
| Escape wheel | **20** teeth (MEAS) | escape–pallet 3.230 | — | — |

Rate check: centre 1 rph × 7.5 = third 7.5 rph (1 rev/8 min) × 8 = **fourth 60 rph = 1 rpm** × 12 = **escape 720 rph =
12 rpm** × 20 teeth × 2 = **28,800 vph** ✓. Derived tip radii (m(z+2.7)/2): centre 4.34, third 4.36, fourth 4.23,
barrel 6.94 — all match the photos (4.1–4.3, 4.2–4.4, ~4.1, 6.6–6.9).
Power reserve: 70 h ÷ 7.5 h = **9.33 barrel turns**.

### 5.4 Escapement geometry (MEAS + derived)
- Escape tip radius **2.75** (ESTIMATE ±0.15; from escape–pallet 3.23 and stone positions); pitch 18°.
- Line of centres escape→pallet at −73.1° (back view); pallet→balance −91.7° → escapement bent by ≈ 18.6° (nearly
  straight-line).
- Pallet stones contact the tip circle at **±26°** from the line of centres (≈ 2.9 pitches embraced): contact points
  (−1.32, −5.12) **entry** and (−3.62, −5.83) **exit** (back view; the escape wheel turns CW from the back, so its
  teeth meet the right-hand stone first) — matches the visible stones within 0.3.
- Pallet–balance 3.081; impulse-pin radius **0.65** (ESTIMATE: lift 52°, fork ±7°).
- Balance: gold-coloured, **4 arms (X)**, rim **OD ≈ 9.75** (r 4.87; ±0.2), rim width ≈ 0.30, height ≈ 0.45
  (ESTIMATE); **4 inertia (micro-adjustment) screws** on the outside of the rim at the arm ends (photo b28).
- Silicon hairspring, flat, ≈ 14 coils (ESTIMATE), inner r 0.5, outer r 2.6; stud carrier on the underside of the
  traversing bridge; **no regulator index**.
- Shock setting: Incabloc-type lyre on the cap jewel (top), standard below.

### 5.5 Rotation directions
| Mobile | Seen from BACK | Seen from DIAL |
|---|---|---|
| Barrel drum (running) | CW | CCW |
| Centre wheel, cannon pinion, minute hand | CCW | CW |
| Third wheel | CW | CCW |
| Fourth wheel / seconds hand | CCW | CW |
| Escape wheel (club teeth lead in direction of travel) | CW | CCW |
| Ratchet + barrel arbor (winding) | CW | CCW |
| Crown wheel (winding) | CCW | CW |
| Reduction wheel (winding) | CCW | CW |
| Rotor | either (bidirectional winding) | |
| Dial side: minute wheel CCW, hour-wheel driver CW, GMT idler CCW, **24-h wheel CW**, local hour wheel CW, date driver CCW, **date ring CW** (numbers increase CCW on the printed face, b22) | | |

---------------------------------------------------------------------------------------------------
## 6. Dial side: motion works, GMT, jumping local hour, date, keyless (functional [H]; geometry ESTIMATE)

All of this is under the dial and hidden in the real watch; it matters for the exploded view. Photos b04–b09/b17–b20
show (dial view, stem at 3 o'clock): a large gilt wheel on the centre pipe stack, a second gilt wheel below it with a
steel cam/star and a small gilt pinion, a gilt wheel at upper-left with a steel lever and a long curled wire spring
(instant-date/jumper spring), two small steel setting wheels near 4–5 o'clock, the setting lever/yoke plate near the
stem, a calendar plate and a 31-day date ring (b22: 31 internal triangular teeth, numerals increasing CCW).

### 6.1 Motion works (12:1) — ESTIMATE
cannon pinion **12** → minute wheel **40** (centre distance 3.12, m 0.120); minute pinion **10** → **hour-wheel driver
36** (m 0.136). (40/12)·(36/10) = **12** ✓.

### 6.2 Reference (GMT) train — 24-h hand, ESTIMATE
The hour-wheel driver carries a second toothing **30** → **GMT idler 30 / pinion 15** → **24-h wheel 30**.
Ratio (30/30)·(30/15) = 2 → 24-h wheel **1 rev / 24 h**, CW from the dial. It always follows the minute train (it is
moved in crown position D, never in C).

### 6.3 Local (jumping) hour hand — functional [H], parts ESTIMATE
The **local hour wheel** (36 T, carries the hour hand) is coaxial with the driver and coupled to it by a **12-point
star + hour jumper** (spring). Running: both turn together (1 rev/12 h). Crown position **C**: the yoke engages a
separate setting train on the star, rotating only the local hour wheel in **30° (1 h) jumps, either direction**; the
minute, seconds and 24-h hands do not move and the watch keeps running.

### 6.4 Instantaneous date "synchronised on the jumping hour hand" — functional [H], parts ESTIMATE
The **local hour wheel** (36) drives the **date-driving wheel 72** (1 rev / 24 h). Its cam charges a spring-loaded
**instant-date lever** over the evening; at local midnight the lever snaps and advances the **date ring (31 internal
teeth)** by one tooth (360/31 = 11.61°) in a few ms; the **date jumper** indexes the ring. Because the date driver is
geared to the local hour wheel, jumping the local hour hand past midnight in either direction moves the date forward or
back ("without non-correction range"). Date ring rotates **CW seen from the dial** by one tooth per day.

### 6.5 Automatic winding — positions MEAS, counts ESTIMATE
Rotor gear (on the rotor hub, **60**) → **reversing wheel A (30)** at (−3.18, 4.97)_b ↔ **reversing wheel B (30)** at
(0.22, 6.77)_b (each with an internal click, so either rotor direction gives the same output) → B's pinion **8** →
**reduction wheel 64** (gilt) at (3.02, 9.69)_b → its pinion **20** → **ratchet 55**. These counts fit all measured
centre distances (5.85/3.85/4.05/4.53) but give only ≈ 1 ratchet turn per 11 rotor turns; real Tudor/Rolex-type
trains are far slower (~1:50–1:100 typical, unpublished) — there are probably hidden extra stages (the 4th jewel at
(6.48, 7.74)_b is unassigned). **For animation**, either use these meshing counts, or drive the ratchet from a winding
state at 1 turn per ~80 rotor turns and treat the auto wheels as decorative.

### 6.6 Keyless works — ESTIMATE
Stem Ø0.9 (ESTIMATE), axis at z −0.60; winding pinion (contrate, **16**) → winding intermediate **18** at
(−8.8, 3.1)_b → crown wheel **40** at (−6.4, 5.6)_b → ratchet **55** at the barrel arbor. 1 crown turn = 16/55 ratchet
rev = **16 click ticks**; full manual wind from empty ≈ 9.33 × 55/16 ≈ **32 crown turns**. Click (pawl + spring) at
≈ (−3.2, 10.9)_b on the barrel bridge (ESTIMATE). Setting: sliding pinion, setting lever, yoke, yoke/setting-lever
springs, setting wheel to the minute wheel (pos. D, with **stop-seconds lever** touching the balance rim), and an
hour-setting wheel to the local hour star (pos. C).

---------------------------------------------------------------------------------------------------
## 7. Vertical stack (ESTIMATE, collision-checked, totals the published 7.52 mm)

z = 0 dial-side face of the main plate; dial side +, movement side −. Envelope **z +2.00 (date-ring top / dial seat)
→ −5.52 (rotor top)** = 7.52.

| Level | z range | Notes |
|---|---|---|
| Date ring / date jumper | +1.80 … +1.98 | dial seat +2.00 |
| Calendar plate | +1.50 … +1.78 | |
| Local hour wheel (36) + star/jumper | +1.05 … +1.35 | pipe top +2.75 |
| Date-driving wheel (72) + instant-date lever | +1.05 … +1.45 | |
| 24-h (GMT) wheel | +0.80 … +0.92 | pipe top +3.05 |
| GMT idler (wheel / pinion) | +0.50 … +0.95 | |
| Hour-wheel driver (36 / 30) | +0.28 … +0.62 | |
| Minute wheel 40 / pinion 10 | +0.10 … +0.45 | setting wheel +0.10 … +0.22 |
| Cannon pinion leaves | +0.05 … +0.27 | pipe top +3.40; seconds arbor tip +3.80 |
| **Main plate** | 0 … −1.20 | barrel pocket floor −0.40; stem axis −0.60 |
| Barrel drum | −0.45 … −2.40 | teeth band at the **top**: −2.15 … −2.40 |
| Centre pinion / centre wheel | −2.10 … −2.45 / −2.50 … −2.62 | above the barrel lid |
| Escape wheel / pallet fork / roller | −2.70 … −2.82 / −2.66 … −2.86 / −2.60 … −2.95 | one plane |
| Third pinion | −2.45 … −2.70 | meshes centre wheel |
| Centre-wheel bridge | −2.70 … −3.00 | small bar across the centre |
| Pallet bridge | −2.95 … −3.30 | |
| Escape pinion | −3.05 … −3.30 | meshes fourth wheel |
| Fourth wheel / fourth pinion | −3.10 … −3.22 / −3.25 … −3.62 | |
| Third wheel | −3.45 … −3.57 | |
| Barrel bridge | −2.50 … −3.40 | outer flange (laser stripes) −2.50 … −4.30 |
| Ratchet / crown wheel / click | −3.45 … −3.75 | |
| Balance rim (arms on top) | −3.40 … −3.90 | inertia screws −3.45 … −3.85 |
| Hairspring | −4.00 … −4.15 | |
| Train bridge | −3.70 … −4.40 | |
| Automatic wheels | −3.90 … −4.35 | |
| Balance bridge | −4.30 … −4.80 | shock-setting top −4.95 |
| Automatic bridge | −4.40 … −4.95 | |
| Rotor: heavy band / web / hub+bearing | −4.45 … −5.52 / −5.05 … −5.45 / −4.95 … −5.52 | |

---------------------------------------------------------------------------------------------------
## 8. Real-time animation (drive everything from one master time t)

- f = 4 Hz; period 250 ms; **beat 125 ms; 8 beats/s**; beat n = floor(8 t).
- Balance θ(t) = A·sin(8πt); **A = 285°** fully wound (ESTIMATE; 270–300°), lift **52°** (±26°).
- Fork: bankings ±7° (14° total, ESTIMATE); φ = −7°·clamp(θ/26°, −1, 1).
- Escape wheel per beat **+9°** (½ pitch of 18°): −0.2° recoil (unlock), +8.2° impulse (linear in lift progress),
  +1.0° drop. Average 72°/s = 12 rpm.
- Seconds hand **0.75° per beat** (8 steps/s); minute hand 0.1°/s; hour (local) 1/120 °/s; **24-h hand 1/240 °/s**;
  third wheel 0.75°/s; barrel 360°/7.5 h; minute wheel 0.03°/s; date ring 360/31° instant jump at local 00:00.
- Rotor: independent pendulum state (spring/damper or scripted sway); ratchet advances only through the reversers
  (both directions wind), click recoil ≈ ½ tooth on release.
- Setting simulation: crown pos. D hacks (balance stopped) and turns minute+24 h+local hour together; pos. C jumps the
  local hour hand ±30° per crown detent with the date following across midnight.

---------------------------------------------------------------------------------------------------
## 9. Labelled parts list (id → plain-English label)

Movement framework
- `main-plate` — **Main plate**: the base plate everything is built on; the barrel sits in a deep pocket in it.
- `automatic-bridge` — **Automatic bridge**: big sand-blasted bridge (engraved TUDOR / GENEVA SWITZERLAND) that holds the self-winding wheels under the rotor.
- `barrel-bridge` — **Barrel bridge**: holds the top of the mainspring barrel and carries the ratchet and crown wheels; its laser-striped rim forms the outer ring.
- `train-bridge` — **Train bridge**: engraved "MT5652 TWENTY-EIGHT 28 JEWELS"; holds the upper pivots of the fourth, third and escape wheels.
- `centre-wheel-bridge` — **Centre-wheel bridge**: small steel bar holding the centre wheel's top pivot.
- `balance-bridge` — **Traversing balance bridge**: arched bridge screwed at both ends over the balance — much stiffer against knocks than a one-sided cock.
- `pallet-bridge` — **Pallet bridge**: small bridge for the pallet fork's upper pivot.
- `plate-screws` — **Bridge screws**: polished slotted steel screws fixing the bridges.
- `jewels` — **28 jewels**: synthetic rubies used as low-friction bearings, plus pallet stones and impulse pin.
- `rotor-post` — **Rotor post bushing**: the gilt central bushing on which the rotor bearing is mounted.

Winding and power
- `rotor` — **Rotor (oscillating weight)**: half-moon weight that swings with wrist movement to wind the watch in both directions; heavy band engraved TUDOR.
- `rotor-bearing` — **Rotor ball bearing**: lets the rotor spin almost frictionlessly.
- `reverser-wheels` — **Reversing wheels**: a pair of click wheels that turn the rotor's back-and-forth swings into one-way winding.
- `reduction-wheel` — **Reduction wheel**: gilt wheel that slows the rotor's motion down before it reaches the ratchet.
- `ratchet-wheel` — **Ratchet wheel**: gilt wheel on the barrel arbor; turning it winds the mainspring.
- `crown-wheel` — **Crown wheel**: steel wheel that passes hand-winding from the crown to the ratchet.
- `winding-intermediate` — **Winding intermediate wheel**: small wheel between the winding pinion and the crown wheel.
- `click` / `click-spring` — **Click**: pawl that lets the ratchet turn only one way, so the spring can't unwind backwards.
- `barrel` — **Mainspring barrel**: toothed drum (teeth on its top rim) that turns once every ~7½ h and powers the train.
- `mainspring` — **Mainspring**: coiled steel ribbon storing about 70 hours of energy.
- `barrel-arbor` / `barrel-cover` — arbor (inner hook) and lid of the barrel.
- `winding-stem`, `winding-pinion`, `sliding-pinion`, `setting-lever`, `yoke`, `keyless-springs`, `setting-wheel` — **Keyless works**: the stem and the levers/wheels that switch the crown between winding (B), local-hour/date setting (C) and time setting with hacking (D).

Gear train
- `center-wheel` — **Centre wheel**: gilt wheel turning once an hour; its hollow pipe carries the minute-hand cannon pinion.
- `third-wheel` — **Third wheel**: intermediate gilt wheel turning once every 8 minutes.
- `fourth-wheel` — **Fourth (seconds) wheel**: central wheel turning once a minute; its long arbor runs through the centre wheel to drive the central seconds hand directly.

Escapement and regulation
- `escape-wheel` — **Escape wheel**: 20-tooth wheel released half a tooth at a time, 8 times per second.
- `pallet-fork` — **Pallet fork**: rocking lever with two ruby stones that locks and releases the escape wheel and pushes the balance.
- `balance-wheel` — **Variable-inertia balance**: gold-coloured 4-arm wheel oscillating 4 times a second; the watch's timekeeper.
- `inertia-screws` — **Micro-adjustment (inertia) screws**: four tiny screws on the rim; turning them changes the balance's inertia to regulate the rate (there is no regulator index).
- `hairspring` — **Silicon balance spring**: non-magnetic, temperature-stable spiral that makes the balance oscillate.
- `roller` — **Roller and impulse pin**: ruby pin on the balance staff that receives the fork's impulse.
- `shock-absorber` — **Shock protection**: spring-held jewel setting that lets the balance pivot recover from knocks.
- `stud-holder` — holds the outer end of the hairspring on the balance bridge.
- `stop-seconds-lever` — **Hacking lever**: stops the balance when the crown is in position D.

Dial-side works (hidden; exploded view)
- `cannon-pinion` — carries the minute hand; slips on the centre arbor for setting.
- `minute-wheel` — reduces minute motion 12:1 toward the hour wheels.
- `hour-wheel-driver` — turns once in 12 h with "reference time"; drives the 24-h train.
- `gmt-idler` / `gmt-wheel` — **24-hour (GMT) wheel**: carries the yellow 24-h "Snowflake" hand, one turn per day.
- `hour-wheel` + `hour-jumper` — **Jumping local hour wheel**: carries the local hour hand; a 12-point star and jumper let it be stepped one hour at a time.
- `date-driving-wheel` — turns once a day with local time and arms the instant-date mechanism.
- `instant-date-lever` — spring lever that snaps the date over at local midnight.
- `date-ring` — 31-day disc seen through the 3 o'clock window.
- `date-jumper` — keeps the date ring exactly aligned in the window.
- `calendar-plate` — holds the date ring and jumper in place.

---------------------------------------------------------------------------------------------------
## 10. Uncertainties / open items
1. **Tooth counts**: only the escape wheel (20) is measured with confidence; centre (86–91), third (~96), barrel (~105),
   ratchet (~55), crown wheel (38–40) are photo counts on oblique parts; fourth wheel and all pinions are ESTIMATE.
2. **Automatic train**: jewel positions measured, wheel roles/counts estimated; meshing counts give an unrealistically
   fast ratio (see §6.5).
3. **Dial-side GMT/date layout** is schematic (functional behaviour is official); no counts are public.
4. **Bridge outlines** ±0.5 mm; balance-bridge feet shape ±0.7 mm; hidden barrel bridge outline is a guess.
5. **Vertical stack** is entirely estimated (only the 7.52 mm total is official); barrel teeth on the top rim inferred
   from the teardown (b13).
6. **Rotor material/bearing** for the COSC MT5652 unpublished; engraving variant: COSC = "MT5652 TWENTY-EIGHT 28 JEWELS"
   (do not use the Master Chronometer text from the 2025 kit image).
7. Lift angle (52°), amplitude (285°), balance OD (9.75 ±0.2), hairspring coils (≈14) are estimates.
8. Pallet-jewel position differs 0.8 mm between photo and render (parallax) — render value adopted.

---------------------------------------------------------------------------------------------------
## SPEC DATA

```js
// TUDOR Black Bay Pro M79470-0004 — Manufacture Calibre MT5652 (COSC).
// Frame: dial-side build frame of CONTRACT.md (units mm, +Z out of the dial, 12 o'clock = +Y, crown = +X).
// Back-view measurements (crown on the left) are converted with B().
const B = (x, y) => [-x, y];
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const DEG = Math.PI / 180;
const mod = (d, z1, z2) => (2 * d) / (z1 + z2);

// ------------------------------------------------------------------ arbor layout (MEAS unless noted)
const P = {
  center: [0, 0],                 // centre wheel + fourth (seconds) wheel + cannon + hour/24h wheels + rotor
  fourth: [0, 0],                 // central seconds, direct drive
  third: B(4.67, -0.99),          // [H]
  escape: B(-3.19, -3.11),        // [M-H]
  pallet: B(-2.25, -6.20),        // [M-H]
  balance: B(-2.34, -9.28),       // [H]
  barrel: B(-1.0, 7.6),           // [M] ±0.4 (= ratchet / barrel arbor)
  crownWheel: B(-6.4, 5.6),       // [M] ±0.5
  windingIntermediate: B(-8.8, 3.1), // [L-M]
  windingPinion: B(-10.6, 0),     // ESTIMATE, on the stem axis
  // automatic device: jewel positions MEAS, roles ESTIMATE
  reverserA: B(-3.18, 4.97),
  reverserB: B(0.22, 6.77),
  reductionWheel: B(3.02, 9.69),
  autoAux: B(6.48, 7.74),         // unassigned automatic-train jewel
  // dial side (dial frame directly) — all ESTIMATE, schematic
  minuteWheel: [-2.70, -1.56],    // 3.12 from centre
  gmtIdler: [-1.23, 3.38],        // 3.60 from centre
  dateDriver: [5.50, 2.00],       // 5.85 from centre
  dateJumper: [10.6, -4.6],
  hourJumper: [-3.9, -2.6],
  settingWheel: [5.9, -2.6],
  hourSettingWheel: [8.99, -2.97],      // from dial-side photo b07 (±1 mm)
  settingIntermediate: [7.56, -5.88],   // from b07 (±1 mm)
};

// ------------------------------------------------------------------ tooth counts
const train = {
  barrel: { teeth: 105 },              // MEAS ≈105 (±3); teeth on the TOP rim of the drum
  center: { teeth: 90, pinion: 14 },   // wheel MEAS 86–91; pinion ESTIMATE
  third: { teeth: 96, pinion: 12 },    // wheel MEAS ≈96; pinion ESTIMATE
  fourth: { teeth: 96, pinion: 12 },   // ESTIMATE (pinion above the wheel)
  escape: { teeth: 20, pinion: 8 },    // teeth MEAS (club, 4 spokes); pinion ESTIMATE
};
const motion = {                       // dial side, ESTIMATE
  cannon: { teeth: 12 },
  minuteWheel: { teeth: 40, pinion: 10 },
  hourDriver: { teeth: 36, gmtTeeth: 30 },   // reference 12 h
  gmtIdler: { teeth: 30, pinion: 15 },
  gmtWheel: { teeth: 30 },                   // 24-h hand wheel: 1 rev / 24 h
  hourWheel: { teeth: 36, star: 12 },        // local jumping hour wheel (30° jumps)
  dateDriver: { teeth: 72 },                 // driven by hourWheel → 1 rev / 24 h
  dateRing: { teeth: 31, internal: true },
};
const keyless = {                      // ESTIMATE except ratchet/crown counts (photo ±)
  windingPinion: { teeth: 16 },
  windingIntermediate: { teeth: 18 },
  crownWheel: { teeth: 40 },
  ratchet: { teeth: 55 },
  slidingPinion: { teeth: 12 },
  settingWheel: { teeth: 15 },
};
const automatic = {                    // ESTIMATE counts fitted to MEAS centre distances
  rotorGear: { teeth: 60 },
  reverserA: { teeth: 30 },            // with internal click
  reverserB: { teeth: 30, pinion: 8 }, // with internal click
  reductionWheel: { teeth: 64, pinion: 20 },
  ratchetTeeth: 55,
  // meshing ratio: ratchet rev per rotor rev = (60/30)*(8/64)*(20/55) = 0.0909 (too fast vs reality);
  // realistic animation alternative: 1/80
  realisticRatchetPerRotorRev: 1 / 80,
};

// modules from measured centre distances (keeps every mesh exact)
const modules = {
  barrel: mod(hyp(P.barrel, P.center), train.barrel.teeth, train.center.pinion),   // 0.1288
  center: mod(hyp(P.center, P.third), train.center.teeth, train.third.pinion),      // 0.0936
  third: mod(hyp(P.third, P.center), train.third.teeth, train.fourth.pinion),       // 0.0884
  fourth: mod(hyp(P.center, P.escape), train.fourth.teeth, train.escape.pinion),    // 0.0857
  keyless: mod(hyp(P.crownWheel, P.barrel), keyless.ratchet.teeth, keyless.crownWheel.teeth),        // 0.1212
  windingIntermediate: mod(hyp(P.windingIntermediate, P.crownWheel), keyless.windingIntermediate.teeth, keyless.crownWheel.teeth), // 0.1195
  motionA: mod(hyp(P.center, P.minuteWheel), motion.cannon.teeth, motion.minuteWheel.teeth),        // 0.120
  motionB: mod(hyp(P.center, P.minuteWheel), motion.minuteWheel.pinion, motion.hourDriver.teeth),   // 0.136
  gmtA: mod(hyp(P.center, P.gmtIdler), motion.hourDriver.gmtTeeth, motion.gmtIdler.teeth),          // 0.120
  gmtB: mod(hyp(P.center, P.gmtIdler), motion.gmtIdler.pinion, motion.gmtWheel.teeth),              // 0.160
  date: mod(hyp(P.center, P.dateDriver), motion.hourWheel.teeth, motion.dateDriver.teeth),          // 0.108
  autoA: mod(hyp(P.center, P.reverserA), automatic.rotorGear.teeth, automatic.reverserA.teeth),
  autoB: mod(hyp(P.reverserA, P.reverserB), automatic.reverserA.teeth, automatic.reverserB.teeth),
  autoC: mod(hyp(P.reverserB, P.reductionWheel), automatic.reverserB.pinion, automatic.reductionWheel.teeth),
  autoD: mod(hyp(P.reductionWheel, P.barrel), automatic.reductionWheel.pinion, automatic.ratchetTeeth),
};

// rates in revolutions per hour (sign: + = CW seen from the DIAL)
const rates = {
  barrel: -train.center.pinion / train.barrel.teeth,          // −0.1333 (1 rev / 7.5 h, CCW from dial)
  center: 1, cannon: 1,
  third: -(train.center.teeth / train.third.pinion),           // −7.5
  fourth: 60,                                                  // (90/12)·(96/12)
  escape: -720,                                                // 60·96/8 → 12 rpm
  minuteWheel: -(12 / 40), hourDriver: 1 / 12, hourWheel: 1 / 12,
  gmtIdler: -1 / 12, gmtWheel: 1 / 24, dateDriver: -1 / 24,
  // date ring: discrete +360/31° (CW from dial) at local 00:00
};

// ------------------------------------------------------------------ vertical stack (ESTIMATE)
const z = {
  envelope: [-5.52, 2.0],               // 7.52 mm total
  // dial side
  dialSeat: 2.0,
  dateRing: [1.80, 1.98], dateJumper: [1.80, 1.98], calendarPlate: [1.50, 1.78],
  hourWheel: [1.05, 1.17], hourStar: [1.20, 1.35], hourJumper: [1.20, 1.35], hourPipeTop: 2.75,
  dateDriver: [1.05, 1.17], dateCam: [1.20, 1.45], instantDateLever: [1.20, 1.45],
  gmtWheel: [0.80, 0.92], gmtPipeTop: 3.05,
  gmtIdlerWheel: [0.50, 0.62], gmtIdlerPinion: [0.62, 0.95],
  hourDriver: [0.28, 0.40], hourDriverGmtTeeth: [0.50, 0.62],
  minuteWheel: [0.10, 0.22], minutePinion: [0.22, 0.45], settingWheel: [0.10, 0.22],
  cannonLeaves: [0.05, 0.27], cannonPipeTop: 3.40, secondsArborTip: 3.80,
  // movement side
  mainPlate: [-1.20, 0], barrelPocketFloor: -0.40, stemAxis: -0.60,
  barrel: [-2.40, -0.45], barrelTeeth: [-2.40, -2.15], barrelLid: [-2.40, -2.30],
  centerPinion: [-2.45, -2.10], centerWheel: [-2.62, -2.50],
  thirdPinion: [-2.70, -2.45], thirdWheel: [-3.57, -3.45],
  centreWheelBridge: [-3.00, -2.70],
  fourthWheel: [-3.22, -3.10], fourthPinion: [-3.62, -3.25],
  escapePinion: [-3.30, -3.05], escapeWheel: [-2.82, -2.70],
  palletFork: [-2.86, -2.66], roller: [-2.95, -2.60], palletBridge: [-3.30, -2.95],
  balanceRim: [-3.90, -3.40], inertiaScrews: [-3.85, -3.45], hairspring: [-4.15, -4.00],
  trainBridge: [-4.40, -3.70],
  balanceBridge: [-4.80, -4.30], shockTop: -4.95,
  barrelBridge: [-3.40, -2.50], outerFlange: [-4.30, -2.50],
  ratchet: [-3.75, -3.45], crownWheel: [-3.70, -3.45], click: [-3.70, -3.45],
  autoWheels: [-4.35, -3.90], automaticBridge: [-4.95, -4.40],
  rotorBand: [-5.52, -4.45], rotorWeb: [-5.45, -5.05], rotorHub: [-5.52, -4.95],
  screwHeadsTop: { flange: -4.30, automaticBridge: -4.95, balanceBridge: -4.85, trainBridge: -4.40 },
};

// ------------------------------------------------------------------ explode offsets (mm, full explosion)
const explode = {
  rotor: [0, 0, -42], 'rotor-bearing': [0, 0, -39],
  'automatic-bridge': [0, 0, -35], 'reverser-wheels': [0, 0, -31], 'reduction-wheel': [0, 0, -31],
  'balance-bridge': [0, 0, -30], 'shock-absorber': [0, 0, -32], 'stud-holder': [0, 0, -30],
  hairspring: [0, 0, -28], 'balance-wheel': [0, 0, -26], 'inertia-screws': [0, 0, -26], roller: [0, 0, -25],
  'ratchet-wheel': [0, 0, -27], 'crown-wheel': [0, 0, -27], click: [0, 0, -27], 'click-spring': [0, 0, -27.5],
  'winding-intermediate': [0, 0, -25],
  'train-bridge': [0, 0, -22], 'barrel-bridge': [0, 0, -20], 'plate-screws': [0, 0, -36],
  'third-wheel': [0, 0, -18], 'fourth-wheel': [0, 0, -16.5], 'pallet-bridge': [0, 0, -17],
  'escape-wheel': [0, 0, -15], 'pallet-fork': [0, 0, -14],
  'centre-wheel-bridge': [0, 0, -12], 'center-wheel': [0, 0, -10],
  barrel: [0, 0, -8], mainspring: [0, 0, -9.5], 'barrel-cover': [0, 0, -11], 'barrel-arbor': [0, 0, -12.5],
  'main-plate': [0, 0, 0], jewels: [0, 0, 0],
  'winding-stem': [7, 0, 0], 'winding-pinion': [5, 0, 3], 'sliding-pinion': [3, 0, 3],
  'setting-lever': [0, 0, 4], yoke: [0, 0, 4.5], 'keyless-springs': [0, 0, 5.5], 'setting-wheel': [0, 0, 5],
  'stop-seconds-lever': [0, 0, 4],
  'cannon-pinion': [0, 0, 8], 'minute-wheel': [0, 0, 6], 'hour-wheel-driver': [0, 0, 9],
  'gmt-idler': [0, 0, 10], 'gmt-wheel': [0, 0, 11], 'hour-wheel': [0, 0, 13], 'hour-jumper': [0, 0, 14],
  'date-driving-wheel': [0, 0, 13], 'instant-date-lever': [0, 0, 14],
  'calendar-plate': [0, 0, 16], 'date-ring': [0, 0, 18], 'date-jumper': [0, 0, 18.5],
};

// ------------------------------------------------------------------ frame, bridges, screws, jewels, engravings
const poly = (pts) => pts.map(([x, y]) => B(x, y));   // back-view polygon → dial frame
const frame = {
  plateRadius: 15.9,                    // Ø31.8
  outerFlange: { rInner: 14.1, rOuter: 15.9, finish: 'laser radial "sun" stripes' },
  textBandGroove: 11.2,                 // groove circle on the auto & train bridges
  automaticBridge: poly([[0.49,14.09],[-2.21,13.93],[-4.82,13.25],[-7.26,12.09],[-9.43,10.48],[-11.26,8.49],
    [-12.67,6.18],[-13.62,3.65],[-14.07,0.98],[-13.99,-1.72],[-13.41,-4.36],[-12.4,-3.4],[-10.6,-3.0],[-9.4,-2.0],
    [-8.4,-0.2],[-7.6,2.0],[-6.6,3.0],[-4.4,3.4],[-3.6,4.0],[-1.8,4.6],[0.4,4.7],[2.2,4.2],[3.8,4.7],[6.0,4.8],
    [8.6,4.6],[10.6,5.0],[10.9,6.0],[9.0,8.2],[7.6,9.6],[5.0,9.9],[3.9,10.6],[2.2,11.2],[0.6,11.4]]),
  trainBridge: poly([[7.47,-11.96],[9.57,-10.35],[11.33,-8.39],[12.7,-6.13],[13.62,-3.65],[14.06,-1.04],[14.01,1.6],
    [13.47,4.18],[12.45,6.62],[10.6,5.0],[8.6,4.6],[6.0,4.8],[3.8,4.7],[2.2,4.2],[0.4,4.7],[-1.8,4.6],[-3.6,4.0],
    [-4.4,3.2],[-4.9,1.2],[-4.8,-1.4],[-4.3,-3.2],[-3.6,-4.4],[-1.6,-4.9],[0.6,-5.2],[2.6,-6.0],[4.4,-7.6],
    [6.0,-9.6],[7.0,-11.6]]),
  trainBridgeWindows: [
    poly([[7.2,-0.5],[8.5,-0.4],[9.5,-1.0],[9.85,-2.6],[9.6,-4.4],[8.8,-5.7],[7.7,-6.1],[6.8,-5.4],[6.9,-4.0],[7.3,-2.9],[6.9,-1.6]]), // shows third-wheel rim
    poly([[-3.6,4.0],[-2.0,4.5],[0.4,4.6],[2.2,4.1],[2.6,3.6],[1.0,3.5],[-1.5,3.4],[-3.3,3.3]]),                                  // shows central-wheel teeth
  ],
  balanceBridge: poly([[-13.9,-8.2],[-12.6,-7.6],[-10.0,-8.0],[-7.5,-8.4],[-5.0,-8.6],[-3.7,-8.1],[-2.3,-7.75],
    [-0.9,-8.1],[0.6,-8.8],[2.4,-9.8],[4.3,-11.0],[6.2,-12.0],[7.6,-12.8],[7.2,-14.3],[5.6,-15.0],[4.0,-14.9],
    [2.8,-13.8],[1.2,-12.2],[-0.6,-11.0],[-2.3,-10.75],[-4.0,-10.9],[-6.0,-11.1],[-8.0,-11.4],[-9.2,-12.4],
    [-10.4,-12.7],[-12.3,-11.5],[-13.6,-9.8]]),            // ESTIMATE ±0.6; balance cap housing r 1.5 at P.balance
  palletBridge: poly([[-4.2,-5.3],[-3.0,-5.0],[-1.2,-5.5],[0.2,-6.6],[-0.2,-7.3],[-2.2,-7.0],[-3.8,-6.4]]),
  centreWheelBridge: { from: B(-3.6, 0.4), to: B(3.8, 0.6), width: 1.3 },   // ESTIMATE (b14)
  rotorPost: { center: [0, 0], radius: 1.0, colour: '#b8975a' },           // gilt bushing
  screws: [B(-8.7, 12.4), B(-12.7, 3.1), B(-14.8, -2.7), B(-13.8, -6.0), B(-11.1, -10.15), B(4.92, -13.98),
           B(9.3, -11.5), B(11.7, -9.1), B(11.0, 6.2), B(11.8, 7.6), B(-5.9, 1.0)],
  screwHeadDiameter: 1.35, screwFinish: 'polished steel, slotted',
  balanceBridgeScrews: [B(-11.1, -10.15), B(4.92, -13.98)],
  jewelsVisible: {                      // back side, rotor removed
    fourth: [0, 0], third: P.third, escape: P.escape, pallet: P.pallet, balanceCap: P.balance,
    auto: [P.reverserA, P.reverserB, P.reductionWheel, P.autoAux],
  },
  jewelCount: 28,
  // allocation ESTIMATE: balance 2+2 cap, impulse 1, pallet stones 2, pallet 2, escape 2, fourth 2, third 2,
  // centre 2, barrel arbor 2, reversers 4, reduction 2, aux 1, = 28
  stem: { axisY: 0, entersAtX: 15.9, diameter: 0.9 },     // dial frame: crown side +X
  engravings: {
    // centres are already in the dial frame (B() applied). Arc angles are BACK-VIEW angles (CCW from back-view 3 o'clock);
    // dial-frame angle = 180° − backAngle. Text must read correctly when seen FROM THE BACK.
    autoBridgeTUDOR: { text: 'TUDOR', arcRadius: 12.6, startDegBack: 151, endDegBack: 116, capHeight: 1.4, font: 'serif caps (Tudor logotype)', topsOutward: true },
    geneva: { text: 'GENEVA', center: B(-13.6, -0.8), rotateDegBackView: 90, capHeight: 0.75 },
    switzerland: { text: 'SWITZERLAND', center: B(-12.3, -0.5), rotateDegBackView: 90, capHeight: 0.75 },
    trainBridge: { text: 'MT5652 TWENTY-EIGHT 28 JEWELS', arcRadius: 12.9, startDegBack: 16, endDegBack: -55, capHeight: 0.9, font: 'sans caps', topsOutward: true },
  },
  colours: { bridges: '#c4c8ca', bevels: '#e9eaeb', flangeStripes: '#9da1a4', jewels: '#7a3d6e', giltWheels: '#c9b27a',
             balance: '#d1b06b', steelWheels: '#9a9ea4', barrel: '#8e949a', screws: '#d4d6d8', hairspring: '#4f5868' },
};

// ------------------------------------------------------------------ escapement / regulating organ
const EP = hyp(P.escape, P.pallet);                       // 3.230
const lineEP = Math.atan2(P.pallet[1] - P.escape[1], P.pallet[0] - P.escape[0]);
const escapement = {
  escapeTeeth: 20, escapeTipRadius: 2.75, escapeSpokes: 4,
  palletToEscape: EP, palletToBalance: hyp(P.pallet, P.balance),   // 3.081
  stoneHalfAngleDeg: 26,
  entryStone: [P.escape[0] + 2.75 * Math.cos(lineEP - 26 * DEG), P.escape[1] + 2.75 * Math.sin(lineEP - 26 * DEG)],
  exitStone: [P.escape[0] + 2.75 * Math.cos(lineEP + 26 * DEG), P.escape[1] + 2.75 * Math.sin(lineEP + 26 * DEG)],
  rollerJewelRadius: 0.65,
  balanceRadius: 4.87, balanceRimWidth: 0.30, balanceRimHeight: 0.45, balanceArms: 4,
  inertiaScrews: { count: 4, atArmEnds: true, diameter: 0.5, protrusion: 0.3 },
  hairspring: { material: 'silicon', flat: true, innerRadius: 0.5, outerRadius: 2.6, coils: 14, height: 0.12, thickness: 0.04 },
  shock: 'Incabloc-type lyre on the cap jewel',
  freeSprung: true,
};

// ------------------------------------------------------------------ rotor (rotor-local frame = BACK VIEW with heavy axis +x)
const rotor = {
  radius: 15.8, hubRadius: 4.4, grooveRadius: 12.6, bandInner: 13.8,
  halfDisc: true,                          // straight diametral edge along local x = 0 (light side cut away)
  bearing: { type: 'ball (ESTIMATE)', raceRadii: [1.3, 2.4, 3.0, 3.4], balls: 10, ballDiameter: 0.45, ballCircle: 1.9 },
  openings: {                              // back-view local polygons; mirror pair about the heavy axis
    R1: [[5.1,1.3],[4.55,1.45],[4.1,2.05],[3.5,2.95],[2.8,3.8],[2.1,4.6],[1.55,5.4],[1.2,6.45],[1.0,7.7],[0.95,9.2],[1.05,9.95],[1.4,10.4],[2.0,10.45],[2.45,10.2],[2.85,9.05],[3.45,7.55],[4.1,6.05],[4.8,4.55],[5.45,3.45],[5.95,2.65],[5.95,1.85],[5.65,1.4]],
    R2: [[4.6,9.35],[4.45,8.65],[4.7,7.55],[5.25,6.05],[5.9,4.55],[6.55,3.05],[7.3,1.85],[7.9,1.05],[8.4,0.75],[8.9,1.0],[9.2,2.1],[9.25,4.1],[8.95,5.6],[8.15,7.05],[7.05,8.35],[5.9,9.25],[5.2,9.55]],
    L1: [[1.65,-10.4],[1.15,-10.05],[1.1,-8.5],[1.15,-7.2],[1.35,-6.2],[1.75,-5.5],[2.15,-5.0],[2.6,-4.6],[3.2,-4.05],[3.8,-3.35],[4.15,-2.55],[4.4,-1.75],[4.8,-1.3],[5.7,-1.35],[6.2,-1.65],[5.95,-2.45],[5.5,-3.45],[5.0,-4.45],[4.65,-5.45],[4.4,-6.45],[4.05,-7.45],[3.6,-8.45],[3.1,-9.45],[2.6,-10.2],[2.1,-10.45]],
    L2: [[5.4,-9.5],[4.95,-9.15],[4.8,-8.45],[5.15,-6.95],[5.5,-5.95],[5.9,-4.95],[6.35,-3.95],[6.85,-2.95],[7.25,-2.15],[7.65,-1.55],[8.1,-1.2],[8.6,-1.2],[8.9,-1.6],[8.95,-2.4],[8.7,-3.9],[8.2,-5.45],[7.45,-6.95],[6.6,-8.25],[5.95,-9.15]],
  },
  // To place: convert each local point with B() and rotate the rotor group about Z. Heavy axis in the
  // official render pose = back-view 22° → dial-frame angle 180° − 22° = 158°.
  engraving: { text: 'TUDOR', arcRadius: 11.05, centreDegLocal: 0, spanDegLocal: [-21, 23], capHeight: 1.1, font: 'serif caps', topsTowardHub: true, readsCCWBackView: true },
  finish: { web: 'satin-brushed radial + sand-blasted details', band: 'sand-blasted, darker', hub: 'polished races' },
  thickness: { web: 0.40, band: 1.07, hub: 0.57 },
  renderPoseHeavyAxisDegBack: 22,
};

// ------------------------------------------------------------------ dial-side calendar (ESTIMATE)
const calendar = {
  dateRing: { innerTipRadius: 11.45, innerRootRadius: 11.9, outerRadius: 13.6, thickness: 0.18, numeralRadius: 12.75,
              numeralsIncrease: 'CCW (printed face)', advanceDirDial: 'CW', stepDeg: 360 / 31 },
  dateDriverFingerRadius: 5.6,
  instantJumpAtLocalHour: 0,
  windowAtDialClock: 3,
};

export const MT5652 = {
  name: 'Black Bay Pro', reference: 'M79470-0004', caliber: 'MT5652 (COSC)',
  diameter: 31.8, height: 7.52, jewels: 28, powerReserveHours: 70,
  barrelTurns: 70 / 7.5,
  timing: { beatsPerHour: 28800, freqHz: 4, amplitudeDeg: 285, liftDeg: 52, forkHalfDeg: 7,
            escapeStepDeg: 9, escapeRecoilDeg: 0.2, escapeDropDeg: 1.0 },
  layout: P, train, motion, keyless, automatic, modules, rates, z, explode,
  frame, escapement, rotor, calendar,
  crownPositions: { A: 'screwed down', B: 'manual winding', C: 'local hour ±1 h jumps + date (running)', D: 'hack; set minutes + 24 h (+ local hour)' },
};
```
