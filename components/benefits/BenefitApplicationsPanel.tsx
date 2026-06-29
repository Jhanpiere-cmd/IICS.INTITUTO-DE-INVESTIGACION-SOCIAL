import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, XCircle, Search, Filter, User, Calendar, MessageSquare, Briefcase, ArrowLeft } from 'lucide-react';

interface Application {
    id: string;
    benefit_id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    benefit?: {
        title: string;
        category: string;
    };
    user?: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export const BenefitApplicationsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            setLoading(true);

            // Fetch applications
            const { data: appsData, error: appsError } = await supabase
                .from('benefit_applications')
                .select(`
                    *,
                    benefit:benefits(title, category)
                `)
                .order('created_at', { ascending: false });

            if (appsError) throw appsError;

            const userIds = Array.from(new Set(appsData.map(a => a.user_id)));

            if (userIds.length > 0) {
                // Fetch all user info (name, email, avatar) from 'profiles' table (Unified source)
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url')
                    .in('id', userIds);

                if (!profilesError && profilesData) {
                    const profileMap = new Map((profilesData || []).map(p => [p.id, p]));

                    const enrichedApps = appsData.map(app => {
                        const profileInfo = profileMap.get(app.user_id);
                        return {
                            ...app,
                            user: {
                                full_name: profileInfo?.full_name || 'Usuario Desconocido',
                                email: profileInfo?.email || 'No email',
                                avatar_url: profileInfo?.avatar_url
                            }
                        };
                    });
                    setApplications(enrichedApps);
                    return;
                }
            }

            setApplications(appsData);

        } catch (error) {
            console.error('Error fetching applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (appId: string, newStatus: 'approved' | 'rejected') => {
        setProcessingId(appId);
        try {
            const { error } = await supabase
                .from('benefit_applications')
                .update({
                    status: newStatus,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', appId);

            if (error) throw error;

            setApplications(prev => prev.map(app =>
                app.id === appId ? { ...app, status: newStatus } : app
            ));

        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar estado');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredApps = filterStatus === 'all'
        ? applications
        : applications.filter(a => a.status === filterStatus);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-exec-border pb-4 mb-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 leading-none">
                    <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                        <Briefcase className="w-5 h-5 text-exec-blue" />
                    </div>
                    <span>Gestión de <span className="text-exec-blue">Postulaciones</span></span>
                </h2>
                <button
                    onClick={onClose}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-[#0A0A0A] border border-exec-border hover:border-gray-500 hover:bg-[#111] transition-all rounded-none"
                >
                    <ArrowLeft className="w-4 h-4 text-exec-blue group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Volver a Beneficios</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                {['pending', 'approved', 'rejected', 'all'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all border ${filterStatus === status
                                ? 'bg-exec-blue border-exec-blue text-white shadow-lg shadow-exec-blue/20'
                                : 'bg-[#111] border-[#262626] text-gray-500 hover:text-white hover:border-gray-600'
                            }`}
                    >
                        {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'approved' ? 'Aprobados' : 'Rechazados'}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
                </div>
            ) : filteredApps.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-[#111] rounded-none border border-dashed border-[#262626]">
                    No hay solicitudes con este estado.
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredApps.map(app => (
                        <div key={app.id} className="bg-[#111] p-4 rounded-none border border-exec-border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group hover:border-exec-blue/30 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-none overflow-hidden flex-shrink-0 border border-exec-border bg-[#222]">
                                    {app.user?.avatar_url ? (
                                        <img src={app.user.avatar_url} alt={app.user.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-lg">
                                            {app.user?.full_name?.charAt(0) || <User />}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg uppercase tracking-tighter leading-none mb-1">
                                        {app.user?.full_name || 'Usuario desconocido'}
                                    </h3>
                                    <p className="text-sm text-gray-400 flex items-center gap-2 font-light">
                                        Aplicando a: <span className="text-exec-blue font-bold uppercase tracking-tight">{app.benefit?.title}</span>
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 uppercase tracking-widest font-black">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(app.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-none border ${app.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                app.status === 'approved' ? 'bg-exec-green/10 text-exec-green border-exec-green/20' :
                                                    'bg-exec-red/10 text-exec-red border-exec-red/20'
                                            }`}>
                                            {app.status === 'pending' ? 'Pendiente' : app.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {app.status === 'pending' && (
                                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                                    <button
                                        onClick={() => handleUpdateStatus(app.id, 'approved')}
                                        disabled={processingId === app.id}
                                        className="flex-1 md:flex-none px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-exec-blue/20 disabled:opacity-50"
                                    >
                                        {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Aprobar
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                        disabled={processingId === app.id}
                                        className="flex-1 md:flex-none px-4 py-2 bg-[#1A1A1A] hover:bg-[#222] text-exec-red border border-exec-red/30 rounded-none text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Rechazar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
