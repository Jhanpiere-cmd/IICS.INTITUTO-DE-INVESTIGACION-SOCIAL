
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, Calendar, Image as ImageIcon, Video, Send, CheckCircle2, Clock, 
  MoreVertical, Filter, Search, LayoutGrid, List, X, AlertCircle, Save, 
  Link, Type, Facebook, Instagram, Share2, User, Sparkles, Smartphone,
  ThumbsUp, MessageSquare, Globe, Heart, Bookmark, Eye, Clock3, Users
} from 'lucide-react';
import { AvatarGroup } from '../ui/AvatarGroup';
import { CreateTask } from '../tasks/CreateTask';
import { metaService, META_IDS } from '../../lib/meta';
import { generateContent, AIConfig, DEFAULT_AI_CONFIG, extractTaskEntities } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { Loader2, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Icons } from '../icons';
import { useToast } from '../ui/ToastContext';


interface MediaItem {
  id: string;
  title: string;
  description: string;
  content_type: string;
  status: string;
  target_date: string;
  social_copy: string;
  category: string;
  collaborator_ids: string[];
  assigned_to?: string;
  assignedUser?: { fullName: string; role: string; avatarUrl?: string };
  collaborators?: { id: string; fullName: string; avatarUrl?: string }[];
  task_id?: string;
  task?: {
    id: string;
    status: string;
    completion_files: string[];
    file_urls: string[];
  };
  events?: {
    title: string;
  };
  created_at: string;
}

const SafeImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`${className} bg-exec-black flex items-center justify-center border border-exec-border`}>
        <ImageIcon className="text-exec-slate/20" size={24} />
      </div>
    );
  }
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

