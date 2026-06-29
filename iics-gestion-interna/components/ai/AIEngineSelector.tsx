import React, { useState } from 'react';
import { AIConfig, AIProvider } from '../../lib/ai';

interface AIEngineSelectorProps {
    config: AIConfig;
    onConfigChange: (config: AIConfig) => void;
    className?: string;
}

const PROVIDERS: { id: AIProvider; name: string; icon: string; color: string; models: string[] }[] = [
    { 
        id: 'mercury', 
        name: 'Mercury AI', 
        icon: 'speed', 
        color: 'text-exec-pink',
        models: ['mercury-2']
    },
    { 
        id: 'gemini', 
        name: 'Gemini Crystal', 
        icon: 'diamond', 
        color: 'text-exec-purple',
        models: ['gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05']
    },
    { 
        id: 'openrouter', 
        name: 'Llama Scout', 
        icon: 'hub', 
        color: 'text-exec-blue',
        models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-001']
    },
];

export const AIEngineSelector: React.FC<AIEngineSelectorProps> = ({ config, onConfigChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);

    const currentProvider = PROVIDERS.find(p => p.id === config.provider) || PROVIDERS[0];

    const handleSelect = (providerId: AIProvider, model?: string) => {
        onConfigChange({ provider: providerId, model });
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-[#0A0A0A] border border-[#262626] rounded-none p-3 cursor-pointer hover:border-white/20 transition-all group"
            >
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Motor de Análisis</p>
                    <span className={`material-symbols-outlined text-[10px] text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[14px] ${currentProvider.color}`}>
                        {currentProvider.icon}
                    </span>
                    <span className="text-[9px] text-white font-bold uppercase tracking-tighter">
                        {currentProvider.name} {config.model ? `(${config.model.split('/').pop()})` : ''}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-none bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] ml-auto"></span>
                </div>
            </div>

            {isOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-[#0D0D0D] border border-[#262626] rounded-none shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-2 border-b border-[#262626] bg-[#0A0A0A]">
                        <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest text-center">Seleccionar Motor IA</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {PROVIDERS.map((provider) => (
                            <div key={provider.id}>
                                <button
                                    onClick={() => handleSelect(provider.id, provider.models[0])}
                                    className={`w-full flex items-center gap-3 p-3 hover:bg-[#161616] transition-all text-left border-b border-[#1a1a1a] last:border-0 ${config.provider === provider.id ? 'bg-[#121212]' : ''}`}
                                >
                                    <span className={`material-symbols-outlined text-base ${provider.color}`}>
                                        {provider.icon}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-bold text-white uppercase tracking-tighter">{provider.name}</p>
                                        <p className="text-[7px] text-gray-500 uppercase tracking-widest">{provider.id === 'openrouter' ? 'Alta velocidad' : provider.id === 'gemini' ? 'Máxima precisión' : 'Optimizado'}</p>
                                    </div>
                                    {config.provider === provider.id && (
                                        <span className="material-symbols-outlined text-[12px] text-exec-blue">check</span>
                                    )}
                                </button>
                                {config.provider === provider.id && provider.models.length > 1 && (
                                    <div className="bg-[#050505] p-1 grid grid-cols-1 gap-1">
                                        {provider.models.map(model => (
                                            <button
                                                key={model}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(provider.id, model);
                                                }}
                                                className={`text-[7px] py-1.5 px-3 uppercase tracking-widest text-left rounded-none transition-all ${config.model === model ? 'text-white bg-[#1a1a1a]' : 'text-gray-500 hover:text-white hover:bg-[#111]'}`}
                                            >
                                                {model.split('/').pop()}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
