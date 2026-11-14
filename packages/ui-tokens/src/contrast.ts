import { colors, contrastPairs, type ColorToken } from "./tokens";

export function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

export function sRgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * sRgbToLinear(r) + 0.7152 * sRgbToLinear(g) + 0.0722 * sRgbToLinear(b);
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1);
  const lum2 = relativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function verifyAllPairs(): Array<{
  pair: string;
  fg: string;
  bg: string;
  ratio: number;
  expectedMin: number;
  passed: boolean;
}> {
  return contrastPairs.map((p) => {
    const fgHex = colors[p.fg as ColorToken];
    const bgHex = colors[p.bg as ColorToken];
    const ratio = calculateContrastRatio(fgHex, bgHex);
    return {
      pair: `${p.fg} on ${p.bg} (${p.role})`,
      fg: fgHex,
      bg: bgHex,
      ratio: Math.round(ratio * 100) / 100,
      expectedMin: p.minRatio,
      passed: ratio >= p.minRatio,
    };
  });
}
