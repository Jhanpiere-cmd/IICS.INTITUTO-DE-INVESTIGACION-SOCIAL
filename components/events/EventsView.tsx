import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Calendar, Plus, BarChart3, MapPin, Users, TrendingUp,
    Search, Filter, Clock, CheckCircle, XCircle, Loader2, Sparkles, FileText, Image,
    Radio, List, Settings, DollarSign, Timer
} from 'lucide-react';

const format12h = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
};

function EventCountdown({ scheduledDate, startTime, endTime, status, isLive, minimal = false }: { scheduledDate: string, startTime: string, endTime: string | null, status: string, isLive?: boolean, minimal?: boolean }) {
    const [state, setState] = useState<{ type: 'waiting' | 'running' | 'finished', timeLeft?: { d: number, h: number, m: number } } | null>(null);

    useEffect(() => {
        const calculate = () => {
            if (!scheduledDate) return;
            const dateOnly = scheduledDate.split('T')[0];
            const [year, month, day] = dateOnly.split('-').map(Number);
            const [startH, startM] = (startTime || '00:00').split(':').map(Number);
            
            const start = new Date(year, month - 1, day, startH, startM, 0);
            
            const end = endTime
                ? (() => {
                    const [endH, endM] = endTime.split(':').map(Number);
                    return new Date(year, month - 1, day, endH, endM, 0);
                  })()
                : new Date(start.getTime() + 2 * 60 * 60 * 1000);

            const now = new Date();
            const isFinishedStatus = ['completado', 'finalizado', 'completed', 'finished'].includes((status || '').toLowerCase());
            const hasPassedEnd = now.getTime() >= end.getTime();
            const hasStarted = now.getTime() >= start.getTime();
            const isRunningTime = hasStarted && !hasPassedEnd;
            const shouldBeFinished = hasPassedEnd || (isFinishedStatus && !isRunningTime);

            if (shouldBeFinished) {
                setState({ type: 'finished' });
                return;
            }

            const diffToStart = start.getTime() - now.getTime();

            if (diffToStart <= 0) {
                setState({ type: 'running' });
                return;
            }

            setState({
                type: 'waiting',
                timeLeft: {
                    d: Math.floor(diffToStart / (1000 * 60 * 60 * 24)),
                    h: Math.floor((diffToStart / (1000 * 60 * 60)) % 24),
                    m: Math.floor((diffToStart / (1000 * 60)) % 60)
                }
            });
        };

        calculate();
        const timer = setInterval(calculate, 60000);
        return () => clearInterval(timer);
    }, [scheduledDate, startTime, endTime, status]);

    if (isLive) {
        return (
            <div className="bg-red-600 backdrop-blur-sm px-2 py-0.5 rounded-sm border border-red-400/50 flex items-center gap-1.5 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.7)] group">
                <div className="relative">
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"></div>
                    <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75"></div>
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.25em] drop-shadow-sm">LIVE</span>
            </div>
        );
    }

    if (!state) return null;

    if (minimal && state.type === 'waiting' && state.timeLeft) {
        const { d, h, m } = state.timeLeft;
        const text = d > 0 ? `Faltan ${d}d ${h}h` : h > 0 ? `Faltan ${h}h ${m}m` : `Faltan ${m}m`;
        return (
            <div className="flex items-center gap-1.5 text-[8px] font-black text-exec-blue uppercase tracking-widest mt-0.5">
                <Timer className="w-2.5 h-2.5 animate-pulse" />
                <span>{text}</span>
            </div>
        );
    }

    if (state.type === 'finished') {
        return (
            <div className="bg-red-900/40 backdrop-blur-sm px-2 py-0.5 rounded-sm border border-red-500/30 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <span className="text-[10px] font-bold text-red-200 uppercase tracking-tight">EVENTO FINALIZADO</span>
            </div>
        );
    }

    if (state.type === 'running') {
        return (
            <div className="bg-emerald-600/90 backdrop-blur-sm px-2 py-0.5 rounded-sm border border-emerald-400/30 flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                <span className="text-[10px] font-bold text-white uppercase tracking-tight">EVENTO EN CURSO</span>
            </div>
        );
    }

    const { timeLeft } = state;
    if (!timeLeft) return null;

    return (
        <div className="bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 rounded-sm border border-blue-400/30 flex items-center gap-1.5 animate-pulse-slow">
            <Clock className="w-2.5 h-2.5 text-white" />
            <span className="text-[10px] font-bold text-white tracking-tight">
                FALTA: {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m
            </span>
        </div>
    );
}

