/**
 * Header Component
 * 
 * Main header with Claude branding and title.
 */

export function Header() {
  return (
    <header className="bg-slate-950 border-b border-claude-500/20 relative overflow-hidden">
      {/* Claude gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-claude-900/10 via-claude-800/5 to-transparent" />
      
      {/* Subtle pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] bg-cover bg-center"
        style={{
          backgroundImage: 'url(/assets/creation-image.png)',
        }}
      />
      
      <div className="container mx-auto px-6 py-5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Gold creature mascot */}
            <div className="relative">
              <div className="w-12 h-12 rounded-lg overflow-hidden claude-glow border border-claude-500/30">
                <img 
                  src="/assets/gold-creature.png" 
                  alt="Claude Gold Trading" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold claude-text-gradient">
                  Claude Gold Trading
                </h1>
                <span className="px-2 py-0.5 bg-claude-500/20 text-claude-300 text-xs font-semibold rounded-full border border-claude-500/30">
                  AI
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Powered by Anthropic Claude • Real-time Gold Analysis
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm text-slate-300 font-medium">XAU/USD</span>
              <span className="text-xs text-gold-400 bg-gold-500/20 px-2 py-0.5 rounded border border-gold-500/30">Gold Spot</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              1-Minute Chart • Live Data
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
