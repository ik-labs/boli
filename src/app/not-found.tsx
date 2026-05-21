import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="text-center space-y-4">
        <p className="text-5xl font-bold text-gray-700">404</p>
        <p className="text-gray-400">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-emerald-500 text-gray-950 text-sm font-medium rounded-full hover:bg-emerald-400 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
