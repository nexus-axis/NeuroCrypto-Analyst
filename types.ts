
export interface ChartDataPoint {
  date: string;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  // Algorithmic Data Points
  sma20?: number;
  sma50?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface AnalysisResponse {
  text: string;
  chartData?: ChartDataPoint[];
  webSources?: WebSource[];
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string; // base64
  chartData?: ChartDataPoint[];
  webSources?: WebSource[];
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  isLoading?: boolean;
  timestamp: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD', // Analytics
  MARKET = 'MARKET', // Charting
  SETTINGS = 'SETTINGS',
  REPORTS = 'REPORTS' // Replaced Bots with Reports
}

export enum Language {
  AR = 'ar',
  EN = 'en',
  RU = 'ru'
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface CryptoToken {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  isNew?: boolean;
}

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

export interface MLPrediction {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0 to 100
  features: {
    rsiNormalized: number;
    trendStrength: number;
    volatility: number;
  };
}

export interface OnChainMetric {
  id: string;
  label: string;
  value: string;
  status: 'positive' | 'negative' | 'neutral';
  timestamp: number;
}

export interface MarketDepthItem {
  price: number;
  amount: number;
  total: number;
  type: 'bid' | 'ask';
}

// Renamed and repurposed for Analysis Reports
export interface SignalReport {
  id: string;
  asset: string;
  type: 'LONG' | 'SHORT' | 'HOLD';
  entryZone: string;
  target: string;
  stopLoss: string;
  confidence: number;
  timeframe: string;
  issuedAt: number;
}

export interface BacktestResult {
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  trades: number;
  winningTrades: number;
  maxDrawdown: number;
  equityCurve: ChartDataPoint[];
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'claude-3-opus-4.5', name: 'Claude Opus 4.5', description: 'Deep Logic & Strategy', isNew: true },
  { id: 'claude-3-haiku-4.5', name: 'Claude Haiku 4.5', description: 'Fast Pattern Recognition', isNew: true },
  { id: 'claude-3-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Balanced Market Analysis', isNew: true },
  { id: 'claude-3-sonnet-4', name: 'Claude Sonnet 4.0', description: 'Legacy Analytical Engine' },
  { id: 'chatgpt-5', name: 'ChatGPT 5.0', description: 'Predictive Generative Model', isNew: true },
];