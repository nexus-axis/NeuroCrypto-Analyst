
import React, { useState, useEffect, createContext, useContext } from 'react';
import { LayoutDashboard, MessageSquareCode, Settings, LineChart, AlertTriangle, Globe, Menu, Shield, FileText } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { MarketTicker } from './components/MarketTicker';
import { SettingsView } from './components/SettingsView';
import { TechnicalDashboard } from './components/TechnicalDashboard';
import { generateMarketSummary } from './services/geminiService';
import { AppView, AVAILABLE_MODELS, ChartDataPoint, Language } from './types';

// Translation Dictionary
const TRANSLATIONS = {
  [Language.AR]: {
    nav_dashboard: "المساعد الاستراتيجي",
    nav_market: "التحليل الفني",
    nav_reports: "التقارير والإشارات",
    nav_settings: "الإعدادات",
    status_online: "متصل",
    app_title: "Quantum Analytics",
    footer_rights: "كوانتوم للتحليل المتقدم © 2024",
    error_config: "خطأ في التكوين",
    error_desc: "متغير البيئة API_KEY مفقود."
  },
  [Language.EN]: {
    nav_dashboard: "Strategic AI",
    nav_market: "Technical Analysis",
    nav_reports: "Signals & Reports",
    nav_settings: "Configuration",
    status_online: "SYSTEM ACTIVE",
    app_title: "Quantum Analytics",
    footer_rights: "Quantum Advanced Analytics © 2024",
    error_config: "Configuration Error",
    error_desc: "API_KEY environment variable missing."
  },
  [Language.RU]: {
    nav_dashboard: "ИИ Стратег",
    nav_market: "Теханализ",
    nav_reports: "Сигналы",
    nav_settings: "Настройки",
    status_online: "ОНЛАЙН",
    app_title: "Квантум Аналитика",
    footer_rights: "Quantum Analytics © 2024",
    error_config: "Ошибка конфигурации",
    error_desc: "Отсутствует переменная API_KEY."
  }
};

export const LanguageContext = createContext<{ lang: Language, t: any, setLang: (l: Language) => void }>({
  lang: Language.AR,
  t: TRANSLATIONS[Language.AR],
  setLang: () => {}
});

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.MARKET);
  const [marketSummary, setMarketSummary] = useState<string>("");
  const [activeModelId, setActiveModelId] = useState<string>(AVAILABLE_MODELS[0].id);
  const [customData, setCustomData] = useState<ChartDataPoint[] | null>(null);
  const [language, setLanguage] = useState<Language>(Language.AR);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    generateMarketSummary().then(setMarketSummary);
  }, []);

  useEffect(() => {
    document.dir = language === Language.AR ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  if (!process.env.API_KEY) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111] border border-[#222] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
          <h1 className="text-2xl font-serif text-white mb-2">{t.error_config}</h1>
          <p className="text-gray-500 font-light">{t.error_desc}</p>
        </div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang: language, t, setLang: setLanguage }}>
      <div className="flex h-screen overflow-hidden text-[#EAEAEA] font-sans selection:bg-[#D4AF37]/30 selection:text-white">
        
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-[#0a0a0a] border-r border-[#222] flex flex-col transition-all duration-300 z-30`}>
          <div className="h-20 flex items-center justify-center border-b border-[#222]">
             <div className="flex items-center gap-4">
               <div className="w-8 h-8 border border-[#D4AF37] flex items-center justify-center rotate-45">
                 <div className="w-4 h-4 bg-[#D4AF37] -rotate-45"></div>
               </div>
               {sidebarOpen && (
                 <div>
                   <h1 className="font-serif font-bold text-xl leading-none text-white tracking-wide">QUANTUM</h1>
                   <span className="text-[9px] text-[#D4AF37] tracking-[0.3em] uppercase block mt-1">Analytics</span>
                 </div>
               )}
             </div>
          </div>

          <nav className="flex-1 py-8 px-4 space-y-4">
            {[
              { id: AppView.MARKET, icon: LineChart, label: t.nav_market },
              { id: AppView.REPORTS, icon: FileText, label: t.nav_reports },
              { id: AppView.DASHBOARD, icon: MessageSquareCode, label: t.nav_dashboard },
              { id: AppView.SETTINGS, icon: Settings, label: t.nav_settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-5 p-4 transition-all duration-300 w-full group ${
                  activeView === item.id
                    ? 'bg-[#111] text-[#D4AF37] border-l-2 border-[#D4AF37]'
                    : 'text-gray-500 hover:text-white border-l-2 border-transparent hover:bg-[#111]'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-[#D4AF37]' : 'text-gray-600 group-hover:text-gray-300'}`} />
                {sidebarOpen && <span className="font-light tracking-wide text-sm uppercase">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-[#222]">
            <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
               {sidebarOpen && (
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] text-gray-500 uppercase tracking-widest">{t.status_online}</span>
                 </div>
               )}
               <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-white transition-colors">
                 <Menu className="w-5 h-5" />
               </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#030303] relative">
          
          {/* Top Header */}
          <header className="h-14 bg-[#0a0a0a] border-b border-[#222] flex items-center justify-between px-8 z-20">
             <div className="flex items-center gap-8 opacity-60 hover:opacity-100 transition-opacity">
                <MarketTicker simple={true} />
             </div>
             
             <div className="flex items-center gap-6">
                <div className="relative group">
                  <button className="flex items-center gap-2 text-gray-500 hover:text-[#D4AF37] transition-colors">
                    <Globe className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">{language}</span>
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-32 bg-[#111] border border-[#333] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {Object.values(Language).map((l) => (
                      <button 
                        key={l}
                        onClick={() => setLanguage(l)}
                        className={`w-full text-left px-4 py-3 text-xs hover:bg-[#222] ${language === l ? 'text-[#D4AF37]' : 'text-gray-400'}`}
                      >
                        {l === Language.AR ? 'العربية' : l === Language.EN ? 'English' : 'Русский'}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
          </header>

          {/* View Content */}
          <main className="flex-1 overflow-hidden relative">
            
            {activeView === AppView.DASHBOARD && (
              <div className="h-full flex flex-col max-w-6xl mx-auto p-6">
                 <ChatInterface activeModelId={activeModelId} />
              </div>
            )}

            {activeView === AppView.MARKET && (
              <TechnicalDashboard customData={customData} />
            )}
            
            {activeView === AppView.REPORTS && (
              <TechnicalDashboard customData={customData} showBotsOnly={true} />
            )}

            {activeView === AppView.SETTINGS && (
              <SettingsView 
                activeModel={activeModelId} 
                onModelSelect={setActiveModelId}
                onDataImport={setCustomData}
                hasCustomData={!!customData}
              />
            )}

          </main>
          
          {/* Footer */}
          <footer className="h-10 bg-[#0a0a0a] border-t border-[#222] flex items-center justify-between px-8 text-[10px] text-gray-600 select-none uppercase tracking-widest">
             <span>{t.footer_rights}</span>
             <div className="flex gap-6">
               <span>Ping: 18ms</span>
               <span>Node: TOKYO-4</span>
               <span>v4.2.0-Ent</span>
             </div>
          </footer>
        </div>
      </div>
    </LanguageContext.Provider>
  );
};

export default App;
