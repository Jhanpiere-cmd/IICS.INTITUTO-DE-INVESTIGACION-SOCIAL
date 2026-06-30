import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Home, 
  Landmark, 
  LineChart, 
  MapPin, 
  Bell, 
  BookOpen, 
  BookCopy,
  Settings, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  MessageSquare, 
  Flame, 
  User, 
  LogOut, 
  Database, 
  GraduationCap, 
  Briefcase,
  Clock, 
  Send, 
  Check, 
  FileDown, 
  Copy, 
  PlusCircle, 
  UploadCloud, 
  X, 
  Search, 
  FileText, 
  AlertOctagon, 
  Sparkles, 
  ChevronRight, 
  Activity, 
  Cpu,
  Play,
  Video,
  Award,
  Calendar,
  Users,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProvinceData, Alert, EmergentTheme } from '../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PublicationsSection from './PublicationsSection';

interface PortalWorkspaceProps {
  provinces: ProvinceData[];
  alerts: Alert[];
  themes: EmergentTheme[];
  selectedProvinceId: string;
  onSelectProvince: (id: string) => void;
  onLogout: () => void;
  onSubmitSimulatedAlert: (newAlert: Alert) => void;
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
  setProvinces: React.Dispatch<React.SetStateAction<ProvinceData[]>>;
}

