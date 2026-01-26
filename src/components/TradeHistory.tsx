/**
 * Trade History Component
 * 
 * Displays a log of all executed trades with profit/loss tracking.
 */

import { Trade } from '../engine/executionSimulator';

interface TradeHistoryProps {
  trades: Trade[];
}

interface TradePair {
  buyTrade: Trade;
  sellTrade: Trade | null;
  pnl: number | null;
  status: 'open' | 'closed';
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Calculate trade pairs and PnL
  const calculateTradePairs = (): TradePair[] => {
    const pairs: TradePair[] = [];
    let openBuy: Trade | null = null;

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        openBuy = trade;
      } else if (trade.type === 'SELL' && openBuy) {
        const buyValue = openBuy.price * openBuy.quantity;
        const sellValue = trade.price * trade.quantity;
        const totalFees = openBuy.fee + trade.fee;
        const pnl = sellValue - buyValue - totalFees;
        
        pairs.push({
          buyTrade: openBuy,
          sellTrade: trade,
          pnl,
          status: 'closed',
        });
        openBuy = null;
      }
    }

    // Add open position if exists
    if (openBuy) {
      pairs.push({
        buyTrade: openBuy,
        sellTrade: null,
        pnl: null,
        status: 'open',
      });
    }

    return pairs.reverse(); // Most recent first
  };

  const tradePairs = calculateTradePairs();
  const completedTrades = tradePairs.filter(p => p.status === 'closed');
  const totalPnL = completedTrades.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const winningTrades = completedTrades.filter(p => (p.pnl || 0) > 0).length;
  const winRate = completedTrades.length > 0 ? (winningTrades / completedTrades.length * 100).toFixed(0) : '0';

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-claude-500/20 rounded-xl p-4 shadow-xl">
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-claude-400 rounded-full animate-pulse" />
          <h3 className="text-lg font-bold claude-text-gradient">Trade History</h3>
        </div>
        
        {completedTrades.length > 0 && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Trades:</span>
              <span className="text-white font-semibold">{completedTrades.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Win Rate:</span>
              <span className="text-green-400 font-semibold">{winRate}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Total P&L:</span>
              <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USD
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Trade List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {tradePairs.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">
            <div className="text-2xl mb-2">📊</div>
            <div>Waiting for first trade...</div>
            <div className="text-xs text-slate-600 mt-1">AI is analyzing the market</div>
          </div>
        ) : (
          tradePairs.map((pair, index) => (
            <div
              key={pair.buyTrade.id}
              className={`rounded-lg border overflow-hidden ${
                pair.status === 'open' 
                  ? 'bg-claude-900/20 border-claude-500/30' 
                  : (pair.pnl || 0) >= 0 
                    ? 'bg-green-900/10 border-green-500/20' 
                    : 'bg-red-900/10 border-red-500/20'
              }`}
            >
              {/* Trade Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">#{completedTrades.length - index + (pair.status === 'open' ? 0 : 0)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-semibold text-sm">BUY</span>
                    <span className="text-slate-500">→</span>
                    {pair.sellTrade ? (
                      <span className="text-red-400 font-semibold text-sm">SELL</span>
                    ) : (
                      <span className="text-claude-400 font-semibold text-sm animate-pulse">OPEN</span>
                    )}
                  </div>
                </div>
                
                {/* P&L Badge */}
                {pair.status === 'closed' && pair.pnl !== null && (
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    pair.pnl >= 0 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {pair.pnl >= 0 ? '+' : ''}{pair.pnl.toFixed(2)} USD
                  </div>
                )}
                {pair.status === 'open' && (
                  <div className="px-3 py-1 rounded-full text-sm font-semibold bg-claude-500/20 text-claude-300 animate-pulse">
                    Position Active
                  </div>
                )}
              </div>

              {/* Trade Details */}
              <div className="px-3 pb-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="text-slate-500 mb-1">Entry</div>
                  <div className="text-white font-semibold">${pair.buyTrade.price.toFixed(2)}</div>
                  <div className="text-slate-500">{formatTime(pair.buyTrade.timestamp)}</div>
                </div>
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="text-slate-500 mb-1">Exit</div>
                  {pair.sellTrade ? (
                    <>
                      <div className="text-white font-semibold">${pair.sellTrade.price.toFixed(2)}</div>
                      <div className="text-slate-500">{formatTime(pair.sellTrade.timestamp)}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-claude-400 font-semibold">Pending...</div>
                      <div className="text-slate-500">Waiting for exit</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
