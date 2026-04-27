"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { BuildSuggestion, BuildStep } from "@/lib/types";
import { useAudio } from "@/hooks/use-audio";
import { IsometricStepDiagram } from "@/components/isometric-step-diagram";

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

/** Returns true if at least one piece in the step has non-empty placement data. */
function hasPlacementData(step: BuildStep): boolean {
  return step.piecesUsed.some(
    (p) => Array.isArray(p.placements) && p.placements.length > 0
  );
}

interface BuildInstructionsProps {
  suggestion: BuildSuggestion;
  onReset: () => void;
  onBack: () => void;
  onComplete: () => void;
}

export function BuildInstructions({
  suggestion,
  onReset,
  onBack,
  onComplete,
}: BuildInstructionsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const { playSnap, speak } = useAudio();

  const totalSteps = suggestion.steps.length;
  const step = suggestion.steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  useEffect(() => {
    if (step) speak(step.instruction);
    // speak is stable (useCallback with no deps in useAudio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const goNext = () => {
    playSnap();
    if (isLastStep) {
      setDone(true);
      speak("Great job! You did it!");
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1));

  if (done) return <FinishedScreen onReset={onReset} onBack={onBack} />;

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">{suggestion.title}</h2>
        <p className="text-gray-500 text-sm mt-0.5">{suggestion.description}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DIFFICULTY_COLORS[suggestion.difficulty] ?? "bg-gray-100 text-gray-700"}`}>
            {DIFFICULTY_LABELS[suggestion.difficulty] ?? `Level ${suggestion.difficulty}`}
          </span>
          <span className="text-xs text-gray-600">~{suggestion.estimatedTime}</span>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 bg-yellow-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-xs text-gray-600 mt-1">
          Step {currentStep + 1} of {totalSteps}
        </p>
      </div>

      {/* Step card — key forces full re-mount + animation on step change */}
      <div key={currentStep} className="step-animate space-y-4">
        {/* Instruction */}
        <div className="bg-yellow-400 rounded-2xl px-4 py-4 flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full bg-black text-yellow-400 font-black text-base flex items-center justify-center flex-shrink-0">
            {step.stepNumber}
          </div>
          <p className="text-black font-semibold text-base leading-snug pt-1">
            {step.instruction}
          </p>
        </div>

        {/* Parts for this step — isometric diagram if placement data exists, chip grid otherwise */}
        {step.piecesUsed && step.piecesUsed.length > 0 && (
          hasPlacementData(step) ? (
            <IsometricStepDiagram
              steps={suggestion.steps.slice(0, currentStep + 1)}
              currentStepIndex={currentStep}
            />
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 px-1">
                Pieces for this step
              </p>
              <div className="grid grid-cols-2 gap-3">
                {step.piecesUsed.map((piece) => (
                  <PieceCard key={`${piece.partNum}-${piece.color}`} piece={piece} />
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-full bg-gray-100 text-gray-500 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          className="px-4 py-2.5 rounded-full bg-gray-100 text-gray-700 font-semibold disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          Prev
        </button>
        <button
          onClick={goNext}
          className={`flex-1 py-2.5 rounded-full font-bold text-base transition-all active:scale-95 ${
            isLastStep
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-900 text-white hover:bg-gray-700"
          }`}
        >
          {isLastStep ? "Done! ✓" : "Next step →"}
        </button>
      </div>

      {/* Tips */}
      {suggestion.tips && suggestion.tips.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm">
            <span>💡</span> Tips
          </h3>
          <ul className="space-y-1">
            {suggestion.tips.map((tip, i) => (
              <li key={`tip-${i}`} className="text-sm text-blue-800 flex gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onReset}
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

function PieceCard({ piece }: { piece: BuildStep["piecesUsed"][number] }) {
  const [imgErrored, setImgErrored] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Color strip */}
      <div style={{ backgroundColor: piece.colorHex, height: "5px" }} />

      <div className="p-3 flex gap-3 items-center flex-1">
        {/* Part image with quantity badge */}
        <div className="relative flex-shrink-0">
          {!imgErrored ? (
            <Image
              src={piece.imgUrl}
              alt={piece.name}
              width={64}
              height={64}
              className="object-contain"
              onError={() => setImgErrored(true)}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: piece.colorHex + "33" }}
            >
              🧱
            </div>
          )}
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow bg-gray-900"
          >
            {piece.quantity}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0">
          <p className="text-xs text-gray-700 font-medium leading-tight line-clamp-2">
            {piece.name}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
              style={{ backgroundColor: piece.colorHex }}
            />
            <span className="text-xs text-gray-600 truncate">{piece.color}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinishedScreen({ onReset, onBack }: { onReset: () => void; onBack: () => void }) {
  return (
    <div className="w-full flex flex-col items-center py-8 space-y-6 text-center">
      <div className="text-7xl">🎉</div>
      <div>
        <h2 className="text-2xl font-black text-gray-900">You did it!</h2>
        <p className="text-gray-500 mt-2">Amazing work. Your build is complete!</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onBack}
          className="w-full py-3 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-500 active:scale-95 transition-all"
        >
          Try Another Build
        </button>
        <button
          onClick={onReset}
          className="w-full py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
