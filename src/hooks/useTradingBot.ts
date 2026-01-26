/**
 * Trading Bot Hook
 * 
 * DETERMINISTIC & SYNCHRONIZED for ALL users.
 * Uses time-aligned intervals so everyone sees the same trades at the same time.
 */

import { useEffect, useState, useRef } from 'react';
import { PriceData } from '../engine/priceEngine';
import { LivePriceEngine } from '../engine/livePriceEngine';
import { calculateIndicators, IndicatorValues } from '../engine/indicators';
import { AIDecisionEngine, TradingDecision } from '../engine/aiDecisionEngine';
import { ExecutionSimulator, Trade, AccountState, Position } from '../engine/executionSimulator';

export interface TradingBotState {
  currentPrice: number;
  priceHistory: PriceData[];
  indicators: IndicatorValues;
  accountState: AccountState;
  position: Position;
  unrealizedPnL: number;
  latestDecision: TradingDecision | null;
  trades: Trade[];
  isLoading: boolean;
}

// Decision interval in milliseconds (must match for all users)
const DECISION_INTERVAL = 3000; // 3 seconds

/**
 * Get the next aligned time slot
 * Ensures all users check for trades at the exact same moments
 */
function getNextAlignedTime(interval: number): number {
  const now = Date.now();
  return Math.ceil(now / interval) * interval;
}

/**
 * Get current time slot (floored to interval)
 */
function getCurrentTimeSlot(interval: number): number {
  return Math.floor(Date.now() / interval) * interval;
}

