import { ReactNode } from 'react';
import { Target, ArrowRight, BarChart2, Star, Clock, LineChart, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  onExploreClick: () => void;
  onWorkClick: () => void;
  children: ReactNode;
}

export default function Hero({ onExploreClick, onWorkClick, children }: HeroProps) {
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
          className="grid grid-cols-1 items-center gap-6 lg:gap-8 lg:grid-cols-12"
        >
          
          {/* Left Column: Interactive Panel / Monitor & Horizontal/Vertical Cards (displays on left, second on mobile) */}
          <div className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1">
            <motion.div 
              variants={mapVariants}
              className="w-full relative"
            >
              {children}
            </motion.div>

            {/* Capability cards placed below the computer, stretching horizontally on large screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Item 1: Monitoreo en tiempo real */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="flex items-start gap-2.5 glass-card rounded-none p-3 border border-white/15 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <div className="flex-shrink-0 text-cyan-400 p-1 bg-cyan-950/40 border border-cyan-500/30 rounded-none">
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[9.5px] font-bold text-white tracking-wide uppercase font-mono leading-none">
                    Monitoreo en tiempo real
                  </h4>
                  <p className="text-[9.5px] text-gray-300 mt-1.5 leading-snug">
                    Detectamos señales tempranas de tensión social
                  </p>
                </div>
              </motion.div>

              {/* Item 2: Análisis avanzado */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="flex items-start gap-2.5 glass-card rounded-none p-3 border border-white/15 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <div className="flex-shrink-0 text-cyan-400 p-1 bg-cyan-950/40 border border-cyan-500/30 rounded-none">
                  <LineChart className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[9.5px] font-bold text-white tracking-wide uppercase font-mono leading-none">
                    Análisis avanzado
                  </h4>
                  <p className="text-[9.5px] text-gray-300 mt-1.5 leading-snug">
                    Ciencia de datos aplicada a la sociología
                  </p>
                </div>
              </motion.div>

              {/* Item 3: Información para decidir */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="flex items-start gap-2.5 glass-card rounded-none p-3 border border-white/15 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <div className="flex-shrink-0 text-cyan-400 p-1 bg-cyan-950/40 border border-cyan-500/30 rounded-none">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[9.5px] font-bold text-white tracking-wide uppercase font-mono leading-none">
                    Información para decidir
                  </h4>
                  <p className="text-[9.5px] text-gray-300 mt-1.5 leading-snug">
                    Reportes claros para tomadores de decisiones
                  </p>
                </div>
              </motion.div>

              {/* Item 4: Formación de talento */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="flex items-start gap-2.5 glass-card rounded-none p-3 border border-white/15 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer text-left shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <div className="flex-shrink-0 text-cyan-400 p-1 bg-cyan-950/40 border border-cyan-500/30 rounded-none">
                  <Award className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[9.5px] font-bold text-white tracking-wide uppercase font-mono leading-none">
                    Formación de talento
                  </h4>
                  <p className="text-[9.5px] text-gray-300 mt-1.5 leading-snug">
                    Capacitamos investigadores para el desarrollo
                  </p>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Right Column: Text Block (displays on right on desktop, top on mobile) */}
          <motion.div 
            variants={containerVariants}
            className="lg:col-span-5 flex flex-col gap-4 lg:gap-5 text-left order-1 lg:order-2"
          >
            
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white font-sans max-w-2xl uppercase"
            >
              <span className="block drop-shadow-sm leading-tight">Comprendemos el presente.</span>
              <span className="block mt-1 bg-gradient-to-r from-cyan-400 via-[#0099ff] to-blue-600 bg-clip-text text-transparent drop-shadow-sm leading-tight">
                Anticipamos el futuro.
              </span>
            </motion.h1>

            <motion.h2 
              variants={itemVariants}
              className="text-[11px] sm:text-xs font-bold text-cyan-300 tracking-wider uppercase font-mono leading-relaxed"
            >
              Centro Privado de Investigación Científica, Sociología y Análisis Social
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="max-w-xl text-xs lg:text-sm leading-relaxed text-gray-400 tracking-wide font-sans"
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
                Conoce nuestro trabajo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                id="btn-explorar-dashboard"
                onClick={onExploreClick}
                className="group flex items-center justify-center gap-2 rounded-none bg-transparent hover:bg-gray-990 border border-gray-700/80 hover:border-gray-500 text-white px-5 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-bold tracking-wide transition-all cursor-pointer"
              >
                <BarChart2 className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                Explorar Observatorio
              </button>
            </motion.div>

            {/* Secondary targets */}
            <motion.div 
              variants={itemVariants}
              className="flex items-center gap-2 mt-2 xl:mt-3 text-gray-400"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-start">
                <Target className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-xs text-gray-300 tracking-wide font-sans">
                Generamos conocimiento útil para la sociedad y la gestión pública.
              </span>
            </motion.div>

          </motion.div>

        </motion.div>

      </div>

    </section>
  );
}
