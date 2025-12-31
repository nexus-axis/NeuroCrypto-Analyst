import React, { useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Bar,
  ComposedChart,
  ReferenceLine,
  Line,
} from 'recharts';
import { Maximize2, Camera, Settings2, MousePointer2, Activity, Eye, EyeOff, Layers } from 'lucide-react';
import { ChartDataPoint, Timeframe } from '../types';

interface ChartVisProps {
  data: ChartDataPoint[];
  color?: string;
  height?: number;
  onTimeframeChange?: (tf: Timeframe) => void;
  activeTimeframe?: Timeframe;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

export const ChartVis: React.FC<ChartVisProps> = ({ 
  data, 
  color = "#fbbf24", // Amber-400 (Brighter Gold)
  onTimeframeChange,
  activeTimeframe = '1h'
}) => {
  const [showVolume, setShowVolume] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);

  if (!data || data.length === 0) return (
    <div className="w-full h-[300px] md:h-full flex flex-col items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800">
      <Activity className="w-8 h-8 text-zinc-600 animate-pulse" />
      <span className="text-xs text-zinc-500 mt-2 font-mono">INITIALIZING_FEED...</span>
    </div>
  );

  const lastPrice = data[data.length - 1].price;
  const firstPrice = data[0].price;
  const isPositive = lastPrice >= firstPrice;
  
  // Refined Color Palette for "Lighter" Dark Mode (Zinc-based)
  const bullishColor = '#34d399'; // Emerald 400
  const bearishColor = '#f87171'; // Red 400
  const neutralColor = '#fbbf24'; // Amber 400
  const strokeColor = color === "#fbbf24" ? neutralColor : (isPositive ? bullishColor : bearishColor);
  
  // Algorithm Colors
  const sma20Color = '#22d3ee'; // Cyan 400
  const sma50Color = '#a78bfa'; // Violet 400
  const bollingerColor = '#fbbf24'; // Amber 400

