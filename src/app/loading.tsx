export default function Loading() {
  return (
    <div className="min-h-dvh bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  );
}
