import React, { useState } from 'react';
import { Settings2, Save, X } from 'lucide-react';
import { AIProviderConfig } from '../lib/ai';

interface AISettingsPanelProps {
  onClose: () => void;
  onSave: (plannerConfig: AIProviderConfig, analystConfig: AIProviderConfig) => void;
  initialPlannerConfig: AIProviderConfig;
  initialAnalystConfig: AIProviderConfig;
}

export function AISettingsPanel({ onClose, onSave, initialPlannerConfig, initialAnalystConfig }: AISettingsPanelProps) {
  const [plannerConfig, setPlannerConfig] = useState<AIProviderConfig>(initialPlannerConfig);
  const [analystConfig, setAnalystConfig] = useState<AIProviderConfig>(initialAnalystConfig);

  const handleSave = () => {
    onSave(plannerConfig, analystConfig);
    onClose();
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
          {/* Planner Config */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-slate-800 border-b pb-2">Agente 1: Planner (Interpretação)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Provedor</label>
                <select 
                  value={plannerConfig.provider}
                  onChange={e => setPlannerConfig({...plannerConfig, provider: e.target.value as 'gemini' | 'openai'})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Modelo</label>
                <input 
                  type="text" 
                  value={plannerConfig.model}
                  onChange={e => setPlannerConfig({...plannerConfig, model: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder={plannerConfig.provider === 'gemini' ? 'gemini-3-flash-preview' : 'gpt-4o-mini'}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-700">API Key</label>
                <input 
                  type="password" 
                  value={plannerConfig.apiKey}
                  onChange={e => setPlannerConfig({...plannerConfig, apiKey: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder="Insira a chave da API"
                />
              </div>
            </div>
          </div>

          {/* Analyst Config */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-slate-800 border-b pb-2">Agente 2: Analyst (Respostas e Insights)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Provedor</label>
                <select 
                  value={analystConfig.provider}
                  onChange={e => setAnalystConfig({...analystConfig, provider: e.target.value as 'gemini' | 'openai'})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Modelo</label>
                <input 
                  type="text" 
                  value={analystConfig.model}
                  onChange={e => setAnalystConfig({...analystConfig, model: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder={analystConfig.provider === 'gemini' ? 'gemini-3-pro-preview' : 'gpt-4o'}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-700">API Key</label>
                <input 
                  type="password" 
                  value={analystConfig.apiKey}
                  onChange={e => setAnalystConfig({...analystConfig, apiKey: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder="Insira a chave da API"
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
