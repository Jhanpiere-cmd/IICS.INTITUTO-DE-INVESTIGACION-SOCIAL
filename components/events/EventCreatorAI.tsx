import React, { useState, useEffect } from 'react';
import { X, Sparkles, Calendar, Clock, MapPin, DollarSign, Loader2, AlertCircle, CheckCircle, Image as ImageIcon, Upload, Type, Tag, Wand2, Globe, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateEventDetails, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { useAuth } from '../../contexts/AuthContext';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { useToast } from '../ui/ToastContext';
import { Plus } from 'lucide-react';

interface EventCreatorAIProps {
    onClose: () => void;
    onSuccess: () => void;
    mode?: 'ai' | 'manual';
    eventToEdit?: {
        id: string;
        title: string;
        description: string;
        event_type: string;
        scheduled_date: string;
        start_time: string;
        end_time: string;
        location: string;
        is_online: boolean;
        budget_estimated: number;
        status?: string;
        cover_image_url?: string;
        is_paid?: boolean;
        cost?: number;
    } | null;
}

interface EventFormData {
    title: string;
    description: string;
    event_type: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location: string;
    is_online: boolean;
    budget_estimated: number;
    resources_needed: string[];
    participant_categories: string[];
    cover_image_url?: string;
    organizer_type: 'acs' | 'colegio_sociologo_unidad' | 'revista_la_colmena';
    meeting_url?: string;
    instructor_name?: string;
    instructor_role?: string;
}

const EVENT_TYPES = [
    { value: 'webinar', label: 'Webinar / Charla Virtual' },
    { value: 'conversatorio', label: 'Conversatorio' },
    { value: 'taller', label: 'Taller Práctico' },
    { value: 'feria', label: 'Feria Universitaria' },
    { value: 'visita_aula', label: 'Visita a Aula' },
    { value: 'pollada', label: 'Actividad de Recaudación (Pollada)' },
    { value: 'curso_extracurricular', label: 'Curso Extracurricular' },
    { value: 'transmision', label: 'Transmisión Radio/TV' },
    { value: 'reunion', label: 'Reunión de Coordinación' },
    { value: 'ceremonia', label: 'Ceremonia / Protocolar' },
    { value: 'otro', label: 'Otro' },
];

function TimePickerSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const timeValue = value || '09:00:00';
    const [h24, m] = timeValue.split(':');
    const hour24 = parseInt(h24);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;

    const [localH, setLocalH] = useState(hour12.toString().padStart(2, '0'));
    const [localM, setLocalM] = useState(m.padStart(2, '0'));

    // Sync local state when external value changes (but not while focused to avoid jumps)
    useEffect(() => {
        setLocalH(hour12.toString().padStart(2, '0'));
        setLocalM(m.padStart(2, '0'));
    }, [value]);

    const syncChanges = (h: string, min: string, p: string) => {
        let hNum = parseInt(h) || 12;
        if (hNum > 12) hNum = 12;
        if (hNum === 0) hNum = 12;

        let mNum = parseInt(min) || 0;
        if (mNum > 59) mNum = 59;

        let finalH24 = hNum;
        if (p === 'PM' && hNum < 12) finalH24 += 12;
        if (p === 'AM' && hNum === 12) finalH24 = 0;

        const formatted = `${finalH24.toString().padStart(2, '0')}:${mNum.toString().padStart(2, '0')}:00`;
        onChange(formatted);
    };

    return (
        <div className="flex items-center gap-0.5 bg-[#0D0D0D] border border-exec-border focus-within:border-exec-blue px-1 py-1.5 transition-all group min-w-[82px]">
            <input 
                type="text"
                value={localH}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(-2);
                    setLocalH(val);
                    if (val.length === 2) syncChanges(val, localM, period);
                }}
                onBlur={() => syncChanges(localH, localM, period)}
                className="bg-transparent text-[11px] text-white w-5 text-center focus:outline-none font-mono selection:bg-exec-blue/30"
                maxLength={2}
            />
            <span className="text-gray-600 text-[10px] font-bold">:</span>
            <input 
                type="text"
                value={localM}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(-2);
                    setLocalM(val);
                    if (val.length === 2) syncChanges(localH, val, period);
                }}
                onBlur={() => syncChanges(localH, localM, period)}
                className="bg-transparent text-sm text-white w-6 text-center focus:outline-none font-mono selection:bg-exec-blue/30"
                maxLength={2}
            />
            <div className="flex flex-col ml-0.5 border-l border-gray-800 pl-1">
                <button 
                    type="button"
                    onClick={() => {
                        const newP = period === 'AM' ? 'PM' : 'AM';
                        syncChanges(localH, localM, newP);
                    }}
                    className="text-[8px] font-black text-exec-blue hover:text-white transition-colors uppercase tracking-tighter"
                >
                    {period}
                </button>
            </div>
        </div>
    );
}

