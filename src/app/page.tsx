"use client";

import { useState, useCallback } from "react";
import CameraUpload from "@/components/camera-upload";
import BuildInstructions from "@/components/build-instructions";
import LoadingState from "@/components/loading-state";

type AppState = "idle" | "loading" | "results" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageCapture = useCallback((file: File) => {
    setImageFile(file);
  }, []);

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setState("loading");
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Analysis failed (${response.status})`
        );
      }

      const data = await response.json();
      setResult(data);
      setState("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setError("");
    setImageFile(null);
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="bg-yellow-400 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="text-3xl">🧱</div>
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">
              Bricky
            </h1>
            <p className="text-sm text-black/60 font-medium -mt-0.5">
              Snap. Identify. Build.
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {state === "idle" && (
            <div className="space-y-6">
              {/* Hero text */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                  What will you build today?
                </h2>
                <p className="text-gray-500 mt-1">
                  Take a photo of your LEGO pieces and get custom building
                  instructions
                </p>
              </div>

              {/* Camera/upload */}
              <CameraUpload onImageCapture={handleImageCapture} />

              {/* Analyze button */}
              {imageFile && (
                <div className="text-center">
                  <button
                    onClick={handleAnalyze}
                    className="px-8 py-3.5 bg-yellow-400 text-black font-bold text-lg rounded-full hover:bg-yellow-500 active:scale-95 transition-all shadow-lg shadow-yellow-400/30"
                  >
                    What Can I Build?
                  </button>
                </div>
              )}

              {/* How it works */}
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                {[
                  {
                    icon: "📸",
                    title: "Snap",
                    desc: "Photo your loose pieces",
                  },
                  {
                    icon: "🔍",
                    title: "Identify",
                    desc: "AI recognizes each brick",
                  },
                  {
                    icon: "📋",
                    title: "Build",
                    desc: "Get step-by-step instructions",
                  },
                ].map((step) => (
                  <div key={step.title}>
                    <div className="text-3xl mb-1">{step.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state === "loading" && <LoadingState />}

          {state === "results" && result && (
            <BuildInstructions
              result={result}
              onReset={handleReset}
            />
          )}

          {state === "error" && (
            <div className="text-center py-12 space-y-4">
              <div className="text-5xl">😕</div>
              <h2 className="text-xl font-bold text-gray-900">
                Oops, something went wrong
              </h2>
              <p className="text-gray-500">{error}</p>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-full hover:bg-yellow-500 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center text-xs text-gray-400 border-t border-gray-100">
        Built with AI — not affiliated with LEGO Group
      </footer>
    </div>
  );
}
