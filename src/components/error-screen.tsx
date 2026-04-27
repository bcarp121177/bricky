interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}

export default function ErrorScreen({ message, onRetry, onReset }: ErrorScreenProps) {
  return (
    <div className="text-center py-12 space-y-4">
      <div className="text-5xl">😕</div>
      <h2 className="text-xl font-bold text-gray-900">
        Oops, something went wrong
      </h2>
      <p className="text-gray-500 text-sm">{message}</p>
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <button
          onClick={onRetry}
          className="w-full py-3 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-500 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onReset}
          className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