export default function PortalWorkspace({
  provinces,
  alerts,
  themes,
  selectedProvinceId,
  onSelectProvince,
  onLogout,
  onSubmitSimulatedAlert,
  setAlerts,
  setProvinces
}: PortalWorkspaceProps) {
  // Navigation
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'provinces' | 'analytics' | 'map' | 'alerts' | 'library' | 'media' | 'afi' | 'consulting' | 'settings'>('home');
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [mapMode, setMapMode] = useState<'vector' | 'heatmap' | 'satellite'>('heatmap');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const getAlertSvgCoords = (al: Alert) => {
    const latitude = (al as any).latitude;
    const longitude = (al as any).longitude;
    if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
      const minLon = -79.5;
      const maxLon = -77.5;
      const minLat = -4.5;
      const maxLat = -7.7;
      
      const x = 50 + ((longitude - minLon) / (maxLon - minLon)) * 400;
      const y = 50 + ((latitude - minLat) / (maxLat - minLat)) * 600;
      return { x, y };
    }
    
    const prov = provinces.find(p => p.name.toLowerCase() === al.province.toLowerCase());
    if (prov) {
      const numId = parseInt(al.id.replace(/\D/g, '') || '0') || 1;
      return {
        x: prov.coordinates.x + (Math.sin(numId * 17) * 15),
        y: prov.coordinates.y + (Math.cos(numId * 17) * 15)
      };
    }
    return null;
  };

  // Integrated subtabs and features states
  const [librarySubTab, setLibrarySubTab] = useState<'publications' | 'preprints' | 'datasets'>('publications');
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [afiForm, setAfiForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    institution: '',
    courseId: ''
  });
  const [submittingAfi, setSubmittingAfi] = useState(false);
  const [playingDoc, setPlayingDoc] = useState<any | null>(null);
  const [transmediaVideos, setTransmediaVideos] = useState<any[]>([]);
  const [loadingTransmedia, setLoadingTransmedia] = useState(true);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [selectedSentimentTopic, setSelectedSentimentTopic] = useState<'all' | 'mineria' | 'gobernabilidad' | 'cohesion'>('all');
  const [sentimentSearchQuery, setSentimentSearchQuery] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState({
    clientName: '',
    title: '',
    value: '',
    description: ''
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);

  useEffect(() => {
    fetchAfiCourses();
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchTransmediaVideos();
  }, []);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatarUrl')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setAvatarUrl(data?.avatarUrl || null);
    } catch (err) {
      console.error('Error fetching user profile in portal:', err);
    }
  };

  const handleRegisterProposal = async (e: FormEvent) => {
    e.preventDefault();
    if (!proposalForm.clientName || !proposalForm.title || !proposalForm.value) {
      alert('Por favor, determine los campos requeridos (*).');
      return;
    }
    setSubmittingProposal(true);
    try {
      const { error } = await supabase
        .from('consulting_proposals')
        .insert({
          title: proposalForm.title,
          client_name: proposalForm.clientName,
          value: parseFloat(proposalForm.value),
          description: proposalForm.description,
          status: 'Borrador'
        });
      if (error) throw error;
      alert('¡Solicitud de propuesta comercial registrada exitosamente! Nuestro equipo de finanzas la evaluará en el tablero CRM.');
      setProposalForm({ clientName: '', title: '', value: '', description: '' });
    } catch (err) {
      console.error('Error inserting consulting proposal:', err);
      alert('Hubo un error al procesar su solicitud de propuesta.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const fetchAfiCourses = async () => {
    try {
      setLoadingCourses(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (e) {
      console.error('Error loading AFI courses in portal:', e);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchTransmediaVideos = async () => {
    try {
      setLoadingTransmedia(true);
      const { data, error } = await supabase
        .from('transmedia_videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTransmediaVideos(data || []);
    } catch (e) {
      console.error('Error loading transmedia videos in portal:', e);
    } finally {
      setLoadingTransmedia(false);
    }
  };

  // States for citizen submitting simulated alert
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProvince, setFormProvince] = useState(provinces[0]?.name || '');
  const [formType, setFormType] = useState<'Bajo' | 'Medio' | 'Alto'>('Medio');
  const [formSubmitted, setFormSubmitted] = useState(false);

  // States for student AFI paper uploader
  const [draftTitle, setDraftTitle] = useState('');
  const [draftLine, setDraftLine] = useState('Sociología Digital y Nuevas Tecnologías');
  const [draftFile, setDraftFile] = useState('');
  const [draftSubmitted, setDraftSubmitted] = useState(false);
  const [submittedDrafts, setSubmittedDrafts] = useState<any[]>([
    {
      id: 'dt-1',
      title: 'Remediación y cohesión social en las cuencas altas de Hualgayoc',
      line: 'Sociología Territorial',
      filename: 'borrador_remediacion_hualgayoc_v2.pdf',
      date: 'Hace 3 días',
      status: 'En Proceso de Dictamen'
    }
  ]);

  // Download simulation states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  // Province tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'riskScore' | 'mencionesRedes'>('riskScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Selected province complete structure
  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId) || provinces[0];

  // Rotate custom notices on the mini ticker automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlertIndex((prev) => {
        if (alerts.length === 0) return 0;
        return (prev + 1) % alerts.length;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [alerts.length]);

  // Simulated sparkline chart for risk trend
  const getTrendPoints = (id: string) => {
    const baseIndex = id.length * 3;
    const values = [
      ((baseIndex + 2) % 6) + 2,
      ((baseIndex + 5) % 6) + 3,
      ((baseIndex + 1) % 6) + 2.5,
      ((baseIndex + 7) % 6) + 4,
      ((baseIndex + 3) % 6) + 3.8,
      selectedProvince.riskScore
    ];
    return values;
  };

  const trendValues = getTrendPoints(selectedProvince.id);
  const maxVal = 10;
  const width = 180;
  const height = 70;
  const padding = 5;
  const xSpan = (width - padding * 2) / (trendValues.length - 1);
  const pointsString = trendValues
    .map((val, idx) => {
      const x = padding + idx * xSpan;
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const areaString = `${padding},${height - padding} ${pointsString} ${width - padding},${height - padding}`;

  // Handle reporting simulated incident
  const [reportingAlertToDb, setReportingAlertToDb] = useState(false);

  const handleAlertSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription) return;

    setReportingAlertToDb(true);
    try {
      const { error } = await supabase
        .from('alerts')
        .insert({
          title: formTitle,
          description: formDescription,
          province: formProvince,
          type: formType,
          status: 'pendiente'
        });
      if (error) throw error;

      setFormSubmitted(true);
      setTimeout(() => {
        setFormSubmitted(false);
        setFormTitle('');
        setFormDescription('');
      }, 2800);
    } catch (err) {
      console.error('Error reporting alert to database:', err);
    } finally {
      setReportingAlertToDb(false);
    }
  };

  // Filter & sort provinces for 'provinces' tab
  const filteredProvinces = provinces.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.keyIssues.some((issue) => issue.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesQuery;
  }).sort((a, b) => {
    let order = 1;
    if (sortDirection === 'desc') order = -1;
    if (sortKey === 'name') {
      return a.name.localeCompare(b.name) * order;
    }
    return (a[sortKey] - b[sortKey]) * order;
  });

  // Master telemetry details for analytics
  const telemetryLogs = [
    { ts: '03:12:05', svc: 'NLP-LISTENER', msg: 'Analizado tweet del usuario @vecinoNamora. Clasificado: PREOCUPACIÓN SOCIAL.' },
    { ts: '03:08:42', svc: 'RECON-CRIM', msg: 'Actualizado conteo de reclamos rurales sobre desvío de fajas hídricas.' },
    { ts: '02:55:18', svc: 'RENACYT-BOT', msg: 'Indexada nueva publicación de Pedro Alianza en Scopus.' },
    { ts: '02:44:11', svc: 'VECTOR-GIS', msg: 'Generados capas poligonales de pasivos mineros en cuenca Llaucano.' }
  ];

  const getDisplayName = () => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      return parts[0];
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix.slice(0, 8);
    }
    return 'Usuario';
  };

  return (
    <div className="w-full h-screen bg-[#030304] text-gray-100 flex flex-col font-sans antialiased overflow-hidden">
      
      {/* Workspace Inner App Frame */}
      <div className="flex-1 flex flex-col lg:flex-row shadow-2xl relative w-full h-full border-b border-zinc-900 overflow-hidden bg-[#030304]">
        
        {/* SIDEBAR TRAY - Left-side Navigation bar */}
        <div className="w-full lg:w-16 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-[#030304] flex lg:flex-col items-center justify-between p-2.5 lg:py-3.5 lg:px-2 select-none shrink-0 overflow-x-auto lg:overflow-x-visible">
          
          {/* Logo badge / user profile */}
          <div className="hidden lg:flex flex-col items-center gap-1 pb-4 mb-4 border-b border-zinc-900 w-full">
            <img 
              src="/logo-iics-siglas.png" 
              alt="IICS Logo" 
              className="h-9 w-9 object-contain rounded-none"
            />
          </div>

          {/* Navigation group */}
          <div className="flex lg:flex-col gap-1.5 lg:w-full items-center">
            
            {/* Tab 1: Monitor Regional (Home) */}
            <button
              onClick={() => setActiveTab('home')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'home'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Monitor Regional Dashboard"
            >
              <Home className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [01] Monitor Regional
              </span>
            </button>

            {/* Tab 2: Provincias (Landmark) */}
            <button
              onClick={() => setActiveTab('provinces')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'provinces'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Análisis de Provincias"
            >
              <Landmark className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [02] Análisis Provincial
              </span>
            </button>

            {/* Tab 3: Estadísticas (LineChart) */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'analytics'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Métricas Estadísticas"
            >
              <LineChart className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [03] Métricas y Coeficientes
              </span>
            </button>

            {/* Tab 4: Mapa de Alertas (MapPin) */}
            <button
              onClick={() => setActiveTab('map')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'map'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Zonificación Georreferenciada"
            >
              <MapPin className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [04] Zonificación GIS
              </span>
            </button>

            {/* Tab 5: Consola de Alertas (Bell) */}
            <button
              onClick={() => setActiveTab('alerts')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'alerts'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Monitoreo de Incidentes"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              </div>
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [05] Consola de Alertas
              </span>
            </button>

            {/* Tab 6: Academia AFI & Datasets (BookCopy) */}
            <button
              onClick={() => setActiveTab('library')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'library'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Biblioteca y Datasets"
            >
              <BookCopy className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [06] Repositorio Científico
              </span>
            </button>

            {/* Tab: Difusión Transmedia (Video) */}
            <button
              onClick={() => setActiveTab('media')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'media'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Difusión Transmedia"
            >
              <Video className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [07] Difusión Transmedia
              </span>
            </button>

            {/* Tab: Academia AFI (GraduationCap) */}
            <button
              onClick={() => setActiveTab('afi')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'afi'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Academia AFI"
            >
              <GraduationCap className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [08] Academia AFI
              </span>
            </button>

            {/* Tab: Consultoría (Briefcase) */}
            <button
              onClick={() => setActiveTab('consulting')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'consulting'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Servicios de Consultoría"
            >
              <Briefcase className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [09] Consultoría & Sostenibilidad
              </span>
            </button>

            {/* Tab: Configuración (Settings) */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-none transition-all ${
                activeTab === 'settings'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Parámetros de Auditoría"
            >
              <Settings className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded-none font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [10] Configuración Central
              </span>
            </button>

          </div>

          {/* Bottom user card / Logout button */}
          <div className="flex lg:flex-col lg:w-full items-center gap-4 lg:gap-1.5 lg:mt-auto pt-2.5 border-t lg:border-t border-zinc-900">
            
            {/* User Profile Avatar */}
            <div className="shrink-0 mb-1 lg:mb-1.5">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="h-9 w-9 rounded-full object-cover border border-cyan-800/30 shadow-[0_0_10px_rgba(0,153,255,0.1)]"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase font-mono">
                  {user?.email ? user.email.slice(0, 2) : 'IN'}
                </div>
              )}
            </div>

            <div className="flex flex-col text-right lg:text-center shrink-0">
              <span className="text-[10px] font-sans text-zinc-300 font-black block truncate max-w-[56px] notranslate uppercase" translate="no" title={user?.fullName || user?.email || 'Invitado'}>
                {getDisplayName()}
              </span>
              <span className="text-[8px] font-black text-cyan-400 bg-cyan-950/40 px-1 py-0.5 uppercase border border-cyan-800/20 rounded-none mt-0.5 block truncate max-w-[56px]" title={user?.role || 'Invitado'}>
                {user?.role || 'Invitado'}
              </span>
            </div>

            {user && ['Director', 'Subdirector', 'Docente', 'Secretaria', 'Gestor de Redes', 'Coordinador de Eventos', 'Auxiliar Técnico'].includes(user.role) && (
              <button
                onClick={() => window.location.href = '/admin'}
                className="flex h-10 w-10 items-center justify-center rounded-none text-cyan-400 hover:text-white bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-800/35 hover:border-cyan-500 transition-colors cursor-pointer"
                title="Ir a Gestión Interna (Admin)"
              >
                <Database className="h-5 w-5 animate-pulse" />
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm('¿Está seguro que desea cerrar la sesión actual en el Portal Científico IICS?')) {
                  onLogout();
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-none text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors border border-transparent hover:border-red-900/10 cursor-pointer"
              title="Cerrar Sesión Activa"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

        </div>

        {/* WORKSPACE CONTENT SHELF */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#030304] overflow-y-auto">
          
          {/* TOP INNER STATUS BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-zinc-900 p-4 gap-3 bg-black text-left">
            <div className="space-y-1">
              <h1 className="text-sm sm:text-base font-black text-white font-sans uppercase tracking-tight flex items-center gap-2">
                {activeTab === 'home' ? (
                  <span className="text-[#0099ff] font-mono tracking-widest font-black text-sm sm:text-base">MONITOR REGIONAL (IICS)</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span className="text-xs sm:text-sm">
                      {activeTab === 'provinces' && 'CATASTRO REGIONAL (IICS)'}
                      {activeTab === 'analytics' && 'MÉTRICAS Y ANÁLISIS DE INCIDENCIA'}
                      {activeTab === 'map' && 'MAPEO GEORREFERENCIADO'}
                      {activeTab === 'alerts' && 'ALERTAS CÍVICAS'}
                      {activeTab === 'library' && 'REPOSITORIO GENERAL'}
                      {activeTab === 'media' && 'DIFUSIÓN TRANSMEDIA Y VIDEOTECA'}
                      {activeTab === 'afi' && 'ACADEMIA DE FORMACIÓN (AFI)'}
                      {activeTab === 'consulting' && 'SERVICIOS DE CONSULTORÍA Y SOSTENIBILIDAD'}
                      {activeTab === 'settings' && 'CONFIGURACIÓN CENTRAL'}
                    </span>
                  </span>
                )}
              </h1>
            </div>

            {/* Quick action or filter */}
            <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
              <select
                value={selectedProvince.id}
                onChange={(e) => onSelectProvince(e.target.value)}
                className="bg-[#121214] hover:bg-[#18181b]/80 border border-zinc-800 text-xs text-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer font-sans"
              >
                {provinces.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TAB ROUTER INLINE WRAPPER */}
          <div className="flex-1 p-4 lg:p-6 text-zinc-300">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full h-full"
              >
                
                {/* VIEW 1: COGNITIVE DASHBOARD (HOME) */}
                {activeTab === 'home' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full">
                    
                    {/* Left Column: Metric Core Indicators */}
                    <div className="lg:col-span-8 flex flex-col gap-5">
                      
                      {/* Conflict Index Gauge */}
                      <div className="bg-[#08080a] border border-[#16161a] rounded-none p-5 relative overflow-hidden group hover:border-[#0099ff]/25 transition-all text-left">
                        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-cyan-400/5 to-transparent rounded-none"></div>
                        
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] font-mono font-bold tracking-widest text-[#0099ff] uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">
                              Métrica Integrada
                            </span>
                            <h2 className="text-base font-black text-white uppercase font-sans mt-3 tracking-wide">
                              Índice de Conflictividad y Tensión Coyuntural
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1">
                              Suma promedio de demandas comunales, paros preventivos anotados y volatilidad de los reclamos en medios.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/10 px-2.5 py-1 rounded-none">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>12% tendencia</span>
                          </div>
                        </div>

                        {/* Middle Stat Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-6 py-4 border-y border-zinc-900/80">
                          
                          <div className="sm:col-span-4 flex items-baseline gap-1 bg-zinc-950/40 p-3 border border-zinc-900 select-none">
                            <span className="text-5xl font-black text-white font-mono leading-none tracking-tighter">
                              {selectedProvince.riskScore.toFixed(1)}
                            </span>
                            <span className="text-sm text-zinc-650">/10</span>
                            
                            <div className="ml-3">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide rounded-none ${
                                selectedProvince.riskDescription === 'Alto'
                                  ? 'text-red-400 bg-red-950/40 border border-red-500/25'
                                  : selectedProvince.riskDescription === 'Moderado'
                                  ? 'text-yellow-400 bg-yellow-950/40 border border-yellow-500/25'
                                  : 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/20'
                              }`}>
                                {selectedProvince.riskDescription}
                              </span>
                              <span className="block text-[8px] font-mono text-zinc-550 mt-1 uppercase">Riesgo</span>
                            </div>
                          </div>

                          <div className="sm:col-span-5 text-xs text-zinc-400 leading-relaxed font-sans px-2">
                            <p className="font-semibold text-zinc-300">Determinación Territorial:</p>
                            La provincia de <b className="text-white">{selectedProvince.name}</b> registra un coeficiente de vulnerabilidad {selectedProvince.riskDescription.toLowerCase()}. Cuenta con {selectedProvince.alertCount} alerta(s) registradas y un flujo constante en telecomunales.
                          </div>

                          {/* Chart SVG */}
                          <div className="sm:col-span-3 flex flex-col items-end">
                            <div className="w-[150px] h-[55px] relative">
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                                <defs>
                                  <linearGradient id="chartGrad-heavy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0099ff" stopOpacity="0.45" />
                                    <stop offset="100%" stopColor="#0099ff" stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>
                                <polygon points={areaString} fill="url(#chartGrad-heavy)" />
                                <polyline
                                  fill="none"
                                  stroke="#0099ff"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={pointsString}
                                />
                                {trendValues.map((val, idx) => {
                                  const x = padding + idx * xSpan;
                                  const y = height - padding - (val / maxVal) * (height - padding * 2);
                                  const isLast = idx === trendValues.length - 1;
                                  return (
                                    <circle
                                      key={idx}
                                      cx={x}
                                      cy={y}
                                      r={isLast ? 4 : 2}
                                      fill={isLast ? '#0099ff' : '#4b5563'}
                                      className={isLast ? 'animate-ping' : ''}
                                    />
                                  );
                                })}
                              </svg>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 mt-1.5 uppercase">vs. mes anterior</span>
                          </div>

                        </div>

                        {/* Bottom elements active alerts */}
                        <div className="mt-4 space-y-3">
                          {selectedProvince.activeAlert ? (
                            <div className="flex items-start gap-3 bg-red-950/25 border border-red-500/15 p-3 rounded-none text-left">
                              <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider block">Alerta Territorial Activa de Alta Prioridad</span>
                                <p className="text-xs font-bold text-zinc-200">{selectedProvince.activeAlert}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 bg-[#050506] border border-zinc-900 p-2 text-xs text-zinc-550 italic">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-700 animate-pulse"></span>
                              <span>Canales fluidos sin eventos críticos graves identificados en las últimas 24 horas en esta provincia.</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1.5">
                            <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Temas Críticos:</span>
                            {selectedProvince.keyIssues.map((issue) => (
                              <span key={issue} className="text-[10px] text-[#0099ff] font-mono bg-cyan-950/30 border border-cyan-800/15 px-2 py-0.5">
                                #{issue}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Map preview */}
                      <div className="bg-[#08080a] border border-[#16161a] p-5 rounded-none text-left flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-zinc-900 pb-2 gap-2">
                          <div>
                            <span className="text-[9px] font-mono font-bold tracking-widest text-[#0099ff] uppercase bg-cyan-950/20 border border-cyan-800/10 px-2 py-0.5">Zonificación</span>
                            <h3 className="text-xs font-bold font-mono text-white tracking-wider uppercase mt-1">Esquema Cartográfico del Foco Regional</h3>
                          </div>
                          
                          {/* Map Toggles */}
                          <div className="flex items-center gap-1 bg-[#050507] border border-zinc-900 p-0.5 rounded-none self-start sm:self-center">
                            <button
                              onClick={() => setMapMode('vector')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'vector' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Red Vectorial
                            </button>
                            <button
                              onClick={() => setMapMode('heatmap')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'heatmap' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Mapa de Calor
                            </button>
                            <button
                              onClick={() => setMapMode('satellite')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'satellite' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Satélite
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                          
                          {/* Mini Map area */}
                          <div className="sm:col-span-5 bg-[#050507] border border-zinc-900/40 p-1.5 h-48 flex items-center justify-center relative overflow-hidden rounded-none w-full">
                            {mapMode === 'satellite' ? (
                              <div className="w-full h-full relative z-10 font-mono">
                                <iframe
                                  title="Google Map Cajamarca mini"
                                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedProvince.name + ', Cajamarca, Peru')}&t=h&z=10&output=embed&iwloc=near`}
                                  className="w-full h-full border-0 filter grayscale-[15%] contrast-[110%]"
                                  allowFullScreen={false}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                ></iframe>
                              </div>
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-[#030304] bg-[linear-gradient(to_right,#111116_1px,transparent_1px),linear-gradient(to_bottom,#111116_1px,transparent_1px)] bg-[size:10px_10px] opacity-40 animate-pulse"></div>
                                
                                <svg viewBox="0 0 500 700" className="h-full w-auto max-w-[170px] text-zinc-800 z-10 opacity-90 transition-all duration-300">
                                  <defs>
                                    <radialGradient id="mini-heat-high" cx="50%" cy="50%" r="50%">
                                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                                      <stop offset="35%" stopColor="#ef4444" stopOpacity="0.3" />
                                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                    </radialGradient>
                                    <radialGradient id="mini-heat-mod" cx="50%" cy="50%" r="50%">
                                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                                      <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.3" />
                                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                    </radialGradient>
                                    <radialGradient id="mini-heat-low" cx="50%" cy="50%" r="50%">
                                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
                                      <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.2" />
                                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                                    </radialGradient>
                                  </defs>

                                  {/* Renders connecting vector links ONLY in vector mode */}
                                  {mapMode === 'vector' && (
                                    <g stroke="#1a1a24" strokeWidth="2.5" opacity="0.35">
                                      <line x1="190" y1="80" x2="280" y2="120" />
                                      <line x1="280" y1="120" x2="170" y2="190" />
                                      <line x1="170" y1="190" x2="220" y2="280" />
                                      <line x1="220" y1="280" x2="110" y2="310" />
                                      <line x1="220" y1="280" x2="230" y2="360" />
                                      <line x1="230" y1="360" x2="330" y2="350" />
                                      <line x1="110" y1="310" x2="100" y2="430" />
                                      <line x1="100" y1="430" x2="180" y2="450" />
                                      <line x1="180" y1="450" x2="270" y2="490" />
                                      <line x1="230" y1="360" x2="270" y2="490" />
                                      <line x1="330" y1="350" x2="270" y2="490" />
                                      <line x1="270" y1="490" x2="340" y2="540" />
                                      <line x1="270" y1="490" x2="90" y2="550" />
                                      <line x1="340" y1="540" x2="370" y2="620" />
                                    </g>
                                  )}

                                  {/* Renders heatmap glows under nodes in heatmap mode */}
                                  {mapMode === 'heatmap' && provinces.map((prov) => {
                                    const heatR = prov.riskScore * 13 + 18;
                                    const grad = prov.riskScore >= 7 
                                      ? 'url(#mini-heat-high)' 
                                      : prov.riskScore >= 4 
                                      ? 'url(#mini-heat-mod)' 
                                      : 'url(#mini-heat-low)';
                                    return (
                                      <circle
                                        key={`hm-mini-${prov.id}`}
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={heatR}
                                        fill={grad}
                                        pointerEvents="none"
                                        className="mix-blend-screen"
                                      />
                                    );
                                  })}

                                  {/* Render points */}
                                  {provinces.map((prov) => (
                                    <g 
                                      key={prov.id} 
                                      className="cursor-pointer" 
                                      onClick={() => onSelectProvince(prov.id)}
                                    >
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r="18"
                                        fill="transparent"
                                      />
                                      {/* Concentric targets representing thermal spot node */}
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={prov.id === selectedProvinceId ? '8' : '4'}
                                        fill={
                                          prov.riskScore >= 7
                                            ? '#ef4444'
                                            : prov.riskScore >= 4
                                            ? '#f59e0b'
                                            : '#06b6d4'
                                        }
                                        className={prov.id === selectedProvinceId ? 'animate-pulse' : ''}
                                      />
                                      {prov.id === selectedProvinceId && (
                                        <circle
                                          cx={prov.coordinates.x}
                                          cy={prov.coordinates.y}
                                          r="14"
                                          stroke="#0099ff"
                                          strokeWidth="1.2"
                                          fill="none"
                                          strokeDasharray="3,3"
                                        />
                                      )}
                                    </g>
                                  ))}
                                </svg>

                                <div className="absolute top-2/3 right-1/4 h-24 w-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
                              </>
                            )}
                          </div>

                          <div className="sm:col-span-7 space-y-4 text-xs text-zinc-400">
                            <div>
                              <span className="block text-[9px] font-mono text-zinc-550 font-bold uppercase">Ubicación Seleccionada:</span>
                              <span className="text-sm font-black text-white font-mono uppercase">{selectedProvince.name}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-left">
                              {selectedProvince.indicators.map((ind) => (
                                <div key={ind.label} className="bg-[#050506]/50 border border-zinc-900 p-2 rounded-none">
                                  <span className="block text-[9px] font-mono text-zinc-550 tracking-wide uppercase">{ind.label}</span>
                                  <span className="text-zinc-200 font-bold font-mono text-[11px] block mt-0.5">{ind.value}</span>
                                </div>
                              ))}
                            </div>

                            <div className="bg-amber-950/20 border border-amber-900/15 p-2 rounded-none text-[10px] text-amber-300 flex items-center gap-1.5">
                              <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                              <span>Foco Caliente Geolocalizado: <b>HUALGAYOC (Índice Combustión 7.8)</b></span>
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Right Column: Social metrics & Emergents */}
                    <div className="lg:col-span-4 flex flex-col gap-5">
                      
                      {/* Social Mentions Box */}
                      <div className="bg-[#08080a] border border-[#16161a] p-5 rounded-none text-left">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
                          <div>
                            <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-950/20 border border-cyan-800/15 px-2 py-0.5">ESCUCHA ACTIVA API</span>
                            <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider mt-1">Menciones Mediáticas</h3>
                          </div>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 border border-emerald-900/10 font-bold flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            <span>+23%</span>
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-baseline justify-between">
                            <div>
                                <span className="text-4xl font-extrabold text-white font-mono tracking-tight leading-none">
                                  {selectedProvince.mencionesRedes.toLocaleString()}
                                </span>
                                <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Publicaciones Escaneadas</span>
                            </div>
                            <span className="text-xs text-zinc-400 font-mono">Últimas 48 horas</span>
                          </div>

                          {/* Sparkline mini bars custom CSS */}
                          <div className="flex items-end justify-between h-8 gap-1 p-1 bg-[#020203] border border-zinc-900/50">
                            {[30, 48, 22, 65, 38, 80, 52, 95, 60, 72, 88, 70].map((h, idx) => (
                              <div key={idx} className="flex-1 bg-zinc-900 h-full relative overflow-hidden group">
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  transition={{ duration: 1.2, delay: idx * 0.04 }}
                                  className="absolute bottom-0 left-0 right-0 bg-cyan-400 group-hover:bg-[#0099ff] transition-colors"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Emergent Themes Indicator list */}
                      <div className="bg-[#08080a] border border-[#16161a] p-5 rounded-none text-left">
                        <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-950/20 border border-cyan-800/15 px-2 py-0.5 uppercase">Modelamiento Temático</span>
                        <h3 className="text-xs font-black text-white font-mono uppercase mt-2.5 pb-2 border-b border-zinc-900">Áreas de Conflicto Clave</h3>
                        
                        <div className="space-y-3 pt-3">
                          {themes.map((theme) => (
                            <div key={theme.name} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-350 font-medium truncate">{theme.name}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-xs text-zinc-150 font-bold">{theme.percentage}%</span>
                                  {theme.trend === 'up' && <ArrowUp className="h-3 w-3 text-red-400" />}
                                  {theme.trend === 'down' && <ArrowDown className="h-3 w-3 text-emerald-400" />}
                                  {theme.trend === 'stable' && <span className="text-[8px] text-zinc-600">--</span>}
                                </div>
                              </div>
                              <div className="w-full bg-zinc-950 h-1.5 rounded-none overflow-hidden border border-zinc-900">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${theme.percentage}%` }}
                                  className="bg-cyan-500 h-full rounded-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Latest alerts revolving loop slider */}
                      <div className="bg-[#08080a] border border-[#16161a] p-4 rounded-none text-left flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase font-black tracking-widest">Últimas Alertas</span>
                          <Clock className="h-4 w-4 text-zinc-650" />
                        </div>

                        <div className="h-20 relative overflow-hidden my-3">
                          <AnimatePresence mode="wait">
                            {alerts.map((alert, idx) => {
                              if (idx !== currentAlertIndex) return null;
                              return (
                                <motion.div
                                  key={alert.id}
                                  initial={{ opacity: 0, x: 25 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -25 }}
                                  transition={{ duration: 0.3 }}
                                  className="absolute inset-0 flex flex-col justify-center text-xs"
                                >
                                  <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-550 mb-1 leading-none">
                                    <span className={`inline-block px-1.5 py-0.2 uppercase font-extrabold border ${
                                      alert.type === 'Alto'
                                        ? 'text-red-400 bg-red-950/30 border-red-900/30'
                                        : alert.type === 'Medio'
                                        ? 'text-yellow-400 bg-yellow-950/30 border-yellow-900/30'
                                        : 'text-cyan-400 bg-cyan-950/30 border-cyan-c800/20'
                                    }`}>
                                      {alert.type}
                                    </span>
                                    <span>{alert.time}</span>
                                    <span>•</span>
                                    <span className="text-cyan-500 font-bold">{alert.province}</span>
                                  </div>
                                  <h4 className="font-extrabold text-zinc-150 truncate max-w-full leading-tight">
                                    {alert.title}
                                  </h4>
                                  <p className="text-[10.5px] text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                    {alert.description}
                                  </p>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        <button
                          onClick={() => setActiveTab('alerts')}
                          className="w-full text-center bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-[10px] tracking-wider font-mono font-bold text-cyan-400 hover:text-[#0099ff] uppercase py-2 py-1.5 transition-all text-left"
                        >
                          Ir a la consola de incidentes →
                        </button>
                      </div>

                    </div>

                  </div>
                )}

                {/* VIEW 2: CATASTRO PROVINCIAL (TABLE) */}
                {activeTab === 'provinces' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2 py-0.5">Catastro</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5">Información Consolidada por Territorio</h2>
                      <p className="text-xs text-zinc-400">
                        Revise y filtre la base del IICS correspondiente a los coeficientes de calor, indicadores hídricos, volumen total de alertas registradas y nivel de cohesión indexado de las trece provincias cajamarquinas.
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 items-stretch sm:items-center justify-between">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-550" />
                        <input
                          type="text"
                          placeholder="Buscar provincia o tema de interés (ej. cafés, contaminación)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-black border border-zinc-850 pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-cyan-500 rounded-none placeholder-zinc-700"
                        />
                      </div>

                      <div className="flex gap-2 font-mono text-[11px] items-center">
                        <span className="text-zinc-555">Ordenar:</span>
                        <select
                          value={sortKey}
                          onChange={(e: any) => setSortKey(e.target.value)}
                          className="bg-black border border-zinc-850 text-zinc-200 p-2 text-xs cursor-pointer focus:border-cyan-500 rounded-none outline-none text-left"
                        >
                          <option value="name">Provincia (Nombre)</option>
                          <option value="riskScore">Índice Combustión</option>
                          <option value="mencionesRedes">Volatilidad de Redes</option>
                        </select>
                        <button
                          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="px-3 py-2 bg-black hover:bg-zinc-950 border border-zinc-c850 text-cyan-400 hover:text-white transition-colors uppercase font-bold"
                        >
                          {sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
                        </button>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="border border-zinc-900 bg-black/40 overflow-hidden rounded-none">
                      <div className="grid grid-cols-12 bg-black border-b border-zinc-900 p-3.5 text-[10px] uppercase font-mono font-black text-zinc-400">
                        <span className="col-span-4 block text-left">Provincia</span>
                        <span className="col-span-3 block text-center">Índice de Riesgo</span>
                        <span className="col-span-2 block text-center">Alertas Totales</span>
                        <span className="col-span-3 block text-right">Menciones Redes</span>
                      </div>

                      <div className="divide-y divide-zinc-900 text-xs text-zinc-300 max-h-[350px] overflow-y-auto">
                        {filteredProvinces.map((prov) => (
                          <div 
                            key={prov.id} 
                            onClick={() => onSelectProvince(prov.id)}
                            className={`grid grid-cols-12 items-center p-3.5 hover:bg-zinc-900/40 cursor-pointer transition-colors ${
                              prov.id === selectedProvinceId ? 'bg-cyan-950/10 border-l-2 border-cyan-500' : ''
                            }`}
                          >
                            <div className="col-span-4 block text-left">
                              <span className="font-extrabold text-white text-sm block">{prov.name}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {prov.keyIssues.map(issue => (
                                  <span key={issue} className="text-[8.5px] font-mono text-zinc-400 bg-zinc-900 px-1 py-0.2">
                                    #{issue}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <span className="col-span-3 block text-center">
                              <span className={`inline-block px-2.5 py-0.5 font-bold font-mono text-[10.5px] rounded-none border ${
                                prov.riskScore >= 7
                                  ? 'bg-red-950/30 text-red-200 border-red-500/20'
                                  : prov.riskScore >= 4
                                  ? 'bg-yellow-950/30 text-yellow-300 border-yellow-500/20'
                                  : 'bg-cyan-950/30 text-cyan-300 border-cyan-500/10'
                              }`}>
                                {prov.riskScore.toFixed(1)} / 10
                              </span>
                            </span>

                            <span className="col-span-2 block text-center font-mono font-medium text-zinc-150">
                              {prov.alertCount} alert(s)
                            </span>

                            <span className="col-span-3 block text-right font-mono text-cyan-400 font-bold text-sm">
                              {prov.mencionesRedes.toLocaleString()}
                            </span>

                          </div>
                        ))}

                        {filteredProvinces.length === 0 && (
                          <div className="p-12 text-center text-zinc-550 italic font-medium">
                            No se encontraron provincias con los criterios de búsqueda provistos.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed dossier layout */}
                    <div className="bg-black border border-zinc-900 p-5 rounded-none flex flex-col md:flex-row justify-between items-start gap-6 select-none">
                      <div className="space-y-2.5 text-left md:max-w-xl">
                        <span className="block text-[8px] font-mono text-zinc-500 tracking-widest uppercase">Dossier Analítico de</span>
                        <h4 className="text-lg font-black text-white font-mono uppercase tracking-tight leading-none">{selectedProvince.name}</h4>
                        <p className="text-xs text-zinc-350 leading-relaxed font-sans">
                          Inspección de las variables demográficas y territoriales. La captación hídrica y los pasivos acumulados representan desafíos clave. El IICS ejerce escucha activa las 24 horas sobre este polo comitente.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
                        {selectedProvince.indicators.map((ind) => (
                          <div key={ind.label} className="bg-zinc-950 border border-zinc-900 p-3 min-w-[140px] text-left">
                            <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{ind.label}</span>
                            <span className="text-white font-extrabold font-mono text-sm block mt-1">{ind.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Provincial Social Listening Feed */}
                    <div className="bg-[#050506] border border-zinc-900 p-5 rounded-none text-left space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-cyan-400" />
                          Escucha Territorial: {selectedProvince.name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">MENCIONES LOCALES EN TIEMPO REAL</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'p1', author: '@RondasChota', content: 'Asamblea general de las rondas de Chota discutiendo el plan regulador de aguas distrital. Hay desacuerdos pero la coordinación se mantiene pacífica.', topic: 'gobernabilidad', sentiment: 'neutral', date: 'Hace 10 min', location: 'Chota' },
                          { id: 'p2', author: 'Radio Lajas', content: 'Comunidades agrarias denuncian contaminación en el riachuelo Lajas. Exigen presencia inmediata de la mesa técnica del IICS.', topic: 'mineria', sentiment: 'negative', date: 'Hace 45 min', location: 'Chota' },
                          { id: 'p3', author: '@VozCelendin', content: 'Exitosa capacitación de la AFI en Celendín. Jóvenes muestran enorme interés en aprender sobre sociología territorial.', topic: 'cohesion', sentiment: 'positive', date: 'Hace 2 horas', location: 'Celendín' },
                          { id: 'p4', author: 'El Informador Hualgayoc', content: 'Tensión en Hualgayoc por trabajos nocturnos en el pasivo minero cercano a la captación de agua. Vecinos se declaran en alerta.', topic: 'mineria', sentiment: 'negative', date: 'Hace 3 horas', location: 'Hualgayoc' },
                          { id: 'p5', author: '@CajamarcaNoticias', content: 'Municipalidad Provincial de Cajamarca anuncia alianza técnica con el IICS para el catastro de cuencas de este semestre.', topic: 'gobernabilidad', sentiment: 'positive', date: 'Hace 5 horas', location: 'Cajamarca' },
                          { id: 'p6', author: '@FrenteDefensaJaen', content: 'Falta de servicios de agua potable genera fuerte malestar en el sector norte de Jaén. Coordinan movilización preventiva.', topic: 'gobernabilidad', sentiment: 'negative', date: 'Hace 6 horas', location: 'Jaén' }
                        ]
                        .filter(post => post.location.toLowerCase() === selectedProvince.name.toLowerCase())
                        .map(post => (
                          <div key={post.id} className="bg-black border border-zinc-950 p-4 space-y-2 text-left flex flex-col justify-between">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-white font-mono">{post.author}</span>
                              <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border ${
                                post.sentiment === 'positive' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' :
                                post.sentiment === 'negative' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                'bg-amber-950/20 text-amber-400 border-amber-900/30'
                              }`}>
                                {post.sentiment}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">{post.content}</p>
                            <span className="text-[9px] font-mono text-zinc-650 block text-right">{post.date}</span>
                          </div>
                        ))}
                        {[
                          { id: 'p1', author: '@RondasChota', content: 'Asamblea general de las rondas de Chota discutiendo el plan regulador de aguas distrital. Hay desacuerdos pero la coordinación se mantiene pacífica.', topic: 'gobernabilidad', sentiment: 'neutral', date: 'Hace 10 min', location: 'Chota' },
                          { id: 'p2', author: 'Radio Lajas', content: 'Comunidades agrarias denuncian contaminación en el riachuelo Lajas. Exigen presencia inmediata de la mesa técnica del IICS.', topic: 'mineria', sentiment: 'negative', date: 'Hace 45 min', location: 'Chota' },
                          { id: 'p3', author: '@VozCelendin', content: 'Exitosa capacitación de la AFI en Celendín. Jóvenes muestran enorme interés en aprender sobre sociología territorial.', topic: 'cohesion', sentiment: 'positive', date: 'Hace 2 horas', location: 'Celendín' },
                          { id: 'p4', author: 'El Informador Hualgayoc', content: 'Tensión en Hualgayoc por trabajos nocturnos en el pasivo minero cercano a la captación de agua. Vecinos se declaran en alerta.', topic: 'mineria', sentiment: 'negative', date: 'Hace 3 horas', location: 'Hualgayoc' },
                          { id: 'p5', author: '@CajamarcaNoticias', content: 'Municipalidad Provincial de Cajamarca anuncia alianza técnica con el IICS para el catastro de cuencas de este semestre.', topic: 'gobernabilidad', sentiment: 'positive', date: 'Hace 5 horas', location: 'Cajamarca' },
                          { id: 'p6', author: '@FrenteDefensaJaen', content: 'Falta de servicios de agua potable genera fuerte malestar en el sector norte de Jaén. Coordinan movilización preventiva.', topic: 'gobernabilidad', sentiment: 'negative', date: 'Hace 6 horas', location: 'Jaén' }
                        ].filter(post => post.location.toLowerCase() === selectedProvince.name.toLowerCase()).length === 0 && (
                          <div className="col-span-full py-8 text-center text-[10px] text-zinc-550 font-mono uppercase tracking-widest border border-dashed border-zinc-900">
                            No hay menciones registradas recientemente en la provincia de {selectedProvince.name}.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* VIEW 3: ANALYTICS (CHARTS) */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Analítica Avanzada</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5">Métricas de Sentimiento y Progresión</h2>
                      <p className="text-xs text-zinc-400">
                        Visualización integrada de variables de conflictividad social versus tendencias de sentimiento andino en tiempo real (proyección semestral acumulada).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Interactive charting card */}
                      <div className="lg:col-span-8 bg-black border border-zinc-900 p-5 rounded-none flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
                          <span className="text-xs font-bold font-mono text-white uppercase">Progresión Mensual de Conflicto vs Redes 2026</span>
                          <div className="flex items-center gap-4 text-[9px] font-mono">
                            <span className="flex items-center gap-1.5 text-cyan-400">
                              <span className="h-2 w-2 bg-cyan-400 rounded-none inline-block"></span> Menciones Redes (Miles)
                            </span>
                            <span className="flex items-center gap-1.5 text-red-400">
                              <span className="h-2 w-2 bg-red-400 rounded-none inline-block"></span> Incidencia de Tensión
                            </span>
                          </div>
                        </div>

                        {/* Complete custom vector Line Chart representing recharts style */}
                        <div className="h-64 bg-zinc-950/50 border border-zinc-900 flex items-end justify-between p-4 relative">
                          
                          {/* Grid Y-axis indicators */}
                          <div className="absolute top-2 left-2 flex flex-col justify-between h-56 text-[8px] font-mono text-zinc-650 opacity-80">
                            <span>10 (Altisimo)</span>
                            <span>7.5 (Elevado)</span>
                            <span>5.0 (Moderado)</span>
                            <span>2.5 (Estable)</span>
                            <span>0 (Nulo)</span>
                          </div>

                          <svg viewBox="0 0 600 220" className="w-full h-full text-zinc-700 overflow-visible z-10 px-6">
                            {/* Gridlines */}
                            <line x1="0" y1="44" x2="600" y2="44" stroke="#1c1917" strokeDasharray="3,3" />
                            <line x1="0" y1="88" x2="600" y2="88" stroke="#1c1917" strokeDasharray="3,3" />
                            <line x1="0" y1="132" x2="600" y2="132" stroke="#1c1917" strokeDasharray="3,3" />
                            <line x1="0" y1="176" x2="600" y2="176" stroke="#1c1917" strokeDasharray="3,3" />

                            {/* Data Lines paths */}
                            {/* Redes Mentions data coordinates (Jan -> Jun) */}
                            {/* [Jan: 4.2k, Feb: 5.5s, Mar: 3.8s, Apr: 8.5s, May: 11k, Jun: 12.5k] */}
                            <polyline
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="3.2"
                              points="50,165 150,140 250,155 350,90 450,55 550,35"
                            />
                            {/* Physical conflict Index coordinates */}
                            {/* [Jan: 3.2, Feb: 3.6, Mar: 4.1, Apr: 5.8, May: 6.9, Jun: 8.2] */}
                            <polyline
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="3.2"
                              strokeDasharray="4,2"
                              points="50,180 150,170 250,160 350,110 450,85 550,60"
                            />

                            {/* Nodes dots */}
                            {[
                              {x: 50, y1: 165, y2: 180, lbl: 'Ene'},
                              {x: 150, y1: 140, y2: 170, lbl: 'Feb'},
                              {x: 250, y1: 155, y2: 160, lbl: 'Mar'},
                              {x: 350, y1: 90, y2: 110, lbl: 'Abr'},
                              {x: 450, y1: 55, y2: 85, lbl: 'May'},
                              {x: 550, y1: 35, y2: 60, lbl: 'Jun'}
                            ].map((nd) => (
                              <g key={nd.lbl}>
                                <circle cx={nd.x} cy={nd.y1} r="4" fill="#06b6d4" className="hover:scale-125 transition-transform" />
                                <circle cx={nd.x} cy={nd.y2} r="4" fill="#ef4444" className="hover:scale-125 transition-transform" />
                                <text x={nd.x - 10} y="210" fill="#a1a1aa" fontSize="9" fontFamily="monospace">{nd.lbl}</text>
                              </g>
                            ))}
                          </svg>

                          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-zinc-650 opacity-80 uppercase">[ Proyección Semestral de Conflictos - IICS 2026 ]</div>
                        </div>

                      </div>

                      {/* Right Column: Sentiment Analysis & LSD Widget */}
                      <div className="lg:col-span-4 flex flex-col gap-4">
                        
                        <div className="bg-[#050506] border border-zinc-900 p-4 rounded-none text-left space-y-3">
                          <span className="block text-[9px] font-mono text-zinc-550 uppercase tracking-widest">LSD: Distribución de Sentimientos</span>
                          <h4 className="font-extrabold text-white font-mono uppercase">Análisis por Tópico Clave</h4>
                          
                          {/* Topic Selector */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {[
                              { id: 'all', label: 'Todos' },
                              { id: 'mineria', label: 'Minería' },
                              { id: 'gobernabilidad', label: 'Gobernanza' },
                              { id: 'cohesion', label: 'Cohesión' }
                            ].map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedSentimentTopic(t.id as any)}
                                className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                                  selectedSentimentTopic === t.id
                                    ? 'bg-cyan-950/40 text-cyan-400 border-cyan-850'
                                    : 'bg-black border-zinc-850 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          {/* Computed/Mock Sentiments Distribution Bar */}
                          <div className="space-y-2 pt-2 border-t border-zinc-950">
                            {(() => {
                              const breakdown = 
                                selectedSentimentTopic === 'mineria' ? { pos: 10, neu: 30, neg: 60 } :
                                selectedSentimentTopic === 'gobernabilidad' ? { pos: 25, neu: 45, neg: 30 } :
                                selectedSentimentTopic === 'cohesion' ? { pos: 80, neu: 15, neg: 5 } :
                                { pos: 35, neu: 30, neg: 35 }; // all

                              return (
                                <div className="space-y-3">
                                  <div className="w-full h-3 bg-zinc-950 flex overflow-hidden border border-zinc-900">
                                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${breakdown.pos}%` }} title={`Positivo: ${breakdown.pos}%`} />
                                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${breakdown.neu}%` }} title={`Neutro: ${breakdown.neu}%`} />
                                    <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${breakdown.neg}%` }} title={`Negativo: ${breakdown.neg}%`} />
                                  </div>

                                  <div className="flex justify-between items-center text-[9px] font-mono">
                                    <span className="text-emerald-400 font-bold">Positivo ({breakdown.pos}%)</span>
                                    <span className="text-amber-400 font-bold">Neutro ({breakdown.neu}%)</span>
                                    <span className="text-red-400 font-bold">Negativo ({breakdown.neg}%)</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Local Media Listening Status */}
                        <div className="bg-[#050506] border border-zinc-900 p-4 rounded-none text-left">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Escucha de Medios Redes</span>
                          <h4 className="font-bold text-white font-mono uppercase mt-1">Robustez del Algoritmo</h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed mt-2.5 font-sans">
                            La asimetría de opiniones sobre proyectos territoriales se cataliza en Facebook y radios comunales locales un promedio de <b>7.2 días hábiles antes</b> de traducirse en paros o asambleas ronderas en campo.
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Live Social Listening simulated feed */}
                    <div className="bg-black border border-zinc-900 p-5 space-y-4 mt-6">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-cyan-400" />
                          Escucha Activa Regional (Social Listening)
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">CONECTADO AL CLÚSTER IICS</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'p1', author: '@RondasChota', content: 'Asamblea general de las rondas de Chota discutiendo el plan regulador de aguas distrital. Hay desacuerdos pero la coordinación se mantiene pacífica.', topic: 'gobernabilidad', sentiment: 'neutral', date: 'Hace 10 min', location: 'Chota' },
                          { id: 'p2', author: 'Radio Lajas', content: 'Comunidades agrarias denuncian contaminación en el riachuelo Lajas. Exigen presencia inmediata de la mesa técnica del IICS.', topic: 'mineria', sentiment: 'negative', date: 'Hace 45 min', location: 'Chota' },
                          { id: 'p3', author: '@VozCelendin', content: 'Exitosa capacitación de la AFI en Celendín. Jóvenes muestran enorme interés en aprender sobre sociología territorial.', topic: 'cohesion', sentiment: 'positive', date: 'Hace 2 horas', location: 'Celendín' },
                          { id: 'p4', author: 'El Informador Hualgayoc', content: 'Tensión en Hualgayoc por trabajos nocturnos en el pasivo minero cercano a la captación de agua. Vecinos se declaran en alerta.', topic: 'mineria', sentiment: 'negative', date: 'Hace 3 horas', location: 'Hualgayoc' },
                          { id: 'p5', author: '@CajamarcaNoticias', content: 'Municipalidad Provincial de Cajamarca anuncia alianza técnica con el IICS para el catastro de cuencas de este semestre.', topic: 'gobernabilidad', sentiment: 'positive', date: 'Hace 5 horas', location: 'Cajamarca' },
                          { id: 'p6', author: '@FrenteDefensaJaen', content: 'Falta de servicios de agua potable genera fuerte malestar en el sector norte de Jaén. Coordinan movilización preventiva.', topic: 'gobernabilidad', sentiment: 'negative', date: 'Hace 6 horas', location: 'Jaén' }
                        ]
                        .filter(post => selectedSentimentTopic === 'all' || post.topic === selectedSentimentTopic)
                        .map(post => (
                          <div key={post.id} className="bg-[#030304] border border-zinc-900 p-4 space-y-2.5 text-left flex flex-col justify-between hover:border-zinc-800 transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-white font-mono">{post.author}</span>
                              <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border ${
                                post.sentiment === 'positive' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' :
                                post.sentiment === 'negative' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                'bg-amber-950/20 text-amber-400 border-amber-900/30'
                              }`}>
                                {post.sentiment}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-zinc-300 leading-relaxed font-sans">{post.content}</p>
                            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-550 pt-2 border-t border-zinc-950">
                              <span>Ubicación: {post.location}</span>
                              <span>{post.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* VIEW 4: MAP DATA (MAP) */}
                {activeTab === 'map' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Mapa GIS</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Capas de Georreferenciación y Zonificación</h2>
                      <p className="text-xs text-zinc-400">
                        Zonificación multicapa del territorio. Examine las coordenadas relativas de criticidad, rumbos fluviales, y distribución espacial del IICS.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Large Map component representation */}
                      <div className="lg:col-span-8 bg-black border border-zinc-900 p-5 rounded-none flex flex-col justify-between relative overflow-hidden min-h-[460px]">
                        
                        {/* Map Header with controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-zinc-900 mb-4 z-20 gap-2 w-full">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider uppercase">Visualizador de Campo en Tiempo Real</span>
                          </div>
                          
                          {/* Map Mode Buttons/Toggle */}
                          <div className="flex items-center gap-1 bg-[#050507] border border-zinc-900 p-0.5 rounded-none">
                            <button
                              onClick={() => setMapMode('vector')}
                              className={`px-3 py-1 text-[9.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'vector' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Red Vectorial
                            </button>
                            <button
                              onClick={() => setMapMode('heatmap')}
                              className={`px-3 py-1 text-[9.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'heatmap' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Mapa de Calor
                            </button>
                            <button
                              onClick={() => setMapMode('satellite')}
                              className={`px-3 py-1 text-[9.5px] font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                                mapMode === 'satellite' 
                                  ? 'bg-cyan-500 text-slate-950' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Satélite Live
                            </button>
                          </div>
                        </div>

                        {/* Map content area */}
                        <div className="flex-1 w-full flex items-center justify-center relative min-h-[380px]">
                          {mapMode === 'satellite' ? (
                            <div className="w-full h-full min-h-[380px] flex flex-col justify-between border border-zinc-900 bg-black z-10">
                              <iframe
                                title="Google Map Cajamarca Large"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedProvince.name + ', Cajamarca, Peru')}&t=h&z=11&output=embed&iwloc=near`}
                                className="w-full flex-1 min-h-[360px] border-0 filter grayscale-[10%] contrast-[105%]"
                                allowFullScreen={false}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              ></iframe>
                              <div className="bg-[#030304] border-t border-zinc-950 p-2.5 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                                <span className="uppercase">
                                  <b className="text-cyan-400">COORDENADAS SATELITALES EN VIVO:</b> {selectedProvince.name}, Cajamarca, Perú
                                </span>
                                <span className="text-[9px] text-zinc-500 italic hidden sm:inline">
                                  Modo híbrido satélite + relieve / Interactividad total
                                </span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[#0c0c0e] bg-[linear-gradient(to_right,#15151b_1px,transparent_1px),linear-gradient(to_bottom,#15151b_1px,transparent_1px)] bg-[size:15px_15px] opacity-30"></div>
                              
                              {/* Legend */}
                              <div className="absolute top-0 left-0 bg-black/95 border border-zinc-900 p-3.5 rounded-none text-[10px] font-mono text-zinc-400 space-y-1.5 z-20 text-left">
                                <span className="text-[9px] font-extrabold uppercase text-[#0099ff] tracking-wider block border-b border-zinc-850 pb-1 mb-1">
                                  {mapMode === 'heatmap' ? 'Leyenda Intensidad Térmica:' : 'Leyenda GIS:'}
                                </span>
                                <div className="flex items-center gap-2 text-red-500 font-bold font-mono">
                                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span> {mapMode === 'heatmap' ? 'Foco Crítico (>= 7.0)' : 'Riesgo Alto (>= 7.0)'}
                                </div>
                                <div className="flex items-center gap-2 text-yellow-500 font-mono">
                                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block"></span> {mapMode === 'heatmap' ? 'Riesgo Elevado (4.0 - 6.9)' : 'Riesgo Moderado (4.0 - 6.9)'}
                                </div>
                                <div className="flex items-center gap-2 text-cyan-400 font-mono">
                                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 inline-block"></span> {mapMode === 'heatmap' ? 'Filtro Preventivo (< 4.0)' : 'Riesgo Bajo (< 4.0)'}
                                </div>
                              </div>

                              {/* Complete Cajamarca Map SVG */}
                              <svg viewBox="0 0 500 700" className="h-[380px] w-auto max-w-full text-zinc-850 z-10 transition-colors duration-300 relative">
                                <defs>
                                  <radialGradient id="heat-high" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                                    <stop offset="35%" stopColor="#ef4444" stopOpacity="0.3" />
                                    <stop offset="75%" stopColor="#ef4444" stopOpacity="0.08" />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                  </radialGradient>
                                  <radialGradient id="heat-mod" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                                    <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.3" />
                                    <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.08" />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                  </radialGradient>
                                  <radialGradient id="heat-low" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
                                    <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.25" />
                                    <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.05" />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                                  </radialGradient>
                                </defs>

                                {/* Renders connecting vector links ONLY in vector mode */}
                                {mapMode === 'vector' && (
                                  <g stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.4">
                                    <line x1="190" y1="80" x2="280" y2="120" />
                                    <line x1="280" y1="120" x2="170" y2="190" />
                                    <line x1="170" y1="190" x2="220" y2="280" />
                                    <line x1="220" y1="280" x2="110" y2="310" />
                                    <line x1="220" y1="280" x2="230" y2="360" />
                                    <line x1="230" y1="360" x2="330" y2="350" />
                                    <line x1="110" y1="310" x2="100" y2="430" />
                                    <line x1="100" y1="430" x2="180" y2="450" />
                                    <line x1="180" y1="450" x2="270" y2="490" />
                                    <line x1="230" y1="360" x2="270" y2="490" />
                                    <line x1="330" y1="350" x2="270" y2="490" />
                                    <line x1="270" y1="490" x2="340" y2="540" />
                                    <line x1="270" y1="490" x2="90" y2="550" />
                                    <line x1="340" y1="540" x2="370" y2="620" />
                                  </g>
                                )}

                                {/* Renders thermal heatmap gradients in heatmap mode */}
                                {mapMode === 'heatmap' && provinces.map((prov) => {
                                  // Heat size is proportional to both the riskScore
                                  const heatRadius = prov.riskScore * 13 + 22;
                                  const fillGradient = prov.riskScore >= 7
                                    ? 'url(#heat-high)'
                                    : prov.riskScore >= 4
                                    ? 'url(#heat-mod)'
                                    : 'url(#heat-low)';
                                  
                                  return (
                                    <g key={`heatmap-glow-${prov.id}`} className="mix-blend-screen">
                                      {/* Core intense thermal focus */}
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={heatRadius}
                                        fill={fillGradient}
                                        pointerEvents="none"
                                      />
                                      {prov.id === selectedProvinceId && (
                                        <circle
                                          cx={prov.coordinates.x}
                                          cy={prov.coordinates.y}
                                          r={heatRadius + 12}
                                          stroke={prov.riskScore >= 7 ? '#ef4444' : prov.riskScore >= 4 ? '#f59e0b' : '#06b6d4'}
                                          strokeWidth="0.5"
                                          fill="none"
                                          opacity="0.3"
                                          className="animate-pulse"
                                        />
                                      )}
                                    </g>
                                  );
                                })}

                                {/* Render the province points */}
                                {provinces.map((prov) => {
                                  const isSelected = prov.id === selectedProvinceId;
                                  return (
                                    <g 
                                      key={prov.id} 
                                      className="cursor-pointer group" 
                                      onClick={() => onSelectProvince(prov.id)}
                                    >
                                      {/* Click target helper */}
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r="24"
                                        fill="transparent"
                                      />
                                      
                                      {/* Concentric marker target representing focus center */}
                                      <circle
                                        cx={prov.coordinates.x}
                                        cy={prov.coordinates.y}
                                        r={isSelected ? '9' : '5'}
                                        fill={
                                          prov.riskScore >= 7
                                            ? '#ef4444'
                                            : prov.riskScore >= 4
                                            ? '#f59e0b'
                                            : '#06b6d4'
                                        }
                                        stroke={isSelected ? '#ffffff' : 'none'}
                                        strokeWidth="2"
                                        className="transition-all duration-300"
                                      />
                                      
                                      {isSelected && (
                                        <circle
                                          cx={prov.coordinates.x}
                                          cy={prov.coordinates.y}
                                          r="15"
                                          stroke="#0099ff"
                                          strokeWidth="1.2"
                                          fill="none"
                                          strokeDasharray="3,3"
                                        />
                                      )}

                                      {/* Province metadata indicators directly on map tag */}
                                      <text
                                        x={prov.coordinates.x + 11}
                                        y={prov.coordinates.y - 1}
                                        fill={isSelected ? '#0099ff' : '#ffffff'}
                                        fontSize="10"
                                        fontWeight={isSelected ? '900' : 'bold'}
                                        fontFamily="monospace"
                                        className="select-none tracking-tight pointer-events-none uppercase transition-colors duration-200"
                                      >
                                        {prov.name}
                                      </text>
                                      <text
                                        x={prov.coordinates.x + 11}
                                        y={prov.coordinates.y + 8}
                                        fill={
                                          prov.riskScore >= 7
                                            ? '#f87171'
                                            : prov.riskScore >= 4
                                            ? '#fbbf24'
                                            : '#22d3ee'
                                        }
                                        fontSize="8"
                                        fontWeight="black"
                                        fontFamily="monospace"
                                        className="select-none pointer-events-none opacity-85"
                                      >
                                        {`R: ${prov.riskScore.toFixed(1)}`}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Geolocalized Alert Pinpoints overlay */}
                                {alerts.map((al) => {
                                  const coords = getAlertSvgCoords(al);
                                  if (!coords) return null;

                                  const isSelected = selectedAlertId === al.id;
                                  return (
                                    <g
                                      key={`alert-pin-${al.id}`}
                                      className="cursor-pointer group z-20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAlertId(isSelected ? null : al.id);
                                      }}
                                    >
                                      {/* Outer pulsating ring for active alerts */}
                                      <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={isSelected ? 16 : 8}
                                        fill="none"
                                        stroke={al.type === 'Alto' ? '#ef4444' : al.type === 'Medio' ? '#f59e0b' : '#10b981'}
                                        strokeWidth="1.5"
                                        className="animate-pulse"
                                        opacity="0.7"
                                      />
                                      {/* Small center pin */}
                                      <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={isSelected ? 5 : 3.5}
                                        fill={al.type === 'Alto' ? '#ef4444' : al.type === 'Medio' ? '#f59e0b' : '#10b981'}
                                        stroke="#ffffff"
                                        strokeWidth="1"
                                      />
                                      {/* Tiny map pin icon path */}
                                      <path
                                        d={`M ${coords.x} ${coords.y} L ${coords.x - 3} ${coords.y - 8} A 4 4 0 1 1 ${coords.x + 3} ${coords.y - 8} Z`}
                                        fill={al.type === 'Alto' ? '#ef4444' : al.type === 'Medio' ? '#f59e0b' : '#10b981'}
                                        stroke="#ffffff"
                                        strokeWidth="0.5"
                                        transform={`translate(0, -2) scale(${isSelected ? 1.5 : 1})`}
                                        transform-origin={`${coords.x} ${coords.y}`}
                                      />
                                    </g>
                                  );
                                })}
                              </svg>

                              {/* Water depth background aura */}
                              <div className="absolute top-1/2 left-1/3 h-32 w-32 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none animate-pulse"></div>

                              {/* Selected Alert Popup Detail */}
                              {selectedAlertId && (() => {
                                const selAlert = alerts.find(a => a.id === selectedAlertId);
                                if (!selAlert) return null;
                                return (
                                  <div className="absolute bottom-4 left-4 right-4 bg-[#0a0a0d] border border-zinc-800 p-3.5 z-30 font-sans text-xs text-left shadow-2xl animate-fade-in space-y-2">
                                    <div className="flex justify-between items-start border-b border-zinc-850 pb-1.5">
                                      <div>
                                        <span className={`px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase rounded-none border mr-2 ${
                                          selAlert.type === 'Alto' ? 'bg-red-955/40 text-red-400 border-red-900/60' :
                                          selAlert.type === 'Medio' ? 'bg-yellow-955/40 text-yellow-400 border-yellow-900/60' :
                                          'bg-green-955/40 text-green-400 border-green-900/60'
                                        }`}>
                                          Prioridad {selAlert.type}
                                        </span>
                                        <span className="font-mono text-[9px] text-zinc-500 uppercase">{selAlert.province}</span>
                                      </div>
                                      <button 
                                        onClick={() => setSelectedAlertId(null)}
                                        className="text-zinc-500 hover:text-white"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                    <h4 className="font-bold text-white uppercase text-xs tracking-tight">{selAlert.title}</h4>
                                    <p className="text-zinc-400 leading-relaxed text-[11px]">{selAlert.description}</p>
                                    {selAlert.time && (
                                      <span className="block text-[8.5px] text-zinc-500 font-mono text-right">{selAlert.time}</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right panel side drawer for information details */}
                      <div className="lg:col-span-4 bg-[#050506] border border-zinc-900 p-5 rounded-none flex flex-col justify-between text-left">
                        <div className="space-y-4">
                          <div className="border-b border-zinc-900 pb-3">
                            <span className="block text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Información Satelital</span>
                            <h3 className="text-base font-black text-white font-mono uppercase tracking-tight mt-1">{selectedProvince.name}</h3>
                          </div>

                          <div className="space-y-3 font-sans text-xs">
                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Índice IICS:</span>
                              <span className="text-white font-mono font-bold">{selectedProvince.riskScore.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Estatus Social:</span>
                              <span className={`font-mono font-bold uppercase text-[10px] px-1.5 py-0.2 ${
                                selectedProvince.riskDescription === 'Alto' ? 'text-red-400' : selectedProvince.riskDescription === 'Moderado' ? 'text-yellow-400' : 'text-cyan-400'
                              }`}>{selectedProvince.riskDescription}</span>
                            </div>

                            <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-900">
                              <span className="text-zinc-400 font-mono uppercase text-[9px]">Menciones Redes:</span>
                              <span className="text-zinc-100 font-mono">{selectedProvince.mencionesRedes.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-[#030304] border border-zinc-900 p-3 text-[11px] text-zinc-400 leading-normal">
                            <span className="block font-mono font-bold text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Mesa Temática de Alianza:</span>
                            {selectedProvince.activeAlert ? selectedProvince.activeAlert : 'Ningún incidente reportado o asamblea convocada activa en el sistema para esta faja territorial.'}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-900">
                          <button
                            onClick={() => setActiveTab('provinces')}
                            className="w-full flex items-center justify-center gap-1 bg-[#101014] hover:bg-cyan-500 hover:text-slate-950 text-zinc-300 font-mono py-2 text-[10px] uppercase font-bold border border-zinc-850 hover:border-transparent transition-all cursor-pointer"
                          >
                            <span>Ver Ficha Técnica Consolidada</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* VIEW 5: ALERT CENTER (BELL & SUBMISSION FORM) */}
                {activeTab === 'alerts' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                    
                    {/* Left Column: Notifications Stream Log */}
                    <div className="lg:col-span-7 space-y-4">
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono tracking-widest text-amber-500 font-bold uppercase bg-amber-950/20 border border-amber-900/10 px-2 py-0.5">Consola Central</span>
                        <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Historial de Incidentes Registrados</h2>
                        <p className="text-xs text-zinc-400">
                          Registro consolidado de asambleas ronderas, movilizaciones, tensiones y mesas multisectoriales. Los ingresos simulados fluyen instantáneamente en el sistema para evaluar simulacros de contingencia.
                        </p>
                      </div>

                      {/* Display Alert cards list */}
                      <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                        {alerts.map((al) => (
                          <div 
                            key={al.id} 
                            className="bg-black border border-zinc-900 hover:border-zinc-800 p-4 relative block text-left transition-colors"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-950 pb-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2 py-0.2 text-[9.5px] font-mono font-black uppercase text-[10px] rounded-none ${
                                  al.type === 'Alto'
                                    ? 'bg-red-950/30 text-red-400 border border-red-500/15'
                                    : al.type === 'Medio'
                                    ? 'bg-yellow-950/30 text-yellow-300 border border-yellow-500/15'
                                    : 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/10'
                                }`}>
                                  {al.type}
                                </span>
                                <span className="text-xs font-bold text-white uppercase font-sans">{al.province}</span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {al.time}
                              </span>
                            </div>

                            <h4 className="text-zinc-100 font-black text-xs uppercase leading-snug">{al.title}</h4>
                            <p className="text-zinc-400 text-[11px] leading-relaxed mt-2 font-sans">{al.description}</p>
                          </div>
                        ))}

                        {alerts.length === 0 && (
                          <div className="p-12 text-center text-zinc-550 italic font-medium border border-zinc-900 bg-black/40">
                            Ninguna alerta registrada o pendiente de auditar en el sistema.
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right column: Incident creation pipeline (FORM) */}
                    <div className="lg:col-span-5 bg-black border border-zinc-900 p-5 rounded-none space-y-4">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
                        <PlusCircle className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Reportar Incidente Comunitario</h4>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        Fomente la resiliencia territorial simulando reclamos. Al enviarla, será procesada por nuestro motor estadístico regional variando el índice de calor.
                      </p>

                      <form onSubmit={handleAlertSubmit} className="space-y-4 text-xs font-sans">
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Título de Alerta d Incidentes</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Asamblea comunal extraordinaria sobre licencias hídricas..."
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-cyan-500 rounded-none font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Provincia</label>
                            <select
                              value={formProvince}
                              onChange={(e) => setFormProvince(e.target.value)}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none cursor-pointer rounded-none text-left"
                            >
                              {provinces.map((prov) => (
                                <option key={prov.id} value={prov.name}>{prov.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Gravedad</label>
                            <select
                              value={formType}
                              onChange={(e: any) => setFormType(e.target.value)}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none cursor-pointer rounded-none text-left"
                            >
                              <option value="Bajo">Baja (Mesa Informativa)</option>
                              <option value="Medio">Media (Tensión / Reclamo)</option>
                              <option value="Alto">Alta (Paro / Movilización)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Descripción y Contextualización</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Fije los hechos, cuenca fluvial involucrada, y entidades con quienes se busca establecer conciliación en campo..."
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-cyan-500 rounded-none resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={formSubmitted}
                          className="w-full flex items-center justify-center gap-2 bg-[#0099ff] hover:bg-cyan-400 text-slate-950 font-bold uppercase py-2.5 text-xs rounded-none transition-all cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                          <span>Enviar Alerta de Monitoreo</span>
                        </button>
                      </form>

                      <AnimatePresence>
                        {formSubmitted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10.5px] p-2.5 rounded-none text-center flex items-center justify-center gap-2 font-mono font-semibold"
                          >
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>¡Ingreso Procesado! Reflejado en las métricas e índices.</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>

                  </div>
                )}

                {/* VIEW 6: RESEARCH LOGS & DATASETS (BOOKOPEN) */}
                {activeTab === 'library' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Repositorio</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Consola Virtual de Datos y Academia AFI</h2>
                      <p className="text-xs text-zinc-400">
                        Acceso directo a raw datasets científicos del IICS, publicaciones indexadas, pre-prints de investigadores y el portal de inscripción de la AFI.
                      </p>
                    </div>

                    {/* Local Sub-Navigation Tabs */}
                    <div className="flex border-b border-zinc-900 mb-6 gap-2 overflow-x-auto whitespace-nowrap">
                      <button
                        onClick={() => setLibrarySubTab('publications')}
                        className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                          librarySubTab === 'publications'
                            ? 'border-cyan-500 text-cyan-400 font-black'
                            : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                      >
                        Buscador de Publicaciones
                      </button>
                      <button
                        onClick={() => setLibrarySubTab('preprints')}
                        className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                          librarySubTab === 'preprints'
                            ? 'border-cyan-500 text-cyan-400 font-black'
                            : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                      >
                        Buzón de Pre-prints
                      </button>
                      <button
                        onClick={() => setLibrarySubTab('datasets')}
                        className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                          librarySubTab === 'datasets'
                            ? 'border-cyan-500 text-cyan-400 font-black'
                            : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                      >
                        Datos Abiertos
                      </button>
                    </div>

                    {/* Render Subtab contents */}
                    {librarySubTab === 'publications' && (
                      <div className="bg-black border border-zinc-900 p-6">
                        <PublicationsSection isSubPage={true} onCloseSubPage={() => setActiveTab('home')} />
                      </div>
                    )}

                    {librarySubTab === 'preprints' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Preprints upload & Academic Becarios info */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="space-y-1 text-left pb-1 border-b border-zinc-900">
                            <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <GraduationCap className="h-4.5 w-4.5 text-[#0099ff]" />
                              Buzón Academia AFI (Borradores & Pre-prints)
                            </h4>
                          </div>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!draftTitle || !draftFile) {
                                alert('Por favor, determine un título de borrador y un archivo simulado.');
                                return;
                              }
                              setDraftSubmitted(true);
                              
                              const newDraft = {
                                id: Math.random().toString(),
                                title: draftTitle,
                                line: draftLine,
                                filename: draftFile,
                                date: 'Hoy',
                                status: 'En Cola de Revisión de Pares'
                              };

                              setTimeout(() => {
                                setSubmittedDrafts([newDraft, ...submittedDrafts]);
                                setDraftSubmitted(false);
                                setDraftTitle('');
                                setDraftFile('');
                                alert(`¡Éxito! El pre-print científico "${newDraft.title}" ha sido indexado en cola de arbitraje.`);
                              }, 1500);
                            }}
                            className="bg-[#030304] border border-zinc-900 p-5 space-y-4"
                          >
                            <div className="space-y-1 text-left">
                              <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase">Título del Artículo / Propuesta</label>
                              <input 
                                type="text"
                                required
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                className="w-full bg-black border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none placeholder-zinc-700"
                                placeholder="Ej. Dinámicas de fricción social en cuencas altas..."
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1 text-left">
                                <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase">Línea del IICS Correspondiente</label>
                                <select
                                  value={draftLine}
                                  onChange={(e) => setDraftLine(e.target.value)}
                                  className="w-full bg-black border border-zinc-850 p-2.5 text-xs text-zinc-300 outline-none cursor-pointer rounded-none text-left"
                                >
                                  <option value="Sociología Territorial">Línea 1: Sociología Territorial</option>
                                  <option value="Sociología Digital y Nuevas Tecnologías">Línea 2: Sociología Digital & Big Data</option>
                                  <option value="Desarrollo Urbano y Rural">Línea 3: Desarrollo Urbano & Rural</option>
                                </select>
                              </div>

                              <div className="space-y-1 text-left">
                                <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase">Archivo del Manuscrito (Simulado)</label>
                                <input 
                                  type="text"
                                  required
                                  value={draftFile}
                                  onChange={(e) => setDraftFile(e.target.value)}
                                  className="w-full bg-black border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none placeholder-zinc-700 font-mono"
                                  placeholder="Ej. articulo_rondas_chota_draft.pdf"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={draftSubmitted}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono font-black py-3 text-[10.5px] uppercase tracking-widest border-none cursor-pointer transition-colors"
                            >
                              {draftSubmitted ? 'Procesando Envío...' : 'Enviar Borrador para Arbitraje'}
                            </button>
                          </form>
                        </div>

                        {/* Right column: Submitted Preprints list */}
                        <div className="lg:col-span-5 space-y-4">
                          <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider pb-1 border-b border-zinc-900">
                            Borradores de su Sesión ({submittedDrafts.length})
                          </h4>
                          <div className="space-y-2">
                            {submittedDrafts.map((d) => (
                              <div key={d.id} className="bg-black border border-zinc-950 p-3 flex justify-between items-center text-left">
                                <div className="space-y-0.5 max-w-[280px]">
                                  <h6 className="font-extrabold text-[#0099ff] line-clamp-1 truncate text-xs">{d.title}</h6>
                                  <p className="text-[9.5px] text-zinc-500 font-mono">Línea: {d.line} • {d.filename}</p>
                                </div>
                                <span className="text-[8.5px] font-mono whitespace-nowrap bg-amber-950/40 text-amber-500 border border-amber-900/40 px-2 py-0.5 uppercase font-bold block shrink-0">
                                  {d.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {librarySubTab === 'datasets' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Datasets repository download */}
                        <div className="lg:col-span-12 space-y-4">
                          <div className="space-y-1 text-left pb-1 border-b border-zinc-900">
                            <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <Database className="h-4 w-4 text-[#0099ff]" />
                              Bases de Datos Descargables (Ciudadanos)
                            </h4>
                          </div>

                          {downloadSuccessNotice && (
                            <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-400" />
                              <span>{downloadSuccessNotice}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              {
                                id: 'data-conflictos',
                                filename: 'IICS_social_conflict_indicators_2026_Q1.xlsx',
                                description: 'Indicadores agregados mensuales de tensiones socioambientales, mesas de negociación y acuerdos ronderos.',
                                size: '4.2 MB',
                                type: 'Excel (.xlsx)',
                                integrity: 'SHA256: 8f9e2b1c4a037b5e82496cdfd8aa77bf'
                              },
                              {
                                id: 'data-gis',
                                filename: 'Cajamarca_GIS_Hydrologic_Mining_Vulnerability_v2.zip',
                                description: 'Capas vectoriales georreferenciadas (Shapefiles/QGIS) con pasivos ambientales, zonas de moliendas y cuencas.',
                                size: '18.5 MB',
                                type: 'Capas GIS (.zip)',
                                integrity: 'SHA256: d5a49e2fc8e331b0aef773641bcaa605'
                              },
                              {
                                id: 'data-encuestas',
                                filename: 'Cohesion_Social_Cajamarca_SPSS_data.sav',
                                description: 'Resultado totalizador de encuestas sobre cohesión agraria y confianza institucional aplicada a 1,100 familias.',
                                size: '1.1 MB',
                                type: 'SPSS Dataset (.sav)',
                                integrity: 'SHA256: 1a9c0d4bb8e2bc7715f3e9ca29037df8'
                              }
                            ].map((ds) => {
                              const isDownloading = downloadingId === ds.id;

                              return (
                                <div key={ds.id} className="bg-[#030304] border border-zinc-900 p-4 flex flex-col justify-between min-h-[220px]">
                                  <div className="space-y-1.5 text-left">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-cyan-400 font-extrabold block">{ds.type}</span>
                                      <span className="text-zinc-500 block">{ds.size}</span>
                                    </div>
                                    <h5 className="text-xs font-bold text-white font-mono break-all leading-snug">{ds.filename}</h5>
                                    <p className="text-[11px] text-zinc-400 leading-normal">{ds.description}</p>
                                    
                                    <div className="flex items-center justify-between bg-black border border-zinc-950 p-2 text-[9px] font-mono text-zinc-650">
                                      <span className="truncate w-10/12 block text-left">{ds.integrity}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(ds.integrity);
                                          alert('Verificación hash SHA-256 copiada al portapapeles.');
                                        }}
                                        className="text-cyan-500 hover:text-white cursor-pointer bg-transparent border-none outline-none"
                                        title="Copiar Hash"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-4 pt-3 border-t border-zinc-950">
                                    {isDownloading ? (
                                      <div className="space-y-1.5 font-mono text-[9px]">
                                        <div className="flex justify-between text-cyan-400">
                                          <span>Descargando desde Clúster...</span>
                                          <span>{downloadProgress}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-zinc-950 overflow-hidden border border-zinc-900">
                                          <div 
                                            className="bg-cyan-400 h-full transition-all duration-200"
                                            style={{ width: `${downloadProgress}%` }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDownloadingId(ds.id);
                                          setDownloadProgress(0);
                                          const interval = setInterval(() => {
                                            setDownloadProgress((prev) => {
                                              if (prev >= 100) {
                                                clearInterval(interval);
                                                setTimeout(() => {
                                                  setDownloadingId(null);
                                                  setDownloadSuccessNotice(`Repositorio de campo "${ds.filename}" descargado con éxito.`);
                                                  setTimeout(() => setDownloadSuccessNotice(null), 4000);
                                                }, 300);
                                                return 100;
                                              }
                                              return prev + 25;
                                            });
                                          }, 180);
                                        }}
                                        className="w-full flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-cyan-500 text-zinc-400 hover:text-slate-950 font-mono py-2 text-[10px] uppercase font-bold border border-zinc-900 hover:border-transparent transition-all cursor-pointer"
                                      >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Descargar Dataset</span>
                                      </button>
                                    )}
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}



                  </div>
                )}

                {/* VIEW: MEDIA TRANSMEDIA & VIDEOTECA */}
                {activeTab === 'media' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Difusión Transmedia</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Videoteca de Sociología Territorial</h2>
                      <p className="text-xs text-zinc-400">
                        Explore los documentales y reportajes de campo producidos por el IICS sobre problemáticas de Cajamarca y del norte peruano.
                      </p>
                    </div>

                    {/* Cinematic Video Player Overlay */}
                    {playingDoc && (
                      <div className="bg-[#050506] border border-zinc-900 p-4 md:p-6 rounded-none relative">
                        <button
                          onClick={() => setPlayingDoc(null)}
                          className="absolute top-4 right-4 z-55 p-1.5 bg-black border border-zinc-850 text-gray-400 hover:text-white hover:border-zinc-750 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="relative aspect-video w-full max-w-4xl mx-auto bg-black border border-zinc-900 flex flex-col justify-center items-center overflow-hidden">
                          {loadingVideo ? (
                            <div className="flex flex-col items-center gap-3">
                              <span className="text-xs font-mono text-cyan-400 animate-pulse">Cargando reproductor transmedia...</span>
                            </div>
                          ) : (
                            (() => {
                              const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                              const match = playingDoc.video_url?.match(youtubeRegex);
                              const embedId = match && match[2].length === 11 ? match[2] : null;
                              if (embedId) {
                                return (
                                  <iframe
                                    src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
                                    className="absolute inset-0 w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={playingDoc.title}
                                  />
                                );
                              }
                              return (
                                <div className="absolute inset-0 flex flex-col justify-center items-center p-8 bg-zinc-950">
                                  <Play className="h-16 w-16 text-cyan-400 opacity-80 hover:opacity-100 transition-opacity mb-4 cursor-pointer" />
                                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">{playingDoc.title}</h3>
                                  <p className="text-xs text-zinc-400 max-w-xl text-center mt-2">{playingDoc.desc}</p>
                                  <p className="text-[10px] text-zinc-550 font-mono mt-4">Autoría: {playingDoc.authors} ({playingDoc.year})</p>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    )}

                    {loadingTransmedia ? (
                      <div className="h-48 flex items-center justify-center">
                        <span className="text-xs font-mono text-cyan-400 animate-pulse">Cargando videoteca transmedia...</span>
                      </div>
                    ) : transmediaVideos.length === 0 ? (
                      <div className="border border-zinc-900 p-12 text-center text-zinc-550 font-mono text-xs">
                        No hay documentales ni cápsulas transmedia disponibles en este momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {transmediaVideos.map(doc => (
                          <div key={doc.id} className="bg-[#030304] border border-zinc-900 overflow-hidden flex flex-col md:flex-row group hover:border-zinc-800 transition-colors">
                            <div className="md:w-1/3 aspect-video md:aspect-auto relative overflow-hidden bg-zinc-950">
                              <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
                              <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[9px] font-mono text-zinc-300">{doc.duration}</span>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between text-left">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {doc.tags && doc.tags.map(t => (
                                    <span key={t} className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-900/10 px-1.5 py-0.2 uppercase">{t}</span>
                                  ))}
                                </div>
                                <h4 className="text-xs font-bold text-white uppercase group-hover:text-cyan-400 transition-colors">{doc.title}</h4>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{doc.desc}</p>
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-650 pt-3 border-t border-zinc-950 mt-3">
                                <span>{doc.authors}</span>
                                <button
                                  onClick={() => {
                                    setPlayingDoc(doc);
                                    setLoadingVideo(true);
                                    setTimeout(() => setLoadingVideo(false), 800);
                                  }}
                                  className="text-cyan-400 hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none font-bold"
                                >
                                  <Play size={10} /> REPRODUCIR
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW: ACADEMIA DE FORMACIÓN (AFI) */}
                {activeTab === 'afi' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Formación Académica</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Academia de Formación Científica (AFI)</h2>
                      <p className="text-xs text-zinc-400">
                        Inscríbase de forma gratuita en los cursos especializados de formación científica del IICS.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left column: Courses list */}
                      <div className="lg:col-span-7 space-y-4">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-zinc-900 pb-1">
                          Cursos Disponibles ({courses.length})
                        </h4>
                        {loadingCourses ? (
                          <div className="text-center py-8 text-xs text-cyan-400 font-mono">Cargando cursos desde Supabase...</div>
                        ) : courses.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                            {courses.map(c => (
                              <div key={c.id} className="bg-[#030304] border border-zinc-900 p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Materia Académica</span>
                                    <h5 className="text-sm font-extrabold text-white uppercase">{c.title}</h5>
                                  </div>
                                  <span className="px-2 py-0.5 text-[9px] font-bold font-mono uppercase bg-cyan-950/20 text-cyan-400 border border-cyan-800/10">
                                    {c.modality || 'Virtual'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 line-clamp-3">{c.description || 'Sin descripción disponible.'}</p>
                                <div className="flex justify-between items-center text-[10px] text-zinc-550 pt-2 border-t border-zinc-950 font-mono">
                                  <span>Duración: {c.duration || '4 semanas'}</span>
                                  <button
                                    onClick={() => setAfiForm({ ...afiForm, courseId: c.id })}
                                    className="text-cyan-400 hover:text-white cursor-pointer bg-transparent border-none font-bold"
                                  >
                                    Seleccionar Curso ➔
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-xs text-zinc-500 font-mono">No hay cursos publicados actualmente.</div>
                        )}
                      </div>

                      {/* Right column: Enrollment form */}
                      <div className="lg:col-span-5 bg-[#050506] border border-zinc-900 p-5 space-y-4">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-zinc-900 pb-1 flex items-center gap-1.5">
                          <GraduationCap className="h-4.5 w-4.5 text-[#0099ff]" />
                          Postulación a AFI (Público General)
                        </h4>

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!afiForm.fullName || !afiForm.email || !afiForm.courseId) {
                              alert('Por favor, determine los campos requeridos (*).');
                              return;
                            }
                            setSubmittingAfi(true);
                            try {
                              const { error } = await supabase
                                .from('training_applicants')
                                .insert({
                                  full_name: afiForm.fullName,
                                  email: afiForm.email,
                                  phone: afiForm.phone,
                                  institution: afiForm.institution,
                                  course_id: afiForm.courseId,
                                  status: 'Pending'
                                });
                              if (error) throw error;
                              alert('¡Solicitud de matrícula registrada con éxito! El comité evaluará su vacante.');
                              setAfiForm({ fullName: '', email: '', phone: '', institution: '', courseId: '' });
                            } catch (e) {
                              console.error(e);
                              alert('Hubo un error al procesar su postulación.');
                            } finally {
                              setSubmittingAfi(false);
                            }
                          }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase block">Nombre Completo *</label>
                            <input
                              type="text"
                              required
                              value={afiForm.fullName}
                              onChange={e => setAfiForm({ ...afiForm, fullName: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase"
                              placeholder="Ej. Juan Pérez"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Correo Electrónico *</label>
                            <input
                              type="email"
                              required
                              value={afiForm.email}
                              onChange={e => setAfiForm({ ...afiForm, email: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none"
                              placeholder="juan.perez@example.com"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Teléfono / WhatsApp</label>
                            <input
                              type="text"
                              value={afiForm.phone}
                              onChange={e => setAfiForm({ ...afiForm, phone: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none"
                              placeholder="+51 987654321"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Institución de procedencia</label>
                            <input
                              type="text"
                              value={afiForm.institution}
                              onChange={e => setAfiForm({ ...afiForm, institution: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase"
                              placeholder="Particular / Universidad / Empresa"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Seleccione el Curso *</label>
                            <select
                              required
                              value={afiForm.courseId}
                              onChange={e => setAfiForm({ ...afiForm, courseId: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-850 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none cursor-pointer text-left"
                            >
                              <option value="">-- Elija un curso --</option>
                              {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="submit"
                            disabled={submittingAfi}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer rounded-none"
                          >
                            {submittingAfi ? 'Enviando Solicitud...' : 'Enviar Solicitud de Vacante'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW: SERVICIOS DE CONSULTORÍA Y SOSTENIBILIDAD */}
                {activeTab === 'consulting' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Sostenibilidad Comercial</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Servicios de Consultoría Científica</h2>
                      <p className="text-xs text-zinc-400">
                        El IICS financia sus investigaciones independientes a través de soluciones metodológicas de alta precisión para organizaciones públicas y privadas.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left column: Services portfolio */}
                      <div className="lg:col-span-7 space-y-4">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-zinc-900 pb-1">
                          Portafolio de Especialidades IICS
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              title: 'SIG & Catastro Multitemporal',
                              desc: 'Diseño de capas geoespaciales, digitalización de parcelas territoriales y modelamiento cartográfico para proyectos socioambientales.',
                              icon: MapPin
                            },
                            {
                              title: 'NLP & Escucha Social Territorial',
                              desc: 'Minería de opinión pública en tiempo real mediante algoritmos de inteligencia artificial aplicados a redes sociales, prensa y foros locales.',
                              icon: LineChart
                            },
                            {
                              title: 'Estudios de Impacto Social',
                              desc: 'Líneas base cuantitativas y cualitativas, etnografía comunitaria directa y modelamiento de cohesión para resolución de disputas mineras.',
                              icon: Landmark
                            },
                            {
                              title: 'Talleres Metodológicos Corporativos',
                              desc: 'Programas in-house y consultoría de diseño metodológico en Zotero corporativo, Atlas.ti y metodologías de sociología digital de precisión.',
                              icon: BookOpen
                            }
                          ].map((svc, idx) => {
                            const SvcIcon = svc.icon;
                            return (
                              <div key={idx} className="bg-[#030304] border border-zinc-900 p-4 flex gap-4 items-start">
                                <div className="p-2.5 bg-zinc-950 border border-zinc-850 text-cyan-400">
                                  <SvcIcon className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                  <h5 className="text-sm font-extrabold text-white uppercase">{svc.title}</h5>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">{svc.desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right column: Request proposal form */}
                      <div className="lg:col-span-5 bg-[#050506] border border-zinc-900 p-5 space-y-4">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-zinc-900 pb-1 flex items-center gap-1.5">
                          <Briefcase className="h-4.5 w-4.5 text-[#0099ff]" />
                          Solicitar Propuesta Comercial
                        </h4>

                        <form onSubmit={handleRegisterProposal} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-550 uppercase block">Cliente / Empresa Solicitante *</label>
                            <input
                              type="text"
                              required
                              value={proposalForm.clientName}
                              onChange={e => setProposalForm({ ...proposalForm, clientName: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-855 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase"
                              placeholder="Ej. Minera o Entidad Pública"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Título del Requerimiento / Proyecto *</label>
                            <input
                              type="text"
                              required
                              value={proposalForm.title}
                              onChange={e => setProposalForm({ ...proposalForm, title: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-855 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none uppercase"
                              placeholder="Ej. Catastro SIG Hualgayoc"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Presupuesto Estimado (Soles / USD) *</label>
                            <input
                              type="number"
                              required
                              value={proposalForm.value}
                              onChange={e => setProposalForm({ ...proposalForm, value: e.target.value })}
                              className="w-full bg-[#030304] border border-zinc-855 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none"
                              placeholder="Ej. 15000"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-555 uppercase block">Alcance / Descripción del Requerimiento</label>
                            <textarea
                              value={proposalForm.description}
                              onChange={e => setProposalForm({ ...proposalForm, description: e.target.value })}
                              rows={4}
                              className="w-full bg-[#030304] border border-zinc-855 p-2.5 text-xs text-white outline-none focus:border-cyan-500 rounded-none resize-none"
                              placeholder="Detalles de la consultoría..."
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingProposal}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer rounded-none"
                          >
                            {submittingProposal ? 'Procesando Propuesta...' : 'Registrar Solicitud de Propuesta'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 7: SYSTEM AUDIT & PARAMETERS (SETTINGS) */}
                {activeTab === 'settings' && (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-[#0099ff] font-bold uppercase bg-cyan-950/20 border border-cyan-800/10 px-2.5 py-0.5">Parámetros Centrales</span>
                      <h2 className="text-base font-black text-white uppercase mt-1.5 font-sans">Panel de Auditoría del Servidor</h2>
                      <p className="text-xs text-zinc-400">
                        Inspección interna de los endpoints de la API de escucha, los sockets de georreferencia, parámetros del modelo de Procesamiento de Lenguaje Natural (NLP).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Telemetry live simulation logs */}
                      <div className="md:col-span-8 bg-black border border-zinc-900 p-5 rounded-none flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
                          <span className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-cyan-400" />
                            Registro de Telemetría Compartida del Sistema
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">Filtrando: ALL_SYSTEM_SOCKETS</span>
                        </div>

                        <div className="bg-[#030304] border border-zinc-950 p-3.5 font-mono text-[10.5px] space-y-2.5 max-h-[220px] overflow-y-auto leading-relaxed">
                          {telemetryLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-2 text-left">
                              <span className="text-zinc-600">[{log.ts}]</span>
                              <span className="text-cyan-500 font-extrabold font-mono shrink-0">[{log.svc}]</span>
                              <span className="text-zinc-300 break-all">{log.msg}</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-cyan-950/10 border border-cyan-850/20 p-3 rounded-none text-[10px] text-zinc-400 flex items-center gap-2 mt-4">
                          <Cpu className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                          <span>Módulo de Procesamiento de Sentimientos activo: Modelo NLP Transformer v4.2 con filtros léxicos de quechua andino adaptados.</span>
                        </div>
                      </div>

                      {/* Right credentials panel */}
                      <div className="md:col-span-4 bg-[#050506]/80 border border-zinc-900 p-5 rounded-none flex flex-col justify-between text-left font-sans text-xs">
                        <div className="space-y-4">
                          <div className="border-b border-zinc-900 pb-2 mb-2">
                            <span className="text-[9px] font-mono text-zinc-550 uppercase font-black">Estado del Clúster</span>
                            <h4 className="font-extrabold text-white uppercase mt-1">Nodos Computacionales</h4>
                          </div>

                          <div className="divide-y divide-zinc-900 text-[11px] space-y-2">
                            <div className="pt-2 flex justify-between">
                              <span className="text-zinc-500">Servidor API principal:</span>
                              <span className="text-emerald-450 font-mono font-bold">CONECTADO</span>
                            </div>
                            <div className="pt-2 flex justify-between">
                              <span className="text-zinc-500">Base de Datos Firestore:</span>
                              <span className="text-emerald-450 font-mono font-bold">CORRIENDO (0.0.0.0)</span>
                            </div>
                            <div className="pt-2 flex justify-between">
                              <span className="text-zinc-500">Cuádruple Hélice Auth:</span>
                              <span className="text-emerald-455 font-mono font-bold">HABILITADA</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-900">
                          <span className="block text-[8.5px] font-mono text-zinc-650 leading-relaxed uppercase">La autenticación se realiza mediante firmas RSA cifradas y cifrado TLS de extremo a extremo.</span>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </motion.div>
            </AnimatePresence>

          </div>

          {/* INSTANT FOOTER AT THE VERY BOTTOM OF THE WORKSPACE SCREEN */}
          <div className="border-t border-zinc-900 bg-black/40 py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left select-none text-[10px] text-zinc-550 shrink-0">
            <p className="font-mono uppercase font-semibold">
              IICS • Corporación Privada e Independiente © 2026 • Analista Conectado
            </p>
            <p className="font-mono uppercase text-zinc-600 font-bold">
              CONSOLA DE INVESTIGACIÓN DE VANGUARDIA SOCIAL
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
