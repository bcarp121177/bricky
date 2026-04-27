/**
 * Placement Validator — unit tests
 *
 * Every test traces to a spec acceptance criterion or edge case in
 * specs/placement-validator.md. Tests are derived from the spec, not the
 * source code.
 */

import { describe, it, expect } from "vitest";
import { validatePlacements } from "@/lib/validator";
import type { BuildResponse, InventoryPiece } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInventory(pieces: Array<{ partNum: string; quantity: number }>): InventoryPiece[] {
  return pieces.map(({ partNum, quantity }) => ({
    partNum,
    quantity,
    name: `Part ${partNum}`,
    color: "Red",
    colorHex: "#FF0000",
    imgUrl: "",
    category: "Bricks" as const,
  }));
}

function makePlacement(
  col: number,
  row: number,
  layer: number,
  rotation: 0 | 90 | 180 | 270 = 0
) {
  return { col, row, layer, rotation };
}

function makeResponse(
  suggestions: Array<{
    steps: Array<{
      stepNumber: number;
      entries: Array<{
        partNum: string;
        quantity: number;
        placements: Array<ReturnType<typeof makePlacement>>;
      }>;
    }>;
  }>
): BuildResponse {
  return {
    suggestions: suggestions.map((s) => ({
      title: "Test",
      description: "Test",
      difficulty: 1 as const,
      estimatedTime: "5 minutes",
      tips: [],
      steps: s.steps.map((step) => ({
        stepNumber: step.stepNumber,
        instruction: "Place piece",
        piecesUsed: step.entries.map((e) => ({
          partNum: e.partNum,
          name: `Part ${e.partNum}`,
          color: "Red",
          colorHex: "#FF0000",
          quantity: e.quantity,
          imgUrl: "",
          placements: e.placements,
        })),
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Tests — validatePlacements function
// ---------------------------------------------------------------------------

describe("validatePlacements", () => {
  // Spec: returns { valid: true } for a response with no violations
  it("returns valid when there are no overlaps or quantity violations", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3005", // 1×1
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
              {
                partNum: "3005",
                quantity: 1,
                placements: [makePlacement(2, 0, 0)], // different col — no overlap
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([{ partNum: "3005", quantity: 2 }]);

    expect(validatePlacements(response, inventory)).toEqual({ valid: true });
  });

  // Spec: 1x1 piece at (0,0,0) and 2x2 piece at (0,0,0) overlap (footprints share cell (0,0))
  it("detects stud-grid overlap: 1×1 at (0,0,0) and 2×2 at (0,0,0)", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3005", // 1×1
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
              {
                partNum: "3003", // 2×2
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([
      { partNum: "3005", quantity: 1 },
      { partNum: "3003", quantity: 1 },
    ]);

    const result = validatePlacements(response, inventory);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations.some((v) => v.type === "overlap")).toBe(true);
    }
  });

  // Spec: A piece at layer 0 and a piece at layer 1 with identical col/row never overlap
  it("does not flag overlap for pieces at same col/row but different layer", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3005", // 1×1, layer 0
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
              {
                partNum: "3005", // 1×1, layer 1 — same col/row but different layer
                quantity: 1,
                placements: [makePlacement(0, 0, 1)],
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([{ partNum: "3005", quantity: 2 }]);

    expect(validatePlacements(response, inventory)).toEqual({ valid: true });
  });

  // Spec: Two placements of the same piece type that do not share any stud-grid cell at the same layer are not overlapping
  it("does not flag overlap when pieces share no stud-grid cell", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3004", // 1×2 (w=2, d=1) occupies cols 0-1, row 0
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
              {
                partNum: "3004", // 1×2 occupies cols 2-3, row 0 — no overlap
                quantity: 1,
                placements: [makePlacement(2, 0, 0)],
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([{ partNum: "3004", quantity: 2 }]);

    expect(validatePlacements(response, inventory)).toEqual({ valid: true });
  });

  // Spec: Detects quantity violation: partNum used more times than inventory allows
  it("detects quantity violation when part is used more than inventory allows", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3004",
                quantity: 3,
                placements: [
                  makePlacement(0, 0, 0),
                  makePlacement(2, 0, 0),
                  makePlacement(4, 0, 0),
                ],
              },
            ],
          },
        ],
      },
    ]);
    // Inventory only has 2, but 3 are placed
    const inventory = makeInventory([{ partNum: "3004", quantity: 2 }]);

    const result = validatePlacements(response, inventory);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const quantityViolations = result.violations.filter((v) => v.type === "quantity");
      expect(quantityViolations).toHaveLength(1);
      expect(quantityViolations[0].partNum).toBe("3004");
      expect(quantityViolations[0].detail).toMatch(/used 3/);
      expect(quantityViolations[0].detail).toMatch(/only contains 2/);
    }
  });

  // Spec: Raises quantity violation for partNum absent from inventory (0 available, N used)
  it("raises quantity violation for partNum absent from inventory", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "9999", // not in inventory
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([]); // empty inventory

    const result = validatePlacements(response, inventory);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const quantityViolations = result.violations.filter((v) => v.type === "quantity");
      expect(quantityViolations).toHaveLength(1);
      expect(quantityViolations[0].partNum).toBe("9999");
      expect(quantityViolations[0].detail).toMatch(/only contains 0/);
    }
  });

  // Spec: No violation when partNum in inventory has no placements
  it("raises no violation when partNum in inventory has zero placements", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [], // no pieces placed
          },
        ],
      },
    ]);
    const inventory = makeInventory([{ partNum: "3005", quantity: 5 }]);

    expect(validatePlacements(response, inventory)).toEqual({ valid: true });
  });

  // Spec: A suggestion with zero steps produces no violations
  it("produces no violations for a suggestion with zero steps", () => {
    const response: BuildResponse = {
      suggestions: [
        {
          title: "Empty",
          description: "No steps",
          difficulty: 1,
          estimatedTime: "0 minutes",
          steps: [],
          tips: [],
        },
      ],
    };
    const inventory = makeInventory([{ partNum: "3005", quantity: 5 }]);

    expect(validatePlacements(response, inventory)).toEqual({ valid: true });
  });

  // Spec: Cumulative model — piece placed in step 1 still occupies its cells in step 2
  it("cumulative model: piece from step 1 still blocks cells in step 2", () => {
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3005", // 1×1 at (0,0,0)
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
            ],
          },
          {
            stepNumber: 2,
            entries: [
              {
                partNum: "3005", // another 1×1 at (0,0,0) — should overlap with step 1
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([{ partNum: "3005", quantity: 2 }]);

    const result = validatePlacements(response, inventory);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations.some((v) => v.type === "overlap" && v.stepNumber === 2)).toBe(true);
    }
  });

  // Spec: Two suggestions are validated independently (inventory counts reset per suggestion)
  it("resets inventory counts between suggestions", () => {
    // Each suggestion uses 2 of partNum 3005, inventory has 2
    // If counts were shared across suggestions, the second would fail
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3005",
                quantity: 2,
                placements: [makePlacement(0, 0, 0), makePlacement(2, 0, 0)],
              },
            ],
          },
        ],
      },
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "3005",
                quantity: 2,
                placements: [makePlacement(0, 0, 0), makePlacement(2, 0, 0)],
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([{ partNum: "3005", quantity: 2 }]);

    expect(validatePlacements(response, inventory)).toEqual({ valid: true });
  });

  // Spec: Unknown partNum falls back to DEFAULT_DIMS (2×2) for overlap computation
  it("uses DEFAULT_DIMS (2×2) for unknown partNums when computing overlap", () => {
    // Unknown part XXXX at (0,0,0) with default 2×2 footprint occupies (0,0)–(1,1)
    // Known 1×1 part at (1,1,0) should overlap with that footprint
    const response = makeResponse([
      {
        steps: [
          {
            stepNumber: 1,
            entries: [
              {
                partNum: "UNKNOWN", // will use DEFAULT_DIMS 2×2
                quantity: 1,
                placements: [makePlacement(0, 0, 0)],
              },
              {
                partNum: "3005", // 1×1 at (1,1,0) — within the 2×2 footprint of UNKNOWN
                quantity: 1,
                placements: [makePlacement(1, 1, 0)],
              },
            ],
          },
        ],
      },
    ]);
    const inventory = makeInventory([
      { partNum: "UNKNOWN", quantity: 1 },
      { partNum: "3005", quantity: 1 },
    ]);

    const result = validatePlacements(response, inventory);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations.some((v) => v.type === "overlap")).toBe(true);
    }
  });

  // Spec: A step with zero placements for a piece entry produces no violations for that entry
  it("produces no violations for a piece entry with an empty placements array", () => {
    const response: BuildResponse = {
      suggestions: [
        {
          title: "Test",
          description: "Test",
          difficulty: 1,
          estimatedTime: "5 min",
          tips: [],
          steps: [
            {
              stepNumber: 1,
              instruction: "Place nothing",
              piecesUsed: [
                {
                  partNum: "3005",
                  name: "Brick 1x1",
                  color: "Red",
                  colorHex: "#FF0000",
                  quantity: 0,
                  imgUrl: "",
                  placements: [], // empty placements
                },
              ],
            },
          ],
        },
      ],
    };
    const inventory = makeInventory([{ partNum: "3005", quantity: 5 }]);

    expect(validatePlacements(response, inventory)).toEqual({ valid: true });
  });
});
