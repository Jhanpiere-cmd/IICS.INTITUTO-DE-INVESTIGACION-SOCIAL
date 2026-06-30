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
  GraduationCap,
  Inbox,
  AlertTriangle,
  Tag,
  Download,
  Send,
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

interface Publication {
  id: string;
  title: string;
  authors: string;
  published_date: string | null;
  research_line: string | null;
  pdf_url: string | null;
  url: string | null;
  abstract: string | null;
  keywords: string | null;
  rights: string | null;
  volume: string | null;
  number: string | null;
  created_at: string;
}

interface DraftSubmission {
  id: string;
  title: string;
  abstract: string | null;
  author_name: string;
  author_email: string;
  institution: string | null;
  research_line: string;
  pdf_url: string | null;
  status: 'Recibido' | 'En Dictamen' | 'Aprobado' | 'Rechazado';
  submitted_at: string;
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
  const [activeTab, setActiveTab] = useState<'news' | 'publications' | 'inbox' | 'alerts'>('news');

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

  // --- TAB 2: PUBLICACIONES STATES (Dublin Core) ---
  const [publicationsList, setPublicationsList] = useState<Publication[]>([]);
  const [loadingPubs, setLoadingPubs] = useState(true);
  const [showCreatePub, setShowCreatePub] = useState(false);
  const [pubForm, setPubForm] = useState({
    title: '',
    authors: '',
    published_date: '',
    research_line: 'Sociología Digital y Nuevas Tecnologías',
    url: '',
    abstract: '',
    keywords: '',
    rights: 'Creative Commons Attribution 4.0',
    volume: '',
    number: ''
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pubUploading, setPubUploading] = useState(false);
  const [showConfirmDeletePub, setShowConfirmDeletePub] = useState<string | null>(null);

  // --- TAB 3: BANDEJA DE ENTRADA STATES ---
  const [submissionsList, setSubmissionsList] = useState<DraftSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [dictamenTarget, setDictamenTarget] = useState<DraftSubmission | null>(null);
  const [newDictamenStatus, setNewDictamenStatus] = useState<'Recibido' | 'En Dictamen' | 'Aprobado' | 'Rechazado'>('Recibido');
  const [updatingDictamen, setUpdatingDictamen] = useState(false);

  // --- TAB 4: ALERTAS STATES ---
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
    if (activeTab === 'news') loadNews();
    else if (activeTab === 'publications') loadPublications();
    else if (activeTab === 'inbox') loadSubmissions();
    else if (activeTab === 'alerts') loadAlerts();
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

  // --- TAB 2: PUBLICACIONES LOGIC ---
  const loadPublications = async () => {
    setLoadingPubs(true);
    try {
      const { data, error } = await supabase
        .from('journal_publications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPublicationsList(data || []);
    } catch (e) {
      console.error('Error al cargar publicaciones:', e);
      showToast({ message: 'Error al cargar catálogo', type: 'error' });
    } finally {
      setLoadingPubs(false);
    }
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleCreatePublication = async () => {
    if (!pubForm.title.trim() || !pubForm.authors.trim()) {
      showToast({ message: 'El título y autores son campos requeridos.', type: 'error' });
      return;
    }
    setPubUploading(true);
    try {
      let finalPdfUrl = pubForm.url || null;
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `publications/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, pdfFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);
        finalPdfUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('journal_publications').insert({
        title: pubForm.title,
        authors: pubForm.authors,
        published_date: pubForm.published_date || null,
        research_line: pubForm.research_line,
        pdf_url: finalPdfUrl,
        url: pubForm.url || null,
        abstract: pubForm.abstract || null,
        keywords: pubForm.keywords || null,
        rights: pubForm.rights || null,
        volume: pubForm.volume || null,
        number: pubForm.number || null
      });
      if (error) throw error;

      showToast({ message: '¡Artículo indexado correctamente!', type: 'success' });
      setPubForm({
        title: '',
        authors: '',
        published_date: '',
        research_line: 'Sociología Digital y Nuevas Tecnologías',
        url: '',
        abstract: '',
        keywords: '',
        rights: 'Creative Commons Attribution 4.0',
        volume: '',
        number: ''
      });
      setPdfFile(null);
      setShowCreatePub(false);
      loadPublications();
    } catch (e: any) {
      console.error('Error al indexar publicación:', e);
      showToast({ message: e.message || 'Error al indexar', type: 'error' });
    } finally {
      setPubUploading(false);
    }
  };

  const deletePublication = async (id: string) => {
    try {
      const { error } = await supabase.from('journal_publications').delete().eq('id', id);
      if (error) throw error;
      showToast({ message: 'Publicación removida del índice.', type: 'success' });
      loadPublications();
    } catch (e: any) {
      console.error('Error al borrar publicación:', e);
      showToast({ message: e.message || 'Error al borrar', type: 'error' });
    }
  };

  // --- TAB 3: BANDEJA DE ENTRADA LOGIC ---
  const loadSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('research_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setSubmissionsList(data || []);
    } catch (e) {
      console.error('Error al cargar la bandeja de entrada:', e);
      showToast({ message: 'Error al consultar bandeja', type: 'error' });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleDictaminar = async () => {
    if (!dictamenTarget) return;
    setUpdatingDictamen(true);
    try {
      const { error } = await supabase
        .from('research_submissions')
        .update({ status: newDictamenStatus })
        .eq('id', dictamenTarget.id);
      if (error) throw error;
      showToast({ message: `Borrador dictaminado como: ${newDictamenStatus}`, type: 'success' });
      setDictamenTarget(null);
      loadSubmissions();
    } catch (e: any) {
      console.error('Error al dictaminar borrador:', e);
      showToast({ message: e.message || 'Error al guardar dictamen', type: 'error' });
    } finally {
      setUpdatingDictamen(false);
    }
  };

  const startPublicationFromApprovedDraft = (draft: DraftSubmission) => {
    setPubForm({
      title: draft.title,
      authors: draft.author_name,
      published_date: new Date().toISOString().substring(0, 10),
      research_line: draft.research_line || 'Sociología Digital y Nuevas Tecnologías',
      url: draft.pdf_url || '',
      abstract: draft.abstract || '',
      keywords: '',
      rights: 'Creative Commons Attribution 4.0',
      volume: '',
      number: ''
    });
    setActiveTab('publications');
    setShowCreatePub(true);
  };

  // --- TAB 4: ALERTAS LOGIC ---
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
      console.error('Error al cargar alertas:', e);
      showToast({ message: 'Error al consultar alertas socioambientales', type: 'error' });
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!alertForm.title.trim() || !alertForm.description.trim()) {
      showToast({ message: 'Todos los campos son requeridos.', type: 'error' });
      return;
    }
    setUploadingAlert(true);
    try {
      const { error } = await supabase.from('alerts').insert({
        title: alertForm.title,
        description: alertForm.description,
        province: alertForm.province,
        type: alertForm.type,
        status: 'aprobado', // Admins publish straight away
        latitude: alertForm.latitude ? parseFloat(alertForm.latitude) : null,
        longitude: alertForm.longitude ? parseFloat(alertForm.longitude) : null
      });
      if (error) throw error;
      showToast({ message: '¡Alerta territorial activada!', type: 'success' });
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
      console.error('Error al activar alerta:', e);
      showToast({ message: e.message || 'Error al guardar alerta', type: 'error' });
    } finally {
      setUploadingAlert(false);
    }
  };

  const approveAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'aprobado' })
        .eq('id', id);
      if (error) throw error;
      showToast({ message: 'Alerta ciudadana aprobada y publicada en el mapa.', type: 'success' });
      loadAlerts();
    } catch (e: any) {
      console.error('Error al aprobar alerta:', e);
      showToast({ message: e.message || 'Error al aprobar alerta', type: 'error' });
    }
  };

  const rejectAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast({ message: 'Alerta rechazada y descartada.', type: 'success' });
      loadAlerts();
    } catch (e: any) {
      console.error('Error al rechazar alerta:', e);
      showToast({ message: e.message || 'Error al descartar alerta', type: 'error' });
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase.from('alerts').delete().eq('id', id);
      if (error) throw error;
      showToast({ message: 'Alerta desactivada con éxito.', type: 'success' });
      loadAlerts();
    } catch (e: any) {
      console.error('Error al borrar alerta:', e);
      showToast({ message: e.message || 'Error al desactivar', type: 'error' });
    }
  };

  const handleUpdateMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = provinceMetrics.find(p => p.id === selectedMetricProvince);
    if (!orig) return;

    setUploadingAlert(true);
    try {
      let desc: 'Bajo' | 'Moderado' | 'Alto' = 'Bajo';
      if (metricForm.riskScore >= 7.0) desc = 'Alto';
      else if (metricForm.riskScore >= 4.0) desc = 'Moderado';

      const indicators = orig.indicators || [];
      const updatedIndicators = indicators.map((ind: any) => {
        if (ind.label.includes('Hídrica') || ind.label.includes('Hídrico')) {
          return { ...ind, value: `${metricForm.waterSatisfaction}%` };
        }
        return ind;
      });

      const conflict_areas = {
        'Minería y medio ambiente': metricForm.conflMineria,
        'Desarrollo local': metricForm.conflLocal,
        'Servicios básicos': metricForm.conflServicios,
        'Gobernabilidad': metricForm.conflGobernabilidad,
        'Otros temas': metricForm.conflOtros
      };

      const { error } = await supabase
        .from('province_metrics')
        .update({
          risk_score: metricForm.riskScore,
          risk_description: desc,
          menciones_redes: metricForm.mencionesRedes,
          indicators: updatedIndicators,
          conflict_areas
        })
        .eq('id', selectedMetricProvince);

      if (error) throw error;
      showToast({ message: '¡Métricas actualizadas con éxito!', type: 'success' });
      loadAlerts();
    } catch (err: any) {
      console.error('Error updating province metrics:', err);
      showToast({ message: err.message || 'Error al guardar métricas', type: 'error' });
    } finally {
      setUploadingAlert(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ═══ HEADER DE MÓDULO ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <Newspaper className="w-6 h-6 text-exec-blue" />
            </div>
            <span>Difusión <span className="text-exec-blue">Científica</span> y Territorial</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Administra noticias, artículos Dublin Core, bandeja de borradores y alertas socioambientales.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'news' && (
            <>
              <button
                onClick={() => setShowAiModal(true)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
              >
                <Bot size={14} className="text-exec-blue" />
                Asistente IA
              </button>
              <button
                onClick={() => setShowCreateNews(true)}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Publicar Noticia
              </button>
            </>
          )}

          {activeTab === 'publications' && (
            <button
              onClick={() => setShowCreatePub(true)}
              className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Indexar Artículo
            </button>
          )}

          {activeTab === 'alerts' && (
            <button
              onClick={() => setShowCreateAlert(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
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
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap ${
            activeTab === 'news' ? 'bg-exec-blue text-white shadow-lg shadow-exec-blue/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Newspaper size={14} />
          <span>Noticias e Impacto</span>
        </button>

        <button
          onClick={() => setActiveTab('publications')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap ${
            activeTab === 'publications' ? 'bg-exec-blue text-white shadow-lg shadow-exec-blue/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <GraduationCap size={14} />
          <span>Artículos y Dublin Core</span>
        </button>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap relative ${
            activeTab === 'inbox' ? 'bg-exec-blue text-white shadow-lg shadow-exec-blue/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Inbox size={14} />
          <span>Bandeja Recibidos</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap ${
            activeTab === 'alerts' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Alertas Socioambientales</span>
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

                  <div className="flex justify-between items-center border-t border-gray-950 pt-3">
                    <button
                      onClick={() => setSelectedNews(news)}
                      className="text-[10px] font-mono text-exec-blue hover:text-white uppercase font-bold"
                    >
                      Ver Detalle
                    </button>
                    <button
                      onClick={() => setShowConfirmDeleteNews(news.id)}
                      className="p-1 text-gray-650 hover:text-red-500 transition-colors"
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

      {activeTab === 'publications' && (
        <div className="space-y-6">
          {loadingPubs ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
            </div>
          ) : publicationsList.length === 0 ? (
            <div className="text-center p-12 bg-black/40 border border-gray-900 font-mono text-xs text-gray-500">
              NO SE ENCONTRARON ARTÍCULOS CIENTÍFICOS REGISTRADOS.
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-900 bg-[#050506]">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-gray-900 bg-black text-gray-500 font-mono text-[9px] uppercase tracking-wider">
                    <th className="p-3">Título / Línea</th>
                    <th className="p-3">Autores</th>
                    <th className="p-3">Indexación (Vol/Nº)</th>
                    <th className="p-3">Dublin Core</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-950">
                  {publicationsList.map((pub) => (
                    <tr key={pub.id} className="hover:bg-zinc-950/30">
                      <td className="p-3">
                        <div className="font-bold text-white uppercase tracking-tight">{pub.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{pub.research_line}</div>
                      </td>
                      <td className="p-3 text-gray-300 font-normal">{pub.authors}</td>
                      <td className="p-3 text-gray-400 font-mono">
                        {pub.published_date ? new Date(pub.published_date).getFullYear() : 'N/A'} {pub.volume && `(${pub.volume})`} {pub.number && `No.${pub.number}`}
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 text-[8.5px] font-mono bg-green-950/30 text-green-400 border border-green-900/30">
                          {pub.rights ? 'Dublin Core OK' : 'Estándar'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {pub.pdf_url && (
                            <a
                              href={pub.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-[#111] border border-gray-850 text-gray-400 hover:text-white"
                              title="Bajar PDF"
                            >
                              <Download size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => setShowConfirmDeletePub(pub.id)}
                            className="p-1 border border-gray-850 hover:border-red-900 text-gray-400 hover:text-red-500"
                            title="Eliminar registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="space-y-6">
          {loadingSubmissions ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
            </div>
          ) : submissionsList.length === 0 ? (
            <div className="text-center p-12 bg-black/40 border border-gray-900 font-mono text-xs text-gray-500">
              LA BANDEJA DE PRE-PRINTS ESTÁ VACÍA.
            </div>
          ) : (
            <div className="space-y-3">
              {submissionsList.map((sub) => (
                <div key={sub.id} className="bg-[#050506] border border-gray-900 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                  <div className="space-y-1.5 font-sans">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase rounded-none border ${
                        sub.status === 'Recibido' ? 'bg-zinc-950 text-gray-400 border-gray-800' :
                        sub.status === 'En Dictamen' ? 'bg-amber-955/40 text-amber-500 border-amber-900/60' :
                        sub.status === 'Aprobado' ? 'bg-green-955/40 text-green-400 border-green-900/60' :
                        'bg-red-955/40 text-red-400 border-red-900/60'
                      }`}>
                        {sub.status}
                      </span>
                      <span className="text-[9.5px] font-mono text-gray-500">Recibido: {new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight leading-snug">{sub.title}</h4>
                    <p className="text-[11px] text-gray-400">
                      <span className="font-bold text-gray-300">Autor:</span> {sub.author_name} ({sub.author_email}) • <span className="font-bold text-gray-300">Filiación:</span> {sub.institution || 'Independiente'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Línea: {sub.research_line}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {sub.pdf_url && (
                      <a
                        href={sub.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-black hover:bg-zinc-950 border border-gray-850 hover:border-gray-700 text-gray-300 rounded-none font-mono text-[10.5px] flex items-center gap-1.5"
                      >
                        <Download size={12} />
                        <span>Bajar PDF</span>
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setDictamenTarget(sub);
                        setNewDictamenStatus(sub.status);
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-gray-300 border border-zinc-850 hover:border-zinc-700 rounded-none font-mono text-[10.5px]"
                    >
                      Dictaminar
                    </button>

                    {sub.status === 'Aprobado' && (
                      <button
                        onClick={() => startPublicationFromApprovedDraft(sub)}
                        className="px-3 py-1.5 bg-exec-blue hover:bg-blue-500 text-white rounded-none font-mono text-[10.5px] flex items-center gap-1"
                      >
                        <Send size={12} />
                        <span>Publicar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
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

                  <div className="flex justify-between items-center border-t border-gray-955 pt-2 text-[9px] font-mono text-gray-500">
                    <span>Activada: {new Date(al.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => setShowConfirmDeleteAlert(al.id)}
                      className="p-1 hover:bg-red-500/10 hover:text-red-500 text-gray-655 transition-colors"
                      title="Remover alerta"
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

      {/* ================= MODALES Y DIÁLOGOS DE CREACIÓN / EDICIÓN ================= */}

      {/* 1. Modal: Publicar Noticia */}
      {showCreateNews && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-exec-blue" />
                <span>Registrar Noticia / Comunicado</span>
              </h3>
              <button onClick={() => setShowCreateNews(false)} className="text-gray-505 hover:text-white transition-colors">
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
                    className="absolute top-1 right-1 bg-black/80 p-1 text-red-500 hover:text-white border border-gray-855"
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
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white hover:bg-zinc-950 font-mono text-[10px] uppercase font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNews}
                disabled={uploadingNews}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
              >
                {uploadingNews ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{uploadingNews ? 'Subiendo...' : 'Publicar Noticia'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Indexar Artículo */}
      {showCreatePub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-exec-blue" />
                <span>Indexar Publicación Científica</span>
              </h3>
              <button onClick={() => setShowCreatePub(false)} className="text-gray-550 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Título del Artículo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dinámicas territoriales y conflictos en la cuenca del Sendamal..."
                  value={pubForm.title}
                  onChange={(e) => setPubForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Autores *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Jaime Abanto P., Ana Díaz L."
                    value={pubForm.authors}
                    onChange={(e) => setPubForm(prev => ({ ...prev, authors: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Línea de Investigación</label>
                  <select
                    value={pubForm.research_line}
                    onChange={(e) => setPubForm(prev => ({ ...prev, research_line: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
                  >
                    <option value="Sociología Digital y Nuevas Tecnologías">Sociología Digital</option>
                    <option value="Transformación Social y Desarrollo Regional">Transformación Social</option>
                    <option value="Educación y Juventudes">Educación y Juventudes</option>
                    <option value="Género y Cambio Cultural">Género y Cambio Cultural</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Volumen</label>
                  <input
                    type="text"
                    placeholder="Ej. Vol. 2"
                    value={pubForm.volume}
                    onChange={(e) => setPubForm(prev => ({ ...prev, volume: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Número</label>
                  <input
                    type="text"
                    placeholder="Ej. Nº 1"
                    value={pubForm.number}
                    onChange={(e) => setPubForm(prev => ({ ...prev, number: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Fecha Publicación</label>
                  <input
                    type="date"
                    value={pubForm.published_date}
                    onChange={(e) => setPubForm(prev => ({ ...prev, published_date: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-955 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Subir Archivo PDF</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfSelect}
                    className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">O URL Alternativa</label>
                  <input
                    type="text"
                    placeholder="Ej. https://doi.org/10..."
                    value={pubForm.url}
                    onChange={(e) => setPubForm(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-505 uppercase block">Resumen / Abstract (Metadatos Dublin Core)</label>
                <textarea
                  rows={4}
                  placeholder="Escriba la síntesis o resumen del artículo..."
                  value={pubForm.abstract}
                  onChange={(e) => setPubForm(prev => ({ ...prev, abstract: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-955 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Palabras Clave</label>
                  <input
                    type="text"
                    placeholder="Ej. conflictos, sociología, Cajamarca"
                    value={pubForm.keywords}
                    onChange={(e) => setPubForm(prev => ({ ...prev, keywords: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Derechos / Licencia</label>
                  <input
                    type="text"
                    value={pubForm.rights}
                    onChange={(e) => setPubForm(prev => ({ ...prev, rights: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
              <button
                onClick={() => setShowCreatePub(false)}
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white hover:bg-zinc-950 font-mono text-[10px] uppercase font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePublication}
                disabled={pubUploading}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
              >
                {pubUploading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{pubUploading ? 'Indexando...' : 'Indexar Artículo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Dialog: Dictaminar manuscrito */}
      {dictamenTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-sm p-6 space-y-4 text-left font-sans text-xs">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dictaminar Borrador</h3>
              <p className="text-[10px] text-gray-550 font-mono mt-1 leading-normal line-clamp-2 uppercase">Tema: {dictamenTarget.title}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Seleccione el estado del Dictamen</label>
              <select
                value={newDictamenStatus}
                onChange={(e) => setNewDictamenStatus(e.target.value as any)}
                className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
              >
                <option value="Recibido">Recibido (En cola)</option>
                <option value="En Dictamen">En Dictamen (Revisión de Pares)</option>
                <option value="Aprobado">Aprobado (Listo para publicación)</option>
                <option value="Rechazado">Rechazado (No califica)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
              <button
                onClick={() => setDictamenTarget(null)}
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDictaminar}
                disabled={updatingDictamen}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
              >
                {updatingDictamen ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{updatingDictamen ? 'Guardando...' : 'Aplicar Dictamen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Activar Alerta Socioambiental */}
      {showCreateAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-sm p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Activar Alerta Territorial</span>
              </h3>
              <button onClick={() => setShowCreateAlert(false)} className="text-gray-500 hover:text-white transition-colors">
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
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAlert}
                disabled={uploadingAlert}
                className="px-4 py-2 bg-red-650 hover:bg-red-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
              >
                {uploadingAlert ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{uploadingAlert ? 'Guardando...' : 'Activar Alerta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: AI News Assistant */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-xl p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-exec-blue" />
                <span>Asistente de Redacción IA</span>
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-gray-550 hover:text-white transition-colors">
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
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateNews}
                disabled={generatingAi || !aiPrompt.trim()}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
              >
                {generatingAi ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{generatingAi ? 'Pensando...' : 'Generar Borrador'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Detalle de Noticia */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <span className="text-[10px] uppercase font-mono tracking-widest text-exec-blue font-bold">{selectedNews.category}</span>
              <button onClick={() => setSelectedNews(null)} className="text-gray-550 hover:text-white transition-colors">
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
        isOpen={showConfirmDeletePub !== null}
        title="¿REMOVER PUBLICACIÓN?"
        message="Esta acción retirará el artículo científico del catálogo público del Observatorio. ¿Desea continuar?"
        confirmText="Remover de Indexación"
        cancelText="Cancelar"
        onConfirm={() => {
          if (showConfirmDeletePub) {
            deletePublication(showConfirmDeletePub);
            setShowConfirmDeletePub(null);
          }
        }}
        onCancel={() => setShowConfirmDeletePub(null)}
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
