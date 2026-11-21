export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export const toRgbString = ({ r, g, b }: RgbColor) => `rgb(${r}, ${g}, ${b})`;

/** Parses "rgb(r, g, b)"; returns `fallback` for anything else. */
export function parseRgbString(css: string, fallback: RgbColor): RgbColor {
  const match = css.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return match ? { r: +match[1], g: +match[2], b: +match[3] } : fallback;
}

export const isSameRgb = (a: RgbColor, b: RgbColor) =>
  a.r === b.r && a.g === b.g && a.b === b.b;

export function rgbToHex({ r, g, b }: RgbColor): string {
  const hex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Accepts "#RGB" / "#RRGGBB" (with or without "#"). */
export function hexToRgb(raw: string): RgbColor | null {
  let clean = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    clean = clean.replace(/./g, (c) => c + c);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** Returns hue in degrees, saturation and lightness in percent. */
export function rgbToHsl({ r, g, b }: RgbColor) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): RgbColor {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hh = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ln - c / 2;
  const [r1, g1, b1] =
    hh < 60 ? [c, x, 0]
    : hh < 120 ? [x, c, 0]
    : hh < 180 ? [0, c, x]
    : hh < 240 ? [0, x, c]
    : hh < 300 ? [x, 0, c]
    : [c, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}
