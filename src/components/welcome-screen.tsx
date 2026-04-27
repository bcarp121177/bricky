interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="space-y-8 text-center">
      <div className="pt-4">
        <div className="text-8xl mb-4">🧱</div>
        <h2 className="text-3xl font-black text-gray-900">
          What will you build?
        </h2>
        <p className="text-gray-500 mt-2 text-base">
          Tell us what LEGO pieces you have. We will come up with something awesome.
        </p>
      </div>

      <button
        onClick={onStart}
        className="w-full max-w-xs mx-auto block py-4 bg-yellow-400 text-black font-black text-xl rounded-full shadow-lg shadow-yellow-400/30 hover:bg-yellow-500 active:scale-95 transition-all"
      >
        Add My Pieces →
      </button>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 text-center pt-2">
        {[
          { icon: "🧱", title: "Add Pieces", desc: "Browse or scan your bricks" },
          { icon: "🎨", title: "Pick Theme", desc: "Space, Castle, Ocean & more" },
          { icon: "📋", title: "Build!", desc: "Step-by-step instructions" },
        ].map((step) => (
          <div key={step.title}>
            <div className="text-3xl mb-1">{step.icon}</div>
            <div className="font-semibold text-gray-900 text-sm">{step.title}</div>
            <div className="text-xs text-gray-500">{step.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
