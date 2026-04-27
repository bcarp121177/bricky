"use client";

import { useState, useCallback } from "react";
import type { Theme, InventoryPiece, BuildResponse, BuildSuggestion } from "@/lib/types";
import type { LegoColor } from "@/lib/lego-colors";
import { LEGO_COLORS } from "@/lib/lego-colors";

import { useInventory } from "@/hooks/use-inventory";

import ColorSelection from "@/components/color-selection";
import PieceBrowser from "@/components/piece-browser";
import BrickShelf from "@/components/brick-shelf";
import MysteryPieceScanner from "@/components/camera-upload";
import ThemePicker from "@/components/theme-picker";
import BuildSelection from "@/components/build-selection";
import BuildInstructions from "@/components/build-instructions";
import LoadingState from "@/components/loading-state";
import Confetti from "@/components/confetti";

/**
 * 8-screen state machine:
 *   welcome → inventory → theme → loading → pick → build → done → (back to welcome)
 *
 * Additional overlay: scan (modal, can open from inventory screen)
 */
type Screen =
  | "welcome"
  | "inventory"
  | "theme"
  | "loading"
  | "pick"
  | "build"
  | "done"
  | "error";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selectedColor, setSelectedColor] = useState<LegoColor>(
    LEGO_COLORS.find((c) => c.name === "Bright Red") ?? LEGO_COLORS[0]
  );
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [buildResponse, setBuildResponse] = useState<BuildResponse | null>(null);
  const [chosenSuggestion, setChosenSuggestion] = useState<BuildSuggestion | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { inventory, pieces, totalCount, addPiece, removePiece, setQuantity, clearInventory } =
    useInventory();

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const goToInventory = () => setScreen("inventory");
  const goToTheme = () => {
    if (pieces.length === 0) return;
    setScreen("theme");
  };
  const goToBuild = useCallback(async () => {
    if (!selectedTheme) return;
    setScreen("loading");
    setErrorMessage("");

    try {
      const body = { pieces, theme: selectedTheme };
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? `Build failed (${res.status})`);
      }

      const data: BuildResponse = await res.json();
      setBuildResponse(data);
      setScreen("pick");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setScreen("error");
    }
  }, [pieces, selectedTheme]);

  const handleSelectSuggestion = (suggestion: BuildSuggestion) => {
    setChosenSuggestion(suggestion);
    setScreen("build");
  };

  const handleBuildComplete = () => {
    setShowConfetti(true);
    setScreen("done");
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const handleReset = () => {
    clearInventory();
    setBuildResponse(null);
    setChosenSuggestion(null);
    setSelectedTheme(null);
    setShowConfetti(false);
    setScreen("welcome");
  };

  const handleBackToPick = () => {
    setChosenSuggestion(null);
    setScreen("pick");
  };

  const handleScannerFound = useCallback(
    (piece: Omit<InventoryPiece, "quantity">) => {
      addPiece(piece);
    },
    [addPiece]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="bg-yellow-400 px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🧱</span>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight leading-none">
                Bricky
              </h1>
              <p className="text-xs text-black/60 font-medium">
                Build Something Amazing
              </p>
            </div>
          </button>

          {/* Inventory badge */}
          {totalCount > 0 && screen !== "inventory" && (
            <button
              onClick={goToInventory}
              className="flex items-center gap-1.5 bg-black text-yellow-400 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              <span>🧱</span>
              <span>{totalCount}</span>
            </button>
          )}
        </div>
      </header>

      {/* Confetti overlay */}
      {showConfetti && <Confetti />}

      {/* Scanner modal */}
      {showScanner && (
        <MysteryPieceScanner
          selectedColor={selectedColor}
          onFound={handleScannerFound}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">

          {/* ── Screen: welcome ──────────────────────────────────────────── */}
          {screen === "welcome" && (
            <div className="space-y-8 text-center">
              <div className="pt-4">
                <div className="text-8xl mb-4">🧱</div>
                <h2 className="text-3xl font-black text-gray-900">
                  What will you build?
                </h2>
                <p className="text-gray-500 mt-2 text-base">
                  Tell us what LEGO pieces you have. We will come up with something awesome.
                </p>
              </div>

              <button
                onClick={goToInventory}
                className="w-full max-w-xs mx-auto block py-4 bg-yellow-400 text-black font-black text-xl rounded-full shadow-lg shadow-yellow-400/30 hover:bg-yellow-500 active:scale-95 transition-all"
              >
                Add My Pieces →
              </button>

              {/* How it works */}
              <div className="grid grid-cols-3 gap-4 text-center pt-2">
                {[
                  { icon: "🧱", title: "Add Pieces", desc: "Browse or scan your bricks" },
                  { icon: "🎨", title: "Pick Theme", desc: "Space, Castle, Ocean & more" },
                  { icon: "📋", title: "Build!", desc: "Step-by-step instructions" },
                ].map((step) => (
                  <div key={step.title}>
                    <div className="text-3xl mb-1">{step.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Screen: inventory ────────────────────────────────────────── */}
          {screen === "inventory" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900">Your Pieces</h2>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  <span>📷</span> Scan
                </button>
              </div>

              {/* Color picker */}
              <ColorSelection
                selected={selectedColor.name}
                onChange={setSelectedColor}
              />

              {/* Part browser */}
              <PieceBrowser
                selectedColor={selectedColor}
                inventory={inventory}
                onAdd={addPiece}
              />

              {/* Shelf */}
              {pieces.length > 0 && (
                <div className="mt-4 space-y-3">
                  <hr className="border-gray-200" />
                  <BrickShelf
                    pieces={pieces}
                    onRemove={removePiece}
                    onSetQuantity={setQuantity}
                  />
                </div>
              )}

              {/* Next CTA */}
              <div className="sticky bottom-4 pt-2">
                <button
                  onClick={goToTheme}
                  disabled={pieces.length === 0}
                  className="w-full py-4 bg-yellow-400 text-black font-black text-lg rounded-full shadow-lg disabled:opacity-40 hover:bg-yellow-500 active:scale-95 transition-all"
                >
                  {pieces.length === 0
                    ? "Add pieces to continue"
                    : `Pick a Theme (${totalCount} piece${totalCount !== 1 ? "s" : ""}) →`}
                </button>
              </div>
            </div>
          )}

          {/* ── Screen: theme ────────────────────────────────────────────── */}
          {screen === "theme" && (
            <div className="space-y-5">
              <button
                onClick={goToInventory}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                ← Back to pieces
              </button>

              <ThemePicker
                selected={selectedTheme}
                onChange={setSelectedTheme}
              />

              <button
                onClick={goToBuild}
                disabled={!selectedTheme}
                className="w-full py-4 bg-yellow-400 text-black font-black text-lg rounded-full shadow-lg disabled:opacity-40 hover:bg-yellow-500 active:scale-95 transition-all"
              >
                {selectedTheme ? `Let's Build ${selectedTheme}! →` : "Pick a theme first"}
              </button>
            </div>
          )}

          {/* ── Screen: loading ───────────────────────────────────────────── */}
          {screen === "loading" && (
            <LoadingState theme={selectedTheme} />
          )}

          {/* ── Screen: pick ──────────────────────────────────────────────── */}
          {screen === "pick" && buildResponse && (
            <div className="space-y-5">
              <button
                onClick={() => setScreen("theme")}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                ← Change theme
              </button>
              <BuildSelection
                suggestions={buildResponse.suggestions}
                onSelect={handleSelectSuggestion}
              />
            </div>
          )}

          {/* ── Screen: build ─────────────────────────────────────────────── */}
          {screen === "build" && chosenSuggestion && (
            <BuildInstructions
              suggestion={chosenSuggestion}
              onReset={handleReset}
              onBack={handleBackToPick}
            />
          )}

          {/* ── Screen: done (handled inside BuildInstructions via FinishedScreen) */}
          {/* The done state is managed inside BuildInstructions via the "I Did It!" button */}

          {/* ── Screen: error ─────────────────────────────────────────────── */}
          {screen === "error" && (
            <div className="text-center py-12 space-y-4">
              <div className="text-5xl">😕</div>
              <h2 className="text-xl font-bold text-gray-900">
                Oops, something went wrong
              </h2>
              <p className="text-gray-500 text-sm">{errorMessage}</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={goToBuild}
                  className="w-full py-3 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-500 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 text-center text-xs text-gray-400 border-t border-gray-100">
        Built with AI — not affiliated with the LEGO Group
      </footer>
    </div>
  );
}
