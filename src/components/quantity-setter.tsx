"use client";

interface QuantitySetterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySetter({
  value,
  onChange,
  min = 1,
  max = 99,
}: QuantitySetterProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };
  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
        style={{ width: "36px", height: "36px" }}
        className="rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center disabled:opacity-30 hover:bg-gray-200 active:scale-95 transition-all"
      >
        −
      </button>
      <span
        className="font-bold text-gray-900 text-base tabular-nums"
        style={{ minWidth: "28px", textAlign: "center" }}
      >
        {value}
      </span>
      <button
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase quantity"
        style={{ width: "36px", height: "36px" }}
        className="rounded-full bg-yellow-400 text-black font-bold text-lg flex items-center justify-center disabled:opacity-30 hover:bg-yellow-500 active:scale-95 transition-all"
      >
        +
      </button>
    </div>
  );
}
