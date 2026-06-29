import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Lesson, UserProgress, Module, Course } from './types';
import { CheckCircle, Video, FileText, FileQuestion, ClipboardList, ChevronLeft, ChevronRight, Download, BookOpen } from 'lucide-react';
import { useToast } from '../ui/ToastContext';

interface LessonPlayerProps {
    activeLesson: Lesson;
    userProgress: Record<string, UserProgress>;
    onMarkCompleted: (lessonId: string, score?: number) => void;
    onNextLesson: () => void;
    onPrevLesson: () => void;
    isFirstLesson: boolean;
    isLastLesson: boolean;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
    activeLesson,
    userProgress,
    onMarkCompleted,
    onNextLesson,
    onPrevLesson,
    isFirstLesson,
    isLastLesson
}) => {
    const { toast } = useToast();
    // Quiz State
    const [selectedAnswers, setSelectedAnswers] = React.useState<Record<number, number>>({});

    const updateQuizAnswer = (questionIdx: number, optionIdx: number) => {
        setSelectedAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }));
    };


    // Función para renderizar contenido HTML seguro (del editor rico)
    const createMarkup = (htmlContent: string) => {
        return { __html: htmlContent };
    };

    // Detectar si es contenido HTML (ReactQuill) o Markdown clásico
    const isHtmlContent = (content: string) => {
        return /<[a-z][\s\S]*>/i.test(content || '');
    };

    return (
        <div className="flex-1 bg-[#0D0D0D] rounded-none border border-[#262626] shadow-sm md:overflow-hidden flex flex-col md:h-full h-auto min-h-[500px]">
            {activeLesson ? (
                <>
                    {/* Header de Lección */}
                    <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#151515]">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{activeLesson.title}</h2>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-none text-[10px] font-bold uppercase tracking-widest border ${activeLesson.type === 'video' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    activeLesson.type === 'quiz' ? 'bg-exec-blue/10 text-exec-blue border-exec-blue/20' :
                                        activeLesson.type === 'assignment' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            'bg-green-500/10 text-green-400 border-green-500/20'
                                    }`}>
                                    {activeLesson.type === 'video' ? 'Video' :
                                        activeLesson.type === 'quiz' ? 'Examen' :
                                            activeLesson.type === 'assignment' ? 'Tarea' : 'Lectura'}
                                </span>
                                {userProgress[activeLesson.id]?.completed && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-none border border-emerald-500/20 uppercase tracking-widest">
                                        <CheckCircle className="w-3 h-3" /> Completado
                                        {userProgress[activeLesson.id]?.score !== undefined && ` (${userProgress[activeLesson.id].score}%)`}
                                    </span>
                                )}
                            </div>
                        </div>
                        {activeLesson.type !== 'quiz' && (
                            <button
                                onClick={() => onMarkCompleted(activeLesson.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-none transition-all font-black text-[10px] uppercase tracking-widest border ${userProgress[activeLesson.id]?.completed
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
                                    : 'bg-exec-blue text-white hover:bg-blue-500 border-exec-blue shadow-[0_0_20px_rgba(0,136,255,0.3)] hover:shadow-[0_0_30px_rgba(0,136,255,0.5)]'
                                    }`}
                                disabled={userProgress[activeLesson.id]?.completed}
                            >
                                {userProgress[activeLesson.id]?.completed ? (
                                    <>
                                        <CheckCircle className="w-4 h-4" /> Completado
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" /> Marcar como Visto
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Contenido Scrollable */}
                    <div className="p-3 md:p-4 md:overflow-y-auto overflow-visible scrollbar-hide flex-1">

                        {/* VIDEO (Dedicated Field OR Legacy content_url) */}
                        {(activeLesson.video_url || (activeLesson.type === 'video' && activeLesson.content_url)) && (
                            <div className="w-full aspect-video rounded-none overflow-hidden bg-black mb-6 shadow-xl relative group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-exec-blue opacity-50 group-hover:opacity-100 transition-opacity z-20"></div>
                                {(() => {
                                    const urlToUse = activeLesson.video_url || activeLesson.content_url || '';
                                    const getEmbedUrl = (url: string) => {
                                        try {
                                            let embedUrl = url;
                                            // Handle youtu.be/ID
                                            if (url.includes('youtu.be/')) {
                                                const id = url.split('youtu.be/')[1]?.split('?')[0];
                                                embedUrl = `https://www.youtube.com/embed/${id}`;
                                            }
                                            // Handle youtube.com/watch?v=ID
                                            else if (url.includes('watch?v=')) {
                                                const id = url.split('watch?v=')[1]?.split('&')[0];
                                                embedUrl = `https://www.youtube.com/embed/${id}`;
                                            }
                                            // Handle Vimeo
                                            else if (url.includes('vimeo.com')) {
                                                const id = url.split('vimeo.com/')[1];
                                                return `https://player.vimeo.com/video/${id}`;
                                            }

                                            // Add params to YouTube
                                            if (embedUrl.includes('youtube.com/embed/')) {
                                                const separator = embedUrl.includes('?') ? '&' : '?';
                                                return `${embedUrl}${separator}rel=0&modestbranding=1&showinfo=0`;
                                            }
                                            return embedUrl;
                                        } catch (e) {
                                            return url;
                                        }
                                    };

                                    const embedUrl = getEmbedUrl(urlToUse);

                                    return (urlToUse.includes('youtube') || urlToUse.includes('youtu') || urlToUse.includes('vimeo')) ? (
                                        <iframe
                                            src={embedUrl}
                                            className="w-full h-full absolute inset-0 z-10 border-0"
                                            title={activeLesson.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            scrolling="no"
                                        />
                                    ) : (
                                        <video
                                            src={urlToUse}
                                            controls
                                            className="w-full h-full"
                                            onEnded={() => !userProgress[activeLesson.id]?.completed && onMarkCompleted(activeLesson.id)}
                                        />
                                    );
                                })()}
                            </div>
                        )}

                        {/* TEXTO / ASIGNACIÓN (Soporta Markdown y HTML Rich Text) */}
                        {/* Always show text if present, regardless of type (allows mixing) */}
                        {(activeLesson.content_text) && (
                            <div className="prose prose-invert max-w-none text-gray-300 mb-8">
                                {isHtmlContent(activeLesson.content_text || '') ? (
                                    <div
                                        className="rich-text-content [&>h1]:text-white [&>h2]:text-white [&>h3]:text-white [&>p]:text-gray-300 [&>ul]:text-gray-300 [&>ol]:text-gray-300 [&>strong]:text-white"
                                        dangerouslySetInnerHTML={createMarkup(activeLesson.content_text || '')}
                                    />
                                ) : (
                                    <ReactMarkdown>{activeLesson.content_text || ''}</ReactMarkdown>
                                )}
                            </div>
                        )}

                        {/* PDF VIEWER / DOWNLOADER */}
                        {activeLesson.pdf_url && (
                            <div className="mt-6 mb-8 p-0 bg-[#0A0A0A] rounded-none border border-[#262626] overflow-hidden group hover:border-exec-blue transition-all shadow-lg">
                                <div className="p-4 bg-[#151515] border-b border-[#262626] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-red-500/10 rounded-none border border-red-500/20">
                                            <FileText className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Documento de Lectura</h4>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">PDF Adjunto</p>
                                        </div>
                                    </div>
                                    <a
                                        href={activeLesson.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-[#222] hover:bg-white hover:text-black text-white rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-[#333]"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Descargar
                                    </a>
                                </div>
                                <div className="w-full h-[600px] bg-[#111] relative">
                                    <iframe
                                        src={`${activeLesson.pdf_url}#toolbar=0`}
                                        className="w-full h-full border-none"
                                        title="PDF Viewer"
                                    />
                                    {/* Overlay for interaction if needed */}
                                </div>
                            </div>
                        )}

                        {/* Legacy content_url fallback (if not video/pdf match) */}
                        {activeLesson.content_url && !activeLesson.video_url && activeLesson.type !== 'video' && !activeLesson.content_url.includes('youtube') && (
                            <div className="mt-8 p-5 bg-[#1A1A1A] rounded-none border border-[#333] flex items-center justify-between group hover:border-exec-blue transition-all shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#222] rounded-none border border-[#333] group-hover:bg-exec-blue/10 group-hover:border-exec-blue/30 transition-colors">
                                        <FileText className="w-6 h-6 text-exec-blue" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white mb-0.5 uppercase tracking-wide text-xs">Material Adjunto</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Recurso descargable</p>
                                    </div>
                                </div>
                                <a
                                    href={activeLesson.content_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2.5 bg-[#222] text-exec-blue hover:text-white hover:bg-exec-blue rounded-none font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-[#333] hover:border-exec-blue"
                                >
                                    <Download className="w-4 h-4" /> Descargar
                                </a>
                            </div>
                        )}

                        {/* QUIZ (Implementación básica por ahora) */}
                        {activeLesson.type === 'quiz' && (
                            <div className="max-w-2xl mx-auto py-8">
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 bg-exec-blue/10 rounded-none flex items-center justify-center mx-auto mb-4 border border-exec-blue/20 shadow-[0_0_30px_rgba(0,136,255,0.2)]">
                                        <FileQuestion className="w-10 h-10 text-exec-blue" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Evaluación de Conocimientos</h3>
                                    <p className="text-gray-400 max-w-lg mx-auto">Responde las siguientes preguntas para demostrar tu dominio del tema y completar la lección.</p>
                                </div>

                                <div className="space-y-6">
                                    {activeLesson.questions?.map((q, idx) => (
                                        <div key={idx} className="bg-[#151515] p-4 md:p-6 rounded-none border border-[#262626] hover:border-exec-blue/40 transition-colors relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-exec-blue/50 group-hover:bg-exec-blue transition-colors"></div>
                                            <p className="font-bold mb-4 text-white text-lg">{idx + 1}. {q.question}</p>
                                            <div className="space-y-2">
                                                {q.options.map((opt, optIdx) => (
                                                    <label key={optIdx} className="flex items-center gap-3 p-3 border border-[#333] rounded-none hover:bg-[#222] cursor-pointer transition-all bg-[#0A0A0A] group/opt">
                                                        <div className="relative">
                                                            <input
                                                                type="radio"
                                                                name={`q-${idx}`}
                                                                className="peer sr-only"
                                                                onChange={(e) => {
                                                                    if (e.target.checked) updateQuizAnswer(idx, optIdx);
                                                                }}
                                                            />
                                                            <div className="w-5 h-5 rounded-none border-2 border-[#444] peer-checked:border-exec-blue peer-checked:bg-exec-blue transition-all flex items-center justify-center">
                                                                <div className="w-2 h-2 bg-white rounded-none opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-gray-300 group-hover/opt:text-white transition-colors text-sm md:text-base">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        className="w-full py-4 bg-exec-blue text-white rounded-none font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg border border-exec-blue"
                                        onClick={() => {
                                            // Calculate Score
                                            if (!activeLesson.questions || activeLesson.questions.length === 0) {
                                                onMarkCompleted(activeLesson.id);
                                                return;
                                            }

                                            let correctCount = 0;
                                            activeLesson.questions.forEach((q, idx) => {
                                                if (q.correct_answer === selectedAnswers[idx]) {
                                                    correctCount++;
                                                }
                                            });

                                            // Score out of 20
                                            const score = Math.round((correctCount / activeLesson.questions.length) * 20);
                                            toast('success', `Has obtenido una nota de: ${score}/20`);
                                            onMarkCompleted(activeLesson.id, score); // Pass score
                                        }}
                                    >
                                        Enviar Respuestas
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer de Navegación */}
                    <div className="p-4 border-t border-[#262626] bg-[#151515] flex justify-between items-center">
                        <button
                            className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-none font-black uppercase tracking-widest text-[10px] border border-transparent hover:border-[#333] transition-all flex items-center gap-2 disabled:opacity-30 disabled:hover:bg-transparent"
                            onClick={onPrevLesson}
                            disabled={isFirstLesson}
                        >
                            <ChevronLeft className="w-4 h-4" /> Anterior
                        </button>
                        <button
                            className="px-6 py-2.5 bg-exec-blue text-white rounded-none hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(0,136,255,0.3)] hover:shadow-[0_0_30px_rgba(0,136,255,0.5)] border border-exec-blue"
                            onClick={onNextLesson}
                            disabled={!userProgress[activeLesson.id]?.completed && activeLesson.type === 'quiz'} // Bloquear avance si es quiz no hecho
                        >
                            {isLastLesson ? 'Finalizar Curso' : 'Siguiente Lección'}
                            {!isLastLesson && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                    <p>Selecciona una lección para comenzar</p>
                </div>
            )}
        </div>
    );
};
