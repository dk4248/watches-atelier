// Dial of the NOMOS Tangente ref. 139: galvanised, white silver-plated brass disc with a
// recessed, concentrically turned small-seconds subdial, black pad printing and two
// brass dial feet.
//
// Every printed marking (minute track, batons, the Tangente's condensed Bauhaus
// numerals, NOMOS / GLASHÜTTE, MADE IN GERMANY and the subdial ticks) is painted into ONE
// high-resolution canvas (4096², 128 px/mm) mapped with planar UVs over the whole
// dial. The numerals and the NOMOS logo are drawn as vector paths traced from the
// official photos; only the small sans-serif text uses Jost.
//
// Measurements: research/visual.md (front photo at 23.46 px/mm, close-ups). Glyph
// proportions were re-measured from the crops numerals_upright.png, n4_8_both.png and
// logo.png (94.2 px/mm).

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// Turned subdial grooves, in fractions of one pitch: flat land [0, land), V-groove
// [land, 1) with its bottom in the middle; the print is missing over inkGap (the ink
// does not reach into the groove). slope = peak flank slope of the normal map.
const GROOVE = { land: 0.55, inkGap: [0.63, 0.92], slope: 0.7, occlusion: 0.55, aoIntensity: 1.25 };
// Turned subdial floor: a little glossier than the frosted dial, mild circular
// anisotropy; tuned so that face-on it is as white as the dial (front.jpg).
const SUBDIAL_FINISH = { roughness: 0.34, anisotropy: 0.25, envMapIntensity: 0.72 };
// Silver-plated dial under the studio light. With the environment bound explicitly at
// 0.6 and this slightly warm albedo (the studio light is a touch blue), the dial renders
// ≈ #e9ebf1 in the UI's dial view and #eaecf2–#eff2f7 face-on, like the photos'
// #e8e9eb (spec.dial.colour) — light silver rather than clipped white, so its fine
// frosted grain still reads.
const DIAL_FINISH = { albedo: 0xebe9e4, envMapIntensity: 0.6 };
const CENTRE_HOLE_R = 1.0;

// ------------------------------------------------------------------ polyline helpers

