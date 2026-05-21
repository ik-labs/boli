import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="w-full max-w-2xl text-center space-y-6 sm:space-y-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Boli<span className="text-emerald-400">.</span>
        </h1>
        <p className="text-base sm:text-xl text-slate-300 leading-relaxed">
          Your voice-first grocery concierge. Say{" "}
          <span className="text-emerald-400 font-medium">
            &ldquo;reorder my usual atta&rdquo;
          </span>{" "}
          and we find the cheapest option across Zepto, Blinkit &amp; BigBasket.
        </p>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 text-sm text-slate-400">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <p className="text-2xl mb-1">🎙️</p>
            <p className="font-medium text-white">Voice-First</p>
            <p>Order by talking, no typing</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <p className="text-2xl mb-1">💰</p>
            <p className="font-medium text-white">Best Price</p>
            <p>Compares 3 merchants instantly</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <p className="text-2xl mb-1">⚡</p>
            <p className="font-medium text-white">10-min Delivery</p>
            <p>Q-commerce speed, zero effort</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
          <Link
            href="/onboarding"
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium rounded-xl transition-colors text-center"
          >
            Get Started
          </Link>
          <Link
            href="/concierge"
            className="px-6 py-3.5 border border-slate-600 hover:border-slate-500 active:bg-slate-800 text-slate-300 font-medium rounded-xl transition-colors text-center"
          >
            Try Demo
          </Link>
        </div>

        <p className="text-xs text-slate-500 pt-4 sm:pt-8">
          Powered by ElevenLabs Conversational AI × Stripe Connect
        </p>
      </div>
    </main>
  );
}
