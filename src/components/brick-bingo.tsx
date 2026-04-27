"use client";

import type { InventoryPiece, BingoCell } from "@/lib/types";

const BINGO_CELLS: BingoCell[] = [
  { id: "2x4-brick",  label: "2×4 Brick",  category: "Bricks" },
  { id: "2x2-brick",  label: "2×2 Brick",  category: "Bricks" },
  { id: "1x4-brick",  label: "1×4 Brick",  category: "Bricks" },
  { id: "1x2-brick",  label: "1×2 Brick",  category: "Bricks" },
  { id: "2x4-plate",  label: "2×4 Plate",  category: "Plates" },
  { id: "2x2-plate",  label: "2×2 Plate",  category: "Plates" },
  { id: "1x4-plate",  label: "1×4 Plate",  category: "Plates" },
  { id: "1x2-tile",   label: "1×2 Tile",   category: "Tiles"  },
  { id: "slope",      label: "Slope",       category: "Slopes" },
  { id: "round-1x1",  label: "Round 1×1",  category: "Round"  },
  { id: "technic",    label: "Technic",     category: null      },
  { id: "window",     label: "Window",      category: null      },
  { id: "door",       label: "Door",        category: null      },
  { id: "wheel",      label: "Wheel",       category: null      },
  { id: "transparent",label: "Clear",       category: null      },
  { id: "specialty",  label: "Specialty",   category: "Other"  },
];

function isCellMatched(cell: BingoCell, pieces: InventoryPiece[]): boolean {
  return pieces.some((piece) => matchesCell(cell, piece));
}

function matchesCell(cell: BingoCell, piece: InventoryPiece): boolean {
  const name = piece.name;
  switch (cell.id) {
    case "2x4-brick":
      return name.includes("2x4") && name.toLowerCase().includes("brick");
    case "2x2-brick":
      return name.includes("2x2") && name.toLowerCase().includes("brick");
    case "1x4-brick":
      return name.includes("1x4") && name.toLowerCase().includes("brick");
    case "1x2-brick":
      return name.includes("1x2") && name.toLowerCase().includes("brick");
    case "2x4-plate":
      return name.includes("2x4") && name.toLowerCase().includes("plate");
    case "2x2-plate":
      return name.includes("2x2") && name.toLowerCase().includes("plate");
    case "1x4-plate":
      return name.includes("1x4") && name.toLowerCase().includes("plate");
    case "1x2-tile":
      return name.includes("1x2") && name.toLowerCase().includes("tile");
    case "slope":
      return name.toLowerCase().includes("slope");
    case "round-1x1":
      return name.toLowerCase().includes("round") && name.includes("1x1");
    case "technic":
      return name.toLowerCase().includes("technic");
    case "window":
      return name.toLowerCase().includes("window");
    case "door":
      return name.toLowerCase().includes("door");
    case "wheel":
      return name.toLowerCase().includes("wheel");
    case "transparent":
      return piece.colorHex === "#AAAAAA";
    case "specialty":
      return piece.category === "Other";
    default:
      return false;
  }
}

function hasCompletedRow(matched: boolean[]): boolean {
  for (let row = 0; row < 4; row++) {
    if (matched.slice(row * 4, row * 4 + 4).every(Boolean)) return true;
  }
  return false;
}

function hasCompletedCol(matched: boolean[]): boolean {
  for (let col = 0; col < 4; col++) {
    if ([0, 1, 2, 3].every((row) => matched[row * 4 + col])) return true;
  }
  return false;
}

interface BrickBingoProps {
  pieces: InventoryPiece[];
}

export default function BrickBingo({ pieces }: BrickBingoProps) {
  const matched = BINGO_CELLS.map((cell) => isCellMatched(cell, pieces));
  const hasBingo = hasCompletedRow(matched) || hasCompletedCol(matched);
  const matchedCount = matched.filter(Boolean).length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900 text-sm">Brick Bingo</h3>
        {hasBingo && (
          <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
            BINGO!
          </span>
        )}
        <span className="text-xs text-gray-500">{matchedCount}/16</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "4px",
        }}
      >
        {BINGO_CELLS.map((cell, i) => {
          const isMatched = matched[i];
          return (
            <div
              key={cell.id}
              style={{
                padding: "6px 2px",
                borderRadius: "6px",
                backgroundColor: isMatched ? "#F7D117" : "#F3F4F6",
                border: isMatched ? "1px solid #D97706" : "1px solid #E5E7EB",
                textAlign: "center",
                fontSize: "10px",
                fontWeight: isMatched ? 700 : 500,
                color: isMatched ? "#1B2A34" : "#6B7280",
                lineHeight: 1.2,
                transition: "background-color 0.2s",
              }}
              title={cell.label}
            >
              {cell.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
