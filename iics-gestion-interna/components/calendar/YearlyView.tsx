import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface YearlyViewProps {
    events: any[]; // Using any for flexibility based on Event interface
    onMonthClick: (date: Date) => void;
    currentYear?: number;
}

export const YearlyView: React.FC<YearlyViewProps> = ({ events, onMonthClick, currentYear = new Date().getFullYear() }) => {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const getEventsForDay = (day: number, month: number) => {
        const date = new Date(currentYear, month, day);
        return events.filter(e => {
            const eventDate = new Date(e.scheduled_date || e.date); // Handle both formats
            return isSameDay(eventDate, date);
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 animate-in fade-in duration-300">
            {months.map((monthName, monthIndex) => {
                const daysInMonth = getDaysInMonth(monthIndex, currentYear);
                const firstDay = getFirstDayOfMonth(monthIndex, currentYear);
                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                return (
                    <div
                        key={monthName}
                        className="bg-[#111] rounded-sm border border-exec-border p-4 hover:border-indigo-500/30 transition-colors cursor-pointer group shadow-sm"
                        onClick={() => onMonthClick(new Date(currentYear, monthIndex, 1))}
                    >
                        <h3 className="text-sm font-bold text-gray-100 mb-3 text-center group-hover:text-indigo-400 transition-colors uppercase tracking-widest">
                            {monthName}
                        </h3>
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                                <span key={d} className="text-[10px] text-gray-500 font-bold">{d}</span>
                            ))}
                            {Array(firstDay).fill(null).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {days.map(day => {
                                const dayEvents = getEventsForDay(day, monthIndex);
                                const hasEvents = dayEvents.length > 0;

                                return (
                                    <div
                                        key={day}
                                        className={`
                                            aspect-square flex items-center justify-center text-xs rounded-full relative transition-all
                                            ${hasEvents
                                                ? 'bg-indigo-900/40 font-bold text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                                                : 'text-gray-500 hover:bg-[#1A1A1A] hover:text-gray-300'}
                                        `}
                                    >
                                        {day}
                                        {hasEvents && (
                                            <span className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_4px_rgba(99,102,241,0.8)]"></span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
