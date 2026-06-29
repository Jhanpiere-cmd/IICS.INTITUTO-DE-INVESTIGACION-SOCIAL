import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { BarChart3, CheckCircle2, Clock, AlertCircle, Users, FileText, Calendar, TrendingUp, DollarSign, Wallet, TrendingDown, Target, Zap, ArrowLeft, Search, Filter, ChevronRight, Eye, Trophy, Crown, Star, Medal } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LabelList
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Share2 } from 'lucide-react';

interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  totalUsers: number;
  totalNews: number;
  totalProposals: number;
  totalMeetings: number;
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  tasksByUser: { user: string; count: number }[];
  proposalsByStatus: { status: string; count: number }[];
  
  // New Finance & Event Stats
  finance: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    incomeByCategory: { category: string; amount: number }[];
    cashFlow: { date: string; income: number; expense: number; balance: number }[];
  };
  events: {
    activeEvents: number;
    totalParticipants: number;
    totalRevenue: number;
    participationPerEvent: { name: string; participants: number; revenue: number }[];
  };
  operational: {
    meetingsByType: { type: string; count: number }[];
    newsByCategory: { category: string; count: number }[];
    tasksByUser: { user: string; count: number; completed: number; efficiency: number; role: string }[];
    tasksByMonth: { month: string; total: number; completed: number; rate: number }[];
  };
}

