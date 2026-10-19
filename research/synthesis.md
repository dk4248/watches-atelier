# NOMOS Tangente ref. 139 / caliber DUW 4001: build spec (v1.0, lead engineer merge, 2026-10-15)

## Provenance and conventions

**Provenance tags**
- [OFF]: official NOMOS page or official NOMOS image.
- [REV]: reputable review (Monochrome, Deployant, Atelier de Griff).
- [ETA]: ETA's own technical drawings of the ETA/Peseux 7001, the documented ancestor.
- [MEAS]: pixel measurement of official NOMOS images.
- [EST]: engineering estimate. Self-consistent, but not sourced.
- Confidence is given as H, M or L.

**Lead re-measurements made during this merge (they supersede the sub-reports where they differ)**

1. Train jewel centres, re-measured on the official DUW 4001 render (hole-filled jewel blobs, bounding-box centres):

   | Mobile | x | y |
   |---|---|---|
   | Third | −1.67 | −3.51 |
   | Fourth | 0.02 | −6.34 |
   | Escape | 3.05 | −6.40 |
   | Pallet | 4.53 | −3.77 |
   | Balance | 6.26 | −0.86 |

   - The CALIBER report gave the third at −3.24 and the escape at (3.2, −6.2). Those figures are replaced.
   - The new positions match the ETA 7001 layout to within about 0.05 mm.
   - The centre wheel is about Ø 7.0 (gilt pixels reach r ≈ 3.45–3.5). That is the ETA value.
   - Conclusion: the DUW 4001 keeps the 7001 going-train geometry. The ETA tooth counts are therefore adopted with good confidence.
2. Side photo, corrected for perspective (camera about 260 mm away, inferred from the lug tips sitting at ±22.5):
   - Crown: Ø ≈ 5.0, axis Z ≈ 2.8 above the case-back plane.
   - Case layers: bezel 1.40 / middle case 3.77 / case back 1.43.
   - Full lug profile measured (section 2).
3. Cased back render:
   - The window clear aperture is about Ø 23.5.
   - The case-back ring outer diameter is about Ø 33.9, inset from the 35.0 middle case.
   - Engraving reads "TANGENTE 83427".
4. Ratchet and crown-wheel teeth, by autocorrelation and peak fitting:
   - Ratchet: 56–59 teeth, best 58.
   - Crown wheel: 41–42, best 42.

**Coordinate frames (units: mm)**
- **Three.js world:** 1 unit = 1 mm. Origin is on the watch axis at the outer face of the case back (Z = 0). +Z points toward the crystal (the dial faces +Z), +Y toward 12 o'clock, +X toward 3 o'clock (the crown).
- **Back view** (x_b, y): looking through the case back with 12 up, so the crown is on the LEFT.
  - Convert to world with X = −x_b, Y = y.
  - Clock positions in the movement tables are back-view clock positions.
- **Dial view** (x_d, y): X = x_d, Y = y. Dial angles are measured clockwise from 12.
- **Movement height** h: measured from the dial-side face of the pillar plate (h = 0) toward the case back (h = 2.60). Convert with **Z = 4.10 − h**.

---

## 1. Identity verdict

| Item | Verdict | Confidence |
|---|---|---|
| Model | NOMOS Glashütte **Tangente** (35 mm, hand-wound). Retail and special editions call it "Tangente 35". | H [OFF] |
| Reference | **139** = sapphire display back. Ref. 101 is the same watch with a solid steel back (6.2 mm high). | H [OFF] |
| Caliber | **DUW 4001** (in-house, hand-wound, 23.3 × 2.6 mm, 17 jewels, up to 53 h, NOMOS Swing System, DUW regulation system, stop-seconds). This is the current official spec, and NOMOS's ref. 139 back render (uploaded Apr 2025) shows "DUW 4001 N° 00535". | H for the current spec |
| Is the user's combination consistent? | **Yes, for watches made from about 2025 on.** DUW 4001 is the renamed and upgraded **Alpha**. Ref. 139s made before about 2024–25 carry the **Alpha** (43 h, Triovis regulator, ETA-sourced escapement, silver Nivarox hairspring). Transitional 2023–24 Alphas with the newer regulator are reported. Same plate, same layout, same dimensions. | M for which one the user owns |
| Frequency | 21,600 A/h (3 Hz). NOMOS does not state it; reviews and the 7001 lineage do. | M-H |

**Most likely truth:** the user's naming is correct if the watch is recent. If it is older, it is a ref. 139 with the Alpha. The 3D build defaults to **DUW 4001**. An "Alpha variant" toggle only needs to swap four things: hairspring colour, regulator, plate engravings, and the 43 h power reserve.

**Questions to ask the user**
1. Through the back, is the hairspring **blue** (DUW 4001) or silver (Alpha)?
2. Does the plate read "DUW 4001 / N° … / NOMOS GLASHÜTTE / DEUTSCHE UHRENWERKE" plus "17 RUBINE"? The Alpha reads "17 STEINE", has a NOMOS logo, and an "α"-prefixed serial.
3. Is there a regulator screw with +/− marks (Triovis = Alpha)?
4. Year of purchase, and does the paperwork say 5 atm or 3 atm?
5. What does the case-back ring say (expected "TANGENTE" plus a 5-digit serial)? Is there any special-edition engraving (139.Sxx)?
6. Strap or optional steel bracelet?

Note: NOMOS's English "Glashütte stopwork" is a mistranslation of "Glashütter Gesperr", which means the Glashütte **click**. **Do not model a Geneva stop.**

---

## 2. Case specification

