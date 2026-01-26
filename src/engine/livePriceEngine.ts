/**
 * Live Gold Price Engine
 * 
 * Generates DETERMINISTIC real-time gold price data for the chart.
 * Uses time-based seeding so ALL users see the SAME prices at the SAME time.
 * 
 * Can be replaced with a real API when available.
 */

import { PriceData } from './priceEngine';

export interface LivePriceEngineConfig {
  initialPrice?: number;
  updateInterval?: number; // milliseconds
}

/**
 * Seeded Random Number Generator (Mulberry32)
 * Produces deterministic random numbers based on a seed.
 * Same seed = same sequence of numbers for ALL users.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Mulberry32 PRNG - fast and deterministic
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Get random in range [-0.5, 0.5]
  nextCentered(): number {
    return this.next() - 0.5;
  }
}

export class LivePriceEngine {
  private currentPrice: number;
  private basePrice: number;
  private trend: number = 0;
  private momentum: number = 0;
  private volatility: number = 0.0003; // Base volatility
  private updateInterval: number;
  private intervalId: number | null = null;
  private subscribers: Set<(data: PriceData, isNewCandle: boolean) => void> = new Set();
  private priceHistory: PriceData[] = [];
  private currentOHLC: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  private lastCandleTimestamp: number;
  private tickCount: number = 0;

  constructor(config: LivePriceEngineConfig = {}) {
    // Current XAU/USD gold price (around $5094/oz as of Jan 2026)
    this.currentPrice = config.initialPrice ?? 5094;
    this.basePrice = this.currentPrice;
    this.updateInterval = config.updateInterval ?? 1000; // 1 second default

    // Initialize OHLC for current candle
    this.currentOHLC = {
      open: this.currentPrice,
      high: this.currentPrice,
      low: this.currentPrice,
      close: this.currentPrice,
    };
    
    // Initialize last candle timestamp to current minute
    this.lastCandleTimestamp = Math.floor(Date.now() / 60000) * 60000;

    // Generate historical 1-minute candles (last 2 hours = 120 candles)
    this.initializeHistory(120);
  }

  /**
   * Initialize with DETERMINISTIC historical data
   * Uses timestamp as seed so all users get the same history
   */
  private initializeHistory(candleCount: number): void {
    const now = Date.now();
    const oneMinute = 60000;
    
    // Start from a fixed base price
    let price = this.basePrice;
    const candles: PriceData[] = [];
    
    for (let i = candleCount; i > 0; i--) {
      const timestamp = Math.floor((now - i * oneMinute) / oneMinute) * oneMinute;
      
      // Create seeded random for this specific minute (deterministic)
      const rng = new SeededRandom(timestamp);
      
      // Generate realistic OHLC for each minute
      const open = price;
      const volatilityForCandle = this.volatility * (1 + rng.next() * 2);
      
      // Deterministic random walk for high/low/close
      const change1 = rng.nextCentered() * 2 * volatilityForCandle * price;
      const change2 = rng.nextCentered() * 2 * volatilityForCandle * price;
      const change3 = rng.nextCentered() * 2 * volatilityForCandle * price;
      
      const close = open + change1;
      const high = Math.max(open, close) + Math.abs(change2) * 0.5;
      const low = Math.min(open, close) - Math.abs(change3) * 0.5;
      
      candles.push({
        price: close,
        timestamp,
        open,
        high,
        low,
        close,
      });
      
      // Update price for next candle
      price = close;
      
      // Deterministic slight trend
      const trendChange = rng.nextCentered() * 0.001;
      price *= (1 + trendChange);
      
      // Keep in range
      price = Math.max(4800, Math.min(5400, price));
    }
    
    this.priceHistory = candles;
    
    // Set current price to last candle's close
    if (candles.length > 0) {
      this.currentPrice = candles[candles.length - 1].close;
      this.currentOHLC = {
        open: this.currentPrice,
        high: this.currentPrice,
        low: this.currentPrice,
        close: this.currentPrice,
      };
    }
  }

  /**
   * Generate next price tick with DETERMINISTIC behavior
   * Uses current second as seed so all users get same price at same time
   */
  private generateNextPrice(): number {
    // Use current second (floored) as seed for determinism
    const currentSecond = Math.floor(Date.now() / 1000);
    const rng = new SeededRandom(currentSecond);
    
    // Deterministic trend update
    this.trend += rng.nextCentered() * 0.0001;
    this.trend *= 0.99; // Decay trend towards zero
    this.trend = Math.max(-0.001, Math.min(0.001, this.trend));
    
    // Deterministic momentum
    this.momentum = this.momentum * 0.8 + rng.nextCentered() * 0.2;
    
    // Deterministic volatility spike (based on second)
    const volatilityMultiplier = rng.next() < 0.02 ? 2.5 : 1;
    
    // Mean reversion towards base price
    const deviation = (this.currentPrice - this.basePrice) / this.basePrice;
    const reversionForce = -deviation * 0.0001;
    
    // Calculate price change
    const randomComponent = this.momentum * this.volatility * volatilityMultiplier;
    const change = this.currentPrice * (this.trend + randomComponent + reversionForce);
    
    const newPrice = this.currentPrice + change;
    
    // Keep price in realistic range ($4800 - $5400 for current XAU/USD)
    return Math.max(4800, Math.min(5400, newPrice));
  }

  /**
   * Update price and emit to subscribers
   */
  private updatePrice(): void {
    const now = Date.now();
    const newPrice = this.generateNextPrice();
    this.tickCount++;
    
    // Update current OHLC
    this.currentOHLC.high = Math.max(this.currentOHLC.high, newPrice);
    this.currentOHLC.low = Math.min(this.currentOHLC.low, newPrice);
    this.currentOHLC.close = newPrice;

    // Check if we need to create a new 1-minute candle
    const currentMinute = Math.floor(now / 60000) * 60000;
    let isNewCandle = false;

    if (currentMinute > this.lastCandleTimestamp) {
      // Finalize previous candle
      const finalizedCandle: PriceData = {
        price: this.currentOHLC.close,
        timestamp: this.lastCandleTimestamp,
        ...this.currentOHLC,
      };
      
      this.priceHistory.push(finalizedCandle);
      
      // Keep only last 500 candles
      if (this.priceHistory.length > 500) {
        this.priceHistory.shift();
      }
      
      // Start new candle
      this.currentOHLC = {
        open: newPrice,
        high: newPrice,
        low: newPrice,
        close: newPrice,
      };
      
      this.lastCandleTimestamp = currentMinute;
      isNewCandle = true;
    }

    this.currentPrice = newPrice;

    // Emit current price data
    const priceData: PriceData = {
      price: this.currentPrice,
      timestamp: this.lastCandleTimestamp,
      ...this.currentOHLC,
    };

    this.subscribers.forEach((callback) => callback(priceData, isNewCandle));
  }

  /**
   * Start the price engine
   */
  public start(): void {
    if (this.intervalId !== null) return;
    
    // Immediately emit current state
    const currentData: PriceData = {
      price: this.currentPrice,
      timestamp: this.lastCandleTimestamp,
      ...this.currentOHLC,
    };
    this.subscribers.forEach((callback) => callback(currentData, false));
    
    // Start periodic updates
    this.intervalId = window.setInterval(() => {
      this.updatePrice();
    }, this.updateInterval);
  }

  /**
   * Stop the price engine
   */
  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Subscribe to price updates
   */
  public subscribe(callback: (data: PriceData, isNewCandle: boolean) => void): () => void {
    this.subscribers.add(callback);
    
    // Immediately send current state
    const currentData: PriceData = {
      price: this.currentPrice,
      timestamp: this.lastCandleTimestamp,
      ...this.currentOHLC,
    };
    callback(currentData, false);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current price
   */
  public getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Get price history
   */
  public getPriceHistory(): PriceData[] {
    return [...this.priceHistory];
  }

  /**
   * Get latest OHLC data
   */
  public getLatestOHLC(): PriceData {
    return {
      price: this.currentPrice,
      timestamp: this.lastCandleTimestamp,
      ...this.currentOHLC,
    };
  }
}
