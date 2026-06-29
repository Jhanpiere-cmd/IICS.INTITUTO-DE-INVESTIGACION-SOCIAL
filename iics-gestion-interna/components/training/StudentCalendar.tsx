import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, ChevronLeft, Loader2 } from 'lucide-react';
import { SharedCalendar } from './SharedCalendar';

interface StudentCalendarProps {
    user: { id: string };
    onBack: () => void;
}

export function StudentCalendar({ user, onBack }: StudentCalendarProps) {
    const [loading, setLoading] = useState(true);
    const [lessons, setLessons] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchStudentSchedule = async () => {
            setLoading(true);
            try {
                // 1. Get enrollments
                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('course_id')
                    .eq('user_id', user.id)
                    .in('status', ['active', 'completed']);

                if (!enrollments || enrollments.length === 0) {
                    setLessons([]);
                    return;
                }

                const courseIds = enrollments.map(e => e.course_id);

                // 2. Get lessons for these courses that have a schedule
                const { data: lessonsData } = await supabase
                    .from('lessons')
                    .select('*, modules!inner(course_id)')
                    .in('modules.course_id', courseIds)
                    .not('scheduled_date', 'is', null);

                // Flatten and shape data
                const formattedLessons = lessonsData?.map(l => ({
                    ...l,
                    course_id: l.modules.course_id, // Ensure course_id is top level for color helper
                    title: l.title // Keep title
                })) || [];

                setLessons(formattedLessons);

            } catch (error) {
                console.error('Error fetching student calendar:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentSchedule();
    }, [user.id]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        setSelectedDate(dateStr);
    };

    return (
        <div className="flex h-full flex-col bg-[#0A0A0A] min-h-screen">
            {/* Header */}
            <div className="bg-[#0D0D0D] border-b border-[#262626] p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-lg md:text-xl font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6 text-exec-blue" />
                        Mi Calendario Académico
                    </h1>
                    <p className="text-sm text-gray-400">Horarios de tus clases presenciales y online</p>
                </div>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-1 rounded-none border border-[#333] hover:bg-[#222] transition-colors text-xs font-black uppercase tracking-widest"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Volver
                </button>
            </div>

            <div className="flex-1 p-4 md:p-6 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
                    </div>
                ) : (
                    <div className="bg-[#0D0D0D] rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#262626] overflow-hidden h-full relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-exec-blue"></div>
                        <SharedCalendar
                            currentDate={currentDate}
                            onPrev={handlePrevMonth}
                            onNext={handleNextMonth}
                            lessons={lessons}
                            selectedDate={selectedDate}
                            onDateClick={handleDateClick}
                            readOnly={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
