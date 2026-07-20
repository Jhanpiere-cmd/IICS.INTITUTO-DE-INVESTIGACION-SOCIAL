import { ReactNode } from 'react';
import { Target, ArrowRight, BarChart2, Star, Clock, LineChart, ShieldAlert, Award, Film, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_LANDING_HERO, HeroButtonAction, LandingHeroContent } from '../../lib/siteContent';

interface HeroProps {
  onExploreClick: () => void;
  onWorkClick: () => void;
  onDocumentalesClick: () => void;
  onAfiClick: () => void;
  content?: LandingHeroContent;
  children: ReactNode;
}

export default function Hero({
  onExploreClick,
  onWorkClick,
  onDocumentalesClick,
  onAfiClick,
  content = DEFAULT_LANDING_HERO,
  children,
}: HeroProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const mapVariants = {
    hidden: { opacity: 0, scale: 0.95, x: -20 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay: 0.25 },
    },
  };

  const runAction = (action: HeroButtonAction) => {
    switch (action) {
      case 'publications':
        onWorkClick();
        break;
      case 'observatory':
        onExploreClick();
        break;
      case 'documentaries':
        onDocumentalesClick();
        break;
      case 'afi':
        onAfiClick();
        break;
      default:
        break;
    }
  };

  const getButtonIcon = (action: HeroButtonAction, className: string) => {
    switch (action) {
      case 'observatory':
        return <BarChart2 className={className} />;
      case 'documentaries':
        return <Film className={className} />;
      case 'afi':
        return <GraduationCap className={className} />;
      case 'publications':
        return <ArrowRight className={className} />;
      default:
        return <Star className={className} />;
    }
  };

  const renderButton = (
    id: string,
    label: string,
    action: HeroButtonAction,
    tone: 'cyan' | 'white'
  ) => {
    if (!label.trim() || action === 'none') return null;

    const isCyan = tone === 'cyan';
    const iconClass = isCyan
      ? 'h-4 w-4 text-slate-950 group-hover:scale-110 transition-transform'
      : 'h-4 w-4 text-cyan-600 group-hover:scale-110 transition-transform';

    return (
      <button
        id={id}
        onClick={() => runAction(action)}
        className={`group flex items-center justify-center gap-2 rounded-none px-5 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-bold tracking-wide transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap ${
          isCyan
            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(0,153,255,0.25)]'
            : 'bg-white hover:bg-zinc-200 text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.15)]'
        }`}
      >
        {tone === 'white' && getButtonIcon(action, iconClass)}
        {label}
        {tone === 'cyan' && getButtonIcon(action, iconClass)}
      </button>
    );
  };

  return (
    <section id="inicio" className="relative pb-8 lg:pb-12 pt-4 lg:pt-6 overflow-hidden">
      <div className="absolute top-1/4 left-1/10 -z-10 h-72 w-72 rounded-full bg-cyan-500/5 blur-[80px]"></div>
      <div className="absolute bottom-1/5 right-1/10 -z-10 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px]"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 items-start gap-6 lg:gap-8 lg:grid-cols-12"
        >
          <div className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1">
            <motion.div variants={mapVariants} className="w-full relative">
              {children}
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <motion.div
                variants={itemVariants}
                className="bg-white/[0.015] border border-white/10 p-4 text-left rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-cyan-400 transition-all duration-300"
              >
                <h4 className="text-xs sm:text-sm lg:text-base font-black text-white tracking-wider font-sans mb-1 uppercase">
                  {content.value_card_one_title}
                </h4>
                <p className="text-[11px] sm:text-xs lg:text-[13px] font-bold text-cyan-300 leading-snug font-sans">
                  {content.value_card_one_text}
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white/[0.015] border border-white/10 p-4 text-left rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-cyan-400 transition-all duration-300"
              >
                <h4 className="text-xs sm:text-sm lg:text-base font-black text-white tracking-wider font-sans mb-1 uppercase">
                  {content.value_card_two_title}
                </h4>
                <p className="text-[11px] sm:text-xs lg:text-[13px] font-bold text-cyan-300 leading-snug font-sans">
                  {content.value_card_two_text}
                </p>
              </motion.div>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            className="lg:col-span-5 flex flex-col gap-4 lg:gap-5 text-left order-1 lg:order-2 lg:pt-2"
          >
            {content.eyebrow.trim() && (
              <motion.div
                variants={itemVariants}
                className="text-[10px] font-mono font-black uppercase tracking-[0.28em] text-cyan-400/80"
              >
                {content.eyebrow}
              </motion.div>
            )}

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white font-sans max-w-2xl uppercase"
            >
              <span className="block drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] leading-tight text-white">
                {content.headline_primary}
              </span>
              <span className="block mt-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,153,255,0.45)] leading-tight glow-text-cyan">
                {content.headline_accent}
              </span>
            </motion.h1>

            <motion.h2
              variants={itemVariants}
              className="text-xs sm:text-sm font-bold text-cyan-300 tracking-wider uppercase font-mono leading-relaxed glow-text-cyan/70"
            >
              {content.subtitle}
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="max-w-xl text-sm sm:text-base leading-relaxed text-gray-250 tracking-wide font-sans"
            >
              {content.description}
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1"
            >
              {renderButton('btn-conoce-trabajo', content.primary_button_label, content.primary_button_action, 'cyan')}
              {renderButton('btn-explorar-dashboard', content.secondary_button_label, content.secondary_button_action, 'white')}
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-0"
            >
              {renderButton('btn-documentales', content.tertiary_button_label, content.tertiary_button_action, 'white')}
              {renderButton('btn-academia-afi', content.quaternary_button_label, content.quaternary_button_action, 'cyan')}
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-3 mt-3 text-gray-300">
              <div className="flex h-8 w-8 shrink-0 items-center justify-start">
                <Target className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-sm sm:text-base text-gray-200 tracking-wide font-sans">
                {content.support_statement}
              </span>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 lg:mt-8"
        >
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
                Detectamos senales tempranas de tension social.
              </p>
            </div>
          </motion.div>

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
                ANALISIS AVANZADO
              </h4>
              <p className="text-xs sm:text-sm lg:text-[15px] text-cyan-300 font-bold mt-1.5 leading-relaxed font-sans">
                Ciencia de datos aplicada a la sociologia.
              </p>
            </div>
          </motion.div>

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
                INFORMACION PARA DECIDIR
              </h4>
              <p className="text-xs sm:text-sm lg:text-[15px] text-cyan-300 font-bold mt-1.5 leading-relaxed font-sans">
                Reportes claros para tomadores de decisiones.
              </p>
            </div>
          </motion.div>

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
                FORMACION DE TALENTO
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
