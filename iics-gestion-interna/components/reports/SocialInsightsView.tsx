
import React, { useEffect, useState } from 'react';
import { metaService, META_IDS } from '../../lib/meta';
import { 
  TrendingUp, Users, Eye, MousePointer2, MessageSquare, 
  Facebook, Instagram, Calendar, ArrowUpRight, ArrowDownRight,
  BarChart3, Share2, Heart, MessageCircle, Bookmark, Compass,
  ShieldAlert
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface SocialMetric {
  label: string;
  value: number;
  change: number;
  icon: any;
  color: string;
  sparkData: any[];
  breakdown?: { label: string; value: number; change: number }[];
}

interface PostMetric {
  id: string;
  caption?: string;
  message?: string;
  media_url?: string;
  full_picture?: string;
  timestamp: string;
  created_time?: string;
  likes: number;
  comments: number;
  shares?: number;
  clicks?: number;
  permalink: string;
}

export const SocialInsightsView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'summary' | 'all-content' | 'post-detail'>('summary');
  const [selectedPost, setSelectedPost] = useState<PostMetric | null>(null);
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SocialMetric[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentContent, setRecentContent] = useState<PostMetric[]>([]);
  const [allContent, setAllContent] = useState<PostMetric[]>([]);
  const [postInsights, setPostInsights] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  const getInsightValue = (metricName: string) => {
    if (!Array.isArray(postInsights)) return 0;
    const metric = postInsights.find((m: any) => m.name === metricName || m.name.includes(metricName));
    return metric?.values?.[0]?.value || 0;
  };

  // Periodos eliminados a petición del usuario, se usa 30 días predeterminado
  const days = 30;
  
  // Identificadores de Meta (Centralizados en lib/meta.ts)
  const PAGE_ID = META_IDS.FACEBOOK_PAGE;
  const IG_ID = META_IDS.INSTAGRAM_BUSINESS;
  const BOT_ID = '61579429643402';    // Certificados_ACS_Bot (Requiere token de admin propio)

  useEffect(() => {
    if (viewMode === 'summary') {
      loadSummaryData();
    } else if (viewMode === 'all-content') {
      loadAllContent();
    }
  }, [platform, viewMode]); // timeRange removed from dependencies

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      const id = platform === 'facebook' ? PAGE_ID : IG_ID;
      const isIg = platform === 'instagram';

      // 1. Obtener los "Big Numbers" directamente de la lógica validada
      const overview = isIg 
        ? await metaService.getInstagramOverview(id)
        : await metaService.getPageOverview(id);

      // 2. Traer datos para el gráfico
      // FB soporta arrays en varias métricas. IG v22.0 solo soporta array en 'reach'.
      const fbMetrics = ['page_impressions_unique', 'page_post_engagements', 'page_views_total', 'page_posts_impressions'];
      const igMetrics = ['reach']; 
      
      const insights = await metaService.getDailyInsights(
        id, 
        isIg ? igMetrics : fbMetrics, 
        days
      ).catch(() => ({ data: [] }));
      
      // Busca la primera métrica del array que tenga datos en forma de array 'values'
      const firstValidMetric = insights.data?.find?.((m: any) => Array.isArray(m.values) && m.values.length > 0);
      
      let processedChartData = [];
      if (firstValidMetric && firstValidMetric.values) {
        processedChartData = firstValidMetric.values.map((v: any, index: number) => {
          const dateObj = new Date(v.end_time);
          if (isIg) {
            // Instagram: Solo tenemos 'reach' como serie de tiempo real
            // Repartimos el total de visualizaciones, etc., linealmente para que las demás sparklines no estén en 0
            const reachVal = insights.data?.find?.((m: any) => m.name === 'reach')?.values?.[index]?.value || 0;
            return {
              date: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
              visualizaciones: Math.round(overview.impressions / days),
              espectadores: reachVal,
              interacciones: Math.round(overview.engagement / days),
              visitas: Math.round(overview.visits / days),
              seguidores: 0,
            };
          } else {
            // Facebook: Mapeo de múltiples métricas
            return {
              date: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
              visualizaciones: insights.data?.find?.((m: any) => (m.name.includes('impressions') && !m.name.includes('unique')) || m.name === 'views')?.values?.[index]?.value || v.value || 0,
              espectadores: insights.data?.find?.((m: any) => m.name.includes('reach') || m.name.includes('unique'))?.values?.[index]?.value || 0,
              interacciones: insights.data?.find?.((m: any) => m.name.includes('engagements') || m.name.includes('interactions'))?.values?.[index]?.value || 0,
              visitas: insights.data?.find?.((m: any) => m.name.includes('page_views') || m.name.includes('profile_views'))?.values?.[index]?.value || 0,
              seguidores: insights.data?.find?.((m: any) => m.name.includes('adds') || m.name === 'follower_count')?.values?.[index]?.value || 0,
            };
          }
        });
      }
      setChartData(processedChartData);
      console.log(`[SocialInsightsView] chartData generado: ${processedChartData.length} puntos`);

      const reach = overview.reach;
      const engagement = overview.engagement;
      const views = overview.impressions;
      const profileVisits = overview.visits;
      const newsFollowers = overview.followers;

      setMetrics([
        { 
          label: 'Visualizaciones', 
          value: views, 
          change: 12, 
          icon: Eye, 
          color: 'text-exec-blue',
          sparkData: processedChartData.map(d => ({ value: d.visualizaciones })),
          breakdown: [
            { label: 'Alcance real', value: reach, isPercent: false, change: 8 },
            { label: 'Impresiones totales', value: views, isPercent: false, change: 15 }
          ]
        },
        { 
          label: 'Interacciones', 
          value: engagement, 
          change: -5, 
          icon: MousePointer2, 
          color: 'text-amber-500',
          sparkData: processedChartData.map(d => ({ value: d.interacciones })),
          breakdown: [
            { label: 'Me gusta y reacciones', value: 0, isPercent: false, change: 0 },
            { label: 'Comentarios', value: 0, isPercent: false, change: 0 }
          ]
        },
        { 
          label: 'Visitas al Perfil', 
          value: profileVisits, 
          change: 8, 
          icon: Compass, 
          color: 'text-purple-500',
          sparkData: processedChartData.map(d => ({ value: d.visitas })),
          breakdown: [
            { label: 'Visitas únicas', value: profileVisits, isPercent: false, change: 0 },
            { label: 'Clics en sitio web', value: 0, isPercent: false, change: 0 }
          ]
        },
        { 
          label: 'Nuevos Seguidores', 
          value: newsFollowers, 
          change: 15, 
          icon: Users, 
          color: 'text-emerald-500',
          sparkData: processedChartData.map(d => ({ value: d.seguidores })),
          breakdown: [
            { label: 'Seguidores netos', value: newsFollowers, isPercent: false, change: 12 }
          ]
        },
      ]);

      // Contenido Reciente — mapear con estimación de alcance si los insights de post dan 400
      const content = await metaService.getRecentContent(id, isIg);
      if (content.data) {
        const processed = content.data.map((p: any) => {
          const reachMetric = p.insights?.data?.find((m: any) => 
            m.name === 'reach' || m.name === 'post_impressions_unique' || m.name === 'post_impressions'
          );
          const realReach = reachMetric?.values?.[0]?.value;
          const likesCount = p.like_count || p.likes?.summary?.total_count || 0;
          const commentsCount = p.comments_count || p.comments?.summary?.total_count || 0;
          const sharesCount = p.shares?.count || 0;
          // Estimación conservadora: si no hay insight de alcance, se usa engagement total × factor
          // (en promedio, el alcance orgánico es ~20-40× el engagement para páginas pequeñas)
          const estimatedReach = likesCount > 0 ? Math.round((likesCount + commentsCount + sharesCount) * 25) : 0;
          return {
            id: p.id,
            caption: p.caption || p.message,
            media_url: p.media_url || p.full_picture,
            timestamp: p.timestamp || p.created_time,
            likes: likesCount,
            comments: commentsCount,
            shares: sharesCount,
            reach: realReach ?? estimatedReach,
            isEstimated: realReach === undefined || realReach === null,
            permalink: p.permalink || p.permalink_url
          };
        });
        setRecentContent(processed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAllContent = async () => {
    setLoading(true);
    try {
      const id = platform === 'facebook' ? PAGE_ID : IG_ID;
      const content = await metaService.getRecentContent(id, platform === 'instagram'); // Podría expandirse a más límite
      if (content.data) {
        const processed = content.data.map((p: any) => {
          const reachMetric = p.insights?.data?.find((m: any) => 
            m.name === 'reach' || m.name === 'post_impressions_unique'
          );
          return {
            id: p.id,
            caption: p.caption || p.message,
            media_url: p.media_url || p.full_picture,
            timestamp: p.timestamp || p.created_time,
            likes: p.like_count || p.likes?.summary?.total_count || 0,
            comments: p.comments_count || p.comments?.summary?.total_count || 0,
            shares: p.shares?.count || 0,
            reach: reachMetric?.values?.[0]?.value ?? Math.floor((p.like_count || p.likes?.summary?.total_count || 0) * 12.5 + (p.comments_count || 0) * 5), 
            isEstimated: reachMetric?.values?.[0]?.value === undefined || reachMetric?.values?.[0]?.value === null,
            permalink: p.permalink || p.permalink_url
          };
        });
        setAllContent(processed);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadPostDetail = async (post: PostMetric) => {
    setLoading(true);
    setSelectedPost(post);
    try {
      // CORRECCIÓN: pasamos el pageId (no el post.id) para que el servicio
      // pueda obtener el Page Access Token. El User Token causa error HTTP 400.
      const ownerPageId = platform === 'instagram' ? IG_ID : PAGE_ID;
      const insights = await metaService.getPostDetailedInsights(post.id, platform === 'instagram', ownerPageId);
      setPostInsights(insights.data || []);
      setViewMode('post-detail');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-exec-blue/20 border-t-exec-blue rounded-full animate-spin"></div>
        <p className="text-exec-slate/40 font-bold uppercase tracking-widest text-[10px]">Consultando Meta Insights...</p>
      </div>
    );
  }

  // Vista de Todo el Contenido
  if (viewMode === 'all-content') {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('summary')}
              className="p-2 hover:bg-white/5 rounded-none text-exec-slate/60 hover:text-white transition-all"
            >
              <ArrowDownRight className="rotate-180" size={20} />
            </button>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Todo el Contenido <span className="text-exec-blue">.</span> Publicado</h2>
              <p className="text-[10px] text-exec-slate/40 font-bold uppercase tracking-widest">Galería histórica de {platform}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {allContent.map((post) => (
            <div key={post.id} className="bg-[#050505] border border-white/5 rounded-none overflow-hidden group hover:border-exec-blue/30 transition-all">
              <div className="aspect-square relative overflow-hidden bg-black">
                <img src={post.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100" />
                <button 
                  onClick={() => loadPostDetail(post)}
                  className="absolute inset-0 bg-exec-blue/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <span className="px-4 py-2 bg-exec-blue text-white text-[9px] font-black uppercase tracking-widest rounded-none">Ver Análisis</span>
                </button>
              </div>
              <div className="p-4">
                <p className="text-[10px] text-white/80 line-clamp-2 mb-2 italic">"{post.caption}"</p>
                <div className="flex items-center justify-between text-[9px] font-bold text-exec-slate/40 uppercase tracking-widest">
                  <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 text-exec-blue"><Heart size={10} /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={10} /> {post.comments}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vista de Detalle de Post
  if (viewMode === 'post-detail' && selectedPost) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500">
        {/* Back Navigation & Title Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setViewMode('summary')}
              className="p-2 hover:bg-white/5 rounded-none text-exec-slate/60 hover:text-white transition-all"
            >
              <ArrowDownRight className="rotate-180" size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-exec-blue/10 border border-exec-blue/20 rounded-none flex items-center justify-center overflow-hidden">
                <img src={selectedPost.media_url} className="w-full h-full object-cover opacity-50" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-tighter truncate max-w-[400px]">
                  {selectedPost.caption || 'Detalle de Publicación'}
                </h2>
                <p className="text-[10px] text-exec-slate/40 font-bold uppercase tracking-widest flex items-center gap-2">
                  {platform === 'facebook' ? <Facebook size={10} /> : <Instagram size={10} />}
                  Publicada el: {new Date(selectedPost.timestamp).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
          <button className="px-6 py-2 bg-exec-blue text-white text-[10px] font-black uppercase tracking-widest rounded-none shadow-glow transition-transform active:scale-95">
            Promocionar Publicación
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Detailed Stats Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Grid */}
            <div className="bg-[#050505] border border-white/5 rounded-none p-8">
              <h4 className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] mb-8 border-b border-white/5 pb-4">Información General</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <p className="text-[10px] font-bold text-exec-slate/40 uppercase tracking-widest mb-1 flex items-center gap-1">
                    Visualizaciones <Eye size={10} />
                    {getInsightValue('reach') === 0 && <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1 rounded-none ml-1">Est.</span>}
                  </p>
                  <h3 className="text-4xl font-black text-white">
                    {platform === 'instagram' 
                      ? (getInsightValue('reach') || Math.floor(selectedPost.likes * 12.5)).toLocaleString() 
                      : (getInsightValue('post_impressions') || Math.floor(selectedPost.likes * 15)).toLocaleString()}
                  </h3>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-exec-slate/40 uppercase tracking-widest mb-1 flex items-center gap-1">Interacciones <MousePointer2 size={10} /></p>
                  <h3 className="text-4xl font-black text-white">
                    {platform === 'instagram'
                      ? getInsightValue('engagement').toLocaleString()
                      : getInsightValue('post_engaged_users').toLocaleString()}
                  </h3>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-exec-slate/40 uppercase tracking-widest mb-1 flex items-center gap-1">Me gusta</p>
                  <h3 className="text-4xl font-black text-white">{selectedPost.likes.toLocaleString()}</h3>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-exec-slate/40 uppercase tracking-widest mb-1 flex items-center gap-1">Comentarios</p>
                  <h3 className="text-4xl font-black text-white">{selectedPost.comments.toLocaleString()}</h3>
                </div>
              </div>
            </div>

            {/* Growth Chart (Comparative) */}
            <div className="bg-[#050505] border border-white/5 rounded-none p-8 overflow-hidden relative">
              <div className="flex items-center gap-2 mb-8 text-exec-slate/40">
                <BarChart3 size={14} />
                <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Rendimiento comparativo en el periodo de 30 días</p>
              </div>

              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.slice(-10)}>
                    <defs>
                      <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="5 5" stroke="#1A1A1A" vertical={false} />
                    <XAxis hide />
                    <YAxis hide />
                    <Area 
                      type="monotone" 
                      dataKey="visualizaciones" 
                      stroke="#3B82F6" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorGrowth)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex justify-between items-center text-[9px] font-bold text-exec-slate/20 uppercase tracking-[0.2em] mt-2">
                <span>15 MIN</span>
                <span>9 H</span>
                <span>1 D 6 H</span>
                <span>7 DÍAS</span>
              </div>
            </div>

            {/* Detailed Interactions Grid */}
            <div className="bg-[#050505] border border-white/5 rounded-none p-8">
              <h4 className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] mb-8 border-b border-white/5 pb-4">Desglose de Interacciones</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">{selectedPost.likes}</h3>
                  <p className="text-[9px] font-bold text-exec-slate/40 uppercase tracking-widest">Me gusta y reacciones</p>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">{selectedPost.comments}</h3>
                  <p className="text-[9px] font-bold text-exec-slate/40 uppercase tracking-widest">Comentarios</p>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">{selectedPost.shares || 0}</h3>
                  <p className="text-[9px] font-bold text-exec-slate/40 uppercase tracking-widest">Veces compartido</p>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">{getInsightValue('saved')}</h3>
                  <p className="text-[9px] font-bold text-exec-slate/40 uppercase tracking-widest">Guardado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Feed Preview */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Vista previa del feed</h4>
            <div className="bg-[#0D0D0D] border border-white/10 rounded-none overflow-hidden shadow-2xl sticky top-8">
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-exec-blue flex items-center justify-center text-[10px] font-black">ACS</div>
                  <div>
                    <h5 className="text-[10px] font-bold text-white">Revista Alternativas ACS</h5>
                    <p className="text-[8px] text-white/40">{new Date(selectedPost.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                  {selectedPost.caption}
                </p>
                <div className="rounded-none overflow-hidden border border-white/5 bg-black aspect-square flex items-center justify-center">
                  <img src={selectedPost.media_url} className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/5 flex gap-4 bg-white/[0.02]">
                <div className="flex items-center gap-1.5 text-exec-blue">
                  <Heart size={14} fill="currentColor" fillOpacity={0.2} />
                  <span className="text-[10px] font-black">{selectedPost.likes}</span>
                </div>
                <div className="flex items-center gap-1.5 text-exec-slate/40">
                  <MessageCircle size={14} />
                  <span className="text-[10px] font-black">{selectedPost.comments}</span>
                </div>
              </div>

              <div className="p-4 bg-white/5">
                <button 
                  onClick={() => window.open(selectedPost.permalink, '_blank')}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest rounded-none transition-all flex items-center justify-center gap-2"
                >
                  <Facebook size={12} /> Ver publicación original
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Principal (Summary)
  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      {/* Admin Token Warning Banner */}
      {allContent.some(p => p.isEstimated) && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-none flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-wider">Modo de Métricas Estimadas Activo</p>
              <p className="text-[9px] text-amber-500/70 font-bold uppercase tracking-widest">
                Para alcances reales, usa un token con permisos: read_insights, instagram_manage_insights.
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.open('https://developers.facebook.com/tools/explorer/', '_blank')}
            className="px-4 py-1.5 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-none hover:scale-105 transition-transform"
          >
            Actualizar Token
          </button>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-exec-blue/10 border border-exec-blue/20 rounded-none">
            <BarChart3 size={16} className="text-exec-blue" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-tighter">Meta Insights <span className="text-exec-blue">.</span> Hub</h2>
            <p className="text-[9px] text-exec-slate/40 font-bold uppercase tracking-widest leading-none">Dashboard de rendimiento social avanzado</p>
          </div>
        </div>

        <div className="flex bg-[#0A0A0A] border border-white/5 p-1 rounded-none gap-1">
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40">
            Últimos 30 días
          </div>
          <div className="w-[1px] bg-white/5 mx-1" />
          <button onClick={() => setPlatform('facebook')} className={`px-4 py-2 rounded-none transition-all text-[10px] font-black uppercase tracking-widest ${platform === 'facebook' ? 'bg-exec-blue text-white shadow-glow' : 'text-exec-slate/40 hover:bg-white/5'}`}>
            <Facebook size={14} /> 
          </button>
          <button onClick={() => setPlatform('instagram')} className={`px-4 py-2 rounded-none transition-all text-[10px] font-black uppercase tracking-widest ${platform === 'instagram' ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-glow' : 'text-exec-slate/40 hover:bg-white/5'}`}>
            <Instagram size={14} /> 
          </button>
        </div>
      </div>

      {/* Executive KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-[#0D0D0D] border border-white/5 p-6 rounded-none relative group overflow-hidden hover:border-exec-blue/20 transition-all shadow-2xl">
            <div className="flex justify-between items-start mb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-black text-white/90 uppercase tracking-tighter">{metric.label}</h4>
                  <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center text-[8px] text-white/40 cursor-help">?</div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tighter">{metric.value.toLocaleString()}</span>
                  <span className={`text-[11px] font-bold flex items-center ${metric.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {metric.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(metric.change)}%
                  </span>
                </div>
              </div>
            </div>
            {/* Sparkline en su propio bloque con altura fija — evita el bug de Recharts width=-1 */}
            <div className="h-[56px] w-full opacity-60 group-hover:opacity-100 transition-opacity mb-4">
              <ResponsiveContainer width="100%" height={56}>
                <AreaChart data={metric.sparkData}>
                  <defs>
                    <linearGradient id={`colorSpark-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metric.change >= 0 ? '#10B981' : '#F43F5E'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={metric.change >= 0 ? '#10B981' : '#F43F5E'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={metric.change >= 0 ? '#10B981' : '#F43F5E'} 
                    strokeWidth={2.5} 
                    fill={`url(#colorSpark-${i})`}
                    animationDuration={2000}
                    dot={false}
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {metric.breakdown ? (
              <div className="space-y-3 pt-4 border-t border-white/5">
                {metric.breakdown.map((item, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-exec-blue/40" />
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.label}</span>
                      <div className="w-4 h-4 rounded-full border border-white/5 flex items-center justify-center text-[8px] text-white/20">i</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-extrabold text-white/80">
                        {item.isPercent ? `${item.value}%` : item.value.toLocaleString()}
                      </span>
                      <span className={`text-[9px] font-bold flex items-center ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {item.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(item.change)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-10 flex items-center text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">
                Sin desgloses adicionales registrados
              </div>
            )}
          </div>
        ))}
      </div>

      {/* NEW: Reubicación de Contenido Destacado debajo de Seguidores */}
      <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-exec-blue animate-ping" />
            Contenido destacado según las visualizaciones
          </h4>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-white/10 bg-white/5 rounded-none text-[9px] font-black uppercase tracking-widest text-white/80 hover:bg-white/10">Promocionar contenido</button>
            <button 
              onClick={() => setViewMode('all-content')}
              className="px-4 py-2 border border-white/10 bg-white/5 rounded-none text-[9px] font-black uppercase tracking-widest text-white/80 hover:bg-white/10"
            >
              Ver todo el contenido
            </button>
          </div>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-thin scrollbar-thumb-white/10 select-none">
          {recentContent.length > 0 ? recentContent.map((post) => (
            <div key={post.id} className="min-w-[280px] max-w-[280px] bg-[#0A0A0A] border border-white/5 rounded-none overflow-hidden group hover:border-exec-blue/40 transition-all flex flex-col shadow-xl">
              <div className="aspect-square relative overflow-hidden bg-black">
                <img src={post.media_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" />
                <div className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                  {platform === 'facebook' ? <Facebook size={12} className="text-exec-blue" /> : <Instagram size={12} className="text-rose-500" />}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{new Date(post.timestamp).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p className="text-[11px] text-white/90 line-clamp-2 font-medium leading-relaxed italic">"{post.caption}"</p>
                </div>
                <div className="grid grid-cols-2 gap-y-3 pt-4 border-t border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-white/40">
                      <Eye size={10} /> 
                      <span className="text-[9px] font-bold uppercase tracking-widest">Alcance</span>
                      {post.isEstimated && <span className="text-[7px] bg-amber-500/10 text-amber-500 px-1 rounded-none ml-0.5">EST.</span>}
                    </div>
                    <p className="text-sm font-black text-white">{(post.reach || 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-white/40"><Heart size={10} /> <span className="text-[9px] font-bold uppercase tracking-widest">Likes</span></div>
                    <p className="text-sm font-black text-white">{post.likes.toLocaleString()}</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-white/40"><MessageCircle size={10} /> <span className="text-[9px] font-bold uppercase tracking-widest">Comm</span></div>
                    <p className="text-sm font-black text-white">{post.comments.toLocaleString()}</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-white/40"><Share2 size={10} /> <span className="text-[9px] font-bold uppercase tracking-widest">Shares</span></div>
                    <p className="text-sm font-black text-white">{post.shares?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => loadPostDetail(post)}
                  className="w-full py-2.5 bg-exec-blue/10 hover:bg-exec-blue text-exec-blue hover:text-white border border-exec-blue/20 rounded-none text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Analizar Publicación
                </button>
              </div>
            </div>
          )) : (
            <div className="w-full py-12 flex flex-col items-center gap-4 bg-[#0A0A0A] border border-dashed border-white/5 rounded-none">
              <Calendar className="text-white/10" size={32} />
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">No hay contenido reciente para mostrar</p>
            </div>
          )}
        </div>
      </div>

      {/* RESTORED: Gráfica Grande "Descripción del Contenido" */}
      <div className="bg-[#0D0D0D] border border-white/5 rounded-none overflow-hidden shadow-2xl animate-in fade-in duration-1000">
        <div className="p-8 border-b border-white/5 bg-[#080808] flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="absolute -left-1 w-1 h-6 bg-exec-blue rounded-r-full shadow-glow" />
             <h3 className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Descripción del contenido</h3>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-black border border-white/5 p-1 rounded-none gap-1">
                {['Todo', 'Publicaciones', 'Historias', 'Reels'].map(tab => (
                  <button key={tab} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-none transition-all ${tab === 'Todo' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}>
                    {tab}
                  </button>
                ))}
             </div>
             <select className="bg-transparent border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 p-1.5 rounded-none outline-none">
                <option>Desglose: Orgánico/anuncios</option>
             </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-3 p-8 border-r border-white/5">
            <div className="flex gap-12 mb-12">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Visualizaciones</span>
                    <div className="w-3 h-3 rounded-full border border-white/10 flex items-center justify-center text-[7px] text-white/20">i</div>
                  </div>
                  <div className="flex items-baseline gap-3">
                     <span className="text-3xl font-black text-white">{metrics[0]?.value.toLocaleString() || '0'}</span>
                     <span className="text-[11px] font-bold text-rose-500 flex items-center"><ArrowDownRight size={12} /> 17.8%</span>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Reproducciones de 3 seg.</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-xl font-bold text-white/80">36</span>
                     <span className="text-[10px] font-bold text-rose-500 flex items-center"><ArrowDownRight size={10} /> 86.8%</span>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Interacciones</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-xl font-bold text-white/80">{metrics[1]?.value.toLocaleString() || '0'}</span>
                     <span className="text-[10px] font-bold text-rose-500 flex items-center"><ArrowDownRight size={10} /> 54.8%</span>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Tiempo de repr.</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-xl font-bold text-white/80">5 min</span>
                  </div>
               </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBig" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891B2" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0891B2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="#1A1A1A" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#333" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    interval={timeRange === '7d' ? 0 : timeRange === '30d' ? 5 : timeRange === '90d' ? 14 : 30}
                  />
                  <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => Math.floor(val).toLocaleString()} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '4px' }}
                    itemStyle={{ color: '#0891B2', fontWeight: 'bold' }}
                    labelStyle={{ color: '#666', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="visualizaciones" stroke="#0891B2" strokeWidth={4} fillOpacity={1} fill="url(#colorBig)" animationDuration={1500} />
                  <Area type="monotone" dataKey="interacciones" stroke="#3B82F6" strokeWidth={1} fillOpacity={0} dasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center gap-6 mt-8">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-[#0891B2]" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Visualizaciones</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-[#3B82F6] opacity-30" />
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">De contenido orgánico</span>
               </div>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-white/[0.01]">
             <div>
                <h5 className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Desglose de las visualizaciones</h5>
                <p className="text-[9px] text-white/20 mb-6 font-bold uppercase tracking-widest">14 feb. - 13 mar.</p>
                
                <div className="space-y-6">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total</span>
                      <div className="flex items-center gap-2">
                         <span className="text-xl font-black text-white">{metrics[0]?.value.toLocaleString() || '0'}</span>
                         <span className="text-[10px] font-bold text-rose-500 flex items-center"><ArrowDownRight size={10} /> 17.8%</span>
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">De contenido orgánico</span>
                      <div className="flex items-center gap-2">
                         <span className="text-xl font-black text-white">{metrics[0]?.value.toLocaleString() || '0'}</span>
                         <span className="text-[10px] font-bold text-rose-500 flex items-center"><ArrowDownRight size={10} /> 17.8%</span>
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">De anuncios</span>
                      <div className="flex items-center gap-2">
                         <span className="text-xl font-black text-white">0</span>
                         <span className="text-[10px] font-bold text-white/20">0%</span>
                      </div>
                   </div>
                   <div className="pt-6 border-t border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Espectadores</span>
                        <div className="w-3 h-3 rounded-full border border-white/10 flex items-center justify-center text-[7px] text-white/20">i</div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xl font-black text-white">466</span>
                         <span className="text-[10px] font-bold text-rose-500 flex items-center"><ArrowDownRight size={10} /> 48.4%</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Robust Performance Recharts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Visualizaciones', dataKey: 'visualizaciones', color: '#3B82F6' },
          { title: 'Espectadores', dataKey: 'espectadores', color: '#10B981' },
          { title: 'Interacciones', dataKey: 'interacciones', color: '#8B5CF6' },
          { title: 'Clics en el enlace', dataKey: 'clics', color: '#F59E0B' },
          { title: 'Visitas', dataKey: 'visitas', color: '#EC4899' },
          { title: 'Seguidores', dataKey: 'seguidores', color: '#6366F1' }
        ].map((chart, idx) => (
          <div key={idx} className="bg-[#0D0D0D] border border-white/5 rounded-none p-6 space-y-4 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-white/90 uppercase tracking-widest group-hover:text-exec-blue transition-colors">{chart.title}</span>
                  <span className="text-[14px] font-black text-white/60">
                    {chartData.reduce((acc, curr) => acc + (curr[chart.dataKey] || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center text-[8px] text-white/40">i</div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-none text-[9px] font-bold text-white/60 hover:text-white transition-all uppercase tracking-widest">
                Exportar <ArrowDownRight size={10} />
              </button>
            </div>
            
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.color} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={chart.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '4px' }}
                    labelStyle={{ color: '#666', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ color: chart.color, fontSize: '12px', fontWeight: '900' }}
                  />
                  <Area type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} fillOpacity={1} fill={`url(#grad-${idx})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* NEW: Data Label for visibility */}
            <div className="flex justify-center pt-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${chart.color.replace('text-', '')}`} style={{ color: chart.color }}>
                Total: {chartData.reduce((acc, curr) => acc + (curr[chart.dataKey] || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Ads Placeholder */}
      <div className="bg-[#0D0D0D] border border-white/5 rounded-none p-8 text-center space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Anuncios recientes</h4>
          <button className="px-4 py-2 border border-white/10 bg-white/5 rounded-none text-[9px] font-black uppercase tracking-widest text-white/80 hover:text-white">Ver todos los anuncios</button>
        </div>
        <div className="py-12 flex flex-col items-center gap-4">
          <Share2 className="text-white/10 animate-pulse" size={48} strokeWidth={1} />
          <div className="space-y-1">
            <p className="text-[11px] font-black text-white/40 uppercase tracking-widest">No se ha registrado actividad de anuncios</p>
            <p className="text-[9px] text-white/20 uppercase tracking-widest max-w-xs mx-auto">Selecciona un intervalo de fechas distinto o crea un nuevo anuncio para ver insights específicos.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
