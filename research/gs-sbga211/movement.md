# Grand Seiko SBGA211G "Snowflake" — caliber 9R65 (Spring Drive, automatic): movement research for the real-time 3D replica

Movement research only; another agent covers the case, dial and hands. Written to the same detail level and data conventions as the NOMOS Tangente / DUW 4001 files (`research/caliber.md`, `research/mechanics.md`, `research/synthesis.md` §5–7, `src/spec.js`).

## Conventions

- **Units**: millimetres throughout.
- **Back view**: looking through the sapphire case back with 12 o'clock up. The crown is on the LEFT (9 o'clock). `x_b` points right, `y` points up, origin at the movement centre, which is the hand axis and also the rotor pivot.
- **Dial frame**: matches the Three.js world of the Tangente contract. `x_dial = −x_b`, `y` unchanged. `B(x_b, y) = [−x_b, y]`.
- **z**: `z = 0` is the dial-side face of the main plate. `+z` points toward the dial and viewer; the back side is `z < 0`. Same convention as `SPEC.z` in the Tangente.
- **Clock positions**: quoted in the back view unless marked "dial".
- **Angle θ_b**: measured clockwise from 12 in the back view.
- **Confidence tags**: [H] high, [M] medium, [L] low.
  - **[OFF]**: official Seiko/Grand Seiko text or image.
  - **[MEAS]**: my pixel measurement.
  - **ESTIMATE**: an engineering value that is not published. It is self-consistent and the reasoning is given.

---

## 0. Identity check

- **SBGA211G**: [OFF] H. Source: https://www.grand-seiko.com/us-en/collections/SBGA211G
  - Heritage Collection, "Spring Drive 3-Day".
  - Caliber **9R65**. Self-winding with manual winding.
  - Approx. **72 h**. **±15 s/month (±1 s/day)**. **30 jewels**. Power-reserve indicator.
  - High-intensity titanium case, 41.0 mm × 12.5 mm, 49.0 mm lug to lug.
  - Screw-down crown. See-through screw case back. 10 bar. 4,800 A/m.
- **Caliber page**: [OFF] H. Sources: https://www.grand-seiko.com/us-en/collections/movement/springdrive/9r65 and the JP page https://www.grand-seiko.com/jp-ja/collections/movement/springdrive/9r65
  - The 9R65 was the first Grand Seiko 9R Spring Drive (2004).
  - Winding went from "48-hour manual" to "automatic 72-hour".
  - It uses the **Magic Lever** automatic winding developed in 1959.
  - Features: power-reserve indicator, date display, hacking.
  - The JP page adds that the bridges and the oscillating weight carry a matching "波目模様" (wave/stripe pattern). It also says the train and bridges evoke the Shinshu mountains, with the PR train to the barrel representing the Hotaka and Jōnen ranges.
- **The movement in the photos is a 9R65A**. The automatic bridge is engraved "9R65A". Calibercorner notes that 9R65A is the only production variant. [MEAS]/[M] https://calibercorner.com/grand-seiko-caliber-9r65/
- **9R15** is the same movement with ±10 s/month adjustment and a gold rotor medallion. **Do not use it.** The 9R65 rotor is plain with blue "GS Grand Seiko". [M] Calibercorner.

---

## 1. Specifications

