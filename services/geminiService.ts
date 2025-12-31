import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChartDataPoint, TechnicalIndicators, WebSource, OnChainMetric, MarketDepthItem } from '../types';

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Mapping "Fancy" model names to actual working Gemini models
const MODEL_MAP: Record<string, string> = {
  'claude-3-opus-4.5': 'gemini-3-pro-preview',
  'claude-3-haiku-4.5': 'gemini-3-flash-preview',
  'claude-3-sonnet-4.5': 'gemini-3-pro-preview',
  'claude-3-sonnet-4': 'gemini-3-flash-preview',
  'chatgpt-5': 'gemini-3-pro-preview'
};

const getSystemPersona = (modelId: string) => {
  if (modelId.includes('opus') || modelId.includes('sonnet')) {
    return `You are QUANTUM INTELLIGENCE, a hyper-advanced quantitative analyst for a Tier-1 Hedge Fund. 
    
    **Core Competencies:**
    1. **Smart Money Concepts (SMC)**: Identify Order Blocks, Fair Value Gaps (FVG), and Liquidity Sweeps.
    2. **Wyckoff Logic**: Detect Accumulation/Distribution schematics.
    3. **Fractal Analysis**: Correlate multi-timeframe structures.
    
    **Tone**: Cold, Precise, Institutional. Use professional terminology (e.g., "Invalidation at 1.05", "Sell-side liquidity", "Mean reversion").`;
  }
  return `You are a visionary Macro-Strategist. Focus on global liquidity cycles, sentiment shifts, and asymmetric risk/reward setups.`;
}

const BASE_INSTRUCTION = `
Your goal is to provide institutional-grade technical analysis and trading signals.

**Analysis Protocol:**
1. **Structure First**: Define the market phase (Markup, Markdown, Consolidation).
2. **Confluence**: Identify where Indicators (RSI/MACD) align with Price Action (Support/Resistance).
3. **Risk Management**: EVERY trade setup must have a defined Stop Loss and Reward-to-Risk Ratio.

Output Format:
At the end of your response, strictly provide a JSON object for the UI:
\`\`\`json
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "signal": {
     "type": "LONG" | "SHORT" | "NEUTRAL",
     "entry": "price_range",
     "target": "price",
     "stop": "price"
  }
}
\`\`\`
`;

export const analyzeMessage = async (
  message: string, 
  imageBase64?: string,
  modelId: string = 'claude-3-opus-4.5',
  history: string[] = []
): Promise<{ text: string; chartData?: ChartDataPoint[]; webSources?: WebSource[]; sentiment?: 'bullish' | 'bearish' | 'neutral' }> => {
  try {
    const parts: any[] = [];
    
    // Add image if present
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/png',
        },
      });
    }

    // Add text prompt
    parts.push({ text: message });

    // Determine actual backing model
    const backingModel = MODEL_MAP[modelId] || 'gemini-3-flash-preview';
    const persona = getSystemPersona(modelId);

    // Configuration
    const config: any = {
      systemInstruction: `${persona}\n${BASE_INSTRUCTION}`,
      temperature: 0.3, 
    };

    if (backingModel.includes('gemini-3')) {
      config.tools = [{ googleSearch: {} }];
    }
    
    // Enable reasoning for deeper queries
    if (backingModel === 'gemini-3-pro-preview') {
       config.thinkingConfig = { thinkingBudget: 2048 };
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: backingModel,
      contents: {
        role: 'user',
        parts: parts
      },
      config: config
    });

    const fullText = response.text || "Report generation failed.";
    
    // Extract Grounding Metadata
    let webSources: WebSource[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      webSources = response.candidates[0].groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
        .map((chunk: any) => ({
          uri: chunk.web.uri,
          title: chunk.web.title
        }));
    }

    // Extract JSON data
    let chartData: ChartDataPoint[] | undefined;
    let sentiment: 'bullish' | 'bearish' | 'neutral' | undefined;

    const jsonMatch = fullText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.chartData) chartData = parsed.chartData;
        if (parsed.sentiment) sentiment = parsed.sentiment;
      } catch (e) {
        console.error("JSON Parse Error", e);
      }
    }

    const cleanText = fullText.replace(/```json\s*[\{\[][\s\S]*?[\}\]]\s*```/, '').trim();

    return {
      text: cleanText,
      chartData,
      webSources,
      sentiment
    };

  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      text: "Connection to Quantum Neural Network failed. Please verify API credentials.",
    };
  }
};

