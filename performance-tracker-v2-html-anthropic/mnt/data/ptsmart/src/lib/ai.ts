import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export interface AIProviderConfig {
  provider: 'gemini' | 'openai';
  model: string;
  apiKey: string;
}

export async function callAI(config: AIProviderConfig, systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<string> {
  // Remove any non-ASCII characters (like zero-width spaces, emojis, etc.) that might cause header errors
  const apiKey = config.apiKey?.replace(/[^\x20-\x7E]/g, '').trim();
  const model = config.model?.replace(/[^\x20-\x7E]/g, '').trim();
  
  if (!apiKey) {
    throw new Error('A chave da API não foi configurada.');
  }

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: jsonMode ? 'application/json' : 'text/plain',
      }
    });
    return response.text || '';
  } else if (config.provider === 'openai') {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: jsonMode ? { type: 'json_object' } : { type: 'text' }
    });
    return response.choices[0].message.content || '';
  }
  throw new Error('Provedor de IA não suportado');
}
