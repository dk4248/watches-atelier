// NOMOS dial glyphs shared by the NOMOS watches (Tangente 139, Tangente Update 147):
// the condensed monoline Tangente numerals (12, 10, 2, 4, 8) and the wide geometric
// NOMOS logo, as vector drawing ops traced from official photos (see the Tangente
// 139's research/visual.md). Copied verbatim from src/watches/tangente-139/parts/dial.js
// (which keeps its own copy, so the 139 never changes because of another watch).
//
// numeralOps(text, H, SW) / nomosOps(capH, width) return arrays of
//   { fill: [[x, y], …] }  or  { stroke: [[x, y], …], closed, join, width }
// in a local mm frame (x = reading direction, y = glyph up; numerals centred on their
// bounding box, logo on its baseline, x centred). Draw them with runOps() below on a 2D
// canvas whose transform maps that local frame to pixels.

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export function arcPts(cx, cy, rx, ry, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

export function cubicPts(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

export function quadPts(p0, p1, p2, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

// Stadium (rounded-end loop) centreline between centreline extremes y0 < y1.
export function stadium(xc, y0, y1, a, n = 28) {
  const yb = y0 + a, yt = y1 - a;
  return [...arcPts(xc, yt, a, a, 0, Math.PI, n), ...arcPts(xc, yb, a, a, Math.PI, TAU, n)];
}

// ------------------------------------------------------------------ numeral glyphs
// Local frame: x = reading direction, y = glyph "up", origin at the centre of the
// glyph's bounding box, units mm. Monoline stroke SW with subtly flared terminals,
// exactly like the pad-printed Tangente numerals.

export function numeralOps(text, H, SW) {
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
export function nomosOps(capH, width) {
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

// Draw ops on a CanvasRenderingContext2D (its transform already maps local mm → px).
export function runOps(g, ops) {
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
}