  return (
    <div className="w-full h-[350px] sm:h-[450px] lg:h-full flex flex-col bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden shadow-xl relative group">
      
      {/* Background Tech Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Toolbar - Top */}
      <div className="h-10 sm:h-12 border-b border-zinc-800 flex items-center justify-between px-2 sm:px-4 bg-zinc-900/95 backdrop-blur-md z-10">
         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex bg-zinc-800 rounded-lg p-1 border border-zinc-700/50">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange?.(tf)}
                  className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold rounded-md transition-all uppercase font-mono whitespace-nowrap ${
                    activeTimeframe === tf 
                      ? 'bg-[#fbbf24] text-black shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
         </div>

         <div className="flex items-center gap-2 sm:gap-4 ml-2">
             <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-emerald-900/20 rounded border border-emerald-900/30">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-mono font-bold text-emerald-500 tracking-wider">LIVE</span>
             </div>
             <div className="flex gap-2">
               <button className="text-zinc-500 hover:text-[#fbbf24] transition-colors"><Settings2 className="w-4 h-4" /></button>
             </div>
         </div>
      </div>
      
      {/* Algorithm Toolbar - Subheader */}
      <div className="h-8 border-b border-zinc-800 flex items-center px-4 bg-zinc-900/80 backdrop-blur-sm z-10 gap-4 overflow-x-auto no-scrollbar">
         <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
            <Layers className="w-3 h-3" /> Algorithms:
         </span>
         
         <button onClick={() => setShowSMA(!showSMA)} className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors ${showSMA ? 'text-cyan-400' : 'text-zinc-600'}`}>
            {showSMA ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            SMA(20/50)
         </button>

         <button onClick={() => setShowBollinger(!showBollinger)} className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors ${showBollinger ? 'text-[#fbbf24]' : 'text-zinc-600'}`}>
            {showBollinger ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Bollinger
         </button>

         <button onClick={() => setShowVolume(!showVolume)} className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors ${showVolume ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {showVolume ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Volume
         </button>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 relative w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 60, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor={strokeColor} stopOpacity={0.15}/>
                 <stop offset="95%" stopColor={strokeColor} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.3} />
            
            <XAxis 
              dataKey="date" 
              stroke="#71717a" 
              tick={{fontSize: 9, fill: '#71717a', fontFamily: 'JetBrains Mono'}} 
              axisLine={false}
              tickLine={false}
              minTickGap={40}
              dy={10}
              height={30}
            />
            
            {/* Primary Axis (Right) for Price */}
            <YAxis 
              yAxisId="right"
              stroke="#71717a" 
              tick={{fontSize: 9, fill: '#a1a1aa', fontFamily: 'JetBrains Mono'}}
              tickFormatter={(val) => val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              domain={['auto', 'auto']}
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={55}
            />

            {/* Secondary Axis (Left - Hidden) for Volume */}
            <YAxis 
              yAxisId="left"
              orientation="left"
              hide={true}
              domain={['dataMin', 'dataMax * 4']} // Scale volume down
            />
            
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const priceVal = payload.find(p => p.dataKey === 'price')?.value;
                  const sma20 = payload.find(p => p.dataKey === 'sma20')?.value;
                  const upper = payload.find(p => p.dataKey === 'bollingerUpper')?.value;

                  return (
                    <div className="bg-zinc-900/95 border border-zinc-700 p-3 rounded-lg shadow-xl backdrop-blur-xl min-w-[150px]">
                      <p className="text-[10px] text-zinc-400 mb-2 font-mono uppercase">{label}</p>
                      
                      <div className="flex justify-between items-baseline gap-4 mb-1">
                          <span className="text-[10px] text-zinc-500 font-bold">Price</span>
                          <span className="text-sm font-bold text-zinc-100 font-mono">
                            ${Number(priceVal).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                      </div>

                      {sma20 && (
                        <div className="flex justify-between items-baseline gap-4">
                            <span className="text-[10px] text-cyan-500">SMA 20</span>
                            <span className="text-xs font-mono text-cyan-400">
                                ${Number(sma20).toFixed(2)}
                            </span>
                        </div>
                      )}
                      
                      {upper && (
                         <div className="flex justify-between items-baseline gap-4">
                            <span className="text-[10px] text-[#fbbf24]">BB Upper</span>
                            <span className="text-xs font-mono text-[#fbbf24]">
                                ${Number(upper).toFixed(2)}
                            </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: '#52525b', strokeWidth: 1 }}
            />

            {/* Volume Bars */}
            {showVolume && (
              <Bar 
                  dataKey="volume" 
                  yAxisId="left" 
                  fill="url(#volumeGradient)" 
                  barSize={4} 
                  radius={[2, 2, 0, 0]}
              />
            )}

            {/* SMA Lines */}
            {showSMA && (
              <>
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="sma20" 
                  stroke={sma20Color} 
                  strokeWidth={1.5} 
                  dot={false}
                  opacity={0.8}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="sma50" 
                  stroke={sma50Color} 
                  strokeWidth={1.5} 
                  dot={false}
                  opacity={0.8}
                />
              </>
            )}

            {/* Bollinger Bands */}
            {showBollinger && (
              <>
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="bollingerUpper" 
                  stroke={bollingerColor} 
                  strokeWidth={1} 
                  strokeDasharray="3 3"
                  dot={false}
                  opacity={0.6}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="bollingerLower" 
                  stroke={bollingerColor} 
                  strokeWidth={1} 
                  strokeDasharray="3 3"
                  dot={false}
                  opacity={0.6}
                />
              </>
            )}

            {/* Price Line (Main) */}
            <Area 
              type="monotone" 
              dataKey="price" 
              yAxisId="right"
              stroke={strokeColor} 
              fillOpacity={1} 
              fill="url(#chartGradient)" 
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
              animationDuration={1000}
            />
            
            {/* Current Price Marker */}
            <ReferenceLine 
              y={lastPrice} 
              yAxisId="right"
              stroke={strokeColor} 
              strokeDasharray="3 3" 
              strokeOpacity={0.8}
            >
              <foreignObject x="100%" y={-10} width="70" height="24" style={{ overflow: 'visible' }}>
                  <div style={{ 
                      backgroundColor: strokeColor, 
                      color: '#000', 
                      fontSize: '10px', 
                      fontWeight: '800', 
                      padding: '2px 6px', 
                      borderRadius: '2px',
                      marginLeft: '2px',
                      fontFamily: 'JetBrains Mono',
                      boxShadow: `0 0 10px ${strokeColor}66`
                  }}>
                      ${lastPrice.toFixed(2)}
                  </div>
              </foreignObject>
            </ReferenceLine>

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};