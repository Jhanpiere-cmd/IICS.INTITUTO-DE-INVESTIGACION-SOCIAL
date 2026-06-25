import { Users, BarChart3, Globe2, Radio, ArrowRight, Home, GraduationCap, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { ResearchLine } from '../types';

interface ResearchLinesProps {
  lines: ResearchLine[];
  onOpenDetails: (line: ResearchLine) => void;
}

export default function ResearchLines({ lines, onOpenDetails }: ResearchLinesProps) {
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return <Users className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />;
      case 'Home':
        return <Home className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />;
      case 'BarChart3':
        return <BarChart3 className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />;
      case 'Globe':
        return <Globe2 className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />;
      case 'Radio':
        return <Radio className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />;
      case 'GraduationCap':
        return <GraduationCap className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />;
      case 'Heart':
        return <Heart className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />;
      default:
        return <Users className="h-6 w-6 text-cyan-400" />;
    }
  };

  return (
    <section id="lineas-investigacion" className="py-20 bg-transparent relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="flex flex-col items-center text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Nuestras Líneas de Investigación
          </h2>
          <div className="mt-4 h-1 w-16 bg-cyan-400 rounded-none"></div>
          <p className="mt-4 max-w-xl text-sm sm:text-base text-gray-250 leading-relaxed">
            Aportando rigurosidad metodológica y monitoreo tecnológico para estudiar de manera profunda la realidad estructural de Cajamarca.
          </p>
        </div>

        {/* 5 Cards Bento Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {lines.map((line, idx) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onOpenDetails(line)}
              className="group flex flex-col justify-between glass-card glass-card-hover rounded-xl p-5 cursor-pointer h-full text-left"
            >
              <div>
                {/* Icon and Title horizontally aligned to be compact with no dead space */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="shrink-0 transition-transform group-hover:scale-110 duration-200">
                    {getIcon(line.icon)}
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors leading-snug">
                    {line.title}
                  </h3>
                </div>

                <p className="text-sm text-gray-200 leading-relaxed line-clamp-4">
                  {line.description}
                </p>
              </div>

              {/* Action Saber mas link */}
              <div className="mt-6 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold font-sans text-cyan-400 uppercase tracking-widest group-hover:text-cyan-300">
                <span>Saber más</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
