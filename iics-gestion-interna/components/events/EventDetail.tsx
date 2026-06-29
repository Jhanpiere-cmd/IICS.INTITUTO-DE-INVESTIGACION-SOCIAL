import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, MapPin, Users, FileText, Image, CheckSquare, Award, Clock, User, Pencil, Trash2, LayoutGrid, DollarSign, ClipboardList, BarChart2, Share2, Radio, List, MessageSquare, Timer, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TeamResponsibilitiesTab } from './TeamResponsibilitiesTab';
import { ParticipantsTab } from './ParticipantsTab';
import { AttendanceTab } from './AttendanceTab';
import { GalleryTab } from './GalleryTab';
import { CertificatesTab } from './CertificatesTab';
import { FormBuilderTab } from './FormBuilderTab';
import { SurveyResultsTab } from './SurveyResultsTab';
import { ReportsTab } from './ReportsTab';
import { SocialMediaCopyTab } from './SocialMediaCopyTab';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import { FormField } from '../../lib/ai';
import { LiveEventProgram } from './LiveEventProgram';
import { ProgramCreator } from './ProgramCreator';
import { PromotionalFlyerModal } from './PromotionalFlyerModal';
import { QrBadgeGeneratorModal } from './QrBadgeGeneratorModal';

interface Event {
    id: string;
    title: string;
    description: string;
    event_type: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location: string;
    is_online: boolean;
    budget_estimated: number;
    budget_actual: number;
    created_at: string;
    status: 'planificado' | 'en_curso' | 'completado' | 'cancelado';
    cover_image_url?: string;
    registration_slug?: string;
    registration_form?: FormField[];
    social_media_copy?: string;
    registration_enabled?: boolean;
    organizer_type?: 'acs' | 'colegio_sociologo_unidad' | 'revista_la_colmena';
    meeting_url?: string;
    instructor_name?: string;
    instructor_role?: string;
    total_revenue?: number;
    certificate_type?: 'none' | 'free' | 'paid' | null;
}

function EventCountdown({ scheduledDate, startTime, status }: { scheduledDate: string, startTime: string, status: string }) {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

    useEffect(() => {
        const calculate = () => {
            if (!scheduledDate) return;
            const dateOnly = scheduledDate.split('T')[0];
            const [year, month, day] = dateOnly.split('-').map(Number);
            const [startH, startM] = (startTime || '00:00').split(':').map(Number);
            const start = new Date(year, month - 1, day, startH, startM, 0);
            const now = new Date();
            const diff = start.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft(null);
                return;
            }

            setTimeLeft({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff / (1000 * 60 * 60)) % 24),
                m: Math.floor((diff / (1000 * 60)) % 60),
                s: Math.floor((diff / 1000) % 60)
            });
        };

        calculate();
        const timer = setInterval(calculate, 1000);
        return () => clearInterval(timer);
    }, [scheduledDate, startTime]);

    if (!timeLeft) return (
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] animate-pulse">Operación en Curso</span>
    );

    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col">
                <span className="text-xl font-black text-white leading-none">{timeLeft.d}</span>
                <span className="text-[7px] text-gray-600 uppercase font-black tracking-tighter">Días</span>
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-black text-white leading-none">{timeLeft.h.toString().padStart(2, '0')}</span>
                <span className="text-[7px] text-gray-600 uppercase font-black tracking-tighter">Hrs</span>
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-black text-white leading-none">{timeLeft.m.toString().padStart(2, '0')}</span>
                <span className="text-[7px] text-gray-600 uppercase font-black tracking-tighter">Min</span>
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-black text-exec-blue leading-none animate-pulse">{timeLeft.s.toString().padStart(2, '0')}</span>
                <span className="text-[7px] text-exec-blue/50 uppercase font-black tracking-tighter">Seg</span>
            </div>
        </div>
    );
}

interface EventDetailProps {
    event: Event;
    onClose: () => void;
    onUpdate: () => void;
    onEdit: (event: Event) => void;
}

