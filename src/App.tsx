/**
 * Main App Component
 * 
 * Orchestrates the entire trading bot dashboard.
 */

import { useTradingBot } from './hooks/useTradingBot';
import { Header } from './components/Header';
import { PriceChart } from './components/PriceChart';
import { TradingPanel } from './components/TradingPanel';
import { TradeHistory } from './components/TradeHistory';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Footer } from './components/Footer';
import './App.css';

function App() {
  const botState = useTradingBot();

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Claude-themed background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-claude-950/30 via-slate-950 to-slate-950" />
        
        {/* Subtle pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015] bg-cover bg-center"
          style={{
            backgroundImage: 'url(/assets/creation-image.png)',
          }}
        />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-claude-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-claude-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {botState.isLoading && <LoadingIndicator />}
      
      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chart Area */}
            <div className="lg:col-span-3">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-claude-500/20 rounded-xl p-4 shadow-2xl claude-glow">
                <PriceChart
                  priceHistory={botState.priceHistory}
                  trades={botState.trades}
                  currentPrice={botState.currentPrice}
                />
              </div>
            </div>

            {/* Side Panel */}
            <div className="lg:col-span-1">
              <TradingPanel
                accountState={botState.accountState}
                position={botState.position}
                unrealizedPnL={botState.unrealizedPnL}
                currentPrice={botState.currentPrice}
                latestDecision={botState.latestDecision}
              />
            </div>
          </div>

          {/* Trade History */}
          <div className="mt-6">
            <TradeHistory trades={botState.trades} />
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

export default App;
