"use client";

import { useEffect, useState } from "react";

const messages = [
  "Scanning your LEGO pieces...",
  "Identifying bricks and colors...",
  "Counting everything up...",
  "Brainstorming what to build...",
  "Designing something awesome...",
  "Writing step-by-step instructions...",
  "Almost done...",
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col items-center py-12">
      {/* Bouncing bricks animation */}
      <div className="flex gap-2 mb-6">
        {["bg-red-500", "bg-blue-500", "bg-yellow-400", "bg-green-500"].map(
          (color, i) => (
            <div
              key={i}
              className={`w-5 h-5 ${color} rounded-sm`}
              style={{
                animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          )
        )}
      </div>
      <p className="text-lg font-semibold text-gray-700 animate-pulse">
        {messages[messageIndex]}
      </p>
      <p className="text-sm text-gray-400 mt-2">
        This usually takes 10-20 seconds
      </p>

      <style jsx>{`
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
