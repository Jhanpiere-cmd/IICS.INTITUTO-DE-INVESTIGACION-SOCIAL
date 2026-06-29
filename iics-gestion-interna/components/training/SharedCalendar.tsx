import React, { useState } from 'react';
import { Calendar, ChevronRight, List, Grid, Users } from 'lucide-react';
import { useToast } from '../ui/ToastContext';

// --- HELPERS ---
const COURSE_COLORS = [
    'bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/50',
    'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:border-orange-500/50',
    'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:border-amber-500/50',
    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:border-yellow-500/50',
    'bg-lime-500/10 text-lime-400 border border-lime-500/20 hover:border-lime-500/50',
    'bg-green-500/10 text-green-400 border border-green-500/20 hover:border-green-500/50',
    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50',
    'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:border-teal-500/50',
    'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50',
    'bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:border-sky-500/50',
    'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:border-blue-500/50',
    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50',
    'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:border-violet-500/50',
    'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:border-purple-500/50',
    'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:border-fuchsia-500/50',
    'bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:border-pink-500/50',
    'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:border-rose-500/50',
];

export const getCourseColor = (courseId: string) => {
    if (!courseId) return COURSE_COLORS[0];
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
        hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COURSE_COLORS.length;
    return COURSE_COLORS[index];
};

interface SharedCalendarProps {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
    lessons: any[];
    selectedDate: string | null;
    onDateClick: (date: Date) => void;
    isScheduling?: boolean;
    onSchedule?: (lessonId: string) => void;
    lessonsToSchedule?: any[];
    courseId?: string; // If provided, uses a specific color. If not, uses lesson.course_id to find color
    readOnly?: boolean;
}

