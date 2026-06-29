import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../common/Card';
import { Calendar, MapPin, Users, Video, X, Loader2, Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { MeetingCreationEngine } from './MeetingCreationEngine';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string;
  meeting_link: string | null;
  created_by: string | null;
  created_at: string;
  creator?: { full_name: string; avatar_url?: string };
  meeting_type: 'Obligatoria' | 'Por Invitación';
  participants?: Array<{
    user?: { id: string; full_name: string; avatar_url?: string };
  }>;
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  attendance_status?: string;
  attendance_note?: string;
  user?: { full_name: string; email: string; avatar_url?: string };
}

export const MeetingsView: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEngine, setShowEngine] = useState(false);
  const [engineMode, setEngineMode] = useState<'manual' | 'ai'>('manual');
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; full_name: string; email: string; role?: string }>>([]);
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; note: string }>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  const { showToast } = useToast();
  const [isDirector, setIsDirector] = useState(false);

  useEffect(() => {
    load();
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    try {
      // Check if user is Director
      if (user?.id) {
        const { data: userData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setIsDirector(userData?.role === 'Director' || userData?.role === 'Asesor' || userData?.role === 'Secretaria');
      }

      // Load all meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select(`
          *,
          creator:created_by(full_name, avatar_url),
          participants:meeting_participants(
            user:user_id(id, full_name, avatar_url)
          )
        `)
        .order('scheduled_at', { ascending: true });
      if (meetingsError) throw meetingsError;
      setMeetings((meetingsData || []) as unknown as Meeting[]);

      // Load all users for invitations
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');
      setAllUsers((usersData || []) as any);
    } catch (e) {
      console.error('Error loading meetings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const ch = supabase
      .channel('meetings-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meetings' }, (payload) => {
        const m = payload.new as any;
        if (m.created_by !== user?.id) {
          showToast({
            type: 'info',
            title: 'NUEVA REUNIÓN CONVOCADA',
            message: `${m.title || 'Se ha programado una nueva sesión de coordinación estratégica.'}`,
            duration: 8000
          });
        }
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetings' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meetings' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_participants' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, showToast]);

  const handleSuccess = () => {
    load();
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setEngineMode('manual');
    setShowEngine(true);
  };

  const openMeetingDetails = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    const { data } = await supabase
      .from('meeting_participants')
      .select(`id, user_id, status, attendance_status, attendance_note, user:user_id(full_name, email, avatar_url)`)
      .eq('meeting_id', meeting.id);
    const parts = (data || []) as unknown as Participant[];
    setParticipants(parts);
    // Inicializar mapa de asistencia con datos existentes
    const map: Record<string, { status: string; note: string }> = {};
    parts.forEach(p => {
      map[p.id] = { status: p.attendance_status || 'Sin registrar', note: p.attendance_note || '' };
    });
    setAttendanceMap(map);
  };

  const inviteParticipants = async () => {
    if (!selectedMeeting || inviteIds.length === 0) return;

    try {
      const participantRows = inviteIds.map(uid => ({
        meeting_id: selectedMeeting.id,
        user_id: uid,
        status: 'Pendiente'
      }));

      const { error: insErr } = await supabase
        .from('meeting_participants')
        .insert(participantRows);

      if (insErr) throw insErr;

      const notifRows = inviteIds.map(uid => ({
        user_id: uid,
        type: 'MEETING_INVITE',
        title: 'Invitación a reunión',
        message: selectedMeeting.title,
        related_id: selectedMeeting.id,
        read: false
      }));

      await supabase.from('notifications').insert(notifRows);

      showToast({ type: 'success', title: 'INVITACIONES', message: 'Invitaciones enviadas' });
      setInviteIds([]);
      openMeetingDetails(selectedMeeting);
    } catch (error) {
      console.error('Error inviting participants:', error);
      showToast({ type: 'error', title: 'ERROR', message: 'Error al enviar invitaciones' });
    }
  };

  const saveAttendance = async () => {
    if (!selectedMeeting) return;
    setSavingAttendance(true);
    try {
      let anyFailed = false;

      for (const [participantId, att] of Object.entries(attendanceMap)) {
        // Usamos .select() para detectar si RLS bloqueó silenciosamente
        const { data: updated, error } = await supabase
          .from('meeting_participants')
          .update({ attendance_status: att.status, attendance_note: att.note || null })
          .eq('id', participantId)
          .select('id, attendance_status');

        if (error) {
          console.error('Supabase error al guardar asistencia:', participantId, error);
          throw new Error(`Error de base de datos: ${error.message}`);
        }

        // Si no hay filas devueltas, RLS bloqueó el UPDATE silenciosamente
        if (!updated || updated.length === 0) {
          console.warn('RLS o permiso bloqueó el UPDATE para:', participantId);
          anyFailed = true;
        } else {
          console.log('✓ Guardado:', updated[0].id, '→', updated[0].attendance_status);
        }
      }

      if (anyFailed) {
        showToast({
          type: 'error',
          title: 'PERMISOS INSUFICIENTES',
          message: 'Supabase RLS bloqueó el guardado. Ejecuta el script SQL de políticas en Supabase → SQL Editor.'
        });
        return;
      }

      // Recargar para confirmar desde la BD
      await openMeetingDetails(selectedMeeting);
      showToast({ type: 'success', title: 'ASISTENCIA GUARDADA', message: 'El registro ha sido actualizado correctamente.' });

    } catch (e: any) {
      console.error('Error saving attendance:', e);
      showToast({ type: 'error', title: 'ERROR AL GUARDAR', message: e?.message || 'Error desconocido al guardar asistencia.' });
    } finally {
      setSavingAttendance(false);
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm('¿Eliminar esta reunión?')) return;

    try {
      const { error } = await supabase.from('meetings').delete().eq('id', id);

      if (error) {
        console.error('Error al eliminar reunión:', error);

        if (error.code === 'PGRST301' || error.code === '42501') {
          showToast({
            type: 'error',
            title: 'PERMISOS INSUFICIENTES',
            message: 'No tienes permisos para eliminar esta reunión. Solo el creador o directivos pueden hacerlo.'
          });
          return;
        }

        if (error.message.includes('violates foreign key constraint')) {
          showToast({
            type: 'error',
            title: 'CONFLICTO DE DATOS',
            message: 'No se puede eliminar esta reunión porque tiene participantes registrados.'
          });
          return;
        }

        showToast({
          type: 'error',
          title: 'ERROR',
          message: `Error: ${error.message || 'No se pudo eliminar la reunión'}`
        });
        return;
      }

      showToast({ type: 'success', title: 'ELIMINACIÓN', message: 'Reunión eliminada exitosamente' });
      await load();
    } catch (e: any) {
      console.error('Error inesperado al eliminar reunión:', e);
      showToast({ type: 'error', title: 'ERROR INESPERADO', message: 'Error inesperado al eliminar la reunión' });
    }
  };

  return (
    <div className="px-4 pb-4 pt-0 md:pt-4 md:px-6 space-y-6 bg-[#000000] min-h-screen text-white font-sans selection:bg-exec-blue/30">
      {/* ═══ HEADER ═══ */}
      {/* Desktop Header */}
      <div className="hidden md:flex flex-row justify-between items-end gap-4 border-b border-[#262626] pb-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <Users className="w-6 h-6 text-exec-blue" />
            </div>
            <span>Gestión de <span className="text-exec-blue">Reuniones</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Gestión ejecutiva de conferencias y mesas de trabajo
          </p>
        </div>

        {isDirector && (
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setEditingMeeting(null);
                setEngineMode('ai');
                setShowEngine(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-none bg-white hover:bg-gray-100 text-black border border-exec-border transition-all duration-300 text-[11px] font-bold uppercase tracking-widest shadow-lg group"
            >
              <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
              <span>Asistente IA</span>
            </button>
            <button
              onClick={() => {
                setEditingMeeting(null);
                setEngineMode('manual');
                setShowEngine(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-none bg-exec-blue hover:bg-blue-500 text-white transition-all shadow-lg shadow-exec-blue/20 text-[11px] font-bold uppercase tracking-widest"
            >
              <Plus size={16} />
              <span>Nueva Reunión</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Header (Standardized with Tasks) */}
      <section className="block md:hidden flex justify-between items-center bg-[#0A0A0A] border border-[#262626] rounded-none p-4 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-exec-blue" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white uppercase tracking-tight">GESTIÓN <span className="text-exec-blue">REUNIONES</span></h1>
          </div>
        </div>
        
        {isDirector && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditingMeeting(null);
                setEngineMode('ai');
                setShowEngine(true);
              }}
              className="px-3 h-10 bg-white hover:bg-gray-100 text-black rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group"
              title="Asistente IA"
            >
              <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
              <span className="hidden xs:inline">IA</span>
            </button>
            <button 
              onClick={() => {
                setEditingMeeting(null);
                setEngineMode('manual');
                setShowEngine(true);
              }}
              className="w-10 h-10 flex items-center justify-center bg-exec-blue rounded-none text-white shadow-lg active:scale-95 transition-all shadow-exec-blue/20"
              title="Nueva Reunión"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </section>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-exec-blue animate-spin" />
        </div>
      )}

      <MeetingCreationEngine 
        isOpen={showEngine}
        onClose={() => setShowEngine(false)}
        onSuccess={handleSuccess}
        initialMode={engineMode}
        editingMeeting={editingMeeting}
      />

      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="fixed inset-x-0 top-0 bottom-16 sm:static sm:max-w-2xl bg-[#0A0A0A] border-b sm:border border-[#262626] rounded-none shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 sm:p-8 border-b border-[#262626] bg-[#0F0F0F]/50 flex justify-between items-start gap-4 sm:gap-8 relative">

              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-bold text-exec-blue uppercase tracking-[0.3em] bg-exec-blue/10 px-2 py-0.5 rounded-none">Sesión Ejecutiva</span>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest leading-none">ID: {selectedMeeting.id.split('-')[0]}</span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-4 leading-tight">{selectedMeeting.title}</h2>
                <div className="text-gray-400 text-sm leading-relaxed">
                  {selectedMeeting.description}
                </div>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-gray-600 hover:text-white transition-all p-2 rounded-none border border-[#262626] hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-8 pb-28 sm:pb-8 flex-1 overflow-y-auto custom-scrollbar bg-black/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                <div className="flex items-center gap-4 p-4 rounded-none bg-[#0D0D0D] border border-[#262626] group hover:border-gray-700 transition-colors">
                  <div className="p-3 bg-exec-blue/10 rounded-none text-exec-blue">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-1">Cronograma</p>
                    <p className="text-white text-sm font-medium">{new Date(selectedMeeting.scheduled_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-none bg-[#0D0D0D] border border-[#262626] group hover:border-gray-700 transition-colors">
                  <div className="p-3 bg-pink-500/10 rounded-none text-pink-400">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-1">Localización</p>
                    <p className="text-white text-sm font-medium">{selectedMeeting.location}</p>
                  </div>
                </div>
              </div>

              {selectedMeeting.meeting_link && (
                <div className="mb-10 p-5 rounded-none bg-gradient-to-r from-exec-blue/5 to-transparent border border-exec-blue/20 flex items-center justify-between group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 bg-exec-blue/10 rounded-none text-exec-blue animate-pulse">
                      <Video size={20} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[9px] text-exec-blue font-bold uppercase tracking-[0.2em] mb-1">Acceso Remoto Establecido</p>
                      <a
                        href={selectedMeeting.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-exec-blue hover:text-blue-300 hover:underline text-xs truncate block font-medium"
                      >
                        {selectedMeeting.meeting_link}
                      </a>
                    </div>
                  </div>
                  <button className="flex-shrink-0 ml-4 px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-none transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    Entrar
                  </button>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#262626] pb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
                    <Users className="w-4 h-4 text-exec-blue" />
                    Panel de Asistencia 
                    <span className="text-gray-600 bg-gray-800/30 px-2 py-0.5 rounded-none text-[10px]">{participants.length}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-none bg-[#0D0D0D] border border-[#262626] hover:bg-[#111] transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-gradient-to-br from-gray-800 to-black border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 overflow-hidden flex-shrink-0">
                          {p.user?.avatar_url
                            ? <img src={p.user.avatar_url} alt={p.user.full_name} className="w-full h-full object-cover" />
                            : (p.user?.full_name || p.user?.email || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] text-gray-200 font-bold tracking-tight">{p.user?.full_name || 'Miembro'}</p>
                          <p className="text-[9px] text-gray-600 uppercase tracking-tighter">{p.user?.email.split('@')[0]}</p>
                        </div>
                      </div>
                      <span className={`text-[8px] px-2 py-1 rounded-none uppercase tracking-widest font-black border ${p.status === 'confirmado'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : p.status === 'rechazado'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <div className="col-span-2 py-12 text-center bg-[#0D0D0D] border border-dashed border-[#262626] rounded-none">
                       <Users className="w-8 h-8 text-gray-700 mx-auto mb-3 opacity-20" />
                       <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em]">Sin participantes asignados</p>
                    </div>
                  )}
                </div>

                {isDirector && (
                  <div className="pt-8 border-t border-[#262626] mt-4">
                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Módulo de Invitación</h3>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <button
                          className="w-full text-left bg-[#111] border border-[#262626] rounded-none px-4 py-2.5 text-[10px] text-gray-500 font-bold uppercase tracking-widest hover:text-white hover:border-exec-blue transition-all flex justify-between items-center"
                          onClick={() => {
                            const el = document.getElementById('invite-dropdown');
                            if (el) el.classList.toggle('hidden');
                          }}
                        >
                          Seleccionar Panelistas
                          <X size={12} className="rotate-45" />
                        </button>
                        <div id="invite-dropdown" className="hidden absolute bottom-full left-0 right-0 mb-2 bg-[#0A0A0A] border border-[#262626] rounded-none shadow-2xl z-20 max-h-48 overflow-y-auto custom-scrollbar p-1">
                          {allUsers.map(u => (
                            <label key={u.id} className="flex items-center gap-3 p-3 rounded-none hover:bg-white/5 cursor-pointer transition-colors group">
                               <div className="relative flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={inviteIds.includes(u.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setInviteIds([...inviteIds, u.id]);
                                    else setInviteIds(inviteIds.filter(id => id !== u.id));
                                  }}
                                  className="peer appearance-none w-3.5 h-3.5 border border-gray-700 rounded-none bg-black checked:bg-exec-blue checked:border-exec-blue transition-all"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 text-white text-[8px]">✓</div>
                              </div>
                              <div className="text-left">
                                <p className="text-[11px] text-gray-400 group-hover:text-white font-bold tracking-tight">{u.full_name}</p>
                                <p className="text-[9px] text-gray-600 uppercase tracking-tighter">{u.email.split('@')[0]}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={inviteParticipants}
                        disabled={inviteIds.length === 0}
                        className="px-6 py-2.5 bg-exec-blue text-white rounded-none hover:bg-blue-600 disabled:opacity-20 disabled:grayscale transition-all text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      >
                        Enviar ({inviteIds.length})
                      </button>
                    </div>
                  </div>
                )}

                {/* ── PASE DE LISTA ── Solo el creador, solo después de que pase la hora */}
                {selectedMeeting.created_by === user?.id && new Date(selectedMeeting.scheduled_at) < new Date() && participants.length > 0 && (
                  <div className="pt-8 border-t border-[#262626] mt-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[9px] font-black text-exec-blue uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">fact_check</span>
                        Pase de Lista — Asistencia Real
                      </h3>
                      <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                        <span className="text-green-400">{Object.values(attendanceMap).filter(a => a.status === 'Asistió').length} Asistieron</span>
                        <span className="text-red-400">{Object.values(attendanceMap).filter(a => a.status === 'Ausente').length} Ausentes</span>
                        <span className="text-yellow-400">{Object.values(attendanceMap).filter(a => a.status === 'Tardanza').length} Tardanza</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {participants.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-[#0D0D0D] border border-[#262626] hover:border-gray-700 transition-colors">
                          <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-black border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0 overflow-hidden">
                            {p.user?.avatar_url
                              ? <img src={p.user.avatar_url} alt={p.user.full_name} className="w-full h-full object-cover" />
                              : (p.user?.full_name || '?').charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-200 font-bold tracking-tight truncate">{p.user?.full_name || 'Miembro'}</p>
                          </div>
                          <select
                            value={attendanceMap[p.id]?.status || 'Sin registrar'}
                            onChange={(e) => setAttendanceMap(prev => ({
                              ...prev,
                              [p.id]: { status: e.target.value, note: prev[p.id]?.note || '' }
                            }))}
                            className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 outline-none cursor-pointer border transition-all"
                            style={{
                              borderColor: attendanceMap[p.id]?.status === 'Asistió' ? 'rgba(34,197,94,0.5)' :
                                           attendanceMap[p.id]?.status === 'Ausente' ? 'rgba(239,68,68,0.5)' :
                                           attendanceMap[p.id]?.status === 'Tardanza' ? 'rgba(234,179,8,0.5)' : '#262626',
                              color: attendanceMap[p.id]?.status === 'Asistió' ? '#4ade80' :
                                     attendanceMap[p.id]?.status === 'Ausente' ? '#f87171' :
                                     attendanceMap[p.id]?.status === 'Tardanza' ? '#fbbf24' : '#6b7280',
                              backgroundColor: '#111',
                            }}
                          >
                            <option value="Sin registrar">— Sin registrar</option>
                            <option value="Asistió">✓ Asistió</option>
                            <option value="Ausente">✗ Ausente</option>
                            <option value="Tardanza">⚠ Tardanza</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={saveAttendance}
                      disabled={savingAttendance}
                      className="w-full py-2.5 bg-exec-blue hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    >
                      {savingAttendance ? 'Guardando...' : '💾  Guardar Registro de Asistencia'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Meetings List - Responsive Box Isolation */}
      <div className="space-y-6">
        {/* DESKTOP VIEW: 4 Columns (Stitch Executive) */}
        <div className="hidden md:grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {meetings.map(m => (
            <div
              key={m.id}
              className="group relative bg-[#0A0A0A] border border-[#262626] rounded-none p-7 cursor-pointer hover:border-exec-blue hover:shadow-[0_0_30px_rgba(59,130,246,0.08)] transition-all duration-500 flex flex-col h-full overflow-hidden"
              onClick={() => openMeetingDetails(m)}
            >
              {/* Hover Accent Bar */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-exec-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-[17px] font-bold text-white group-hover:text-exec-blue transition-colors line-clamp-2 leading-tight tracking-tight uppercase">
                    {m.title}
                  </h3>
                  {m.meeting_type === 'Obligatoria' && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-none bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tracking-widest uppercase ml-3">
                      Oblig.
                    </span>
                  )}
                </div>

                <div className="mb-8">
                  <p className="text-[13px] text-gray-500 line-clamp-3 leading-relaxed font-medium">
                    {m.description || 'Sin agenda definida.'}
                  </p>
                </div>

                <div className="mt-auto space-y-3 pt-6 border-t border-[#1a1a1a]">
                  {/* Avatares de participantes */}
                  {m.participants && m.participants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {m.participants.slice(0, 4).map((p, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border border-[#0A0A0A] overflow-hidden flex items-center justify-center text-[8px] font-black text-gray-300 bg-gradient-to-br from-gray-700 to-gray-900 flex-shrink-0"
                            title={p.user?.full_name || ''}
                          >
                            {p.user?.avatar_url
                              ? <img src={p.user.avatar_url} alt={p.user.full_name} className="w-full h-full object-cover" />
                              : (p.user?.full_name || '?').charAt(0).toUpperCase()
                            }
                          </div>
                        ))}
                        {m.participants.length > 4 && (
                          <div className="w-6 h-6 rounded-full border border-[#0A0A0A] bg-exec-blue/20 flex items-center justify-center text-[8px] font-black text-exec-blue flex-shrink-0">
                            +{m.participants.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{m.participants.length} participante{m.participants.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 font-bold uppercase tracking-widest group-hover:text-gray-200 transition-colors">
                      <Calendar className="w-3.5 h-3.5 text-exec-blue" />
                      <span>{new Date(m.scheduled_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} • {new Date(m.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 font-bold uppercase tracking-widest group-hover:text-gray-200 transition-colors max-w-[120px]">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" />
                      <span className="truncate">{m.location}</span>
                    </div>
                  </div>
                </div>

                {isDirector && (
                  <div className="absolute bottom-5 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(m);
                      }}
                      className="p-2 text-gray-600 hover:text-white hover:bg-white/5 rounded-none transition-colors border border-transparent hover:border-[#262626]"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMeeting(m.id);
                      }}
                      className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/5 rounded-none transition-colors border border-transparent hover:border-[#262626]"
                      title="Eliminar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* MOBILE VIEW: Slim List 1x1 (More compact for ephemeral entries) */}
        <div className="grid md:hidden grid-cols-1 gap-2 pb-24">
          {meetings.map(m => (
            <div
              key={m.id}
              className="group relative bg-[#0A0A0A] border border-[#262626] rounded-none p-3 cursor-pointer overflow-hidden flex items-center justify-between active:scale-[0.98] transition-all"
              onClick={() => openMeetingDetails(m)}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-none bg-[#111] border border-[#262626] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-exec-blue" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[11px] font-bold text-white leading-tight tracking-tight uppercase truncate">
                    {m.title}
                  </h3>
                  <p className="text-[8px] text-gray-600 uppercase font-bold tracking-widest mt-0.5 truncate">
                    {m.meeting_type}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 ml-4 gap-1.5">
                <div className="flex items-center gap-1 text-[9px] text-exec-blue font-black uppercase tracking-tighter">
                  <span>{new Date(m.scheduled_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                  <span className="text-gray-700">•</span>
                  <span>{new Date(m.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                </div>
                {m.participants && m.participants.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {m.participants.slice(0, 3).map((p, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border border-[#0A0A0A] overflow-hidden flex items-center justify-center text-[7px] font-black text-gray-300 bg-gradient-to-br from-gray-700 to-gray-900 flex-shrink-0">
                        {p.user?.avatar_url
                          ? <img src={p.user.avatar_url} alt={p.user.full_name} className="w-full h-full object-cover" />
                          : (p.user?.full_name || '?').charAt(0).toUpperCase()
                        }
                      </div>
                    ))}
                    {m.participants.length > 3 && (
                      <div className="w-5 h-5 rounded-full border border-[#0A0A0A] bg-exec-blue/20 flex items-center justify-center text-[7px] font-black text-exec-blue flex-shrink-0">
                        +{m.participants.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {meetings.length === 0 && !loading && (
          <div className="py-24 text-center border border-dashed border-[#262626] rounded-none bg-[#050505] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-none bg-[#0A0A0A] border border-[#262626] flex items-center justify-center mb-6 text-gray-800">
               <Calendar size={32} />
            </div>
            <h3 className="text-[14px] font-bold text-gray-400 uppercase tracking-[0.3em]">Módulo Limpio</h3>
            <p className="text-gray-700 mt-2 text-[10px] font-bold uppercase tracking-widest max-w-xs px-6">No se registran sesiones ejecutivas programadas en el periodo actual.</p>
          </div>
        )}
      </div>
    </div>
  );
};