export const generateMarketSummary = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Provide a 3-sentence executive summary of the global crypto market sentiment right now. Focus on institutional flow and macro factors. Arabic language.",
            config: {
              tools: [{ googleSearch: {} }]
            }
        });
        return response.text || "Market data unavailable.";
    } catch (e) {
        return "Offline Mode.";
    }
}

export const generateTechnicalInsight = async (
  symbol: string, 
  price: number, 
  indicators: TechnicalIndicators,
  timeframe: string,
  onChain?: OnChainMetric[],
  marketDepth?: {bids: MarketDepthItem[], asks: MarketDepthItem[]}
): Promise<string> => {
  try {
    // 1. Calculate derived metrics for the AI
    const volatilityState = (indicators.bollinger.upper - indicators.bollinger.lower) / indicators.bollinger.middle;
    const isSqueeze = volatilityState < 0.05; // Tight BB
    const momentum = indicators.macd.histogram > 0 ? "Bullish Expanding" : "Bearish Expanding";
    
    // 2. Format On-Chain Context
    const onChainContext = onChain ? onChain.map(m => `- ${m.label}: ${m.value} (${m.status})`).join('\n') : "Data Unavailable";
    
    // 3. Format Order Book Context
    let depthAnalysis = "Neutral";
    if (marketDepth) {
        const totalBid = marketDepth.bids.reduce((a, b) => a + b.amount, 0);
        const totalAsk = marketDepth.asks.reduce((a, b) => a + b.amount, 0);
        depthAnalysis = totalBid > totalAsk ? `Bid Heavy (Support Strength: ${(totalBid/totalAsk).toFixed(2)}x)` : `Ask Heavy (Resistance Strength: ${(totalAsk/totalBid).toFixed(2)}x)`;
    }

    const prompt = `
      **QUANTUM ANALYSIS DIRECTIVE**
      Asset: ${symbol} | Timeframe: ${timeframe} | Price: $${price}
      
      **TECHNICAL VECTOR:**
      - RSI(14): ${indicators.rsi.toFixed(2)} (${indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutral'})
      - MACD: ${momentum} | Signal: ${indicators.macd.signal.toFixed(4)}
      - BB Width: ${volatilityState.toFixed(4)} (${isSqueeze ? 'VOLATILITY SQUEEZE DETECTED - BREAKOUT IMMINENT' : 'Standard Expansion'})
      - SMA Structure: Price is ${price > indicators.sma50 ? 'ABOVE' : 'BELOW'} SMA50.
      
      **FUNDAMENTAL & FLOW VECTOR:**
      ${onChainContext}
      - Order Book Imbalance: ${depthAnalysis}
      
      **TASK:**
      Synthesize these multi-factor inputs into a coherent "Hedge Fund Style" trade thesis.
      
      **REQUIRED SECTIONS:**
      1.  **Executive Thesis**: (Bullish/Bearish) with specific confidence rationale.
      2.  **Market Dynamics**:
          *   Is the Order Flow confirming the Technical Trend?
          *   Are we in a Liquidity Sweep or Genuine Breakout?
      3.  **Algorithmic Levels**:
          *   **Pivot**: [Price]
          *   **Liquidity Pool**: [Price]
      4.  **Strategic Execution**:
          *   **Entry Zone**: [Price Range]
          *   **Invalidation (Stop)**: [Price]
          *   **Target (TP)**: [Price] (Calculated via 2.0 Risk/Reward)

      Language: Arabic (Professional Financial Tone).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, // Enable Deep Reasoning
        temperature: 0.2 // Low randomness for analytical precision
      }
    });

    return response.text || "Forecast unavailable.";
  } catch (e) {
    console.error(e);
    return "Analysis Engine Offline.";
  }
};