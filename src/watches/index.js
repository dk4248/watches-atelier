// The collection. Order = order in the watch box (left to right) and in the Lively
// "Watch of the day" dropdown.
import tangente139 from './tangente-139/index.js';
import gsSbga211 from './gs-sbga211/index.js';
import tangenteUpdate147 from './tangente-update-147/index.js';
import tudorM79470 from './tudor-m79470/index.js';

export const WATCHES = [tangente139, gsSbga211, tangenteUpdate147, tudorM79470];

export const DEFAULT_WATCH = 'tangente-139';

export function getWatch(id) {
  return WATCHES.find((w) => w.id === id) || WATCHES.find((w) => w.id === DEFAULT_WATCH) || WATCHES[0];
}
