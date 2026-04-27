/**
 * Tests for color-utils.ts and isometric.ts
 *
 * Every test traces to a spec acceptance criterion in
 * specs/isometric-svg-renderer.md.
 */

import { describe, it, expect } from "vitest";
import {
  hexToHsl,
  hslToHex,
  desaturate,
  adjustLightness,
} from "@/lib/color-utils";
import { isoProject, brickToPolygons, studCenters } from "@/lib/isometric";
import { getDims } from "@/lib/ldraw-generator";
import { sortPlacements, type BrickPlacement } from "@/lib/isometric-step-data";

// ---------------------------------------------------------------------------
// color-utils.ts
// ---------------------------------------------------------------------------

describe("hexToHsl", () => {
  it("parses a standard 6-digit hex color", () => {
    // #C91A09 is a vivid red — high saturation, low-medium lightness
    const { h, s, l } = hexToHsl("#C91A09");
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(30);       // red hue range
    expect(s).toBeGreaterThan(0.7);   // high saturation
    expect(l).toBeGreaterThan(0);
    expect(l).toBeLessThan(1);
  });

  it("handles hex without leading #", () => {
    const withHash = hexToHsl("#FF0000");
    const withoutHash = hexToHsl("FF0000");
    expect(withHash.h).toBeCloseTo(withoutHash.h, 0);
    expect(withHash.s).toBeCloseTo(withoutHash.s, 2);
  });

  it("parses 3-digit hex shorthand", () => {
    const full = hexToHsl("#FF0000");
    const short = hexToHsl("#F00");
    expect(full.h).toBeCloseTo(short.h, 0);
    expect(full.s).toBeCloseTo(short.s, 2);
    expect(full.l).toBeCloseTo(short.l, 2);
  });

  it("falls back to #C0C0C0 for empty input without throwing", () => {
    const fallback = hexToHsl("#C0C0C0");
    const result = hexToHsl("");
    expect(result.h).toBeCloseTo(fallback.h, 0);
    expect(result.s).toBeCloseTo(fallback.s, 2);
    expect(result.l).toBeCloseTo(fallback.l, 2);
  });

  it("falls back to #C0C0C0 for invalid input without throwing", () => {
    expect(() => hexToHsl("not-a-color")).not.toThrow();
    expect(() => hexToHsl("ZZZZZZ")).not.toThrow();
  });

  it("returns s=0 for pure gray (#808080)", () => {
    const { s } = hexToHsl("#808080");
    expect(s).toBeCloseTo(0, 2);
  });
});

