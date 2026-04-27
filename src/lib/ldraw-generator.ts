import type { BuildStep } from "./types";

// ---------------------------------------------------------------------------
// Part dimensions: [W, D] in studs when rotation = 0°.
// For plates/tiles the height is 8 LDU; for bricks it is 24 LDU.
// ---------------------------------------------------------------------------

interface PartDimensions {
  w: number;   // stud width  (X axis at rotation=0)
  d: number;   // stud depth  (Z axis at rotation=0)
  /** layer height in LDU — 24 for bricks, 8 for plates/tiles */
  layerH: number;
}

const PART_DIMS: Record<string, PartDimensions> = {
  // Bricks (24 LDU tall)
  "3001":  { w: 4, d: 2, layerH: 24 }, // Brick 2x4
  "3003":  { w: 2, d: 2, layerH: 24 }, // Brick 2x2
  "3004":  { w: 2, d: 1, layerH: 24 }, // Brick 1x2
  "3010":  { w: 4, d: 1, layerH: 24 }, // Brick 1x4
  "3005":  { w: 1, d: 1, layerH: 24 }, // Brick 1x1
  "3002":  { w: 3, d: 2, layerH: 24 }, // Brick 2x3
  "2456":  { w: 6, d: 2, layerH: 24 }, // Brick 2x6
  "3007":  { w: 8, d: 2, layerH: 24 }, // Brick 2x8
  // Plates (8 LDU tall)
  "3020":  { w: 4, d: 2, layerH: 8  }, // Plate 2x4
  "3022":  { w: 2, d: 2, layerH: 8  }, // Plate 2x2
  "3023":  { w: 2, d: 1, layerH: 8  }, // Plate 1x2
  "3710":  { w: 4, d: 1, layerH: 8  }, // Plate 1x4
  "3024":  { w: 1, d: 1, layerH: 8  }, // Plate 1x1
  "3021":  { w: 3, d: 2, layerH: 8  }, // Plate 2x3
  "3795":  { w: 6, d: 2, layerH: 8  }, // Plate 2x6
  // Tiles (8 LDU tall)
  "3069b": { w: 2, d: 1, layerH: 8  }, // Tile 1x2
  "3068b": { w: 2, d: 2, layerH: 8  }, // Tile 2x2
  "2431":  { w: 4, d: 1, layerH: 8  }, // Tile 1x4
  "6636":  { w: 6, d: 1, layerH: 8  }, // Tile 1x6
  "3070b": { w: 1, d: 1, layerH: 8  }, // Tile 1x1
  // Slopes (24 LDU tall)
  "3037":  { w: 4, d: 2, layerH: 24 }, // Slope 2x4 45°
  "3038":  { w: 3, d: 2, layerH: 24 }, // Slope 2x3 45°
  "3039":  { w: 2, d: 2, layerH: 24 }, // Slope 2x2 45°
  "3040b": { w: 2, d: 1, layerH: 24 }, // Slope 1x2 45°
  // Round (24/8 LDU tall)
  "3062b": { w: 1, d: 1, layerH: 24 }, // Round Brick 1x1
  "4073":  { w: 1, d: 1, layerH: 8  }, // Round Plate 1x1
  "3941":  { w: 2, d: 2, layerH: 24 }, // Round Brick 2x2
  "85940": { w: 1, d: 1, layerH: 24 }, // Cylinder 1x1
};

/** Fallback dimensions for unknown part numbers. */
const DEFAULT_DIMS: PartDimensions = { w: 2, d: 2, layerH: 24 };

function getDims(partNum: string, rotation: 0 | 90 | 180 | 270): PartDimensions {
  const base = PART_DIMS[partNum] ?? DEFAULT_DIMS;
  // When rotated 90° or 270°, W and D are swapped.
  if (rotation === 90 || rotation === 270) {
    return { w: base.d, d: base.w, layerH: base.layerH };
  }
  return base;
}

