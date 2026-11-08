/**
 * Genera les icones PNG de la PWA sense dependències externes.
 * Ús: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function blend(pixels, index, color, alpha) {
  const a = clamp01(alpha);
  pixels[index] = Math.round(pixels[index] * (1 - a) + color[0] * a);
  pixels[index + 1] = Math.round(pixels[index + 1] * (1 - a) + color[1] * a);
  pixels[index + 2] = Math.round(pixels[index + 2] * (1 - a) + color[2] * a);
  pixels[index + 3] = 255;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0 ? 0 : clamp01(((px - x1) * dx + (py - y1) * dy) / lengthSquared);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function renderIcon(size, padding = 0) {
  const pixels = Buffer.alloc(size * size * 4);
  const centerX = size / 2;
  const centerY = size / 2;
  const scale = 1 - padding * 2;
  const radius = size * 0.34 * scale;
  const ringWidth = size * 0.05 * scale;
  const needleWidth = size * 0.03 * scale;
  const needleLength = radius * 0.84;
  const needleAngle = -Math.PI / 3;
  const tipX = centerX + Math.cos(needleAngle) * needleLength;
  const tipY = centerY + Math.sin(needleAngle) * needleLength;
  const centerRadius = size * 0.037 * scale;

  const accent = [34, 211, 238];
  const white = [230, 237, 245];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const index = (y * size + x) * 4;

      pixels[index] = 11;
      pixels[index + 1] = 15;
      pixels[index + 2] = 20;
      pixels[index + 3] = 255;

      const distanceFromCenter = Math.hypot(px - centerX, py - centerY);

      const ringCoverage = clamp01(ringWidth / 2 + 0.5 - Math.abs(distanceFromCenter - radius));
      if (ringCoverage > 0) blend(pixels, index, accent, ringCoverage);

      const needleCoverage = clamp01(
        needleWidth / 2 + 0.5 - distanceToSegment(px, py, centerX, centerY, tipX, tipY),
      );
      if (needleCoverage > 0) blend(pixels, index, white, needleCoverage);

      const dotCoverage = clamp01(centerRadius + 0.5 - distanceFromCenter);
      if (dotCoverage > 0) blend(pixels, index, accent, dotCoverage);
    }
  }

  return pixels;
}

const outputs = [
  ['icons/icon-192.png', 192, 0],
  ['icons/icon-512.png', 512, 0],
  ['icons/maskable-512.png', 512, 0.1],
  ['apple-touch-icon.png', 180, 0],
];

for (const [relativePath, size, padding] of outputs) {
  const target = resolve(publicDir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, encodePng(size, size, renderIcon(size, padding)));
  console.log(`✓ ${relativePath} (${size}×${size})`);
}
