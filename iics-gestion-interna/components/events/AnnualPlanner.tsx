import React, { useState } from 'react';
import { X, Calendar, Target, Users, TrendingUp, BarChart3, ChevronRight } from 'lucide-react';
import { CalendarViewNew } from '../calendar/CalendarViewNew';
import { YearlyView } from '../calendar/YearlyView';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Event {
    id: string;
    title: string;
    event_type: string;
    scheduled_date: string;
    status: string;
    created_at?: string;
    event_participants?: { count: number }[];
}

interface EventMetrics {
    total_events: number;
    completed_events: number;
    total_participants: number;
    total_budget: number;
}

interface AnnualPlannerProps {
    onClose: () => void;
    events: Event[];
    metrics?: EventMetrics;
    onEventClick: (event: Event) => void;
    onUpdate: () => void;
    onCreateEvent: () => void;
}

export function AnnualPlanner({ onClose, events, metrics, onEventClick, onUpdate, onCreateEvent }: AnnualPlannerProps) {
    const [showYearView, setShowYearView] = useState(false);
    const academicEvents = events.filter(e => ['webinar', 'conversatorio', 'taller', 'curso_extracurricular'].includes(e.event_type || '')).length;
    const academicGoal = 20; // Example goal

    // Prepare data for the chart
    const chartData = events
        .filter(e => e.status === 'completado' || e.status === 'en_curso')
        .slice(0, 10) // Limit to 10 recents
        .map(e => ({
            name: e.title.length > 15 ? e.title.substring(0, 15) + '...' : e.title,
            participants: e.event_participants?.[0]?.count || 0,
            fullTitle: e.title
        }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-[#262626] overflow-hidden custom-scrollbar">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-exec-blue" />
                            Planificación Anual 2026
                        </h2>
                        <p className="text-sm text-gray-500">Visualización estratégica de metas y recursos - {events.length} eventos</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowYearView(!showYearView)}
                            className={`px-4 py-2 rounded-none font-medium transition-colors flex items-center gap-2 border ${showYearView
                                ? 'bg-exec-blue/20 text-exec-blue border-exec-blue/30'
                                : 'bg-[#1A1A1A] text-gray-400 border-[#262626] hover:text-white'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            {showYearView ? 'Vista Mensual' : 'Vista Anual'}
                        </button>

                        <button
                            onClick={onCreateEvent}
                            className="px-4 py-2 bg-exec-blue text-black rounded-none hover:bg-blue-400 transition-colors flex items-center gap-2 shadow-lg shadow-exec-blue/20 font-bold uppercase text-[10px] tracking-widest"
                        >
                            <Target className="w-4 h-4" />
                            Nuevo Evento
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[#1A1A1A] rounded-full transition-colors ml-2"
                        >
                            <X className="w-6 h-6 text-gray-500 hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-[#111] p-4 rounded-none border border-[#262626] relative overflow-hidden group hover:border-exec-blue/30 transition-colors">
                            <div className="relative z-10">
                                <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Total Eventos</div>
                                <div className="text-3xl font-bold text-white">{events.length}</div>
                                <div className="text-xs text-exec-blue mt-1">Registrados en 2026</div>
                            </div>
                            <Calendar className="absolute right-2 bottom-2 w-16 h-16 text-exec-blue/10 group-hover:text-exec-blue/20 transition-colors" />
                        </div>
                        <div className="bg-[#111] p-4 rounded-none border border-[#262626] relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                            <div className="relative z-10">
                                <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Completados</div>
                                <div className="text-3xl font-bold text-white">
                                    {events.filter(e => e.status === 'completado').length}
                                </div>
                                <div className="text-xs text-emerald-400 mt-1">Finalizados exitosamente</div>
                            </div>
                            <Target className="absolute right-2 bottom-2 w-16 h-16 text-emerald-900/10 group-hover:text-emerald-900/20 transition-colors" />
                        </div>
                        <div className="bg-[#111] p-4 rounded-none border border-[#262626] relative overflow-hidden group hover:border-exec-blue/30 transition-colors">
                            <div className="relative z-10">
                                <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Planificados</div>
                                <div className="text-3xl font-bold text-white">
                                    {events.filter(e => e.status === 'planificado').length}
                                </div>
                                <div className="text-xs text-exec-blue mt-1">En Cola de Espera</div>
                            </div>
                            <Users className="absolute right-2 bottom-2 w-16 h-16 text-exec-blue/10 group-hover:text-exec-blue/20 transition-colors" />
                        </div>
                        <div className="bg-[#111] p-4 rounded-none border border-[#262626] relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                            <div className="relative z-10">
                                <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">En Curso</div>
                                <div className="text-3xl font-bold text-white">
                                    {events.filter(e => e.status === 'en_curso').length}
                                </div>
                                <div className="text-xs text-amber-400 mt-1">Activos ahora</div>
                            </div>
                            <TrendingUp className="absolute right-2 bottom-2 w-16 h-16 text-amber-900/10 group-hover:text-amber-900/20 transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Calendar Section (Span 2) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#111] rounded-none border border-[#262626] p-6 shadow-sm min-h-[600px]">
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 border-b border-[#1F1F1F] pb-4">
                                    <Calendar className="w-5 h-5 text-exec-blue" />
                                    {showYearView ? 'Vista Anual 2026' : 'Calendario Global 2026'}
                                </h3>
                                <div className="h-full">
                                    {showYearView ? (
                                        <YearlyView
                                            events={events}
                                            onMonthClick={() => setShowYearView(false)}
                                        />
                                    ) : (
                                        <div className="dark-calendar-wrapper">
                                            <CalendarViewNew hideHeader={true} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Side Column: Next Events & Goals */}
                        <div className="space-y-6">
                            {/* Goals / Resources Visualization */}
                            <div className="bg-[#111] rounded-sm border border-exec-border p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 border-b border-[#1F1F1F] pb-4">
                                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                                    Metas y Recursos
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-xs mb-2 uppercase tracking-wide font-medium">
                                            <span className="text-gray-400">Saldo recaudado</span>
                                            <span className="text-white">S/. {metrics?.total_budget.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="w-full bg-[#1A1A1A] rounded-none h-1.5 overflow-hidden">
                                            <div className="bg-exec-blue h-1.5 rounded-none" style={{ width: `${Math.min(((metrics?.total_budget || 0) / 10000) * 100, 100)}%` }}></div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1 text-right">Meta Ref: S/ 10,000</p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-3 uppercase tracking-wide font-medium">
                                            <span className="text-gray-400">Participación por Evento</span>
                                            <span className="text-white">{metrics?.total_participants || 0} Total</span>
                                        </div>

                                        <div className="h-40 w-full">
                                            {chartData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={chartData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                                                        <XAxis
                                                            dataKey="name"
                                                            tick={{ fontSize: 10, fill: '#6B7280' }}
                                                            interval={0}
                                                            height={40}
                                                            tickLine={false}
                                                            axisLine={false}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: '#1A1A1A' }}
                                                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '0px', color: '#fff' }}
                                                            itemStyle={{ color: '#0088FF' }}
                                                            labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                                        />
                                                        <Bar
                                                            dataKey="participants"
                                                            fill="#0088FF"
                                                            radius={[0, 0, 0, 0]}
                                                            name="Asistentes"
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-gray-600 text-xs italic border border-dashed border-gray-800 rounded-sm">
                                                    Sin datos de participación
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-2 uppercase tracking-wide font-medium">
                                            <span className="text-gray-400">Eventos Académicos</span>
                                            <span className="text-white">{academicEvents} / {academicGoal}</span>
                                        </div>
                                        <div className="w-full bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min((academicEvents / academicGoal) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-[#1F1F1F]">
                                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Recursos Disponibles</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-sm border border-transparent hover:border-exec-border transition-colors cursor-pointer group">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                                                    <span className="text-sm text-gray-300">Staff Disponible</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-sm border border-transparent hover:border-exec-border transition-colors cursor-pointer group">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                                                    <span className="text-sm text-gray-300">Sponsors ({events.filter(e => e.event_type === 'recaudacion').length})</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Events List (Compact) */}
                        <div className="bg-[#111] rounded-sm border border-exec-border p-6 shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                            <h3 className="text-lg font-semibold text-white mb-4">Próximos</h3>
                            <div className="space-y-2">
                                {events.slice(0, 5).map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className="w-full text-left p-3 rounded-sm border border-[#1F1F1F] bg-[#161616] hover:bg-[#1A1A1A] hover:border-indigo-500/30 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-medium text-gray-200 text-sm line-clamp-1 group-hover:text-indigo-300 transition-colors">{event.title}</div>
                                            <span className={`px-1 py-0.5 rounded-[2px] text-[9px] uppercase font-bold tracking-wider ${event.status === 'completado' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-gray-800 text-gray-400'
                                                }`}>
                                                {event.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            <span>
                                                {event.scheduled_date && !isNaN(new Date(event.scheduled_date).getTime())
                                                    ? new Date(event.scheduled_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                                                    : 'TBD'}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
