import React, { useState, useEffect } from 'react';
import { Award, Download, FileText, Calendar, School, Star, Loader2, ExternalLink, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function MyCertificates() {
    const { user } = useAuth();
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadMyCertificates();
        }
    }, [user]);

    async function loadMyCertificates() {
        setLoading(true);
        try {
            // 1. Fetch from certificates table (Trainings and Recognitions)
            const { data: directCerts, error: directError } = await supabase
                .from('certificates')
                .select(`
                    *,
                    courses (title),
                    events (title)
                `)
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (directError) throw directError;

            // 2. Fetch from event_participants (Event certificates for staff)
            // We look for records in event_participants linked to this user_id OR email that have a certificate_url
            const { data: eventCerts, error: eventError } = await supabase
                .from('event_participants')
                .select(`
                    id,
                    event_id,
                    category,
                    certificate_url,
                    registration_source,
                    events (title, date)
                `)
                .or(`user_id.eq.${user?.id},email.eq.${user?.email}`)
                .not('certificate_url', 'is', null);

            if (eventError) throw eventError;

            // Normalize data
            const normalizedDirect = (directCerts || []).map(c => ({
                id: c.id,
                title: c.type === 'curso' ? c.courses?.title : (c.metadata?.title || 'Reconocimiento'),
                type: c.type,
                date: c.created_at,
                url: c.pdf_url,
                identifier: c.certificate_code
            }));

            const normalizedEvents = (eventCerts || []).map(e => ({
                id: e.id,
                title: (e.events as any)?.title || 'Evento',
                type: 'evento',
                category: e.category,
                date: (e.events as any)?.date,
                url: e.certificate_url,
                identifier: `EVT-${e.event_id?.slice(0, 8)}`
            }));

            // Combine and sort
            const allCerts = [...normalizedDirect, ...normalizedEvents].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setCertificates(allCerts);
        } catch (error) {
            console.error('Error loading my certificates:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-gray-500 animate-pulse">Cargando tus logros...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Award className="w-8 h-8 text-indigo-500" />
                    Mis Certificados
                </h1>
                <p className="text-gray-500 mt-2 max-w-2xl">
                    Aquí encontrarás todos tus diplomas, constancias y reconocimientos obtenidos en la plataforma.
                </p>
            </div>

            {certificates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-[#111] border border-dashed border-gray-800 rounded-2xl">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-10 h-10 text-gray-700" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Aún no tienes certificados</h3>
                    <p className="text-gray-500 text-center max-w-sm px-6">
                        Participa en eventos o completa capacitaciones para recibir tus reconocimientos aquí.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map(cert => (
                        <div key={cert.id} className="group relative bg-[#111] border border-exec-border rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 shadow-xl shadow-black/20">
                            {/* Card Content */}
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${
                                        cert.type === 'evento' ? 'bg-blue-500/10 text-blue-400' :
                                        cert.type === 'curso' ? 'bg-emerald-500/10 text-emerald-400' :
                                        'bg-purple-500/10 text-purple-400'
                                    }`}>
                                        {cert.type === 'evento' ? <Calendar className="w-5 h-5" /> :
                                         cert.type === 'curso' ? <School className="w-5 h-5" /> :
                                         <Star className="w-5 h-5" />}
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                                        ID: {cert.identifier}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors leading-tight">
                                    {cert.title}
                                </h3>

                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="uppercase font-bold tracking-tighter text-indigo-500/70">
                                        {cert.type === 'evento' ? 'Evento' : cert.type === 'curso' ? 'Capacitación' : 'Reconocimiento'}
                                    </span>
                                    {cert.category && (
                                        <>
                                            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                            <span className="text-white font-medium uppercase text-[10px] tracking-widest">{cert.category}</span>
                                        </>
                                    )}
                                    <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                    <span>{new Date(cert.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>

                            {/* Download Action Overlay */}
                            <div className="p-4 bg-[#1A1A1A] border-t border-exec-border flex items-center justify-between">
                                <a 
                                    href={cert.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver Certificado
                                </a>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => window.open(cert.url, '_blank')}
                                        className="p-2 bg-[#222] hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg transition-all"
                                        title="Descargar"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Decorative Background Element */}
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Help Section */}
            <div className="p-6 bg-gradient-to-r from-indigo-900/10 to-transparent border border-indigo-500/10 rounded-2xl flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">¿Falta algún certificado?</h4>
                    <p className="text-xs text-gray-500 mt-1">Si participaste en un evento y no ves tu certificado aquí, contacta al equipo de gestión documental.</p>
                </div>
            </div>
        </div>
    );
}
