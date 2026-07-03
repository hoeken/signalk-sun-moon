/**
 * Parse an SVG markup string into a live SVG DOM node, ready to append into a
 * card's 4:3 graphic slot.
 *
 * We parse as `image/svg+xml` (strict XML) so camelCase SVG attributes such as
 * `viewBox` and `gradientUnits` keep their case, then `importNode` into the main
 * document. DOMParser + importNode both exist in Chromium 69 (§2.1).
 */
export function svgFromString(markup) {
  const doc = new DOMParser().parseFromString(String(markup).trim(), 'image/svg+xml');
  const root = doc.documentElement;
  // On a parse error the browser returns a <parsererror> document.
  if (!root || root.nodeName === 'parsererror' || root.getElementsByTagName('parsererror').length) {
    return null;
  }
  return document.importNode(root, true);
}

/** Round to at most `n` decimals and stringify (keeps generated SVG compact). */
export function num(x, n) {
  if (n === undefined) n = 2;
  if (typeof x !== 'number' || !isFinite(x)) return '0';
  const f = Math.pow(10, n);
  return String(Math.round(x * f) / f);
}
