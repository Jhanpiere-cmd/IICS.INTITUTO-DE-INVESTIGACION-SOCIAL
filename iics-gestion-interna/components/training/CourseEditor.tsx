import React, { useState, useRef, useMemo } from 'react';
import { AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { supabase } from '../../lib/supabase';
import { Course, Module, Lesson, Question } from './types';
import {
    ArrowLeft, Plus, Sparkles, Trash2, Edit, Video,
    FileText, FileQuestion, ClipboardList, PlusCircle,
    MinusCircle, Upload, CheckCircle, X, Save, Image as ImageIcon, Award, Clock, BookOpen, Loader2
} from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';

const ToolbarButton = ({ command, arg, icon, title }: { command: string, arg?: string, icon: React.ReactNode, title: string }) => (
    <button
        onMouseDown={(e) => {
            e.preventDefault(); // Evitar perder foco del editor
            document.execCommand(command, false, arg);
        }}
        className="p-1.5 min-w-[32px] rounded-none hover:bg-[#222] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
        title={title}
    >
        {icon}
    </button>
);

interface CourseEditorProps {
    course: Course;
    modules: Module[];
    onBack: () => void;
    onUpdateCourse: (course: Partial<Course>, coverFile: File | null) => Promise<void>;
    onAddModule: (title: string) => void;
    onUpdateModule: (moduleId: string, title: string) => void;
    onDeleteModule: (moduleId: string) => void;
    onRefreshModules: (courseId: string) => Promise<void>;
}

export function CourseEditor({
    course,
    modules,
    onBack,
    onUpdateCourse,
    onAddModule,
    onUpdateModule,
    onDeleteModule,
    onRefreshModules
}: CourseEditorProps) {
    const { toast } = useToast();
    const { confirm: confirmAction } = useConfirm();

    // State for course details editing
    const [editingCourse, setEditingCourse] = useState<Course>(course);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // State for lesson editing
    const [isEditingLesson, setIsEditingLesson] = useState(false);
    const [currentLesson, setCurrentLesson] = useState<Partial<Lesson>>({});
    const [currentModuleId, setCurrentModuleId] = useState<string>('');
    const [lessonFile, setLessonFile] = useState<File | null>(null);

    // State for module addition
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');

    // AI Modals State
    const [aiMode, setAiMode] = useState(false); // For generating lessons
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    const handleSaveCourseDetails = async () => {
        setIsSaving(true);
        await onUpdateCourse(editingCourse, coverFile);
        setIsSaving(false);
    };

    // State for new fields
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const handleOpenLessonModal = (moduleId: string, lesson?: Lesson) => {
        setCurrentModuleId(moduleId);
        setCurrentLesson(lesson || {
            title: '',
            type: 'text',
            order_index: 0,
            content_text: '',
            questions: []
        });
        setLessonFile(null);
        setPdfFile(null);
        setIsEditingLesson(true);
    };

    const handleSaveLesson = async () => {
        // Validación explícita
        if (!currentLesson.title) {
            toast('error', 'El título de la lección es obligatorio.');
            return;
        }
        if (!currentModuleId) {
            toast('error', 'Error de sistema: ID de módulo perdido. Por favor recarga la página.');
            return;
        }

        setIsSaving(true);

        try {
            const lessonData: any = {
                module_id: currentModuleId,
                title: currentLesson.title,
                type: currentLesson.type,
                content_url: currentLesson.content_url,
                content_text: currentLesson.content_text,
                questions: currentLesson.questions,
                order_index: currentLesson.order_index,
                is_recovery_exam: currentLesson.is_recovery_exam,
                scheduled_date: currentLesson.scheduled_date,
                start_time: currentLesson.start_time,
                end_time: currentLesson.end_time,
                video_url: currentLesson.video_url, // Save Video URL
                pdf_url: currentLesson.pdf_url      // Save PDF URL
            };

            // Handle PDF Upload
            if (pdfFile) {
                const fileExt = pdfFile.name.split('.').pop();
                const fileName = `lessons/pdf_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('training-content')
                    .upload(fileName, pdfFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('training-content')
                    .getPublicUrl(fileName);

                lessonData.pdf_url = publicUrl;
            }

            // Handle File Upload for Lesson Resources (PDF, etc)
            if (lessonFile) {
                const fileExt = lessonFile.name.split('.').pop();
                const fileName = `lessons/${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('training-content')
                    .upload(fileName, lessonFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('training-content')
                    .getPublicUrl(fileName);

                lessonData.content_url = publicUrl;
            }

            // Save to DB
            if (currentLesson.id) {
                const { error } = await supabase
                    .from('lessons')
                    .update(lessonData)
                    .eq('id', currentLesson.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('lessons')
                    .insert(lessonData);
                if (error) throw error;
            }

            await onRefreshModules(course.id);
            setIsEditingLesson(false);

        } catch (error: any) {
            console.error('Error saving lesson:', error);
            toast('error', `Error al guardar la lección: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        const confirmed = await confirmAction('¿Eliminar lección?', 'Esta acción no se puede deshacer.');
        if (!confirmed) return;
        try {
            const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
            if (error) throw error;
            await onRefreshModules(course.id);
        } catch (error) {
            console.error('Error deleting lesson:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* AI Generation Modal */}
            {aiMode && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0D0D0D] rounded-none w-full max-w-lg p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-exec-blue relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                                <span className="material-symbols-outlined text-4xl text-exec-blue">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Generador de Cursos IA</h3>
                                <div className="h-0.5 w-12 bg-exec-blue mt-1"></div>
                            </div>
                        </div>
                        <p className="text-gray-400 mb-6">
                            Describe el tema de tu curso y nuestra IA generará una estructura completa de módulos y lecciones para ti.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Tema del Curso</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-none bg-[#151515] border border-[#262626] text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue placeholder-gray-600 transition-all font-medium outline-none"
                                    placeholder="Ej: Marketing Digital para Principiantes"
                                    id="ai-topic-input"
                                />
                            </div>

                            <div className="py-2">
                                <AIEngineSelector 
                                    config={aiConfig} 
                                    onConfigChange={setAiConfig}
                                    variant="minimal"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    onClick={() => setAiMode(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-none transition-colors text-sm font-medium border border-transparent hover:border-[#333]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        const topic = (document.getElementById('ai-topic-input') as HTMLInputElement).value;
                                        if (!topic) return;

                                        // Simulación de Generación IA
                                        setIsSaving(true);
                                        setAiMode(false);

                                        try {
                                            // 1. Modulo Introducción
                                            const { data: mod1 } = await supabase.from('modules').insert({
                                                course_id: course.id,
                                                title: `Introducción a ${topic}`,
                                                order_index: modules.length
                                            }).select().single();

                                            if (mod1) {
                                                await supabase.from('lessons').insert([
                                                    { module_id: mod1.id, title: 'Conceptos Fundamentales', type: 'text', content_text: `<h1>Bienvenido al curso de ${topic}</h1><p>En esta lección aprenderemos...</p>`, order_index: 0 },
                                                    { module_id: mod1.id, title: 'Historia y Contexto', type: 'video', content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order_index: 1 }
                                                ]);
                                            }

                                            // 2. Modulo Avanzado
                                            const { data: mod2 } = await supabase.from('modules').insert({
                                                course_id: course.id,
                                                title: `Estrategias de ${topic}`,
                                                order_index: modules.length + 1
                                            }).select().single();

                                            if (mod2) {
                                                await supabase.from('lessons').insert([
                                                    { module_id: mod2.id, title: 'Casos de Estudio', type: 'text', content_text: '<p>Analicemos casos...</p>', order_index: 0 },
                                                    { module_id: mod2.id, title: 'Evaluación Módulo 1', type: 'quiz', order_index: 1, questions: [{ question: '¿Qué es lo más importante?', options: ['A', 'B', 'C'], correct_answer: 0 }] }
                                                ]);
                                            }

                                            await onRefreshModules(course.id);
                                            toast('success', '¡Estructura generada con éxito!');
                                        } catch (e) {
                                            console.error(e);
                                            toast('error', 'Error al generar contenido');
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    className="px-6 py-2 bg-white text-black hover:bg-gray-100 rounded-none transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] text-[11px] font-bold uppercase tracking-[0.2em] border border-white flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-exec-blue">smart_toy</span>
                                    <span>Generar Estructura</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Header / Navigation */}
            <div className="flex items-center justify-between pb-6 border-b border-[#262626]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-[#222] rounded-none transition-colors group border border-transparent hover:border-[#333]"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white" />
                    </button>
                    <div className="flex-1">
                        <input
                            type="text"
                            value={editingCourse.title}
                            onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                            className="text-2xl font-bold text-white bg-transparent border-none p-0 focus:ring-0 w-full placeholder-gray-600"
                            placeholder="Título del Curso"
                        />
                        <p className="text-sm text-exec-blue font-bold uppercase tracking-widest">Editor de Curso</p>
                    </div>
                </div>
                <div className="flex gap-2">
                        <button
                                onClick={handleSaveCourseDetails}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] text-xs font-bold uppercase tracking-widest border border-emerald-500"
                            >
                        <Save className="w-4 h-4" /> Guardar Cambios
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: General Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#0D0D0D] p-6 rounded-none border border-[#262626] shadow-sm">
                        <h3 className="font-bold text-lg mb-6 text-white flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-exec-blue"></span>
                            Configuración
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Descripción</label>
                                <textarea
                                    className="w-full p-3 rounded-none bg-[#151515] border border-[#262626] text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue placeholder-gray-600 transition-all text-sm outline-none"
                                    rows={4}
                                    value={editingCourse.description}
                                    onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Instructor</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-none bg-[#151515] border border-[#262626] text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue placeholder-gray-600 transition-all text-sm outline-none"
                                    value={editingCourse.instructor || ''}
                                    onChange={e => setEditingCourse({ ...editingCourse, instructor: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Modalidad</label>
                                <select
                                    className="w-full p-3 rounded-none bg-[#151515] border border-[#262626] text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue text-sm outline-none"
                                    value={editingCourse.type || 'online'}
                                    onChange={e => setEditingCourse({ ...editingCourse, type: e.target.value as 'online' | 'presencial' })}
                                >
                                    <option value="online">100% Online (Asincrónico)</option>
                                    <option value="presencial">Presencial / Híbrido</option>
                                </select>
                            </div>

                            {editingCourse.type === 'online' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Fecha Límite</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 rounded-none bg-[#151515] border border-[#262626] text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue text-sm uppercase outline-none" // uppercase for date input visuals
                                        value={editingCourse.default_deadline || ''}
                                        onChange={e => setEditingCourse({ ...editingCourse, default_deadline: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-600 mt-2">Fecha sugerida de finalización para los alumnos.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Portada</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="cover-upload-editor"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => setCoverFile(e.target.files?.[0] || null)}
                                    />
                                    <label
                                        htmlFor="cover-upload-editor"
                                        className="w-full h-32 rounded-none border-2 border-dashed border-[#262626] bg-[#151515] hover:bg-[#1A1A1A] hover:border-exec-blue flex flex-col items-center justify-center cursor-pointer transition-all group"
                                    >
                                        {coverFile ? (
                                            <div className="text-center">
                                                <ImageIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                                <span className="text-xs text-green-400 font-medium">Nueva imagen seleccionada</span>
                                            </div>
                                        ) : editingCourse.cover_url ? (
                                            <img src={editingCourse.cover_url} alt="Cover" className="w-full h-full object-cover rounded-none opacity-60 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="text-center text-gray-500 group-hover:text-white transition-colors">
                                                <Upload className="w-8 h-8 mx-auto mb-2" />
                                                <span className="text-xs font-medium">Subir Portada</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Curriculum (Modules & Lessons) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center bg-[#0D0D0D] p-4 rounded-none border border-[#262626]">
                        <h3 className="font-bold text-xl text-white">Contenido del Curso</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setAiMode(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-exec-blue hover:bg-exec-blue/90 text-white rounded-none text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(0,136,255,0.3)] border border-exec-blue transition-all"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Generar con IA
                            </button>
                            <button
                                onClick={() => { setIsAddingModule(true); setNewModuleTitle(''); }}
                                className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-200 text-black rounded-none text-[10px] font-black border border-white uppercase tracking-widest transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" /> {editingCourse.type === 'presencial' ? 'Nueva Semana' : 'Nuevo Módulo'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {modules.map((module) => (
                            <div key={module.id} className="bg-[#0D0D0D] rounded-none border border-[#262626] overflow-hidden transition-all hover:border-exec-blue">
                                <div className="p-4 bg-[#151515] flex items-center justify-between border-b border-[#262626]">
                                    <div className="flex-1 mr-4">
                                        <input
                                            type="text"
                                            value={module.title}
                                            onChange={(e) => onUpdateModule(module.id, e.target.value)}
                                            className="font-bold text-white bg-transparent border-none p-0 focus:ring-0 w-full text-lg placeholder-gray-600"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className={`flex items-center gap-2 px-3 py-1 rounded-none text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors border ${module.is_final_module
                                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                            : 'bg-[#222] text-gray-500 border-[#333]'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={module.is_final_module || false}
                                                onChange={(e) => onUpdateModule(module.id, e.target.checked ? 'toggle-final' : 'toggle-final')}
                                            />
                                            <Award className="w-3 h-3" />
                                            {module.is_final_module ? 'Certificable' : 'Standard'}
                                        </label>

                                        <button
                                            onClick={() => handleOpenLessonModal(module.id)}
                                            className="p-1.5 text-white hover:bg-[#222] rounded-none text-[10px] flex items-center gap-1 font-black uppercase tracking-widest border border-[#262626] transition-all"
                                        >
                                            <Plus className="w-3 h-3" /> {editingCourse.type === 'presencial' ? 'Clase' : 'Lección'}
                                        </button>
                                        <button
                                            onClick={() => onDeleteModule(module.id)}
                                            className="p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-none transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 space-y-1">
                                    {module.lessons?.length === 0 && (
                                        <div className="text-center py-8 border-2 border-dashed border-[#222] rounded-none m-2">
                                            <p className="text-gray-600 text-xs uppercase tracking-wide font-medium">
                                                {editingCourse.type === 'presencial' ? 'Semana sin clases' : 'Módulo sin contenido'}
                                            </p>
                                        </div>
                                    )}
                                    {module.lessons?.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-3 hover:bg-[#1A1A1A] rounded-none group border border-transparent hover:border-[#333] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-none ${lesson.type === 'video' ? 'bg-exec-blue/10 text-exec-blue' :
                                                    lesson.type === 'quiz' ? 'bg-purple-500/10 text-purple-400' :
                                                        'bg-green-500/10 text-green-400'
                                                    }`}>
                                                    {lesson.type === 'video' ? <Video className="w-4 h-4" /> :
                                                        lesson.type === 'quiz' ? <FileQuestion className="w-4 h-4" /> :
                                                            <FileText className="w-4 h-4" />}
                                                </div>
                                                <span className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors">{lesson.title}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenLessonModal(module.id, lesson)}
                                                    className="p-1.5 text-gray-500 hover:text-white hover:bg-[#333] rounded transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLesson(lesson.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal de Edición de Lección (Con Rich Text) */}
            {isEditingLesson && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-2 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0D0D0D] rounded-none w-full max-w-5xl p-6 md:p-8 shadow-[0_0_100px_rgba(0,0,0,0.8)] h-[95vh] md:h-[90vh] flex flex-col border border-[#262626]">
                        <div className="flex justify-between items-center mb-6 border-b border-[#262626] pb-4">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="p-2 bg-[#151515] rounded-none border border-[#262626]">
                                    <BookOpen className="w-5 h-5 text-exec-blue" />
                                </span>
                                {currentLesson.id ? 'Editar Lección' : 'Nueva Lección'}
                            </h3>
                            <button onClick={() => setIsEditingLesson(false)} className="hover:bg-[#222] text-gray-400 hover:text-white p-2 rounded-none transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Título de la Lección</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 rounded-none bg-[#151515] border border-[#262626] text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue placeholder-gray-600 transition-all font-bold"
                                        value={currentLesson.title}
                                        onChange={e => setCurrentLesson({ ...currentLesson, title: e.target.value })}
                                    />
                                </div>

                                {editingCourse.type === 'presencial' && (
                                    <div className="bg-[#151515] p-4 rounded-none border border-[#333] col-span-1 md:col-span-2 shadow-none">
                                        <h4 className="font-bold text-orange-400 mb-3 flex items-center gap-2 uppercase tracking-wider text-xs">
                                            <Clock className="w-4 h-4" /> Programación Presencial
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold mb-1 text-gray-500 uppercase">Fecha</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-2 rounded-none bg-[#0A0A0A] border border-[#333] text-white focus:border-exec-blue outline-none transition-colors"
                                                    value={currentLesson.scheduled_date || ''}
                                                    onChange={e => setCurrentLesson({ ...currentLesson, scheduled_date: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold mb-1 text-gray-500 uppercase">Hora Inicio</label>
                                                <input
                                                    type="time"
                                                    className="w-full p-2 rounded-none bg-[#0A0A0A] border border-[#333] text-white focus:border-exec-blue outline-none transition-colors"
                                                    value={currentLesson.start_time || ''}
                                                    onChange={e => setCurrentLesson({ ...currentLesson, start_time: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold mb-1 text-gray-500 uppercase">Hora Fin</label>
                                                <input
                                                    type="time"
                                                    className="w-full p-2 rounded-none bg-[#0A0A0A] border border-[#333] text-white focus:border-exec-blue outline-none transition-colors"
                                                    value={currentLesson.end_time || ''}
                                                    onChange={e => setCurrentLesson({ ...currentLesson, end_time: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Tipo de Contenido</label>
                                    <select
                                        className="w-full p-3 rounded-none bg-[#151515] border border-[#262626] text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue text-sm"
                                        value={currentLesson.type}
                                        onChange={e => setCurrentLesson({ ...currentLesson, type: e.target.value as any })}
                                    >
                                        <option value="text">Lectura / Texto Enriquecido</option>
                                        <option value="video">Video</option>
                                        <option value="quiz">Evaluación / Examen</option>
                                        <option value="assignment">Tarea / Asignación</option>
                                    </select>
                                </div>
                            </div>

                            {/* SECCIÓN DE RECURSOS MULTIMEDIA (Visible en todos los tipos excepto quiz/assignment si se desea, o siempre) */}
                            {currentLesson.type !== 'quiz' && (
                                <div className="space-y-4 bg-[#151515] p-6 rounded-none border border-[#262626]">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-yellow-500" /> Recursos Multimedia
                                    </h4>

                                    {/* Video URL Input */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-blue-400">Enlace de Video (YouTube/Vimeo)</label>
                                        <div className="flex gap-2">
                                            <div className="p-3 bg-[#0A0A0A] border border-[#333] rounded-none border-r-0">
                                                <Video className="w-5 h-5 text-exec-blue" />
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full p-3 rounded-none bg-[#0A0A0A] border border-[#333] text-white focus:border-exec-blue transition-colors placeholder-gray-600"
                                                placeholder="https://youtube.com/watch?v=..."
                                                value={currentLesson.video_url || ''}
                                                onChange={e => setCurrentLesson({ ...currentLesson, video_url: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* PDF Upload */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-red-400">Documento PDF Adjunto</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                id="pdf-upload"
                                                className="hidden"
                                                onChange={e => setPdfFile(e.target.files?.[0] || null)}
                                            />
                                            <label
                                                htmlFor="pdf-upload"
                                                className="flex-1 p-3 bg-[#0A0A0A] border border-dashed border-[#333] hover:border-red-500 rounded-none cursor-pointer transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
                                            >
                                                <div className="p-1.5 bg-red-500/10 rounded-none">
                                                    <FileText className="w-4 h-4 text-red-500" />
                                                </div>
                                                <span className="text-sm truncate">
                                                    {pdfFile ? pdfFile.name : (currentLesson.pdf_url ? 'Cambiar PDF actual' : 'Subir archivo PDF')}
                                                </span>
                                            </label>
                                            {currentLesson.pdf_url && !pdfFile && (
                                                <span className="text-xs text-green-500 font-medium whitespace-nowrap px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
                                                    PDF Cargado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* EDITOR DE CONTENIDO DINÁMICO */}

                            {/* Caso 1: Video */}
                            {/* Caso 1: Video */}
                            {currentLesson.type === 'video' && (
                                <div className="bg-[#151515] p-6 rounded-none border border-exec-blue/20 shadow-[0_0_15px_rgba(0,136,255,0.05)]">
                                    <label className="block text-sm font-bold mb-2 text-blue-400 uppercase tracking-wide">URL del Video (YouTube/Vimeo)</label>
                                    <div className="flex gap-2">
                                        <Video className="w-5 h-5 text-exec-blue mt-3" />
                                        <input
                                            type="text"
                                            className="w-full p-3 rounded-none bg-[#0A0A0A] border border-[#333] text-white focus:border-exec-blue transition-colors placeholder-gray-600"
                                            placeholder="https://youtube.com/watch?v=..."
                                            value={currentLesson.content_url || ''}
                                            onChange={e => setCurrentLesson({ ...currentLesson, content_url: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2 ml-7 uppercase tracking-wider">
                                        Soporta enlaces directos de YouTube, Vimeo, Loom o MP4.
                                    </p>
                                </div>
                            )}

                            {/* Caso 2: Texto Enriquecido (Lectura) */}
                            {(currentLesson.type === 'text' || currentLesson.type === 'assignment') && (
                                <div className="space-y-4">
                                    {/* Upload de Archivos Adjuntos */}
                                    {/* ... (Podemos añadir esto luego si se requiere, enfocados en el editor ahora) */}

                                    <div className="h-[400px] flex flex-col">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-bold dark:text-gray-300">Contenido de la Lección</label>
                                            <button
                                                onClick={async () => {
                                                    if (!currentLesson.title) {
                                                        toast('warning', 'Escribe un título primero para que la IA sepa qué generar.');
                                                        return;
                                                    }

                                                    // Simulación de Generación de Contenido
                                                    const dummyContent = `
                                                        <h3>Introducción a ${currentLesson.title}</h3>
                                                        <p>En esta lección exploraremos los conceptos fundamentales de ${currentLesson.title}.</p>
                                                        <h4>1. Conceptos Clave</h4>
                                                        <ul>
                                                            <li>Definición y origen.</li>
                                                            <li>Importancia en el contexto actual.</li>
                                                            <li>Aplicaciones prácticas.</li>
                                                        </ul>
                                                        <p>Este contenido ha sido generado automáticamente por la IA para darte una base sobre la cual trabajar.</p>
                                                    `;

                                                    // Typing effect simple
                                                    setCurrentLesson({ ...currentLesson, content_text: 'Generando contenido con IA...' });
                                                    setTimeout(() => {
                                                        setCurrentLesson({ ...currentLesson, content_text: dummyContent });
                                                    }, 1500);
                                                }}
                                                className="text-[11px] flex items-center gap-2 px-3 py-1.5 bg-white text-black border border-white rounded-none hover:bg-gray-100 transition-all font-bold uppercase tracking-[0.2em] shadow-lg"
                                            >
                                                <span className="material-symbols-outlined text-[18px] text-exec-blue">smart_toy</span>
                                                Autocompletar con IA
                                            </button>
                                        </div>
                                        <div className="flex-1 flex flex-col bg-[#0A0A0A] rounded-none overflow-hidden border border-[#262626] text-gray-300 shadow-inner h-full">
                                            {/* Toolbar de Edición - Sticky */}
                                            <div className="bg-[#111] border-b border-[#262626] p-2 flex flex-wrap gap-1 sticky top-0 z-10 shadow-lg items-center">
                                                {/* Historial */}
                                                <div className="flex gap-1 mr-2">
                                                    <ToolbarButton command="undo" icon={<span className="text-lg">↩</span>} title="Deshacer" />
                                                    <ToolbarButton command="redo" icon={<span className="text-lg">↪</span>} title="Rehacer" />
                                                </div>
                                                <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />

                                                {/* Texto Básico */}
                                                <ToolbarButton command="bold" icon={<span className="font-bold">B</span>} title="Negrita" />
                                                <ToolbarButton command="italic" icon={<span className="italic">I</span>} title="Cursiva" />
                                                <ToolbarButton command="underline" icon={<span className="underline">U</span>} title="Subrayado" />
                                                <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />

                                                {/* Estructura */}
                                                <ToolbarButton command="formatBlock" arg="H2" icon={<span className="font-bold text-xs">H2</span>} title="Título" />
                                                <ToolbarButton command="formatBlock" arg="H3" icon={<span className="font-bold text-xs">H3</span>} title="Subtítulo" />
                                                <ToolbarButton command="formatBlock" arg="P" icon={<span className="text-xs">P</span>} title="Párrafo" />
                                                <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />

                                                {/* Listas y Alineación */}
                                                <ToolbarButton command="insertOrderedList" icon={<span>1.</span>} title="Lista Numerada" />
                                                <ToolbarButton command="insertUnorderedList" icon={<span>•</span>} title="Lista con Viñetas" />
                                                <ToolbarButton command="justifyLeft" icon={<span>←</span>} title="Alinear Izquierda" />
                                                <ToolbarButton command="justifyCenter" icon={<span>↔</span>} title="Centrar" />
                                                <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />

                                                {/* Especiales */}
                                                <button
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        const url = prompt('Introduce la URL del enlace:');
                                                        if (url) document.execCommand('createLink', false, url);
                                                    }}
                                                    className="p-1.5 min-w-[32px] rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors font-mono"
                                                    title="Insertar Enlace"
                                                >
                                                    🔗
                                                </button>
                                                <button
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        // Crear un input file temporal
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = 'image/*';
                                                        input.onchange = async (ev) => {
                                                            const file = (ev.target as HTMLInputElement).files?.[0];
                                                            if (!file) return;

                                                            try {
                                                                // Mostrar indicador de carga (opcional, aquí bloquea un poco)
                                                                const fileName = `content/${Date.now()}_${file.name}`;
                                                                const { error: uploadError } = await supabase.storage
                                                                    .from('training-content') // Asumiendo que este bucket existe
                                                                    .upload(fileName, file);

                                                                if (uploadError) throw uploadError;

                                                                const { data: { publicUrl } } = supabase.storage
                                                                    .from('training-content')
                                                                    .getPublicUrl(fileName);

                                                                // Insertar en la posición del cursor (o al final si se perdió)
                                                                document.execCommand('insertImage', false, publicUrl);
                                                            } catch (err) {
                                                                console.error('Error uploading image:', err);
                                                                toast('error', 'Error al subir imagen. Ver consola.');
                                                            }
                                                        };
                                                        input.click();
                                                    }}
                                                    className="p-1.5 min-w-[32px] rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors font-mono"
                                                    title="Subir Imagen del PC"
                                                >
                                                    🖼️
                                                </button>
                                                <button
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        const url = prompt('O introduce URL de imagen:');
                                                        if (url) document.execCommand('insertImage', false, url);
                                                    }}
                                                    className="p-1.5 min-w-[32px] rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors font-mono text-xs"
                                                    title="Imagen por URL"
                                                >
                                                    🌐
                                                </button>
                                            </div>

                                            {/* Área Editable Styled as a Document */}
                                            <div className="flex-1 overflow-y-auto bg-[#0A0A0A] p-8 flex justify-center">
                                                <div
                                                    ref={(el) => {
                                                        if (el && currentLesson.content_text !== el.innerHTML && document.activeElement !== el) {
                                                            el.innerHTML = currentLesson.content_text || '';
                                                        }
                                                    }}
                                                    onDrop={async (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();

                                                        const files = e.dataTransfer.files;
                                                        if (files && files.length > 0) {
                                                            const file = files[0];
                                                            if (!file.type.startsWith('image/')) return;

                                                            try {
                                                                const fileName = `content/dnd_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                                                                const { error: uploadError } = await supabase.storage
                                                                    .from('training-content')
                                                                    .upload(fileName, file);

                                                                if (uploadError) throw uploadError;

                                                                const { data: { publicUrl } } = supabase.storage
                                                                    .from('training-content')
                                                                    .getPublicUrl(fileName);

                                                                document.execCommand('insertImage', false, publicUrl);
                                                            } catch (err) {
                                                                console.error('Error dropping image:', err);
                                                                toast('error', 'Error al subir imagen arrastrada.');
                                                            }
                                                        }
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault(); // Necessary to allow dropping
                                                    }}
                                                    className="w-full max-w-4xl bg-[#151515] min-h-[800px] shadow-2xl p-12 text-gray-300 prose prose-invert prose-lg focus:outline-none focus:ring-1 focus:ring-exec-blue/30 rounded-none selection:bg-exec-blue/30"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onInput={(e) => {
                                                        const html = e.currentTarget.innerHTML;
                                                        setCurrentLesson(prev => ({ ...prev, content_text: html }));
                                                    }}
                                                    onClick={(e) => {
                                                        const target = e.target as HTMLElement;
                                                        if (target.tagName === 'IMG') {
                                                            const width = prompt('Ancho de la imagen (ej: 50%, 300px):', target.style.width || '100%');
                                                            if (width) {
                                                                target.style.width = width;
                                                                const html = e.currentTarget.innerHTML;
                                                                setCurrentLesson(prev => ({ ...prev, content_text: html }));
                                                            }
                                                        }
                                                    }}
                                                    style={{ lineHeight: '1.8' }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Tip: Puedes arrastrar imágenes o usar el botón de imagen para subirlas automáticamente.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Caso 3: Quiz */}
                            {currentLesson.type === 'quiz' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="block text-lg font-bold dark:text-white">Preguntas del Examen</label>

                                        {editingCourse.type === 'online' && (
                                            <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-none border border-[#333]">
                                                <input
                                                    type="checkbox"
                                                    id="recovery-check"
                                                    checked={currentLesson.is_recovery_exam || false}
                                                    onChange={e => setCurrentLesson({ ...currentLesson, is_recovery_exam: e.target.checked })}
                                                    className="w-4 h-4 text-exec-blue rounded-none border-[#333] focus:ring-exec-blue"
                                                />
                                                <label htmlFor="recovery-check" className="text-xs font-bold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors">
                                                    Sustitutorio
                                                </label>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                const newQs = [...(currentLesson.questions || [])];
                                                newQs.push({ question: '', options: ['', '', '', ''], correct_answer: 0 });
                                                setCurrentLesson({ ...currentLesson, questions: newQs });
                                            }}
                                            className="px-3 py-1.5 bg-exec-blue/10 text-exec-blue border border-exec-blue/30 rounded-none hover:bg-exec-blue/20 text-sm font-bold transition-colors"
                                        >
                                            + Agregar Pregunta
                                        </button>
                                    </div>

                                    {currentLesson.questions?.map((q, idx) => (
                                        <div key={idx} className="p-4 bg-[#151515] rounded-none border border-[#262626]">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-bold text-sm">Pregunta {idx + 1}</span>
                                                <button
                                                    onClick={() => {
                                                        const newQs = currentLesson.questions?.filter((_, i) => i !== idx);
                                                        setCurrentLesson({ ...currentLesson, questions: newQs });
                                                    }}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full p-2 mb-3 rounded-none border border-[#262626] bg-[#0A0A0A] text-white focus:border-exec-blue outline-none transition-all"
                                                placeholder="Escribe la pregunta..."
                                                value={q.question}
                                                onChange={e => {
                                                    const qs = [...(currentLesson.questions || [])];
                                                    qs[idx].question = e.target.value;
                                                    setCurrentLesson({ ...currentLesson, questions: qs });
                                                }}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${idx}`}
                                                            checked={q.correct_answer === optIdx}
                                                            onChange={() => {
                                                                const qs = [...(currentLesson.questions || [])];
                                                                qs[idx].correct_answer = optIdx;
                                                                setCurrentLesson({ ...currentLesson, questions: qs });
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            className="flex-1 p-1.5 rounded-none border border-[#262626] bg-[#151515] text-white focus:border-exec-blue outline-none transition-all text-sm"
                                                            placeholder={`Opción ${optIdx + 1}`}
                                                            value={opt}
                                                            onChange={e => {
                                                                const qs = [...(currentLesson.questions || [])];
                                                                qs[idx].options[optIdx] = e.target.value;
                                                                setCurrentLesson({ ...currentLesson, questions: qs });
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>

                        <div className="pt-4 border-t border-[#262626] flex justify-end gap-3 bg-[#0D0D0D]">
                            <button
                                onClick={() => setIsEditingLesson(false)}
                                className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-none font-bold uppercase tracking-wider text-xs border border-transparent hover:border-[#333] transition-all"
                            >
                                Cancelar
                            </button>
                             <button
                                onClick={handleSaveLesson}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-exec-blue text-white rounded-none hover:bg-exec-blue/90 transition-all font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,136,255,0.3)] hover:shadow-[0_0_30px_rgba(0,136,255,0.5)] border border-exec-blue disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Guardando...' : 'Guardar Lección'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Nuevo Módulo */}
            {isAddingModule && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none p-6 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-[#262626] pb-3">
                            <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4 text-exec-blue" />
                                {editingCourse.type === 'presencial' ? 'Nueva Semana / Categoría' : 'Nuevo Módulo'}
                            </h3>
                            <button onClick={() => setIsAddingModule(false)} className="hover:bg-[#222] text-gray-400 hover:text-white p-1 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-500">Título</label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Ingrese el título..."
                            className="w-full p-3 bg-[#151515] border border-[#262626] text-white rounded-none focus:border-exec-blue focus:ring-1 focus:ring-exec-blue outline-none transition-all mb-6 font-bold"
                            value={newModuleTitle}
                            onChange={(e) => setNewModuleTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newModuleTitle.trim() !== '') {
                                    onAddModule(newModuleTitle.trim());
                                    setIsAddingModule(false);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-3 tracking-widest text-[10px] border-t border-[#262626] pt-4">
                            <button
                                onClick={() => setIsAddingModule(false)}
                                className="px-4 py-2 text-gray-500 hover:text-white hover:bg-[#1A1A1A] border border-transparent hover:border-[#333] transition-colors uppercase font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (newModuleTitle.trim() !== '') {
                                        onAddModule(newModuleTitle.trim());
                                        setIsAddingModule(false);
                                    }
                                }}
                                className="px-4 py-2 bg-exec-blue text-white uppercase font-bold hover:bg-exec-blue/90 transition-colors border border-exec-blue"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
