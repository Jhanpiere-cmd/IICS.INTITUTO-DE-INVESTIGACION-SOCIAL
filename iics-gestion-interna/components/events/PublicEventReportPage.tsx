import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    Users, UserCheck, Globe, TrendingUp, BarChart2, BarChart3, 
    Clock, LayoutGrid, PenLine, Timer, X, RefreshCw, Zap, 
    AlertTriangle, CheckCircle2, Target, ShieldAlert, Lightbulb, 
    Gamepad2, History, UserPlus, Megaphone, Rocket, ChevronDown, 
    ChevronUp, CreditCard, Wallet, Award, Download, Sparkles, 
    Link, Copy, Check, Share2, Mail, ExternalLink, Briefcase, 
    MapPin, GraduationCap, Building2, ShieldHalf
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    CartesianGrid, XAxis, YAxis, BarChart, Bar, LineChart, Line, AreaChart, Area, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as Mercury from '../../lib/mercury';

interface EventData {
    id: string;
    title: string;
    description: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    status: string;
    organizer_type: string;
    cover_image_url: string;
    registration_form: any[];
    certificate_type: 'none' | 'free' | 'paid' | null;
    meeting_url?: string;
    is_online: boolean;
    pricing_options?: any[];
}

interface Stats {
    total: number;
    attended: number;
    paidCount: number;
    totalRevenue: number;
    bySource: Record<string, number>;
    bySex: Record<string, number>;
    byCategory: Record<string, number>;
    byCareer: Record<string, number>;
    byDegree: Record<string, number>;
    byAge: Record<string, number>;
    byCity: Record<string, number>;
    timeline: Array<{ date: string, count: number }>;
    customCharts?: Array<{ label: string; data: Record<string, number> }>;
    smartTextCharts?: Array<{ label: string; data: Record<string, number>; total: number }>;
    freeTextResponses?: Array<{ name: string; date: string; answers: Array<{ label: string; value: string }>; payment?: { status: string; amount: number; category: string } }>;
    revenueByCategory?: Record<string, { count: number; revenue: number }>;
}

interface Participant {
    id: string;
    full_name: string;
    sex: string;
    category: string;
    career: string;
    age: any;
    payment_status: string;
    payment_amount: number;
    registered_at: string;
    extra_data: any;
    attended: boolean;
    dni?: string;
    phone?: string;
    email?: string;
    institution?: string;
}

