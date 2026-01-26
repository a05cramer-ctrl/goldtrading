/**
 * Simulated Gold Price Engine
 * 
 * Generates realistic gold price movements (XAU/USD style) with:
 * - Trend + noise
 * - Mild mean reversion
 * - Occasional volatility spikes
 * 
 * This module is designed to be easily replaceable with a real price feed API.
 */

export interface PriceData {
  price: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PriceEngineConfig {
  initialPrice?: number;
  updateInterval?: number; // milliseconds
  volatility?: number;
  meanReversion?: number;
}

export class PriceEngine {
  private currentPrice: number;
  private basePrice: number;
  private trend: number = 0;
  private volatility: number;
  private meanReversion: number;
  private updateInterval: number;
  private intervalId: number | null = null;
  private subscribers: Set<(data: PriceData) => void> = new Set();
  private priceHistory: PriceData[] = [];
  private currentOHLC: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  private lastUpdateTime: number = Date.now();

  constructor(config: PriceEngineConfig = {}) {
    this.currentPrice = config.initialPrice ?? 2000; // Start at $2000/oz
    this.basePrice = this.currentPrice;
    this.volatility = config.volatility ?? 0.001; // 0.1% base volatility
    this.meanReversion = config.meanReversion ?? 0.0001; // Mean reversion strength
    this.updateInterval = config.updateInterval ?? 2000; // 2 seconds default

    // Initialize OHLC for current "candle"
    this.currentOHLC = {
      open: this.currentPrice,
      high: this.currentPrice,
      low: this.currentPrice,
      close: this.currentPrice,
    };

    // Initialize with some historical data
    this.initializeHistory();
  }

  /**
   * Initialize price history with some starting data points
   */
  private initializeHistory(): void {
    const now = Date.now();
    for (let i = 100; i >= 0; i--) {
      const timestamp = now - i * this.updateInterval;
      const price = this.generateNextPrice(this.currentPrice);
      this.currentPrice = price;
      
      this.priceHistory.push({
        price,
        timestamp,
        open: price,
        high: price,
        low: price,
        close: price,
      });
    }
  }

  /**
   * Generate next price with realistic behavior
   */
  private generateNextPrice(currentPrice: number): number {
    // Random walk with trend
    const randomChange = (Math.random() - 0.5) * 2 * this.volatility;
    
    // Trend component (slowly changing)
    this.trend += (Math.random() - 0.5) * 0.0001;
    this.trend = Math.max(-0.0005, Math.min(0.0005, this.trend)); // Cap trend
    
    // Mean reversion (pull back towards base price)
    const deviation = (currentPrice - this.basePrice) / this.basePrice;
    const reversionForce = -deviation * this.meanReversion;
    
    // Occasional volatility spike (5% chance)
    const volatilityMultiplier = Math.random() < 0.05 ? 3 : 1;
    
    // Calculate new price
    const change = (randomChange + this.trend + reversionForce) * volatilityMultiplier;
    const newPrice = currentPrice * (1 + change);
    
    // Ensure price stays reasonable (between $1500 and $3000)
    return Math.max(1500, Math.min(3000, newPrice));
  }

  /**
   * Update price and emit to subscribers
   */
  private updatePrice(): void {
    const now = Date.now();
    const newPrice = this.generateNextPrice(this.currentPrice);
    
    // Update OHLC
    this.currentOHLC.high = Math.max(this.currentOHLC.high, newPrice);
    this.currentOHLC.low = Math.min(this.currentOHLC.low, newPrice);
    this.currentOHLC.close = newPrice;

    let isNewCandle = false;
    
    // Create new candle every minute (30 updates at 2s intervals)
    const timeSinceLastCandle = now - this.lastUpdateTime;
    if (timeSinceLastCandle >= 60000) {
      // Finalize current candle
      const candle: PriceData = {
        price: this.currentOHLC.close,
        timestamp: this.lastUpdateTime,
        ...this.currentOHLC,
      };
      
      this.priceHistory.push(candle);
      isNewCandle = true;
      
      // Keep only last 1000 candles
      if (this.priceHistory.length > 1000) {
        this.priceHistory.shift();
      }
      
      // Start new candle
      this.currentOHLC = {
        open: newPrice,
        high: newPrice,
        low: newPrice,
        close: newPrice,
      };
      
      this.lastUpdateTime = now;
    }

    this.currentPrice = newPrice;

    // Emit current price data
    const priceData: PriceData = {
      price: this.currentPrice,
      timestamp: now,
      ...this.currentOHLC,
    };

    this.subscribers.forEach((callback: any) => callback(priceData, isNewCandle));
  }

  /**
   * Start the price engine
   */
  public start(): void {
    if (this.intervalId !== null) return;
    
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
   * Emits updates every updateInterval with current price and OHLC
   * Also emits a flag indicating if a new candle was finalized
   */
  public subscribe(callback: (data: PriceData, isNewCandle: boolean) => void): () => void {
    this.subscribers.add(callback as any);
    
    // Immediately send current price
    const currentData: PriceData = {
      price: this.currentPrice,
      timestamp: Date.now(),
      ...this.currentOHLC,
    };
    callback(currentData, false);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback as any);
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
      timestamp: Date.now(),
      ...this.currentOHLC,
    };
  }
}
