// L'Imagier — client-side palette extraction (median-cut). The model never
// invents colours: we extract the real dominant hexes from the pixels and pin
// them. Pure functions here are unit-tested in color.test.ts.

export interface RGB {
  r: number;
  g: number;
  b: number;
} // 0..255

export interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => clamp255(v).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

/** Relative luminance (WCAG-ish) — used to choose legible text over a swatch. */
export function luminance({ r, g, b }: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Best foreground (black or white hex) for legible text on a given swatch. */
export function readableOn(hex: string): string {
  return luminance(hexToRgb(hex)) > 0.42 ? "#1C1813" : "#F4EFE6";
}

// ── Median-cut quantization ──────────────────────────────────────────────
interface Box {
  pixels: RGB[];
}

function boxRange(pixels: RGB[], ch: "r" | "g" | "b"): number {
  let min = 255;
  let max = 0;
  for (const p of pixels) {
    const v = p[ch];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

function widestChannel(pixels: RGB[]): "r" | "g" | "b" {
  const r = boxRange(pixels, "r");
  const g = boxRange(pixels, "g");
  const b = boxRange(pixels, "b");
  if (r >= g && r >= b) return "r";
  if (g >= r && g >= b) return "g";
  return "b";
}

function averageColor(pixels: RGB[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of pixels) {
    r += p.r;
    g += p.g;
    b += p.b;
  }
  const n = pixels.length || 1;
  return { r: r / n, g: g / n, b: b / n };
}

/**
 * Median-cut quantization. Repeatedly split the box with the most pixels (and a
 * non-trivial colour range) at the median of its widest channel, until we have
 * `count` boxes; the average of each box is a dominant colour.
 */
export function quantize(pixels: RGB[], count: number): RGB[] {
  if (pixels.length === 0) return [];
  if (count < 1) return [];
  let boxes: Box[] = [{ pixels }];
  while (boxes.length < count) {
    boxes.sort((a, b) => b.pixels.length - a.pixels.length);
    const idx = boxes.findIndex(
      (bx) =>
        Math.max(
          boxRange(bx.pixels, "r"),
          boxRange(bx.pixels, "g"),
          boxRange(bx.pixels, "b"),
        ) > 8,
    );
    if (idx === -1) break;
    const box = boxes.splice(idx, 1)[0];
    const ch = widestChannel(box.pixels);
    const sorted = [...box.pixels].sort((a, b) => a[ch] - b[ch]);
    const mid = Math.floor(sorted.length / 2);
    if (mid === 0 || mid === sorted.length) break;
    boxes.push({ pixels: sorted.slice(0, mid) }, { pixels: sorted.slice(mid) });
  }
  return boxes.map((b) => averageColor(b.pixels));
}

/** Perceptual distance in HSL space, weighting hue more for saturated colours. */
export function colorDistance(a: RGB, b: RGB): number {
  const ha = rgbToHsl(a);
  const hb = rgbToHsl(b);
  let dh = Math.abs(ha.h - hb.h);
  if (dh > 180) dh = 360 - dh;
  const sat = (ha.s + hb.s) / 200;
  return Math.sqrt((dh * sat * 1.2) ** 2 + (ha.s - hb.s) ** 2 + (ha.l - hb.l) ** 2);
}

/** Merge colours closer than `threshold`, keeping the more saturated representative. */
export function dedupe(colors: RGB[], threshold = 14): RGB[] {
  const kept: RGB[] = [];
  for (const c of colors) {
    const near = kept.find((k) => colorDistance(k, c) < threshold);
    if (!near) kept.push(c);
    else if (rgbToHsl(c).s > rgbToHsl(near).s) kept[kept.indexOf(near)] = c;
  }
  return kept;
}

/**
 * Extract a palette from raw image pixels: quantize generously, dedupe, keep the
 * most useful spread, and order dark → light so a chip strip reads cleanly.
 * Returns RGB values; pipe through rgbToHex for storage.
 */
export function extractPalette(pixels: RGB[], target = 6): RGB[] {
  if (pixels.length === 0) return [];
  const raw = quantize(pixels, Math.min(16, Math.max(target + 4, 10)));
  let merged = dedupe(raw, 14);
  if (merged.length > target) {
    merged = merged
      .map((c) => ({ c, score: rgbToHsl(c).s + 30 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, target)
      .map((x) => x.c);
  }
  return merged.sort((a, b) => rgbToHsl(a).l - rgbToHsl(b).l);
}

/** Convenience: extract a palette and return real, pinned hex strings. */
export function paletteHexes(pixels: RGB[], target = 6): string[] {
  return extractPalette(pixels, target).map(rgbToHex);
}

/** A short, human name family for a hex (used in filters + throughline). */
export function colorFamily(hex: string): string {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  if (l < 12) return "noir";
  if (l > 90 && s < 12) return "blanc";
  if (s < 12) return "gris";
  if (h < 15 || h >= 345) return "rouge";
  if (h < 45) return "orange";
  if (h < 70) return "jaune";
  if (h < 160) return "vert";
  if (h < 200) return "cyan";
  if (h < 255) return "bleu";
  if (h < 290) return "violet";
  return "rose";
}

const FAMILY_EN: Record<string, string> = {
  noir: "black",
  blanc: "white",
  gris: "grey",
  rouge: "red",
  orange: "orange",
  jaune: "yellow",
  vert: "green",
  cyan: "cyan",
  bleu: "blue",
  violet: "violet",
  rose: "pink",
};

export function colorFamilyLabel(hex: string, lang: "fr" | "en"): string {
  const fam = colorFamily(hex);
  return lang === "en" ? FAMILY_EN[fam] ?? fam : fam;
}
