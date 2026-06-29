import React, { useState, useEffect } from 'react';
import { 
    Target, Users, TrendingUp, CheckCircle, DollarSign, 
    Settings, BarChart3, PieChart as PieChartIcon, 
    ArrowRight, ArrowUpRight, ArrowDownRight, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

interface GeneralMetrics {
    totalEvents: number;
    totalParticipants: number;
    totalAttended: number;
    totalPaid: number;
    totalRevenue: number;
}

interface EventPerformance {
    id: string;
    title: string;
    date: string;
    participants: number;
    attended: number;
    paid: number;
    revenue: number;
}

export function EventIntelligenceView() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<GeneralMetrics>({
        totalEvents: 0,
        totalParticipants: 0,
        totalAttended: 0,
        totalPaid: 0,
        totalRevenue: 0
    });
    const [eventPerformances, setEventPerformances] = useState<EventPerformance[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [annualGoal, setAnnualGoal] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sgr_event_annual_goal');
            return saved ? parseInt(saved) : 1000;
        }
        return 1000;
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const currentYear = new Date().getFullYear();
            const startOfYear = `${currentYear}-01-01`;

            // 1. Load events
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id, title, scheduled_date')
                .gte('scheduled_date', startOfYear)
                .order('scheduled_date', { ascending: false });

            if (eventsError) throw eventsError;
            if (!events) return;

            const eventIds = events.map(e => e.id);

            // 2. Load participants for all events
            const { data: participants, error: pError } = await supabase
                .from('event_participants')
                .select('event_id, attended, payment_status, payment_amount')
                .in('event_id', eventIds);

            if (pError) throw pError;

            // 3. Process General Metrics
            const totalParticipants = participants?.length || 0;
            const totalAttended = participants?.filter(p => p.attended).length || 0;
            const totalPaid = participants?.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').length || 0;
            const totalRevenue = participants?.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed')
                .reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0) || 0;

            setMetrics({
                totalEvents: events.length,
                totalParticipants,
                totalAttended,
                totalPaid,
                totalRevenue
            });

            // 4. Process Individual Event Performance
            const perf = events.map(event => {
                const eventParticipants = participants?.filter(p => p.event_id === event.id) || [];
                const attended = eventParticipants.filter(p => p.attended).length;
                const paidParticipants = eventParticipants.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed');
                const paid = paidParticipants.length;
                const revenue = paidParticipants.reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0);

                return {
                    id: event.id,
                    title: event.title,
                    date: event.scheduled_date,
                    participants: eventParticipants.length,
                    attended,
                    paid,
                    revenue
                };
            });

            setEventPerformances(perf);

        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    }

    const saveGoal = (val: number) => {
        setAnnualGoal(val);
        localStorage.setItem('sgr_event_annual_goal', val.toString());
    };

    const attendanceRate = metrics.totalParticipants > 0 ? (metrics.totalAttended / metrics.totalParticipants) * 100 : 0;
    const paymentRate = metrics.totalParticipants > 0 ? (metrics.totalPaid / metrics.totalParticipants) * 100 : 0;
    const goalProgress = (metrics.totalParticipants / annualGoal) * 100;

    const filteredPerformances = eventPerformances.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
                <div className="w-12 h-12 border-2 border-exec-blue border-t-transparent rounded-full animate-spin"></div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black text-exec-blue uppercase tracking-[0.5em] animate-pulse">Sincronizando Inteligencia</span>
                    <span className="text-[8px] text-gray-600 uppercase tracking-widest">Analizando registros históricos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-[#0A0A0A] border border-exec-border relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                        <Users className="w-10 h-10 text-exec-blue" />
                    </div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Alcance Total</h3>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">{metrics.totalParticipants.toLocaleString()}</span>
                        <span className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Inscritos en {metrics.totalEvents} eventos</span>
                    </div>
                </div>

                <div className="p-6 bg-[#0A0A0A] border border-exec-border relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-10 h-10 text-exec-blue" />
                    </div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Tasa de Conversión</h3>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white tracking-tighter">{attendanceRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-black/50 h-1 mt-4 rounded-none overflow-hidden">
                            <div className="bg-exec-blue h-full" style={{ width: `${attendanceRate}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-[#0A0A0A] border border-exec-border border-emerald-500/10 relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Ingresos Verificados</h3>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-emerald-500 tracking-tighter">S/. {metrics.totalRevenue.toLocaleString()}</span>
                        <div className="flex items-center gap-2 mt-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                            <span className="text-emerald-500/80">{paymentRate.toFixed(1)}% de efectividad</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-[#0A0A0A] border-l-4 border-exec-blue relative group">
                    <h3 className="text-[10px] font-black text-exec-blue uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Target className="w-3 h-3" /> Meta 2026
                    </h3>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">{goalProgress.toFixed(1)}%</span>
                        <div className="w-full bg-black/50 h-1 mt-4 rounded-none overflow-hidden">
                            <div className="bg-exec-blue h-full" style={{ width: `${Math.min(goalProgress, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Analysis Group */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Performance Ledger (Table) */}
                    <div className="bg-[#0A0A0A] border border-exec-border flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-exec-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-tight">Registro de Rendimiento por Evento</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Auditoría detallada de conversión y flujo</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-3.5 h-3.5" />
                                <input 
                                    type="text"
                                    placeholder="FILTRAR POR EVENTO..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-black border border-exec-border pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-exec-blue transition-all"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#050505] border-b border-exec-border">
                                    <tr>
                                        <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Evento / Fecha</th>
                                        <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Inscritos</th>
                                        <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Asistencia</th>
                                        <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Finanzas</th>
                                        <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Rendimiento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-exec-border/30">
                                    {filteredPerformances.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <BarChart3 size={40} strokeWidth={0.5} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">No se encontraron registros</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPerformances.map(event => {
                                            const attendance = event.participants > 0 ? (event.attended / event.participants) * 100 : 0;
                                            return (
                                                <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-4">
                                                        <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-exec-blue transition-colors">{event.title}</p>
                                                        <p className="text-[9px] text-gray-500 uppercase font-medium">{new Date(event.date).toLocaleDateString()}</p>
                                                    </td>
                                                    <td className="p-4 text-center font-black text-white text-xs">{event.participants}</td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-xs font-black text-white">{event.attended}</span>
                                                            <span className="text-[8px] text-gray-500 font-black uppercase">{attendance.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-xs font-black text-emerald-500">S/. {event.revenue.toLocaleString()}</span>
                                                            <span className="text-[8px] text-gray-500 font-black uppercase">{event.paid} Pagos</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {(() => {
                                                            const isHighImpact = (event.participants >= 30) || (event.revenue >= 500);
                                                            const isPromedio = (event.participants >= 20) || (event.revenue >= 250);
                                                            const isRegular = (event.participants >= 10) || (event.revenue >= 50);
                                                            
                                                            if (isHighImpact && attendance >= 50) {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter border rounded-sm border-emerald-500/50 text-emerald-500 bg-emerald-500/5">
                                                                        <ArrowUpRight size={10} /> Alto Impacto
                                                                    </span>
                                                                );
                                                            } else if (isPromedio && attendance >= 40) {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter border rounded-sm border-emerald-400/50 text-emerald-400 bg-emerald-400/5">
                                                                        <ArrowRight size={10} /> Promedio
                                                                    </span>
                                                                );
                                                            } else if (isRegular) {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter border rounded-sm border-amber-500/50 text-amber-500 bg-amber-500/5">
                                                                        <ArrowRight size={10} /> Regular
                                                                    </span>
                                                                );
                                                            } else {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter border rounded-sm border-red-500/50 text-red-500 bg-red-500/5">
                                                                        <ArrowDownRight size={10} /> Bajo Nivel
                                                                    </span>
                                                                );
                                                            }
                                                        })()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Vertical Dashboard Side */}
                <div className="space-y-8">
                    {/* Distribution Pie Chart */}
                    <div className="p-8 bg-[#0A0A0A] border border-exec-border">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <PieChartIcon className="w-3.5 h-3.5 text-exec-blue" />
                            Composición de Pagos
                        </h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Pagado', value: metrics.totalPaid },
                                            { name: 'Pendiente', value: Math.max(0, metrics.totalParticipants - metrics.totalPaid) }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        stroke="none"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#10B981" />
                                        <Cell fill="#F59E0B" />
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', color: '#fff', borderRadius: '0' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-6 flex justify-between border-t border-exec-border/50 pt-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-emerald-500 uppercase">Pagado</span>
                                <span className="text-xl font-black text-white">{metrics.totalPaid}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-amber-500 uppercase">Pendiente</span>
                                <span className="text-xl font-black text-white">{Math.max(0, metrics.totalParticipants - metrics.totalPaid)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Meta Configuration */}
                    <div className="p-8 bg-[#0F0F0F] border border-exec-border">
                        <h3 className="text-[10px] font-black text-exec-blue uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5" /> Ajuste de Objetivos
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Meta Anual de Participantes</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        value={annualGoal}
                                        onChange={(e) => saveGoal(parseInt(e.target.value) || 0)}
                                        className="w-full bg-black border border-exec-border p-4 text-2xl font-black text-white focus:border-exec-blue outline-none transition-all tracking-tighter"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-600 uppercase">PAX / AÑO</div>
                                </div>
                            </div>
                            <div className="p-4 bg-exec-blue/5 border border-exec-blue/10">
                                <p className="text-[10px] text-gray-400 italic leading-relaxed">
                                    Este valor define el benchmark de cumplimiento anual. El sistema recalcula la proyección en tiempo real.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insight Footer (Experimental placeholder) */}
            <div className="p-6 bg-[#050505] border border-exec-border flex items-center gap-6">
                <div className="w-10 h-10 bg-exec-blue/10 rounded-full flex items-center justify-center flex-shrink-0 border border-exec-blue/20">
                    <TrendingUp className="text-exec-blue w-5 h-5" />
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Tendencia de Impacto</h4>
                   <p className="text-xs text-gray-500 leading-relaxed">
                     El sistema proyecta un crecimiento del <span className="text-emerald-500 font-bold">+14%</span> en captación de inscritos basado en el rendimiento del último trimestre. 
                     Se recomienda optimizar el flujo de pagos pendentes para alcanzar la meta financiera antes de Q4.
                   </p>
                </div>
            </div>
        </div>
    );
}
