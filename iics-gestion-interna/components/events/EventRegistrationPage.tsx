import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Calendar, MapPin, Users, CheckCircle, Loader2, AlertCircle, Globe,
    Award, CreditCard, Upload, X, Eye, Search
} from 'lucide-react';
import { FormField } from '../../lib/ai';
import { CertificatePreviewCard } from './CertificatePreviewCard';

const YAPE_NUMBER = '970 537 767';

interface EventData {
    id: string;
    title: string;
    description: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location: string;
    is_online: boolean;
    registration_form: FormField[];
    registration_enabled: boolean;
    registration_deadline: string | null;
    max_capacity: number | null;
    cover_image_url: string | null;
    event_type: string;
    participant_count: number;
    // Certificado
    certificate_type: 'none' | 'free' | 'paid' | null;
    certificate_price: number | null;
    yape_qr_url: string | null;
    organizer_type: 'acs' | 'colegio_sociologo_unidad' | null;
    pricing_options?: { id: string; name: string; price: number; }[];
    meeting_url?: string;
    instructor_name?: string;
    instructor_role?: string;
}

export function EventRegistrationPage() {
    const { slug } = useParams<{ slug: string }>();
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});

    // ── Tema dinámico ──
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const checkTheme = () => {
            const dark = document.documentElement.classList.contains('dark');
            setIsDark(dark);
        };
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const S = {
        bg: isDark ? '#000000' : '#f3f4f6', 
        card: isDark ? '#0D0D0D' : '#ffffff', 
        cardAlt: isDark ? '#111111' : '#f9fafb',
        input: isDark ? '#0A0A0A' : '#ffffff', 
        hover: isDark ? 'rgba(0, 136, 255, 0.08)' : 'rgba(0, 136, 255, 0.04)', 
        border: isDark ? '#1F1F1F' : '#cbd5e1', 
        blue: isDark ? '#0088FF' : '#0066cc',
        text: isDark ? '#E2E8F0' : '#111827',
        rounded: 'rounded-none'
    };

    const inputCls = `w-full ${isDark ? 'bg-[#0A0A0A] border-[#1F1F1F] text-white placeholder-gray-600' : 'bg-white border-[#cbd5e1] text-[#111827] placeholder-gray-400'} border text-sm rounded-none px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF] transition-all`;

    // ── Búsqueda de inscripciones ──
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<any[] | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    async function handleSearch() {
        if (!searchQuery.trim() || !event?.id) return;
        setSearching(true);
        setSearchError(null);
        setSearchResult(null);
        try {
            const query = searchQuery.trim();
            const { data, error: fetchError } = await supabase
                .from('event_participants')
                .select('id, full_name, email, dni, category, registered_at, wants_certificate, payment_status, certificate_url')
                .eq('event_id', event.id)
                .or(`email.eq.${query},dni.eq.${query}`);
            
            if (fetchError) throw fetchError;
            setSearchResult(data || []);
        } catch (e: any) {
            console.error('Error buscando inscripción:', e);
            setSearchError('Hubo un error al realizar la búsqueda. Por favor intenta de nuevo.');
        } finally {
            setSearching(false);
        }
    }

    // ── Pago de certificado ──────────────────────────────────────────────────
    const [wantsCertificate, setWantsCertificate] = useState(false);
    const [selectedPricingOptionId, setSelectedPricingOptionId] = useState<string>('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const receiptInputRef = useRef<HTMLInputElement>(null);

    // ── Timer de Cuenta Regresiva ──────────────────────────────────────────
    const [timeLeft, setTimeLeft] = useState<{
        d: number; h: number; m: number; s: number,
        type: 'waiting' | 'running' | 'finished'
    } | null>(null);

    useEffect(() => {
        if (!event || !event.scheduled_date) return;

        // Parsing manual para evitar problemas de zona horaria/formato en el navegador
        const dateParts = event.scheduled_date.split('-'); // YYYY-MM-DD
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);

        let startH = 0, startM = 0;
        if (event.start_time) {
            const timeParts = event.start_time.split(':');
            startH = parseInt(timeParts[0]);
            startM = parseInt(timeParts[1]);
        }
        const startDate = new Date(year, month, day, startH, startM).getTime();

        let endH = startH + 2, endM = startM;
        if (event.end_time) {
            const timeParts = event.end_time.split(':');
            endH = parseInt(timeParts[0]);
            endM = parseInt(timeParts[1]);
        }
        const endDate = new Date(year, month, day, endH, endM).getTime();

        const calculateTimeLeft = () => {
            const now = new Date().getTime();

            if (now >= endDate) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0, type: 'finished' });
                return;
            }

            if (now >= startDate) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0, type: 'running' });
                return;
            }

            const difference = startDate - now;
            setTimeLeft({
                d: Math.floor(difference / (1000 * 60 * 60 * 24)),
                h: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                s: Math.floor((difference % (1000 * 60)) / 1000),
                type: 'waiting'
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [event]);

    useEffect(() => { if (slug) loadEvent(slug); }, [slug]);

    async function loadEvent(eventSlug: string) {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('get_event_by_slug', { event_slug: eventSlug });
            if (error) throw error;
            if (!data || data.length === 0) { setNotFound(true); return; }
            const ev = data[0];
            if (!ev.registration_enabled) { setNotFound(true); return; }

            // Verificamos si existe la columna meeting_url en la respuesta del RPC
            // Si el RPC get_event_by_slug no devuelve meeting_url, habría que actualizarlo
            setEvent(ev);
            
            // Si es un taller práctico, el certificado es obligatorio por defecto
            if (ev.event_type?.toLowerCase() === 'taller') {
                setWantsCertificate(true);
            }
        } catch (e: any) {
            console.error('Error loading event:', e);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }

    function handleFieldChange(fieldId: string, value: string | string[]) {
        setFormValues(prev => ({ ...prev, [fieldId]: value }));
    }

    function handleReceiptChange(file: File) {
        setReceiptFile(file);
        const url = URL.createObjectURL(file);
        setReceiptPreview(url);
    }

    async function uploadReceipt(participantId: string): Promise<string | null> {
        if (!receiptFile) return null;
        setUploadingReceipt(true);
        try {
            const ext = receiptFile.name.split('.').pop();
            const path = `receipts/${participantId}.${ext}`;
            const { error } = await supabase.storage.from('event-receipts').upload(path, receiptFile, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('event-receipts').getPublicUrl(path);
            return publicUrl;
        } catch (e: any) {
            console.error('Error subiendo comprobante:', e);
            return null;
        } finally {
            setUploadingReceipt(false);
        }
    }


    // ── Lógica de precios dinámicos ────────────────────────
    function getCalculatedPrice(): number {
        if (!event) return 0;

        const basePrice = Number(event.certificate_price || 0);

        // Si existen opciones dinámicas configuradas en el backend
        if (event.pricing_options && event.pricing_options.length > 0) {
            const opt = event.pricing_options.find(p => p.id === selectedPricingOptionId);
            if (opt) return Number(opt.price);
        }

        // Fallback al precio base de la BD
        return basePrice;
    }

    const calculatedPrice = getCalculatedPrice();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!event) return;

        const form = event.registration_form || [];
        for (const field of form) {
            if (field.required && !formValues[field.id]) {
                setError(`El campo "${field.label}" es obligatorio.`);
                return;
            }
        }

        // Validación de pago si el evento es de pago y el usuario quiere certificado
        const isPaidCert = event.certificate_type === 'paid';
        if (isPaidCert && wantsCertificate) {
            if (event.pricing_options && event.pricing_options.length > 0 && !selectedPricingOptionId) {
                setError('Por favor selecciona una categoría de precio para tu certificado.');
                return;
            }
            if (!receiptFile) {
                setError('Por favor sube tu comprobante de pago Yape para el certificado.');
                return;
            }
        }

        setError(null);
        setSubmitting(true);

        try {
            // Generar ID de participante en el cliente para evitar problemas de RLS post-inserción
            const participantId = crypto.randomUUID();
            let receiptUrl: string | null = null;

            // 1. Si hay comprobante, subirlo primero
            if (isPaidCert && wantsCertificate && receiptFile) {
                receiptUrl = await uploadReceipt(participantId);
                if (!receiptUrl) {
                    throw new Error('No se pudo subir el comprobante de pago. Por favor intenta de nuevo.');
                }
            }

            // 2. Extraer y mapear campos conocidos inteligentemente
            const usedIds = new Set<string>();

            const extractKnownValue = (keys: string[], labelKeywords: string[]) => {
                for (const k of keys) {
                    if (formValues[k] !== undefined && formValues[k] !== '') {
                        usedIds.add(k);
                        return formValues[k];
                    }
                }
                for (const field of form) {
                    const lowerLabel = String(field.label).toLowerCase();
                    // Buscamos coincidencia parcial en la etiqueta (ej. "celular" en "N° de Celular")
                    if (labelKeywords.some(kw => lowerLabel.includes(kw))) {
                        if (formValues[field.id] !== undefined && formValues[field.id] !== '') {
                            usedIds.add(field.id);
                            return formValues[field.id];
                        }
                    }
                }
                return null;
            };

            const full_name = String(extractKnownValue(['full_name', 'nombre', 'name'], ['nombre', 'completo']) || '');
            const email = String(extractKnownValue(['email', 'correo'], ['correo', 'email', 'e-mail']) || '') || null;
            const phone = String(extractKnownValue(['phone', 'phone_number', 'telefono', 'celular', 'whatsapp'], ['teléfono', 'celular', 'whatsapp', 'móvil', 'contacto', 'phone']) || '') || null;
            const institution = String(extractKnownValue(['university', 'institucion', 'institution', 'empresa', 'organizacion'], ['institución', 'universidad', 'colegio', 'empresa', 'organización', 'entidad', 'centro de estudios', 'estudios']) || '') || null;
            const sex = String(extractKnownValue(['sex', 'sexo'], ['sexo', 'género', 'sex']) || '') || null;
            const career = String(extractKnownValue(['career', 'carrera'], ['carrera', 'ocupación', 'profesión']) || '') || null;
            const dni = String(extractKnownValue(['dni', 'documento'], ['dni', 'documento', 'identidad']) || '');
            const age = extractKnownValue(['age', 'edad'], ['edad', 'age']) || null;
            const academic_degree = String(extractKnownValue(['academic_degree', 'grado'], ['grado', 'degree', 'título']) || '') || null;

            // ── NUEVA VALIDACIÓN DE DUPLICADOS DINÁMICA ───────────────────
            // Construimos las condiciones OR solo con valores válidos y no vacíos
            const orConditions: string[] = [];
            if (dni && dni.trim() !== '') {
                orConditions.push(`dni.eq.${dni.trim()}`);
            }
            if (email && email.trim() !== '') {
                orConditions.push(`email.eq.${email.trim()}`);
            }
            if (full_name && full_name.trim() !== '') {
                orConditions.push(`full_name.ilike.${full_name.trim()}`);
            }

            let existing = null;
            if (orConditions.length > 0) {
                const { data, error: checkError } = await supabase
                    .from('event_participants')
                    .select('id, full_name')
                    .eq('event_id', event.id)
                    .or(orConditions.join(','))
                    .maybeSingle();

                if (checkError) console.error('Error verificando duplicados:', checkError);
                existing = data;
            }
            
            if (existing) {
                setError(`¡Hola! Ya detectamos una inscripción para "${existing.full_name}" en este evento. No es necesario registrarte de nuevo.`);
                setSubmitting(false);
                return;
            }
            
            // Obtener la etiqueta de la categoría de precio si aplica
            let finalCategory = 'participante_general';
            if (isPaidCert && wantsCertificate && event.pricing_options) {
                const opt = event.pricing_options.find(p => p.id === selectedPricingOptionId);
                if (opt) finalCategory = opt.name;
            } else {
                // Buscar explícitamente participant_type y otros campos de categoría del formulario
                const formCategory = extractKnownValue(
                    ['category', 'categoria', 'participant_type', 'tipo_participante', 'tipo'],
                    ['categoría', 'tipo de participante', 'usuario', 'tipo']
                );
                if (formCategory) finalCategory = String(formCategory);
            }

            const extra_data: Record<string, any> = {};
            for (const [key, value] of Object.entries(formValues)) {
                if (!usedIds.has(key)) {
                    const fieldDef = form.find(f => f.id === key);
                    const finalLabel = fieldDef ? fieldDef.label : key;
                    extra_data[finalLabel] = value;
                }
            }

            // 3. Insertar participante con TODOS los datos en un solo paso
            const { error: insertError } = await supabase
                .from('event_participants')
                .insert({
                    id: participantId,
                    event_id: event.id,
                    full_name, email, phone, institution, sex, career, dni, age, academic_degree,
                    extra_data: Object.keys(extra_data).length > 0 ? extra_data : null,
                    category: finalCategory,
                    attended: false,
                    registration_source: 'public_form',
                    registered_at: new Date().toISOString(),
                    wants_certificate: isPaidCert ? wantsCertificate : (event.certificate_type === 'free'),
                    payment_status: isPaidCert && wantsCertificate ? 'pending' : null,
                    payment_amount: isPaidCert && wantsCertificate ? calculatedPrice : null,
                    payment_method: isPaidCert && wantsCertificate ? 'yape' : null,
                    payment_receipt_url: receiptUrl
                });

            if (insertError) throw insertError;


            setSubmitted(true);
        } catch (e: any) {
            console.error('Error al registrar:', e);
            setError(e.message || 'Error al registrar. Por favor intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    }

    // ─── ESTADOS ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: S.bg }}>
                <Loader2 className="animate-spin text-exec-blue" size={36} />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4" style={{ background: S.bg }}>
                <div className="text-center max-w-md">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {event?.organizer_type === 'colegio_sociologo_unidad' ? (
                            <>
                                <img src="/certificates/logo-unidad-v2/Logo de la unidad de investigacion, de la facultad de ciencias sociales. sin fondo blanco.png" alt="Unidad" className="h-10 w-auto opacity-60" />
                                <div className="w-px h-8 bg-[#262626]" />
                                <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Colegio" className="h-10 w-auto opacity-60" />
                                <div className="w-px h-8 bg-[#262626]" />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-10 w-auto opacity-60" />
                            </>
                        ) : event?.organizer_type === 'revista_la_colmena' ? (
                            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
                                <div className="bg-white p-1 px-2 rounded-sm flex items-center gap-2 shadow-sm shrink-0 h-8 sm:h-10 scale-[0.85] sm:scale-100 origin-center">
                                    <img src="/certificates/logo-la-colmena/logo-la-colmena-icono.png" alt="La Colmena Icono" className="h-6 sm:h-8 w-auto" />
                                    <img src="/certificates/logo-la-colmena/logo-la-colmena-texto.png" alt="La Colmena Texto" className="h-3 sm:h-4 w-auto mt-1" />
                                </div>
                                <div className="hidden sm:block w-px h-6 bg-[#262626]" />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-5 sm:h-7 w-auto opacity-60" />
                            </div>
                        ) : (
                            <>
                                <img src="/certificates/logo-unc/R.png" alt="UNC" className="h-10 w-auto opacity-60" />
                                <div className="w-px h-8 bg-[#262626]" />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-10 w-auto opacity-60" />
                            </>
                        )}
                    </div>
                    <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-white mb-2">Formulario no disponible</h1>
                    <p className="text-sm text-gray-500">Este formulario de inscripción no existe o no está activo.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        const isPaidAndWants = event?.certificate_type === 'paid' && wantsCertificate;
        const isFree = event?.certificate_type === 'free';
        return (
            <div className="min-h-screen flex items-center justify-center px-4" style={{ background: S.bg }}>
                <div className="text-center max-w-sm">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        {event?.organizer_type === 'colegio_sociologo_unidad' ? (
                            <>
                                <img src="/certificates/logo-unidad-v2/Logo de la unidad de investigacion, de la facultad de ciencias sociales. sin fondo blanco.png" alt="Unidad" className="h-10 w-auto" />
                                <div className="w-px h-8 bg-[#262626]" />
                                <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Colegio" className="h-10 w-auto" />
                                <div className="w-px h-8 bg-[#262626]" />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-10 w-auto" />
                            </>
                        ) : event?.organizer_type === 'revista_la_colmena' ? (
                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                <div className="bg-white p-1 px-2 rounded-sm flex items-center gap-2 shadow-sm pointer-events-none scale-[0.8] sm:scale-100 origin-center sm:origin-left">
                                    <img src="/certificates/logo-la-colmena/logo-la-colmena-icono.png" alt="La Colmena Icono" className="h-7 sm:h-8 w-auto" />
                                    <img src="/certificates/logo-la-colmena/logo-la-colmena-texto.png" alt="La Colmena Texto" className="h-3 sm:h-4 w-auto mt-1" />
                                </div>
                                <div className="hidden sm:block w-px h-6 bg-[#262626]" />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-6 sm:h-7 w-auto" />
                            </div>
                        ) : (
                            <>
                                <img src="/certificates/logo-unc/R.png" alt="UNC" className="h-10 w-auto" />
                                <div className="w-px h-8 bg-[#262626]" />
                                <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" className="h-10 w-auto" />
                                <div className="w-px h-8 bg-[#262626]" />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-10 w-auto" />
                            </>
                        )}
                    </div>
                    <div className="w-16 h-16 flex items-center justify-center mx-auto mb-5 rounded-none border border-[#262626]"
                        style={{ background: S.card }}>
                        <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-white mb-2 uppercase tracking-tight">¡Inscripción completada!</h1>
                    <p className="text-sm text-gray-500 mb-1">Te has registrado exitosamente para</p>
                    <p className="text-base font-bold text-exec-blue mb-5 tracking-tight uppercase">{event?.title}</p>

                    {isPaidAndWants && (
                        <div className="p-3 rounded-none border border-yellow-800/30 bg-yellow-900/10 text-left mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Award size={13} className="text-yellow-400" />
                                <span className="text-xs font-semibold text-yellow-300">Pago en revisión</span>
                            </div>
                            <p className="text-xs text-yellow-200/60">
                                Tu comprobante fue recibido. Verificaremos tu pago y te confirmaremos tu certificado.
                            </p>
                        </div>
                    )}
                    {isFree && (
                        <div className="p-3 rounded-none border border-emerald-800/30 bg-emerald-900/10 text-left mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Award size={13} className="text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-300">Certificado gratuito incluido</span>
                            </div>
                            <p className="text-xs text-emerald-200/60">
                                Recibirás tu certificado al completar el evento.
                            </p>
                        </div>
                    )}

                    <p className="text-xs text-gray-600">Nos vemos en el evento. ¡Gracias por inscribirte!</p>
                </div>
            </div>
        );
    }

    const formFields = event?.registration_form || [];
    const formattedDate = event?.scheduled_date
        ? new Date(event.scheduled_date + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
        : '';

    const isPaidCert = event?.certificate_type === 'paid';
    const isFreeCert = event?.certificate_type === 'free';

    const currentCategory = (() => {
        if (isPaidCert) {
            return event?.pricing_options?.find(o => o.id === selectedPricingOptionId)?.name || 'participante_general';
        }
        const catKey = Object.keys(formValues).find(k => {
            const lower = k.toLowerCase();
            return lower.includes('category') || lower.includes('categoria') || lower.includes('categoría') || lower.includes('tipo');
        });
        return catKey ? String(formValues[catKey]) : 'participante_general';
    })();

    return (
        <div className="min-h-screen font-sans antialiased" style={{ background: S.bg, color: S.text }}>

            {/* ── Cabecera institucional ─────────────────────────────────────── */}
            <header className="border-b sticky top-0 z-10"
                style={{ background: S.card, borderColor: S.border }}>
                <div className="max-w-2xl mx-auto px-5 min-h-[4rem] py-2 md:py-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                        {event?.organizer_type === 'colegio_sociologo_unidad' ? (
                            <>
                                <img src="/certificates/logo-unidad-v2/Logo de la unidad de investigacion, de la facultad de ciencias sociales. sin fondo blanco.png" alt="Unidad de Investigación" className="h-10 w-auto" />
                                <div className="w-px h-7" style={{ background: S.border }} />
                                <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Colegio de Sociólogos" className="h-10 w-auto" />
                                <div className="w-px h-7" style={{ background: S.border }} />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-9 w-auto" />
                            </>
                        ) : event?.organizer_type === 'revista_la_colmena' ? (
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
                                <div className="bg-white p-1 px-2 rounded-none flex items-center gap-2 shadow-sm pointer-events-none scale-[0.8] sm:scale-100 origin-center sm:origin-left">
                                    <img src="/certificates/logo-la-colmena/logo-la-colmena-icono.png" alt="La Colmena Icono" className="h-7 sm:h-8 w-auto" />
                                    <img src="/certificates/logo-la-colmena/logo-la-colmena-texto.png" alt="La Colmena Texto" className="h-3 sm:h-4 w-auto mt-1" />
                                </div>
                                <div className="hidden sm:block w-px h-6 bg-[#262626]" />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-5 sm:h-7 w-auto" />
                            </div>
                        ) : (
                            <>
                                <img src="/certificates/logo-unc/R.png" alt="Universidad Nacional de Cajamarca" className="h-9 w-auto" />
                                <div className="w-px h-7" style={{ background: S.border }} />
                                <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad de Ciencias Sociales" className="h-9 w-auto" />
                                <div className="w-px h-7" style={{ background: S.border }} />
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-9 w-auto" />
                            </>
                        )}
                    </div>

                    {/* Timer in Header Industrial */}
                    {timeLeft && (
                        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-none border transition-all"
                            style={timeLeft.type === 'finished' ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' } :
                                   timeLeft.type === 'running' ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' } :
                                   { background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderColor: S.border }
                            }>
                            {timeLeft.type === 'finished' ? (
                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Evento Finalizado</span>
                            ) : timeLeft.type === 'running' ? (
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-glow-emerald">Evento en curso</span>
                            ) : (
                                <>
                                    <div className="flex flex-col items-end mr-1">
                                        <span className="text-[7px] font-black uppercase tracking-tighter leading-none" style={{ color: isDark ? '#94A3B8' : '#475569' }}>Falta para</span>
                                        <span className="text-[7px] text-exec-blue font-black uppercase tracking-tighter leading-none">el evento</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold leading-none" style={{ color: S.blue }}>{timeLeft.d}</span>
                                        <span className="text-[7px] text-gray-500 uppercase font-bold tracking-tighter">Días</span>
                                    </div>
                                    <span className="font-light" style={{ color: isDark ? '#334155' : '#94a3b8' }}>:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold leading-none" style={{ color: S.blue }}>{timeLeft.h}</span>
                                        <span className="text-[7px] text-gray-500 uppercase font-bold tracking-tighter">Hrs</span>
                                    </div>
                                    <span className="font-light" style={{ color: isDark ? '#334155' : '#94a3b8' }}>:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold leading-none" style={{ color: S.blue }}>{timeLeft.m}</span>
                                        <span className="text-[7px] text-gray-500 uppercase font-bold tracking-tighter">Min</span>
                                    </div>
                                    <span className="font-light" style={{ color: isDark ? '#334155' : '#94a3b8' }}>:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold leading-none text-emerald-400">{timeLeft.s}</span>
                                        <span className="text-[7px] text-emerald-500/50 uppercase font-bold tracking-tighter">Seg</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowSearchModal(true)}
                            className="p-2 border transition-all hover:opacity-80 flex items-center justify-center"
                            style={{ background: S.input, borderColor: S.border, color: S.blue }}
                            title="Consultar inscripción"
                        >
                            <Search size={16} />
                        </button>

                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-none border"
                                style={{ background: S.hover, borderColor: S.border, color: '#94A3B8' }}>
                                Inscripción en línea
                            </span>
                            {timeLeft && timeLeft.type === 'waiting' && (
                                <span className="text-[8px] text-exec-blue font-bold uppercase tracking-widest mt-1 md:hidden">
                                    FALTA PARA EL EVENTO: {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Hero portada Industrial ── */}
            {event?.cover_image_url && (
                <div className="max-w-2xl mx-auto px-5 pt-6 pb-2">
                    <div className="relative overflow-hidden rounded-none" style={{ maxHeight: '320px' }}>
                        <img
                            src={event.cover_image_url}
                            alt={event.title}
                            className="w-full object-contain block mx-auto"
                            style={{
                                maxHeight: '320px',
                                background: isDark ? '#000000' : S.bg,
                                borderRadius: '0',
                            }}
                        />
                        {/* Gradiente inferior Industrial */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                            style={{ background: `linear-gradient(to bottom, transparent, ${S.bg})` }} />
                    </div>
                </div>
            )}

            {/* ── Contenido principal ───────────────────────────────────────── */}
            <div className="max-w-2xl mx-auto px-5 py-8">

                {/* Tipo de evento chip Industrial */}
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-none border mb-4"
                    style={{ background: 'rgba(0,136,255,0.1)', borderColor: 'rgba(0,136,255,0.3)', color: S.blue }}>
                    {event?.event_type?.replace(/_/g, ' ')}
                </span>

                {/* Título */}
                <h1 className="text-2xl md:text-3xl font-semibold mb-5 leading-tight tracking-tight" style={{ color: S.text }}>
                    {event?.title}
                </h1>

                {/* Meta info Industrial */}
                <div className="flex flex-col gap-2.5 text-sm mb-6 p-4 rounded-none border"
                    style={{ background: S.card, borderColor: S.border }}>
                    {event?.scheduled_date && (
                        <div className="flex items-center gap-3 text-sm" style={{ color: isDark ? '#a3a3a3' : '#4b5563' }}>
                            <Calendar size={14} className="shrink-0" style={{ color: S.blue }} />
                            <span className="capitalize">{formattedDate}</span>
                            {event.start_time && (
                                <span className="ml-auto text-xs font-mono" style={{ color: isDark ? '#666' : '#64748b' }}>
                                    {event.start_time.slice(0, 5)} – {event.end_time?.slice(0, 5)}
                                </span>
                            )}
                        </div>
                    )}
                    <div className="h-px" style={{ background: S.border }} />
                    <div className="flex items-center gap-3 text-sm" style={{ color: isDark ? '#a3a3a3' : '#4b5563' }}>
                        {event?.is_online
                            ? <Globe size={14} className="text-emerald-400 shrink-0" />
                            : <MapPin size={14} className="text-orange-400 shrink-0" />
                        }
                        <span>{event?.is_online ? 'Evento en línea' : event?.location}</span>
                    </div>
                    {event?.max_capacity && (
                        <>
                            <div className="h-px" style={{ background: S.border }} />
                            <div className="flex items-center gap-3 text-sm" style={{ color: isDark ? '#a3a3a3' : '#4b5563' }}>
                                <Users size={14} className="text-violet-400 shrink-0" />
                                <span>{event.participant_count} / {event.max_capacity} inscritos</span>
                                <div className="flex-1 h-1 rounded-none ml-2" style={{ background: S.input }}>
                                    <div className="h-1 rounded-none bg-violet-500"
                                        style={{ width: `${Math.min(100, (event.participant_count / event.max_capacity) * 100)}%` }} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Event Link for Virtual Events Industrial */}
                {event?.is_online && event.meeting_url && (
                    <div className="mb-6 p-4 rounded-none border border-exec-blue/30 bg-exec-blue/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-exec-blue/20 rounded-none border border-exec-blue/30">
                                <Globe size={18} className="text-exec-blue" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: S.text }}>Enlace de acceso virtual</h3>
                                <p className="text-[10px] text-exec-blue/60 uppercase tracking-widest">Disponible para todos los inscritos</p>
                            </div>
                        </div>
                        <a
                            href={event.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-exec-blue hover:bg-[#0077EE] text-white text-xs font-bold uppercase tracking-[0.2em] rounded-none transition-all shadow-lg shadow-exec-blue/20"
                        >
                            <Globe size={14} />
                            Unirse a la reunión
                        </a>
                        <p className="mt-2 text-center text-[9px] text-gray-600 font-medium">
                            {event.meeting_url}
                        </p>
                    </div>
                )}

                {/* Timer Mobile UI */}
                {timeLeft && (
                    <div className="mb-6 md:hidden">
                        {timeLeft.type === 'finished' ? (
                            <div className="p-4 rounded-sm border border-red-500/30 bg-red-500/10 text-center">
                                <span className="text-sm font-bold text-red-400 uppercase tracking-widest leading-none">
                                    EVENTO FINALIZADO
                                </span>
                            </div>
                        ) : timeLeft.type === 'running' ? (
                            <div className="p-4 rounded-sm border border-emerald-500/30 bg-emerald-500/10 text-center animate-pulse">
                                <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest leading-none">
                                    EVENTO EN CURSO
                                </span>
                            </div>
                        ) : (
                            <>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block text-center">
                                    FALTA PARA QUE INICIE EL EVENTO
                                </span>
                                <div className="flex gap-2 justify-center">
                                    {[
                                        { label: 'DÍAS', value: timeLeft.d },
                                        { label: 'HORAS', value: timeLeft.h },
                                        { label: 'MINUTOS', value: timeLeft.m },
                                        { label: 'SEGUNDOS', value: timeLeft.s }
                                    ].map((unit, idx) => (
                                        <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-none border min-w-[60px]"
                                            style={{ background: S.cardAlt, borderColor: S.border }}>
                                            <span className="text-xl font-bold font-mono tracking-tighter" style={{ color: S.blue }}>{unit.value.toString().padStart(2, '0')}</span>
                                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{unit.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Descripción */}
                {event?.description && (
                    <p className="text-sm text-gray-500 leading-relaxed mb-8">{event.description}</p>
                )}

                {/* ── Formulario ──────────────────────────────────────────────── */}
                <div className="rounded-sm border" style={{ background: S.card, borderColor: S.border }}>
                    <div className="px-6 py-4 border-b flex items-center gap-2"
                        style={{ borderColor: S.border, background: S.cardAlt }}>
                        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                            Formulario de inscripción
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {formFields.sort((a, b) => a.order - b.order).map(field => (
                            <div key={field.id}>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                {field.type === 'textarea' ? (
                                    <textarea required={field.required} placeholder={field.placeholder}
                                        value={String(formValues[field.id] || '')}
                                        onChange={e => handleFieldChange(field.id, e.target.value)}
                                        rows={4} className={`${inputCls} resize-none`} />
                                ) : field.type === 'select' ? (
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        {(field.options || []).map(o => (
                                            <label key={o} className="flex items-center gap-2 cursor-pointer group">
                                                <input type="radio" name={field.id} value={o}
                                                    checked={formValues[field.id] === o}
                                                    onChange={() => handleFieldChange(field.id, o)}
                                                    required={field.required} className="accent-blue-500 w-4 h-4" />
                                                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{o}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : field.type === 'radio' ? (
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        {(field.options || []).map(o => (
                                            <label key={o} className="flex items-center gap-2 cursor-pointer group">
                                                <input type="radio" name={field.id} value={o}
                                                    checked={formValues[field.id] === o}
                                                    onChange={() => handleFieldChange(field.id, o)}
                                                    required={field.required} className="accent-blue-500" />
                                                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{o}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : field.type === 'checkbox' ? (
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        {(field.options || []).map(o => (
                                            <label key={o} className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" value={o}
                                                    checked={(formValues[field.id] as string[] || []).includes(o)}
                                                    onChange={e => {
                                                        const current = (formValues[field.id] as string[] || []);
                                                        handleFieldChange(field.id, e.target.checked
                                                            ? [...current, o]
                                                            : current.filter(v => v !== o));
                                                    }}
                                                    className="accent-blue-500" />
                                                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{o}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <input type={field.type} required={field.required}
                                        placeholder={field.placeholder}
                                        value={String(formValues[field.id] || '')}
                                        onChange={e => handleFieldChange(field.id, e.target.value)}
                                        className={inputCls} />
                                )}
                            </div>
                        ))}

                        {/* ── Bloque de certificado GRATIS ────────────────────── */}
                        {isFreeCert && (
                            <div className="h-px mt-2" style={{ background: S.border }} />
                        )}
                        {isFreeCert && (
                            <>
                                <div className="flex items-center gap-3 p-3 rounded-sm border"
                                    style={{ 
                                        borderColor: isDark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.3)',
                                        background: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.08)' 
                                    }}>
                                    <Award size={16} className="shrink-0" style={{ color: isDark ? '#34d399' : '#047857' }} />
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold" style={{ color: isDark ? '#a7f3d0' : '#065f46' }}>Certificado de participación gratuito</p>
                                        <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(167,243,208,0.6)' : '#047857' }}>Recibirás tu certificado al finalizar el evento.</p>
                                    </div>
                                    <Eye size={14} className="shrink-0" style={{ color: isDark ? 'rgba(52,211,153,0.6)' : 'rgba(16,185,129,0.6)' }} />
                                </div>

                                {/* Vista previa del certificado — se activa cuando haya nombre */}
                                <div
                                    style={{
                                        maxHeight: String(formValues['full_name'] || '').trim() ? '600px' : '0px',
                                        opacity: String(formValues['full_name'] || '').trim() ? 1 : 0,
                                        overflow: 'hidden',
                                        transition: 'max-height 0.5s ease, opacity 0.4s ease',
                                    }}
                                >
                                    <div className="mt-3 rounded-sm border overflow-hidden" style={{ borderColor: isDark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.3)', background: isDark ? '#050505' : '#f0fdf4' }}>
                                        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: isDark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.15)', background: isDark ? '#0A0A0A' : '#dcfce7' }}>
                                            <Eye size={11} style={{ color: isDark ? '#34d399' : '#047857' }} />
                                            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#34d399' : '#047857' }}>Previsualización de tu certificado</span>
                                        </div>
                                        <div className="p-3">
                                            <CertificatePreviewCard
                                                participantName={String(formValues['full_name'] || '')}
                                                eventTitle={event?.title || ''}
                                                eventDate={event?.scheduled_date || ''}
                                                organizerType={event?.organizer_type === 'colegio_sociologo_unidad' ? 'colegio_sociologo_unidad' : 'acs'}
                                                eventType={event?.event_type}
                                                instructorName={event?.instructor_name}
                                                instructorRole={event?.instructor_role}
                                                category={currentCategory}
                                            />
                                        </div>
                                        <p className="text-center text-[9px] pb-2 uppercase tracking-widest" style={{ color: isDark ? '#555' : '#6b7280' }}>
                                            El certificado final será generado por la secretaría tras el evento
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Bloque de certificado DE PAGO ───────────────────── */}
                        {isPaidCert && (
                            <>
                                <div className="h-px mt-2" style={{ background: S.border }} />

                                {/* Caja de pago */}
                                <div className="rounded-sm border overflow-hidden"
                                    style={{ borderColor: wantsCertificate ? 'rgba(168,85,247,0.4)' : S.border }}>
                                    {/* Header */}
                                    <div className="px-4 py-3 border-b"
                                        style={{ background: S.cardAlt, borderColor: S.border }}>
                                        <div className="flex items-center gap-2">
                                            <Award size={14} className="text-yellow-400" />
                                            <span className="text-sm font-semibold" style={{ color: S.text }}>
                                                Certificado de participación {event?.event_type?.toLowerCase() === 'taller' ? '(Obligatorio)' : '(Opcional)'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-4" style={{ background: isDark ? '#050505' : '#ffffff' }}>
                                        {/* ── Selección de Categoría de Precio ── */}
                                        {event?.pricing_options && event.pricing_options.length > 0 && (
                                            <div className="p-3 rounded-none border" style={{ borderColor: 'rgba(0,136,255,0.3)', background: 'rgba(0,136,255,0.05)' }}>
                                                <label className="text-xs font-semibold text-exec-blue uppercase tracking-wider mb-2 block">
                                                    Selecciona tu categoría <span className="text-red-500">*</span>
                                                </label>
                                                <div className="space-y-2">
                                                    {event.pricing_options.map(opt => (
                                                        <label key={opt.id} 
                                                            className={`flex items-center justify-between p-2.5 rounded-none border cursor-pointer transition-all ${selectedPricingOptionId === opt.id ? 'border-exec-blue bg-exec-blue/10' : 'hover:border-gray-600'}`}
                                                            style={selectedPricingOptionId !== opt.id ? { borderColor: S.border, background: S.input } : {}}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center ${selectedPricingOptionId === opt.id ? 'border-exec-blue' : 'border-gray-500'}`}>
                                                                    {selectedPricingOptionId === opt.id && <div className="w-2 h-2 rounded-none bg-exec-blue shadow-[0_0_8px_rgba(0,136,255,0.5)]" />}
                                                                </div>
                                                                <span className="text-sm font-medium" style={{ color: S.text }}>{opt.name}</span>
                                                            </div>
                                                            <span className="text-sm font-bold" style={{ color: S.text }}>S/ {opt.price.toFixed(2)}</span>
                                                            {/* Input oculto para accesibilidad */}
                                                            <input type="radio" className="hidden" name="pricing_option" checked={selectedPricingOptionId === opt.id} onChange={() => setSelectedPricingOptionId(opt.id)} />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Vista previa del certificado (pago) ── */}
                                        <div className="rounded-none border overflow-hidden" style={{ borderColor: 'rgba(0,136,255,0.25)', background: isDark ? '#060606' : '#f0f9ff' }}>
                                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(0,136,255,0.15)', background: isDark ? '#0A0A0A' : '#e0f2fe' }}>
                                                <Eye size={11} className="text-exec-blue" />
                                                <span className="text-[10px] font-semibold uppercase tracking-widest text-exec-blue">Previsualización de tu certificado</span>
                                            </div>
                                            <div className="p-3">
                                                <CertificatePreviewCard
                                                    participantName={String(formValues['full_name'] || '')}
                                                    eventTitle={event?.title || ''}
                                                    eventDate={event?.scheduled_date || ''}
                                                    organizerType={event?.organizer_type === 'colegio_sociologo_unidad' ? 'colegio_sociologo_unidad' : 'acs'}
                                                    eventType={event?.event_type}
                                                    instructorName={event?.instructor_name}
                                                    instructorRole={event?.instructor_role}
                                                    category={currentCategory}
                                                />
                                            </div>
                                            {!String(formValues['full_name'] || '').trim() && (
                                                <p className="text-center text-[9px] text-gray-600 pb-2">
                                                    Completa el campo «Nombre completo» para ver tu certificado personalizado
                                                </p>
                                            )}
                                        </div>

                                        {/* ── Toggle de decisión de compra ── */}
                                        <div className="p-4 rounded-none border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                                            style={{ 
                                                borderColor: wantsCertificate ? 'rgba(0,136,255,0.4)' : S.border, 
                                                background: wantsCertificate ? 'rgba(0,136,255,0.05)' : S.input 
                                            }}>
                                            <div>
                                                <span className="text-sm font-semibold block mb-0.5" style={{ color: S.text }}>
                                                    {event?.event_type?.toLowerCase() === 'taller' ? 'Certificado Obligatorio' : '¿Deseas solicitar tu certificado?'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {event?.event_type?.toLowerCase() === 'taller' 
                                                        ? 'Para los talleres prácticos, la inscripción incluye el costo del certificado.'
                                                        : 'Activa esta opción para pagar y adjuntar tu comprobante ahora.'}
                                                </span>
                                            </div>
                                            {event?.event_type?.toLowerCase() !== 'taller' ? (
                                                <label className="flex items-center gap-3 cursor-pointer select-none shrink-0">
                                                    <span className="text-sm font-medium transition-colors" style={{ color: wantsCertificate ? '#0088FF' : '#9ca3af' }}>
                                                        {wantsCertificate ? 'Sí, lo quiero' : 'No por ahora'}
                                                    </span>
                                                    <div
                                                        onClick={() => setWantsCertificate(!wantsCertificate)}
                                                        className="relative w-12 h-6 rounded-none cursor-pointer transition-all border border-[#262626]"
                                                        style={{ background: wantsCertificate ? '#0088FF' : (isDark ? '#1a1a1a' : '#cbd5e1') }}>
                                                        <div className="absolute top-0.5 h-[18px] w-5 rounded-none bg-white shadow transition-all"
                                                            style={{ left: wantsCertificate ? '24px' : '2px' }} />
                                                    </div>
                                                </label>
                                            ) : (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-exec-blue/10 border border-exec-blue/30 text-exec-blue text-[10px] font-bold uppercase tracking-widest">
                                                    <Award size={12} /> Incluido
                                                </div>
                                            )}
                                        </div>

                                        {/* ── Instrucciones de pago y subida (Sólo si lo quiere) ── */}
                                        {wantsCertificate && (
                                            <div className="space-y-4 pt-4 border-t animate-fade-in" style={{ borderColor: S.border }}>
                                                {/* Instrucciones de pago */}
                                                <div className="flex items-start gap-3 p-3 rounded-none border"
                                                    style={{ background: S.input, borderColor: S.border }}>
                                                    <CreditCard size={14} className="text-exec-blue mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-semibold mb-0.5" style={{ color: S.text }}>
                                                            Realiza tu pago por Yape al número:
                                                        </p>
                                                        <p className="text-xl font-bold font-mono tracking-widest" style={{ color: S.text }}>
                                                            {YAPE_NUMBER}
                                                        </p>
                                                        <p className="text-xs mt-0.5" style={{ color: isDark ? '#666' : '#4b5563' }}>Secretaria — Revista ACS</p>
                                                    </div>
                                                    {/* QR si existe */}
                                                    {event.yape_qr_url && (
                                                        <img src={event.yape_qr_url} alt="QR Yape"
                                                            className="w-16 h-16 rounded-sm object-cover ml-auto shrink-0 border" style={{ borderColor: S.border }} />
                                                    )}
                                                </div>

                                                {/* Monto */}
                                                <div className="flex items-center justify-between px-3 py-2 rounded-sm border"
                                                    style={{ background: S.input, borderColor: S.border }}>
                                                    <span className="text-xs text-gray-500">Monto total a transferir:</span>
                                                    <span className="text-base font-bold" style={{ color: S.text }}>
                                                        S/ {calculatedPrice.toFixed(2)}
                                                    </span>
                                                </div>

                                                {/* Subir comprobante */}
                                                <div>
                                                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: S.text }}>
                                                        Comprobante de pago <span className="text-red-500">*</span>
                                                    </label>

                                                    {receiptPreview ? (
                                                        <div className="relative inline-block mt-2">
                                                            <img src={receiptPreview} alt="Comprobante"
                                                                className="w-full max-w-[200px] h-auto object-contain rounded-sm border" style={{ borderColor: S.border }} />
                                                            <button type="button"
                                                                onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                                                                className="absolute -top-3 -right-3 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg z-20">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-full">
                                                            <input ref={receiptInputRef} type="file" accept="image/*,.pdf"
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                onChange={e => { if (e.target.files?.[0]) handleReceiptChange(e.target.files[0]); }} />

                                                            <button type="button"
                                                                className="flex items-center gap-2 w-full px-4 py-4 border-2 border-dashed rounded-sm text-sm text-gray-400 hover:text-purple-300 hover:border-purple-500 transition-all justify-center hover:bg-purple-900/10 pointer-events-none"
                                                                style={{ background: S.input, borderColor: S.border }}>
                                                                <Upload size={16} />
                                                                Adjuntar captura de pantalla del Yape comprobante
                                                            </button>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] text-gray-500 mt-2">
                                                        Sube una foto clara o captura de pantalla del comprobante de Yape después de realizar el pago correspondiente.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Error Industrial */}
                        {error && (
                            <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-none border"
                                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}>
                                <AlertCircle size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Submit Industrial */}
                        <button type="submit"
                            disabled={submitting || uploadingReceipt || (timeLeft?.type === 'finished')}
                            className="w-full py-4 text-sm font-black rounded-none flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em]"
                            style={{
                                background: timeLeft?.type === 'finished' ? '#1f1f1f' : S.blue,
                                color: timeLeft?.type === 'finished' ? '#444' : 'white',
                                boxShadow: timeLeft?.type === 'finished' ? 'none' : '0 4px 15px rgba(0, 136, 255, 0.25)'
                            }}
                            onMouseEnter={e => {
                                if (timeLeft?.type !== 'finished') {
                                    e.currentTarget.style.background = '#0077EE';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (timeLeft?.type !== 'finished') {
                                    e.currentTarget.style.background = S.blue;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}>
                            {(submitting || uploadingReceipt) && <Loader2 size={16} className="animate-spin" />}
                            {submitting || uploadingReceipt
                                ? 'Enviando Registro...'
                                : timeLeft?.type === 'finished'
                                    ? 'Inscripciones cerradas'
                                    : 'Confirmar inscripción'}
                        </button>

                        {timeLeft?.type === 'finished' && (
                            <div className="flex items-center gap-2 justify-center text-red-500 mt-2 animate-pulse">
                                <X size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                    El evento ha finalizado. No se aceptan más registros.
                                </span>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-gray-700 mt-8 uppercase tracking-widest">
                    Universidad Nacional de Cajamarca · Sistema ACS
                </p>
            </div>

            {/* Modal de búsqueda */}
            {showSearchModal && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => {
                        setShowSearchModal(false);
                        setSearchQuery('');
                        setSearchResult(null);
                        setSearchError(null);
                    }}
                >
                    <div 
                        className="w-full max-w-lg border rounded-none p-6 space-y-4 shadow-2xl relative"
                        style={{ background: S.card, borderColor: S.border, color: S.text }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Botón cerrar */}
                        <button 
                            type="button"
                            onClick={() => {
                                setShowSearchModal(false);
                                setSearchQuery('');
                                setSearchResult(null);
                                setSearchError(null);
                            }}
                            className="absolute top-4 right-4 p-1 hover:opacity-70 transition-all"
                            style={{ color: S.text }}
                        >
                            <X size={18} />
                        </button>

                        <div>
                            <h3 className="text-base font-bold uppercase tracking-wider mb-1">
                                Consultar inscripción
                            </h3>
                            <p className="text-xs text-gray-500">
                                Ingresa tu DNI o Correo Electrónico para verificar el estado de tu registro en este evento.
                            </p>
                        </div>

                        {/* Input y Botón de búsqueda */}
                        <form 
                            onSubmit={e => { e.preventDefault(); handleSearch(); }}
                            className="flex gap-2"
                        >
                            <input 
                                type="text"
                                required
                                placeholder="DNI o Correo electrónico"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={inputCls}
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                style={{ background: S.blue }}
                            >
                                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                Buscar
                            </button>
                        </form>

                        {/* Error de búsqueda */}
                        {searchError && (
                            <p className="text-xs text-red-500 font-medium">
                                {searchError}
                            </p>
                        )}

                        {/* Resultados de búsqueda */}
                        {searchResult !== null && (
                            <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto pr-1">
                                {searchResult.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center py-4">
                                        No se encontró ninguna inscripción con los datos proporcionados.
                                    </p>
                                ) : (
                                    searchResult.map(participant => {
                                        // Formatear fecha de registro
                                        const regDate = participant.registered_at
                                            ? new Date(participant.registered_at).toLocaleDateString('es-ES', {
                                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })
                                            : '';
                                        
                                        return (
                                            <div 
                                                key={participant.id} 
                                                className="p-3 border rounded-none space-y-2.5"
                                                style={{ background: S.cardAlt, borderColor: S.border }}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="text-sm font-bold uppercase tracking-wide">
                                                            {participant.full_name}
                                                        </h4>
                                                        <p className="text-[10px] text-gray-500 font-medium">
                                                            DNI: {participant.dni} · {participant.email}
                                                        </p>
                                                    </div>
                                                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border"
                                                        style={{ 
                                                            borderColor: participant.payment_status === 'approved' || !participant.wants_certificate ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
                                                            background: participant.payment_status === 'approved' || !participant.wants_certificate ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
                                                            color: participant.payment_status === 'approved' || !participant.wants_certificate ? '#10b981' : '#f59e0b'
                                                        }}
                                                    >
                                                        {participant.wants_certificate 
                                                            ? (participant.payment_status === 'approved' ? 'Aprobado' : 'Pendiente de Pago')
                                                            : 'Registrado'
                                                        }
                                                    </span>
                                                </div>

                                                <div className="text-[10px] text-gray-600 flex flex-col gap-0.5">
                                                    <span>Categoría: <strong className="text-gray-400 capitalize">{participant.category?.replace(/_/g, ' ')}</strong></span>
                                                    <span>Fecha registro: <span className="font-mono">{regDate}</span></span>
                                                </div>

                                                {/* Botón de certificado si aplica */}
                                                {participant.wants_certificate && participant.payment_status === 'approved' && (
                                                    <div className="pt-2 border-t" style={{ borderColor: S.border }}>
                                                        {participant.certificate_url ? (
                                                            <a 
                                                                href={participant.certificate_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all"
                                                            >
                                                                <Award size={12} />
                                                                Descargar Certificado
                                                            </a>
                                                        ) : (
                                                            <p className="text-[10px] text-emerald-500 font-medium text-center">
                                                                ✓ Inscripción aprobada. Tu certificado está siendo generado por la secretaría.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
