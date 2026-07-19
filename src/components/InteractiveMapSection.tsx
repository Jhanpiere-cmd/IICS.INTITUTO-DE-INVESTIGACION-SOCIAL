import { useState } from 'react';
import { ArrowRight, Info, AlertOctagon, HelpCircle, Laptop } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProvinceData } from '../types';
import { networkConnections } from '../data';

interface InteractiveMapSectionProps {
  provinces: ProvinceData[];
  onSelectProvince: (provinceId: string) => void;
  selectedProvinceId: string;
  onOpenPortal: () => void;
}

export default function InteractiveMapSection({
  provinces,
  onSelectProvince,
  selectedProvinceId,
  onOpenPortal
}: InteractiveMapSectionProps) {
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);

  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId) || provinces[0];

  const getRiskColor = (score: number) => {
    if (score >= 7) return 'text-red-400 fill-red-500 bg-red-950/20 stroke-red-500/40 border-red-500/25';
    if (score >= 4) return 'text-yellow-400 fill-yellow-500 bg-yellow-950/20 stroke-yellow-500/40 border-yellow-500/25';
    return 'text-cyan-400 fill-cyan-500 bg-cyan-950/20 stroke-cyan-500/40 border-cyan-500/25';
  };

  const getRiskBadgeColor = (risk: string) => {
    if (risk === 'Alto') return 'text-red-400 bg-red-950/40 border-red-500/25';
    if (risk === 'Moderado') return 'text-yellow-400 bg-yellow-950/40 border-yellow-500/25';
    return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/25';
  };

  return (
    <section id="observatorio" className="py-24 border-t border-gray-950 bg-transparent relative overflow-hidden">
      
      {/* Visual glowing meshes background */}
      <div className="absolute top-1/2 left-3/4 -translate-y-1/2 h-96 w-96 rounded-full bg-cyan-500/5 blur-[120px] -z-10"></div>
      <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-blue-500/5 blur-[100px] -z-10"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
          
          {/* Left Text & Detailed Statistics */}
          <div className="lg:col-span-4 flex flex-col justify-between py-2 text-left">
            <div>
              <div className="flex items-center gap-3 self-start mb-5 max-w-max">
                <img src="/icono-iics.png" alt="IICS" className="h-6 w-6 object-contain" />
                <span className="text-xs font-bold text-cyan-400 uppercase font-mono tracking-wider">Geointeligencia Local</span>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Observatorio Sociológico de Cajamarca
              </h2>
              
              <div className="mt-4 h-1 w-16 bg-cyan-400 rounded-none"></div>

              <p className="mt-6 text-sm sm:text-base leading-relaxed text-gray-200">
                Plataforma de monitoreo y análisis continuo que integra datos de medios, redes sociales, encuestas y fuentes oficiales para anticipar dinámicas sociales.
              </p>

              {/* ACTION TRIGGER BUTTON */}
              <button
                id="btn-nav-observatorio"
                onClick={onOpenPortal}
                className="group inline-flex items-center gap-2 rounded-none bg-transparent hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 px-5 py-3 text-sm font-bold tracking-wide transition-all mt-8 cursor-pointer"
              >
                Ir al Observatorio
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* General Highlights Counter List */}
            <p className="text-[9px] font-mono text-amber-400/60 uppercase tracking-wider mb-4">
              * Cifras con asterisco: referencia ilustrativa de demostración
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-gray-800/80 pt-10 mt-4 select-none">
              <div>
                <span className="block text-4xl font-extrabold tracking-tight text-white font-mono glow-text-cyan">
                  125*
                </span>
                <span className="block text-xs text-gray-400 mt-1 font-medium font-sans">
                  Indicadores monitoreados
                </span>
              </div>

              <div>
                <span className="block text-4xl font-extrabold tracking-tight text-cyan-400 font-mono">
                  24/7
                </span>
                <span className="block text-xs text-gray-400 mt-1 font-medium font-sans">
                  Monitoreo continuo
                </span>
              </div>

              <div>
                <span className="block text-4xl font-extrabold tracking-tight text-white font-mono">
                  13
                </span>
                <span className="block text-xs text-gray-400 mt-1 font-medium font-sans">
                  Provincias cubiertas
                </span>
              </div>

              <div>
                <span className="block text-4xl font-extrabold tracking-tight text-cyan-400 font-mono">
                  +50*
                </span>
                <span className="block text-xs text-gray-400 mt-1 font-medium font-sans">
                  Fuentes de información
                </span>
              </div>
            </div>

          </div>

          {/* Center Column: Interactive Network Map */}
          <div className="lg:col-span-5 flex items-center justify-center relative min-h-[480px] glass-card rounded-none p-4 overflow-hidden">
            
            {/* Holographic scanner active beams */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent animate-pulse"></div>
            
            <svg 
              viewBox="0 0 500 700" 
              className="w-full max-w-[430px] h-auto text-slate-800 overflow-visible relative"
            >
              <defs>
                <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0099ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0099ff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Connected Network Paths */}
              {networkConnections.map((conn, idx) => {
                const fromNode = provinces.find((p) => p.id === conn.from);
                const toNode = provinces.find((p) => p.id === conn.to);
                
                if (!fromNode || !toNode) return null;
                
                const isSelectedLine = fromNode.id === selectedProvinceId || toNode.id === selectedProvinceId;
                
                return (
                  <motion.line
                    key={idx}
                    x1={fromNode.coordinates.x}
                    y1={fromNode.coordinates.y}
                    x2={toNode.coordinates.x}
                    y2={toNode.coordinates.y}
                    stroke={isSelectedLine ? '#0099ff' : '#1e293b'}
                    strokeWidth={isSelectedLine ? '2' : '1'}
                    strokeDasharray={isSelectedLine ? 'none' : '4,4'}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2 }}
                    className="transition-colors duration-300"
                  />
                );
              })}

              {/* Interactive Province Nodes */}
              {provinces.map((prov) => {
                const isSelected = prov.id === selectedProvinceId;
                const isHovered = prov.id === hoveredProvinceId;
                const riskColorVal = getRiskColor(prov.riskScore);
                
                return (
                  <g 
                    key={prov.id}
                    onMouseEnter={() => setHoveredProvinceId(prov.id)}
                    onMouseLeave={() => setHoveredProvinceId(null)}
                    onClick={() => onSelectProvince(prov.id)}
                    className="cursor-pointer group select-none"
                  >
                    {/* Glowing outer aura for hovered/selected nodes */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={prov.coordinates.x}
                        cy={prov.coordinates.y}
                        r="24"
                        fill="url(#nodeGlow)"
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Holographic Radar Pulse Rings */}
                    {(isSelected || isHovered || prov.riskScore >= 7) && (
                      <g>
                        <circle
                          cx={prov.coordinates.x}
                          cy={prov.coordinates.y}
                          r="18"
                          fill="none"
                          stroke={prov.riskScore >= 7 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(0, 153, 255, 0.45)'}
                          strokeWidth="1.5"
                          className="radar-ring-1 origin-center"
                          style={{ transformOrigin: `${prov.coordinates.x}px ${prov.coordinates.y}px` }}
                        />
                        <circle
                          cx={prov.coordinates.x}
                          cy={prov.coordinates.y}
                          r="18"
                          fill="none"
                          stroke={prov.riskScore >= 7 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(0, 153, 255, 0.45)'}
                          strokeWidth="1"
                          className="radar-ring-2 origin-center"
                          style={{ transformOrigin: `${prov.coordinates.x}px ${prov.coordinates.y}px` }}
                        />
                      </g>
                    )}

                    {/* Outer border line ring */}
                    <circle
                      cx={prov.coordinates.x}
                      cy={prov.coordinates.y}
                      r={isSelected ? '14' : '9'}
                      fill="#000000"
                      stroke={isSelected ? '#0099ff' : isHovered ? '#3b82f6' : '#1e293b'}
                      strokeWidth={isSelected ? '2' : '1'}
                      className="transition-all duration-300"
                    />

                    {/* Central active core core */}
                    <circle
                      cx={prov.coordinates.x}
                      cy={prov.coordinates.y}
                      r={isSelected ? '6' : '4'}
                      className={`transition-all duration-300 ${
                        prov.riskScore >= 7 
                          ? 'fill-red-500 text-red-500' 
                          : prov.riskScore >= 4 
                          ? 'fill-yellow-500 text-yellow-500' 
                          : 'fill-cyan-500 text-cyan-500'
                      }`}
                    />

                    {/* Province short acronym or label on map */}
                    <text
                      x={prov.coordinates.x}
                      y={prov.coordinates.y - (isSelected ? 20 : 14)}
                      textAnchor="middle"
                      className={`text-[8px] md:text-[9px] font-mono tracking-tight transition-all uppercase select-none ${
                        isSelected 
                          ? 'fill-cyan-400 font-extrabold' 
                          : isHovered 
                          ? 'fill-white font-semibold' 
                          : 'fill-gray-500 font-medium'
                      }`}
                    >
                      {prov.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay (absolute relative to container) */}
            <AnimatePresence>
              {hoveredProvinceId && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-card rounded-none px-4 py-2.5 shadow-2xl text-left min-w-[200px] z-20"
                >
                  {(() => {
                    const hp = provinces.find((p) => p.id === hoveredProvinceId);
                    if (!hp) return null;
                    return (
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-xs font-bold text-white">{hp.name}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-none ${getRiskBadgeColor(hp.riskDescription)}`}>
                            Riesgo: {hp.riskScore.toFixed(1)} /10
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <span className="h-1.5 w-1.5 rounded-none bg-cyan-400"></span>
                          <span>{hp.indicators[0].label}: {hp.indicators[0].value}</span>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Selected Province Inspector Card */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedProvinceId}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="glass-card rounded-none p-6 shadow-xl text-left h-full flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3.5 mb-4">
                    <h3 className="text-lg font-bold text-white">{selectedProvince.name}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-none ${getRiskBadgeColor(selectedProvince.riskDescription)}`}>
                      Riesgo {selectedProvince.riskDescription}
                    </span>
                  </div>

                  {/* Main Metric Value */}
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-5xl font-black text-white font-mono leading-none">
                      {selectedProvince.riskScore.toFixed(1)}
                    </span>
                    <span className="text-base text-gray-500 font-mono">/10</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 block mb-5">
                    Nivel del Índice de Riesgo
                  </span>

                  {/* High priority active issue */}
                  {selectedProvince.activeAlert ? (
                    <div className="flex items-start gap-2 bg-red-950/30 border border-red-500/25 rounded-none p-3.5 mt-2 text-xs text-slate-200">
                      <AlertOctagon className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-bold text-red-400 block mb-0.5">Alerta Crítica</span>
                        {selectedProvince.activeAlert}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/10 rounded-none p-3.5 mt-2 text-xs text-emerald-400">
                      <span className="h-2 w-2 rounded-none bg-emerald-400 animate-pulse"></span>
                      Diálogo estable en la provincia
                    </div>
                  )}

                  {/* General indicators list */}
                  <div className="mt-6 space-y-3.5 border-t border-gray-950 pt-5">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                      Variables de Campo
                    </h4>
                    {selectedProvince.indicators.map((ind) => (
                      <div key={ind.label} className="flex justify-between items-center text-xs border-b border-gray-900/40 pb-2">
                        <span className="text-gray-400 font-medium">{ind.label}:</span>
                        <span className="text-white font-bold font-mono">{ind.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-900">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5 leading-tight">
                    <Info className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Seleccione otras provincias directamente en el mapa geopolítico.</span>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>

          </div>

        </div>

      </div>
    </section>
  );
}
