import React, { useState } from 'react';
import { Settings2, Save, X } from 'lucide-react';
import { AIProvider, AIProviderConfig } from '../lib/ai';

interface AISettingsPanelProps {
  onClose: () => void;
  onSave: (plannerConfig: AIProviderConfig, analystConfig: AIProviderConfig) => void;
  initialPlannerConfig: AIProviderConfig;
  initialAnalystConfig: AIProviderConfig;
}

function getDefaultModel(provider: AIProvider, role: 'planner' | 'analyst') {
  if (provider === 'gemini') return role === 'planner' ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
  if (provider === 'anthropic') return role === 'planner' ? 'claude-3-5-haiku-latest' : 'claude-3-7-sonnet-latest';
  return role === 'planner' ? 'gpt-4o-mini' : 'gpt-4o';
}

function providerLabel(provider: AIProvider) {
  if (provider === 'anthropic') return 'Anthropic Claude';
  if (provider === 'openai') return 'OpenAI';
  return 'Google Gemini';
}

export function AISettingsPanel({ onClose, onSave, initialPlannerConfig, initialAnalystConfig }: AISettingsPanelProps) {
  const [plannerConfig, setPlannerConfig] = useState<AIProviderConfig>(initialPlannerConfig);
  const [analystConfig, setAnalystConfig] = useState<AIProviderConfig>(initialAnalystConfig);

  const handleSave = () => {
    onSave(plannerConfig, analystConfig);
    onClose();
  };

  const updatePlannerProvider = (provider: AIProvider) => {
    setPlannerConfig(prev => ({
      ...prev,
      provider,
      model: prev.model ? prev.model : getDefaultModel(provider, 'planner')
    }));
  };

  const updateAnalystProvider = (provider: AIProvider) => {
    setAnalystConfig(prev => ({
      ...prev,
      provider,
      model: prev.model ? prev.model : getDefaultModel(provider, 'analyst')
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-600" />
            Configurações dos Agentes de IA
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-md font-medium text-slate-800 border-b pb-2">Agente 1: Planner (Interpretação)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Provedor</label>
                <select
                  value={plannerConfig.provider}
                  onChange={e => updatePlannerProvider(e.target.value as AIProvider)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Modelo</label>
                <input
                  type="text"
                  value={plannerConfig.model}
                  onChange={e => setPlannerConfig({ ...plannerConfig, model: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder={getDefaultModel(plannerConfig.provider, 'planner')}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-700">API Key</label>
                <input
                  type="password"
                  value={plannerConfig.apiKey}
                  onChange={e => setPlannerConfig({ ...plannerConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder={`Insira a chave da API do provedor ${providerLabel(plannerConfig.provider)}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-medium text-slate-800 border-b pb-2">Agente 2: Analyst (Relatórios e Insights)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Provedor</label>
                <select
                  value={analystConfig.provider}
                  onChange={e => updateAnalystProvider(e.target.value as AIProvider)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Modelo</label>
                <input
                  type="text"
                  value={analystConfig.model}
                  onChange={e => setAnalystConfig({ ...analystConfig, model: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder={getDefaultModel(analystConfig.provider, 'analyst')}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-700">API Key</label>
                <input
                  type="password"
                  value={analystConfig.apiKey}
                  onChange={e => setAnalystConfig({ ...analystConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder={`Insira a chave da API do provedor ${providerLabel(analystConfig.provider)}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