| Parameter | Value (mm unless stated) | Source / conf. |
|---|---|---|
| Case diameter (excl. crown) | **35.0** | [OFF] H |
| Total height (back plane to crystal top) | **6.60**. Watchbase gives 6.2 (that is the ref. 101 figure); others give 6.7 / 6.8. | [OFF] H |
| Lug-to-lug | **45.0** (lug tips at Y = ±22.5) | [OFF] H; side-photo confirmed |
| Lug width (between lugs) | **18.0** (inner lug faces at X = ±9.0) | [OFF] H |
| Material / finish | 316L stainless steel, fully **polished** | [OFF]/[REV] H |
| Construction | **Three-part**: bezel / middle case / case-back ring, with hairline seams visible in the side photo. Teddy Baldassarre's "bipartite" is overruled. | [MEAS] M-H |
| Middle case | Z 1.43–5.20 (height 3.77), vertical flank r 17.50 | [MEAS] M |
| Bezel | Z 5.20–6.50 (1.30), vertical flank r 17.50, flat polished top r 16.65–17.50, inner chamfer down to r 16.30 | [MEAS] M |
| Front crystal | **Flat sapphire**, Z 5.55–6.60 (1.05 thick), seated Ø 33.3, visible opening Ø ≈ 32.6–33.0, top 0.10 proud of the bezel. AR coating unconfirmed: default is none, or a very faint bluish reflection. IOR 1.77. | Flat: H; thickness [EST] |
| Inner wall above the dial | Bore r 15.75 from the dial top (Z 4.40) up to the crystal underside (Z 5.55). It reads as a dark band at r 15.75–16.15 in front view. | [MEAS] M |
| Case-back ring | Z 0–1.43. Outer flank r 16.95 (Ø 33.9; inset 0.55 from the middle case) running Z 0.60–1.43. Outer bevel from (r 14.95, Z 0) to (r 16.95, Z 0.60). Flat polished back face r 12.20–14.95. Window chamfer from r 11.75 to 12.20. No visible screws (press-fit). | [MEAS] M; press-fit [EST]-M |
| Display back sapphire | Z 0.10–1.10 (1.0 thick), seated Ø 24.6, **clear aperture Ø 23.5** | aperture [MEAS] M; thickness [EST] |
| Back sapphire to movement gap | 0.40 (movement top at Z 1.50) | [EST] |
| Case-back engraving | **"TANGENTE 83427"** (model plus 5-digit case serial). Grey, unfilled, DIN-like sans capitals, wide tracking. Arc centred at 6 o'clock, text mid-radius r ≈ 13.4, spanning about 152°–208°, cap height ≈ 0.8, letter tops toward the centre (reads upright at 6). There is no water-resistance or "EDELSTAHL" text in the official render; that claim came from watchscanning [L] and is rejected. | [OFF image] H text; position M |
| Water resistance | **5 atm** ("splash-proof"), current spec. Older literature says 3 atm, which probably depends on the production year. | [OFF] H / conflict noted |
| Crown | **Push-pull**, not screwed. **Ø 5.0** at flute tips (root Ø 4.6); **24 flutes**, about 0.2 deep, scalloped edge; flat end face engraved "**NOMOS**" (spaced capitals, 4.0 wide, cap height 0.55, dark grey). Axis at **Z 2.80**, X positive (3 o'clock). Outer face at r 19.6 (2.1 proud of the case). Body length 1.7, neck/tube Ø 2.4 × 0.4. | Signed: H [OFF photo]; dimensions [MEAS] M |
| Stem | Ø 0.90, axis Z 2.80 (h 1.30) | [ETA] H for Ø |
| Lugs, plan view | Straight, parallel bars. Inner face X ±9.0, outer face X ±10.25 (1.25 wide). Polished on all faces, sharp edges. | [MEAS] M-H |
| Lugs, side profile | Polygon in the (Y outward, Z) plane: (15.0, 4.94) → (18.9, 4.94) → (22.5, 1.90) → (22.5, −0.07) → (20.55, −0.07) → (17.65, 2.58) → (15.0, 2.58). That is: a horizontal root 2.36 thick, then a slanted section about 40–42° below horizontal, then a vertical flat-cut tip ending 0.07 below the case-back plane. The visual report's 45–50° is close; its "~6 mm drop" is overruled by the geometry. | [MEAS, perspective-corrected] M |
| Spring-bar holes | Drilled through along X, **Ø 1.0**, at (Y ±19.85, Z 2.39). The polished spring-bar tips show in the holes. Spring bar Ø 1.5 [EST]. Grail's "screwed bars" [L] is rejected. | [MEAS] M |
| Strap | Horween Genuine Shell Cordovan, **black**, 18 mm at the lugs. Black stitching. Thickness about 3.0 at the lug end and 2.5 at the buckle [EST]. Taper 18 → **16** at the buckle; lengths (size M) 75 on the buckle side / 118 on the tail [L-M, generic NOMOS 18 mm strap listing]. One fixed and one floating keeper [EST]. | [OFF] colour/material H |
| Buckle | Polished steel **tang (pin) buckle**, 16 mm, NOMOS logo engraved or embossed | [REV] H / logo M |
| Option | Steel bracelet, 18 mm (not the default) | [OFF] |

### Vertical Z stack (Z = 0 at the case-back outer face)

| Element | Z from | Z to |
|---|---|---|
| Case-back ring / back sapphire | 0.00 / 0.10 | 1.43 / 1.10 |
| Movement (h 2.60 → 0) | 1.50 | 4.10 |
| Middle case | 1.43 | 5.20 |
| Crown / stem axis | 2.80 | — |
| Dial (0.30 thick); subdial recess floor at 4.28 | 4.10 | 4.40 |
| Seconds hand blade (hub to 4.52) | 4.40 | 4.48 |
| Hour hand blade (collet 4.80–5.00; hour pipe top 4.99) | 4.80 | 4.90 |
| Minute hand blade (collet 5.12–5.30; cannon top 5.29) | 5.12 | 5.22 |
| Centre pin / cap top | — | 5.35 |
| Crystal | 5.55 | 6.60 |
| Bezel | 5.20 | 6.50 |

Hand heights come from ETA 7001 hand-fitting data: seconds pivot 0.40, hour pipe 0.89, cannon top 1.19 above the dial seat [ETA] M.

---

## 3. Dial specification (dial view, from the dial centre, angles clockwise from 12)

**Base**
- Galvanized, white silver-plated ("galvanisiert, weiß versilbert") [OFF].
- Fine frosted grain [REV/MEAS].
- Flat disc **Ø 32.0**, 0.30 thick [EST]. Visible to r **15.75** (Ø 31.5) [MEAS H].
- No lume.

**Colours**

| Element | Colour |
|---|---|
| Dial | **#E8E9EB** (render base #E6E7E8). PBR: metalness about 0.6, roughness 0.5, grain noise ±4/255. |
| All print | **#141414**, near-black |
| Inner wall / shadow band | #3C3E41 [EST] |

### Printed elements

| Element | Geometry |
|---|---|
| **Arabic numerals 12, 2, 4, 8, 10** (none at 6) | All in the radial band r **10.0–13.45**. Height 3.35 (3.24–3.39); monoline stroke **0.27**; very condensed Bauhaus/Art-Deco face (1937 Weber & Baral design). Widths: "12" 1.79 overall ("1" 0.30, gap 0.20, "2" 1.28); "2" 1.40; "4" 1.49; "8" 1.30; "10" 1.78 ("1" 0.30, gap 0.19, "0" 1.29). **Orientation:** 12/2/10 have the top of the glyph pointing **outward** (rotate the glyph by 0°, +60°, −60°; baseline at r 10.05). 4/8 have the top pointing **inward** (rotate by −60° for the 4 and +60° for the 8; top at r 10.05, base at r 13.40). |
| Glyph notes | "1": plain stem with tiny top and foot serifs. "2": arched top whose left end drops into a short serifed spur, a diagonal, and a flat base ending in an upturned spur. "4": closed flat-topped trapezoid counter, crossbar extending past the stem. "8": two stacked rounded-rectangle loops, smaller loop on top. "0": pill shape with straight parallel sides. |
| **Baton indices** at 1, 3, 5, 7, 9, 11 (none at 6) | Radial, r **10.0–13.45**, width **0.20** |
| **Minute track** | 60 radial ticks, r **14.15–14.95** (all 0.80 long). 1-minute ticks are 0.07 wide; 5-minute ticks (including 12 and 6) are 0.20 wide. **No rails**, no dots, no numerals. Watchscanning's "railroad" claim is rejected. |
| **"NOMOS"** | Wide geometric sans capitals with circular O's. Centred; baseline y = **+5.87**, cap top +6.76 (height 0.90). Overall width 7.46. Letter widths N 0.85 / O 0.94 / M 1.58 / O 0.94 / S 0.77; gaps 0.60–0.68; stroke 0.17. |
| **"GLASHÜTTE"** | Condensed medium sans, wide tracking. Centred; baseline y = **+4.80**, cap height 0.64 (umlaut dots to +5.52). Width 5.50. **No "/SA"** (dropped in 2005). |
| **"MADE IN GERMANY"** | Small light capitals on an arc **outside** the minute track: r 15.06–15.47, cap height 0.40, stroke 0.07. Letter bases on the outer side (reads upright at 6). Spans 164.6°–194.9°, centred on 6; the thick 30-minute tick sits just inside it. |
| No other text | — |

### Small-seconds subdial

| Parameter | Value |
|---|---|
| Centre | **(0, −6.40)** (see section 8; photo gives 6.50, movement gives 6.34; chosen within both error bars) |
| Recess | Step edge at radius **4.75** (Ø 9.5); depth **0.12**; floor Z 4.28 |
| Surface | Fine **concentric grooves** at a pitch of about 0.14 (circular-anisotropic reflection), slightly different texture from the main dial. Same base colour. |
| Ticks | 12 ticks (every 5 s) at subdial radius **3.24–4.07**. Ticks at 0/15/30/45 s are 0.20 wide; the others 0.10. No numerals. |

---

## 4. Hands specification

**Material**
- Flat steel, **heat-blued** at about 290 °C ("cornflower blue") [OFF]. Polished edges. No lume. No counterweights on the hour or minute hand.
- PBR: metalness 1, roughness about 0.2, base **#1E4E9A**.
- Angle-dependent ramp: shadow #042A4F → mid #0A426E / #14689D → light #3F84BB → highlight #82ACCA, with a slight violet shift at grazing angles.

| Hand | Length (tip radius) | % of dial radius (15.75) | Width / shape | Hub | Z blade |
|---|---|---|---|---|---|
| Hour | **9.38** (stops 0.62 short of the indices) | **59.6 %** | 0.40 at the hub → 0.37 at r 8.5; pointed tip tapering over the last 0.45 | Domed collet Ø **2.25** | 4.80–4.90 |
| Minute | **14.72** (about 2/3 into the minute ticks) | **93.5 %** | 0.38 at the hub → 0.34 at r 13–14.3; pointed tip over the last 0.40 | Domed collet Ø **1.35** + polished steel centre pin Ø 0.55 | 5.12–5.22 |
| Seconds (on subdial) | **3.97** from the subdial centre; tail **1.47** | 25.2 % (tip); 83.6 % of the subdial radius | 0.28 wide stick; tip slightly pointed (last 0.2) [EST]; square tail end | Blue hub Ø 1.25 + light pin Ø 0.30 | 4.40–4.48 |

- Hour : minute length ratio = 0.64.
- Blade thickness 0.10 (seconds 0.08) [EST].
- Hand holes [ETA]: hour Ø 1.30, minute Ø 0.80, seconds Ø 0.17.
- The official product photo shows an impossible time (hour 305.2°, minute 71.6°). Use it for layout only.

---

## 5. Movement specification: DUW 4001

### 5.1 Specifications

| Item | Value | Source |
|---|---|---|
| Type | In-house manual-wind caliber; small seconds; stop-seconds (hacking) | [OFF] H |
| Diameter / height | 23.30 (10½''') / 2.60 | [OFF] H |
| Jewels | 17 ("17 RUBINE"). Allocation: balance 2 hole + 2 cap, impulse 1, pallet stones 2, pallet arbor 2, escape 2, fourth 2, third 2, centre 2 | [OFF] count; allocation [EST] M |
| Frequency | 21,600 A/h, 3 Hz | [REV]/[ETA] M-H |
| Power reserve | Up to **53 h** (Alpha: 43 h; Watchbase's "43 h" for DUW 4001 is a carry-over error) | [OFF] H |
| Escapement | NOMOS **Swing System**: Swiss lever, 15-tooth steel escape wheel, ruby pallets set in shellac, laser-poised balance matched to its spring in 40 classes | [OFF] H; 15 teeth [ETA]/[EST] M |
| Hairspring | In-house, **blue** ("gebläut"), flat spiral with terminal curve | [OFF] H; flat [OFF photo] M-H |
| Regulation | **DUW regulation system**: no regulating screw; regulator ring carrying a two-pin "spring key" plus a stud-carrier ring, both on the balance cock and moved with pliers; ETACHRON-like. Adjusted in 6 positions. | [OFF] H |
| Shock protection | Lyre-spring setting (Incabloc-type) on the upper balance jewel. Brand unstated. | [OFF photo] M |
| Lineage | Alpha → DUW 4001, Peseux/ETA 7001 architecture (train geometry matches within 0.05 mm) | [MEAS]+[ETA] H |
| Lift angle | 50° (ETA 7001) | [ETA] M |

### 5.2 Visible architecture through the display back (back view, crown on the left)

| Region (back view) | What is visible |
|---|---|
| 11 o'clock | Large **sunburst ratchet wheel** with a big slotted steel screw. The **Glashütte click** sits at its upper left: an angular pawl, plus a long curved spring running along the edge from 10:00 to 11:30. |
| 9 o'clock | **Crown wheel** (sunburst) under a polished cover disc held by two slotted screws. Just outboard, a vertical **slot** shows the **winding pinion** teeth. Through the right edge of the crown-wheel recess, gilt teeth of the centre wheel show. |
| Rest of the plate | One large rhodium **three-quarter plate** with broad diagonal **Glashütte ribbing**, carrying 5 **blued screws** and the jewels of the centre, third, fourth and escape wheels (pink rubies in polished sinks; no gold chatons). |
| 3 o'clock | A circular cut-out with the **gold-coloured 3-arm balance** under a separate, slender, dog-legged **balance cock**. The cock ends in a ring housing (Ø 3.4) carrying the lyre shock spring, the **regulator ring** (index arm toward the balance's 7 o'clock, gold spring-key block) and the **stud-carrier ring** (arm toward 4:30). |
| Inside the balance cut-out | **Blue hairspring**; **perlage** floor (pillar plate); small perlage **pallet bridge** with its jewel; one pink **pallet stone**; gilt **centre-wheel** teeth (with a spoke) passing under the balance. |
| Right edge | "MADE IN / GERMANY" engraving in a thin plate strip. |
| Left edge / lower half | "17 RUBINE" on the left edge; the main gold-filled engraving block in the lower half. |

### 5.3 Engravings (DUW 4001, official renders)

All are upright DIN-like sans-serif capitals with cap height **0.65**, **gold-filled #C9A063** unless noted.

| Text | Position (back view) |
|---|---|
| "DUW 4001" | Left-aligned at x = −5.92; line centre y −5.17 |
| "N° 00535" | Line centre y −6.20. This is the movement serial in the official 139 render; the user's will differ. The bare movement render shows "N° 00001". |
| "NOMOS GLASHÜTTE" | Line centre y −7.72 |
| "DEUTSCHE UHRENWERKE" | Line centre y −8.75; runs to x +5.41 |
| "17 RUBINE" | Vertical at x ≈ −10.3, from y +4.2 down to 0. Rotated 90° clockwise, reads top-to-bottom, "17" at the top. |
| "MADE IN" / "GERMANY" | **Unfilled grey** engraving at x +10.1 to +11.3, y +0.6 to +3.2. Rotated 90° counter-clockwise, reads bottom-to-top; "GERMANY" is the line nearer the edge. |

There is no "Swing System" or "adjusted" text.

### 5.4 Finishing

| Surface | Finish | Colour / PBR |
|---|---|---|
| Plates and cock | Rhodium-plated. **Glashütte ribbing**: straight bands rising to the right at **30° ±5°** in back view, pitch about **2.3**, fine brushing within each band, continuous across plate and cock. | Lit range #BFBFBF–#E7E7E7; base albedo **#D3D4D6**, metalness 1, roughness about 0.28, anisotropic along the bands |
| Pillar-plate floor under the balance; pallet bridge | **NOMOS perlage**: overlapping circular grains, Ø about 0.8 at about 0.5 pitch [EST] | — |
| Ratchet and crown wheel | **Glashütte sunburst** (radial brushing from each wheel's own centre). The ratchet is "double": outer toothed ring plus a raised inner disc Ø about 4.6, each sunburst. | Steel #B4B4B4 (#979797–#CCCCCC) |
| Edges | Polished chamfers on plate cut-outs and cock edges, about 0.1 wide; polished jewel sinks | — |
| Blued screws | 5, slotted, heads Ø 1.40 | **#1B437E** (#164079–#224A84) |
| Plain screws | Polished steel | — |
| Gold-coloured parts | Balance **#CAA66C** (shadow #996935, highlight #D8B884); centre wheel gilt **#D7B67C**; lyre spring and regulator key block about #C9A063 | — |
| Jewels | Ruby | **#A95483** in the render (#843B63–#C4769E); transmission plus IOR 1.77 |
| Pallet stones | Pink ruby | #E06A8A |
| Impulse jewel | Red D-shape | #C0203A |
| Hairspring | Blue | #2C5DA6 [EST] |

### 5.5 Vertical levels inside the movement

All values are [EST], self-consistent and collision-checked; Z = 4.10 − h.

| Level | h range | Contents |
|---|---|---|
| Dial-side recess | 0.00–0.35 | Hour wheel 0.03–0.13; minute pinion 0.03–0.18; minute wheel 0.20–0.30; cannon-pinion leaves 0.18–0.32; setting wheel 0.20–0.30 |
| Pillar plate | 0.00–0.85 | Perlage floor at 0.85 under the balance |
| L0 | 0.90–1.02 | Centre wheel (gilt); escape wheel (steel); pallet fork (0.90–1.05); balance double roller (0.90–1.10); third pinion (0.88–1.04) |
| L1 | 1.10–1.22 | Fourth wheel; escape pinion (1.08–1.24); centre pinion (1.08–1.26) meshing the barrel teeth (1.10–1.24) |
| L2 | 1.30–1.42 | Third wheel; fourth pinion (1.28–1.44) |
| Pallet bridge | 1.10–1.38 | — |
| Barrel drum | 1.08–2.00 | Teeth band 1.10–1.24; lid 1.95–2.00 |
| Balance rim | 1.48–1.92 | Arms flush with the rim top (1.77–1.92) |
| Hairspring | 1.98–2.06 | — |
| Three-quarter plate | 2.02–2.42 | — |
| Balance cock | 2.12–2.42 | Top flush with the plate; regulator and stud rings 2.42–2.50; shock-setting top 2.56 |
| Ratchet | 2.32–2.52 | In a 0.10 recess; screw head to 2.60 |
| Crown wheel | 2.32–2.50 | Cover disc 2.50–2.56; screws to 2.60 |
| Click and spring | 2.36–2.52 | — |
| Blued screw heads | 2.42–2.56 | — |
| Stem axis | **1.30** | Winding pinion tip reaches 2.43 and meshes the crown wheel. This gives the crown Z 2.80, which matches the side photo. |
| Hand fittings, dial side | — | Cannon pipe to h −1.19, hour pipe to h −0.89, seconds pivot to h −0.40 [ETA] |

### 5.6 Layout table (back view, crown on the LEFT)

Columns: x_b and y in mm; r = radius from the movement centre; clock = back-view position; Ø = tip diameter unless noted; h as in 5.5.

**Mobiles**

| Part | x_b | y | r | Clock | Ø | h | Status |
|---|---|---|---|---|---|---|---|
| Centre wheel / centre arbor | 0.00 | 0.00 | 0 | centre | 7.01 (120 t), gilt, 4 spokes [EST] | 0.90–1.02 | Position [MEAS] H; size [MEAS] M |
| Third wheel | −1.67 | −3.51 | 3.89 | 6:51 | 6.08 (112 t) | 1.30–1.42 | [MEAS] H |
| Fourth (seconds) wheel | 0.00 | −6.40 | 6.40 | 6:00 | 5.76 (120 t) | 1.10–1.22 | [MEAS], reconciled (section 8) |
| Escape wheel | 3.05 | −6.40 | 7.09 | 5:09 | 5.23 (15 club teeth) | 0.90–1.02 | [MEAS] H; Ø derived |
| Pallet arbor / jewel | 4.53 | −3.77 | 5.89 | 4:20 | Fork overall about 4.0 | 0.90–1.05 | [MEAS] H |
| Entry pallet stone (contact point) | 3.02 | −3.79 | 4.85 | 4:43 | 0.25 × 0.9 slab | L0 | Geometry derived; matches the visible pink stone |
| Exit pallet stone (contact point) | 5.30 | −5.07 | 7.33 | 4:27 | 0.25 × 0.9 slab | L0 | Derived |
| Balance staff | 6.26 | −0.86 | 6.32 | 3:16 | Rim OD **9.35**, ID 8.70; 3 arms | Rim 1.48–1.92 | [MEAS] H |
| Hairspring | Balance centre | — | — | — | Body Ø 4.4, about 13 coils; outer terminal to r 2.9 | 1.98–2.06 | [OFF photo] M |
| Regulator spring-key block | 5.4 | −3.6 | 6.49 | 4:07 | Gold, about 0.6 | 2.42–2.50 (pins down to the spring) | [MEAS] M |
| Stud-carrier stud block | 8.4 | −2.9 | 8.89 | 3:38 | About 0.6 | 2.42–2.50 | [MEAS] M |
| Barrel (under the plate) | −2.25 | 5.61 | 6.04 | 11:16 | 10.80 (126 t); drum inner Ø about 9.6 | 1.08–2.00 | Position [MEAS] H; size [ETA] M |
| Ratchet wheel (on the barrel arbor) | −2.25 | 5.61 | 6.04 | 11:16 | 7.99 (58 t); raised inner disc Ø 4.6; screw head Ø 2.0 | 2.32–2.60 | [MEAS] M |
| Crown wheel | −5.91 | 0.05 | 5.91 | 9:01 | 5.86 (42 t); cover disc Ø 4.0 | 2.32–2.56 | [MEAS] H position |
| Winding pinion (on stem) | −8.90 (spans −8.58 to −9.23) | 0.00 | 8.90 | 9:00 | 2.26 (15 t), axial length 0.65 | Axis 1.30 | Slot window x −9.25…−8.60, y ±1.45 [MEAS]; teeth [ETA] |
| Sliding pinion | −6.80…−8.55 (winding); −6.40…−8.15 (setting) | 0 | about 7.7 | 9:00 | 1.8 | Axis 1.30 | [EST], hidden |
| Setting wheel | −5.45 | −1.06 | 5.55 | 8:38 | 2.13 (15 t) | 0.20–0.30 | [EST], hidden |
| Minute wheel / minute pinion | −2.32 | −2.10 | 3.13 | 7:36 | 5.14 (40 t) / 1.55 (10 leaves) | 0.20–0.30 / 0.03–0.18 | [ETA] M, hidden |
| Cannon pinion | 0 | 0 | 0 | centre | 1.61 (12 leaves) | 0.18–0.32 | [ETA], hidden |
| Hour wheel | 0 | 0 | 0 | centre | 5.26 (36 t) | 0.03–0.13 | [ETA], hidden |
| Stop-seconds brake finger | 8.60 | −4.91 | 9.90 | 4:00 | Steel finger touching the rim edge | About 1.5 | **[EST], schematic**, hidden |

**Click**

| Part | x_b | y | r | Clock | Notes |
|---|---|---|---|---|---|
| Click screw / pivot | −8.35 | 6.06 | 10.32 | 10:12 | In an elongated polished recess |
| Click pawl tip | −5.2 | 7.8 | 9.37 | 10:53 | Engages the ratchet teeth |
| Click spring | — | — | 9.5–11.0 | 10:00–11:30 | Long curved arm along the edge |

**Screws**

| # / type | x_b | y | r | Clock | Note |
|---|---|---|---|---|---|
| Blued #1 | 3.85 | 8.29 | 9.14 | 12:50 | Plate |
| Blued #2 | 7.21 | 5.49 | 9.06 | 1:45 | Balance-cock screw |
| Blued #3 | −8.71 | 3.33 | 9.32 | 9:42 | Plate |
| Blued #4 | −8.14 | −3.68 | 8.93 | 8:11 | Plate |
| Blued #5 | 6.74 | −6.81 | 9.58 | 4:31 | Plate |
| Plain | −10.06 | −1.44 | 10.16 | 8:44 | — |
| Plain | −8.30 | −6.55 | 10.57 | 7:43 | — |
| Plain | 6.45 | 8.13 | 10.38 | 1:17 | At the cock-foot / plate junction |
| Plain, half-moon casing screw | 0.75 | 10.87 | 10.90 | 12:08 | Edge |
| Casing-clamp notch + screw | 2.65 | 10.60 | 10.93 | 12:28 | — |
| Casing-clamp notch + screw | −1.95 | −10.63 | 10.81 | 6:21 | — |
| Crown-wheel cover screws | −5.91 | 1.04 / −0.99 | — | 9:00 | Slotted |
| Ratchet screw | −2.25 | 5.61 | 6.04 | 11:16 | Slotted, large |

**Plate and cock outlines**
- Three-quarter plate: the full Ø 23.30 disc minus three openings:
  - the **balance opening**, a circle r 5.00 about the balance staff;
  - the cock region;
  - the crown-wheel/ratchet/click recesses, plus a through-cut at the crown wheel that exposes the centre-wheel teeth.
- **Balance cock:**
  - Foot fills the sector from 1:00 to 2:45, from r 7.0 out to the edge.
  - Arm dog-legs to a strip about 1.0 wide at x 3.4–4.3, running from y +4.7 down to +0.1.
  - It then turns right into a ring housing Ø 3.4 on the balance.

Dial-side x: x_dial = −x_b.

---

## 6. Kinematics

The tooth counts are an exactly consistent set.

### 6.1 Going train

The DUW 4001 has the 7001 geometry, so the ETA counts are used. Modules are refitted to the measured centre distances.

| Mesh | Driver → driven | Teeth | Centre dist. | Module | Ratio | Status |
|---|---|---|---|---|---|---|
| Barrel → centre pinion | 126 → 18 | — | 6.044 | 0.0839 | 7 | 126 [ETA] M; 18 **[EST]** |
| Centre wheel → third pinion | 120 → 16 | — | 3.887 | 0.0572 | 7.5 | [ETA] M |
| Third wheel → fourth pinion | 112 → 14 | — | 3.338 | 0.0530 | 8 | [ETA] M |
| Fourth wheel → escape pinion | 120 → 10 | — | 3.050 | 0.0469 | 12 | [ETA] M |
| Escape wheel | 15 teeth, pitch 24°, tip R 2.614 | — | Escape–pallet 3.018 | — | — | [ETA] / standard H |

**Rate check**
- Centre 1 rev/h × 7.5 = third 7.5 rev/h (1 rev / 8 min).
- × 8 = fourth **60 rev/h = 1 rpm**.
- × 12 = escape **720 rev/h = 12 rpm**.
- × 15 teeth × 2 beats = **21,600 A/h**. Exact.
- Barrel = 1/7 rev/h (1 rev per 7 h).

**Tooth geometry for modelling (generic watch ogival form)**
- Wheel tip Ø = m(z + 2.7); pinion tip Ø = m(z + 1.4).
- Wheel root Ø ≈ m(z − 3.2); pinion root Ø ≈ m(z − 3.6).
- Pinion pitch diameters: centre 1.51, third 0.915, fourth 0.742, escape 0.469.

### 6.2 Motion works ([ETA] M)

| Mesh | Teeth | Centre dist. | Module | Ratio |
|---|---|---|---|---|
| Cannon pinion → minute wheel | 12 → 40 | 3.129 | 0.1203 | — |
| Minute pinion → hour wheel | 10 → 36 | 3.129 | 0.1360 | — |

(40/12) × (36/10) = **12.000** → hour wheel 1 rev / 12 h.

### 6.3 Keyless works

| Mesh | Teeth | Notes |
|---|---|---|
| Winding pinion → crown wheel | 15 → 42 | Crossed axes, m ≈ 0.133. Pinion [ETA]; crown wheel [MEAS] 41–42 and [ETA] 42. |
| Crown wheel → ratchet | 42 → 58 | Centre distance 6.657 [MEAS], m 0.1331. Ratchet [MEAS] 56–59, best 58; ETA has 56. |
| Setting train | Sliding pinion 12 (contrate) **[EST]** → setting wheel 15 [ETA] → minute wheel 40 → cannon 12 | 1 crown turn = **1 minute-hand revolution** (1 h) |

Winding:
- 1 crown turn = 15/58 ratchet rev = **93.10°** = exactly **15 ratchet teeth = 15 click ticks**.
- One ratchet tooth = 6.207°.

### 6.4 Rotation directions

| Mobile | Seen from the BACK | Seen from the DIAL |
|---|---|---|
| Barrel drum (running) | CW | CCW |
| Centre wheel, cannon pinion, minute hand | CCW | CW |
| Third wheel | CW | CCW |
| Fourth wheel / seconds hand | CCW | CW |
| Escape wheel (club teeth lean in the direction of travel) | CW | CCW |
| Minute wheel | CW | CCW |
| Hour wheel / hour hand | CCW | CW |
| Ratchet + barrel arbor (winding only; held by the click while running) | CW | CCW |
| Crown wheel (winding) | CCW | CW |
| Crown / stem (winding) | Clockwise viewed from the crown end | — |
| Pallet fork and balance | Oscillate; opposite senses while the impulse pin is in the fork | — |

### 6.5 Escapement timing (drive everything analytically from one master time t; never integrate frame deltas)

**Constants**
- f = 3 Hz; period 333.33 ms; **beat 166.67 ms**; 6 beats/s.

**Balance**
- θ(t) = A·sin(6π·t).
- Default **A = 290°** (fully wound, dial up) [EST, generic 260–310°].
- Peak speed about 5,466°/s.
- Zero crossings at t = k/6.
- Amplitude vs hours since full wind [EST]: 290° (0–24 h) → 270° (36 h) → 240° (48 h) → 220° (53 h), then the watch stops.

**Lift**
- **50°**, symmetric: ±25° about the dead point [ETA] M.
- Impulse-pin radius 0.75; fork slot 2.635 from the pallet arbor (pallet–balance distance 3.385); lever ratio ≈ 3.5.

**Fork**
- Bankings at **±7.5°** about the pallet→balance line of centres (15.0° total swing).
- Animation rule: φ = −7.5°·clamp(θ/25°, −1, 1). The fork moves only while |θ| ≤ 25°, opposite to the balance; otherwise it rests on the banking.

**Escape wheel, per beat (net +12.0°, always CW from the back)**
- Let u ∈ [0,1] be progress through the lift zone in the direction of travel: u = (θ·sgn(θ̇) + 25)/50.

| Phase | u range | Balance travel | Escape-wheel motion | Duration at A = 290° |
|---|---|---|---|---|
| Lock / rest | — | — | 0 | About 157.5 ms |
| Unlocking | 0 → 0.14 | First 7° | **−0.2°** recoil | 1.28 ms |
| Impulse | 0.14 → 1 | −18° → +25° | **+11.2°**, linear in u | 7.88 ms |
| Drop | Instant at u = 1 | — | **+1.0°** | About 0.3 ms |

- The total time in the lift zone is 9.16 ms per beat.
- The whole fork flip is shorter than one 60 fps frame. Evaluate it from t.
- The drop of beat k happens at t_k = k/6 + asin(25/A)/(6π) (about +4.58 ms).

**Pallets**
- They embrace 60° of the escape wheel: entry at −30° and exit at +30° from the escape→pallet line of centres.
- Teeth reach the entry stone first.
- Draw angle about 13° [generic].

### 6.6 Real-time sync

- Beat count since local midnight: n = floor(6·t_local) (adjusted by the drop offset above), plus the in-beat profile ψ ∈ [−0.2°, +12°].

| Mobile | Angle | Rate | Notes |
|---|---|---|---|
| Seconds hand (dial, CW) | (n mod 360)·1° + ψ/12 | — | 6 steps/s, 1° each |
| Minute hand / centre wheel | n/60° | 0.1°/s | — |
| Hour hand | n/720° | — | — |
| Third wheel | — | 0.125°/beat (0.75°/s) | — |
| Escape wheel | — | 12°/beat (72°/s average) | — |
| Barrel drum | — | 1/420° per beat (0.01429°/s, 360° per 7 h) | — |
| Minute wheel | — | 0.03°/s | — |

### 6.7 Power reserve and winding

- 53 h ÷ 7 h per barrel turn = **7.57 drum turns** from full wind to stop.
- Full wind from empty = 7.571 × 58/15 = **29.3 crown turns ≈ 439 click ticks** (NOMOS: "20–40 turns, depending on the movement").
- Winding animation:
  - The arbor and ratchet rotate; the coils tighten onto the arbor; the click lifts on each tooth and drops onto the next.
  - On release, the ratchet recoils about 2–4° (less than one tooth) [EST].
  - Resistance rises steeply at full wind. There is no slipping bridle.
- Running animation: the arbor and ratchet stand still (held by the click); the drum turns CW from the back; the coils migrate outward.
- Mainspring [EST]: drum ID about 9.6, arbor Ø about 3.2, spring height about 0.75, thickness about 0.09. About 20 coils when wound, about 13 when let down.
- Hairspring breathing: an Archimedean spiral from r 0.55 to 2.2 with pitch about 0.127. Rotate the point at fraction s along the spring (0 = collet, 1 = stud) by θ·(1 − s).

---

## 7. Labelled parts list (on-screen labels)

### Exterior
- **Case (middle case)**: The polished stainless-steel body that holds everything. Its straight vertical sides give the Tangente its signature "flat cylinder" look.
- **Bezel**: The thin polished ring on top that holds the front crystal in place.
- **Sapphire crystal**: A flat window of synthetic sapphire, nearly as hard as diamond, that protects the dial and hands.
- **Case-back ring**: The steel ring on the back that holds the rear window. It is engraved with the model name and the watch's serial number.
- **Sapphire display back**: A second sapphire window that lets you watch the movement working.
- **Crown**: The fluted knob at 3 o'clock, signed NOMOS. Turn it to wind the watch; pull it out to set the time, which also stops the seconds hand.
- **Winding stem**: The thin steel rod linking the crown to the gears inside the movement.
- **Lugs**: The four straight, angled steel arms that hold the strap. They are drilled through so the spring bars can be released.
- **Spring bars**: Spring-loaded pins between each pair of lugs that the strap wraps around.
- **Strap**: Black shell cordovan leather from Horween, a dense, glossy horsehide. 18 mm wide at the lugs.
- **Buckle**: A simple polished steel tang buckle carrying the NOMOS logo.
- **Casing ring and clamps** (hidden): Hold the 23.3 mm movement centred and tight inside the 35 mm case.

### Dial and hands
- **Dial**: The silver-plated face of the watch, with a fine frosted grain.
- **Arabic numerals**: Only the even hours (12, 2, 4, 8, 10) are numbered, in a slim 1930s Bauhaus-style typeface. Each one is turned to follow the circle.
- **Baton indices**: Thin printed strokes that mark the odd hours.
- **Minute track**: A ring of 60 fine ticks for reading the exact minute. Every fifth tick is bolder.
- **NOMOS / GLASHÜTTE**: The brand, and the Saxon town whose name may only appear on watches that are largely made there.
- **"Made in Germany"**: Tiny print along the edge at 6 o'clock.
- **Small-seconds subdial**: A sunken, finely grooved disc at 6 o'clock where the seconds hand runs.
- **Hour hand**: The shorter blued-steel hand. It goes round once every 12 hours.
- **Minute hand**: The long blued-steel hand. It goes round once an hour and is driven by the centre wheel.
- **Seconds hand**: The small blued hand in the subdial, mounted directly on the fourth wheel. It ticks 6 times per second.
- **Heat-blued steel**: The hands are heated to about 290 °C until a thin oxide layer forms. That layer gives the "cornflower" blue and resists rust.

### Movement framework
- **DUW 4001 caliber**: NOMOS's own hand-wound movement, 23.3 mm across and 2.6 mm thin. It runs about 53 hours on one full wind.
- **Pillar plate (main plate)**: The base plate on the dial side that every other part is built onto.
- **Three-quarter plate**: The large top plate covering about three-quarters of the movement. It holds the barrel and gear-train pivots in one rigid piece, a Glashütte tradition.
- **Balance cock**: The slim separate bridge that holds the top pivot of the balance wheel, so the balance can be adjusted or removed on its own.
- **Pallet bridge**: The small bridge that holds the upper pivot of the pallet fork.
- **Glashütte ribbing**: The broad diagonal stripes brushed across the plates, purely decorative.
- **Perlage**: The pattern of small overlapping circles ground into surfaces under the balance.
- **Jewels (17 rubies)**: Synthetic rubies used as nearly frictionless bearings for the pivots. They also form the pallet stones and the impulse pin.
- **Blued screws**: Heat-blued steel screws that hold the plates together, both functional and decorative.
- **Engravings**: Gold-filled lettering naming the caliber, its serial number, NOMOS Glashütte and Deutsche Uhrenwerke, plus the jewel count "17 Rubine".
- **Shock protection**: A small spring-mounted jewel setting on the balance. It lets the delicate balance pivot move aside, then recentre, when the watch is knocked.

### Winding and power
- **Crown wheel**: Turned by the winding pinion when you wind. It passes the motion on to the ratchet wheel.
- **Winding pinion**: A small gear on the stem, visible through a slot. It drives the crown wheel.
- **Sliding pinion (clutch)** (hidden): Slides along the stem to switch between winding (crown pushed in) and time-setting (crown pulled out).
- **Ratchet wheel**: The large sunburst wheel on the barrel arbor. Turning it coils the mainspring tighter.
- **Glashütte click**: The pawl and its long curved spring. It lets the ratchet turn only one way, so the wound spring can't unwind backwards; it makes the "clicking" you feel when winding.
- **Mainspring barrel**: A toothed drum holding the coiled mainspring. As the spring relaxes, the drum turns once every 7 hours and drives the gear train.
- **Mainspring** (hidden): A long coiled steel ribbon that stores the energy from winding, enough for about 53 hours.

### Gear train
- **Centre wheel**: The gilt wheel at the heart of the movement. It turns once an hour and carries the minute hand.
- **Third wheel**: An intermediate gear that speeds up the motion between the centre wheel and the fourth wheel. It turns once every 8 minutes.
- **Fourth wheel**: Turns exactly once a minute and carries the small-seconds hand.
- **Pinions**: The small gears on each wheel's axle that are driven by the next wheel along. Each wheel–pinion pair multiplies the speed.

### Escapement and regulation
- **Escape wheel**: A 15-tooth steel wheel. It is released one half-tooth at a time and passes small pushes to the pallet fork.
- **Pallet fork**: A rocking lever with two ruby stones. It locks and releases the escape wheel 6 times per second and gives the balance a push each time.
- **Pallet stones**: The two pink ruby pads on the fork that catch and release the escape wheel's teeth.
- **Balance wheel**: The gold-coloured three-arm wheel swinging back and forth 3 times a second. It is the watch's timekeeper.
- **Balance spring (hairspring)**: The fine blue spiral that makes the balance oscillate at a steady rate. NOMOS makes it in-house.
- **Impulse pin and roller**: A tiny red ruby on the balance axle. It flicks the pallet fork and receives the fork's push.
- **DUW regulation system**: Two rings on the balance cock with no adjusting screw. One carries the "spring key" that sets the hairspring's effective length (rate); the other holds the spring's outer end (beat). Both are moved with fine pliers.
- **Stud carrier and stud**: Clamp the outer end of the hairspring to the balance cock.
- **Stop-seconds lever** (hidden): When you pull out the crown, this lever touches the balance and stops it, so you can set the time to the second.

### Hidden dial-side parts (shown in exploded view)
- **Cannon pinion**: Rides on the centre arbor by friction, carries the minute hand, and drives the motion works. It slips when you set the time.
- **Minute wheel and pinion**: Reduce the minute-hand motion by 12:1 to drive the hour hand.
- **Hour wheel**: Carries the hour hand and turns once every 12 hours.
- **Setting lever, yoke and jumper**: Levers and springs that respond to pulling the crown out and move the sliding pinion into the setting position.
- **Setting wheel**: Connects the crown to the minute wheel while you set the time.

---

## 8. Open questions and low-confidence items

1. **Which caliber the user's watch has.** DUW 4001 (about 2025 onward) or Alpha (earlier) is unknown until the user answers section 1. Changeover date: estimated 2024 to mid-2025, not confirmed.
2. **Subdial / fourth-arbor offset: chosen −6.40.**

   | Measurement | Offset |
   |---|---|
   | Dial photo, case-scaled | 6.50 (6.54 after perspective correction) |
   | Cased back render, case-scaled | 6.43 |
   | Bare movement render, plate-scaled to 23.3 | 6.34 |
   | ETA 7001 drawing | 6.32 |

   The 2.5 % scale disagreement between case-scaled and plate-scaled images is unresolved. 6.40 lies within every stated error bar and is invisible at this scale. The fourth arbor and the subdial must stay coincident.
3. **Going-train counts** (126/18, 120/16, 112/14, 120/10, 15) are ETA 7001-derived. The DUW 4001 geometry matches the 7001 within 0.05 mm and the centre-wheel Ø matches, but NOMOS publishes no counts. The centre pinion's 18 leaves is an estimate (it gives 7 h per barrel turn).
4. **Ratchet / crown wheel**: 58/42 chosen. Image counts give 56–59 and 40–42 (the CALIBER report said 40); ETA has 56/42. Winding feel (15 clicks per crown turn) does not depend on this choice.
5. **Vertical stack** inside the movement and case is entirely estimated, built to avoid collisions and anchored by ETA hand heights and the photo-measured crown axis. Consequences:
   - Mainspring height about 0.75. The MECHANICS report estimated 1.0, which this stack cannot fit.
   - Dial thickness 0.30. The VISUAL report estimated 0.40; the ETA hand heights favour 0.30.
   - Crystal 1.05 and back sapphire 1.0 thick.
6. **Dial-side keyless and motion-works positions** are schematic, except the ETA minute-wheel position. Stop-seconds lever geometry is unknown.
7. **Balance and hairspring**: material, inertia and hairspring alloy are unknown. Coil count about 13 (from the photo); flat spring assumed. Amplitude (290°) and lift angle (50°, ETA; some sources say 52°) are not NOMOS-published.
8. Front-crystal AR coating; 3 atm vs 5 atm by production year.
9. **Case-back construction**: press-fit assumed (no screws visible). Case-back sapphire thickness and gasket layout are estimates.
10. **Strap**: lengths, taper (18→16), thickness and keepers come from a generic NOMOS strap listing and are estimates.
11. **Movement serial and case serial**: the render shows N° 00535 / TANGENTE 83427; the user's will differ. Older Alpha-era case-back and plate engraving variants are unverified.
12. **Centre-wheel spoke count** (4 assumed) and **pallet-bridge outline** are estimates; only partially visible.
13. Unrecoverable conflict: the MODEL report's estimated case-back text ("NOMOS GLASHÜTTE / EDELSTAHL / SAPHIRGLAS / 139") is rejected in favour of the official render.

Files are in `<scratchpad>\`:
- `lead\jewels2.py` — re-measures the jewel centres
- `lead\j3.py`, `lead\case.py` — cased-back scale checks
- `lead\crown_grid.png`, `lead\lug_grid.png` — side-photo crown and lug measurement grids
- Source images: `img\duw4001_back.jpg`, `img\t139_back.jpg`, `img\front.jpg`, `img\side.jpg`, `img\swing_parts.jpg`, `img\swing_balance_spring.jpg`