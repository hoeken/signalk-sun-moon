"use strict";

/*
 * Generates the premade sun/moon art used by StaticImageProvider by resizing the
 * high-resolution source images down to a display-appropriate size.
 *
 * Sources live at the repo root — outside Vite's publicDir (src/assets) and
 * outside package.json "files" — so, like sunmoon-logo.png, they are inputs only:
 * never copied into the build output (public/) nor shipped in the npm tarball.
 *
 *   art/sun/<state>.png    day, sunrise, sunset, dawn, dusk, night
 *   art/moon/moon-NN.png   28-frame moon set, NN = 00..27 (see StaticImageProvider)
 *
 * All 28 moon frames must be present in art/moon/; a missing source is an error.
 *
 * Outputs land in src/assets/ (Vite's publicDir); `vite build` then copies them
 * verbatim into public/, which is what Signal K serves and what ships (§7.1).
 * They are emitted as WebP (photographic content, and the browserslist target
 * Chrome >= 69 supports it) so the shipped art stays small:
 *
 *   src/assets/sun/<state>.webp
 *   src/assets/moon/moon-NN.webp   (frame indices StaticImageProvider selects)
 *
 * These are the generic static art; the observer-oriented moon is still drawn
 * live by MoonRenderer. The app/favicon/PWA icons are generated separately from
 * the master logo by `npm run icons` (scripts/gen-icons.mjs).
 *
 * Run with `node scripts/gen-assets.cjs` (also wired to `npm run assets`).
 */

var fs = require("fs");
var path = require("path");
var sharp = require("sharp");

var ROOT = path.join(__dirname, "..");
var SRC = path.join(ROOT, "art");
var OUT = path.join(ROOT, "src", "assets");

// Dimensions (px) of the generated 4:3 art. The cards render the graphic at
// roughly ~460 CSS px wide at the widest layout; 1024 stays crisp well past
// 2x/retina while WebP keeps the shipped files small.
var WIDTH = 1024;
var HEIGHT = 768;

// WebP quality (0-100). 80 is visually indistinguishable from the source at this
// display size while shipping an order of magnitude smaller than PNG.
var QUALITY = 80;

// Sun source basename -> output slug. Identity: the source names already match
// StaticImageProvider's SUN_FILE targets.
var SUN = ["day", "sunrise", "sunset", "dawn", "dusk", "night"];

// Moon: 28-frame set. StaticImageProvider selects frame index round(phase*28)%28,
// so 00 = New, 07 = First Quarter, 14 = Full, 21 = Last Quarter.
var MOON_FRAMES = 28;

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

// Resize one 4:3 source into WIDTH x HEIGHT. Sources are already 4:3, so `cover`
// just downscales (and would center-crop a differently-proportioned source
// rather than letterbox it — matching the card's object-fit: cover).
async function resize(srcRel, outRel) {
  var inPath = path.join(SRC, srcRel);
  var outPath = path.join(OUT, outRel);

  if (!fs.existsSync(inPath)) {
    throw new Error("missing source " + path.relative(ROOT, inPath));
  }

  var meta = await sharp(inPath).metadata();
  if (meta.width < WIDTH || meta.height < HEIGHT) {
    console.warn(
      "WARNING: " + srcRel + " is " + meta.width + "x" + meta.height +
        "; smaller than the " + WIDTH + "x" + HEIGHT + " target. Output will be " +
        "upscaled and may look soft — supply a larger source.",
    );
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(inPath)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "center" })
    .webp({ quality: QUALITY })
    .toFile(outPath);
  console.log("  wrote", path.relative(ROOT, outPath), "(" + WIDTH + "x" + HEIGHT + ")");
}

async function main() {
  for (var i = 0; i < SUN.length; i++) {
    var name = SUN[i];
    await resize(path.join("sun", name + ".png"), path.join("sun", name + ".webp"));
  }
  for (var j = 0; j < MOON_FRAMES; j++) {
    var frame = "moon-" + pad2(j);
    await resize(path.join("moon", frame + ".png"), path.join("moon", frame + ".webp"));
  }
  console.log("done.");
}

console.log("Generating static art from " + path.relative(ROOT, SRC) + "/");
main().then(
  function () {},
  function (err) {
    console.error("Asset generation failed: " + err.message);
    process.exit(1);
  },
);
