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
        className="relative flex items-center justify-center w-36 h-36 rounded-full focus:outline-none group"
        aria-label={isActive ? "End conversation" : "Start conversation"}
      >
        {/* Ripple rings for speaking */}
        {isActive && isSpeaking && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-[ripple_2s_ease-out_infinite]" />
            <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-[ripple_2s_ease-out_infinite_0.6s]" />
            <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-[ripple_2s_ease-out_infinite_1.2s]" />
          </>
        )}

        {/* Idle breathing for connected */}
        {isActive && !isSpeaking && (
          <span className="absolute inset-2 rounded-full bg-emerald-500/10 animate-[breathe_3s_ease-in-out_infinite]" />
        )}

        {/* Connecting spinner */}
        {isConnecting && (
          <span className="absolute inset-2 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        )}

        {/* Glow layer */}
        <span
          className={`absolute inset-4 rounded-full blur-md transition-all duration-500 ${
            isActive
              ? isSpeaking
                ? "bg-emerald-500/40 scale-110"
                : "bg-emerald-500/20"
              : isConnecting
                ? "bg-amber-500/20"
                : "bg-slate-500/10 group-hover:bg-slate-500/20"
          }`}
        />

        {/* Core orb */}
        <span
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
            isActive
              ? isSpeaking
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 scale-105"
                : "bg-gradient-to-br from-emerald-500 to-emerald-700"
              : isConnecting
                ? "bg-gradient-to-br from-amber-400 to-amber-600"
                : "bg-gradient-to-br from-slate-500 to-slate-700 group-hover:from-slate-400 group-hover:to-slate-600"
          }`}
        >
          <span className="text-3xl select-none">
            {isActive ? (isSpeaking ? "🗣️" : "🎙️") : isConnecting ? "⏳" : "🎤"}
          </span>
        </span>
      </button>
    </div>
  );
}
