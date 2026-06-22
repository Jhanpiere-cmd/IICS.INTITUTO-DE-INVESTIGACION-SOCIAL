import { useState, FormEvent } from 'react';
import { X, Search, FileDown, PlusCircle, Check, Send, Sparkles, Filter, ChevronRight, Calendar, AlertOctagon, Lock, Unlock, User, Sparkle, Database, GraduationCap, AlertTriangle, FileText, BookOpen, Clock, UploadCloud, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProvinceData, Alert, ResearchLine } from '../types';
import { SmokeyBackground, LoginForm } from './ui/login-form';
import { CharacterPanel } from './CharacterPanel';
import AboutValues from './AboutValues';

interface ModalPortalProps {
  provinces: ProvinceData[];
  alerts: Alert[];
  activeModal: 'portal' | 'alerts' | 'research' | 'nosotros' | null;
  onClose: () => void;
  selectedResearchLine: ResearchLine | null;
  onSubmitSimulatedAlert: (newAlert: Alert) => void;
  isLoggedIn: boolean;
  onLogin: (status: boolean) => void;
  onOpenPortal?: () => void;
}

export default function ModalPortal({
  provinces,
  alerts,
  activeModal,
  onClose,
  selectedResearchLine,
  onSubmitSimulatedAlert,
  isLoggedIn,
  onLogin,
  onOpenPortal
}: ModalPortalProps) {
  
  // Login States
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // States for Portal View
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('all');
  const [searchAlertQuery, setSearchAlertQuery] = useState('');
  
  // Custom inside-portal tabs: 'datasets' (open data for citizens), 'afi' (young scholars/students), 'alerts' (high-tech indicators)
  const [portalTab, setPortalTab] = useState<'datasets' | 'afi' | 'alerts'>('datasets');
  
  // Simulated downloading states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  // Semillero AFI draft uploader states
  const [draftTitle, setDraftTitle] = useState('');
  const [draftLine, setDraftLine] = useState('Sociología Digital y Nuevas Tecnologías');
  const [draftFile, setDraftFile] = useState<string>('');
  const [draftSubmitted, setDraftSubmitted] = useState(false);
  const [submittedDrafts, setSubmittedDrafts] = useState<any[]>([]);

  // Submit Custom citizen Alert Form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProvince, setFormProvince] = useState(provinces[0]?.name || '');
  const [formType, setFormType] = useState<'Bajo' | 'Medio' | 'Alto'>('Medio');
  const [formSubmitted, setFormSubmitted] = useState(false);

  // CSV Download simulation message
  const [exportNotice, setExportNotice] = useState(false);

  const triggerExportSimulation = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setLoginError('Por favor complete todos los campos.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    // Simulated network latencies representing a realistic secure server handshakes
    setTimeout(() => {
      const u = usernameInput.toLowerCase().trim();
      const p = passwordInput.trim();
      
      if (
        (u === 'analista@iics.org' || u === 'admin') &&
        (p === 'cajamarca2026' || p === 'admin123')
      ) {
        onLogin(true);
        setIsLoggingIn(false);
        // Clean inputs upon success
        setUsernameInput('');
        setPasswordInput('');
        setLoginError('');
      } else {
        setLoginError('Acceso denegado: Credenciales no reconocidas en el servidor central del IICS.');
        setIsLoggingIn(false);
      }
    }, 1000);
  };

  const handleAutofillClick = () => {
    setUsernameInput('analista@iics.org');
    setPasswordInput('cajamarca2026');
    setLoginError('');
  };

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    setLoginError('');

    // Simulated network latencies representing a realistic secure server handshake with Google Auth API
    setTimeout(() => {
      onLogin(true);
      setIsLoggingIn(false);
      setUsernameInput('');
      setPasswordInput('');
      setLoginError('');
    }, 1200);
  };

  const handleCitizenSubmit = (e: FormEvent) => {
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
    }, 3000);
  };

  if (!activeModal) return null;

  // Filter local data for Portal Database
  const filteredProvinces = provinces.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.keyIssues.some((issue) => issue.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Immersive Full Screen Login option if not authenticated in Portal
  if (activeModal === 'portal' && !isLoggedIn) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#09090b] w-full h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden text-white"
        >
          {/* Left panel: Cute characters standing on soft gray gradient background */}
          <div className="relative hidden lg:flex flex-col justify-between h-full bg-gradient-to-b from-gray-100 via-gray-150 to-gray-300 text-zinc-900 p-12 overflow-hidden select-none border-r border-gray-300/40">
            {/* Brand Logo - Top Left */}
            <div className="flex items-center gap-2.5 relative z-10">
              <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-850 text-cyan-400 shadow-sm flex-shrink-0">
                <svg viewBox="0 0 100 100" className="h-5.5 w-5.5 text-cyan-400" fill="currentColor">
                  <circle cx="50" cy="50" r="10" />
                  <circle cx="50" cy="18" r="7" />
                  <circle cx="50" cy="82" r="7" />
                  <circle cx="18" cy="50" r="7" />
                  <circle cx="82" cy="50" r="7" />
                  <circle cx="28" cy="28" r="5" />
                  <circle cx="72" cy="72" r="5" />
                  <circle cx="72" cy="28" r="5" />
                  <circle cx="28" cy="72" r="5" />
                  {/* Connected web lines */}
                  <line x1="50" y1="18" x2="50" y2="82" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                  <line x1="18" y1="50" x2="82" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                  <line x1="28" y1="28" x2="72" y2="72" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                  <line x1="28" y1="72" x2="72" y2="28" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                </svg>
              </div>
              <div className="text-left leading-none">
                <h1 className="text-base font-black text-zinc-900 tracking-wider font-sans">
                  IICS <span className="text-cyan-700 text-[10px] font-mono font-bold tracking-normal">DATA</span>
                </h1>
                <p className="text-[8.5px] text-zinc-500 font-mono tracking-wide uppercase mt-0.5 font-bold">
                  Plataforma de Investigación Territorial
                </p>
              </div>
            </div>

            {/* Monsters sitting perfectly at the absolute bottom of this column */}
            <div className="absolute bottom-0 left-0 right-0 h-[400px] flex items-end justify-center overflow-hidden pointer-events-none">
              <div className="w-full h-full relative">
                <CharacterPanel 
                  isTyping={isTyping} 
                  passwordLength={passwordInput.length} 
                  showPassword={showPassword} 
                />
              </div>
            </div>

            {/* Bottom Left Links Panel */}
            <div className="flex items-center gap-6 text-[11px] text-zinc-500 font-semibold relative z-10">
              <a href="#privacy" className="hover:text-zinc-900 transition-colors">Política de Privacidad</a>
              <a href="#terms" className="hover:text-zinc-900 transition-colors">Términos de Servicio</a>
              <a href="#contact" className="hover:text-zinc-900 transition-colors">Contacto</a>
            </div>
          </div>

          {/* Right Panel: Black background holding login inputs */}
          <div className="relative h-full w-full flex flex-col justify-between bg-black p-8 sm:p-16 md:p-24 overflow-y-auto">
            {/* Clean, Floating "Regresar" / Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 sm:top-10 sm:right-10 z-55 flex items-center gap-2 px-4 py-2 bg-[#121214] hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-gray-300 hover:text-white text-xs font-mono tracking-wider uppercase transition-all duration-300 cursor-pointer rounded-none"
            >
              <X className="h-4 w-4" />
              <span>Cerrar</span>
            </button>

            <div className="my-auto w-full max-w-sm mx-auto py-12 flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full"
              >
                <LoginForm
                  usernameInput={usernameInput}
                  setUsernameInput={setUsernameInput}
                  passwordInput={passwordInput}
                  setPasswordInput={setPasswordInput}
                  loginError={loginError}
                  setLoginError={setLoginError}
                  isLoggingIn={isLoggingIn}
                  onLoginSubmit={handleLoginSubmit}
                  onAutofill={handleAutofillClick}
                  onGoogleLogin={handleGoogleLogin}
                  onTypingChange={setIsTyping}
                  showPassword={showPassword}
                  onShowPasswordChange={setShowPassword}
                />
              </motion.div>
            </div>

            {/* Institutional Console footer watermark */}
            <div className="text-left mt-4">
              <p className="text-[9px] text-zinc-700 font-mono tracking-wider uppercase leading-relaxed font-semibold">
                Consola Central de Inteligencia Territorial • Cajamarca 2026 • Acceso Protegido
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (activeModal === 'nosotros') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black w-full h-screen pt-16 sm:pt-20 overflow-y-auto text-white flex flex-col justify-between"
        >
          {/* Full content representing AboutValues inside the Sub-Page */}
          <div className="flex-1 w-full bg-black">
            <AboutValues isSubPage={true} onLearnMoreClick={() => {
              onClose();
              if (onOpenPortal) {
                // Instantly swap into portal view
                setTimeout(() => {
                  onOpenPortal();
                }, 100);
              }
            }} />
          </div>

          {/* Institutional Console footer watermark */}
          <div className="border-t border-zinc-900 bg-[#040405] py-6 px-4">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <p className="text-[9px] text-[#52525b] font-mono tracking-wider uppercase leading-relaxed font-semibold">
                Consola Central de Inteligencia Territorial • Cajamarca 2026 • Acceso Autónomo Protegido
              </p>
              <p className="text-[9px] text-[#71717a] font-mono font-semibold uppercase">
                ENFOQUE DE VALOR PREVIO A LA RECOMPENSA MONETARIA
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Black backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
      />

      {/* Main Container Window Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-4xl max-h-[85vh] bg-black border border-gray-800 rounded-none overflow-hidden flex flex-col shadow-2xl z-10 text-left"
      >
        
        {/* Header Block */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80 bg-gray-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-none bg-cyan-950/30 border border-cyan-500/30">
              <Lock className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {activeModal === 'portal' && (isLoggedIn ? 'IICS Portal Central de Datos' : 'Sistema de Autenticación de Seguridad')}
                {activeModal === 'alerts' && 'Historial de Alertas Territoriales'}
                {activeModal === 'research' && `Línea: ${selectedResearchLine?.title}`}
              </h3>
              <p className="text-[10px] text-gray-500 font-mono">
                {activeModal === 'portal' && (isLoggedIn ? 'MÉTRICAS COYUNTURALES E INDICADORES DE CONFLICTO' : 'INGRESO CON CREDENCIALES ACREDITADAS')}
                {activeModal === 'alerts' && 'MONITOREO DE EVENTOS SOCIOAMBIENTALES'}
                {activeModal === 'research' && 'ENFOQUE METODOLÓGICO Y SINOPSIS ACADÉMICA'}
              </p>
            </div>
          </div>

          <button
            id="modal-close-trigger"
            onClick={onClose}
            className="p-1.5 rounded-none bg-gray-950 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-650 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Content Body Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* PORTAL MODAL VIEW */}
          {activeModal === 'portal' && (
            isLoggedIn ? (
              <div className="space-y-6">
                
                {/* Advanced Multi-Role Module Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-900 pb-4 text-left">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-950/30 border border-cyan-800/20 px-2 py-0.5 tracking-wider uppercase">
                      CONSOLA VIRTUAL DE INVESTIGACIÓN / MULTI-ROL (IICS)
                    </span>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      Sistema del Portal de Datos e Investigación Cajamarca
                    </h3>
                  </div>

                  {/* Role Indicators Badge */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-500">Credenciales:</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#050506] border border-gray-800 text-[11px] font-mono">
                      <User className="h-3 w-3 text-cyan-400" />
                      <span className="text-gray-200 font-bold">analista@iics.org</span>
                      <span className="text-[9px] text-[#0099ff] bg-cyan-950/40 px-1 font-bold">MULTIUSUARIO</span>
                    </div>
                  </div>
                </div>

                {/* Navigation tabs inside the system */}
                <div className="flex flex-wrap gap-1 bg-[#050506] border border-gray-900 p-1 font-mono text-[10.5px]">
                  <button
                    id="portaltab-datasets"
                    onClick={() => setPortalTab('datasets')}
                    className={`px-3 py-1.5 transition-all cursor-pointer flex items-center gap-2 border ${
                      portalTab === 'datasets'
                        ? 'bg-cyan-950/30 text-[#0099ff] border-cyan-500/20 font-extrabold'
                        : 'text-gray-400 hover:text-white border-transparent'
                    }`}
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>[01] Base de Datos y Descargas Libres (Ciudadanos)</span>
                  </button>

                  <button
                    id="portaltab-afi"
                    onClick={() => setPortalTab('afi')}
                    className={`px-3 py-1.5 transition-all cursor-pointer flex items-center gap-2 border ${
                      portalTab === 'afi'
                        ? 'bg-cyan-950/30 text-[#0099ff] border-cyan-500/20 font-extrabold'
                        : 'text-gray-400 hover:text-white border-transparent'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>[02] Academia AFI (Semilleros/Alumnos)</span>
                  </button>

                  <button
                    id="portaltab-alerts"
                    onClick={() => setPortalTab('alerts')}
                    className={`px-3 py-1.5 transition-all cursor-pointer flex items-center gap-2 border ${
                      portalTab === 'alerts'
                        ? 'bg-cyan-950/30 text-[#0099ff] border-cyan-500/20 font-extrabold'
                        : 'text-gray-400 hover:text-white border-transparent'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>[03] Consola de Alertas (Senior Analyst)</span>
                  </button>
                </div>

                {/* TAB 1: DATASETS (Serves Normal/Public Academic Users) */}
                {portalTab === 'datasets' && (
                  <div className="space-y-6">
                    <div className="space-y-1 text-left">
                      <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Database className="h-4 w-4 text-[#0099ff]" />
                        Explorador de Datasets y Muestras para Investigación Social Abierta
                      </h4>
                      <p className="text-xs text-gray-400 font-sans leading-relaxed">
                        Acceda de manera transparente a los corpus de datos recabados en trabajo de campo por el IICS. Estos registros están estructurados para el análisis en programas de estadística (SPSS, RStudio) o sistemas de georreferenciación (QGIS).
                      </p>
                    </div>

                    {downloadSuccessNotice && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2 text-left"
                      >
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>{downloadSuccessNotice}</span>
                      </motion.div>
                    )}

                    {/* Datasets lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          id: 'data-conflictos',
                          filename: 'IICS_social_conflict_indicators_2026_Q1.xlsx',
                          description: 'Indicadores agregados mensuales de tensiones socioambientales, mesas de negociación abiertas y compromisos en las 13 provincias.',
                          size: '4.2 MB',
                          type: 'Excel (.xlsx)',
                          integrity: 'SHA256: 8f9e2b1c4a037b5e82496cdfd8aa77bf'
                        },
                        {
                          id: 'data-gis',
                          filename: 'Cajamarca_GIS_Hydrologic_Mining_Vulnerability_v2.zip',
                          description: 'Capas vectoriales georreferenciadas (Shapefiles/QGIS) que integran pasivos de mina, zonas rondoneras y fajas hídricas críticas.',
                          size: '18.5 MB',
                          type: 'Capas GIS (.zip)',
                          integrity: 'SHA256: d5a49e2fc8e331b0aef773641bcaa605'
                        },
                        {
                          id: 'data-transcripciones',
                          filename: 'Michiquillay_AtlasTi_transcripts_corpus.zip',
                          description: 'Transcripciones limpias de asambleas, audiencias y discursos radiales codificados utilizando hermenéutica digital en Atlas.ti.',
                          size: '2.8 MB',
                          type: 'Archivo de Texto (.zip)',
                          integrity: 'SHA256: f21b7a8ee9484b060d4dae07cbb35e19'
                        },
                        {
                          id: 'data-encuestas',
                          filename: 'Cohesion_Social_Cajamarca_SPSS_data.sav',
                          description: 'Respuestas completas de encuestas presenciales sobre valoración comunitaria y confianza institucional aplicada a 1,100 familias.',
                          size: '1.1 MB',
                          type: 'SPSS Dataset (.sav)',
                          integrity: 'SHA256: 1a9c0d4bb8e2bc7715f3e9ca29037df8'
                        }
                      ].map((dataset) => {
                        const isDownloading = downloadingId === dataset.id;

                        return (
                          <div
                            key={dataset.id}
                            className="bg-black border border-gray-900 p-4 flex flex-col justify-between hover:border-gray-800 transition-colors"
                          >
                            <div className="space-y-2 text-left">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-cyan-400 font-extrabold">{dataset.type}</span>
                                <span className="text-gray-500">{dataset.size}</span>
                              </div>
                              <h5 className="text-xs font-bold text-white font-mono break-all leading-tight">
                                {dataset.filename}
                              </h5>
                              <p className="text-[11px] text-gray-400 leading-normal">
                                {dataset.description}
                              </p>
                              <div className="flex items-center justify-between bg-[#040405] border border-gray-950 p-2 text-[9px] font-mono text-gray-600">
                                <span className="truncate w-10/12">{dataset.integrity}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(dataset.integrity);
                                    alert('Código SHA-256 de veracidad científica copiado al portapapeles.');
                                  }}
                                  className="text-cyan-500 hover:text-white transition-colors flex items-center gap-0.5 ml-2 cursor-pointer bg-transparent border-none outline-none"
                                  title="Copiar Hash"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Download Action Progress Bar */}
                            <div className="mt-4 pt-3 border-t border-gray-950">
                              {isDownloading ? (
                                <div className="space-y-1.5 font-mono text-[10px]">
                                  <div className="flex justify-between text-cyan-400">
                                    <span>Descargando repositorio...</span>
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
                                    setDownloadingId(dataset.id);
                                    setDownloadProgress(0);
                                    const interval = setInterval(() => {
                                      setDownloadProgress((prev) => {
                                        if (prev >= 100) {
                                          clearInterval(interval);
                                          setTimeout(() => {
                                            setDownloadingId(null);
                                            setDownloadSuccessNotice(`Repositorio científico "${dataset.filename}" descargado con éxito en su carpeta local.`);
                                            setTimeout(() => setDownloadSuccessNotice(null), 5000);
                                          }, 300);
                                          return 100;
                                        }
                                        return prev + 25;
                                      });
                                    }, 250);
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 bg-[#0e0e11] hover:bg-cyan-500 border border-gray-850 hover:border-transparent text-gray-300 hover:text-slate-950 font-mono py-2 text-[10px] uppercase font-bold transition-all cursor-pointer"
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                  <span>Descargar Raw Dataset</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-[#050506]/60 border border-gray-900 p-4 font-sans text-xs text-gray-400 text-left">
                      <p className="leading-relaxed">
                        <b>Nota de Validación:</b> Toda descarga contiene un archivo de metadatos con el diccionario de variables, los coeficientes de error muestral y el descargo ético de anonimización absoluta (cumpliendo con la legislación de protección de datos personales).
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: SEMILLERO AFI (Serves Young Researchers/Students) */}
                {portalTab === 'afi' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Draft Uploader Academic pipeline */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="space-y-1 text-left">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-[#0099ff]" />
                          Buzón de Recepción de Borradores (Pre-prints)
                        </h4>
                        <p className="text-xs text-gray-400 font-sans leading-relaxed">
                          ¿Eres estudiante becado o miembro del semillero AFI del IICS? Sube tus borradores de artículos de investigación o monografías territoriales para ser revisadas por el comité pedagógico de pares.
                        </p>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!draftTitle || !draftFile) {
                            alert('Por favor complete el título y seleccione un documento para subir.');
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
                            alert(`¡Éxito! Su borrador de investigación "${newDraft.title}" ha sido ingresado en el servidor IICS en cola de arbitraje.`);
                          }, 1500);
                        }}
                        className="bg-[#050506] border border-gray-900 p-4 space-y-3.5 text-left font-sans text-xs"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">
                            Título del Borrador Científico
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Análisis de impacto rural de la tecnología en Namora..."
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            className="w-full bg-black border border-gray-800 p-2 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">
                              Línea Temática Correspondiente
                            </label>
                            <select
                              value={draftLine}
                              onChange={(e) => setDraftLine(e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-xs text-white outline-none cursor-pointer text-left"
                            >
                              <option value="Sociología Digital y Nuevas Tecnologías">Sociología Digital</option>
                              <option value="Transformación Social y Desarrollo Regional">Transformación Social</option>
                              <option value="Educación y Juventudes">Educación y Juventudes</option>
                              <option value="Género y Cambio Cultural">Género y Cambio Cultural</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">
                              Simular Archivo de Texto (.pdf, .docx)
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. borrador_beca_namora_v3.pdf"
                              value={draftFile}
                              onChange={(e) => setDraftFile(e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        {/* Drag and drop simulator area */}
                        <div className="border border-dashed border-gray-850 p-4 text-center space-y-1 bg-black/40">
                          <UploadCloud className="h-6 w-6 text-gray-650 mx-auto" />
                          <p className="text-[10.5px] font-mono text-gray-505">
                            Cargue su pre-print usando el campo de simulación de texto superior
                          </p>
                          <p className="text-[9px] text-gray-600">
                            Formatos habilitados: PDF, DOCX, LaTeX de hasta 25MB
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={draftSubmitted}
                          className="w-full flex items-center justify-center gap-2 bg-[#0099ff]/10 hover:bg-[#0099ff]/20 text-[#0099ff] border border-[#0099ff]/30 py-2.5 font-mono text-[10.5px] uppercase font-bold transition-all cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {draftSubmitted ? 'Subiendo manuscrito al Clúster...' : 'Enviar Borrador para Pares'}
                        </button>
                      </form>

                      {/* Submitted drafts list log */}
                      {submittedDrafts.length > 0 && (
                        <div className="space-y-2 text-left mt-4 border-t border-gray-900 pt-4">
                          <h5 className="text-[10px] font-mono text-gray-500 uppercase font-bold">
                            Tus Manuscritos en Proceso de Arbitraje:
                          </h5>
                          <div className="space-y-2">
                            {submittedDrafts.map((d) => (
                              <div key={d.id} className="bg-black/80 border border-gray-900 p-3 flex justify-between items-center">
                                <div className="space-y-1 font-sans text-xs">
                                  <h6 className="font-bold text-white line-clamp-1">{d.title}</h6>
                                  <p className="text-[10px] text-gray-500 font-mono">Línea: {d.line} • {d.filename}</p>
                                </div>
                                <span className="text-[9px] font-mono whitespace-nowrap bg-amber-950/40 text-amber-500 border border-amber-900/40 px-1.5 py-0.5 uppercase font-bold">
                                  {d.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: AFI Scholastic statistics and guidelines */}
                    <div className="lg:col-span-5 bg-black border border-gray-900 p-4 space-y-4">
                      <div className="flex items-center gap-2 text-left">
                        <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Beca y Tutoría AFI 2026
                        </h4>
                      </div>
                      
                      <div className="space-y-3 font-sans text-xs text-gray-400 text-left">
                        <p className="leading-relaxed text-[11.5px]">
                          La Academia de Formación de Investigadores del IICS financia estipendios de estudio para estudiantes sobresalientes del norte peruano.
                        </p>
                        
                        <div className="divide-y divide-zinc-900 text-[11px] space-y-2 pt-2 text-left">
                          <div className="pt-2">
                            <span className="block text-gray-500 font-mono font-bold uppercase text-[9px]">Estatus de Convocatoria:</span>
                            <span className="text-emerald-400 font-bold">Abierta • Convocatoria Semestral 2026-I</span>
                          </div>
                          <div className="pt-2">
                            <span className="block text-gray-500 font-mono font-bold uppercase text-[9px]">Beneficios Integrales:</span>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-400">
                              <li>Asignación pecuniaria de mentoría de investigación</li>
                              <li>Uso de clúster computacional para NLP</li>
                              <li>Financiamiento de APC para revistas en Scopus</li>
                            </ul>
                          </div>
                          <div className="pt-2">
                            <span className="block text-gray-500 font-mono font-bold uppercase text-[9px]">Tutor Responsable:</span>
                            <span className="text-white font-medium">Dr. Jaime Abanto Padilla (CONCYTEC / RENACYT)</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-900 text-[10px] text-gray-500 flex items-center gap-1.5 leading-normal">
                        <AlertOctagon className="h-3.5 w-3.5 text-[#0099ff] shrink-0" />
                        <span>Todo reporte está sujeto a verificación estricta de rigor académico.</span>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 3: CONSOLE ALERTS & Advanced indicators (Senior Analysts / Advanced Users) */}
                {portalTab === 'alerts' && (
                  <div className="space-y-6">
                    <div className="space-y-1 text-left">
                      <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Canal Integrado de Análisis de Conflictos y Reportes Cívicos
                      </h4>
                      <p className="text-xs text-gray-400 font-sans leading-relaxed">
                        Zonificación situacional detallada. Filtre los indicadores de conflictividad, revise el conteo de denuncias comunitarias geolocalizadas y examine la volumetría de expresiones censadas en medios sociodigitales andinos.
                      </p>
                    </div>

                    <div className="bg-black border border-gray-900 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                      <p className="text-xs text-gray-400 max-w-xl text-left font-sans">
                        Genere un reporte resumido integral de Cajamarca (13 provincias) consolidado en formato de hoja de cálculo estructurada.
                      </p>
                      <div className="relative">
                        <button
                          id="btn-simulate-csv"
                          onClick={triggerExportSimulation}
                          className="flex items-center justify-center gap-2 rounded-none bg-[#0099ff]/10 hover:bg-[#0099ff]/20 text-[#0099ff] border border-[#0099ff]/30 px-4 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer w-full md:w-auto font-mono"
                        >
                          <FileDown className="h-4 w-4" />
                          Consolidar Reporte Territorial [CSV]
                        </button>

                        <AnimatePresence>
                          {exportNotice && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute bottom-12 right-0 bg-emerald-950 border border-emerald-500/20 text-emerald-300 text-[10px] p-2 rounded shadow-lg whitespace-nowrap z-50 flex items-center gap-1.5"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              Descarga iniciada exitosamente.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left Database Filter Table */}
                      <div className="lg:col-span-8 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                              type="text"
                              placeholder="Buscar provincia o tema clave de conflictividad..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-black border border-gray-800 pl-9 pr-4 py-2.5 text-xs text-white rounded-none focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                            />
                          </div>
                        </div>

                        {/* Indicators Table Grid */}
                        <div className="border border-gray-900 rounded-none overflow-hidden bg-black/40">
                          <div className="grid grid-cols-12 bg-gray-950/60 p-3 text-[10px] font-mono font-bold text-gray-400 border-b border-gray-900 uppercase">
                            <span className="col-span-4 text-left">Provincia</span>
                            <span className="col-span-3 text-center">Índice Combustión</span>
                            <span className="col-span-2 text-center">Alertas</span>
                            <span className="col-span-3 text-right">Menciones redes</span>
                          </div>

                          <div className="divide-y divide-gray-900 max-h-[250px] overflow-y-auto">
                            {filteredProvinces.map((prov) => (
                              <div key={prov.id} className="grid grid-cols-12 p-3 text-xs items-center hover:bg-gray-900/20">
                                <span className="col-span-4 font-bold text-white text-left">{prov.name}</span>
                                
                                <span className="col-span-3 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded-none font-mono font-bold text-[10px] ${
                                    prov.riskScore >= 7 
                                      ? 'bg-red-950/30 text-red-100 border border-red-500/25' 
                                      : prov.riskScore >= 4 
                                      ? 'bg-yellow-950/30 text-yellow-300 border border-yellow-500/25' 
                                      : 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/20'
                                  }`}>
                                    {prov.riskScore.toFixed(1)}
                                  </span>
                                </span>

                                <span className="col-span-2 text-center font-mono text-gray-300">
                                  {prov.alertCount}
                                </span>

                                <span className="col-span-3 text-right font-mono text-cyan-400 font-medium">
                                  {prov.mencionesRedes.toLocaleString()}
                                </span>
                              </div>
                            ))}
                            {filteredProvinces.length === 0 && (
                              <div className="p-8 text-center text-xs text-gray-500">
                                No se encontraron registros de provincia coincidentes.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Custom Citizen Simulated Alert Entry Pipe */}
                      <div className="lg:col-span-4 bg-[#050506] border border-gray-900 rounded-none p-4 space-y-4">
                        <div className="flex items-center gap-2 text-left">
                          <PlusCircle className="h-4 w-4 text-[#0099ff] shrink-0" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                            Reportar Incidente social
                          </h4>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-sans text-left">
                          Súmese al monitoreo cívico. Ingrese una alerta simulada para verla fluir instantáneamente en los dashboards.
                        </p>

                        <form onSubmit={handleCitizenSubmit} className="space-y-3 text-xs">
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-bold text-gray-500 uppercase font-mono block">
                              Título de Alerta
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. Reclamo de riego comunal"
                              value={formTitle}
                              onChange={(e) => setFormTitle(e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-xs text-white rounded-none focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-left">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono block">
                                Provincia
                              </label>
                              <select
                                value={formProvince}
                                onChange={(e) => setFormProvince(e.target.value)}
                                className="w-full bg-[#030303] border border-gray-800 p-2 text-xs text-white rounded-none focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                              >
                                {provinces.map((p) => (
                                  <option key={p.id} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono block">
                                Gravedad
                              </label>
                              <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value as any)}
                                className="w-full bg-[#030303] border border-gray-800 p-2 text-xs text-white rounded-none focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                              >
                                <option value="Bajo">Baja</option>
                                <option value="Medio">Media</option>
                                <option value="Alto">Alta</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-bold text-gray-500 uppercase font-mono block">
                              Relato sintetizado
                            </label>
                            <textarea
                              required
                              rows={2}
                              placeholder="Describa el hecho brevemente..."
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-xs text-white rounded-none focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 rounded-none bg-[#0099ff] text-slate-950 py-2.5 text-xs font-bold leading-tight hover:bg-cyan-400 cursor-pointer transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Enviar Alerta de Monitoreo
                          </button>
                        </form>

                        <AnimatePresence>
                          {formSubmitted && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] p-2.5 rounded-none text-center flex items-center justify-center gap-2 font-mono"
                            >
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span>¡Ingreso Simulado! Añadido al panel general de Alertas del IICS.</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div id="iics-login-wrapper" className="relative min-h-[465px] flex items-center justify-center p-4 overflow-hidden border border-gray-900 bg-gray-950/20">
                <SmokeyBackground backdropBlurAmount="md" className="absolute inset-0 z-0" />
                <LoginForm
                  usernameInput={usernameInput}
                  setUsernameInput={setUsernameInput}
                  passwordInput={passwordInput}
                  setPasswordInput={setPasswordInput}
                  loginError={loginError}
                  setLoginError={setLoginError}
                  isLoggingIn={isLoggingIn}
                  onLoginSubmit={handleLoginSubmit}
                  onAutofill={handleAutofillClick}
                  onGoogleLogin={handleGoogleLogin}
                />
              </div>
            )
          )}

          {/* HISTORICAL ALERTS MODAL VIEW */}
          {activeModal === 'alerts' && (
            <div className="space-y-5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar alertas por palabras claves o provincia..."
                  value={searchAlertQuery}
                  onChange={(e) => setSearchAlertQuery(e.target.value)}
                  className="w-full bg-black border border-gray-800 pl-10 pr-4 py-2.5 text-xs text-white rounded-none focus:outline-none"
                />
              </div>

              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-2">
                {alerts
                  .filter((a) => {
                    return (
                      a.title.toLowerCase().includes(searchAlertQuery.toLowerCase()) ||
                      a.province.toLowerCase().includes(searchAlertQuery.toLowerCase()) ||
                      a.description.toLowerCase().includes(searchAlertQuery.toLowerCase())
                    );
                  })
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-black border border-gray-900 hover:border-gray-800 p-4 rounded-none space-y-2 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-none font-black text-[9px] ${
                            alert.type === 'Alto' 
                              ? 'text-red-400 bg-red-950/50 border border-red-500/20' 
                              : alert.type === 'Medio'
                              ? 'text-yellow-400 bg-yellow-950/50 border border-yellow-500/20'
                              : 'text-cyan-400 bg-cyan-950/50 border border-cyan-500/10'
                          }`}>
                            Riesgo: {alert.type}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-cyan-400 font-bold">{alert.province}</span>
                        </div>
                        <div className="text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {alert.time}
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white">
                        {alert.title}
                      </h4>

                      <p className="text-xs text-gray-400 leading-normal">
                        {alert.description}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* RESEARCH LINE DETAILS VIEW */}
          {activeModal === 'research' && selectedResearchLine && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Detailed synoptical report */}
              <div className="md:col-span-8 space-y-5">
                <h4 className="text-base font-bold text-white border-l-2 border-cyan-400 pl-3">
                  Marco Metodológico de la Línea
                </h4>
                <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                  {selectedResearchLine.details}
                </p>

                <div className="p-4 bg-black border border-gray-900 rounded-none space-y-3">
                  <h5 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                    Enfoque Instrumental
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block font-bold text-white text-left">Cualitativo:</span>
                      <span className="block text-gray-400 text-[11px] mt-0.5">Focus groups, entrevistas semi-estructuradas y reconstrucción etnográfica local.</span>
                    </div>
                    <div>
                      <span className="block font-bold text-white text-left font-sans">Cuantitativo:</span>
                      <span className="block text-gray-400 text-[11px] mt-0.5">Encuestas multipropósito, modelos matemáticos de regresión y monitoreo en tiempo real.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side facts (researchers, publications index) */}
              <div className="md:col-span-4 bg-black border border-gray-900 rounded-none p-4 space-y-4">
                <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                  Índices de Línea
                </h5>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="block text-gray-500 font-medium">Investigadores Principales:</span>
                    <span className="block text-gray-300 font-bold">Dra. Clara Horna, Dr. Sergio Abanto</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-medium">Publicaciones 2024-2026:</span>
                    <span className="block text-gray-300 font-bold">14 artículos en Scopus / SciELO</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-medium">Proyectos Activos:</span>
                    <span className="block text-gray-300 font-bold">3 integraciones con el gobierno regional</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-900 text-[10px] text-gray-500 flex items-center gap-1.5 leading-normal">
                  <AlertOctagon className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  <span>Información compilada de manera transparente de los repositorios del IICS.</span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Area of Container */}
        <div className="flex md:items-center justify-between px-6 py-4 border-t border-gray-900/85 bg-gray-950/40">
          <span className="text-[10px] text-gray-600 font-mono flex items-center gap-2">
            IICS • CORPORACIÓN PRIVADA E INDEPENDIENTE © 2026
            {isLoggedIn && activeModal === 'portal' && (
              <span className="text-emerald-500 font-bold">• ANALISTA CONECTADO</span>
            )}
          </span>
          <div className="flex items-center gap-4">
            {isLoggedIn && activeModal === 'portal' && (
              <button
                id="btn-logout"
                onClick={() => onLogin(false)}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer font-mono uppercase bg-red-950/10 hover:bg-red-950/20 px-2 py-1 border border-red-900/30"
              >
                Cerrar Sesión
              </button>
            )}
            <button
              id="modal-footer-close"
              onClick={onClose}
              className="text-xs font-bold text-cyan-400 hover:text-white transition-colors cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
