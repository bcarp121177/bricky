"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const LDrawViewer = dynamic(() => import("./ldraw-viewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-sm text-gray-400" style={{ height: 300 }}>
      Loading 3D viewer…
    </div>
  ),
});

interface Piece {
  name: string;
  color: string;
  quantity: number;
  partNum?: string;
}

interface Step {
  stepNumber: number;
  instruction: string;
  piecesUsed: string[];
}

interface Build {
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  steps: Step[];
}

interface BuildResult {
  pieces: Piece[];
  build: Build;
  tips: string[];
  alternateIdeas: string[];
  ldraw?: string | null;
}

interface BuildInstructionsProps {
  result: BuildResult;
  onReset: () => void;
}

const difficultyColor: Record<string, string> = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Hard: "bg-red-100 text-red-800",
};

export default function BuildInstructions({
  result,
  onReset,
}: BuildInstructionsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const { pieces, build, tips, alternateIdeas, ldraw } = result;
  const totalSteps = build.steps.length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{build.title}</h2>
        <p className="text-gray-600 mt-1">{build.description}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColor[build.difficulty] || "bg-gray-100 text-gray-800"}`}
          >
            {build.difficulty}
          </span>
          <span className="text-sm text-gray-500">
            ~{build.estimatedTime}
          </span>
        </div>
      </div>

      {/* Pieces inventory */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-lg">🧱</span> Pieces Needed ({pieces.length}{" "}
          types)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {pieces.map((piece, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-2.5 text-sm border border-gray-200"
            >
              <div className="font-medium text-gray-900">
                {piece.quantity}x {piece.name}
              </div>
              <div className="text-gray-500 text-xs">
                {piece.color}
                {piece.partNum && ` (#${piece.partNum})`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3D viewer */}
      {ldraw && !showAllSteps && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400 text-center">
            3D preview — drag to rotate, scroll to zoom
          </p>
          <LDrawViewer ldrawContent={ldraw} currentStep={currentStep} />
        </div>
      )}

      {/* Step-by-step instructions */}
      <div className="bg-white rounded-2xl border-2 border-yellow-400 overflow-hidden">
        <div className="bg-yellow-400 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-black flex items-center gap-2">
            <span className="text-lg">📋</span> Building Steps
          </h3>
          <button
            onClick={() => setShowAllSteps(!showAllSteps)}
            className="text-sm font-medium text-black/70 hover:text-black"
          >
            {showAllSteps ? "Step by step" : "Show all"}
          </button>
        </div>

        {showAllSteps ? (
          <div className="p-4 space-y-4">
            {build.steps.map((step) => (
              <StepCard key={step.stepNumber} step={step} total={totalSteps} />
            ))}
          </div>
        ) : (
          <div className="p-4">
            <StepCard
              step={build.steps[currentStep]}
              total={totalSteps}
            />
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                disabled={currentStep === 0}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-medium disabled:opacity-30 hover:bg-gray-200 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                {currentStep + 1} / {totalSteps}
              </span>
              <button
                onClick={() =>
                  setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))
                }
                disabled={currentStep === totalSteps - 1}
                className="px-4 py-2 rounded-full bg-yellow-400 text-black font-medium disabled:opacity-30 hover:bg-yellow-500 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span> Tips
          </h3>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-blue-800 flex gap-2">
                <span className="text-blue-400 mt-0.5">&#8226;</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternate ideas */}
      {alternateIdeas && alternateIdeas.length > 0 && (
        <div className="bg-purple-50 rounded-2xl p-4">
          <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <span className="text-lg">✨</span> Other Ideas
          </h3>
          <ul className="space-y-1.5">
            {alternateIdeas.map((idea, i) => (
              <li key={i} className="text-sm text-purple-800 flex gap-2">
                <span className="text-purple-400 mt-0.5">&#8226;</span>
                {idea}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reset button */}
      <div className="text-center pt-2">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors"
        >
          Scan More Pieces
        </button>
      </div>
    </div>
  );
}

function StepCard({ step, total }: { step: Step; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center text-sm">
          {step.stepNumber}
        </div>
        <div className="flex-1">
          <p className="text-gray-900 font-medium leading-relaxed">
            {step.instruction}
          </p>
          {step.piecesUsed && step.piecesUsed.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {step.piecesUsed.map((piece, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {piece}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {step.stepNumber < total && <hr className="border-gray-100" />}
    </div>
  );
}
