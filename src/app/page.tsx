"use client";

import { useState, useCallback } from "react";
import type { Theme, InventoryPiece, BuildResponse, BuildSuggestion } from "@/lib/types";
import { LEGO_COLORS, type LegoColor } from "@/lib/lego-colors";

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
import WelcomeScreen from "@/components/welcome-screen";
import DoneScreen from "@/components/done-screen";
import ErrorScreen from "@/components/error-screen";

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
        const errData: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof errData === "object" &&
          errData !== null &&
          "error" in errData
            ? String((errData as Record<string, unknown>).error)
            : `Build failed (${res.status})`;
        throw new Error(msg);
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
          {screen === "welcome" && <WelcomeScreen onStart={goToInventory} />}

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
          {screen === "loading" && <LoadingState theme={selectedTheme} />}

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
              onComplete={handleBuildComplete}
            />
          )}

          {/* ── Screen: done ───────────────────────────────────────────────── */}
          {screen === "done" && <DoneScreen onBackToPick={handleBackToPick} onReset={handleReset} />}

          {/* ── Screen: error ─────────────────────────────────────────────── */}
          {screen === "error" && <ErrorScreen message={errorMessage} onRetry={goToBuild} onReset={handleReset} />}

        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 text-center text-xs text-gray-400 border-t border-gray-100">
        Built with AI — not affiliated with the LEGO Group
      </footer>
    </div>
  );
}
