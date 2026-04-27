"use client";

import type { Theme } from "@/lib/types";

interface ThemeMeta {
  emoji: string;
  gradient: string;
  label: Theme;
}

const THEMES: ThemeMeta[] = [
  { label: "Space",       emoji: "🚀", gradient: "from-indigo-900 to-purple-900"   },
  { label: "Animals",     emoji: "🦁", gradient: "from-green-700 to-emerald-500"   },
  { label: "Vehicles",    emoji: "🚗", gradient: "from-red-600 to-orange-500"      },
  { label: "Castle",      emoji: "🏰", gradient: "from-stone-700 to-stone-500"     },
  { label: "Ocean",       emoji: "🌊", gradient: "from-blue-700 to-cyan-500"       },
  { label: "Surprise Me", emoji: "✨", gradient: "from-pink-500 to-yellow-400"     },
];

interface ThemePickerProps {
  selected: Theme | null;
  onChange: (theme: Theme) => void;
}

export default function ThemePicker({ selected, onChange }: ThemePickerProps) {
  return (
    <div className="w-full space-y-3">
      <p className="text-sm font-semibold text-gray-700">Choose a theme</p>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((theme) => {
          const isSelected = selected === theme.label;
          return (
            <button
              key={theme.label}
              onClick={() => onChange(theme.label)}
              className={`
                relative overflow-hidden rounded-2xl p-4 text-left transition-all
                bg-gradient-to-br ${theme.gradient}
                ${isSelected
                  ? "ring-4 ring-yellow-400 ring-offset-2 scale-105"
                  : "opacity-80 hover:opacity-100 hover:scale-102 active:scale-95"
                }
              `}
            >
              <div className="text-3xl mb-1">{theme.emoji}</div>
              <div className="font-bold text-white text-sm">{theme.label}</div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-yellow-400 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Export theme meta so other components can use it */
export { THEMES };
export type { ThemeMeta };
