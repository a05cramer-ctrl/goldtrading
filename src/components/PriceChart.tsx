/**
 * Price Chart Component
 * 
 * Displays live gold price chart using TradingView Lightweight Charts.
 * Shows buy/sell markers for executed trades.
 */

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts';
import { PriceData } from '../engine/priceEngine';
import { Trade } from '../engine/executionSimulator';

interface PriceChartProps {
  priceHistory: PriceData[];
  trades: Trade[];
  currentPrice: number;
}

export function PriceChart({ priceHistory, trades, currentPrice }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with Claude theme
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' }, // slate-950
        textColor: '#cbd5e1', // slate-300
      },
      grid: {
        vertLines: { color: '#1e293b' }, // slate-800
        horzLines: { color: '#1e293b' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 3,
        borderColor: '#334155', // slate-700
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data when price history changes (new candles)
  useEffect(() => {
    if (!seriesRef.current) return;

    if (priceHistory.length === 0) return;

    // Convert PriceData to candlestick format
    const candlestickData = priceHistory.map((data) => ({
      time: Math.floor(data.timestamp / 1000) as any, // Convert to seconds (integer)
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
    }));

    // Set all historical data
    seriesRef.current.setData(candlestickData);
    
    // Auto-scroll to the right (latest data)
    if (chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime();
    }
  }, [priceHistory.length]); // Only re-render when new candles are added

  // Update markers for trades
  useEffect(() => {
    if (!seriesRef.current || trades.length === 0) return;

    // Create markers from trades
    // Convert timestamp to seconds (same format as candles) and sort by time
    const markers = trades
      .map((trade) => ({
        time: Math.floor(trade.timestamp / 1000) as any, // Match candle timestamp format
        position: trade.type === 'BUY' ? ('belowBar' as const) : ('aboveBar' as const),
        color: trade.type === 'BUY' ? '#26a69a' : '#ef5350',
        shape: trade.type === 'BUY' ? ('arrowUp' as const) : ('arrowDown' as const),
        text: `${trade.type} @ $${trade.price.toFixed(2)}`,
        size: 1,
      }))
      .sort((a, b) => a.time - b.time); // Sort by time to ensure proper display order

    // Set markers
    seriesRef.current.setMarkers(markers);
    markersRef.current = markers;
  }, [trades]);

  // Update current candle in real-time (every price tick)
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    const lastCandle = priceHistory[priceHistory.length - 1];
    if (lastCandle && currentPrice > 0) {
      const updateData = {
        time: Math.floor(lastCandle.timestamp / 1000) as any,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, currentPrice),
        low: Math.min(lastCandle.low, currentPrice),
        close: currentPrice,
      };
      
      // Update last candle in real-time for smooth animation
      seriesRef.current.update(updateData);
    }
  }, [currentPrice]);

  // Calculate price change
  const priceChange = priceHistory.length > 1 
    ? currentPrice - priceHistory[0].open 
    : 0;
  const priceChangePercent = priceHistory.length > 1 
    ? ((currentPrice - priceHistory[0].open) / priceHistory[0].open) * 100 
    : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="w-full h-full">
      {/* Chart Header with Ticker */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-4">
          {/* Ticker Symbol */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">XAU/USD</span>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Gold Spot</span>
          </div>
          
          {/* Current Price */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gold-400">${currentPrice.toFixed(2)}</span>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              <span>{isPositive ? '▲' : '▼'}</span>
              <span>{isPositive ? '+' : ''}{priceChange.toFixed(2)}</span>
              <span>({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
        
        {/* Timeframe Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Timeframe:</span>
          <span className="text-xs font-semibold text-claude-400 bg-claude-500/20 px-2 py-1 rounded border border-claude-500/30">1M</span>
          <div className="flex items-center gap-1 ml-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">Live</span>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" style={{ height: '600px', minHeight: '600px' }} />
    </div>
  );
}
