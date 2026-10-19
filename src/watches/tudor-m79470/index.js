// Tudor Black Bay Pro ref. M79470-0004 ("Opaline") — automatic GMT caliber MT5652.
import { SPEC } from './spec.js';
import { buildCase } from './parts/case.js';
import { buildDial } from './parts/dial.js';
import { buildHands } from './parts/hands.js';
import { buildTrain } from './parts/train.js';
import { buildDialWorks } from './parts/dialworks.js';
import { buildEscapement } from './parts/escapement.js';
import { buildAutomatic } from './parts/automatic.js';
import { buildFrame } from './parts/frame.js';

export default {
  id: 'tudor-m79470',
  brand: 'Tudor',
  model: 'Black Bay Pro',
  ref: 'M79470-0004',
  caliber: 'MT5652',
  movementType: 'Automatic · GMT',
  title: 'Black Bay Pro',
  subtitle: 'ref. M79470-0004 · caliber MT5652',
  boxLabel: 'Black Bay Pro',
  boxNote: 'GMT · 70 h',
  spec: SPEC,
  // Named builders in build order; `lite` is the subset used for the watch box (dial
  // side only: the date disc is built by 'dial' so the window is filled in the box too).
  builders: [
    ['case', buildCase], ['dial', buildDial], ['hands', buildHands],
    ['train', buildTrain], ['dialworks', buildDialWorks], ['escapement', buildEscapement],
    ['automatic', buildAutomatic], ['frame', buildFrame],
  ],
  lite: ['case', 'dial', 'hands'],
  // Wallpaper background "based on the watch": the warm opaline dial and the steel case
  // (ivory → stone), with the GMT hand's yellow deepened to a bronze-gold that stays
  // readable on the light paper (4.9 : 1); the dark variant is graphite with the GMT
  // yellow itself as the accent.
  theme: {
    mode: 'light',
    light: { bg: ['#f4f0e7', '#dcd5c8'], accent: '#866100' },
    dark: { bg: ['#16171a', '#2a2c30'], accent: '#e8b21c' },
  },
  show: {
    // the cinematic spotlight walks through these (8 per loop, continuing next loop)
    spotlight: [
      'rotor', 'balance-wheel', 'hairspring', 'escape-wheel', 'pallet-fork', 'gmt-wheel',
      'hour-jumper', 'date-disc', 'barrel', 'center-wheel', 'balance-bridge', 'dial', 'gmt-hand',
    ],
    closeup: ['balance-wheel', 'balance-bridge'],
    winding: { type: 'automatic', ids: ['rotor'] },
  },
  // The solid screw-down case back hides the movement: the UI fades it out in the
  // movement, X-ray and exploded views.
  solidCaseback: 'caseback',
  // Not part of the mechanism: faded out when the watch explodes.
  explodeHide: ['bracelet', 'clasp', 'spring-bars'],
  // Riveted three-row steel bracelet: satin centre links (not polished), 20 mm at the
  // lugs, tapering to 15.7 mm at the T-fit clasp; the box clamps pitch / centreFrac.
  strap: {
    kind: 'bracelet', material: 'steel', color: '#c4c6c8', centre: 'brushed',
    width: 20, lugWidth: 20, widthAtBuckle: 15.7, widthAtClasp: 15.7, thickness: 3.3,
    pitch: 9.9, centreFrac: 0.5,
  },
};
