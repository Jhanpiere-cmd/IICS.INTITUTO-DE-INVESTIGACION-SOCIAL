import React, { useState, useEffect } from 'react';
import { Users, Check, Save, Loader2, AlertCircle, Calendar, Clock, BarChart, ExternalLink, Link as LinkIcon, ArrowLeft, Search, Copy, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AttendanceTabProps {
    eventId: string;
}

interface Participant {
    id: string;
    full_name: string;
    email: string | null;
    category: string;
    attended: boolean;
    payment_status: 'pending' | 'paid' | 'exempt';
    wants_certificate: boolean;
}

export function AttendanceTab({ eventId }: AttendanceTabProps) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [attendanceChanges, setAttendanceChanges] = useState<Record<string, boolean>>({});
    const [eventData, setEventData] = useState<any>(null);
    const [showVirtualModal, setShowVirtualModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        loadParticipants();
        loadEventData();
    }, [eventId]);

    async function loadEventData() {
        const { data } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();
        if (data) setEventData(data);
    }

    async function toggleVirtualAttendance() {
        const newValue = !eventData?.virtual_attendance_enabled;
        const { error } = await supabase
            .from('events')
            .update({ virtual_attendance_enabled: newValue })
            .eq('id', eventId);
        
        if (!error) {
            setEventData({ ...eventData, virtual_attendance_enabled: newValue });
        }
    }

    useEffect(() => {
        filterParticipants();
    }, [participants, searchQuery]);

    async function loadParticipants() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('event_participants')
                .select('id, full_name, email, category, attended, payment_status, wants_certificate')
                .eq('event_id', eventId)
                .order('full_name');

            if (error) throw error;
            setParticipants(data || []);
        } catch (error) {
            console.error('Error loading participants:', error);
        } finally {
            setLoading(false);
        }
    }

    function filterParticipants() {
        if (!searchQuery) {
            setFilteredParticipants(participants);
            return;
        }

        const filtered = participants.filter(p =>
            p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredParticipants(filtered);
    }

    function toggleAttendance(participantId: string, currentStatus: boolean) {
        setAttendanceChanges(prev => {
            const nextState = !getAttendanceStatus(participantId, currentStatus);
            
            // If the next state is the same as the original status, remove the change
            if (nextState === currentStatus) {
                const newChanges = { ...prev };
                delete newChanges[participantId];
                return newChanges;
            }

            return {
                ...prev,
                [participantId]: nextState
            };
        });
    }

    function getAttendanceStatus(participantId: string, originalStatus: boolean): boolean {
        return attendanceChanges.hasOwnProperty(participantId)
            ? attendanceChanges[participantId]
            : originalStatus;
    }

    async function handleSaveAttendance() {
        if (Object.keys(attendanceChanges).length === 0) {
            alert('No hay cambios para guardar');
            return;
        }

        setSaving(true);
        try {
            const idsToMarkAttended = Object.entries(attendanceChanges)
                .filter(([_, attended]) => attended)
                .map(([id]) => id);
            
            const idsToUnmarkAttended = Object.entries(attendanceChanges)
                .filter(([_, attended]) => !attended)
                .map(([id]) => id);

            // 1. Mark as attended
            if (idsToMarkAttended.length > 0) {
                const { error: errorTrue } = await supabase
                    .from('event_participants')
                    .update({ attended: true })
                    .in('id', idsToMarkAttended);
                if (errorTrue) throw errorTrue;
            }

            // 2. Unmark as attended
            if (idsToUnmarkAttended.length > 0) {
                const { error: errorFalse } = await supabase
                    .from('event_participants')
                    .update({ attended: false })
                    .in('id', idsToUnmarkAttended);
                if (errorFalse) throw errorFalse;
            }

            setSavedCount(Object.keys(attendanceChanges).length);
            setShowSuccessModal(true);
            setAttendanceChanges({});
            loadParticipants();
        } catch (error) {
            console.error('Error saving attendance:', error);
            alert('❌ Error al guardar asistencia. Por favor revisa tu conexión o permisos.');
        } finally {
            setTimeout(() => setSaving(false), 500);
        }
    }

    function getCategoryLabel(category: string) {
        const labels: Record<string, string> = {
            organizador: 'Organizador',
            co_organizador: 'Co-org',
            ponente: 'Ponente',
            comentarista: 'Comentarista',
            artista_invitado: 'Artista',
            participante_general: 'Participante'
        };
        return labels[category] || category;
    }

    const attendedCount = participants.filter(p =>
        getAttendanceStatus(p.id, p.attended)
    ).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-exec-blue" />
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] animate-pulse">Sincronizando Lista...</span>
                </div>
            </div>
        );
    }

    if (participants.length === 0) {
        return (
            <div className="p-6 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                    No hay participantes registrados
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Primero registra participantes en la pestaña "Participantes"
                </p>
            </div>
        );
    }

    return (
        <div className="p-1 sm:p-2 space-y-2">
            {/* Cabecera Principal / Estadísticas */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 px-2">
                <div className="w-full md:w-auto flex items-center gap-3">
                    <button 
                        onClick={() => (window as any).setActiveEventSubTab?.(null)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            <Users className="w-4 h-4 text-exec-blue" />
                            Control / Asistencia
                        </h3>
                    </div>
                </div>
                    
                {/* Grid de estadísticas compacto para móvil, fila para escritorio */}
                <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full md:w-auto">
                    <div className="bg-[#050505] border border-[#1A1A1A] px-3 py-1.5 rounded-none text-center lg:text-left min-w-[90px]">
                        <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest leading-none mb-1">Registrados</p>
                        <p className="text-lg font-black text-white leading-none">{participants.length}</p>
                    </div>
                    <div className="bg-[#050505] border border-[#1A1A1A] px-3 py-1.5 rounded-none text-center lg:text-left min-w-[90px]">
                        <p className="text-[8px] text-emerald-500 uppercase font-black tracking-widest leading-none mb-1">Asistieron</p>
                        <p className="text-lg font-black text-emerald-400 leading-none">{attendedCount}</p>
                    </div>
                    {Object.keys(attendanceChanges).length > 0 && (
                        <div className="col-span-2 lg:col-span-1 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-none flex items-center justify-center lg:justify-start gap-2 shadow-lg shadow-amber-900/10">
                            <span className="w-1.5 h-1.5 rounded-none bg-amber-500 animate-pulse" />
                            <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest">
                                {Object.keys(attendanceChanges).length} Pen.
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2 px-2">
                <button
                    onClick={() => setShowVirtualModal(true)}
                    className="w-full md:w-auto px-10 py-2 bg-exec-blue/10 border border-exec-blue/30 text-exec-blue hover:bg-exec-blue/20 rounded-none flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all"
                >
                    <LinkIcon size={12} />
                    Marcado Virtual
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const newChanges = { ...attendanceChanges };
                            filteredParticipants.forEach(p => {
                                newChanges[p.id] = true;
                            });
                            setAttendanceChanges(newChanges);
                        }}
                        className="flex-1 md:flex-none px-4 py-3 text-exec-blue hover:bg-[#1A1A1A] rounded-none border border-exec-border transition-colors bg-[#050505] text-[10px] font-black uppercase tracking-widest"
                    >
                        Marcar Todos
                    </button>
                    <button
                        onClick={handleSaveAttendance}
                        disabled={saving || Object.keys(attendanceChanges).length === 0}
                        className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                PROCESANDO...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                GUARDAR ASISTENCIAS
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Modal de Asistencia Virtual Beta */}
            {showVirtualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#050505] border border-[#1F1F1F] w-full max-w-lg rounded-none overflow-hidden shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-[#1F1F1F] flex items-center justify-between bg-gradient-to-r from-exec-blue/5 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
                                    <LinkIcon className="text-exec-blue" size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">NODO DE ASISTENCIA VIRTUAL</h4>
                                    <p className="text-[10px] text-exec-blue font-black uppercase tracking-[0.2em] leading-none mt-1.5 italic">PROTOCOL V2-INTEGRATION</p>
                                </div>
                            </div>
                            <button onClick={() => setShowVirtualModal(false)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white transition-colors bg-[#0D0D0D] border border-[#1F1F1F]">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-4">
                            <div className="space-y-3">
                                <p className="text-[13px] text-gray-400 leading-relaxed font-medium">
                                    Inyecte este enlace en el flujo de comunicación de <span className="text-exec-blue font-black">ZOOM</span> o <span className="text-exec-blue font-black">GOOGLE MEET</span>. 
                                    Los participantes autenticarán su presencia mediante el protocolo de registro rápido.
                                </p>
                            </div>

                            {/* Status Control */}
                            <div className="p-5 bg-black border border-[#1F1F1F] rounded-none flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-none ${eventData?.virtual_attendance_enabled ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-red-600'}`} />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                                        ESTADO: {eventData?.virtual_attendance_enabled ? 'TRANSMISIÓN ACTIVA' : 'SISTEMA OFFLINE'}
                                    </span>
                                </div>
                                <button
                                    onClick={toggleVirtualAttendance}
                                    className={`px-6 py-2 rounded-none text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                                        eventData?.virtual_attendance_enabled 
                                        ? 'bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white border-red-800/30' 
                                        : 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500/20'
                                    }`}
                                >
                                    {eventData?.virtual_attendance_enabled ? 'TERMINAR' : 'ACTIVAR'}
                                </button>
                            </div>

                            {/* Generated Link Area */}
                            {eventData?.virtual_attendance_enabled && (
                                <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">URL DE ACCESO PÚBLICO</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-[#0D0D0D] border border-[#1F1F1F] p-4 text-xs font-mono text-exec-blue truncate rounded-none select-all font-black">
                                                {window.location.origin}/asistencia/{eventData?.registration_slug || eventData?.report_slug}
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/asistencia/${eventData?.registration_slug || eventData?.report_slug}`);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="px-5 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-exec-blue/50 hover:bg-exec-blue/10 text-gray-400 hover:text-exec-blue rounded-none transition-all"
                                                title="Copiar Protocolo"
                                            >
                                                {copied ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 justify-center py-2">
                                        <a 
                                            href={`/asistencia/${eventData?.registration_slug || eventData?.report_slug}`}
                                            target="_blank"
                                            className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] hover:text-exec-blue flex items-center gap-3 transition-all group"
                                        >
                                            <ExternalLink size={14} className="group-hover:scale-110 transition-transform" />
                                            PREVISUALIZAR INTERFAZ PÚBLICA
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Warning Note */}
                            <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-none">
                                <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.1em] leading-relaxed">
                                    <span className="text-amber-400">LOG:</span> EL ALGORITMO DE EMPAREJAMIENTO DIFUSO ESTÁ ACTIVO. ERRORES DE TIPOGRAFÍA MENORES EN NOMBRES SERÁN AUTO-CORREGIDOS.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-[#090909] border-t border-[#1F1F1F] flex justify-end">
                            <button 
                                onClick={() => setShowVirtualModal(false)}
                                className="px-8 py-3 text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] hover:text-white transition-colors"
                            >
                                CERRAR PANEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Éxito Premium */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#050505] border border-emerald-500/30 w-full max-w-sm rounded-none overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.1)] scale-in-center animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center space-y-6">
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-none animate-ping" />
                                <div className="relative w-24 h-24 rounded-none bg-black border border-emerald-500/30 flex items-center justify-center mx-auto shadow-2xl">
                                    <CheckCircle2 className="text-emerald-500 w-12 h-12" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="text-xl font-black text-white uppercase tracking-tight">Sincronización Exitosa</h4>
                                <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest leading-relaxed">
                                    Se han procesado <span className="text-emerald-500">{savedCount}</span> entradas de datos en el núcleo persistente.
                                </p>
                            </div>

                            <button 
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-none transition-all shadow-2xl shadow-emerald-900/40 border border-emerald-400/20"
                            >
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <input
                    type="text"
                    placeholder="IDENTIFICAR PARTICIPANTE..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-[#1F1F1F] rounded-none focus:border-exec-blue bg-[#050505] text-white text-xs font-black placeholder-gray-800 outline-none uppercase tracking-widest transition-all"
                />
            </div>

            {/* Attendance List - TABLE (Desktop) / COMPACT CARDS (Mobile) */}
            <div className="bg-[#050505] border border-exec-border rounded-none overflow-hidden shadow-2xl">
                {/* Desktop View: TABLE */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-[#111]">
                            <tr>
                                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Nombre / Contacto
                                </th>
                                <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Asist.
                                </th>
                                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Certificado / Pago
                                </th>
                                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Estado Sinc.
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#0A0A0A] divide-y divide-[#1F1F1F]">
                            {filteredParticipants.map(participant => {
                                const isAttended = getAttendanceStatus(participant.id, participant.attended);
                                const hasChanged = attendanceChanges.hasOwnProperty(participant.id);

                                return (
                                    <tr 
                                        key={participant.id} 
                                        className={`group hover:bg-[#111] transition-colors cursor-pointer ${hasChanged ? 'bg-amber-500/5' : ''}`}
                                        onClick={() => toggleAttendance(participant.id, participant.attended)}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-none bg-exec-blue/10 flex-shrink-0 flex items-center justify-center text-exec-blue font-black text-[10px] border border-exec-blue/20 overflow-hidden shadow-sm">
                                                    {participant.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white truncate uppercase tracking-tight">{participant.full_name}</p>
                                                    <p className="text-[10px] text-gray-600 font-bold truncate tracking-widest mt-0.5">{participant.email || 'SIN EMAIL'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <div className={`w-6 h-6 mx-auto rounded-none border-2 flex items-center justify-center transition-all ${isAttended
                                                ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                : 'border-[#1F1F1F] bg-black'
                                            }`}>
                                                {isAttended && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] rounded-none border w-fit ${participant.category === 'organizador' ? 'bg-zinc-800/40 text-zinc-400 border-zinc-700/30' :
                                                    participant.category === 'ponente' ? 'bg-exec-blue/10 text-exec-blue border-exec-blue/20' :
                                                        'bg-[#111] text-gray-600 border-[#222]'
                                                    }`}>
                                                    {getCategoryLabel(participant.category)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {participant.wants_certificate && (
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-none uppercase tracking-widest border ${
                                                    participant.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    participant.payment_status === 'exempt' ? 'bg-exec-blue/10 text-exec-blue border-exec-blue/20' :
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {participant.payment_status === 'paid' ? 'PAGADO' : participant.payment_status === 'exempt' ? 'EXONERADO' : 'PENDIENTE'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            {hasChanged && (
                                                <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest flex items-center justify-end gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-none bg-amber-500 animate-pulse" />
                                                    PENDIENTE
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: COMPACT CARDS */}
                <div className="md:hidden space-y-px bg-exec-border">
                    {filteredParticipants.map(participant => {
                        const isAttended = getAttendanceStatus(participant.id, participant.attended);
                        const hasChanged = attendanceChanges.hasOwnProperty(participant.id);

                        return (
                            <div
                                key={participant.id}
                                onClick={() => toggleAttendance(participant.id, participant.attended)}
                                className={`flex items-center justify-between p-3 bg-[#0A0A0A] active:bg-exec-blue/5 transition-all select-none ${hasChanged ? 'border-l-2 border-amber-500' : ''}`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-8 h-8 shrink-0 rounded-none border flex items-center justify-center transition-all ${isAttended
                                        ? 'bg-emerald-600 border-emerald-400'
                                        : 'border-[#1F1F1F] bg-black'
                                    }`}>
                                        {isAttended && <Check className="w-5 h-5 text-white stroke-[3px]" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-white truncate uppercase">{participant.full_name}</p>
                                        <p className="text-[9px] text-gray-600 font-bold truncate tracking-widest uppercase">{getCategoryLabel(participant.category)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                    {participant.wants_certificate && (
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-none uppercase tracking-tighter border ${
                                            participant.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            participant.payment_status === 'exempt' ? 'bg-exec-blue/10 text-exec-blue border-exec-blue/20' :
                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                            {participant.payment_status === 'paid' ? 'PAG.' : participant.payment_status === 'exempt' ? 'EXO.' : 'PEND.'}
                                        </span>
                                    )}
                                    {hasChanged && (
                                        <div className="w-1.5 h-1.5 rounded-none bg-amber-500 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {filteredParticipants.length === 0 && (
                <div className="text-center py-20 bg-[#050505] rounded-none border border-dashed border-[#1F1F1F]">
                    <Users className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                    <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest">
                        SIN COINCIDENCIAS EN LA BASE DE DATOS
                    </h3>
                </div>
            )}
        </div>
    );
}
