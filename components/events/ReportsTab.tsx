import React, { useState, useEffect } from 'react';
import {
    Download, Users, UserCheck, Globe, PenLine, X,
    BarChart2, Loader2, RefreshCw, TrendingUp, Share2, Link, Copy, Check, Clock, DollarSign, Sparkles, ArrowLeft,
    BarChart3, LayoutGrid, Timer, Zap, AlertTriangle, CheckCircle2, Target, ShieldAlert, Lightbulb, Gamepad2, History, UserPlus, Megaphone, Rocket, ChevronDown, ChevronUp, FileText, Mail, CreditCard, Wallet
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { generateProfessionalDocx } from '../../lib/docxGenerator';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    AreaChart, Area, CartesianGrid, XAxis, YAxis, BarChart, Bar, LabelList
} from 'recharts';
import * as Gemini from '../../lib/ai';
import * as Mercury from '../../lib/mercury';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';

interface ReportsTabProps {
    eventId: string;
    eventTitle: string;
}

interface ParticipantData {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    institution: string | null;
    category: string;
    sex: string | null;
    career: string | null;
    university: string | null;
    academic_degree: string | null;
    dni: string | null;
    age: any;
    extra_data: Record<string, any> | null;
    registration_source: string;
    registered_at: string | null;
    attended: boolean;
    payment_status: string | null;
    payment_amount?: number;
    payment_receipt_url?: string | null;
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
    timeline: Array<{ date: string, count: number }>;
    customCharts?: Array<{ label: string; data: Record<string, number> }>;
    smartTextCharts?: Array<{ label: string; data: Record<string, number>; total: number }>;
    freeTextResponses?: Array<{ name: string; date: string; answers: Array<{ label: string; value: string }>; payment?: { status: string; amount: number; category: string } }>;
    revenueByCategory?: Record<string, { count: number; revenue: number }>;
}

// --- Constants ---
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

