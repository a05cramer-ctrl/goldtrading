/**
 * Execution Simulator
 * 
 * DETERMINISTIC: Uses time-based IDs so all users see identical trades.
 * This module can be replaced with a real execution API later.
 */

export interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: number;
  fee: number;
}

export interface Position {
  type: 'NONE' | 'LONG';
  quantity: number;
  entryPrice: number;
  entryTime: number;
}

export interface AccountState {
  balance: number;
  position: Position;
  realizedPnL: number;
  trades: Trade[];
}

export class ExecutionSimulator {
  private accountState: AccountState;
  private readonly TRADING_FEE = 0.0005; // 0.05% fee per trade (lower for scalping)
  private readonly DEFAULT_POSITION_SIZE = 0.02; // 0.02 oz of gold per trade (~$100 position)
  private tradeCounter: number = 0;

  constructor(initialBalance: number = 200) {
    this.accountState = {
      balance: initialBalance,
      position: {
        type: 'NONE',
        quantity: 0,
        entryPrice: 0,
        entryTime: 0,
      },
      realizedPnL: 0,
      trades: [],
    };
    
    // Initialize with 3 profitable historical trades
    this.initializeHistoricalTrades();
  }

  /**
   * Initialize with 3 completed profitable trades
   * Total profit: ~$20-50
   * Uses larger position size for historical trades to show meaningful profits
   * Timestamps are aligned to minute boundaries to match candle timestamps
   * Trades are spread across recent minutes (5, 3, 1 minutes ago) so they're visible on chart
   */
  private initializeHistoricalTrades(): void {
    const now = Date.now();
    const oneMinute = 60000;
    const basePrice = 5094; // Current gold price
    const historicalQty = 0.15; // Larger size for historical trades (0.15 oz = ~$764 position)
    
    // Align timestamps to minute boundaries (same as candles)
    // Place trades at different minutes so they appear spread out on the chart
    const currentMinute = Math.floor(now / oneMinute) * oneMinute;
    
    // Create 3 profitable trades with varying profits ($7-17 each, total ~$35)
    // Price differences: ~$55-65 per oz to achieve $8-9 profit per trade with 0.15 oz position
    // Timestamps aligned to minute boundaries and spread across recent minutes
    // Each trade pair is separated by at least 1 minute for clear visualization
    const historicalTrades: Array<{ buyPrice: number; sellPrice: number; buyTime: number; sellTime: number }> = [
      {
        buyPrice: basePrice - 58, // Bought at $5036
        sellPrice: basePrice - 5,  // Sold at $5089 (profit ~$8.50)
        buyTime: currentMinute - (6 * oneMinute),     // 6 minutes ago (aligned to minute)
        sellTime: currentMinute - (5 * oneMinute),    // 5 minutes ago (aligned to minute)
      },
      {
        buyPrice: basePrice - 52, // Bought at $5042
        sellPrice: basePrice - 1, // Sold at $5093 (profit ~$8.50)
        buyTime: currentMinute - (4 * oneMinute),     // 4 minutes ago (aligned to minute)
        sellTime: currentMinute - (3 * oneMinute),    // 3 minutes ago (aligned to minute)
      },
      {
        buyPrice: basePrice - 50, // Bought at $5044
        sellPrice: basePrice + 1, // Sold at $5095 (profit ~$8.50)
        buyTime: currentMinute - (2 * oneMinute),     // 2 minutes ago (aligned to minute)
        sellTime: currentMinute - (1 * oneMinute),    // 1 minute ago (aligned to minute)
      },
    ];

    let totalProfit = 0;

    // Execute historical trades
    for (const trade of historicalTrades) {
      // Buy trade
      const buyCost = trade.buyPrice * historicalQty;
      const buyFee = buyCost * this.TRADING_FEE;

      const buyTrade: Trade = {
        id: this.generateTradeId(trade.buyTime, 'BUY'),
        type: 'BUY',
        price: trade.buyPrice,
        quantity: historicalQty,
        timestamp: trade.buyTime,
        fee: buyFee,
      };

      // Sell trade
      const sellProceeds = trade.sellPrice * historicalQty;
      const sellFee = sellProceeds * this.TRADING_FEE;
      const netSellProceeds = sellProceeds - sellFee;
      
      // Calculate profit: net proceeds - cost basis (excluding fees in cost basis for cleaner calculation)
      const tradePnL = netSellProceeds - buyCost;

      const sellTrade: Trade = {
        id: this.generateTradeId(trade.sellTime, 'SELL'),
        type: 'SELL',
        price: trade.sellPrice,
        quantity: historicalQty,
        timestamp: trade.sellTime,
        fee: sellFee,
      };

      // Add trades to history
      this.accountState.trades.push(buyTrade, sellTrade);
      totalProfit += tradePnL;
    }

    // Add profit to balance and realized PnL
    this.accountState.balance += totalProfit;
    this.accountState.realizedPnL = totalProfit;
  }

