import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../common/Card';
import { Icons } from '../icons';
import { Clock, MapPin, Cake, Gift, PartyPopper, Search, Bell, Plus } from 'lucide-react';
import { format, parseISO, isBefore, getYear, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from './MetricCard';
import { MetaStats } from './MetaStats';
import { FinancialHeaderStats } from './FinancialHeaderStats';
import { SystemUpdateModal } from '../ui/SystemUpdateModal';
import { AvatarGroup } from '../ui/AvatarGroup';
import { CreateTask } from '../tasks/CreateTask';


const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = 'd/M/yyyy') => {
  if (!dateStr) return 'Sin fecha';
  try {
    // Si ya incluye T, tomamos solo la parte de la fecha para evitar colisiones con T12:00:00
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const dateObj = new Date(cleanDate + 'T12:00:00');
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    return format(dateObj, formatStr, { locale: es });
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Error fecha';
  }
};


const getPriorityChipClass = (priority: 'Urgente' | 'Alta' | 'Media' | 'Baja') => {
  switch (priority) {
    case 'Urgente': return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
    case 'Alta': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'Media': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'Baja': return 'bg-exec-blue/10 text-exec-blue border-exec-blue/20';
    default: return 'bg-gray-100/10 text-gray-400 border-gray-400/20';
  }
};

type DBTask = {
  id: string;
  title: string;
  description: string;
  priority: 'Urgente' | 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente' | 'En progreso' | 'Completada' | 'En espera';
  due_date: string | null;
  created_at: string;
  completed_at?: string;
  created_by: string;
  assigned_to: string | null;
  collaborator_ids?: string[];
  assigned_to_user?: { fullName: string; avatarUrl: string | null };
  collaborators?: { id: string; fullName: string; avatarUrl?: string }[];
};

type DBNews = {
  id: string;
  title: string;
  summary: string;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  user?: { fullName: string };
};

interface DashboardProps { }

