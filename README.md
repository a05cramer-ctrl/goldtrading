# Gold Trading Bot - AI-Powered Simulated Trading System

A fully simulated gold trading bot web application built with React, Vite, TypeScript, and TradingView Lightweight Charts. This is a demo system designed to showcase AI-powered trading decisions with realistic price simulation.

## 🚀 Features

- **Real Gold Price Engine**: Fetches live XAU/USD prices from exchangerate.host API
- **1-Minute Candlestick Chart**: Displays real-time 1-minute gold price candles
- **Technical Indicators**: EMA 20, EMA 50, and RSI 14 calculated in real-time
- **AI Decision Engine**: Simulated Claude-style reasoning for trading decisions
- **Execution Simulator**: Mock order execution with PnL tracking
- **Live Chart**: Real-time candlestick chart with buy/sell markers
- **Trading Dashboard**: Complete UI with balance, position, PnL, and trade history

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🛠️ Installation

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the application.

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## 🏗️ Architecture

The project is built with modularity in mind - all simulation components can be easily replaced with real APIs:

### Core Modules

- **`src/engine/realPriceEngine.ts`**: Real gold price feed from exchangerate.host API
  - Fetches live XAU/USD prices every 5 seconds
  - Aggregates into 1-minute candlestick data
  - Can be replaced with: Alpha Vantage, Metals API, or other premium APIs
  
- **`src/engine/indicators.ts`**: Technical indicator calculations
  - Replace with: Real technical analysis library (e.g., TA-Lib)
  
- **`src/engine/aiDecisionEngine.ts`**: AI trading decision logic
  - Replace with: Real Claude API call or other AI service
  
- **`src/engine/executionSimulator.ts`**: Order execution simulation
  - Replace with: Real broker API (e.g., Interactive Brokers, Alpaca)

### Components

- **`src/components/PriceChart.tsx`**: TradingView Lightweight Charts integration
- **`src/components/TradingPanel.tsx`**: Account status and AI decisions
- **`src/components/TradeHistory.tsx`**: Trade log display
- **`src/components/Header.tsx`**: Branding and navigation

### Hooks

- **`src/hooks/useTradingBot.ts`**: Main trading bot orchestration hook

## 📁 Project Structure

```
├── public/
│   └── assets/              # Image assets (gold creature, creation image)
├── src/
│   ├── components/          # React components
│   │   ├── Header.tsx
│   │   ├── PriceChart.tsx
│   │   ├── TradingPanel.tsx
│   │   └── TradeHistory.tsx
│   ├── engine/              # Core trading logic (replaceable)
│   │   ├── priceEngine.ts
│   │   ├── indicators.ts
│   │   ├── aiDecisionEngine.ts
│   │   └── executionSimulator.ts
│   ├── hooks/               # React hooks
│   │   └── useTradingBot.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 🎯 How It Works

1. **Price Engine**: Generates realistic gold prices every 2 seconds, creating 1-minute candles
2. **Indicators**: Calculates EMA and RSI from price history
3. **AI Engine**: Makes trading decisions every 10 seconds based on:
   - Trend analysis (EMA crossovers)
   - Momentum (RSI levels)
   - Current position and PnL
4. **Execution**: Simulates order execution with fees and PnL tracking
5. **Chart**: Displays live price chart with trade markers

## 🔧 Configuration

### Trading Parameters

Edit `src/hooks/useTradingBot.ts`:
- Initial balance: `new ExecutionSimulator(10000)`
- Decision interval: `10000` (10 seconds)
- Position size: `DEFAULT_POSITION_SIZE` in `executionSimulator.ts`

### Price Engine

Edit `src/engine/priceEngine.ts`:
- Initial price: `initialPrice: 2000`
- Update interval: `updateInterval: 2000` (2 seconds)
- Volatility: `volatility: 0.001`

## 🎨 Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **TradingView Lightweight Charts** - Professional charting
- **ESLint** - Code quality

## 📝 Notes

- **Real Gold Prices**: Uses exchangerate.host API for live gold prices (free, no auth required)
- **1-Minute Chart**: Displays real-time 1-minute candlestick data
- **No Real Trading**: Execution is simulated - no real money is traded
- **Modular Design**: All components are isolated and can be replaced with premium APIs
- **Performance**: Chart updates are optimized to handle real-time data efficiently
- **API Rate Limits**: Free API has rate limits; for production, consider premium APIs
- **Extensible**: Easy to add more indicators, strategies, or UI components

## 🔮 Future Enhancements

- Real API integration (price feeds, execution)
- Multiple trading strategies
- Backtesting capabilities
- More technical indicators
- Portfolio management
- Risk management rules

## 📄 License

This is a demo project for educational purposes.
