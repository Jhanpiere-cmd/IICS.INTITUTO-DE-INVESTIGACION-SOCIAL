import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfirmModal } from '../ui/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateNewsContent, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import ReactMarkdown from 'react-markdown';
import {
  Calendar,
  User,
  X,
  Image as ImageIcon,
  Upload,
  Bot,
  Loader2,
  Sparkles,
  Newspaper,
  Trash2,
  AlertTriangle,
  Tag,
  Plus
} from 'lucide-react';
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

interface SocioenvironmentalAlert {
  id: string;
  title: string;
  description: string;
  province: string;
  type: 'Bajo' | 'Medio' | 'Alto';
  created_at: string;
}

const provinces = [
  'Cajamarca',
  'Cajabamba',
  'Celendín',
  'Chota',
  'Contumazá',
  'Cutervo',
  'Hualgayoc',
  'Jaén',
  'San Ignacio',
  'San Marcos',
  'San Miguel',
  'San Pablo',
  'Santa Cruz'
];

export const NewsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  // --- TAB 1: NOTICIAS STATES ---
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [showCreateNews, setShowCreateNews] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    category: 'General'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingNews, setUploadingNews] = useState(false);
  const [showConfirmDeleteNews, setShowConfirmDeleteNews] = useState<string | null>(null);

  // AI Assistant States
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

  // --- LOAD INITIAL DATA & SYNC FROM LOCATION STATE ---
  useEffect(() => {
    if (location.state?.action === 'create' && location.state?.data) {
      setNewsForm(prev => ({
        ...prev,
        title: location.state.data.title || '',
        content: location.state.data.content || '',
        category: location.state.data.category || 'General'
      }));
      setShowCreateNews(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    loadNews();
  }, []);

  // --- TAB 1: NOTICIAS LOGIC ---
  const loadNews = async () => {
    setLoadingNews(true);
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
      console.error('Error al cargar noticias:', e);
      showToast({ message: 'Error al cargar noticias', type: 'error' });
    } finally {
      setLoadingNews(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateNews = async () => {
    if (!newsForm.title.trim() || !newsForm.content.trim()) {
      showToast({ message: 'Por favor complete el título y contenido.', type: 'error' });
      return;
    }
    setUploadingNews(true);
    try {
      let finalImageUrl: string | null = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `news/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);
        finalImageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('news').insert({
        title: newsForm.title,
        content: newsForm.content,
        category: newsForm.category,
        published_by: user?.id || null,
        status: 'Publicado',
        published_at: new Date().toISOString(),
        image_url: finalImageUrl
      });
      if (error) throw error;

      showToast({ message: '¡Noticia publicada con éxito!', type: 'success' });
      setNewsForm({ title: '', content: '', category: 'General' });
      setImageFile(null);
      setImagePreview(null);
      setShowCreateNews(false);
      loadNews();
    } catch (e: any) {
      console.error('Error al publicar noticia:', e);
      showToast({ message: e.message || 'Error al publicar noticia', type: 'error' });
    } finally {
      setUploadingNews(false);
    }
  };

  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
      showToast({ message: 'Noticia eliminada correctamente.', type: 'success' });
      loadNews();
    } catch (e: any) {
      console.error('Error al eliminar noticia:', e);
      showToast({ message: e.message || 'Error al eliminar', type: 'error' });
    }
  };

  const handleGenerateNews = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const response = await generateNewsContent(aiPrompt, undefined, aiConfig);
      setNewsForm(prev => ({
        ...prev,
        title: response.title || prev.title,
        content: response.content || prev.content
      }));
      setShowAiModal(false);
      setAiPrompt('');
      showToast({ message: '¡Borrador generado por la IA!', type: 'success' });
    } catch (e: any) {
      console.error('Error al generar con IA:', e);
      showToast({ message: 'Error de IA: ' + e.message, type: 'error' });
    } finally {
      setGeneratingAi(false);
    }
  };

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-8 pt-0 md:pt-4 md:px-6 space-y-5 text-left">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-none border border-cyan-500/20">
              <Newspaper className="text-cyan-400 h-6 w-6" />
            </div>
            <span>Prensa y <span className="text-cyan-400">Difusión Pública</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Administra las noticias, notas de prensa e impacto institucional del observatorio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Bot size={14} className="text-exec-blue" />
            Asistente IA
          </button>
          <button
            onClick={() => setShowCreateNews(true)}
            className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Publicar Noticia
          </button>
        </div>
      </div>

      {/* VISTAS DE NOTICIAS */}
      <div className="space-y-6">
        {loadingNews ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
          </div>
        ) : newsList.length === 0 ? (
          <div className="text-center p-12 bg-black/40 border border-gray-900 font-mono text-xs text-gray-500">
            NO SE ENCONTRARON NOTICIAS ACTIVAS EN EL PORTAL.
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {newsList.map((news) => (
              <div key={news.id} className="bg-[#050506] border border-gray-900 p-4 flex flex-col justify-between gap-4 text-left">
                <div className="space-y-3">
                  {news.image_url ? (
                    <div className="w-full h-32 bg-black border border-gray-955 overflow-hidden">
                      <img src={news.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-zinc-950 border border-gray-950 flex items-center justify-center text-gray-800">
                      <ImageIcon size={30} />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-none bg-exec-blue/10 border border-exec-blue/30 text-exec-blue">
                        {news.category}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {news.published_at ? new Date(news.published_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight leading-snug line-clamp-2">{news.title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed font-sans font-normal">
                      {news.content.replace(/[#*`]/g, '')}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-955 pt-3">
                  <button
                    onClick={() => setSelectedNews(news)}
                    className="text-[10px] font-mono text-exec-blue hover:text-white uppercase font-bold cursor-pointer"
                  >
                    Ver Detalle
                  </button>
                  <button
                    onClick={() => setShowConfirmDeleteNews(news.id)}
                    className="p-1 text-gray-650 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. Modal: Publicar Noticia */}
      {showCreateNews && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-exec-blue" />
                <span>Registrar Noticia / Comunicado</span>
              </h3>
              <button onClick={() => setShowCreateNews(false)} className="text-gray-505 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Título de la Noticia</label>
                <input
                  type="text"
                  placeholder="Ej. Resultados de la investigación en Namora..."
                  value={newsForm.title}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Categoría</label>
                  <select
                    value={newsForm.category}
                    onChange={(e) => setNewsForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Investigación">Investigación</option>
                    <option value="Evento">Evento</option>
                    <option value="Academia">Academia</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Imagen Ilustrativa</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              {imagePreview && (
                <div className="w-full h-32 bg-black border border-gray-900 relative overflow-hidden flex items-center justify-center">
                  <img src={imagePreview} alt="Preview" className="h-full object-contain" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 bg-black/80 p-1 text-red-500 hover:text-white border border-gray-855 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Cuerpo de la Noticia</label>
                <textarea
                  rows={6}
                  placeholder="Detalla los pormenores de la noticia aquí..."
                  value={newsForm.content}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
              <button
                onClick={() => setShowCreateNews(false)}
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white hover:bg-zinc-950 font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNews}
                disabled={uploadingNews}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {uploadingNews ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{uploadingNews ? 'Subiendo...' : 'Publicar Noticia'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: AI News Assistant */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-xl p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-exec-blue" />
                <span>Asistente de Redacción IA</span>
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-gray-550 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <p className="text-gray-450 leading-relaxed text-[11px]">
                Describe la noticia que quieres redactar. El asistente de IA redactará una propuesta de noticia lista para publicar.
              </p>
              <textarea
                rows={4}
                placeholder="Escribe aquí el tema, ej: Taller de capacitación sobre bases de datos en la UNC dictado por el Dr. Jaime..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
              />

              <AIEngineSelector config={aiConfig} onConfigChange={setAiConfig} />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateNews}
                disabled={generatingAi || !aiPrompt.trim()}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {generatingAi ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{generatingAi ? 'Pensando...' : 'Generar Borrador'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Detalle de Noticia */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <span className="text-[10px] uppercase font-mono tracking-widest text-exec-blue font-bold">{selectedNews.category}</span>
              <button onClick={() => setSelectedNews(null)} className="text-gray-555 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">{selectedNews.title}</h2>
              
              {selectedNews.image_url && (
                <div className="w-full max-h-80 bg-black border border-gray-900 overflow-hidden flex items-center justify-center">
                  <img src={selectedNews.image_url} alt="noticia" className="max-h-80 object-contain" />
                </div>
              )}

              <div className="prose prose-invert max-w-none text-xs text-gray-300 leading-relaxed font-sans font-normal border-t border-gray-900/60 pt-4">
                <ReactMarkdown>{selectedNews.content}</ReactMarkdown>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-900 pt-4 text-[10px] font-mono text-gray-550">
              <div className="flex items-center gap-2">
                <User size={13} className="text-exec-blue" />
                <span>Publicado por: {selectedNews.publisher?.fullName || selectedNews.publisher?.full_name || 'Miembro'}</span>
              </div>
              <div>Fecha: {selectedNews.published_at ? new Date(selectedNews.published_at).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIONES */}
      <ConfirmModal
        isOpen={showConfirmDeleteNews !== null}
        title="¿ELIMINAR NOTICIA?"
        message="Esta acción removerá de forma permanente el comunicado del portal. ¿Desea continuar?"
        confirmText="Confirmar Eliminación"
        cancelText="Cancelar"
        onConfirm={() => {
          if (showConfirmDeleteNews) {
            deleteNews(showConfirmDeleteNews);
            setShowConfirmDeleteNews(null);
          }
        }}
        onCancel={() => setShowConfirmDeleteNews(null)}
      />



    </div>
  );
};

export default NewsView;