export const Dashboard: React.FC<DashboardProps> = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DBTask[]>([]);
  const [news, setNews] = useState<DBNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string | null; created_at: string; type: string }>>([]);
  const [upcomingMeetingsCount, setUpcomingMeetingsCount] = useState<number>(0);
  const [newResourcesCount, setNewResourcesCount] = useState<number>(0);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Array<{ id: string; title: string; scheduled_at: string; location: string }>>([]);
  const [totalProfiles, setTotalProfiles] = useState<number>(0);
  const [roleStats, setRoleStats] = useState<Array<{
    role: string;
    color: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>>([]);
  const [performanceStats, setPerformanceStats] = useState<number[]>([0, 0, 0, 0, 0]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Array<{ id: string; fullName: string; birth_date: string; avatarUrl: string | null; targetDate: Date; role: string }>>([]);
  const [financialStats, setFinancialStats] = useState({ income: 0, expenses: 0, balance: 0 });
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        // Tareas: si Director ve todo, sino solo las propias (asignadas o creadas)
        let tasksQuery = supabase
          .from('tasks')
          .select(`
                    id, title, description, priority, status, due_date, created_at, completed_at, assigned_to, created_by, collaborator_ids,
                    assigned_to_user:profiles!assigned_to("fullName", "avatarUrl")
                  `)
          .order('created_at', { ascending: false });

        // Verificar si el usuario es Director (Usando tabla autoritativa 'profiles')
        const { data: userData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single();

        const roleLower = userData?.role?.toLowerCase() || '';
        const isPriorityUser = roleLower.includes('director') || roleLower.includes('asesor');
        
        // Si NO es Director ni tiene roles ejecutivos, filtrar solo sus tareas
        const isExecutive = isPriorityUser ||
          roleLower.includes('imagen') ||
          roleLower.includes('subdirector') ||
          roleLower.includes('secretaria') ||
          roleLower.includes('relaciones') ||
          roleLower.includes('eventos') ||
          roleLower.includes('redes');

        if (!isExecutive) {
          tasksQuery = tasksQuery.or(`assigned_to.eq.${user?.id},created_by.eq.${user?.id},collaborator_ids.cs.{${user?.id}}`);
        }

        // 1. Tareas (Base para métricas y lista parcial)
        try {
          const { data: tasksData, error: tasksError } = await tasksQuery.limit(200);
          if (tasksError) throw tasksError;

          // Cargar TODOS los perfiles para resolver colaboradores (Similar a TasksViewNew)
          const { data: allProfiles } = await supabase
            .from('profiles')
            .select('id, "fullName", "avatarUrl"');
          
          const profilesMap = new Map(allProfiles?.map(p => [p.id, p]) || []);
          
          const rawTasks = tasksData || [];
          const groups = new Map<string, any>();

          rawTasks.forEach((task: any) => {
            // Normalización del título
            const normalizedTitle = task.title?.trim().toLowerCase().replace(/\s+/g, ' ') || 'sin-titulo';
            // Agrupamos por los primeros 12 caracteres para capturar variaciones o truncamientos accidentales
            const key = normalizedTitle.substring(0, 12);

            if (!groups.has(key)) {
              // Preparar array de responsables (asignado principal + colaboradores)
              const collaborators = (task.collaborator_ids || []).map((id: string) => {
                const p = profilesMap.get(id);
                return p ? { id: p.id, fullName: p.fullName, avatarUrl: p.avatarUrl } : null;
              }).filter(Boolean);

              groups.set(key, { 
                ...task, 
                collaborators
              });
            } else {
              const existing = groups.get(key);
              
              // Fusionar responsables: recolectamos todos los IDs de usuarios involucrados
              const currentTaskUserIds = [
                task.assigned_to,
                ...(task.collaborator_ids || [])
              ].filter(id => id && id !== existing.assigned_to);

              const allCollabIds = Array.from(new Set([
                ...(existing.collaborator_ids || []),
                ...currentTaskUserIds
              ]));

              existing.collaborator_ids = allCollabIds;
              
              // Actualizar la lista de colaboradores con perfiles únicos
              existing.collaborators = allCollabIds.map(id => {
                const p = profilesMap.get(id);
                return p ? { id: p.id, fullName: p.fullName, avatarUrl: p.avatarUrl } : null;
              }).filter(Boolean);

              // Si la tarea actual tiene datos de perfil que la previa no tenía, los tomamos
              if (!existing.assigned_to_user?.avatarUrl && task.assigned_to_user?.avatarUrl) {
                existing.assigned_to_user = task.assigned_to_user;
              }
              
              // Mantener la fecha de creación más reciente para el ordenamiento
              if (new Date(task.created_at) > new Date(existing.created_at)) {
                existing.created_at = task.created_at;
              }
            }
          });

          setTasks(Array.from(groups.values()));
        } catch (err) {
          console.error("Dashboard: Error fetching tasks:", err);
        }

        // 2. Noticias
        try {
          const { data: newsData, error: newsError } = await supabase
            .from('news')
            .select(`id, title, summary, published_at, published_by, created_at`)
            .order('created_at', { ascending: false })
            .limit(5);
          if (!newsError && newsData) {
            setNews(newsData as unknown as DBNews[]);
          }
        } catch (err) {
          console.error("Dashboard: Error fetching news:", err);
        }


        // 4. Notificaciones
        if (user?.id) {
          try {
            const { data: notifData, error: notifError } = await supabase
              .from('notifications')
              .select('id, title, message, created_at, type')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(10);
            if (!notifError && notifData) {
              setNotifications(notifData as any);
            }
          } catch (err) {
            console.error("Dashboard: Error fetching notifications:", err);
          }
        }

        // 5. Reuniones próx.
        try {
          const { data: meetingsData, error: meetingsError } = await supabase
            .from('meetings')
            .select(`id, title, scheduled_at, location, created_by`)
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(3);

          if (!meetingsError && meetingsData) {
            setUpcomingMeetings(meetingsData.map((m: any) => ({
              id: m.id,
              title: m.title,
              scheduled_at: m.scheduled_at,
              location: m.location
            })));
            setUpcomingMeetingsCount(meetingsData.length);
          }
        } catch (err) {
          console.error("Dashboard: Error fetching meetings:", err);
        }

        // Total de perfiles (miembros)
        {
          const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          setTotalProfiles(count || 0);
        }

        // --- NUEVO: Sincronización de Gráficas ---

        // 1. Actividad real por cargo (tareas asignadas + índice de cumplimiento)
        try {
          const ROLE_COLORS: Record<string, string> = {
            'director': '#3B82F6',
            'subdirector': '#60A5FA',
            'subdirectora': '#93C5FD',
            'asesor': '#8B5CF6',
            'asesora': '#A78BFA',
            'coordinador de eventos': '#EC4899',
            'coordinadora de eventos': '#F472B6',
            'gestor de redes': '#06B6D4',
            'gestora de redes': '#22D3EE',
            'jefa de imagen': '#F59E0B',
            'jefe de imagen': '#FBBF24',
            'secretaria': '#10B981',
            'secretario': '#34D399',
            'relaciones institucionales': '#F97316',
          };
          const DEFAULT_COLOR = '#6B7280';

          // Consulta que obtenga colaboraciones y roles
          const { data: chartTasks, error: chartError } = await supabase
            .from('tasks')
            .select(`
              title, description, due_date, created_by,
              status, 
              assigned_to,
              collaborator_ids,
              assigned_to_user:profiles!assigned_to("role")
            `);

          if (!chartError && chartTasks) {
            // APLICAR DEDUPLICACION A LOS DATOS DE LA GRAFICA
            const chartGroups = new Map<string, any>();
            chartTasks.forEach((task: any) => {
              const dateStr = task.due_date ? task.due_date.split('T')[0] : 'no-date';
              const key = `${task.title?.trim().toLowerCase() || 'sin-titulo'}|${task.description?.trim().toLowerCase() || ''}|${dateStr}|${task.created_by}`;
              if (!chartGroups.has(key)) {
                chartGroups.set(key, { ...task });
              }
            });
            const dedupedChartTasks = Array.from(chartGroups.values());

            const totals = new Map<string, number>();
            const completed = new Map<string, number>();

            dedupedChartTasks.forEach((t: any) => {
              const cargo = t.assigned_to_user?.role?.trim() || 'Sin cargo';
              totals.set(cargo, (totals.get(cargo) || 0) + 1);
              if (t.status === 'Completada') {
                completed.set(cargo, (completed.get(cargo) || 0) + 1);
              }
            });

            const result = Array.from(totals.entries()).map(([role, total]) => {
              const done = completed.get(role) || 0;
              return {
                role,
                color: ROLE_COLORS[role.toLowerCase()] ?? DEFAULT_COLOR,
                totalTasks: total,
                completedTasks: done,
                completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
              };
            });

            result.sort((a, b) => b.totalTasks - a.totalTasks);
            setRoleStats(result);
          }
        } catch (err) {
          console.error("Dashboard: Error sync charts:", err);
        }

        // 2. Rendimiento Semanal (Tareas completadas últimos 5 días)
        {
          const days = [];
          for (let i = 4; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(format(d, 'yyyy-MM-dd'));
          }

          const { data: perfData, error: perfError } = await supabase
            .from('tasks')
            .select('title, description, due_date, created_by, completed_at, status')
            .eq('status', 'Completada')
            .not('completed_at', 'is', null)
            .gte('completed_at', days[0] + 'T00:00:00Z');

          if (!perfError && perfData) {
            // Deduplicar antes de contar para el gráfico de barras
            const perfGroups = new Map<string, any>();
            perfData.forEach((task: any) => {
              const dateStr = task.due_date ? task.due_date.split('T')[0] : 'no-date';
              const key = `${task.title?.trim().toLowerCase() || 'sin-titulo'}|${task.description?.trim().toLowerCase() || ''}|${dateStr}|${task.created_by}`;
              if (!perfGroups.has(key)) {
                perfGroups.set(key, task);
              }
            });
            const dedupedPerf = Array.from(perfGroups.values());

            const counts = [0, 0, 0, 0, 0];
            dedupedPerf.forEach(t => {
              if (t.completed_at && typeof t.completed_at === 'string' && t.completed_at.includes('T')) {
                const dateStr = t.completed_at.split('T')[0];
                const idx = days.indexOf(dateStr);
                if (idx !== -1) counts[idx]++;
              }
            });
            setPerformanceStats(counts);
          }
        }

        // 3. Próximos Cumpleaños
        {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, "fullName", birth_date, "avatarUrl", role')
            .not('birth_date', 'is', null);

          if (profiles) {
            const today = new Date();
            const birthdays = profiles
              .map((p: any) => {
                const bDate = new Date(p.birth_date);
                if (isNaN(bDate.getTime())) return null;
                
                let targetDate = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
                if (targetDate < today && !isSameDay(targetDate, today)) {
                  targetDate.setFullYear(today.getFullYear() + 1);
                }
                return { ...p, targetDate };
              })
              .filter((p): p is any => p !== null)
              .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
              .slice(0, 3);
            setUpcomingBirthdays(birthdays);
          }
        }

        // 4. Finanzas para el grid móvil
        {
          const { data: finData } = await supabase
            .from('financial_transactions')
            .select('type, amount');
          if (finData) {
            const income = finData.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
            const expenses = finData.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
            setFinancialStats({ income, expenses, balance: income - expenses });
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshTrigger]);

  // Filtrar tareas del usuario actual (donde es responsable o colaborador)
  const myTasks = tasks.filter(t => 
    t.assigned_to === user?.id || 
    (t.collaborator_ids && t.collaborator_ids.includes(user?.id || ''))
  );

  // Contar tareas pendientes/activas (todas las NO completadas)
  // Para usuarios normales: solo sus tareas; Para Director/Asesor: todas las tareas del sistema
  const roleLowerAuth = user?.role?.toLowerCase() || '';
  const isPriorityUser = roleLowerAuth.includes('director') || roleLowerAuth.includes('asesor');
  
  const myTasksPending = myTasks.filter(t => t.status !== 'Completada').length;
  const totalTasksPending = tasks.filter(t => t.status !== 'Completada').length;

  const pendingTasksDisplay = isPriorityUser ? (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <span className="text-2xl sm:text-3xl font-black text-white leading-none">{myTasksPending}</span>
        <span className="text-[8px] sm:text-[9px] uppercase font-bold text-exec-blue tracking-widest mt-1">Míos</span>
      </div>
      <div className="w-[1px] h-7 bg-white/10 self-center"></div>
      <div className="flex flex-col items-center">
        <span className="text-xl sm:text-2xl font-bold text-gray-500 leading-none">{totalTasksPending}</span>
        <span className="text-[8px] sm:text-[9px] uppercase font-bold text-gray-700 tracking-widest mt-1">Equipo</span>
      </div>
    </div>
  ) : myTasksPending;


  const completedTasksThisMonth = myTasks.filter(t => {
    if (t.status !== 'Completada') return false;
    if (!t.completed_at) return false;
    const completed = new Date(t.completed_at);
    const now = new Date();
    return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear();
  }).length;

  // Estadísticas para Director
  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter(t => t.status === 'Completada').length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="w-full space-y-0 text-white relative">
      <SystemUpdateModal />
      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-exec-blue"></div>
        </div>
      )}

      {/* =========================================================================
          VISTA DE ESCRITORIO (md:block hidden) 
          Preserva exactamente el diseño solicitado por el usuario para PC
         ========================================================================= */}
      <div className="hidden md:block">
        {/* 1. Welcome Section & Header */}
        <div className="relative mb-2">
        {/* Top Brand Bar (Logo Center, Icons Right) - Mobile Only */}
        <div className="flex sm:hidden items-center justify-center mb-4 relative py-1">
          <span className="absolute left-0 text-[10px] font-bold text-gray-400">
            {format(new Date(), 'hh:mm a')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-exec-blue tracking-tighter">ACS</span>
          </div>
          <div className="absolute right-0 flex items-center gap-3">
            <div className="bg-white/5 p-1.5 rounded-full relative">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <div className="bg-white/5 p-1.5 rounded-full relative">
              <Bell className="w-4 h-4 text-gray-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A0A0A]"></span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-sm border border-white/5 sm:border-0 overflow-hidden">
            <div className="flex-shrink-0">
               <Icons.Home className="w-8 h-8 text-exec-blue" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-3 gap-y-1">
                <h1 className="text-lg sm:text-2xl font-semibold text-white tracking-tight leading-tight truncate">
                  <span className="text-gray-400 font-normal">Bienvenido, </span>
                  <span className="text-white"> {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'}</span>
                </h1>
                <a
                  href="https://revistas.unc.edu.pe/index.php/sociales/index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/5 hover:bg-white/10 text-exec-blue border border-exec-blue/30 rounded-sm text-[9px] font-bold transition-all group/rev whitespace-nowrap"
                >
                  <span className="material-symbols-outlined notranslate text-[13px]" translate="no">auto_stories</span>
                  REVISTA OFICIAL
                  <span className="material-symbols-outlined notranslate text-[11px] group-hover/rev:translate-x-0.5 transition-transform" translate="no">open_in_new</span>
                </a>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 truncate mt-0.5">
                {user?.fullName}
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <FinancialHeaderStats />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/admin/reports')}
              className="px-4 py-2.5 bg-white hover:bg-gray-100 text-black rounded-sm text-sm font-semibold transition-all shadow-lg flex items-center gap-2"
            >
              <Icons.FileText className="w-4 h-4 text-exec-blue" />
              Reporte
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2.5 bg-exec-blue hover:bg-blue-500 text-white rounded-sm text-sm font-semibold transition-all shadow-lg shadow-exec-blue/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Tarea</span>
            </button>
          </div>
        </div>
      </div>


      {/* 2. Main Grid: 12 columns - Stitch structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN - 8 Cols - Contains metrics, charts, tasks */}
        <div className="lg:col-span-8 space-y-6">

          {/* Metric Cards - INSIDE col-span-8 like Stitch reference */}
          {/* Metric Cards - Strict Bento Grid for Mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 overflow-visible">
            {/* Desktop only metrics (in standard order) */}
            <div className="hidden md:contents">
              <MetricCard
                title="Pendientes"
                value={pendingTasksDisplay}
                icon="assignment"
                iconColor="text-exec-blue"
                change="+12 hoy"
                changeType="positive"
                onClick={() => navigate('/admin/tasks', { state: { tab: 'my-tasks', status: 'Pendiente' } })}
              />
              <MetricCard
                title="Completadas"
                value={completedTasksThisMonth}
                icon="check_circle"
                iconColor="text-green-500"
                change="Mensual"
                onClick={() => navigate('/admin/tasks', { state: { tab: 'completed' } })}
              />
              <MetricCard
                title="Reuniones"
                value={String(upcomingMeetingsCount).padStart(2, '0')}
                icon="groups"
                iconColor="text-purple-500"
                change="Próximas"
                onClick={() => navigate('/admin/meetings')}
              />
              <MetricCard
                title="Recursos"
                value={String(newResourcesCount).padStart(2, '0')}
                icon="folder_open"
                iconColor="text-pink-500"
                change="Nuevos"
                onClick={() => navigate('/admin/resources')}
              />
            </div>

            {/* Mobile Bento Grid */}
            <div className="md:hidden contents">
              {/* Row 1 */}
              <MetricCard
                title="Ingresos"
                value={`S/ ${financialStats.income.toLocaleString()}`}
                icon="trending_up"
                iconColor="text-exec-green"
                variant="horizontal"
                onClick={() => navigate('/admin/finance')}
              />
              <MetricCard
                title="Saldo"
                value={`S/ ${financialStats.balance.toLocaleString()}`}
                icon="account_balance_wallet"
                iconColor="text-exec-blue"
                variant="horizontal"
                onClick={() => navigate('/admin/finance')}
              />

              {/* Row 2/3/4 - Asymmetric Pair */}
              <div className="row-span-3">
                <MetricCard
                  title="Pendientes"
                  value={pendingTasksDisplay}
                  icon="assignment"
                  iconColor="text-exec-blue"
                  variant="vertical-tall"
                  change="11 hoy"
                  onClick={() => navigate('/admin/tasks', { state: { tab: 'my-tasks', status: 'Pendiente' } })}
                />
              </div>

              {/* Col 2 Stack */}
              <div className="space-y-3">
                <MetricCard
                  title="Egresos"
                  value={`S/ ${financialStats.expenses.toLocaleString()}`}
                  icon="trending_down"
                  iconColor="text-exec-red"
                  variant="horizontal"
                  onClick={() => navigate('/admin/finance')}
                />
                <MetricCard
                  title="Completadas"
                  value={completedTasksThisMonth}
                  icon="check_circle"
                  iconColor="text-green-500"
                  variant="horizontal"
                  onClick={() => navigate('/admin/tasks', { state: { tab: 'completed' } })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    title="Reunion"
                    value={String(upcomingMeetingsCount).padStart(2, '0')}
                    icon="groups"
                    iconColor="text-purple-500"
                    variant="mini"
                    onClick={() => navigate('/admin/meetings')}
                  />
                  <MetricCard
                    title="Recurso"
                    value={String(newResourcesCount).padStart(2, '0')}
                    icon="folder_open"
                    iconColor="text-pink-500"
                    variant="mini"
                    onClick={() => navigate('/admin/resources')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Meta Social Metrics - NEW */}
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined notranslate text-exec-blue text-xl" translate="no">analytics</span>
              Redes Sociales
            </h3>
            <MetaStats mode="premium" />
          </div>

          {/* Director Dashboard Section - Stitch Style */}
          {
            (user?.role?.includes('Director') || user?.role?.includes('Asesor') || user?.role?.includes('Imagen')) && (
              <div className="exec-card p-5 bg-[#0A0A0A] border border-exec-border">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">Rendimiento del Equipo</h3>
                  <span className="text-[10px] font-medium text-gray-400 bg-[#171717] border border-exec-border px-2 py-1 rounded-sm uppercase tracking-widest">
                    {user?.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                  {/* Completion Rate */}
                  <div className="exec-card p-4 sm:p-5 bg-[#171717] border border-exec-border">
                    <p className="text-xs sm:text-sm text-gray-400 mb-2">Tasa de Finalización Global</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl sm:text-4xl font-light text-white">{completionRate}%</span>
                      <span className="text-[10px] sm:text-sm text-green-500 mb-1 sm:mb-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined notranslate text-[12px] sm:text-[14px]" translate="no">arrow_upward</span> +5%
                      </span>
                    </div>
                    <div className="w-full bg-[#262626] h-2 rounded-sm mt-4 overflow-hidden">
                      <div className="bg-exec-blue h-full rounded-sm transition-all duration-1000" style={{ width: `${completionRate}%` }}></div>
                    </div>
                  </div>

                  {/* Active Tasks */}
                  <div className="exec-card p-5 bg-[#171717] border border-exec-border">
                    <p className="text-sm text-gray-400 mb-2">Tareas Activas Total</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-light text-white">{totalTasks - totalCompleted}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {(() => {
                        const urgentes = tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Completada').length;
                        const altas = tasks.filter(t => t.priority === 'Alta' && t.status !== 'Completada').length;
                        const maxP = Math.max(urgentes, altas, 1);
                        return (
                          <>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Urgentes</span>
                                <span>{urgentes}</span>
                              </div>
                              <div className="w-full bg-[#262626] h-1.5 rounded-sm">
                                <div className="bg-red-500 h-full rounded-sm transition-all duration-700" style={{ width: `${(urgentes / maxP) * 100}%` }}></div>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Altas</span>
                                <span>{altas}</span>
                              </div>
                              <div className="w-full bg-[#262626] h-1.5 rounded-sm">
                                <div className="bg-orange-500 h-full rounded-sm transition-all duration-700" style={{ width: `${(altas / maxP) * 100}%` }}></div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Team Activity */}
                  <div className="exec-card p-5 bg-[#171717] border border-exec-border">
                    <p className="text-sm text-gray-400 mb-4">Actividad Reciente</p>
                    <div className="space-y-3">
                      {tasks.slice(0, 3).map(task => (
                        <div key={task.id} className="flex items-center gap-3 text-sm">
                          <AvatarGroup 
                            users={[
                              ...(task.assigned_to_user ? [{ id: task.assigned_to, fullName: task.assigned_to_user.fullName, avatarUrl: task.assigned_to_user.avatarUrl }] : []),
                              ...(task.collaborators || [])
                            ]} 
                            size="xs"
                            limit={4}
                          />
                          <span className="text-gray-300 line-clamp-1 flex-1 min-w-0">{task.title}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">{new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Charts Row - Donut + Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* Donut Chart - Distribución por Cargo Real */}
            <div className="exec-card p-4 sm:p-5 flex flex-col bg-[#0A0A0A] h-[320px] sm:h-[420px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-white">Distribución por Cargo</h3>
                <button className="text-gray-500 hover:text-white">
                  <span className="material-symbols-outlined notranslate text-lg" translate="no">more_horiz</span>
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-44 h-44 rounded-full flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: (() => {
                        const total = roleStats.reduce((s, r) => s + r.totalTasks, 0) || 1;
                        let acc = 0;
                        const stops = roleStats.map(r => {
                          const start = (acc / total * 100).toFixed(2);
                          acc += r.totalTasks;
                          const end = (acc / total * 100).toFixed(2);
                          return `${r.color} ${start}% ${end}%`;
                        });
                        return stops.length > 0
                          ? `conic-gradient(${stops.join(', ')})`
                          : '#1f1f1f';
                      })(),
                      mask: 'radial-gradient(transparent 58%, black 59%)',
                      WebkitMask: 'radial-gradient(transparent 58%, black 59%)'
                    }}
                  />
                  <div className="text-center z-10">
                    <span className="block text-2xl sm:text-3xl font-light text-white">
                      {roleStats.reduce((s, r) => s + r.totalTasks, 0) || totalProfiles}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                      {roleStats.reduce((s, r) => s + r.totalTasks, 0) > 0 ? 'Tareas' : 'Miembros'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                {roleStats.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-2">Sin datos de tareas</p>
                )}
                {roleStats.map(r => {
                  const totalAll = roleStats.reduce((s, x) => s + x.totalTasks, 0) || 1;
                  const actPct = Math.round(r.totalTasks / totalAll * 100);
                  return (
                    <div key={r.role} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="text-[11px] text-gray-300 flex-1 truncate" title={r.role}>{r.role}</span>
                        <span className="text-[10px] text-gray-500 ml-auto">{r.totalTasks} tareas · {actPct}%</span>
                      </div>
                      {/* Barra doble: actividad (color) + cumplimiento (verde) */}
                      <div className="ml-4 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-600 w-16">Actividad</span>
                          <div className="flex-1 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(actPct, 4)}%`, backgroundColor: r.color }} />
                          </div>
                          <span className="text-[9px] w-7 text-right" style={{ color: r.color }}>{actPct}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-600 w-16">Cumplimiento</span>
                          <div className="flex-1 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${r.completionRate}%`,
                                backgroundColor: r.completionRate >= 80 ? '#10B981' : r.completionRate >= 50 ? '#F59E0B' : '#EF4444'
                              }}
                            />
                          </div>
                          <span className="text-[9px] w-7 text-right" style={{
                            color: r.completionRate >= 80 ? '#10B981' : r.completionRate >= 50 ? '#F59E0B' : '#EF4444'
                          }}>{r.completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bar Chart - Rendimiento Semanal */}
            <div className="exec-card p-4 sm:p-5 flex flex-col bg-[#0A0A0A] h-[320px] sm:h-[420px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-white">Rendimiento Semanal</h3>
                <span className="text-xs font-medium text-gray-400 bg-[#171717] border border-exec-border px-2 py-1 rounded-sm">
                  Tareas Completadas
                </span>
              </div>
              <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 border-b border-exec-border" style={{ minHeight: 0 }}>
                {performanceStats.map((val, idx) => {
                  const maxVal = Math.max(...performanceStats, 1);
                  const height = `${(val / maxVal) * 100}%`;
                  
                  // Calcular el nombre del día para esta barra
                  const d = new Date();
                  d.setDate(d.getDate() - (4 - idx));
                  const dayName = format(d, 'EEE', { locale: es }).toUpperCase().slice(0, 3);
                  const isToday = idx === 4; // La última es hoy
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 sm:gap-3 w-full group">
                      <div className="w-full bg-[#171717] rounded-sm relative overflow-hidden h-[120px] sm:h-[200px]">
                        <div
                          className={`absolute bottom-0 w-full rounded-sm ${isToday ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-exec-blue/70 group-hover:bg-exec-blue'} transition-all duration-500`}
                          style={{ height }}
                        ></div>
                        {performanceStats[idx] > 0 && (
                          <div className="absolute top-0 w-full text-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                            {performanceStats[idx]}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Tasks - Stitch Style */}
          <div className="exec-card p-6 min-h-[420px] flex flex-col bg-[#0A0A0A]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-white">Tareas Recientes</h3>
              <button onClick={() => navigate('/admin/tasks')} className="text-exec-blue text-sm font-medium hover:underline flex items-center gap-1">
                Ver todas
                <span className="material-symbols-outlined notranslate text-sm" translate="no">arrow_forward</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {(isPriorityUser ? tasks : myTasks)
                .filter(t => t.status !== 'Completada') // Mostrar solo pendientes
                .sort((a, b) => {
                  if (!a.due_date) return 1;
                  if (!b.due_date) return -1;
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                })
                .slice(0, 5)
                .map(task => (
                  <div
                    key={task.id}
                    className="group flex items-center space-x-4 p-3 rounded-sm hover:bg-[#171717] transition-all cursor-pointer border border-transparent hover:border-exec-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/admin/tasks', { state: { tab: task.assigned_to === user?.id ? 'my-tasks' : 'other-tasks' } });
                    }}
                  >
                    <AvatarGroup 
                      users={[
                        ...(task.assigned_to_user ? [{ id: task.assigned_to, fullName: task.assigned_to_user.fullName, avatarUrl: task.assigned_to_user.avatarUrl }] : []),
                        ...(task.collaborators || [])
                      ]} 
                      size="sm"
                      limit={4}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-300 line-clamp-2 sm:truncate group-hover:text-white transition-colors">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-0.5">
                        {user?.role === 'Director' && task.assigned_to_user?.fullName && (
                          <span className="font-medium text-gray-400 max-w-full sm:max-w-none">{task.assigned_to_user.fullName}</span>
                        )}
                        {task.collaborators && task.collaborators.length > 0 && (
                          <span className="material-symbols-outlined notranslate text-[12px] text-exec-blue" translate="no" title="Tarea Grupal">group</span>
                        )}
                        <span className="hidden sm:inline">•</span>
                        {task.due_date && new Date(task.due_date) < new Date() ? (
                          <span className="text-red-500 font-bold">{safeFormatDate(task.due_date)} (Vencida)</span>
                        ) : (
                          <span>{safeFormatDate(task.due_date)}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-sm ${getPriorityChipClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - 4 Cols - Activity Feed */}
        <div className="lg:col-span-4">
          <div className="exec-card bg-[#0A0A0A] h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-exec-border bg-[#111111]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-gray-400" translate="no">campaign</span>
                Actividad del Sistema
              </h3>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-0">
              {/* Upcoming Meetings */}
              {upcomingMeetings.length > 0 && (
                <div className="p-5 border-b border-exec-border">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Próximas Reuniones</p>
                    <button onClick={() => navigate('/admin/meetings')} className="text-exec-blue text-xs font-medium hover:underline">Ver todas</button>
                  </div>
                  {upcomingMeetings.slice(0, 3).map(m => (
                    <div key={m.id} className="flex gap-3 mb-3 last:mb-0 cursor-pointer hover:bg-[#171717] p-2 rounded-sm transition-colors" onClick={() => navigate('/admin/meetings')}>
                      <div className="flex-shrink-0 w-10 sm:w-12 text-center bg-exec-blue/10 border border-exec-blue/20 rounded-sm p-1">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-exec-blue uppercase">{new Date(m.scheduled_at).toLocaleString('es-ES', { month: 'short' })}</p>
                        <p className="text-base sm:text-lg font-light text-white">{new Date(m.scheduled_at).getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white truncate">{m.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* News */}
              {news.length > 0 && (
                <div className="p-5 border-b border-exec-border">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Noticias Recientes</p>
                    <button onClick={() => navigate('/admin/news')} className="text-exec-blue text-xs font-medium hover:underline">Ver todas</button>
                  </div>
                  {news.slice(0, 3).map(item => (
                    <div key={item.id} className="mb-4 last:mb-0 cursor-pointer hover:bg-[#171717] p-2 rounded-sm transition-colors" onClick={() => navigate('/admin/news')}>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="font-medium text-sm text-white line-clamp-2 flex-1 min-w-0">{item.title}</p>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">{item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Hoy'}</span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{item.summary}</p>
                    </div>
                  ))}
                </div>
              )}

              {notifications.length > 0 && (
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3 sm:mb-4">Actualizaciones</p>
                  {notifications.slice(0, 3).map(notif => (
                    <div key={notif.id} className="mb-3 last:mb-0 hover:bg-[#171717] p-2 rounded-sm transition-colors">
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{notif.message}</p>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Birthdays Widget */}
              {upcomingBirthdays.length > 0 && (
                <div className="p-5 border-b border-exec-border bg-gradient-to-br from-blue-900/5 to-transparent">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 flex items-center gap-2">
                       <Cake className="w-3 h-3" /> Próximos Cumpleaños
                    </p>
                    <button onClick={() => navigate('/admin/birthdays')} className="text-exec-blue text-xs font-medium hover:underline">Ver todos</button>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {upcomingBirthdays.map(bd => (
                      <div key={bd.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/admin/birthdays')}>
                        <div className="relative">
                          <img 
                            src={bd.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(bd.fullName)}&background=random`} 
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-exec-border group-hover:border-blue-500/50 transition-all"
                            alt={bd.fullName}
                          />
                          {isSameDay(bd.targetDate, new Date()) && (
                            <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1 animate-bounce">
                              <PartyPopper className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-blue-500 transition-colors">
                            {bd.fullName}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest truncate">
                            {format(bd.targetDate, "dd 'de' MMMM", { locale: es })}
                          </p>
                        </div>
                        {isSameDay(bd.targetDate, new Date()) ? (
                          <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-sm uppercase animate-pulse">
                            ¡Hoy!
                          </span>
                        ) : (
                          <Gift className="w-3.5 h-3.5 text-gray-700 group-hover:text-blue-500/50 transition-colors" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* =========================================================================
          VISTA MÓVIL (block md:hidden)
          Rediseño "Mobile-First" basado en la propuesta de Stich
         ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="px-3 pt-2 pb-32 space-y-3">
          {/* BEGIN: Greeting Section */}
          <section data-purpose="user-greeting">
            <div className="flex items-center gap-2">
              <Icons.Home className="h-5 w-5 text-exec-blue" />
              <h1 className="text-xl font-bold">Bienvenido, <span className="text-exec-blue">{user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'}</span></h1>
            </div>
            <p className="text-[10px] text-gray-500">Resumen de actividad y métricas clave.</p>
          </section>

          {/* BEGIN: Financial Mini Cards */}
          <section className="grid grid-cols-3 gap-2" data-purpose="financial-metrics">
            <div className="bg-[#0A0A0A] border border-exec-border rounded-sm p-2.5 shadow-sm flex flex-col gap-1 transition-all hover:border-exec-green/50">
              <div className="flex items-center gap-1 mb-1">
                <div className="p-1 bg-exec-green/5 rounded-sm">
                   <Icons.TrendingUp className="h-3 w-3 text-exec-green" />
                </div>
                <span className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">INGRESOS</span>
              </div>
              <p className="text-[13px] font-black text-white">S/ {financialStats.income.toLocaleString()}</p>
            </div>

            <div className="bg-[#0A0A0A] border border-exec-border rounded-sm p-2.5 shadow-sm flex flex-col gap-1 transition-all hover:border-exec-red/50">
              <div className="flex items-center gap-1 mb-1">
                <div className="p-1 bg-exec-red/5 rounded-sm">
                   <Icons.TrendingDown className="h-3 w-3 text-exec-red" />
                </div>
                <span className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">EGRESOS</span>
              </div>
              <p className="text-[13px] font-black text-white">S/ {financialStats.expenses.toLocaleString()}</p>
            </div>

            <div className="bg-[#0A0A0A] border border-exec-border rounded-sm p-2.5 shadow-sm flex flex-col gap-1 transition-all hover:border-exec-blue/50">
              <div className="flex items-center gap-1 mb-1">
                <div className="p-1 bg-exec-blue/5 rounded-sm">
                   <Icons.Finance className="h-3 w-3 text-exec-blue" />
                </div>
                <span className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">SALDO</span>
              </div>
              <p className="text-[13px] font-black text-white">S/ {financialStats.balance.toLocaleString()}</p>
            </div>
          </section>

          {/* BEGIN: Quick Actions */}
          <section className="flex gap-2">
            <button 
              onClick={() => navigate('/admin/reports')}
              className="flex-1 bg-white text-black rounded-sm py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black shadow-lg active:scale-95 transition-all hover:bg-gray-100"
            >
              <Icons.FileText className="h-3.5 w-3.5 text-exec-blue" />
              Exportar Reporte
            </button>
            <button 
              onClick={() => navigate('/admin/tasks')}
              className="flex-1 bg-exec-blue text-white rounded-sm py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black shadow-lg shadow-blue-500/10 active:scale-95 transition-all hover:bg-blue-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Tarea
            </button>
          </section>

          {/* BEGIN: Status Grid */}
          <section className="grid grid-cols-2 gap-2" data-purpose="status-overview">
            {/* Pendientes */}
            <div 
              className="bg-[#0A0A0A] border border-exec-border rounded-sm p-3 relative shadow-sm overflow-hidden group active:bg-[#111] transition-all"
              onClick={() => navigate('/admin/tasks')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">PENDIENTES</span>
                <Icons.Tasks className="h-4 w-4 text-exec-blue opacity-50 group-active:opacity-100" />
              </div>
              <div className="flex items-baseline gap-2">
                {pendingTasksDisplay}
                <div className="text-[9px] text-exec-green font-bold flex items-center">
                  <span className="material-symbols-outlined notranslate text-[12px]" translate="no">arrow_drop_up</span>
                  +12
                </div>
              </div>
            </div>

            {/* Completadas */}
            <div 
              className="bg-[#0A0A0A] border border-exec-border rounded-sm p-3 relative shadow-sm active:bg-[#111] transition-all"
              onClick={() => navigate('/admin/tasks', { state: { tab: 'completed' } })}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">COMPLETADAS</span>
                <Icons.Check className="h-4 w-4 text-exec-green opacity-50" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white leading-none">{completedTasksThisMonth}</div>
                <div className="text-[9px] text-gray-500 font-bold tracking-tighter uppercase">MENSUAL</div>
              </div>
            </div>

            {/* Reuniones */}
            <div 
              className="bg-[#0A0A0A] border border-exec-border rounded-sm p-3 relative shadow-sm active:bg-[#111] transition-all"
              onClick={() => navigate('/admin/meetings')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">REUNIONES</span>
                <Icons.Users className="h-4 w-4 text-purple-500 opacity-50" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white leading-none">{String(upcomingMeetingsCount).padStart(2, '0')}</div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">PRÓXIMAS</div>
              </div>
            </div>

            {/* Recursos */}
            <div 
              className="bg-[#0A0A0A] border border-exec-border rounded-sm p-3 relative shadow-sm active:bg-[#111] transition-all"
              onClick={() => navigate('/admin/resources')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">RECURSOS</span>
                <Icons.Resources className="h-4 w-4 text-pink-500 opacity-50" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white leading-none">{String(newResourcesCount).padStart(2, '0')}</div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">NUEVOS</div>
              </div>
            </div>
          </section>
          {/* BEGIN: Social Media Metrics */}
          <section className="space-y-3" data-purpose="social-media-stats">
            <div className="flex items-center gap-2">
              <Icons.TrendingUp className="h-4 w-4 text-exec-blue" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Redes Sociales</h2>
            </div>
            <MetaStats mode="mini" />
          </section>

          {/* BEGIN: System Activity */}
          <section className="bg-[#0A0A0A] border border-exec-border rounded-sm p-3 space-y-4 shadow-sm" data-purpose="news-list">
            <div className="flex justify-between items-center pb-2 border-b border-exec-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-exec-blue text-lg" translate="no">campaign</span>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Actividad</h2>
              </div>
              <button 
                onClick={() => navigate('/admin/news')}
                className="text-exec-blue text-[9px] font-black uppercase tracking-widest hover:bg-exec-blue/10 px-2 py-1 rounded-sm border border-exec-blue/20"
              >
                Ver todas
              </button>
            </div>
            <div className="space-y-4 pt-1">
              {news.slice(0, 3).map((item, idx) => (
                <div 
                  key={item.id} 
                  className={`space-y-1.5 ${idx !== 2 ? 'border-b border-exec-border' : ''} pb-3 last:pb-0 active:bg-[#111] rounded-sm p-1 transition-all`}
                  onClick={() => navigate('/admin/news')}
                >
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-[11px] font-bold text-gray-200 flex-1 leading-snug uppercase tracking-tight">{item.title}</h3>
                    <span className="text-[8px] text-gray-500 font-black whitespace-nowrap bg-[#111] px-1.5 py-0.5 rounded-sm border border-exec-border">
                      {item.published_at ? safeFormatDate(item.published_at, 'dd MMM') : 'HOY'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* BEGIN: Recent Tasks Section */}
          <section className="bg-[#0A0A0A] border border-exec-border rounded-sm p-3 space-y-4 shadow-sm" data-purpose="recent-tasks">
            <div className="flex justify-between items-center pb-2 border-b border-exec-border">
              <div className="flex items-center gap-2">
                <Icons.Tasks className="h-4 w-4 text-exec-blue" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Tareas Recientes</h2>
              </div>
              <button 
                onClick={() => navigate('/admin/tasks')}
                className="text-exec-blue text-[9px] font-black uppercase tracking-widest hover:bg-exec-blue/10 px-2 py-1 rounded-sm border border-exec-blue/20"
              >
                Ver todas
              </button>
            </div>
            <div className="space-y-3">
              {(user?.role === 'Director' ? tasks : tasks.filter(t => t.assigned_to === user?.id || t.created_by === user?.id || t.collaborator_ids?.includes(user?.id || '')))
                .filter(t => t.status !== 'Completada')
                .sort((a, b) => {
                  if (!a.due_date) return 1;
                  if (!b.due_date) return -1;
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                })
                .slice(0, 5)
                .map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-3 p-2 bg-[#0A0A0A] border border-exec-border/30 rounded-none active:bg-[#111] transition-all hover:border-exec-blue/20 group"
                    onClick={() => navigate('/admin/tasks')}
                  >
                    <div className="relative flex-shrink-0">
                      <AvatarGroup 
                        users={[
                          ...(task.assigned_to_user ? [{ id: task.assigned_to, fullName: task.assigned_to_user.fullName, avatarUrl: task.assigned_to_user.avatarUrl }] : []),
                          ...(task.collaborators || [])
                        ]} 
                        size="xs"
                        limit={4}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[10px] font-bold text-gray-200 truncate group-hover:text-exec-blue transition-colors">{task.title}</p>
                        {task.collaborators && task.collaborators.length > 0 && (
                          <span className="material-symbols-outlined notranslate text-[12px] text-exec-blue" translate="no" title="Tarea Grupal">group</span>
                        )}
                      </div>
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-tighter">
                        {safeFormatDate(task.due_date)}
                        <span className="mx-1 opacity-30">•</span>
                        {task.assigned_to_user?.fullName?.split(' ')[0] || 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded-none border ${
                        task.priority === 'Urgente' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        task.priority === 'Alta' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        task.priority === 'Media' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-exec-blue/10 text-exec-blue border-exec-blue/20'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* BEGIN: Upcoming Birthdays Section */}
          {upcomingBirthdays.length > 0 && (
            <section className="bg-gradient-to-br from-blue-900/5 to-[#0A0A0A] border border-exec-border rounded-sm p-3 space-y-4 shadow-sm" data-purpose="birthdays">
              <div className="flex justify-between items-center pb-2 border-b border-exec-border">
                <div className="flex items-center gap-2">
                  <Cake className="h-4 w-4 text-pink-500" />
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Próximos Cumpleaños</h2>
                </div>
                <button 
                  onClick={() => navigate('/admin/birthdays')}
                  className="text-exec-blue text-[9px] font-black uppercase tracking-widest hover:bg-exec-blue/10 px-2 py-1 rounded-sm border border-exec-blue/20"
                >
                  Ver todos
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {upcomingBirthdays.slice(0, 5).map(bd => (
                  <div key={bd.id} className="flex flex-col items-center gap-1.5 min-w-[70px]">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-blue-500 rounded-full animate-pulse opacity-20 blur-sm" />
                      <img 
                        src={bd.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(bd.fullName || 'User')}&background=random`} 
                        alt={bd.fullName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-exec-border relative z-10"
                      />
                    </div>
                    <p className="text-[9px] font-bold text-gray-200 text-center line-clamp-1">{bd.fullName?.split(' ')[0] || 'User'}</p>
                    <p className="text-[7px] font-black text-pink-500 uppercase">{safeFormatDate(bd.birth_date, 'dd MMM')}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
       {/* Modal de Creación de Tareas */}
      {showCreateTask && (
        <CreateTask 
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowCreateTask(false);
          }}
        />
      )}
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  onClick,
  color = 'indigo'
}: {
  title: string,
  value: string,
  icon: React.ElementType,
  change: string,
  onClick?: () => void,
  color?: 'indigo' | 'green' | 'purple' | 'orange' | 'red'
}) => {
  const colorStyles = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-xl transition-all duration-300 border-none shadow-lg bg-white dark:bg-slate-900 group relative overflow-hidden`}
      onClick={onClick}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-20 group-hover:scale-150 transition-transform duration-500 ${colorStyles[color].split(' ')[0].replace('/20', '')}`}></div>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className={`p-2 md:p-3 rounded-xl ${colorStyles[color]}`}>
            <Icon className="w-4 h-4 md:w-6 md:h-6" />
          </div>
          {/* <span className="text-xs font-medium text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">+12%</span> */}
        </div>
        <div>
          <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            {change} <Icons.ChevronRight className="w-3 h-3" />
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