export function EventCreatorAI({ onClose, onSuccess, mode = 'ai', eventToEdit = null }: EventCreatorAIProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [currentMode, setCurrentMode] = useState<'ai' | 'manual'>(mode);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    // Cover Image State
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(eventToEdit?.cover_image_url || null);

    const isEditMode = eventToEdit !== null;

    // Multi-session State
    const [isMultiSession, setIsMultiSession] = useState(eventToEdit?.is_multisession || false);
    const [sessions, setSessions] = useState<{ date: string; start: string; end: string; title: string }[]>([]);

    useEffect(() => {
        if (isEditMode && eventToEdit?.id) {
            loadSessions();
        }
    }, [isEditMode, eventToEdit?.id]);

    async function loadSessions() {
        if (!eventToEdit?.id) return;
        const { data, error } = await supabase
            .from('event_sessions')
            .select('*')
            .eq('event_id', eventToEdit.id)
            .order('order_index');
        
        if (data && data.length > 0) {
            setSessions(data.map(s => ({
                date: s.session_date,
                start: s.start_time,
                end: s.end_time,
                title: s.title
            })));
        }
    }

    const [formData, setFormData] = useState<EventFormData>({
        title: eventToEdit?.title || '',
        description: eventToEdit?.description || '',
        event_type: eventToEdit?.event_type || '',
        scheduled_date: eventToEdit?.scheduled_date || '',
        start_time: eventToEdit?.start_time || '09:00:00',
        end_time: eventToEdit?.end_time || '11:00:00',
        location: eventToEdit?.location || '',
        is_online: eventToEdit?.is_online || false,
        budget_estimated: eventToEdit?.budget_estimated || 0,
        resources_needed: [],
        participant_categories: [],
        cover_image_url: eventToEdit?.cover_image_url || '',
        is_paid: eventToEdit?.is_paid || false,
        cost: eventToEdit?.cost || 0,
        organizer_type: (eventToEdit as any)?.organizer_type || 'acs',
        meeting_url: (eventToEdit as any)?.meeting_url || '',
        instructor_name: (eventToEdit as any)?.instructor_name || '',
        instructor_role: (eventToEdit as any)?.instructor_role || ''
    });

    const addSession = () => {
        setSessions([...sessions, { date: '', start: '09:00', end: '11:00', title: `Sesión ${sessions.length + 1}` }]);
    };

    const removeSession = (index: number) => {
        setSessions(sessions.filter((_, i) => i !== index));
    };

    const updateSession = (index: number, field: string, value: string) => {
        const newSessions = [...sessions];
        newSessions[index] = { ...newSessions[index], [field]: value };
        setSessions(newSessions);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverImage(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;

        setIsLoading(true);
        setError('');
        try {
            const result = await generateEventDetails(aiPrompt, aiConfig);
            if (result) {
                setFormData({
                    title: result.title || '',
                    description: result.description || '',
                    event_type: result.event_type || 'otro',
                    scheduled_date: result.scheduled_date || new Date().toISOString().split('T')[0],
                    start_time: result.start_time || '09:00',
                    end_time: result.end_time || '11:00',
                    location: result.location || '',
                    is_online: result.is_online || false,
                    budget_estimated: result.budget_estimated || 0,
                    resources_needed: result.resources_needed || [],
                    participant_categories: result.participant_categories || [],
                    meeting_url: result.meeting_url || ''
                });
                setCurrentMode('manual');
            } else {
                setError("No se pudo generar la información. Por favor intenta con más detalles.");
            }
        } catch (err) {
            console.error(err);
            setError("Error al conectar con el asistente. Intenta nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const [registerExpense, setRegisterExpense] = useState(false);
    const [financialActivities, setFinancialActivities] = useState<any[]>([]);

    React.useEffect(() => {
        loadFinancialActivities();
    }, []);

    async function loadFinancialActivities() {
        const { data } = await supabase.from('financial_activities').select('id, title').eq('status', 'active');
        if (data) setFinancialActivities(data);
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        setError('');

        try {
            // Validate required fields
            if (!isMultiSession && (!formData.start_time || !formData.end_time)) {
                showToast({ type: 'error', title: 'DATOS_INCOMPLETOS', message: 'Por favor, ingresa la hora de inicio y fin del evento.' });
                setIsLoading(false);
                return;
            }

            if (isMultiSession && sessions.length === 0) {
                showToast({ type: 'error', title: 'DATOS_INCOMPLETOS', message: 'Por favor, agrega al menos una sesión para el evento multi-sesión.' });
                setIsLoading(false);
                return;
            }

            if (isMultiSession) {
                // Validate sessions
                const invalidSession = sessions.find(s => !s.date || !s.start || !s.end);
                if (invalidSession) {
                    showToast({ type: 'error', title: 'DATOS_INCOMPLETOS', message: 'Por favor, completa la fecha y hora de todas las sesiones.' });
                    setIsLoading(false);
                    return;
                }
            }


            let coverUrl = formData.cover_image_url;

            // 0. Upload Cover Image if exists
            if (coverImage) {
                const fileExt = coverImage.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('event-covers')
                    .upload(fileName, coverImage);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('event-covers')
                    .getPublicUrl(fileName);

                coverUrl = publicUrl;
            }

            // Determine main date/time from sessions if multi-session
            const mainScheduledDate = isMultiSession && sessions.length > 0 ? sessions[0].date : formData.scheduled_date;
            const mainStartTime = isMultiSession && sessions.length > 0 ? sessions[0].start : formData.start_time;
            const mainEndTime = isMultiSession && sessions.length > 0 ? sessions[0].end : formData.end_time;


            if (isEditMode && eventToEdit) {
                // SAFEGUARD: Si el evento es en el futuro, su estado no puede ser "completado".
                // Esto evita el bug donde un evento futuro queda marcado como finalizado.
                const eventStartDT = new Date(`${mainScheduledDate}T${mainStartTime || '00:00'}`);
                const isEventInFuture = eventStartDT.getTime() > new Date().getTime();
                const currentStatusIsFinished = ['completado', 'finalizado', 'completed', 'finished'].includes((eventToEdit.status || '').toLowerCase());
                const correctedStatus = (isEventInFuture && currentStatusIsFinished) ? 'planificado' : undefined;

                // UPDATE mode
                const updatePayload: any = {
                    title: formData.title,
                    description: formData.description,
                    event_type: formData.event_type,
                    scheduled_date: mainScheduledDate,
                    start_time: mainStartTime,
                    end_time: mainEndTime,
                    location: formData.location,
                    is_online: formData.is_online,
                    budget_estimated: formData.budget_estimated,
                    cover_image_url: coverUrl,
                    is_paid: formData.is_paid,
                    cost: formData.cost,
                    is_multisession: isMultiSession,
                    organizer_type: formData.organizer_type,
                    meeting_url: formData.meeting_url,
                    instructor_name: formData.instructor_name,
                    instructor_role: formData.instructor_role
                };
                if (correctedStatus) {
                    updatePayload.status = correctedStatus;
                    console.warn(`⚠️ Auto-corrected event status from '${eventToEdit.status}' to '${correctedStatus}' because event is in the future.`);
                }

                const { error: updateError } = await supabase
                    .from('events')
                    .update(updatePayload)
                    .eq('id', eventToEdit.id);

                if (updateError) throw updateError;

                // Handle sessions update logic
                if (isMultiSession) {
                    await supabase.from('event_sessions').delete().eq('event_id', eventToEdit.id);
                    const sessionInserts = sessions.map((s, idx) => ({
                        event_id: eventToEdit.id,
                        session_date: s.date,
                        start_time: s.start,
                        end_time: s.end,
                        title: s.title || `Sesión ${idx + 1}`,
                        order_index: idx + 1
                    }));
                    const { error: sessionError } = await supabase.from('event_sessions').insert(sessionInserts);
                    if (sessionError) console.error('Error updating sessions:', sessionError);
                }

                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1000);
            } else {
                // CREATE mode
                const eventPayload = {
                    title: formData.title,
                    description: formData.description,
                    event_type: formData.event_type,
                    scheduled_date: mainScheduledDate,
                    start_time: mainStartTime,
                    end_time: mainEndTime,
                    location: formData.location,
                    is_online: formData.is_online,
                    budget_estimated: Number(formData.budget_estimated) || 0,
                    budget_actual: registerExpense ? (Number(formData.budget_estimated) || 0) : 0,
                    cover_image_url: coverUrl,
                    status: 'planificado',
                    created_by: user.id,
                    is_paid: formData.is_paid,
                    cost: formData.is_paid ? (Number(formData.cost) || 0) : 0,
                    is_multisession: isMultiSession,
                    organizer_type: formData.organizer_type,
                    meeting_url: formData.meeting_url,
                    instructor_name: formData.instructor_name,
                    instructor_role: formData.instructor_role
                };

                const { data: eventData, error: eventError } = await supabase
                    .from('events')
                    .insert([eventPayload])
                    .select()
                    .single();

                if (eventError) throw eventError;

                // Insert Sessions
                if (isMultiSession && sessions.length > 0) {
                    const sessionInserts = sessions.map((s, idx) => ({
                        event_id: eventData.id,
                        session_date: s.date,
                        start_time: s.start,
                        end_time: s.end,
                        title: s.title || `Sesión ${idx + 1}`,
                        order_index: idx + 1
                    }));

                    const { error: sessionError } = await supabase
                        .from('event_sessions')
                        .insert(sessionInserts);

                    if (sessionError) console.error('Error creando sesiones:', sessionError);
                } else {
                    const { error: sessionError } = await supabase
                        .from('event_sessions')
                        .insert([{
                            event_id: eventData.id,
                            session_date: eventPayload.scheduled_date,
                            start_time: eventPayload.start_time,
                            end_time: eventPayload.end_time,
                            title: 'Sesión Única',
                            order_index: 1
                        }]);

                    if (sessionError) console.error('Error creando sesión única:', sessionError);
                }

                // Register Expense
                if (registerExpense && eventPayload.budget_estimated > 0 && financialActivities.length > 0) {
                    await supabase
                        .from('financial_transactions')
                        .insert([{
                            activity_id: financialActivities[0].id,
                            title: `Presupuesto Evento: ${formData.title}`,
                            type: 'expense',
                            category: 'Eventos',
                            amount: eventPayload.budget_estimated,
                            description: `Presupuesto asignado para evento: ${formData.title}`,
                            transaction_date: new Date().toISOString().split('T')[0],
                            created_by: user.id
                        }]);
                }

                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1000);
            }
        } catch (err: any) {
            console.error('Error saving event:', err);
            setError(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ... (rest of the file)

    // RENDER PART (Needs to be inside the render block manually if not using multi_replace extensively)
    // I need to verify where to inject the UI code. 
    // It's line ~530 where date/time inputs are.


    const handleManualMode = () => setCurrentMode('manual');
    const handleGenerateWithAI = handleGenerate;

    const renderAIMode = () => (
        <div className="space-y-6">
            <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-white/5 border border-exec-blue/20 rounded-none flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,136,255,0.1)]">
                    <span className="material-symbols-outlined notranslate text-exec-blue text-3xl animate-pulse" translate="no">smart_toy</span>
                </div>
                <h3 className="text-xl font-bold text-white">Asistente de Eventos IA</h3>
                <p className="text-gray-400 max-w-md mx-auto text-sm">
                    Describe el evento que deseas crear. Incluye detalles como título, fecha, hora, ubicación y temas a tratar. La IA generará una estructura completa para ti.
                </p>
            </div>

                <div className="space-y-4">
                    <div className="relative">
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Ej: Taller de Liderazgo para 50 personas el próximo viernes a las 5pm en el auditorio principal..."
                            className="w-full h-32 bg-[#111] border border-exec-border rounded-none p-4 text-white placeholder-gray-600 focus:border-exec-blue focus:ring-1 focus:ring-exec-blue transition-all resize-none"
                            disabled={isLoading}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-600">
                            {aiPrompt.length} caracteres
                        </div>
                    </div>
                    <AIEngineSelector 
                        config={aiConfig} 
                        onConfigChange={setAiConfig} 
                    />
                </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-none border border-red-900/30">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-[#1F1F1F]">
                <button
                    onClick={handleManualMode}
                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-none transition-colors text-[11px] font-bold uppercase tracking-widest border border-exec-border"
                >
                    Modo Manual
                </button>
                <button
                    onClick={handleGenerateWithAI}
                    disabled={!aiPrompt.trim() || isLoading}
                    className="px-6 py-2 bg-exec-blue hover:bg-blue-600 text-white rounded-none text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-exec-blue/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all group"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generando...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined notranslate text-[18px]" translate="no">smart_toy</span>
                            <span>Generar Plan</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    const renderManualMode = () => (
        <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 md:gap-6">
                {/* Visual Cover Upload */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Portada del Evento</label>
                    <div className="relative group w-full h-40 bg-[#050505] border border-[#262626] rounded-none overflow-hidden hover:border-exec-blue transition-colors flex items-center justify-center">
                        {coverPreview ? (
                            <img src={coverPreview} alt="Cover" className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-600 gap-3">
                                <span className="material-symbols-outlined notranslate text-4xl opacity-20" translate="no">image</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Cargar Flyer / Poster</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Título del Evento <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-exec-blue text-lg">title</span>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="exec-input pl-10 h-10"
                            placeholder="Nombre oficial..."
                            required
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Tipo de Actividad</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-exec-blue text-lg">category</span>
                        <select
                            value={formData.event_type}
                            onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                            className="exec-input pl-10 h-10"
                        >
                            {EVENT_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Organizador / Certificación</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-exec-blue text-lg">workspace_premium</span>
                        <select
                            value={formData.organizer_type}
                            onChange={(e) => setFormData({ ...formData, organizer_type: e.target.value as any })}
                            className="exec-input pl-10 h-10"
                        >
                            <option value="acs">Evento propio — Revista ACS</option>
                            <option value="colegio_sociologo_unidad">Auspicio Colegio/Unidad</option>
                            <option value="revista_la_colmena">Alianza La Colmena (PUCP)</option>
                        </select>
                    </div>
                </div>

                {formData.event_type === 'taller' && (
                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-exec-blue/5 border border-exec-blue/20 animate-in fade-in slide-in-from-top-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-exec-blue uppercase tracking-widest">Nombre del Docente / Capacitador</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-exec-blue text-sm">school</span>
                                <input
                                    type="text"
                                    value={formData.instructor_name}
                                    onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                                    className="exec-input pl-10 h-10 border-exec-blue/30 focus:border-exec-blue"
                                    placeholder="Nombre completo..."
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-exec-blue uppercase tracking-widest">Cargo / Especialidad del Docente</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-exec-blue text-sm">badge</span>
                                <input
                                    type="text"
                                    value={formData.instructor_role}
                                    onChange={(e) => setFormData({ ...formData, instructor_role: e.target.value })}
                                    className="exec-input pl-10 h-10 border-exec-blue/30 focus:border-exec-blue"
                                    placeholder="Ej: PhD en Sociología..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Descripción Ejecutiva</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="exec-input h-24 p-3 resize-none"
                        placeholder="Objetivos y metas del evento..."
                    />
                </div>

                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-[#050505] border border-[#262626]">
                        <input
                            type="checkbox"
                            id="isMultiSession"
                            checked={isMultiSession}
                            onChange={(e) => setIsMultiSession(e.target.checked)}
                            className="w-5 h-5 rounded-none border-gray-700 text-exec-blue focus:ring-exec-blue bg-black"
                        />
                        <label htmlFor="isMultiSession" className="text-[11px] font-bold text-white uppercase tracking-widest cursor-pointer">
                            Modalidad Multi-sesión
                        </label>
                    </div>

                    {!isMultiSession ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Fecha <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={formData.scheduled_date}
                                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                    className="exec-input h-10"
                                    required={!isMultiSession}
                                />
                            </div>
                             <div className="flex flex-col gap-2">
                                 <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Inicio <span className="text-red-500">*</span></label>
                                 <TimePickerSelect 
                                    value={formData.start_time} 
                                    onChange={(v) => setFormData({ ...formData, start_time: v })} 
                                 />
                             </div>
                             <div className="flex flex-col gap-2">
                                 <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Cierre <span className="text-red-500">*</span></label>
                                 <TimePickerSelect 
                                    value={formData.end_time} 
                                    onChange={(v) => setFormData({ ...formData, end_time: v })} 
                                 />
                             </div>
                        </div>
                    ) : (
                        <div className="space-y-4 border border-[#262626] p-4 bg-[#050505]">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined notranslate text-exec-blue" translate="no">calendar_month</span>
                                Sesiones del Programa
                            </h4>

                            <div className="space-y-3">
                                {sessions.map((session, index) => (
                                    <div key={index} className="flex flex-col md:grid md:grid-cols-12 gap-x-2 gap-y-3 p-2 bg-black border border-[#1f1f1f] relative items-center">
                                        <div className="hidden md:flex items-center justify-center col-span-1 text-[10px] font-black text-exec-blue/50">{index + 1}</div>
                                        
                                        <div className="col-span-11 md:col-span-2">
                                            <label className="md:hidden text-[9px] font-bold text-gray-600 uppercase mb-1 block">Fecha</label>
                                            <input
                                                type="date"
                                                value={session.date}
                                                onChange={(e) => updateSession(index, 'date', e.target.value)}
                                                className="exec-input text-[11px] h-8 px-2"
                                                required
                                            />
                                        </div>
                                        
                                         <div className="col-span-11 md:col-span-2">
                                            <label className="md:hidden text-[9px] font-bold text-gray-600 uppercase mb-1 block">Inicio</label>
                                             <TimePickerSelect 
                                                value={session.start} 
                                                onChange={(v) => updateSession(index, 'start', v)} 
                                             />
                                         </div>
                                         <div className="col-span-11 md:col-span-2">
                                            <label className="md:hidden text-[9px] font-bold text-gray-600 uppercase mb-1 block">Fin</label>
                                             <TimePickerSelect 
                                                value={session.end} 
                                                onChange={(v) => updateSession(index, 'end', v)} 
                                             />
                                         </div>
                                         
                                        <div className="col-span-11 md:col-span-4">
                                            <label className="md:hidden text-[9px] font-bold text-gray-600 uppercase mb-1 block">Título Sesión</label>
                                            <input
                                                type="text"
                                                value={session.title}
                                                onChange={(e) => updateSession(index, 'title', e.target.value)}
                                                placeholder="Ej. Sesión 1"
                                                className="exec-input text-[11px] h-8 px-2"
                                            />
                                        </div>
                                        
                                        <button 
                                            type="button" 
                                            onClick={() => removeSession(index)} 
                                            className="absolute top-2 right-2 md:relative md:top-0 md:right-0 col-span-1 flex items-center justify-center text-red-500/50 hover:text-red-500 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addSession}
                                className="w-full py-3 border border-dashed border-[#262626] text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-exec-blue hover:border-exec-blue transition-all mt-4 flex items-center justify-center gap-2"
                            >
                                <Plus size={14} />
                                Agregar Sesión
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Localización / Link</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-exec-blue text-lg">location_on</span>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="exec-input pl-10 h-10"
                            placeholder={formData.is_online ? "Enlace de reunión..." : "Sede física..."}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Modalidad</label>
                    <div className="flex items-center gap-6 h-10 px-4 bg-[#050505] border border-[#262626]">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                checked={!formData.is_online}
                                onChange={() => setFormData({ ...formData, is_online: false })}
                                className="w-4 h-4 border-gray-600 text-exec-blue focus:ring-exec-blue bg-black"
                            />
                            <span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-white transition-colors">Presencial</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                checked={formData.is_online}
                                onChange={() => setFormData({ ...formData, is_online: true })}
                                className="w-4 h-4 border-gray-600 text-exec-blue focus:ring-exec-blue bg-black"
                            />
                            <span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-white transition-colors">Virtual</span>
                        </label>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-6 border-t border-[#1f1f1f] pt-6 mt-4">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="material-symbols-outlined notranslate text-emerald-500 text-lg" translate="no">monetization_on</span>
                        Costos y Planeación Financiera
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-4">
                            <label className="flex items-center gap-3 cursor-pointer group p-3 bg-black border border-[#1f1f1f]">
                                <input
                                    type="checkbox"
                                    checked={formData.is_paid || false}
                                    onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked, cost: e.target.checked ? formData.cost : 0 })}
                                    className="w-5 h-5 border-gray-700 text-emerald-500 focus:ring-emerald-500 bg-black"
                                />
                                <span className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-white transition-colors">Evento con Costo de Participación</span>
                            </label>

                            {formData.is_paid && (
                                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Tarifa (S/.) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500">S/.</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.cost || ''}
                                            onChange={(e) => setFormData({ ...formData, cost: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                            className="exec-input pl-10 h-10 border-emerald-500/30 focus:border-emerald-500"
                                            placeholder="0.00"
                                            required={formData.is_paid}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Presupuesto para Gastos (S/.)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600">S/.</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.budget_estimated || ''}
                                    onChange={(e) => setFormData({ ...formData, budget_estimated: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                    className="exec-input pl-10 h-10"
                                    placeholder="0.00"
                                />
                            </div>
                            {!isEditMode && formData.budget_estimated > 0 && (
                                <div className="mt-2 flex items-center gap-2 px-2">
                                    <input
                                        type="checkbox"
                                        id="registerExpense"
                                        checked={registerExpense}
                                        onChange={(e) => setRegisterExpense(e.target.checked)}
                                        className="w-4 h-4 border-gray-700 bg-black text-exec-blue focus:ring-exec-blue"
                                    />
                                    <label htmlFor="registerExpense" className="text-[9px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-gray-300">
                                        Vincular Gasto a Finanzas
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggestions Display if available */}
            {(formData.resources_needed.length > 0 || formData.participant_categories.length > 0) && (
                <div className="bg-[#111] rounded-none p-4 space-y-3 border border-exec-border">
                    <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-exec-blue" />
                        Sugerencias IA
                    </h3>
                    {formData.resources_needed.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.resources_needed.map((res, i) => (
                                <span key={i} className="px-2 py-1 bg-[#1A1A1A] border border-gray-800 rounded-none text-[10px] text-gray-400">
                                    {res}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="mb-6 flex items-center gap-3 text-red-400 bg-red-900/10 p-4 rounded-none border border-red-900/30 animate-in shake duration-300">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Error de Sistema</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider">{error}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pt-8 border-t border-[#1F1F1F]">
                {!isEditMode && (
                    <button
                        type="button"
                        onClick={() => setCurrentMode('ai')}
                        className="w-full md:w-auto text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-exec-blue flex items-center justify-center md:justify-start gap-2 transition-all p-3 bg-[#050505] border border-[#262626] rounded-none"
                    >
                        <span className="material-symbols-outlined notranslate text-sm" translate="no">smart_toy</span>
                        Asistente IA
                    </button>
                )}
                <div className="flex flex-row gap-3 md:ml-auto w-full md:w-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 md:flex-none px-6 py-3 border border-[#262626] text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-none transition-all text-[11px] font-bold uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-[2] md:flex-none px-8 py-3 bg-exec-blue hover:bg-blue-600 text-white rounded-none shadow-lg shadow-exec-blue/20 disabled:opacity-50 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                            <CheckCircle className="w-4 h-4 text-white" />
                        )}
                        {isLoading ? 'Sincronizando...' : (isEditMode ? 'Actualizar Registro' : 'Lanzar Evento')}
                    </button>
                </div>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden border border-[#262626] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#1F1F1F] sticky top-0 bg-[#0A0A0A]/95 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-none border ${currentMode === 'ai' && !isEditMode ? 'bg-exec-blue/10 border-exec-blue/20' : 'bg-[#1A1A1A] border-exec-border'}`}>
                            {currentMode === 'ai' && !isEditMode ? (
                                <span className="material-symbols-outlined notranslate text-exec-blue text-[20px]" translate="no">smart_toy</span>
                            ) : (
                                <Calendar className="w-5 h-5 text-gray-300" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                {isEditMode ? 'Editar Evento' : (currentMode === 'ai' ? 'Crear Evento con IA' : 'Nuevo Evento')}
                            </h2>
                            <p className="text-xs text-gray-500">
                                {isEditMode ? 'Modifica los detalles del evento existente' : 'Agrega un nuevo evento a la agenda'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-[#1A1A1A] rounded-none"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-24 md:pb-12">
                    {currentMode === 'ai' && !isEditMode ? renderAIMode() : renderManualMode()}
                </div>
            </div>
        </div>
    );
}
