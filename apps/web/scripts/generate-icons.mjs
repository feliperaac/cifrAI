// Gera icones PWA (PNG) a partir de formas simples, sem dependencias. Arte original.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};

const BG = [168, 51, 15];
const FG = [251, 245, 234];

// safe: fracao do lado ocupada pelo desenho (maskable precisa de margem maior).
function render(size, { safe, rounded }) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  const s = size * safe;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let inside = true;
      if (rounded) {
        const dx = Math.max(r - x, 0, x - (size - 1 - r));
        const dy = Math.max(r - y, 0, y - (size - 1 - r));
        inside = dx * dx + dy * dy <= r * r;
      }
      // Desenho: 6 "cordas" verticais e uma casa (barra) sobre elas.
      const u = (x - cx) / s;
      const v = (y - cy) / s;
      let fg = false;
      if (Math.abs(v) <= 0.5) {
        for (let i = 0; i < 6; i++) {
          if (Math.abs(u - (-0.3 + i * 0.12)) <= 0.014) fg = true;
        }
        if (Math.abs(v - 0.12) <= 0.035 && Math.abs(u) <= 0.34) fg = true;
        if (Math.abs(v + 0.5) <= 0.02 && Math.abs(u) <= 0.34) fg = true;
      }
      const c = fg ? FG : BG;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
      raw[o + 3] = inside ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/', import.meta.url);
const files = {
  'icon-192.png': [192, { safe: 1.4, rounded: true }],
  'icon-512.png': [512, { safe: 1.4, rounded: true }],
  'icon-maskable-512.png': [512, { safe: 1.0, rounded: false }],
  'apple-touch-icon.png': [180, { safe: 1.4, rounded: false }],
};
for (const [name, [size, opts]] of Object.entries(files)) {
  writeFileSync(new URL(name, out), render(size, opts));
}