function arcPts(cx, cy, rx, ry, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

function cubicPts(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

function quadPts(p0, p1, p2, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

// Stadium (rounded-end loop) centreline between centreline extremes y0 < y1.
function stadium(xc, y0, y1, a, n = 28) {
  const yb = y0 + a, yt = y1 - a;
  return [...arcPts(xc, yt, a, a, 0, Math.PI, n), ...arcPts(xc, yb, a, a, Math.PI, TAU, n)];
}

// ------------------------------------------------------------------ numeral glyphs
// Local frame: x = reading direction, y = glyph "up", origin at the centre of the
// glyph's bounding box, units mm. Monoline stroke SW with subtly flared terminals,
// exactly like the pad-printed Tangente numerals.

function numeralOps(text, H, SW) {
  const HW = SW / 2, T = H / 2, B = T - HW;
  const FW = SW * 1.27, FL = SW * 0.8; // flare: full width at the very end, length
  const ops = [];
  const fill = (pts) => ops.push({ fill: pts });
  const stroke = (pts, closed = false, join = 'round') => ops.push({ stroke: pts, closed, join, width: SW });

  // Flared terminal of a stroke arriving at (px, py) travelling along unit (dx, dy).
  function flare(px, py, dx, dy) {
    const nx = -dy, ny = dx, K = 8, s1 = [], s2 = [];
    for (let k = 0; k <= K; k++) {
      const t = k / K, along = -FL * (1 - t), w = HW + (FW / 2 - HW) * Math.pow(t, 2.4);
      s1.push([px + dx * along + nx * w, py + dy * along + ny * w]);
      s2.push([px + dx * along - nx * w, py + dy * along - ny * w]);
    }
    fill(s1.concat(s2.reverse()));
  }

  // "1": plain stem, tiny flares top and foot.
  function one(xc) {
    fill([[xc - HW, -T], [xc + HW, -T], [xc + HW, T], [xc - HW, T]]);
    flare(xc, T, 0, 1);
    flare(xc, -T, 0, -1);
  }
  // "0": pill with straight parallel sides.
  function zero(xc, W) {
    stroke(stadium(xc, -B, B, W / 2 - HW, 32), true);
  }
  // "8": two stacked rounded loops, the upper one smaller (0.46 H tall, 0.79 W wide).
  function eight(xc, W) {
    const aB = W / 2 - HW, aT = (W * 0.79) / 2 - HW;
    const yj = T - 0.458 * H; // shared stroke where the loops meet
    stroke(stadium(xc, yj, B, aT, 26), true);
    stroke(stadium(xc, -B, yj, aB, 30), true);
  }
  // "2": arch whose left end drops into a short serifed spur; the right side runs down
  // and bends into a straight diagonal to the flat base; the base's right end turns up
  // into a short spur.
  function two(xc, W) {
    const a = W / 2 - HW;
    const L = xc - a, Rr = xc + a;
    const ya = B - a; // arch centre (semicircular arch)
    const ySpurL = T - 0.427 * H; // end of the left spur
    const yV = T - 0.355 * H; // right side: vertical down to here …
    const yQ = T - 0.5 * H; // … bending (control point) into the diagonal
    const ySpurR = -T + 0.295 * H; // top of the right spur
    const bl = [L, -B];
    const q = [Rr, yQ];
    const dl = Math.hypot(bl[0] - q[0], bl[1] - q[1]);
    const dir = [(bl[0] - q[0]) / dl, (bl[1] - q[1]) / dl];
    const s1 = [q[0] + dir[0] * 0.42 * (yV - yQ) * 1.4, q[1] + dir[1] * 0.42 * (yV - yQ) * 1.4];
    const pts = [
      [L, ySpurL], [L, ya],
      ...arcPts(xc, ya, a, a, Math.PI, 0, 28).slice(1),
      [Rr, yV],
      ...quadPts([Rr, yV], q, s1, 10),
      bl, [Rr, -B], [Rr, ySpurR],
    ];
    stroke(pts, false, 'miter');
    flare(L, ySpurL, 0, -1);
    flare(Rr, ySpurR, 0, 1);
  }
  // "4": closed, flat-topped trapezoidal counter; the crossbar runs past the stem into
  // a short flared spur and the stem continues below it into a flared foot.
  function four(xc, W) {
    const xl = xc - W / 2;
    const xS = xl + 0.70 * W; // stem centreline
    const yC = -T + 0.19 * H; // crossbar centreline
    const p1 = [xl + 0.262 * W + HW * 1.02, B];
    const p2 = [xS, B];
    const p3 = [xS, yC];
    const p4 = [xl + HW * 1.02 + 0.03, yC];
    stroke([p1, p2, p3, p4], true, 'miter');
    stroke([[xS, yC], [xc + W / 2, yC]], false, 'miter');
    flare(xc + W / 2, yC, 1, 0);
    stroke([[xS, yC], [xS, -T]], false, 'miter');
    flare(xS, -T, 0, -1);
  }

  // Lay out the characters with a 0.19 mm gap, centred.
  const parts = {
    12: [['1', FW], ['2', 1.29]],
    10: [['1', FW], ['0', 1.29]],
    2: [['2', 1.40]],
    4: [['4', 1.49]],
    8: [['8', 1.30]],
  }[text];
  const gap = 0.19;
  const total = parts.reduce((s, p) => s + p[1], 0) + gap * (parts.length - 1);
  let x = -total / 2;
  for (const [ch, w] of parts) {
    const xc = x + w / 2;
    if (ch === '1') one(xc);
    else if (ch === '0') zero(xc, w);
    else if (ch === '2') two(xc, w);
    else if (ch === '4') four(xc, w);
    else if (ch === '8') eight(xc, w);
    x += w + gap;
  }
  return ops;
}

// ------------------------------------------------------------------ NOMOS logo
// Wide geometric capitals. Local frame: baseline y = 0, x centred. Letter extents
// measured on logo.png (94.2 px/mm), total width spec.dial.logo.width.
function nomosOps(capH, width) {
  const sw = 0.14; // stroke (measured 13 px at 94.2 px/mm on logo.png)
  const k = width / 7.46;
  const x0 = -width / 2;
  const ext = [[0, 0.83], [1.43, 2.35], [2.98, 4.58], [5.21, 6.13], [6.70, 7.46]].map(([a, b]) => [x0 + a * k, x0 + b * k]);
  const h = capH * 0.96; // stems: 0.86 of the O height
  const ops = [];
  const fill = (pts) => ops.push({ fill: pts });
  const stroke = (pts, closed = false) => ops.push({ stroke: pts, closed, join: 'round', width: sw });
  const solveV = (run, rise) => { // vertical thickness of a diagonal band of perpendicular width sw
    let v = sw * 1.4;
    for (let i = 0; i < 12; i++) { const kk = (rise - v) / run; v = sw * Math.sqrt(1 + kk * kk); }
    return v;
  };
  // N
  {
    const [l, r] = ext[0];
    fill([[l, 0], [l + sw, 0], [l + sw, h], [l, h]]);
    fill([[r - sw, 0], [r, 0], [r, h], [r - sw, h]]);
    const v = solveV(r - l, h);
    fill([[l, h], [l, h - v], [r, 0], [r, v]]);
  }
  // O (twice)
  for (const i of [1, 3]) {
    const [l, r] = ext[i];
    const ro = (r - l) / 2;
    stroke(arcPts((l + r) / 2, h / 2, ro - sw / 2, ro - sw / 2, 0, TAU, 72), true);
  }
  // M: vertical stems, deep V reaching almost to the baseline
  {
    const [l, r] = ext[2];
    const xm = (l + r) / 2, yb = 0.05;
    fill([[l, 0], [l + sw, 0], [l + sw, h], [l, h]]);
    fill([[r - sw, 0], [r, 0], [r, h], [r - sw, h]]);
    const v = solveV(xm - l, h - yb);
    fill([[l, h], [l, h - v], [xm, yb], [r, h - v], [r, h], [xm, yb + v]]);
  }
  // S: upper bowl smaller, smooth diagonal spine
  {
    const [l, r] = ext[4];
    const sx = (r - l) / 0.76, sy = capH / 0.9;
    const P = (x, y) => [l + x * sx, y * sy];
    const U = { cx: 0.38, cy: 0.644, rx: 0.273, ry: 0.187 };
    const Lo = { cx: 0.378, cy: 0.246, rx: 0.31, ry: 0.211 };
    const on = (e, a) => [e.cx + e.rx * Math.cos(a), e.cy + e.ry * Math.sin(a)];
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = (14 + ((230 - 14) * i) / 24) * DEG; pts.push(on(U, a)); }
    const a0 = 230 * DEG, a1 = 50 * DEG;
    const q0 = on(U, a0), q3 = on(Lo, a1);
    const t0 = [-U.rx * Math.sin(a0), U.ry * Math.cos(a0)];
    const t1 = [Lo.rx * Math.sin(a1), -Lo.ry * Math.cos(a1)];
    const n0 = Math.hypot(...t0), n1 = Math.hypot(...t1);
    const d = Math.hypot(q3[0] - q0[0], q3[1] - q0[1]) * 0.36;
    pts.push(...cubicPts(q0, [q0[0] + (t0[0] / n0) * d, q0[1] + (t0[1] / n0) * d], [q3[0] - (t1[0] / n1) * d, q3[1] - (t1[1] / n1) * d], q3, 12));
    for (let i = 1; i <= 26; i++) { const a = (50 - ((50 + 165) * i) / 26) * DEG; pts.push(on(Lo, a)); }
    stroke(pts.map(([x, y]) => P(x, y)), false);
  }
  return ops;
}

// ------------------------------------------------------------------ the print canvas

function paintDial(canvas, N, spec) {
  const D = spec.dial;
  const R = D.radius;
  const s = N / (2 * R); // px per mm
  if (canvas.width !== N) { canvas.width = N; canvas.height = N; }
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, N, N);
  const ink = D.print;
  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.lineCap = 'butt';
  g.miterLimit = 10;

  // Local frame at dial point (cx, cy) [mm, y up] with "up" = unit (ux, uy); local x
  // is the reading direction (up turned 90° clockwise).
  const frame = (cx, cy, ux, uy) => g.setTransform(s * uy, s * ux, s * ux, -s * uy, s * (cx + R), s * (R - cy));
  const runOps = (ops) => {
    for (const op of ops) {
      g.beginPath();
      const pts = op.fill || op.stroke;
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      if (op.fill) { g.closePath(); g.fill(); continue; }
      if (op.closed) g.closePath();
      g.lineWidth = op.width;
      g.lineJoin = op.join || 'round';
      g.stroke();
    }
  };
  const radialRect = (cx, cy, ang, r0, r1, w) => { // ang: clockwise from 12
    frame(cx, cy, Math.sin(ang), Math.cos(ang));
    g.fillRect(-w / 2, r0, w, r1 - r0);
  };

  // 1. Minute track: 60 ticks, the 12 five-minute ticks as wide as the batons.
  const mt = D.minuteTrack;
  for (let i = 0; i < 60; i++) radialRect(0, 0, i * 6 * DEG, mt.r[0], mt.r[1], i % 5 === 0 ? mt.majorWidth : mt.minorWidth);

  // 2. Hour batons.
  for (const h of D.batons.hours) radialRect(0, 0, h * 30 * DEG, D.batons.r[0], D.batons.r[1], D.batons.width);

  // 3. Numerals, lying along their radius: tops point out at 12/2/10, in at 4/8.
  const nm = D.numerals;
  const rc = (nm.r[0] + nm.r[1]) / 2;
  for (const h of nm.hours) {
    const a = h * 30 * DEG;
    const out = [Math.sin(a), Math.cos(a)];
    const up = nm.inwardTops.includes(h) ? [-out[0], -out[1]] : out;
    frame(out[0] * rc, out[1] * rc, up[0], up[1]);
    runOps(numeralOps(String(h), nm.height, nm.stroke));
  }

  // 4. NOMOS logo (vector).
  frame(0, D.logo.baselineY, 0, 1);
  runOps(nomosOps(D.logo.capHeight, D.logo.width));

  // Text helper: Jost glyphs in a local frame (k = mm per font px).
  const fontPx = (weight, capMM, k) => {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = `${weight} 100px Jost, "Futura", "Century Gothic", sans-serif`;
    const asc = g.measureText('H').actualBoundingBoxAscent || 70;
    g.restore();
    return (capMM / k) * (100 / asc);
  };
  const k = 0.01;

  // 5. GLASHÜTTE: condensed medium capitals with wide tracking, centred. Measured on
  // logo.png (94.2 px/mm): cap height 0.60 mm (58 px of ink minus the ~2 px of blur that
  // the 0.90 mm O of NOMOS also shows), line 5.53 mm, stems 0.074–0.085 mm, and every
  // letter's position and width (spec.dial.city.glyphs: the T, Ü and E are as wide as
  // the H, wider than Jost draws them). Each Jost 500 glyph is scaled horizontally to
  // its measured width and placed at its measured left edge; a thin stroke (GROW)
  // brings the stems to the measured weight.
  {
    const c = D.city;
    const capH = 0.6, GROW = 0.016;
    const chars = [...c.text];
    const gl = c.glyphs && c.glyphs.length === chars.length ? c.glyphs : null;
    g.font = `500 ${fontPx(500, capH - GROW, k).toFixed(2)}px Jost, "Futura", "Century Gothic", sans-serif`;
    const m = chars.map((ch) => g.measureText(ch));
    // fallback without glyph data: even tracking across c.width
    let fallbackX = -c.width / 2;
    frame(0, c.baselineY + GROW / 2, 0, 1); // keep the grown baseline at baselineY
    for (let i = 0; i < chars.length; i++) {
      const L = m[i].actualBoundingBoxLeft, Rr = m[i].actualBoundingBoxRight;
      const inkW = Math.max(1e-3, (L + Rr) * k);
      let left, w;
      if (gl) { [left, w] = gl[i]; } else { w = inkW + GROW; left = fallbackX; fallbackX += w + (c.width - chars.length * w) / (chars.length - 1); }
      const sx = Math.max(0.4, Math.min(1.6, (w - GROW) / inkW));
      g.save();
      g.scale(k * sx, -k);
      g.lineWidth = GROW / (k * sx);
      g.lineJoin = 'miter';
      const xd = (left + GROW / 2) / (k * sx) + L; // ink left edge at left + GROW/2
      g.fillText(chars[i], xd, 0);
      g.strokeText(chars[i], xd, 0);
      g.restore();
    }
  }

  // 6. MADE IN GERMANY on an arc outside the minute track, upright at 6 o'clock:
  // letter bases on the outside (r 15.47), tops towards the centre (r 15.06).
  {
    const md = D.madeIn;
    const capH = md.r[1] - md.r[0];
    const F = fontPx(500, capH, k);
    g.font = `500 ${F.toFixed(2)}px Jost, "Futura", "Century Gothic", sans-serif`;
    const rMid = (md.r[0] + md.r[1]) / 2;
    const span = (md.spanDeg[1] - md.spanDeg[0]) * DEG * rMid; // ink length along the arc
    const chars = [...md.text];
    const m = chars.map((ch) => g.measureText(ch));
    const adv = m.map((q) => q.width * k);
    const bl = m[0].actualBoundingBoxLeft * k, br = m[m.length - 1].actualBoundingBoxRight * k;
    const sumAdv = adv.slice(0, -1).reduce((a, b) => a + b, 0);
    const t = (span - (sumAdv + bl + br)) / (chars.length - 1);
    let x = bl; // pen position along the arc, from the left ink edge
    for (let i = 0; i < chars.length; i++) {
      const xc = x + adv[i] / 2; // glyph centre along the arc
      const phi = md.spanDeg[1] * DEG - xc / rMid; // clockwise from 12, decreasing to the right
      const sn = Math.sin(phi), cs = Math.cos(phi);
      frame(sn * md.r[1], cs * md.r[1], -sn, -cs);
      g.save();
      g.scale(k, -k);
      g.fillText(chars[i], -adv[i] / 2 / k, 0);
      g.restore();
      x += adv[i] + t;
    }
  }

  // 7. Small-seconds ticks, pad-printed over the turned subdial floor: the ink only
  // takes on the flat lands between the grooves, so every tick is broken into short
  // dashes, one per groove (clearly visible in the close-up photo d2_sub.png).
  const sub = D.subdial;
  const p = sub.groovePitch;
  for (let i = 0; i < 12; i++) {
    const w = i % 3 === 0 ? sub.ticks.major : sub.ticks.minor;
    const [r0, r1] = sub.ticks.r;
    for (let n = Math.floor(r0 / p) - 1; n * p < r1; n++) {
      const a = Math.max(r0, (n - 1 + GROOVE.inkGap[1]) * p);
      const b = Math.min(r1, (n + GROOVE.inkGap[0]) * p);
      if (b - a > 0.004) radialRect(sub.center[0], sub.center[1], i * 30 * DEG, a, b, w);
    }
  }

  g.setTransform(1, 0, 0, 1, 0, 0);
}

// ------------------------------------------------------------------ subdial textures

// Concentric turned grooves (pitch spec.dial.subdial.groovePitch) as a tangent-space
// normal map over the subdial's own centred UVs, plus a matching anisotropy map.
// Profile per pitch (phase f = r / pitch mod 1): a flat land up to GROOVE.land, then a
// smooth V-groove whose bottom is at f = (land + 1) / 2. In the photos the floor reads
// as white with fine grey rings, i.e. narrow grooves between broad lands.
function grooveTextures(THREE, radius, pitch, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const LUT = 2048, lut = new Float32Array(LUT);
  for (let i = 0; i < LUT; i++) {
    const f = i / LUT;
    if (f < GROOVE.land) { lut[i] = 0; continue; }
    const t = (f - GROOVE.land) / (1 - GROOVE.land); // 0 → 1 across the groove
    lut[i] = -Math.sin(TAU * t); // dh/dr: down the inner flank, up the outer one
  }
  const k = GROOVE.slope;
  const mmPerPx = (2 * radius) / size;
  for (let j = 0; j < size; j++) {
    const y = radius - (j + 0.5) * mmPerPx;
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) * mmPerPx - radius;
      const r = Math.hypot(x, y) + 1e-6;
      const f = r / pitch;
      const d = lut[Math.floor((f - Math.floor(f)) * LUT)] * k * Math.min(1, r / 0.25);
      let nx = -d * (x / r), ny = -d * (y / r);
      const nz = 1, l = Math.hypot(nx, ny, nz);
      const o = (j * size + i) * 4;
      img.data[o] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((nz / l) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const normalMap = new THREE.CanvasTexture(c);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.anisotropy = 8;

  // Occlusion in the grooves: light reaches the bottom of a narrow V-cut only from a
  // small cone, so the grooves read as fine grey rings at oblique angles (detail1/2),
  // while face-on (front.jpg) the floor stays almost as white as the dial.
  const cao = document.createElement('canvas');
  cao.width = cao.height = size;
  const gao = cao.getContext('2d');
  const iao = gao.createImageData(size, size);
  const aoLut = new Uint8Array(LUT);
  for (let i = 0; i < LUT; i++) {
    const f = i / LUT;
    const t = f < GROOVE.land ? 0 : (f - GROOVE.land) / (1 - GROOVE.land);
    aoLut[i] = Math.round(255 * (1 - GROOVE.occlusion * (1 - Math.cos(TAU * t)) / 2));
  }
  for (let j = 0; j < size; j++) {
    const y = radius - (j + 0.5) * mmPerPx;
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) * mmPerPx - radius;
      const f = (Math.hypot(x, y) + 1e-6) / pitch;
      const v = aoLut[Math.floor((f - Math.floor(f)) * LUT)];
      const o = (j * size + i) * 4;
      iao.data[o] = iao.data[o + 1] = iao.data[o + 2] = v;
      iao.data[o + 3] = 255;
    }
  }
  gao.putImageData(iao, 0, 0);
  const aoMap = new THREE.CanvasTexture(cao);
  aoMap.colorSpace = THREE.NoColorSpace;
  aoMap.anisotropy = 8;

  // Anisotropy direction: tangential (along the grooves), full strength.
  const as = 256;
  const ca = document.createElement('canvas');
  ca.width = ca.height = as;
  const ga = ca.getContext('2d');
  const ia = ga.createImageData(as, as);
  for (let j = 0; j < as; j++) {
    for (let i = 0; i < as; i++) {
      const u = (i + 0.5) / as - 0.5, v = 0.5 - (j + 0.5) / as;
      const a = Math.atan2(v, u) + Math.PI / 2;
      const o = (j * as + i) * 4;
      ia.data[o] = (Math.cos(a) * 0.5 + 0.5) * 255;
      ia.data[o + 1] = (Math.sin(a) * 0.5 + 0.5) * 255;
      ia.data[o + 2] = 255;
      ia.data[o + 3] = 255;
    }
  }
  ga.putImageData(ia, 0, 0);
  const anisotropyMap = new THREE.CanvasTexture(ca);
  anisotropyMap.colorSpace = THREE.NoColorSpace;
  return { normalMap, anisotropyMap, aoMap };
}

