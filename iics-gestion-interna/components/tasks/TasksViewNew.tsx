import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useToast } from '../ui/ToastContext';
import { CreateTask } from './CreateTask';
import { TaskDetail } from './TaskDetail';
import { generateTaskDetails, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { TaskFormData } from './CreateTask';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { AvatarGroup } from '../ui/AvatarGroup';
import { Plus, CheckCircle2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  collaborator_ids?: string[]; // Nueva gestión multi-asignado
  created_by: string;
  status: string;
  priority: string;
  due_date: string;
  file_urls?: string[];
  link?: string;
  completion_message?: string;
  completion_files?: string[];
  completed_at?: string;
  created_at: string;
  group_task_id?: string | null;
  assignedUser?: { fullName: string; role: string; email: string; avatarUrl?: string };
  createdByUser?: { fullName: string; role: string; avatarUrl?: string };
  // Co-asignados y colaboradores (llenado en fetchTasks)
  collaborators?: { id: string; fullName: string; avatarUrl?: string }[];
}

interface TasksViewNewProps {
  initialFilter?: { tab?: 'my-tasks' | 'other-tasks' | 'completed', status?: string };
}

export const TasksViewNew: React.FC<TasksViewNewProps> = ({ initialFilter }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter?.status || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [viewTab, setViewTab] = useState<string>(initialFilter?.tab || 'my-tasks');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados para IA
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showCreateTaskWithData, setShowCreateTaskWithData] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<Partial<TaskFormData> | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

  const handleGenerateTask = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);

    try {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, "fullName", role')
        .eq('status', 'Aprobado');

      const usersList = usersData?.map((u: any) => ({
        id: u.id,
        fullName: u.fullName || 'Sin nombre',
        role: u.role
      })) || [];

      const taskDetails = await generateTaskDetails(aiPrompt, usersList, aiConfig);

      if (taskDetails) {
        setAiGeneratedData(taskDetails);
        setShowAiPrompt(false);
        setAiPrompt('');
        setShowCreateTaskWithData(true);
      }
    } catch (error: any) {
      console.error("Error generando tarea con IA:", error);
      const msg = error.message?.includes('429') 
        ? "Cuota de IA excedida. Por favor, intenta de nuevo en unos minutos o usa la creación manual." 
        : "No se pudo interpretar la solicitud. Intenta ser más específico con el título y quién debe realizarla.";
      showToast({
        type: 'error',
        title: 'Error de IA',
        message: msg
      });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const ch = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const newTask = payload.new as any;
        // Solo notificar si el usuario actual es el asignado o un colaborador, y no es el creador
        const isTarget = newTask.assigned_to === user?.id || newTask.collaborator_ids?.includes(user?.id || '');
        if (isTarget && newTask.created_by !== user?.id) {
          showToast({
            type: 'info',
            title: 'NUEVA TAREA ASIGNADA',
            message: `${newTask.title || 'Se te ha asignado una nueva responsabilidad estratégica.'}`,
            duration: 8000
          });
        }
        fetchTasks();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, showToast]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, statusFilter, priorityFilter, viewTab]);

  // Handle pre-fill from Orchestrator
  useEffect(() => {
    if (location.state?.action === 'create' && location.state?.data) {
      const data = location.state.data;
      setAiGeneratedData(data);
      setShowCreateTaskWithData(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchTasks = async () => {
    try {
      // 1. Cargar todas las tareas y perfiles básicos
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_user:profiles!assigned_to("fullName", role, "avatarUrl"),
          created_by_user:profiles!created_by("fullName", role, "avatarUrl")
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Cargar TODOS los perfiles para resolver colaboradores de forma eficiente
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, "fullName", "avatarUrl"');
      
      const profilesMap = new Map(allProfiles?.map(p => [p.id, p]) || []);

      const processedTasks: Task[] = (data || []).map((task: any) => {
        // Resolver colaboradores desde el array de IDs
        const collaborators = (task.collaborator_ids || []).map((id: string) => {
          const p = profilesMap.get(id);
          return p ? { id: p.id, fullName: p.fullName, avatarUrl: p.avatarUrl } : null;
        }).filter(Boolean);

        return {
          ...task,
          assignedUser: task.assigned_to_user || undefined,
          createdByUser: task.created_by_user || undefined,
          collaborators
        };
      });

      // 3. Agrupación Heurística para evitar duplicados visuales (Legado)
      const groupedTasks = new Map<string, Task>();
      
      processedTasks.forEach(task => {
        // Generar una llave única para identificar tareas lógicamente idénticas
        const key = `${task.title?.trim()}|${task.description?.trim()}|${task.due_date}|${task.created_by}`;
        
        if (groupedTasks.has(key)) {
          const existing = groupedTasks.get(key)!;
          // Fusionar colaboradores: el assigned_to de la fila duplicada se convierte en colaborador de la maestra
          const extraCollabs = [
            ...(task.collaborators || []),
            ...(task.assignedUser ? [{ id: task.assigned_to, fullName: task.assignedUser.fullName, avatarUrl: task.assignedUser.avatarUrl }] : [])
          ];
          
          const combined = [...(existing.collaborators || []), ...extraCollabs];
          // Eliminar duplicados por ID (para visualización)
          existing.collaborators = Array.from(new Map(combined.map(c => [c.id, c])).values())
            .filter(c => c.id !== existing.assigned_to);

          // ACTUALIZAR collaborator_ids para que los filtros funcionen (My Tasks)
          const allIds = [
            ...(existing.collaborator_ids || []),
            ...(task.collaborator_ids || []),
            task.assigned_to
          ];
          existing.collaborator_ids = Array.from(new Set(allIds)).filter(id => id !== existing.assigned_to);
        } else {
          groupedTasks.set(key, { ...task });
        }
      });

      const finalTasks = Array.from(groupedTasks.values());
      setTasks(finalTasks);

      // Si hay una tarea abierta en el modal, actualizarla con los datos frescos
      setSelectedTask(prev => {
        if (!prev) return null;
        const refreshed = finalTasks.find((t: any) => t.id === prev.id);
        return refreshed || prev;
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    if (viewTab === 'my-tasks') {
      filtered = filtered.filter(task => (task.assigned_to === user?.id || task.collaborator_ids?.includes(user?.id || '')) && task.status !== 'Completada');
      filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    } else if (viewTab === 'my-completed') {
      filtered = filtered.filter(task => (task.assigned_to === user?.id || task.collaborator_ids?.includes(user?.id || '')) && task.status === 'Completada');
      filtered.sort((a, b) => (new Date(b.completed_at || 0).getTime()) - (new Date(a.completed_at || 0).getTime()));
    } else if (viewTab === 'other-tasks') {
      // Filtrar tareas donde el usuario NI es el asignado principal NI es colaborador
      filtered = filtered.filter(task => task.assigned_to !== user?.id && !task.collaborator_ids?.includes(user?.id || '') && task.status !== 'Completada');
      filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    } else if (viewTab === 'other-completed') {
      filtered = filtered.filter(task => task.assigned_to !== user?.id && !task.collaborator_ids?.includes(user?.id || '') && task.status === 'Completada');
      filtered.sort((a, b) => (new Date(b.completed_at || 0).getTime()) - (new Date(a.completed_at || 0).getTime()));
    } else if (viewTab === 'completed') {
      filtered = filtered.filter(task => task.status === 'Completada');
      filtered.sort((a, b) => {
        const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return dateB - dateA;
      });
    } else if (viewTab === 'all-active') {
      filtered = filtered.filter(task => task.status !== 'Completada');
      filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    } else if (viewTab === 'all-tasks') {
      filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    }

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all' && viewTab !== 'completed' && viewTab !== 'my-completed' && viewTab !== 'other-completed') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Completada': return { color: 'text-exec-green', bg: 'bg-exec-green/10', border: 'border-exec-green/30', dot: 'bg-exec-green', icon: 'check_circle' };
      case 'En progreso': return { color: 'text-exec-blue', bg: 'bg-exec-blue/10', border: 'border-exec-blue/30', dot: 'bg-exec-blue', icon: 'pending' };
      case 'En espera': return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400', icon: 'schedule' };
      default: return { color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30', dot: 'bg-gray-400', icon: 'radio_button_unchecked' };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'Urgente': return { color: 'text-red-500', dot: 'bg-red-500', glow: 'shadow-[0_0_6px_rgba(239,68,68,0.4)]' };
      case 'Alta': return { color: 'text-orange-400', dot: 'bg-orange-400', glow: 'shadow-[0_0_6px_rgba(251,146,60,0.3)]' };
      case 'Media': return { color: 'text-yellow-400', dot: 'bg-yellow-400', glow: '' };
      case 'Baja': return { color: 'text-exec-green', dot: 'bg-exec-green', glow: '' };
      default: return { color: 'text-gray-500', dot: 'bg-gray-500', glow: '' };
    }
  };

  const role = user?.role?.toLowerCase() || '';
  const canCreateTask = role.includes('director') ||
    role.includes('asesor') ||
    (role.includes('imagen') && role.includes('jefa')) ||
    role.includes('subdirector') ||
    role.includes('secretaria') ||
    role.includes('coordinador') ||
    role.includes('relaciones');

  const myTasks = tasks.filter(t => (t.assigned_to === user?.id || t.collaborator_ids?.includes(user?.id || '')) && t.status !== 'Completada');
  const pendingTasks = tasks.filter(t => (t.assigned_to === user?.id || t.collaborator_ids?.includes(user?.id || '')) && t.status === 'Pendiente');
  const inProgressTasks = tasks.filter(t => (t.assigned_to === user?.id || t.collaborator_ids?.includes(user?.id || '')) && t.status === 'En progreso');
  const completedTasks = tasks.filter(t => (t.assigned_to === user?.id || t.collaborator_ids?.includes(user?.id || '')) && t.status === 'Completada');

  const getDueDateInfo = (dueDate: string) => {
    // Parsear YYYY-MM-DD directamente como fecha LOCAL para evitar desfase UTC→local
    const parts = dueDate.substring(0, 10).split('-');
    const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Vencida hace ${Math.abs(diffDays)}d`, color: 'text-red-500' };
    if (diffDays === 0) return { text: 'Hoy', color: 'text-red-500' };
    if (diffDays <= 2) return { text: `${diffDays}d restantes`, color: 'text-yellow-400' };
    // Formato manual: d/M sin conversión UTC
    return { text: `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`, color: 'text-gray-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-exec-border border-t-exec-blue"></div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Cargando tareas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6">
      {/* ═══ VISTA ESCRITORIO (ORIGINAL) ═══ */}
      <div className="hidden md:block space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <CheckCircle2 className="w-6 h-6 text-exec-blue" />
            </div>
            <span>Gestión de <span className="text-exec-blue">Tareas</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Administración estratégica y seguimiento táctico de asignaciones.</p>
        </div>
        {canCreateTask && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAiPrompt(true)}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
              Asignar con IA
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Tarea
            </button>
          </div>
        )}
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      {/* ═══ METRIC CARDS (Stitch Ultra Modern) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        {/* Mis Tareas - Primary Blue */}
        <div
          onClick={() => setViewTab('my-tasks')}
          className="exec-card p-5 flex flex-col justify-between h-32 hover:border-exec-blue transition-colors bg-[#0A0A0A] cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-exec-blue transition-colors">Mis Tareas</h3>
            <span className="material-symbols-outlined text-exec-blue text-xl group-hover:scale-110 transition-transform">assignment_ind</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{myTasks.length}</p>
            <div className="flex items-center gap-1 text-xs text-exec-blue/80 mt-1">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span className="font-medium">activas</span>
            </div>
          </div>
        </div>

        {/* Pendientes - Yellow */}
        <div
          onClick={() => { setViewTab('my-tasks'); setStatusFilter('Pendiente'); }}
          className="exec-card p-5 flex flex-col justify-between h-32 hover:border-yellow-500 transition-colors bg-[#0A0A0A] cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-yellow-500 transition-colors">Pendientes</h3>
            <span className="material-symbols-outlined text-yellow-500 text-xl group-hover:scale-110 transition-transform">schedule</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{pendingTasks.length}</p>
            <div className="flex items-center gap-1 text-xs text-yellow-500/80 mt-1">
              <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
              <span className="font-medium">por iniciar</span>
            </div>
          </div>
        </div>

        {/* En Progreso - Indigo/Executive Blue */}
        <div
          onClick={() => { setViewTab('my-tasks'); setStatusFilter('En progreso'); }}
          className="exec-card p-5 flex flex-col justify-between h-32 hover:border-exec-blue transition-colors bg-[#0A0A0A] cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-exec-blue transition-colors">En Progreso</h3>
            <span className="material-symbols-outlined text-exec-blue text-xl group-hover:scale-110 transition-transform">pending</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{inProgressTasks.length}</p>
            <div className="flex items-center gap-1 text-xs text-exec-blue/80 mt-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span className="font-medium">trabajando</span>
            </div>
          </div>
        </div>

        {/* Completadas - Green */}
        <div
          onClick={() => setViewTab('my-completed')}
          className="exec-card p-5 flex flex-col justify-between h-32 hover:border-exec-green transition-colors bg-[#0A0A0A] cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider group-hover:text-exec-green transition-colors">Mis Terminadas</h3>
            <span className="material-symbols-outlined text-exec-green text-xl group-hover:scale-110 transition-transform">check_circle</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{completedTasks.length}</p>
            <div className="flex items-center gap-1 text-xs text-exec-green/80 mt-1">
              <span className="material-symbols-outlined text-[14px]">done_all</span>
              <span className="font-medium">finalizadas</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS + FILTERS BAR ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Pill Tabs */}
        <div className="flex items-center gap-1 bg-[#0A0A0A] border border-exec-border rounded-none p-1 overflow-x-auto whitespace-nowrap scrollbar-hide w-full lg:w-auto">
          <button
            onClick={() => setViewTab('my-tasks')}
            className={`px-4 py-1.5 text-xs font-medium rounded-none transition-all ${viewTab === 'my-tasks'
              ? 'bg-[#171717] text-white shadow-sm'
              : 'text-gray-500 hover:text-white'
              }`}
          >
            Mis Tareas [{tasks.filter(t => (t.assigned_to === user?.id || t.collaborator_ids?.includes(user?.id || '')) && t.status !== 'Completada').length}]
          </button>
          <button
            onClick={() => setViewTab('my-completed')}
            className={`px-4 py-1.5 text-xs font-medium rounded-none transition-all flex items-center gap-1.5 ${viewTab === 'my-completed'
              ? 'bg-[#171717] text-exec-green shadow-sm'
              : 'text-gray-500 hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">check</span> Mis Completadas
          </button>
          <button
            onClick={() => setViewTab('other-tasks')}
            className={`px-4 py-1.5 text-xs font-medium rounded-none transition-all ${viewTab === 'other-tasks'
              ? 'bg-[#171717] text-white shadow-sm'
              : 'text-gray-500 hover:text-white'
              }`}
          >
            Equipo (Activas) [{tasks.filter(t => t.assigned_to !== user?.id && !t.collaborator_ids?.includes(user?.id || '') && t.status !== 'Completada').length}]
          </button>
          <button
            onClick={() => setViewTab('other-completed')}
            className={`px-4 py-1.5 text-xs font-medium rounded-none transition-all flex items-center gap-1.5 ${viewTab === 'other-completed'
              ? 'bg-[#171717] text-exec-green shadow-sm'
              : 'text-gray-500 hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">done_all</span> Equipo (Completadas)
          </button>
          <button
            onClick={() => setViewTab('all-active')}
            className={`px-4 py-1.5 text-xs font-medium rounded-none transition-all flex items-center gap-1.5 ${viewTab === 'all-active'
              ? 'bg-[#171717] text-exec-blue shadow-sm'
              : 'text-gray-500 hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">pending_actions</span> Pendientes [{tasks.filter(t => t.status !== 'Completada').length}]
          </button>
          <button
            onClick={() => setViewTab('all-tasks')}
            className={`px-4 py-1.5 text-xs font-medium rounded-none transition-all flex items-center gap-1.5 ${viewTab === 'all-tasks'
              ? 'bg-[#171717] text-gray-200 shadow-sm border border-exec-border/50'
              : 'text-gray-500 hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">history</span> Historial [{tasks.length}]
          </button>
        </div>

        {/* View Toggle + Search */}
        <div className="flex items-center gap-3">
          {/* Layout Toggles */}
          <div className="flex bg-[#0A0A0A] border border-exec-border rounded-none p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-none transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-[#171717] text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
              title="Vista Cuadrícula"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-none transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-[#171717] text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
              title="Vista Lista"
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>

          <div className="h-6 w-px bg-exec-border"></div>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tareas..."
              className="exec-input pl-9 pr-4 py-2 w-48 text-xs"
            />
          </div>

          <div className="h-6 w-px bg-exec-border"></div>

          {/* Status Filter */}
          <div className="exec-select-container">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">filter_list</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="exec-filter"
            >
              <option value="all">Todo estado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En progreso">En Progreso</option>
              <option value="En espera">En Espera</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="exec-select-container">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">priority_high</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="exec-filter"
            >
              <option value="all">Toda prioridad</option>
              <option value="Urgente">Urgente</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══ TASKS TABLE / CARDS ═══ */}
      <div className="space-y-4">
        {/* Desktop Table */}
        {viewMode === 'list' && (
          <div className="hidden md:block exec-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-exec-border">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Tarea
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Asignado A
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Asignado Por
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Prioridad
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Fecha Límite
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => {
                  const statusCfg = getStatusConfig(task.status);
                  const priorityCfg = getPriorityConfig(task.priority);
                  const dueDateInfo = getDueDateInfo(task.due_date);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`border-b border-exec-border/50 hover:bg-[#111] cursor-pointer transition-colors group ${idx === filteredTasks.length - 1 ? 'border-b-0' : ''
                        }`}
                    >
                      {/* Tarea */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className={`material-symbols-outlined text-[18px] mt-0.5 ${statusCfg.color} opacity-60 group-hover:opacity-100 transition-opacity`}>
                            {statusCfg.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate max-w-[260px] group-hover:text-exec-blue transition-colors">
                                {task.title}
                              </p>
                              {task.group_task_id && (
                                <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 bg-exec-blue/10 border border-exec-blue/30 rounded text-[9px] font-bold text-exec-blue uppercase tracking-wide">
                                  <span className="material-symbols-outlined text-[10px]">group</span>
                                  Compartida
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate max-w-[280px] mt-0.5">
                              {task.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Asignado A */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <AvatarGroup 
                            users={[
                              ...(task.assignedUser ? [{ id: task.assigned_to, fullName: task.assignedUser.fullName, avatarUrl: task.assignedUser.avatarUrl }] : []),
                              ...(task.collaborators || [])
                            ]} 
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {task.assignedUser?.fullName.split(' ')[0]} 
                              {task.collaborators && task.collaborators.length > 0 && ` +${task.collaborators.length}`}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">{task.assignedUser?.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Asignado Por */}
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-300 truncate">{task.createdByUser?.fullName}</p>
                          <p className="text-[10px] text-gray-500 truncate">{task.createdByUser?.role}</p>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-none border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                          {task.status}
                        </span>
                      </td>

                      {/* Prioridad */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${priorityCfg.dot} ${priorityCfg.glow}`}></span>
                          <span className={`text-xs font-medium ${priorityCfg.color}`}>{task.priority}</span>
                        </div>
                      </td>

                      {/* Fecha Límite */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`material-symbols-outlined text-[14px] ${dueDateInfo.color}`}>calendar_today</span>
                          <span className={`text-xs font-medium ${dueDateInfo.color}`}>
                            {dueDateInfo.text}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {/* Task Cards (Grid View) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${viewMode === 'list' ? 'md:hidden' : 'md:grid-cols-3 xl:grid-cols-4'}`}>
          {filteredTasks.map((task) => {
            const statusCfg = getStatusConfig(task.status);
            const priorityCfg = getPriorityConfig(task.priority);
            const dueDateInfo = getDueDateInfo(task.due_date);

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="group relative flex flex-col bg-[#0A0A0A] rounded-none p-4 hover:shadow-[0_0_20px_rgba(0,136,255,0.15)] transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-exec-blue transition-colors">
                        {task.title}
                      </h4>
                      {task.group_task_id && (
                        <span className="flex-shrink-0 material-symbols-outlined text-[14px] text-exec-blue" title="Tarea Grupal">group</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed h-8">
                      {task.description}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-none ${statusCfg.bg} ${statusCfg.border} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[18px] ${statusCfg.color}`}>
                      {statusCfg.icon}
                    </span>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                   {/* Priority & Date Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot} ${priorityCfg.glow}`}></div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${priorityCfg.color}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#141414] rounded-none border border-exec-border/50">
                      <span className={`material-symbols-outlined text-[13px] ${dueDateInfo.color}`}>calendar_today</span>
                      <span className={`text-[10px] font-bold ${dueDateInfo.color}`}>
                        {dueDateInfo.text}
                      </span>
                    </div>
                  </div>

                  {/* Footer: Assignees & Role */}
                  <div className="flex items-center justify-between pt-3 border-t border-exec-border/30">
                    <div className="flex items-center gap-3">
                      <AvatarGroup 
                        users={[
                          ...(task.assignedUser ? [{ id: task.assigned_to, fullName: task.assignedUser.fullName, avatarUrl: task.assignedUser.avatarUrl }] : []),
                          ...(task.collaborators || [])
                        ]} 
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] text-gray-300 font-bold truncate block leading-none mb-0.5">
                          {task.assignedUser?.fullName?.split(' ')[0]}
                          {task.collaborators && task.collaborators.length > 0 && ` +${task.collaborators.length}`}
                        </span>
                        <span className="text-[8px] text-gray-500 truncate block leading-none">
                          {task.assignedUser?.role?.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] text-gray-600 block leading-none uppercase font-black">Autor</span>
                      <span className="text-[9px] text-exec-blue font-bold leading-none block mt-1 tracking-tighter">
                        {task.createdByUser?.fullName?.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-none bg-[#171717] border border-exec-border flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-gray-600">inbox</span>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Sin tareas encontradas</p>
          <p className="text-xs text-gray-600">Ajusta los filtros o crea una nueva tarea.</p>
        </div>
      )}
      </div>

      <div className="block md:hidden space-y-4 pt-0">
        {/* ═══ MOBILE HEADER ═══ */}
        <section className="flex justify-between items-center bg-[#0A0A0A] border border-[#262626] rounded-none p-4 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-exec-blue text-xl">task_alt</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white uppercase tracking-tight">GESTIÓN <span className="text-exec-blue">TAREAS</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAiPrompt(true)}
              className="px-3 h-10 bg-white hover:bg-gray-100 text-black rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group"
              title="Asistente IA"
            >
              <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
              <span className="hidden xs:inline">IA</span>
            </button>
            <button 
              onClick={() => setShowCreateTask(true)}
              className="w-10 h-10 flex items-center justify-center bg-exec-blue rounded-none text-white shadow-lg active:scale-95 transition-all shadow-exec-blue/20"
              title="Nueva Tarea"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* ═══ MOBILE METRIC CARDS (Scrollable) ═══ */}
        <section className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {/* Card: Mis Tareas */}
          <div 
            onClick={() => setViewTab('my-tasks')}
            className={`min-w-[110px] flex-1 p-3 rounded-none border transition-all active:scale-95 ${viewTab === 'my-tasks' ? 'bg-[#121212] border-exec-blue/50' : 'bg-[#0A0A0A] border-[#262626]'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="material-symbols-outlined text-exec-blue text-base">assignment_ind</span>
              <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest">Activas</span>
            </div>
            <p className="text-2xl font-light text-white leading-none">{myTasks.length}</p>
            <p className="text-[8px] font-bold text-exec-blue uppercase tracking-widest mt-1.5">Mías</p>
          </div>

          {/* Card: Pendientes */}
          <div 
            onClick={() => { setViewTab('my-tasks'); setStatusFilter('Pendiente'); }}
            className={`min-w-[110px] flex-1 p-3 rounded-none border transition-all active:scale-95 ${viewTab === 'my-tasks' && statusFilter === 'Pendiente' ? 'bg-[#121212] border-yellow-500/50' : 'bg-[#0A0A0A] border-[#262626]'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="material-symbols-outlined text-yellow-500 text-base">schedule</span>
              <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest">Espera</span>
            </div>
            <p className="text-2xl font-light text-white leading-none">{pendingTasks.length}</p>
            <p className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest mt-1.5">Pendientes</p>
          </div>

          {/* Card: En Progreso */}
          <div 
            onClick={() => { setViewTab('my-tasks'); setStatusFilter('En progreso'); }}
            className={`min-w-[110px] flex-1 p-3 rounded-none border transition-all active:scale-95 ${viewTab === 'my-tasks' && statusFilter === 'En progreso' ? 'bg-[#121212] border-exec-blue/50 shadow-[0_0_15px_rgba(0,136,255,0.1)]' : 'bg-[#0A0A0A] border-[#262626]'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="material-symbols-outlined text-exec-blue text-base">pending</span>
              <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest">Proceso</span>
            </div>
            <p className="text-2xl font-light text-white leading-none">{inProgressTasks.length}</p>
            <p className="text-[8px] font-bold text-exec-blue uppercase tracking-widest mt-1.5">Ejecución</p>
          </div>

          {/* Card: Completadas */}
          <div 
            onClick={() => setViewTab('my-completed')}
            className={`min-w-[110px] flex-1 p-3 rounded-none border transition-all active:scale-95 ${viewTab === 'my-completed' ? 'bg-[#121212] border-exec-green/50' : 'bg-[#0A0A0A] border-[#262626]'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="material-symbols-outlined text-exec-green text-base">check_circle</span>
              <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest">Éxito</span>
            </div>
            <p className="text-2xl font-light text-white leading-none">{completedTasks.length}</p>
            <p className="text-[8px] font-bold text-exec-green uppercase tracking-widest mt-1.5">Listas</p>
          </div>
        </section>

        {/* ═══ MOBILE FILTERS AND LIST ═══ */}
        <div className="space-y-4">
          {/* Search & Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en tareas ejecutivas..."
                className="w-full bg-[#0D0D0D] border border-[#262626] rounded-none pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:border-white/20 outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'my-tasks', label: 'Mis Tareas' },
                { id: 'my-completed', label: 'Mis Listas' },
                { id: 'other-tasks', label: 'Equipo (Act)' },
                { id: 'other-completed', label: 'Equipo (Comp)' },
                { id: 'all-active', label: 'Pendientes' },
                { id: 'all-tasks', label: 'Historial' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setViewTab(tab.id)}
                  className={`px-4 py-2 rounded-none text-[10px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap border ${viewTab === tab.id ? 'bg-[#171717] text-white border-exec-blue/50 shadow-[0_0_15px_rgba(0,136,255,0.1)]' : 'bg-[#0A0A0A] border-[#262626] text-gray-500 hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Filter Mixins (Status + Priority) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[16px]">filter_list</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#262626] rounded-none pl-8 pr-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider outline-none focus:border-exec-blue/50"
                >
                  <option value="all">Todo estado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En progreso">En Progreso</option>
                  <option value="En espera">En Espera</option>
                </select>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[16px]">priority_high</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#262626] rounded-none pl-8 pr-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider outline-none focus:border-exec-blue/50"
                >
                  <option value="all">Prioridad</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task List - Executive Grid 2 Columns */}
          <div className="grid grid-cols-2 gap-3 pb-24">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const statusCfg = getStatusConfig(task.status);
                const priorityCfg = getPriorityConfig(task.priority);
                const dueDateInfo = getDueDateInfo(task.due_date);

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-[#0A0A0A] border border-[#262626] rounded-none p-3 shadow-subtle active:scale-[0.97] transition-all relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-1 rounded-none ${statusCfg.bg} ${statusCfg.border} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined text-[14px] ${statusCfg.color}`}>{statusCfg.icon}</span>
                      </div>
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 bg-[#111] border border-[#262626] rounded-none ${dueDateInfo.color === 'text-red-500' ? 'bg-red-500/5 border-red-500/20' : ''}`}>
                        <span className={`material-symbols-outlined text-[10px] ${dueDateInfo.color}`}>calendar_today</span>
                        <span className={`text-[8px] font-bold ${dueDateInfo.color} tracking-tighter`}>{dueDateInfo.text}</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-[11px] font-bold text-white line-clamp-3 leading-tight tracking-tight uppercase mb-2 group-hover:text-exec-blue transition-colors">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot} shadow-[0_0_6px_currentColor]`}></div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${priorityCfg.color}`}>{task.priority}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1a1a1a]">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-5 h-5 rounded-full bg-[#111] border border-[#262626] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {task.assignedUser?.avatarUrl ? (
                            <img src={task.assignedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold text-gray-500">{task.assignedUser?.fullName?.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[8px] text-gray-300 font-bold uppercase tracking-tighter truncate max-w-[50px]">
                          {task.assignedUser?.fullName?.split(' ')[0]}
                        </span>
                      </div>
                      
                      <div className="flex -space-x-1.5">
                        {task.collaborators?.slice(0, 2).map((collab, i) => (
                           <div key={i} className="w-4 h-4 rounded-full border border-black bg-[#1a1a1a] overflow-hidden">
                              {collab.avatarUrl ? <img src={collab.avatarUrl} className="w-full h-full object-cover" /> : null}
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 bg-[#0A0A0A] border border-dashed border-[#262626] rounded-none">
                <span className="material-symbols-outlined text-4xl text-[#262626] mb-4">inbox_customize</span>
                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Caja vacía</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODALES ═══ */}

      {/* Crear Tarea */}
      {showCreateTask && (
        <CreateTask
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={fetchTasks}
        />
      )}

      {/* Modal IA — Stitch Premium */}
      {/* Modal IA — Stitch Premium */}
      {showAiPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 pb-24 sm:pb-4 overflow-y-auto">
          <div className="bg-[#050505] rounded-none max-w-lg w-full max-h-[88vh] sm:max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col relative">
            <div className="p-4 sm:p-6 bg-[#0A0A0A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                  <span className="material-symbols-outlined text-exec-blue text-2xl">smart_toy</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Asistente de IA</h3>
                  <p className="text-[8px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-tight">Generación Ejecutiva Stitch</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAiPrompt(false)}
                className="w-10 h-10 flex items-center justify-center rounded-none hover:bg-[#1a1a1a] transition-all border border-exec-border sm:border-transparent"
              >
                <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 flex-1 pb-20">
              <div className="relative">
                <textarea
                  className="w-full bg-[#0D0D0D] rounded-none p-4 text-base sm:text-xs text-white placeholder:text-gray-700 focus:border-exec-blue/50 outline-none transition-all resize-none min-h-[120px] tracking-tight"
                  placeholder="Describe la tarea en lenguaje natural. Ej: Necesito que Edwar diseñe un Flyer para el evento de Navidad, debe entregarlo el viernes y es urgente."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <AIEngineSelector 
                  config={aiConfig} 
                  onConfigChange={setAiConfig} 
                />
                <div className="bg-[#0A0A0A] rounded-none p-3">
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nivel de Detalle</p>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-none bg-exec-blue shadow-[0_0_8px_currentColor]"></span>
                    <span className="text-[9px] text-white font-bold uppercase tracking-tighter">Máxima Precisión</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-[#0A0A0A] flex gap-3">
              <button 
                onClick={() => setShowAiPrompt(false)}
                className="flex-1 py-3 sm:py-3 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest rounded-none hover:bg-[#1a1a1a] transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGenerateTask}
                disabled={generating || !aiPrompt.trim()}
                className="flex-[2] py-4 text-[10px] font-black uppercase tracking-widest bg-white text-black rounded-none hover:bg-gray-100 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-exec-blue" />
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
                    <span>Generar Tarea</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Crear Tarea con datos de IA */}
      {showCreateTaskWithData && aiGeneratedData && (
        <CreateTask
          onClose={() => setShowCreateTaskWithData(false)}
          onTaskCreated={fetchTasks}
          initialData={aiGeneratedData}
        />
      )}

      {/* Detalle de Tarea */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={fetchTasks}
        />
      )}
    </div>
  );
};
