"use client";

interface VoiceOrbProps {
  status: "disconnected" | "connecting" | "connected";
  isSpeaking: boolean;
  onClick: () => void;
}

export function VoiceOrb({ status, isSpeaking, onClick }: VoiceOrbProps) {
  const isActive = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="flex items-center justify-center">
      <button
        onClick={onClick}
        className="relative flex items-center justify-center w-36 h-36 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(72%_0.19_160)] group"
        aria-label={isActive ? "End conversation" : "Start conversation"}
      >
        {/* Ripple rings — speaking */}
        {isActive && isSpeaking && (
          <>
            <span className="absolute inset-0 rounded-full bg-[oklch(72%_0.19_160)/8%] animate-[ripple_2s_ease-out_infinite]" />
            <span className="absolute inset-0 rounded-full bg-[oklch(72%_0.19_160)/8%] animate-[ripple_2s_ease-out_infinite_0.6s]" />
            <span className="absolute inset-0 rounded-full bg-[oklch(72%_0.19_160)/8%] animate-[ripple_2s_ease-out_infinite_1.2s]" />
          </>
        )}

        {/* Breathing — idle connected */}
        {isActive && !isSpeaking && (
          <span className="absolute inset-3 rounded-full bg-[oklch(72%_0.19_160)/6%] animate-[breathe_3s_ease-in-out_infinite]" />
        )}

        {/* Connecting spinner */}
        {isConnecting && (
          <span className="absolute inset-3 rounded-full border border-[oklch(72%_0.19_160)/30%] border-t-[oklch(72%_0.19_160)] animate-spin" />
        )}

        {/* Core */}
        <span
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            isActive
              ? isSpeaking
                ? "bg-[oklch(72%_0.19_160)] scale-105 shadow-[0_0_40px_oklch(72%_0.19_160/30%)]"
                : "bg-[oklch(72%_0.19_160)/90%]"
              : isConnecting
                ? "bg-[oklch(50%_0.01_160)]"
                : "bg-[oklch(20%_0.01_160)] group-hover:bg-[oklch(25%_0.01_160)]"
          }`}
        >
          <span className={`text-3xl select-none transition-transform ${isSpeaking ? "scale-110" : ""}`}>
            {isActive ? (isSpeaking ? "🗣️" : "🎙️") : isConnecting ? "⏳" : "🎤"}
          </span>
        </span>
      </button>
    </div>
  );
}
