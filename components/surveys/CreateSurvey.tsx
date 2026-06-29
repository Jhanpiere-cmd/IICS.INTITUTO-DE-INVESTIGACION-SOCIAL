import React, { useState, useEffect } from 'react';
import { 
    X, Plus, Trash2, Save, Sparkles, 
    Type, List, Radio as RadioIcon, 
    CheckSquare, ChevronDown, ChevronUp,
    LayoutGrid, Zap, Loader2, Wand2, Search,
    MessageSquare, Settings, Bot
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { generateSurveyForm, DEFAULT_AI_CONFIG, AIConfig } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';

interface CreateSurveyProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editSurveyId?: string;
}

const QUESTION_TYPES = [
    { id: 'text', label: 'Texto Corto', icon: Type, color: '#3B82F6' },
    { id: 'textarea', label: 'Texto Largo', icon: LayoutGrid, color: '#6366F1' },
    { id: 'radio', label: 'Opción Única', icon: RadioIcon, color: '#F97316' },
    { id: 'select', label: 'Lista Desplegable', icon: ChevronDown, color: '#EC4899' },
    { id: 'checkbox', label: 'Multiselección', icon: CheckSquare, color: '#14B8A6' }
];

const PREDEFINED_CATEGORIES = [
    'Satisfacción', 'Feedback de Evento', 'Calidad de Servicio', 'Investigación de Mercado', 
    'Educación', 'RRHH', 'Opinión Pública', 'Evaluación Docente', 'Marketing', 
    'Experiencia de Usuario', 'Salud y Bienestar', 'Innovación Tecnológica', 
    'Impacto Social', 'Economía y Finanzas', 'Clima Institucional', 'Gestión Académica', 
    'Infraestructura', 'Cultura y Arte', 'Deporte y Recreación', 'Gastronomía', 
    'Turismo', 'Medio Ambiente', 'Seguridad Ciudadana', 'Comunicación Estratégica', 
    'Capacitación', 'Auditoría', 'Consultoría', 'Lanzamiento de Producto', 
    'Fidelización', 'Demográfica'
];

