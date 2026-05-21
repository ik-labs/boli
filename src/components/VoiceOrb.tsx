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
        className="relative flex items-center justify-center w-40 h-40 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 group"
        aria-label={isActive ? "End conversation" : "Start conversation"}
      >
        {isActive && isSpeaking && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping" />
            <span className="absolute inset-4 rounded-full bg-emerald-400/10 animate-pulse" />
          </>
        )}
        {isActive && !isSpeaking && (
          <span className="absolute inset-4 rounded-full bg-emerald-400/5 animate-pulse" />
        )}
        {isConnecting && (
          <span className="absolute inset-4 rounded-full border-2 border-gray-600 border-t-emerald-400 animate-spin" />
        )}
        <span
          className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl transition-all duration-300 shadow-2xl ${
            isActive
              ? isSpeaking
                ? "bg-emerald-500 shadow-emerald-500/30 scale-105"
                : "bg-emerald-600 shadow-emerald-600/20"
              : isConnecting
                ? "bg-gray-700"
                : "bg-gray-800 group-hover:bg-gray-700 shadow-gray-900/50"
          }`}
        >
          {isActive ? (isSpeaking ? "🗣️" : "🎙️") : isConnecting ? "⏳" : "🎤"}
        </span>
      </button>
    </div>
  );
}
