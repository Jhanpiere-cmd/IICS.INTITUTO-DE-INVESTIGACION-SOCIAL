import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, X, ExternalLink, Image as ImageIcon, Users as UsersIcon, Download, AlertCircle, LayoutGrid, List, Calendar, CheckCircle2 } from 'lucide-react';
import { CreateTask } from '../tasks/CreateTask';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  publication_date?: string;
  task_type: string;
  link?: string;
  file_urls?: string[];
  completion_files?: string[];
  completion_link?: string;
  assigned_to: string;
  assignedUser?: {
    full_name: string;
    avatar_url?: string;
  };
}

const COLORS: Record<string, string> = {
  'Instagram': '#FF0055', 
  'Facebook': '#00A2FF',  
  'YouTube': '#FF0000',   
  'Audiovisual': '#A855F7', 
  'Otro': '#6366F1'
};

const STATUS_COLORS: Record<string, string> = {
  'Pendiente': 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
  'En progreso': 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
  'En espera': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]',
  'Completada': 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
};

const getDueDateInfo = (date: string) => {
  if (!date) return { text: 'Sin fecha', isExpired: false };
  const parts = date.substring(0, 10).split('-');
  if (parts.length !== 3) return { text: date, isExpired: false };
  const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return { 
     text: `${parts[2]}/${parts[1]}/${parts[0]}`, 
     isExpired: diffDays < 0
  };
};