// ExtrudeGeometry puts both lids in group 0 (bottom faces first, then top faces) and the
// walls in group 1. Re-group as 0 = top lid, 1 = walls, 2 = bottom lid.
function splitLids(geo) {
  const [lids, sides] = geo.groups;
  const half = lids.count / 2;
  geo.clearGroups();
  geo.addGroup(lids.start + half, half, 0);
  geo.addGroup(sides.start, sides.count, 1);
  geo.addGroup(lids.start, half, 2);
  return geo;
}

// One single-material mesh per geometry group (null material = drop that group). The
// registry's X-ray and highlight code clones `mesh.material`, which fails on material
// arrays, so every mesh here carries exactly one material. Same draw-call count.
function meshesFromGroups(THREE, geo, mats) {
  const out = [];
  mats.forEach((mat, mi) => {
    if (!mat) return;
    const groups = geo.groups.filter((g) => g.materialIndex === mi);
    if (!groups.length) return;
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const k = attr.itemSize;
      const n = groups.reduce((s, g) => s + g.count, 0);
      const arr = new attr.array.constructor(n * k);
      let o = 0;
      for (const g of groups) {
        arr.set(attr.array.subarray(g.start * k, (g.start + g.count) * k), o);
        o += g.count * k;
      }
      part.setAttribute(name, new THREE.BufferAttribute(arr, k, attr.normalized));
    }
    part.computeBoundingSphere();
    out.push(new THREE.Mesh(part, mat));
  });
  return out;
}

