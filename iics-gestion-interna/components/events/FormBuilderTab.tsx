import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles, Plus, Trash2, Copy, Check, ExternalLink, Loader2,
    ToggleLeft, ToggleRight, Type, Mail, Phone, Hash, List, CheckSquare,
    AlignLeft, Circle, Award, ChevronDown, ChevronUp, GripVertical,
    CreditCard, QrCode, ImageIcon, X, Bot, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateRegistrationForm, FormField, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import QRCode from 'qrcode';

// ─── Constantes ───────────────────────────────────────────────────────────────
const YAPE_NUMBER = '970 537 767'; // Número fijo de la secretaria

interface FormBuilderTabProps {
    eventId: string;
    eventTitle: string;
    eventType: string;
    eventDescription: string;
    initialSlug?: string;
    initialForm?: FormField[];
    initialEnabled?: boolean;
}

export interface PricingOption {
    id: string;
    name: string;
    price: number;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Texto corto', icon: Type, color: '#3B82F6' },
    { value: 'email', label: 'Correo', icon: Mail, color: '#8B5CF6' },
    { value: 'tel', label: 'Teléfono', icon: Phone, color: '#10B981' },
    { value: 'number', label: 'Número', icon: Hash, color: '#F59E0B' },
    { value: 'select', label: 'Lista desplegable', icon: List, color: '#EC4899' },
    { value: 'radio', label: 'Opción única', icon: Circle, color: '#F97316' },
    { value: 'checkbox', label: 'Casillas múltiples', icon: CheckSquare, color: '#14B8A6' },
    { value: 'textarea', label: 'Texto largo', icon: AlignLeft, color: '#6366F1' },
];

const inputCls = 'w-full bg-[#171717] border border-[#262626] text-gray-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all placeholder-gray-600';

function getFieldIcon(type: string) {
    const t = FIELD_TYPES.find(ft => ft.value === type);
    return { Icon: t?.icon ?? Type, color: t?.color ?? '#6b7280' };
}

type CertType = 'none' | 'free' | 'paid';

