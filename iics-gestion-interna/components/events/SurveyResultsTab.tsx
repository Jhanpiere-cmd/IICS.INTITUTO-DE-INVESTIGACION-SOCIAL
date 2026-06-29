import React, { useState, useEffect } from 'react';
import { 
    BarChart3, MessageSquare, Star, Users, Loader2, Download, 
    TrendingUp, Award, Clock, ArrowRight, CornerDownRight, 
    PieChart as PieIcon, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface SurveyResultsTabProps {
    eventId: string;
}

const COLORS = ['#0088FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function SurveyResultsTab({ eventId }: SurveyResultsTabProps) {
    const [loading, setLoading] = useState(true);
    const [survey, setSurvey] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [responses, setResponses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [eventId]);

    async function loadData() {
        setLoading(true);
        try {
            // 1. Obtener la encuesta
            const { data: surveyData } = await supabase
                .from('surveys')
                .select('*')
                .eq('event_id', eventId)
                .eq('type', 'event_feedback')
                .maybeSingle();

            if (!surveyData) {
                setLoading(false);
                return;
            }
            setSurvey(surveyData);

            // 2. Obtener preguntas
            const { data: questionsData } = await supabase
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyData.id)
                .order('order_index');
            setQuestions(questionsData || []);

            // 3. Obtener respuestas
            const { data: responsesData } = await supabase
                .from('survey_responses')
                .select('*')
                .eq('survey_id', surveyData.id)
                .order('submitted_at', { ascending: false });
            setResponses(responsesData || []);

            // 4. Procesar estadísticas
            if (questionsData && responsesData) {
                const computedStats = processResponses(questionsData, responsesData);
                setStats(computedStats);
            }

        } catch (e) {
            console.error('Error cargando resultados de encuesta:', e);
        } finally {
            setLoading(false);
        }
    }

    function processResponses(qs: any[], rs: any[]) {
        const results: Record<string, any> = {};

        qs.forEach(q => {
            const questionResponses = rs.map(r => r.answers?.[q.id]).filter(v => v !== undefined && v !== null);
            
            if (['select', 'radio', 'checkbox'].includes(q.type)) {
                const distribution: Record<string, number> = {};
                questionResponses.forEach(val => {
                    if (Array.isArray(val)) {
                        val.forEach(v => distribution[v] = (distribution[v] || 0) + 1);
                    } else {
                        distribution[val] = (distribution[val] || 0) + 1;
                    }
                });
                results[q.id] = {
                    type: 'chart',
                    data: Object.entries(distribution).map(([name, value]) => ({ name, value }))
                };
            } else if (['text', 'textarea'].includes(q.type)) {
                results[q.id] = {
                    type: 'list',
                    data: questionResponses.slice(0, 20) // Mostrar las 20 más recientes
                };
            } else {
                results[q.id] = {
                    type: 'raw',
                    data: questionResponses
                };
            }
        });

        return results;
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-exec-blue" size={32} />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Analizando Feedback...</span>
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <BarChart3 className="text-gray-800 mb-4" size={48} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Sin Datos de Feedback</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed max-w-xs">
                    No se ha encontrado ninguna encuesta configurada para este evento todavía.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-4 flex flex-col items-center justify-center text-center">
                    <Users className="text-exec-blue mb-2" size={18} />
                    <span className="text-[24px] font-black text-white leading-none">{responses.length}</span>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Respuestas Totales</span>
                </div>
                <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-4 flex flex-col items-center justify-center text-center">
                    <Clock className="text-emerald-500 mb-2" size={18} />
                    <span className="text-[24px] font-black text-white leading-none">
                        {responses.length > 0 ? new Date(responses[0].submitted_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '--'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Última Respuesta</span>
                </div>
                <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-4 flex flex-col items-center justify-center text-center">
                   <button 
                        onClick={loadData}
                        className="group flex flex-col items-center gap-1"
                    >
                        <RefreshCw className="text-indigo-500 mb-2 group-hover:rotate-180 transition-transform duration-500" size={18} />
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Sincronizar Datos</span>
                   </button>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 gap-6">
                {questions.map((q: any) => {
                    const qStat = stats?.[q.id];
                    if (!qStat) return null;

                    return (
                        <div key={q.id} className="bg-[#0D0D0D] border border-[#1A1A1A] overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <CornerDownRight size={12} className="text-exec-blue" />
                                    {q.question}
                                </h4>
                                <span className="text-[9px] font-bold text-gray-700 bg-white/5 px-2 py-0.5 uppercase tracking-tighter">
                                    {q.type}
                                </span>
                            </div>

                            <div className="p-6">
                                {qStat.type === 'chart' ? (
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={qStat.data} layout="vertical" margin={{ left: 40, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" horizontal={false} />
                                                <XAxis type="number" hide />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    axisLine={false} 
                                                    tickLine={false}
                                                    tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }}
                                                    width={100}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                                    itemStyle={{ color: '#0088FF', fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="value" fill="#0088FF" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : qStat.type === 'list' ? (
                                    <div className="space-y-2">
                                        {qStat.data.length > 0 ? (
                                            qStat.data.map((item: string, i: number) => (
                                                <div key={i} className="p-3 bg-[#080808] border border-[#1A1A1A] text-[11px] text-gray-400 italic font-medium leading-relaxed">
                                                    "{item}"
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-gray-700 uppercase italic">Sin comentarios registrados</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-gray-600 font-mono">
                                        {JSON.stringify(qStat.data)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Export Section */}
            <div className="pt-8 border-t border-[#1A1A1A]">
                <button 
                   onClick={() => alert('Próximamente: Exportación completa de feedback a Excel')}
                   className="flex items-center justify-center gap-2 w-full py-4 bg-[#111] border border-[#232323] text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white hover:bg-[#151515] transition-all"
                >
                    <Download size={14} />
                    Descargar Bruto de Respuestas (.XLSX)
                </button>
            </div>
        </div>
    );
}
