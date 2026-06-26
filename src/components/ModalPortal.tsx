import { useState, FormEvent, useEffect } from 'react';
import { X, Search, FileDown, PlusCircle, Check, Send, Sparkles, Filter, ChevronRight, Calendar, AlertOctagon, Lock, Unlock, User, Sparkle, Database, GraduationCap, AlertTriangle, FileText, BookOpen, Clock, UploadCloud, Copy, Play, Film, Tv, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProvinceData, Alert, ResearchLine } from '../types';
import { SmokeyBackground, LoginForm } from './ui/login-form';
import { CharacterPanel } from './CharacterPanel';
import AboutValues from './AboutValues';
import PublicationsSection from './PublicationsSection';
import { FallingPattern } from './ui/falling-pattern';

interface ModalPortalProps {
  provinces: ProvinceData[];
  alerts: Alert[];
  activeModal: 'portal' | 'alerts' | 'research' | 'nosotros' | 'publicaciones' | 'documentales' | 'academia' | null;
  onClose: () => void;
  selectedResearchLine: ResearchLine | null;
  onSubmitSimulatedAlert: (newAlert: Alert) => void;
  isLoggedIn: boolean;
  onLogin: (status: boolean) => void;
  onOpenPortal?: () => void;
  initialPortalTab?: 'datasets' | 'afi' | 'alerts';
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
  onOpenPortal,
  initialPortalTab
}: ModalPortalProps) {
  console.log('ModalPortal rendering with activeModal:', activeModal);
  
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

  useEffect(() => {
    if (activeModal === 'portal' && initialPortalTab) {
      setPortalTab(initialPortalTab);
    }
  }, [activeModal, initialPortalTab]);
  
  // Simulated downloading states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  // Documentary video playback states
  const [playingDoc, setPlayingDoc] = useState<any | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Academia AFI Open postulation form states
  const [postulantName, setPostulantName] = useState('');
  const [postulantEmail, setPostulantEmail] = useState('');
  const [postulantPhone, setPostulantPhone] = useState('');
  const [postulantUniversity, setPostulantUniversity] = useState('');
  const [postulantMotivation, setPostulantMotivation] = useState('');
  const [postulantFileLink, setPostulantFileLink] = useState('');
  const [postulantSubmitted, setPostulantSubmitted] = useState(false);
  const [isSubmittingPostulation, setIsSubmittingPostulation] = useState(false);

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

  // Academia sub-views
  const [afiSubView, setAfiSubView] = useState<'programs' | 'postulate' | 'enroll'>('programs');
  const [selectedAfiProgram, setSelectedAfiProgram] = useState<string>('Formación Completa en Investigación (3 Meses)');
  const [afiUserRole, setAfiUserRole] = useState<'estudiante' | 'profesional'>('estudiante');

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
          className="fixed inset-0 z-[60] bg-[#09090b] w-full h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden text-white"
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
    console.log('MODAL NOSOTROS RENDERING NOW');
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999, background: '#000', width: '100vw', height: '100vh', overflowY: 'auto', color: 'white', display: 'flex', flexDirection: 'column' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '96px', right: '24px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#121214', border: '1px solid #3f3f46', color: '#d4d4d8', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '0.1em' }}
        >
          <X style={{ width: '16px', height: '16px' }} />
          <span>Regresar al Inicio</span>
        </button>

        {/* Content */}
        <div style={{ flex: 1, width: '100%', paddingTop: '150px' }}>
          <AboutValues isSubPage={true} onLearnMoreClick={() => {
            onClose();
            if (onOpenPortal) {
              setTimeout(() => { onOpenPortal(); }, 100);
            }
          }} />
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #18181b', background: '#040405', padding: '24px 16px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px' }}>
            <p style={{ fontSize: '9px', color: '#52525b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Consola Central de Inteligencia Territorial • Cajamarca 2026
            </p>
            <p style={{ fontSize: '9px', color: '#71717a', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              ENFOQUE DE VALOR PREVIO A LA RECOMPENSA MONETARIA
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'publicaciones') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black w-full h-screen pt-16 sm:pt-20 overflow-y-auto text-white flex flex-col justify-between"
        >
          {/* Full content representing PublicationsSection inside the Sub-Page */}
          <div className="flex-1 w-full bg-black">
            <PublicationsSection isSubPage={true} onCloseSubPage={onClose} />
          </div>

          {/* Institutional Console footer watermark */}
          <div className="border-t border-zinc-900 bg-[#040405] py-6 px-4">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <p className="text-[9px] text-[#52525b] font-mono tracking-wider uppercase leading-relaxed font-semibold">
                Consola Central de Inteligencia Territorial • Cajamarca 2026 • Acceso Autónomo Protegido
              </p>
              <p className="text-[9px] text-[#71717a] font-mono font-semibold uppercase">
                Repositorio Abierto e Indexado de la Región Norte
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (activeModal === 'documentales') {
    const documentaries = [
      {
        id: 'doc-agua',
        title: 'Hualgayoc: El Latido del Agua',
        duration: '18:45',
        year: '2026',
        tags: ['Socioambiental', 'Recursos Hídricos'],
        desc: 'Exploración etnográfica y monitoreo digital en las microcuencas de Hualgayoc. Un registro sonoro y visual sobre la convivencia comunitaria, la minería y la conservación del recurso hídrico.',
        thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
        authors: 'Hery Díaz Bueno & Edwar Jahnpiere'
      },
      {
        id: 'doc-rondas',
        title: 'Justicia de la Tierra: Rondas Campesinas',
        duration: '22:10',
        year: '2025',
        tags: ['Justicia Comunal', 'Cultura Rural'],
        desc: 'Un retrato cinematográfico sobre el funcionamiento de las Rondas Campesinas en Chota. Hermenéutica de la tierra, resolución colectiva de disputas y el rol integrador de las mujeres ronderas.',
        thumbnail: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
        authors: 'Dr. Jaime Abanto Padilla & Equipo IICS'
      },
      {
        id: 'doc-michiquillay',
        title: 'Michiquillay: Las Voces de la Faja',
        duration: '15:30',
        year: '2026',
        tags: ['Gobernabilidad', 'Opinión Pública'],
        desc: 'Análisis cualitativo audiovisual basado en minería de opinión local y entrevistas comunitarias directas antes de la consolidación de la mesa de diálogo del proyecto de cobre.',
        thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
        authors: 'M. Cs. Julio Cesar Alcalde Giove'
      },
      {
        id: 'doc-observatorio',
        title: 'Sociología de Precisión: Datos para la Vida',
        duration: '12:15',
        year: '2026',
        tags: ['Tecnología', 'Desarrollo Territorial'],
        desc: 'Un cortometraje explicativo sobre el funcionamiento del clúster de NLP y los sistemas georreferenciados del IICS que permiten anticipar tensiones territoriales en el norte del Perú.',
        thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        authors: 'Comité Promotor IICS'
      }
    ];

    const handlePlayDoc = (doc: any) => {
      setLoadingVideo(true);
      setPlayingDoc(doc);
      setTimeout(() => {
        setLoadingVideo(false);
      }, 1500);
    };

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black w-full h-screen pt-28 sm:pt-32 overflow-y-auto text-white flex flex-col justify-between"
        >
          {/* Header Back Button */}
          <button
            onClick={() => {
              setPlayingDoc(null);
              onClose();
            }}
            className="absolute top-28 right-6 sm:top-32 sm:right-10 z-50 flex items-center gap-2 px-4 py-2 bg-[#121214] hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-gray-300 hover:text-white text-xs font-mono tracking-wider uppercase transition-all duration-300 cursor-pointer rounded-none"
          >
            <X className="h-4 w-4" />
            <span>Regresar al Inicio</span>
          </button>

          <div className="flex-1 w-full bg-black py-16 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl relative">
              {/* Section Header */}
              <div className="text-left mb-16 relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-px w-8 bg-cyan-500"></span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#0099ff]">
                    Ecosistema Transmedia Audiovisual
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase sm:text-4xl font-sans lg:max-w-3xl leading-[1.1]">
                  Documentales y Reportajes de Campo
                </h2>
                <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-200 font-sans font-medium">
                  Traducimos hallazgos analíticos y evidencia sociológica en producciones audiovisuales directas. Explore los registros documentales del IICS sobre tensiones territoriales, recursos hídricos y cultura andina.
                </p>
              </div>

              {/* Cinematic Video Player Overlay */}
              {playingDoc && (
                <div className="mb-12 bg-[#050506] border border-gray-900 p-4 md:p-6 rounded-none relative">
                  <button
                    onClick={() => setPlayingDoc(null)}
                    className="absolute top-4 right-4 z-55 p-1.5 bg-black border border-gray-800 text-gray-400 hover:text-white hover:border-gray-650 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="relative aspect-video w-full max-w-4xl mx-auto bg-black border border-zinc-900 flex flex-col justify-center items-center overflow-hidden">
                    {loadingVideo ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
                        <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">Cargando flujo de video IICS...</span>
                      </div>
                    ) : (
                      <>
                        {/* Immersive Scanning Graphic / Audio visualizer simulation */}
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/20 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,153,255,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                        <div className="absolute top-4 left-4 font-mono text-[9px] text-cyan-500/60 uppercase select-none space-y-1">
                          <div>SOURCE ID: {playingDoc.id}</div>
                          <div>STATUS: STREAMING STREAM_OK</div>
                          <div>FRAME_RATE: 24.00 FPS</div>
                        </div>

                        {/* Staged Visual Graphics */}
                        <Video className="h-16 w-16 text-cyan-500/30 animate-pulse" />
                        <span className="text-sm font-mono text-gray-450 font-bold uppercase tracking-wider mt-4 text-center px-4">
                          {playingDoc.title}
                        </span>
                        <span className="text-xs text-gray-550 font-mono mt-1">
                          [Reproducción Simulada • Contenido Transmedia del IICS]
                        </span>

                        {/* Player Telemetry Controls */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 border-t border-zinc-900 flex items-center justify-between gap-4 font-mono text-[10px]">
                          <div className="flex items-center gap-3">
                            <Play className="h-4.5 w-4.5 text-cyan-400 fill-cyan-400/20" />
                            <span className="text-gray-405">03:45 / {playingDoc.duration}</span>
                          </div>
                          <div className="flex-1 max-w-md h-1 bg-zinc-950 overflow-hidden border border-zinc-900 rounded-full mx-4">
                            <div className="bg-cyan-500 h-full w-[20%]" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-cyan-950/40 text-cyan-400 border border-cyan-900/20">HD 1080P</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Documentary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {documentaries.map((doc) => (
                  <div
                    key={doc.id}
                    className="group bg-[#050506] border border-gray-900 hover:border-gray-800 transition-all p-6 flex flex-col justify-between rounded-none text-left relative"
                  >
                    <div>
                      {/* Image Thumbnail with play overlay */}
                      <div className="relative aspect-video w-full bg-zinc-900 mb-6 overflow-hidden border border-gray-950 group-hover:border-zinc-800 transition-colors">
                        <img
                          src={doc.thumbnail}
                          alt={doc.title}
                          className="h-full w-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                          <button
                            onClick={() => handlePlayDoc(doc)}
                            className="h-12 w-12 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-all scale-95 group-hover:scale-100 shadow-[0_0_15px_rgba(0,153,255,0.4)] cursor-pointer"
                          >
                            <Play className="h-5 w-5 fill-slate-950 ml-0.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-3 right-3 bg-black/80 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400 border border-zinc-900">
                          {doc.duration}
                        </span>
                      </div>

                      {/* Header tags */}
                      <div className="flex items-center justify-between gap-3 mb-3 font-mono text-[9px] font-bold">
                        <div className="flex gap-2">
                          {doc.tags.map((t, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-cyan-950/20 text-[#0099ff] border border-cyan-800/10 uppercase">
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="text-gray-500">{doc.year}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-extrabold text-white uppercase group-hover:text-cyan-400 transition-colors tracking-tight leading-snug">
                        {doc.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-3.5 text-xs text-gray-400 leading-relaxed font-sans">
                        {doc.desc}
                      </p>
                    </div>

                    {/* Footer / Author metadata */}
                    <div className="mt-6 pt-4 border-t border-gray-900/60 flex items-center justify-between font-mono text-[10px] text-gray-500">
                      <span>{doc.authors}</span>
                      <button
                        onClick={() => handlePlayDoc(doc)}
                        className="text-cyan-400 hover:text-white transition-colors uppercase font-bold text-[9.5px] cursor-pointer"
                      >
                        Reproducir Video &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Institutional Console footer watermark */}
          <div className="border-t border-zinc-900 bg-[#040405] py-6 px-4">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <p className="text-[9px] text-[#52525b] font-mono tracking-wider uppercase leading-relaxed font-semibold">
                Consola Central de Inteligencia Territorial • Cajamarca 2026 • Acceso Autónomo Protegido
              </p>
              <p className="text-[9px] text-[#71717a] font-mono font-semibold uppercase">
                Estrategia Transmedia y Divulgación Ciudadana
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (activeModal === 'academia') {
    const handlePostulationSubmit = (e: FormEvent) => {
      e.preventDefault();
      setIsSubmittingPostulation(true);
      setTimeout(() => {
        setIsSubmittingPostulation(false);
        setPostulantSubmitted(true);
      }, 1500);
    };

    const handleEnrollmentSubmit = (e: FormEvent) => {
      e.preventDefault();
      setIsSubmittingPostulation(true);
      setTimeout(() => {
        setIsSubmittingPostulation(false);
        setPostulantSubmitted(true);
      }, 1500);
    };

    const programsList = [
      {
        id: 'formacion-completa',
        title: 'Programa de Formación Científica y Sociología de Precisión',
        duration: '3 Meses (Semanal)',
        description: 'Capacitación teórico-práctica en metodología científica, formulación de proyectos, redacción de papers indexados y gestión del desarrollo territorial.',
        tools: ['SPSS', 'Zotero', 'Atlas.ti', 'Redacción de Papers'],
        studentPrice: 'S/. 300 total (S/. 100/mes)',
        professionalPrice: 'S/. 600 total (S/. 200/mes)',
        icon: GraduationCap,
        image: '/formacion_cientifica.png'
      },
      {
        id: 'taller-zotero',
        title: 'Taller Práctico de Zotero y Gestores Bibliográficos',
        duration: '2 Sesiones Intensivas',
        description: 'Uso avanzado de Zotero para recopilación, organización, citas automatizadas y referencias bajo normas APA y Vancouver.',
        tools: ['Zotero Desktop', 'Extensiones Web', 'Integración Word/LaTeX'],
        studentPrice: 'S/. 15 total',
        professionalPrice: 'S/. 50 total',
        icon: BookOpen,
        image: '/taller_zotero.png'
      },
      {
        id: 'taller-datos',
        title: 'Taller de Atlas.ti & Análisis Cualitativo Territorial',
        duration: '4 Sesiones Prácticas',
        description: 'Metodologías cualitativas aplicadas, codificación, categorización e interpretación de discursos para prevención de conflictos.',
        tools: ['Atlas.ti 24', 'Minería de Textos', 'Modelado de Redes'],
        studentPrice: 'S/. 25 total',
        professionalPrice: 'S/. 120 total',
        icon: Database,
        image: '/taller_atlas.png'
      }
    ];

    console.log('MODAL ACADEMIA RENDERING NOW');
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999, background: '#000', width: '100vw', height: '100vh', paddingTop: '150px', overflowY: 'auto', color: 'white', display: 'flex', flexDirection: 'column' }}
      >

          {/* Header Back Button */}
          <button
            onClick={() => {
              setPostulantSubmitted(false);
              setPostulantName('');
              setPostulantEmail('');
              setPostulantPhone('');
              setPostulantUniversity('');
              setPostulantMotivation('');
              setPostulantFileLink('');
              setAfiSubView('programs');
              onClose();
            }}
            className="absolute top-28 right-6 sm:top-32 sm:right-10 z-50 flex items-center gap-2 px-4 py-2 bg-[#121214] hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-gray-300 hover:text-white text-xs font-mono tracking-wider uppercase transition-all duration-300 cursor-pointer rounded-none"
          >
            <X className="h-4 w-4" />
            <span>Regresar al Inicio</span>
          </button>

          <div className="flex-1 w-full bg-transparent py-16 px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mx-auto max-w-7xl relative">
              {/* Section Header */}
              <div className="text-left mb-16 relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-px w-8 bg-cyan-500"></span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#0099ff]">
                    Semilleros y Capacidades Locales
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase sm:text-4xl font-sans lg:max-w-3xl leading-[1.1]">
                  Academia de Formación de Investigadores (AFI) • Cajamarca
                </h2>
                <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-200 font-sans font-medium">
                  El Programa AFI del IICS impulsa y capacita a estudiantes universitarios y jóvenes profesionales de Cajamarca en metodologías empíricas y herramientas de ciencia de datos aplicadas a la sociología regional.
                </p>
              </div>

              {/* Sub-view Navigation Tabs / Breadcrumb */}
              {afiSubView !== 'programs' && (
                <div className="mb-6 flex items-center gap-2 text-xs font-mono text-left">
                  <button 
                    onClick={() => { setAfiSubView('programs'); setPostulantSubmitted(false); }}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ACADEMIA AFI
                  </button>
                  <ChevronRight className="h-3 w-3 text-gray-600" />
                  <span className="text-[#0099ff]">
                    {afiSubView === 'postulate' ? 'POSTULACIÓN A BECA AFI' : 'INSCRIPCIÓN A PROGRAMA'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left Column: Dynamic Content based on afiSubView */}
                <div className={`${afiSubView === 'programs' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
                  
                  {afiSubView === 'programs' && (
                    <div className="space-y-6">
                      {/* Role selection toggle bar */}
                      <div className="bg-[#050506] border border-gray-900 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-left">
                          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            Estructura Tarifaria Ajustada
                          </h3>
                          <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                            Selecciona tu rol para visualizar los precios subsidiados según el modelo de sostenibilidad del IICS.
                          </p>
                        </div>
                        <div className="flex gap-2 p-1 bg-black border border-gray-850 rounded-none shrink-0">
                          <button
                            type="button"
                            onClick={() => setAfiUserRole('estudiante')}
                            className={`px-4 py-2 font-mono text-[10px] uppercase font-bold transition-all cursor-pointer rounded-none ${
                              afiUserRole === 'estudiante'
                                ? 'bg-[#0099ff] text-black'
                                : 'text-gray-400 hover:text-white bg-transparent'
                            }`}
                          >
                            Soy Estudiante UNC / Pregrado
                          </button>
                          <button
                            type="button"
                            onClick={() => setAfiUserRole('profesional')}
                            className={`px-4 py-2 font-mono text-[10px] uppercase font-bold transition-all cursor-pointer rounded-none ${
                              afiUserRole === 'profesional'
                                ? 'bg-[#0099ff] text-black'
                                : 'text-gray-400 hover:text-white bg-transparent'
                            }`}
                          >
                            Soy Profesional / Egresado
                          </button>
                        </div>
                      </div>

                      {/* Programs Cards Grid - 3 Column Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {programsList.map((prog) => {
                          const currentPrice = afiUserRole === 'estudiante' ? prog.studentPrice : prog.professionalPrice;
                          return (
                            <div 
                              key={prog.id}
                              className="bg-[#050506] border border-gray-900 hover:border-gray-800 p-5 flex flex-col justify-between gap-5 transition-all duration-300 h-full text-left"
                            >
                              <div className="space-y-4">
                                {/* Top Image */}
                                <div className="h-40 w-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                                  <img 
                                    src={prog.image} 
                                    alt={prog.title} 
                                    className="w-full h-full object-cover" 
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-cyan-500 font-bold border border-cyan-500/20 px-1.5 py-0.5 uppercase">
                                      {prog.duration}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-black text-white font-sans leading-snug">
                                    {prog.title}
                                  </h3>
                                  <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                                    {prog.description}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-4 border-t border-zinc-900 pt-4 mt-auto">
                                {/* Tools badges */}
                                <div className="flex flex-wrap gap-1">
                                  {prog.tools.map((t, idx) => (
                                    <span key={idx} className="text-[8.5px] font-mono bg-zinc-950 text-gray-400 border border-zinc-900 px-1.5 py-0.5">
                                      {t}
                                    </span>
                                  ))}
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Costo de Inversión</span>
                                  <span className="text-lg font-black text-[#0099ff] font-mono">{currentPrice}</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAfiProgram(prog.title);
                                      setAfiSubView('enroll');
                                    }}
                                    className="w-full text-center px-3 py-2.5 bg-[#0099ff] hover:bg-[#0088ee] text-black font-mono text-[9.5px] uppercase font-bold transition-all cursor-pointer"
                                  >
                                    Inscribirse
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAfiProgram(prog.title);
                                      setAfiSubView('postulate');
                                    }}
                                    className="w-full text-center px-3 py-2.5 bg-white hover:bg-gray-100 text-[#0099ff] border border-[#0099ff] font-mono text-[9.5px] uppercase font-bold transition-all cursor-pointer"
                                  >
                                    Postula a nuestras Becas AFI
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {afiSubView === 'postulate' && (
                    <div className="bg-[#050506] border border-gray-900 p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-gray-900 pb-4 text-left">
                        <GraduationCap className="h-5 w-5 text-cyan-400" />
                        <div>
                          <h3 className="text-sm font-extrabold text-white uppercase font-sans">
                            Postulación a Beca de Cobertura Total AFI
                          </h3>
                          <p className="text-[10px] font-mono text-gray-500 uppercase">PROGRAMA: {selectedAfiProgram}</p>
                        </div>
                      </div>

                      {postulantSubmitted ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="py-12 px-4 text-center space-y-4 border border-emerald-500/20 bg-emerald-950/15"
                        >
                          <div className="h-12 w-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto">
                            <Check className="h-6 w-6 stroke-[3]" />
                          </div>
                          <h4 className="text-base font-extrabold text-white uppercase font-sans">
                            ¡Postulación Registrada con Éxito!
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-sans max-w-md mx-auto">
                            Hola <b className="text-white">{postulantName}</b>, hemos guardado tus datos en el buzón central AFI. El comité académico evaluará tu postulación y se comunicará contigo vía WhatsApp o correo electrónico (<span className="text-cyan-400 font-mono">{postulantEmail}</span>) a la brevedad.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPostulantSubmitted(false);
                              setPostulantName('');
                              setPostulantEmail('');
                              setPostulantPhone('');
                              setPostulantUniversity('');
                              setPostulantMotivation('');
                              setPostulantFileLink('');
                              setAfiSubView('programs');
                            }}
                            className="mt-6 text-xs text-cyan-400 font-mono uppercase underline hover:text-white cursor-pointer bg-transparent border-none"
                          >
                            Volver al Catálogo
                          </button>
                        </motion.div>
                      ) : (
                        <form onSubmit={handlePostulationSubmit} className="space-y-4 text-left font-sans text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Nombres y Apellidos Completos
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ej. Juan Pérez Medina"
                                value={postulantName}
                                onChange={(e) => setPostulantName(e.target.value)}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Correo Electrónico
                              </label>
                              <input
                                type="email"
                                required
                                placeholder="Ej. juan.perez@unc.edu.pe"
                                value={postulantEmail}
                                onChange={(e) => setPostulantEmail(e.target.value)}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Número de Celular / WhatsApp
                              </label>
                              <input
                                type="tel"
                                required
                                placeholder="Ej. 987654321"
                                value={postulantPhone}
                                onChange={(e) => setPostulantPhone(e.target.value)}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Universidad y Carrera / Especialidad
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ej. UNC - Sociología / 8vo ciclo"
                                value={postulantUniversity}
                                onChange={(e) => setPostulantUniversity(e.target.value)}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                              Carta de Motivación / Interés en Investigación Social
                            </label>
                            <textarea
                              required
                              rows={4}
                              placeholder="Describe brevemente tu interés en la sociología empírica, qué temas territoriales te apasionan de Cajamarca y por qué deseas ser parte de AFI..."
                              value={postulantMotivation}
                              onChange={(e) => setPostulantMotivation(e.target.value)}
                              className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none resize-none focus:border-cyan-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                              Enlace a Borrador o CV (Opcional)
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. Enlace a Google Drive o LinkedIn..."
                              value={postulantFileLink}
                              onChange={(e) => setPostulantFileLink(e.target.value)}
                              className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                            />
                          </div>

                          <div className="pt-3 border-t border-gray-900 mt-6 text-[10px] text-gray-550 flex items-start gap-1.5 leading-normal">
                            <AlertOctagon className="h-4 w-4 text-[#0099ff] shrink-0 mt-0.5" />
                            <span>Declaro que soy estudiante o egresado residente de la región Cajamarca y los datos consignados son verdaderos.</span>
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="button"
                              onClick={() => setAfiSubView('programs')}
                              className="w-1/3 text-center px-4 py-3 bg-transparent hover:bg-zinc-900 border border-gray-850 text-white font-mono text-[10px] uppercase font-bold transition-all cursor-pointer"
                            >
                              Volver
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingPostulation}
                              className="w-2/3 flex items-center justify-center gap-2 bg-[#0099ff]/10 hover:bg-[#0099ff]/20 text-[#0099ff] border border-[#0099ff]/30 py-3 font-mono text-[10px] uppercase font-bold transition-all cursor-pointer"
                            >
                              {isSubmittingPostulation ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="h-3 w-3 rounded-full border border-cyan-500/20 border-t-cyan-500 animate-spin"></span>
                                  Procesando...
                                </span>
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Enviar Postulación Becaria</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {afiSubView === 'enroll' && (
                    <div className="bg-[#050506] border border-gray-900 p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-gray-900 pb-4 text-left">
                        <PlusCircle className="h-5 w-5 text-cyan-400" />
                        <div>
                          <h3 className="text-sm font-extrabold text-white uppercase font-sans">
                            Formulario de Inscripción Regular
                          </h3>
                          <p className="text-[10px] font-mono text-gray-500 uppercase">PROGRAMA SELECCIONADO: {selectedAfiProgram}</p>
                        </div>
                      </div>

                      {postulantSubmitted ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="py-12 px-4 text-center space-y-4 border border-emerald-500/20 bg-emerald-950/15"
                        >
                          <div className="h-12 w-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto">
                            <Check className="h-6 w-6 stroke-[3]" />
                          </div>
                          <h4 className="text-base font-extrabold text-white uppercase font-sans">
                            ¡Pre-Inscripción Registrada!
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed font-sans max-w-md mx-auto">
                            Hola <b className="text-white">{postulantName}</b>, tu pre-inscripción en <b>{selectedAfiProgram}</b> ha sido recibida con éxito. Te hemos enviado un correo a <span className="text-cyan-400 font-mono">{postulantEmail}</span> con los detalles de pago y accesos temporales a las aulas y licencias de software del IICS.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPostulantSubmitted(false);
                              setPostulantName('');
                              setPostulantEmail('');
                              setPostulantPhone('');
                              setPostulantUniversity('');
                              setPostulantMotivation('');
                              setPostulantFileLink('');
                              setAfiSubView('programs');
                            }}
                            className="mt-6 text-xs text-cyan-400 font-mono uppercase underline hover:text-white cursor-pointer bg-transparent border-none"
                          >
                            Volver al Catálogo
                          </button>
                        </motion.div>
                      ) : (
                        <form onSubmit={handleEnrollmentSubmit} className="space-y-4 text-left font-sans text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Nombres y Apellidos Completos
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ej. Juan Pérez Medina"
                                value={postulantName}
                                onChange={(e) => setPostulantName(e.target.value)}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Correo Electrónico
                              </label>
                              <input
                                type="email"
                                required
                                placeholder="Ej. juan.perez@unc.edu.pe"
                                value={postulantEmail}
                                onChange={(e) => setPostulantEmail(e.target.value)}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Número de Celular / WhatsApp
                              </label>
                              <input
                                type="tel"
                                required
                                placeholder="Ej. 987654321"
                                value={postulantPhone}
                                onChange={(e) => setPostulantPhone(e.target.value)}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9.5px] font-mono font-bold text-gray-500 uppercase block">
                                Modalidad Tarifaria Aplicable
                              </label>
                              <select
                                value={afiUserRole}
                                onChange={(e) => setAfiUserRole(e.target.value as 'estudiante' | 'profesional')}
                                className="w-full bg-black border border-gray-800 p-3 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                              >
                                <option value="estudiante">Tarifa Estudiante (Subsidiada por el IICS)</option>
                                <option value="profesional">Tarifa Profesional / General</option>
                              </select>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-900 mt-6 text-[10px] text-gray-550 flex items-center justify-between">
                            <span>Monto de Arancel a abonar:</span>
                            <span className="text-base font-black text-[#0099ff] font-mono">
                              {afiUserRole === 'estudiante' 
                                ? (selectedAfiProgram.includes('Taller') ? (selectedAfiProgram.includes('Zotero') ? 'S/. 15 total' : 'S/. 25 total') : 'S/. 300 total')
                                : (selectedAfiProgram.includes('Taller') ? (selectedAfiProgram.includes('Zotero') ? 'S/. 50 total' : 'S/. 120 total') : 'S/. 600 total')
                              }
                            </span>
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="button"
                              onClick={() => setAfiSubView('programs')}
                              className="w-1/3 text-center px-4 py-3 bg-transparent hover:bg-zinc-900 border border-gray-850 text-white font-mono text-[10px] uppercase font-bold transition-all cursor-pointer"
                            >
                              Volver
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingPostulation}
                              className="w-2/3 flex items-center justify-center gap-2 bg-[#0099ff] hover:bg-[#0088ee] text-black py-3 font-mono text-[10px] uppercase font-bold transition-all cursor-pointer"
                            >
                              {isSubmittingPostulation ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="h-3 w-3 rounded-full border border-black/20 border-t-black animate-spin"></span>
                                  Procesando...
                                </span>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Confirmar Pre-Inscripción</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: AFI Benefits and Info */}
                {afiSubView !== 'programs' && (
                  <div className="lg:col-span-4 bg-[#050506] border border-gray-900 p-6 space-y-6">
                    <div className="flex items-center gap-2 text-left">
                      <FileText className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Beneficios de la Beca AFI 2026
                      </h4>
                    </div>

                    <div className="space-y-4 font-sans text-xs text-gray-400 text-left">
                      <p className="leading-relaxed text-[11.5px]">
                        El programa AFI brinda un soporte integral para forjar la próxima generación de investigadores sociales independientes en el norte peruano.
                      </p>

                      <div className="divide-y divide-zinc-900 space-y-3 pt-2 text-left">
                        <div className="pt-2">
                          <span className="block text-gray-500 font-mono font-bold uppercase text-[9px]">Mentoría de Rigor:</span>
                          <span className="text-white text-[11.5px] mt-0.5 block leading-relaxed">
                            Tutoría y acompañamiento directo por parte del **Dr. Jaime Abanto Padilla** (Director del Instituto e investigador RENACYT - CONCYTEC).
                          </span>
                        </div>

                        <div className="pt-3">
                          <span className="block text-gray-550 font-mono font-bold uppercase text-[9px]">Soporte Instrumental Avanzado:</span>
                          <span className="text-white text-[11.5px] mt-0.5 block leading-relaxed">
                            Acceso a licencias y servidores compartidos para análisis cualitativo en **Atlas.ti** y clústeres de computación para procesamiento de lenguaje natural (NLP).
                          </span>
                        </div>

                        <div className="pt-3">
                          <span className="block text-gray-550 font-mono font-bold uppercase text-[9px]">Financiamiento Editorial:</span>
                          <span className="text-white text-[11.5px] mt-0.5 block leading-relaxed">
                            Apoyo financiero para cubrir los costos de procesamiento de artículos (APC) en revistas indexadas en las bases **Scopus** y **SciELO**.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-900 bg-[#050506] p-4 text-[10px] text-gray-500 flex items-start gap-2 leading-relaxed text-left">
                      <AlertTriangle className="h-4.5 w-4.5 text-[#0099ff] shrink-0 mt-0.5" />
                      <span>Las becas de apoyo económico se asignan semestralmente bajo estricto orden de mérito y consistencia en los informes de investigación de campo.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Institutional Console footer watermark */}
          <div className="border-t border-zinc-900 bg-[#040405] py-6 px-4">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <p className="text-[9px] text-[#52525b] font-mono tracking-wider uppercase leading-relaxed font-semibold">
                Consola Central de Inteligencia Territorial • Cajamarca 2026 • Acceso Autónomo Protegido
              </p>
              <p className="text-[9px] text-[#71717a] font-mono font-semibold uppercase">
                Semillero de Talentos IICS - UNC
              </p>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
