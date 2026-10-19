TUDOR BLACK BAY PRO ref. M79470-0004 ("Opaline"/"Polar"): EXTERIOR BRIEF FOR A TO-SCALE MODEL
(case, bezel, crown, crystal, caseback, lugs, bracelet, dial, hands; the movement is in a separate report)

Conventions: mm. Dial-side frame: +Z out of the dial, 12 o'clock = +Y, 3 o'clock (crown) = +X.
Angles are measured CLOCKWISE FROM 12 (as on a dial); r = radius from the dial centre.
Heights are given as Z_case = height above the lowest point of the case back (Z_case 0 → crystal apex 14.60).
The SPEC DATA block converts them to the movement frame with zc() (z = 0 at the main-plate dial face).
Tags: [OFF] official Tudor page/press kit/press image, [REV] review, [MEAS] my pixel measurement,
[EST] engineering estimate. Confidence H / M / L.

======================================================================
0. IDENTITY (verified, not from memory)
======================================================================
- M79470-0004 = TUDOR BLACK BAY PRO, 39 mm steel case, OPALINE (white) DOMED dial, riveted steel
  bracelet with T-fit clasp. Released Watches & Wonders 2025. Calibre MT5652 (COSC, GMT). [OFF] H
  Official page title: "TUDOR Black Bay Pro watch - 39mm steel case, Opaline dial - m79470-0004".
  https://www.tudorwatch.com/en/watches/black-bay-pro/m79470-0004 (read in a real browser; curl gets 403)
- Family M79470 = Black Bay Pro (fixed 24-h steel bezel + yellow 24-h "Snowflake" GMT hand).
  -0001/-0002/-0003 = black dial (2022) on bracelet / fabric / hybrid; -0004 = opaline on BRACELET;
  -0005 = opaline on black Jacquard fabric strap with yellow band; -0006 = opaline on hybrid
  rubber-and-leather strap. [OFF images + aBlogtoWatch] H for -0004, M for -0005/-0006 mapping.
- "Polar" is a collector nickname; Tudor calls it "Opaline". Everything except the dial, hand outlines
  and lume colour is identical to the 2022 black version (Monochrome hands-on; Tudor 2025 press kit). [REV/OFF] H
- Ethos page confirms: Black Bay Pro, M79470-0004, 39 mm, 14.6 mm thick, 20 mm lugs, white dial,
  Snowflake hands, lume on hands & markers, Tudor T-fit clasp, steel, 200 m, MT5652.
  https://www.ethoswatches.com/product-tudor-black-bay-m79470-0004.html (WebFetch 403; read via curl)

Official specification (Tudor product page + 2025 press-kit DOCX):
| Item | Official text |
|---|---|
| Case | 39 mm steel case with polished and satin finish; lug width 20 mm; case thickness 14.6 mm |
| Bezel | 24-hour graduated fixed bezel in satin-brushed steel |
| Crown | Screw-down winding crown in steel with the TUDOR rose in relief; "set flush to the middle case band so that its tube is not visible", "redesigned for maximum grip" |
| Dial | Opaline, domed. "Applied ceramic hour markers filled with Super-LumiNova ... outlined in black"; "monobloc ceramic capped with luminous material" |
| Hands | "Snowflake" hands outlined in black, Grade A Super-LumiNova; angular yellow 24-h "Snowflake" hand |
| Crystal | Domed sapphire |
| Water resistance | 200 m (660 ft) |
| Bracelet | Riveted 316L steel, polished and satin; TUDOR "T-fit" clasp, rapid adjustment, 5 positions, up to 8 mm, no tools. "Visible rivet heads on the side ... links had a distinct stepped construction ... solid links and laser-finished rivet-style heads" |
| Movement | MT5652, Ø 31.8, 7.52 thick, 28 jewels, 28,800 vph, ~70 h, jumping local hour, instantaneous date at 3 synchronised with the hour hand |
Press kit: https://www.tudorwatch.com/en/pressroom/products/black-bay-pro (2025 DOCX:
https://media.tudorwatch.com/raw/upload/fl_attachment/v1/tudorwatch/pressroom/products/black-bay-pro/2025/docx/New-Watches-WW25_Black-Bay-Pro_en.docx)

Third-party numbers:
- Lug-to-lug: 47 (Monochrome), "39×47.2" (Worn & Wound, hands-on), 47.8 (The 1916 Company, search snippet),
  47.5 (Bernard Watch listing). Chosen 47.2 [REV] M. My front-photo value is 45.4 before perspective
  correction (lug tips sit ~6–9 mm below the bezel) and 46.4–47.2 after; consistent.
- Head weight 86 g (Worn & Wound). Thickness 14.9 (1916 Co.) and 14.5 (WatchCrunch) conflict with the
  official 14.6; official kept. WatchBase lists a 22 mm lug width; official 20 mm kept.
- Monochrome: "satin-brushed top surfaces, polished sides and a polished bevel running from one lug to
  another"; "fixed radially brushed bezel with engraved, black-filled 24h scale"; "sapphire crystal,
  domed and anti-reflective"; "screw-down crown and caseback"; "hardly domed back"; "black outlined
  applied markers in monoblock ceramic with white Super-LumiNova"; "black printings and tracks";
  "date at 3 o'clock with white disc"; "square lollipop seconds and GMT hands".
  https://monochrome-watches.com/personal-take-on-tudor-black-bay-pro-polar-opaline-by-fan-of-the-explorer-ii-hands-on-review-price/
- Worn & Wound (2022): 24-h hand "tapers to a point just beyond the chapter ring"; seconds counterweight
  coated matte black; no crown guards; "throwback chamfered lug".
  https://wornandwound.com/review/owners-review-the-tudor-black-bay-pro/
- Fratello: T-fit gives 8 mm in five steps; rivets are faux (decorative).
  https://www.fratellowatches.com/tudor-black-bay-pro-up-close-and-personal/

