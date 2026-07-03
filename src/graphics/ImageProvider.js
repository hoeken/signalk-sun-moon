/**
 * The graphics abstraction required by the brief (§6.5): all cards obtain their
 * graphics through an ImageProvider, so "generated SVG" and "premade assets" are
 * interchangeable without touching card code.
 *
 * Implementations return a DOM node (SVG element or <img>) that the card mounts
 * into its 4:3 graphic slot, or null when nothing can be drawn.
 */
export class ImageProvider {
  /**
   * @param {string} state one of the §4.6 sun states
   * @returns {Node|null}
   */
  // eslint-disable-next-line no-unused-vars
  getSunImage(state) {
    throw new Error("ImageProvider.getSunImage not implemented");
  }

  /**
   * @param {object} moonData the `moon` object from the API response (§4.5)
   * @returns {Node|null}
   */
  // eslint-disable-next-line no-unused-vars
  getMoonImage(moonData) {
    throw new Error("ImageProvider.getMoonImage not implemented");
  }

  /**
   * Optional hint that the given moon is now displayed, so a provider may warm
   * the browser cache for images likely needed next (e.g. the adjacent day's
   * moon frame when paging). Default no-op; safe to call repeatedly.
   * @param {object} moonData the `moon` object from the API response (§4.5)
   */
  // eslint-disable-next-line no-unused-vars
  preloadMoon(moonData) {}
}
