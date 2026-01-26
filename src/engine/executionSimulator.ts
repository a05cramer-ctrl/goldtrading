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
