// Generates the PWA icons (ascending bars on indigo) without any image dependencies.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [67, 56, 202];
const FG = [255, 255, 255];
const ACCENT = [134, 239, 172];

function png(size, safe) {
  const px = Buffer.alloc(size * size * 4);
  const r = size * 0.22; // corner radius for the non-maskable icon
  const inset = (1 - safe) / 2;
  const bars = [0.35, 0.55, 0.8];
  const barW = 0.16, gap = 0.07;
  const total = bars.length * barW + (bars.length - 1) * gap;
  const left = inset + (safe - total * safe) / 2;
  const baseY = inset + safe * 0.82;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let inside = true;
      if (safe === 1) {
        const cx = Math.min(Math.max(x, r), size - r), cy = Math.min(Math.max(y, r), size - r);
        inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
      }
      if (!inside) continue;
      let c = BG;
      const u = x / size, v = y / size;
      bars.forEach((h, k) => {
        const bx = left + k * (barW + gap) * safe;
        const top = baseY - h * safe * 0.62;
        if (u >= bx && u <= bx + barW * safe && v >= top && v <= baseY) c = k === bars.length - 1 ? ACCENT : FG;
      });
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}

const out = 'src/assets/icons';
writeFileSync(`${out}/icon-192.png`, png(192, 1));
writeFileSync(`${out}/icon-512.png`, png(512, 1));
writeFileSync(`${out}/maskable-512.png`, png(512, 0.7));
writeFileSync(`${out}/apple-touch-icon.png`, png(180, 0.85)); // full-bleed: iOS applies its own rounding
writeFileSync('src/assets/icon/favicon.png', png(64, 1));
console.log('icons written');
