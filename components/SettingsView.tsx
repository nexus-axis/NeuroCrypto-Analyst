
import React, { useRef, useState } from 'react';
import { Check, Cpu, Zap, Brain, Sparkles, Upload, FileText, Trash2, AlertCircle, Command } from 'lucide-react';
import { AVAILABLE_MODELS, ChartDataPoint } from '../types';

interface SettingsViewProps {
  activeModel: string;
  onModelSelect: (modelId: string) => void;
  onDataImport: (data: ChartDataPoint[] | null) => void;
  hasCustomData: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ activeModel, onModelSelect, onDataImport, hasCustomData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error("Invalid CSV format.");

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const dateIndex = headers.findIndex(h => h.includes('date') || h.includes('time'));
      const priceIndex = headers.findIndex(h => h.includes('price') || h.includes('close'));

      if (dateIndex === -1 || priceIndex === -1) throw new Error("Missing Date or Price columns.");

      const parsedData: ChartDataPoint[] = [];
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns.length < 2) continue;
        const price = parseFloat(columns[priceIndex].trim());
        if (!isNaN(price)) {
          parsedData.push({
            date: columns[dateIndex].trim(),
            price: price
          });
        }
      }
      onDataImport(parsedData);
      setError(null);
    } catch (err: any) {
      setError("Import Failed: " + err.message);
    }
  };

  return (
    <div className="h-full max-w-5xl mx-auto p-8 overflow-y-auto">
      <div className="mb-12 border-b border-[#222] pb-6">
        <h2 className="text-3xl font-serif text-white mb-2">System Configuration</h2>
        <p className="text-gray-500 font-light">Customize analysis engines and data streams.</p>
      </div>

      <div className="grid gap-8">
        
        {/* Model Selection */}
        <div className="elegant-card p-8 bg-[#0a0a0a]">
          <h3 className="text-xs font-bold text-[#D4AF37] mb-6 flex items-center gap-2 uppercase tracking-widest">
            <Cpu className="w-4 h-4" />
            Active Neural Model
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AVAILABLE_MODELS.map((model) => {
              const isActive = activeModel === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => onModelSelect(model.id)}
                  className={`relative flex flex-col items-start p-6 border transition-all text-left group h-full ${
                    isActive 
                      ? 'bg-[#111] border-[#D4AF37]' 
                      : 'bg-[#050505] border-[#222] hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between w-full mb-4">
                     <div className={`p-2 rounded-full ${isActive ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#111] text-gray-600'}`}>
                        {model.id.includes('opus') ? <Brain className="w-5 h-5" /> : 
                         model.id.includes('chatgpt') ? <Sparkles className="w-5 h-5" /> : <Command className="w-5 h-5" />}
                     </div>
                     {model.isNew && <span className="text-[9px] border border-[#D4AF37] text-[#D4AF37] px-2 py-0.5 rounded-full uppercase">New</span>}
                  </div>
                  
                  <span className={`text-lg font-serif mb-2 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {model.name}
                  </span>
                  <p className="text-xs text-gray-500 font-light leading-relaxed">
                    {model.description}
                  </p>

                  {isActive && (
                    <div className="absolute top-4 right-4 text-[#D4AF37]">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Import */}
        <div className="elegant-card p-8 bg-[#0a0a0a]">
           <h3 className="text-xs font-bold text-[#D4AF37] mb-6 flex items-center gap-2 uppercase tracking-widest">
            <FileText className="w-4 h-4" />
            External Data Ingestion
          </h3>
          
          <div className="border border-[#222] border-dashed p-10 flex flex-col items-center justify-center text-center bg-[#050505] hover:bg-[#080808] transition-colors cursor-pointer" onClick={() => !hasCustomData && fileInputRef.current?.click()}>
             {!hasCustomData ? (
                <>
                  <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} className="hidden" />
                  <Upload className="w-8 h-8 text-gray-600 mb-4" />
                  <h4 className="text-white font-serif text-lg mb-2">Upload CSV Dataset</h4>
                  <p className="text-xs text-gray-500 mb-6 font-light">Analysis engine accepts .csv with Date & Price columns</p>
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-950/10 px-4 py-2 border border-red-900/30 text-xs">
                      <AlertCircle className="w-3 h-3" /> {error}
                    </div>
                  )}
                </>
             ) : (
               <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-full">
                        <Check className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-white font-serif">Dataset Active</h4>
                        <p className="text-xs text-gray-500">Ready for neural processing</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDataImport(null); }} className="text-gray-500 hover:text-red-400 p-2">
                      <Trash2 className="w-5 h-5" />
                  </button>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};