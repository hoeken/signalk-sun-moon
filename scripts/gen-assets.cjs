'use strict';

/*
 * Generates the premade sun/moon art used by StaticImageProvider by resizing the
 * high-resolution source images down to a display-appropriate size.
 *
 * Sources live at the repo root — outside Vite's publicDir (src/assets) and
 * outside package.json "files" — so, like sunmoon-logo.png, they are inputs only:
 * never copied into the build output (public/) nor shipped in the npm tarball.
 *
 *   art/sun/<state>.png    day, sunrise, sunset, dawn, dusk, night
 *   art/moon/<file>.png    8 phases (new-moon, waxing-crescent, first-quarter, ...)
 *
 * Outputs land in src/assets/ (Vite's publicDir); `vite build` then copies them
 * verbatim into public/, which is what Signal K serves and what ships (§7.1).
 * They are emitted as WebP (photographic content, and the browserslist target
 * Chrome >= 69 supports it) so the shipped art stays small:
 *
 *   src/assets/sun/<state>.webp
 *   src/assets/moon/<phase>.webp   (slugs match StaticImageProvider's MOON_FILE)
 *
 * These are the generic static art; the observer-oriented moon is still drawn
 * live by MoonRenderer. The app/favicon/PWA icons are generated separately from
 * the master logo by `npm run icons` (scripts/gen-icons.mjs).
 *
 * Run with `node scripts/gen-assets.cjs` (also wired to `npm run assets`).
 */

var fs = require('fs');
var path = require('path');
var sharp = require('sharp');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'art');
var OUT = path.join(ROOT, 'src', 'assets');

// Edge length (px) of the generated square art. The cards render the graphic at
// roughly ~460 CSS px at the widest layout; 1024 stays crisp well past 2x/retina
// while WebP keeps the shipped files small.
var SIZE = 1024;

// WebP quality (0-100). 80 is visually indistinguishable from the source at this
// display size while shipping an order of magnitude smaller than PNG.
var QUALITY = 80;

// Sun source basename -> output slug. Identity: the source names already match
// StaticImageProvider's SUN_FILE targets.
var SUN = ['day', 'sunrise', 'sunset', 'dawn', 'dusk', 'night'];

// Moon source basename -> output slug (StaticImageProvider's MOON_FILE targets).
var MOON = {
  'new-moon': 'new',
  'waxing-crescent': 'waxing-crescent',
  'first-quarter': 'first-quarter',
  'waxing-gibbous': 'waxing-gibbous',
  'full-moon': 'full',
  'waning-gibbous': 'waning-gibbous',
  'last-quarter': 'last-quarter',
  'waning-crescent': 'waning-crescent',
};

// Resize one square source into SIZE x SIZE. Sources are already square, so
// `cover` just downscales (and would center-crop a non-square source rather than
// letterbox it — matching the card's object-fit: cover).
async function resize(srcRel, outRel) {
  var inPath = path.join(SRC, srcRel);
  var outPath = path.join(OUT, outRel);

  var meta = await sharp(inPath).metadata();
  if (Math.min(meta.width, meta.height) < SIZE) {
    console.warn(
      'WARNING: ' + srcRel + ' is ' + meta.width + 'x' + meta.height +
        '; smaller than the ' + SIZE + 'px target. Output will be upscaled and ' +
        'may look soft — supply a larger source.',
    );
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(inPath)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'center' })
    .webp({ quality: QUALITY })
    .toFile(outPath);
  console.log('  wrote', path.relative(ROOT, outPath), '(' + SIZE + 'x' + SIZE + ')');
}

async function main() {
  for (var i = 0; i < SUN.length; i++) {
    var name = SUN[i];
    await resize(path.join('sun', name + '.png'), path.join('sun', name + '.webp'));
  }
  var moonSources = Object.keys(MOON);
  for (var j = 0; j < moonSources.length; j++) {
    var src = moonSources[j];
    await resize(path.join('moon', src + '.png'), path.join('moon', MOON[src] + '.webp'));
  }
  console.log('done.');
}

console.log('Generating static art from ' + path.relative(ROOT, SRC) + '/');
main().then(
  function () {},
  function (err) {
    console.error('Asset generation failed: ' + err.message);
    process.exit(1);
  },
);