// --- Helper Components ---
function StatBar({ label, value, total, color }: { label: string; value: number; total?: number; color: string; key?: string | number }) {
    const safeTotal = Number(total) ?? 1;
    const pct = safeTotal > 0 ? Math.round((value / safeTotal) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-32 truncate shrink-0">{label}</span>
            <div className="flex-1 bg-gray-800/50 rounded-none h-1.5">
                <div
                    className={`h-1.5 rounded-none transition-all duration-700 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[10px] text-white font-mono w-8 text-right">{value}</span>
            <span className="text-[10px] text-gray-600 w-8 text-right">{pct}%</span>
        </div>
    );
}

const ChartLegend = ({ items }: { items: Array<{ name: string; color: string; value?: number; total?: number }> }) => (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1.5 mt-4 px-2">
        {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0 w-2 h-2 rounded-none" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight truncate max-w-[120px]">
                    {item.name}
                    {item.value !== undefined ? ` (${item.value})` : ''}
                </span>
            </div>
        ))}
    </div>
);

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#111] border border-[#262626] p-3 rounded-none shadow-2xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{payload[0].name}</p>
                <p className="text-xl font-light text-white">{payload[0].value} <span className="text-[10px] text-gray-500 font-bold uppercase">Participantes</span></p>
            </div>
        );
    }
    return null;
};

export function ReportsTab({ eventId, eventTitle }: ReportsTabProps) {
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const [participants, setParticipants] = useState<ParticipantData[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [reportSlug, setReportSlug] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [registrationForm, setRegistrationForm] = useState<any[]>([]);
    const [sharingModalOpen, setSharingModalOpen] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [aiSummary, setAiSummary] = useState<any>(null);
    const [eventDate, setEventDate] = useState<string>('');
    const [eventStatus, setEventStatus] = useState<string>('');
    const [maxCapacity, setMaxCapacity] = useState<number | null>(null);
    const [preEventPrediction, setPreEventPrediction] = useState<any>(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    
    // Estados para configuración de certificado y modalidad de evento
    const [certificateType, setCertificateType] = useState<'none' | 'free' | 'paid' | null>('none');
    const [certificatePrice, setCertificatePrice] = useState<number>(0);
    const [pricingOptions, setPricingOptions] = useState<any[]>([]);
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [location, setLocation] = useState<string>('');
    const [meetingLink, setMeetingLink] = useState<string>('');

    // Estados para el Modal de Progreso de Reportes
    const [generatingReport, setGeneratingReport] = useState(false);
    const [reportStep, setReportStep] = useState('');
    const [reportCurrentStepIndex, setReportCurrentStepIndex] = useState(0);
    const [reportTotalSteps, setReportTotalSteps] = useState(6);
    const [reportElapsedSeconds, setReportElapsedSeconds] = useState(0);
    const [reportCompleted, setReportCompleted] = useState(false);
    const [reportBlob, setReportBlob] = useState<Blob | null>(null);
    const [reportFileName, setReportFileName] = useState('');
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportFormatLabel, setReportFormatLabel] = useState('');

    function formatTime(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }

    const handleDownloadReportFile = () => {
        if (!reportBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(reportBlob);
        link.download = reportFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        showToast({
            type: 'success',
            title: 'DESCARGA INICIADA',
            message: 'El archivo se ha descargado en tu dispositivo.'
        });
    };

    useEffect(() => {
        let interval: any;
        if (generatingReport && !reportCompleted) {
            const startTime = Date.now();
            interval = setInterval(() => {
                setReportElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [generatingReport, reportCompleted]);

    useEffect(() => {
        loadData();
    }, [eventId]);

    async function loadData() {
        setLoading(true);
        try {
            const { data: participantsData, error: partError } = await supabase
                .from('event_participants')
                .select('*')
                .eq('event_id', eventId)
                .order('registered_at', { ascending: false });

            if (partError) throw partError;
            const list = (participantsData || []) as ParticipantData[];
            setParticipants(list);

            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('report_slug, registration_form, scheduled_date, ai_summary, is_report_public, status, max_capacity, certificate_type, certificate_price, pricing_options, is_online, location, meeting_link')
                .eq('id', eventId)
                .single();

            if (!eventError && eventData) {
                setReportSlug(eventData.report_slug);
                setEventDate(eventData.scheduled_date || '');
                setEventStatus(eventData.status || '');
                setMaxCapacity(eventData.max_capacity);
                setRegistrationForm(eventData.registration_form || []);
                
                // Cargar configuraciones de certificado y modalidad
                setCertificateType(eventData.certificate_type || 'none');
                setCertificatePrice(Number(eventData.certificate_price || 0));
                setPricingOptions(eventData.pricing_options || []);
                setIsOnline(Boolean(eventData.is_online));
                setLocation(eventData.location || '');
                setMeetingLink(eventData.meeting_link || '');
                
                if (eventData.ai_summary) {
                    setAiSummary(eventData.ai_summary);
                }

                // Initial stats computation
                const initialStats = computeStats(
                    list, 
                    eventData.registration_form || [], 
                    eventData.pricing_options || [], 
                    eventData.certificate_type || 'none'
                );
                setStats(initialStats);

                // Auto-run AI predictions for planned/active events
                const evStatus = (eventData.status || '').toLowerCase();
                if (['planned', 'active', 'upcoming', 'planificado', 'activo'].includes(evStatus)) {
                    loadPredictions(list, eventData.scheduled_date || '', eventData.max_capacity);
                }

                // AI Smart Charts background processing
                if ((initialStats as any).loadSmartCharts) {
                    (initialStats as any).loadSmartCharts().then((result: any) => {
                        if (result) {
                            setStats(prev => {
                                if (!prev) return null;
                                return {
                                    ...prev,
                                    smartTextCharts: result.smartTextCharts || [],
                                    byCareer: result.aiCareerStats || prev.byCareer
                                };
                            });
                        }
                    });
                }
            } else {
                setStats(computeStats(list));
            }
        } catch (e) {
            console.error('Error loading reports:', e);
        } finally {
            setLoading(false);
        }
    }

    async function loadPredictions(participantList: any[], scheduledDate: string, cap?: number) {
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
                eventTitle,
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
    }

    function getPaymentStatusLabel(status: string | null | undefined): string {
        if (!status) return 'NO SOLICITADO';
        const s = status.toLowerCase();
        if (s === 'paid' || s === 'completed') return 'PAGADO';
        if (s === 'exempt') return 'EXONERADO';
        if (s === 'pending' || s === 'requested' || s === 'waiting') return 'PENDIENTE';
        return status.toUpperCase();
    }

    function getResolvedCategory(
        p: ParticipantData,
        pricingOpts: any[],
        certType: 'none' | 'free' | 'paid' | null
    ): string {
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
    }

    function computeStats(
        list: ParticipantData[], 
        formSchema?: any[], 
        currentPricingOpts: any[] = pricingOptions, 
        currentCertType: 'none' | 'free' | 'paid' | null = certificateType
    ): Stats {
        const bySource: Record<string, number> = {};
        const bySex: Record<string, number> = {};
        const byCareer: Record<string, number> = {};
        const byDegree: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        const byAge: Record<string, number> = {};
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

            if (p.academic_degree) {
                byDegree[p.academic_degree] = (byDegree[p.academic_degree] || 0) + 1;
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
            const dates = list.filter(p => p.registered_at).map(p => new Date(p.registered_at!));
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
            .sort((a, b) => a[1].rawDate.localeCompare(b[1].rawDate))
            .map(([date, data]) => ({ date, count: data.count }));

        if (formSchema) {
            // Basic custom charts from selectors
            for (const field of formSchema.filter(f => (f.type === 'select' || f.type === 'radio') && !['full_name', 'category', 'career', 'age', 'sex'].includes(f.id))) {
                const map: Record<string, number> = {};
                list.forEach(p => {
                    const val = p.extra_data?.[field.id] || p.extra_data?.[field.label];
                    if (val) {
                        const s = String(val).trim();
                        map[s] = (map[s] || 0) + 1;
                    }
                });
                if (Object.keys(map).length > 0) customCharts.push({ label: field.label, data: map });
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

        const loadSmartCharts = async () => {
             try {
                const { generateMercurySmartChartCategories } = await import('../../lib/mercury');
                const rawCareers = list.map(p => p.career).filter(c => c && String(c).trim() !== '').map(String);
                const aiResult: any = { smartTextCharts: [] };
                
                if (rawCareers.length >= 2) {
                    const smartCareerData = await generateMercurySmartChartCategories('Top Carreras Profesionales', rawCareers);
                    if (smartCareerData) aiResult.aiCareerStats = smartCareerData;
                }

                for (const basic of smartTextCharts) {
                    const rawValues: string[] = [];
                    Object.entries(basic.data).forEach(([val, count]) => {
                        for (let i = 0; i < (count as number); i++) rawValues.push(val);
                    });
                    const smartData = await generateMercurySmartChartCategories(basic.label, rawValues);
                    aiResult.smartTextCharts.push({ label: basic.label, data: smartData || basic.data, total: rawValues.length });
                }
                return aiResult;
             } catch (e) {
                console.error("Smart charts error:", e);
                return null;
             }
        };

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
            timeline,
            customCharts,
            smartTextCharts: [],
            freeTextResponses,
            revenueByCategory,
            loadSmartCharts
        } as any;
    }

    async function handlePDFExport() {
        setGeneratingReport(true);
        setReportCompleted(false);
        setReportError(null);
        setReportBlob(null);
        setReportFileName(`Reporte_Impacto_${eventTitle.replace(/ /g, '_')}.pdf`);
        setReportFormatLabel('CAPTURA DE PANTALLA PDF');
        setReportTotalSteps(4);
        setReportElapsedSeconds(0);

        const element = document.getElementById('internal-report-content');
        if (!element) {
            setReportError('No se encontró el elemento HTML de contenido.');
            setGeneratingReport(false);
            return;
        }
        
        const originalScroll = window.scrollY;
        
        try {
            setReportCurrentStepIndex(1);
            setReportStep('Preparando captura de pantalla...');
            window.scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 1200)); 

            setReportCurrentStepIndex(2);
            setReportStep('Procesando gráficos y renderizando lienzo...');
            
            const totalWidth = element.scrollWidth;
            const totalHeight = element.scrollHeight;
            const TARGET_WIDTH_PX = 1400;
            const ptWidth = TARGET_WIDTH_PX * 0.75; 
            
            const MAX_PDF_HEIGHT_PT = 14000;
            const USE_CHUNKS = totalHeight > 12000;
            let pdf: any = null;

            if (!USE_CHUNKS) {
                const canvas = await html2canvas(element, {
                    scale: 1.6,
                    backgroundColor: '#000',
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                    windowWidth: TARGET_WIDTH_PX,
                    onclone: (clonedDoc) => {
                        const style = clonedDoc.createElement('style');
                        style.innerHTML = `
                            * { 
                                -webkit-font-smoothing: antialiased;
                                -moz-osx-font-smoothing: grayscale;
                            }
                            p, h1, h2, h3, h4, span, div, li, strong { 
                                line-height: 1.4 !important; 
                                overflow: visible !important; 
                                min-height: auto !important; 
                                height: auto !important;
                                vertical-align: baseline !important;
                                display: inline-block !important; 
                                width: 100%;
                            }
                            .truncate {
                                white-space: normal !important;
                                overflow: visible !important;
                                text-overflow: clip !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);

                        clonedDoc.body.setAttribute('style', `width: ${TARGET_WIDTH_PX}px !important; overflow: visible !important;`);
                        const clonedElement = clonedDoc.getElementById('internal-report-content');
                        if (clonedElement) {
                            clonedElement.setAttribute('style', `width: ${TARGET_WIDTH_PX}px !important; background: black !important; color: white !important;`);

                            const headerGrid = clonedElement.querySelector('.grid-cols-1');
                            if (headerGrid) {
                                headerGrid.setAttribute('style', 'display: grid !important; grid-template-columns: 280px 1fr !important; gap: 24px !important; width: 100% !important;');
                            }

                            const imgs = clonedElement.querySelectorAll('img');
                            imgs.forEach((img: any) => {
                                if (img.src.includes('logo-') || img.src.includes('R.png')) {
                                    img.setAttribute('style', 'height: 32px !important; min-height: 32px !important; max-height: 32px !important; width: auto !important; display: block !important; object-fit: contain !important; margin: 0 !important;');
                                }
                            });
                        }
                    }
                });

                setReportCurrentStepIndex(3);
                setReportStep('Alineando dimensiones y exportando páginas...');
                const ptHeight = canvas.height * (ptWidth / canvas.width);
                pdf = new jsPDF('p', 'pt', [ptWidth, ptHeight]);
                pdf.setFillColor(0, 0, 0);
                pdf.rect(0, 0, ptWidth, ptHeight, 'F');

                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                pdf.addImage(imgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
            } else {
                setReportCurrentStepIndex(2);
                setReportStep('Procesando bloques de datos en paralelo...');
                const chunkHeightPx = 6000;
                let renderedHeightPx = 0;
                let pageCount = 0;
                const estimatedPtHeight = totalHeight * 0.75;
                const isTooLong = estimatedPtHeight > MAX_PDF_HEIGHT_PT;
                
                pdf = new jsPDF('p', 'pt', isTooLong ? 'a4' : [ptWidth, estimatedPtHeight]);

                while (renderedHeightPx < totalHeight) {
                    const currentChunkHeight = Math.min(chunkHeightPx, totalHeight - renderedHeightPx);
                    
                    const canvas = await html2canvas(element, {
                        scale: 1.5,
                        backgroundColor: '#000',
                        useCORS: true,
                        y: renderedHeightPx,
                        height: currentChunkHeight,
                        windowHeight: totalHeight,
                        windowWidth: TARGET_WIDTH_PX,
                        onclone: (clonedDoc) => {
                            const style = clonedDoc.createElement('style');
                            style.innerHTML = `
                                p, h1, h2, h3, h4, span, div, li, strong { 
                                    line-height: 1.4 !important; 
                                    overflow: visible !important; 
                                    min-height: auto !important; 
                                    height: auto !important;
                                }
                                .truncate {
                                    white-space: normal !important;
                                    overflow: visible !important;
                                }
                            `;
                            clonedDoc.head.appendChild(style);
                            clonedDoc.body.style.width = TARGET_WIDTH_PX + 'px';
                            const clonedElement = clonedDoc.getElementById('internal-report-content');
                            if (clonedElement) {
                                clonedElement.setAttribute('style', `width: ${TARGET_WIDTH_PX}px !important; background: black !important;`);
                                const imgs = clonedElement.querySelectorAll('img');
                                imgs.forEach((img: any) => {
                                    if (img.src.includes('logo-') || img.src.includes('R.png')) {
                                        img.setAttribute('style', 'height: 32px !important; max-height: 32px !important; width: auto !important; object-fit: contain !important;');
                                    }
                                });
                            }
                        }
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.9);
                    const chunkPtHeight = currentChunkHeight * (ptWidth / TARGET_WIDTH_PX);

                    if (isTooLong) {
                        const pWidth = pdf.internal.pageSize.getWidth();
                        if (pageCount > 0) pdf.addPage();
                        pdf.setFillColor(0, 0, 0);
                        pdf.rect(0, 0, pWidth, 842, 'F');
                        pdf.addImage(imgData, 'JPEG', 0, 0, pWidth, (currentChunkHeight * pWidth) / TARGET_WIDTH_PX, undefined, 'FAST');
                    } else {
                        pdf.addImage(imgData, 'JPEG', 0, renderedHeightPx * (ptWidth / TARGET_WIDTH_PX), ptWidth, chunkPtHeight, undefined, 'FAST');
                    }

                    renderedHeightPx += currentChunkHeight;
                    pageCount++;
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            setReportCurrentStepIndex(4);
            setReportStep('Finalizando captura y compilando PDF...');
            await new Promise(r => setTimeout(r, 600));

            if (pdf) {
                const pdfBlob = pdf.output('blob');
                setReportBlob(pdfBlob);
                setReportCompleted(true);
                setReportStep('¡Captura PDF generada exitosamente!');
                
                showToast({ type: 'success', title: 'PDF GENERADO', message: 'El PDF de la captura está listo para descargar.' });
            } else {
                throw new Error('No se pudo inicializar el PDF.');
            }
        } catch (e: any) {
            console.error('PDF Export error:', e);
            setReportError(e.message || 'Error desconocido');
            showToast({
                type: 'error',
                title: 'EXPORT_FAILED',
                message: 'Error al generar el PDF de captura.'
            });
        } finally {
            window.scrollTo(0, originalScroll);
        }
    }

    async function handleExcelExport() {
        if (participants.length === 0) return;
        setExporting(true);
        try {
            const rows = participants.map((p, i) => {
                const base: Record<string, any> = {
                    '#': i + 1,
                    'Nombre completo': p.full_name,
                    'DNI': p.dni || '',
                    'Edad': p.age || '',
                    'Email': p.email || '',
                    'Teléfono': p.phone || '',
                    'Institución': p.institution || p.university || '',
                    'Carrera': p.career || '',
                    'Grado Académico': p.academic_degree || '',
                    'Sexo': p.sex || '',
                    'Categoría': getResolvedCategory(p, pricingOptions, certificateType) || '',
                    'Origen': p.registration_source === 'public_form' ? 'Formulario público' : 'Manual',
                    'Asistencia': p.attended ? 'Sí' : 'No',
                    'Pago': p.payment_status === 'paid' || p.payment_status === 'completed' ? 'Pagado' : p.payment_status === 'exempt' ? 'Exonerado' : (p.payment_status === 'pending' || p.payment_status === 'requested' || p.payment_status === 'waiting') ? 'Pendiente' : 'No solicitado',
                    'Monto': p.payment_amount || 0,
                    'Fecha de registro': p.registered_at ? new Date(p.registered_at).toLocaleString('es-PE') : '',
                };
                if (p.extra_data) {
                    for (const [key, val] of Object.entries(p.extra_data)) {
                        let displayKey = key;
                        const fieldDef = registrationForm.find(f => f.id === key);
                        if (fieldDef) displayKey = fieldDef.label;
                        base[displayKey] = Array.isArray(val) ? val.join(', ') : String(val ?? '');
                    }
                }
                return base;
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
            
            if (stats) {
                const statsRows: any[] = [
                    { 'Indicador': 'Total inscritos', 'Valor': stats.total },
                    { 'Indicador': 'Asistentes', 'Valor': stats.attended },
                    { 'Indicador': 'Recaudación Total', 'Valor': `S/ ${stats.totalRevenue.toFixed(2)}` },
                    { 'Indicador': '', 'Valor': '' },
                    { 'Indicador': '--- Por Sexo ---', 'Valor': '' },
                    ...Object.entries(stats.bySex).map(([k, v]) => ({ 'Indicador': k, 'Valor': v })),
                    { 'Indicador': '', 'Valor': '' },
                    { 'Indicador': '--- Por Carrera ---', 'Valor': '' },
                    ...Object.entries(stats.byCareer).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 15).map(([k,v]) => ({ 'Indicador': k, 'Valor': v })),
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), 'Estadísticas');
            }
            XLSX.writeFile(wb, `Reporte_ACS_${eventTitle.replace(/ /g, '_')}.xlsx`);
        } catch (e) {
            console.error('Excel Export error:', e);
        } finally {
            setExporting(false);
        }
    }

    async function fetchImageAsBase64(url: string): Promise<string | null> {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error('Error fetching image:', err);
            return null;
        }
    }

    function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => {
                resolve({ width: 300, height: 300 });
            };
        });
    }

    function getScaledDimensions(origW: number, origH: number, maxW: number, maxH: number): { width: number; height: number } {
        const ratio = origW / origH;
        let width = origW;
        let height = origH;
        
        if (width > maxW) {
            width = maxW;
            height = width / ratio;
        }
        if (height > maxH) {
            height = maxH;
            width = height * ratio;
        }
        return { width, height };
    }

    function dataURLToArrayBuffer(dataUrl: string): ArrayBuffer {
        const base64String = dataUrl.split(',')[1];
        const binaryString = window.atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function sanitizeAiText(text: string): string {
        if (!text) return '';
        // Reemplaza ampersands que están delante de un carácter válido del patrón
        let cleaned = text.replace(/&([a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ|%.\-\(\)\/])/g, '$1');
        // Remueve cualquier ampersand huérfano que haya quedado (ej. cronograma& -> cronograma)
        cleaned = cleaned.replace(/&/g, '');
        return cleaned;
    }

    function parseMarkdownToDocxSections(markdown: string): any[] {
        const lines = markdown.split('\n');
        const docxSections: any[] = [];
        let currentSection: any = null;
        let inTable = false;
        let tableRows: string[][] = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                if (inTable) {
                    if (tableRows.length > 0) {
                        docxSections.push({
                            type: 'table',
                            rows: tableRows
                        });
                    }
                    tableRows = [];
                    inTable = false;
                }
                return;
            }

            // Fila de tabla markdown
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                inTable = true;
                if (trimmed.replace(/[\s|:\-]/g, '') === '') {
                    return;
                }
                const cells = trimmed
                    .split('|')
                    .slice(1, -1)
                    .map(c => {
                        const val = c.trim().replace(/\*\*/g, '');
                        const valLower = val.toLowerCase();
                        if (valLower === 'exempt') return 'EXONERADO';
                        if (valLower === 'paid' || valLower === 'completed') return 'PAGADO';
                        if (valLower === 'pending' || valLower === 'requested' || valLower === 'waiting') return 'PENDIENTE';
                        if (valLower === 'no solicitado' || valLower === 'no_solicitado') return 'NO SOLICITADO';
                        return val;
                    });
                tableRows.push(cells);
                return;
            } else {
                if (inTable) {
                    if (tableRows.length > 0) {
                        docxSections.push({
                            type: 'table',
                            rows: tableRows
                        });
                    }
                    tableRows = [];
                    inTable = false;
                }
            }

            if (trimmed.startsWith('# ')) {
                if (currentSection) docxSections.push(currentSection);
                currentSection = { heading: trimmed.slice(2), text: '', type: 'paragraph' };
            } else if (trimmed.startsWith('## ')) {
                if (currentSection) docxSections.push(currentSection);
                currentSection = { heading: trimmed.slice(3), text: '', type: 'paragraph' };
            } else if (trimmed.startsWith('### ')) {
                if (currentSection) docxSections.push(currentSection);
                currentSection = { heading: trimmed.slice(4), text: '', type: 'paragraph' };
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (!currentSection) {
                    currentSection = { type: 'bullet', bullets: [] };
                } else if (currentSection.type !== 'bullet') {
                    docxSections.push(currentSection);
                    currentSection = { type: 'bullet', bullets: [] };
                }
                currentSection.bullets.push(trimmed.slice(2));
            } else {
                if (!currentSection) {
                    currentSection = { text: trimmed, type: 'paragraph' };
                } else if (currentSection.type === 'bullet') {
                    docxSections.push(currentSection);
                    currentSection = { text: trimmed, type: 'paragraph' };
                } else {
                    currentSection.text += (currentSection.text ? '\n' : '') + trimmed;
                }
            }
        });

        if (inTable && tableRows.length > 0) {
            docxSections.push({
                type: 'table',
                rows: tableRows
            });
        }
        if (currentSection) docxSections.push(currentSection);
        return docxSections;
    }

    async function generateRealTimeNarrative(): Promise<string> {
        if (!stats) throw new Error('No hay estadísticas cargadas');
        
        // Sumar ingresos por categorías de pago
        const revenueByCategory: Record<string, { count: number; revenue: number }> = {};
        let totalRevenue = 0;
        
        participants.forEach(p => {
            if (p.payment_status === 'paid' || p.payment_status === 'completed') {
                const amount = Number(p.payment_amount || 0);
                totalRevenue += amount;
                
                const cat = getResolvedCategory(p, pricingOptions, certificateType);
                if (!revenueByCategory[cat]) {
                    revenueByCategory[cat] = { count: 0, revenue: 0 };
                }
                revenueByCategory[cat].count += 1;
                revenueByCategory[cat].revenue += amount;
            }
        });

        const registeredByCategory: Record<string, number> = {};
        participants.forEach(p => {
            const cat = getResolvedCategory(p, pricingOptions, certificateType);
            registeredByCategory[cat] = (registeredByCategory[cat] || 0) + 1;
        });

        const pricingText = pricingOptions && pricingOptions.length > 0
            ? pricingOptions.map((opt: any) => `- Categoría: ${opt.name} | Precio: S/. ${opt.price}`).join('\n')
            : `- Tarifa Única: S/. ${certificatePrice}`;

        const prompt = `
Actúa como un Auditor Administrativo y Estratega de la Revista Alternativas en Ciencias Sociales (Revista ACS).
Tu tarea es redactar la narración ejecutiva para el informe oficial del evento titulado "${eventTitle}".

DATOS DEL EVENTO:
- Título: ${eventTitle}
- Fecha Programada: ${eventDate}
- Estado del Evento: ${eventStatus}
- Capacidad Máxima: ${maxCapacity || 'No especificada'}
- Modalidad: ${isOnline ? 'VIRTUAL (Enlace: ' + meetingLink + ')' : 'PRESENCIAL (Ubicación: ' + location + ')'}
- Tipo de Certificación: ${certificateType === 'paid' ? 'DE PAGO' : certificateType === 'free' ? 'GRATUITA' : 'SIN CERTIFICACIÓN'}
${certificateType === 'paid' ? `TARIFAS CONFIGURADAS:\n${pricingText}` : ''}

ESTADÍSTICAS CUANTITATIVAS:
- Total Inscritos: ${participants.length}
- Inscritos Desglosados por Categoría (Total Registrados):
${Object.entries(registeredByCategory).map(([cat, count]) => `  * ${cat}: ${count} inscritos`).join('\n')}
- Total Asistentes (Asistencias confirmadas): ${participants.filter(p => p.attended).length}
- Porcentaje de Asistencia: ${participants.length > 0 ? Math.round((participants.filter(p => p.attended).length / participants.length) * 100) : 0}%
- Porcentaje de Inasistencia: ${participants.length > 0 ? 100 - Math.round((participants.filter(p => p.attended).length / participants.length) * 100) : 0}%
${certificateType === 'paid' ? `- Total Certificados Pagados: ${participants.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').length}
- Recaudación Total Real: S/. ${totalRevenue.toFixed(2)}
- Recaudación Desglosada por Categorías de Pago (Certificados pagados):
${Object.entries(revenueByCategory).map(([cat, info]) => `  * ${cat}: ${info.count} certificados, S/. ${info.revenue.toFixed(2)}`).join('\n')}` : ''}

LISTA COMPLETA DE PARTICIPANTES INSCRITOS Y DETALLES DE RENDICIÓN DE CUENTAS:
${participants.map((p, idx) => `${idx + 1}. Nombre: ${p.full_name} | Categoría/Tarifa: ${getResolvedCategory(p, pricingOptions, certificateType)} | Asistió: ${p.attended ? 'SÍ' : 'NO'} | Estado de Certificado: ${getPaymentStatusLabel(p.payment_status)} | Pago: ${p.payment_amount ? 'S/. ' + p.payment_amount : 'S/. 0.00'}`).join('\n')}

INSTRUCCIONES PARA LA REDACCIÓN (ESTRICTAS DE VERACIDAD):
1. Escribe un informe formal estructurado en español.
2. **PROTOCOLO DE SEGURIDAD ANTI-ALUCINACIÓN (CRÍTICO):** Está estrictamente prohibido que inventes nombres de personas, montos de dinero, fechas, o enlaces que no estén en la lista anterior. Utiliza únicamente los datos reales proporcionados.
3. **CLASIFICACIÓN EXACTA POR CATEGORÍA DE PAGO (CRÍTICO):** Para la sección de *Rendición de Cuentas Financiera* y el *Resumen Ejecutivo*, guíate estrictamente por las cifras exactas del bloque **Recaudación Desglosada por Categorías de Pago** y la **Categoría/Tarifa** provista para cada persona en la lista de participantes. No agrupes erróneamente a participantes de una categoría dentro de otra.
4. **MENCIONAR PARTICIPANTES QUE NO SOLICITARON CERTIFICADO (CRÍTICO):** Identifica y lista por sus nombres completos a todos los participantes inscritos cuyo estado de certificado sea 'NO SOLICITADO'. Menciónalos explícitamente en la sección de *Rendición de Cuentas Financiera* y explica que asistieron al evento pero no solicitaron certificación. Esto es fundamental para justificar de forma exacta la diferencia entre el total de inscritos y los certificados pagados y recaudados (ej. 'De los 10 estudiantes registrados, 9 solicitaron y pagaron su certificación, mientras que [Nombre del Participante] participó en calidad de asistente sin solicitar certificado de pago'). Menciónalos uno por uno por su nombre real de la lista proporcionada.
5. **IDIOMA DE ESTADOS DE PAGO Y CERTIFICADO (CRÍTICO):** Todos los estados de pago y certificados en las tablas, listas y texto narrativo que generes deben estar estrictamente en español: 'PAGADO' (para paid/completed), 'EXONERADO' (para exempt), 'PENDIENTE' (para pending) y 'NO SOLICITADO' (para no solicitantes o null). Bajo ninguna circunstancia uses términos en inglés como 'PAID', 'EXEMPT', 'COMPLETED' o 'PENDING'.
6. El informe debe contener:
   - **Resumen Ejecutivo:** Una narración profesional sobre la ejecución general del evento, destacando el nivel de convocatoria, el cumplimiento del cronograma, y el impacto académico en base a las categorías y profesiones participantes.
   - **Análisis de Participación y Asistencia:** Compara el total de inscritos frente a los asistentes reales. Comenta sobre los canales o fuentes de registro si corresponde.
   - **Rendición de Cuentas Financiera (Detallada):**
     * Si la certificación es de pago: Indica el monto unitario, detalla los ingresos brutos proyectados y los recaudados, y rinde cuentas listando a los que han solicitado certificado y su estado de pago. Explica que los comprobantes físicos correspondientes se anexan al final del documento.
     * Si es gratuita: Explica que la certificación se otorgó libre de costo por auspicio institucional.
     * Si es sin certificado: Explica que el evento se ejecutó como una actividad libre sin opción a credencial.
   - **Análisis Logístico y Organizativo:** Evalúa el éxito logístico en términos de asistencia (si fue moderado, excelente, etc.) y si el aforo fue adecuado. Propón acciones logísticas de mejora realistas (ej. enviar recordatorios 1h antes por WhatsApp, aumentar la capacidad de la sala Zoom, mejorar el canal de cobros).
   - **Conclusiones y Recomendaciones Organizativas:** Da sugerencias estratégicas realistas para los próximos eventos en base a los datos.

Responde ÚNICAMENTE con la redacción en texto estructurado en español (usa Markdown estándar como títulos #, negritas, etc.). No agregues preámbulos como "Aquí tienes el informe..." o notas aclaratorias. Empieza directamente con el título del informe.
`;

        const result = await Mercury.generateMercuryContent(prompt);
        return result;
    }

    async function handleExportNarrativeWord() {
        if (!stats) return;
        setGeneratingReport(true);
        setReportCompleted(false);
        setReportError(null);
        setReportBlob(null);
        setReportFileName(`Informe_Narrativo_${eventTitle.replace(/ /g, '_')}.docx`);
        setReportFormatLabel('INFORME NARRATIVO WORD');
        setReportTotalSteps(certificateType === 'paid' ? 6 : 5);
        setReportElapsedSeconds(0);

        try {
            setReportCurrentStepIndex(1);
            setReportStep('Iniciando generación de informe narrativo...');
            await new Promise(r => setTimeout(r, 600));

            setReportCurrentStepIndex(2);
            setReportStep('Consultando base de datos y detalles del evento...');
            await new Promise(r => setTimeout(r, 600));

            setReportCurrentStepIndex(3);
            setReportStep('Conectando con Mercury-2 para redacción (cero alucinaciones)...');
            const rawNarrativeText = await generateRealTimeNarrative();
            const narrativeText = sanitizeAiText(rawNarrativeText);

            setReportCurrentStepIndex(4);
            setReportStep('Analizando asistencia y desglosando categorías...');
            const docxSections = parseMarkdownToDocxSections(narrativeText);

            // Inyectar sección de tabla financiera
            docxSections.push({ heading: 'Detalle de Rendición de Cuentas', type: 'paragraph' });
            
            const tableRows = [
                ['Participante', 'DNI', 'Categoría/Tarifa', 'Estado de Pago', 'Monto']
            ];
            
            participants.forEach(p => {
                tableRows.push([
                    p.full_name,
                    p.dni || 'No especificado',
                    getResolvedCategory(p, pricingOptions, certificateType),
                    getPaymentStatusLabel(p.payment_status),
                    `S/. ${Number(p.payment_amount || 0).toFixed(2)}`
                ]);
            });

            docxSections.push({
                type: 'table',
                rows: tableRows
            });

            // Si es un evento con certificado pagado, descargar e incrustar comprobantes
            if (certificateType === 'paid') {
                setReportCurrentStepIndex(5);
                const paidParticipantsWithReceipt = participants.filter(p => p.payment_receipt_url);
                const totalReceipts = paidParticipantsWithReceipt.length;

                docxSections.push({ heading: 'Anexo: Comprobantes de Pago', type: 'paragraph' });
                
                let count = 0;
                for (const p of participants) {
                    if (p.payment_receipt_url) {
                        count++;
                        setReportStep(`Descargando comprobante ${count} de ${totalReceipts}: ${p.full_name}...`);
                        const base64 = await fetchImageAsBase64(p.payment_receipt_url);
                        if (base64) {
                            docxSections.push({ heading: `Comprobante - ${p.full_name}`, type: 'paragraph' });
                            try {
                                const dims = await getImageDimensions(base64);
                                const scaled = getScaledDimensions(dims.width, dims.height, 400, 500);
                                const arrayBuffer = dataURLToArrayBuffer(base64);
                                docxSections.push({
                                    type: 'image',
                                    image: {
                                        data: arrayBuffer,
                                        width: scaled.width,
                                        height: scaled.height
                                    }
                                });
                            } catch (imgErr) {
                                console.error('Error procesando imagen para Word:', imgErr);
                                docxSections.push({ text: `[Error al procesar la imagen del comprobante de ${p.full_name}]`, type: 'paragraph' });
                            }
                        }
                    }
                }
            }

            const finalStepIndex = certificateType === 'paid' ? 6 : 5;
            setReportCurrentStepIndex(finalStepIndex);
            setReportStep('Compilando y estructurando documento Word...');
            
            const blob = await generateProfessionalDocx({
                title: `Informe Oficial - ${eventTitle}`,
                author: 'Revista ACS - Dirección Administrativa',
                sections: docxSections,
                skipSave: true
            });

            setReportBlob(blob);
            setReportCompleted(true);
            setReportStep('¡Informe de Word generado exitosamente!');
            
            showToast({ type: 'success', title: 'INFORME GENERADO', message: 'El informe de Word está listo para descargar.' });
        } catch (err: any) {
            console.error('Error generando informe Word:', err);
            setReportError(err.message || 'Error desconocido');
            showToast({ type: 'error', title: 'ERROR', message: `No se pudo generar el Word: ${err.message || 'Error desconocido'}` });
        }
    }

    async function handleExportNarrativePDF() {
        if (!stats) return;
        setGeneratingReport(true);
        setReportCompleted(false);
        setReportError(null);
        setReportBlob(null);
        setReportFileName(`Reporte_Narrativo_${eventTitle.replace(/ /g, '_')}.pdf`);
        setReportFormatLabel('INFORME NARRATIVO PDF');
        setReportTotalSteps(certificateType === 'paid' ? 7 : 6);
        setReportElapsedSeconds(0);

        try {
            setReportCurrentStepIndex(1);
            setReportStep('Iniciando generación de informe PDF...');
            await new Promise(r => setTimeout(r, 600));

            setReportCurrentStepIndex(2);
            setReportStep('Consultando base de datos y detalles del evento...');
            await new Promise(r => setTimeout(r, 600));

            setReportCurrentStepIndex(3);
            setReportStep('Conectando con Mercury-2 para redacción narrative (cero alucinaciones)...');
            const rawNarrativeText = await generateRealTimeNarrative();
            const narrativeText = sanitizeAiText(rawNarrativeText);

            setReportCurrentStepIndex(4);
            setReportStep('Estructurando formato de páginas y tipografía PDF...');
            const doc = new jsPDF();
            
            let currentY = 25;
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 14;
            const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

            function addTextWithPageWrap(text: string, fontStyle = 'normal', fontSize = 10, spacing = 5.5) {
                doc.setFont('times', fontStyle);
                doc.setFontSize(fontSize);
                const lines = doc.splitTextToSize(text, maxWidth);
                lines.forEach((line: string) => {
                    if (currentY + 6 > pageHeight - 20) {
                        doc.addPage();
                        currentY = 20;
                    }
                    doc.text(line, margin, currentY);
                    currentY += spacing;
                });
                currentY += 4;
            }

            // Encabezado principal del PDF
            doc.setFont('times', 'bold');
            doc.setFontSize(16);
            doc.text('REVISTA ALTERNATIVAS EN CIENCIAS SOCIALES', margin, currentY);
            currentY += 6;
            doc.setFontSize(12);
            doc.text('INFORME ADMINISTRATIVO Y RENDICIÓN DE CUENTAS DE EVENTO', margin, currentY);
            currentY += 8;

            doc.setDrawColor(200, 200, 200);
            doc.line(margin, currentY, doc.internal.pageSize.getWidth() - margin, currentY);
            currentY += 10;

            // Datos clave con envoltura de texto para evitar overflow
            addTextWithPageWrap(`Evento: ${eventTitle}`, 'bold', 11, 5);
            addTextWithPageWrap(`Fecha: ${eventDate ? new Date(eventDate).toLocaleDateString('es-ES') : 'N/E'}`, 'bold', 11, 5);
            addTextWithPageWrap(`Modalidad: ${isOnline ? 'Virtual' : 'Presencial'} ${location ? `(${location})` : ''}`, 'bold', 11, 5);
            addTextWithPageWrap(`Certificación: ${certificateType === 'paid' ? `De Pago (S/. ${certificatePrice})` : certificateType === 'free' ? 'Gratuita' : 'Sin Certificado'}`, 'bold', 11, 5);
            currentY += 6;

            // Procesar las líneas de la narración de la IA y parsear tablas markdown
            const paragraphs = narrativeText.split('\n');
            let currentTableRows: string[][] = [];
            let inTableBlock = false;

            for (let i = 0; i < paragraphs.length; i++) {
                const pText = paragraphs[i];
                const cleanText = pText.trim();
                
                if (!cleanText) {
                    if (inTableBlock) {
                        if (currentTableRows.length > 0) {
                            if (currentY + 25 > pageHeight - 20) {
                                doc.addPage();
                                currentY = 20;
                            }
                            autoTable(doc, {
                                startY: currentY,
                                head: [currentTableRows[0]],
                                body: currentTableRows.slice(1),
                                styles: { font: 'times', fontSize: 9 },
                                headStyles: { fillColor: [41, 128, 185] },
                            });
                            currentY = (doc as any).lastAutoTable.finalY + 10;
                        }
                        currentTableRows = [];
                        inTableBlock = false;
                    }
                    continue;
                }

                // Si es una fila de tabla markdown
                if (cleanText.startsWith('|') && cleanText.endsWith('|')) {
                    inTableBlock = true;
                    if (cleanText.replace(/[\s|:\-]/g, '') === '') {
                        continue;
                    }
                    const cells = cleanText
                        .split('|')
                        .slice(1, -1)
                        .map(c => {
                            const val = c.trim().replace(/\*\*/g, '');
                            const valLower = val.toLowerCase();
                            if (valLower === 'exempt') return 'EXONERADO';
                            if (valLower === 'paid' || valLower === 'completed') return 'PAGADO';
                            if (valLower === 'pending' || valLower === 'requested' || valLower === 'waiting') return 'PENDIENTE';
                            if (valLower === 'no solicitado' || valLower === 'no_solicitado') return 'NO SOLICITADO';
                            return val;
                        });
                    currentTableRows.push(cells);
                    continue;
                } else {
                    if (inTableBlock) {
                        if (currentTableRows.length > 0) {
                            if (currentY + 25 > pageHeight - 20) {
                                doc.addPage();
                                currentY = 20;
                            }
                            autoTable(doc, {
                                startY: currentY,
                                head: [currentTableRows[0]],
                                body: currentTableRows.slice(1),
                                styles: { font: 'times', fontSize: 9 },
                                headStyles: { fillColor: [41, 128, 185] },
                            });
                            currentY = (doc as any).lastAutoTable.finalY + 10;
                        }
                        currentTableRows = [];
                        inTableBlock = false;
                    }
                }

                if (cleanText.startsWith('# ')) {
                    currentY += 4;
                    addTextWithPageWrap(cleanText.slice(2), 'bold', 12, 6);
                } else if (cleanText.startsWith('## ')) {
                    currentY += 3;
                    addTextWithPageWrap(cleanText.slice(3), 'bold', 11, 6);
                } else if (cleanText.startsWith('### ')) {
                    currentY += 2;
                    addTextWithPageWrap(cleanText.slice(4), 'bold', 10, 5.5);
                } else if (cleanText.startsWith('- ') || cleanText.startsWith('* ')) {
                    addTextWithPageWrap(`• ${cleanText.slice(2).replace(/\*\*/g, '')}`, 'normal', 10, 5.5);
                } else {
                    addTextWithPageWrap(cleanText.replace(/\*\*/g, ''), 'normal', 10, 5.5);
                }
            }

            if (inTableBlock && currentTableRows.length > 0) {
                if (currentY + 25 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 20;
                }
                autoTable(doc, {
                    startY: currentY,
                    head: [currentTableRows[0]],
                    body: currentTableRows.slice(1),
                    styles: { font: 'times', fontSize: 9 },
                    headStyles: { fillColor: [41, 128, 185] },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            setReportCurrentStepIndex(5);
            setReportStep('Generando tabla de rendición de cuentas desglosada...');

            // Espacio para la tabla
            if (currentY + 30 > pageHeight - 20) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont('times', 'bold');
            doc.setFontSize(12);
            doc.text('Detalle de Participantes y Pagos', margin, currentY);
            currentY += 6;

            autoTable(doc, {
                startY: currentY,
                head: [['Participante', 'DNI', 'Categoría/Tarifa', 'Estado de Pago', 'Monto']],
                body: participants.map(p => [
                    p.full_name,
                    p.dni || 'N/E',
                    getResolvedCategory(p, pricingOptions, certificateType),
                    getPaymentStatusLabel(p.payment_status),
                    `S/. ${Number(p.payment_amount || 0).toFixed(2)}`
                ]),
                styles: { font: 'times', fontSize: 8.5 },
                headStyles: { fillColor: [41, 128, 185] },
            });

            // Anexos de comprobantes (Solo si es de pago)
            if (certificateType === 'paid') {
                setReportCurrentStepIndex(6);
                const paidParticipantsWithReceipt = participants.filter(p => p.payment_receipt_url);
                const totalReceipts = paidParticipantsWithReceipt.length;

                let count = 0;
                for (const p of participants) {
                    if (p.payment_receipt_url) {
                        count++;
                        setReportStep(`Procesando comprobante ${count} de ${totalReceipts}: ${p.full_name}...`);
                        const base64 = await fetchImageAsBase64(p.payment_receipt_url);
                        if (base64) {
                            doc.addPage();
                            doc.setFont('times', 'bold');
                            doc.setFontSize(12);
                            doc.text(`Anexo: Comprobante de Pago - ${p.full_name}`, margin, 20);
                            
                            doc.setFont('times', 'normal');
                            doc.setFontSize(10);
                            doc.text(`Categoría: ${getResolvedCategory(p, pricingOptions, certificateType)} | Monto de Pago: S/. ${Number(p.payment_amount || 0).toFixed(2)}`, margin, 26);
                            
                            doc.setDrawColor(220, 220, 220);
                            doc.line(margin, 30, doc.internal.pageSize.getWidth() - margin, 30);

                            try {
                                const dims = await getImageDimensions(base64);
                                const scaled = getScaledDimensions(dims.width, dims.height, 150, 200);
                                const pageWidth = doc.internal.pageSize.getWidth();
                                const centeredX = margin + (pageWidth - margin * 2 - scaled.width) / 2;
                                doc.addImage(base64, 'JPEG', centeredX, 35, scaled.width, scaled.height);
                            } catch (imgErr) {
                                console.error('Error dibujando imagen en PDF:', imgErr);
                                doc.text('[Error de formato al renderizar la imagen del comprobante]', margin, 45);
                            }
                        }
                    }
                }
            }

            const finalStepIndex = certificateType === 'paid' ? 7 : 6;
            setReportCurrentStepIndex(finalStepIndex);
            setReportStep('Compilando y renderizando PDF final...');
            await new Promise(r => setTimeout(r, 600));

            const pdfBlob = doc.output('blob');
            setReportBlob(pdfBlob);
            setReportCompleted(true);
            setReportStep('¡Informe PDF generado exitosamente!');
            
            showToast({ type: 'success', title: 'PDF GENERADO', message: 'El informe narrativo PDF está listo para descargar.' });
        } catch (err: any) {
            console.error('Error generando informe PDF:', err);
            setReportError(err.message || 'Error desconocido');
            showToast({ type: 'error', title: 'ERROR', message: `No se pudo generar el PDF: ${err.message || 'Error desconocido'}` });
        }
    }

    async function handleGenerateEventSummary() {
        if (!stats || loadingAI) return;
        setLoadingAI(true);
        try {
            const summary = await Mercury.generateMercuryEventSummary(eventTitle, eventDate, {
                total: stats.total,
                attended: stats.attended,
                totalRevenue: stats.totalRevenue,
                bySex: stats.bySex,
                byCategory: stats.byCategory,
                byCareer: stats.byCareer,
                byAge: stats.byAge,
                timeline: stats.timeline,
                smartTextCharts: stats.smartTextCharts
            });
            if (summary) {
                setAiSummary(summary);
                await supabase.from('events').update({ ai_summary: summary }).eq('id', eventId);
            }
        } catch (e) {
            console.error('AI Summary error:', e);
        } finally {
            setLoadingAI(false);
        }
    }

    async function handleRefreshAI() {
        if (loadingAI || loadingPrediction) return;
        setLoadingAI(true);
        setLoadingPrediction(true);
        try {
            // 1. Re-fetch participants
            const { data: partData, error: pErr } = await supabase
                .from('event_participants')
                .select('*')
                .eq('event_id', eventId)
                .order('registered_at', { ascending: false });

            if (pErr) throw pErr;
            const list = (partData || []) as ParticipantData[];
            setParticipants(list);

            // 2. Compute new stats
            const newStats = computeStats(list, registrationForm);
            setStats(newStats);

            // 3. Update predictions
            await loadPredictions(list, eventDate, maxCapacity);

            // 4. Update Summary
            const summary = await Mercury.generateMercuryEventSummary(eventTitle, eventDate, {
                total: list.length,
                attended: list.filter(p => p.attended).length,
                paidCount: list.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').length,
                totalRevenue: newStats.totalRevenue,
                bySex: newStats.bySex,
                byCategory: newStats.byCategory,
                byCareer: newStats.byCareer,
                byAge: newStats.byAge,
                bySource: newStats.bySource,
                timeline: newStats.timeline,
                smartTextCharts: newStats.smartTextCharts
            });

            if (summary) {
                setAiSummary(summary);
                await supabase.from('events').update({ ai_summary: summary }).eq('id', eventId);
            }
        } catch (e) {
            console.error('Refresh AI error:', e);
        } finally {
            setLoadingAI(false);
            setLoadingPrediction(false);
        }
    }

    async function handleShareReport() {
        setSharing(true);
        try {
            let slug = reportSlug;
            if (!slug) {
                slug = `${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;
                await supabase.from('events').update({ report_slug: slug, is_report_public: true }).eq('id', eventId);
                setReportSlug(slug);
            }
            const url = `${window.location.origin}/reporte/${slug}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
            setSharingModalOpen(true);
        } catch (e) {
            console.error('Sharing error:', e);
        } finally {
            setSharing(false);
        }
    }

    async function handleSendReminders() {
        if (participants.length === 0) {
            showToast({
                type: 'warning',
                title: 'SIN_DATOS',
                message: 'No hay participantes para notificar.'
            });
            return;
        }

        const confirmed = await confirm(
            'ENVIAR_RECORDATORIOS',
            '¿Estás seguro de que deseas enviar notificaciones de recordatorio a todos los participantes inscritos?',
            { confirmText: 'ENVIAR_AHORA' }
        );

        if (!confirmed) return;
        
        const message = "¡Hola! Te recordamos que el evento está por comenzar. ¡Te esperamos!";
        
        if (!message) return;
        
        setSendingEmails(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-participant-email-v2', {
                body: {
                    participantIds: participants.map(p => p.id),
                    type: 'reminder',
                    eventTitle: eventTitle,
                    customMessage: message
                }
            });

            if (error) throw error;

            // Manejar ambos formatos de respuesta
            const results = data.results || [];
            const successCount = data.successCount ?? results.filter((r: any) => r.status === 'sent' || r.status === 'success').length;
            const totalCount = data.totalCount ?? results.length;
            
            if (successCount === totalCount && totalCount > 0) {
                showToast({
                    type: 'success',
                    title: 'ENVÍO_EXITOSO',
                    message: `Se enviaron ${successCount} recordatorios correctamente.`
                });
            } else {
                showToast({
                    type: 'success',
                    title: 'ENVÍO_COMPLETADO',
                    message: `Enviados: ${successCount}/${totalCount}. Algunos fallaron.`
                });
            }
        } catch (error: any) {
            console.error('Error sending reminders:', error);
            showToast({
                type: 'error',
                title: 'FALLO_SISTEMA',
                message: error.message
            });
        } finally {
            setSendingEmails(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-exec-blue" size={32} />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sincronizando reporte de impacto...</p>
            </div>
        );
    }

    const attendanceRate = stats && stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

    return (
        <div className="p-1 sm:p-2 space-y-2.5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                    <button 
                        onClick={() => (window as any).setActiveEventSubTab?.(null)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="p-2 bg-exec-blue/10 border border-exec-blue/20 rounded-none shrink-0">
                        <FileText size={18} className="text-exec-blue" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest truncate">Reporte Administrativo</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium truncate">{eventTitle}</p>
                    </div>
                </div>
                
                {/* Ribbon of Actions - Fixed Scroll & Standardized Colors */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar">
                    <button
                        onClick={handleShareReport}
                        disabled={sharing}
                        className="flex items-center gap-2 px-2 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue rounded-none text-[10px] transition-all font-bold uppercase tracking-wider shrink-0"
                    >
                        {sharing ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} /> : <Share2 size={12} />}
                        <span className="hidden xs:inline">Compartir</span>
                    </button>
                    
                    <button
                        onClick={handleRefreshAI}
                        disabled={loadingAI || loadingPrediction}
                        className="flex items-center gap-2 px-2 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue hover:bg-exec-blue/20 rounded-none text-[10px] transition-all font-bold uppercase tracking-wider shrink-0"
                    >
                        {(loadingAI || loadingPrediction) ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        <span className="hidden xs:inline">Refrescar</span>
                    </button>

                    <button
                        onClick={handleGenerateEventSummary}
                        disabled={loadingAI}
                        className="flex items-center gap-2 px-2 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue hover:bg-exec-blue/20 rounded-none text-[10px] transition-all font-bold uppercase tracking-wider shrink-0"
                    >
                        {loadingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        IA
                    </button>

                    <button
                        onClick={handleExportNarrativeWord}
                        disabled={exporting || generatingReport}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-exec-blue text-black hover:bg-exec-blue/90 rounded-none text-[10px] transition-all font-black uppercase tracking-wider shrink-0"
                        title="Descargar informe oficial en formato Word (DOCX) con narración e imágenes de comprobantes"
                    >
                        <FileText size={12} />
                        <span>Informe Word</span>
                    </button>

                    <button
                        onClick={handleExportNarrativePDF}
                        disabled={exporting || generatingReport}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-none text-[10px] transition-all font-black uppercase tracking-wider shrink-0"
                        title="Descargar informe oficial en formato PDF con narración e imágenes de comprobantes"
                    >
                        <Download size={12} />
                        <span>Informe PDF</span>
                    </button>

                    <button
                        onClick={handlePDFExport}
                        disabled={exporting || generatingReport}
                        className="flex items-center gap-2 px-2 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue hover:bg-exec-blue/20 rounded-none text-[10px] transition-all font-bold uppercase tracking-wider shrink-0"
                        title="Exportar Captura del Dashboard"
                    >
                        <Download size={12} />
                        <span className="hidden xs:inline">Captura PDF</span>
                    </button>

                    <button
                        onClick={handleExcelExport}
                        disabled={exporting || generatingReport}
                        className="flex items-center gap-2 px-2 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue hover:bg-exec-blue/20 rounded-none text-[10px] transition-all font-bold uppercase tracking-wider shrink-0"
                    >
                        <BarChart2 size={12} />
                        <span className="hidden xs:inline">Excel</span>
                    </button>

                    <button
                        onClick={handleSendReminders}
                        disabled={sendingEmails}
                        className="flex items-center gap-2 px-2 py-1 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue rounded-none text-[10px] transition-all font-bold uppercase tracking-wider shrink-0"
                    >
                        {sendingEmails ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                        <span className="hidden xs:inline">Recordatorio</span>
                    </button>

                    <button
                        onClick={loadData}
                        className="p-1 px-2 text-gray-500 hover:text-white transition-colors shrink-0"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            {/* Main Report Content */}
            <div id="internal-report-content" className="space-y-2 bg-black">
                
                {/* Metrics Grid (Compact Seamless Unit) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-0.5">
                    <div className="bg-[#050505] border border-[#1A1A1A] p-3 rounded-none relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Inscritos</p>
                        <h4 className="text-2xl sm:text-3xl font-black text-white">{stats?.total}</h4>
                    </div>
                    
                    <div className="bg-[#050505] border border-[#1A1A1A] p-3 rounded-none relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Asistentes</p>
                        <h4 className="text-2xl sm:text-3xl font-black text-white">{stats?.attended}</h4>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">{attendanceRate}% <span className="hidden sm:inline">Ratio</span></p>
                    </div>

                    <div className="bg-[#050505] border border-[#1A1A1A] p-3 rounded-none relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Recaudación</p>
                        <h4 className="text-xl sm:text-2xl font-black text-white">S/ {stats?.totalRevenue.toFixed(2)}</h4>
                    </div>

                    <div className="bg-[#050505] border border-[#1A1A1A] p-3 rounded-none relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Impacto IA</p>
                        <h4 className="text-xl sm:text-2xl font-black text-white">Sinergia Activa</h4>
                        <p className="text-[9px] font-bold text-exec-blue uppercase tracking-widest mt-1">Mercury v4.2</p>
                    </div>
                </div>

                {/* Payment Summary */}
                {stats && (
                    <div className="p-3 bg-exec-blue/5 border border-exec-blue/10 rounded-none flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard size={12} className="text-exec-blue" />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Resumen de conciliación de pagos</span>
                        </div>
                        <span className="text-[9px] font-black text-exec-blue uppercase tracking-[0.2em]">{stats.paidCount} Pagos validados de {stats.total} inscritos</span>
                    </div>
                )}

                {/* Timeline Chart (Compact) */}
                {stats?.timeline && stats.timeline.length > 0 && (
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none p-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Tendencia de Inscripciones</h4>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                    <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Demographic Distribution Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Sex Distribution */}
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none p-3 h-full flex flex-col">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">Distribución por Sexo</h4>
                        <div className="flex-1 min-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={Object.entries(stats?.bySex || {}).map(([name, value]) => ({ name, value }))} 
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={85} 
                                        paddingAngle={6} dataKey="value" stroke="none"
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {Object.entries(stats?.bySex || {}).map(([name], index) => {
                                            const normalizedName = name.toUpperCase();
                                            let color = STITCH_COLORS[index % STITCH_COLORS.length];
                                            if (normalizedName.includes('FEMENINO')) color = '#EC4899'; // Pink
                                            else if (normalizedName.includes('MASCULINO')) color = '#0088FF'; // Blue
                                            return <Cell key={`sex-${index}`} fill={color} />;
                                        })}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <ChartLegend items={Object.entries(stats?.bySex || {}).map(([name, value], i) => ({ name, value: value as number, color: STITCH_COLORS[i % STITCH_COLORS.length] }))} />
                    </div>

                    {/* Top Careers */}
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none p-3 overflow-hidden">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">Top Carreras Profesionales</h4>
                        <div className="space-y-2">
                            {Object.entries(stats?.byCareer || {}).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([career, count], i) => (
                                <StatBar key={career} label={career} value={Number(count)} total={stats?.total || 1} color={i < 3 ? 'bg-exec-blue' : 'bg-gray-800'} />
                            ))}
                        </div>
                    </div>

                    {/* Age Distribution */}
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none p-3 h-full flex flex-col">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">Distribución por Edad</h4>
                        <div className="flex-1 min-h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={Object.entries(stats?.byAge || {}).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ left: 0, right: 60, top: 4, bottom: 4 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} stroke="#555" fontSize={8} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={26}>
                                        {Object.entries(stats?.byAge || {}).map((_, index) => <Cell key={`age-cell-${index}`} fill={STITCH_COLORS[(index + 3) % STITCH_COLORS.length]} />)}
                                        <LabelList dataKey="value" position="right" formatter={(val: any) => {
                                            const ageStats = stats?.byAge || {};
                                            const total = Object.values(ageStats).reduce((acc: number, curr: any) => acc + (Number(curr) || 0), 0) as number;
                                            return `${val} (${((Number(val) / (total || 1)) * 100).toFixed(0)}%)`;
                                        }} fill="#fff" fontSize={10} fontWeight="900" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Registration Source */}
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none p-3">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3">Origen de Registros</h4>
                        <div className="space-y-2">
                            {Object.entries(stats?.bySource || {}).map(([src, count], i) => (
                                <div key={src} className="p-2.5 bg-[#111] border border-[#1A1A1A] rounded-none flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        {src === 'public_form' ? <Globe size={14} className="text-exec-blue" /> : <PenLine size={14} className="text-amber-500" />}
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{src === 'public_form' ? 'Formulario Público' : 'Registro Manual'}</span>
                                    </div>
                                    <span className="text-lg font-black text-white">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Predictive Center */}
                {preEventPrediction && (['planned', 'active', 'upcoming', 'planificado', 'activo'].includes((eventStatus || '').toLowerCase())) && (
                    <div className="bg-[#0D0D0D] border border-exec-blue/20 rounded-none overflow-hidden">
                        <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
                                    <Rocket size={20} className="text-exec-blue" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Misión Control IA</h4>
                                    <p className="text-[9px] text-exec-blue font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
                                        <span className="w-1 h-1 bg-exec-blue rounded-full animate-pulse" /> Gemini Pro Predictive Engine
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleRefreshAI}
                                className="p-2 hover:bg-white/5 rounded-none transition-colors text-exec-blue/50 hover:text-exec-blue"
                                title="Recalcular predicciones"
                            >
                                <RefreshCw size={14} className={loadingPrediction ? "animate-spin" : ""} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                             {/* Prediction Summary */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-4">
                                     <div className="p-4 bg-exec-blue/5 border border-exec-blue/10 rounded-none">
                                         <p className="text-sm text-blue-200 leading-relaxed italic font-light">
                                             "{preEventPrediction.momentum_interpretation}"
                                         </p>
                                                    <div className="flex items-center gap-4">
                                         <div>
                                             <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Proyección Final</p>
                                             <p className="text-xl font-black text-white tracking-tighter">{preEventPrediction.projected_attendance} <span className="text-[9px] text-exec-blue uppercase tracking-tighter">Personas</span></p>
                                         </div>
                                         <div>
                                             <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Días Restantes</p>
                                             <p className="text-xl font-black text-amber-500 tracking-tighter">{Math.max(0, Math.ceil((new Date(eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} <span className="text-[9px] text-gray-500 uppercase tracking-tighter font-normal">Días</span></p>
                                         </div>
                                     </div>                           </div>
                                 </div>

                                 {/* Marketing Actions */}
                                 <div className="space-y-4">
                                     <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                         <Megaphone size={12} /> Acciones Prioritarias
                                     </h5>
                                     <div className="space-y-2">
                                         {preEventPrediction.marketing_actions?.slice(0, 3).map((act: any, i: number) => (
                                             <div key={i} className="flex gap-3 items-start p-3 bg-[#0A0A12] border border-[#1A1A2E] rounded-none">
                                                 <span className="shrink-0 text-[10px] font-bold text-amber-500/50">{i + 1}.</span>
                                                 <div>
                                                     <p className="text-[11px] text-gray-300 leading-tight font-medium mb-1">{act.action}</p>
                                                     <p className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Canal: {act.channel} · Timing: {act.timing}</p>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {preEventPrediction.content_strategy?.slice(0, 3).map((str: any, i: number) => (
                                     <div key={i} className="bg-[#0A0A12] border border-[#1A1A2E] p-4 rounded-none flex flex-col gap-3 group hover:border-exec-blue/20 transition-colors">
                                         <div className="flex items-center justify-between">
                                             <span className="text-[9px] bg-exec-blue/10 text-exec-blue px-2 py-0.5 rounded-none font-bold uppercase tracking-widest border border-exec-blue/20">{str.format}</span>
                                             <Gamepad2 size={12} className="text-gray-700" />
                                         </div>
                                         <p className="text-[11px] text-gray-200 leading-relaxed font-medium">{str.topic}</p>
                                         <p className="text-[9px] text-exec-blue/60 font-bold italic tracking-tight border-t border-exec-blue/5 pt-2">Neuro-hook: {str.neuroscience_hook}</p>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}

                {aiSummary && (
                    <div className="bg-[#0A0A0A] border border-exec-blue/20 rounded-none overflow-hidden p-3.5 space-y-3">
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-none bg-exec-blue/20 flex items-center justify-center">
                                     <Sparkles size={20} className="text-exec-blue" />
                                 </div>
                                 <div>
                                     <h4 className="text-sm font-bold text-white uppercase tracking-widest">Resumen Ejecutivo Inteligente</h4>
                                     <p className="text-[9px] text-exec-blue/70 font-bold uppercase tracking-widest">Sinergia de Datos & Gemini 1.5 Pro</p>
                                 </div>
                             </div>
                             <button
                                 onClick={handleRefreshAI}
                                 disabled={loadingAI}
                                 className="p-2 hover:bg-white/5 rounded-none transition-colors text-exec-blue/50 hover:text-exec-blue"
                                 title="Regenerar análisis ejecutivo"
                             >
                                 <RefreshCw size={16} className={loadingAI ? "animate-spin" : ""} />
                             </button>
                         </div>

                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             <div className="lg:col-span-2 space-y-4">
                                 <div>
                                     <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                         <ShieldAlert size={12} className="text-exec-blue" /> Conclusiones Principales
                                     </h5>
                                     <p className="text-[12px] text-gray-300 leading-relaxed whitespace-pre-line font-medium">{aiSummary.executive_summary}</p>
                                 </div>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                     <div className="space-y-2">
                                         <h5 className="text-[10px] font-bold text-exec-blue uppercase tracking-widest flex items-center gap-2">
                                             <Users size={12} /> Análisis de Audiencia
                                         </h5>
                                         <p className="text-xs text-gray-400 leading-relaxed">{aiSummary.audience_analysis}</p>
                                     </div>
                                     <div className="space-y-3">
                                         <h5 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                              <Clock size={12} /> Tasa de Asistencia
                                         </h5>
                                         <p className="text-xs text-gray-400 leading-relaxed">{aiSummary.attendance_analysis}</p>
                                     </div>
                                 </div>
                             </div>

                             <div className="space-y-4 bg-exec-blue/[0.03] border border-exec-blue/10 p-4 rounded-none">
                                 <h5 className="text-[11px] font-black text-exec-blue uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                     <Lightbulb size={14} /> Hoja de Ruta ACS
                                 </h5>
                                 <div className="space-y-4">
                                     {aiSummary.proposals?.slice(0, 4).map((p: string, i: number) => (
                                         <div key={i} className="flex gap-3">
                                             <span className="text-[10px] font-bold text-exec-blue mt-0.5 shrink-0">{i + 1}.</span>
                                             <p className="text-xs text-gray-400 leading-snug">{p}</p>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                    </div>
                )}

                {/* Custom Charts & Smart Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {stats?.customCharts?.map((chart, i) => (
                        <div key={i} className="bg-[#0D0D0D] border border-[#262626] rounded-none p-6 flex flex-col">
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-6 line-clamp-1">{chart.label}</h4>
                            <div className="flex-1 min-h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={Object.entries(chart.data).map(([name, value]) => ({ name, value }))} 
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none"
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {Object.keys(chart.data).map((_, idx) => <Cell key={`custom-${i}-${idx}`} fill={STITCH_COLORS[(idx + i * 2) % STITCH_COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <ChartLegend items={Object.entries(chart.data).map(([name, value], idx) => ({ name, value: value as number, color: STITCH_COLORS[(idx + i * 2) % STITCH_COLORS.length] }))} />
                        </div>
                    ))}

                    {stats?.smartTextCharts?.map((chart, i) => (
                        <div key={`smart-${i}`} className="bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex flex-col">
                            <h4 className="text-[11px] font-black text-exec-blue uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Globe size={14} /> {chart.label}
                            </h4>
                            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-6">Filtrado Inteligente semántico</p>
                            <div className="flex-1 min-h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={Object.entries(chart.data).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 8).map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ left: 0, right: 60, bottom: 0, top: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={110} stroke="#888" fontSize={9} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                            <LabelList dataKey="value" position="right" fill="#fff" fontSize={11} fontWeight="900" offset={10} />
                                            {Object.keys(chart.data).map((_, idx) => <Cell key={`smart-bar-${i}-${idx}`} fill={STITCH_COLORS[(idx + i + 5) % STITCH_COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Free Text Responses (Compact Grid) */}
                {stats?.freeTextResponses && stats.freeTextResponses.length > 0 && (
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-none p-4">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <PenLine size={14} className="text-gray-500" /> Respuestas Detalladas de Participantes
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.freeTextResponses.slice(0, 24).map((usr, i) => (
                                <div key={i} className="bg-[#111] border border-[#1A1A1A] p-4 rounded-none">
                                    <div className="flex items-center justify-between mb-4 border-b border-[#262626] pb-2">
                                        <div className="flex flex-col truncate pr-2">
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter truncate">{usr.name}</span>
                                            <span className="text-[7px] text-exec-blue font-black uppercase tracking-[0.2em] mt-0.5">
                                                {usr.payment?.category ? usr.payment.category.replace(/_/g, ' ') : 'GENERAL'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[9px] text-gray-600 font-bold mb-1">{usr.date}</span>
                                            {usr.payment?.status === 'paid' || usr.payment?.status === 'completed' ? (
                                                <span className="px-1.5 py-0.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-[7px] font-black text-emerald-500 uppercase tracking-tighter">
                                                    S/ {usr.payment.amount.toFixed(2)}
                                                </span>
                                            ) : usr.payment?.status === 'pending' || usr.payment?.status === 'under_review' ? (
                                                <span className="px-1.5 py-0.5 rounded-none bg-amber-500/10 border border-amber-500/20 text-[7px] font-black text-amber-500 uppercase tracking-tighter">
                                                    REVISIÓN
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded-none bg-gray-500/5 border border-gray-500/10 text-[7px] font-black text-gray-600 uppercase tracking-tighter">
                                                    PENDIENTE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {usr.answers.slice(0, 3).map((ans: any, j: number) => (
                                            <div key={j} className="flex flex-col gap-1.5">
                                                <span className="text-[9px] text-exec-blue font-black uppercase tracking-widest">{ans.label}</span>
                                                <p className="text-xs text-gray-400 font-medium leading-relaxed italic border-l border-[#262626] pl-2">"{ans.value}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Branding */}
            <footer className="mt-8 py-6 border-t border-[#1A1A1A] text-center opacity-50">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Engineered by ACS Intelligence</p>
            </footer>

            {/* Sharing Modal */}
            {sharingModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setSharingModalOpen(false)}>
                    <div className="bg-[#0A0A0A] rounded-none border border-[#262626] p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-exec-blue/10 border border-exec-blue/20 rounded-none">
                                <Share2 size={24} className="text-exec-blue" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Compartir Reporte</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">El reporte público permite que cualquier persona con el link vea las estadísticas de impacto del evento sin tener acceso al panel administrativo.</p>
                            
                            <div className="flex items-center gap-2 bg-[#111] border border-[#262626] p-4 rounded-none">
                                <Link size={14} className="text-gray-500 shrink-0" />
                                <input readOnly value={`${window.location.origin}/reporte/${reportSlug}`} className="bg-transparent border-none text-[11px] text-exec-blue w-full focus:ring-0 font-bold tracking-tight" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/reporte/${reportSlug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center justify-center gap-2 py-3 bg-[#1A1A1A] hover:bg-[#222] text-white rounded-none text-xs font-bold transition-all border border-[#333]">
                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    {copied ? '¡Copiado!' : 'Copiar'}
                                </button>
                                <button onClick={() => window.open(`${window.location.origin}/reporte/${reportSlug}`, '_blank')} className="flex items-center justify-center gap-2 py-3 bg-exec-blue hover:bg-blue-600 text-black rounded-none text-xs font-black transition-all">
                                    <Globe size={14} /> Abrir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Progreso de Generación de Informe */}
            {generatingReport && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 dark:bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#0A0A0A] text-gray-900 dark:text-white rounded-none border border-gray-200 dark:border-[#222] p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                                {!reportCompleted && !reportError ? (
                                    <Loader2 size={12} className="animate-spin text-exec-blue animate-pulse" />
                                ) : reportError ? (
                                    <AlertTriangle size={12} className="text-rose-500" />
                                ) : (
                                    <CheckCircle2 size={12} className="text-emerald-500 animate-bounce" />
                                )}
                                {reportFormatLabel}
                            </span>
                            <span className={reportCompleted ? "text-emerald-600 dark:text-emerald-500 font-bold" : reportError ? "text-rose-600 dark:text-rose-500 font-bold" : "text-exec-blue animate-pulse"}>
                                {reportCompleted ? "COMPLETADO" : reportError ? "ERROR" : "EN PROCESO"}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline text-xs font-bold text-gray-900 dark:text-white">
                                <span className="truncate max-w-[280px] block">
                                    {reportStep}
                                </span>
                                <span className="text-exec-blue font-mono">
                                    {reportCurrentStepIndex}/{reportTotalSteps}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">
                                {!reportCompleted && !reportError 
                                    ? "Por favor, mantén esta ventana abierta." 
                                    : reportError 
                                        ? "Ocurrió un error en la generación." 
                                        : "El documento ha sido compilado."}
                            </p>
                            
                            <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider pt-2 border-t border-gray-100 dark:border-[#1A1A1A] mt-2">
                                <span>Tiempo Transcurrido: <span className="text-gray-900 dark:text-white font-mono">{formatTime(reportElapsedSeconds)}</span></span>
                            </div>
                        </div>

                        {/* Barra de Progreso */}
                        <div className="h-2 w-full bg-gray-100 dark:bg-[#151515] overflow-hidden relative border border-gray-200 dark:border-[#222]">
                            <div 
                                className={`h-full transition-all duration-500 ease-out ${reportError ? 'bg-rose-500 dark:bg-rose-600' : reportCompleted ? 'bg-emerald-500' : 'bg-exec-blue'}`}
                                style={{ width: `${reportTotalSteps > 0 ? (reportCurrentStepIndex / reportTotalSteps) * 100 : 0}%` }}
                            />
                        </div>

                        {/* Botón final para descargar o cerrar */}
                        <div className="pt-2 flex gap-2">
                            {reportCompleted && reportBlob && (
                                <button
                                    onClick={handleDownloadReportFile}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                                >
                                    <Download size={14} />
                                    Descargar Informe
                                </button>
                            )}
                            
                            {(reportCompleted || reportError) ? (
                                <button
                                    onClick={() => {
                                        setGeneratingReport(false);
                                        setReportBlob(null);
                                    }}
                                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1A1A] dark:hover:bg-[#222] border border-gray-300 dark:border-[#333] text-gray-700 dark:text-white rounded-none text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                >
                                    Cerrar
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setGeneratingReport(false);
                                        setReportBlob(null);
                                    }}
                                    className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-[#1A1A1A]/40 dark:hover:bg-[#1A1A1A] border border-gray-200 dark:border-[#222] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-all"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
