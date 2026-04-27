"use client";

import { useRef, useState, useCallback } from "react";
import type { ScanResult, InventoryPiece } from "@/lib/types";
import type { LegoColor } from "@/lib/lego-colors";

interface MysteryPieceScannerProps {
  selectedColor: LegoColor;
  onFound: (piece: Omit<InventoryPiece, "quantity">) => void;
  onClose: () => void;
}

/**
 * MysteryPieceScanner — modal that lets the user photograph a single unknown
 * LEGO piece. The image is POSTed to /api/scan and the best guess is returned.
 * Previously known as CameraUpload; demoted to a single-piece scanner.
 */
export default function MysteryPieceScanner({
  selectedColor,
  onFound,
  onClose,
}: MysteryPieceScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setScanning(true);
      setError(null);
      setScanResult(null);

      try {
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch("/api/scan", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Scan failed (${res.status})`);
        }

        const data: { result: ScanResult | null; error?: string } = await res.json();

        if (!data.result) {
          setError("Could not identify this piece. Try a clearer photo.");
        } else {
          setScanResult(data.result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scan failed");
      } finally {
        setScanning(false);
      }
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleAccept = () => {
    if (!scanResult) return;
    onFound({
      partNum:  scanResult.partNum,
      name:     scanResult.name,
      color:    selectedColor.name,
      colorHex: selectedColor.hex,
      imgUrl:   scanResult.imgUrl,
      category: "Other", // category resolved later by piece-browser if needed
    });
    onClose();
  };

  const handleRetry = () => {
    setPreview(null);
    setScanResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    /* Modal overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg">Scan a Piece</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Take a photo of one LEGO piece and we will try to identify it.
        </p>

        {!preview ? (
          /* Upload prompt */
          <div
            className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-5xl mb-3">📸</div>
            <p className="text-sm font-semibold text-gray-700">
              Tap to take a photo or upload
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          /* Preview + result */
          <div className="space-y-3">
            <img
              src={preview}
              alt="Piece preview"
              className="w-full max-h-48 object-contain rounded-xl border border-gray-200"
            />

            {scanning && (
              <p className="text-center text-sm text-gray-500 animate-pulse">
                Scanning...
              </p>
            )}

            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}

            {scanResult && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3">
                <ScanResultImage src={scanResult.imgUrl} alt={scanResult.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {scanResult.name}
                  </p>
                  <p className="text-xs text-gray-500">#{scanResult.partNum}</p>
                  <p className="text-xs text-gray-400">
                    {Math.round(scanResult.confidence * 100)}% confident
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Retry
              </button>
              {scanResult && (
                <button
                  onClick={handleAccept}
                  className="flex-1 py-2.5 bg-yellow-400 text-black rounded-full font-bold text-sm hover:bg-yellow-500 active:scale-95 transition-all"
                >
                  Add to Shelf
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Part image with onError fallback to a gray placeholder */
function ScanResultImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "8px",
          backgroundColor: "#D1D5DB",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: "48px",
        height: "48px",
        objectFit: "contain",
        flexShrink: 0,
      }}
      onError={() => setErrored(true)}
    />
  );
}
