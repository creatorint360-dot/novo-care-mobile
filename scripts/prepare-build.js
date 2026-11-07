'use strict';
// Gets the app ready to be built as a real, installable Android app:
//   1. draws the Novo Care icons (PNG) into assets/ with plain code
//   2. puts the app name and package id into app.json
//   3. adds an "preview" build that produces an .apk file in eas.json
// Run once from the project folder:  node scripts/prepare-build.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const C1 = [255, 122, 89];    // coral
const C2 = [124, 92, 252];    // violet

// Letter N as three shapes in a 0..1 square (centre 0.5, 0.5).
function letterN(k) {
  const t = 0.105;
  const L = 0.5 - 0.20 * k, R = 0.5 + 0.20 * k, T = 0.5 - 0.23 * k, B = 0.5 + 0.23 * k, w = t * k;
  return [
    [[L, T], [L + w, T], [L + w, B], [L, B]],
    [[R - w, T], [R, T], [R, B], [R - w, B]],
    [[L, T], [L + w * 1.25, T], [R, B], [R - w * 1.25, B]],
  ];
}
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inRoundedSquare(x, y, r) {
  if (r <= 0) return true;
  const cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

// mode: 'full'  coloured square with a white N
//       'back'  the coloured square only (adaptive icon background)
//       'front' a white N on a see-through background (adaptive icon foreground)
//       'mono'  a black N on a see-through background (Android themed icon)
function render(size, radius, letterScale, mode) {
  const shapes = letterN(letterScale);
  const SS = 3;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) / size, y = (py + (sy + 0.5) / SS) / size;
        if (mode !== 'front' && mode !== 'mono' && !inRoundedSquare(x, y, radius)) continue;
        const onLetter = shapes.some((s) => inPoly(x, y, s));
        let c;
        if (mode === 'back') c = C1.map((v, i) => v + (C2[i] - v) * ((x + y) / 2));
        else if (mode === 'front') { if (!onLetter) continue; c = [255, 255, 255]; }
        else if (mode === 'mono') { if (!onLetter) continue; c = [0, 0, 0]; }
        else c = onLetter ? [255, 255, 255] : C1.map((v, i) => v + (C2[i] - v) * ((x + y) / 2));
        r += c[0]; g += c[1]; b += c[2]; a += 255;
      }
      const n = SS * SS, o = py * (size * 4 + 1) + 1 + px * 4, cov = a / 255;
      raw[o] = cov ? Math.round(r / cov) : 0;
      raw[o + 1] = cov ? Math.round(g / cov) : 0;
      raw[o + 2] = cov ? Math.round(b / cov) : 0;
      raw[o + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, raw);
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- 1. icons ----
const assets = path.join(ROOT, 'assets');
fs.mkdirSync(assets, { recursive: true });
const icons = [
  ['icon.png', 1024, 0, 0.8, 'full'],                       // the app icon (the phone rounds the corners)
  ['android-icon-background.png', 512, 0, 1, 'back'],
  ['android-icon-foreground.png', 512, 0, 0.62, 'front'],   // the N stays inside the safe middle
  ['android-icon-monochrome.png', 432, 0, 0.62, 'mono'],
  ['splash-icon.png', 1024, 0.25, 1, 'full'],
  ['favicon.png', 48, 0.25, 1, 'full'],
];
for (const [name, size, radius, scale, mode] of icons) {
  fs.writeFileSync(path.join(assets, name), render(size, radius, scale, mode));
  console.log('made assets/' + name);
}

// ---- 2. app.json ----
const appPath = path.join(ROOT, 'app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
app.expo = app.expo || {};
app.expo.name = 'Novo Care';
app.expo.android = app.expo.android || {};
app.expo.android.package = 'com.novostaff.app';
app.expo.ios = app.expo.ios || {};
app.expo.ios.bundleIdentifier = 'com.novostaff.app';
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');
console.log('updated app.json (name Novo Care, package com.novostaff.app)');

// ---- 3. eas.json: a "preview" build that makes an installable .apk ----
const easPath = path.join(ROOT, 'eas.json');
const eas = fs.existsSync(easPath) ? JSON.parse(fs.readFileSync(easPath, 'utf8')) : {};
eas.build = eas.build || {};
eas.build.preview = Object.assign({}, eas.build.preview, { distribution: 'internal', android: { buildType: 'apk' } });
fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + '\n');
console.log('updated eas.json (preview build = .apk file)');
