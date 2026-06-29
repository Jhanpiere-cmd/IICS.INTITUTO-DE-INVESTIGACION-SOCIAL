import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Home, 
  Landmark, 
  LineChart, 
  MapPin, 
  Bell, 
  BookOpen, 
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
  Cpu 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProvinceData, Alert, EmergentTheme } from '../types';
import { useAuth } from '../../contexts/AuthContext';

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
  const [activeTab, setActiveTab] = useState<'home' | 'provinces' | 'analytics' | 'map' | 'alerts' | 'library' | 'settings'>('home');
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [mapMode, setMapMode] = useState<'vector' | 'heatmap' | 'satellite'>('heatmap');

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
  const handleAlertSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription) return;

    const mockNewAlert: Alert = {
      id: Math.random().toString(),
      title: formTitle,
      province: formProvince,
      time: 'Hace unos instantes',
      type: formType,
      description: formDescription
    };

    onSubmitSimulatedAlert(mockNewAlert);
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormTitle('');
      setFormDescription('');
    }, 2800);
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

  return (
    <div className="w-full h-screen bg-[#030304] text-gray-100 flex flex-col font-sans antialiased overflow-hidden">
      
      {/* Workspace Inner App Frame */}
      <div className="flex-1 flex flex-col lg:flex-row shadow-2xl relative w-full h-full border-b border-zinc-900 overflow-hidden bg-[#030304]">
        
        {/* SIDEBAR TRAY - Left-side Navigation bar */}
        <div className="w-full lg:w-16 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-[#030304] flex lg:flex-col items-center justify-between p-2.5 lg:py-5 lg:px-2 select-none shrink-0 overflow-x-auto lg:overflow-x-visible">
          
          {/* Logo badge / user profile */}
          <div className="hidden lg:flex flex-col items-center gap-1 pb-4 mb-4 border-b border-zinc-900 w-full">
            <img 
              src="/logo-iics-siglas.png" 
              alt="IICS Logo" 
              className="h-9 w-9 object-contain rounded-lg border border-cyan-800/30 shadow-[0_0_15px_rgba(0,153,255,0.15)] hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Navigation group */}
          <div className="flex lg:flex-col gap-1.5 lg:w-full items-center">
            
            {/* Tab 1: Monitor Regional (Home) */}
            <button
              onClick={() => setActiveTab('home')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                activeTab === 'home'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Monitor Regional Dashboard"
            >
              <Home className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [01] Monitor Regional
              </span>
            </button>

            {/* Tab 2: Provincias (Landmark) */}
            <button
              onClick={() => setActiveTab('provinces')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                activeTab === 'provinces'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Análisis de Provincias"
            >
              <Landmark className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [02] Análisis Provincial
              </span>
            </button>

            {/* Tab 3: Estadísticas (LineChart) */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                activeTab === 'analytics'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Métricas Estadísticas"
            >
              <LineChart className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [03] Métricas y Coeficientes
              </span>
            </button>

            {/* Tab 4: Mapa de Alertas (MapPin) */}
            <button
              onClick={() => setActiveTab('map')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                activeTab === 'map'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Zonificación Georreferenciada"
            >
              <MapPin className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [04] Zonificación GIS
              </span>
            </button>

            {/* Tab 5: Consola de Alertas (Bell) */}
            <button
              onClick={() => setActiveTab('alerts')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
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
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [05] Consola de Alertas
              </span>
            </button>

            {/* Tab 6: Academia AFI & Datasets (BookOpen) */}
            <button
              onClick={() => setActiveTab('library')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                activeTab === 'library'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Academia AFI y Datasets"
            >
              <BookOpen className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [06] Academia AFI & Datasets
              </span>
            </button>

            {/* Tab 7: Configuración (Settings) */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-zinc-950'
              }`}
              title="Parámetros de Auditoría"
            >
              <Settings className="h-5 w-5" />
              <span className="hidden lg:inline-block absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10.5px] text-zinc-100 px-2.5 py-1.5 rounded font-mono font-bold uppercase transition-all shadow-xl whitespace-nowrap">
                [07] Configuración Central
              </span>
            </button>

          </div>

          {/* Bottom user card / Logout button */}
          <div className="flex lg:flex-col lg:w-full items-center gap-4 lg:gap-2 lg:mt-auto pt-4 border-t lg:border-t border-zinc-900">
            <div className="flex flex-col text-right lg:text-center shrink-0">
              <span className="text-[9px] font-mono text-zinc-500 font-bold block truncate max-w-[120px]" title={user?.email || 'Invitado'}>
                {user?.email || 'Invitado (Público)'}
              </span>
              <span className="text-[8px] font-black text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 uppercase border border-cyan-800/20 rounded-none mt-0.5">
                {user?.role || 'Invitado'}
              </span>
            </div>

            {user && ['Director', 'Subdirector', 'Docente', 'Secretaria', 'Gestor de Redes', 'Coordinador de Eventos', 'Auxiliar Técnico'].includes(user.role) && (
              <button
                onClick={() => window.location.href = '/admin'}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-cyan-400 hover:text-white bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-800/35 hover:border-cyan-500 transition-colors cursor-pointer"
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
              className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors border border-transparent hover:border-red-900/10 cursor-pointer"
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

                      {/* Right Bento indicators summaries */}
                      <div className="lg:col-span-4 flex flex-col gap-4">
                        
                        <div className="bg-[#050506] border border-zinc-900 p-4 rounded-none text-left">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Matriz de Correlación</span>
                          <h4 className="font-bold text-white font-mono uppercase mt-1">Soberanía Hídrica</h4>
                          <p className="text-[11.5px] text-zinc-400 leading-relaxed mt-2.5">
                            Nuestras regresiones múltiples determinaron que el <b>76.4%</b> de los incrementos en tensión territorial rural de Cajamarca es explicado por la vulnerabilidad en las fajas de captación hídrica comunal y pasivos mineros no saneados.
                          </p>
                        </div>

                        <div className="bg-[#050506] border border-zinc-900 p-4 rounded-none text-left">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Brecha Comunicativa</span>
                          <h4 className="font-bold text-white font-mono uppercase mt-1">Escucha de Medios Redes</h4>
                          <p className="text-[11.5px] text-zinc-400 leading-relaxed mt-2.5">
                            La asimetría de opiniones sobre proyectos mineros se cataliza en Facebook y radios comunales locales un promedio de <b>7.2 días hábiles antes</b> de traducirse en paros o asambleas ronderas en campo.
                          </p>
                        </div>

                        <div className="bg-[#0c0a09] border border-red-950/40 p-4 rounded-none text-left">
                          <span className="block text-[9px] font-mono text-red-400 font-bold uppercase tracking-widest">Alerta de Robustez</span>
                          <h4 className="font-bold text-white font-mono uppercase mt-1">Varianza Crítica</h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                            El polo transaccional de Hualgayoc y Celendín exhibe varianza crítica elevada. Se recomienda redoblar la supervisión preventiva cívica en cabeceras de cuenca.
                          </p>
                        </div>

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
                              </svg>

                              {/* Water depth background aura */}
                              <div className="absolute top-1/2 left-1/3 h-32 w-32 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none animate-pulse"></div>
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
                        Acceso directo a raw datasets científicos del IICS para ciudadanos organizados, y módulo de recepción estipendial para el semillero académico de alumnos.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left Column: Datasets repository download */}
                      <div className="lg:col-span-6 space-y-4">
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

                        <div className="space-y-3">
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
                              <div key={ds.id} className="bg-[#030304] border border-zinc-900 p-4 flex flex-col justify-between">
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

                                {/* Download progress simulator */}
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

                      {/* Right column: Preprints upload & Academic Becarios info */}
                      <div className="lg:col-span-6 space-y-4">
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
                          className="bg-[#030304] border border-zinc-900 p-4 space-y-3 text-xs"
                        >
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Título del Borrador de Investigación</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. Estudio etnográfico en Namora sobre expectativas agrarias..."
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              className="w-full bg-black border border-zinc-850 p-2 text-xs text-white placeholder-zinc-750 outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-left">
                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Línea Temática AFI</label>
                              <select
                                value={draftLine}
                                onChange={(e) => setDraftLine(e.target.value)}
                                className="w-full bg-black border border-zinc-850 p-2 text-xs text-zinc-300 cursor-pointer outline-none text-left"
                              >
                                <option value="Sociología Digital y Nuevas Tecnologías">Sociología Digital</option>
                                <option value="Transformación Social y Desarrollo Regional">Transformación Social</option>
                                <option value="Educación y Juventudes">Educación y Juventudes</option>
                                <option value="Género y Cambio Cultural">Géneros y Familias</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-zinc-500 uppercase block">Nombre de Archivo Digital</label>
                              <input
                                type="text"
                                required
                                placeholder="Ej. manuscrito_namora_v4.pdf"
                                value={draftFile}
                                onChange={(e) => setDraftFile(e.target.value)}
                                className="w-full bg-black border border-zinc-850 p-2 text-xs text-white placeholder-zinc-750 outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>

                          {/* Simulation area */}
                          <div className="border border-dashed border-zinc-850 p-4 text-center space-y-1 bg-black/30">
                            <UploadCloud className="h-5.5 w-5.5 text-zinc-600 mx-auto" strokeWidth="1.5" />
                            <p className="text-[10px] font-mono text-zinc-450">Fije el nombre de manuscrito simulado arriba y presione Enviar</p>
                            <p className="text-[8.5px] text-zinc-600">Tipos de archivo soportados: PDF, LaTeX, DOCX hasta 20MB</p>
                          </div>

                          <button
                            type="submit"
                            disabled={draftSubmitted}
                            className="w-full flex items-center justify-center gap-2 bg-[#0099ff]/10 hover:bg-[#0099ff]/20 text-[#0099ff] border border-[#0099ff]/35 py-2 font-mono text-[10.5px] uppercase font-bold transition-all cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {draftSubmitted ? 'Subiendo Manuscrito...' : 'Enviar Borrador para Arbitraje'}
                          </button>
                        </form>

                        {/* Submitted preprints list */}
                        <div className="space-y-2 border-t border-zinc-900 pt-3">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase font-bold text-left">Manuscritos en Proceso:</span>
                          <div className="space-y-2">
                            {submittedDrafts.map((d) => (
                              <div key={d.id} className="bg-black border border-zinc-950 p-3 flex justify-between items-center text-left">
                                <div className="space-y-0.5 max-w-[280px]">
                                  <h6 className="font-extrabold text-[#0099ff] line-clamp-1 truncate text-xs">{d.title}</h6>
                                  <p className="text-[9.5px] text-zinc-500 font-mono">Tutoría: {d.line} • {d.filename}</p>
                                </div>
                                <span className="text-[8.5px] font-mono whitespace-nowrap bg-amber-950/40 text-amber-500 border border-amber-900/40 px-2 py-0.5 uppercase font-bold block shrink-0">
                                  {d.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

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
