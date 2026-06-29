import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { generateBenefitContent, DEFAULT_AI_CONFIG, AIConfig } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { BenefitApplicationsPanel } from './BenefitApplicationsPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Plus, Edit2, Trash2, Search, Filter, Gift, Briefcase, GraduationCap, Globe, Award, Heart, Loader2, X, Save, AlertCircle, CheckCircle, Sparkles, Bot, ClipboardList } from 'lucide-react';

interface Benefit {
    id: string;
    title: string;
    description: string;
    category: 'Capacitación' | 'Beca' | 'Intercambio' | 'Certificación' | 'Bienestar' | 'Otro';
    partner_name: string;
    status: 'Borrador' | 'Publicado' | 'Archivado';
    availability: 'Disponible' | 'En Negociación' | 'Próximamente' | 'Cerrado';
    requirements: string[];
    image_url?: string;
    valid_until?: string;
    created_at: string;
}

const categories = [
    { id: 'Todos', label: 'Todos', icon: <Filter className="w-4 h-4" /> },
    { id: 'Capacitación', label: 'Capacitación', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'Beca', label: 'Beca', icon: <Award className="w-4 h-4" /> },
    { id: 'Intercambio', label: 'Intercambio', icon: <Globe className="w-4 h-4" /> },
    { id: 'Certificación', label: 'Certificación', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'Bienestar', label: 'Bienestar', icon: <Heart className="w-4 h-4" /> }
];

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Capacitación': return <Briefcase className="w-5 h-5" />;
        case 'Beca': return <GraduationCap className="w-5 h-5" />;
        case 'Intercambio': return <Globe className="w-5 h-5" />;
        case 'Certificación': return <Award className="w-5 h-5" />;
        case 'Bienestar': return <Heart className="w-5 h-5" />;
        default: return <Gift className="w-5 h-5" />;
    }
};

