import React, { useEffect, useState } from 'react';
import { youtubeService } from '../../lib/youtube';
import { 
  Youtube, TrendingUp, Users, Eye, Play, Calendar, 
  ArrowUpRight, ArrowDownRight, BarChart3, Clock,
  AlertCircle, ExternalLink, RefreshCcw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const YoutubeInsightsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [channelStats, setChannelStats] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await youtubeService.getChannelStats();
      if (stats) {
        setIsConnected(true);
        setChannelStats(stats);
        
        // Cargar analíticas detalladas
        const analytics = await youtubeService.getAnalytics(stats.id);
        if (analytics && analytics.rows) {
          const processedData = analytics.rows.map((row: any) => ({
            date: row[0],
            views: row[1],
            watchTime: row[2],
            avgDuration: row[3],
            subGained: row[4],
            subLost: row[5],
          }));
          setAnalyticsData(processedData);
        }
      } else {
        setIsConnected(false);
      }
    } catch (err: any) {
      console.error('Error loading YouTube data:', err);
      // Si recibimos un error de conexión, es que no está vinculado
      if (err.message.includes('No YouTube connection') || err.message.includes('401')) {
        setIsConnected(false);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = youtubeService.getAuthUrl();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Sincronizando con YouTube Creator Studio...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-red-600/10 border border-red-600/20 rounded-none flex items-center justify-center">
          <Youtube size={40} className="text-red-500" />
        </div>
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">YouTube <span className="text-red-600">.</span> Insights</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
            Conecta el canal oficial de la Revista ACS para visualizar estadísticas de audiencia, rendimiento de videos y crecimiento de suscriptores en tiempo real.
          </p>
        </div>
        <button 
          onClick={handleConnect}
          className="group relative px-8 py-3 bg-red-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-none hover:shadow-red-glow transition-all active:scale-95"
        >
          <span className="flex items-center gap-3">
            Conectar Canal <Youtube size={16} />
          </span>
        </button>
        {error && (
          <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 px-4 py-2 border border-red-500/20">
            Error: {error}
          </p>
        )}
      </div>
    );
  }

  const metrics = [
    { label: 'Suscriptores', value: channelStats.subscribers, icon: Users, color: 'text-red-500', trend: '+12%' },
    { label: 'Vistas Totales', value: channelStats.views, icon: Eye, color: 'text-blue-500', trend: 'Histórico' },
    { label: 'Videos Publicados', value: channelStats.videos, icon: Play, color: 'text-emerald-500', trend: 'Producción' },
    { label: 'Tiempo de Verf. (m)', value: analyticsData.reduce((acc, d) => acc + d.watchTime, 0), icon: Clock, color: 'text-amber-500', trend: 'Últimos 30d' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-1000">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[#262626] pb-4">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-none border border-[#262626] overflow-hidden bg-[#0D0D0D] flex items-center justify-center">
            {!imgError ? (
              <img 
                src={channelStats.thumbnail} 
                alt="Channel" 
                className="w-full h-full object-cover" 
                onError={() => setImgError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Youtube size={32} className="text-red-500/40" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              {channelStats.title} <Youtube className="text-red-600" size={18} />
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Canal Vinculado</span>
              <button onClick={loadData} className="text-[9px] text-indigo-500 hover:text-white font-black uppercase tracking-widest flex items-center gap-1">
                <RefreshCcw size={10} /> Actualizar
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => window.open(`https://studio.youtube.com/channel/${channelStats.id}`, '_blank')}
            className="px-6 py-2 bg-[#0D0D0D] border border-[#262626] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#1A1A1A] transition-all"
          >
            YouTube Studio <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((card, i) => (
          <div key={i} className="bg-[#0D0D0D] border border-[#262626] p-8 rounded-none relative group overflow-hidden">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">{card.label}</p>
            <h3 className="text-4xl font-black text-white tracking-tighter">{card.value.toLocaleString()}</h3>
            <div className={`mt-6 flex items-center gap-2 ${card.color} text-[9px] font-bold uppercase tracking-widest`}>
              <TrendingUp className="w-3 h-3" /> {card.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-none overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-[#262626] bg-[#0A0A0A] flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-[0.2em]">Rendimiento de Vistas</h4>
            <p className="text-[9px] font-medium text-gray-600 uppercase tracking-widest mt-1">Cronología interactiva de los últimos 30 días</p>
          </div>
          <Calendar className="w-4 h-4 text-red-500/20" />
        </div>
        
        <div className="p-8">
           <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#333" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}`;
                  }}
                />
                <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '4px' }}
                  itemStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#EF4444" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 border-t border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Duración media de vista</p>
              <h4 className="text-xl font-black text-white">
                {analyticsData.length > 0 
                  ? Math.floor(analyticsData.reduce((acc, d) => acc + d.avgDuration, 0) / analyticsData.length / 60)
                  : 0}m {Math.floor(analyticsData.reduce((acc, d) => acc + d.avgDuration, 0) / analyticsData.length % 60)}s
              </h4>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Suscriptores ganados</p>
              <h4 className="text-xl font-black text-emerald-500">
                +{analyticsData.reduce((acc, d) => acc + d.subGained, 0)}
              </h4>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Impacto de Retención</p>
              <h4 className="text-xl font-black text-blue-500">Muy Alta</h4>
            </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-3 p-4 bg-red-600/5 border border-red-600/10 rounded-none">
        <AlertCircle className="text-red-500" size={16} />
        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
          Los datos mostrados corresponden a la información pública y analítica proveída por Google Cloud Platform. 
          Sincronizado via YouTube Analytics API v2.
        </p>
      </div>
    </div>
  );
};
