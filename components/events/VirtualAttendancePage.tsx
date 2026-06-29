import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, AlertCircle, Loader2, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react';

// Algoritmo de Levenshtein para detección de errores tipográficos
function getLevenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

function calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    return (longer.length - getLevenshteinDistance(longer, shorter)) / longer.length;
}

function calculateScore(input: string, target: string): number {
    const inputWords = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 1);
    const targetWords = target.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 1);
    
    if (inputWords.length === 0) return 0;

    let matchedCount = 0;
    let totalSimilarity = 0;

    for (const iWord of inputWords) {
        let bestWordSim = 0;
        for (const tWord of targetWords) {
            // Exact word match
            if (iWord === tWord) {
                bestWordSim = 1.0;
                break;
            }
            // Fuzzy word match
            const sim = calculateSimilarity(iWord, tWord);
            if (sim > bestWordSim) bestWordSim = sim;
        }

        if (bestWordSim > 0.70) { // Threshold for a single word match
            matchedCount++;
            totalSimilarity += bestWordSim;
        }
    }

    const matchRatio = matchedCount / inputWords.length;
    const avgSim = matchedCount > 0 ? totalSimilarity / matchedCount : 0;
    
    // Penalize slightly if target has many more words than input
    const penalty = Math.min(1.0, inputWords.length / targetWords.length + 0.5);
    
    return matchRatio * avgSim * (inputWords.length === targetWords.length ? 1.0 : penalty);
}

