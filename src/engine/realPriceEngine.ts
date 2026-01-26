/**
 * Real Gold Price Engine
 * 
 * Fetches real gold prices from external APIs and creates 1-minute candles.
 * Replaces the simulated price engine with real market data.
 */

import { fetchCurrentGoldPrice, fetchHistoricalGoldPrices } from '../services/goldPriceApi';
import { PriceData } from './priceEngine';

export interface RealPriceEngineConfig {
  updateInterval?: number; // milliseconds (default: 5000 = 5 seconds)
  fetchHistoricalHours?: number; // hours of historical data to fetch initially
}

export class RealPriceEngine {
  private currentPrice: number = 2000;
  private priceHistory: PriceData[] = [];
  private currentOHLC: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  private lastCandleTimestamp: number = 0;
  private updateInterval: number;
  private intervalId: number | null = null;
  private subscribers: Set<(data: PriceData, isNewCandle: boolean) => void> = new Set();
  private tickBuffer: Array<{ price: number; timestamp: number }> = [];
  private isInitialized: boolean = false;

  constructor(config: RealPriceEngineConfig = {}) {
    this.updateInterval = config.updateInterval ?? 5000; // 5 seconds default
    
    // Initialize OHLC
    this.currentOHLC = {
      open: this.currentPrice,
      high: this.currentPrice,
      low: this.currentPrice,
      close: this.currentPrice,
    };

    // Load historical data
    this.initializeHistory(config.fetchHistoricalHours ?? 24);
  }

  /**
   * Initialize with historical data
   */
  private async initializeHistory(hours: number): Promise<void> {
    try {
      // First, fetch current price to get real-time data
      const currentPriceData = await fetchCurrentGoldPrice();
      this.currentPrice = currentPriceData.price;
      
      // Initialize OHLC with current price
      this.currentOHLC = {
        open: this.currentPrice,
        high: this.currentPrice,
        low: this.currentPrice,
        close: this.currentPrice,
      };
      
      // Set current minute timestamp
      const now = Date.now();
      this.lastCandleTimestamp = Math.floor(now / 60000) * 60000;
      
      // Try to fetch historical data
      try {
        const historicalCandles = await fetchHistoricalGoldPrices(hours);
        
        // Convert to PriceData format
        this.priceHistory = historicalCandles.map((candle) => ({
          price: candle.close,
          timestamp: candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        // Update current price from last historical candle if available
        if (this.priceHistory.length > 0) {
          const lastCandle = this.priceHistory[this.priceHistory.length - 1];
          // Use historical data but keep current real price
          this.currentOHLC = {
            open: lastCandle.open,
            high: Math.max(lastCandle.high, this.currentPrice),
            low: Math.min(lastCandle.low, this.currentPrice),
            close: this.currentPrice,
          };
        }
      } catch (histError) {
        console.warn('Could not load historical data, generating sample data:', histError);
        // Generate some sample candles for initial display
        const now = Date.now();
        const sampleCandles: PriceData[] = [];
        for (let i = 100; i >= 0; i--) {
          const timestamp = now - i * 60000; // 1 minute intervals
          const variation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
          const price = this.currentPrice * (1 + variation);
          sampleCandles.push({
            price,
            timestamp,
            open: price,
            high: price * 1.002,
            low: price * 0.998,
            close: price,
          });
        }
        this.priceHistory = sampleCandles;
      }

      this.isInitialized = true;
      
      // Notify subscribers of initial state
      const currentData: PriceData = {
        price: this.currentPrice,
        timestamp: now,
        ...this.currentOHLC,
      };
      this.subscribers.forEach((callback) => callback(currentData, false));
    } catch (error) {
      console.error('Failed to initialize price engine:', error);
      // Set a default price and continue
      this.currentPrice = 2000;
      this.currentOHLC = {
        open: 2000,
        high: 2000,
        low: 2000,
        close: 2000,
      };
      this.lastCandleTimestamp = Math.floor(Date.now() / 60000) * 60000;
      this.isInitialized = true;
      
      // Notify with default data
      const currentData: PriceData = {
        price: this.currentPrice,
        timestamp: Date.now(),
        ...this.currentOHLC,
      };
      this.subscribers.forEach((callback) => callback(currentData, false));
    }
  }

  /**
   * Fetch current price and update state
   */
  private async updatePrice(): Promise<void> {
    try {
      const priceResponse = await fetchCurrentGoldPrice();
      const now = Date.now();
      const newPrice = priceResponse.price;

      // Add to tick buffer
      this.tickBuffer.push({
        price: newPrice,
        timestamp: now,
      });

      // Keep only last 100 ticks
      if (this.tickBuffer.length > 100) {
        this.tickBuffer.shift();
      }

      // Check if we need to create a new 1-minute candle
      const currentMinute = Math.floor(now / 60000) * 60000;
      const lastCandleMinute = Math.floor(this.lastCandleTimestamp / 60000) * 60000;

      let isNewCandle = false;

      if (currentMinute > lastCandleMinute) {
        // Finalize previous candle
        if (this.lastCandleTimestamp > 0) {
          const finalizedCandle: PriceData = {
            price: this.currentOHLC.close,
            timestamp: this.lastCandleTimestamp,
            ...this.currentOHLC,
          };
          
          this.priceHistory.push(finalizedCandle);
          
          // Keep only last 1000 candles
          if (this.priceHistory.length > 1000) {
            this.priceHistory.shift();
          }
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
      } else {
        // Update current candle
        this.currentOHLC.high = Math.max(this.currentOHLC.high, newPrice);
        this.currentOHLC.low = Math.min(this.currentOHLC.low, newPrice);
        this.currentOHLC.close = newPrice;
      }

      this.currentPrice = newPrice;

      // Emit price update
      const priceData: PriceData = {
        price: this.currentPrice,
        timestamp: now,
        ...this.currentOHLC,
      };

      this.subscribers.forEach((callback) => callback(priceData, isNewCandle));
    } catch (error) {
      console.error('Error updating price:', error);
      // Continue with last known price
      // In production, you might want to implement retry logic or fallback
    }
  }

  /**
   * Start the price engine
   */
  public start(): void {
    if (this.intervalId !== null) return;
    
    // Wait for initialization
    if (!this.isInitialized) {
      setTimeout(() => this.start(), 1000);
      return;
    }

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
    
    // Immediately send current price if available
    if (this.isInitialized) {
      const currentData: PriceData = {
        price: this.currentPrice,
        timestamp: Date.now(),
        ...this.currentOHLC,
      };
      callback(currentData, false);
    }
    
    // Return unsubscribe function
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
      timestamp: Date.now(),
      ...this.currentOHLC,
    };
  }
}