describe("hslToHex", () => {
  it("round-trips with hexToHsl within rounding tolerance", () => {
    const original = "#C91A09";
    const { h, s, l } = hexToHsl(original);
    const roundTripped = hslToHex(h, s, l);
    // Each channel should be within ±2 (rounding from float math)
    const [r1, g1, b1] = hexToChannels(original);
    const [r2, g2, b2] = hexToChannels(roundTripped);
    expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(2);
    expect(Math.abs(g1 - g2)).toBeLessThanOrEqual(2);
    expect(Math.abs(b1 - b2)).toBeLessThanOrEqual(2);
  });

  it("produces a valid #rrggbb string", () => {
    const hex = hslToHex(120, 0.8, 0.5);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("clamps out-of-range saturation without throwing", () => {
    expect(() => hslToHex(0, 1.5, 0.5)).not.toThrow();
    expect(() => hslToHex(0, -0.5, 0.5)).not.toThrow();
  });

  it("returns white for l=1", () => {
    expect(hslToHex(0, 0, 1)).toBe("#ffffff");
  });

  it("returns black for l=0", () => {
    expect(hslToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("desaturate", () => {
  it("halves the saturation of a vivid color", () => {
    const original = hexToHsl("#C91A09");
    const result = hexToHsl(desaturate("#C91A09", 0.5));
    expect(result.s).toBeCloseTo(original.s * 0.5, 1);
  });

  it("leaves lightness and hue approximately unchanged", () => {
    const original = hexToHsl("#4488CC");
    const result = hexToHsl(desaturate("#4488CC", 0.5));
    expect(result.h).toBeCloseTo(original.h, 0);
    expect(result.l).toBeCloseTo(original.l, 1);
  });

  it("handles a gray (s=0) without throwing", () => {
    expect(() => desaturate("#808080", 0.5)).not.toThrow();
    const result = hexToHsl(desaturate("#808080", 0.5));
    expect(result.s).toBeCloseTo(0, 2);
  });

  it("handles pure white without throwing", () => {
    expect(() => desaturate("#FFFFFF", 0.5)).not.toThrow();
  });

  it("handles invalid hex by falling back without throwing", () => {
    expect(() => desaturate("bad", 0.5)).not.toThrow();
  });
});

describe("adjustLightness", () => {
  it("darkens a color by multiplying lightness", () => {
    const original = hexToHsl("#4488CC");
    const result = hexToHsl(adjustLightness("#4488CC", 0.8));
    expect(result.l).toBeCloseTo(original.l * 0.8, 1);
  });

  it("preserves hue and saturation approximately", () => {
    const original = hexToHsl("#4488CC");
    const result = hexToHsl(adjustLightness("#4488CC", 0.8));
    expect(result.h).toBeCloseTo(original.h, 0);
    expect(result.s).toBeCloseTo(original.s, 1);
  });
});

// ---------------------------------------------------------------------------
// isometric.ts
// ---------------------------------------------------------------------------

describe("isoProject", () => {
  it("returns a well-defined origin for (0, 0, 0)", () => {
    const { x, y } = isoProject(0, 0, 0, 20);
    expect(isFinite(x)).toBe(true);
    expect(isFinite(y)).toBe(true);
    expect(isNaN(x)).toBe(false);
    expect(isNaN(y)).toBe(false);
  });

  it("increasing col shifts x right (positive) and y down (positive)", () => {
    const a = isoProject(0, 0, 0, 20);
    const b = isoProject(1, 0, 0, 20);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it("increasing row shifts x left (negative) and y down (positive)", () => {
    const a = isoProject(0, 0, 0, 20);
    const b = isoProject(0, 1, 0, 20);
    expect(b.x).toBeLessThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it("increasing layer shifts y upward (negative)", () => {
    const a = isoProject(0, 0, 0, 20);
    const b = isoProject(0, 0, 1, 20);
    expect(b.y).toBeLessThan(a.y);
    expect(b.x).toBeCloseTo(a.x, 5);
  });

  it("produces no NaN for large coordinates", () => {
    const { x, y } = isoProject(10, 8, 5, 28);
    expect(isNaN(x)).toBe(false);
    expect(isNaN(y)).toBe(false);
  });
});

describe("brickToPolygons", () => {
  it("returns three non-empty polygon point strings for a 1x1 brick", () => {
    const { top, leftFront, rightFront } = brickToPolygons(0, 0, 0, 1, 1, 24, 20);
    expect(top.length).toBeGreaterThan(0);
    expect(leftFront.length).toBeGreaterThan(0);
    expect(rightFront.length).toBeGreaterThan(0);
  });

  it("each polygon string contains exactly 4 coordinate pairs (4 vertices)", () => {
    const { top, leftFront, rightFront } = brickToPolygons(0, 0, 0, 1, 1, 24, 20);
    expect(countVertices(top)).toBe(4);
    expect(countVertices(leftFront)).toBe(4);
    expect(countVertices(rightFront)).toBe(4);
  });

  it("a 2x4 brick has a wider top polygon than a 1x1 brick", () => {
    const small = brickToPolygons(0, 0, 0, 1, 1, 24, 20);
    const large = brickToPolygons(0, 0, 0, 2, 4, 24, 20);
    const smallWidth = polygonXRange(small.top);
    const largeWidth = polygonXRange(large.top);
    expect(largeWidth).toBeGreaterThan(smallWidth);
  });

  it("contains no NaN coordinates", () => {
    const { top, leftFront, rightFront } = brickToPolygons(0, 0, 0, 2, 2, 24, 28);
    for (const pts of [top, leftFront, rightFront]) {
      expect(pts).not.toContain("NaN");
    }
  });

  it("plates (layerH=8) produce shorter side faces than bricks (layerH=24)", () => {
    const brick = brickToPolygons(0, 0, 0, 2, 2, 24, 20);
    const plate = brickToPolygons(0, 0, 0, 2, 2, 8, 20);
    const brickSideH = polygonYRange(brick.leftFront);
    const plateSideH = polygonYRange(plate.leftFront);
    expect(plateSideH).toBeLessThan(brickSideH);
  });
});

describe("studCenters", () => {
  it("returns exactly 1 center for a 1x1 brick", () => {
    const centers = studCenters(0, 0, 0, 1, 1, 20);
    expect(centers).toHaveLength(1);
  });

  it("returns exactly 4 centers for a 2x2 brick", () => {
    const centers = studCenters(0, 0, 0, 2, 2, 20);
    expect(centers).toHaveLength(4);
  });

  it("returns exactly 8 centers for a 2x4 brick", () => {
    const centers = studCenters(0, 0, 0, 2, 4, 20);
    expect(centers).toHaveLength(8);
  });

  it("all center coordinates are finite and not NaN", () => {
    const centers = studCenters(0, 0, 0, 4, 2, 28);
    for (const { cx, cy } of centers) {
      expect(isNaN(cx)).toBe(false);
      expect(isNaN(cy)).toBe(false);
      expect(isFinite(cx)).toBe(true);
      expect(isFinite(cy)).toBe(true);
    }
  });

  it("centers spread across a larger x-range for wider bricks", () => {
    const narrow = studCenters(0, 0, 0, 1, 1, 20);
    const wide = studCenters(0, 0, 0, 4, 1, 20);
    const narrowXs = narrow.map((c) => c.cx);
    const wideXs = wide.map((c) => c.cx);
    expect(Math.max(...wideXs) - Math.min(...wideXs)).toBeGreaterThan(
      Math.max(...narrowXs) - Math.min(...narrowXs)
    );
  });
});

// ---------------------------------------------------------------------------
// getDims — rotation swap
// ---------------------------------------------------------------------------

describe("getDims — rotation swap", () => {
  it("getDims('3004', 90) returns { w: 1, d: 2 } (1x2 brick at 0° is w:2,d:1; rotated 90° swaps to w:1,d:2)", () => {
    const dims = getDims("3004", 90);
    expect(dims.w).toBe(1);
    expect(dims.d).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// sortPlacements — painter's algorithm
// ---------------------------------------------------------------------------

describe("sortPlacements — painter's algorithm", () => {
  it("sorts layer ASC, row DESC, col ASC", () => {
    const fixture: BrickPlacement[] = [
      { col: 2, row: 1, layer: 2, rotation: 0, partNum: "3005", colorHex: "#FF0000", isCurrent: false },
      { col: 0, row: 3, layer: 0, rotation: 0, partNum: "3005", colorHex: "#0000FF", isCurrent: false },
      { col: 1, row: 3, layer: 1, rotation: 0, partNum: "3005", colorHex: "#00FF00", isCurrent: false },
      { col: 0, row: 1, layer: 2, rotation: 0, partNum: "3005", colorHex: "#FFFF00", isCurrent: true  },
      { col: 3, row: 2, layer: 0, rotation: 0, partNum: "3005", colorHex: "#FF00FF", isCurrent: false },
    ];

    const sorted = sortPlacements(fixture);

    // Layer 0 comes before layer 1 before layer 2
    expect(sorted[0].layer).toBe(0);
    expect(sorted[1].layer).toBe(0);
    expect(sorted[2].layer).toBe(1);
    expect(sorted[3].layer).toBe(2);
    expect(sorted[4].layer).toBe(2);

    // Within layer 0: row DESC (row=3 before row=2)
    expect(sorted[0].row).toBe(3);
    expect(sorted[1].row).toBe(2);

    // Within layer 2: row DESC then col ASC — both have row=1, so col ASC (0 before 2)
    expect(sorted[3].col).toBe(0);
    expect(sorted[4].col).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function hexToChannels(hex: string): [number, number, number] {
  const cleaned = hex.replace(/^#/, "");
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ];
}

function countVertices(pts: string): number {
  return pts.trim().split(/\s+/).length;
}

function polygonXRange(pts: string): number {
  const xs = pts.trim().split(/\s+/).map((pair) => parseFloat(pair.split(",")[0]));
  return Math.max(...xs) - Math.min(...xs);
}

function polygonYRange(pts: string): number {
  const ys = pts.trim().split(/\s+/).map((pair) => parseFloat(pair.split(",")[1]));
  return Math.max(...ys) - Math.min(...ys);
}
