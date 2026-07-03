import { ImageProvider } from './ImageProvider.js';

/**
 * Alternative provider (§6.5): returns premade assets keyed by (collapsed) sun
 * state and moon phase, served from `<base>/sun/*.webp` and `<base>/moon/*.webp`.
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

const MOON_FILE = {
  'New Moon': 'new',
  'Waxing Crescent': 'waxing-crescent',
  'First Quarter': 'first-quarter',
  'Waxing Gibbous': 'waxing-gibbous',
  'Full Moon': 'full',
  'Waning Gibbous': 'waning-gibbous',
  'Last Quarter': 'last-quarter',
  'Waning Crescent': 'waning-crescent',
};

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
    const name = moonData.illumination.phaseName;
    const file = MOON_FILE[name] || 'full';
    return this.img(this.base + 'moon/' + file + '.webp', 'Moon: ' + name);
  }

  img(src, alt) {
    const el = document.createElement('img');
    el.setAttribute('src', src);
    el.setAttribute('alt', alt);
    el.setAttribute('decoding', 'async');
    return el;
  }
}
