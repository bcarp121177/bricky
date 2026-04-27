"use client";

import { useState, useEffect, useCallback } from "react";
import type { PartRecord, PieceCategory, InventoryPiece } from "@/lib/types";
import type { LegoColor } from "@/lib/lego-colors";

const CATEGORIES: Array<PieceCategory | "All"> = [
  "All", "Bricks", "Plates", "Tiles", "Slopes", "Round", "Other"
];

interface PieceBrowserProps {
  selectedColor: LegoColor;
  inventory: Map<string, InventoryPiece>;
  onAdd: (piece: Omit<InventoryPiece, "quantity">) => void;
}

export default function PieceBrowser({
  selectedColor,
  inventory,
  onAdd,
}: PieceBrowserProps) {
  const [category, setCategory] = useState<PieceCategory | "All">("All");
  const [parts, setParts] = useState<PartRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchParts = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          color: selectedColor.name,
          page:  String(pageNum),
        });
        if (category !== "All") params.set("category", category);

        const res = await fetch(`/api/parts?${params.toString()}`);
        if (!res.ok) return;
        const data: { parts: PartRecord[]; hasMore: boolean } = await res.json();
        setParts((prev) => (append ? [...prev, ...data.parts] : data.parts));
        setHasMore(data.hasMore);
      } catch {
        // ignore network errors
      } finally {
        setLoading(false);
      }
    },
    [selectedColor.name, category]
  );

  // Reset and fetch when color or category changes
  useEffect(() => {
    setPage(1);
    fetchParts(1, false);
  }, [fetchParts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchParts(nextPage, true);
  };

  function getInventoryCount(partNum: string): number {
    // Sum all colors for this part
    let total = 0;
    for (const [key, piece] of inventory) {
      if (key.startsWith(`${partNum}:`)) {
        total += piece.quantity;
      }
    }
    return total;
  }

  return (
    <div className="w-full space-y-3">
      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{ flexShrink: 0 }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              category === cat
                ? "bg-yellow-400 text-black"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Parts grid */}
      {loading && parts.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading parts...</div>
      ) : parts.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No parts found</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {parts.map((part) => {
            const count = getInventoryCount(part.partNum);
            const inventoryKey = `${part.partNum}:${selectedColor.name}`;
            const inInventoryForThisColor = inventory.get(inventoryKey)?.quantity ?? 0;

            return (
              <button
                key={part.partNum}
                onClick={() =>
                  onAdd({
                    partNum:  part.partNum,
                    name:     part.name,
                    color:    selectedColor.name,
                    colorHex: selectedColor.hex,
                    imgUrl:   part.imgUrl,
                    category: part.category,
                  })
                }
                className="relative bg-white rounded-xl border border-gray-200 p-2 text-left hover:border-yellow-400 hover:shadow-sm active:scale-95 transition-all"
              >
                {/* Part image */}
                <div
                  className="w-full rounded-lg bg-gray-50 mb-1.5 overflow-hidden flex items-center justify-center"
                  style={{ height: "64px" }}
                >
                  <PartImage src={part.imgUrl} alt={part.name} />
                </div>

                {/* Part name */}
                <p className="text-xs font-medium text-gray-900 leading-tight line-clamp-2">
                  {part.name}
                </p>
                <p className="text-xs text-gray-400">#{part.partNum}</p>

                {/* Inventory badge */}
                {count > 0 && (
                  <span
                    className="absolute top-1 right-1 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center justify-center"
                    style={{ width: "18px", height: "18px", fontSize: "10px" }}
                  >
                    {inInventoryForThisColor > 0 ? inInventoryForThisColor : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Load more
        </button>
      )}
      {loading && parts.length > 0 && (
        <p className="text-center text-sm text-gray-400 py-2">Loading...</p>
      )}
    </div>
  );
}

/** Part image with onError fallback to gray placeholder */
function PartImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        style={{ width: "48px", height: "48px", borderRadius: "6px", backgroundColor: "#D1D5DB" }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ maxWidth: "100%", maxHeight: "60px", objectFit: "contain" }}
      onError={() => setErrored(true)}
    />
  );
}
