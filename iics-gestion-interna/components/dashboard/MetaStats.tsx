import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../common/Card';
import { metaService, META_IDS } from '../../lib/meta';
import { youtubeService } from '../../lib/youtube';
import { Facebook, Instagram, Youtube, Users, BarChart3, TrendingUp, Eye, Play } from 'lucide-react';

interface MetaStatsProps {
  mode?: 'mini' | 'premium';
}

export const MetaStats: React.FC<MetaStatsProps> = ({ mode = 'premium' }) => {
  const [stats, setStats] = useState({
    facebook: { reach: 0, engagement: 0, followers: 0 },
    instagram: { reach: 0, engagement: 0, followers: 0 },
    youtube: { reach: 0, engagement: 0, followers: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const pageId = import.meta.env.VITE_FACEBOOK_PAGE_ID || META_IDS.FACEBOOK_PAGE;
        const igId = import.meta.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID || META_IDS.INSTAGRAM_BUSINESS;

        const [fbOverview, igOverview, ytOverview] = await Promise.all([
          pageId ? metaService.getPageOverview(pageId).catch(() => null) : Promise.resolve({ reach: 0, engagement: 0, followers: 0 }),
          igId ? metaService.getInstagramOverview(igId).catch(() => null) : Promise.resolve({ reach: 0, engagement: 0, followers: 0 }),
          youtubeService.getChannelStats().catch(() => null)
        ]);

        setStats({
          facebook: { 
            reach: fbOverview?.reach || 0, 
            engagement: fbOverview?.engagement || 0, 
            followers: fbOverview?.followers || 0
          },
          instagram: { 
            reach: igOverview?.reach || 0, 
            engagement: igOverview?.engagement || 0, 
            followers: igOverview?.followers || 0
          },
          youtube: {
            reach: ytOverview?.views || 0,
            engagement: ytOverview?.videos || 0,
            followers: ytOverview?.subscribers || 0
          }
        });
      } catch (error) {
        console.error('Error fetching Meta stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-exec-border h-32 w-full rounded-sm" />;
  }

  if (mode === 'mini') {
    return (
      <div className="grid grid-cols-3 gap-2 w-full pb-2">
        {/* Facebook Mini */}
        <div 
          className="bg-[#0A0A0A] border border-exec-border rounded-sm p-2 flex flex-col gap-2 group cursor-pointer active:bg-[#111] transition-all"
          onClick={() => window.open(`https://facebook.com/${import.meta.env.VITE_FACEBOOK_PAGE_ID}`, '_blank')}
        >
          <div className="flex items-center gap-1">
            <div className="p-1 bg-exec-blue/5 rounded-sm border border-exec-blue/20">
              <Facebook size={10} className="text-exec-blue" />
            </div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">FB</span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex justify-between items-end border-b border-exec-border/50 pb-0.5">
              <span className="text-[7px] text-gray-500 font-bold uppercase">Alcance</span>
              <span className="text-[11px] font-black text-white">{stats.facebook.reach.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[7px] text-gray-500 font-bold uppercase">Seguid.</span>
              <span className="text-[11px] font-black text-white">{stats.facebook.followers.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Instagram Mini */}
        <div 
          className="bg-[#0A0A0A] border border-exec-border rounded-sm p-2 flex flex-col gap-2 group cursor-pointer active:bg-[#111] transition-all"
          onClick={() => window.open(`https://instagram.com/revista_alternativas/`, '_blank')}
        >
          <div className="flex items-center gap-1">
            <div className="p-1 bg-pink-500/5 rounded-sm border border-pink-500/20">
              <Instagram size={10} className="text-pink-500" />
            </div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">IG</span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex justify-between items-end border-b border-exec-border/50 pb-0.5">
              <span className="text-[7px] text-gray-500 font-bold uppercase">Alcance</span>
              <span className="text-[11px] font-black text-white">{stats.instagram.reach.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[7px] text-gray-500 font-bold uppercase">Seguid.</span>
              <span className="text-[11px] font-black text-white">{stats.instagram.followers.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* YouTube Mini */}
        <div 
          className="bg-[#0A0A0A] border border-exec-border rounded-sm p-2 flex flex-col gap-2 group cursor-pointer active:bg-[#111] transition-all"
          onClick={() => window.open(`https://studio.youtube.com/`, '_blank')}
        >
          <div className="flex items-center gap-1">
            <div className="p-1 bg-red-600/5 rounded-sm border border-red-600/20">
              <Youtube size={10} className="text-red-600" />
            </div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">YT</span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex justify-between items-end border-b border-exec-border/50 pb-0.5">
              <span className="text-[7px] text-gray-500 font-bold uppercase">Vistas</span>
              <span className="text-[11px] font-black text-white">{stats.youtube.reach.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[7px] text-gray-500 font-bold uppercase">Subs.</span>
              <span className="text-[11px] font-black text-white">{stats.youtube.followers.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREMIUM DESKTOP VIEW
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
      {/* Facebook Card Desktop */}
      <div 
        className="exec-card group relative cursor-pointer bg-[#0A0A0A] border border-exec-border p-5 hover:border-exec-blue/50 transition-all"
        onClick={() => window.open(`https://facebook.com/${import.meta.env.VITE_FACEBOOK_PAGE_ID}`, '_blank')}
      >
        <div className="absolute top-5 right-5 text-exec-blue/10 group-hover:text-exec-blue/30 transition-colors">
          <Facebook size={32} />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-exec-blue/10 flex items-center justify-center rounded-sm border border-exec-blue/20">
            <Facebook size={14} className="text-exec-blue" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Facebook</h3>
            <p className="text-[10px] text-exec-slate/50">Métricas en tiempo real</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <Eye size={10} /> Alcance
            </span>
            <p className="text-xl font-light text-white">{stats.facebook.reach.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <TrendingUp size={10} /> Interacc.
            </span>
            <p className="text-xl font-light text-white">{stats.facebook.engagement.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <Users size={10} /> Seguid.
            </span>
            <p className="text-xl font-light text-white">{stats.facebook.followers.toLocaleString()}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-exec-blue group-hover:w-full transition-all duration-500 opacity-50" />
      </div>

      {/* Instagram Card Desktop */}
      <div 
        className="exec-card group relative cursor-pointer bg-[#0A0A0A] border border-exec-border p-5 hover:border-pink-500/50 transition-all"
        onClick={() => window.open(`https://instagram.com/revista_alternativas/`, '_blank')}
      >
        <div className="absolute top-5 right-5 text-pink-500/10 group-hover:text-pink-500/30 transition-colors">
          <Instagram size={32} />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-pink-500/10 flex items-center justify-center rounded-sm border border-pink-500/20">
            <Instagram size={14} className="text-pink-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Instagram</h3>
            <p className="text-[10px] text-exec-slate/50">Métricas en tiempo real</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <Eye size={10} /> Alcance
            </span>
            <p className="text-xl font-light text-white">{stats.instagram.reach.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <TrendingUp size={10} /> Interacc.
            </span>
            <p className="text-xl font-light text-white">{stats.instagram.engagement.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <Users size={10} /> Seguid.
            </span>
            <p className="text-xl font-light text-white">{stats.instagram.followers.toLocaleString()}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-pink-500 group-hover:w-full transition-all duration-500 opacity-50" />
      </div>

      {/* YouTube Card Desktop */}
      <div 
        className="exec-card group relative cursor-pointer bg-[#0A0A0A] border border-exec-border p-5 hover:border-red-600/50 transition-all"
        onClick={() => window.open(`https://studio.youtube.com/`, '_blank')}
      >
        <div className="absolute top-5 right-5 text-red-600/10 group-hover:text-red-600/30 transition-colors">
          <Youtube size={32} />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-red-600/10 flex items-center justify-center rounded-sm border border-red-600/20">
            <Youtube size={14} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">YouTube</h3>
            <p className="text-[10px] text-exec-slate/50">Métricas en tiempo real</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <Play size={10} /> Vistas
            </span>
            <p className="text-xl font-light text-white">{stats.youtube.reach.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <TrendingUp size={10} /> Videos
            </span>
            <p className="text-xl font-light text-white">{stats.youtube.engagement.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-exec-slate/30 flex items-center gap-1">
              <Users size={10} /> Suscr.
            </span>
            <p className="text-xl font-light text-white">{stats.youtube.followers.toLocaleString()}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-red-600 group-hover:w-full transition-all duration-500 opacity-50" />
      </div>
    </div>
  );
};

export default MetaStats;
