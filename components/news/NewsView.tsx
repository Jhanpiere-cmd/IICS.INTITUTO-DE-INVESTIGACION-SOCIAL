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

  // Tab State
  const [activeTab, setActiveTab] = useState<'news' | 'alerts'>('news');

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

  // --- TAB 2: ALERTAS STATES ---
  const [alertsSubTab, setAlertsSubTab] = useState<'approved' | 'pending' | 'metrics'>('approved');
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [provinceMetrics, setProvinceMetrics] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: '',
    description: '',
    province: 'Cajamarca',
    type: 'Bajo' as 'Bajo' | 'Medio' | 'Alto',
    latitude: '',
    longitude: ''
  });
  const [uploadingAlert, setUploadingAlert] = useState(false);
  const [showConfirmDeleteAlert, setShowConfirmDeleteAlert] = useState<string | null>(null);

  // Métricas Territoriales Form State
  const [selectedMetricProvince, setSelectedMetricProvince] = useState<string>('cajamarca');
  const [metricForm, setMetricForm] = useState({
    riskScore: 5.0,
    mencionesRedes: 1000,
    waterSatisfaction: 50,
    conflMineria: 30,
    conflLocal: 20,
    conflServicios: 20,
    conflGobernabilidad: 20,
    conflOtros: 10
  });

  const updateMetricFormFromData = (data: any) => {
    const areas = data.conflict_areas || {};
    setMetricForm({
      riskScore: Number(data.risk_score || 0),
      mencionesRedes: Number(data.menciones_redes || 0),
      waterSatisfaction: Number(data.indicators?.find((i: any) => i.label.includes('Hídrica') || i.label.includes('Hídrico'))?.value?.toString().replace('%', '') || 50),
      conflMineria: Number(areas['Minería y medio ambiente'] || 0),
      conflLocal: Number(areas['Desarrollo local'] || 0),
      conflServicios: Number(areas['Servicios básicos'] || 0),
      conflGobernabilidad: Number(areas['Gobernabilidad'] || 0),
      conflOtros: Number(areas['Otros temas'] || 0),
    });
  };

  useEffect(() => {
    if (provinceMetrics.length > 0) {
      const activeData = provinceMetrics.find(p => p.id === selectedMetricProvince);
      if (activeData) {
        updateMetricFormFromData(activeData);
      }
    }
  }, [selectedMetricProvince, provinceMetrics]);

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
    if (activeTab === 'news') {
      loadNews();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    }
  }, [activeTab]);

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

  // --- TAB 2: ALERTAS LOGIC ---
  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAlertsList(data || []);

      const { data: metrics, error: metricsError } = await supabase
        .from('province_metrics')
        .select('*')
        .order('name', { ascending: true });
      if (metricsError) throw metricsError;
      setProvinceMetrics(metrics || []);
    } catch (e) {
      console.error('Error al cargar alertas/métricas:', e);
      showToast({ message: 'Error al consultar datos territoriales', type: 'error' });
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!alertForm.title.trim() || !alertForm.description.trim()) {
      showToast({ message: 'Por favor complete título y descripción.', type: 'error' });
      return;
    }
    setUploadingAlert(true);
    try {
      const payload: any = {
        title: alertForm.title,
        description: alertForm.description,
        province: alertForm.province,
        type: alertForm.type,
      };

      if (alertForm.latitude && alertForm.longitude) {
        payload.latitude = parseFloat(alertForm.latitude);
        payload.longitude = parseFloat(alertForm.longitude);
      }

      const { error } = await supabase.from('alerts').insert(payload);
      if (error) throw error;

      showToast({ message: '¡Alerta socioambiental activada!', type: 'success' });
      setAlertForm({
        title: '',
        description: '',
        province: 'Cajamarca',
        type: 'Bajo',
        latitude: '',
        longitude: ''
      });
      setShowCreateAlert(false);
      loadAlerts();
    } catch (e: any) {
      console.error('Error al registrar alerta:', e);
      showToast({ message: e.message || 'Error al guardar alerta', type: 'error' });
    } finally {
      setUploadingAlert(false);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase.from('alerts').delete().eq('id', id);
      if (error) throw error;
      showToast({ message: 'Alerta eliminada correctamente.', type: 'success' });
      loadAlerts();
    } catch (e: any) {
      console.error('Error al borrar alerta:', e);
      showToast({ message: e.message || 'Error al borrar', type: 'error' });
    }
  };

  const handleUpdateProvinceMetrics = async () => {
    setUploadingAlert(true);
    try {
      const payload = {
        risk_score: metricForm.riskScore,
        menciones_redes: metricForm.mencionesRedes,
        conflict_areas: {
          'Minería y medio ambiente': metricForm.conflMineria,
          'Desarrollo local': metricForm.conflLocal,
          'Servicios básicos': metricForm.conflServicios,
          'Gobernabilidad': metricForm.conflGobernabilidad,
          'Otros temas': metricForm.conflOtros
        }
      };

      const { error } = await supabase
        .from('province_metrics')
        .update(payload)
        .eq('id', selectedMetricProvince);

      if (error) throw error;
      showToast({ message: 'Métricas territoriales actualizadas', type: 'success' });
      loadAlerts();
    } catch (e: any) {
      console.error('Error al actualizar métricas:', e);
      showToast({ message: e.message || 'Error al guardar', type: 'error' });
    } finally {
      setUploadingAlert(false);
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
            <span>Difusión <span className="text-cyan-400">Pública</span> y Territorial</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Administra noticias de impacto y alertas socioambientales en el mapa regional.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'news' && (
            <>
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
            </>
          )}

          {activeTab === 'alerts' && alertsSubTab === 'approved' && (
            <button
              onClick={() => setShowCreateAlert(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              Activar Alerta
            </button>
          )}
        </div>
      </div>

      {/* ═══ TABS SELECTOR ═══ */}
      <div className="flex items-center gap-1 bg-[#0A0A0A] border border-exec-border rounded-none p-1 overflow-x-auto whitespace-nowrap scrollbar-hide w-full lg:w-auto">
        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap cursor-pointer ${
            activeTab === 'news' ? 'bg-exec-blue text-white shadow-lg shadow-exec-blue/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Newspaper size={14} />
          <span>Noticias e Impacto</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap cursor-pointer ${
            activeTab === 'alerts' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Alertas y Riesgo Provincial</span>
        </button>
      </div>

      {/* VISTAS DE PESTAÑAS */}
      {activeTab === 'news' && (
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
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Sub-navigation for Alerts/Metrics */}
          <div className="flex border-b border-gray-900">
            <button
              onClick={() => setAlertsSubTab('approved')}
              className={`px-4 py-2 text-[10px] font-bold font-mono uppercase border-b-2 transition-all cursor-pointer ${
                alertsSubTab === 'approved' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              Alertas Activas
            </button>
            <button
              onClick={() => setAlertsSubTab('metrics')}
              className={`px-4 py-2 text-[10px] font-bold font-mono uppercase border-b-2 transition-all cursor-pointer ${
                alertsSubTab === 'metrics' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              Métricas e Índices de Riesgo
            </button>
          </div>

          {alertsSubTab === 'approved' && (
            <div className="space-y-6">
              {loadingAlerts ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
                </div>
              ) : alertsList.length === 0 ? (
                <div className="text-center p-12 bg-black/40 border border-gray-900 font-mono text-xs text-gray-500">
                  NO SE ENCONTRARON ALERTAS SOCIOAMBIENTALES REGISTRADAS.
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {alertsList.map((al) => (
                    <div key={al.id} className="bg-[#050506] border border-gray-900 p-4 flex flex-col justify-between gap-3 text-left">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-exec-blue" />
                            <span className="text-[10px] font-mono uppercase font-bold text-gray-400">{al.province}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase rounded-full ${
                            al.type === 'Bajo' ? 'bg-green-950 text-green-400' :
                            al.type === 'Medio' ? 'bg-yellow-950 text-yellow-400' :
                            'bg-red-950 text-red-400'
                          }`}>
                            Prioridad {al.type}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase leading-snug">{al.title}</h4>
                        <p className="text-[10.5px] text-gray-400 leading-relaxed font-sans">{al.description}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-gray-955 pt-2 text-[9px] font-mono text-gray-550">
                        <span>Activada: {new Date(al.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={() => setShowConfirmDeleteAlert(al.id)}
                          className="text-red-500 hover:text-white font-bold cursor-pointer"
                        >
                          Desactivar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {alertsSubTab === 'metrics' && (
            <div className="bg-zinc-950 border border-gray-900 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase">Seleccionar Provincia</label>
                <select
                  value={selectedMetricProvince}
                  onChange={(e) => setSelectedMetricProvince(e.target.value)}
                  className="bg-black border border-gray-855 text-white text-xs p-2 font-mono outline-none cursor-pointer"
                >
                  {provinces.map(p => (
                    <option key={p.toLowerCase()} value={p.toLowerCase()}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-900 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">Riesgo Socioambiental (0 - 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={metricForm.riskScore}
                    onChange={(e) => setMetricForm(prev => ({ ...prev, riskScore: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">Menciones Redes / Mes</label>
                  <input
                    type="number"
                    value={metricForm.mencionesRedes}
                    onChange={(e) => setMetricForm(prev => ({ ...prev, mencionesRedes: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">Satis. Hídrica (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={metricForm.waterSatisfaction}
                    onChange={(e) => setMetricForm(prev => ({ ...prev, waterSatisfaction: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-900 pt-4">
                <h4 className="text-[10px] font-mono font-bold text-gray-450 uppercase">Áreas de Conflictividad (Menciones / Peso)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-550 block">Minería (%)</label>
                    <input
                      type="number"
                      value={metricForm.conflMineria}
                      onChange={(e) => setMetricForm(prev => ({ ...prev, conflMineria: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-550 block">Des. Local (%)</label>
                    <input
                      type="number"
                      value={metricForm.conflLocal}
                      onChange={(e) => setMetricForm(prev => ({ ...prev, conflLocal: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-550 block">Servicios (%)</label>
                    <input
                      type="number"
                      value={metricForm.conflServicios}
                      onChange={(e) => setMetricForm(prev => ({ ...prev, conflServicios: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-550 block">Gobernabilidad (%)</label>
                    <input
                      type="number"
                      value={metricForm.conflGobernabilidad}
                      onChange={(e) => setMetricForm(prev => ({ ...prev, conflGobernabilidad: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-550 block">Otros (%)</label>
                    <input
                      type="number"
                      value={metricForm.conflOtros}
                      onChange={(e) => setMetricForm(prev => ({ ...prev, conflOtros: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleUpdateProvinceMetrics}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs uppercase cursor-pointer"
                >
                  Guardar Métricas
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Imagen Ilustrativa</label>
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
                <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Cuerpo de la Noticia</label>
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

      {/* 2. Modal: Activar Alerta Socioambiental */}
      {showCreateAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-sm p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Activar Alerta Territorial</span>
              </h3>
              <button onClick={() => setShowCreateAlert(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Título de la Alerta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Derrame menor en canal o corte de agua..."
                  value={alertForm.title}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Provincia *</label>
                  <select
                    value={alertForm.province}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, province: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
                  >
                    {provinces.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Gravedad / Tipo *</label>
                  <select
                    value={alertForm.type}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
                  >
                    <option value="Bajo">Baja Prioridad</option>
                    <option value="Medio">Mediana Prioridad</option>
                    <option value="Alto">Alta Prioridad / Crítica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Latitud (Opcional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Ej. -7.15"
                    value={alertForm.latitude}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, latitude: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Longitud (Opcional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Ej. -78.51"
                    value={alertForm.longitude}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, longitude: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Detalles / Descripción *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Escriba los detalles concretos del suceso..."
                  value={alertForm.description}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
              <button
                onClick={() => setShowCreateAlert(false)}
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAlert}
                disabled={uploadingAlert}
                className="px-4 py-2 bg-red-650 hover:bg-red-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {uploadingAlert ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{uploadingAlert ? 'Guardando...' : 'Activar Alerta'}</span>
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

      <ConfirmModal
        isOpen={showConfirmDeleteAlert !== null}
        title="¿DESACTIVAR ALERTA?"
        message="Esta acción removerá la alerta territorial del mapa del Observatorio. ¿Desea continuar?"
        confirmText="Desactivar Alerta"
        cancelText="Cancelar"
        onConfirm={() => {
          if (showConfirmDeleteAlert) {
            deleteAlert(showConfirmDeleteAlert);
            setShowConfirmDeleteAlert(null);
          }
        }}
        onCancel={() => setShowConfirmDeleteAlert(null)}
      />

    </div>
  );
};

export default NewsView;
