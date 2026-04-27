/**
 * Pure data helpers for the isometric step diagram.
 * These functions are extracted here to keep isometric-step-diagram.tsx
 * under the ~300-line limit.
 */

import type { BuildStep } from "@/lib/types";
import { getDims, DEFAULT_DIMS, PART_DIMS } from "@/lib/ldraw-generator";
import { isoProject } from "@/lib/isometric";

// ---------------------------------------------------------------------------
// Constants (re-exported so the component can use them)
// ---------------------------------------------------------------------------

export const SCALE = 28;          // SVG pixels per stud
export const PADDING = 32;        // viewBox padding in SVG units
const FALLBACK_COLOR = "#C0C0C0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrickPlacement = {
  col: number;
  row: number;
  layer: number;
  rotation: 0 | 90 | 180 | 270;
  partNum: string;
  colorHex: string;
  isCurrent: boolean;
};

export type PliEntry = {
  name: string;
  colorHex: string;
  quantity: number;
  partNum: string;
};

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

export function collectPlacements(
  steps: BuildStep[],
  currentStepIndex: number
): BrickPlacement[] {
  const placements: BrickPlacement[] = [];
  steps.forEach((step, stepIdx) => {
    const isCurrent = stepIdx === currentStepIndex;
    for (const entry of step.piecesUsed) {
      if (!Array.isArray(entry.placements) || entry.placements.length === 0) continue;
      for (const p of entry.placements) {
        placements.push({
          col: p.col,
          row: p.row,
          layer: p.layer,
          rotation: p.rotation,
          partNum: entry.partNum,
          colorHex: entry.colorHex || FALLBACK_COLOR,
          isCurrent,
        });
      }
    }
  });
  return placements;
}

/** Painter's algorithm: layer ASC, row DESC, col ASC */
export function sortPlacements(placements: BrickPlacement[]): BrickPlacement[] {
  return [...placements].sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    if (a.row !== b.row) return b.row - a.row;
    return a.col - b.col;
  });
}

export function collectPliEntries(
  steps: BuildStep[],
  currentStepIndex: number
): PliEntry[] {
  const step = steps[currentStepIndex];
  if (!step) return [];
  const entries: PliEntry[] = [];
  for (const entry of step.piecesUsed) {
    if (!Array.isArray(entry.placements) || entry.placements.length === 0) continue;
    entries.push({
      name: entry.name,
      colorHex: entry.colorHex || FALLBACK_COLOR,
      quantity: entry.quantity,
      partNum: entry.partNum,
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// ViewBox computation
// ---------------------------------------------------------------------------

export function computeViewBox(placements: BrickPlacement[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  if (placements.length === 0) {
    return { minX: 0, minY: 0, width: 200, height: 150 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const p of placements) {
    const dims = getDims(p.partNum, p.rotation);
    const layerH = (PART_DIMS[p.partNum] ?? DEFAULT_DIMS).layerH;
    const bh = (layerH * SCALE) / 20;

    // Sample the four top-face corners projected to SVG
    const corners: [number, number][] = [
      [p.col, p.row],
      [p.col + dims.w, p.row],
      [p.col, p.row + dims.d],
      [p.col + dims.w, p.row + dims.d],
    ];
    for (const [col, row] of corners) {
      const top = isoProject(col, row, p.layer + 1, SCALE);
      const bot = { x: top.x, y: top.y + bh };
      minX = Math.min(minX, top.x, bot.x);
      minY = Math.min(minY, top.y, bot.y);
      maxX = Math.max(maxX, top.x, bot.x);
      maxY = Math.max(maxY, top.y, bot.y);
    }
  }

  return {
    minX: minX - PADDING,
    minY: minY - PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  };
}
