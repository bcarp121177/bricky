"use client";

import { useState } from "react";
import type { InventoryPiece } from "@/lib/types";
import QuantitySetter from "./quantity-setter";
import BrickBingo from "./brick-bingo";

interface BrickShelfProps {
  pieces: InventoryPiece[];
  onRemove: (partNum: string, color: string) => void;
  onSetQuantity: (partNum: string, color: string, quantity: number) => void;
}

export default function BrickShelf({
  pieces,
  onRemove,
  onSetQuantity,
}: BrickShelfProps) {
  const [showBingo, setShowBingo] = useState(false);

  if (pieces.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
        <div className="text-4xl mb-2">🧱</div>
        <p className="text-gray-500 text-sm font-medium">Your shelf is empty</p>
        <p className="text-gray-400 text-xs mt-1">
          Browse pieces above and tap to add them here
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm">
          Your Shelf
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({pieces.length} type{pieces.length !== 1 ? "s" : ""})
          </span>
        </h3>
        <button
          onClick={() => setShowBingo((v) => !v)}
          className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full hover:bg-yellow-200 transition-colors"
        >
          {showBingo ? "Hide Bingo" : "Brick Bingo"}
        </button>
      </div>

      {/* Bingo board (collapsible) */}
      {showBingo && (
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <BrickBingo pieces={pieces} />
        </div>
      )}

      {/* Piece list */}
      <div className="space-y-2">
        {pieces.map((piece) => {
          const key = `${piece.partNum}:${piece.color}`;
          return (
            <div
              key={key}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-2.5"
            >
              {/* Part image */}
              <div
                className="flex-shrink-0 rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center"
                style={{ width: "48px", height: "48px" }}
              >
                <ShelfPartImage src={piece.imgUrl} alt={piece.name} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {piece.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: piece.colorHex,
                      border: "1px solid rgba(0,0,0,0.15)",
                      flexShrink: 0,
                    }}
                  />
                  <span className="text-xs text-gray-500">{piece.color}</span>
                  <span className="text-xs text-gray-400">#{piece.partNum}</span>
                </div>
              </div>

              {/* Quantity + remove */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <QuantitySetter
                  value={piece.quantity}
                  onChange={(qty) =>
                    onSetQuantity(piece.partNum, piece.color, qty)
                  }
                />
                <button
                  onClick={() => onRemove(piece.partNum, piece.color)}
                  aria-label="Remove piece"
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShelfPartImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "6px",
          backgroundColor: "#D1D5DB",
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      style={{ maxWidth: "44px", maxHeight: "44px", objectFit: "contain" }}
      onError={() => setErrored(true)}
    />
  );
}
