# Grand Seiko SBGA211G "Snowflake": exterior brief for a to-scale 3D model (case, bracelet, dial, hands)

Status: exterior half only. The movement is in `research/gs-sbga211/movement.md`, written by another agent; section 9 below lists where the two reports disagree.

Units are mm. In the dial-side frame, +Z points out of the dial toward the viewer, 12 o'clock is +Y and 3 o'clock (the crown) is +X. Angles are measured clockwise from 12 as seen from the dial, unless a line says "back view".

Heights are given in two systems:
- **Z (case-back referenced):** Z = 0 is the outer plane of the case back.
- **z (dial-top referenced):** z = 0 is the top face of the dial. This is the frame used in SPEC DATA.
- Conversion: **z = Z − 8.60**. The 8.60 is an ESTIMATE (±0.4); see section 2.4.

Every number carries a source and a confidence: H (high), M (medium) or L (low). Values that no source gives are marked ESTIMATE, with the reasoning.

Source tags:
- [OFF] Grand Seiko official page or image.
- [BTQ] US Grand Seiko boutique (grandseikoboutique.us).
- [REV] Reputable review: Worn & Wound, Monochrome, Time+Tide, Teddy Baldassarre, WorldTempus, Surface.
- [MEAS] My own pixel measurement.
- [EST] Engineering estimate.

======================================================================
## 0. IDENTITY
======================================================================

| Item | Value | Source / conf. |
|---|---|---|
| Model | **SBGA211** ("G" = export suffix). Heritage Collection, "Automatic Spring Drive 3-Day". Nickname "Snowflake". | [OFF] H. https://www.grand-seiko.com/us-en/collections/SBGA211G |
| Year | **2017.** It replaced the SBGA011 (Japan 2005, international 2010), which had double Seiko / Grand Seiko branding. The SBGA211 is the same watch with "GS / Grand Seiko" only. | [REV] M-H. https://timeandtidewatches.com/grand-seiko-snowflake-in-depth/ ; https://teddybaldassarre.com/blogs/watches/grand-seiko-snowflake ; https://grandseikoboutique.us/products/watch-spring-drive-snowflake-sbga211 |
| Caliber | 9R65: Spring Drive, automatic with hand winding, 30 jewels, about 72 h, ±15 s/month (±1 s/day). | [OFF] H |
| Case and bracelet material | **High-Intensity Titanium.** The Japanese page calls it "ブライトチタン" (Brite Titanium); it is the same Seiko alloy. About 30% lighter than steel. | [OFF] H. JP page: https://www.grand-seiko.com/jp-ja/collections/sbga211 |
| Case size | **Ø 41.0, lug-to-lug 49.0, thickness 12.5.** | [OFF] H |
| Band width | **20 mm** | [OFF] H |
| Crystal | **Dual-curved sapphire, anti-reflective coating on the inner surface** | [OFF] H |
| Case back | **See-through, screw-down.** Titanium and sapphire. | [OFF] H |
| Crown | Screw-down | [OFF] H |
| Water resistance | 10 bar | [OFF] H |
| Magnetic resistance | 4,800 A/m | [OFF] H |
| Weight | 100 g | [OFF] H |
| Clasp | Three-fold with push-button release ("ワンプッシュ三つ折れ方式") | [OFF] H |
| Band perimeter | 193 mm (US page); 195 mm max (JP page) | [OFF] H |
| Price | US$6,900 (US page, 2026); ¥902,000 (JP) | [OFF] H |
| Dial | "Snowflake" (雪白) pattern. A **brass blank stamped with a hand-carved die (200 t)**, then **silver-plated**, with no white paint. Over 80 production steps. Developed in 2004 for the first 9R watch. | [OFF] https://www.grand-seiko.com/uk-en/special/dream9stories/vol8/1 H; [REV] https://en.worldtempus.com/article/watches/trends-and-style/grand-seiko-how-grand-seiko-perfected-the-snowflake-28206.html M |

Conflicts:
- Time+Tide's 2017 short review says "several lacquer layers" and Monochrome says "slightly translucent coating layers". The GS official page says silver plating. Use silver plating [OFF].
- One Teddy Baldassarre paragraph gives 12.8 mm thick and "40% lighter". The official figures (12.5 mm, 30%) win.

======================================================================
## 1. HOW THE NUMBERS WERE MEASURED
======================================================================

**Dial-plane rectification.** The 60-position minute track gives about 45–48 clean ticks per image.
1. Fit a conic to the tick ends, find each tick's index, then fit a full homography from (r, θ) to pixels. Residual is 0.3–1.2 px.
2. Re-sample every front image into a 12-up mm frame (H_*.png in the py folder).
3. Scale check: the case silhouette in the rectified loupe photo measures r = 20.45, against 20.50 official. The official render gives 20.38. This sets the minute-track outer edge at r = 14.96 and all dial radii were multiplied by 1.004 (±0.3%).

**Side profile.** Taken from a near-perfect side photo (ltF_7, Loupe This auction) with these parameters:
- Scale 56.8 px/mm, ±2%.
- Camera elevation α = 4.2° above the dial plane. This comes from the crystal's visible top-face ellipse: 2·r·sinα = 141 px, half-length 970 px.
- Projection model: a near-side point at radius R and height Z appears at up = Z·cosα − R·sinα.
- Z = 0 (case-back plane, on the axis) falls at x ≈ 2166 px.
- Cross-check: the measured top silhouette implies a crystal rim at Z = 12.33, so the official 12.5 total leaves a 0.17 mm dome. This is consistent.

**Raised features in the tilted front shots.** Ring-centre parallax (circle-centre offset ÷ tan tilt) places the bezel seam about 1.0–1.5 mm above the apparent dial plane. Adding the crystal's refraction lift (≈0.6 mm) puts it **≈1.7–2.1 mm above the dial**. This anchors the dial at Z ≈ 8.6.

**Images.** All downloads are listed in section 8 with px/mm and centre pixel. Scripts are in `scratchpad/py-gs/`.

======================================================================
## 2. CASE
======================================================================

### 2.1 Construction and finishing map

**Construction:** a separate polished bezel ring on a middle case with integral lugs, plus a screw-down display case back. A hairline seam groove separates the bezel and the middle case at r ≈ 19.05 [MEAS M].

**Finishing (ltF_9, s9_flank crop, W&W, Monochrome, official 3/4 render):**