interface Event {
    id: string;
    title: string;
    description: string;
    event_type: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location: string;
    is_online: boolean;
    status: 'planificado' | 'en_curso' | 'completado' | 'cancelado';
    budget_estimated: number;
    budget_actual: number;
    created_at: string;
    cover_image_url?: string;
    event_participants?: { payment_amount: number; payment_status: string }[];
    registration_slug?: string;
    registration_form?: any[];
    registration_enabled?: boolean;
    meeting_url?: string;
    eventos_en_vivo?: { estado_transmision: string }[];
    total_revenue?: number;
    instructor_name?: string;
    instructor_role?: string;
}

interface EventMetrics {
    total_events: number;
    completed_events: number;
    total_participants: number;
    total_budget: number;
}

import { AnnualPlanner } from './AnnualPlanner';
import { EventCreatorAI } from './EventCreatorAI';
import { EventDetail } from './EventDetail';
import { LiveEventProgram } from './LiveEventProgram';
import { ProgramCreator } from './ProgramCreator';
import { EventIntelligenceView } from './EventIntelligenceView';

export function EventsView() {
    const { user } = useAuth();
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [metrics, setMetrics] = useState<EventMetrics>({
        total_events: 0,
        completed_events: 0,
        total_participants: 0,
        total_budget: 0
    });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'explorer' | 'intelligence'>('explorer');
    const [filterType, setFilterType] = useState<string>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPlanner, setShowPlanner] = useState(false);

    // Creator state
    const [showCreator, setShowCreator] = useState(false);
    const [creatorMode, setCreatorMode] = useState<'ai' | 'manual'>('ai');
    
    // Live Event state
    const [showLiveEvent, setShowLiveEvent] = useState(false);
    const [showProgramCreator, setShowProgramCreator] = useState(false);
    const [selectedEventForLive, setSelectedEventForLive] = useState<Event | null>(null);

    // Sincronizar estado del panel con la URL (Moderador)
    useEffect(() => {
        const syncModeratorState = async () => {
            if (eventId) {
                // Primero buscar en los eventos ya cargados (más rápido)
                let foundEvent = events.find(e => e.id === eventId);
                
                // Si no está en la lista (por filtros o carga parcial), buscarlo directamente
                if (!foundEvent) {
                    console.log(`[STABILITY] Evento ${eventId} no encontrado en lista local. Consultando DB...`);
                    const { data, error } = await supabase
                        .from('events')
                        .select('*, event_participants(count), eventos_en_vivo(estado_transmision)')
                        .eq('id', eventId)
                        .single();
                    
                    if (!error && data) {
                        foundEvent = data;
                    }
                }

                if (foundEvent) {
                    // Si el moderador está activo, cerramos el detalle del evento para evitar conflictos
                    setSelectedEvent(null);
                    setSelectedEventForLive(foundEvent);
                    setShowLiveEvent(true);
                } else {
                    console.error('[STABILITY] No se pudo encontrar el evento para moderar');
                    navigate('/admin/events');
                }
            } else {
                setShowLiveEvent(false);
                setSelectedEventForLive(null);
            }
        };

        syncModeratorState();
    }, [eventId, events.length > 0]); // Solo re-ejecutar si cambia el ID o si la lista de eventos se carga inicialmente

    useEffect(() => {
        loadEvents();
        loadMetrics();

        // Suscripción Realtime para Estado LIVE
        const channel = supabase
            .channel('public:eventos_en_vivo_status')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'eventos_en_vivo' },
                () => {
                    loadEvents(); // Recargar eventos para actualizar insignias LIVE
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [filterType]);

    async function loadEvents() {
        setLoading(true);
        try {
            let query = supabase
                .from('events')
                .select('*, event_participants(payment_amount, payment_status), eventos_en_vivo(estado_transmision)', { count: 'exact' })
                .order('scheduled_date', { ascending: false });

            if (filterType !== 'todos') {
                if (filterType === 'academicos') {
                    query = query.in('event_type', ['webinar', 'conversatorio', 'taller']);
                } else if (filterType === 'promocionales') {
                    query = query.in('event_type', ['feria', 'visita_aula', 'transmision']);
                } else if (filterType === 'recaudacion') {
                    query = query.in('event_type', ['pollada', 'curso_extracurricular']);
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            
            // Calculate total revenue per event
            const eventsWithRevenue = (data || []).map(event => {
                const revenue = event.event_participants?.reduce((sum: number, p: any) => {
                    if (['paid', 'completed'].includes(p.payment_status)) {
                        return sum + (Number(p.payment_amount) || 0);
                    }
                    return sum;
                }, 0) || 0;
                return { ...event, total_revenue: revenue };
            });

            setEvents(eventsWithRevenue);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadMetrics() {
        try {
            const { count: totalEvents } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true });

            const { count: completedEvents } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completado');

            const { count: totalParticipants } = await supabase
                .from('event_participants')
                .select('*', { count: 'exact', head: true });

            const { data: paymentData } = await supabase
                .from('event_participants')
                .select('payment_amount')
                .in('payment_status', ['paid', 'completed']);

            const totalBudget = paymentData?.reduce((sum, p) =>
                sum + (Number(p.payment_amount) || 0), 0) || 0;

            setMetrics({
                total_events: totalEvents || 0,
                completed_events: completedEvents || 0,
                total_participants: totalParticipants || 0,
                total_budget: totalBudget
            });
        } catch (error) {
            console.error('Error loading metrics:', error);
        }
    }

    const getEventTypeLabel = (type: string) => {
        const labels = {
            webinar: 'Webinar',
            conversatorio: 'Conversatorio',
            taller: 'Taller',
            feria: 'Feria',
            visita_aula: 'Visita a Aula',
            transmision: 'Transmisión',
            pollada: 'Pollada',
            curso_extracurricular: 'Curso Extracurricular',
            otro: 'Otro'
        };
        return labels[type as keyof typeof labels] || type;
    };

    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
    };

    const handleEventUpdate = () => {
        loadEvents();
        loadMetrics();
    };

    const handleEditEvent = (event: Event) => {
        setSelectedEvent(null);
        setShowCreator(true);
        setCreatorMode('manual');
        setEventToEdit(event);
    };

    const handleOpenLiveEvent = (event: Event) => {
        navigate(`/events/moderator/${event.id}`);
    };

    const handleOpenProgramCreator = (event: Event) => {
        setSelectedEventForLive(event);
        setShowProgramCreator(true);
    };

    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

    const filteredEvents = events.filter(event => {
        if (!searchQuery.trim()) return true;
        const search = searchQuery.toLowerCase().trim();
        return (event.title || '').toLowerCase().includes(search) || 
               (event.description || '').toLowerCase().includes(search) ||
               (event.location || '').toLowerCase().includes(search);
    });

    const openCreator = (mode: 'ai' | 'manual') => {
        setCreatorMode(mode);
        setShowCreator(true);
    };

    const [showMobileMetrics, setShowMobileMetrics] = useState(false);

    return (
        <div className="flex h-screen bg-black relative">
            {showPlanner && (
                <AnnualPlanner
                    events={events}
                    metrics={metrics}
                    onClose={() => setShowPlanner(false)}
                    onEventClick={handleEventClick}
                    onUpdate={handleEventUpdate}
                    onCreateEvent={() => openCreator('manual')}
                />
            )}

            {showCreator && (
                <EventCreatorAI
                    mode={creatorMode}
                    eventToEdit={eventToEdit}
                    onClose={() => {
                        setShowCreator(false);
                        setEventToEdit(null);
                    }}
                    onSuccess={() => {
                        setShowCreator(false);
                        setEventToEdit(null);
                        handleEventUpdate();
                    }}
                />
            )}



            {showProgramCreator && selectedEventForLive && (
                <ProgramCreator
                    key={selectedEventForLive.id}
                    eventId={selectedEventForLive.id}
                    onSave={(programa) => {
                        setShowProgramCreator(false);
                        navigate(`/events/moderator/${selectedEventForLive.id}`);
                    }}
                    onCancel={() => {
                        setShowProgramCreator(false);
                        setSelectedEventForLive(null);
                    }}
                />
            )}

            {showLiveEvent && selectedEventForLive && (
                <LiveEventProgram 
                    eventId={selectedEventForLive.id} 
                    onClose={() => navigate('/admin/events')}
                />
            )}

            {selectedEvent && (
                <EventDetail
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onUpdate={handleEventUpdate}
                    onEdit={handleEditEvent}
                />
            )}

            {showMobileMetrics && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
                    onClick={() => setShowMobileMetrics(false)}
                />
            )}

            {/* Left Main Column */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black">
                {/* ═══ HEADER AREA ═══ */}
                {/* Desktop Header */}
                <div className="hidden md:block px-6 py-2.5 bg-black/80 backdrop-blur-md border-b border-exec-border z-10 sticky top-0">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                                <span className="material-symbols-outlined notranslate text-exec-blue text-3xl" translate="no">event</span>
                                <span>Gestión de <span className="text-exec-blue">Eventos</span></span>
                            </h1>
                            <p className="text-sm text-gray-400">Protocolo de Control y Análisis Corporativo</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex bg-black p-0.5 border border-exec-border mr-4">
                                <button 
                                    onClick={() => setViewMode('explorer')}
                                    className={`px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${viewMode === 'explorer' ? 'bg-exec-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Explorador
                                </button>
                                <button 
                                    onClick={() => setViewMode('intelligence')}
                                    className={`px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${viewMode === 'intelligence' ? 'bg-exec-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Métricas
                                </button>
                            </div>
                            <button
                                onClick={() => setShowPlanner(true)}
                                className="px-4 py-2 bg-[#111] border border-exec-border text-gray-400 hover:text-white hover:border-exec-blue rounded-none text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 group"
                            >
                                <span className="material-symbols-outlined notranslate text-exec-blue text-[18px]" translate="no">calendar_month</span>
                                <span className="hidden sm:inline">Planificación</span>
                            </button>
                            <button
                                onClick={() => openCreator('manual')}
                                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined notranslate text-sm" translate="no">add</span>
                                <span>Nuevo</span>
                            </button>
                            <button
                                onClick={() => openCreator('ai')}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-black border border-exec-border rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group"
                            >
                                <span className="material-symbols-outlined notranslate text-exec-blue text-[20px] group-hover:animate-pulse" translate="no">smart_toy</span>
                                <span>Crear con IA</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Header (Standardized) */}
                <div className="block md:hidden px-4 pt-0 pb-4 bg-black">
                    <section className="flex justify-between items-center bg-[#0A0A0A] border border-[#262626] rounded-none p-4 shadow-subtle">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
                                <span className="material-symbols-outlined notranslate text-exec-blue text-xl" translate="no">event</span>
                            </div>
                            <div>
                                <h1 className="text-sm font-semibold text-white uppercase tracking-tight">GESTIÓN <span className="text-exec-blue">EVENTOS</span></h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button
                                onClick={() => openCreator('ai')}
                                className="px-3 h-10 bg-white hover:bg-gray-100 text-black rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group"
                                title="Crear con IA"
                            >
                                <span className="material-symbols-outlined notranslate text-exec-blue text-[18px]" translate="no">smart_toy</span>
                                <span className="hidden xs:inline">IA</span>
                            </button>
                            <button
                                onClick={() => openCreator('manual')}
                                className="w-10 h-10 flex items-center justify-center bg-exec-blue rounded-none text-white shadow-lg active:scale-95 transition-all shadow-exec-blue/20"
                                title="Nuevo Evento"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </section>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-0 md:pt-2 pb-6 space-y-6 custom-scrollbar bg-[#050505]">
                    {viewMode === 'intelligence' ? (
                        <EventIntelligenceView />
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <div className="relative flex-1 max-w-md w-full">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar eventos..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="exec-input w-full pl-9 pr-4 py-2 text-xs rounded-none border-exec-border focus:border-exec-blue"
                                    />
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none w-full sm:w-auto">
                                    <button
                                        onClick={() => setFilterType('todos')}
                                        className={`px-4 py-1.5 rounded-none text-[10px] font-semibold uppercase tracking-widest transition-all border ${filterType === 'todos'
                                            ? 'bg-[#171717] text-white border-exec-blue shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                            : 'bg-[#0A0A0A] text-gray-500 border-exec-border hover:border-gray-700 hover:text-gray-300'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setFilterType('academicos')}
                                        className={`px-4 py-1.5 rounded-none text-[10px] font-semibold uppercase tracking-widest transition-all border ${filterType === 'academicos'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                            : 'bg-[#0A0A0A] text-gray-500 border-exec-border hover:border-red-900/50 hover:text-red-400'
                                            }`}
                                    >
                                        Académicos
                                    </button>
                                    <button
                                        onClick={() => setFilterType('promocionales')}
                                        className={`px-4 py-1.5 rounded-none text-[10px] font-semibold uppercase tracking-widest transition-all border ${filterType === 'promocionales'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                            : 'bg-[#0A0A0A] text-gray-500 border-exec-border hover:border-blue-900/50 hover:text-blue-400'
                                            }`}
                                    >
                                        Promocionales
                                    </button>
                                    <button
                                        onClick={() => setFilterType('recaudacion')}
                                        className={`px-4 py-1.5 rounded-none text-[10px] font-semibold uppercase tracking-widest transition-all border ${filterType === 'recaudacion'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                            : 'bg-[#0A0A0A] text-gray-500 border-exec-border hover:border-emerald-900/50 hover:text-emerald-400'
                                            }`}
                                    >
                                        Recaudación
                                    </button>
                                </div>
                            </div>

                            {/* Events Grid Section */}
                            <div>
                                <h1 className="text-xs font-black text-gray-500 mb-6 flex items-center gap-3 uppercase tracking-[0.3em]">
                                    Registro Maestro de Actividades
                                </h1>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="relative w-12 h-12">
                                    <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando...</span>
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="text-center py-20 bg-[#0A0A0A] rounded-sm border border-dashed border-exec-border">
                                <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    No hay eventos registrados
                                </h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                    Utiliza el asistente de IA o el modo manual para crear tu primer evento y visualizarlo aquí.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* DESKTOP VIEW */}
                                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            onClick={() => handleEventClick(event)}
                                            className="exec-card group relative h-full flex flex-col overflow-hidden cursor-pointer rounded-none border-exec-border/60 hover:border-exec-blue/50 transition-all duration-300"
                                        >
                                            <div className="w-full aspect-[4/3] bg-[#050505] overflow-hidden flex items-center justify-center border-b border-exec-border relative group-hover:bg-black transition-colors">
                                                {event.cover_image_url ? (
                                                    <img
                                                        src={event.cover_image_url}
                                                        alt={event.title}
                                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                        <Image className="w-8 h-8 text-exec-slate/20" />
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Sin flyer oficial</span>
                                                    </div>
                                                )}
                                                
                                                <div className="absolute top-2 right-2 flex gap-1.5">
                                                     <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border backdrop-blur-md rounded-sm ${
                                                         event.status === 'planificado' ? 'border-exec-blue/50 text-exec-blue bg-exec-blue/5' :
                                                         event.status === 'en_curso' ? 'border-red-500/50 text-red-400 bg-red-500/5' :
                                                         'border-emerald-500/50 text-emerald-400 bg-emerald-500/5'
                                                     }`}>
                                                         {event.status}
                                                     </span>
                                                </div>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col bg-[#0A0A0A]">
                                                <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-tight uppercase tracking-tight group-hover:text-exec-blue transition-colors">
                                                    {event.title}
                                                </h3>
                                                <p className="text-gray-500 text-[11px] mb-4 line-clamp-2 flex-1 font-medium leading-relaxed uppercase tracking-normal opacity-70">
                                                    {event.description || 'Sin descripción técnica disponible.'}
                                                </p>

                                                <div className="space-y-2.5 mt-auto pt-4 border-t border-exec-border/50">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                                                <Calendar className="w-3 h-3 text-exec-blue" />
                                                                <span>{new Date(event.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                                                <Clock className="w-3 h-3 text-exec-blue/50" />
                                                                <span>{format12h(event.start_time)} {event.end_time ? `- ${format12h(event.end_time)}` : ''}</span>
                                                            </div>
                                                            <EventCountdown scheduledDate={event.scheduled_date} startTime={event.start_time} endTime={event.end_time} status={event.status} minimal={true} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-none bg-[#050505] border border-exec-border transition-colors group/stat">
                                                                <Users className="w-3 h-3 text-exec-blue" />
                                                                <span className="text-[10px] font-black text-white">
                                                                    {event.event_participants?.length || 0}
                                                                </span>
                                                            </div>
                                                            {event.total_revenue !== undefined && event.total_revenue > 0 && (
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-none bg-emerald-500/5 border border-emerald-500/20 transition-colors">
                                                                    <DollarSign className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-[10px] font-black text-emerald-500">
                                                                        S/. {event.total_revenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                                        <MapPin className="w-3 h-3 text-exec-blue/50" />
                                                        <span className="line-clamp-1">{event.is_online ? 'Virtual Transm.' : event.location || 'Local a definir'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* MOBILE VIEW (2 Columns - Visual Focus) */}
                                <div className="grid md:hidden grid-cols-2 gap-3 pb-24">
                                    {filteredEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            onClick={() => handleEventClick(event)}
                                            className="group relative flex flex-col overflow-hidden cursor-pointer bg-[#0A0A0A] border border-[#262626] rounded-none active:scale-[0.98] transition-all h-full"
                                        >
                                            <div className="relative w-full aspect-[4/5] bg-[#050505] overflow-hidden flex items-center justify-center border-b border-exec-border">
                                                {event.cover_image_url ? (
                                                    <img
                                                        src={event.cover_image_url}
                                                        alt=""
                                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#0A0A0A] to-black flex items-center justify-center">
                                                        <Image className="w-6 h-6 text-gray-800 opacity-30" />
                                                    </div>
                                                )}
                                                
                                                <div className="absolute top-2 right-2 flex flex-col gap-2">
                                                     <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenProgramCreator(event);
                                                        }}
                                                        className="w-7 h-7 bg-black/80 flex items-center justify-center text-white border border-[#262626] backdrop-blur-md"
                                                    >
                                                        <List size={14} />
                                                    </button>
                                                </div>
                                            </div>
 
                                            <div className="p-3 flex-col flex-1 flex">
                                                <h3 className="text-[10px] leading-tight font-bold text-white line-clamp-2 mb-2 tracking-tight uppercase group-hover:text-exec-blue transition-colors">
                                                    {event.title}
                                                </h3>
 
                                                <div className="mt-auto space-y-1.5 opacity-60">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-2.5 h-2.5 text-exec-blue" />
                                                            <span className="text-[8px] text-gray-300 font-bold uppercase tracking-tighter">
                                                                {new Date(event.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                                <span className="mx-1 opacity-30">|</span>
                                                                {format12h(event.start_time)}
                                                            </span>
                                                        </div>
                                                        <EventCountdown scheduledDate={event.scheduled_date} startTime={event.start_time} endTime={event.end_time} status={event.status} minimal={true} />
                                                    </div>
                                                    
                                                    {event.eventos_en_vivo?.[0]?.estado_transmision === 'en_vivo' && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                                            <span className="text-[8px] text-red-500 font-black uppercase tracking-widest">LIVE</span>
                                                        </div>
                                                     )}
                                                     
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-2.5 h-2.5 text-pink-500/50" />
                                                        <span className="text-[8px] text-gray-500 font-bold uppercase truncate max-w-[80px]">
                                                            {event.is_online ? 'Virtual' : event.location || 'Definir'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-1 border-t border-exec-border/30">
                                                        <div className="flex items-center gap-1">
                                                            <Users className="w-2.5 h-2.5 text-exec-blue" />
                                                            <span className="text-[9px] font-black text-white">{event.event_participants?.length || 0}</span>
                                                        </div>
                                                        {event.total_revenue !== undefined && event.total_revenue > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] font-black text-emerald-500">S/. {event.total_revenue.toFixed(0)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
