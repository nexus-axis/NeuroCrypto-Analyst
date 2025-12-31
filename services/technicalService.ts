import { ChartDataPoint, TechnicalIndicators, BacktestResult, Timeframe, OnChainMetric, MarketDepthItem, MLPrediction } from '../types';

// --- CACHING SYSTEM ---
const DATA_CACHE: Record<string, { timestamp: number; data: ChartDataPoint[] }> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute cache

/**
 * Fetches real-time OHLCV data from Binance API (Spot or Futures) with Caching
 */
export const fetchCryptoData = async (
  symbol: string, 
  interval: Timeframe = '1h', 
  limit: number = 200, // Increased limit for better backtesting
  marketType: 'SPOT' | 'FUTURES' = 'SPOT'
): Promise<ChartDataPoint[]> => {
  const cacheKey = `${symbol}-${interval}-${marketType}`;
  const now = Date.now();

  // Check Cache
  if (DATA_CACHE[cacheKey] && (now - DATA_CACHE[cacheKey].timestamp < CACHE_DURATION)) {
    console.log(`[Cache Hit] ${cacheKey}`);
    return DATA_CACHE[cacheKey].data;
  }

  try {
    const pair = `${symbol.toUpperCase()}USDT`;
    let url = '';
    
    // Binance API requires '1m', '1h', '1d' etc. Our Timeframe type matches usually.
    const binanceInterval = interval; 

    if (marketType === 'FUTURES') {
      url = `https://fapi.binance.com/fapi/v1/klines?symbol=${pair}&interval=${binanceInterval}&limit=${limit}`;
    } else {
      url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${binanceInterval}&limit=${limit}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const rawData = await response.json();

    const data: ChartDataPoint[] = rawData.map((d: any) => ({
      date: new Date(d[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + new Date(d[0]).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(d[4]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      volume: parseFloat(d[5])
    }));

    // Enrich Data with Algorithms (SMA, Bollinger)
    const enrichedData = enrichDataWithIndicators(data);

    // Update Cache
    DATA_CACHE[cacheKey] = { timestamp: now, data: enrichedData };
    return enrichedData;

  } catch (error) {
    console.warn(`Failed to fetch live ${marketType} data for ${symbol}, falling back to simulation.`, error);
    // Fallback simulation
    const basePriceMap: Record<string, number> = {
      'BTC': 92000, 'ETH': 3400, 'SOL': 145, 'BNB': 590, 'XRP': 0.60, 
      'DOGE': 0.15, 'ADA': 0.45, 'AVAX': 35, 'DOT': 7.5, 'LINK': 14
    };
    const basePrice = basePriceMap[symbol.toUpperCase()] || 100;
    const simData = generateHistory(basePrice, limit / 24);
    return enrichDataWithIndicators(simData);
  }
};

/**
 * Calculates historical indicators for the entire dataset for plotting
 */
export const enrichDataWithIndicators = (data: ChartDataPoint[]): ChartDataPoint[] => {
    const prices = data.map(d => d.price);
    return data.map((point, index) => {
        const slice = prices.slice(0, index + 1);
        
        // SMA 20
        let sma20 = undefined;
        if (slice.length >= 20) {
            sma20 = slice.slice(-20).reduce((a, b) => a + b, 0) / 20;
        }

        // SMA 50
        let sma50 = undefined;
        if (slice.length >= 50) {
            sma50 = slice.slice(-50).reduce((a, b) => a + b, 0) / 50;
        }

        // Bollinger Bands (20, 2)
        let upper = undefined;
        let lower = undefined;
        if (sma20 !== undefined && slice.length >= 20) {
             const periodSlice = slice.slice(-20);
             const squaredDiffs = periodSlice.map(val => Math.pow(val - sma20!, 2));
             const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / 20);
             upper = sma20 + (stdDev * 2);
             lower = sma20 - (stdDev * 2);
        }

        return {
            ...point,
            sma20,
            sma50,
            bollingerUpper: upper,
            bollingerLower: lower
        };
    });
}

/**
 * SIMULATION: Fetch Real-time On-Chain Metrics
 */
export const fetchOnChainMetrics = (symbol: string): OnChainMetric[] => {
  const metrics: OnChainMetric[] = [
    { id: '1', label: 'Net Exchange Flow', value: Math.random() > 0.5 ? '-$42.5M (Outflow)' : '+$12.1M (Inflow)', status: Math.random() > 0.5 ? 'positive' : 'negative', timestamp: Date.now() },
    { id: '2', label: 'Whale Tx (>1M)', value: `${Math.floor(Math.random() * 20)} Txs / hr`, status: 'neutral', timestamp: Date.now() },
    { id: '3', label: 'Miner Position', value: 'Accumulating', status: 'positive', timestamp: Date.now() },
    { id: '4', label: 'Open Interest', value: '$14.2B (ATH)', status: 'negative', timestamp: Date.now() },
    { id: '5', label: 'Funding Rate', value: '0.0102%', status: 'neutral', timestamp: Date.now() },
  ];
  return metrics;
};

/**
 * SIMULATION: Fetch Market Depth (Order Book)
 */
export const fetchMarketDepth = (currentPrice: number): { bids: MarketDepthItem[], asks: MarketDepthItem[] } => {
  const bids: MarketDepthItem[] = [];
  const asks: MarketDepthItem[] = [];
  
  for(let i=0; i<5; i++) {
    bids.push({
      price: currentPrice * (1 - (0.001 * (i+1))),
      amount: Math.random() * 10,
      total: 0,
      type: 'bid'
    });
    asks.push({
      price: currentPrice * (1 + (0.001 * (i+1))),
      amount: Math.random() * 10,
      total: 0,
      type: 'ask'
    });
  }
  return { bids, asks };
};

export const generateHistory = (basePrice: number, days: number = 60): ChartDataPoint[] => {
  let currentPrice = basePrice;
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = days * 24; i >= 0; i--) { // Hourly bars
    const date = new Date(now);
    date.setHours(date.getHours() - i);
    
    const volatility = 0.02; 
    const change = 1 + (Math.random() * volatility * 2 - volatility);
    
    const dailyVol = currentPrice * volatility;
    const high = currentPrice * change + (Math.random() * dailyVol);
    const low = currentPrice * change - (Math.random() * dailyVol);
    
    currentPrice = currentPrice * change;

    data.push({
      date: date.toISOString().split('T')[0] + ' ' + date.getHours() + ':00',
      price: currentPrice,
      high: Math.max(high, currentPrice),
      low: Math.min(low, currentPrice),
      volume: Math.floor(Math.random() * 1000000)
    });
  }
  return data;
};

// --- TECHNICAL INDICATORS ENGINE ---

const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
};

const calculateStdDev = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  const sma = calculateSMA(data, period);
  const slice = data.slice(data.length - period);
  const squaredDiffs = slice.map(val => Math.pow(val - sma, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  return Math.sqrt(avgSquaredDiff);
}

const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateATR = (data: ChartDataPoint[], period: number = 14): number => {
    if (data.length < period + 1) return 0;
    let trSum = 0;
    for (let i = data.length - period; i < data.length; i++) {
        const high = data[i].high || data[i].price;
        const low = data[i].low || data[i].price;
        const prevClose = data[i-1].price;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trSum += tr;
    }
    return trSum / period;
}

export const performTechnicalAnalysis = (data: ChartDataPoint[]): TechnicalIndicators => {
  const prices = data.map(d => d.price);
  
  const rsi = calculateRSI(prices);
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  
  // Bollinger Bands
  const stdDev20 = calculateStdDev(prices, 20);
  const bollinger = {
      middle: sma20,
      upper: sma20 + (stdDev20 * 2),
      lower: sma20 - (stdDev20 * 2)
  };

  // ATR
  const atr = calculateATR(data, 14);

  // MACD (Approximate using SMA instead of EMA for simplicity in this demo, real app should use EMA)
  const ema12 = calculateSMA(prices, 12); 
  const ema26 = calculateSMA(prices, 26);
  const macdValue = ema12 - ema26;

  let trend: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
  if (sma20 > sma50) trend = 'UP';
  else if (sma20 < sma50) trend = 'DOWN';

  // Naive Signal Calculation (Replaced by ML Prediction later)
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (rsi < 30 && trend === 'UP') signal = 'BUY';
  else if (rsi > 70 && trend === 'DOWN') signal = 'SELL';

  return {
    rsi,
    sma20,
    sma50,
    macd: {
      value: macdValue,
      signal: macdValue * 0.9, // approximation
      histogram: macdValue * 0.1
    },
    bollinger,
    atr,
    trend,
    signal
  };
};

/**
 * PREDICTIVE MODEL (Simulates XGBoost Logic)
 */
export const predictSignalXGBoost = (indicators: TechnicalIndicators, currentPrice: number): MLPrediction => {
    // Feature Engineering (Normalization)
    const rsiNorm = (indicators.rsi - 50) / 50; // -1 to 1
    const bbWidth = (indicators.bollinger.upper - indicators.bollinger.lower) / indicators.bollinger.middle;
    const trendScore = indicators.trend === 'UP' ? 1 : indicators.trend === 'DOWN' ? -1 : 0;
    
    // Decision Tree Logic (Simulation)
    let score = 0;
    
    // 1. Trend Following Node
    if (trendScore === 1 && currentPrice > indicators.sma50) score += 30;
    if (trendScore === -1 && currentPrice < indicators.sma50) score -= 30;

    // 2. Mean Reversion Node
    if (indicators.rsi < 30) score += 40; // Oversold -> Buy
    if (indicators.rsi > 70) score -= 40; // Overbought -> Sell
    
    // 3. Volatility Squeeze Node
    if (bbWidth < 0.05) { 
        // Breakout potential
        if (currentPrice > indicators.bollinger.upper) score += 20;
        if (currentPrice < indicators.bollinger.lower) score -= 20;
    }

    // 4. Momentum Node
    if (indicators.macd.histogram > 0) score += 10;
    else score -= 10;

    // Calculate Confidence & Signal
    const absScore = Math.abs(score);
    let confidence = Math.min(Math.abs(score), 98); // Cap at 98%
    // Add some noise to simulate model uncertainty
    confidence = confidence - (Math.random() * 5); 

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (score > 25) signal = 'BUY';
    else if (score < -25) signal = 'SELL';

    return {
        signal,
        confidence: Math.max(0, confidence),
        features: {
            rsiNormalized: rsiNorm,
            trendStrength: trendScore,
            volatility: bbWidth
        }
    };
}

/**
 * AUTOMATED BACKTESTING ENGINE
 */
export const runBacktest = (
  data: ChartDataPoint[], 
  initialBalance: number = 10000
): BacktestResult => {
  let balance = initialBalance;
  let shares = 0;
  let trades = 0;
  let winningTrades = 0;
  let maxBalance = initialBalance;
  let maxDrawdown = 0;
  
  const equityCurve: ChartDataPoint[] = [];
  const startIdx = 50; // Need history for indicators
  
  for (let i = startIdx; i < data.length; i++) {
    // Slice data to simulate "past knowledge" only
    const historySlice = data.slice(0, i + 1);
    const indicators = performTechnicalAnalysis(historySlice);
    const currentPrice = data[i].price;
    const prediction = predictSignalXGBoost(indicators, currentPrice);

    // Trading Logic based on ML Signal
    if (shares === 0) {
        // Buy Logic
        if (prediction.signal === 'BUY' && prediction.confidence > 60) {
            shares = balance / currentPrice;
            balance = 0;
            trades++;
        }
    } else {
        // Sell Logic
        if (prediction.signal === 'SELL' || prediction.signal === 'HOLD') { 
             if (prediction.signal === 'SELL') {
                 balance = shares * currentPrice;
                 if (balance > maxBalance) winningTrades++; 
                 shares = 0;
             }
        }
    }

    const currentEquity = balance + (shares * currentPrice);
    if (currentEquity > maxBalance) maxBalance = currentEquity;
    
    // Drawdown calc
    const dd = (maxBalance - currentEquity) / maxBalance;
    if (dd > maxDrawdown) maxDrawdown = dd;

    equityCurve.push({ date: data[i].date, price: currentEquity });
  }

  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].price : initialBalance;
  const totalReturn = ((finalEquity - initialBalance) / initialBalance) * 100;

  return {
    initialBalance,
    finalBalance: finalEquity,
    totalReturn,
    trades,
    winningTrades, 
    maxDrawdown: maxDrawdown * 100,
    equityCurve
  };
};