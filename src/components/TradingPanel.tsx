/**
 * Trading Panel Component
 * 
 * Displays account balance, position, PnL, and latest AI decision.
 */

import { TradingDecision } from '../engine/aiDecisionEngine';
import { AccountState, Position } from '../engine/executionSimulator';

interface TradingPanelProps {
  accountState: AccountState;
  position: Position;
  unrealizedPnL: number;
  currentPrice: number;
  latestDecision: TradingDecision | null;
}

export function TradingPanel({
  accountState,
  position,
  unrealizedPnL,
  currentPrice,
  latestDecision,
}: TradingPanelProps) {
  const totalPnL = accountState.realizedPnL + unrealizedPnL;
  const totalPnLColor = totalPnL >= 0 ? 'text-green-400' : 'text-red-400';
  const unrealizedPnLColor = unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400';

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'text-green-400';
      case 'SELL':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-400';
    if (confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-claude-500/20 rounded-xl p-6 space-y-6 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-claude-400 rounded-full animate-pulse" />
        <h2 className="text-xl font-bold claude-text-gradient">Claude Trading Status</h2>
      </div>

      {/* Account Balance */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-claude-500/10">
        <div className="text-sm text-slate-400">Balance</div>
        <div className="text-2xl font-bold text-white">${accountState.balance.toFixed(2)}</div>
      </div>

      {/* Current Position */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-claude-500/10">
        <div className="text-sm text-slate-400">Position</div>
        <div className="text-xl font-semibold">
          {position.type === 'LONG' ? (
            <span className="text-green-400">
              LONG {position.quantity.toFixed(3)} oz @ ${position.entryPrice.toFixed(2)}
            </span>
          ) : (
            <span className="text-slate-500">NONE</span>
          )}
        </div>
      </div>

      {/* PnL */}
      <div className="space-y-2 bg-slate-800/50 rounded-lg p-3 border border-claude-500/10">
        <div>
          <div className="text-sm text-slate-400">Realized PnL</div>
          <div className={`text-lg font-semibold ${accountState.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${accountState.realizedPnL.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-400">Unrealized PnL</div>
          <div className={`text-lg font-semibold ${unrealizedPnLColor}`}>
            ${unrealizedPnL.toFixed(2)}
          </div>
        </div>
        <div className="pt-2 border-t border-claude-500/20">
          <div className="text-sm text-slate-400">Total PnL</div>
          <div className={`text-xl font-bold ${totalPnLColor}`}>
            ${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Current Price */}
      <div className="bg-gradient-to-br from-claude-900/30 to-slate-800/50 rounded-lg p-3 border border-claude-500/20">
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-400">XAU/USD</div>
          <span className="text-xs text-claude-300 bg-claude-500/20 px-2 py-0.5 rounded-full border border-claude-500/30 font-semibold">LIVE</span>
        </div>
        <div className="text-2xl font-bold text-gold-400">${currentPrice.toFixed(2)}</div>
        <div className="text-xs text-slate-500 mt-1">Gold Spot • 1M</div>
      </div>

      {/* Latest AI Decision */}
      {latestDecision && (
        <div className="pt-4 border-t border-claude-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-claude-400 rounded-full animate-pulse" />
            <div className="text-sm text-slate-400">Claude AI Decision</div>
          </div>
          <div className={`text-lg font-bold ${getActionColor(latestDecision.action)}`}>
            {latestDecision.action}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Confidence:</span>
            <span className={`text-sm font-semibold ${getConfidenceColor(latestDecision.confidence)}`}>
              {(latestDecision.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-2 bg-slate-950/50 border border-claude-500/10 p-3 rounded-lg">
            {latestDecision.reason}
          </div>
        </div>
      )}
    </div>
  );
}