export const PublicEventReportPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [event, setEvent] = useState<EventData | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [aiSummary, setAiSummary] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
    const [preEventPrediction, setPreEventPrediction] = useState<any>(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);

    const STITCH_COLORS = [
        "#0088FF", // exec-blue
        "#6366F1", // indigo
        "#10B981", // emerald
        "#F43F5E", // rose
        "#F59E0B", // amber
        "#06B6D4", // cyan
        "#8B5CF6", // violet
        "#F97316", // orange
        "#14B8A6", // teal
        "#EC4899", // pink
        "#84CC16", // lime
        "#0EA5E9", // sky
        "#EAB308", // yellow
        "#A855F7", // purple
        "#D946EF", // fuchsia
        "#22C55E", // green
        "#3B82F6", // blue
        "#EF4444", // red
        "#0891B2", // cyan-700
        "#4F46E5", // indigo-600
        "#C026D3", // fuchsia-600
        "#059669", // emerald-600
        "#D97706", // amber-600
        "#2563EB", // blue-600
    ];

    const getResolvedCategory = (
        p: Participant,
        pricingOpts?: any[],
        certType?: 'none' | 'free' | 'paid' | null
    ): string => {
        const rawCat = (p.category || '').trim();
        const normalizedRaw = rawCat.toLowerCase();
        
        if (['organizador', 'ponente', 'expositor', 'staff', 'protocolo', 'moderador', 'comite'].includes(normalizedRaw)) {
            return rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
        }

        const cleanString = (str: string) => {
            return str
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "")
                .trim();
        };

        if (certType === 'paid' && pricingOpts && pricingOpts.length > 0) {
            const amount = Number(p.payment_amount);
            const hasRequestedCertificate = p.payment_status === 'paid' || p.payment_status === 'completed' || p.payment_status === 'pending';
            
            if (hasRequestedCertificate && !isNaN(amount) && amount > 0) {
                const exactPriceMatch = pricingOpts.find(opt => Number(opt.price) === amount);
                if (exactPriceMatch) {
                    return exactPriceMatch.name;
                }
            }

            const cleanCat = cleanString(rawCat);
            if (cleanCat && cleanCat !== 'participantegeneral') {
                const nameMatch = pricingOpts.find(opt => cleanString(opt.name) === cleanCat);
                if (nameMatch) {
                    return nameMatch.name;
                }
            }

            const textsToSearch: string[] = [];
            if (p.career) textsToSearch.push(p.career);
            if (p.academic_degree) textsToSearch.push(p.academic_degree);
            if (p.institution) textsToSearch.push(p.institution);
            if (p.university) textsToSearch.push(p.university);
            if (p.extra_data) {
                Object.values(p.extra_data).forEach(val => {
                    if (typeof val === 'string') textsToSearch.push(val);
                    else if (Array.isArray(val)) textsToSearch.push(val.join(' '));
                });
            }
            
            const fullTextContext = textsToSearch.map(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).join(' ');

            const studentKeywords = ['estudiante', 'alumno', 'pregrado', 'bachiller', 'universitario', 'colegio', 'escuela', 'ciclo', 'semestre', 'posgrado'];
            const isStudent = studentKeywords.some(keyword => fullTextContext.includes(keyword));

            const professionalKeywords = ['profesional', 'docente', 'egresado', 'publico', 'general', 'ingeniero', 'abogado', 'doctor', 'licenciado', 'sociologo', 'arquitecto', 'magister'];
            const isProfessional = professionalKeywords.some(keyword => fullTextContext.includes(keyword));

            const studentOption = pricingOpts.find(opt => {
                const cleanName = cleanString(opt.name);
                return cleanName.includes('estudiante') || cleanName.includes('alumno') || cleanName.includes('pregrado');
            }) || pricingOpts.reduce((minOpt, opt) => (opt.price < minOpt.price ? opt : minOpt), pricingOpts[0]);

            const professionalOption = pricingOpts.find(opt => {
                const cleanName = cleanString(opt.name);
                return cleanName.includes('profesional') || cleanName.includes('publico') || cleanName.includes('general') || cleanName.includes('docente');
            }) || pricingOpts.reduce((maxOpt, opt) => (opt.price > maxOpt.price ? opt : maxOpt), pricingOpts[0]);

            if (isStudent && !isProfessional) {
                return studentOption.name;
            }
            if (isProfessional && !isStudent) {
                return professionalOption.name;
            }

            if (hasRequestedCertificate && !isNaN(amount) && amount > 0) {
                let closestOpt = pricingOpts[0];
                let minDiff = Math.abs(Number(pricingOpts[0].price) - amount);
                pricingOpts.forEach(opt => {
                    const diff = Math.abs(Number(opt.price) - amount);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestOpt = opt;
                    }
                });
                return closestOpt.name;
            }

            if (rawCat && normalizedRaw !== 'participante_general') {
                return rawCat;
            }

            return professionalOption ? professionalOption.name : 'General';
        }

        if (normalizedRaw === 'participante_general' || !rawCat) {
            const textsToSearch: string[] = [];
            if (p.career) textsToSearch.push(p.career);
            if (p.academic_degree) textsToSearch.push(p.academic_degree);
            if (p.institution) textsToSearch.push(p.institution);
            if (p.university) textsToSearch.push(p.university);
            if (p.extra_data) {
                Object.values(p.extra_data).forEach(val => {
                    if (typeof val === 'string') textsToSearch.push(val);
                    else if (Array.isArray(val)) textsToSearch.push(val.join(' '));
                });
            }
            
            const fullTextContext = textsToSearch.map(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).join(' ');

            const studentKeywords = ['estudiante', 'alumno', 'pregrado', 'bachiller', 'universitario', 'colegio', 'escuela', 'ciclo', 'semestre', 'posgrado'];
            const isStudent = studentKeywords.some(keyword => fullTextContext.includes(keyword));

            if (isStudent) {
                return 'Estudiantes';
            }
            
            const professionalKeywords = ['profesional', 'docente', 'egresado', 'ingeniero', 'abogado', 'doctor', 'licenciado', 'sociologo', 'arquitecto', 'magister'];
            const isProfessional = professionalKeywords.some(keyword => fullTextContext.includes(keyword));
            if (isProfessional) {
                return 'Profesionales / Público general';
            }

            return 'Público General';
        }

        return rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
    };

    const computeStats = (
        list: Participant[], 
        formSchema?: any[], 
        currentPricingOpts: any[] = event?.pricing_options || [], 
        currentCertType: 'none' | 'free' | 'paid' | null = event?.certificate_type || 'none'
    ): Stats => {
        const bySource: Record<string, number> = {};
        const bySex: Record<string, number> = {};
        const byCareer: Record<string, number> = {};
        const byDegree: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        const byAge: Record<string, number> = {};
        const byCity: Record<string, number> = {};
        let attendedCount = 0;
        let paidCount = 0;
        let totalRevenue = 0;
        const revenueByCategory: Record<string, { count: number; revenue: number }> = {};

        const normalizeKey = (s: string) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        list.forEach(p => {
            const src = p.registration_source || 'manual';
            bySource[src] = (bySource[src] || 0) + 1;

            const sex = p.sex || 'No especificado';
            bySex[sex] = (bySex[sex] || 0) + 1;

            // City detection logic (Department/City/Place)
            const cityField = p.extra_data?.departamento || p.extra_data?.ciudad || p.extra_data?.lugar || p.extra_data?.city;
            if (cityField) {
                const c = String(cityField).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                byCity[c] = (byCity[c] || 0) + 1;
            }

            if (p.career) {
                const rawCareer = p.career.trim().toUpperCase();
                const searchCareer = rawCareer.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                let career = rawCareer
                    .replace(/ESTUDIANTE DE |EGRESADO DE |BACHILLER EN |LICENCIADO EN |INGENIERO EN /g, '')
                    .replace(/INGENIERIA DE |ING\s+/g, 'ING. ')
                    .replace(/LICENCIATURA EN |LIC\s+/g, 'LIC. ')
                    .replace(/SISTEMAS E INFORMATICA|SISTEMAS/g, 'SISTEMAS')
                    .trim();

                if (searchCareer.includes('SISTEMA') || searchCareer.includes('INFORM')) career = 'ING. SISTEMAS';
                else if (searchCareer.includes('DERECHO') || searchCareer.includes('ABOGAD')) career = 'DERECHO';
                else if (searchCareer.includes('EDUCAC')) career = 'EDUCACIÓN';
                else if (searchCareer.includes('MEDICIN')) career = 'MEDICINA';
                else if (searchCareer.includes('SOCIOLOG')) career = 'SOCIOLOGÍA';
                else if (searchCareer.includes('PSICOLOG')) career = 'PSICOLOGÍA';
                else if (searchCareer.includes('ADMINISTRAC')) career = 'ADMINISTRACIÓN';
                else if (searchCareer.includes('CONTABIL')) career = 'CONTABILIDAD';
                else if (searchCareer.includes('ECONOM')) career = 'ECONOMÍA';
                else if (searchCareer.includes('ARQUITECT')) career = 'ARQUITECTURA';
                else if (searchCareer.includes('ENFERMER')) career = 'ENFERMERÍA';
                else if (searchCareer.includes('COMUNICAC')) career = 'COMUNICACIONES';
                else if (searchCareer.includes('TURISMO')) career = 'TURISMO';
                else if (searchCareer.includes('AGRONOM')) career = 'AGRONOMÍA';
                else if (searchCareer.includes('VETERINAR')) career = 'VETERINARIA';

                byCareer[career] = (byCareer[career] || 0) + 1;
            }

            const cat = getResolvedCategory(p, currentPricingOpts, currentCertType);
            byCategory[cat] = (byCategory[cat] || 0) + 1;

            let age = p.age;
            if (typeof age === 'string') {
                const match = age.match(/\d+/);
                age = match ? parseInt(match[0]) : null;
            }
            if (age) {
                const ageLabel = age.toString() + ' años';
                byAge[ageLabel] = (byAge[ageLabel] || 0) + 1;
            }

            if (p.attended) attendedCount++;

            // Financial processing
            const itemCat = cat;
            if (!revenueByCategory[itemCat]) revenueByCategory[itemCat] = { count: 0, revenue: 0 };
            revenueByCategory[itemCat].count++;

            const isActuallyPaid = p.payment_status === 'paid' || p.payment_status === 'completed';
            if (isActuallyPaid) {
                paidCount++;
                const amount = Number(p.payment_amount) || Number(p.extra_data?.payment_amount) || 0;
                totalRevenue += amount;
                revenueByCategory[itemCat].revenue += amount;
            }
        });

        const customCharts: Array<{ label: string; data: Record<string, number> }> = [];
        const smartTextCharts: Array<{ label: string; data: Record<string, number>; total: number }> = [];
        const timelineMap: Record<string, { count: number; rawDate: string }> = {};

        if (list.length > 0) {
            const dates = list.filter(p => p.registered_at).map(p => new Date(p.registered_at));
            if (dates.length > 0) {
                const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                let current = new Date(minDate);
                current.setHours(0,0,0,0);
                while (current <= maxDate) {
                    const label = current.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                    timelineMap[label] = { count: 0, rawDate: current.toISOString().split('T')[0] };
                    current.setDate(current.getDate() + 1);
                }
            }
        }

        list.forEach(p => {
            if (p.registered_at) {
                const d = new Date(p.registered_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                if (timelineMap[d]) timelineMap[d].count++;
            }
        });

        const timeline = Object.entries(timelineMap)
            .sort((a, b) => {
                const dateA = new Date(a[1].rawDate).getTime();
                const dateB = new Date(b[1].rawDate).getTime();
                return dateA - dateB;
            })
            .map(([date, data]) => ({ date, count: data.count }));

        if (formSchema) {
            // Basic custom charts from selectors
            for (const field of formSchema.filter(f => (f.type === 'select' || f.type === 'radio') && !['full_name', 'category', 'career', 'age', 'sex'].includes(f.id))) {
                const map: Record<string, number> = {};
                list.forEach(p => {
                    const val = p.extra_data?.[field.id] || p.extra_data?.[field.label];
                    if (val) {
                        const s = String(val).trim().toUpperCase();
                        map[s] = (map[s] || 0) + 1;
                    }
                });
                if (Object.keys(map).length > 0) customCharts.push({ label: field.label.toUpperCase(), data: map });
            }

            // Basic smart charts candidate logic
            const NON_CHARTABLE_IDS = new Set(['full_name', 'email', 'phone', 'phone_number', 'dni', 'password', 'url', 'link']);
            const textCandidates = formSchema.filter(f => {
                const typeOk = ['text', 'textarea', 'tel', 'number'].includes(f.type);
                const idOk = !NON_CHARTABLE_IDS.has(f.id.toLowerCase());
                const notStandard = !['full_name', 'sex', 'category', 'career', 'age', 'institution', 'university'].includes(f.id);
                return typeOk && idOk && notStandard;
            });

            for (const field of textCandidates) {
                const freqMap: Record<string, number> = {};
                list.forEach(p => {
                    const val = p.extra_data?.[field.id] || p.extra_data?.[field.label];
                    if (val && String(val).trim() !== '' && String(val).length < 80) {
                        const v = String(val).trim().toLowerCase().replace(/(?:^|\s|[-])\S/g, c => c.toUpperCase());
                        freqMap[v] = (freqMap[v] || 0) + 1;
                    }
                });
                const total = Object.values(freqMap).reduce((a, b) => a + b, 0);
                if (total >= 2 && (Object.keys(freqMap).length / total) < 0.85) {
                    smartTextCharts.push({ label: field.label, data: freqMap, total });
                }
            }
        }

        const freeTextResponses: any[] = list.slice(0, 100).map(p => {
            const answers: any[] = [];
            if (formSchema) {
                formSchema.forEach(f => {
                    const val = p.extra_data?.[f.id] || p.extra_data?.[f.label] || (p as any)[f.id];
                    if (val && String(val).trim()) answers.push({ label: f.label, value: String(val).trim() });
                });
            }
            return { 
                name: p.full_name, 
                date: p.registered_at ? new Date(p.registered_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '', 
                answers,
                payment: {
                    status: p.payment_status || 'not_paid',
                    amount: Number(p.payment_amount) || 0,
                    category: getResolvedCategory(p, currentPricingOpts, currentCertType)
                }
            };
        }).filter(r => r.answers.length > 0);

        return {
            total: list.length,
            attended: attendedCount,
            paidCount,
            totalRevenue,
            bySource,
            bySex,
            byCategory,
            byCareer,
            byDegree,
            byAge,
            byCity, // Will be populated by smart charts if needed
            timeline,
            customCharts,
            smartTextCharts,
            freeTextResponses,
            revenueByCategory,
        } as any;
    };

    const loadPredictions = async (participantList: any[], scheduledDate: string, cap?: number) => {
        if (!scheduledDate) return;
        setLoadingPrediction(true);
        try {
            const now = new Date();
            const eventDay = new Date(scheduledDate);
            const daysUntilEvent = Math.max(1, Math.ceil((eventDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const total = participantList.length;

            const perDay: Record<string, number> = {};
            participantList.forEach(p => {
                if (p.registered_at) {
                    const day = p.registered_at.split('T')[0];
                    perDay[day] = (perDay[day] || 0) + 1;
                }
            });
            const sortedDays = Object.keys(perDay).sort();
            const last7 = sortedDays.slice(-7);
            const last7Total = last7.reduce((s, d) => s + perDay[d], 0);
            const registrationsPerDay = last7.length > 0 ? last7Total / last7.length : total / 7;

            const prediction = await Mercury.generateMercuryPreEventRecommendations({
                eventTitle: event?.title || 'Evento ACS',
                eventDate: scheduledDate,
                daysUntilEvent,
                currentRegistrations: total,
                registrationsPerDay,
                maxCapacity: cap || undefined,
            } as any);
            if (prediction) setPreEventPrediction(prediction);
        } catch (e) {
            console.error('Error loading predictions:', e);
        } finally {
            setLoadingPrediction(false);
        }
    };

    const fetchReport = async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('report_slug', slug)
                .single();

            if (eventError || !eventData) {
                setError('El reporte no existe o no es público.');
                return;
            }
            setEvent(eventData);

            const { data: participantList, error: partError } = await supabase
                .from('event_participants')
                .select('*')
                .eq('event_id', eventData.id)
                .order('registered_at', { ascending: false });

            if (partError) throw partError;
            const list = participantList || [];
            setParticipants(list);

            const baseStats = computeStats(
                list, 
                eventData.registration_form, 
                eventData.pricing_options || [], 
                eventData.certificate_type || 'none'
            );
            setStats(baseStats);

            if (eventData.ai_summary) {
                setAiSummary(eventData.ai_summary);
            }

            // Iniciar predicciones si el evento es futuro o actual
            const evStatus = (eventData.status || '').toLowerCase();
            if (['planned', 'active', 'upcoming', 'planificado', 'activo'].includes(evStatus)) {
                loadPredictions(list, eventData.scheduled_date);
            }

            // AI Smart Charts Logic (Ported from Internal)
            const runSmartAI = async () => {
                try {
                    const aiResult: any = { smartTextCharts: [] };
                    const rawCareers = list.map(p => p.career).filter(c => c && String(c).trim() !== '').map(String);
                    
                    if (rawCareers.length >= 2) {
                        const smartCareers = await Mercury.generateMercurySmartChartCategories('Top Carreras Profesionales', rawCareers);
                        if (smartCareers) aiResult.aiCareerStats = smartCareers;
                    }

                    for (const basic of baseStats.smartTextCharts || []) {
                        const rawValues: string[] = [];
                        Object.entries(basic.data).forEach(([val, count]) => {
                            for (let i = 0; i < (count as number); i++) rawValues.push(val);
                        });
                        const smartData = await Mercury.generateMercurySmartChartCategories(basic.label, rawValues);
                        aiResult.smartTextCharts.push({ label: basic.label, data: smartData || basic.data, total: rawValues.length });
                    }

                    if (aiResult.aiCareerStats || aiResult.smartTextCharts.length > 0) {
                        setStats(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                smartTextCharts: aiResult.smartTextCharts,
                                byCareer: aiResult.aiCareerStats || prev.byCareer
                            };
                        });
                    }
                } catch (e) {
                    console.error("Smart AI error:", e);
                }
            };

            // Run Smart AI in background without blocking the main render
            Promise.resolve().then(() => runSmartAI());

        } catch (e) {
            console.error('Error fetching public report:', e);
            setError('Error al cargar datos del servidor.');
        } finally {
            // Guarantee loading is false after a short delay to ensure rendering cycle
            setTimeout(() => setLoading(false), 300);
        }
    };

    useEffect(() => {
        if (!event?.scheduled_date || !event?.start_time) return;

        const timer = setInterval(() => {
            const now = new Date();
            const [hours, minutes] = event.start_time.split(':').map(Number);
            const targetDate = new Date(event.scheduled_date);
            targetDate.setHours(hours || 0, minutes || 0, 0, 0);

            const difference = targetDate.getTime() - now.getTime();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft(null);
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [event?.scheduled_date, event?.start_time]);

    useEffect(() => {
        fetchReport();
    }, [slug]);

    const handleExcelExport = () => {
        if (!participants.length) return;
        const rows = participants.map(p => ({
            Nombre: p.full_name,
            DNI: p.dni,
            Email: p.email,
            Teléfono: p.phone,
            Categoría: getResolvedCategory(p, event?.pricing_options, event?.certificate_type),
            Carrera: p.career,
            Asistencia: p.attended ? 'SÍ' : 'NO',
            Pago: p.payment_status === 'paid' || p.payment_status === 'completed' ? 'PAGADO' : p.payment_status === 'exempt' ? 'EXONERADO' : (p.payment_status === 'pending' || p.payment_status === 'requested' || p.payment_status === 'waiting') ? 'PENDIENTE' : 'NO SOLICITADO',
            Monto: p.payment_amount
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Participantes");
        XLSX.writeFile(wb, `Reporte_ACS_${event?.title}.xlsx`);
    };

    const handlePDFExport = async () => {
        setExporting(true);
        const element = document.getElementById('report-content');
        if (!element) return;
        const canvas = await html2canvas(element, { scale: 1.5, backgroundColor: '#000', useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Reporte_ACS_${event?.title}.pdf`);
        setExporting(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center space-y-4">
                <RefreshCw className="animate-spin text-exec-blue mx-auto" size={32} />
                <p className="text-[10px] font-black text-exec-blue uppercase tracking-[0.4em]">Sincronizando Inteligencia...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#0D0D0D] border border-red-500/20 p-8 text-center space-y-4">
                <AlertTriangle className="text-red-500 mx-auto" size={48} />
                <h2 className="text-white font-black uppercase tracking-widest">{error}</h2>
            </div>
        </div>
    );

    const attendanceRate = stats ? Math.round((stats.attended / stats.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-black text-gray-400 selection:bg-exec-blue/30 overflow-x-hidden font-sans">
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <div id="report-content" className="max-w-[1400px] mx-auto p-2 sm:p-6 md:p-8 space-y-6 relative">
                {/* Header Section: Compact & Executive */}
                <header className="flex flex-col lg:flex-row gap-5">
                    
                    {/* Left: Flyer - Target HTML Parity */}
                    <div className="w-full lg:w-[240px] shrink-0 flex flex-col border border-[#1a1a1a] bg-[#050505] p-1 h-auto self-start">
                        <div className="flex-1 flex justify-center items-center overflow-hidden bg-black">
                            {event?.cover_image_url ? (
                                <img 
                                    src={event.cover_image_url} 
                                    alt="Flyer Oficial" 
                                    className="w-full h-auto object-contain transition-transform duration-700 hover:scale-110" 
                                    style={{ aspectRatio: '4/5' }}
                                />
                            ) : (
                                <div className="w-full aspect-[4/5] flex items-center justify-center bg-[#050505]">
                                    <Award size={48} className="text-gray-800" />
                                </div>
                            )}
                        </div>
                        <div className="bg-black text-center py-3 mt-1.5 text-[9px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                            Flyer Oficial
                        </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 flex flex-col pt-1">
                        
                        {/* Top row: Logos and Timer - Compact */}
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                            
                            {/* Logo Row: Target Parity - Updated with Journal Logo */}
                             <div className="flex items-center gap-5 bg-[#050505] border border-[#1a1a1a] py-1.5 px-5 hover:border-blue-600/20 transition-all">
                                 {/* Logo 1: Colegio / Institucional (Sello) */}
                                 <div className="flex items-center justify-center">
                                     <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Seal" className="h-10 object-contain" />
                                 </div>
                                 <div className="w-px h-8 bg-[#151515]"></div>
                                 
                                 {/* Logo 2: Facultad */}
                                 <div className="flex items-center justify-center">
                                     <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" className="h-7 object-contain opacity-80" /> 
                                 </div>
                                 <div className="w-px h-8 bg-[#151515]"></div>
                                 
                                 {/* Logo 3: Revista ACS (Official Logo from Login) */}
                                 <div className="flex items-center">
                                     <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-10 w-auto object-contain" />
                                 </div>
                             </div>

                            {/* Countdown Timer */}
                            {timeLeft && (
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] hover:border-blue-600 transition-colors flex items-center px-5 py-2.5 gap-4">
                                    <div className="text-[7px] text-blue-600 font-bold tracking-[0.15em] uppercase text-right leading-tight">
                                        Falta para<br/>el evento
                                    </div>
                                    <Timer className="text-blue-600" size={14} />
                                    <div className="flex gap-3 text-center items-center">
                                        <div className="flex flex-col items-center">
                                            <div className="text-lg font-bold font-mono leading-none text-white">{String(timeLeft.days).padStart(2, '0')}</div>
                                            <div className="text-[7px] text-[#666666] tracking-widest mt-1 uppercase">Días</div>
                                        </div>
                                        <div className="text-lg font-bold text-[#666666] pb-2">:</div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-lg font-bold font-mono leading-none text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
                                            <div className="text-[7px] text-[#666666] tracking-widest mt-1 uppercase">Hrs</div>
                                        </div>
                                        <div className="text-lg font-bold text-[#666666] pb-2">:</div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-lg font-bold font-mono leading-none text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
                                            <div className="text-[7px] text-[#666666] tracking-widest mt-1 uppercase">Min</div>
                                        </div>
                                        <div className="text-lg font-bold text-[#666666] pb-2">:</div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-lg font-bold font-mono text-blue-600 leading-none">{String(timeLeft.seconds).padStart(2, '0')}</div>
                                            <div className="text-[7px] text-[#666666] tracking-widest mt-1 uppercase">Seg</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Status Badge - Floating Style */}
                            {/* Status Badge: Frame Version - No Vertical Bar */}
                            {['finalizado', 'completado', 'completed', 'finished', 'cerrado'].includes(event?.status?.toLowerCase() || '') && (
                                <div className="bg-[#0a0202] border border-[#1a0505] flex items-center justify-between px-5 py-2 min-w-[240px]">
                                    <div className="flex flex-col">
                                        <div className="text-[7px] text-red-600 font-bold tracking-[0.15em] uppercase leading-tight mb-0.5">
                                            Status
                                        </div>
                                        <div className="text-lg font-bold uppercase tracking-wide text-white">
                                            Evento Finalizado
                                        </div>
                                    </div>
                                    <div className="w-7 h-7 rounded-full bg-red-950/40 border border-red-900/30 flex items-center justify-center ml-4">
                                        <X className="text-red-500" size={10} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Title & Badges: HTML Reference Parity - Compact */}
                        <div className="space-y-3 mb-5">
                            <div className="flex items-center gap-3">
                                <span className="bg-[#050a14] text-blue-600 text-[7px] font-bold px-2 py-0.5 tracking-[0.15em] uppercase">
                                    Reporte de seguimiento en vivo
                                </span>
                                <span className="text-[8px] font-bold text-green-500 tracking-wider flex items-center gap-1.5 uppercase">
                                    <span className="w-1 h-1 bg-green-500 rounded-full"></span> Sincronizado
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-[34px] font-bold leading-[1.1] tracking-tight uppercase max-w-[95%] text-white">
                                {event?.title}
                                <span className="text-blue-600 ml-1">.</span>
                            </h1>
                            
                            <p className="text-[#555555] text-[10px] tracking-[0.2em] uppercase mt-4">
                                Analítica de impacto basada en normalización inteligente de datos.
                            </p>
                        </div>

                        {/* Access Card: Pure Blue/Black Parity - More Compact */}
                        {(event?.meeting_url || event?.location) && (
                            <div className="mt-4 bg-[#030305] border border-[#111111] p-3 flex items-center gap-4 max-w-[650px] group hover:border-blue-600/30 transition-all">
                                <div className="w-8 h-8 rounded-full border border-blue-600/20 bg-[#001122] flex items-center justify-center shrink-0">
                                    {event.is_online ? <Globe className="text-blue-600" size={16} /> : <MapPin className="text-blue-600" size={16} />}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <div className="text-[8px] text-blue-600 font-bold tracking-[0.15em] uppercase mb-1">
                                        {event.is_online ? 'Enlace de la reunión virtual' : 'Ubicación de la sede física'}
                                    </div>
                                    <div className="text-[13px] font-bold tracking-wide text-gray-200 truncate">
                                        {event.meeting_url || event.location}
                                    </div>
                                </div>
                                {event.meeting_url && (
                                    <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(event.meeting_url!);
                                            }}
                                            className="p-1.5 text-gray-700 hover:text-white transition-colors"
                                            title="Copiar"
                                        >
                                            <Copy size={12} />
                                        </button>
                                        <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:text-white transition-colors">
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bottom Actions Area with Dividing Line - Ultra Compact */}
                        <div className="mt-5 pt-5 border-t border-[#111111] flex items-center justify-between">
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleExcelExport} 
                                    className="bg-white hover:bg-gray-100 text-black text-[9px] font-bold py-3 px-6 uppercase tracking-widest transition-colors shadow-lg"
                                >
                                    Exportar Excel
                                </button>
                                <button 
                                    onClick={handlePDFExport} 
                                    className="bg-blue-600 text-white text-[9px] font-bold py-3 px-6 uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    Descargar PDF
                                </button>
                            </div>

                            <div className="text-right">
                                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-1">Fecha del Evento</p>
                                <p className="text-xl font-bold text-white uppercase tracking-tight">
                                    {event?.scheduled_date ? new Date(event.scheduled_date + 'T00:00:00').toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    }) : '---'}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* MAIN HORIZONTAL DIVIDER */}
                <hr className="border-[#1a1a1a] my-6" />

                {/* Command Center Banner */}
                {preEventPrediction && (
                    <div className="group bg-[#050505] border border-[#1a1a1a] p-3 flex flex-col md:flex-row justify-between items-center gap-4 mb-4 hover:border-blue-600/50 hover:shadow-[0_0_25px_rgba(0,136,255,0.08)] transition-all duration-500">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center">
                                <Rocket className="text-white" size={12} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-xs tracking-wider uppercase text-white">Centro de comando pre-evento</h2>
                                    <span className="bg-[#0a0a0a] text-white border border-[#1a1a1a] text-[7px] font-bold px-1.5 py-0.5 tracking-wider uppercase">IA PREDICTIVA</span>
                                </div>
                                <p className="text-[7px] text-[#555555] tracking-[0.15em] mt-1 uppercase">Gemini AI + Google Search Grounding</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[7px] font-bold text-[#22c55e] border border-[#1a1a1a] bg-[#0a0a0a] px-2 py-1 tracking-wider uppercase">Riesgo: Bajo</span>
                            <button onClick={fetchReport} className="w-6 h-6 bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-white hover:bg-[#1a1a1a] transition-colors">
                                <RefreshCw size={10} />
                            </button>
                            <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                                <ChevronDown size={10} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Metrics Grid (Compact Seamless Unit) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-[#050505] border border-[#1A1A1A] p-4 rounded-none relative overflow-hidden group hover:border-exec-blue/50 transition-all">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Inscritos</p>
                        <h4 className="text-2xl sm:text-3xl font-black text-white">{stats?.total}</h4>
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Users size={24} className="text-white" />
                        </div>
                    </div>
                    
                    <div className="bg-[#050505] border border-[#1A1A1A] p-4 rounded-none relative overflow-hidden group hover:border-exec-blue/50 transition-all">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Asistentes</p>
                        <h4 className="text-2xl sm:text-3xl font-black text-white">{stats?.attended}</h4>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">{attendanceRate}% <span className="hidden sm:inline">Ratio de Impacto</span></p>
                    </div>

                    <div className="bg-[#050505] border border-[#1A1A1A] p-4 rounded-none relative overflow-hidden group hover:border-exec-blue/50 transition-all">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Recaudación</p>
                        <h4 className="text-xl sm:text-2xl font-black text-white">S/ {(stats?.totalRevenue || 0).toFixed(2)}</h4>
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">{stats?.paidCount} Pagos validados</p>
                    </div>

                    <div className="bg-[#050505] border border-[#1A1A1A] p-4 rounded-none relative overflow-hidden group hover:border-exec-blue/50 transition-all">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Impacto IA</p>
                        <h4 className="text-xl sm:text-2xl font-black text-white">Sinergia Activa</h4>
                        <p className="text-[9px] font-bold text-exec-blue uppercase tracking-widest mt-1 underline decoration-exec-blue/30 underline-offset-4">Mercury v4.2</p>
                    </div>
                </div>

                {/* Section 3: Registro en Tiempo Real (MOVED UP) */}
                <section className="bg-[#050505] border border-[#1a1a1a] p-5 min-h-[140px]">
                    <h2 className="text-[9px] text-[#555555] font-bold tracking-[0.2em] uppercase mb-3 text-center">Registro en tiempo real</h2>
                    <hr className="border-[#151515] mb-5" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {participants.slice(0, 30).map((p, i) => (
                            <div key={p.id} className="bg-[#050505] border border-[#1A1A1A] p-3 flex items-center justify-between group hover:border-blue-600 hover:shadow-[0_0_15px_rgba(0,136,255,0.05)] transition-all duration-500 cursor-default">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border border-blue-600/30 flex items-center justify-center text-[10px] font-black text-blue-500 group-hover:bg-blue-600 group-hover:text-black transition-all">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-white uppercase truncate">{p.full_name}</p>
                                            {(p.payment_status === 'paid' || p.payment_status === 'completed') && (
                                                <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-500 px-1 border border-emerald-500/20 uppercase">
                                                    PAGADO: S/ {Number(p.payment_amount || 0).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{getResolvedCategory(p, event?.pricing_options, event?.certificate_type) || 'General'}</p>
                                    </div>
                                </div>
                                <span className="text-[8px] text-gray-700 font-bold uppercase">{new Date(p.registered_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 4: Rendición de Cuentas */}
                <section className="bg-[#0a0a0a] border border-[#111] overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#111] flex items-center justify-between">
                         <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-[#050505] border border-[#1a1a1a] flex items-center justify-center">
                                 <CreditCard size={18} className="text-blue-500" />
                             </div>
                             <div>
                                 <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Rendición de Cuentas</h3>
                                 <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">Desglose de ingresos por categoría</p>
                             </div>
                         </div>
                         <div className="text-right">
                             <p className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.2em] mb-1">Total Recaudado</p>
                             <p className="text-xl font-black text-blue-500 tracking-tighter">S/ {stats?.totalRevenue.toFixed(2)}</p>
                         </div>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(stats?.byCategory || {}).map(([cat, inscribedCount]) => {
                            const revenue = participants
                                .filter(p => getResolvedCategory(p, event?.pricing_options, event?.certificate_type) === cat && (p.payment_status === 'paid' || p.payment_status === 'completed'))
                                .reduce((acc, curr) => acc + (Number(curr.payment_amount) || 0), 0);
                            
                            return (
                                <div key={cat} className="group p-5 border border-[#1a1a1a] bg-[#050505] relative overflow-hidden transition-all duration-500 hover:border-blue-600/30">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{cat}</p>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600/20 group-hover:bg-blue-600 transition-colors" />
                                    </div>
                                    
                                    <h4 className="text-2xl font-black text-white tracking-tight mb-1">S/ {revenue.toFixed(2)}</h4>
                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-4">{inscribedCount} Inscritos</p>
                                    
                                    <div className="flex items-center gap-2 pt-4 border-t border-[#111]">
                                        <div className="flex gap-0.5">
                                            {[1,2,3].map(i => <div key={i} className="w-3 h-[2px] bg-emerald-500/30" />)}
                                            <div className="w-5 h-[2px] bg-emerald-500" />
                                        </div>
                                        <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">~ 100% PAGADO</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-[#050505] px-6 py-4 border-t border-[#111] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CreditCard size={14} className="text-gray-500" />
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Estado Financiero del Evento</span>
                        </div>
                        <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.15em]">
                            {stats?.paidCount} Pagos confirmados de {participants.length} Inscritos
                        </div>
                    </div>
                </section>

                {/* Charts Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {/* 1. Tendencia de Inscripciones (Full Width) */}
                    <div className="bg-[#0D0D0D] border border-[#262626] p-6 md:col-span-2 lg:col-span-3 hover:border-exec-blue/20 transition-all duration-700">
                         <div className="flex items-center gap-3 mb-6">
                             <div className="w-1 h-4 bg-emerald-500" />
                             <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Tendencia de Inscripciones</h4>
                         </div>
                         <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.timeline}>
                                    <defs>
                                        <linearGradient id="colorCountTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                    <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #262626', borderRadius: '0', fontSize: '10px' }} />
                                    <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCountTrend)" />
                                </AreaChart>
                            </ResponsiveContainer>
                         </div>
                    </div>

                    {/* 2. Distribución por Sexo */}
                    <div className="bg-[#050505] border border-[#1A1A1A] p-6 flex flex-col">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6">Distribución por Sexo</h4>
                        <div className="flex-1 min-h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={Object.entries(stats?.bySex || {}).map(([name, value]) => ({ name: name.toUpperCase(), value }))} 
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none"
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {Object.entries(stats?.bySex || {}).map(([name], i) => {
                                            const normalizedName = name.toUpperCase();
                                            let color = STITCH_COLORS[i % STITCH_COLORS.length];
                                            if (normalizedName.includes('FEMENINO')) color = '#EC4899'; // Pink
                                            else if (normalizedName.includes('MASCULINO')) color = '#0088FF'; // Blue
                                            return <Cell key={i} fill={color} />;
                                        })}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #1A1A1A', borderRadius: '0' }} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        formatter={(value, entry: any) => {
                                            const val = entry.payload.value;
                                            return <span className="text-[10px] text-white font-black uppercase">{value} ({val})</span>;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Categorías */}
                    <div className="bg-[#050505] border border-[#1A1A1A] p-6 flex flex-col">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6">Categorías</h4>
                        <div className="flex-1 min-h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={Object.entries(stats?.byCategory || {}).map(([name, value]) => ({ name: name.toUpperCase(), value }))} 
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none"
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {Object.keys(stats?.byCategory || {}).map((_ , i) => <Cell key={i} fill={STITCH_COLORS[i % STITCH_COLORS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #1A1A1A', borderRadius: '0' }} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        formatter={(value, entry: any) => <span className="text-[10px] text-white font-black uppercase text-center">{value} ({entry.payload.value})</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Top Carreras */}
                    <div className="bg-[#050505] border border-[#1A1A1A] p-6 flex flex-col">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6">Top Carreras</h4>
                        <div className="flex-1 min-h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={Object.entries(stats?.byCareer || {}).sort((a,b) => (b[1] as number)-(a[1] as number)).slice(0, 6).map(([name, value]) => ({ name: name.toUpperCase(), value }))} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} stroke="#555" fontSize={8} tickLine={false} axisLine={false} />
                                    <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={14}>
                                        {Object.keys(stats?.byCareer || {}).map((_, i) => <Cell key={i} fill={STITCH_COLORS[i % STITCH_COLORS.length]} />)}
                                        <LabelList dataKey="value" position="right" fill="#fff" fontSize={10} fontWeight="900" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 5. Edades */}
                    <div className="bg-[#050505] border border-[#1A1A1A] p-6 flex flex-col">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6">Distribución por Edades</h4>
                        <div className="flex-1 min-h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={Object.entries(stats?.byAge || {}).sort((a,b) => (b[1] as number)-(a[1] as number)).slice(0, 10).map(([name, value]) => ({ name, value }))}>
                                    <XAxis dataKey="name" stroke="#444" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis hide />
                                    <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={18}>
                                        {Object.keys(stats?.byAge || {}).map((_, i) => <Cell key={i} fill={STITCH_COLORS[i % STITCH_COLORS.length]} />)}
                                        <LabelList dataKey="value" position="top" fill="#fff" fontSize={10} fontWeight="900" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </section>

                {/* Smart Analysis Charts (Google Forms Style + AI Semantic) */}
                {(stats?.customCharts?.length || 0) + (stats?.smartTextCharts?.length || 0) > 0 && (
                    <section className="mt-8">
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Análisis Dinámico de Formulario</h2>
                            <div className="flex-1 h-px bg-gradient-to-r from-[#1A1A1A] to-transparent" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Render Custom Charts (Select/Radio) */}
                            {stats?.customCharts?.map((chart, idx) => (
                                <div key={`custom-${idx}`} className="bg-[#0D0D0D] border border-[#262626] p-6 flex flex-col hover:border-exec-blue/30 transition-all duration-500">
                                    <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-6 line-clamp-1">{chart.label}</h4>
                                    <div className="flex-1 min-h-[240px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie 
                                                    data={Object.entries(chart.data).map(([name, value]) => ({ name, value }))} 
                                                    cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none"
                                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false}
                                                >
                                                    {Object.entries(chart.data).map(([name], index) => {
                                                        const normalizedName = name.toUpperCase();
                                                        let color = STITCH_COLORS[(index + idx * 2) % STITCH_COLORS.length];
                                                        if (normalizedName.includes('FEMENINO')) color = '#EC4899'; // Pink
                                                        else if (normalizedName.includes('MASCULINO')) color = '#0088FF'; // Blue
                                                        return <Cell key={`pie-${index}`} fill={color} />;
                                                    })}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #262626', borderRadius: '0' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1.5 mt-4">
                                        {Object.entries(chart.data).slice(0, 4).map(([name, value], i) => (
                                            <div key={i} className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="shrink-0 w-2 h-2" style={{ backgroundColor: STITCH_COLORS[(i + idx * 2) % STITCH_COLORS.length] }} />
                                                <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px]">{name} ({value})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Render Smart Text Charts (City, etc.) */}
                            {stats?.smartTextCharts?.map((chart, idx) => (
                                <div key={`smart-${idx}`} className="bg-[#0D0D0D] border border-[#262626] p-6 flex flex-col hover:border-exec-blue/30 transition-all duration-500 relative">
                                    <div className="absolute top-4 right-4">
                                        <Sparkles size={12} className="text-exec-blue animate-pulse" />
                                    </div>
                                    <h4 className="text-[11px] font-black text-exec-blue uppercase tracking-widest mb-1">{chart.label}</h4>
                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-6">Filtrado Inteligente semántico</p>
                                    
                                    <div className="flex-1 min-h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={Object.entries(chart.data).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 8).map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ left: 0, right: 60 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={90} stroke="#888" fontSize={9} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #262626', borderRadius: '0' }} />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                                    <LabelList dataKey="value" position="right" fill="#fff" fontSize={11} fontWeight="900" offset={10} />
                                                    {Object.keys(chart.data).map((_, i) => <Cell key={`bar-${i}`} fill={STITCH_COLORS[(i + idx + 5) % STITCH_COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Detailed User Responses: Quoted Blue Style */}
                <section className="mt-12">
                    <div className="flex items-center gap-4 mb-8 px-4 border-l-4 border-blue-600">
                        <PenLine size={24} className="text-blue-600" />
                        <div>
                             <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Respuestas Detalladas por Usuario</h3>
                             <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1">Base de datos de retroalimentación directa</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5 bg-[#111] border border-[#111]">
                        {stats?.freeTextResponses?.map((usr, i) => (
                            <div key={i} className="bg-[#050505] p-8 space-y-6 group hover:bg-[#080808] transition-colors">
                                <div className="flex justify-between items-start border-b border-[#1A1A1A] pb-4">
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{usr.name}</h4>
                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">{usr.payment?.category || 'PARTICIPANTE GENERAL'}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[8px] font-bold text-gray-800 mb-2 uppercase">{usr.date}</p>
                                        {usr.payment?.status === 'paid' || usr.payment?.status === 'completed' ? (
                                            <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 border border-emerald-500/20 uppercase tracking-tighter shadow-[0_0_10px_rgba(16,185,129,0.05)]">PAGADO</span>
                                        ) : (
                                            <span className="text-[8px] font-black bg-gray-500/5 text-gray-800 px-2 py-1 border border-gray-500/10 uppercase tracking-widest">PENDIENTE</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {usr.answers.map((ans, j) => (
                                        <div key={j} className="space-y-1.5 border-l border-blue-900/30 pl-4">
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">{ans.label}</p>
                                            <p className="text-[11px] text-gray-300 font-bold leading-relaxed italic group-hover:text-blue-400 transition-colors">
                                                "{ans.value}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final Section: Análisis Inteligente (MOVED TO BOTTOM) */}
                {aiSummary && (
                    <section className="space-y-6 mt-12 bg-[#050505] border border-[#1a1a1a] p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] rounded-full -mr-16 -mt-16" />
                        
                        <div className="flex items-center justify-between border-b border-[#111] pb-6 mb-8">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-blue-600/10 text-blue-500 border border-blue-600/20">
                                    <Sparkles size={28} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-[0.3em]">Análisis Smart IA</h3>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Síntesis ejecutiva mediante Gemini Pro 1.5</p>
                                </div>
                            </div>
                            <button onClick={fetchReport} className="flex items-center gap-2 px-6 py-2.5 bg-[#0a0a0a] border border-[#1a1a1a] text-gray-500 text-[9px] font-black uppercase hover:text-white hover:border-blue-600 transition-all">
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" /> Refrescar Neuronas
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group bg-[#080808] border border-[#1A1A1A] p-8 space-y-6 hover:border-blue-600/30 transition-all duration-500 relative">
                                <div className="flex items-center gap-3 text-blue-500">
                                    <PenLine size={20} />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Resumen Ejecutivo</h4>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-blue-600/40 pl-6 py-2">
                                    {aiSummary.executive_summary}
                                </p>
                            </div>
                            <div className="group bg-[#080808] border border-[#1A1A1A] p-8 space-y-6 hover:border-blue-600/30 transition-all duration-500">
                                <div className="flex items-center gap-3 text-gray-500">
                                    <Users size={20} />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Perfil de Audiencia</h4>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                                    {aiSummary.audience_analysis}
                                </p>
                            </div>
                            <div className="group bg-[#080808] border border-[#1A1A1A] p-8 space-y-6 hover:border-emerald-500/30 transition-all duration-500">
                                <div className="flex items-center gap-3 text-emerald-500">
                                    <CheckCircle2 size={20} />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Dinámica de Asistencia</h4>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    {aiSummary.attendance_analysis}
                                </p>
                            </div>
                            <div className="group bg-[#080808] border border-[#1A1A1A] p-8 space-y-6 hover:border-white/30 transition-all duration-500">
                                <div className="flex items-center gap-3 text-white">
                                    <Zap size={20} />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Sugerencias Predictivas</h4>
                                </div>
                                <div className="space-y-4">
                                    {aiSummary.proposals?.slice(0, 3).map((p: string, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 bg-white/[0.02] border border-white/5 items-start group-hover:border-white/10 transition-colors">
                                            <div className="w-6 h-6 shrink-0 flex items-center justify-center bg-white text-black text-[11px] font-black shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                                {i + 1}
                                            </div>
                                            <p className="text-[13px] text-gray-300 leading-snug">{p}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}


                <footer className="py-16 border-t border-[#1A1A1A] flex flex-col items-center gap-8 opacity-40">
                    <div className="w-16 h-16 bg-white/5 flex items-center justify-center grayscale">
                        <img src="/logo.png" alt="ACS" className="w-8 opacity-20" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-[0.6em]">SGR-ACS ENTERPRISE</p>
                        <p className="text-[10px] font-bold text-gray-800 uppercase tracking-widest mt-2">© 2026 REVISTA ACS CAJAMARCA.</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};
