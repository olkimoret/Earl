// One-time script — generates public/icons/icon-192.png and icon-512.png
// No dependencies — uses only built-in Node.js modules.
// Run: node scripts/generate-icons.js

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/icons');

const BG = [42, 41, 56];    // #2A2938
const FG = [237, 232, 242]; // #EDE8F2

// 5×7 pixel bitmap glyphs
const GLYPHS = {
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  A: ['00100','01010','10001','11111','10001','10001','10001'],
  R: ['11110','10001','10001','11110','10010','10001','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
};
const WORD = ['E','A','R','L'];

function makeIcon(size) {
  // Scale so "EARL" spans ~58% of icon width
  // Raw word width: 4 glyphs × 5px + 3 gaps × 2px = 26 base px
  const scale  = Math.max(1, Math.round(size * 0.58 / 26));
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const gap    = 2 * scale;
  const textW  = WORD.length * glyphW + (WORD.length - 1) * gap;
  const textH  = glyphH;
  const x0     = Math.round((size - textW) / 2);
  const y0     = Math.round((size - textH) / 2);

  const px = new Uint8Array(size * size * 3);
  // Fill background
  for (let i = 0; i < px.length; i += 3) {
    px[i] = BG[0]; px[i + 1] = BG[1]; px[i + 2] = BG[2];
  }

  // Render each letter
  WORD.forEach((ch, ci) => {
    const rows = GLYPHS[ch];
    const ox   = x0 + ci * (glyphW + gap);
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== '1') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px_ = ox + rx * scale + sx;
            const py_ = y0 + ry * scale + sy;
            if (px_ < 0 || px_ >= size || py_ < 0 || py_ >= size) continue;
            const idx = (py_ * size + px_) * 3;
            px[idx] = FG[0]; px[idx + 1] = FG[1]; px[idx + 2] = FG[2];
          }
        }
      }
    });
  });

  return buildPNG(size, size, px);
}

// ── PNG encoder ───────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function buildPNG(w, h, rgb) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit depth, RGB colour type

  // Raw scanlines: filter byte (0=None) + RGB row
  const stride = 1 + w * 3;
  const raw    = Buffer.allocUnsafe(h * stride);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    Buffer.from(rgb).copy(raw, y * stride + 1, y * w * 3, (y + 1) * w * 3);
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Write files ───────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), makeIcon(192));
writeFileSync(join(OUT, 'icon-512.png'), makeIcon(512));
console.log('✓ Icons written to public/icons/');
