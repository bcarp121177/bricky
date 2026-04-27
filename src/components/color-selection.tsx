"use client";

import { LEGO_COLORS, TRANSPARENT_SWATCH_CSS } from "@/lib/lego-colors";
import type { LegoColor } from "@/lib/lego-colors";

interface ColorSelectionProps {
  selected: string;          // canonical color name
  onChange: (color: LegoColor) => void;
}

export default function ColorSelection({ selected, onChange }: ColorSelectionProps) {
  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-gray-700 mb-2">Pick a color</p>
      <div className="flex flex-wrap gap-2">
        {LEGO_COLORS.map((color) => {
          const isSelected = color.name === selected;
          return (
            <button
              key={color.name}
              title={color.name}
              onClick={() => onChange(color)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: color.isTransparent
                  ? TRANSPARENT_SWATCH_CSS
                  : color.hex,
                border: isSelected
                  ? "3px solid #1B2A34"
                  : "3px solid transparent",
                outline: isSelected ? "2px solid #F7D117" : "none",
                outlineOffset: "2px",
                cursor: "pointer",
                boxShadow: isSelected
                  ? "0 0 0 1px #1B2A34"
                  : "0 1px 3px rgba(0,0,0,0.2)",
                flexShrink: 0,
              }}
              aria-label={color.name}
              aria-pressed={isSelected}
            />
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-1">{selected}</p>
    </div>
  );
}
