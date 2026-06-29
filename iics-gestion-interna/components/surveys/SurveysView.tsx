import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, BarChart3, Users, 
    Globe, Loader2, TrendingUp,
    MessageSquare, ArrowUpLeft, Share2, 
    Calendar, CheckCircle2, MoreHorizontal, Edit, Trash2, Copy, Power
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import { CreateSurvey } from './CreateSurvey';
import { SurveyAnalyticsModal } from './SurveyAnalyticsModal';

export function SurveysView() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'event_feedback' | 'general'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
    const [analyticsSurveyId, setAnalyticsSurveyId] = useState<string | null>(null);
    const [editSurveyId, setEditSurveyId] = useState<string | undefined>(undefined);

    useEffect(() => {
        loadSurveys();
    }, []);

    async function loadSurveys() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('surveys')
                .select(`
                    *,
                    event:events(title),
                    responses_count:survey_responses(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSurveys(data || []);
        } catch (e) {
            console.error('Error loading surveys:', e);
        } finally {
            setLoading(false);
        }
    }

    const filteredSurveys = surveys.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || s.type === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const totalResponses = surveys.reduce((acc, s) => acc + (s.responses_count?.[0]?.count || 0), 0);
    const onlineSurveys = surveys.filter(s => s.is_active).length;
    const engagementRate = surveys.length > 0 
        ? Math.min(100, Math.round((totalResponses / (surveys.length * 25)) * 100)) 
        : 0;

    const handleDeleteSurvey = async (id: string) => {
        try {
            const { error } = await supabase.from('surveys').delete().eq('id', id);
            if (error) throw error;
            showToast({ type: 'success', title: 'ENCUESTA ELIMINADA', message: 'Datos borrados del sistema permanentemente.' });
            loadSurveys();
        } catch (e: any) {
            showToast({ type: 'error', title: 'ERROR DB', message: 'No se pudo eliminar la encuesta.' });
        }
        setConfirmModal(null);
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('surveys').update({ is_active: !currentStatus }).eq('id', id);
            if (error) throw error;
            showToast({ 
                type: 'success', 
                title: currentStatus ? 'ENCUESTA PAUSADA' : 'ENCUESTA ACTIVADA', 
                message: currentStatus ? 'La encuesta ya no recibirá nuevas respuestas.' : 'La encuesta vuelve a estar pública y en línea.' 
            });
            loadSurveys();
        } catch (e: any) {
            showToast({ type: 'error', title: 'ERROR', message: 'No se pudo cambiar el estado de la encuesta.' });
        }
    };

    const handleCopyLink = (slug: string) => {
        const url = `${window.location.origin}/encuesta/${slug}`;
        navigator.clipboard.writeText(url);
        showToast({ type: 'info', title: 'ENLACE COPIADO', message: 'URL pública copiada y lista para compartir.' });
    };

    const handleAnalyze = (id: string) => {
        setAnalyticsSurveyId(id);
    };

    return (
        <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6 space-y-6 animate-in fade-in duration-500">
            
            {/* ═══ HEADER (Identical to TasksViewNew) ═══ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                        <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                            <BarChart3 className="w-6 h-6 text-exec-blue" />
                        </div>
                        <span>Centro de <span className="text-exec-blue">Encuestas</span></span>
                    </h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
                        Gestión estratégica de recolección de datos y análisis de satisfacción institucional.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Encuesta
                    </button>
                </div>
            </div>

            {/* ═══ METRIC CARDS (Exact match to TasksViewNew) ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Encuestas */}
                <div className="exec-card p-5 flex flex-col justify-between h-32 bg-[#0A0A0A] border border-exec-border group hover:border-exec-blue transition-colors">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-exec-blue transition-colors">Total Encuestas</h3>
                        <span className="material-symbols-outlined text-exec-blue text-xl">assignment</span>
                    </div>
                    <div>
                        <p className="text-3xl font-light text-white">{surveys.length}</p>
                        <div className="flex items-center gap-1 text-xs text-exec-blue/80 mt-1 uppercase font-bold tracking-tighter">
                            registradas
                        </div>
                    </div>
                </div>

                {/* Respuestas Totales */}
                <div className="exec-card p-5 flex flex-col justify-between h-32 bg-[#0A0A0A] border border-exec-border group hover:border-emerald-500 transition-colors">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-emerald-500 transition-colors">Respuestas</h3>
                        <span className="material-symbols-outlined text-emerald-500 text-xl">groups</span>
                    </div>
                    <div>
                        <p className="text-3xl font-light text-white">{totalResponses}</p>
                        <div className="flex items-center gap-1 text-xs text-emerald-500/80 mt-1 uppercase font-bold tracking-tighter">
                            acumuladas
                        </div>
                    </div>
                </div>

                {/* Activas */}
                <div className="exec-card p-5 flex flex-col justify-between h-32 bg-[#0A0A0A] border border-exec-border group hover:border-indigo-500 transition-colors">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-indigo-500 transition-colors">En Línea</h3>
                        <span className="material-symbols-outlined text-indigo-500 text-xl">public</span>
                    </div>
                    <div>
                        <p className="text-3xl font-light text-white">{surveys.filter(s => s.is_active).length}</p>
                        <div className="flex items-center gap-1 text-xs text-indigo-500/80 mt-1 uppercase font-bold tracking-tighter">
                            publicadas
                        </div>
                    </div>
                </div>

                {/* Conversión */}
                <div className="exec-card p-5 flex flex-col justify-between h-32 bg-[#0A0A0A] border border-exec-border group hover:border-amber-500 transition-colors">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-amber-500 transition-colors">Engagement</h3>
                        <span className="material-symbols-outlined text-amber-500 text-xl">trending_up</span>
                    </div>
                    <div>
                        <p className="text-3xl font-light text-white">{engagementRate}%</p>
                        <div className="flex items-center gap-1 text-xs text-amber-500/80 mt-1 uppercase font-bold tracking-tighter">
                            tasa de éxito
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ TABS + FILTERS BAR ═══ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-[#0A0A0A] border border-exec-border p-1 w-full lg:w-auto">
                    {(['all', 'event_feedback', 'general'] as const).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                filterCategory === cat 
                                ? 'bg-exec-blue text-white' 
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {cat === 'all' ? 'Ver Todo' : cat === 'event_feedback' ? 'Eventos' : 'Generales'}
                        </button>
                    ))}
                </div>

                <div className="relative w-full lg:w-72 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-exec-blue transition-colors" size={14} />
                    <input 
                        type="text"
                        placeholder="BUSCAR POR TÍTULO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-exec-border text-white pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-exec-blue transition-all"
                    />
                </div>
            </div>

            {/* ═══ SURVEYS GRID ═══ */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-exec-blue" size={32} />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Sincronizando Analytics...</span>
                </div>
            ) : filteredSurveys.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSurveys.map((s) => (
                        <div key={s.id} className="group bg-[#0A0A0A] border border-exec-border hover:border-exec-blue transition-all flex flex-col">
                            <div className="p-6 space-y-4 flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <span className="text-[9px] font-black text-exec-blue uppercase tracking-widest border border-exec-blue/20 px-2 py-0.5">
                                            {s.type === 'event_feedback' ? 'POST-EVENTO' : 'GENERAL'}
                                        </span>
                                        {s.category && (
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest border border-gray-800 px-2 py-0.5">
                                                {s.category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => handleToggleStatus(s.id, s.is_active)}
                                            title={s.is_active ? "Haz clic para Pausar / Cerrar Encuesta" : "Haz clic para Activar Encuesta"}
                                            className="flex items-center gap-1.5 border-r border-exec-border pr-4 hover:opacity-70 transition-opacity cursor-pointer group/status"
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${s.is_active ? 'text-emerald-500 group-hover/status:text-red-500' : 'text-gray-600 group-hover/status:text-emerald-500'}`}>
                                                {s.is_active ? 'Activa' : 'Inactiva'}
                                            </span>
                                            <Power size={10} className={`${s.is_active ? 'text-emerald-500 group-hover/status:text-red-500' : 'text-gray-600 group-hover/status:text-emerald-500'}`} />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditSurveyId(s.id);
                                                    setShowCreateModal(true);
                                                }}
                                                className="text-gray-600 hover:text-white transition-colors" title="Editar"
                                            >
                                                <Edit size={13} />
                                            </button>
                                            <button 
                                                onClick={() => setConfirmModal({
                                                    isOpen: true, 
                                                    title: 'ELIMINAR ENCUESTA', 
                                                    message: 'Esta acción borrará la encuesta, sus estadísticas y los resultados de los encuestados. ¿Estás seguro?',
                                                    onConfirm: () => handleDeleteSurvey(s.id)
                                                })}
                                                className="text-gray-600 hover:text-red-500 transition-colors" title="Eliminar"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-exec-blue transition-colors line-clamp-1">
                                        {s.title}
                                    </h3>
                                    {s.event?.title && (
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1 truncate">
                                            <Calendar size={10} className="shrink-0" />
                                            {s.event.title}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-exec-border/50">
                                    <div>
                                        <p className="text-[20px] font-black text-white leading-none font-mono">
                                            {s.responses_count?.[0]?.count || 0}
                                        </p>
                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Respuestas</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[20px] font-black text-white leading-none font-mono">
                                            {new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                        </p>
                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Iniciada</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/50 p-4 flex items-center justify-between border-t border-exec-border">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAnalyze(s.id)}
                                        className="p-2 text-gray-500 hover:text-exec-blue bg-white/5 hover:bg-exec-blue/10 transition-colors" 
                                        title="Resultados Gráficos"
                                    >
                                        <BarChart3 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleCopyLink(s.slug)}
                                        className="p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 transition-colors" 
                                        title="Copiar Enlace Público"
                                    >
                                        <Share2 size={16} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleAnalyze(s.id)}
                                    className="text-[10px] font-black text-exec-blue hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
                                >
                                    ANALIZAR <ArrowUpLeft size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-exec-border">
                    <Poll className="text-gray-800 mb-4" size={48} />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Sin Registros</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest max-w-xs">
                        No hay encuestas disponibles en esta categoría.
                    </p>
                </div>
            )}

            {/* Modals */}
            {showCreateModal && (
                <CreateSurvey 
                    isOpen={showCreateModal} 
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditSurveyId(undefined);
                    }} 
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditSurveyId(undefined);
                        loadSurveys();
                    }}
                    editSurveyId={editSurveyId}
                />
            )}

            {confirmModal && confirmModal.isOpen && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}

            <SurveyAnalyticsModal 
                isOpen={analyticsSurveyId !== null} 
                onClose={() => setAnalyticsSurveyId(null)} 
                surveyId={analyticsSurveyId || ''} 
            />

        </div>
    );
}

function Poll(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 10h4"/><path d="M7 14h10"/><path d="M7 6h10"/>
    </svg>
  )
}