======================================================================
1. IMAGES AND HOW THE NUMBERS WERE MEASURED
======================================================================
Folder: <scratchpad>\img\tudor-m79470\
Scripts: ...\scratchpad\py-tudor\ (ringfit.py, silfit.py, alphasil.py, polarblobs.py, markers.py,
handprof.py, textlines.py, polar.py, colours.py; run with python -I).
Tudor CDN pattern (native resolution, PNG): https://media.tudorwatch.com/image/upload/f_png/v1/<asset>

| File | Size | Content / use | Scale & centre |
|---|---|---|---|
| press_M79470-0004_FF_RGB.png | 4000² | OFFICIAL 2025 press full-face (asset tudorwatch/pressroom/products/black-bay-pro/2025/M79470-0004_FF_RGB). MAIN MEASUREMENT IMAGE | 38.41 px/mm (case silhouette Ø39 = 1498 px, rms 0.65 px). Centres: silhouette (1988.9, 1723.9); dial/minute circle (1991.6, 1721.7); bezel engraving (1990.6, 1719.6); hand pin (1991.5, 1718.0) |
| press_M79470-0004_DET_RGB.png | 4000² | official 3/4 view (crown, lug bevel) | perspective |
| off_front_cb.png | 1800×2400 RGBA | catalogue front (catalogue/0yi5ee8b69yh3/upright-cb-with-drop-shadow/tudor-m79470-0004) | 27.43 px/mm, centre (898.1, 1254.4); minute circle re-measured 13.62 mm (cross-check OK) |
| off_front_cb_centred.png | 1800×2400 | same, centred | 27.45 px/mm, (898.3, 1201.8) |
| off_upright_ob.png | 2316² RGBA | whole bracelet straight (…/upright-ob/…) | 19.07 px/mm, (1156.5, 1158.9) |
| off_front_cb_shadow.png | 2316² | small front | 19.07 px/mm, (1156.5, 1218.8) |
| off_bracelet_c.png / off_bracelet_o.png | 2400² | clasp view / straight bracelet | ≈28.7 / ≈28.2 px/mm if narrow links = 15.5 mm [EST] |
| off_feat_dial.png | 5259² | official dial macro (perspective) | shapes only |
| off_feat_bezel.png | 1920² | official low-angle side: crystal dome, crown, lug (on -0006 strap) | shapes only |
| off_feat_bracelet.png, off_beauty.png, off_ambiance.png, off_wrist.png, off_model_page.png, off_feat_bg_*.png, off_family_gallery_01..09.png | — | official detail/lifestyle | — |
| off_front_cb_0001/0005/0006.png | 1800×2400 | sister references | 27.43 px/mm |
| press_tudor-2021-s38-10550/10629/10648.png | 4000² | 2022 press macros (bezel engraving, end link) | — |
| ethos*.jpg (11) | ≤1814 | Ethos gallery (lume glow shot = ethos-multiple-9) | — |
| mono_polar_1..12.jpg | 2100 | Monochrome hands-on of THIS reference: side (6), caseback (8), clasp (9) | — |
| mono_2022_1..12.jpg | 2100 | Monochrome 2022 review; near-level 9 o'clock profile (10) | ≈21 px/mm |
| fr_*.jpg | 1800 | Fratello; crown-side profile fr_TudorBlackBayPro-3 (≈21° elevation) | ≈11 px/mm |
| ww_*.jpg | 2000 | Worn & Wound; caseback straight on (ww_0877) | — |
| bw_tdr1029*.jpg | ≤1600 | Bernard Watch listing photos (side "s", rear "r") | — |