export const SharedCalendar = ({
    currentDate,
    onPrev,
    onNext,
    lessons,
    selectedDate,
    onDateClick,
    isScheduling,
    onSchedule,
    lessonsToSchedule = [],
    courseId,
    readOnly = false
}: SharedCalendarProps) => {
    const { toast } = useToast();
    const [view, setView] = useState<'month' | 'week'>('month');

    // Week View Helper
    const getWeekDays = (date: Date) => {
        const d = new Date(date);
        const dayNr = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - dayNr);
        const monday = d;

        const days = [];
        for (let i = 0; i < 7; i++) {
            const nextDay = new Date(monday);
            nextDay.setDate(monday.getDate() + i);
            days.push(nextDay);
        }
        return days;
    };

    const days = view === 'month'
        ? (() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDay = new Date(year, month, 1).getDay(); // 0 Sun - 6 Sat

            const daysArr = [];
            for (let i = 0; i < firstDay; i++) daysArr.push(null);
            for (let i = 1; i <= daysInMonth; i++) daysArr.push(new Date(year, month, i));
            return daysArr;
        })()
        : getWeekDays(currentDate);

    const weekHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="flex flex-col h-full bg-[#0D0D0D]">
            {/* Header */}
            <div className="p-4 border-b border-[#262626] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#151515]">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-exec-blue" />
                        <span className="capitalize">
                            {view === 'month'
                                ? currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
                                : `Semana del ${days[0]?.getDate()} de ${days[0]?.toLocaleString('es-ES', { month: 'short' })}`
                            }
                        </span>
                    </h3>
                    <div className="flex bg-[#0A0A0A] rounded-none p-1 border border-[#262626]">
                        <button
                            onClick={() => setView('month')}
                            className={`p-1.5 transition-all ${view === 'month' ? 'bg-[#222] text-exec-blue' : 'text-gray-500 hover:text-white'}`}
                            title="Vista Mensual"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('week')}
                            className={`p-1.5 transition-all ${view === 'week' ? 'bg-[#222] text-exec-blue' : 'text-gray-500 hover:text-white'}`}
                            title="Vista Semanal"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={onPrev} className="p-2 hover:bg-[#1A1A1A] text-gray-400 hover:text-white transition-colors rounded-none border border-transparent hover:border-[#333]">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <button onClick={() => { }} className="px-3 py-1 bg-exec-blue/10 text-exec-blue rounded-none text-sm font-bold border border-exec-blue/20 uppercase tracking-wide">
                        Hoy
                    </button>
                    <button onClick={onNext} className="p-2 hover:bg-[#1A1A1A] text-gray-400 hover:text-white transition-colors rounded-none border border-transparent hover:border-[#333]">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {/* Headers */}
                <div className={`grid ${view === 'month' ? 'grid-cols-7' : 'grid-cols-7'} border-b border-[#262626] sticky top-0 bg-[#0D0D0D] z-10`}>
                    {weekHeaders.map(day => (
                        <div key={day} className="p-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-[#262626] last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                <div className={`grid ${view === 'month' ? 'grid-cols-7 auto-rows-[minmax(80px, 1fr)]' : 'grid-cols-7 h-full min-h-[400px]'}`}>
                    {days.map((date: any, i: number) => {
                        if (!date) return <div key={`empty-${i}`} className="bg-[#0A0A0A]/50 border-[#262626] border-b border-r" />;

                        const dateStr = date.toISOString().split('T')[0];
                        const lessonsOnDate = lessons.filter((l: any) => l.scheduled_date === dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isSelected = selectedDate === dateStr;

                        return (
                            <div
                                key={i}
                                onClick={() => onDateClick(date)}
                                className={`
                                    border-b border-r border-[#262626] transition-all cursor-pointer relative group flex flex-col
                                    ${view === 'month' ? 'min-h-[100px] p-1' : 'h-full p-2 hover:w-[150%] hover:z-20 hover:bg-[#1A1A1A]'}
                                    ${isToday ? 'bg-exec-blue/5' : 'bg-[#0D0D0D]'}
                                    hover:bg-[#151515]
                                `}
                            >
                                <div className={`text-xs mb-1 font-bold p-1 w-7 h-7 flex items-center justify-center self-center sm:self-auto ${isToday
                                    ? 'bg-exec-blue text-white'
                                    : isSelected
                                        ? 'bg-exec-blue/20 text-exec-blue ring-1 ring-exec-blue/50'
                                        : 'text-gray-500'
                                    }`}>
                                    {date.getDate()}
                                </div>

                                <div className="space-y-1 overflow-y-auto flex-1 custom-scrollbar w-full">
                                    {lessonsOnDate.map((l: any) => {
                                        return (
                                            <div
                                                key={l.id}
                                                className="px-2 py-1 mb-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue rounded-none text-[9px] font-bold uppercase tracking-widest truncate shadow-sm cursor-help hover:scale-105 transition-transform"
                                                title={`${l.title} (${l.start_time || 'Sin hora'})`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast('info', `📌 Clase: ${l.title} - Hora: ${l.start_time || '--'} - ${l.end_time || '--'}`);
                                                }}
                                            >
                                                <div className="font-bold flex items-center justify-between">
                                                    <span>{l.start_time?.slice(0, 5)}</span>
                                                    {l.type === 'presencial' && <Users className="w-3 h-3 opacity-50" />}
                                                </div>
                                                <div className="truncate opacity-90">{l.title}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Schedule Popover */}
                                {!readOnly && isSelected && lessonsOnDate.length === 0 && view === 'month' && (
                                    <div className="absolute top-10 left-1 right-1 bg-[#1A1A1A] shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-[#333] rounded-none p-3 z-30 animate-in fade-in zoom-in-95 duration-200 sm:min-w-[150px]">
                                        <p className="font-bold text-gray-400 mb-2 text-[10px] uppercase tracking-wider">Programar Clase:</p>
                                        <select
                                            className="w-full text-xs p-2 rounded-none bg-[#0A0A0A] border border-[#333] text-white focus:ring-1 focus:ring-exec-blue outline-none"
                                            onChange={(e) => onSchedule?.(e.target.value)}
                                            defaultValue=""
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="" disabled>Seleccionar...</option>
                                            {lessonsToSchedule.map((l: any) => (
                                                <option key={l.id} value={l.id} className="bg-[#111]">
                                                    {l.title}
                                                </option>
                                            ))}
                                            {lessonsToSchedule.length === 0 && <option disabled className="bg-[#111]">No hay clases pendientes</option>}
                                        </select>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
