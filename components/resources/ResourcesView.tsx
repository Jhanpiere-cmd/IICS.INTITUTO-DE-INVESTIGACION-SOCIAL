import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ExternalLink, FileText, Calendar, Tag } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  folder: string | null;
  file_urls: string[] | null;
  link: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const ResourcesView: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setResources(data || []);
      } catch (e) {
        console.error('Error loading resources:', e);
      } finally {
        setLoading(false);
      }
    };
    load();

    const ch = supabase
      .channel('resources-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <div className="h-8 w-8 border-2 border-exec-blue border-t-transparent rounded-none animate-spin mb-4"></div>
        <p className="text-[10px] uppercase font-bold tracking-widest animate-pulse">Sincronizando activos del sistema...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-black min-h-screen p-4 md:pt-4 md:px-6 text-exec-slate">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-exec-border gap-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <FileText className="w-6 h-6 text-exec-blue" />
            </div>
            <span>BIBLIOTECA DE <span className="text-exec-blue">RECURSOS</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Acceso centralizado a activos tácticos y documentación compartida.</p>
        </div>
      </div>

      {resources.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#222] rounded-sm bg-[#0E0E0E]">
          <FileText className="w-16 h-16 mb-4 text-[#222]" />
          <p className="font-medium text-gray-400">No hay recursos publicados aún</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {resources.map(r => (
          <div key={r.id} className="group relative bg-[#0D0D0D] border border-exec-border rounded-none p-5 hover:border-exec-blue/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,136,255,0.1)] flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-white group-hover:text-exec-blue transition-colors truncate uppercase tracking-tight" title={r.title}>
                  {r.title}
                </h3>
                {r.category && (
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black tracking-wider text-exec-blue mt-1 border border-exec-blue/20 px-2 py-0.5 rounded-none bg-exec-blue/5">
                    <Tag className="w-3 h-3" />
                    {r.category}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1">
              {r.description && (
                <p className="text-sm text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                  {r.description}
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-exec-border space-y-3">
              <div className="flex items-center text-xs text-gray-500 gap-2">
                <Calendar className="w-3 h-3" />
                {new Date(r.created_at).toLocaleDateString()}
              </div>

              {r.link && (
                <a
                  href={r.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full p-2.5 bg-[#151515] hover:bg-[#1A1A1A] border border-exec-border text-exec-blue hover:text-blue-400 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  ACCESO EXTERNO
                </a>
              )}

              {r.file_urls && r.file_urls.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Archivos adjuntos</p>
                  <div className="grid gap-1">
                    {r.file_urls.map((u, idx) => (
                      <a
                        key={idx}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white truncate p-2 hover:bg-[#1A1A1A] rounded-none transition-colors border border-transparent hover:border-exec-border"
                      >
                        <span className="w-5 h-5 flex items-center justify-center bg-[#151515] rounded-none text-exec-blue font-black border border-exec-border text-[9px]">
                          {idx + 1}
                        </span>
                        <span className="truncate flex-1">ACTIVO ADJUNTO {idx + 1}</span>
                        <DownloadIcon className="w-3.5 h-3.5 text-gray-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
);
