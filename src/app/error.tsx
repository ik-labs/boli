"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-gray-400">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-emerald-500 text-gray-950 text-sm font-medium rounded-full hover:bg-emerald-400 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
