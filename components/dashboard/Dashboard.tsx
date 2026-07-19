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


const parseBirthDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};


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
  const [socialConflictsList, setSocialConflictsList] = useState<any[]>([]);
  const [showIicsPanels, setShowIicsPanels] = useState(false);
  // ── Observatorio Stats ──
  const [conflictsCount, setConflictsCount] = useState(0);
  const [conflictsCritical, setConflictsCritical] = useState(0);
  const [transmediaCount, setTransmediaCount] = useState(0);
  const [provinceMetricsCount, setProvinceMetricsCount] = useState(0);
  const [socialListeningCount, setSocialListeningCount] = useState(0);
  const [socialNegativeCount, setSocialNegativeCount] = useState(0);
  const [statIndicatorsCount, setStatIndicatorsCount] = useState(0);
  const [datasetsCount, setDatasetsCount] = useState(0);
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
                const bDate = parseBirthDate(p.birth_date);
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

        // ── Conflictos Sociales ──
        try {
          const { data: conflictsData } = await supabase
            .from('social_conflicts')
            .select('id, title, intensity, status, created_at')
            .order('created_at', { ascending: false });
          if (conflictsData) {
            setSocialConflictsList(conflictsData);
            setConflictsCount(conflictsData.length);
            setConflictsCritical(conflictsData.filter((c: any) => c.intensity === 'Crítico' || c.intensity === 'Alto').length);
          }
        } catch (_) {}

        // ── Videos Transmedia ──
        try {
          const { count: tmCount } = await supabase
            .from('transmedia_videos')
            .select('id', { count: 'exact', head: true });
          setTransmediaCount(tmCount || 0);
        } catch (_) {}

        // ── Métricas Provinciales ──
        try {
          const { count: pmCount } = await supabase
            .from('province_metrics')
            .select('id', { count: 'exact', head: true });
          setProvinceMetricsCount(pmCount || 0);
        } catch (_) {}

        // ── Escucha Social ──
        try {
          const { data: slData } = await supabase
            .from('social_listening')
            .select('id, sentiment');
          setSocialListeningCount(slData?.length || 0);
          setSocialNegativeCount(slData?.filter((p: any) => p.sentiment === 'negative').length || 0);
        } catch (_) {}

        // ── Ingesta de Datos ──
        try {
          const { count: siCount } = await supabase
            .from('statistical_indicators')
            .select('id', { count: 'exact', head: true });
          setStatIndicatorsCount(siCount || 0);
          const { count: dsCount } = await supabase
            .from('research_datasets')
            .select('id', { count: 'exact', head: true });
          setDatasetsCount(dsCount || 0);
        } catch (_) {}
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_conflicts' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transmedia_videos' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'province_metrics' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_listening' }, () => load())
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

  // ── Helper para tiempo relativo ──
  const getRelativeTime = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return 'Hace un momento';
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);

      if (diffMins < 1) return 'hace un momento';
      if (diffMins < 60) return `hace ${diffMins} min`;
      if (diffHours < 24) return `hace ${diffHours} h`;
      return `hace ${diffDays} d`;
    } catch (_) {
      return 'reciente';
    }
  };

  // Tareas críticas
  const criticalTasks = tasks.filter(t => (t.priority === 'Urgente' || t.priority === 'Alta') && t.status !== 'Completada').slice(0, 5);

  // Reuniones de hoy
  const todayMeetings = upcomingMeetings.filter(m => {
    const mDate = new Date(m.scheduled_at);
    const now = new Date();
    return mDate.toDateString() === now.toDateString();
  });

  // Estado del sistema adaptado al IICS
  const systemStatus = conflictsCritical > 0 ? 'critical' : conflictsCount > 0 ? 'warning' : 'normal';
  const systemStatusLabel = systemStatus === 'critical' ? 'Alerta Crítica' : systemStatus === 'warning' ? 'Monitoreo Activo' : 'Operación Normal';
  const systemStatusDesc = systemStatus === 'critical' ? `${conflictsCritical} conflictos críticos bajo observación` : systemStatus === 'warning' ? `${conflictsCount} incidentes sociales en seguimiento` : 'Todos los flujos institucionales operando correctamente';
  const statusColor = systemStatus === 'critical' ? '#EF4444' : systemStatus === 'warning' ? '#F59E0B' : '#10B981';

  // Acciones rápidas (Barra footer)
  const quickActions = [
    { label: 'Nueva Tarea', icon: 'add_task', color: '#3B82F6', onClick: () => setShowCreateTask(true) },
    { label: 'Ver Flujos', icon: 'sync', color: '#10B981', onClick: () => navigate('/admin/tasks') },
    { label: 'Reportes', icon: 'analytics', color: '#EC4899', onClick: () => navigate('/admin/reports') },
    { label: 'Buscar Datos', icon: 'search', color: '#8B5CF6', onClick: () => navigate('/admin/data-ingestion') },
    { label: 'Reuniones', icon: 'groups', color: '#F59E0B', onClick: () => navigate('/admin/meetings') },
    { label: 'Usuarios', icon: 'person_search', color: '#EF4444', onClick: () => navigate('/admin/users') },
    { label: 'Documentos', icon: 'folder_open', color: '#06B6D4', onClick: () => navigate('/admin/resources') },
    { label: 'Configuración', icon: 'settings', color: '#6B7280', onClick: () => navigate('/admin/settings') },
  ];

  // Frase motivacional
  const hour = new Date().getHours();
  const phrase = hour < 12 ? 'Buenos días, lidera con propósito.' : hour < 18 ? 'Tu enfoque define el impacto.' : 'Cada acción cuenta, sigue adelante.';

  const recentActivities = [
    // Real tasks
    ...tasks.slice(0, 4).map(t => {
      const isCompleted = t.status === 'Completada';
      return {
        time: format(new Date(t.created_at), 'HH:mm'),
        dotColor: isCompleted ? 'bg-green-500' : t.priority === 'Urgente' ? 'bg-red-500' : 'bg-blue-500',
        label: isCompleted ? 'Tarea completada' : t.priority === 'Urgente' ? 'Tarea urgente' : 'Nueva tarea',
        desc: t.title,
        module: 'Tareas',
        timestamp: new Date(t.created_at).getTime()
      };
    }),
    // Real news
    ...news.slice(0, 3).map(n => {
      const date = n.published_at || n.created_at;
      return {
        time: format(new Date(date), 'HH:mm'),
        dotColor: 'bg-purple-500',
        label: 'Contenido publicado',
        desc: n.title,
        module: 'Noticias',
        timestamp: new Date(date).getTime()
      };
    }),
    // Real meetings
    ...upcomingMeetings.slice(0, 2).map(m => {
      return {
        time: format(new Date(m.scheduled_at), 'HH:mm'),
        dotColor: 'bg-indigo-500',
        label: 'Reunión programada',
        desc: m.title,
        module: 'Calendario',
        timestamp: new Date(m.scheduled_at).getTime()
      };
    }),
    // Static high fidelity logs to pad
    {
      time: '08:05',
      dotColor: 'bg-green-500',
      label: 'Sistema estable',
      desc: 'Todos los servicios operando correctamente',
      module: 'Sistema',
      timestamp: Date.now() - 3600000 * 2
    },
    {
      time: '09:42',
      dotColor: 'bg-blue-500',
      label: 'Datos sincronizados',
      desc: 'Carga completa: Clientes (1.250 registros)',
      module: 'Integración',
      timestamp: Date.now() - 600000
    }
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

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
        {/* ── HEADER (Bienvenida + Frase Motivacional + Acciones) ── */}
        <div className="flex items-start justify-between gap-4 mb-5 border-b border-exec-border pb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Icons.Home className="w-7 h-7 text-exec-blue" />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Bienvenido, <span className="notranslate text-white font-extrabold" translate="no">{user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'}</span>
              </h1>
            </div>
            <p className="text-xs text-gray-500 ml-10">
              Centro de Operaciones Institucional
            </p>
          </div>

          {/* Center Column: Date and Motivational Phrase */}
          <div className="hidden xl:block text-center flex-1 max-w-md">
            <p className="text-xs text-gray-400 font-medium">
              Hoy es {format(new Date(), "eeee, d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-sm text-exec-blue font-bold tracking-tight mt-0.5">
              {phrase}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden lg:block">
              <FinancialHeaderStats />
            </div>
            <button
              onClick={() => navigate('/admin/reports')}
              className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#111] text-gray-300 hover:text-white border border-exec-border hover:border-white/20 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <Icons.FileText className="w-3.5 h-3.5 text-exec-blue" />
              Reportes
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-exec-blue/20 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Tarea
            </button>
            <button
              onClick={() => setShowIicsPanels(!showIicsPanels)}
              className={`px-4 py-2 border rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                showIicsPanels
                  ? 'bg-exec-blue/15 text-exec-blue border-exec-blue/40'
                  : 'bg-[#0A0A0A] hover:bg-[#111] text-gray-300 hover:text-white border-exec-border hover:border-white/20'
              }`}
            >
              Personalizar {showIicsPanels ? '▼' : '❯'}
            </button>
          </div>
        </div>

        {/* ── MAIN 3-COLUMN LAYOUT (Image 2) ── */}
        <div className="grid grid-cols-12 gap-5 items-start">
          
          {/* ────────────── COLUMN 1: ACTIVIDAD RECIENTE (col-span-4) ────────────── */}
          <div className="col-span-12 lg:col-span-4">
            <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5 flex flex-col h-[650px]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-exec-blue text-sm" translate="no">bolt</span>
                  Actividad Reciente
                </h3>
                <button onClick={() => navigate('/admin/tasks')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver todo</button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 group">
                    <span className="text-[10px] text-gray-600 font-bold w-10 flex-shrink-0 mt-0.5">{act.time}</span>
                    <div className="relative flex-shrink-0 mt-1">
                      <span className={`w-2 h-2 rounded-full block ${act.dotColor}`} />
                      {idx !== recentActivities.length - 1 && (
                        <div className="w-px bg-exec-border absolute top-2 left-1 -bottom-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white tracking-tight group-hover:text-exec-blue transition-colors truncate">
                        {act.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                        {act.desc}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 bg-white/5 px-1.5 py-0.5 rounded-sm border border-exec-border ml-auto">
                      {act.module}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-exec-border flex items-center justify-between text-[10px] text-gray-600 font-bold uppercase">
                <span>Última actualización: hace unos segundos</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* ────────────── COLUMN 2: MIDDLE PANEL (col-span-5) ────────────── */}
          <div className="col-span-12 lg:col-span-5 space-y-5">
            {/* 1. Estado del Instituto */}
            <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Estado del Instituto</h3>
                <button onClick={() => navigate('/admin/conflicts')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver detalles</button>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <span className={`w-3.5 h-3.5 rounded-full block animate-pulse flex-shrink-0 ${systemStatus === 'critical' ? 'bg-red-500' : systemStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">{systemStatusLabel}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{systemStatusDesc}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 bg-[#111]/40 border border-exec-border p-3 rounded-sm">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-600 tracking-wider">Servicios</p>
                  <p className="text-xs font-black text-green-500 mt-1">98% Activos</p>
                </div>
                <div className="text-center border-l border-exec-border">
                  <p className="text-[10px] font-bold uppercase text-gray-600 tracking-wider">Flujos</p>
                  <p className="text-xs font-black text-exec-blue mt-1">{completionRate}% Exitosos</p>
                </div>
                <div className="text-center border-l border-exec-border">
                  <p className="text-[10px] font-bold uppercase text-gray-600 tracking-wider">Datos</p>
                  <p className="text-xs font-black text-green-500 mt-1">{100 - socialNegativeCount}% Saludables</p>
                </div>
                <div className="text-center border-l border-exec-border">
                  <p className="text-[10px] font-bold uppercase text-gray-600 tracking-wider">Usuarios</p>
                  <p className="text-xs font-black text-white mt-1">100% Activos</p>
                </div>
              </div>
            </div>

            {/* 2. Tareas Críticas */}
            <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-red-400 text-sm" translate="no">local_fire_department</span>
                  Tareas Críticas
                </h3>
                <button onClick={() => navigate('/admin/tasks')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver todas</button>
              </div>

              {criticalTasks.length === 0 ? (
                <div className="flex items-center gap-3 py-6 justify-center text-gray-500">
                  <span className="material-symbols-outlined notranslate text-green-500 text-xl" translate="no">check_circle</span>
                  <span className="text-xs font-bold">No hay tareas críticas pendientes</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {criticalTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-[#111]/30 border border-exec-border rounded-sm hover:border-exec-blue/20 transition-all group">
                      <span className="material-symbols-outlined notranslate text-red-500 text-base flex-shrink-0" translate="no">error</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-exec-blue transition-colors">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {task.priority} · {task.due_date ? getRelativeTime(task.due_date) : 'Sin vencimiento'}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/admin/tasks')}
                        className="px-3 py-1.5 bg-[#0A0A0A] hover:bg-[#111] border border-exec-border hover:border-white/10 rounded-sm text-[10px] font-black text-gray-300 hover:text-white uppercase transition-all"
                      >
                        {task.priority === 'Urgente' ? 'Ejecutar' : 'Abrir'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Reuniones de Hoy */}
            <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Reuniones de Hoy</h3>
                <button onClick={() => navigate('/admin/meetings')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver calendario</button>
              </div>

              {todayMeetings.length === 0 ? (
                <div className="flex items-center gap-3 py-6 justify-center text-gray-500">
                  <span className="material-symbols-outlined notranslate text-purple-400 text-lg" translate="no">calendar_today</span>
                  <span className="text-xs font-bold">No hay reuniones programadas para hoy</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayMeetings.map(m => {
                    const mDate = new Date(m.scheduled_at);
                    const now = new Date();
                    const diffMs = mDate.getTime() - now.getTime();
                    const isNow = diffMs < 0 && diffMs > -3600000;
                    const diffH = Math.round(diffMs / 3600000);
                    return (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-[#111]/30 border border-exec-border rounded-sm hover:border-purple-500/20 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-white">{format(mDate, 'HH:mm')}</span>
                          <span className="w-px h-4 bg-exec-border" />
                          <span className="text-xs font-medium text-gray-300 line-clamp-1">{m.title}</span>
                        </div>
                        {isNow ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-sm text-[9px] font-bold text-green-500 uppercase tracking-widest animate-pulse">
                            ● En curso
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/5 px-2 py-0.5 rounded-sm border border-exec-border">
                            {diffH > 0 ? `En ${diffH}h` : 'Terminado'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ────────────── COLUMN 3: RIGHT PANEL (col-span-3) ────────────── */}
          <div className="col-span-12 lg:col-span-3 space-y-5">
            {/* 1. Conflictos Activos */}
            <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-red-500 text-sm" translate="no">warning</span>
                  Conflictos Activos
                </h3>
                <button onClick={() => navigate('/admin/conflicts')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver todos</button>
              </div>

              {socialConflictsList.length === 0 ? (
                <div className="flex items-center gap-3 py-6 justify-center text-gray-500">
                  <span className="material-symbols-outlined notranslate text-green-500 text-lg" translate="no">verified</span>
                  <span className="text-xs font-bold">Sin conflictos registrados</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {socialConflictsList.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-start gap-2.5 p-2.5 bg-[#111]/30 border border-exec-border rounded-sm hover:border-red-500/20 transition-all">
                      <span className="material-symbols-outlined notranslate text-red-500 text-[15px] mt-0.5" translate="no">crisis_alert</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{c.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm border ${
                            c.intensity === 'Crítico' || c.intensity === 'Alto'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {c.intensity}
                          </span>
                          <span className="text-[9px] text-gray-600 font-bold">{getRelativeTime(c.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Contenido Reciente */}
            <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-gray-400 text-sm" translate="no">description</span>
                  Contenido Reciente
                </h3>
                <button onClick={() => navigate('/admin/news')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver todo</button>
              </div>

              <div className="space-y-3">
                {news.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-start gap-2.5 p-2.5 bg-[#111]/30 border border-exec-border rounded-sm hover:border-exec-blue/20 transition-all cursor-pointer" onClick={() => navigate('/admin/news')}>
                    <span className="material-symbols-outlined notranslate text-gray-500 text-base mt-0.5" translate="no">article</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-300 truncate group-hover:text-white transition-colors">{item.title}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">{item.published_at ? getRelativeTime(item.published_at) : 'Hoy'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── SECCIÓN EXPANDIBLE (Personalizar / Métricas del IICS y Observatorio) ── */}
        {showIicsPanels && (
          <div className="mt-8 border-t border-exec-border pt-8 space-y-8 animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏛️</span>
              <h2 className="text-lg font-black uppercase tracking-widest text-white">Métricas de Operación y Observatorio IICS</h2>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 bg-white/5 border border-exec-border px-2 py-0.5 rounded-sm">Monitoreo Real</span>
            </div>

            {/* 1. Bento Grid: 9 Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Pendientes"
                value={pendingTasksDisplay}
                icon="assignment"
                iconColor="text-exec-blue"
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
              <MetricCard
                title="Conflictos"
                value={String(conflictsCount).padStart(2, '0')}
                icon="crisis_alert"
                iconColor="text-red-400"
                change={conflictsCritical > 0 ? `${conflictsCritical} críticos` : 'Sin críticos'}
                changeType={conflictsCritical > 0 ? 'negative' : 'positive'}
                onClick={() => navigate('/admin/conflicts')}
              />
              <MetricCard
                title="Transmedia"
                value={String(transmediaCount).padStart(2, '0')}
                icon="video_library"
                iconColor="text-exec-blue"
                change="Videos"
                onClick={() => navigate('/admin/transmedia')}
              />
              <MetricCard
                title="Prov. IICS"
                value={`${provinceMetricsCount}/13`}
                icon="analytics"
                iconColor="text-yellow-400"
                change="Métricas BD"
                onClick={() => navigate('/admin/province-metrics')}
              />
              <MetricCard
                title="Escucha Social"
                value={String(socialListeningCount).padStart(2, '0')}
                icon="manage_search"
                iconColor="text-emerald-400"
                change={socialNegativeCount > 0 ? `${socialNegativeCount} neg` : 'Sin neg'}
                changeType={socialNegativeCount > 0 ? 'negative' : 'positive'}
                onClick={() => navigate('/admin/social-listening')}
              />
              <MetricCard
                title="Datos & Enc."
                value={String(statIndicatorsCount + datasetsCount).padStart(2, '0')}
                icon="dataset"
                iconColor="text-cyan-400"
                change="Ind. & Datasets"
                onClick={() => navigate('/admin/data-ingestion')}
              />
            </div>

            {/* 2. Rendimiento de Equipo & Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 space-y-5">
                {/* Director view team stats */}
                {(user?.role?.includes('Director') || user?.role?.includes('Asesor') || user?.role?.includes('Imagen')) && (
                  <div className="exec-card p-5 bg-[#0A0A0A] border border-exec-border">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Rendimiento del Equipo</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#111]/40 border border-exec-border p-4 rounded-sm">
                        <p className="text-xs text-gray-500 mb-2">Finalización</p>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-light text-white">{completionRate}%</span>
                        </div>
                        <div className="w-full bg-[#262626] h-1.5 rounded-sm mt-3 overflow-hidden">
                          <div className="bg-exec-blue h-full rounded-sm" style={{ width: `${completionRate}%` }} />
                        </div>
                      </div>
                      <div className="bg-[#111]/40 border border-exec-border p-4 rounded-sm">
                        <p className="text-xs text-gray-500 mb-2">Tareas Activas</p>
                        <span className="text-3xl font-light text-white">{totalTasks - totalCompleted}</span>
                      </div>
                      <div className="bg-[#111]/40 border border-exec-border p-4 rounded-sm">
                        <p className="text-xs text-gray-500 mb-2">Actividad Reciente</p>
                        <div className="space-y-1.5 mt-1">
                          {tasks.slice(0, 2).map(task => (
                            <p key={task.id} className="text-[10px] text-gray-400 truncate font-semibold">• {task.title}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Donut and Bar charts */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="exec-card p-5 bg-[#0A0A0A] border border-exec-border h-[340px] flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Distribución por Cargo</h3>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="relative w-36 h-36 rounded-full flex items-center justify-center">
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
                              return stops.length > 0 ? `conic-gradient(${stops.join(', ')})` : '#1f1f1f';
                            })(),
                            mask: 'radial-gradient(transparent 58%, black 59%)',
                            WebkitMask: 'radial-gradient(transparent 58%, black 59%)'
                          }}
                        />
                        <div className="text-center z-10">
                          <span className="block text-2xl font-light text-white">{roleStats.reduce((s, r) => s + r.totalTasks, 0) || totalProfiles}</span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Tareas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="exec-card p-5 bg-[#0A0A0A] border border-exec-border h-[340px] flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Rendimiento Semanal</h3>
                    <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 border-b border-exec-border" style={{ minHeight: 0 }}>
                      {performanceStats.map((val, idx) => {
                        const maxVal = Math.max(...performanceStats, 1);
                        const height = `${(val / maxVal) * 100}%`;
                        const d = new Date();
                        d.setDate(d.getDate() - (4 - idx));
                        const dayName = format(d, 'EEE', { locale: es }).toUpperCase().slice(0, 3);
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 w-full group">
                            <div className="w-full bg-[#171717] rounded-sm relative overflow-hidden h-[180px]">
                              <div className="absolute bottom-0 w-full rounded-sm bg-exec-blue" style={{ height }} />
                            </div>
                            <span className="text-[9px] font-bold text-gray-500">{dayName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Redes Sociales & Cumpleaños (col-span-4) */}
              <div className="lg:col-span-4 space-y-5">
                <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined notranslate text-exec-blue text-sm" translate="no">analytics</span>
                    Redes Sociales
                  </h3>
                  <MetaStats mode="premium" />
                </div>

                {upcomingBirthdays.length > 0 && (
                  <div className="exec-card bg-gradient-to-br from-blue-900/5 to-[#0A0A0A] border border-exec-border p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                      <Cake className="w-3.5 h-3.5 text-pink-400" />
                      Próximos Cumpleaños
                    </h3>
                    <div className="space-y-3">
                      {upcomingBirthdays.map(bd => (
                        <div key={bd.id} className="flex items-center gap-3">
                          <img
                            src={bd.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(bd.fullName)}&background=random`}
                            className="w-8 h-8 rounded-full object-cover border border-exec-border"
                            alt={bd.fullName}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{bd.fullName}</p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest">{format(bd.targetDate, "dd 'de' MMMM", { locale: es })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SECCIÓN 2 — ESQUEMA PROPUESTO (Calendario · Contenido · Redes · Cumpleaños · Sistema)
            Se agrega por scroll debajo de la sección principal existente
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="mt-10 border-t border-exec-border pt-8 space-y-6">
          {/* Separador de sección */}
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined notranslate text-exec-blue text-base" translate="no">grid_view</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">Vista General del Instituto</h2>
            <div className="flex-1 h-px bg-exec-border" />
          </div>

          {/* ── FILA SUPERIOR: Calendario + Contenido + Redes Sociales ── */}
          <div className="grid grid-cols-12 gap-5">

            {/* CALENDARIO MINI (col-span-4) */}
            <div className="col-span-12 lg:col-span-4 exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-purple-400 text-sm" translate="no">calendar_month</span>
                  Calendario
                </h3>
                <button onClick={() => navigate('/admin/meetings')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver calendario →</button>
              </div>

              {/* Mini Calendar Header */}
              <div className="mb-3">
                <p className="text-sm font-bold text-white text-center mb-3">
                  {format(new Date(), "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                </p>
                <div className="grid grid-cols-7 text-center mb-1">
                  {['L','M','M','J','V','S','D'].map((d, i) => (
                    <span key={i} className="text-[9px] font-black uppercase text-gray-600">{d}</span>
                  ))}
                </div>
                {/* Calendar days grid */}
                {(() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = today.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  // day of week: 0=Sun -> shift to Monday-first
                  const startOffset = (firstDay.getDay() + 6) % 7;
                  const totalDays = lastDay.getDate();
                  const cells: (number | null)[] = [
                    ...Array(startOffset).fill(null),
                    ...Array.from({ length: totalDays }, (_, i) => i + 1)
                  ];
                  // Pad to complete rows
                  while (cells.length % 7 !== 0) cells.push(null);

                  const meetingDays = new Set(
                    upcomingMeetings.map(m => new Date(m.scheduled_at).getDate())
                  );

                  return (
                    <div className="grid grid-cols-7 gap-0.5">
                      {cells.map((day, i) => {
                        const isToday = day === today.getDate();
                        const hasMeeting = day !== null && meetingDays.has(day);
                        return (
                          <div
                            key={i}
                            className={`text-center py-1 rounded-sm text-[11px] font-bold transition-all ${
                              day === null ? '' :
                              isToday
                                ? 'bg-exec-blue text-white shadow-lg shadow-exec-blue/30'
                                : hasMeeting
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'text-gray-500 hover:bg-white/5 hover:text-white cursor-default'
                            }`}
                          >
                            {day || ''}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Próximas reuniones bajo el calendario */}
              {upcomingMeetings.length > 0 && (
                <div className="mt-4 pt-3 border-t border-exec-border space-y-2">
                  {upcomingMeetings.slice(0, 3).map(m => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2.5 cursor-pointer hover:bg-[#171717] px-2 py-1.5 rounded-sm transition-colors"
                      onClick={() => navigate('/admin/meetings')}
                    >
                      <div className="flex-shrink-0 text-center bg-exec-blue/10 border border-exec-blue/20 rounded-sm px-1.5 py-0.5 min-w-[36px]">
                        <p className="text-[8px] font-black text-exec-blue uppercase">{format(new Date(m.scheduled_at), 'dd MMM', { locale: es })}</p>
                        <p className="text-[10px] font-black text-white">{format(new Date(m.scheduled_at), 'HH:mm')}</p>
                      </div>
                      <p className="text-[11px] text-gray-300 truncate flex-1">{m.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CONTENIDO + REDES SOCIALES (col-span-8) */}
            <div className="col-span-12 lg:col-span-8 space-y-5">

              {/* Contadores de Contenido */}
              <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <span className="material-symbols-outlined notranslate text-gray-400 text-sm" translate="no">folder_copy</span>
                    Contenido
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Videos', value: transmediaCount, color: 'text-blue-400', icon: 'videocam', route: '/admin/transmedia' },
                    { label: 'Recursos', value: newResourcesCount, color: 'text-green-400', icon: 'folder_open', route: '/admin/resources' },
                    { label: 'Datasets', value: datasetsCount, color: 'text-purple-400', icon: 'dataset', route: '/admin/data-ingestion' },
                    { label: 'Indicadores', value: statIndicatorsCount, color: 'text-yellow-400', icon: 'bar_chart', route: '/admin/data-ingestion' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="text-center p-4 bg-[#111]/40 border border-exec-border rounded-sm hover:border-white/10 cursor-pointer transition-all group"
                      onClick={() => navigate(item.route)}
                    >
                      <span className={`material-symbols-outlined notranslate text-2xl mb-2 block ${item.color} group-hover:scale-110 transition-transform`} translate="no">{item.icon}</span>
                      <p className={`text-3xl font-black ${item.color} tabular-nums`}>{item.value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Redes Sociales */}
              <div className="exec-card bg-[#0A0A0A] border border-exec-border p-5">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <span className="material-symbols-outlined notranslate text-exec-blue text-sm" translate="no">analytics</span>
                    Redes Sociales
                  </h3>
                </div>
                <MetaStats mode="premium" />
              </div>
            </div>
          </div>

          {/* ── FILA INFERIOR: Noticias + Cumpleaños + Resumen del Sistema ── */}
          <div className="grid grid-cols-12 gap-5">

            {/* NOTICIAS (col-span-5) */}
            <div className="col-span-12 lg:col-span-5 exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-gray-400 text-sm" translate="no">newspaper</span>
                  Noticias
                </h3>
                <button onClick={() => navigate('/admin/news')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver todas</button>
              </div>
              <div className="space-y-3">
                {news.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">Sin noticias recientes</p>
                ) : news.slice(0, 4).map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 hover:bg-[#171717] rounded-sm cursor-pointer transition-colors border border-transparent hover:border-exec-border group"
                    onClick={() => navigate('/admin/news')}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-exec-blue mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors line-clamp-1">{item.title}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{item.published_at ? format(new Date(item.published_at), "d 'de' MMMM", { locale: es }) : 'Hoy'}</p>
                    </div>
                    <span className="text-[9px] text-gray-600 font-bold whitespace-nowrap flex-shrink-0">
                      {item.published_at ? format(new Date(item.published_at), 'HH:mm') : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CUMPLEAÑOS (col-span-4) */}
            <div className="col-span-12 lg:col-span-4 exec-card bg-gradient-to-br from-blue-950/20 to-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Cake className="w-3.5 h-3.5 text-pink-400" />
                  Cumpleaños
                </h3>
                <button onClick={() => navigate('/admin/birthdays')} className="text-exec-blue text-[10px] uppercase font-bold hover:underline">Ver todos</button>
              </div>

              {upcomingBirthdays.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">Sin cumpleaños próximos</p>
              ) : (
                <div className="space-y-4">
                  {upcomingBirthdays.slice(0, 3).map(bd => {
                    const isToday = isSameDay(bd.targetDate, new Date());
                    return (
                      <div
                        key={bd.id}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate('/admin/birthdays')}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={bd.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(bd.fullName)}&background=1a1a2e&color=4f8ef7&size=80`}
                            className={`w-10 h-10 rounded-full object-cover border-2 transition-all ${isToday ? 'border-pink-500 shadow-lg shadow-pink-500/30' : 'border-exec-border group-hover:border-exec-blue/50'}`}
                            alt={bd.fullName}
                          />
                          {isToday && (
                            <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-0.5 animate-bounce">
                              <PartyPopper className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate group-hover:text-exec-blue transition-colors">{bd.fullName}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{format(bd.targetDate, "dd 'de' MMMM", { locale: es })}</p>
                        </div>
                        {isToday ? (
                          <span className="text-[9px] font-black text-pink-500 bg-pink-500/10 border border-pink-500/20 px-2 py-1 rounded-sm uppercase animate-pulse">¡Hoy!</span>
                        ) : (
                          <Gift className="w-3.5 h-3.5 text-gray-700 group-hover:text-exec-blue/50 transition-colors flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RESUMEN DEL SISTEMA (col-span-3) */}
            <div className="col-span-12 lg:col-span-3 exec-card bg-[#0A0A0A] border border-exec-border p-5">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-exec-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-green-400 text-sm" translate="no">monitoring</span>
                  Resumen del Sistema
                </h3>
              </div>

              {/* Donut chart */}
              {(() => {
                const total = Math.max(tasks.length, 1);
                const completed = tasks.filter(t => t.status === 'Completada').length;
                const warning = tasks.filter(t => t.priority === 'Alta' && t.status !== 'Completada').length;
                const critical = tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Completada').length;
                const normal = total - warning - critical;
                const pctCompleted = Math.round((completed / total) * 100);
                const pctWarning = Math.round((warning / total) * 100);
                const pctCritical = Math.round((critical / total) * 100);
                const pctNormal = 100 - pctWarning - pctCritical;

                const segments = [
                  { label: 'Operativo', pct: pctNormal, color: '#10B981' },
                  { label: 'Advertencia', pct: pctWarning, color: '#F59E0B' },
                  { label: 'Crítico', pct: pctCritical, color: '#EF4444' },
                ];

                let acc = 0;
                const stops = segments.map(s => {
                  const start = acc;
                  acc += s.pct;
                  return `${s.color} ${start}% ${acc}%`;
                });

                return (
                  <>
                    <div className="flex items-center justify-center mb-4">
                      <div
                        className="relative w-28 h-28 rounded-full"
                        style={{
                          background: `conic-gradient(${stops.join(', ')})`,
                          mask: 'radial-gradient(transparent 55%, black 56%)',
                          WebkitMask: 'radial-gradient(transparent 55%, black 56%)'
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      {segments.map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-[11px] text-gray-400 font-medium">{s.label}</span>
                          </div>
                          <span className="text-[11px] font-black tabular-nums" style={{ color: s.color }}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                    <p className={`mt-3 pt-3 border-t border-exec-border text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 ${systemStatus === 'normal' ? 'text-green-500' : systemStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${systemStatus === 'normal' ? 'bg-green-500' : systemStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      {systemStatusDesc}
                    </p>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
        {/* FIN SECCIÓN 2 */}

        {/* ── QUICK ACTIONS BAR (Footer Sticky) ── */}
        <div className="mt-8 border-t border-exec-border pt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Acciones Rápidas</p>
            <div className="flex items-center gap-2 flex-wrap">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0A0A] hover:bg-[#111] border border-exec-border hover:border-white/20 rounded-sm text-xs font-medium text-gray-300 hover:text-white transition-all group"
                >
                  <span
                    className="material-symbols-outlined notranslate text-sm transition-colors"
                    style={{ color: action.color }}
                    translate="no"
                  >
                    {action.icon}
                  </span>
                  {action.label}
                </button>
              ))}
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
              <h1 className="text-xl font-bold">Bienvenido, <span className="text-exec-blue notranslate" translate="no">{user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'}</span></h1>
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