// ---------------------------------------------------------------------------
// Color mapping: canonical LEGO color name → LDraw color code
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, number> = {
  "Bright Red":        4,
  "Bright Blue":       1,
  "Bright Yellow":    14,
  "Bright Green":      2,
  "Black":             0,
  "White":            15,
  "Bright Orange":    25,
  "Medium Stone Grey": 71,
  "Dark Stone Grey":  72,
  "Sand Yellow":      19,
  "Reddish Brown":    88,
  "Dark Blue":       272,
  "Medium Blue":      73,
  "Bright Pink":      13,
  "Lime":             34,
  "Transparent":      47,
};

const DEFAULT_COLOR = 16; // LDraw "current color" / inherit

function colorCode(name: string): number {
  return COLOR_MAP[name] ?? DEFAULT_COLOR;
}

// ---------------------------------------------------------------------------
// Rotation matrices (row-major, 3×3 flattened to r11…r33)
// ---------------------------------------------------------------------------

type RotMatrix = [number, number, number, number, number, number, number, number, number];

const ROTATION_MATRICES: Record<0 | 90 | 180 | 270, RotMatrix> = {
    0: [ 1,  0,  0,  0,  1,  0,  0,  0,  1],
   90: [ 0,  0, -1,  0,  1,  0,  1,  0,  0],
  180: [-1,  0,  0,  0,  1,  0,  0,  0, -1],
  270: [ 0,  0,  1,  0,  1,  0, -1,  0,  0],
};

// ---------------------------------------------------------------------------
// Coordinate conversion: stud grid → LDraw world coordinates (LDU)
// ---------------------------------------------------------------------------

interface Placement {
  col: number;
  row: number;
  layer: number;
  rotation: 0 | 90 | 180 | 270;
}

function studGridToLDraw(
  placement: Placement,
  partNum: string
): { x: number; y: number; z: number } {
  const dims = getDims(partNum, placement.rotation);
  // Center the piece in X and Z within its stud footprint.
  const x = (placement.col + (dims.w - 1) / 2) * 20;
  // Y is negative upward; origin is at the top face of the part.
  // The layer index maps to how many layer-heights above the base.
  const layerH = (PART_DIMS[partNum] ?? DEFAULT_DIMS).layerH;
  const y = -placement.layer * layerH;
  const z = (placement.row + (dims.d - 1) / 2) * 20;
  return { x, y, z };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert all build steps up to (and including) `upToStep` into a single
 * LDraw `.ldr` format string showing every piece placed so far.
 *
 * @param steps     Array of BuildStep objects (from BuildResponse).
 * @param upToStep  1-based step number; all steps with stepNumber ≤ upToStep
 *                  are included.
 * @returns         Valid LDraw string ready to be parsed by an LDraw renderer.
 */
export function generateLDraw(steps: BuildStep[], upToStep: number): string {
  const lines: string[] = ["0 Bricky Build"];

  for (const step of steps) {
    if (step.stepNumber > upToStep) continue;

    for (const entry of step.piecesUsed) {
      // Gracefully skip entries with no placement data.
      if (!Array.isArray(entry.placements) || entry.placements.length === 0) {
        continue;
      }

      const color = colorCode(entry.color);
      const partFile = `${entry.partNum}.dat`;

      for (const placement of entry.placements) {
        const rotation = placement.rotation as 0 | 90 | 180 | 270;
        const { x, y, z } = studGridToLDraw({ ...placement, rotation }, entry.partNum);
        const [r11, r12, r13, r21, r22, r23, r31, r32, r33] =
          ROTATION_MATRICES[rotation];

        lines.push(
          `1 ${color} ${x} ${y} ${z} ${r11} ${r12} ${r13} ${r21} ${r22} ${r23} ${r31} ${r32} ${r33} ${partFile}`
        );
      }
    }
  }

  return lines.join("\n");
}