import { SocialInsightsView } from './SocialInsightsView';
import { YoutubeInsightsView } from './YoutubeInsightsView';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'system' | 'social' | 'youtube'>('system');
  const [viewMode, setViewMode] = useState<'summary' | 'finance' | 'events' | 'ops'>('summary');
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0, completedTasks: 0, pendingTasks: 0, inProgressTasks: 0,
    totalUsers: 0, totalNews: 0, totalProposals: 0, totalMeetings: 0,
    tasksByStatus: [], tasksByPriority: [], tasksByUser: [], proposalsByStatus: [],
    finance: { totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, incomeByCategory: [], cashFlow: [] },
    events: { activeEvents: 0, totalParticipants: 0, totalRevenue: 0, participationPerEvent: [] },
    operational: { meetingsByType: [], newsByCategory: [], tasksByUser: [], tasksByMonth: [] }
  });
  
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [rawParticipants, setRawParticipants] = useState<any[]>([]);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [rawProposals, setRawProposals] = useState<any[]>([]);
  const [rawNews, setRawNews] = useState<any[]>([]);
  const [rawUsers, setRawUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  const COLORS_STATUS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const COLORS_PRIORITY = ['#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#9CA3AF'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1A1A] border border-exec-border p-3 rounded-none shadow-lg backdrop-blur-sm">
          <p className="text-white font-medium text-xs mb-1 font-mono">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-[10px] text-gray-400 uppercase tracking-widest">
              {p.name}: <span className="text-white font-bold">{p.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // --- 1. USER & ROLE ---
        if (user?.id) {
          const { data: userData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          setUserRole(userData?.role || '');
        }

        // --- 2. FETCH SYSTEM DATA ---
        const [
          { data: tasks },
          { data: users },
          { data: newsCount },
          { data: allNews },
          { data: proposals },
          { data: meetings },
          { data: transactions },
          { data: events },
          { data: participants }
        ] = await Promise.all([
          supabase.from('tasks').select('*'),
          supabase.from('profiles').select('id, full_name, email, role'),
          supabase.from('news').select('id').eq('status', 'Publicado'),
          supabase.from('news').select('category'),
          supabase.from('proposals').select('id, status'),
          supabase.from('meetings').select('id, meeting_type'),
          supabase.from('financial_transactions').select('*').order('transaction_date', { ascending: true }),
          supabase.from('events').select('id, title, status'),
          supabase.from('event_participants').select('event_id, payment_amount, payment_status')
        ]);

        // --- 3. PROCESS TASKS ---
        const rawTasks = tasks || [];
        const groups = new Map<string, any>();
        rawTasks.forEach((task: any) => {
          const dateStr = task.due_date ? task.due_date.split('T')[0] : 'no-date';
          const key = `${task.title?.trim().toLowerCase() || 'sin-titulo'}|${task.description?.trim().toLowerCase() || ''}|${dateStr}|${task.created_by}`;
          if (!groups.has(key)) groups.set(key, task);
        });
        const tasksList = Array.from(groups.values());

        const statusGroups = tasksList.reduce((acc: any, t: any) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
        const priorityGroups = tasksList.reduce((acc: any, t: any) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {});

        // --- 4. PROCESS FINANCE ---
        const transList = transactions || [];
        let totalBalance = 0;
        let monthlyIncome = 0;
        let monthlyExpenses = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const cashFlowMap = new Map<string, { income: number; expense: number; balance: number }>();
        transList.forEach((t: any) => {
          const amount = Number(t.amount);
          const tDate = new Date(t.transaction_date + 'T12:00:00');
          const monthKey = tDate.toLocaleString('es-ES', { month: 'short' });
          
          if (t.type === 'income') {
            totalBalance += amount;
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) monthlyIncome += amount;
          } else {
            totalBalance -= amount;
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) monthlyExpenses += amount;
          }

          if (!cashFlowMap.has(monthKey)) {
            cashFlowMap.set(monthKey, { income: 0, expense: 0, balance: 0 });
          }
          const prev = cashFlowMap.get(monthKey)!;
          if (t.type === 'income') prev.income += amount;
          else prev.expense += amount;
          prev.balance = totalBalance;
        });

        // --- 5. PROCESS EVENTS ---
        const eventList = events || [];
        const participantList = participants || [];
        let totalRevenue = 0;
        const pMap = new Map<string, { count: number; revenue: number }>();
        
        participantList.forEach((p: any) => {
          if (!pMap.has(p.event_id)) pMap.set(p.event_id, { count: 0, revenue: 0 });
          const entry = pMap.get(p.event_id)!;
          entry.count++;
          if (p.payment_status === 'paid' || p.payment_status === 'completed') {
            const rev = Number(p.payment_amount) || 0;
            entry.revenue += rev;
            totalRevenue += rev;
          }
        });

        const participationPerEvent = eventList.map(e => ({
          name: e.title.length > 20 ? e.title.substring(0, 20) + '...' : e.title,
          participants: pMap.get(e.id)?.count || 0,
          revenue: pMap.get(e.id)?.revenue || 0
        })).sort((a, b) => b.participants - a.participants).slice(0, 5);

        // --- 6. PROCESS OPERATIONAL ---
        const meetingGroups = (meetings || []).reduce((acc: any, m: any) => {
          const type = m.meeting_type || 'General';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        const newsGroups = (allNews || []).reduce((acc: any, n: any) => {
          const cat = n.category || 'General';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {});

        const userMap = new Map((users || []).map((u: any) => [u.id, u]));
        const tasksByUserData = tasksList.reduce((acc: any, t: any) => {
          const uId = t.assigned_to || t.created_by;
          const u = userMap.get(uId);
          const uName = u?.full_name || u?.email || 'Miembro ACS';
          if (!acc[uId]) acc[uId] = { user: uName, count: 0, completed: 0, efficiency: 0, role: u?.role || 'Agente' };
          acc[uId].count++;
          if (t.status === 'Completada' || t.status === 'finalizada' || t.status === 'done') acc[uId].completed++;
          return acc;
        }, {});

        const processedTasksByUser = Object.values(tasksByUserData).map((u: any) => ({
          ...u,
          efficiency: Math.round((u.completed / (u.count || 1)) * 100)
        })).sort((a: any, b: any) => b.completed - a.completed || b.efficiency - a.efficiency);

        const incomeByCategory = Array.from(new Set(transList.filter(t => t.type === 'income').map(t => t.category)))
          .map(cat => ({
            category: cat || 'General',
            amount: transList.filter(t => t.type === 'income' && t.category === cat).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
          }))
          .sort((a, b) => b.amount - a.amount);

        const tasksByMonthMap = new Map<string, { total: number; completed: number }>();
        tasksList.forEach((t: any) => {
          const date = new Date(t.created_at || t.due_date || new Date());
          const monthKey = date.toLocaleString('es-ES', { month: 'short' });
          if (!tasksByMonthMap.has(monthKey)) tasksByMonthMap.set(monthKey, { total: 0, completed: 0 });
          const group = tasksByMonthMap.get(monthKey)!;
          group.total++;
          if (t.status === 'Completada' || t.status === 'finalizada' || t.status === 'done') group.completed++;
        });

        const tasksByMonth = Array.from(tasksByMonthMap.entries()).map(([month, data]) => ({
          month,
          total: data.total,
          completed: data.completed,
          rate: Math.round((data.completed / data.total) * 100)
        })).slice(-6);

        setRawTransactions(transList);
        setRawEvents(eventList);
        setRawParticipants(participantList);
        setRawTasks(tasksList);
        setRawProposals(proposals || []);
        setRawNews(allNews || []);
        setRawUsers(users || []);

        setStats({
          totalTasks: tasksList.length,
          completedTasks: tasksList.filter(t => t.status === 'Completada' || t.status === 'finalizada').length,
          pendingTasks: tasksList.filter(t => t.status === 'Pendiente').length,
          inProgressTasks: tasksList.filter(t => t.status === 'En progreso').length,
          totalUsers: (users || []).length,
          totalNews: (newsCount || []).length,
          totalProposals: (proposals || []).length,
          totalMeetings: (meetings || []).length,
          tasksByStatus: Object.entries(statusGroups).map(([status, count]) => ({ status, count: count as number })),
          tasksByPriority: Object.entries(priorityGroups).map(([priority, count]) => ({ priority, count: count as number })),
          tasksByUser: Object.values(tasksByUserData) as any,
          proposalsByStatus: (proposals || []).reduce((acc: any, p: any) => {
            const s = p.status;
            const idx = acc.findIndex((item: any) => item.status === s);
            if (idx >= 0) acc[idx].count++; else acc.push({ status: s, count: 1 });
            return acc;
          }, []),
          finance: {
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            incomeByCategory,
            cashFlow: Array.from(cashFlowMap.entries()).map(([date, d]) => ({ date, ...d }))
          },
          events: {
            activeEvents: eventList.filter(e => e.status !== 'completado').length,
            totalParticipants: participantList.length,
            totalRevenue,
            participationPerEvent
          },
          operational: {
            meetingsByType: Object.entries(meetingGroups).map(([type, count]) => ({ type, count: count as number })),
            newsByCategory: Object.entries(newsGroups).map(([category, count]) => ({ category, count: count as number })),
            tasksByUser: processedTasksByUser as any,
            tasksByMonth: tasksByMonth as any
          }
        });

      } catch (e) {
        console.error('Error cargando estadísticas:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleExportPDF = async () => {
    const element = document.getElementById('reports-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#000',
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_ACS_${activeTab}_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-exec-blue/10 border border-exec-blue/20 rounded-none">
            <span className="material-symbols-outlined text-4xl text-exec-blue animate-pulse">smart_toy</span>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Inicializando ACS Intelligence Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:pt-4 md:px-6 space-y-6 bg-[#000000] min-h-screen text-white font-sans selection:bg-exec-blue/30">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-exec-border pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
              <div className="p-1.5 bg-exec-blue/10 border border-exec-blue/20 rounded-none">
                <BarChart3 className="w-6 h-6 text-exec-blue" />
              </div>
              <span>Centro de <span className="text-exec-blue">Inteligencia</span></span>
            </h1>
            {viewMode !== 'summary' && (
              <button 
                onClick={() => setViewMode('summary')}
                className="px-2 py-1 bg-white/5 border border-white/10 text-white/40 text-[9px] font-bold uppercase tracking-widest hover:text-white transition-all flex items-center gap-1"
              >
                <ArrowLeft size={10} /> Volver
              </button>
            )}
          </div>
          <p className="text-gray-500 text-[9px] font-bold uppercase tracking-[0.2em]">
            Consolidado táctico de finanzas, eventos y productividad sistémica.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest font-mono text-right">
              Sincronización en Tiempo Real
            </div>
          </div>
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-none hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg"
          >
            <Download size={14} />
            <span>Descargar PDF</span>
          </button>
        </div>

      {/* Tab Selector */}
      <div className="flex bg-[#0D0D0D] border border-exec-border p-1 rounded-none w-fit">
        {['system', 'social', 'youtube'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-5 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all rounded-none ${
              activeTab === tab ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'system' ? 'Métricas Globales' : tab === 'social' ? 'Meta Analytics' : 'YouTube Data'}
          </button>
        ))}
      </div>

      <div id="reports-content" className="space-y-6">
        {activeTab === 'system' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          {viewMode === 'summary' && (
            <div className="grid gap-6 md:grid-cols-3 mb-6">
              {/* Finance Quick Cards */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setViewMode('finance')}
                  className="bg-[#0D0D0D] border border-exec-border p-5 rounded-none relative overflow-hidden cursor-pointer hover:border-exec-blue transition-all group"
                >
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-exec-blue">Caja Global</p>
                  <h3 className="text-2xl font-black text-exec-blue">S/ {stats.finance.totalBalance.toLocaleString()}</h3>
                  <Wallet className="absolute top-4 right-4 w-4 h-4 text-exec-blue/20 group-hover:text-exec-blue/40" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-exec-blue transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </div>
                <div className="bg-[#0D0D0D] border border-exec-border p-5 rounded-none relative overflow-hidden">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ingresos Mes</p>
                  <h3 className="text-2xl font-black text-emerald-500">S/ {stats.finance.monthlyIncome.toLocaleString()}</h3>
                  <TrendingUp className="absolute top-4 right-4 w-4 h-4 text-emerald-500/20" />
                </div>
                <div className="bg-[#0D0D0D] border border-exec-border p-5 rounded-none relative overflow-hidden">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Egresos Mes</p>
                  <h3 className="text-2xl font-black text-rose-500">S/ {stats.finance.monthlyExpenses.toLocaleString()}</h3>
                  <TrendingDown className="absolute top-4 right-4 w-4 h-4 text-rose-500/20" />
                </div>
                <div 
                   onClick={() => setViewMode('events')}
                   className="bg-[#0D0D0D] border border-exec-border p-5 rounded-none relative overflow-hidden cursor-pointer hover:border-white transition-all group"
                >
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-white">Recaudación Eventos</p>
                  <h3 className="text-2xl font-black text-white">S/ {stats.events.totalRevenue.toLocaleString()}</h3>
                  <Target className="absolute top-4 right-4 w-4 h-4 text-white/20 group-hover:text-white/40" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </div>
                <div 
                   onClick={() => setViewMode('ops')}
                   className="bg-[#0D0D0D] border border-exec-border p-5 rounded-none relative overflow-hidden cursor-pointer hover:border-exec-blue transition-all group"
                >
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-exec-blue">Cumplimiento Sistémico</p>
                  <h3 className="text-2xl font-black text-emerald-500">{Math.round((stats.completedTasks / (stats.totalTasks || 1)) * 100)}%</h3>
                  <Target className="absolute top-4 right-4 w-4 h-4 text-emerald-500/20 group-hover:text-emerald-500/40" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </div>
                <div 
                   onClick={() => setViewMode('ops')}
                   className="bg-[#0D0D0D] border border-exec-border p-5 rounded-none relative overflow-hidden cursor-pointer hover:border-exec-blue transition-all group"
                >
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-exec-blue">Volumen de Tareas</p>
                  <h3 className="text-2xl font-black text-white">{stats.totalTasks}</h3>
                  <Zap className="absolute top-4 right-4 w-4 h-4 text-white/20 group-hover:text-white/40" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-exec-blue transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </div>
              </div>

              {/* Cash Flow Chart */}
              <div className="md:col-span-2 bg-[#0D0D0D] border border-exec-border rounded-none">
                <div className="p-4 border-b border-exec-border flex justify-between items-center bg-[#080808]">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <TrendingUp size={12} className="text-exec-blue" /> Flujo de Caja Mensual
                  </h4>
                </div>
                <div className="h-[300px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.finance.cashFlow}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="date" stroke="#525252" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis stroke="#525252" fontSize={9} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="balance" stroke="#3B82F6" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} name="Balance" />
                      <Area type="monotone" dataKey="income" stroke="#10B981" fill="transparent" strokeWidth={1} strokeDasharray="5 5" name="Ingresos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Event Attendance Bars */}
              <div className="bg-[#0D0D0D] border border-exec-border rounded-none">
                <div className="p-4 border-b border-exec-border bg-[#080808]">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Users size={12} className="text-exec-blue" /> Participación por Evento
                  </h4>
                </div>
                <div className="h-[300px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.events.participationPerEvent || []} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#525252" fontSize={8} width={80} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="participants" fill="#3B82F6" radius={[0, 2, 2, 0]} name="Inscritos">
                        <LabelList dataKey="participants" position="right" fill="#888" fontSize={9} offset={10} fontStyle="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Operational Pie row */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div 
                  onClick={() => setViewMode('ops')}
                  className="bg-[#0D0D0D] border border-exec-border rounded-none p-4 cursor-pointer hover:border-exec-blue transition-all group"
                >
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4 group-hover:text-exec-blue">Prioridades de Tareas</p>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.tasksByPriority || []} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="count" nameKey="priority" stroke="none">
                          {(stats.tasksByPriority || []).map((_, i) => <Cell key={i} fill={COLORS_PRIORITY[i % 5]} />)}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div 
                  onClick={() => setViewMode('ops')}
                  className="bg-[#0D0D0D] border border-exec-border rounded-none p-4 cursor-pointer hover:border-exec-blue transition-all group flex flex-col items-center justify-center p-6"
                >
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4 w-full group-hover:text-exec-blue">Top Performer</p>
                  {stats.operational.tasksByUser[0] ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="absolute -top-4 -right-2 rotate-12">
                          <Crown size={24} className="text-amber-500" />
                        </div>
                        <div className="w-16 h-16 bg-exec-blue/20 border border-exec-blue flex items-center justify-center">
                          <Users size={32} className="text-exec-blue" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-white uppercase">{stats.operational.tasksByUser[0]?.user}</p>
                        <p className="text-[8px] font-bold text-exec-blue uppercase">#{stats.operational.tasksByUser[0]?.completed} Tareas • {stats.operational.tasksByUser[0]?.efficiency}% Efic.</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-600 font-bold uppercase">Ranking no disponible</p>
                  )}
                </div>
                <div 
                   onClick={() => setViewMode('ops')}
                   className="bg-[#0D0D0D] border border-exec-border rounded-none p-4 cursor-pointer hover:border-exec-blue transition-all group"
                >
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4 group-hover:text-exec-blue">Categoría de Noticias</p>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.operational.newsByCategory || []} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="count" nameKey="category" stroke="none">
                          {(stats.operational.newsByCategory || []).map((_, i) => <Cell key={i} fill={['#A855F7', '#EC4899', '#3B82F6', '#10B981'][i % 4]} />)}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div 
                  onClick={() => setViewMode('ops')}
                  className="bg-[#0D0D0D] border border-exec-border rounded-none p-4 flex flex-col justify-between cursor-pointer hover:border-white transition-all group"
                >
                  <div>
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3 group-hover:text-white">Snapshot Sistémico</p>
                    <div className="space-y-2">
                      {[
                        { l: 'Total Usuarios', v: stats.totalUsers },
                        { l: 'Propuestas Activas', v: stats.totalProposals },
                        { l: 'Eventos Vigentes', v: stats.events.activeEvents },
                        { l: 'Noticias Publicadas', v: stats.totalNews }
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-exec-border/50 pb-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{item.l}</span>
                          <span className="text-xs font-black text-white">{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'finance' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
               <button 
                onClick={() => setViewMode('summary')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-exec-blue hover:text-white hover:border-exec-blue transition-all group"
               >
                 <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                 Regresar al Resumen Ejecutivo
               </button>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 bg-[#0D0D0D] border border-exec-border p-6">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-lg font-black uppercase tracking-tighter">Explorador de Movimientos</h3>
                       <div className="flex gap-4">
                          <div className="text-right">
                             <p className="text-[9px] font-bold text-gray-600 uppercase">Total Ingresos</p>
                             <p className="text-xl font-black text-emerald-500">S/ {stats.finance.monthlyIncome.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-bold text-gray-600 uppercase">Total Egresos</p>
                             <p className="text-xl font-black text-rose-500">S/ {stats.finance.monthlyExpenses.toLocaleString()}</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex gap-2 mb-6">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="Buscar transacción..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-black border border-white/10 p-1.5 pl-9 text-[10px] uppercase font-bold text-white rounded-none outline-none focus:border-exec-blue w-64"
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-black border border-white/10 px-2 py-1">
                         <Filter size={12} className="text-gray-500" />
                         <select 
                           value={filterCategory}
                           onChange={(e) => setFilterCategory(e.target.value)}
                           className="bg-transparent border-none text-[10px] font-bold uppercase text-white outline-none cursor-pointer"
                         >
                           <option value="Todas">Todas las Categorías</option>
                           {Array.from(new Set(rawTransactions.map(t => t.category))).map(c => (
                             <option key={c} value={c}>{c}</option>
                           ))}
                         </select>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Fecha</th>
                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Título</th>
                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Categoría</th>
                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo</th>
                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {rawTransactions
                            .filter(t => (filterCategory === 'Todas' || t.category === filterCategory) && t.title.toLowerCase().includes(searchTerm.toLowerCase()))
                            .slice(0, 20)
                            .map((t, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-3 text-[11px] font-mono text-gray-400">{new Date(t.transaction_date).toLocaleDateString()}</td>
                              <td className="p-3 text-[11px] font-black text-white">{t.title}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                  {t.category}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                                </span>
                              </td>
                              <td className={`p-3 text-[11px] font-black text-right ${t.type === 'income' ? 'text-emerald-500' : 'text-white'}`}>
                                S/ {t.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="bg-[#0D0D0D] border border-exec-border p-5">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Balance Consolidado</p>
                        <h4 className="text-3xl font-black text-white">S/ {stats.finance.totalBalance.toLocaleString()}</h4>
                     </div>
                     <div className="bg-[#0D0D0D] border border-exec-border p-5">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4">Origen del Dinero (Categorías)</p>
                        <div className="space-y-3">
                           {(stats.finance.incomeByCategory || []).map(cat => (
                             <div key={cat.category} className="flex justify-between items-center bg-white/[0.02] p-2 border border-white/5 border-l-2 border-l-emerald-500">
                               <span className="text-[9px] font-bold text-gray-500 uppercase">{cat.category}</span>
                               <span className="text-[10px] font-black text-emerald-500">
                                 S/ {cat.amount.toLocaleString()}
                               </span>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {viewMode === 'events' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
               <button 
                onClick={() => setViewMode('summary')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-exec-blue hover:text-white hover:border-exec-blue transition-all group"
               >
                 <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                 Regresar al Resumen Ejecutivo
               </button>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-3 bg-[#0D0D0D] border border-exec-border p-6">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Analítica de Gestión de Eventos</h3>
                    <div className="grid grid-cols-1 gap-6">
                       {rawEvents.map((event, i) => {
                          const pData = rawParticipants.filter(p => p.event_id === event.id);
                          const revenue = pData.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').reduce((acc, curr) => acc + Number(curr.payment_amount), 0);
                          return (
                            <div key={i} className="group bg-white/[0.02] border border-white/5 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-exec-blue transition-all">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                     <h4 className="text-[13px] font-black text-white uppercase">{event.title}</h4>
                                     <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-none ${event.status === 'activo' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>
                                       {event.status}
                                     </span>
                                  </div>
                                  <p className="text-[9px] text-gray-500 font-bold uppercase">UID: {event.id.substring(0, 8)}...</p>
                               </div>
                               <div className="flex gap-8">
                                  <div className="text-center">
                                     <p className="text-[9px] font-bold text-gray-600 uppercase">Inscritos</p>
                                     <p className="text-xl font-black text-white">{pData.length}</p>
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[9px] font-bold text-gray-600 uppercase">Recaudado</p>
                                     <p className="text-xl font-black text-emerald-500">S/ {revenue.toLocaleString()}</p>
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[9px] font-bold text-gray-600 uppercase">Pendientes</p>
                                     <p className="text-xl font-black text-rose-500">{pData.filter(p => p.payment_status !== 'paid' && p.payment_status !== 'completed').length}</p>
                                  </div>
                               </div>
                               <button className="p-2 border border-white/10 hover:bg-exec-blue transition-all group-hover:bg-exec-blue group-hover:border-exec-blue">
                                  <ChevronRight size={16} />
                                </button>
                            </div>
                          );
                       })}
                    </div>
                  </div>
                  
                  <div className="bg-[#0D0D0D] border border-exec-border p-6 flex flex-col items-center gap-6">
                     <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest w-full">Resumen de Audiencias</p>
                     <div className="h-[200px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie 
                             data={stats.events.participationPerEvent} 
                             dataKey="participants" 
                             nameKey="name" 
                             innerRadius={60} 
                             outerRadius={80} 
                             stroke="none"
                           >
                             {(stats.events.participationPerEvent || []).map((_, i) => <Cell key={i} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]} />)}
                             <LabelList dataKey="participants" position="center" fill="#fff" fontSize={16} fontStyle="black" />
                           </Pie>
                           <RechartsTooltip />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="space-y-4 w-full pt-6 border-t border-white/5">
                        <div className="text-center">
                           <p className="text-[10px] font-bold text-gray-600 uppercase">Promedio por Evento</p>
                           <p className="text-2xl font-black text-white">{(stats.events.totalParticipants / (rawEvents.length || 1)).toFixed(1)}</p>
                        </div>
                        <div className="text-center">
                           <p className="text-[10px] font-bold text-gray-600 uppercase">Eventos Totales</p>
                           <p className="text-2xl font-black text-white">{rawEvents.length}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {viewMode === 'ops' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
               <button 
                onClick={() => setViewMode('summary')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-exec-blue hover:text-white hover:border-exec-blue transition-all group"
               >
                 <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                 Regresar al Resumen Ejecutivo
               </button>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Team Leaderboard */}
                  <div className="md:col-span-3 bg-[#0D0D0D] border border-exec-border p-6">
                    <div className="flex justify-between items-center mb-8">
                       <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                          <Trophy className="text-amber-500" /> Ranking de Productividad ACS
                       </h3>
                       <div className="flex gap-2">
                          <span className="px-3 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue text-[9px] font-black uppercase">Fase 3.7 Activa</span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                       {stats.operational.tasksByUser.slice(0, 3).map((u, i) => (
                         <div key={i} className={`p-4 border border-exec-border relative ${i === 0 ? 'bg-exec-blue/5 border-exec-blue' : 'bg-black/20'}`}>
                            {i === 0 && <Crown className="absolute -top-3 -right-3 text-amber-500 rotate-12" size={32} />}
                            <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 flex items-center justify-center font-black text-xl ${i === 0 ? 'text-exec-blue' : 'text-gray-600'}`}>
                                  #{i + 1}
                               </div>
                               <div>
                                  <p className="text-[11px] font-black text-white uppercase">{u.user}</p>
                                  <p className="text-[8px] font-bold text-gray-500 uppercase">{u.role}</p>
                               </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-center border-t border-white/5 pt-4">
                               <div>
                                  <p className="text-[8px] font-bold text-gray-600 uppercase">Finalizadas</p>
                                  <p className="text-lg font-black text-white">{u.completed}</p>
                               </div>
                               <div>
                                  <p className="text-[8px] font-bold text-gray-600 uppercase">Eficiencia</p>
                                  <p className="text-lg font-black text-emerald-500">{u.efficiency}%</p>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-3 text-[10px] font-black uppercase text-gray-500">Posición</th>
                            <th className="p-3 text-[10px] font-black uppercase text-gray-500">Miembro del Equipo</th>
                            <th className="p-3 text-[10px] font-black uppercase text-gray-500 text-center">Tareas Totales</th>
                            <th className="p-3 text-[10px] font-black uppercase text-gray-500 text-center">Completadas</th>
                            <th className="p-3 text-[10px] font-black uppercase text-gray-500 text-right">Eficiencia Bruta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {(stats.operational.tasksByUser || []).map((u, i) => (
                            <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${i === 0 ? 'bg-exec-blue/5' : ''}`}>
                              <td className="p-3">
                                 <span className={`text-[11px] font-black ${i === 0 ? 'text-exec-blue' : 'text-gray-500'}`}>
                                    {i + 1 < 10 ? `0${i+1}` : i+1}
                                 </span>
                              </td>
                              <td className="p-3">
                                <p className="text-[11px] font-black text-white uppercase">{u.user}</p>
                                <p className="text-[8px] text-gray-600 uppercase">{u.role}</p>
                              </td>
                              <td className="p-3 text-center text-[11px] font-bold text-gray-400">{u.count}</td>
                              <td className="p-3 text-center text-[11px] font-black text-white">{u.completed}</td>
                              <td className="p-3 text-right">
                                <div className="flex flex-col items-end">
                                   <span className={`text-[12px] font-black ${u.efficiency > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                      {u.efficiency}%
                                   </span>
                                   <div className="w-16 h-1 bg-white/5 mt-1 overflow-hidden">
                                      <div 
                                        className={`h-full ${u.efficiency > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                        style={{ width: `${u.efficiency}%` }}
                                      />
                                   </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Monthly Trend Chart */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                       <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                          <BarChart3 size={12} className="text-exec-blue" /> Evolución de Cumplimiento Mensual
                       </h4>
                       <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={stats.operational.tasksByMonth || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis dataKey="month" stroke="#525252" fontSize={9} axisLine={false} tickLine={false} />
                                <YAxis stroke="#525252" fontSize={9} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', paddingTop: '20px' }} />
                                <Bar dataKey="total" fill="#262626" stroke="#525252" name="Tareas Asignadas" radius={[2, 2, 0, 0]} />
                                <Bar dataKey="completed" fill="#3B82F6" name="Tareas Completadas" radius={[2, 2, 0, 0]}>
                                   <LabelList dataKey="rate" position="top" formatter={(v: any) => `${v}%`} fill="#3B82F6" fontSize={8} fontStyle="bold" />
                                </Bar>
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                  </div>

                  <div className="bg-[#0D0D0D] border border-exec-border p-6 flex flex-col gap-6">
                     <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Resumen de Contenidos</p>
                     <div className="space-y-4">
                        {(stats.operational.newsByCategory || []).map((news, i) => (
                          <div key={i} className="p-3 bg-white/[0.02] border border-white/5">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-white uppercase">{news.category}</span>
                                <span className="text-[11px] font-black text-exec-blue">{news.count} post</span>
                             </div>
                             <div className="w-full h-1 bg-white/5 overflow-hidden">
                                <div 
                                  className="h-full bg-exec-blue" 
                                  style={{ width: `${(news.count / (stats.totalNews || 1)) * 100}%` }}
                                />
                             </div>
                          </div>
                        ))}
                     </div>
                     <div className="mt-auto pt-6 border-t border-white/5">
                        <div className="text-center">
                           <p className="text-[10px] font-bold text-gray-600 uppercase">Estado de Propuestas</p>
                           <div className="h-[150px] w-full mt-2">
                              <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                    <Pie 
                                      data={stats.proposalsByStatus} 
                                      dataKey="count" 
                                      nameKey="status" 
                                      innerRadius={40} 
                                      outerRadius={55} 
                                      stroke="none"
                                    >
                                       {(stats.proposalsByStatus || []).map((_, i) => <Cell key={i} fill={COLORS_STATUS[i % 5]} />)}
                                    </Pie>
                                    <RechartsTooltip />
                                 </PieChart>
                              </ResponsiveContainer>
                           </div>
                        </div>
                        <div className="text-center mt-6">
                           <p className="text-[10px] font-bold text-gray-600 uppercase">Eficiencia Local</p>
                           <p className="text-3xl font-black text-white">
                             {((stats.completedTasks / (stats.totalTasks || 1)) * 100).toFixed(0)}%
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      ) : activeTab === 'social' ? (
        <SocialInsightsView />
      ) : (
        <YoutubeInsightsView />
      )}
    </div>

      {/* Pie de página técnico compacto */}
      <div className="pt-12 pb-8 border-t border-[#1a1a1a] flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 opacity-20 hover:opacity-100 transition-opacity duration-700">
          <div className="w-6 h-6 rounded-none border border-exec-border flex items-center justify-center text-[8px] font-black tracking-tighter">ACS</div>
          <div className="h-px w-12 bg-exec-border"></div>
          <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.5em]">División de Inteligencia</p>
        </div>
        <p className="text-[8px] font-bold text-gray-800 uppercase tracking-widest">
          © 2026 SISTEMA DE REPORTES ESTRATÉGICOS. TODOS LOS DERECHOS RESERVADOS.
        </p>
      </div>
    </div>
  );
};
