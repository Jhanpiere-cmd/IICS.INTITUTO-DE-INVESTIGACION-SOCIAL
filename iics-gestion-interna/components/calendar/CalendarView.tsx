import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { TaskDetail } from '../tasks/TaskDetail';
import { CreateTask } from '../tasks/CreateTask';
import { generateMeetingDetails } from '../../lib/ai';
import { Bot, Loader2, Calendar as CalendarIcon, MapPin } from 'lucide-react';

interface DBTask {
  id: string;
  title: string;
  description: string;
  status: 'Pendiente' | 'En progreso' | 'Completada' | 'En espera';
  priority: 'Urgente' | 'Alta' | 'Media' | 'Baja';
  due_date: string | null;
  created_at: string;
  assigned_to: string | null;
  created_by: string | null;
}

export const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [tasks, setTasks] = useState<DBTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DBTask | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [prefillDue, setPrefillDue] = useState<string | undefined>(undefined);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]); // New state for events
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    location_link: '',
  });
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [showTeam, setShowTeam] = useState<boolean>(false);
  const isDirector = currentRole === 'Director';
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [participants, setParticipants] = useState<Array<{ user_id: string; full_name: string; status: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [monthFilter, setMonthFilter] = useState<{ year: number; month: number }>(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });

  // AI Meeting State
  const [showAiMeetingModal, setShowAiMeetingModal] = useState(false);
  const [aiMeetingPrompt, setAiMeetingPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id,title,description,status,priority,due_date,created_at,assigned_to,created_by')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(200);
      if (error) throw error;
      setTasks((data || []) as DBTask[]);

      const { data: mt, error: mErr } = await supabase
        .from('meetings')
        .select('id,title,description,scheduled_at,duration_minutes,location,location_link,created_by')
        .order('scheduled_at', { ascending: true })
        .limit(200);
      if (mErr) throw mErr;
      setMeetings(mt || []);

      // Fetch events
      const { data: ev, error: eErr } = await supabase
        .from('events')
        .select('id,title,description,scheduled_date,start_time,location,event_type')
        .order('scheduled_date', { ascending: true })
        .limit(200);
      if (eErr) throw eErr;
      setEventsData(ev || []);

      // fetch current role once
      if (user?.id && currentRole === null) {
        const { data: ur } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setCurrentRole(ur?.role || null);
        setShowTeam((ur?.role || null) === 'Director');
      }

      // preload all users for inviting participants
      const { data: us } = await supabase.from('profiles').select('id, "fullName"').order('"fullName"');
      setAllUsers((us || []).map((u: any) => ({ id: u.id, full_name: u.fullName })));
    } catch (e) {
      console.error('Error loading calendar tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('calendar-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Handle pre-fill from Orchestrator
  useEffect(() => {
    if (location.state?.action === 'create_meeting' && location.state?.data) {
      const data = location.state.data;
      setMeetingForm({
        title: data.title || '',
        description: data.description || '',
        scheduled_at: data.scheduled_at || '',
        duration_minutes: data.duration_minutes || 60,
        location: data.location || '',
        location_link: data.location_link || ''
      });
      setShowNewMeeting(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const grouped = useMemo(() => {
    type Row = { type: 'task' | 'meeting' | 'event'; item: any; at: string };
    const map = new Map<string, Row[]>();

    // Process Tasks
    for (const t of tasks) {
      const d = t.due_date ? new Date(t.due_date) : null;
      if (!d) continue;
      if (d.getFullYear() !== monthFilter.year || d.getMonth() !== monthFilter.month) continue;
      if (isDirector && !showTeam) {
        if (!(t.assigned_to === user?.id || t.created_by === user?.id)) continue;
      }
      const at = d;
      const key = at ? new Date(at.getFullYear(), at.getMonth(), at.getDate()).toDateString() : 'Sin fecha';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'task', item: t, at: t.due_date || '' });
    }

    // Process Meetings
    for (const m of meetings) {
      const at = new Date(m.scheduled_at);
      if (at.getFullYear() !== monthFilter.year || at.getMonth() !== monthFilter.month) continue;
      const key = new Date(at.getFullYear(), at.getMonth(), at.getDate()).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'meeting', item: m, at: m.scheduled_at });
    }

    // Process Events (NEW)
    for (const e of eventsData) {
      // e.scheduled_date is YYYY-MM-DD string, start_time is HH:MM:SS
      const dtStr = e.scheduled_date + 'T' + (e.start_time || '00:00:00');
      const at = new Date(dtStr);
      if (at.getFullYear() !== monthFilter.year || at.getMonth() !== monthFilter.month) continue;
      const key = new Date(at.getFullYear(), at.getMonth(), at.getDate()).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'event', item: e, at: dtStr });
    }

    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [tasks, meetings, eventsData, showTeam, isDirector, user?.id, monthFilter.year, monthFilter.month]);

  const openAssignForDate = (dateLabel: string) => {
    const dt = new Date(dateLabel);
    const iso = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 10, 0).toISOString();
    setPrefillDue(iso);
    setShowCreateTask(true);
  };

  const handleGenerateMeeting = async () => {
    if (!aiMeetingPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const usersForAi = allUsers.map(u => ({ id: u.id, fullName: u.full_name, role: 'Miembro' }));
      const result = await generateMeetingDetails(aiMeetingPrompt, usersForAi);

      if (result) {
        setMeetingForm({
          title: result.title || '',
          description: result.description || '',
          scheduled_at: result.scheduled_at ? result.scheduled_at.slice(0, 16) : '', // format for datetime-local
          duration_minutes: result.duration_minutes || 60,
          location: result.location || 'Virtual',
          location_link: result.location?.includes('http') ? result.location : '',
        });

        if (result.participantIds && Array.isArray(result.participantIds)) {
          setInviteIds(result.participantIds);
        }

        setShowAiMeetingModal(false);
        setAiMeetingPrompt('');
        setShowNewMeeting(true);
        setToast({ type: 'success', msg: 'Detalles generados con IA' });
      } else {
        setToast({ type: 'error', msg: 'No se pudo generar la reunión. Intenta ser más específico.' });
      }
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', msg: 'Error al generar con IA' });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!meetingForm.title || !meetingForm.scheduled_at) return;
    try {
      if (user?.id) {
        const { data: existsRow } = await supabase.from('profiles').select('id, role').eq('id', user.id).single();
        if (!existsRow) {
          const authUser = await supabase.auth.getUser();
          const fullName = (authUser.data.user?.user_metadata as any)?.full_name || authUser.data.user?.email || 'Usuario';
          await supabase.from('profiles').insert({
            id: user.id,
            email: authUser.data.user?.email || null,
            full_name: fullName,
            role: 'Director',
          });
        }
      }

      const { error } = await supabase
        .from('meetings')
        .insert({
          title: meetingForm.title,
          description: meetingForm.description || null,
          scheduled_at: new Date(meetingForm.scheduled_at).toISOString(),
          duration_minutes: meetingForm.duration_minutes,
          location: meetingForm.location || null,
          location_link: meetingForm.location_link || null,
          created_by: user?.id || null,
        });
      if (error) throw error;
      setShowNewMeeting(false);
      setMeetingForm({ title: '', description: '', scheduled_at: '', duration_minutes: 60, location: '', location_link: '' });
      await load();
      setToast({ type: 'success', msg: 'Reunión creada' });
    } catch (e: any) {
      console.error('Error creating meeting:', e);
      setToast({ type: 'error', msg: `Error al crear reunión: ${e?.message || ''}` });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Calendario Global</h2>
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors" onClick={() => setShowNewMeeting(true)}>Nueva Reunión</button>
        <button
          className="px-3 py-2 bg-purple-600 text-white rounded flex items-center gap-2 hover:bg-purple-700 transition-colors"
          onClick={() => setShowAiMeetingModal(true)}
        >
          <Bot size={18} />
          Reunión con IA
        </button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Cargando eventos...</p>}
      {grouped.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">No hay eventos por ahora.</p>
      )}

      <div className="space-y-6">
        {grouped.map(([dateLabel, items]) => (
          <div key={dateLabel} className="bg-white rounded-lg shadow">
            <div className="px-4 py-2 border-b">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{dateLabel}</p>
                <div className="flex items-center gap-3">
                  {isDirector && (
                    <label className="text-xs text-gray-700 flex items-center gap-1">
                      <input type="checkbox" checked={showTeam} onChange={(e) => setShowTeam(e.currentTarget.checked)} /> Ver equipo
                    </label>
                  )}
                  <button className="text-sm text-indigo-600 underline" onClick={() => openAssignForDate(dateLabel)}>Asignar tarea en esta fecha</button>
                </div>
              </div>
            </div>
            <ul className="divide-y">
              {items.map((row) => {
                if (row.type === 'task') {
                  const t = row.item as DBTask;
                  return (
                    <li key={`task-${t.id}`} className="px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTask(t)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-slate-700">{t.title} <span className="text-xs text-gray-400">(Tarea)</span></p>
                          <p className="text-xs text-muted-foreground">{t.status} • {t.priority}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t.due_date ? new Date(t.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </li>
                  );
                } else if (row.type === 'meeting') {
                  const m = row.item as any;
                  return (
                    <li key={`meeting-${m.id}`} className="px-4 py-3 bg-blue-50 hover:bg-blue-100 cursor-pointer" onClick={async () => {
                      setSelectedMeeting(m);
                      const { data: list } = await supabase
                        .from('meetings_participants')
                        .select('user_id, status, users: user_id (full_name)')
                        .eq('meeting_id', m.id);
                      setParticipants((list || []).map((r: any) => ({ user_id: r.user_id, status: r.status, full_name: r.users?.full_name || '' })));
                    }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-blue-800">Reunión: {m.title}</p>
                          <p className="text-xs text-blue-600">{m.location || (m.location_link ? 'Virtual' : 'Sin ubicación')}</p>
                        </div>
                        <span className="text-xs text-blue-500">
                          {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </li>
                  );
                } else {
                  // Event
                  const e = row.item as any;
                  return (
                    <li key={`event-${e.id}`} className="px-4 py-3 bg-red-50 hover:bg-red-100 cursor-default">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-red-800">Evento: {e.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-800 border border-red-300">
                              {e.event_type}
                            </span>
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <MapPin size={10} />
                              {e.location || 'Sin ubicación'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-red-500 font-medium">
                          {e.start_time ? e.start_time.slice(0, 5) : ''}
                        </span>
                      </div>
                    </li>
                  );
                }
              })}
            </ul>
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskDetail
          task={selectedTask as any}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={load}
        />
      )}

      {showCreateTask && (
        <CreateTask
          onClose={() => { setShowCreateTask(false); setPrefillDue(undefined); }}
          onTaskCreated={load}
          initialDueDate={prefillDue}
        />
      )}

      {showNewMeeting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md p-6 space-y-4 border dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-semibold dark:text-white">Nueva Reunión</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 dark:text-gray-300">Título</label>
                <input className="w-full border dark:border-slate-700 rounded px-3 py-2 dark:bg-slate-800 dark:text-white" value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-gray-300">Fecha y hora</label>
                <input type="datetime-local" className="w-full border dark:border-slate-700 rounded px-3 py-2 dark:bg-slate-800 dark:text-white" value={meetingForm.scheduled_at} onChange={(e) => setMeetingForm({ ...meetingForm, scheduled_at: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-gray-300">Ubicación</label>
                <input className="w-full border dark:border-slate-700 rounded px-3 py-2 dark:bg-slate-800 dark:text-white" value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} placeholder="Ej: Aula 201, Virtual, etc." />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-gray-300">Enlace (opcional)</label>
                <input className="w-full border dark:border-slate-700 rounded px-3 py-2 dark:bg-slate-800 dark:text-white" value={meetingForm.location_link} onChange={(e) => setMeetingForm({ ...meetingForm, location_link: e.target.value })} placeholder="https://meet.google.com/..." />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-gray-300">Descripción</label>
                <textarea className="w-full border dark:border-slate-700 rounded px-3 py-2 dark:bg-slate-800 dark:text-white" rows={3} value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button className="px-3 py-2 border dark:border-slate-700 rounded dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800" onClick={() => setShowNewMeeting(false)}>Cancelar</button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors" onClick={handleCreateMeeting}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-2xl p-6 space-y-4 border dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Reunión: {selectedMeeting.title}</h3>
              <button className="text-sm dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => { setSelectedMeeting(null); setParticipants([]); }}>Cerrar</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">{new Date(selectedMeeting.scheduled_at).toLocaleString()}</p>
                <p className="text-sm dark:text-gray-200"><strong>Ubicación:</strong> {selectedMeeting.location || 'Sin ubicación'}</p>
                {selectedMeeting.location_link && (
                  <p className="text-sm"><strong>Enlace:</strong> <a href={selectedMeeting.location_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">{selectedMeeting.location_link}</a></p>
                )}
                <p className="text-sm whitespace-pre-wrap mt-2 dark:text-gray-300">{selectedMeeting.description || ''}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2 dark:text-white">Participantes</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {participants.map(p => (
                    <li key={p.user_id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 rounded px-3 py-2">
                      <span className="text-sm dark:text-gray-200">{p.full_name}</span>
                      <select
                        className="text-xs border dark:border-slate-600 rounded px-2 py-1 dark:bg-slate-700 dark:text-white"
                        value={p.status}
                        onChange={async (e) => {
                          const next = e.currentTarget.value as 'pendiente' | 'confirmado' | 'declinado';
                          await supabase
                            .from('meetings_participants')
                            .update({ status: next })
                            .eq('meeting_id', selectedMeeting.id)
                            .eq('user_id', p.user_id);
                          setParticipants(prev => prev.map(x => x.user_id === p.user_id ? { ...x, status: next } : x));
                        }}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="declinado">Declinado</option>
                      </select>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <h5 className="font-medium text-sm mb-2 dark:text-white">Invitar más</h5>
                  <div className="border dark:border-slate-700 rounded p-2 max-h-40 overflow-y-auto custom-scrollbar dark:bg-slate-800">
                    {allUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 py-1 text-sm dark:text-gray-300 hover:bg-slate-700/50 rounded px-1">
                        <input type="checkbox" className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700" checked={inviteIds.includes(u.id)} onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setInviteIds(prev => checked ? [...prev, u.id] : prev.filter(id => id !== u.id));
                        }} />
                        <span>{u.full_name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors" onClick={async () => {
                      if (inviteIds.length === 0) return;
                      const rows = inviteIds.map(uid => ({ meeting_id: selectedMeeting.id, user_id: uid, status: 'pendiente' }));
                      const { data: ins, error: insErr } = await supabase.from('meetings_participants').insert(rows).select();
                      if (!insErr) {
                        // Create notifications for invited users
                        const notifRows = rows.map(r => ({
                          user_id: r.user_id,
                          type: 'meeting_invite',
                          title: 'Invitación a reunión',
                          message: selectedMeeting.title,
                          data: { meeting_id: selectedMeeting.id },
                        }));
                        await supabase.from('notifications').insert(notifRows);
                        setToast({ type: 'success', msg: 'Invitaciones enviadas' });
                      } else {
                        setToast({ type: 'error', msg: 'Error al invitar' });
                      }
                      // refresh list
                      const { data: list } = await supabase
                        .from('meetings_participants')
                        .select('user_id, status, users: user_id (full_name)')
                        .eq('meeting_id', selectedMeeting.id);
                      setParticipants((list || []).map((r: any) => ({ user_id: r.user_id, status: r.status, full_name: r.users?.full_name || '' })));
                      setInviteIds([]);
                    }}>Invitar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAiMeetingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-lg p-6 space-y-4 shadow-xl border dark:border-slate-800">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Bot size={24} />
              <h3 className="text-lg font-semibold dark:text-white">Asistente de Reuniones IA</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Describe la reunión que quieres agendar. Menciona el tema, la fecha, hora y participantes.
              <br />
              <span className="text-xs italic text-gray-400 dark:text-gray-500">Ej: "Reunión de coordinación con Edwar mañana a las 10am para revisar el diseño."</span>
            </p>
            <textarea
              className="w-full border dark:border-slate-700 rounded-lg p-3 h-32 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none dark:bg-slate-800 dark:text-white"
              placeholder="Escribe aquí tu solicitud..."
              value={aiMeetingPrompt}
              onChange={(e) => setAiMeetingPrompt(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
                onClick={() => setShowAiMeetingModal(false)}
                disabled={generatingAi}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
                onClick={handleGenerateMeeting}
                disabled={generatingAi || !aiMeetingPrompt.trim()}
              >
                {generatingAi ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Bot size={18} />
                    Generar Detalles
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded text-white shadow ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`} onAnimationEnd={() => setToast(null)}>
          {toast.msg}
        </div>
      )}

      <div className="fixed bottom-4 left-6 bg-white border rounded shadow px-3 py-2 flex items-center gap-2">
        <button className="px-2" onClick={() => setMonthFilter(prev => ({ year: prev.month === 0 ? prev.year - 1 : prev.year, month: prev.month === 0 ? 11 : prev.month - 1 }))}>{'<'}</button>
        <span className="text-sm font-medium">{new Date(monthFilter.year, monthFilter.month).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
        <button className="px-2" onClick={() => setMonthFilter(prev => ({ year: prev.month === 11 ? prev.year + 1 : prev.year, month: prev.month === 11 ? 0 : prev.month + 1 }))}>{'>'}</button>
      </div>
    </div>
  );
}
