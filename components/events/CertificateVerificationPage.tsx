import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Loader2, Calendar, User, Award, ArrowLeft, Download, Eye } from 'lucide-react';
import { CertificatePreviewCard } from './CertificatePreviewCard';

interface VerificationData {
    participant_id: string;
    event_id: string;
    participant_name: string;
    event_title: string;
    event_date: string;
    organizer_type: 'acs' | 'colegio_sociologo_unidad' | 'revista_la_colmena';
    category: string;
    issue_date: string;
    certificate_url?: string;
    event_type?: string;
    instructor_name?: string;
    instructor_role?: string;
}

export function CertificateVerificationPage() {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [valid, setValid] = useState<boolean | null>(null);
    const [data, setData] = useState<VerificationData | null>(null);

    useEffect(() => {
        if (id) verifyCertificate(id);
    }, [id]);

    async function verifyCertificate(certificateId: string) {
        setLoading(true);
        try {
            // Buscamos el participante por ID
            const { data: participantData, error: participantError } = await supabase
                .from('event_participants')
                .select(`
                    id,
                    event_id,
                    full_name,
                    category,
                    registered_at,
                    certificate_url,
                    events (
                        title,
                        scheduled_date,
                        organizer_type,
                        event_type,
                        instructor_name,
                        instructor_role
                    )
                `)
                .eq('id', certificateId)
                .single();

            if (participantError || !participantData) {
                setValid(false);
                return;
            }

            const eventData = Array.isArray(participantData.events) ? participantData.events[0] : participantData.events;

            if (!eventData) {
                setValid(false);
                return;
            }

            setData({
                participant_id: participantData.id,
                event_id: participantData.event_id || '',
                participant_name: participantData.full_name,
                event_title: eventData.title,
                event_date: eventData.scheduled_date || '',
                organizer_type: eventData.organizer_type || 'acs',
                category: participantData.category || 'Participante',
                issue_date: participantData.registered_at || new Date().toISOString(),
                certificate_url: participantData.certificate_url || undefined,
                event_type: eventData.event_type || undefined,
                instructor_name: eventData.instructor_name || undefined,
                instructor_role: eventData.instructor_role || undefined,
            });
            setValid(true);

        } catch (error) {
            console.error('Error verificando certificado:', error);
            setValid(false);
        } finally {
            setLoading(false);
        }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const cleanDate = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
            const d = new Date(cleanDate);
            return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#000000] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                    <p className="text-gray-400 font-medium tracking-wide">Verificando certificado...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 font-sans p-4 sm:p-8 flex flex-col items-center justify-center">

            {/* Header Logos */}
            <div className="w-full max-w-lg flex items-center justify-center gap-4 mb-8">
                {data?.organizer_type === 'colegio_sociologo_unidad' ? (
                    <>
                        <img src="/certificates/logo-unidad-v2/Logo de la unidad de investigacion, de la facultad de ciencias sociales. sin fondo blanco.png" alt="Unidad de Investigación" className="h-12 w-auto opacity-90" />
                        <div className="w-px h-8 bg-[#262626]" />
                        <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Colegio de Sociólogos" className="h-12 w-auto opacity-90" />
                        <div className="w-px h-8 bg-[#262626]" />
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-11 w-auto opacity-90" />
                    </>
                ) : (
                    <>
                        <img src="/certificates/logo-unc/R.png" alt="Universidad Nacional de Cajamarca" className="h-12 w-auto opacity-90" />
                        <div className="w-px h-8 bg-[#262626]" />
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" className="h-11 w-auto opacity-90" />
                    </>
                )}
            </div>

            <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#262626] rounded-none shadow-2xl overflow-hidden relative">

                {/* Status Header */}
                <div className={`p-6 text-center border-b ${valid ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-red-950/20 border-red-900/30'}`}>
                    {valid ? (
                        <>
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-none flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                <CheckCircle2 size={40} className="text-emerald-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-emerald-400 mb-1">Certificado Válido</h1>
                            <p className="text-emerald-500/60 text-sm">Este documento electrónico es auténtico</p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-red-500/10 rounded-none flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                <XCircle size={40} className="text-red-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-red-500 mb-1">Certificado Inválido</h1>
                            <p className="text-red-500/60 text-sm">No se encontró registro de este documento</p>
                        </>
                    )}
                </div>

                {/* Content Details */}
                {valid && data && (
                    <div className="p-6 sm:p-8 space-y-6">

                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <User size={14} /> Otorgado a
                            </p>
                            <p className="text-lg font-bold text-white leading-tight">
                                {data.participant_name}
                            </p>
                        </div>

                        <div className="h-px w-full bg-[#1A1A1A]" />

                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <Award size={14} /> Por su participación en
                            </p>
                            <p className="text-base text-gray-300 font-medium leading-snug">
                                {data.event_title}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#111111] p-3 rounded-none border border-[#1A1A1A]">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Fecha del Evento</p>
                                <p className="text-sm text-gray-300 flex items-center gap-1.5">
                                    <Calendar size={13} className="text-blue-500" />
                                    {formatDate(data.event_date)}
                                </p>
                            </div>
                            <div className="bg-[#111111] p-3 rounded-none border border-[#1A1A1A]">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">ID Verificación</p>
                                <p className="text-xs text-gray-400 font-mono truncate" title={id}>
                                    {id?.substring(0, 13)}...
                                </p>
                            </div>
                        </div>

                        {/* Download PDF Button */}
                        {data.certificate_url && (
                            <div className="pt-2">
                                <a
                                    href={data.certificate_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#153ABF] hover:bg-[#2263D9] text-white font-bold tracking-wider uppercase text-xs rounded-none transition-colors border border-[#F4982C] text-center"
                                >
                                    <Download size={14} />
                                    Descargar Certificado PDF
                                </a>
                            </div>
                        )}

                        {/* Live Certificate Preview */}
                        <div className="border-t border-[#1A1A1A] pt-4 mt-6">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Eye size={14} className="text-blue-500" /> Previsualización en Vivo
                            </p>
                            <div className="border border-[#262626] p-2 bg-[#050505] rounded-none overflow-hidden">
                                <CertificatePreviewCard
                                    participantId={data.participant_id}
                                    participantName={data.participant_name}
                                    eventTitle={data.event_title}
                                    eventDate={data.event_date}
                                    organizerType={data.organizer_type}
                                    eventType={data.event_type}
                                    instructorName={data.instructor_name}
                                    instructorRole={data.instructor_role}
                                    category={data.category}
                                    certCode={`EV-${data.event_id.substring(0, 4)}-${data.participant_id.substring(0, 6)}`.toUpperCase()}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Invalid State details */}
                {!valid && (
                    <div className="p-8 text-center text-gray-400">
                        <p className="mb-4">El código QR escalado no coincide con ningún certificado emitido por nuestro sistema o el documento ha sido revocado.</p>
                        <p className="text-sm">Si cree que esto es un error, por favor contacte a la administración técnica.</p>
                    </div>
                )}
            </div>


            <p className="text-gray-600 text-[10px] mt-8 uppercase tracking-widest">
                Sistema Oficial de Gestión ACS © {new Date().getFullYear()}
            </p>
        </div>
    );
}
