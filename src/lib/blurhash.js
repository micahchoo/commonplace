/**
 * Minimal BlurHash decoder — surfaces `image.blurhash` (dark data: normalized in model.js
 * but never rendered; see ISSUES D2 / ledgers/DARKDATA.md). Are.na ships a blurhash on every
 * image; decoding it to a tiny pixel buffer lets an image paint an instant blurred preview
 * while the full asset loads, instead of a blank slot. Pure (no DOM, no deps) — the caller
 * paints the RGBA buffer to a canvas. Algorithm: github.com/woltapp/blurhash (MIT).
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function decode83(str) {
  let value = 0;
  for (const ch of str) {
    const i = DIGITS.indexOf(ch);
    if (i === -1) return NaN;
    value = value * 83 + i;
  }
  return value;
}

const sRGBToLinear = (v) => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};

const linearTosRGB = (v) => {
  const x = Math.max(0, Math.min(1, v));
  return x <= 0.0031308
    ? Math.round(x * 12.92 * 255 + 0.5)
    : Math.round((1.055 * x ** (1 / 2.4) - 0.055) * 255 + 0.5);
};

const signPow = (v, exp) => (v < 0 ? -1 : 1) * Math.abs(v) ** exp;

/**
 * @param {string} hash - the blurhash string
 * @param {number} width - target pixel width (small, e.g. 32)
 * @param {number} height - target pixel height
 * @param {number} [punch=1] - contrast multiplier
 * @returns {Uint8ClampedArray|null} RGBA pixels (width*height*4), or null if malformed
 */
export function decodeBlurhash(hash, width, height, punch = 1) {
  if (typeof hash !== 'string' || hash.length < 6) return null;
  const sizeFlag = decode83(hash[0]);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;
  if (hash.length !== 4 + 2 * numX * numY) return null;

  const quantMax = decode83(hash[1]);
  const maxValue = (quantMax + 1) / 166;

  const colors = new Array(numX * numY);
  for (let i = 0; i < colors.length; i++) {
    if (i === 0) {
      const val = decode83(hash.substring(2, 6));
      colors[i] = [sRGBToLinear(val >> 16), sRGBToLinear((val >> 8) & 255), sRGBToLinear(val & 255)];
    } else {
      const val = decode83(hash.substring(4 + i * 2, 6 + i * 2));
      const q = maxValue * punch;
      colors[i] = [
        signPow((Math.floor(val / (19 * 19)) - 9) / 9, 2) * q,
        signPow(((Math.floor(val / 19) % 19) - 9) / 9, 2) * q,
        signPow(((val % 19) - 9) / 9, 2) * q,
      ];
    }
  }
  if (colors.some((c) => c.some((n) => Number.isNaN(n)))) return null;

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const c = colors[i + j * numX];
          r += c[0] * basis;
          g += c[1] * basis;
          b += c[2] * basis;
        }
      }
      const idx = 4 * (x + y * width);
      pixels[idx] = linearTosRGB(r);
      pixels[idx + 1] = linearTosRGB(g);
      pixels[idx + 2] = linearTosRGB(b);
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}
