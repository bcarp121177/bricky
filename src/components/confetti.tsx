"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;       // vw
  delay: number;   // s
  duration: number;// s
  color: string;
  size: number;    // px
  rotation: number;
  shape: "circle" | "square";
}

const COLORS = [
  "#C91A09", // Bright Red
  "#006CB7", // Bright Blue
  "#F7D117", // Bright Yellow
  "#4B9F4A", // Bright Green
  "#FE8A18", // Bright Orange
  "#F785B1", // Bright Pink
  "#BBE90B", // Lime
  "#F4F4F4", // White
];

function randomBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export default function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const count = 60;
    const newPieces: ConfettiPiece[] = Array.from({ length: count }, (_, i) => ({
      id:       i,
      x:        randomBetween(0, 100),
      delay:    randomBetween(0, 1.5),
      duration: randomBetween(2.5, 4.5),
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      size:     randomBetween(6, 14),
      rotation: randomBetween(0, 360),
      shape:    Math.random() > 0.5 ? "circle" : "square" as "circle" | "square",
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left:     `${p.x}vw`,
            top:      "-20px",
            width:    `${p.size}px`,
            height:   `${p.size}px`,
            backgroundColor: p.color,
            borderRadius:    p.shape === "circle" ? "50%" : "2px",
            transform:       `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