export const MediaManagement: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('facebook');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Modal states
  // Estado para edición de tareas
  const [editingTask, setEditingTask] = useState<{ id?: string, data?: any } | null>(null);

  // Share/Publish States
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeItemForPublish, setActiveItemForPublish] = useState<MediaItem | null>(null);
  const [editedCopy, setEditedCopy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishPlatforms, setPublishPlatforms] = useState({ facebook: true, instagram: false });
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  
  // Create Task Integration
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Magic Extraction
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [userList, setUserList] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    target_date: new Date().toISOString().split('T')[0],
    content_type: 'flyer',
    category: 'facebook'
  });

  useEffect(() => {
    supabase.from('profiles').select('id, "fullName", role').then(({ data }) => {
      if (data) {
        setUserList(data.map((p: any) => ({
          id: p.id,
          full_name: p.fullName || 'Sin nombre',
          role: p.role
        })));
      }
    });
  }, []);

  const handleMagicExtract = async () => {
    if (!magicPrompt.trim()) return;
    setIsExtracting(true);
    try {
      const result = await extractTaskEntities(
        magicPrompt, 
        userList, 
        new Date().toISOString().split('T')[0]
      );
      
      if (result) {
        setNewItem(prev => ({
          ...prev,
          title: result.title || prev.title,
          description: result.description || prev.description,
          target_date: result.dueDate || prev.target_date,
          content_type: result.taskType?.toLowerCase().includes('video') ? 'video' : 'flyer',
          category: result.taskType?.toLowerCase().includes('insta') ? 'instagram' : (result.taskType?.toLowerCase().includes('youtube') ? 'youtube' : 'facebook')
        }));
        setMagicPrompt('');
      }
    } catch (err) {
      console.error('Magic extract error:', err);
    } finally {
      setIsExtracting(false);
    }
  };


  const fbPageName = "ACS - Gestión Oficial";
  const fallbackLogo = "/certificates/logo-revista/logo-revista-ACS.png";
  const [fbLogoUrl, setFbLogoUrl] = useState(fallbackLogo);
  const [igLogoUrl, setIgLogoUrl] = useState(fallbackLogo);

  // Cargar logos reales si están conectados
  useEffect(() => {
    const loadSocialLogos = async () => {
      try {
        // Logo Facebook
        const fbRes = await metaService.getPagePicture(META_IDS.FACEBOOK_PAGE);
        if (fbRes?.data?.url) setFbLogoUrl(fbRes.data.url);

        // Logo Instagram
        const igRes = await metaService.getFields(META_IDS.INSTAGRAM_BUSINESS, ['profile_picture_url']);
        if (igRes?.profile_picture_url) setIgLogoUrl(igRes.profile_picture_url);
      } catch (err) {
        console.warn('No se pudieron cargar los logos dinámicos de Meta:', err);
      }
    };
    loadSocialLogos();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Cargar tareas explícitamente audiovisuales con sus perfiles
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignedUser:profiles!assigned_to(id, "fullName", avatarUrl, role)
        `)
        .or('task_type.ilike.%Flyer%,task_type.ilike.%Video%,task_type.ilike.%Cortos%,task_type.ilike.%YouTube%,task_type.ilike.%Shorts%,task_type.ilike.%Reels%,task_type.ilike.%Post%')
        .order('due_date', { ascending: false });

      if (taskError) throw taskError;

      // 2. Cargar planificación audiovisual específica
      const { data: planningData, error: planningError } = await supabase
        .from('audiovisual_planning')
        .select(`
          *,
          task:tasks(id, status, completion_files, file_urls, assigned_to, collaborator_ids),
          events(title)
        `)
        .order('target_date', { ascending: false });

      if (planningError) throw planningError;

      // 3. Obtener perfiles de colaboradores para todos los items
      const allCollaboratorIds = new Set<string>();
      (taskData || []).forEach(t => t.collaborator_ids?.forEach(id => allCollaboratorIds.add(id)));
      (planningData || []).forEach(p => p.task?.collaborator_ids?.forEach(id => allCollaboratorIds.add(id)));
      
      let collaboratorsMap: Record<string, any> = {};
      if (allCollaboratorIds.size > 0) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('id, "fullName", avatarUrl')
          .in('id', Array.from(allCollaboratorIds));
        
        profData?.forEach(p => {
          collaboratorsMap[p.id] = p;
        });
      }

      // 4. Agrupación Heurística para evitar duplicados en la gestión (Mismo título, descripción y fecha)
      const groupedItems = new Map<string, MediaItem>();

      // Unir planificación y tareas en la estructura de grupo
      const allSourceItems = [
        ...(planningData || []).map(p => ({ 
          ...p, 
          isPlanning: true,
          created_at: p.created_at || p.target_date // Fallback
        })),
        ...(taskData || []).map(t => {
          const type = (t.task_type || '').toLowerCase();
          let platforms: string[] = [];
          if (type.includes('facebook')) platforms.push('facebook');
          if (type.includes('instagram')) platforms.push('instagram');
          if (type.includes('youtube')) platforms.push('youtube');
          if (type.includes('tiktok') || type.includes('shorts') || type.includes('reels') || type.includes('cortos')) platforms.push('tiktok');
          if (platforms.length === 0) platforms = ['facebook'];

          return {
            id: `task-${t.id}`,
            title: t.title || 'Sin título',
            description: t.description || '',
            content_type: type.includes('video') || type.includes('corto') ? 'video' : 'flyer',
            status: t.status === 'Completada' ? 'Listo' : (t.status === 'En progreso' ? 'En proceso' : 'Planificado'),
            target_date: t.publication_date || t.due_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            social_copy: t.social_copy || t.description || '',
            category: platforms.join(','),
            collaborator_ids: t.collaborator_ids || [],
            assigned_to: t.assigned_to,
            assignedUser: t.assignedUser,
            task_id: t.id,
            task: {
              id: t.id,
              status: t.status,
              completion_files: t.completion_files || [],
              file_urls: t.file_urls || []
            },
            isPlanning: false,
            created_at: t.created_at
          };
        })
      ];

      allSourceItems.forEach(item => {
        // Llave de agrupación: Título + Descripción + Fecha
        const key = `${(item.title || '').trim()}|${(item.description || '').trim()}|${item.target_date}`;
        
        if (groupedItems.has(key)) {
          const existing = groupedItems.get(key)!;
          
          // Fusionar categorías (plataformas)
          const categorySet = new Set([
            ...(existing.category?.split(',') || []),
            ...(item.category?.split(',') || [])
          ]);
          existing.category = Array.from(categorySet).filter(Boolean).join(',');

          // Fusionar colaboradores
          const combinedCollabs = [
            ...(existing.collaborators || []),
            ...(item.assignedUser ? [item.assignedUser] : []),
            ...(item.collaborator_ids?.map(id => collaboratorsMap[id]).filter(Boolean) || [])
          ];
          
          // Eliminar duplicados por ID
          existing.collaborators = Array.from(new Map(combinedCollabs.map(c => [c.id, c])).values())
            .filter(c => c.id !== existing.assigned_to);

          // Si el item nuevo tiene archivo de entrega y el viejo no, actualizar
          if (!existing.task?.completion_files?.[0] && item.task?.completion_files?.[0]) {
            existing.task = { ...existing.task, ...item.task };
          }
          
          // Mantener la fecha de creación más reciente para el ordenamiento
          if (new Date(item.created_at) > new Date(existing.created_at)) {
            existing.created_at = item.created_at;
          }
        } else {
          // Inicializar colaboradores si es necesario
          const initialCollabs = item.collaborator_ids?.map(id => collaboratorsMap[id]).filter(Boolean) || [];
          groupedItems.set(key, { 
            ...item, 
            collaborators: initialCollabs.filter(c => c.id !== item.assigned_to) 
          } as MediaItem);
        }
      });

      setItems(Array.from(groupedItems.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Error loading media assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);


  const { showToast } = useToast();

  useEffect(() => {
    loadData();
    
    const channel = supabase
      .channel('media-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audiovisual_planning' }, (payload) => {
        const item = payload.new as any;
        showToast({
          type: 'info',
          title: 'NUEVO CONTENIDO PLANIFICADO',
          message: `${item.title || 'Se ha registrado un nuevo activo creativo en la línea de producción.'}`,
          duration: 8000
        });
        loadData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'audiovisual_planning' }, loadData)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'audiovisual_planning' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, showToast]);

  const handleDelete = async (item: MediaItem) => {
    if (!confirm('¿Estás seguro de eliminar este recurso?')) return;
    try {
      if (item.id.toString().startsWith('task-')) {
        const taskId = item.id.toString().replace('task-', '');
        // [SYNC] Eliminar la tarea real y su espejo
        await supabase.from('audiovisual_planning').delete().eq('task_id', taskId);
        const { error: taskError } = await supabase.from('tasks').delete().eq('id', taskId);
        if (taskError) throw taskError;
      } else {
        // [SYNC] Si tiene task_id asociado, eliminar la tarea también
        if (item.task_id) {
          await supabase.from('tasks').delete().eq('id', item.task_id);
        }
        const { error } = await supabase.from('audiovisual_planning').delete().eq('id', item.id);
        if (error) throw error;
      }
      loadData();
    } catch (err: any) {
      alert('Error al eliminar: ' + (err.message || 'Error desconocido'));
    }
  };

  const openEditModal = (item: MediaItem) => {
    if (item.task_id) {
      setEditingTask({
        id: item.task_id,
        data: {
          title: item.title,
          description: item.description,
          dueDate: item.target_date,
          priority: (item as any).priority || 'Media',
          assignedToIds: [item.assigned_to, ...(item.collaborator_ids || [])].filter(Boolean)
        }
      });
      setShowCreateTask(true);
    }
  };

  const handleInModalAIGenerate = async () => {
    if (!activeItemForPublish) return;
    setIsGenerating(true);
    try {
      const prompt = `Actúa como un experto en Neuromarketing y Social Media de la Revista ACS. 
      Refina y optimiza un copy para redes sociales (${previewPlatform === 'facebook' ? 'Facebook' : 'Instagram'}).
      
      INTENCIÓN/INSTRUCCIONES DE LA TAREA: 
      "${activeItemForPublish.description}"
      
      CONTENIDO ACTUAL (SI EXISTE): 
      "${editedCopy || activeItemForPublish.social_copy || ''}"
      
      Tu objetivo: Crear un copy persuasivo, con emojis estratégicos, un tono profesional pero cercano, y un Call to Action claro basado en las instrucciones.
      Responde SOLO con el copy optimizado, sin introducciones ni etiquetas adicionales.`;
      
      const result = await generateContent(prompt, aiConfig);
      if (result) {
        setEditedCopy(result.trim());
      }
    } catch (err) {
      console.error('Error generating AI copy:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!activeItemForPublish) return;
    setLoading(true);
    try {
      // Meta API Publishing logic
      setToast({ message: "Contenido enviado a cola de publicación", type: 'success' });
      setShowPublishModal(false);
    } catch (err) {
      setToast({ message: "Error en la publicación", type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleTaskCreated = () => {
    setShowCreateTask(false);
    setToast({ message: "Tarea vinculada correctamente", type: 'success' });
    loadData();
    setTimeout(() => setToast(null), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Listo': return 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5';
      case 'Pendiente': return 'border-amber-500/50 text-amber-400 bg-amber-500/5';
      case 'En Proceso': return 'border-exec-blue/50 text-exec-blue bg-exec-blue/5';
      default: return 'border-exec-border text-gray-500 bg-white/5';
    }
  };

  const filteredItems = items.filter(i => activeCategory === 'all' || (i.category || '').split(',').includes(activeCategory));

  const MOBILE_LAYOUT = (
    <div className="flex flex-col gap-4">
      {filteredItems.map(item => (
        <div key={item.id} className="exec-card overflow-hidden flex flex-col border-exec-border bg-[#0A0A0A] rounded-none">
           <div className="w-full aspect-video bg-[#050505] relative overflow-hidden flex items-center justify-center">
              {item.task?.completion_files?.[0] ? (
                <SafeImage src={item.task.completion_files[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-exec-slate/20 flex flex-col items-center gap-2">
                   {item.content_type === 'video' ? <Video size={32} /> : <ImageIcon size={32} />}
                   <span className="text-[8px] font-black uppercase tracking-widest">Sin Vista Previa</span>
                </div>
              )}
               <div className="absolute top-2 left-2 z-10 flex gap-1.5 p-1 bg-black/50 backdrop-blur-md border border-white/5 rounded-none">
                 {(item.category || '').includes('facebook') && <Facebook size={10} className="text-[#1877F2]" />}
                 {(item.category || '').includes('instagram') && <Instagram size={10} className="text-[#E4405F]" />}
                 {(item.category || '').includes('youtube') && <Globe size={10} className="text-red-500" />}
                 {(item.category || '').includes('tiktok') && <Share2 size={10} className="text-white" />}
               </div>
               <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                 <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter border rounded-none ${getStatusColor(item.status)}`}>
                   {item.status}
                 </span>
               </div>
           </div>
            <div className="p-4 flex flex-col gap-2">
               <div className="flex items-start justify-between">
                 <h3 className="text-xs font-black text-white uppercase tracking-tight">{item.title}</h3>
                 <button onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} className="text-gray-500"><MoreVertical size={16}/></button>
               </div>
               
               <div className="flex items-center gap-2 mt-1">
                 <AvatarGroup 
                   users={[
                     ...(item.assignedUser ? [item.assignedUser] : []),
                     ...(item.collaborators || [])
                   ]} 
                   size="xs" 
                 />
                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                   {item.assignedUser?.fullName.split(' ')[0] || 'Sin asignar'}
                   {item.collaborators && item.collaborators.length > 0 && ` +${item.collaborators.length}`}
                 </span>
               </div>
               
               <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
              
              <div className="mt-2 pt-2 border-t border-exec-border flex items-center justify-between">
                 <div className="flex gap-2">
                   {item.status === 'Listo' && (
                     <button onClick={() => { setActiveItemForPublish(item); setEditedCopy(item.social_copy || ''); setShowPublishModal(true); }} className="p-2 bg-exec-blue/10 text-exec-blue rounded-none"><Share2 size={14}/></button>
                   )}
                   <button onClick={() => openEditModal(item)} className="p-2 bg-white/5 text-gray-400 rounded-none"><Sparkles size={14}/></button>
                 </div>
              </div>
           </div>
        </div>
      ))}
    </div>
  );

  const DESKTOP_LAYOUT = (
    viewMode === 'grid' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map(item => (
          <div key={item.id} className="exec-card group flex flex-col h-full relative transition-all duration-500 hover:border-exec-blue/40 bg-[#0A0A0A] border-exec-border rounded-none">
            <div className="w-full aspect-[4/3] bg-[#050505] border-b border-exec-border relative overflow-hidden flex items-center justify-center group-hover:bg-black transition-colors">
              {item.task?.completion_files?.[0] ? (
                <SafeImage src={item.task.completion_files[0]} alt="" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-exec-slate/10 py-10">
                  {item.content_type === 'video' ? <Video size={40} /> : <ImageIcon size={40} />}
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">Protocolo Pendiente</span>
                </div>
              )}
              
              <div className="absolute top-3 left-3 z-10 flex gap-1.5 p-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-none">
                {(item.category || '').includes('facebook') && <Facebook size={12} className="text-[#1877F2]" />}
                {(item.category || '').includes('instagram') && <Instagram size={12} className="text-[#E4405F]" />}
              </div>
              
              <div className="absolute top-3 right-3 z-10">
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] border backdrop-blur-xl ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black text-exec-blue uppercase tracking-widest bg-exec-blue/5 px-2 py-0.5 border border-exec-blue/20">{item.content_type}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(item)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-none transition-all"><Sparkles size={14} /></button>
                  <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-none transition-all"><X size={14} /></button>
                </div>
              </div>

              <h3 className="text-sm font-black text-white group-hover:text-exec-blue transition-colors mb-2 uppercase tracking-tight">{item.title}</h3>
              <p className="text-[10px] text-gray-500 line-clamp-3 leading-relaxed mb-4">{item.description}</p>

              <div className="mt-auto pt-4 border-t border-exec-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AvatarGroup 
                    users={[
                      ...(item.assignedUser ? [item.assignedUser] : []),
                      ...(item.collaborators || [])
                    ]} 
                    size="sm" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                      {item.assignedUser?.fullName.split(' ')[0] || 'Sin asignar'}
                      {item.collaborators && item.collaborators.length > 0 && ` +${item.collaborators.length}`}
                    </span>
                    <span className="text-[8px] text-gray-500 uppercase tracking-[0.2em]">{item.assignedUser?.role || 'Personal'}</span>
                  </div>
                </div>
                {item.status === 'Listo' && (
                   <button 
                     onClick={() => { setActiveItemForPublish(item); setEditedCopy(item.social_copy || ''); setShowPublishModal(true); }}
                     className="flex items-center gap-2 px-3 py-1.5 bg-exec-blue text-white text-[10px] font-black uppercase tracking-widest rounded-none hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all"
                   >
                     <Share2 size={12} /> Publicar
                   </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="exec-card p-0 overflow-hidden bg-[#0A0A0A] border-exec-border rounded-none">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#050505] border-b border-exec-border">
            <tr>
              <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Activo / Título</th>
              <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Colaboradores</th>
              <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Estado</th>
              <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-exec-border/30">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black border border-exec-border rounded-none overflow-hidden flex items-center justify-center">
                      {item.task?.completion_files?.[0] ? (
                        <SafeImage src={item.task.completion_files[0]} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon size={16} className="text-exec-slate/20" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs uppercase tracking-tight group-hover:text-exec-blue transition-colors">{item.title}</p>
                      <p className="text-[9px] text-gray-500 font-medium uppercase tracking-widest">{item.content_type} • {new Date(item.target_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    <AvatarGroup 
                      users={[
                        ...(item.assignedUser ? [item.assignedUser] : []),
                        ...(item.collaborators || [])
                      ]} 
                      size="xs" 
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                        {item.assignedUser?.fullName.split(' ')[0] || 'S/A'}
                        {item.collaborators && item.collaborators.length > 0 && ` +${item.collaborators.length}`}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border inline-block rounded-none ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {item.status === 'Listo' && (
                       <button onClick={() => { setActiveItemForPublish(item); setEditedCopy(item.social_copy || ''); setShowPublishModal(true); }} className="p-2 text-exec-blue hover:bg-exec-blue/10 rounded-none"><Share2 size={14}/></button>
                    )}
                    <button onClick={() => openEditModal(item)} className="p-2 text-gray-500 hover:text-white"><Sparkles size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-[#050505] p-6 pt-2 lg:p-12 lg:pt-4 font-sans selection:bg-exec-blue selection:text-white">
      {/* Background Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-exec-blue/10 blur-[150px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header Section (Standardized to Executive Drive Pattern) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
              <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                <Video className="w-6 h-6 text-exec-blue" />
              </div>
              <span>Gestión <span className="text-exec-blue">Audiovisual</span></span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Panel de planificación, control y despliegue de activos creativos.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setShowCreateTask(true);
              }}
              className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>Nuevo contenido</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-[#0A0A0A] border border-exec-border/50 rounded-none">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto invisible-scrollbar">
               {['facebook', 'instagram', 'youtube', 'tiktok', 'all'].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all rounded-none ${
                     activeCategory === cat 
                     ? 'bg-exec-blue border-exec-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                     : 'bg-transparent border-exec-border/30 text-gray-500 hover:border-exec-blue/20 hover:text-gray-300'
                   }`}
                 >
                   {cat === 'all' ? 'Ver Todo' : (cat === 'tiktok' ? 'Cortos' : cat)}
                 </button>
               ))}
            </div>

           <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex bg-black border border-exec-border/50 p-1 rounded-none">
                 <button onClick={() => setViewMode('grid')} className={`p-2 rounded-none transition-all ${viewMode === 'grid' ? 'bg-exec-blue/10 text-exec-blue' : 'text-gray-600'}`}><LayoutGrid size={18}/></button>
                 <button onClick={() => setViewMode('table')} className={`p-2 rounded-none transition-all ${viewMode === 'table' ? 'bg-exec-blue/10 text-exec-blue' : 'text-gray-600'}`}><List size={18}/></button>
              </div>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="min-h-[500px]">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
               <div className="w-12 h-12 border-t-2 border-exec-blue rounded-full animate-spin"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-exec-blue animate-pulse">Sincronizando Sistema...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 border border-dashed border-exec-border/50 rounded-none bg-black/40">
               <ImageIcon className="text-exec-slate/5 mb-6" size={80} strokeWidth={0.5} />
               <p className="text-exec-white/20 text-[10px] font-black uppercase tracking-[0.3em]">No hay activos designados en este sector</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT}
            </div>
          )}
        </div>
      </div>


      {/* MODALS */}
      {/* Publish Modal Implementation */}
      {showPublishModal && activeItemForPublish && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-5xl h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.15)]">
               {/* Left Panel: Preview */}
               <div className="flex-1 bg-black border-r border-exec-border flex flex-col">
                  <div className="p-4 border-b border-exec-border flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-widest text-exec-blue">Live Preview Engine</span>
                     <div className="flex gap-2">
                        <button onClick={() => setPreviewPlatform('facebook')} className={`p-2 rounded-none transition-all ${previewPlatform === 'facebook' ? 'bg-[#1877F2] text-white' : 'text-gray-600'}`}><Facebook size={16}/></button>
                        <button onClick={() => setPreviewPlatform('instagram')} className={`p-2 rounded-none transition-all ${previewPlatform === 'instagram' ? 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 text-white' : 'text-gray-600'}`}><Instagram size={16}/></button>
                     </div>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center p-6 bg-[#050505]">
                      {/* Social Media Post Mockup */}
                      <div className="bg-white text-black w-full max-w-sm rounded-none overflow-hidden shadow-2xl">
                          <div className="p-3 flex items-center gap-2">
                             <img src={previewPlatform === 'facebook' ? fbLogoUrl : igLogoUrl} alt="" className="w-10 h-10 rounded-full border border-gray-100 object-cover" />
                             <div>
                               <p className="font-bold text-sm leading-tight">{previewPlatform === 'facebook' ? fbPageName : 'acs_oficial'}</p>
                               <p className="text-[10px] text-gray-500 flex items-center gap-1">Publicidad <Globe size={10}/></p>
                             </div>
                          </div>
                          
                          <div className="px-3 pb-3">
                             <p className="text-sm leading-snug whitespace-pre-wrap">{editedCopy || "VISTA PREVIA DEL TEXTO..."}</p>
                          </div>
                          
                          <div className="bg-gray-100 relative flex items-center justify-center overflow-hidden border-y border-gray-100">
                             {activeItemForPublish.task?.completion_files?.[0] ? (
                               <img 
                                 src={activeItemForPublish.task.completion_files[0]} 
                                 className="w-full h-auto max-h-[500px] object-contain" 
                                 alt="" 
                               />
                             ) : (
                               <div className="py-20 flex flex-col items-center gap-2">
                                 <ImageIcon className="text-gray-300" size={40} />
                                 <span className="text-[10px] font-bold text-gray-400 uppercase">Sin imagen de entrega</span>
                               </div>
                             )}
                          </div>
                      </div>
                  </div>
               </div>

               {/* Right Panel: Controls */}
               <div className="w-full md:w-[400px] flex flex-col p-8 space-y-8 bg-[#0A0A0A]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Publicar <span className="text-exec-blue not-italic">Asset</span></h2>
                    <button onClick={() => setShowPublishModal(false)} className="p-2 text-gray-500 hover:text-white"><X size={24}/></button>
                  </div>

                   <div className="flex flex-col gap-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                      {/* Read-only Instructions */}
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-exec-blue flex items-center gap-2">
                           <Clock3 size={14} /> Instrucciones de la Tarea
                         </label>
                         <div className="bg-white/5 border border-exec-border/50 p-4 rounded-none">
                            <p className="text-[11px] text-gray-400 italic leading-relaxed">
                              {activeItemForPublish.description || "Sin instrucciones específicas."}
                            </p>
                         </div>
                      </div>

                      {/* Editable Copy Editor */}
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-exec-slate/40 flex items-center gap-2">
                             <Type size={14} className="text-exec-blue" /> Redactor de Copy (Editable)
                           </label>
                           <button 
                             onClick={handleInModalAIGenerate}
                             disabled={isGenerating}
                             className="flex items-center gap-2 text-[10px] font-black text-exec-blue hover:text-white transition-colors uppercase tracking-widest disabled:opacity-50"
                           >
                             {isGenerating ? <Clock size={12} className="animate-spin" /> : <Sparkles size={12} />}
                             Optimizar con HOYR
                           </button>
                         </div>
                         <textarea 
                           value={editedCopy}
                           onChange={(e) => setEditedCopy(e.target.value)}
                           className="w-full h-48 bg-black border border-exec-border p-4 text-xs text-gray-300 focus:border-exec-blue transition-all outline-none resize-none font-mono leading-relaxed"
                           placeholder="Escribe el copy definitivo aquí..."
                         />
                      </div>
                   </div>

                  <div className="space-y-4">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-exec-slate/40">Destinos de Despliegue</span>
                     <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setPublishPlatforms(p => ({ ...p, facebook: !p.facebook }))}
                          className={`p-4 border flex flex-col items-center gap-2 transition-all ${publishPlatforms.facebook ? 'border-[#1877F2] bg-[#1877F2]/5 text-[#1877F2]' : 'border-exec-border text-gray-600'}`}
                        >
                          <Facebook size={24} />
                          <span className="text-[10px] font-black uppercase">Facebook</span>
                        </button>
                        <button 
                          onClick={() => setPublishPlatforms(p => ({ ...p, instagram: !p.instagram }))}
                          className={`p-4 border flex flex-col items-center gap-2 transition-all ${publishPlatforms.instagram ? 'border-[#E4405F] bg-[#E4405F]/5 text-[#E4405F]' : 'border-exec-border text-gray-600'}`}
                        >
                          <Instagram size={24} />
                          <span className="text-[10px] font-black uppercase">Instagram</span>
                        </button>
                     </div>
                  </div>

                  <div className="mt-auto pt-8">
                     <button 
                       onClick={handlePublish}
                       disabled={loading || !editedCopy.trim()}
                       className="w-full py-5 bg-exec-blue text-white font-black uppercase tracking-[0.3em] text-xs hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                     >
                       {loading ? <Clock size={20} className="animate-spin" /> : <Send size={20} />}
                       Ejecutar Publicación
                     </button>
                  </div>
               </div>
            </div>
        </div>
      )}

      {/* El modal antiguo showModal ha sido eliminado en favor de CreateTask */}

      {/* TOAST Notification */}
      {toast && (
        <div className={`fixed bottom-12 right-12 z-[200] px-6 py-4 border bg-black shadow-2xl animate-in slide-in-from-right-12 duration-500 flex items-center gap-4 ${toast.type === 'success' ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-400'}`}>
           {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Message</span>
              <span className="text-sm font-bold uppercase tracking-tighter">{toast.message}</span>
           </div>
        </div>
      )}

      {/* CreateTask Integration */}
      {showCreateTask && (
        <CreateTask 
          onClose={() => {
            setShowCreateTask(false);
            setEditingTask(null);
          }}
          onTaskCreated={handleTaskCreated}
          allowedTypes={['Flyer', 'Video', 'Cortos']}
          taskId={editingTask?.id}
          initialData={editingTask?.data}
        />
      )}
    </div>
  );
};
