import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateProposalContent, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { Calendar, User, Paperclip, X, Sparkles, Bot, Loader2, Plus, ArrowRight, FileText, Check, AlertCircle, ShieldAlert, Cpu, Activity, Target, Zap, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getUserColor } from '../../lib/userColors';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';

interface Proposal {
  id: string;
  title: string;
  description: string;
  file_urls: string[] | null;
  created_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  ai_metadata?: {
    generated_by_hoyr?: boolean;
    model?: string;
    timestamp?: string;
  };
  tactical_metadata?: {
    objective?: string;
    impact?: string;
    resources?: string[];
    risk_level?: 'Bajo' | 'Medio' | 'Alto';
  };
  reviewed_by?: string;
  reviewed_at?: string;
  creator?: { 
    full_name: string;
    avatar_url?: string;
  };
  reviewer?: { 
    full_name: string;
    avatar_url?: string;
  };
}

export const ProposalsView: React.FC = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [form, setForm] = useState({
    title: '',
    description: '',
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const { showToast } = useToast();

  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.action === 'create' && location.state?.data) {
      setForm(prev => ({
        ...prev,
        title: location.state.data.title || '',
        description: location.state.data.description || '',
      }));
      setShowCreate(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Remove unused toast effect

  const load = async () => {
    setLoading(true);
    try {
      // Get user role
      if (user?.id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(userData?.role || '');
      }

      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id, title, description, file_urls, created_by, status, created_at, updated_at,
          ai_metadata, tactical_metadata, reviewed_by, reviewed_at,
          creator:profiles!created_by("fullName", "avatarUrl"),
          reviewer:profiles!reviewed_by("fullName", "avatarUrl")
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('PGRST Error loading proposals:', error);
        throw error;
      }
      
      setProposals(((data || []) as any[]).map(p => ({
        ...p,
        creator: p.creator ? { 
          full_name: p.creator.fullName,
          avatar_url: p.creator.avatarUrl 
        } : undefined,
        reviewer: p.reviewer ? { 
          full_name: p.reviewer.fullName,
          avatar_url: p.reviewer.avatarUrl
        } : undefined
      })));
    } catch (e: any) {
      console.error('Critical error in load proposals:', e);
      // Fallback safe mapping if something partially loaded
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('proposals-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proposals' }, (payload) => {
        const newProposal = payload.new as any;
        if (newProposal.created_by !== user?.id) {
          showToast({
            type: 'info',
            title: 'NUEVA PROPUESTA',
            message: `${newProposal.title || 'Se ha recibido una nueva propuesta estratégica.'}`,
            duration: 6000
          });
        }
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'proposals' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'proposals' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, showToast]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      showToast({ type: 'error', title: 'ERROR', message: 'Título y descripción son obligatorios' });
      return;
    }
    setUploading(true);
    try {
      let fileUrls: string[] = [];
      if (files && files.length > 0) {
        const bucket = supabase.storage.from('proposals');
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = `${Date.now()}-${file.name}`;
          const { error: uploadError } = await bucket.upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = bucket.getPublicUrl(fileName);
          fileUrls.push(publicUrl);
        }
      }

      const { error } = await supabase.from('proposals').insert({
        title: form.title,
        description: form.description,
        file_urls: fileUrls.length > 0 ? fileUrls : null,
        created_by: user?.id,
        status: 'Pendiente',
      });
      if (error) throw error;
      setShowCreate(false);
      setForm({ title: '', description: '' });
      setFiles(null);
      showToast({ type: 'success', title: 'ÉXITO', message: 'Propuesta creada correctamente' });
      await load();
    } catch (e: any) {
      console.error('Error creating proposal:', e);
      showToast({ type: 'error', title: 'ERROR', message: `No se pudo crear: ${e?.message || 'Error desconocido'}` });
    } finally {
      setUploading(false);
    }
  };

  const deleteProposal = async (id: string) => {
    try {
      const { error } = await supabase.from('proposals').delete().eq('id', id);

      if (error) {
        console.error('Error al eliminar propuesta:', error);
        if (error.code === 'PGRST301' || error.code === '42501') {
          showToast({
            type: 'error',
            title: 'ACCESO DENEGADO',
            message: 'No tienes permisos para eliminar esta propuesta.'
          });
          return;
        }
        showToast({
          type: 'error',
          title: 'ERROR',
          message: `Error: ${error.message || 'No se pudo eliminar'}`
        });
        return;
      }
 
      showToast({ type: 'success', title: 'ELIMINADO', message: 'Propuesta eliminada correctamente' });
      if (selectedProposal?.id === id) setSelectedProposal(null);
      await load();
    } catch (e: any) {
      showToast({ type: 'error', title: 'SISTEMA', message: 'Error inesperado al eliminar' });
    }
  };

  const updateProposalStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      showToast({ type: 'success', title: 'ESTADO ACTUALIZADO', message: `Propuesta marcada como ${newStatus.toLowerCase()}` });
      if (selectedProposal?.id === id) {
        setSelectedProposal({ ...selectedProposal, status: newStatus });
      }
      await load();
    } catch (e: any) {
      showToast({ type: 'error', title: 'ERROR', message: `No se pudo actualizar: ${e?.message || ''}` });
    }
  };

  const handleGenerateProposal = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const result = await generateProposalContent(aiPrompt, { user_role: userRole }, aiConfig);

      if (result) {
        setForm({
          ...form,
          title: result.title || '',
          description: result.description || '',
        });
        showToast({ type: 'success', title: 'IA GENERADORA', message: 'Propuesta redactada con éxito' });
        setShowAiModal(false);
        setAiPrompt('');
        setShowCreate(true);
      } else {
        showToast({
          type: 'error',
          title: 'ERROR IA',
          message: 'La IA no devolvió resultados válidos.'
        });
      }
    } catch (e: any) {
      console.error(e);
      showToast({ type: 'error', title: 'ERROR IA', message: e.message || 'Fallo durante el procesamiento de IA' });
    } finally {
      setGeneratingAi(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprobada': return 'text-green-400 bg-green-900/40 border-green-800/50 shadow-[0_0_10px_rgba(74,222,128,0.2)]';
      case 'Rechazada': return 'text-red-400 bg-red-900/40 border-red-800/50 shadow-[0_0_10px_rgba(248,113,113,0.2)]';
      case 'En revisión': return 'text-blue-400 bg-blue-900/40 border-blue-800/50 shadow-[0_0_10px_rgba(96,165,250,0.2)]';
      default: return 'text-yellow-400 bg-yellow-900/40 border-yellow-800/50 shadow-[0_0_10px_rgba(250,204,21,0.2)]';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white px-6 pt-2 pb-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-exec-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
             <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                <Lightbulb className="w-6 h-6 text-exec-blue" />
             </div>
             <span>Gestión de <span className="text-exec-blue">Propuestas</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Gestiona y revisa las propuestas estratégicas del equipo.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-none bg-white hover:bg-gray-100 text-black border border-exec-border transition-all duration-300 text-[11px] font-bold uppercase tracking-widest shadow-lg group"
          >
            <span className="material-symbols-outlined notranslate text-exec-blue text-[18px]" translate="no">smart_toy</span>
            <span>Asistente IA</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-none bg-exec-blue hover:bg-blue-500 text-white transition-all shadow-lg shadow-exec-blue/20 text-[11px] font-bold uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Propuesta</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-exec-gray rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-exec-gray/30 rounded-none">
          <FileText className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No hay propuestas aún</h3>
          <p className="text-gray-600 mb-6">Sé el primero en crear una propuesta estratégica.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-exec-gray/20 text-white rounded-none hover:bg-exec-gray/30 transition-colors border border-exec-gray/50"
          >
            Crear Propuesta
          </button>
        </div>
      ) : (
        /* Proposals Grid */
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {proposals.map(p => {
            const createdByColor = p.created_by ? getUserColor(p.created_by) : '#6366F1';
            return (
              <div
                key={p.id}
                className="exec-card group relative flex flex-col p-6 h-full cursor-pointer bg-[#0A0A0A] hover:bg-[#111] border border-exec-border hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-none"
                onClick={() => setSelectedProposal(p)}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-none border ${getStatusColor(p.status)}`}
                  >
                    {p.status}
                  </div>
                  {p.file_urls && p.file_urls.length > 0 && (
                    <Paperclip className="w-4 h-4 text-gray-500" />
                  )}
                </div>

                <h3 className="text-lg font-medium text-white mb-2 line-clamp-2 leading-tight group-hover:text-exec-blue transition-colors">
                  {p.title}
                </h3>

                <p className="text-gray-400 text-sm line-clamp-3 mb-6 flex-1 font-light">
                  {p.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-exec-border mt-auto">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden border border-exec-border/30"
                      style={{ backgroundColor: createdByColor }}
                    >
                      {p.creator?.avatar_url ? (
                        <img 
                          src={p.creator.avatar_url} 
                          alt={p.creator.full_name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        p.creator?.full_name?.charAt(0) || <User className="w-3 h-3" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">Autor</span>
                      <span className="text-xs text-gray-300 font-medium truncate max-w-[100px]">
                        {p.creator?.full_name?.split(' ')[0] || 'Anónimo'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Local toast logic removed, using useToast global instead */}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-exec-border rounded-none shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-exec-blue/20 to-blue-900/20 px-6 py-4 border-b border-exec-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                  <span className="material-symbols-outlined notranslate text-exec-blue text-[20px]" translate="no">smart_toy</span>
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tighter">Asistente de Propuestas <span className="text-exec-blue">IA</span></h3>
                  <p className="text-[10px] text-exec-blue/60 uppercase font-black tracking-widest">Powered by Gemini AI</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tu Idea</label>
                <div className="space-y-4">
                  <textarea
                    className="w-full bg-[#111] border border-exec-border rounded-none p-4 h-40 focus:border-exec-blue outline-none resize-none text-white placeholder-gray-600 transition-all font-medium"
                    placeholder="Ej: 'Crea una propuesta para remodelar la cafetería de la facultad incluyendo costos estimados y beneficios para los estudiantes...'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <AIEngineSelector 
                    config={aiConfig} 
                    onConfigChange={setAiConfig} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  onClick={() => setShowAiModal(false)}
                  disabled={generatingAi}
                >
                  Cancelar
                </button>
                <button
                  className="px-6 py-2 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-none hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  onClick={handleGenerateProposal}
                  disabled={generatingAi || !aiPrompt.trim()}
                >
                  {generatingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-exec-blue" />
                      Redactando...
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-exec-border rounded-none shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-exec-border bg-[#0F0F0F]">
              <div>
                <h2 className="text-xl font-medium text-white">Nueva Propuesta</h2>
                <p className="text-xs text-gray-500 mt-1">Comparte tus iniciativas estratégicas</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowCreate(false); setShowAiModal(true); }}
                  className="px-3 py-1.5 bg-white border border-exec-blue/10 text-black rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 flex items-center gap-1.5 transition-all shadow-sm group"
                >
                  <span className="material-symbols-outlined notranslate text-exec-blue text-[16px]" translate="no">smart_toy</span>
                  Usar IA
                </button>
                <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Título</label>
                <input
                  className="exec-input w-full p-2.5"
                  placeholder="Título breve y claro"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Descripción Detallada</label>
                  <div className="flex bg-black border border-exec-border p-0.5">
                    <button 
                      type="button"
                      onClick={() => setIsPreview(false)}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${!isPreview ? 'bg-exec-blue text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Editar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsPreview(true)}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${isPreview ? 'bg-exec-blue text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Vista Previa
                    </button>
                  </div>
                </div>

                {isPreview ? (
                  <div className="w-full bg-black border border-exec-border p-4 h-44 overflow-y-auto news-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {form.description || '*Sin descripción para mostrar*'}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="exec-input w-full p-3 h-44 resize-none"
                    placeholder="Describe los objetivos, alcance y beneficios (soporta Markdown)..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Archivos Adjuntos</label>
                <div className="relative border border-dashed border-exec-gray rounded-none bg-[#111] p-6 text-center hover:border-gray-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setFiles(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <Paperclip className="w-8 h-8 text-exec-gray" />
                    <span className="text-sm text-gray-400">Arrastra archivos o haz clic para subir</span>
                    {files && files.length > 0 && (
                      <span className="text-xs text-exec-blue font-medium mt-1 bg-exec-blue/10 px-2 py-0.5 rounded-none">
                        {files.length} archivo(s) seleccionado(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-exec-border mt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 border border-exec-border text-gray-400 rounded-none hover:bg-[#151515] hover:text-white transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={uploading || !form.title || !form.description}
                  className="flex-1 px-4 py-2.5 bg-white text-black rounded-none hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm tracking-wide shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                >
                  {uploading ? 'Procesando...' : 'Crear Propuesta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-exec-border rounded-none shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-exec-border bg-[#0F0F0F] flex items-start justify-between gap-4 sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-semibold text-white leading-tight">{selectedProposal.title}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <div
                    className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-none border ${getStatusColor(selectedProposal.status)}`}
                  >
                    {selectedProposal.status}
                  </div>
                  <span className="text-gray-500 text-sm">|</span>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-5 h-5 rounded-none overflow-hidden flex items-center justify-center text-[8px] font-bold text-white border border-exec-border/50"
                        style={{ backgroundColor: selectedProposal.created_by ? getUserColor(selectedProposal.created_by) : '#333' }}
                      >
                        {selectedProposal.creator?.avatar_url ? (
                          <img src={selectedProposal.creator.avatar_url} alt="" className="w-full h-full object-cover rounded-none" />
                        ) : (
                          selectedProposal.creator?.full_name?.charAt(0) || '?'
                        )}
                      </div>
                      <span style={{ color: selectedProposal.created_by ? getUserColor(selectedProposal.created_by) : '#888' }}>
                        {selectedProposal.creator?.full_name || 'Anónimo'}
                      </span>
                    </div>
                    <span className="w-1 h-1 bg-gray-600 rounded-none"></span>
                    <span title={selectedProposal.created_at}>
                      {new Date(selectedProposal.created_at).toLocaleString('es-ES', { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit', 
                        fractionalSecondDigits: 3 
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {selectedProposal.ai_metadata?.generated_by_hoyr && (
                   <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-[10px] text-exec-blue font-black uppercase tracking-widest bg-exec-blue/10 px-2 py-0.5 border border-exec-blue/20">
                         <Cpu size={10} /> PRODUCIDO POR HOYR
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5 font-mono">{selectedProposal.ai_metadata.model}</span>
                   </div>
                )}
                <button onClick={() => setSelectedProposal(null)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-10">
              {/* Tarjeta de Operación Táctica */}
              <div className="bg-[#0D0D0D] border border-exec-border p-6 rounded-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <ShieldAlert size={80} />
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Activity size={14} className="text-exec-blue" />
                  TARJETA DE OPERACIÓN TÁCTICA v2.6
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                   <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Objetivo de Misión</label>
                        <p className="text-sm text-gray-300 font-medium leading-relaxed">
                          {selectedProposal.tactical_metadata?.objective || "Sin objetivo definido."}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Impacto Operativo</label>
                        <p className="text-sm text-gray-300 font-medium">
                          {selectedProposal.tactical_metadata?.impact || "Sin impacto definido."}
                        </p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Recursos Necesarios</label>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(selectedProposal.tactical_metadata?.resources) && selectedProposal.tactical_metadata.resources.length > 0 ? (
                            selectedProposal.tactical_metadata.resources.map((res: string, idx: number) => (
                              <span key={idx} className="bg-exec-gray/20 text-[10px] text-gray-400 px-2 py-0.5 border border-exec-border">
                                {res}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-600 italic">No especificados</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Nivel de Riesgo</label>
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-none ${
                             selectedProposal.tactical_metadata?.risk_level === 'Alto' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                             selectedProposal.tactical_metadata?.risk_level === 'Medio' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
                             'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                           }`}></div>
                           <span className={`text-xs font-bold uppercase ${
                             selectedProposal.tactical_metadata?.risk_level === 'Alto' ? 'text-red-400' :
                             selectedProposal.tactical_metadata?.risk_level === 'Medio' ? 'text-yellow-400' :
                             'text-green-400'
                           }`}>
                             {selectedProposal.tactical_metadata?.risk_level || 'BAJO'}
                           </span>
                        </div>
                      </div>
                   </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-exec-border pb-2 flex items-center gap-2">
                  <Target size={16} className="text-exec-blue" />
                  DESARROLLO DE LA PROPUESTA
                </h3>
                <div className="news-content text-gray-300 leading-relaxed text-[15px] max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedProposal.description}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Registro de Auditoría Detallada */}
              <div className="border-t border-exec-border pt-8">
                 <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4">LOGS DE AUDITORÍA DE MISIÓN</h3>
                 <div className="space-y-3 font-mono">
                    <div className="flex items-center gap-4 text-[11px]">
                       <div className="w-32 text-gray-500 shrink-0 uppercase tracking-tighter">CREACIÓN:</div>
                       <div className="flex-1 flex gap-4 text-gray-400">
                          <span>{selectedProposal.creator?.full_name}</span>
                          <span className="text-indigo-900">|</span>
                          <span className="text-gray-300">{selectedProposal.created_at}</span>
                       </div>
                    </div>
                    {selectedProposal.status !== 'Pendiente' && selectedProposal.reviewed_at && (
                       <div className="flex items-center gap-4 text-[11px]">
                          <div className="w-32 text-gray-500 shrink-0 uppercase tracking-tighter">REVISIÓN:</div>
                          <div className="flex-1 flex gap-4 text-gray-400">
                             <span className={selectedProposal.status === 'Aprobada' ? 'text-green-500' : 'text-red-500'}>
                                {selectedProposal.reviewer?.full_name || 'Sistema'}
                             </span>
                             <span className="text-exec-border">|</span>
                             <span className="text-gray-100">{selectedProposal.reviewed_at}</span>
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              {selectedProposal.file_urls && selectedProposal.file_urls.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-exec-border pb-2">
                    Archivos Adjuntos
                  </h3>
                  <div className="grid gap-2">
                    {selectedProposal.file_urls.map((url, i) => {
                      const fileName = url.split('/').pop() || `Archivo ${i + 1}`;
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#111] border border-exec-border rounded-none hover:border-gray-600 transition-colors group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-[#1A1A1A] rounded-none">
                              <FileText className="w-5 h-5 text-exec-blue" />
                            </div>
                            <span className="text-sm text-gray-300 font-medium truncate">{fileName}</span>
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 text-xs bg-[#1A1A1A] text-white border border-exec-border rounded-none hover:bg-white hover:text-black transition-all"
                          >
                            Ver Archivo
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {(userRole === 'Director' || userRole === 'Asesor') && selectedProposal.status !== 'Aprobada' && selectedProposal.status !== 'Rechazada' && (
                <div className="border-t border-exec-border pt-6 mt-8">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Revisión Ejecutiva</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedProposal.status !== 'En revisión' && (
                      <button
                        onClick={() => updateProposalStatus(selectedProposal.id, 'En revisión')}
                        className="px-5 py-2 bg-blue-500/10 border border-blue-500/50 text-blue-400 rounded-none hover:bg-blue-500/20 text-sm font-medium transition-all"
                      >
                        Marcar en Revisión
                      </button>
                    )}
                    <button
                      onClick={() => updateProposalStatus(selectedProposal.id, 'Aprobada')}
                      className="px-5 py-2 bg-green-500/10 border border-green-500/50 text-green-400 rounded-none hover:bg-green-500/20 text-sm font-medium transition-all flex-1 sm:flex-none text-center"
                    >
                      Aprobar Propuesta
                    </button>
                    <button
                      onClick={() => updateProposalStatus(selectedProposal.id, 'Rechazada')}
                      className="px-5 py-2 bg-red-500/10 border border-red-500/50 text-red-400 rounded-none hover:bg-red-500/20 text-sm font-medium transition-all flex-1 sm:flex-none text-center"
                    >
                      Rechazar Propuesta
                    </button>
                  </div>
                </div>
              )}

              {/* Delete button */}
              {(user?.id === selectedProposal.created_by || userRole === 'Director') && (
                <div className="border-t border-exec-border pt-6">
                  <button
                    onClick={() => {
                      setShowConfirmDelete(selectedProposal.id);
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-red-900/50 text-red-500 rounded-none hover:bg-red-950/30 text-xs font-medium flex items-center justify-center gap-2 transition-colors ml-auto"
                  >
                    <X className="w-3 h-3" />
                    ELIMINAR PROPUESTA PERMANENTEMENTE
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={!!showConfirmDelete}
        title="¿Eliminar Propuesta?"
        message="Esta acción no se puede deshacer. La propuesta técnica será eliminada permanentemente del sistema estratégico."
        confirmText="Eliminar Propuesta"
        cancelText="Conservar"
        isDestructive={true}
        onConfirm={() => {
          if (showConfirmDelete) {
            deleteProposal(showConfirmDelete);
            setShowConfirmDelete(null);
          }
        }}
        onCancel={() => setShowConfirmDelete(null)}
      />
    </div>
  );
};
