import React, { useState, useEffect, useRef } from 'react';
import { Users, Upload, UserPlus, ArrowLeft, Search, Filter, Download, Trash2, Loader2, DollarSign, CheckCircle, AlertCircle, Calendar, Globe, Edit, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import { parseExcelAttendance } from '../../lib/ai';
import * as XLSX from 'xlsx';

interface ParticipantsTabProps {
    eventId: string;
}

interface Participant {
    id?: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    institution: string | null;
    category: string;
    attended: boolean;
    payment_status?: 'pending' | 'paid' | 'exempt';
    payment_method?: string;
    payment_receipt_url?: string;
    registration_source?: string; // 'manual' | 'public_form'
    registered_at?: string;
    // Multi-session attendance: session_id -> status
    attendance_map?: Record<string, string>;
    profiles?: { avatar_url: string | null };
}

interface Session {
    id: string;
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    order_index: number;
}

const PARTICIPANT_CATEGORIES = [
    'organizador',
    'co_organizador',
    'ponente',
    'comentarista',
    'artista_invitado',
    'participante_general'
];


function getCategoryLabel(category: string) {
    const labels: Record<string, string> = {
        organizador: 'Organizador',
        co_organizador: 'Co-organizador',
        ponente: 'Ponente',
        comentarista: 'Comentarista',
        artista_invitado: 'Artista Invitado',
        participante_general: 'Participante',
        participante: 'Participante',
    };
    return labels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function ParticipantsTab({ eventId }: ParticipantsTabProps) {
    const { showToast } = useToast();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showParticipantModal, setShowParticipantModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedParticipantForPayment, setSelectedParticipantForPayment] = useState<Participant | null>(null);

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);

    // Payment Confirmation State (Modern)
    const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
    const [paymentConfirmData, setPaymentConfirmData] = useState<{ id: string, status: string } | null>(null);

    // Multi-session State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [loadingSessions, setLoadingSessions] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadSessions();
    }, [eventId]);

    useEffect(() => {
        if (selectedSessionId) {
            loadParticipants();
        }
    }, [selectedSessionId]);

    useEffect(() => {
        filterParticipants();
    }, [participants, searchQuery, selectedCategory]);

    async function loadSessions() {
        setLoadingSessions(true);
        try {
            const { data, error } = await supabase
                .from('event_sessions')
                .select('*')
                .eq('event_id', eventId)
                .order('order_index', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setSessions(data);
                setSelectedSessionId(data[0].id);
            } else {
                // Fallback if no sessions exist (shouldn't happen due to migration, but distinct handling)
                setSessions([]);
            }
        } catch (err) {
            console.error('Error loading sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    }

    async function loadParticipants() {
        setLoading(true);
        try {
            // Fetch participants with profile avatars
            const { data: participantsData, error: participantsError } = await supabase
                .from('event_participants')
                .select(`
                    *,
                    profiles:user_id(avatar_url)
                `)
                .eq('event_id', eventId)
                .order('full_name');

            if (participantsError) throw participantsError;

            // Fetch attendance for the selected session
            let attendanceMap: Record<string, string> = {};
            if (selectedSessionId) {
                const { data: attendanceData, error: attendanceError } = await supabase
                    .from('event_attendance_records')
                    .select('participant_id, status')
                    .eq('session_id', selectedSessionId);

                if (!attendanceError && attendanceData) {
                    attendanceData.forEach(record => {
                        attendanceMap[record.participant_id] = record.status;
                    });
                }
            }

            // Merge data
            const formattedParticipants = (participantsData || []).map(p => ({
                ...p,
                attendance_map: { [selectedSessionId]: attendanceMap[p.id] || 'absent' }, // Minimal map for current view
                attended: attendanceMap[p.id] === 'present' // Backwards compat / simplified view
            }));

            setParticipants(formattedParticipants);
        } catch (error) {
            console.error('Error loading participants:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleQuickVerify(participantId: string, currentStatus: string) {
        if (currentStatus === 'paid') {
            setPaymentConfirmData({ id: participantId, status: currentStatus });
            setIsPaymentConfirmOpen(true);
            return;
        }
        // If it's pending, we toggle to paid without confirmation (as per current logic, but modernizing the success feedback)
        await performPaymentUpdate(participantId, 'paid');
    }

    async function performPaymentUpdate(participantId: string, newStatus: string) {
        try {
            // Optimistic update
            setParticipants(prev => prev.map(p =>
                p.id === participantId ? { ...p, payment_status: newStatus as any } : p
            ));

            const { error } = await supabase
                .from('event_participants')
                .update({ payment_status: newStatus })
                .eq('id', participantId);

            if (error) throw error;
            
            showToast({
                type: 'success',
                title: 'Estado Actualizado',
                message: `Participante marcado como ${newStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}`
            });

            loadParticipants();
        } catch (err: any) {
            console.error('Error updating payment status:', err);
            showToast({
                type: 'error',
                title: 'Error',
                message: 'No se pudo actualizar el estado de pago'
            });
            loadParticipants();
        } finally {
            setIsPaymentConfirmOpen(false);
            setPaymentConfirmData(null);
        }
    }

    async function toggleAttendance(participantId: string) {
        if (!selectedSessionId) return;

        const participant = participants.find(p => p.id === participantId);
        if (!participant) return;

        const currentStatus = participant.attendance_map?.[selectedSessionId] === 'present' ? 'present' : 'absent';
        const newStatus = currentStatus === 'present' ? 'absent' : 'present';

        try {
            // Optimistic Update
            setParticipants(prev => prev.map(p => {
                if (p.id === participantId) {
                    return {
                        ...p,
                        attendance_map: { ...p.attendance_map, [selectedSessionId]: newStatus },
                        attended: newStatus === 'present'
                    };
                }
                return p;
            }));

            if (newStatus === 'present') {
                // Upsert 'present'
                const { error } = await supabase.from('event_attendance_records').upsert({
                    event_id: eventId,
                    session_id: selectedSessionId,
                    participant_id: participantId,
                    status: 'present',
                    marked_at: new Date().toISOString()
                }, { onConflict: 'session_id, participant_id' });
                if (error) throw error;
            } else {
                // Remove record or set to absent? 
                // Let's delete the record for "absent" to keep table clean, OR set status to 'absent'.
                // The schema unique constraint allows upsert. Let's delete to unmark.
                const { error } = await supabase.from('event_attendance_records')
                    .delete()
                    .match({ session_id: selectedSessionId, participant_id: participantId });
                if (error) throw error;
            }
        } catch (err) {
            console.error('Error toggling attendance:', err);
            // Revert on error would be ideal, but skipping for MVP
            loadParticipants(); // Reload to sync
        }
    }

    function filterParticipants() {
        let filtered = [...participants];

        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.institution?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        setFilteredParticipants(filtered);
    }

    async function handleExcelImport(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            // Leer archivo Excel
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const excelText = XLSX.utils.sheet_to_csv(firstSheet);

            // Llamar a IA para parsear
            const parsedParticipants = await parseExcelAttendance(excelText);

            if (!parsedParticipants || parsedParticipants.length === 0) {
                showToast({
                    type: 'error',
                    title: 'Error de Importación',
                    message: 'No se pudieron extraer participantes del archivo. Verifica el formato.'
                });
                return;
            }

            // Insertar participantes en la base de datos
            const participantsToInsert = parsedParticipants.map((p: any) => ({
                event_id: eventId,
                full_name: p.full_name,
                email: p.email || null,
                phone: p.phone || null,
                institution: p.institution || null,
                category: p.category || 'participante_general',
                attended: false
            }));

            const { error } = await supabase
                .from('event_participants')
                .insert(participantsToInsert);

            if (error) throw error;

            showToast({
                type: 'success',
                title: 'Importación Exitosa',
                message: `Se importaron ${participantsToInsert.length} participantes correctamente`
            });
            loadParticipants();
        } catch (error: any) {
            console.error('Error importing participants:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: `No se pudo completar la importación: ${error.message}`
            });
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    async function handleSaveParticipant(participantData: Participant) {
        try {
            if (editingParticipant?.id) {
                // ... (existing update logic) ...
                const { error } = await supabase
                    .from('event_participants')
                    .update({
                        full_name: participantData.full_name,
                        email: participantData.email,
                        phone: participantData.phone,
                        institution: participantData.institution,
                        category: participantData.category
                    })
                    .eq('id', editingParticipant.id);

                if (error) throw error;
                showToast({
                    type: 'success',
                    title: 'Actualizado',
                    message: 'Participante actualizado correctamente'
                });
                
                setShowParticipantModal(false);
                setEditingParticipant(null);
                loadParticipants();
            } else {
                // Insert
                setIsSaving(true);
                const { error } = await supabase
                    .from('event_participants')
                    .insert([{
                        event_id: eventId,
                        ...participantData
                    }]);

                if (error) throw error;
                
                // Show success in modal
                setSaveSuccess(true);
                
                showToast({
                    type: 'success',
                    title: 'Agregado',
                    message: 'Participante agregado a la lista'
                });

                // Auto close after showing success
                setTimeout(() => {
                    setShowParticipantModal(false);
                    setSaveSuccess(false);
                    setIsSaving(false);
                    loadParticipants();
                }, 1500);
            }
        } catch (error) {
            console.error('Error saving participant:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: 'No se pudo guardar el participante'
            });
        }
    }

    async function handleAddTeamMember(userId: string) {
        try {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            // Check if already registered
            const { data: existing, error: checkError } = await supabase
                .from('event_participants')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existing) {
                showToast({
                    type: 'warning',
                    title: 'Aviso',
                    message: 'Este miembro ya está registrado en este evento.'
                });
                return;
            }

            // Insert as participant
            const { error: insertError } = await supabase
                .from('event_participants')
                .insert([{
                    event_id: eventId,
                    user_id: userId,
                    full_name: profile.full_name,
                    email: profile.email,
                    phone: profile.phone,
                    category: 'organizador', // Defaulting to organizador for team members
                    payment_status: 'exempt',
                    registration_source: 'manual'
                }]);

            if (insertError) throw insertError;

            showToast({
                type: 'success',
                title: 'Equipo Actualizado',
                message: `${profile.full_name} agregado al equipo del evento`
            });
            setShowTeamModal(false);
            loadParticipants();
        } catch (error: any) {
            console.error('Error adding team member:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: `No se pudo agregar al miembro: ${error.message}`
            });
        }
    }

    async function handleDelete(participantId: string) {
        setParticipantToDelete(participantId);
        setIsDeleteModalOpen(true);
    }

    async function confirmDelete() {
        if (!participantToDelete) return;

        try {
            const { error } = await supabase
                .from('event_participants')
                .delete()
                .eq('id', participantToDelete);

            if (error) throw error;
            showToast({
                type: 'success',
                title: 'Eliminado',
                message: 'El participante ha sido removido con éxito'
            });
            loadParticipants();
        } catch (error) {
            console.error('Error deleting participant:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: 'No se pudo eliminar al participante'
            });
        } finally {
            setIsDeleteModalOpen(false);
            setParticipantToDelete(null);
        }
    }


    function getCategoryColor(category: string) {
        const colors: Record<string, string> = {
            organizador: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            co_organizador: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            ponente: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            comentarista: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            artista_invitado: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
            participante_general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
        return colors[category] || colors.participante_general;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-exec-blue" />
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] animate-pulse">Cargando Protocolo...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-1 sm:p-2 space-y-3">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-2">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => (window as any).setActiveEventSubTab?.(null)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h3 className="text-sm font-black text-white tracking-[0.1em] uppercase">
                            Panel de Control / Participantes
                        </h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                            {participants.length} Registros Sincronizados
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:flex md:flex-row gap-1.5 w-full md:w-auto">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelImport}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="px-3 py-2 bg-[#050505] text-exec-blue hover:bg-exec-blue/10 border border-[#262626] rounded-none flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] disabled:opacity-50 transition-colors"
                    >
                        {importing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-exec-blue" />
                        ) : (
                            <Upload className="w-3.5 h-3.5" />
                        )}
                        EXCEL
                    </button>
                    <button
                        onClick={() => setShowTeamModal(true)}
                        className="px-3 py-2 bg-[#050505] hover:bg-[#111] text-gray-300 border border-[#262626] rounded-none flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] transition-colors"
                    >
                        <Users className="w-3.5 h-3.5" />
                        EQUIPO
                    </button>
                    <button
                        onClick={() => {
                            setEditingParticipant(null);
                            setShowParticipantModal(true);
                        }}
                        className="col-span-2 md:col-auto px-4 py-2 bg-exec-blue hover:bg-blue-600 text-black rounded-none flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-exec-blue/10 transition-colors"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        AGREGAR MANUAL
                    </button>
                </div>
            </div>

            {/* Session Selector */}
            {sessions.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#050505]/50 p-3 rounded-none border border-[#1A1A1A]">
                    <div className="flex items-center gap-2 text-exec-blue">
                        <Calendar className="w-4 h-4" />
                        <span className="font-black text-[10px] uppercase tracking-widest shrink-0">Sesión Activa</span>
                    </div>
                    {loadingSessions ? (
                        <span className="text-gray-600 text-[9px] uppercase font-bold">Sincronizando...</span>
                    ) : (
                        <select
                            value={selectedSessionId}
                            onChange={(e) => setSelectedSessionId(e.target.value)}
                            className="bg-black border border-[#262626] text-white text-[10px] font-bold rounded-none px-3 py-1.5 focus:outline-none focus:border-exec-blue flex-1 max-w-[300px] transition-all uppercase tracking-tight"
                        >
                            {sessions.map(session => (
                                <option key={session.id} value={session.id}>
                                    {session.title.toUpperCase()} — {new Date(session.session_date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 w-3.5 h-3.5" />
                    <input
                        type="text"
                        placeholder="FILTRAR POR NOMBRE O CONTACTO..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-black border border-[#1A1A1A] rounded-none focus:border-exec-blue/50 text-white text-[10px] font-medium placeholder-gray-800 outline-none transition-all uppercase tracking-widest shadow-inner"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-black border border-[#1A1A1A] rounded-none focus:border-exec-blue/50 text-white text-[9px] font-black uppercase tracking-widest outline-none transition-all"
                >
                    <option value="all">TODAS LAS CATEGORÍAS</option>
                    {PARTICIPANT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{getCategoryLabel(cat).toUpperCase()}</option>
                    ))}
                </select>
            </div>

            {/* Participants Table */}
            {filteredParticipants.length === 0 ? (
                <div className="text-center py-12 bg-[#111] rounded-none border border-dashed border-gray-800">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-white mb-1">
                        No hay participantes registrados
                    </h3>
                    <p className="text-sm text-gray-500">
                        Importa desde Excel o agrega manualmente
                    </p>
                </div>
            ) : (
                <div className="bg-[#050505] border border-exec-border rounded-none overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="hidden md:table w-full border-collapse">
                            <thead className="bg-[#111]">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Nombre / Contacto
                                    </th>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Asist.
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Categoría / Institución
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Estado Pago
                                    </th>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Comp.
                                    </th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-[#0A0A0A] divide-y divide-[#1F1F1F]">
                                {filteredParticipants.map(participant => (
                                    <tr key={participant.id} className="group hover:bg-[#111] transition-colors">
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-none bg-exec-blue/10 flex-shrink-0 flex items-center justify-center text-exec-blue font-black text-[10px] border border-exec-blue/20 overflow-hidden shadow-sm">
                                                    {participant.profiles?.avatar_url ? (
                                                        <img src={participant.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        participant.full_name?.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white truncate uppercase tracking-tight">{participant.full_name}</p>
                                                    <p className="text-[10px] text-gray-600 font-bold truncate tracking-widest mt-0.5">{participant.email || 'SIN EMAIL'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap text-center">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={participant.attendance_map?.[selectedSessionId] === 'present'}
                                                    onChange={() => participant.id && toggleAttendance(participant.id)}
                                                    className="w-3.5 h-3.5 rounded-none border-gray-700 text-exec-blue focus:ring-exec-blue bg-gray-900"
                                                />
                                            </label>
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] rounded-none border w-fit ${participant.category === 'organizador' ? 'bg-purple-900/20 text-purple-400 border-purple-800/20' :
                                                    participant.category === 'ponente' ? 'bg-exec-blue/10 text-exec-blue border-exec-blue/20' :
                                                        'bg-[#111] text-gray-600 border-[#222]'
                                                    }`}>
                                                    {getCategoryLabel(participant.category)}
                                                </span>
                                                <span className="text-[9px] text-[#404040] font-black uppercase tracking-widest px-2">{participant.institution || '---'}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <button
                                                onClick={() => participant.id && handleQuickVerify(participant.id, participant.payment_status || 'pending')}
                                                className="focus:outline-none transition-all active:scale-95"
                                            >
                                                {participant.payment_status === 'paid' ? (
                                                    <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 rounded-none border border-emerald-500/20 w-fit transition-colors">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        PAGADO
                                                    </span>
                                                ) : participant.payment_status === 'exempt' ? (
                                                    <span className="text-gray-500 text-[10px] font-black bg-[#111] px-3 py-2 rounded-none border border-[#222] w-fit uppercase tracking-widest">
                                                        EXONERADO
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-amber-500 text-[10px] font-black bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-none border border-amber-500/20 w-fit transition-colors">
                                                        <Loader2 className="w-3.5 h-3.5" />
                                                        PENDIENTE
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap text-center">
                                            {participant.payment_receipt_url ? (
                                                <a href={participant.payment_receipt_url} target="_blank" rel="noreferrer" className="group/img relative inline-block">
                                                    <img
                                                        src={participant.payment_receipt_url}
                                                        alt="Voucher"
                                                        className="w-10 h-10 object-cover rounded-none border border-[#222] group-hover/img:border-exec-blue transition-all"
                                                    />
                                                </a>
                                            ) : (
                                                <span className="text-gray-700 text-[12px] italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1 px-2">
                                                {participant.payment_status !== 'paid' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedParticipantForPayment(participant);
                                                            setShowPaymentModal(true);
                                                        }}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-none transition-colors border border-transparent hover:border-emerald-500/20"
                                                        title="Registrar Pago"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setEditingParticipant(participant);
                                                        setShowParticipantModal(true);
                                                    }}
                                                    className="p-2 text-exec-blue hover:bg-exec-blue/10 rounded-none transition-colors border border-transparent hover:border-exec-blue/20"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => participant.id && handleDelete(participant.id)}
                                                    className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-colors border border-transparent hover:border-red-500/20"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile View: Cards */}
                        <div className="md:hidden space-y-4 px-1 py-4">
                            {filteredParticipants.map(participant => (
                                <div key={participant.id} className="bg-[#050505] border border-[#1F1F1F] rounded-none p-5 space-y-4 shadow-xl">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">{participant.full_name}</h4>
                                            <p className="text-[10px] text-gray-500 font-bold truncate mt-1">{participant.email || 'SIN CORREO'}</p>
                                            <p className="text-[10px] text-[#404040] font-black mt-1 tracking-[0.2em]">{participant.phone || '---'}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-3 shrink-0">
                                            <label className="flex items-center gap-2 cursor-pointer bg-[#0A0A0A] px-3 py-2 border border-[#262626] rounded-none transition-colors active:border-exec-blue/50">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ASIST.</span>
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={participant.attendance_map?.[selectedSessionId] === 'present'}
                                                        onChange={() => participant.id && toggleAttendance(participant.id)}
                                                        className="w-5 h-5 rounded-none border-[#333] text-exec-blue focus:ring-exec-blue bg-[#111] transition-all"
                                                    />
                                                </div>
                                            </label>
                                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] rounded-none border ${participant.category === 'organizador' ? 'bg-purple-900/20 text-purple-400 border-purple-800/20' :
                                                participant.category === 'ponente' ? 'bg-exec-blue/10 text-exec-blue border-exec-blue/20' :
                                                    'bg-[#111] text-gray-500 border-[#262626]'
                                                }`}>
                                                {getCategoryLabel(participant.category)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-[#1F1F1F]">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => participant.id && handleQuickVerify(participant.id, participant.payment_status || 'pending')}
                                                className={`text-[9px] font-black px-3 py-1.5 rounded-none border transition-all active:scale-95 ${participant.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    participant.payment_status === 'exempt' ? 'bg-[#111] text-gray-400 border-[#262626]' :
                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    }`}
                                            >
                                                {participant.payment_status === 'paid' ? 'PAGADO' : participant.payment_status === 'exempt' ? 'EXONERADO' : 'PENDIENTE'}
                                            </button>
                                            {participant.payment_receipt_url && (
                                                <a href={participant.payment_receipt_url} target="_blank" rel="noreferrer" className="flex items-center">
                                                    <img src={participant.payment_receipt_url} className="w-8 h-8 rounded-none border border-[#262626] object-cover hover:border-exec-blue transition-colors" />
                                                </a>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {participant.payment_status !== 'paid' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedParticipantForPayment(participant);
                                                        setShowPaymentModal(true);
                                                    }}
                                                    className="p-2 text-emerald-500 bg-[#0A0A0A] border border-[#262626] rounded-none hover:bg-emerald-500/10 active:border-emerald-500/50 transition-all"
                                                >
                                                    <DollarSign className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingParticipant(participant);
                                                    setShowParticipantModal(true);
                                                }}
                                                className="p-2 text-exec-blue bg-[#0A0A0A] border border-[#262626] rounded-none hover:bg-exec-blue/10 active:border-exec-blue/50 transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => participant.id && handleDelete(participant.id)}
                                                className="p-2 text-red-500 bg-[#0A0A0A] border border-[#262626] rounded-none hover:bg-red-500/10 active:border-red-500/50 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Team Member Modal */}
            {showTeamModal && (
                <AddTeamMemberModal
                    onClose={() => setShowTeamModal(false)}
                    onSelect={handleAddTeamMember}
                />
            )}

            {/* Participant Modal (Add/Edit) */}
            {showParticipantModal && (
                <ParticipantModal
                    participant={editingParticipant || undefined}
                    onClose={() => {
                        setShowParticipantModal(false);
                        setEditingParticipant(null);
                    }}
                    onSave={handleSaveParticipant}
                    isSaving={isSaving}
                    isSuccess={saveSuccess}
                />
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedParticipantForPayment && (
                <PaymentModal
                    participant={selectedParticipantForPayment}
                    eventId={eventId}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedParticipantForPayment(null);
                    }}
                    onSuccess={() => {
                        loadParticipants();
                        setShowPaymentModal(false);
                        setSelectedParticipantForPayment(null);
                    }}
                />
            )}
            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Eliminar Participante"
                message="¿Estás seguro de que deseas eliminar a este participante? Esta acción no se puede deshacer y afectará los reportes financieros."
                confirmText="Eliminar permanentemente"
                cancelText="Mantener"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setParticipantToDelete(null);
                }}
                isDestructive={true}
            />

            {/* Confirm Payment Status Change Modal */}
            <ConfirmModal
                isOpen={isPaymentConfirmOpen}
                title="Cambiar Estado de Pago"
                message={`¿Estás seguro de que deseas cambiar el estado de este participante a PENDIENTE?`}
                confirmText="Confirmar cambio"
                cancelText="Mantener Pagado"
                onConfirm={() => {
                    if (paymentConfirmData) {
                        performPaymentUpdate(paymentConfirmData.id, 'pending');
                    }
                }}
                onCancel={() => {
                    setIsPaymentConfirmOpen(false);
                    setPaymentConfirmData(null);
                }}
                isDestructive={false}
            />
        </div>
    );
}

// ... AddParticipantModal component ...

function PaymentModal({ participant, eventId, onClose, onSuccess }: { participant: Participant; eventId: string; onClose: () => void; onSuccess: () => void }) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState('yape');
    const [voucherFile, setVoucherFile] = useState<File | null>(null);
    const [amount, setAmount] = useState<string>('');

    async function handlePayment(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            let voucherUrl = null;

            if (voucherFile) {
                const fileExt = voucherFile.name.split('.').pop();
                const fileName = `manual_vouchers/${participant.id}_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('event-receipts')
                    .upload(fileName, voucherFile);

                if (uploadError) {
                    console.error('Error uploading to event-receipts:', uploadError);
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('event-receipts')
                    .getPublicUrl(fileName);

                voucherUrl = publicUrl;
            }

            const { error } = await supabase
                .from('event_participants')
                .update({
                    payment_status: 'paid',
                    payment_method: method,
                    payment_receipt_url: voucherUrl,
                    payment_amount: parseFloat(amount) || 0,
                    transaction_id: `MAN-${Date.now().toString().slice(-6)}` // Better mock ID
                })
                .eq('id', participant.id);

            if (error) {
                console.error('Database update error:', error);
                throw error;
            }

            showToast({
                type: 'success',
                title: 'Pago Registrado',
                message: 'El pago ha sido validado y registrado en finanzas.'
            });
            onSuccess();
        } catch (error: any) {
            console.error('Error registering payment:', error);
            showToast({
                type: 'error',
                title: 'Error de Pago',
                message: `No se pudo registrar: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-sm border border-exec-border">
                <div className="flex items-center justify-between p-4 border-b border-[#1F1F1F]">
                    <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Registrar Pago
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-[#1A1A1A] rounded-none transition-colors">
                        <X className="w-4 h-4 text-gray-600 hover:text-white" />
                    </button>
                </div>

                <form onSubmit={handlePayment} className="p-4 space-y-4">
                    <div className="p-3 bg-[#050505] rounded-none border border-[#262626]">
                        <p className="text-[9px] font-black text-[#404040] uppercase tracking-widest">Participante</p>
                        <p className="text-sm font-black text-white uppercase">{participant.full_name}</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                            Método de Pago
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full px-4 py-3 border border-[#262626] rounded-none bg-[#050505] text-white text-xs font-bold outline-none focus:border-exec-blue transition-all"
                        >
                            <option value="yape">YAPE / PLIN</option>
                            <option value="transferencia">TRANSFERENCIA</option>
                            <option value="efectivo">EFECTIVO</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                            Monto Pagado (S/.)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-3 border border-[#262626] rounded-none bg-[#050505] text-white text-sm font-bold outline-none placeholder-gray-800 focus:border-exec-blue transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                            Comprobante (Voucher)
                        </label>
                        <div className="border border-dashed border-[#262626] rounded-none p-6 text-center hover:border-exec-blue/50 transition-colors cursor-pointer relative bg-[#050505]">
                            <input
                                type="file"
                                opacity-0
                                accept="image/*,.pdf"
                                onChange={(e) => setVoucherFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {voucherFile ? (
                                <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center justify-center gap-2">
                                    <CheckCircle className="w-3 h-3" />
                                    {voucherFile.name}
                                </div>
                            ) : (
                                <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                    <Upload className="w-5 h-5 mx-auto mb-2 opacity-50 text-gray-600" />
                                    SUBIR ARCHIVO
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[10px]"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle className="w-4 h-4" />}
                            Confirmar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddTeamMemberModal({ onClose, onSelect }: { onClose: () => void; onSelect: (id: string) => void }) {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { loadProfiles(); }, []);

    async function loadProfiles() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, avatar_url')
            .order('full_name');
        if (!error && data) setProfiles(data);
        setLoading(false);
    }

    const filtered = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-md border border-exec-border flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-[#1F1F1F]">
                    <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <Users className="w-4 h-4 text-exec-blue" />
                        Agregar Miembro
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-[#1A1A1A] rounded-none">
                        <X className="w-4 h-4 text-gray-600 hover:text-white" />
                    </button>
                </div>

                <div className="p-4 border-b border-[#1F1F1F]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                            type="text"
                            placeholder="BUSCAR NOMBRE O EMAIL..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-[#050505] border border-[#262626] rounded-none text-xs font-bold text-white outline-none focus:border-exec-blue transition-all uppercase"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-600" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-8 text-gray-500 text-sm">No se encontraron miembros</div>
                    ) : (
                        filtered.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => onSelect(profile.id)}
                                className="w-full flex items-center gap-4 p-4 hover:bg-[#050505] rounded-none transition-colors text-left group border border-transparent hover:border-[#1F1F1F]"
                            >
                                <div className="w-10 h-10 rounded-none bg-exec-blue/10 flex-shrink-0 flex items-center justify-center text-exec-blue font-black text-xs border border-exec-blue/20 overflow-hidden">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        profile.full_name?.charAt(0)
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-black text-white group-hover:text-exec-blue transition-colors truncate uppercase tracking-tight">
                                        {profile.full_name}
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-600 truncate uppercase mt-1 tracking-widest">{profile.role || 'MIEMBRO'}</p>
                                </div>
                                <UserPlus className="w-4 h-4 text-[#333] group-hover:text-exec-blue transition-colors" />
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function ParticipantModal({ 
    participant, 
    onClose, 
    onSave, 
    isSaving = false, 
    isSuccess = false 
}: { 
    participant?: Participant; 
    onClose: () => void; 
    onSave: (data: Participant) => void;
    isSaving?: boolean;
    isSuccess?: boolean;
}) {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Participant>({
        full_name: '',
        email: null,
        phone: null,
        institution: null,
        category: 'participante_general',
        payment_status: 'pending',
        attended: false
    });

    useEffect(() => {
        if (participant) {
            setFormData({
                full_name: participant.full_name || '',
                email: participant.email || null,
                phone: participant.phone || null,
                institution: participant.institution || null,
                category: participant.category || 'participante_general',
                payment_status: participant.payment_status || 'pending',
                attended: participant.attended || false
            });
        }
    }, [participant]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.full_name) {
            showToast({
                type: 'warning',
                title: 'Campo Requerido',
                message: 'El nombre completo es obligatorio para el registro.'
            });
            return;
        }
        onSave(formData);
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-md border border-exec-border">
                <div className="flex items-center justify-between p-6 border-b border-[#1F1F1F]">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                        {participant ? 'Editar Participante' : 'Agregar Manual'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-[#1A1A1A] rounded-none transition-colors">
                        <X className="w-5 h-5 text-gray-600 hover:text-white" />
                    </button>
                </div>

                {isSuccess ? (
                    <div className="flex flex-col items-center p-8 bg-[#050505]">
                        <div className="w-16 h-16 bg-exec-blue/10 text-exec-blue rounded-none border border-exec-blue/20 flex items-center justify-center mb-4 shadow-lg">
                            {participant ? <Edit className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
                        </div>
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                            {participant ? 'Período de Edición' : 'Nueva Incorporación'}
                        </h4>
                        <h4 className="text-xl font-bold text-white mb-2">¡Completado!</h4>
                        <p className="text-sm text-gray-400">El participante ha sido registrado con éxito.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Nombre Completo *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-3 border border-[#262626] rounded-none focus:border-exec-blue bg-[#050505] text-white text-xs font-bold outline-none placeholder-gray-800 transition-colors uppercase tracking-widest"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Email</label>
                        <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                            className="w-full px-4 py-3 border border-[#262626] rounded-none focus:border-exec-blue bg-[#050505] text-white text-xs font-bold outline-none placeholder-gray-800 transition-colors uppercase tracking-widest"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Teléfono</label>
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
                                className="w-full px-4 py-3 border border-[#262626] rounded-none focus:border-exec-blue bg-[#050505] text-white text-xs font-bold outline-none placeholder-gray-800 transition-colors uppercase tracking-widest"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-4 py-3 border border-[#262626] rounded-none focus:border-exec-blue bg-[#050505] text-white text-xs font-bold outline-none transition-all uppercase tracking-widest"
                            >
                                {PARTICIPANT_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{getCategoryLabel(cat).toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Institución</label>
                        <input
                            type="text"
                            value={formData.institution || ''}
                            onChange={(e) => setFormData({ ...formData, institution: e.target.value || null })}
                            className="w-full px-4 py-3 border border-[#262626] rounded-none focus:border-exec-blue bg-[#050505] text-white text-xs font-bold outline-none placeholder-gray-800 transition-colors uppercase tracking-widest"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Estado de Pago</label>
                        <select
                            value={formData.payment_status}
                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                            className="w-full px-4 py-3 border border-[#262626] rounded-none focus:border-exec-blue bg-[#050505] text-white text-xs font-bold outline-none transition-all uppercase tracking-widest"
                        >
                            <option value="pending">PENDIENTE</option>
                            <option value="paid">PAGADO</option>
                            <option value="exempt">EXONERADO</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-6 border-t border-[#1F1F1F]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-gray-500 hover:text-white hover:bg-[#0A0A0A] border border-transparent hover:border-[#1F1F1F] rounded-none transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-3 bg-exec-blue hover:bg-blue-600 text-white rounded-none font-black shadow-lg shadow-exec-blue/20 transition-all text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : participant ? (
                                <Edit className="w-4 h-4" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                            {isSaving ? 'GUARDANDO...' : participant ? 'GUARDAR' : 'REGISTRAR'}
                        </button>
                    </div>
                </form>
                )}
            </div>
        </div>
    );
}
