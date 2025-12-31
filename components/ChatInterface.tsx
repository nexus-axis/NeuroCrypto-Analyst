
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Send, Cpu, Loader2, Brain, Command, Sparkles, User, FileText, ArrowRight, Bot } from 'lucide-react';
import { ChatMessage, ChartDataPoint, AVAILABLE_MODELS } from '../types';
import { analyzeMessage } from '../services/geminiService';
import { ChartVis } from './ChartVis';
import { FileUpload } from './FileUpload';
import ReactMarkdown from 'react-markdown';
import { LanguageContext } from '../App';

interface ChatInterfaceProps {
  activeModelId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeModelId }) => {
  const { lang } = useContext(LanguageContext);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: lang === 'ar' ? "أهلاً. أنا نظام كوانتوم الاستراتيجي. \n\nيمكنك سؤالي عن تحليل هيكلية السوق، التوقعات السعرية، أو رفع شارت للتحليل الفوري." : "Greetings. I am Quantum Strategic Intelligence. \n\nInquire about market structure, price forecasting, or upload charts for instant analysis.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{file: File, base64: string} | null>(null);
  const [loadingText, setLoadingText] = useState("Initializing Analysis...");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeModel = AVAILABLE_MODELS.find(m => m.id === activeModelId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Dynamic Loading Text Effect
  useEffect(() => {
    if (!isAnalyzing) return;
    
    const texts = [
      "Accessing Quantum Neural Network...",
      "Parsing Market Geometry & Structure...",
      "Identifying Institutional Liquidity Zones...",
      "Calculating Probability Vectors...",
      "Synthesizing Strategic Alpha..."
    ];
    
    let i = 0;
    setLoadingText(texts[0]);
    
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isAnalyzing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage?.base64,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentImage = selectedImage; 
    setSelectedImage(null); 
    setIsAnalyzing(true);

    try {
      const result = await analyzeMessage(userMsg.content, currentImage?.base64, activeModelId);
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.text,
        chartData: result.chartData,
        webSources: result.webSources,
        sentiment: result.sentiment,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getModelIcon = () => {
    if (activeModelId.includes('opus')) return <Brain className="w-5 h-5 text-[#D4AF37]" />;
    if (activeModelId.includes('chatgpt')) return <Sparkles className="w-5 h-5 text-[#D4AF37]" />;
    return <Bot className="w-5 h-5 text-[#D4AF37]" />;
  };

  return (
    <div className="flex flex-col h-full elegant-card relative">
      
      {/* Header Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-[#333] px-4 py-1 rounded-full shadow-xl flex items-center gap-2 z-10">
         {getModelIcon()}
         <span className="text-[10px] text-gray-400 uppercase tracking-widest">{activeModel?.name} Active</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-6 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-lg ${
              msg.role === 'assistant' 
              ? 'bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-[#D4AF37]/30' 
              : 'bg-[#050505] border-[#333]'
            }`}>
              {msg.role === 'assistant' ? getModelIcon() : <User className="w-4 h-4 text-gray-500" />}
            </div>

            {/* Content */}
            <div className={`flex flex-col gap-3 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
              
              {msg.role === 'user' && msg.image && (
                 <div className="rounded border border-[#333] max-w-xs shadow-xl overflow-hidden">
                   <img src={msg.image} alt="Upload" className="w-full h-auto opacity-80 hover:opacity-100 transition-opacity" />
                 </div>
              )}

              {/* Text Bubble */}
              <div className={`px-8 py-6 text-sm leading-7 font-light tracking-wide shadow-lg rounded-2xl ${
                msg.role === 'assistant' 
                  ? 'bg-[#0a0a0a] text-gray-200 border border-[#222] rounded-tl-none' 
                  : 'bg-[#1a1a1a] text-white border border-[#333] rounded-tr-none'
              }`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown 
                    components={{
                      p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pr-4 mb-4 marker:text-[#D4AF37]" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-[#D4AF37]" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-xl font-serif text-white mb-4 border-b border-[#333] pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-serif text-white mb-3 mt-4" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2 mt-4" {...props} />,
                      code: ({node, ...props}) => <code className="bg-[#000] px-2 py-1 text-xs font-mono text-gray-400 border border-[#222]" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>

              {/* Chart */}
              {msg.role === 'assistant' && msg.chartData && (
                <div className="w-full mt-4 border border-[#222] bg-[#050505] p-1 rounded-lg">
                  <ChartVis data={msg.chartData} color="#D4AF37" />
                </div>
              )}
            </div>
          </div>
        ))}
        {isAnalyzing && (
          <div className="flex justify-center py-10 fade-in">
             <div className="flex flex-col items-center gap-4">
                <div className="relative">
                   {/* Outer Ring */}
                   <div className="w-12 h-12 border-2 border-[#D4AF37]/10 border-t-[#D4AF37] rounded-full animate-spin duration-[1.5s]"></div>
                   
                   {/* Inner Ring (Reverse) */}
                   <div className="absolute inset-0 m-auto w-8 h-8 border-2 border-[#D4AF37]/10 border-b-[#D4AF37] rounded-full animate-spin duration-[2s] direction-reverse" style={{animationDirection: 'reverse'}}></div>

                   {/* Core Pulse */}
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_15px_#D4AF37]"></div>
                   </div>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#D4AF37] uppercase tracking-[0.2em] font-mono animate-pulse">
                    {loadingText}
                  </span>
                  <div className="flex gap-1 h-1 mt-1">
                      <div className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce"></div>
                  </div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#0a0a0a] border-t border-[#222] z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          
          {selectedImage && (
             <div className="flex px-2 animate-in slide-in-from-bottom-2">
                <FileUpload 
                  onFileSelect={() => {}} 
                  selectedFile={selectedImage.file} 
                  onClear={() => setSelectedImage(null)} 
                />
             </div>
          )}

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={lang === 'ar' ? "اطرح سؤالاً استراتيجياً..." : "Submit strategic query..."}
                className="w-full bg-[#050505] border border-[#222] rounded-none px-6 py-4 text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-[#D4AF37] transition-all pl-14 font-serif text-sm"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-[#D4AF37] transition-colors cursor-pointer">
                 <FileUpload 
                    onFileSelect={(base64, file) => setSelectedImage({base64, file})}
                    selectedFile={null} 
                    onClear={() => {}}
                  />
              </div>
            </div>
            
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !selectedImage) || isAnalyzing}
              className="bg-[#D4AF37] hover:bg-[#c4a02e] text-black px-8 py-4 font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <span>Analyze</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