type Tab = 'info' | 'team' | 'participants' | 'gallery' | 'attendance' | 'certificates' | 'form' | 'social_media' | 'reports' | 'feedback';

export function EventDetail({ event, onClose, onUpdate, onEdit }: EventDetailProps) {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [deleting, setDeleting] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isFlyerModalOpen, setIsFlyerModalOpen] = useState(false);
    const [isQrBadgeModalOpen, setIsQrBadgeModalOpen] = useState(false);
    
    // Live Event states (Program Creator remains local, but Moderator Panel goes to Route)
    const [showProgramCreator, setShowProgramCreator] = useState(false);

    // Expose setActiveTab to children via window for mobile navigation
    useEffect(() => {
        (window as any).setActiveEventSubTab = (tab: Tab | null) => {
            if (tab === null) {
                setActiveTab('info');
            } else {
                setActiveTab(tab);
            }
        };

        return () => {
            delete (window as any).setActiveEventSubTab;
        };
    }, []);

    // Debug log
    console.log('🔍 EventDetail renderizando con evento:', event);
    console.log('📋 Título del evento:', event?.title);
    console.log('🎯 ID del evento:', event?.id);

    async function handleDelete() {
        setIsConfirmDeleteOpen(true);
    }

    async function confirmDelete() {
        setDeleting(true);
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

            if (error) throw error;

            showToast({
                type: 'success',
                title: 'Evento Eliminado',
                message: 'El evento ha sido removido exitosamente del sistema.'
            });
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('Error deleting event:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: `No se pudo eliminar el evento: ${error.message}`
            });
        } finally {
            setDeleting(false);
            setIsConfirmDeleteOpen(false);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'planificado': return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
            case 'en_curso': return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
            case 'completado': return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
            case 'cancelado': return 'bg-red-900/40 text-red-300 border-red-700/50';
            default: return 'bg-gray-800 text-gray-400 border-gray-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md md:flex md:items-center md:justify-center animate-in fade-in duration-300" onClick={onClose}>
            <div className="fixed inset-x-0 top-0 bottom-16 md:static md:max-w-none md:h-screen bg-[#0A0A0A] rounded-none shadow-2xl border-b md:border-none border-exec-border w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="relative border-b border-exec-border bg-[#0A0A0A] shrink-0">
                    {/* Background Image Element or Gradient */}
                    {event.cover_image_url && (
                        <div className={`absolute inset-0 h-full w-full opacity-30 pointer-events-none ${activeTab === 'info' ? 'block' : 'hidden md:block'}`}>
                            <img src={event.cover_image_url} alt="" className="w-full h-full object-cover blur-md" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/50 to-[#0A0A0A]"></div>
                        </div>
                    )}

                    <div className={`relative z-10 px-4 pt-2 pb-3 sm:p-5 md:py-5 md:px-8 flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-4 max-w-7xl mx-auto w-full ${activeTab === 'info' ? 'flex' : 'hidden md:flex'}`}>
                        <div className="min-w-0 md:flex-1 order-2 md:order-1">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                                <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-none text-[9px] sm:text-xs font-bold uppercase tracking-[0.1em] border ${getStatusColor(event.status || 'planificado')}`}>
                                    {event.status || 'planificado'}
                                </div>
                                {event.organizer_type === 'revista_la_colmena' && (
                                    <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-none text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] border bg-[#003366] text-yellow-400 border-yellow-400/30">
                                        Alianza La Colmena
                                    </div>
                                )}
                                <span className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <LayoutGrid className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-exec-blue" />
                                    {(event.event_type || 'evento').replace(/_/g, ' ')}
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-3xl font-black text-white tracking-tight drop-shadow-sm leading-tight">
                                {event.title || 'Evento sin título'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-end md:self-start order-1 md:order-2">
                            <button
                                onClick={() => setShowProgramCreator(true)}
                                className="p-1.5 sm:p-2 hover:bg-exec-blue/10 rounded-none transition-colors group border border-transparent hover:border-exec-blue/20"
                                title="Crear programa del evento"
                            >
                                <List className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 group-hover:text-exec-blue transition-colors" />
                            </button>
                            <button
                                onClick={() => {
                                    navigate(`/events/moderator/${event.id}`);
                                }}
                                className="p-1.5 sm:p-2 hover:bg-emerald-900/20 rounded-none transition-colors group border border-transparent hover:border-emerald-900/30"
                                title="Iniciar transmisión en vivo"
                            >
                                <Radio className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                            </button>
                            <button
                                onClick={() => onEdit(event)}
                                className="p-1.5 sm:p-2 hover:bg-exec-blue/10 rounded-none transition-colors group border border-transparent hover:border-exec-blue/20"
                                title="Editar evento"
                            >
                                <Pencil className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 group-hover:text-exec-blue transition-colors" />
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="p-1.5 sm:p-2 hover:bg-red-900/20 rounded-none transition-colors group border border-transparent hover:border-red-900/30 disabled:opacity-50"
                                title="Eliminar evento"
                            >
                                <Trash2 className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1.5 sm:p-2 bg-[#1A1A1A] hover:bg-[#262626] text-white rounded-none transition-colors ml-1 sm:ml-2 border border-[#333]"
                            >
                                <X className="w-5 sm:w-6 h-5 sm:h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs - DESKTOP (Box Isolation) */}
                    <div className="hidden md:flex bg-[#050505]/50 backdrop-blur-sm px-8 gap-4 overflow-x-auto scrollbar-none border-t border-white/5">
                        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
                            {[
                                { id: 'info', label: 'Información', icon: FileText },
                                { id: 'team', label: 'Equipo', icon: Users },
                                { id: 'participants', label: 'Participantes', icon: User },
                                { id: 'attendance', label: 'Asistencia', icon: CheckSquare },
                                { id: 'gallery', label: 'Galería', icon: Image },
                                { id: 'certificates', label: 'Certificados', icon: Award },
                                { id: 'form', label: 'Formulario', icon: ClipboardList },
                                { id: 'feedback', label: 'Feedback', icon: MessageSquare },
                                { id: 'social_media', label: 'Social Copy', icon: Share2 },
                                { id: 'reports', label: 'Reportes', icon: BarChart2 },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`pb-3 pt-4 px-1 text-[11px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                                        ? 'border-exec-blue text-exec-blue'
                                        : 'border-transparent text-gray-600 hover:text-gray-300 hover:border-gray-800'
                                        }`}
                                >
                                    <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-exec-blue' : ''}`} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabs - MOBILE HEADER (Solo cuando hay un tab activo que no sea info) */}
                    {activeTab !== 'info' && (
                        <div className="md:hidden p-2.5 border-t border-white/5 bg-[#050505] flex items-center justify-between shadow-2xl">
                             <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setActiveTab('info')}
                                    className="flex items-center gap-2 text-exec-blue font-black text-[9px] uppercase tracking-widest py-1.5 px-2.5 rounded-none bg-exec-blue/10 border border-exec-blue/30 active:scale-95 transition-all"
                                    title="Menu de Opciones"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    <span className="hidden xs:inline">OPCIONES</span>
                                </button>
                                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black truncate max-w-[120px]">
                                    {activeTab === 'info' ? 'DETALLES' : 
                                     activeTab === 'team' ? 'EQUIPO' :
                                     activeTab === 'participants' ? 'PARTICIPANTES' :
                                     activeTab === 'attendance' ? 'ASISTENCIA' :
                                     activeTab === 'gallery' ? 'GALERÍA' :
                                     activeTab === 'certificates' ? 'CERTIFICADOS' :
                                     activeTab === 'form' ? 'FORMULARIO' :
                                     activeTab === 'feedback' ? 'FEEDBACK' :
                                     activeTab === 'social_media' ? 'SOCIAL COPY' : 'REPORTES'}
                                </span>
                             </div>
                             
                             <button
                                onClick={onClose}
                                className="p-2 bg-[#1A1A1A] hover:bg-[#262626] text-white rounded-none transition-colors border border-[#333]"
                             >
                                <X className="w-5 h-5" />
                             </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-[#0A0A0A] custom-scrollbar">
                    <div className="max-w-7xl mx-auto w-full p-6 sm:p-8 pb-32 md:pb-8">
                        {activeTab === 'info' && (
                        <>
                            {/* DESKTOP VIEW (Box Isolation) */}
                            <div className="hidden md:grid grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Description Card */}
                                    <section className="bg-[#050505] p-6 rounded-none border border-exec-border relative group hover:border-[#1F1F1F] transition-colors shadow-2xl">
                                        <h3 className="text-xs font-black text-exec-blue mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
                                            Descripción Estratégica
                                        </h3>
                                        <p className="text-gray-400 leading-relaxed whitespace-pre-wrap text-sm font-medium">
                                            {event.description || "Sin descripción detallada disponible para este evento."}
                                        </p>
                                    </section>

                                    {/* Additional Metadata or Quick Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#050505] p-4 rounded-none border border-exec-border flex items-center gap-4 shadow-xl">
                                            <div className="p-3 rounded-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <DollarSign className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Presupuesto Ingresado</p>
                                                <p className="text-xl font-black text-white">
                                                    S/. {(event.total_revenue || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-[#050505] p-4 rounded-none border border-exec-border flex items-center gap-4 shadow-xl">
                                            <div className="p-3 rounded-none bg-exec-blue/10 text-exec-blue border border-exec-blue/20">
                                                <Timer className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Tiempo de Despliegue</p>
                                                <EventCountdown scheduledDate={event.scheduled_date} startTime={event.start_time} status={event.status} />
                                            </div>
                                        </div>

                                        {event.event_type === 'taller' && event.instructor_name && (
                                            <div className="col-span-2 bg-[#050505] p-4 rounded-none border border-exec-blue/20 flex items-center gap-4 shadow-xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Award className="w-16 h-16 text-exec-blue" />
                                                </div>
                                                <div className="p-3 rounded-none bg-exec-blue/10 text-exec-blue border border-exec-blue/30">
                                                    <User className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-exec-blue uppercase font-black tracking-widest">Docente Capacitador</p>
                                                    <p className="text-lg font-black text-white uppercase tracking-tight">{event.instructor_name}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{event.instructor_role || 'Responsable de Instrucción'}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Details Sidebar Card */}
                                    <section className="bg-[#050505] p-6 rounded-none border border-exec-border h-full shadow-2xl">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8">Protocolo Logístico</h3>
                                        <ul className="space-y-8">
                                            <li className="flex gap-4 group">
                                                <div className="mt-0.5 p-2 rounded-none bg-[#0A0A0A] group-hover:bg-[#111] border border-[#1F1F1F] transition-all shrink-0">
                                                    <Calendar className="w-5 h-5 text-exec-blue" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block text-[9px] font-black text-[#444] mb-1 uppercase tracking-[0.2em]">Fecha de Operación</span>
                                                    <span className="text-sm text-gray-200 font-black uppercase tracking-tight">
                                                        {event.scheduled_date ? new Date(event.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha no definida'}
                                                    </span>
                                                </div>
                                            </li>
                                            <li className="flex gap-4 group">
                                                <div className="mt-0.5 p-2 rounded-none bg-[#0A0A0A] group-hover:bg-[#111] border border-[#1F1F1F] transition-all shrink-0">
                                                    <Clock className="w-5 h-5 text-exec-blue" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block text-[9px] font-black text-[#444] mb-1 uppercase tracking-[0.2em]">Ventana Horaria</span>
                                                     <span className="text-sm text-gray-200 font-black tracking-widest">
                                                         {event.start_time ? new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''} 
                                                         {event.end_time ? ` - ${new Date(`2000-01-01T${event.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                                     </span>
                                                </div>
                                            </li>
                                            <li className="flex gap-4 group">
                                                <div className="mt-0.5 p-2 rounded-none bg-[#0A0A0A] group-hover:bg-[#111] border border-[#1F1F1F] transition-all shrink-0">
                                                    <MapPin className="w-5 h-5 text-exec-blue" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block text-[9px] font-black text-[#444] mb-1 uppercase tracking-[0.2em]">Ubicación Táctica</span>
                                                    <span className="text-sm text-gray-200 font-black uppercase whitespace-pre-wrap leading-tight">
                                                        {event.is_online ? 'Despliegue Virtual' : (event.location || 'Pendiente de Definir')}
                                                    </span>
                                                    {event.is_online && (
                                                        <span className="block text-[10px] text-exec-blue mt-2 font-black uppercase tracking-widest italic">
                                                            {event.meeting_url ? (
                                                                <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">
                                                                    Enlace de Inserción
                                                                </a>
                                                            ) : (
                                                                'Acceso Asegurado'
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        </ul>

                                        <button
                                            onClick={() => setIsFlyerModalOpen(true)}
                                            className="w-full flex items-center justify-center gap-2 mt-6 py-2.5 px-3 bg-[#111] hover:bg-[#151515] border border-[#222] text-white hover:border-exec-blue/40 text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            <QrCode size={12} className="text-exec-blue" /> Generar Flyer con QR
                                        </button>

                                        <button
                                            onClick={() => setIsQrBadgeModalOpen(true)}
                                            className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-3 bg-[#111] hover:bg-[#151515] border border-[#222] text-white hover:border-exec-blue/40 text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            <QrCode size={12} className="text-exec-blue" /> Generar Tarjeta QR
                                        </button>

                                        {event.cover_image_url && (
                                            <div className="mt-8 rounded-none overflow-hidden border border-gray-800 bg-black">
                                                <img
                                                    src={event.cover_image_url}
                                                    alt={event.title}
                                                    className="w-full h-auto object-contain"
                                                />
                                            </div>
                                        )}
                                    </section>
                                </div>
                            </div>

                             {/* MOBILE VIEW (Box Isolation - Optimized) */}
                            <div className="md:hidden flex flex-col gap-4">
                                {/* Mobile Options Grid (3x3 style - Horizontal Optimized) */}
                                <section className="grid grid-cols-3 gap-1.5 mb-2">
                                    {[
                                        { id: 'team', label: 'Equipo', icon: Users, desc: 'Resp.' },
                                        { id: 'participants', label: 'Particip.', icon: User, desc: 'Inscritos' },
                                        { id: 'attendance', label: 'Asistencia', icon: CheckSquare, desc: 'Check' },
                                        { id: 'gallery', label: 'Galería', icon: Image, desc: 'Fotos' },
                                        { id: 'certificates', label: 'Certif.', icon: Award, desc: 'Entrega' },
                                        { id: 'form', label: 'Form.', icon: ClipboardList, desc: 'Editor' },
                                        { id: 'feedback', label: 'Feedback', icon: MessageSquare, desc: 'Encuesta' },
                                        { id: 'social_media', label: 'Social', icon: Share2, desc: 'Copy' },
                                        { id: 'reports', label: 'Report.', icon: BarChart2, desc: 'Data' },
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id as Tab)}
                                            className="flex flex-row items-center gap-2 p-2 rounded-none bg-[#050505] border border-[#1F1F1F] active:bg-exec-blue/10 active:border-exec-blue/50 transition-all group overflow-hidden h-14"
                                        >
                                            <item.icon className="w-4 h-4 text-gray-500 shrink-0 group-active:text-exec-blue transition-all" />
                                            <div className="text-left min-w-0">
                                                <p className="text-[9px] font-black text-gray-300 leading-none uppercase truncate mb-0.5">{item.label}</p>
                                                <p className="text-[7px] text-[#444] font-black uppercase tracking-tighter truncate">{item.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {/* Botón informativo/static Industrial Horizontal */}
                                    <div className="flex flex-row items-center gap-2 p-2 rounded-none bg-exec-blue/5 border border-exec-blue/10 h-14">
                                        <Calendar className="w-4 h-4 text-exec-blue/40 shrink-0" />
                                        <div className="text-left min-w-0">
                                            <p className="text-[9px] font-black text-exec-blue/60 leading-none uppercase mb-0.5">Protocolo</p>
                                            <p className="text-[7px] text-exec-blue/40 font-black uppercase tracking-tighter">Activo</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Description Card Mobile */}
                                <section className="bg-[#050505] p-4 rounded-none border border-[#1F1F1F]">
                                    <h3 className="text-[10px] font-black text-exec-blue uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <div className="w-1 h-3 bg-exec-blue rounded-none" />
                                        Inteligencia del Evento
                                    </h3>
                                    <p className="text-gray-400 leading-relaxed whitespace-pre-wrap text-[13px] font-medium">
                                        {event.description || "Sin descripción disponible."}
                                    </p>
                                </section>

                                 {/* Poster Mobile (Si existe - Compacto) */}
                                 {event.cover_image_url && (
                                    <div className="rounded-none overflow-hidden border border-[#222] bg-black shadow-2xl">
                                        <img
                                            src={event.cover_image_url}
                                            alt="Flyer del evento"
                                            className="w-full h-auto max-h-48 object-cover"
                                        />
                                    </div>
                                )}

                                {/* Logistics Card Mobile */}
                                <section className="bg-[#050505] p-4 rounded-none border border-[#1F1F1F]">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <div className="w-1 h-3 bg-exec-blue rounded-none" />
                                        Logística de Despliegue
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-exec-blue shrink-0" />
                                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-tight">
                                                {event.scheduled_date ? new Date(event.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '---'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-exec-blue shrink-0" />
                                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-tight">
                                                {event.start_time ? new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '---'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 col-span-2">
                                            <MapPin className="w-4 h-4 text-exec-blue shrink-0" />
                                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-tight truncate">
                                                {event.is_online ? 'ZONA VIRTUAL' : (event.location || 'POR DEFINIR')}
                                            </span>
                                        </div>
                                    </div>
                                    {event.is_online && event.meeting_url && (
                                        <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="block mt-4 text-center py-3 rounded-none bg-exec-blue/10 text-exec-blue text-[10px] font-black border border-exec-blue/20 active:bg-exec-blue/20 uppercase tracking-[0.2em]">
                                            INICIAR CONEXIÓN
                                        </a>
                                    )}

                                    <button
                                        onClick={() => setIsFlyerModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 px-3 bg-[#111] hover:bg-[#151515] border border-[#222] text-white active:border-exec-blue/40 text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        <QrCode size={12} className="text-exec-blue" /> Generar Flyer con QR
                                    </button>

                                    <button
                                        onClick={() => setIsQrBadgeModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-3 bg-[#111] hover:bg-[#151515] border border-[#222] text-white active:border-exec-blue/40 text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        <QrCode size={12} className="text-exec-blue" /> Generar Tarjeta QR
                                    </button>
                                </section>

                                {/* Budget and Countdown Mobile */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-[#050505] p-3 rounded-none border border-[#1F1F1F] flex flex-col gap-2 shadow-lg">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-3 h-3 text-emerald-500" />
                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Ingresado</p>
                                        </div>
                                        <p className="text-base font-black text-white">
                                            S/. {(event.total_revenue || 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="bg-[#050505] p-3 rounded-none border border-[#1F1F1F] flex flex-col gap-2 shadow-lg">
                                        <div className="flex items-center gap-2">
                                            <Timer className="w-3 h-3 text-exec-blue" />
                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Tiempo</p>
                                        </div>
                                        <div className="scale-75 origin-left -mt-1">
                                            <EventCountdown scheduledDate={event.scheduled_date} startTime={event.start_time} status={event.status} />
                                        </div>
                                    </div>
                                </div>

                                {/* Instructor Mobile */}
                                {event.event_type === 'taller' && event.instructor_name && (
                                    <div className="bg-[#050505] p-3 rounded-none border border-exec-blue/20 flex items-center gap-3 shadow-lg">
                                        <div className="p-2 rounded-none bg-exec-blue/10 text-exec-blue border border-exec-blue/30">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-exec-blue uppercase font-black tracking-widest">Docente Capacitador</p>
                                            <p className="text-xs font-black text-white uppercase truncate max-w-[200px]">{event.instructor_name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'team' && (
                        <div className="animate-in fade-in duration-300">
                            <TeamResponsibilitiesTab eventId={event.id} />
                        </div>
                    )}
                    {activeTab === 'participants' && (
                        <div className="animate-in fade-in duration-300">
                            <ParticipantsTab eventId={event.id} />
                        </div>
                    )}
                    {activeTab === 'gallery' && (
                        <div className="animate-in fade-in duration-300">
                            <GalleryTab eventId={event.id} />
                        </div>
                    )}
                    {activeTab === 'attendance' && (
                        <div className="animate-in fade-in duration-300">
                            <AttendanceTab eventId={event.id} />
                        </div>
                    )}
                    {activeTab === 'certificates' && (
                        <div className="animate-in fade-in duration-300">
                                                <CertificatesTab
                                    eventId={event.id}
                                    eventTitle={event.title}
                                    eventDate={event.scheduled_date}
                                    organizerType={event.organizer_type || 'acs'}
                                    flyerUrl={event.cover_image_url}
                                    eventType={event.event_type}
                                    instructorName={event.instructor_name}
                                    instructorRole={event.instructor_role}
                                />
                        </div>
                    )}
                    {activeTab === 'form' && (
                        <div className="animate-in fade-in duration-300">
                            <FormBuilderTab
                                eventId={event.id}
                                eventTitle={event.title}
                                eventType={event.event_type}
                                eventDescription={event.description}
                                initialSlug={event.registration_slug || ''}
                                initialForm={event.registration_form || []}
                                initialEnabled={event.registration_enabled || false}
                            />
                        </div>
                    )}
                    {activeTab === 'feedback' && (
                        <div className="animate-in fade-in duration-300">
                            <SurveyResultsTab eventId={event.id} />
                        </div>
                    )}
                    {activeTab === 'reports' && (
                        <div className="animate-in fade-in duration-300">
                            <ReportsTab
                                eventId={event.id}
                                eventTitle={event.title}
                            />
                        </div>
                    )}
                    {activeTab === 'social_media' && (
                        <div className="animate-in fade-in duration-300">
                            <SocialMediaCopyTab
                                eventId={event.id}
                                initialCopy={event.social_media_copy || ''}
                                eventTitle={event.title}
                                eventType={event.event_type}
                                eventDescription={event.description}
                                eventDate={event.scheduled_date}
                                eventLocation={event.location}
                                organizerType={event.organizer_type || 'acs'}
                                registrationUrl={event.registration_slug ? `${window.location.origin}/registro/${event.registration_slug}` : undefined}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            {/* Program Creator Modal */}
            {showProgramCreator && (
                <ProgramCreator
                    key={event.id}
                    eventId={event.id}
                    onSave={(programa) => {
                        setShowProgramCreator(false);
                        onClose(); // Cerrar detalle para que no quede detrás
                        navigate(`/events/moderator/${event.id}`);
                    }}
                    onCancel={() => setShowProgramCreator(false)}
                />
            )}

            {/* Confirm Delete Event Modal */}
            <ConfirmModal
                isOpen={isConfirmDeleteOpen}
                title="Eliminar Evento"
                message={`¿Estás seguro de que deseas eliminar el evento "${event.title}"? Esta acción borrará permanentemente todos los datos, participantes y reportes asociados.`}
                confirmText="Eliminar permanentemente"
                cancelText="Mantener Evento"
                onConfirm={confirmDelete}
                onCancel={() => setIsConfirmDeleteOpen(false)}
                isDestructive={true}
            />

            {/* Promotional Flyer Modal */}
            <PromotionalFlyerModal
                isOpen={isFlyerModalOpen}
                onClose={() => setIsFlyerModalOpen(false)}
                event={event}
            />

            {/* Styled QR Badge Generator Modal */}
            <QrBadgeGeneratorModal
                isOpen={isQrBadgeModalOpen}
                onClose={() => setIsQrBadgeModalOpen(false)}
                event={event}
            />
        </div>
    </div>
    );
}
