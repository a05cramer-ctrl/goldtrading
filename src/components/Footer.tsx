/**
 * Footer Component
 * 
 * Claude branding footer
 */

export function Footer() {
  return (
    <footer className="border-t border-claude-500/20 mt-8 py-6">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded claude-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-slate-400 text-sm">
              Powered by <span className="text-claude-400 font-semibold">Anthropic Claude</span>
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Real Gold Prices • AI-Powered Decisions
          </div>
        </div>
      </div>
    </footer>
  );
}
