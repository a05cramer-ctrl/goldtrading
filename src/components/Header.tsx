/**
 * Header Component
 * 
 * Main header with Claude branding and title.
 */

import { useState } from 'react';

const CONTRACT_ADDRESS = '5EPnQCiDjXHUibBT6gJdQ3vc3nK5oEDaSyV5mAmgpump';

export function Header() {
  const [copied, setCopied] = useState(false);

  const handleCopyCA = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
          
          <div className="flex items-center gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {/* Twitter/X Icon */}
              <a
                href="https://x.com/gold_claud"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-claude-400 transition-colors duration-200"
                aria-label="Twitter"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              
              {/* CA Link - Contract Address with Copy */}
              <div className="relative">
                <a
                  href="https://solscan.io/token/5EPnQCiDjXHUibBT6gJdQ3vc3nK5oEDaSyV5mAmgpump"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCopyCA}
                  className="flex items-center gap-2 text-slate-400 hover:text-claude-400 transition-colors duration-200 text-sm font-medium cursor-pointer group"
                  aria-label="Contract Address - Click to copy"
                  title={`Click to copy: ${CONTRACT_ADDRESS}`}
                >
                  <span className="text-xs text-slate-500 group-hover:text-slate-400">CA:</span>
                  <span className="font-mono text-xs bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 group-hover:border-claude-500/50 transition-colors">
                    {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-8)}
                  </span>
                </a>
                
                {/* Copy Feedback Toast */}
                {copied && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-claude-500 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 animate-fade-in">
                    ✓ Copied!
                  </div>
                )}
              </div>
            </div>
            
            {/* Market Info */}
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
      </div>
    </header>
  );
}
