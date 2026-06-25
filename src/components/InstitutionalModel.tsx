import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Eye, Cpu, Users, Target, Compass, Radar, Network, TrendingUp, Share2, GraduationCap, Database, Server, RefreshCw } from 'lucide-react';

export default function InstitutionalModel() {
  const [activeTab, setActiveTab] = useState<'helix' | 'mission' | 'objectives'>('helix');
  const [selectedHelix, setSelectedHelix] = useState<number>(0);

  const helixData = [
    {
      nr: '1',
      title: 'Investigación Científica de Excelencia',
      subtitle: 'Primera Hélice: Academia',
      icon: BookOpen,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
      activeBorderColor: 'border-cyan-400',
      bgColor: 'cyan',
      glowColor: 'rgba(34, 211, 238, 0.45)',
      metric: '≥ 2 Pubs Indexadas / año',
      scope: 'Problemáticas de alta complejidad (conflictos socioambientales y transformaciones rurales) publicadas en sistemas indexados internacionales Scopus, Scielo y Latindex.',
      desc: 'Comprende la generación sistemática de papers científicos, artículos indexados y estudios de fondo que contribuyan de manera objetiva al avance del conocimiento sociológico regional. La investigación del IICS mantiene por diseño rigor metodológico absoluto con orientación práctica, vinculando de manera obligatoria cada proyecto a tomadores de decisiones locales y la sociedad civil.'
    },
    {
      nr: '2',
      title: 'Observatorio Sociológico de Cajamarca (OSC)',
      subtitle: 'Segunda Hélice: Gobierno / Estado',
      icon: Eye,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/20',
      activeBorderColor: 'border-blue-400',
      bgColor: 'blue',
      glowColor: 'rgba(59, 130, 246, 0.45)',
      metric: 'Monitoreo Territorial Continuo',
      scope: 'Emisión de sistemas preventivos y estructuración de alertas tempranas estratégicas para eludir la escalada sistemática hacia conflictos abiertos.',
      desc: 'Constituye la interfaz oficial de análisis coyuntural del IICS con actores de decisión gubernamentales. Al evaluar de manera permanente dinámicas de conflictividad, opinión pública e indicadores socioterritoriales regionales, el OSC provee boletines mensuales y reportes de crisis inmediatos sustentados en minuciosa "escucha social".'
    },
    {
      nr: '3',
      title: 'Laboratorio de Sociología Digital (LSD)',
      subtitle: 'Tercera Hélice: Industria / Tecnología',
      icon: Cpu,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      activeBorderColor: 'border-purple-400',
      bgColor: 'purple',
      glowColor: 'rgba(168, 85, 247, 0.45)',
      metric: 'NLP, Big Data & Consultoría',
      scope: 'Análisis cuali-cuanti sistematizado de grandes volúmenes de opinión digital y mapeos territoriales aerofotogramétricos.',
      desc: 'El LSD representa el motor de innovación metodológica del Instituto. Mediante técnicas estructuradas de minería de datos, procesamiento de lenguaje natural (NLP) y análisis de sentimientos, el laboratorio provee servicios altamente especializados a industrias locales, empresas extractivas responsables y agencias de desarrollo.'
    },
    {
      nr: '4',
      title: 'Difusión y Formación',
      subtitle: 'Cuarta Hélice: Sociedad Civil',
      icon: Users,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      activeBorderColor: 'border-emerald-400',
      bgColor: 'emerald',
      glowColor: 'rgba(16, 185, 129, 0.45)',
      metric: 'Estrategia Transmedia y AFI',
      scope: 'Democratización libre del conocimiento social y empoderamiento sociodemográfico regional continuo.',
      desc: 'Asegura que la evidencia científica sea asimilada por la ciudadanía mediante un ecosistema transmedia innovador (radio/TV digital, infografías directas, bases abiertas). A su vez, impulsa la Academia de Formación Investigadora (AFI), forjando semilleros prácticos y captando jóvenes talentos para la renovación del capital científico.'
    }
  ];

  const objectivesData = [
    {
      id: 'oe-1',
      nr: '1',
      title: 'Monitoreo Social Sistematizado',
      icon: Radar,
      color: 'text-red-400',
      desc: 'Implementar y mantener operativo el Observatorio Sociológico de Cajamarca (OSC) como sistema de vigilancia permanente, publicando sistemáticamente indicadores territoriales de alerta temprana.'
    },
    {
      id: 'oe-2',
      nr: '2',
      title: 'Innovación Científica y Metodológica',
      icon: Network,
      color: 'text-cyan-400',
      desc: 'Operar el Laboratorio de Sociología Digital (LSD) para aplicar Ciencia de Datos y metodologías mixtas cuali-cuanti avanzadas que eleven la calidad y oportunidad de estudios en el norte del país.'
    },
    {
      id: 'oe-3',
      nr: '3',
      title: 'Sostenibilidad Financiera',
      icon: TrendingUp,
      color: 'text-amber-400',
      desc: 'Alcanzar la autosostenibilidad colectando un proyectado 60% del presupuesto operativo al quinto año a través de consultorías externas en diagnósticos de impacto social y formación continua.'
    },
    {
      id: 'oe-4',
      nr: '4',
      title: 'Democratización del Conocimiento',
      icon: Share2,
      color: 'text-blue-400',
      desc: 'Convertir al IICS en referente de opinión pública neutral mediante radiodifusión digital, bases de datos abiertas y formatos sintetizados interactivos accesibles para audiencias no académicas.'
    },
    {
      id: 'oe-5',
      nr: '5',
      title: 'Formación de Talento Investigador',
      icon: GraduationCap,
      color: 'text-pink-400',
      desc: 'Consolidar el programa de Becas al Mérito y la Academia de Formación Investigadora para dotar a las nuevas generaciones de competencias técnicas multidisciplinarias con compromiso ético.'
    },
    {
      id: 'oe-6',
      nr: '6',
      title: 'Consolidación de Infraestructura de Datos',
      icon: Database,
      color: 'text-emerald-400',
      desc: 'Centralizar un repositorio unificado y ordenado de alertas sociales e indicadores sobre Cajamarca, disponible para la consulta ciudadana libre, superando la histórica dispersión informativa.'
    }
  ];

  return (
    <section id="modelo-institucional" className="py-20 bg-transparent border-t border-gray-900 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-cyan-950/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-0 w-[450px] h-[450px] bg-purple-950/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Decorative cyber grid background lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-800/10 to-transparent"></div>
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-850 pb-5 mb-8 text-left">
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
              3. MARCO ORGANIZATIVO Y ESTRATÉGICO
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 font-sans tracking-tight">
              Estructura Institucional IICS
            </h2>
          </div>
          
          {/* Custom Tabs */}
          <div className="flex bg-gray-990 border border-gray-850 p-1 mt-5 md:mt-0 font-mono text-xs max-w-md w-full md:w-auto">
            <button
              id="tab-helix"
              onClick={() => setActiveTab('helix')}
              className={`flex-1 md:flex-initial px-4 py-2 text-center transition-all cursor-pointer select-none uppercase tracking-wider text-[10px] ${
                activeTab === 'helix'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cuádruple Hélice
            </button>
            <button
              id="tab-mission"
              onClick={() => setActiveTab('mission')}
              className={`flex-1 md:flex-initial px-4 py-2 text-center transition-all cursor-pointer select-none uppercase tracking-wider text-[10px] ${
                activeTab === 'mission'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Misión y Visión
            </button>
            <button
              id="tab-objectives"
              onClick={() => setActiveTab('objectives')}
              className={`flex-1 md:flex-initial px-4 py-2 text-center transition-all cursor-pointer select-none uppercase tracking-wider text-[10px] ${
                activeTab === 'objectives'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Objetivos
            </button>
          </div>
        </div>

        {/* Tab content wrapper */}
        <div className="min-h-[460px]">
          <AnimatePresence mode="wait">
            {activeTab === 'helix' && (
              <motion.div
                key="helix-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Intro statement */}
                <div className="max-w-4xl text-left bg-[#050506]/85 border border-gray-900/60 p-4 rounded-none mb-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                    MODELO INSTITUCIONAL DE COOPERACIÓN MULTIDIMENSIONAL
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mt-1">
                    3.2. Modelo de Cuádruple Hélice (Carayannis & Campbell, 2012)
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-2 font-sans">
                    El IICS opera bajo un marco estratégico estructurado que expande la tradicional Triple Hélice incorporando formalmente a la <strong>sociedad civil</strong> como cuarta hélice. Esta sinergia articulada garantiza que el conocimiento sociológico riguroso no permanezca aislado, sino que sirva como motor directo para la toma de decisiones, la innovación tecnológica y el desarrollo integral de la región Cajamarca.
                  </p>
                </div>

                {/* TWO-COLUMN SPLIT SCREEN EXPERIENCE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Column: Interlock Stack of 4 Helices Selector */}
                  <div className="lg:col-span-6 flex flex-col gap-2.5 justify-between">
                    {helixData.map((helix, idx) => {
                      const IconComp = helix.icon;
                      const isSelected = selectedHelix === idx;
                      
                      return (
                        <div
                          key={helix.nr}
                          onClick={() => setSelectedHelix(idx)}
                          className={`group relative text-left bg-gray-990/40 p-3.5 border transition-all duration-300 cursor-pointer rounded-none select-none ${
                            isSelected 
                              ? `${helix.borderColor} bg-gray-950/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]` 
                              : 'border-gray-900 hover:border-gray-800 hover:bg-gray-990/70'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            {/* Helix Numeric Indicator with static border */}
                            <div className={`flex items-center justify-center font-mono font-bold text-xs shrink-0 h-8 w-8 transition-colors ${
                              isSelected ? 'text-cyan-400 border border-cyan-800/30 bg-cyan-950/20' : 'text-gray-500 border border-gray-900 bg-black'
                            }`}>
                              0{helix.nr}
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-400/90 leading-none">
                                {helix.subtitle}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                                {helix.title}
                              </h4>
                            </div>
                          </div>

                          {/* Interactive expanding details under selection */}
                          <AnimatePresence initial={false}>
                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden pl-11 pr-2 text-left"
                              >
                                <p className="text-xs text-gray-350 leading-relaxed pt-2">
                                  {helix.desc}
                                </p>
                                <div className="mt-2.5 pt-2 border-t border-gray-900/60 flex flex-wrap gap-x-4 gap-y-1.5 text-[9.5px] font-mono">
                                  <span className="text-cyan-400 font-semibold uppercase tracking-wider block">
                                    Meta: {helix.metric}
                                  </span>
                                  <span className="text-gray-500 block truncate max-w-xs">
                                    {helix.scope}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Interactive Animated "Transformer Core" Engine */}
                  <div className="lg:col-span-6 flex flex-col justify-center items-center p-6 border border-gray-900/80 bg-gray-990/20 min-h-[380px] lg:min-h-[460px] relative overflow-hidden group">
                    {/* Backdrop Vector Matrix Grid */}
                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>
                    
                    {/* Visual glowing aura that shifts color dynamically */}
                    <div 
                      className="absolute h-48 w-48 rounded-full blur-[100px] opacity-20 transition-all duration-700 pointer-events-none"
                      style={{ 
                        backgroundColor: helixData[selectedHelix].bgColor === 'cyan' ? '#06b6d4' :
                                         helixData[selectedHelix].bgColor === 'blue' ? '#3b82f6' :
                                         helixData[selectedHelix].bgColor === 'purple' ? '#a855f7' : '#10b981',
                        transform: 'translate(0px, 0px)'
                      }}
                    />

                    {/* Cyber telemetry HUD line coordinates */}
                    <div className="absolute top-3 left-4 font-mono text-[9px] text-gray-500 space-y-0.5 tracking-wider uppercase">
                      <div>CORE_STATUS: <span className="text-cyan-400 select-none animate-pulse">ACTIVE_EMULATOR</span></div>
                      <div>ACTIVE: h_{selectedHelix + 1}_trans_v2</div>
                    </div>
                    
                    {/* Dynamic Status Speed Button / Refresh indicator */}
                    <div className="absolute bottom-3 right-4 flex items-center gap-1.5 font-mono text-[9px] text-gray-500 tracking-wider">
                      <RefreshCw className="h-3 w-3 animate-spin text-cyan-500/80" />
                      <span>SPEED: {selectedHelix === 1 ? '1.5FPS' : selectedHelix === 2 ? '4.8FPS' : '2.4FPS'}</span>
                    </div>

                    {/* INTERACTIVE TRANSFORMER SYSTEM (SVG + Framer Motion) */}
                    <div className="relative w-full aspect-square max-w-[320px] max-h-[320px] lg:max-w-[350px] lg:max-h-[350px] flex items-center justify-center">
                      <svg viewBox="0 0 400 400" className="w-full h-full relative z-10 text-gray-400">
                        {/* Define glowing drop shadows or gradients */}
                        <defs>
                          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>
                          <filter id="shadow-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>

                        {/* Outer Rotating Tactical Scope Rings */}
                        <motion.g
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                          className="origin-center"
                        >
                          <circle cx="200" cy="200" r="170" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="6 8" fill="none" opacity="0.5" />
                          {/* Tactical Tick Markers on Scope */}
                          {Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i * 30 * Math.PI) / 180;
                            const x1 = 200 + 165 * Math.cos(angle);
                            const y1 = 200 + 165 * Math.sin(angle);
                            const x2 = 200 + 175 * Math.cos(angle);
                            const y2 = 200 + 175 * Math.sin(angle);
                            return (
                              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="1" opacity="0.6" />
                            );
                          })}
                        </motion.g>

                        {/* Mid-sized inverse rotating dashed circle */}
                        <motion.g
                          animate={{ rotate: -360 }}
                          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                          className="origin-center text-gray-800"
                        >
                          <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1" strokeDasharray="12 18" fill="none" opacity="0.4" />
                          <circle cx="200" cy="200" r="128" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.2" />
                        </motion.g>

                        {/* Inner technical telemetry ring */}
                        <circle cx="200" cy="200" r="85" stroke="#1e293b" strokeWidth="1" fill="none" opacity="0.7" />

                        {/* CENTRAL PROCESSOR CORE HUB */}
                        <g>
                          {/* Glow backdrop behind core */}
                          <circle cx="200" cy="200" r="50" fill="url(#hub-glow)" pointerEvents="none" />
                          
                          {/* core frame */}
                          <circle cx="200" cy="200" r="32" fill="#000" stroke="#1e293b" strokeWidth="2" />
                          <circle cx="200" cy="200" r="24" fill="#030712" stroke="#334155" strokeWidth="1" />
                          
                          {/* Inner glowing element that pulses color of active helix */}
                          <motion.circle
                            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            cx="200" cy="200" r="12"
                            fill={
                              selectedHelix === 0 ? '#06b6d4' :
                              selectedHelix === 1 ? '#3b82f6' :
                              selectedHelix === 2 ? '#a855f7' : '#10b981'
                            }
                            className="transition-colors duration-500"
                            style={{ filter: "url(#shadow-glow)" }}
                          />

                          {/* Micro spinning cyber teeth */}
                          <motion.g
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                            className="origin-center text-gray-500"
                          >
                            <line x1="200" y1="164" x2="200" y2="168" stroke="currentColor" strokeWidth="2" />
                            <line x1="200" y1="232" x2="200" y2="236" stroke="currentColor" strokeWidth="2" />
                            <line x1="164" y1="200" x2="168" y2="200" stroke="currentColor" strokeWidth="2" />
                            <line x1="232" y1="200" x2="236" y2="200" stroke="currentColor" strokeWidth="2" />
                          </motion.g>
                        </g>

                        {/* DATA ARROW PIPES & INFORMATION CHANNELS CONNECTING CORES */}
                        {/* 1. ACADEMIA FLOW (Top) */}
                        <line 
                          x1="200" y1="168" x2="200" y2="76" 
                          stroke={selectedHelix === 0 ? '#22d3ee' : '#1e293b'} 
                          strokeWidth={selectedHelix === 0 ? "2.5" : "1.2"} 
                          className="transition-colors duration-500"
                        />
                        {/* Academia flying laser packets */}
                        <motion.circle 
                          r={selectedHelix === 0 ? 3.5 : 2} 
                          fill="#22d3ee"
                          style={{ filter: selectedHelix === 0 ? "url(#shadow-glow)" : "none" }}
                          animate={{ cy: [155, 75] }}
                          transition={{ repeat: Infinity, duration: selectedHelix === 0 ? 1 : 2.5, ease: "linear" }}
                          cx="200"
                        />

                        {/* 2. GOBIERNO FLOW (Right) */}
                        <line 
                          x1="232" y1="200" x2="324" y2="200" 
                          stroke={selectedHelix === 1 ? '#60a5fa' : '#1e293b'} 
                          strokeWidth={selectedHelix === 1 ? "2.5" : "1.2"}
                          className="transition-colors duration-500"
                        />
                        {/* Gobierno flying laser packets */}
                        <motion.circle 
                          r={selectedHelix === 1 ? 3.5 : 2} 
                          fill="#3b82f6"
                          style={{ filter: selectedHelix === 1 ? "url(#shadow-glow)" : "none" }}
                          animate={{ cx: [240, 320] }}
                          transition={{ repeat: Infinity, duration: selectedHelix === 1 ? 1 : 2.5, ease: "linear" }}
                          cy="200"
                        />

                        {/* 3. INDUSTRIA FLOW (Bottom) */}
                        <line 
                          x1="200" y1="232" x2="200" y2="324" 
                          stroke={selectedHelix === 2 ? '#c084fc' : '#1e293b'} 
                          strokeWidth={selectedHelix === 2 ? "2.5" : "1.2"}
                          className="transition-colors duration-500"
                        />
                        {/* Industria flying laser packets */}
                        <motion.circle 
                          r={selectedHelix === 2 ? 3.5 : 2} 
                          fill="#a855f7"
                          style={{ filter: selectedHelix === 2 ? "url(#shadow-glow)" : "none" }}
                          animate={{ cy: [245, 320] }}
                          transition={{ repeat: Infinity, duration: selectedHelix === 2 ? 1 : 2.5, ease: "linear" }}
                          cx="200"
                        />

                        {/* 4. SOCIEDAD CIVIL FLOW (Left) */}
                        <line 
                          x1="168" y1="200" x2="76" y2="200" 
                          stroke={selectedHelix === 3 ? '#34d399' : '#1e293b'} 
                          strokeWidth={selectedHelix === 3 ? "2.5" : "1.2"}
                          className="transition-colors duration-500"
                        />
                        {/* Sociedad civil flying laser packets */}
                        <motion.circle 
                          r={selectedHelix === 3 ? 3.5 : 2} 
                          fill="#10b981"
                          style={{ filter: selectedHelix === 3 ? "url(#shadow-glow)" : "none" }}
                          animate={{ cx: [155, 75] }}
                          transition={{ repeat: Infinity, duration: selectedHelix === 3 ? 1 : 2.5, ease: "linear" }}
                          cy="200"
                        />

                        {/* ORBITAL INDIVIDUAL GRAPHICAL CORES */}
                        
                        {/* ACADEMIA NODE (TOP) */}
                        <g transform="translate(200, 70)" className="cursor-pointer" onClick={() => setSelectedHelix(0)}>
                          <motion.circle
                            animate={{ scale: selectedHelix === 0 ? [1, 1.08, 1] : 1 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            r={selectedHelix === 0 ? "24" : "18"}
                            fill="#030712"
                            stroke={selectedHelix === 0 ? "#22d3ee" : "#334155"}
                            strokeWidth={selectedHelix === 0 ? "2.5" : "1.5"}
                            className="transition-all duration-300"
                          />
                          <BookOpen className={`h-4.5 w-4.5 -translate-x-[9px] -translate-y-[9px] ${selectedHelix === 0 ? 'text-cyan-400' : 'text-gray-500'}`} />
                        </g>

                        {/* GOBIERNO NODE (RIGHT) */}
                        <g transform="translate(330, 200)" className="cursor-pointer" onClick={() => setSelectedHelix(1)}>
                          <motion.circle
                            animate={{ scale: selectedHelix === 1 ? [1, 1.08, 1] : 1 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            r={selectedHelix === 1 ? "24" : "18"}
                            fill="#030712"
                            stroke={selectedHelix === 1 ? "#60a5fa" : "#334155"}
                            strokeWidth={selectedHelix === 1 ? "2.5" : "1.5"}
                            className="transition-all duration-300"
                          />
                          <Eye className={`h-4.5 w-4.5 -translate-x-[9px] -translate-y-[9px] ${selectedHelix === 1 ? 'text-blue-400' : 'text-gray-500'}`} />
                        </g>

                        {/* INDUSTRIA/TECH NODE (BOTTOM) */}
                        <g transform="translate(200, 330)" className="cursor-pointer" onClick={() => setSelectedHelix(2)}>
                          <motion.circle
                            animate={{ scale: selectedHelix === 2 ? [1, 1.08, 1] : 1 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            r={selectedHelix === 2 ? "24" : "18"}
                            fill="#030712"
                            stroke={selectedHelix === 2 ? "#c084fc" : "#334155"}
                            strokeWidth={selectedHelix === 2 ? "2.5" : "1.5"}
                            className="transition-all duration-300"
                          />
                          <Cpu className={`h-4.5 w-4.5 -translate-x-[9px] -translate-y-[9px] ${selectedHelix === 2 ? 'text-purple-400' : 'text-gray-500'}`} />
                        </g>

                        {/* SOCIEDAD CIVIL NODE (LEFT) */}
                        <g transform="translate(70, 200)" className="cursor-pointer" onClick={() => setSelectedHelix(3)}>
                          <motion.circle
                            animate={{ scale: selectedHelix === 3 ? [1, 1.08, 1] : 1 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            r={selectedHelix === 3 ? "24" : "18"}
                            fill="#030712"
                            stroke={selectedHelix === 3 ? "#34d399" : "#334155"}
                            strokeWidth={selectedHelix === 3 ? "2.5" : "1.5"}
                            className="transition-all duration-300"
                          />
                          <Users className={`h-4.5 w-4.5 -translate-x-[9px] -translate-y-[9px] ${selectedHelix === 3 ? 'text-emerald-400' : 'text-gray-500'}`} />
                        </g>
                      </svg>
                      
                      {/* Interactive Transformer Mesh background element */}
                      <div className="absolute inset-4 rounded-full border border-dashed border-gray-850/40 pointer-events-none animate-spin" style={{ animationDuration: '60s' }}></div>
                    </div>

                    {/* Quick Helper caption under engine */}
                    <div className="z-10 text-center mt-3 max-w-sm">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-cyan-400">
                        {helixData[selectedHelix].subtitle}
                      </span>
                      <p className="text-[9.5px] text-gray-500 font-sans tracking-wide leading-tight mt-1">
                        Interactividad holográfica calibrada: Haz clic en las órbitas del gráfico para transformar la perspectiva analítica o selecciona un nodo en la lista.
                      </p>
                    </div>

                  </div>

                </div>
              </motion.div>
            )}

            {activeTab === 'mission' && (
              <motion.div
                key="mission-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left select-none"
              >
                {/* MISION PANEL */}
                <div className="bg-gradient-to-b from-gray-990 to-black border border-gray-900 p-8 rounded-none relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 border-b border-gray-850 pb-4 mb-6">
                      <div className="h-10 w-10 flex items-center justify-start">
                        <Target className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">PROPÓSITO DIARIO</span>
                        <h3 className="text-lg font-black text-white tracking-wide">Misión Institucional</h3>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans mb-4">
                      El Instituto de Investigación Científica Social (IICS) de la Universidad Nacional de Cajamarca es una unidad académica de excelencia dedicada a la generación de conocimiento científico riguroso sobre la realidad social y territorial, mediante la integración sistemática de metodologías sociológicas tradicionales con herramientas digitales avanzadas (Big Data, Inteligencia Artificial, Sistemas de Información Geográfica).
                    </p>

                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans">
                      Nuestra labor fundamental consiste en comprender las transformaciones sociales en curso para proporcionar evidencia confiable, oportuna y territorializada que oriente la toma de decisiones públicas, contribuya a la prevención de conflictos sociales, democratice el acceso al conocimiento y promueva el desarrollo sostenible de la región Cajamarca, con proyección estratégica de expansión hacia otras zonas del país.
                    </p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gray-900 text-[10px] font-mono text-gray-500 leading-normal uppercase tracking-wider">
                    COMPROMISO ÉTICO AL SERVICIO DE LAS REGIONES
                  </div>
                </div>

                {/* VISION PANEL */}
                <div className="bg-gradient-to-b from-gray-990 to-black border border-gray-900 p-8 rounded-none relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 border-b border-gray-850 pb-4 mb-6">
                      <div className="h-10 w-10 flex items-center justify-start">
                        <Compass className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block">HORIZONTE 2030</span>
                        <h3 className="text-lg font-black text-white tracking-wide">Visión Institucional</h3>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans mb-4">
                      Al año 2030, el Instituto de Investigación Científica Social (IICS) será reconocido como el centro de referencia líder en investigación sociológica y análisis territorial en el Perú y Latinoamérica, distinguido por su excelencia científica, su capacidad de anticipación a las crisis sociales mediante tecnologías emergentes, y por ser una plataforma de formación de investigadores comprometidos con la transformación de sus territorios.
                    </p>

                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans">
                      Este modelo será reconocido por la producción consistente de publicaciones indexadas de alto impacto (CONCYTEC / RENACYT), la formación de cuadros técnicos e investigadores clave originarios de la propia región andina, y el posicionamiento estratégico como la principal interfaz neutral y objetiva para la resolución de dilemas socioambientales y de dinámicas extractivas complejas.
                    </p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gray-900 text-[10px] font-mono text-gray-500 leading-normal uppercase tracking-wider">
                    LIDERAZGO TERRITORIAL ANDINO Y GLOBAL
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'objectives' && (
              <motion.div
                key="objectives-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Summary badge */}
                <div className="max-w-3xl text-left mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Objetivos Estratégicos
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-sans">
                    El IICS persigue seis objetivos estratégicos interrelacionados que en conjunto permiten cerrar la brecha de información territorial andina y consolidar al Instituto como un actor relevante:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 select-none">
                  {objectivesData.map((obj) => {
                    const IconObj = obj.icon;
                    return (
                      <div
                        key={obj.id}
                        className="bg-black border border-gray-900/80 hover:border-cyan-500/30 p-5 rounded-none flex items-start gap-4 transition-all hover:shadow-lg text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-gray-950 border border-gray-850">
                          <IconObj className={`h-5 w-5 ${obj.color}`} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-semibold block">
                            OE 0{obj.nr}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                            {obj.title}
                          </h4>
                          <p className="text-xs text-gray-400 leading-snug font-sans pt-0.5">
                            {obj.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
