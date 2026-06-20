import { describe, expect, it } from "vitest";
import {
  colorDistance,
  colorFamily,
  dedupe,
  extractPalette,
  hexToRgb,
  luminance,
  paletteHexes,
  quantize,
  readableOn,
  rgbToHex,
  rgbToHsl,
  type RGB,
} from "./color";

describe("hex <-> rgb", () => {
  it("round-trips a hex through rgb", () => {
    expect(rgbToHex(hexToRgb("#E8893B"))).toBe("#E8893B");
  });
  it("uppercases and pads", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#FFFFFF");
  });
  it("clamps out-of-range channels", () => {
    expect(rgbToHex({ r: 300, g: -20, b: 128 })).toBe("#FF0080");
  });
  it("expands 3-digit hex", () => {
    expect(hexToRgb("#f0a")).toEqual({ r: 255, g: 0, b: 170 });
  });
});

describe("rgbToHsl", () => {
  it("pure red is hue 0, full saturation", () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(Math.round(hsl.h)).toBe(0);
    expect(Math.round(hsl.s)).toBe(100);
    expect(Math.round(hsl.l)).toBe(50);
  });
  it("grey has zero saturation", () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
  });
  it("pure green sits near hue 120", () => {
    expect(Math.round(rgbToHsl({ r: 0, g: 255, b: 0 }).h)).toBe(120);
  });
});

describe("luminance + readableOn", () => {
  it("white is far brighter than black", () => {
    expect(luminance({ r: 255, g: 255, b: 255 })).toBeGreaterThan(
      luminance({ r: 0, g: 0, b: 0 }),
    );
  });
  it("picks dark text on a light swatch and light text on a dark swatch", () => {
    expect(readableOn("#FFFFFF")).toBe("#1C1813");
    expect(readableOn("#100D0A")).toBe("#F4EFE6");
  });
});

describe("quantize (median-cut)", () => {
  it("returns no colours for empty input", () => {
    expect(quantize([], 4)).toEqual([]);
  });
  it("collapses a single-colour image to one box", () => {
    const px: RGB[] = Array.from({ length: 50 }, () => ({ r: 10, g: 20, b: 30 }));
    const out = quantize(px, 5);
    expect(out.length).toBe(1);
    expect(rgbToHex(out[0])).toBe(rgbToHex({ r: 10, g: 20, b: 30 }));
  });
  it("separates two distinct clusters", () => {
    const px: RGB[] = [
      ...Array.from({ length: 40 }, () => ({ r: 240, g: 10, b: 10 })),
      ...Array.from({ length: 40 }, () => ({ r: 10, g: 10, b: 240 })),
    ];
    const out = quantize(px, 2);
    expect(out.length).toBe(2);
    const fams = out.map((c) => colorFamily(rgbToHex(c))).sort();
    expect(fams).toContain("rouge");
    expect(fams).toContain("bleu");
  });
  it("never exceeds the requested count", () => {
    const px: RGB[] = Array.from({ length: 200 }, (_, i) => ({
      r: (i * 7) % 256,
      g: (i * 13) % 256,
      b: (i * 29) % 256,
    }));
    expect(quantize(px, 6).length).toBeLessThanOrEqual(6);
  });
});

describe("colorDistance + dedupe", () => {
  it("distance is zero for identical colours", () => {
    expect(colorDistance({ r: 100, g: 100, b: 100 }, { r: 100, g: 100, b: 100 })).toBe(0);
  });
  it("merges near-identical colours", () => {
    const merged = dedupe(
      [
        { r: 200, g: 50, b: 50 },
        { r: 202, g: 52, b: 49 },
      ],
      14,
    );
    expect(merged.length).toBe(1);
  });
  it("keeps clearly distinct colours apart", () => {
    const merged = dedupe(
      [
        { r: 240, g: 10, b: 10 },
        { r: 10, g: 10, b: 240 },
      ],
      14,
    );
    expect(merged.length).toBe(2);
  });
});

describe("extractPalette + paletteHexes", () => {
  it("returns pinned hex strings, never invented", () => {
    const px: RGB[] = [
      ...Array.from({ length: 60 }, () => ({ r: 232, g: 137, b: 59 })),
      ...Array.from({ length: 60 }, () => ({ r: 58, g: 166, b: 160 })),
    ];
    const hexes = paletteHexes(px, 6);
    expect(hexes.length).toBeGreaterThanOrEqual(2);
    expect(hexes.every((h) => /^#[0-9A-F]{6}$/.test(h))).toBe(true);
  });
  it("orders by lightness (dark first)", () => {
    const px: RGB[] = [
      ...Array.from({ length: 40 }, () => ({ r: 20, g: 20, b: 20 })),
      ...Array.from({ length: 40 }, () => ({ r: 230, g: 230, b: 230 })),
    ];
    const out = extractPalette(px, 4);
    const ls = out.map((c) => rgbToHsl(c).l);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeGreaterThanOrEqual(ls[i - 1]);
  });
  it("handles empty pixels gracefully", () => {
    expect(paletteHexes([], 6)).toEqual([]);
  });
});

describe("colorFamily", () => {
  it("classifies primaries and neutrals", () => {
    expect(colorFamily("#FF0000")).toBe("rouge");
    expect(colorFamily("#00FF00")).toBe("vert");
    expect(colorFamily("#0000FF")).toBe("bleu");
    expect(colorFamily("#000000")).toBe("noir");
    expect(colorFamily("#FFFFFF")).toBe("blanc");
    expect(colorFamily("#808080")).toBe("gris");
  });
});
