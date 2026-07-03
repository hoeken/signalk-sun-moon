'use strict';

/*
 * Generates the premade assets used by StaticImageProvider and the plugin app
 * icon. Run with `node scripts/gen-assets.cjs` (also wired to `npm run assets`).
 *
 *   src/assets/sun/<state>.svg    day, sunrise, sunset, dawn, dusk, night
 *   src/assets/moon/<phase>.svg   8 phases (upright, side-lit convention)
 *   src/assets/icons/icon-72x72.png
 *
 * These are static art; the observer-oriented moon is drawn live by MoonRenderer.
 */

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var ROOT = path.join(__dirname, '..', 'src', 'assets');

function write(rel, contents) {
  var full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  console.log('wrote', path.relative(path.join(__dirname, '..'), full));
}

// ---------------------------------------------------------------- sun scenes

var SUN_SCENES = {
  day: { top: '#1e6fb8', bot: '#9fd0f5', ground: '#0f4c81', sun: { cy: 30, core: '#ffd23f', glow: '#ffe89a' }, rays: true, stars: 0 },
  sunrise: { top: '#3c4c86', bot: '#ffbe86', ground: '#274169', sun: { cy: 66, core: '#ff9b3d', glow: '#ffd39a' }, rays: false, stars: 0 },
  sunset: { top: '#43305f', bot: '#ff8f61', ground: '#2b2050', sun: { cy: 66, core: '#ff6f42', glow: '#ffb489' }, rays: false, stars: 0 },
  dawn: { top: '#122240', bot: '#6f6ea0', ground: '#0c1830', sun: null, rays: false, stars: 5, glow: '#8a6bb0' },
  dusk: { top: '#1a1638', bot: '#7c4c76', ground: '#120e2a', sun: null, rays: false, stars: 6, glow: '#7a4a72' },
  night: { top: '#05091a', bot: '#0d1836', ground: '#070c1e', sun: null, rays: false, stars: 12 },
};

var STARS = [[14, 16], [30, 10], [46, 22], [62, 12], [78, 18], [88, 30], [22, 34], [54, 38], [72, 44], [12, 50], [40, 52], [84, 56]];

function sunSvg(name, s) {
  var defs = '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.top + '"/><stop offset="1" stop-color="' + s.bot + '"/></linearGradient>';
  var body = '<rect width="100" height="100" fill="url(#sky)"/>';
  if (s.stars) {
    body += '<g fill="#f4f6ff">';
    for (var i = 0; i < s.stars && i < STARS.length; i++) {
      body += '<circle cx="' + STARS[i][0] + '" cy="' + STARS[i][1] + '" r="' + (0.5 + (i % 3) * 0.35) + '" opacity="' + (s.stars > 8 ? 0.9 : 0.55) + '"/>';
    }
    body += '</g>';
  }
  if (s.glow) {
    defs += '<radialGradient id="hg" cx="0.5" cy="1" r="0.75"><stop offset="0" stop-color="' + s.glow + '" stop-opacity="0.9"/><stop offset="1" stop-color="' + s.glow + '" stop-opacity="0"/></radialGradient>';
    body += '<rect x="0" y="35" width="100" height="45" fill="url(#hg)"/>';
  }
  if (s.sun) {
    defs += '<radialGradient id="sg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="' + s.sun.glow + '" stop-opacity="0.9"/><stop offset="1" stop-color="' + s.sun.glow + '" stop-opacity="0"/></radialGradient>';
    if (s.rays) {
      body += '<g stroke="' + s.sun.glow + '" stroke-width="2" stroke-linecap="round" opacity="0.85">';
      for (var r = 0; r < 8; r++) {
        var a = (r / 8) * Math.PI * 2;
        body += '<line x1="' + f(50 + Math.cos(a) * 17.5) + '" y1="' + f(s.sun.cy + Math.sin(a) * 17.5) + '" x2="' + f(50 + Math.cos(a) * 24.7) + '" y2="' + f(s.sun.cy + Math.sin(a) * 24.7) + '"/>';
      }
      body += '</g>';
    }
    body += '<circle cx="50" cy="' + s.sun.cy + '" r="24.7" fill="url(#sg)"/>';
    body += '<circle cx="50" cy="' + s.sun.cy + '" r="13" fill="' + s.sun.core + '"/>';
  }
  body += '<rect x="0" y="70" width="100" height="30" fill="' + s.ground + '"/>';
  body += '<rect x="0" y="70" width="100" height="1.2" fill="#ffffff" opacity="0.18"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Sun: ' + name + '"><defs>' + defs + '</defs>' + body + '</svg>\n';
}

function f(x) { return Math.round(x * 100) / 100; }

