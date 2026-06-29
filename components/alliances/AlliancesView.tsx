import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import ReactMarkdown from 'react-markdown';
import { generateAllianceContent, DEFAULT_AI_CONFIG, AIConfig } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { Plus, Edit2, Trash2, Search, Handshake, FileText, ExternalLink, Loader2, X, Save, Upload, Eye, CheckCircle, Sparkles, Bot, Image as ImageIcon, LayoutGrid, List } from 'lucide-react';

interface Alliance {
    id: string;
    title: string;
    institution: string;
    description: string;
    cover_url?: string;
    contract_url?: string;
    status: 'Activo' | 'Finalizado' | 'En Negociación';
    created_at: string;
}

export const AlliancesView: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const [alliances, setAlliances] = useState<Alliance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [viewingAlliance, setViewingAlliance] = useState<Alliance | null>(null);
    const [editingAlliance, setEditingAlliance] = useState<Alliance | null>(null);
    const [isPreview, setIsPreview] = useState(false);
    const [formData, setFormData] = useState<Partial<Alliance>>({
        status: 'Activo'
    });
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingContract, setUploadingContract] = useState(false);

    // AI Assistant States
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    useEffect(() => {
        fetchAlliances();
    }, []);

    // Handle pre-fill from Orchestrator
    useEffect(() => {
        if (location.state?.action === 'create' && location.state?.data) {
            const data = location.state.data;
            setFormData(prev => ({
                ...prev,
                title: data.title || '',
                institution: data.institution || '',
                description: data.description || '',
                status: 'Activo'
            }));
            setShowModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchAlliances = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('alliances')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlliances(data || []);
        } catch (error) {
            console.error('Error fetching alliances:', error);
        } finally {
            setLoading(false);
        }
    };

    // AI Assistant Function
    const handleGenerateAlliance = async () => {
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        try {
            const generated = await generateAllianceContent(aiPrompt, aiConfig);
            if (generated) {
                setFormData(prev => ({
                    ...prev,
                    title: generated.title,
                    institution: generated.institution,
                    description: generated.description,
                    status: 'Activo'
                }));
                setShowAiModal(false);
                setAiPrompt('');
            }
        } catch (error) {
            console.error('Error generating alliance content:', error);
            showToast('ERROR AL GENERAR CONTENIDO CON IA', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.title || !formData.institution) {
                showToast('POR FAVOR COMPLETA EL TÍTULO Y LA INSTITUCIÓN', 'warning');
                return;
            }

            const allianceData = {
                ...formData,
                created_by: user?.id
            };

            if (editingAlliance) {
                const { error } = await supabase
                    .from('alliances')
                    .update(allianceData)
                    .eq('id', editingAlliance.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('alliances')
                    .insert([allianceData]);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingAlliance(null);
            setFormData({ status: 'Activo' });
            fetchAlliances();
        } catch (error) {
            console.error('Error saving alliance:', error);
            showToast('ERROR AL GUARDAR LA ALIANZA', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm(
            'ELIMINAR ALIANZA',
            '¿ESTÁS SEGURO DE ELIMINAR ESTA ALIANZA ESTRATÉGICA? ESTA ACCIÓN NO SE PUEDE DESHACER.',
            { isDestructive: true, confirmText: 'ELIMINAR REGISTRO', cancelText: 'CANCELAR' }
        );
        if (!confirmed) return;
        
        try {
            const { error } = await supabase.from('alliances').delete().eq('id', id);
            if (error) throw error;
            showToast('ALIANZA ELIMINADA CORRECTAMENTE', 'success');
            fetchAlliances();
        } catch (error) {
            console.error('Error deleting alliance:', error);
            showToast('ERROR AL ELIMINAR EL REGISTRO', 'error');
        }
    };

    const handleFileUpload = async (file: File, bucket: string, field: 'cover_url' | 'contract_url') => {
        try {
            if (field === 'cover_url') setUploadingCover(true);
            else setUploadingContract(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [field]: data.publicUrl }));
        } catch (error) {
            console.error(`Error uploading to ${bucket}:`, error);
            showToast('ERROR AL SUBIR EL ARCHIVO', 'error');
        } finally {
            if (field === 'cover_url') setUploadingCover(false);
            else setUploadingContract(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Activo': return 'bg-green-500/5 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.05)]';
            case 'En Negociación': return 'bg-yellow-500/5 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)]';
            case 'Finalizado': return 'bg-gray-500/5 text-gray-500 border-gray-500/20';
            default: return 'bg-gray-500/5 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="w-full bg-black min-h-screen p-4 md:pt-4 md:px-6 text-exec-slate custom-scrollbar">
            {/* ═══ HEADER (Standardized) ═══ */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-exec-border gap-6">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                        <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                            <Handshake className="w-6 h-6 text-exec-blue" />
                        </div>
                        <span>ALIANZAS <span className="text-exec-blue">ESTRATÉGICAS</span></span>
                    </h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Convenios y colaboraciones institucionales de alto nivel.</p>
                </div>
                {(() => {
                    const role = user?.role?.toLowerCase() || '';
                    const canManage = role.includes('director') || role.includes('asesor') || role.includes('imagen') || role.includes('relaciones') || role.includes('eventos') || role.includes('redes') || role.includes('secretaria');
                    return canManage && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowAiModal(true)}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group border border-transparent"
                            >
                                <span className="material-symbols-outlined notranslate text-exec-blue text-[18px]" translate="no">smart_toy</span>
                                <span>Asistente IA</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingAlliance(null);
                                    setFormData({ status: 'Activo' });
                                    setShowModal(true);
                                }}
                                className="px-5 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center gap-2.5"
                            >
                                <Plus className="w-4 h-4" />
                                Nueva Alianza
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* Grid de Alianzas */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
                </div>
            ) : alliances.length === 0 ? (
                <div className="text-center py-20 bg-[#0D0D0D] rounded-none border border-dashed border-exec-border">
                    <Handshake className="w-12 h-12 mx-auto text-gray-700 mb-4 opacity-20" />
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold">No hay alianzas registradas aún.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {alliances.map((alliance) => (
                        <div
                            key={alliance.id}
                            onClick={() => setViewingAlliance(alliance)}
                            className="group bg-[#0D0D0D] border border-exec-border rounded-none shadow-2xl hover:border-exec-blue/30 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                        >
                            {/* Cover Image - Non-cropped Version */}
                            <div className="h-52 bg-[#050505] relative overflow-hidden flex items-center justify-center p-4">
                                {alliance.cover_url ? (
                                    <img src={alliance.cover_url} alt={alliance.title} className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-800">
                                        <Handshake className="w-16 h-16 opacity-10" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4">
                                    <span className={`px-2.5 py-1 rounded-none text-[9px] font-black border uppercase tracking-widest backdrop-blur-md shadow-lg ${getStatusColor(alliance.status)}`}>
                                        {alliance.status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-8 flex-1 flex flex-col">
                                <h3 className="text-sm font-black text-white mb-2 group-hover:text-exec-blue transition-colors uppercase tracking-tight leading-tight">
                                    {alliance.title}
                                </h3>
                                <p className="text-[9px] font-black text-exec-blue mb-4 uppercase tracking-[0.2em] opacity-80">
                                    {alliance.institution}
                                </p>
                                <p className="text-[11px] text-gray-500 leading-relaxed mb-6 line-clamp-3 flex-1 font-bold uppercase tracking-wide italic">
                                    {alliance.description}
                                </p>

                                <div
                                    className="space-y-3 mt-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {alliance.contract_url && (
                                        <a
                                            href={alliance.contract_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#111] hover:bg-[#1A1A1A] text-gray-400 hover:text-white rounded-none border border-exec-border transition-all text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            Documento Oficial
                                        </a>
                                    )}

                                    <button
                                        onClick={() => setViewingAlliance(alliance)}
                                        className="w-full px-4 py-2.5 bg-exec-blue/10 hover:bg-exec-blue/20 text-exec-blue rounded-none border border-exec-blue/20 transition-all text-[10px] font-bold uppercase tracking-widest mt-2"
                                    >
                                        Detalles Ejecutivos
                                    </button>

                                    {(() => {
                                        const role = user?.role?.toLowerCase() || '';
                                        const canManage = role.includes('director') || role.includes('asesor') || role.includes('imagen') || role.includes('relaciones') || role.includes('eventos') || role.includes('redes') || role.includes('secretaria');
                                        return canManage && (
                                            <div className="flex gap-3 pt-4 border-t border-exec-border">
                                                <button
                                                    onClick={() => {
                                                        setEditingAlliance(alliance);
                                                        setFormData(alliance);
                                                        setShowModal(true);
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-[#1A1A1A] hover:bg-[#202020] text-gray-400 hover:text-white rounded-none text-[9px] font-bold uppercase tracking-widest transition-all border border-exec-border flex items-center justify-center gap-2"
                                                >
                                                    <Edit2 className="w-3 h-3" /> Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(alliance.id)}
                                                    className="px-3 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-none border border-red-500/10 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal IA (Unified) */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[150] p-4" onClick={() => setShowAiModal(false)}>
                    <div className="bg-[#050505] border border-exec-border rounded-none max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-[#0A0A0A] flex items-center justify-between border-b border-exec-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                                    <span className="material-symbols-outlined notranslate text-exec-blue text-[20px]" translate="no">smart_toy</span>
                                </div>
                                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">Asistente de Inteligencia Artificial</h3>
                            </div>
                            <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-white/5 rounded-none transition-colors group">
                                <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
                            </button>
                        </div>
                        
                        <div className="p-8">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6 leading-relaxed">
                                Describe la alianza estratégica que deseas formalizar y el sistema generará la estructura ejecutiva de alto nivel.
                            </p>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="EJ: ALIANZA CON LA UNIVERSIDAD NACIONAL PARA PRÁCTICAS PROFESIONALES..."
                                className="w-full p-4 bg-[#0D0D0D] border border-exec-border rounded-none mb-6 text-white placeholder-gray-800 focus:border-exec-blue/50 outline-none transition-all text-[11px] uppercase tracking-widest min-h-[120px] resize-none"
                                rows={4}
                            />

                            <AIEngineSelector 
                                config={aiConfig}
                                onConfigChange={setAiConfig}
                            />

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setShowAiModal(false)}
                                    className="flex-1 px-4 py-3 border border-exec-border text-gray-500 hover:text-white hover:bg-[#111] rounded-none transition-all text-[11px] font-bold uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGenerateAlliance}
                                    disabled={isGenerating || !aiPrompt.trim()}
                                    className="flex-[2] px-4 py-3 bg-white hover:bg-gray-100 text-black rounded-none disabled:opacity-50 transition-all text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] group"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-exec-blue" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined notranslate text-exec-blue text-[18px]" translate="no">smart_toy</span>
                                            Generar Propuesta
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[#0D0D0D] border border-exec-border rounded-none w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-5 border-b border-exec-border flex justify-between items-center bg-[#050505]">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                                {editingAlliance ? 'Actualizar Alianza' : 'Registrar Nueva Alianza'}
                            </h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowAiModal(true)}
                                    className="px-3 py-1.5 bg-white text-black hover:bg-gray-100 rounded-none flex items-center gap-2 transition-all text-[9px] font-black uppercase tracking-widest border border-exec-blue/10 shadow-lg group"
                                >
                                    <span className="material-symbols-outlined notranslate text-exec-blue text-[16px]" translate="no">smart_toy</span>
                                    Asistente IA
                                </button>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-none transition-colors group">
                                    <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-[#0D0D0D]">
                            {/* Cover Image Upload */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Imagen de Portada Corporativa</label>
                                <div className="flex items-center gap-6 p-4 bg-[#050505] border border-exec-border rounded-none">
                                    <div className="relative w-32 h-20 rounded-none overflow-hidden bg-black border border-exec-border flex-shrink-0 shadow-inner flex items-center justify-center p-2">
                                        {formData.cover_url ? (
                                            <img src={formData.cover_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-800">
                                                <Handshake className="w-8 h-8 opacity-20" />
                                            </div>
                                        )}
                                        {uploadingCover && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-exec-blue animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="cursor-pointer inline-flex items-center gap-2.5 px-4 py-2.5 bg-exec-blue/10 hover:bg-exec-blue/20 text-exec-blue rounded-none border border-exec-blue/20 transition-all text-[10px] font-bold uppercase tracking-widest">
                                            <Upload className="w-4 h-4" />
                                            Sincronizar Archivo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileUpload(file, 'alliance-covers', 'cover_url');
                                                }}
                                            />
                                        </label>
                                        <p className="mt-2 text-[9px] text-gray-600 uppercase tracking-widest leading-relaxed">
                                            Formatos admitidos: JPG, PNG. Resolución recomendada 1200x600px.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Título del Convenio</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#151515] border border-exec-border rounded-none text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/10 outline-none transition-all text-[11px] uppercase tracking-widest placeholder:text-gray-800"
                                        placeholder="EJ. CONVENIO MARCO DE COOPERACIÓN"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Entidad Colaboradora</label>
                                    <input
                                        type="text"
                                        value={formData.institution || ''}
                                        onChange={e => setFormData({ ...formData, institution: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#151515] border border-exec-border rounded-none text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/10 outline-none transition-all text-[11px] uppercase tracking-widest placeholder:text-gray-800"
                                        placeholder="EJ. UNIVERSIDAD NACIONAL..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Memoria Descriptiva</label>
                                    <div className="flex bg-black border border-exec-border p-0.5">
                                        <button 
                                            onClick={() => setIsPreview(false)}
                                            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${!isPreview ? 'bg-exec-blue text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            onClick={() => setIsPreview(true)}
                                            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${isPreview ? 'bg-exec-blue text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            Vista Previa
                                        </button>
                                    </div>
                                </div>
                                
                                {isPreview ? (
                                    <div className="w-full px-4 py-3 bg-[#0D0D0D] border border-exec-border rounded-none text-white min-h-[150px] max-h-[300px] overflow-y-auto news-content">
                                        <ReactMarkdown>{formData.description || '*Sin contenido para mostrar*'}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={5}
                                        className="w-full px-4 py-3 bg-[#151515] border border-exec-border rounded-none text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/10 outline-none transition-all text-[11px] uppercase tracking-widest placeholder:text-gray-800 resize-none leading-relaxed"
                                        placeholder="DETALLES ESTRATÉGICOS DEL ACUERDO, BENEFICIOS MUTUOS Y VIGENCIA (SOPORTA MARKDOWN)..."
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado Operativo</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-[#151515] border border-exec-border rounded-none text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/10 outline-none transition-all text-[11px] uppercase tracking-widest"
                                    >
                                        <option value="Activo">ACTIVO / VIGENTE</option>
                                        <option value="En Negociación">EN NEGOCIACIÓN</option>
                                        <option value="Finalizado">FINALIZADO / ARCHIVADO</option>
                                    </select>
                                </div>

                                {/* Contract PDF Upload */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Documentación Oficial (PDF)</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer flex items-center justify-center gap-2.5 px-4 py-3 bg-[#050505] hover:bg-[#111] text-gray-400 hover:text-white rounded-none border border-exec-border transition-all text-[10px] font-bold uppercase tracking-widest">
                                            {uploadingContract ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-exec-blue" />
                                            ) : (
                                                <Upload className="w-4 h-4" />
                                            )}
                                            {formData.contract_url ? 'Actualizar Documento' : 'Vincular PDF'}
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileUpload(file, 'alliance-contracts', 'contract_url');
                                                }}
                                            />
                                        </label>
                                        {formData.contract_url && (
                                            <a
                                                href={formData.contract_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-exec-blue/5 text-exec-blue hover:bg-exec-blue/10 border border-exec-blue/20 rounded-none transition-all shadow-[0_0_15px_rgba(0,136,255,0.05)]"
                                                title="Previsualizar Documento"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </a>
                                        )}
                                    </div>
                                    {formData.contract_url && (
                                        <p className="text-[9px] text-exec-green/80 font-bold flex items-center gap-1.5 uppercase tracking-widest bg-exec-green/5 p-2 rounded-none border border-exec-green/10">
                                            <CheckCircle className="w-3 h-3 text-exec-green" /> Verificación del Archivo Completada
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-exec-border bg-[#050505] flex justify-end gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.3)]">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-none text-[11px] font-bold uppercase tracking-[0.2em] transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-8 py-3 bg-exec-blue hover:bg-blue-500 text-white rounded-none font-bold shadow-[0_0_20px_rgba(0,136,255,0.2)] hover:shadow-[0_0_30px_rgba(0,136,255,0.4)] transition-all text-[11px] uppercase tracking-widest flex items-center gap-3"
                            >
                                <Save className="w-4 h-4" />
                                Confirmar Datos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ver Detalles (Solo Lectura) */}
            {viewingAlliance && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setViewingAlliance(null)}>
                    <div className="bg-[#0D0D0D] border border-exec-border rounded-none w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="relative h-72 bg-[#050505] flex items-center justify-center p-8">
                            {viewingAlliance.cover_url ? (
                                <img src={viewingAlliance.cover_url} alt={viewingAlliance.title} className="max-w-full max-h-full object-contain opacity-90" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-800">
                                    <Handshake className="w-20 h-20 opacity-10" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] to-transparent opacity-40 pointer-events-none" />
                            <button
                                onClick={() => setViewingAlliance(null)}
                                className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-white/10 text-white rounded-none transition-all backdrop-blur-md border border-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-8 left-8">
                                <span className={`px-3 py-1 rounded-none text-[9px] font-black border shadow-xl uppercase tracking-widest backdrop-blur-md ${getStatusColor(viewingAlliance.status)}`}>
                                    {viewingAlliance.status}
                                </span>
                            </div>
                        </div>

                        <div className="p-10 space-y-10">
                            <div>
                                <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter leading-tight">
                                    {viewingAlliance.title}
                                </h2>
                                <p className="text-[11px] font-black text-exec-blue uppercase tracking-[0.2em]">
                                    {viewingAlliance.institution}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-exec-border pb-2">Propuesta Estratégica</h3>
                                <div className="news-content max-w-none">
                                    <ReactMarkdown>{viewingAlliance.description || ''}</ReactMarkdown>
                                </div>
                            </div>

                            {viewingAlliance.contract_url && (
                                <div className="bg-[#050505] rounded-none p-6 border border-exec-border flex items-center justify-between group">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-red-500/10 rounded-none text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">Certificación del Convenio</h4>
                                            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black">Documentación Técnica Validada (PDF)</p>
                                        </div>
                                    </div>
                                    <a
                                        href={viewingAlliance.contract_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-5 py-2.5 bg-exec-blue hover:bg-blue-500 text-white rounded-none font-bold transition-all text-[10px] uppercase tracking-widest flex items-center gap-2.5 shadow-[0_0_15px_rgba(0,136,255,0.2)]"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Abrir Archivo
                                    </a>
                                </div>
                            )}

                            <div className="pt-8 border-t border-exec-border flex justify-end">
                                <button
                                    onClick={() => setViewingAlliance(null)}
                                    className="px-8 py-3 bg-[#111] hover:bg-[#1A1A1A] text-gray-500 hover:text-white rounded-none font-black transition-all text-[10px] uppercase tracking-widest border border-exec-border"
                                >
                                    Cerrar Vista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};
