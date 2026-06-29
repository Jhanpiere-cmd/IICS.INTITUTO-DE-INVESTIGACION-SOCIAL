import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, 
  TrendingUp, 
  Globe, 
  Map as MapIcon, 
  MessageSquare, 
  AlertCircle, 
  Search, 
  ArrowUpRight, 
  Activity,
  Calendar,
  Zap,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';

// Datos simulados para el prototipo inicial
const trendsData = [
  { name: 'Ene', interes: 45, conflictos: 20 },
  { name: 'Feb', interes: 52, conflictos: 25 },
  { name: 'Mar', interes: 85, conflictos: 60 },
  { name: 'Abr', interes: 70, conflictos: 45 },
  { name: 'May', interes: 95, conflictos: 80 },
];

const regionalInterest = [
  { region: 'Cajamarca', score: 98, trend: '+12%' },
  { region: 'Puno', score: 85, trend: '+5%' },
  { region: 'Cusco', score: 72, trend: '-2%' },
  { region: 'Lima', score: 65, trend: '+18%' },
  { region: 'Arequipa', score: 58, trend: '+4%' },
];

const newsFeed = [
  { 
    id: 1, 
    source: 'GDELT Project', 
    title: 'Aumento de actividad social en el corredor minero sur', 
    time: 'Hace 15 min', 
    sentiment: 'Alerta',
    category: 'Conflicto Social'
  },
  { 
    id: 2, 
    source: 'Google Trends', 
    title: 'Tendencia: Búsquedas de "Sociología Rural" en Cajamarca aumentaron 150%', 
    time: 'Hace 1 hora', 
    sentiment: 'Oportunidad',
    category: 'Académico'
  },
  { 
    id: 3, 
    source: 'TikTok Research', 
    title: 'Viral: Audio sobre metodología de investigación educativa en Perú', 
    time: 'Hace 3 horas', 
    sentiment: 'Neutral',
    category: 'Digital'
  }
];

