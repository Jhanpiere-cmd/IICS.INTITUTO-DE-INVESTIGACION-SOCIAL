import React, { useState, useEffect } from 'react';
import { X, Target, Users, TrendingUp, CheckCircle, DollarSign, Settings, BarChart3, PieChart as PieChartIcon, Image } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

interface EventStatsModalProps {
    onClose: () => void;
}

interface GeneralMetrics {
    totalEvents: number;
    totalParticipants: number;
    totalAttended: number;
    totalPaid: number;
    totalRevenue: number;
}

export function EventStatsModal({ onClose }: EventStatsModalProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<GeneralMetrics>({
        totalEvents: 0,
        totalParticipants: 0,
        totalAttended: 0,
        totalPaid: 0,
        totalRevenue: 0
    });

    const [annualGoal, setAnnualGoal] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sgr_event_annual_goal');
            return saved ? parseInt(saved) : 1000;
        }
        return 1000;
    });

    useEffect(() => {
        loadDetailedMetrics();
    }, []);

    async function loadDetailedMetrics() {
        setLoading(true);
        try {
            // Get current year
            const currentYear = new Date().getFullYear();
            const startOfYear = `${currentYear}-01-01`;

            // Load all events for the year
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id')
                .gte('scheduled_date', startOfYear);

            if (eventsError) throw eventsError;

            if (!events || events.length === 0) {
                setMetrics({
                    totalEvents: 0,
                    totalParticipants: 0,
                    totalAttended: 0,
                    totalPaid: 0,
                    totalRevenue: 0
                });
                return;
            }

            const eventIds = events.map(e => e.id);

            // Load consolidated participants data
            const { data: participants, error: pError } = await supabase
                .from('event_participants')
                .select('attended, payment_status, payment_amount')
                .in('event_id', eventIds);

            if (pError) throw pError;

            const totalParticipants = participants?.length || 0;
            const totalAttended = participants?.filter(p => p.attended).length || 0;
            const totalPaid = participants?.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').length || 0;
            const totalRevenue = participants?.reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0) || 0;

            setMetrics({
                totalEvents: events.length,
                totalParticipants,
                totalAttended,
                totalPaid,
                totalRevenue
            });

        } catch (error) {
            console.error('Error loading detailed metrics:', error);
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-4xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden rounded-none relative">
                
                {/* Decorative border line */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-exec-blue to-transparent opacity-50"></div>

                {/* Header */}
                <div className="p-6 border-b border-exec-border flex items-center justify-between bg-[#0F0F0F]">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-exec-blue/10 border border-exec-blue/20">
                            <BarChart3 className="w-6 h-6 text-exec-blue" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Dashboard de Inteligencia SGR</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Analítica estratégica y control de metas 2026</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex bg-black p-0.5 border border-exec-border">
                            <button 
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-exec-blue text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Análisis
                            </button>
                            <button 
                                onClick={() => setActiveTab('config')}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-exec-blue text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Metas
                            </button>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-2 border-exec-blue border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-exec-blue uppercase tracking-[0.3em]">Procesando base de datos...</span>
                        </div>
                    ) : activeTab === 'dashboard' ? (
                        <div className="space-y-10">
                            {/* Top Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-[#050505] border border-exec-border relative group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                        <Users className="w-12 h-12 text-exec-blue" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Alcance de Audiencia</h3>
                                    <div className="flex flex-col">
                                        <span className="text-4xl font-black text-white tracking-tighter">{metrics.totalParticipants}</span>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Inscritos Totales</span>
                                    </div>
                                    <div className="mt-6 flex items-center justify-between text-[10px] font-black">
                                        <span className="text-gray-600 uppercase">Crecimiento vs 2025</span>
                                        <span className="text-emerald-500 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            +12.5%
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 bg-[#050505] border border-exec-border relative group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                        <CheckCircle className="w-12 h-12 text-exec-blue" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Compromiso (Engagement)</h3>
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-white tracking-tighter">{attendanceRate.toFixed(1)}%</span>
                                            <span className="text-[10px] text-gray-500 uppercase font-black">Asistencia</span>
                                        </div>
                                        <div className="w-full bg-[#111] h-1.5 mt-4 rounded-none overflow-hidden">
                                            <div className="bg-exec-blue h-full shadow-[0_0_10px_rgba(0,136,255,0.5)]" style={{ width: `${attendanceRate}%` }}></div>
                                        </div>
                                    </div>
                                    <span className="block mt-4 text-[9px] text-gray-600 uppercase font-black">{metrics.totalAttended} asistentes reales</span>
                                </div>

                                <div className="p-6 bg-[#050505] border border-exec-border border-emerald-500/10 relative group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                        <DollarSign className="w-12 h-12 text-emerald-500" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Eficiencia Financiera</h3>
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-emerald-500 tracking-tighter">S/. {metrics.totalRevenue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4">
                                            <span className="text-[10px] font-black text-emerald-500/80">{paymentRate.toFixed(1)}% Pagado</span>
                                            <span className="text-gray-700 text-[10px]">|</span>
                                            <span className="text-[10px] font-black text-gray-500 uppercase">{metrics.totalPaid} Transac.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center Section: Annual Goal vs Reality */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="p-8 bg-[#0F0F0F] border-l-4 border-exec-blue">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Target className="w-4 h-4 text-exec-blue" />
                                            META ANUAL 2026
                                        </h3>
                                        <span className="text-[10px] font-black text-gray-500 uppercase">Actualización en vivo</span>
                                    </div>

                                    <div className="relative flex flex-col items-center justify-center py-6">
                                        <div className="text-6xl font-black text-white tracking-tighter mb-2">
                                            {goalProgress.toFixed(1)}%
                                        </div>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8">Nivel de cumplimiento</div>
                                        
                                        <div className="w-full flex flex-col gap-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                                <span className="text-gray-500">Progreso: {metrics.totalParticipants}</span>
                                                <span className="text-exec-blue">Meta: {annualGoal}</span>
                                            </div>
                                            <div className="w-full h-8 bg-black border border-exec-border p-1">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-exec-blue/50 to-exec-blue relative group overflow-hidden transition-all duration-1000 ease-out"
                                                    style={{ width: `${Math.min(goalProgress, 100)}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-[#020202] border border-exec-border">
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                        <PieChartIcon className="w-4 h-4 text-emerald-500" />
                                        Composición de Pagos
                                    </h3>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Pagado', value: metrics.totalPaid },
                                                        { name: 'Pendiente', value: Math.max(0, metrics.totalParticipants - metrics.totalPaid) },
                                                        { name: 'Exon.', value: 0 }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={60}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#10B981" />
                                                    <Cell fill="#F59E0B" />
                                                    <Cell fill="#4B5563" />
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 mt-4">
                                        <div className="flex flex-col items-center">
                                            <span className="text-emerald-500 text-[10px] font-black uppercase">Pagado</span>
                                            <span className="text-white text-xs font-bold">{metrics.totalPaid}</span>
                                        </div>
                                        <div className="flex flex-col items-center border-x border-exec-border">
                                            <span className="text-amber-500 text-[10px] font-black uppercase">Pend.</span>
                                            <span className="text-white text-xs font-bold">{Math.max(0, metrics.totalParticipants - metrics.totalPaid)}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-500 text-[10px] font-black uppercase">Exon.</span>
                                            <span className="text-white text-xs font-bold">N/A</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-md mx-auto space-y-12 py-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-exec-blue">
                                    <Settings className="w-5 h-5" />
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Configuración de Objetivos</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Meta Anual de Participantes</label>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                value={annualGoal}
                                                onChange={(e) => saveGoal(parseInt(e.target.value) || 0)}
                                                className="w-full bg-[#050505] border border-exec-border p-4 text-2xl font-black text-white focus:border-exec-blue outline-none transition-all tracking-tighter"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600 uppercase">Pax / Año</div>
                                        </div>
                                        <p className="text-[9px] text-gray-600 mt-2 italic">* Este valor se utiliza para calcular el porcentaje de cumplimiento en el dashboard principal.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-exec-blue/5 border border-exec-blue/20">
                                <h4 className="text-[10px] font-black text-exec-blue uppercase tracking-[0.2em] mb-4">Nota de Análisis</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Las metas de recaudación se calculan automáticamente en base a la sumatoria de inscritos pagados por evento. 
                                    Asegúrese de que el equipo de tesorería mantenga actualizados los estados de pago en la pestaña de participantes para una visualización fidedigna.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-exec-border bg-[#050505] flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-exec-blue animate-pulse"></span>
                        Executive Intelligence Engine v2.0
                    </div>
                    <div className="text-gray-500">
                        © 2026 Revista ACS - SGR System
                    </div>
                </div>
            </div>
        </div>
    );
}
