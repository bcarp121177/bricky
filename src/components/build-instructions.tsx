"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { BuildSuggestion, BuildStep } from "@/lib/types";
import { useAudio } from "@/hooks/use-audio";
import { generateLDraw } from "@/lib/ldraw-generator";

// Three.js must only run on the client — skip SSR entirely.
const LDrawViewer = dynamic(() => import("./ldraw-viewer"), { ssr: false });

// Asset: /public/snap.mp3 required — add a short CC0 click/snap sound

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

interface BuildInstructionsProps {
  suggestion: BuildSuggestion;
  onReset: () => void;
  onBack: () => void;
  onComplete: () => void;
}

export default function BuildInstructions({
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

  // 1-based step index for the cumulative LDraw model and label.
  const ldrawStep = currentStep + 1;
  const ldrawContent = generateLDraw(suggestion.steps, ldrawStep);

  // Speak the instruction when the step changes
  useEffect(() => {
    if (step) {
      speak(step.instruction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const goNext = () => {
    // Asset: /public/snap.mp3 required — add a short CC0 click/snap sound
    playSnap();
    if (isLastStep) {
      setDone(true);
      speak("Great job! You did it!");
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  if (done) {
    return <FinishedScreen onReset={onReset} onBack={onBack} />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">{suggestion.title}</h2>
        <p className="text-gray-500 text-sm mt-1">{suggestion.description}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              DIFFICULTY_COLORS[suggestion.difficulty] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {DIFFICULTY_LABELS[suggestion.difficulty] ?? `Level ${suggestion.difficulty}`}
          </span>
          <span className="text-xs text-gray-400">~{suggestion.estimatedTime}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-yellow-400 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
      <p className="text-center text-xs text-gray-400">
        Step {currentStep + 1} of {totalSteps}
      </p>

      {/* 3D model viewer — updates with each step */}
      <div className="rounded-2xl overflow-hidden mb-4">
        <LDrawViewer
          ldrawContent={ldrawContent}
          stepLabel={`Step ${ldrawStep} of ${totalSteps}`}
        />
      </div>

      {/* Step card */}
      <div className="bg-white rounded-2xl border-2 border-yellow-400 overflow-hidden">
        <div className="bg-yellow-400 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black text-yellow-400 font-black flex items-center justify-center text-sm">
            {step.stepNumber}
          </div>
          <span className="font-bold text-black text-sm">
            Step {step.stepNumber}
          </span>
        </div>
        <div className="p-4">
          <p className="text-gray-900 font-medium leading-relaxed text-base">
            {step.instruction}
          </p>

          {/* Piece chips */}
          {step.piecesUsed && step.piecesUsed.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {step.piecesUsed.map((piece, i) => (
                <PieceChip key={i} piece={piece} />
              ))}
            </div>
          )}
        </div>
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
          Previous
        </button>
        <button
          onClick={goNext}
          style={{ flex: 1 }}
          className={`py-2.5 rounded-full font-bold text-base transition-all active:scale-95 ${
            isLastStep
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-yellow-400 text-black hover:bg-yellow-500"
          }`}
        >
          {isLastStep ? "I Did It! ✓" : "Next →"}
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
              <li key={i} className="text-sm text-blue-800 flex gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Restart */}
      <div className="text-center">
        <button
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

/** Individual piece chip shown in a step */
function PieceChip({ piece }: { piece: BuildStep["piecesUsed"][number] }) {
  const [imgErrored, setImgErrored] = useState(false);

  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
      {/* Color dot */}
      <span
        style={{
          display: "inline-block",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: piece.colorHex,
          border: "1px solid rgba(0,0,0,0.15)",
          flexShrink: 0,
        }}
      />

      {/* Part image */}
      {!imgErrored ? (
        <img
          src={piece.imgUrl}
          alt={piece.name}
          style={{ width: "20px", height: "20px", objectFit: "contain" }}
          onError={() => setImgErrored(true)}
        />
      ) : (
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "3px",
            backgroundColor: "#D1D5DB",
            flexShrink: 0,
          }}
        />
      )}

      <span className="text-xs font-medium text-gray-700">
        {piece.quantity}× {piece.name}
      </span>
    </div>
  );
}

/** Shown when all steps are complete */
function FinishedScreen({
  onReset,
  onBack,
}: {
  onReset: () => void;
  onBack: () => void;
}) {
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
