import { svgFromString, num } from './svgDom.js';

/**
 * Builds the sun graphic for a given `sun.state`. The fine-grained §4.6 states
 * collapse onto a small visual set (§6.5): night / twilight (dawn·dusk) /
 * horizon (sunrise·sunset) / day. Pure SVG (no canvas) so it's crisp on MFDs.
 */

// Fine state -> visual bucket.
const VISUAL = {
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

// Per-visual palette + sun placement, laid out in a 100x75 (4:3) frame. Horizon
// sits at y=52.5 (70% down the frame); sun `r` is a width-relative radius.
const SCENES = {
  day: { skyTop: '#1e6fb8', skyBot: '#9fd0f5', ground: '#0f4c81', sun: { cy: 22.5, r: 13, core: '#ffd23f', glow: '#ffe89a' }, rays: true, stars: 0 },
  sunrise: { skyTop: '#3c4c86', skyBot: '#ffbe86', ground: '#274169', sun: { cy: 49.5, r: 13, core: '#ff9b3d', glow: '#ffd39a' }, rays: false, stars: 0 },
  sunset: { skyTop: '#43305f', skyBot: '#ff8f61', ground: '#2b2050', sun: { cy: 49.5, r: 13, core: '#ff6f42', glow: '#ffb489' }, rays: false, stars: 0 },
  dawn: { skyTop: '#122240', skyBot: '#6f6ea0', ground: '#0c1830', sun: null, rays: false, stars: 5, glow: '#8a6bb0' },
  dusk: { skyTop: '#1a1638', skyBot: '#7c4c76', ground: '#120e2a', sun: null, rays: false, stars: 6, glow: '#7a4a72' },
  night: { skyTop: '#05091a', skyBot: '#0d1836', ground: '#070c1e', sun: null, rays: false, stars: 12 },
};

// A small fixed constellation so "night" looks intentional, not random.
const STAR_FIELD = [
  [14, 12], [30, 7.5], [46, 16.5], [62, 9], [78, 13.5], [88, 22.5],
  [22, 25.5], [54, 28.5], [72, 33], [12, 37.5], [40, 39], [84, 42],
];

let uid = 0;

export class SunGraphicRenderer {
  /** @param {string} state one of the §4.6 states → returns an SVG element (or null). */
  render(state) {
    return svgFromString(this.toMarkup(state));
  }

  /** Pure string form (handy for tests / static export). */
  toMarkup(state) {
    const scene = SCENES[VISUAL[state] || 'day'] || SCENES.day;
    const id = 'sun' + (++uid);
    const skyId = id + '-sky';
    const glowId = id + '-glow';

    let defs = '<linearGradient id="' + skyId + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + scene.skyTop + '"/>' +
      '<stop offset="1" stop-color="' + scene.skyBot + '"/>' +
      '</linearGradient>';

    let body = '<rect x="0" y="0" width="100" height="75" fill="url(#' + skyId + ')"/>';

    // Stars (twilight/night).
    if (scene.stars > 0) {
      body += '<g fill="#f4f6ff">';
      for (let i = 0; i < scene.stars && i < STAR_FIELD.length; i++) {
        const s = STAR_FIELD[i];
        const r = 0.5 + (i % 3) * 0.35;
        const op = scene.stars > 8 ? 0.9 : 0.55;
        body += '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + num(r) + '" opacity="' + op + '"/>';
      }
      body += '</g>';
    }

    // Horizon glow for twilight scenes.
    if (scene.glow) {
      defs += '<radialGradient id="' + glowId + '" cx="0.5" cy="1" r="0.75">' +
        '<stop offset="0" stop-color="' + scene.glow + '" stop-opacity="0.9"/>' +
        '<stop offset="1" stop-color="' + scene.glow + '" stop-opacity="0"/>' +
        '</radialGradient>';
      body += '<rect x="0" y="26.25" width="100" height="33.75" fill="url(#' + glowId + ')"/>';
    }

    // Sun disc (+ soft glow, + rays for day).
    if (scene.sun) {
      const sun = scene.sun;
      defs += '<radialGradient id="' + glowId + '2" cx="0.5" cy="0.5" r="0.5">' +
        '<stop offset="0" stop-color="' + sun.glow + '" stop-opacity="0.9"/>' +
        '<stop offset="1" stop-color="' + sun.glow + '" stop-opacity="0"/>' +
        '</radialGradient>';
      if (scene.rays) {
        body += this.rays(50, sun.cy, sun.r, sun.glow);
      }
      body += '<circle cx="50" cy="' + sun.cy + '" r="' + num(sun.r * 1.9) + '" fill="url(#' + glowId + '2)"/>';
      body += '<circle cx="50" cy="' + sun.cy + '" r="' + num(sun.r) + '" fill="' + sun.core + '"/>';
    }

    // Sea / ground band.
    body += '<rect x="0" y="52.5" width="100" height="22.5" fill="' + scene.ground + '"/>';
    body += '<rect x="0" y="52.5" width="100" height="0.9" fill="#ffffff" opacity="0.18"/>';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75" role="img" ' +
      'aria-label="Sun graphic: ' + state + '" preserveAspectRatio="xMidYMid meet">' +
      '<defs>' + defs + '</defs>' + body + '</svg>';
  }

  rays(cx, cy, r, color) {
    let g = '<g stroke="' + color + '" stroke-width="2" stroke-linecap="round" opacity="0.85">';
    const n = 8;
    const inner = r * 1.35;
    const outer = r * 1.9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * inner;
      const y1 = cy + Math.sin(a) * inner;
      const x2 = cx + Math.cos(a) * outer;
      const y2 = cy + Math.sin(a) * outer;
      g += '<line x1="' + num(x1) + '" y1="' + num(y1) + '" x2="' + num(x2) + '" y2="' + num(y2) + '"/>';
    }
    return g + '</g>';
  }
}
