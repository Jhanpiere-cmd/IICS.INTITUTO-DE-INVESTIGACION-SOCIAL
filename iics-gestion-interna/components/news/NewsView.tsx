import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfirmModal } from '../ui/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateNewsContent, generateImagePrompt, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import ReactMarkdown from 'react-markdown';
import { Calendar, User, X, Image as ImageIcon, Upload, Bot, Loader2, Copy, Check, Sparkles, Newspaper, Trash2, Edit2, ExternalLink, ChevronRight } from 'lucide-react';
import { getUserColor, getUserGlow } from '../../lib/userColors';
import { useToast } from '../ui/ToastContext';

interface News {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  published_by: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  image_url: string | null;
  publisher?: { fullName?: string; full_name?: string; avatarUrl?: string | null; avatar_url?: string | null };
}

export const NewsView: React.FC = () => {
  const { user } = useAuth();
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'General',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

  // Image Prompt State
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  // Removed local toast effect

  const location = useLocation();

  useEffect(() => {
    if (location.state?.action === 'create' && location.state?.data) {
      setForm(prev => ({
        ...prev,
        title: location.state.data.title || '',
        content: location.state.data.content || '',
        category: location.state.data.category || 'General'
      }));
      setShowCreate(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select(`
          id, title, summary, content, category, published_by, status, published_at, created_at, image_url,
          publisher:published_by(*)
        `)
        .eq('status', 'Publicado')
        .order('published_at', { ascending: false });
      if (error) throw error;
      setNewsList((data || []) as unknown as News[]);
    } catch (e) {
      console.error('Error loading news:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('news-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news' }, (payload) => {
        const newNews = payload.new as any;
        if (newNews.published_by !== user?.id && newNews.status === 'Publicado') {
          showToast({
            type: 'info',
            title: 'NUEVA NOTICIA',
            message: `${newNews.title || 'Se ha publicado un nuevo comunicado.'}`,
            duration: 7000
          });
        }
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'news' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'news' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, showToast]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast({ type: 'error', title: 'DATOS INCOMPLETOS', message: 'Título y contenido son obligatorios' });
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;

      // Subir imagen si existe
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `news-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // Insertar noticia
      const { error } = await supabase.from('news').insert({
        title: form.title,
        summary: form.content.substring(0, 150),
        content: form.content,
        category: form.category || 'General',
        published_by: user?.id,
        status: 'Publicado',
        published_at: new Date().toISOString(),
        image_url: imageUrl,
      });

      if (error) throw error;

      setShowCreate(false);
      setForm({ title: '', content: '', category: 'General' });
      setImageFile(null);
      setImagePreview(null);
      showToast({ type: 'success', title: 'PUBLICADO', message: 'Noticia publicada con éxito en el portal' });
      await load();

    } catch (e: any) {
      showToast({ type: 'error', title: 'ERROR DE PUBLICACIÓN', message: `No se pudo publicar: ${e?.message || 'Error desconocido'}` });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateNews = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const { data: files } = await supabase.storage.from('resources').list('', { limit: 100 });
      const resourceNames = files?.map(f => f.name).filter(n => n !== '.keep') || [];

      const userContext = {
        name: user?.user_metadata?.full_name || user?.email || 'Usuario',
        role: user?.user_metadata?.role || 'Estudiante/Miembro'
      };

      const result = await generateNewsContent(aiPrompt, {
        user: userContext,
        resources: resourceNames
      }, aiConfig);

      if (result) {
        setForm({
          title: result.title || '',
          content: result.content || '',
          category: result.category || 'General',
        });

        setShowAiModal(false);
        setAiPrompt('');
        setShowCreate(true);
        showToast({ type: 'success', title: 'IA', message: 'Noticia generada con IA' });
      } else {
        showToast({ type: 'error', title: 'ERROR IA', message: 'No se pudo generar la noticia. Intenta con otro tema.' });
      }
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', title: 'EXPLOTÓ', message: 'Error al generar con IA' });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedImagePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
    showToast({ type: 'success', title: 'COPIADO', message: 'Prompt copiado al portapapeles' });
  };

  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);

        if (error) {
          console.error('Error al eliminar noticia:', error);
          if (error.code === 'PGRST301' || error.code === '42501') {
            showToast({
              type: 'error',
              title: 'PERMISOS',
              message: 'No tienes permisos para eliminar esta noticia.'
            });
            return;
          }
          showToast({
            type: 'error',
            title: 'ERROR',
            message: `Error: ${error.message || 'No se pudo eliminar la noticia'}`
          });
          return;
        }
        showToast({ type: 'success', title: 'ELIMINADO', message: 'Noticia eliminada exitosamente' });
        await load();
      } catch (e: any) {
        console.error('Error inesperado al eliminar:', e);
        showToast({ type: 'error', title: 'FATAL', message: 'Error inesperado al eliminar la noticia' });
      }
    };

  return (
    <div className="p-4 md:pt-4 md:px-6 space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-exec-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <Newspaper className="w-6 h-6 text-exec-blue" />
            </div>
            <span>Noticias y <span className="text-exec-blue">Comunicados</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Difusión estratégica de actualizaciones y comunicados corporativos.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group"
          >
            <Bot size={16} className="text-exec-blue" />
            <span>Redactar con IA</span>
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            <span>Publicar Noticia</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="h-8 w-8 border-2 border-exec-blue border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-gray-400 animate-pulse uppercase tracking-widest">Cargando noticias...</p>
        </div>
      )}

      {/* News Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 place-items-stretch">
        {!loading && newsList.map(n => {
          const publisherColor = n.published_by ? getUserColor(n.published_by) : '#6366F1';
          return (
            <div
              key={n.id}
              className="group relative bg-[#0A0A0A] border border-exec-border rounded-none overflow-hidden hover:border-exec-blue/50 transition-all duration-300 flex flex-col h-full hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] cursor-pointer"
              onClick={() => setSelectedNews(n)}
            >
              {/* Image Area */}
              <div className="w-full aspect-video overflow-hidden relative border-b border-exec-border bg-[#050505]">
                {n.image_url ? (
                  <img
                    src={n.image_url}
                    alt={n.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-[#0A0A0A]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#111] to-[#050505]"></div>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-exec-blue/40 via-transparent to-transparent"></div>
                    <ImageIcon className="w-12 h-12 text-gray-800 relative z-10 opacity-50 group-hover:text-gray-600 transition-colors" />
                  </div>
                )}
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-none bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-sm">
                    {n.category}
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-exec-blue transition-colors">
                  {n.title}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-3 mb-4 leading-relaxed flex-1">
                  {n.summary || n.content.substring(0, 100)}...
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-exec-border mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-none border border-gray-700 overflow-hidden flex items-center justify-center text-[10px] font-bold bg-[#111]">
                      {(n.publisher?.avatar_url || n.publisher?.avatarUrl) ? (
                        <img src={n.publisher.avatar_url || n.publisher.avatarUrl || ''} alt="" className="w-full h-full object-cover rounded-none" />
                      ) : (
                        <span style={{ color: publisherColor }}>{(n.publisher?.fullName || n.publisher?.full_name || 'A').charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-300 font-medium truncate max-w-[100px]">{n.publisher?.fullName || n.publisher?.full_name || 'Usuario'}</span>
                      <span className="text-[10px] text-gray-600">{new Date(n.published_at || n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Read More Icon */}
                  <div className="w-8 h-8 rounded-none bg-[#111] border border-exec-border flex items-center justify-center group-hover:bg-exec-blue group-hover:border-exec-blue group-hover:text-white transition-all text-gray-500">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {newsList.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-[#222] rounded-none bg-[#0E0E0E] text-gray-500">
            <Newspaper className="w-16 h-16 mb-4 text-[#222]" />
            <p className="font-medium text-gray-400">No hay noticias publicadas</p>
            <p className="text-xs mt-1">Sé el primero en publicar algo interesante.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-exec-border rounded-none shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-exec-border sticky top-0 bg-[#0A0A0A] z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Redactar Noticia</h3>
                <p className="text-sm text-gray-400">Comparte información relevante con el equipo.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Título</label>
                  <input
                    className="exec-input p-3 text-lg font-medium"
                    placeholder="Escribe un título atractivo..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Categoría</label>
                    <select
                      className="exec-input p-3"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="General">General</option>
                      <option value="Evento">Evento</option>
                      <option value="Anuncio">Anuncio</option>
                      <option value="Comunicado">Comunicado</option>
                      <option value="Actividad">Actividad</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Imagen de portada</label>
                    <button
                      onClick={async () => {
                        if (!form.content) {
                          showToast({ type: 'error', title: 'DATOS', message: 'Escribe contenido para generar el prompt' });
                          return;
                        }
                        setGeneratingAi(true);
                        try {
                          const prompt = await generateImagePrompt(form.content, aiConfig);
                          if (prompt) {
                            setGeneratedImagePrompt(prompt);
                            setShowPromptModal(true);
                          }
                        } catch (e) { console.error(e); }
                        finally { setGeneratingAi(false); }
                      }}
                      className="text-xs flex items-center gap-1 text-exec-blue hover:text-blue-400 disabled:opacity-50 transition-colors font-bold uppercase tracking-wider"
                      disabled={generatingAi || !form.content}
                    >
                      {generatingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generar Prompt con IA
                    </button>
                  </div>

                  <div className="border border-dashed border-[#333] hover:border-exec-blue/50 rounded-none p-6 bg-[#111] transition-colors">
                    {imagePreview ? (
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-none border border-gray-800"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                            className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-none text-sm font-medium backdrop-blur-sm"
                          >
                            Eliminar Imagen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                        <div className="w-12 h-12 rounded-none bg-[#1A1A1A] flex items-center justify-center mb-3">
                          <Upload className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-300">Haz clic para subir una imagen</span>
                        <span className="text-xs text-gray-500 mt-1">Recomendado: 1200x630px JPG, PNG</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contenido</label>
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
                    <div className="w-full bg-black border border-exec-border p-5 h-[300px] overflow-y-auto news-content">
                      <ReactMarkdown>{form.content || '*Sin contenido para mostrar*'}</ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      className="exec-input p-4 min-h-[200px] leading-relaxed resize-y"
                      placeholder="Escribe el contenido de la noticia aquí (soporta Markdown)..."
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-exec-border bg-[#0A0A0A] flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="px-5 py-2.5 border border-exec-border text-gray-300 hover:bg-[#111] hover:text-white rounded-none text-sm font-medium transition-colors"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={uploading}
                className="px-6 py-2.5 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-sm font-medium shadow-lg shadow-exec-blue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publicando...</span>
                  </div>
                ) : 'Publicar Noticia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-[#0A0A0A] border border-exec-border rounded-none shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col relative">

            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 backdrop-blur-md rounded-none text-white hover:bg-white hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedNews.image_url && (
              <div className="w-full h-64 md:h-80 relative">
                <img
                  src={selectedNews.image_url}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover mask-image-gradient"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent"></div>
              </div>
            )}

            <div className="p-8 -mt-20 relative z-10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none bg-exec-blue/10 border border-exec-blue/30 text-exec-blue">
                    {selectedNews.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedNews.published_at || selectedNews.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">{selectedNews.title}</h2>

                <div className="flex items-center justify-between pb-6 border-b border-exec-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-none border border-gray-700 overflow-hidden flex items-center justify-center text-lg font-bold bg-[#111] text-white">
                      {(selectedNews.publisher?.avatar_url || selectedNews.publisher?.avatarUrl) ? (
                        <img src={selectedNews.publisher.avatar_url || selectedNews.publisher.avatarUrl || ''} alt="" className="w-full h-full object-cover rounded-none" />
                      ) : (
                        <span>{(selectedNews.publisher?.fullName || selectedNews.publisher?.full_name || 'A').charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{selectedNews.publisher?.fullName || selectedNews.publisher?.full_name || 'Usuario'}</p>
                      <p className="text-xs text-gray-500">Autor</p>
                    </div>
                  </div>

                  {user?.id === selectedNews.published_by && (
                    <button
                      onClick={() => setShowConfirmDelete(selectedNews.id)}
                      className="px-3 py-1.5 border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded-none text-sm flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-8 news-content max-w-none">
                <ReactMarkdown>{selectedNews.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-[#0A0A0A] border border-exec-blue/30 rounded-none shadow-[0_0_40px_rgba(59,130,246,0.1)] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-r from-exec-blue/10 to-transparent p-8 border-b border-exec-blue/20 relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Bot size={40} className="text-exec-blue" />
              </div>
              <div className="flex items-center gap-4 text-exec-blue mb-3 relative z-10">
                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                   <span className="material-symbols-outlined text-exec-blue text-[24px]">smart_toy</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">REDACTOR IA</h2>
                  <p className="text-[9px] font-bold text-exec-blue uppercase tracking-[0.3em] font-sans">Generación Ejecutiva Stitch</p>
                </div>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed relative z-10">
                Describe tu idea y la inteligencia artificial redactará una noticia con estructura profesional y tono corporativo.
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <textarea
                  className="w-full bg-black border border-[#262626] rounded-none p-5 h-44 focus:border-exec-blue/50 outline-none resize-none text-xs text-white placeholder-gray-700 shadow-inner transition-all"
                  placeholder="Ej: 'Escribe un comunicado sobre la nueva política de vacaciones que empieza el próximo mes...'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <AIEngineSelector 
                  config={aiConfig} 
                  onConfigChange={setAiConfig} 
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-6 py-2.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-none transition-all text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => setShowAiModal(false)}
                  disabled={generatingAi}
                >
                  Regresar
                </button>
                <button
                  className="px-8 py-2.5 bg-white text-black rounded-none flex items-center gap-3 hover:bg-gray-100 shadow-[0_0_25px_rgba(0,0,0,0.5)] transition-all disabled:opacity-30 disabled:grayscale font-bold text-[10px] uppercase tracking-widest"
                  onClick={handleGenerateNews}
                  disabled={generatingAi || !aiPrompt.trim()}
                >
                  {generatingAi ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-exec-blue" />
                      <span>Redactando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
                      <span>Generar Borrador</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-xl bg-[#0A0A0A] border border-exec-blue/30 rounded-none shadow-[0_0_50px_rgba(59,130,246,0.1)] overflow-hidden">
            <div className="p-8 border-b border-exec-border bg-gradient-to-r from-exec-blue/5 to-transparent flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                  <ImageIcon className="w-6 h-6 text-exec-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">PROMPT DE IMAGEN IA</h3>
                  <p className="text-[9px] font-bold text-exec-blue uppercase tracking-[0.3em]">Optimización Stitch Drive</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPromptModal(false)}
                className="text-gray-600 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="relative group">
                <div className="bg-black p-6 rounded-none text-[11px] text-gray-400 font-mono leading-relaxed border border-[#262626] group-hover:border-exec-blue/30 transition-all">
                  {generatedImagePrompt}
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="absolute top-3 right-3 p-2 bg-[#1a1a1a] hover:bg-white hover:text-black border border-[#333] hover:border-white rounded-none shadow-lg transition-all"
                  title="Copiar"
                >
                  {copiedPrompt ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-4 bg-exec-blue/5 border border-exec-blue/20 rounded-none">
                <p className="text-[10px] text-exec-blue font-bold uppercase tracking-widest flex items-center gap-3">
                  <Sparkles className="w-3 h-3" />
                  TIp: Utiliza este prompt en Midjourney o DALL-E para generar la portada oficial.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-8 py-2.5 bg-white text-black hover:bg-gray-200 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={!!showConfirmDelete}
        title="¿Eliminar Noticia?"
        message="Esta acción no se puede deshacer. La noticia será eliminada permanentemente del portal."
        confirmText="Eliminar Noticia"
        cancelText="Conservar"
        isDestructive={true}
        onConfirm={() => {
          if (showConfirmDelete) {
            deleteNews(showConfirmDelete);
            setShowConfirmDelete(null);
            setSelectedNews(null);
          }
        }}
        onCancel={() => setShowConfirmDelete(null)}
      />
    </div >
  );
};
