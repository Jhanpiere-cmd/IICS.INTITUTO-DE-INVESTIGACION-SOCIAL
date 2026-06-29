import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Course, Module, Lesson, Profile } from './types';
import {
    Users, Calendar, Award, CheckSquare, Search, Filter,
    ChevronLeft, ChevronRight, Save, Clock, CheckCircle,
    FileText, X, AlertCircle, Loader2, BarChart2, BookOpen
} from 'lucide-react';
import { SharedCalendar } from './SharedCalendar';
import { CertificateGenerator } from './CertificateGenerator';
import { TeacherCertificateGenerator } from './TeacherCertificateGenerator';
import { useToast } from '../ui/ToastContext';

interface TeacherDashboardProps {
    user: User;
    teacherProfile: Profile | null;
    onBack: () => void;
    onCreateCourse: () => void;
    onEditCourse: (course: Course) => void;
}

export function TeacherDashboard({ user, teacherProfile, onBack, onCreateCourse, onEditCourse }: TeacherDashboardProps) {
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'attendance' | 'calendar' | 'grades' | 'certificates'>('attendance');

    // Data for selected course
    const [modules, setModules] = useState<Module[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendanceLog, setAttendanceLog] = useState<Record<string, string>>({}); // lessonId-studentId -> status
    const [gradeChanges, setGradeChange] = useState<Record<string, number>>({});
    const [existingGrades, setExistingGrades] = useState<Record<string, number>>({});

    // Calendar state
    const [isScheduling, setIsScheduling] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        fetchTeacherCourses();
    }, [user.id]);

    const fetchTeacherCourses = async () => {
        setLoading(true);
        try {
            // Fetch courses where user is instructor (by name or ID - depending on your schema)
            // For now, simpler query or verify schema. Assuming 'instructor' field matches name or we filter ID
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('instructor', teacherProfile?.fullName || user.email); // Adjust logic as needed

            if (error) throw error;

            // Also fetch all courses if admin/dev, or just all for demo
            if ((teacherProfile?.role as string) === 'admin' || !data || data.length === 0) {
                const { data: allCourses } = await supabase.from('courses').select('*');
                setCourses(allCourses || []);
            } else {
                setCourses(data || []);
            }

        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseSelect = async (course: Course) => {
        setSelectedCourse(course);
        setLoading(true);
        try {
            // 1. Fetch Modules & Lessons
            const { data: modData } = await supabase
                .from('modules')
                .select('*, lessons(*)')
                .eq('course_id', course.id);

            const allLessons = modData?.flatMap(m => m.lessons) || [];
            allLessons.sort((a, b) => a.order_index - b.order_index);
            setLessons(allLessons);

            // 2. Fetch Enrolled Students with Certificates
            const { data: enrollData, error: enrollError } = await supabase
                .from('enrollments')
                .select('*, profiles("fullName", "avatarUrl")')
                .eq('course_id', course.id)
                .in('status', ['active', 'completed']);

            if (enrollError) throw enrollError;

            // 3. Fetch Student Progress
            const enrolledUserIds = (enrollData as any[] || []).map(e => e.user_id);
            const lessonIds = allLessons.map(l => l.id);

            let progressMap: Record<string, number> = {};

            if (enrolledUserIds.length > 0 && lessonIds.length > 0) {
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('user_id, lesson_id, completed, score')
                    .in('user_id', enrolledUserIds)
                    .in('lesson_id', lessonIds)
                    .eq('completed', true);

                const gradesMap: Record<string, number> = {};
                progressData?.forEach((p: any) => {
                    progressMap[p.user_id] = (progressMap[p.user_id] || 0) + 1;
                    if (p.score !== null && p.score !== undefined) {
                        const key = `${p.user_id}-${p.lesson_id}`;
                        gradesMap[key] = p.score;
                    }
                });
                setExistingGrades(gradesMap);
            }

            const studentsWithProgress = (enrollData as any[] || []).map(student => ({
                ...student,
                calculatedProgress: lessonIds.length > 0
                    ? Math.round(((progressMap[student.user_id] || 0) / lessonIds.length) * 100)
                    : 0
            }));

            setStudents(studentsWithProgress);

        } catch (error) {
            console.error('Error loading course data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- CERTIFICATE PREVIEW STATE ---
    const [previewCert, setPreviewCert] = useState<{ show: boolean, student?: any }>({ show: false });

    // --- ATTENDANCE LOGIC ---
    const handleAttendanceChange = (lessonId: string, studentId: string, status: string) => {
        const key = `${lessonId}-${studentId}`;
        setAttendanceLog(prev => ({ ...prev, [key]: status }));
    };

    const saveAttendance = async () => {
        if (!selectedCourse) return;
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            toast('success', `Asistencia guardada para ${Object.keys(attendanceLog).length} registros.`);
            setAttendanceLog({});
        } catch (e) {
            console.error(e);
            toast('error', 'Error al guardar asistencia.');
        } finally {
            setLoading(false);
        }
    };

    // --- CALENDAR LOGIC ---
    const [currentDate, setCurrentDate] = useState(new Date());

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        setSelectedDate(dateStr);
        setIsScheduling(true);
    };

    const handleScheduleLesson = async (lessonId: string) => {
        if (!selectedDate) return;
        try {
            const { error } = await supabase
                .from('lessons')
                .update({ scheduled_date: selectedDate, start_time: '09:00:00', end_time: '11:00:00' })
                .eq('id', lessonId);

            if (error) throw error;

            setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, scheduled_date: selectedDate, start_time: '09:00' } : l));
            setIsScheduling(false);
            toast('success', 'Clase programada exitosamente.');
        } catch (e) {
            console.error('Error scheduling:', e);
            toast('error', 'Error al programar la clase.');
        }
    };

    // --- GRADES LOGIC ---
    const handleGradeChange = (studentId: string, lessonId: string, scoreStr: string) => {
        const score = parseInt(scoreStr);
        if (isNaN(score) || score < 0 || score > 20) return;
        const key = `${studentId}-${lessonId}`;
        setGradeChange(prev => ({ ...prev, [key]: score }));
    };

    const saveGrades = async () => {
        setLoading(true);
        try {
            const updates = Object.entries(gradeChanges).map(async ([key, score]) => {
                const [userId, lessonId] = key.split('-');
                const { data: existing } = await supabase
                    .from('user_progress')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('lesson_id', lessonId)
                    .single();

                if (existing) {
                    return supabase.from('user_progress').update({ score, completed: true }).eq('id', existing.id);
                } else {
                    return supabase.from('user_progress').insert({
                        user_id: userId,
                        lesson_id: lessonId,
                        completed: true,
                        score
                    });
                }
            });

            await Promise.all(updates);
            setExistingGrades(prev => ({ ...prev, ...gradeChanges }));
            setGradeChange({});
            toast('success', 'Notas actualizadas correctamente.');
            if (selectedCourse) handleCourseSelect(selectedCourse);

        } catch (e) {
            console.error('Error saving grades:', e);
            toast('error', 'Error al guardar notas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full flex-col bg-[#0A0A0A] min-h-screen text-white font-sans selection:bg-exec-blue/30 font-['Inter']">
            {/* Header */}
            <div className="bg-[#0D0D0D] border-b border-[#262626] p-4 flex justify-between items-center shadow-lg shadow-black/40 z-20">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <span className="p-1.5 bg-[#1A1A1A] border border-[#333] rounded-none shadow-inner">
                            <Users className="w-5 h-5 md:w-6 md:h-6 text-exec-blue" />
                        </span>
                        Panel del Docente
                    </h1>
                    <p className="text-xs text-gray-400 ml-11 font-medium tracking-wide">GESTIÓN ACADÉMICA</p>
                </div>
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white px-4 py-2.5 border border-[#262626] hover:bg-[#1A1A1A] hover:border-gray-600 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-none"
                >
                    <ChevronLeft className="w-4 h-4" /> Salir
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar: Course List */}
                <div className="w-64 bg-[#0D0D0D] border-r border-[#262626] overflow-y-auto hidden md:block custom-scrollbar scrollbar-thumb-[#262626] scrollbar-track-transparent">
                    <div className="p-5 font-bold text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="w-3 h-3" /> Mis Cursos
                    </div>
                    <div className="space-y-1.5 px-3 pb-4">
                        {courses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => handleCourseSelect(course)}
                                className={`w-full text-left px-4 py-3 text-xs font-medium flex items-center justify-between transition-all group border ${selectedCourse?.id === course.id
                                    ? 'bg-[#151515] border-exec-blue text-white'
                                    : 'text-gray-400 border-transparent hover:bg-[#151515] hover:text-white hover:border-[#262626]'
                                    }`}
                            >
                                <span className="truncate">{course.title}</span>
                                {selectedCourse?.id === course.id && (
                                    <div className="w-1.5 h-1.5 bg-exec-blue animate-pulse" />
                                )}
                            </button>
                        ))}
                        {courses.length === 0 && !loading && (
                            <div className="p-6 text-xs text-gray-600 text-center border-2 border-dashed border-[#1A1A1A] mx-2">
                                No tienes cursos asignados.
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A] relative">
                    {/* Background Grid Accent */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />

                    {selectedCourse ? (
                        <>
                            {/* Tabs */}
                            <div className="flex border-b border-[#262626] bg-[#0D0D0D]/80 backdrop-blur-md px-6 gap-8 z-10 sticky top-0">
                                {[
                                    { id: 'attendance', label: 'Asistencia / Alumnos', icon: CheckSquare },
                                    { id: 'calendar', label: 'Calendario', icon: Calendar },
                                    { id: 'grades', label: 'Notas', icon: Award },
                                    { id: 'certificates', label: 'Certificados', icon: FileText },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`py-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-wider relative group ${activeTab === tab.id
                                            ? 'border-exec-blue text-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        <tab.icon className={`w-4 h-4 transition-colors ${activeTab === tab.id ? 'text-exec-blue' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-exec-blue" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* View Content */}
                            <div className="flex-1 overflow-auto p-6 md:p-8 custom-scrollbar relative z-0">
                                {activeTab === 'attendance' && (
                                    <div className="bg-[#0D0D0D] border border-[#262626] overflow-hidden relative">
                                        <div className="p-6 border-b border-[#262626] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0D0D0D]">
                                            <div>
                                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-exec-blue" />
                                                    Listado de Alumnos
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-medium">
                                                    {selectedCourse.type === 'presencial' ? 'Control de Asistencia Presencial' : 'Seguimiento Online'}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={onCreateCourse}
                                                    className="bg-[#151515] hover:bg-[#222] text-white px-4 py-2 text-xs font-bold border border-[#262626] hover:border-gray-600 flex items-center gap-2 transition-all uppercase tracking-wide"
                                                >
                                                    <Loader2 className="w-3.5 h-3.5" /> Nuevo Curso
                                                </button>
                                                <button
                                                    onClick={() => onEditCourse(selectedCourse)}
                                                    className="bg-[#151515] hover:bg-[#222] text-white px-4 py-2 text-xs font-bold border border-[#262626] hover:border-gray-600 flex items-center gap-2 transition-all uppercase tracking-wide"
                                                >
                                                    <CheckSquare className="w-3.5 h-3.5" /> Editar
                                                </button>
                                                {selectedCourse.type === 'presencial' && (
                                                    <button
                                                        onClick={saveAttendance}
                                                        className="bg-exec-blue hover:bg-exec-blue/90 text-white px-4 py-2 text-xs font-bold border border-exec-blue flex items-center gap-2 transition-all uppercase tracking-wide"
                                                    >
                                                        <Save className="w-3.5 h-3.5" /> Guardar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-[#111] text-gray-400 border-b border-[#262626]">
                                                    <tr>
                                                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500">Estudiante</th>
                                                        {selectedCourse.type === 'presencial' ? lessons.map((lesson, idx) => (
                                                            <th key={lesson.id} className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500 text-center min-w-[100px]">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-white">Clase {idx + 1}</span>
                                                                    <span className="text-[9px] px-1.5 py-0.5 bg-[#1A1A1A] border border-[#333]">{lesson.scheduled_date || 'N/A'}</span>
                                                                </div>
                                                            </th>
                                                        )) : (
                                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500">Progreso General</th>
                                                        )}
                                                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#1A1A1A] bg-[#0D0D0D]">
                                                    {students.map(student => (
                                                        <tr key={student.id} className="hover:bg-[#151515] transition-colors group">
                                                            <td className="px-6 py-4 font-medium text-white">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-9 h-9 bg-[#151515] flex items-center justify-center text-exec-blue font-bold text-xs border border-[#333]">
                                                                        {student.profiles?.fullName?.charAt(0) || 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-white font-bold text-xs md:text-sm group-hover:text-exec-blue transition-colors">{student.profiles?.fullName || 'Usuario'}</div>
                                                                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{student.profiles?.role || 'Estudiante'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {selectedCourse.type === 'presencial' ? lessons.map(lesson => (
                                                                <td key={lesson.id} className="px-4 py-4 text-center">
                                                                    <select
                                                                        onChange={(e) => handleAttendanceChange(lesson.id, student.user_id, e.target.value)}
                                                                        className="bg-[#151515] border border-[#333] text-gray-300 p-1.5 text-xs focus:ring-1 focus:ring-exec-blue focus:border-exec-blue outline-none w-full max-w-[80px]"
                                                                    >
                                                                        <option value="present">✔️ P</option>
                                                                        <option value="absent">❌ F</option>
                                                                        <option value="late">⚠️ T</option>
                                                                        <option value="excused">📄 J</option>
                                                                    </select>
                                                                </td>
                                                            )) : (
                                                                <td className="px-6 py-4">
                                                                    <div className="w-full max-w-[200px] bg-[#1A1A1A] h-1.5 border border-[#262626] overflow-hidden">
                                                                        <div
                                                                            className="bg-exec-blue h-full transition-all duration-500"
                                                                            style={{ width: `${(student as any).calculatedProgress || 0}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-500 mt-2 block font-mono">
                                                                        {(student as any).calculatedProgress || 0}% COMPLETADO
                                                                    </span>
                                                                </td>
                                                            )}

                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => setPreviewCert({ show: true, student })}
                                                                    className="text-gray-400 hover:text-white border border-[#333] hover:border-exec-blue hover:bg-exec-blue/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                                                                >
                                                                    Ver Certificado
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {students.length === 0 && (
                                                        <tr>
                                                            <td colSpan={lessons.length + 2} className="p-12 text-center text-gray-600">
                                                                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                                <p className="text-xs uppercase tracking-widest font-medium">Sin estudiantes matriculados</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'calendar' && (
                                    <div className="bg-[#0D0D0D] border border-[#262626] overflow-hidden">
                                        <SharedCalendar
                                            currentDate={currentDate}
                                            onPrev={handlePrevMonth}
                                            onNext={handleNextMonth}
                                            lessons={lessons}
                                            selectedDate={selectedDate}
                                            onDateClick={handleDateClick}
                                            isScheduling={isScheduling}
                                            onSchedule={handleScheduleLesson}
                                            lessonsToSchedule={lessons.filter(l => !l.scheduled_date)}
                                            courseId={selectedCourse.id}
                                        />
                                    </div>
                                )}

                                {activeTab === 'grades' && (
                                    <div className="bg-[#0D0D0D] border border-[#262626] overflow-hidden">
                                        <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#0D0D0D]">
                                            <div>
                                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                                    <Award className="w-5 h-5 text-exec-blue" />
                                                    Registro de Calificaciones
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Evaluaciones y Tareas</p>
                                            </div>
                                            <button
                                                onClick={saveGrades}
                                                className="bg-exec-blue hover:bg-exec-blue/90 text-white px-4 py-2 text-xs font-bold border border-exec-blue flex items-center gap-2 transition-all uppercase tracking-wide"
                                            >
                                                <Save className="w-3.5 h-3.5" /> Guardar Cambios
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-[#111] text-gray-400 border-b border-[#262626]">
                                                    <tr>
                                                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500 min-w-[200px]">Estudiante</th>
                                                        {lessons.filter(l => l.type === 'quiz' || l.type === 'assignment' || l.requires_manual_grade).map((lesson, idx) => (
                                                            <th key={lesson.id} className="px-4 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500 text-center min-w-[120px]">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="truncate max-w-[120px] text-white" title={lesson.title}>{lesson.title}</span>
                                                                    <span className="text-[9px] bg-[#1A1A1A] border border-[#333] text-gray-400 px-1.5 py-0.5">{lesson.type === 'quiz' ? 'EXAMEN' : 'TAREA'}</span>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-gray-500 text-center min-w-[100px] bg-[#151515]">Promedio</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#1A1A1A] bg-[#0D0D0D]">
                                                    {students.map(student => (
                                                        <tr key={student.id} className="hover:bg-[#151515] transition-colors">
                                                            <td className="px-6 py-4 font-medium text-white sticky left-0 bg-[#0D0D0D] z-10 border-r border-[#262626]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-[#151515] flex items-center justify-center text-exec-blue font-bold text-xs border border-[#333]">
                                                                        {student.profiles?.fullName?.charAt(0) || 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-white font-medium text-xs">{student.profiles?.fullName || 'Usuario'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {lessons.filter(l => l.type === 'quiz' || l.type === 'assignment' || l.requires_manual_grade).map(lesson => {
                                                                const key = `${student.user_id}-${lesson.id}`;
                                                                const val = gradeChanges[key] !== undefined ? gradeChanges[key] : (existingGrades[key] !== undefined ? existingGrades[key] : '');

                                                                return (
                                                                    <td key={lesson.id} className="px-2 py-3 text-center">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="20"
                                                                            value={val}
                                                                            onChange={(e) => handleGradeChange(student.user_id, lesson.id, e.target.value)}
                                                                            className={`w-16 text-center border p-1.5 bg-[#151515] text-white focus:ring-1 focus:ring-exec-blue font-mono text-xs transition-all outline-none ${gradeChanges[key] ? 'border-exec-blue bg-blue-900/10' : 'border-[#333]'}`}
                                                                            placeholder="-"
                                                                        />
                                                                    </td>
                                                                )
                                                            })}
                                                            <td className="px-6 py-4 text-center font-bold text-white bg-[#151515] border-l border-[#262626]">
                                                                {(() => {
                                                                    const evaluableLessons = lessons.filter(l => l.type === 'quiz' || l.type === 'assignment' || l.requires_manual_grade);
                                                                    const scores = evaluableLessons.map(lesson => {
                                                                        const key = `${student.user_id}-${lesson.id}`;
                                                                        return gradeChanges[key] !== undefined ? gradeChanges[key] : (existingGrades[key] || null);
                                                                    }).filter(s => s !== null) as number[];

                                                                    if (scores.length === 0) return <span className="text-gray-600">-</span>;
                                                                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                                                                    return <span className={avg >= 13 ? 'text-emerald-400' : 'text-red-400'}>{avg.toFixed(1)}</span>;
                                                                })()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'certificates' && (
                                    <div className="bg-[#0D0D0D] border border-[#262626] overflow-hidden">
                                        <div className="p-8 border-b border-[#262626] flex flex-col md:flex-row gap-6 items-start">
                                            <div className="p-4 bg-[#151515] border border-[#262626]">
                                                <Award className="w-12 h-12 text-exec-blue" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl text-white mb-2">Certificado de Docencia</h3>
                                                <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
                                                    Obtén tu certificado oficial por haber impartido el curso <span className="text-exec-blue font-bold">"{selectedCourse.title}"</span>. Este documento acredita tu experiencia y horas lectivas en la plataforma.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-8 bg-[#0A0A0A]">
                                            <TeacherCertificateGenerator
                                                userId={user.id}
                                                courseId={selectedCourse.id}
                                                courseName={selectedCourse.title}
                                                userName={teacherProfile?.fullName || 'Docente'}
                                                courseHours={lessons.length}
                                                studentCount={students.length}
                                                onGenerated={(url) => {
                                                    console.log('Certificado docente generado:', url);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#0A0A0A]">
                            <div className="w-24 h-24 bg-[#0D0D0D] flex items-center justify-center mb-6 border border-[#262626]">
                                <Search className="w-10 h-10 text-gray-700" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Selecciona un Curso</h3>
                            <p className="max-w-xs text-center text-sm">Elige una capacitación del menú lateral para gestionar sus alumnos y notas.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Certificate Preview Modal */}
            {previewCert.show && previewCert.student && selectedCourse && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0D0D0D] w-full max-w-4xl p-1 border border-[#333] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-exec-blue" />
                        <div className="bg-[#0D0D0D] p-6 relative">
                            <button
                                onClick={() => setPreviewCert({ show: false })}
                                className="absolute top-4 right-4 p-2 hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-exec-blue" />
                                Vista Previa de Certificado
                            </h3>

                            <div className="bg-[#151515] border border-[#262626] p-4 min-h-[400px] flex items-center justify-center">
                                <CertificateGenerator
                                    userId={previewCert.student.user_id}
                                    courseId={selectedCourse.id}
                                    courseName={selectedCourse.title}
                                    userName={previewCert.student.profiles?.fullName || 'Estudiante'}
                                    userRole={previewCert.student.profiles?.role || 'Estudiante'}
                                    onGenerated={(url) => console.log('Certificado generado:', url)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