export function useTradingBot() {
  const [state, setState] = useState<TradingBotState>({
    currentPrice: 5094,
    priceHistory: [],
    indicators: {
      ema20: null,
      ema50: null,
      rsi14: null,
    },
    accountState: {
      balance: 200,
      position: { type: 'NONE', quantity: 0, entryPrice: 0, entryTime: 0 },
      realizedPnL: 0,
      trades: [],
    },
    position: { type: 'NONE', quantity: 0, entryPrice: 0, entryTime: 0 },
    unrealizedPnL: 0,
    latestDecision: null,
    trades: [],
    isLoading: true,
  });

  const priceEngineRef = useRef<LivePriceEngine | null>(null);
  const executionSimulatorRef = useRef<ExecutionSimulator | null>(null);
  const aiEngineRef = useRef<AIDecisionEngine | null>(null);
  const decisionIntervalRef = useRef<number | null>(null);
  const lastProcessedSlotRef = useRef<number>(0);

  // Initialize engines
  useEffect(() => {
    // Create live price engine (updates every second)
    const priceEngine = new LivePriceEngine({
      initialPrice: 5094, // Current XAU/USD gold price (Jan 2026)
      updateInterval: 1000, // Update every second for smooth real-time feel
    });
    priceEngineRef.current = priceEngine;

    // Create execution simulator
    const executionSimulator = new ExecutionSimulator(200);
    executionSimulatorRef.current = executionSimulator;

    // Create AI decision engine
    const aiEngine = new AIDecisionEngine();
    aiEngineRef.current = aiEngine;

    // Subscribe to price updates
    const unsubscribe = priceEngine.subscribe((priceData: PriceData, isNewCandle: boolean) => {
      setState((prev) => {
        let updatedHistory = prev.priceHistory;
        let indicators = prev.indicators;
        
        if (isNewCandle) {
          updatedHistory = [...prev.priceHistory, priceData];
          updatedHistory = updatedHistory.slice(-500);
          indicators = calculateIndicators(updatedHistory);
        } else if (updatedHistory.length > 0) {
          const lastCandle = { ...updatedHistory[updatedHistory.length - 1] };
          lastCandle.price = priceData.price;
          lastCandle.close = priceData.close;
          lastCandle.high = Math.max(lastCandle.high, priceData.high);
          lastCandle.low = Math.min(lastCandle.low, priceData.low);
          updatedHistory = [...updatedHistory.slice(0, -1), lastCandle];
        }
        
        const position = executionSimulator.getPosition();
        const unrealizedPnL = executionSimulator.getUnrealizedPnL(priceData.price);
        
        return {
          ...prev,
          currentPrice: priceData.price,
          priceHistory: updatedHistory,
          indicators,
          position,
          unrealizedPnL,
          isLoading: false,
        };
      });
    });

    // Start price engine
    priceEngine.start();

    // Initialize state with historical data
    const initialHistory = priceEngine.getPriceHistory();
    const currentPrice = priceEngine.getCurrentPrice();
    const initialIndicators = calculateIndicators(initialHistory);
    const initialPosition = executionSimulator.getPosition();
    const initialUnrealizedPnL = executionSimulator.getUnrealizedPnL(currentPrice);

    setState({
      currentPrice,
      priceHistory: initialHistory,
      indicators: initialIndicators,
      accountState: executionSimulator.getAccountState(),
      position: initialPosition,
      unrealizedPnL: initialUnrealizedPnL,
      latestDecision: null,
      trades: [],
      isLoading: false,
    });

    /**
     * SYNCHRONIZED DECISION MAKING
     * Uses time-aligned slots so all users make decisions at the same moments
     * (e.g., at :00, :03, :06, :09, etc. seconds)
     */
    const makeDecision = () => {
      if (!aiEngineRef.current || !executionSimulatorRef.current || !priceEngineRef.current) return;

      // Get current time slot (aligned to DECISION_INTERVAL)
      const currentSlot = getCurrentTimeSlot(DECISION_INTERVAL);
      
      // Skip if we already processed this slot
      if (currentSlot <= lastProcessedSlotRef.current) return;
      lastProcessedSlotRef.current = currentSlot;

      const currentPrice = priceEngineRef.current.getCurrentPrice();
      const priceHistory = priceEngineRef.current.getPriceHistory();
      const indicators = calculateIndicators(priceHistory);
      const position = executionSimulatorRef.current.getPosition();
      const unrealizedPnL = executionSimulatorRef.current.getUnrealizedPnL(currentPrice);

      // Make deterministic decision
      const decision = aiEngineRef.current.makeDecision({
        currentPrice,
        indicators,
        position: position.type,
        unrealizedPnL,
        entryPrice: position.entryPrice,
      });

      // Execute decision with deterministic timestamp
      let trade: Trade | null = null;
      if (decision.action === 'BUY' && position.type === 'NONE') {
        trade = executionSimulatorRef.current.executeBuy(currentPrice, undefined, currentSlot);
        if (trade) {
          console.log(`🟢 BUY executed at $${currentPrice.toFixed(2)} [Slot: ${currentSlot}]`);
        }
      } else if (decision.action === 'SELL' && position.type === 'LONG') {
        trade = executionSimulatorRef.current.executeSell(currentPrice, undefined, currentSlot);
        if (trade) {
          const pnl = currentPrice * position.quantity - position.entryPrice * position.quantity;
          console.log(`🔴 SELL executed at $${currentPrice.toFixed(2)} | PnL: $${pnl.toFixed(2)} [Slot: ${currentSlot}]`);
        }
      }

      const newAccountState = executionSimulatorRef.current.getAccountState();
      
      setState((prev) => ({
        ...prev,
        accountState: newAccountState,
        position: executionSimulatorRef.current!.getPosition(),
        unrealizedPnL: executionSimulatorRef.current!.getUnrealizedPnL(currentPrice),
        latestDecision: decision,
        trades: trade ? [...prev.trades, trade] : prev.trades,
      }));
    };

    // Calculate delay until next aligned time slot
    const now = Date.now();
    const nextSlot = getNextAlignedTime(DECISION_INTERVAL);
    const initialDelay = nextSlot - now;

    // Start with aligned timing
    const startAlignedInterval = () => {
      // Make immediate decision at the slot boundary
      makeDecision();
      
      // Then run every DECISION_INTERVAL
      decisionIntervalRef.current = window.setInterval(makeDecision, DECISION_INTERVAL);
    };

    // Wait until next aligned slot, then start
    const alignmentTimeout = window.setTimeout(startAlignedInterval, initialDelay);

    return () => {
      unsubscribe();
      priceEngine.stop();
      clearTimeout(alignmentTimeout);
      if (decisionIntervalRef.current !== null) {
        clearInterval(decisionIntervalRef.current);
      }
    };
  }, []);

  return state;
}
