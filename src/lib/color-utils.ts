/**
 * Pure TypeScript HSL color manipulation utilities.
 * No DOM access, no side effects.
 */

const FALLBACK_HEX = "#C0C0C0";

/** Parse a 3- or 6-digit CSS hex string (with or without #) into 0–255 RGB. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  return null;
}

/** Convert 0–255 RGB to HSL (h: 0–360, s: 0–1, l: 0–1). */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

/** Convert HSL (h: 0–360, s: 0–1, l: 0–1) to 0–255 RGB. */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number): number => {
    const tn = ((t % 1) + 1) % 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

/** Format 0–255 RGB as a lowercase #rrggbb hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Parse a CSS hex color string to HSL components.
 * h: 0–360, s: 0–1, l: 0–1.
 * Falls back to #C0C0C0 (neutral gray) if input is invalid.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRgb(hex ?? "");
  if (!rgb) return hexToHsl(FALLBACK_HEX);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert HSL to a #rrggbb hex string.
 * h: 0–360, s: 0–1, l: 0–1.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sc = Math.max(0, Math.min(1, s));
  const lc = Math.max(0, Math.min(1, l));
  const { r, g, b } = hslToRgb(h, sc, lc);
  return rgbToHex(r, g, b);
}

/**
 * Multiply the saturation channel by `factor` (0–1) and return a new hex color.
 * Falls back to #C0C0C0 if input hex is invalid.
 */
export function desaturate(hex: string, factor: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s * factor, l);
}

/**
 * Multiply the lightness channel by `factor` and return a new hex color.
 * Falls back to #C0C0C0 if input hex is invalid.
 */
export function adjustLightness(hex: string, factor: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, l * factor);
}