Method notes
- Scale = case silhouette circle (outer edge of the bezel) = 39.0 mm, fitted on 400 edge points away
  from lugs and crown. The photo has mild perspective (camera ≈285 mm away, deduced from how much of the
  crown's end face shows), so parts lower than the bezel read 1–3 % small; dial parts are additionally
  seen through the domed crystal. Uncertainty on dial/hand dimensions ≈ ±1.5 % plus ±0.03 mm.
- Ring centres differ by ≤5 px (0.13 mm) between bezel, dial and pin (parallax): dial items were
  measured about the dial centre, bezel items about the bezel centre.
- The official photo shows 10:10:38 local, 24-h hand at 07:11 (hour 305.0°, minute 65.6–66.1°, GMT 107.7°,
  seconds 229.6°). The positions are consistent (unlike the Tangente photo), so they can be the default pose.
- Check: every dial/hand/bezel-bar outline in SPEC DATA was drawn back onto the 4000 px photo
  (py-tudor/overlay.py → work-tudor/overlay_check.png, overlay_zoom.png). The outlines follow the real
  edges within about 1–2 px (≈0.05 mm). The SPEC DATA block was run in Node (valid ES module, no duplicate keys).

======================================================================
2. CASE
======================================================================
2.1 Overall [OFF] H unless noted
- Ø 39.0 (bezel outer edge = middle-case flank, flush within ±0.1 [MEAS M]); thickness 14.6 (case-back apex
  to crystal apex); lug width 20.0; lug-to-lug 47.2 [REV M]; 316L steel; 200 m; screw-down crown and back.
- No crown guards. The crown sits at 3 o'clock exactly (centre y = −0.06 ± 0.05 [MEAS]).

2.2 Finish map [OFF "polished and satin" + REV Monochrome + photos] H
| Surface | Finish |
|---|---|
| Bezel top | satin, RADIAL brushing (lines point at the centre) |
| Bezel outer side + small rounded top-outer edge + inner chamfer | polished |
| Case flanks (vertical sides of middle case incl. outer sides of lugs) | polished, mirror |
| Bevel along the upper outer edge of case and lugs ("lug-to-lug bevel") | polished, ≈0.45 mm wide in plan |
| Lug top surfaces | satin, brushed along the lug length (≈ 12–6 direction) |
| Lug inner faces | satin [EST] |
| Case back face (annulus round the case back + lug undersides) | satin, straight brushing |
| Case back | knurled rim (bright), engraved flat ring, centre disc straight-brushed |
| Crown | flute flats satin-brushed, end face polished, rose relief polished |

2.3 Plan outline (top view) [MEAS front image, perspective-corrected] M
- Round (r 19.5) from about 57° to 123° and 237° to 303° from 12. Beyond that, the lugs' outer flanks
  run almost straight to the tips. Upper-right lug outer edge (x, y):
  (16.35, 10.62) [departs circle] → (15.0, 15.1) → (13.95, 18.2) → (13.1, 20.3) → (12.4, 21.9)
  → rounded corner r ≈ 0.8 → tip edge at y = 23.6 (x ≈ 11.6) → straight end to the inner face x = 10.0.
  The outer edge makes ≈ 21° with the 12–6 axis. Mirror for the other three lugs.
- Lug inner faces x = ±10.0 (official 20 mm; measured 19.7 before perspective correction).
- Lug top width ≈ 3.7 at y = 17, 2.4 at the tip. Lug tips are cut square (perpendicular to 12–6), with a
  slightly rounded outer corner. Lugs are not drilled (no spring-bar holes visible).

2.4 Side profile (Z_case) [EST from 5 side photos + official 14.6] M-L, ±0.4 per segment
Proportions: crown Ø ≈ flank height (two independent photos give flank 7.3 ± 0.3 mm).
Radial section at 3/9 o'clock, (r, Z_case), outside surface from the back upwards:
  case back: (0, 0.00) → (11.0, 0.30) → (15.6, 0.55) → (16.2, 0.90) knurled cylinder → (16.2, 2.60)
  → case back face (16.4, 2.70) → (19.0, 2.70) → bottom chamfer → (19.5, 3.20)
  → polished flank → (19.5, 9.70) → polished top bevel → (18.95, 10.30) [case top, under bezel]
  bezel: (19.5, 10.30) → polished side → (19.5, 12.10) → round r 0.3 → (19.25, 12.40)
  → radially brushed flat top → (16.05, 12.40) → polished inner chamfer → (15.95, 12.20)
  crystal: wall (15.95, 12.20) → (15.95, 13.05) → fillet → (15.30, 13.70) → (13.5, 14.00)
  → (10.0, 14.30) → (5.0, 14.52) → apex (0, 14.60).
Layer heights: case back 2.7 (centre dome 0.3, knurled band 1.7), middle case 7.6 (flank 6.5 + chamfers),
bezel 2.1, crystal 2.2 above the bezel top (wall ≈0.65 + dome ≈1.55). Monochrome: the dome "accounts
for at least a millimetre". The tall straight flank is the watch's most criticised feature (W&W/Monochrome).

2.5 Lug side profile, (y, Z_case) for the 12 o'clock lugs (mirror y for 6) [EST from photos] L-M
- Top: (15.0, 10.30) → (18.0, 10.15) → (20.0, 9.75) → (21.5, 9.20) → (22.8, 8.40) → (23.6, 7.60).
  Convex, a long gentle drop. The polished bevel runs along its outer top edge.
- End face: near-vertical (23.6, 7.60) → (23.6, 3.60), edges broken 0.2.
- Underside: (23.6, 3.60) → (21.5, 3.05) → (19.5, 2.75) → (16.4, 2.70).
- Spring bar (hidden, through the inner faces): axis (y 21.7, Z 5.4), Ø 1.8 [EST].
- Engravings on the case back face next to the lugs: reference "79470" at one end and the serial
  (e.g. "5K98671") at the other, small sans capitals ≈0.8 high, radial orientation [REV photos] M.

2.6 Bezel (fixed) [OFF + MEAS]
- Steel, satin top with RADIAL brushing; fixed (not rotating). [OFF] H
- Radii [MEAS] H: outer 19.50 (polished round edge 19.25–19.50); flat top 16.05–19.25 (3.2 wide);
  polished inner chamfer 15.95–16.05. Height Z 10.30–12.40 [EST].
- Engraving: black-filled (depth ≈0.10 [EST]). 12 even-hour numerals + 12 odd-hour bars, no triangle,
  no minute marks. [MEAS] H
  - Bars at 15°, 45° … 345°: r 16.55–18.92 (length 2.37), width 0.28.
  - Numerals: cap height 2.34 (r 16.56–18.90, same band for every numeral). Condensed squarish
    monoline sans (DIN/Eurostile-like): flag-topped "1" with no foot, flat-based "2" with a straight
    diagonal, closed "4", square-bowled "6"/"0", "8" with a smaller upper bowl. Stroke ≈0.24.
  - Orientation (measured on an unwrapped strip and checked on the "8" bowl sizes):
    TOPS OUTWARD (readable with that numeral turned to 12): 18 (270°), 20, 22, 24 (0°), 2, 4, 6 (90°).
    TOPS INWARD (readable from 6 o'clock): 8 (120°), 10, 12 (180°), 14, 16 (240°).
  - Glyph angular spans (bbox, deg cw from 12; bezel centre) and arc width at r 17.73:
    | Numeral | Glyph spans (deg) | Widths |
    |---|---|---|
    | 24 | "2" 355.35–359.30, "4" 0.10–4.90 | 1.22, 1.49 |
    | 2 | 27.90–31.85 | 1.22 |
    | 4 | 57.75–62.55 | 1.48 |
    | 6 | 88.25–92.20 | 1.22 |
    | 8 | 118.30–122.25 | 1.22 |
    | 10 (inv.) | "0" 146.80–150.80, "1" 152.05–153.80 | 1.24, 0.54 |
    | 12 (inv.) | "2" 176.65–180.55, "1" 181.80–183.55 | 1.21, 0.55 |
    | 14 (inv.) | "4" 206.25–210.70, "1" 211.50–213.30 | 1.38, 0.56 |
    | 16 (inv.) | "6" 236.35–240.30, "1" 241.55–243.30 | 1.22, 0.54 |
    | 18 | "1" 266.40–268.05, "8" 269.20–273.15 | 0.51, 1.22 |
    | 20 | "2" 295.50–299.45, "0" 300.55–304.55 | 1.22, 1.24 |
    | 22 | 325.40–329.35, 330.90–334.85 | 1.22, 1.22 |
    Inter-digit gap 0.25–0.48 mm. Each number is centred on its 30° position.

2.7 Crown [OFF + MEAS + EST]
- Screw-down, steel, at 3 o'clock, no visible tube (flush with the case). Axis Z_case ≈ 6.45 [EST: mid-flank].
- Ø 7.4 over the flutes (7.25 measured, +2 % for perspective) [MEAS M]; protrudes 3.0 beyond the
  flank (end face at x 22.5) [MEAS M].
- Along x: dark sealing neck Ø ≈6.0 for x 19.5–20.0; fluted body x 20.0–21.7 with ≈20 deep,
  flat-topped crenellation flutes (≈18–20 counted from the projected rib spacing of ≈19°) [MEAS L-M];
  polished conical/rounded end x 21.7–22.4 going down to a flat polished end face Ø ≈5.8 at x 22.4.
- End face: TUDOR ROSE in relief (five-petal heraldic rose with sepal points, round centre boss)
  inside a thin raised ring, rose Ø ≈4.4, relief ≈0.12 [EST]. [OFF photo] H for the motif.

2.8 Crystal
- Domed sapphire, anti-reflective [OFF + REV] H. Box-dome shape: a short cylindrical wall above the bezel,
  then a dome (profile in 2.4) [EST M]. Visible edge r 15.95. Underside: (15.3, 11.65) → (0, 12.05),
  so ≈2.55 thick at the centre [EST]. IOR 1.77; faint bluish AR reflection.

2.9 Inner flange (rehaut) between dial and crystal [MEAS radii H, heights EST]
- Plain light-grey sloped ring with no print, seen through the crystal from r 14.30 (dial edge) to
  15.95 (crystal edge). Model it as a cone from (14.30, Z 9.78) to (15.95, Z 11.60), satin steel/grey.

2.10 Case back [REV photos; dims EST]
- Solid, screw-down, steel; "hardly domed" [REV].
- Fine coin-edge knurled rim, ≈120 teeth, on a cylinder Ø ≈32.4 [MEAS from two oblique photos, ±1]
  1.7 tall.
- Flat ring with ENGRAVED serif capitals (Roman, like the "TUDOR" logotype), letter height ≈1.5,
  r 11.4–12.9, tops toward the rim, running clockwise as seen from the back:
  "TUDOR GENEVE ⛉ CALIBRE MANUFACTURE ⛉ TUDOR GENEVE ⛉ CALIBRE MANUFACTURE ⛉" (⛉ = small Tudor shield).
  Two repeats over 360°. The orientation varies watch to watch (thread); put "TUDOR GENEVE" at 12 and 6.
- Thin engraved circle at r ≈11.05. Centre disc r < 11.0 is straight-brushed (parallel lines).
- No reference, depth or "Black Bay" text on the back itself.
  (Monochrome photo: https://monochrome-watches.com/app/uploads/2025/05/Tudor-Black-Bay-Pro-GMT-White-Opaline-Dial-Polar-Explorer-review-8.jpg)

======================================================================
3. DIAL (all from the 4000 px press image unless noted; dial centre)
======================================================================
3.1 Base [OFF + MEAS]
- Opaline: white, finely grained, faintly metallic and matte [OFF/REV]. DOMED [OFF]; sagitta ≈0.30 [EST L].
- Visible edge r 14.28 (thin dark line = dial edge/shadow); physical Ø ≈29.2 [EST].
- Colour: press #ECECEC (p10 #E1DFE0, p90 #F4F4F4); macro #C4C8C9 (cool light); real photos read slightly
  warm (#D2D1CF). Render base #E8E9E8, metalness ≈0.1, roughness 0.55, grain ±3/255.

3.2 Applied markers (monobloc ceramic, black rim, white lume cap) [MEAS] H
| Marker | Position | Outer size | Lume |
|---|---|---|---|
| Circles at 1, 2, 4, 5, 7, 8, 10, 11 (30°, 60°, 120°, 150°, 210°, 240°, 300°, 330°) | centre r 10.90 (±0.02) | Ø 2.05 | Ø 1.68 (black rim 0.185) |
| Bar at 6 (180°) and at 9 (270°) | r 9.40–13.10, centre r 11.25 | 3.70 × 1.28, corner r ≈0.18 | 3.32 × 0.90 (rim 0.19) |
| Inverted triangle at 12 | top edge y 13.10; apex tip y 9.85 | sharp vertices (±1.44, 13.10), (0, 9.44); apex fillet r 0.24; top corners r 0.15; half-angle 21.5° | inset 0.19 |
| 3 o'clock | date window, no marker | | |
- Height above the dial ≈0.55 [EST]; lume cap slightly domed (+0.05) [EST]. Each marker casts a ≈0.06 drop
  shadow downward in the photo (subtracted from the sizes).
- The 2 o'clock circle is hidden under the minute hand in the photo; assumed identical.

3.3 Minute track (printed black) [MEAS] H
- Outer circle r 13.62, line ≈0.12 wide. There is no inner rail.
- 1-minute ticks: r 12.59 → 13.62, width 0.11 (every 6°).
- 5-minute ticks (thick bars): r 12.58 → 13.62, width 0.50, at 30°, 60°, 120°, 150°, 210°, 240°, 300°, 330°.
- Shortened to r 13.28 → 13.62: the 5-minute bars at 0°, 90°, 180°, 270° (0.50 wide) and the 1-minute
  ticks at 6°, 354° (triangle) and 84°, 96° (date frame).

3.4 Date window [MEAS] H
- Centre (11.13, −0.02). Opening 2.76 × 2.10 (x 9.75–12.51, y −1.07…+1.03), corners slightly rounded.
- White bevelled frame cut into the dial: ≈0.40 wide at 45°, outer ≈3.55 × 2.90. Top bevel lit, bottom bevel
  shaded. No metal frame.
- Date disc white (#F0F0EE) with black numerals; sans grotesque (Helvetica-like). Height 1.64; "28" spans
  x 10.01–12.30 ("2" 1.04 wide, "8" 1.02). Disc concentric with the dial, numerals centred at r ≈11.13,
  31 positions (11.61° apart). Instantaneous, synchronised with the jumping local-hour hand [OFF].

3.5 Printed text (black #111, centred on x = 0 within 0.05) [MEAS] H
| Text | Box (x; y) | Cap height | Style |
|---|---|---|---|
| Tudor shield logo | x −0.56…0.64; y 5.95…7.62 | 1.67 tall, 1.20 wide | black-outlined heraldic shield; crenellated top with two small square windows; pointed base |
| TUDOR | x −2.72…2.82; y 4.65…5.67 | 1.02 | wide serif wordmark. Letters T −2.72/−1.86, U −1.66/−0.61, D −0.41/0.56, O 0.69/1.73, R 1.83/2.82 |
| GENEVE | x −1.86…1.94; y 3.79…4.47 | 0.68 | condensed grotesque, no accent |
| 200m:660ft | x −2.67…2.51; y −5.09…−4.41 | 0.68 | bold digits; "m" and "ft" italic lowercase |
| CHRONOMETER | x −3.56…3.55; y −6.00…−5.45 | 0.55 | regular grotesque caps |
| OFFICIALLY CERTIFIED | x −4.73…4.75; y −6.99…−6.44 | 0.55 | regular grotesque caps |
| SWISS · MADE | on an arc r 13.85–14.14 (between the minute circle and the dial edge); SWISS 180.8°–189.1°, MADE 170.4°–178.9° | 0.29 | small caps, tops toward the centre (reads upright at 6), split by the 6 o'clock tick |
Nothing else is printed: no "Black Bay", no "Pro", no rehaut text.

======================================================================
4. HANDS (local frame: +y from the arbor toward the tip, x across; outlines measured on hand-aligned
   resamplings at 0.01 mm/px) [MEAS] H for plan shapes, [EST] for heights
======================================================================
Construction: matte, slightly textured BLACK-coated hands (the "black outline" is the hand body) with
white Grade A Super-LumiNova windows; the GMT hand is YELLOW-lacquered metal with a white lume window.
The seconds hand is black with a lume diamond. Lume glows green (#00C27E).
Stack from the dial up (macro of the hub): hour (local, jumping) → GMT 24-h → minute → seconds [MEAS M].
Reconcile with the movement report.

| Hand | Tip r | Shape |
|---|---|---|
| Hour ("Snowflake") | 9.16 (0.7 short of the circle markers) | stem 1.13 wide (lume 0.69) from the collet; 45° diamond (square on edge), outer half-diagonal 1.90 centred at y 6.90 (lume 1.57); stem continues 1.13 wide to a SQUARE end at 9.16 (black end cap 0.24). Lume from y 2.05. Black frame ≈0.22 |
| Minute | 13.60 (touches the minute circle) | straight baton 0.94 wide (lume 0.43) from y ≈1.4, lume from y 2.0; pointed tip, taper from y 12.70 (half-angle ≈25°); lume ends in a point at 13.05 |
| GMT 24-h (yellow) | 14.12 (0.5 beyond the minute circle) | shaft 0.80 → 0.53 wide (y 1.5 → 7.08); yellow 45° diamond frame, outer half-diagonal 1.585 at y 8.40, white lume square (half-diagonal 1.22); needle 0.76 → 0.25 wide (y 9.6 → 14.12), blunt slightly rounded end. No tail |
| Seconds | 13.50 | black needle 0.32 wide; 45° diamond "lollipop", outer half-diagonal 1.03 at y 8.92, lume half-diagonal 0.74; counterweight bar 0.54 wide to y −4.45, square end, plain black |
| Hub | — | stacked matte black collets: Ø 3.0 (hour), ≈2.6 (GMT), ≈2.3 (minute), seconds boss ≈1.9, polished steel pin Ø ≈0.22 |
Blade thickness [EST]: hour/minute 0.18, GMT 0.15, seconds 0.12. Blade-bottom heights [EST], Z_case:
hour 10.55, GMT 10.85, minute 11.15, seconds 11.45, pin top 11.75 (crystal underside 12.05 at the centre).

======================================================================
5. BRACELET (M79470-0004 = riveted steel bracelet + T-fit clasp)
======================================================================
Measured on off_upright_ob.png (19.07 px/mm) and checked on the 4000 px front image. The image scale gives
widths 1–3 % small; real values (perspective-corrected) are given. [MEAS] M unless noted.
- Three-row "Oyster-type" construction with SOLID links: a centre link 8.7 wide (constant along the whole
  bracelet) and two outer links per row. The joints of the centre links lead those of the outer links by
  ≈3.5 (≈0.36 pitch).
- Link pitch 9.9 (centre-link joints at |y| 26.5, 36.3, 46.2, 56.0; outer-link joints at 23.0, 32.8,
  42.6, 52.5 image scale).
- Stepwise taper: end link 20.0 between the lugs [OFF]; first link 19.2; second link 17.3; then 15.7 for the
  remaining links (clasp-side links 15.7–16.0). Widths exclude rivet heads.
- Outer links have a STEPPED top [OFF "distinct stepped construction"]: a brushed flat from the centre link
  out to 0.9 inside the edge, a 0.35-wide polished step down ≈0.25 [EST depth], then a 0.55-wide rounded
  polished outer rail.
- Side faces: stadium-shaped polished rim around a recessed polished panel, with TWO domed polished
  "rivet heads" per outer link side, one near each end (≈1.5 from the link end), Ø ≈1.4, protruding ≈0.3.
- Thickness ≈3.3 first link → 3.0 near the clasp [EST L].
- End link: solid, fills the 20 mm between the lugs from the case to the lug tips (y 18.6 → 23.4). Its top
  repeats the centre/outer split (centre 8.7, brushed), and it sits just below the lug tops [MEAS plan; EST height].
- Finishes: link tops satin, brushed LENGTHWISE; rails, steps, side rims and rivets polished.
- Clasp: TUDOR "T-fit" folding clasp, cover ≈17.6 wide × 35.9 long × ≈4.2 thick [MEAS ratio vs links M-L].
  Brushed cover with polished bevels; a polished, raised TUDOR SHIELD at the cover's opening end is the
  lift tab. Rapid adjustment slides the last link inside the clasp in 5 positions over 8 mm (2 mm steps)
  [OFF]. A ceramic ball detent locks it (W&W).
- Inner engravings seen on the end link: "72540" (bracelet reference), "RP11" (end-link code) [REV photo].
- Link count depends on wrist size. For a ≈175 mm wrist use 5 links per side + end links + clasp [EST].

======================================================================
6. COLOURS AND MATERIALS (sRGB)
======================================================================
| Material | Sampled | Render suggestion |
|---|---|---|
| Opaline dial | press #ECECEC; macro #B4BABB–#C4C8C9 | base #E8E9E8, metalness 0.1, roughness 0.55, grain |
| Lume, day (markers and hands) | press #E8E8E8; macro #D8DEDE | #ECEDEA, roughness 0.6, slightly domed |
| Lume glow | Ethos lume shot #01C27E / #029659 | emissive #00C27E |
| Marker rims, hands, hub | #000000–#2C2C2C | #141516, matte (roughness 0.7), fine texture |
| Dial print | #1D1D1D (core #070707) | #111111 |
| GMT hand yellow | press #E2AC00; macro #CFA200 | #DDA800, semi-gloss |
| Date disc / numerals | white / black | #F0F0EE / #111111 |
| Flange | press #C3C3C3 | #BDBFC1, satin |
| Steel | bezel (brushed) #9D9D9D in the press light | base #C4C6C8, metalness 1; polished roughness 0.08; satin 0.32, anisotropic (radial on the bezel, lengthwise on lugs and bracelet) |
| Bezel engraving fill | ≈#0E0E0E | #0E0E0E, matte |
| Crystal | — | sapphire, IOR 1.77, transmission 1, faint blue AR tint |

======================================================================
7. UNCERTAINTIES / OPEN ITEMS
======================================================================
1. Vertical profile: no 0°-elevation photo exists in the sources. Layer heights come from four side photos
   (≈5–25° elevation) normalised to the official 14.6. Expect ±0.4 per layer, ±0.6 on the crystal dome.
2. Lug-to-lug 47.2 is a reviewer measurement (Tudor publishes none). Lug side curve and end-face height are EST.
3. Case-back Ø 32.4 ±1 (oblique photos); engraved-ring radii ±0.5; knurl tooth count ≈120 (L).
4. Crown flute count ≈20 (18–20); crown axis height EST (6.45). Align it with the movement's stem height.
5. Dial dome sagitta, marker height, hand heights and thicknesses are EST; plan dimensions are H (±1.5 %).
6. Bracelet: widths M; thickness, step depth and rivet size EST; clasp internals (T-fit rails) not modelled
   from data.
7. Hand stacking order (hour < GMT < minute < seconds) is read from a macro photo (M); confirm with the
   movement's wheel stack.
8. The scale assumes the bezel outer edge = 39.0. The lug inner faces then read 19.7 (official 20), so all
   plan values could be ≈1 % small. This is within the stated uncertainty.

======================================================================
8. SPEC DATA (JS-ready; same conventions as src/spec.js)
======================================================================
```js
// ===== Tudor Black Bay Pro M79470-0004 — EXTERIOR (research/tudor-m79470/exterior.md) =====
// Units mm. Dial-side frame: +Z out of the dial, 12 o'clock = +Y, 3 o'clock (crown) = +X.
// Heights are written as Z_case (0 = lowest point of the case back, 14.60 = crystal apex) and converted
// to the movement frame (z = 0 at the dial-side face of the main plate) with zc().
const DEG = Math.PI / 180;
const Z_MAINPLATE_DIALFACE = 9.10; // ESTIMATE (movement 7.52 tall sitting ≈1.6 above the back) — override from the movement report
const zc = (Z) => +(Z - Z_MAINPLATE_DIALFACE).toFixed(3);
const polar = (r, degCW) => [r * Math.sin(degCW * DEG), r * Math.cos(degCW * DEG)]; // angle clockwise from 12
const mirrorX = (pts) => pts.map(([x, y]) => [-x, y]);

export const EXTERIOR = {
  name: 'Black Bay Pro', reference: 'M79470-0004', dialName: 'Opaline (white), domed', braceletName: 'riveted steel, T-fit clasp',
  defaultTime: { local: '10:10:38', gmt24: '07:11' }, // pose of the official photo

  case: {
    radius: 19.5, height: 14.6, lugToLug: 47.2, lugWidth: 20.0, waterResistanceM: 200,
    // radial section (r, z) of the outside surface, bottom → top (case back included); rotate about Z
    profile: [
      [0, zc(0.00)], [11.0, zc(0.30)], [15.6, zc(0.55)], [16.2, zc(0.90)], [16.2, zc(2.60)], // case back
      [16.4, zc(2.70)], [19.0, zc(2.70)], [19.5, zc(3.20)],                                  // back face + bottom chamfer
      [19.5, zc(9.70)], [18.95, zc(10.30)],                                                  // polished flank + top bevel
    ],
    caseTopZ: zc(10.30), backFaceZ: zc(2.70),
    middle: { flankZ: [zc(3.20), zc(9.70)], bevel: { width: 0.55, angleDeg: 45 }, finish: 'polished' },
    // lugs — plan outline of the upper-right lug (outer edge → tip → inner face); mirror for the others
    lug: {
      xInner: 10.0,
      planOuter: [[16.35, 10.62], [15.0, 15.1], [13.95, 18.2], [13.1, 20.3], [12.4, 21.9], [11.95, 23.25], [11.6, 23.6], [10.0, 23.6]],
      tipCornerRadius: 0.8,
      // side profile in the (y, z) plane for the 12 o'clock lugs (mirror y for 6 o'clock)
      profile: [[15.0, zc(10.30)], [18.0, zc(10.15)], [20.0, zc(9.75)], [21.5, zc(9.20)], [22.8, zc(8.40)], [23.6, zc(7.60)],
                [23.6, zc(3.60)], [21.5, zc(3.05)], [19.5, zc(2.75)], [16.4, zc(2.70)]],
      topFinish: 'satin, brushed along the lug', outerBevel: { planWidth: 0.45, finish: 'polished' },
      springBar: { y: 21.7, z: zc(5.4), radius: 0.9 },
      engraving: { ref: '79470', serial: '5K98671', capHeight: 0.8, where: 'case back face next to each lug pair' },
    },
    colour: '#C4C6C8',
  },

  bezel: {
    fixed: true, outerRadius: 19.5, topOuterEdge: 19.25, topInner: 16.05, seatRadius: 15.95,
    z: [zc(10.30), zc(12.40)],
    profile: [[19.5, zc(10.30)], [19.5, zc(12.10)], [19.25, zc(12.40)], [16.05, zc(12.40)], [15.95, zc(12.20)]],
    finish: { top: 'satin radial', side: 'polished', innerChamfer: 'polished' },
    engraving: {
      fill: '#0E0E0E', depth: 0.10, stroke: 0.24,
      bars: { anglesDeg: [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345], r: [16.55, 18.92], width: 0.28 },
      numerals: {
        r: [16.56, 18.90], capHeight: 2.34, font: 'condensed squarish DIN/Eurostile-like monoline',
        // tops: 'out' = glyph top points away from the centre; 'in' = toward the centre (reads upright from 6)
        items: [
          { text: '24', deg: 0, tops: 'out' }, { text: '2', deg: 30, tops: 'out' }, { text: '4', deg: 60, tops: 'out' },
          { text: '6', deg: 90, tops: 'out' }, { text: '8', deg: 120, tops: 'in' }, { text: '10', deg: 150, tops: 'in' },
          { text: '12', deg: 180, tops: 'in' }, { text: '14', deg: 210, tops: 'in' }, { text: '16', deg: 240, tops: 'in' },
          { text: '18', deg: 270, tops: 'out' }, { text: '20', deg: 300, tops: 'out' }, { text: '22', deg: 330, tops: 'out' },
        ],
        digitWidth: { '0': 1.24, '1': 0.53, '2': 1.22, '4': 1.45, '6': 1.22, '8': 1.22 }, digitGap: 0.35,
      },
    },
  },

  crown: {
    side: '+X', axisZ: zc(6.45), from: 19.5, to: 22.5,
    neck: { radius: 3.0, x: [19.5, 20.0], colour: '#2A2B2C' },     // dark seal ring, no visible tube
    flutes: { count: 20, radius: 3.7, rootRadius: 3.25, x: [20.0, 21.7], finish: 'satin' },
    endBevel: { x: [21.7, 22.4], toRadius: 2.9 },
    face: { x: 22.4, radius: 2.9, finish: 'polished', rose: { radius: 2.2, relief: 0.12, petals: 5 } },
    screwDown: true,
  },

  crystal: {
    material: 'sapphire', ior: 1.77, antiReflective: true, radius: 15.95,
    outer: [[15.95, zc(12.20)], [15.95, zc(13.05)], [15.75, zc(13.45)], [15.30, zc(13.70)], [13.5, zc(14.00)],
            [10.0, zc(14.30)], [5.0, zc(14.52)], [0, zc(14.60)]],
    inner: [[15.30, zc(11.65)], [12.0, zc(11.85)], [6.0, zc(12.00)], [0, zc(12.05)]],
  },

  flange: { rInner: 14.30, rOuter: 15.95, z: [zc(9.78), zc(11.60)], colour: '#BDBFC1', finish: 'satin', print: null },

  caseback: {
    screwDown: true, solid: true,
    knurl: { radius: 16.2, z: [zc(0.90), zc(2.60)], teeth: 120, depth: 0.15 },
    flatRing: { r: [11.0, 15.6], z: [zc(0.30), zc(0.55)] },
    centreDisc: { radius: 11.0, domeSagitta: 0.30, finish: 'straight-brushed' },
    engravedCircle: { radius: 11.05, width: 0.10 },
    text: {
      string: 'TUDOR GENEVE \u26C9 CALIBRE MANUFACTURE \u26C9 TUDOR GENEVE \u26C9 CALIBRE MANUFACTURE \u26C9',
      r: [11.4, 12.9], capHeight: 1.5, font: 'Roman serif capitals', tops: 'out',
      direction: 'clockwise as seen from the back', startDegBackView: 0, // 'TUDOR GENEVE' centred at 12 (back view)
    },
  },

  dial: {
    visibleRadius: 14.28, radius: 14.6, thickness: 0.40,
    topZEdge: zc(9.75), domeSagitta: 0.30, // top surface z(r) = topZEdge + domeSagitta·(1 − (r/14.3)²)
    colour: '#E8E9E8', print: '#111111', finish: 'opaline (fine grain, faint metallic)',
    markers: {
      height: 0.55, rim: '#141516', lume: '#ECEDEA', glow: '#00C27E',
      circles: { anglesDeg: [30, 60, 120, 150, 210, 240, 300, 330], r: 10.90, outerRadius: 1.025, lumeRadius: 0.84 },
      bars: { anglesDeg: [180, 270], r: [9.40, 13.10], width: 1.28, cornerRadius: 0.18, rim: 0.19 },
      triangle: { verts: [[-1.44, 13.10], [1.44, 13.10], [0, 9.44]], apexFillet: 0.24, topFillet: 0.15, rim: 0.19 },
    },
    minuteTrack: {
      circle: { r: 13.62, width: 0.12 },
      minor: { r: [12.59, 13.62], width: 0.11 },
      major: { r: [12.58, 13.62], width: 0.50 },
      shortened: { r: [13.28, 13.62], majorDeg: [0, 90, 180, 270], minorDeg: [6, 354, 84, 96] },
    },
    dateWindow: {
      center: [11.13, -0.02], opening: [2.76, 2.10], cornerRadius: 0.08,
      bevel: { width: 0.40, angleDeg: 45 }, frameOuter: [3.55, 2.90],
      disc: { colour: '#F0F0EE', numeral: '#111111', font: 'grotesque (Helvetica-like)', numeralHeight: 1.64,
              numeralRadius: 11.13, positions: 31, belowDialTop: 0.55 },
    },
    text: [
      { id: 'logo', kind: 'shield', box: [-0.56, 5.95, 0.64, 7.62] },
      { id: 'brand', text: 'TUDOR', box: [-2.72, 4.65, 2.82, 5.67], capHeight: 1.02, font: 'Tudor serif wordmark' },
      { id: 'city', text: 'GENEVE', box: [-1.86, 3.79, 1.94, 4.47], capHeight: 0.68, font: 'condensed grotesque' },
      { id: 'depth', text: '200m:660ft', box: [-2.67, -5.09, 2.51, -4.41], capHeight: 0.68, font: 'bold grotesque, m/ft italic lowercase' },
      { id: 'chrono1', text: 'CHRONOMETER', box: [-3.56, -6.00, 3.55, -5.45], capHeight: 0.55 },
      { id: 'chrono2', text: 'OFFICIALLY CERTIFIED', box: [-4.73, -6.99, 4.75, -6.44], capHeight: 0.55 },
      { id: 'swiss', text: 'SWISS', arc: { r: [13.85, 14.14], degSpan: [180.8, 189.1] }, tops: 'in' },
      { id: 'made', text: 'MADE', arc: { r: [13.85, 14.14], degSpan: [170.4, 178.9] }, tops: 'in' },
    ],
  },

  // Hand outlines in hand-local coordinates (x across, +y toward the tip), arbor at the origin.
  hands: {
    order: ['hour', 'gmt', 'minute', 'seconds'], // dial → up
    hour: {
      tip: 9.16, colour: '#141516', lume: '#ECEDEA', thickness: 0.18, z: zc(10.55), collet: { radius: 1.50, height: 0.25 },
      outline: [[0.565, 1.45], [0.565, 5.58], [1.90, 6.90], [0.565, 8.22], [0.565, 9.16], [-0.565, 9.16], [-0.565, 8.22], [-1.90, 6.90], [-0.565, 5.58], [-0.565, 1.45]],
      lumeOutline: [[0.345, 2.05], [0.345, 5.675], [1.57, 6.90], [0.345, 8.125], [0.345, 8.92], [-0.345, 8.92], [-0.345, 8.125], [-1.57, 6.90], [-0.345, 5.675], [-0.345, 2.05]],
    },
    gmt: {
      tip: 14.12, colour: '#DDA800', lume: '#ECEDEA', thickness: 0.15, z: zc(10.85), collet: { radius: 1.30, height: 0.25 },
      outline: [[0.40, 1.50], [0.265, 7.08], [1.585, 8.40], [0.38, 9.605], [0.125, 14.06], [0.07, 14.12], [-0.07, 14.12], [-0.125, 14.06], [-0.38, 9.605], [-1.585, 8.40], [-0.265, 7.08], [-0.40, 1.50]],
      lumeOutline: [[0, 7.18], [1.22, 8.40], [0, 9.62], [-1.22, 8.40]],
    },
    minute: {
      tip: 13.60, colour: '#141516', lume: '#ECEDEA', thickness: 0.18, z: zc(11.15), collet: { radius: 1.15, height: 0.25 },
      outline: [[0.47, 1.40], [0.47, 12.70], [0, 13.60], [-0.47, 12.70], [-0.47, 1.40]],
      lumeOutline: [[0.215, 2.00], [0.215, 12.60], [0, 13.05], [-0.215, 12.60], [-0.215, 2.00]],
    },
    seconds: {
      tip: 13.50, tail: 4.45, colour: '#141516', lume: '#ECEDEA', thickness: 0.12, z: zc(11.45),
      boss: { radius: 0.95, height: 0.20 }, pin: { radius: 0.11, colour: '#C9CBCD' },
      outline: [[0.16, 0], [0.16, 8.05], [1.03, 8.92], [0.16, 9.79], [0.16, 13.50], [-0.16, 13.50], [-0.16, 9.79], [-1.03, 8.92], [-0.16, 8.05], [-0.16, 0],
                [-0.27, -0.9], [-0.27, -4.45], [0.27, -4.45], [0.27, -0.9]],
      lumeOutline: [[0, 8.19], [0.74, 8.92], [0, 9.65], [-0.74, 8.92]],
    },
    pinTopZ: zc(11.75),
  },

  bracelet: {
    kind: 'riveted three-row, solid links, faux rivet heads', steel: '316L',
    pitch: 9.9, centreLinkWidth: 8.7, outerJointOffset: 3.5,          // centre-link joints lead outer-link joints by 3.5
    widths: { endLink: 20.0, link1: 19.2, link2: 17.3, rest: 15.7 },  // excl. rivet heads
    thickness: { link1: 3.3, rest: 3.0 },
    outerLinkTop: { flatEndsFromEdge: 0.9, stepWidth: 0.35, stepDepth: 0.25, railWidth: 0.55 }, // "stepped construction"
    sideFace: { shape: 'stadium rim around recessed panel', finish: 'polished' },
    rivets: { perOuterLinkSide: 2, fromLinkEnd: 1.5, radius: 0.7, protrusion: 0.3, finish: 'polished dome' },
    endLink: { y: [18.6, 23.4], topZ: [zc(8.3), zc(7.9)], bottomZ: zc(4.4), hugsCaseRadius: 19.5 },
    linksPerSide: 5, // ≈175 mm wrist (EST)
    finish: { tops: 'satin lengthwise', rails: 'polished', steps: 'polished' },
    clasp: { kind: 'TUDOR T-fit folding clasp', width: 17.6, length: 35.9, thickness: 4.2,
             cover: 'satin with polished bevels', shield: 'polished raised Tudor shield lift tab at the open end',
             tfit: { positions: 5, travel: 8.0, step: 2.0 } },
    engravings: { endLink: ['72540', 'RP11'] },
  },

  materials: {
    steel: { colour: '#C4C6C8', metalness: 1, roughnessPolished: 0.08, roughnessSatin: 0.32 },
    dial: { colour: '#E8E9E8', metalness: 0.1, roughness: 0.55 },
    lume: { colour: '#ECEDEA', roughness: 0.6, emissive: '#00C27E' },
    black: { colour: '#141516', roughness: 0.7 },
    print: { colour: '#111111' },
    gmtYellow: { colour: '#DDA800', roughness: 0.35 },
    flange: { colour: '#BDBFC1', metalness: 0.6, roughness: 0.45 },
    sapphire: { ior: 1.77, tint: '#F4F8FF' },
  },
};
```
