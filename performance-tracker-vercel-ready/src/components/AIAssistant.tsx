import React, { useMemo, useState } from 'react';
import { Sparkles, Send, Bot, User, Settings2, Loader2, Code, FileText } from 'lucide-react';
import Markdown from 'react-markdown';
import { AISettingsPanel } from './AISettingsPanel';
import { AIProviderConfig } from '../lib/ai';
import { callAI } from '../lib/ai';
import { PLANNER_PROMPT, ANALYST_PROMPT } from '../lib/aiPrompts';
import { executePlan } from '../lib/analyticsExecutor';
import { buildAnalystContext } from '../lib/analystContextBuilder';

type Message = {
  role: 'user' | 'ai';
  content: string;
  contentType?: 'markdown' | 'html';
  debug?: any;
};

function defaultPlannerConfig(): AIProviderConfig {
  return {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || ''
  };
}

function defaultAnalystConfig(): AIProviderConfig {
  return {
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || ''
  };
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error('O Planner não retornou um JSON válido.');
    }
    return JSON.parse(jsonMatch[1]);
  }
}

function extractHtml(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return '<section class="report"><p>Nenhum conteúdo foi retornado pelo analista.</p></section>';
  const codeBlockMatch = trimmed.match(/```html\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  return trimmed;
}

function sanitizeHtml(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

function ReportHtml({ html }: { html: string }) {
  const safeHtml = useMemo(() => sanitizeHtml(html), [html]);

  return (
    <div className="report-shell">
      <div className="report-paper">
        <div className="report-html" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </div>
    </div>
  );
}

export function AIAssistant({ data }: { data: any[] }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'planning' | 'executing' | 'analyzing'>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const [plannerConfig, setPlannerConfig] = useState<AIProviderConfig>(() => {
    const saved = localStorage.getItem('ai_planner_config');
    return saved ? JSON.parse(saved) : defaultPlannerConfig();
  });

  const [analystConfig, setAnalystConfig] = useState<AIProviderConfig>(() => {
    const saved = localStorage.getItem('ai_analyst_config');
    return saved ? JSON.parse(saved) : defaultAnalystConfig();
  });

  const handleSaveSettings = (pConfig: AIProviderConfig, aConfig: AIProviderConfig) => {
    setPlannerConfig(pConfig);
    setAnalystConfig(aConfig);
    localStorage.setItem('ai_planner_config', JSON.stringify(pConfig));
    localStorage.setItem('ai_analyst_config', JSON.stringify(aConfig));
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || status !== 'idle') return;

    const userMessage = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, contentType: 'markdown' }]);

    try {
      if (!plannerConfig.apiKey || !analystConfig.apiKey) {
        throw new Error('API Keys não configuradas. Clique na engrenagem para configurar.');
      }

      setStatus('planning');
      const plannerResponse = await callAI(plannerConfig, PLANNER_PROMPT, userMessage, true);
      const plan = extractJson(plannerResponse);

      setStatus('executing');
      const availableKeys = data.length > 0 ? Object.keys(data[0]) : [];
      const executionResult = executePlan(plan, data, availableKeys);

      setStatus('analyzing');
      const analystContext = buildAnalystContext({
        userMessage,
        plan,
        executionResult
      });
      const analystResponse = await callAI(analystConfig, ANALYST_PROMPT, analystContext, false);
      const analystHtml = extractHtml(analystResponse);

      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: analystHtml,
          contentType: 'html',
          debug: { plan, executionResult, analystContext: JSON.parse(analystContext) }
        }
      ]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: `**Erro:** ${error.message}`,
          contentType: 'markdown'
        }
      ]);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[720px]">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Assistente de IA (2 Agentes)
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Planner + Executor Local + Analyst em HTML
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-lg transition-colors ${showDebug ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
            title="Modo Debug"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
            title="Configurações"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <FileText className="w-12 h-12 opacity-20" />
            <p className="text-center max-w-md">
              Faça perguntas sobre a base e receba relatórios renderizados em HTML com insights, alertas e recomendações acionáveis.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`w-full ${msg.role === 'user' ? 'max-w-[75%]' : 'max-w-[92%]'}`}>
                {msg.role === 'user' ? (
                  <div className="rounded-2xl px-5 py-3.5 bg-slate-900 text-white rounded-tr-none">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {msg.contentType === 'html' ? (
                      <ReportHtml html={msg.content} />
                    ) : (
                      <div className="rounded-2xl px-5 py-4 bg-slate-100 text-slate-800 rounded-tl-none prose prose-sm prose-slate max-w-none">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                    {showDebug && msg.debug && (
                      <div className="mt-4 p-4 bg-slate-800 rounded-xl overflow-x-auto text-xs text-emerald-400 font-mono">
                        <div className="mb-2 text-slate-400 font-semibold">Debug Info:</div>
                        <details>
                          <summary className="cursor-pointer hover:text-emerald-300">Planner JSON</summary>
                          <pre className="mt-2">{JSON.stringify(msg.debug.plan, null, 2)}</pre>
                        </details>
                        <details className="mt-2">
                          <summary className="cursor-pointer hover:text-emerald-300">Executor Result</summary>
                          <pre className="mt-2">{JSON.stringify(msg.debug.executionResult, null, 2)}</pre>
                        </details>
                        <details className="mt-2">
                          <summary className="cursor-pointer hover:text-emerald-300">Analyst Context</summary>
                          <pre className="mt-2">{JSON.stringify(msg.debug.analystContext, null, 2)}</pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {status !== 'idle' && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span className="text-sm text-slate-600 font-medium">
                {status === 'planning' && 'Interpretando pergunta...'}
                {status === 'executing' && 'Tratando e agregando a base local...'}
                {status === 'analyzing' && 'Gerando relatório executivo...'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleAsk} className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pergunte algo sobre os dados..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            disabled={status !== 'idle'}
          />
          <button
            type="submit"
            disabled={!query.trim() || status !== 'idle'}
            className="absolute right-2 p-2 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {showSettings && (
        <AISettingsPanel
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          initialPlannerConfig={plannerConfig}
          initialAnalystConfig={analystConfig}
        />
      )}
    </div>
  );
}
