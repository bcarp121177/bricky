"use client";

import { useRef, useState, useCallback } from "react";

interface CameraUploadProps {
  onImageCapture: (file: File) => void;
  disabled?: boolean;
}

export default function CameraUpload({
  onImageCapture,
  disabled,
}: CameraUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      onImageCapture(file);
    },
    [onImageCapture]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="LEGO pieces preview"
            className="w-full max-h-80 object-contain rounded-2xl border-2 border-yellow-400"
          />
          {!disabled && (
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              &times;
            </button>
          )}
        </div>
      ) : (
        <div
          className={`border-3 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-yellow-400 bg-yellow-50"
              : "border-gray-300 hover:border-yellow-400 hover:bg-yellow-50/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-5xl mb-3">📸</div>
          <p className="text-lg font-semibold text-gray-700 mb-1">
            Take a photo or upload an image
          </p>
          <p className="text-sm text-gray-500">
            Spread your LEGO pieces out on a flat surface for best results
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <label onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-full cursor-pointer hover:bg-yellow-500 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Camera
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <label onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-full cursor-pointer hover:border-yellow-400 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
