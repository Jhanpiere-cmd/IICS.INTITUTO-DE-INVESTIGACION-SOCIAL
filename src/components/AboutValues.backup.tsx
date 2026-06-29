import { useState, useEffect, useRef } from 'react';
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

// Canvas-based interactive particle constellation representing a dynamic academic data network
function InteractiveNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const labels = [
      'IICS Core', 'Datos UNC', 'Observatorio', 'NLP Model', 'Encuestas',
      'Cajamarca', 'RENACYT', 'Doctores', 'Sociología', 'Semilleros',
      'Territorio', 'Conflictos', 'Cuencas', 'Validación'
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      label?: string;
      color: string;
    }

    const particles: Particle[] = [];
    const particleCount = 35;

    for (let i = 0; i < particleCount; i++) {
      const isCore = i === 0;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: isCore ? 8 : Math.random() * 2 + 1.5,
        label: isCore ? 'IICS AUTÓNOMO' : (i < labels.length + 1 ? labels[i - 1] : undefined),
        color: isCore ? '#0099ff' : (Math.random() > 0.5 ? '#06b6d4' : '#a855f7')
      });
    }

    let mouseX = 0;
    let mouseY = 0;
    let isHovering = false;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseEnter = () => { isHovering = true; };
    const handleMouseLeave = () => { isHovering = false; };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            const alpha = (1 - dist / 90) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 153, 255, ${alpha})`;
            ctx.lineWidth = p1.radius > 6 || p2.radius > 6 ? 1.2 : 0.6;
            ctx.stroke();
          }
        }

        if (isHovering) {
          const dx = p1.x - mouseX;
          const dy = p1.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));

        let currentRadius = p.radius;
        if (p.radius > 6) {
          currentRadius = p.radius + Math.sin(Date.now() * 0.003) * 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius + 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 153, 255, 0.15)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = p.radius > 6 ? 'rgba(0, 153, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        if (p.label) {
          ctx.font = p.radius > 6 ? 'bold 9px monospace' : '7px monospace';
          ctx.fillStyle = p.radius > 6 ? '#ffffff' : '#94a3b8';
          ctx.textAlign = 'center';
          ctx.fillText(p.label, p.x, p.y - (currentRadius + 6));
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseenter', handleMouseEnter);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full block bg-transparent"
    />
  );
}

interface AboutValuesProps {
  onLearnMoreClick: () => void;
  isSubPage?: boolean;
}

export default function AboutValues({ onLearnMoreClick, isSubPage = false }: AboutValuesProps) {
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
    <section id="sobre-el-iics" className={`${isSubPage ? 'pt-2 sm:pt-4 pb-20 bg-transparent' : 'py-24 bg-black'} border-t border-zinc-950 relative overflow-hidden`}>
      
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
                <div className="text-xs text-zinc-300 p-5 bg-white/[0.015] border border-white/[0.06] rounded-none relative overflow-hidden backdrop-blur-sm shadow-inner group hover:border-cyan-500/20 transition-all duration-300">
                  <div className="relative z-10 flex gap-3 text-left">
                    <Quote className="h-5 w-5 text-cyan-400 flex-shrink-0 opacity-40" />
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
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-6 flex flex-col justify-between relative p-6 sm:p-8 glass-card rounded-none overflow-hidden group min-h-[380px] hover:border-cyan-500/25 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />
              
              <div className="text-left">
                <h4 className="text-sm font-mono font-bold text-zinc-200 tracking-wider uppercase mb-5">
                  Análisis Comparativo de Ejecución e Impacto
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* TRADITIONAL COLUMN */}
                  <div className="glass-card border border-white/[0.06] p-4 space-y-4 rounded-none hover:border-zinc-700 transition-all duration-300">
                    <span className="text-xs font-mono font-black text-zinc-400 tracking-wider block uppercase">Ruta Institucional Clásica</span>
                    
                    <div className="space-y-2.5">
                      <div className="p-3 bg-white/[0.01] border border-white/[0.04] text-xs text-zinc-300 text-left rounded-none leading-relaxed">
                        <span className="font-mono text-[10px] block text-zinc-400 font-bold uppercase tracking-wider mb-1">FASE 01 / Traba Burocrática</span>
                        Filtros de aprobación en comisiones políticas. Demora de 6 a 12 meses.
                      </div>
                      <div className="p-3 bg-white/[0.01] border border-white/[0.04] text-xs text-zinc-300 text-left rounded-none leading-relaxed">
                        <span className="font-mono text-[10px] block text-zinc-400 font-bold uppercase tracking-wider mb-1">FASE 02 / Estancamiento</span>
                        Estructuras metodológicas rígidas basadas en cuotas burocráticas fatigadas.
                      </div>
                      <div className="p-3 bg-white/[0.01] border border-white/[0.04] text-xs text-zinc-300 text-left rounded-none leading-relaxed">
                        <span className="font-mono text-[10px] block text-zinc-400 font-bold uppercase tracking-wider mb-1">FASE 03 / Nulo Impacto</span>
                        Publicaciones archivadas sin retorno real a la comunidad.
                      </div>
                    </div>
                  </div>
 
                  {/* IICS COLUMN */}
                  <div className="glass-card border border-cyan-500/20 bg-cyan-950/[0.02] p-4 space-y-4 rounded-none hover:border-cyan-500/40 transition-all duration-300">
                    <span className="text-xs font-mono font-black text-cyan-400 tracking-wider block uppercase">Ruta Autónoma IICS</span>
                    
                    <div className="space-y-2.5">
                      <div className="p-3 bg-cyan-950/25 border border-cyan-500/25 text-xs text-zinc-100 text-left rounded-none leading-relaxed">
                        <span className="font-mono text-[10px] block text-cyan-400 font-bold uppercase tracking-wider mb-1">FASE 01 / Acción Inmediata</span>
                        Formulación ágil para desplegar encuestas y mapas de inmediato.
                      </div>
                      <div className="p-3 bg-cyan-950/25 border border-cyan-500/25 text-xs text-zinc-100 text-left rounded-none leading-relaxed">
                        <span className="font-mono text-[10px] block text-[#0099ff] font-bold uppercase tracking-wider mb-1">FASE 02 / Rigor Epistémico</span>
                        Validación y arbitraje metodológico inmediato por doctores RENACYT directos.
                      </div>
                      <div className="p-3 bg-cyan-950/25 border border-cyan-500/25 text-xs text-zinc-100 text-left rounded-none leading-relaxed">
                        <span className="font-mono text-[10px] block text-cyan-400 font-bold uppercase tracking-wider mb-1">FASE 03 / Retorno de Valor</span>
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
            </motion.div>
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
              <div className="flex bg-white/[0.015] backdrop-blur-md border border-white/[0.06] p-1.5 rounded-none self-start md:self-auto shadow-lg">
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
                        ? 'bg-cyan-500 text-slate-950 shadow-lg font-black'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-8 mt-6">
              {filteredMembers.map((member, index) => {
                const isEven = index % 2 === 0;
                return (
                  <motion.div 
                    key={member.id} 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                    variants={{
                      hover: { y: -6 }
                    }}
                    whileHover="hover"
                    className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-transparent border border-[#0099ff]/20 hover:border-[#0099ff] hover:shadow-[0_0_30px_rgba(0,153,255,0.15)] transition-all duration-500 items-stretch overflow-hidden relative"
                  >
                    {/* INFO COLUMN: DETAILED INFO (7 grid slots) */}
                    <div className={`lg:col-span-7 bg-transparent p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group ${isEven ? 'lg:order-1' : 'lg:order-2 border-t lg:border-t-0 lg:border-l border-white/[0.06]'}`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.015] to-transparent pointer-events-none" />
                      
                      {/* HUD Header */}
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-cyan-400" />
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black">
                            {member.category === 'promotor' ? 'FUNDADOR / DIRECTIVO' : 'CUERPO ACADÉMICO'}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500">ID: IICS_{member.id.toUpperCase()}</span>
                      </div>
 
                      {/* Main Biography content */}
                      <div className="space-y-5 flex-1 text-left">
                        <div>
                          <span className="text-[8px] font-mono font-bold uppercase py-0.5 px-2.5 bg-cyan-950/20 text-[#0099ff] border border-cyan-500/20 inline-block mb-3 rounded-none">
                            {member.academicTitle}
                          </span>
                          <h4 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight font-sans">
                            {member.name}
                          </h4>
                          <p className="text-[10px] font-mono font-bold text-[#0099ff] tracking-widest uppercase mt-1">
                            {member.role}
                          </p>
                        </div>
 
                        <div className="p-4 bg-white/[0.015] border border-white/[0.04] rounded-none leading-relaxed text-zinc-200 text-xs md:text-sm shadow-inner">
                          {member.desc}
                        </div>
 
                        {/* Core contribution segment - NO vertical line, elegant light check frame */}
                        <div className="p-4 bg-cyan-950/[0.03] border border-cyan-500/10 rounded-none">
                          <div className="flex items-start gap-3 justify-start text-left">
                            <div className="h-5 w-5 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 rounded-none mt-0.5">
                              <Check className="h-3 w-3" />
                            </div>
                            <div>
                              <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-wider block">FOCO DE IMPACTO</span>
                              <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium mt-0.5">
                                <strong>{member.highlight}:</strong> {member.focus}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
 
                      {/* Info footer metadata */}
                      <div className="mt-5 border-t border-white/[0.06] pt-3 flex items-center justify-between font-mono text-[8px] text-zinc-500 uppercase">
                        <div>Especialidad: <span className="text-zinc-400 font-bold">{member.tag}</span></div>
                        <div className="text-cyan-500/80">IICS_NATIVE</div>
                      </div>
                    </div>
 
                    {/* PHOTO COLUMN: LARGE PORTRAIT (5 grid slots) */}
                    <div className={`lg:col-span-5 flex items-center justify-center p-6 relative overflow-hidden group/img ${isEven ? 'lg:order-2 border-t lg:border-t-0 lg:border-l border-white/[0.06]' : 'lg:order-1 border-b lg:border-b-0 lg:border-r border-white/[0.06]'}`}>
                      {/* Grid background on image panel */}
                      <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#1a1a20_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />
 
                      {/* Floating category tag */}
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 font-mono text-[7px] text-cyan-400 select-none bg-black/80 px-2.5 py-1 border border-white/[0.06] leading-none z-20 uppercase font-bold">
                        <span>{member.category === 'promotor' ? 'FUNDACIÓN / DIRECTIVO' : 'CONSEJO ACADÉMICO'}</span>
                      </div>
 
                      {/* PORTRAIT CONTAINER WITH ABSOLUTE CORNERS and animation */}
                      <div className="relative w-full aspect-[4/5] max-w-[280px] border border-[#0099ff]/25 bg-white/[0.01] overflow-hidden flex items-center justify-center my-4 shadow-2xl transition-all duration-300 group-hover/img:border-[#0099ff]">
                        
                        {/* Scanline animation on hover using framer motion */}
                        <motion.div 
                          variants={{
                            hover: { 
                              top: ["0%", "100%", "0%"],
                              opacity: [0, 0.8, 0.8, 0],
                              transition: { repeat: Infinity, duration: 3, ease: "linear" }
                            }
                          }}
                          className="absolute inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_#00f0ff] pointer-events-none z-10 opacity-0"
                        />

                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain saturate-100 contrast-[1.03] brightness-100 transition-transform duration-700 ease-out group-hover/img:scale-105"
                        />
                        {/* Ambient gradient vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80 pointer-events-none" />
 
                        {/* Visual sci-fi brackets */}
                        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-cyan-500/60 group-hover/img:border-cyan-400 transition-colors pointer-events-none" />
                        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-cyan-500/60 group-hover/img:border-cyan-400 transition-colors pointer-events-none" />
                        <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-cyan-500/60 group-hover/img:border-cyan-400 transition-colors pointer-events-none" />
                        <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-cyan-500/60 group-hover/img:border-cyan-400 transition-colors pointer-events-none" />
                      </div>
 
                      {/* HUD tag at the bottom of the photo */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[8px] text-zinc-400 uppercase bg-black/75 px-3 py-2 border border-white/[0.06] backdrop-blur-sm z-20">
                        <span className="truncate">IICS // {member.name.split(' ')[0]}</span>
                        <span className="text-[#0099ff] font-bold">ACTIVO</span>
                      </div>
                    </div>
 
                  </motion.div>
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
                
                <div className="p-4 glass-card border border-white/[0.04] text-[11px] text-zinc-400 rounded-xl leading-relaxed">
                  <strong>Soporte Operativo UNC:</strong> El engranaje material cuenta además con el apoyo de bachilleres y alumnos voluntarios encargados de recopilar información de campo, digitalizar mapas andinos y validar el flujo de la Consola.
                </div>
              </div>

              {/* Network graph visual right container (reutilized original SVG but beautifully wrapped) */}
              <motion.div 
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-7 flex items-center justify-center relative min-h-[385px] glass-card rounded-none overflow-hidden select-none hover:border-cyan-500/25 transition-all duration-300"
              >
                
                {/* Dynamic Canvas Particle Network Constellation */}
                <InteractiveNetworkCanvas />

                <div className="absolute top-4 left-4 flex flex-col font-mono text-[9px] text-zinc-400 tracking-wider text-left leading-none uppercase select-none z-20">
                  <span>Estructura de Coordinación Académica</span>
                  <span className="text-cyan-400 font-bold mt-1">Nodos Activos: Red de Transición Científica</span>
                </div>

                <div className="absolute bottom-3 text-center w-full z-20">
                  <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                    Modelado Dinámico de la Red de Sociología de Precisión
                  </span>
                </div>
              </motion.div>

            </div>

          </div>

          {/* CARD 4: VALORES Y PROPÓSITO (NEON Halos) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-b border-zinc-900/40 pb-12 last:border-0 last:pb-0">
            
            {/* VISUAL PANEL IN ALTERNATIVE LAYOUT ON LARGE */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-6 lg:order-1 flex flex-col justify-between relative p-6 sm:p-8 glass-card rounded-none overflow-hidden group min-h-[385px] hover:border-cyan-500/25 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-transparent bg-[radial-gradient(#1a1a20_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

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
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 glass-card border border-white/[0.06] rounded-none text-left cursor-pointer transition-all hover:bg-white/[0.02] hover:border-cyan-500/25 duration-300"
                    >
                      <h5 className="text-[11px] font-mono font-extrabold uppercase tracking-wider mb-1 text-cyan-400">
                        {item.title}
                      </h5>
                      <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                        {item.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-900/60 text-center w-full">
                <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                  Modelo de Integración de la Cuádruple Hélice
                </span>
              </div>
            </motion.div>

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
                      className="glass-card glass-card-hover rounded-xl p-6 flex flex-col justify-between h-full group"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-3 border-b border-white/[0.06] pb-2.5">
                          <div className="p-2 bg-cyan-950/30 border border-cyan-500/25 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300 rounded-lg">
                            <IconComponent className="h-4.5 w-4.5" />
                          </div>
                          <h4 className="text-sm sm:text-base lg:text-lg font-extrabold text-white uppercase tracking-wider font-sans group-hover:text-cyan-300 transition-colors leading-snug">
                            {v.title}
                          </h4>
                        </div>
                        <p className="text-xs sm:text-sm lg:text-[15px] text-gray-200 font-sans leading-relaxed">
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
                  className="group flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-zinc-200 text-slate-950 text-xs font-bold font-sans tracking-wide uppercase cursor-pointer rounded-none transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-[1.02]"
                >
                  <span>Ingresar a la Consola de Datos Central</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-cyan-600 group-hover:scale-110" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