  /**
   * Generate DETERMINISTIC trade ID based on time slot
   * All users will generate the same ID for trades at the same time
   */
  private generateTradeId(timestamp: number, type: 'BUY' | 'SELL'): string {
    this.tradeCounter++;
    return `trade-${timestamp}-${type}-${this.tradeCounter}`;
  }

  /**
   * Execute a buy order
   * @param timestamp - Deterministic timestamp (time slot) for synchronized execution
   */
  public executeBuy(price: number, quantity?: number, timestamp?: number): Trade | null {
    const qty = quantity ?? this.DEFAULT_POSITION_SIZE;
    const cost = price * qty;
    const fee = cost * this.TRADING_FEE;
    const totalCost = cost + fee;

    // Check if we have enough balance
    if (this.accountState.balance < totalCost) {
      return null; // Insufficient funds
    }

    // If we already have a position, we can't buy more (for simplicity)
    if (this.accountState.position.type === 'LONG') {
      return null; // Already have a position
    }

    // Use provided timestamp or current time (deterministic when provided)
    const tradeTime = timestamp ?? Date.now();

    // Execute trade with deterministic ID
    const trade: Trade = {
      id: this.generateTradeId(tradeTime, 'BUY'),
      type: 'BUY',
      price,
      quantity: qty,
      timestamp: tradeTime,
      fee,
    };

    // Update account state
    this.accountState.balance -= totalCost;
    this.accountState.position = {
      type: 'LONG',
      quantity: qty,
      entryPrice: price,
      entryTime: tradeTime,
    };
    this.accountState.trades.push(trade);

    return trade;
  }

  /**
   * Execute a sell order
   * @param timestamp - Deterministic timestamp (time slot) for synchronized execution
   */
  public executeSell(price: number, quantity?: number, timestamp?: number): Trade | null {
    // Check if we have a position to sell
    if (this.accountState.position.type === 'NONE') {
      return null; // No position to sell
    }

    const qty = quantity ?? this.accountState.position.quantity;
    
    // Can't sell more than we have
    if (qty > this.accountState.position.quantity) {
      return null;
    }

    const proceeds = price * qty;
    const fee = proceeds * this.TRADING_FEE;
    const netProceeds = proceeds - fee;

    // Calculate realized PnL
    const costBasis = this.accountState.position.entryPrice * qty;
    const realizedPnL = netProceeds - costBasis;

    // Use provided timestamp or current time (deterministic when provided)
    const tradeTime = timestamp ?? Date.now();

    // Execute trade with deterministic ID
    const trade: Trade = {
      id: this.generateTradeId(tradeTime, 'SELL'),
      type: 'SELL',
      price,
      quantity: qty,
      timestamp: tradeTime,
      fee,
    };

    // Update account state
    this.accountState.balance += netProceeds;
    this.accountState.realizedPnL += realizedPnL;

    // Update position
    if (qty >= this.accountState.position.quantity) {
      // Closed entire position
      this.accountState.position = {
        type: 'NONE',
        quantity: 0,
        entryPrice: 0,
        entryTime: 0,
      };
    } else {
      // Partial close (for future expansion)
      this.accountState.position.quantity -= qty;
    }

    this.accountState.trades.push(trade);

    return trade;
  }

  /**
   * Calculate unrealized PnL based on current price
   */
  public getUnrealizedPnL(currentPrice: number): number {
    if (this.accountState.position.type === 'NONE') {
      return 0;
    }

    const { entryPrice, quantity } = this.accountState.position;
    const currentValue = currentPrice * quantity;
    const costBasis = entryPrice * quantity;
    
    return currentValue - costBasis;
  }

  /**
   * Get current account state
   */
  public getAccountState(): AccountState {
    return { ...this.accountState };
  }

  /**
   * Get current position
   */
  public getPosition(): Position {
    return { ...this.accountState.position };
  }

  /**
   * Get trade history
   */
  public getTradeHistory(): Trade[] {
    return [...this.accountState.trades];
  }

  /**
   * Get total PnL (realized + unrealized)
   */
  public getTotalPnL(currentPrice: number): number {
    return this.accountState.realizedPnL + this.getUnrealizedPnL(currentPrice);
  }
}
