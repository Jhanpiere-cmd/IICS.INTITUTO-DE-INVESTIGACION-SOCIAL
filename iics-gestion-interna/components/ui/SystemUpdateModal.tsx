import React, { useState, useEffect } from 'react';
import { 
  X,
  Zap,
  ChevronLeft,
  ChevronRight,
  Target,
  Sparkles,
  Command,
  Mail,
  FileText,
  UserCheck,
  Globe,
  Monitor,
  Share2,
  Calendar,
  Trophy,
  ShieldCheck,
  Cpu,
  Tv,
  MessageSquare
} from 'lucide-react';

interface SlideContent {
    id: number;
    section: string;
    title: string;
    description: string;
    details: string[];
    icon: React.ReactNode;
    color: string;
    accent: string;
    image?: string;
}

export const SystemUpdateModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  // v16: Representaciones Visuales en Código (Tech Icons & Animations)
  // v20: Agentic Total Expansion
  const STORAGE_KEY = 'acs_agentic_total_v22'; 

  const slides: SlideContent[] = [
    {
        id: 0,
        section: "ESTABILIDAD DEL SISTEMA",
        title: "ACS 2.0: ESTABILIDAD TOTAL",
        description: "Hemos corregido errores críticos y unificado el diseño Executive Drive.",
        icon: <Zap className="w-40 h-40 text-blue-500 animate-pulse" />,
        details: [
            "Bugs Críticos: Solucionados para una experiencia fluida y sin bloqueos.",
            "Paridad Visual: Estándar industrial aplicado en todos los módulos.",
            "Rendimiento: Optimización profunda en la carga y renderizado de datos."
        ],
        color: "from-blue-600/20 to-black",
        accent: "text-blue-500"
    },
    {
        id: 1,
        section: "SECCIÓN DE ASISTENTES",
        title: "HOYR: ACCESO TOTAL",
        description: "HOYR ha sido actualizado con acceso total y es plenamente agéntico.",
        icon: <Cpu className="w-40 h-40 text-blue-400 animate-pulse" />,
        details: [
            "Acceso Agéntico: Inspección y acción en cada módulo.",
            "Gestión Documental: Crea documentos Word (.docx) nativos.",
            "Automatización: Envía correos de tareas a cada usuario.",
            "Asistente Proactivo: Envío autónomo de emails desde HOYR."
        ],
        color: "from-blue-600/20 to-black",
        accent: "text-blue-400"
    },
    {
        id: 2,
        section: "GESTIÓN AUDIOVISUAL",
        title: "SALA DIGITAL & REDES",
        description: "Publicación nativa en FB/IG directamente desde el sistema ACS.",
        icon: <Share2 className="w-40 h-40 text-pink-400 animate-bounce-slow" />,
        details: [
            "Social Posting: Publica en FB/IG desde el sistema.",
            "WhatsApp: Sistema informativo en implementación.",
            "Gestión Email: Ejecución de acciones directo por correo."
        ],
        color: "from-pink-600/20 to-black",
        accent: "text-pink-400"
    },
    {
        id: 3,
        section: "LOGÍSTICA DE EVENTOS",
        title: "PROYECTOR & PANEL",
        description: "Control absoluto visual con soporte multimedia avanzado.",
        icon: <Tv className="w-40 h-40 text-amber-400" />,
        details: [
            "Soporte Multimedia: Visualiza PPTX y PDF en el proyector.",
            "Precisión: Ajuste de tiempo al milímetro para moderadores.",
            "Panel Táctico: Control optimizado para eventos en vivo."
        ],
        color: "from-amber-600/20 to-black",
        accent: "text-amber-400"
    },
    {
        id: 4,
        section: "AWARDS NEXUS",
        title: "CERTIFICADOS DIGITALES MASIVOS",
        description: "Generación automática y masiva de certificados para ponentes y asistentes.",
        icon: <Trophy className="w-40 h-40 text-emerald-400" />,
        details: [
            "Envío Automatizado: Despacho de correos electrónicos con el PDF adjunto.",
            "Firmas Digitales: Inserción segura de firmas de ponentes y coordinadores.",
            "Plantillas de Marca: Diseños unificados bajo el estándar ejecutivo de la revista ACS."
        ],
        color: "from-emerald-600/20 to-black",
        accent: "text-emerald-400"
    },
    {
        id: 5,
        section: "SEGURIDAD Y ACCESO",
        title: "LOGIN CON GOOGLE",
        description: "Implementación oficial de Single Sign-On mediante Google.",
        icon: <ShieldCheck className="w-40 h-40 text-slate-400" />,
        details: [
            "Google Login: Acceso corporativo seguro y unificado.",
            "ACS Workspace: Herramientas colaborativas en refinamiento."
        ],
        color: "from-slate-600/20 to-black",
        accent: "text-slate-400"
    },
    {
        id: 6,
        section: "MARKETING INTELIGENTE",
        title: "PLANIFICADOR DE CONTENIDOS IA",
        description: "Planificador táctico de redes sociales asistido por inteligencia artificial.",
        icon: <Sparkles className="w-40 h-40 text-blue-500 animate-pulse" />,
        details: [
            "Orquestación Total: Lee eventos de SGR, días festivos y artículos de la revista UNC.",
            "Persistencia en Supabase: Almacenamiento seguro en la nube para trabajo colaborativo.",
            "Visualización Unificada: Parrilla interactiva con copies, fechas y temas estratégicos."
        ],
        color: "from-blue-600/20 to-black",
        accent: "text-blue-500"
    },
    {
        id: 7,
        section: "DISEÑO INSTITUCIONAL",
        title: "GENERADOR DE FLYERS IA MEJORADO",
        description: "Creación de borradores visuales en tiempo real alineados al Manual de Marca.",
        icon: <Monitor className="w-40 h-40 text-amber-500 animate-bounce-slow" />,
        details: [
            "Manual de Marca ACS: Prompts adaptados con paleta azul (#153ABF), dorado y blanco.",
            "Visualización Interactiva: Esqueleto de carga en tiempo real que previsualiza el flyer.",
            "Conectividad Estable: Soporte de proxies para evitar bloqueos de CORS (Cloudflare/Hugging Face)."
        ],
        color: "from-amber-600/20 to-black",
        accent: "text-amber-500"
    }
  ];

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain || currentSlide === slides.length - 1) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const current = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 bg-black/99 backdrop-blur-3xl animate-in fade-in duration-500">
      
      {/* Marco Táctico (Layout Adaptativo: evita cortes de texto) */}
      <div className="relative w-full max-w-5xl bg-black border border-white/20 flex flex-col md:flex-row shadow-[0_0_150px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 rounded-none border-l-4 border-l-exec-blue min-h-[480px] max-h-[90vh] overflow-hidden">
        
        {/* PANEL IZQUIERDO: Representación Visual en Código */}
        <div className="md:w-5/12 relative flex-shrink-0 overflow-hidden border-r border-white/10 hidden md:block bg-[#020202]">
            {/* Grid Tecnológico de Fondo */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            {/* Efecto de Escaneo */}
            <div className="absolute top-0 left-0 w-full h-1 bg-white/20 blur-sm animate-scan" />

            <div className={`absolute inset-0 bg-gradient-to-t ${current.color} mix-blend-screen opacity-50`} />
            
            <div className="absolute inset-0 flex items-center justify-center z-0">
                <div className="relative">
                    {/* Aura de Destello */}
                    <div className={`absolute inset-0 blur-[60px] rounded-full opacity-40 scale-150 ${current.accent.replace('text-', 'bg-')}`} />
                    {current.icon}
                </div>
            </div>

            <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                <div>
                   <div className="w-10 h-1 bg-white mb-4" />
                    <h5 className={`text-[9px] font-black tracking-[0.5em] uppercase mb-2 ${current.accent}`}>
                        {current.section}
                    </h5>
                    <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-tighter uppercase italic select-none">
                        {current.title}
                    </h2>
                </div>

                <div className="flex items-end justify-between">
                    <span className="text-white text-xl font-black tracking-widest border-b-2 border-exec-blue pb-1">0{currentSlide + 1}</span>
                    <Sparkles className="w-5 h-5 text-white/40" />
                </div>
            </div>
        </div>

        {/* PANEL DERECHO: Layout Condensado */}
        <div className="md:w-7/12 bg-black flex flex-col rounded-none overflow-hidden h-full">
            
            {/* Header / Botón Cerrar */}
            <div className="flex justify-end p-2 flex-shrink-0">
                <button 
                    onClick={handleClose}
                    className="p-2 text-white/30 hover:text-white transition-all bg-white/5 border border-white/10"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* AREA DE CONTENIDO (Scrollable para evitar cortes) */}
            <div className="flex-1 p-6 md:px-10 md:py-4 flex flex-col justify-center overflow-y-auto custom-scrollbar">
                
                <header className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-3 bg-exec-blue" />
                        <span className="text-[9px] font-black tracking-[0.4em] text-white/40 uppercase">DATA_AUDIT // {current.section}</span>
                    </div>
                    <p className="text-lg md:text-xl text-white font-black leading-tight tracking-tight uppercase border-l-2 border-white/20 pl-4">
                        {current.description}
                    </p>
                </header>

                <div className="space-y-3">
                    {current.details.map((detail, idx) => (
                        <div key={idx} className="flex gap-4 items-center group">
                            <div className={`w-4 h-0.5 flex-shrink-0 ${current.accent.replace('text-', 'bg-')}`} />
                            <p className="text-[clamp(0.85rem,1.6vh,1.05rem)] text-white/90 font-bold tracking-tight">
                                {detail}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* FOOTER (Compacto y en flujo) */}
            <div className="flex-shrink-0 p-6 md:px-10 md:pb-8 pt-4 bg-black border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,1)]">
                <div className="flex flex-col gap-5">
                    
                    <label className="flex items-center gap-3 cursor-pointer group w-fit">
                        <input 
                            type="checkbox" 
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="sr-only"
                        />
                        <div className={`w-5 h-5 border-2 transition-all flex items-center justify-center ${dontShowAgain ? 'bg-white border-white' : 'border-white/30 group-hover:border-white'}`}>
                            {dontShowAgain && <Target className="w-3.5 h-3.5 text-black" />}
                        </div>
                        <span className="text-white/40 font-black text-[9px] uppercase tracking-[0.2em] group-hover:text-exec-blue transition-all">
                            ARCHIVAR AUDITORÍA
                        </span>
                    </label>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                             {slides.map((_, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setCurrentSlide(i)}
                                    className={`h-1 transition-all duration-300 ${i === currentSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/20'}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                className={`p-2 transition-all ${currentSlide === 0 ? 'opacity-0 pointer-events-none' : 'text-white/40 hover:text-white'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            
                            {currentSlide < slides.length - 1 ? (
                                <button 
                                    onClick={() => setCurrentSlide(prev => prev + 1)}
                                    className="bg-white px-8 py-3 text-black font-black text-[10px] tracking-[0.15em] uppercase hover:bg-exec-blue hover:text-white transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    SIGUIENTE
                                </button>
                            ) : (
                                <button 
                                    onClick={handleClose}
                                    className="bg-exec-blue px-10 py-3 text-white font-black text-[10px] tracking-[0.15em] uppercase hover:bg-white hover:text-black transition-all shadow-[0_0_40px_rgba(59,130,246,0.3)]"
                                >
                                    INGRESAR
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          from { transform: translateY(0); }
          to { transform: translateY(520px); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
      `}</style>
    </div>
  );
};
