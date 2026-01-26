/**
 * Loading Indicator Component
 * 
 * Shows loading state while fetching real gold prices
 */

export function LoadingIndicator() {
  return (
    <div className="fixed top-4 right-4 bg-claude-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-xl border border-claude-500/30 z-50 flex items-center gap-2 claude-glow">
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-claude-300 border-t-transparent"></div>
      <span className="text-sm font-medium">Claude is analyzing gold prices...</span>
    </div>
  );
}
