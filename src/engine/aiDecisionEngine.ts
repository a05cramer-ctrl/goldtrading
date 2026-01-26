/**
 * AI Trading Decision Engine
 * 
 * Simulates Claude-style reasoning for trading decisions.
 * DETERMINISTIC: Same inputs at same time = same outputs for ALL users.
 * 
 * AGGRESSIVE SCALPING STRATEGY:
 * - Trades frequently on small price movements
 * - Takes profits quickly
 * - Uses momentum and micro-trends
 */

import { IndicatorValues } from './indicators';

export type TradingAction = 'BUY' | 'SELL' | 'HOLD';

export interface TradingDecision {
  action: TradingAction;
  confidence: number; // 0-1
  reason: string;
}

export interface DecisionInputs {
  currentPrice: number;
  indicators: IndicatorValues;
  position: 'NONE' | 'LONG';
  unrealizedPnL: number;
  entryPrice?: number;
}

/**
 * Seeded Random for deterministic decisions
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/**
 * AI Trading Decision Engine - Aggressive Scalping Strategy
 * 
 * DETERMINISTIC: All users see the same trades at the same time.
 * Uses time-based seeding for random elements.
 */
export class AIDecisionEngine {
  private lastPrice: number = 0;
  private priceDirection: number = 0; // 1 = up, -1 = down, 0 = neutral
  private tickCount: number = 0;
  private lastTradeTime: number = 0;
  private consecutiveMoves: number = 0;
  private minTimeBetweenTrades: number = 8000; // 8 seconds minimum between trades

  /**
   * Update price momentum tracking
   */
  private updateMomentum(currentPrice: number): void {
    if (this.lastPrice > 0) {
      const direction = currentPrice > this.lastPrice ? 1 : currentPrice < this.lastPrice ? -1 : 0;
      
      if (direction === this.priceDirection) {
        this.consecutiveMoves++;
      } else {
        this.consecutiveMoves = 1;
        this.priceDirection = direction;
      }
    }
    this.lastPrice = currentPrice;
    this.tickCount++;
  }

  /**
   * Make a DETERMINISTIC trading decision based on market conditions
   * Uses time-based seeding so all users get the same decision at the same moment
   */
  public makeDecision(inputs: DecisionInputs): TradingDecision {
    const { currentPrice, indicators, position, unrealizedPnL, entryPrice } = inputs;
    const { ema20, ema50, rsi14 } = indicators;
    
    // Update momentum tracking
    this.updateMomentum(currentPrice);

    const now = Date.now();
    const timeSinceLastTrade = now - this.lastTradeTime;
    const canTrade = timeSinceLastTrade >= this.minTimeBetweenTrades;

    // Create deterministic random based on current 3-second window
    // This ensures all users see the same "random" values at the same time
    const timeWindow = Math.floor(now / 3000); // 3-second windows
    const rng = new SeededRandom(timeWindow);

    // Analyze position
    const hasPosition = position === 'LONG';

    // Decision logic
    let action: TradingAction = 'HOLD';
    let confidence = 0.5;
    let reason = '';

    if (hasPosition) {
      // === SELL LOGIC ===
      // Deterministic profit target between $2-8
      const profitTarget = 2 + rng.next() * 6;
      
      if (unrealizedPnL >= profitTarget) {
        action = 'SELL';
        confidence = 0.88 + rng.next() * 0.1;
        reason = `📈 Taking profit! +$${unrealizedPnL.toFixed(2)} gain achieved. Target was $${profitTarget.toFixed(2)}. Price moved from $${entryPrice?.toFixed(2) || '?'} to $${currentPrice.toFixed(2)}.`;
        this.lastTradeTime = now;
      }
      // Stop loss at $15 (protect capital)
      else if (unrealizedPnL < -15) {
        action = 'SELL';
        confidence = 0.95;
        reason = `🛑 Stop loss triggered. Position down $${Math.abs(unrealizedPnL).toFixed(2)}. Protecting capital.`;
        this.lastTradeTime = now;
      }
      // Hold and wait for profit target
      else {
        const pnlStatus = unrealizedPnL >= 0 ? `+$${unrealizedPnL.toFixed(2)}` : `-$${Math.abs(unrealizedPnL).toFixed(2)}`;
        action = 'HOLD';
        confidence = 0.7;
        reason = `⏳ Holding position. Current PnL: ${pnlStatus}. Entry: $${entryPrice?.toFixed(2) || '?'}. Waiting for profit target.`;
      }
    } else {
      // === BUY LOGIC ===
      // Only buy if enough time has passed
      if (!canTrade) {
        action = 'HOLD';
        confidence = 0.5;
        reason = `⏰ Waiting for next trade opportunity. ${((this.minTimeBetweenTrades - timeSinceLastTrade) / 1000).toFixed(0)}s until next possible entry.`;
      }
      // Buy on momentum reversal (price starting to go up)
      else if (this.priceDirection === 1 && this.consecutiveMoves >= 2) {
        action = 'BUY';
        confidence = 0.82 + rng.next() * 0.15;
        reason = `🚀 Bullish momentum detected! ${this.consecutiveMoves} consecutive up-ticks. Entry at $${currentPrice.toFixed(2)}. RSI: ${rsi14?.toFixed(1) || 'N/A'}.`;
        this.lastTradeTime = now;
      }
      // Buy on oversold RSI
      else if (rsi14 !== null && rsi14 < 35) {
        action = 'BUY';
        confidence = 0.78 + rng.next() * 0.12;
        reason = `📊 RSI oversold at ${rsi14.toFixed(1)}. Good entry point at $${currentPrice.toFixed(2)}. Expecting bounce.`;
        this.lastTradeTime = now;
      }
      // Buy on EMA support
      else if (ema20 !== null && ema50 !== null && currentPrice > ema20 && ema20 > ema50) {
        action = 'BUY';
        confidence = 0.75 + rng.next() * 0.15;
        reason = `📈 Bullish trend confirmed. Price above EMA20 ($${ema20.toFixed(2)}). Strong support from EMA50 ($${ema50.toFixed(2)}).`;
        this.lastTradeTime = now;
      }
      // Deterministic opportunity buy (creates more trades)
      else if (rng.next() > 0.7 && this.tickCount > 10) {
        action = 'BUY';
        confidence = 0.68 + rng.next() * 0.2;
        reason = `🎯 Market opportunity. Entering long at $${currentPrice.toFixed(2)}. Quick scalp trade initiated.`;
        this.lastTradeTime = now;
      }
      // Wait for better entry
      else {
        action = 'HOLD';
        confidence = 0.6;
        reason = `👀 Scanning for entry. Current: $${currentPrice.toFixed(2)}. Momentum: ${this.priceDirection > 0 ? '↑' : this.priceDirection < 0 ? '↓' : '→'}.`;
      }
    }

    return {
      action,
      confidence: Math.round(confidence * 100) / 100,
      reason,
    };
  }
}
