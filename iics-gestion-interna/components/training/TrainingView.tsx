import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    GraduationCap, LayoutGrid, Edit, BookOpen,
    ArrowLeft, ChevronLeft, ChevronRight, Play, FileText,
    FileQuestion, ClipboardList, CheckCircle, Sparkles, Trash2, Calendar, UserPlus, Award
} from 'lucide-react';

import { CertificateGenerator } from './CertificateGenerator';
import confetti from 'canvas-confetti';
import { CourseCatalog } from './CourseCatalog';
import { CourseEditor } from './CourseEditor';
import { TeacherDashboard } from './TeacherDashboard';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { LessonPlayer } from './LessonPlayer';
import { CourseCompletionView } from './CourseCompletionView';
import { Course, Module, Lesson, UserProgress, Profile } from './types';

import { StudentCalendar } from './StudentCalendar';

export function TrainingView() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { confirm: confirmAction } = useConfirm();
    const [view, setView] = useState<'catalog' | 'course_detail' | 'course_editor' | 'management' | 'student_calendar'>('catalog');

    // Data State
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [enrollments, setEnrollments] = useState<Map<string, string>>(new Map());
    const [fullName, setFullName] = useState<string>('');
    const [profile, setProfile] = useState<Profile | null>(null);

    // UI State
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({});
    const [showCelebration, setShowCelebration] = useState(false);

    // Cursos separados por rol
    const [ownedCourses, setOwnedCourses] = useState<Course[]>([]); // Cursos que el usuario creó
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]); // Cursos matriculados
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]); // Cursos disponibles

    // Initial Fetch
    useEffect(() => {
        fetchCourses();
        if (user?.id) {
            fetchEnrollments();
            fetchUserProfile();
        }
    }, [user?.id]);

    const fetchUserProfile = async () => {
        if (!user?.id) return;
        try {
            // Fetch authoritative data from 'profiles' table
            const { data: profileData } = await supabase.from('profiles').select('*, "fullName", "avatarUrl"').eq('id', user.id).single();

            if (profileData) {
                setProfile({
                    ...profileData,
                    fullName: profileData.fullName || 'Estudiante',
                    avatarUrl: profileData.avatarUrl
                });
                setFullName(profileData.fullName || 'Estudiante');
            } else {
                // Fallback to metadata if profile doesn't exist yet
                let name = (user as any)?.user_metadata?.full_name || 'Estudiante';
                setFullName(name);
                setProfile({
                    id: user.id,
                    fullName: name,
                    role: (user as any).role || 'Estudiante'
                } as Profile);
            }
        } catch (e) {
            console.error('Error fetching profile:', e);
            setFullName('Estudiante');
        }
    };

    // Fetch User Progress when course/user changes
    useEffect(() => {
        if (selectedCourse && user?.id) {
            loadUserProgress();
        }
    }, [selectedCourse, user?.id]);

    const fetchEnrollments = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select('course_id, status')
                .eq('user_id', user.id);

            if (error) throw error;
            const newEnrollments = new Map();
            data?.forEach(e => newEnrollments.set(e.course_id, e.status));
            setEnrollments(newEnrollments);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        }
    };

    const handleEnrollCourse = async (courseId: string) => {
        if (!user?.id) return;

        try {
            const { error } = await supabase
                .from('enrollments')
                .insert({
                    user_id: user.id,
                    course_id: courseId,
                    status: 'active'
                });

            if (error) throw error;

            // Update local state
            const newEnrollments = new Map(enrollments);
            newEnrollments.set(courseId, 'active');
            setEnrollments(newEnrollments);

            toast('success', '¡Matriculación exitosa! Ahora puedes acceder al curso.');
        } catch (error) {
            console.error('Error enrolling:', error);
            toast('error', 'Error al matricularse en el curso.');
        }
    };

    const fetchCourses = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // 1. Cargar TODOS los cursos primero
            const { data: allCourses, error: coursesError } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (coursesError) throw coursesError;

            // Mantener estado original para compatibilidad
            setCourses(allCourses || []);

            if (!user?.id) {
                setOwnedCourses([]);
                setEnrolledCourses([]);
                setAvailableCourses(allCourses || []);
                return;
            }

            // 2. Separar cursos CREADOS por el usuario (modo docente)
            const owned = allCourses?.filter(c => c.created_by === user.id) || [];
            setOwnedCourses(owned);

            // 3. Obtener IDs de cursos MATRICULADOS
            const { data: enrollmentsData, error: enrollError } = await supabase
                .from('enrollments')
                .select('course_id')
                .eq('user_id', user.id);

            if (enrollError) throw enrollError;

            const enrolledIds = new Set(enrollmentsData?.map(e => e.course_id) || []);
            const ownedIds = new Set(owned.map(c => c.id));

            // 4. Cursos donde está MATRICULADO (excluir los que creó)
            const enrolled = allCourses?.filter(c =>
                enrolledIds.has(c.id) && !ownedIds.has(c.id)
            ) || [];
            setEnrolledCourses(enrolled);

            // 5. Cursos DISPONIBLES (excluir creados y matriculados)
            const available = allCourses?.filter(c =>
                !ownedIds.has(c.id) && !enrolledIds.has(c.id)
            ) || [];
            setAvailableCourses(available);

        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async (courseId: string, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('modules')
                .select(`*, lessons (*)`)
                .eq('course_id', courseId)
                .order('order_index', { ascending: true });

            if (error) throw error;

            const sortedModules = data?.map(module => ({
                ...module,
                lessons: module.lessons?.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
            })) || [];

            setModules(sortedModules);
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserProgress = async () => {
        if (!user?.id || !selectedCourse) return;
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            const progressMap: Record<string, UserProgress> = {};
            data?.forEach(p => {
                progressMap[p.lesson_id] = p;
            });
            setUserProgress(progressMap);
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    };

    const handleCourseClick = async (course: Course) => {
        // Validation: Must be enrolled or Director to enter
        const role = user?.role?.toLowerCase() || '';
        const isExecutive = role.includes('director') || role.includes('asesor') || role.includes('imagen') || role.includes('subdirector') || role.includes('secretaria') || role.includes('relaciones') || role.includes('eventos');

        // Validation: Must be enrolled or Executive to enter
        if (!enrollments.has(course.id) && !isExecutive) {
            return;
        }

        setSelectedCourse(course);
        await fetchModules(course.id);
        setView('course_detail');

        // Auto-select logic
        setTimeout(() => {
            if (modules.length > 0) {
                // Determine first incomplete lesson or first overall logic here could go here
            }
        }, 500);
    };

    const markLessonAsCompleted = async (lessonId: string, score?: number) => {
        if (!user?.id) return;

        try {
            // Optimistic Update
            setUserProgress(prev => ({
                ...prev,
                [lessonId]: { lesson_id: lessonId, completed: true, score }
            }));

            // Use UPSERT to prevent unique constraint errors and ensure persistence
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: user.id,
                    lesson_id: lessonId,
                    completed: true,
                    score: score, // Save the score
                    completed_at: new Date().toISOString()
                }, { onConflict: 'user_id,lesson_id' });

            if (error) throw error;

            // Check if course is completed to show celebration
            checkCourseCompletion();

        } catch (error: any) {
            console.error('Error marking completed:', error);
            // Revert optimistic update
            setUserProgress(prev => {
                const newState = { ...prev };
                delete newState[lessonId];
                return newState;
            });
            toast('error', `Hubo un problema guardando tu progreso: ${error.message || JSON.stringify(error)}`);
        }
    };


    const calculateCourseProgress = () => {
        const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
        if (totalLessons === 0) return 0;
        const completedLessons = (Object.values(userProgress) as UserProgress[]).filter(p =>
            modules.some(m => m.lessons?.some(l => l.id === p.lesson_id)) && p.completed
        ).length;
        return (completedLessons / totalLessons) * 100;
    };

    const checkCourseCompletion = async () => {
        const progress = calculateCourseProgress();
        // If progress is 100%, ensure specific DB update and show celebration/completion view
        if (progress >= 100 && selectedCourse && user) {
            // Update enrollment status to completed
            try {
                await supabase.from('enrollments').update({ status: 'completed' })
                    .eq('user_id', user.id)
                    .eq('course_id', selectedCourse.id);

                // Update local state
                setEnrollments(prev => {
                    const newMap = new Map(prev);
                    newMap.set(selectedCourse.id, 'completed');
                    return newMap;
                });

            } catch (err) {
                console.error("Error updating completion status:", err);
            }

            setShowCelebration(true);

            // Fire confetti
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999 // Ensure it's above the modal backdrop
            });
        }
    };

    const handleNextLesson = () => {
        if (!activeLesson) return;
        const currentModule = modules.find(m => m.id === activeLesson.module_id);
        if (!currentModule || !currentModule.lessons) return;

        const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === activeLesson.id);

        if (currentLessonIndex < currentModule.lessons.length - 1) {
            setActiveLesson(currentModule.lessons[currentLessonIndex + 1]);
        } else {
            // Next Module
            const currentModuleIndex = modules.findIndex(m => m.id === currentModule.id);
            if (currentModuleIndex < modules.length - 1) {
                const nextModule = modules[currentModuleIndex + 1];
                if (nextModule.lessons && nextModule.lessons.length > 0) {
                    const newExpanded = new Set(expandedModules);
                    newExpanded.add(nextModule.id);
                    setExpandedModules(newExpanded);
                    setActiveLesson(nextModule.lessons[0]);
                }
            } else {
                // End of Course
                setShowCelebration(true);
            }
        }
    };

    const handlePrevLesson = () => {
        // Logic similar to previous implementation
        if (!activeLesson) return;
        const currentModule = modules.find(m => m.id === activeLesson.module_id);
        if (!currentModule || !currentModule.lessons) return;

        const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === activeLesson.id);

        if (currentLessonIndex > 0) {
            setActiveLesson(currentModule.lessons[currentLessonIndex - 1]);
        } else {
            const currentModuleIndex = modules.findIndex(m => m.id === currentModule.id);
            if (currentModuleIndex > 0) {
                const prevModule = modules[currentModuleIndex - 1];
                if (prevModule.lessons && prevModule.lessons.length > 0) {
                    const newExpanded = new Set(expandedModules);
                    newExpanded.add(prevModule.id);
                    setExpandedModules(newExpanded);
                    setActiveLesson(prevModule.lessons[prevModule.lessons.length - 1]);
                }
            }
        }
    };

    // --- Management Helper Functions (Passed to Editor) ---
    const handleUpdateCourse = async (courseData: Partial<Course>, coverFile: File | null) => {
        if (!selectedCourse) return;
        try {
            let coverUrl = courseData.cover_url;
            if (coverFile) {
                const fileExt = coverFile.name.split('.').pop();
                const fileName = `covers/${Math.random()}.${fileExt}`;
                await supabase.storage.from('training-content').upload(fileName, coverFile);
                const { data } = supabase.storage.from('training-content').getPublicUrl(fileName);
                coverUrl = data.publicUrl;
            }

            const { error } = await supabase
                .from('courses')
                .update({ ...courseData, cover_url: coverUrl })
                .eq('id', selectedCourse.id);

            if (error) throw error;
            fetchCourses(); // Refresh list
            toast('success', 'Curso actualizado');
        } catch (e) {
            console.error(e);
            toast('error', 'Error al actualizar');
        }
    };

    const handleAddCourse = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('courses')
                .insert({
                    title: 'Nuevo Curso Sin Título',
                    description: 'Descripción del curso...',
                    created_by: user.id,
                    type: 'online'
                })
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setCourses([data, ...courses]);
                setSelectedCourse(data);
                setView('course_editor');
            }
        } catch (error) {
            console.error('Error creating course:', error);
            toast('error', 'Error al crear el curso');
        }
    };

    const handleAddModule = async (title: string) => {
        if (!selectedCourse || !title) return;

        await supabase.from('modules').insert({
            course_id: selectedCourse.id,
            title,
            order_index: modules.length
        });
        fetchModules(selectedCourse.id);
    };

    const handleUpdateModule = async (id: string, titleOrCommand: string) => {
        if (titleOrCommand === 'toggle-final') {
            // Invertir el valor actual
            const module = modules.find(m => m.id === id);
            if (!module) return;

            await supabase.from('modules').update({ is_final_module: !module.is_final_module }).eq('id', id);
            if (selectedCourse) fetchModules(selectedCourse.id); // Refresh to show UI state
        } else {
            await supabase.from('modules').update({ title: titleOrCommand }).eq('id', id);
        }
        // Optimistic update could be better here but refresh is safer for sync
    };

    const handleDeleteModule = async (id: string) => {
        const confirmed = await confirmAction('¿Eliminar módulo?', 'Esta acción no se puede deshacer.');
        if (!confirmed) return;
        await supabase.from('modules').delete().eq('id', id);
        if (selectedCourse) fetchModules(selectedCourse.id);
    };


    const handleDeleteCourse = async (courseId: string) => {
        const confirmed = await confirmAction('¿Eliminar curso?', '¿Estás seguro de que quieres eliminar este curso? Esta acción no se puede deshacer.');
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);

            if (error) throw error;

            setCourses(courses.filter(c => c.id !== courseId));
            if (selectedCourse?.id === courseId) {
                setSelectedCourse(null);
                setView('catalog');
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            toast('error', 'Error al eliminar el curso');
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-exec-blue/30">
            {/* Celebration Overlay logic remains same... */}
            {showCelebration && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-[#0D0D0D] rounded-none p-8 max-w-lg w-full text-center relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#262626]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-exec-blue"></div>
                        <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-6 animate-pulse filter drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                        <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
                            ¡Felicidades!
                        </h2>
                        <p className="text-xl text-gray-400 mb-8">
                            Has completado exitosamente el curso <br />
                            <span className="text-exec-blue font-semibold">"{selectedCourse?.title}"</span>
                        </p>

                        <div className="bg-[#151515] p-6 rounded-none mb-8 border border-[#262626]">
                            <p className="font-medium text-gray-300 mb-4 flex items-center justify-center gap-2">
                                <Award className="w-5 h-5 text-exec-blue" />
                                Tu certificado está listo
                            </p>
                            {selectedCourse && user && (
                                <CertificateGenerator
                                    userId={user.id}
                                    courseId={selectedCourse.id}
                                    userName={fullName}
                                    courseName={selectedCourse.title}
                                    userRole={profile?.role || user?.role || 'Estudiante'}
                                />
                            )}
                        </div>

                        <button
                            onClick={() => setShowCelebration(false)}
                            className="text-gray-500 hover:text-white transition-colors text-sm"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Header Content */}
            <div className="max-w-7xl mx-auto p-4 md:pt-4 md:px-6 space-y-8">

                {/* Top Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#262626] pb-4 px-2 md:px-0">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                                <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                                    <GraduationCap className="w-6 h-6 text-exec-blue" />
                                </div>
                                <span>Academia <span className="text-exec-blue">ACS</span></span>
                            </h1>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1 md:ml-[51px]">
                            Capacitación y desarrollo profesional continuo.
                        </p>
                    </div>

                    {/* Navigation Actions */}
                    <div className="flex flex-wrap gap-3 w-full md:w-auto md:ml-0">
                        {/* Botón Mi Calendario */}
                        {view !== 'course_editor' && (
                            <button
                                onClick={() => setView('student_calendar')}
                                className={`px-4 py-2.5 rounded-none text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2 ${view === 'student_calendar'
                                    ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                    : 'bg-[#111] border-[#262626] text-gray-400 hover:text-white hover:border-gray-400 hover:bg-[#1A1A1A]'
                                    }`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Mi Calendario</span>
                            </button>
                        )}

                        {/* Staff Actions */}
                        {(user?.role === 'Director' || user?.role === 'Asesor' || user?.role === 'Docente' || user?.role === 'Subdirector' || user?.role === 'Secretaria') && view !== 'course_editor' && (
                            <>
                                {(user.role === 'Director' || user.role === 'Asesor') && (
                                    <button
                                        onClick={handleAddCourse}
                                        className="px-4 py-2.5 bg-exec-blue hover:bg-exec-blue/90 text-white rounded-none transition-all shadow-[0_0_15px_rgba(0,136,255,0.3)] text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-exec-blue"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Nuevo Curso</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setView('management')}
                                    className={`px-4 py-2.5 rounded-none text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2 ${view === 'management'
                                        ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                        : 'bg-[#111] border-[#262626] text-gray-400 hover:text-white hover:border-gray-400 hover:bg-[#1A1A1A]'
                                        }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    <span>Panel Docente</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>


                {/* VIEWS */}

                {/* 1. CATALOG - DIVIDIDO EN TRES SECCIONES */}
                {
                    view === 'catalog' && (
                        <div className="space-y-8">
                            {/* Sección 1: CURSOS QUE DICTO (Solo si tiene cursos creados) */}
                            {ownedCourses.length > 0 && (
                                <div>
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                                            <BookOpen className="w-6 h-6 text-exec-blue" />
                                            MIS CURSOS (DOCENTE)
                                        </h2>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1 ml-9">
                                            Cursos que estás dictando
                                        </p>
                                    </div>
                                    <CourseCatalog
                                        courses={ownedCourses}
                                        loading={false}
                                        mode="instructor" // ¡MODO INSTRUCTOR!
                                        onCourseClick={(course) => {
                                            setSelectedCourse(course);
                                            fetchModules(course.id);
                                            setView('course_detail'); // Ir a detalles para previsualizar
                                        }}
                                        enrolledCourses={new Map()} // No mostrar badges de matriculado
                                        userRole={user?.role}
                                        onEdit={(course) => {
                                            setSelectedCourse(course);
                                            fetchModules(course.id);
                                            setView('course_editor');
                                        }}
                                        onDelete={handleDeleteCourse}
                                    />
                                </div>
                            )}

                            {/* Sección 2: CURSOS DONDE ESTOY MATRICULADO */}
                            {enrolledCourses.length > 0 && (
                                <div>
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                                            <Play className="w-6 h-6 text-exec-blue" />
                                            MIS CAPACITACIONES
                                        </h2>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1 ml-9">
                                            Cursos en los que estás matriculado
                                        </p>
                                    </div>
                                    <CourseCatalog
                                        courses={enrolledCourses}
                                        loading={false}
                                        mode="student" // ¡MODO ESTUDIANTE!
                                        onCourseClick={(course) => {
                                            setSelectedCourse(course);
                                            fetchModules(course.id);
                                            if (enrollments.get(course.id) === 'completed') {
                                                setShowCelebration(true);
                                            } else {
                                                setShowCelebration(false);
                                            }
                                            setView('course_detail');
                                        }}
                                        enrolledCourses={enrollments}
                                    // NO pasar onEdit/onDelete aquí (modo estudiante)
                                    />
                                </div>
                            )}

                            {/* Sección 3: CURSOS DISPONIBLES PARA MATRICULARSE */}
                            {availableCourses.length > 0 && (
                                <div>
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                                            <UserPlus className="w-6 h-6 text-exec-blue" />
                                            CURSOS DISPONIBLES
                                        </h2>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1 ml-9">
                                            Explora nuevas capacitaciones
                                        </p>
                                    </div>
                                    <CourseCatalog
                                        courses={availableCourses}
                                        loading={false}
                                        mode="catalog" // ¡MODO CATÁLOGO!
                                        onCourseClick={(course) => {
                                            // Solo permitir ver detalles si está matriculado
                                            // Por ahora, no hacer nada hasta que se matricule
                                        }}
                                        enrolledCourses={enrollments}
                                        onEnroll={handleEnrollCourse}
                                    // NO pasar userRole/onEdit/onDelete (son cursos ajenos)
                                    />
                                </div>
                            )}

                            {/* Mensaje si no hay cursos en ninguna categoría */}
                            {ownedCourses.length === 0 && enrolledCourses.length === 0 && availableCourses.length === 0 && !loading && (
                                <div className="col-span-full text-center py-16 bg-[#0D0D0D] rounded-none border border-[#262626] flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-[#151515] rounded-none flex items-center justify-center mb-6 border border-[#262626] shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                                        <BookOpen className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">NO HAY CURSOS DISPONIBLES</h3>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Pronto se agregarán nuevas capacitaciones.</p>
                                </div>
                            )}
                        </div>
                    )
                }


                {/* 2. COURSE DETAIL (STUDENT VIEW) */}
                {
                    view === 'course_detail' && selectedCourse && (
                        <div className="flex flex-col md:h-[calc(100vh-140px)] h-auto">
                            {/* If Celebration/Completion Mode is active (and not just modal), show CompletionView */}
                            {showCelebration && enrollments.get(selectedCourse.id) === 'completed' ? (
                                <CourseCompletionView
                                    courseTitle={selectedCourse.title}
                                    courseId={selectedCourse.id}
                                    userName={fullName}
                                    userId={user?.id || ''}
                                    onBack={() => setShowCelebration(false)}
                                />
                            ) : (
                                // STANDARD COURSE VIEW WRAPPER
                                <>
                                    <button
                                        onClick={() => setView('catalog')}
                                        className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 transition-colors w-fit px-2 py-1 text-sm font-bold uppercase tracking-wide"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> <span className="hidden md:inline">Volver al catálogo</span><span className="md:hidden">Volver</span>
                                    </button>

                                    {/* Responsive Layout Container */}
                                    <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-6 md:overflow-hidden md:h-full h-auto">

                                        {/* Modules Sidebar */}
                                        {/* Mobile: Collapsible or top section. Desktop: Fixed sidebar */}
                                        <div className="w-full md:w-80 bg-[#0D0D0D] rounded-none border border-[#262626] flex flex-col md:h-full shadow-none flex-shrink-0 max-h-[40vh] md:max-h-none overflow-hidden order-1 md:order-1">
                                            <div className="p-4 border-b border-[#262626] flex-shrink-0 bg-[#151515]">
                                                <h3 className="font-bold text-white truncate text-base md:text-lg">{selectedCourse.title}</h3>
                                                {/* Progress Bar */}
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-xs mb-1 text-gray-400 font-medium">
                                                        <span>Progreso</span>
                                                        <span>{Math.round(calculateCourseProgress())}%</span>
                                                    </div>
                                                    <div className="w-full bg-[#262626] rounded-none h-1.5 border border-[#333]">
                                                        <div className="bg-exec-blue h-[4px] rounded-none transition-all duration-500 shadow-[0_0_10px_rgba(0,136,255,0.5)]" style={{ width: `${calculateCourseProgress()}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                                {modules.map(module => (
                                                    <div key={module.id} className="rounded-none overflow-hidden border border-[#262626] transition-all">
                                                        <button
                                                            onClick={() => {
                                                                const newExpanded = new Set(expandedModules);
                                                                if (newExpanded.has(module.id)) newExpanded.delete(module.id);
                                                                else newExpanded.add(module.id);
                                                                setExpandedModules(newExpanded);
                                                            }}
                                                            className="w-full p-3 bg-[#111] flex items-center justify-between hover:bg-[#1A1A1A] transition-colors group"
                                                        >
                                                            <span className="font-bold text-xs uppercase tracking-wide text-gray-300 group-hover:text-white text-left line-clamp-1 flex-1 mr-2">{module.title}</span>
                                                            {expandedModules.has(module.id) ?
                                                                <ChevronLeft className="w-4 h-4 -rotate-90 text-gray-500 group-hover:text-white flex-shrink-0 transition-colors" /> :
                                                                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white flex-shrink-0 transition-colors" />
                                                            }
                                                        </button>

                                                        {expandedModules.has(module.id) && (
                                                            <div className="bg-[#0A0A0A] p-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                                                {module.lessons?.map(lesson => (
                                                                    <button
                                                                        key={lesson.id}
                                                                        onClick={() => {
                                                                            setActiveLesson(lesson);
                                                                        }}
                                                                        className={`w-full p-2 rounded-none flex items-center gap-3 text-sm transition-all border ${activeLesson?.id === lesson.id
                                                                            ? 'bg-exec-blue/10 text-white border-exec-blue/50'
                                                                            : 'border-transparent text-gray-400 hover:bg-[#151515] hover:text-gray-200 hover:border-[#333]'
                                                                            }`}
                                                                    >
                                                                        <div className={`p-1.5 rounded-none flex-shrink-0 ${activeLesson?.id === lesson.id ? 'bg-exec-blue/20 text-exec-blue border border-exec-blue/40' : 'bg-[#1A1A1A] text-gray-500 border border-[#333]'}`}>
                                                                            {lesson.type === 'video' ? <Play className="w-3 h-3" /> :
                                                                                lesson.type === 'quiz' ? <FileQuestion className="w-3 h-3" /> :
                                                                                    <FileText className="w-3 h-3" />}
                                                                        </div>
                                                                        <span className="truncate text-left flex-1 text-xs font-medium">{lesson.title}</span>
                                                                        {userProgress[lesson.id]?.completed && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Admin Edit Button inside Course View */}
                                            {(() => {
                                                const role = user?.role?.toLowerCase() || '';
                                                const canEdit = role.includes('director') || role.includes('asesor') || role.includes('imagen') || role.includes('subdirector') || selectedCourse?.created_by === user?.id;
                                                return canEdit && (
                                                    <div className="p-3 border-t border-[#262626] flex-shrink-0 bg-[#0D0D0D]">
                                                        <button
                                                            onClick={() => setView('course_editor')}
                                                            className="w-full py-2.5 border border-exec-blue/30 bg-exec-blue/5 hover:bg-exec-blue/20 rounded-none text-[10px] font-black uppercase tracking-widest text-exec-blue hover:text-white hover:border-exec-blue transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" /> Editar Curso
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Lesson Content Area */}
                                        <div className="flex-1 flex flex-col md:h-full h-auto md:overflow-hidden order-2 md:order-2 bg-[#0D0D0D] rounded-none border border-[#262626] shadow-none relative">
                                            {activeLesson ? (
                                                <LessonPlayer
                                                    activeLesson={activeLesson}
                                                    userProgress={userProgress}
                                                    onMarkCompleted={markLessonAsCompleted}
                                                    onNextLesson={handleNextLesson}
                                                    onPrevLesson={handlePrevLesson}
                                                    isFirstLesson={false}
                                                    isLastLesson={false}
                                                />
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center flex-col p-8 text-center bg-[#0D0D0D]">
                                                    <div className="bg-[#151515] p-5 border border-[#333] rounded-none mb-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                                        <BookOpen className="w-8 h-8 text-exec-blue" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight uppercase">Comienza a aprender</h3>
                                                    <p className="text-gray-500 max-w-xs text-[10px] font-bold uppercase tracking-widest">
                                                        Selecciona una lección del menú {window.innerWidth < 768 ? 'superior' : 'lateral'} para ver su contenido.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                }


                {/* 3. COURSE EDITOR (ADMIN VIEW) */}
                {
                    view === 'course_editor' && selectedCourse && (
                        <CourseEditor
                            course={selectedCourse}
                            modules={modules}
                            onBack={() => setView('course_detail')}
                            onUpdateCourse={async (c, f) => {
                                await handleUpdateCourse(c, f);
                                fetchCourses(true);
                            }}
                            onAddModule={handleAddModule}
                            onUpdateModule={handleUpdateModule}
                            onDeleteModule={handleDeleteModule}
                            onRefreshModules={(id) => fetchModules(id, true)}
                        />
                    )
                }



                {/* 4. MANAGEMENT (TEACHER DASHBOARD) */}
                {
                    view === 'management' && user && (
                        <TeacherDashboard
                            user={user}
                            teacherProfile={profile}
                            onBack={() => setView('catalog')}
                            onEditCourse={(course) => {
                                setSelectedCourse(course);
                                setView('course_editor');
                            }}
                            onCreateCourse={() => {
                                setSelectedCourse(null);
                                setView('course_editor');
                            }}
                        />
                    )
                }

                {/* 5. STUDENT CALENDAR */}
                {
                    view === 'student_calendar' && user && (
                        <StudentCalendar
                            user={user}
                            onBack={() => setView('catalog')}
                        />
                    )
                }
            </div>
        </div>
    );
}