export function FormBuilderTab({
    eventId,
    eventTitle,
    eventType,
    eventDescription,
    initialSlug = '',
}: FormBuilderTabProps) {

    const defaultFields: FormField[] = [
        { id: 'full_name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre completo', required: true, order: 1 },
        { id: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com', required: true, order: 2 },
    ];

    const [activeSubTab, setActiveSubTab] = useState<'registration' | 'feedback'>('registration');
    const [fields, setFields] = useState<FormField[]>(defaultFields);
    const [enabled, setEnabled] = useState(false);
    const [slug, setSlug] = useState(initialSlug);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedField, setExpandedField] = useState<string | null>(null);
    const [loadingForm, setLoadingForm] = useState(true);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    // ─── Certificado ─────────────────────────────────────────────────────────
    const [certType, setCertType] = useState<CertType>('none');
    const [certPrice, setCertPrice] = useState<string>('');
    const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
    const [yapeQrUrl, setYapeQrUrl] = useState<string>('');
    const [uploadingQr, setUploadingQr] = useState(false);
    const qrInputRef = useRef<HTMLInputElement>(null);
    const optionInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // ─── Estado Feedback ──────────────────────────────────────────────────
    const [feedbackSurveyId, setFeedbackSurveyId] = useState<string | null>(null);
    const [feedbackFields, setFeedbackFields] = useState<FormField[]>([]);
    const [feedbackEnabled, setFeedbackEnabled] = useState(false);
    const [feedbackSlug, setFeedbackSlug] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [showQrModal, setShowQrModal] = useState(false);

    // ─── Utilidad: genera slug a partir del título ────────────────────────────
    function slugify(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);
    }

    // ─── Cargar datos frescos de Supabase ─────────────────────────────────────
    useEffect(() => {
        async function fetchLatestForm() {
            setLoadingForm(true);
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('registration_form, registration_enabled, certificate_type, certificate_price, yape_qr_url, registration_slug, pricing_options')
                    .eq('id', eventId)
                    .single();

                if (!error && data) {
                    if (data.registration_form?.length > 0) setFields(data.registration_form as FormField[]);
                    setEnabled(data.registration_enabled ?? false);
                    setCertType((data.certificate_type as CertType) ?? 'none');
                    setCertPrice(data.certificate_price ? String(data.certificate_price) : '');
                    setYapeQrUrl(data.yape_qr_url ?? '');
                    setPricingOptions(data.pricing_options || []);

                    // ── Auto-generación de slug ──────────────────────────────
                    let effectiveSlug = data.registration_slug || initialSlug || '';
                    if (!effectiveSlug && eventTitle) {
                        effectiveSlug = slugify(eventTitle) + '-' + eventId.slice(0, 6);
                        // Persistir en Supabase para futuros accesos
                        await supabase
                            .from('events')
                            .update({ registration_slug: effectiveSlug })
                            .eq('id', eventId);
                    }
                    setSlug(effectiveSlug);
                }

                // Cargar también la encuesta de feedback si existe
                const { data: surveyData } = await supabase
                    .from('surveys')
                    .select('*')
                    .eq('event_id', eventId)
                    .eq('type', 'event_feedback')
                    .maybeSingle();

                if (surveyData) {
                    setFeedbackSurveyId(surveyData.id);
                    setFeedbackEnabled(surveyData.is_active);
                    setFeedbackSlug(surveyData.slug);
                    
                    // Cargar preguntas
                    const { data: questionsData } = await supabase
                        .from('survey_questions')
                        .select('*')
                        .eq('survey_id', surveyData.id)
                        .order('order_index');
                    
                    if (questionsData) {
                        setFeedbackFields(questionsData.map(q => ({
                            id: q.id,
                            label: q.question,
                            type: q.type as any,
                            required: q.required,
                            options: q.options as string[],
                            order: q.order_index
                        })));
                    }
                } else {
                    // Pre-configurar slug de feedback
                    setFeedbackSlug(`${slugify(eventTitle)}-feedback-${eventId.slice(0, 4)}`);
                    setFeedbackFields([
                        { id: 'q1', label: '¿Qué te pareció el evento?', type: 'select', options: ['Excelente', 'Bueno', 'Regular', 'Malo'], required: true, order: 1 },
                        { id: 'q2', label: 'Escribe una breve sugerencia', type: 'textarea', required: false, order: 2 }
                    ]);
                }

            } catch (e) { console.error('Error cargando formulario:', e); }
            finally { setLoadingForm(false); }
        }
        fetchLatestForm();
    }, [eventId]);

    const registrationUrl = `${window.location.origin}/registro/${slug}`;
    const feedbackUrl = `${window.location.origin}/encuesta/${feedbackSlug}`;

    // ─── Generar QR ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (feedbackSlug && activeSubTab === 'feedback') {
            QRCode.toDataURL(feedbackUrl, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#0088FF',
                    light: '#000000'
                }
            })
            .then(url => setQrDataUrl(url))
            .catch(err => console.error('Error QR:', err));
        }
    }, [feedbackSlug, activeSubTab]);

    // ─── Generar con IA ───────────────────────────────────────────────────────
    async function handleGenerateWithAI() {
        setGenerating(true);
        try {
            const generated = await generateRegistrationForm(eventTitle, eventType, eventDescription, aiPrompt, aiConfig);
            if (generated?.length > 0) {
                if (activeSubTab === 'registration') {
                    setFields(generated);
                } else {
                    setFeedbackFields(generated);
                }
            }
        } catch (e) { console.error('Error generando formulario:', e); }
        finally { setGenerating(false); }
    }

    // ─── Guardar ──────────────────────────────────────────────────────────────
    async function handleSave() {
        setSaving(true);
        try {
            if (activeSubTab === 'registration') {
                const { error } = await supabase
                    .from('events')
                    .update({
                        registration_form: fields,
                        registration_enabled: enabled,
                        certificate_type: certType,
                        certificate_price: certType === 'paid' ? parseFloat(certPrice) || null : null,
                        pricing_options: certType === 'paid' ? pricingOptions : [],
                        yape_number: YAPE_NUMBER,
                        yape_qr_url: yapeQrUrl || null,
                    })
                    .eq('id', eventId);
                if (error) throw error;
            } else {
                // Guardar Encuesta de Feedback
                let currentSurveyId = feedbackSurveyId;
                
                if (!currentSurveyId) {
                    const { data: newSurvey, error: sErr } = await supabase
                        .from('surveys')
                        .insert({
                            event_id: eventId,
                            title: `Feedback: ${eventTitle}`,
                            description: `Encuesta de satisfacción para el evento ${eventTitle}`,
                            slug: feedbackSlug,
                            type: 'event_feedback',
                            is_active: feedbackEnabled
                        })
                        .select()
                        .single();
                    if (sErr) throw sErr;
                    currentSurveyId = newSurvey.id;
                    setFeedbackSurveyId(currentSurveyId);
                } else {
                    const { error: sErr } = await supabase
                        .from('surveys')
                        .update({
                            slug: feedbackSlug,
                            is_active: feedbackEnabled
                        })
                        .eq('id', currentSurveyId);
                    if (sErr) throw sErr;
                }

                // Actualizar preguntas (borrar y re-insertar para simplicidad)
                await supabase.from('survey_questions').delete().eq('survey_id', currentSurveyId);
                
                const questionsToInsert = feedbackFields.map((f, idx) => ({
                    survey_id: currentSurveyId,
                    question: f.label,
                    type: f.type,
                    options: f.options || [],
                    order_index: idx + 1,
                    required: f.required
                }));

                const { error: qErr } = await supabase.from('survey_questions').insert(questionsToInsert);
                if (qErr) throw qErr;
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e: any) {
            alert('Error al guardar: ' + e.message);
        } finally { setSaving(false); }
    }

    function handleCopyUrl() {
        navigator.clipboard.writeText(activeSubTab === 'registration' ? registrationUrl : feedbackUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // ─── Campos ──────────────────────────────────────────────────────────────

    const OFFICIAL_TEMPLATE: FormField[] = [
        { id: 'full_name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre completo', required: true, order: 1 },
        { id: 'dni', label: 'DNI / Documento de Identidad', type: 'number', placeholder: 'Documento de identidad', required: true, order: 2 },
        { id: 'phone', label: 'Número de Teléfono / WhatsApp', type: 'tel', placeholder: '999...', required: true, order: 3 },
        { id: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com', required: true, order: 4 },
        { id: 'age', label: 'Edad', type: 'number', placeholder: 'Tu edad', required: true, order: 5 },
        { id: 'sex', label: 'Sexo', type: 'select', required: true, options: ['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'], order: 6 },
        {
            id: 'career', label: 'Carrera Profesional u Ocupación', type: 'select', required: true, options: [
                'Sociología', 'Derecho', 'Administración', 'Contabilidad', 'Ingeniería Civil', 'Ingeniería de Sistemas', 'Medicina', 'Psicología', 'Educación', 'Arquitectura', 'Comunicación Social', 'Economía', 'Trabajo Social', 'Turismo y Hotelería', 'Agronomía', 'Veterinaria', 'Público General', 'Empresa / Institución / ONG', 'Estudiante Pregrado', 'Estudiante Posgrado'
            ], order: 7
        },
        { id: 'academic_degree', label: 'Grado Académico / Nivel', type: 'select', required: true, options: ['Estudiante', 'Bachiller', 'Titulado', 'Maestría', 'Doctorado', 'Otro'], order: 8 }
    ];

    function handleLoadOfficialTemplate(e: React.MouseEvent) {
        e.preventDefault();
        if (window.confirm('Esto reemplazará todos los campos actuales por la plantilla ACS. ¿Estás seguro?')) {
            setFields(OFFICIAL_TEMPLATE);
        }
    }

    function addField() {
        const nf: FormField = {
            id: `campo_${Date.now()}`,
            label: 'Nuevo campo',
            type: 'text',
            placeholder: '',
            required: false,
            order: (activeSubTab === 'registration' ? fields : feedbackFields).length + 1,
        };
        if (activeSubTab === 'registration') {
            setFields(prev => [...prev, nf]);
        } else {
            setFeedbackFields(prev => [...prev, nf]);
        }
        setExpandedField(nf.id);
    }

    // Helper functions for common field logic
    function getActiveFields() { return activeSubTab === 'registration' ? fields : feedbackFields; }
    function setActiveFields(updater: (prev: FormField[]) => FormField[]) {
        if (activeSubTab === 'registration') setFields(prev => updater(prev));
        else setFeedbackFields(prev => updater(prev));
    }

    function removeField(id: string) { setActiveFields(prev => prev.filter(f => f.id !== id)); }
    function updateField(id: string, updates: Partial<FormField>) {
        setActiveFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }
    function moveField(index: number, dir: 'up' | 'down') {
        const arr = [...getActiveFields()];
        const ti = dir === 'up' ? index - 1 : index + 1;
        if (ti < 0 || ti >= arr.length) return;
        [arr[index], arr[ti]] = [arr[ti], arr[index]];
        setActiveFields(() => arr.map((f, i) => ({ ...f, order: i + 1 })));
    }

    // ─── Opciones: agregar con Enter ──────────────────────────────────────────
    function addOption(fieldId: string, options: string[]) {
        const newOptions = [...options, ''];
        updateField(fieldId, { options: newOptions });
        const newIndex = newOptions.length - 1;
        setTimeout(() => {
            const key = `${fieldId}_${newIndex}`;
            optionInputRefs.current[key]?.focus();
        }, 50);
    }

    function updateOption(fieldId: string, options: string[], idx: number, val: string) {
        const updated = [...options];
        updated[idx] = val;
        updateField(fieldId, { options: updated });
    }

    function removeOption(fieldId: string, options: string[], idx: number) {
        updateField(fieldId, { options: options.filter((_, i) => i !== idx) });
    }

    // ─── QR Yape upload ──────────────────────────────────────────────────────
    async function handleUploadQr(file: File) {
        setUploadingQr(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `yape-qr/${eventId}.${ext}`;
            const { error } = await supabase.storage.from('event-receipts').upload(path, file, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('event-receipts').getPublicUrl(path);
            setYapeQrUrl(publicUrl);
        } catch (e: any) { alert('Error subiendo QR: ' + e.message); }
        finally { setUploadingQr(false); }
    }

    // ─── Funciones para Pricing Options ───────────────────────────────────────
    function addPricingOption() {
        setPricingOptions(prev => [...prev, { id: `price_${Date.now()}`, name: '', price: 0 }]);
    }

    function removePricingOption(id: string) {
        setPricingOptions(prev => prev.filter(p => p.id !== id));
    }

    function updatePricingOption(id: string, updates: Partial<PricingOption>) {
        setPricingOptions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (loadingForm) {
        return (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-600">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-xs uppercase tracking-widest">Cargando formulario...</span>
            </div>
        );
    }

    return (
        <div className="p-1 sm:p-2 space-y-3">
            {/* Sub-selector Mode */}
            <div className="flex bg-[#0D0D0D] border border-[#1A1A1A] p-1 gap-1">
                <button 
                    onClick={() => setActiveSubTab('registration')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeSubTab === 'registration' ? 'bg-exec-blue text-black' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    Configurar Inscripción
                </button>
                <button 
                     onClick={() => setActiveSubTab('feedback')}
                     className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                         activeSubTab === 'feedback' ? 'bg-exec-blue text-black' : 'text-gray-500 hover:text-gray-300'
                     }`}
                >
                    Encuesta Feedback (QR)
                </button>
            </div>

            {/* Header / URL pública */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => (window as any).setActiveEventSubTab?.(null)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h3 className="text-[10px] font-black text-white tracking-[0.2em] uppercase leading-none">
                            {activeSubTab === 'registration' ? 'Configuración de Registro' : 'Encuesta de Satisfacción'}
                        </h3>
                        <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest font-bold">
                            {activeSubTab === 'registration' ? 'Personalización técnica & Certificacíon' : 'Feedback post-evento & Código QR'}
                        </p>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 border border-[#262626] bg-[#0A0A0A] text-white rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-[#111] transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} className="text-emerald-500" /> : null}
                        {saved ? '¡Guardado!' : 'Guardar Cambios'}
                    </button>
                </div>

                <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-none p-2.5 space-y-3">
                    <div>
                        <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] mb-1 pl-1">
                            {activeSubTab === 'registration' ? 'URL de inscripción' : 'URL de feedback pública'}
                        </p>
                        <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
                            <div className="w-full sm:flex-1 bg-black border border-[#1A1A1A] rounded-none px-3 py-1.5 text-[10px] text-exec-blue font-mono truncate">
                                {activeSubTab === 'registration' ? registrationUrl : feedbackUrl}
                            </div>
                            <div className="flex gap-1.5 w-full sm:w-auto">
                                <button onClick={handleCopyUrl}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-[#1A1A1A] border border-[#262626] text-[9px] text-gray-400 font-bold uppercase tracking-widest rounded-none hover:text-white transition-all">
                                    {copied ? <Check size={10} /> : <Copy size={10} />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </button>
                                {activeSubTab === 'feedback' && (
                                    <button 
                                        onClick={() => setShowQrModal(true)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-exec-blue/10 border border-exec-blue/20 text-[9px] text-exec-blue font-bold uppercase tracking-widest rounded-none hover:bg-exec-blue/20 transition-all"
                                    >
                                        <QrCode size={10} /> Ver QR
                                    </button>
                                )}
                                <a href={activeSubTab === 'registration' ? registrationUrl : feedbackUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-[#1A1A1A] border border-[#262626] text-[9px] text-gray-400 font-bold uppercase tracking-widest rounded-none hover:text-white transition-all">
                                    <ExternalLink size={10} /> Abrir
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t border-[#1F1F1F]">
                        <button onClick={() => activeSubTab === 'registration' ? setEnabled(!enabled) : setFeedbackEnabled(!feedbackEnabled)}
                            className={`flex items-center gap-3 transition-all ${(activeSubTab === 'registration' ? enabled : feedbackEnabled) ? 'text-emerald-400' : 'text-gray-500'}`}
                        >
                            {(activeSubTab === 'registration' ? enabled : feedbackEnabled) ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {(activeSubTab === 'registration' ? enabled : feedbackEnabled) ? 'Formulario activo — recibiendo datos' : 'Formulario desactivado'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Constructor Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em]">Campos del Formulario</h4>
                    <button onClick={addField} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Plus size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Añadir Campo</span>
                    </button>
                </div>

                {/* IA & Templates Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-none p-3 space-y-3">
                        <div className="flex items-center gap-2 text-[9px] font-bold text-exec-blue uppercase tracking-widest">
                            <Sparkles size={12} /> IA Builder
                        </div>
                        <textarea
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            placeholder="Crea un formulario corto..."
                            className="w-full h-16 bg-[#080808] border border-[#262626] rounded-none px-3 py-2 text-xs text-gray-300 focus:border-exec-blue/50 transition-all resize-none"
                        />
                        <div className="py-1">
                            <AIEngineSelector 
                                config={aiConfig} 
                                onConfigChange={setAiConfig}
                                variant="minimal"
                            />
                        </div>
                        <button onClick={handleGenerateWithAI} disabled={generating}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-exec-blue hover:bg-blue-600 text-black text-[9px] font-black uppercase tracking-widest rounded-none transition-all shadow-lg shadow-exec-blue/20"
                        >
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Generar con IA
                        </button>
                    </div>

                    {activeSubTab === 'registration' ? (
                        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-none p-3 flex flex-col justify-between gap-3">
                            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Plantilla Oficial</div>
                            <p className="text-[10px] text-gray-500">Carga los campos estándar de la Revista ACS (Nombre, DNI, etc).</p>
                            <button onClick={handleLoadOfficialTemplate}
                                className="w-full py-2 bg-[#1A1A1A] border border-exec-blue/20 text-exec-blue text-[9px] font-bold uppercase tracking-widest rounded-none hover:bg-[#222] transition-all"
                            >
                                Cargar Plantilla ACS
                            </button>
                        </div>
                    ) : (
                        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-none p-3 flex flex-col justify-between gap-3 relative overflow-hidden group">
                            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Código QR del Evento</div>
                            <div className="flex-1 flex items-center justify-center py-1">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} className="w-20 h-20 border border-exec-blue/30 p-1 bg-black" alt="Survey QR" />
                                ) : (
                                    <Loader2 className="animate-spin text-gray-700" size={20} />
                                )}
                            </div>
                            <button onClick={() => setShowQrModal(true)}
                                className="w-full py-2 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue text-[9px] font-bold uppercase tracking-widest rounded-none hover:bg-exec-blue/20 transition-all"
                            >
                                Expandir & Descargar
                            </button>
                        </div>
                    )}
                </div>

                {/* Fields List */}
                <div className="space-y-2">
                    {(activeSubTab === 'registration' ? fields : feedbackFields).map((field, index) => {
                        const { Icon, color } = getFieldIcon(field.type);
                        const isExpanded = expandedField === field.id;
                        const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
                        const options = field.options || [];

                        return (
                            <div key={field.id} className={`bg-[#080808] border transition-all rounded-none overflow-hidden ${isExpanded ? 'border-exec-blue/50 shadow-xl' : 'border-[#1A1A1A]'}`}>
                                <div className="p-2 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-sm flex items-center justify-center shrink-0" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                                        <Icon size={14} style={{ color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <input 
                                            type="text" 
                                            value={field.label}
                                            onChange={e => updateField(field.id, { label: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-xs font-bold text-white uppercase tracking-tight focus:ring-0 placeholder-gray-700"
                                            placeholder="Etiqueta del campo..."
                                        />
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{FIELD_TYPES.find(t => t.value === field.type)?.label}</span>
                                            {field.required && <span className="text-[8px] font-bold text-red-500/70 border border-red-500/20 px-1 rounded-sm uppercase tracking-tighter">Obligatorio</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setExpandedField(isExpanded ? null : field.id)} className={`p-2 transition-all ${isExpanded ? 'text-exec-blue' : 'text-gray-600'}`}>
                                            <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        <button onClick={() => removeField(field.id)} className="p-2 text-gray-700 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-4 border-t border-[#1A1A1A] bg-[#080808] space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 block">Tipo de entrada</label>
                                                <select
                                                    value={field.type}
                                                    onChange={e => {
                                                        const newType = e.target.value as FormField['type'];
                                                        const needsOptions = ['select', 'radio', 'checkbox'].includes(newType);
                                                        updateField(field.id, {
                                                            type: newType,
                                                            options: needsOptions ? (field.options?.length ? field.options : ['']) : []
                                                        });
                                                    }}
                                                    className="w-full bg-[#111] border border-[#262626] rounded-sm px-3 py-2 text-xs text-gray-400 focus:border-exec-blue"
                                                >
                                                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col justify-end">
                                                <label className="flex items-center gap-3 p-2 bg-[#111] rounded-sm border border-[#262626] cursor-pointer hover:bg-[#181818] transition-all">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={field.required}
                                                        onChange={e => updateField(field.id, { required: e.target.checked })}
                                                        className="w-4 h-4 rounded border-[#333] bg-[#0A0A0A] text-exec-blue"
                                                    />
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Respuesta Obligatoria</span>
                                                </label>
                                            </div>
                                        </div>

                                        {hasOptions && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Opciones de Respuesta</label>
                                                    <button onClick={() => addOption(field.id, options)} className="text-[9px] font-bold text-exec-blue hover:text-blue-400 uppercase tracking-widest">+ Agregar</button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {options.map((opt, oi) => (
                                                        <div key={oi} className="flex gap-2">
                                                            <input
                                                                ref={el => { optionInputRefs.current[`${field.id}_${oi}`] = el; }}
                                                                type="text"
                                                                value={opt}
                                                                onChange={e => updateOption(field.id, options, oi, e.target.value)}
                                                                className="flex-1 bg-[#111] border border-[#262626] rounded-sm px-3 py-2 text-xs text-gray-300"
                                                                placeholder={`Opción ${oi + 1}`}
                                                            />
                                                            <button onClick={() => removeOption(field.id, options, oi)} className="text-gray-700 hover:text-red-500">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => moveField(index, 'up')} disabled={index === 0} className="flex-1 py-1.5 bg-[#111] border border-[#262626] rounded-sm text-gray-500 hover:text-white disabled:opacity-20 flex justify-center"><ChevronUp size={14} /></button>
                                            <button onClick={() => moveField(index, 'down')} disabled={index === (activeSubTab === 'registration' ? fields : feedbackFields).length - 1} className="flex-1 py-1.5 bg-[#111] border border-[#262626] rounded-sm text-gray-500 hover:text-white disabled:opacity-20 flex justify-center"><ChevronDown size={14} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {activeSubTab === 'registration' && (
                <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-none overflow-hidden pb-4 sm:pb-0">
                    <div className="p-2.5 bg-[#080808] border-b border-[#1A1A1A] flex items-center gap-3">
                        <Award size={14} className="text-yellow-500" />
                        <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Configuración de Certificado</h4>
                    </div>
                    <div className="p-3 space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {(['none', 'free', 'paid'] as CertType[]).map(t => (
                                <button key={t} onClick={() => setCertType(t)}
                                    className={`py-3 text-[9px] font-bold uppercase tracking-widest rounded-none border transition-all ${
                                        certType === t ? 'bg-exec-blue/10 border-exec-blue text-exec-blue' : 'bg-[#0A0A0A] border-[#262626] text-gray-600 hover:border-[#444]'
                                    }`}
                                >
                                    {t === 'none' ? 'Sin Cert.' : t === 'free' ? 'Gratis' : 'De Pago'}
                                </button>
                            ))}
                        </div>

                        {certType === 'paid' && (
                            <div className="space-y-4 pt-4 border-t border-[#1A1A1A]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Precio General (S/)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-700">S/</span>
                                            <input
                                                type="number" step="0.5" value={certPrice}
                                                onChange={e => setCertPrice(e.target.value)}
                                                className="w-full bg-[#080808] border border-[#262626] rounded-sm pl-8 pr-3 py-2 text-sm text-white"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Yape Secretaria</label>
                                        <div className="flex items-center h-10 px-3 bg-[#080808] border border-[#262626] rounded-sm text-xs font-mono text-indigo-400">
                                            {YAPE_NUMBER}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Precios Especiales</label>
                                        <button onClick={addPricingOption} className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">+ Añadir</button>
                                    </div>
                                    <div className="space-y-2">
                                        {pricingOptions.map(opt => (
                                            <div key={opt.id} className="flex gap-2">
                                                <input
                                                    type="text" value={opt.name}
                                                    onChange={e => updatePricingOption(opt.id, { name: e.target.value })}
                                                    className="flex-1 bg-[#111] border border-[#262626] rounded-sm px-3 py-2 text-xs text-gray-300"
                                                    placeholder="Categoría..."
                                                />
                                                <input
                                                    type="number" value={opt.price}
                                                    onChange={e => updatePricingOption(opt.id, { price: parseFloat(e.target.value) || 0 })}
                                                    className="w-20 bg-[#111] border border-[#262626] rounded-sm px-3 py-2 text-xs text-gray-300"
                                                />
                                                <button onClick={() => removePricingOption(opt.id)} className="text-gray-700 hover:text-red-500"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Save Button (Mobile Float) */}
            <div className="md:hidden fixed bottom-6 right-6 left-6 z-50">
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-exec-blue hover:bg-blue-600 text-black rounded-none text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-exec-blue/40 active:scale-95 transition-all"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {saved ? '¡LISTO!' : saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </div>
            
            <div className="h-20 sm:hidden"></div>

            {/* QR Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#0A0A0A] border border-exec-border max-w-sm w-full p-8 text-center space-y-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[11px] font-black text-exec-blue uppercase tracking-[0.3em]">CÓDIGO QR TÁCTICO</h3>
                            <button onClick={() => setShowQrModal(false)} className="text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="bg-white p-4 inline-block shadow-2xl border-4 border-exec-blue">
                            {qrDataUrl ? (
                                <img src={qrDataUrl} className="w-64 h-64" alt="Tactical QR" />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center text-black font-black">GENERANDO...</div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-relaxed">
                                ESCANEE PARA ACCEDER A LA ENCUESTA DIGITAL DE SATISFACCIÓN DEL EVENTO
                            </p>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.download = `QR-Feedback-${slugify(eventTitle)}.png`;
                                        link.href = qrDataUrl;
                                        link.click();
                                    }}
                                    className="py-3 bg-exec-blue text-black text-[9px] font-black uppercase tracking-widest rounded-none hover:bg-blue-600 transition-all shadow-lg shadow-exec-blue/20"
                                >
                                    Descargar PNG
                                </button>
                                <button 
                                    onClick={() => window.print()}
                                    className="py-3 bg-[#111] border border-[#262626] text-white text-[9px] font-black uppercase tracking-widest rounded-none hover:bg-[#222] transition-all"
                                >
                                    Imprimir QR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
