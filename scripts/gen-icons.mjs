// Generates every derived app/web icon from the single master logo at
// sunmoon-logo.png (repo root).
//
// The master is intentionally large and lives at the repo root — outside Vite's
// publicDir (src/assets) and outside package.json "files" — so it is never
// copied into the build output (public/) nor shipped in the npm tarball. It is
// used only as the source for the icons produced here.
//
// Outputs land in src/assets/ (Vite's publicDir). `vite build` then copies them
// verbatim into public/, which is what Signal K serves and what ships. See §7.1.
//
// Run via `npm run icons`.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = resolve(root, "sunmoon-logo.png");
const ASSETS = resolve(root, "src/assets");
const FAVICONS = resolve(ASSETS, "favicons");

// Standalone PNG outputs: [relative path under src/assets, edge size in px].
// Covers the Signal K appstore icon, the web favicons, the iOS/Apple
// home-screen icon, and the Android/PWA manifest icons.
const PNG_TARGETS = [
  // Signal K appstore icon (package.json "signalk.appIcon") + a larger variant.
  { file: "icons/icon-72x72.png", size: 72 },
  { file: "icons/icon-512x512.png", size: 512 },
  // Browser favicons.
  { file: "favicons/favicon-16x16.png", size: 16 },
  { file: "favicons/favicon-32x32.png", size: 32 },
  // Apple / iOS home-screen icon.
  { file: "favicons/apple-touch-icon.png", size: 180 },
  // Android / PWA manifest icons (referenced by site.webmanifest).
  { file: "favicons/android-chrome-192x192.png", size: 192 },
  { file: "favicons/android-chrome-512x512.png", size: 512 },
];

// Sizes packed into the multi-resolution favicon.ico.
const ICO_SIZES = [16, 32, 48];

// Android adaptive-icon "maskable" variants (site.webmanifest, purpose
// "maskable"). The launcher crops these to a circle/squircle, so the logo must
// stay inside a central "safe zone" and the background must fill edge-to-edge —
// otherwise the corners get clipped or shown on a white circle. We scale the
// master into SAFE_ZONE of the canvas and pad the rest with the master's own
// background colour.
const MASKABLE_TARGETS = [
  { file: "favicons/maskable-192x192.png", size: 192 },
  { file: "favicons/maskable-512x512.png", size: 512 },
];

// Fraction of the maskable canvas the logo occupies. The maskable spec's
// minimum safe zone is the central 80%-diameter circle; 0.8 keeps the whole
// master (including its own padding) inside it with margin to spare.
const SAFE_ZONE = 0.8;

// Render the master down to `size`, letterboxing onto transparency so a
// non-square master would never be cropped (the current master is square).
function render(size) {
  return sharp(SOURCE)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 });
}

// The master's edge colour, used to fill the padding of maskable icons so it
// blends seamlessly with the master's own background. Falls back to white if
// the master's corner is transparent.
async function sampleBackground() {
  const [r, g, b, a] = await sharp(SOURCE)
    .ensureAlpha()
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  return a < 128 ? { r: 255, g: 255, b: 255 } : { r, g, b };
}

// Render a maskable icon: the master scaled to SAFE_ZONE of `size`, centred on
// an opaque `size`x`size` canvas of `bg` so the mask only ever crops background.
async function renderMaskable(size, bg) {
  const inner = Math.round(size * SAFE_ZONE);
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: bg })
    .toBuffer();
  // Centre the logo on an opaque `size`x`size` canvas of `bg` so the launcher
  // mask only ever crops solid background, never the logo. (composite emits a
  // 4-band image, but every pixel is fully opaque — alpha 255 — as required.)
  return sharp({
    create: { width: size, height: size, channels: 3, background: bg },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 });
}

async function main() {
  const meta = await sharp(SOURCE).metadata();
  const largest = Math.max(...PNG_TARGETS.map((t) => t.size), ...ICO_SIZES);
  if (Math.min(meta.width, meta.height) < largest) {
    console.warn(
      `WARNING: master ${SOURCE} is ${meta.width}x${meta.height}; smaller ` +
        `than the largest target (${largest}px). Icons will be upscaled and ` +
        `may look blurry — supply a larger master.`,
    );
  }

  await mkdir(FAVICONS, { recursive: true });

  for (const { file, size } of PNG_TARGETS) {
    const out = resolve(ASSETS, file);
    await render(size).toFile(out);
    console.log(`  ${file} (${size}x${size})`);
  }

  const bg = await sampleBackground();
  for (const { file, size } of MASKABLE_TARGETS) {
    const out = resolve(ASSETS, file);
    await (await renderMaskable(size, bg)).toFile(out);
    console.log(`  ${file} (${size}x${size}, maskable)`);
  }

  const icoBuffers = await Promise.all(
    ICO_SIZES.map((size) => render(size).toBuffer()),
  );
  const ico = await pngToIco(icoBuffers);
  await writeFile(resolve(FAVICONS, "favicon.ico"), ico);
  console.log(`  favicons/favicon.ico (${ICO_SIZES.join(", ")})`);
}

console.log(`Generating icons from ${SOURCE}`);
main().then(
  () => console.log("Icons generated."),
  (err) => {
    console.error(`Icon generation failed: ${err.message}`);
    process.exit(1);
  },
);
