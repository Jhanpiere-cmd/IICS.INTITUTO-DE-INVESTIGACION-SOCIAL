import { useState, useEffect } from 'react';
import { Home, Landmark, LineChart, MapPin, Bell, BookOpen, Settings, ArrowUp, AlertTriangle, MessageSquare, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProvinceData, Alert, EmergentTheme } from '../types';

interface DashboardMockupProps {
  provinces: ProvinceData[];
  alerts: Alert[];
  themes: EmergentTheme[];
  onSelectProvince: (provinceId: string) => void;
  selectedProvinceId: string;
  onOpenAlertsModal: () => void;
}

export default function DashboardMockup({
  provinces,
  alerts,
  themes,
  onSelectProvince,
  selectedProvinceId,
  onOpenAlertsModal
}: DashboardMockupProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId) || provinces[0];

  // Rotate custom notices on the mini ticker automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlertIndex((prev) => (prev + 1) % alerts.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [alerts.length]);

  // Sparkline/Line Chart points for risk trend of selected province
  // Generating a stable pseudo-random walk based on province ID name length
  const getTrendPoints = (id: string) => {
    const baseIndex = id.length * 3;
    const values = [
      ((baseIndex + 2) % 6) + 2,
      ((baseIndex + 5) % 6) + 3,
      ((baseIndex + 1) % 6) + 2.5,
      ((baseIndex + 7) % 6) + 4,
      ((baseIndex + 3) % 6) + 3.8,
      selectedProvince.riskScore
    ];
    return values;
  };

  const trendValues = getTrendPoints(selectedProvince.id);
  const maxVal = 10;
  
  // Create path definitions for line chart inside 160x60 SVG
  const width = 160;
  const height = 65;
  const padding = 5;
  const xSpan = (width - padding * 2) / (trendValues.length - 1);
  const pointsString = trendValues
    .map((val, idx) => {
      const x = padding + idx * xSpan;
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const areaString = `${padding},${height - padding} ${pointsString} ${width - padding},${height - padding}`;

  return (
    <div id="interactive-mockup" className="relative w-full rounded-none bg-black p-[1px] shadow-[0_0_50px_rgba(0,153,255,0.08)] ring-1 ring-gray-800/80 overflow-hidden">
      
      {/* Visual background gradient grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-30"></div>
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]"></div>
      
      <div className="relative flex h-full min-h-[270px] lg:min-h-[290px] xl:min-h-[310px] w-full bg-black">
        
        {/* Vertical Left Tray Icons */}
        <div className="flex flex-col items-center gap-1.5 lg:gap-2 border-r border-gray-800/60 bg-black py-1.5 lg:py-2.5 px-1.5 lg:px-2">
          <button 
            id="tray-home" 
            onClick={() => setActiveTab('home')}
            className={`group relative flex h-7 w-7 items-center justify-center rounded-none transition-all ${
              activeTab === 'home' 
                ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(0,153,255,0.5)]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-none whitespace-nowrap transition-all">
              Observatorio
            </span>
          </button>

          <button 
            id="tray-provinces" 
            onClick={() => setActiveTab('provinces')}
            className={`group relative flex h-7 w-7 items-center justify-center rounded-none transition-all ${
              activeTab === 'provinces' 
                ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(0,153,255,0.5)]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Landmark className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-none whitespace-nowrap transition-all">
              Provincias
            </span>
          </button>

          <button 
            id="tray-analytics" 
            onClick={() => setActiveTab('analytics')}
            className={`group relative flex h-7 w-7 items-center justify-center rounded-none transition-all ${
              activeTab === 'analytics' 
                ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(0,153,255,0.5)]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LineChart className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-none whitespace-nowrap transition-all">
              Estadísticas
            </span>
          </button>

          <button 
            id="tray-map" 
            onClick={() => {
              setActiveTab('home');
              const mapSection = document.getElementById('observatorio');
              if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group relative flex h-7 w-7 items-center justify-center rounded-none text-gray-400 hover:text-cyan-400 transition-all font-sans"
          >
            <MapPin className="h-4 w-4 transition-transform group-hover:scale-110 animate-bounce" />
            <span className="absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-none whitespace-nowrap transition-all">
              Mapa Completo
            </span>
          </button>

          <button 
            id="tray-notifications" 
            onClick={onOpenAlertsModal}
            className="group relative flex h-7 w-7 items-center justify-center rounded-none text-gray-400 hover:text-cyan-400 transition-all"
          >
            <div className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            </div>
            <span className="absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-none whitespace-nowrap transition-all">
              Alertas de Conflicto
            </span>
          </button>

          <button 
            id="tray-books" 
            onClick={() => setActiveTab('library')}
            className={`group relative flex h-7 w-7 items-center justify-center rounded-none transition-all ${
              activeTab === 'library' 
                ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(0,153,255,0.5)]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span className="absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-none whitespace-nowrap transition-all">
              Biblioteca
            </span>
          </button>

          <div className="mt-auto pt-4 border-t border-gray-900">
            <button 
              id="tray-settings" 
              className="group relative flex h-7 w-7 items-center justify-center rounded-none text-gray-400 hover:text-cyan-400 transition-all"
            >
              <Settings className="h-4 w-4 animate-[spin_8s_linear_infinite]" />
              <span className="absolute left-14 z-50 scale-0 group-hover:scale-100 bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-none whitespace-nowrap transition-all">
                Configuración
              </span>
            </button>
          </div>
        </div>

        {/* Workspace Display Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-black p-2 lg:p-2.5">
          
          {/* Header of Screen */}
          <div className="flex items-center justify-between border-b border-gray-800/80 pb-1 mb-1.5 xl:mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
              <h3 className="text-xs font-bold tracking-wider text-cyan-400 uppercase font-mono">
                MONITOR REGIONAL (IICS)
              </h3>
            </div>
            
            {/* Quick dropdown for province choice */}
            <select
              id="selector-provincia-mini"
              value={selectedProvince.id}
              onChange={(e) => onSelectProvince(e.target.value)}
              className="bg-gray-900 border border-gray-800 text-[11px] text-gray-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              {provinces.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 h-full"
            >
              
              {/* MAIN METRIC CARD */}
              <div className="md:col-span-7 flex flex-col gap-1.5 p-0">
                
                {/* Conflict Index Panel */}
                <div className="bg-black/60 border border-gray-900 rounded-none p-2 lg:p-2.5 flex flex-col gap-1 relative overflow-hidden group hover:border-gray-800/80 transition-all">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-cyan-400/5 to-transparent rounded-none"></div>
                  
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 tracking-wide uppercase font-mono">
                        Índice de Conflictividad
                      </h4>
                      <p className="text-[9px] text-gray-500">Provincia: <b className="text-white">{selectedProvince.name}</b></p>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-none">
                      <span className="h-1.5 w-1.5 rounded-none bg-emerald-400 animate-pulse"></span>
                      12% tendencia
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 mt-1">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-black text-white font-mono leading-none">
                        {selectedProvince.riskScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">/10</span>
                    </div>

                    <div className="flex flex-col">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-none ${
                        selectedProvince.riskDescription === 'Alto' 
                          ? 'text-red-400 bg-red-950/40 border border-red-500/20' 
                          : selectedProvince.riskDescription === 'Moderado'
                          ? 'text-yellow-400 bg-yellow-950/40 border border-yellow-500/20'
                          : 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/20'
                      }`}>
                        {selectedProvince.riskDescription}
                      </span>
                      <span className="text-[9px] text-gray-500 mt-1">Nivel actual</span>
                    </div>

                    {/* Chart Container */}
                    <div className="ml-auto w-[100px] h-[38px] relative">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0099ff" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#0099ff" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area shading */}
                        <polygon points={areaString} fill="url(#chartGrad)" />
                        {/* Line path */}
                        <polyline
                          fill="none"
                          stroke="#0099ff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={pointsString}
                        />
                        {/* Indicator points */}
                        {trendValues.map((val, idx) => {
                          const x = padding + idx * xSpan;
                          const y = height - padding - (val / maxVal) * (height - padding * 2);
                          const isLast = idx === trendValues.length - 1;
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r={isLast ? 3.5 : 1.5}
                              fill={isLast ? '#0099ff' : '#334155'}
                              className={isLast ? 'animate-ping' : ''}
                            />
                          );
                        })}
                      </svg>
                      <span className="absolute bottom-0 right-0 text-[8px] font-mono text-gray-500">
                        vs. mes anterior
                      </span>
                    </div>
                  </div>

                  {/* Active alert indicator */}
                  {selectedProvince.activeAlert ? (
                    <div className="flex items-center gap-2 bg-red-950/20 border border-red-500/10 rounded-none p-2 text-[10px]">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-red-400">ALERTA ACTIVA:</span>{' '}
                        <span className="text-gray-300">{selectedProvince.activeAlert}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-950 border border-gray-900 rounded-none p-2 text-[10px] text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-none bg-cyan-500"></span>
                      Sin alertas de alta prioridad reportadas hoy.
                    </div>
                  )}

                  {/* Issues lists tags */}
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {selectedProvince.keyIssues.slice(0, 3).map((issue, idx) => (
                      <span key={idx} className="text-[8px] text-cyan-300 bg-cyan-950/20 border border-cyan-800/20 px-1.5 py-0.5 rounded-none">
                        #{issue}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Heatmap Card Mini Map */}
                <div className="bg-black/60 border border-gray-900 rounded-none p-2 lg:p-2.5 flex flex-col flex-1 min-h-[85px] lg:min-h-[95px] xl:min-h-[105px] relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-400 tracking-wide uppercase font-mono">
                      Mapa de Alertas
                    </span>
                    <div className="flex items-center gap-3 text-[9px] font-mono">
                      <span className="flex items-center gap-1 text-red-400">
                        <span className="h-1.5 w-1.5 rounded-none bg-red-500"></span> Alto
                      </span>
                      <span className="flex items-center gap-1 text-yellow-400">
                        <span className="h-1.5 w-1.5 rounded-none bg-yellow-500"></span> Medio
                      </span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <span className="h-1.5 w-1.5 rounded-none bg-blue-500"></span> Bajo
                      </span>
                    </div>
                  </div>

                  <div className="relative flex-1 flex items-center justify-center bg-gray-950/50 rounded-none border border-gray-900 overflow-hidden">
                    {/* Outline of Cajamarca provinces in miniature */}
                    <svg viewBox="0 0 500 700" className="opacity-40 h-full max-h-[70px] lg:max-h-[80px] xl:max-h-[85px] w-auto max-w-[130px] text-slate-800">
                       {provinces.map((prov) => (
                        <g key={prov.id} className="cursor-pointer" onClick={() => onSelectProvince(prov.id)}>
                          <circle
                            cx={prov.coordinates.x}
                            cy={prov.coordinates.y}
                            r="12"
                            fill="transparent"
                          />
                          <circle
                            cx={prov.coordinates.x}
                            cy={prov.coordinates.y}
                            r={prov.id === selectedProvinceId ? '8' : '4'}
                            fill={
                                prov.riskScore >= 7
                                  ? '#f87171'
                                  : prov.riskScore >= 4
                                  ? '#fbbf24'
                                  : '#60a5fa'
                            }
                            className={prov.id === selectedProvinceId ? 'animate-ping' : ''}
                          />
                          {prov.id === selectedProvinceId && (
                            <circle
                              cx={prov.coordinates.x}
                              cy={prov.coordinates.y}
                              r="15"
                              stroke="#0099ff"
                              strokeWidth="1"
                              fill="none"
                              className="animate-spin"
                              strokeDasharray="4,4"
                            />
                          )}
                        </g>
                      ))}
                    </svg>

                    {/* Radial background glowing centers */}
                    <div className="absolute top-2/3 left-1/2 h-14 w-14 rounded-full bg-red-500/20 blur-xl animate-pulse"></div>
                    <div className="absolute top-1/3 left-1/3 h-10 w-10 rounded-full bg-yellow-500/10 blur-xl"></div>

                    {/* Miniature hovering tooltip info */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-gray-900/90 border border-gray-800 rounded-none p-1.5 text-[9px] flex items-center justify-between">
                      <span className="text-gray-400 font-medium">Zona caliente detectada:</span>
                      <span className="text-red-400 font-bold uppercase tracking-tight flex items-center gap-1">
                        <Flame className="h-3 w-3 text-red-500" />
                        Hualgayoc-Cajamarca
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT SUB COLUMN */}
              <div className="md:col-span-5 flex flex-col gap-1.5">
                
                {/* Social Mentions tracker */}
                <div className="bg-black/60 border border-gray-900 rounded-none p-2 lg:p-2.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 tracking-wide uppercase font-mono">
                      Redes Sociales
                    </span>
                    <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/20 py-0.5 px-2 rounded-none border border-cyan-900/10">
                      Menciones
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-white font-mono tracking-tight">
                        {selectedProvince.mencionesRedes.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-gray-500">Posteos indexados</span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold font-mono">
                      <ArrowUp className="h-3 w-3" />
                      +23%
                      <span className="text-[8px] text-gray-500 font-normal">vs. anterior</span>
                    </div>
                  </div>

                  {/* Sparkline mini bars */}
                  <div className="flex items-end justify-between h-4.5 gap-0.5 mt-0.5">
                    {[35, 45, 25, 60, 40, 75, 55, 90, 65, 80, 95, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-gray-800 rounded-none h-full relative group">
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-cyan-500 hover:bg-cyan-300 rounded-none transition-all duration-300" 
                          style={{ height: `${h}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emergent Themes Progress Indicator */}
                <div className="bg-black/60 border border-gray-900 rounded-none p-2 lg:p-2.5 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-gray-400 tracking-wide uppercase font-mono">
                    Temas Emergentes
                  </span>
                  
                  <div className="space-y-1 mt-0.5">
                    {themes.slice(0, 3).map((theme) => (
                      <div key={theme.name} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-300 font-medium truncate">{theme.name}</span>
                          <span className="text-cyan-400 font-bold font-mono">{theme.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-950 h-1.5 rounded-none overflow-hidden border border-gray-900">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${theme.percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest Alerts Loop Ticker */}
                <div className="bg-black/60 border border-gray-900 rounded-none p-2 lg:p-2.5 flex flex-col flex-1 justify-between gap-1 min-h-[75px] lg:min-h-[85px] xl:min-h-[95px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 tracking-wide uppercase font-mono">
                      Últimas Alertas
                    </span>
                    <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                  </div>

                  <div className="h-8 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      {alerts.map((alert, index) => {
                        if (index !== currentAlertIndex) return null;
                        return (
                          <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 flex flex-col justify-center"
                          >
                            <div className="flex items-center gap-1.5 text-[8px] font-mono mb-0.5">
                              <span className={`px-1 py-0.2 px-1.5 rounded-none uppercase leading-none font-extrabold ${
                                alert.type === 'Alto' 
                                  ? 'text-red-400 bg-red-950/50' 
                                  : 'text-yellow-400 bg-yellow-950/50'
                              }`}>
                                {alert.type}
                              </span>
                              <span className="text-gray-500">{alert.time}</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-cyan-400 font-bold">{alert.province}</span>
                            </div>
                            <h5 className="text-[9.5px] font-bold text-white truncate leading-none">
                              {alert.title}
                            </h5>
                            <p className="text-[8.5px] text-gray-400 line-clamp-1 mt-0.5 leading-none">
                              {alert.description}
                            </p>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  <button
                    id="btn-alertas-more"
                    onClick={onOpenAlertsModal}
                    className="w-full text-center text-[9px] font-bold text-cyan-400 hover:text-cyan-200 border-t border-gray-800/80 pt-1.5 transition-colors uppercase font-mono tracking-wider cursor-pointer"
                  >
                    Ver todas las alertas regionales →
                  </button>
                </div>

              </div>
              
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
      
    </div>
  );
}