| Surface | Finish | Notes |
|---|---|---|
| Bezel (sloped, convex ring, r 16.8 → 19.0) | **Mirror, Zaratsu** | [REV] H (Monochrome, Surface). [OFF image] |
| Lug tops: broad sloped band from the bezel seam out along each lug | **Hairline brushed**, grain parallel to 12–6 | W&W: "Wide bands of brushing … vertical grain". [REV/MEAS] H |
| **Zaratsu bevel**: chamfer between the brushed lug top and the flank | **Mirror** | About 1.0–1.4 wide along the lug. It narrows to nothing at about 2:30 / 3:30 / 8:30 / 9:30, where it runs into the seam under the bezel. W&W: "The brushing terminates in a perfectly sharp line, leading to a Zaratsu polished bevel". [REV H / MEAS M] |
| Flank (case side between the lugs + the lugs' outer faces), tapering toward the back | **Mirror polished** | W&W: "the case tapers in towards the back starting at the edge of the bevel. This surface is also fully polished". The ltF_9 close-up confirms it. The drilled lug holes pierce this face. [REV/MEAS] H |
| Upper shoulder at 3 and 9 (seam → widest edge) | Mirror polished | It continues the polished flank where the brushed band has ended. [MEAS M] |
| Case back | Polished ring, engraved band, polished serrated ring round the window | [MEAS M] |

Official text: "a tapered silhouette that narrows toward the back" [OFF].

### 2.2 Plan (front) view radii [MEAS, ×1.004 scale]

| Ring | r | Conf. |
|---|---|---|
| Visible dial edge | **15.70** | H |
| Rehaut (inner flange), sloped, plain grey | 15.70 → 16.45 | M |
| Crystal edge / bezel inner lip (visible opening Ø 33.6) | **16.80** | M |
| Bezel top, polished, convex, falling outward | 16.80 → 19.00 | M |
| Bezel / middle-case seam (thin dark line) | **19.05** | H (two images agree within 0.05) |
| Shoulder | 19.10 → 20.50 | M |
| Widest edge (case Ø 41.0) | **20.50** | H [OFF] |

### 2.3 Side profile: revolved section at 3/9 o'clock, outer surface

Measured on ltF_7 at Y ≈ 0 with the near-side model above.

| Point | r | Z (case back = 0) | z (dial = 0) | Note |
|---|---|---|---|---|
| Crystal apex | 0 | **12.50** | +3.90 | [OFF] total height |
| Crystal top at rim | 17.08 | 12.33 | +3.73 | [MEAS M] |
| Bezel inner lip | 16.80 | 12.30 | +3.70 | flush with the crystal rim [MEAS M] |
| Bezel top | 17.20 / 17.70 / 18.20 / 18.60 | 12.22 / 11.95 / 11.50 / 11.00 | +3.62 / +3.35 / +2.90 / +2.40 | convex slope, ~42° average [MEAS M / shape EST] |
| Bezel outer edge | 19.00 | 10.42 | +1.82 | [MEAS M] |
| Seam groove | 19.05 | 10.32 | +1.72 | about 0.08 wide, 0.1 deep [MEAS M] |
| Shoulder (polished at 3/9) | 19.10 → 20.50 | 10.30 → 8.48 | +1.70 → −0.12 | steep ~52°, flat [MEAS M] |
| **Widest edge** (sharp) | **20.50** | **8.48** | **−0.12** | almost exactly at dial height [MEAS M] |
| Flank (polished, convex, tapering) | 20.48 / 20.40 / 20.25 / 20.05 / 19.85 | 7.80 / 7.00 / 6.00 / 5.00 / 4.00 | −0.80 / −1.60 / −2.60 / −3.60 / −4.60 | [MEAS M] |
| Flank lower edge | 19.60 | 2.85 | −5.75 | [MEAS M] |
| Lower bevel | 19.10 | 2.30 | −6.30 | [MEAS L-M] |
| Case / case-back seam | 18.65 | 1.80 | −6.80 | dark line [MEAS M] |
| Case back flank | 18.55 / 18.40 | 1.30 / 0.70 | −7.30 / −7.90 | [MEAS M] |
| Case-back bottom edge | 18.00 | 0.00 | −8.60 | [MEAS M] |

The flank radii are tied to the back-view radial edges (r 19.5–19.8 for the lower edge, 18.5–18.8 for the case-back junction, 18.0 for the bottom face) [MEAS M].

**Layer heights** (12.50 total) [MEAS M]:
- Crystal dome above the bezel: about 0.2.
- Bezel: 1.9 (Z 10.4 → 12.3).
- Middle case: 8.5 (Z 1.8 → 10.3).
- Case back: 1.8 (Z 0 → 1.8).

### 2.4 Where the dial sits (z frame anchor)

- **Dial top at Z ≈ 8.60** (ESTIMATE, M-L, ±0.4).
  - Evidence 1: the bezel seam (Z 10.32) sits 1.7–2.1 above the dial by the parallax measurement in section 1.
  - Evidence 2: the stack is consistent with movement.md, which gives a 5.80-thick 9R65 with the dial seat at +0.75 above the plate.
  - With a 0.45-thick dial: plate dial face at Z 7.40, rotor top at Z 2.35, case-back glass top at about Z 2.1. The clearance works.
- Conversion to the movement frame: **z_mov = z + 1.20**, so the case-back plane is at z_mov = −7.40.

### 2.5 Crystal

- Dual-curved sapphire, AR on the inner surface [OFF H].
- **Outer radius 17.1.** The bezel lip covers it to r 16.80, the visible edge [MEAS M].
- Top at the rim Z 12.33; apex Z 12.50; dome sag ≈ 0.17–0.3. ESTIMATE: spherical top radius ≈ 600 (range 300–900).
- Thickness ≈ 1.5 [EST]. The underside follows the top ("dual-curved"). Underside at the centre z = +2.40, at the rim z = +2.23.
- Rendering: index of refraction 1.77; faint blue-violet reflection at grazing angles (the inner AR coating) [EST].

### 2.6 Crown

| Feature | Value | Source / conf. |
|---|---|---|
| Type | Screw-down. "A 6mm crown sits slightly nestled in the side at three." | [OFF] H; W&W [REV] H |
| Diameter at the flute tips | **5.9** (front render 5.8; back view 5.7; W&W "6 mm") | [MEAS M] |
| Flutes | ≈ 24 deep triangular flutes, polished, about 0.25 deep | [MEAS L-M] (valley spacing 14.7–15.4° on the end view) |
| Tip position | X = **23.2** (2.7 proud of the case's widest point) | [MEAS M]; front render 22.8, back view 23.5 |
| Recess in the flank | The crown sits in a shallow counterbore, Ø ≈ 6.8, ≈ 0.6 deep | [EST from the shadow ring in the side photos] |
| Body length (recess floor → tip) | ≈ 3.4 | [EST] |
| Axis | Y = 0; **Z = 6.5 (z = −2.10)** | [MEAS M] |
| End face | Polished outer chamfer ring (r 2.45 → 2.95), a slightly recessed matte field r < 2.35, and **raised polished "GS"** monogram about 2.4 high × 2.6 wide, reading upright when the crown is seen with 12 up. The field is grey/matte, the letters mirror-bright. | [OFF image] H; dims [MEAS L-M] |

### 2.7 Lugs (Grand Seiko style: long, steeply curved down, drilled)

**Plan view** [MEAS M; loupe front silhouette, symmetrised top/bottom]:
- Inner face X = ±10.0 (20 mm band).
- Lug tips at Y = ±24.5 (49.0 lug-to-lug [OFF]).
- Outer edge, (X, Y), for the +X +Y lug: (19.05, 7.6) → (18.0, 10.2) → (17.0, 12.7) → (16.0, 15.1) → (15.0, 17.5) → (14.5, 18.9) → (14.0, 20.1) → (13.5, 21.5) → (13.0, 22.5) → (12.6, 23.3) → (11.8, 24.1) → (11.0, 24.45) → (10.0, 24.5).
  - The edge leaves the case circle at about Y 8. It then runs nearly straight, about 22° off the 12–6 axis, and ends in a rounded outer tip corner (r ≈ 1).
- The lug is about 2.6 wide (X 10.0 → 12.6) at the tip and about 5 wide at Y = 17.5.

**Side profile, (Y, z)** at mid-lug width [MEAS L-M from ltF_7, ltF_9, and the ltF_7 lug crop; ±0.8]:
- **Top (brushed lug top, outer edge):** (16.0, +1.70) → (18.0, +0.80) → (20.0, −0.70) → (22.0, −2.60) → (23.5, −4.00) → (24.2, −4.80) → (24.5, −5.60). The top corner is rounded, r ≈ 0.6.
- **Tip face:** Y = 24.5, from z −5.60 down to −8.90. About 3.3 tall, nearly vertical.
- **Underside:** (24.5, −8.90) → (23.0, −8.40) → (21.0, −7.80) → (19.0, −7.20) → (17.0, −6.80), where it meets the case-back taper.
  - The lug tips drop ≈ 0.3 below the case-back plane [MEAS L-M].
- **Zaratsu bevel** on the outer top edge: about 1.0–1.4 wide (slant) along the lug, so its lower edge sits ≈ 1.0–1.2 below the top line. It narrows to zero toward 3/9 [MEAS L-M].
- **Spring-bar holes:** drilled through the lug from the outside. Axis at Y = ±22.9, z = **−7.20**; hole Ø ≈ 1.0 with a small chamfer [MEAS M]. They are visible on the polished outer face, ~1.6 from the tip. W&W notes them "close to the edge of the bevel".

======================================================================
## 3. CASE BACK
======================================================================

Back-view measurements are at 60.95 px/mm. Back-view angles are clockwise from 12 as seen from the back (12 up, crown on the LEFT). Convert to the dial frame with **θ_dial = 360° − θ_back** and X_dial = −x_back.

| Feature | Value | Conf. |
|---|---|---|
| Type | Screw-down see-through, titanium + sapphire | [OFF] H |
| Outer radius at the seam | 18.6 (z −6.80); chamfered to r 18.0 at the bottom plane (z −8.60) | [MEAS M] |
| Six wrench notches | At θ_back ≈ 17°, 77°, 137°, 197°, 257°, 317°, so **θ_dial ≈ 343°, 283°, 223°, 163°, 103°, 43°**. Each about 2.1 wide (tangential), cut from r ≈ 16.95 out to the edge, ≈ 0.5 deep. | [MEAS M] |
| Engraved text band (flat) | r **15.7 → 17.4**. Dark-grey engraved capitals, plain sans, cap ≈ 0.85, letter tops pointing OUTWARD, reading clockwise in the back view. | [MEAS H text / M position] |
| Text item: "WATER RESIST.10BAR" | θ_back 265→318 (θ_dial 95→42) | |
| Text item: "9R65-0AE0" (case code) | θ_back 232→255 (θ_dial 128→105) | |
| Text item: boxed mark + a "U"-like glyph | θ_back 210–225 (θ_dial 150–135) | |
| Text item: 6-character serial | θ_back 163→180 (θ_dial 197→180). Unique per watch. | |
| Text item: "MADE IN JAPAN" | θ_back 100→127 (θ_dial 260→233) | |
| Text item: "TITANIUM" | θ_back 43→62 (θ_dial 317→298) | |
| Decorative serrated ring round the window | r **14.6 → 15.5**. ≈ **78** square teeth, alternating raised (polished) and sunk (dark), ~2.3° on / 2.3° off. | [MEAS M; count ±4] |
| Window step / bevel | Polished stepped bevel r 12.9 → 14.6 | [MEAS M] |
| **Sapphire clear aperture** | **r ≈ 12.9 (Ø 25.8)** | [MEAS M] |
| Window glass | ≈ 1.0 thick, its outer face ≈ 0.3 below the back plane | [EST] |

======================================================================
## 4. BRACELET AND CLASP
======================================================================

| Feature | Value | Source / conf. |
|---|---|---|
| Material / finish | High-Intensity Titanium | [OFF] H |
| Width | **20.0 at the lugs**, tapering to ≈ **16** at the clasp. The official render measures 19.85 → 18.6 → 18.0 over the first three links. | [MEAS M]; clasp width [EST L] |
| Link layout | **Five pieces across:** three brushed links alternating with two thin polished links (W&W). At the end link: outer links \|X\| 5.2 → 10.0 (brushed), polished intermediates \|X\| 4.2 → 5.2, centre link \|X\| < 4.2 (brushed). Scale these with the taper. | [REV] H; widths [MEAS M] |
| Edges | Polished bevels along the outer edges (W&W); brushing matches the lugs | [REV] H |
| Link pitch | ≈ **6.8** | [MEAS M-L]; official render 6.9 near the case, clasp photo 6.6–6.9 |
| Thickness | ≈ 3.4 | [EST from the side view after removing perspective] |
| End link | Solid, fills X ±10 between the lugs from the case (Y ≈ 17.6) to past the lug tips; same five-row look | [MEAS/EST M] |
| Pins | Pins, not screws; no micro-adjust | [REV] H (Monochrome; W&W) |
| Clasp | Three-fold, push-button release, two side pushers | [OFF] H |
| Clasp cover | Brushed. **Raised polished "GS"** monogram inside a recessed rounded-rectangle panel about 48% of the clasp width, centred. Cover about 18 long. | [MEAS L-M] |
| Clasp blade engraving | "SEIKO / TITANIUM-TITANIUM ALLOY / JAPAN-B" | [MEAS H, ltF_13] |
| Perimeter | 193 (US) / 195 max (JP) | [OFF] H |

======================================================================
## 5. DIAL
======================================================================

All positions are from the dial centre (the hand axis), in mm, after the ×1.004 scale correction.

### 5.1 Base and the snowflake texture

| Feature | Value | Conf. |
|---|---|---|
| Material | Brass blank, die-stamped relief, **silver-plated** (no paint). The white comes from diffuse reflection off the micro-relief. | [OFF] H |
| Visible radius | **15.70**. Physical disc ≈ 15.9 under the rehaut. | visible [MEAS H]; physical [EST] |
| Thickness | ≈ 0.45 | [EST] |

**Texture, for procedural generation** [MEAS M]:
- It reads as freshly fallen, wind-swept snow: a field of **elongated, wavy, overlapping drift ridges**.
  - **Ridges run mostly along 12–6 (the Y axis).** 87–95% of the 1–10 cycles/mm power varies along X in the textured patches.
  - Local direction wanders ±20–30°, and ridges braid and split.
- **Three scales:**
  - (a) Broad soft drifts, wavelength ≈ 1.7–3.3 along X, ridge lengths 2–6 along Y. These carry most of the power where the render lights the relief obliquely.
  - (b) Distinct ridge crests and small scoop-shaped pits, spacing ≈ 0.4–0.8 across, 1–2 long. The pits are crescent-shaped depressions like footprints in snow, most visible in the official close-up.
  - (c) Very fine grain, 0.05–0.15 mm, isotropic. This dominates in flat light: autocorrelation half-length 0.03–0.05.
- **Relief:** ESTIMATE ≈ 20–40 µm peak-to-valley.
- **Brightness variation:**
  - Flat light: ±2.5% (loupe photo, L std 4.5 at mean 190–217).
  - Official render: ±4% in quiet areas, rising to ±20% where it rakes the light.
- **Sheen:** soft, silvery, not mirror. The ridges catch light and give a faint sparkle.
- **Suggested recipe** (sample in mm):
  1. h = 0.55·fbm(warp(p)·(1/0.9, 1/3.0)) + 0.30·ridged(warp(p)·(1/0.35, 1/1.2)) + 0.15·grain(p/0.06).
  2. Domain warp: p + 0.4·(noise(p/1.5), noise(p/1.5 + 7)).
  3. Normal-map strength chosen so that flat light gives ±3% and grazing light ±15%.
  4. Material: metalness ≈ 0.4, roughness ≈ 0.42, baseColor #E8E9EA.
- The **power-reserve fan and the date frame interrupt the texture**. The texture runs right up to the rehaut.

### 5.2 Applied hour markers (11; none at 3, where the date sits) [MEAS M; loupe macros ltF_12/ltF_1 + official render]

| Marker | Radial span | Width | Shape |
|---|---|---|---|
| **12** | r **10.45 → 14.95** | inner **1.45** → outer **2.20** | Wedge, wider outward. Flat top facet 0.87 → 1.55 wide (r 10.75 → 14.75) with four bevels: long side bevels ≈ 0.30 wide (plan), short end bevels ≈ 0.2. |
| **6 and 9** | r **10.35 → 14.90** | inner **0.95** → outer **1.80** | Wedge, same facet scheme |
| **1, 2, 4, 5, 7, 8, 10, 11** | r **10.45 → 14.95** | **1.00**, parallel sides | Bar with a flat top facet ≈ 0.36 and side bevels ≈ 0.32 each; small end bevels |

All markers:
- Finish: mirror polished (W&W: "Zaratsu polished markers"; "can look almost like glass"). Silver.
- Height ≈ 0.35 [EST]; facets at about 30–40° [EST].
- The outer ends reach the minute track's outer edge (14.95), so no minute ticks are printed at those 11 positions.
- Long axes are radial.

### 5.3 Minute track (printed black) [MEAS H]

- **48 regular ticks**, one at every minute position except the 12 hour positions: r **14.43 → 14.96** (0.53 long), width **0.23**.
- **3 o'clock** (no marker because of the date): one enlarged tick, r **14.41 → 15.16**, width **0.45**.
- There is no ring line and there are no numerals.

### 5.4 Logo and printing

| Element | Geometry | Finish / colour | Conf. |
|---|---|---|---|
| **"GS" monogram** (Grand Seiko blackletter "GS") | Centre **(0.05, 8.08)**; bbox **2.9 wide × 2.1 high** (Y 7.0 → 9.1) | **Applied**, mirror-polished, faceted; ≈ 0.3 high [EST] | [REV] H applied (W&W, Monochrome, Teddy); [MEAS M] |
| **"Grand Seiko"** wordmark | Blackletter ("grand Black Letter type", W&W). Baseline **Y 5.42**; capitals G/S and ascenders to **Y 6.63** (cap ≈ 1.21); x-height ≈ 0.70; spans **X −4.15 → +4.42** (8.57 wide; optical centre X +0.13). Printed. | Black #151515 | [MEAS H] |
| **"SPRING DRIVE"** | Plain sans capitals, wide tracking, light-medium weight. Baseline **Y −8.49**, cap **0.63**, spans **X −2.77 → +2.78** (5.55). Printed. | **Navy blue** (render ink #20215D; recommended #1E2560) | [MEAS H] |
| **"JAPAN 9R65-0BL0 T 2"** | Tiny upright sans capitals on an arc at **r 15.15 → 15.52** (cap ≈ 0.37), letter tops toward the centre. "JAPAN" spans θ 194°→184.5°; "9R65-0BL0" is centred under the 6 marker (θ ≈ 184°→171°); "T" at θ ≈ 169.3°; "2" at θ ≈ 166.6°. | Black | [MEAS H text (ltF_12 macro); M position] |
| **Rehaut** | Plain sloped ring, r 15.70 → 16.45, rising from the dial edge to the crystal underside (z 0 → +2.2, steep ≈ 70°). No print. | Light grey, matte (looks #95–#A0 in photos because of shadow) | [MEAS M / EST] |

### 5.5 Power-reserve indicator ("sea-shell" fan between 7 and 8) [MEAS M; official render pr_view + 3 photos]

| Feature | Value |
|---|---|
| **Pivot** | (**−3.17, −5.80**) ±0.10. That is r 6.61 at θ 208.7°. Official render (−3.13, −5.92); loupe photos (−3.17, −5.73) and (−3.18, −5.69). |
| Recess | A fan-shaped depression ≈ 0.15 deep [EST]. Outline relative to the pivot: an arc of radius **4.95** from (+0.53, +4.92), sweeping counter-clockwise on the dial through (−3.5, +3.5), to (−4.88, −0.84). Then a straight bottom edge at dy = **−0.84** back toward the pivot, a rounded corner (R ≈ 0.6) round the hub, and a straight vertical edge at dx = **+0.53** up to the start. |
| Outer ribbed band | r **3.40 → 4.95** from the pivot. **19 radial ribs every 5°** at hand angles 265°…355° about the pivot. Alternating bright/dark fan ribs, 2.5° each. |
| Inner field | r < 3.40. Fine **concentric grooves** round the pivot, pitch ≈ 0.13 (circular-graining look). |
| End marks | A small bar at each end of the scale, at 0° (12 side) and about 263° (9 side): r 3.65 → 4.60 from the pivot, 0.43 wide, rounded, dark grey (#77797B). |
| Hand | Polished silver, faceted slim spear. Tip **4.65** from the pivot; width 0.34 at the hub → 0.15 → pointed; no tail. Hub disc Ø ≈ 1.2 (render 0.9, photo 1.4), domed and polished. |
| **Hand angle** (clockwise from 12 about the pivot) | **FULL ≈ 263°** (pointing toward 9, just below horizontal). **EMPTY = 360°/0°** (pointing to 12). Sweep ≈ **97°** for 72 h (≈1.35°/h). As the reserve falls, the hand turns clockwise as seen from the dial. |

Evidence for the hand direction:
- W&W: "When full, the pointy polished hand points towards nine, when empty, up towards twelve" [REV H].
- The W&W photo and the official render both show the hand toward 9.
- The Monochrome and Loupe photos show it at 12 (watches presumably run down).
- See section 9: movement.md has this reversed.

### 5.6 Date window (3 o'clock) [MEAS M; official render + loupe macro]

| Feature | Value |
|---|---|
| Frame | **Applied polished frame** (W&W: "square polished frame"; Teddy: "finely faceted frame"). Outer rectangle **X 9.80 → 14.15, Y −1.70 → +1.65** (4.35 × 3.35, centre (11.97, −0.02)). Top flat band ≈ 0.25, then an inner polished bevel (≈ 45°) down to the aperture. Height ≈ 0.25 above the dial [EST]. Square corners. |
| Aperture in the dial | ≈ **3.40 × 2.40**, centred at (11.97, −0.02). Loupe 3.31 × 2.25; render 3.87 × 2.71 at the bevel's top edge. |
| Date disc | White disc (#E6E7E8), **black digits** (#121212), plain grotesque. Digit height ≈ **1.55** (1.45–1.70); single digit ≈ 1.25 wide; two-digit group ≈ 2.7 wide; stroke ≈ 0.22. Upright in the window. Numeral centre at **r ≈ 12.0**. Disc surface ≈ 0.5 below the dial top [EST]. |

======================================================================
## 6. HANDS [MEAS M; official render at 40 px/mm, cross-checked on the loupe photos]
======================================================================

| Hand | Tip r | Tail r | Width | Shape / finish |
|---|---|---|---|---|
| **Hour** | **10.2** (just reaches the markers' inner ends at 10.4) | **3.0** | max ≈ **1.65** at r ≈ 1.8 | Dauphine/razor: two-facet roof ridge along the centre line, plus "razor-sharp bevels" on the edges (W&W). Blade tapers straight to a sharp point; short tail tapers to a point. Mirror polished silver. |
| **Minute** | **14.1** (±0.2; render 14.3, loupe 13.9) | **3.3** | max ≈ **1.45** at r ≈ 2.2; 1.14 at r 3.5; 0.38 at r 10; 0.10 at r 14 | Same style as the hour hand |
| **Seconds** (gliding) | **14.5** | **5.2** | Front blade 0.30 (r 1) → 0.24 (r 5) → 0.18 (r 9) → 0.10 at the tip. Counterweight tail 0.50 at the hub → 0.72 at its square end. | **Heat-blued steel**, flat needle. W&W: "an ever-so-slightly tapering stick with a wider counter-weight". Hub: blue disc Ø 1.1 with a polished silver centre cap Ø 0.55. |

- Hand-stack heights (top of the dial = 0), [EST, standard GS clearances]:
  - Hour blade z 0.40 → 0.55, collet Ø 2.2.
  - Minute blade 0.75 → 0.90, collet Ø 1.6.
  - Seconds blade 1.10 → 1.18, hub top 1.35.
  - PR hand −0.07 → +0.03 (it sits in the recess).
  - The crystal underside at the centre (+2.40) clears everything.
- Hour : minute length ratio = 0.72.

======================================================================
## 7. COLOURS (sRGB samples; renders are neutral, loupe photos are daylight)
======================================================================

| Part | Measured samples | Recommended render base |
|---|---|---|
| Dial | Render mean #E7E7E7 (p10 #D4D4D4, p90 #F6F6F6). Loupe #D5D7D8 (#CCCED0 / #DEDFE0); macro #BCBFC1 (slightly cool). | **#E8E9EA**, metalness 0.4, roughness 0.42, texture normal map (section 5.1) |
| Black print | Render #151515; loupe #2F363D (haze) | **#141414** |
| SPRING DRIVE | Render #20215D (darkest #101054); loupe #323B4E | **#1E2560** |
| Markers, logo, hands, date frame, PR hand | Polished silver; facets in the render range #F6F6F6 → #5A5A5A | Metal **#E3E4E6**, roughness 0.04 |
| Seconds hand (blued) | Render mean #394C91, dark #1D2165, mid #2E3E87, light #80A7E3; loupe (daylight) #2A455F / #35516D / #53708C | Metal **#23409A**, roughness 0.15 (angle shift toward #4A78C8 highlights) |
| Date disc / digits | Render #DBDCDE / #141517 | **#E6E7E8 / #121212** |
| PR end marks | #77797B | #7E8184 |
| Rehaut | Render #9D9EA0; photo #94999A | #B5B7B9 matte, roughness 0.5 |
| Titanium | Loupe front (overcast): bezel #7A7C7B, shoulder #6F7476; brushed lug top p50 #737373 (p90 #BDBFBF); bracelet centre link #6A6A66, outer link #7F7F7B | **#C7C4BE** metal. Polished roughness 0.06; brushed roughness 0.30, anisotropic along 12–6 |
| Case-back engraving | Dark grey | #55585A |
| Crystal AR | Faint blue-violet at grazing angles | Tint #9BB0D8, very weak |

======================================================================
## 8. DOWNLOADED IMAGES (scale and centre)
======================================================================

Folder: `<scratchpad>/img/gs-sbga211/`

| File | Content / source | Scale, centre pixel |
|---|---|---|
| off_main.png (1102², alpha) | Official front render. https://www.grand-seiko.com/us-en/-/media/Images/Product--Image/All/GrandSeiko/2022/02/19/21/47/SBGA211G/SBGA211G.png | **14.89 px/mm (x), 14.47 (y)**: tilted ≈ 13.6° about the 3–9 axis. Dial centre **(532.6, 474.6)**; hand hub (533.6, 468.9); case silhouette r 303.6 px. |
| off_main_jp.png | Same render from the JP site | same |
| off_dial.jpg (1500×1000) | Official three-quarter product shot (…/Products/SBGA211/SBGA211_dial.jpg) | Dial centre (748.7, 437.9); ≈ 17.9 px/mm on the dial plane |
| off_caseside.jpg (1500×1000) | Official crown-side detail (…/SBGA211_caseside.jpg) | Oblique, no scale |
| off_kv_pc.jpg / off_kv_sp.jpg / off_9r65.jpg | Official key visuals and movement | — |
| btq_dial1.jpg (1200×1201) | US boutique front close-up (cdn.shopify.com …Dial_1_…jpg) | **36.8 (x) / 35.8 (y) px/mm**, centre **(601.1, 586.5)** |
| btq_front.png, btq_dial.jpg, btq_caseside.jpg, btq_case.jpg | US boutique gallery https://grandseikoboutique.us/products/watch-spring-drive-snowflake-sbga211 | — |
| **ltF_1.jpg** (3770²) | Loupe This auction, front (real watch). https://loupethis.com/auctions/grand-seiko-heritage-collection-sbga211-snowflake-titanium | **64.0 / 63.5 px/mm**, centre **(1893.0, 1807.6)** |
| **ltF_12.jpg** (3770²) | Loupe front macro | **90.3 / 88.4 px/mm**, centre **(1900.5, 1840.6)** |
| **ltF_6.jpg** (3770²) | Case back, square-on | **60.95 px/mm** (case r 20.5 = 1249.5 px). Case centre (1867.7, 1885.8); case-back ring centre (1893.6, 1848.7). |
| **ltF_7.jpg** (3770²) | Side view from 3 o'clock, crown toward the camera, crystal toward small x | **56.8 px/mm** ±2%. Elevation 4.2°. Axis at image y ≈ 1877 (crown centre (1892, 1857)). Z = 0 at x ≈ 2166. Near-side point at radius R: Z = ((2166 − x)/56.8 + 0.0727R)/0.9974. |
| ltF_9.jpg / ltF_10.jpg | Low-angle 3 and 9 o'clock side views (finishing map) | Perspective, no fixed scale |
| ltF_11.jpg | Bracelet and clasp from the back | ≈ 41.7 px/mm [EST] |
| ltF_13.jpg | Clasp blade engraving | — |
| ltF_2..5, 8, 14; lt_1..23.jpg | Rest of the auction gallery (lt_* = 1200-px versions) | — |
| ww_1..30.jpg (2500×1667) | Worn & Wound review gallery (ww_20 profile, ww_6 PR, ww_8 bevel, ww_19 dial texture) | — |
| mc_1..16.jpg (2100×1397) | Monochrome review gallery | — |
| tt_33/36/42/47/51/55.jpg | Time+Tide | — |

**Rectified 12-up mm images** in `scratchpad/py-gs/`. Each has a `.json` with the homography.
- H_bd1.png: boutique close-up, 40 px/mm, centre (660, 660).
- H_f12.png: loupe macro, 80 px/mm, centre (1440, 1440).
- H_f1.png: 60 px/mm, half-width 26.
- H_f1w.png: 30 px/mm, half-width 28.
- H_main.png: official render, 15 px/mm, half-width 37.

======================================================================
## 9. CONFLICTS, OPEN QUESTIONS AND CROSS-REPORT ISSUES
======================================================================

1. **Power-reserve direction (conflict with movement.md §8.1).**
   - movement.md has "Full = hand pointing to 12, empty ≈ 95° CCW (toward 9)".
   - W&W, hands-on: "When full … points towards nine, when empty, up towards twelve". The W&W photo and the official render agree.
   - **Recommendation:** angle (clockwise from 12 about the pivot) = 360° − 97°·(reserve fraction). Full is 263° and empty is 360°, and the hand turns clockwise on the dial as the reserve falls. So movement.md's `prHandAngle` sign and zero point should be flipped.
2. **PR pivot position (conflict with movement.md `prDisplay: [-3.46, -6.35]`).**
   - movement.md scaled ltF_12 at 84.4 px/mm (case outline) with centre (1892, 1808).
   - The minute-track homography gives 90.3 px/mm and centre (1900.5, 1840.6). Their scale and centre put the minute track's outer edge at r ≈ 15.1–16.1 (mean 15.8, lopsided). That is beyond the dial's visible edge at 15.7, which is impossible. The case outline they used is probably not the 41.0 silhouette in that macro.
   - In their frame my pivot maps to (−3.34, −6.52), close to theirs, so the difference is mostly scale and centre.
   - **Use (−3.17, −5.80)** (r 6.61).
   - By the same factor, their date-ring numeral radius 12.9 should be **≈ 12.0**. That matches the window centre X 11.97 measured here.
3. **Lug side profile** is L-M (±0.8). Perspective on curved, brushed surfaces made the top line ambiguous. Plan-view lug geometry is M.
4. **Dial height** Z 8.60 (z frame anchor) is ±0.4, inferred (section 2.4). The crystal dome sag is 0.17–0.3 with an unknown radius.
5. **Bracelet** taper end-width (16), pitch (6.8), thickness (3.4) and clasp length are estimates.
6. **Crown flute count** (≈ 24) is from an oblique end view, ±2.
7. **Marker heights / facet angles, hand heights, PR recess depth, date frame height** are standard-practice estimates.
8. **Bottom dial print** reads "JAPAN 9R65-0BL0 T 2" in the loupe macro. Other production batches may differ (e.g. "T2" vs "T 2").
9. **Inaccessible sources:** Hodinkee is blocked for fetching; WatchBase and the 1916 Company returned 403 / Cloudflare. Fratello and SJX were not needed after Monochrome, W&W and T+T.

======================================================================
## 10. QUICK PLACEMENT TABLE (dial frame, z = 0 at the dial top)
======================================================================

| Element | Placement |
|---|---|
| Crystal apex / rim top | z +3.90 / +3.73 (rim r 17.1; visible r 16.80) |
| Bezel | r 16.80 → 19.00, z +3.70 → +1.82 (polished, convex) |
| Seam | r 19.05, z +1.72 |
| Widest edge | r 20.50, z −0.12 |
| Flank lower edge / case-back seam / back plane | z −5.75 (r 19.6) / −6.80 (r 18.65) / −8.60 (r 18.0) |
| Crown axis | z −2.10; tip X 23.2; Ø 5.9 |
| Lug tips | Y ±24.5, z −8.90 → −5.60; spring bar Y ±22.9, z −7.20 |
| Dial visible edge / rehaut | r 15.70 / 15.70 → 16.45 |
| Bottom print | r 15.15 → 15.52, θ 194° → 166° |
| Minute ticks | r 14.43 → 14.96, w 0.23 (3 o'clock: 14.41 → 15.16, w 0.45) |
| Markers | r 10.45 → 14.95 (6/9: 10.35 → 14.90) |
| Hour / minute / seconds tips | r 10.2 / 14.1 / 14.5 |
| GS logo | centre (0.05, 8.08), 2.9 × 2.1 |
| Grand Seiko | baseline Y 5.42, X −4.15 → 4.42 |
| SPRING DRIVE | baseline Y −8.49, X −2.77 → 2.78 |
| Date frame | X 9.80 → 14.15, Y −1.70 → 1.65 |
| PR pivot | (−3.17, −5.80); fan radius 4.95; hand 4.65 |

======================================================================
## SPEC DATA
======================================================================

```js
// ============================================================================
// Grand Seiko SBGA211(G) "Snowflake" — EXTERIOR (case, crown, lugs, bracelet, crystal,
// case back, dial, hands, power reserve, date). Single source of truth for the exterior.
//
// Units: mm. FRAME (dial side, same as the Tangente CONTRACT): +Z out of the dial toward the
// viewer, 12 o'clock = +Y, 3 o'clock (crown) = +X. Angles in DEGREES clockwise from 12 as seen
// from the dial (convert with  x = r*sin(θ), y = r*cos(θ)).
//
// z = 0 is the TOP FACE OF THE DIAL.  Case-back outer plane: z = -8.60 (ESTIMATE ±0.4).
// Tie to movement.md (z_mov = 0 at the main plate's dial face, dial seat +0.75):
//   z_mov = z + DIAL_TO_MOV  →  case-back plane at z_mov = -7.40.
// Sources / confidence: research/gs-sbga211/exterior.md (sections in brackets).
// ============================================================================
const DEG = Math.PI / 180;
export const DIAL_TO_MOV = 1.20;          // dial seat +0.75 + dial 0.45 (ESTIMATE)
const Z_BACK = -8.60;                     // case-back outer plane in the dial frame [2.4] EST M-L
const zc = (Zcb) => +(Zcb + Z_BACK).toFixed(3); // case-back-referenced height -> dial frame
const polar = (r, deg) => [r * Math.sin(deg * DEG), r * Math.cos(deg * DEG)];

export const GS_EXTERIOR = {
  identity: {
    model: 'SBGA211G', nickname: 'Snowflake', collection: 'Heritage Collection',
    caliber: '9R65', launched: 2017, predecessor: 'SBGA011 (JP 2005 / intl 2010)',
    material: 'High-Intensity Titanium (Brite Titanium)',
    waterResistance: '10 bar', magneticResistance: '4,800 A/m', weightGrams: 100,
    dialName: 'Snowflake (雪白)', priceUSD: 6900,
  },

  // ------------------------------------------------------------------ case [2]
  case: {
    diameter: 41.0, radius: 20.5, height: 12.5, lugToLug: 49.0, lugWidth: 20.0,  // [OFF] H
    zTop: zc(12.5), zBack: Z_BACK,
    // Revolved OUTER profile at 3/9 o'clock: [r, z], from the bezel's inner lip outward and
    // down to the case-back window. Feed to LatheGeometry (x = r, y = z). [2.3] MEAS M
    profile: [
      [16.80, 3.70], [17.20, 3.62], [17.70, 3.35], [18.20, 2.90], [18.60, 2.40], [19.00, 1.82], // bezel
      [19.05, 1.72],                                                                           // seam
      [19.10, 1.70], [20.50, -0.12],                                                           // shoulder → widest edge
      [20.48, -0.80], [20.40, -1.60], [20.25, -2.60], [20.05, -3.60], [19.85, -4.60], [19.60, -5.75], // flank
      [19.10, -6.30], [18.65, -6.80],                                                          // lower bevel → seam
      [18.60, -6.83], [18.55, -7.30], [18.40, -7.90], [18.00, -8.60],                          // case back flank
      [13.80, -8.60], [13.40, -8.45], [12.90, -8.35],                                          // back face → window bevel (EST)
    ],
    bezel: { r: [16.80, 19.00], z: [1.82, 3.70], finish: 'mirror', separatePart: true },
    seam: { r: 19.05, z: 1.72, width: 0.08, depth: 0.10 },
    widestEdge: { r: 20.50, z: -0.12 },
    caseBackSeam: { r: 18.65, z: -6.80 },
    // Finishing map [2.1]: bezel mirror; lug tops hairline-brushed along Y; Zaratsu bevel (mirror)
    // between lug top and flank (≈1.0–1.4 wide on the lugs, fading to 0 at ~2:30/3:30/8:30/9:30);
    // flank + shoulder at 3/9 + lug outer faces mirror; case back polished.
    finish: { bezel: 'mirror', lugTop: 'brushedY', zaratsuBevel: 'mirror', flank: 'mirror', shoulder3and9: 'mirror', caseBack: 'mirror' },
  },

  // ------------------------------------------------------------------ crystal [2.5]
  crystal: {
    material: 'sapphire', dualCurved: true, ior: 1.77, arCoating: 'inner',            // [OFF] H
    radius: 17.10, visibleRadius: 16.80,                                               // MEAS M
    zRimTop: 3.73, zApex: 3.90, thickness: 1.5, topRadiusOfCurvature: 600,             // EST
    zUndersideCentre: 2.40, zUndersideRim: 2.23,
  },

  // ------------------------------------------------------------------ crown [2.6]
  crown: {
    axis: { y: 0, z: zc(6.5) },               // z = -2.10, MEAS M
    radius: 2.95, rootRadius: 2.70,           // Ø5.9 at flute tips, MEAS M
    flutes: 24, fluteDepth: 0.25,             // MEAS L-M / EST
    from: 19.80, to: 23.20,                   // recess floor → tip (X), MEAS M / EST
    recess: { radius: 3.40, depth: 0.60 },    // counterbore in the flank, EST
    endFace: { chamferOuter: 2.95, chamferInner: 2.45, fieldRadius: 2.35, fieldRecess: 0.08,
               logo: 'GS', logoHeight: 2.4, logoWidth: 2.6, logoRelief: 0.12 },        // raised polished GS on matte field
    screwDown: true,
  },

  // ------------------------------------------------------------------ lugs [2.7]
  lugs: {
    xInner: 10.0, tipY: 24.5,
    // plan outline of the +X,+Y lug outer edge, [x, y] (mirror for the other three). MEAS M
    planOuter: [[19.05, 7.6], [18.0, 10.2], [17.0, 12.7], [16.0, 15.1], [15.0, 17.5], [14.5, 18.9],
                [14.0, 20.1], [13.5, 21.5], [13.0, 22.5], [12.6, 23.3], [11.8, 24.1], [11.0, 24.45], [10.0, 24.5]],
    // side profile at mid-lug width, [y, z] (y outward from the centre; mirror for 6 o'clock). MEAS L-M ±0.8
    profileTop: [[16.0, 1.70], [18.0, 0.80], [20.0, -0.70], [22.0, -2.60], [23.5, -4.00], [24.2, -4.80], [24.5, -5.60]],
    tipFace: { y: 24.5, z: [-8.90, -5.60] },
    profileBottom: [[24.5, -8.90], [23.0, -8.40], [21.0, -7.80], [19.0, -7.20], [17.0, -6.80]],
    zaratsuBevel: { slantWidth: 1.2, dropBelowTop: 1.1, fadesToZeroAtDeg: [75, 105, 255, 285] },
    springBar: { y: 22.9, z: -7.20, holeRadius: 0.5, barRadius: 0.9, drilledThroughOuterFace: true },
  },

  // ------------------------------------------------------------------ bracelet [4]
  bracelet: {
    width: 20.0, widthAtClasp: 16.0, thickness: 3.4, pitch: 6.8,          // width [OFF] H; rest EST/MEAS M-L
    // five pieces across; |x| bands at the end link (scale with the taper)
    rows: [
      { name: 'outer',  x: [5.2, 10.0], finish: 'brushedY' },
      { name: 'middle', x: [4.2, 5.2],  finish: 'mirror' },               // thin polished link
      { name: 'centre', x: [0.0, 4.2],  finish: 'brushedY' },
    ],
    edgeBevel: { width: 0.4, finish: 'mirror' },
    endLink: { y: [17.6, 25.5], solid: true },
    pins: true, microAdjust: false,
    clasp: { type: 'three-fold, push-button', cover: { length: 18, width: 16.5, finish: 'brushed' },
             logo: { text: 'GS', panelWidthFrac: 0.48, raised: true },
             bladeEngraving: ['SEIKO', 'TITANIUM-TITANIUM ALLOY', 'JAPAN-B'] },
    perimeter: 193,
  },

  // ------------------------------------------------------------------ case back [3]
  // Angles below are DIAL-frame (θ_dial = 360 − θ_back). Text reads clockwise in the BACK view,
  // letter tops outward. Positions MEAS M, text H.
  caseback: {
    outerRadius: 18.60, bottomRadius: 18.00, z: [Z_BACK, -6.83], screwDown: true,
    notches: { count: 6, anglesDeg: [43, 103, 163, 223, 283, 343], width: 2.1, r: [16.95, 18.0], depth: 0.5 },
    textBand: { r: [15.70, 17.40], capHeight: 0.85, colour: '#55585A',
      items: [
        { text: 'WATER RESIST.10BAR', fromDeg: 95, toDeg: 42 },
        { text: '9R65-0AE0', fromDeg: 128, toDeg: 105 },
        { text: '[mark] U', fromDeg: 150, toDeg: 135 },
        { text: '{serial}', fromDeg: 197, toDeg: 180 },
        { text: 'MADE IN JAPAN', fromDeg: 260, toDeg: 233 },
        { text: 'TITANIUM', fromDeg: 317, toDeg: 298 },
      ] },
    decoRing: { r: [14.60, 15.50], teeth: 78, toothDuty: 0.5, height: 0.15 },   // serrated polished ring
    windowBevel: { r: [12.90, 14.60] },
    window: { radius: 12.90, thickness: 1.0, zOuter: Z_BACK + 0.3 },             // aperture MEAS M, rest EST
  },

  // ------------------------------------------------------------------ dial [5]
  dial: {
    radius: 15.90, visibleRadius: 15.70, thickness: 0.45, z: [-0.45, 0],    // visible MEAS H, rest EST
    colour: '#E8E9EA', print: '#141414', springDriveBlue: '#1E2560',
    // Snowflake relief [5.1]: elongated wavy ridges along Y (12–6), ±25° wander; three scales.
    texture: {
      ridgeAxis: 'Y',
      drift: { wavelengthX: [1.7, 3.3], lengthY: [2, 6], weight: 0.55 },
      crests: { spacingX: [0.4, 0.8], lengthY: [1, 2], weight: 0.30, pits: 'crescent scoops' },
      grain: { size: [0.05, 0.15], weight: 0.15 },
      warp: { amplitude: 0.4, scale: 1.5 },
      reliefMicrons: [20, 40],
      contrast: { flatLight: 0.025, raking: 0.15 },
      material: { metalness: 0.4, roughness: 0.42 },
    },
    rehaut: { r: [15.70, 16.45], z: [0, 2.2], colour: '#B5B7B9', printed: false },
    markers: {                                        // applied, mirror polished [5.2] MEAS M
      height: 0.35, bevelAngleDeg: 35,
      wedge12: { hours: [12], r: [10.45, 14.95], width: [1.45, 2.20], topFacet: { r: [10.75, 14.75], width: [0.87, 1.55] } },
      wedge69: { hours: [6, 9], r: [10.35, 14.90], width: [0.95, 1.80] },
      bars:    { hours: [1, 2, 4, 5, 7, 8, 10, 11], r: [10.45, 14.95], width: 1.00, topFacet: 0.36 },
    },
    minuteTrack: { r: [14.43, 14.96], width: 0.23, skipHours: true,           // [5.3] MEAS H
                   at3: { r: [14.41, 15.16], width: 0.45 } },
    logo: { text: 'GS', applied: true, center: [0.05, 8.08], width: 2.9, height: 2.1, relief: 0.3 },
    wordmark: { text: 'Grand Seiko', style: 'blackletter', baselineY: 5.42, capTopY: 6.63, xHeight: 0.70,
                x: [-4.15, 4.42], colour: '#141414' },
    springDrive: { text: 'SPRING DRIVE', style: 'sans caps, wide tracking', baselineY: -8.49, capHeight: 0.63,
                   x: [-2.77, 2.78], colour: '#1E2560' },
    bottomText: { text: 'JAPAN 9R65-0BL0 T 2', r: [15.15, 15.52], capHeight: 0.37, fromDeg: 194, toDeg: 166,
                  tops: 'toward centre', colour: '#141414',
                  pieces: [{ t: 'JAPAN', deg: [194, 184.5] }, { t: '9R65-0BL0', deg: [184, 171] }, { t: 'T', deg: 169.3 }, { t: '2', deg: 166.6 }] },
  },

  // ------------------------------------------------------------------ hands [6]
  hands: {
    hour:    { tip: 10.2, tail: 3.0, maxWidth: 1.65, maxWidthAt: 1.8, shape: 'dauphine-ridge', z: [0.40, 0.55], colletRadius: 1.10, finish: 'mirror' },
    minute:  { tip: 14.1, tail: 3.3, maxWidth: 1.45, maxWidthAt: 2.2, shape: 'dauphine-ridge', z: [0.75, 0.90], colletRadius: 0.80, finish: 'mirror',
               widthAt: [[3.5, 1.14], [6.0, 0.85], [8.0, 0.61], [10.0, 0.38], [12.0, 0.20], [14.0, 0.10]] },
    seconds: { tip: 14.5, tail: 5.2, z: [1.10, 1.18], hubRadius: 0.55, capRadius: 0.275, hubTop: 1.35,
               widthAt: [[1, 0.30], [3, 0.26], [5, 0.24], [7, 0.20], [9, 0.18], [11, 0.12], [13, 0.11], [14.5, 0.0]],
               tailWidthAt: [[0.5, 0.50], [2, 0.54], [4, 0.68], [5.2, 0.72]], tailEnd: 'square',
               colour: '#23409A', material: 'heat-blued steel', motion: 'continuous glide 6°/s' },
    thickness: { hour: 0.15, minute: 0.15, seconds: 0.08 },   // EST
  },

  // ------------------------------------------------------------------ power reserve [5.5]
  powerReserve: {
    pivot: [-3.17, -5.80],                       // MEAS M ±0.10 (r 6.61, θ 208.7°)
    recessDepth: 0.15,                           // EST
    fan: { radius: 4.95, arcFromDeg: 260.2, arcToDeg: 366.1,       // arc about the pivot
           rightEdgeDx: 0.53, bottomEdgeDy: -0.84, cornerRadius: 0.6 },
    ribs: { r: [3.40, 4.95], count: 19, fromDeg: 265, stepDeg: 5 },
    innerField: { r: [0, 3.40], concentricPitch: 0.13 },
    endMarks: { degs: [0, 263], r: [3.65, 4.60], width: 0.43, colour: '#7E8184' },
    hand: { length: 4.65, widthHub: 0.34, widthTip: 0.15, hubRadius: 0.6, z: [-0.07, 0.03], finish: 'mirror' },
    // Angle clockwise from 12 about the pivot. FULL toward 9, EMPTY at 12 (W&W hands-on) — see §9.1.
    fullDeg: 263, emptyDeg: 360, sweepDeg: 97,
    handAngleDeg: (reserveFrac) => 360 - 97 * reserveFrac,
  },

  // ------------------------------------------------------------------ date [5.6]
  date: {
    frame: { x: [9.80, 14.15], y: [-1.70, 1.65], faceBand: 0.25, height: 0.25, finish: 'mirror faceted' },
    aperture: { center: [11.97, -0.02], width: 3.40, height: 2.40 },
    disc: { z: -0.50, colour: '#E6E7E8', digitColour: '#121212', numeralRadius: 12.0,
            digitHeight: 1.55, digitWidth: 1.25, stroke: 0.22, font: 'plain grotesque, upright in window' },
  },

  // ------------------------------------------------------------------ materials (render suggestions) [7]
  colours: {
    titanium: '#C7C4BE', titaniumRoughness: { mirror: 0.06, brushed: 0.30 },
    polishedSilver: '#E3E4E6', dial: '#E8E9EA', print: '#141414', springDrive: '#1E2560',
    blued: '#23409A', bluedHighlight: '#4A78C8', dateDisc: '#E6E7E8', dateDigits: '#121212',
    rehaut: '#B5B7B9', prMarks: '#7E8184', engraving: '#55585A', crystalAR: '#9BB0D8',
  },
};
```
