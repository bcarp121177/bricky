import type { BuildResponse, InventoryPiece } from "./types";

// ---------------------------------------------------------------------------
// Part dimensions — mirrors PART_DIMS / DEFAULT_DIMS in ldraw-generator.ts.
// Kept local so the validator has no runtime dependency on the LDraw module.
// ---------------------------------------------------------------------------

type PartDims = { w: number; d: number };

const PART_DIMS: Record<string, PartDims> = {
  "3001":  { w: 4, d: 2 }, // Brick 2x4
  "3003":  { w: 2, d: 2 }, // Brick 2x2
  "3004":  { w: 2, d: 1 }, // Brick 1x2
  "3010":  { w: 4, d: 1 }, // Brick 1x4
  "3005":  { w: 1, d: 1 }, // Brick 1x1
  "3002":  { w: 3, d: 2 }, // Brick 2x3
  "2456":  { w: 6, d: 2 }, // Brick 2x6
  "3007":  { w: 8, d: 2 }, // Brick 2x8
  "3020":  { w: 4, d: 2 }, // Plate 2x4
  "3022":  { w: 2, d: 2 }, // Plate 2x2
  "3023":  { w: 2, d: 1 }, // Plate 1x2
  "3710":  { w: 4, d: 1 }, // Plate 1x4
  "3024":  { w: 1, d: 1 }, // Plate 1x1
  "3021":  { w: 3, d: 2 }, // Plate 2x3
  "3795":  { w: 6, d: 2 }, // Plate 2x6
  "3069b": { w: 2, d: 1 }, // Tile 1x2
  "3068b": { w: 2, d: 2 }, // Tile 2x2
  "2431":  { w: 4, d: 1 }, // Tile 1x4
  "6636":  { w: 6, d: 1 }, // Tile 1x6
  "3070b": { w: 1, d: 1 }, // Tile 1x1
  "3037":  { w: 4, d: 2 }, // Slope 2x4 45°
  "3038":  { w: 3, d: 2 }, // Slope 2x3 45°
  "3039":  { w: 2, d: 2 }, // Slope 2x2 45°
  "3040b": { w: 2, d: 1 }, // Slope 1x2 45°
  "3062b": { w: 1, d: 1 }, // Round Brick 1x1
  "4073":  { w: 1, d: 1 }, // Round Plate 1x1
  "3941":  { w: 2, d: 2 }, // Round Brick 2x2
  "85940": { w: 1, d: 1 }, // Cylinder 1x1
};

const DEFAULT_DIMS: PartDims = { w: 2, d: 2 };

function getDims(partNum: string, rotation: 0 | 90 | 180 | 270): PartDims {
  const base = PART_DIMS[partNum] ?? DEFAULT_DIMS;
  if (rotation === 90 || rotation === 270) {
    return { w: base.d, d: base.w };
  }
  return base;
}

/** Enumerate every stud-grid cell occupied by a piece at a given placement. */
function footprintCells(
  col: number,
  row: number,
  layer: number,
  partNum: string,
  rotation: 0 | 90 | 180 | 270
): string[] {
  const { w, d } = getDims(partNum, rotation);
  const cells: string[] = [];
  for (let dc = 0; dc < w; dc++) {
    for (let dr = 0; dr < d; dr++) {
      cells.push(`${col + dc},${row + dr},${layer}`);
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Violation = {
  type: "overlap" | "quantity";
  partNum: string;
  stepNumber: number;
  detail: string;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; violations: Violation[] };

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate all placements in a BuildResponse against the given inventory.
 *
 * Each suggestion is validated independently. Violations from one suggestion
 * do not affect another's inventory counts.
 *
 * Returns { valid: true } when no violations are found, or
 * { valid: false; violations } listing every problem detected.
 */
export function validatePlacements(
  response: BuildResponse,
  inventory: InventoryPiece[]
): ValidationResult {
  const violations: Violation[] = [];

  for (const suggestion of response.suggestions) {
    // Occupied stud-grid cells accumulated across all steps (cumulative model).
    // Key format: "col,row,layer"
    const occupied = new Set<string>();

    // Usage counts per partNum within this suggestion.
    const usageCounts = new Map<string, number>();

    for (const step of suggestion.steps) {
      for (const entry of step.piecesUsed) {
        if (!Array.isArray(entry.placements) || entry.placements.length === 0) {
          continue;
        }

        for (const placement of entry.placements) {
          const rotation = placement.rotation as 0 | 90 | 180 | 270;
          const cells = footprintCells(
            placement.col,
            placement.row,
            placement.layer,
            entry.partNum,
            rotation
          );

          // Overlap check: report once per placement if any cell is already taken.
          const overlapping = cells.find((cell) => occupied.has(cell));
          if (overlapping !== undefined) {
            violations.push({
              type: "overlap",
              partNum: entry.partNum,
              stepNumber: step.stepNumber,
              detail: `Step ${step.stepNumber}, part ${entry.partNum}: placement at col=${placement.col} row=${placement.row} layer=${placement.layer} overlaps an earlier piece`,
            });
          }

          // Always register the cells so subsequent placements detect conflicts.
          for (const cell of cells) {
            occupied.add(cell);
          }

          // Count this physical piece toward the suggestion's usage total.
          usageCounts.set(entry.partNum, (usageCounts.get(entry.partNum) ?? 0) + 1);
        }
      }
    }

    // Quantity check: compare usage totals to inventory.
    // Build inventory lookup per suggestion (reset each time — suggestions are independent).
    const inventoryMap = new Map<string, number>();
    for (const piece of inventory) {
      inventoryMap.set(piece.partNum, piece.quantity);
    }

    for (const [partNum, used] of usageCounts) {
      const available = inventoryMap.get(partNum) ?? 0;
      if (used > available) {
        violations.push({
          type: "quantity",
          partNum,
          stepNumber: 0, // quantity violations span the whole suggestion
          detail: `Part ${partNum}: used ${used} times but inventory only contains ${available}`,
        });
      }
    }
  }

  if (violations.length === 0) {
    return { valid: true };
  }
  return { valid: false, violations };
}
