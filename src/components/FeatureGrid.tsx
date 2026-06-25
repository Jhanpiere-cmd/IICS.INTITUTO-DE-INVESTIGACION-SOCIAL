import { useState, useEffect } from 'react';
import { 
  Eye, 
  Cpu, 
  GraduationCap, 
  BookOpen, 
  Film, 
  Code, 
  Activity, 
  ArrowRight,
  TrendingUp,
  Volume2,
  Database,
  Layers,
  Server
} from 'lucide-react';
import { motion } from 'motion/react';

export default function FeatureGrid() {
  const [pulseValue, setPulseValue] = useState(74);
  const [waveformBars, setWaveformBars] = useState<number[]>([35, 18, 55, 28, 65, 42, 85, 48, 60, 32, 50, 38, 75, 22, 58, 42]);
  const [tecnologiaTab, setTecnologiaTab] = useState<'code' | 'network'>('code');

  // Periodic subtle updates so the visualizations look active and alive
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseValue(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return next < 60 ? 63 : next > 90 ? 86 : next;
      });
    }, 1200);

    const waveInterval = setInterval(() => {
      setWaveformBars(prev => prev.map(() => Math.floor(Math.random() * 70) + 15));
    }, 200);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(waveInterval);
    };
  }, []);

  const ecosystemItems = [
    {
      id: 'observatorio',
      badge: 'OSC',
      title: 'Observatorio Sociológico',
      desc: 'Monitoreo territorial avanzado y alertas preventivas.',
      longDesc: 'Seguimiento sistemático y georreferenciado de indicadores de opinión, conflictividad socio-ambiental y demandas ciudadanas en las 13 provincias de Cajamarca. Mediante metodologías mixtas, generamos alertas tempranas de geointeligencia para la toma de decisiones estratégicas.',
      icon: Eye,
      stats: [
        { label: 'COBERTURA', value: '13 PROVINCIAS' },
        { label: 'SISTEMA', value: 'ALERTAS 24/7' },
        { label: 'DIAGNÓSTICO', value: 'PRECISIÓN GIS' }
      ]
    },
    {
      id: 'laboratorio',
      badge: 'LSD',
      title: 'Laboratorio de Sociología Digital',
      desc: 'Minería de opinión pública y procesamiento de lenguaje natural (NLP).',
      longDesc: 'Aplicamos herramientas sofisticadas de inteligencia artificial y ciencia de datos a fenómenos sociales. Procesamos corpus masivos provenientes de redes sociales, medios digitales e interacción vecinal para identificar sentimientos colectivos y patrones de opinión con modelos NLP.',
      icon: Cpu,
      stats: [
        { label: 'MODELO CORE', value: 'BERT-IICS-V2' },
        { label: 'PRECISIÓN', value: '88.5% SCORE' },
        { label: 'ANALÍTICA', value: 'NLP REGIONAL' }
      ]
    },
    {
      id: 'academia',
      badge: 'AFI',
      title: 'Academia de Formación',
      desc: 'Semillero de investigadores de élite de Cajamarca.',
      longDesc: 'Invertimos en el desarrollo intelectual de las próximas generaciones. Nuestro programa exclusivo selecciona a estudiantes universitarios sobresalientes para sumergirlos en proyectos de investigación reales con mentoría directa de investigadores experimentados.',
      icon: GraduationCap,
      stats: [
        { label: 'BECARIOS AFI', value: '25 DE ÉLITE' },
        { label: 'MENTORÍA', value: '4 SÉNIORS' },
        { label: 'COMENTARIOS', value: '100% PRÁCTICO' }
      ]
    },
    {
      id: 'editorial',
      badge: 'IICS Press',
      title: 'Editorial y Publicaciones',
      desc: 'Rigor científico y divulgación indexada e internacional.',
      longDesc: 'Nuestras investigaciones de campo se consolidan en publicaciones de rigor internacional. Producimos boletines bimensuales de tendencias, reportes analíticos y artículos científicos indexados en bases regionales y mundiales como Scopus y SciELO.',
      icon: BookOpen,
      stats: [
        { label: 'INDEXACIÓN', value: 'SCOPUS / SCIELO' },
        { label: 'EVALUACIÓN', value: 'DOBLE CIEGO' },
        { label: 'DIFUSIÓN', value: 'OPEN ACCESS' }
      ]
    },
    {
      id: 'documentales',
      badge: 'IICS Media',
      title: 'Documentales e Incidencia',
      desc: 'Transmedia científica y etnografía audiovisual.',
      longDesc: 'Creemos que el conocimiento debe ser democratizado. Desarrollamos narrativas cinematográficas de gran calidad estética y rigor metodológico para documentar la realidad andina de primera mano, logrando incidencia comunitaria de alto impacto.',
      icon: Film,
      stats: [
        { label: 'RESOLUCIÓN', value: 'TRANSMEDIA 4K' },
        { label: 'METODOLOGÍA', value: 'ETNOGRÁFICO' },
        { label: 'FASES', value: 'CAMPO & EDICIÓN' }
      ]
    },
    {
      id: 'tecnologia',
      badge: 'Zolexy Solutions',
      title: 'Ecosistema Tecnológico',
      desc: 'Plataforma integrada, modelos e infraestructura por Zolexy Solutions.',
      longDesc: 'Zolexy Solutions es la startup de ingeniería de software encargada del diseño, desarrollo y despliegue del ecosistema digital completo de este instituto. Esto incluye el portal web oficial, los modelos avanzados de Inteligencia Artificial para el análisis de sentimiento, las APIs de monitoreo territorial interactivo y el sistema integrado de gestión ERP centralizado, fusionando programación avanzada con diseño de experiencia cognitivo.',
      icon: Code,
      stats: [
        { label: 'INGENIERÍA', value: 'ZOLEXY SOLUTIONS' },
        { label: 'DIS. COGNITIVO', value: 'IA ADAPTATIVA' },
        { label: 'SEDE CENTRAL', value: 'CAJAMARCA, PERÚ' }
      ]
    }
  ];

  const renderVisualization = (id: string) => {
    switch (id) {
      case 'observatorio':
        return (
          <div className="glass-card rounded-xl p-6 font-mono text-[11px] w-full max-w-md mx-auto">
            <div className="flex justify-between items-center text-gray-500 mb-4 border-b border-gray-950 pb-2">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider">
                <Activity className="h-3.5 w-3.5 animate-pulse" /> INDICADOR DE TENSIÓN
              </span>
              <span className="text-[#0099ff] font-bold animate-pulse">SISTEMA OSC VIVO</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-gray-400 font-bold mb-1.5 text-xs">
                  <span>Cajamarca Regional</span>
                  <span>{pulseValue}%</span>
                </div>
                <div className="h-2 bg-gray-950 border border-gray-900 p-0.5 rounded-none">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500" 
                    style={{ width: `${pulseValue}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-cyan-950/25 border border-cyan-500/20 p-2.5">
                <span className="text-amber-500 font-bold block text-[9px] mb-1">ÚLTIMA ALERTA REGIONAL EMITIDA:</span>
                <span className="text-white text-xs block leading-tight">Shugur - Alteración de opinión generalizada</span>
              </div>
            </div>
          </div>
        );

      case 'laboratorio':
        return (
          <div className="glass-card rounded-xl p-6 font-mono text-[11px] w-full max-w-md mx-auto">
            <div className="flex justify-between items-center text-gray-500 mb-4 border-b border-gray-950 pb-2">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">ANALIZADOR NLP SENTIMENTS</span>
              <span className="text-emerald-400 font-bold">ACTIVO</span>
            </div>
            
            <div className="space-y-3">
              <div className="italic text-gray-300 text-[10px] bg-gray-950 p-3 border border-gray-900/50 leading-snug">
                "...el crecimiento de las rondas urbanas asegura la estabilidad local..."
              </div>

              <div className="space-y-1.5">
                <div className="h-3 bg-gray-950 border border-gray-900 p-0.5 flex rounded-none">
                  <div className="bg-emerald-500/80 h-full" style={{ width: '45%' }}></div>
                  <div className="bg-gray-700 h-full" style={{ width: '35%' }}></div>
                  <div className="bg-red-500/80 h-full" style={{ width: '20%' }}></div>
                </div>
                <div className="flex justify-between text-[8px] text-gray-550 font-bold">
                  <span className="text-emerald-400">FAVORABLE (45%)</span>
                  <span>NEUTRAL (35%)</span>
                  <span className="text-red-400">TENSIÓN (20%)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'academia':
        return (
          <div className="glass-card rounded-xl p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center text-gray-500 font-mono text-[10px] mb-4 border-b border-white/[0.06] pb-2">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">ESTADÍSTICAS BECARIOS</span>
              <span className="text-emerald-400 font-bold">CONVOCATORIA ABIERTA</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="glass-card rounded-lg p-4">
                <span className="text-2xl font-black text-white font-mono block">25</span>
                <span className="text-[9px] text-cyan-400 font-mono font-bold mt-1 block uppercase tracking-tight">Becarios</span>
              </div>
              <div className="glass-card rounded-lg p-4">
                <span className="text-2xl font-black text-white font-mono block">4</span>
                <span className="text-[9px] text-gray-500 font-mono font-bold mt-1 block uppercase tracking-tight">Mentores</span>
              </div>
              <div className="glass-card rounded-lg p-4">
                <span className="text-2xl font-black text-white font-mono block">100%</span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold mt-1 block uppercase tracking-tight">Sustento</span>
              </div>
            </div>
          </div>
        );

      case 'editorial':
        return (
          <div className="glass-card rounded-xl p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center text-gray-500 font-mono text-[10px] mb-4 border-b border-white/[0.06] pb-2">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">ÚLTIMO REPOSITORIO CIENTÍFICO</span>
              <span className="text-[#0099ff] font-bold">LIVE PRESS</span>
            </div>

            <div className="space-y-2.5">
              <div className="glass-card rounded-lg p-3 flex justify-between items-center gap-3 hover:border-cyan-500/25 transition-all duration-300">
                <div className="truncate">
                  <span className="text-[8px] text-cyan-400 font-mono font-bold block">SCOPUS PAPER</span>
                  <span className="text-xs font-bold text-white block truncate">Mapeo del Corredor Minero Norte 2026</span>
                </div>
                <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" />
              </div>
              <div className="glass-card rounded-lg p-3 flex justify-between items-center gap-3 hover:border-purple-500/25 transition-all duration-300">
                <div className="truncate">
                  <span className="text-[8px] text-purple-400 font-mono font-bold block">REPOSITORIO IICS</span>
                  <span className="text-xs font-bold text-white block truncate">Inteligencia Comunitaria y Escucha Social</span>
                </div>
                <TrendingUp className="h-4 w-4 text-purple-400 shrink-0" />
              </div>
            </div>
          </div>
        );

      case 'documentales':
        return (
          <div className="glass-card rounded-xl p-5 overflow-hidden aspect-[2.4/1] w-full max-w-md mx-auto flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 font-mono text-[9px] border-b border-gray-950 pb-2">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider">
                <Volume2 className="h-3.5 w-3.5 animate-pulse" /> AUDIO WAVEFORM
              </span>
              <span className="text-emerald-400 font-bold uppercase">TRAILER LISTO</span>
            </div>

            <div className="flex items-end gap-1.5 justify-center h-12 w-full px-2">
              {waveformBars.slice(0, 14).map((barHeight, idx) => (
                <div 
                  key={idx} 
                  className="bg-cyan-500/40 border-t border-cyan-450 w-full transition-all duration-300 rounded-none"
                  style={{ height: `${barHeight}%` }}
                ></div>
              ))}
            </div>

            <div className="text-[9px] font-mono text-gray-400 text-center uppercase tracking-wider mt-1 block truncate">
              PRODUCCIÓN: "VOCES DE LA RURALIDAD"
            </div>
          </div>
        );

      case 'tecnologia':
        return (
          <div className="glass-card rounded-xl w-full max-w-md mx-auto text-left font-mono overflow-hidden">
            {/* Window title bar */}
            <div className="bg-gray-950/80 border-b border-gray-900 px-4 py-2.5 flex justify-between items-center text-[10px]">
              <span className="text-[#0099ff] font-bold tracking-tight uppercase flex items-center gap-2">
                <img 
                  src="https://zolexy.com/assets/ZOLEXY%20logo-i-YD6JBN.png" 
                  alt="Zolexy Solutions" 
                  className="h-3 object-contain inline-block filter brightness-110"
                  referrerPolicy="no-referrer"
                />
                <span className="text-gray-700">|</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0099ff] animate-pulse inline-block" />
                Global Hub
              </span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-800" />
              </div>
            </div>

            {/* Tab switchers */}
            <div className="bg-black border-b border-gray-900 flex text-[9px] text-gray-500 font-bold select-none">
              <button 
                type="button"
                onClick={() => setTecnologiaTab('code')}
                className={`px-4 py-2 border-r border-gray-900 uppercase transition-all ${tecnologiaTab === 'code' ? 'bg-[#030304] text-[#0099ff] border-b border-b-cyan-500' : 'hover:bg-gray-950 hover:text-gray-300'}`}
              >
                sys.cognitive_core
              </button>
              <button 
                type="button"
                onClick={() => setTecnologiaTab('network')}
                className={`px-4 py-2 border-r border-gray-900 uppercase transition-all ${tecnologiaTab === 'network' ? 'bg-[#030304] text-[#0099ff] border-b border-b-cyan-500' : 'hover:bg-gray-950 hover:text-gray-300'}`}
              >
                orbit::geo_sync
              </button>
            </div>

            {/* Tab contents */}
            <div className="p-4 bg-black/40 min-h-[195px] flex flex-col justify-between text-[10px]">
              {tecnologiaTab === 'code' ? (
                <div className="space-y-1.5 leading-relaxed">
                  <div>
                    <span className="text-purple-400">import</span>{' '}
                    <span className="text-cyan-400">{`{ NeuralCore, BehaviorModel }`}</span>{' '}
                    <span className="text-purple-400">from</span>{' '}
                    <span className="text-emerald-400">'@zolexy/cognitive'</span>;
                  </div>
                  <div className="text-gray-600">// Initialize Cognitive Core</div>
                  <div>
                    <span className="text-purple-400">const</span> <span className="text-white">core</span> ={' '}
                    <span className="text-purple-400">new</span> <span className="text-cyan-400">NeuralCore</span>({`{`}
                  </div>
                  <div className="pl-4">
                    <span className="text-gray-300">synapses</span>: <span className="text-emerald-400">'dynamic'</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-gray-300">learningRate</span>: <span className="text-amber-400">0.01</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-gray-300">adaptation</span>: <span className="text-amber-400">true</span>
                  </div>
                  <div>{`});`}</div>
                  <div className="text-gray-600 mt-1">// Sync with Human Behavior</div>
                  <div>
                    <span className="text-white">core.sync(BehaviorModel.</span>
                    <span className="text-cyan-400">HUMAN_CENTRIC</span>
                    <span className="text-white">);</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-purple-400">export const</span> <span className="text-white">boot</span> ={' '}
                    <span className="text-purple-400">async</span> () =&gt; {`{`}
                  </div>
                  <div className="pl-4">
                    <span className="text-purple-400">await</span> <span className="text-white">core.ignite();</span>
                  </div>
                  <div className="pl-4">
                    <span className="text-white">console.log(</span>
                    <span className="text-emerald-400">"Cognitive ecosystem active."</span>
                    <span className="text-white">);</span>
                  </div>
                  <div>{`};`}</div>
                </div>
              ) : (
                <div className="space-y-3 font-sans">
                  <div className="border-b border-gray-950 pb-2">
                    <span className="text-xs font-bold text-white block">Sede Central: Cajamarca, Perú</span>
                    <p className="text-[10px] text-gray-400 mt-1 leading-normal font-sans">
                      Desde la histórica ciudad de Cajamarca exportamos ingeniería de software de élite y diseño cognitivo al mundo entero, garantizando escalabilidad absoluta de sistemas.
                    </p>
                  </div>

                  {/* Latency list */}
                  <div className="space-y-1.5 font-mono text-[9px]">
                    <div className="text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">
                      SYS_ROUTE::CAJ_TO_GLOBAL
                    </div>
                    <div className="flex justify-between items-center text-gray-350">
                      <span>CAJ → MIA (Miami, USA)</span>
                      <span className="text-emerald-400 font-bold">42 ms</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-350">
                      <span>CAJ → FRA (Frankfurt, GER)</span>
                      <span className="text-emerald-400 font-bold">95 ms</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-350">
                      <span>CAJ → NRT (Tokyo, JPN)</span>
                      <span className="text-emerald-400 font-bold">140 ms</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-950 text-[9px] font-mono flex flex-wrap gap-2 text-cyan-400">
                    <span>CAJAMARCA [CORE]</span>
                    <span className="text-gray-600">|</span>
                    <span>LIMA [NODE_01]</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-500">AREQUIPA</span>
                    <span className="text-gray-500">CUSCO</span>
                  </div>
                </div>
              )}

              {/* Console logs styled footer */}
              <div className="border-t border-gray-950 pt-2 mt-4 text-[8px] text-gray-500 flex justify-between uppercase">
                <span>SYS.ACTIVE // LATENCY_STABLE</span>
                <span>PE_CAJ (7.159° S)</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div id="ecosistema" className="bg-transparent pt-4 pb-24 relative overflow-hidden">
      {/* Background radial details */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-cyan-950/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-950/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-left mb-16 max-w-3xl">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#0099ff] uppercase bg-cyan-950/40 border border-cyan-850/60 px-2.5 py-1 select-none">
            Multidimensión Científica
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans mt-3">
            Ecosistema de Investigación Aplicada
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-2 font-sans leading-relaxed max-w-2xl">
            Nuestra estructura de trabajo es completamente integral. Articulamos tecnología de precisión, análisis de opinión pública, formación de cuadros técnicos e incidencia social para consolidar un valor científico único en el norte peruano.
          </p>
        </div>

        {/* Scroll driven continuous layout - information on one side, clean visualization on the other */}
        <div className="space-y-16 lg:space-y-24">
          {ecosystemItems.map((item, idx) => {
            const Icon = item.icon;
            const isEven = idx % 2 === 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center`}
              >
                {/* Information Column */}
                <div 
                  className={`lg:col-span-5 flex flex-col justify-center text-left ${
                    isEven ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3.5">
                    {item.id === 'tecnologia' ? (
                      <img 
                        src="https://zolexy.com/assets/ZOLEXY%20logo-i-YD6JBN.png" 
                        alt="Zolexy Solutions" 
                        className="h-4 sm:h-4.5 object-contain shrink-0 filter brightness-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Icon className="h-5 w-5 text-[#0099ff] shrink-0" />
                    )}
                    <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider bg-cyan-950/40 border border-cyan-900/30 px-2 py-0.5 select-none">
                      {item.badge}
                    </span>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-white tracking-wider font-sans mb-3 uppercase">
                    {item.title}
                  </h4>

                  <p className="text-base sm:text-lg font-bold text-cyan-300 leading-snug mb-3">
                    {item.desc}
                  </p>

                  <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-sans mb-6">
                    {item.longDesc}
                  </p>

                  {/* High quality mini stats list */}
                  <div className="grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-4">
                    {item.stats.map((stat, statIdx) => (
                      <div key={statIdx} className="text-left">
                        <span className="text-[10px] text-gray-400 block font-mono font-bold uppercase tracking-wider">{stat.label}</span>
                        <span className="text-[12px] text-white font-semibold block mt-0.5 leading-none">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Animated Interactive Showcase Visualization Column */}
                <div 
                  className={`lg:col-span-7 flex items-center justify-center ${
                    isEven ? 'lg:order-2' : 'lg:order-1'
                  }`}
                >
                  <div className="w-full relative group">
                    {/* Visual accent backdrop glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/10 to-indigo-950/15 rounded-none blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                    
                    <div className="w-full transform transition-all duration-300 group-hover:scale-[1.01]">
                      {renderVisualization(item.id)}
                    </div>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
