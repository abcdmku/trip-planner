export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only fixed left-4 top-4 z-[100] rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