export const ContentCalendarGrid: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_user:profiles!assigned_to(full_name, avatar_url)
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      const parsedData = (data || []).map((item: any) => ({
        ...item,
        assignedUser: item.assigned_to_user
      })) as Task[];

      const contentTasks = parsedData.filter(t => {
        const type = t.task_type || '';
        const lowerType = type.toLowerCase();
        return (
          lowerType.includes('facebook') || 
          lowerType.includes('instagram') || 
          lowerType.includes('youtube') ||
          lowerType.includes('audiovisual') ||
          lowerType.includes('tiktok') ||
          lowerType.startsWith('flyer') ||
          lowerType.startsWith('video') ||
          lowerType.startsWith('cortos') ||
          lowerType.startsWith('shorts')
        );
      });

      setItems(contentTasks);
    } catch (error) {
      console.error('Error loading content tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Reporte de Planificación de Contenidos - SGR ACS', 14, 22);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);

    const tableColumn = ["Fecha Límite", "Publicación", "Título", "Formato", "Responsable", "Estado"];
    const tableRows: any[] = [];

    items.forEach(item => {
      const dateInfo = getDueDateInfo(item.due_date);
      const pubInfo = item.publication_date ? getDueDateInfo(item.publication_date).text : '-';
      const isExpired = dateInfo.isExpired && item.status !== 'Completada';
      
      tableRows.push([
        `${dateInfo.text} ${isExpired ? '(VENCIDO)' : ''}`,
        pubInfo,
        item.title || '',
        item.task_type || '',
        item.assignedUser?.full_name || 'Sin Asignar',
        item.status || ''
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 }
    });

    doc.save(`Planificacion_Contenido_${new Date().getTime()}.pdf`);
  };

  const chartDataMap: Record<string, number> = {};
  items.forEach(item => {
    const type = item.task_type || '';
    if (type.includes('Facebook')) chartDataMap['Facebook'] = (chartDataMap['Facebook'] || 0) + 1;
    else if (type.includes('Instagram')) chartDataMap['Instagram'] = (chartDataMap['Instagram'] || 0) + 1;
    else if (type.includes('YouTube')) chartDataMap['YouTube'] = (chartDataMap['YouTube'] || 0) + 1;
    else chartDataMap['Audiovisual'] = (chartDataMap['Audiovisual'] || 0) + 1;
  });

  const chartData = Object.entries(chartDataMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 bg-[#050505] border border-exec-border rounded-sm shadow-2xl p-4 md:p-6 overflow-hidden flex flex-col min-h-[500px] relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-exec-blue/50 to-transparent"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
              <Calendar className="w-5 h-5 text-exec-blue animate-pulse" />
              Calendario de Contenidos
            </h2>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-exec-blue"></span>
              Estrategia de Publicación y Seguimiento Audiovisual
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-black/50 border border-exec-border rounded-sm p-1 backdrop-blur-md">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-sm transition-all duration-300 ${viewMode === 'list' ? 'bg-[#111] text-exec-blue shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}
                title="Vista de Lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-sm transition-all duration-300 ${viewMode === 'grid' ? 'bg-[#111] text-exec-blue shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}
                title="Vista de Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={handleExportPDF}
              className="px-4 py-2 bg-black border border-exec-border text-gray-300 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:text-white transition-all flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-exec-blue" /> 
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button 
              onClick={() => {
                setEditingTaskId(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-exec-blue text-white text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-sm hover:bg-blue-600 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 
              <span className="hidden sm:inline">Nueva Tarea</span>
            </button>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="overflow-x-auto lg:overflow-x-hidden rounded-sm border border-exec-border bg-black/20 scrollbar-hide">
            <table className="w-full text-left border-collapse table-fixed min-w-[800px] lg:min-w-full">
            <thead>
              <tr className="bg-white/[0.02] text-[9px] text-gray-500 uppercase tracking-[0.2em] border-b border-exec-border">
                <th className="p-4 font-bold w-[12%]">Publicación</th>
                <th className="p-4 font-bold w-[22%]">Título</th>
                <th className="p-4 font-bold w-[15%]">Formato</th>
                <th className="p-4 font-bold w-[13%]">Recursos</th>
                <th className="p-4 font-bold w-[20%]">Responsable</th>
                <th className="p-4 font-bold text-center w-[18%]">Entrega / Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-sm text-gray-400">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-xs">Cargando datos estratégicos...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-xs opacity-40">No hay tareas programadas</td></tr>
              ) : (
                items.map((item, idx) => {
                   const platformsName = [];
                   if (item.task_type?.includes('Facebook')) platformsName.push('Facebook');
                   if (item.task_type?.includes('Instagram')) platformsName.push('Instagram');
                   if (item.task_type?.includes('YouTube')) platformsName.push('YouTube');
                   
                   if (platformsName.length === 0) {
                     if (item.task_type?.startsWith('Flyer')) platformsName.push('Diseño');
                     if (item.task_type?.startsWith('Video')) platformsName.push('Producción');
                     if (item.task_type?.startsWith('Cortos')) platformsName.push('Reels');
                   }

                   const dateInfo = getDueDateInfo(item.due_date);
                   const pubInfo = item.publication_date ? getDueDateInfo(item.publication_date) : null;
                   const isExpired = dateInfo.isExpired && item.status !== 'Completada';
                   const hasFinalProduct = (item.completion_files?.length ?? 0) > 0 || !!item.completion_link;

                   return (
                     <tr key={item.id} 
                         className="hover:bg-white/[0.03] transition-all duration-200 group cursor-pointer" 
                         onClick={() => setSelectedTaskForDetail(item)}>
                       <td className="p-4">
                         <div className={`font-black text-[11px] block tracking-tighter ${pubInfo ? 'text-white' : 'text-gray-600'}`}>
                           {pubInfo ? pubInfo.text : '---'}
                         </div>
                         <span className="text-[7px] uppercase font-bold text-gray-500">Live Date</span>
                       </td>
                       <td className="p-4">
                         <p className="font-bold text-white text-xs tracking-tight line-clamp-1 group-hover:text-exec-blue transition-colors">{item.title}</p>
                       </td>
                       <td className="p-4">
                         <div className="flex flex-wrap gap-1">
                           {platformsName.map(p => (
                              <span key={p} className="text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm bg-black border border-white/5" style={{color: COLORS[p] || '#A3A3A3'}}>
                                {p}
                              </span>
                           ))}
                         </div>
                       </td>
                       <td className="p-4">
                         <div className="flex items-center gap-2">
                            {/* ÍCONO AZUL: REFERENCIA */}
                            {(item.file_urls?.length || item.link) ? (
                               <div className="w-7 h-7 flex items-center justify-center rounded-sm bg-exec-blue/5 border border-exec-blue/20 text-exec-blue shadow-[0_0_10px_rgba(59,130,246,0.1)]" title="Referencia / Briefing">
                                  <ImageIcon className="w-3.5 h-3.5" />
                               </div>
                            ) : (
                               <div className="w-7 h-7 flex items-center justify-center rounded-sm bg-white/5 border border-white/5 text-gray-700">
                                  <AlertCircle className="w-3 h-3" />
                               </div>
                            )}

                            {/* ÍCONO VERDE: PRODUCTO FINAL */}
                            {hasFinalProduct && (
                               <div className="w-7 h-7 flex items-center justify-center rounded-sm bg-green-500/10 border border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)] animate-pulse" title="¡Producto Final Entregado!">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                               </div>
                            )}
                         </div>
                       </td>
                       <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center text-[9px] font-black text-exec-blue">
                               {item.assignedUser?.avatar_url ? <img src={item.assignedUser.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : item.assignedUser?.full_name?.charAt(0)}
                            </div>
                            <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider truncate">{item.assignedUser?.full_name?.split(' ')[0] || '---'}</span>
                          </div>
                       </td>
                       <td className="p-4">
                          <div className="flex flex-col items-center">
                             <span className={`px-2 py-1 rounded-sm border text-[8px] uppercase font-black tracking-[0.15em] w-full text-center ${STATUS_COLORS[item.status] || 'bg-gray-800 text-gray-300'}`}>
                               {item.status}
                             </span>
                             <span className={`mt-1 text-[8px] font-bold ${isExpired ? 'text-exec-red animate-pulse' : 'text-gray-600'}`}>
                                {isExpired ? 'VENCIDO ' : ''}{dateInfo.text}
                             </span>
                          </div>
                       </td>
                     </tr>
                   );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((task) => {
              const dateInfo = getDueDateInfo(task.due_date);
              const pubInfo = task.publication_date ? getDueDateInfo(task.publication_date) : null;
              const isExpired = dateInfo.isExpired && task.status !== 'Completada';
              const hasFinalProduct = (task.completion_files?.length ?? 0) > 0 || !!task.completion_link;

              return (
                <div key={task.id} onClick={() => setSelectedTaskForDetail(task)}
                     className="bg-[#0c0c0c] border border-exec-border rounded-sm p-4 hover:border-exec-blue/40 transition-all cursor-pointer group flex flex-col min-h-[220px]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                       { (task.file_urls?.length || task.link) && <ImageIcon className="w-4 h-4 text-exec-blue shadow-glow-blue" /> }
                       { hasFinalProduct && <CheckCircle2 className="w-4 h-4 text-green-500 shadow-glow-green" /> }
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border ${STATUS_COLORS[task.status]}`}>
                      {task.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white uppercase tracking-tight line-clamp-2 group-hover:text-exec-blue transition-colors mb-3">
                    {task.title}
                  </h4>

                  <div className="mt-auto space-y-4">
                    <div className="flex justify-between items-end">
                       <div className="space-y-1">
                          <p className="text-[7px] font-black text-gray-600 uppercase">Publish Date</p>
                          <p className={`text-[10px] font-black ${pubInfo ? 'text-white' : 'text-gray-800'}`}>{pubInfo?.text || '--/--/----'}</p>
                       </div>
                       <div className="text-right space-y-1">
                          <p className="text-[7px] font-black text-gray-600 uppercase">Deadline</p>
                          <p className={`text-[10px] font-black ${isExpired ? 'text-exec-red' : 'text-gray-400'}`}>{dateInfo.text}</p>
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center text-[9px] font-black text-exec-blue">
                              {task.assignedUser?.full_name?.charAt(0)}
                           </div>
                           <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white">{task.assignedUser?.full_name?.split(' ')[0]}</span>
                        </div>
                        <ImageIcon className="w-3 h-3 text-exec-blue/30" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full lg:w-64 flex flex-col gap-6 flex-shrink-0">
        <div className="bg-[#050505] border border-exec-border rounded-sm p-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] mb-6 border-b border-white/5 pb-4">Mix de Plataformas</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#888'} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '0', fontSize: '9px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {chartData.map(d => (
              <div key={d.name} className="flex justify-between items-center">
                <span className="text-gray-500 font-black text-[9px] uppercase tracking-widest">{d.name}</span>
                <span className="font-black text-white text-xs">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-exec-blue/[0.03] border border-exec-blue/20 rounded-sm p-6 text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">
           <AlertCircle className="w-4 h-4 text-exec-blue mb-2" />
           <span className="text-white">RECURSOS:</span> Los íconos <span className="text-exec-blue">azules</span> representan el material de referencia inicial. Los íconos <span className="text-green-500 animate-pulse">verdes</span> confirman que el equipo ya entregó el producto terminado.
        </div>
      </div>

      {showCreateModal && <CreateTask onClose={() => setShowCreateModal(false)} onTaskCreated={() => { setShowCreateModal(false); loadItems(); }} taskId={editingTaskId || undefined} />}

      {selectedTaskForDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
           <div className="bg-[#080808] border border-exec-border w-full max-w-3xl rounded-sm shadow-2xl relative flex flex-col max-h-[90vh]">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-exec-blue to-transparent"></div>
              
              <div className="p-6 border-b border-white/5 flex justify-between items-start bg-black/40">
                 <div>
                    <div className="flex gap-2 mb-2">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border ${STATUS_COLORS[selectedTaskForDetail.status]}`}>{selectedTaskForDetail.status}</span>
                       { selectedTaskForDetail.publication_date && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm bg-exec-blue/10 border border-exec-blue/30 text-exec-blue">Programado: {getDueDateInfo(selectedTaskForDetail.publication_date).text}</span> }
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">{selectedTaskForDetail.title}</h2>
                 </div>
                 <button onClick={() => setSelectedTaskForDetail(null)} className="p-2 hover:bg-white/5 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8 scrollbar-hide">
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Responsable</p>
                       <p className="text-xs font-bold text-gray-300">{selectedTaskForDetail.assignedUser?.full_name || 'Sin asignar'}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Entrega Producción</p>
                       <p className="text-xs font-bold text-white">{getDueDateInfo(selectedTaskForDetail.due_date).text}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Plataformas</p>
                       <p className="text-[9px] font-bold text-exec-blue uppercase">{selectedTaskForDetail.task_type}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Contenido</p>
                       <p className={`text-[10px] font-black uppercase ${selectedTaskForDetail.status === 'Completada' ? 'text-green-500' : 'text-amber-500'}`}>
                          {selectedTaskForDetail.status === 'Completada' ? 'LISTO PARA PUBLICAR' : 'EN DESARROLLO'}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] border-l-2 border-exec-blue pl-3">Briefing / Referencias (Jefatura de Imagen)</p>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-sm space-y-4">
                       <p className="text-xs text-gray-400 leading-relaxed">{selectedTaskForDetail.description}</p>
                       <div className="flex flex-wrap gap-2">
                          {selectedTaskForDetail.file_urls?.map((url, i) => (
                             <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-black border border-exec-blue/20 rounded-sm hover:border-exec-blue transition-all group">
                                <ImageIcon className="w-3 h-3 text-exec-blue" />
                                <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase">Referencia {i+1}</span>
                             </a>
                          ))}
                          {selectedTaskForDetail.link && (
                             <a href={selectedTaskForDetail.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-black border border-exec-blue/20 rounded-sm hover:border-exec-blue transition-all group">
                                <ExternalLink className="w-3 h-3 text-exec-blue" />
                                <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase">Link Referencia</span>
                             </a>
                          )}
                       </div>
                    </div>
                 </div>

                 {(selectedTaskForDetail.completion_files?.length || selectedTaskForDetail.completion_link) ? (
                    <div className="space-y-4 pt-6 border-t border-white/5">
                       <p className="text-[9px] font-black text-green-500 uppercase tracking-[0.2em] border-l-2 border-green-500 pl-3">Producto Terminado (Entregable Final)</p>
                       <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-sm flex flex-wrap gap-3">
                          {selectedTaskForDetail.completion_files?.map((url, i) => (
                             <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-black border border-green-500/30 rounded-sm hover:border-green-500 transition-all group">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest">Ver Entregable {i+1}</span>
                             </a>
                          ))}
                          {selectedTaskForDetail.completion_link && (
                             <a href={selectedTaskForDetail.completion_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-black border border-green-500/30 rounded-sm hover:border-green-500 transition-all group">
                                <ExternalLink className="w-4 h-4 text-green-500" />
                                <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest">Link Publicación</span>
                             </a>
                          )}
                       </div>
                    </div>
                 ) : (
                    <div className="p-6 border border-dashed border-white/5 rounded-sm text-center">
                       <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Esperando material final del equipo de producción</p>
                    </div>
                 )}
              </div>

              <div className="p-6 border-t border-white/5 bg-black/40 flex justify-between items-center">
                 <button onClick={() => setSelectedTaskForDetail(null)} className="text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Cerrar</button>
                 <button 
                    onClick={() => {
                       const taskId = selectedTaskForDetail.id;
                       setSelectedTaskForDetail(null);
                       setEditingTaskId(taskId);
                       setShowCreateModal(true);
                    }}
                    className="px-6 py-2.5 bg-[#111] border border-exec-border text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:border-exec-blue hover:shadow-glow-blue transition-all"
                 >
                    Editar Planificación
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
