// Hex color to OKLCH conversion for DaisyUI 4.x CSS variables
// Pipeline: hex -> sRGB -> linear sRGB -> XYZ D65 -> OKLAB -> OKLCH

function hexToSrgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearSrgbToXyz(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  return [
    0.4123908 * r + 0.3575843 * g + 0.1804808 * b,
    0.2126390 * r + 0.7151687 * g + 0.0721923 * b,
    0.0193308 * r + 0.1191950 * g + 0.9505322 * b,
  ];
}

function xyzToOklab(xyz) {
  const [x, y, z] = xyz;
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

function oklabToOklch(lab) {
  const [L, a, b] = lab;
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, C, h];
}

/**
 * Convert a hex color string to OKLCH values for DaisyUI 4.x.
 * Returns "L C H" string (space-separated, suitable for CSS variable).
 * Example: "#007ACC" -> "0.5383 0.1465 243.47"
 */
export function hexToOklch(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const srgb = hexToSrgb(hex);
  const xyz = linearSrgbToXyz(srgb);
  const oklab = xyzToOklab(xyz);
  const [L, C, H] = oklabToOklch(oklab);
  // DaisyUI expects: L% C H (L as percentage 0-100, C as decimal, H as degrees)
  return `${(L * 100).toFixed(2)}% ${C.toFixed(4)} ${H.toFixed(2)}`;
}