export function VirtualAttendancePage() {
    const { slug } = useParams();
    const [event, setEvent] = useState<any>(null);
    const [fullName, setFullName] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'ambiguous'>('idle');
    const [message, setMessage] = useState('');
    const [matchedParticipant, setMatchedParticipant] = useState<any>(null);
    const [ambiguousMatches, setAmbiguousMatches] = useState<any[]>([]);

    useEffect(() => {
        fetchEvent();
    }, [slug]);

    async function fetchEvent() {
        if (!slug) return;
        const { data, error } = await supabase
            .from('events')
            .select('id, title, description, virtual_attendance_enabled, attendance_code, scheduled_date, start_time, end_time, cover_image_url, organizer_type, location, is_online')
            .eq('registration_slug', slug)
            .single();

        if (error || !data) {
            const { data: data2 } = await supabase
                .from('events')
                .select('id, title, description, virtual_attendance_enabled, attendance_code, scheduled_date, start_time, end_time, cover_image_url, organizer_type, location, is_online')
                .eq('report_slug', slug)
                .single();
            
            if (data2) setEvent(data2);
            else {
                setStatus('error');
                setMessage('El evento no existe o la URL es inválida.');
            }
        } else {
            setEvent(data);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!fullName.trim()) return;
        if (event?.attendance_code && accessCode !== event.attendance_code) {
            setStatus('error');
            setMessage('El código de acceso es incorrecto.');
            return;
        }

        setStatus('loading');
        try {
            const { data: participants, error } = await supabase
                .from('event_participants')
                .select('id, full_name, attended, email')
                .eq('event_id', event.id);

            if (error) throw error;

            const nameToSearch = fullName.trim();
            
            const matches = participants.map(p => {
                return { ...p, score: calculateScore(nameToSearch, p.full_name) };
            }).filter(m => m.score > 0.65)
            .sort((a, b) => b.score - a.score);

            if (matches.length === 0) {
                setStatus('error');
                setMessage('No te encontramos en la lista de inscritos. Asegúrate de escribir tu nombre tal cual te inscribiste.');
            } else if (matches.length === 1 || matches[0].score === 1.0 || (matches[0].score > 0.9 && (matches.length === 1 || matches[0].score - matches[1].score > 0.2))) {
                const bestMatch = matches[0];
                await markAttendance(bestMatch);
            } else {
                setAmbiguousMatches(matches.slice(0, 3));
                setStatus('ambiguous');
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setMessage('Ocurrió un error al procesar tu asistencia.');
        }
    }

    async function markAttendance(participant: any) {
        if (participant.attended) {
            setMatchedParticipant(participant);
            setStatus('success');
            setMessage('Tu asistencia ya había sido registrada previamente.');
            return;
        }

        const { error } = await supabase
            .from('event_participants')
            .update({ attended: true })
            .eq('id', participant.id);

        if (error) {
            setStatus('error');
            setMessage('Error al marcar asistencia en la base de datos.');
        } else {
            setMatchedParticipant(participant);
            setStatus('success');
            setMessage(`¡Asistencia registrada con éxito, ${participant.full_name.split(' ')[0]}!`);
        }
    }

    if (!event && status !== 'error') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-black text-white flex flex-col font-sans tracking-tight overflow-hidden antialiased">
            
            <header className="w-full bg-[#030303] border-b border-[#111] p-3 md:p-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3 md:gap-6">
                    {event?.organizer_type === 'colegio_sociologo_unidad' ? (
                        <>
                            <img src="/certificates/logo-unidad-v2/Logo de la unidad de investigacion, de la facultad de ciencias sociales. sin fondo blanco.png" alt="Unidad" className="h-6 md:h-10 w-auto opacity-90" />
                            <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Colegio" className="h-6 md:h-10 w-auto opacity-90" />
                        </>
                    ) : (
                        <>
                            <img src="/certificates/logo-unc/R.png" alt="UNC" className="h-6 md:h-10 w-auto opacity-90" />
                            <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" className="h-6 md:h-10 w-auto opacity-90" />
                        </>
                    )}
                    <div className="hidden xs:block w-px h-5 md:h-6 bg-[#222]" />
                    <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-5 md:h-9 w-auto opacity-80" />
                </div>
                <div className="hidden sm:flex flex-col items-end shrink-0">
                    <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] text-blue-500 leading-none">SGR-ACS v2.0</span>
                    <span className="text-[6px] md:text-[7px] font-bold text-gray-700 uppercase tracking-widest leading-tight">Control de Eventos</span>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:grid lg:grid-cols-[400px_1fr_400px] overflow-y-auto lg:overflow-hidden">
                
                {/* Columna 1: Flyer (Mobile Order 1) */}
                <div className="order-1 lg:order-1 flex flex-col bg-[#050505] lg:border-r border-[#151515] relative">
                    <div className="relative w-full rounded-lg overflow-hidden border border-white/5 bg-black flex items-center justify-center group flex-shrink-0 lg:flex-shrink p-4 lg:p-4 max-h-[40vh] sm:max-h-[50vh] lg:max-h-[85vh]">
                        {event?.cover_image_url ? (
                            <img 
                                src={event.cover_image_url} 
                                alt={event.title} 
                                className="w-full h-full object-contain transition-transform duration-700 lg:group-hover:scale-[1.03]"
                            />
                        ) : (
                            <UserCheck size={80} className="text-white/5" />
                        )}
                        
                        <div className="absolute top-3 left-3 lg:top-4 lg:left-4 z-10 flex flex-col gap-2">
                             {event?.virtual_attendance_enabled ? (
                                 <span className="px-2 py-0.5 lg:py-1 bg-emerald-500 text-black text-[7px] lg:text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
                                     <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-black rounded-full animate-pulse" /> EN VIVO
                                 </span>
                             ) : (
                                 <span className="px-2 py-0.5 lg:py-1 bg-red-500 text-white text-[7px] lg:text-[8px] font-black uppercase tracking-widest shadow-lg">CERRADO</span>
                             )}
                        </div>
                    </div>
                </div>

                {/* Columna 3: Form (Mobile Order 2) */}
                <div className="order-2 lg:order-3 flex flex-col bg-[#030303] border-t lg:border-t-0 border-[#151515] lg:overflow-y-auto">
                    <div className="p-6 lg:p-10 flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
                        <div className="space-y-8">
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-sm bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                                        <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Confirmar Asistencia</h2>
                                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Beta Access Point</p>
                                    </div>
                                </div>
                                
                                <p className="text-[11px] text-gray-300 font-bold uppercase tracking-wider mb-8 leading-relaxed p-4 bg-blue-900/10 border-l-2 border-blue-600">
                                    Por favor, ingresa tu nombre completo tal como lo hiciste en el formulario de inscripción para asegurar que tu asistencia sea validada correctamente.
                                </p>

                                {status === 'success' ? (
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 lg:p-10 rounded-sm text-center space-y-5 lg:space-y-6 animate-in zoom-in-95 duration-700">
                                        <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
                                        <div className="space-y-1 lg:space-y-2">
                                            <h2 className="text-xl lg:text-2xl font-black uppercase text-emerald-400 tracking-tighter">{message}</h2>
                                            <p className="text-[7px] lg:text-[8px] text-gray-600 font-black uppercase tracking-[0.3em]">Registro Exitoso</p>
                                        </div>
                                        <button 
                                            onClick={() => setStatus('idle')}
                                            className="px-5 py-2.5 lg:px-6 lg:py-3 bg-black border border-[#1A1A1A] text-[7px] lg:text-[8px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                                        >
                                            Nuevo Registro
                                        </button>
                                    </div>
                                ) : status === 'ambiguous' ? (
                                    <div className="space-y-5 lg:space-y-6 animate-in slide-in-from-right-8 duration-500">
                                        <p className="text-[9px] lg:text-[10px] text-gray-600 font-medium uppercase tracking-widest border-l-2 border-amber-500 pl-3">Selecciona tu nombre:</p>
                                        <div className="space-y-2.5 lg:space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {ambiguousMatches.map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => markAttendance(m)}
                                                    className="w-full p-4 bg-black border border-[#151515] rounded-sm text-left hover:border-blue-500/50 transition-all flex items-center justify-between group"
                                                >
                                                    <div className="space-y-0.5">
                                                        <p className="text-[11px] lg:text-xs font-black text-white group-hover:text-blue-400 uppercase tracking-tight">{m.full_name}</p>
                                                        <p className="text-[7px] lg:text-[8px] text-gray-700 font-bold uppercase tracking-widest">{m.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3")}</p>
                                                    </div>
                                                    <ArrowRight size={14} className="text-gray-800 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setStatus('idle')}
                                            className="text-[7px] lg:text-[8px] font-black text-gray-700 uppercase tracking-widest hover:text-white"
                                        >
                                            ← Reintentar
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                                    Nombre Completo
                                                    <span className="text-blue-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Ej: Juan Pérez García"
                                                    className="w-full bg-[#1A1A1A] border-2 border-[#333] focus:border-blue-500 text-white p-4 rounded-sm outline-none transition-all placeholder:text-gray-600 font-bold text-sm shadow-xl focus:shadow-blue-500/20"
                                                    disabled={status === 'success' || status === 'loading'}
                                                    autoFocus
                                                />
                                            </div>
                
                                            {event?.attendance_code && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                                        Token de Acceso
                                                        <span className="text-blue-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={accessCode}
                                                        onChange={(e) => setAccessCode(e.target.value)}
                                                        placeholder="••••••"
                                                        className="w-full bg-[#1A1A1A] border-2 border-[#333] focus:border-blue-500 text-white p-4 rounded-sm outline-none transition-all text-center tracking-[0.5em] font-bold text-lg shadow-xl focus:shadow-blue-500/20"
                                                        disabled={status === 'success' || status === 'loading'}
                                                    />
                                                </div>
                                            )}
                                        </div>
                
                                        {status === 'error' && (
                                            <div className="p-3 lg:p-4 bg-red-500/5 border border-red-500/10 rounded-sm flex items-start gap-3 lg:gap-4 animate-in shake">
                                                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                                <p className="text-[9px] lg:text-[10px] font-black text-red-200 uppercase tracking-tight">{message}</p>
                                            </div>
                                        )}
                
                                        <button
                                            type="submit"
                                            disabled={status === 'loading' || !event?.virtual_attendance_enabled}
                                            className={`w-full py-5 lg:py-6 rounded-sm flex items-center justify-center gap-3 lg:gap-4 text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] transition-all group ${
                                                !event?.virtual_attendance_enabled 
                                                ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' 
                                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/20'
                                            }`}
                                        >
                                            {status === 'loading' ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    CONFIRMAR
                                                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </section>
                            
                            <div className="flex justify-center opacity-10">
                                <span className="text-[6px] lg:text-[7px] font-black uppercase tracking-[1em] text-gray-600">SGR.ACS.SYSTEM</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna 2: Info (Mobile Order 3) */}
                <div className="order-3 lg:order-2 flex flex-col bg-black lg:bg-[#080808] border-t lg:border-t-0 lg:border-r border-[#151515] overflow-y-auto lg:overflow-hidden">
                    <div className="p-6 md:p-8 lg:p-10 space-y-6 lg:space-y-8">
                        
                        <div className="space-y-3 lg:space-y-4">
                            <div className="flex items-center gap-4">
                                {event?.scheduled_date && (
                                    <div className="flex flex-col">
                                        <label className="text-[7px] font-black text-gray-700 uppercase tracking-[0.3em]">Fecha</label>
                                        <p className="text-[10px] lg:text-[11px] font-black text-blue-500 uppercase tracking-tight">
                                            {(() => {
                                                const [year, month, day] = event.scheduled_date.split('-');
                                                const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                                                return `${parseInt(day)} DE ${months[parseInt(month) - 1]} DE ${year}`;
                                            })()}
                                        </p>
                                    </div>
                                )}
                                <div className="w-px h-5 lg:h-6 bg-[#222]" />
                                {event?.start_time && (
                                    <div className="flex flex-col">
                                        <label className="text-[7px] font-black text-gray-700 uppercase tracking-[0.3em]">Hora</label>
                                        <p className="text-[10px] lg:text-[11px] font-black text-white">{event.start_time} HRS</p>
                                    </div>
                                )}
                                <div className="w-px h-5 lg:h-6 bg-[#222]" />
                                <div className="flex flex-col">
                                    <label className="text-[7px] font-black text-gray-700 uppercase tracking-[0.3em]">Modalidad</label>
                                    <p className="text-[10px] lg:text-[11px] font-black text-emerald-500 uppercase tracking-tight">
                                        {event?.is_online ? 'VIRTUAL' : 'PRESENCIAL'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black uppercase tracking-tighter leading-[0.88] text-white">
                                    {event?.title}
                                </h1>
                                {event?.location && !event?.is_online && (
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{event.location}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="h-0.5 w-8 lg:w-10 bg-blue-600" />
                            <div className="space-y-2">
                                <h3 className="text-[7px] lg:text-[8px] font-black text-gray-600 uppercase tracking-[0.5em]">Resumen del Evento</h3>
                                <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-medium line-clamp-[10] lg:line-clamp-[20]">
                                    {event?.description}
                                </p>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="pt-4 lg:pt-6 border-t border-[#111]">
                            <div className="p-3 lg:p-4 bg-[#050505] border border-[#111] rounded-sm flex items-center gap-3 lg:gap-4 group">
                                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                                    <ShieldCheck className="text-blue-500" size={14} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[7.5px] lg:text-[8px] text-gray-300 font-black uppercase tracking-[0.1em] italic">"Esperamos que lo disfruten"</p>
                                    <span className="text-[5px] lg:text-[6px] font-black text-gray-700 uppercase tracking-widest">Atte. ACS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
