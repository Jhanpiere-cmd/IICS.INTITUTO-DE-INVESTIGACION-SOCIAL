import React from 'react';
import { Course } from './types';
import { BookOpen, Play, ChevronRight, UserPlus, CheckCircle, Edit, Trash2, LayoutGrid, Clock, Users } from 'lucide-react';

interface CourseCatalogProps {
    courses: Course[];
    loading: boolean;
    onCourseClick: (course: Course) => void;
    enrolledCourses?: Map<string, string>; // Map<courseId, status>
    onEnroll?: (courseId: string) => void;
    userRole?: string;
    onEdit?: (course: Course) => void;
    onDelete?: (courseId: string) => void;
    mode?: 'instructor' | 'student' | 'catalog'; // Modo de visualización
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
    courses,
    loading,
    onCourseClick,
    enrolledCourses = new Map(),
    onEnroll,
    userRole,
    onDelete,
    onEdit,
    mode = 'catalog' // Por defecto, modo catálogo
}) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#262626] border-t-exec-blue rounded-none animate-spin"></div>
                    <p className="text-gray-500 text-sm font-medium tracking-wide animate-pulse">CARGANDO RECURSOS...</p>
                </div>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="col-span-full text-center py-16 bg-[#0D0D0D] rounded-none border border-[#262626] flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#151515] rounded-none flex items-center justify-center mb-4 border border-[#262626]">
                    <BookOpen className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">SIN CURSOS DISPONIBLES</h3>
                <p className="text-gray-500 text-[11px] uppercase tracking-widest font-bold">No se encontraron capacitaciones en esta sección.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {courses.map(course => {
                const enrollmentStatus = enrolledCourses.get(course.id);
                const isEnrolled = enrollmentStatus === 'active' || enrollmentStatus === 'completed';
                const isCompleted = enrollmentStatus === 'completed';

                return (
                    <div
                        key={course.id}
                        className="group bg-[#0D0D0D] border border-[#262626] rounded-none overflow-hidden hover:border-exec-blue transition-all duration-300 flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                    >
                        {/* Image / Cover Area */}
                        <div className="aspect-video bg-[#151515] relative overflow-hidden cursor-pointer group-hover:opacity-100" onClick={() => (mode !== 'catalog' || isEnrolled) ? onCourseClick(course) : null}>
                            {course.cover_url ? (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] to-transparent opacity-60 z-10" />
                                    <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full bg-[#111] relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#111] to-[#0A0A0A]" />
                                    <BookOpen className="w-12 h-12 text-[#333] z-10" />
                                </div>
                            )}

                            {/* Type Badge */}
                            <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-none border border-exec-blue/30 text-[10px] font-bold uppercase tracking-widest text-exec-blue z-10">
                                {course.type === 'presencial' ? 'Presencial' : 'Asincrónico'}
                            </div>

                            {/* Status Badge */}
                            {isCompleted ? (
                                <div className="absolute top-3 right-3 z-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-none flex items-center gap-1.5 shadow-lg backdrop-blur-md">
                                    <CheckCircle className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Completado</span>
                                </div>
                            ) : isEnrolled && (
                                <div className="absolute top-3 right-3 z-20 bg-exec-blue/10 text-exec-blue border border-exec-blue/20 px-2.5 py-1 rounded-none flex items-center gap-1.5 shadow-lg backdrop-blur-md">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">En Curso</span>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-4 md:p-6 flex flex-col flex-1 relative bg-[#0D0D0D]">
                            {/* Neon Glow Line at top of content */}
                            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#262626] to-transparent group-hover:via-exec-blue/50 transition-all duration-700" />

                            <h3 className="text-base md:text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-exec-blue transition-colors tracking-tight uppercase leading-tight">{course.title}</h3>
                            <p className="text-gray-500 text-[10px] md:text-[11px] line-clamp-2 mb-4 md:mb-6 flex-1 font-medium leading-relaxed tracking-wide">
                                {course.description || 'SIN DESCRIPCIÓN DISPONIBLE PARA ESTE CURSO.'}
                            </p>

                            {/* Instructor Mode Actions */}
                            {mode === 'instructor' && onEdit && onDelete && (
                                <div className="grid grid-cols-4 gap-2 mb-4 pt-4 border-t border-[#262626]">
                                    <button
                                        onClick={() => onEdit(course)}
                                        className="col-span-3 py-2 px-3 bg-[#151515] hover:bg-[#222] border border-[#262626] text-gray-300 hover:text-white rounded-none text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Edit className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button
                                        onClick={() => onDelete(course.id)}
                                        className="col-span-1 py-2 px-3 bg-[#151515] hover:bg-red-900/20 border border-[#262626] hover:border-red-900/30 text-gray-500 hover:text-red-400 rounded-none flex items-center justify-center transition-all"
                                        title="Eliminar curso"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Main Action Button */}
                            <div className="mt-auto">
                                {mode === 'instructor' ? (
                                    <button
                                        onClick={() => onCourseClick(course)}
                                        className="w-full py-2.5 px-4 bg-[#111] hover:bg-exec-blue/10 text-exec-blue hover:text-white border border-[#262626] hover:border-exec-blue/50 rounded-none font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group-hover:shadow-exec-blue/5"
                                    >
                                        <LayoutGrid className="w-4 h-4" /> PANEL DOCENTE
                                    </button>
                                ) : mode === 'student' ? (
                                    isCompleted ? (
                                        <button
                                            onClick={() => onCourseClick(course)}
                                            className="w-full py-2.5 px-4 bg-[#111] hover:bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#262626] rounded-none font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> VER CERTIFICADO
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onCourseClick(course)}
                                            className="w-full py-2.5 px-4 bg-exec-blue hover:bg-exec-blue/90 text-white border border-exec-blue rounded-none font-bold text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,136,255,0.3)] hover:shadow-[0_0_30px_rgba(0,136,255,0.5)] flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-4 h-4 fill-current" /> CONTINUAR
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={() => onEnroll && onEnroll(course.id)}
                                        className="w-full py-2.5 px-4 bg-exec-blue hover:bg-exec-blue/90 text-white border border-exec-blue rounded-none font-bold text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,136,255,0.3)] hover:shadow-[0_0_30px_rgba(0,136,255,0.5)] flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" /> MATRICULARME
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
