import { useState } from 'react';
import { 
  Shield, 
  Zap, 
  Heart, 
  Target, 
  ArrowRight, 
  GraduationCap, 
  Atom, 
  User, 
  Quote, 
  Check, 
  Cpu, 
  Sparkles, 
  Network 
} from 'lucide-react';
import { motion } from 'motion/react';

interface AboutValuesProps {
  onLearnMoreClick: () => void;
  isSubPage?: boolean;
}

export default function AboutValues({ onLearnMoreClick, isSubPage = false }: AboutValuesProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredPillar, setHoveredPillar] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'promotor' | 'academico'>('all');

  const values = [
    {
      id: 'rig-cient',
      icon: Shield,
      title: 'Rigor científico',
      desc: 'Metodología sociológica pura con filtros estadísticos robustos y ética analítica para salvaguardar la veracidad.',
      color: 'from-[#050508]/65 to-black',
      accent: 'border-zinc-900/80 hover:border-cyan-500/30'
    },
    {
      id: 'innov-val',
      icon: Zap,
      title: 'Innovación de Datos',
      desc: 'Ciencia de datos avanzada, NLP, raspado semántico y análisis espacial al servicio del entendimiento territorial.',
      color: 'from-[#050508]/65 to-black',
      accent: 'border-zinc-900/80 hover:border-cyan-500/30'
    },
    {
      id: 'comp-soc',
      icon: Heart,
      title: 'Compromiso Autónomo',
      desc: 'Investigamos de forma libre y neutral. Concebimos la ciencia social como un motor para el bienestar de la sociedad civil.',
      color: 'from-[#050508]/65 to-black',
      accent: 'border-zinc-900/80 hover:border-cyan-500/30'
    },
    {
      id: 'pert-val',
      icon: Target,
      title: 'Pertinencia Sostenible',
      desc: 'Creación de información accionable para tomadores de decisiones reales, reduciendo asimetrías de información.',
      color: 'from-[#050508]/65 to-black',
      accent: 'border-zinc-900/80 hover:border-cyan-500/30'
    }
  ];

  // Team Coordinates for interactive network visualizer
  const nodes = [
    { id: 'iics', label: 'IICS Autónomo', role: 'Núcleo Científico', x: 200, y: 200, size: 26, color: '#0099ff', category: 'core' },
    { id: 'edwar', label: 'Edwar Saenz', role: 'CEO / Fundador', x: 100, y: 130, size: 21, color: '#c084fc', category: 'fundadores' },
    { id: 'henry', label: 'Henry Díaz', role: 'Co-Fundador / Directivo', x: 300, y: 130, size: 20, color: '#60a5fa', category: 'fundadores' },
    { id: 'mendoza', label: 'M. Cs. Juan R. Mendoza', role: 'Investigador RENACYT', x: 100, y: 270, size: 19, color: '#34d399', category: 'cuerpo' },
    { id: 'tejada', label: 'Luis Tejada', role: 'Docente Investigador', x: 300, y: 270, size: 18, color: '#34d399', category: 'cuerpo' },
    { id: 'becerra', label: 'Luis Becerra', role: 'Sociología Territorial', x: 200, y: 320, size: 18, color: '#34d399', category: 'cuerpo' },
    { id: 'estudiantes', label: 'Estudiantes IICS', role: 'Soporte de Inteligencia', x: 200, y: 70, size: 16, color: '#fbbf24', category: 'operativo' }
  ];

  const connections = [
    { from: 'iics', to: 'edwar' },
    { from: 'iics', to: 'henry' },
    { from: 'iics', to: 'mendoza' },
    { from: 'iics', to: 'tejada' },
    { from: 'iics', to: 'becerra' },
    { from: 'edwar', to: 'henry' },
    { from: 'edwar', to: 'estudiantes' },
    { from: 'henry', to: 'estudiantes' },
    { from: 'mendoza', to: 'tejada' },
    { from: 'tejada', to: 'becerra' },
    { from: 'mendoza', to: 'becerra' }
  ];

  // Simulated Team Members List with High Quality Photo URLs and professional summaries
  const teamMembers = [
    {
      id: 'edwar',
      name: 'Edwar Jhanpiere Saenz Tello',
      role: 'CEO, Fundador e Ideas',
      category: 'promotor',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=400',
      desc: 'Estudiante del 5° ciclo de Sociología (UNC), tecnólogo de desarrollo frontend/backend graduado en IDAT y CEO de Zolexy Solutions. Une la ciencia social pura del norte andino con arquitecturas de procesamiento y software del siglo XXI.',
      tag: 'Ciencia de Datos & Desarrollo',
      highlight: 'Soporte DevOps & Lógica Semántica',
      academicTitle: 'Ideador Central de la Consola',
      focus: 'Democratización de la información territorial y el software de alta escala para Cajamarca.'
    },
    {
      id: 'henry',
      name: 'Henry Díaz Bueno',
      role: 'Director Co-Fundador',
      category: 'promotor',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
      desc: 'Destacado estudiante del 9° ciclo de Sociología en la Universidad Nacional de Cajamarca. Experto en planeamiento de muestreo rural, recolección analítica, resolución de conflictos y comprometido con reducir asimetrías de información.',
      tag: 'Metodología Rural & Diagnóstico',
      highlight: 'Liderazgo de Muestreo de Campo',
      academicTitle: 'Supervisor de Consistencia Territorial',
      focus: 'Establecimiento de metodologías de campo y de confianza mutua con organizaciones vecinales.'
    },
    {
      id: 'mendoza',
      name: 'M. Cs. Juan Romelio Mendoza',
      role: 'Docente UNC • Investigador RENACYT',
      category: 'academico',
      avatar: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&q=80&w=400&h=400',
      desc: 'Líder académico de gran notoriedad científica en Cajamarca. Ha asumido el rol de Consejero Metodológico Central del IICS, garantizando el filtro por pares e institucionalidad sociológica clásica.',
      tag: 'Asesoría Principal RENACYT',
      highlight: 'Validación Epistémica Clásica',
      academicTitle: 'Presidente del Comité Consejero',
      focus: 'Validación robusta de modelos socioeconómicos y auditoría metodológica de los estudios.'
    },
    {
      id: 'tejada',
      name: 'Luis Tejada',
      role: 'Docente e Investigador UNC',
      category: 'academico',
      avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=400&h=400',
      desc: 'Docente de la Facultad de Ciencias Sociales de la UNC. Facilita los programas de capacitación continua del IICS y vincula el ímpetu de los semilleros juveniles con esquemas teóricos validados.',
      tag: 'Estructuración y Enlace UNC',
      highlight: 'Coordinador de Semilleros Científicos',
      academicTitle: 'Consejero de Enlace Académico',
      focus: 'Análisis crítico de coyuntura regional y asimetrías sociales.'
    },
    {
      id: 'becerra',
      name: 'Luis "Lucho" Becerra',
      role: 'Especialista en Sociología Rural',
      category: 'academico',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=400',
      desc: 'Especialista con amplio recorrido en dinámica rural, cuencas andinas y asimetría de asentamientos en el norte del país. Brinda asesoría en el diseño de alertas sociales de impacto.',
      tag: 'Diagnóstico Rural & Cuencas',
      highlight: 'Modelado Social del Espacio',
      academicTitle: 'Asesor del Laboratorio de Conflictos',
      focus: 'Diagnóstico situacional de cuencas de Cajamarca y preservación de saberes campesinos.'
    }
  ];

  // Filtered members list based on current tab selection
  const filteredMembers = teamMembers.filter(member => {
    if (filterCategory === 'all') return true;
    return member.category === filterCategory;
  });

  return (
    <section id="sobre-el-iics" className={`${isSubPage ? 'pt-2 sm:pt-4 pb-20' : 'py-24'} bg-black border-t border-zinc-950 relative overflow-hidden`}>
      
      {/* Absolute Ambient Background Visuals */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-cyan-950/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 h-96 w-96 rounded-full bg-purple-950/5 blur-[130px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Section Header */}
        <div className="text-center md:text-left mb-10 border-b border-zinc-900 pb-6">
          <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest leading-none">
            IICS • BIOGRAFÍA, EQUIPO & VISIÓN NO REFORMISTA
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-2 font-sans">
            Quiénes Somos e Identidad Autónoma
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 max-w-4xl leading-relaxed mt-3 font-sans font-medium">
            Conozca de forma integrada la historia que forjó el Instituto de Investigación Científica Social. 
            Al romper las trabas burocráticas, establecemos un enfoque basado puramente en aportar valor antes de pensar en la recompensa monetaria.
          </p>
        </div>

        {/* VERTICAL CASCADE CARD SYSTEM */}
        <div className="space-y-16">

          {/* CARD 1: HISTORIA Y AUTONOMÍA (LA RUPTURA) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-b border-zinc-900/40 pb-12 last:border-0 last:pb-0">
            {/* TEXT SIDE */}
            <div className="lg:col-span-6 space-y-4 text-left">
              <span className="text-[10px] font-mono text-purple-400 tracking-widest uppercase font-black block">
                Nuestra Historia
              </span>
              
              <h3 className="text-2xl font-black text-white tracking-tight font-sans">
                La Ruptura Científica con la Burocracia
              </h3>
              
              <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
                <p className="font-sans">
                  La semilla del IICS fue sembrada por <strong>Edwar Jhanpiere Saenz Tello</strong> (CEO de Zolexy Solutions, estudiante del 5 ciclo de Sociología en la UNC y Tecnólogo de Desarrollo Frontend/Backend en IDAT). Tras participar activamente en círculos de investigación tradicionales, experimentó en primera persona las insalvables trabas burocráticas, el estancamiento metodológico y el poco interés de los estamentos comunes por agilizar los datos de impacto.
                </p>

                <p className="font-sans">
                  Presentar esta propuesta al Consejo de Facultad o al Consejo Universitario implicaba someter un proyecto de vanguardia a filtros politizados que tardarían meses o años en aprobarse. Por ello, se tomó la decisión crucial de forjar una <strong>corporación autónoma, independiente y libre</strong> como vehículo idóneo de impacto social directo.
                </p>

                {/* Beautiful quote card focused purely on academic and economic vision */}
                <div className="text-xs text-zinc-300 p-5 bg-[#09090b]/80 border border-zinc-900/50 rounded-none relative overflow-hidden backdrop-blur-sm shadow-inner group">
                  <div className="relative z-10 flex gap-3 text-left">
                    <Quote className="h-5 w-5 text-cyan-450 flex-shrink-0 opacity-40" />
                    <p className="italic font-medium leading-relaxed text-zinc-300">
                      "El enfoque es simple: la economía se rige por valor, y el valor precede a la recompensa financiera. Al dotar de conocimiento útil, preciso y científico al norte andino antes de pensar en rédito comercial, logramos democratizar la sociología de precisión de manera sostenible."
                    </p>
                  </div>
                </div>

                <p className="font-sans">
                  A esta iniciativa autónoma se unió con devoción <strong>Henry Díaz Bueno</strong>, destacado estudiante del noveno ciclo de Sociología (UNC), quien coincidió en la apremiante necesidad de levantar metodologías de ciencia de datos del siglo XXI de manera ágil y con un compromiso incorruptible con la verdad territorial de Cajamarca.
                </p>
              </div>
            </div>

            {/* VISUAL SIDE: COMPARATIVE PATHS CHART */}
            <div className="lg:col-span-6 flex flex-col justify-between relative p-6 sm:p-8 bg-zinc-950/40 border border-zinc-900/80 rounded-none overflow-hidden group min-h-[380px]">
              <div className="absolute inset-0 bg-[#040406] bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />
              
              <div className="text-left">
                <h4 className="text-xs font-mono font-bold text-zinc-400 tracking-wider uppercase mb-5">
                  Análisis Comparativo de Ejecución e Impacto
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* TRADITIONAL COLUMN */}
                  <div className="border border-zinc-900 bg-black/60 p-4 space-y-4 rounded-none">
                    <span className="text-[9px] font-mono font-extrabold text-zinc-505 tracking-wider block uppercase">Ruta Institucional Clásica</span>
                    
                    <div className="space-y-2">
                      <div className="p-2.5 bg-zinc-900/40 border border-zinc-905 text-[10.5px] text-zinc-500 text-left rounded-none">
                        <span className="font-mono text-[8px] block text-zinc-600 font-bold">FASE 01 / Traba Burocrática</span>
                        Filtros de aprobación en comisiones políticas. Demora de 6 a 12 meses.
                      </div>
                      <div className="p-2.5 bg-zinc-900/40 border border-zinc-905 text-[10.5px] text-zinc-500 text-left rounded-none">
                        <span className="font-mono text-[8px] block text-zinc-600 font-bold">FASE 02 / Estancamiento</span>
                        Estructuras metodológicas rígidas basadas en cuotas burocráticas fatigadas.
                      </div>
                      <div className="p-2.5 bg-zinc-900/40 border border-zinc-905 text-[10.5px] text-zinc-500 text-left rounded-none">
                        <span className="font-mono text-[8px] block text-zinc-650 font-bold">FASE 03 / Nulo Impacto</span>
                        Publicaciones archivadas sin retorno real a la comunidad.
                      </div>
                    </div>
                  </div>

                  {/* IICS COLUMN */}
                  <div className="border border-cyan-950/40 bg-cyan-950/5 p-4 space-y-4 rounded-none">
                    <span className="text-[9px] font-mono font-extrabold text-cyan-400 tracking-wider block uppercase">Ruta Autónoma IICS</span>
                    
                    <div className="space-y-2">
                      <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/15 text-[10.5px] text-zinc-350 text-left rounded-none">
                        <span className="font-mono text-[8px] block text-cyan-400 font-bold">FASE 01 / Acción Inmediata</span>
                        Fundulación ágil para desplegar encuestas y mapas de inmediato.
                      </div>
                      <div className="p-2.5 bg-[#0099ff]/5 border border-[#0099ff]/20 text-[10.5px] text-zinc-300 text-left rounded-none">
                        <span className="font-mono text-[8px] block text-[#0099ff] font-bold">FASE 02 / Rigor Epistémico</span>
                        Validación y arbitraje metodológico inmediato por doctores RENACYT directos.
                      </div>
                      <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/15 text-[10.5px] text-zinc-350 text-left rounded-none">
                        <span className="font-mono text-[8px] block text-cyan-400 font-bold">FASE 03 / Retorno de Valor</span>
                        Consolas de datos libres en tiempo récord para la sociedad civil.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-900/60 text-center w-full">
                <p className="text-[9px] font-mono tracking-wide text-zinc-500 uppercase">
                  Esquema de transición de la investigación social andina
                </p>
              </div>
            </div>
          </div>

          {/* DYNAMIC COMBINED TEAM SECTION - GRID & CAROUSEL DECK WITH PHOTOGRAPHS */}
          <div className="border-b border-zinc-900/40 pb-12 last:border-0 last:pb-0">
            
            {/* Header of the Team Presentation Block */}
            <div className="text-left mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase font-black block mb-2">
                  REPOSITORIO DE INTEGRANTES
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight font-sans">
                  Biografías y Galería del Equipo
                </h3>
                <p className="text-zinc-400 text-xs max-w-xl leading-relaxed mt-1 font-sans font-medium">
                  Explora el trasfondo y la fotografía de cada promotor científico del IICS Autónomo en esta gallery analítica vertical.
                </p>
              </div>

              {/* Filter Tabs - NO VERTICAL LINES - CLEAN GLOWING LAYOUT */}
              <div className="flex bg-[#070709] border border-zinc-800 p-1.5 rounded-none self-start md:self-auto">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'promotor', label: 'Fundadores / Directivos' },
                  { id: 'academico', label: 'Cuerpo Académico' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setFilterCategory(tab.id as any);
                    }}
                    className={`px-3 py-1.5 text-[9.5px] font-mono font-bold tracking-wider uppercase transition-all duration-300 rounded-none cursor-pointer ${
                      filterCategory === tab.id
                        ? 'bg-[#0099ff] text-black shadow-lg font-black'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN PRESENTATION SECTION - HORIZONTAL CARDS STREAM LIST (SHARP BLACK/CYAN THEME) */}
            <div className="space-y-8 mt-6">
              {filteredMembers.map((member, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div 
                    key={member.id} 
                    className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-zinc-900 bg-[#050508]/40 hover:border-zinc-805 transition-all duration-300 rounded-none items-stretch overflow-hidden"
                  >
                    {/* INFO COLUMN: DETAILED INFO (7 grid slots) - NO ROUNDED CORNERS */}
                    <div className={`lg:col-span-7 bg-[#050508]/60 p-4 md:p-6 flex flex-col justify-between relative overflow-hidden group ${isEven ? 'lg:order-1' : 'lg:order-2 border-t lg:border-t-0 lg:border-l border-zinc-900'}`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.015] to-transparent pointer-events-none" />
                      
                      {/* HUD Header */}
                      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2.5 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-cyan-400" />
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black">
                            {member.category === 'promotor' ? 'FUNDADOR / DIRECTIVO' : 'CUERPO ACADÉMICO'}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-655">ID: IICS_{member.id.toUpperCase()}</span>
                      </div>

                      {/* Main Biography content */}
                      <div className="space-y-4 flex-1 text-left">
                        <div>
                          <span className="text-[8px] font-mono font-bold uppercase py-0.5 px-2.5 bg-cyan-950/40 text-[#0099ff] border border-cyan-500/20 inline-block mb-3 rounded-none">
                            {member.academicTitle}
                          </span>
                          <h4 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight font-sans">
                            {member.name}
                          </h4>
                          <p className="text-[10px] font-mono font-bold text-[#0099ff] tracking-widest uppercase mt-1">
                            {member.role}
                          </p>
                        </div>

                        <div className="p-4 bg-zinc-950/60 border border-zinc-900/40 rounded-none leading-relaxed text-zinc-300 text-xs md:text-sm">
                          {member.desc}
                        </div>

                        {/* Core contribution segment - NO vertical line, elegant light check frame */}
                        <div className="p-4 bg-gradient-to-r from-zinc-950/80 to-transparent border-l-2 border-[#0099ff] rounded-none">
                          <div className="flex items-start gap-3 justify-start text-left">
                            <div className="h-5 w-5 bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 flex items-center justify-center flex-shrink-0 rounded-none mt-0.5">
                              <Check className="h-3 w-3" />
                            </div>
                            <div>
                              <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-wider block">FOCO DE IMPACTO</span>
                              <p className="text-xs text-zinc-350 leading-relaxed font-sans font-medium mt-0.5">
                                <strong>{member.highlight}:</strong> {member.focus}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info footer metadata */}
                      <div className="mt-4 border-t border-zinc-900/60 pt-3 flex items-center justify-between font-mono text-[8px] text-zinc-500 uppercase">
                        <div>Especialidad: <span className="text-zinc-450 font-bold">{member.tag}</span></div>
                        <div className="text-cyan-500/85">IICS_NATIVE</div>
                      </div>
                    </div>

                    {/* PHOTO COLUMN: LARGE PORTRAIT (5 grid slots) - NO ROUNDED CORNERS */}
                    <div className={`lg:col-span-5 flex flex-col justify-center relative overflow-hidden group ${isEven ? 'lg:order-2 border-t lg:border-t-0 lg:border-l border-zinc-900' : 'lg:order-1'}`}>
                      <div className="bg-[#050508]/85 p-4 flex flex-col justify-between h-full relative rounded-none min-h-[290px]">
                        
                        {/* Grid background on image panel */}
                        <div className="absolute inset-0 bg-[#040406] bg-[radial-gradient(#1a1a20_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                        {/* Category Academic Indicator */}
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 font-mono text-[7px] text-cyan-400 select-none bg-black/85 px-2.5 py-1 border border-zinc-900 leading-none z-20 rounded-none uppercase font-bold">
                          <span>{member.category === 'promotor' ? 'FUNDACIÓN / DIRECTIVO' : 'CONSEJO ACADÉMICO'}</span>
                        </div>

                        <div className="absolute top-4 right-4 text-right font-mono text-[7px] text-zinc-500 leading-tight select-none z-20">
                          <span>IICS DOC v_ {index + 1}</span>
                        </div>

                        {/* PORTRAIT CONTAINER WITH ABSOLUTE CORNERS and animation */}
                        <div className="relative w-full aspect-square max-w-[260px] sm:max-w-[300px] md:max-w-[320px] mx-auto bg-zinc-950 border border-zinc-850/80 relative overflow-hidden flex-1 flex items-center justify-center my-4 group/img shadow-2xl rounded-none">
                          <img
                             src={member.avatar}
                             alt={member.name}
                             referrerPolicy="no-referrer"
                             className="w-full h-full object-cover saturate-110 brightness-105 hover:scale-105 transition-all duration-500"
                          />

                          {/* Dark gradient mapping vignette */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />

                          {/* Visual sci-fi brackets */}
                          <div className="absolute top-3 left-3 w-4 h-4 border-l border-t border-cyan-400/60 pointer-events-none" />
                          <div className="absolute top-3 right-3 w-4 h-4 border-r border-t border-cyan-400/60 pointer-events-none" />
                          <div className="absolute bottom-3 left-3 w-4 h-4 border-l border-b border-cyan-400/60 pointer-events-none" />
                          <div className="absolute bottom-3 right-3 w-4 h-4 border-r border-b border-cyan-400/60 pointer-events-none" />
                        </div>

                        {/* Visual tag below picture */}
                        <div className="text-center font-mono text-[8px] text-zinc-500 tracking-wider uppercase border-t border-zinc-900/60 pt-3">
                          REPRESENTACIÓN INSTITUCIONAL • {member.name.toUpperCase()}
                        </div>

                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* INTERACTIVE TEAM NETWORK INTEGRATOR BOX */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-10 items-center border-t border-zinc-900/40 pt-10">
              
              {/* Text context left */}
              <div className="lg:col-span-5 space-y-4 text-left">
                <span className="text-[10px] font-mono text-purple-400 tracking-widest uppercase font-black block">
                  Módulo Socio-Territorial
                </span>
                
                <h4 className="text-xl font-bold text-white tracking-tight">
                  Estructura Interna de Trabajo
                </h4>
                
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  El IICS no funciona de forma lineal. Configuramos un sistema en red de aportaciones donde estudiantes, directores y científicos RENACYT establecen loops de validación mutua.
                </p>
                
                <div className="p-4 bg-zinc-950/40 border border-zinc-900 text-[11px] text-zinc-400 rounded-xl leading-relaxed">
                  <strong>Soporte Operativo UNC:</strong> El engranaje material cuenta además con el apoyo de bachilleres y alumnos voluntarios encargados de recopilar información de campo, digitalizar mapas andinos y validar el flujo de la Consola.
                </div>
              </div>

              {/* Network graph visual right container (reutilized original SVG but beautifully wrapped) */}
              <div className="lg:col-span-7 flex items-center justify-center relative min-h-[385px] bg-[#050508]/10 border border-zinc-900 rounded-none overflow-hidden select-none">
                
                {/* Grid background */}
                <div className="absolute inset-0 bg-[#050508] bg-[radial-gradient(#15151a_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

                <div className="absolute top-4 left-4 flex flex-col font-mono text-[9px] text-zinc-400 tracking-wider text-left leading-none uppercase select-none">
                  <span>Estructura de Coordinación Académica</span>
                  {hoveredNode && (
                    <span className="text-cyan-400 font-bold mt-1">
                      Nodo Activo: {nodes.find(n => n.id === hoveredNode)?.label}
                    </span>
                  )}
                </div>

                {/* GRAPH */}
                <div className="relative w-full aspect-square max-w-[315px] max-h-[315px] flex items-center justify-center">
                  <svg viewBox="0 0 400 400" className="w-full h-full relative z-10 text-zinc-500 overflow-visible">
                    <defs>
                      <radialGradient id="ring-glow-core" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#0099ff" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="ring-glow-active" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Circles */}
                    <circle cx="200" cy="200" r="140" stroke="#1c1c20" strokeWidth="0.8" strokeDasharray="3 4" fill="none" opacity="0.35" />
                    <circle cx="200" cy="200" r="90" stroke="#27272a" strokeWidth="0.8" fill="none" opacity="0.2" />

                    {/* PATHWAYS */}
                    {connections.map((c, idx) => {
                      const nodeFrom = nodes.find(n => n.id === c.from)!;
                      const nodeTo = nodes.find(n => n.id === c.to)!;
                      const isHighlighted = (hoveredNode === nodeFrom.id || hoveredNode === nodeTo.id || !hoveredNode);

                      return (
                        <line
                          key={idx}
                          x1={nodeFrom.x}
                          y1={nodeFrom.y}
                          x2={nodeTo.x}
                          y2={nodeTo.y}
                          stroke={isHighlighted ? "#0099ff" : "#1c1c20"}
                          strokeWidth={isHighlighted ? "1" : "0.5"}
                          strokeDasharray={isHighlighted ? "none" : "3 3"}
                          className="transition-all duration-300"
                          opacity={isHighlighted ? 0.6 : 0.1}
                        />
                      );
                    })}

                    {/* NODES */}
                    {nodes.map((node) => {
                      const isHovered = hoveredNode === node.id;
                      const isDimmed = hoveredNode && hoveredNode !== node.id;

                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          {isHovered && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.size + 12}
                              fill={node.id === 'iics' ? "url(#ring-glow-core)" : "url(#ring-glow-active)"}
                              pointerEvents="none"
                              opacity={0.8}
                            />
                          )}

                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={isHovered ? node.size + 3 : node.size}
                            fill="#050508"
                            stroke={isHovered ? node.color : (isDimmed ? "#101012" : "#2a2a35")}
                            strokeWidth={isHovered ? "2.5" : "1"}
                            className="transition-all duration-300"
                          />

                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={Math.max(3, node.size - 9)}
                            fill={node.color}
                            opacity={isDimmed ? 0.2 : 0.9}
                            className="transition-all duration-300"
                          />

                          <text
                            x={node.x}
                            y={node.y + node.size + 12}
                            className="text-[8px] font-mono font-bold uppercase transition-colors select-none"
                            textAnchor="middle"
                            fill={isHovered ? "#ffffff" : "#4b5563"}
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="absolute bottom-3 text-center w-full">
                  <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                    Organigrama y Flujo de Validación Científica
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* CARD 4: VALORES Y PROPÓSITO (NEON Halos) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-b border-zinc-900/40 pb-12 last:border-0 last:pb-0">
            
            {/* VISUAL PANEL IN ALTERNATIVE LAYOUT ON LARGE */}
            <div className="lg:col-span-6 lg:order-1 flex flex-col justify-between relative p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 rounded-none overflow-hidden group min-h-[385px]">
              <div className="absolute inset-0 bg-[#040405] bg-[radial-gradient(#1a1a20_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

              <div className="text-left">
                <h4 className="text-xs font-mono font-bold text-zinc-400 tracking-wider uppercase mb-6">
                  Matriz de Consistencia y Ejes de Valor
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 0, title: '01 / Rigor', desc: 'Validaciones por referatos académicos y filtros de revisión por pares.' },
                    { id: 1, title: '02 / Innovación', desc: 'Metodologías avanzadas de análisis algorítmico, NLP y mapas espaciales.' },
                    { id: 2, title: '03 / Compromiso', desc: 'Independencia intelectual absoluta y resguardo de la verdad territorial.' },
                    { id: 3, title: '04 / Pertinencia', desc: 'Suministro ágil de datos y hallazgos socialmente útiles para Cajamarca.' }
                  ].map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 bg-black border border-zinc-900 rounded-none text-left cursor-pointer transition-all hover:bg-zinc-900/10 hover:border-cyan-500/25 duration-300"
                    >
                      <h5 className="text-[11px] font-mono font-extrabold uppercase tracking-wider mb-1 text-cyan-400">
                        {item.title}
                      </h5>
                      <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-900/60 text-center w-full">
                <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                  Modelo de Integración de la Cuádruple Hélice
                </span>
              </div>
            </div>

            {/* TEXT SIDE - RETRAGUED TO SECTION */}
            <div className="lg:col-span-6 lg:order-2 space-y-4 text-left">
              <span className="text-[10px] font-mono text-amber-550 tracking-widest uppercase font-black block">
                Valores y Propósito
              </span>

              <h3 className="text-2xl font-black text-white tracking-tight font-sans">
                Nuestros Pilares Operativos
              </h3>

              <p className="text-zinc-300 text-sm leading-relaxed font-sans">
                El IICS se rige bajo una filosofía de asertividad científica, neutralidad epistémica y acción oportuna para garantizar que los datos beneficien a la sociedad civil:
              </p>

              {/* Grid of values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {values.map((v, idx) => {
                  const IconComponent = v.icon;
                  return (
                    <div 
                      key={v.id} 
                      onMouseEnter={() => setHoveredPillar(idx)}
                      onMouseLeave={() => setHoveredPillar(null)}
                      className="border border-zinc-900 bg-gradient-to-b from-[#07070a] to-black hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(0,153,255,0.08)] hover:-translate-y-1 transition-all duration-300 p-6 rounded-none flex flex-col justify-between h-full group"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-3 border-b border-zinc-900/60 pb-2.5">
                          <div className="p-2 bg-cyan-950/30 border border-cyan-500/25 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300">
                            <IconComponent className="h-4.5 w-4.5" />
                          </div>
                          <h4 className="text-xs font-mono font-extrabold text-white uppercase tracking-[0.15em]">
                            {v.title}
                          </h4>
                        </div>
                        <p className="text-[12px] sm:text-xs text-zinc-400 font-sans font-medium leading-relaxed">
                          {v.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Central Trigger Action CTA */}
              <div className="pt-4 flex items-center justify-start">
                <button
                  onClick={onLearnMoreClick}
                  className="group flex items-center justify-center gap-2 px-5 py-3.5 bg-cyan-950/20 hover:bg-[#0099ff] border border-[#0099ff]/30 text-[#0099ff] hover:text-black text-xs font-bold font-mono tracking-wider uppercase cursor-pointer rounded-none transition-all duration-300"
                >
                  <span>Ingresar a la Consola de Datos Central</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