export function CreateSurvey({ isOpen, onClose, onSuccess, editSurveyId }: CreateSurveyProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Satisfacción');
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
    const [questions, setQuestions] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && editSurveyId) {
            loadSurveyForEdit();
        } else if (isOpen && !editSurveyId) {
            setTitle('');
            setCategory('Satisfacción');
            setAiPrompt('');
            setQuestions([]);
        }
    }, [isOpen, editSurveyId]);

    const loadSurveyForEdit = async () => {
        setLoading(true);
        try {
            const { data: survey, error: sErr } = await supabase.from('surveys').select('*').eq('id', editSurveyId).single();
            if (sErr) throw sErr;
            setTitle(survey.title);
            setCategory(survey.category || 'Satisfacción');

            const { data: qs, error: qErr } = await supabase.from('survey_questions').select('*').eq('survey_id', editSurveyId).order('order_index');
            if (qErr) throw qErr;
            setQuestions((qs || []).map(q => ({
                ...q,
                id: q.id || crypto.randomUUID(),
                options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['']
            })));
        } catch (e) {
            console.error(e);
            showToast({ type: 'error', title: 'Error', message: 'No se pudo cargar la encuesta para editar.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleGenerateAI = async () => {
        if (!title.trim() && !aiPrompt.trim()) {
            showToast({ type: 'warning', title: 'Contexto Insuficiente', message: 'Escribe un título o instrucciones para que Mercury entienda el propósito.' });
            return;
        }
        
        setGenerating(true);
        try {
            const aiResult = await generateSurveyForm(title, category, aiPrompt, aiConfig);
            if (aiResult) {
                let questionsArray = [];
                
                if (Array.isArray(aiResult)) {
                    questionsArray = aiResult;
                } else if (aiResult.questions && Array.isArray(aiResult.questions)) {
                    questionsArray = aiResult.questions;
                    if (aiResult.title && !title.trim()) {
                        setTitle(aiResult.title);
                    }
                }

                if (questionsArray.length > 0) {
                    setQuestions(questionsArray.map((q: any) => ({
                        id: crypto.randomUUID(),
                        ...q,
                        options: q.options || ['']
                    })));
                    showToast({ type: 'success', title: 'Magia de Mercury', message: 'La encuesta ha sido generada y optimizada.' });
                } else {
                    throw new Error("Formato inválido devuelto por la IA.");
                }
            }
        } catch (e: any) {
            showToast({ type: 'error', title: 'Fallo de IA', message: 'No se pudo generar la encuesta correctamente.' });
        } finally {
            setGenerating(false);
        }
    };

    const addQuestion = (type: string) => {
        const newQuestion = {
            id: crypto.randomUUID(),
            type,
            question: '',
            options: [''],
            required: true
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (id: string, updates: any) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            showToast({ type: 'warning', title: 'Falta Título', message: 'Por favor, escribe un "Título Campaña" en el panel izquierdo antes de publicar.' });
            return;
        }
        
        if (questions.length === 0) {
            showToast({ type: 'warning', title: 'Encuesta Vacía', message: 'Debes añadir al menos una pregunta a tu encuesta (o usar Mercury IA).' });
            return;
        }

        setLoading(true);
        try {
            let finalSurveyId = editSurveyId;
            
            if (editSurveyId) {
                // Modo Edición
                const { error: sErr } = await supabase.from('surveys').update({ title, category }).eq('id', editSurveyId);
                if (sErr) throw sErr;

                // Para evitar conflictos, borramos y reinsertamos las preguntas (o si quisieras, un upsert). 
                // Dado que no hay FK con CASCADE a respuestas, no pasa nada si borramos y creamos con el mismo survey_id.
                const { error: delErr } = await supabase.from('survey_questions').delete().eq('survey_id', editSurveyId);
                if (delErr) throw delErr;
            } else {
                // Modo Creación
                const safeBase = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const finalSlug = `${safeBase}-${Date.now().toString(36)}`;

                const { data: survey, error: sErr } = await supabase
                    .from('surveys')
                    .insert([{ title, slug: finalSlug, type: 'general', category, is_active: true }])
                    .select().single();

                if (sErr) throw sErr;
                finalSurveyId = survey.id;
            }

            const questionsToInsert = questions.map((q, index) => {
                // Filtro extremo anti-alucinaciones de IA para el check constraint
                let safeType = (q.type || 'text').toLowerCase().trim();
                const validTypes = ['text', 'textarea', 'radio', 'select', 'checkbox', 'email', 'tel', 'number'];
                
                if (!validTypes.includes(safeType)) {
                    if (safeType.includes('multiple') || safeType.includes('choice')) safeType = 'radio';
                    else safeType = 'text'; // Fallback a text
                }

                return {
                    survey_id: finalSurveyId,
                    question: q.question,
                    type: safeType,
                    options: q.options.filter((o: string) => o.trim() !== ''),
                    required: q.required,
                    order_index: index + 1
                };
            });

            const { error: qErr } = await supabase.from('survey_questions').insert(questionsToInsert);
            if (qErr) throw qErr;

            showToast({ type: 'success', title: editSurveyId ? '¡Actualizado!' : '¡Publicado!', message: editSurveyId ? 'Encuesta modificada correctamente.' : 'Encuesta lanzada correctamente.' });
            onSuccess();
        } catch (e: any) {
            showToast({ type: 'error', title: 'Error de Red', message: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden rounded-none font-sans">
                
                {/* Modern Header */}
                <div className="px-6 py-5 border-b border-exec-border flex items-center justify-between bg-[#0F0F0F] relative">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-exec-blue/10 flex items-center justify-center">
                            <span className="material-symbols-outlined notranslate text-exec-blue text-2xl" translate="no">poll</span>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-white uppercase tracking-widest">{editSurveyId ? 'Editar Encuesta' : 'Nueva Encuesta Global'}</h2>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Investigación y Recolección de Datos</p>
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="p-2 text-gray-600 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Layout: 2 Columns */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    
                    {/* LEFT COLUMN: IDENTIDAD & IA (SIDEBAR STYLE) */}
                    <div className="w-full lg:w-80 border-r border-exec-border bg-[#0C0C0C] p-6 space-y-8 overflow-y-auto">
                        
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-exec-blue">
                                <Settings size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Identidad</span>
                            </div>
                            
                            <div className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Título Campaña</label>
                                    <input 
                                        type="text" value={title} onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-black border border-exec-border px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-exec-blue transition-all"
                                        placeholder="EJ: SATISFACCIÓN 2026"
                                    />
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Categoría</label>
                                    <div 
                                        onClick={() => setShowCatDropdown(!showCatDropdown)}
                                        className="w-full bg-black border border-exec-border px-4 py-3 text-xs font-bold text-white uppercase cursor-pointer flex justify-between items-center hover:border-gray-700"
                                    >
                                        <span className="truncate">{category}</span>
                                        <ChevronDown size={14} className={showCatDropdown ? 'rotate-180' : ''} />
                                    </div>
                                    {showCatDropdown && (
                                        <div className="absolute top-full left-0 w-full z-50 bg-[#111] border border-exec-border max-h-48 overflow-y-auto shadow-2xl">
                                            {PREDEFINED_CATEGORIES.map(c => (
                                                <div key={c} onClick={() => { setCategory(c); setShowCatDropdown(false); }} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase hover:bg-exec-blue/10 hover:text-white cursor-pointer border-b border-gray-900 last:border-0">{c}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* IA POWER SECTION - SAME AS EVENTS */}
                        <div className="space-y-6 pt-6 border-t border-exec-border">
                            <div className="flex items-center gap-2 text-exec-blue">
                                <Sparkles size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Mercury IA Builder</span>
                            </div>
                            
                            <div className="space-y-4">
                                <textarea 
                                    value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                                    className="w-full h-32 bg-black border border-exec-border px-4 py-3 text-[11px] text-gray-300 outline-none focus:border-exec-blue transition-all resize-none font-medium leading-relaxed"
                                    placeholder="Instrucciones para Mercury: 'Crea una encuesta de 5 preguntas sobre la calidad de la biblioteca, incluye una abierta al final...'"
                                />
                                <div className="py-1">
                                    <AIEngineSelector config={aiConfig} onConfigChange={setAiConfig} variant="minimal" />
                                </div>
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={generating || (!title.trim() && !aiPrompt.trim())}
                                    className="w-full h-12 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-gray-200 disabled:bg-gray-900 disabled:text-gray-700 transition-all shadow-lg"
                                >
                                    {generating ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4 text-exec-blue" />}
                                    {generating ? 'Generando...' : 'Generar con IA'}
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: PREGUNTAS (THE WORKSHOP) */}
                    <div className="flex-1 overflow-y-auto p-10 bg-[#080808] relative">
                        
                        <div className="flex items-center justify-between mb-10 border-b border-exec-border pb-6">
                            <div className="space-y-1">
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Workshop de Preguntas</h3>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Añade o edita los campos de tu investigación.</p>
                            </div>
                            <div className="flex gap-2">
                                {QUESTION_TYPES.map(t => (
                                    <button
                                        key={t.id} onClick={() => addQuestion(t.id)}
                                        className="h-10 w-10 flex items-center justify-center bg-[#111] border border-exec-border text-gray-500 hover:text-white hover:border-exec-blue transition-all"
                                        title={t.label}
                                    >
                                        <t.icon size={18} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="max-w-3xl mx-auto space-y-6">
                            {questions.length === 0 ? (
                                <div className="py-24 border border-dashed border-exec-border/30 flex flex-col items-center justify-center opacity-40">
                                    <div className="p-5 bg-exec-blue/5 rounded-full mb-6">
                                        <LayoutGrid size={48} className="text-exec-blue" />
                                    </div>
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Arquitectura Vacía</p>
                                </div>
                            ) : (
                                questions.map((q, idx) => (
                                    <div key={q.id} className="bg-[#0D0D0D] border border-exec-border p-6 shadow-xl relative group hover:border-gray-700 transition-all">
                                        <div className="flex items-start gap-6">
                                            <div className="flex flex-col items-center gap-3 pt-1">
                                                <span className="text-[10px] font-black text-exec-blue">#{idx + 1}</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-exec-blue/40" />
                                            </div>

                                            <div className="flex-1 space-y-5">
                                                <div className="flex-1 border-b border-gray-800 focus-within:border-exec-blue transition-all">
                                                    <input 
                                                        type="text" value={q.question}
                                                        onChange={e => updateQuestion(q.id, { question: e.target.value })}
                                                        placeholder="PREGUNTA TÁCTICA..."
                                                        className="w-full bg-transparent border-none text-[13px] font-black text-white uppercase tracking-wider py-1 focus:outline-none placeholder:text-gray-900"
                                                    />
                                                </div>

                                                {['radio', 'select', 'checkbox'].includes(q.type) && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pl-2">
                                                        {q.options.map((opt: string, oIdx: number) => (
                                                            <div key={oIdx} className="flex items-center gap-3 group/opt">
                                                                <div className="w-2 h-2 border border-exec-blue/30 rounded-sm" />
                                                                <input 
                                                                    type="text" value={opt}
                                                                    onChange={e => {
                                                                        const n = [...q.options]; n[oIdx] = e.target.value;
                                                                        updateQuestion(q.id, { options: n });
                                                                    }}
                                                                    className="flex-1 bg-transparent text-[11px] text-gray-500 font-bold focus:text-white outline-none border-b border-transparent focus:border-gray-800"
                                                                    placeholder={`Opción ${oIdx + 1}`}
                                                                />
                                                                <button onClick={() => {
                                                                    const n = q.options.filter((_:any,i:number)=>i!==oIdx);
                                                                    updateQuestion(q.id, {options: n});
                                                                }} className="opacity-0 group-hover/opt:opacity-100 text-gray-700 hover:text-red-500 transition-all"><X size={12}/></button>
                                                            </div>
                                                        ))}
                                                        <button 
                                                            onClick={() => updateQuestion(q.id, { options: [...q.options, ''] })}
                                                            className="text-[9px] font-black text-exec-blue hover:text-white uppercase tracking-widest mt-2 flex items-center gap-2"
                                                        >
                                                            + Añadir Opción
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col items-center gap-6">
                                                <button onClick={() => setQuestions(questions.filter(qu => qu.id !== q.id))} className="text-gray-800 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                <div className="flex flex-col items-center gap-1.5" title="Obligatorio">
                                                    <div onClick={() => updateQuestion(q.id, {required: !q.required})} className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${q.required ? 'bg-exec-blue' : 'bg-gray-800'}`}>
                                                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${q.required ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Modern Footer */}
                <div className="px-10 py-8 border-t border-exec-border bg-[#0C0C0C] flex items-center justify-between">
                    <button onClick={onClose} className="px-8 py-4 border border-exec-border text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-[0.3em] transition-all">Cancelar</button>
                    
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{questions.length} Preguntas</span>
                            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Configuración Finalizada</span>
                        </div>
                        <button 
                            onClick={handleSave} disabled={loading || questions.length === 0}
                            className="bg-exec-blue hover:bg-blue-600 text-white px-16 py-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl shadow-exec-blue/30 flex items-center gap-4 active:scale-95 disabled:bg-gray-900 disabled:text-gray-700"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {editSurveyId ? 'Guardar Cambios' : 'Publicar Encuesta'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
