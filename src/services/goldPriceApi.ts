/**
 * Real Gold Price API Service
 * 
 * Fetches real gold prices (XAU/USD) from external APIs.
 * Currently uses ExchangeRate-API (free, no auth required).
 * 
 * Can be easily replaced with other APIs:
 * - Alpha Vantage (requires API key)
 * - Metals API (requires API key)
 * - Finnhub (requires API key)
 * - Yahoo Finance (unofficial)
 */

export interface GoldPriceResponse {
  price: number;
  timestamp: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Fetch current gold price from reliable free APIs
 * 
 * Uses exchangerate.host which provides gold prices without CORS issues.
 * For production, consider using:
 * - Metals API (metals-api.com) - requires API key
 * - Alpha Vantage - requires API key
 * - IEX Cloud - requires API key
 */
export async function fetchCurrentGoldPrice(): Promise<GoldPriceResponse> {
  try {
    // Primary: exchangerate.host (free, no CORS issues, no auth required)
    // This API provides XAU (gold) to USD conversion
    const response = await fetch('https://api.exchangerate.host/latest?base=XAU&symbols=USD', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.rates || !data.rates.USD) {
      throw new Error('Invalid response format from API');
    }
    
    // XAU to USD: 1 oz of gold = X USD
    // The API returns the rate, so we need to invert it
    // Actually, if base=XAU, then rates.USD is already USD per XAU
    const price = data.rates.USD;
    
    if (!price || price <= 0) {
      throw new Error('Invalid price received');
    }
    
    return {
      price,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error fetching gold price from exchangerate.host:', error);
    
    // Fallback: Try alternative API
    try {
      // Alternative: Use a different endpoint
      const fallbackResponse = await fetch('https://api.exchangerate.host/convert?from=XAU&to=USD');
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.result) {
          return {
            price: fallbackData.result,
            timestamp: Date.now(),
          };
        }
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
    }
    
    // If all fails, throw error (caller should handle this)
    throw new Error('Failed to fetch gold price. Please check your internet connection.');
  }
}

/**
 * Fetch gold price from Metals API (alternative, requires API key)
 * Uncomment and configure if you have an API key
 */
/*
export async function fetchCurrentGoldPriceFromMetalsAPI(apiKey: string): Promise<GoldPriceResponse> {
  const response = await fetch(`https://api.metals.live/v1/spot/gold`, {
    headers: {
      'x-api-key': apiKey,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch gold price from Metals API');
  }
  
  const data = await response.json();
  return {
    price: data.price,
    timestamp: Date.now(),
  };
}
*/

/**
 * Generate 1-minute candles from tick data
 * This aggregates price updates into 1-minute OHLC candles
 */
export function aggregateTo1MinuteCandles(
  tickData: Array<{ price: number; timestamp: number }>,
  intervalMs: number = 60000 // 1 minute
): CandleData[] {
  if (tickData.length === 0) return [];

  const candles: CandleData[] = [];
  const grouped: { [key: number]: number[] } = {};

  // Group ticks by minute
  tickData.forEach((tick) => {
    const minuteTimestamp = Math.floor(tick.timestamp / intervalMs) * intervalMs;
    if (!grouped[minuteTimestamp]) {
      grouped[minuteTimestamp] = [];
    }
    grouped[minuteTimestamp].push(tick.price);
  });

  // Create OHLC candles
  Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((timestamp) => {
      const prices = grouped[timestamp];
      candles.push({
        timestamp,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
      });
    });

  return candles;
}

/**
 * Fetch historical gold prices (for initial chart load)
 * Note: Free APIs often have limited historical data
 * For production, consider using paid APIs like Alpha Vantage or IEX Cloud
 */
export async function fetchHistoricalGoldPrices(
  hours: number = 24
): Promise<CandleData[]> {
  // Since free APIs don't provide historical 1-minute data easily,
  // we'll simulate it by fetching current price and generating historical candles
  // In production, use Alpha Vantage or similar service
  
  try {
    const currentPrice = await fetchCurrentGoldPrice();
    const candles: CandleData[] = [];
    const now = Date.now();
    const oneMinute = 60000;
    
    // Generate historical candles (last 24 hours = 1440 minutes)
    // Start from current price and add some variation
    let price = currentPrice.price;
    
    for (let i = hours * 60; i >= 0; i--) {
      const timestamp = now - i * oneMinute;
      // Add realistic variation (±0.5%)
      const variation = (Math.random() - 0.5) * 0.01;
      price = price * (1 + variation);
      
      const open = price;
      const high = price * (1 + Math.random() * 0.003);
      const low = price * (1 - Math.random() * 0.003);
      const close = price * (1 + (Math.random() - 0.5) * 0.002);
      
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
      });
    }
    
    return candles;
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    throw error;
  }
}
