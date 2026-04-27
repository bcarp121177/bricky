"use client";

import type { BuildStep } from "@/lib/types";
import { getDims, DEFAULT_DIMS, PART_DIMS } from "@/lib/ldraw-generator";
import { desaturate, adjustLightness } from "@/lib/color-utils";
import { brickToPolygons, studCenters } from "@/lib/isometric";
import {
  collectPlacements,
  sortPlacements,
  collectPliEntries,
  computeViewBox,
  SCALE,
  type BrickPlacement,
  type PliEntry,
} from "@/lib/isometric-step-data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STUD_RADIUS = 0.35;  // fraction of scale
const BADGE_R = 18;        // step badge radius in SVG units
const PLI_FONT = 11;       // PLI font size in SVG units
const PLI_ROW_H = 22;      // PLI row height in SVG units
const PLI_CHIP_W = 12;     // PLI color chip width
const PLI_CHIP_H = 10;     // PLI color chip height
const PLI_PAD = 8;         // PLI inner padding
const FALLBACK_COLOR = "#C0C0C0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IsometricStepDiagramProps = {
  /** All steps up to and including the current step. */
  steps: BuildStep[];
  /** 0-based index of the step currently being displayed. */
  currentStepIndex: number;
};

// ---------------------------------------------------------------------------
// Face color helpers
// ---------------------------------------------------------------------------

function faceColor(colorHex: string, isCurrent: boolean, faceFactor: number): string {
  const hex = colorHex || FALLBACK_COLOR;
  const saturated = isCurrent ? hex : desaturate(hex, 0.5);
  return adjustLightness(saturated, faceFactor);
}

function studColor(colorHex: string, isCurrent: boolean): string {
  const hex = colorHex || FALLBACK_COLOR;
  const saturated = isCurrent ? hex : desaturate(hex, 0.5);
  return adjustLightness(saturated, 0.85);
}

// ---------------------------------------------------------------------------
// SVG sub-components (render functions returning JSX)
// ---------------------------------------------------------------------------

function BrickSvg({ p }: { p: BrickPlacement }): React.ReactElement {
  const dims = getDims(p.partNum, p.rotation);
  const layerH = (PART_DIMS[p.partNum] ?? DEFAULT_DIMS).layerH;
  const { top, leftFront, rightFront } = brickToPolygons(
    p.col, p.row, p.layer, dims.w, dims.d, layerH, SCALE
  );
  const studs = studCenters(p.col, p.row, p.layer, dims.w, dims.d, SCALE, layerH);
  const stroke = p.isCurrent ? "#000000" : "none";
  const strokeW = p.isCurrent ? 1 : 0;
  const brickKey = `${p.col}-${p.row}-${p.layer}-${p.partNum}`;

  return (
    <g>
      {/* Right-front face (darkest) */}
      <polygon
        points={rightFront}
        fill={faceColor(p.colorHex, p.isCurrent, 0.65)}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Left-front face */}
      <polygon
        points={leftFront}
        fill={faceColor(p.colorHex, p.isCurrent, 0.80)}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Top face (brightest) */}
      <polygon
        points={top}
        fill={faceColor(p.colorHex, p.isCurrent, 1.0)}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Studs */}
      {studs.map((s, i) => (
        <circle
          key={`${brickKey}-s${i}`}
          cx={s.cx}
          cy={s.cy}
          r={SCALE * STUD_RADIUS}
          fill={studColor(p.colorHex, p.isCurrent)}
          stroke={stroke}
          strokeWidth={strokeW * 0.5}
        />
      ))}
    </g>
  );
}

function PliPanel({
  entries,
  vb,
}: {
  entries: PliEntry[];
  vb: { minX: number; minY: number; width: number; height: number };
}): React.ReactElement | null {
  if (entries.length === 0) return null;

  const pliW = Math.min(160, vb.width * 0.45);
  const pliH = PLI_PAD * 2 + entries.length * PLI_ROW_H;
  const pliX = vb.minX + vb.width - pliW - PLI_PAD;
  const pliY = vb.minY + PLI_PAD;

  return (
    <g>
      <rect
        x={pliX} y={pliY}
        width={pliW} height={pliH}
        fill="white"
        stroke="#CCCCCC"
        strokeWidth={1}
        rx={6} ry={6}
      />
      {entries.map((e, i) => {
        const rowY = pliY + PLI_PAD + i * PLI_ROW_H;
        return (
          <g key={`${e.partNum}-${e.colorHex}`}>
            <rect
              x={pliX + PLI_PAD}
              y={rowY + (PLI_ROW_H - PLI_CHIP_H) / 2}
              width={PLI_CHIP_W}
              height={PLI_CHIP_H}
              fill={e.colorHex || FALLBACK_COLOR}
              rx={2} ry={2}
            />
            <text
              x={pliX + PLI_PAD + PLI_CHIP_W + 6}
              y={rowY + PLI_ROW_H / 2 + PLI_FONT * 0.35}
              fontSize={PLI_FONT}
              fontFamily="system-ui, sans-serif"
              fill="#333333"
            >
              {e.quantity}× {truncate(e.name, Math.floor((pliW - PLI_CHIP_W - PLI_PAD * 2 - 24) / 6))}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function StepBadge({
  stepNumber,
  vb,
}: {
  stepNumber: number;
  vb: { minX: number; minY: number; width: number; height: number };
}): React.ReactElement {
  const cx = vb.minX + BADGE_R + PLI_PAD;
  const cy = vb.minY + vb.height - BADGE_R - PLI_PAD;
  return (
    <g>
      <circle cx={cx} cy={cy} r={BADGE_R} fill="#000000" />
      <text
        x={cx} y={cy + 5}
        textAnchor="middle"
        fontSize={16}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        fill="white"
      >
        {stepNumber}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function truncate(str: string, maxLen: number): string {
  if (maxLen <= 3 || str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IsometricStepDiagram({
  steps,
  currentStepIndex,
}: IsometricStepDiagramProps): React.ReactElement | null {
  const allPlacements = collectPlacements(steps, currentStepIndex);
  if (allPlacements.length === 0) return null;

  const sorted = sortPlacements(allPlacements);
  const vb = computeViewBox(allPlacements);
  const pliEntries = collectPliEntries(steps, currentStepIndex);
  const currentStep = steps[currentStepIndex];
  const stepNumber = currentStep?.stepNumber ?? currentStepIndex + 1;

  const viewBox = `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`;

  return (
    <svg
      width="100%"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", background: "#FFFFFF" }}
    >
      {sorted.map((p, i) => (
        <BrickSvg key={`brick-${i}`} p={p} />
      ))}
      <PliPanel entries={pliEntries} vb={vb} />
      <StepBadge stepNumber={stepNumber} vb={vb} />
    </svg>
  );
}