| Item | Value | Source / conf. |
|---|---|---|
| Type | Spring Drive. Mainspring-powered, quartz-regulated by the "Tri-synchro Regulator". Automatic (Magic Lever) with manual winding. No battery. | [OFF] H |
| Functions | Central hours, minutes and gliding seconds. Date (window at 3, dial). Power-reserve indicator (fan between 7 and 8, dial). Hacking. | [OFF] H; positions [MEAS] |
| Diameter | **30.0 mm**. GS: the 9RB2 keeps "the same compact, 30mm size as Caliber 9R65". | [OFF] H. https://www.grand-seiko.com/us-en/collections/evolution9/chronosje-2 |
| Height | **5.8 mm**. 9RA5 press release: "depth has been reduced from 5.8mm to 5.0mm" vs the 9R6 caliber. GS 9R 20th-anniversary chapter 7: 9RA2 is 5 mm, "0.8mm thinner than the 9R65". | [OFF] H. https://www.grand-seiko.com/global-en/news/20200305-10 and https://www.grand-seiko.com/be-en/special/9r20th/chapter7 |
| Jewels | 30 | [OFF] H |
| Power reserve | ≈72 h. Indicator: full ≈72 h, half ≈36 h. | [OFF] H. GS 9R manual https://www.grand-seiko.com/instructions/html/GS_9R_en/GOUMSYnubcknev.html |
| Accuracy | ±15 s/month (±1 s/day), worn at 5–35 °C. Operating range −10…+60 °C. | [OFF] H. Manual specs page https://www.grand-seiko.com/instructions/html/GS_9R_en/AGFISYjlvuuait.html |
| Crystal oscillator | 32,768 Hz | [OFF] H (manual) |
| IC | "Oscillator, frequency divider, and spring drive control circuit (C-MOS-IC): 1 piece" | [OFF] H (manual) |
| Hand movement | "Glide motion": continuous sweep, no ticking | [OFF] H |
| Glide wheel speed | **8 rev/s** ("a steady eight rotations per second"). 28,800 rev/h. | [OFF] H. https://www.grand-seiko.com/us-en/collections/movement/springdrive and Seiko press release Mar 2005 |
| Brake | Electromagnetic, applied "256 times per second" | [OFF] H. https://www.grand-seiko.com/global-en/worldofgrandseiko/manufacture/springdrivestories/chapter1 |
| Electronics power | 25 nW for the circuit and quartz | [OFF] H (Seiko press release 2005, Spring Drive 5R65 launch; same figure in GS 9R 20th, ch. 6) |
| Manual winding | Crown clockwise (toward 12) winds. Counter-clockwise turns free. **5 full crown turns ≈ 10 h** of running. Fully wound after 3–5 days of 12 h/day wear. | [OFF] H. Manual https://www.grand-seiko.com/instructions/html/GS_9R_en/AGFISYxwidandf.html |
| Over-wind | "the mainspring slips inside" when full (slipping bridle) | [OFF] H (manual) |
| Crown positions | 0: wind. 1st click: date (turn CCW). 2nd click: time; seconds stop (hack). Don't set the date 21:00–01:00. | [OFF] H (manual) |
| Date | "changes once every 24 hours at around midnight" | [OFF] H (manual) |
| Parts count | 276 (Seiko's figure for the first Spring Drive automatic 5R65, 2005). No 9R65-specific figure found. | [OFF for 5R65] M |
| Mainspring | "Spron 510" alloy (5R65, 2005 press release). Single barrel ("miniaturized the barrel while increasing the power reserve by 1.5 times" vs the 7R88). | M |
| Coil | 25,000 turns of 15 µm wire. Coil core of 18 laminations of 0.025 mm amorphous alloy (5R65). | M |
| Magic Lever | "fitted directly to the shaft of the rotor"; "30% more efficient" (5R65, 2005) | M |
| Shock protection | Diashock (gold-coloured lyre settings) on the glide-wheel and 6th-wheel bearings | [MEAS] H visual; name M (calibercorner tag) |

Sources not quoted above:
- Seiko press release, March 2005: http://web.archive.org/web/2016/https://www.theseikoguy.com/media/press/2005/mar_spring-drive.pdf (read locally).
- Koike & Moteki (Seiko Epson), "ゼンマイ駆動高精度ウォッチの発電・調速制御システムの開発", *Micromechatronics* 44(1), 2000: https://www.jstage.jst.go.jp/article/micromechatronics/44/1/44_KJ00001887785/_article/-char/ja (KM00).
- S. Aoki, 時計技術の系統化調査, National Museum of Nature and Science, Vol. 24 (2017), §7.6: http://web.archive.org/web/2022/https://sts.kahaku.go.jp/diversity/document/system/pdf/102.pdf (AOKI17).
- Teardown of an SBGA211 by The Naked Watchmaker: https://www.thenakedwatchmaker.com/decon-seiko-snowflake (TNW).

---

## 2. How Spring Drive works, for a truthful animation

A Spring Drive is a mechanical watch with the escapement removed. The mainspring drives an ordinary speed-increasing gear train, and the hands are geared to it as usual. The train ends in a small generator rotor, the **glide wheel**. It spins continuously in one direction and is held at exactly 8 rev/s by a quartz-referenced electromagnetic brake. Nothing oscillates and nothing ticks. [OFF] H

1. **Mechanical power.** The automatic rotor (Magic Lever) or the crown winds the single barrel.
   - The barrel drives: centre (2nd) wheel → 3rd → 4th (seconds) → 5th → 6th → glide-wheel pinion.
   - Train order is from Seiko Epson patent JP3632595B2 (automatic Spring Drive with Magic Lever and PR), confirmed by TNW photos. [M]
   - The centre wheel turns at 1 rev/h. The ratio from the centre wheel to the glide wheel is **28,800**. [OFF] H
2. **Generator.** The glide wheel carries a **2-pole cylindrical magnet** and a gilt three-spoke **inertia disc**. The disc steadies rotation against wrist shocks. [H for Spring Drive design: KM00 p.17, AOKI17; M for 9R65; TNW shows the "circular magnet" and the gilt 3-spoke disc]
   - Two **coil blocks** (stators with amorphous laminations) surround the magnet with semicircular pole pieces.
   - The coils are connected **in series** and are left/right symmetric. The two-coil layout helps detect rotor rotation and resists external fields. [H, KM00/AOKI17]
   - Each revolution induces one sine cycle (8 Hz).
   - The output is rectified and voltage-doubled into a capacitor that powers the IC and quartz. There is no secondary battery, which is why the watch starts after only a little winding. [H for the 7R system]
3. **Reference.** The 32,768 Hz quartz is divided 12 times (÷2¹²) to an exact **8 Hz** reference. [H, AOKI17]
4. **Brake.** Unbraked, the train is geared to run the glide wheel **faster than 8 Hz**, so the regulator is **always braking**. [H, AOKI17]
   - The IC compares the rotor's rotation (detected from the coil voltage once per revolution, and confirmed over 3 consecutive detections) with the 8 Hz reference.
   - It brakes by **short-circuiting the coil** with transistors, chopped at fixed frequency with variable duty (KM00: 256 Hz chopping, 30% duty = weak brake, 80% = strong). GS states the brake is applied "256 times per second". [H]
   - Braking is contact-free, so nothing wears and nothing visible moves except the glide wheel.
5. **Glide motion.** The whole train is phase-locked to the quartz, so every wheel turns at a perfectly uniform rate. The seconds hand sweeps exactly 6°/s.

**Animation rules**
- Drive every mobile analytically from one master time `t`.
- The glide wheel is `8·t` revolutions. Nothing jitters. The 256 Hz brake chopping and the sub-revolution speed ripple are invisible: no figures were found, and they are below a frame anyway.
- When the reserve reaches zero, the glide wheel and all hands stop together.
- When the crown is at the 2nd click, a stop lever brakes the glide wheel and the train stops (hack).
- Restart: on Seiko's design the lever releases and nudges the rotor (JP3632595B2) [M].

---

## 3. What is visible through the display back (back view, crown on the left)

| Region (back view) | What you see |
|---|---|
| Whole back, most of the time | **Oscillating weight (rotor)**: a semicircular silver plate, r 14.0, with two large windows and dark-blue **"GS" + "Grand Seiko"**. It carries the same diagonal stripe ("wave") decoration as the bridges. Central hub boss Ø2.8 with 3 screws. |
| Under the rotor | One large **automatic (winding) bridge**: rhodium-grey, broad diagonal stripes, r 13.6, with a lower outer rim band (r 11.4–13.6). Gilt engravings **"9R65A JAPAN"** (r 9.9, 12:40–2:35) and **"THIRTY JEWELS"** (rim band, 12:35–2:25). Plain engraving **"SEIKO ○ TIME CORP. 2"** on the rim band (7:50–9:50). Steel slotted screws. |
| 11:00–12:10, a notch in the automatic bridge | **Gold Diashock setting of the glide wheel** (11:34, r 9.6) and a sector of its **gilt inertia disc**. Through a window below it, the **gold Diashock of the 6th wheel** (11:23, r 6.8). The train bridge (striped) lies underneath. A sliver of **copper coil** shows at about 12:00–12:30. |
| 3:00–4:30, a cutout | Small **PR bridge** at r 9.3–14.3 with 3 pink jewels and one screw. A **fine-toothed wheel rim** shows in the gap between the PR bridge and the automatic bridge. |
| 4:30–7:15, a large cutout | **Ratchet wheel**: steel, sunburst, ≈74 teeth, R ≈4.5, big slotted screw, centre at 5:40, r 7.7. It sits on the striped **barrel bridge**. The **click** is at 7:00 (screw r 10.2). |
| Jewels set in the automatic bridge | A dark jewel at 4:24 (r 7.4): the Magic Lever transmission (pawl) wheel. A pink jewel at 7:35 (r 5.7): keyless intermediate wheel. |
| 7:30–8:00, a window (r ≈8.4) | Teeth of a keyless wheel. |
| Hidden | Barrel, train wheels except as noted, coils, IC/PCB and quartz (under the train bridge), Magic Lever (under the automatic bridge), all dial-side works. |

There are **no blued screws, no gold chatons** other than the two Diashock settings, and **no perlage** visible from the back. TNW notes the stripes are cut with a diamond cutter "in a circular motion", so the bands have a fine circular-grain texture.

---

## 4. Measurement method and image list

**Masters.** The geometry was measured on the TNW teardown photos of an SBGA211's 9R65. The official GS images are perspective renders, used only for colours and text.

**Master frame: `mov_naked_25.jpg`.** This is the movement with the rotor removed, automatic bridge in place, at 1100×733.
- The 30.0 mm plate silhouette was fitted with an ellipse:
  - Centre px (504.83, 362.01).
  - Semi-axes 329.57 / 348.60 px at θ = 67.05°, i.e. 22.0 / 23.2 px/mm.
  - Camera tilt about 19°.
- The rotor-bearing centre at px (493, 335) is the movement centre.
- Height parallax is (−2.96, −6.97) px per mm of height. It was checked against the tilt geometry: direction and magnitude agree within 5%.
- The rotation was set by the winding stem, which lies on the 9 o'clock axis. Mapped stem points fall at y = −0.1…+0.9.

**Cross-checks**
- Straight-on case-back photo `ltF_6.jpg` (exterior agent's download from Loupe This, 3770 px): similarity fit 61.63 px/mm, rotation +1.5°, hub px (1895, 1851). Residuals **0.24 mm rms** on 4 features.
- `mov_ww_25.jpg` (Worn & Wound): 38.71 px/mm, 0.24 mm rms.
- Positions of jewels and arbors: ±0.2–0.3 mm. Bridge edges: ±0.5 mm. Items marked ESTIMATE have no measurement.

**Automatic-bridge outline and engravings.**
- Taken from the bridge photographed alone (`mov_naked_28`), chained into the master by a similarity (scale 0.6395, rotation −158.2°).
- Then affinely corrected so that its rim is a centred circle of R 13.6.
- Validation: after correction the "THIRTY JEWELS" letters sit at r = 12.18–12.38 (uniform), versus 10.7–12.3 before.

| File (all in `…/scratchpad/img/gs-sbga211/`) | What it is | Scale / centre pixel used |
|---|---|---|
| mov_naked_25.jpg (1100×733) | Rotor removed, back. **MASTER.** | Ellipse above. Centre px (493, 335) at bridge height; plate ellipse centre (504.8, 362.0). ~22.6 px/mm. |
| mov_naked_27.jpg (1100×734) | Automatic bridge removed: coils, train bridge, ratchet, Diashocks | Affine from 4 points: 20.1 × 26.3 px/mm. Centre-wheel jewel px (447, 313). |
| mov_naked_28.jpg (983×786) | Automatic bridge alone, top view | Bearing px (485, 405). ≈36 px/mm (0.6395 × master). |
| mov_naked_29.jpg (1100×879) | Automatic bridge underside: Magic Lever, pawl wheel | Mirrored view. Eccentric boss px (520, 445). |
| mov_naked_30.jpg (1100×1100) | Ratchet close-up | Ratchet centre px (687.4, 688.0). Tip ellipse 338.1 × 309.0 px. Tooth count ≈74. |
| mov_naked_26.jpg (1100×631) | Rotor alone | Pivot px (548.9, 86.4). 39.3 px/mm horizontal, 37.8 px/mm vertical. Outer R = 14.0 mm. |
| mov_naked_32.jpg (1100×733) | Train bridge removed: wheels, coils, IC, barrel | ≈32.4 px/mm. Glide px (366, 284), barrel px (841, 580). |
| mov_naked_35.jpg (1100×682) | Loose barrel and 5 train wheels | Barrel tip ellipse c (768.3, 212.3), 204.6 × 219.8 px. Barrel ≈146 teeth. |
| mov_naked_36.jpg | Glide wheel, magnet side | Qualitative |
| mov_naked_37.jpg (1100×733) | Train removed: PCB, IC, quartz, coils | Similarity 41.2 px/mm, rotation −141.6°. Glide jewel px (416.9, 401.9). |
| mov_naked_40.jpg (2048×1365) | The two coils, loose | Qualitative |
| mov_naked_41.jpg, mov_naked_43.jpg | Back with electronics/train removed; PR differential | n43: 27.15 px/mm, rotation −20.0°. Centre-wheel px (581, 287). |
| mov_naked_23/44/45.jpg | Dial side, date ring, calendar works | n23: 22.8 px/mm. Cannon-pinion px (352.6, 357.9). |
| mov_naked_20.jpg (1100×1100) | Dial, loose | Centre px (548, 562). PR pivot px (435, 750). Date window px (954, 571). |
| ltF_6.jpg (3770², exterior agent) | Case back straight-on | 61.63 px/mm. Hub px (1895, 1851). |
| ltF_12.jpg (3770², exterior agent) | Dial straight-on | 84.4 px/mm (case Ø41.0 = 3460 px). Centre px (1892, 1808). |
| mov_ww_24/25/27.jpg (2500×1667) | Worn & Wound case back | ww25: 38.71 px/mm. Hub px (1323, 765). |
| mov_07_SBGA211_9R65.jpg, mov_gs_9r65_full.png | Official GS renders (perspective) | Colours and texts only |
| mov_gs_sd_img01–04.png | Official Spring Drive images (9RB2) | Qualitative (glide wheel and coil look) |
| mov_gsb_9r65.jpg, mov_gsb_case.jpg | GS boutique (US) caliber and case images | Qualitative |

**Other files**
- Scripts: `…/scratchpad/scripts-gsmov/` (rectify.py, fit_map.py, toothseq.py, gapellipse.py, n28chain.py, awbfix.py, …).
- Measurement JSON: `…/scratchpad/w/meas/`.
- Image URLs:
  - Naked Watchmaker: `https://images.squarespace-cdn.com/content/v1/58bb0536893fc04255997b40/…`, listed in `…/scratchpad/html-gsmov/naked_imgs.txt`.
  - Worn & Wound: `https://wornandwound.com/library/uploads/2021/02/GS_SBGA211_SNOWFLAKE_<n>.jpg`.
  - Loupe This: https://loupethis.com/auctions/grand-seiko-heritage-collection-sbga211-snowflake-titanium

---

## 5. Layout (measured; back view and dial frame)

| Mobile / feature | x_b | y | r | Back clock | Dial frame (x, y) | Basis |
|---|---|---|---|---|---|---|
| Centre (2nd) wheel, cannon pinion, 4th (seconds) arbor, rotor pivot | 0 | 0 | 0 | — | (0, 0) | Definition. 4th-wheel jewel at the centre [MEAS] H. |
| 3rd wheel | 3.34 | −0.57 | 3.39 | 3:21 | (−3.34, −0.57) | n43 + n27 jewels [MEAS] M |
| 5th wheel | −1.57 | 2.97 | 3.36 | 11:04 | (1.57, 2.97) | n43 + n27 jewels [MEAS] M |
| 6th wheel (gold Diashock) | −2.73 | 6.19 | 6.77 | 11:23 | (2.73, 6.19) | [MEAS] H |
| **Glide wheel** (generator rotor; gold Diashock) | −2.12 | 9.32 | 9.56 | 11:34 | (2.12, 9.32) | [MEAS] H |
| Barrel and ratchet arbor | 1.20 | −7.65 | 7.74 | 5:41 | (−1.20, −7.65) | [MEAS] H. Ratchet screw (1.29, −7.75). Ratchet centre (1.03, −7.51). |
| Magic Lever transmission (pawl) wheel | 5.35 | −5.10 | 7.39 | 4:24 | (−5.35, −5.10) | Jewel in automatic bridge (5.12, −5.32) + underside photo (5.6, −5.5) [MEAS] M |
| Magic Lever eccentric | rotor axis, offset ≈0.5 | — | — | — | (0, 0) | [MEAS] M: lever boss at the centre within 0.1–0.9 |
| Keyless intermediate (crown transmission) wheel | −4.09 | −3.91 | 5.66 | 7:35 | (4.09, −3.91) | Pink jewel in automatic bridge [MEAS] H position, role M |
| Crown wheel | −8.0 | −1.8 | 8.2 | 8:35 | (8.0, −1.8) | ESTIMATE (round recess in n27 at (−8.04, −1.78)) |
| Winding pinion (on stem) | −9.6 | 0 | 9.6 | 9:00 | (9.6, 0) | ESTIMATE |
| Click screw / click tip | (−5.15, −8.70) / (−3.35, −8.37) | | 10.1 | 7:00 | (5.15, −8.70) | [MEAS] H, both photos |
| PR differential arbor a (jewel) | 9.65 | −2.25 | 9.91 | 3:26 | (−9.65, −2.25) | [MEAS] H position, role ESTIMATE |
| PR differential arbor b (jewel) | 10.37 | −4.85 | 11.45 | 3:50 | (−10.37, −4.85) | [MEAS] H |
| PR differential arbor c (jewel) | 9.75 | −7.67 | 12.41 | 4:16 | (−9.75, −7.67) | [MEAS] H |
| Fine-toothed wheel rim seen at 3:20–4:45 | Arc through (9.78, −1.86) … (6.82, −8.87) | | 10.0–11.2 | | | [MEAS]. Circle fit c (2.34, −2.74), R 7.24. **Unidentified** (L), see §12. |
| Coil A (outer) winding axis | (1.26, 9.67) → (8.54, 7.87) | | | 12:30–1:50 | (−1.26, 9.67) → (−8.54, 7.87) | n27/n32/n37 [MEAS] M ±0.8. Axes aimed at the glide magnet. |
| Coil B (inner) winding axis | (0.70, 7.43) → (7.98, 5.63) | | | | (−0.70, 7.43) → (−7.98, 5.63) | as above |
| IC (C-MOS, ~2.8 mm square, rotated ~41°) | −6.6 | 7.0 | 9.6 | 10:33 | (6.6, 7.0) | n37 + n32 [MEAS] M ±1 |
| Quartz can (Ø ≈1.2 × 5.9) | (−2.9, 13.8) → (−7.6, 10.3) | | 13.1 | 11:20 | (2.9, 13.8) → (7.6, 10.3) | n37 [MEAS] L–M |
| Hack (stop) lever finger on the glide-disc rim | −5.1 | 9.3 | | | (5.1, 9.3) | ESTIMATE (role from JP3632595B2) |
| **Dial side:** PR indicator hand / display wheel | — | — | 7.23 | dial 7:00 | **(−3.46, −6.35)** | ltF_12 and n20 [MEAS] M ±0.3 |
| Dial side: PR intermediate | — | — | | | (−6.75, −3.80) | ESTIMATE |
| Dial side: minute wheel / setting wheel / date driver / date jumper | — | — | | | (2.15, −1.80) / (5.60, −1.30) / (4.60, −3.85) / (9.0, −4.0) | ESTIMATE |
| Date ring | Centre. Numerals at r ≈ 12.9, internal teeth tips r ≈ 8.0. Window at dial 3:00. | | | | | n23 / ltF_12 [MEAS] M |

**Remarks**
- The four high-speed arbors (centre/4th → 5th → 6th → glide) climb from the centre toward 11:30. Each centre distance is ≈3.2–3.4 mm.
- The barrel is very large (tip R ≈7.2, Ø14.4). Its rim runs from y ≈ −0.5 to −14.9 and passes under the 3rd and centre wheels at different heights.
- The PR differential sits on the **back** side under its own bridge at 3:20–4:20. This was established by matching n41 and n43 to the back views. The patent drawing has it elsewhere. The PR hand itself is on the dial at dial 7:00, so a short dial-side train must connect them (ESTIMATE).

---

## 6. Bridges, screws, jewels, engravings, finishing

### 6.1 Automatic (winding) bridge [MEAS, corrected; edges ±0.5]

- **Outer rim**: circle R 13.6. A lower **rim band** runs from r 11.4 to 13.6 and carries the rim texts.
- **Cutouts** (back view, θ_b clockwise from 12):
  - (a) **Glide notch**, 331°–5°. The edge comes in to r ≈ 9.0–9.3, which exposes the glide wheel and its Diashock.
  - (b) **PR cutout**, 92°–132°. The edge is at r 8.9–11.0.
  - (c) **Ratchet cutout**, 133°–216°. The edge is at r 5.8–6.8, with a lobe at 158–162° reaching r 7.9.
  - The polygon is given in SPEC DATA (dial frame).
- **Windows** (corrected centres):
  - Big window at (−2.98, 5.94), about 3 × 2.8. It shows the 6th Diashock.
  - Keyless window at (−7.33, −4.13), about 3.6 × 2.0.
- **Rotor bearing**: ball bearing at the centre. Its outer race is pressed into the bridge; the boss is about Ø6.0. [MEAS]
- **Screws** (polished steel, slotted, head Ø1.55; on the rim band at r ≈ 12.2):
  - A (−10.15, 6.85)
  - C (−7.50, −9.65)
  - D (12.20, 1.25)
  - Hole/pin B at (−11.92, 1.75), Ø0.6, between "SEIKO" and "TIME".

### 6.2 Train bridge and barrel bridge (mostly hidden; ESTIMATE polygons from n27, ±0.8)

- **Train bridge** carries the upper jewels of the centre/4th, 3rd, 5th, 6th and glide wheels. The 6th and glide jewels are gold Diashock settings.
- **Barrel bridge** carries the ratchet, the click and the pawl-wheel lower jewel at (5.01, −5.03).
- Both are striped like the automatic bridge.

### 6.3 PR bridge (ESTIMATE outline, jewels [MEAS])

- Inner edge runs at r 9.3 → 11.2 from θ_b 96° to 142°. Outer edge at r 14.3.
- 3 jewels: a, b and c above.
- Screw at (8.73, −10.21), Ø1.4.

### 6.4 Other visible screws

| Screw | Position (back) | Head |
|---|---|---|
| Ratchet screw | (1.25, −7.70) | Ø2.4, slotted |
| Click screw | (−5.15, −8.70) | Ø1.6 |
| Plate-edge / casing-clamp screws outside the automatic bridge (r 13.8–14.4) | about (−14.26, 2.05), (−1.54, 13.82), (−9.28, −10.39), (−14.21, −3.70) | [MEAS] L |
| Rotor hub | 3 screws at r 1.1 on a Ø2.8 boss | Rotate with the rotor |

### 6.5 Visible jewels

| Jewel | Position (back) | Appearance |
|---|---|---|
| Glide upper | (−2.12, 9.32) | Gold Diashock, Ø ≈1.6 setting |
| 6th upper | (−2.73, 6.19) | Gold Diashock, Ø ≈1.3 |
| Pawl wheel | (5.35, −5.10) | Dark/purple, Ø0.9 |
| Keyless intermediate | (−4.09, −3.91) | Pink, Ø0.9 |
| PR a / b / c | (9.65, −2.25) / (10.37, −4.85) / (9.75, −7.67) | Pink, Ø0.7 |

- **30-jewel allocation (ESTIMATE)**:
  - Centre 2, 3rd 2, 4th 2, 5th 2, 6th 2, glide 2 (Diashock): 12.
  - Barrel arbor 2, pawl wheel 2, keyless 2: 6.
  - PR differential and its dial-side train 8.
  - Magic Lever pivot and date/other 2.

### 6.6 Engravings [MEAS text H; positions ±0.4]

All letters are upright sans-serif capitals. Every rim and arc text reads **counter-clockwise in the back view, with letter tops pointing toward the centre**. That is why "THIRTY JEWELS" looks upside-down at the top of the official render.

| Text | Placement (back view) | Size | Fill |
|---|---|---|---|
| **THIRTY JEWELS** | Rim band arc r 12.25, from θ_b 73° ("T") to 18° ("S") | Cap ≈0.70 | Gold-filled (#B98A3E–#D6A954) |
| **9R65A** | Arc r 9.9, θ_b 78° → 51° | Cap ≈0.75 | Gold |
| **JAPAN** | Arc r 9.9, θ_b 42° → 18° | Cap ≈0.75 | Gold |
| **SEIKO** | Rim band arc r 12.25, θ_b 294° → 281° | Cap ≈0.70 | Unfilled |
| ○ (hole/pin B) | θ_b 278° | — | — |
| **TIME CORP.** | Rim band arc r 12.25, θ_b 275° → 244° | Cap ≈0.70 | Unfilled |
| **2** | Rim band, θ_b 236° | Cap ≈0.70 | Unfilled |
| **Rotor** (rotor-local, pivot at origin, mass toward −y): **"GS" monogram** | Centre (−0.20, −6.00) | ≈3.3 × 2.3 | Dark navy (#1E2A55), blackletter-style GS logo |
| Rotor: **"Grand Seiko"** wordmark | Centre (−0.35, −8.46) | Width ≈11.1, cap ≈1.1 | Dark navy |

### 6.7 Finishing and colours

| Surface | Finish | Colour [MEAS from photos] |
|---|---|---|
| Bridges and rotor | Rhodium-grey "wave" stripes (Côtes-like bands). Bridges: band pitch ≈2.2 mm at about −34° (descending to the right in back view). Rotor: pitch ≈2.0, about −25° in rotor-local coordinates. Fine circular grain within each band. Polished bevels on all edges. | #C9CCCE lit to #8E9295 shade |
| Rim band of the automatic bridge | Fine concentric (circular) graining | — |
| Ratchet | Steel, radial sunburst | — |
| Rotor heavy rim | Thicker, polished edge | — |
| Glide wheel, train wheels | Gilt (gold-plated) | #D8B47A |
| Coils | Copper windings | #B8643A highlights #E39A6A |
| Diashock settings | Gold | #C8A15A |
| Jewels | Pink-purple | #A0507E |
| Screws | Polished steel. **No blued screws.** | — |
| Bridges, base colour | Rhodium | #CDD0D2 |

---

## 7. Gear train (ESTIMATE counts, consistent with official rates and measured distances)

Not published anywhere I could find: no Seiko parts list, technical guide or patent with 9R65 counts.

**Image counts**
- Barrel ≈146 (n35; 53 gaps fitted along the rim, rms 0.5°).
- Centre wheel ≈84–85 (n43, full circle).
- Centre-wheel pinion 14 (FFT).
- One spoked train wheel 80.0 (very clean).
- Another spoked train wheel ≈75–76.
- Ratchet ≈74 (rms 0.13–0.23° over 230°).

The set below honours these counts and the official rates: centre 1 rph, seconds 1 rpm, glide 8 rev/s. Modules follow from the measured centre distances, `m = 2d/(z1+z2)`.

| Mesh | Driver → driven | d (mm) | Module | Ratio | Tip R driver | Status |
|---|---|---|---|---|---|---|
| Barrel → centre pinion | 146 → 14 | 7.744 | 0.0968 | 10.43 | 7.20 | 146 [MEAS] M; 14 [MEAS] M |
| Centre wheel → 3rd pinion | 84 → 14 | 3.388 | 0.0691 | 6 | 3.00 | 84 [MEAS] M; 14 ESTIMATE |
| 3rd wheel → 4th pinion | 80 → 8 | 3.388 | 0.0770 | 10 | 3.18 | 80 [MEAS] M; 8 ESTIMATE |
| 4th wheel → 5th pinion | 80 → 10 | 3.359 | 0.0747 | 8 | 3.09 | ESTIMATE |
| 5th wheel → 6th pinion | 75 → 10 | 3.423 | 0.0805 | 7.5 | 3.13 | 75 [MEAS] L; 10 ESTIMATE |
| 6th wheel → glide pinion | 64 → 8 | 3.189 | 0.0886 | 8 | 2.95 | ESTIMATE |

**Rate check**
- Centre 1 rph × 6 = 3rd 6 rph (1 rev / 10 min).
- × 10 = 4th **60 rph = 1 rpm** (seconds).
- × 8 = 5th 480 rph (8 rpm).
- × 7.5 = 6th **3,600 rph = 1 rev/s**.
- × 8 = glide **28,800 rph = 8 rev/s**. Exact, and matches [OFF] "28,800 times per hour".
- Barrel: 1 rev / 10.43 h. 72 h ⇒ 6.9 barrel turns.

**Tooth form.** Generic watch ogival. Wheel tip R = m(z + 2.7)/2; pinion tip R = m(z + 1.4)/2.

**Glide wheel geometry** [MEAS M / ESTIMATE]
- Gilt inertia disc: R 3.0, rim width 0.35, 3 straight spokes, hub Ø1.2.
- 2-pole magnet: Ø2.6 × 0.5 high.
- Pinion: 8 leaves.
- Stator pole hole: R 1.5 (US6633511 example: hole radius 1.5, magnet 0.4 thick).

**Directions** [H logic from the meshing order; minute and seconds hands run clockwise on the dial]

| Mobile | Seen from the BACK | Seen from the DIAL | rotation.z sign in the dial frame (+ = CCW from dial) |
|---|---|---|---|
| Barrel drum (running) | CW | CCW | + |
| Centre wheel, cannon pinion, minute hand | CCW | CW | − |
| 3rd | CW | CCW | + |
| 4th / seconds hand | CCW | CW | − |
| 5th | CW | CCW | + |
| 6th | CCW | CW | − |
| **Glide wheel** | **CW** | CCW | + |
| Minute wheel | CW | CCW | + |
| Hour wheel / hour hand | CCW | CW | − |
| Date driving wheel (driven by the hour wheel) | CW | CCW | + |
| **Date ring** (internal teeth; numerals increase clockwise; next date comes up from 4 o'clock into the 3 o'clock window) | CW | **CCW** | + |
| Ratchet and barrel arbor (winding only) | CW | CCW | + |
| Pawl wheel (winding) | CCW | CW | − |
| Keyless intermediate (winding) | CCW | CW | − |
| Crown wheel (winding) | CW | CCW | + |
| PR hand (as the reserve falls) | — | CCW (from "full" at 12 toward "empty" at ≈9) | + |

---

## 8. Power reserve, winding, keyless, date, motion works

### 8.1 Power-reserve indicator [OFF function H; mechanism M/ESTIMATE]

- **Mechanism**: an epicyclic **differential**.
  - Winding input: from the barrel arbor/ratchet.
  - Unwinding input: from the barrel drum.
  - Output: the net state of wind.
  - Arrangement per Seiko Epson JP3632595B2 [M].
- **On the 9R65** it lies on the **back** under the PR bridge (3:20–4:20, r 10–12.5).
  - TNW photo n43 ("the gear train which associates with the power reserve indicator") shows planet-type wheels there [MEAS].
- **Output path (ESTIMATE)**: the output arbor passes through the plate, then a dial-side intermediate, then the PR display wheel at dial (−3.46, −6.35).
- **Display** (dial frame, n20 and ltF_12):
  - The fan sector's pivot is at dial 7:00, r 7.2.
  - **Full** = hand pointing to 12. **Empty** = hand rotated ≈**95° CCW** (seen from the dial; pointing to about 8:50).
  - Angle = +95° × (1 − reserve/72 h). That is 1.32°/h.
  - Equivalent ratio from net arbor turns to hand: 6.9 turns ↔ 95°, i.e. ≈26:1.

### 8.2 Manual winding [OFF ratio H; train ESTIMATE]

- **Official ratio**: 5 crown turns ≈ 10 h of reserve. That is 0.959 barrel turns per 5 crown turns, i.e. 0.192 barrel turns = **69° per crown turn**.
- **With a ratchet of 74**: 14.2 ratchet teeth per crown turn.
- **ESTIMATE train**:
  - Winding pinion with 14 face teeth → crown wheel 28 → keyless intermediate 30 → ratchet 74.
  - Net 14/74 = 0.189 barrel turns per crown turn. 5 turns ⇒ 9.9 h.
- **Full wind from empty**: 72 / 10.43 = 6.9 arbor turns ≈ **36.5 crown turns**.
- **Click**: at 7:00 on the barrel bridge, tip on the ratchet. It lifts once per ratchet tooth (360/74 = 4.86°), i.e. about 14 clicks per crown turn.
- **Slipping bridle**: when full, further winding makes the spring slip inside the barrel. Animate as the ratchet keeps turning while the reserve stays at 100% and the coils stop tightening.

### 8.3 Automatic winding, Magic Lever [OFF principle H; geometry MEAS M; ratios ESTIMATE]

- **Principle**:
  - The lever's shaft rides on an **eccentric on the rotor shaft** (fitted directly to the rotor, 2005 press release).
  - Whichever way the rotor turns, the lever moves back and forth.
  - The lever has two different spring pawls, "pull" and "push", whose tips stay in contact with the transmission (pawl) wheel's teeth. Downstroke: the pull pawl drives and the push pawl slides. Upstroke: the reverse.
  - Result: the pawl wheel always turns one way. Its pinion drives the ratchet directly (JP3632595B2).
  - Sources: https://museum.seiko.co.jp/en/knowledge/trivia04/ and the 9R 20th chapter 7 page.
- **9R65 geometry**:
  - Eccentric at the centre, throw ≈0.5 (ESTIMATE).
  - Lever about 7.4 long, from the centre to the pawl wheel at (5.35, −5.10).
  - Pawl wheel: very fine ratchet-like teeth, ≈110 ESTIMATE, tip R ≈3.2.
  - Pawl-wheel pinion: 10 leaves (ESTIMATE). Meshes the ratchet at d = 4.87, m 0.116.
- **Kinematics (ESTIMATE)**:
  - Per rotor revolution (either direction), the pawl wheel advances ≈4e/r ≈ 0.62 rad ≈ 36°.
  - The ratchet therefore advances 36° × 10/74 ≈ **4.8° per rotor turn**.
  - About 510 rotor turns wind it from empty to full.
  - Animate the lever as a link driven by the eccentric angle. Each pawl advances the wheel during its half-stroke.

### 8.4 Mainspring (ESTIMATE)

| Item | Value |
|---|---|
| Barrel drum | Inner Ø13.4, height 1.55 (z −1.55…−3.10). Teeth band at the dial-side end. |
| Arbor | Ø4.4 |
| Spring | Height 1.25, thickness ≈0.10. Spron 510 [M]. |
| Usable turns | ≈7.2 |
| Coils | ≈15 when let down, ≈24 when wound |

### 8.5 Date (dial side) [OFF behaviour H; geometry M/ESTIMATE]

- **Date ring**: 31 internal teeth.
  - Internal tooth tips at r ≈ 8.0; outer R ≈ 14.3; 0.15 thick.
  - Numerals centred at r ≈ 12.9.
  - Seen from the dial, numerals increase **clockwise**. Each numeral's "up" points along the CCW tangent, so the number in the 3 o'clock window is upright.
- **Drive**: hour wheel (40) → date driving wheel (80; 24 h, CCW from the dial) with a finger of reach ≈2.6.
  - The finger engages gradually. The jumper completes the change at about midnight.
  - ESTIMATE timing: driving from about 22:30, jumper snap at 00:00. This is consistent with the official "do not set 21:00–01:00" window.
- **Date jumper**: spring lever at about dial (9.0, −4.0).
- **Covering plate**: the date-ring guard / calendar plate (n23) covers the centre to r ≈ 8.3.
- **Quick-set**: crown at the 1st click, turning CCW.

### 8.6 Motion works (ESTIMATE; hidden)

- Cannon pinion 14 (friction-fit on the hollow centre-wheel arbor; carries the minute hand) → minute wheel 42 → minute pinion 10 → hour wheel 40. Ratio (42/14)(40/10) = 12.
- Seconds: the 4th wheel's long arbor passes through the hollow centre arbor to the seconds hand. This is direct centre seconds (JP3632595B2) [M]. TNW n35 shows the thin 4th-wheel disc on its long arbor.

### 8.7 Hacking [OFF function H; geometry ESTIMATE]

- At the 2nd click a stop lever touches the glide wheel's inertia disc at about back (−5.1, 9.3), and the whole train stops.
- GS advises not to hold it stopped for more than 30 min.

---

## 9. Vertical stack (ESTIMATE, collision-checked, total 5.80)

`z = 0` is the dial-side face of the main plate; the back side is negative.

| z range | Part |
|---|---|
| +0.45…+0.75 | Calendar / date-ring guard plate. Dial seat at **+0.75**. |
| +0.30…+0.45 | Date ring |
| +0.02…+0.32 | Motion works, setting levers, date driver, dial-side PR wheels (in plate recesses) |
| −0.60 | **Stem axis** (Ø0.9) |
| −1.20…0 | Main plate |
| −1.20…−1.75 | PCB (flex + stiffener) and IC package |
| −1.35…−2.55 | Quartz can (axis −1.95) |
| −1.24…−1.34 | Centre (2nd) wheel. Pinion −1.55…−1.80 meshes the barrel teeth. |
| −1.42…−1.52 | 3rd wheel. Its pinion −1.22…−1.40 meshes the centre wheel. |
| −1.40…−1.56 | 4th pinion (meshes the 3rd wheel) |
| −1.55…−3.10 | Barrel drum (teeth band −1.55…−1.75) |
| −1.25…−3.05 | Coil windings (axis −2.15, Ø1.8) |
| −1.80…−2.30 | Stator pole pieces and glide magnet |
| −2.38…−2.54 | Glide pinion |
| −2.42…−2.50 | 6th wheel (pinion −2.76…−2.92) |
| −2.80…−2.88 | 5th wheel (pinion −3.12…−3.26) |
| −3.00…−3.08 | Glide inertia disc |
| −3.12…−3.25 | PR differential wheels |
| −3.16…−3.22 | 4th wheel |
| −3.30…−3.75 | Train bridge, barrel bridge, PR bridge. Diashock tops −3.85. |
| −3.75…−3.97 | Ratchet (screw head to −4.07); click; keyless intermediate; crown wheel (upper) |
| −3.95…−4.05 | Pawl wheel (its pinion −3.75…−3.95); Magic Lever |
| **−4.08…−4.48** | **Automatic bridge**. Rim band (r ≥ 11.4) top at −4.33. |
| −4.20…−4.80 | Rotor ball bearing |
| −4.70…−5.00 | Rotor plate |
| −4.38…−5.05 | Rotor heavy rim (r 12.8–14.0). It clears the rim band, whose top is at −4.33. |
| to **−5.05** | Hub cap and 3 screws |

Total height = 0.75 + 5.05 = **5.80** [OFF height H; split ESTIMATE].

---

## 10. Rotor (oscillating weight) [MEAS M]

- **Frame**: rotor-local, pivot at the origin, centre of mass toward −y. Viewed from the back, the "Grand Seiko" text reads upright when the weight hangs at 6.
- **Shape**: a half-disc of **outer R 14.0** (outer arc from 183.4° to 356.6°).
  - **Heavy rim** r 12.8–14.0.
  - The **top edge** is gabled: apex (0, 2.02) → (±8.34, −1.26) → small ears (±12.1, −0.5) → arc ends (±14.0, −0.82).
  - **Two windows** symmetric about x = 0 (polygons in SPEC DATA).
  - Small diamond hole at the pivot.
  - Rivets at (±11.05, −1.63) and (−0.23, −10.39).
  - Hub boss Ø2.8 with 3 screws at r 1.1.
- **Material**: not published. Animate as silver steel.
- **Bearing**: ball bearing (JP3632595B2 [M]).
- **Motion**: free, bidirectional, driven by wrist motion. Rotor angle is input to the Magic Lever (§8.3).

---

## 11. Labelled parts list (ids, names, plain-English descriptions)

**Frame and bridges**
- `main-plate` (Main plate): The base plate that every other part is mounted on. The dial-side calendar works sit on one face, the gear train and electronics on the other.
- `automatic-bridge` (Automatic winding bridge): The large striped bridge under the rotor, engraved "9R65A JAPAN" and "THIRTY JEWELS". It holds the rotor's ball bearing and the Magic Lever winding system.
- `train-bridge` (Train bridge): Holds the top pivots of the gear train and the glide wheel. The two gold shock-absorbing settings are mounted in it.
- `barrel-bridge` (Barrel bridge): Holds the mainspring barrel; the ratchet wheel and click sit on top of it.
- `pr-bridge` (Power-reserve bridge): A small bridge at 3–4 o'clock holding the jewelled power-reserve differential gears.
- `plate-screws` (Screws): Polished steel screws hold the bridges together. Unlike many watches, none are blued.
- `jewels` (Jewels, 30): Synthetic rubies used as low-friction bearings for the fast-turning arbors.
- `diashock` (Diashock settings): Gold-coloured spring-mounted jewel settings for the glide wheel and 6th wheel. They let these fast, light arbors survive knocks.

**Power and winding**
- `rotor` (Oscillating weight / rotor): The half-moon weight with the blue "GS Grand Seiko" logo. It swings with every wrist movement to wind the watch automatically.
- `magic-lever` (Magic Lever): Seiko's 1959 invention. A lever riding on an eccentric on the rotor's shaft, with a "pull" pawl and a "push" pawl, turns the rotor's back-and-forth swings into one-way winding.
- `pawl-wheel` (Transmission (pawl) wheel): The fine-toothed wheel the Magic Lever's pawls drive. Its pinion turns the ratchet wheel.
- `ratchet-wheel` (Ratchet wheel): The sunburst-finished wheel on the barrel arbor. Turning it winds the mainspring.
- `click` (Click): A spring pawl that lets the ratchet turn only in the winding direction, so the spring cannot unwind backwards.
- `crown-wheel` / `keyless-intermediate` (Crown wheel and keyless intermediate wheel): Carry the crown's turning to the ratchet when winding by hand.
- `winding-stem`, `winding-pinion`, `sliding-pinion`, `setting-lever`, `yoke`, `setting-wheel` (Keyless works): Connect the crown to winding, date setting (1st click) and time setting (2nd click).
- `barrel` (Mainspring barrel): A large toothed drum (about 14.4 mm across) holding the mainspring. It turns once every ~10½ hours and drives the gear train.
- `mainspring` (Mainspring): A long coiled ribbon of Spron 510 alloy, the watch's only power source. It stores about 72 hours of running and slips inside the barrel when fully wound.

**Gear train**
- `center-wheel` (Centre (2nd) wheel): Turns once an hour and carries the minute hand via the cannon pinion.
- `third-wheel` (Third wheel): Speeds the motion up from the centre wheel to the seconds wheel.
- `fourth-wheel` (Fourth (seconds) wheel): Turns once a minute. Its long arbor runs through the hollow centre wheel to carry the central seconds hand.
- `fifth-wheel`, `sixth-wheel` (Fifth and sixth wheels): The speed-increasing wheels unique to Spring Drive. The sixth turns once every second, gearing the train up to the glide wheel.

**Tri-synchro Regulator (replaces the balance, hairspring and escapement)**
- `glide-wheel` (Glide wheel): A gilt three-spoke wheel with a tiny two-pole magnet at its hub, spinning steadily at exactly 8 turns per second. It is the generator rotor and the speed governor in one.
- `coils` (Generator coils (double coil)): Two copper coils with amorphous-alloy cores around the glide wheel's magnet. The spinning magnet induces a small current in them (about 25 nanowatts are needed), and short-circuiting them brakes the wheel.
- `ic` (Integrated circuit (C-MOS IC)): Compares the glide wheel's speed with the quartz signal. It applies the electromagnetic brake whenever the wheel runs fast, chopping it 256 times a second.
- `quartz` (Quartz crystal oscillator): A tuning-fork crystal vibrating 32,768 times per second, divided down to an exact 8 Hz reference. This is what gives quartz accuracy.
- `circuit-board` (Circuit board): The flexible printed circuit that connects the coils, IC, quartz and storage capacitors. There is no battery; it runs only on power from the mainspring.
- `stop-lever` (Hacking lever): When the crown is pulled to the 2nd click it touches the glide wheel and stops the whole train, so the time can be set to the second.

**Indications**
- `pr-differential` (Power-reserve differential): A small planetary gear set that compares how much the mainspring has been wound with how much it has run down, and drives the power-reserve hand.
- `pr-display-wheel` (Power-reserve wheel): The dial-side wheel carrying the power-reserve hand at 7 o'clock, which sweeps a 95° fan from full (72 h) to empty.
- `cannon-pinion`, `minute-wheel`, `hour-wheel` (Motion works): Reduce the minute-hand motion 12:1 to drive the hour hand.
- `date-driving-wheel` (Date driving wheel): Turns once a day, driven by the hour wheel. Its finger pushes the date ring forward around midnight.
- `date-ring` (Date disc): A ring printed 1–31 with 31 internal teeth, shown through the window at 3 o'clock.
- `date-jumper` (Date jumper): A spring lever that snaps the date ring into place so the date sits centred in its window.
- `calendar-plate` (Date-ring guard): The thin plate on the dial side that holds the date ring and calendar parts in place under the dial.

---

## 12. Uncertainties and open items

1. **Tooth counts are not published.** Image counts (barrel ≈146, centre ≈84–85, a spoked wheel 80, ratchet ≈74, centre pinion 14) are M/L. The 4th, 5th, 6th and glide counts are ESTIMATE, chosen to give the official 8 rev/s exactly.
2. **Which spoked wheel is the 3rd, 5th and 6th** is inferred from position and size. The 3rd and 5th arbor positions come from lower jewels (±0.3).
3. **Fine-toothed wheel rim at 3:20–4:45** (r 10–11.2, circle-fit centre (2.34, −2.74), R 7.24): unidentified.
   - It is not the barrel: its centre is not at the ratchet axis.
   - It may be a large wheel of the PR or winding train under the bridges. Render it as a partial toothed disc seen in the gap, or omit it.
4. **PR differential internal layout** and the dial-side PR train are ESTIMATE. Only the 3 back-side jewel positions and the dial pivot are measured.
5. **Keyless train** (crown wheel position, intermediate counts) is ESTIMATE. Only the jewelled intermediate's position and the official "5 turns ≈ 10 h" are sourced.
6. **Coil-block and IC/quartz positions**: ±0.8–1 mm. The coils are hidden in the assembled watch except for a sliver near 12.
7. **Automatic-bridge outline**: corrected for photo distortion, edges ±0.5 mm. Its window shapes are approximate. Train-bridge and barrel-bridge outlines are rough (±0.8).
8. **Global rotation of the layout**: ±1.5° (stem direction; the straight-on photo shows 1.5°).
9. **The z-stack** is entirely estimated. Only the 5.8 mm total and the 30.0 mm diameter are official.
10. Date-change timing profile, Magic Lever eccentric throw and pawl-wheel tooth count are ESTIMATE.
11. "SEIKO … TIME CORP. 2" is read exactly as engraved on the teardown movement. The meaning of the trailing "2" (a variant or production mark) is unknown.
12. Facts taken from the 5R65 launch (2005), not stated for the 9R65 itself: 276 parts, Spron 510, coil turns and lamination figures, Magic Lever on the rotor shaft.

---

## SPEC DATA

JS-ready. Dial frame per the Tangente CONTRACT; `B(x_back, y)` converts back-view measurements.

```js
// Grand Seiko SBGA211G — caliber 9R65 Spring Drive. Units mm. +Z toward the dial/viewer.
// 12 o'clock = +Y, 3 o'clock (crown) = +X. Back-view measurements converted with B().
const B = (x, y) => [-x, y];
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const DEG = Math.PI / 180;
const polar = (r, thBackDeg) => B(r * Math.sin(thBackDeg * DEG), r * Math.cos(thBackDeg * DEG)); // θ clockwise from 12, back view

// ---------------------------------------------------------------- arbor layout (dial frame)
const P = {
  center: [0, 0],                 // centre (2nd) wheel, cannon pinion, 4th/seconds arbor, rotor pivot
  third: B(3.34, -0.57),          // MEAS M
  fourth: [0, 0],                 // central seconds, coaxial
  fifth: B(-1.57, 2.97),          // MEAS M
  sixth: B(-2.73, 6.19),          // MEAS H (gold Diashock)
  glide: B(-2.12, 9.32),          // MEAS H (gold Diashock) — generator rotor, 8 rev/s
  barrel: B(1.20, -7.65),         // MEAS H — barrel arbor = ratchet
  pawlWheel: B(5.35, -5.10),      // Magic Lever transmission wheel, MEAS M
  rotor: [0, 0],
  keylessIntermediate: B(-4.09, -3.91), // jewelled, MEAS H position
  crownWheel: B(-8.0, -1.8),      // ESTIMATE
  windingPinion: B(-9.6, 0),      // on the stem, ESTIMATE
  clickScrew: B(-5.15, -8.70), clickTip: B(-3.35, -8.37),
  prA: B(9.65, -2.25), prB: B(10.37, -4.85), prC: B(9.75, -7.67), // PR differential arbors (jewels)
  // dial side
  prDisplay: [-3.46, -6.35],      // PR hand pivot (dial 7:00), MEAS M
  prIntermediate: [-6.75, -3.80], // ESTIMATE
  minuteWheel: [2.15, -1.80],     // ESTIMATE (d = 2.80 from centre)
  settingWheel: [5.60, -1.30],    // ESTIMATE
  dateDriver: [4.60, -3.85],      // ESTIMATE (d = 6.00 from centre)
  dateJumper: [9.0, -4.0],        // ESTIMATE
  stopLeverTip: B(-5.1, 9.3),     // hack lever on the glide disc, ESTIMATE
};

// ---------------------------------------------------------------- tooth counts (ESTIMATE unless noted)
const train = {
  barrel: { teeth: 146 },               // MEAS M
  center: { teeth: 84, pinion: 14 },    // wheel MEAS M, pinion MEAS M
  third: { teeth: 80, pinion: 14 },     // wheel MEAS M
  fourth: { teeth: 80, pinion: 8 },
  fifth: { teeth: 75, pinion: 10 },     // wheel MEAS L
  sixth: { teeth: 64, pinion: 10 },
  glide: { pinion: 8 },
  cannon: { teeth: 14 },
  minuteWheel: { teeth: 42, pinion: 10 },
  hourWheel: { teeth: 40 },
  dateDriver: { teeth: 80 },            // 24 h
  dateRing: { teeth: 31 },              // internal
};
const winding = {
  ratchet: { teeth: 74 },               // MEAS M
  pawlWheel: { teeth: 110, pinion: 10 }, // ESTIMATE
  eccentricThrow: 0.5,                  // ESTIMATE
  windingPinion: { teeth: 14 },         // face teeth, ESTIMATE (gives 5 crown turns ≈ 10 h)
  crownWheel: { teeth: 28 },
  keylessIntermediate: { teeth: 30 },
  crownTurnsPer10h: 5,                  // OFFICIAL
};
const mod = (d, z1, z2) => (2 * d) / (z1 + z2);
const modules = {
  barrel: mod(hyp(P.barrel, P.center), train.barrel.teeth, train.center.pinion),   // 0.0968
  center: mod(hyp(P.center, P.third), train.center.teeth, train.third.pinion),     // 0.0691
  third: mod(hyp(P.third, P.fourth), train.third.teeth, train.fourth.pinion),      // 0.0770
  fourth: mod(hyp(P.fourth, P.fifth), train.fourth.teeth, train.fifth.pinion),     // 0.0747
  fifth: mod(hyp(P.fifth, P.sixth), train.fifth.teeth, train.sixth.pinion),        // 0.0805
  sixth: mod(hyp(P.sixth, P.glide), train.sixth.teeth, train.glide.pinion),        // 0.0886
  ratchet: mod(hyp(P.barrel, P.pawlWheel), winding.ratchet.teeth, winding.pawlWheel.pinion), // 0.116
  motionA: mod(hyp(P.center, P.minuteWheel), train.cannon.teeth, train.minuteWheel.teeth),   // 0.100
  motionB: mod(hyp(P.center, P.minuteWheel), train.minuteWheel.pinion, train.hourWheel.teeth), // 0.112
};

// ---------------------------------------------------------------- rates (rev/s) and sense (+ = CCW seen from the dial)
const RATES = {
  center: { rps: 1 / 3600, sign: -1 },
  third: { rps: 6 / 3600, sign: +1 },
  fourth: { rps: 1 / 60, sign: -1 },     // seconds hand: continuous glide, 6°/s
  fifth: { rps: 8 / 60, sign: +1 },
  sixth: { rps: 1, sign: -1 },
  glide: { rps: 8, sign: +1 },           // OFFICIAL 8 rev/s (28,800 rev/h); CW seen from the back
  barrel: { rps: 14 / 146 / 3600, sign: +1 }, // 1 rev / 10.43 h while running
  cannon: { rps: 1 / 3600, sign: -1 },
  minuteWheel: { rps: 1 / 10800, sign: +1 },
  hourWheel: { rps: 1 / 43200, sign: -1 },
  dateDriver: { rps: 1 / 86400, sign: +1 },
  // winding only: ratchet +, pawlWheel −, keylessIntermediate −, crownWheel +
};
// angle(t) = sign * 2π * rps * t, with t = seconds since local midnight (phase-locked train; never integrate frame deltas).
// Glide wheel absolute phase is arbitrary; seconds hand = −2π * ((t % 60) / 60).
// Hack: when crown at 2nd click, freeze t for the train (stopLever engages glide disc).

const POWER = {
  reserveHours: 72, barrelHoursPerTurn: 146 / 14, // 10.43
  usableBarrelTurns: 72 / (146 / 14),             // 6.90
  crownTurnsFull: 36.5,
  rotorTurnsFull: 510,                            // ESTIMATE (≈4.8° ratchet per rotor turn)
  ratchetDegPerRotorTurn: 4.8,
  clickPitchDeg: 360 / 74,
  prSweepDeg: 95,                                  // full = hand at 12 of the fan; empty = +95° (CCW from dial)
  prHandAngle: (reserveFrac) => 95 * DEG * (1 - reserveFrac),
};

const DATE = {
  ring: { teeth: 31, tipRadius: 8.0, rootRadius: 8.5, outerRadius: 14.3, numeralRadius: 12.9, thickness: 0.15 },
  window: { centerDial: [12.9, -0.3] },            // dial 3 o'clock (exterior agent owns the cut-out)
  sense: +1,                                        // CCW seen from dial, 360/31 deg per day
  change: { start: '22:30', snap: '00:00' },        // ESTIMATE (official: around midnight; don't set 21:00–01:00)
  driverFingerReach: 2.6,
};

// ---------------------------------------------------------------- vertical stack (z, ESTIMATE; total 5.80 OFFICIAL)
const z = {
  dialSeat: 0.75, calendarPlate: [0.45, 0.75], dateRing: [0.30, 0.45], dialSideWheels: [0.02, 0.32],
  stemAxis: -0.60,
  mainPlate: [-1.20, 0],
  pcb: [-1.35, -1.20], ic: [-1.75, -1.35], quartzAxis: -1.95, quartzRadius: 0.6,
  centerWheel: [-1.34, -1.24], centerPinion: [-1.80, -1.55],
  thirdWheel: [-1.52, -1.42], thirdPinion: [-1.40, -1.22],
  fourthPinion: [-1.56, -1.40], fourthWheel: [-3.22, -3.16],
  fifthWheel: [-2.88, -2.80], fifthPinion: [-3.26, -3.12],
  sixthWheel: [-2.50, -2.42], sixthPinion: [-2.92, -2.76],
  glidePinion: [-2.54, -2.38], glideMagnet: [-2.30, -1.80], glideDisc: [-3.08, -3.00],
  coilAxis: -2.15, coilRadius: 0.9, stator: [-2.30, -1.80],
  barrel: [-3.10, -1.55], barrelTeeth: [-1.75, -1.55],
  prWheels: [-3.25, -3.12],
  bridges: [-3.75, -3.30],            // train, barrel and PR bridges
  diashockTop: -3.85,
  ratchet: [-3.97, -3.75], ratchetScrewTop: -4.07, click: [-3.92, -3.75],
  keylessUpper: [-3.92, -3.75],
  pawlWheel: [-4.03, -3.95], pawlPinion: [-3.95, -3.75], magicLever: [-4.05, -3.95],
  automaticBridge: [-4.48, -4.08], automaticBridgeBandTop: -4.33,
  rotorBearing: [-4.80, -4.20], rotorPlate: [-5.00, -4.70], rotorRim: [-5.05, -4.38], rotorTop: -5.05,
};

// ---------------------------------------------------------------- explode offsets (dial side +Z, back side −Z)
const explode = {
  'calendar-plate': [0, 0, 10], 'date-ring': [0, 0, 8.5], 'date-jumper': [0, 0, 9], 'date-driving-wheel': [0, 0, 7],
  'pr-display-wheel': [0, 0, 7.5], 'pr-intermediate': [0, 0, 7], 'hour-wheel': [0, 0, 6], 'cannon-pinion': [0, 0, 6.5],
  'minute-wheel': [0, 0, 5], 'setting-wheel': [0, 0, 4.5], 'setting-lever': [0, 0, 4], yoke: [0, 0, 4],
  'main-plate': [0, 0, 0],
  'center-wheel': [0, 0, -4], 'third-wheel': [0, 0, -5], 'circuit-board': [0, 0, -5.5], ic: [0, 0, -6], quartz: [0, 0, -6],
  coils: [0, 0, -7], 'sixth-wheel': [0, 0, -9], 'fifth-wheel': [0, 0, -10], 'glide-wheel': [0, 0, -11],
  barrel: [0, 0, -12], mainspring: [0, 0, -13.5], 'barrel-cover': [0, 0, -14.5], 'barrel-arbor': [0, 0, -15.5],
  'fourth-wheel': [0, 0, -13], 'pr-differential': [0, 0, -15.5], 'stop-lever': [0, 0, -8],
  'barrel-bridge': [0, 0, -17], 'train-bridge': [0, 0, -17.5], 'pr-bridge': [0, 0, -17], diashock: [0, 0, -18],
  'keyless-intermediate': [0, 0, -19.5], 'crown-wheel': [0, 0, -19.5], 'ratchet-wheel': [0, 0, -20], click: [0, 0, -20.5],
  'pawl-wheel': [0, 0, -21], 'magic-lever': [0, 0, -22.5], 'automatic-bridge': [0, 0, -26], 'plate-screws': [0, 0, -27],
  'rotor-bearing': [0, 0, -29], rotor: [0, 0, -32],
  'winding-stem': [7, 0, 0], 'winding-pinion': [5, 0, 2], 'sliding-pinion': [3, 0, 2],
};

// ---------------------------------------------------------------- movement, regulator, rotor
const movement = {
  radius: 15.0, height: 5.8, jewels: 30, caliber: '9R65', engravedCaliber: '9R65A',
  stripes: { pitch: 2.2, angleBackDeg: -34 },        // bridges; rotor: pitch 2.0, −25° rotor-local
};
const regulator = {
  glide: { discRadius: 3.0, rimWidth: 0.35, spokes: 3, hubRadius: 0.6, magnetRadius: 1.3, magnetHeight: 0.5, poles: 2, statorHoleRadius: 1.5 },
  coils: [
    { axis: [B(1.26, 9.67), B(8.54, 7.87)], windingRadius: 0.9 }, // coil A (outer)
    { axis: [B(0.70, 7.43), B(7.98, 5.63)], windingRadius: 0.9 }, // coil B (inner)
  ],
  ic: { center: B(-6.6, 7.0), size: 2.8, rotDegBack: 41 },
  quartz: { from: B(-2.9, 13.8), to: B(-7.6, 10.3), radius: 0.6 },
  quartzHz: 32768, referenceHz: 8, brakeChopHz: 256, powerNW: 25,
};
const rotor = {
  pivot: [0, 0], outerRadius: 14.0, rimInnerRadius: 12.8,
  // rotor-local outline (pivot at origin, mass toward −y), back view; outer arc from 183.35° to 356.65° (through 270°)
  topEdge: [[14.0, -0.82], [13.3, -0.55], [12.12, -0.49], [10.3, -0.85], [8.34, -1.26], [6.74, -0.53], [5.12, 0.22],
            [3.44, 0.96], [1.58, 1.64], [0, 2.02], [-1.62, 1.60], [-3.48, 0.93], [-5.17, 0.22], [-6.76, -0.54],
            [-8.38, -1.26], [-10.3, -0.85], [-12.08, -0.52], [-13.3, -0.55], [-14.0, -0.82]],
  arc: { r: 14.0, fromDeg: 183.35, toDeg: 356.65 },
  windows: [
    [[-1.55, -3.51], [-2.53, -3.94], [-3.20, -4.49], [-3.61, -5.12], [-4.31, -5.43], [-5.08, -5.37], [-5.91, -5.14],
     [-6.97, -4.65], [-7.62, -4.20], [-8.09, -3.51], [-6.97, -2.97], [-5.80, -2.53], [-4.90, -2.25], [-4.02, -1.97],
     [-2.97, -1.74], [-1.99, -1.62], [-1.50, -2.12], [-1.47, -2.83]],
    [[1.55, -3.51], [2.53, -3.94], [3.20, -4.49], [3.61, -5.12], [4.31, -5.43], [5.08, -5.37], [5.91, -5.14],
     [6.97, -4.65], [7.62, -4.20], [8.09, -3.51], [6.97, -2.97], [5.80, -2.53], [4.90, -2.25], [4.02, -1.97],
     [2.97, -1.74], [1.99, -1.62], [1.50, -2.12], [1.47, -2.83]],
  ],
  pivotHole: [[0.84, 0.0], [0.08, -0.71], [-0.81, -0.38], [-0.67, 0.15], [0.09, 0.81], [0.92, 0.21]],
  rivets: [[11.05, -1.63], [-11.05, -1.63], [-0.23, -10.39]],
  hub: { bossRadius: 1.4, screws: 3, screwRadius: 1.1 },
  thickness: { plate: 0.30, rim: 0.67 },
  logo: { gs: { center: [-0.20, -6.00], width: 3.3, height: 2.3 }, wordmark: { text: 'Grand Seiko', center: [-0.35, -8.46], width: 11.1, capHeight: 1.1 }, colour: '#1E2A55' },
  stripes: { pitch: 2.0, angleDeg: -25 },
};

// ---------------------------------------------------------------- frame: bridges (dial-frame polygons), screws, jewels, engravings
const frame = {
  plateRadius: 15.0,
  automaticBridge: {
    outerRadius: 13.6, bandInnerRadius: 11.4,
    // Corrected outline (edges ±0.5), dial frame (= B() of back-view points). Order: clockwise in the BACK view
    // (= counter-clockwise in the dial frame), starting at the glide notch near 12. The cutouts are the glide notch
    // (dial 11:50–12:58), the PR cutout (dial 7:35–8:55) and the ratchet cutout (dial 4:50–7:35).
    outline: [
      [-0.43, 9.26], [-1.07, 12.25], [-1.44, 13.52], [-2.70, 13.33], [-3.97, 13.01], [-5.24, 12.55], [-6.49, 11.95],
      [-7.71, 11.20], [-8.88, 10.30], [-9.97, 9.25], [-10.96, 8.05], [-11.82, 6.72], [-12.53, 5.28], [-13.07, 3.75],
      [-13.43, 2.17], [-13.59, 0.56], [-13.60, -0.24], [-12.58, -0.41], [-10.98, -0.48], [-9.80, -1.13], [-8.89, -2.04],
      [-8.45, -2.98], [-8.09, -3.93], [-8.47, -4.76], [-8.58, -5.48], [-8.42, -6.79], [-8.05, -7.49], [-4.57, -4.21],
      [-4.09, -4.34], [-3.52, -4.65], [-3.06, -5.10], [-2.66, -5.76], [-2.39, -7.00], [-2.42, -7.49], [-1.85, -6.11],
      [-1.03, -6.04], [-0.05, -5.95], [0.92, -6.01], [1.98, -6.12], [2.76, -6.18], [3.70, -6.37], [4.67, -6.63],
      [4.93, -6.76], [8.07, -10.95], [8.88, -10.30], [10.00, -9.21], [11.01, -7.99], [11.87, -6.63], [12.57, -5.18],
      [13.10, -3.66], [13.44, -2.10], [13.59, -0.53], [13.56, 1.01], [13.37, 2.52], [13.02, 3.94], [12.53, 5.29],
      [11.93, 6.54], [11.22, 7.68], [10.43, 8.73], [9.57, 9.66], [8.65, 10.49], [7.68, 11.23], [6.65, 11.86],
      [5.72, 10.56], [4.38, 9.71], [3.25, 9.22], [2.35, 9.01], [1.54, 8.95], [0.77, 8.98], [0.02, 9.14]],
    windows: [
      { center: B(-2.98, 5.94), size: [3.0, 2.8], note: 'shows 6th-wheel Diashock' },
      { center: B(-7.33, -4.13), size: [3.6, 2.0], note: 'keyless wheel teeth' },
    ],
    bearing: { center: [0, 0], bossRadius: 3.0 },
  },
  trainBridge: { // ESTIMATE ±0.8, dial frame
    outline: [[-8.14, -0.54], [-5.24, -2.32], [-3.09, -3.46], [-0.76, -3.64], [1.13, -3.19], [3.79, -2.83], [6.63, -1.50],
              [9.36, 1.00], [12.17, 5.63], [11.96, 7.96], [7.28, 11.61], [5.12, 10.74], [4.15, 11.14], [2.19, 11.94],
              [0.59, 10.30], [-0.20, 8.66], [-1.80, 7.02], [-4.02, 4.72], [-6.32, 1.92]],
  },
  barrelBridge: { // ESTIMATE ±0.8, dial frame (PR sector excluded: see prBridge)
    outline: [[-9.27, -3.75], [-8.99, -5.62], [-8.17, -7.36], [-6.70, -9.41], [-4.69, -10.78], [-1.95, -12.28], [1.05, -12.70],
              [3.30, -12.33], [5.22, -9.83], [5.72, -6.34], [5.85, -4.79], [3.55, -3.22], [1.13, -3.19], [-0.76, -3.64],
              [-3.09, -3.46], [-5.24, -2.32], [-8.14, -0.54], [-9.25, -0.97]],
  },
  prBridge: { // ESTIMATE outline, polar in back view → dial frame
    outline: [polar(9.3, 96), polar(9.4, 103), polar(10.0, 112), polar(10.6, 122), polar(11.0, 132), polar(11.2, 142),
              polar(14.3, 146), polar(14.3, 120), polar(14.3, 94)],
  },
  screws: {
    automaticBridge: [B(-10.15, 6.85), B(-7.50, -9.65), B(12.20, 1.25)], headDiameter: 1.55, finish: 'polished steel, slotted',
    pinHole: B(-11.92, 1.75),
    ratchet: { at: B(1.25, -7.70), headDiameter: 2.4 },
    click: { at: B(-5.15, -8.70), headDiameter: 1.6 },
    prBridge: { at: B(8.73, -10.21), headDiameter: 1.4 },
    plateEdge: [B(-14.26, 2.05), B(-1.54, 13.82), B(-9.28, -10.39), B(-14.21, -3.70)], // casing clamps etc. (L)
  },
  jewels: {
    diashock: [{ at: P.glide, settingDiameter: 1.6 }, { at: P.sixth, settingDiameter: 1.3 }], // gold settings
    visible: [P.pawlWheel, P.keylessIntermediate, P.prA, P.prB, P.prC],
    hiddenUpper: [P.center, P.third, P.fifth],
  },
  ratchet: { center: P.barrel, tipRadius: 4.45, teeth: 74, finish: 'sunburst' },
  barrel: { center: P.barrel, tipRadius: 7.20, teeth: 146 },
  engravings: {
    // all arc texts: read counter-clockwise in BACK view, letter tops toward the centre
    gilt: [
      { text: 'THIRTY JEWELS', arc: { r: 12.25, fromBackDeg: 73, toBackDeg: 18 }, capHeight: 0.70 },
      { text: '9R65A', arc: { r: 9.9, fromBackDeg: 78, toBackDeg: 51 }, capHeight: 0.75 },
      { text: 'JAPAN', arc: { r: 9.9, fromBackDeg: 42, toBackDeg: 18 }, capHeight: 0.75 },
    ],
    plain: [
      { text: 'SEIKO', arc: { r: 12.25, fromBackDeg: 294, toBackDeg: 281 }, capHeight: 0.70 },
      { text: 'TIME CORP.', arc: { r: 12.25, fromBackDeg: 275, toBackDeg: 244 }, capHeight: 0.70 },
      { text: '2', arc: { r: 12.25, fromBackDeg: 237, toBackDeg: 235 }, capHeight: 0.70 },
    ],
    giltColour: '#C9A055',
  },
  colours: { bridge: '#CDD0D2', gilt: '#D8B47A', copper: '#B8643A', diashock: '#C8A15A', ruby: '#A0507E', logoBlue: '#1E2A55' },
};

export const MOVEMENT_9R65 = {
  name: 'SBGA211G', caliber: '9R65', layout: P, train, winding, modules, RATES, POWER, DATE, z, explode,
  movement, regulator, rotor, frame,
};
```
