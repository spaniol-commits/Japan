// Global colourway. Every colour in the city and on Bim passes through
// `tint()` (surfaces) or `tintGlow()` (lights, neon, lit windows), so the whole
// look can be switched in one place.
//
// 'pastel-blue' maps each colour onto a soft blue ramp by its brightness:
// dark parts become periwinkle, light parts icy white, and strongly coloured
// parts (lacquer red, neon) lean a little towards lavender so they still read.
// 'classic' keeps the original warm palette.

export const THEME = 'pastel-blue';

function parseHex(input) {
  if (typeof input !== 'string' || input[0] !== '#') return null;
  let h = input.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

const cache = new Map();

/** Surface colour → pastel blue. Non-hex values (rgba overlays, gradients) pass through. */
export function tint(color) {
  if (THEME === 'classic') return color;
  if (cache.has(color)) return cache.get(color);
  const rgb = parseHex(color);
  if (!rgb) return color;
  const [r, g, b] = rgb;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const hue = 214 + chroma * 24; // blue → periwinkle for vivid sources
  const sat = 0.5 + chroma * 0.25;
  const light = 0.57 + 0.39 * Math.pow(lum, 0.8);
  const out = hsl(hue, sat, light);
  cache.set(color, out);
  return out;
}

/** Emissive colour → cool glow (icy cyan to soft lavender). */
export function tintGlow(color) {
  if (THEME === 'classic') return color;
  const rgb = parseHex(color);
  if (!rgb) return color;
  const [r, g, b] = rgb;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return hsl(200 + chroma * 30, 0.9, 0.7 + (1 - chroma) * 0.18);
}
