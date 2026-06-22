import { ReactNode } from 'react';
import { Target, ArrowRight, BarChart2, Star, Clock, LineChart, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  onExploreClick: () => void;
  onWorkClick: () => void;
  children: ReactNode;
}

export default function Hero({ onExploreClick, onWorkClick, children }: HeroProps) {
  return (
    <section id="inicio" className="relative pb-2 lg:pb-2 pt-1 lg:pt-1.5 overflow-hidden">
      
      {/* Decorative blurry spheres (Cosmic glow) */}
      <div className="absolute top-1/4 left-1/10 -z-10 h-72 w-72 rounded-full bg-cyan-500/5 blur-[80px]"></div>
      <div className="absolute bottom-1/5 right-1/10 -z-10 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px]"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
         <div className="grid grid-cols-1 items-center gap-6 lg:gap-8 xl:gap-12 lg:grid-cols-12">
          
          {/* Left Text Block */}
          <div className="lg:col-span-5 flex flex-col gap-4 lg:gap-5 text-left">
            
            {/* Private & Independent Tag */}
            <div className="inline-flex items-center gap-1.5 self-start uppercase font-mono text-[9px] tracking-widest text-[#0099ff] font-bold bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1">
              <span>Instituto Privado de Investigación Científica Social</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-white font-sans max-w-lg">
              <span className="block drop-shadow-sm leading-tight">Comprendemos el presente.</span>
              <span className="block mt-1 bg-gradient-to-r from-cyan-400 via-[#0099ff] to-blue-600 bg-clip-text text-transparent drop-shadow-sm font-sans leading-tight">
                Anticipamos el futuro.
              </span>
            </h1>

            <h2 className="text-xs sm:text-xs font-bold text-cyan-300 tracking-wider uppercase font-mono">
              Sociología de precisión para territorios complejos
            </h2>

            <p className="max-w-xl text-xs lg:text-sm md:text-sm leading-relaxed text-gray-400 tracking-wide">
              Integramos sociología, ciencia de datos, inteligencia territorial y análisis digital para transformar información en decisiones estratégicas.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1">
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
            </div>

            {/* Secondary targets */}
            <div className="flex items-center gap-2 mt-2 xl:mt-3 text-gray-400">
            <div className="flex h-7 w-7 shrink-0 items-center justify-start">
                <Target className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-xs text-gray-300 tracking-wide font-sans">
                Generamos conocimiento útil para la sociedad y la gestión pública.
              </span>
            </div>

          </div>

          {/* Right Interactive Panel Mockup */}
          <div className="lg:col-span-7 w-full">
            {children}
          </div>

        </div>

        {/* Restored Horizontal Grid section */}
        <div className="mt-6 lg:mt-8 border-t border-gray-900 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* Item 1: Monitoreo en tiempo real */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-[#0099ff] mt-0.5">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-sm font-bold text-white tracking-wide font-sans">
                  Monitoreo en tiempo real
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">
                  Detectamos señales tempranas de tensión social
                </p>
              </div>
            </div>

            {/* Item 2: Análisis avanzado */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-[#0099ff] mt-0.5">
                <LineChart className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-sm font-bold text-white tracking-wide font-sans">
                  Análisis avanzado
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">
                  Ciencia de datos aplicada a lo social
                </p>
              </div>
            </div>

            {/* Item 3: Información para decidir */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-[#0099ff] mt-0.5">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-sm font-bold text-white tracking-wide font-sans">
                  Información para decidir
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">
                  Reportes claros y oportunos para tomadores de decisión
                </p>
              </div>
            </div>

            {/* Item 4: Formación de talento */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-[#0099ff] mt-0.5">
                <Award className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-sm font-bold text-white tracking-wide font-sans">
                  Formación de talento
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">
                  Capacitamos investigadores para el futuro
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

    </section>
  );
}
