import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

function cleanAscii(value: string | undefined | null) {
  return value?.replace(/[^\x20-\x7E]/g, '').trim() || '';
}

function getDefaultModel(provider: AIProvider) {
  if (provider === 'gemini') return 'gemini-3-flash-preview';
  if (provider === 'anthropic') return 'claude-3-7-sonnet-latest';
  return 'gpt-4o-mini';
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Falha ao chamar a API da Anthropic.';
    throw new Error(message);
  }

  const text = Array.isArray(payload?.content)
    ? payload.content
        .filter((item: any) => item?.type === 'text')
        .map((item: any) => item.text)
        .join('\n')
    : '';

  return text || '';
}

async function callViaProxy(config: AIProviderConfig, systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string | null> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: config.provider,
        model: cleanAscii(config.model) || getDefaultModel(config.provider),
        systemPrompt,
        userPrompt,
        jsonMode,
        apiKey: cleanAscii(config.apiKey) || undefined
      })
    });

    if (response.status === 404) return null;

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao chamar proxy /api/ai.');
    }
    return payload?.text || '';
  } catch (error: any) {
    if (String(error?.message || '').includes('Failed to fetch')) return null;
    throw error;
  }
}

export async function callAI(config: AIProviderConfig, systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<string> {
  const apiKey = cleanAscii(config.apiKey);
  const provider = config.provider;
  const model = cleanAscii(config.model) || getDefaultModel(provider);

  const proxied = await callViaProxy(config, systemPrompt, userPrompt, jsonMode);
  if (proxied !== null) return proxied;

  if (!apiKey) {
    throw new Error('A chave da API não foi configurada.');
  }

  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: jsonMode ? 'application/json' : 'text/plain',
      }
    });
    return response.text || '';
  }

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: jsonMode ? { type: 'json_object' } : { type: 'text' }
    });
    return response.choices[0].message.content || '';
  }

  if (provider === 'anthropic') {
    const anthropicSystemPrompt = jsonMode
      ? `${systemPrompt}\n\nResponda APENAS com JSON válido, sem markdown e sem comentários.`
      : systemPrompt;
    return callAnthropic(apiKey, model, anthropicSystemPrompt, userPrompt);
  }

  throw new Error('Provedor de IA não suportado');
}
