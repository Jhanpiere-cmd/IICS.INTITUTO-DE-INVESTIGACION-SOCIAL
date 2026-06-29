import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, Share2, Link as LinkIcon, RefreshCw, ArrowLeft } from 'lucide-react';
import { generateSocialMediaCopy, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { supabase } from '../../lib/supabase';
import { AIEngineSelector } from '../ai/AIEngineSelector';

interface SocialMediaCopyTabProps {
    eventId: string;
    initialCopy: string;
    eventTitle: string;
    eventType: string;
    eventDescription: string;
    eventDate: string;
    eventLocation: string;
    organizerType: 'acs' | 'colegio_sociologo_unidad' | 'revista_la_colmena';
    registrationUrl?: string;
}

export function SocialMediaCopyTab({
    eventId,
    initialCopy,
    eventTitle,
    eventType,
    eventDescription,
    eventDate,
    eventLocation,
    organizerType,
    registrationUrl
}: SocialMediaCopyTabProps) {
    const [copyText, setCopyText] = useState(initialCopy);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [extraUrls, setExtraUrls] = useState(registrationUrl || '');
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    async function handleGenerate() {
        setGenerating(true);
        try {
            const result = await generateSocialMediaCopy(
                eventTitle,
                eventType,
                eventDescription,
                eventDate,
                eventLocation,
                organizerType,
                extraUrls,
                aiConfig
            );
            if (result) {
                setCopyText(result);
                try {
                    await supabase
                        .from('events')
                        .update({ social_media_copy: result })
                        .eq('id', eventId);
                } catch (dbError) {
                    console.error('Error guardando copy en BD:', dbError);
                }
            }
        } catch (error) {
            console.error('Error generando copy:', error);
            alert('Error generando copy. Intenta nuevamente.');
        } finally {
            setGenerating(false);
        }
    }

    function handleCopy() {
        if (!copyText) return;
        navigator.clipboard.writeText(copyText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="p-1 sm:p-2 space-y-3">
            <div className="flex items-center gap-3 px-2">
                <button 
                    onClick={() => (window as any).setActiveEventSubTab?.(null)}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-exec-blue transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h3 className="text-[10px] font-black text-white tracking-[0.2em] uppercase leading-none flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-exec-blue hidden sm:block" />
                        Copy Redes Sociales (IA)
                    </h3>
                    <p className="text-[9px] text-gray-700 mt-1 font-bold uppercase tracking-widest">
                        SGR-ACS / MÓDULO DE NEUROMARKETING GPT-4
                    </p>
                </div>
            </div>

            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-none p-3 space-y-4">
                <div>
                    <label className="text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] mb-2 block pl-1">
                        Enlaces y Call to Action (Inscripción, WhatsApp, etc)
                    </label>
                    <textarea
                        value={extraUrls}
                        onChange={(e) => setExtraUrls(e.target.value)}
                        placeholder="Ej: https://unetealgrupodewhatsapp... &#10;https://zoom.us/j/12345..."
                        rows={2}
                        className="w-full bg-black border border-[#1A1A1A] text-gray-300 text-[10px] rounded-none px-3 py-2 focus:outline-none focus:border-exec-blue/50 transition-all placeholder-gray-800 resize-none"
                    />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="w-full sm:max-w-xs order-2 sm:order-1">
                        <AIEngineSelector 
                            config={aiConfig} 
                            onConfigChange={setAiConfig}
                            variant="minimal"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-4 py-1.5 bg-exec-blue hover:bg-blue-500 text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-none transition-all shadow-lg shadow-exec-blue/10 disabled:opacity-50 order-1 sm:order-2"
                    >
                        {generating ? <Loader2 size={12} className="animate-spin" /> : (copyText ? <RefreshCw size={12} /> : <Sparkles size={12} />)}
                        {generating ? 'PROCESANDO...' : (copyText ? 'REGENERAR COPY' : 'GENERAR COPY INTELIGENTE')}
                    </button>
                </div>

                <div className="relative group pt-4 border-t border-[#1F1F1F]">
                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-3 block pl-1 flex items-center justify-between">
                        <span>Resultado Generado</span>
                        {copyText && (
                            <button
                                onClick={handleCopy}
                                className="sm:hidden text-exec-blue font-bold tracking-widest uppercase flex items-center gap-1.5"
                            >
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                {copied ? 'COPIADO' : 'COPIAR'}
                            </button>
                        )}
                    </div>
                    <textarea
                        value={copyText}
                        onChange={(e) => setCopyText(e.target.value)}
                        placeholder="Aquí aparecerá tu texto persuasivo listo para Facebook e Instagram..."
                        className="w-full h-64 sm:h-96 bg-[#080808] border border-[#262626] rounded-none p-4 text-gray-300 text-sm leading-relaxed resize-none focus:outline-none focus:border-exec-blue/50 transition-colors custom-scrollbar"
                    />

                    {copyText && (
                        <button
                            onClick={handleCopy}
                            className="hidden sm:flex absolute top-10 right-4 p-2.5 bg-[#111] hover:bg-[#1A1A1A] border border-[#262626] rounded-sm text-gray-300 hover:text-white transition-colors items-center gap-2 shadow-2xl"
                        >
                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            <span className="text-[10px] font-bold uppercase tracking-widest">{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="h-10 sm:hidden"></div>
        </div>
    );
}
