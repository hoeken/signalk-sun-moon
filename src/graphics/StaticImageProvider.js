import { ImageProvider } from './ImageProvider.js';

/**
 * Alternative provider (§6.5): returns premade assets keyed by (collapsed) sun
 * state and moon phase, served from `<base>/sun/*.webp` and
 * `<base>/moon/moon-NN.webp` (a 28-frame moon set, one frame per ~day of the
 * synodic month; see moonFrame() below).
 * These files are produced by `npm run assets` (resized from the high-res art in
 * `art/`) and copied verbatim from `src/assets/` into the build output (Vite
 * `publicDir`, §7.1). Static moon art is upright/generic — observer orientation
 * is the GeneratedImageProvider's job.
 *
 * Selecting this instead of GeneratedImageProvider changes graphics without
 * touching card code (acceptance criterion 7).
 */

const SUN_FILE = {
  night: 'night',
  polarNight: 'night',
  astronomicalDawn: 'dawn',
  nauticalDawn: 'dawn',
  dawn: 'dawn',
  sunrise: 'sunrise',
  day: 'day',
  polarDay: 'day',
  sunset: 'sunset',
  dusk: 'dusk',
  nauticalDusk: 'dusk',
  astronomicalDusk: 'dusk',
};

// Number of premade moon frames (§6.5). 28 ≈ one frame per day of the 29.53-day
// synodic month, and 28 divides evenly by 4 so the cardinal phases land on exact
// frames: 0 = New, 7 = First Quarter, 14 = Full, 21 = Last Quarter. Files are
// src/assets/moon/moon-00.webp … moon-27.webp (see scripts/gen-assets.cjs).
const MOON_FRAMES = 28;

export class StaticImageProvider extends ImageProvider {
  /** @param {string} [base] URL prefix; defaults to the Vite base (works under /signalk-sun-moon/). */
  constructor(base) {
    super();
    if (base === undefined) {
      // import.meta.env.BASE_URL is './' per vite.config; normalize to end with '/'.
      base = (import.meta.env && import.meta.env.BASE_URL) || './';
    }
    if (base.charAt(base.length - 1) !== '/') base += '/';
    this.base = base;
  }

  getSunImage(state) {
    const file = SUN_FILE[state] || 'day';
    return this.img(this.base + 'sun/' + file + '.webp', 'Sun graphic: ' + state);
  }

  getMoonImage(moonData) {
    if (!moonData || !moonData.illumination) return null;
    const illum = moonData.illumination;
    const frame = moonFrame(illum.phase);
    const pct = typeof illum.fraction === 'number'
      ? ', ' + Math.round(illum.fraction * 100) + '% illuminated' : '';
    const alt = 'Moon: ' + (illum.phaseName || 'phase') + pct;
    return this.img(this.base + 'moon/moon-' + pad2(frame) + '.webp', alt);
  }

  img(src, alt) {
    const el = document.createElement('img');
    el.setAttribute('src', src);
    el.setAttribute('alt', alt);
    el.setAttribute('decoding', 'async');
    return el;
  }
}

/**
 * Map illumination.phase (0..1, monotonic around the cycle) to a frame index
 * 0..27. We key on `phase` — not `phaseName` (too coarse now) and not
 * `fraction` (symmetric about full, so it can't tell waxing from waning). phase
 * wraps at 1.0 back to the new moon, so the result is taken mod MOON_FRAMES.
 */
function moonFrame(phase) {
  if (typeof phase !== 'number' || !isFinite(phase)) return 0;
  const wrapped = ((phase % 1) + 1) % 1; // normalize into [0, 1)
  return Math.round(wrapped * MOON_FRAMES) % MOON_FRAMES;
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}
