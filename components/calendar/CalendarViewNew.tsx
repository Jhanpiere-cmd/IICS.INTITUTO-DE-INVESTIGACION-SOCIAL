import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MonthlyCalendarView } from './MonthlyCalendarView';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import { getUserColor } from '../../lib/userColors';
import { Calendar, CalendarDays, Plus, X, Clock, MapPin, Link as LinkIcon, Users as UsersIcon, AlertCircle, ChevronLeft, ChevronRight, LayoutGrid, Sparkles } from 'lucide-react';
import { ContentCalendarGrid } from './ContentCalendarGrid';
import { AIContentPlanner } from './AIContentPlanner';
import { useToast } from '../ui/ToastContext';
import { MeetingCreationEngine } from '../meetings/MeetingCreationEngine';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'meeting' | 'event';
  color: string;
  user_name: string;
  user_id: string;
  time?: string;
  duration_minutes?: number;
  description?: string;
  location?: string;
  location_link?: string;
  status?: string;
  priority?: string;
  collaborators?: { id: string, name: string, avatar: string | null }[];
}

type ViewMode = 'month' | 'week';

interface CalendarViewNewProps {
  hideHeader?: boolean;
}

export const CalendarViewNew: React.FC<CalendarViewNewProps> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarTab, setCalendarTab] = useState<'team' | 'content' | 'ai'>('team');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [allUsers, setAllUsers] = useState<Map<string, { name: string, avatar: string | null }>>(new Map());
  const { showToast } = useToast();
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  // Engine States
  const [showEngine, setShowEngine] = useState(false);
  const [engineMode, setEngineMode] = useState<'manual' | 'ai'>('manual');

  useEffect(() => {
    if (user) {
      loadData();
      
      // Suscripción en tiempo real para reuniones
      const ch = supabase
        .channel('calendar-meetings-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meetings' }, (payload) => {
          const m = payload.new as any;
          if (m.created_by !== user?.id) {
            showToast({
              type: 'info',
              title: 'NUEVA REUNIÓN PROGRAMADA',
              message: `${m.title || 'Se ha convocado una nueva sesión de trabajo de alto nivel.'}`,
              duration: 8000
            });
          }
          loadData();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetings' }, () => loadData())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meetings' }, () => loadData())
        .subscribe();
        
      return () => { supabase.removeChannel(ch); };
    }
  }, [user?.id, showToast]);

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEvent) setSelectedEvent(null);
        if (showEngine) setShowEngine(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedEvent, showEngine]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar rol del usuario actual
      const { data: userData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (userData) {
        setCurrentUserRole(userData.role);
      }

      // Cargar todos los usuarios para obtener nombres y asignar colores
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, "fullName", avatar_url');

      if (usersError) throw usersError;

      const usersMap = new Map<string, {name: string, avatar: string | null}>();
      usersData?.forEach(u => {
        usersMap.set(u.id, { name: u.fullName, avatar: u.avatar_url });
      });
      setAllUsers(usersMap);

      // Cargar TODAS las tareas
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, due_time, status, priority, assigned_to, created_by, collaborator_ids, group_task_id')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;

      // Cargar TODAS las reuniones
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, title, description, scheduled_at, duration_minutes, location, location_link, created_by')
        .order('scheduled_at', { ascending: true });

      if (meetingsError) throw meetingsError;

      // Cargar TODOS los eventos (webinars, etc.)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, description, scheduled_date, start_time, end_time, event_type, status, location')
        .order('scheduled_date', { ascending: true });

      if (eventsError) throw eventsError;
      
      // Cargar planificación audiovisual
      const { data: audioData, error: audioError } = await supabase
        .from('audiovisual_planning')
        .select('id, title, description, target_date, content_type, status')
        .order('target_date', { ascending: true });

      if (audioError) throw audioError;

      // Convertir tareas a eventos (Agrupando lógicamente duplicados)
      const rawTaskEvents: CalendarEvent[] = (tasksData || []).map(task => {
        const userId = task.assigned_to || task.created_by || '';
        const userInfo = usersMap.get(userId);
        const userName = userInfo?.name || 'Sin asignar';

        // Parsear fecha local
        const parts = (task.due_date as string).substring(0, 10).split('-');
        const taskDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

        if (task.due_time) {
          const [h, m] = (task.due_time as string).split(':');
          taskDate.setHours(parseInt(h), parseInt(m));
        }

        // Resolver colaboradores iniciales si existen en la DB
        const collaborators = (task.collaborator_ids || []).map((id: string) => {
          const u = usersMap.get(id);
          return u ? { id, name: u.name, avatar: u.avatar } : null;
        }).filter(Boolean);

        return {
          id: task.id,
          title: task.title,
          date: taskDate,
          type: 'task' as const,
          color: getUserColor(userId),
          user_name: userName,
          user_id: userId,
          description: task.description,
          status: task.status,
          priority: task.priority,
          time: task.due_time ? (task.due_time as string).substring(0, 5) : undefined,
          collaborators: collaborators as any
        };
      });

      // Agrupación heurística para el calendario
      const groupedEventsMap = new Map<string, CalendarEvent>();
      rawTaskEvents.forEach(event => {
        // Llave de agrupación: Título + Descripción (primeros 50 chars) + Fecha + Hora
        const key = `${event.title?.trim()}|${event.description?.substring(0, 50).trim()}|${event.date.toISOString().split('T')[0]}|${event.time || ''}`;
        
        if (groupedEventsMap.has(key)) {
          const existing = groupedEventsMap.get(key)!;
          // Combinar colaboradores
          const combined = [
            ...(existing.collaborators || []),
            { id: event.user_id, name: event.user_name, avatar: usersMap.get(event.user_id)?.avatar || null },
            ...(event.collaborators || [])
          ];
          // Eliminar duplicados
          existing.collaborators = Array.from(new Map(combined.map(c => [c.id, c])).values())
            .filter(c => c.id !== existing.user_id);
        } else {
          groupedEventsMap.set(key, { ...event });
        }
      });

      const taskEvents = Array.from(groupedEventsMap.values());

      // Convertir reuniones a eventos
      const meetingEvents: CalendarEvent[] = (meetingsData || []).map(meeting => {
        const userId = meeting.created_by || '';
        const userInfo = usersMap.get(userId);
        const userName = userInfo?.name || 'Sin organizador';
        const meetingDate = new Date(meeting.scheduled_at);
        const time = meetingDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

        return {
          id: meeting.id,
          title: meeting.title,
          date: meetingDate,
          type: 'meeting' as const,
          color: getUserColor(userId),
          user_name: userName,
          user_id: userId,
          time: time,
          duration_minutes: meeting.duration_minutes || 60,
          description: meeting.description,
          location: meeting.location,
          location_link: meeting.location_link,
        };
      });

      // Convertir actividades/eventos a formato calendario
      const acsEvents: CalendarEvent[] = (eventsData || []).map(event => {
        const eventDate = new Date(event.scheduled_date);
        if (event.start_time) {
          const [hours, minutes] = event.start_time.split(':');
          eventDate.setHours(parseInt(hours), parseInt(minutes));
        }

        return {
          id: event.id,
          title: event.title,
          date: eventDate,
          type: 'event' as any,
          color: '#8b5cf6', // Violeta para eventos
          user_name: 'Organización',
          user_id: 'system',
          time: event.start_time,
          description: event.description,
          location: event.event_type,
          status: event.status
        };
      });

      // Convertir planificación audiovisual a eventos
      const audioEvents: CalendarEvent[] = (audioData || []).map(item => {
        const parts = (item.target_date as string).split('-');
        const itemDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        
        return {
          id: item.id,
          title: `[${(item.content_type || 'post').toUpperCase()}] ${item.title}`,
          date: itemDate,
          type: 'event' as any,
          color: item.content_type === 'video' ? '#f43f5e' : '#3b82f6',
          user_name: 'Imagen',
          user_id: 'media',
          description: item.description,
          status: item.status
        };
      });

      setEvents([...taskEvents, ...meetingEvents, ...acsEvents, ...audioEvents]);
    } catch (error: any) {
      console.error('Error loading calendar data:', error);
      showToast({ type: 'error', title: 'ERROR', message: 'Error al cargar eventos' });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    loadData();
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewDate(date);
    if (viewMode === 'month') {
      setViewMode('week');
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (viewMode === 'month') {
      newDate.setMonth(viewDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(viewDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setViewDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDate(today);
  };

  const handleMonthChange = (month: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(month);
    setViewDate(newDate);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(year);
    setViewDate(newDate);
  };

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-exec-blue mx-auto mb-4"></div>
          <p className="text-exec-slate">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6">


      {calendarTab === 'content' ? (
        <ContentCalendarGrid />
      ) : calendarTab === 'ai' ? (
        <AIContentPlanner />
      ) : (
        <div className="animate-in fade-in duration-700">
          {/* ═══ VISTA ESCRITORIO (hidden md:block) ═══ */}
          <div className="hidden md:block space-y-6">
            {/* Header */}
            {!hideHeader && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-exec-border">
                <div>
                  <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                    <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                      <Calendar className="w-6 h-6 text-exec-blue" />
                    </div>
                    <span className="whitespace-nowrap">CALENDARIO <span className="text-exec-blue">ACS</span></span>
                  </h1>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
                    {currentUserRole === 'Director'
                      ? 'Control centralizado de cronogramas y reuniones ejecutivas'
                      : 'Seguimiento de tiempos y metas operativas del equipo'}
                  </p>
                </div>

                <div className="flex flex-nowrap items-center gap-3">
                  {/* Navigation Controls */}
                  <div className="flex bg-black border border-exec-border rounded-none p-1">
                    <button
                      onClick={() => navigateDate('prev')}
                      className="p-1 px-2.5 hover:bg-[#111] text-gray-400 hover:text-white transition-all border-r border-exec-border"
                      title="Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center px-2 gap-1.5">
                      <select
                        value={viewDate.getMonth()}
                        onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                        className="bg-transparent text-[10px] font-black uppercase text-white outline-none cursor-pointer hover:text-exec-blue transition-colors appearance-none text-center min-w-[65px]"
                      >
                        {meses.map((m, idx) => <option key={idx} value={idx} className="bg-black">{m}</option>)}
                      </select>
                      
                      <select
                        value={viewDate.getFullYear()}
                        onChange={(e) => handleYearChange(parseInt(e.target.value))}
                        className="bg-transparent text-[10px] font-black uppercase text-exec-blue outline-none cursor-pointer hover:text-white transition-colors appearance-none text-center min-w-[45px]"
                      >
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y} className="bg-black">{y}</option>)}
                      </select>
                    </div>

                    <button
                      onClick={() => navigateDate('next')}
                      className="p-1 px-2.5 hover:bg-[#111] text-gray-400 hover:text-white transition-all border-l border-exec-border"
                      title="Siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={goToToday}
                      className="px-3 border-l border-exec-border text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      Hoy
                    </button>
                  </div>

                  {/* View Switching Ribbon */}
                  <div className="flex bg-black border border-exec-border rounded-none p-1">
                    <button
                      onClick={() => setCalendarTab('team')}
                      className={`flex px-3 py-1.5 rounded-none transition-all items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${calendarTab === 'team'
                        ? 'bg-exec-blue text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'text-gray-500 hover:text-white hover:bg-[#111]'
                        }`}
                    >
                      <UsersIcon className="w-3.5 h-3.5" />
                      <span>Equipo</span>
                    </button>
                    <button
                      onClick={() => setCalendarTab('content')}
                      className={`flex px-3 py-1.5 rounded-none transition-all items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${calendarTab === 'content'
                        ? 'bg-exec-blue text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'text-gray-500 hover:text-white hover:bg-[#111]'
                        }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Contenidos</span>
                    </button>
                    <button
                      onClick={() => setCalendarTab('ai')}
                      className={`flex px-3 py-1.5 rounded-none transition-all items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${calendarTab === 'ai'
                        ? 'bg-exec-blue text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'text-gray-500 hover:text-white hover:bg-[#111]'
                        }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Planificador AI</span>
                    </button>

                    <div className="w-[1px] h-4 bg-exec-border mx-1 self-center" />

                    <button
                      onClick={() => setViewMode('month')}
                      className={`flex px-3 py-1.5 rounded-none transition-all items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${viewMode === 'month'
                        ? 'text-white border-b-2 border-exec-blue'
                        : 'text-gray-500 hover:text-white hover:bg-[#111]'
                        }`}
                    >
                      <span>Mes</span>
                    </button>
                    <button
                      onClick={() => setViewMode('week')}
                      className={`flex px-3 py-1.5 rounded-none transition-all items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${viewMode === 'week'
                        ? 'text-white border-b-2 border-exec-blue'
                        : 'text-gray-500 hover:text-white hover:bg-[#111]'
                        }`}
                    >
                      <span>Semana</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEngineMode('ai');
                        setShowEngine(true);
                      }}
                      className="px-3 py-2 bg-white hover:bg-gray-100 text-black border border-exec-border rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined notranslate text-exec-blue text-[18px]" translate="no">smart_toy</span>
                      <span>IA</span>
                    </button>
                    <button
                      onClick={() => {
                        setEngineMode('manual');
                        setShowEngine(true);
                      }}
                      className="px-3 py-2 bg-exec-blue hover:bg-blue-600 text-white rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nueva</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {hideHeader && (
              <div className="flex justify-end gap-2 mb-4">
                <div className="flex bg-gray-100 dark:bg-slate-700 rounded-none p-1">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-none transition-colors flex items-center justify-center gap-2 text-sm ${viewMode === 'month'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Mes</span>
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-none transition-colors flex items-center justify-center gap-2 text-sm ${viewMode === 'week'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>Semana</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setEngineMode('manual');
                    setShowEngine(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-none hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Reunión</span>
                </button>
              </div>
            )}

            <div className="flex-1 space-y-6">
              {viewMode === 'month' ? (
                <MonthlyCalendarView
                  events={events}
                  onDayClick={handleDayClick}
                  viewDate={viewDate}
                  selectedDate={selectedDate}
                />
              ) : (
                <WeeklyCalendarView
                  events={events}
                  onEventClick={handleEventClick}
                  viewDate={viewDate}
                />
              )}
            </div>
          </div>

      {/* =========================================================================
          VISTA MÓVIL (block md:hidden) - LISTA DE EVENTOS
         ========================================================================= */}
      <div className="block md:hidden space-y-4 pt-0">
        {/* ═══ MOBILE HEADER ═══ */}
        <section className="flex justify-between items-center bg-[#0A0A0A] border border-[#262626] rounded-none p-4 shadow-subtle mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
              <span className="material-symbols-outlined notranslate text-exec-blue text-xl" translate="no">calendar_today</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white uppercase tracking-tight">CALENDARIO <span className="text-exec-blue">ACS</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEngineMode('ai');
                setShowEngine(true);
              }}
              className="w-10 h-10 flex items-center justify-center bg-white border border-exec-border rounded-none text-black shadow-lg active:scale-95 transition-all"
              title="Asistente IA"
            >
              <span className="material-symbols-outlined notranslate text-exec-blue text-xl" translate="no">smart_toy</span>
            </button>
            <button 
              onClick={() => {
                setEngineMode('manual');
                setShowEngine(true);
              }}
              className="w-10 h-10 flex items-center justify-center bg-exec-blue rounded-none text-white shadow-lg active:scale-95 transition-all shadow-exec-blue/20"
              title="Nueva Reunión"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* Mobile View Controls */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setCalendarTab('team')}
              className={`py-3 text-[10px] font-bold uppercase tracking-widest border transition-all text-center ${calendarTab === 'team' ? 'bg-exec-blue text-white border-exec-blue shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#0A0A0A] text-gray-500 border-[#262626]'}`}
            >
              Equipo
            </button>
            <button
              onClick={() => setCalendarTab('content')}
              className={`py-3 text-[10px] font-bold uppercase tracking-widest border transition-all text-center ${calendarTab === 'content' ? 'bg-exec-blue text-white border-exec-blue shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#0A0A0A] text-gray-500 border-[#262626]'}`}
            >
              Contenidos
            </button>
            <button
              onClick={() => setCalendarTab('ai')}
              className={`py-3 text-[10px] font-bold uppercase tracking-widest border transition-all text-center ${calendarTab === 'ai' ? 'bg-exec-blue text-white border-exec-blue shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#0A0A0A] text-gray-500 border-[#262626]'}`}
            >
              Planificador AI
            </button>
          </div>

          <div className="flex bg-[#0A0A0A] border border-[#262626] p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'text-white border-b-2 border-exec-blue' : 'text-gray-500'}`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'text-white border-b-2 border-exec-blue' : 'text-gray-500'}`}
            >
              Semana
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#0A0A0A] p-4 border border-[#262626] rounded-none mb-2 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                navigateDate('prev');
              }}
              className="p-1.5 hover:bg-[#111] rounded-none border border-[#262626] text-gray-400 hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[12px] font-black text-white uppercase tracking-tighter">
                {viewMode === 'month' 
                  ? viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                  : (() => {
                      const start = new Date(viewDate);
                      start.setDate(start.getDate() - start.getDay());
                      const end = new Date(start);
                      end.setDate(start.getDate() + 6);
                      return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
                    })()
                }
              </h2>
              <p className="text-[9px] font-bold text-exec-blue uppercase tracking-widest leading-none mt-0.5">
                {viewMode === 'month' ? 'Vista Mensual' : 'Vista Semanal'}
              </p>
            </div>
            <button
              onClick={() => {
                navigateDate('next');
              }}
              className="p-1.5 hover:bg-[#111] rounded-none border border-[#262626] text-gray-400 hover:text-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="text-[9px] font-black uppercase text-gray-500 hover:text-white border border-[#262626] px-2 py-1 rounded-none transition-all"
          >
            Hoy
          </button>
        </div>

        {events.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-[#0A0A0A] border border-dashed border-[#262626] rounded-none">
            <div className="w-12 h-12 bg-[#111] rounded-full flex items-center justify-center border border-[#262626]">
              <Calendar className="w-6 h-6 text-gray-700" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">No hay eventos programados</p>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-exec-blue/50 before:via-[#262626] before:to-transparent">
            {/* Agrupar eventos por día para la lista móvil */}
            {(() => {
              const filteredEvents = events.filter(e => {
                const eventDate = new Date(e.date);
                if (viewMode === 'month') {
                  return eventDate.getMonth() === viewDate.getMonth() &&
                         eventDate.getFullYear() === viewDate.getFullYear();
                } else {
                  // Filtrado por semana (Dom-Sáb)
                  const start = new Date(viewDate);
                  start.setDate(start.getDate() - start.getDay());
                  start.setHours(0, 0, 0, 0);
                  const end = new Date(start);
                  end.setDate(start.getDate() + 6);
                  end.setHours(23, 59, 59, 999);
                  return eventDate >= start && eventDate <= end;
                }
              });

              const grouped: Record<string, CalendarEvent[]> = filteredEvents.reduce((acc, event) => {
                const dateKey = event.date.toISOString().split('T')[0];
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(event);
                return acc;
              }, {} as Record<string, CalendarEvent[]>);

              if (filteredEvents.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-[#0A0A0A] border border-dashed border-[#262626] rounded-none mt-4">
                    <div className="w-12 h-12 bg-[#111] rounded-full flex items-center justify-center border border-[#262626]">
                      <Calendar className="w-6 h-6 text-gray-700" />
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-8">
                      {viewMode === 'month' 
                        ? `No hay eventos para ${viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
                        : 'No hay eventos para esta semana'
                      }
                    </p>
                  </div>
                );
              }

              return Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dayEvents]) => (
                  <div key={date} className="relative pl-10 space-y-3">
                    {/* Indicador de Fecha (Burbuja en la línea de tiempo) */}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-none bg-[#111] border border-exec-blue/40 flex flex-col items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.1)] z-10">
                      <span className="text-[9px] font-black text-white leading-none">{new Date(date + 'T12:00:00').getDate()}</span>
                      <span className="text-[5px] font-black text-exec-blue uppercase tracking-tighter">{new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    </div>

                    {dayEvents.map((event: any) => (
                      <div 
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="bg-[#0D0D0D] border border-[#262626] p-3 rounded-none shadow-sm active:bg-[#151515] transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {event.time && (
                                <span className="text-[9px] font-black text-exec-blue bg-exec-blue/5 px-1.5 py-0.5 rounded-none border border-exec-blue/10">
                                  {event.time}
                                </span>
                              )}
                              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-none border ${
                                event.type === 'meeting' ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10' :
                                event.type === 'task' ? 'bg-amber-500/5 text-amber-400 border-amber-500/10' :
                                'bg-exec-blue/5 text-exec-blue border-exec-blue/10'
                              }`}>
                                {event.type}
                              </span>
                            </div>
                            <h3 className="text-[13px] font-bold text-white leading-tight group-active:text-exec-blue transition-colors">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-2 text-[9px] text-gray-500 font-medium italic">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color }}></span>
                              {event.user_name}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                             <div className="p-2 bg-[#151515] rounded-none border border-[#262626] group-active:border-exec-blue/30">
                                {event.type === 'meeting' ? <UsersIcon className="w-3.5 h-3.5 text-indigo-400" /> : <Calendar className="w-3.5 h-3.5 text-amber-400" />}
                             </div>
                          </div>
                        </div>
                        
                        {event.location && (
                          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-widest bg-[#111] p-1.5 rounded-none border border-[#262626]/50">
                            <MapPin className="w-3 h-3 text-exec-blue" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ));
            })()}
          </div>
        )}
      </div>

      {/* Leyenda de usuarios */}
      <div className="bg-[#0A0A0A] rounded-none shadow-card border border-exec-border p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
          <UsersIcon className="w-4 h-4 text-exec-blue" />
          Miembros del Equipo
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from(allUsers.entries()).map(([userId, userInfo]) => (
            <div key={userId} className="flex items-center gap-3 group bg-[#0D0D0D] p-2 rounded-none border border-[#262626]/50 hover:border-exec-blue/30 transition-all">
              <div className="relative shrink-0">
                {userInfo.avatar ? (
                  <img 
                    src={userInfo.avatar} 
                    alt={userInfo.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#262626] shadow-[0_0_10px] transition-all group-hover:scale-110"
                    style={{ borderColor: getUserColor(userId), boxShadow: `0 0 12px ${getUserColor(userId)}40` }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white shadow-[0_0_8px] transition-all group-hover:scale-110 border border-[#262626]"
                    style={{ backgroundColor: getUserColor(userId), boxShadow: `0 0 10px ${getUserColor(userId)}` }}
                  >
                    {userInfo.name.charAt(0)}
                  </div>
                )}
                {/* Glow del color asignado */}
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0A0A0A]"
                  style={{ backgroundColor: getUserColor(userId) }}
                ></div>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors truncate leading-tight">{userInfo.name.split(' ')[0]}</p>
                <p className="text-[9px] text-gray-500 font-medium truncate uppercase tracking-widest leading-none mt-1">Miembro</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>
      )}

      <MeetingCreationEngine 
        isOpen={showEngine}
        onClose={() => setShowEngine(false)}
        onSuccess={handleSuccess}
        initialMode={engineMode}
      />

      {/* Modal Detalle de Evento */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-[#0A0A0A] rounded-none shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col my-8 border border-exec-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-exec-border flex items-start justify-between bg-[#0F0F0F]">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-none flex items-center justify-center text-2xl flex-shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-black border border-gray-800"
                  style={{ borderColor: selectedEvent.color, boxShadow: `0 0 10px ${selectedEvent.color}40` }}
                >
                  <span style={{ color: selectedEvent.color }}>
                    {selectedEvent.type === 'task' ? '📋' : '🎯'}
                  </span>
                </div>
                 <div className="min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white break-words tracking-tight">{selectedEvent.title}</h2>
                    {selectedEvent.collaborators && selectedEvent.collaborators.length > 0 && (
                      <span className="bg-exec-blue/10 text-exec-blue text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border border-exec-blue/20">
                        EQUIPO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedEvent.color }}></span>
                    <span className="text-gray-300 font-medium">Responsable: {selectedEvent.user_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-full transition-colors"
                title="Cerrar (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto bg-[#0A0A0A]">
              <div className="space-y-5">
                <div className="flex items-start gap-3.5 text-gray-300">
                  <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-exec-blue" />
                  <span className="text-sm font-medium">
                    {selectedEvent.date.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {selectedEvent.time && ` • ${selectedEvent.time}`}
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-start gap-3.5 text-gray-300">
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-exec-blue" />
                    <span className="text-sm break-words">{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.location_link && (
                  <div className="flex items-start gap-3.5 text-gray-300">
                    <LinkIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-exec-blue" />
                    <a
                      href={selectedEvent.location_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-exec-blue hover:text-blue-400 hover:underline break-all transition-colors"
                    >
                      {selectedEvent.location_link}
                    </a>
                  </div>
                )}

                {(selectedEvent.status || selectedEvent.priority) && (
                  <div className="flex flex-wrap gap-4 pt-2">
                    {selectedEvent.status && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Estado:</span>
                        <span className={`text-xs px-2.5 py-1 rounded-none font-medium border ${selectedEvent.status === 'Completada' ? 'bg-green-900/20 text-green-400 border-green-900/50' :
                          selectedEvent.status === 'En progreso' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' :
                            'bg-yellow-900/20 text-yellow-400 border-yellow-900/50'
                          }`}>
                          {selectedEvent.status}
                        </span>
                      </div>
                    )}

                    {selectedEvent.priority && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Prioridad:</span>
                        <span className={`text-xs px-2.5 py-1 rounded-none font-medium border ${selectedEvent.priority === 'Urgente' ? 'bg-red-900/20 text-red-400 border-red-900/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]' :
                          selectedEvent.priority === 'Alta' ? 'bg-orange-900/20 text-orange-400 border-orange-900/50' :
                            selectedEvent.priority === 'Media' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' :
                              'bg-gray-800 text-gray-300 border-gray-700'
                          }`}>
                          {selectedEvent.priority}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sección de Equipo para tareas compartidas */}
                {selectedEvent.type === 'task' && (
                  <div className="pt-5 mt-3 border-t border-exec-border">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <UsersIcon className="w-3 h-3 text-exec-blue" />
                      Equipo Asignado
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {/* Dueño principal */}
                      <div className="flex items-center gap-2 bg-[#111] p-2 pr-3 border border-[#222] rounded-none">
                        {allUsers.get(selectedEvent.user_id)?.avatar ? (
                          <img src={allUsers.get(selectedEvent.user_id)?.avatar!} alt="" className="w-6 h-6 rounded-full border border-exec-blue" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-exec-blue flex items-center justify-center text-[10px] font-bold text-white">
                            {selectedEvent.user_name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-white">{selectedEvent.user_name.split(' ')[0]}</span>
                        <span className="text-[8px] text-exec-blue font-black uppercase">DUEÑO</span>
                      </div>

                      {/* Colaboradores */}
                      {selectedEvent.collaborators?.map(collab => (
                        <div key={collab.id} className="flex items-center gap-2 bg-[#0D0D0D] p-2 pr-3 border border-[#222] rounded-none opacity-80 decoration-none">
                          {collab.avatar ? (
                            <img src={collab.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-700" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-gray-700">
                              {collab.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-300">{collab.name.split(' ')[0]}</span>
                          <span className="text-[8px] text-gray-500 font-black uppercase tracking-tighter">COLO</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="pt-5 mt-3 border-t border-exec-border">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Descripción / Agenda</p>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-[#111] p-4 rounded-none border border-[#222]">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
