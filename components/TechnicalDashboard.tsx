import React, { useState, useEffect, useContext, useRef } from 'react';
import { Activity, RefreshCw, Brain, Gauge, Radar, Target, Database, Layers, ArrowUpRight, ArrowDownRight, Radio, PlayCircle, TrendingUp, BarChart3, List, PanelLeftClose, PanelLeftOpen, ChevronRight } from 'lucide-react';
import { ChartDataPoint, TechnicalIndicators, Timeframe, OnChainMetric, MarketDepthItem, MLPrediction, BacktestResult } from '../types';
import { ChartVis } from './ChartVis';
import { fetchCryptoData, performTechnicalAnalysis, fetchOnChainMetrics, fetchMarketDepth, predictSignalXGBoost, runBacktest, enrichDataWithIndicators } from '../services/technicalService';
import { generateTechnicalInsight } from '../services/geminiService';
import { LanguageContext } from '../App';

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'BNB', name: 'Binance' },
  { symbol: 'DOGE', name: 'Dogecoin' },
];

interface TechnicalDashboardProps {
  customData: ChartDataPoint[] | null;
  showBotsOnly?: boolean;
}

export const TechnicalDashboard: React.FC<TechnicalDashboardProps> = ({ customData, showBotsOnly = false }) => {
  const { t } = useContext(LanguageContext);
  const [selectedCoin, setSelectedCoin] = useState(COINS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [isScannerOpen, setIsScannerOpen] = useState(true);
  
  // Data State
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  
  // Scanner State
  const [scannerData, setScannerData] = useState<any[]>([]);

  // UI State
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [onChainMetrics, setOnChainMetrics] = useState<OnChainMetric[]>([]);
  const [marketDepth, setMarketDepth] = useState<{bids: MarketDepthItem[], asks: MarketDepthItem[]} | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const wsRef = useRef<WebSocket | null>(null);

  // Helper to format date consistent with service
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };
  
  // --- MAIN DATA LOOP ---
  const updateMarketData = async () => {
    setFetching(true);
    let data: ChartDataPoint[] = [];
    if (customData) {
      data = customData;
    } else {
      data = await fetchCryptoData(selectedCoin.symbol, timeframe, 200, 'FUTURES');
    }

    if (data.length > 50) {
      setHistory(data);
      
      // 1. Calculate Indicators
      const newIndicators = performTechnicalAnalysis(data);
      setIndicators(newIndicators);
      
      // 2. Generate ML Prediction (Simulated XGBoost)
      const currentPrice = data[data.length - 1].price;
      const prediction = predictSignalXGBoost(newIndicators, currentPrice);
      setMlPrediction(prediction);

      // 3. Run Backtest on this asset
      const btResult = runBacktest(data, 10000);
      setBacktestResult(btResult);
      
      // 4. Update Live Data Feeds
      const newMetrics = fetchOnChainMetrics(selectedCoin.symbol);
      setOnChainMetrics(newMetrics);
      const newDepth = fetchMarketDepth(currentPrice);
      setMarketDepth(newDepth);
      
      setLastUpdate(new Date());

      // 5. Trigger AI Analysis (Only on initial load/coin change, not every tick)
      if (!showBotsOnly) {
         runAiAnalysis(data, newIndicators, newMetrics, newDepth);
      }
    }
    setFetching(false);
  };

  const runAiAnalysis = async (
    currentHistory: ChartDataPoint[], 
    currentIndicators: TechnicalIndicators,
    currentOnChain: OnChainMetric[],
    currentDepth: {bids: MarketDepthItem[], asks: MarketDepthItem[]} | null
  ) => {
    if (!currentHistory.length || !currentIndicators) return;
    setLoading(true);
    const currentPrice = currentHistory[currentHistory.length - 1].price;
    
    // Updated: Passing OnChain and Depth data for "Deep Analysis"
    const insight = await generateTechnicalInsight(
        selectedCoin.symbol, 
        currentPrice, 
        currentIndicators, 
        timeframe,
        currentOnChain,
        currentDepth || undefined
    );
    
    setAiInsight(insight);
    setLoading(false);
  };

  // --- BACKGROUND SCANNER ---
  useEffect(() => {
    const scanMarket = async () => {
        const results = [];
        for (const coin of COINS) {
            // Using a shorter limit for scanner to be fast
            const data = await fetchCryptoData(coin.symbol, '1h', 60, 'SPOT'); 
            if (data.length > 20) {
                const inds = performTechnicalAnalysis(data);
                const pred = predictSignalXGBoost(inds, data[data.length-1].price);
                results.push({ ...coin, signal: pred.signal, confidence: pred.confidence, trend: inds.trend });
            }
        }
        setScannerData(results);
    };
    scanMarket();
  }, []); // Run once on mount

  // --- WEBSOCKET & DATA SYNC ---
  useEffect(() => {
    // 1. Initial REST Fetch
    updateMarketData();

    // 2. WebSocket Connection
    if (!customData && !showBotsOnly) {
       // Close existing
       if (wsRef.current) {
         wsRef.current.close();
       }

       const pair = selectedCoin.symbol.toLowerCase() + 'usdt';
       const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair}@kline_${timeframe}`);
       wsRef.current = ws;

       ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.e === 'kline') {
             const k = msg.k;
             
             setHistory(prev => {
                if (prev.length === 0) return prev;

                const newHistory = [...prev];
                const lastCandle = newHistory[newHistory.length - 1];
                const formattedDate = formatDate(k.t);
                
                const newCandle: ChartDataPoint = {
                    date: formattedDate,
                    price: parseFloat(k.c),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    volume: parseFloat(k.v),
                    // Derived props will be added by enrichDataWithIndicators
                };

                // Update or Append logic
                if (lastCandle.date === formattedDate) {
                    // Update existing candle (preserve existing SMA if we don't want to recalc whole array, 
                    // BUT we must recalc to be accurate)
                    newHistory[newHistory.length - 1] = { ...lastCandle, ...newCandle };
                } else {
                    // New candle
                    newHistory.push(newCandle);
                    if (newHistory.length > 200) newHistory.shift();
                }

                // --- Real-time Enrichment & Calculation ---
                // 1. Recalculate SMA/BB for the chart lines
                const enrichedHistory = enrichDataWithIndicators(newHistory);
                
                // 2. Recalculate Dashboard Indicators
                const newDashboardIndicators = performTechnicalAnalysis(enrichedHistory);
                
                // 3. Recalculate ML Prediction
                const currentPrice = enrichedHistory[enrichedHistory.length-1].price;
                const newPred = predictSignalXGBoost(newDashboardIndicators, currentPrice);
                
                // 4. Recalculate Backtest (Fast enough for <500 points)
                const newBt = runBacktest(enrichedHistory, 10000);

                // Batch State Updates
                setIndicators(newDashboardIndicators);
                setMlPrediction(newPred);
                setBacktestResult(newBt);
                
                return enrichedHistory;
             });
          }
       };

       return () => {
           if (wsRef.current) wsRef.current.close();
       };
    }
  }, [selectedCoin, timeframe]); 


  return (
    <div className="h-full flex bg-[#030303] overflow-hidden relative">
      
      {/* LEFT: Market Scanner (Collapsible) */}
      <div className={`${isScannerOpen ? 'w-64 border-r' : 'w-0 border-r-0'} bg-[#0a0a0a] border-[#222] flex flex-col transition-all duration-300 overflow-hidden relative z-10 flex-shrink-0`}>
         <div className="p-4 border-b border-[#222] min-w-[16rem]">
            <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                Market Scanner
            </h3>
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-150px)] custom-scrollbar">
               {scannerData.length === 0 ? (
                 <div className="text-center text-gray-600 text-xs py-4">Scanning Market...</div>
               ) : scannerData.map(c => (
                 <button 
                   key={c.symbol}
                   onClick={() => setSelectedCoin(COINS.find(x => x.symbol === c.symbol) || COINS[0])}
                   className={`w-full flex items-center justify-between p-3 transition-all border-l-2 ${
                       selectedCoin.symbol === c.symbol 
                       ? 'bg-[#111] border-l-[#D4AF37] text-white' 
                       : 'hover:bg-[#111] border-l-transparent text-gray-500'
                   }`}
                 >
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold">{c.symbol}</span>
                        <span className="text-[9px] font-mono opacity-50">{c.trend}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-bold ${c.signal === 'BUY' ? 'text-emerald-400' : c.signal === 'SELL' ? 'text-red-400' : 'text-gray-400'}`}>
                            {c.signal}
                        </span>
                        <span className="text-[9px] text-[#D4AF37]">{c.confidence.toFixed(0)}%</span>
                    </div>
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* RIGHT: Main Dashboard Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#030303] overflow-hidden">
         
         {/* Top Bar: Header & Controls */}
         <div className="h-16 border-b border-[#222] bg-[#0a0a0a] flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-20">
             <div className="flex items-center gap-4">
                 <button 
                    onClick={() => setIsScannerOpen(!isScannerOpen)}
                    className="p-2 hover:bg-[#222] rounded-md text-gray-400 hover:text-white transition-colors"
                 >
                    {isScannerOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                 </button>
                 
                 <div>
                     <h1 className="text-xl font-serif text-white tracking-tight flex items-center gap-2">
                         {selectedCoin.name} 
                         <span className="text-[#D4AF37] text-sm font-sans font-light border border-[#D4AF37]/30 px-2 py-0.5 rounded-full">
                            {selectedCoin.symbol}
                         </span>
                     </h1>
                 </div>
             </div>

             <div className="flex items-center gap-6">
                 {/* Live Status Indicator */}
                 {!customData && (
                   <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/30 rounded-full border border-emerald-900/30">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Stream Active</span>
                   </div>
                 )}
                 
                <div className="hidden md:flex flex-col items-end">
                    <div className="text-lg font-mono text-white tracking-tighter leading-none">
                        ${history.length > 0 ? history[history.length-1].price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '---'}
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Live Price</span>
                </div>
             </div>
         </div>

         {/* Main Workspace (Split View) */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                
                {/* --- Left Column: Chart & Strategy (Takes 8 cols) --- */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Main Chart */}
                    <div className="relative elegant-card p-1 bg-[#050505] min-h-[450px] lg:h-[600px] flex flex-col">
                        {fetching && <div className="absolute top-4 right-4 text-[10px] text-[#D4AF37] animate-pulse font-mono uppercase tracking-widest z-10">Processing...</div>}
                        <ChartVis 
                            data={history} 
                            color="#D4AF37" 
                            height={600}
                            activeTimeframe={timeframe}
                            onTimeframeChange={setTimeframe}
                        />
                    </div>

                    {/* Backtest Stats (Compact Row) */}
                    <div className="elegant-card p-4 bg-[#0a0a0a] grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <span className="block text-[9px] text-gray-500 uppercase tracking-widest">Net Profit</span>
                            <span className={`text-base font-mono font-bold ${backtestResult?.totalReturn && backtestResult.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {backtestResult?.totalReturn.toFixed(2)}%
                            </span>
                        </div>
                        <div>
                            <span className="block text-[9px] text-gray-500 uppercase tracking-widest">Max Drawdown</span>
                            <span className="text-base font-mono font-bold text-red-400">
                                -{backtestResult?.maxDrawdown.toFixed(2)}%
                            </span>
                        </div>
                        <div>
                            <span className="block text-[9px] text-gray-500 uppercase tracking-widest">Total Trades</span>
                            <span className="text-base font-mono font-bold text-white">
                                {backtestResult?.trades}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[9px] text-gray-500 uppercase tracking-widest">Win Rate</span>
                            <span className="text-base font-mono font-bold text-[#D4AF37]">
                                {backtestResult && backtestResult.trades > 0 ? ((backtestResult.winningTrades / backtestResult.trades) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Intelligence Panel (Takes 4 cols) --- */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* 1. ML Signal Card */}
                    <div className={`elegant-card p-6 flex flex-col justify-center items-center text-center relative overflow-hidden transition-all ${
                        mlPrediction?.signal === 'BUY' ? 'bg-emerald-950/20 border-emerald-900/40' :
                        mlPrediction?.signal === 'SELL' ? 'bg-red-950/20 border-red-900/40' : 'bg-[#0a0a0a]'
                    }`}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50"></div>
                        <h3 className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-3">AI Prediction Model</h3>
                        <div className="text-4xl font-bold text-white mb-3 tracking-tighter">
                            {mlPrediction?.signal || 'HOLD'}
                        </div>
                        <div className="w-full bg-[#222] h-1 rounded-full overflow-hidden mb-3 max-w-[180px]">
                             <div className="h-full bg-[#D4AF37]" style={{width: `${mlPrediction?.confidence || 0}%`}}></div>
                        </div>
                        <span className="text-[10px] text-[#D4AF37] font-mono">CONFIDENCE: {mlPrediction?.confidence.toFixed(1)}%</span>
                    </div>

                    {/* 2. Quantum Strategic Insight (Scrollable) */}
                    <div className="elegant-card p-6 bg-[#0a0a0a] flex-1 min-h-[300px] flex flex-col">
                        <div className="flex items-center gap-3 mb-4 border-b border-[#222] pb-3">
                           <Brain className="w-4 h-4 text-[#D4AF37]" />
                           <h3 className="text-xs font-bold text-white uppercase tracking-widest">Deep Analysis</h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
                           <div className="prose prose-invert prose-p:text-gray-400 prose-headings:text-[#D4AF37] prose-strong:text-gray-200 text-xs leading-relaxed font-light">
                              {loading ? (
                                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-600">
                                      <RefreshCw className="w-5 h-5 animate-spin text-[#D4AF37]" />
                                      <span className="text-[10px] uppercase tracking-widest">Reasoning...</span>
                                  </div>
                              ) : aiInsight ? (
                                  aiInsight.split('\n').map((line, i) => <p key={i} className="mb-3">{line}</p>)
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-2">
                                      <Radar className="w-8 h-8 opacity-20" />
                                      <span className="text-[10px] italic">Waiting for signal confirmation...</span>
                                  </div>
                              )}
                           </div>
                        </div>
                    </div>

                    {/* 3. On-Chain Metrics */}
                    <div className="elegant-card p-5 bg-[#0a0a0a]">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Database className="w-3 h-3" />
                            On-Chain Data
                        </h3>
                        <div className="space-y-3">
                            {onChainMetrics.map((metric) => (
                                <div key={metric.id} className="flex justify-between items-center border-b border-[#222] pb-2 last:border-0 last:pb-0">
                                    <span className="text-[10px] text-gray-400">{metric.label}</span>
                                    <span className={`text-[10px] font-mono font-bold ${
                                        metric.status === 'positive' ? 'text-emerald-400' : 
                                        metric.status === 'negative' ? 'text-red-400' : 'text-gray-300'
                                    }`}>
                                        {metric.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
             </div>
         </div>
      </div>
    </div>
  );
};