export const RadarView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'gdelt' | 'social'>('trends');

  return (
    <div className="min-h-screen bg-[#000000] text-white p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header Estratégico */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-exec-blue/10 rounded-sm border border-exec-blue/30">
              <Radar className="w-6 h-6 text-exec-blue" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Radar ACS</h1>
          </div>
          <p className="text-gray-500 text-sm font-medium tracking-wide">
            CENTRO DE INTELIGENCIA ESTRATÉGICA Y MONITOREO SOCIAL
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-exec-blue tracking-widest uppercase">Sistema Activo</span>
            <span className="text-xs font-mono text-gray-400">SYNC_STATUS: LIVE_DATA</span>
          </div>
          <div className="w-2 h-2 bg-exec-green rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Panel de Control (8 col) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Navegación por Tabs */}
          <div className="flex p-1 bg-[#0D0D0D] border border-exec-border rounded-sm w-fit">
            <button 
              onClick={() => setActiveTab('trends')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'trends' ? 'bg-exec-blue text-white' : 'text-gray-500 hover:text-white'}`}
            >
              Tendencias Google
            </button>
            <button 
              onClick={() => setActiveTab('gdelt')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'gdelt' ? 'bg-exec-blue text-white' : 'text-gray-500 hover:text-white'}`}
            >
              Eventos GDELT
            </button>
            <button 
              onClick={() => setActiveTab('social')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'social' ? 'bg-exec-blue text-white' : 'text-gray-500 hover:text-white'}`}
            >
              Social Listening
            </button>
          </div>

          {/* Gráfico Principal */}
          <div className="bg-[#0A0A0A] border border-exec-border rounded-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp className="w-32 h-32" />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white">Análisis de Interés Sociológico</h3>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Volumen de búsquedas vs Eventos sociales (Perú)</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-exec-blue rounded-full" />
                  <span className="text-[10px] text-gray-400">Interés Académico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-exec-red rounded-full" />
                  <span className="text-[10px] text-gray-400">Conflictividad</span>
                </div>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData}>
                  <defs>
                    <linearGradient id="colorInteres" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0088FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0088FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#444" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#444" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ background: '#0D0D0D', border: '1px solid #1F1F1F', fontSize: '10px' }}
                    itemStyle={{ fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="interes" stroke="#0088FF" strokeWidth={3} fillOpacity={1} fill="url(#colorInteres)" />
                  <Area type="monotone" dataKey="conflictos" stroke="#EF4444" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cards de Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0A0A0A] border border-exec-border p-5 rounded-sm group hover:border-exec-blue/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <Globe className="w-4 h-4 text-exec-blue" />
                <span className="text-[9px] font-black text-gray-500 uppercase">Alcance Global</span>
              </div>
              <p className="text-2xl font-black text-white">45.2K</p>
              <p className="text-[10px] text-exec-green font-bold mt-1">+2.4% vs mes anterior</p>
            </div>
            
            <div className="bg-[#0A0A0A] border border-exec-border p-5 rounded-sm group hover:border-exec-blue/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-[9px] font-black text-gray-500 uppercase">Puntos de Calor</span>
              </div>
              <p className="text-2xl font-black text-white">12</p>
              <p className="text-[10px] text-purple-400 font-bold mt-1">Regiones activas</p>
            </div>

            <div className="bg-[#0A0A0A] border border-exec-border p-5 rounded-sm group hover:border-exec-blue/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-[9px] font-black text-gray-500 uppercase">Voz Social</span>
              </div>
              <p className="text-2xl font-black text-white">89%</p>
              <p className="text-[10px] text-yellow-400 font-bold mt-1">Sentimiento Positivo</p>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Inteligencia en Vivo (4 col) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Feed de Inteligencia */}
          <div className="bg-[#0D0D0D] border border-exec-border rounded-sm h-full flex flex-col">
            <div className="p-4 border-b border-exec-border bg-[#111] flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Señales de Inteligencia</h3>
              <button className="text-[9px] font-black text-exec-blue uppercase hover:underline">Ver todo</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[600px] custom-scrollbar">
              {newsFeed.map((item) => (
                <div key={item.id} className="p-4 bg-black/40 border border-[#1F1F1F] rounded-sm hover:border-exec-blue/30 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black text-exec-blue px-2 py-0.5 bg-exec-blue/10 border border-exec-blue/20 uppercase">
                      {item.source}
                    </span>
                    <span className="text-[8px] text-gray-600 uppercase font-bold">{item.time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-200 leading-relaxed mb-3 group-hover:text-white">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        item.sentiment === 'Alerta' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                        item.sentiment === 'Oportunidad' ? 'bg-exec-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                        'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      }`} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">{item.sentiment}</span>
                    </div>
                    <button className="p-1 hover:bg-[#222] rounded-full transition-colors text-gray-600 hover:text-exec-blue">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 mt-auto border-t border-exec-border">
              <div className="p-4 bg-exec-blue/5 border border-exec-blue/20 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-3 h-3 text-exec-blue" />
                  <span className="text-[10px] font-black text-exec-blue uppercase">Resumen IA HOYR</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  "El interés en temas rurales está en su pico anual. Se recomienda programar el lanzamiento del boletín de Mayo enfocado en la zona de Cajamarca."
                </p>
              </div>
            </div>
          </div>

          {/* Ranking Regional */}
          <div className="bg-[#0A0A0A] border border-exec-border rounded-sm p-5">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6">Tracción por Regiones</h3>
            <div className="space-y-4">
              {regionalInterest.map((reg) => (
                <div key={reg.region} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-[#111] border border-exec-border flex items-center justify-center text-[10px] font-black">
                      {reg.region.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-bold text-gray-300">{reg.region}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-white">{reg.score}%</p>
                    <p className={`text-[9px] font-bold ${reg.trend.startsWith('+') ? 'text-exec-green' : 'text-exec-red'}`}>
                      {reg.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Footer Tecnológico */}
      <div className="mt-12 pt-6 border-t border-exec-border flex flex-col md:flex-row items-center justify-between gap-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white/10 rounded-sm" />
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">GDELT Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white/10 rounded-sm" />
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">SerpApi V2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white/10 rounded-sm" />
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">TikTok Res.</span>
          </div>
        </div>
        <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">
          Powered by ACS Intelligence Systems
        </p>
      </div>
    </div>
  );
};
