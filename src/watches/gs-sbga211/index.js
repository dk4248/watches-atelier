// Grand Seiko SBGA211G "Snowflake" — high-intensity titanium, caliber 9R65 Spring Drive
// (automatic with Magic Lever, Tri-synchro Regulator, gliding seconds, 72 h power reserve).
// Build plan and part ids: research/gs-sbga211/plan.md. Validation: research/gs-sbga211/check.mjs.
import { SPEC } from './spec.js';
import { buildCase } from './parts/case.js';
import { buildDial } from './parts/dial.js';
import { buildHands } from './parts/hands.js';
import { buildTrain } from './parts/train.js';
import { buildSpringDrive } from './parts/springdrive.js';
import { buildAutomatic } from './parts/automatic.js';
import { buildFrame } from './parts/frame.js';

export default {
  id: 'gs-sbga211',
  brand: 'Grand Seiko',
  model: 'Snowflake',
  ref: 'SBGA211',
  caliber: '9R65',
  movementType: 'Spring Drive · automatic',
  title: 'Snowflake',
  subtitle: 'ref. SBGA211 · caliber 9R65 Spring Drive',
  boxLabel: 'Snowflake',
  boxNote: 'Spring Drive · 72 h',
  spec: SPEC,
  // Named builders in build order; `lite` is the subset used for the watch box (dial side only).
  builders: [
    ['case', buildCase], ['dial', buildDial], ['hands', buildHands],
    ['train', buildTrain], ['springdrive', buildSpringDrive], ['automatic', buildAutomatic], ['frame', buildFrame],
  ],
  lite: ['case', 'dial', 'hands'],
  // Wallpaper background "based on the watch": the snow-white, silver-plated Snowflake dial and
  // the bright titanium give a clean, icy white → cool blue-grey; the accent is the heat-blued
  // gliding seconds hand. Dark: a deep blue-black winter night with an icy blue accent.
  theme: {
    mode: 'light',
    light: { bg: ['#f3f6fa', '#cfd9e4'], accent: '#23409a' },
    dark: { bg: ['#060b14', '#132137'], accent: '#9cc3ff' },
  },
  show: {
    // exploded hold: one key part every 2.4 s (8 per loop; successive loops continue the list)
    spotlight: [
      'glide-wheel', 'coil', 'quartz-oscillator', 'ic', 'rotor', 'magic-lever', 'pawl-wheel', 'ratchet-wheel',
      'barrel', 'center-wheel', 'fourth-wheel', 'pr-differential', 'tri-synchro-regulator', 'date-ring',
      'power-reserve-hand', 'automatic-bridge', 'dial',
    ],
    // close-up through the case back: the glide wheel's gold Diashock and inertia disc in the
    // automatic bridge's notch, the 6th wheel's Diashock in the window below it
    closeup: ['glide-wheel', 'diashock'],
    winding: { type: 'automatic', ids: ['rotor', 'magic-lever'] },
  },
  solidCaseback: null, // display back
  // Parts the UI fades out in the exploded view (not part of the mechanism)
  explodeHide: ['bracelet', 'clasp', 'spring-bars'],
  // For the watch-box band: titanium three-row look (brushed outer and centre links, thin
  // polished links between them — the box draws two materials, so the centre reads brushed).
  strap: {
    kind: 'bracelet', material: 'titanium', color: '#C7C4BE', width: 20, lugWidth: 20,
    widthAtBuckle: 16, widthAtClasp: 16, thickness: 3.4, pitch: 6.8, centreFrac: 0.52, centre: 'brushed',
  },
};
