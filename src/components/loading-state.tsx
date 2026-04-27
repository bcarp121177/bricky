"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/types";

type MessageSet = {
  messages: string[];
  emoji: string;
};

const THEME_MESSAGES: Record<Theme, MessageSet> = {
  Space: {
    emoji: "🚀",
    messages: [
      "Launching into space...",
      "Counting your thrusters...",
      "Plotting a course to the stars...",
      "Checking fuel levels...",
      "Almost ready for liftoff!",
    ],
  },
  Animals: {
    emoji: "🦁",
    messages: [
      "Waking up the animals...",
      "Counting tails and trunks...",
      "Sneaking through the jungle...",
      "Making animal sounds...",
      "Almost done prowling!",
    ],
  },
  Vehicles: {
    emoji: "🚗",
    messages: [
      "Revving the engine...",
      "Checking the tires...",
      "Mapping the route...",
      "Buckling the seatbelt...",
      "Almost ready to race!",
    ],
  },
  Castle: {
    emoji: "🏰",
    messages: [
      "Raising the drawbridge...",
      "Sharpening swords...",
      "Lighting the torches...",
      "Waking the knights...",
      "Castle almost ready!",
    ],
  },
  Ocean: {
    emoji: "🌊",
    messages: [
      "Diving into the deep...",
      "Counting fish and coral...",
      "Charting the ocean floor...",
      "Searching for treasure...",
      "Almost surfacing!",
    ],
  },
  "Surprise Me": {
    emoji: "✨",
    messages: [
      "Mixing up something special...",
      "Spinning the idea wheel...",
      "Picking from a million ideas...",
      "Adding a pinch of magic...",
      "Almost there — surprise incoming!",
    ],
  },
};

const DEFAULT_MESSAGES: MessageSet = {
  emoji: "🧱",
  messages: [
    "Thinking up cool builds...",
    "Counting your bricks...",
    "Brainstorming something fun...",
    "Writing your instructions...",
    "Almost done!",
  ],
};

interface LoadingStateProps {
  theme?: Theme | null;
}

export default function LoadingState({ theme }: LoadingStateProps) {
  const set = theme ? THEME_MESSAGES[theme] ?? DEFAULT_MESSAGES : DEFAULT_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % set.messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [set]);

  return (
    <div className="w-full flex flex-col items-center py-12 gap-4">
      {/* Bouncing bricks */}
      <div className="flex gap-2 mb-2">
        {["#C91A09", "#006CB7", "#F7D117", "#4B9F4A"].map((color, i) => (
          <div
            key={i}
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "3px",
              backgroundColor: color,
              animation: `brickBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Theme emoji */}
      <div className="text-5xl">{set.emoji}</div>

      {/* Cycling message */}
      <p className="text-lg font-semibold text-gray-700 animate-pulse text-center px-4">
        {set.messages[messageIndex]}
      </p>
      <p className="text-sm text-gray-400">This usually takes 10–20 seconds</p>

      <style>{`
        @keyframes brickBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