function ringPts(THREE, r, n, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(cx + r * Math.cos((i / n) * TAU), cy + r * Math.sin((i / n) * TAU)));
  return pts;
}

// ------------------------------------------------------------------ builder

export function buildDial(ctx) {
  const { THREE, spec, M, reg, root, stage } = ctx;
  const D = spec.dial, Z = spec.z;
  const R = D.radius;
  const [zb, zt] = Z.dial;
  const sub = D.subdial;
  const [scx, scy] = sub.center;
  const subR = sub.recessRadius;
  const zf = Z.subdialFloor;
  // Lite (watch box: every watch built at once, seen dial-up from above): 2048 px print
  // (64 px/mm, still finer than the screen there), 1024 px grooves, fewer segments.
  const lite = !!ctx.lite;
  const caps = stage?.renderer?.capabilities;
  const N = Math.min(lite ? 2048 : 4096, caps?.maxTextureSize || 4096);
  const maxAniso = Math.min(16, caps?.getMaxAnisotropy?.() || 8);
  const SEG = lite ? 0.5 : 1; // segment-count factor

  // ---- print texture
  const canvas = document.createElement('canvas');
  paintDial(canvas, N, spec);
  const printTex = new THREE.CanvasTexture(canvas);
  printTex.colorSpace = THREE.SRGBColorSpace;
  printTex.anisotropy = maxAniso;
  const printTexSub = printTex.clone(); // same image, read through the subdial's uv1
  printTexSub.channel = 1;
  // The small text uses Jost; if it was not loaded yet, repaint once it is.
  try {
    const faces = ['500 40px Jost', '600 40px Jost'];
    if (document.fonts && !faces.every((f) => document.fonts.check(f))) {
      Promise.all(faces.map((f) => document.fonts.load(f))).then(() => {
        if (!faces.every((f) => document.fonts.check(f))) return;
        paintDial(canvas, N, spec);
        printTex.needsUpdate = true;
        printTexSub.needsUpdate = true;
      }).catch(() => {});
    }
  } catch { /* no font loading API: keep the fallback face */ }

  // ---- materials
  // The scene environment is bound explicitly (a material's envMapIntensity is ignored
  // while it inherits scene.environment), so the dial's share of it can be set: see
  // DIAL_FINISH for the measured result against the photos' colour (spec.dial.colour).
  const env = stage?.scene?.environment || null;
  const dialColour = new THREE.Color(DIAL_FINISH.albedo);
  const grainN = M.dialBase.normalMap?.clone();
  const grainR = M.dialBase.roughnessMap?.clone();
  if (grainN) grainN.repeat.set(6, 6); // ~95 px/mm: a fine frosted grain
  if (grainR) grainR.repeat.set(6, 6);
  const faceMat = M.dialBase.clone();
  faceMat.color.copy(dialColour);
  faceMat.map = printTex;
  // The ink must not pick up the plating's sheen or specular glare, or the print
  // washes out to grey in three-quarter views; the same image masks both.
  faceMat.sheenColorMap = printTex;
  faceMat.specularColorMap = printTex;
  faceMat.normalMap = grainN || null;
  faceMat.roughnessMap = grainR || null;
  // roughnessMap (≈0.48) multiplies this: the frosted plating ends up at ≈0.4.
  faceMat.roughness = 0.85;
  faceMat.envMap = env;
  faceMat.envMapIntensity = DIAL_FINISH.envMapIntensity;
  faceMat.name = 'dialFace';

  const wallMat = M.dialBase.clone();
  wallMat.color.copy(dialColour);
  wallMat.normalMap = null;
  wallMat.roughnessMap = null;
  wallMat.roughness = 0.3;
  wallMat.envMap = env;
  wallMat.envMapIntensity = DIAL_FINISH.envMapIntensity;
  wallMat.name = 'dialWall';

  // The underside is the bare brass blank: matte, slightly tarnished (kept subdued: it
  // must not glow through the narrow gaps round the stem when seen through the back).
  const backMat = M.brass.clone();
  backMat.roughness = 0.55;
  backMat.color.set(0xb89a62);
  backMat.envMap = env;
  backMat.envMapIntensity = 0.85;
  backMat.name = 'dialBack';

  // Subdial floor: the same white silver plating, but turned with fine concentric
  // grooves instead of frosted. Face-on it reads as white as the dial (front.jpg:
  // #ececec on both); the grooves show as fine grey rings and, through the circular
  // anisotropy, as a soft sheen that wanders round as the light or the view moves.
  const groove = grooveTextures(THREE, subR, sub.groovePitch, lite ? 1024 : 2048);
  const subMat = M.dialBase.clone();
  subMat.color.copy(dialColour);
  subMat.map = printTexSub;
  subMat.sheenColorMap = printTexSub;
  subMat.specularColorMap = printTexSub;
  subMat.roughnessMap = null;
  subMat.roughness = SUBDIAL_FINISH.roughness;
  subMat.normalMap = groove.normalMap;
  subMat.normalScale = new THREE.Vector2(1, 1);
  subMat.anisotropy = SUBDIAL_FINISH.anisotropy;
  subMat.anisotropyMap = groove.anisotropyMap;
  subMat.aoMap = groove.aoMap; // on uv (channel 0), like the groove normal map
  subMat.aoMapIntensity = GROOVE.aoIntensity;
  subMat.envMap = env;
  subMat.envMapIntensity = SUBDIAL_FINISH.envMapIntensity;
  subMat.name = 'subdialFloor';

  // ---- dial plate: disc with the centre-pipe hole and the subdial recess. The recess
  // has a crisp 45° stamped step (visible face-on as the thin ring round the subdial):
  // floor radius subR − STEP/2, opening radius subR + STEP/2, depth zt − zf.
  const STEP = zt - zf;
  const rFloor = subR - STEP / 2, rOpen = subR + STEP / 2;
  const shape = new THREE.Shape(ringPts(THREE, R, 256 * SEG));
  // Centre hole Ø2.0: clears the hour-wheel boss (r 0.95, rising just above the plate
  // face) as well as its pipe (Ø1.30); hidden face-on under the Ø2.25 hour collet.
  shape.holes.push(new THREE.Path(ringPts(THREE, CENTRE_HOLE_R, 64 * SEG)));
  shape.holes.push(new THREE.Path(ringPts(THREE, rOpen, 192 * SEG, scx, scy)));
  const dialGeo = splitLids(new THREE.ExtrudeGeometry(shape, { depth: zt - zb, bevelEnabled: false, curveSegments: 1 }));
  dialGeo.translate(0, 0, zb);
  ctx.planarUV(dialGeo, 1 / (2 * R), [0.5, 0.5]);
  const dialObj = new THREE.Group();
  dialObj.name = 'dial';
  for (const m of meshesFromGroups(THREE, dialGeo, [faceMat, wallMat, backMat])) {
    m.name = `dial-${m.material.name}`;
    dialObj.add(m);
  }
  root.add(dialObj);

  // ---- subdial floor: recessed disc, turned with concentric grooves
  const subShape = new THREE.Shape(ringPts(THREE, rFloor, 192 * SEG));
  subShape.holes.push(new THREE.Path(ringPts(THREE, 0.3, 32)));
  const subGeo = splitLids(new THREE.ExtrudeGeometry(subShape, { depth: zf - zb, bevelEnabled: false, curveSegments: 1 }));
  subGeo.translate(0, 0, zb);
  {
    const pos = subGeo.attributes.position;
    const uv = subGeo.attributes.uv;
    const uv1 = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      uv.setXY(i, x / (2 * subR) + 0.5, y / (2 * subR) + 0.5);
      uv1[i * 2] = (x + scx + R) / (2 * R);
      uv1[i * 2 + 1] = (y + scy + R) / (2 * R);
    }
    uv.needsUpdate = true;
    subGeo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  }
  const subObj = new THREE.Group();
  subObj.name = 'small-seconds';
  subObj.position.set(scx, scy, 0);
  // floor + brass underside; the floor's outer wall is hidden behind the step, so it is
  // left out (null material).
  for (const m of meshesFromGroups(THREE, subGeo, [subMat, null, backMat])) {
    m.name = `small-seconds-${m.material.name}`;
    subObj.add(m);
  }
  // the stamped 45° step between the floor and the dial surface
  {
    const n = 192 * SEG, pos = [], nor = [], idx = [];
    const s2 = Math.SQRT1_2;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
      pos.push(rFloor * c, rFloor * s, zf, rOpen * c, rOpen * s, zt);
      nor.push(-c * s2, -s * s2, s2, -c * s2, -s * s2, s2);
      if (i < n) {
        const k = i * 2;
        idx.push(k, k + 1, k + 3, k, k + 3, k + 2);
      }
    }
    const stepGeo = new THREE.BufferGeometry();
    stepGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    stepGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    stepGeo.setIndex(idx);
    const stepMesh = new THREE.Mesh(stepGeo, wallMat);
    stepMesh.name = 'small-seconds-step';
    subObj.add(stepMesh);
  }
  subObj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  dialObj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.add(subObj);

  // ---- dial feet: two brass pins into blind holes of the main plate (spec.dial.feet:
  // clear of the casing-clamp notches, the keyless works at 3 o'clock and the motion works).
  const DF = D.feet || { angles: [60, 240], r: 10.9, radius: 0.28, depth: 0.75 };
  const feetPos = DF.angles.map((deg) => [DF.r * Math.sin(deg * DEG), DF.r * Math.cos(deg * DEG)]);
  const fr = DF.radius, fz = -DF.depth;
  const footGeos = feetPos.map(([x, y]) => {
    const prof = [[0.0001, fz], [fr - 0.06, fz], [fr, fz + 0.06], [fr, zb - 0.06], [fr + 0.08, zb - 0.02], [fr + 0.08, zb]].map(([r, z]) => new THREE.Vector2(r, z));
    const gg = new THREE.LatheGeometry(prof, lite ? 12 : 24);
    gg.rotateX(Math.PI / 2);
    gg.translate(x, y, 0);
    return gg;
  });
  const feetMesh = new THREE.Mesh(mergeGeometries(footGeos), M.brass);
  feetMesh.name = 'dial-feet';
  feetMesh.castShadow = true;
  feetMesh.receiveShadow = true;
  const feetObj = new THREE.Group();
  feetObj.name = 'dial-feet';
  feetObj.add(feetMesh);
  root.add(feetObj);

  // ---- registry
  const ex = (id) => spec.explode[id] ?? [0, 0, 0];
  reg.add({
    id: 'dial', name: 'Dial', category: 'dial', side: 'front', object: dialObj,
    exposed: true, xray: true, priority: 1,
    explode: ex('dial'), explodeDelay: spec.explodeDelay('dial'),
    anchor: [6.3, -4.4, zt],
    description: 'The face of the watch: a thin brass disc, galvanised and silver-plated white, with every marking pad-printed in black. The tall Bauhaus-era numerals, slim batons and fine minute track follow a 1930s Glashütte dial design.',
    facts: {
      Finish: 'Galvanised, white silver-plated',
      Diameter: `${(2 * R).toFixed(1)} mm (${(2 * D.visibleRadius).toFixed(1)} mm visible)`,
      Thickness: `${(zt - zb).toFixed(2)} mm (estimate)`,
      Printing: 'Black pad print',
      'Hour markers': 'Numerals 12, 2, 4, 8, 10 and batons',
      'Minute track': '60 ticks, every fifth one bold',
    },
  });
  reg.add({
    id: 'small-seconds', name: 'Small seconds', category: 'dial', side: 'front', object: subObj,
    exposed: true, xray: true, priority: 2,
    explode: ex('small-seconds'), explodeDelay: spec.explodeDelay('small-seconds'),
    anchor: [-2.7, -2.2, zf],
    description: 'A shallow recess in the dial at 6 o\'clock for the running seconds, read by a hand on the fourth-wheel arbor. Its floor is turned with fine concentric grooves, so it catches the light in rings, unlike the frosted main dial.',
    facts: {
      Diameter: `${(2 * subR).toFixed(1)} mm`,
      Recess: `${(zt - zf).toFixed(2)} mm deep`,
      Finish: `Concentric grooves, ~${sub.groovePitch.toFixed(2)} mm pitch`,
      Ticks: '12 (every 5 s), no numerals',
      Centre: `${Math.abs(scy).toFixed(1)} mm below the dial centre`,
    },
  });
  reg.add({
    id: 'dial-feet', name: 'Dial feet', category: 'dial', side: 'front', object: feetObj,
    exposed: false, xray: false, priority: 3,
    explode: ex('dial-feet'), explodeDelay: spec.explodeDelay('dial-feet'),
    anchor: [feetPos[0][0], feetPos[0][1], -0.3],
    description: 'Two brass pins on the back of the dial that locate it in holes in the main plate. Small screws in the edge of the plate clamp them, so the dial can neither turn nor lift.',
    facts: { Count: '2', Diameter: '0.56 mm', Material: 'Brass', Fixing: 'Dial-foot screws in the main plate' },
  });
}