// ---------------------------------------------------------------- moon phases

var LIT = '#e9edf3', SHADOW = '#2b3242', EDGE = '#12151f', R = 44, C = 50;

// [slug, fraction, litSide]  (side-lit convention: waxing right, waning left)
var MOON_PHASES = [
  ['new', 0, 'right'],
  ['waxing-crescent', 0.25, 'right'],
  ['first-quarter', 0.5, 'right'],
  ['waxing-gibbous', 0.75, 'right'],
  ['full', 1, 'right'],
  ['waning-gibbous', 0.75, 'left'],
  ['last-quarter', 0.5, 'left'],
  ['waning-crescent', 0.25, 'left'],
];

function moonSvg(slug, frac, side) {
  var tx = R * Math.abs(1 - 2 * frac); // terminator horizontal radius
  // Lit half-disc: right or left semicircle.
  var half = side === 'right'
    ? '<path d="M ' + C + ' ' + (C - R) + ' A ' + R + ' ' + R + ' 0 0 1 ' + C + ' ' + (C + R) + ' Z" fill="url(#lit)"/>'
    : '<path d="M ' + C + ' ' + (C - R) + ' A ' + R + ' ' + R + ' 0 0 0 ' + C + ' ' + (C + R) + ' Z" fill="url(#lit)"/>';
  var term = '';
  if (frac > 0.5) term = '<ellipse cx="' + C + '" cy="' + C + '" rx="' + f(tx) + '" ry="' + R + '" fill="url(#lit)"/>';
  else if (frac < 0.5) term = '<ellipse cx="' + C + '" cy="' + C + '" rx="' + f(tx) + '" ry="' + R + '" fill="' + SHADOW + '"/>';
  var defs =
    '<radialGradient id="lit" cx="0.42" cy="0.4" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="' + LIT + '"/><stop offset="1" stop-color="#c7ccd6"/></radialGradient>' +
    '<radialGradient id="shade" cx="0.5" cy="0.5" r="0.5"><stop offset="0.82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Moon: ' + slug + '"><defs>' + defs + '</defs>' +
    '<rect width="100" height="100" fill="#0a0f1e"/>' +
    '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="' + SHADOW + '"/>' +
    half + term +
    '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="url(#shade)"/>' +
    '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="' + EDGE + '" stroke-width="0.8"/>' +
    '</svg>\n';
}

// ---------------------------------------------------------------- PNG icon

var CRC_TABLE = (function () {
  var t = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  var c = 0xffffffff;
  for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  var len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  var typeBuf = Buffer.from(type, 'ascii');
  var crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makeIcon(size) {
  var raw = Buffer.alloc(size * (size * 4 + 1));
  var sun = { x: size * 0.36, y: size * 0.36, r: size * 0.22, col: [255, 210, 63] };
  var moonR = size * 0.21;
  var moon = { x: size * 0.66, y: size * 0.66, r: moonR, carveX: size * 0.66 + moonR * 0.55, carveY: size * 0.66 - moonR * 0.35, carveR: moonR * 1.02, col: [207, 215, 230] };
  var bg = [10, 15, 30];

  for (var y = 0; y < size; y++) {
    var rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (var x = 0; x < size; x++) {
      var px = [bg[0], bg[1], bg[2], 255];
      // moon crescent (disc minus carve)
      var dm = (x - moon.x) * (x - moon.x) + (y - moon.y) * (y - moon.y);
      var dc = (x - moon.carveX) * (x - moon.carveX) + (y - moon.carveY) * (y - moon.carveY);
      if (dm <= moon.r * moon.r && dc > moon.carveR * moon.carveR) {
        px = [moon.col[0], moon.col[1], moon.col[2], 255];
      }
      // sun on top
      var ds = (x - sun.x) * (x - sun.x) + (y - sun.y) * (y - sun.y);
      if (ds <= sun.r * sun.r) {
        px = [sun.col[0], sun.col[1], sun.col[2], 255];
      }
      var o = rowStart + 1 + x * 4;
      raw[o] = px[0]; raw[o + 1] = px[1]; raw[o + 2] = px[2]; raw[o + 3] = px[3];
    }
  }

  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  var sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- run

Object.keys(SUN_SCENES).forEach(function (name) {
  write(path.join('sun', name + '.svg'), sunSvg(name, SUN_SCENES[name]));
});

MOON_PHASES.forEach(function (p) {
  write(path.join('moon', p[0] + '.svg'), moonSvg(p[0], p[1], p[2]));
});

write(path.join('icons', 'icon-72x72.png'), makeIcon(72));
write(path.join('icons', 'icon-512x512.png'), makeIcon(512));

console.log('done.');
