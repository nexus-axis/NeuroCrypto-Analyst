
import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CryptoToken } from '../types';

const MOCK_DATA: CryptoToken[] = [
  { symbol: 'BTC', name: 'BITCOIN', price: 92450.23, change24h: 2.4, volume: '42B' },
  { symbol: 'ETH', name: 'ETHEREUM', price: 3450.12, change24h: -0.8, volume: '18B' },
  { symbol: 'SOL', name: 'SOLANA', price: 145.67, change24h: 5.2, volume: '4B' },
  { symbol: 'BNB', name: 'BINANCE', price: 590.22, change24h: 1.1, volume: '1.2B' },
];

interface MarketTickerProps {
  simple?: boolean;
}

export const MarketTicker: React.FC<MarketTickerProps> = ({ simple = false }) => {
  return (
    <div className={`w-full overflow-hidden ${simple ? 'bg-transparent' : 'bg-[#0f172a] border-b border-slate-800'} py-1.5`}>
      <div className="flex animate-scroll whitespace-nowrap" dir="ltr">
        {[...MOCK_DATA, ...MOCK_DATA].map((token, index) => (
          <div key={`${token.symbol}-${index}`} className={`flex items-center gap-2 px-4 ${simple ? 'border-r border-slate-700/50' : 'border-r border-slate-800'}`}>
            <span className="text-xs font-bold text-slate-300 font-mono">{token.symbol}</span>
            <span className="text-xs font-mono text-slate-400">${token.price.toLocaleString()}</span>
            <div className={`flex items-center gap-0.5 text-[10px] font-bold ${token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {token.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(token.change24h)}%
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
      `}</style>
    </div>
  );
};
