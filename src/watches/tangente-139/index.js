// NOMOS Glashütte Tangente ref. 139 — hand-wound caliber DUW 4001.
import { SPEC } from './spec.js';
import { buildCase } from './parts/case.js';
import { buildDial } from './parts/dial.js';
import { buildHands } from './parts/hands.js';
import { buildTrain } from './parts/train.js';
import { buildEscapement } from './parts/escapement.js';
import { buildFrame } from './parts/frame.js';

export default {
  id: 'tangente-139',
  brand: 'NOMOS Glashütte',
  model: 'Tangente',
  ref: '139',
  caliber: 'DUW 4001',
  movementType: 'Hand-wound',
  title: 'Tangente',
  subtitle: 'ref. 139 · caliber DUW 4001',
  boxLabel: 'Tangente 35',
  boxNote: 'Hand-wound · 53 h',
  spec: SPEC,
  // Named builders in build order; `lite` is the subset used for the watch box
  // (dial side only: no movement).
  builders: [
    ['case', buildCase], ['dial', buildDial], ['hands', buildHands],
    ['train', buildTrain], ['escapement', buildEscapement], ['frame', buildFrame],
  ],
  lite: ['case', 'dial', 'hands'],
  // Wallpaper background "based on the watch": the galvanised silver-white dial and
  // the tempered-blue hands.
  theme: {
    mode: 'light',
    light: { bg: ['#f2f3f5', '#d5d9df'], accent: '#2347b5' },
    dark: { bg: ['#0e131c', '#1b2433'], accent: '#7d97ff' },
  },
  show: {
    spotlight: [
      'barrel', 'center-wheel', 'third-wheel', 'fourth-wheel', 'escape-wheel', 'pallet-fork',
      'balance-wheel', 'hairspring', 'ratchet-wheel', 'crown-wheel', 'three-quarter-plate', 'dial', 'hour-hand',
    ],
    closeup: ['balance-wheel', 'escape-wheel'],
    winding: { type: 'manual', ids: ['ratchet-wheel', 'crown-wheel'] },
  },
  solidCaseback: null,
  // Parts the UI fades out in the exploded view (they are not part of the mechanism
  // and would only clutter the stack).
  explodeHide: ['strap-top', 'strap-bottom', 'buckle', 'spring-bars'],
  strap: { kind: 'leather', color: '#141210', stitch: '#1d1a16', width: 18, lugWidth: 18 },
};
