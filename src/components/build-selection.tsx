"use client";

import type { BuildSuggestion } from "@/lib/types";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-red-100 text-red-800",
};

interface BuildSelectionProps {
  suggestions: BuildSuggestion[];
  onSelect: (suggestion: BuildSuggestion) => void;
}

export default function BuildSelection({
  suggestions,
  onSelect,
}: BuildSelectionProps) {
  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">What will you build?</h2>
        <p className="text-gray-500 text-sm mt-1">
          Pick one of these ideas made just for your pieces
        </p>
      </div>

      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="w-full text-left bg-white rounded-2xl border-2 border-gray-200 hover:border-yellow-400 hover:shadow-md active:scale-98 transition-all p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base leading-tight">
                  {s.title}
                </h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  {s.description}
                </p>
              </div>
              <div className="flex-shrink-0 text-2xl">
                {i === 0 ? "⭐" : i === 1 ? "🎯" : "🎨"}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  DIFFICULTY_COLORS[s.difficulty] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {DIFFICULTY_LABELS[s.difficulty] ?? `Level ${s.difficulty}`}
              </span>
              <span className="text-xs text-gray-400">
                ~{s.estimatedTime}
              </span>
              <span className="text-xs text-gray-400">
                {s.steps.length} step{s.steps.length !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
