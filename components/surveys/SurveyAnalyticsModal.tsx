import React, { useState, useEffect } from 'react';
import { 
    BarChart3, MessageSquare, Star, Users, Loader2, Download, 
    TrendingUp, Award, Clock, ArrowRight, CornerDownRight, 
    PieChart as PieIcon, RefreshCw, X, ArrowUpRight, Sparkles, PenLine, CheckCircle2, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { generateProfessionalDocx } from '../../lib/docxGenerator';
import { generateMercurySurveySummary } from '../../lib/mercury';
import ReactMarkdown from 'react-markdown';

interface SurveyAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    surveyId: string;
}

const COLORS = [
    '#0088FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
    '#14B8A6', '#F97316', '#06B6D4', '#84CC16', '#3B82F6', '#6366F1',
    '#D946EF', '#F43F5E', '#1D4ED8', '#047857', '#B45309', '#BE123C',
    '#4338CA', '#2DD4BF', '#FB923C', '#22D3EE', '#A3E635', '#60A5FA',
    '#818CF8', '#C084FC', '#FB7185', '#38BDF8', '#34D399', '#FBBF24'
];

export function SurveyAnalyticsModal({ isOpen, onClose, surveyId }: SurveyAnalyticsModalProps) {
    const [loading, setLoading] = useState(true);
    const [survey, setSurvey] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [responses, setResponses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);

    // Export & AI States
    const [isExporting, setIsExporting] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [aiSummary, setAiSummary] = useState<any>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<'general' | 'individual'>('general');
    const [selectedResponse, setSelectedResponse] = useState<any>(null);

    useEffect(() => {
        if (isOpen && surveyId) {
            loadData();
        }
    }, [isOpen, surveyId]);

    async function loadData() {
        setLoading(true);
        try {
            // 1. Obtener la encuesta
            const { data: surveyData, error: sErr } = await supabase
                .from('surveys')
                .select('*, event:events(title)')
                .eq('id', surveyId)
                .maybeSingle();

            if (sErr || !surveyData) {
                setLoading(false);
                return;
            }
            setSurvey(surveyData);

            // Cargar resumen de IA si existe
            if (surveyData.ai_summary) {
                setAiSummary(surveyData.ai_summary);
                setShowAIPanel(true);
            }

            // 2. Obtener preguntas
            const { data: questionsData, error: qErr } = await supabase
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyData.id)
                .order('order_index');
            
            if (qErr) throw qErr;
            setQuestions(questionsData || []);

            // 3. Obtener respuestas
            const { data: responsesData, error: rErr } = await supabase
                .from('survey_responses')
                .select('*')
                .eq('survey_id', surveyData.id)
                .order('submitted_at', { ascending: false });
                
            if (rErr) throw rErr;
            setResponses(responsesData || []);
            
            if (responsesData && responsesData.length > 0) {
                setSelectedResponse(responsesData[0]);
            }

            // 4. Procesar estadísticas
            if (questionsData && responsesData) {
                const computedStats = processResponses(questionsData, responsesData);
                setStats(computedStats);
            }

        } catch (e) {
            console.error('Error cargando analíticas de encuesta:', e);
        } finally {
            setLoading(false);
        }
    }

    function processResponses(qs: any[], rs: any[]) {
        const results: Record<string, any> = {};

        qs.forEach(q => {
            const questionResponses = rs.map(r => r.answers?.[q.id]).filter(v => v !== undefined && v !== null);
            
            if (['select', 'radio', 'checkbox'].includes(q.type.toLowerCase())) {
                const distribution: Record<string, number> = {};
                questionResponses.forEach(val => {
                    if (Array.isArray(val)) {
                        val.forEach(v => distribution[v] = (distribution[v] || 0) + 1);
                    } else {
                        distribution[val] = (distribution[val] || 0) + 1;
                    }
                });
                const isPie = ['select', 'radio'].includes(q.type.toLowerCase());
                const total = Object.values(distribution).reduce((a, b) => Number(a) + Number(b), 0);
                results[q.id] = {
                    type: isPie ? 'pie' : 'chart',
                    total: total,
                    data: Object.entries(distribution).map(([name, val]) => {
                        const numVal = Number(val);
                        const pctStr = total > 0 ? ((numVal / total) * 100).toFixed(0) + '%' : '0%';
                        return { 
                            name, 
                            value: numVal,
                            percentageText: pctStr
                        };
                    })
                };
            } else if (['text', 'textarea', 'email', 'tel'].includes(q.type.toLowerCase())) {
                results[q.id] = {
                    type: 'list',
                    data: questionResponses.slice(0, 20) // Mostrar las 20 más recientes
                };
            } else if (q.type.toLowerCase() === 'number') {
                 // Simplificar números mostrando el promedio o listado si son pocos
                 const nums = questionResponses.map(n => Number(n)).filter(n => !isNaN(n));
                 const avg = nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0;
                 results[q.id] = {
                     type: 'number',
                     avg: avg,
                     data: questionResponses.slice(0, 20)
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

    const getSentimentAnalysis = () => {
        let positive = 0;
        let negative = 0;
        let neutral = 0;
        
        const posWords = ['excelente', 'bueno', 'bien', 'satisfecho', 'gracias', 'feliz', 'contento', 'me gusta', 'buena', 'great', 'good', 'excelencia', 'lo mejor', 'espectacular', 'genial', 'correcto', 'aprobado'];
        const negWords = ['mal', 'malo', 'pésimo', 'error', 'falla', 'deficiente', 'lento', 'retraso', 'problema', 'queja', 'mucha', 'poca', 'incómodo', 'descontento', 'decepcionado', 'incorrecto'];
        
        responses.forEach(r => {
            let textCombined = '';
            if (r.answers) {
                Object.values(r.answers).forEach((val: any) => {
                    if (typeof val === 'string') {
                        textCombined += ' ' + val.toLowerCase();
                    } else if (Array.isArray(val)) {
                        textCombined += ' ' + val.join(' ').toLowerCase();
                    }
                });
            }
            
            let posCount = 0;
            let negCount = 0;
            posWords.forEach(w => {
                if (textCombined.includes(w)) posCount++;
            });
            negWords.forEach(w => {
                if (textCombined.includes(w)) negCount++;
            });
            
            if (posCount > negCount) {
                positive++;
            } else if (negCount > posCount) {
                negative++;
            } else {
                neutral++;
            }
        });
        
        const total = positive + negative + neutral;
        if (total === 0) return { positive: 0, negative: 0, neutral: 0, positivePct: 0, negativePct: 0, neutralPct: 100 };
        return {
            positive,
            negative,
            neutral,
            positivePct: Math.round((positive / total) * 100),
            negativePct: Math.round((negative / total) * 100),
            neutralPct: Math.round((neutral / total) * 100),
        };
    };

    const sentiment = getSentimentAnalysis();

    const exportToPDF = async () => {
        setIsExporting(true);
        try {
            const element = document.getElementById('survey-analytics-content');
            if (!element) return;

            // Expandir clase temporal para capturar todo el scroll
            const originalOverflow = element.style.overflow;
            const originalHeight = element.style.height;
            element.style.overflow = 'visible';
            element.style.height = 'max-content';

            const canvas = await html2canvas(element, { backgroundColor: '#050505', scale: 2, scrollY: 0 });
            
            // Restaurar a la normalidad
            element.style.overflow = originalOverflow;
            element.style.height = originalHeight;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.setFillColor(5, 5, 5);
            pdf.rect(0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), 'F');
            
            // Si el contenido excede 1 pAgina, iteramos las pAginas
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.setFillColor(5, 5, 5);
                pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Analytics_${survey?.title || 'Survey'}.pdf`);
        } catch (e) {
            console.error(e);
            alert("Error al generar PDF");
        }
        setIsExporting(false);
    };

    const exportToExcel = () => {
        if (!survey || responses.length === 0) return;
        setIsExporting(true);
        try {
            const rows = responses.map(r => {
                const row: any = { Fecha: new Date(r.submitted_at).toLocaleString('es-ES') };
                questions.forEach(q => {
                    const answer = r.answers?.[q.id];
                    row[q.question] = Array.isArray(answer) ? answer.join(', ') : answer || '';
                });
                return row;
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Respuestas RAW");
            XLSX.writeFile(wb, `Respuestas_${survey.title}.xlsx`);
        } catch (e) {
            console.error(e);
        }
        setIsExporting(false);
    };

    const exportToWord = async () => {
        if (!survey || !stats) return;
        setIsExporting(true);
        try {
            const sections: any[] = [
                { text: `ANÁLISIS ESTADÍSTICO DE ENCUESTA`, heading: 'Reporte Oficial' },
                { text: `Encuesta: ${survey.title}\nTotal Respuestas: ${responses.length}` },
                { type: 'divider' }
            ];

            // Inyectar Inteligencia IA si se generO
            if (aiSummary) {
                sections.push({ text: 'ANÁLISIS SMART IA (MERCURY)', heading: 'Pregunta' });
                sections.push({ text: 'Resumen Ejecutivo', styles: { bold: true } });
                sections.push({ text: aiSummary.executive_summary });
                sections.push({ text: 'Dinámica de Población', styles: { bold: true } });
                sections.push({ text: aiSummary.audience_analysis });
                
                if (aiSummary.insights && aiSummary.insights.length > 0) {
                    sections.push({ text: 'Key Insights', styles: { bold: true } });
                    sections.push({ bullets: aiSummary.insights });
                }
                if (aiSummary.proposals && aiSummary.proposals.length > 0) {
                    sections.push({ text: 'Sugerencias Tácticas', styles: { bold: true } });
                    sections.push({ bullets: aiSummary.proposals.map((p: string, i: number) => `${i + 1}. ${p}`) });
                }
                sections.push({ type: 'divider' });
            }

            questions.forEach((q, idx) => {
                sections.push({ text: `${idx + 1}. ${q.question}`, heading: 'Pregunta' });
                
                const qStat = stats[q.id];
                if (qStat && (qStat.type === 'pie' || qStat.type === 'chart')) {
                    const rows = [
                        [{ text: 'Opción', styles: { bold: true } }, { text: 'Frecuencia', styles: { bold: true } }, { text: 'Porcentaje', styles: { bold: true } }],
                        ...qStat.data.map((d: any) => [d.name, d.value.toString(), d.percentageText])
                    ];
                    sections.push({ type: 'table', rows });
                } else if (qStat && qStat.type === 'number') {
                     sections.push({ text: `Promedio General: ${qStat.avg}` });
                } else if (qStat && qStat.data) {
                     sections.push({ bullets: qStat.data.slice(0, 10).map(String) });
                }
                sections.push({ type: 'divider' });
            });

            await generateProfessionalDocx({
                title: `Reporte de Encuesta`,
                sections: sections
            });
        } catch (e) {
            console.error(e);
        }
        setIsExporting(false);
    };

    const generateAI = async (force: boolean = false) => {
        if (!stats) return;
        setShowAIPanel(true);
        if (aiSummary && !force) return; // Ya generado, a menos que se fuerce
        
        setIsGeneratingAI(true);
        const dataForAI = questions.map(q => ({
            pregunta: q.question,
            estadisticas: stats[q.id]?.data || stats[q.id]?.avg || null
        }));

        try {
            const res = await generateMercurySurveySummary(survey?.title || "Encuesta", dataForAI);
            if (res && res.executive_summary) {
                 setAiSummary(res);
                 // Guardar en la base de datos para persistencia
                 await supabase.from('surveys').update({ ai_summary: res }).eq('id', surveyId);
            } else {
                 throw new Error("Respuesta inválida estructurada");
            }
        } catch (e) {
            console.error("AI Error:", e);
            setAiSummary({
                executive_summary: "Hubo un error de conexión al sintetizar la data estructural con la IA de Mercury. Comuníquese con soporte de red.",
                audience_analysis: "No disponible",
                insights: [],
                proposals: []
            });
        }
        setIsGeneratingAI(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex justify-end" onClick={onClose}>
            <div 
                className="w-full bg-[#050505] border-l border-[#1F1F1F] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Modal */}
                <div className="flex items-center justify-between p-6 border-b border-[#1F1F1F] bg-black">
                    <div className="flex items-center gap-4">
                        <div className="p-2 border border-exec-border bg-white/5">
                            <BarChart3 className="text-exec-blue" size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider leading-none">Intelligence Dashboard</h2>
                            {survey && (
                                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1 line-clamp-1">
                                    {survey.title}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-[#0A0A0A] border border-[#1A1A1A] rounded overflow-hidden shadow-lg p-0.5">
                            <button onClick={exportToPDF} disabled={isExporting} className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-l transition-colors uppercase tracking-[0.2em] flex items-center gap-2 border-r border-[#1A1A1A]">
                                {isExporting ? <Loader2 size={13} className="animate-spin text-exec-blue"/> : <Download size={13} />}
                                PDF
                            </button>
                            <button onClick={exportToExcel} disabled={isExporting} className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors uppercase tracking-[0.2em] flex items-center gap-2 border-r border-[#1A1A1A]">
                                EXCEL
                            </button>
                            <button onClick={exportToWord} disabled={isExporting} className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors uppercase tracking-[0.2em] flex items-center gap-2 border-r border-[#1A1A1A]">
                                WORD
                            </button>
                            <button onClick={generateAI} className="px-4 py-2 text-[10px] font-black text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-r transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                                <Sparkles size={13} />
                                INTELIGENCIA
                            </button>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-white bg-transparent hover:bg-white/10 transition-colors rounded"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs Selector */}
                <div className="bg-[#0A0A0A] border-b border-[#1A1A1A] px-6 py-0 flex items-center gap-6">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'general' ? 'text-exec-blue' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Analítica General
                        {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-exec-blue shadow-[0_0_10px_rgba(0,136,255,0.5)]"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('individual')}
                        className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'individual' ? 'text-exec-blue' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Resultados Individuales
                        {activeTab === 'individual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-exec-blue shadow-[0_0_10px_rgba(0,136,255,0.5)]"></div>}
                    </button>
                </div>


                {/* Contenido Renderizable (ID p/ el Canvas) */}
                <div id="survey-analytics-content" className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="animate-spin text-exec-blue" size={40} />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Procesando Algoritmos Analíticos...</span>
                        </div>
                    ) : !survey ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center px-4 border border-dashed border-[#1A1A1A]">
                            <BarChart3 className="text-gray-800 mb-4" size={48} />
                            <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-1">Error de Carga</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                                No se pudo recuperar la telemetría de esta encuesta.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {activeTab === 'general' ? (
                                <>
                                    {/* KPI Board */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                <div className="bg-[#0D0D0D] border border-exec-border p-5 flex flex-col items-center justify-center text-center group hover:border-exec-blue transition-colors">
                                    <Users className="text-exec-blue mb-2" size={24} />
                                    <span className="text-[32px] font-black text-white leading-none font-mono">{responses.length}</span>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-2 group-hover:text-exec-blue transition-colors">Respuestas Inyectadas</span>
                                </div>
                                <div className="bg-[#0D0D0D] border border-exec-border p-5 flex flex-col items-center justify-center text-center group hover:border-emerald-500 transition-colors">
                                    <Clock className="text-emerald-500 mb-2" size={24} />
                                    <span className="text-[20px] font-black text-white leading-none font-mono flex-1 flex items-center">
                                        {responses.length > 0 ? new Date(responses[0].submitted_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--'}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-2 group-hover:text-emerald-500 transition-colors">Última Actividad</span>
                                </div>
                                <div className="bg-[#0D0D0D] border border-exec-border p-5 flex flex-col items-start justify-center text-left group hover:border-amber-500 transition-colors">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-amber-500" /> Sentimiento (LSD)
                                    </span>
                                    <div className="w-full flex items-center justify-between text-[11px] font-bold text-white mb-1.5 font-mono">
                                        <span className="text-emerald-400">{sentiment.positivePct}% Pos</span>
                                        <span className="text-gray-400">{sentiment.neutralPct}% Neu</span>
                                        <span className="text-red-400">{sentiment.negativePct}% Neg</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-800 flex overflow-hidden">
                                        <div className="bg-emerald-500 h-full" style={{ width: `${sentiment.positivePct}%` }}></div>
                                        <div className="bg-gray-500 h-full" style={{ width: `${sentiment.neutralPct}%` }}></div>
                                        <div className="bg-red-500 h-full" style={{ width: `${sentiment.negativePct}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-[#0D0D0D] border border-exec-border p-5 flex flex-col items-center justify-center text-center">
                                    <button 
                                        onClick={loadData}
                                        className="group w-full h-full flex flex-col items-center justify-center gap-2"
                                    >
                                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-black text-indigo-500 transition-all rounded-full mb-1">
                                            <RefreshCw className="group-hover:rotate-180 transition-transform duration-700" size={18} />
                                        </div>
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Sincronizar Data</span>
                                    </button>
                                </div>
                            </div>

                            {/* Panel Inteligencia IA (Dentro del Scroll arriba de las matrices) */}
                            {showAIPanel && (
                                <div className="w-full bg-[#111] border border-[#222] p-6 relative mt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-exec-blue font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Sparkles size={14} />
                                            Análisis Smart IA
                                        </h3>
                                        <button 
                                            onClick={() => generateAI(true)}
                                            disabled={isGeneratingAI}
                                            className="px-3 py-1.5 border border-exec-border text-gray-400 hover:text-white hover:border-exec-blue/50 transition-colors flex items-center gap-2 text-[9px] font-black uppercase"
                                        >
                                            <RefreshCw size={12} className={isGeneratingAI ? "animate-spin" : ""} />
                                            Refrescar Análisis
                                        </button>
                                    </div>
                                    
                                    {isGeneratingAI ? (
                                        <div className="flex items-center gap-3 text-exec-blue text-xs uppercase tracking-widest font-black py-4">
                                            <Loader2 className="animate-spin" size={14} /> Descomponiendo Variables Sociológicas...
                                        </div>
                                    ) : aiSummary && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                            <div className="group bg-[#080808] border border-[#1A1A1A] p-6 space-y-4 hover:border-exec-blue/30 transition-all duration-500 relative">
                                                <div className="flex items-center gap-3 text-exec-blue">
                                                    <PenLine size={18} />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Resumen Ejecutivo</h4>
                                                </div>
                                                <div className="text-[13px] text-gray-300 leading-relaxed italic border-l-2 border-exec-blue/40 pl-4 py-1 news-content prose-sm max-w-none">
                                                    <ReactMarkdown>{aiSummary.executive_summary}</ReactMarkdown>
                                                </div>
                                            </div>
                                            <div className="group bg-[#080808] border border-[#1A1A1A] p-6 space-y-4 hover:border-exec-blue/30 transition-all duration-500">
                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <Users size={18} />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Dinámica de Población</h4>
                                                </div>
                                                <div className="text-[13px] text-gray-400 leading-relaxed font-medium news-content prose-sm max-w-none">
                                                    <ReactMarkdown>{aiSummary.audience_analysis}</ReactMarkdown>
                                                </div>
                                            </div>
                                            <div className="group bg-[#080808] border border-[#1A1A1A] p-6 space-y-4 hover:border-emerald-500/30 transition-all duration-500">
                                                <div className="flex items-center gap-3 text-emerald-500">
                                                    <CheckCircle2 size={18} />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Key Insights</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {(aiSummary.insights || []).map((ins: string, i: number) => (
                                                        <div key={i} className="flex gap-3 items-start">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 mt-1.5 shrink-0" />
                                                            <div className="text-[12px] text-gray-300 leading-snug news-content prose-sm max-w-none"><ReactMarkdown>{ins}</ReactMarkdown></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="group bg-[#080808] border border-[#1A1A1A] p-6 space-y-4 hover:border-white/30 transition-all duration-500">
                                                <div className="flex items-center gap-3 text-white">
                                                    <Zap size={18} />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Sugerencias Tácticas</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {(aiSummary.proposals || []).slice(0, 3).map((p: string, i: number) => (
                                                        <div key={i} className="flex gap-3 p-3 bg-white/[0.02] border border-white/5 items-start group-hover:border-white/10 transition-colors">
                                                            <div className="w-5 h-5 shrink-0 flex items-center justify-center bg-white text-black text-[9px] font-black shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                                                {i + 1}
                                                            </div>
                                                            <div className="text-[12px] text-gray-300 leading-snug news-content prose-sm max-w-none"><ReactMarkdown>{p}</ReactMarkdown></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Divider Line */}
                            <div className="flex items-center gap-4 py-2 mt-6">
                                <div className="h-px bg-exec-border flex-1" />
                                <span className="text-[9px] font-black text-exec-blue uppercase tracking-[0.3em]">Análisis Desglosado</span>
                                <div className="h-px bg-exec-border flex-1" />
                            </div>

                            {/* Matrices de Preguntas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                                {questions.map((q: any, idx: number) => {
                                    const qStat = stats?.[q.id];
                                    if (!qStat) return null;

                                    return (
                                        <div key={q.id} className="bg-[#0A0A0A] border border-[#1A1A1A] group hover:border-[#333] transition-colors relative overflow-hidden">
                                            <div className="px-6 py-4 border-b border-[#1A1A1A] flex items-start gap-4">
                                                <span className="text-[10px] font-black text-exec-blue/50 pt-0.5">{(idx + 1).toString().padStart(2, '0')}</span>
                                                <div className="flex-1 space-y-1">
                                                    <h4 className="text-[12px] font-black text-white uppercase tracking-wider leading-snug">
                                                        {q.question}
                                                    </h4>
                                                    <div className="inline-block mt-2 bg-[#1A1A1A] px-2 py-0.5 rounded text-[9px] font-bold text-gray-400">
                                                        TOTAL RESPUESTAS: {qStat.total || qStat.data?.length || 0}
                                                    </div>
                                                </div>
                                                <span className="shrink-0 text-[8px] font-black text-gray-600 bg-[#111] border border-gray-800 px-2 py-0.5 uppercase tracking-widest">
                                                    TIPO: {q.type}
                                                </span>
                                            </div>

                                            <div className="p-6 pl-10">
                                                {qStat.type === 'pie' ? (
                                                    <div className="h-56 w-full flex items-center justify-center">
                                                        <ResponsiveContainer width="60%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={qStat.data}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={40}
                                                                    outerRadius={70}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                    label={(props: any) => {
                                                                        const { cx, cy, midAngle, outerRadius, fill, payload } = props;
                                                                        const RADIAN = Math.PI / 180;
                                                                        const radius = outerRadius + 15;
                                                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                                        return (
                                                                            <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={14} fontWeight="bold">
                                                                                {payload.percentageText}
                                                                            </text>
                                                                        );
                                                                    }}
                                                                    labelLine={false}
                                                                >
                                                                    {qStat.data.map((entry: any, index: number) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip 
                                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #1A1A1A' }}
                                                                    itemStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
                                                                    formatter={(value: any, name: any, props: any) => {
                                                                        const pct = props?.payload?.percentageText || '';
                                                                        return [`${value} respuestas (${pct})`, name];
                                                                    }}
                                                                />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                ) : qStat.type === 'chart' ? (
                                                    <div className="h-56 w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={qStat.data} layout="vertical" margin={{ left: 10, right: 50, top: 0, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" horizontal={false} />
                                                                <XAxis type="number" hide />
                                                                <YAxis 
                                                                    dataKey="name" 
                                                                    type="category" 
                                                                    axisLine={false} 
                                                                    tickLine={false}
                                                                    tick={{ fill: '#888', fontSize: 10, fontWeight: 'bold' }}
                                                                    width={120}
                                                                />
                                                                <Tooltip 
                                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #0088FF', borderRadius: '0' }}
                                                                    itemStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
                                                                    cursor={{ fill: 'rgba(0, 136, 255, 0.05)' }}
                                                                    formatter={(value: any) => [`${value} respuestas`, 'Frecuencia']}
                                                                />
                                                                <Bar 
                                                                    dataKey="value" 
                                                                    radius={[0, 2, 2, 0]} 
                                                                    barSize={16}
                                                                >
                                                                     {qStat.data.map((entry: any, index: number) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                    <LabelList 
                                                                        dataKey="percentageText" 
                                                                        position="right" 
                                                                        content={(props: any) => {
                                                                            const { x, y, width, height, value, index } = props;
                                                                            if (x == null || y == null) return null;
                                                                            return (
                                                                                <text 
                                                                                    x={x + width + 8} 
                                                                                    y={y + height / 2 + 1} 
                                                                                    fill={COLORS[index % COLORS.length]} 
                                                                                    fontSize={11} 
                                                                                    fontWeight="black" 
                                                                                    dominantBaseline="middle"
                                                                                >
                                                                                    {value}
                                                                                </text>
                                                                            );
                                                                        }}
                                                                    />
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                ) : qStat.type === 'list' ? (
                                                    <div className="space-y-3">
                                                        {qStat.data.length > 0 ? (
                                                            qStat.data.map((item: string, i: number) => (
                                                                <div key={i} className="flex gap-4 group/item">
                                                                    <div className="pt-1 opacity-20 group-hover/item:opacity-100 transition-opacity">
                                                                        <MessageSquare size={12} className="text-exec-blue" />
                                                                    </div>
                                                                    <div className="p-3 bg-[#0D0D0D] border border-[#1A1A1A] group-hover/item:border-exec-blue/40 text-[11px] text-gray-300 font-medium leading-relaxed flex-1 transition-all">
                                                                        {item}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-[10px] text-gray-700 font-bold uppercase tracking-widest py-4 border border-dashed border-[#1A1A1A] text-center">
                                                                Ningún registro literal captado
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : qStat.type === 'number' ? (
                                                    <div className="space-y-4">
                                                        <div className="inline-flex items-center gap-3 px-4 py-2 border border-exec-blue/30 bg-exec-blue/10">
                                                            <TrendingUp size={16} className="text-exec-blue" />
                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">PROMEDIO:</span>
                                                            <span className="text-xl font-black text-white font-mono">{qStat.avg}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {qStat.data.map((item: string, i: number) => (
                                                                <span key={i} className="text-xs font-mono text-gray-400 bg-[#111] border border-gray-800 px-2 py-1">
                                                                    {item}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-gray-600 font-mono overflow-auto max-h-32">
                                                        {JSON.stringify(qStat.data)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </>
                            ) : (
                                /* Vista Individual */
                                <div className="flex border border-exec-border bg-[#0D0D0D] min-h-[500px]">
                                    {/* Sidebar Master */}
                                    <div className="w-1/3 border-r border-exec-border overflow-y-auto max-h-[600px] custom-scrollbar bg-black/20">
                                        {responses.map((r, i) => (
                                            <button
                                                key={r.id}
                                                onClick={() => setSelectedResponse(r)}
                                                className={`w-full text-left p-5 border-b border-exec-border transition-all ${selectedResponse?.id === r.id ? 'bg-exec-blue/10' : 'hover:bg-white/5'}`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-2 h-2 rounded-full ${selectedResponse?.id === r.id ? 'bg-exec-blue shadow-[0_0_8px_rgba(0,136,255,0.8)]' : 'bg-gray-700'}`}></div>
                                                    <div className="text-[11px] font-black text-white uppercase tracking-widest">RESPUESTA #{responses.length - i}</div>
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono pl-5">
                                                    {new Date(r.submitted_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </button>
                                        ))}
                                        {responses.length === 0 && (
                                            <div className="p-10 text-center flex flex-col items-center gap-3 text-gray-600">
                                                <Users size={24} />
                                                <span className="text-[10px] uppercase tracking-widest font-bold">Sin respuestas</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Content Detail */}
                                    <div className="w-2/3 p-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                                        {selectedResponse ? (
                                            <div className="space-y-8 animate-fade-in">
                                                <div className="flex items-center justify-between pb-4 border-b border-exec-border">
                                                    <div>
                                                        <h3 className="text-[14px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                            <MessageSquare size={16} className="text-exec-blue" />
                                                            Detalle de Respuestas
                                                        </h3>
                                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">
                                                            Registro exacto de lo ingresado por el usuario
                                                        </p>
                                                    </div>
                                                    <div className="text-[10px] font-black text-exec-blue uppercase tracking-widest bg-exec-blue/10 border border-exec-blue/20 px-3 py-1.5 rounded-sm flex items-center gap-2">
                                                        <Clock size={12} />
                                                        {new Date(selectedResponse.submitted_at).toLocaleString('es-ES')}
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-8">
                                                    {questions.map((q, i) => {
                                                        const answer = selectedResponse.answers?.[q.id];
                                                        return (
                                                            <div key={q.id} className="space-y-3 bg-[#111] border border-[#1A1A1A] p-5 relative overflow-hidden group/qa hover:border-exec-border transition-colors">
                                                                <div className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-start gap-3">
                                                                    <span className="text-exec-blue font-black font-mono bg-exec-blue/10 px-1.5 py-0.5 rounded-sm">{i + 1}</span>
                                                                    <span className="pt-0.5 leading-relaxed">{q.question}</span>
                                                                </div>
                                                                <div className="pl-[38px]">
                                                                    {answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0) ? (
                                                                        <span className="text-[11px] text-gray-600 font-bold uppercase tracking-widest border border-dashed border-[#1A1A1A] px-3 py-1.5 inline-block">
                                                                            Sin Respuesta
                                                                        </span>
                                                                    ) : Array.isArray(answer) ? (
                                                                        <ul className="space-y-2">
                                                                            {answer.map((val, idx) => (
                                                                                <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                                                                                    <div className="w-1.5 h-1.5 bg-exec-blue rounded-full"></div>
                                                                                    {val}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <div className="text-sm text-white bg-black border border-[#222] p-4 font-medium leading-relaxed">
                                                                            {answer}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                                                <div className="p-4 rounded-full bg-[#111] border border-[#222]">
                                                    <Users size={32} />
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest font-black">Selecciona una respuesta del panel lateral</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
