interface DoneScreenProps {
  onBackToPick: () => void;
  onReset: () => void;
}

export default function DoneScreen({ onBackToPick, onReset }: DoneScreenProps) {
  return (
    <div className="w-full flex flex-col items-center py-8 space-y-6 text-center">
      <div className="text-7xl">🎉</div>
      <div>
        <h2 className="text-2xl font-black text-gray-900">You did it!</h2>
        <p className="text-gray-500 mt-2">Amazing work. Your build is complete!</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onBackToPick}
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
