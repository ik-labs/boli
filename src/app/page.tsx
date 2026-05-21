import Link from "next/link";

/* Hallmark · pre-emit critique: P5 H4 E4 S4 R5 V4 */

export default function Home() {
  return (
    <main className="min-h-dvh bg-[oklch(10%_0.01_160)] text-[oklch(94%_0.005_160)] px-5 py-16 sm:py-24 flex flex-col items-center">
      {/* Nav — N9 edge-aligned minimal */}
      <nav className="w-full max-w-5xl flex items-center justify-between mb-20 sm:mb-32">
        <span className="text-lg font-semibold tracking-tight">
          Boli<span className="text-[oklch(72%_0.19_160)]">.</span>
        </span>
        <Link
          href="/onboarding"
          className="text-sm text-[oklch(70%_0.005_160)] hover:text-white transition-colors"
        >
          Get started →
        </Link>
      </nav>

      {/* Hero — two-column split: title left, context right */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 mb-24 sm:mb-36">
        <div className="space-y-6">
          <h1 className="text-[clamp(2.5rem,5vw+0.5rem,4.5rem)] font-bold leading-[1.05] tracking-[-0.035em]">
            Reorder groceries<br />by voice.
          </h1>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/onboarding"
              className="px-5 py-2.5 bg-[oklch(72%_0.19_160)] text-[oklch(10%_0.01_160)] text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
            <Link
              href="/concierge"
              className="px-5 py-2.5 border border-[oklch(30%_0.01_160)] text-sm font-medium rounded-full hover:border-[oklch(50%_0.01_160)] transition-colors"
            >
              Try demo
            </Link>
          </div>
        </div>
        <p className="text-[oklch(60%_0.005_160)] text-lg leading-relaxed self-end">
          Say <span className="text-[oklch(80%_0.005_160)] font-medium">&ldquo;reorder my usual atta&rdquo;</span> — Boli
          compares Zepto, Blinkit &amp; BigBasket, picks the cheapest, confirms
          by voice, and places the order via Stripe. No app. No typing.
        </p>
      </div>

      {/* Features — tabular spec sheet, not a 3-card grid */}
      <section className="w-full max-w-5xl border-t border-[oklch(20%_0.01_160)] pt-12 mb-24 sm:mb-36">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[oklch(20%_0.01_160)]">
          {[
            { label: "Voice-first", detail: "ElevenLabs Conversational AI — order by talking" },
            { label: "Best price", detail: "Fuzzy search across 3 merchants in under 2 seconds" },
            { label: "10-min delivery", detail: "Q-commerce speed with zero cognitive effort" },
          ].map((f) => (
            <div key={f.label} className="bg-[oklch(10%_0.01_160)] p-6 sm:p-8">
              <p className="text-sm font-medium text-[oklch(72%_0.19_160)] mb-2">{f.label}</p>
              <p className="text-sm text-[oklch(55%_0.005_160)] leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — numbered steps, left-margin style */}
      <section className="w-full max-w-5xl mb-24 sm:mb-36">
        <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-[oklch(50%_0.005_160)] mb-8">
          How it works
        </h2>
        <div className="space-y-6">
          {[
            { n: "01", text: "You speak — \"reorder my usual atta\"" },
            { n: "02", text: "Boli searches Zepto, Blinkit & BigBasket" },
            { n: "03", text: "Presents the cheapest option with ETA" },
            { n: "04", text: "You confirm by voice — \"yes, go ahead\"" },
            { n: "05", text: "Payment via Stripe, delivery in 10 minutes" },
          ].map((s) => (
            <div key={s.n} className="flex gap-4 items-baseline">
              <span className="text-xs font-mono text-[oklch(40%_0.005_160)] w-6 shrink-0">{s.n}</span>
              <p className="text-[oklch(80%_0.005_160)]">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upgrade moment — single pull quote */}
      <section className="w-full max-w-5xl border-t border-[oklch(20%_0.01_160)] pt-12 mb-24 sm:mb-36">
        <blockquote className="text-xl sm:text-2xl font-medium leading-snug tracking-tight max-w-2xl">
          &ldquo;Hit your free limit? Say <span className="text-[oklch(72%_0.19_160)]">yes</span> and
          you&rsquo;re on a premium plan with a better voice — without leaving the conversation.&rdquo;
        </blockquote>
        <p className="text-xs text-[oklch(40%_0.005_160)] mt-4">The upgrade moment — demo highlight</p>
      </section>

      {/* Footer — Ft2 inline single line */}
      <footer className="w-full max-w-5xl border-t border-[oklch(20%_0.01_160)] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[oklch(40%_0.005_160)]">
        <span>Boli — ElevenLabs × Stripe</span>
        <span>Built for ElevenHacks #8</span>
      </footer>
    </main>
  );
}