export const BenefitsView: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { confirm } = useConfirm();
    const location = useLocation();
    const [benefits, setBenefits] = useState<Benefit[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<string>('Todos');
    const [showModal, setShowModal] = useState(false);
    const [viewingBenefit, setViewingBenefit] = useState<Benefit | null>(null);
    const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
    const [formData, setFormData] = useState<Partial<Benefit>>({
        category: 'Capacitación',
        status: 'Borrador',
        availability: 'Disponible',
        requirements: []
    });
    const [newRequirement, setNewRequirement] = useState('');

    // AI State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    // Application State
    const [userApplications, setUserApplications] = useState<Record<string, string>>({}); // benefit_id -> status
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [showApplicationsPanel, setShowApplicationsPanel] = useState(false);

    useEffect(() => {
        fetchBenefits();
    }, []);

    useEffect(() => {
        if (location.state && location.state.action === 'create' && location.state.data) {
            const { title, description, category, requirements, partner_name } = location.state.data;
            setEditingBenefit(null);
            setFormData({
                title: title || '',
                description: description || '',
                category: category || 'Capacitación',
                status: 'Borrador',
                availability: 'Disponible',
                requirements: requirements || [],
                partner_name: partner_name || ''
            });
            setShowModal(true);
            // Limpiar estado para evitar bucles
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchBenefits = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('benefits')
                .select('*')
                .order('created_at', { ascending: false });

            // Si no es director ni staff administrativo con permisos, solo ver publicados
            const role = user?.role?.toLowerCase() || '';
            const canManage = role.includes('director') || role.includes('asesor') || role.includes('imagen') || role.includes('relaciones') || role.includes('eventos') || role.includes('redes') || role.includes('secretaria');

            if (!canManage) {
                query = query.eq('status', 'Publicado');
            }

            const { data, error } = await query;

            if (error) throw error;
            setBenefits(data || []);

            // Fetch user applications
            if (user) {
                const { data: apps, error: appsError } = await supabase
                    .from('benefit_applications')
                    .select('benefit_id, status')
                    .eq('user_id', user.id);

                if (!appsError && apps) {
                    const appMap: Record<string, string> = {};
                    apps.forEach(app => {
                        appMap[app.benefit_id] = app.status;
                    });
                    setUserApplications(appMap);
                }
            }
        } catch (error) {
            console.error('Error fetching benefits:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (benefitId: string) => {
        if (!user) return;
        setApplyingId(benefitId);
        try {
            const { error } = await supabase.from('benefit_applications').insert({
                benefit_id: benefitId,
                user_id: user.id,
                status: 'pending'
            });

            if (error) throw error;

            // Update local state
            setUserApplications(prev => ({ ...prev, [benefitId]: 'pending' }));
            toast('success', '✅ Postulación enviada correctamente. Un asesor revisará tu solicitud.');
        } catch (error: any) {
            console.error('Error applying:', error);
            toast('error', 'Error al postular: ' + error.message);
        } finally {
            setApplyingId(null);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.title || !formData.description || !formData.category) {
                toast('error', 'Por favor completa los campos obligatorios');
                return;
            }

            const benefitData = {
                ...formData,
                created_by: user?.id
            };

            if (editingBenefit) {
                const { error } = await supabase
                    .from('benefits')
                    .update(benefitData)
                    .eq('id', editingBenefit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('benefits')
                    .insert([benefitData]);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingBenefit(null);
            setFormData({ category: 'Capacitación', status: 'Borrador', availability: 'Disponible', requirements: [] });
            fetchBenefits();
            toast('success', 'Beneficio guardado correctamente');
        } catch (error) {
            console.error('Error saving benefit:', error);
            toast('error', 'Error al guardar');
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm('¿Estás seguro de eliminar este beneficio?')) return;
        try {
            const { error } = await supabase.from('benefits').delete().eq('id', id);
            if (error) throw error;
            fetchBenefits();
        } catch (error) {
            console.error('Error deleting benefit:', error);
        }
    };

    const addRequirement = () => {
        if (newRequirement.trim()) {
            setFormData(prev => ({
                ...prev,
                requirements: [...(prev.requirements || []), newRequirement.trim()]
            }));
            setNewRequirement('');
        }
    };

    const removeRequirement = (index: number) => {
        setFormData(prev => ({
            ...prev,
            requirements: prev.requirements?.filter((_, i) => i !== index)
        }));
    };

    const handleGenerateBenefit = async () => {
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        try {
            const result = await generateBenefitContent(aiPrompt, aiConfig);
            if (result) {
                setFormData(prev => ({
                    ...prev,
                    title: result.title,
                    description: result.description,
                    // Asegurar que la categoría sea válida
                    category: (['Capacitación', 'Beca', 'Intercambio', 'Certificación', 'Bienestar', 'Otro'].includes(result.category)
                        ? result.category
                        : 'Capacitación') as any,
                    requirements: result.requirements || [],
                    partner_name: result.partner_name || ''
                }));
                setShowAiModal(false);
                setAiPrompt('');
            }
        } catch (error) {
            console.error('Error generating benefit:', error);
            alert('Error al generar contenido con IA');
        } finally {
            setIsGenerating(false);
        }
    };



    const getAvailabilityColor = (availability: string) => {
        switch (availability) {
            case 'Disponible': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case 'En Negociación': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            case 'Próximamente': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'Cerrado': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredBenefits = filterCategory === 'Todos'
        ? benefits
        : benefits.filter(b => b.category === filterCategory);

    if (showApplicationsPanel) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-[#0A0A0A] text-white font-sans">
                <BenefitApplicationsPanel onClose={() => setShowApplicationsPanel(false)} />
            </div>
        );
    }

    return (
        <div className="p-4 md:pt-4 md:px-6 max-w-7xl mx-auto space-y-6 min-h-screen bg-[#0A0A0A] text-white font-sans transition-colors duration-300">
            {/* Header / Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#262626] pb-6 mb-4">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                        <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                            <Gift className="w-6 h-6 text-exec-blue" />
                        </div>
                        <span>Beneficios <span className="text-exec-blue">Exclusivos</span></span>
                    </h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
                        Accede a descuentos y oportunidades únicas seleccionadas para ti.
                    </p>
                </div>

                {/* 'Working for you' Banner - Refactored to Stitch Card */}
                <div className="flex-1 md:max-w-md bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex items-center gap-4 shadow-lg shadow-blue-900/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-exec-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10">
                        <h3 className="text-white font-medium text-sm flex items-center gap-2">
                            Estamos trabajando para ti
                            <span className="w-2 h-2 rounded-none bg-green-500 animate-pulse" />
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Negociando nuevas alianzas estratégicas.
                        </p>
                    </div>

                    <div className="ml-auto relative z-10">
                        <button className="bg-[#111] hover:bg-[#1a1a1a] text-xs text-white px-3 py-1.5 rounded-none border border-[#262626] hover:border-gray-600 transition-colors uppercase font-bold tracking-widest">
                            Ver Roadmap
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {(() => {
                        const role = user?.role?.toLowerCase() || '';
                        const canManage = role.includes('director') || role.includes('asesor') || role.includes('imagen') || role.includes('relaciones') || role.includes('eventos') || role.includes('redes') || role.includes('secretaria');
                        return canManage && (
                            <>
                                <button
                                    onClick={() => setShowApplicationsPanel(true)}
                                    className="p-2.5 bg-[#111] border border-[#262626] text-amber-400 hover:text-white hover:border-amber-500/50 rounded-none transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
                                    title="Gestionar Solicitudes"
                                >
                                    <ClipboardList className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowAiModal(true)}
                                    className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group"
                                    title="Asistente IA"
                                >
                                    <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
                                    Asistente IA
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingBenefit(null);
                                        setFormData({ category: 'Capacitación', status: 'Borrador', availability: 'Disponible', requirements: [] });
                                        setShowModal(true);
                                    }}
                                    className="flex items-center gap-2 bg-exec-blue hover:bg-blue-500 text-white px-4 py-2.5 rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 hover:shadow-exec-blue/40"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nuevo Beneficio
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 pb-4">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => setFilterCategory(category.id)}
                        className={`px-4 py-2 rounded-none text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border ${filterCategory === category.id
                            ? 'bg-exec-blue border-exec-blue text-white shadow-lg shadow-exec-blue/20'
                            : 'bg-[#111] border-[#262626] text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            {category.icon}
                            <span>{category.label}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Grid de Beneficios */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-gray-500 text-sm">Cargando beneficios...</p>
                </div>
            ) : filteredBenefits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#111] rounded-none border border-dashed border-[#262626] text-center">
                    <div className="p-4 bg-[#1A1A1A] rounded-none mb-4">
                        <Gift className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-1">No hay beneficios disponibles</h3>
                    <p className="text-gray-500 text-sm max-w-md font-light">
                        Actualmente no hay beneficios en la categoría seleccionada. Vuelve a revisar pronto.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredBenefits.map((benefit) => (
                        <div
                            key={benefit.id}
                            onClick={() => setViewingBenefit(benefit)}
                            className="group bg-[#111] border border-exec-border rounded-none overflow-hidden hover:border-exec-blue hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer flex flex-col"
                        >
                            {/* Imagen o Placeholder */}
                            <div className="h-48 bg-[#151515] relative overflow-hidden">
                                {benefit.image_url ? (
                                    <img src={benefit.image_url} alt={benefit.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                                        {getCategoryIcon(benefit.category)}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent opacity-80" />
                                <div className="absolute top-4 right-4">
                                    <span className={`px-2 py-1 rounded-none text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${benefit.availability === 'Disponible' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                        benefit.availability === 'Próximamente' ? 'bg-exec-blue/20 text-exec-blue border-exec-blue/30' :
                                            benefit.availability === 'En Negociación' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                'bg-exec-red/20 text-exec-red border-exec-red/30'
                                        }`}>
                                        {benefit.availability}
                                    </span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-1 leading-none group-hover:text-exec-blue transition-colors">
                                        {benefit.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[10px] text-exec-blue font-bold uppercase tracking-widest">
                                        {getCategoryIcon(benefit.category)}
                                        {benefit.category}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col gap-4">
                                <p className="text-sm text-gray-400 line-clamp-2">
                                    {benefit.description}
                                </p>

                                {benefit.partner_name && (
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-[#151515] p-2 rounded-none border border-exec-border uppercase tracking-widest font-bold">
                                        <Briefcase className="w-3 h-3" />
                                        <span className="text-gray-300">{benefit.partner_name}</span>
                                    </div>
                                )}

                                {benefit.requirements && benefit.requirements.length > 0 && (
                                    <div className="space-y-2 mt-auto">
                                        <div className="flex flex-wrap gap-2">
                                            {benefit.requirements.slice(0, 2).map((req, i) => (
                                                <span key={i} className="text-[10px] bg-[#1A1A1A] text-gray-400 px-2 py-1 rounded-none border border-[#333] flex items-center gap-1 uppercase tracking-tighter">
                                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                    {req.length > 20 ? req.substring(0, 20) + '...' : req}
                                                </span>
                                            ))}
                                            {benefit.requirements.length > 2 && (
                                                <span className="text-[10px] text-exec-blue px-2 py-1 font-bold">
                                                    +{benefit.requirements.length - 2} más
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-exec-border flex items-center justify-between bg-[#151515]/50">
                                {(() => {
                                    const role = user?.role?.toLowerCase() || '';
                                    // Editar: Solo Director o Creador (aunque aquí no chequeamos creador en front, asumimos Director/Admin estricto para edición global o personal si tuviéramos field)
                                    // El usuario pidió arreglar que "el director agrega y a todos les sale para editar".
                                    // Restrinjamos edición SOLO a Director por ahora para ser seguros, o quien tenga rol administrativo ALTO.
                                    const canEdit = role.includes('director') || role.includes('secretaria');

                                    const applicationStatus = userApplications[benefit.id];

                                    return (
                                        <div className="flex gap-2 w-full justify-between items-center">
                                            {canEdit ? (
                                                <div className="flex gap-2 w-full">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingBenefit(benefit);
                                                            setFormData(benefit);
                                                            setShowModal(true);
                                                        }}
                                                        className="flex-1 px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#222] text-gray-300 border border-exec-border rounded-none text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Edit2 className="w-3 h-3" /> Editar
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(benefit.id);
                                                        }}
                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-none transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {applicationStatus === 'approved' ? (
                                                        <span className="w-full text-xs font-bold text-emerald-400 bg-emerald-900/10 border border-emerald-900/30 py-1.5 rounded text-center flex items-center justify-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> BENEFICIO ACTIVO
                                                        </span>
                                                    ) : applicationStatus === 'pending' ? (
                                                        <span className="w-full text-xs font-bold text-amber-400 bg-amber-900/10 border border-amber-900/30 py-1.5 rounded text-center flex items-center justify-center gap-1">
                                                            <Loader2 className="w-3 h-3 animate-spin" /> PENDIENTE
                                                        </span>
                                                    ) : (
                                                        <button
                                                            className="w-full text-xs font-black uppercase tracking-widest text-exec-blue hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            Ver Detalles para Postular <Award className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}



            {/* Modal Crear/Editar */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                        <div className="bg-[#111] rounded-none w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-exec-border animate-in fade-in zoom-in-95 duration-200 scrollbar-thin scrollbar-thumb-gray-800" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-exec-border flex justify-between items-center sticky top-0 bg-[#111] z-10">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-white">
                                        {editingBenefit ? 'Editar Beneficio' : 'Nuevo Beneficio'}
                                    </h3>
                                    <button
                                        onClick={() => setShowAiModal(true)}
                                        className="px-3 py-1 bg-white border border-exec-blue/10 text-black rounded-none text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-gray-100 transition-all shadow-sm group"
                                    >
                                        <span className="material-symbols-outlined text-exec-blue text-[16px]">smart_toy</span>
                                        Usar IA
                                    </button>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Imagen de Portada</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-24 h-24 rounded-none overflow-hidden bg-[#1A1A1A] border border-exec-border flex-shrink-0">
                                            {formData.image_url ? (
                                                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Gift className="w-8 h-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    try {
                                                        const fileExt = file.name.split('.').pop();
                                                        const fileName = `${Math.random()}.${fileExt}`;
                                                        const filePath = `${fileName}`;

                                                        const { error: uploadError } = await supabase.storage
                                                            .from('benefit-images')
                                                            .upload(filePath, file);

                                                        if (uploadError) throw uploadError;

                                                        const { data } = supabase.storage
                                                            .from('benefit-images')
                                                            .getPublicUrl(filePath);

                                                        setFormData({ ...formData, image_url: data.publicUrl });
                                                    } catch (error) {
                                                        console.error('Error uploading image:', error);
                                                        alert('Error al subir la imagen');
                                                    }
                                                }}
                                                className="block w-full text-xs text-gray-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-none file:border-0
                                                file:text-[10px] file:font-black
                                                file:bg-[#222] file:text-white
                                                file:uppercase file:tracking-widest
                                                hover:file:bg-[#333]
                                                cursor-pointer
                                            "
                                            />
                                            <p className="mt-2 text-xs text-gray-500">
                                                PNG, JPG, GIF hasta 5MB. Preferible formato horizontal.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Título</label>
                                        <input
                                            type="text"
                                            value={formData.title || ''}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2 rounded-none border border-exec-border bg-[#1A1A1A] text-white focus:border-exec-blue outline-none transition-all placeholder-gray-600"
                                            placeholder="Ej. Beca de Intercambio 2026"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Institución / Aliado</label>
                                        <input
                                            type="text"
                                            value={formData.partner_name || ''}
                                            onChange={e => setFormData({ ...formData, partner_name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-none border border-exec-border bg-[#1A1A1A] text-white focus:border-exec-blue outline-none transition-all placeholder-gray-600"
                                            placeholder="Ej. Universidad Nacional..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Descripción</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 rounded-none border border-exec-border bg-[#1A1A1A] text-white focus:border-exec-blue outline-none transition-all resize-none placeholder-gray-600"
                                        placeholder="Detalles clave del beneficio..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Categoría</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                            className="w-full px-4 py-2 rounded-none border border-exec-border bg-[#1A1A1A] text-white focus:border-exec-blue outline-none transition-all placeholder-gray-600"
                                        >
                                            <option value="Capacitación">Capacitación</option>
                                            <option value="Beca">Beca</option>
                                            <option value="Intercambio">Intercambio</option>
                                            <option value="Certificación">Certificación</option>
                                            <option value="Bienestar">Bienestar</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Disponibilidad</label>
                                        <select
                                            value={formData.availability}
                                            onChange={e => setFormData({ ...formData, availability: e.target.value as any })}
                                            className="w-full px-4 py-2 rounded-none border border-exec-border bg-[#1A1A1A] text-white focus:border-exec-blue outline-none transition-all placeholder-gray-600"
                                        >
                                            <option value="Disponible">Disponible</option>
                                            <option value="En Negociación">En Negociación</option>
                                            <option value="Próximamente">Próximamente</option>
                                            <option value="Cerrado">Cerrado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                            className="w-full px-4 py-2 rounded-none border border-exec-border bg-[#1A1A1A] text-white focus:border-exec-blue outline-none transition-all placeholder-gray-600"
                                        >
                                            <option value="Borrador">Borrador</option>
                                            <option value="Publicado">Publicado</option>
                                            <option value="Archivado">Archivado</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Requisitos</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newRequirement}
                                            onChange={e => setNewRequirement(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && addRequirement()}
                                            className="flex-1 px-4 py-2 rounded-none border border-exec-border bg-[#1A1A1A] text-white focus:border-exec-blue outline-none transition-all placeholder-gray-600"
                                            placeholder="Agregar requisito..."
                                        />
                                        <button
                                            onClick={addRequirement}
                                            type="button"
                                            className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white rounded-none transition-colors border border-exec-border"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.requirements?.map((req, index) => (
                                            <span key={index} className="px-3 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue rounded-none text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                {req}
                                                <button onClick={() => removeRequirement(index)} className="hover:text-exec-red transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-exec-border bg-[#111] flex justify-end gap-3 sticky bottom-0 rounded-none">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-none text-[11px] font-bold uppercase tracking-widest transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none shadow-lg shadow-exec-blue/20 transition-all flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Beneficio
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Ver Detalles (Solo Lectura) */}
            {
                viewingBenefit && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingBenefit(null)}>
                        <div className="bg-[#111] rounded-none w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-exec-border animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="relative h-64 bg-[#151515]">
                                {viewingBenefit?.image_url ? (
                                    <img src={viewingBenefit.image_url} alt={viewingBenefit?.title || ''} className="w-full h-full object-cover mask-gradient-b" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                                        {getCategoryIcon(viewingBenefit?.category || 'Otro')}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                                <button
                                    onClick={() => setViewingBenefit(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-none border border-white/10 transition-colors backdrop-blur-md"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="absolute bottom-6 left-6 right-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm ${viewingBenefit?.availability === 'Disponible' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                            'bg-gray-700/50 text-gray-300 border-gray-600'
                                            }`}>
                                            {viewingBenefit?.availability || 'Cerrado'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-wider bg-exec-blue/20 text-exec-blue border border-exec-blue/30">
                                            {viewingBenefit?.category || 'General'}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-1 shadow-black drop-shadow-md">
                                        {viewingBenefit?.title || 'Sin Título'}
                                    </h2>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" /> Detalles del Beneficio
                                        </h3>
                                        <div className="news-content text-gray-300 leading-relaxed text-base max-w-none">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                            >
                                                {viewingBenefit?.description || ''}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>

                                {viewingBenefit?.partner_name && (
                                    <div className="bg-[#1A1A1A] p-4 rounded-none border border-exec-border flex items-center gap-3">
                                        <div className="p-2 bg-[#222] rounded-none border border-exec-blue/20">
                                            <Briefcase className="w-5 h-5 text-exec-blue" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Organizado por</p>
                                            <p className="text-white font-bold uppercase tracking-tighter">{viewingBenefit.partner_name}</p>
                                        </div>
                                    </div>
                                )}

                                {(viewingBenefit?.requirements || []).length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Requisitos para Postular
                                        </h3>
                                        <ul className="grid gap-3">
                                            {viewingBenefit.requirements?.map((req, i) => (
                                                <li key={i} className="flex items-start gap-3 p-3 rounded-none bg-[#151515] border border-exec-border text-gray-300 text-sm">
                                                    <div className="w-1.5 h-1.5 rounded-none bg-exec-blue mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                    {req}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-exec-border flex justify-end gap-3">
                                    <button
                                        onClick={() => setViewingBenefit(null)}
                                        className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#222] text-gray-300 rounded-none font-bold text-[11px] uppercase tracking-widest transition-colors border border-exec-border"
                                    >
                                        Cerrar
                                    </button>
                                    {viewingBenefit?.availability === 'Disponible' && (
                                        <>
                                            {viewingBenefit?.id && userApplications[viewingBenefit.id] === 'approved' ? (
                                                <button disabled className="px-6 py-2.5 bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 rounded-none font-black text-[11px] uppercase tracking-widest flex items-center gap-2 cursor-default">
                                                    <CheckCircle className="w-4 h-4" /> Ya tienes este beneficio
                                                </button>
                                            ) : viewingBenefit?.id && userApplications[viewingBenefit.id] === 'pending' ? (
                                                <button disabled className="px-6 py-2.5 bg-amber-900/20 text-amber-400 border border-amber-500/30 rounded-none font-black text-[11px] uppercase tracking-widest flex items-center gap-2 cursor-default">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Postulación Pendiente
                                                </button>
                                            ) : viewingBenefit?.id && (
                                                <button
                                                    onClick={() => handleApply(viewingBenefit.id)}
                                                    disabled={applyingId === viewingBenefit.id}
                                                    className="px-6 py-2.5 bg-exec-blue hover:bg-blue-500 text-white rounded-none font-black text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {applyingId === viewingBenefit.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                    Postular Ahora
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {showAiModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-[#262626] bg-[#0A0A0A] flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                                    <span className="material-symbols-outlined text-exec-blue text-[20px]">smart_toy</span>
                                </div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">Asistente IA de Beneficios</h3>
                            </div>
                            <button onClick={() => setShowAiModal(false)} className="text-gray-500 hover:text-white transition-colors p-2">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    ¿Qué beneficio deseas generar?
                                </label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Ej: Un convenio con una clínica dental que ofrezca 20% de descuento en limpiezas para socios..."
                                    className="w-full h-32 bg-[#151515] border border-[#262626] rounded-none p-4 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-exec-blue/50 transition-all resize-none shadow-inner"
                                />
                            </div>

                            <AIEngineSelector 
                                config={aiConfig}
                                onConfigChange={setAiConfig}
                            />

                            <button
                                onClick={handleGenerateBenefit}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className="w-full py-4 bg-white hover:bg-gray-100 text-black rounded-none transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] disabled:opacity-50 group"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-exec-blue" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-exec-blue text-[20px]">smart_toy</span>
                                        <span>Generar Contenido</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
