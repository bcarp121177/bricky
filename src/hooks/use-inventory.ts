"use client";

import { useState, useCallback } from "react";
import type { InventoryPiece } from "@/lib/types";

/** Inventory map key = `${partNum}:${color}` */
function makeKey(partNum: string, color: string): string {
  return `${partNum}:${color}`;
}

export interface UseInventoryResult {
  inventory: Map<string, InventoryPiece>;
  addPiece: (piece: Omit<InventoryPiece, "quantity">) => void;
  removePiece: (partNum: string, color: string) => void;
  setQuantity: (partNum: string, color: string, quantity: number) => void;
  clearInventory: () => void;
  pieces: InventoryPiece[];
  totalCount: number;
}

export function useInventory(): UseInventoryResult {
  const [inventory, setInventory] = useState<Map<string, InventoryPiece>>(
    new Map()
  );

  const addPiece = useCallback(
    (piece: Omit<InventoryPiece, "quantity">) => {
      const key = makeKey(piece.partNum, piece.color);
      setInventory((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (existing) {
          next.set(key, { ...existing, quantity: existing.quantity + 1 });
        } else {
          next.set(key, { ...piece, quantity: 1 });
        }
        return next;
      });
    },
    []
  );

  const removePiece = useCallback((partNum: string, color: string) => {
    const key = makeKey(partNum, color);
    setInventory((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const setQuantity = useCallback(
    (partNum: string, color: string, quantity: number) => {
      const key = makeKey(partNum, color);
      setInventory((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (!existing) return next;
        if (quantity <= 0) {
          next.delete(key);
        } else {
          next.set(key, { ...existing, quantity });
        }
        return next;
      });
    },
    []
  );

  const clearInventory = useCallback(() => {
    setInventory(new Map());
  }, []);

  const pieces = Array.from(inventory.values());
  const totalCount = pieces.reduce((sum, p) => sum + p.quantity, 0);

  return {
    inventory,
    addPiece,
    removePiece,
    setQuantity,
    clearInventory,
    pieces,
    totalCount,
  };
}
