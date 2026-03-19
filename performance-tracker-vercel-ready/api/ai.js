const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai').default;

function cleanAscii(value) {
  return (value || '').replace(/[^\x20-\x7E]/g, '').trim();
}

function getEnvKey(provider) {
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (provider === 'openai') return process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
  return process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';
}

async function callAnthropic(apiKey, model, systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((payload && (payload.error && payload.error.message || payload.message)) || 'Falha ao chamar a API da Anthropic.');
  }

  const text = Array.isArray(payload && payload.content)
    ? payload.content.filter((item) => item && item.type === 'text').map((item) => item.text).join('\n')
    : '';

  return text || '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const provider = body.provider;
    const model = cleanAscii(body.model);
    const systemPrompt = body.systemPrompt || '';
    const userPrompt = body.userPrompt || '';
    const jsonMode = !!body.jsonMode;
    const apiKey = cleanAscii(body.apiKey) || cleanAscii(getEnvKey(provider));

    if (!provider || !model || !systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
    }
    if (!apiKey) {
      return res.status(400).json({ error: 'API key não configurada no Vercel nem enviada pelo cliente.' });
    }

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: jsonMode ? 'application/json' : 'text/plain'
        }
      });
      return res.status(200).json({ text: response.text || '' });
    }

    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: jsonMode ? { type: 'json_object' } : { type: 'text' }
      });
      return res.status(200).json({ text: (response.choices[0] && response.choices[0].message && response.choices[0].message.content) || '' });
    }

    if (provider === 'anthropic') {
      const anthropicSystemPrompt = jsonMode
        ? systemPrompt + '\n\nResponda APENAS com JSON válido, sem markdown e sem comentários.'
        : systemPrompt;
      const text = await callAnthropic(apiKey, model, anthropicSystemPrompt, userPrompt);
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: 'Provedor não suportado.' });
  } catch (error) {
    return res.status(500).json({ error: error && error.message || 'Erro interno ao chamar provedor de IA.' });
  }
};
