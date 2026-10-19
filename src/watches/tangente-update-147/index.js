// NOMOS Glashütte Tangente neomatik 38 Update, ref. 147 — automatic caliber DUW 6101
// with the Update ring date (two red markers framing the date on the dial edge).
import { SPEC } from './spec.js';
import { buildCase } from './parts/case.js';
import { buildDial } from './parts/dial.js';
import { buildHands } from './parts/hands.js';
import { buildTrain } from './parts/train.js';
import { buildDate } from './parts/date.js';
import { buildAutomatic } from './parts/automatic.js';
import { buildEscapement } from './parts/escapement.js';
import { buildFrame } from './parts/frame.js';

export default {
  id: 'tangente-update-147',
  brand: 'NOMOS Glashütte',
  model: 'Tangente neomatik 38 Update',
  ref: '147',
  caliber: 'DUW 6101',
  movementType: 'Automatic',
  title: 'Tangente neomatik 38 Update',
  subtitle: 'ref. 147 · caliber DUW 6101 · ring date',
  boxLabel: 'Tangente Update',
  boxNote: 'Automatic · ring date · 50 h',
  spec: SPEC,
  // Named builders in build order; `lite` is the subset used for the watch box (dial side
  // only — the dial module also builds the date ring, whose red markers show through the
  // dial's slots, so it must exist in lite mode too).
  builders: [
    ['case', buildCase], ['dial', buildDial], ['hands', buildHands],
    ['train', buildTrain], ['date', buildDate], ['automatic', buildAutomatic],
    ['escapement', buildEscapement], ['frame', buildFrame],
  ],
  lite: ['case', 'dial', 'hands'],
  // Background "based on the watch": the white silver-plated dial and black oxidised hands
  // → a clean, very pale warm-neutral silver gradient; accent = the date-marker red.
  theme: {
    mode: 'light',
    light: { bg: ['#f6f5f2', '#dcdad5'], accent: '#c80e16' },
    dark: { bg: ['#121314', '#25272a'], accent: '#ff5a60' },
  },
  show: {
    // the most interesting parts first: the automatic, the ring date, the regulating organ
    spotlight: [
      'rotor', 'date-ring', 'balance-wheel', 'escape-wheel', 'reversing-wheels', 'date-wheels',
      'barrel', 'pallet-fork', 'hairspring', 'crown-wheel', 'center-wheel', 'balance-bridge', 'dial', 'minute-hand',
    ],
    closeup: ['balance-wheel', 'escape-wheel'],
    winding: { type: 'automatic', ids: ['rotor', 'reversing-wheels'] },
  },
  solidCaseback: null, // sapphire display back (147.SB is the solid-back variant)
  // Parts the UI fades out in the exploded view (not part of the mechanism).
  explodeHide: ['strap-top', 'strap-bottom', 'buckle', 'spring-bars'],
  // black Horween shell cordovan, rembordé, black stitching; 19 → 17 mm, 2.5 mm thick
  strap: { kind: 'leather', material: 'shell cordovan', color: '#121316', stitch: '#1a1a1a', width: 19, lugWidth: 19, widthAtBuckle: 17, thickness: 2.5 },
};
