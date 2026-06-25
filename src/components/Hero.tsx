import { ReactNode } from 'react';
import { Target, ArrowRight, BarChart2, Star, Clock, LineChart, ShieldAlert, Award, Film, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  onExploreClick: () => void;
  onWorkClick: () => void;
  onDocumentalesClick: () => void;
  onAfiClick: () => void;
  children: ReactNode;
}

export default function Hero({ onExploreClick, onWorkClick, onDocumentalesClick, onAfiClick, children }: HeroProps) {
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const mapVariants = {
    hidden: { opacity: 0, scale: 0.95, x: -20 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }
    }
  };

  return (
    <section id="inicio" className="relative pb-8 lg:pb-12 pt-4 lg:pt-6 overflow-hidden">
      
      {/* Decorative blurry spheres (Cosmic glow) */}
      <div className="absolute top-1/4 left-1/10 -z-10 h-72 w-72 rounded-full bg-cyan-500/5 blur-[80px]"></div>
      <div className="absolute bottom-1/5 right-1/10 -z-10 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px]"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 items-start gap-6 lg:gap-8 lg:grid-cols-12"
        >
          
          {/* Left Column: Interactive Panel / Monitor (displays on left, second on mobile) */}
          <div className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1">
            <motion.div 
              variants={mapVariants}
              className="w-full relative"
            >
              {children}
            </motion.div>

            {/* Institutional Value Statement Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <motion.div 
                variants={itemVariants}
                className="bg-white/[0.015] border border-white/10 p-4 text-left rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-cyan-400 transition-all duration-300"
              >
                <h4 className="text-xs sm:text-sm lg:text-base font-black text-white tracking-wider font-sans mb-1 uppercase">
                  SOCIOLOGÍA DE PRECISIÓN
                </h4>
                <p className="text-[11px] sm:text-xs lg:text-[13px] font-bold text-cyan-300 leading-snug font-sans">
                  Aplicamos sociología de precisión para producir conocimiento regional de alto impacto.
                </p>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="bg-white/[0.015] border border-white/10 p-4 text-left rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-cyan-400 transition-all duration-300"
              >
                <h4 className="text-xs sm:text-sm lg:text-base font-black text-white tracking-wider font-sans mb-1 uppercase">
                  INNOVACIÓN METODOLÓGICA
                </h4>
                <p className="text-[11px] sm:text-xs lg:text-[13px] font-bold text-cyan-300 leading-snug font-sans">
                  Integramos ciencia de datos y herramientas de IA aplicada desde Cajamarca, Perú.
                </p>
              </motion.div>
            </div>
          </div>

          {/* Right Column: Text Block (displays on right on desktop, top on mobile) */}
          <motion.div 
            variants={containerVariants}
            className="lg:col-span-5 flex flex-col gap-4 lg:gap-5 text-left order-1 lg:order-2 lg:pt-2"
          >
            
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white font-sans max-w-2xl uppercase"
            >
              <span className="block drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] leading-tight text-white">Comprendemos el presente.</span>
              <span className="block mt-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,153,255,0.45)] leading-tight glow-text-cyan">
                Anticipamos el futuro.
              </span>
            </motion.h1>

            <motion.h2 
              variants={itemVariants}
              className="text-xs sm:text-sm font-bold text-cyan-300 tracking-wider uppercase font-mono leading-relaxed glow-text-cyan/70"
            >
              Centro Privado de Investigación Científica, Sociología y Análisis Social
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="max-w-xl text-sm sm:text-base leading-relaxed text-gray-250 tracking-wide font-sans"
            >
              Generamos estudios, monitoreo territorial, análisis de opinión pública y evidencia científica para instituciones, empresas y tomadores de decisión.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1"
            >
              <button
                id="btn-conoce-trabajo"
                onClick={onWorkClick}
                className="group flex items-center justify-center gap-2 rounded-none bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(0,153,255,0.25)] hover:scale-[1.02] cursor-pointer"
              >
                Explorar publicaciones
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                id="btn-explorar-dashboard"
                onClick={onExploreClick}
                className="group flex items-center justify-center gap-2 rounded-none bg-white hover:bg-zinc-200 text-slate-950 px-5 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-[1.02] cursor-pointer"
              >
                <BarChart2 className="h-4 w-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                Explorar Observatorio
              </button>
            </motion.div>

            {/* Secondary CTAs */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-0"
            >
              <button
                id="btn-documentales"
                onClick={onDocumentalesClick}
                className="group flex items-center justify-center gap-2 rounded-none bg-white hover:bg-zinc-200 text-slate-950 px-5 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-[1.02] cursor-pointer font-sans"
              >
                <Film className="h-4 w-4 text-cyan-600 group-hover:rotate-6 transition-transform" />
                Documentales y Reportajes
              </button>

              <button
                id="btn-academia-afi"
                onClick={onAfiClick}
                className="group flex items-center justify-center gap-2 rounded-none bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(0,153,255,0.25)] hover:scale-[1.02] cursor-pointer font-sans"
              >
                <GraduationCap className="h-4 w-4 text-slate-950 group-hover:scale-110 transition-transform" />
                Academia AFI (Postulación)
              </button>
            </motion.div>

            {/* Secondary targets */}
            <motion.div 
              variants={itemVariants}
              className="flex items-center gap-3 mt-3 text-gray-300"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-start">
                <Target className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-sm sm:text-base text-gray-200 tracking-wide font-sans">
                Generamos conocimiento útil para la sociedad y la gestión pública.
              </span>
            </motion.div>

          </motion.div>

        </motion.div>

        {/* Capability cards placed below the computer, stretching horizontally on large screens across the full width */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 lg:mt-8"
        >
          
          {/* Item 1: Monitoreo en tiempo real */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="flex items-start gap-3.5 glow-card-electric rounded-none p-4.5 border border-white/10 hover:border-cyan-400 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_25px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex-shrink-0 text-cyan-400 mt-1">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-wider uppercase font-sans leading-tight">
                MONITOREO EN TIEMPO REAL
              </h4>
              <p className="text-xs sm:text-sm lg:text-[15px] text-cyan-300 font-bold mt-1.5 leading-relaxed font-sans">
                Detectamos señales tempranas de tensión social.
              </p>
            </div>
          </motion.div>

          {/* Item 2: Análisis avanzado */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="flex items-start gap-3.5 glow-card-electric rounded-none p-4.5 border border-white/10 hover:border-cyan-400 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_25px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex-shrink-0 text-cyan-400 mt-1">
              <LineChart className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-wider uppercase font-sans leading-tight">
                ANÁLISIS AVANZADO
              </h4>
              <p className="text-xs sm:text-sm lg:text-[15px] text-cyan-300 font-bold mt-1.5 leading-relaxed font-sans">
                Ciencia de datos aplicada a la sociología.
              </p>
            </div>
          </motion.div>

          {/* Item 3: Información para decidir */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="flex items-start gap-3.5 glow-card-electric rounded-none p-4.5 border border-white/10 hover:border-cyan-400 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_25px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex-shrink-0 text-cyan-400 mt-1">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-wider uppercase font-sans leading-tight">
                INFORMACIÓN PARA DECIDIR
              </h4>
              <p className="text-xs sm:text-sm lg:text-[15px] text-cyan-300 font-bold mt-1.5 leading-relaxed font-sans">
                Reportes claros para tomadores de decisiones.
              </p>
            </div>
          </motion.div>

          {/* Item 4: Formación de talento */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="flex items-start gap-3.5 glow-card-electric rounded-none p-4.5 border border-white/10 hover:border-cyan-400 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_25px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex-shrink-0 text-cyan-400 mt-1">
              <Award className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-wider uppercase font-sans leading-tight">
                FORMACIÓN DE TALENTO
              </h4>
              <p className="text-xs sm:text-sm lg:text-[15px] text-cyan-300 font-bold mt-1.5 leading-relaxed font-sans">
                Capacitamos investigadores para el desarrollo.
              </p>
            </div>
          </motion.div>
        </motion.div>

      </div>

    </section>
  );
}
