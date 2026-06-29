import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    CheckCircle, Loader2, AlertCircle, Send, Star, 
    MessageSquare, ChevronRight, ChevronLeft, Award
} from 'lucide-react';

interface SurveyQuestion {
    id: string;
    question: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'scale' | 'nps';
    options: string[];
    required: boolean;
    order_index: number;
}

interface SurveyData {
    id: string;
    event_id: string;
    title: string;
    description: string;
    is_active: boolean;
    event_title?: string;
    organizer_type?: string;
}

const S = {
    bg: '#000000', 
    card: '#0D0D0D', 
    cardAlt: '#111111',
    input: '#0A0A0A', 
    border: '#1F1F1F', 
    blue: '#0088FF',
};

const inputCls = `w-full bg-[#0A0A0A] border border-[#1F1F1F] text-white text-sm
  rounded-none px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#0088FF]
  focus:border-[#0088FF] transition-all placeholder-gray-700`;

export function PublicSurveyPage() {
    const { slug } = useParams<{ slug: string }>();
    const [survey, setSurvey] = useState<SurveyData | null>(null);
    const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [responses, setResponses] = useState<Record<string, any>>({});

    useEffect(() => {
        if (slug) loadSurvey(slug);
    }, [slug]);

    async function loadSurvey(surveySlug: string) {
        setLoading(true);
        try {
            // 1. Cargar datos de la encuesta y el título del evento relacionado
            const { data: surveyData, error: sErr } = await supabase
                .from('surveys')
                .select(`
                    *,
                    events:event_id (title, organizer_type)
                `)
                .eq('slug', surveySlug)
                .single();

            if (sErr || !surveyData) {
                setNotFound(true);
                return;
            }

            if (!surveyData.is_active) {
                setNotFound(true);
                return;
            }

            setSurvey({
                ...surveyData,
                event_title: surveyData.events?.title,
                organizer_type: surveyData.events?.organizer_type
            });

            // 2. Cargar preguntas
            const { data: questionsData, error: qErr } = await supabase
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyData.id)
                .order('order_index');

            if (qErr) throw qErr;
            setQuestions(questionsData || []);

        } catch (e) {
            console.error('Error loading survey:', e);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }

    function handleResponseChange(questionId: string, value: any) {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!survey) return;

        // Validar requeridos
        for (const q of questions) {
            if (q.required && (!responses[q.id] || (Array.isArray(responses[q.id]) && responses[q.id].length === 0))) {
                setError(`El campo "${q.question}" es obligatorio.`);
                // Scroll to top or specific field could be added here
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        }

        setError(null);
        setSubmitting(true);

        try {
            const { error: insertError } = await supabase
                .from('survey_responses')
                .insert({
                    survey_id: survey.id,
                    answers: responses,
                });

            if (insertError) throw insertError;
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e: any) {
            console.error('Error submitting survey:', e);
            const errorMsg = e?.message || 'Hubo un error al enviar tus respuestas. Por favor, inténtalo de nuevo.';
            setError(errorMsg);
            alert(`Error al enviar: ${errorMsg}`); // Fallback seguro
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
                <div className="text-center">
                    <Loader2 className="animate-spin text-exec-blue mx-auto mb-4" size={40} />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Cargando Encuesta ACS...</p>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: S.bg }}>
                <AlertCircle size={48} className="text-red-500 mb-6" />
                <h1 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Encuesta no disponible</h1>
                <p className="text-sm text-gray-500 max-w-xs">Este enlace ha expirado o la encuesta aún no ha sido activada por la organización.</p>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="mt-8 px-8 py-3 bg-[#111] border border-[#262626] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1A1A1A] transition-all"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: S.bg }}>
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="flex justify-center gap-4 mb-2">
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="ACS" className="h-10 w-auto opacity-50" />
                    </div>
                    
                    <div className="inline-flex items-center justify-center w-20 h-20 border border-emerald-500/30 bg-emerald-500/5">
                        <CheckCircle size={40} className="text-emerald-400" />
                    </div>
                    
                    <div className="space-y-3">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">¡Feedback Recibido!</h1>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                            Tus respuestas han sido procesadas con éxito. Gracias por ayudarnos a mejorar la calidad de nuestros eventos.
                        </p>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <p className="text-[10px] font-bold text-exec-blue uppercase tracking-[0.2em] mb-4">Mantenemos tu voz conectada</p>
                        <div className="flex flex-col gap-2">
                           <a href="https://revistas.unc.edu.pe/index.php/sociales/index" className="w-full py-3 bg-[#111] border border-[#262626] text-white text-[10px] font-black uppercase tracking-widest hover:bg-exec-blue hover:text-black hover:border-exec-blue transition-all">
                               Visitar Revista ACS
                           </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 font-sans" style={{ background: S.bg }}>
            {/* Header Institucional Industrial */}
            <header className="sticky top-0 z-50 border-b bg-black/80 backdrop-blur-xl" style={{ borderColor: S.border }}>
                <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {survey?.organizer_type === 'colegio_sociologo_unidad' ? (
                            <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Colegio" className="h-8 w-auto" />
                        ) : (
                            <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="ACS" className="h-8 w-auto" />
                        )}
                        <div className="w-px h-6 bg-white/10" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Feedback</span>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-12">
                {/* Hero Title */}
                <div className="mb-12">
                    <div className="inline-block px-3 py-1 bg-exec-blue/10 border border-exec-blue/20 mb-4">
                        <span className="text-[9px] font-black text-exec-blue uppercase tracking-widest">{survey?.events ? 'Encuesta de satisfacción' : 'Encuesta General'}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-[0.95] mb-4">
                        {survey?.events ? survey?.event_title : survey?.title}
                    </h1>
                    <p className="text-gray-500 text-sm leading-relaxed font-medium">
                        Tu opinión es fundamental para nosotros. Por favor, tómate un minuto para responder estas preguntas.
                    </p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-10">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="space-y-4 group">
                            <div className="flex items-start gap-4">
                                <span className="text-3xl font-black text-exec-blue/20 group-focus-within:text-exec-blue transition-colors leading-none pt-1">
                                    {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                <label className="block text-sm font-black text-white uppercase tracking-wide leading-snug">
                                    {q.question}
                                    {q.required && <span className="text-exec-blue ml-1">*</span>}
                                </label>
                            </div>

                            <div className="pl-11">
                                {q.type === 'textarea' ? (
                                    <textarea
                                        required={q.required}
                                        placeholder="Escribe tu respuesta aquí..."
                                        className={`${inputCls} min-h-[120px] resize-none`}
                                        onChange={e => handleResponseChange(q.id, e.target.value)}
                                        value={responses[q.id] || ''}
                                    />
                                ) : q.type === 'select' || q.type === 'radio' ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {q.options.map((opt) => (
                                            <label 
                                                key={opt}
                                                className={`
                                                    relative flex items-center px-4 py-4 border cursor-pointer transition-all
                                                    ${responses[q.id] === opt 
                                                        ? 'bg-exec-blue/10 border-exec-blue text-white shadow-lg shadow-exec-blue/5' 
                                                        : 'bg-[#050505] border-[#1A1A1A] text-gray-500 hover:border-gray-700'}
                                                `}
                                            >
                                                <input
                                                    type="radio"
                                                    name={q.id}
                                                    value={opt}
                                                    required={q.required}
                                                    className="sr-only"
                                                    onChange={e => handleResponseChange(q.id, e.target.value)}
                                                />
                                                <div className={`
                                                    w-4 h-4 border-2 mr-4 flex items-center justify-center transition-all
                                                    ${responses[q.id] === opt ? 'border-exec-blue bg-exec-blue' : 'border-gray-800 bg-transparent'}
                                                `}>
                                                    {responses[q.id] === opt && <div className="w-1.5 h-1.5 bg-black" />}
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-wider">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : q.type === 'checkbox' ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {q.options.map((opt) => {
                                            const current = responses[q.id] || [];
                                            const isChecked = current.includes(opt);
                                            return (
                                                <label 
                                                    key={opt}
                                                    className={`
                                                        relative flex items-center px-4 py-4 border cursor-pointer transition-all
                                                        ${isChecked 
                                                            ? 'bg-exec-blue/10 border-exec-blue text-white' 
                                                            : 'bg-[#050505] border-[#1A1A1A] text-gray-500 hover:border-gray-700'}
                                                    `}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        value={opt}
                                                        className="sr-only"
                                                        onChange={e => {
                                                            const newResponses = e.target.checked 
                                                                ? [...current, opt]
                                                                : current.filter((v: string) => v !== opt);
                                                            handleResponseChange(q.id, newResponses);
                                                        }}
                                                    />
                                                    <div className={`
                                                        w-4 h-4 border-2 mr-4 flex items-center justify-center transition-all
                                                        ${isChecked ? 'border-exec-blue bg-exec-blue' : 'border-gray-800 bg-transparent'}
                                                    `}>
                                                        {isChecked && <div className="w-2 h-2 bg-black" />}
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">{opt}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <input
                                        type={q.type === 'nps' || q.type === 'scale' ? 'number' : q.type}
                                        required={q.required}
                                        placeholder={q.type === 'email' ? 'tu@correo.com' : 'Escribe aquí...'}
                                        className={inputCls}
                                        onChange={e => handleResponseChange(q.id, e.target.value)}
                                        value={responses[q.id] || ''}
                                    />
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="pt-10">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full relative flex items-center justify-center gap-3 py-5 bg-exec-blue text-black text-xs font-black uppercase tracking-[0.3em] overflow-hidden group shadow-2xl shadow-exec-blue/40 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.98]"
                        >
                            {submitting ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <Send size={16} />
                                    Enviar Feedback
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <footer className="mt-24 pt-12 border-t border-white/5 text-center px-4">
                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.4em] mb-4">Desarrollado con precisión executive por</p>
                    <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="ACS" className="h-5 w-auto" />
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">ACS Engineering Unit</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}
