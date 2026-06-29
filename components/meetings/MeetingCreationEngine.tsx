import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/ToastContext';
import { generateMeetingDetails, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Video, 
  X, 
  Loader2, 
  Plus, 
  Bot 
} from 'lucide-react';

interface MeetingCreationEngineProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingMeeting?: any; // For edit mode
  initialMode?: 'manual' | 'ai';
}

export const MeetingCreationEngine: React.FC<MeetingCreationEngineProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingMeeting,
  initialMode = 'manual'
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState<'manual' | 'ai'>(initialMode);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // UI States
  const [generatingAi, setGeneratingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    location: 'Virtual',
    meeting_link: '',
    meeting_type: 'Por Invitación' as 'Obligatoria' | 'Por Invitación',
  });

  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [aiMeetingPrompt, setAiMeetingPrompt] = useState('');
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

  // Initialize form if editing
  useEffect(() => {
    if (editingMeeting) {
      setForm({
        title: editingMeeting.title || '',
        description: editingMeeting.description || '',
        scheduled_at: editingMeeting.scheduled_at?.slice(0, 16) || '',
        location: editingMeeting.location || 'Virtual',
        meeting_link: editingMeeting.meeting_link || '',
        meeting_type: editingMeeting.meeting_type || 'Por Invitación',
      });
      setCurrentView('manual');
    } else {
      setForm({
        title: '',
        description: '',
        scheduled_at: '',
        location: 'Virtual',
        meeting_link: '',
        meeting_type: 'Por Invitación',
      });
      setCurrentView(initialMode);
    }
  }, [editingMeeting, initialMode, isOpen]);

  // Load users for invites/AI
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, "fullName", email, role, "avatarUrl"')
        .order('"fullName"');
      if (error) throw error;
      
      const mappedData = (data || []).map((u: any) => ({
        id: u.id,
        full_name: u.fullName || 'Sin nombre',
        email: u.email,
        role: u.role,
        avatar_url: u.avatarUrl
      }));
      setAllUsers(mappedData);
    } catch (e) {
      console.error('Error loading users for meeting engine:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleGenerateMeeting = async () => {
    if (!aiMeetingPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const usersForAi = allUsers.map(u => ({ id: u.id, fullName: u.full_name, role: u.role || 'Miembro' }));
      const result = await generateMeetingDetails(aiMeetingPrompt, usersForAi, aiConfig);

      if (result) {
        setForm({
          title: result.title || '',
          description: result.description || '',
          scheduled_at: result.scheduled_at ? result.scheduled_at.slice(0, 16) : '',
          location: result.location || 'Virtual',
          meeting_link: result.location?.includes('http') ? result.location : '',
          meeting_type: 'Por Invitación',
        });

        if (result.participantIds && Array.isArray(result.participantIds)) {
          setInviteIds(result.participantIds);
        }

        setCurrentView('manual');
        setAiMeetingPrompt('');
        showToast({ type: 'success', title: 'IA GENERATIVA', message: 'Detalles generados con IA' });
      } else {
        showToast({ type: 'error', title: 'IA ERROR', message: 'No se pudo generar la reunión. Intenta ser más específico.' });
      }
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', title: 'ERROR', message: 'Error al generar con IA' });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.scheduled_at) {
      showToast({ type: 'error', title: 'DATOS FALTANTES', message: 'Título y fecha son obligatorios' });
      return;
    }
    if (!form.location.trim()) {
      showToast({ type: 'error', title: 'DATOS FALTANTES', message: 'Ubicación es obligatoria' });
      return;
    }

    setIsSaving(true);
    try {
      let meetingId = editingMeeting?.id;

      if (meetingId) {
        // Update
        const { error } = await supabase
          .from('meetings')
          .update({
            title: form.title,
            description: form.description || 'Sin descripción',
            scheduled_at: new Date(form.scheduled_at).toISOString(),
            location: form.location,
            meeting_link: form.meeting_link || null,
            meeting_type: form.meeting_type
          })
          .eq('id', meetingId);

        if (error) throw error;
        showToast({ type: 'success', title: 'ACTUALIZACIÓN', message: 'Reunión actualizada exitosamente' });
      } else {
        // Insert
        const { data, error } = await supabase
          .from('meetings')
          .insert({
            title: form.title,
            description: form.description || 'Sin descripción',
            scheduled_at: new Date(form.scheduled_at).toISOString(),
            duration: 60,
            location: form.location,
            meeting_link: form.meeting_link || null,
            created_by: user?.id,
            meeting_type: form.meeting_type,
          })
          .select();

        if (error) throw error;
        if (data && data[0]) meetingId = data[0].id;

        showToast({ type: 'success', title: 'PUBLICACIÓN', message: 'Reunión creada exitosamente' });
      }

      // Handle invitations for new or explicit invites
      if (meetingId && inviteIds.length > 0) {
        const participantRows = inviteIds.map(uid => ({
          meeting_id: meetingId,
          user_id: uid,
          status: form.meeting_type === 'Obligatoria' ? 'Confirmado' : 'Pendiente'
        }));
        
        // Use upsert or unique check if needed, but for simple creation:
        await supabase.from('meeting_participants').insert(participantRows);

        // Notify if not confirmed
        if (form.meeting_type !== 'Obligatoria') {
          const notifRows = inviteIds.map(uid => ({
            user_id: uid,
            type: 'MEETING_INVITE',
            title: 'Invitación a reunión',
            message: form.title,
            related_id: meetingId,
            read: false
          }));
          await supabase.from('notifications').insert(notifRows);
        }
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Error saving meeting:', e);
      showToast({ type: 'error', title: 'ERROR DE GUARDADO', message: `Error: ${e?.message || 'No se pudo guardar la reunión'}` });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#262626] rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header con Switch de Modos */}
        <div className="p-6 border-b border-[#262626] bg-[#0F0F0F] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {editingMeeting ? 'Editar Reunión' : (currentView === 'ai' ? 'Asistente de IA' : 'Nueva Reunión')}
            </h2>
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mt-1">SGR-ACS Executive Engine</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-[#222] transition-colors rounded-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
          {currentView === 'ai' ? (
            /* VISTA IA */
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-gradient-to-br from-exec-blue/10 to-transparent p-5 border border-exec-blue/20 mb-2">
                <div className="flex items-center gap-3 text-exec-blue mb-3">
                  <span className="material-symbols-outlined notranslate text-[24px]" translate="no">smart_toy</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">IA Generativa Stitch</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Describe los objetivos de la reunión y la IA se encargará de estructurar la agenda, el cronograma y sugerir panelistas.
                </p>
              </div>

              <div className="space-y-4">
                <textarea
                  className="w-full bg-black border border-[#262626] rounded-none p-4 h-40 focus:border-exec-blue/50 outline-none resize-none text-xs text-white placeholder-gray-700 transition-all font-medium"
                  placeholder="Ej: 'Planificar mesa de trabajo para el lunes a las 10am sobre el despliegue del nuevo CRM. Invitar a TI y Ventas...'"
                  value={aiMeetingPrompt}
                  onChange={(e) => setAiMeetingPrompt(e.target.value)}
                />
                
                <AIEngineSelector 
                  config={aiConfig} 
                  onConfigChange={setAiConfig} 
                />

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setCurrentView('manual')}
                    className="flex-1 px-4 py-3 border border-[#262626] text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-all text-[10px] font-bold uppercase tracking-widest rounded-none"
                  >
                    Modo Manual
                  </button>
                  <button
                    onClick={handleGenerateMeeting}
                    disabled={generatingAi || !aiMeetingPrompt.trim()}
                    className="flex-[2] px-4 py-3 bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:grayscale transition-all text-[10px] font-bold uppercase tracking-widest rounded-none flex items-center justify-center gap-2"
                  >
                    {generatingAi ? (
                      <Loader2 size={14} className="animate-spin text-exec-blue" />
                    ) : (
                      <span className="material-symbols-outlined notranslate text-[18px] text-exec-blue" translate="no">smart_toy</span>
                    )}
                    {generatingAi ? 'Analizando...' : 'Generar Estructura'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA MANUAL (FORMULARIO) */
            <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
              {/* Acceso y Tipo */}
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Configuración de Acceso</label>
                <div className="relative">
                  <select
                    className="w-full bg-[#111] border border-[#262626] rounded-none px-4 py-3 text-xs text-white focus:border-exec-blue/30 outline-none appearance-none transition-all cursor-pointer"
                    value={form.meeting_type}
                    onChange={(e) => setForm({ ...form, meeting_type: e.target.value as any })}
                  >
                    <option value="Por Invitación">Por Invitación (Privada)</option>
                    <option value="Obligatoria">Obligatoria (General)</option>
                  </select>
                  <Users className="absolute right-4 top-3.5 text-gray-600 pointer-events-none" size={14} />
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Identificación del Evento</label>
                <input
                  className="w-full bg-[#111] border border-[#262626] rounded-none px-4 py-3 text-xs text-white placeholder-gray-700 focus:border-exec-blue/30 outline-none transition-all"
                  placeholder="Título de la reunión ejecutiva"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* Fecha y Lugar */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Cronograma</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#111] border border-[#262626] rounded-none px-3 py-3 text-xs text-white focus:border-exec-blue/30 outline-none transition-all [color-scheme:dark]"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Localización</label>
                  <input
                    className="w-full bg-[#111] border border-[#262626] rounded-none px-3 py-3 text-xs text-white placeholder-gray-700 focus:border-exec-blue/30 outline-none transition-all"
                    placeholder="Sede / Link"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Agenda Detallada</label>
                <textarea
                  className="w-full bg-[#111] border border-[#262626] rounded-none px-4 py-3 text-xs text-white placeholder-gray-700 focus:border-exec-blue/30 outline-none transition-all resize-none min-h-[100px]"
                  placeholder="Puntos clave a tratar en la sesión..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Invitaciones (Solo visible si no es Obligatoria o si estamos editando y queremos añadir más) */}
              {form.meeting_type === 'Por Invitación' && (
                <div className="pt-2">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Panel de Invitados ({inviteIds.length})</label>
                  <div className="bg-[#050505] border border-[#1a1a1a] rounded-none max-h-40 overflow-y-auto custom-scrollbar">
                    {allUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-[#1a1a1a]/50 last:border-0 group">
                        <input
                          type="checkbox"
                          checked={inviteIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setInviteIds([...inviteIds, u.id]);
                            else setInviteIds(inviteIds.filter(id => id !== u.id));
                          }}
                          className="w-4 h-4 bg-black border-[#262626] text-exec-blue focus:ring-exec-blue rounded-none"
                        />
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br from-gray-700 to-gray-900 border border-[#333]">
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                            : (u.full_name || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-gray-400 group-hover:text-white truncate">{u.full_name}</p>
                          <p className="text-[9px] text-gray-600 uppercase tracking-tighter truncate">{u.role || 'Miembro'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-[#262626]">
                {!editingMeeting && (
                  <button
                    onClick={() => setCurrentView('ai')}
                    className="px-4 py-3 border border-[#262626] text-exec-blue hover:bg-exec-blue/5 transition-all text-[10px] font-bold uppercase tracking-widest rounded-none flex items-center gap-2"
                  >
                    <Bot size={14} />
                    Usar IA
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-white text-black hover:bg-gray-200 transition-all text-[10px] font-bold uppercase tracking-widest rounded-none shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {editingMeeting ? 'Confirmar Edición' : 'Publicar Reunión'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
