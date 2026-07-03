import { svgFromString, num } from './svgDom.js';

/**
 * Draws the phase-accurate, observer-oriented moon SVG (§6.5).
 *
 * Method: draw the lit region symmetric about the vertical axis (bright limb
 * pointing straight up), then rotate the whole disc by the bright-limb zenith
 * angle so it looks correct from the observer's location ("moon on its back").
 *
 *  - Lit shape from `illumination.fraction`: full disc (shadow), a lit upper
 *    half-disc, then a terminator ellipse (vertical radius R·|1−2·fraction|)
 *    that is *added* in shadow for a crescent (fraction < 0.5) or *added* in
 *    light for a gibbous (fraction > 0.5).
 *  - Because the shape is symmetric about the bright-limb axis, orienting it by
 *    the true bright-limb angle inherently handles waxing vs. waning; the API's
 *    `waxing` flag is accepted but not needed to pick a side.
 *  - Orientation: `zenithAngleDeg` is measured anticlockwise, so the SVG
 *    rotation is its negation (§6.5 step 2 / §8).
 *
 * Pure SVG, no canvas — crisp on MFDs and cheap to redraw.
 */

const LIT = '#e9edf3';
const SHADOW = '#2b3242';
const EDGE = '#12151f';
// Laid out in a 100x75 (4:3) frame: the disc is centred and sized to the shorter
// (height) dimension, so it keeps its original on-card size with room to spare
// horizontally.
const R = 33;
const CX = 50;
const CY = 37.5;

let uid = 0;

export class MoonRenderer {
  /** @param {object} moon the `moon` object from the API (§4.5) → SVG element (or null). */
  render(moon) {
    return svgFromString(this.toMarkup(moon));
  }

  toMarkup(moon) {
    const illum = (moon && moon.illumination) || {};
    let f = typeof illum.fraction === 'number' ? illum.fraction : 0;
    if (f < 0) f = 0;
    if (f > 1) f = 1;

    const zenith = moon && moon.brightLimb && typeof moon.brightLimb.zenithAngleDeg === 'number'
      ? moon.brightLimb.zenithAngleDeg : 0;
    const rot = -zenith; // anticlockwise angle → clockwise SVG rotation

    const id = 'moon' + (++uid);
    const shadeId = id + '-shade';
    const litId = id + '-lit';

    // Terminator ellipse vertical radius; the branch decides its colour.
    const ty = R * Math.abs(1 - 2 * f);
    let terminator = '';
    if (f > 0.5) {
      terminator = '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + R + '" ry="' + num(ty) +
        '" fill="url(#' + litId + ')"/>';
    } else if (f < 0.5) {
      terminator = '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + R + '" ry="' + num(ty) +
        '" fill="' + SHADOW + '"/>';
    }

    // Upper half-disc (bright limb up): arc from left point, over the top, to the
    // right point, closed along the diameter.
    const topHalf = '<path d="M ' + (CX - R) + ' ' + CY +
      ' A ' + R + ' ' + R + ' 0 0 1 ' + (CX + R) + ' ' + CY + ' Z" fill="url(#' + litId + ')"/>';

    const defs =
      '<radialGradient id="' + litId + '" cx="0.42" cy="0.4" r="0.75">' +
        '<stop offset="0" stop-color="#ffffff"/>' +
        '<stop offset="0.7" stop-color="' + LIT + '"/>' +
        '<stop offset="1" stop-color="#c7ccd6"/>' +
      '</radialGradient>' +
      // Subtle limb shading over the whole disc (darkens the edge a touch).
      '<radialGradient id="' + shadeId + '" cx="0.5" cy="0.5" r="0.5">' +
        '<stop offset="0.82" stop-color="#000000" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#000000" stop-opacity="0.28"/>' +
      '</radialGradient>';

    const disc =
      '<g transform="rotate(' + num(rot) + ' ' + CX + ' ' + CY + ')">' +
        '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="' + SHADOW + '"/>' +
        topHalf +
        terminator +
      '</g>';

    // Overlay shading + crisp outline (rotation-invariant, so drawn un-rotated).
    const overlay =
      '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="url(#' + shadeId + ')"/>' +
      '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" stroke="' + EDGE + '" stroke-width="0.8"/>';

    const label = 'Moon: ' + (illum.phaseName || 'phase') +
      ', ' + Math.round(f * 100) + '% illuminated';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75" role="img" ' +
      'aria-label="' + label + '" preserveAspectRatio="xMidYMid meet">' +
      '<defs>' + defs + '</defs>' +
      '<rect x="0" y="0" width="100" height="75" fill="#0a0f1e"/>' +
      disc + overlay +
      '</svg>';
  }
}
