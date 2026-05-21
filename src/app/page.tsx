import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-gray-950 to-gray-900 text-white px-6 py-16 sm:py-24 flex flex-col items-center">
      {/* Nav */}
      <nav className="w-full max-w-5xl flex items-center justify-between mb-20 sm:mb-28">
        <span className="text-xl font-bold tracking-tight">
          Boli<span className="text-emerald-400">.</span>
        </span>
        <Link href="/onboarding" className="text-sm text-gray-400 hover:text-white transition-colors">
          Get started →
        </Link>
      </nav>

      {/* Hero */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 mb-20 sm:mb-28">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
            Reorder groceries<br />by voice.
          </h1>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/onboarding"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-sm font-semibold rounded-full transition-colors"
            >
              Get started
            </Link>
            <Link
              href="/concierge"
              className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-sm font-medium rounded-full transition-colors"
            >
              Try demo
            </Link>
          </div>
        </div>
        <p className="text-gray-400 text-lg leading-relaxed self-end">
          Say <span className="text-white font-medium">&ldquo;reorder my usual atta&rdquo;</span> — Boli
          compares Zepto, Blinkit &amp; BigBasket, picks the cheapest, confirms
          by voice, and places the order via Stripe. No app. No typing.
        </p>
      </div>

      {/* Features */}
      <section className="w-full max-w-5xl border-t border-gray-800 pt-12 mb-20 sm:mb-28">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: "🎙️", label: "Voice-first", detail: "ElevenLabs Conversational AI — order by talking" },
            { icon: "💰", label: "Best price", detail: "Fuzzy search across 3 merchants in under 2 seconds" },
            { icon: "⚡", label: "10-min delivery", detail: "Q-commerce speed with zero cognitive effort" },
          ].map((f) => (
            <div key={f.label} className="p-5 rounded-xl bg-gray-800/50 border border-gray-800">
              <p className="text-2xl mb-2">{f.icon}</p>
              <p className="text-sm font-semibold text-white mb-1">{f.label}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-5xl mb-20 sm:mb-28">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-6">
          How it works
        </h2>
        <div className="space-y-4">
          {[
            "You speak — \"reorder my usual atta\"",
            "Boli searches Zepto, Blinkit & BigBasket",
            "Presents the cheapest option with ETA",
            "You confirm by voice — \"yes, go ahead\"",
            "Payment via Stripe, delivery in 10 minutes",
          ].map((text, i) => (
            <div key={i} className="flex gap-4 items-baseline">
              <span className="text-xs font-mono text-emerald-400 w-6 shrink-0">0{i + 1}</span>
              <p className="text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="w-full max-w-5xl border-t border-gray-800 pt-12 mb-20 sm:mb-28">
        <blockquote className="text-xl sm:text-2xl font-medium leading-snug tracking-tight max-w-2xl text-gray-200">
          &ldquo;Hit your free limit? Say <span className="text-emerald-400">yes</span> and
          you&rsquo;re on a premium plan with a better voice — without leaving the conversation.&rdquo;
        </blockquote>
        <p className="text-xs text-gray-500 mt-4">The upgrade moment — demo highlight</p>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-5xl border-t border-gray-800 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
        <span>Boli — ElevenLabs × Stripe</span>
        <span>Built for ElevenHacks #8</span>
      </footer>
    </main>
  );
}
